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
        define("@angular/language-service/src/ts_plugin", ["require", "exports", "tslib", "@angular/language-service/src/language_service", "@angular/language-service/src/typescript_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.create = exports.getExternalFiles = void 0;
    var tslib_1 = require("tslib");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    // Use a WeakMap to keep track of Project to Host mapping so that when Project
    // is deleted Host could be garbage collected.
    var PROJECT_MAP = new WeakMap();
    /**
     * This function is called by tsserver to retrieve the external (non-TS) files
     * that should belong to the specified `project`. For Angular, these files are
     * external templates. This is called once when the project is loaded, then
     * every time when the program is updated.
     * @param project Project for which external files should be retrieved.
     */
    function getExternalFiles(project) {
        if (!project.hasRoots()) {
            // During project initialization where there is no root files yet we should
            // not do any work.
            return [];
        }
        var ngLsHost = PROJECT_MAP.get(project);
        if (ngLsHost === undefined) {
            return [];
        }
        ngLsHost.getAnalyzedModules();
        return ngLsHost.getExternalTemplates().filter(function (fileName) {
            // TODO(kyliau): Remove this when the following PR lands on the version of
            // TypeScript used in this repo.
            // https://github.com/microsoft/TypeScript/pull/41737
            return project.fileExists(fileName);
        });
    }
    exports.getExternalFiles = getExternalFiles;
    function create(info) {
        var tsLS = info.languageService, tsLSHost = info.languageServiceHost, config = info.config, project = info.project;
        // This plugin could operate under two different modes:
        // 1. TS + Angular
        //    Plugin augments TS language service to provide additional Angular
        //    information. This only works with inline templates and is meant to be
        //    used as a local plugin (configured via tsconfig.json)
        // 2. Angular only
        //    Plugin only provides information on Angular templates, no TS info at all.
        //    This effectively disables native TS features and is meant for internal
        //    use only.
        var angularOnly = config ? config.angularOnly === true : false;
        var ngLSHost = new typescript_host_1.TypeScriptServiceHost(tsLSHost, tsLS);
        var ngLS = language_service_1.createLanguageService(ngLSHost);
        PROJECT_MAP.set(project, ngLSHost);
        function getCompletionsAtPosition(fileName, position, options) {
            if (!angularOnly) {
                var results = tsLS.getCompletionsAtPosition(fileName, position, options);
                if (results && results.entries.length) {
                    // If TS could answer the query, then return results immediately.
                    return results;
                }
            }
            return ngLS.getCompletionsAtPosition(fileName, position, options);
        }
        function getQuickInfoAtPosition(fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getQuickInfoAtPosition(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            return ngLS.getQuickInfoAtPosition(fileName, position);
        }
        function getSemanticDiagnostics(fileName) {
            var results = [];
            if (!angularOnly) {
                results.push.apply(results, tslib_1.__spread(tsLS.getSemanticDiagnostics(fileName)));
            }
            // For semantic diagnostics we need to combine both TS + Angular results
            results.push.apply(results, tslib_1.__spread(ngLS.getSemanticDiagnostics(fileName)));
            return results;
        }
        function getDefinitionAtPosition(fileName, position) {
            if (!angularOnly) {
                var results = tsLS.getDefinitionAtPosition(fileName, position);
                if (results) {
                    // If TS could answer the query, then return results immediately.
                    return results;
                }
            }
            var result = ngLS.getDefinitionAndBoundSpan(fileName, position);
            if (!result || !result.definitions || !result.definitions.length) {
                return;
            }
            return result.definitions;
        }
        function getDefinitionAndBoundSpan(fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getDefinitionAndBoundSpan(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            return ngLS.getDefinitionAndBoundSpan(fileName, position);
        }
        function getTypeDefinitionAtPosition(fileName, position) {
            // Not implemented in VE Language Service
            return undefined;
        }
        function getReferencesAtPosition(fileName, position) {
            // Not implemented in VE Language Service
            return undefined;
        }
        function findRenameLocations(fileName, position, findInStrings, findInComments, providePrefixAndSuffixTextForRename) {
            // not implemented in VE Language Service
            return undefined;
        }
        function getTcb(fileName, position) {
            // Not implemented in VE Language Service
            return undefined;
        }
        function getComponentLocationsForTemplate(fileName) {
            // Not implemented in VE Language Service
            return [];
        }
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { 
            // Then override the methods supported by Angular language service
            getCompletionsAtPosition: getCompletionsAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getDefinitionAtPosition: getDefinitionAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getReferencesAtPosition: getReferencesAtPosition,
            findRenameLocations: findRenameLocations,
            getTcb: getTcb,
            getComponentLocationsForTemplate: getComponentLocationsForTemplate });
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFLSCxtRkFBeUQ7SUFDekQsaUZBQXdEO0lBRXhELDhFQUE4RTtJQUM5RSw4Q0FBOEM7SUFDOUMsSUFBTSxXQUFXLEdBQUcsSUFBSSxPQUFPLEVBQTZDLENBQUM7SUFFN0U7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMkI7UUFDMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN2QiwyRUFBMkU7WUFDM0UsbUJBQW1CO1lBQ25CLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtZQUMxQixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBQ0QsUUFBUSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDOUIsT0FBTyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxRQUFRO1lBQ3BELDBFQUEwRTtZQUMxRSxnQ0FBZ0M7WUFDaEMscURBQXFEO1lBQ3JELE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFqQkQsNENBaUJDO0lBRUQsU0FBZ0IsTUFBTSxDQUFDLElBQWlDO1FBQy9DLElBQWlCLElBQUksR0FBb0QsSUFBSSxnQkFBeEQsRUFBdUIsUUFBUSxHQUFxQixJQUFJLG9CQUF6QixFQUFFLE1BQU0sR0FBYSxJQUFJLE9BQWpCLEVBQUUsT0FBTyxHQUFJLElBQUksUUFBUixDQUFTO1FBQ3JGLHVEQUF1RDtR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SUFBSSxNQUFNLEVBQUU7b0JBQ1YsaUVBQWlFO29CQUNqRSxPQUFPLE1BQU0sQ0FBQztpQkFDZjthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxTQUFTLDJCQUEyQixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7WUFDckUseUNBQXlDO1lBQ3pDLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxTQUFTLHVCQUF1QixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7WUFDakUseUNBQXlDO1lBQ3pDLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxTQUFTLG1CQUFtQixDQUN4QixRQUFnQixFQUFFLFFBQWdCLEVBQUUsYUFBc0IsRUFBRSxjQUF1QixFQUNuRixtQ0FBNkM7WUFDL0MseUNBQXlDO1lBQ3pDLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCxTQUFTLE1BQU0sQ0FBQyxRQUFnQixFQUFFLFFBQWdCO1lBQ2hELHlDQUF5QztZQUN6QyxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxRQUFnQjtZQUN4RCx5Q0FBeUM7WUFDekMsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsNkNBRUssSUFBSTtZQUNQLGtFQUFrRTtZQUNsRSx3QkFBd0IsMEJBQUE7WUFDeEIsc0JBQXNCLHdCQUFBO1lBQ3RCLHNCQUFzQix3QkFBQTtZQUN0Qix1QkFBdUIseUJBQUE7WUFDdkIseUJBQXlCLDJCQUFBO1lBQ3pCLDJCQUEyQiw2QkFBQTtZQUMzQix1QkFBdUIseUJBQUE7WUFDdkIsbUJBQW1CLHFCQUFBO1lBQ25CLE1BQU0sUUFBQTtZQUNOLGdDQUFnQyxrQ0FBQSxJQUNoQztJQUNKLENBQUM7SUF2SEQsd0JBdUhDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtOZ0xhbmd1YWdlU2VydmljZX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtjcmVhdGVMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG4vLyBVc2UgYSBXZWFrTWFwIHRvIGtlZXAgdHJhY2sgb2YgUHJvamVjdCB0byBIb3N0IG1hcHBpbmcgc28gdGhhdCB3aGVuIFByb2plY3Rcbi8vIGlzIGRlbGV0ZWQgSG9zdCBjb3VsZCBiZSBnYXJiYWdlIGNvbGxlY3RlZC5cbmNvbnN0IFBST0pFQ1RfTUFQID0gbmV3IFdlYWtNYXA8dHNzLnNlcnZlci5Qcm9qZWN0LCBUeXBlU2NyaXB0U2VydmljZUhvc3Q+KCk7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYnkgdHNzZXJ2ZXIgdG8gcmV0cmlldmUgdGhlIGV4dGVybmFsIChub24tVFMpIGZpbGVzXG4gKiB0aGF0IHNob3VsZCBiZWxvbmcgdG8gdGhlIHNwZWNpZmllZCBgcHJvamVjdGAuIEZvciBBbmd1bGFyLCB0aGVzZSBmaWxlcyBhcmVcbiAqIGV4dGVybmFsIHRlbXBsYXRlcy4gVGhpcyBpcyBjYWxsZWQgb25jZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGxvYWRlZCwgdGhlblxuICogZXZlcnkgdGltZSB3aGVuIHRoZSBwcm9ncmFtIGlzIHVwZGF0ZWQuXG4gKiBAcGFyYW0gcHJvamVjdCBQcm9qZWN0IGZvciB3aGljaCBleHRlcm5hbCBmaWxlcyBzaG91bGQgYmUgcmV0cmlldmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0c3Muc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gIGlmICghcHJvamVjdC5oYXNSb290cygpKSB7XG4gICAgLy8gRHVyaW5nIHByb2plY3QgaW5pdGlhbGl6YXRpb24gd2hlcmUgdGhlcmUgaXMgbm8gcm9vdCBmaWxlcyB5ZXQgd2Ugc2hvdWxkXG4gICAgLy8gbm90IGRvIGFueSB3b3JrLlxuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBuZ0xzSG9zdCA9IFBST0pFQ1RfTUFQLmdldChwcm9qZWN0KTtcbiAgaWYgKG5nTHNIb3N0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgbmdMc0hvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7XG4gIHJldHVybiBuZ0xzSG9zdC5nZXRFeHRlcm5hbFRlbXBsYXRlcygpLmZpbHRlcihmaWxlTmFtZSA9PiB7XG4gICAgLy8gVE9ETyhreWxpYXUpOiBSZW1vdmUgdGhpcyB3aGVuIHRoZSBmb2xsb3dpbmcgUFIgbGFuZHMgb24gdGhlIHZlcnNpb24gb2ZcbiAgICAvLyBUeXBlU2NyaXB0IHVzZWQgaW4gdGhpcyByZXBvLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9wdWxsLzQxNzM3XG4gICAgcmV0dXJuIHByb2plY3QuZmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGluZm86IHRzcy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qge2xhbmd1YWdlU2VydmljZTogdHNMUywgbGFuZ3VhZ2VTZXJ2aWNlSG9zdDogdHNMU0hvc3QsIGNvbmZpZywgcHJvamVjdH0gPSBpbmZvO1xuICAvLyBUaGlzIHBsdWdpbiBjb3VsZCBvcGVyYXRlIHVuZGVyIHR3byBkaWZmZXJlbnQgbW9kZXM6XG4gIC8vIDEuIFRTICsgQW5ndWxhclxuICAvLyAgICBQbHVnaW4gYXVnbWVudHMgVFMgbGFuZ3VhZ2Ugc2VydmljZSB0byBwcm92aWRlIGFkZGl0aW9uYWwgQW5ndWxhclxuICAvLyAgICBpbmZvcm1hdGlvbi4gVGhpcyBvbmx5IHdvcmtzIHdpdGggaW5saW5lIHRlbXBsYXRlcyBhbmQgaXMgbWVhbnQgdG8gYmVcbiAgLy8gICAgdXNlZCBhcyBhIGxvY2FsIHBsdWdpbiAoY29uZmlndXJlZCB2aWEgdHNjb25maWcuanNvbilcbiAgLy8gMi4gQW5ndWxhciBvbmx5XG4gIC8vICAgIFBsdWdpbiBvbmx5IHByb3ZpZGVzIGluZm9ybWF0aW9uIG9uIEFuZ3VsYXIgdGVtcGxhdGVzLCBubyBUUyBpbmZvIGF0IGFsbC5cbiAgLy8gICAgVGhpcyBlZmZlY3RpdmVseSBkaXNhYmxlcyBuYXRpdmUgVFMgZmVhdHVyZXMgYW5kIGlzIG1lYW50IGZvciBpbnRlcm5hbFxuICAvLyAgICB1c2Ugb25seS5cbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWcgPyBjb25maWcuYW5ndWxhck9ubHkgPT09IHRydWUgOiBmYWxzZTtcbiAgY29uc3QgbmdMU0hvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KHRzTFNIb3N0LCB0c0xTKTtcbiAgY29uc3QgbmdMUyA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShuZ0xTSG9zdCk7XG4gIFBST0pFQ1RfTUFQLnNldChwcm9qZWN0LCBuZ0xTSG9zdCk7XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgb3B0aW9uczogdHNzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8dW5kZWZpbmVkKSB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IHRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzLmVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5nTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nKTogdHNzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcmVzdWx0czogdHNzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCguLi50c0xTLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcbiAgICB9XG4gICAgLy8gRm9yIHNlbWFudGljIGRpYWdub3N0aWNzIHdlIG5lZWQgdG8gY29tYmluZSBib3RoIFRTICsgQW5ndWxhciByZXN1bHRzXG4gICAgcmVzdWx0cy5wdXNoKC4uLm5nTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogUmVhZG9ubHlBcnJheTx0c3MuRGVmaW5pdGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IHRzTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBuZ0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LmRlZmluaXRpb25zIHx8ICFyZXN1bHQuZGVmaW5pdGlvbnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQuZGVmaW5pdGlvbnM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcikge1xuICAgIC8vIE5vdCBpbXBsZW1lbnRlZCBpbiBWRSBMYW5ndWFnZSBTZXJ2aWNlXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAvLyBOb3QgaW1wbGVtZW50ZWQgaW4gVkUgTGFuZ3VhZ2UgU2VydmljZVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kUmVuYW1lTG9jYXRpb25zKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZmluZEluU3RyaW5nczogYm9vbGVhbiwgZmluZEluQ29tbWVudHM6IGJvb2xlYW4sXG4gICAgICBwcm92aWRlUHJlZml4QW5kU3VmZml4VGV4dEZvclJlbmFtZT86IGJvb2xlYW4pOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgLy8gbm90IGltcGxlbWVudGVkIGluIFZFIExhbmd1YWdlIFNlcnZpY2VcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGNiKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAvLyBOb3QgaW1wbGVtZW50ZWQgaW4gVkUgTGFuZ3VhZ2UgU2VydmljZVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gTm90IGltcGxlbWVudGVkIGluIFZFIExhbmd1YWdlIFNlcnZpY2VcbiAgICByZXR1cm4gW107XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8vIEZpcnN0IGNsb25lIHRoZSBvcmlnaW5hbCBUUyBsYW5ndWFnZSBzZXJ2aWNlXG4gICAgLi4udHNMUyxcbiAgICAvLyBUaGVuIG92ZXJyaWRlIHRoZSBtZXRob2RzIHN1cHBvcnRlZCBieSBBbmd1bGFyIGxhbmd1YWdlIHNlcnZpY2VcbiAgICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24sXG4gICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbixcbiAgICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzLFxuICAgIGdldERlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4sXG4gICAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uLFxuICAgIGZpbmRSZW5hbWVMb2NhdGlvbnMsXG4gICAgZ2V0VGNiLFxuICAgIGdldENvbXBvbmVudExvY2F0aW9uc0ZvclRlbXBsYXRlLFxuICB9O1xufVxuIl19