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
        define("@angular/language-service/src/ts_plugin", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/language_service", "@angular/language-service/src/typescript_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    var projectHostMap = new WeakMap();
    function getExternalFiles(project) {
        var host = projectHostMap.get(project);
        if (host) {
            return host.getTemplateReferences();
        }
    }
    exports.getExternalFiles = getExternalFiles;
    function create(info /* ts.server.PluginCreateInfo */) {
        // Create the proxy
        var proxy = Object.create(null);
        var oldLS = info.languageService;
        function tryCall(fileName, callback) {
            if (fileName && !oldLS.getProgram().getSourceFile(fileName)) {
                return undefined;
            }
            try {
                return callback();
            }
            catch (e) {
                return undefined;
            }
        }
        function tryFilenameCall(m) {
            return function (fileName) { return tryCall(fileName, function () { return (m.call(ls, fileName)); }); };
        }
        function tryFilenameOneCall(m) {
            return function (fileName, p) { return tryCall(fileName, function () { return (m.call(ls, fileName, p)); }); };
        }
        function tryFilenameTwoCall(m) {
            return function (fileName, p1, p2) { return tryCall(fileName, function () { return (m.call(ls, fileName, p1, p2)); }); };
        }
        function tryFilenameThreeCall(m) {
            return function (fileName, p1, p2, p3) { return tryCall(fileName, function () { return (m.call(ls, fileName, p1, p2, p3)); }); };
        }
        function tryFilenameFourCall(m) {
            return function (fileName, p1, p2, p3, p4) {
                return tryCall(fileName, function () { return (m.call(ls, fileName, p1, p2, p3, p4)); });
            };
        }
        function tryFilenameFiveCall(m) {
            return function (fileName, p1, p2, p3, p4, p5) {
                return tryCall(fileName, function () { return (m.call(ls, fileName, p1, p2, p3, p4, p5)); });
            };
        }
        function typescriptOnly(ls) {
            var languageService = {
                cleanupSemanticCache: function () { return ls.cleanupSemanticCache(); },
                getSyntacticDiagnostics: tryFilenameCall(ls.getSyntacticDiagnostics),
                getSemanticDiagnostics: tryFilenameCall(ls.getSemanticDiagnostics),
                getCompilerOptionsDiagnostics: function () { return ls.getCompilerOptionsDiagnostics(); },
                getSyntacticClassifications: tryFilenameOneCall(ls.getSemanticClassifications),
                getSemanticClassifications: tryFilenameOneCall(ls.getSemanticClassifications),
                getEncodedSyntacticClassifications: tryFilenameOneCall(ls.getEncodedSyntacticClassifications),
                getEncodedSemanticClassifications: tryFilenameOneCall(ls.getEncodedSemanticClassifications),
                getCompletionsAtPosition: tryFilenameTwoCall(ls.getCompletionsAtPosition),
                getCompletionEntryDetails: tryFilenameFiveCall(ls.getCompletionEntryDetails),
                getCompletionEntrySymbol: tryFilenameThreeCall(ls.getCompletionEntrySymbol),
                getJsxClosingTagAtPosition: tryFilenameOneCall(ls.getJsxClosingTagAtPosition),
                getQuickInfoAtPosition: tryFilenameOneCall(ls.getQuickInfoAtPosition),
                getNameOrDottedNameSpan: tryFilenameTwoCall(ls.getNameOrDottedNameSpan),
                getBreakpointStatementAtPosition: tryFilenameOneCall(ls.getBreakpointStatementAtPosition),
                getSignatureHelpItems: tryFilenameTwoCall(ls.getSignatureHelpItems),
                getRenameInfo: tryFilenameOneCall(ls.getRenameInfo),
                findRenameLocations: tryFilenameThreeCall(ls.findRenameLocations),
                getDefinitionAtPosition: tryFilenameOneCall(ls.getDefinitionAtPosition),
                getTypeDefinitionAtPosition: tryFilenameOneCall(ls.getTypeDefinitionAtPosition),
                getImplementationAtPosition: tryFilenameOneCall(ls.getImplementationAtPosition),
                getReferencesAtPosition: tryFilenameOneCall(ls.getReferencesAtPosition),
                findReferences: tryFilenameOneCall(ls.findReferences),
                getDocumentHighlights: tryFilenameTwoCall(ls.getDocumentHighlights),
                /** @deprecated */
                getOccurrencesAtPosition: tryFilenameOneCall(ls.getOccurrencesAtPosition),
                getNavigateToItems: function (searchValue, maxResultCount, fileName, excludeDtsFiles) { return tryCall(fileName, function () { return ls.getNavigateToItems(searchValue, maxResultCount, fileName, excludeDtsFiles); }); },
                getNavigationBarItems: tryFilenameCall(ls.getNavigationBarItems),
                getNavigationTree: tryFilenameCall(ls.getNavigationTree),
                getOutliningSpans: tryFilenameCall(ls.getOutliningSpans),
                getTodoComments: tryFilenameOneCall(ls.getTodoComments),
                getBraceMatchingAtPosition: tryFilenameOneCall(ls.getBraceMatchingAtPosition),
                getIndentationAtPosition: tryFilenameTwoCall(ls.getIndentationAtPosition),
                getFormattingEditsForRange: tryFilenameThreeCall(ls.getFormattingEditsForRange),
                getFormattingEditsForDocument: tryFilenameOneCall(ls.getFormattingEditsForDocument),
                getFormattingEditsAfterKeystroke: tryFilenameThreeCall(ls.getFormattingEditsAfterKeystroke),
                getDocCommentTemplateAtPosition: tryFilenameOneCall(ls.getDocCommentTemplateAtPosition),
                isValidBraceCompletionAtPosition: tryFilenameTwoCall(ls.isValidBraceCompletionAtPosition),
                getSpanOfEnclosingComment: tryFilenameTwoCall(ls.getSpanOfEnclosingComment),
                getCodeFixesAtPosition: tryFilenameFiveCall(ls.getCodeFixesAtPosition),
                applyCodeActionCommand: (function (action) { return tryCall(undefined, function () { return ls.applyCodeActionCommand(action); }); }),
                getEmitOutput: tryFilenameCall(ls.getEmitOutput),
                getProgram: function () { return ls.getProgram(); },
                dispose: function () { return ls.dispose(); },
                getApplicableRefactors: tryFilenameTwoCall(ls.getApplicableRefactors),
                getEditsForRefactor: tryFilenameFiveCall(ls.getEditsForRefactor),
                getDefinitionAndBoundSpan: tryFilenameOneCall(ls.getDefinitionAndBoundSpan),
                getCombinedCodeFix: function (scope, fixId, formatOptions, preferences) {
                    return tryCall(undefined, function () { return ls.getCombinedCodeFix(scope, fixId, formatOptions, preferences); });
                },
                // TODO(kyliau): dummy implementation to compile with ts 2.8, create real one
                getSuggestionDiagnostics: function (fileName) { return []; },
                // TODO(kyliau): dummy implementation to compile with ts 2.8, create real one
                organizeImports: function (scope, formatOptions) { return []; },
                // TODO: dummy implementation to compile with ts 2.9, create a real one
                getEditsForFileRename: function (oldFilePath, newFilePath, formatOptions, preferences) { return []; }
            };
            return languageService;
        }
        oldLS = typescriptOnly(oldLS);
        var _loop_1 = function (k) {
            proxy[k] = function () { return oldLS[k].apply(oldLS, arguments); };
        };
        for (var k in oldLS) {
            _loop_1(k);
        }
        function completionToEntry(c) {
            return {
                // TODO: remove any and fix type error.
                kind: c.kind,
                name: c.name,
                sortText: c.sort,
                kindModifiers: ''
            };
        }
        function diagnosticChainToDiagnosticChain(chain) {
            return {
                messageText: chain.message,
                category: ts.DiagnosticCategory.Error,
                code: 0,
                next: chain.next ? diagnosticChainToDiagnosticChain(chain.next) : undefined
            };
        }
        function diagnosticMessageToDiagnosticMessageText(message) {
            if (typeof message === 'string') {
                return message;
            }
            return diagnosticChainToDiagnosticChain(message);
        }
        function diagnosticToDiagnostic(d, file) {
            var result = {
                file: file,
                start: d.span.start,
                length: d.span.end - d.span.start,
                messageText: diagnosticMessageToDiagnosticMessageText(d.message),
                category: ts.DiagnosticCategory.Error,
                code: 0,
                source: 'ng'
            };
            return result;
        }
        function tryOperation(attempting, callback) {
            try {
                return callback();
            }
            catch (e) {
                info.project.projectService.logger.info("Failed to " + attempting + ": " + e.toString());
                info.project.projectService.logger.info("Stack trace: " + e.stack);
                return null;
            }
        }
        var serviceHost = new typescript_host_1.TypeScriptServiceHost(info.languageServiceHost, info.languageService);
        var ls = language_service_1.createLanguageService(serviceHost);
        serviceHost.setSite(ls);
        projectHostMap.set(info.project, serviceHost);
        proxy.getCompletionsAtPosition = function (fileName, position, options) {
            var base = oldLS.getCompletionsAtPosition(fileName, position, options) || {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: []
            };
            tryOperation('get completions', function () {
                var e_1, _a;
                var results = ls.getCompletionsAt(fileName, position);
                if (results && results.length) {
                    if (base === undefined) {
                        base = {
                            isGlobalCompletion: false,
                            isMemberCompletion: false,
                            isNewIdentifierLocation: false,
                            entries: []
                        };
                    }
                    try {
                        for (var results_1 = tslib_1.__values(results), results_1_1 = results_1.next(); !results_1_1.done; results_1_1 = results_1.next()) {
                            var entry = results_1_1.value;
                            base.entries.push(completionToEntry(entry));
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (results_1_1 && !results_1_1.done && (_a = results_1.return)) _a.call(results_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
            return base;
        };
        proxy.getQuickInfoAtPosition = function (fileName, position) {
            var base = oldLS.getQuickInfoAtPosition(fileName, position);
            // TODO(vicb): the tags property has been removed in TS 2.2
            tryOperation('get quick info', function () {
                var e_2, _a;
                var ours = ls.getHoverAt(fileName, position);
                if (ours) {
                    var displayParts = [];
                    try {
                        for (var _b = tslib_1.__values(ours.text), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var part = _c.value;
                            displayParts.push({ kind: part.language || 'angular', text: part.text });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    var tags = base && base.tags;
                    base = {
                        displayParts: displayParts,
                        documentation: [],
                        kind: 'angular',
                        kindModifiers: 'what does this do?',
                        textSpan: { start: ours.span.start, length: ours.span.end - ours.span.start },
                    };
                    if (tags) {
                        base.tags = tags;
                    }
                }
            });
            return base;
        };
        proxy.getSemanticDiagnostics = function (fileName) {
            var result = oldLS.getSemanticDiagnostics(fileName);
            var base = result || [];
            tryOperation('get diagnostics', function () {
                info.project.projectService.logger.info("Computing Angular semantic diagnostics...");
                var ours = ls.getDiagnostics(fileName);
                if (ours && ours.length) {
                    var file_1 = oldLS.getProgram().getSourceFile(fileName);
                    if (file_1) {
                        base.push.apply(base, ours.map(function (d) { return diagnosticToDiagnostic(d, file_1); }));
                    }
                }
            });
            return base;
        };
        proxy.getDefinitionAtPosition = function (fileName, position) {
            var base = oldLS.getDefinitionAtPosition(fileName, position);
            if (base && base.length) {
                return base;
            }
            return tryOperation('get definition', function () {
                var e_3, _a;
                var ours = ls.getDefinitionAt(fileName, position);
                if (ours && ours.length) {
                    base = base || [];
                    try {
                        for (var ours_1 = tslib_1.__values(ours), ours_1_1 = ours_1.next(); !ours_1_1.done; ours_1_1 = ours_1.next()) {
                            var loc = ours_1_1.value;
                            base.push({
                                fileName: loc.fileName,
                                textSpan: { start: loc.span.start, length: loc.span.end - loc.span.start },
                                name: '',
                                // TODO: remove any and fix type error.
                                kind: 'definition',
                                containerName: loc.fileName,
                                containerKind: 'file',
                            });
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (ours_1_1 && !ours_1_1.done && (_a = ours_1.return)) _a.call(ours_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
                return base;
            }) || [];
        };
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRkFBeUQ7SUFFekQsaUZBQXdEO0lBRXhELElBQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUE4QixDQUFDO0lBRWpFLFNBQWdCLGdCQUFnQixDQUFDLE9BQVk7UUFDM0MsSUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxJQUFJLElBQUksRUFBRTtZQUNSLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7U0FDckM7SUFDSCxDQUFDO0lBTEQsNENBS0M7SUFFRCxTQUFnQixNQUFNLENBQUMsSUFBUyxDQUFDLGdDQUFnQztRQUMvRCxtQkFBbUI7UUFDbkIsSUFBTSxLQUFLLEdBQXVCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBSSxLQUFLLEdBQXVCLElBQUksQ0FBQyxlQUFlLENBQUM7UUFFckQsU0FBUyxPQUFPLENBQUksUUFBNEIsRUFBRSxRQUFpQjtZQUNqRSxJQUFJLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzdELE9BQU8sU0FBcUIsQ0FBQzthQUM5QjtZQUNELElBQUk7Z0JBQ0YsT0FBTyxRQUFRLEVBQUUsQ0FBQzthQUNuQjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sU0FBcUIsQ0FBQzthQUM5QjtRQUNILENBQUM7UUFFRCxTQUFTLGVBQWUsQ0FBSSxDQUEwQjtZQUNwRCxPQUFPLFVBQUEsUUFBUSxJQUFJLE9BQUEsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFN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Q0FBRTs0QkFBbkIsSUFBTSxHQUFHLGlCQUFBOzRCQUNaLElBQUksQ0FBQyxJQUFJLENBQUM7Z0NBQ1IsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2dDQUN0QixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO2dDQUN4RSxJQUFJLEVBQUUsRUFBRTtnQ0FDUix1Q0FBdUM7Z0NBQ3ZDLElBQUksRUFBRSxZQUFtQjtnQ0FDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2dDQUMzQixhQUFhLEVBQUUsTUFBYTs2QkFDN0IsQ0FBQyxDQUFDO3lCQUNKOzs7Ozs7Ozs7aUJBQ0Y7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDO1FBRUYsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBMVJELHdCQTBSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtDb21wbGV0aW9uLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuY29uc3QgcHJvamVjdEhvc3RNYXAgPSBuZXcgV2Vha01hcDxhbnksIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogYW55KTogc3RyaW5nW118dW5kZWZpbmVkIHtcbiAgY29uc3QgaG9zdCA9IHByb2plY3RIb3N0TWFwLmdldChwcm9qZWN0KTtcbiAgaWYgKGhvc3QpIHtcbiAgICByZXR1cm4gaG9zdC5nZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKGluZm86IGFueSAvKiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyAqLyk6IHRzLkxhbmd1YWdlU2VydmljZSB7XG4gIC8vIENyZWF0ZSB0aGUgcHJveHlcbiAgY29uc3QgcHJveHk6IHRzLkxhbmd1YWdlU2VydmljZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGxldCBvbGRMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlID0gaW5mby5sYW5ndWFnZVNlcnZpY2U7XG5cbiAgZnVuY3Rpb24gdHJ5Q2FsbDxUPihmaWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBjYWxsYmFjazogKCkgPT4gVCk6IFQge1xuICAgIGlmIChmaWxlTmFtZSAmJiAhb2xkTFMuZ2V0UHJvZ3JhbSgpICEuZ2V0U291cmNlRmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQgYXMgYW55IGFzIFQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkIGFzIGFueSBhcyBUO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeUZpbGVuYW1lQ2FsbDxUPihtOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gVCk6IChmaWxlTmFtZTogc3RyaW5nKSA9PiBUIHtcbiAgICByZXR1cm4gZmlsZU5hbWUgPT4gdHJ5Q2FsbChmaWxlTmFtZSwgKCkgPT4gPFQ+KG0uY2FsbChscywgZmlsZU5hbWUpKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cnlGaWxlbmFtZU9uZUNhbGw8VCwgUD4obTogKGZpbGVOYW1lOiBzdHJpbmcsIHA6IFApID0+IFQpOiAoZmlsZW5hbWU6IHN0cmluZywgcDogUCkgPT5cbiAgICAgIFQge1xuICAgIHJldHVybiAoZmlsZU5hbWUsIHApID0+IHRyeUNhbGwoZmlsZU5hbWUsICgpID0+IDxUPihtLmNhbGwobHMsIGZpbGVOYW1lLCBwKSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJ5RmlsZW5hbWVUd29DYWxsPFQsIFAxLCBQMj4obTogKGZpbGVOYW1lOiBzdHJpbmcsIHAxOiBQMSwgcDI6IFAyKSA9PiBUKTogKFxuICAgICAgZmlsZW5hbWU6IHN0cmluZywgcDE6IFAxLCBwMjogUDIpID0+IFQge1xuICAgIHJldHVybiAoZmlsZU5hbWUsIHAxLCBwMikgPT4gdHJ5Q2FsbChmaWxlTmFtZSwgKCkgPT4gPFQ+KG0uY2FsbChscywgZmlsZU5hbWUsIHAxLCBwMikpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeUZpbGVuYW1lVGhyZWVDYWxsPFQsIFAxLCBQMiwgUDM+KG06IChmaWxlTmFtZTogc3RyaW5nLCBwMTogUDEsIHAyOiBQMiwgcDM6IFAzKSA9PiBUKTpcbiAgICAgIChmaWxlbmFtZTogc3RyaW5nLCBwMTogUDEsIHAyOiBQMiwgcDM6IFAzKSA9PiBUIHtcbiAgICByZXR1cm4gKGZpbGVOYW1lLCBwMSwgcDIsIHAzKSA9PiB0cnlDYWxsKGZpbGVOYW1lLCAoKSA9PiA8VD4obS5jYWxsKGxzLCBmaWxlTmFtZSwgcDEsIHAyLCBwMykpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeUZpbGVuYW1lRm91ckNhbGw8VCwgUDEsIFAyLCBQMywgUDQ+KFxuICAgICAgbTogKGZpbGVOYW1lOiBzdHJpbmcsIHAxOiBQMSwgcDI6IFAyLCBwMzogUDMsIHA0OiBQNCkgPT5cbiAgICAgICAgICBUKTogKGZpbGVOYW1lOiBzdHJpbmcsIHAxOiBQMSwgcDI6IFAyLCBwMzogUDMsIHA0OiBQNCkgPT4gVCB7XG4gICAgcmV0dXJuIChmaWxlTmFtZSwgcDEsIHAyLCBwMywgcDQpID0+XG4gICAgICAgICAgICAgICB0cnlDYWxsKGZpbGVOYW1lLCAoKSA9PiA8VD4obS5jYWxsKGxzLCBmaWxlTmFtZSwgcDEsIHAyLCBwMywgcDQpKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cnlGaWxlbmFtZUZpdmVDYWxsPFQsIFAxLCBQMiwgUDMsIFA0LCBQNT4oXG4gICAgICBtOiAoZmlsZU5hbWU6IHN0cmluZywgcDE6IFAxLCBwMjogUDIsIHAzOiBQMywgcDQ6IFA0LCBwNTogUDUpID0+XG4gICAgICAgICAgVCk6IChmaWxlTmFtZTogc3RyaW5nLCBwMTogUDEsIHAyOiBQMiwgcDM6IFAzLCBwNDogUDQsIHA1OiBQNSkgPT4gVCB7XG4gICAgcmV0dXJuIChmaWxlTmFtZSwgcDEsIHAyLCBwMywgcDQsIHA1KSA9PlxuICAgICAgICAgICAgICAgdHJ5Q2FsbChmaWxlTmFtZSwgKCkgPT4gPFQ+KG0uY2FsbChscywgZmlsZU5hbWUsIHAxLCBwMiwgcDMsIHA0LCBwNSkpKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gdHlwZXNjcmlwdE9ubHkobHM6IHRzLkxhbmd1YWdlU2VydmljZSk6IHRzLkxhbmd1YWdlU2VydmljZSB7XG4gICAgY29uc3QgbGFuZ3VhZ2VTZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2UgPSB7XG4gICAgICBjbGVhbnVwU2VtYW50aWNDYWNoZTogKCkgPT4gbHMuY2xlYW51cFNlbWFudGljQ2FjaGUoKSxcbiAgICAgIGdldFN5bnRhY3RpY0RpYWdub3N0aWNzOiB0cnlGaWxlbmFtZUNhbGwobHMuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MpLFxuICAgICAgZ2V0U2VtYW50aWNEaWFnbm9zdGljczogdHJ5RmlsZW5hbWVDYWxsKGxzLmdldFNlbWFudGljRGlhZ25vc3RpY3MpLFxuICAgICAgZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3M6ICgpID0+IGxzLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCksXG4gICAgICBnZXRTeW50YWN0aWNDbGFzc2lmaWNhdGlvbnM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRTZW1hbnRpY0NsYXNzaWZpY2F0aW9ucyksXG4gICAgICBnZXRTZW1hbnRpY0NsYXNzaWZpY2F0aW9uczogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldFNlbWFudGljQ2xhc3NpZmljYXRpb25zKSxcbiAgICAgIGdldEVuY29kZWRTeW50YWN0aWNDbGFzc2lmaWNhdGlvbnM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRFbmNvZGVkU3ludGFjdGljQ2xhc3NpZmljYXRpb25zKSxcbiAgICAgIGdldEVuY29kZWRTZW1hbnRpY0NsYXNzaWZpY2F0aW9uczogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldEVuY29kZWRTZW1hbnRpY0NsYXNzaWZpY2F0aW9ucyksXG4gICAgICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb246IHRyeUZpbGVuYW1lVHdvQ2FsbChscy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24pLFxuICAgICAgZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlsczogdHJ5RmlsZW5hbWVGaXZlQ2FsbChscy5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKSxcbiAgICAgIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbDogdHJ5RmlsZW5hbWVUaHJlZUNhbGwobHMuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKSxcbiAgICAgIGdldEpzeENsb3NpbmdUYWdBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0SnN4Q2xvc2luZ1RhZ0F0UG9zaXRpb24pLFxuICAgICAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldFF1aWNrSW5mb0F0UG9zaXRpb24pLFxuICAgICAgZ2V0TmFtZU9yRG90dGVkTmFtZVNwYW46IHRyeUZpbGVuYW1lVHdvQ2FsbChscy5nZXROYW1lT3JEb3R0ZWROYW1lU3BhbiksXG4gICAgICBnZXRCcmVha3BvaW50U3RhdGVtZW50QXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldEJyZWFrcG9pbnRTdGF0ZW1lbnRBdFBvc2l0aW9uKSxcbiAgICAgIGdldFNpZ25hdHVyZUhlbHBJdGVtczogdHJ5RmlsZW5hbWVUd29DYWxsKGxzLmdldFNpZ25hdHVyZUhlbHBJdGVtcyksXG4gICAgICBnZXRSZW5hbWVJbmZvOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0UmVuYW1lSW5mbyksXG4gICAgICBmaW5kUmVuYW1lTG9jYXRpb25zOiB0cnlGaWxlbmFtZVRocmVlQ2FsbChscy5maW5kUmVuYW1lTG9jYXRpb25zKSxcbiAgICAgIGdldERlZmluaXRpb25BdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24pLFxuICAgICAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKSxcbiAgICAgIGdldEltcGxlbWVudGF0aW9uQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldEltcGxlbWVudGF0aW9uQXRQb3NpdGlvbiksXG4gICAgICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKSxcbiAgICAgIGZpbmRSZWZlcmVuY2VzOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZmluZFJlZmVyZW5jZXMpLFxuICAgICAgZ2V0RG9jdW1lbnRIaWdobGlnaHRzOiB0cnlGaWxlbmFtZVR3b0NhbGwobHMuZ2V0RG9jdW1lbnRIaWdobGlnaHRzKSxcbiAgICAgIC8qKiBAZGVwcmVjYXRlZCAqL1xuICAgICAgZ2V0T2NjdXJyZW5jZXNBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0T2NjdXJyZW5jZXNBdFBvc2l0aW9uKSxcbiAgICAgIGdldE5hdmlnYXRlVG9JdGVtczpcbiAgICAgICAgICAoc2VhcmNoVmFsdWUsIG1heFJlc3VsdENvdW50LCBmaWxlTmFtZSwgZXhjbHVkZUR0c0ZpbGVzKSA9PiB0cnlDYWxsKFxuICAgICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgKCkgPT4gbHMuZ2V0TmF2aWdhdGVUb0l0ZW1zKHNlYXJjaFZhbHVlLCBtYXhSZXN1bHRDb3VudCwgZmlsZU5hbWUsIGV4Y2x1ZGVEdHNGaWxlcykpLFxuICAgICAgZ2V0TmF2aWdhdGlvbkJhckl0ZW1zOiB0cnlGaWxlbmFtZUNhbGwobHMuZ2V0TmF2aWdhdGlvbkJhckl0ZW1zKSxcbiAgICAgIGdldE5hdmlnYXRpb25UcmVlOiB0cnlGaWxlbmFtZUNhbGwobHMuZ2V0TmF2aWdhdGlvblRyZWUpLFxuICAgICAgZ2V0T3V0bGluaW5nU3BhbnM6IHRyeUZpbGVuYW1lQ2FsbChscy5nZXRPdXRsaW5pbmdTcGFucyksXG4gICAgICBnZXRUb2RvQ29tbWVudHM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRUb2RvQ29tbWVudHMpLFxuICAgICAgZ2V0QnJhY2VNYXRjaGluZ0F0UG9zaXRpb246IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRCcmFjZU1hdGNoaW5nQXRQb3NpdGlvbiksXG4gICAgICBnZXRJbmRlbnRhdGlvbkF0UG9zaXRpb246IHRyeUZpbGVuYW1lVHdvQ2FsbChscy5nZXRJbmRlbnRhdGlvbkF0UG9zaXRpb24pLFxuICAgICAgZ2V0Rm9ybWF0dGluZ0VkaXRzRm9yUmFuZ2U6IHRyeUZpbGVuYW1lVGhyZWVDYWxsKGxzLmdldEZvcm1hdHRpbmdFZGl0c0ZvclJhbmdlKSxcbiAgICAgIGdldEZvcm1hdHRpbmdFZGl0c0ZvckRvY3VtZW50OiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0Rm9ybWF0dGluZ0VkaXRzRm9yRG9jdW1lbnQpLFxuICAgICAgZ2V0Rm9ybWF0dGluZ0VkaXRzQWZ0ZXJLZXlzdHJva2U6IHRyeUZpbGVuYW1lVGhyZWVDYWxsKGxzLmdldEZvcm1hdHRpbmdFZGl0c0FmdGVyS2V5c3Ryb2tlKSxcbiAgICAgIGdldERvY0NvbW1lbnRUZW1wbGF0ZUF0UG9zaXRpb246IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXREb2NDb21tZW50VGVtcGxhdGVBdFBvc2l0aW9uKSxcbiAgICAgIGlzVmFsaWRCcmFjZUNvbXBsZXRpb25BdFBvc2l0aW9uOiB0cnlGaWxlbmFtZVR3b0NhbGwobHMuaXNWYWxpZEJyYWNlQ29tcGxldGlvbkF0UG9zaXRpb24pLFxuICAgICAgZ2V0U3Bhbk9mRW5jbG9zaW5nQ29tbWVudDogdHJ5RmlsZW5hbWVUd29DYWxsKGxzLmdldFNwYW5PZkVuY2xvc2luZ0NvbW1lbnQpLFxuICAgICAgZ2V0Q29kZUZpeGVzQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVGaXZlQ2FsbChscy5nZXRDb2RlRml4ZXNBdFBvc2l0aW9uKSxcbiAgICAgIGFwcGx5Q29kZUFjdGlvbkNvbW1hbmQ6XG4gICAgICAgICAgPGFueT4oKGFjdGlvbjogYW55KSA9PiB0cnlDYWxsKHVuZGVmaW5lZCwgKCkgPT4gbHMuYXBwbHlDb2RlQWN0aW9uQ29tbWFuZChhY3Rpb24pKSksXG4gICAgICBnZXRFbWl0T3V0cHV0OiB0cnlGaWxlbmFtZUNhbGwobHMuZ2V0RW1pdE91dHB1dCksXG4gICAgICBnZXRQcm9ncmFtOiAoKSA9PiBscy5nZXRQcm9ncmFtKCksXG4gICAgICBkaXNwb3NlOiAoKSA9PiBscy5kaXNwb3NlKCksXG4gICAgICBnZXRBcHBsaWNhYmxlUmVmYWN0b3JzOiB0cnlGaWxlbmFtZVR3b0NhbGwobHMuZ2V0QXBwbGljYWJsZVJlZmFjdG9ycyksXG4gICAgICBnZXRFZGl0c0ZvclJlZmFjdG9yOiB0cnlGaWxlbmFtZUZpdmVDYWxsKGxzLmdldEVkaXRzRm9yUmVmYWN0b3IpLFxuICAgICAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4pLFxuICAgICAgZ2V0Q29tYmluZWRDb2RlRml4OlxuICAgICAgICAgIChzY29wZTogdHMuQ29tYmluZWRDb2RlRml4U2NvcGUsIGZpeElkOiB7fSwgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZVNldHRpbmdzLFxuICAgICAgICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzKSA9PlxuICAgICAgICAgICAgICB0cnlDYWxsKFxuICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLCAoKSA9PiBscy5nZXRDb21iaW5lZENvZGVGaXgoc2NvcGUsIGZpeElkLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcykpLFxuICAgICAgLy8gVE9ETyhreWxpYXUpOiBkdW1teSBpbXBsZW1lbnRhdGlvbiB0byBjb21waWxlIHdpdGggdHMgMi44LCBjcmVhdGUgcmVhbCBvbmVcbiAgICAgIGdldFN1Z2dlc3Rpb25EaWFnbm9zdGljczogKGZpbGVOYW1lOiBzdHJpbmcpID0+IFtdLFxuICAgICAgLy8gVE9ETyhreWxpYXUpOiBkdW1teSBpbXBsZW1lbnRhdGlvbiB0byBjb21waWxlIHdpdGggdHMgMi44LCBjcmVhdGUgcmVhbCBvbmVcbiAgICAgIG9yZ2FuaXplSW1wb3J0czogKHNjb3BlOiB0cy5Db21iaW5lZENvZGVGaXhTY29wZSwgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZVNldHRpbmdzKSA9PiBbXSxcbiAgICAgIC8vIFRPRE86IGR1bW15IGltcGxlbWVudGF0aW9uIHRvIGNvbXBpbGUgd2l0aCB0cyAyLjksIGNyZWF0ZSBhIHJlYWwgb25lXG4gICAgICBnZXRFZGl0c0ZvckZpbGVSZW5hbWU6XG4gICAgICAgICAgKG9sZEZpbGVQYXRoOiBzdHJpbmcsIG5ld0ZpbGVQYXRoOiBzdHJpbmcsIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVTZXR0aW5ncyxcbiAgICAgICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlcyB8IHVuZGVmaW5lZCkgPT4gW11cbiAgICB9IGFzIHRzLkxhbmd1YWdlU2VydmljZTtcbiAgICByZXR1cm4gbGFuZ3VhZ2VTZXJ2aWNlO1xuICB9XG5cbiAgb2xkTFMgPSB0eXBlc2NyaXB0T25seShvbGRMUyk7XG5cbiAgZm9yIChjb25zdCBrIGluIG9sZExTKSB7XG4gICAgKDxhbnk+cHJveHkpW2tdID0gZnVuY3Rpb24oKSB7IHJldHVybiAob2xkTFMgYXMgYW55KVtrXS5hcHBseShvbGRMUywgYXJndW1lbnRzKTsgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBsZXRpb25Ub0VudHJ5KGM6IENvbXBsZXRpb24pOiB0cy5Db21wbGV0aW9uRW50cnkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICAgIGtpbmQ6IGMua2luZCBhcyBhbnksXG4gICAgICBuYW1lOiBjLm5hbWUsXG4gICAgICBzb3J0VGV4dDogYy5zb3J0LFxuICAgICAga2luZE1vZGlmaWVyczogJydcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4oY2hhaW46IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4pOlxuICAgICAgdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2VUZXh0OiBjaGFpbi5tZXNzYWdlLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IDAsXG4gICAgICBuZXh0OiBjaGFpbi5uZXh0ID8gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4oY2hhaW4ubmV4dCkgOiB1bmRlZmluZWRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChtZXNzYWdlOiBzdHJpbmcgfCBEaWFnbm9zdGljTWVzc2FnZUNoYWluKTpcbiAgICAgIHN0cmluZ3x0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKG1lc3NhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhZ25vc3RpY1RvRGlhZ25vc3RpYyhkOiBEaWFnbm9zdGljLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuRGlhZ25vc3RpYyB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgZmlsZSxcbiAgICAgIHN0YXJ0OiBkLnNwYW4uc3RhcnQsXG4gICAgICBsZW5ndGg6IGQuc3Bhbi5lbmQgLSBkLnNwYW4uc3RhcnQsXG4gICAgICBtZXNzYWdlVGV4dDogZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChkLm1lc3NhZ2UpLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IDAsXG4gICAgICBzb3VyY2U6ICduZydcbiAgICB9O1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiB0cnlPcGVyYXRpb248VD4oYXR0ZW1wdGluZzogc3RyaW5nLCBjYWxsYmFjazogKCkgPT4gVCk6IFR8bnVsbCB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGluZm8ucHJvamVjdC5wcm9qZWN0U2VydmljZS5sb2dnZXIuaW5mbyhgRmFpbGVkIHRvICR7YXR0ZW1wdGluZ306ICR7ZS50b1N0cmluZygpfWApO1xuICAgICAgaW5mby5wcm9qZWN0LnByb2plY3RTZXJ2aWNlLmxvZ2dlci5pbmZvKGBTdGFjayB0cmFjZTogJHtlLnN0YWNrfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2VydmljZUhvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KGluZm8ubGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgaW5mby5sYW5ndWFnZVNlcnZpY2UpO1xuICBjb25zdCBscyA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShzZXJ2aWNlSG9zdCBhcyBhbnkpO1xuICBzZXJ2aWNlSG9zdC5zZXRTaXRlKGxzKTtcbiAgcHJvamVjdEhvc3RNYXAuc2V0KGluZm8ucHJvamVjdCwgc2VydmljZUhvc3QpO1xuXG4gIHByb3h5LmdldENvbXBsZXRpb25zQXRQb3NpdGlvbiA9IGZ1bmN0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpIHtcbiAgICBsZXQgYmFzZSA9IG9sZExTLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIG9wdGlvbnMpIHx8IHtcbiAgICAgIGlzR2xvYmFsQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc01lbWJlckNvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNOZXdJZGVudGlmaWVyTG9jYXRpb246IGZhbHNlLFxuICAgICAgZW50cmllczogW11cbiAgICB9O1xuICAgIHRyeU9wZXJhdGlvbignZ2V0IGNvbXBsZXRpb25zJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGxzLmdldENvbXBsZXRpb25zQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChiYXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBiYXNlID0ge1xuICAgICAgICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICAgICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBlbnRyaWVzOiBbXVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgYmFzZS5lbnRyaWVzLnB1c2goY29tcGxldGlvblRvRW50cnkoZW50cnkpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBiYXNlO1xuICB9O1xuXG4gIHByb3h5LmdldFF1aWNrSW5mb0F0UG9zaXRpb24gPSBmdW5jdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvIHxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICAvLyBUT0RPKHZpY2IpOiB0aGUgdGFncyBwcm9wZXJ0eSBoYXMgYmVlbiByZW1vdmVkIGluIFRTIDIuMlxuICAgICAgICB0cnlPcGVyYXRpb24oJ2dldCBxdWljayBpbmZvJywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG91cnMgPSBscy5nZXRIb3ZlckF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgaWYgKG91cnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIG91cnMudGV4dCkge1xuICAgICAgICAgICAgICBkaXNwbGF5UGFydHMucHVzaCh7a2luZDogcGFydC5sYW5ndWFnZSB8fCAnYW5ndWxhcicsIHRleHQ6IHBhcnQudGV4dH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdGFncyA9IGJhc2UgJiYgKDxhbnk+YmFzZSkudGFncztcbiAgICAgICAgICAgIGJhc2UgPSA8YW55PntcbiAgICAgICAgICAgICAgZGlzcGxheVBhcnRzLFxuICAgICAgICAgICAgICBkb2N1bWVudGF0aW9uOiBbXSxcbiAgICAgICAgICAgICAga2luZDogJ2FuZ3VsYXInLFxuICAgICAgICAgICAgICBraW5kTW9kaWZpZXJzOiAnd2hhdCBkb2VzIHRoaXMgZG8/JyxcbiAgICAgICAgICAgICAgdGV4dFNwYW46IHtzdGFydDogb3Vycy5zcGFuLnN0YXJ0LCBsZW5ndGg6IG91cnMuc3Bhbi5lbmQgLSBvdXJzLnNwYW4uc3RhcnR9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh0YWdzKSB7XG4gICAgICAgICAgICAgICg8YW55PmJhc2UpLnRhZ3MgPSB0YWdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICB9O1xuXG4gIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSBmdW5jdGlvbihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IHJlc3VsdCA9IG9sZExTLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuICAgIGNvbnN0IGJhc2UgPSByZXN1bHQgfHwgW107XG4gICAgdHJ5T3BlcmF0aW9uKCdnZXQgZGlhZ25vc3RpY3MnLCAoKSA9PiB7XG4gICAgICBpbmZvLnByb2plY3QucHJvamVjdFNlcnZpY2UubG9nZ2VyLmluZm8oYENvbXB1dGluZyBBbmd1bGFyIHNlbWFudGljIGRpYWdub3N0aWNzLi4uYCk7XG4gICAgICBjb25zdCBvdXJzID0gbHMuZ2V0RGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuICAgICAgaWYgKG91cnMgJiYgb3Vycy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IG9sZExTLmdldFByb2dyYW0oKSAhLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgIGJhc2UucHVzaC5hcHBseShiYXNlLCBvdXJzLm1hcChkID0+IGRpYWdub3N0aWNUb0RpYWdub3N0aWMoZCwgZmlsZSkpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGJhc2U7XG4gIH07XG5cbiAgcHJveHkuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24gPSBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvW10ge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYmFzZSAmJiBiYXNlLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGJhc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyeU9wZXJhdGlvbignZ2V0IGRlZmluaXRpb24nLCAoKSA9PiB7XG4gICAgICAgICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICBiYXNlID0gYmFzZSB8fCBbXTtcbiAgICAgICAgICAgICAgIGZvciAoY29uc3QgbG9jIG9mIG91cnMpIHtcbiAgICAgICAgICAgICAgICAgYmFzZS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogbG9jLmZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgIHRleHRTcGFuOiB7c3RhcnQ6IGxvYy5zcGFuLnN0YXJ0LCBsZW5ndGg6IGxvYy5zcGFuLmVuZCAtIGxvYy5zcGFuLnN0YXJ0fSxcbiAgICAgICAgICAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICAgICAgICAgICAgICAgICBraW5kOiAnZGVmaW5pdGlvbicgYXMgYW55LFxuICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICBjb250YWluZXJLaW5kOiAnZmlsZScgYXMgYW55LFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICAgICAgIH0pIHx8IFtdO1xuICB9O1xuXG4gIHJldHVybiBwcm94eTtcbn1cbiJdfQ==