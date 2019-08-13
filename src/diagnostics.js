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
        define("@angular/language-service/src/diagnostics", ["require", "exports", "tslib", "@angular/compiler-cli/src/language_services", "typescript", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var ts = require("typescript");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    function getTemplateDiagnostics(template, ast) {
        var results = [];
        if (ast.parseErrors && ast.parseErrors.length) {
            results.push.apply(results, tslib_1.__spread(ast.parseErrors.map(function (e) {
                return {
                    kind: types_1.DiagnosticKind.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            })));
        }
        else if (ast.templateAst && ast.htmlAst) {
            var info = {
                templateAst: ast.templateAst,
                htmlAst: ast.htmlAst,
                offset: template.span.start,
                query: template.query,
                members: template.members,
            };
            var expressionDiagnostics = language_services_1.getTemplateExpressionDiagnostics(info);
            results.push.apply(results, tslib_1.__spread(expressionDiagnostics));
        }
        if (ast.errors) {
            results.push.apply(results, tslib_1.__spread(ast.errors.map(function (e) {
                return {
                    kind: e.kind,
                    span: e.span || template.span,
                    message: e.message,
                };
            })));
        }
        return results;
    }
    exports.getTemplateDiagnostics = getTemplateDiagnostics;
    function getDeclarationDiagnostics(declarations, modules) {
        var e_1, _a;
        var results = [];
        var directives = undefined;
        var _loop_1 = function (declaration) {
            var e_2, _a;
            var report = function (message, span) {
                results.push({
                    kind: types_1.DiagnosticKind.Error,
                    span: span || declaration.declarationSpan, message: message
                });
            };
            try {
                for (var _b = (e_2 = void 0, tslib_1.__values(declaration.errors)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var error = _c.value;
                    report(error.message, error.span);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (declaration.metadata) {
                if (declaration.metadata.isComponent) {
                    if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                        report("Component '" + declaration.type.name + "' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration");
                    }
                    var _d = declaration.metadata.template, template = _d.template, templateUrl = _d.templateUrl;
                    if (template === null && !templateUrl) {
                        report("Component '" + declaration.type.name + "' must have a template or templateUrl");
                    }
                    else if (template && templateUrl) {
                        report("Component '" + declaration.type.name + "' must not have both template and templateUrl");
                    }
                }
                else {
                    if (!directives) {
                        directives = new Set();
                        modules.ngModules.forEach(function (module) {
                            module.declaredDirectives.forEach(function (directive) { directives.add(directive.reference); });
                        });
                    }
                    if (!directives.has(declaration.type)) {
                        report("Directive '" + declaration.type.name + "' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration");
                    }
                }
            }
        };
        try {
            for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var declaration = declarations_1_1.value;
                _loop_1(declaration);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_a = declarations_1.return)) _a.call(declarations_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return results;
    }
    exports.getDeclarationDiagnostics = getDeclarationDiagnostics;
    function diagnosticChainToDiagnosticChain(chain) {
        return {
            messageText: chain.message,
            category: ts.DiagnosticCategory.Error,
            code: 0,
            next: chain.next ? diagnosticChainToDiagnosticChain(chain.next) : undefined
        };
    }
    function diagnosticMessageToDiagnosticMessageText(message) {
        if (typeof message === 'string') {
            return message;
        }
        return diagnosticChainToDiagnosticChain(message);
    }
    function ngDiagnosticToTsDiagnostic(d, file) {
        return {
            file: file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: diagnosticMessageToDiagnosticMessageText(d.message),
            category: ts.DiagnosticCategory.Error,
            code: 0,
            source: 'ng',
        };
    }
    exports.ngDiagnosticToTsDiagnostic = ngDiagnosticToTsDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBcUg7SUFDckgsK0JBQWlDO0lBR2pDLDZEQUE0SDtJQUM1SCw2REFBMkM7SUFNM0MsU0FBZ0Isc0JBQXNCLENBQUMsUUFBd0IsRUFBRSxHQUFjO1FBQzdFLElBQU0sT0FBTyxHQUFnQixFQUFFLENBQUM7UUFFaEMsSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQzdDLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBYSxVQUFBLENBQUM7Z0JBQy9DLE9BQU87b0JBQ0wsSUFBSSxFQUFFLHNCQUFjLENBQUMsS0FBSztvQkFDMUIsSUFBSSxFQUFFLGtCQUFVLENBQUMsY0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDckQsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHO2lCQUNmLENBQUM7WUFDSixDQUFDLENBQUMsR0FBRTtTQUNMO2FBQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUU7WUFDekMsSUFBTSxJQUFJLEdBQTJCO2dCQUNuQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVc7Z0JBQzVCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztnQkFDcEIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztnQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNyQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87YUFDMUIsQ0FBQztZ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KiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdBbmFseXplZE1vZHVsZXMsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7RGVjbGFyYXRpb25zLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljS2luZCwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgRGlhZ25vc3RpY3MsIFNwYW4sIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7b2Zmc2V0U3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBBc3RQcm92aWRlciB7XG4gIGdldFRlbXBsYXRlQXN0KHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZSwgZmlsZU5hbWU6IHN0cmluZyk6IEFzdFJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRGlhZ25vc3RpY3ModGVtcGxhdGU6IFRlbXBsYXRlU291cmNlLCBhc3Q6IEFzdFJlc3VsdCk6IERpYWdub3N0aWNzIHtcbiAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY3MgPSBbXTtcblxuICBpZiAoYXN0LnBhcnNlRXJyb3JzICYmIGFzdC5wYXJzZUVycm9ycy5sZW5ndGgpIHtcbiAgICByZXN1bHRzLnB1c2goLi4uYXN0LnBhcnNlRXJyb3JzLm1hcDxEaWFnbm9zdGljPihlID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IERpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBzcGFuOiBvZmZzZXRTcGFuKHNwYW5PZihlLnNwYW4pLCB0ZW1wbGF0ZS5zcGFuLnN0YXJ0KSxcbiAgICAgICAgbWVzc2FnZTogZS5tc2csXG4gICAgICB9O1xuICAgIH0pKTtcbiAgfSBlbHNlIGlmIChhc3QudGVtcGxhdGVBc3QgJiYgYXN0Lmh0bWxBc3QpIHtcbiAgICBjb25zdCBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvID0ge1xuICAgICAgdGVtcGxhdGVBc3Q6IGFzdC50ZW1wbGF0ZUFzdCxcbiAgICAgIGh0bWxBc3Q6IGFzdC5odG1sQXN0LFxuICAgICAgb2Zmc2V0OiB0ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgICAgcXVlcnk6IHRlbXBsYXRlLnF1ZXJ5LFxuICAgICAgbWVtYmVyczogdGVtcGxhdGUubWVtYmVycyxcbiAgICB9O1xuICAgIGNvbnN0IGV4cHJlc3Npb25EaWFnbm9zdGljcyA9IGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzKGluZm8pO1xuICAgIHJlc3VsdHMucHVzaCguLi5leHByZXNzaW9uRGlhZ25vc3RpY3MpO1xuICB9XG4gIGlmIChhc3QuZXJyb3JzKSB7XG4gICAgcmVzdWx0cy5wdXNoKC4uLmFzdC5lcnJvcnMubWFwPERpYWdub3N0aWM+KGUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogZS5raW5kLFxuICAgICAgICBzcGFuOiBlLnNwYW4gfHwgdGVtcGxhdGUuc3BhbixcbiAgICAgICAgbWVzc2FnZTogZS5tZXNzYWdlLFxuICAgICAgfTtcbiAgICB9KSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoXG4gICAgZGVjbGFyYXRpb25zOiBEZWNsYXJhdGlvbnMsIG1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogRGlhZ25vc3RpY3Mge1xuICBjb25zdCByZXN1bHRzOiBEaWFnbm9zdGljcyA9IFtdO1xuXG4gIGxldCBkaXJlY3RpdmVzOiBTZXQ8U3RhdGljU3ltYm9sPnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGZvciAoY29uc3QgZGVjbGFyYXRpb24gb2YgZGVjbGFyYXRpb25zKSB7XG4gICAgY29uc3QgcmVwb3J0ID0gKG1lc3NhZ2U6IHN0cmluZyB8IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIHNwYW4/OiBTcGFuKSA9PiB7XG4gICAgICByZXN1bHRzLnB1c2goPERpYWdub3N0aWM+e1xuICAgICAgICBraW5kOiBEaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgc3Bhbjogc3BhbiB8fCBkZWNsYXJhdGlvbi5kZWNsYXJhdGlvblNwYW4sIG1lc3NhZ2VcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZm9yIChjb25zdCBlcnJvciBvZiBkZWNsYXJhdGlvbi5lcnJvcnMpIHtcbiAgICAgIHJlcG9ydChlcnJvci5tZXNzYWdlLCBlcnJvci5zcGFuKTtcbiAgICB9XG4gICAgaWYgKGRlY2xhcmF0aW9uLm1ldGFkYXRhKSB7XG4gICAgICBpZiAoZGVjbGFyYXRpb24ubWV0YWRhdGEuaXNDb21wb25lbnQpIHtcbiAgICAgICAgaWYgKCFtb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuaGFzKGRlY2xhcmF0aW9uLnR5cGUpKSB7XG4gICAgICAgICAgcmVwb3J0KFxuICAgICAgICAgICAgICBgQ29tcG9uZW50ICcke2RlY2xhcmF0aW9uLnR5cGUubmFtZX0nIGlzIG5vdCBpbmNsdWRlZCBpbiBhIG1vZHVsZSBhbmQgd2lsbCBub3QgYmUgYXZhaWxhYmxlIGluc2lkZSBhIHRlbXBsYXRlLiBDb25zaWRlciBhZGRpbmcgaXQgdG8gYSBOZ01vZHVsZSBkZWNsYXJhdGlvbmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHt0ZW1wbGF0ZSwgdGVtcGxhdGVVcmx9ID0gZGVjbGFyYXRpb24ubWV0YWRhdGEudGVtcGxhdGUgITtcbiAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsICYmICF0ZW1wbGF0ZVVybCkge1xuICAgICAgICAgIHJlcG9ydChgQ29tcG9uZW50ICcke2RlY2xhcmF0aW9uLnR5cGUubmFtZX0nIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUgJiYgdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICByZXBvcnQoXG4gICAgICAgICAgICAgIGBDb21wb25lbnQgJyR7ZGVjbGFyYXRpb24udHlwZS5uYW1lfScgbXVzdCBub3QgaGF2ZSBib3RoIHRlbXBsYXRlIGFuZCB0ZW1wbGF0ZVVybGApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIWRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICBkaXJlY3RpdmVzID0gbmV3IFNldCgpO1xuICAgICAgICAgIG1vZHVsZXMubmdNb2R1bGVzLmZvckVhY2gobW9kdWxlID0+IHtcbiAgICAgICAgICAgIG1vZHVsZS5kZWNsYXJlZERpcmVjdGl2ZXMuZm9yRWFjaChcbiAgICAgICAgICAgICAgICBkaXJlY3RpdmUgPT4geyBkaXJlY3RpdmVzICEuYWRkKGRpcmVjdGl2ZS5yZWZlcmVuY2UpOyB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRpcmVjdGl2ZXMuaGFzKGRlY2xhcmF0aW9uLnR5cGUpKSB7XG4gICAgICAgICAgcmVwb3J0KFxuICAgICAgICAgICAgICBgRGlyZWN0aXZlICcke2RlY2xhcmF0aW9uLnR5cGUubmFtZX0nIGlzIG5vdCBpbmNsdWRlZCBpbiBhIG1vZHVsZSBhbmQgd2lsbCBub3QgYmUgYXZhaWxhYmxlIGluc2lkZSBhIHRlbXBsYXRlLiBDb25zaWRlciBhZGRpbmcgaXQgdG8gYSBOZ01vZHVsZSBkZWNsYXJhdGlvbmApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluOiBEaWFnbm9zdGljTWVzc2FnZUNoYWluKTpcbiAgICB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlVGV4dDogY2hhaW4ubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgbmV4dDogY2hhaW4ubmV4dCA/IGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluLm5leHQpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNNZXNzYWdlVG9EaWFnbm9zdGljTWVzc2FnZVRleHQobWVzc2FnZTogc3RyaW5nIHwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6IHN0cmluZ3xcbiAgICB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBtZXNzYWdlO1xuICB9XG4gIHJldHVybiBkaWFnbm9zdGljQ2hhaW5Ub0RpYWdub3N0aWNDaGFpbihtZXNzYWdlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKFxuICAgIGQ6IERpYWdub3N0aWMsIGZpbGU6IHRzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQpOiB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIHtcbiAgICBmaWxlLFxuICAgIHN0YXJ0OiBkLnNwYW4uc3RhcnQsXG4gICAgbGVuZ3RoOiBkLnNwYW4uZW5kIC0gZC5zcGFuLnN0YXJ0LFxuICAgIG1lc3NhZ2VUZXh0OiBkaWFnbm9zdGljTWVzc2FnZVRvRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGQubWVzc2FnZSksXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIHNvdXJjZTogJ25nJyxcbiAgfTtcbn1cbiJdfQ==