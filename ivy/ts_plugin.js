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
        function getTcb(fileName, position) {
            return undefined;
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
            getCompilerOptionsDiagnostics: getCompilerOptionsDiagnostics,
            getTcb: getTcb });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxtREFBcUQ7SUFFckQsbUZBQW1EO0lBRW5ELFNBQWdCLE1BQU0sQ0FBQyxJQUFnQztRQUM5QyxJQUFBLE9BQU8sR0FBbUMsSUFBSSxRQUF2QyxFQUFtQixJQUFJLEdBQVksSUFBSSxnQkFBaEIsRUFBRSxNQUFNLEdBQUksSUFBSSxPQUFSLENBQVM7UUFDdEQsSUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsV0FBVyxNQUFLLElBQUksQ0FBQztRQUVqRCxJQUFNLElBQUksR0FBRyxJQUFJLGtDQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7WUFDOUMsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsR0FBRTthQUM1RDtZQUNELFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO1lBQzNELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ2hFLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN4RDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFD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QkFBRTtnQkFBOUMsSUFBTSxVQUFVLFdBQUE7Z0JBQ25CLElBQUksVUFBVSxDQUFDLFVBQVUsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtvQkFDcEQsNERBQTREO29CQUM1RCxzQ0FBc0M7b0JBQ3RDLG9EQUFvRDtvQkFDcEQsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzFDO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFkRCw0Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtHZXRUY2JSZXNwb25zZSwgTmdMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge0xhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qge3Byb2plY3QsIGxhbmd1YWdlU2VydmljZTogdHNMUywgY29uZmlnfSA9IGluZm87XG4gIGNvbnN0IGFuZ3VsYXJPbmx5ID0gY29uZmlnPy5hbmd1bGFyT25seSA9PT0gdHJ1ZTtcblxuICBjb25zdCBuZ0xTID0gbmV3IExhbmd1YWdlU2VydmljZShwcm9qZWN0LCB0c0xTKTtcblxuICBmdW5jdGlvbiBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRzTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIH1cbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLm5nTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSkpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gbmdMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZFJlbmFtZUxvY2F0aW9ucyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGZpbmRJblN0cmluZ3M6IGJvb2xlYW4sIGZpbmRJbkNvbW1lbnRzOiBib29sZWFuLFxuICAgICAgcHJvdmlkZVByZWZpeEFuZFN1ZmZpeFRleHRGb3JSZW5hbWU/OiBib29sZWFuKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IGltcGxlbWVudFxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9ucyk6IHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucykgPz9cbiAgICAgICAgICBuZ0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsIHNvdXJjZTogc3RyaW5nfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgICAgICBmaWxlTmFtZSwgcG9zaXRpb24sIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgICAgICAgICAgICAgZmlsZU5hbWUsIHBvc2l0aW9uLCBlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHNvdXJjZSwgcHJlZmVyZW5jZXMpID8/XG4gICAgICAgICAgbmdMUy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKGZpbGVOYW1lLCBwb3NpdGlvbiwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgbmFtZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZ3x1bmRlZmluZWQpOiB0cy5TeW1ib2x8XG4gICAgICB1bmRlZmluZWQge1xuICAgIGlmIChhbmd1bGFyT25seSkge1xuICAgICAgcmV0dXJuIG5nTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lLCBwb3NpdGlvbiwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZmlsZU5hbWUsIHBvc2l0aW9uLCBuYW1lLCBzb3VyY2UpID8/XG4gICAgICAgICAgbmdMUy5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZmlsZU5hbWUsIHBvc2l0aW9uLCBuYW1lKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEdldHMgZ2xvYmFsIGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIHByb2dyYW0gY29uZmlndXJhdGlvbiBhbmQgY29tcGlsZXIgb3B0aW9ucy5cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHNMUy5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpKTtcbiAgICB9XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5uZ0xTLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCkpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRjYihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogR2V0VGNiUmVzcG9uc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnRzTFMsXG4gICAgZ2V0U2VtYW50aWNEaWFnbm9zdGljcyxcbiAgICBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24sXG4gICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbixcbiAgICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLFxuICAgIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uLFxuICAgIGZpbmRSZW5hbWVMb2NhdGlvbnMsXG4gICAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uLFxuICAgIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMsXG4gICAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sLFxuICAgIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzLFxuICAgIGdldFRjYixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gIGlmICghcHJvamVjdC5oYXNSb290cygpKSB7XG4gICAgcmV0dXJuIFtdOyAgLy8gcHJvamVjdCBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWRcbiAgfVxuICBjb25zdCB0eXBlY2hlY2tGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBzY3JpcHRJbmZvIG9mIHByb2plY3QuZ2V0U2NyaXB0SW5mb3MoKSkge1xuICAgIGlmIChzY3JpcHRJbmZvLnNjcmlwdEtpbmQgPT09IHRzLlNjcmlwdEtpbmQuRXh0ZXJuYWwpIHtcbiAgICAgIC8vIHNjcmlwdCBpbmZvIGZvciB0eXBlY2hlY2sgZmlsZSBpcyBtYXJrZWQgYXMgZXh0ZXJuYWwsIHNlZVxuICAgICAgLy8gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKCkgaW5cbiAgICAgIC8vIHBhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHNcbiAgICAgIHR5cGVjaGVja0ZpbGVzLnB1c2goc2NyaXB0SW5mby5maWxlTmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0eXBlY2hlY2tGaWxlcztcbn1cbiJdfQ==