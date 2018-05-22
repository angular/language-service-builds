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
                getCompletionEntryDetails: tryFilenameFourCall(ls.getCompletionEntryDetails),
                getCompletionEntrySymbol: tryFilenameThreeCall(ls.getCompletionEntrySymbol),
                getQuickInfoAtPosition: tryFilenameOneCall(ls.getQuickInfoAtPosition),
                getNameOrDottedNameSpan: tryFilenameTwoCall(ls.getNameOrDottedNameSpan),
                getBreakpointStatementAtPosition: tryFilenameOneCall(ls.getBreakpointStatementAtPosition),
                getSignatureHelpItems: tryFilenameOneCall(ls.getSignatureHelpItems),
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
                getCodeFixesAtPosition: tryFilenameFourCall(ls.getCodeFixesAtPosition),
                applyCodeActionCommand: (function (action) { return tryCall(undefined, function () { return ls.applyCodeActionCommand(action); }); }),
                getEmitOutput: tryFilenameCall(ls.getEmitOutput),
                getProgram: function () { return ls.getProgram(); },
                dispose: function () { return ls.dispose(); },
                getApplicableRefactors: tryFilenameOneCall(ls.getApplicableRefactors),
                getEditsForRefactor: tryFilenameFourCall(ls.getEditsForRefactor),
                getDefinitionAndBoundSpan: tryFilenameOneCall(ls.getDefinitionAndBoundSpan),
                getCombinedCodeFix: function (scope, fixId, formatOptions) {
                    return tryCall(undefined, function () { return ls.getCombinedCodeFix(scope, fixId, formatOptions); });
                },
                // TODO(kyliau): dummy implementation to compile with ts 2.8, create real one
                getSuggestionDiagnostics: function (fileName) { return []; },
                // TODO(kyliau): dummy implementation to compile with ts 2.8, create real one
                organizeImports: function (scope, formatOptions) { return []; },
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
                var e_1, _a;
            });
            return base;
        };
        proxy.getQuickInfoAtPosition = function (fileName, position) {
            var base = oldLS.getQuickInfoAtPosition(fileName, position);
            // TODO(vicb): the tags property has been removed in TS 2.2
            tryOperation('get quick info', function () {
                var ours = ls.getHoverAt(fileName, position);
                if (ours) {
                    var displayParts = [];
                    try {
                        for (var _a = tslib_1.__values(ours.text), _b = _a.next(); !_b.done; _b = _a.next()) {
                            var part = _b.value;
                            displayParts.push({ kind: part.language || 'angular', text: part.text });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
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
                var e_2, _c;
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
                var e_3, _a;
            }) || [];
        };
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRkFBeUQ7SUFFekQsaUZBQXdEO0lBRXhELElBQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUE4QixDQUFDO0lBRWpFLDBCQUFpQyxPQUFZO1FBQzNDLElBQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxJQUFJLEVBQUU7WUFDUixPQUFPLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQztJQUxELDRDQUtDO0lBRUQsZ0JBQXVCLElBQVMsQ0FBQyxnQ0FBZ0M7UUFDL0QsbUJBQW1CO1FBQ25CLElBQU0sS0FBSyxHQUF1QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELElBQUksS0FBSyxHQUF1QixJQUFJLENBQUMsZUFBZSxDQUFDO1FBRXJELGlCQUFvQixRQUE0QixFQUFFLFFBQWlCO1lBQ2pFLElBQUksUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0QsT0FBTyxTQUFxQixDQUFDO2FBQzlCO1lBQ0QsSUFBSTtnQkFDRixPQUFPLFFBQVEsRUFBRSxDQUFDO2FBQ25CO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxTQUFxQixDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUVELHlCQUE0QixDQUEwQjtZQUNwRCxPQUFPLFVBQUEsUUFBUSxJQUFJLE9BQUEsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFNLE9BQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUF6QixDQUF5QixDQUFDLEVBQWxELENBQWtELENBQUM7UUFDeEUsQ0FBQztRQUVELDRCQUFrQyxDQUFnQztZQUVoRSxPQUFPLFVBQUMsUUFBUSxFQUFFLENBQUMsSUFBSyxPQUFBLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBTSxPQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQTVCLENBQTRCLENBQUMsRUFBckQsQ0FBcUQsQ0FBQztRQUNoRixDQUFDO1FBRUQsNEJBQXVDLENBQTBDO1lBRS9FLE9BQU8sVUFBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSyxPQUFBLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBTSxPQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDLEVBQTFELENBQTBELENBQUM7UUFDMUYsQ0FBQztRQUVELDhCQUE2QyxDQUFrRDtZQUU3RixPQUFPLFVBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFLLE9BQUEsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFNLE9BQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFyQyxDQUFxQyxDQUFDLEVBQTlELENBQThELENBQUM7UUFDbEcsQ0FBQztRQUVELDZCQUNJLENBQ0s7WUFDUCxPQUFPLFVBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQ3JCLE9BQUEsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFNLE9BQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBekMsQ0FBeUMsQ0FBQztZQUFsRSxDQUFrRSxDQUFDO1FBQ2hGLENBQUM7UUFFRCx3QkFBd0IsRUFBc0I7WUFDNUMsSUFBTSxlQUFlLEdBQXVCO2dCQUMxQyxvQkFBb0IsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQXpCLENBQXlCO2dCQUNyRCx1QkFBdUIsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUNwRSxzQkFBc0IsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLHNCQUFzQixDQUFDO2dCQUNsRSw2QkFBNkIsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLDZCQUE2QixFQUFFLEVBQWxDLENBQWtDO2dCQUN2RSwyQkFBMkIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsMEJBQTBCLENBQUM7Z0JBQzlFLDBCQUEwQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQztnQkFDN0Usa0NBQWtDLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLGtDQUFrQyxDQUFDO2dCQUM3RixpQ0FBaUMsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsaUNBQWlDLENBQUM7Z0JBQzNGLHdCQUF3QixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDekUseUJBQXlCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDO2dCQUM1RSx3QkFBd0IsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUM7Z0JBQzNFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDckUsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUN2RSxnQ0FBZ0MsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsZ0NBQWdDLENBQUM7Z0JBQ3pGLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQztnQkFDbkUsYUFBYSxFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUM7Z0JBQ25ELG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztnQkFDakUsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUN2RSwyQkFBMkIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsMkJBQTJCLENBQUM7Z0JBQy9FLDJCQUEyQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQztnQkFDL0UsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUN2RSxjQUFjLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQztnQkFDckQscUJBQXFCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDO2dCQUNuRSxrQkFBa0I7Z0JBQ2xCLHdCQUF3QixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDekUsa0JBQWtCLEVBQ2QsVUFBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxlQUFlLElBQUssT0FBQSxPQUFPLENBQy9ELFFBQVEsRUFDUixjQUFNLE9BQUEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxFQUE3RSxDQUE2RSxDQUFDLEVBRjVCLENBRTRCO2dCQUM1RixxQkFBcUIsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDO2dCQUNoRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDO2dCQUN4RCxpQkFBaUIsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDO2dCQUN4RCxlQUFlLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQztnQkFDdkQsMEJBQTBCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDO2dCQUM3RSx3QkFBd0IsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3pFLDBCQUEwQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQztnQkFDL0UsNkJBQTZCLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLDZCQUE2QixDQUFDO2dCQUNuRixnQ0FBZ0MsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsZ0NBQWdDLENBQUM7Z0JBQzNGLCtCQUErQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztnQkFDdkYsZ0NBQWdDLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDLGdDQUFnQyxDQUFDO2dCQUN6Rix5QkFBeUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUM7Z0JBQzNFLHNCQUFzQixFQUFFLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDdEUsc0JBQXNCLEVBQ2IsQ0FBQyxVQUFDLE1BQVcsSUFBSyxPQUFBLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBTSxPQUFBLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsRUFBakMsQ0FBaUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDO2dCQUN2RixhQUFhLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUM7Z0JBQ2hELFVBQVUsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFmLENBQWU7Z0JBQ2pDLE9BQU8sRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFaLENBQVk7Z0JBQzNCLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDckUsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDO2dCQUNoRSx5QkFBeUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUM7Z0JBQzNFLGtCQUFrQixFQUNkLFVBQUMsS0FBOEIsRUFBRSxLQUFTLEVBQUUsYUFBb0M7b0JBQzVFLE9BQUEsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLEVBQWxELENBQWtELENBQUM7Z0JBQTVFLENBQTRFO2dCQUNwRiw2RUFBNkU7Z0JBQzdFLHdCQUF3QixFQUFFLFVBQUMsUUFBZ0IsSUFBSyxPQUFBLEVBQUUsRUFBRixDQUFFO2dCQUNsRCw2RUFBNkU7Z0JBQzdFLGVBQWUsRUFBRSxVQUFDLEtBQThCLEVBQUUsYUFBb0MsSUFBSyxPQUFBLEVBQUUsRUFBRixDQUFFO2FBQ3hFLENBQUM7WUFDeEIsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQztRQUVELEtBQUssR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBRW5CLENBQUM7WUFDSixLQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYSxPQUFRLEtBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFGRCxLQUFLLElBQU0sQ0FBQyxJQUFJLEtBQUs7b0JBQVYsQ0FBQztTQUVYO1FBRUQsMkJBQTJCLENBQWE7WUFDdEMsT0FBTztnQkFDTCx1Q0FBdUM7Z0JBQ3ZDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBVztnQkFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDaEIsYUFBYSxFQUFFLEVBQUU7YUFDbEIsQ0FBQztRQUNKLENBQUM7UUFFRCwwQ0FBMEMsS0FBNkI7WUFFckUsT0FBTztnQkFDTCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU87Z0JBQzFCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztnQkFDckMsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUM1RSxDQUFDO1FBQ0osQ0FBQztRQUVELGtEQUFrRCxPQUF3QztZQUV4RixJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtnQkFDL0IsT0FBTyxPQUFPLENBQUM7YUFDaEI7WUFDRCxPQUFPLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRCxnQ0FBZ0MsQ0FBYSxFQUFFLElBQW1CO1lBQ2hFLElBQU0sTUFBTSxHQUFHO2dCQUNiLElBQUksTUFBQTtnQkFDSixLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO2dCQUNuQixNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO2dCQUNqQyxXQUFXLEVBQUUsd0NBQXdDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDaEUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO2dCQUNyQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxNQUFNLEVBQUUsSUFBSTthQUNiLENBQUM7WUFDRixPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBRUQsc0JBQXlCLFVBQWtCLEVBQUUsUUFBaUI7WUFDNUQsSUFBSTtnQkFDRixPQUFPLFFBQVEsRUFBRSxDQUFDO2FBQ25CO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFhLFVBQVUsVUFBSyxDQUFDLENBQUMsUUFBUSxFQUFJLENBQUMsQ0FBQztnQkFDcEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBZ0IsQ0FBQyxDQUFDLEtBQU8sQ0FBQyxDQUFDO2dCQUNuRSxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztRQUVELElBQU0sV0FBVyxHQUFHLElBQUksdUNBQXFCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM5RixJQUFNLEVBQUUsR0FBRyx3Q0FBcUIsQ0FBQyxXQUFrQixDQUFDLENBQUM7UUFDckQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUMsS0FBSyxDQUFDLHdCQUF3QixHQUFHLFVBQzdCLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxPQUFxRDtZQUMzRixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDeEUsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsdUJBQXVCLEVBQUUsS0FBSztnQkFDOUIsT0FBTyxFQUFFLEVBQUU7YUFDWixDQUFDO1lBQ0YsWUFBWSxDQUFDLGlCQUFpQixFQUFFO2dCQUM5QixJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN4RCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUM3QixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7d0JBQ3RCLElBQUksR0FBRzs0QkFDTCxrQkFBa0IsRUFBRSxLQUFLOzRCQUN6QixrQkFBa0IsRUFBRSxLQUFLOzRCQUN6Qix1QkFBdUIsRUFBRSxLQUFLOzRCQUM5QixPQUFPLEVBQUUsRUFBRTt5QkFDWixDQUFDO3FCQUNIOzt3QkFDRCxLQUFvQixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBOzRCQUF0QixJQUFNLEtBQUssb0JBQUE7NEJBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt5QkFDN0M7Ozs7Ozs7OztpQkFDRjs7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsS0FBSyxDQUFDLHNCQUFzQixHQUFHLFVBQVMsUUFBZ0IsRUFBRSxRQUFnQjtZQUN4RSxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzVELDJEQUEyRDtZQUMzRCxZQUFZLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQzdCLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLElBQUksRUFBRTtvQkFDUixJQUFNLFlBQVksR0FBMkIsRUFBRSxDQUFDOzt3QkFDaEQsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxJQUFJLENBQUEsZ0JBQUE7NEJBQXZCLElBQU0sSUFBSSxXQUFBOzRCQUNiLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO3lCQUN4RTs7Ozs7Ozs7O29CQUNELElBQU0sSUFBSSxHQUFHLElBQUksSUFBVSxJQUFLLENBQUMsSUFBSSxDQUFDO29CQUN0QyxJQUFJLEdBQVE7d0JBQ1YsWUFBWSxjQUFBO3dCQUNaLGFBQWEsRUFBRSxFQUFFO3dCQUNqQixJQUFJLEVBQUUsU0FBUzt3QkFDZixhQUFhLEVBQUUsb0JBQW9CO3dCQUNuQyxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO3FCQUM1RSxDQUFDO29CQUNGLElBQUksSUFBSSxFQUFFO3dCQUNGLElBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO3FCQUN6QjtpQkFDRjs7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsS0FBSyxDQUFDLHNCQUFzQixHQUFHLFVBQVMsUUFBZ0I7WUFDdEQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BELElBQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixFQUFFO2dCQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7Z0JBQ3JGLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZCLElBQU0sTUFBSSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3hELElBQUksTUFBSSxFQUFFO3dCQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLE1BQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsQ0FBQztxQkFDdkU7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFVBQ0ksUUFBZ0IsRUFBRSxRQUFnQjtZQUNwRSxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDN0IsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3BELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDOzt3QkFDbEIsS0FBa0IsSUFBQSxTQUFBLGlCQUFBLElBQUksQ0FBQSwwQkFBQTs0QkFBakIsSUFBTSxHQUFHLGlCQUFBOzRCQUNaLElBQUksQ0FBQyxJQUFJLENBQUM7Z0NBQ1IsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2dDQUN0QixRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO2dDQUN4RSxJQUFJLEVBQUUsRUFBRTtnQ0FDUix1Q0FBdUM7Z0NBQ3ZDLElBQUksRUFBRSxZQUFtQjtnQ0FDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2dDQUMzQixhQUFhLEVBQUUsTUFBYTs2QkFDN0IsQ0FBQyxDQUFDO3lCQUNKOzs7Ozs7Ozs7aUJBQ0Y7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7O1lBQ2QsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQztRQUVGLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQTFRRCx3QkEwUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7Q29tcGxldGlvbiwgRGlhZ25vc3RpYywgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgTGFuZ3VhZ2VTZXJ2aWNlLCBMYW5ndWFnZVNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5cbmNvbnN0IHByb2plY3RIb3N0TWFwID0gbmV3IFdlYWtNYXA8YW55LCBUeXBlU2NyaXB0U2VydmljZUhvc3Q+KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlcm5hbEZpbGVzKHByb2plY3Q6IGFueSk6IHN0cmluZ1tdfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGhvc3QgPSBwcm9qZWN0SG9zdE1hcC5nZXQocHJvamVjdCk7XG4gIGlmIChob3N0KSB7XG4gICAgcmV0dXJuIGhvc3QuZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShpbmZvOiBhbnkgLyogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8gKi8pOiB0cy5MYW5ndWFnZVNlcnZpY2Uge1xuICAvLyBDcmVhdGUgdGhlIHByb3h5XG4gIGNvbnN0IHByb3h5OiB0cy5MYW5ndWFnZVNlcnZpY2UgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBsZXQgb2xkTFM6IHRzLkxhbmd1YWdlU2VydmljZSA9IGluZm8ubGFuZ3VhZ2VTZXJ2aWNlO1xuXG4gIGZ1bmN0aW9uIHRyeUNhbGw8VD4oZmlsZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgY2FsbGJhY2s6ICgpID0+IFQpOiBUIHtcbiAgICBpZiAoZmlsZU5hbWUgJiYgIW9sZExTLmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZCBhcyBhbnkgYXMgVDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQgYXMgYW55IGFzIFQ7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdHJ5RmlsZW5hbWVDYWxsPFQ+KG06IChmaWxlTmFtZTogc3RyaW5nKSA9PiBUKTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IFQge1xuICAgIHJldHVybiBmaWxlTmFtZSA9PiB0cnlDYWxsKGZpbGVOYW1lLCAoKSA9PiA8VD4obS5jYWxsKGxzLCBmaWxlTmFtZSkpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeUZpbGVuYW1lT25lQ2FsbDxULCBQPihtOiAoZmlsZU5hbWU6IHN0cmluZywgcDogUCkgPT4gVCk6IChmaWxlbmFtZTogc3RyaW5nLCBwOiBQKSA9PlxuICAgICAgVCB7XG4gICAgcmV0dXJuIChmaWxlTmFtZSwgcCkgPT4gdHJ5Q2FsbChmaWxlTmFtZSwgKCkgPT4gPFQ+KG0uY2FsbChscywgZmlsZU5hbWUsIHApKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cnlGaWxlbmFtZVR3b0NhbGw8VCwgUDEsIFAyPihtOiAoZmlsZU5hbWU6IHN0cmluZywgcDE6IFAxLCBwMjogUDIpID0+IFQpOiAoXG4gICAgICBmaWxlbmFtZTogc3RyaW5nLCBwMTogUDEsIHAyOiBQMikgPT4gVCB7XG4gICAgcmV0dXJuIChmaWxlTmFtZSwgcDEsIHAyKSA9PiB0cnlDYWxsKGZpbGVOYW1lLCAoKSA9PiA8VD4obS5jYWxsKGxzLCBmaWxlTmFtZSwgcDEsIHAyKSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJ5RmlsZW5hbWVUaHJlZUNhbGw8VCwgUDEsIFAyLCBQMz4obTogKGZpbGVOYW1lOiBzdHJpbmcsIHAxOiBQMSwgcDI6IFAyLCBwMzogUDMpID0+IFQpOlxuICAgICAgKGZpbGVuYW1lOiBzdHJpbmcsIHAxOiBQMSwgcDI6IFAyLCBwMzogUDMpID0+IFQge1xuICAgIHJldHVybiAoZmlsZU5hbWUsIHAxLCBwMiwgcDMpID0+IHRyeUNhbGwoZmlsZU5hbWUsICgpID0+IDxUPihtLmNhbGwobHMsIGZpbGVOYW1lLCBwMSwgcDIsIHAzKSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJ5RmlsZW5hbWVGb3VyQ2FsbDxULCBQMSwgUDIsIFAzLCBQND4oXG4gICAgICBtOiAoZmlsZU5hbWU6IHN0cmluZywgcDE6IFAxLCBwMjogUDIsIHAzOiBQMywgcDQ6IFA0KSA9PlxuICAgICAgICAgIFQpOiAoZmlsZU5hbWU6IHN0cmluZywgcDE6IFAxLCBwMjogUDIsIHAzOiBQMywgcDQ6IFA0KSA9PiBUIHtcbiAgICByZXR1cm4gKGZpbGVOYW1lLCBwMSwgcDIsIHAzLCBwNCkgPT5cbiAgICAgICAgICAgICAgIHRyeUNhbGwoZmlsZU5hbWUsICgpID0+IDxUPihtLmNhbGwobHMsIGZpbGVOYW1lLCBwMSwgcDIsIHAzLCBwNCkpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHR5cGVzY3JpcHRPbmx5KGxzOiB0cy5MYW5ndWFnZVNlcnZpY2UpOiB0cy5MYW5ndWFnZVNlcnZpY2Uge1xuICAgIGNvbnN0IGxhbmd1YWdlU2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlID0ge1xuICAgICAgY2xlYW51cFNlbWFudGljQ2FjaGU6ICgpID0+IGxzLmNsZWFudXBTZW1hbnRpY0NhY2hlKCksXG4gICAgICBnZXRTeW50YWN0aWNEaWFnbm9zdGljczogdHJ5RmlsZW5hbWVDYWxsKGxzLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKSxcbiAgICAgIGdldFNlbWFudGljRGlhZ25vc3RpY3M6IHRyeUZpbGVuYW1lQ2FsbChscy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKSxcbiAgICAgIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzOiAoKSA9PiBscy5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpLFxuICAgICAgZ2V0U3ludGFjdGljQ2xhc3NpZmljYXRpb25zOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0U2VtYW50aWNDbGFzc2lmaWNhdGlvbnMpLFxuICAgICAgZ2V0U2VtYW50aWNDbGFzc2lmaWNhdGlvbnM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRTZW1hbnRpY0NsYXNzaWZpY2F0aW9ucyksXG4gICAgICBnZXRFbmNvZGVkU3ludGFjdGljQ2xhc3NpZmljYXRpb25zOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0RW5jb2RlZFN5bnRhY3RpY0NsYXNzaWZpY2F0aW9ucyksXG4gICAgICBnZXRFbmNvZGVkU2VtYW50aWNDbGFzc2lmaWNhdGlvbnM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRFbmNvZGVkU2VtYW50aWNDbGFzc2lmaWNhdGlvbnMpLFxuICAgICAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZVR3b0NhbGwobHMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKSxcbiAgICAgIGdldENvbXBsZXRpb25FbnRyeURldGFpbHM6IHRyeUZpbGVuYW1lRm91ckNhbGwobHMuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyksXG4gICAgICBnZXRDb21wbGV0aW9uRW50cnlTeW1ib2w6IHRyeUZpbGVuYW1lVGhyZWVDYWxsKGxzLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbCksXG4gICAgICBnZXRRdWlja0luZm9BdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbiksXG4gICAgICBnZXROYW1lT3JEb3R0ZWROYW1lU3BhbjogdHJ5RmlsZW5hbWVUd29DYWxsKGxzLmdldE5hbWVPckRvdHRlZE5hbWVTcGFuKSxcbiAgICAgIGdldEJyZWFrcG9pbnRTdGF0ZW1lbnRBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0QnJlYWtwb2ludFN0YXRlbWVudEF0UG9zaXRpb24pLFxuICAgICAgZ2V0U2lnbmF0dXJlSGVscEl0ZW1zOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0U2lnbmF0dXJlSGVscEl0ZW1zKSxcbiAgICAgIGdldFJlbmFtZUluZm86IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRSZW5hbWVJbmZvKSxcbiAgICAgIGZpbmRSZW5hbWVMb2NhdGlvbnM6IHRyeUZpbGVuYW1lVGhyZWVDYWxsKGxzLmZpbmRSZW5hbWVMb2NhdGlvbnMpLFxuICAgICAgZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb246IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXREZWZpbml0aW9uQXRQb3NpdGlvbiksXG4gICAgICBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb246IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24pLFxuICAgICAgZ2V0SW1wbGVtZW50YXRpb25BdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0SW1wbGVtZW50YXRpb25BdFBvc2l0aW9uKSxcbiAgICAgIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24pLFxuICAgICAgZmluZFJlZmVyZW5jZXM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5maW5kUmVmZXJlbmNlcyksXG4gICAgICBnZXREb2N1bWVudEhpZ2hsaWdodHM6IHRyeUZpbGVuYW1lVHdvQ2FsbChscy5nZXREb2N1bWVudEhpZ2hsaWdodHMpLFxuICAgICAgLyoqIEBkZXByZWNhdGVkICovXG4gICAgICBnZXRPY2N1cnJlbmNlc0F0UG9zaXRpb246IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRPY2N1cnJlbmNlc0F0UG9zaXRpb24pLFxuICAgICAgZ2V0TmF2aWdhdGVUb0l0ZW1zOlxuICAgICAgICAgIChzZWFyY2hWYWx1ZSwgbWF4UmVzdWx0Q291bnQsIGZpbGVOYW1lLCBleGNsdWRlRHRzRmlsZXMpID0+IHRyeUNhbGwoXG4gICAgICAgICAgICAgIGZpbGVOYW1lLFxuICAgICAgICAgICAgICAoKSA9PiBscy5nZXROYXZpZ2F0ZVRvSXRlbXMoc2VhcmNoVmFsdWUsIG1heFJlc3VsdENvdW50LCBmaWxlTmFtZSwgZXhjbHVkZUR0c0ZpbGVzKSksXG4gICAgICBnZXROYXZpZ2F0aW9uQmFySXRlbXM6IHRyeUZpbGVuYW1lQ2FsbChscy5nZXROYXZpZ2F0aW9uQmFySXRlbXMpLFxuICAgICAgZ2V0TmF2aWdhdGlvblRyZWU6IHRyeUZpbGVuYW1lQ2FsbChscy5nZXROYXZpZ2F0aW9uVHJlZSksXG4gICAgICBnZXRPdXRsaW5pbmdTcGFuczogdHJ5RmlsZW5hbWVDYWxsKGxzLmdldE91dGxpbmluZ1NwYW5zKSxcbiAgICAgIGdldFRvZG9Db21tZW50czogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldFRvZG9Db21tZW50cyksXG4gICAgICBnZXRCcmFjZU1hdGNoaW5nQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldEJyYWNlTWF0Y2hpbmdBdFBvc2l0aW9uKSxcbiAgICAgIGdldEluZGVudGF0aW9uQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVUd29DYWxsKGxzLmdldEluZGVudGF0aW9uQXRQb3NpdGlvbiksXG4gICAgICBnZXRGb3JtYXR0aW5nRWRpdHNGb3JSYW5nZTogdHJ5RmlsZW5hbWVUaHJlZUNhbGwobHMuZ2V0Rm9ybWF0dGluZ0VkaXRzRm9yUmFuZ2UpLFxuICAgICAgZ2V0Rm9ybWF0dGluZ0VkaXRzRm9yRG9jdW1lbnQ6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRGb3JtYXR0aW5nRWRpdHNGb3JEb2N1bWVudCksXG4gICAgICBnZXRGb3JtYXR0aW5nRWRpdHNBZnRlcktleXN0cm9rZTogdHJ5RmlsZW5hbWVUaHJlZUNhbGwobHMuZ2V0Rm9ybWF0dGluZ0VkaXRzQWZ0ZXJLZXlzdHJva2UpLFxuICAgICAgZ2V0RG9jQ29tbWVudFRlbXBsYXRlQXRQb3NpdGlvbjogdHJ5RmlsZW5hbWVPbmVDYWxsKGxzLmdldERvY0NvbW1lbnRUZW1wbGF0ZUF0UG9zaXRpb24pLFxuICAgICAgaXNWYWxpZEJyYWNlQ29tcGxldGlvbkF0UG9zaXRpb246IHRyeUZpbGVuYW1lVHdvQ2FsbChscy5pc1ZhbGlkQnJhY2VDb21wbGV0aW9uQXRQb3NpdGlvbiksXG4gICAgICBnZXRTcGFuT2ZFbmNsb3NpbmdDb21tZW50OiB0cnlGaWxlbmFtZVR3b0NhbGwobHMuZ2V0U3Bhbk9mRW5jbG9zaW5nQ29tbWVudCksXG4gICAgICBnZXRDb2RlRml4ZXNBdFBvc2l0aW9uOiB0cnlGaWxlbmFtZUZvdXJDYWxsKGxzLmdldENvZGVGaXhlc0F0UG9zaXRpb24pLFxuICAgICAgYXBwbHlDb2RlQWN0aW9uQ29tbWFuZDpcbiAgICAgICAgICA8YW55PigoYWN0aW9uOiBhbnkpID0+IHRyeUNhbGwodW5kZWZpbmVkLCAoKSA9PiBscy5hcHBseUNvZGVBY3Rpb25Db21tYW5kKGFjdGlvbikpKSxcbiAgICAgIGdldEVtaXRPdXRwdXQ6IHRyeUZpbGVuYW1lQ2FsbChscy5nZXRFbWl0T3V0cHV0KSxcbiAgICAgIGdldFByb2dyYW06ICgpID0+IGxzLmdldFByb2dyYW0oKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IGxzLmRpc3Bvc2UoKSxcbiAgICAgIGdldEFwcGxpY2FibGVSZWZhY3RvcnM6IHRyeUZpbGVuYW1lT25lQ2FsbChscy5nZXRBcHBsaWNhYmxlUmVmYWN0b3JzKSxcbiAgICAgIGdldEVkaXRzRm9yUmVmYWN0b3I6IHRyeUZpbGVuYW1lRm91ckNhbGwobHMuZ2V0RWRpdHNGb3JSZWZhY3RvciksXG4gICAgICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuOiB0cnlGaWxlbmFtZU9uZUNhbGwobHMuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbiksXG4gICAgICBnZXRDb21iaW5lZENvZGVGaXg6XG4gICAgICAgICAgKHNjb3BlOiB0cy5Db21iaW5lZENvZGVGaXhTY29wZSwgZml4SWQ6IHt9LCBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlU2V0dGluZ3MpID0+XG4gICAgICAgICAgICAgIHRyeUNhbGwodW5kZWZpbmVkLCAoKSA9PiBscy5nZXRDb21iaW5lZENvZGVGaXgoc2NvcGUsIGZpeElkLCBmb3JtYXRPcHRpb25zKSksXG4gICAgICAvLyBUT0RPKGt5bGlhdSk6IGR1bW15IGltcGxlbWVudGF0aW9uIHRvIGNvbXBpbGUgd2l0aCB0cyAyLjgsIGNyZWF0ZSByZWFsIG9uZVxuICAgICAgZ2V0U3VnZ2VzdGlvbkRpYWdub3N0aWNzOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gW10sXG4gICAgICAvLyBUT0RPKGt5bGlhdSk6IGR1bW15IGltcGxlbWVudGF0aW9uIHRvIGNvbXBpbGUgd2l0aCB0cyAyLjgsIGNyZWF0ZSByZWFsIG9uZVxuICAgICAgb3JnYW5pemVJbXBvcnRzOiAoc2NvcGU6IHRzLkNvbWJpbmVkQ29kZUZpeFNjb3BlLCBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlU2V0dGluZ3MpID0+IFtdLFxuICAgIH0gYXMgdHMuTGFuZ3VhZ2VTZXJ2aWNlO1xuICAgIHJldHVybiBsYW5ndWFnZVNlcnZpY2U7XG4gIH1cblxuICBvbGRMUyA9IHR5cGVzY3JpcHRPbmx5KG9sZExTKTtcblxuICBmb3IgKGNvbnN0IGsgaW4gb2xkTFMpIHtcbiAgICAoPGFueT5wcm94eSlba10gPSBmdW5jdGlvbigpIHsgcmV0dXJuIChvbGRMUyBhcyBhbnkpW2tdLmFwcGx5KG9sZExTLCBhcmd1bWVudHMpOyB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGlvblRvRW50cnkoYzogQ29tcGxldGlvbik6IHRzLkNvbXBsZXRpb25FbnRyeSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgYW5kIGZpeCB0eXBlIGVycm9yLlxuICAgICAga2luZDogYy5raW5kIGFzIGFueSxcbiAgICAgIG5hbWU6IGMubmFtZSxcbiAgICAgIHNvcnRUZXh0OiBjLnNvcnQsXG4gICAgICBraW5kTW9kaWZpZXJzOiAnJ1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaWFnbm9zdGljQ2hhaW5Ub0RpYWdub3N0aWNDaGFpbihjaGFpbjogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6XG4gICAgICB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogMCxcbiAgICAgIG5leHQ6IGNoYWluLm5leHQgPyBkaWFnbm9zdGljQ2hhaW5Ub0RpYWdub3N0aWNDaGFpbihjaGFpbi5uZXh0KSA6IHVuZGVmaW5lZFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaWFnbm9zdGljTWVzc2FnZVRvRGlhZ25vc3RpY01lc3NhZ2VUZXh0KG1lc3NhZ2U6IHN0cmluZyB8IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4pOlxuICAgICAgc3RyaW5nfHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4obWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBkaWFnbm9zdGljVG9EaWFnbm9zdGljKGQ6IERpYWdub3N0aWMsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljIHtcbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICBmaWxlLFxuICAgICAgc3RhcnQ6IGQuc3Bhbi5zdGFydCxcbiAgICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICAgIG1lc3NhZ2VUZXh0OiBkaWFnbm9zdGljTWVzc2FnZVRvRGlhZ25vc3RpY01lc3NhZ2VUZXh0KGQubWVzc2FnZSksXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogMCxcbiAgICAgIHNvdXJjZTogJ25nJ1xuICAgIH07XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeU9wZXJhdGlvbjxUPihhdHRlbXB0aW5nOiBzdHJpbmcsIGNhbGxiYWNrOiAoKSA9PiBUKTogVHxudWxsIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaW5mby5wcm9qZWN0LnByb2plY3RTZXJ2aWNlLmxvZ2dlci5pbmZvKGBGYWlsZWQgdG8gJHthdHRlbXB0aW5nfTogJHtlLnRvU3RyaW5nKCl9YCk7XG4gICAgICBpbmZvLnByb2plY3QucHJvamVjdFNlcnZpY2UubG9nZ2VyLmluZm8oYFN0YWNrIHRyYWNlOiAke2Uuc3RhY2t9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzZXJ2aWNlSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaW5mby5sYW5ndWFnZVNlcnZpY2VIb3N0LCBpbmZvLmxhbmd1YWdlU2VydmljZSk7XG4gIGNvbnN0IGxzID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKHNlcnZpY2VIb3N0IGFzIGFueSk7XG4gIHNlcnZpY2VIb3N0LnNldFNpdGUobHMpO1xuICBwcm9qZWN0SG9zdE1hcC5zZXQoaW5mby5wcm9qZWN0LCBzZXJ2aWNlSG9zdCk7XG5cbiAgcHJveHkuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uID0gZnVuY3Rpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCkge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucykgfHwge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICBlbnRyaWVzOiBbXVxuICAgIH07XG4gICAgdHJ5T3BlcmF0aW9uKCdnZXQgY29tcGxldGlvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gbHMuZ2V0Q29tcGxldGlvbnNBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGJhc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGJhc2UgPSB7XG4gICAgICAgICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGVudHJpZXM6IFtdXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICBiYXNlLmVudHJpZXMucHVzaChjb21wbGV0aW9uVG9FbnRyeShlbnRyeSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH07XG5cbiAgcHJveHkuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbiA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm8ge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIC8vIFRPRE8odmljYik6IHRoZSB0YWdzIHByb3BlcnR5IGhhcyBiZWVuIHJlbW92ZWQgaW4gVFMgMi4yXG4gICAgdHJ5T3BlcmF0aW9uKCdnZXQgcXVpY2sgaW5mbycsICgpID0+IHtcbiAgICAgIGNvbnN0IG91cnMgPSBscy5nZXRIb3ZlckF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAob3Vycykge1xuICAgICAgICBjb25zdCBkaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwYXJ0IG9mIG91cnMudGV4dCkge1xuICAgICAgICAgIGRpc3BsYXlQYXJ0cy5wdXNoKHtraW5kOiBwYXJ0Lmxhbmd1YWdlIHx8ICdhbmd1bGFyJywgdGV4dDogcGFydC50ZXh0fSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGFncyA9IGJhc2UgJiYgKDxhbnk+YmFzZSkudGFncztcbiAgICAgICAgYmFzZSA9IDxhbnk+e1xuICAgICAgICAgIGRpc3BsYXlQYXJ0cyxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiBbXSxcbiAgICAgICAgICBraW5kOiAnYW5ndWxhcicsXG4gICAgICAgICAga2luZE1vZGlmaWVyczogJ3doYXQgZG9lcyB0aGlzIGRvPycsXG4gICAgICAgICAgdGV4dFNwYW46IHtzdGFydDogb3Vycy5zcGFuLnN0YXJ0LCBsZW5ndGg6IG91cnMuc3Bhbi5lbmQgLSBvdXJzLnNwYW4uc3RhcnR9LFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGFncykge1xuICAgICAgICAgICg8YW55PmJhc2UpLnRhZ3MgPSB0YWdzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gYmFzZTtcbiAgfTtcblxuICBwcm94eS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGxldCByZXN1bHQgPSBvbGRMUy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICBjb25zdCBiYXNlID0gcmVzdWx0IHx8IFtdO1xuICAgIHRyeU9wZXJhdGlvbignZ2V0IGRpYWdub3N0aWNzJywgKCkgPT4ge1xuICAgICAgaW5mby5wcm9qZWN0LnByb2plY3RTZXJ2aWNlLmxvZ2dlci5pbmZvKGBDb21wdXRpbmcgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljcy4uLmApO1xuICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBvbGRMUy5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgYmFzZS5wdXNoLmFwcGx5KGJhc2UsIG91cnMubWFwKGQgPT4gZGlhZ25vc3RpY1RvRGlhZ25vc3RpYyhkLCBmaWxlKSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gYmFzZTtcbiAgfTtcblxuICBwcm94eS5nZXREZWZpbml0aW9uQXRQb3NpdGlvbiA9IGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9bXSB7XG4gICAgbGV0IGJhc2UgPSBvbGRMUy5nZXREZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChiYXNlICYmIGJhc2UubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYmFzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ5T3BlcmF0aW9uKCdnZXQgZGVmaW5pdGlvbicsICgpID0+IHtcbiAgICAgICAgICAgICBjb25zdCBvdXJzID0gbHMuZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgaWYgKG91cnMgJiYgb3Vycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgIGJhc2UgPSBiYXNlIHx8IFtdO1xuICAgICAgICAgICAgICAgZm9yIChjb25zdCBsb2Mgb2Ygb3Vycykge1xuICAgICAgICAgICAgICAgICBiYXNlLnB1c2goe1xuICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBsb2MuZmlsZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgdGV4dFNwYW46IHtzdGFydDogbG9jLnNwYW4uc3RhcnQsIGxlbmd0aDogbG9jLnNwYW4uZW5kIC0gbG9jLnNwYW4uc3RhcnR9LFxuICAgICAgICAgICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgYW5kIGZpeCB0eXBlIGVycm9yLlxuICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdkZWZpbml0aW9uJyBhcyBhbnksXG4gICAgICAgICAgICAgICAgICAgY29udGFpbmVyTmFtZTogbG9jLmZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcktpbmQ6ICdmaWxlJyBhcyBhbnksXG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXR1cm4gYmFzZTtcbiAgICAgICAgICAgfSkgfHwgW107XG4gIH07XG5cbiAgcmV0dXJuIHByb3h5O1xufVxuIl19