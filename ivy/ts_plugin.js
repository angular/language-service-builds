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
            // TODO(atscott): implement
            return undefined;
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
        return tslib_1.__assign(tslib_1.__assign({}, tsLS), { getSemanticDiagnostics: getSemanticDiagnostics,
            getTypeDefinitionAtPosition: getTypeDefinitionAtPosition,
            getQuickInfoAtPosition: getQuickInfoAtPosition,
            getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
            getReferencesAtPosition: getReferencesAtPosition,
            findRenameLocations: findRenameLocations,
            getCompletionsAtPosition: getCompletionsAtPosition,
            getCompletionEntryDetails: getCompletionEntryDetails,
            getCompletionEntrySymbol: getCompletionEntrySymbol,
            getCompilerOptionsDiagnostics: getCompilerOptionsDiagnostics });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxtREFBcUQ7SUFDckQsbUZBQW1EO0lBRW5ELFNBQWdCLE1BQU0sQ0FBQyxJQUFnQztRQUM5QyxJQUFBLE9BQU8sR0FBbUMsSUFBSSxRQUF2QyxFQUFtQixJQUFJLEdBQVksSUFBSSxnQkFBaEIsRUFBRSxNQUFNLEdBQUksSUFBSSxPQUFSLENBQVM7UUFDdEQsSUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsV0FBVyxNQUFLLElBQUksQ0FBQztRQUVqRCxJQUFNLElBQUksR0FBRyxJQUFJLGtDQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7WUFDOUMsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsR0FBRTthQUM1RDtZQUNELFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO1lBQzNELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ2hFLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN4RDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFD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RUFBRTtvQkFDcEQsNERBQTREO29CQUM1RCxzQ0FBc0M7b0JBQ3RDLG9EQUFvRDtvQkFDcEQsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzFDO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFkRCw0Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiB0cy5MYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCB7cHJvamVjdCwgbGFuZ3VhZ2VTZXJ2aWNlOiB0c0xTLCBjb25maWd9ID0gaW5mbztcbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWc/LmFuZ3VsYXJPbmx5ID09PSB0cnVlO1xuXG4gIGNvbnN0IG5nTFMgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlKHByb2plY3QsIHRzTFMpO1xuXG4gIGZ1bmN0aW9uIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHNMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgfVxuICAgIGRpYWdub3N0aWNzLnB1c2goLi4ubmdMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKSk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118XG4gICAgICB1bmRlZmluZWQge1xuICAgIHJldHVybiBuZ0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kUmVuYW1lTG9jYXRpb25zKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZmluZEluU3RyaW5nczogYm9vbGVhbiwgZmluZEluQ29tbWVudHM6IGJvb2xlYW4sXG4gICAgICBwcm92aWRlUHJlZml4QW5kU3VmZml4VGV4dEZvclJlbmFtZT86IGJvb2xlYW4pOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogaW1wbGVtZW50XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zKTogdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCwgc291cmNlOiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgICAgIGZpbGVOYW1lLCBwb3NpdGlvbiwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgICAgICAgICAgICBmaWxlTmFtZSwgcG9zaXRpb24sIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgc291cmNlLCBwcmVmZXJlbmNlcykgPz9cbiAgICAgICAgICBuZ0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoZmlsZU5hbWUsIHBvc2l0aW9uLCBlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wbGV0aW9uRW50cnlTeW1ib2woXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBuYW1lOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nfHVuZGVmaW5lZCk6IHRzLlN5bWJvbHxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZmlsZU5hbWUsIHBvc2l0aW9uLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZSwgcG9zaXRpb24sIG5hbWUsIHNvdXJjZSkgPz9cbiAgICAgICAgICBuZ0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZSwgcG9zaXRpb24sIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogR2V0cyBnbG9iYWwgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBjb25maWd1cmF0aW9uIGFuZCBjb21waWxlciBvcHRpb25zLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50c0xTLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCkpO1xuICAgIH1cbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLm5nTFMuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKSk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi50c0xTLFxuICAgIGdldFNlbWFudGljRGlhZ25vc3RpY3MsXG4gICAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uLFxuICAgIGdldFF1aWNrSW5mb0F0UG9zaXRpb24sXG4gICAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbixcbiAgICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbixcbiAgICBmaW5kUmVuYW1lTG9jYXRpb25zLFxuICAgIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbixcbiAgICBnZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzLFxuICAgIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbCxcbiAgICBnZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gIGlmICghcHJvamVjdC5oYXNSb290cygpKSB7XG4gICAgcmV0dXJuIFtdOyAgLy8gcHJvamVjdCBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWRcbiAgfVxuICBjb25zdCB0eXBlY2hlY2tGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBzY3JpcHRJbmZvIG9mIHByb2plY3QuZ2V0U2NyaXB0SW5mb3MoKSkge1xuICAgIGlmIChzY3JpcHRJbmZvLnNjcmlwdEtpbmQgPT09IHRzLlNjcmlwdEtpbmQuRXh0ZXJuYWwpIHtcbiAgICAgIC8vIHNjcmlwdCBpbmZvIGZvciB0eXBlY2hlY2sgZmlsZSBpcyBtYXJrZWQgYXMgZXh0ZXJuYWwsIHNlZVxuICAgICAgLy8gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKCkgaW5cbiAgICAgIC8vIHBhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHNcbiAgICAgIHR5cGVjaGVja0ZpbGVzLnB1c2goc2NyaXB0SW5mby5maWxlTmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0eXBlY2hlY2tGaWxlcztcbn1cbiJdfQ==