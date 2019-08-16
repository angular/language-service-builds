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
    var ng = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Return diagnostic information for the parsed AST of the template.
     * @param template source of the template and class information
     * @param ast contains HTML and template AST
     */
    function getTemplateDiagnostics(template, ast) {
        var results = [];
        if (ast.parseErrors && ast.parseErrors.length) {
            results.push.apply(results, tslib_1.__spread(ast.parseErrors.map(function (e) {
                return {
                    kind: ng.DiagnosticKind.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            })));
        }
        else if (ast.templateAst && ast.htmlAst) {
            var expressionDiagnostics = language_services_1.getTemplateExpressionDiagnostics({
                templateAst: ast.templateAst,
                htmlAst: ast.htmlAst,
                offset: template.span.start,
                query: template.query,
                members: template.members,
            });
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
    /**
     * Generate an error message that indicates a directive is not part of any
     * NgModule.
     * @param name class name
     * @param isComponent true if directive is an Angular Component
     */
    function missingDirective(name, isComponent) {
        var type = isComponent ? 'Component' : 'Directive';
        return type + " '" + name + "' is not included in a module and will not be " +
            'available inside a template. Consider adding it to a NgModule declaration.';
    }
    function getDeclarationDiagnostics(declarations, modules) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        var directives = new Set();
        try {
            for (var _e = tslib_1.__values(modules.ngModules), _f = _e.next(); !_f.done; _f = _e.next()) {
                var ngModule = _f.value;
                try {
                    for (var _g = (e_2 = void 0, tslib_1.__values(ngModule.declaredDirectives)), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var directive = _h.value;
                        directives.add(directive.reference);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var results = [];
        try {
            for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var declaration = declarations_1_1.value;
                var errors = declaration.errors, metadata = declaration.metadata, type = declaration.type, declarationSpan = declaration.declarationSpan;
                try {
                    for (var errors_1 = (e_4 = void 0, tslib_1.__values(errors)), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
                        var error_1 = errors_1_1.value;
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: error_1.message,
                            span: error_1.span,
                        });
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (errors_1_1 && !errors_1_1.done && (_d = errors_1.return)) _d.call(errors_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                if (!metadata) {
                    continue; // declaration is not an Angular directive
                }
                if (metadata.isComponent) {
                    if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: missingDirective(type.name, metadata.isComponent),
                            span: declarationSpan,
                        });
                    }
                    var _j = metadata.template, template = _j.template, templateUrl = _j.templateUrl;
                    if (template === null && !templateUrl) {
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: "Component '" + type.name + "' must have a template or templateUrl",
                            span: declarationSpan,
                        });
                    }
                    else if (template && templateUrl) {
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: "Component '" + type.name + "' must not have both template and templateUrl",
                            span: declarationSpan,
                        });
                    }
                }
                else if (!directives.has(declaration.type)) {
                    results.push({
                        kind: ng.DiagnosticKind.Error,
                        message: missingDirective(type.name, metadata.isComponent),
                        span: declarationSpan,
                    });
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_c = declarations_1.return)) _c.call(declarations_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return results;
    }
    exports.getDeclarationDiagnostics = getDeclarationDiagnostics;
    /**
     * Return a recursive data structure that chains diagnostic messages.
     * @param chain
     */
    function chainDiagnostics(chain) {
        return {
            messageText: chain.message,
            category: ts.DiagnosticCategory.Error,
            code: 0,
            next: chain.next ? chainDiagnostics(chain.next) : undefined
        };
    }
    /**
     * Convert ng.Diagnostic to ts.Diagnostic.
     * @param d diagnostic
     * @param file
     */
    function ngDiagnosticToTsDiagnostic(d, file) {
        return {
            file: file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: typeof d.message === 'string' ? d.message : chainDiagnostics(d.message),
            category: ts.DiagnosticCategory.Error,
            code: 0,
            source: 'ng',
        };
    }
    exports.ngDiagnosticToTsDiagnostic = ngDiagnosticToTsDiagnostic;
    /**
     * Return elements filtered by unique span.
     * @param elements
     */
    function uniqueBySpan(elements) {
        var e_5, _a;
        var result = [];
        var map = new Map();
        try {
            for (var elements_1 = tslib_1.__values(elements), elements_1_1 = elements_1.next(); !elements_1_1.done; elements_1_1 = elements_1.next()) {
                var element = elements_1_1.value;
                var span = element.span;
                var set = map.get(span.start);
                if (!set) {
                    set = new Set();
                    map.set(span.start, set);
                }
                if (!set.has(span.end)) {
                    set.add(span.end);
                    result.push(element);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (elements_1_1 && !elements_1_1.done && (_a = elements_1.return)) _a.call(elements_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return result;
    }
    exports.uniqueBySpan = uniqueBySpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBNkY7SUFDN0YsK0JBQWlDO0lBR2pDLHdEQUE4QjtJQUM5Qiw2REFBMkM7SUFFM0M7Ozs7T0FJRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxRQUEyQixFQUFFLEdBQWM7UUFDN0MsSUFBTSxPQUFPLEdBQW9CLEVBQUUsQ0FBQztRQUVwQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDN0MsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztnQkFDbkMsT0FBTztvQkFDTCxJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLO29CQUM3QixJQUFJLEVBQUUsa0JBQVUsQ0FBQyxjQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUNyRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUc7aUJBQ2YsQ0FBQztZQUNKLENBQUMsQ0FBQyxHQUFFO1NBQ0w7YUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtZQUN6QyxJQUFNLHFCQUFxQixHQUFHLG9EQUFnQyxDQUFDO2dCQUM3RCxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVc7Z0JBQzVCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztnQkFDcEIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztnQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNyQixP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QUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3RCO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFoQkQsb0NBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQW5hbHl6ZWRNb2R1bGVzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge29mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmV0dXJuIGRpYWdub3N0aWMgaW5mb3JtYXRpb24gZm9yIHRoZSBwYXJzZWQgQVNUIG9mIHRoZSB0ZW1wbGF0ZS5cbiAqIEBwYXJhbSB0ZW1wbGF0ZSBzb3VyY2Ugb2YgdGhlIHRlbXBsYXRlIGFuZCBjbGFzcyBpbmZvcm1hdGlvblxuICogQHBhcmFtIGFzdCBjb250YWlucyBIVE1MIGFuZCB0ZW1wbGF0ZSBBU1RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoXG4gICAgdGVtcGxhdGU6IG5nLlRlbXBsYXRlU291cmNlLCBhc3Q6IEFzdFJlc3VsdCk6IG5nLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGlmIChhc3QucGFyc2VFcnJvcnMgJiYgYXN0LnBhcnNlRXJyb3JzLmxlbmd0aCkge1xuICAgIHJlc3VsdHMucHVzaCguLi5hc3QucGFyc2VFcnJvcnMubWFwKGUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIHNwYW46IG9mZnNldFNwYW4oc3Bhbk9mKGUuc3BhbiksIHRlbXBsYXRlLnNwYW4uc3RhcnQpLFxuICAgICAgICBtZXNzYWdlOiBlLm1zZyxcbiAgICAgIH07XG4gICAgfSkpO1xuICB9IGVsc2UgaWYgKGFzdC50ZW1wbGF0ZUFzdCAmJiBhc3QuaHRtbEFzdCkge1xuICAgIGNvbnN0IGV4cHJlc3Npb25EaWFnbm9zdGljcyA9IGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzKHtcbiAgICAgIHRlbXBsYXRlQXN0OiBhc3QudGVtcGxhdGVBc3QsXG4gICAgICBodG1sQXN0OiBhc3QuaHRtbEFzdCxcbiAgICAgIG9mZnNldDogdGVtcGxhdGUuc3Bhbi5zdGFydCxcbiAgICAgIHF1ZXJ5OiB0ZW1wbGF0ZS5xdWVyeSxcbiAgICAgIG1lbWJlcnM6IHRlbXBsYXRlLm1lbWJlcnMsXG4gICAgfSk7XG4gICAgcmVzdWx0cy5wdXNoKC4uLmV4cHJlc3Npb25EaWFnbm9zdGljcyk7XG4gIH1cbiAgaWYgKGFzdC5lcnJvcnMpIHtcbiAgICByZXN1bHRzLnB1c2goLi4uYXN0LmVycm9ycy5tYXAoZSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBlLmtpbmQsXG4gICAgICAgIHNwYW46IGUuc3BhbiB8fCB0ZW1wbGF0ZS5zcGFuLFxuICAgICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICB9O1xuICAgIH0pKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGVycm9yIG1lc3NhZ2UgdGhhdCBpbmRpY2F0ZXMgYSBkaXJlY3RpdmUgaXMgbm90IHBhcnQgb2YgYW55XG4gKiBOZ01vZHVsZS5cbiAqIEBwYXJhbSBuYW1lIGNsYXNzIG5hbWVcbiAqIEBwYXJhbSBpc0NvbXBvbmVudCB0cnVlIGlmIGRpcmVjdGl2ZSBpcyBhbiBBbmd1bGFyIENvbXBvbmVudFxuICovXG5mdW5jdGlvbiBtaXNzaW5nRGlyZWN0aXZlKG5hbWU6IHN0cmluZywgaXNDb21wb25lbnQ6IGJvb2xlYW4pIHtcbiAgY29uc3QgdHlwZSA9IGlzQ29tcG9uZW50ID8gJ0NvbXBvbmVudCcgOiAnRGlyZWN0aXZlJztcbiAgcmV0dXJuIGAke3R5cGV9ICcke25hbWV9JyBpcyBub3QgaW5jbHVkZWQgaW4gYSBtb2R1bGUgYW5kIHdpbGwgbm90IGJlIGAgK1xuICAgICAgJ2F2YWlsYWJsZSBpbnNpZGUgYSB0ZW1wbGF0ZS4gQ29uc2lkZXIgYWRkaW5nIGl0IHRvIGEgTmdNb2R1bGUgZGVjbGFyYXRpb24uJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoXG4gICAgZGVjbGFyYXRpb25zOiBuZy5EZWNsYXJhdGlvbltdLCBtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IG5nLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgU2V0PG5nLlN0YXRpY1N5bWJvbD4oKTtcbiAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgZGlyZWN0aXZlcy5hZGQoZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0czogbmcuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICBjb25zdCB7ZXJyb3JzLCBtZXRhZGF0YSwgdHlwZSwgZGVjbGFyYXRpb25TcGFufSA9IGRlY2xhcmF0aW9uO1xuICAgIGZvciAoY29uc3QgZXJyb3Igb2YgZXJyb3JzKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3BhbjogZXJyb3Iuc3BhbixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoIW1ldGFkYXRhKSB7XG4gICAgICBjb250aW51ZTsgIC8vIGRlY2xhcmF0aW9uIGlzIG5vdCBhbiBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgIH1cbiAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQpIHtcbiAgICAgIGlmICghbW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmhhcyhkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2U6IG1pc3NpbmdEaXJlY3RpdmUodHlwZS5uYW1lLCBtZXRhZGF0YS5pc0NvbXBvbmVudCksXG4gICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHt0ZW1wbGF0ZSwgdGVtcGxhdGVVcmx9ID0gbWV0YWRhdGEudGVtcGxhdGUgITtcbiAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCAmJiAhdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCxcbiAgICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZSAmJiB0ZW1wbGF0ZVVybCkge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7dHlwZS5uYW1lfScgbXVzdCBub3QgaGF2ZSBib3RoIHRlbXBsYXRlIGFuZCB0ZW1wbGF0ZVVybGAsXG4gICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFkaXJlY3RpdmVzLmhhcyhkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIG1lc3NhZ2U6IG1pc3NpbmdEaXJlY3RpdmUodHlwZS5uYW1lLCBtZXRhZGF0YS5pc0NvbXBvbmVudCksXG4gICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFJldHVybiBhIHJlY3Vyc2l2ZSBkYXRhIHN0cnVjdHVyZSB0aGF0IGNoYWlucyBkaWFnbm9zdGljIG1lc3NhZ2VzLlxuICogQHBhcmFtIGNoYWluXG4gKi9cbmZ1bmN0aW9uIGNoYWluRGlhZ25vc3RpY3MoY2hhaW46IG5nLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4pOiB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlVGV4dDogY2hhaW4ubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgbmV4dDogY2hhaW4ubmV4dCA/IGNoYWluRGlhZ25vc3RpY3MoY2hhaW4ubmV4dCkgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IG5nLkRpYWdub3N0aWMgdG8gdHMuRGlhZ25vc3RpYy5cbiAqIEBwYXJhbSBkIGRpYWdub3N0aWNcbiAqIEBwYXJhbSBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpYyhcbiAgICBkOiBuZy5EaWFnbm9zdGljLCBmaWxlOiB0cy5Tb3VyY2VGaWxlIHwgdW5kZWZpbmVkKTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiB7XG4gICAgZmlsZSxcbiAgICBzdGFydDogZC5zcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICBtZXNzYWdlVGV4dDogdHlwZW9mIGQubWVzc2FnZSA9PT0gJ3N0cmluZycgPyBkLm1lc3NhZ2UgOiBjaGFpbkRpYWdub3N0aWNzKGQubWVzc2FnZSksXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIHNvdXJjZTogJ25nJyxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gZWxlbWVudHMgZmlsdGVyZWQgYnkgdW5pcXVlIHNwYW4uXG4gKiBAcGFyYW0gZWxlbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZUJ5U3BhbjxUIGV4dGVuZHN7c3BhbjogbmcuU3Bhbn0+KGVsZW1lbnRzOiBUW10pOiBUW10ge1xuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgIGNvbnN0IHtzcGFufSA9IGVsZW1lbnQ7XG4gICAgbGV0IHNldCA9IG1hcC5nZXQoc3Bhbi5zdGFydCk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHNldCA9IG5ldyBTZXQoKTtcbiAgICAgIG1hcC5zZXQoc3Bhbi5zdGFydCwgc2V0KTtcbiAgICB9XG4gICAgaWYgKCFzZXQuaGFzKHNwYW4uZW5kKSkge1xuICAgICAgc2V0LmFkZChzcGFuLmVuZCk7XG4gICAgICByZXN1bHQucHVzaChlbGVtZW50KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==