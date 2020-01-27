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
        var _a;
        var templatePosition = position - info.template.span.start;
        // TODO: update `findTemplateAstAt` to use absolute positions.
        var path = utils_1.findTemplateAstAt(info.templateAst, templatePosition);
        var attribute = findAttribute(info, position);
        if (!path.tail)
            return [];
        var narrowest = utils_1.spanOf(path.tail);
        var toVisit = [];
        for (var node = path.tail; node && utils_1.isNarrower(utils_1.spanOf(node.sourceSpan), narrowest); node = path.parentOf(node)) {
            toVisit.push(node);
        }
        // For the structural directive, only care about the last template AST.
        if ((_a = attribute) === null || _a === void 0 ? void 0 : _a.name.startsWith('*')) {
            toVisit.splice(0, toVisit.length - 1);
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
        var attributeValueSymbol = function () {
            var attribute = findAttribute(info, position);
            if (attribute) {
                if (utils_1.inSpan(templatePosition, utils_1.spanOf(attribute.valueSpan))) {
                    var result = getSymbolInAttributeValue(info, path, attribute);
                    if (result) {
                        symbol = result.symbol;
                        span = utils_1.offsetSpan(result.span, attribute.valueSpan.start.offset);
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
                if (!attributeValueSymbol()) {
                    symbol = findOutputBinding(info, path, ast);
                    symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.EVENT);
                    span = utils_1.spanOf(ast);
                }
            },
            visitElementProperty: function (ast) { attributeValueSymbol(); },
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
                if (!attributeValueSymbol()) {
                    var directive = findParentOfBinding(info.templateAst, ast, templatePosition);
                    var attribute = findAttribute(info, position);
                    if (directive && attribute) {
                        if (attribute.name.startsWith('*')) {
                            var compileTypeSummary = directive.directive;
                            symbol = info.template.query.getTypeSymbol(compileTypeSummary.type.reference);
                            symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.DIRECTIVE);
                            // Use 'attribute.sourceSpan' instead of the directive's,
                            // because the span of the directive is the whole opening tag of an element.
                            span = utils_1.spanOf(attribute.sourceSpan);
                        }
                        else {
                            symbol = findInputBinding(info, ast.templateName, directive);
                            span = utils_1.spanOf(ast);
                        }
                    }
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
    // Get the symbol in attribute value at template position.
    function getSymbolInAttributeValue(info, path, attribute) {
        if (!attribute.valueSpan) {
            return;
        }
        var result;
        var templateBindings = info.expressionParser.parseTemplateBindings(attribute.name, attribute.value, attribute.sourceSpan.toString(), attribute.valueSpan.start.offset).templateBindings;
        // Find where the cursor is relative to the start of the attribute value.
        var valueRelativePosition = path.position - attribute.valueSpan.start.offset;
        // Find the symbol that contains the position.
        templateBindings.filter(function (tb) { return !tb.keyIsVar; }).forEach(function (tb) {
            var _a;
            if (utils_1.inSpan(valueRelativePosition, (_a = tb.expression) === null || _a === void 0 ? void 0 : _a.ast.span)) {
                var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                result = expressions_1.getExpressionSymbol(scope, tb.expression, path.position, info.template.query);
            }
            else if (utils_1.inSpan(valueRelativePosition, tb.span)) {
                var template = path.first(compiler_1.EmbeddedTemplateAst);
                if (template) {
                    // One element can only have one template binding.
                    var directiveAst = template.directives[0];
                    if (directiveAst) {
                        var symbol = findInputBinding(info, tb.key.substring(1), directiveAst);
                        if (symbol) {
                            result = { symbol: symbol, span: tb.span };
                        }
                    }
                }
            }
        });
        return result;
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
    // Find the symbol of input binding in 'directiveAst' by 'name'.
    function findInputBinding(info, name, directiveAst) {
        var invertedInput = invertMap(directiveAst.directive.inputs);
        var fieldName = invertedInput[name];
        if (fieldName) {
            var classSymbol = info.template.query.getTypeSymbol(directiveAst.directive.type.reference);
            if (classSymbol) {
                return classSymbol.members().get(fieldName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1SO0lBQ25SLG9EQUFzRDtJQUV0RCwrRkFBNEQ7SUFDNUQseUVBQWtEO0lBQ2xELDZEQUFnRTtJQUNoRSw2REFBMkk7SUFRM0k7Ozs7T0FJRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7O1FBQzdELElBQU0sZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM3RCw4REFBOEQ7UUFDOUQsSUFBTSxJQUFJLEdBQUcseUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFFMUIsSUFBTSxTQUFTLEdBQUcsY0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxJQUFJLEdBQTBCLElBQUksQ0FBQyxJQUFJLEVBQzNDLElBQUksSUFBSSxrQkFBVSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQjtRQUVELHVFQUF1RTtRQUN2RSxVQUFJLFNBQVMsMENBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUc7WUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN2QztRQUVELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUE3QixDQUE2QixDQUFDO2FBQ25ELE1BQU0sQ0FBQyxVQUFDLEdBQUcsSUFBd0IsT0FBQSxHQUFHLEtBQUssU0FBUyxFQUFqQixDQUFpQixDQUFDLENBQUM7SUFDN0QsQ0FBQztJQXRCRCxzQ0FzQkM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsWUFBWSxDQUFDLEdBQWdCLEVBQUUsSUFBcUIsRUFBRSxJQUFlO1FBRTVFLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2QyxJQUFNLFFBQVEsR0FBRyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDN0QsSUFBSSxNQUF3QixDQUFDO1FBQzdCLElBQUksSUFBb0IsQ0FBQztRQUN6QixJQUFJLFlBQW9DLENBQUM7UUFDekMsSUFBTSxvQkFBb0IsR0FBRztZQUMzQixJQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hELElBQUksU0FBUyxFQUFFO2dCQUNiLElBQUksY0FBTSxDQUFDLGdCQUFnQixFQUFFLGNBQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRTtvQkFDekQsSUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDaEUsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7d0JBQ3ZCLElBQUksR0FBRyxrQkFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLFNBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3BFO29CQUNELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQztRQUNGLEdBQUcsQ0FBQyxLQUFLLENBQ0w7WUFDRSxjQUFjLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDdEIscUJBQXFCLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDN0IsWUFBWSxFQUFaLFVBQWEsR0FBRztnQkFDZCxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUF2QixDQUF1QixDQUFDLENBQUM7Z0JBQ3BFLElBQUksU0FBUyxFQUFFO29CQUNiLG1EQUFtRDtvQkFDbkQsWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQXlCLENBQUM7b0JBQ2xFLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQ3pELE1BQU0sR0FBRyxNQUFNLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUscUJBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDM0UsSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEI7cUJBQU07b0JBQ0wsaURBQWlEO29CQUNqRCxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDakMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQTNFLENBQTJFLENBQUMsQ0FBQztvQkFDdEYsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsbURBQW1EO3dCQUNuRCxZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBeUIsQ0FBQzt3QkFDbEUsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQzt3QkFDekQsTUFBTSxHQUFHLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxxQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO3dCQUMzRSxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNwQjtpQkFDRjtZQUNILENBQUM7WUFDRCxjQUFjLFlBQUMsR0FBRztnQkFDaEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHlCQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ25GLElBQUksR0FBRyxjQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsQ0FBQztZQUNELGFBQWEsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUNyQixVQUFVLFlBQUMsR0FBRztnQkFDWixJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRTtvQkFDM0IsTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQzVDLE1BQU0sR0FBRyxNQUFNLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUscUJBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdkUsSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEI7WUFDSCxDQUFDO1lBQ0Qsb0JBQW9CLFlBQUMsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JELFNBQVMsRUFBVCxVQUFVLEdBQUc7O2dCQUNYLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxxQkFBVSxDQUFDO29CQUFFLE9BQU87Z0JBQ3pELGtGQUFrRjtnQkFDbEYsSUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBZSxFQUFnQixDQUFDOztvQkFDcEQsS0FBa0IsSUFBQSxLQUFBLGlCQUFBLE9BQU8sQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7d0JBQWpDLElBQU0sR0FBRyxXQUFBO3dCQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVE7NEJBQUUsU0FBUzt3QkFDdEMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxzQkFBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO3FCQUN4RTs7Ozs7Ozs7O2dCQUVELDhFQUE4RTtnQkFDOUUsSUFBTSxpQkFBaUIsR0FBRyxNQUFJLEdBQUcsQ0FBQyxJQUFJLFNBQUksR0FBRyxDQUFDLEtBQUssTUFBRyxDQUFDO2dCQUN2RCxJQUFNLGVBQWUsR0FBRyxzQkFBVyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU07b0JBQUUsT0FBTztnQkFDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBQyxDQUFDLEVBQUUsRUFBVzt3QkFBVix3QkFBUztvQkFDOUMsbURBQW1EO29CQUNuRCxZQUFZLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUF5QixDQUFDO29CQUN4RCxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUN6RCxNQUFNLEdBQUcsTUFBTSxJQUFJLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLHFCQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNFLElBQUksR0FBRyxjQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUNELGNBQWMsWUFBQyxHQUFHO2dCQUNoQixJQUFNLGtCQUFrQixHQUFHLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDMUUsSUFBSSxjQUFNLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDOUMsSUFBTSxLQUFLLEdBQUcsc0NBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ25ELElBQU0sS0FBSyxHQUFHLDJDQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDOUMsSUFBTSxNQUFNLEdBQ1IsaUNBQW1CLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakYsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7d0JBQ3ZCLElBQUksR0FBRyxrQkFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQzdEO2lCQUNGO1lBQ0gsQ0FBQztZQUNELFNBQVMsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUNqQixjQUFjLEVBQWQsVUFBZSxHQUFHO2dCQUNoQixtREFBbUQ7Z0JBQ25ELFlBQVksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUF5QixDQUFDO2dCQUM1RCxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFDRCxzQkFBc0IsWUFBQyxHQUFHO2dCQUN4QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRTtvQkFDM0IsSUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztvQkFDL0UsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxTQUFTLElBQUksU0FBUyxFQUFFO3dCQUMxQixJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFOzRCQUNsQyxJQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7NEJBQy9DLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUM5RSxNQUFNLEdBQUcsTUFBTSxJQUFJLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLHFCQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7NEJBQzNFLHlEQUF5RDs0QkFDekQsNEVBQTRFOzRCQUM1RSxJQUFJLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt5QkFDckM7NkJBQU07NEJBQ0wsTUFBTSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRCQUM3RCxJQUFJLEdBQUcsY0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3lCQUNwQjtxQkFDRjtpQkFDRjtZQUNILENBQUM7U0FDRixFQUNELElBQUksQ0FBQyxDQUFDO1FBQ1YsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ1osSUFBQSx1REFBeUQsRUFBeEQsZ0JBQUssRUFBRSxZQUFpRCxDQUFDO1lBQ2hFLE9BQU87Z0JBQ0wsTUFBTSxRQUFBO2dCQUNOLElBQUksRUFBRSxHQUFHLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFlBQVksY0FBQTthQUM3RCxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBRUQsMERBQTBEO0lBQzFELFNBQVMseUJBQXlCLENBQUMsSUFBZSxFQUFFLElBQXFCLEVBQUUsU0FBb0I7UUFFN0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUU7WUFDeEIsT0FBTztTQUNSO1FBQ0QsSUFBSSxNQUE4QyxDQUFDO1FBQzVDLElBQUEsbUxBQWdCLENBRWU7UUFDdEMseUVBQXlFO1FBQ3pFLElBQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFFL0UsOENBQThDO1FBQzlDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBWixDQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFOztZQUNwRCxJQUFJLGNBQU0sQ0FBQyxxQkFBcUIsUUFBRSxFQUFFLENBQUMsVUFBVSwwQ0FBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFELElBQU0sS0FBSyxHQUFHLHNDQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuRCxJQUFNLEtBQUssR0FBRywyQ0FBa0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sR0FBRyxpQ0FBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDMUY7aUJBQU0sSUFBSSxjQUFNLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDhCQUFtQixDQUFDLENBQUM7Z0JBQ2pELElBQUksUUFBUSxFQUFFO29CQUNaLGtEQUFrRDtvQkFDbEQsSUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxZQUFZLEVBQUU7d0JBQ2hCLElBQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQzt3QkFDekUsSUFBSSxNQUFNLEVBQUU7NEJBQ1YsTUFBTSxHQUFHLEVBQUMsTUFBTSxRQUFBLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQzt5QkFDbEM7cUJBQ0Y7aUJBQ0Y7YUFDRjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQWUsRUFBRSxRQUFnQjtRQUN0RCxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcsK0JBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBUyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELHFFQUFxRTtJQUNyRSxpRUFBaUU7SUFDakUsNENBQTRDO0lBQzVDLFNBQVMsbUJBQW1CLENBQ3hCLEdBQWtCLEVBQUUsT0FBa0MsRUFBRSxRQUFnQjtRQUUxRSxJQUFJLEdBQTJCLENBQUM7UUFDaEMsSUFBTSxPQUFPLEdBQUc7WUFBa0IsbUNBQTJCO1lBQXpDOztZQWlDcEIsQ0FBQztZQWhDQyx1QkFBSyxHQUFMLFVBQU0sR0FBZ0I7Z0JBQ3BCLElBQU0sSUFBSSxHQUFHLGNBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzNCLG9FQUFvRTtvQkFDcEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBRUQsdUNBQXFCLEdBQXJCLFVBQXNCLEdBQXdCLEVBQUUsT0FBWTtnQkFDMUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELDhCQUFZLEdBQVosVUFBYSxHQUFlLEVBQUUsT0FBWTtnQkFDeEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELGdDQUFjLEdBQWQsVUFBZSxHQUFpQjtnQkFDOUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsVUFBQSxLQUFLLElBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDO1lBRUQsd0NBQXNCLEdBQXRCLFVBQXVCLEdBQThCLEVBQUUsT0FBcUI7Z0JBQzFFLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtvQkFDbkIsR0FBRyxHQUFHLE9BQU8sQ0FBQztpQkFDZjtZQUNILENBQUM7WUFDSCxjQUFDO1FBQUQsQ0FBQyxBQWpDbUIsQ0FBYyxzQ0FBMkIsRUFpQzVELENBQUM7UUFDRiwyQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0IsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsZ0VBQWdFO0lBQ2hFLFNBQVMsZ0JBQWdCLENBQUMsSUFBZSxFQUFFLElBQVksRUFBRSxZQUEwQjtRQUVqRixJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRCxJQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxTQUFTLEVBQUU7WUFDYixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0YsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsT0FBTyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFlLEVBQUUsSUFBcUIsRUFBRSxPQUFzQjs7UUFFdkYsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBVSxDQUFDLENBQUM7UUFDdkMsSUFBSSxPQUFPLEVBQUU7O2dCQUNYLEtBQXdCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUF2QyxJQUFNLFNBQVMsV0FBQTtvQkFDbEIsSUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQy9ELElBQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hELElBQUksU0FBUyxFQUFFO3dCQUNiLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDMUYsSUFBSSxXQUFXLEVBQUU7NEJBQ2YsT0FBTyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3lCQUM3QztxQkFDRjtpQkFDRjs7Ozs7Ozs7O1NBQ0Y7SUFDSCxDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsR0FBNkI7O1FBQzlDLElBQU0sTUFBTSxHQUE2QixFQUFFLENBQUM7O1lBQzVDLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLGdCQUFBLDRCQUFFO2dCQUFoQyxJQUFNLE1BQUksV0FBQTtnQkFDYixJQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBSSxDQUFDLENBQUM7Z0JBQ3BCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFJLENBQUM7YUFDbEI7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNIO1FBRUUsNEJBQW9CLEdBQVcsRUFBRSxZQUEyQjtZQUF4QyxRQUFHLEdBQUgsR0FBRyxDQUFRO1lBQWlDLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO1FBQUMsQ0FBQztRQUUzRixzQkFBSSxvQ0FBSTtpQkFBUixjQUFxQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFNUMsc0JBQUksd0NBQVE7aUJBQVosY0FBeUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXBELHNCQUFJLG9DQUFJO2lCQUFSLGNBQStCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUV0RCxzQkFBSSx5Q0FBUztpQkFBYixjQUFvQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFaEUsc0JBQUksc0NBQU07aUJBQVYsY0FBd0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRWpELHNCQUFJLHdDQUFRO2lCQUFaLGNBQTBCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVyRCxzQkFBSSx3Q0FBUTtpQkFBWixjQUEwQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFckQsc0JBQUksMENBQVU7aUJBQWQsY0FBK0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTVELHNCQUFJLDZDQUFhO2lCQUFqQixjQUE4QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFOUUsb0NBQU8sR0FBUCxjQUFZLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEMsdUNBQVUsR0FBVixjQUFlLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUMsNENBQWUsR0FBZixVQUFnQixLQUFlLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUUsb0NBQU8sR0FBUCxVQUFRLFFBQWdCLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEUsMENBQWEsR0FBYixjQUFzQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFFLHlCQUFDO0lBQUQsQ0FBQyxBQS9CRCxJQStCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRpY1N5bWJvbCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgdGVtcGxhdGVWaXNpdEFsbCwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU3ltYm9sfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7RGVmaW5pdGlvbiwgRGlyZWN0aXZlS2luZCwgU3BhbiwgU3ltYm9sfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGluU3BhbiwgaXNOYXJyb3dlciwgb2Zmc2V0U3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBTeW1ib2xJbmZvIHtcbiAgc3ltYm9sOiBTeW1ib2w7XG4gIHNwYW46IHRzcy5UZXh0U3BhbjtcbiAgc3RhdGljU3ltYm9sPzogU3RhdGljU3ltYm9sO1xufVxuXG4vKipcbiAqIFRyYXZlcnNlcyBhIHRlbXBsYXRlIEFTVCBhbmQgbG9jYXRlcyBzeW1ib2wocykgYXQgYSBzcGVjaWZpZWQgcG9zaXRpb24uXG4gKiBAcGFyYW0gaW5mbyB0ZW1wbGF0ZSBBU1QgaW5mb3JtYXRpb24gc2V0XG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gdG8gbG9jYXRlIHN5bWJvbHMgYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZVN5bWJvbHMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogU3ltYm9sSW5mb1tdIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICAvLyBUT0RPOiB1cGRhdGUgYGZpbmRUZW1wbGF0ZUFzdEF0YCB0byB1c2UgYWJzb2x1dGUgcG9zaXRpb25zLlxuICBjb25zdCBwYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IGF0dHJpYnV0ZSA9IGZpbmRBdHRyaWJ1dGUoaW5mbywgcG9zaXRpb24pO1xuXG4gIGlmICghcGF0aC50YWlsKSByZXR1cm4gW107XG5cbiAgY29uc3QgbmFycm93ZXN0ID0gc3Bhbk9mKHBhdGgudGFpbCk7XG4gIGNvbnN0IHRvVmlzaXQ6IFRlbXBsYXRlQXN0W10gPSBbXTtcbiAgZm9yIChsZXQgbm9kZTogVGVtcGxhdGVBc3R8dW5kZWZpbmVkID0gcGF0aC50YWlsO1xuICAgICAgIG5vZGUgJiYgaXNOYXJyb3dlcihzcGFuT2Yobm9kZS5zb3VyY2VTcGFuKSwgbmFycm93ZXN0KTsgbm9kZSA9IHBhdGgucGFyZW50T2Yobm9kZSkpIHtcbiAgICB0b1Zpc2l0LnB1c2gobm9kZSk7XG4gIH1cblxuICAvLyBGb3IgdGhlIHN0cnVjdHVyYWwgZGlyZWN0aXZlLCBvbmx5IGNhcmUgYWJvdXQgdGhlIGxhc3QgdGVtcGxhdGUgQVNULlxuICBpZiAoYXR0cmlidXRlPy5uYW1lLnN0YXJ0c1dpdGgoJyonKSkge1xuICAgIHRvVmlzaXQuc3BsaWNlKDAsIHRvVmlzaXQubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gdG9WaXNpdC5tYXAoYXN0ID0+IGxvY2F0ZVN5bWJvbChhc3QsIHBhdGgsIGluZm8pKVxuICAgICAgLmZpbHRlcigoc3ltKTogc3ltIGlzIFN5bWJvbEluZm8gPT4gc3ltICE9PSB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFZpc2l0cyBhIHRlbXBsYXRlIG5vZGUgYW5kIGxvY2F0ZXMgdGhlIHN5bWJvbCBpbiB0aGF0IG5vZGUgYXQgYSBwYXRoIHBvc2l0aW9uLlxuICogQHBhcmFtIGFzdCB0ZW1wbGF0ZSBBU1Qgbm9kZSB0byB2aXNpdFxuICogQHBhcmFtIHBhdGggbm9uLWVtcHR5IHNldCBvZiBuYXJyb3dpbmcgQVNUIG5vZGVzIGF0IGEgcG9zaXRpb25cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVCBpbmZvcm1hdGlvbiBzZXRcbiAqL1xuZnVuY3Rpb24gbG9jYXRlU3ltYm9sKGFzdDogVGVtcGxhdGVBc3QsIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgaW5mbzogQXN0UmVzdWx0KTogU3ltYm9sSW5mb3xcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcGF0aC5wb3NpdGlvbjtcbiAgY29uc3QgcG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uICsgaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBsZXQgc3ltYm9sOiBTeW1ib2x8dW5kZWZpbmVkO1xuICBsZXQgc3BhbjogU3Bhbnx1bmRlZmluZWQ7XG4gIGxldCBzdGF0aWNTeW1ib2w6IFN0YXRpY1N5bWJvbHx1bmRlZmluZWQ7XG4gIGNvbnN0IGF0dHJpYnV0ZVZhbHVlU3ltYm9sID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IGF0dHJpYnV0ZSA9IGZpbmRBdHRyaWJ1dGUoaW5mbywgcG9zaXRpb24pO1xuICAgIGlmIChhdHRyaWJ1dGUpIHtcbiAgICAgIGlmIChpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGF0dHJpYnV0ZS52YWx1ZVNwYW4pKSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBnZXRTeW1ib2xJbkF0dHJpYnV0ZVZhbHVlKGluZm8sIHBhdGgsIGF0dHJpYnV0ZSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgIHNwYW4gPSBvZmZzZXRTcGFuKHJlc3VsdC5zcGFuLCBhdHRyaWJ1dGUudmFsdWVTcGFuICEuc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBhc3QudmlzaXQoXG4gICAgICB7XG4gICAgICAgIHZpc2l0TmdDb250ZW50KGFzdCkge30sXG4gICAgICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QpIHt9LFxuICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gYXN0LmRpcmVjdGl2ZXMuZmluZChkID0+IGQuZGlyZWN0aXZlLmlzQ29tcG9uZW50KTtcbiAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGNvbXBvbmVudC5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuQ09NUE9ORU5UKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmluZCBhIGRpcmVjdGl2ZSB0aGF0IG1hdGNoZXMgdGhlIGVsZW1lbnQgbmFtZVxuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gYXN0LmRpcmVjdGl2ZXMuZmluZChcbiAgICAgICAgICAgICAgICBkID0+IGQuZGlyZWN0aXZlLnNlbGVjdG9yICE9IG51bGwgJiYgZC5kaXJlY3RpdmUuc2VsZWN0b3IuaW5kZXhPZihhc3QubmFtZSkgPj0gMCk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlKSB7XG4gICAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCBiZWNhdXNlICdyZWZlcmVuY2UnIGlzIHR5cGVkIGFzIGFueVxuICAgICAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBkaXJlY3RpdmUuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdFJlZmVyZW5jZShhc3QpIHtcbiAgICAgICAgICBzeW1ib2wgPSBhc3QudmFsdWUgJiYgaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHRva2VuUmVmZXJlbmNlKGFzdC52YWx1ZSkpO1xuICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRWYXJpYWJsZShhc3QpIHt9LFxuICAgICAgICB2aXNpdEV2ZW50KGFzdCkge1xuICAgICAgICAgIGlmICghYXR0cmlidXRlVmFsdWVTeW1ib2woKSkge1xuICAgICAgICAgICAgc3ltYm9sID0gZmluZE91dHB1dEJpbmRpbmcoaW5mbywgcGF0aCwgYXN0KTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5FVkVOVCk7XG4gICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3QpIHsgYXR0cmlidXRlVmFsdWVTeW1ib2woKTsgfSxcbiAgICAgICAgdmlzaXRBdHRyKGFzdCkge1xuICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmhlYWQ7XG4gICAgICAgICAgaWYgKCFlbGVtZW50IHx8ICEoZWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnRBc3QpKSByZXR1cm47XG4gICAgICAgICAgLy8gQ3JlYXRlIGEgbWFwcGluZyBvZiBhbGwgZGlyZWN0aXZlcyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50IGZyb20gdGhlaXIgc2VsZWN0b3JzLlxuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZUFzdD4oKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBlbGVtZW50LmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGlmICghZGlyLmRpcmVjdGl2ZS5zZWxlY3RvcikgY29udGludWU7XG4gICAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpci5kaXJlY3RpdmUuc2VsZWN0b3IpLCBkaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNlZSBpZiB0aGlzIGF0dHJpYnV0ZSBtYXRjaGVzIHRoZSBzZWxlY3RvciBvZiBhbnkgZGlyZWN0aXZlIG9uIHRoZSBlbGVtZW50LlxuICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNlbGVjdG9yID0gYFske2FzdC5uYW1lfT0ke2FzdC52YWx1ZX1dYDtcbiAgICAgICAgICBjb25zdCBwYXJzZWRBdHRyaWJ1dGUgPSBDc3NTZWxlY3Rvci5wYXJzZShhdHRyaWJ1dGVTZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKCFwYXJzZWRBdHRyaWJ1dGUubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgbWF0Y2hlci5tYXRjaChwYXJzZWRBdHRyaWJ1dGVbMF0sIChfLCB7ZGlyZWN0aXZlfSkgPT4ge1xuICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBkaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRCb3VuZFRleHQoYXN0KSB7XG4gICAgICAgICAgY29uc3QgZXhwcmVzc2lvblBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICAgICAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICAgICAgZ2V0RXhwcmVzc2lvblN5bWJvbChzY29wZSwgYXN0LnZhbHVlLCB0ZW1wbGF0ZVBvc2l0aW9uLCBpbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gcmVzdWx0LnN5bWJvbDtcbiAgICAgICAgICAgICAgc3BhbiA9IG9mZnNldFNwYW4ocmVzdWx0LnNwYW4sIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdFRleHQoYXN0KSB7fSxcbiAgICAgICAgdmlzaXREaXJlY3RpdmUoYXN0KSB7XG4gICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgc3RhdGljU3ltYm9sID0gYXN0LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdCkge1xuICAgICAgICAgIGlmICghYXR0cmlidXRlVmFsdWVTeW1ib2woKSkge1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gZmluZFBhcmVudE9mQmluZGluZyhpbmZvLnRlbXBsYXRlQXN0LCBhc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlID0gZmluZEF0dHJpYnV0ZShpbmZvLCBwb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlICYmIGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgICBpZiAoYXR0cmlidXRlLm5hbWUuc3RhcnRzV2l0aCgnKicpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGlsZVR5cGVTdW1tYXJ5ID0gZGlyZWN0aXZlLmRpcmVjdGl2ZTtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woY29tcGlsZVR5cGVTdW1tYXJ5LnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgICAgICAvLyBVc2UgJ2F0dHJpYnV0ZS5zb3VyY2VTcGFuJyBpbnN0ZWFkIG9mIHRoZSBkaXJlY3RpdmUncyxcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHRoZSBzcGFuIG9mIHRoZSBkaXJlY3RpdmUgaXMgdGhlIHdob2xlIG9wZW5pbmcgdGFnIG9mIGFuIGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhdHRyaWJ1dGUuc291cmNlU3Bhbik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gZmluZElucHV0QmluZGluZyhpbmZvLCBhc3QudGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUpO1xuICAgICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG51bGwpO1xuICBpZiAoc3ltYm9sICYmIHNwYW4pIHtcbiAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBvZmZzZXRTcGFuKHNwYW4sIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN5bWJvbCxcbiAgICAgIHNwYW46IHRzcy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoc3RhcnQsIGVuZCksIHN0YXRpY1N5bWJvbCxcbiAgICB9O1xuICB9XG59XG5cbi8vIEdldCB0aGUgc3ltYm9sIGluIGF0dHJpYnV0ZSB2YWx1ZSBhdCB0ZW1wbGF0ZSBwb3NpdGlvbi5cbmZ1bmN0aW9uIGdldFN5bWJvbEluQXR0cmlidXRlVmFsdWUoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGF0dHJpYnV0ZTogQXR0cmlidXRlKTpcbiAgICB7c3ltYm9sOiBTeW1ib2wsIHNwYW46IFNwYW59fHVuZGVmaW5lZCB7XG4gIGlmICghYXR0cmlidXRlLnZhbHVlU3Bhbikge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgcmVzdWx0OiB7c3ltYm9sOiBTeW1ib2wsIHNwYW46IFNwYW59fHVuZGVmaW5lZDtcbiAgY29uc3Qge3RlbXBsYXRlQmluZGluZ3N9ID0gaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhcbiAgICAgIGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUsIGF0dHJpYnV0ZS5zb3VyY2VTcGFuLnRvU3RyaW5nKCksXG4gICAgICBhdHRyaWJ1dGUudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gIC8vIEZpbmQgd2hlcmUgdGhlIGN1cnNvciBpcyByZWxhdGl2ZSB0byB0aGUgc3RhcnQgb2YgdGhlIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gcGF0aC5wb3NpdGlvbiAtIGF0dHJpYnV0ZS52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuXG4gIC8vIEZpbmQgdGhlIHN5bWJvbCB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvbi5cbiAgdGVtcGxhdGVCaW5kaW5ncy5maWx0ZXIodGIgPT4gIXRiLmtleUlzVmFyKS5mb3JFYWNoKHRiID0+IHtcbiAgICBpZiAoaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgdGIuZXhwcmVzc2lvbj8uYXN0LnNwYW4pKSB7XG4gICAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICAgIGNvbnN0IHNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCBwYXRoKTtcbiAgICAgIHJlc3VsdCA9IGdldEV4cHJlc3Npb25TeW1ib2woc2NvcGUsIHRiLmV4cHJlc3Npb24gISwgcGF0aC5wb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgfSBlbHNlIGlmIChpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCB0Yi5zcGFuKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBwYXRoLmZpcnN0KEVtYmVkZGVkVGVtcGxhdGVBc3QpO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIC8vIE9uZSBlbGVtZW50IGNhbiBvbmx5IGhhdmUgb25lIHRlbXBsYXRlIGJpbmRpbmcuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUFzdCA9IHRlbXBsYXRlLmRpcmVjdGl2ZXNbMF07XG4gICAgICAgIGlmIChkaXJlY3RpdmVBc3QpIHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSBmaW5kSW5wdXRCaW5kaW5nKGluZm8sIHRiLmtleS5zdWJzdHJpbmcoMSksIGRpcmVjdGl2ZUFzdCk7XG4gICAgICAgICAgaWYgKHN5bWJvbCkge1xuICAgICAgICAgICAgcmVzdWx0ID0ge3N5bWJvbCwgc3BhbjogdGIuc3Bhbn07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZmluZEF0dHJpYnV0ZShpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBBdHRyaWJ1dGV8dW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24oaW5mby5odG1sQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgcmV0dXJuIHBhdGguZmlyc3QoQXR0cmlidXRlKTtcbn1cblxuLy8gVE9ETzogcmVtb3ZlIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHBhdGggaW5jbHVkZXMgJ0RpcmVjdGl2ZUFzdCcuXG4vLyBGaW5kIHRoZSBkaXJlY3RpdmUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkICdiaW5kaW5nJ1xuLy8gYXQgdGhlIHNwZWNpZmllZCAncG9zaXRpb24nIGluIHRoZSAnYXN0Jy5cbmZ1bmN0aW9uIGZpbmRQYXJlbnRPZkJpbmRpbmcoXG4gICAgYXN0OiBUZW1wbGF0ZUFzdFtdLCBiaW5kaW5nOiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBwb3NpdGlvbjogbnVtYmVyKTogRGlyZWN0aXZlQXN0fFxuICAgIHVuZGVmaW5lZCB7XG4gIGxldCByZXM6IERpcmVjdGl2ZUFzdHx1bmRlZmluZWQ7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogVGVtcGxhdGVBc3QpOiBhbnkge1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKCFpblNwYW4ocG9zaXRpb24sIHNwYW4pKSB7XG4gICAgICAgIC8vIFJldHVybmluZyBhIHZhbHVlIGhlcmUgd2lsbCByZXN1bHQgaW4gdGhlIGNoaWxkcmVuIGJlaW5nIHNraXBwZWQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdERpcmVjdGl2ZShhc3Q6IERpcmVjdGl2ZUFzdCkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52aXNpdENoaWxkcmVuKGFzdCwgdmlzaXQgPT4geyB2aXNpdChhc3QuaW5wdXRzKTsgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBjb250ZXh0OiBEaXJlY3RpdmVBc3QpIHtcbiAgICAgIGlmIChhc3QgPT09IGJpbmRpbmcpIHtcbiAgICAgICAgcmVzID0gY29udGV4dDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgYXN0KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuLy8gRmluZCB0aGUgc3ltYm9sIG9mIGlucHV0IGJpbmRpbmcgaW4gJ2RpcmVjdGl2ZUFzdCcgYnkgJ25hbWUnLlxuZnVuY3Rpb24gZmluZElucHV0QmluZGluZyhpbmZvOiBBc3RSZXN1bHQsIG5hbWU6IHN0cmluZywgZGlyZWN0aXZlQXN0OiBEaXJlY3RpdmVBc3QpOiBTeW1ib2x8XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgaW52ZXJ0ZWRJbnB1dCA9IGludmVydE1hcChkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLmlucHV0cyk7XG4gIGNvbnN0IGZpZWxkTmFtZSA9IGludmVydGVkSW5wdXRbbmFtZV07XG4gIGlmIChmaWVsZE5hbWUpIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgIHJldHVybiBjbGFzc1N5bWJvbC5tZW1iZXJzKCkuZ2V0KGZpZWxkTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRPdXRwdXRCaW5kaW5nKGluZm86IEFzdFJlc3VsdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBiaW5kaW5nOiBCb3VuZEV2ZW50QXN0KTogU3ltYm9sfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnRBc3QpO1xuICBpZiAoZWxlbWVudCkge1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgaW52ZXJ0ZWRPdXRwdXRzID0gaW52ZXJ0TWFwKGRpcmVjdGl2ZS5kaXJlY3RpdmUub3V0cHV0cyk7XG4gICAgICBjb25zdCBmaWVsZE5hbWUgPSBpbnZlcnRlZE91dHB1dHNbYmluZGluZy5uYW1lXTtcbiAgICAgIGlmIChmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woZGlyZWN0aXZlLmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICAgIHJldHVybiBjbGFzc1N5bWJvbC5tZW1iZXJzKCkuZ2V0KGZpZWxkTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0TWFwKG9iajoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KToge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgcmVzdWx0OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKG9iaikpIHtcbiAgICBjb25zdCB2ID0gb2JqW25hbWVdO1xuICAgIHJlc3VsdFt2XSA9IG5hbWU7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBXcmFwIGEgc3ltYm9sIGFuZCBjaGFuZ2UgaXRzIGtpbmQgdG8gY29tcG9uZW50LlxuICovXG5jbGFzcyBPdmVycmlkZUtpbmRTeW1ib2wgaW1wbGVtZW50cyBTeW1ib2wge1xuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGlyZWN0aXZlS2luZDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzeW06IFN5bWJvbCwga2luZE92ZXJyaWRlOiBEaXJlY3RpdmVLaW5kKSB7IHRoaXMua2luZCA9IGtpbmRPdmVycmlkZTsgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5uYW1lOyB9XG5cbiAgZ2V0IGxhbmd1YWdlKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5sYW5ndWFnZTsgfVxuXG4gIGdldCB0eXBlKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0udHlwZTsgfVxuXG4gIGdldCBjb250YWluZXIoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS5jb250YWluZXI7IH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0ucHVibGljOyB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0uY2FsbGFibGU7IH1cblxuICBnZXQgbnVsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5udWxsYWJsZTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gdGhpcy5zeW0uZGVmaW5pdGlvbjsgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10geyByZXR1cm4gdGhpcy5zeW0uZG9jdW1lbnRhdGlvbjsgfVxuXG4gIG1lbWJlcnMoKSB7IHJldHVybiB0aGlzLnN5bS5tZW1iZXJzKCk7IH1cblxuICBzaWduYXR1cmVzKCkgeyByZXR1cm4gdGhpcy5zeW0uc2lnbmF0dXJlcygpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSkgeyByZXR1cm4gdGhpcy5zeW0uc2VsZWN0U2lnbmF0dXJlKHR5cGVzKTsgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCkgeyByZXR1cm4gdGhpcy5zeW0uaW5kZXhlZChhcmd1bWVudCk7IH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS50eXBlQXJndW1lbnRzKCk7IH1cbn1cbiJdfQ==