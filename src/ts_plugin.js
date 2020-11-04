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
        ngLsHost === null || ngLsHost === void 0 ? void 0 : ngLsHost.getAnalyzedModules();
        return (ngLsHost === null || ngLsHost === void 0 ? void 0 : ngLsHost.getExternalTemplates()) || [];
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
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { 
            // Then override the methods supported by Angular language service
            getCompletionsAtPosition: getCompletionsAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getDefinitionAtPosition: getDefinitionAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition });
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFJSCxtRkFBeUQ7SUFDekQsaUZBQXdEO0lBRXhELDhFQUE4RTtJQUM5RSw4Q0FBOEM7SUFDOUMsSUFBTSxXQUFXLEdBQUcsSUFBSSxPQUFPLEVBQTZDLENBQUM7SUFFN0U7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMkI7UUFDMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN2QiwyRUFBMkU7WUFDM0UsbUJBQW1CO1lBQ25CLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxrQkFBa0IsR0FBRztRQUMvQixPQUFPLENBQUEsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLG9CQUFvQixPQUFNLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBVEQsNENBU0M7SUFFRCxTQUFnQixNQUFNLENBQUMsSUFBaUM7UUFDL0MsSUFBaUIsSUFBSSxHQUFvRCxJQUFJLGdCQUF4RCxFQUF1QixRQUFRLEdBQXFCLElBQUksb0JBQXpCLEVBQUUsTUFBTSxHQUFhLElBQUksT0FBakIsRUFBRSxPQUFPLEdBQUksSUFBSSxRQUFSLENBQVM7UUFDckYsdURBQXVEO1FBQ3ZELGtCQUFrQjtRQUNsQix1RUFBdUU7UUFDdkUsMkVBQTJFO1FBQzNFLDJEQUEyRDtRQUMzRCxrQkFBa0I7UUFDbEIsK0VBQStFO1FBQy9FLDRFQUE0RTtRQUM1RSxlQUFlO1FBQ2YsSUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLENBQUMs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QVMsMkJBQTJCLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjtZQUNyRSx5Q0FBeUM7WUFDekMsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUVELDZDQUVLLElBQUk7WUFDUCxrRUFBa0U7WUFDbEUsd0JBQXdCLDBCQUFBO1lBQ3hCLHNCQUFzQix3QkFBQTtZQUN0QixzQkFBc0Isd0JBQUE7WUFDdEIsdUJBQXVCLHlCQUFBO1lBQ3ZCLHlCQUF5QiwyQkFBQTtZQUN6QiwyQkFBMkIsNkJBQUEsSUFDM0I7SUFDSixDQUFDO0lBN0ZELHdCQTZGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtjcmVhdGVMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG4vLyBVc2UgYSBXZWFrTWFwIHRvIGtlZXAgdHJhY2sgb2YgUHJvamVjdCB0byBIb3N0IG1hcHBpbmcgc28gdGhhdCB3aGVuIFByb2plY3Rcbi8vIGlzIGRlbGV0ZWQgSG9zdCBjb3VsZCBiZSBnYXJiYWdlIGNvbGxlY3RlZC5cbmNvbnN0IFBST0pFQ1RfTUFQID0gbmV3IFdlYWtNYXA8dHNzLnNlcnZlci5Qcm9qZWN0LCBUeXBlU2NyaXB0U2VydmljZUhvc3Q+KCk7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYnkgdHNzZXJ2ZXIgdG8gcmV0cmlldmUgdGhlIGV4dGVybmFsIChub24tVFMpIGZpbGVzXG4gKiB0aGF0IHNob3VsZCBiZWxvbmcgdG8gdGhlIHNwZWNpZmllZCBgcHJvamVjdGAuIEZvciBBbmd1bGFyLCB0aGVzZSBmaWxlcyBhcmVcbiAqIGV4dGVybmFsIHRlbXBsYXRlcy4gVGhpcyBpcyBjYWxsZWQgb25jZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGxvYWRlZCwgdGhlblxuICogZXZlcnkgdGltZSB3aGVuIHRoZSBwcm9ncmFtIGlzIHVwZGF0ZWQuXG4gKiBAcGFyYW0gcHJvamVjdCBQcm9qZWN0IGZvciB3aGljaCBleHRlcm5hbCBmaWxlcyBzaG91bGQgYmUgcmV0cmlldmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0c3Muc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gIGlmICghcHJvamVjdC5oYXNSb290cygpKSB7XG4gICAgLy8gRHVyaW5nIHByb2plY3QgaW5pdGlhbGl6YXRpb24gd2hlcmUgdGhlcmUgaXMgbm8gcm9vdCBmaWxlcyB5ZXQgd2Ugc2hvdWxkXG4gICAgLy8gbm90IGRvIGFueSB3b3JrLlxuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBuZ0xzSG9zdCA9IFBST0pFQ1RfTUFQLmdldChwcm9qZWN0KTtcbiAgbmdMc0hvc3Q/LmdldEFuYWx5emVkTW9kdWxlcygpO1xuICByZXR1cm4gbmdMc0hvc3Q/LmdldEV4dGVybmFsVGVtcGxhdGVzKCkgfHwgW107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHNzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogdHNzLkxhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IHtsYW5ndWFnZVNlcnZpY2U6IHRzTFMsIGxhbmd1YWdlU2VydmljZUhvc3Q6IHRzTFNIb3N0LCBjb25maWcsIHByb2plY3R9ID0gaW5mbztcbiAgLy8gVGhpcyBwbHVnaW4gY291bGQgb3BlcmF0ZSB1bmRlciB0d28gZGlmZmVyZW50IG1vZGVzOlxuICAvLyAxLiBUUyArIEFuZ3VsYXJcbiAgLy8gICAgUGx1Z2luIGF1Z21lbnRzIFRTIGxhbmd1YWdlIHNlcnZpY2UgdG8gcHJvdmlkZSBhZGRpdGlvbmFsIEFuZ3VsYXJcbiAgLy8gICAgaW5mb3JtYXRpb24uIFRoaXMgb25seSB3b3JrcyB3aXRoIGlubGluZSB0ZW1wbGF0ZXMgYW5kIGlzIG1lYW50IHRvIGJlXG4gIC8vICAgIHVzZWQgYXMgYSBsb2NhbCBwbHVnaW4gKGNvbmZpZ3VyZWQgdmlhIHRzY29uZmlnLmpzb24pXG4gIC8vIDIuIEFuZ3VsYXIgb25seVxuICAvLyAgICBQbHVnaW4gb25seSBwcm92aWRlcyBpbmZvcm1hdGlvbiBvbiBBbmd1bGFyIHRlbXBsYXRlcywgbm8gVFMgaW5mbyBhdCBhbGwuXG4gIC8vICAgIFRoaXMgZWZmZWN0aXZlbHkgZGlzYWJsZXMgbmF0aXZlIFRTIGZlYXR1cmVzIGFuZCBpcyBtZWFudCBmb3IgaW50ZXJuYWxcbiAgLy8gICAgdXNlIG9ubHkuXG4gIGNvbnN0IGFuZ3VsYXJPbmx5ID0gY29uZmlnID8gY29uZmlnLmFuZ3VsYXJPbmx5ID09PSB0cnVlIDogZmFsc2U7XG4gIGNvbnN0IG5nTFNIb3N0ID0gbmV3IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCh0c0xTSG9zdCwgdHNMUyk7XG4gIGNvbnN0IG5nTFMgPSBjcmVhdGVMYW5ndWFnZVNlcnZpY2UobmdMU0hvc3QpO1xuICBQUk9KRUNUX01BUC5zZXQocHJvamVjdCwgbmdMU0hvc3QpO1xuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIG9wdGlvbnM6IHRzcy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCkge1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB0c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpO1xuICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5lbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5nTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZ0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IHRzcy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXN1bHRzLnB1c2goLi4udHNMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgfVxuICAgIC8vIEZvciBzZW1hbnRpYyBkaWFnbm9zdGljcyB3ZSBuZWVkIHRvIGNvbWJpbmUgYm90aCBUUyArIEFuZ3VsYXIgcmVzdWx0c1xuICAgIHJlc3VsdHMucHVzaCguLi5uZ0xTLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERlZmluaXRpb25BdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IFJlYWRvbmx5QXJyYXk8dHNzLkRlZmluaXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB0c0xTLmdldERlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVzdWx0cykge1xuICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5kZWZpbml0aW9ucyB8fCAhcmVzdWx0LmRlZmluaXRpb25zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0LmRlZmluaXRpb25zO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICAvLyBOb3QgaW1wbGVtZW50ZWQgaW4gVkUgTGFuZ3VhZ2UgU2VydmljZVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8vIEZpcnN0IGNsb25lIHRoZSBvcmlnaW5hbCBUUyBsYW5ndWFnZSBzZXJ2aWNlXG4gICAgLi4udHNMUyxcbiAgICAvLyBUaGVuIG92ZXJyaWRlIHRoZSBtZXRob2RzIHN1cHBvcnRlZCBieSBBbmd1bGFyIGxhbmd1YWdlIHNlcnZpY2VcbiAgICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24sXG4gICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbixcbiAgICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzLFxuICAgIGdldERlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4sXG4gICAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uLFxuICB9O1xufVxuIl19