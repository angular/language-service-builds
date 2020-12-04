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
        define("@angular/language-service/ivy/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/display_parts"], factory);
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
                this.node instanceof compiler_1.EmptyExpr ||
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent);
        };
        /**
         * Get completions for property expressions.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletion = function (options) {
            if (this.node instanceof compiler_1.EmptyExpr ||
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent) ||
                this.node.receiver instanceof compiler_1.ImplicitReceiver) {
                return this.getGlobalPropertyExpressionCompletion(options);
            }
            else {
                // TODO(alxhub): implement completion of non-global expressions.
                return undefined;
            }
        };
        /**
         * Get the details of a specific completion for a property expression.
         */
        CompletionBuilder.prototype.getPropertyExpressionCompletionDetails = function (entryName, formatOptions, preferences) {
            if (this.node instanceof compiler_1.EmptyExpr ||
                isBrokenEmptyBoundEventExpression(this.node, this.nodeParent) ||
                this.node.receiver instanceof compiler_1.ImplicitReceiver) {
                return this.getGlobalPropertyExpressionCompletionDetails(entryName, formatOptions, preferences);
            }
            else {
                // TODO(alxhub): implement completion of non-global expressions.
                return undefined;
            }
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
                // TODO(alxhub): implement completion of non-global expressions.
                return undefined;
            }
        };
        /**
         * Get completions for a property expression in a global context (e.g. `{{y|}}`).
         */
        CompletionBuilder.prototype.getGlobalPropertyExpressionCompletion = function (options) {
            var e_1, _a, e_2, _b;
            var completions = this.templateTypeChecker.getGlobalCompletions(this.context, this.component);
            if (completions === null) {
                return undefined;
            }
            var componentContext = completions.componentContext, templateContext = completions.templateContext;
            var replacementSpan = undefined;
            // Non-empty nodes get replaced with the completion.
            if (!(this.node instanceof compiler_1.EmptyExpr || this.node instanceof compiler_1.LiteralPrimitive)) {
                replacementSpan = {
                    start: this.node.nameSpan.start,
                    length: this.node.nameSpan.end - this.node.nameSpan.start,
                };
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
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (templateContext_1_1 && !templateContext_1_1.done && (_b = templateContext_1.return)) _b.call(templateContext_1);
                }
                finally { if (e_2) throw e_2.error; }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWdMO0lBRWhMLHFFQUF3RztJQUN4RywrREFBZ0U7SUFDaEUsK0JBQWlDO0lBRWpDLDZFQUE4RztJQUs5Rzs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFJRSwyQkFDcUIsSUFBd0IsRUFBbUIsUUFBb0IsRUFDL0QsU0FBOEIsRUFBbUIsSUFBTyxFQUN4RCxVQUFnQyxFQUNoQyxPQUE2QjtZQUg3QixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBQy9ELGNBQVMsR0FBVCxTQUFTLENBQXFCO1lBQW1CLFNBQUksR0FBSixJQUFJLENBQUc7WUFDeEQsZUFBVSxHQUFWLFVBQVUsQ0FBc0I7WUFDaEMsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7WUFQakMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzlELHdCQUFtQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQU16QixDQUFDO1FBRXREOztXQUVHO1FBQ0gsb0RBQXdCLEdBQXhCLFVBQXlCLE9BQ1M7WUFDaEMsSUFBSSxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRTtnQkFDekMsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdEQ7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxxREFBeUIsR0FBekIsVUFDSSxTQUFpQixFQUFFLGFBQW1FLEVBQ3RGLFdBQXlDO1lBQzNDLElBQUksSUFBSSxDQUFD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QUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBRXBFLENBQUM7Z0JBQ1QsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFO29CQUMvQyxPQUFPLFNBQVMsQ0FBQztpQkFDbEI7Z0JBQ0QsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDO2FBQ3hCO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FDckMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLFNBQVM7Z0JBQ3pFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUM3QjtRQUNILENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFsUEQsSUFrUEM7SUFsUFksOENBQWlCO0lBb1A5Qjs7Ozs7OztPQU9HO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FDdEMsSUFBcUIsRUFBRSxNQUE0QjtRQUNyRCxPQUFPLElBQUksWUFBWSwyQkFBZ0IsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sWUFBWSxtQkFBVTtZQUN0RixJQUFJLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBFbXB0eUV4cHIsIEltcGxpY2l0UmVjZWl2ZXIsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIFByb3BlcnR5UmVhZCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge0NvbXBsZXRpb25LaW5kLCBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtCb3VuZEV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGlzcGxheUluZm9LaW5kLCBnZXREaXNwbGF5SW5mbywgdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmR9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5cbnR5cGUgUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkJ1aWxkZXIgPVxuICAgIENvbXBsZXRpb25CdWlsZGVyPFByb3BlcnR5UmVhZHxNZXRob2RDYWxsfEVtcHR5RXhwcnxMaXRlcmFsUHJpbWl0aXZlPjtcblxuLyoqXG4gKiBQZXJmb3JtcyBhdXRvY29tcGxldGlvbiBvcGVyYXRpb25zIG9uIGEgZ2l2ZW4gbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gKlxuICogVGhpcyBjbGFzcyBhY3RzIGFzIGEgY2xvc3VyZSBhcm91bmQgYWxsIG9mIHRoZSBjb250ZXh0IHJlcXVpcmVkIHRvIHBlcmZvcm0gdGhlIDMgYXV0b2NvbXBsZXRpb25cbiAqIG9wZXJhdGlvbnMgKGNvbXBsZXRpb25zLCBnZXQgZGV0YWlscywgYW5kIGdldCBzeW1ib2wpIGF0IGEgc3BlY2lmaWMgbm9kZS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBgTmAgdHlwZSBmb3IgdGhlIHRlbXBsYXRlIG5vZGUgaXMgbmFycm93ZWQgaW50ZXJuYWxseSBmb3IgY2VydGFpbiBvcGVyYXRpb25zLCBhcyB0aGVcbiAqIGNvbXBpbGVyIG9wZXJhdGlvbnMgcmVxdWlyZWQgdG8gaW1wbGVtZW50IGNvbXBsZXRpb24gbWF5IGJlIGRpZmZlcmVudCBmb3IgZGlmZmVyZW50IG5vZGUgdHlwZXMuXG4gKlxuICogQHBhcmFtIE4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgbm9kZSBpbiBxdWVzdGlvbiwgbmFycm93ZWQgYWNjb3JkaW5nbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uQnVpbGRlcjxOIGV4dGVuZHMgVG1wbEFzdE5vZGV8QVNUPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IE4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGVQYXJlbnQ6IFRtcGxBc3ROb2RlfEFTVHxudWxsLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCkge31cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFsb2d1ZSBmb3IgYHRzLkxhbmd1YWdlU2VydmljZS5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBlbnRyeU5hbWU6IHN0cmluZywgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbG9ndWUgZm9yIGB0cy5MYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sYC5cbiAgICovXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1Byb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IG5vZGUgaXMgdGhlIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBleHByZXNzaW9uLCBhbmQgbmFycm93IHRoZSB0eXBlXG4gICAqIG9mIGB0aGlzLm5vZGVgIGlmIHNvLlxuICAgKlxuICAgKiBUaGlzIG5hcnJvd2luZyBnaXZlcyBhY2Nlc3MgdG8gYWRkaXRpb25hbCBtZXRob2RzIHJlbGF0ZWQgdG8gY29tcGxldGlvbiBvZiBwcm9wZXJ0eVxuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG4gIHByaXZhdGUgaXNQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uKHRoaXM6IENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD4pOlxuICAgICAgdGhpcyBpcyBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciB7XG4gICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8XG4gICAgICAgIHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fFxuICAgICAgICBpc0Jyb2tlbkVtcHR5Qm91bmRFdmVudEV4cHJlc3Npb24odGhpcy5ub2RlLCB0aGlzLm5vZGVQYXJlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb21wbGV0aW9ucyBmb3IgcHJvcGVydHkgZXhwcmVzc2lvbnMuXG4gICAqL1xuICBwcml2YXRlIGdldFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fFxuICAgICAgICBpc0Jyb2tlbkVtcHR5Qm91bmRFdmVudEV4cHJlc3Npb24odGhpcy5ub2RlLCB0aGlzLm5vZGVQYXJlbnQpIHx8XG4gICAgICAgIHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE8oYWx4aHViKTogaW1wbGVtZW50IGNvbXBsZXRpb24gb2Ygbm9uLWdsb2JhbCBleHByZXNzaW9ucy5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGV0YWlscyBvZiBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvbkRldGFpbHMoXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcsXG4gICAgICBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fFxuICAgICAgICBpc0Jyb2tlbkVtcHR5Qm91bmRFdmVudEV4cHJlc3Npb24odGhpcy5ub2RlLCB0aGlzLm5vZGVQYXJlbnQpIHx8XG4gICAgICAgIHRoaXMubm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25EZXRhaWxzKFxuICAgICAgICAgIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPKGFseGh1Yik6IGltcGxlbWVudCBjb21wbGV0aW9uIG9mIG5vbi1nbG9iYWwgZXhwcmVzc2lvbnMuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5TeW1ib2xgIGZvciBhIHNwZWNpZmljIGNvbXBsZXRpb24gZm9yIGEgcHJvcGVydHkgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0UHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBuYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5ub2RlIGluc3RhbmNlb2YgRW1wdHlFeHByIHx8IHRoaXMubm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUgfHxcbiAgICAgICAgdGhpcy5ub2RlLnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0R2xvYmFsUHJvcGVydHlFeHByZXNzaW9uQ29tcGxldGlvblN5bWJvbChuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBpbXBsZW1lbnQgY29tcGxldGlvbiBvZiBub24tZ2xvYmFsIGV4cHJlc3Npb25zLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbXBsZXRpb25zIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dCAoZS5nLiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb24oXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8XG4gICAgICB1bmRlZmluZWQpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGxldGlvbnMgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0R2xvYmFsQ29tcGxldGlvbnModGhpcy5jb250ZXh0LCB0aGlzLmNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBsZXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBsZXQgcmVwbGFjZW1lbnRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgLy8gTm9uLWVtcHR5IG5vZGVzIGdldCByZXBsYWNlZCB3aXRoIHRoZSBjb21wbGV0aW9uLlxuICAgIGlmICghKHRoaXMubm9kZSBpbnN0YW5jZW9mIEVtcHR5RXhwciB8fCB0aGlzLm5vZGUgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlKSkge1xuICAgICAgcmVwbGFjZW1lbnRTcGFuID0ge1xuICAgICAgICBzdGFydDogdGhpcy5ub2RlLm5hbWVTcGFuLnN0YXJ0LFxuICAgICAgICBsZW5ndGg6IHRoaXMubm9kZS5uYW1lU3Bhbi5lbmQgLSB0aGlzLm5vZGUubmFtZVNwYW4uc3RhcnQsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE1lcmdlIFRTIGNvbXBsZXRpb24gcmVzdWx0cyB3aXRoIHJlc3VsdHMgZnJvbSB0aGUgdGVtcGxhdGUgc2NvcGUuXG4gICAgbGV0IGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gICAgY29uc3QgdHNMc0NvbXBsZXRpb25zID0gdGhpcy50c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIG9wdGlvbnMpO1xuICAgIGlmICh0c0xzQ29tcGxldGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yIChjb25zdCB0c0NvbXBsZXRpb24gb2YgdHNMc0NvbXBsZXRpb25zLmVudHJpZXMpIHtcbiAgICAgICAgLy8gU2tpcCBjb21wbGV0aW9ucyB0aGF0IGFyZSBzaGFkb3dlZCBieSBhIHRlbXBsYXRlIGVudGl0eSBkZWZpbml0aW9uLlxuICAgICAgICBpZiAodGVtcGxhdGVDb250ZXh0Lmhhcyh0c0NvbXBsZXRpb24ubmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIC4uLnRzQ29tcGxldGlvbixcbiAgICAgICAgICAvLyBTdWJzdGl0dXRlIHRoZSBUUyBjb21wbGV0aW9uJ3MgYHJlcGxhY2VtZW50U3BhbmAgKHdoaWNoIHVzZXMgb2Zmc2V0cyB3aXRoaW4gdGhlIFRDQilcbiAgICAgICAgICAvLyB3aXRoIHRoZSBgcmVwbGFjZW1lbnRTcGFuYCB3aXRoaW4gdGhlIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIGVudGl0eV0gb2YgdGVtcGxhdGVDb250ZXh0KSB7XG4gICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKFxuICAgICAgICAgICAgZW50aXR5LmtpbmQgPT09IENvbXBsZXRpb25LaW5kLlJlZmVyZW5jZSA/IERpc3BsYXlJbmZvS2luZC5SRUZFUkVOQ0UgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERpc3BsYXlJbmZvS2luZC5WQVJJQUJMRSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cmllcyxcbiAgICAgIC8vIEFsdGhvdWdoIHRoaXMgY29tcGxldGlvbiBpcyBcImdsb2JhbFwiIGluIHRoZSBzZW5zZSBvZiBhbiBBbmd1bGFyIGV4cHJlc3Npb24gKHRoZXJlIGlzIG5vXG4gICAgICAvLyBleHBsaWNpdCByZWNlaXZlciksIGl0IGlzIG5vdCBcImdsb2JhbFwiIGluIGEgVHlwZVNjcmlwdCBzZW5zZSBzaW5jZSBBbmd1bGFyIGV4cHJlc3Npb25zIGhhdmVcbiAgICAgIC8vIHRoZSBjb21wb25lbnQgYXMgYW4gaW1wbGljaXQgcmVjZWl2ZXIuXG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiB0cnVlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBkZXRhaWxzIG9mIGEgc3BlY2lmaWMgY29tcGxldGlvbiBmb3IgYSBwcm9wZXJ0eSBleHByZXNzaW9uIGluIGEgZ2xvYmFsIGNvbnRleHQgKGUuZy5cbiAgICogYHt7eXx9fWApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRHbG9iYWxQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uRGV0YWlscyhcbiAgICAgIHRoaXM6IFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25CdWlsZGVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLmNvbnRleHQsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG5cbiAgICBpZiAodGVtcGxhdGVDb250ZXh0LmhhcyhlbnRyeU5hbWUpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHRlbXBsYXRlQ29udGV4dC5nZXQoZW50cnlOYW1lKSE7XG4gICAgICAvLyBFbnRyaWVzIHRoYXQgcmVmZXJlbmNlIGEgc3ltYm9sIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHJlZmVyIGVpdGhlciB0byBsb2NhbCByZWZlcmVuY2VzIG9yXG4gICAgICAvLyB2YXJpYWJsZXMuXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKGVudHJ5Lm5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7a2luZCwgZGlzcGxheVBhcnRzLCBkb2N1bWVudGF0aW9ufSA9XG4gICAgICAgICAgZ2V0RGlzcGxheUluZm8odGhpcy50c0xTLCB0aGlzLnR5cGVDaGVja2VyLCBzeW1ib2wpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoa2luZCksXG4gICAgICAgIG5hbWU6IGVudHJ5TmFtZSxcbiAgICAgICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgIGRvY3VtZW50YXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgY29tcG9uZW50Q29udGV4dC5zaGltUGF0aCwgY29tcG9uZW50Q29udGV4dC5wb3NpdGlvbkluU2hpbUZpbGUsIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAvKiBzb3VyY2UgKi8gdW5kZWZpbmVkLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlN5bWJvbGAgb2YgYSBzcGVjaWZpYyBjb21wbGV0aW9uIGZvciBhIHByb3BlcnR5IGV4cHJlc3Npb24gaW4gYSBnbG9iYWwgY29udGV4dFxuICAgKiAoZS5nLlxuICAgKiBge3t5fH19YCkuXG4gICAqL1xuICBwcml2YXRlIGdldEdsb2JhbFByb3BlcnR5RXhwcmVzc2lvbkNvbXBsZXRpb25TeW1ib2woXG4gICAgICB0aGlzOiBQcm9wZXJ0eUV4cHJlc3Npb25Db21wbGV0aW9uQnVpbGRlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21wbGV0aW9ucyA9IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRHbG9iYWxDb21wbGV0aW9ucyh0aGlzLmNvbnRleHQsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoY29tcGxldGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtjb21wb25lbnRDb250ZXh0LCB0ZW1wbGF0ZUNvbnRleHR9ID0gY29tcGxldGlvbnM7XG4gICAgaWYgKHRlbXBsYXRlQ29udGV4dC5oYXMoZW50cnlOYW1lKSkge1xuICAgICAgY29uc3Qgbm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUgPSB0ZW1wbGF0ZUNvbnRleHQuZ2V0KGVudHJ5TmFtZSkhLm5vZGU7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIHRoaXMuY29tcG9uZW50KSBhc1xuICAgICAgICAgICAgICBUZW1wbGF0ZURlY2xhcmF0aW9uU3ltYm9sIHxcbiAgICAgICAgICBudWxsO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzeW1ib2wudHNTeW1ib2w7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgICAgIGNvbXBvbmVudENvbnRleHQuc2hpbVBhdGgsIGNvbXBvbmVudENvbnRleHQucG9zaXRpb25JblNoaW1GaWxlLCBlbnRyeU5hbWUsXG4gICAgICAgICAgLyogc291cmNlICovIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIGBub2RlYCBpcyAobW9zdCBsaWtlbHkpIGEgc3ludGhldGljIG5vZGUgY3JlYXRlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyXG4gKiBmb3IgYW4gZW1wdHkgZXZlbnQgYmluZGluZyBgKGV2ZW50KT1cIlwiYC5cbiAqXG4gKiBXaGVuIHBhcnNpbmcgc3VjaCBhbiBleHByZXNzaW9uLCBhIHN5bnRoZXRpYyBgTGl0ZXJhbFByaW1pdGl2ZWAgbm9kZSBpcyBnZW5lcmF0ZWQgZm9yIHRoZVxuICogYEJvdW5kRXZlbnRgJ3MgaGFuZGxlciB3aXRoIHRoZSBsaXRlcmFsIHRleHQgdmFsdWUgJ0VSUk9SJy4gRGV0ZWN0aW5nIHRoaXMgY2FzZSBpcyBjcnVjaWFsIHRvXG4gKiBzdXBwb3J0aW5nIGNvbXBsZXRpb25zIHdpdGhpbiBlbXB0eSBldmVudCBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gaXNCcm9rZW5FbXB0eUJvdW5kRXZlbnRFeHByZXNzaW9uKFxuICAgIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcGFyZW50OiBUbXBsQXN0Tm9kZXxBU1R8bnVsbCk6IG5vZGUgaXMgTGl0ZXJhbFByaW1pdGl2ZSB7XG4gIHJldHVybiBub2RlIGluc3RhbmNlb2YgTGl0ZXJhbFByaW1pdGl2ZSAmJiBwYXJlbnQgIT09IG51bGwgJiYgcGFyZW50IGluc3RhbmNlb2YgQm91bmRFdmVudCAmJlxuICAgICAgbm9kZS52YWx1ZSA9PT0gJ0VSUk9SJztcbn1cbiJdfQ==