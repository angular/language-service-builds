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
        define("@angular/language-service/src/locate_symbol", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/expressions", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
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
                        var scope = language_services_1.getExpressionScope(dinfo, path, inEvent);
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
                    // TODO(ayazhafiz): Consider caching selector matches (at the expense of potentially
                    // very high memory usage).
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
                        var scope = language_services_1.getExpressionScope(dinfo, path, /* includeEvent */ false);
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
                        symbol_1 = findInputBinding(info, path, ast);
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
        var path = compiler_1.findNode(info.htmlAst, templatePosition);
        return path.first(compiler_1.Attribute);
    }
    function findInputBinding(info, path, binding) {
        var e_2, _a;
        var element = path.first(compiler_1.ElementAst);
        if (element) {
            try {
                for (var _b = tslib_1.__values(element.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var directive = _c.value;
                    var invertedInput = invertMap(directive.directive.inputs);
                    var fieldName = invertedInput[binding.templateName];
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
    function findOutputBinding(info, path, binding) {
        var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    function invertMap(obj) {
        var e_4, _a;
        var result = {};
        try {
            for (var _b = tslib_1.__values(Object.keys(obj)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var name_1 = _c.value;
                var v = obj[name_1];
                result[v] = name_1;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
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
        OverrideKindSymbol.prototype.members = function () { return this.sym.members(); };
        OverrideKindSymbol.prototype.signatures = function () { return this.sym.signatures(); };
        OverrideKindSymbol.prototype.selectSignature = function (types) { return this.sym.selectSignature(types); };
        OverrideKindSymbol.prototype.indexed = function (argument) { return this.sym.indexed(argument); };
        return OverrideKindSymbol;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRlX3N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xvY2F0ZV9zeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWtOO0lBQ2xOLGlGQUErRTtJQUcvRSx5RUFBa0Q7SUFDbEQsNkRBQWdFO0lBQ2hFLDZEQUFzRztJQVF0Rzs7OztPQUlHO0lBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQWUsRUFBRSxRQUFnQjtRQUM1RCxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcseUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQUksa0JBQWtCLEdBQWlDLFNBQVMsQ0FBQztRQUNqRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDYixJQUFJLFFBQU0sR0FBcUIsU0FBUyxDQUFDO1lBQ3pDLElBQUksTUFBSSxHQUFtQixTQUFTLENBQUM7WUFDckMsSUFBTSxzQkFBb0IsR0FBRyxVQUFDLEdBQVEsRUFBRSxPQUF3QjtnQkFBeEIsd0JBQUEsRUFBQSxlQUF3QjtnQkFDOUQsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxTQUFTLEVBQUU7b0JBQ2IsSUFBSSxjQUFNLENBQUMsZ0JBQWdCLEVBQUUsY0FBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFO3dCQUN6RCxJQUFNLEtBQUssR0FBRyxzQ0FBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbkQsSUFBTSxLQUFLLEdBQUcsc0NBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENB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K0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXRELHNCQUFJLHlDQUFTO2lCQUFiLGNBQW9DLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVoRSxzQkFBSSxzQ0FBTTtpQkFBVixjQUF3QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFakQsc0JBQUksd0NBQVE7aUJBQVosY0FBMEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXJELHNCQUFJLHdDQUFRO2lCQUFaLGNBQTBCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVyRCxzQkFBSSwwQ0FBVTtpQkFBZCxjQUErQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFNUQsb0NBQU8sR0FBUCxjQUFZLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEMsdUNBQVUsR0FBVixjQUFlLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUMsNENBQWUsR0FBZixVQUFnQixLQUFlLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUUsb0NBQU8sR0FBUCxVQUFRLFFBQWdCLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUseUJBQUM7SUFBRCxDQUFDLEFBM0JELElBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEV2ZW50QXN0LCBDb21waWxlVHlwZVN1bW1hcnksIENzc1NlbGVjdG9yLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIFNlbGVjdG9yTWF0Y2hlciwgVGVtcGxhdGVBc3RQYXRoLCBmaW5kTm9kZSwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblN5bWJvbH0gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb24sIERpcmVjdGl2ZUtpbmQsIFNwYW4sIFN5bWJvbH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGluU3Bhbiwgb2Zmc2V0U3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBTeW1ib2xJbmZvIHtcbiAgc3ltYm9sOiBTeW1ib2w7XG4gIHNwYW46IFNwYW47XG4gIGNvbXBpbGVUeXBlU3VtbWFyeTogQ29tcGlsZVR5cGVTdW1tYXJ5fHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBUcmF2ZXJzZSB0aGUgdGVtcGxhdGUgQVNUIGFuZCBsb2NhdGUgdGhlIFN5bWJvbCBhdCB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gKiBAcGFyYW0gaW5mbyBBc3QgYW5kIFRlbXBsYXRlIFNvdXJjZVxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIHRvIGxvb2sgZm9yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGVTeW1ib2woaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogU3ltYm9sSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgbGV0IGNvbXBpbGVUeXBlU3VtbWFyeTogQ29tcGlsZVR5cGVTdW1tYXJ5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgaWYgKHBhdGgudGFpbCkge1xuICAgIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IHNwYW46IFNwYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGNvbnN0IGF0dHJpYnV0ZVZhbHVlU3ltYm9sID0gKGFzdDogQVNULCBpbkV2ZW50OiBib29sZWFuID0gZmFsc2UpOiBib29sZWFuID0+IHtcbiAgICAgIGNvbnN0IGF0dHJpYnV0ZSA9IGZpbmRBdHRyaWJ1dGUoaW5mbywgcG9zaXRpb24pO1xuICAgICAgaWYgKGF0dHJpYnV0ZSkge1xuICAgICAgICBpZiAoaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhdHRyaWJ1dGUudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICAgICAgICBjb25zdCBzY29wZSA9IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCwgaW5FdmVudCk7XG4gICAgICAgICAgaWYgKGF0dHJpYnV0ZS52YWx1ZVNwYW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldEV4cHJlc3Npb25TeW1ib2woc2NvcGUsIGFzdCwgdGVtcGxhdGVQb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgIHN5bWJvbCA9IHJlc3VsdC5zeW1ib2w7XG4gICAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb25PZmZzZXQgPSBhdHRyaWJ1dGUudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgICAgICAgc3BhbiA9IG9mZnNldFNwYW4ocmVzdWx0LnNwYW4sIGV4cHJlc3Npb25PZmZzZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgcGF0aC50YWlsLnZpc2l0KFxuICAgICAgICB7XG4gICAgICAgICAgdmlzaXROZ0NvbnRlbnQoYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBhc3QuZGlyZWN0aXZlcy5maW5kKGQgPT4gZC5kaXJlY3RpdmUuaXNDb21wb25lbnQpO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICBjb21waWxlVHlwZVN1bW1hcnkgPSBjb21wb25lbnQuZGlyZWN0aXZlO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woY29tcGlsZVR5cGVTdW1tYXJ5LnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkNPTVBPTkVOVCk7XG4gICAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEZpbmQgYSBkaXJlY3RpdmUgdGhhdCBtYXRjaGVzIHRoZSBlbGVtZW50IG5hbWVcbiAgICAgICAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gYXN0LmRpcmVjdGl2ZXMuZmluZChcbiAgICAgICAgICAgICAgICAgIGQgPT4gZC5kaXJlY3RpdmUuc2VsZWN0b3IgIT0gbnVsbCAmJiBkLmRpcmVjdGl2ZS5zZWxlY3Rvci5pbmRleE9mKGFzdC5uYW1lKSA+PSAwKTtcbiAgICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGNvbXBpbGVUeXBlU3VtbWFyeSA9IGRpcmVjdGl2ZS5kaXJlY3RpdmU7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGNvbXBpbGVUeXBlU3VtbWFyeS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkRJUkVDVElWRSk7XG4gICAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFJlZmVyZW5jZShhc3QpIHtcbiAgICAgICAgICAgIHN5bWJvbCA9IGFzdC52YWx1ZSAmJiBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2wodG9rZW5SZWZlcmVuY2UoYXN0LnZhbHVlKSk7XG4gICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFZhcmlhYmxlKGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFdmVudChhc3QpIHtcbiAgICAgICAgICAgIGlmICghYXR0cmlidXRlVmFsdWVTeW1ib2woYXN0LmhhbmRsZXIsIC8qIGluRXZlbnQgKi8gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gZmluZE91dHB1dEJpbmRpbmcoaW5mbywgcGF0aCwgYXN0KTtcbiAgICAgICAgICAgICAgc3ltYm9sID0gc3ltYm9sICYmIG5ldyBPdmVycmlkZUtpbmRTeW1ib2woc3ltYm9sLCBEaXJlY3RpdmVLaW5kLkVWRU5UKTtcbiAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0KSB7IGF0dHJpYnV0ZVZhbHVlU3ltYm9sKGFzdC52YWx1ZSk7IH0sXG4gICAgICAgICAgdmlzaXRBdHRyKGFzdCkge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguaGVhZDtcbiAgICAgICAgICAgIGlmICghZWxlbWVudCB8fCAhKGVsZW1lbnQgaW5zdGFuY2VvZiBFbGVtZW50QXN0KSkgcmV0dXJuO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbWFwcGluZyBvZiBhbGwgZGlyZWN0aXZlcyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50IGZyb20gdGhlaXIgc2VsZWN0b3JzLlxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlQXN0PigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgZWxlbWVudC5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICAgIGlmICghZGlyLmRpcmVjdGl2ZS5zZWxlY3RvcikgY29udGludWU7XG4gICAgICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLmRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlZSBpZiB0aGlzIGF0dHJpYnV0ZSBtYXRjaGVzIHRoZSBzZWxlY3RvciBvZiBhbnkgZGlyZWN0aXZlIG9uIHRoZSBlbGVtZW50LlxuICAgICAgICAgICAgLy8gVE9ETyhheWF6aGFmaXopOiBDb25zaWRlciBjYWNoaW5nIHNlbGVjdG9yIG1hdGNoZXMgKGF0IHRoZSBleHBlbnNlIG9mIHBvdGVudGlhbGx5XG4gICAgICAgICAgICAvLyB2ZXJ5IGhpZ2ggbWVtb3J5IHVzYWdlKS5cbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNlbGVjdG9yID0gYFske2FzdC5uYW1lfT0ke2FzdC52YWx1ZX1dYDtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZEF0dHJpYnV0ZSA9IENzc1NlbGVjdG9yLnBhcnNlKGF0dHJpYnV0ZVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICghcGFyc2VkQXR0cmlidXRlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICAgICAgbWF0Y2hlci5tYXRjaChwYXJzZWRBdHRyaWJ1dGVbMF0sIChfLCBkaXJlY3RpdmUpID0+IHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGRpcmVjdGl2ZS5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgICBzeW1ib2wgPSBzeW1ib2wgJiYgbmV3IE92ZXJyaWRlS2luZFN5bWJvbChzeW1ib2wsIERpcmVjdGl2ZUtpbmQuRElSRUNUSVZFKTtcbiAgICAgICAgICAgICAgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEJvdW5kVGV4dChhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb25Qb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgICAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgICAgICAgICAgICBjb25zdCBzY29wZSA9IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCwgLyogaW5jbHVkZUV2ZW50ICovIGZhbHNlKTtcbiAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID1cbiAgICAgICAgICAgICAgICAgIGdldEV4cHJlc3Npb25TeW1ib2woc2NvcGUsIGFzdC52YWx1ZSwgdGVtcGxhdGVQb3NpdGlvbiwgaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSByZXN1bHQuc3ltYm9sO1xuICAgICAgICAgICAgICAgIHNwYW4gPSBvZmZzZXRTcGFuKHJlc3VsdC5zcGFuLCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFRleHQoYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdERpcmVjdGl2ZShhc3QpIHtcbiAgICAgICAgICAgIGNvbXBpbGVUeXBlU3VtbWFyeSA9IGFzdC5kaXJlY3RpdmU7XG4gICAgICAgICAgICBzeW1ib2wgPSBpbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFR5cGVTeW1ib2woY29tcGlsZVR5cGVTdW1tYXJ5LnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0KSB7XG4gICAgICAgICAgICBpZiAoIWF0dHJpYnV0ZVZhbHVlU3ltYm9sKGFzdC52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgc3ltYm9sID0gZmluZElucHV0QmluZGluZyhpbmZvLCBwYXRoLCBhc3QpO1xuICAgICAgICAgICAgICBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgICBpZiAoc3ltYm9sICYmIHNwYW4pIHtcbiAgICAgIHJldHVybiB7c3ltYm9sLCBzcGFuOiBvZmZzZXRTcGFuKHNwYW4sIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydCksIGNvbXBpbGVUeXBlU3VtbWFyeX07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRBdHRyaWJ1dGUoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogQXR0cmlidXRlfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGZpbmROb2RlKGluZm8uaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIHJldHVybiBwYXRoLmZpcnN0KEF0dHJpYnV0ZSk7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbnB1dEJpbmRpbmcoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGJpbmRpbmc6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudEFzdCk7XG4gIGlmIChlbGVtZW50KSB7XG4gICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZWxlbWVudC5kaXJlY3RpdmVzKSB7XG4gICAgICBjb25zdCBpbnZlcnRlZElucHV0ID0gaW52ZXJ0TWFwKGRpcmVjdGl2ZS5kaXJlY3RpdmUuaW5wdXRzKTtcbiAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGludmVydGVkSW5wdXRbYmluZGluZy50ZW1wbGF0ZU5hbWVdO1xuICAgICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IGluZm8udGVtcGxhdGUucXVlcnkuZ2V0VHlwZVN5bWJvbChkaXJlY3RpdmUuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sLm1lbWJlcnMoKS5nZXQoZmllbGROYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kT3V0cHV0QmluZGluZyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgYmluZGluZzogQm91bmRFdmVudEFzdCk6IFN5bWJvbHxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBlbGVtZW50ID0gcGF0aC5maXJzdChFbGVtZW50QXN0KTtcbiAgaWYgKGVsZW1lbnQpIHtcbiAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBlbGVtZW50LmRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGludmVydGVkT3V0cHV0cyA9IGludmVydE1hcChkaXJlY3RpdmUuZGlyZWN0aXZlLm91dHB1dHMpO1xuICAgICAgY29uc3QgZmllbGROYW1lID0gaW52ZXJ0ZWRPdXRwdXRzW2JpbmRpbmcubmFtZV07XG4gICAgICBpZiAoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUeXBlU3ltYm9sKGRpcmVjdGl2ZS5kaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICByZXR1cm4gY2xhc3NTeW1ib2wubWVtYmVycygpLmdldChmaWVsZE5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGludmVydE1hcChvYmo6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSk6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGNvbnN0IHJlc3VsdDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhvYmopKSB7XG4gICAgY29uc3QgdiA9IG9ialtuYW1lXTtcbiAgICByZXN1bHRbdl0gPSBuYW1lO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogV3JhcCBhIHN5bWJvbCBhbmQgY2hhbmdlIGl0cyBraW5kIHRvIGNvbXBvbmVudC5cbiAqL1xuY2xhc3MgT3ZlcnJpZGVLaW5kU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERpcmVjdGl2ZUtpbmQ7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3ltOiBTeW1ib2wsIGtpbmRPdmVycmlkZTogRGlyZWN0aXZlS2luZCkgeyB0aGlzLmtpbmQgPSBraW5kT3ZlcnJpZGU7IH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW0ubmFtZTsgfVxuXG4gIGdldCBsYW5ndWFnZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW0ubGFuZ3VhZ2U7IH1cblxuICBnZXQgdHlwZSgpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuc3ltLnR5cGU7IH1cblxuICBnZXQgY29udGFpbmVyKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5zeW0uY29udGFpbmVyOyB9XG5cbiAgZ2V0IHB1YmxpYygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLnB1YmxpYzsgfVxuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuc3ltLmNhbGxhYmxlOyB9XG5cbiAgZ2V0IG51bGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5zeW0ubnVsbGFibGU7IH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHsgcmV0dXJuIHRoaXMuc3ltLmRlZmluaXRpb247IH1cblxuICBtZW1iZXJzKCkgeyByZXR1cm4gdGhpcy5zeW0ubWVtYmVycygpOyB9XG5cbiAgc2lnbmF0dXJlcygpIHsgcmV0dXJuIHRoaXMuc3ltLnNpZ25hdHVyZXMoKTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pIHsgcmV0dXJuIHRoaXMuc3ltLnNlbGVjdFNpZ25hdHVyZSh0eXBlcyk7IH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpIHsgcmV0dXJuIHRoaXMuc3ltLmluZGV4ZWQoYXJndW1lbnQpOyB9XG59XG4iXX0=