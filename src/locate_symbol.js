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
        define("@angular/language-service/src/locate_symbol", ["require", "exports", "tslib", "@angular/compiler", "@angular/language-service/src/expression_diagnostics", "@angular/language-service/src/expressions", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var expression_diagnostics_1 = require("@angular/language-service/src/expression_diagnostics");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Traverse the template AST and locate the Symbol at the specified `position`.
     * @param info Ast and Template Source
     * @param position location to look for
     */
    function locateSymbol(info, position) {
        var templatePosition = position - info.template.span.start;
        var path = utils_1.findTemplateAstAt(info.templateAst, templatePosition);
        var compileTypeSummary = undefined;
        if (path.tail) {
            var symbol_1 = undefined;
            var span_1 = undefined;
            var attributeValueSymbol_1 = function (ast, inEvent) {
                if (inEvent === void 0) { inEvent = false; }
                var attribute = findAttribute(info, position);
                if (attribute) {
                    if (utils_1.inSpan(templatePosition, utils_1.spanOf(attribute.valueSpan))) {
                        var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                        var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                        if (attribute.valueSpan) {
                            var result = expressions_1.getExpressionSymbol(scope, ast, templatePosition, info.template.query);
                            if (result) {
                                symbol_1 = result.symbol;
                                var expressionOffset = attribute.valueSpan.start.offset;
                                span_1 = utils_1.offsetSpan(result.span, expressionOffset);
                            }
                        }
                        return true;
                    }
                }
                return false;
            };
            path.tail.visit({
                visitNgContent: function (ast) { },
                visitEmbeddedTemplate: function (ast) { },
                visitElement: function (ast) {
                    var component = ast.directives.find(function (d) { return d.directive.isComponent; });
                    if (component) {
                        compileTypeSummary = component.directive;
                        symbol_1 = info.template.query.getTypeSymbol(compileTypeSummary.type.reference);
                        symbol_1 = symbol_1 && new OverrideKindSymbol(symbol_1, types_1.DirectiveKind.COMPONENT);
                        span_1 = utils_1.spanOf(ast);
                    }
                    else {
                        // Find a directive that matches the element name
                        var directive = ast.directives.find(function (d) { return d.directive.selector != null && d.directive.selector.indexOf(ast.name) >= 0; });
                        if (directive) {
                            compileTypeSummary = directive.directive;
                            symbol_1 = info.template.query.getTypeSymbol(compileTypeSummary.type.reference);
                            symbol_1 = symbol_1 && new OverrideKindSymbol(symbol_1, types_1.DirectiveKind.DIRECTIVE);
                            span_1 = utils_1.spanOf(ast);
                        }
                    }
                },
                visitReference: function (ast) {
                    symbol_1 = ast.value && info.template.query.getTypeSymbol(compiler_1.tokenReference(ast.value));
                    span_1 = utils_1.spanOf(ast);
                },
                visitVariable: function (ast) { },
                visitEvent: function (ast) {
                    if (!attributeValueSymbol_1(ast.handler, /* inEvent */ true)) {
                        symbol_1 = findOutputBinding(info, path, ast);
                        symbol_1 = symbol_1 && new OverrideKindSymbol(symbol_1, types_1.DirectiveKind.EVENT);
                        span_1 = utils_1.spanOf(ast);
                    }
                },
                visitElementProperty: function (ast) { attributeValueSymbol_1(ast.value); },
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
                    matcher.match(parsedAttribute[0], function (_, directive) {
                        symbol_1 = info.template.query.getTypeSymbol(directive.directive.type.reference);
                        symbol_1 = symbol_1 && new OverrideKindSymbol(symbol_1, types_1.DirectiveKind.DIRECTIVE);
                        span_1 = utils_1.spanOf(ast);
                    });
                },
                visitBoundText: function (ast) {
                    var expressionPosition = templatePosition - ast.sourceSpan.start.offset;
                    if (utils_1.inSpan(expressionPosition, ast.value.span)) {
                        var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                        var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                        var result = expressions_1.getExpressionSymbol(scope, ast.value, templatePosition, info.template.query);
                        if (result) {
                            symbol_1 = result.symbol;
                            span_1 = utils_1.offsetSpan(result.span, ast.sourceSpan.start.offset);
                        }
                    }
                },
                visitText: function (ast) { },
                visitDirective: function (ast) {
                    compileTypeSummary = ast.directive;
                    symbol_1 = info.template.query.getTypeSymbol(compileTypeSummary.type.reference);
                    span_1 = utils_1.spanOf(ast);
                },
                visitDirectiveProperty: function (ast) {
                    if (!attributeValueSymbol_1(ast.value)) {
                        symbol_1 = findInputBinding(info, templatePosition, ast);
                        span_1 = utils_1.spanOf(ast);
                    }
                }
            }, null);
            if (symbol_1 && span_1) {
                return { symbol: symbol_1, span: utils_1.offsetSpan(span_1, info.template.span.start), compileTypeSummary: compileTypeSummary };
            }
        }
    }
    exports.locateSymbol = locateSymbol;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXlSO0lBR3pSLCtGQUE0RDtJQUM1RCx5RUFBa0Q7SUFDbEQsNkRBQWdFO0lBQ2hFLDZEQUErSDtJQVEvSDs7OztPQUlHO0lBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQWUsRUFBRSxRQUFnQjtRQUM1RCxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcseUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQUksa0JBQWtCLEdBQWlDLFNBQVMsQ0FBQztRQUNqRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDYixJQUFJLFFBQU0sR0FBcUIsU0FBUyxDQUFDO1lBQ3pDLElBQUksTUFBSSxHQUFtQixTQUFTLENBQUM7WUFDckMsSUFBTSxzQkFBb0IsR0FBRyxVQUFDLEdBQVEsRUFBRSxPQUF3QjtnQkFBeEIsd0JBQUEsRUFBQSxlQUF3QjtnQkFDOUQsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxTQUFTLEVBQUU7b0JBQ2IsSUFBSSxjQUFNLENBQUMsZ0JBQWdCLEVBQUUsY0FBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFO3dCQUN6RCxJQUFNLEtBQUssR0FBRyxzQ0FBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbkQsSUFBTSxLQUFLLEdBQUcsMkNBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3dC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S0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVFLG9DQUFPLEdBQVAsVUFBUSxRQUFnQixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLDBDQUFhLEdBQWIsY0FBc0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRSx5QkFBQztJQUFELENBQUMsQUEvQkQsSUErQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBdHRyaWJ1dGUsIEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIENvbXBpbGVUeXBlU3VtbWFyeSwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBTZWxlY3Rvck1hdGNoZXIsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIHRlbXBsYXRlVmlzaXRBbGwsIHRva2VuUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblN5bWJvbH0gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb24sIERpcmVjdGl2ZUtpbmQsIFNwYW4sIFN5bWJvbH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGdldFBhdGhUb05vZGVBdFBvc2l0aW9uLCBpblNwYW4sIG9mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3ltYm9sSW5mbyB7XG4gIHN5bWJvbDogU3ltYm9sO1xuICBzcGFuOiBTcGFuO1xuICBjb21waWxlVHlwZVN1bW1hcnk6IENvbXBpbGVUeXBlU3VtbWFyeXx1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9jYXRlIHRoZSBTeW1ib2wgYXQgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICogQHBhcmFtIGluZm8gQXN0IGFuZCBUZW1wbGF0ZSBTb3VyY2VcbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiB0byBsb29rIGZvclxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlU3ltYm9sKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IFN5bWJvbEluZm98dW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGxldCBjb21waWxlVHlwZVN1bW1hcnk6IENvbXBpbGVUeXBlU3VtbWFyeXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmIChwYXRoLnRhaWwpIHtcbiAgICBsZXQgc3ltYm9sOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCBhdHRyaWJ1dGVWYWx1ZVN5bWJvbCA9IChhc3Q6IEFTVCwgaW5FdmVudDogYm9vbGVhbiA9IGZhbHNlKTogYm9vbGVhbiA9PiB7XG4gICAgICBjb25zdCBhdHRyaWJ1dGUgPSBmaW5kQXR0cmlidXRlKGluZm8sIHBvc2l0aW9uKTtcbiAgICAgIGlmIChhdHRyaWJ1dGUpIHtcbiAgICAgICAgaWYgKGluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXR0cmlidXRlLnZhbHVlU3BhbikpKSB7XG4gICAgICAgICAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gICAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICAgIGlmIChhdHRyaWJ1dGUudmFsdWVTcGFuKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgICAgICBjb25zdCBleHByZXNzaW9uT2Zmc2V0ID0gYXR0cmlidXRlLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgICAgICAgIHNwYW4gPSBvZmZzZXRTcGFuKHJlc3VsdC5zcGFuLCBleHByZXNzaW9uT2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIHBhdGgudGFpbC52aXNpdChcbiAgICAgICAge1xuICAgICAgICAgIHZpc2l0TmdDb250ZW50KGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gYXN0LmRpcmVjdGl2ZXMuZmluZChkID0+IGQuZGlyZWN0aXZlLmlzQ29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgY29tcGlsZVR5cGVTdW1tYXJ5ID0gY29tcG9uZW50LmRpcmVjdGl2ZTtcbiAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGNvbXBpbGVUeXBlU3VtbWFyeS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5DT01QT05FTlQpO1xuICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBGaW5kIGEgZGlyZWN0aXZlIHRoYXQgbWF0Y2hlcyB0aGUgZWxlbWVudCBuYW1lXG4gICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGFzdC5kaXJlY3RpdmVzLmZpbmQoXG4gICAgICAgICAgICAgICAgICBkID0+IGQuZGlyZWN0aXZlLnNlbGVjdG9yICE9IG51bGwgJiYgZC5kaXJlY3RpdmUuc2VsZWN0b3IuaW5kZXhPZihhc3QubmFtZSkgPj0gMCk7XG4gICAgICAgICAgICAgIGlmIChkaXJlY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBjb21waWxlVHlwZVN1bW1hcnkgPSBkaXJlY3RpdmUuZGlyZWN0aXZlO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRSZWZlcmVuY2UoYXN0KSB7XG4gICAgICAgICAgICBzeW1ib2wgPSBhc3QudmFsdWUgJiYgaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHRva2VuUmVmZXJlbmNlKGFzdC52YWx1ZSkpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRWYXJpYWJsZShhc3QpIHt9LFxuICAgICAgICAgIHZpc2l0RXZlbnQoYXN0KSB7XG4gICAgICAgICAgICBpZiAoIWF0dHJpYnV0ZVZhbHVlU3ltYm9sKGFzdC5oYW5kbGVyLCAvKiBpbkV2ZW50ICovIHRydWUpKSB7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IGZpbmRPdXRwdXRCaW5kaW5nKGluZm8sIHBhdGgsIGFzdCk7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5FVkVOVCk7XG4gICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdCkgeyBhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QudmFsdWUpOyB9LFxuICAgICAgICAgIHZpc2l0QXR0cihhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmhlYWQ7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIShlbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudEFzdCkpIHJldHVybjtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIG1hcHBpbmcgb2YgYWxsIGRpcmVjdGl2ZXMgYXBwbGllZCB0byB0aGUgZWxlbWVudCBmcm9tIHRoZWlyIHNlbGVjdG9ycy5cbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZUFzdD4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgICAgICAgICBpZiAoIWRpci5kaXJlY3RpdmUuc2VsZWN0b3IpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpci5kaXJlY3RpdmUuc2VsZWN0b3IpLCBkaXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZWUgaWYgdGhpcyBhdHRyaWJ1dGUgbWF0Y2hlcyB0aGUgc2VsZWN0b3Igb2YgYW55IGRpcmVjdGl2ZSBvbiB0aGUgZWxlbWVudC5cbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNlbGVjdG9yID0gYFske2FzdC5uYW1lfT0ke2FzdC52YWx1ZX1dYDtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZEF0dHJpYnV0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGF0dHJpYnV0ZVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICghcGFyc2VkQXR0cmlidXRlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICAgICAgbWF0Y2hlci5tYXRjaChwYXJzZWRBdHRyaWJ1dGVbMF0sIChfLCBkaXJlY3RpdmUpID0+IHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGRpcmVjdGl2ZS5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEJvdW5kVGV4dChhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb25Qb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgICAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgICAgICBjb25zdCBzY29wZSA9IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICAgICAgICBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QudmFsdWUsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gcmVzdWx0LnN5bWJvbDtcbiAgICAgICAgICAgICAgICBzcGFuID0gb2Zmc2V0U3BhbihyZXN1bHQuc3BhbiwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRUZXh0KGFzdCkge30sXG4gICAgICAgICAgdmlzaXREaXJlY3RpdmUoYXN0KSB7XG4gICAgICAgICAgICBjb21waWxlVHlwZVN1bW1hcnkgPSBhc3QuZGlyZWN0aXZlO1xuICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGNvbXBpbGVUeXBlU3VtbWFyeS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdCkge1xuICAgICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QudmFsdWUpKSB7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IGZpbmRJbnB1dEJpbmRpbmcoaW5mbywgdGVtcGxhdGVQb3NpdGlvbiwgYXN0KTtcbiAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCk7XG4gICAgaWYgKHN5bWJvbCAmJiBzcGFuKSB7XG4gICAgICByZXR1cm4ge3N5bWJvbCwgc3Bhbjogb2Zmc2V0U3BhbihzcGFuLCBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQpLCBjb21waWxlVHlwZVN1bW1hcnl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kQXR0cmlidXRlKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IEF0dHJpYnV0ZXx1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbihpbmZvLmh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICByZXR1cm4gcGF0aC5maXJzdChBdHRyaWJ1dGUpO1xufVxuXG4vLyBUT0RPOiByZW1vdmUgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgcGF0aCBpbmNsdWRlcyAnRGlyZWN0aXZlQXN0Jy5cbi8vIEZpbmQgdGhlIGRpcmVjdGl2ZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBzcGVjaWZpZWQgJ2JpbmRpbmcnXG4vLyBhdCB0aGUgc3BlY2lmaWVkICdwb3NpdGlvbicgaW4gdGhlICdhc3QnLlxuZnVuY3Rpb24gZmluZFBhcmVudE9mQmluZGluZyhcbiAgICBhc3Q6IFRlbXBsYXRlQXN0W10sIGJpbmRpbmc6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIHBvc2l0aW9uOiBudW1iZXIpOiBEaXJlY3RpdmVBc3R8XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IHJlczogRGlyZWN0aXZlQXN0fHVuZGVmaW5lZDtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXQoYXN0OiBUZW1wbGF0ZUFzdCk6IGFueSB7XG4gICAgICBjb25zdCBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICBpZiAoIWluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgLy8gUmV0dXJuaW5nIGEgdmFsdWUgaGVyZSB3aWxsIHJlc3VsdCBpbiB0aGUgY2hpbGRyZW4gYmVpbmcgc2tpcHBlZC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZpc2l0Q2hpbGRyZW4oYXN0LCB2aXNpdCA9PiB7IHZpc2l0KGFzdC5pbnB1dHMpOyB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIGNvbnRleHQ6IERpcmVjdGl2ZUFzdCkge1xuICAgICAgaWYgKGFzdCA9PT0gYmluZGluZykge1xuICAgICAgICByZXMgPSBjb250ZXh0O1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBhc3QpO1xuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBmaW5kSW5wdXRCaW5kaW5nKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlciwgYmluZGluZzogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBjb25zdCBkaXJlY3RpdmVBc3QgPSBmaW5kUGFyZW50T2ZCaW5kaW5nKGluZm8udGVtcGxhdGVBc3QsIGJpbmRpbmcsIHBvc2l0aW9uKTtcbiAgaWYgKGRpcmVjdGl2ZUFzdCkge1xuICAgIGNvbnN0IGludmVydGVkSW5wdXQgPSBpbnZlcnRNYXAoZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS5pbnB1dHMpO1xuICAgIGNvbnN0IGZpZWxkTmFtZSA9IGludmVydGVkSW5wdXRbYmluZGluZy50ZW1wbGF0ZU5hbWVdO1xuICAgIGlmIChmaWVsZE5hbWUpIHtcbiAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgIHJldHVybiBjbGFzc1N5bWJvbC5tZW1iZXJzKCkuZ2V0KGZpZWxkTmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRPdXRwdXRCaW5kaW5nKGluZm86IEFzdFJlc3VsdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBiaW5kaW5nOiBCb3VuZEV2ZW50QXN0KTogU3ltYm9sfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnRBc3QpO1xuICBpZiAoZWxlbWVudCkge1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgaW52ZXJ0ZWRPdXRwdXRzID0gaW52ZXJ0TWFwKGRpcmVjdGl2ZS5kaXJlY3RpdmUub3V0cHV0cyk7XG4gICAgICBjb25zdCBmaWVsZE5hbWUgPSBpbnZlcnRlZE91dHB1dHNbYmluZGluZy5uYW1lXTtcbiAgICAgIGlmIChmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woZGlyZWN0aXZlLmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICAgIHJldHVybiBjbGFzc1N5bWJvbC5tZW1iZXJzKCkuZ2V0KGZpZWxkTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0TWFwKG9iajoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KToge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgcmVzdWx0OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKG9iaikpIHtcbiAgICBjb25zdCB2ID0gb2JqW25hbWVdO1xuICAgIHJlc3VsdFt2XSA9IG5hbWU7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBXcmFwIGEgc3ltYm9sIGFuZCBjaGFuZ2UgaXRzIGtpbmQgdG8gY29tcG9uZW50LlxuICovXG5jbGFzcyBPdmVycmlkZUtpbmRTeW1ib2wgaW1wbGVtZW50cyBTeW1ib2wge1xuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGlyZWN0aXZlS2luZDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzeW06IFN5bWJvbCwga2luZE92ZXJyaWRlOiBEaXJlY3RpdmVLaW5kKSB7IHRoaXMua2luZCA9IGtpbmRPdmVycmlkZTsgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5uYW1lOyB9XG5cbiAgZ2V0IGxhbmd1YWdlKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5sYW5ndWFnZTsgfVxuXG4gIGdldCB0eXBlKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0udHlwZTsgfVxuXG4gIGdldCBjb250YWluZXIoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS5jb250YWluZXI7IH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0ucHVibGljOyB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0uY2FsbGFibGU7IH1cblxuICBnZXQgbnVsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5udWxsYWJsZTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gdGhpcy5zeW0uZGVmaW5pdGlvbjsgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10geyByZXR1cm4gdGhpcy5zeW0uZG9jdW1lbnRhdGlvbjsgfVxuXG4gIG1lbWJlcnMoKSB7IHJldHVybiB0aGlzLnN5bS5tZW1iZXJzKCk7IH1cblxuICBzaWduYXR1cmVzKCkgeyByZXR1cm4gdGhpcy5zeW0uc2lnbmF0dXJlcygpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSkgeyByZXR1cm4gdGhpcy5zeW0uc2VsZWN0U2lnbmF0dXJlKHR5cGVzKTsgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCkgeyByZXR1cm4gdGhpcy5zeW0uaW5kZXhlZChhcmd1bWVudCk7IH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS50eXBlQXJndW1lbnRzKCk7IH1cbn1cbiJdfQ==