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
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { getSemanticDiagnostics: getSemanticDiagnostics,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getReferencesAtPosition: getReferencesAtPosition });
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCxtRkFBbUQ7SUFFbkQsU0FBZ0IsTUFBTSxDQUFDLElBQWdDO1FBQzlDLElBQUEsT0FBTyxHQUFtQyxJQUFJLFFBQXZDLEVBQW1CLElBQUksR0FBWSxJQUFJLGdCQUFoQixFQUFFLE1BQU0sR0FBSSxJQUFJLE9BQVIsQ0FBUztRQUN0RCxJQUFNLFdBQVcsR0FBRyxDQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxXQUFXLE1BQUssSUFBSSxDQUFDO1FBRWpELElBQU0sSUFBSSxHQUFHLElBQUksa0NBQWUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEQsU0FBUyxzQkFBc0IsQ0FBQyxRQUFnQjtZQUM5QyxJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO2FBQzVEO1lBQ0QsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEdBQUU7WUFDM0QsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjs7WUFDaEUsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3hEO2lCQUFNO2dCQUNMLDRGQUE0RjtnQkFDNUYsYUFBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxtQ0FDbEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUNyRDtRQUNILENBQUM7UUFFRCxTQUFTLDJCQUEyQixDQUNoQyxRQUFnQixFQUFFLFFBQWdCOztZQUNwQyxJQUFJLFdBQVcsRUFBRTtnQkFDZixPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDN0Q7aUJBQU07Z0JBQ0wsNEZBQTRGO2dCQUM1RixhQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLG1DQUN2RCxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzFEO1FBQ0gsQ0FBQztRQUVELFNBQVMseUJBQXlCLENBQzlCLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ3BDLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUMzRDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsbUNBQ3JELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDeEQ7UUFDSCxDQUFDO1FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxRQUFnQixFQUFFLFFBQWdCO1lBRWpFLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsNkNBQ0ssSUFBSSxLQUNQLHNCQUFzQix3QkFBQTtZQUN0QiwyQkFBMkIsNkJBQUE7WUFDM0Isc0JBQXNCLHdCQUFBO1lBQ3RCLHlCQUF5QiwyQkFBQTtZQUN6Qix1QkFBdUIseUJBQUEsSUFDdkI7SUFDSixDQUFDO0lBNURELHdCQTREQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiB0cy5MYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCB7cHJvamVjdCwgbGFuZ3VhZ2VTZXJ2aWNlOiB0c0xTLCBjb25maWd9ID0gaW5mbztcbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWc/LmFuZ3VsYXJPbmx5ID09PSB0cnVlO1xuXG4gIGNvbnN0IG5nTFMgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlKHByb2plY3QsIHRzTFMpO1xuXG4gIGZ1bmN0aW9uIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHNMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgfVxuICAgIGRpYWdub3N0aWNzLnB1c2goLi4ubmdMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118XG4gICAgICB1bmRlZmluZWQge1xuICAgIHJldHVybiBuZ0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnRzTFMsXG4gICAgZ2V0U2VtYW50aWNEaWFnbm9zdGljcyxcbiAgICBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24sXG4gICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbixcbiAgICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLFxuICAgIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uLFxuICB9O1xufVxuIl19