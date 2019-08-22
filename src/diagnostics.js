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
     * @param ast contains HTML and template AST
     */
    function getTemplateDiagnostics(ast) {
        var results = [];
        var parseErrors = ast.parseErrors, templateAst = ast.templateAst, htmlAst = ast.htmlAst, template = ast.template;
        if (parseErrors) {
            results.push.apply(results, tslib_1.__spread(parseErrors.map(function (e) {
                return {
                    kind: ng.DiagnosticKind.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            })));
        }
        var expressionDiagnostics = language_services_1.getTemplateExpressionDiagnostics({
            templateAst: templateAst,
            htmlAst: htmlAst,
            offset: template.span.start,
            query: template.query,
            members: template.members,
        });
        results.push.apply(results, tslib_1.__spread(expressionDiagnostics));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBNkY7SUFDN0YsK0JBQWlDO0lBR2pDLHdEQUE4QjtJQUM5Qiw2REFBMkM7SUFFM0M7OztPQUdHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsR0FBYztRQUNuRCxJQUFNLE9BQU8sR0FBb0IsRUFBRSxDQUFDO1FBQzdCLElBQUEsNkJBQVcsRUFBRSw2QkFBVyxFQUFFLHFCQUFPLEVBQUUsdUJBQVEsQ0FBUTtRQUMxRCxJQUFJLFdBQVcsRUFBRTtZQUNmLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztnQkFDL0IsT0FBTztvQkFDTCxJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLO29CQUM3QixJQUFJLEVBQUUsa0JBQVUsQ0FBQyxjQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUNyRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUc7aUJBQ2YsQ0FBQztZQUNKLENBQUMsQ0FBQyxHQUFFO1NBQ0w7UUFDRCxJQUFNLHFCQUFxQixHQUFHLG9EQUFnQyxDQUFDO1lBQzdELFdBQVcsRUFBRSxXQUFXO1lBQ3hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztTQUMxQixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMscUJBQXFCLEdB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QUUsQ0FBQztZQUNQLE1BQU0sRUFBRSxJQUFJO1NBQ2IsQ0FBQztJQUNKLENBQUM7SUFYRCxnRUFXQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLFlBQVksQ0FBMkIsUUFBYTs7UUFDbEUsSUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO1FBQ3ZCLElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDOztZQUMzQyxLQUFzQixJQUFBLGFBQUEsaUJBQUEsUUFBUSxDQUFBLGtDQUFBLHdEQUFFO2dCQUEzQixJQUFNLE9BQU8scUJBQUE7Z0JBQ1QsSUFBQSxtQkFBSSxDQUFZO2dCQUN2QixJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDUixHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUMxQjtnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN0QjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBaEJELG9DQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ0FuYWx5emVkTW9kdWxlc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtvZmZzZXRTcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIFJldHVybiBkaWFnbm9zdGljIGluZm9ybWF0aW9uIGZvciB0aGUgcGFyc2VkIEFTVCBvZiB0aGUgdGVtcGxhdGUuXG4gKiBAcGFyYW0gYXN0IGNvbnRhaW5zIEhUTUwgYW5kIHRlbXBsYXRlIEFTVFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhhc3Q6IEFzdFJlc3VsdCk6IG5nLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuICBjb25zdCB7cGFyc2VFcnJvcnMsIHRlbXBsYXRlQXN0LCBodG1sQXN0LCB0ZW1wbGF0ZX0gPSBhc3Q7XG4gIGlmIChwYXJzZUVycm9ycykge1xuICAgIHJlc3VsdHMucHVzaCguLi5wYXJzZUVycm9ycy5tYXAoZSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgc3Bhbjogb2Zmc2V0U3BhbihzcGFuT2YoZS5zcGFuKSwgdGVtcGxhdGUuc3Bhbi5zdGFydCksXG4gICAgICAgIG1lc3NhZ2U6IGUubXNnLFxuICAgICAgfTtcbiAgICB9KSk7XG4gIH1cbiAgY29uc3QgZXhwcmVzc2lvbkRpYWdub3N0aWNzID0gZ2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3Moe1xuICAgIHRlbXBsYXRlQXN0OiB0ZW1wbGF0ZUFzdCxcbiAgICBodG1sQXN0OiBodG1sQXN0LFxuICAgIG9mZnNldDogdGVtcGxhdGUuc3Bhbi5zdGFydCxcbiAgICBxdWVyeTogdGVtcGxhdGUucXVlcnksXG4gICAgbWVtYmVyczogdGVtcGxhdGUubWVtYmVycyxcbiAgfSk7XG4gIHJlc3VsdHMucHVzaCguLi5leHByZXNzaW9uRGlhZ25vc3RpY3MpO1xuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBlcnJvciBtZXNzYWdlIHRoYXQgaW5kaWNhdGVzIGEgZGlyZWN0aXZlIGlzIG5vdCBwYXJ0IG9mIGFueVxuICogTmdNb2R1bGUuXG4gKiBAcGFyYW0gbmFtZSBjbGFzcyBuYW1lXG4gKiBAcGFyYW0gaXNDb21wb25lbnQgdHJ1ZSBpZiBkaXJlY3RpdmUgaXMgYW4gQW5ndWxhciBDb21wb25lbnRcbiAqL1xuZnVuY3Rpb24gbWlzc2luZ0RpcmVjdGl2ZShuYW1lOiBzdHJpbmcsIGlzQ29tcG9uZW50OiBib29sZWFuKSB7XG4gIGNvbnN0IHR5cGUgPSBpc0NvbXBvbmVudCA/ICdDb21wb25lbnQnIDogJ0RpcmVjdGl2ZSc7XG4gIHJldHVybiBgJHt0eXBlfSAnJHtuYW1lfScgaXMgbm90IGluY2x1ZGVkIGluIGEgbW9kdWxlIGFuZCB3aWxsIG5vdCBiZSBgICtcbiAgICAgICdhdmFpbGFibGUgaW5zaWRlIGEgdGVtcGxhdGUuIENvbnNpZGVyIGFkZGluZyBpdCB0byBhIE5nTW9kdWxlIGRlY2xhcmF0aW9uLic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKFxuICAgIGRlY2xhcmF0aW9uczogbmcuRGVjbGFyYXRpb25bXSwgbW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiBuZy5EaWFnbm9zdGljW10ge1xuICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IFNldDxuZy5TdGF0aWNTeW1ib2w+KCk7XG4gIGZvciAoY29uc3QgbmdNb2R1bGUgb2YgbW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBuZ01vZHVsZS5kZWNsYXJlZERpcmVjdGl2ZXMpIHtcbiAgICAgIGRpcmVjdGl2ZXMuYWRkKGRpcmVjdGl2ZS5yZWZlcmVuY2UpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZGVjbGFyYXRpb24gb2YgZGVjbGFyYXRpb25zKSB7XG4gICAgY29uc3Qge2Vycm9ycywgbWV0YWRhdGEsIHR5cGUsIGRlY2xhcmF0aW9uU3Bhbn0gPSBkZWNsYXJhdGlvbjtcbiAgICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHNwYW46IGVycm9yLnNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKCFtZXRhZGF0YSkge1xuICAgICAgY29udGludWU7ICAvLyBkZWNsYXJhdGlvbiBpcyBub3QgYW4gQW5ndWxhciBkaXJlY3RpdmVcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICBpZiAoIW1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7dGVtcGxhdGUsIHRlbXBsYXRlVXJsfSA9IG1ldGFkYXRhLnRlbXBsYXRlICE7XG4gICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwgJiYgIXRlbXBsYXRlVXJsKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHt0eXBlLm5hbWV9JyBtdXN0IGhhdmUgYSB0ZW1wbGF0ZSBvciB0ZW1wbGF0ZVVybGAsXG4gICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGUgJiYgdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3Qgbm90IGhhdmUgYm90aCB0ZW1wbGF0ZSBhbmQgdGVtcGxhdGVVcmxgLFxuICAgICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghZGlyZWN0aXZlcy5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSByZWN1cnNpdmUgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBjaGFpbnMgZGlhZ25vc3RpYyBtZXNzYWdlcy5cbiAqIEBwYXJhbSBjaGFpblxuICovXG5mdW5jdGlvbiBjaGFpbkRpYWdub3N0aWNzKGNoYWluOiBuZy5EaWFnbm9zdGljTWVzc2FnZUNoYWluKTogdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIG5leHQ6IGNoYWluLm5leHQgPyBjaGFpbkRpYWdub3N0aWNzKGNoYWluLm5leHQpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBuZy5EaWFnbm9zdGljIHRvIHRzLkRpYWdub3N0aWMuXG4gKiBAcGFyYW0gZCBkaWFnbm9zdGljXG4gKiBAcGFyYW0gZmlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gbmdEaWFnbm9zdGljVG9Uc0RpYWdub3N0aWMoXG4gICAgZDogbmcuRGlhZ25vc3RpYywgZmlsZTogdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZCk6IHRzLkRpYWdub3N0aWMge1xuICByZXR1cm4ge1xuICAgIGZpbGUsXG4gICAgc3RhcnQ6IGQuc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IGQuc3Bhbi5lbmQgLSBkLnNwYW4uc3RhcnQsXG4gICAgbWVzc2FnZVRleHQ6IHR5cGVvZiBkLm1lc3NhZ2UgPT09ICdzdHJpbmcnID8gZC5tZXNzYWdlIDogY2hhaW5EaWFnbm9zdGljcyhkLm1lc3NhZ2UpLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBzb3VyY2U6ICduZycsXG4gIH07XG59XG5cbi8qKlxuICogUmV0dXJuIGVsZW1lbnRzIGZpbHRlcmVkIGJ5IHVuaXF1ZSBzcGFuLlxuICogQHBhcmFtIGVsZW1lbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWVCeVNwYW48VCBleHRlbmRze3NwYW46IG5nLlNwYW59PihlbGVtZW50czogVFtdKTogVFtdIHtcbiAgY29uc3QgcmVzdWx0OiBUW10gPSBbXTtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICBjb25zdCB7c3Bhbn0gPSBlbGVtZW50O1xuICAgIGxldCBzZXQgPSBtYXAuZ2V0KHNwYW4uc3RhcnQpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICBzZXQgPSBuZXcgU2V0KCk7XG4gICAgICBtYXAuc2V0KHNwYW4uc3RhcnQsIHNldCk7XG4gICAgfVxuICAgIGlmICghc2V0LmhhcyhzcGFuLmVuZCkpIHtcbiAgICAgIHNldC5hZGQoc3Bhbi5lbmQpO1xuICAgICAgcmVzdWx0LnB1c2goZWxlbWVudCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iXX0=