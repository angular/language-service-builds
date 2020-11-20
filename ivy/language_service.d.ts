/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/ivy/language_service" />
import { CompilerOptions } from '@angular/compiler-cli';
import * as ts from 'typescript/lib/tsserverlibrary';
export declare class LanguageService {
    private readonly tsLS;
    private options;
    private readonly compilerFactory;
    private readonly strategy;
    private readonly adapter;
    constructor(project: ts.server.Project, tsLS: ts.LanguageService);
    getSemanticDiagnostics(fileName: string): ts.Diagnostic[];
    getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined;
    getTypeDefinitionAtPosition(fileName: string, position: number): readonly ts.DefinitionInfo[] | undefined;
    getQuickInfoAtPosition(fileName: string, position: number): ts.QuickInfo | undefined;
    private watchConfigFile;
}
export declare function parseNgCompilerOptions(project: ts.server.Project): CompilerOptions;
