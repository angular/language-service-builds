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
export function create(info /* ts.server.PluginCreateInfo */) {
    // Create the proxy
    const proxy = Object.create(null);
    const oldLS = info.languageService;
    for (const k in oldLS) {
        proxy[k] = function () { return oldLS[k].apply(oldLS, arguments); };
    }
    function completionToEntry(c) {
        return { kind: c.kind, name: c.name, sortText: c.sort, kindModifiers: '' };
    }
    function diagnosticToDiagnostic(d, file) {
        return {
            file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: d.message,
            category: ts.DiagnosticCategory.Error,
            code: 0
        };
    }
    function tryOperation(attempting, callback) {
        try {
            callback();
        }
        catch (e) {
            info.project.projectService.logger.info(`Failed to ${attempting}: ${e.toString()}`);
            info.project.projectService.logger.info(`Stack trace: ${e.stack}`);
        }
    }
    const serviceHost = new TypeScriptServiceHost(info.languageServiceHost, info.languageService);
    const ls = createLanguageService(serviceHost);
    serviceHost.setSite(ls);
    proxy.getCompletionsAtPosition = function (fileName, position) {
        let base = oldLS.getCompletionsAtPosition(fileName, position);
        tryOperation('get completions', () => {
            const results = ls.getCompletionsAt(fileName, position);
            if (results && results.length) {
                if (base === undefined) {
                    base = { isMemberCompletion: false, isNewIdentifierLocation: false, entries: [] };
                }
                for (const entry of results) {
                    base.entries.push(completionToEntry(entry));
                }
            }
        });
        return base;
    };
    proxy.getQuickInfoAtPosition = function (fileName, position) {
        let base = oldLS.getQuickInfoAtPosition(fileName, position);
        tryOperation('get quick info', () => {
            const ours = ls.getHoverAt(fileName, position);
            if (ours) {
                const displayParts = [];
                for (const part of ours.text) {
                    displayParts.push({ kind: part.language, text: part.text });
                }
                base = {
                    displayParts,
                    documentation: [],
                    kind: 'angular',
                    kindModifiers: 'what does this do?',
                    textSpan: { start: ours.span.start, length: ours.span.end - ours.span.start }
                };
            }
        });
        return base;
    };
    proxy.getSemanticDiagnostics = function (fileName) {
        let base = oldLS.getSemanticDiagnostics(fileName);
        if (base === undefined) {
            base = [];
        }
        tryOperation('get diagnostics', () => {
            info.project.projectService.logger.info(`Computing Angular semantic diagnostics...`);
            const ours = ls.getDiagnostics(fileName);
            if (ours && ours.length) {
                const file = oldLS.getProgram().getSourceFile(fileName);
                base.push.apply(base, ours.map(d => diagnosticToDiagnostic(d, file)));
            }
        });
        return base;
    };
    proxy.getDefinitionAtPosition = function (fileName, position) {
        let base = oldLS.getDefinitionAtPosition(fileName, position);
        if (base && base.length) {
            return base;
        }
        tryOperation('get definition', () => {
            const ours = ls.getDefinitionAt(fileName, position);
            if (ours && ours.length) {
                base = base || [];
                for (const loc of ours) {
                    base.push({
                        fileName: loc.fileName,
                        textSpan: { start: loc.span.start, length: loc.span.end - loc.span.start },
                        name: '',
                        kind: 'definition',
                        containerName: loc.fileName,
                        containerKind: 'file'
                    });
                }
            }
        });
        return base;
    };
    return proxy;
}
//# sourceMappingURL=ts_plugin.js.map