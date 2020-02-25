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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW9RO0lBQ3BRLG9EQUFzRDtJQUd0RCwrRkFBNEQ7SUFDNUQseUVBQWtEO0lBQ2xELDZEQUFnRTtJQUNoRSw2REFBeUs7SUFReks7Ozs7T0FJRztJQUNILFNBQWdCLGFBQWEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7O1FBQzdELElBQU0sZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM3RCw4REFBOEQ7UUFDOUQsSUFBTSxJQUFJLEdBQUcseUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFFMUIsSUFBTSxTQUFTLEdBQUcsY0FBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxJQUFJLEdBQTBCLElBQUksQ0FBQyxJQUFJLEVBQzNDLElBQUksSUFBSSxrQkFBVSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQjtRQUVELHVFQUF1RTtRQUN2RSxVQUFJLFNB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QUFPLEdBQVAsVUFBUSxRQUFnQixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLDBDQUFhLEdBQWIsY0FBc0MsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRSx5QkFBQztJQUFELENBQUMsQUEvQkQsSUErQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBdHRyaWJ1dGUsIEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIENzc1NlbGVjdG9yLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIEVtYmVkZGVkVGVtcGxhdGVBc3QsIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0aWNTeW1ib2wsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIHRlbXBsYXRlVmlzaXRBbGwsIHRva2VuUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU3ltYm9sfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7RGVmaW5pdGlvbiwgRGlyZWN0aXZlS2luZCwgU3BhbiwgU3ltYm9sfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kT3V0cHV0QmluZGluZywgZmluZFRlbXBsYXRlQXN0QXQsIGdldFBhdGhUb05vZGVBdFBvc2l0aW9uLCBpblNwYW4sIGludmVydE1hcCwgaXNOYXJyb3dlciwgb2Zmc2V0U3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBTeW1ib2xJbmZvIHtcbiAgc3ltYm9sOiBTeW1ib2w7XG4gIHNwYW46IHRzcy5UZXh0U3BhbjtcbiAgc3RhdGljU3ltYm9sPzogU3RhdGljU3ltYm9sO1xufVxuXG4vKipcbiAqIFRyYXZlcnNlcyBhIHRlbXBsYXRlIEFTVCBhbmQgbG9jYXRlcyBzeW1ib2wocykgYXQgYSBzcGVjaWZpZWQgcG9zaXRpb24uXG4gKiBAcGFyYW0gaW5mbyB0ZW1wbGF0ZSBBU1QgaW5mb3JtYXRpb24gc2V0XG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gdG8gbG9jYXRlIHN5bWJvbHMgYXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZVN5bWJvbHMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogU3ltYm9sSW5mb1tdIHtcbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICAvLyBUT0RPOiB1cGRhdGUgYGZpbmRUZW1wbGF0ZUFzdEF0YCB0byB1c2UgYWJzb2x1dGUgcG9zaXRpb25zLlxuICBjb25zdCBwYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IGF0dHJpYnV0ZSA9IGZpbmRBdHRyaWJ1dGUoaW5mbywgcG9zaXRpb24pO1xuXG4gIGlmICghcGF0aC50YWlsKSByZXR1cm4gW107XG5cbiAgY29uc3QgbmFycm93ZXN0ID0gc3Bhbk9mKHBhdGgudGFpbCk7XG4gIGNvbnN0IHRvVmlzaXQ6IFRlbXBsYXRlQXN0W10gPSBbXTtcbiAgZm9yIChsZXQgbm9kZTogVGVtcGxhdGVBc3R8dW5kZWZpbmVkID0gcGF0aC50YWlsO1xuICAgICAgIG5vZGUgJiYgaXNOYXJyb3dlcihzcGFuT2Yobm9kZS5zb3VyY2VTcGFuKSwgbmFycm93ZXN0KTsgbm9kZSA9IHBhdGgucGFyZW50T2Yobm9kZSkpIHtcbiAgICB0b1Zpc2l0LnB1c2gobm9kZSk7XG4gIH1cblxuICAvLyBGb3IgdGhlIHN0cnVjdHVyYWwgZGlyZWN0aXZlLCBvbmx5IGNhcmUgYWJvdXQgdGhlIGxhc3QgdGVtcGxhdGUgQVNULlxuICBpZiAoYXR0cmlidXRlPy5uYW1lLnN0YXJ0c1dpdGgoJyonKSkge1xuICAgIHRvVmlzaXQuc3BsaWNlKDAsIHRvVmlzaXQubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gdG9WaXNpdC5tYXAoYXN0ID0+IGxvY2F0ZVN5bWJvbChhc3QsIHBhdGgsIGluZm8pKVxuICAgICAgLmZpbHRlcigoc3ltKTogc3ltIGlzIFN5bWJvbEluZm8gPT4gc3ltICE9PSB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFZpc2l0cyBhIHRlbXBsYXRlIG5vZGUgYW5kIGxvY2F0ZXMgdGhlIHN5bWJvbCBpbiB0aGF0IG5vZGUgYXQgYSBwYXRoIHBvc2l0aW9uLlxuICogQHBhcmFtIGFzdCB0ZW1wbGF0ZSBBU1Qgbm9kZSB0byB2aXNpdFxuICogQHBhcmFtIHBhdGggbm9uLWVtcHR5IHNldCBvZiBuYXJyb3dpbmcgQVNUIG5vZGVzIGF0IGEgcG9zaXRpb25cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVCBpbmZvcm1hdGlvbiBzZXRcbiAqL1xuZnVuY3Rpb24gbG9jYXRlU3ltYm9sKGFzdDogVGVtcGxhdGVBc3QsIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgaW5mbzogQXN0UmVzdWx0KTogU3ltYm9sSW5mb3xcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcGF0aC5wb3NpdGlvbjtcbiAgY29uc3QgcG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uICsgaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBsZXQgc3ltYm9sOiBTeW1ib2x8dW5kZWZpbmVkO1xuICBsZXQgc3BhbjogU3Bhbnx1bmRlZmluZWQ7XG4gIGxldCBzdGF0aWNTeW1ib2w6IFN0YXRpY1N5bWJvbHx1bmRlZmluZWQ7XG4gIGNvbnN0IGF0dHJpYnV0ZVZhbHVlU3ltYm9sID0gKGFzdDogQVNUKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgYXR0cmlidXRlID0gZmluZEF0dHJpYnV0ZShpbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGF0dHJpYnV0ZSkge1xuICAgICAgaWYgKGluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXR0cmlidXRlLnZhbHVlU3BhbikpKSB7XG4gICAgICAgIGxldCByZXN1bHQ6IHtzeW1ib2w6IFN5bWJvbCwgc3BhbjogU3Bhbn18dW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXR0cmlidXRlLm5hbWUuc3RhcnRzV2l0aCgnKicpKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZ2V0U3ltYm9sSW5NaWNyb3N5bnRheChpbmZvLCBwYXRoLCBhdHRyaWJ1dGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgIGNvbnN0IHNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCBwYXRoKTtcbiAgICAgICAgICByZXN1bHQgPSBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgIHNwYW4gPSBvZmZzZXRTcGFuKHJlc3VsdC5zcGFuLCBhdHRyaWJ1dGUudmFsdWVTcGFuICEuc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBhc3QudmlzaXQoXG4gICAgICB7XG4gICAgICAgIHZpc2l0TmdDb250ZW50KGFzdCkge30sXG4gICAgICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QpIHt9LFxuICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gYXN0LmRpcmVjdGl2ZXMuZmluZChkID0+IGQuZGlyZWN0aXZlLmlzQ29tcG9uZW50KTtcbiAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGNvbXBvbmVudC5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UgYXMgU3RhdGljU3ltYm9sO1xuICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuQ09NUE9ORU5UKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmluZCBhIGRpcmVjdGl2ZSB0aGF0IG1hdGNoZXMgdGhlIGVsZW1lbnQgbmFtZVxuICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gYXN0LmRpcmVjdGl2ZXMuZmluZChcbiAgICAgICAgICAgICAgICBkID0+IGQuZGlyZWN0aXZlLnNlbGVjdG9yICE9IG51bGwgJiYgZC5kaXJlY3RpdmUuc2VsZWN0b3IuaW5kZXhPZihhc3QubmFtZSkgPj0gMCk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlKSB7XG4gICAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCBiZWNhdXNlICdyZWZlcmVuY2UnIGlzIHR5cGVkIGFzIGFueVxuICAgICAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBkaXJlY3RpdmUuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHN0YXRpY1N5bWJvbCk7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB2aXNpdFJlZmVyZW5jZShhc3QpIHtcbiAgICAgICAgICBzeW1ib2wgPSBhc3QudmFsdWUgJiYgaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKHRva2VuUmVmZXJlbmNlKGFzdC52YWx1ZSkpO1xuICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgfSxcbiAgICAgICAgdmlzaXRWYXJpYWJsZShhc3QpIHt9LFxuICAgICAgICB2aXNpdEV2ZW50KGFzdCkge1xuICAgICAgICAgIGlmICghYXR0cmlidXRlVmFsdWVTeW1ib2woYXN0LmhhbmRsZXIpKSB7XG4gICAgICAgICAgICBzeW1ib2wgPSBmaW5kT3V0cHV0QmluZGluZyhhc3QsIHBhdGgsIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkVWRU5UKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdCkgeyBhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QudmFsdWUpOyB9LFxuICAgICAgICB2aXNpdEF0dHIoYXN0KSB7XG4gICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguaGVhZDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIShlbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudEFzdCkpIHJldHVybjtcbiAgICAgICAgICAvLyBDcmVhdGUgYSBtYXBwaW5nIG9mIGFsbCBkaXJlY3RpdmVzIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQgZnJvbSB0aGVpciBzZWxlY3RvcnMuXG4gICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlQXN0PigpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgICAgICAgICAgaWYgKCFkaXIuZGlyZWN0aXZlLnNlbGVjdG9yKSBjb250aW51ZTtcbiAgICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLmRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2VlIGlmIHRoaXMgYXR0cmlidXRlIG1hdGNoZXMgdGhlIHNlbGVjdG9yIG9mIGFueSBkaXJlY3RpdmUgb24gdGhlIGVsZW1lbnQuXG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlU2VsZWN0b3IgPSBgWyR7YXN0Lm5hbWV9PSR7YXN0LnZhbHVlfV1gO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZEF0dHJpYnV0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGF0dHJpYnV0ZVNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoIXBhcnNlZEF0dHJpYnV0ZS5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICBtYXRjaGVyLm1hdGNoKHBhcnNlZEF0dHJpYnV0ZVswXSwgKF8sIHtkaXJlY3RpdmV9KSA9PiB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICAgIHN0YXRpY1N5bWJvbCA9IGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSBhcyBTdGF0aWNTeW1ib2w7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB2aXNpdEJvdW5kVGV4dChhc3QpIHtcbiAgICAgICAgICBjb25zdCBleHByZXNzaW9uUG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgICAgIGlmIChpblNwYW4oZXhwcmVzc2lvblBvc2l0aW9uLCBhc3QudmFsdWUuc3BhbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID1cbiAgICAgICAgICAgICAgICBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCBhc3QudmFsdWUsIHRlbXBsYXRlUG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgICAgICBzcGFuID0gb2Zmc2V0U3BhbihyZXN1bHQuc3BhbiwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0VGV4dChhc3QpIHt9LFxuICAgICAgICB2aXNpdERpcmVjdGl2ZShhc3QpIHtcbiAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgYmVjYXVzZSAncmVmZXJlbmNlJyBpcyB0eXBlZCBhcyBhbnlcbiAgICAgICAgICBzdGF0aWNTeW1ib2wgPSBhc3QuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlIGFzIFN0YXRpY1N5bWJvbDtcbiAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woc3RhdGljU3ltYm9sKTtcbiAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgIH0sXG4gICAgICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0KSB7XG4gICAgICAgICAgaWYgKCFhdHRyaWJ1dGVWYWx1ZVN5bWJvbChhc3QudmFsdWUpKSB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBmaW5kUGFyZW50T2ZCaW5kaW5nKGluZm8udGVtcGxhdGVBc3QsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGUgPSBmaW5kQXR0cmlidXRlKGluZm8sIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgJiYgYXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGUubmFtZS5zdGFydHNXaXRoKCcqJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21waWxlVHlwZVN1bW1hcnkgPSBkaXJlY3RpdmUuZGlyZWN0aXZlO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHN5bWJvbCAmJiBuZXcgT3ZlcnJpZGVLaW5kU3ltYm9sKHN5bWJvbCwgRGlyZWN0aXZlS2luZC5ESVJFQ1RJVkUpO1xuICAgICAgICAgICAgICAgIC8vIFVzZSAnYXR0cmlidXRlLnNvdXJjZVNwYW4nIGluc3RlYWQgb2YgdGhlIGRpcmVjdGl2ZSdzLFxuICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgdGhlIHNwYW4gb2YgdGhlIGRpcmVjdGl2ZSBpcyB0aGUgd2hvbGUgb3BlbmluZyB0YWcgb2YgYW4gZWxlbWVudC5cbiAgICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGF0dHJpYnV0ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBmaW5kSW5wdXRCaW5kaW5nKGluZm8sIGFzdC50ZW1wbGF0ZU5hbWUsIGRpcmVjdGl2ZSk7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbnVsbCk7XG4gIGlmIChzeW1ib2wgJiYgc3Bhbikge1xuICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IG9mZnNldFNwYW4oc3BhbiwgaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0KTtcbiAgICByZXR1cm4ge1xuICAgICAgc3ltYm9sLFxuICAgICAgc3BhbjogdHNzLmNyZWF0ZVRleHRTcGFuRnJvbUJvdW5kcyhzdGFydCwgZW5kKSwgc3RhdGljU3ltYm9sLFxuICAgIH07XG4gIH1cbn1cblxuLy8gR2V0IHRoZSBzeW1ib2wgaW4gbWljcm9zeW50YXggYXQgdGVtcGxhdGUgcG9zaXRpb24uXG5mdW5jdGlvbiBnZXRTeW1ib2xJbk1pY3Jvc3ludGF4KGluZm86IEFzdFJlc3VsdCwgcGF0aDogVGVtcGxhdGVBc3RQYXRoLCBhdHRyaWJ1dGU6IEF0dHJpYnV0ZSk6XG4gICAge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQge1xuICBpZiAoIWF0dHJpYnV0ZS52YWx1ZVNwYW4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHJlc3VsdDoge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQ7XG4gIGNvbnN0IHt0ZW1wbGF0ZUJpbmRpbmdzfSA9IGluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZVRlbXBsYXRlQmluZGluZ3MoXG4gICAgICBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlLCBhdHRyaWJ1dGUuc291cmNlU3Bhbi50b1N0cmluZygpLFxuICAgICAgYXR0cmlidXRlLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAvLyBGaW5kIHdoZXJlIHRoZSBjdXJzb3IgaXMgcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBhdHRyaWJ1dGUgdmFsdWUuXG4gIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHBhdGgucG9zaXRpb24gLSBhdHRyaWJ1dGUudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcblxuICAvLyBGaW5kIHRoZSBzeW1ib2wgdGhhdCBjb250YWlucyB0aGUgcG9zaXRpb24uXG4gIHRlbXBsYXRlQmluZGluZ3MuZmlsdGVyKHRiID0+ICF0Yi5rZXlJc1ZhcikuZm9yRWFjaCh0YiA9PiB7XG4gICAgaWYgKGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIHRiLmV4cHJlc3Npb24/LmFzdC5zcGFuKSkge1xuICAgICAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gICAgICBjb25zdCBzY29wZSA9IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCk7XG4gICAgICByZXN1bHQgPSBnZXRFeHByZXNzaW9uU3ltYm9sKHNjb3BlLCB0Yi5leHByZXNzaW9uICEsIHBhdGgucG9zaXRpb24sIGluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgIH0gZWxzZSBpZiAoaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgdGIuc3BhbikpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gcGF0aC5maXJzdChFbWJlZGRlZFRlbXBsYXRlQXN0KTtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAvLyBPbmUgZWxlbWVudCBjYW4gb25seSBoYXZlIG9uZSB0ZW1wbGF0ZSBiaW5kaW5nLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVBc3QgPSB0ZW1wbGF0ZS5kaXJlY3RpdmVzWzBdO1xuICAgICAgICBpZiAoZGlyZWN0aXZlQXN0KSB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gZmluZElucHV0QmluZGluZyhpbmZvLCB0Yi5rZXkuc3Vic3RyaW5nKDEpLCBkaXJlY3RpdmVBc3QpO1xuICAgICAgICAgIGlmIChzeW1ib2wpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHtzeW1ib2wsIHNwYW46IHRiLnNwYW59O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGZpbmRBdHRyaWJ1dGUoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogQXR0cmlidXRlfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKGluZm8uaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIHJldHVybiBwYXRoLmZpcnN0KEF0dHJpYnV0ZSk7XG59XG5cbi8vIFRPRE86IHJlbW92ZSB0aGlzIGZ1bmN0aW9uIGFmdGVyIHRoZSBwYXRoIGluY2x1ZGVzICdEaXJlY3RpdmVBc3QnLlxuLy8gRmluZCB0aGUgZGlyZWN0aXZlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHNwZWNpZmllZCAnYmluZGluZydcbi8vIGF0IHRoZSBzcGVjaWZpZWQgJ3Bvc2l0aW9uJyBpbiB0aGUgJ2FzdCcuXG5mdW5jdGlvbiBmaW5kUGFyZW50T2ZCaW5kaW5nKFxuICAgIGFzdDogVGVtcGxhdGVBc3RbXSwgYmluZGluZzogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgcG9zaXRpb246IG51bWJlcik6IERpcmVjdGl2ZUFzdHxcbiAgICB1bmRlZmluZWQge1xuICBsZXQgcmVzOiBEaXJlY3RpdmVBc3R8dW5kZWZpbmVkO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IFRlbXBsYXRlQXN0KTogYW55IHtcbiAgICAgIGNvbnN0IHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgIGlmICghaW5TcGFuKHBvc2l0aW9uLCBzcGFuKSkge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXREaXJlY3RpdmUoYXN0OiBEaXJlY3RpdmVBc3QpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRDaGlsZHJlbihhc3QsIHZpc2l0ID0+IHsgdmlzaXQoYXN0LmlucHV0cyk7IH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgY29udGV4dDogRGlyZWN0aXZlQXN0KSB7XG4gICAgICBpZiAoYXN0ID09PSBiaW5kaW5nKSB7XG4gICAgICAgIHJlcyA9IGNvbnRleHQ7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGFzdCk7XG4gIHJldHVybiByZXM7XG59XG5cbi8vIEZpbmQgdGhlIHN5bWJvbCBvZiBpbnB1dCBiaW5kaW5nIGluICdkaXJlY3RpdmVBc3QnIGJ5ICduYW1lJy5cbmZ1bmN0aW9uIGZpbmRJbnB1dEJpbmRpbmcoaW5mbzogQXN0UmVzdWx0LCBuYW1lOiBzdHJpbmcsIGRpcmVjdGl2ZUFzdDogRGlyZWN0aXZlQXN0KTogU3ltYm9sfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGludmVydGVkSW5wdXQgPSBpbnZlcnRNYXAoZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS5pbnB1dHMpO1xuICBjb25zdCBmaWVsZE5hbWUgPSBpbnZlcnRlZElucHV0W25hbWVdO1xuICBpZiAoZmllbGROYW1lKSB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICByZXR1cm4gY2xhc3NTeW1ib2wubWVtYmVycygpLmdldChmaWVsZE5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFdyYXAgYSBzeW1ib2wgYW5kIGNoYW5nZSBpdHMga2luZCB0byBjb21wb25lbnQuXG4gKi9cbmNsYXNzIE92ZXJyaWRlS2luZFN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHB1YmxpYyByZWFkb25seSBraW5kOiBEaXJlY3RpdmVLaW5kO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN5bTogU3ltYm9sLCBraW5kT3ZlcnJpZGU6IERpcmVjdGl2ZUtpbmQpIHsgdGhpcy5raW5kID0ga2luZE92ZXJyaWRlOyB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc3ltLm5hbWU7IH1cblxuICBnZXQgbGFuZ3VhZ2UoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc3ltLmxhbmd1YWdlOyB9XG5cbiAgZ2V0IHR5cGUoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnN5bS50eXBlOyB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLmNvbnRhaW5lcjsgfVxuXG4gIGdldCBwdWJsaWMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5wdWJsaWM7IH1cblxuICBnZXQgY2FsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnN5bS5jYWxsYWJsZTsgfVxuXG4gIGdldCBudWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLm51bGxhYmxlOyB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbiB7IHJldHVybiB0aGlzLnN5bS5kZWZpbml0aW9uOyB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7IHJldHVybiB0aGlzLnN5bS5kb2N1bWVudGF0aW9uOyB9XG5cbiAgbWVtYmVycygpIHsgcmV0dXJuIHRoaXMuc3ltLm1lbWJlcnMoKTsgfVxuXG4gIHNpZ25hdHVyZXMoKSB7IHJldHVybiB0aGlzLnN5bS5zaWduYXR1cmVzKCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKSB7IHJldHVybiB0aGlzLnN5bS5zZWxlY3RTaWduYXR1cmUodHlwZXMpOyB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKSB7IHJldHVybiB0aGlzLnN5bS5pbmRleGVkKGFyZ3VtZW50KTsgfVxuXG4gIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW118dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLnR5cGVBcmd1bWVudHMoKTsgfVxufVxuIl19