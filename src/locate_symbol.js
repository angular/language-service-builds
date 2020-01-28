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
                    symbol = utils_1.findOutputBinding(info, path, ast);
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
        var invertedInput = utils_1.invertMap(directiveAst.directive.inputs);
        var fieldName = invertedInput[name];
        if (fieldName) {
            var classSymbol = info.template.query.getTypeSymbol(directiveAst.directive.type.reference);
            if (classSymbol) {
                return classSymbol.members().get(fieldName);
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStQO0lBQy9QLG9EQUFzRDtJQUd0RCwrRkFBNEQ7SUFDNUQseUVBQWtEO0lBQ2xELDZEQUFnRTtJQUNoRSw2REFBeUs7SUFReks7Ozs7T0FJRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7O1FBQzdELElBQU0sZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM3RCw4REFBOEQ7UUFDOUQsSUFBTSxJQUFJLEdBQUcseUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFFMUIsSUFBTSxTQUFTLEdBQUcsY0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxJQUFJLEdBQTBCLElBQUksQ0FBQyxJQUFJLEVBQzNDLElBQUksSUFBSSxrQkFBVSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQjtRQUVELHVFQUF1RTtRQUN2RSxVQUFJLFNB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QUFDLENBQUM7OztXQUFBO1FBRXJELHNCQUFJLHdDQUFRO2lCQUFaLGNBQTBCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVyRCxzQkFBSSwwQ0FBVTtpQkFBZCxjQUErQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFNUQsc0JBQUksNkNBQWE7aUJBQWpCLGNBQThDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU5RSxvQ0FBTyxHQUFQLGNBQVksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4Qyx1Q0FBVSxHQUFWLGNBQWUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5Qyw0Q0FBZSxHQUFmLFVBQWdCLEtBQWUsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1RSxvQ0FBTyxHQUFQLFVBQVEsUUFBZ0IsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVoRSwwQ0FBYSxHQUFiLGNBQXNDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUUseUJBQUM7SUFBRCxDQUFDLEFBL0JELElBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRpY1N5bWJvbCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgdGVtcGxhdGVWaXNpdEFsbCwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU2NvcGV9IGZyb20gJy4vZXhwcmVzc2lvbl9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TeW1ib2x9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHtEZWZpbml0aW9uLCBEaXJlY3RpdmVLaW5kLCBTcGFuLCBTeW1ib2x9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRPdXRwdXRCaW5kaW5nLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGluU3BhbiwgaW52ZXJ0TWFwLCBpc05hcnJvd2VyLCBvZmZzZXRTcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN5bWJvbEluZm8ge1xuICBzeW1ib2w6IFN5bWJvbDtcbiAgc3BhbjogdHNzLlRleHRTcGFuO1xuICBzdGF0aWNTeW1ib2w/OiBTdGF0aWNTeW1ib2w7XG59XG5cbi8qKlxuICogVHJhdmVyc2VzIGEgdGVtcGxhdGUgQVNUIGFuZCBsb2NhdGVzIHN5bWJvbChzKSBhdCBhIHNwZWNpZmllZCBwb3NpdGlvbi5cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVCBpbmZvcm1hdGlvbiBzZXRcbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiB0byBsb2NhdGUgc3ltYm9scyBhdFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlU3ltYm9scyhpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBTeW1ib2xJbmZvW10ge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIC8vIFRPRE86IHVwZGF0ZSBgZmluZFRlbXBsYXRlQXN0QXRgIHRvIHVzZSBhYnNvbHV0ZSBwb3NpdGlvbnMuXG4gIGNvbnN0IHBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgY29uc3QgYXR0cmlidXRlID0gZmluZEF0dHJpYnV0ZShpbmZvLCBwb3NpdGlvbik7XG5cbiAgaWYgKCFwYXRoLnRhaWwpIHJldHVybiBbXTtcblxuICBjb25zdCBuYXJyb3dlc3QgPSBzcGFuT2YocGF0aC50YWlsKTtcbiAgY29uc3QgdG9WaXNpdDogVGVtcGxhdGVBc3RbXSA9IFtdO1xuICBmb3IgKGxldCBub2RlOiBUZW1wbGF0ZUFzdHx1bmRlZmluZWQgPSBwYXRoLnRhaWw7XG4gICAgICAgbm9kZSAmJiBpc05hcnJvd2VyKHNwYW5PZihub2RlLnNvdXJjZVNwYW4pLCBuYXJyb3dlc3QpOyBub2RlID0gcGF0aC5wYXJlbnRPZihub2RlKSkge1xuICAgIHRvVmlzaXQucHVzaChub2RlKTtcbiAgfVxuXG4gIC8vIEZvciB0aGUgc3RydWN0dXJhbCBkaXJlY3RpdmUsIG9ubHkgY2FyZSBhYm91dCB0aGUgbGFzdCB0ZW1wbGF0ZSBBU1QuXG4gIGlmIChhdHRyaWJ1dGU/Lm5hbWUuc3RhcnRzV2l0aCgnKicpKSB7XG4gICAgdG9WaXNpdC5zcGxpY2UoMCwgdG9WaXNpdC5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiB0b1Zpc2l0Lm1hcChhc3QgPT4gbG9jYXRlU3ltYm9sKGFzdCwgcGF0aCwgaW5mbykpXG4gICAgICAuZmlsdGVyKChzeW0pOiBzeW0gaXMgU3ltYm9sSW5mbyA9PiBzeW0gIT09IHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogVmlzaXRzIGEgdGVtcGxhdGUgbm9kZSBhbmQgbG9jYXRlcyB0aGUgc3ltYm9sIGluIHRoYXQgbm9kZSBhdCBhIHBhdGggcG9zaXRpb24uXG4gKiBAcGFyYW0gYXN0IHRlbXBsYXRlIEFTVCBub2RlIHRvIHZpc2l0XG4gKiBAcGFyYW0gcGF0aCBub24tZW1wdHkgc2V0IG9mIG5hcnJvd2luZyBBU1Qgbm9kZXMgYXQgYSBwb3NpdGlvblxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUIGluZm9ybWF0aW9uIHNldFxuICovXG5mdW5jdGlvbiBsb2NhdGVTeW1ib2woYXN0OiBUZW1wbGF0ZUFzdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBpbmZvOiBBc3RSZXN1bHQpOiBTeW1ib2xJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwYXRoLnBvc2l0aW9uO1xuICBjb25zdCBwb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gKyBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQ7XG4gIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZDtcbiAgbGV0IHN0YXRpY1N5bWJvbDogU3RhdGljU3ltYm9sfHVuZGVmaW5lZDtcbiAgY29uc3QgYXR0cmlidXRlVmFsdWVTeW1ib2wgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgYXR0cmlidXRlID0gZmluZEF0dHJpYnV0ZShpbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGF0dHJpYnV0ZSkge1xuICAgICAgaWYgKGluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXR0cmlidXRlLnZhbHVlU3BhbikpKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldFN5bWJvbEluQXR0cmlidXRlVmFsdWUoaW5mbywgcGF0aCwgYXR0cmlidXRlKTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHN5bWJvbCA9IHJlc3VsdC5zeW1ib2w7XG4gICAgICAgICAgc3BhbiA9IG9mZnNldFNwYW4ocmVzdWx0LnNwYW4sIGF0dHJpYnV0ZS52YWx1ZVNwYW4gIS5zdGFydC5vZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIGFzdC52aXNpdChcbiAgICAgIHtcbiAgICAgICAgdmlzaXROZ0NvbnRlbnQoYXN0KSB7fSxcbiAgICAgICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdCkge30sXG4gICAgICAgIHZpc2l0RWxlbWVudChhc3QpIHtcbiAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBhc3QuZGlyZWN0aXZlcy5maW5kKGQgPT4gZC5kaXJlY3RpdmUuaXNDb21wb25lbnQpO1xuICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCBiZWNhdXNlICdyZWZlcmVuY2UnIGlzIHR5cGVkIGFzIGFueVxuICAgICAgICAgICAgc3RhdGljU3ltYm9sID0gY29tcG9uZW50LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5DT01QT05FTlQpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGaW5kIGEgZGlyZWN0aXZlIHRoYXQgbWF0Y2hlcyB0aGUgZWxlbWVudCBuYW1lXG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBhc3QuZGlyZWN0aXZlcy5maW5kKFxuICAgICAgICAgICAgICAgIGQgPT4gZC5kaXJlY3RpdmUuc2VsZWN0b3IgIT0gbnVsbCAmJiBkLmRpcmVjdGl2ZS5zZWxlY3Rvci5pbmRleE9mKGFzdC5uYW1lKSA+PSAwKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUpIHtcbiAgICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGRpcmVjdGl2ZS5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkRJUkVDVElWRSk7XG4gICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0UmVmZXJlbmNlKGFzdCkge1xuICAgICAgICAgIHN5bWJvbCA9IGFzdC52YWx1ZSAmJiBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2wodG9rZW5SZWZlcmVuY2UoYXN0LnZhbHVlKSk7XG4gICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdFZhcmlhYmxlKGFzdCkge30sXG4gICAgICAgIHZpc2l0RXZlbnQoYXN0KSB7XG4gICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbCgpKSB7XG4gICAgICAgICAgICBzeW1ib2wgPSBmaW5kT3V0cHV0QmluZGluZyhpbmZvLCBwYXRoLCBhc3QpO1xuICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkVWRU5UKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdCkgeyBhdHRyaWJ1dGVWYWx1ZVN5bWJvbCgpOyB9LFxuICAgICAgICB2aXNpdEF0dHIoYXN0KSB7XG4gICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguaGVhZDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIShlbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudEFzdCkpIHJldHVybjtcbiAgICAgICAgICAvLyBDcmVhdGUgYSBtYXBwaW5nIG9mIGFsbCBkaXJlY3RpdmVzIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQgZnJvbSB0aGVpciBzZWxlY3RvcnMuXG4gICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlQXN0PigpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgICAgICAgaWYgKCFkaXIuZGlyZWN0aXZlLnNlbGVjdG9yKSBjb250aW51ZTtcbiAgICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLmRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2VlIGlmIHRoaXMgYXR0cmlidXRlIG1hdGNoZXMgdGhlIHNlbGVjdG9yIG9mIGFueSBkaXJlY3RpdmUgb24gdGhlIGVsZW1lbnQuXG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlU2VsZWN0b3IgPSBgWyR7YXN0Lm5hbWV9PSR7YXN0LnZhbHVlfV1gO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZEF0dHJpYnV0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGF0dHJpYnV0ZVNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoIXBhcnNlZEF0dHJpYnV0ZS5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICBtYXRjaGVyLm1hdGNoKHBhcnNlZEF0dHJpYnV0ZVswXSwgKF8sIHtkaXJlY3RpdmV9KSA9PiB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdEJvdW5kVGV4dChhc3QpIHtcbiAgICAgICAgICBjb25zdCBleHByZXNzaW9uUG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgICAgIGlmIChpblNwYW4oZXhwcmVzc2lvblBvc2l0aW9uLCBhc3QudmFsdWUuc3BhbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID1cbiAgICAgICAgICAgICAgICBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QudmFsdWUsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgICAgICBzcGFuID0gb2Zmc2V0U3BhbihyZXN1bHQuc3BhbiwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0VGV4dChhc3QpIHt9LFxuICAgICAgICB2aXNpdERpcmVjdGl2ZShhc3QpIHtcbiAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBhc3QuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0KSB7XG4gICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbCgpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBmaW5kUGFyZW50T2ZCaW5kaW5nKGluZm8udGVtcGxhdGVBc3QsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGUgPSBmaW5kQXR0cmlidXRlKGluZm8sIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgJiYgYXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUubmFtZS5zdGFydHNXaXRoKCcqJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21waWxlVHlwZVN1bW1hcnkgPSBkaXJlY3RpdmUuZGlyZWN0aXZlO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICAgIC8vIFVzZSAnYXR0cmlidXRlLnNvdXJjZVNwYW4nIGluc3RlYWQgb2YgdGhlIGRpcmVjdGl2ZSdzLFxuICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgdGhlIHNwYW4gb2YgdGhlIGRpcmVjdGl2ZSBpcyB0aGUgd2hvbGUgb3BlbmluZyB0YWcgb2YgYW4gZWxlbWVudC5cbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGF0dHJpYnV0ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBmaW5kSW5wdXRCaW5kaW5nKGluZm8sIGFzdC50ZW1wbGF0ZU5hbWUsIGRpcmVjdGl2ZSk7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbnVsbCk7XG4gIGlmIChzeW1ib2wgJiYgc3Bhbikge1xuICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IG9mZnNldFNwYW4oc3BhbiwgaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0KTtcbiAgICByZXR1cm4ge1xuICAgICAgc3ltYm9sLFxuICAgICAgc3BhbjogdHNzLmNyZWF0ZVRleHRTcGFuRnJvbUJvdW5kcyhzdGFydCwgZW5kKSwgc3RhdGljU3ltYm9sLFxuICAgIH07XG4gIH1cbn1cblxuLy8gR2V0IHRoZSBzeW1ib2wgaW4gYXR0cmlidXRlIHZhbHVlIGF0IHRlbXBsYXRlIHBvc2l0aW9uLlxuZnVuY3Rpb24gZ2V0U3ltYm9sSW5BdHRyaWJ1dGVWYWx1ZShpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgYXR0cmlidXRlOiBBdHRyaWJ1dGUpOlxuICAgIHtzeW1ib2w6IFN5bWJvbCwgc3BhbjogU3Bhbn18dW5kZWZpbmVkIHtcbiAgaWYgKCFhdHRyaWJ1dGUudmFsdWVTcGFuKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCByZXN1bHQ6IHtzeW1ib2w6IFN5bWJvbCwgc3BhbjogU3Bhbn18dW5kZWZpbmVkO1xuICBjb25zdCB7dGVtcGxhdGVCaW5kaW5nc30gPSBpbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKFxuICAgICAgYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSwgYXR0cmlidXRlLnNvdXJjZVNwYW4udG9TdHJpbmcoKSxcbiAgICAgIGF0dHJpYnV0ZS52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgLy8gRmluZCB3aGVyZSB0aGUgY3Vyc29yIGlzIHJlbGF0aXZlIHRvIHRoZSBzdGFydCBvZiB0aGUgYXR0cmlidXRlIHZhbHVlLlxuICBjb25zdCB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPSBwYXRoLnBvc2l0aW9uIC0gYXR0cmlidXRlLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG5cbiAgLy8gRmluZCB0aGUgc3ltYm9sIHRoYXQgY29udGFpbnMgdGhlIHBvc2l0aW9uLlxuICB0ZW1wbGF0ZUJpbmRpbmdzLmZpbHRlcih0YiA9PiAhdGIua2V5SXNWYXIpLmZvckVhY2godGIgPT4ge1xuICAgIGlmIChpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCB0Yi5leHByZXNzaW9uPy5hc3Quc3BhbikpIHtcbiAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgcmVzdWx0ID0gZ2V0RXhwcmVzc2lvblN5bWJvbChzY29wZSwgdGIuZXhwcmVzc2lvbiAhLCBwYXRoLnBvc2l0aW9uLCBpbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICB9IGVsc2UgaWYgKGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIHRiLnNwYW4pKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhdGguZmlyc3QoRW1iZWRkZWRUZW1wbGF0ZUFzdCk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgLy8gT25lIGVsZW1lbnQgY2FuIG9ubHkgaGF2ZSBvbmUgdGVtcGxhdGUgYmluZGluZy5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlQXN0ID0gdGVtcGxhdGUuZGlyZWN0aXZlc1swXTtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZUFzdCkge1xuICAgICAgICAgIGNvbnN0IHN5bWJvbCA9IGZpbmRJbnB1dEJpbmRpbmcoaW5mbywgdGIua2V5LnN1YnN0cmluZygxKSwgZGlyZWN0aXZlQXN0KTtcbiAgICAgICAgICBpZiAoc3ltYm9sKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB7c3ltYm9sLCBzcGFuOiB0Yi5zcGFufTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBmaW5kQXR0cmlidXRlKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IEF0dHJpYnV0ZXx1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbihpbmZvLmh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICByZXR1cm4gcGF0aC5maXJzdChBdHRyaWJ1dGUpO1xufVxuXG4vLyBUT0RPOiByZW1vdmUgdGhpcyBmdW5jdGlvbiBhZnRlciB0aGUgcGF0aCBpbmNsdWRlcyAnRGlyZWN0aXZlQXN0Jy5cbi8vIEZpbmQgdGhlIGRpcmVjdGl2ZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBzcGVjaWZpZWQgJ2JpbmRpbmcnXG4vLyBhdCB0aGUgc3BlY2lmaWVkICdwb3NpdGlvbicgaW4gdGhlICdhc3QnLlxuZnVuY3Rpb24gZmluZFBhcmVudE9mQmluZGluZyhcbiAgICBhc3Q6IFRlbXBsYXRlQXN0W10sIGJpbmRpbmc6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIHBvc2l0aW9uOiBudW1iZXIpOiBEaXJlY3RpdmVBc3R8XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IHJlczogRGlyZWN0aXZlQXN0fHVuZGVmaW5lZDtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXQoYXN0OiBUZW1wbGF0ZUFzdCk6IGFueSB7XG4gICAgICBjb25zdCBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICBpZiAoIWluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgLy8gUmV0dXJuaW5nIGEgdmFsdWUgaGVyZSB3aWxsIHJlc3VsdCBpbiB0aGUgY2hpbGRyZW4gYmVpbmcgc2tpcHBlZC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZpc2l0Q2hpbGRyZW4oYXN0LCB2aXNpdCA9PiB7IHZpc2l0KGFzdC5pbnB1dHMpOyB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIGNvbnRleHQ6IERpcmVjdGl2ZUFzdCkge1xuICAgICAgaWYgKGFzdCA9PT0gYmluZGluZykge1xuICAgICAgICByZXMgPSBjb250ZXh0O1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBhc3QpO1xuICByZXR1cm4gcmVzO1xufVxuXG4vLyBGaW5kIHRoZSBzeW1ib2wgb2YgaW5wdXQgYmluZGluZyBpbiAnZGlyZWN0aXZlQXN0JyBieSAnbmFtZScuXG5mdW5jdGlvbiBmaW5kSW5wdXRCaW5kaW5nKGluZm86IEFzdFJlc3VsdCwgbmFtZTogc3RyaW5nLCBkaXJlY3RpdmVBc3Q6IERpcmVjdGl2ZUFzdCk6IFN5bWJvbHxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBpbnZlcnRlZElucHV0ID0gaW52ZXJ0TWFwKGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUuaW5wdXRzKTtcbiAgY29uc3QgZmllbGROYW1lID0gaW52ZXJ0ZWRJbnB1dFtuYW1lXTtcbiAgaWYgKGZpZWxkTmFtZSkge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpO1xuICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sLm1lbWJlcnMoKS5nZXQoZmllbGROYW1lKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBXcmFwIGEgc3ltYm9sIGFuZCBjaGFuZ2UgaXRzIGtpbmQgdG8gY29tcG9uZW50LlxuICovXG5jbGFzcyBPdmVycmlkZUtpbmRTeW1ib2wgaW1wbGVtZW50cyBTeW1ib2wge1xuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGlyZWN0aXZlS2luZDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzeW06IFN5bWJvbCwga2luZE92ZXJyaWRlOiBEaXJlY3RpdmVLaW5kKSB7IHRoaXMua2luZCA9IGtpbmRPdmVycmlkZTsgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5uYW1lOyB9XG5cbiAgZ2V0IGxhbmd1YWdlKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bS5sYW5ndWFnZTsgfVxuXG4gIGdldCB0eXBlKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0udHlwZTsgfVxuXG4gIGdldCBjb250YWluZXIoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS5jb250YWluZXI7IH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0ucHVibGljOyB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0uY2FsbGFibGU7IH1cblxuICBnZXQgbnVsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5udWxsYWJsZTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gdGhpcy5zeW0uZGVmaW5pdGlvbjsgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10geyByZXR1cm4gdGhpcy5zeW0uZG9jdW1lbnRhdGlvbjsgfVxuXG4gIG1lbWJlcnMoKSB7IHJldHVybiB0aGlzLnN5bS5tZW1iZXJzKCk7IH1cblxuICBzaWduYXR1cmVzKCkgeyByZXR1cm4gdGhpcy5zeW0uc2lnbmF0dXJlcygpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSkgeyByZXR1cm4gdGhpcy5zeW0uc2VsZWN0U2lnbmF0dXJlKHR5cGVzKTsgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCkgeyByZXR1cm4gdGhpcy5zeW0uaW5kZXhlZChhcmd1bWVudCk7IH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS50eXBlQXJndW1lbnRzKCk7IH1cbn1cbiJdfQ==