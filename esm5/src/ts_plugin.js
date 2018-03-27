/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { createLanguageService } from './language_service';
import { TypeScriptServiceHost } from './typescript_host';
var projectHostMap = new WeakMap();
export function getExternalFiles(project) {
    var host = projectHostMap.get(project);
    if (host) {
        return host.getTemplateReferences();
    }
}
export function create(info /* ts.server.PluginCreateInfo */) {
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
        return {
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
            }
        };
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
    var serviceHost = new TypeScriptServiceHost(info.languageServiceHost, info.languageService);
    var ls = createLanguageService(serviceHost);
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
                for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                    var entry = results_1[_i];
                    base.entries.push(completionToEntry(entry));
                }
            }
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
                for (var _i = 0, _a = ours.text; _i < _a.length; _i++) {
                    var part = _a[_i];
                    displayParts.push({ kind: part.language || 'angular', text: part.text });
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
            var ours = ls.getDefinitionAt(fileName, position);
            if (ours && ours.length) {
                base = base || [];
                for (var _i = 0, ours_1 = ours; _i < ours_1.length; _i++) {
                    var loc = ours_1[_i];
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
            return base;
        }) || [];
    };
    return proxy;
}
//# sourceMappingURL=ts_plugin.js.map