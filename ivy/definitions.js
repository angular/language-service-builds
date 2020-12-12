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
            var definitionMeta = this.getDefinitionMetaAtPosition(templateInfo, position);
            // The `$event` of event handlers would point to the $event parameter in the shim file, as in
            // `_outputHelper(_t3["x"]).subscribe(function ($event): any { $event }) ;`
            // If we wanted to return something for this, it would be more appropriate for something like
            // `getTypeDefinition`.
            if (definitionMeta === undefined || utils_1.isDollarEvent(definitionMeta.node)) {
                return undefined;
            }
            var definitions = this.getDefinitionsForSymbol(tslib_1.__assign(tslib_1.__assign({}, definitionMeta), templateInfo));
            return { definitions: definitions, textSpan: utils_1.getTextSpanOfNode(definitionMeta.node) };
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
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, this.compiler);
            if (templateInfo === undefined) {
                return;
            }
            var definitionMeta = this.getDefinitionMetaAtPosition(templateInfo, position);
            if (definitionMeta === undefined) {
                return undefined;
            }
            var symbol = definitionMeta.symbol, node = definitionMeta.node;
            switch (symbol.kind) {
                case api_1.SymbolKind.Directive:
                case api_1.SymbolKind.DomBinding:
                case api_1.SymbolKind.Element:
                case api_1.SymbolKind.Template:
                    return this.getTypeDefinitionsForTemplateInstance(symbol, node);
                case api_1.SymbolKind.Output:
                case api_1.SymbolKind.Input: {
                    var bindingDefs = this.getTypeDefinitionsForSymbols.apply(this, tslib_1.__spread(symbol.bindings));
                    // Also attempt to get directive matches for the input name. If there is a directive that
                    // has the input name as part of the selector, we want to return that as well.
                    var directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, definitionMeta.parent, templateInfo.component);
                    return tslib_1.__spread(bindingDefs, directiveDefs);
                }
                case api_1.SymbolKind.Pipe: {
                    if (symbol.tsSymbol !== null) {
                        return this.getTypeDefinitionsForSymbols(symbol);
                    }
                    else {
                        // If there is no `ts.Symbol` for the pipe transform, we want to return the
                        // type definition (the pipe class).
                        return this.getTypeDefinitionsForSymbols(symbol.classSymbol);
                    }
                }
                case api_1.SymbolKind.Reference:
                    return this.getTypeDefinitionsForSymbols({ shimLocation: symbol.targetLocation });
                case api_1.SymbolKind.Expression:
                    return this.getTypeDefinitionsForSymbols(symbol);
                case api_1.SymbolKind.Variable:
                    return this.getTypeDefinitionsForSymbols({ shimLocation: symbol.initializerLocation });
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
            var template = _a.template, component = _a.component;
            var target = template_target_1.getTargetAtPosition(template, position);
            if (target === null) {
                return undefined;
            }
            var node = target.node, parent = target.parent;
            var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(node, component);
            if (symbol === null) {
                return undefined;
            }
            return { node: node, parent: parent, symbol: symbol };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9KO0lBRXBKLHFFQUE0RTtJQUM1RSxxRUFBaUs7SUFDakssK0JBQWlDO0lBRWpDLGlGQUFzRDtJQUN0RCxtRUFBdUU7SUFDdkUsNkRBQTRNO0lBWTVNO1FBQ0UsMkJBQTZCLElBQXdCLEVBQW1CLFFBQW9CO1lBQS9ELFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7UUFBRyxDQUFDO1FBRWhHLHFEQUF5QixHQUF6QixVQUEwQixRQUFnQixFQUFFLFFBQWdCO1lBRTFELElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsMEZBQTBGO2dCQUMxRiwwRkFBMEY7Z0JBQzFGLCtDQUErQztnQkFDL0MsSUFBSSxDQUFDLHdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUMvQixPQUFPO2lCQUNSO2dCQUNELE9BQU8sb0NBQW9DLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDaEY7WUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hGLDZGQUE2RjtZQUM3RiwyRUFBMkU7WUFDM0UsNkZBQTZGO1lBQzdGLHVCQUF1QjtZQUN2QixJQUFJLGNBQWMsS0FBSyxTQUFTLElBQUkscUJBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RFLE9BQU8sU0FB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LEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPO2dCQUMzQyxhQUFhLEVBQUUsRUFBRTtnQkFDakIsaUVBQWlFO2dCQUNqRSxzREFBc0Q7Z0JBQ3RELCtDQUErQztnQkFDL0MsbURBQW1EO2dCQUNuRCxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUM7Z0JBQy9CLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxJQUFJO2FBQ3JDLENBQUMsQ0FBQztRQUVILE9BQU87WUFDTCxXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLFFBQVEsRUFBRTtnQkFDUixzREFBc0Q7Z0JBQ3RELEtBQUssRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztnQkFDaEMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO2FBQ2xDO1NBQ0YsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtpc0V4dGVybmFsUmVzb3VyY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbWV0YWRhdGEnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIERvbUJpbmRpbmdTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb259IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0UGFyZW50Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge2ZsYXRNYXAsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBnZXRUZXh0U3Bhbk9mTm9kZSwgaXNEb2xsYXJFdmVudCwgaXNUeXBlU2NyaXB0RmlsZSwgVGVtcGxhdGVJbmZvLCB0b1RleHRTcGFufSBmcm9tICcuL3V0aWxzJztcblxuaW50ZXJmYWNlIERlZmluaXRpb25NZXRhIHtcbiAgbm9kZTogQVNUfFRtcGxBc3ROb2RlO1xuICBwYXJlbnQ6IEFTVHxUbXBsQXN0Tm9kZXxudWxsO1xuICBzeW1ib2w6IFN5bWJvbDtcbn1cblxuaW50ZXJmYWNlIEhhc1NoaW1Mb2NhdGlvbiB7XG4gIHNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgRGVmaW5pdGlvbkJ1aWxkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcikge31cblxuICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gV2Ugd2VyZSB1bmFibGUgdG8gZ2V0IGEgdGVtcGxhdGUgYXQgdGhlIGdpdmVuIHBvc2l0aW9uLiBJZiB3ZSBhcmUgaW4gYSBUUyBmaWxlLCBpbnN0ZWFkXG4gICAgICAvLyBhdHRlbXB0IHRvIGdldCBhbiBBbmd1bGFyIGRlZmluaXRpb24gYXQgdGhlIGxvY2F0aW9uIGluc2lkZSBhIFRTIGZpbGUgKGV4YW1wbGVzIG9mIHRoaXNcbiAgICAgIC8vIHdvdWxkIGJlIHRlbXBsYXRlVXJsIG9yIGEgdXJsIGluIHN0eWxlVXJscykuXG4gICAgICBpZiAoIWlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uRm9yRXhwcmVzc2lvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICB9XG4gICAgY29uc3QgZGVmaW5pdGlvbk1ldGEgPSB0aGlzLmdldERlZmluaXRpb25NZXRhQXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICAvLyBUaGUgYCRldmVudGAgb2YgZXZlbnQgaGFuZGxlcnMgd291bGQgcG9pbnQgdG8gdGhlICRldmVudCBwYXJhbWV0ZXIgaW4gdGhlIHNoaW0gZmlsZSwgYXMgaW5cbiAgICAvLyBgX291dHB1dEhlbHBlcihfdDNbXCJ4XCJdKS5zdWJzY3JpYmUoZnVuY3Rpb24gKCRldmVudCk6IGFueSB7ICRldmVudCB9KSA7YFxuICAgIC8vIElmIHdlIHdhbnRlZCB0byByZXR1cm4gc29tZXRoaW5nIGZvciB0aGlzLCBpdCB3b3VsZCBiZSBtb3JlIGFwcHJvcHJpYXRlIGZvciBzb21ldGhpbmcgbGlrZVxuICAgIC8vIGBnZXRUeXBlRGVmaW5pdGlvbmAuXG4gICAgaWYgKGRlZmluaXRpb25NZXRhID09PSB1bmRlZmluZWQgfHwgaXNEb2xsYXJFdmVudChkZWZpbml0aW9uTWV0YS5ub2RlKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZpbml0aW9ucyA9IHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2woey4uLmRlZmluaXRpb25NZXRhLCAuLi50ZW1wbGF0ZUluZm99KTtcbiAgICByZXR1cm4ge2RlZmluaXRpb25zLCB0ZXh0U3BhbjogZ2V0VGV4dFNwYW5PZk5vZGUoZGVmaW5pdGlvbk1ldGEubm9kZSl9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uc0ZvclN5bWJvbCh7c3ltYm9sLCBub2RlLCBwYXJlbnQsIGNvbXBvbmVudH06IERlZmluaXRpb25NZXRhJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5mbyk6IHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgICAgLy8gVGhvdWdoIGl0IGlzIGdlbmVyYWxseSBtb3JlIGFwcHJvcHJpYXRlIGZvciB0aGUgYWJvdmUgc3ltYm9sIGRlZmluaXRpb25zIHRvIGJlXG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBcInR5cGUgZGVmaW5pdGlvbnNcIiBzaW5jZSB0aGUgbG9jYXRpb24gaW4gdGhlIHRlbXBsYXRlIGlzIHRoZVxuICAgICAgICAvLyBhY3R1YWwgZGVmaW5pdGlvbiBsb2NhdGlvbiwgdGhlIGJldHRlciB1c2VyIGV4cGVyaWVuY2Ugd291bGQgYmUgdG8gYWxsb3dcbiAgICAgICAgLy8gTFMgdXNlcnMgdG8gXCJnbyB0byBkZWZpbml0aW9uXCIgb24gYW4gaXRlbSBpbiB0aGUgdGVtcGxhdGUgdGhhdCBtYXBzIHRvIGEgY2xhc3MgYW5kIGJlXG4gICAgICAgIC8vIHRha2VuIHRvIHRoZSBkaXJlY3RpdmUgb3IgSFRNTCBjbGFzcy5cbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yVGVtcGxhdGVJbnN0YW5jZShzeW1ib2wsIG5vZGUpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlBpcGU6IHtcbiAgICAgICAgaWYgKHN5bWJvbC50c1N5bWJvbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGB0cy5TeW1ib2xgIGZvciB0aGUgcGlwZSB0cmFuc2Zvcm0sIHdlIHdhbnQgdG8gcmV0dXJuIHRoZVxuICAgICAgICAgIC8vIHR5cGUgZGVmaW5pdGlvbiAodGhlIHBpcGUgY2xhc3MpLlxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sLmNsYXNzU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDoge1xuICAgICAgICBjb25zdCBiaW5kaW5nRGVmcyA9IHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbC5iaW5kaW5ncyk7XG4gICAgICAgIC8vIEFsc28gYXR0ZW1wdCB0byBnZXQgZGlyZWN0aXZlIG1hdGNoZXMgZm9yIHRoZSBpbnB1dCBuYW1lLiBJZiB0aGVyZSBpcyBhIGRpcmVjdGl2ZSB0aGF0XG4gICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVEZWZzID0gdGhpcy5nZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKG5vZGUsIHBhcmVudCwgY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuIFsuLi5iaW5kaW5nRGVmcywgLi4uZGlyZWN0aXZlRGVmc107XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOiB7XG4gICAgICAgIGNvbnN0IGRlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW107XG4gICAgICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb24gIT09IG5vZGUpIHtcbiAgICAgICAgICBkZWZpbml0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IHN5bWJvbC5kZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgY29udGFpbmVyTmFtZTogJycsXG4gICAgICAgICAgICBjb250YWluZXJLaW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgICAgICAgICAga2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudmFyaWFibGVFbGVtZW50LFxuICAgICAgICAgICAgdGV4dFNwYW46IGdldFRleHRTcGFuT2ZOb2RlKHN5bWJvbC5kZWNsYXJhdGlvbiksXG4gICAgICAgICAgICBjb250ZXh0U3BhbjogdG9UZXh0U3BhbihzeW1ib2wuZGVjbGFyYXRpb24uc291cmNlU3BhbiksXG4gICAgICAgICAgICBmaWxlTmFtZTogc3ltYm9sLmRlY2xhcmF0aW9uLnNvdXJjZVNwYW4uc3RhcnQuZmlsZS51cmwsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN5bWJvbC5raW5kID09PSBTeW1ib2xLaW5kLlZhcmlhYmxlKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoe3NoaW1Mb2NhdGlvbjogc3ltYm9sLmluaXRpYWxpemVyTG9jYXRpb259KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmluaXRpb25zO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkV4cHJlc3Npb246IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uc3ltYm9sczogSGFzU2hpbUxvY2F0aW9uW10pOiB0cy5EZWZpbml0aW9uSW5mb1tdIHtcbiAgICByZXR1cm4gZmxhdE1hcChzeW1ib2xzLCAoe3NoaW1Mb2NhdGlvbn0pID0+IHtcbiAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHNoaW1Mb2NhdGlvbjtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW107XG4gICAgfSk7XG4gIH1cblxuICBnZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZGVmaW5pdGlvbk1ldGEgPSB0aGlzLmdldERlZmluaXRpb25NZXRhQXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICBpZiAoZGVmaW5pdGlvbk1ldGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3ltYm9sLCBub2RlfSA9IGRlZmluaXRpb25NZXRhO1xuICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JUZW1wbGF0ZUluc3RhbmNlKHN5bWJvbCwgbm9kZSk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OiB7XG4gICAgICAgIGNvbnN0IGJpbmRpbmdEZWZzID0gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbC5iaW5kaW5ncyk7XG4gICAgICAgIC8vIEFsc28gYXR0ZW1wdCB0byBnZXQgZGlyZWN0aXZlIG1hdGNoZXMgZm9yIHRoZSBpbnB1dCBuYW1lLiBJZiB0aGVyZSBpcyBhIGRpcmVjdGl2ZSB0aGF0XG4gICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVEZWZzID0gdGhpcy5nZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKFxuICAgICAgICAgICAgbm9kZSwgZGVmaW5pdGlvbk1ldGEucGFyZW50LCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuIFsuLi5iaW5kaW5nRGVmcywgLi4uZGlyZWN0aXZlRGVmc107XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZToge1xuICAgICAgICBpZiAoc3ltYm9sLnRzU3ltYm9sICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGB0cy5TeW1ib2xgIGZvciB0aGUgcGlwZSB0cmFuc2Zvcm0sIHdlIHdhbnQgdG8gcmV0dXJuIHRoZVxuICAgICAgICAgIC8vIHR5cGUgZGVmaW5pdGlvbiAodGhlIHBpcGUgY2xhc3MpLlxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sLmNsYXNzU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyh7c2hpbUxvY2F0aW9uOiBzeW1ib2wudGFyZ2V0TG9jYXRpb259KTtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoe3NoaW1Mb2NhdGlvbjogc3ltYm9sLmluaXRpYWxpemVyTG9jYXRpb259KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVEZWZpbml0aW9uc0ZvclRlbXBsYXRlSW5zdGFuY2UoXG4gICAgICBzeW1ib2w6IFRlbXBsYXRlU3ltYm9sfEVsZW1lbnRTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxEaXJlY3RpdmVTeW1ib2wsXG4gICAgICBub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiB0cy5EZWZpbml0aW9uSW5mb1tdIHtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6IHtcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHN5bWJvbC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyguLi5tYXRjaGVzKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OiB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgIC8vIElmIG9uZSBvZiB0aGUgZGlyZWN0aXZlIG1hdGNoZXMgaXMgYSBjb21wb25lbnQsIHdlIHNob3VsZCBub3QgaW5jbHVkZSB0aGUgbmF0aXZlIGVsZW1lbnRcbiAgICAgICAgLy8gaW4gdGhlIHJlc3VsdHMgYmVjYXVzZSBpdCBpcyByZXBsYWNlZCBieSB0aGUgY29tcG9uZW50LlxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShtYXRjaGVzKS5zb21lKGRpciA9PiBkaXIuaXNDb21wb25lbnQpID9cbiAgICAgICAgICAgIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyguLi5tYXRjaGVzKSA6XG4gICAgICAgICAgICB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcywgc3ltYm9sKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOiB7XG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkpIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlycyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgICAgICAgICBub2RlLm5hbWUsIHN5bWJvbC5ob3N0LnRlbXBsYXRlTm9kZSwgc3ltYm9sLmhvc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uZGlycyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKFxuICAgICAgbm9kZTogVG1wbEFzdE5vZGV8QVNULCBwYXJlbnQ6IFRtcGxBc3ROb2RlfEFTVHxudWxsLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSAmJiAhKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiZcbiAgICAgICAgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmIChwYXJlbnQgPT09IG51bGwgfHxcbiAgICAgICAgIShwYXJlbnQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgcGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sID1cbiAgICAgICAgdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sT2ZOb2RlKHBhcmVudCwgY29tcG9uZW50KTtcbiAgICBpZiAodGVtcGxhdGVPckVsZW1lbnRTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgKHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sLmtpbmQgIT09IFN5bWJvbEtpbmQuVGVtcGxhdGUgJiZcbiAgICAgICAgIHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sLmtpbmQgIT09IFN5bWJvbEtpbmQuRWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgZGlycyA9XG4gICAgICAgIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUobm9kZS5uYW1lLCBwYXJlbnQsIHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uZGlycyk7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uc3ltYm9sczogSGFzU2hpbUxvY2F0aW9uW10pOiB0cy5EZWZpbml0aW9uSW5mb1tdIHtcbiAgICByZXR1cm4gZmxhdE1hcChzeW1ib2xzLCAoe3NoaW1Mb2NhdGlvbn0pID0+IHtcbiAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHNoaW1Mb2NhdGlvbjtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKHNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGUpID8/IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uTWV0YUF0UG9zaXRpb24oe3RlbXBsYXRlLCBjb21wb25lbnR9OiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgRGVmaW5pdGlvbk1ldGF8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0YXJnZXQgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qge25vZGUsIHBhcmVudH0gPSB0YXJnZXQ7XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xPZk5vZGUobm9kZSwgY29tcG9uZW50KTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4ge25vZGUsIHBhcmVudCwgc3ltYm9sfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldHMgYW4gQW5ndWxhci1zcGVjaWZpYyBkZWZpbml0aW9uIGluIGEgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkZvckV4cHJlc3Npb25BdFBvc2l0aW9uKFxuICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3Qgc2YgPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmIChleHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IGdldFBhcmVudENsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbik7XG4gIGlmIChjbGFzc0RlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY29tcG9uZW50UmVzb3VyY2VzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbGFyYXRpb24pO1xuICBpZiAoY29tcG9uZW50UmVzb3VyY2VzID09PSBudWxsKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYWxsUmVzb3VyY2VzID0gWy4uLmNvbXBvbmVudFJlc291cmNlcy5zdHlsZXMsIGNvbXBvbmVudFJlc291cmNlcy50ZW1wbGF0ZV07XG5cbiAgY29uc3QgcmVzb3VyY2VGb3JFeHByZXNzaW9uID0gYWxsUmVzb3VyY2VzLmZpbmQocmVzb3VyY2UgPT4gcmVzb3VyY2UuZXhwcmVzc2lvbiA9PT0gZXhwcmVzc2lvbik7XG4gIGlmIChyZXNvdXJjZUZvckV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCB8fCAhaXNFeHRlcm5hbFJlc291cmNlKHJlc291cmNlRm9yRXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0ZW1wbGF0ZURlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW3tcbiAgICBraW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC5leHRlcm5hbE1vZHVsZU5hbWUsXG4gICAgbmFtZTogcmVzb3VyY2VGb3JFeHByZXNzaW9uLnBhdGgsXG4gICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICBjb250YWluZXJOYW1lOiAnJyxcbiAgICAvLyBSZWFkaW5nIHRoZSB0ZW1wbGF0ZSBpcyBleHBlbnNpdmUsIHNvIGRvbid0IHByb3ZpZGUgYSBwcmV2aWV3LlxuICAgIC8vIFRPRE8oYXlhemhhZml6KTogQ29uc2lkZXIgcHJvdmlkaW5nIGFuIGFjdHVhbCBzcGFuOlxuICAgIC8vICAxLiBXZSdyZSBsaWtlbHkgdG8gcmVhZCB0aGUgdGVtcGxhdGUgYW55d2F5XG4gICAgLy8gIDIuIFdlIGNvdWxkIHNob3cganVzdCB0aGUgZmlyc3QgMTAwIGNoYXJzIG9yIHNvXG4gICAgdGV4dFNwYW46IHtzdGFydDogMCwgbGVuZ3RoOiAwfSxcbiAgICBmaWxlTmFtZTogcmVzb3VyY2VGb3JFeHByZXNzaW9uLnBhdGgsXG4gIH1dO1xuXG4gIHJldHVybiB7XG4gICAgZGVmaW5pdGlvbnM6IHRlbXBsYXRlRGVmaW5pdGlvbnMsXG4gICAgdGV4dFNwYW46IHtcbiAgICAgIC8vIEV4Y2x1ZGUgb3BlbmluZyBhbmQgY2xvc2luZyBxdW90ZXMgaW4gdGhlIHVybCBzcGFuLlxuICAgICAgc3RhcnQ6IGV4cHJlc3Npb24uZ2V0U3RhcnQoKSArIDEsXG4gICAgICBsZW5ndGg6IGV4cHJlc3Npb24uZ2V0V2lkdGgoKSAtIDIsXG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==