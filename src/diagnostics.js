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
        define("@angular/language-service/src/diagnostics", ["require", "exports", "tslib", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    function getTemplateDiagnostics(fileName, astProvider, templates) {
        var results = [];
        var _loop_1 = function (template) {
            var ast = astProvider.getTemplateAst(template, fileName);
            if (ast) {
                if (ast.parseErrors && ast.parseErrors.length) {
                    results.push.apply(results, tslib_1.__spread(ast.parseErrors.map(function (e) { return ({
                        kind: types_1.DiagnosticKind.Error,
                        span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                        message: e.msg
                    }); })));
                }
                else if (ast.templateAst && ast.htmlAst) {
                    var info = {
                        templateAst: ast.templateAst,
                        htmlAst: ast.htmlAst,
                        offset: template.span.start,
                        query: template.query,
                        members: template.members
                    };
                    var expressionDiagnostics = language_services_1.getTemplateExpressionDiagnostics(info);
                    results.push.apply(results, tslib_1.__spread(expressionDiagnostics));
                }
                if (ast.errors) {
                    results.push.apply(results, tslib_1.__spread(ast.errors.map(function (e) { return ({ kind: e.kind, span: e.span || template.span, message: e.message }); })));
                }
            }
        };
        try {
            for (var templates_1 = tslib_1.__values(templates), templates_1_1 = templates_1.next(); !templates_1_1.done; templates_1_1 = templates_1.next()) {
                var template = templates_1_1.value;
                _loop_1(template);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (templates_1_1 && !templates_1_1.done && (_a = templates_1.return)) _a.call(templates_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return results;
        var e_1, _a;
    }
    exports.getTemplateDiagnostics = getTemplateDiagnostics;
    function getDeclarationDiagnostics(declarations, modules) {
        var results = [];
        var directives = undefined;
        var _loop_2 = function (declaration) {
            var report = function (message, span) {
                results.push({
                    kind: types_1.DiagnosticKind.Error,
                    span: span || declaration.declarationSpan, message: message
                });
            };
            try {
                for (var _a = tslib_1.__values(declaration.errors), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var error = _b.value;
                    report(error.message, error.span);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
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
            var e_2, _c;
        };
        try {
            for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var declaration = declarations_1_1.value;
                _loop_2(declaration);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_a = declarations_1.return)) _a.call(declarations_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return results;
        var e_3, _a;
    }
    exports.getDeclarationDiagnostics = getDeclarationDiagnostics;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBcUg7SUFHckgsNkRBQTRIO0lBQzVILDZEQUEyQztJQU0zQyxnQ0FDSSxRQUFnQixFQUFFLFdBQXdCLEVBQUUsU0FBMkI7UUFDekUsSUFBTSxPQUFPLEdBQWdCLEVBQUUsQ0FBQztnQ0FDckIsUUFBUTtZQUNqQixJQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7b0JBQzdDLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FDL0IsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDO3dCQUNKLElBQUksRUFBRSxzQkFBYyxDQUFDLEtBQUs7d0JBQzFCLElBQUksRUFBRSxrQkFBVSxDQUFDLGNBQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7d0JBQ3JELE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRztxQkFDZixDQUFDLEVBSkcsQ0FJSCxDQUFDLEdBQUU7aUJBQ1Y7cUJBQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUU7b0JBQ3pDLElBQU0sSUFBSSxHQUEyQjt3QkFDbkMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXO3dCQUM1QixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87d0JBQ3BCLE1BQU0sRUFBRSxRQUFRLENB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QUFDO3dCQUMvRCxDQUFDLENBQUMsQ0FBQztxQkFDSjtvQkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3JDLE1BQU0sQ0FDRixnQkFBYyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksNEhBQXlILENBQUMsQ0FBQztxQkFDbks7aUJBQ0Y7YUFDRjs7OztZQXBDSCxLQUEwQixJQUFBLGlCQUFBLGlCQUFBLFlBQVksQ0FBQSwwQ0FBQTtnQkFBakMsSUFBTSxXQUFXLHlCQUFBO3dCQUFYLFdBQVc7YUFxQ3JCOzs7Ozs7Ozs7UUFFRCxPQUFPLE9BQU8sQ0FBQzs7SUFDakIsQ0FBQztJQTdDRCw4REE2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdBbmFseXplZE1vZHVsZXMsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge0RlY2xhcmF0aW9ucywgRGlhZ25vc3RpYywgRGlhZ25vc3RpY0tpbmQsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIERpYWdub3N0aWNzLCBTcGFuLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge29mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN0UHJvdmlkZXIge1xuICBnZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UsIGZpbGVOYW1lOiBzdHJpbmcpOiBBc3RSZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKFxuICAgIGZpbGVOYW1lOiBzdHJpbmcsIGFzdFByb3ZpZGVyOiBBc3RQcm92aWRlciwgdGVtcGxhdGVzOiBUZW1wbGF0ZVNvdXJjZVtdKTogRGlhZ25vc3RpY3Mge1xuICBjb25zdCByZXN1bHRzOiBEaWFnbm9zdGljcyA9IFtdO1xuICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xuICAgIGNvbnN0IGFzdCA9IGFzdFByb3ZpZGVyLmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlLCBmaWxlTmFtZSk7XG4gICAgaWYgKGFzdCkge1xuICAgICAgaWYgKGFzdC5wYXJzZUVycm9ycyAmJiBhc3QucGFyc2VFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5hc3QucGFyc2VFcnJvcnMubWFwPERpYWdub3N0aWM+KFxuICAgICAgICAgICAgZSA9PiAoe1xuICAgICAgICAgICAgICBraW5kOiBEaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICAgICAgc3Bhbjogb2Zmc2V0U3BhbihzcGFuT2YoZS5zcGFuKSwgdGVtcGxhdGUuc3Bhbi5zdGFydCksXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGUubXNnXG4gICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIGlmIChhc3QudGVtcGxhdGVBc3QgJiYgYXN0Lmh0bWxBc3QpIHtcbiAgICAgICAgY29uc3QgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyA9IHtcbiAgICAgICAgICB0ZW1wbGF0ZUFzdDogYXN0LnRlbXBsYXRlQXN0LFxuICAgICAgICAgIGh0bWxBc3Q6IGFzdC5odG1sQXN0LFxuICAgICAgICAgIG9mZnNldDogdGVtcGxhdGUuc3Bhbi5zdGFydCxcbiAgICAgICAgICBxdWVyeTogdGVtcGxhdGUucXVlcnksXG4gICAgICAgICAgbWVtYmVyczogdGVtcGxhdGUubWVtYmVyc1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBleHByZXNzaW9uRGlhZ25vc3RpY3MgPSBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljcyhpbmZvKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLmV4cHJlc3Npb25EaWFnbm9zdGljcyk7XG4gICAgICB9XG4gICAgICBpZiAoYXN0LmVycm9ycykge1xuICAgICAgICByZXN1bHRzLnB1c2goLi4uYXN0LmVycm9ycy5tYXA8RGlhZ25vc3RpYz4oXG4gICAgICAgICAgICBlID0+ICh7a2luZDogZS5raW5kLCBzcGFuOiBlLnNwYW4gfHwgdGVtcGxhdGUuc3BhbiwgbWVzc2FnZTogZS5tZXNzYWdlfSkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKFxuICAgIGRlY2xhcmF0aW9uczogRGVjbGFyYXRpb25zLCBtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IERpYWdub3N0aWNzIHtcbiAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY3MgPSBbXTtcblxuICBsZXQgZGlyZWN0aXZlczogU2V0PFN0YXRpY1N5bWJvbD58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IGRlY2xhcmF0aW9uIG9mIGRlY2xhcmF0aW9ucykge1xuICAgIGNvbnN0IHJlcG9ydCA9IChtZXNzYWdlOiBzdHJpbmcgfCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBzcGFuPzogU3BhbikgPT4ge1xuICAgICAgcmVzdWx0cy5wdXNoKDxEaWFnbm9zdGljPntcbiAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIHNwYW46IHNwYW4gfHwgZGVjbGFyYXRpb24uZGVjbGFyYXRpb25TcGFuLCBtZXNzYWdlXG4gICAgICB9KTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgZXJyb3Igb2YgZGVjbGFyYXRpb24uZXJyb3JzKSB7XG4gICAgICByZXBvcnQoZXJyb3IubWVzc2FnZSwgZXJyb3Iuc3Bhbik7XG4gICAgfVxuICAgIGlmIChkZWNsYXJhdGlvbi5tZXRhZGF0YSkge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm1ldGFkYXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICAgIGlmICghbW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmhhcyhkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgICAgIHJlcG9ydChcbiAgICAgICAgICAgICAgYENvbXBvbmVudCAnJHtkZWNsYXJhdGlvbi50eXBlLm5hbWV9JyBpcyBub3QgaW5jbHVkZWQgaW4gYSBtb2R1bGUgYW5kIHdpbGwgbm90IGJlIGF2YWlsYWJsZSBpbnNpZGUgYSB0ZW1wbGF0ZS4gQ29uc2lkZXIgYWRkaW5nIGl0IHRvIGEgTmdNb2R1bGUgZGVjbGFyYXRpb25gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7dGVtcGxhdGUsIHRlbXBsYXRlVXJsfSA9IGRlY2xhcmF0aW9uLm1ldGFkYXRhLnRlbXBsYXRlICE7XG4gICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCAmJiAhdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICByZXBvcnQoYENvbXBvbmVudCAnJHtkZWNsYXJhdGlvbi50eXBlLm5hbWV9JyBtdXN0IGhhdmUgYSB0ZW1wbGF0ZSBvciB0ZW1wbGF0ZVVybGApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlICYmIHRlbXBsYXRlVXJsKSB7XG4gICAgICAgICAgcmVwb3J0KFxuICAgICAgICAgICAgICBgQ29tcG9uZW50ICcke2RlY2xhcmF0aW9uLnR5cGUubmFtZX0nIG11c3Qgbm90IGhhdmUgYm90aCB0ZW1wbGF0ZSBhbmQgdGVtcGxhdGVVcmxgKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFkaXJlY3RpdmVzKSB7XG4gICAgICAgICAgZGlyZWN0aXZlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgICBtb2R1bGVzLm5nTW9kdWxlcy5mb3JFYWNoKG1vZHVsZSA9PiB7XG4gICAgICAgICAgICBtb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzLmZvckVhY2goXG4gICAgICAgICAgICAgICAgZGlyZWN0aXZlID0+IHsgZGlyZWN0aXZlcyAhLmFkZChkaXJlY3RpdmUucmVmZXJlbmNlKTsgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkaXJlY3RpdmVzLmhhcyhkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgICAgIHJlcG9ydChcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAnJHtkZWNsYXJhdGlvbi50eXBlLm5hbWV9JyBpcyBub3QgaW5jbHVkZWQgaW4gYSBtb2R1bGUgYW5kIHdpbGwgbm90IGJlIGF2YWlsYWJsZSBpbnNpZGUgYSB0ZW1wbGF0ZS4gQ29uc2lkZXIgYWRkaW5nIGl0IHRvIGEgTmdNb2R1bGUgZGVjbGFyYXRpb25gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIl19