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
        CompletionNodeContext[CompletionNodeContext["TwoWayBinding"] = 5] = "TwoWayBinding";
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
            return (this.nodeContext === CompletionNodeContext.ElementAttributeKey ||
                this.nodeContext === CompletionNodeContext.TwoWayBinding) &&
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
                            if (!completion.twoWayBindingSupported &&
                                this.nodeContext === CompletionNodeContext.TwoWayBinding) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStVO0lBRS9VLHFFQUEwSDtJQUMxSCwrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZGQUE0SjtJQUM1Siw2RUFBa0w7SUFDbEwsNkRBQTJDO0lBVzNDLElBQVkscUJBT1g7SUFQRCxXQUFZLHFCQUFxQjtRQUMvQixpRUFBSSxDQUFBO1FBQ0osNkVBQVUsQ0FBQTtRQUNWLCtGQUFtQixDQUFBO1FBQ25CLG1HQUFxQixDQUFBO1FBQ3JCLDZFQUFVLENBQUE7UUFDVixtRkFBYSxDQUFBO0lBQ2YsQ0FBQyxFQVBXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBT2hDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBSUUsMkJBQ3FCLElBQXdCLEVBQW1CLFFBQW9CLEVBQy9ELFNBQThCLEVBQW1CLElBQU8sRUFDeEQsV0FBa0MsRUFDbEMsVUFBZ0MsRUFDaEMsUUFBOEI7WUFKOUIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUMvRCxjQUFTLEdBQVQsU0FBUyxDQUFxQjtZQUFtQixTQUFJLEdBQUosSUFBSSxDQUFHO1lBQ3hELGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtZQUNsQyxlQUFVLEdBQVYsVUFBVSxDQUFzQjtZQUNoQyxhQUFRLEdBQVIsUUFBUSxDQUFzQjtZQVJsQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDOUQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBT3hCLENBQUM7UUFFdkQ7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QUFDLFNBQVMsRUFBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1BpcGUsIEVtcHR5RXhwciwgSW1wbGljaXRSZWNlaXZlciwgTGl0ZXJhbFByaW1pdGl2ZSwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtDb21wbGV0aW9uS2luZCwgRGlyZWN0aXZlSW5TY29wZSwgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Qm91bmRFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2FkZEF0dHJpYnV0ZUNvbXBsZXRpb25FbnRyaWVzLCBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZCwgYnVpbGRBdHRyaWJ1dGVDb21wbGV0aW9uVGFibGUsIGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2x9IGZyb20gJy4vYXR0cmlidXRlX2NvbXBsZXRpb25zJztcbmltcG9ydCB7RGlzcGxheUluZm8sIERpc3BsYXlJbmZvS2luZCwgZ2V0RGlyZWN0aXZlRGlzcGxheUluZm8sIGdldFN5bWJvbERpc3BsYXlJbmZvLCBnZXRUc1N5bWJvbERpc3BsYXlJbmZvLCB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZH0gZnJvbSAnLi9kaXNwbGF5X3BhcnRzJztcbmltcG9ydCB7ZmlsdGVyQWxpYXNJbXBvcnRzfSBmcm9tICcuL3V0aWxzJztcblxudHlwZSBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciA9XG4gICAgQ29tcGxldGlvbkJ1aWxkZXI8UHJvcGVydHlSZWFkfFByb3BlcnR5V3JpdGV8TWV0aG9kQ2FsbHxFbXB0eUV4cHJ8U2FmZVByb3BlcnR5UmVhZHxcbiAgICAgICAgICAgICAgICAgICAgICBTYWZlTWV0aG9kQ2FsbHxUbXBsQXN0Qm91bmRFdmVudD47XG5cbnR5cGUgRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyID1cbiAgICBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudHxUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGV8VG1wbEFzdEJvdW5kRXZlbnQ+O1xuXG50eXBlIFBpcGVDb21wbGV0aW9uQnVpbGRlciA9IENvbXBsZXRpb25CdWlsZGVyPEJpbmRpbmdQaXBlPjtcblxuZXhwb3J0IGVudW0gQ29tcGxldGlvbk5vZGVDb250ZXh0IHtcbiAgTm9uZSxcbiAgRWxlbWVudFRhZyxcbiAgRWxlbWVudEF0dHJpYnV0ZUtleSxcbiAgRWxlbWVudEF0dHJpYnV0ZVZhbHVlLFxuICBFdmVudFZhbHVlLFxuICBUd29XYXlCaW5kaW5nLFxufVxuXG4vKipcbiAqIFBlcmZvcm1zIGF1dG9jb21wbGV0aW9uIG9wZXJhdGlvbnMgb24gYSBnaXZlbiBub2RlIGluIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGlzIGNsYXNzIGFjdHMgYXMgYSBjbG9zdXJlIGFyb3VuZCBhbGwgb2YgdGhlIGNvbnRleHQgcmVxdWlyZWQgdG8gcGVyZm9ybSB0aGUgMyBhdXRvY29tcGxldGlvblxuICogb3BlcmF0aW9ucyAoY29tcGxldGlvbnMsIGdldCBkZXRhaWxzLCBhbmQgZ2V0IHN5bWJvbCkgYXQgYSBzcGVjaWZpYyBub2RlLlxuICpcbiAqIFRoZSBnZW5lcmljIGBOYCB0eXBlIGZvciB0aGUgdGVtcGxhdGUgbm9kZSBpcyBuYXJyb3dlZCBpbnRlcm5hbGx5IGZvciBjZXJ0YWluIG9wZXJhdGlvbnMsIGFzIHRoZVxuICogY29tcGlsZXIgb3BlcmF0aW9ucyByZXF1aXJlZCB0byBpbXBsZW1lbnQgY29tcGxldGlvbiBtYXkgYmUgZGlmZmVyZW50IGZvciBkaWZmZXJlbnQgbm9kZSB0eXBlcy5cbiAqXG4gKiBAcGFyYW0gTiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSBub2RlIGluIHF1ZXN0aW9uLCBuYXJyb3dlZCBhY2NvcmRpbmdseS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBsZXRpb25CdWlsZGVyPE4gZXh0ZW5kcyBUbXBsQXN0Tm9kZXxBU1Q+IHtcbiAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHByaXZhdGUgcmVhZG9ubHkgbm9kZTogTixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbm9kZUNvbnRleHQ6IENvbXBsZXRpb25Ob2RlQ29udGV4dCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbm9kZVBhcmVudDogVG1wbEFzdE5vZGV8QVNUfG51bGwsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGV8bnVsbCkge31cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRUYWdDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRUYWdDb21wbGV0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzUGlwZUNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UGlwZUNvbXBsZXRpb25zKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFuYWxvZ3VlIGZvciBgdHMuTGFuZ3VhZ2VTZXJ2aWNlLmdldENvbXBsZXRpb25FbnRyeURldGFpbHNgLlxuICAgKi9cbiAgZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgIGVudHJ5TmFtZTogc3RyaW5nLCBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRUYWdDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRUYWdDb21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2xgLlxuICAgKi9cbiAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKG5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRUYWdDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRUYWdDb21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgbm9kZSBpcyB0aGUgY29tcGxldGlvbiBvZiBhIHByb3BlcnR5IGV4cHJlc3Npb24sIGFuZCBuYXJyb3cgdGhlIHR5cGVcbiAgICogb2YgYHRoaXMubm9kZWAgaWYgc28uXG4gICAqXG4gICAqIFRoaXMgbmFycm93aW5nIGdpdmVzIGFjY2VzcyB0byBhZGRpdGlvbmFsIG1ldGhvZHMgcmVsYXRlZCB0byBjb21wbGV0aW9uIG9mIHByb3BlcnR5XG4gICAqIGV4cHJlc3Npb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBpc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24odGhpczogQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdE5vZGV8QVNUPik6XG4gICAgICB0aGlzIGlzIFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlIGluc3RhbmNlb2YgUHJvcGVydHlSZWFkIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIE1ldGhvZENhbGwgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCB8fFxuICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fFxuICAgICAgICAvLyBCb3VuZEV2ZW50IG5vZGVzIG9ubHkgY291bnQgYXMgcHJvcGVydHkgY29tcGxldGlvbnMgaWYgaW4gYW4gRXZlbnRWYWx1ZSBjb250ZXh0LlxuICAgICAgICAodGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCAmJiB0aGlzLm5vZGVDb250ZXh0ID09PSBDb21wbGV0aW9uTm9kZUNvbnRleHQuRXZlbnRWYWx1ZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbXBsZXRpb25zIGZvciBwcm9wZXJ0eSBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLFxuICAgICAgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCB0c1Jlc3VsdHMgPSB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgICAgIGxvY2F0aW9uLnNoaW1QYXRoLCBsb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGUsIG9wdGlvbnMpO1xuICAgICAgaWYgKHRzUmVzdWx0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tQXN0KHRoaXMubm9kZSk7XG5cbiAgICAgIGxldCBuZ1Jlc3VsdHM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiB0c1Jlc3VsdHMuZW50cmllcykge1xuICAgICAgICBuZ1Jlc3VsdHMucHVzaCh7XG4gICAgICAgICAgLi4ucmVzdWx0LFxuICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi50c1Jlc3VsdHMsXG4gICAgICAgIGVudHJpZXM6IG5nUmVzdWx0cyxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGV0YWlscyBvZiBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcsXG4gICAgICBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgbGV0IGRldGFpbHM6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCB8fFxuICAgICAgICB0aGlzLm5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICBkZXRhaWxzID1cbiAgICAgICAgICB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5ub2RlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGRldGFpbHMgPSB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgICAgICBsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlLCBlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsXG4gICAgICAgICAgLyogc291cmNlICovIHVuZGVmaW5lZCwgcHJlZmVyZW5jZXMpO1xuICAgIH1cbiAgICBpZiAoZGV0YWlscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZXRhaWxzLmRpc3BsYXlQYXJ0cyA9IGZpbHRlckFsaWFzSW1wb3J0cyhkZXRhaWxzLmRpc3BsYXlQYXJ0cyk7XG4gICAgfVxuICAgIHJldHVybiBkZXRhaWxzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgZm9yIGEgc3BlY2lmaWMgY29tcGxldGlvbiBmb3IgYSBwcm9wZXJ0eSBleHByZXNzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uU3ltYm9sKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIG5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgTGl0ZXJhbFByaW1pdGl2ZSB8fFxuICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCb3VuZEV2ZW50IHx8IHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2wobmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgICAgICB0aGlzLm5vZGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudHNMUy5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgbmFtZSwgLyogc291cmNlICovIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb21wbGV0aW9ucyBmb3IgYSBwcm9wZXJ0eSBleHByZXNzaW9uIGluIGEgZ2xvYmFsIGNvbnRleHQgKGUuZy4gYHt7eXx9fWApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsXG4gICAgICBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfFxuICAgICAgdW5kZWZpbmVkKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zID1cbiAgICAgICAgdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldEdsb2JhbENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge2NvbXBvbmVudENvbnRleHQsIHRlbXBsYXRlQ29udGV4dH0gPSBjb21wbGV0aW9ucztcblxuICAgIGxldCByZXBsYWNlbWVudFNwYW46IHRzLlRleHRTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAvLyBOb24tZW1wdHkgbm9kZXMgZ2V0IHJlcGxhY2VkIHdpdGggdGhlIGNvbXBsZXRpb24uXG4gICAgaWYgKCEodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCb3VuZEV2ZW50KSkge1xuICAgICAgcmVwbGFjZW1lbnRTcGFuID0gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21Bc3QodGhpcy5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBUUyBjb21wbGV0aW9uIHJlc3VsdHMgd2l0aCByZXN1bHRzIGZyb20gdGhlIHRlbXBsYXRlIHNjb3BlLlxuICAgIGxldCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICAgIGNvbnN0IHRzTHNDb21wbGV0aW9ucyA9IHRoaXMudHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICAgIGNvbXBvbmVudENvbnRleHQuc2hpbVBhdGgsIGNvbXBvbmVudENvbnRleHQucG9zaXRpb25JblNoaW1GaWxlLCBvcHRpb25zKTtcbiAgICBpZiAodHNMc0NvbXBsZXRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAoY29uc3QgdHNDb21wbGV0aW9uIG9mIHRzTHNDb21wbGV0aW9ucy5lbnRyaWVzKSB7XG4gICAgICAgIC8vIFNraXAgY29tcGxldGlvbnMgdGhhdCBhcmUgc2hhZG93ZWQgYnkgYSB0ZW1wbGF0ZSBlbnRpdHkgZGVmaW5pdGlvbi5cbiAgICAgICAgaWYgKHRlbXBsYXRlQ29udGV4dC5oYXModHNDb21wbGV0aW9uLm5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICAuLi50c0NvbXBsZXRpb24sXG4gICAgICAgICAgLy8gU3Vic3RpdHV0ZSB0aGUgVFMgY29tcGxldGlvbidzIGByZXBsYWNlbWVudFNwYW5gICh3aGljaCB1c2VzIG9mZnNldHMgd2l0aGluIHRoZSBUQ0IpXG4gICAgICAgICAgLy8gd2l0aCB0aGUgYHJlcGxhY2VtZW50U3BhbmAgd2l0aGluIHRoZSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBlbnRpdHldIG9mIHRlbXBsYXRlQ29udGV4dCkge1xuICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChcbiAgICAgICAgICAgIGVudGl0eS5raW5kID09PSBDb21wbGV0aW9uS2luZC5SZWZlcmVuY2UgPyBEaXNwbGF5SW5mb0tpbmQuUkVGRVJFTkNFIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEaXNwbGF5SW5mb0tpbmQuVkFSSUFCTEUpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICAvLyBBbHRob3VnaCB0aGlzIGNvbXBsZXRpb24gaXMgXCJnbG9iYWxcIiBpbiB0aGUgc2Vuc2Ugb2YgYW4gQW5ndWxhciBleHByZXNzaW9uICh0aGVyZSBpcyBub1xuICAgICAgLy8gZXhwbGljaXQgcmVjZWl2ZXIpLCBpdCBpcyBub3QgXCJnbG9iYWxcIiBpbiBhIFR5cGVTY3JpcHQgc2Vuc2Ugc2luY2UgQW5ndWxhciBleHByZXNzaW9ucyBoYXZlXG4gICAgICAvLyB0aGUgY29tcG9uZW50IGFzIGFuIGltcGxpY2l0IHJlY2VpdmVyLlxuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogdHJ1ZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGV0YWlscyBvZiBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbiBpbiBhIGdsb2JhbCBjb250ZXh0IChlLmcuXG4gICAqIGB7e3l8fX1gKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcsXG4gICAgICBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGxldGlvbnMgPVxuICAgICAgICB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0R2xvYmFsQ29tcGxldGlvbnModGhpcy50ZW1wbGF0ZSwgdGhpcy5jb21wb25lbnQpO1xuICAgIGlmIChjb21wbGV0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qge2NvbXBvbmVudENvbnRleHQsIHRlbXBsYXRlQ29udGV4dH0gPSBjb21wbGV0aW9ucztcblxuICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIGNvbnN0IGVudHJ5ID0gdGVtcGxhdGVDb250ZXh0LmdldChlbnRyeU5hbWUpITtcbiAgICAgIC8vIEVudHJpZXMgdGhhdCByZWZlcmVuY2UgYSBzeW1ib2wgaW4gdGhlIHRlbXBsYXRlIGNvbnRleHQgcmVmZXIgZWl0aGVyIHRvIGxvY2FsIHJlZmVyZW5jZXMgb3JcbiAgICAgIC8vIHZhcmlhYmxlcy5cbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRTeW1ib2xPZk5vZGUoZW50cnkubm9kZSwgdGhpcy5jb21wb25lbnQpIGFzXG4gICAgICAgICAgICAgIFRlbXBsYXRlRGVjbGFyYXRpb25TeW1ib2wgfFxuICAgICAgICAgIG51bGw7XG4gICAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtraW5kLCBkaXNwbGF5UGFydHMsIGRvY3VtZW50YXRpb259ID1cbiAgICAgICAgICBnZXRTeW1ib2xEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIHRoaXMudHlwZUNoZWNrZXIsIHN5bWJvbCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChraW5kKSxcbiAgICAgICAgbmFtZTogZW50cnlOYW1lLFxuICAgICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICAgIGRpc3BsYXlQYXJ0cyxcbiAgICAgICAgZG9jdW1lbnRhdGlvbixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBgdHMuU3ltYm9sYCBvZiBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbiBpbiBhIGdsb2JhbCBjb250ZXh0XG4gICAqIChlLmcuXG4gICAqIGB7e3l8fX1gKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBlbnRyeU5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zID1cbiAgICAgICAgdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldEdsb2JhbENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG4gICAgaWYgKHRlbXBsYXRlQ29udGV4dC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgY29uc3Qgbm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUgPSB0ZW1wbGF0ZUNvbnRleHQuZ2V0KGVudHJ5TmFtZSkhLm5vZGU7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzeW1ib2wudHNTeW1ib2w7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGNvbXBvbmVudENvbnRleHQuc2hpbVBhdGgsIGNvbXBvbmVudENvbnRleHQucG9zaXRpb25JblNoaW1GaWxlLCBlbnRyeU5hbWUsXG4gICAgICAgICAgLyogc291cmNlICovIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpc0VsZW1lbnRUYWdDb21wbGV0aW9uKCk6IHRoaXMgaXMgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgJiZcbiAgICAgICAgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRUYWc7XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRUYWdDb21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50Pik6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gICAgLy8gVGhlIHJlcGxhY2VtZW50U3BhbiBpcyB0aGUgdGFnIG5hbWUuXG4gICAgY29uc3QgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3BhbiA9IHtcbiAgICAgIHN0YXJ0OiB0aGlzLm5vZGUuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyAxLCAgLy8gYWNjb3VudCBmb3IgbGVhZGluZyAnPCdcbiAgICAgIGxlbmd0aDogdGhpcy5ub2RlLm5hbWUubGVuZ3RoLFxuICAgIH07XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9XG4gICAgICAgIEFycmF5LmZyb20odGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQb3RlbnRpYWxFbGVtZW50VGFncyh0aGlzLmNvbXBvbmVudCkpXG4gICAgICAgICAgICAubWFwKChbdGFnLCBkaXJlY3RpdmVdKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgIGtpbmQ6IHRhZ0NvbXBsZXRpb25LaW5kKGRpcmVjdGl2ZSksXG4gICAgICAgICAgICAgICAgICAgbmFtZTogdGFnLFxuICAgICAgICAgICAgICAgICAgIHNvcnRUZXh0OiB0YWcsXG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cmllcyxcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRUYWdDb21wbGV0aW9uRGV0YWlscyhcbiAgICAgIHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50PiwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCB0YWdNYXAgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBvdGVudGlhbEVsZW1lbnRUYWdzKHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoIXRhZ01hcC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmUgPSB0YWdNYXAuZ2V0KGVudHJ5TmFtZSkhO1xuICAgIGxldCBkaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W107XG4gICAgbGV0IGRvY3VtZW50YXRpb246IHRzLlN5bWJvbERpc3BsYXlQYXJ0W118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChkaXJlY3RpdmUgPT09IG51bGwpIHtcbiAgICAgIGRpc3BsYXlQYXJ0cyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkaXNwbGF5SW5mbyA9IGdldERpcmVjdGl2ZURpc3BsYXlJbmZvKHRoaXMudHNMUywgZGlyZWN0aXZlKTtcbiAgICAgIGRpc3BsYXlQYXJ0cyA9IGRpc3BsYXlJbmZvLmRpc3BsYXlQYXJ0cztcbiAgICAgIGRvY3VtZW50YXRpb24gPSBkaXNwbGF5SW5mby5kb2N1bWVudGF0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOiB0YWdDb21wbGV0aW9uS2luZChkaXJlY3RpdmUpLFxuICAgICAgbmFtZTogZW50cnlOYW1lLFxuICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgZGlzcGxheVBhcnRzLFxuICAgICAgZG9jdW1lbnRhdGlvbixcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvblN5bWJvbCh0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudD4sIGVudHJ5TmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICAgIGNvbnN0IHRhZ01hcCA9IHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0UG90ZW50aWFsRWxlbWVudFRhZ3ModGhpcy5jb21wb25lbnQpO1xuICAgIGlmICghdGFnTWFwLmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRhZ01hcC5nZXQoZW50cnlOYW1lKSE7XG4gICAgcmV0dXJuIGRpcmVjdGl2ZT8udHNTeW1ib2w7XG4gIH1cblxuICBwcml2YXRlIGlzRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb24oKTogdGhpcyBpcyBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIge1xuICAgIHJldHVybiAodGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXkgfHxcbiAgICAgICAgICAgIHRoaXMubm9kZUNvbnRleHQgPT09IENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ud29XYXlCaW5kaW5nKSAmJlxuICAgICAgICAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8XG4gICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCk7XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0aGlzOiBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGxldCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGU7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZVBhcmVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90aGluZyB0byBkbyB3aXRob3V0IGFuIGVsZW1lbnQgdG8gcHJvY2Vzcy5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IHJlcGxhY2VtZW50U3BhbjogdHMuVGV4dFNwYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICgodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50IHx8XG4gICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiZcbiAgICAgICAgdGhpcy5ub2RlLmtleVNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVwbGFjZW1lbnRTcGFuID0gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21QYXJzZVNvdXJjZVNwYW4odGhpcy5ub2RlLmtleVNwYW4pO1xuICAgIH1cblxuICAgIGNvbnN0IGF0dHJUYWJsZSA9IGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlKFxuICAgICAgICB0aGlzLmNvbXBvbmVudCwgZWxlbWVudCwgdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkpO1xuXG4gICAgbGV0IGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGNvbXBsZXRpb24gb2YgYXR0clRhYmxlLnZhbHVlcygpKSB7XG4gICAgICAvLyBGaXJzdCwgZmlsdGVyIG91dCBjb21wbGV0aW9ucyB0aGF0IGRvbid0IG1ha2Ugc2Vuc2UgZm9yIHRoZSBjdXJyZW50IG5vZGUuIEZvciBleGFtcGxlLCBpZlxuICAgICAgLy8gdGhlIHVzZXIgaXMgY29tcGxldGluZyBvbiBhIHByb3BlcnR5IGJpbmRpbmcgYFtmb298XWAsIGRvbid0IG9mZmVyIG91dHB1dCBldmVudFxuICAgICAgLy8gY29tcGxldGlvbnMuXG4gICAgICBzd2l0Y2ggKGNvbXBsZXRpb24ua2luZCkge1xuICAgICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbUF0dHJpYnV0ZTpcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21Qcm9wZXJ0eTpcbiAgICAgICAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dDpcbiAgICAgICAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWNvbXBsZXRpb24udHdvV2F5QmluZGluZ1N1cHBvcnRlZCAmJlxuICAgICAgICAgICAgICB0aGlzLm5vZGVDb250ZXh0ID09PSBDb21wbGV0aW9uTm9kZUNvbnRleHQuVHdvV2F5QmluZGluZykge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZU91dHB1dDpcbiAgICAgICAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlQXR0cmlidXRlOlxuICAgICAgICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHxcbiAgICAgICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gSXMgdGhlIGNvbXBsZXRpb24gaW4gYW4gYXR0cmlidXRlIGNvbnRleHQgKGluc3RlYWQgb2YgYSBwcm9wZXJ0eSBjb250ZXh0KT9cbiAgICAgIGNvbnN0IGlzQXR0cmlidXRlQ29udGV4dCA9XG4gICAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKTtcbiAgICAgIC8vIElzIHRoZSBjb21wbGV0aW9uIGZvciBhbiBlbGVtZW50IChub3QgYW4gPG5nLXRlbXBsYXRlPik/XG4gICAgICBjb25zdCBpc0VsZW1lbnRDb250ZXh0ID1cbiAgICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudDtcbiAgICAgIGFkZEF0dHJpYnV0ZUNvbXBsZXRpb25FbnRyaWVzKFxuICAgICAgICAgIGVudHJpZXMsIGNvbXBsZXRpb24sIGlzQXR0cmlidXRlQ29udGV4dCwgaXNFbGVtZW50Q29udGV4dCwgcmVwbGFjZW1lbnRTcGFuKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cmllcyxcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IHRydWUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyLCBlbnRyeU5hbWU6IHN0cmluZyk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHNcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIC8vIGBlbnRyeU5hbWVgIGhlcmUgbWF5IGJlIGBmb29gIG9yIGBbZm9vXWAsIGRlcGVuZGluZyBvbiB3aGljaCBzdWdnZXN0ZWQgY29tcGxldGlvbiB0aGUgdXNlclxuICAgIC8vIGNob3NlLiBTdHJpcCBvZmYgYW55IGJpbmRpbmcgc3ludGF4IHRvIGdldCB0aGUgcmVhbCBhdHRyaWJ1dGUgbmFtZS5cbiAgICBjb25zdCB7bmFtZSwga2luZH0gPSBzdHJpcEJpbmRpbmdTdWdhcihlbnRyeU5hbWUpO1xuXG4gICAgbGV0IGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZTtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZVBhcmVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90aGluZyB0byBkbyB3aXRob3V0IGFuIGVsZW1lbnQgdG8gcHJvY2Vzcy5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgYXR0clRhYmxlID0gYnVpbGRBdHRyaWJ1dGVDb21wbGV0aW9uVGFibGUoXG4gICAgICAgIHRoaXMuY29tcG9uZW50LCBlbGVtZW50LCB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKSk7XG5cbiAgICBpZiAoIWF0dHJUYWJsZS5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF0dHJUYWJsZS5nZXQobmFtZSkhO1xuICAgIGxldCBkaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W107XG4gICAgbGV0IGRvY3VtZW50YXRpb246IHRzLlN5bWJvbERpc3BsYXlQYXJ0W118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBpbmZvOiBEaXNwbGF5SW5mb3xudWxsO1xuICAgIHN3aXRjaCAoY29tcGxldGlvbi5raW5kKSB7XG4gICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbUF0dHJpYnV0ZTpcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tUHJvcGVydHk6XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogaWRlYWxseSB3ZSB3b3VsZCBzaG93IHRoZSBzYW1lIGRvY3VtZW50YXRpb24gYXMgcXVpY2sgaW5mbyBoZXJlLiBIb3dldmVyLFxuICAgICAgICAvLyBzaW5jZSB0aGVzZSBiaW5kaW5ncyBkb24ndCBleGlzdCBpbiB0aGUgVENCLCB0aGVyZSBpcyBubyBzdHJhaWdodGZvcndhcmQgd2F5IHRvIHJldHJpZXZlXG4gICAgICAgIC8vIGEgYHRzLlN5bWJvbGAgZm9yIHRoZSBmaWVsZCBpbiB0aGUgVFMgRE9NIGRlZmluaXRpb24uXG4gICAgICAgIGRpc3BsYXlQYXJ0cyA9IFtdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlQXR0cmlidXRlOlxuICAgICAgICBpbmZvID0gZ2V0RGlyZWN0aXZlRGlzcGxheUluZm8odGhpcy50c0xTLCBjb21wbGV0aW9uLmRpcmVjdGl2ZSk7XG4gICAgICAgIGRpc3BsYXlQYXJ0cyA9IGluZm8uZGlzcGxheVBhcnRzO1xuICAgICAgICBkb2N1bWVudGF0aW9uID0gaW5mby5kb2N1bWVudGF0aW9uO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlSW5wdXQ6XG4gICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZU91dHB1dDpcbiAgICAgICAgY29uc3QgcHJvcGVydHlTeW1ib2wgPSBnZXRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sKGNvbXBsZXRpb24sIHRoaXMudHlwZUNoZWNrZXIpO1xuICAgICAgICBpZiAocHJvcGVydHlTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5mbyA9IGdldFRzU3ltYm9sRGlzcGxheUluZm8oXG4gICAgICAgICAgICB0aGlzLnRzTFMsIHRoaXMudHlwZUNoZWNrZXIsIHByb3BlcnR5U3ltYm9sLFxuICAgICAgICAgICAgY29tcGxldGlvbi5raW5kID09PSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dCA/IERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGlzcGxheUluZm9LaW5kLkVWRU5ULFxuICAgICAgICAgICAgY29tcGxldGlvbi5kaXJlY3RpdmUudHNTeW1ib2wubmFtZSk7XG4gICAgICAgIGlmIChpbmZvID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBkaXNwbGF5UGFydHMgPSBpbmZvLmRpc3BsYXlQYXJ0cztcbiAgICAgICAgZG9jdW1lbnRhdGlvbiA9IGluZm8uZG9jdW1lbnRhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZW50cnlOYW1lLFxuICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICBkaXNwbGF5UGFydHM6IFtdLFxuICAgICAgZG9jdW1lbnRhdGlvbixcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlciwgYXR0cmlidXRlOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB7bmFtZX0gPSBzdHJpcEJpbmRpbmdTdWdhcihhdHRyaWJ1dGUpO1xuXG4gICAgbGV0IGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZTtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZVBhcmVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90aGluZyB0byBkbyB3aXRob3V0IGFuIGVsZW1lbnQgdG8gcHJvY2Vzcy5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgYXR0clRhYmxlID0gYnVpbGRBdHRyaWJ1dGVDb21wbGV0aW9uVGFibGUoXG4gICAgICAgIHRoaXMuY29tcG9uZW50LCBlbGVtZW50LCB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKSk7XG5cbiAgICBpZiAoIWF0dHJUYWJsZS5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGxldGlvbiA9IGF0dHJUYWJsZS5nZXQobmFtZSkhO1xuICAgIHJldHVybiBnZXRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sKGNvbXBsZXRpb24sIHRoaXMudHlwZUNoZWNrZXIpID8/IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgaXNQaXBlQ29tcGxldGlvbigpOiB0aGlzIGlzIFBpcGVDb21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRQaXBlQ29tcGxldGlvbnModGhpczogUGlwZUNvbXBsZXRpb25CdWlsZGVyKTpcbiAgICAgIHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwaXBlcyA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQaXBlc0luU2NvcGUodGhpcy5jb21wb25lbnQpO1xuICAgIGlmIChwaXBlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgY29uc3QgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPVxuICAgICAgICBwaXBlcy5tYXAocGlwZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBwaXBlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNvcnRUZXh0OiBwaXBlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5QSVBFKSxcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbVBhcnNlU291cmNlU3BhbihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiB0cy5UZXh0U3BhbiB7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgIGxlbmd0aDogc3Bhbi5lbmQub2Zmc2V0IC0gc3Bhbi5zdGFydC5vZmZzZXQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tQXN0KG5vZGU6IFByb3BlcnR5UmVhZHxQcm9wZXJ0eVdyaXRlfE1ldGhvZENhbGx8U2FmZVByb3BlcnR5UmVhZHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNhZmVNZXRob2RDYWxsfEJpbmRpbmdQaXBlKTogdHMuVGV4dFNwYW4ge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogbm9kZS5uYW1lU3Bhbi5lbmQgLSBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICB9O1xufVxuXG5mdW5jdGlvbiB0YWdDb21wbGV0aW9uS2luZChkaXJlY3RpdmU6IERpcmVjdGl2ZUluU2NvcGV8bnVsbCk6IHRzLlNjcmlwdEVsZW1lbnRLaW5kIHtcbiAgbGV0IGtpbmQ6IERpc3BsYXlJbmZvS2luZDtcbiAgaWYgKGRpcmVjdGl2ZSA9PT0gbnVsbCkge1xuICAgIGtpbmQgPSBEaXNwbGF5SW5mb0tpbmQuRUxFTUVOVDtcbiAgfSBlbHNlIGlmIChkaXJlY3RpdmUuaXNDb21wb25lbnQpIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLkNPTVBPTkVOVDtcbiAgfSBlbHNlIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLkRJUkVDVElWRTtcbiAgfVxuICByZXR1cm4gdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCk7XG59XG5cbmNvbnN0IEJJTkRJTkdfU1VHQVIgPSAvW1xcW1xcKFxcKVxcXV0vZztcblxuZnVuY3Rpb24gc3RyaXBCaW5kaW5nU3VnYXIoYmluZGluZzogc3RyaW5nKToge25hbWU6IHN0cmluZywga2luZDogRGlzcGxheUluZm9LaW5kfSB7XG4gIGNvbnN0IG5hbWUgPSBiaW5kaW5nLnJlcGxhY2UoQklORElOR19TVUdBUiwgJycpO1xuICBpZiAoYmluZGluZy5zdGFydHNXaXRoKCdbJykpIHtcbiAgICByZXR1cm4ge25hbWUsIGtpbmQ6IERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWX07XG4gIH0gZWxzZSBpZiAoYmluZGluZy5zdGFydHNXaXRoKCcoJykpIHtcbiAgICByZXR1cm4ge25hbWUsIGtpbmQ6IERpc3BsYXlJbmZvS2luZC5FVkVOVH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtuYW1lLCBraW5kOiBEaXNwbGF5SW5mb0tpbmQuQVRUUklCVVRFfTtcbiAgfVxufVxuIl19