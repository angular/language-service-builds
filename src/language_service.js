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
            return uniqueBySpan(results).map(function (d) { return diagnostics_1.ngDiagnosticToTsDiagnostic(d, sourceFile); });
        };
        LanguageServiceImpl.prototype.getPipesAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return templateInfo.pipes;
            }
            return [];
        };
        LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
            this.host.getAnalyzedModules(); // same role as 'synchronizeHostData'
            var templateInfo = this.host.getTemplateAstAtPosition(fileName, position);
            if (templateInfo) {
                return completions_1.getTemplateCompletions(templateInfo);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBS0gseUVBQXFEO0lBQ3JELHlFQUF3RDtJQUN4RCx5RUFBNEc7SUFDNUcsNkRBQWlDO0lBS2pDOzs7O09BSUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUEyQjtRQUMvRCxPQUFPLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUZELHNEQUVDO0lBRUQ7UUFDRSw2QkFBNkIsSUFBMkI7WUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFBRyxDQUFDO1FBRTVELG1EQUFxQixHQUFyQjtZQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFFLHFDQUFxQztZQUN0RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUMzQyxDQUFDO1FBRUQsNENBQWMsR0FBZCxVQUFlLFFBQWdCOztZQUM3QixJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxxQ0FBcUM7WUFDOUYsSUFBTSxPQUFPLEdBQWlCLEVBQUUsQ0FBQztZQUNqQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQ25ELEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUN6RCxPQUFP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Z0JBQ1QsSUFBQSxtQkFBSSxDQUFZO2dCQUN2QixJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDUixHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUMxQjtnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN0QjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVQaXBlU3VtbWFyeX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7Z2V0VGVtcGxhdGVDb21wbGV0aW9uc30gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge2dldERlZmluaXRpb25BbmRCb3VuZFNwYW59IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzLCBnZXRUZW1wbGF0ZURpYWdub3N0aWNzLCBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEhvdmVyfSBmcm9tICcuL2hvdmVyJztcbmltcG9ydCB7Q29tcGxldGlvbiwgRGlhZ25vc3RpYywgTGFuZ3VhZ2VTZXJ2aWNlLCBTcGFufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5cblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYW4gQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2UoaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcmV0dXJuIG5ldyBMYW5ndWFnZVNlcnZpY2VJbXBsKGhvc3QpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVNlcnZpY2VJbXBsIGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QpIHt9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgcmV0dXJuIHRoaXMuaG9zdC5nZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgcmVzdWx0czogRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgdGVtcGxhdGVzID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlcyhmaWxlTmFtZSk7XG4gICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgIGNvbnN0IGFzdCA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSwgZmlsZU5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLmdldFRlbXBsYXRlRGlhZ25vc3RpY3ModGVtcGxhdGUsIGFzdCkpO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zICYmIGRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdHMucHVzaCguLi5nZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKGRlY2xhcmF0aW9ucywgYW5hbHl6ZWRNb2R1bGVzKSk7XG4gICAgfVxuICAgIGlmICghcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdW5pcXVlQnlTcGFuKHJlc3VsdHMpLm1hcChkID0+IG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKGQsIHNvdXJjZUZpbGUpKTtcbiAgfVxuXG4gIGdldFBpcGVzQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IENvbXBpbGVQaXBlU3VtbWFyeVtdIHtcbiAgICB0aGlzLmhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7ICAvLyBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnXG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gdGhpcy5ob3N0LmdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8pIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZUluZm8ucGlwZXM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IENvbXBsZXRpb25bXXx1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldFRlbXBsYXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cblxuICBnZXREZWZpbml0aW9uQXQoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIHRoaXMuaG9zdC5nZXRBbmFseXplZE1vZHVsZXMoKTsgIC8vIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YSdcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgcmV0dXJuIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4odGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cblxuICBnZXRIb3ZlckF0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgdGhpcy5ob3N0LmdldEFuYWx5emVkTW9kdWxlcygpOyAgLy8gc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJ1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvKSB7XG4gICAgICByZXR1cm4gZ2V0SG92ZXIodGVtcGxhdGVJbmZvKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5pcXVlQnlTcGFuPFQgZXh0ZW5kc3tzcGFuOiBTcGFufT4oZWxlbWVudHM6IFRbXSk6IFRbXSB7XG4gIGNvbnN0IHJlc3VsdDogVFtdID0gW107XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgY29uc3Qge3NwYW59ID0gZWxlbWVudDtcbiAgICBsZXQgc2V0ID0gbWFwLmdldChzcGFuLnN0YXJ0KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgc2V0ID0gbmV3IFNldCgpO1xuICAgICAgbWFwLnNldChzcGFuLnN0YXJ0LCBzZXQpO1xuICAgIH1cbiAgICBpZiAoIXNldC5oYXMoc3Bhbi5lbmQpKSB7XG4gICAgICBzZXQuYWRkKHNwYW4uZW5kKTtcbiAgICAgIHJlc3VsdC5wdXNoKGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19