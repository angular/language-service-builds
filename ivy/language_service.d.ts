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
export declare type GetTcbResponse = {
    /**
     * The filename of the SourceFile this typecheck block belongs to.
     * The filename is entirely opaque and unstable, useful only for debugging
     * purposes.
     */
    fileName: string;
    /** The content of the SourceFile this typecheck block belongs to. */
    content: string;
    /**
     * Spans over node(s) in the typecheck block corresponding to the
     * TS code generated for template node under the current cursor position.
     *
     * When the cursor position is over a source for which there is no generated
     * code, `selections` is empty.
     */
    selections: ts.TextSpan[];
} | undefined;
export declare class LanguageService {
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
    getRenameInfo(fileName: string, position: number): ts.RenameInfo;
    findRenameLocations(fileName: string, position: number): readonly ts.RenameLocation[] | undefined;
    private getCompletionBuilder;
    getCompletionsAtPosition(fileName: string, position: number, options: ts.GetCompletionsAtPositionOptions | undefined): ts.WithMetadata<ts.CompletionInfo> | undefined;
    getCompletionEntryDetails(fileName: string, position: number, entryName: string, formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings | undefined, preferences: ts.UserPreferences | undefined): ts.CompletionEntryDetails | undefined;
    getCompletionEntrySymbol(fileName: string, position: number, entryName: string): ts.Symbol | undefined;
    getTcb(fileName: string, position: number): GetTcbResponse;
    private withCompiler;
    private watchConfigFile;
}
