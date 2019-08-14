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
        define("@angular/language-service/src/ts_plugin", ["require", "exports", "tslib", "@angular/language-service/src/language_service", "@angular/language-service/src/typescript_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    var projectHostMap = new WeakMap();
    function getExternalFiles(project) {
        var host = projectHostMap.get(project);
        if (host) {
            host.getAnalyzedModules();
            var externalFiles = host.getTemplateReferences();
            return externalFiles;
        }
    }
    exports.getExternalFiles = getExternalFiles;
    function completionToEntry(c) {
        return {
            // TODO: remove any and fix type error.
            kind: c.kind,
            name: c.name,
            sortText: c.sort,
            kindModifiers: ''
        };
    }
    function create(info) {
        var project = info.project, tsLS = info.languageService, tsLSHost = info.languageServiceHost, config = info.config;
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
        projectHostMap.set(project, ngLSHost);
        function getCompletionsAtPosition(fileName, position, options) {
            if (!angularOnly) {
                var results_1 = tsLS.getCompletionsAtPosition(fileName, position, options);
                if (results_1 && results_1.entries.length) {
                    // If TS could answer the query, then return results immediately.
                    return results_1;
                }
            }
            var results = ngLS.getCompletionsAt(fileName, position);
            if (!results || !results.length) {
                return;
            }
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: results.map(completionToEntry),
            };
        }
        function getQuickInfoAtPosition(fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getQuickInfoAtPosition(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            return ngLS.getHoverAt(fileName, position);
        }
        function getSemanticDiagnostics(fileName) {
            var results = [];
            if (!angularOnly) {
                results.push.apply(results, tslib_1.__spread(tsLS.getSemanticDiagnostics(fileName)));
            }
            // For semantic diagnostics we need to combine both TS + Angular results
            results.push.apply(results, tslib_1.__spread(ngLS.getDiagnostics(fileName)));
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
            var result = ngLS.getDefinitionAt(fileName, position);
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
            return ngLS.getDefinitionAt(fileName, position);
        }
        var proxy = Object.assign(
        // First clone the original TS language service
        {}, tsLS, 
        // Then override the methods supported by Angular language service
        {
            getCompletionsAtPosition: getCompletionsAtPosition, getQuickInfoAtPosition: getQuickInfoAtPosition, getSemanticDiagnostics: getSemanticDiagnostics,
            getDefinitionAtPosition: getDefinitionAtPosition, getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
        });
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILG1GQUF5RDtJQUV6RCxpRkFBd0Q7SUFFeEQsSUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLEVBQTZDLENBQUM7SUFFaEYsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMkI7UUFDMUQsSUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxJQUFJLElBQUksRUFBRTtZQUNSLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzFCLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ25ELE9BQU8sYUFBYSxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQztJQVBELDRDQU9DO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFhO1FBQ3RDLE9BQU87WUFDTCx1Q0FBdUM7WUFDdkMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFXO1lBQ25CLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtZQUNaLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSTtZQUNoQixhQUFhLEVBQUUsRUFBRTtTQUNsQixDQUFDO0lBQ0osQ0FBQztJQUVELFNBQWdCLE1BQU0sQ0FBQyxJQUFpQztRQUMvQyxJQUFBLHNCQUFPLEVBQUUsMkJBQXFCLEVBQUUsbUNBQTZCLEVBQUUsb0JBQU0sQ0FBUztRQUNyRix1REFBdUQ7UUFDdkQsa0JBQWtCO1FBQ2xCLHVFQUF1RTtRQUN2RSwyRUFBMkU7UUFDM0UsMkRBQTJEO1FBQzNELGtCQUFrQjtRQUNsQiwrRUFBK0U7UUFDL0UsNEVBQTRFO1FBQzVFLGVBQWU7UUFDZixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFD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QUFNLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsaUVBQWlFO29CQUNqRSxPQUFPLE1BQU0sQ0FBQztpQkFDZjthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBTSxLQUFLLEdBQXdCLE1BQU0sQ0FBQyxNQUFNO1FBQzVDLCtDQUErQztRQUMvQyxFQUFFLEVBQUUsSUFBSTtRQUNSLGtFQUFrRTtRQUNsRTtZQUNJLHdCQUF3QiwwQkFBQSxFQUFFLHNCQUFzQix3QkFBQSxFQUFFLHNCQUFzQix3QkFBQTtZQUN4RSx1QkFBdUIseUJBQUEsRUFBRSx5QkFBeUIsMkJBQUE7U0FDckQsQ0FBQyxDQUFDO1FBQ1AsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBaEdELHdCQWdHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHVzZWQgYXMgdmFsdWUsIHBhc3NlZCBpbiBieSB0c3NlcnZlciBhdCBydW50aW1lXG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JzsgLy8gdXNlZCBhcyB0eXBlIG9ubHlcblxuaW1wb3J0IHtjcmVhdGVMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5pbXBvcnQge0NvbXBsZXRpb259IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuY29uc3QgcHJvamVjdEhvc3RNYXAgPSBuZXcgV2Vha01hcDx0c3Muc2VydmVyLlByb2plY3QsIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogdHNzLnNlcnZlci5Qcm9qZWN0KTogc3RyaW5nW118dW5kZWZpbmVkIHtcbiAgY29uc3QgaG9zdCA9IHByb2plY3RIb3N0TWFwLmdldChwcm9qZWN0KTtcbiAgaWYgKGhvc3QpIHtcbiAgICBob3N0LmdldEFuYWx5emVkTW9kdWxlcygpO1xuICAgIGNvbnN0IGV4dGVybmFsRmlsZXMgPSBob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpO1xuICAgIHJldHVybiBleHRlcm5hbEZpbGVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRpb25Ub0VudHJ5KGM6IENvbXBsZXRpb24pOiB0c3MuQ29tcGxldGlvbkVudHJ5IHtcbiAgcmV0dXJuIHtcbiAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICBraW5kOiBjLmtpbmQgYXMgYW55LFxuICAgIG5hbWU6IGMubmFtZSxcbiAgICBzb3J0VGV4dDogYy5zb3J0LFxuICAgIGtpbmRNb2RpZmllcnM6ICcnXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHNzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogdHNzLkxhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IHtwcm9qZWN0LCBsYW5ndWFnZVNlcnZpY2U6IHRzTFMsIGxhbmd1YWdlU2VydmljZUhvc3Q6IHRzTFNIb3N0LCBjb25maWd9ID0gaW5mbztcbiAgLy8gVGhpcyBwbHVnaW4gY291bGQgb3BlcmF0ZSB1bmRlciB0d28gZGlmZmVyZW50IG1vZGVzOlxuICAvLyAxLiBUUyArIEFuZ3VsYXJcbiAgLy8gICAgUGx1Z2luIGF1Z21lbnRzIFRTIGxhbmd1YWdlIHNlcnZpY2UgdG8gcHJvdmlkZSBhZGRpdGlvbmFsIEFuZ3VsYXJcbiAgLy8gICAgaW5mb3JtYXRpb24uIFRoaXMgb25seSB3b3JrcyB3aXRoIGlubGluZSB0ZW1wbGF0ZXMgYW5kIGlzIG1lYW50IHRvIGJlXG4gIC8vICAgIHVzZWQgYXMgYSBsb2NhbCBwbHVnaW4gKGNvbmZpZ3VyZWQgdmlhIHRzY29uZmlnLmpzb24pXG4gIC8vIDIuIEFuZ3VsYXIgb25seVxuICAvLyAgICBQbHVnaW4gb25seSBwcm92aWRlcyBpbmZvcm1hdGlvbiBvbiBBbmd1bGFyIHRlbXBsYXRlcywgbm8gVFMgaW5mbyBhdCBhbGwuXG4gIC8vICAgIFRoaXMgZWZmZWN0aXZlbHkgZGlzYWJsZXMgbmF0aXZlIFRTIGZlYXR1cmVzIGFuZCBpcyBtZWFudCBmb3IgaW50ZXJuYWxcbiAgLy8gICAgdXNlIG9ubHkuXG4gIGNvbnN0IGFuZ3VsYXJPbmx5ID0gY29uZmlnID8gY29uZmlnLmFuZ3VsYXJPbmx5ID09PSB0cnVlIDogZmFsc2U7XG4gIGNvbnN0IG5nTFNIb3N0ID0gbmV3IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCh0c0xTSG9zdCwgdHNMUyk7XG4gIGNvbnN0IG5nTFMgPSBjcmVhdGVMYW5ndWFnZVNlcnZpY2UobmdMU0hvc3QpO1xuICBwcm9qZWN0SG9zdE1hcC5zZXQocHJvamVjdCwgbmdMU0hvc3QpO1xuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBvcHRpb25zOiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9ucyB8IHVuZGVmaW5lZCkge1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB0c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpO1xuICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5lbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9IG5nTFMuZ2V0Q29tcGxldGlvbnNBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghcmVzdWx0cyB8fCAhcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgICAgZW50cmllczogcmVzdWx0cy5tYXAoY29tcGxldGlvblRvRW50cnkpLFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZ0xTLmdldEhvdmVyQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IHRzcy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXN1bHRzLnB1c2goLi4udHNMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgfVxuICAgIC8vIEZvciBzZW1hbnRpYyBkaWFnbm9zdGljcyB3ZSBuZWVkIHRvIGNvbWJpbmUgYm90aCBUUyArIEFuZ3VsYXIgcmVzdWx0c1xuICAgIHJlc3VsdHMucHVzaCguLi5uZ0xTLmdldERpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXREZWZpbml0aW9uQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBSZWFkb25seUFycmF5PHRzcy5EZWZpbml0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gdHNMUy5nZXREZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdHMpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IG5nTFMuZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5kZWZpbml0aW9ucyB8fCAhcmVzdWx0LmRlZmluaXRpb25zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0LmRlZmluaXRpb25zO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0c3MuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5nTFMuZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICBjb25zdCBwcm94eTogdHNzLkxhbmd1YWdlU2VydmljZSA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAvLyBGaXJzdCBjbG9uZSB0aGUgb3JpZ2luYWwgVFMgbGFuZ3VhZ2Ugc2VydmljZVxuICAgICAge30sIHRzTFMsXG4gICAgICAvLyBUaGVuIG92ZXJyaWRlIHRoZSBtZXRob2RzIHN1cHBvcnRlZCBieSBBbmd1bGFyIGxhbmd1YWdlIHNlcnZpY2VcbiAgICAgIHtcbiAgICAgICAgICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24sIGdldFF1aWNrSW5mb0F0UG9zaXRpb24sIGdldFNlbWFudGljRGlhZ25vc3RpY3MsXG4gICAgICAgICAgZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24sIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4sXG4gICAgICB9KTtcbiAgcmV0dXJuIHByb3h5O1xufVxuIl19