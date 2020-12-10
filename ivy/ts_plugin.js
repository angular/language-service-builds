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
        define("@angular/language-service/ivy/ts_plugin", ["require", "exports", "tslib", "@angular/language-service/ivy/language_service"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.create = void 0;
    var tslib_1 = require("tslib");
    var language_service_1 = require("@angular/language-service/ivy/language_service");
    function create(info) {
        var project = info.project, tsLS = info.languageService, config = info.config;
        var angularOnly = (config === null || config === void 0 ? void 0 : config.angularOnly) === true;
        var ngLS = new language_service_1.LanguageService(project, tsLS);
        function getSemanticDiagnostics(fileName) {
            var diagnostics = [];
            if (!angularOnly) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(tsLS.getSemanticDiagnostics(fileName)));
            }
            diagnostics.push.apply(diagnostics, tslib_1.__spread(ngLS.getSemanticDiagnostics(fileName)));
            return diagnostics;
        }
        function getQuickInfoAtPosition(fileName, position) {
            var _a;
            if (angularOnly) {
                return ngLS.getQuickInfoAtPosition(fileName, position);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getQuickInfoAtPosition(fileName, position)) !== null && _a !== void 0 ? _a : ngLS.getQuickInfoAtPosition(fileName, position);
            }
        }
        function getTypeDefinitionAtPosition(fileName, position) {
            var _a;
            if (angularOnly) {
                return ngLS.getTypeDefinitionAtPosition(fileName, position);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getTypeDefinitionAtPosition(fileName, position)) !== null && _a !== void 0 ? _a : ngLS.getTypeDefinitionAtPosition(fileName, position);
            }
        }
        function getDefinitionAndBoundSpan(fileName, position) {
            var _a;
            if (angularOnly) {
                return ngLS.getDefinitionAndBoundSpan(fileName, position);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getDefinitionAndBoundSpan(fileName, position)) !== null && _a !== void 0 ? _a : ngLS.getDefinitionAndBoundSpan(fileName, position);
            }
        }
        function getReferencesAtPosition(fileName, position) {
            return ngLS.getReferencesAtPosition(fileName, position);
        }
        function findRenameLocations(fileName, position, findInStrings, findInComments, providePrefixAndSuffixTextForRename) {
            // TODO(atscott): implement
            return undefined;
        }
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { getSemanticDiagnostics: getSemanticDiagnostics,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getReferencesAtPosition: getReferencesAtPosition,
            findRenameLocations: findRenameLocations });
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCxtRkFBbUQ7SUFFbkQsU0FBZ0IsTUFBTSxDQUFDLElBQWdDO1FBQzlDLElBQUEsT0FBTyxHQUFtQyxJQUFJLFFBQXZDLEVBQW1CLElBQUksR0FBWSxJQUFJLGdCQUFoQixFQUFFLE1BQU0sR0FBSSxJQUFJLE9BQVIsQ0FBUztRQUN0RCxJQUFNLFdBQVcsR0FBRyxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxXQUFXLE1BQUssSUFBSSxDQUFDO1FBRWpELElBQU0sSUFBSSxHQUFHLElBQUksa0NBQWUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEQsU0FBUyxzQkFBc0IsQ0FBQyxRQUFnQjtZQUM5QyxJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO2FBQzVEO1lBQ0QsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEdBQUU7WUFDM0QsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjs7WUFDaEUsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3hEO2lCQUFNO2dCQUNMLDRGQUE0RjtnQkFDNUYsYUFBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxtQ0FDbEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUNyRDtRQUNILENBQUM7UUFFRCxTQUFTLDJCQUEyQixDQUNoQyxRQUFnQixFQUFFLFFBQWdCOztZQUNwQyxJQUFJLFdBQVcsRUFBRTtnQkFDZixPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDN0Q7aUJBQU07Z0JBQ0wsNEZBQTRGO2dCQUM1RixhQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLG1DQUN2RCxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzFEO1FBQ0gsQ0FBQztRQUVELFNBQVMseUJBQXlCLENBQzlCLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ3BDLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUMzRDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsbUNBQ3JELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDeEQ7UUFDSCxDQUFDO1FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxRQUFnQixFQUFFLFFBQWdCO1lBRWpFLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsU0FBUyxtQkFBbUIsQ0FDeEIsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLGFBQXNCLEVBQUUsY0FBdUIsRUFDbkYsbUNBQTZDO1lBQy9DLDJCQUEyQjtZQUMzQixPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsNkNBQ0ssSUFBSSxLQUNQLHNCQUFzQix3QkFBQTtZQUN0QiwyQkFBMkIsNkJBQUE7WUFDM0Isc0JBQXNCLHdCQUFBO1lBQ3RCLHlCQUF5QiwyQkFBQTtZQUN6Qix1QkFBdUIseUJBQUE7WUFDdkIsbUJBQW1CLHFCQUFBLElBQ25CO0lBQ0osQ0FBQztJQXBFRCx3QkFvRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGluZm86IHRzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogdHMuTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qge3Byb2plY3QsIGxhbmd1YWdlU2VydmljZTogdHNMUywgY29uZmlnfSA9IGluZm87XG4gIGNvbnN0IGFuZ3VsYXJPbmx5ID0gY29uZmlnPy5hbmd1bGFyT25seSA9PT0gdHJ1ZTtcblxuICBjb25zdCBuZ0xTID0gbmV3IExhbmd1YWdlU2VydmljZShwcm9qZWN0LCB0c0xTKTtcblxuICBmdW5jdGlvbiBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRzTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIH1cbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLm5nTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gbmdMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZFJlbmFtZUxvY2F0aW9ucyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGZpbmRJblN0cmluZ3M6IGJvb2xlYW4sIGZpbmRJbkNvbW1lbnRzOiBib29sZWFuLFxuICAgICAgcHJvdmlkZVByZWZpeEFuZFN1ZmZpeFRleHRGb3JSZW5hbWU/OiBib29sZWFuKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IGltcGxlbWVudFxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnRzTFMsXG4gICAgZ2V0U2VtYW50aWNEaWFnbm9zdGljcyxcbiAgICBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24sXG4gICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbixcbiAgICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLFxuICAgIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uLFxuICAgIGZpbmRSZW5hbWVMb2NhdGlvbnMsXG4gIH07XG59XG4iXX0=