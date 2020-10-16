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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "path", "typescript/lib/tsserverlibrary", "@angular/language-service/common/definitions", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createLanguageService = void 0;
    var tslib_1 = require("tslib");
    var path = require("path");
    var tss = require("typescript/lib/tsserverlibrary");
    var definitions_1 = require("@angular/language-service/common/definitions");
    var completions_1 = require("@angular/language-service/src/completions");
    var definitions_2 = require("@angular/language-service/src/definitions");
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
                return definitions_2.getDefinitionAndBoundSpan(templateInfo, position);
            }
            // Attempt to get Angular-specific definitions in a TypeScript file, like templates defined
            // in a `templateUrl` property.
            if (fileName.endsWith('.ts')) {
                var sf = this.host.getSourceFile(fileName);
                if (sf) {
                    return definitions_1.getTsDefinitionAndBoundSpan(sf, position, new ViewEngineLSResourceResolver(this.host.tsLsHost));
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
    var ViewEngineLSResourceResolver = /** @class */ (function () {
        function ViewEngineLSResourceResolver(host) {
            this.host = host;
        }
        ViewEngineLSResourceResolver.prototype.resolve = function (file, basePath) {
            // Extract url path specified by the url node, which is relative to the TypeScript source file
            // the url node is defined in.
            var url = path.join(path.dirname(basePath), file);
            // If the file does not exist, bail. It is possible that the TypeScript language service host
            // does not have a `fileExists` method, in which case optimistically assume the file exists.
            if (this.host.fileExists && !this.host.fileExists(url)) {
                throw new Error("ResourceResolver: could not resolve " + url + " in context of " + basePath + ")");
            }
            return url;
        };
        return ViewEngineLSResourceResolver;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDJCQUE2QjtJQUM3QixvREFBc0Q7SUFFdEQsNEVBQW9GO0lBRXBGLHlFQUFxRDtJQUNyRCx5RUFBd0Q7SUFDeEQseUVBQTRHO0lBQzVHLDZEQUFxRDtJQUlyRDs7OztPQUlHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBMkI7UUFDL0QsT0FBTyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFGRCxzREFFQztJQUVEO1FBQ0UsNkJBQTZCLElBQTJCO1lBQTNCLFNBQUksR0FBSixJQUFJLENBQXVCO1FBQUcsQ0FBQztRQUU1RCxvREFBc0IsR0FBdEIsVUFBdUIsUUFBZ0I7O1lBQ3JDLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFFLHFDQUFxQztZQUM5RixJQUFNLGFBQWEsR0FBb0IsRUFBRSxDQUFDO1lBRTFDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztnQkFDbkQsS0FBdUIsSUFBQSxjQUFBLGlCQUFBLFNBQVMsQ0FBQSxvQ0FBQSwyREFBRTtvQkFBN0IsSUFBTSxRQUFRLHNCQUFBO29CQUNqQixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDL0MsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsYUFBYSxDQUFDLElBQUksT0FBbEIsYUFBYSxtQkFBUyxvQ0FBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRTtxQkFDcEQ7aUJBQ0Y7Ozs7Ozs7OztZ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NEY7WUFDNUYsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF1QyxHQUFHLHVCQUFrQixRQUFRLE1BQUcsQ0FBQyxDQUFDO2FBQzFGO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBQ0gsbUNBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7Z2V0VHNEZWZpbml0aW9uQW5kQm91bmRTcGFuLCBSZXNvdXJjZVJlc29sdmVyfSBmcm9tICcuLi9jb21tb24vZGVmaW5pdGlvbnMnO1xuXG5pbXBvcnQge2dldFRlbXBsYXRlQ29tcGxldGlvbnN9IGZyb20gJy4vY29tcGxldGlvbnMnO1xuaW1wb3J0IHtnZXREZWZpbml0aW9uQW5kQm91bmRTcGFufSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7Z2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcywgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcywgbmdEaWFnbm9zdGljVG9Uc0RpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUhvdmVyLCBnZXRUc0hvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gIHJldHVybiBuZXcgTGFuZ3VhZ2VTZXJ2aWNlSW1wbChob3N0KTtcbn1cblxuY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlSW1wbCBpbXBsZW1lbnRzIG5nLkxhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7fVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBuZ0RpYWdub3N0aWNzOiBuZy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGNvbnN0IHRlbXBsYXRlcyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZXMoZmlsZU5hbWUpO1xuICAgIGZvciAoY29uc3QgdGVtcGxhdGUgb2YgdGVtcGxhdGVzKSB7XG4gICAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICAgICAgaWYgKGFzdCkge1xuICAgICAgICBuZ0RpYWdub3N0aWNzLnB1c2goLi4uZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhhc3QpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBuZ0RpYWdub3N0aWNzLnB1c2goLi4uZ2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcyhkZWNsYXJhdGlvbnMsIGFuYWx5emVkTW9kdWxlcywgdGhpcy5ob3N0KSk7XG5cbiAgICBjb25zdCBzb3VyY2VGaWxlID0gZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpID8gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHRzRGlhZ25vc3RpY3MgPSBuZ0RpYWdub3N0aWNzLm1hcChkID0+IG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKGQsIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gWy4uLnRzcy5zb3J0QW5kRGVkdXBsaWNhdGVEaWFnbm9zdGljcyh0c0RpYWdub3N0aWNzKV07XG4gIH1cblxuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgX29wdGlvbnM/OiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9ucyk6IHRzcy5Db21wbGV0aW9uSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IGdldFRlbXBsYXRlQ29tcGxldGlvbnMoYXN0LCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICAvLyBDYXN0IENvbXBsZXRpb25FbnRyeS5raW5kIGZyb20gbmcuQ29tcGxldGlvbktpbmQgdG8gdHMuU2NyaXB0RWxlbWVudEtpbmRcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMgYXMgdW5rbm93biBhcyB0cy5Db21wbGV0aW9uRW50cnlbXSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIH1cbiAgICAvLyBBdHRlbXB0IHRvIGdldCBBbmd1bGFyLXNwZWNpZmljIGRlZmluaXRpb25zIGluIGEgVHlwZVNjcmlwdCBmaWxlLCBsaWtlIHRlbXBsYXRlcyBkZWZpbmVkXG4gICAgLy8gaW4gYSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5LlxuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNmID0gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNmKSB7XG4gICAgICAgIHJldHVybiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgICAgICAgICBzZiwgcG9zaXRpb24sIG5ldyBWaWV3RW5naW5lTFNSZXNvdXJjZVJlc29sdmVyKHRoaXMuaG9zdC50c0xzSG9zdCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXRUZW1wbGF0ZUhvdmVyKHRlbXBsYXRlSW5mbywgcG9zaXRpb24sIGFuYWx5emVkTW9kdWxlcyk7XG4gICAgfVxuXG4gICAgLy8gQXR0ZW1wdCB0byBnZXQgQW5ndWxhci1zcGVjaWZpYyBob3ZlciBpbmZvcm1hdGlvbiBpbiBhIFR5cGVTY3JpcHQgZmlsZSwgdGhlIE5nTW9kdWxlIGFcbiAgICAvLyBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gZ2V0VHNIb3Zlcihwb3NpdGlvbiwgZGVjbGFyYXRpb25zLCBhbmFseXplZE1vZHVsZXMpO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVmQW5kU3BhbiA9IHRoaXMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghZGVmQW5kU3Bhbj8uZGVmaW5pdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2RlZmluaXRpb25zfSA9IGRlZkFuZFNwYW47XG4gICAgY29uc3QgdHNEZWYgPSBkZWZpbml0aW9ucy5maW5kKGRlZiA9PiBkZWYuZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKTtcbiAgICBpZiAoIXRzRGVmKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmhvc3QudHNMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbih0c0RlZi5maWxlTmFtZSwgdHNEZWYudGV4dFNwYW4uc3RhcnQpO1xuICB9XG59XG5cbmNsYXNzIFZpZXdFbmdpbmVMU1Jlc291cmNlUmVzb2x2ZXIgaW1wbGVtZW50cyBSZXNvdXJjZVJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0KSB7fVxuXG4gIHJlc29sdmUoZmlsZTogc3RyaW5nLCBiYXNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBFeHRyYWN0IHVybCBwYXRoIHNwZWNpZmllZCBieSB0aGUgdXJsIG5vZGUsIHdoaWNoIGlzIHJlbGF0aXZlIHRvIHRoZSBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlXG4gICAgLy8gdGhlIHVybCBub2RlIGlzIGRlZmluZWQgaW4uXG4gICAgY29uc3QgdXJsID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShiYXNlUGF0aCksIGZpbGUpO1xuXG4gICAgLy8gSWYgdGhlIGZpbGUgZG9lcyBub3QgZXhpc3QsIGJhaWwuIEl0IGlzIHBvc3NpYmxlIHRoYXQgdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZSBob3N0XG4gICAgLy8gZG9lcyBub3QgaGF2ZSBhIGBmaWxlRXhpc3RzYCBtZXRob2QsIGluIHdoaWNoIGNhc2Ugb3B0aW1pc3RpY2FsbHkgYXNzdW1lIHRoZSBmaWxlIGV4aXN0cy5cbiAgICBpZiAodGhpcy5ob3N0LmZpbGVFeGlzdHMgJiYgIXRoaXMuaG9zdC5maWxlRXhpc3RzKHVybCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUmVzb3VyY2VSZXNvbHZlcjogY291bGQgbm90IHJlc29sdmUgJHt1cmx9IGluIGNvbnRleHQgb2YgJHtiYXNlUGF0aH0pYCk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH1cbn1cbiJdfQ==