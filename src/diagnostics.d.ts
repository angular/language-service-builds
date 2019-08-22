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
import * as ng from './types';
/**
 * Return diagnostic information for the parsed AST of the template.
 * @param ast contains HTML and template AST
 */
export declare function getTemplateDiagnostics(ast: AstResult): ng.Diagnostic[];
export declare function getDeclarationDiagnostics(declarations: ng.Declaration[], modules: NgAnalyzedModules): ng.Diagnostic[];
/**
 * Convert ng.Diagnostic to ts.Diagnostic.
 * @param d diagnostic
 * @param file
 */
export declare function ngDiagnosticToTsDiagnostic(d: ng.Diagnostic, file: ts.SourceFile | undefined): ts.Diagnostic;
/**
 * Return elements filtered by unique span.
 * @param elements
 */
export declare function uniqueBySpan<T extends {
    span: ng.Span;
}>(elements: T[]): T[];
