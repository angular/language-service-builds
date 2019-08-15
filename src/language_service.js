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
                    var ast = this.host.getTemplateAst(template, fileName);
                    results.push.apply(results, tslib_1.__spread(diagnostics_1.getTemplateDiagnostics(template, ast)));
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
                results.push.apply(results, tslib_1.__spread(diagnostics_1.getDeclarationDiagnostics(declarations, analyzedModules)));
            }
            if (!results.length) {
                return [];
            }
            var sourceFile = fileName.endsWith('.ts') ? this.host.getSourceFile(fileName) : undefined;
            return diagnostics_1.uniqueBySpan(results).map(function (d) { return diagnostics_1.ngDiagnosticToTsDiagnostic(d, sourceFile); });
        };
        LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (!templateInfo) {
                return;
            }
            var results = completions_1.getTemplateCompletions(templateInfo);
            if (!results || !results.length) {
                return;
            }
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: results.map(completions_1.ngCompletionToTsCompletionEntry),
            };
        };
        LanguageServiceImpl.prototype.getDefinitionAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return definitions_1.getDefinitionAndBoundSpan(templateInfo);
            }
        };
        LanguageServiceImpl.prototype.getHoverAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return hover_1.getHover(templateInfo);
            }
        };
        return LanguageServiceImpl;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gseUVBQXNGO0lBQ3RGLHlFQUF3RDtJQUN4RCx5RUFBMEg7SUFDMUgsNkRBQWlDO0lBSWpDOzs7O09BSUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUEyQjtRQUMvRCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHNEQUVDO0lBRUQ7UUFDRSw2QkFBNkIsSUFBMkI7WUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFBRyxDQUFDO1FBRTVELG1EQUFxQixHQUFyQjtZQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFFLHFDQUFxQztZQUN0RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUMzQyxDQUFDO1FBRUQsNENBQWMsR0FBZCxVQUFlLFFBQWdCOztZQUM3QixJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDOUYsSUFBTSxPQUFPLEdBQWlCLEVBQUUsQ0FBQztZQUNqQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQ25ELEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUN6RCxPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMsb0NBQXNCLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFFO2lCQUN4RDs7Ozs7Ozs7O1lBQ0QsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekQsSUFBSSxZQUFZLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtnQkFDdkMsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLHVDQUF5QixDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsR0FBRTthQUMzRTtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNuQixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUM1RixPQUFPLDBCQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsd0NBQTBCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUF6QyxDQUF5QyxDQUFDLENBQUM7UUFDbkYsQ0FBQztRQUVELDhDQUFnQixHQUFoQixVQUFpQixRQUFnQixFQUFFLFFBQWdCO1lBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFFLHFDQUFxQztZQUN0RSxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUNqQixPQUFPO2FBQ1I7WUFDRCxJQUFNLE9BQU8sR0FBRyxvQ0FBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDL0IsT0FBTzthQUNSO1lBQ0QsT0FBTztnQkFDTCxrQkFBa0IsRUFBRSxLQUFLO2dCQUN6QixrQkFBa0IsRUFBRSxLQUFLO2dCQUN6Qix1QkFBdUIsRUFBRSxLQUFLO2dCQUM5QixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBK0IsQ0FBQzthQUN0RCxDQUFDO1FBQ0osQ0FBQztRQUVELDZDQUFlLEdBQWYsVUFBZ0IsUUFBZ0IsRUFBRSxRQUFnQjtZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDdEUsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUUsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLE9BQU8sdUNBQXlCLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDaEQ7UUFDSCxDQUFDO1FBRUQsd0NBQVUsR0FBVixVQUFXLFFBQWdCLEVBQUUsUUFBZ0I7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUUscUNBQXFDO1lBQ3RFLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzVFLElBQUksWUFBWSxFQUFFO2dCQUNoQixPQUFPLGdCQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDL0I7UUFDSCxDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBNURELElBNERDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7Z2V0VGVtcGxhdGVDb21wbGV0aW9ucywgbmdDb21wbGV0aW9uVG9Uc0NvbXBsZXRpb25FbnRyeX0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge2dldERlZmluaXRpb25BbmRCb3VuZFNwYW59IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzLCBnZXRUZW1wbGF0ZURpYWdub3N0aWNzLCBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpYywgdW5pcXVlQnlTcGFufSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0SG92ZXJ9IGZyb20gJy4vaG92ZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljLCBMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcmV0dXJuIG5ldyBMYW5ndWFnZVNlcnZpY2VJbXBsKGhvc3QpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVNlcnZpY2VJbXBsIGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QpIHt9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgcmV0dXJuIHRoaXMuaG9zdC5nZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlcyhmaWxlTmFtZSk7XG4gICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgIGNvbnN0IGFzdCA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSwgZmlsZU5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLmdldFRlbXBsYXRlRGlhZ25vc3RpY3ModGVtcGxhdGUsIGFzdCkpO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zICYmIGRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdHMucHVzaCguLi5nZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKGRlY2xhcmF0aW9ucywgYW5hbHl6ZWRNb2R1bGVzKSk7XG4gICAgfVxuICAgIGlmICghcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdW5pcXVlQnlTcGFuKHJlc3VsdHMpLm1hcChkID0+IG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKGQsIHNvdXJjZUZpbGUpKTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5Db21wbGV0aW9uSW5mb3x1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCF0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IGdldFRlbXBsYXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICBpZiAoIXJlc3VsdHMgfHwgIXJlc3VsdHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMubWFwKG5nQ29tcGxldGlvblRvVHNDb21wbGV0aW9uRW50cnkpLFxuICAgIH07XG4gIH1cblxuICBnZXREZWZpbml0aW9uQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4odGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cblxuICBnZXRIb3ZlckF0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgdGhpcy5ob3N0LmdldEFuYWx5emVkTW9kdWxlcygpOyAgLy8gc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJ1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0SG92ZXIodGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==