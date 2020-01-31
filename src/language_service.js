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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
            var results = [];
            var templates = this.host.getTemplates(fileName);
            try {
                for (var templates_1 = tslib_1.__values(templates), templates_1_1 = templates_1.next(); !templates_1_1.done; templates_1_1 = templates_1.next()) {
                    var template = templates_1_1.value;
                    var ast = this.host.getTemplateAst(template);
                    if (ast) {
                        results.push.apply(results, tslib_1.__spread(diagnostics_1.getTemplateDiagnostics(ast)));
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
            if (declarations && declarations.length) {
                results.push.apply(results, tslib_1.__spread(diagnostics_1.getDeclarationDiagnostics(declarations, analyzedModules, this.host)));
            }
            var sourceFile = fileName.endsWith('.ts') ? this.host.getSourceFile(fileName) : undefined;
            return diagnostics_1.uniqueBySpan(results).map(function (d) { return diagnostics_1.ngDiagnosticToTsDiagnostic(d, sourceFile); });
        };
        LanguageServiceImpl.prototype.getCompletionsAtPosition = function (fileName, position, options) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgseUVBQXFEO0lBQ3JELHlFQUFxRjtJQUNyRix5RUFBMEg7SUFDMUgsNkRBQXFEO0lBSXJEOzs7O09BSUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUEyQjtRQUMvRCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHNEQUVDO0lBRUQ7UUFDRSw2QkFBNkIsSUFBMkI7WUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFBRyxDQUFDO1FBRTVELG9EQUFzQixHQUF0QixVQUF1QixRQUFnQjs7WUFDckMsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUUscUNBQXFDO1lBQzlGLElBQU0sT0FBTyxHQUFvQixFQUFFLENBQUM7WUFDcEMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7O2dCQUVuRCxLQUF1QixJQUFBLGNBQUEsaUJBQUEsU0FBUyxDQUFBLG9DQUFBLDJEQUFFO29CQUE3QixJQUFNLFFBQVEsc0JBQUE7b0JBQ2pCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMvQyxJQUFJLEdBQUcsRUFBRTt3QkFDUCxPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMsb0NBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUU7cUJBQzlDO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVB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T0FBTyxrQkFBVSxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQTNFRCxJQTJFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7Z2V0VGVtcGxhdGVDb21wbGV0aW9uc30gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge2dldERlZmluaXRpb25BbmRCb3VuZFNwYW4sIGdldFRzRGVmaW5pdGlvbkFuZEJvdW5kU3Bhbn0gZnJvbSAnLi9kZWZpbml0aW9ucyc7XG5pbXBvcnQge2dldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MsIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MsIG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljLCB1bmlxdWVCeVNwYW59IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUhvdmVyLCBnZXRUc0hvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gIHJldHVybiBuZXcgTGFuZ3VhZ2VTZXJ2aWNlSW1wbChob3N0KTtcbn1cblxuY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlSW1wbCBpbXBsZW1lbnRzIG5nLkxhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7fVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCByZXN1bHRzOiBuZy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVzKGZpbGVOYW1lKTtcblxuICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XG4gICAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICAgICAgaWYgKGFzdCkge1xuICAgICAgICByZXN1bHRzLnB1c2goLi4uZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhhc3QpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zICYmIGRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdHMucHVzaCguLi5nZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKGRlY2xhcmF0aW9ucywgYW5hbHl6ZWRNb2R1bGVzLCB0aGlzLmhvc3QpKTtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2VGaWxlID0gZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpID8gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIDogdW5kZWZpbmVkO1xuICAgIHJldHVybiB1bmlxdWVCeVNwYW4ocmVzdWx0cykubWFwKGQgPT4gbmdEaWFnbm9zdGljVG9Uc0RpYWdub3N0aWMoZCwgc291cmNlRmlsZSkpO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcixcbiAgICAgIG9wdGlvbnM/OiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9ucyk6IHRzcy5Db21wbGV0aW9uSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IGdldFRlbXBsYXRlQ29tcGxldGlvbnMoYXN0LCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICAvLyBDYXN0IENvbXBsZXRpb25FbnRyeS5raW5kIGZyb20gbmcuQ29tcGxldGlvbktpbmQgdG8gdHMuU2NyaXB0RWxlbWVudEtpbmRcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMgYXMgdW5rbm93biBhcyB0cy5Db21wbGV0aW9uRW50cnlbXSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgdG8gZ2V0IEFuZ3VsYXItc3BlY2lmaWMgZGVmaW5pdGlvbnMgaW4gYSBUeXBlU2NyaXB0IGZpbGUsIGxpa2UgdGVtcGxhdGVzIGRlZmluZWRcbiAgICAvLyBpbiBhIGB0ZW1wbGF0ZVVybGAgcHJvcGVydHkuXG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgY29uc3Qgc2YgPSB0aGlzLmhvc3QuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc2YpIHtcbiAgICAgICAgcmV0dXJuIGdldFRzRGVmaW5pdGlvbkFuZEJvdW5kU3BhbihzZiwgcG9zaXRpb24sIHRoaXMuaG9zdC50c0xzSG9zdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldFRlbXBsYXRlSG92ZXIodGVtcGxhdGVJbmZvLCBwb3NpdGlvbiwgYW5hbHl6ZWRNb2R1bGVzKTtcbiAgICB9XG5cbiAgICAvLyBBdHRlbXB0IHRvIGdldCBBbmd1bGFyLXNwZWNpZmljIGhvdmVyIGluZm9ybWF0aW9uIGluIGEgVHlwZVNjcmlwdCBmaWxlLCB0aGUgTmdNb2R1bGUgYVxuICAgIC8vIGRpcmVjdGl2ZSBiZWxvbmdzIHRvLlxuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHRoaXMuaG9zdC5nZXREZWNsYXJhdGlvbnMoZmlsZU5hbWUpO1xuICAgIHJldHVybiBnZXRUc0hvdmVyKHBvc2l0aW9uLCBkZWNsYXJhdGlvbnMsIGFuYWx5emVkTW9kdWxlcyk7XG4gIH1cbn1cbiJdfQ==