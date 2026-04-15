/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import type ts from 'typescript';
import { TypeCheckInfo } from '../utils';
import { CodeActionMeta } from './utils';
export declare class CodeFixes {
    private readonly tsLS;
    readonly codeActionMetas: CodeActionMeta[];
    private errorCodeToFixes;
    private fixIdToRegistration;
    constructor(tsLS: ts.LanguageService, codeActionMetas: CodeActionMeta[]);
    hasFixForCode(code: number): boolean;
    /**
     * When the user moves the cursor or hovers on a diagnostics, this function will be invoked by LS,
     * and collect all the responses from the `codeActionMetas` which could handle the `errorCodes`.
     */
    getCodeFixesAtPosition(fileName: string, typeCheckInfo: TypeCheckInfo | null, compiler: NgCompiler, start: number, end: number, errorCodes: readonly number[], diagnostics: ts.Diagnostic[], formatOptions: ts.FormatCodeSettings, preferences: ts.UserPreferences): readonly ts.CodeFixAction[];
    /**
     * When the user wants to fix the all same type of diagnostics in the `scope`, this function will
     * be called and fix all diagnostics which will be filtered by the `errorCodes` from the
     * `CodeActionMeta` that the `fixId` belongs to.
     */
    getAllCodeActions(compiler: NgCompiler, diagnostics: ts.Diagnostic[], scope: ts.CombinedCodeFixScope, fixId: string, formatOptions: ts.FormatCodeSettings, preferences: ts.UserPreferences): ts.CombinedCodeActions;
}
