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
        define("@angular/language-service/ivy/ts_plugin", ["require", "exports", "tslib", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/language_service"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getExternalFiles = exports.create = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript/lib/tsserverlibrary");
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
            // Most operations combine results from all extensions. However, rename locations are exclusive
            // (results from only one extension are used) so our rename locations are a superset of the TS
            // rename locations. As a result, we do not check the `angularOnly` flag here because we always
            // want to include results at TS locations as well as locations in templates.
            return ngLS.findRenameLocations(fileName, position);
        }
        function getRenameInfo(fileName, position) {
            // See the comment in `findRenameLocations` explaining why we don't check the `angularOnly`
            // flag.
            return ngLS.getRenameInfo(fileName, position);
        }
        function getCompletionsAtPosition(fileName, position, options) {
            var _a;
            if (angularOnly) {
                return ngLS.getCompletionsAtPosition(fileName, position, options);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getCompletionsAtPosition(fileName, position, options)) !== null && _a !== void 0 ? _a : ngLS.getCompletionsAtPosition(fileName, position, options);
            }
        }
        function getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences) {
            var _a;
            if (angularOnly) {
                return ngLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, preferences);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences)) !== null && _a !== void 0 ? _a : ngLS.getCompletionEntryDetails(fileName, position, entryName, formatOptions, preferences);
            }
        }
        function getCompletionEntrySymbol(fileName, position, name, source) {
            var _a;
            if (angularOnly) {
                return ngLS.getCompletionEntrySymbol(fileName, position, name);
            }
            else {
                // If TS could answer the query, then return that result. Otherwise, return from Angular LS.
                return (_a = tsLS.getCompletionEntrySymbol(fileName, position, name, source)) !== null && _a !== void 0 ? _a : ngLS.getCompletionEntrySymbol(fileName, position, name);
            }
        }
        /**
         * Gets global diagnostics related to the program configuration and compiler options.
         */
        function getCompilerOptionsDiagnostics() {
            var diagnostics = [];
            if (!angularOnly) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(tsLS.getCompilerOptionsDiagnostics()));
            }
            diagnostics.push.apply(diagnostics, tslib_1.__spread(ngLS.getCompilerOptionsDiagnostics()));
            return diagnostics;
        }
        function getTcb(fileName, position) {
            return ngLS.getTcb(fileName, position);
        }
        /**
         * Given an external template, finds the associated components that use it as a `templateUrl`.
         */
        function getComponentLocationsForTemplate(fileName) {
            return ngLS.getComponentLocationsForTemplate(fileName);
        }
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { getSemanticDiagnostics: getSemanticDiagnostics,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getReferencesAtPosition: getReferencesAtPosition,
            findRenameLocations: findRenameLocations,
            getRenameInfo: getRenameInfo,
            getCompletionsAtPosition: getCompletionsAtPosition,
            getCompletionEntryDetails: getCompletionEntryDetails,
            getCompletionEntrySymbol: getCompletionEntrySymbol,
            getTcb: getTcb,
            getCompilerOptionsDiagnostics: getCompilerOptionsDiagnostics,
            getComponentLocationsForTemplate: getComponentLocationsForTemplate });
    }
    exports.create = create;
    function getExternalFiles(project) {
        var e_1, _a;
        if (!project.hasRoots()) {
            return []; // project has not been initialized
        }
        var typecheckFiles = [];
        try {
            for (var _b = tslib_1.__values(project.getScriptInfos()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var scriptInfo = _c.value;
                if (scriptInfo.scriptKind === ts.ScriptKind.External) {
                    // script info for typecheck file is marked as external, see
                    // getOrCreateTypeCheckScriptInfo() in
                    // packages/language-service/ivy/language_service.ts
                    typecheckFiles.push(scriptInfo.fileName);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return typecheckFiles;
    }
    exports.getExternalFiles = getExternalFiles;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxtREFBcUQ7SUFJckQsbUZBQW1EO0lBRW5ELFNBQWdCLE1BQU0sQ0FBQyxJQUFnQztRQUM5QyxJQUFBLE9BQU8sR0FBbUMsSUFBSSxRQUF2QyxFQUFtQixJQUFJLEdBQVksSUFBSSxnQkFBaEIsRUFBRSxNQUFNLEdBQUksSUFBSSxPQUFSLENBQVM7UUFDdEQsSUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsV0FBVyxNQUFLLElBQUksQ0FBQztRQUVqRCxJQUFNLElBQUksR0FBRyxJQUFJLGtDQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7WUFDOUMsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsR0FBRTthQUM1RDtZQUNELFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO1lBQzNELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ2hFLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN4RDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFD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QixtQkFBbUIscUJBQUE7WUFDbkIsYUFBYSxlQUFBO1lBQ2Isd0JBQXdCLDBCQUFBO1lBQ3hCLHlCQUF5QiwyQkFBQTtZQUN6Qix3QkFBd0IsMEJBQUE7WUFDeEIsTUFBTSxRQUFBO1lBQ04sNkJBQTZCLCtCQUFBO1lBQzdCLGdDQUFnQyxrQ0FBQSxJQUNoQztJQUNKLENBQUM7SUFsSkQsd0JBa0pDO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMEI7O1FBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDdkIsT0FBTyxFQUFFLENBQUMsQ0FBRSxtQ0FBbUM7U0FDaEQ7UUFDRCxJQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7O1lBQ3BDLEtBQXlCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQTlDLElBQU0sVUFBVSxXQUFBO2dCQUNuQixJQUFJLFVBQVUsQ0FBQyxVQUFVLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7b0JBQ3BELDREQUE0RDtvQkFDNUQsc0NBQXNDO29CQUN0QyxvREFBb0Q7b0JBQ3BELGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMxQzthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBZEQsNENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtHZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZVJlc3BvbnNlLCBHZXRUY2JSZXNwb25zZSwgTmdMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGluZm86IHRzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogTmdMYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCB7cHJvamVjdCwgbGFuZ3VhZ2VTZXJ2aWNlOiB0c0xTLCBjb25maWd9ID0gaW5mbztcbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWc/LmFuZ3VsYXJPbmx5ID09PSB0cnVlO1xuXG4gIGNvbnN0IG5nTFMgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlKHByb2plY3QsIHRzTFMpO1xuXG4gIGZ1bmN0aW9uIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHNMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgfVxuICAgIGRpYWdub3N0aWNzLnB1c2goLi4ubmdMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118XG4gICAgICB1bmRlZmluZWQge1xuICAgIHJldHVybiBuZ0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kUmVuYW1lTG9jYXRpb25zKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZmluZEluU3RyaW5nczogYm9vbGVhbiwgZmluZEluQ29tbWVudHM6IGJvb2xlYW4sXG4gICAgICBwcm92aWRlUHJlZml4QW5kU3VmZml4VGV4dEZvclJlbmFtZT86IGJvb2xlYW4pOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgLy8gTW9zdCBvcGVyYXRpb25zIGNvbWJpbmUgcmVzdWx0cyBmcm9tIGFsbCBleHRlbnNpb25zLiBIb3dldmVyLCByZW5hbWUgbG9jYXRpb25zIGFyZSBleGNsdXNpdmVcbiAgICAvLyAocmVzdWx0cyBmcm9tIG9ubHkgb25lIGV4dGVuc2lvbiBhcmUgdXNlZCkgc28gb3VyIHJlbmFtZSBsb2NhdGlvbnMgYXJlIGEgc3VwZXJzZXQgb2YgdGhlIFRTXG4gICAgLy8gcmVuYW1lIGxvY2F0aW9ucy4gQXMgYSByZXN1bHQsIHdlIGRvIG5vdCBjaGVjayB0aGUgYGFuZ3VsYXJPbmx5YCBmbGFnIGhlcmUgYmVjYXVzZSB3ZSBhbHdheXNcbiAgICAvLyB3YW50IHRvIGluY2x1ZGUgcmVzdWx0cyBhdCBUUyBsb2NhdGlvbnMgYXMgd2VsbCBhcyBsb2NhdGlvbnMgaW4gdGVtcGxhdGVzLlxuICAgIHJldHVybiBuZ0xTLmZpbmRSZW5hbWVMb2NhdGlvbnMoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlbmFtZUluZm8oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlbmFtZUluZm8ge1xuICAgIC8vIFNlZSB0aGUgY29tbWVudCBpbiBgZmluZFJlbmFtZUxvY2F0aW9uc2AgZXhwbGFpbmluZyB3aHkgd2UgZG9uJ3QgY2hlY2sgdGhlIGBhbmd1bGFyT25seWBcbiAgICAvLyBmbGFnLlxuICAgIHJldHVybiBuZ0xTLmdldFJlbmFtZUluZm8oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCwgc291cmNlOiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgICAgIGZpbGVOYW1lLCBwb3NpdGlvbiwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgICAgICAgICAgICBmaWxlTmFtZSwgcG9zaXRpb24sIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgc291cmNlLCBwcmVmZXJlbmNlcykgPz9cbiAgICAgICAgICBuZ0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoZmlsZU5hbWUsIHBvc2l0aW9uLCBlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wbGV0aW9uRW50cnlTeW1ib2woXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBuYW1lOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nfHVuZGVmaW5lZCk6IHRzLlN5bWJvbHxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZmlsZU5hbWUsIHBvc2l0aW9uLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZSwgcG9zaXRpb24sIG5hbWUsIHNvdXJjZSkgPz9cbiAgICAgICAgICBuZ0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZSwgcG9zaXRpb24sIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogR2V0cyBnbG9iYWwgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBjb25maWd1cmF0aW9uIGFuZCBjb21waWxlciBvcHRpb25zLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50c0xTLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCkpO1xuICAgIH1cbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLm5nTFMuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKSk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGNiKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBHZXRUY2JSZXNwb25zZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBuZ0xTLmdldFRjYihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIGV4dGVybmFsIHRlbXBsYXRlLCBmaW5kcyB0aGUgYXNzb2NpYXRlZCBjb21wb25lbnRzIHRoYXQgdXNlIGl0IGFzIGEgYHRlbXBsYXRlVXJsYC5cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbXBvbmVudExvY2F0aW9uc0ZvclRlbXBsYXRlKGZpbGVOYW1lOiBzdHJpbmcpOlxuICAgICAgR2V0Q29tcG9uZW50TG9jYXRpb25zRm9yVGVtcGxhdGVSZXNwb25zZSB7XG4gICAgcmV0dXJuIG5nTFMuZ2V0Q29tcG9uZW50TG9jYXRpb25zRm9yVGVtcGxhdGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi50c0xTLFxuICAgIGdldFNlbWFudGljRGlhZ25vc3RpY3MsXG4gICAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgIGdldFF1aWNrSW5mb0F0UG9zaXRpb24sXG4gICAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbixcbiAgICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbixcbiAgICBmaW5kUmVuYW1lTG9jYXRpb25zLFxuICAgIGdldFJlbmFtZUluZm8sXG4gICAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uLFxuICAgIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMsXG4gICAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sLFxuICAgIGdldFRjYixcbiAgICBnZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcyxcbiAgICBnZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gIGlmICghcHJvamVjdC5oYXNSb290cygpKSB7XG4gICAgcmV0dXJuIFtdOyAgLy8gcHJvamVjdCBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWRcbiAgfVxuICBjb25zdCB0eXBlY2hlY2tGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBzY3JpcHRJbmZvIG9mIHByb2plY3QuZ2V0U2NyaXB0SW5mb3MoKSkge1xuICAgIGlmIChzY3JpcHRJbmZvLnNjcmlwdEtpbmQgPT09IHRzLlNjcmlwdEtpbmQuRXh0ZXJuYWwpIHtcbiAgICAgIC8vIHNjcmlwdCBpbmZvIGZvciB0eXBlY2hlY2sgZmlsZSBpcyBtYXJrZWQgYXMgZXh0ZXJuYWwsIHNlZVxuICAgICAgLy8gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKCkgaW5cbiAgICAgIC8vIHBhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHNcbiAgICAgIHR5cGVjaGVja0ZpbGVzLnB1c2goc2NyaXB0SW5mby5maWxlTmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0eXBlY2hlY2tGaWxlcztcbn1cbiJdfQ==