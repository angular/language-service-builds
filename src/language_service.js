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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "typescript/lib/tsserverlibrary", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createLanguageService = void 0;
    var tslib_1 = require("tslib");
    var tss = require("typescript/lib/tsserverlibrary");
    var completions_1 = require("@angular/language-service/src/completions");
    var definitions_1 = require("@angular/language-service/src/definitions");
    var diagnostics_1 = require("@angular/language-service/src/diagnostics");
    var hover_1 = require("@angular/language-service/src/hover");
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
        LanguageServiceImpl.prototype.getSemanticDiagnostics = function (fileName) {
            var e_1, _a;
            var analyzedModules = this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var ngDiagnostics = [];
            var templates = this.host.getTemplates(fileName);
            try {
                for (var templates_1 = tslib_1.__values(templates), templates_1_1 = templates_1.next(); !templates_1_1.done; templates_1_1 = templates_1.next()) {
                    var template = templates_1_1.value;
                    var ast = this.host.getTemplateAst(template);
                    if (ast) {
                        ngDiagnostics.push.apply(ngDiagnostics, tslib_1.__spread(diagnostics_1.getTemplateDiagnostics(ast)));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (templates_1_1 && !templates_1_1.done && (_a = templates_1.return)) _a.call(templates_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var declarations = this.host.getDeclarations(fileName);
            ngDiagnostics.push.apply(ngDiagnostics, tslib_1.__spread(diagnostics_1.getDeclarationDiagnostics(declarations, analyzedModules, this.host)));
            var sourceFile = fileName.endsWith('.ts') ? this.host.getSourceFile(fileName) : undefined;
            var tsDiagnostics = ngDiagnostics.map(function (d) { return diagnostics_1.ngDiagnosticToTsDiagnostic(d, sourceFile); });
            return tslib_1.__spread(tss.sortAndDeduplicateDiagnostics(tsDiagnostics));
        };
        LanguageServiceImpl.prototype.getCompletionsAtPosition = function (fileName, position, _options) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var ast = this.host.getTemplateAstAtPosition(fileName, position);
            if (!ast) {
                return;
            }
            var results = completions_1.getTemplateCompletions(ast, position);
            if (!results || !results.length) {
                return;
            }
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                // Cast CompletionEntry.kind from ng.CompletionKind to ts.ScriptElementKind
                entries: results,
            };
        };
        LanguageServiceImpl.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return definitions_1.getDefinitionAndBoundSpan(templateInfo, position);
            }
            // Attempt to get Angular-specific definitions in a TypeScript file, like templates defined
            // in a `templateUrl` property.
            if (fileName.endsWith('.ts')) {
                var sf = this.host.getSourceFile(fileName);
                if (sf) {
                    return definitions_1.getTsDefinitionAndBoundSpan(sf, position, this.host.tsLsHost);
                }
            }
        };
        LanguageServiceImpl.prototype.getQuickInfoAtPosition = function (fileName, position) {
            var analyzedModules = this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return hover_1.getTemplateHover(templateInfo, position, analyzedModules);
            }
            // Attempt to get Angular-specific hover information in a TypeScript file, the NgModule a
            // directive belongs to.
            var declarations = this.host.getDeclarations(fileName);
            return hover_1.getTsHover(position, declarations, analyzedModules);
        };
        return LanguageServiceImpl;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILG9EQUFzRDtJQUV0RCx5RUFBcUQ7SUFDckQseUVBQXFGO0lBQ3JGLHlFQUE0RztJQUM1Ryw2REFBcUQ7SUFJckQ7Ozs7T0FJRztJQUNILFNBQWdCLHFCQUFxQixDQUFDLElBQTJCO1FBQy9ELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRkQsc0RBRUM7SUFFRDtRQUNFLDZCQUE2QixJQUEyQjtZQUEzQixTQUFJLEdBQUosSUFBSSxDQUF1QjtRQUFHLENBQUM7UUFFNUQsb0RBQXNCLEdBQXRCLFVBQXVCLFFBQWdCOztZQUNyQyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDOUYsSUFBTSxhQUFhLEdBQW9CLEVBQUUsQ0FBQztZQUUxQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQ25ELEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQy9DLElBQUksR0FBRyxFQUFFO3dCQUNQLGFBQWEsQ0FBQyxJQUFJLE9BQWxCLGFBQWEsbUJBQVMsb0NBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUU7cUJBQ3BEO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENB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LENBQUM7WUFDekQsT0FBTyxrQkFBVSxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQTFFRCxJQTBFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7Z2V0VGVtcGxhdGVDb21wbGV0aW9uc30gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge2dldERlZmluaXRpb25BbmRCb3VuZFNwYW4sIGdldFRzRGVmaW5pdGlvbkFuZEJvdW5kU3Bhbn0gZnJvbSAnLi9kZWZpbml0aW9ucyc7XG5pbXBvcnQge2dldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MsIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MsIG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0VGVtcGxhdGVIb3ZlciwgZ2V0VHNIb3Zlcn0gZnJvbSAnLi9ob3Zlcic7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIGFuIEFuZ3VsYXIgYExhbmd1YWdlU2VydmljZWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkge1xuICByZXR1cm4gbmV3IExhbmd1YWdlU2VydmljZUltcGwoaG9zdCk7XG59XG5cbmNsYXNzIExhbmd1YWdlU2VydmljZUltcGwgaW1wbGVtZW50cyBuZy5MYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkge31cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgbmdEaWFnbm9zdGljczogbmcuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVzKGZpbGVOYW1lKTtcbiAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xuICAgICAgY29uc3QgYXN0ID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlKTtcbiAgICAgIGlmIChhc3QpIHtcbiAgICAgICAgbmdEaWFnbm9zdGljcy5wdXNoKC4uLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoYXN0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9ucyhmaWxlTmFtZSk7XG4gICAgbmdEaWFnbm9zdGljcy5wdXNoKC4uLmdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoZGVjbGFyYXRpb25zLCBhbmFseXplZE1vZHVsZXMsIHRoaXMuaG9zdCkpO1xuXG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCB0c0RpYWdub3N0aWNzID0gbmdEaWFnbm9zdGljcy5tYXAoZCA9PiBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpYyhkLCBzb3VyY2VGaWxlKSk7XG4gICAgcmV0dXJuIFsuLi50c3Muc29ydEFuZERlZHVwbGljYXRlRGlhZ25vc3RpY3ModHNEaWFnbm9zdGljcyldO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcixcbiAgICAgIF9vcHRpb25zPzogdHNzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnMpOiB0c3MuQ29tcGxldGlvbkluZm98dW5kZWZpbmVkIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgYXN0ID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghYXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdHMgPSBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKGFzdCwgcG9zaXRpb24pO1xuICAgIGlmICghcmVzdWx0cyB8fCAhcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgICAgLy8gQ2FzdCBDb21wbGV0aW9uRW50cnkua2luZCBmcm9tIG5nLkNvbXBsZXRpb25LaW5kIHRvIHRzLlNjcmlwdEVsZW1lbnRLaW5kXG4gICAgICBlbnRyaWVzOiByZXN1bHRzIGFzIHVua25vd24gYXMgdHMuQ29tcGxldGlvbkVudHJ5W10sXG4gICAgfTtcbiAgfVxuXG4gIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgdGhpcy5ob3N0LmdldEFuYWx5emVkTW9kdWxlcygpOyAgLy8gc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJ1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3Bhbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBBdHRlbXB0IHRvIGdldCBBbmd1bGFyLXNwZWNpZmljIGRlZmluaXRpb25zIGluIGEgVHlwZVNjcmlwdCBmaWxlLCBsaWtlIHRlbXBsYXRlcyBkZWZpbmVkXG4gICAgLy8gaW4gYSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5LlxuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNmID0gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNmKSB7XG4gICAgICAgIHJldHVybiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oc2YsIHBvc2l0aW9uLCB0aGlzLmhvc3QudHNMc0hvc3QpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRUZW1wbGF0ZUhvdmVyKHRlbXBsYXRlSW5mbywgcG9zaXRpb24sIGFuYWx5emVkTW9kdWxlcyk7XG4gICAgfVxuXG4gICAgLy8gQXR0ZW1wdCB0byBnZXQgQW5ndWxhci1zcGVjaWZpYyBob3ZlciBpbmZvcm1hdGlvbiBpbiBhIFR5cGVTY3JpcHQgZmlsZSwgdGhlIE5nTW9kdWxlIGFcbiAgICAvLyBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gZ2V0VHNIb3Zlcihwb3NpdGlvbiwgZGVjbGFyYXRpb25zLCBhbmFseXplZE1vZHVsZXMpO1xuICB9XG59XG4iXX0=