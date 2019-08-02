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
        Object.defineProperty(LanguageServiceImpl.prototype, "metadataResolver", {
            get: function () { return this.host.resolver; },
            enumerable: true,
            configurable: true
        });
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
                return definitions_1.getDefinition(templateInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsaUZBQXFIO0lBRXJILHlFQUFxRDtJQUNyRCx5RUFBNEM7SUFDNUMseUVBQXdEO0lBQ3hELDZEQUFpQztJQUNqQyw2REFBeUo7SUFDekosNkRBQTJDO0lBSTNDOzs7O09BSUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUF5QjtRQUM3RCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHNEQUVDO0lBRUQ7UUFDRSw2QkFBb0IsSUFBeUI7WUFBekIsU0FBSSxHQUFKLElBQUksQ0FBcUI7UUFBRyxDQUFDO1FBRWpELHNCQUFZLGlEQUFnQjtpQkFBNUIsY0FBMEQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXRGLG1EQUFxQixHQUFyQixjQUFvQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0UsNENBQWMsR0FBZCxVQUFlLFFBQWdCO1lBQzdCLElBQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7WUFDakMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkQsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtnQkFDakMsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEdBQUU7YUFDbkU7WUFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFB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O29CQUNoQixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQzFCO2dCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3RCO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVQaXBlU3VtbWFyeX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7Z2V0VGVtcGxhdGVDb21wbGV0aW9uc30gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge2dldERlZmluaXRpb259IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0SG92ZXJ9IGZyb20gJy4vaG92ZXInO1xuaW1wb3J0IHtDb21wbGV0aW9uLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljS2luZCwgRGlhZ25vc3RpY3MsIEhvdmVyLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3QsIExvY2F0aW9uLCBTcGFuLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge29mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cblxuXG4vKipcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBhbiBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZShob3N0OiBMYW5ndWFnZVNlcnZpY2VIb3N0KTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcmV0dXJuIG5ldyBMYW5ndWFnZVNlcnZpY2VJbXBsKGhvc3QpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVNlcnZpY2VJbXBsIGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBMYW5ndWFnZVNlcnZpY2VIb3N0KSB7fVxuXG4gIHByaXZhdGUgZ2V0IG1ldGFkYXRhUmVzb2x2ZXIoKTogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIgeyByZXR1cm4gdGhpcy5ob3N0LnJlc29sdmVyOyB9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIHRoaXMuaG9zdC5nZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTsgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiBEaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IERpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZXMoZmlsZU5hbWUpO1xuICAgIGlmICh0ZW1wbGF0ZXMgJiYgdGVtcGxhdGVzLmxlbmd0aCkge1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhmaWxlTmFtZSwgdGVtcGxhdGVzKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9ucyhmaWxlTmFtZSk7XG4gICAgaWYgKGRlY2xhcmF0aW9ucyAmJiBkZWNsYXJhdGlvbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5ob3N0LmdldEFuYWx5emVkTW9kdWxlcygpO1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLmdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoZGVjbGFyYXRpb25zLCBzdW1tYXJ5KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuaXF1ZUJ5U3BhbihyZXN1bHRzKTtcbiAgfVxuXG4gIGdldFBpcGVzQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IENvbXBpbGVQaXBlU3VtbWFyeVtdIHtcbiAgICBsZXQgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZUluZm8ucGlwZXM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IENvbXBsZXRpb25bXXx1bmRlZmluZWQge1xuICAgIGxldCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldFRlbXBsYXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cblxuICBnZXREZWZpbml0aW9uQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IExvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uKHRlbXBsYXRlSW5mbyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0SG92ZXJBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogSG92ZXJ8dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRIb3Zlcih0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nLCB0ZW1wbGF0ZXM6IFRlbXBsYXRlU291cmNlW10pOiBEaWFnbm9zdGljcyB7XG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xuICAgICAgY29uc3QgYXN0ID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlLCBmaWxlTmFtZSk7XG4gICAgICBpZiAoYXN0KSB7XG4gICAgICAgIGlmIChhc3QucGFyc2VFcnJvcnMgJiYgYXN0LnBhcnNlRXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5hc3QucGFyc2VFcnJvcnMubWFwPERpYWdub3N0aWM+KFxuICAgICAgICAgICAgICBlID0+ICh7XG4gICAgICAgICAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgICAgICAgc3Bhbjogb2Zmc2V0U3BhbihzcGFuT2YoZS5zcGFuKSwgdGVtcGxhdGUuc3Bhbi5zdGFydCksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZS5tc2dcbiAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChhc3QudGVtcGxhdGVBc3QgJiYgYXN0Lmh0bWxBc3QpIHtcbiAgICAgICAgICBjb25zdCBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvID0ge1xuICAgICAgICAgICAgdGVtcGxhdGVBc3Q6IGFzdC50ZW1wbGF0ZUFzdCxcbiAgICAgICAgICAgIGh0bWxBc3Q6IGFzdC5odG1sQXN0LFxuICAgICAgICAgICAgb2Zmc2V0OiB0ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgICAgICAgICAgcXVlcnk6IHRlbXBsYXRlLnF1ZXJ5LFxuICAgICAgICAgICAgbWVtYmVyczogdGVtcGxhdGUubWVtYmVyc1xuICAgICAgICAgIH07XG4gICAgICAgICAgY29uc3QgZXhwcmVzc2lvbkRpYWdub3N0aWNzID0gZ2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3MoaW5mbyk7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKC4uLmV4cHJlc3Npb25EaWFnbm9zdGljcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFzdC5lcnJvcnMpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goLi4uYXN0LmVycm9ycy5tYXA8RGlhZ25vc3RpYz4oXG4gICAgICAgICAgICAgIGUgPT4gKHtraW5kOiBlLmtpbmQsIHNwYW46IGUuc3BhbiB8fCB0ZW1wbGF0ZS5zcGFuLCBtZXNzYWdlOiBlLm1lc3NhZ2V9KSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZUJ5U3BhbjxUIGV4dGVuZHN7c3BhbjogU3Bhbn0+KGVsZW1lbnRzOiBUW10pOiBUW10ge1xuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgIGNvbnN0IHtzcGFufSA9IGVsZW1lbnQ7XG4gICAgbGV0IHNldCA9IG1hcC5nZXQoc3Bhbi5zdGFydCk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHNldCA9IG5ldyBTZXQoKTtcbiAgICAgIG1hcC5zZXQoc3Bhbi5zdGFydCwgc2V0KTtcbiAgICB9XG4gICAgaWYgKCFzZXQuaGFzKHNwYW4uZW5kKSkge1xuICAgICAgc2V0LmFkZChzcGFuLmVuZCk7XG4gICAgICByZXN1bHQucHVzaChlbGVtZW50KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==