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
    exports.create = void 0;
    var tslib_1 = require("tslib");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    function create(info) {
        var tsLS = info.languageService, tsLSHost = info.languageServiceHost, config = info.config;
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
        var proxy = Object.assign(
        // First clone the original TS language service
        {}, tsLS, 
        // Then override the methods supported by Angular language service
        {
            getCompletionsAtPosition: getCompletionsAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getDefinitionAtPosition: getDefinitionAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
        });
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFJSCxtRkFBeUQ7SUFDekQsaUZBQXdEO0lBRXhELFNBQWdCLE1BQU0sQ0FBQyxJQUFpQztRQUMvQyxJQUFpQixJQUFJLEdBQTJDLElBQUksZ0JBQS9DLEVBQXVCLFFBQVEsR0FBWSxJQUFJLG9CQUFoQixFQUFFLE1BQU0sR0FBSSxJQUFJLE9BQVIsQ0FBUztRQUM1RSx1REFBdUQ7UUFDdkQsa0JBQWtCO1FBQ2xCLHVFQUF1RTtRQUN2RSwyRUFBMkU7UUFDM0UsMkRBQTJEO1FBQzNELGtCQUFrQjtRQUNsQiwrRUFBK0U7UUFDL0UsNEVBQTRFO1FBQzVFLGVBQWU7UUFDZixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDakUsSUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsSUFBTSxJQUFJLEdBQUcsd0NBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFN0MsU0FBUyx3QkFBd0IsQ0FDN0IsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLE9BQXNEO1lBQzVGLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMzRSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDckMsaUVBQWlFO29CQUNqRSxPQUFPLE9BQU8sQ0FBQztpQkFDaEI7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjtZQUNoRSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLE1BQU0sRUFBRTtvQkFDVixpRUFBaUU7b0JBQ2pFLE9BQU8sTUFBTSxDQUFDO2lCQUNmO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7WUFDOUMsSUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO2FBQ3hEO1lBQ0Qsd0VBQXdFO1lBQ3hFLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEdBQUU7WUFDdkQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVELFNBQVMsdUJBQXVCLENBQzVCLFFBQWdCLEVBQUUsUUFBZ0I7WUFDcEMsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDaEIsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDakUsSUFBSSxPQUFPLEVBQUU7b0JBQ1gsaUVBQWlFO29CQUNqRSxPQUFPLE9BQU8sQ0FBQztpQkFDaEI7YUFDRjtZQUNELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEUsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRTtnQkFDaEUsT0FBTzthQUNSO1lBQ0QsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQzVCLENBQUM7UUFFRCxTQUFTLHlCQUF5QixDQUM5QixRQUFnQixFQUFFLFFBQWdCO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2xFLElBQUksTUFBTSxFQUFFO29CQUNWLGlFQUFpRTtvQkFDakUsT0FBTyxNQUFNLENBQUM7aUJBQ2Y7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsSUFBTSxLQUFLLEdBQXdCLE1BQU0sQ0FBQyxNQUFNO1FBQzVDLCtDQUErQztRQUMvQyxFQUFFLEVBQUUsSUFBSTtRQUNSLGtFQUFrRTtRQUNsRTtZQUNFLHdCQUF3QiwwQkFBQTtZQUN4QixzQkFBc0Isd0JBQUE7WUFDdEIsc0JBQXNCLHdCQUFBO1lBQ3RCLHVCQUF1Qix5QkFBQTtZQUN2Qix5QkFBeUIsMkJBQUE7U0FDMUIsQ0FBQyxDQUFDO1FBQ1AsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBeEZELHdCQXdGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtjcmVhdGVMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGluZm86IHRzcy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IHRzcy5MYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCB7bGFuZ3VhZ2VTZXJ2aWNlOiB0c0xTLCBsYW5ndWFnZVNlcnZpY2VIb3N0OiB0c0xTSG9zdCwgY29uZmlnfSA9IGluZm87XG4gIC8vIFRoaXMgcGx1Z2luIGNvdWxkIG9wZXJhdGUgdW5kZXIgdHdvIGRpZmZlcmVudCBtb2RlczpcbiAgLy8gMS4gVFMgKyBBbmd1bGFyXG4gIC8vICAgIFBsdWdpbiBhdWdtZW50cyBUUyBsYW5ndWFnZSBzZXJ2aWNlIHRvIHByb3ZpZGUgYWRkaXRpb25hbCBBbmd1bGFyXG4gIC8vICAgIGluZm9ybWF0aW9uLiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBpbmxpbmUgdGVtcGxhdGVzIGFuZCBpcyBtZWFudCB0byBiZVxuICAvLyAgICB1c2VkIGFzIGEgbG9jYWwgcGx1Z2luIChjb25maWd1cmVkIHZpYSB0c2NvbmZpZy5qc29uKVxuICAvLyAyLiBBbmd1bGFyIG9ubHlcbiAgLy8gICAgUGx1Z2luIG9ubHkgcHJvdmlkZXMgaW5mb3JtYXRpb24gb24gQW5ndWxhciB0ZW1wbGF0ZXMsIG5vIFRTIGluZm8gYXQgYWxsLlxuICAvLyAgICBUaGlzIGVmZmVjdGl2ZWx5IGRpc2FibGVzIG5hdGl2ZSBUUyBmZWF0dXJlcyBhbmQgaXMgbWVhbnQgZm9yIGludGVybmFsXG4gIC8vICAgIHVzZSBvbmx5LlxuICBjb25zdCBhbmd1bGFyT25seSA9IGNvbmZpZyA/IGNvbmZpZy5hbmd1bGFyT25seSA9PT0gdHJ1ZSA6IGZhbHNlO1xuICBjb25zdCBuZ0xTSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QodHNMU0hvc3QsIHRzTFMpO1xuICBjb25zdCBuZ0xTID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKG5nTFNIb3N0KTtcblxuICBmdW5jdGlvbiBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gdHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKTtcbiAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHMuZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZ0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0c3MuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCByZXN1bHRzOiB0c3MuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLnRzTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIH1cbiAgICAvLyBGb3Igc2VtYW50aWMgZGlhZ25vc3RpY3Mgd2UgbmVlZCB0byBjb21iaW5lIGJvdGggVFMgKyBBbmd1bGFyIHJlc3VsdHNcbiAgICByZXN1bHRzLnB1c2goLi4ubmdMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXREZWZpbml0aW9uQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBSZWFkb25seUFycmF5PHRzcy5EZWZpbml0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gdHNMUy5nZXREZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdHMpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuZGVmaW5pdGlvbnMgfHwgIXJlc3VsdC5kZWZpbml0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5kZWZpbml0aW9ucztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHNMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZ0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGNvbnN0IHByb3h5OiB0c3MuTGFuZ3VhZ2VTZXJ2aWNlID0gT2JqZWN0LmFzc2lnbihcbiAgICAgIC8vIEZpcnN0IGNsb25lIHRoZSBvcmlnaW5hbCBUUyBsYW5ndWFnZSBzZXJ2aWNlXG4gICAgICB7fSwgdHNMUyxcbiAgICAgIC8vIFRoZW4gb3ZlcnJpZGUgdGhlIG1ldGhvZHMgc3VwcG9ydGVkIGJ5IEFuZ3VsYXIgbGFuZ3VhZ2Ugc2VydmljZVxuICAgICAge1xuICAgICAgICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24sXG4gICAgICAgIGdldFF1aWNrSW5mb0F0UG9zaXRpb24sXG4gICAgICAgIGdldFNlbWFudGljRGlhZ25vc3RpY3MsXG4gICAgICAgIGdldERlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgICAgICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLFxuICAgICAgfSk7XG4gIHJldHVybiBwcm94eTtcbn1cbiJdfQ==