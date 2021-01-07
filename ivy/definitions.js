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
            var nodeInContext = target.nodeInContext, parent = target.parent;
            var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(nodeInContext.node, component);
            if (symbol === null) {
                return undefined;
            }
            return { node: nodeInContext.node, parent: parent, symbol: symbol };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9KO0lBRXBKLHFFQUE0RTtJQUM1RSxxRUFBaUs7SUFDakssK0JBQWlDO0lBRWpDLGlGQUFzRDtJQUN0RCxtRUFBdUU7SUFDdkUsNkRBQTRNO0lBWTVNO1FBQ0UsMkJBQTZCLElBQXdCLEVBQW1CLFFBQW9CO1lBQS9ELFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7UUFBRyxDQUFDO1FBRWhHLHFEQUF5QixHQUF6QixVQUEwQixRQUFnQixFQUFFLFFBQWdCO1lBRTFELElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsMEZBQTBGO2dCQUMxRiwwRkFBMEY7Z0JBQzFGLCtDQUErQztnQkFDL0MsSUFBSSxDQUFDLHdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUMvQixPQUFPO2lCQUNSO2dCQUNELE9BQU8sb0NBQW9DLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDaEY7WUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hGLDZGQUE2RjtZQUM3RiwyRUFBMkU7WUFDM0UsNkZBQTZGO1lBQzdGLHVCQUF1QjtZQUN2QixJQUFJLGNBQWMsS0FBSyxTQUFTLElBQUkscUJBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RFLE9BQU8sU0FB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QUFDLElBQUk7Z0JBQ2hDLGFBQWEsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTztnQkFDM0MsYUFBYSxFQUFFLEVBQUU7Z0JBQ2pCLGlFQUFpRTtnQkFDakUsc0RBQXNEO2dCQUN0RCwrQ0FBK0M7Z0JBQy9DLG1EQUFtRDtnQkFDbkQsUUFBUSxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFDO2dCQUMvQixRQUFRLEVBQUUscUJBQXFCLENBQUMsSUFBSTthQUNyQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxRQUFRLEVBQUU7Z0JBQ1Isc0RBQXNEO2dCQUN0RCxLQUFLLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7Z0JBQ2hDLE1BQU0sRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUNsQztTQUNGLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7aXNFeHRlcm5hbFJlc291cmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9ufSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldFBhcmVudENsYXNzRGVjbGFyYXRpb259IGZyb20gJy4vdHNfdXRpbHMnO1xuaW1wb3J0IHtmbGF0TWFwLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZywgZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgZ2V0VGV4dFNwYW5PZk5vZGUsIGlzRG9sbGFyRXZlbnQsIGlzVHlwZVNjcmlwdEZpbGUsIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmludGVyZmFjZSBEZWZpbml0aW9uTWV0YSB7XG4gIG5vZGU6IEFTVHxUbXBsQXN0Tm9kZTtcbiAgcGFyZW50OiBBU1R8VG1wbEFzdE5vZGV8bnVsbDtcbiAgc3ltYm9sOiBTeW1ib2w7XG59XG5cbmludGVyZmFjZSBIYXNTaGltTG9jYXRpb24ge1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuZXhwb3J0IGNsYXNzIERlZmluaXRpb25CdWlsZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFdlIHdlcmUgdW5hYmxlIHRvIGdldCBhIHRlbXBsYXRlIGF0IHRoZSBnaXZlbiBwb3NpdGlvbi4gSWYgd2UgYXJlIGluIGEgVFMgZmlsZSwgaW5zdGVhZFxuICAgICAgLy8gYXR0ZW1wdCB0byBnZXQgYW4gQW5ndWxhciBkZWZpbml0aW9uIGF0IHRoZSBsb2NhdGlvbiBpbnNpZGUgYSBUUyBmaWxlIChleGFtcGxlcyBvZiB0aGlzXG4gICAgICAvLyB3b3VsZCBiZSB0ZW1wbGF0ZVVybCBvciBhIHVybCBpbiBzdHlsZVVybHMpLlxuICAgICAgaWYgKCFpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gZ2V0RGVmaW5pdGlvbkZvckV4cHJlc3Npb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgfVxuICAgIGNvbnN0IGRlZmluaXRpb25NZXRhID0gdGhpcy5nZXREZWZpbml0aW9uTWV0YUF0UG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgLy8gVGhlIGAkZXZlbnRgIG9mIGV2ZW50IGhhbmRsZXJzIHdvdWxkIHBvaW50IHRvIHRoZSAkZXZlbnQgcGFyYW1ldGVyIGluIHRoZSBzaGltIGZpbGUsIGFzIGluXG4gICAgLy8gYF9vdXRwdXRIZWxwZXIoX3QzW1wieFwiXSkuc3Vic2NyaWJlKGZ1bmN0aW9uICgkZXZlbnQpOiBhbnkgeyAkZXZlbnQgfSkgO2BcbiAgICAvLyBJZiB3ZSB3YW50ZWQgdG8gcmV0dXJuIHNvbWV0aGluZyBmb3IgdGhpcywgaXQgd291bGQgYmUgbW9yZSBhcHByb3ByaWF0ZSBmb3Igc29tZXRoaW5nIGxpa2VcbiAgICAvLyBgZ2V0VHlwZURlZmluaXRpb25gLlxuICAgIGlmIChkZWZpbml0aW9uTWV0YSA9PT0gdW5kZWZpbmVkIHx8IGlzRG9sbGFyRXZlbnQoZGVmaW5pdGlvbk1ldGEubm9kZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmaW5pdGlvbnMgPSB0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9sKHsuLi5kZWZpbml0aW9uTWV0YSwgLi4udGVtcGxhdGVJbmZvfSk7XG4gICAgcmV0dXJuIHtkZWZpbml0aW9ucywgdGV4dFNwYW46IGdldFRleHRTcGFuT2ZOb2RlKGRlZmluaXRpb25NZXRhLm5vZGUpfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2woe3N5bWJvbCwgbm9kZSwgcGFyZW50LCBjb21wb25lbnR9OiBEZWZpbml0aW9uTWV0YSZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUZW1wbGF0ZUluZm8pOiByZWFkb25seSB0cy5EZWZpbml0aW9uSW5mb1tdfHVuZGVmaW5lZCB7XG4gICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRvbUJpbmRpbmc6XG4gICAgICAgIC8vIFRob3VnaCBpdCBpcyBnZW5lcmFsbHkgbW9yZSBhcHByb3ByaWF0ZSBmb3IgdGhlIGFib3ZlIHN5bWJvbCBkZWZpbml0aW9ucyB0byBiZVxuICAgICAgICAvLyBhc3NvY2lhdGVkIHdpdGggXCJ0eXBlIGRlZmluaXRpb25zXCIgc2luY2UgdGhlIGxvY2F0aW9uIGluIHRoZSB0ZW1wbGF0ZSBpcyB0aGVcbiAgICAgICAgLy8gYWN0dWFsIGRlZmluaXRpb24gbG9jYXRpb24sIHRoZSBiZXR0ZXIgdXNlciBleHBlcmllbmNlIHdvdWxkIGJlIHRvIGFsbG93XG4gICAgICAgIC8vIExTIHVzZXJzIHRvIFwiZ28gdG8gZGVmaW5pdGlvblwiIG9uIGFuIGl0ZW0gaW4gdGhlIHRlbXBsYXRlIHRoYXQgbWFwcyB0byBhIGNsYXNzIGFuZCBiZVxuICAgICAgICAvLyB0YWtlbiB0byB0aGUgZGlyZWN0aXZlIG9yIEhUTUwgY2xhc3MuXG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclRlbXBsYXRlSW5zdGFuY2Uoc3ltYm9sLCBub2RlKTtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5QaXBlOiB7XG4gICAgICAgIGlmIChzeW1ib2wudHNTeW1ib2wgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBgdHMuU3ltYm9sYCBmb3IgdGhlIHBpcGUgdHJhbnNmb3JtLCB3ZSB3YW50IHRvIHJldHVybiB0aGVcbiAgICAgICAgICAvLyB0eXBlIGRlZmluaXRpb24gKHRoZSBwaXBlIGNsYXNzKS5cbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbC5jbGFzc1N5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5PdXRwdXQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuSW5wdXQ6IHtcbiAgICAgICAgY29uc3QgYmluZGluZ0RlZnMgPSB0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9scyguLi5zeW1ib2wuYmluZGluZ3MpO1xuICAgICAgICAvLyBBbHNvIGF0dGVtcHQgdG8gZ2V0IGRpcmVjdGl2ZSBtYXRjaGVzIGZvciB0aGUgaW5wdXQgbmFtZS4gSWYgdGhlcmUgaXMgYSBkaXJlY3RpdmUgdGhhdFxuICAgICAgICAvLyBoYXMgdGhlIGlucHV0IG5hbWUgYXMgcGFydCBvZiB0aGUgc2VsZWN0b3IsIHdlIHdhbnQgdG8gcmV0dXJuIHRoYXQgYXMgd2VsbC5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlRGVmcyA9IHRoaXMuZ2V0RGlyZWN0aXZlVHlwZURlZnNGb3JCaW5kaW5nTm9kZShub2RlLCBwYXJlbnQsIGNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBbLi4uYmluZGluZ0RlZnMsIC4uLmRpcmVjdGl2ZURlZnNdO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICBjb25zdCBkZWZpbml0aW9uczogdHMuRGVmaW5pdGlvbkluZm9bXSA9IFtdO1xuICAgICAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9uICE9PSBub2RlKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6ICcnLFxuICAgICAgICAgICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICAgICAgICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnZhcmlhYmxlRWxlbWVudCxcbiAgICAgICAgICAgIHRleHRTcGFuOiBnZXRUZXh0U3Bhbk9mTm9kZShzeW1ib2wuZGVjbGFyYXRpb24pLFxuICAgICAgICAgICAgY29udGV4dFNwYW46IHRvVGV4dFNwYW4oc3ltYm9sLmRlY2xhcmF0aW9uLnNvdXJjZVNwYW4pLFxuICAgICAgICAgICAgZmlsZU5hbWU6IHN5bWJvbC5kZWNsYXJhdGlvbi5zb3VyY2VTcGFuLnN0YXJ0LmZpbGUudXJsLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeW1ib2wua2luZCA9PT0gU3ltYm9sS2luZC5WYXJpYWJsZSkge1xuICAgICAgICAgIGRlZmluaXRpb25zLnB1c2goXG4gICAgICAgICAgICAgIC4uLnRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKHtzaGltTG9jYXRpb246IHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9ufSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZpbml0aW9ucztcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbHM6IEhhc1NoaW1Mb2NhdGlvbltdKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgcmV0dXJuIGZsYXRNYXAoc3ltYm9scywgKHtzaGltTG9jYXRpb259KSA9PiB7XG4gICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzaGltTG9jYXRpb247XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldERlZmluaXRpb25BdFBvc2l0aW9uKHNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGUpID8/IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHlwZURlZmluaXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGRlZmluaXRpb25NZXRhID0gdGhpcy5nZXREZWZpbml0aW9uTWV0YUF0UG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGRlZmluaXRpb25NZXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge3N5bWJvbCwgbm9kZX0gPSBkZWZpbml0aW9uTWV0YTtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRvbUJpbmRpbmc6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5UZW1wbGF0ZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yVGVtcGxhdGVJbnN0YW5jZShzeW1ib2wsIG5vZGUpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDoge1xuICAgICAgICBjb25zdCBiaW5kaW5nRGVmcyA9IHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyguLi5zeW1ib2wuYmluZGluZ3MpO1xuICAgICAgICAvLyBBbHNvIGF0dGVtcHQgdG8gZ2V0IGRpcmVjdGl2ZSBtYXRjaGVzIGZvciB0aGUgaW5wdXQgbmFtZS4gSWYgdGhlcmUgaXMgYSBkaXJlY3RpdmUgdGhhdFxuICAgICAgICAvLyBoYXMgdGhlIGlucHV0IG5hbWUgYXMgcGFydCBvZiB0aGUgc2VsZWN0b3IsIHdlIHdhbnQgdG8gcmV0dXJuIHRoYXQgYXMgd2VsbC5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlRGVmcyA9IHRoaXMuZ2V0RGlyZWN0aXZlVHlwZURlZnNGb3JCaW5kaW5nTm9kZShcbiAgICAgICAgICAgIG5vZGUsIGRlZmluaXRpb25NZXRhLnBhcmVudCwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBbLi4uYmluZGluZ0RlZnMsIC4uLmRpcmVjdGl2ZURlZnNdO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlBpcGU6IHtcbiAgICAgICAgaWYgKHN5bWJvbC50c1N5bWJvbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBgdHMuU3ltYm9sYCBmb3IgdGhlIHBpcGUgdHJhbnNmb3JtLCB3ZSB3YW50IHRvIHJldHVybiB0aGVcbiAgICAgICAgICAvLyB0eXBlIGRlZmluaXRpb24gKHRoZSBwaXBlIGNsYXNzKS5cbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbC5jbGFzc1N5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5SZWZlcmVuY2U6XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoe3NoaW1Mb2NhdGlvbjogc3ltYm9sLnRhcmdldExvY2F0aW9ufSk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRXhwcmVzc2lvbjpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHtzaGltTG9jYXRpb246IHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9ufSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JUZW1wbGF0ZUluc3RhbmNlKFxuICAgICAgc3ltYm9sOiBUZW1wbGF0ZVN5bWJvbHxFbGVtZW50U3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8RGlyZWN0aXZlU3ltYm9sLFxuICAgICAgbm9kZTogQVNUfFRtcGxBc3ROb2RlKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOiB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIGlzIGEgY29tcG9uZW50LCB3ZSBzaG91bGQgbm90IGluY2x1ZGUgdGhlIG5hdGl2ZSBlbGVtZW50XG4gICAgICAgIC8vIGluIHRoZSByZXN1bHRzIGJlY2F1c2UgaXQgaXMgcmVwbGFjZWQgYnkgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20obWF0Y2hlcykuc29tZShkaXIgPT4gZGlyLmlzQ29tcG9uZW50KSA/XG4gICAgICAgICAgICB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcykgOlxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLm1hdGNoZXMsIHN5bWJvbCk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzoge1xuICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcnMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgICAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlVHlwZURlZnNGb3JCaW5kaW5nTm9kZShcbiAgICAgIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcGFyZW50OiBUbXBsQXN0Tm9kZXxBU1R8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmXG4gICAgICAgICEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAocGFyZW50ID09PSBudWxsIHx8XG4gICAgICAgICEocGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbCA9XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFN5bWJvbE9mTm9kZShwYXJlbnQsIGNvbXBvbmVudCk7XG4gICAgaWYgKHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sID09PSBudWxsIHx8XG4gICAgICAgICh0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLlRlbXBsYXRlICYmXG4gICAgICAgICB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLkVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGRpcnMgPVxuICAgICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKG5vZGUubmFtZSwgcGFyZW50LCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbHM6IEhhc1NoaW1Mb2NhdGlvbltdKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgcmV0dXJuIGZsYXRNYXAoc3ltYm9scywgKHtzaGltTG9jYXRpb259KSA9PiB7XG4gICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzaGltTG9jYXRpb247XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKSA/PyBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVmaW5pdGlvbk1ldGFBdFBvc2l0aW9uKHt0ZW1wbGF0ZSwgY29tcG9uZW50fTogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIERlZmluaXRpb25NZXRhfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHtub2RlSW5Db250ZXh0LCBwYXJlbnR9ID0gdGFyZ2V0O1xuXG4gICAgY29uc3Qgc3ltYm9sID1cbiAgICAgICAgdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sT2ZOb2RlKG5vZGVJbkNvbnRleHQubm9kZSwgY29tcG9uZW50KTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4ge25vZGU6IG5vZGVJbkNvbnRleHQubm9kZSwgcGFyZW50LCBzeW1ib2x9O1xuICB9XG59XG5cbi8qKlxuICogR2V0cyBhbiBBbmd1bGFyLXNwZWNpZmljIGRlZmluaXRpb24gaW4gYSBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlLlxuICovXG5mdW5jdGlvbiBnZXREZWZpbml0aW9uRm9yRXhwcmVzc2lvbkF0UG9zaXRpb24oXG4gICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhbnxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBzZiA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgZXhwcmVzc2lvbiA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKGV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gZ2V0UGFyZW50Q2xhc3NEZWNsYXJhdGlvbihleHByZXNzaW9uKTtcbiAgaWYgKGNsYXNzRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjb21wb25lbnRSZXNvdXJjZXMgPSBjb21waWxlci5nZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsYXJhdGlvbik7XG4gIGlmIChjb21wb25lbnRSZXNvdXJjZXMgPT09IG51bGwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBhbGxSZXNvdXJjZXMgPSBbLi4uY29tcG9uZW50UmVzb3VyY2VzLnN0eWxlcywgY29tcG9uZW50UmVzb3VyY2VzLnRlbXBsYXRlXTtcblxuICBjb25zdCByZXNvdXJjZUZvckV4cHJlc3Npb24gPSBhbGxSZXNvdXJjZXMuZmluZChyZXNvdXJjZSA9PiByZXNvdXJjZS5leHByZXNzaW9uID09PSBleHByZXNzaW9uKTtcbiAgaWYgKHJlc291cmNlRm9yRXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkIHx8ICFpc0V4dGVybmFsUmVzb3VyY2UocmVzb3VyY2VGb3JFeHByZXNzaW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHRlbXBsYXRlRGVmaW5pdGlvbnM6IHRzLkRlZmluaXRpb25JbmZvW10gPSBbe1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmV4dGVybmFsTW9kdWxlTmFtZSxcbiAgICBuYW1lOiByZXNvdXJjZUZvckV4cHJlc3Npb24ucGF0aCxcbiAgICBjb250YWluZXJLaW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgIGNvbnRhaW5lck5hbWU6ICcnLFxuICAgIC8vIFJlYWRpbmcgdGhlIHRlbXBsYXRlIGlzIGV4cGVuc2l2ZSwgc28gZG9uJ3QgcHJvdmlkZSBhIHByZXZpZXcuXG4gICAgLy8gVE9ETyhheWF6aGFmaXopOiBDb25zaWRlciBwcm92aWRpbmcgYW4gYWN0dWFsIHNwYW46XG4gICAgLy8gIDEuIFdlJ3JlIGxpa2VseSB0byByZWFkIHRoZSB0ZW1wbGF0ZSBhbnl3YXlcbiAgICAvLyAgMi4gV2UgY291bGQgc2hvdyBqdXN0IHRoZSBmaXJzdCAxMDAgY2hhcnMgb3Igc29cbiAgICB0ZXh0U3Bhbjoge3N0YXJ0OiAwLCBsZW5ndGg6IDB9LFxuICAgIGZpbGVOYW1lOiByZXNvdXJjZUZvckV4cHJlc3Npb24ucGF0aCxcbiAgfV07XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9uczogdGVtcGxhdGVEZWZpbml0aW9ucyxcbiAgICB0ZXh0U3Bhbjoge1xuICAgICAgLy8gRXhjbHVkZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHF1b3RlcyBpbiB0aGUgdXJsIHNwYW4uXG4gICAgICBzdGFydDogZXhwcmVzc2lvbi5nZXRTdGFydCgpICsgMSxcbiAgICAgIGxlbmd0aDogZXhwcmVzc2lvbi5nZXRXaWR0aCgpIC0gMixcbiAgICB9LFxuICB9O1xufVxuIl19