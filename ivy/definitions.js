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
        define("@angular/language-service/ivy/definitions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/ts_utils", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefinitionBuilder = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var ts = require("typescript");
    var template_target_1 = require("@angular/language-service/ivy/template_target");
    var ts_utils_1 = require("@angular/language-service/ivy/ts_utils");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var DefinitionBuilder = /** @class */ (function () {
        function DefinitionBuilder(tsLS, compiler) {
            this.tsLS = tsLS;
            this.compiler = compiler;
        }
        DefinitionBuilder.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
            var e_1, _a;
            var _b;
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, this.compiler);
            if (templateInfo === undefined) {
                // We were unable to get a template at the given position. If we are in a TS file, instead
                // attempt to get an Angular definition at the location inside a TS file (examples of this
                // would be templateUrl or a url in styleUrls).
                if (!utils_1.isTypeScriptFile(fileName)) {
                    return;
                }
                return getDefinitionForExpressionAtPosition(fileName, position, this.compiler);
            }
            var definitionMetas = this.getDefinitionMetaAtPosition(templateInfo, position);
            if (definitionMetas === undefined) {
                return undefined;
            }
            var definitions = [];
            try {
                for (var definitionMetas_1 = tslib_1.__values(definitionMetas), definitionMetas_1_1 = definitionMetas_1.next(); !definitionMetas_1_1.done; definitionMetas_1_1 = definitionMetas_1.next()) {
                    var definitionMeta = definitionMetas_1_1.value;
                    // The `$event` of event handlers would point to the $event parameter in the shim file, as in
                    // `_outputHelper(_t3["x"]).subscribe(function ($event): any { $event }) ;`
                    // If we wanted to return something for this, it would be more appropriate for something like
                    // `getTypeDefinition`.
                    if (utils_1.isDollarEvent(definitionMeta.node)) {
                        continue;
                    }
                    definitions.push.apply(definitions, tslib_1.__spread(((_b = this.getDefinitionsForSymbol(tslib_1.__assign(tslib_1.__assign({}, definitionMeta), templateInfo))) !== null && _b !== void 0 ? _b : [])));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (definitionMetas_1_1 && !definitionMetas_1_1.done && (_a = definitionMetas_1.return)) _a.call(definitionMetas_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (definitions.length === 0) {
                return undefined;
            }
            return { definitions: definitions, textSpan: utils_1.getTextSpanOfNode(definitionMetas[0].node) };
        };
        DefinitionBuilder.prototype.getDefinitionsForSymbol = function (_a) {
            var symbol = _a.symbol, node = _a.node, parent = _a.parent, component = _a.component;
            switch (symbol.kind) {
                case api_1.SymbolKind.Directive:
                case api_1.SymbolKind.Element:
                case api_1.SymbolKind.Template:
                case api_1.SymbolKind.DomBinding:
                    // Though it is generally more appropriate for the above symbol definitions to be
                    // associated with "type definitions" since the location in the template is the
                    // actual definition location, the better user experience would be to allow
                    // LS users to "go to definition" on an item in the template that maps to a class and be
                    // taken to the directive or HTML class.
                    return this.getTypeDefinitionsForTemplateInstance(symbol, node);
                case api_1.SymbolKind.Pipe: {
                    if (symbol.tsSymbol !== null) {
                        return this.getDefinitionsForSymbols(symbol);
                    }
                    else {
                        // If there is no `ts.Symbol` for the pipe transform, we want to return the
                        // type definition (the pipe class).
                        return this.getTypeDefinitionsForSymbols(symbol.classSymbol);
                    }
                }
                case api_1.SymbolKind.Output:
                case api_1.SymbolKind.Input: {
                    var bindingDefs = this.getDefinitionsForSymbols.apply(this, tslib_1.__spread(symbol.bindings));
                    // Also attempt to get directive matches for the input name. If there is a directive that
                    // has the input name as part of the selector, we want to return that as well.
                    var directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, parent, component);
                    return tslib_1.__spread(bindingDefs, directiveDefs);
                }
                case api_1.SymbolKind.Variable:
                case api_1.SymbolKind.Reference: {
                    var definitions = [];
                    if (symbol.declaration !== node) {
                        definitions.push({
                            name: symbol.declaration.name,
                            containerName: '',
                            containerKind: ts.ScriptElementKind.unknown,
                            kind: ts.ScriptElementKind.variableElement,
                            textSpan: utils_1.getTextSpanOfNode(symbol.declaration),
                            contextSpan: utils_1.toTextSpan(symbol.declaration.sourceSpan),
                            fileName: symbol.declaration.sourceSpan.start.file.url,
                        });
                    }
                    if (symbol.kind === api_1.SymbolKind.Variable) {
                        definitions.push.apply(definitions, tslib_1.__spread(this.getDefinitionsForSymbols({ shimLocation: symbol.initializerLocation })));
                    }
                    return definitions;
                }
                case api_1.SymbolKind.Expression: {
                    return this.getDefinitionsForSymbols(symbol);
                }
            }
        };
        DefinitionBuilder.prototype.getDefinitionsForSymbols = function () {
            var _this = this;
            var symbols = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                symbols[_i] = arguments[_i];
            }
            return utils_1.flatMap(symbols, function (_a) {
                var _b;
                var shimLocation = _a.shimLocation;
                var shimPath = shimLocation.shimPath, positionInShimFile = shimLocation.positionInShimFile;
                return (_b = _this.tsLS.getDefinitionAtPosition(shimPath, positionInShimFile)) !== null && _b !== void 0 ? _b : [];
            });
        };
        DefinitionBuilder.prototype.getTypeDefinitionsAtPosition = function (fileName, position) {
            var e_2, _a;
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, this.compiler);
            if (templateInfo === undefined) {
                return;
            }
            var definitionMetas = this.getDefinitionMetaAtPosition(templateInfo, position);
            if (definitionMetas === undefined) {
                return undefined;
            }
            var definitions = [];
            try {
                for (var definitionMetas_2 = tslib_1.__values(definitionMetas), definitionMetas_2_1 = definitionMetas_2.next(); !definitionMetas_2_1.done; definitionMetas_2_1 = definitionMetas_2.next()) {
                    var _b = definitionMetas_2_1.value, symbol = _b.symbol, node = _b.node, parent_1 = _b.parent;
                    switch (symbol.kind) {
                        case api_1.SymbolKind.Directive:
                        case api_1.SymbolKind.DomBinding:
                        case api_1.SymbolKind.Element:
                        case api_1.SymbolKind.Template:
                            definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForTemplateInstance(symbol, node)));
                            break;
                        case api_1.SymbolKind.Output:
                        case api_1.SymbolKind.Input: {
                            var bindingDefs = this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(symbol.bindings));
                            definitions.push.apply(definitions, tslib_1.__spread(bindingDefs));
                            // Also attempt to get directive matches for the input name. If there is a directive that
                            // has the input name as part of the selector, we want to return that as well.
                            var directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, parent_1, templateInfo.component);
                            definitions.push.apply(definitions, tslib_1.__spread(directiveDefs));
                            break;
                        }
                        case api_1.SymbolKind.Pipe: {
                            if (symbol.tsSymbol !== null) {
                                definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForSymbols(symbol)));
                            }
                            else {
                                // If there is no `ts.Symbol` for the pipe transform, we want to return the
                                // type definition (the pipe class).
                                definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForSymbols(symbol.classSymbol)));
                            }
                            break;
                        }
                        case api_1.SymbolKind.Reference:
                            definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForSymbols({ shimLocation: symbol.targetLocation })));
                            break;
                        case api_1.SymbolKind.Expression:
                            definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForSymbols(symbol)));
                            break;
                        case api_1.SymbolKind.Variable: {
                            definitions.push.apply(definitions, tslib_1.__spread(this.getTypeDefinitionsForSymbols({ shimLocation: symbol.initializerLocation })));
                            break;
                        }
                    }
                    return definitions;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (definitionMetas_2_1 && !definitionMetas_2_1.done && (_a = definitionMetas_2.return)) _a.call(definitionMetas_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        DefinitionBuilder.prototype.getTypeDefinitionsForTemplateInstance = function (symbol, node) {
            switch (symbol.kind) {
                case api_1.SymbolKind.Template: {
                    var matches = utils_1.getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
                    return this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(matches));
                }
                case api_1.SymbolKind.Element: {
                    var matches = utils_1.getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
                    // If one of the directive matches is a component, we should not include the native element
                    // in the results because it is replaced by the component.
                    return Array.from(matches).some(function (dir) { return dir.isComponent; }) ? this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(matches)) : this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(matches, [symbol]));
                }
                case api_1.SymbolKind.DomBinding: {
                    if (!(node instanceof compiler_1.TmplAstTextAttribute)) {
                        return [];
                    }
                    var dirs = utils_1.getDirectiveMatchesForAttribute(node.name, symbol.host.templateNode, symbol.host.directives);
                    return this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(dirs));
                }
                case api_1.SymbolKind.Directive:
                    return this.getTypeDefinitionsForSymbols(symbol);
            }
        };
        DefinitionBuilder.prototype.getDirectiveTypeDefsForBindingNode = function (node, parent, component) {
            if (!(node instanceof compiler_1.TmplAstBoundAttribute) && !(node instanceof compiler_1.TmplAstTextAttribute) &&
                !(node instanceof compiler_1.TmplAstBoundEvent)) {
                return [];
            }
            if (parent === null ||
                !(parent instanceof compiler_1.TmplAstTemplate || parent instanceof compiler_1.TmplAstElement)) {
                return [];
            }
            var templateOrElementSymbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(parent, component);
            if (templateOrElementSymbol === null ||
                (templateOrElementSymbol.kind !== api_1.SymbolKind.Template &&
                    templateOrElementSymbol.kind !== api_1.SymbolKind.Element)) {
                return [];
            }
            var dirs = utils_1.getDirectiveMatchesForAttribute(node.name, parent, templateOrElementSymbol.directives);
            return this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(dirs));
        };
        DefinitionBuilder.prototype.getTypeDefinitionsForSymbols = function () {
            var _this = this;
            var symbols = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                symbols[_i] = arguments[_i];
            }
            return utils_1.flatMap(symbols, function (_a) {
                var _b;
                var shimLocation = _a.shimLocation;
                var shimPath = shimLocation.shimPath, positionInShimFile = shimLocation.positionInShimFile;
                return (_b = _this.tsLS.getTypeDefinitionAtPosition(shimPath, positionInShimFile)) !== null && _b !== void 0 ? _b : [];
            });
        };
        DefinitionBuilder.prototype.getDefinitionMetaAtPosition = function (_a, position) {
            var e_3, _b;
            var template = _a.template, component = _a.component;
            var target = template_target_1.getTargetAtPosition(template, position);
            if (target === null) {
                return undefined;
            }
            var context = target.context, parent = target.parent;
            var nodes = context.kind === template_target_1.TargetNodeKind.TwoWayBindingContext ? context.nodes : [context.node];
            var definitionMetas = [];
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(node, component);
                    if (symbol === null) {
                        continue;
                    }
                    definitionMetas.push({ node: node, parent: parent, symbol: symbol });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_b = nodes_1.return)) _b.call(nodes_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return definitionMetas.length > 0 ? definitionMetas : undefined;
        };
        return DefinitionBuilder;
    }());
    exports.DefinitionBuilder = DefinitionBuilder;
    /**
     * Gets an Angular-specific definition in a TypeScript source file.
     */
    function getDefinitionForExpressionAtPosition(fileName, position, compiler) {
        var sf = compiler.getNextProgram().getSourceFile(fileName);
        if (sf === undefined) {
            return;
        }
        var expression = ts_utils_1.findTightestNode(sf, position);
        if (expression === undefined) {
            return;
        }
        var classDeclaration = ts_utils_1.getParentClassDeclaration(expression);
        if (classDeclaration === undefined) {
            return;
        }
        var componentResources = compiler.getComponentResources(classDeclaration);
        if (componentResources === null) {
            return;
        }
        var allResources = tslib_1.__spread(componentResources.styles, [componentResources.template]);
        var resourceForExpression = allResources.find(function (resource) { return resource.expression === expression; });
        if (resourceForExpression === undefined || !metadata_1.isExternalResource(resourceForExpression)) {
            return;
        }
        var templateDefinitions = [{
                kind: ts.ScriptElementKind.externalModuleName,
                name: resourceForExpression.path,
                containerKind: ts.ScriptElementKind.unknown,
                containerName: '',
                // Reading the template is expensive, so don't provide a preview.
                // TODO(ayazhafiz): Consider providing an actual span:
                //  1. We're likely to read the template anyway
                //  2. We could show just the first 100 chars or so
                textSpan: { start: 0, length: 0 },
                fileName: resourceForExpression.path,
            }];
        return {
            definitions: templateDefinitions,
            textSpan: {
                // Exclude opening and closing quotes in the url span.
                start: expression.getStart() + 1,
                length: expression.getWidth() - 2,
            },
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9KO0lBRXBKLHFFQUE0RTtJQUM1RSxxRUFBaUs7SUFDakssK0JBQWlDO0lBRWpDLGlGQUFzRTtJQUN0RSxtRUFBdUU7SUFDdkUsNkRBQTRNO0lBWTVNO1FBQ0UsMkJBQTZCLElBQXdCLEVBQW1CLFFBQW9CO1lBQS9ELFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7UUFBRyxDQUFDO1FBRWhHLHFEQUF5QixHQUF6QixVQUEwQixRQUFnQixFQUFFLFFBQWdCOzs7WUFFMUQsSUFBTSxZQUFZLEdBQUcsaUNBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEYsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO2dCQUM5QiwwRkFBMEY7Z0JBQzFGLDBGQUEwRjtnQkFDMUYsK0NBQStDO2dCQUMvQyxJQUFJLENBQUMsd0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQy9CLE9BQU87aUJBQ1I7Z0JBQ0QsT0FBTyxvQ0FBb0MsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNoRjtZQUNELElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakYsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO2dCQUNqQyxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7O2dCQUM1QyxLQUE2QixJQUFBLG9CQUFBLGlCQUFBLGVBQWUsQ0FBQSxn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LENBQUMsRUFBRTtZQUNyRixPQUFPO1NBQ1I7UUFFRCxJQUFNLG1CQUFtQixHQUF3QixDQUFDO2dCQUNoRCxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQjtnQkFDN0MsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUk7Z0JBQ2hDLGFBQWEsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTztnQkFDM0MsYUFBYSxFQUFFLEVBQUU7Z0JBQ2pCLGlFQUFpRTtnQkFDakUsc0RBQXNEO2dCQUN0RCwrQ0FBK0M7Z0JBQy9DLG1EQUFtRDtnQkFDbkQsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDO2dCQUMvQixRQUFRLEVBQUUscUJBQXFCLENBQUMsSUFBSTthQUNyQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxRQUFRLEVBQUU7Z0JBQ1Isc0RBQXNEO2dCQUN0RCxLQUFLLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7Z0JBQ2hDLE1BQU0sRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUNsQztTQUNGLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7aXNFeHRlcm5hbFJlc291cmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9uLCBUYXJnZXROb2RlS2luZH0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXRQYXJlbnRDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuL3RzX3V0aWxzJztcbmltcG9ydCB7ZmxhdE1hcCwgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZSwgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcsIGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGdldFRleHRTcGFuT2ZOb2RlLCBpc0RvbGxhckV2ZW50LCBpc1R5cGVTY3JpcHRGaWxlLCBUZW1wbGF0ZUluZm8sIHRvVGV4dFNwYW59IGZyb20gJy4vdXRpbHMnO1xuXG5pbnRlcmZhY2UgRGVmaW5pdGlvbk1ldGEge1xuICBub2RlOiBBU1R8VG1wbEFzdE5vZGU7XG4gIHBhcmVudDogQVNUfFRtcGxBc3ROb2RlfG51bGw7XG4gIHN5bWJvbDogU3ltYm9sO1xufVxuXG5pbnRlcmZhY2UgSGFzU2hpbUxvY2F0aW9uIHtcbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG5cbmV4cG9ydCBjbGFzcyBEZWZpbml0aW9uQnVpbGRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyKSB7fVxuXG4gIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBXZSB3ZXJlIHVuYWJsZSB0byBnZXQgYSB0ZW1wbGF0ZSBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uIElmIHdlIGFyZSBpbiBhIFRTIGZpbGUsIGluc3RlYWRcbiAgICAgIC8vIGF0dGVtcHQgdG8gZ2V0IGFuIEFuZ3VsYXIgZGVmaW5pdGlvbiBhdCB0aGUgbG9jYXRpb24gaW5zaWRlIGEgVFMgZmlsZSAoZXhhbXBsZXMgb2YgdGhpc1xuICAgICAgLy8gd291bGQgYmUgdGVtcGxhdGVVcmwgb3IgYSB1cmwgaW4gc3R5bGVVcmxzKS5cbiAgICAgIGlmICghaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGdldERlZmluaXRpb25Gb3JFeHByZXNzaW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIH1cbiAgICBjb25zdCBkZWZpbml0aW9uTWV0YXMgPSB0aGlzLmdldERlZmluaXRpb25NZXRhQXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICBpZiAoZGVmaW5pdGlvbk1ldGFzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW107XG4gICAgZm9yIChjb25zdCBkZWZpbml0aW9uTWV0YSBvZiBkZWZpbml0aW9uTWV0YXMpIHtcbiAgICAgIC8vIFRoZSBgJGV2ZW50YCBvZiBldmVudCBoYW5kbGVycyB3b3VsZCBwb2ludCB0byB0aGUgJGV2ZW50IHBhcmFtZXRlciBpbiB0aGUgc2hpbSBmaWxlLCBhcyBpblxuICAgICAgLy8gYF9vdXRwdXRIZWxwZXIoX3QzW1wieFwiXSkuc3Vic2NyaWJlKGZ1bmN0aW9uICgkZXZlbnQpOiBhbnkgeyAkZXZlbnQgfSkgO2BcbiAgICAgIC8vIElmIHdlIHdhbnRlZCB0byByZXR1cm4gc29tZXRoaW5nIGZvciB0aGlzLCBpdCB3b3VsZCBiZSBtb3JlIGFwcHJvcHJpYXRlIGZvciBzb21ldGhpbmcgbGlrZVxuICAgICAgLy8gYGdldFR5cGVEZWZpbml0aW9uYC5cbiAgICAgIGlmIChpc0RvbGxhckV2ZW50KGRlZmluaXRpb25NZXRhLm5vZGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkZWZpbml0aW9ucy5wdXNoKFxuICAgICAgICAgIC4uLih0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9sKHsuLi5kZWZpbml0aW9uTWV0YSwgLi4udGVtcGxhdGVJbmZvfSkgPz8gW10pKTtcbiAgICB9XG5cbiAgICBpZiAoZGVmaW5pdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7ZGVmaW5pdGlvbnMsIHRleHRTcGFuOiBnZXRUZXh0U3Bhbk9mTm9kZShkZWZpbml0aW9uTWV0YXNbMF0ubm9kZSl9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uc0ZvclN5bWJvbCh7c3ltYm9sLCBub2RlLCBwYXJlbnQsIGNvbXBvbmVudH06IERlZmluaXRpb25NZXRhJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5mbyk6IHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgICAgLy8gVGhvdWdoIGl0IGlzIGdlbmVyYWxseSBtb3JlIGFwcHJvcHJpYXRlIGZvciB0aGUgYWJvdmUgc3ltYm9sIGRlZmluaXRpb25zIHRvIGJlXG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBcInR5cGUgZGVmaW5pdGlvbnNcIiBzaW5jZSB0aGUgbG9jYXRpb24gaW4gdGhlIHRlbXBsYXRlIGlzIHRoZVxuICAgICAgICAvLyBhY3R1YWwgZGVmaW5pdGlvbiBsb2NhdGlvbiwgdGhlIGJldHRlciB1c2VyIGV4cGVyaWVuY2Ugd291bGQgYmUgdG8gYWxsb3dcbiAgICAgICAgLy8gTFMgdXNlcnMgdG8gXCJnbyB0byBkZWZpbml0aW9uXCIgb24gYW4gaXRlbSBpbiB0aGUgdGVtcGxhdGUgdGhhdCBtYXBzIHRvIGEgY2xhc3MgYW5kIGJlXG4gICAgICAgIC8vIHRha2VuIHRvIHRoZSBkaXJlY3RpdmUgb3IgSFRNTCBjbGFzcy5cbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yVGVtcGxhdGVJbnN0YW5jZShzeW1ib2wsIG5vZGUpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlBpcGU6IHtcbiAgICAgICAgaWYgKHN5bWJvbC50c1N5bWJvbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGB0cy5TeW1ib2xgIGZvciB0aGUgcGlwZSB0cmFuc2Zvcm0sIHdlIHdhbnQgdG8gcmV0dXJuIHRoZVxuICAgICAgICAgIC8vIHR5cGUgZGVmaW5pdGlvbiAodGhlIHBpcGUgY2xhc3MpLlxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sLmNsYXNzU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDoge1xuICAgICAgICBjb25zdCBiaW5kaW5nRGVmcyA9IHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbC5iaW5kaW5ncyk7XG4gICAgICAgIC8vIEFsc28gYXR0ZW1wdCB0byBnZXQgZGlyZWN0aXZlIG1hdGNoZXMgZm9yIHRoZSBpbnB1dCBuYW1lLiBJZiB0aGVyZSBpcyBhIGRpcmVjdGl2ZSB0aGF0XG4gICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVEZWZzID0gdGhpcy5nZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKG5vZGUsIHBhcmVudCwgY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuIFsuLi5iaW5kaW5nRGVmcywgLi4uZGlyZWN0aXZlRGVmc107XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOiB7XG4gICAgICAgIGNvbnN0IGRlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW107XG4gICAgICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb24gIT09IG5vZGUpIHtcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IHN5bWJvbC5kZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgY29udGFpbmVyTmFtZTogJycsXG4gICAgICAgICAgICBjb250YWluZXJLaW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgICAgICAgICAga2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudmFyaWFibGVFbGVtZW50LFxuICAgICAgICAgICAgdGV4dFNwYW46IGdldFRleHRTcGFuT2ZOb2RlKHN5bWJvbC5kZWNsYXJhdGlvbiksXG4gICAgICAgICAgICBjb250ZXh0U3BhbjogdG9UZXh0U3BhbihzeW1ib2wuZGVjbGFyYXRpb24uc291cmNlU3BhbiksXG4gICAgICAgICAgICBmaWxlTmFtZTogc3ltYm9sLmRlY2xhcmF0aW9uLnNvdXJjZVNwYW4uc3RhcnQuZmlsZS51cmwsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN5bWJvbC5raW5kID09PSBTeW1ib2xLaW5kLlZhcmlhYmxlKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoe3NoaW1Mb2NhdGlvbjogc3ltYm9sLmluaXRpYWxpemVyTG9jYXRpb259KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmluaXRpb25zO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkV4cHJlc3Npb246IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uc3ltYm9sczogSGFzU2hpbUxvY2F0aW9uW10pOiB0cy5EZWZpbml0aW9uSW5mb1tdIHtcbiAgICByZXR1cm4gZmxhdE1hcChzeW1ib2xzLCAoe3NoaW1Mb2NhdGlvbn0pID0+IHtcbiAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHNoaW1Mb2NhdGlvbjtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW107XG4gICAgfSk7XG4gIH1cblxuICBnZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZGVmaW5pdGlvbk1ldGFzID0gdGhpcy5nZXREZWZpbml0aW9uTWV0YUF0UG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGRlZmluaXRpb25NZXRhcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW107XG4gICAgZm9yIChjb25zdCB7c3ltYm9sLCBub2RlLCBwYXJlbnR9IG9mIGRlZmluaXRpb25NZXRhcykge1xuICAgICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5UZW1wbGF0ZTpcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKC4uLnRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yVGVtcGxhdGVJbnN0YW5jZShzeW1ib2wsIG5vZGUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OiB7XG4gICAgICAgICAgY29uc3QgYmluZGluZ0RlZnMgPSB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uc3ltYm9sLmJpbmRpbmdzKTtcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKC4uLmJpbmRpbmdEZWZzKTtcbiAgICAgICAgICAvLyBBbHNvIGF0dGVtcHQgdG8gZ2V0IGRpcmVjdGl2ZSBtYXRjaGVzIGZvciB0aGUgaW5wdXQgbmFtZS4gSWYgdGhlcmUgaXMgYSBkaXJlY3RpdmUgdGhhdFxuICAgICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZURlZnMgPVxuICAgICAgICAgICAgICB0aGlzLmdldERpcmVjdGl2ZVR5cGVEZWZzRm9yQmluZGluZ05vZGUobm9kZSwgcGFyZW50LCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50KTtcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKC4uLmRpcmVjdGl2ZURlZnMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5QaXBlOiB7XG4gICAgICAgICAgaWYgKHN5bWJvbC50c1N5bWJvbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZGVmaW5pdGlvbnMucHVzaCguLi50aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGB0cy5TeW1ib2xgIGZvciB0aGUgcGlwZSB0cmFuc2Zvcm0sIHdlIHdhbnQgdG8gcmV0dXJuIHRoZVxuICAgICAgICAgICAgLy8gdHlwZSBkZWZpbml0aW9uICh0aGUgcGlwZSBjbGFzcykuXG4gICAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKC4uLnRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wuY2xhc3NTeW1ib2wpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZTpcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICAuLi50aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoe3NoaW1Mb2NhdGlvbjogc3ltYm9sLnRhcmdldExvY2F0aW9ufSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRXhwcmVzc2lvbjpcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKC4uLnRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOiB7XG4gICAgICAgICAgZGVmaW5pdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHtzaGltTG9jYXRpb246IHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9ufSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5pdGlvbnM7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JUZW1wbGF0ZUluc3RhbmNlKFxuICAgICAgc3ltYm9sOiBUZW1wbGF0ZVN5bWJvbHxFbGVtZW50U3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8RGlyZWN0aXZlU3ltYm9sLFxuICAgICAgbm9kZTogQVNUfFRtcGxBc3ROb2RlKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOiB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIGlzIGEgY29tcG9uZW50LCB3ZSBzaG91bGQgbm90IGluY2x1ZGUgdGhlIG5hdGl2ZSBlbGVtZW50XG4gICAgICAgIC8vIGluIHRoZSByZXN1bHRzIGJlY2F1c2UgaXQgaXMgcmVwbGFjZWQgYnkgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20obWF0Y2hlcykuc29tZShkaXIgPT4gZGlyLmlzQ29tcG9uZW50KSA/XG4gICAgICAgICAgICB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcykgOlxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLm1hdGNoZXMsIHN5bWJvbCk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzoge1xuICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcnMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgICAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlVHlwZURlZnNGb3JCaW5kaW5nTm9kZShcbiAgICAgIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcGFyZW50OiBUbXBsQXN0Tm9kZXxBU1R8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmXG4gICAgICAgICEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAocGFyZW50ID09PSBudWxsIHx8XG4gICAgICAgICEocGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbCA9XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFN5bWJvbE9mTm9kZShwYXJlbnQsIGNvbXBvbmVudCk7XG4gICAgaWYgKHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sID09PSBudWxsIHx8XG4gICAgICAgICh0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLlRlbXBsYXRlICYmXG4gICAgICAgICB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLkVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGRpcnMgPVxuICAgICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKG5vZGUubmFtZSwgcGFyZW50LCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbHM6IEhhc1NoaW1Mb2NhdGlvbltdKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgcmV0dXJuIGZsYXRNYXAoc3ltYm9scywgKHtzaGltTG9jYXRpb259KSA9PiB7XG4gICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzaGltTG9jYXRpb247XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKSA/PyBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVmaW5pdGlvbk1ldGFBdFBvc2l0aW9uKHt0ZW1wbGF0ZSwgY29tcG9uZW50fTogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIERlZmluaXRpb25NZXRhW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0YXJnZXQgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qge2NvbnRleHQsIHBhcmVudH0gPSB0YXJnZXQ7XG5cbiAgICBjb25zdCBub2RlcyA9XG4gICAgICAgIGNvbnRleHQua2luZCA9PT0gVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQgPyBjb250ZXh0Lm5vZGVzIDogW2NvbnRleHQubm9kZV07XG5cblxuICAgIGNvbnN0IGRlZmluaXRpb25NZXRhczogRGVmaW5pdGlvbk1ldGFbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCk7XG4gICAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZGVmaW5pdGlvbk1ldGFzLnB1c2goe25vZGUsIHBhcmVudCwgc3ltYm9sfSk7XG4gICAgfVxuICAgIHJldHVybiBkZWZpbml0aW9uTWV0YXMubGVuZ3RoID4gMCA/IGRlZmluaXRpb25NZXRhcyA6IHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIEdldHMgYW4gQW5ndWxhci1zcGVjaWZpYyBkZWZpbml0aW9uIGluIGEgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkZvckV4cHJlc3Npb25BdFBvc2l0aW9uKFxuICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3Qgc2YgPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmIChleHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IGdldFBhcmVudENsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbik7XG4gIGlmIChjbGFzc0RlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY29tcG9uZW50UmVzb3VyY2VzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbGFyYXRpb24pO1xuICBpZiAoY29tcG9uZW50UmVzb3VyY2VzID09PSBudWxsKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYWxsUmVzb3VyY2VzID0gWy4uLmNvbXBvbmVudFJlc291cmNlcy5zdHlsZXMsIGNvbXBvbmVudFJlc291cmNlcy50ZW1wbGF0ZV07XG5cbiAgY29uc3QgcmVzb3VyY2VGb3JFeHByZXNzaW9uID0gYWxsUmVzb3VyY2VzLmZpbmQocmVzb3VyY2UgPT4gcmVzb3VyY2UuZXhwcmVzc2lvbiA9PT0gZXhwcmVzc2lvbik7XG4gIGlmIChyZXNvdXJjZUZvckV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCB8fCAhaXNFeHRlcm5hbFJlc291cmNlKHJlc291cmNlRm9yRXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0ZW1wbGF0ZURlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW3tcbiAgICBraW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC5leHRlcm5hbE1vZHVsZU5hbWUsXG4gICAgbmFtZTogcmVzb3VyY2VGb3JFeHByZXNzaW9uLnBhdGgsXG4gICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICBjb250YWluZXJOYW1lOiAnJyxcbiAgICAvLyBSZWFkaW5nIHRoZSB0ZW1wbGF0ZSBpcyBleHBlbnNpdmUsIHNvIGRvbid0IHByb3ZpZGUgYSBwcmV2aWV3LlxuICAgIC8vIFRPRE8oYXlhemhhZml6KTogQ29uc2lkZXIgcHJvdmlkaW5nIGFuIGFjdHVhbCBzcGFuOlxuICAgIC8vICAxLiBXZSdyZSBsaWtlbHkgdG8gcmVhZCB0aGUgdGVtcGxhdGUgYW55d2F5XG4gICAgLy8gIDIuIFdlIGNvdWxkIHNob3cganVzdCB0aGUgZmlyc3QgMTAwIGNoYXJzIG9yIHNvXG4gICAgdGV4dFNwYW46IHtzdGFydDogMCwgbGVuZ3RoOiAwfSxcbiAgICBmaWxlTmFtZTogcmVzb3VyY2VGb3JFeHByZXNzaW9uLnBhdGgsXG4gIH1dO1xuXG4gIHJldHVybiB7XG4gICAgZGVmaW5pdGlvbnM6IHRlbXBsYXRlRGVmaW5pdGlvbnMsXG4gICAgdGV4dFNwYW46IHtcbiAgICAgIC8vIEV4Y2x1ZGUgb3BlbmluZyBhbmQgY2xvc2luZyBxdW90ZXMgaW4gdGhlIHVybCBzcGFuLlxuICAgICAgc3RhcnQ6IGV4cHJlc3Npb24uZ2V0U3RhcnQoKSArIDEsXG4gICAgICBsZW5ndGg6IGV4cHJlc3Npb24uZ2V0V2lkdGgoKSAtIDIsXG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==