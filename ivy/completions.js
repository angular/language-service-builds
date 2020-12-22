/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/attribute_completions", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompletionBuilder = exports.CompletionNodeContext = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var r3_ast_1 = require("@angular/compiler/src/render3/r3_ast");
    var ts = require("typescript");
    var attribute_completions_1 = require("@angular/language-service/ivy/attribute_completions");
    var display_parts_1 = require("@angular/language-service/ivy/display_parts");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var CompletionNodeContext;
    (function (CompletionNodeContext) {
        CompletionNodeContext[CompletionNodeContext["None"] = 0] = "None";
        CompletionNodeContext[CompletionNodeContext["ElementTag"] = 1] = "ElementTag";
        CompletionNodeContext[CompletionNodeContext["ElementAttributeKey"] = 2] = "ElementAttributeKey";
        CompletionNodeContext[CompletionNodeContext["ElementAttributeValue"] = 3] = "ElementAttributeValue";
        CompletionNodeContext[CompletionNodeContext["EventValue"] = 4] = "EventValue";
    })(CompletionNodeContext = exports.CompletionNodeContext || (exports.CompletionNodeContext = {}));
    /**
     * Performs autocompletion operations on a given node in the template.
     *
     * This class acts as a closure around all of the context required to perform the 3 autocompletion
     * operations (completions, get details, and get symbol) at a specific node.
     *
     * The generic `N` type for the template node is narrowed internally for certain operations, as the
     * compiler operations required to implement completion may be different for different node types.
     *
     * @param N type of the template node in question, narrowed accordingly.
     */
    var CompletionBuilder = /** @class */ (function () {
        function CompletionBuilder(tsLS, compiler, component, node, nodeContext, nodeParent, template) {
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.component = component;
            this.node = node;
            this.nodeContext = nodeContext;
            this.nodeParent = nodeParent;
            this.template = template;
            this.typeChecker = this.compiler.getNextProgram().getTypeChecker();
            this.templateTypeChecker = this.compiler.getTemplateTypeChecker();
        }
        /**
         * Analogue for `ts.LanguageService.getCompletionsAtPosition`.
         */
        CompletionBuilder.prototype.getCompletionsAtPosition = function (options) {
            if (this.isPropertyExpressionCompletion()) {
                return this.getPropertyExpressionCompletion(options);
            }
            else if (this.isElementTagCompletion()) {
                return this.getElementTagCompletion();
            }
            else if (this.isElementAttributeCompletion()) {
                return this.getElementAttributeCompletions();
            }
            else if (this.isPipeCompletion()) {
                return this.getPipeCompletions();
            }
            else {
                return undefined;
            }
        };
        /**
         * Analogue for `ts.LanguageService.getCompletionEntryDetails`.
         */
        CompletionBuilder.prototype.getCompletionEntryDetails = function (entryName, formatOptions, preferences) {
            if (this.isPropertyExpressionCompletion()) {
                return this.getPropertyExpressionCompletionDetails(entryName, formatOptions, preferences);
            }
            else if (this.isElementTagCompletion()) {
                return this.getElementTagCompletionDetails(entryName);
            }
            else if (this.isElementAttributeCompletion()) {
                return this.getElementAttributeCompletionDetails(entryName);
            }
        };
        /**
         * Analogue for `ts.LanguageService.getCompletionEntrySymbol`.
         */
        CompletionBuilder.prototype.getCompletionEntrySymbol = function (name) {
            if (this.isPropertyExpressionCompletion()) {
                return this.getPropertyExpressionCompletionSymbol(name);
            }
            else if (this.isElementTagCompletion()) {
                return this.getElementTagCompletionSymbol(name);
            }
            else if (this.isElementAttributeCompletion()) {
                return this.getElementAttributeCompletionSymbol(name);
            }
            else {
                return undefined;
            }
        };
        /**
         * Determine if the current node is the completion of a property expression, and narrow the type
         * of `this.node` if so.
         *
         * This narrowing gives access to additional methods related to completion of property
         * expressions.
         */
        CompletionBuilder.prototype.isPropertyExpressionCompletion = function () {
            return this.node instanceof compiler_1.PropertyRead || this.node instanceof compiler_1.MethodCall ||
                this.node instanceof compiler_1.SafePropertyRead || this.node instanceof compiler_1.SafeMethodCall ||
                this.node instanceof compiler_1.PropertyWrite || this.node instanceof compiler_1.EmptyExpr ||
                // BoundEvent nodes only count as property completions if in an EventValue context.
                (this.node instanceof r3_ast_1.BoundEvent && this.nodeContext === CompletionNodeContext.EventValue);
        };
        /**
         * Get completions for property expressions.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletion = function (options) {
            var e_1, _a;
            if (this.node instanceof compiler_1.EmptyExpr || this.node instanceof r3_ast_1.BoundEvent ||
                this.node.receiver instanceof compiler_1.ImplicitReceiver) {
                return this.getGlobalPropertyExpressionCompletion(options);
            }
            else {
                var location_1 = this.compiler.getTemplateTypeChecker().getExpressionCompletionLocation(this.node, this.component);
                if (location_1 === null) {
                    return undefined;
                }
                var tsResults = this.tsLS.getCompletionsAtPosition(location_1.shimPath, location_1.positionInShimFile, options);
                if (tsResults === undefined) {
                    return undefined;
                }
                var replacementSpan = makeReplacementSpanFromAst(this.node);
                var ngResults = [];
                try {
                    for (var _b = tslib_1.__values(tsResults.entries), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var result = _c.value;
                        ngResults.push(tslib_1.__assign(tslib_1.__assign({}, result), { replacementSpan: replacementSpan }));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return tslib_1.__assign(tslib_1.__assign({}, tsResults), { entries: ngResults });
            }
        };
        /**
         * Get the details of a specific completion for a property expression.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletionDetails = function (entryName, formatOptions, preferences) {
            var details = undefined;
            if (this.node instanceof compiler_1.EmptyExpr || this.node instanceof r3_ast_1.BoundEvent ||
                this.node.receiver instanceof compiler_1.ImplicitReceiver) {
                details =
                    this.getGlobalPropertyExpressionCompletionDetails(entryName, formatOptions, preferences);
            }
            else {
                var location_2 = this.compiler.getTemplateTypeChecker().getExpressionCompletionLocation(this.node, this.component);
                if (location_2 === null) {
                    return undefined;
                }
                details = this.tsLS.getCompletionEntryDetails(location_2.shimPath, location_2.positionInShimFile, entryName, formatOptions, 
                /* source */ undefined, preferences);
            }
            if (details !== undefined) {
                details.displayParts = utils_1.filterAliasImports(details.displayParts);
            }
            return details;
        };
        /**
         * Get the `ts.Symbol` for a specific completion for a property expression.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletionSymbol = function (name) {
            if (this.node instanceof compiler_1.EmptyExpr || this.node instanceof compiler_1.LiteralPrimitive ||
                this.node instanceof r3_ast_1.BoundEvent || this.node.receiver instanceof compiler_1.ImplicitReceiver) {
                return this.getGlobalPropertyExpressionCompletionSymbol(name);
            }
            else {
                var location_3 = this.compiler.getTemplateTypeChecker().getExpressionCompletionLocation(this.node, this.component);
                if (location_3 === null) {
                    return undefined;
                }
                return this.tsLS.getCompletionEntrySymbol(location_3.shimPath, location_3.positionInShimFile, name, /* source */ undefined);
            }
        };
        /**
         * Get completions for a property expression in a global context (e.g. `{{y|}}`).
         */
        CompletionBuilder.prototype.getGlobalPropertyExpressionCompletion = function (options) {
            var e_2, _a, e_3, _b;
            var completions = this.templateTypeChecker.getGlobalCompletions(this.template, this.component);
            if (completions === null) {
                return undefined;
            }
            var componentContext = completions.componentContext, templateContext = completions.templateContext;
            var replacementSpan = undefined;
            // Non-empty nodes get replaced with the completion.
            if (!(this.node instanceof compiler_1.EmptyExpr || this.node instanceof compiler_1.LiteralPrimitive ||
                this.node instanceof r3_ast_1.BoundEvent)) {
                replacementSpan = makeReplacementSpanFromAst(this.node);
            }
            // Merge TS completion results with results from the template scope.
            var entries = [];
            var tsLsCompletions = this.tsLS.getCompletionsAtPosition(componentContext.shimPath, componentContext.positionInShimFile, options);
            if (tsLsCompletions !== undefined) {
                try {
                    for (var _c = tslib_1.__values(tsLsCompletions.entries), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var tsCompletion = _d.value;
                        // Skip completions that are shadowed by a template entity definition.
                        if (templateContext.has(tsCompletion.name)) {
                            continue;
                        }
                        entries.push(tslib_1.__assign(tslib_1.__assign({}, tsCompletion), { 
                            // Substitute the TS completion's `replacementSpan` (which uses offsets within the TCB)
                            // with the `replacementSpan` within the template source.
                            replacementSpan: replacementSpan }));
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            try {
                for (var templateContext_1 = tslib_1.__values(templateContext), templateContext_1_1 = templateContext_1.next(); !templateContext_1_1.done; templateContext_1_1 = templateContext_1.next()) {
                    var _e = tslib_1.__read(templateContext_1_1.value, 2), name_1 = _e[0], entity = _e[1];
                    entries.push({
                        name: name_1,
                        sortText: name_1,
                        replacementSpan: replacementSpan,
                        kindModifiers: ts.ScriptElementKindModifier.none,
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(entity.kind === api_1.CompletionKind.Reference ? display_parts_1.DisplayInfoKind.REFERENCE :
                            display_parts_1.DisplayInfoKind.VARIABLE),
                    });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (templateContext_1_1 && !templateContext_1_1.done && (_b = templateContext_1.return)) _b.call(templateContext_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return {
                entries: entries,
                // Although this completion is "global" in the sense of an Angular expression (there is no
                // explicit receiver), it is not "global" in a TypeScript sense since Angular expressions have
                // the component as an implicit receiver.
                isGlobalCompletion: false,
                isMemberCompletion: true,
                isNewIdentifierLocation: false,
            };
        };
        /**
         * Get the details of a specific completion for a property expression in a global context (e.g.
         * `{{y|}}`).
         */
        CompletionBuilder.prototype.getGlobalPropertyExpressionCompletionDetails = function (entryName, formatOptions, preferences) {
            var completions = this.templateTypeChecker.getGlobalCompletions(this.template, this.component);
            if (completions === null) {
                return undefined;
            }
            var componentContext = completions.componentContext, templateContext = completions.templateContext;
            if (templateContext.has(entryName)) {
                var entry = templateContext.get(entryName);
                // Entries that reference a symbol in the template context refer either to local references or
                // variables.
                var symbol = this.templateTypeChecker.getSymbolOfNode(entry.node, this.component);
                if (symbol === null) {
                    return undefined;
                }
                var _a = display_parts_1.getSymbolDisplayInfo(this.tsLS, this.typeChecker, symbol), kind = _a.kind, displayParts = _a.displayParts, documentation = _a.documentation;
                return {
                    kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(kind),
                    name: entryName,
                    kindModifiers: ts.ScriptElementKindModifier.none,
                    displayParts: displayParts,
                    documentation: documentation,
                };
            }
            else {
                return this.tsLS.getCompletionEntryDetails(componentContext.shimPath, componentContext.positionInShimFile, entryName, formatOptions, 
                /* source */ undefined, preferences);
            }
        };
        /**
         * Get the `ts.Symbol` of a specific completion for a property expression in a global context
         * (e.g.
         * `{{y|}}`).
         */
        CompletionBuilder.prototype.getGlobalPropertyExpressionCompletionSymbol = function (entryName) {
            var completions = this.templateTypeChecker.getGlobalCompletions(this.template, this.component);
            if (completions === null) {
                return undefined;
            }
            var componentContext = completions.componentContext, templateContext = completions.templateContext;
            if (templateContext.has(entryName)) {
                var node = templateContext.get(entryName).node;
                var symbol = this.templateTypeChecker.getSymbolOfNode(node, this.component);
                if (symbol === null || symbol.tsSymbol === null) {
                    return undefined;
                }
                return symbol.tsSymbol;
            }
            else {
                return this.tsLS.getCompletionEntrySymbol(componentContext.shimPath, componentContext.positionInShimFile, entryName, 
                /* source */ undefined);
            }
        };
        CompletionBuilder.prototype.isElementTagCompletion = function () {
            return this.node instanceof compiler_1.TmplAstElement &&
                this.nodeContext === CompletionNodeContext.ElementTag;
        };
        CompletionBuilder.prototype.getElementTagCompletion = function () {
            var templateTypeChecker = this.compiler.getTemplateTypeChecker();
            // The replacementSpan is the tag name.
            var replacementSpan = {
                start: this.node.sourceSpan.start.offset + 1,
                length: this.node.name.length,
            };
            var entries = Array.from(templateTypeChecker.getPotentialElementTags(this.component))
                .map(function (_a) {
                var _b = tslib_1.__read(_a, 2), tag = _b[0], directive = _b[1];
                return ({
                    kind: tagCompletionKind(directive),
                    name: tag,
                    sortText: tag,
                    replacementSpan: replacementSpan,
                });
            });
            return {
                entries: entries,
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
            };
        };
        CompletionBuilder.prototype.getElementTagCompletionDetails = function (entryName) {
            var templateTypeChecker = this.compiler.getTemplateTypeChecker();
            var tagMap = templateTypeChecker.getPotentialElementTags(this.component);
            if (!tagMap.has(entryName)) {
                return undefined;
            }
            var directive = tagMap.get(entryName);
            var displayParts;
            var documentation = undefined;
            if (directive === null) {
                displayParts = [];
            }
            else {
                var displayInfo = display_parts_1.getDirectiveDisplayInfo(this.tsLS, directive);
                displayParts = displayInfo.displayParts;
                documentation = displayInfo.documentation;
            }
            return {
                kind: tagCompletionKind(directive),
                name: entryName,
                kindModifiers: ts.ScriptElementKindModifier.none,
                displayParts: displayParts,
                documentation: documentation,
            };
        };
        CompletionBuilder.prototype.getElementTagCompletionSymbol = function (entryName) {
            var templateTypeChecker = this.compiler.getTemplateTypeChecker();
            var tagMap = templateTypeChecker.getPotentialElementTags(this.component);
            if (!tagMap.has(entryName)) {
                return undefined;
            }
            var directive = tagMap.get(entryName);
            return directive === null || directive === void 0 ? void 0 : directive.tsSymbol;
        };
        CompletionBuilder.prototype.isElementAttributeCompletion = function () {
            return this.nodeContext === CompletionNodeContext.ElementAttributeKey &&
                (this.node instanceof compiler_1.TmplAstElement || this.node instanceof compiler_1.TmplAstBoundAttribute ||
                    this.node instanceof compiler_1.TmplAstTextAttribute || this.node instanceof compiler_1.TmplAstBoundEvent);
        };
        CompletionBuilder.prototype.getElementAttributeCompletions = function () {
            var e_4, _a;
            var element;
            if (this.node instanceof compiler_1.TmplAstElement) {
                element = this.node;
            }
            else if (this.nodeParent instanceof compiler_1.TmplAstElement || this.nodeParent instanceof compiler_1.TmplAstTemplate) {
                element = this.nodeParent;
            }
            else {
                // Nothing to do without an element to process.
                return undefined;
            }
            var replacementSpan = undefined;
            if ((this.node instanceof compiler_1.TmplAstBoundAttribute || this.node instanceof compiler_1.TmplAstBoundEvent ||
                this.node instanceof compiler_1.TmplAstTextAttribute) &&
                this.node.keySpan !== undefined) {
                replacementSpan = makeReplacementSpanFromParseSourceSpan(this.node.keySpan);
            }
            var attrTable = attribute_completions_1.buildAttributeCompletionTable(this.component, element, this.compiler.getTemplateTypeChecker());
            var entries = [];
            try {
                for (var _b = tslib_1.__values(attrTable.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var completion = _c.value;
                    // First, filter out completions that don't make sense for the current node. For example, if
                    // the user is completing on a property binding `[foo|]`, don't offer output event
                    // completions.
                    switch (completion.kind) {
                        case attribute_completions_1.AttributeCompletionKind.DomAttribute:
                        case attribute_completions_1.AttributeCompletionKind.DomProperty:
                            if (this.node instanceof compiler_1.TmplAstBoundEvent) {
                                continue;
                            }
                            break;
                        case attribute_completions_1.AttributeCompletionKind.DirectiveInput:
                            if (this.node instanceof compiler_1.TmplAstBoundEvent) {
                                continue;
                            }
                            break;
                        case attribute_completions_1.AttributeCompletionKind.DirectiveOutput:
                            if (this.node instanceof compiler_1.TmplAstBoundAttribute) {
                                continue;
                            }
                            break;
                        case attribute_completions_1.AttributeCompletionKind.DirectiveAttribute:
                            if (this.node instanceof compiler_1.TmplAstBoundAttribute ||
                                this.node instanceof compiler_1.TmplAstBoundEvent) {
                                continue;
                            }
                            break;
                    }
                    // Is the completion in an attribute context (instead of a property context)?
                    var isAttributeContext = (this.node instanceof compiler_1.TmplAstElement || this.node instanceof compiler_1.TmplAstTextAttribute);
                    // Is the completion for an element (not an <ng-template>)?
                    var isElementContext = this.node instanceof compiler_1.TmplAstElement || this.nodeParent instanceof compiler_1.TmplAstElement;
                    attribute_completions_1.addAttributeCompletionEntries(entries, completion, isAttributeContext, isElementContext, replacementSpan);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return {
                entries: entries,
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: true,
            };
        };
        CompletionBuilder.prototype.getElementAttributeCompletionDetails = function (entryName) {
            // `entryName` here may be `foo` or `[foo]`, depending on which suggested completion the user
            // chose. Strip off any binding syntax to get the real attribute name.
            var _a = stripBindingSugar(entryName), name = _a.name, kind = _a.kind;
            var element;
            if (this.node instanceof compiler_1.TmplAstElement || this.node instanceof compiler_1.TmplAstTemplate) {
                element = this.node;
            }
            else if (this.nodeParent instanceof compiler_1.TmplAstElement || this.nodeParent instanceof compiler_1.TmplAstTemplate) {
                element = this.nodeParent;
            }
            else {
                // Nothing to do without an element to process.
                return undefined;
            }
            var attrTable = attribute_completions_1.buildAttributeCompletionTable(this.component, element, this.compiler.getTemplateTypeChecker());
            if (!attrTable.has(name)) {
                return undefined;
            }
            var completion = attrTable.get(name);
            var displayParts;
            var documentation = undefined;
            var info;
            switch (completion.kind) {
                case attribute_completions_1.AttributeCompletionKind.DomAttribute:
                case attribute_completions_1.AttributeCompletionKind.DomProperty:
                    // TODO(alxhub): ideally we would show the same documentation as quick info here. However,
                    // since these bindings don't exist in the TCB, there is no straightforward way to retrieve
                    // a `ts.Symbol` for the field in the TS DOM definition.
                    displayParts = [];
                    break;
                case attribute_completions_1.AttributeCompletionKind.DirectiveAttribute:
                    info = display_parts_1.getDirectiveDisplayInfo(this.tsLS, completion.directive);
                    displayParts = info.displayParts;
                    documentation = info.documentation;
                    break;
                case attribute_completions_1.AttributeCompletionKind.DirectiveInput:
                case attribute_completions_1.AttributeCompletionKind.DirectiveOutput:
                    var propertySymbol = attribute_completions_1.getAttributeCompletionSymbol(completion, this.typeChecker);
                    if (propertySymbol === null) {
                        return undefined;
                    }
                    info = display_parts_1.getTsSymbolDisplayInfo(this.tsLS, this.typeChecker, propertySymbol, completion.kind === attribute_completions_1.AttributeCompletionKind.DirectiveInput ? display_parts_1.DisplayInfoKind.PROPERTY :
                        display_parts_1.DisplayInfoKind.EVENT, completion.directive.tsSymbol.name);
                    if (info === null) {
                        return undefined;
                    }
                    displayParts = info.displayParts;
                    documentation = info.documentation;
            }
            return {
                name: entryName,
                kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(kind),
                kindModifiers: ts.ScriptElementKindModifier.none,
                displayParts: [],
                documentation: documentation,
            };
        };
        CompletionBuilder.prototype.getElementAttributeCompletionSymbol = function (attribute) {
            var _a;
            var name = stripBindingSugar(attribute).name;
            var element;
            if (this.node instanceof compiler_1.TmplAstElement || this.node instanceof compiler_1.TmplAstTemplate) {
                element = this.node;
            }
            else if (this.nodeParent instanceof compiler_1.TmplAstElement || this.nodeParent instanceof compiler_1.TmplAstTemplate) {
                element = this.nodeParent;
            }
            else {
                // Nothing to do without an element to process.
                return undefined;
            }
            var attrTable = attribute_completions_1.buildAttributeCompletionTable(this.component, element, this.compiler.getTemplateTypeChecker());
            if (!attrTable.has(name)) {
                return undefined;
            }
            var completion = attrTable.get(name);
            return (_a = attribute_completions_1.getAttributeCompletionSymbol(completion, this.typeChecker)) !== null && _a !== void 0 ? _a : undefined;
        };
        CompletionBuilder.prototype.isPipeCompletion = function () {
            return this.node instanceof compiler_1.BindingPipe;
        };
        CompletionBuilder.prototype.getPipeCompletions = function () {
            var pipes = this.templateTypeChecker.getPipesInScope(this.component);
            if (pipes === null) {
                return undefined;
            }
            var replacementSpan = makeReplacementSpanFromAst(this.node);
            var entries = pipes.map(function (pipe) { return ({
                name: pipe.name,
                sortText: pipe.name,
                kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PIPE),
                replacementSpan: replacementSpan,
            }); });
            return {
                entries: entries,
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
            };
        };
        return CompletionBuilder;
    }());
    exports.CompletionBuilder = CompletionBuilder;
    function makeReplacementSpanFromParseSourceSpan(span) {
        return {
            start: span.start.offset,
            length: span.end.offset - span.start.offset,
        };
    }
    function makeReplacementSpanFromAst(node) {
        return {
            start: node.nameSpan.start,
            length: node.nameSpan.end - node.nameSpan.start,
        };
    }
    function tagCompletionKind(directive) {
        var kind;
        if (directive === null) {
            kind = display_parts_1.DisplayInfoKind.ELEMENT;
        }
        else if (directive.isComponent) {
            kind = display_parts_1.DisplayInfoKind.COMPONENT;
        }
        else {
            kind = display_parts_1.DisplayInfoKind.DIRECTIVE;
        }
        return display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(kind);
    }
    var BINDING_SUGAR = /[\[\(\)\]]/g;
    function stripBindingSugar(binding) {
        var name = binding.replace(BINDING_SUGAR, '');
        if (binding.startsWith('[')) {
            return { name: name, kind: display_parts_1.DisplayInfoKind.PROPERTY };
        }
        else if (binding.startsWith('(')) {
            return { name: name, kind: display_parts_1.DisplayInfoKind.EVENT };
        }
        else {
            return { name: name, kind: display_parts_1.DisplayInfoKind.ATTRIBUTE };
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStVO0lBRS9VLHFFQUEwSDtJQUMxSCwrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZGQUE0SjtJQUM1Siw2RUFBa0w7SUFDbEwsNkRBQTJDO0lBVzNDLElBQVkscUJBTVg7SUFORCxXQUFZLHFCQUFxQjtRQUMvQixpRUFBSSxDQUFBO1FBQ0osNkVBQVUsQ0FBQTtRQUNWLCtGQUFtQixDQUFBO1FBQ25CLG1HQUFxQixDQUFBO1FBQ3JCLDZFQUFVLENBQUE7SUFDWixDQUFDLEVBTlcscUJBQXFCLEdBQXJCLDZCQUFxQixLQUFyQiw2QkFBcUIsUUFNaEM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFJRSwyQkFDcUIsSUFBd0IsRUFBbUIsUUFBb0IsRUFDL0QsU0FBOEIsRUFBbUIsSUFBTyxFQUN4RCxXQUFrQyxFQUNsQyxVQUFnQyxFQUNoQyxRQUE4QjtZQUo5QixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBQy9ELGNBQVMsR0FBVCxTQUFTLENBQXFCO1lBQW1CLFNBQUksR0FBSixJQUFJLENBQUc7WUFDeEQsZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1lBQ2xDLGVBQVUsR0FBVixVQUFVLENBQXNCO1lBQ2hDLGFBQVEsR0FBUixRQUFRLENBQXNCO1lBUmxDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM5RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFPeEIsQ0FBQztRQUV2RDs7V0FFRztRQUNILG9EQUF3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QUFLO1NBQ2hELENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxTQUFnQztRQUN6RCxJQUFJLElBQXFCLENBQUM7UUFDMUIsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO1lBQ3RCLElBQUksR0FBRywrQkFBZSxDQUFDLE9BQU8sQ0FBQztTQUNoQzthQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsRUFBRTtZQUNoQyxJQUFJLEdBQUcsK0JBQWUsQ0FBQyxTQUFTLENBQUM7U0FDbEM7YUFBTTtZQUNMLElBQUksR0FBRywrQkFBZSxDQUFDLFNBQVMsQ0FBQztTQUNsQztRQUNELE9BQU8sNERBQTRDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELElBQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUVwQyxTQUFTLGlCQUFpQixDQUFDLE9BQWU7UUFDeEMsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEQsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLEVBQUUsK0JBQWUsQ0FBQyxRQUFRLEVBQUMsQ0FBQztTQUMvQzthQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQyxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFFLCtCQUFlLENBQUMsS0FBSyxFQUFDLENBQUM7U0FDNUM7YUFBTTtZQUNMLE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLEVBQUUsK0JBQWUsQ0FBQyxTQUFTLEVBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJpbmRpbmdQaXBlLCBFbXB0eUV4cHIsIEltcGxpY2l0UmVjZWl2ZXIsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7Q29tcGxldGlvbktpbmQsIERpcmVjdGl2ZUluU2NvcGUsIFRlbXBsYXRlRGVjbGFyYXRpb25TeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0JvdW5kRXZlbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthZGRBdHRyaWJ1dGVDb21wbGV0aW9uRW50cmllcywgQXR0cmlidXRlQ29tcGxldGlvbktpbmQsIGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlLCBnZXRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sfSBmcm9tICcuL2F0dHJpYnV0ZV9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0Rpc3BsYXlJbmZvLCBEaXNwbGF5SW5mb0tpbmQsIGdldERpcmVjdGl2ZURpc3BsYXlJbmZvLCBnZXRTeW1ib2xEaXNwbGF5SW5mbywgZ2V0VHNTeW1ib2xEaXNwbGF5SW5mbywgdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmR9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge2ZpbHRlckFsaWFzSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbnR5cGUgUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIgPVxuICAgIENvbXBsZXRpb25CdWlsZGVyPFByb3BlcnR5UmVhZHxQcm9wZXJ0eVdyaXRlfE1ldGhvZENhbGx8RW1wdHlFeHByfFNhZmVQcm9wZXJ0eVJlYWR8XG4gICAgICAgICAgICAgICAgICAgICAgU2FmZU1ldGhvZENhbGx8VG1wbEFzdEJvdW5kRXZlbnQ+O1xuXG50eXBlIEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlciA9XG4gICAgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlfFRtcGxBc3RCb3VuZEV2ZW50PjtcblxudHlwZSBQaXBlQ29tcGxldGlvbkJ1aWxkZXIgPSBDb21wbGV0aW9uQnVpbGRlcjxCaW5kaW5nUGlwZT47XG5cbmV4cG9ydCBlbnVtIENvbXBsZXRpb25Ob2RlQ29udGV4dCB7XG4gIE5vbmUsXG4gIEVsZW1lbnRUYWcsXG4gIEVsZW1lbnRBdHRyaWJ1dGVLZXksXG4gIEVsZW1lbnRBdHRyaWJ1dGVWYWx1ZSxcbiAgRXZlbnRWYWx1ZSxcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhdXRvY29tcGxldGlvbiBvcGVyYXRpb25zIG9uIGEgZ2l2ZW4gbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gKlxuICogVGhpcyBjbGFzcyBhY3RzIGFzIGEgY2xvc3VyZSBhcm91bmQgYWxsIG9mIHRoZSBjb250ZXh0IHJlcXVpcmVkIHRvIHBlcmZvcm0gdGhlIDMgYXV0b2NvbXBsZXRpb25cbiAqIG9wZXJhdGlvbnMgKGNvbXBsZXRpb25zLCBnZXQgZGV0YWlscywgYW5kIGdldCBzeW1ib2wpIGF0IGEgc3BlY2lmaWMgbm9kZS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBgTmAgdHlwZSBmb3IgdGhlIHRlbXBsYXRlIG5vZGUgaXMgbmFycm93ZWQgaW50ZXJuYWxseSBmb3IgY2VydGFpbiBvcGVyYXRpb25zLCBhcyB0aGVcbiAqIGNvbXBpbGVyIG9wZXJhdGlvbnMgcmVxdWlyZWQgdG8gaW1wbGVtZW50IGNvbXBsZXRpb24gbWF5IGJlIGRpZmZlcmVudCBmb3IgZGlmZmVyZW50IG5vZGUgdHlwZXMuXG4gKlxuICogQHBhcmFtIE4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgbm9kZSBpbiBxdWVzdGlvbiwgbmFycm93ZWQgYWNjb3JkaW5nbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uQnVpbGRlcjxOIGV4dGVuZHMgVG1wbEFzdE5vZGV8QVNUPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IE4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVDb250ZXh0OiBDb21wbGV0aW9uTm9kZUNvbnRleHQsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVQYXJlbnQ6IFRtcGxBc3ROb2RlfEFTVHxudWxsLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlfG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIEFuYWxvZ3VlIGZvciBgdHMuTGFuZ3VhZ2VTZXJ2aWNlLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbmAuXG4gICAqL1xuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc1BpcGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFBpcGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBlbnRyeU5hbWU6IHN0cmluZywgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IG5vZGUgaXMgdGhlIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBleHByZXNzaW9uLCBhbmQgbmFycm93IHRoZSB0eXBlXG4gICAqIG9mIGB0aGlzLm5vZGVgIGlmIHNvLlxuICAgKlxuICAgKiBUaGlzIG5hcnJvd2luZyBnaXZlcyBhY2Nlc3MgdG8gYWRkaXRpb25hbCBtZXRob2RzIHJlbGF0ZWQgdG8gY29tcGxldGlvbiBvZiBwcm9wZXJ0eVxuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD4pOlxuICAgICAgdGhpcyBpcyBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8XG4gICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHxcbiAgICAgICAgLy8gQm91bmRFdmVudCBub2RlcyBvbmx5IGNvdW50IGFzIHByb3BlcnR5IGNvbXBsZXRpb25zIGlmIGluIGFuIEV2ZW50VmFsdWUgY29udGV4dC5cbiAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgJiYgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkV2ZW50VmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb21wbGV0aW9ucyBmb3IgcHJvcGVydHkgZXhwcmVzc2lvbnMuXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCb3VuZEV2ZW50IHx8XG4gICAgICAgIHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgICAgICB0aGlzLm5vZGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNSZXN1bHRzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgICAgICBsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlLCBvcHRpb25zKTtcbiAgICAgIGlmICh0c1Jlc3VsdHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgICBsZXQgbmdSZXN1bHRzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgdHNSZXN1bHRzLmVudHJpZXMpIHtcbiAgICAgICAgbmdSZXN1bHRzLnB1c2goe1xuICAgICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udHNSZXN1bHRzLFxuICAgICAgICBlbnRyaWVzOiBuZ1Jlc3VsdHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGxldCBkZXRhaWxzOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgZGV0YWlscyA9XG4gICAgICAgICAgdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkZXRhaWxzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gICAgaWYgKGRldGFpbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZGV0YWlscy5kaXNwbGF5UGFydHMgPSBmaWx0ZXJBbGlhc0ltcG9ydHMoZGV0YWlscy5kaXNwbGF5UGFydHMpO1xuICAgIH1cbiAgICByZXR1cm4gZGV0YWlscztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5TeW1ib2xgIGZvciBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCB8fCB0aGlzLm5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5ub2RlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGxvY2F0aW9uLnNoaW1QYXRoLCBsb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGUsIG5hbWUsIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29tcGxldGlvbnMgZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbiBpbiBhIGdsb2JhbCBjb250ZXh0IChlLmcuIGB7e3l8fX1gKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLFxuICAgICAgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBsZXQgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgLy8gTm9uLWVtcHR5IG5vZGVzIGdldCByZXBsYWNlZCB3aXRoIHRoZSBjb21wbGV0aW9uLlxuICAgIGlmICghKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlIHx8XG4gICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCkpIHtcbiAgICAgIHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tQXN0KHRoaXMubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgVFMgY29tcGxldGlvbiByZXN1bHRzIHdpdGggcmVzdWx0cyBmcm9tIHRoZSB0ZW1wbGF0ZSBzY29wZS5cbiAgICBsZXQgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgICBjb25zdCB0c0xzQ29tcGxldGlvbnMgPSB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgb3B0aW9ucyk7XG4gICAgaWYgKHRzTHNDb21wbGV0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IHRzQ29tcGxldGlvbiBvZiB0c0xzQ29tcGxldGlvbnMuZW50cmllcykge1xuICAgICAgICAvLyBTa2lwIGNvbXBsZXRpb25zIHRoYXQgYXJlIHNoYWRvd2VkIGJ5IGEgdGVtcGxhdGUgZW50aXR5IGRlZmluaXRpb24uXG4gICAgICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKHRzQ29tcGxldGlvbi5uYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgICAgLi4udHNDb21wbGV0aW9uLFxuICAgICAgICAgIC8vIFN1YnN0aXR1dGUgdGhlIFRTIGNvbXBsZXRpb24ncyBgcmVwbGFjZW1lbnRTcGFuYCAod2hpY2ggdXNlcyBvZmZzZXRzIHdpdGhpbiB0aGUgVENCKVxuICAgICAgICAgIC8vIHdpdGggdGhlIGByZXBsYWNlbWVudFNwYW5gIHdpdGhpbiB0aGUgdGVtcGxhdGUgc291cmNlLlxuICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZW50aXR5XSBvZiB0ZW1wbGF0ZUNvbnRleHQpIHtcbiAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoXG4gICAgICAgICAgICBlbnRpdHkua2luZCA9PT0gQ29tcGxldGlvbktpbmQuUmVmZXJlbmNlID8gRGlzcGxheUluZm9LaW5kLlJFRkVSRU5DRSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGlzcGxheUluZm9LaW5kLlZBUklBQkxFKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgLy8gQWx0aG91Z2ggdGhpcyBjb21wbGV0aW9uIGlzIFwiZ2xvYmFsXCIgaW4gdGhlIHNlbnNlIG9mIGFuIEFuZ3VsYXIgZXhwcmVzc2lvbiAodGhlcmUgaXMgbm9cbiAgICAgIC8vIGV4cGxpY2l0IHJlY2VpdmVyKSwgaXQgaXMgbm90IFwiZ2xvYmFsXCIgaW4gYSBUeXBlU2NyaXB0IHNlbnNlIHNpbmNlIEFuZ3VsYXIgZXhwcmVzc2lvbnMgaGF2ZVxuICAgICAgLy8gdGhlIGNvbXBvbmVudCBhcyBhbiBpbXBsaWNpdCByZWNlaXZlci5cbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IHRydWUsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dCAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zID1cbiAgICAgICAgdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldEdsb2JhbENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBpZiAodGVtcGxhdGVDb250ZXh0LmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHRlbXBsYXRlQ29udGV4dC5nZXQoZW50cnlOYW1lKSE7XG4gICAgICAvLyBFbnRyaWVzIHRoYXQgcmVmZXJlbmNlIGEgc3ltYm9sIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHJlZmVyIGVpdGhlciB0byBsb2NhbCByZWZlcmVuY2VzIG9yXG4gICAgICAvLyB2YXJpYWJsZXMuXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKGVudHJ5Lm5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7a2luZCwgZGlzcGxheVBhcnRzLCBkb2N1bWVudGF0aW9ufSA9XG4gICAgICAgICAgZ2V0U3ltYm9sRGlzcGxheUluZm8odGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBzeW1ib2wpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dFxuICAgKiAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCB7Y29tcG9uZW50Q29udGV4dCwgdGVtcGxhdGVDb250ZXh0fSA9IGNvbXBsZXRpb25zO1xuICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIGNvbnN0IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlID0gdGVtcGxhdGVDb250ZXh0LmdldChlbnRyeU5hbWUpIS5ub2RlO1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFN5bWJvbE9mTm9kZShub2RlLCB0aGlzLmNvbXBvbmVudCkgYXNcbiAgICAgICAgICAgICAgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbCB8XG4gICAgICAgICAgbnVsbDtcbiAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3ltYm9sLnRzU3ltYm9sO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChcbiAgICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNFbGVtZW50VGFnQ29tcGxldGlvbigpOiB0aGlzIGlzIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50PiB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmXG4gICAgICAgIHRoaXMubm9kZUNvbnRleHQgPT09IENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50VGFnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvbih0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudD4pOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICAgIC8vIFRoZSByZXBsYWNlbWVudFNwYW4gaXMgdGhlIHRhZyBuYW1lLlxuICAgIGNvbnN0IHJlcGxhY2VtZW50U3BhbjogdHMuVGV4dFNwYW4gPSB7XG4gICAgICBzdGFydDogdGhpcy5ub2RlLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgMSwgIC8vIGFjY291bnQgZm9yIGxlYWRpbmcgJzwnXG4gICAgICBsZW5ndGg6IHRoaXMubm9kZS5uYW1lLmxlbmd0aCxcbiAgICB9O1xuXG4gICAgY29uc3QgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPVxuICAgICAgICBBcnJheS5mcm9tKHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0UG90ZW50aWFsRWxlbWVudFRhZ3ModGhpcy5jb21wb25lbnQpKVxuICAgICAgICAgICAgLm1hcCgoW3RhZywgZGlyZWN0aXZlXSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICBraW5kOiB0YWdDb21wbGV0aW9uS2luZChkaXJlY3RpdmUpLFxuICAgICAgICAgICAgICAgICAgIG5hbWU6IHRhZyxcbiAgICAgICAgICAgICAgICAgICBzb3J0VGV4dDogdGFnLFxuICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudD4sIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc1xuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgdGFnTWFwID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQb3RlbnRpYWxFbGVtZW50VGFncyh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKCF0YWdNYXAuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlID0gdGFnTWFwLmdldChlbnRyeU5hbWUpITtcbiAgICBsZXQgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdO1xuICAgIGxldCBkb2N1bWVudGF0aW9uOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoZGlyZWN0aXZlID09PSBudWxsKSB7XG4gICAgICBkaXNwbGF5UGFydHMgPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlzcGxheUluZm8gPSBnZXREaXJlY3RpdmVEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIGRpcmVjdGl2ZSk7XG4gICAgICBkaXNwbGF5UGFydHMgPSBkaXNwbGF5SW5mby5kaXNwbGF5UGFydHM7XG4gICAgICBkb2N1bWVudGF0aW9uID0gZGlzcGxheUluZm8uZG9jdW1lbnRhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogdGFnQ29tcGxldGlvbktpbmQoZGlyZWN0aXZlKSxcbiAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgIGRpc3BsYXlQYXJ0cyxcbiAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudFRhZ0NvbXBsZXRpb25TeW1ib2wodGhpczogQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnQ+LCBlbnRyeU5hbWU6IHN0cmluZyk6XG4gICAgICB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCB0YWdNYXAgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBvdGVudGlhbEVsZW1lbnRUYWdzKHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoIXRhZ01hcC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmUgPSB0YWdNYXAuZ2V0KGVudHJ5TmFtZSkhO1xuICAgIHJldHVybiBkaXJlY3RpdmU/LnRzU3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCk6IHRoaXMgaXMgRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXkgJiZcbiAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fFxuICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGhpczogRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyKTpcbiAgICAgIHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGVQYXJlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vdGhpbmcgdG8gZG8gd2l0aG91dCBhbiBlbGVtZW50IHRvIHByb2Nlc3MuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGxldCByZXBsYWNlbWVudFNwYW46IHRzLlRleHRTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCB8fFxuICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmXG4gICAgICAgIHRoaXMubm9kZS5rZXlTcGFuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tUGFyc2VTb3VyY2VTcGFuKHRoaXMubm9kZS5rZXlTcGFuKTtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGxldCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBjb21wbGV0aW9uIG9mIGF0dHJUYWJsZS52YWx1ZXMoKSkge1xuICAgICAgLy8gRmlyc3QsIGZpbHRlciBvdXQgY29tcGxldGlvbnMgdGhhdCBkb24ndCBtYWtlIHNlbnNlIGZvciB0aGUgY3VycmVudCBub2RlLiBGb3IgZXhhbXBsZSwgaWZcbiAgICAgIC8vIHRoZSB1c2VyIGlzIGNvbXBsZXRpbmcgb24gYSBwcm9wZXJ0eSBiaW5kaW5nIGBbZm9vfF1gLCBkb24ndCBvZmZlciBvdXRwdXQgZXZlbnRcbiAgICAgIC8vIGNvbXBsZXRpb25zLlxuICAgICAgc3dpdGNoIChjb21wbGV0aW9uLmtpbmQpIHtcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21BdHRyaWJ1dGU6XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tUHJvcGVydHk6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlSW5wdXQ6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0OlxuICAgICAgICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVBdHRyaWJ1dGU6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fFxuICAgICAgICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBJcyB0aGUgY29tcGxldGlvbiBpbiBhbiBhdHRyaWJ1dGUgY29udGV4dCAoaW5zdGVhZCBvZiBhIHByb3BlcnR5IGNvbnRleHQpP1xuICAgICAgY29uc3QgaXNBdHRyaWJ1dGVDb250ZXh0ID1cbiAgICAgICAgICAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpO1xuICAgICAgLy8gSXMgdGhlIGNvbXBsZXRpb24gZm9yIGFuIGVsZW1lbnQgKG5vdCBhbiA8bmctdGVtcGxhdGU+KT9cbiAgICAgIGNvbnN0IGlzRWxlbWVudENvbnRleHQgPVxuICAgICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50O1xuICAgICAgYWRkQXR0cmlidXRlQ29tcGxldGlvbkVudHJpZXMoXG4gICAgICAgICAgZW50cmllcywgY29tcGxldGlvbiwgaXNBdHRyaWJ1dGVDb250ZXh0LCBpc0VsZW1lbnRDb250ZXh0LCByZXBsYWNlbWVudFNwYW4pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc1xuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgLy8gYGVudHJ5TmFtZWAgaGVyZSBtYXkgYmUgYGZvb2Agb3IgYFtmb29dYCwgZGVwZW5kaW5nIG9uIHdoaWNoIHN1Z2dlc3RlZCBjb21wbGV0aW9uIHRoZSB1c2VyXG4gICAgLy8gY2hvc2UuIFN0cmlwIG9mZiBhbnkgYmluZGluZyBzeW50YXggdG8gZ2V0IHRoZSByZWFsIGF0dHJpYnV0ZSBuYW1lLlxuICAgIGNvbnN0IHtuYW1lLCBraW5kfSA9IHN0cmlwQmluZGluZ1N1Z2FyKGVudHJ5TmFtZSk7XG5cbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlUGFyZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RoaW5nIHRvIGRvIHdpdGhvdXQgYW4gZWxlbWVudCB0byBwcm9jZXNzLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGlmICghYXR0clRhYmxlLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXR0clRhYmxlLmdldChuYW1lKSE7XG4gICAgbGV0IGRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXTtcbiAgICBsZXQgZG9jdW1lbnRhdGlvbjogdHMuU3ltYm9sRGlzcGxheVBhcnRbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGluZm86IERpc3BsYXlJbmZvfG51bGw7XG4gICAgc3dpdGNoIChjb21wbGV0aW9uLmtpbmQpIHtcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tQXR0cmlidXRlOlxuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21Qcm9wZXJ0eTpcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBpZGVhbGx5IHdlIHdvdWxkIHNob3cgdGhlIHNhbWUgZG9jdW1lbnRhdGlvbiBhcyBxdWljayBpbmZvIGhlcmUuIEhvd2V2ZXIsXG4gICAgICAgIC8vIHNpbmNlIHRoZXNlIGJpbmRpbmdzIGRvbid0IGV4aXN0IGluIHRoZSBUQ0IsIHRoZXJlIGlzIG5vIHN0cmFpZ2h0Zm9yd2FyZCB3YXkgdG8gcmV0cmlldmVcbiAgICAgICAgLy8gYSBgdHMuU3ltYm9sYCBmb3IgdGhlIGZpZWxkIGluIHRoZSBUUyBET00gZGVmaW5pdGlvbi5cbiAgICAgICAgZGlzcGxheVBhcnRzID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVBdHRyaWJ1dGU6XG4gICAgICAgIGluZm8gPSBnZXREaXJlY3RpdmVEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIGNvbXBsZXRpb24uZGlyZWN0aXZlKTtcbiAgICAgICAgZGlzcGxheVBhcnRzID0gaW5mby5kaXNwbGF5UGFydHM7XG4gICAgICAgIGRvY3VtZW50YXRpb24gPSBpbmZvLmRvY3VtZW50YXRpb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dDpcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0OlxuICAgICAgICBjb25zdCBwcm9wZXJ0eVN5bWJvbCA9IGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woY29tcGxldGlvbiwgdGhpcy50eXBlQ2hlY2tlcik7XG4gICAgICAgIGlmIChwcm9wZXJ0eVN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpbmZvID0gZ2V0VHNTeW1ib2xEaXNwbGF5SW5mbyhcbiAgICAgICAgICAgIHRoaXMudHNMUywgdGhpcy50eXBlQ2hlY2tlciwgcHJvcGVydHlTeW1ib2wsXG4gICAgICAgICAgICBjb21wbGV0aW9uLmtpbmQgPT09IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0ID8gRGlzcGxheUluZm9LaW5kLlBST1BFUlRZIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEaXNwbGF5SW5mb0tpbmQuRVZFTlQsXG4gICAgICAgICAgICBjb21wbGV0aW9uLmRpcmVjdGl2ZS50c1N5bWJvbC5uYW1lKTtcbiAgICAgICAgaWYgKGluZm8gPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGRpc3BsYXlQYXJ0cyA9IGluZm8uZGlzcGxheVBhcnRzO1xuICAgICAgICBkb2N1bWVudGF0aW9uID0gaW5mby5kb2N1bWVudGF0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBlbnRyeU5hbWUsXG4gICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChraW5kKSxcbiAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgIGRpc3BsYXlQYXJ0czogW10sXG4gICAgICBkb2N1bWVudGF0aW9uLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sKFxuICAgICAgdGhpczogRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyLCBhdHRyaWJ1dGU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHtuYW1lfSA9IHN0cmlwQmluZGluZ1N1Z2FyKGF0dHJpYnV0ZSk7XG5cbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlUGFyZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RoaW5nIHRvIGRvIHdpdGhvdXQgYW4gZWxlbWVudCB0byBwcm9jZXNzLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGlmICghYXR0clRhYmxlLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXR0clRhYmxlLmdldChuYW1lKSE7XG4gICAgcmV0dXJuIGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woY29tcGxldGlvbiwgdGhpcy50eXBlQ2hlY2tlcikgPz8gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BpcGVDb21wbGV0aW9uKCk6IHRoaXMgaXMgUGlwZUNvbXBsZXRpb25CdWlsZGVyIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGU7XG4gIH1cblxuICBwcml2YXRlIGdldFBpcGVDb21wbGV0aW9ucyh0aGlzOiBQaXBlQ29tcGxldGlvbkJ1aWxkZXIpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHBpcGVzID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBpcGVzSW5TY29wZSh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKHBpcGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tQXN0KHRoaXMubm9kZSk7XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9XG4gICAgICAgIHBpcGVzLm1hcChwaXBlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHBpcGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc29ydFRleHQ6IHBpcGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoRGlzcGxheUluZm9LaW5kLlBJUEUpLFxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tUGFyc2VTb3VyY2VTcGFuKHNwYW46IFBhcnNlU291cmNlU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgbGVuZ3RoOiBzcGFuLmVuZC5vZmZzZXQgLSBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21Bc3Qobm9kZTogUHJvcGVydHlSZWFkfFByb3BlcnR5V3JpdGV8TWV0aG9kQ2FsbHxTYWZlUHJvcGVydHlSZWFkfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2FmZU1ldGhvZENhbGx8QmluZGluZ1BpcGUpOiB0cy5UZXh0U3BhbiB7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IG5vZGUubmFtZVNwYW4uc3RhcnQsXG4gICAgbGVuZ3RoOiBub2RlLm5hbWVTcGFuLmVuZCAtIG5vZGUubmFtZVNwYW4uc3RhcnQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRhZ0NvbXBsZXRpb25LaW5kKGRpcmVjdGl2ZTogRGlyZWN0aXZlSW5TY29wZXxudWxsKTogdHMuU2NyaXB0RWxlbWVudEtpbmQge1xuICBsZXQga2luZDogRGlzcGxheUluZm9LaW5kO1xuICBpZiAoZGlyZWN0aXZlID09PSBudWxsKSB7XG4gICAga2luZCA9IERpc3BsYXlJbmZvS2luZC5FTEVNRU5UO1xuICB9IGVsc2UgaWYgKGRpcmVjdGl2ZS5pc0NvbXBvbmVudCkge1xuICAgIGtpbmQgPSBEaXNwbGF5SW5mb0tpbmQuQ09NUE9ORU5UO1xuICB9IGVsc2Uge1xuICAgIGtpbmQgPSBEaXNwbGF5SW5mb0tpbmQuRElSRUNUSVZFO1xuICB9XG4gIHJldHVybiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChraW5kKTtcbn1cblxuY29uc3QgQklORElOR19TVUdBUiA9IC9bXFxbXFwoXFwpXFxdXS9nO1xuXG5mdW5jdGlvbiBzdHJpcEJpbmRpbmdTdWdhcihiaW5kaW5nOiBzdHJpbmcpOiB7bmFtZTogc3RyaW5nLCBraW5kOiBEaXNwbGF5SW5mb0tpbmR9IHtcbiAgY29uc3QgbmFtZSA9IGJpbmRpbmcucmVwbGFjZShCSU5ESU5HX1NVR0FSLCAnJyk7XG4gIGlmIChiaW5kaW5nLnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgIHJldHVybiB7bmFtZSwga2luZDogRGlzcGxheUluZm9LaW5kLlBST1BFUlRZfTtcbiAgfSBlbHNlIGlmIChiaW5kaW5nLnN0YXJ0c1dpdGgoJygnKSkge1xuICAgIHJldHVybiB7bmFtZSwga2luZDogRGlzcGxheUluZm9LaW5kLkVWRU5UfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge25hbWUsIGtpbmQ6IERpc3BsYXlJbmZvS2luZC5BVFRSSUJVVEV9O1xuICB9XG59XG4iXX0=