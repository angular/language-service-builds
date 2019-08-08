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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var completions_1 = require("@angular/language-service/src/completions");
    var definitions_1 = require("@angular/language-service/src/definitions");
    var diagnostics_1 = require("@angular/language-service/src/diagnostics");
    var hover_1 = require("@angular/language-service/src/hover");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Create an instance of an Angular `LanguageService`.
     *
     * @publicApi
     */
    function createLanguageService(host) {
        return new LanguageServiceImpl(host);
    }
    exports.createLanguageService = createLanguageService;
    var LanguageServiceImpl = /** @class */ (function () {
        function LanguageServiceImpl(host) {
            this.host = host;
        }
        LanguageServiceImpl.prototype.getTemplateReferences = function () { return this.host.getTemplateReferences(); };
        LanguageServiceImpl.prototype.getDiagnostics = function (fileName) {
            var results = [];
            var templates = this.host.getTemplates(fileName);
            if (templates && templates.length) {
                results.push.apply(results, tslib_1.__spread(this.getTemplateDiagnostics(fileName, templates)));
            }
            var declarations = this.host.getDeclarations(fileName);
            if (declarations && declarations.length) {
                var summary = this.host.getAnalyzedModules();
                results.push.apply(results, tslib_1.__spread(diagnostics_1.getDeclarationDiagnostics(declarations, summary)));
            }
            return uniqueBySpan(results);
        };
        LanguageServiceImpl.prototype.getPipesAt = function (fileName, position) {
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return templateInfo.pipes;
            }
            return [];
        };
        LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return completions_1.getTemplateCompletions(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getDefinitionAt = function (fileName, position) {
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return definitions_1.getDefinitionAndBoundSpan(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getHoverAt = function (fileName, position) {
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return hover_1.getHover(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getTemplateDiagnostics = function (fileName, templates) {
            var e_1, _a;
            var results = [];
            var _loop_1 = function (template) {
                var ast = this_1.host.getTemplateAst(template, fileName);
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
            var this_1 = this;
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
        };
        return LanguageServiceImpl;
    }());
    function uniqueBySpan(elements) {
        var e_2, _a;
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (elements_1_1 && !elements_1_1.done && (_a = elements_1.return)) _a.call(elements_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsaUZBQXFIO0lBRXJILHlFQUFxRDtJQUNyRCx5RUFBd0Q7SUFDeEQseUVBQXdEO0lBQ3hELDZEQUFpQztJQUNqQyw2REFBeUo7SUFDekosNkRBQTJDO0lBSTNDOzs7O09BSUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUF5QjtRQUM3RCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHNEQUVDO0lBRUQ7UUFDRSw2QkFBb0IsSUFBeUI7WUFBekIsU0FBSSxHQUFKLElBQUksQ0FBcUI7UUFBRyxDQUFDO1FBRWpELG1EQUFxQixHQUFyQixjQUFvQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0UsNENBQWMsR0FBZCxVQUFlLFFBQWdCO1lBQzdCLElBQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7WUFDakMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkQsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDakMsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEdBQUU7YUFDbkU7WUFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6RCxJQUFJLFlBQVksSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFO2dCQUN2QyxJQUFN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QUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN0QjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVNZXRhZGF0YVJlc29sdmVyLCBDb21waWxlUGlwZVN1bW1hcnl9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7RGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgZ2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3N9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5pbXBvcnQge2dldFRlbXBsYXRlQ29tcGxldGlvbnN9IGZyb20gJy4vY29tcGxldGlvbnMnO1xuaW1wb3J0IHtnZXREZWZpbml0aW9uQW5kQm91bmRTcGFufSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7Z2V0RGVjbGFyYXRpb25EaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEhvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCB7Q29tcGxldGlvbiwgRGlhZ25vc3RpYywgRGlhZ25vc3RpY0tpbmQsIERpYWdub3N0aWNzLCBIb3ZlciwgTGFuZ3VhZ2VTZXJ2aWNlLCBMYW5ndWFnZVNlcnZpY2VIb3N0LCBMb2NhdGlvbiwgU3BhbiwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtvZmZzZXRTcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5cblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogTGFuZ3VhZ2VTZXJ2aWNlSG9zdCk6IExhbmd1YWdlU2VydmljZSB7XG4gIHJldHVybiBuZXcgTGFuZ3VhZ2VTZXJ2aWNlSW1wbChob3N0KTtcbn1cblxuY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlSW1wbCBpbXBsZW1lbnRzIExhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogTGFuZ3VhZ2VTZXJ2aWNlSG9zdCkge31cblxuICBnZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTogc3RyaW5nW10geyByZXR1cm4gdGhpcy5ob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpOyB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IERpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlcyhmaWxlTmFtZSk7XG4gICAgaWYgKHRlbXBsYXRlcyAmJiB0ZW1wbGF0ZXMubGVuZ3RoKSB7XG4gICAgICByZXN1bHRzLnB1c2goLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKGZpbGVOYW1lLCB0ZW1wbGF0ZXMpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zICYmIGRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7XG4gICAgICByZXN1bHRzLnB1c2goLi4uZ2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcyhkZWNsYXJhdGlvbnMsIHN1bW1hcnkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5pcXVlQnlTcGFuKHJlc3VsdHMpO1xuICB9XG5cbiAgZ2V0UGlwZXNBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogQ29tcGlsZVBpcGVTdW1tYXJ5W10ge1xuICAgIGxldCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIHRlbXBsYXRlSW5mby5waXBlcztcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogQ29tcGxldGlvbltdfHVuZGVmaW5lZCB7XG4gICAgbGV0IHRlbXBsYXRlSW5mbyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIGdldERlZmluaXRpb25BdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gICAgbGV0IHRlbXBsYXRlSW5mbyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3Bhbih0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIGdldEhvdmVyQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRIb3Zlcih0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nLCB0ZW1wbGF0ZXM6IFRlbXBsYXRlU291cmNlW10pOiBEaWFnbm9zdGljcyB7XG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xuICAgICAgY29uc3QgYXN0ID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlLCBmaWxlTmFtZSk7XG4gICAgICBpZiAoYXN0KSB7XG4gICAgICAgIGlmIChhc3QucGFyc2VFcnJvcnMgJiYgYXN0LnBhcnNlRXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5hc3QucGFyc2VFcnJvcnMubWFwPERpYWdub3N0aWM+KFxuICAgICAgICAgICAgICBlID0+ICh7XG4gICAgICAgICAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgICAgICAgc3Bhbjogb2Zmc2V0U3BhbihzcGFuT2YoZS5zcGFuKSwgdGVtcGxhdGUuc3Bhbi5zdGFydCksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZS5tc2dcbiAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChhc3QudGVtcGxhdGVBc3QgJiYgYXN0Lmh0bWxBc3QpIHtcbiAgICAgICAgICBjb25zdCBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvID0ge1xuICAgICAgICAgICAgdGVtcGxhdGVBc3Q6IGFzdC50ZW1wbGF0ZUFzdCxcbiAgICAgICAgICAgIGh0bWxBc3Q6IGFzdC5odG1sQXN0LFxuICAgICAgICAgICAgb2Zmc2V0OiB0ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgICAgICAgICAgcXVlcnk6IHRlbXBsYXRlLnF1ZXJ5LFxuICAgICAgICAgICAgbWVtYmVyczogdGVtcGxhdGUubWVtYmVyc1xuICAgICAgICAgIH07XG4gICAgICAgICAgY29uc3QgZXhwcmVzc2lvbkRpYWdub3N0aWNzID0gZ2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3MoaW5mbyk7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKC4uLmV4cHJlc3Npb25EaWFnbm9zdGljcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFzdC5lcnJvcnMpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goLi4uYXN0LmVycm9ycy5tYXA8RGlhZ25vc3RpYz4oXG4gICAgICAgICAgICAgIGUgPT4gKHtraW5kOiBlLmtpbmQsIHNwYW46IGUuc3BhbiB8fCB0ZW1wbGF0ZS5zcGFuLCBtZXNzYWdlOiBlLm1lc3NhZ2V9KSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZUJ5U3BhbjxUIGV4dGVuZHN7c3BhbjogU3Bhbn0+KGVsZW1lbnRzOiBUW10pOiBUW10ge1xuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgIGNvbnN0IHtzcGFufSA9IGVsZW1lbnQ7XG4gICAgbGV0IHNldCA9IG1hcC5nZXQoc3Bhbi5zdGFydCk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHNldCA9IG5ldyBTZXQoKTtcbiAgICAgIG1hcC5zZXQoc3Bhbi5zdGFydCwgc2V0KTtcbiAgICB9XG4gICAgaWYgKCFzZXQuaGFzKHNwYW4uZW5kKSkge1xuICAgICAgc2V0LmFkZChzcGFuLmVuZCk7XG4gICAgICByZXN1bHQucHVzaChlbGVtZW50KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==