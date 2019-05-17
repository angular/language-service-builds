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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover", "@angular/language-service/src/types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var completions_1 = require("@angular/language-service/src/completions");
    var definitions_1 = require("@angular/language-service/src/definitions");
    var diagnostics_1 = require("@angular/language-service/src/diagnostics");
    var hover_1 = require("@angular/language-service/src/hover");
    var types_1 = require("@angular/language-service/src/types");
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
                results.push.apply(results, tslib_1.__spread(diagnostics_1.getTemplateDiagnostics(fileName, this, templates)));
            }
            var declarations = this.host.getDeclarations(fileName);
            if (declarations && declarations.length) {
                var summary = this.host.getAnalyzedModules();
                results.push.apply(results, tslib_1.__spread(diagnostics_1.getDeclarationDiagnostics(declarations, summary)));
            }
            return uniqueBySpan(results);
        };
        LanguageServiceImpl.prototype.getPipesAt = function (fileName, position) {
            var templateInfo = this.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return templateInfo.pipes;
            }
            return [];
        };
        LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
            var templateInfo = this.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return completions_1.getTemplateCompletions(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getDefinitionAt = function (fileName, position) {
            var templateInfo = this.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return definitions_1.getDefinition(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getHoverAt = function (fileName, position) {
            var templateInfo = this.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return hover_1.getHover(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getTemplateAstAtPosition = function (fileName, position) {
            var template = this.host.getTemplateAt(fileName, position);
            if (template) {
                var astResult = this.getTemplateAst(template, fileName);
                if (astResult && astResult.htmlAst && astResult.templateAst && astResult.directive &&
                    astResult.directives && astResult.pipes && astResult.expressionParser)
                    return {
                        position: position,
                        fileName: fileName,
                        template: template,
                        htmlAst: astResult.htmlAst,
                        directive: astResult.directive,
                        directives: astResult.directives,
                        pipes: astResult.pipes,
                        templateAst: astResult.templateAst,
                        expressionParser: astResult.expressionParser
                    };
            }
            return undefined;
        };
        LanguageServiceImpl.prototype.getTemplateAst = function (template, contextFile) {
            var _this = this;
            var result = undefined;
            try {
                var resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(template.type);
                var metadata = resolvedMetadata && resolvedMetadata.metadata;
                if (metadata) {
                    var rawHtmlParser = new compiler_1.HtmlParser();
                    var htmlParser = new compiler_1.I18NHtmlParser(rawHtmlParser);
                    var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
                    var config = new compiler_1.CompilerConfig();
                    var parser = new compiler_1.TemplateParser(config, this.host.resolver.getReflector(), expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, []);
                    var htmlResult = htmlParser.parse(template.source, '', { tokenizeExpansionForms: true });
                    var analyzedModules = this.host.getAnalyzedModules();
                    var errors = undefined;
                    var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
                    if (!ngModule) {
                        // Reported by the the declaration diagnostics.
                        ngModule = findSuitableDefaultModule(analyzedModules);
                    }
                    if (ngModule) {
                        var resolvedDirectives = ngModule.transitiveModule.directives.map(function (d) { return _this.host.resolver.getNonNormalizedDirectiveMetadata(d.reference); });
                        var directives = removeMissing(resolvedDirectives).map(function (d) { return d.metadata.toSummary(); });
                        var pipes = ngModule.transitiveModule.pipes.map(function (p) { return _this.host.resolver.getOrLoadPipeMetadata(p.reference).toSummary(); });
                        var schemas = ngModule.schemas;
                        var parseResult = parser.tryParseHtml(htmlResult, metadata, directives, pipes, schemas);
                        result = {
                            htmlAst: htmlResult.rootNodes,
                            templateAst: parseResult.templateAst,
                            directive: metadata, directives: directives, pipes: pipes,
                            parseErrors: parseResult.errors, expressionParser: expressionParser, errors: errors
                        };
                    }
                }
            }
            catch (e) {
                var span = template.span;
                if (e.fileName == contextFile) {
                    span = template.query.getSpanAt(e.line, e.column) || span;
                }
                result = { errors: [{ kind: types_1.DiagnosticKind.Error, message: e.message, span: span }] };
            }
            return result || {};
        };
        return LanguageServiceImpl;
    }());
    function removeMissing(values) {
        return values.filter(function (e) { return !!e; });
    }
    function uniqueBySpan(elements) {
        var e_1, _a;
        if (elements) {
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
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (elements_1_1 && !elements_1_1.done && (_a = elements_1.return)) _a.call(elements_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        }
    }
    function findSuitableDefaultModule(modules) {
        var e_2, _a;
        var result = undefined;
        var resultSize = 0;
        try {
            for (var _b = tslib_1.__values(modules.ngModules), _c = _b.next(); !_c.done; _c = _b.next()) {
                var module_1 = _c.value;
                var moduleSize = module_1.transitiveModule.directives.length;
                if (moduleSize > resultSize) {
                    result = module_1;
                    resultSize = moduleSize;
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
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStOO0lBRy9OLHlFQUFxRDtJQUNyRCx5RUFBNEM7SUFDNUMseUVBQWdGO0lBQ2hGLDZEQUFpQztJQUNqQyw2REFBNEo7SUFHNUo7Ozs7T0FJRztJQUNILFNBQWdCLHFCQUFxQixDQUFDLElBQXlCO1FBQzdELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRkQsc0RBRUM7SUFFRDtRQUNFLDZCQUFvQixJQUF5QjtZQUF6QixTQUFJLEdBQUosSUFBSSxDQUFxQjtRQUFHLENBQUM7UUFFakQsc0JBQVksaURBQWdCO2lCQUE1QixjQUEwRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFdEYsbURBQXFCLEdBQXJCLGNBQW9DLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUvRSw0Q0FBYyxHQUFkLFVBQWUsUUFBZ0I7WUFDN0IsSUFBSSxPQUFPLEdBQWdCLEVBQUUsQ0FBQztZQUM5QixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRCxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMsb0NBQXNCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsR0FBRTthQUNwRTtZQUVELElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxD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QyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTt3QkFDdEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQ3RCO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLE1BQU0sQ0FBQztTQUNmO0lBQ0gsQ0FBQztJQUVELFNBQVMseUJBQXlCLENBQUMsT0FBMEI7O1FBQzNELElBQUksTUFBTSxHQUFzQyxTQUFTLENBQUM7UUFDMUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDOztZQUNuQixLQUFxQixJQUFBLEtBQUEsaUJBQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBbkMsSUFBTSxRQUFNLFdBQUE7Z0JBQ2YsSUFBTSxVQUFVLEdBQUcsUUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzdELElBQUksVUFBVSxHQUFHLFVBQVUsRUFBRTtvQkFDM0IsTUFBTSxHQUFHLFFBQU0sQ0FBQztvQkFDaEIsVUFBVSxHQUFHLFVBQVUsQ0FBQztpQkFDekI7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlTWV0YWRhdGFSZXNvbHZlciwgQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEsIENvbXBpbGVQaXBlU3VtbWFyeSwgQ29tcGlsZXJDb25maWcsIERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgSHRtbFBhcnNlciwgSTE4Tkh0bWxQYXJzZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgUGFyc2VyLCBUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge0FzdFJlc3VsdCwgVGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldFRlbXBsYXRlQ29tcGxldGlvbnN9IGZyb20gJy4vY29tcGxldGlvbnMnO1xuaW1wb3J0IHtnZXREZWZpbml0aW9ufSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7Z2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcywgZ2V0VGVtcGxhdGVEaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEhvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCB7Q29tcGxldGlvbnMsIERlZmluaXRpb24sIERpYWdub3N0aWMsIERpYWdub3N0aWNLaW5kLCBEaWFnbm9zdGljcywgSG92ZXIsIExhbmd1YWdlU2VydmljZSwgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgU3BhbiwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuXG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIGFuIEFuZ3VsYXIgYExhbmd1YWdlU2VydmljZWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKGhvc3Q6IExhbmd1YWdlU2VydmljZUhvc3QpOiBMYW5ndWFnZVNlcnZpY2Uge1xuICByZXR1cm4gbmV3IExhbmd1YWdlU2VydmljZUltcGwoaG9zdCk7XG59XG5cbmNsYXNzIExhbmd1YWdlU2VydmljZUltcGwgaW1wbGVtZW50cyBMYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IExhbmd1YWdlU2VydmljZUhvc3QpIHt9XG5cbiAgcHJpdmF0ZSBnZXQgbWV0YWRhdGFSZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7IHJldHVybiB0aGlzLmhvc3QucmVzb2x2ZXI7IH1cblxuICBnZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTogc3RyaW5nW10geyByZXR1cm4gdGhpcy5ob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpOyB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IERpYWdub3N0aWNzfHVuZGVmaW5lZCB7XG4gICAgbGV0IHJlc3VsdHM6IERpYWdub3N0aWNzID0gW107XG4gICAgbGV0IHRlbXBsYXRlcyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZXMoZmlsZU5hbWUpO1xuICAgIGlmICh0ZW1wbGF0ZXMgJiYgdGVtcGxhdGVzLmxlbmd0aCkge1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoZmlsZU5hbWUsIHRoaXMsIHRlbXBsYXRlcykpO1xuICAgIH1cblxuICAgIGxldCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zICYmIGRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7XG4gICAgICByZXN1bHRzLnB1c2goLi4uZ2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcyhkZWNsYXJhdGlvbnMsIHN1bW1hcnkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5pcXVlQnlTcGFuKHJlc3VsdHMpO1xuICB9XG5cbiAgZ2V0UGlwZXNBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogQ29tcGlsZVBpcGVTdW1tYXJ5W10ge1xuICAgIGxldCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZUluZm8ucGlwZXM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IENvbXBsZXRpb25zIHtcbiAgICBsZXQgdGVtcGxhdGVJbmZvID0gdGhpcy5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIGdldERlZmluaXRpb25BdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogRGVmaW5pdGlvbiB7XG4gICAgbGV0IHRlbXBsYXRlSW5mbyA9IHRoaXMuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldERlZmluaXRpb24odGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cblxuICBnZXRIb3ZlckF0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBIb3Zlcnx1bmRlZmluZWQge1xuICAgIGxldCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRIb3Zlcih0ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgbGV0IGFzdFJlc3VsdCA9IHRoaXMuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUsIGZpbGVOYW1lKTtcbiAgICAgIGlmIChhc3RSZXN1bHQgJiYgYXN0UmVzdWx0Lmh0bWxBc3QgJiYgYXN0UmVzdWx0LnRlbXBsYXRlQXN0ICYmIGFzdFJlc3VsdC5kaXJlY3RpdmUgJiZcbiAgICAgICAgICBhc3RSZXN1bHQuZGlyZWN0aXZlcyAmJiBhc3RSZXN1bHQucGlwZXMgJiYgYXN0UmVzdWx0LmV4cHJlc3Npb25QYXJzZXIpXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcG9zaXRpb24sXG4gICAgICAgICAgZmlsZU5hbWUsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaHRtbEFzdDogYXN0UmVzdWx0Lmh0bWxBc3QsXG4gICAgICAgICAgZGlyZWN0aXZlOiBhc3RSZXN1bHQuZGlyZWN0aXZlLFxuICAgICAgICAgIGRpcmVjdGl2ZXM6IGFzdFJlc3VsdC5kaXJlY3RpdmVzLFxuICAgICAgICAgIHBpcGVzOiBhc3RSZXN1bHQucGlwZXMsXG4gICAgICAgICAgdGVtcGxhdGVBc3Q6IGFzdFJlc3VsdC50ZW1wbGF0ZUFzdCxcbiAgICAgICAgICBleHByZXNzaW9uUGFyc2VyOiBhc3RSZXN1bHQuZXhwcmVzc2lvblBhcnNlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGU6IFRlbXBsYXRlU291cmNlLCBjb250ZXh0RmlsZTogc3RyaW5nKTogQXN0UmVzdWx0IHtcbiAgICBsZXQgcmVzdWx0OiBBc3RSZXN1bHR8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNvbHZlZE1ldGFkYXRhID1cbiAgICAgICAgICB0aGlzLm1ldGFkYXRhUmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKHRlbXBsYXRlLnR5cGUgYXMgYW55KTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gcmVzb2x2ZWRNZXRhZGF0YSAmJiByZXNvbHZlZE1ldGFkYXRhLm1ldGFkYXRhO1xuICAgICAgaWYgKG1ldGFkYXRhKSB7XG4gICAgICAgIGNvbnN0IHJhd0h0bWxQYXJzZXIgPSBuZXcgSHRtbFBhcnNlcigpO1xuICAgICAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IEkxOE5IdG1sUGFyc2VyKHJhd0h0bWxQYXJzZXIpO1xuICAgICAgICBjb25zdCBleHByZXNzaW9uUGFyc2VyID0gbmV3IFBhcnNlcihuZXcgTGV4ZXIoKSk7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBDb21waWxlckNvbmZpZygpO1xuICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgICAgICBjb25maWcsIHRoaXMuaG9zdC5yZXNvbHZlci5nZXRSZWZsZWN0b3IoKSwgZXhwcmVzc2lvblBhcnNlcixcbiAgICAgICAgICAgIG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKSwgaHRtbFBhcnNlciwgbnVsbCAhLCBbXSk7XG4gICAgICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgJycsIHt0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlfSk7XG4gICAgICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTtcbiAgICAgICAgbGV0IGVycm9yczogRGlhZ25vc3RpY1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHRlbXBsYXRlLnR5cGUpO1xuICAgICAgICBpZiAoIW5nTW9kdWxlKSB7XG4gICAgICAgICAgLy8gUmVwb3J0ZWQgYnkgdGhlIHRoZSBkZWNsYXJhdGlvbiBkaWFnbm9zdGljcy5cbiAgICAgICAgICBuZ01vZHVsZSA9IGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUoYW5hbHl6ZWRNb2R1bGVzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmdNb2R1bGUpIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlZERpcmVjdGl2ZXMgPSBuZ01vZHVsZS50cmFuc2l0aXZlTW9kdWxlLmRpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgICBkID0+IHRoaXMuaG9zdC5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZC5yZWZlcmVuY2UpKTtcbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gcmVtb3ZlTWlzc2luZyhyZXNvbHZlZERpcmVjdGl2ZXMpLm1hcChkID0+IGQubWV0YWRhdGEudG9TdW1tYXJ5KCkpO1xuICAgICAgICAgIGNvbnN0IHBpcGVzID0gbmdNb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5waXBlcy5tYXAoXG4gICAgICAgICAgICAgIHAgPT4gdGhpcy5ob3N0LnJlc29sdmVyLmdldE9yTG9hZFBpcGVNZXRhZGF0YShwLnJlZmVyZW5jZSkudG9TdW1tYXJ5KCkpO1xuICAgICAgICAgIGNvbnN0IHNjaGVtYXMgPSBuZ01vZHVsZS5zY2hlbWFzO1xuICAgICAgICAgIGNvbnN0IHBhcnNlUmVzdWx0ID0gcGFyc2VyLnRyeVBhcnNlSHRtbChodG1sUmVzdWx0LCBtZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgICAgICAgZGlyZWN0aXZlOiBtZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsXG4gICAgICAgICAgICBwYXJzZUVycm9yczogcGFyc2VSZXN1bHQuZXJyb3JzLCBleHByZXNzaW9uUGFyc2VyLCBlcnJvcnNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbGV0IHNwYW4gPSB0ZW1wbGF0ZS5zcGFuO1xuICAgICAgaWYgKGUuZmlsZU5hbWUgPT0gY29udGV4dEZpbGUpIHtcbiAgICAgICAgc3BhbiA9IHRlbXBsYXRlLnF1ZXJ5LmdldFNwYW5BdChlLmxpbmUsIGUuY29sdW1uKSB8fCBzcGFuO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0ge2Vycm9yczogW3traW5kOiBEaWFnbm9zdGljS2luZC5FcnJvciwgbWVzc2FnZTogZS5tZXNzYWdlLCBzcGFufV19O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IHt9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU1pc3Npbmc8VD4odmFsdWVzOiAoVCB8IG51bGwgfCB1bmRlZmluZWQpW10pOiBUW10ge1xuICByZXR1cm4gdmFsdWVzLmZpbHRlcihlID0+ICEhZSkgYXMgVFtdO1xufVxuXG5mdW5jdGlvbiB1bmlxdWVCeVNwYW4gPCBUIGV4dGVuZHMge1xuICBzcGFuOiBTcGFuO1xufVxuPiAoZWxlbWVudHM6IFRbXSB8IHVuZGVmaW5lZCk6IFRbXXx1bmRlZmluZWQge1xuICBpZiAoZWxlbWVudHMpIHtcbiAgICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgIGxldCBzcGFuID0gZWxlbWVudC5zcGFuO1xuICAgICAgbGV0IHNldCA9IG1hcC5nZXQoc3Bhbi5zdGFydCk7XG4gICAgICBpZiAoIXNldCkge1xuICAgICAgICBzZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgIG1hcC5zZXQoc3Bhbi5zdGFydCwgc2V0KTtcbiAgICAgIH1cbiAgICAgIGlmICghc2V0LmhhcyhzcGFuLmVuZCkpIHtcbiAgICAgICAgc2V0LmFkZChzcGFuLmVuZCk7XG4gICAgICAgIHJlc3VsdC5wdXNoKGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUobW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQge1xuICBsZXQgcmVzdWx0OiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCByZXN1bHRTaXplID0gMDtcbiAgZm9yIChjb25zdCBtb2R1bGUgb2YgbW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICBjb25zdCBtb2R1bGVTaXplID0gbW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUuZGlyZWN0aXZlcy5sZW5ndGg7XG4gICAgaWYgKG1vZHVsZVNpemUgPiByZXN1bHRTaXplKSB7XG4gICAgICByZXN1bHQgPSBtb2R1bGU7XG4gICAgICByZXN1bHRTaXplID0gbW9kdWxlU2l6ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==