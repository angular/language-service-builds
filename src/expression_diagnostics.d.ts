/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/expression_diagnostics" />
import { AST, Node, TemplateAst, TemplateAstPath } from '@angular/compiler';
import { ExpressionDiagnosticsContext, TypeDiagnostic } from './expression_type';
import { SymbolQuery, SymbolTable } from './symbols';
import { Diagnostic } from './types';
export interface DiagnosticTemplateInfo {
    fileName?: string;
    offset: number;
    query: SymbolQuery;
    members: SymbolTable;
    htmlAst: Node[];
    templateAst: TemplateAst[];
}
export declare function getTemplateExpressionDiagnostics(info: DiagnosticTemplateInfo): Diagnostic[];
export declare function getExpressionDiagnostics(scope: SymbolTable, ast: AST, query: SymbolQuery, context?: ExpressionDiagnosticsContext): TypeDiagnostic[];
export declare function getExpressionScope(info: DiagnosticTemplateInfo, path: TemplateAstPath): SymbolTable;
