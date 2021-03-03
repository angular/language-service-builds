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
        define("@angular/language-service/ivy/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/attribute_completions", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
    var template_target_1 = require("@angular/language-service/ivy/template_target");
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
        function CompletionBuilder(tsLS, compiler, component, node, targetDetails) {
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.component = component;
            this.node = node;
            this.targetDetails = targetDetails;
            this.typeChecker = this.compiler.getNextProgram().getTypeChecker();
            this.templateTypeChecker = this.compiler.getTemplateTypeChecker();
            this.nodeParent = this.targetDetails.parent;
            this.nodeContext = nodeContextFromTarget(this.targetDetails.context);
            this.template = this.targetDetails.template;
            this.position = this.targetDetails.position;
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
            if (this.node instanceof compiler_1.TmplAstText) {
                var positionInTextNode = this.position - this.node.sourceSpan.start.offset;
                // We only provide element completions in a text node when there is an open tag immediately to
                // the left of the position.
                return this.node.value.substring(0, positionInTextNode).endsWith('<');
            }
            else if (this.node instanceof compiler_1.TmplAstElement) {
                return this.nodeContext === CompletionNodeContext.ElementTag;
            }
            return false;
        };
        CompletionBuilder.prototype.getElementTagCompletion = function () {
            var templateTypeChecker = this.compiler.getTemplateTypeChecker();
            var start;
            var length;
            if (this.node instanceof compiler_1.TmplAstElement) {
                // The replacementSpan is the tag name.
                start = this.node.sourceSpan.start.offset + 1; // account for leading '<'
                length = this.node.name.length;
            }
            else {
                var positionInTextNode = this.position - this.node.sourceSpan.start.offset;
                var textToLeftOfPosition = this.node.value.substring(0, positionInTextNode);
                start = this.node.sourceSpan.start.offset + textToLeftOfPosition.lastIndexOf('<') + 1;
                // We only autocomplete immediately after the < so we don't replace any existing text
                length = 0;
            }
            var replacementSpan = { start: start, length: length };
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
    function nodeContextFromTarget(target) {
        switch (target.kind) {
            case template_target_1.TargetNodeKind.ElementInTagContext:
                return CompletionNodeContext.ElementTag;
            case template_target_1.TargetNodeKind.ElementInBodyContext:
                // Completions in element bodies are for new attributes.
                return CompletionNodeContext.ElementAttributeKey;
            case template_target_1.TargetNodeKind.TwoWayBindingContext:
                return CompletionNodeContext.TwoWayBinding;
            case template_target_1.TargetNodeKind.AttributeInKeyContext:
                return CompletionNodeContext.ElementAttributeKey;
            case template_target_1.TargetNodeKind.AttributeInValueContext:
                if (target.node instanceof compiler_1.TmplAstBoundEvent) {
                    return CompletionNodeContext.EventValue;
                }
                else {
                    return CompletionNodeContext.None;
                }
            default:
                // No special context is available.
                return CompletionNodeContext.None;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTRWO0lBRTVWLHFFQUEwSDtJQUMxSCwrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZGQUE0SjtJQUM1Siw2RUFBa0w7SUFDbEwsaUZBQWdGO0lBQ2hGLDZEQUEyQztJQVczQyxJQUFZLHFCQU9YO0lBUEQsV0FBWSxxQkFBcUI7UUFDL0IsaUVBQUksQ0FBQTtRQUNKLDZFQUFVLENBQUE7UUFDViwrRkFBbUIsQ0FBQTtRQUNuQixtR0FBcUIsQ0FBQTtRQUNyQiw2RUFBVSxDQUFBO1FBQ1YsbUZBQWEsQ0FBQTtJQUNmLENBQUMsRUFQVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQU9oQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQVFFLDJCQUNxQixJQUF3QixFQUFtQixRQUFvQixFQUMvRCxTQUE4QixFQUFtQixJQUFPLEVBQ3hELGFBQTZCO1lBRjdCLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7WUFDL0QsY0FBUyxHQUFULFNBQVMsQ0FBcUI7WUFBbUIsU0FBSSxHQUFKLElBQUksQ0FBRztZQUN4RCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7WUFWakMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzlELHdCQUFtQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM3RCxlQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7WUFDdkMsZ0JBQVcsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENB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LEVBQUMsQ0FBQztTQUNoRDtJQUNILENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLE1BQXFCO1FBQ2xELFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNuQixLQUFLLGdDQUFjLENBQUMsbUJBQW1CO2dCQUNyQyxPQUFPLHFCQUFxQixDQUFDLFVBQVUsQ0FBQztZQUMxQyxLQUFLLGdDQUFjLENBQUMsb0JBQW9CO2dCQUN0Qyx3REFBd0Q7Z0JBQ3hELE9BQU8scUJBQXFCLENBQUMsbUJBQW1CLENBQUM7WUFDbkQsS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQjtnQkFDdEMsT0FBTyxxQkFBcUIsQ0FBQyxhQUFhLENBQUM7WUFDN0MsS0FBSyxnQ0FBYyxDQUFDLHFCQUFxQjtnQkFDdkMsT0FBTyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNuRCxLQUFLLGdDQUFjLENBQUMsdUJBQXVCO2dCQUN6QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFlBQVksNEJBQWlCLEVBQUU7b0JBQzVDLE9BQU8scUJBQXFCLENBQUMsVUFBVSxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQztpQkFDbkM7WUFDSDtnQkFDRSxtQ0FBbUM7Z0JBQ25DLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1BpcGUsIEVtcHR5RXhwciwgSW1wbGljaXRSZWNlaXZlciwgTGl0ZXJhbFByaW1pdGl2ZSwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHQsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7Q29tcGxldGlvbktpbmQsIERpcmVjdGl2ZUluU2NvcGUsIFRlbXBsYXRlRGVjbGFyYXRpb25TeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0JvdW5kRXZlbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthZGRBdHRyaWJ1dGVDb21wbGV0aW9uRW50cmllcywgQXR0cmlidXRlQ29tcGxldGlvbktpbmQsIGJ1aWxkQXR0cmlidXRlQ29tcGxldGlvblRhYmxlLCBnZXRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sfSBmcm9tICcuL2F0dHJpYnV0ZV9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0Rpc3BsYXlJbmZvLCBEaXNwbGF5SW5mb0tpbmQsIGdldERpcmVjdGl2ZURpc3BsYXlJbmZvLCBnZXRTeW1ib2xEaXNwbGF5SW5mbywgZ2V0VHNTeW1ib2xEaXNwbGF5SW5mbywgdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmR9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge1RhcmdldENvbnRleHQsIFRhcmdldE5vZGVLaW5kLCBUZW1wbGF0ZVRhcmdldH0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtmaWx0ZXJBbGlhc0ltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG50eXBlIFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyID1cbiAgICBDb21wbGV0aW9uQnVpbGRlcjxQcm9wZXJ0eVJlYWR8UHJvcGVydHlXcml0ZXxNZXRob2RDYWxsfEVtcHR5RXhwcnxTYWZlUHJvcGVydHlSZWFkfFxuICAgICAgICAgICAgICAgICAgICAgIFNhZmVNZXRob2RDYWxsfFRtcGxBc3RCb3VuZEV2ZW50PjtcblxudHlwZSBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIgPVxuICAgIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZXxUbXBsQXN0Qm91bmRFdmVudD47XG5cbnR5cGUgUGlwZUNvbXBsZXRpb25CdWlsZGVyID0gQ29tcGxldGlvbkJ1aWxkZXI8QmluZGluZ1BpcGU+O1xuXG5leHBvcnQgZW51bSBDb21wbGV0aW9uTm9kZUNvbnRleHQge1xuICBOb25lLFxuICBFbGVtZW50VGFnLFxuICBFbGVtZW50QXR0cmlidXRlS2V5LFxuICBFbGVtZW50QXR0cmlidXRlVmFsdWUsXG4gIEV2ZW50VmFsdWUsXG4gIFR3b1dheUJpbmRpbmcsXG59XG5cbi8qKlxuICogUGVyZm9ybXMgYXV0b2NvbXBsZXRpb24gb3BlcmF0aW9ucyBvbiBhIGdpdmVuIG5vZGUgaW4gdGhlIHRlbXBsYXRlLlxuICpcbiAqIFRoaXMgY2xhc3MgYWN0cyBhcyBhIGNsb3N1cmUgYXJvdW5kIGFsbCBvZiB0aGUgY29udGV4dCByZXF1aXJlZCB0byBwZXJmb3JtIHRoZSAzIGF1dG9jb21wbGV0aW9uXG4gKiBvcGVyYXRpb25zIChjb21wbGV0aW9ucywgZ2V0IGRldGFpbHMsIGFuZCBnZXQgc3ltYm9sKSBhdCBhIHNwZWNpZmljIG5vZGUuXG4gKlxuICogVGhlIGdlbmVyaWMgYE5gIHR5cGUgZm9yIHRoZSB0ZW1wbGF0ZSBub2RlIGlzIG5hcnJvd2VkIGludGVybmFsbHkgZm9yIGNlcnRhaW4gb3BlcmF0aW9ucywgYXMgdGhlXG4gKiBjb21waWxlciBvcGVyYXRpb25zIHJlcXVpcmVkIHRvIGltcGxlbWVudCBjb21wbGV0aW9uIG1heSBiZSBkaWZmZXJlbnQgZm9yIGRpZmZlcmVudCBub2RlIHR5cGVzLlxuICpcbiAqIEBwYXJhbSBOIHR5cGUgb2YgdGhlIHRlbXBsYXRlIG5vZGUgaW4gcXVlc3Rpb24sIG5hcnJvd2VkIGFjY29yZGluZ2x5LlxuICovXG5leHBvcnQgY2xhc3MgQ29tcGxldGlvbkJ1aWxkZXI8TiBleHRlbmRzIFRtcGxBc3ROb2RlfEFTVD4ge1xuICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVQYXJlbnQgPSB0aGlzLnRhcmdldERldGFpbHMucGFyZW50O1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVDb250ZXh0ID0gbm9kZUNvbnRleHRGcm9tVGFyZ2V0KHRoaXMudGFyZ2V0RGV0YWlscy5jb250ZXh0KTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZSA9IHRoaXMudGFyZ2V0RGV0YWlscy50ZW1wbGF0ZTtcbiAgcHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbiA9IHRoaXMudGFyZ2V0RGV0YWlscy5wb3NpdGlvbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHByaXZhdGUgcmVhZG9ubHkgbm9kZTogTixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0RGV0YWlsczogVGVtcGxhdGVUYXJnZXQpIHt9XG5cbiAgLyoqXG4gICAqIEFuYWxvZ3VlIGZvciBgdHMuTGFuZ3VhZ2VTZXJ2aWNlLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbmAuXG4gICAqL1xuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0VsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc1BpcGVDb21wbGV0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFBpcGVDb21wbGV0aW9ucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBlbnRyeU5hbWU6IHN0cmluZywgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkRldGFpbHMoZW50cnlOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50VGFnQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50VGFnQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IG5vZGUgaXMgdGhlIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBleHByZXNzaW9uLCBhbmQgbmFycm93IHRoZSB0eXBlXG4gICAqIG9mIGB0aGlzLm5vZGVgIGlmIHNvLlxuICAgKlxuICAgKiBUaGlzIG5hcnJvd2luZyBnaXZlcyBhY2Nlc3MgdG8gYWRkaXRpb25hbCBtZXRob2RzIHJlbGF0ZWQgdG8gY29tcGxldGlvbiBvZiBwcm9wZXJ0eVxuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD4pOlxuICAgICAgdGhpcyBpcyBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8XG4gICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHxcbiAgICAgICAgLy8gQm91bmRFdmVudCBub2RlcyBvbmx5IGNvdW50IGFzIHByb3BlcnR5IGNvbXBsZXRpb25zIGlmIGluIGFuIEV2ZW50VmFsdWUgY29udGV4dC5cbiAgICAgICAgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgJiYgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LkV2ZW50VmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb21wbGV0aW9ucyBmb3IgcHJvcGVydHkgZXhwcmVzc2lvbnMuXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBCb3VuZEV2ZW50IHx8XG4gICAgICAgIHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgICAgICB0aGlzLm5vZGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNSZXN1bHRzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgICAgICBsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlLCBvcHRpb25zKTtcbiAgICAgIGlmICh0c1Jlc3VsdHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgICBsZXQgbmdSZXN1bHRzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgdHNSZXN1bHRzLmVudHJpZXMpIHtcbiAgICAgICAgbmdSZXN1bHRzLnB1c2goe1xuICAgICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udHNSZXN1bHRzLFxuICAgICAgICBlbnRyaWVzOiBuZ1Jlc3VsdHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGxldCBkZXRhaWxzOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgZGV0YWlscyA9XG4gICAgICAgICAgdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkZXRhaWxzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gICAgaWYgKGRldGFpbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZGV0YWlscy5kaXNwbGF5UGFydHMgPSBmaWx0ZXJBbGlhc0ltcG9ydHMoZGV0YWlscy5kaXNwbGF5UGFydHMpO1xuICAgIH1cbiAgICByZXR1cm4gZGV0YWlscztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5TeW1ib2xgIGZvciBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgQm91bmRFdmVudCB8fCB0aGlzLm5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uU3ltYm9sKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5ub2RlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGxvY2F0aW9uLnNoaW1QYXRoLCBsb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGUsIG5hbWUsIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29tcGxldGlvbnMgZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbiBpbiBhIGdsb2JhbCBjb250ZXh0IChlLmcuIGB7e3l8fX1gKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbihcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLFxuICAgICAgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3xcbiAgICAgIHVuZGVmaW5lZCk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbUFzdCh0aGlzLm5vZGUpO1xuXG4gICAgLy8gTWVyZ2UgVFMgY29tcGxldGlvbiByZXN1bHRzIHdpdGggcmVzdWx0cyBmcm9tIHRoZSB0ZW1wbGF0ZSBzY29wZS5cbiAgICBsZXQgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgICBjb25zdCB0c0xzQ29tcGxldGlvbnMgPSB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgb3B0aW9ucyk7XG4gICAgaWYgKHRzTHNDb21wbGV0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IHRzQ29tcGxldGlvbiBvZiB0c0xzQ29tcGxldGlvbnMuZW50cmllcykge1xuICAgICAgICAvLyBTa2lwIGNvbXBsZXRpb25zIHRoYXQgYXJlIHNoYWRvd2VkIGJ5IGEgdGVtcGxhdGUgZW50aXR5IGRlZmluaXRpb24uXG4gICAgICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKHRzQ29tcGxldGlvbi5uYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgICAgLi4udHNDb21wbGV0aW9uLFxuICAgICAgICAgIC8vIFN1YnN0aXR1dGUgdGhlIFRTIGNvbXBsZXRpb24ncyBgcmVwbGFjZW1lbnRTcGFuYCAod2hpY2ggdXNlcyBvZmZzZXRzIHdpdGhpbiB0aGUgVENCKVxuICAgICAgICAgIC8vIHdpdGggdGhlIGByZXBsYWNlbWVudFNwYW5gIHdpdGhpbiB0aGUgdGVtcGxhdGUgc291cmNlLlxuICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZW50aXR5XSBvZiB0ZW1wbGF0ZUNvbnRleHQpIHtcbiAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoXG4gICAgICAgICAgICBlbnRpdHkua2luZCA9PT0gQ29tcGxldGlvbktpbmQuUmVmZXJlbmNlID8gRGlzcGxheUluZm9LaW5kLlJFRkVSRU5DRSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGlzcGxheUluZm9LaW5kLlZBUklBQkxFKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgLy8gQWx0aG91Z2ggdGhpcyBjb21wbGV0aW9uIGlzIFwiZ2xvYmFsXCIgaW4gdGhlIHNlbnNlIG9mIGFuIEFuZ3VsYXIgZXhwcmVzc2lvbiAodGhlcmUgaXMgbm9cbiAgICAgIC8vIGV4cGxpY2l0IHJlY2VpdmVyKSwgaXQgaXMgbm90IFwiZ2xvYmFsXCIgaW4gYSBUeXBlU2NyaXB0IHNlbnNlIHNpbmNlIEFuZ3VsYXIgZXhwcmVzc2lvbnMgaGF2ZVxuICAgICAgLy8gdGhlIGNvbXBvbmVudCBhcyBhbiBpbXBsaWNpdCByZWNlaXZlci5cbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IHRydWUsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dCAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zID1cbiAgICAgICAgdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldEdsb2JhbENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBpZiAodGVtcGxhdGVDb250ZXh0LmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHRlbXBsYXRlQ29udGV4dC5nZXQoZW50cnlOYW1lKSE7XG4gICAgICAvLyBFbnRyaWVzIHRoYXQgcmVmZXJlbmNlIGEgc3ltYm9sIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHJlZmVyIGVpdGhlciB0byBsb2NhbCByZWZlcmVuY2VzIG9yXG4gICAgICAvLyB2YXJpYWJsZXMuXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKGVudHJ5Lm5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7a2luZCwgZGlzcGxheVBhcnRzLCBkb2N1bWVudGF0aW9ufSA9XG4gICAgICAgICAgZ2V0U3ltYm9sRGlzcGxheUluZm8odGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBzeW1ib2wpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dFxuICAgKiAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9XG4gICAgICAgIHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCB7Y29tcG9uZW50Q29udGV4dCwgdGVtcGxhdGVDb250ZXh0fSA9IGNvbXBsZXRpb25zO1xuICAgIGlmICh0ZW1wbGF0ZUNvbnRleHQuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIGNvbnN0IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlID0gdGVtcGxhdGVDb250ZXh0LmdldChlbnRyeU5hbWUpIS5ub2RlO1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFN5bWJvbE9mTm9kZShub2RlLCB0aGlzLmNvbXBvbmVudCkgYXNcbiAgICAgICAgICAgICAgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbCB8XG4gICAgICAgICAgbnVsbDtcbiAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3ltYm9sLnRzU3ltYm9sO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChcbiAgICAgICAgICBjb21wb25lbnRDb250ZXh0LnNoaW1QYXRoLCBjb21wb25lbnRDb250ZXh0LnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNFbGVtZW50VGFnQ29tcGxldGlvbigpOiB0aGlzIGlzIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZXh0PiB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0KSB7XG4gICAgICBjb25zdCBwb3NpdGlvbkluVGV4dE5vZGUgPSB0aGlzLnBvc2l0aW9uIC0gdGhpcy5ub2RlLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgLy8gV2Ugb25seSBwcm92aWRlIGVsZW1lbnQgY29tcGxldGlvbnMgaW4gYSB0ZXh0IG5vZGUgd2hlbiB0aGVyZSBpcyBhbiBvcGVuIHRhZyBpbW1lZGlhdGVseSB0b1xuICAgICAgLy8gdGhlIGxlZnQgb2YgdGhlIHBvc2l0aW9uLlxuICAgICAgcmV0dXJuIHRoaXMubm9kZS52YWx1ZS5zdWJzdHJpbmcoMCwgcG9zaXRpb25JblRleHROb2RlKS5lbmRzV2l0aCgnPCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVDb250ZXh0ID09PSBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudFRhZztcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50VGFnQ29tcGxldGlvbih0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGV4dD4pOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICAgIGxldCBzdGFydDogbnVtYmVyO1xuICAgIGxldCBsZW5ndGg6IG51bWJlcjtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIC8vIFRoZSByZXBsYWNlbWVudFNwYW4gaXMgdGhlIHRhZyBuYW1lLlxuICAgICAgc3RhcnQgPSB0aGlzLm5vZGUuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyAxOyAgLy8gYWNjb3VudCBmb3IgbGVhZGluZyAnPCdcbiAgICAgIGxlbmd0aCA9IHRoaXMubm9kZS5uYW1lLmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcG9zaXRpb25JblRleHROb2RlID0gdGhpcy5wb3NpdGlvbiAtIHRoaXMubm9kZS5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IHRleHRUb0xlZnRPZlBvc2l0aW9uID0gdGhpcy5ub2RlLnZhbHVlLnN1YnN0cmluZygwLCBwb3NpdGlvbkluVGV4dE5vZGUpO1xuICAgICAgc3RhcnQgPSB0aGlzLm5vZGUuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyB0ZXh0VG9MZWZ0T2ZQb3NpdGlvbi5sYXN0SW5kZXhPZignPCcpICsgMTtcbiAgICAgIC8vIFdlIG9ubHkgYXV0b2NvbXBsZXRlIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSA8IHNvIHdlIGRvbid0IHJlcGxhY2UgYW55IGV4aXN0aW5nIHRleHRcbiAgICAgIGxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgY29uc3QgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3BhbiA9IHtzdGFydCwgbGVuZ3RofTtcblxuICAgIGNvbnN0IGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID1cbiAgICAgICAgQXJyYXkuZnJvbSh0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBvdGVudGlhbEVsZW1lbnRUYWdzKHRoaXMuY29tcG9uZW50KSlcbiAgICAgICAgICAgIC5tYXAoKFt0YWcsIGRpcmVjdGl2ZV0pID0+ICh7XG4gICAgICAgICAgICAgICAgICAga2luZDogdGFnQ29tcGxldGlvbktpbmQoZGlyZWN0aXZlKSxcbiAgICAgICAgICAgICAgICAgICBuYW1lOiB0YWcsXG4gICAgICAgICAgICAgICAgICAgc29ydFRleHQ6IHRhZyxcbiAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgICAgICAgICAgIH0pKTtcblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudFRhZ0NvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRleHQ+LFxuICAgICAgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgdGFnTWFwID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQb3RlbnRpYWxFbGVtZW50VGFncyh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKCF0YWdNYXAuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlID0gdGFnTWFwLmdldChlbnRyeU5hbWUpITtcbiAgICBsZXQgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdO1xuICAgIGxldCBkb2N1bWVudGF0aW9uOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoZGlyZWN0aXZlID09PSBudWxsKSB7XG4gICAgICBkaXNwbGF5UGFydHMgPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlzcGxheUluZm8gPSBnZXREaXJlY3RpdmVEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIGRpcmVjdGl2ZSk7XG4gICAgICBkaXNwbGF5UGFydHMgPSBkaXNwbGF5SW5mby5kaXNwbGF5UGFydHM7XG4gICAgICBkb2N1bWVudGF0aW9uID0gZGlzcGxheUluZm8uZG9jdW1lbnRhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogdGFnQ29tcGxldGlvbktpbmQoZGlyZWN0aXZlKSxcbiAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgIGRpc3BsYXlQYXJ0cyxcbiAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudFRhZ0NvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGV4dD4sIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgdGFnTWFwID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRQb3RlbnRpYWxFbGVtZW50VGFncyh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKCF0YWdNYXAuaGFzKGVudHJ5TmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlID0gdGFnTWFwLmdldChlbnRyeU5hbWUpITtcbiAgICByZXR1cm4gZGlyZWN0aXZlPy50c1N5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgaXNFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbigpOiB0aGlzIGlzIEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuICh0aGlzLm5vZGVDb250ZXh0ID09PSBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudEF0dHJpYnV0ZUtleSB8fFxuICAgICAgICAgICAgdGhpcy5ub2RlQ29udGV4dCA9PT0gQ29tcGxldGlvbk5vZGVDb250ZXh0LlR3b1dheUJpbmRpbmcpICYmXG4gICAgICAgICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHxcbiAgICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRoaXM6IEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uQnVpbGRlcik6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgbGV0IGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZTtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlUGFyZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RoaW5nIHRvIGRvIHdpdGhvdXQgYW4gZWxlbWVudCB0byBwcm9jZXNzLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKCh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQgfHxcbiAgICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSAmJlxuICAgICAgICB0aGlzLm5vZGUua2V5U3BhbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXBsYWNlbWVudFNwYW4gPSBtYWtlUmVwbGFjZW1lbnRTcGFuRnJvbVBhcnNlU291cmNlU3Bhbih0aGlzLm5vZGUua2V5U3Bhbik7XG4gICAgfVxuXG4gICAgY29uc3QgYXR0clRhYmxlID0gYnVpbGRBdHRyaWJ1dGVDb21wbGV0aW9uVGFibGUoXG4gICAgICAgIHRoaXMuY29tcG9uZW50LCBlbGVtZW50LCB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKSk7XG5cbiAgICBsZXQgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgY29tcGxldGlvbiBvZiBhdHRyVGFibGUudmFsdWVzKCkpIHtcbiAgICAgIC8vIEZpcnN0LCBmaWx0ZXIgb3V0IGNvbXBsZXRpb25zIHRoYXQgZG9uJ3QgbWFrZSBzZW5zZSBmb3IgdGhlIGN1cnJlbnQgbm9kZS4gRm9yIGV4YW1wbGUsIGlmXG4gICAgICAvLyB0aGUgdXNlciBpcyBjb21wbGV0aW5nIG9uIGEgcHJvcGVydHkgYmluZGluZyBgW2Zvb3xdYCwgZG9uJ3Qgb2ZmZXIgb3V0cHV0IGV2ZW50XG4gICAgICAvLyBjb21wbGV0aW9ucy5cbiAgICAgIHN3aXRjaCAoY29tcGxldGlvbi5raW5kKSB7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tQXR0cmlidXRlOlxuICAgICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbVByb3BlcnR5OlxuICAgICAgICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0OlxuICAgICAgICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghY29tcGxldGlvbi50d29XYXlCaW5kaW5nU3VwcG9ydGVkICYmXG4gICAgICAgICAgICAgIHRoaXMubm9kZUNvbnRleHQgPT09IENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ud29XYXlCaW5kaW5nKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0OlxuICAgICAgICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVBdHRyaWJ1dGU6XG4gICAgICAgICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fFxuICAgICAgICAgICAgICB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBJcyB0aGUgY29tcGxldGlvbiBpbiBhbiBhdHRyaWJ1dGUgY29udGV4dCAoaW5zdGVhZCBvZiBhIHByb3BlcnR5IGNvbnRleHQpP1xuICAgICAgY29uc3QgaXNBdHRyaWJ1dGVDb250ZXh0ID1cbiAgICAgICAgICAodGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpO1xuICAgICAgLy8gSXMgdGhlIGNvbXBsZXRpb24gZm9yIGFuIGVsZW1lbnQgKG5vdCBhbiA8bmctdGVtcGxhdGU+KT9cbiAgICAgIGNvbnN0IGlzRWxlbWVudENvbnRleHQgPVxuICAgICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHRoaXMubm9kZVBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50O1xuICAgICAgYWRkQXR0cmlidXRlQ29tcGxldGlvbkVudHJpZXMoXG4gICAgICAgICAgZW50cmllcywgY29tcGxldGlvbiwgaXNBdHRyaWJ1dGVDb250ZXh0LCBpc0VsZW1lbnRDb250ZXh0LCByZXBsYWNlbWVudFNwYW4pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBlbnRyaWVzLFxuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc1xuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgLy8gYGVudHJ5TmFtZWAgaGVyZSBtYXkgYmUgYGZvb2Agb3IgYFtmb29dYCwgZGVwZW5kaW5nIG9uIHdoaWNoIHN1Z2dlc3RlZCBjb21wbGV0aW9uIHRoZSB1c2VyXG4gICAgLy8gY2hvc2UuIFN0cmlwIG9mZiBhbnkgYmluZGluZyBzeW50YXggdG8gZ2V0IHRoZSByZWFsIGF0dHJpYnV0ZSBuYW1lLlxuICAgIGNvbnN0IHtuYW1lLCBraW5kfSA9IHN0cmlwQmluZGluZ1N1Z2FyKGVudHJ5TmFtZSk7XG5cbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlUGFyZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RoaW5nIHRvIGRvIHdpdGhvdXQgYW4gZWxlbWVudCB0byBwcm9jZXNzLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGlmICghYXR0clRhYmxlLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXR0clRhYmxlLmdldChuYW1lKSE7XG4gICAgbGV0IGRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXTtcbiAgICBsZXQgZG9jdW1lbnRhdGlvbjogdHMuU3ltYm9sRGlzcGxheVBhcnRbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGluZm86IERpc3BsYXlJbmZvfG51bGw7XG4gICAgc3dpdGNoIChjb21wbGV0aW9uLmtpbmQpIHtcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tQXR0cmlidXRlOlxuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21Qcm9wZXJ0eTpcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBpZGVhbGx5IHdlIHdvdWxkIHNob3cgdGhlIHNhbWUgZG9jdW1lbnRhdGlvbiBhcyBxdWljayBpbmZvIGhlcmUuIEhvd2V2ZXIsXG4gICAgICAgIC8vIHNpbmNlIHRoZXNlIGJpbmRpbmdzIGRvbid0IGV4aXN0IGluIHRoZSBUQ0IsIHRoZXJlIGlzIG5vIHN0cmFpZ2h0Zm9yd2FyZCB3YXkgdG8gcmV0cmlldmVcbiAgICAgICAgLy8gYSBgdHMuU3ltYm9sYCBmb3IgdGhlIGZpZWxkIGluIHRoZSBUUyBET00gZGVmaW5pdGlvbi5cbiAgICAgICAgZGlzcGxheVBhcnRzID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVBdHRyaWJ1dGU6XG4gICAgICAgIGluZm8gPSBnZXREaXJlY3RpdmVEaXNwbGF5SW5mbyh0aGlzLnRzTFMsIGNvbXBsZXRpb24uZGlyZWN0aXZlKTtcbiAgICAgICAgZGlzcGxheVBhcnRzID0gaW5mby5kaXNwbGF5UGFydHM7XG4gICAgICAgIGRvY3VtZW50YXRpb24gPSBpbmZvLmRvY3VtZW50YXRpb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dDpcbiAgICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0OlxuICAgICAgICBjb25zdCBwcm9wZXJ0eVN5bWJvbCA9IGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woY29tcGxldGlvbiwgdGhpcy50eXBlQ2hlY2tlcik7XG4gICAgICAgIGlmIChwcm9wZXJ0eVN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpbmZvID0gZ2V0VHNTeW1ib2xEaXNwbGF5SW5mbyhcbiAgICAgICAgICAgIHRoaXMudHNMUywgdGhpcy50eXBlQ2hlY2tlciwgcHJvcGVydHlTeW1ib2wsXG4gICAgICAgICAgICBjb21wbGV0aW9uLmtpbmQgPT09IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0ID8gRGlzcGxheUluZm9LaW5kLlBST1BFUlRZIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEaXNwbGF5SW5mb0tpbmQuRVZFTlQsXG4gICAgICAgICAgICBjb21wbGV0aW9uLmRpcmVjdGl2ZS50c1N5bWJvbC5uYW1lKTtcbiAgICAgICAgaWYgKGluZm8gPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGRpc3BsYXlQYXJ0cyA9IGluZm8uZGlzcGxheVBhcnRzO1xuICAgICAgICBkb2N1bWVudGF0aW9uID0gaW5mby5kb2N1bWVudGF0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBlbnRyeU5hbWUsXG4gICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChraW5kKSxcbiAgICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICAgIGRpc3BsYXlQYXJ0czogW10sXG4gICAgICBkb2N1bWVudGF0aW9uLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9uU3ltYm9sKFxuICAgICAgdGhpczogRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25CdWlsZGVyLCBhdHRyaWJ1dGU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHtuYW1lfSA9IHN0cmlwQmluZGluZ1N1Z2FyKGF0dHJpYnV0ZSk7XG5cbiAgICBsZXQgZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGVsZW1lbnQgPSB0aGlzLm5vZGU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgdGhpcy5ub2RlUGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBlbGVtZW50ID0gdGhpcy5ub2RlUGFyZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RoaW5nIHRvIGRvIHdpdGhvdXQgYW4gZWxlbWVudCB0byBwcm9jZXNzLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBhdHRyVGFibGUgPSBidWlsZEF0dHJpYnV0ZUNvbXBsZXRpb25UYWJsZShcbiAgICAgICAgdGhpcy5jb21wb25lbnQsIGVsZW1lbnQsIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpKTtcblxuICAgIGlmICghYXR0clRhYmxlLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXR0clRhYmxlLmdldChuYW1lKSE7XG4gICAgcmV0dXJuIGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woY29tcGxldGlvbiwgdGhpcy50eXBlQ2hlY2tlcikgPz8gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BpcGVDb21wbGV0aW9uKCk6IHRoaXMgaXMgUGlwZUNvbXBsZXRpb25CdWlsZGVyIHtcbiAgICByZXR1cm4gdGhpcy5ub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGU7XG4gIH1cblxuICBwcml2YXRlIGdldFBpcGVDb21wbGV0aW9ucyh0aGlzOiBQaXBlQ29tcGxldGlvbkJ1aWxkZXIpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHBpcGVzID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFBpcGVzSW5TY29wZSh0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKHBpcGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcGxhY2VtZW50U3BhbiA9IG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tQXN0KHRoaXMubm9kZSk7XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9XG4gICAgICAgIHBpcGVzLm1hcChwaXBlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHBpcGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc29ydFRleHQ6IHBpcGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoRGlzcGxheUluZm9LaW5kLlBJUEUpLFxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJpZXMsXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VSZXBsYWNlbWVudFNwYW5Gcm9tUGFyc2VTb3VyY2VTcGFuKHNwYW46IFBhcnNlU291cmNlU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgbGVuZ3RoOiBzcGFuLmVuZC5vZmZzZXQgLSBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZVJlcGxhY2VtZW50U3BhbkZyb21Bc3Qobm9kZTogUHJvcGVydHlSZWFkfFByb3BlcnR5V3JpdGV8TWV0aG9kQ2FsbHxTYWZlUHJvcGVydHlSZWFkfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2FmZU1ldGhvZENhbGx8QmluZGluZ1BpcGV8RW1wdHlFeHByfExpdGVyYWxQcmltaXRpdmV8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBCb3VuZEV2ZW50KTogdHMuVGV4dFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKChub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IG5vZGUgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlIHx8XG4gICAgICAgbm9kZSBpbnN0YW5jZW9mIEJvdW5kRXZlbnQpKSB7XG4gICAgLy8gZW1wdHkgbm9kZXMgZG8gbm90IHJlcGxhY2UgYW55IGV4aXN0aW5nIHRleHRcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydDogbm9kZS5uYW1lU3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IG5vZGUubmFtZVNwYW4uZW5kIC0gbm9kZS5uYW1lU3Bhbi5zdGFydCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGFnQ29tcGxldGlvbktpbmQoZGlyZWN0aXZlOiBEaXJlY3RpdmVJblNjb3BlfG51bGwpOiB0cy5TY3JpcHRFbGVtZW50S2luZCB7XG4gIGxldCBraW5kOiBEaXNwbGF5SW5mb0tpbmQ7XG4gIGlmIChkaXJlY3RpdmUgPT09IG51bGwpIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLkVMRU1FTlQ7XG4gIH0gZWxzZSBpZiAoZGlyZWN0aXZlLmlzQ29tcG9uZW50KSB7XG4gICAga2luZCA9IERpc3BsYXlJbmZvS2luZC5DT01QT05FTlQ7XG4gIH0gZWxzZSB7XG4gICAga2luZCA9IERpc3BsYXlJbmZvS2luZC5ESVJFQ1RJVkU7XG4gIH1cbiAgcmV0dXJuIHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKGtpbmQpO1xufVxuXG5jb25zdCBCSU5ESU5HX1NVR0FSID0gL1tcXFtcXChcXClcXF1dL2c7XG5cbmZ1bmN0aW9uIHN0cmlwQmluZGluZ1N1Z2FyKGJpbmRpbmc6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmcsIGtpbmQ6IERpc3BsYXlJbmZvS2luZH0ge1xuICBjb25zdCBuYW1lID0gYmluZGluZy5yZXBsYWNlKEJJTkRJTkdfU1VHQVIsICcnKTtcbiAgaWYgKGJpbmRpbmcuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgcmV0dXJuIHtuYW1lLCBraW5kOiBEaXNwbGF5SW5mb0tpbmQuUFJPUEVSVFl9O1xuICB9IGVsc2UgaWYgKGJpbmRpbmcuc3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgcmV0dXJuIHtuYW1lLCBraW5kOiBEaXNwbGF5SW5mb0tpbmQuRVZFTlR9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7bmFtZSwga2luZDogRGlzcGxheUluZm9LaW5kLkFUVFJJQlVURX07XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9kZUNvbnRleHRGcm9tVGFyZ2V0KHRhcmdldDogVGFyZ2V0Q29udGV4dCk6IENvbXBsZXRpb25Ob2RlQ29udGV4dCB7XG4gIHN3aXRjaCAodGFyZ2V0LmtpbmQpIHtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJblRhZ0NvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRUYWc7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5Cb2R5Q29udGV4dDpcbiAgICAgIC8vIENvbXBsZXRpb25zIGluIGVsZW1lbnQgYm9kaWVzIGFyZSBmb3IgbmV3IGF0dHJpYnV0ZXMuXG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXk7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuVHdvV2F5QmluZGluZztcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkF0dHJpYnV0ZUluS2V5Q29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudEF0dHJpYnV0ZUtleTtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkF0dHJpYnV0ZUluVmFsdWVDb250ZXh0OlxuICAgICAgaWYgKHRhcmdldC5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FdmVudFZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ob25lO1xuICAgICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBObyBzcGVjaWFsIGNvbnRleHQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ob25lO1xuICB9XG59XG4iXX0=