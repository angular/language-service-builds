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
        var attribute = findAttribute(info, position);
        if (!path.tail)
            return [];
        var narrowest = utils_1.spanOf(path.tail);
        var toVisit = [];
        for (var node = path.tail; node && utils_1.isNarrower(utils_1.spanOf(node.sourceSpan), narrowest); node = path.parentOf(node)) {
            toVisit.push(node);
        }
        // For the structural directive, only care about the last template AST.
        if (attribute === null || attribute === void 0 ? void 0 : attribute.name.startsWith('*')) {
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
        var attributeValueSymbol = function (ast) {
            var attribute = findAttribute(info, position);
            if (attribute) {
                if (utils_1.inSpan(templatePosition, utils_1.spanOf(attribute.valueSpan))) {
                    var result = void 0;
                    if (attribute.name.startsWith('*')) {
                        result = getSymbolInMicrosyntax(info, path, attribute);
                    }
                    else {
                        var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                        var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                        result = expressions_1.getExpressionSymbol(scope, ast, templatePosition, info.template.query);
                    }
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
                if (!attributeValueSymbol(ast.handler)) {
                    symbol = utils_1.findOutputBinding(ast, path, info.template.query);
                    symbol = symbol && new OverrideKindSymbol(symbol, types_1.DirectiveKind.EVENT);
                    span = utils_1.spanOf(ast);
                }
            },
            visitElementProperty: function (ast) { attributeValueSymbol(ast.value); },
            visitAttr: function (ast) {
                var e_1, _a;
                var element = path.first(compiler_1.ElementAst);
                if (!element)
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
    // Get the symbol in microsyntax at template position.
    function getSymbolInMicrosyntax(info, path, attribute) {
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
            if (utils_1.inSpan(valueRelativePosition, (_a = tb.value) === null || _a === void 0 ? void 0 : _a.ast.span)) {
                var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
                var scope = expression_diagnostics_1.getExpressionScope(dinfo, path);
                result = expressions_1.getExpressionSymbol(scope, tb.value, path.position, info.template.query);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9RO0lBQ3BRLG9EQUFzRDtJQUd0RCwrRkFBNEQ7SUFDNUQseUVBQWtEO0lBQ2xELDZEQUFnRTtJQUNoRSw2REFBeUs7SUFReks7Ozs7T0FJRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7UUFDN0QsSUFBTSxnQkFBZ0IsR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzdELDhEQUE4RDtRQUM5RCxJQUFNLElBQUksR0FBRyx5QkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDbkUsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVoRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUUxQixJQUFNLFNBQVMsR0FBRyxjQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7UUFDbEMsS0FBSyxJQUFJLElBQUksR0FBMEIsSUFBSSxDQUFDLElBQUksRUFDM0MsSUFBSSxJQUFJLGtCQUFVLENBQUMsY0FBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2RixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCO1FBRUQsdUVBQXVFO1FBQ3ZFLElBQUksU0FB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QU8sR0FBUCxVQUFRLFFBQWdCLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEUsMENBQWEsR0FBYixjQUFzQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFFLHlCQUFDO0lBQUQsQ0FBQyxBQS9CRCxJQStCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRpY1N5bWJvbCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgdGVtcGxhdGVWaXNpdEFsbCwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU2NvcGV9IGZyb20gJy4vZXhwcmVzc2lvbl9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TeW1ib2x9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHtEZWZpbml0aW9uLCBEaXJlY3RpdmVLaW5kLCBTcGFuLCBTeW1ib2x9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRPdXRwdXRCaW5kaW5nLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGluU3BhbiwgaW52ZXJ0TWFwLCBpc05hcnJvd2VyLCBvZmZzZXRTcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN5bWJvbEluZm8ge1xuICBzeW1ib2w6IFN5bWJvbDtcbiAgc3BhbjogdHNzLlRleHRTcGFuO1xuICBzdGF0aWNTeW1ib2w/OiBTdGF0aWNTeW1ib2w7XG59XG5cbi8qKlxuICogVHJhdmVyc2VzIGEgdGVtcGxhdGUgQVNUIGFuZCBsb2NhdGVzIHN5bWJvbChzKSBhdCBhIHNwZWNpZmllZCBwb3NpdGlvbi5cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVCBpbmZvcm1hdGlvbiBzZXRcbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiB0byBsb2NhdGUgc3ltYm9scyBhdFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRlU3ltYm9scyhpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBTeW1ib2xJbmZvW10ge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIC8vIFRPRE86IHVwZGF0ZSBgZmluZFRlbXBsYXRlQXN0QXRgIHRvIHVzZSBhYnNvbHV0ZSBwb3NpdGlvbnMuXG4gIGNvbnN0IHBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgY29uc3QgYXR0cmlidXRlID0gZmluZEF0dHJpYnV0ZShpbmZvLCBwb3NpdGlvbik7XG5cbiAgaWYgKCFwYXRoLnRhaWwpIHJldHVybiBbXTtcblxuICBjb25zdCBuYXJyb3dlc3QgPSBzcGFuT2YocGF0aC50YWlsKTtcbiAgY29uc3QgdG9WaXNpdDogVGVtcGxhdGVBc3RbXSA9IFtdO1xuICBmb3IgKGxldCBub2RlOiBUZW1wbGF0ZUFzdHx1bmRlZmluZWQgPSBwYXRoLnRhaWw7XG4gICAgICAgbm9kZSAmJiBpc05hcnJvd2VyKHNwYW5PZihub2RlLnNvdXJjZVNwYW4pLCBuYXJyb3dlc3QpOyBub2RlID0gcGF0aC5wYXJlbnRPZihub2RlKSkge1xuICAgIHRvVmlzaXQucHVzaChub2RlKTtcbiAgfVxuXG4gIC8vIEZvciB0aGUgc3RydWN0dXJhbCBkaXJlY3RpdmUsIG9ubHkgY2FyZSBhYm91dCB0aGUgbGFzdCB0ZW1wbGF0ZSBBU1QuXG4gIGlmIChhdHRyaWJ1dGU/Lm5hbWUuc3RhcnRzV2l0aCgnKicpKSB7XG4gICAgdG9WaXNpdC5zcGxpY2UoMCwgdG9WaXNpdC5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiB0b1Zpc2l0Lm1hcChhc3QgPT4gbG9jYXRlU3ltYm9sKGFzdCwgcGF0aCwgaW5mbykpXG4gICAgICAuZmlsdGVyKChzeW0pOiBzeW0gaXMgU3ltYm9sSW5mbyA9PiBzeW0gIT09IHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogVmlzaXRzIGEgdGVtcGxhdGUgbm9kZSBhbmQgbG9jYXRlcyB0aGUgc3ltYm9sIGluIHRoYXQgbm9kZSBhdCBhIHBhdGggcG9zaXRpb24uXG4gKiBAcGFyYW0gYXN0IHRlbXBsYXRlIEFTVCBub2RlIHRvIHZpc2l0XG4gKiBAcGFyYW0gcGF0aCBub24tZW1wdHkgc2V0IG9mIG5hcnJvd2luZyBBU1Qgbm9kZXMgYXQgYSBwb3NpdGlvblxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUIGluZm9ybWF0aW9uIHNldFxuICovXG5mdW5jdGlvbiBsb2NhdGVTeW1ib2woYXN0OiBUZW1wbGF0ZUFzdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBpbmZvOiBBc3RSZXN1bHQpOiBTeW1ib2xJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwYXRoLnBvc2l0aW9uO1xuICBjb25zdCBwb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gKyBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQ7XG4gIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZDtcbiAgbGV0IHN0YXRpY1N5bWJvbDogU3RhdGljU3ltYm9sfHVuZGVmaW5lZDtcbiAgY29uc3QgYXR0cmlidXRlVmFsdWVTeW1ib2wgPSAoYXN0OiBBU1QpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBhdHRyaWJ1dGUgPSBmaW5kQXR0cmlidXRlKGluZm8sIHBvc2l0aW9uKTtcbiAgICBpZiAoYXR0cmlidXRlKSB7XG4gICAgICBpZiAoaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhdHRyaWJ1dGUudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgbGV0IHJlc3VsdDoge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhdHRyaWJ1dGUubmFtZS5zdGFydHNXaXRoKCcqJykpIHtcbiAgICAgICAgICByZXN1bHQgPSBnZXRTeW1ib2xJbk1pY3Jvc3ludGF4KGluZm8sIHBhdGgsIGF0dHJpYnV0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gICAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICAgIHJlc3VsdCA9IGdldEV4cHJlc3Npb25TeW1ib2woc2NvcGUsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHN5bWJvbCA9IHJlc3VsdC5zeW1ib2w7XG4gICAgICAgICAgc3BhbiA9IG9mZnNldFNwYW4ocmVzdWx0LnNwYW4sIGF0dHJpYnV0ZS52YWx1ZVNwYW4gIS5zdGFydC5vZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIGFzdC52aXNpdChcbiAgICAgIHtcbiAgICAgICAgdmlzaXROZ0NvbnRlbnQoYXN0KSB7fSxcbiAgICAgICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdCkge30sXG4gICAgICAgIHZpc2l0RWxlbWVudChhc3QpIHtcbiAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBhc3QuZGlyZWN0aXZlcy5maW5kKGQgPT4gZC5kaXJlY3RpdmUuaXNDb21wb25lbnQpO1xuICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCBiZWNhdXNlICdyZWZlcmVuY2UnIGlzIHR5cGVkIGFzIGFueVxuICAgICAgICAgICAgc3RhdGljU3ltYm9sID0gY29tcG9uZW50LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5DT01QT05FTlQpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGaW5kIGEgZGlyZWN0aXZlIHRoYXQgbWF0Y2hlcyB0aGUgZWxlbWVudCBuYW1lXG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBhc3QuZGlyZWN0aXZlcy5maW5kKFxuICAgICAgICAgICAgICAgIGQgPT4gZC5kaXJlY3RpdmUuc2VsZWN0b3IgIT0gbnVsbCAmJiBkLmRpcmVjdGl2ZS5zZWxlY3Rvci5pbmRleE9mKGFzdC5uYW1lKSA+PSAwKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUpIHtcbiAgICAgICAgICAgICAgLy8gTmVlZCB0byBjYXN0IGJlY2F1c2UgJ3JlZmVyZW5jZScgaXMgdHlwZWQgYXMgYW55XG4gICAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGRpcmVjdGl2ZS5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkRJUkVDVElWRSk7XG4gICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0UmVmZXJlbmNlKGFzdCkge1xuICAgICAgICAgIHN5bWJvbCA9IGFzdC52YWx1ZSAmJiBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2wodG9rZW5SZWZlcmVuY2UoYXN0LnZhbHVlKSk7XG4gICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdFZhcmlhYmxlKGFzdCkge30sXG4gICAgICAgIHZpc2l0RXZlbnQoYXN0KSB7XG4gICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QuaGFuZGxlcikpIHtcbiAgICAgICAgICAgIHN5bWJvbCA9IGZpbmRPdXRwdXRCaW5kaW5nKGFzdCwgcGF0aCwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRVZFTlQpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0KSB7IGF0dHJpYnV0ZVZhbHVlU3ltYm9sKGFzdC52YWx1ZSk7IH0sXG4gICAgICAgIHZpc2l0QXR0cihhc3QpIHtcbiAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcGF0aC5maXJzdChFbGVtZW50QXN0KTtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQpIHJldHVybjtcbiAgICAgICAgICAvLyBDcmVhdGUgYSBtYXBwaW5nIG9mIGFsbCBkaXJlY3RpdmVzIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQgZnJvbSB0aGVpciBzZWxlY3RvcnMuXG4gICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlQXN0PigpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgICAgICAgaWYgKCFkaXIuZGlyZWN0aXZlLnNlbGVjdG9yKSBjb250aW51ZTtcbiAgICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLmRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2VlIGlmIHRoaXMgYXR0cmlidXRlIG1hdGNoZXMgdGhlIHNlbGVjdG9yIG9mIGFueSBkaXJlY3RpdmUgb24gdGhlIGVsZW1lbnQuXG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlU2VsZWN0b3IgPSBgWyR7YXN0Lm5hbWV9PSR7YXN0LnZhbHVlfV1gO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZEF0dHJpYnV0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGF0dHJpYnV0ZVNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoIXBhcnNlZEF0dHJpYnV0ZS5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICBtYXRjaGVyLm1hdGNoKHBhcnNlZEF0dHJpYnV0ZVswXSwgKF8sIHtkaXJlY3RpdmV9KSA9PiB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdEJvdW5kVGV4dChhc3QpIHtcbiAgICAgICAgICBjb25zdCBleHByZXNzaW9uUG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgICAgIGlmIChpblNwYW4oZXhwcmVzc2lvblBvc2l0aW9uLCBhc3QudmFsdWUuc3BhbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID1cbiAgICAgICAgICAgICAgICBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QudmFsdWUsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgICAgICBzcGFuID0gb2Zmc2V0U3BhbihyZXN1bHQuc3BhbiwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0VGV4dChhc3QpIHt9LFxuICAgICAgICB2aXNpdERpcmVjdGl2ZShhc3QpIHtcbiAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBhc3QuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0KSB7XG4gICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QudmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBmaW5kUGFyZW50T2ZCaW5kaW5nKGluZm8udGVtcGxhdGVBc3QsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGUgPSBmaW5kQXR0cmlidXRlKGluZm8sIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgJiYgYXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUubmFtZS5zdGFydHNXaXRoKCcqJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21waWxlVHlwZVN1bW1hcnkgPSBkaXJlY3RpdmUuZGlyZWN0aXZlO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICAgIC8vIFVzZSAnYXR0cmlidXRlLnNvdXJjZVNwYW4nIGluc3RlYWQgb2YgdGhlIGRpcmVjdGl2ZSdzLFxuICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgdGhlIHNwYW4gb2YgdGhlIGRpcmVjdGl2ZSBpcyB0aGUgd2hvbGUgb3BlbmluZyB0YWcgb2YgYW4gZWxlbWVudC5cbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGF0dHJpYnV0ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBmaW5kSW5wdXRCaW5kaW5nKGluZm8sIGFzdC50ZW1wbGF0ZU5hbWUsIGRpcmVjdGl2ZSk7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbnVsbCk7XG4gIGlmIChzeW1ib2wgJiYgc3Bhbikge1xuICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IG9mZnNldFNwYW4oc3BhbiwgaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0KTtcbiAgICByZXR1cm4ge1xuICAgICAgc3ltYm9sLFxuICAgICAgc3BhbjogdHNzLmNyZWF0ZVRleHRTcGFuRnJvbUJvdW5kcyhzdGFydCwgZW5kKSwgc3RhdGljU3ltYm9sLFxuICAgIH07XG4gIH1cbn1cblxuLy8gR2V0IHRoZSBzeW1ib2wgaW4gbWljcm9zeW50YXggYXQgdGVtcGxhdGUgcG9zaXRpb24uXG5mdW5jdGlvbiBnZXRTeW1ib2xJbk1pY3Jvc3ludGF4KGluZm86IEFzdFJlc3VsdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBhdHRyaWJ1dGU6IEF0dHJpYnV0ZSk6XG4gICAge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQge1xuICBpZiAoIWF0dHJpYnV0ZS52YWx1ZVNwYW4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHJlc3VsdDoge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQ7XG4gIGNvbnN0IHt0ZW1wbGF0ZUJpbmRpbmdzfSA9IGluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZVRlbXBsYXRlQmluZGluZ3MoXG4gICAgICBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlLCBhdHRyaWJ1dGUuc291cmNlU3Bhbi50b1N0cmluZygpLFxuICAgICAgYXR0cmlidXRlLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAvLyBGaW5kIHdoZXJlIHRoZSBjdXJzb3IgaXMgcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBhdHRyaWJ1dGUgdmFsdWUuXG4gIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHBhdGgucG9zaXRpb24gLSBhdHRyaWJ1dGUudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcblxuICAvLyBGaW5kIHRoZSBzeW1ib2wgdGhhdCBjb250YWlucyB0aGUgcG9zaXRpb24uXG4gIHRlbXBsYXRlQmluZGluZ3MuZmlsdGVyKHRiID0+ICF0Yi5rZXlJc1ZhcikuZm9yRWFjaCh0YiA9PiB7XG4gICAgaWYgKGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIHRiLnZhbHVlPy5hc3Quc3BhbikpIHtcbiAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgcmVzdWx0ID0gZ2V0RXhwcmVzc2lvblN5bWJvbChzY29wZSwgdGIudmFsdWUgISwgcGF0aC5wb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgfSBlbHNlIGlmIChpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCB0Yi5zcGFuKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBwYXRoLmZpcnN0KEVtYmVkZGVkVGVtcGxhdGVBc3QpO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIC8vIE9uZSBlbGVtZW50IGNhbiBvbmx5IGhhdmUgb25lIHRlbXBsYXRlIGJpbmRpbmcuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUFzdCA9IHRlbXBsYXRlLmRpcmVjdGl2ZXNbMF07XG4gICAgICAgIGlmIChkaXJlY3RpdmVBc3QpIHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSBmaW5kSW5wdXRCaW5kaW5nKGluZm8sIHRiLmtleS5zdWJzdHJpbmcoMSksIGRpcmVjdGl2ZUFzdCk7XG4gICAgICAgICAgaWYgKHN5bWJvbCkge1xuICAgICAgICAgICAgcmVzdWx0ID0ge3N5bWJvbCwgc3BhbjogdGIuc3Bhbn07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZmluZEF0dHJpYnV0ZShpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBBdHRyaWJ1dGV8dW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24oaW5mby5odG1sQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgcmV0dXJuIHBhdGguZmlyc3QoQXR0cmlidXRlKTtcbn1cblxuLy8gVE9ETzogcmVtb3ZlIHRoaXMgZnVuY3Rpb24gYWZ0ZXIgdGhlIHBhdGggaW5jbHVkZXMgJ0RpcmVjdGl2ZUFzdCcuXG4vLyBGaW5kIHRoZSBkaXJlY3RpdmUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkICdiaW5kaW5nJ1xuLy8gYXQgdGhlIHNwZWNpZmllZCAncG9zaXRpb24nIGluIHRoZSAnYXN0Jy5cbmZ1bmN0aW9uIGZpbmRQYXJlbnRPZkJpbmRpbmcoXG4gICAgYXN0OiBUZW1wbGF0ZUFzdFtdLCBiaW5kaW5nOiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBwb3NpdGlvbjogbnVtYmVyKTogRGlyZWN0aXZlQXN0fFxuICAgIHVuZGVmaW5lZCB7XG4gIGxldCByZXM6IERpcmVjdGl2ZUFzdHx1bmRlZmluZWQ7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogVGVtcGxhdGVBc3QpOiBhbnkge1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKCFpblNwYW4ocG9zaXRpb24sIHNwYW4pKSB7XG4gICAgICAgIC8vIFJldHVybmluZyBhIHZhbHVlIGhlcmUgd2lsbCByZXN1bHQgaW4gdGhlIGNoaWxkcmVuIGJlaW5nIHNraXBwZWQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdERpcmVjdGl2ZShhc3Q6IERpcmVjdGl2ZUFzdCkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52aXNpdENoaWxkcmVuKGFzdCwgdmlzaXQgPT4geyB2aXNpdChhc3QuaW5wdXRzKTsgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBjb250ZXh0OiBEaXJlY3RpdmVBc3QpIHtcbiAgICAgIGlmIChhc3QgPT09IGJpbmRpbmcpIHtcbiAgICAgICAgcmVzID0gY29udGV4dDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgYXN0KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuLy8gRmluZCB0aGUgc3ltYm9sIG9mIGlucHV0IGJpbmRpbmcgaW4gJ2RpcmVjdGl2ZUFzdCcgYnkgJ25hbWUnLlxuZnVuY3Rpb24gZmluZElucHV0QmluZGluZyhpbmZvOiBBc3RSZXN1bHQsIG5hbWU6IHN0cmluZywgZGlyZWN0aXZlQXN0OiBEaXJlY3RpdmVBc3QpOiBTeW1ib2x8XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgaW52ZXJ0ZWRJbnB1dCA9IGludmVydE1hcChkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLmlucHV0cyk7XG4gIGNvbnN0IGZpZWxkTmFtZSA9IGludmVydGVkSW5wdXRbbmFtZV07XG4gIGlmIChmaWVsZE5hbWUpIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgIHJldHVybiBjbGFzc1N5bWJvbC5tZW1iZXJzKCkuZ2V0KGZpZWxkTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogV3JhcCBhIHN5bWJvbCBhbmQgY2hhbmdlIGl0cyBraW5kIHRvIGNvbXBvbmVudC5cbiAqL1xuY2xhc3MgT3ZlcnJpZGVLaW5kU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERpcmVjdGl2ZUtpbmQ7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3ltOiBTeW1ib2wsIGtpbmRPdmVycmlkZTogRGlyZWN0aXZlS2luZCkgeyB0aGlzLmtpbmQgPSBraW5kT3ZlcnJpZGU7IH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW0ubmFtZTsgfVxuXG4gIGdldCBsYW5ndWFnZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW0ubGFuZ3VhZ2U7IH1cblxuICBnZXQgdHlwZSgpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLnR5cGU7IH1cblxuICBnZXQgY29udGFpbmVyKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0uY29udGFpbmVyOyB9XG5cbiAgZ2V0IHB1YmxpYygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLnB1YmxpYzsgfVxuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLmNhbGxhYmxlOyB9XG5cbiAgZ2V0IG51bGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0ubnVsbGFibGU7IH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHsgcmV0dXJuIHRoaXMuc3ltLmRlZmluaXRpb247IH1cblxuICBnZXQgZG9jdW1lbnRhdGlvbigpOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdIHsgcmV0dXJuIHRoaXMuc3ltLmRvY3VtZW50YXRpb247IH1cblxuICBtZW1iZXJzKCkgeyByZXR1cm4gdGhpcy5zeW0ubWVtYmVycygpOyB9XG5cbiAgc2lnbmF0dXJlcygpIHsgcmV0dXJuIHRoaXMuc3ltLnNpZ25hdHVyZXMoKTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pIHsgcmV0dXJuIHRoaXMuc3ltLnNlbGVjdFNpZ25hdHVyZSh0eXBlcyk7IH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpIHsgcmV0dXJuIHRoaXMuc3ltLmluZGV4ZWQoYXJndW1lbnQpOyB9XG5cbiAgdHlwZUFyZ3VtZW50cygpOiBTeW1ib2xbXXx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0udHlwZUFyZ3VtZW50cygpOyB9XG59XG4iXX0=