/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        LanguageServiceImpl.prototype.getReferencesAtPosition = function (fileName, position) {
            var defAndSpan = this.getDefinitionAndBoundSpan(fileName, position);
            if (!(defAndSpan === null || defAndSpan === void 0 ? void 0 : defAndSpan.definitions)) {
                return;
            }
            var definitions = defAndSpan.definitions;
            var tsDef = definitions.find(function (def) { return def.fileName.endsWith('.ts'); });
            if (!tsDef) {
                return;
            }
            return this.host.tsLS.getReferencesAtPosition(tsDef.fileName, tsDef.textSpan.start);
        };
        return LanguageServiceImpl;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILG9EQUFzRDtJQUV0RCx5RUFBcUQ7SUFDckQseUVBQXFGO0lBQ3JGLHlFQUE0RztJQUM1Ryw2REFBcUQ7SUFJckQ7Ozs7T0FJRztJQUNILFNBQWdCLHFCQUFxQixDQUFDLElBQTJCO1FBQy9ELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRkQsc0RBRUM7SUFFRDtRQUNFLDZCQUE2QixJQUEyQjtZQUEzQixTQUFJLEdBQUosSUFBSSxDQUF1QjtRQUFHLENBQUM7UUFFNUQsb0RBQXNCLEdBQXRCLFVBQXVCLFFBQWdCOztZQUNyQyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDOUYsSUFBTSxhQUFhLEdBQW9CLEVBQUUsQ0FBQztZQUUxQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQ25ELEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQy9DLElBQUksR0FBRyxFQUFFO3dCQUNQLGFBQWEsQ0FBQyxJQUFJLE9BQWxCLGFBQWEsbUJBQVMsb0NBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUU7cUJBQ3BEO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6RCxhQUFhLENBQUMsSUFBSSxPQUFsQixhQUFhLG1CQUFTLHVDQUF5QixDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFFO1lBRTNGLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDNUYsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLHdDQUEwQixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBekMsQ0FBeUMsQ0FBQyxDQUFDO1lBQ3hGLHdCQUFXLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUMvRCxDQUFDO1FBRUQsc0RBQXdCLEdBQXhCLFVBQ0ksUUFBZ0IsRUFBRSxRQUFnQixFQUNsQyxRQUE4QztZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDdEUsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDUixPQUFPO2FBQ1I7WUFDRCxJQUFNLE9BQU8sR0FBRyxvQ0FBc0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLE9BQU87YUFDUjtZQUNELE9BQU87Z0JBQ0wsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsdUJBQXVCLEVBQUUsS0FBSztnQkFDOUIsMkVBQTJFO2dCQUMzRSxPQUFPLEVBQUUsT0FBMEM7YUFDcEQsQ0FBQztRQUNKLENBQUM7UUFFRCx1REFBeUIsR0FBekIsVUFBMEIsUUFBZ0IsRUFBRSxRQUFnQjtZQUUxRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDdEUsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUUsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLE9BQU8sdUNBQXlCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsMkZBQTJGO1lBQzNGLCtCQUErQjtZQUMvQixJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzVCLElBQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLEVBQUUsRUFBRTtvQkFDTixPQUFPLHlDQUEyQixDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdEU7YUFDRjtRQUNILENBQUM7UUFFRCxvREFBc0IsR0FBdEIsVUFBdUIsUUFBZ0IsRUFBRSxRQUFnQjtZQUN2RCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDOUYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUUsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLE9BQU8sd0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQzthQUNsRTtZQUVELHlGQUF5RjtZQUN6Rix3QkFBd0I7WUFDeEIsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekQsT0FBTyxrQkFBVSxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVELHFEQUF1QixHQUF2QixVQUF3QixRQUFnQixFQUFFLFFBQWdCO1lBQ3hELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEUsSUFBSSxFQUFDLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxXQUFXLENBQUEsRUFBRTtnQkFDNUIsT0FBTzthQUNSO1lBQ00sSUFBQSxXQUFXLEdBQUksVUFBVSxZQUFkLENBQWU7WUFDakMsSUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUE1QixDQUE0QixDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDVixPQUFPO2FBQ1I7WUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBdEZELElBc0ZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtnZXRUZW1wbGF0ZUNvbXBsZXRpb25zfSBmcm9tICcuL2NvbXBsZXRpb25zJztcbmltcG9ydCB7Z2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbiwgZ2V0VHNEZWZpbml0aW9uQW5kQm91bmRTcGFufSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7Z2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcywgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcywgbmdEaWFnbm9zdGljVG9Uc0RpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUhvdmVyLCBnZXRUc0hvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gIHJldHVybiBuZXcgTGFuZ3VhZ2VTZXJ2aWNlSW1wbChob3N0KTtcbn1cblxuY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlSW1wbCBpbXBsZW1lbnRzIG5nLkxhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7fVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBuZ0RpYWdub3N0aWNzOiBuZy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZXMoZmlsZU5hbWUpO1xuICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XG4gICAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICAgICAgaWYgKGFzdCkge1xuICAgICAgICBuZ0RpYWdub3N0aWNzLnB1c2goLi4uZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhhc3QpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBuZ0RpYWdub3N0aWNzLnB1c2goLi4uZ2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcyhkZWNsYXJhdGlvbnMsIGFuYWx5emVkTW9kdWxlcywgdGhpcy5ob3N0KSk7XG5cbiAgICBjb25zdCBzb3VyY2VGaWxlID0gZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpID8gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHRzRGlhZ25vc3RpY3MgPSBuZ0RpYWdub3N0aWNzLm1hcChkID0+IG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKGQsIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gWy4uLnRzcy5zb3J0QW5kRGVkdXBsaWNhdGVEaWFnbm9zdGljcyh0c0RpYWdub3N0aWNzKV07XG4gIH1cblxuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgX29wdGlvbnM/OiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9ucyk6IHRzcy5Db21wbGV0aW9uSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IGdldFRlbXBsYXRlQ29tcGxldGlvbnMoYXN0LCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICAvLyBDYXN0IENvbXBsZXRpb25FbnRyeS5raW5kIGZyb20gbmcuQ29tcGxldGlvbktpbmQgdG8gdHMuU2NyaXB0RWxlbWVudEtpbmRcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMgYXMgdW5rbm93biBhcyB0cy5Db21wbGV0aW9uRW50cnlbXSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIH1cbiAgICAvLyBBdHRlbXB0IHRvIGdldCBBbmd1bGFyLXNwZWNpZmljIGRlZmluaXRpb25zIGluIGEgVHlwZVNjcmlwdCBmaWxlLCBsaWtlIHRlbXBsYXRlcyBkZWZpbmVkXG4gICAgLy8gaW4gYSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5LlxuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNmID0gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNmKSB7XG4gICAgICAgIHJldHVybiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oc2YsIHBvc2l0aW9uLCB0aGlzLmhvc3QudHNMc0hvc3QpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRUZW1wbGF0ZUhvdmVyKHRlbXBsYXRlSW5mbywgcG9zaXRpb24sIGFuYWx5emVkTW9kdWxlcyk7XG4gICAgfVxuXG4gICAgLy8gQXR0ZW1wdCB0byBnZXQgQW5ndWxhci1zcGVjaWZpYyBob3ZlciBpbmZvcm1hdGlvbiBpbiBhIFR5cGVTY3JpcHQgZmlsZSwgdGhlIE5nTW9kdWxlIGFcbiAgICAvLyBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gZ2V0VHNIb3Zlcihwb3NpdGlvbiwgZGVjbGFyYXRpb25zLCBhbmFseXplZE1vZHVsZXMpO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVmQW5kU3BhbiA9IHRoaXMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghZGVmQW5kU3Bhbj8uZGVmaW5pdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2RlZmluaXRpb25zfSA9IGRlZkFuZFNwYW47XG4gICAgY29uc3QgdHNEZWYgPSBkZWZpbml0aW9ucy5maW5kKGRlZiA9PiBkZWYuZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKTtcbiAgICBpZiAoIXRzRGVmKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmhvc3QudHNMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbih0c0RlZi5maWxlTmFtZSwgdHNEZWYudGV4dFNwYW4uc3RhcnQpO1xuICB9XG59XG4iXX0=