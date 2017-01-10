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
/** A plugin to TypeScript's langauge service that provide language services for
 * templates in string literals.
 *
 * @experimental
 */
export var LanguageServicePlugin = (function () {
    function LanguageServicePlugin(config) {
        this.host = config.host;
        this.serviceHost = new TypeScriptServiceHost(config.host, config.service);
        this.service = createLanguageService(this.serviceHost);
        this.serviceHost.setSite(this.service);
    }
    /**
     * Augment the diagnostics reported by TypeScript with errors from the templates in string
     * literals.
     */
    LanguageServicePlugin.prototype.getSemanticDiagnosticsFilter = function (fileName, previous) {
        var errors = this.service.getDiagnostics(fileName);
        if (errors && errors.length) {
            var file = this.serviceHost.getSourceFile(fileName);
            for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
                var error = errors_1[_i];
                previous.push({
                    file: file,
                    start: error.span.start,
                    length: error.span.end - error.span.start,
                    messageText: error.message,
                    category: ts.DiagnosticCategory.Error,
                    code: 0
                });
            }
        }
        return previous;
    };
    /**
     * Get completions for angular templates if one is at the given position.
     */
    LanguageServicePlugin.prototype.getCompletionsAtPosition = function (fileName, position) {
        var result = this.service.getCompletionsAt(fileName, position);
        if (result) {
            return {
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: result.map(function (entry) {
                    return ({ name: entry.name, kind: entry.kind, kindModifiers: '', sortText: entry.sort });
                })
            };
        }
    };
    LanguageServicePlugin['extension-kind'] = 'language-service';
    return LanguageServicePlugin;
}());
//# sourceMappingURL=ts_plugin.js.map