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
import { CompilerFactory } from './compiler_factory';
export declare class LanguageService {
    private readonly project;
    private readonly tsLS;
    private options;
    readonly compilerFactory: CompilerFactory;
    private readonly strategy;
    private readonly adapter;
    private readonly parseConfigHost;
    constructor(project: ts.server.Project, tsLS: ts.LanguageService);
    getCompilerOptions(): CompilerOptions;
    getSemanticDiagnostics(fileName: string): ts.Diagnostic[];
    getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined;
    getTypeDefinitionAtPosition(fileName: string, position: number): readonly ts.DefinitionInfo[] | undefined;
    getQuickInfoAtPosition(fileName: string, position: number): ts.QuickInfo | undefined;
    getReferencesAtPosition(fileName: string, position: number): ts.ReferenceEntry[] | undefined;
    private getCompletionBuilder;
    getCompletionsAtPosition(fileName: string, position: number, options: ts.GetCompletionsAtPositionOptions | undefined): ts.WithMetadata<ts.CompletionInfo> | undefined;
    getCompletionEntryDetails(fileName: string, position: number, entryName: string, formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings | undefined, preferences: ts.UserPreferences | undefined): ts.CompletionEntryDetails | undefined;
    getCompletionEntrySymbol(fileName: string, position: number, entryName: string): ts.Symbol | undefined;
    getCompilerOptionsDiagnostics(): ts.Diagnostic[];
    private watchConfigFile;
}
