/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli';
import type ts from 'typescript';
import { TypeCheckInfo } from '../utils';
/**
 * This context is the info includes the `errorCode` at the given span the user selected in the
 * editor and the `NgCompiler` could help to fix it.
 *
 * When the editor tries to provide a code fix for a diagnostic in a span of a template file, this
 * context will be provided to the `CodeActionMeta` which could handle the `errorCode`.
 */
export interface CodeActionContext {
    typeCheckInfo: TypeCheckInfo | null;
    fileName: string;
    compiler: NgCompiler;
    start: number;
    end: number;
    errorCode: number;
    formatOptions: ts.FormatCodeSettings;
    preferences: ts.UserPreferences;
    tsLs: ts.LanguageService;
}
/**
 * This context is the info includes all diagnostics in the `scope` and the `NgCompiler` that could
 * help to fix it.
 *
 * When the editor tries to fix the all same type of diagnostics selected by the user in the
 * `scope`, this context will be provided to the `CodeActionMeta` which could handle the `fixId`.
 */
export interface CodeFixAllContext {
    scope: ts.CombinedCodeFixScope;
    compiler: NgCompiler;
    fixId: string;
    formatOptions: ts.FormatCodeSettings;
    preferences: ts.UserPreferences;
    tsLs: ts.LanguageService;
    diagnostics: ts.Diagnostic[];
}
export interface CodeActionMeta {
    errorCodes: Array<number>;
    getCodeActions: (context: CodeActionContext) => readonly ts.CodeFixAction[];
    fixIds: FixIdForCodeFixesAll[];
    getAllCodeActions: (context: CodeFixAllContext) => ts.CombinedCodeActions;
}
/**
 * Convert the span of `textChange` in the TCB to the span of the template.
 */
export declare function convertFileTextChangeInTcb(changes: readonly ts.FileTextChanges[], compiler: NgCompiler): ts.FileTextChanges[];
/**
 * 'fix all' is only available when there are multiple diagnostics that the code action meta
 * indicates it can fix.
 */
export declare function isFixAllAvailable(meta: CodeActionMeta, diagnostics: ts.Diagnostic[]): boolean;
export declare enum FixIdForCodeFixesAll {
    FIX_SPELLING = "fixSpelling",
    FIX_MISSING_MEMBER = "fixMissingMember",
    FIX_INVALID_BANANA_IN_BOX = "fixInvalidBananaInBox",
    FIX_MISSING_IMPORT = "fixMissingImport",
    FIX_UNUSED_STANDALONE_IMPORTS = "fixUnusedStandaloneImports",
    FIX_MISSING_REQUIRED_INPUTS = "fixMissingRequiredInputs"
}
