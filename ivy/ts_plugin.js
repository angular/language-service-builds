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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCxtREFBcUQ7SUFFckQsbUZBQW1EO0lBRW5ELFNBQWdCLE1BQU0sQ0FBQyxJQUFnQztRQUM5QyxJQUFBLE9BQU8sR0FBbUMsSUFBSSxRQUF2QyxFQUFtQixJQUFJLEdBQVksSUFBSSxnQkFBaEIsRUFBRSxNQUFNLEdBQUksSUFBSSxPQUFSLENBQVM7UUFDdEQsSUFBTSxXQUFXLEdBQUcsQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsV0FBVyxNQUFLLElBQUksQ0FBQztRQUVqRCxJQUFNLElBQUksR0FBRyxJQUFJLGtDQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7WUFDOUMsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsR0FBRTthQUM1RDtZQUNELFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFFO1lBQzNELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7O1lBQ2hFLElBQUksV0FBVyxFQUFFO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN4RDtpQkFBTTtnQkFDTCw0RkFBNEY7Z0JBQzVGLGFBQU8sSUFBSSxDQUFD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UUFBQTtZQUNOLDZCQUE2QiwrQkFBQSxJQUM3QjtJQUNKLENBQUM7SUF6SUQsd0JBeUlDO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMEI7O1FBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDdkIsT0FBTyxFQUFFLENBQUMsQ0FBRSxtQ0FBbUM7U0FDaEQ7UUFDRCxJQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7O1lBQ3BDLEtBQXlCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQTlDLElBQU0sVUFBVSxXQUFBO2dCQUNuQixJQUFJLFVBQVUsQ0FBQyxVQUFVLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7b0JBQ3BELDREQUE0RDtvQkFDNUQsc0NBQXNDO29CQUN0QyxvREFBb0Q7b0JBQ3BELGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMxQzthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBZEQsNENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7R2V0VGNiUmVzcG9uc2UsIE5nTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiBOZ0xhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IHtwcm9qZWN0LCBsYW5ndWFnZVNlcnZpY2U6IHRzTFMsIGNvbmZpZ30gPSBpbmZvO1xuICBjb25zdCBhbmd1bGFyT25seSA9IGNvbmZpZz8uYW5ndWxhck9ubHkgPT09IHRydWU7XG5cbiAgY29uc3QgbmdMUyA9IG5ldyBMYW5ndWFnZVNlcnZpY2UocHJvamVjdCwgdHNMUyk7XG5cbiAgZnVuY3Rpb24gZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50c0xTLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcbiAgICB9XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5uZ0xTLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpKTtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiByZWFkb25seSB0cy5EZWZpbml0aW9uSW5mb1tdfHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgICAgbmdMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHRoYXQgcmVzdWx0LiBPdGhlcndpc2UsIHJldHVybiBmcm9tIEFuZ3VsYXIgTFMuXG4gICAgICByZXR1cm4gdHNMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgICBuZ0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIG5nTFMuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRSZW5hbWVMb2NhdGlvbnMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBmaW5kSW5TdHJpbmdzOiBib29sZWFuLCBmaW5kSW5Db21tZW50czogYm9vbGVhbixcbiAgICAgIHByb3ZpZGVQcmVmaXhBbmRTdWZmaXhUZXh0Rm9yUmVuYW1lPzogYm9vbGVhbik6IHJlYWRvbmx5IHRzLlJlbmFtZUxvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICAvLyBNb3N0IG9wZXJhdGlvbnMgY29tYmluZSByZXN1bHRzIGZyb20gYWxsIGV4dGVuc2lvbnMuIEhvd2V2ZXIsIHJlbmFtZSBsb2NhdGlvbnMgYXJlIGV4Y2x1c2l2ZVxuICAgIC8vIChyZXN1bHRzIGZyb20gb25seSBvbmUgZXh0ZW5zaW9uIGFyZSB1c2VkKSBzbyBvdXIgcmVuYW1lIGxvY2F0aW9ucyBhcmUgYSBzdXBlcnNldCBvZiB0aGUgVFNcbiAgICAvLyByZW5hbWUgbG9jYXRpb25zLiBBcyBhIHJlc3VsdCwgd2UgZG8gbm90IGNoZWNrIHRoZSBgYW5ndWxhck9ubHlgIGZsYWcgaGVyZSBiZWNhdXNlIHdlIGFsd2F5c1xuICAgIC8vIHdhbnQgdG8gaW5jbHVkZSByZXN1bHRzIGF0IFRTIGxvY2F0aW9ucyBhcyB3ZWxsIGFzIGxvY2F0aW9ucyBpbiB0ZW1wbGF0ZXMuXG4gICAgcmV0dXJuIG5nTFMuZmluZFJlbmFtZUxvY2F0aW9ucyhmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVuYW1lSW5mbyhmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVuYW1lSW5mbyB7XG4gICAgLy8gU2VlIHRoZSBjb21tZW50IGluIGBmaW5kUmVuYW1lTG9jYXRpb25zYCBleHBsYWluaW5nIHdoeSB3ZSBkb24ndCBjaGVjayB0aGUgYGFuZ3VsYXJPbmx5YFxuICAgIC8vIGZsYWcuXG4gICAgcmV0dXJuIG5nTFMuZ2V0UmVuYW1lSW5mbyhmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcixcbiAgICAgIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnMpOiB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKGFuZ3VsYXJPbmx5KSB7XG4gICAgICByZXR1cm4gbmdMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpID8/XG4gICAgICAgICAgbmdMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZW50cnlOYW1lOiBzdHJpbmcsXG4gICAgICBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLCBzb3VyY2U6IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgZmlsZU5hbWUsIHBvc2l0aW9uLCBlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gdGhhdCByZXN1bHQuIE90aGVyd2lzZSwgcmV0dXJuIGZyb20gQW5ndWxhciBMUy5cbiAgICAgIHJldHVybiB0c0xTLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICAgICAgICAgICAgIGZpbGVOYW1lLCBwb3NpdGlvbiwgZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBzb3VyY2UsIHByZWZlcmVuY2VzKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhmaWxlTmFtZSwgcG9zaXRpb24sIGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIG5hbWU6IHN0cmluZywgc291cmNlOiBzdHJpbmd8dW5kZWZpbmVkKTogdHMuU3ltYm9sfFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICBpZiAoYW5ndWxhck9ubHkpIHtcbiAgICAgIHJldHVybiBuZ0xTLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZSwgcG9zaXRpb24sIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiB0aGF0IHJlc3VsdC4gT3RoZXJ3aXNlLCByZXR1cm4gZnJvbSBBbmd1bGFyIExTLlxuICAgICAgcmV0dXJuIHRzTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lLCBwb3NpdGlvbiwgbmFtZSwgc291cmNlKSA/P1xuICAgICAgICAgIG5nTFMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lLCBwb3NpdGlvbiwgbmFtZSk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBHZXRzIGdsb2JhbCBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoZSBwcm9ncmFtIGNvbmZpZ3VyYXRpb24gYW5kIGNvbXBpbGVyIG9wdGlvbnMuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRzTFMuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKSk7XG4gICAgfVxuICAgIGRpYWdub3N0aWNzLnB1c2goLi4ubmdMUy5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpKTtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUY2IoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IEdldFRjYlJlc3BvbnNlIHtcbiAgICByZXR1cm4gbmdMUy5nZXRUY2IoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgLi4udHNMUyxcbiAgICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzLFxuICAgIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbixcbiAgICBnZXRRdWlja0luZm9BdFBvc2l0aW9uLFxuICAgIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4sXG4gICAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24sXG4gICAgZmluZFJlbmFtZUxvY2F0aW9ucyxcbiAgICBnZXRSZW5hbWVJbmZvLFxuICAgIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbixcbiAgICBnZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzLFxuICAgIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbCxcbiAgICBnZXRUY2IsXG4gICAgZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlcm5hbEZpbGVzKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTogc3RyaW5nW10ge1xuICBpZiAoIXByb2plY3QuaGFzUm9vdHMoKSkge1xuICAgIHJldHVybiBbXTsgIC8vIHByb2plY3QgaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkXG4gIH1cbiAgY29uc3QgdHlwZWNoZWNrRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3Qgc2NyaXB0SW5mbyBvZiBwcm9qZWN0LmdldFNjcmlwdEluZm9zKCkpIHtcbiAgICBpZiAoc2NyaXB0SW5mby5zY3JpcHRLaW5kID09PSB0cy5TY3JpcHRLaW5kLkV4dGVybmFsKSB7XG4gICAgICAvLyBzY3JpcHQgaW5mbyBmb3IgdHlwZWNoZWNrIGZpbGUgaXMgbWFya2VkIGFzIGV4dGVybmFsLCBzZWVcbiAgICAgIC8vIGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbygpIGluXG4gICAgICAvLyBwYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9sYW5ndWFnZV9zZXJ2aWNlLnRzXG4gICAgICB0eXBlY2hlY2tGaWxlcy5wdXNoKHNjcmlwdEluZm8uZmlsZU5hbWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHlwZWNoZWNrRmlsZXM7XG59XG4iXX0=