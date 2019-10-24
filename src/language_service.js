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
        define("@angular/language-service/src/language_service", ["require", "exports", "tslib", "@angular/language-service/src/common", "@angular/language-service/src/completions", "@angular/language-service/src/definitions", "@angular/language-service/src/diagnostics", "@angular/language-service/src/hover"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var common_1 = require("@angular/language-service/src/common");
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
        LanguageServiceImpl.prototype.getTemplateReferences = function () {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            return this.host.getTemplateReferences();
        };
        LanguageServiceImpl.prototype.getDiagnostics = function (fileName) {
            var e_1, _a;
            var analyzedModules = this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var results = [];
            var templates = this.host.getTemplates(fileName);
            try {
                for (var templates_1 = tslib_1.__values(templates), templates_1_1 = templates_1.next(); !templates_1_1.done; templates_1_1 = templates_1.next()) {
                    var template = templates_1_1.value;
                    var astOrDiagnostic = this.host.getTemplateAst(template);
                    if (common_1.isAstResult(astOrDiagnostic)) {
                        results.push.apply(results, tslib_1.__spread(diagnostics_1.getTemplateDiagnostics(astOrDiagnostic)));
                    }
                    else {
                        results.push(astOrDiagnostic);
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
        LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
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
        LanguageServiceImpl.prototype.getDefinitionAt = function (fileName, position) {
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
        LanguageServiceImpl.prototype.getHoverAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return hover_1.getHover(templateInfo, position, this.host);
            }
            // Attempt to get Angular-specific hover information in a TypeScript file, the NgModule a
            // directive belongs to.
            if (fileName.endsWith('.ts')) {
                var sf = this.host.getSourceFile(fileName);
                if (sf) {
                    return hover_1.getTsHover(sf, position, this.host);
                }
            }
        };
        return LanguageServiceImpl;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsK0RBQXFDO0lBQ3JDLHlFQUFxRDtJQUNyRCx5RUFBcUY7SUFDckYseUVBQTBIO0lBQzFILDZEQUE2QztJQUk3Qzs7OztPQUlHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBMkI7UUFDL0QsT0FBTyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFGRCxzREFFQztJQUVEO1FBQ0UsNkJBQTZCLElBQTJCO1lBQTNCLFNBQUksR0FBSixJQUFJLENBQXVCO1FBQUcsQ0FBQztRQUU1RCxtREFBcUIsR0FBckI7WUFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDdEUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUVELDRDQUFjLEdBQWQsVUFBZSxRQUFnQjs7WUFDN0IsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUUscUNBQXFDO1lBQzlGLElBQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7WUFDakMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7O2dCQUVuRCxLQUF1QixJQUFBLGNBQUEsaUJBQUEsU0FBUyxDQUFBLG9DQUFBLDJEQUFFO29CQUE3QixJQUFNLFFBQVEsc0JBQUE7b0JBQ2pCLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMzRCxJ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QzVFLElBQUksWUFBWSxFQUFFO2dCQUNoQixPQUFPLGdCQUFRLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEQ7WUFFRCx5RkFBeUY7WUFDekYsd0JBQXdCO1lBQ3hCLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDNUIsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzdDLElBQUksRUFBRSxFQUFFO29CQUNOLE9BQU8sa0JBQVUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDNUM7YUFDRjtRQUNILENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUFuRkQsSUFtRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5pbXBvcnQge2lzQXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldFRlbXBsYXRlQ29tcGxldGlvbnN9IGZyb20gJy4vY29tcGxldGlvbnMnO1xuaW1wb3J0IHtnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLCBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW59IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzLCBnZXRUZW1wbGF0ZURpYWdub3N0aWNzLCBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpYywgdW5pcXVlQnlTcGFufSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0SG92ZXIsIGdldFRzSG92ZXJ9IGZyb20gJy4vaG92ZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljLCBMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcmV0dXJuIG5ldyBMYW5ndWFnZVNlcnZpY2VJbXBsKGhvc3QpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVNlcnZpY2VJbXBsIGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QpIHt9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgcmV0dXJuIHRoaXMuaG9zdC5nZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlcyhmaWxlTmFtZSk7XG5cbiAgICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIHRlbXBsYXRlcykge1xuICAgICAgY29uc3QgYXN0T3JEaWFnbm9zdGljID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlKTtcbiAgICAgIGlmIChpc0FzdFJlc3VsdChhc3RPckRpYWdub3N0aWMpKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKGFzdE9yRGlhZ25vc3RpYykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFzdE9yRGlhZ25vc3RpYyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9ucyhmaWxlTmFtZSk7XG4gICAgaWYgKGRlY2xhcmF0aW9ucyAmJiBkZWNsYXJhdGlvbnMubGVuZ3RoKSB7XG4gICAgICByZXN1bHRzLnB1c2goLi4uZ2V0RGVjbGFyYXRpb25EaWFnbm9zdGljcyhkZWNsYXJhdGlvbnMsIGFuYWx5emVkTW9kdWxlcywgdGhpcy5ob3N0KSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdW5pcXVlQnlTcGFuKHJlc3VsdHMpLm1hcChkID0+IG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKGQsIHNvdXJjZUZpbGUpKTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5Db21wbGV0aW9uSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IGdldFRlbXBsYXRlQ29tcGxldGlvbnMoYXN0LCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICAvLyBDYXN0IENvbXBsZXRpb25FbnRyeS5raW5kIGZyb20gbmcuQ29tcGxldGlvbktpbmQgdG8gdHMuU2NyaXB0RWxlbWVudEtpbmRcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMgYXMgdW5rbm93biBhcyB0cy5Db21wbGV0aW9uRW50cnlbXSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgdG8gZ2V0IEFuZ3VsYXItc3BlY2lmaWMgZGVmaW5pdGlvbnMgaW4gYSBUeXBlU2NyaXB0IGZpbGUsIGxpa2UgdGVtcGxhdGVzIGRlZmluZWRcbiAgICAvLyBpbiBhIGB0ZW1wbGF0ZVVybGAgcHJvcGVydHkuXG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgY29uc3Qgc2YgPSB0aGlzLmhvc3QuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc2YpIHtcbiAgICAgICAgcmV0dXJuIGdldFRzRGVmaW5pdGlvbkFuZEJvdW5kU3BhbihzZiwgcG9zaXRpb24sIHRoaXMuaG9zdC50c0xzSG9zdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0SG92ZXJBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldEhvdmVyKHRlbXBsYXRlSW5mbywgcG9zaXRpb24sIHRoaXMuaG9zdCk7XG4gICAgfVxuXG4gICAgLy8gQXR0ZW1wdCB0byBnZXQgQW5ndWxhci1zcGVjaWZpYyBob3ZlciBpbmZvcm1hdGlvbiBpbiBhIFR5cGVTY3JpcHQgZmlsZSwgdGhlIE5nTW9kdWxlIGFcbiAgICAvLyBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICBjb25zdCBzZiA9IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzZikge1xuICAgICAgICByZXR1cm4gZ2V0VHNIb3ZlcihzZiwgcG9zaXRpb24sIHRoaXMuaG9zdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=