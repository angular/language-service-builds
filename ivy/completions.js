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
            var replacementSpan = makeReplacementSpanFromAst(this.node);
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
        if ((node instanceof compiler_1.EmptyExpr || node instanceof compiler_1.LiteralPrimitive ||
            node instanceof r3_ast_1.BoundEvent)) {
            // empty nodes do not replace any existing text
            return undefined;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStVO0lBRS9VLHFFQUEwSDtJQUMxSCwrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZGQUE0SjtJQUM1Siw2RUFBa0w7SUFDbEwsNkRBQTJDO0lBVzNDLElBQVkscUJBT1g7SUFQRCxXQUFZLHFCQUFxQjtRQUMvQixpRUFBSSxDQUFBO1FBQ0osNkVBQVUsQ0FBQTtRQUNWLCtGQUFtQixDQUFBO1FBQ25CLG1HQUFxQixDQUFBO1FBQ3JCLDZFQUFVLENBQUE7UUFDVixtRkFBYSxDQUFBO0lBQ2YsQ0FBQyxFQVBXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBT2hDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBSUUsMkJBQ3FCLElBQXdCLEVBQW1CLFFBQW9CLEVBQy9ELFNBQThCLEVBQW1CLElBQU8sRUFDeEQsV0FBa0MsRUFDbEMsVUFBZ0MsRUFDaEMsUUFBOEI7WUFKOUIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUMvRCxjQUFTLEdBQVQsU0FBUyxDQUFxQjtZQUFtQixTQUFJLEdBQUosSUFBSSxDQUFHO1lBQ3hELGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtZQUNsQyxlQUFVLEdBQVYsVUFBVSxDQUFzQjtZQUNoQyxhQUFRLEdBQVIsUUFBUSxDQUFzQjtZQVJsQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDOUQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBT3hCLENBQUM7UUFFdkQ7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Q29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJpbmRpbmdQaXBlLCBFbXB0eUV4cHIsIEltcGxpY2l0UmVjZWl2ZXIsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7Q29tcGxldGlvbktpbmQsIERpcmVjdGl2ZUluU2NvcGUsIFRlbXBsYXRlRGVjbGFyYXRpb25TeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0JvdW5kRXZlbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthZGRBdHRyaWJ1dGVDb21wbGV0aW9uRW50cmllcywgQXR0cmlidXRlQ29tcGxldGlvbktpbmQsIGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlLCBnZXRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sfSBmcm9tICcuL2F0dHJpYnV0ZV9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0Rpc3BsYXlJbmZvLCBEaXNwbGF5SW5mb0tpbmQsIGdldERpcmVjdGl2ZURpc3BsYXlJbmZvLCBnZXRTeW1ib2xEaXNwbGF5SW5mbywgZ2V0VHNTeW1ib2xEaXNwbGF5SW5mbywgdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmR9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge2ZpbHRlckFsaWFzSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbnR5cGUgUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIgPVxuICAgIENvbXBsZXRpb25CdWlsZGVyPFByb3BlcnR5UmVhZHxQcm9wZXJ0eVdyaXRlfE1ldGhvZENhbGx8RW1wdHlFeHByfFNhZmVQcm9wZXJ0eVJlYWR8XG4gICAgICAgICAgICAgICAgICAgICAgU2FmZU1ldGhvZENhbGx8VG1wbEFzdEJvdW5kRXZlbnQ+O1xuXG50eXBlIEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlciA9XG4gICAgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlfFRtcGxBc3RCb3VuZEV2ZW50PjtcblxudHlwZSBQaXBlQ29tcGxldGlvbkJ1aWxkZXIgPSBDb21wbGV0aW9uQnVpbGRlcjxCaW5kaW5nUGlwZT47XG5cbmV4cG9ydCBlbnVtIENvbXBsZXRpb25Ob2RlQ29udGV4dCB7XG4gIE5vbmUsXG4gIEVsZW1lbnRUYWcsXG4gIEVsZW1lbnRBdHRyaWJ1dGVLZXksXG4gIEVsZW1lbnRBdHRyaWJ1dGVWYWx1ZSxcbiAgRXZlbnRWYWx1ZSxcbiAgVHdvV2F5QmluZGluZyxcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhdXRvY29tcGxldGlvbiBvcGVyYXRpb25zIG9uIGEgZ2l2ZW4gbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gKlxuICogVGhpcyBjbGFzcyBhY3RzIGFzIGEgY2xvc3VyZSBhcm91bmQgYWxsIG9mIHRoZSBjb250ZXh0IHJlcXVpcmVkIHRvIHBlcmZvcm0gdGhlIDMgYXV0b2NvbXBsZXRpb25cbiAqIG9wZXJhdGlvbnMgKGNvbXBsZXRpb25zLCBnZXQgZGV0YWlscywgYW5kIGdldCBzeW1ib2wpIGF0IGEgc3BlY2lmaWMgbm9kZS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBgTmAgdHlwZSBmb3IgdGhlIHRlbXBsYXRlIG5vZGUgaXMgbmFycm93ZWQgaW50ZXJuYWxseSBmb3IgY2VydGFpbiBvcGVyYXRpb25zLCBhcyB0aGVcbiAqIGNvbXBpbGVyIG9wZXJhdGlvbnMgcmVxdWlyZWQgdG8gaW1wbGVtZW50IGNvbXBsZXRpb24gbWF5IGJlIGRpZmZlcmVudCBmb3IgZGlmZmVyZW50IG5vZGUgdHlwZXMuXG4gKlxuICogQHBhcmFtIE4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgbm9kZSBpbiBxdWVzdGlvbiwgbmFycm93ZWQgYWNjb3JkaW5nbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uQnVpbGRlcjxOIGV4dGVuZHMgVG1wbEFzdE5vZGV8QVNUPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IE4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVDb250ZXh0OiBDb21wbGV0aW9uTm9kZUNvbnRleHQsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVQYXJlbnQ6IFRtcGxBc3ROb2RlfEFTVHxudWxsLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlfG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIEFuYWxvZ3VlIGZvciBgdHMuTGFuZ3VhZ2VTZXJ2aWNlLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbmAuXG4gICAqL1xuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc1BpcGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFBpcGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBlbnRyeU5hbWU6IHN0cmluZywgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IG5vZGUgaXMgdGhlIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBleHByZXNzaW9uLCBhbmQgbmFycm93IHRoZSB0eXBlXG4gICAqIG9mIGB0aGlzLm5vZGVgIGlmIHNvLlxuICAgKlxuICAgKiBUaGlzIG5hcnJvd2luZyBnaXZlcyBhY2Nlc3MgdG8gYWRkaXRpb25hbCBtZXRob2RzIHJlbGF0ZWQgdG8gY29tcGxldGlvbiBvZiBwcm9wZXJ0eVxuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD4pOlxuICAgICAgdGhpcyBpcyBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8XG4gICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHxcbiAgICAgICAgLy8gQm91bmRFdmVudCBub2RlcyBvbmx5IGNvdW50IGFzIHByb3BlcnR5IGNvbXBsZXRpb25zIGlmIGluIGFuIEV2ZW50VmFsdWUgY29udGV4dC5cbiAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgJiYgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkV2ZW50VmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb21wbGV0aW9ucyBmb3IgcHJvcGVydHkgZXhwcmVzc2lvbnMuXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCb3VuZEV2ZW50IHx8XG4gICAgICAgIHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgICAgICB0aGlzLm5vZGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNSZXN1bHRzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgICAgICBsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlLCBvcHRpb25zKTtcbiAgICAgIGlmICh0c1Jlc3VsdHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgICBsZXQgbmdSZXN1bHRzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgdHNSZXN1bHRzLmVudHJpZXMpIHtcbiAgICAgICAgbmdSZXN1bHRzLnB1c2goe1xuICAgICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udHNSZXN1bHRzLFxuICAgICAgICBlbnRyaWVzOiBuZ1Jlc3VsdHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGxldCBkZXRhaWxzOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgZGV0YWlscyA9XG4gICAgICAgICAgdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkZXRhaWxzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gICAgaWYgKGRldGFpbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZGV0YWlscy5kaXNwbGF5UGFydHMgPSBmaWx0ZXJBbGlhc0ltcG9ydHMoZGV0YWlscy5kaXNwbGF5UGFydHMpO1xuICAgIH1cbiAgICByZXR1cm4gZGV0YWlscztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5TeW1ib2xgIGZvciBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCB8fCB0aGlzLm5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5ub2RlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGxvY2F0aW9uLnNoaW1QYXRoLCBsb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGUsIG5hbWUsIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29tcGxldGlvbnMgZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbiBpbiBhIGdsb2JhbCBjb250ZXh0IChlLmcuIGB7e3l8fX1gKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLFxuICAgICAgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgLy8gTWVyZ2UgVFMgY29tcGxldGlvbiByZXN1bHRzIHdpdGggcmVzdWx0cyBmcm9tIHRoZSB0ZW1wbGF0ZSBzY29wZS5cbiAgICBsZXQgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgICBjb25zdCB0c0xzQ29tcGxldGlvbnMgPSB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgb3B0aW9ucyk7XG4gICAgaWYgKHRzTHNDb21wbGV0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IHRzQ29tcGxldGlvbiBvZiB0c0xzQ29tcGxldGlvbnMuZW50cmllcykge1xuICAgICAgICAvLyBTa2lwIGNvbXBsZXRpb25zIHRoYXQgYXJlIHNoYWRvd2VkIGJ5IGEgdGVtcGxhdGUgZW50aXR5IGRlZmluaXRpb24uXG4gICAgICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKHRzQ29tcGxldGlvbi5uYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgICAgLi4udHNDb21wbGV0aW9uLFxuICAgICAgICAgIC8vIFN1YnN0aXR1dGUgdGhlIFRTIGNvbXBsZXRpb24ncyBgcmVwbGFjZW1lbnRTcGFuYCAod2hpY2ggdXNlcyBvZmZzZXRzIHdpdGhpbiB0aGUgVENCKVxuICAgICAgICAgIC8vIHdpdGggdGhlIGByZXBsYWNlbWVudFNwYW5gIHdpdGhpbiB0aGUgdGVtcGxhdGUgc291cmNlLlxuICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZW50aXR5XSBvZiB0ZW1wbGF0ZUNvbnRleHQpIHtcbiAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoXG4gICAgICAgICAgICBlbnRpdHkua2luZCA9PT0gQ29tcGxldGlvbktpbmQuUmVmZXJlbmNlID8gRGlzcGxheUluZm9LaW5kLlJFRkVSRU5DRSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGlzcGxheUluZm9LaW5kLlZBUklBQkxFKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgLy8gQWx0aG91Z2ggdGhpcyBjb21wbGV0aW9uIGlzIFwiZ2xvYmFsXCIgaW4gdGhlIHNlbnNlIG9mIGFuIEFuZ3VsYXIgZXhwcmVzc2lvbiAodGhlcmUgaXMgbm9cbiAgICAgIC8vIGV4cGxpY2l0IHJlY2VpdmVyKSwgaXQgaXMgbm90IFwiZ2xvYmFsXCIgaW4gYSBUeXBlU2NyaXB0IHNlbnNlIHNpbmNlIEFuZ3VsYXIgZXhwcmVzc2lvbnMgaGF2ZVxuICAgICAgLy8gdGhlIGNvbXBvbmVudCBhcyBhbiBpbXBsaWNpdCByZWNlaXZlci5cbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IHRydWUsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dCAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zID1cbiAgICAgICAgdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldEdsb2JhbENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBpZiAodGVtcGxhdGVDb250ZXh0LmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHRlbXBsYXRlQ29udGV4dC5nZXQoZW50cnlOYW1lKSE7XG4gICAgICAvLyBFbnRyaWVzIHRoYXQgcmVmZXJlbmNlIGEgc3ltYm9sIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHJlZmVyIGVpdGhlciB0byBsb2NhbCByZWZlcmVuY2VzIG9yXG4gICAgICAvLyB2YXJpYWJsZXMuXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKGVudHJ5Lm5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7a2luZCwgZGlzcGxheVBhcnRzLCBkb2N1bWVudGF0aW9ufSA9XG4gICAgICAgICAgZ2V0U3ltYm9sRGlzcGxheUluZm8odGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBzeW1ib2wpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dFxuICAgKiAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCB7Y29tcG9uZW50Q29udGV4dCwgdGVtcGxhdGVDb250ZXh0fSA9IGNvbXBsZXRpb25zO1xuICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIGNvbnN0IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlID0gdGVtcGxhdGVDb250ZXh0LmdldChlbnRyeU5hbWUpIS5ub2RlO1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFN5bWJvbE9mTm9kZShub2RlLCB0aGlzLmNvbXBvbmVudCkgYXNcbiAgICAgICAgICAgICAgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbCB8XG4gICAgICAgICAgbnVsbDtcbiAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3ltYm9sLnRzU3ltYm9sO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChcbiAgICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNFbGVtZW50VGFnQ29tcGxldGlvbigpOiB0aGlzIGlzIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50PiB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmXG4gICAgICAgIHRoaXMubm9kZUNvbnRleHQgPT09IENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50VGFnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvbih0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudD4pOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICAgIC8vIFRoZSByZXBsYWNlbWVudFNwYW4gaXMgdGhlIHRhZyBuYW1lLlxuICAgIGNvbnN0IHJlcGxhY2VtZW50U3BhbjogdHMuVGV4dFNwYW4gPSB7XG4gICAgICBzdGFydDogdGhpcy5ub2RlLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgMSwgIC8vIGFjY291bnQgZm9yIGxlYWRpbmcgJzwnXG4gICAgICBsZW5ndGg6IHRoaXMubm9kZS5uYW1lLmxlbmd0aCxcbiAgICB9O1xuXG4gICAgY29uc3QgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPVxuICAgICAgICBBcnJheS5mcm9tKHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0UG90ZW50aWFsRWxlbWVudFRhZ3ModGhpcy5jb21wb25lbnQpKVxuICAgICAgICAgICAgLm1hcCgoW3RhZywgZGlyZWN0aXZlXSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICBraW5kOiB0YWdDb21wbGV0aW9uS2luZChkaXJlY3RpdmUpLFxuICAgICAgICAgICAgICAgICAgIG5hbWU6IHRhZyxcbiAgICAgICAgICAgICAgICAgICBzb3J0VGV4dDogdGFnLFxuICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudD4sIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc1xuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgdGFnTWFwID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQb3RlbnRpYWxFbGVtZW50VGFncyh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKCF0YWdNYXAuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlID0gdGFnTWFwLmdldChlbnRyeU5hbWUpITtcbiAgICBsZXQgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdO1xuICAgIGxldCBkb2N1bWVudGF0aW9uOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoZGlyZWN0aXZlID09PSBudWxsKSB7XG4gICAgICBkaXNwbGF5UGFydHMgPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlzcGxheUluZm8gPSBnZXREaXJlY3RpdmVEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIGRpcmVjdGl2ZSk7XG4gICAgICBkaXNwbGF5UGFydHMgPSBkaXNwbGF5SW5mby5kaXNwbGF5UGFydHM7XG4gICAgICBkb2N1bWVudGF0aW9uID0gZGlzcGxheUluZm8uZG9jdW1lbnRhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogdGFnQ29tcGxldGlvbktpbmQoZGlyZWN0aXZlKSxcbiAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgIGRpc3BsYXlQYXJ0cyxcbiAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudFRhZ0NvbXBsZXRpb25TeW1ib2wodGhpczogQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnQ+LCBlbnRyeU5hbWU6IHN0cmluZyk6XG4gICAgICB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCB0YWdNYXAgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBvdGVudGlhbEVsZW1lbnRUYWdzKHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoIXRhZ01hcC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmUgPSB0YWdNYXAuZ2V0KGVudHJ5TmFtZSkhO1xuICAgIHJldHVybiBkaXJlY3RpdmU/LnRzU3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCk6IHRoaXMgaXMgRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyIHtcbiAgICByZXR1cm4gKHRoaXMubm9kZUNvbnRleHQgPT09IENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5IHx8XG4gICAgICAgICAgICB0aGlzLm5vZGVDb250ZXh0ID09PSBDb21wbGV0aW9uTm9kZUNvbnRleHQuVHdvV2F5QmluZGluZykgJiZcbiAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fFxuICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGhpczogRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyKTpcbiAgICAgIHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGVQYXJlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vdGhpbmcgdG8gZG8gd2l0aG91dCBhbiBlbGVtZW50IHRvIHByb2Nlc3MuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGxldCByZXBsYWNlbWVudFNwYW46IHRzLlRleHRTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCB8fFxuICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmXG4gICAgICAgIHRoaXMubm9kZS5rZXlTcGFuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tUGFyc2VTb3VyY2VTcGFuKHRoaXMubm9kZS5rZXlTcGFuKTtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGxldCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBjb21wbGV0aW9uIG9mIGF0dHJUYWJsZS52YWx1ZXMoKSkge1xuICAgICAgLy8gRmlyc3QsIGZpbHRlciBvdXQgY29tcGxldGlvbnMgdGhhdCBkb24ndCBtYWtlIHNlbnNlIGZvciB0aGUgY3VycmVudCBub2RlLiBGb3IgZXhhbXBsZSwgaWZcbiAgICAgIC8vIHRoZSB1c2VyIGlzIGNvbXBsZXRpbmcgb24gYSBwcm9wZXJ0eSBiaW5kaW5nIGBbZm9vfF1gLCBkb24ndCBvZmZlciBvdXRwdXQgZXZlbnRcbiAgICAgIC8vIGNvbXBsZXRpb25zLlxuICAgICAgc3dpdGNoIChjb21wbGV0aW9uLmtpbmQpIHtcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21BdHRyaWJ1dGU6XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tUHJvcGVydHk6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlSW5wdXQ6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFjb21wbGV0aW9uLnR3b1dheUJpbmRpbmdTdXBwb3J0ZWQgJiZcbiAgICAgICAgICAgICAgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LlR3b1dheUJpbmRpbmcpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVPdXRwdXQ6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUF0dHJpYnV0ZTpcbiAgICAgICAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8XG4gICAgICAgICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIElzIHRoZSBjb21wbGV0aW9uIGluIGFuIGF0dHJpYnV0ZSBjb250ZXh0IChpbnN0ZWFkIG9mIGEgcHJvcGVydHkgY29udGV4dCk/XG4gICAgICBjb25zdCBpc0F0dHJpYnV0ZUNvbnRleHQgPVxuICAgICAgICAgICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk7XG4gICAgICAvLyBJcyB0aGUgY29tcGxldGlvbiBmb3IgYW4gZWxlbWVudCAobm90IGFuIDxuZy10ZW1wbGF0ZT4pP1xuICAgICAgY29uc3QgaXNFbGVtZW50Q29udGV4dCA9XG4gICAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQ7XG4gICAgICBhZGRBdHRyaWJ1dGVDb21wbGV0aW9uRW50cmllcyhcbiAgICAgICAgICBlbnRyaWVzLCBjb21wbGV0aW9uLCBpc0F0dHJpYnV0ZUNvbnRleHQsIGlzRWxlbWVudENvbnRleHQsIHJlcGxhY2VtZW50U3Bhbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiB0cnVlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uRGV0YWlscyhcbiAgICAgIHRoaXM6IEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICAvLyBgZW50cnlOYW1lYCBoZXJlIG1heSBiZSBgZm9vYCBvciBgW2Zvb11gLCBkZXBlbmRpbmcgb24gd2hpY2ggc3VnZ2VzdGVkIGNvbXBsZXRpb24gdGhlIHVzZXJcbiAgICAvLyBjaG9zZS4gU3RyaXAgb2ZmIGFueSBiaW5kaW5nIHN5bnRheCB0byBnZXQgdGhlIHJlYWwgYXR0cmlidXRlIG5hbWUuXG4gICAgY29uc3Qge25hbWUsIGtpbmR9ID0gc3RyaXBCaW5kaW5nU3VnYXIoZW50cnlOYW1lKTtcblxuICAgIGxldCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGU7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGVQYXJlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vdGhpbmcgdG8gZG8gd2l0aG91dCBhbiBlbGVtZW50IHRvIHByb2Nlc3MuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGF0dHJUYWJsZSA9IGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlKFxuICAgICAgICB0aGlzLmNvbXBvbmVudCwgZWxlbWVudCwgdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkpO1xuXG4gICAgaWYgKCFhdHRyVGFibGUuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhdHRyVGFibGUuZ2V0KG5hbWUpITtcbiAgICBsZXQgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdO1xuICAgIGxldCBkb2N1bWVudGF0aW9uOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgaW5mbzogRGlzcGxheUluZm98bnVsbDtcbiAgICBzd2l0Y2ggKGNvbXBsZXRpb24ua2luZCkge1xuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21BdHRyaWJ1dGU6XG4gICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbVByb3BlcnR5OlxuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IGlkZWFsbHkgd2Ugd291bGQgc2hvdyB0aGUgc2FtZSBkb2N1bWVudGF0aW9uIGFzIHF1aWNrIGluZm8gaGVyZS4gSG93ZXZlcixcbiAgICAgICAgLy8gc2luY2UgdGhlc2UgYmluZGluZ3MgZG9uJ3QgZXhpc3QgaW4gdGhlIFRDQiwgdGhlcmUgaXMgbm8gc3RyYWlnaHRmb3J3YXJkIHdheSB0byByZXRyaWV2ZVxuICAgICAgICAvLyBhIGB0cy5TeW1ib2xgIGZvciB0aGUgZmllbGQgaW4gdGhlIFRTIERPTSBkZWZpbml0aW9uLlxuICAgICAgICBkaXNwbGF5UGFydHMgPSBbXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUF0dHJpYnV0ZTpcbiAgICAgICAgaW5mbyA9IGdldERpcmVjdGl2ZURpc3BsYXlJbmZvKHRoaXMudHNMUywgY29tcGxldGlvbi5kaXJlY3RpdmUpO1xuICAgICAgICBkaXNwbGF5UGFydHMgPSBpbmZvLmRpc3BsYXlQYXJ0cztcbiAgICAgICAgZG9jdW1lbnRhdGlvbiA9IGluZm8uZG9jdW1lbnRhdGlvbjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0OlxuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVPdXRwdXQ6XG4gICAgICAgIGNvbnN0IHByb3BlcnR5U3ltYm9sID0gZ2V0QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChjb21wbGV0aW9uLCB0aGlzLnR5cGVDaGVja2VyKTtcbiAgICAgICAgaWYgKHByb3BlcnR5U3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZm8gPSBnZXRUc1N5bWJvbERpc3BsYXlJbmZvKFxuICAgICAgICAgICAgdGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBwcm9wZXJ0eVN5bWJvbCxcbiAgICAgICAgICAgIGNvbXBsZXRpb24ua2luZCA9PT0gQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlSW5wdXQgPyBEaXNwbGF5SW5mb0tpbmQuUFJPUEVSVFkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERpc3BsYXlJbmZvS2luZC5FVkVOVCxcbiAgICAgICAgICAgIGNvbXBsZXRpb24uZGlyZWN0aXZlLnRzU3ltYm9sLm5hbWUpO1xuICAgICAgICBpZiAoaW5mbyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZGlzcGxheVBhcnRzID0gaW5mby5kaXNwbGF5UGFydHM7XG4gICAgICAgIGRvY3VtZW50YXRpb24gPSBpbmZvLmRvY3VtZW50YXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKGtpbmQpLFxuICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgZGlzcGxheVBhcnRzOiBbXSxcbiAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIsIGF0dHJpYnV0ZTogc3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qge25hbWV9ID0gc3RyaXBCaW5kaW5nU3VnYXIoYXR0cmlidXRlKTtcblxuICAgIGxldCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGU7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgZWxlbWVudCA9IHRoaXMubm9kZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGVQYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGVQYXJlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vdGhpbmcgdG8gZG8gd2l0aG91dCBhbiBlbGVtZW50IHRvIHByb2Nlc3MuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGF0dHJUYWJsZSA9IGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlKFxuICAgICAgICB0aGlzLmNvbXBvbmVudCwgZWxlbWVudCwgdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkpO1xuXG4gICAgaWYgKCFhdHRyVGFibGUuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhdHRyVGFibGUuZ2V0KG5hbWUpITtcbiAgICByZXR1cm4gZ2V0QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChjb21wbGV0aW9uLCB0aGlzLnR5cGVDaGVja2VyKSA/PyB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGlzUGlwZUNvbXBsZXRpb24oKTogdGhpcyBpcyBQaXBlQ29tcGxldGlvbkJ1aWxkZXIge1xuICAgIHJldHVybiB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UGlwZUNvbXBsZXRpb25zKHRoaXM6IFBpcGVDb21wbGV0aW9uQnVpbGRlcik6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcGlwZXMgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0UGlwZXNJblNjb3BlKHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAocGlwZXMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVwbGFjZW1lbnRTcGFuID0gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21Bc3QodGhpcy5ub2RlKTtcblxuICAgIGNvbnN0IGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID1cbiAgICAgICAgcGlwZXMubWFwKHBpcGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogcGlwZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBzb3J0VGV4dDogcGlwZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuUElQRSksXG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICByZXR1cm4ge1xuICAgICAgZW50cmllcyxcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21QYXJzZVNvdXJjZVNwYW4oc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogdHMuVGV4dFNwYW4ge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdChub2RlOiBQcm9wZXJ0eVJlYWR8UHJvcGVydHlXcml0ZXxNZXRob2RDYWxsfFNhZmVQcm9wZXJ0eVJlYWR8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTYWZlTWV0aG9kQ2FsbHxCaW5kaW5nUGlwZXxFbXB0eUV4cHJ8TGl0ZXJhbFByaW1pdGl2ZXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEJvdW5kRXZlbnQpOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQge1xuICBpZiAoKG5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHwgbm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICBub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCkpIHtcbiAgICAvLyBlbXB0eSBub2RlcyBkbyBub3QgcmVwbGFjZSBhbnkgZXhpc3RpbmcgdGV4dFxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogbm9kZS5uYW1lU3Bhbi5lbmQgLSBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICB9O1xufVxuXG5mdW5jdGlvbiB0YWdDb21wbGV0aW9uS2luZChkaXJlY3RpdmU6IERpcmVjdGl2ZUluU2NvcGV8bnVsbCk6IHRzLlNjcmlwdEVsZW1lbnRLaW5kIHtcbiAgbGV0IGtpbmQ6IERpc3BsYXlJbmZvS2luZDtcbiAgaWYgKGRpcmVjdGl2ZSA9PT0gbnVsbCkge1xuICAgIGtpbmQgPSBEaXNwbGF5SW5mb0tpbmQuRUxFTUVOVDtcbiAgfSBlbHNlIGlmIChkaXJlY3RpdmUuaXNDb21wb25lbnQpIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLkNPTVBPTkVOVDtcbiAgfSBlbHNlIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLkRJUkVDVElWRTtcbiAgfVxuICByZXR1cm4gdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCk7XG59XG5cbmNvbnN0IEJJTkRJTkdfU1VHQVIgPSAvW1xcW1xcKFxcKVxcXV0vZztcblxuZnVuY3Rpb24gc3RyaXBCaW5kaW5nU3VnYXIoYmluZGluZzogc3RyaW5nKToge25hbWU6IHN0cmluZywga2luZDogRGlzcGxheUluZm9LaW5kfSB7XG4gIGNvbnN0IG5hbWUgPSBiaW5kaW5nLnJlcGxhY2UoQklORElOR19TVUdBUiwgJycpO1xuICBpZiAoYmluZGluZy5zdGFydHNXaXRoKCdbJykpIHtcbiAgICByZXR1cm4ge25hbWUsIGtpbmQ6IERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWX07XG4gIH0gZWxzZSBpZiAoYmluZGluZy5zdGFydHNXaXRoKCcoJykpIHtcbiAgICByZXR1cm4ge25hbWUsIGtpbmQ6IERpc3BsYXlJbmZvS2luZC5FVkVOVH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtuYW1lLCBraW5kOiBEaXNwbGF5SW5mb0tpbmQuQVRUUklCVVRFfTtcbiAgfVxufVxuIl19