/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/diagnostics" />
import { NgAnalyzedModules } from '@angular/compiler';
import * as ts from 'typescript';
import { AstResult } from './common';
import { Declarations, Diagnostic, Diagnostics, Span, TemplateSource } from './types';
export interface AstProvider {
    getTemplateAst(template: TemplateSource, fileName: string): AstResult;
}
export declare function getTemplateDiagnostics(template: TemplateSource, ast: AstResult): Diagnostics;
export declare function getDeclarationDiagnostics(declarations: Declarations, modules: NgAnalyzedModules): Diagnostics;
export declare function ngDiagnosticToTsDiagnostic(d: Diagnostic, file: ts.SourceFile | undefined): ts.Diagnostic;
export declare function uniqueBySpan<T extends {
    span: Span;
}>(elements: T[]): T[];
