/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/language-service/src/locate_symbol", ["require", "exports", "tslib", "@angular/compiler", "typescript/lib/tsserverlibrary", "@angular/language-service/src/expression_diagnostics", "@angular/language-service/src/expressions", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var tss = require("typescript/lib/tsserverlibrary");
    var expression_diagnostics_1 = require("@angular/language-service/src/expression_diagnostics");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Traverses a template AST and locates symbol(s) at a specified position.
     * @param info template AST information set
     * @param position location to locate symbols at
     */
    function locateSymbols(info, position) {
        var templatePosition = position - info.template.span.start;
        // TODO: update `findTemplateAstAt` to use absolute positions.
        var path = utils_1.findTemplateAstAt(info.templateAst, templatePosition);
        if (!path.tail)
            return [];
        var narrowest = utils_1.spanOf(path.tail);
        var toVisit = [];
        for (var node = path.tail; node && utils_1.isNarrower(utils_1.spanOf(node.sourceSpan), narrowest); node = path.parentOf(node)) {
            toVisit.push(node);
        }
        return toVisit.map(function (ast) { return locateSymbol(ast, path, info); })
            .filter(function (sym) { return sym !== undefined; });
    }
    exports.locateSymbols = locateSymbols;
    /**
     * Visits a template node and locates the symbol in that node at a path position.
     * @param ast template AST node to visit
     * @param path non-empty set of narrowing AST nodes at a position
     * @param info template AST information set
     */
    function locateSymbol(ast, path, info) {
        var templatePosition = path.position;
        var position = templatePosition + info.template.span.start;
        var symbol;
        var span;
        var staticSymbol;
        var attributeValueSymbol = function (ast) {
            var attribute = findAttribute(info, position);
            if (attribute) {
                if (utils_1.inSpan(templatePosition, utils_1.spanOf(attribute.valueSpan))) {
                    var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                    var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                    if (attribute.valueSpan) {
                        var result = expressions_1.getExpressionSymbol(scope, ast, templatePosition, info.template.query);
                        if (result) {
                            symbol = result.symbol;
                            var expressionOffset = attribute.valueSpan.start.offset;
                            span = utils_1.offsetSpan(result.span, expressionOffset);
                        }
                    }
                    return true;
                }
            }
            return false;
        };
        ast.visit({
            visitNgContent: function (ast) { },
            visitEmbeddedTemplate: function (ast) { },
            visitElement: function (ast) {
                var component = ast.directives.find(function (d) { return d.directive.isComponent; });
                if (component) {
                    // Need to cast because 'reference' is typed as any
                    staticSymbol = component.directive.type.reference;
                    symbol = info.template.query.getTypeSymbol(staticSymbol);
                    symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.COMPONENT);
                    span = utils_1.spanOf(ast);
                }
                else {
                    // Find a directive that matches the element name
                    var directive = ast.directives.find(function (d) { return d.directive.selector != null && d.directive.selector.indexOf(ast.name) >= 0; });
                    if (directive) {
                        // Need to cast because 'reference' is typed as any
                        staticSymbol = directive.directive.type.reference;
                        symbol = info.template.query.getTypeSymbol(staticSymbol);
                        symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.DIRECTIVE);
                        span = utils_1.spanOf(ast);
                    }
                }
            },
            visitReference: function (ast) {
                symbol = ast.value && info.template.query.getTypeSymbol(compiler_1.tokenReference(ast.value));
                span = utils_1.spanOf(ast);
            },
            visitVariable: function (ast) { },
            visitEvent: function (ast) {
                if (!attributeValueSymbol(ast.handler)) {
                    symbol = findOutputBinding(info, path, ast);
                    symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.EVENT);
                    span = utils_1.spanOf(ast);
                }
            },
            visitElementProperty: function (ast) { attributeValueSymbol(ast.value); },
            visitAttr: function (ast) {
                var e_1, _a;
                var element = path.head;
                if (!element || !(element instanceof compiler_1.ElementAst))
                    return;
                // Create a mapping of all directives applied to the element from their selectors.
                var matcher = new compiler_1.SelectorMatcher();
                try {
                    for (var _b = tslib_1.__values(element.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var dir = _c.value;
                        if (!dir.directive.selector)
                            continue;
                        matcher.addSelectables(compiler_1.CssSelector.parse(dir.directive.selector), dir);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                // See if this attribute matches the selector of any directive on the element.
                var attributeSelector = "[" + ast.name + "=" + ast.value + "]";
                var parsedAttribute = compiler_1.CssSelector.parse(attributeSelector);
                if (!parsedAttribute.length)
                    return;
                matcher.match(parsedAttribute[0], function (_, _a) {
                    var directive = _a.directive;
                    // Need to cast because 'reference' is typed as any
                    staticSymbol = directive.type.reference;
                    symbol = info.template.query.getTypeSymbol(staticSymbol);
                    symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.DIRECTIVE);
                    span = utils_1.spanOf(ast);
                });
            },
            visitBoundText: function (ast) {
                var expressionPosition = templatePosition - ast.sourceSpan.start.offset;
                if (utils_1.inSpan(expressionPosition, ast.value.span)) {
                    var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                    var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                    var result = expressions_1.getExpressionSymbol(scope, ast.value, templatePosition, info.template.query);
                    if (result) {
                        symbol = result.symbol;
                        span = utils_1.offsetSpan(result.span, ast.sourceSpan.start.offset);
                    }
                }
            },
            visitText: function (ast) { },
            visitDirective: function (ast) {
                // Need to cast because 'reference' is typed as any
                staticSymbol = ast.directive.type.reference;
                symbol = info.template.query.getTypeSymbol(staticSymbol);
                span = utils_1.spanOf(ast);
            },
            visitDirectiveProperty: function (ast) {
                if (!attributeValueSymbol(ast.value)) {
                    symbol = findInputBinding(info, templatePosition, ast);
                    span = utils_1.spanOf(ast);
                }
            }
        }, null);
        if (symbol && span) {
            var _a = utils_1.offsetSpan(span, info.template.span.start), start = _a.start, end = _a.end;
            return {
                symbol: symbol,
                span: tss.createTextSpanFromBounds(start, end), staticSymbol: staticSymbol,
            };
        }
    }
    function findAttribute(info, position) {
        var templatePosition = position - info.template.span.start;
        var path = utils_1.getPathToNodeAtPosition(info.htmlAst, templatePosition);
        return path.first(compiler_1.Attribute);
    }
    // TODO: remove this function after the path includes 'DirectiveAst'.
    // Find the directive that corresponds to the specified 'binding'
    // at the specified 'position' in the 'ast'.
    function findParentOfBinding(ast, binding, position) {
        var res;
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visit = function (ast) {
                var span = utils_1.spanOf(ast);
                if (!utils_1.inSpan(position, span)) {
                    // Returning a value here will result in the children being skipped.
                    return true;
                }
            };
            class_1.prototype.visitEmbeddedTemplate = function (ast, context) {
                return this.visitChildren(context, function (visit) {
                    visit(ast.directives);
                    visit(ast.children);
                });
            };
            class_1.prototype.visitElement = function (ast, context) {
                return this.visitChildren(context, function (visit) {
                    visit(ast.directives);
                    visit(ast.children);
                });
            };
            class_1.prototype.visitDirective = function (ast) {
                var result = this.visitChildren(ast, function (visit) { visit(ast.inputs); });
                return result;
            };
            class_1.prototype.visitDirectiveProperty = function (ast, context) {
                if (ast === binding) {
                    res = context;
                }
            };
            return class_1;
        }(compiler_1.RecursiveTemplateAstVisitor));
        compiler_1.templateVisitAll(visitor, ast);
        return res;
    }
    function findInputBinding(info, position, binding) {
        var directiveAst = findParentOfBinding(info.templateAst, binding, position);
        if (directiveAst) {
            var invertedInput = invertMap(directiveAst.directive.inputs);
            var fieldName = invertedInput[binding.templateName];
            if (fieldName) {
                var classSymbol = info.template.query.getTypeSymbol(directiveAst.directive.type.reference);
                if (classSymbol) {
                    return classSymbol.members().get(fieldName);
                }
            }
        }
    }
    function findOutputBinding(info, path, binding) {
        var e_2, _a;
        var element = path.first(compiler_1.ElementAst);
        if (element) {
            try {
                for (var _b = tslib_1.__values(element.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var directive = _c.value;
                    var invertedOutputs = invertMap(directive.directive.outputs);
                    var fieldName = invertedOutputs[binding.name];
                    if (fieldName) {
                        var classSymbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                        if (classSymbol) {
                            return classSymbol.members().get(fieldName);
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    function invertMap(obj) {
        var e_3, _a;
        var result = {};
        try {
            for (var _b = tslib_1.__values(Object.keys(obj)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var name_1 = _c.value;
                var v = obj[name_1];
                result[v] = name_1;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return result;
    }
    /**
     * Wrap a symbol and change its kind to component.
     */
    var OverrideKindSymbol = /** @class */ (function () {
        function OverrideKindSymbol(sym, kindOverride) {
            this.sym = sym;
            this.kind = kindOverride;
        }
        Object.defineProperty(OverrideKindSymbol.prototype, "name", {
            get: function () { return this.sym.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "language", {
            get: function () { return this.sym.language; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "type", {
            get: function () { return this.sym.type; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "container", {
            get: function () { return this.sym.container; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "public", {
            get: function () { return this.sym.public; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "callable", {
            get: function () { return this.sym.callable; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "nullable", {
            get: function () { return this.sym.nullable; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "definition", {
            get: function () { return this.sym.definition; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OverrideKindSymbol.prototype, "documentation", {
            get: function () { return this.sym.documentation; },
            enumerable: true,
            configurable: true
        });
        OverrideKindSymbol.prototype.members = function () { return this.sym.members(); };
        OverrideKindSymbol.prototype.signatures = function () { return this.sym.signatures(); };
        OverrideKindSymbol.prototype.selectSignature = function (types) { return this.sym.selectSignature(types); };
        OverrideKindSymbol.prototype.indexed = function (argument) { return this.sym.indexed(argument); };
        OverrideKindSymbol.prototype.typeArguments = function () { return this.sym.typeArguments(); };
        return OverrideKindSymbol;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1SO0lBQ25SLG9EQUFzRDtJQUV0RCwrRkFBNEQ7SUFDNUQseUVBQWtEO0lBQ2xELDZEQUFnRTtJQUNoRSw2REFBMkk7SUFRM0k7Ozs7T0FJRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7UUFDN0QsSUFBTSxnQkFBZ0IsR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzdELDhEQUE4RDtRQUM5RCxJQUFNLElBQUksR0FBRyx5QkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFFMUIsSUFBTSxTQUFTLEdBQUcsY0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxJQUFJLEdBQTBCLElBQUksQ0FBQyxJQUFJLEVBQzNDLElBQUksSUFBSSxrQkFBVSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQjtRQUVELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUE3QixDQUE2QixDQUFDO2FBQ25ELE1BQU0sQ0FBQyxVQUFDLEdBQUcsSUFBd0IsT0FBQSxHQUFHLEtBQUssU0FBUyxFQUFqQixDQUFpQixDQUFDLENBQUM7SUFDN0QsQ0FBQztJQWZELHNDQWVDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLFlBQVksQ0FBQyxHQUFnQixFQUFFLElBQXFCLEVBQUUsSUFBZTtRQUU1RSxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDdkMsSUFBTSxRQUFRLEdBQUcsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzdELElBQUksTUFBd0IsQ0FBQztRQUM3QixJQUFJLElBQW9CLENBQUM7UUFDekIsSUFBSSxZQUFvQyxDQUFDO1FBQ3pDLElBQU0sb0JBQW9CLEdBQUcsVUFBQyxHQUFRO1lBQ3BDLElBQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDaEQsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsSUFBSSxjQUFNLENBQUMsZ0JBQWdCLEVBQUUsY0FBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFO29CQUN6RCxJQUFNLEtBQUssR0FBRyxzQ0FBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkQsSUFBTSxLQUFLLEdBQUcsMkNBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM5QyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUU7d0JBQ3ZCLElBQU0sTUFBTSxHQUFHLGlDQUFtQixDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDdEYsSUFBSSxNQUFNLEVBQUU7NEJBQ1YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7NEJBQ3ZCLElBQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDOzRCQUMxRCxJQUFJLEdBQUcsa0JBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7eUJBQ2xEO3FCQUNGO29CQUNELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQztRQUNGLEdBQUcsQ0FBQyxLQUFLLENBQ0w7WUFDRSxjQUFjLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDdEIscUJBQXFCLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDN0IsWUFBWSxFQUFaLFVBQWEsR0FBRztnQkFDZCxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUF2QixDQUF1QixDQUFDLENBQUM7Z0JBQ3BFLElBQUksU0FBUyxFQUFFO29CQUNiLG1EQUFtRDtvQkFDbkQsWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQXlCLENBQUM7b0JBQ2xFLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQ3pELE1BQU0sR0FBRyxNQUFNLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUscUJBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDM0UsSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEI7cUJBQU07b0JBQ0wsaURBQWlEO29CQUNqRCxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDakMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQTNFLENBQTJFLENBQUMsQ0FBQztvQkFDdEYsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsbURBQW1EO3dCQUNuRCxZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBeUIsQ0FBQzt3QkFDbEUsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQzt3QkFDekQsTUFBTSxHQUFHLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxxQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO3dCQUMzRSxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNwQjtpQkFDRjtZQUNILENBQUM7WUFDRCxjQUFjLFlBQUMsR0FBRztnQkFDaEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHlCQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ25GLElBQUksR0FBRyxjQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsQ0FBQztZQUNELGFBQWEsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUNyQixVQUFVLFlBQUMsR0FBRztnQkFDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUN0QyxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxxQkFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUN2RSxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNwQjtZQUNILENBQUM7WUFDRCxvQkFBb0IsWUFBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RCxTQUFTLEVBQVQsVUFBVSxHQUFHOztnQkFDWCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUMxQixJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLFlBQVkscUJBQVUsQ0FBQztvQkFBRSxPQUFPO2dCQUN6RCxrRkFBa0Y7Z0JBQ2xGLElBQU0sT0FBTyxHQUFHLElBQUksMEJBQWUsRUFBZ0IsQ0FBQzs7b0JBQ3BELEtBQWtCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO3dCQUFqQyxJQUFNLEdBQUcsV0FBQTt3QkFDWixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFROzRCQUFFLFNBQVM7d0JBQ3RDLE9BQU8sQ0FBQyxjQUFjLENBQUMsc0JBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztxQkFDeEU7Ozs7Ozs7OztnQkFFRCw4RUFBOEU7Z0JBQzlFLElBQU0saUJBQWlCLEdBQUcsTUFBSSxHQUFHLENBQUMsSUFBSSxTQUFJLEdBQUcsQ0FBQyxLQUFLLE1BQUcsQ0FBQztnQkFDdkQsSUFBTSxlQUFlLEdBQUcsc0JBQVcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNO29CQUFFLE9BQU87Z0JBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQUMsQ0FBQyxFQUFFLEVBQVc7d0JBQVYsd0JBQVM7b0JBQzlDLG1EQUFtRDtvQkFDbkQsWUFBWSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBeUIsQ0FBQztvQkFDeEQsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDekQsTUFBTSxHQUFHLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxxQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUMzRSxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFDRCxjQUFjLFlBQUMsR0FBRztnQkFDaEIsSUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQzFFLElBQUksY0FBTSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzlDLElBQU0sS0FBSyxHQUFHLHNDQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuRCxJQUFNLEtBQUssR0FBRywyQ0FBa0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzlDLElBQU0sTUFBTSxHQUNSLGlDQUFtQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2pGLElBQUksTUFBTSxFQUFFO3dCQUNWLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO3dCQUN2QixJQUFJLEdBQUcsa0JBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUM3RDtpQkFDRjtZQUNILENBQUM7WUFDRCxTQUFTLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDakIsY0FBYyxFQUFkLFVBQWUsR0FBRztnQkFDaEIsbURBQW1EO2dCQUNuRCxZQUFZLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBeUIsQ0FBQztnQkFDNUQsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDekQsSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixDQUFDO1lBQ0Qsc0JBQXNCLFlBQUMsR0FBRztnQkFDeEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDcEMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEI7WUFDSCxDQUFDO1NBQ0YsRUFDRCxJQUFJLENBQUMsQ0FBQztRQUNWLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNaLElBQUEsdURBQXlELEVBQXhELGdCQUFLLEVBQUUsWUFBaUQsQ0FBQztZQUNoRSxPQUFPO2dCQUNMLE1BQU0sUUFBQTtnQkFDTixJQUFJLEVBQUUsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxZQUFZLGNBQUE7YUFDN0QsQ0FBQztTQUNIO0lBQ0gsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQWUsRUFBRSxRQUFnQjtRQUN0RCxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcsK0JBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBUyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELHFFQUFxRTtJQUNyRSxpRUFBaUU7SUFDakUsNENBQTRDO0lBQzVDLFNBQVMsbUJBQW1CLENBQ3hCLEdBQWtCLEVBQUUsT0FBa0MsRUFBRSxRQUFnQjtRQUUxRSxJQUFJLEdBQTJCLENBQUM7UUFDaEMsSUFBTSxPQUFPLEdBQUc7WUFBa0IsbUNBQTJCO1lBQXpDOztZQWlDcEIsQ0FBQztZQWhDQyx1QkFBSyxHQUFMLFVBQU0sR0FBZ0I7Z0JBQ3BCLElBQU0sSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzNCLG9FQUFvRTtvQkFDcEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBRUQsdUNBQXFCLEdBQXJCLFVBQXNCLEdBQXdCLEVBQUUsT0FBWTtnQkFDMUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELDhCQUFZLEdBQVosVUFBYSxHQUFlLEVBQUUsT0FBWTtnQkFDeEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELGdDQUFjLEdBQWQsVUFBZSxHQUFpQjtnQkFDOUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsVUFBQSxLQUFLLElBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDO1lBRUQsd0NBQXNCLEdBQXRCLFVBQXVCLEdBQThCLEVBQUUsT0FBcUI7Z0JBQzFFLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtvQkFDbkIsR0FBRyxHQUFHLE9BQU8sQ0FBQztpQkFDZjtZQUNILENBQUM7WUFDSCxjQUFDO1FBQUQsQ0FBQyxBQWpDbUIsQ0FBYyxzQ0FBMkIsRUFpQzVELENBQUM7UUFDRiwyQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0IsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FDckIsSUFBZSxFQUFFLFFBQWdCLEVBQUUsT0FBa0M7UUFDdkUsSUFBTSxZQUFZLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUUsSUFBSSxZQUFZLEVBQUU7WUFDaEIsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0QsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN0RCxJQUFJLFNBQVMsRUFBRTtnQkFDYixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzdGLElBQUksV0FBVyxFQUFFO29CQUNmLE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDN0M7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBZSxFQUFFLElBQXFCLEVBQUUsT0FBc0I7O1FBRXZGLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQVUsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksT0FBTyxFQUFFOztnQkFDWCxLQUF3QixJQUFBLEtBQUEsaUJBQUEsT0FBTyxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdkMsSUFBTSxTQUFTLFdBQUE7b0JBQ2xCLElBQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUMvRCxJQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNoRCxJQUFJLFNBQVMsRUFBRTt3QkFDYixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7d0JBQzFGLElBQUksV0FBVyxFQUFFOzRCQUNmLE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzt5QkFDN0M7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztTQUNGO0lBQ0gsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEdBQTZCOztRQUM5QyxJQUFNLE1BQU0sR0FBNkIsRUFBRSxDQUFDOztZQUM1QyxLQUFtQixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBaEMsSUFBTSxNQUFJLFdBQUE7Z0JBQ2IsSUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQUksQ0FBQyxDQUFDO2dCQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBSSxDQUFDO2FBQ2xCOzs7Ozs7Ozs7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7O09BRUc7SUFDSDtRQUVFLDRCQUFvQixHQUFXLEVBQUUsWUFBMkI7WUFBeEMsUUFBRyxHQUFILEdBQUcsQ0FBUTtZQUFpQyxJQUFJLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQztRQUFDLENBQUM7UUFFM0Ysc0JBQUksb0NBQUk7aUJBQVIsY0FBcUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTVDLHNCQUFJLHdDQUFRO2lCQUFaLGNBQXlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVwRCxzQkFBSSxvQ0FBSTtpQkFBUixjQUErQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFdEQsc0JBQUkseUNBQVM7aUJBQWIsY0FBb0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRWhFLHNCQUFJLHNDQUFNO2lCQUFWLGNBQXdCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVqRCxzQkFBSSx3Q0FBUTtpQkFBWixjQUEwQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFckQsc0JBQUksd0NBQVE7aUJBQVosY0FBMEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXJELHNCQUFJLDBDQUFVO2lCQUFkLGNBQStCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU1RCxzQkFBSSw2Q0FBYTtpQkFBakIsY0FBOEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTlFLG9DQUFPLEdBQVAsY0FBWSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhDLHVDQUFVLEdBQVYsY0FBZSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlDLDRDQUFlLEdBQWYsVUFBZ0IsS0FBZSxJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVFLG9DQUFPLEdBQVAsVUFBUSxRQUFnQixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLDBDQUFhLEdBQWIsY0FBc0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRSx5QkFBQztJQUFELENBQUMsQUEvQkQsSUErQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBdHRyaWJ1dGUsIEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIENzc1NlbGVjdG9yLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIEVtYmVkZGVkVGVtcGxhdGVBc3QsIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0aWNTeW1ib2wsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIHRlbXBsYXRlVmlzaXRBbGwsIHRva2VuUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblN5bWJvbH0gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb24sIERpcmVjdGl2ZUtpbmQsIFNwYW4sIFN5bWJvbH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGdldFBhdGhUb05vZGVBdFBvc2l0aW9uLCBpblNwYW4sIGlzTmFycm93ZXIsIG9mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3ltYm9sSW5mbyB7XG4gIHN5bWJvbDogU3ltYm9sO1xuICBzcGFuOiB0c3MuVGV4dFNwYW47XG4gIHN0YXRpY1N5bWJvbD86IFN0YXRpY1N5bWJvbDtcbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgYSB0ZW1wbGF0ZSBBU1QgYW5kIGxvY2F0ZXMgc3ltYm9sKHMpIGF0IGEgc3BlY2lmaWVkIHBvc2l0aW9uLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUIGluZm9ybWF0aW9uIHNldFxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIHRvIGxvY2F0ZSBzeW1ib2xzIGF0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGVTeW1ib2xzKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IFN5bWJvbEluZm9bXSB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgLy8gVE9ETzogdXBkYXRlIGBmaW5kVGVtcGxhdGVBc3RBdGAgdG8gdXNlIGFic29sdXRlIHBvc2l0aW9ucy5cbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBpZiAoIXBhdGgudGFpbCkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IG5hcnJvd2VzdCA9IHNwYW5PZihwYXRoLnRhaWwpO1xuICBjb25zdCB0b1Zpc2l0OiBUZW1wbGF0ZUFzdFtdID0gW107XG4gIGZvciAobGV0IG5vZGU6IFRlbXBsYXRlQXN0fHVuZGVmaW5lZCA9IHBhdGgudGFpbDtcbiAgICAgICBub2RlICYmIGlzTmFycm93ZXIoc3Bhbk9mKG5vZGUuc291cmNlU3BhbiksIG5hcnJvd2VzdCk7IG5vZGUgPSBwYXRoLnBhcmVudE9mKG5vZGUpKSB7XG4gICAgdG9WaXNpdC5wdXNoKG5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIHRvVmlzaXQubWFwKGFzdCA9PiBsb2NhdGVTeW1ib2woYXN0LCBwYXRoLCBpbmZvKSlcbiAgICAgIC5maWx0ZXIoKHN5bSk6IHN5bSBpcyBTeW1ib2xJbmZvID0+IHN5bSAhPT0gdW5kZWZpbmVkKTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYSB0ZW1wbGF0ZSBub2RlIGFuZCBsb2NhdGVzIHRoZSBzeW1ib2wgaW4gdGhhdCBub2RlIGF0IGEgcGF0aCBwb3NpdGlvbi5cbiAqIEBwYXJhbSBhc3QgdGVtcGxhdGUgQVNUIG5vZGUgdG8gdmlzaXRcbiAqIEBwYXJhbSBwYXRoIG5vbi1lbXB0eSBzZXQgb2YgbmFycm93aW5nIEFTVCBub2RlcyBhdCBhIHBvc2l0aW9uXG4gKiBAcGFyYW0gaW5mbyB0ZW1wbGF0ZSBBU1QgaW5mb3JtYXRpb24gc2V0XG4gKi9cbmZ1bmN0aW9uIGxvY2F0ZVN5bWJvbChhc3Q6IFRlbXBsYXRlQXN0LCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGluZm86IEFzdFJlc3VsdCk6IFN5bWJvbEluZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBhdGgucG9zaXRpb247XG4gIGNvbnN0IHBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiArIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgbGV0IHN5bWJvbDogU3ltYm9sfHVuZGVmaW5lZDtcbiAgbGV0IHNwYW46IFNwYW58dW5kZWZpbmVkO1xuICBsZXQgc3RhdGljU3ltYm9sOiBTdGF0aWNTeW1ib2x8dW5kZWZpbmVkO1xuICBjb25zdCBhdHRyaWJ1dGVWYWx1ZVN5bWJvbCA9IChhc3Q6IEFTVCk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGF0dHJpYnV0ZSA9IGZpbmRBdHRyaWJ1dGUoaW5mbywgcG9zaXRpb24pO1xuICAgIGlmIChhdHRyaWJ1dGUpIHtcbiAgICAgIGlmIChpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGF0dHJpYnV0ZS52YWx1ZVNwYW4pKSkge1xuICAgICAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICBpZiAoYXR0cmlidXRlLnZhbHVlU3Bhbikge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldEV4cHJlc3Npb25TeW1ib2woc2NvcGUsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgc3ltYm9sID0gcmVzdWx0LnN5bWJvbDtcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb25PZmZzZXQgPSBhdHRyaWJ1dGUudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgICAgIHNwYW4gPSBvZmZzZXRTcGFuKHJlc3VsdC5zcGFuLCBleHByZXNzaW9uT2Zmc2V0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgYXN0LnZpc2l0KFxuICAgICAge1xuICAgICAgICB2aXNpdE5nQ29udGVudChhc3QpIHt9LFxuICAgICAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0KSB7fSxcbiAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IGFzdC5kaXJlY3RpdmVzLmZpbmQoZCA9PiBkLmRpcmVjdGl2ZS5pc0NvbXBvbmVudCk7XG4gICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBjb21wb25lbnQuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChzdGF0aWNTeW1ib2wpO1xuICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkNPTVBPTkVOVCk7XG4gICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZpbmQgYSBkaXJlY3RpdmUgdGhhdCBtYXRjaGVzIHRoZSBlbGVtZW50IG5hbWVcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGFzdC5kaXJlY3RpdmVzLmZpbmQoXG4gICAgICAgICAgICAgICAgZCA9PiBkLmRpcmVjdGl2ZS5zZWxlY3RvciAhPSBudWxsICYmIGQuZGlyZWN0aXZlLnNlbGVjdG9yLmluZGV4T2YoYXN0Lm5hbWUpID49IDApO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSkge1xuICAgICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgICAgc3RhdGljU3ltYm9sID0gZGlyZWN0aXZlLmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChzdGF0aWNTeW1ib2wpO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRSZWZlcmVuY2UoYXN0KSB7XG4gICAgICAgICAgc3ltYm9sID0gYXN0LnZhbHVlICYmIGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbCh0b2tlblJlZmVyZW5jZShhc3QudmFsdWUpKTtcbiAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0VmFyaWFibGUoYXN0KSB7fSxcbiAgICAgICAgdmlzaXRFdmVudChhc3QpIHtcbiAgICAgICAgICBpZiAoIWF0dHJpYnV0ZVZhbHVlU3ltYm9sKGFzdC5oYW5kbGVyKSkge1xuICAgICAgICAgICAgc3ltYm9sID0gZmluZE91dHB1dEJpbmRpbmcoaW5mbywgcGF0aCwgYXN0KTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5FVkVOVCk7XG4gICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3QpIHsgYXR0cmlidXRlVmFsdWVTeW1ib2woYXN0LnZhbHVlKTsgfSxcbiAgICAgICAgdmlzaXRBdHRyKGFzdCkge1xuICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmhlYWQ7XG4gICAgICAgICAgaWYgKCFlbGVtZW50IHx8ICEoZWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnRBc3QpKSByZXR1cm47XG4gICAgICAgICAgLy8gQ3JlYXRlIGEgbWFwcGluZyBvZiBhbGwgZGlyZWN0aXZlcyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50IGZyb20gdGhlaXIgc2VsZWN0b3JzLlxuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZUFzdD4oKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBlbGVtZW50LmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGlmICghZGlyLmRpcmVjdGl2ZS5zZWxlY3RvcikgY29udGludWU7XG4gICAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpci5kaXJlY3RpdmUuc2VsZWN0b3IpLCBkaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNlZSBpZiB0aGlzIGF0dHJpYnV0ZSBtYXRjaGVzIHRoZSBzZWxlY3RvciBvZiBhbnkgZGlyZWN0aXZlIG9uIHRoZSBlbGVtZW50LlxuICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNlbGVjdG9yID0gYFske2FzdC5uYW1lfT0ke2FzdC52YWx1ZX1dYDtcbiAgICAgICAgICBjb25zdCBwYXJzZWRBdHRyaWJ1dGUgPSBDc3NTZWxlY3Rvci5wYXJzZShhdHRyaWJ1dGVTZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKCFwYXJzZWRBdHRyaWJ1dGUubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgbWF0Y2hlci5tYXRjaChwYXJzZWRBdHRyaWJ1dGVbMF0sIChfLCB7ZGlyZWN0aXZlfSkgPT4ge1xuICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBkaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRCb3VuZFRleHQoYXN0KSB7XG4gICAgICAgICAgY29uc3QgZXhwcmVzc2lvblBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICAgICAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICAgICAgZ2V0RXhwcmVzc2lvblN5bWJvbChzY29wZSwgYXN0LnZhbHVlLCB0ZW1wbGF0ZVBvc2l0aW9uLCBpbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gcmVzdWx0LnN5bWJvbDtcbiAgICAgICAgICAgICAgc3BhbiA9IG9mZnNldFNwYW4ocmVzdWx0LnNwYW4sIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdFRleHQoYXN0KSB7fSxcbiAgICAgICAgdmlzaXREaXJlY3RpdmUoYXN0KSB7XG4gICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgc3RhdGljU3ltYm9sID0gYXN0LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdCkge1xuICAgICAgICAgIGlmICghYXR0cmlidXRlVmFsdWVTeW1ib2woYXN0LnZhbHVlKSkge1xuICAgICAgICAgICAgc3ltYm9sID0gZmluZElucHV0QmluZGluZyhpbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uLCBhc3QpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG51bGwpO1xuICBpZiAoc3ltYm9sICYmIHNwYW4pIHtcbiAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBvZmZzZXRTcGFuKHNwYW4sIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN5bWJvbCxcbiAgICAgIHNwYW46IHRzcy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoc3RhcnQsIGVuZCksIHN0YXRpY1N5bWJvbCxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRBdHRyaWJ1dGUoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogQXR0cmlidXRlfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKGluZm8uaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIHJldHVybiBwYXRoLmZpcnN0KEF0dHJpYnV0ZSk7XG59XG5cbi8vIFRPRE86IHJlbW92ZSB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBwYXRoIGluY2x1ZGVzICdEaXJlY3RpdmVBc3QnLlxuLy8gRmluZCB0aGUgZGlyZWN0aXZlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHNwZWNpZmllZCAnYmluZGluZydcbi8vIGF0IHRoZSBzcGVjaWZpZWQgJ3Bvc2l0aW9uJyBpbiB0aGUgJ2FzdCcuXG5mdW5jdGlvbiBmaW5kUGFyZW50T2ZCaW5kaW5nKFxuICAgIGFzdDogVGVtcGxhdGVBc3RbXSwgYmluZGluZzogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgcG9zaXRpb246IG51bWJlcik6IERpcmVjdGl2ZUFzdHxcbiAgICB1bmRlZmluZWQge1xuICBsZXQgcmVzOiBEaXJlY3RpdmVBc3R8dW5kZWZpbmVkO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IFRlbXBsYXRlQXN0KTogYW55IHtcbiAgICAgIGNvbnN0IHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgIGlmICghaW5TcGFuKHBvc2l0aW9uLCBzcGFuKSkge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXREaXJlY3RpdmUoYXN0OiBEaXJlY3RpdmVBc3QpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRDaGlsZHJlbihhc3QsIHZpc2l0ID0+IHsgdmlzaXQoYXN0LmlucHV0cyk7IH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgY29udGV4dDogRGlyZWN0aXZlQXN0KSB7XG4gICAgICBpZiAoYXN0ID09PSBiaW5kaW5nKSB7XG4gICAgICAgIHJlcyA9IGNvbnRleHQ7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGFzdCk7XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbnB1dEJpbmRpbmcoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyLCBiaW5kaW5nOiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRpcmVjdGl2ZUFzdCA9IGZpbmRQYXJlbnRPZkJpbmRpbmcoaW5mby50ZW1wbGF0ZUFzdCwgYmluZGluZywgcG9zaXRpb24pO1xuICBpZiAoZGlyZWN0aXZlQXN0KSB7XG4gICAgY29uc3QgaW52ZXJ0ZWRJbnB1dCA9IGludmVydE1hcChkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLmlucHV0cyk7XG4gICAgY29uc3QgZmllbGROYW1lID0gaW52ZXJ0ZWRJbnB1dFtiaW5kaW5nLnRlbXBsYXRlTmFtZV07XG4gICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sLm1lbWJlcnMoKS5nZXQoZmllbGROYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZE91dHB1dEJpbmRpbmcoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGJpbmRpbmc6IEJvdW5kRXZlbnRBc3QpOiBTeW1ib2x8XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudEFzdCk7XG4gIGlmIChlbGVtZW50KSB7XG4gICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZWxlbWVudC5kaXJlY3RpdmVzKSB7XG4gICAgICBjb25zdCBpbnZlcnRlZE91dHB1dHMgPSBpbnZlcnRNYXAoZGlyZWN0aXZlLmRpcmVjdGl2ZS5vdXRwdXRzKTtcbiAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGludmVydGVkT3V0cHV0c1tiaW5kaW5nLm5hbWVdO1xuICAgICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChkaXJlY3RpdmUuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sLm1lbWJlcnMoKS5nZXQoZmllbGROYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZlcnRNYXAob2JqOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30pOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCByZXN1bHQ6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMob2JqKSkge1xuICAgIGNvbnN0IHYgPSBvYmpbbmFtZV07XG4gICAgcmVzdWx0W3ZdID0gbmFtZTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFdyYXAgYSBzeW1ib2wgYW5kIGNoYW5nZSBpdHMga2luZCB0byBjb21wb25lbnQuXG4gKi9cbmNsYXNzIE92ZXJyaWRlS2luZFN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHB1YmxpYyByZWFkb25seSBraW5kOiBEaXJlY3RpdmVLaW5kO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN5bTogU3ltYm9sLCBraW5kT3ZlcnJpZGU6IERpcmVjdGl2ZUtpbmQpIHsgdGhpcy5raW5kID0ga2luZE92ZXJyaWRlOyB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc3ltLm5hbWU7IH1cblxuICBnZXQgbGFuZ3VhZ2UoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc3ltLmxhbmd1YWdlOyB9XG5cbiAgZ2V0IHR5cGUoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS50eXBlOyB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLmNvbnRhaW5lcjsgfVxuXG4gIGdldCBwdWJsaWMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5wdWJsaWM7IH1cblxuICBnZXQgY2FsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5jYWxsYWJsZTsgfVxuXG4gIGdldCBudWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLm51bGxhYmxlOyB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbiB7IHJldHVybiB0aGlzLnN5bS5kZWZpbml0aW9uOyB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7IHJldHVybiB0aGlzLnN5bS5kb2N1bWVudGF0aW9uOyB9XG5cbiAgbWVtYmVycygpIHsgcmV0dXJuIHRoaXMuc3ltLm1lbWJlcnMoKTsgfVxuXG4gIHNpZ25hdHVyZXMoKSB7IHJldHVybiB0aGlzLnN5bS5zaWduYXR1cmVzKCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKSB7IHJldHVybiB0aGlzLnN5bS5zZWxlY3RTaWduYXR1cmUodHlwZXMpOyB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKSB7IHJldHVybiB0aGlzLnN5bS5pbmRleGVkKGFyZ3VtZW50KTsgfVxuXG4gIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW118dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLnR5cGVBcmd1bWVudHMoKTsgfVxufVxuIl19