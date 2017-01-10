/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
/** A plugin to TypeScript's langauge service that provide language services for
 * templates in string literals.
 *
 * @experimental
 */
export declare class LanguageServicePlugin {
    private serviceHost;
    private service;
    private host;
    static 'extension-kind': string;
    constructor(config: {
        host: ts.LanguageServiceHost;
        service: ts.LanguageService;
        registry?: ts.DocumentRegistry;
        args?: any;
    });
    /**
     * Augment the diagnostics reported by TypeScript with errors from the templates in string
     * literals.
     */
    getSemanticDiagnosticsFilter(fileName: string, previous: ts.Diagnostic[]): ts.Diagnostic[];
    /**
     * Get completions for angular templates if one is at the given position.
     */
    getCompletionsAtPosition(fileName: string, position: number): ts.CompletionInfo;
}
