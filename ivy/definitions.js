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
        define("@angular/language-service/ivy/definitions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript", "@angular/language-service/ivy/hybrid_visitor", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefinitionBuilder = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var ts = require("typescript");
    var hybrid_visitor_1 = require("@angular/language-service/ivy/hybrid_visitor");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var DefinitionBuilder = /** @class */ (function () {
        function DefinitionBuilder(tsLS, compiler) {
            this.tsLS = tsLS;
            this.compiler = compiler;
        }
        DefinitionBuilder.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, this.compiler);
            if (templateInfo === undefined) {
                return;
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
            var symbol = _a.symbol, node = _a.node, path = _a.path, component = _a.component;
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
                case api_1.SymbolKind.Output:
                case api_1.SymbolKind.Input: {
                    var bindingDefs = this.getDefinitionsForSymbols.apply(this, tslib_1.__spread(symbol.bindings));
                    // Also attempt to get directive matches for the input name. If there is a directive that
                    // has the input name as part of the selector, we want to return that as well.
                    var directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, path, component);
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
                        definitions.push.apply(definitions, tslib_1.__spread(this.getDefinitionsForSymbols(symbol)));
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
                    var directiveDefs = this.getDirectiveTypeDefsForBindingNode(node, definitionMeta.path, templateInfo.component);
                    return tslib_1.__spread(bindingDefs, directiveDefs);
                }
                case api_1.SymbolKind.Reference:
                case api_1.SymbolKind.Expression:
                case api_1.SymbolKind.Variable:
                    return this.getTypeDefinitionsForSymbols(symbol);
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
        DefinitionBuilder.prototype.getDirectiveTypeDefsForBindingNode = function (node, pathToNode, component) {
            if (!(node instanceof compiler_1.TmplAstBoundAttribute) && !(node instanceof compiler_1.TmplAstTextAttribute) &&
                !(node instanceof compiler_1.TmplAstBoundEvent)) {
                return [];
            }
            var parent = pathToNode[pathToNode.length - 2];
            if (!(parent instanceof compiler_1.TmplAstTemplate || parent instanceof compiler_1.TmplAstElement)) {
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
            var path = hybrid_visitor_1.getPathToNodeAtPosition(template, position);
            if (path === undefined) {
                return;
            }
            var node = path[path.length - 1];
            var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(node, component);
            if (symbol === null) {
                return;
            }
            return { node: node, path: path, symbol: symbol };
        };
        return DefinitionBuilder;
    }());
    exports.DefinitionBuilder = DefinitionBuilder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9KO0lBRXBKLHFFQUFpSztJQUNqSywrQkFBaUM7SUFFakMsK0VBQXlEO0lBQ3pELDZEQUEwTDtJQVkxTDtRQUNFLDJCQUE2QixJQUF3QixFQUFtQixRQUFvQjtZQUEvRCxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1FBQUcsQ0FBQztRQUVoRyxxREFBeUIsR0FBekIsVUFBMEIsUUFBZ0IsRUFBRSxRQUFnQjtZQUUxRCxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLE9BQU87YUFDUjtZQUNELElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDaEYsNkZBQTZGO1lBQzdGLDJFQUEyRTtZQUMzRSw2RkFBNkY7WUFDN0YsdUJBQXVCO1lBQ3ZCLElBQUksY0FBYyxLQUFLLFNBQVMsSUFBSSxxQkFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdEUsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLHVDQUFLLGNBQWMsR0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN2RixPQUFPLEVBQUMsV0FBVyxhQUFBLEVBQUUsUUFBUSxFQUFFLHlCQUFpQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDO1FBQ3pFLENBQUM7UUFFTyxtREFBdUIsR0FBL0IsVUFBZ0MsRUFDWTtnQkFEWCxNQUFNLFlBQUEsRUFBRSxJQUFJLFVBQUEsRUFBRSxJQUFJLFVBQUEsRUFBRSxTQUFTLGVBQUE7WUFFNUQsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNuQixLQUFLLGdCQUFVLENBQUMsU0FBUyxDQUFDO2dCQUMxQixLQUFLLGdCQUFVLENBQUMsT0FBTyxDQUFDO2dCQUN4QixLQUFLLGdCQUFVLENBQUMsUUFBUSxDQUFDO2dCQUN6QixLQUFLLGdCQUFVLENBQUMsVUFBVTtvQkFDeEIsaUZBQWlGO29CQUNqRiwrRUFBK0U7b0JBQy9FLDJFQUEyRTtvQkFDM0Usd0ZBQXdGO29CQUN4Rix3Q0FBd0M7b0JBQ3hDLE9BQU8sSUFBSSxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbEUsS0FBSyxnQkFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDdkIsS0FBSyxnQkFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNyQixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsd0JBQXdCLE9BQTdCLElBQUksbUJBQTZCLE1BQU0sQ0FBQyxRQUFRLEVBQUMsQ0FBQztvQkFDdEUseUZBQXlGO29CQUN6Riw4RUFBOEU7b0JBQzlFLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNyRix3QkFBVyxXQUFXLEVBQUssYUFBYSxFQUFFO2lCQUMzQztnQkFDRCxLQUFLLGdCQUFVLENBQUMsUUFBUSxDQUFDO2dCQUN6QixLQUFLLGdCQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3pCLElBQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7b0JBQzVDLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxJQUFJLEVBQUU7d0JBQy9CLFdBQVcsQ0FBQyxJQUFJLENBQUM7NEJBQ2YsSUFBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSTs0QkFDN0IsYUFBYSxFQUFFLEVBQUU7NEJBQ2pCLGFBQWEsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTzs0QkFDM0MsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlOzRCQUMxQyxRQUFRLEVBQUUseUJBQWlCLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQzs0QkFDL0MsV0FBVyxFQUFFLGtCQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7NEJBQ3RELFFBQVEsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUc7eUJBQ3ZELENBQUMsQ0FBQztxQkFDSjtvQkFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssZ0JBQVUsQ0FBQyxRQUFRLEVBQUU7d0JBQ3ZDLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxHQUFFO3FCQUM1RDtvQkFDRCxPQUFPLFdBQVcsQ0FBQztpQkFDcEI7Z0JBQ0QsS0FBSyxnQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMxQixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDOUM7YUFDRjtRQUNILENBQUM7UUFFTyxvREFBd0IsR0FBaEM7WUFBQSxpQkFLQztZQUxnQyxpQkFBNkI7aUJBQTdCLFVBQTZCLEVBQTdCLHFCQUE2QixFQUE3QixJQUE2QjtnQkFBN0IsNEJBQTZCOztZQUM1RCxPQUFPLGVBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBQyxFQUFjOztvQkFBYixZQUFZLGtCQUFBO2dCQUM3QixJQUFBLFFBQVEsR0FBd0IsWUFBWSxTQUFwQyxFQUFFLGtCQUFrQixHQUFJLFlBQVksbUJBQWhCLENBQWlCO2dCQUNwRCxhQUFPLEtBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLG1DQUFJLEVBQUUsQ0FBQztZQUMvRSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCx3REFBNEIsR0FBNUIsVUFBNkIsUUFBZ0IsRUFBRSxRQUFnQjtZQUU3RCxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLE9BQU87YUFDUjtZQUNELElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDaEYsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUNoQyxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVNLElBQUEsTUFBTSxHQUFVLGNBQWMsT0FBeEIsRUFBRSxJQUFJLEdBQUksY0FBYyxLQUFsQixDQUFtQjtZQUN0QyxRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUU7Z0JBQ25CLEtBQUssZ0JBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzFCLEtBQUssZ0JBQVUsQ0FBQyxVQUFVLENBQUM7Z0JBQzNCLEtBQUssZ0JBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQ3hCLEtBQUssZ0JBQVUsQ0FBQyxRQUFRO29CQUN0QixPQUFPLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2xFLEtBQUssZ0JBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZCLEtBQUssZ0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDckIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixPQUFqQyxJQUFJLG1CQUFpQyxNQUFNLENBQUMsUUFBUSxFQUFDLENBQUM7b0JBQzFFLHlGQUF5RjtvQkFDekYsOEVBQThFO29CQUM5RSxJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQ3pELElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDdkQsd0JBQVcsV0FBVyxFQUFLLGFBQWEsRUFBRTtpQkFDM0M7Z0JBQ0QsS0FBSyxnQkFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDMUIsS0FBSyxnQkFBVSxDQUFDLFVBQVUsQ0FBQztnQkFDM0IsS0FBSyxnQkFBVSxDQUFDLFFBQVE7b0JBQ3RCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3BEO1FBQ0gsQ0FBQztRQUVPLGlFQUFxQyxHQUE3QyxVQUNJLE1BQXFFLEVBQ3JFLElBQXFCO1lBQ3ZCLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTtnQkFDbkIsS0FBSyxnQkFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN4QixJQUFNLE9BQU8sR0FBRyx3Q0FBZ0MsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDekYsT0FBTyxJQUFJLENBQUMsNEJBQTRCLE9BQWpDLElBQUksbUJBQWlDLE9BQU8sR0FBRTtpQkFDdEQ7Z0JBQ0QsS0FBSyxnQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN2QixJQUFNLE9BQU8sR0FBRyx3Q0FBZ0MsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDekYsMkZBQTJGO29CQUMzRiwwREFBMEQ7b0JBQzFELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsV0FBVyxFQUFmLENBQWUsQ0FBQyxDQUFDLENBQUMsQ0FDckQsSUFBSSxDQUFDLDRCQUE0QixPQUFqQyxJQUFJLG1CQUFpQyxPQUFPLEdBQUUsQ0FBQyxDQUMvQyxJQUFJLENBQUMsNEJBQTRCLE9BQWpDLElBQUksbUJBQWlDLE9BQU8sR0FBRSxNQUFNLEdBQUMsQ0FBQztpQkFDM0Q7Z0JBQ0QsS0FBSyxnQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMxQixJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksK0JBQW9CLENBQUMsRUFBRTt3QkFDM0MsT0FBTyxFQUFFLENBQUM7cUJBQ1g7b0JBQ0QsSUFBTSxJQUFJLEdBQUcsdUNBQStCLENBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDakUsT0FBTyxJQUFJLENBQUMsNEJBQTRCLE9BQWpDLElBQUksbUJBQWlDLElBQUksR0FBRTtpQkFDbkQ7Z0JBQ0QsS0FBSyxnQkFBVSxDQUFDLFNBQVM7b0JBQ3ZCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3BEO1FBQ0gsQ0FBQztRQUVPLDhEQUFrQyxHQUExQyxVQUNJLElBQXFCLEVBQUUsVUFBa0MsRUFBRSxTQUE4QjtZQUMzRixJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksZ0NBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLCtCQUFvQixDQUFDO2dCQUNuRixDQUFDLENBQUMsSUFBSSxZQUFZLDRCQUFpQixDQUFDLEVBQUU7Z0JBQ3hDLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxJQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksMEJBQWUsSUFBSSxNQUFNLFlBQVkseUJBQWMsQ0FBQyxFQUFFO2dCQUM1RSxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSx1QkFBdUIsR0FDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDOUUsSUFBSSx1QkFBdUIsS0FBSyxJQUFJO2dCQUNoQyxDQUFDLHVCQUF1QixDQUFDLElBQUksS0FBSyxnQkFBVSxDQUFDLFFBQVE7b0JBQ3BELHVCQUF1QixDQUFDLElBQUksS0FBSyxnQkFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN6RCxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxJQUFJLEdBQ04sdUNBQStCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0YsT0FBTyxJQUFJLENBQUMsNEJBQTRCLE9BQWpDLElBQUksbUJBQWlDLElBQUksR0FBRTtRQUNwRCxDQUFDO1FBRU8sd0RBQTRCLEdBQXBDO1lBQUEsaUJBS0M7WUFMb0MsaUJBQTZCO2lCQUE3QixVQUE2QixFQUE3QixxQkFBNkIsRUFBN0IsSUFBNkI7Z0JBQTdCLDRCQUE2Qjs7WUFDaEUsT0FBTyxlQUFPLENBQUMsT0FBTyxFQUFFLFVBQUMsRUFBYzs7b0JBQWIsWUFBWSxrQkFBQTtnQkFDN0IsSUFBQSxRQUFRLEdBQXdCLFlBQVksU0FBcEMsRUFBRSxrQkFBa0IsR0FBSSxZQUFZLG1CQUFoQixDQUFpQjtnQkFDcEQsYUFBTyxLQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxtQ0FBSSxFQUFFLENBQUM7WUFDbkYsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRU8sdURBQTJCLEdBQW5DLFVBQW9DLEVBQW1DLEVBQUUsUUFBZ0I7Z0JBQXBELFFBQVEsY0FBQSxFQUFFLFNBQVMsZUFBQTtZQUV0RCxJQUFNLElBQUksR0FBRyx3Q0FBdUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekQsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN0QixPQUFPO2FBQ1I7WUFFRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2RixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQ25CLE9BQU87YUFDUjtZQUNELE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxNQUFNLFFBQUEsRUFBQyxDQUFDO1FBQzlCLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFyTEQsSUFxTEM7SUFyTFksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbn0gZnJvbSAnLi9oeWJyaWRfdmlzaXRvcic7XG5pbXBvcnQge2ZsYXRNYXAsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBnZXRUZXh0U3Bhbk9mTm9kZSwgaXNEb2xsYXJFdmVudCwgVGVtcGxhdGVJbmZvLCB0b1RleHRTcGFufSBmcm9tICcuL3V0aWxzJztcblxuaW50ZXJmYWNlIERlZmluaXRpb25NZXRhIHtcbiAgbm9kZTogQVNUfFRtcGxBc3ROb2RlO1xuICBwYXRoOiBBcnJheTxBU1R8VG1wbEFzdE5vZGU+O1xuICBzeW1ib2w6IFN5bWJvbDtcbn1cblxuaW50ZXJmYWNlIEhhc1NoaW1Mb2NhdGlvbiB7XG4gIHNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgRGVmaW5pdGlvbkJ1aWxkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcikge31cblxuICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkZWZpbml0aW9uTWV0YSA9IHRoaXMuZ2V0RGVmaW5pdGlvbk1ldGFBdFBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIC8vIFRoZSBgJGV2ZW50YCBvZiBldmVudCBoYW5kbGVycyB3b3VsZCBwb2ludCB0byB0aGUgJGV2ZW50IHBhcmFtZXRlciBpbiB0aGUgc2hpbSBmaWxlLCBhcyBpblxuICAgIC8vIGBfb3V0cHV0SGVscGVyKF90M1tcInhcIl0pLnN1YnNjcmliZShmdW5jdGlvbiAoJGV2ZW50KTogYW55IHsgJGV2ZW50IH0pIDtgXG4gICAgLy8gSWYgd2Ugd2FudGVkIHRvIHJldHVybiBzb21ldGhpbmcgZm9yIHRoaXMsIGl0IHdvdWxkIGJlIG1vcmUgYXBwcm9wcmlhdGUgZm9yIHNvbWV0aGluZyBsaWtlXG4gICAgLy8gYGdldFR5cGVEZWZpbml0aW9uYC5cbiAgICBpZiAoZGVmaW5pdGlvbk1ldGEgPT09IHVuZGVmaW5lZCB8fCBpc0RvbGxhckV2ZW50KGRlZmluaXRpb25NZXRhLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmluaXRpb25zID0gdGhpcy5nZXREZWZpbml0aW9uc0ZvclN5bWJvbCh7Li4uZGVmaW5pdGlvbk1ldGEsIC4uLnRlbXBsYXRlSW5mb30pO1xuICAgIHJldHVybiB7ZGVmaW5pdGlvbnMsIHRleHRTcGFuOiBnZXRUZXh0U3Bhbk9mTm9kZShkZWZpbml0aW9uTWV0YS5ub2RlKX07XG4gIH1cblxuICBwcml2YXRlIGdldERlZmluaXRpb25zRm9yU3ltYm9sKHtzeW1ib2wsIG5vZGUsIHBhdGgsIGNvbXBvbmVudH06IERlZmluaXRpb25NZXRhJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5mbyk6IHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgICAgLy8gVGhvdWdoIGl0IGlzIGdlbmVyYWxseSBtb3JlIGFwcHJvcHJpYXRlIGZvciB0aGUgYWJvdmUgc3ltYm9sIGRlZmluaXRpb25zIHRvIGJlXG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBcInR5cGUgZGVmaW5pdGlvbnNcIiBzaW5jZSB0aGUgbG9jYXRpb24gaW4gdGhlIHRlbXBsYXRlIGlzIHRoZVxuICAgICAgICAvLyBhY3R1YWwgZGVmaW5pdGlvbiBsb2NhdGlvbiwgdGhlIGJldHRlciB1c2VyIGV4cGVyaWVuY2Ugd291bGQgYmUgdG8gYWxsb3dcbiAgICAgICAgLy8gTFMgdXNlcnMgdG8gXCJnbyB0byBkZWZpbml0aW9uXCIgb24gYW4gaXRlbSBpbiB0aGUgdGVtcGxhdGUgdGhhdCBtYXBzIHRvIGEgY2xhc3MgYW5kIGJlXG4gICAgICAgIC8vIHRha2VuIHRvIHRoZSBkaXJlY3RpdmUgb3IgSFRNTCBjbGFzcy5cbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yVGVtcGxhdGVJbnN0YW5jZShzeW1ib2wsIG5vZGUpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDoge1xuICAgICAgICBjb25zdCBiaW5kaW5nRGVmcyA9IHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbC5iaW5kaW5ncyk7XG4gICAgICAgIC8vIEFsc28gYXR0ZW1wdCB0byBnZXQgZGlyZWN0aXZlIG1hdGNoZXMgZm9yIHRoZSBpbnB1dCBuYW1lLiBJZiB0aGVyZSBpcyBhIGRpcmVjdGl2ZSB0aGF0XG4gICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVEZWZzID0gdGhpcy5nZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKG5vZGUsIHBhdGgsIGNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBbLi4uYmluZGluZ0RlZnMsIC4uLmRpcmVjdGl2ZURlZnNdO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICBjb25zdCBkZWZpbml0aW9uczogdHMuRGVmaW5pdGlvbkluZm9bXSA9IFtdO1xuICAgICAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9uICE9PSBub2RlKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6ICcnLFxuICAgICAgICAgICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICAgICAgICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnZhcmlhYmxlRWxlbWVudCxcbiAgICAgICAgICAgIHRleHRTcGFuOiBnZXRUZXh0U3Bhbk9mTm9kZShzeW1ib2wuZGVjbGFyYXRpb24pLFxuICAgICAgICAgICAgY29udGV4dFNwYW46IHRvVGV4dFNwYW4oc3ltYm9sLmRlY2xhcmF0aW9uLnNvdXJjZVNwYW4pLFxuICAgICAgICAgICAgZmlsZU5hbWU6IHN5bWJvbC5kZWNsYXJhdGlvbi5zb3VyY2VTcGFuLnN0YXJ0LmZpbGUudXJsLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzeW1ib2wua2luZCA9PT0gU3ltYm9sS2luZC5WYXJpYWJsZSkge1xuICAgICAgICAgIGRlZmluaXRpb25zLnB1c2goLi4udGhpcy5nZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoc3ltYm9sKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmluaXRpb25zO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkV4cHJlc3Npb246IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4uc3ltYm9sczogSGFzU2hpbUxvY2F0aW9uW10pOiB0cy5EZWZpbml0aW9uSW5mb1tdIHtcbiAgICByZXR1cm4gZmxhdE1hcChzeW1ib2xzLCAoe3NoaW1Mb2NhdGlvbn0pID0+IHtcbiAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHNoaW1Mb2NhdGlvbjtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW107XG4gICAgfSk7XG4gIH1cblxuICBnZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZGVmaW5pdGlvbk1ldGEgPSB0aGlzLmdldERlZmluaXRpb25NZXRhQXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICBpZiAoZGVmaW5pdGlvbk1ldGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCB7c3ltYm9sLCBub2RlfSA9IGRlZmluaXRpb25NZXRhO1xuICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JUZW1wbGF0ZUluc3RhbmNlKHN5bWJvbCwgbm9kZSk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OiB7XG4gICAgICAgIGNvbnN0IGJpbmRpbmdEZWZzID0gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbC5iaW5kaW5ncyk7XG4gICAgICAgIC8vIEFsc28gYXR0ZW1wdCB0byBnZXQgZGlyZWN0aXZlIG1hdGNoZXMgZm9yIHRoZSBpbnB1dCBuYW1lLiBJZiB0aGVyZSBpcyBhIGRpcmVjdGl2ZSB0aGF0XG4gICAgICAgIC8vIGhhcyB0aGUgaW5wdXQgbmFtZSBhcyBwYXJ0IG9mIHRoZSBzZWxlY3Rvciwgd2Ugd2FudCB0byByZXR1cm4gdGhhdCBhcyB3ZWxsLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVEZWZzID0gdGhpcy5nZXREaXJlY3RpdmVUeXBlRGVmc0ZvckJpbmRpbmdOb2RlKFxuICAgICAgICAgICAgbm9kZSwgZGVmaW5pdGlvbk1ldGEucGF0aCwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBbLi4uYmluZGluZ0RlZnMsIC4uLmRpcmVjdGl2ZURlZnNdO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKHN5bWJvbCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JUZW1wbGF0ZUluc3RhbmNlKFxuICAgICAgc3ltYm9sOiBUZW1wbGF0ZVN5bWJvbHxFbGVtZW50U3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8RGlyZWN0aXZlU3ltYm9sLFxuICAgICAgbm9kZTogQVNUfFRtcGxBc3ROb2RlKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOiB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIGlzIGEgY29tcG9uZW50LCB3ZSBzaG91bGQgbm90IGluY2x1ZGUgdGhlIG5hdGl2ZSBlbGVtZW50XG4gICAgICAgIC8vIGluIHRoZSByZXN1bHRzIGJlY2F1c2UgaXQgaXMgcmVwbGFjZWQgYnkgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20obWF0Y2hlcykuc29tZShkaXIgPT4gZGlyLmlzQ29tcG9uZW50KSA/XG4gICAgICAgICAgICB0aGlzLmdldFR5cGVEZWZpbml0aW9uc0ZvclN5bWJvbHMoLi4ubWF0Y2hlcykgOlxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLm1hdGNoZXMsIHN5bWJvbCk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzoge1xuICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcnMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgICAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZURlZmluaXRpb25zRm9yU3ltYm9scyhzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlVHlwZURlZnNGb3JCaW5kaW5nTm9kZShcbiAgICAgIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcGF0aFRvTm9kZTogQXJyYXk8VG1wbEFzdE5vZGV8QVNUPiwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmXG4gICAgICAgICEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBwYXJlbnQgPSBwYXRoVG9Ob2RlW3BhdGhUb05vZGUubGVuZ3RoIC0gMl07XG4gICAgaWYgKCEocGFyZW50IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHBhcmVudCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbCA9XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFN5bWJvbE9mTm9kZShwYXJlbnQsIGNvbXBvbmVudCk7XG4gICAgaWYgKHRlbXBsYXRlT3JFbGVtZW50U3ltYm9sID09PSBudWxsIHx8XG4gICAgICAgICh0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLlRlbXBsYXRlICYmXG4gICAgICAgICB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5raW5kICE9PSBTeW1ib2xLaW5kLkVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IGRpcnMgPVxuICAgICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKG5vZGUubmFtZSwgcGFyZW50LCB0ZW1wbGF0ZU9yRWxlbWVudFN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICByZXR1cm4gdGhpcy5nZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLmRpcnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlRGVmaW5pdGlvbnNGb3JTeW1ib2xzKC4uLnN5bWJvbHM6IEhhc1NoaW1Mb2NhdGlvbltdKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgcmV0dXJuIGZsYXRNYXAoc3ltYm9scywgKHtzaGltTG9jYXRpb259KSA9PiB7XG4gICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzaGltTG9jYXRpb247XG4gICAgICByZXR1cm4gdGhpcy50c0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKSA/PyBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVmaW5pdGlvbk1ldGFBdFBvc2l0aW9uKHt0ZW1wbGF0ZSwgY29tcG9uZW50fTogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIERlZmluaXRpb25NZXRhfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge25vZGUsIHBhdGgsIHN5bWJvbH07XG4gIH1cbn1cbiJdfQ==