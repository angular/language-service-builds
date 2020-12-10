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
        define("@angular/language-service/ivy/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompletionBuilder = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var r3_ast_1 = require("@angular/compiler/src/render3/r3_ast");
    var ts = require("typescript");
    var display_parts_1 = require("@angular/language-service/ivy/display_parts");
    var utils_1 = require("@angular/language-service/ivy/utils");
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
        function CompletionBuilder(tsLS, compiler, component, node, nodeParent, context) {
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.component = component;
            this.node = node;
            this.nodeParent = nodeParent;
            this.context = context;
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
            else {
                return undefined;
            }
        };
        /**
         * Analogue for `ts.LanguageService.getCompletionEntrySymbol`.
         */
        CompletionBuilder.prototype.getCompletionEntrySymbol = function (name) {
            if (this.isPropertyExpressionCompletion()) {
                return this.getPropertyExpressionCompletionSymbol(name);
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
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent);
        };
        /**
         * Get completions for property expressions.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletion = function (options) {
            var e_1, _a;
            if (this.node instanceof compiler_1.EmptyExpr ||
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent) ||
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
                var replacementSpan = makeReplacementSpan(this.node);
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
            if (this.node instanceof compiler_1.EmptyExpr ||
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent) ||
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
                this.node.receiver instanceof compiler_1.ImplicitReceiver) {
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
            var completions = this.templateTypeChecker.getGlobalCompletions(this.context, this.component);
            if (completions === null) {
                return undefined;
            }
            var componentContext = completions.componentContext, templateContext = completions.templateContext;
            var replacementSpan = undefined;
            // Non-empty nodes get replaced with the completion.
            if (!(this.node instanceof compiler_1.EmptyExpr || this.node instanceof compiler_1.LiteralPrimitive)) {
                replacementSpan = makeReplacementSpan(this.node);
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
            var completions = this.templateTypeChecker.getGlobalCompletions(this.context, this.component);
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
                var _a = display_parts_1.getDisplayInfo(this.tsLS, this.typeChecker, symbol), kind = _a.kind, displayParts = _a.displayParts, documentation = _a.documentation;
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
            var completions = this.templateTypeChecker.getGlobalCompletions(this.context, this.component);
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
        return CompletionBuilder;
    }());
    exports.CompletionBuilder = CompletionBuilder;
    /**
     * Checks whether the given `node` is (most likely) a synthetic node created by the template parser
     * for an empty event binding `(event)=""`.
     *
     * When parsing such an expression, a synthetic `LiteralPrimitive` node is generated for the
     * `BoundEvent`'s handler with the literal text value 'ERROR'. Detecting this case is crucial to
     * supporting completions within empty event bindings.
     */
    function isBrokenEmptyBoundEventExpression(node, parent) {
        return node instanceof compiler_1.LiteralPrimitive && parent !== null && parent instanceof r3_ast_1.BoundEvent &&
            node.value === 'ERROR';
    }
    function makeReplacementSpan(node) {
        return {
            start: node.nameSpan.start,
            length: node.nameSpan.end - node.nameSpan.start,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWlPO0lBRWpPLHFFQUF3RztJQUN4RywrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZFQUE4RztJQUM5Ryw2REFBMkM7SUFNM0M7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBSUUsMkJBQ3FCLElBQXdCLEVBQW1CLFFBQW9CLEVBQy9ELFNBQThCLEVBQW1CLElBQU8sRUFDeEQsVUFBZ0MsRUFDaEMsT0FBNkI7WUFIN0IsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUMvRCxjQUFTLEdBQVQsU0FBUyxDQUFxQjtZQUFtQixTQUFJLEdBQUosSUFBSSxDQUFHO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQXNCO1lBQ2hDLFlBQU8sR0FBUCxPQUFPLENBQXNCO1lBUGpDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM5RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFNekIsQ0FBQztRQUV0RDs7V0FFRztRQUNILG9EQUF3QixHQUF4QixVQUF5QixPQUNTO1lBQ2hDLElBQUksSUFBSSxDQUFDLDhCQUE4QixFQUFFLEVBQUU7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3REO2lCQUFNO2dCQUNMLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0gscURBQXlCLEdBQXpCLFVBQ0ksU0FBaUIsRUFBRSxhQUFtRSxFQUN0RixXQUF5QztZQUMzQyxJ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WUFDdEYsSUFBSSxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUM7SUFDN0IsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsSUFDYztRQUN6QyxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztZQUMxQixNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO1NBQ2hELENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBFbXB0eUV4cHIsIEltcGxpY2l0UmVjZWl2ZXIsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtDb21wbGV0aW9uS2luZCwgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Qm91bmRFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Rpc3BsYXlJbmZvS2luZCwgZ2V0RGlzcGxheUluZm8sIHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kfSBmcm9tICcuL2Rpc3BsYXlfcGFydHMnO1xuaW1wb3J0IHtmaWx0ZXJBbGlhc0ltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG50eXBlIFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyID1cbiAgICBDb21wbGV0aW9uQnVpbGRlcjxQcm9wZXJ0eVJlYWR8UHJvcGVydHlXcml0ZXxNZXRob2RDYWxsfEVtcHR5RXhwcnxTYWZlUHJvcGVydHlSZWFkfFxuICAgICAgICAgICAgICAgICAgICAgIFNhZmVNZXRob2RDYWxsPjtcblxuLyoqXG4gKiBQZXJmb3JtcyBhdXRvY29tcGxldGlvbiBvcGVyYXRpb25zIG9uIGEgZ2l2ZW4gbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gKlxuICogVGhpcyBjbGFzcyBhY3RzIGFzIGEgY2xvc3VyZSBhcm91bmQgYWxsIG9mIHRoZSBjb250ZXh0IHJlcXVpcmVkIHRvIHBlcmZvcm0gdGhlIDMgYXV0b2NvbXBsZXRpb25cbiAqIG9wZXJhdGlvbnMgKGNvbXBsZXRpb25zLCBnZXQgZGV0YWlscywgYW5kIGdldCBzeW1ib2wpIGF0IGEgc3BlY2lmaWMgbm9kZS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBgTmAgdHlwZSBmb3IgdGhlIHRlbXBsYXRlIG5vZGUgaXMgbmFycm93ZWQgaW50ZXJuYWxseSBmb3IgY2VydGFpbiBvcGVyYXRpb25zLCBhcyB0aGVcbiAqIGNvbXBpbGVyIG9wZXJhdGlvbnMgcmVxdWlyZWQgdG8gaW1wbGVtZW50IGNvbXBsZXRpb24gbWF5IGJlIGRpZmZlcmVudCBmb3IgZGlmZmVyZW50IG5vZGUgdHlwZXMuXG4gKlxuICogQHBhcmFtIE4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgbm9kZSBpbiBxdWVzdGlvbiwgbmFycm93ZWQgYWNjb3JkaW5nbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uQnVpbGRlcjxOIGV4dGVuZHMgVG1wbEFzdE5vZGV8QVNUPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IE4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVQYXJlbnQ6IFRtcGxBc3ROb2RlfEFTVHxudWxsLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCkge31cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBlbnRyeU5hbWU6IHN0cmluZywgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IG5vZGUgaXMgdGhlIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBleHByZXNzaW9uLCBhbmQgbmFycm93IHRoZSB0eXBlXG4gICAqIG9mIGB0aGlzLm5vZGVgIGlmIHNvLlxuICAgKlxuICAgKiBUaGlzIG5hcnJvd2luZyBnaXZlcyBhY2Nlc3MgdG8gYWRkaXRpb25hbCBtZXRob2RzIHJlbGF0ZWQgdG8gY29tcGxldGlvbiBvZiBwcm9wZXJ0eVxuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD4pOlxuICAgICAgdGhpcyBpcyBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8XG4gICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgdGhpcy5ub2RlIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgfHxcbiAgICAgICAgdGhpcy5ub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHxcbiAgICAgICAgaXNCcm9rZW5FbXB0eUJvdW5kRXZlbnRFeHByZXNzaW9uKHRoaXMubm9kZSwgdGhpcy5ub2RlUGFyZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29tcGxldGlvbnMgZm9yIHByb3BlcnR5IGV4cHJlc3Npb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsXG4gICAgICBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfFxuICAgICAgdW5kZWZpbmVkKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLm5vZGUgaW5zdGFuY2VvZiBFbXB0eUV4cHIgfHxcbiAgICAgICAgaXNCcm9rZW5FbXB0eUJvdW5kRXZlbnRFeHByZXNzaW9uKHRoaXMubm9kZSwgdGhpcy5ub2RlUGFyZW50KSB8fFxuICAgICAgICB0aGlzLm5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICAgICAgdGhpcy5ub2RlLCB0aGlzLmNvbXBvbmVudCk7XG4gICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzUmVzdWx0cyA9IHRoaXMudHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgb3B0aW9ucyk7XG4gICAgICBpZiAodHNSZXN1bHRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVwbGFjZW1lbnRTcGFuID0gbWFrZVJlcGxhY2VtZW50U3Bhbih0aGlzLm5vZGUpO1xuXG4gICAgICBsZXQgbmdSZXN1bHRzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgdHNSZXN1bHRzLmVudHJpZXMpIHtcbiAgICAgICAgbmdSZXN1bHRzLnB1c2goe1xuICAgICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udHNSZXN1bHRzLFxuICAgICAgICBlbnRyaWVzOiBuZ1Jlc3VsdHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgdGhpczogUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGxldCBkZXRhaWxzOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8XG4gICAgICAgIGlzQnJva2VuRW1wdHlCb3VuZEV2ZW50RXhwcmVzc2lvbih0aGlzLm5vZGUsIHRoaXMubm9kZVBhcmVudCkgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgZGV0YWlscyA9XG4gICAgICAgICAgdGhpcy5nZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBkZXRhaWxzID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgbG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLFxuICAgICAgICAgIC8qIHNvdXJjZSAqLyB1bmRlZmluZWQsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gICAgaWYgKGRldGFpbHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZGV0YWlscy5kaXNwbGF5UGFydHMgPSBmaWx0ZXJBbGlhc0ltcG9ydHMoZGV0YWlscy5kaXNwbGF5UGFydHMpO1xuICAgIH1cbiAgICByZXR1cm4gZGV0YWlscztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5TeW1ib2xgIGZvciBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgICAgIHRoaXMubm9kZSwgdGhpcy5jb21wb25lbnQpO1xuICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChcbiAgICAgICAgICBsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlLCBuYW1lLCAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbXBsZXRpb25zIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dCAoZS5nLiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGxldGlvbnMgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0R2xvYmFsQ29tcGxldGlvbnModGhpcy5jb250ZXh0LCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBsZXQgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgLy8gTm9uLWVtcHR5IG5vZGVzIGdldCByZXBsYWNlZCB3aXRoIHRoZSBjb21wbGV0aW9uLlxuICAgIGlmICghKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlKSkge1xuICAgICAgcmVwbGFjZW1lbnRTcGFuID0gbWFrZVJlcGxhY2VtZW50U3Bhbih0aGlzLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIE1lcmdlIFRTIGNvbXBsZXRpb24gcmVzdWx0cyB3aXRoIHJlc3VsdHMgZnJvbSB0aGUgdGVtcGxhdGUgc2NvcGUuXG4gICAgbGV0IGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gICAgY29uc3QgdHNMc0NvbXBsZXRpb25zID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIG9wdGlvbnMpO1xuICAgIGlmICh0c0xzQ29tcGxldGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yIChjb25zdCB0c0NvbXBsZXRpb24gb2YgdHNMc0NvbXBsZXRpb25zLmVudHJpZXMpIHtcbiAgICAgICAgLy8gU2tpcCBjb21wbGV0aW9ucyB0aGF0IGFyZSBzaGFkb3dlZCBieSBhIHRlbXBsYXRlIGVudGl0eSBkZWZpbml0aW9uLlxuICAgICAgICBpZiAodGVtcGxhdGVDb250ZXh0Lmhhcyh0c0NvbXBsZXRpb24ubmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIC4uLnRzQ29tcGxldGlvbixcbiAgICAgICAgICAvLyBTdWJzdGl0dXRlIHRoZSBUUyBjb21wbGV0aW9uJ3MgYHJlcGxhY2VtZW50U3BhbmAgKHdoaWNoIHVzZXMgb2Zmc2V0cyB3aXRoaW4gdGhlIFRDQilcbiAgICAgICAgICAvLyB3aXRoIHRoZSBgcmVwbGFjZW1lbnRTcGFuYCB3aXRoaW4gdGhlIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIGVudGl0eV0gb2YgdGVtcGxhdGVDb250ZXh0KSB7XG4gICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKFxuICAgICAgICAgICAgZW50aXR5LmtpbmQgPT09IENvbXBsZXRpb25LaW5kLlJlZmVyZW5jZSA/IERpc3BsYXlJbmZvS2luZC5SRUZFUkVOQ0UgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERpc3BsYXlJbmZvS2luZC5WQVJJQUJMRSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cmllcyxcbiAgICAgIC8vIEFsdGhvdWdoIHRoaXMgY29tcGxldGlvbiBpcyBcImdsb2JhbFwiIGluIHRoZSBzZW5zZSBvZiBhbiBBbmd1bGFyIGV4cHJlc3Npb24gKHRoZXJlIGlzIG5vXG4gICAgICAvLyBleHBsaWNpdCByZWNlaXZlciksIGl0IGlzIG5vdCBcImdsb2JhbFwiIGluIGEgVHlwZVNjcmlwdCBzZW5zZSBzaW5jZSBBbmd1bGFyIGV4cHJlc3Npb25zIGhhdmVcbiAgICAgIC8vIHRoZSBjb21wb25lbnQgYXMgYW4gaW1wbGljaXQgcmVjZWl2ZXIuXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiB0cnVlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBkZXRhaWxzIG9mIGEgc3BlY2lmaWMgY29tcGxldGlvbiBmb3IgYSBwcm9wZXJ0eSBleHByZXNzaW9uIGluIGEgZ2xvYmFsIGNvbnRleHQgKGUuZy5cbiAgICogYHt7eXx9fWApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLmNvbnRleHQsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBpZiAodGVtcGxhdGVDb250ZXh0LmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHRlbXBsYXRlQ29udGV4dC5nZXQoZW50cnlOYW1lKSE7XG4gICAgICAvLyBFbnRyaWVzIHRoYXQgcmVmZXJlbmNlIGEgc3ltYm9sIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHJlZmVyIGVpdGhlciB0byBsb2NhbCByZWZlcmVuY2VzIG9yXG4gICAgICAvLyB2YXJpYWJsZXMuXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKGVudHJ5Lm5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7a2luZCwgZGlzcGxheVBhcnRzLCBkb2N1bWVudGF0aW9ufSA9XG4gICAgICAgICAgZ2V0RGlzcGxheUluZm8odGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBzeW1ib2wpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dFxuICAgKiAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLmNvbnRleHQsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG4gICAgaWYgKHRlbXBsYXRlQ29udGV4dC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgY29uc3Qgbm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUgPSB0ZW1wbGF0ZUNvbnRleHQuZ2V0KGVudHJ5TmFtZSkhLm5vZGU7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzeW1ib2wudHNTeW1ib2w7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGNvbXBvbmVudENvbnRleHQuc2hpbVBhdGgsIGNvbXBvbmVudENvbnRleHQucG9zaXRpb25JblNoaW1GaWxlLCBlbnRyeU5hbWUsXG4gICAgICAgICAgLyogc291cmNlICovIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIGBub2RlYCBpcyAobW9zdCBsaWtlbHkpIGEgc3ludGhldGljIG5vZGUgY3JlYXRlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyXG4gKiBmb3IgYW4gZW1wdHkgZXZlbnQgYmluZGluZyBgKGV2ZW50KT1cIlwiYC5cbiAqXG4gKiBXaGVuIHBhcnNpbmcgc3VjaCBhbiBleHByZXNzaW9uLCBhIHN5bnRoZXRpYyBgTGl0ZXJhbFByaW1pdGl2ZWAgbm9kZSBpcyBnZW5lcmF0ZWQgZm9yIHRoZVxuICogYEJvdW5kRXZlbnRgJ3MgaGFuZGxlciB3aXRoIHRoZSBsaXRlcmFsIHRleHQgdmFsdWUgJ0VSUk9SJy4gRGV0ZWN0aW5nIHRoaXMgY2FzZSBpcyBjcnVjaWFsIHRvXG4gKiBzdXBwb3J0aW5nIGNvbXBsZXRpb25zIHdpdGhpbiBlbXB0eSBldmVudCBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gaXNCcm9rZW5FbXB0eUJvdW5kRXZlbnRFeHByZXNzaW9uKFxuICAgIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcGFyZW50OiBUbXBsQXN0Tm9kZXxBU1R8bnVsbCk6IG5vZGUgaXMgTGl0ZXJhbFByaW1pdGl2ZSB7XG4gIHJldHVybiBub2RlIGluc3RhbmNlb2YgTGl0ZXJhbFByaW1pdGl2ZSAmJiBwYXJlbnQgIT09IG51bGwgJiYgcGFyZW50IGluc3RhbmNlb2YgQm91bmRFdmVudCAmJlxuICAgICAgbm9kZS52YWx1ZSA9PT0gJ0VSUk9SJztcbn1cblxuZnVuY3Rpb24gbWFrZVJlcGxhY2VtZW50U3Bhbihub2RlOiBQcm9wZXJ0eVJlYWR8UHJvcGVydHlXcml0ZXxNZXRob2RDYWxsfFNhZmVQcm9wZXJ0eVJlYWR8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNhZmVNZXRob2RDYWxsKTogdHMuVGV4dFNwYW4ge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogbm9kZS5uYW1lU3Bhbi5lbmQgLSBub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICB9O1xufVxuIl19