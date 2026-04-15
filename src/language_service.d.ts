/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { CompilerOptions } from '@angular/compiler-cli';
import ts from 'typescript';
import { ApplyRefactoringProgressFn, ApplyRefactoringResult, GetComponentLocationsForTemplateResponse, GetTcbResponse, GetTemplateLocationForComponentResponse, LinkedEditingRanges, PluginConfig } from '../api';
import { CompilerFactory } from './compiler_factory';
export declare class LanguageService {
    private readonly project;
    private readonly tsLS;
    private readonly config;
    private options;
    readonly compilerFactory: CompilerFactory;
    private readonly codeFixes;
    private readonly activeRefactorings;
    constructor(project: ts.server.Project, tsLS: ts.LanguageService, config: Omit<PluginConfig, 'angularOnly'>);
    getCompilerOptions(): CompilerOptions;
    /**
     * Triggers the Angular compiler's analysis pipeline without performing
     * per-file type checking.
     */
    ensureProjectAnalyzed(): void;
    getSemanticDiagnostics(fileName: string): ts.Diagnostic[];
    getSuggestionDiagnostics(fileName: string): ts.DiagnosticWithLocation[];
    getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined;
    getTypeDefinitionAtPosition(fileName: string, position: number): readonly ts.DefinitionInfo[] | undefined;
    getQuickInfoAtPosition(fileName: string, position: number): ts.QuickInfo | undefined;
    private getQuickInfoAtPositionImpl;
    getReferencesAtPosition(fileName: string, position: number): ts.ReferenceEntry[] | undefined;
    getRenameInfo(fileName: string, position: number): ts.RenameInfo;
    findRenameLocations(fileName: string, position: number): readonly ts.RenameLocation[] | undefined;
    /**
     * Gets linked editing ranges for synchronized editing of HTML tag pairs.
     *
     * When the cursor is on an element tag name, returns both the opening and closing
     * tag name spans so they can be edited simultaneously.
     *
     * @param fileName The file to check
     * @param position The cursor position in the file
     * @returns LinkedEditingRanges if on a tag name, undefined otherwise
     */
    getLinkedEditingRangeAtPosition(fileName: string, position: number): LinkedEditingRanges | undefined;
    private getCompletionBuilder;
    getEncodedSemanticClassifications(fileName: string, span: ts.TextSpan, format: ts.SemanticClassificationFormat | undefined): ts.Classifications;
    private getEncodedSemanticClassificationsImpl;
    getTokenTypeFromClassification(classification: number): number | undefined;
    getTokenModifierFromClassification(classification: number): number;
    getCompletionsAtPosition(fileName: string, position: number, options: ts.GetCompletionsAtPositionOptions | undefined): ts.WithMetadata<ts.CompletionInfo> | undefined;
    private getCompletionsAtPositionImpl;
    getCompletionEntryDetails(fileName: string, position: number, entryName: string, formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings | undefined, preferences: ts.UserPreferences | undefined, data: ts.CompletionEntryData | undefined): ts.CompletionEntryDetails | undefined;
    getSignatureHelpItems(fileName: string, position: number, options?: ts.SignatureHelpItemsOptions): ts.SignatureHelpItems | undefined;
    getOutliningSpans(fileName: string): ts.OutliningSpan[];
    getCompletionEntrySymbol(fileName: string, position: number, entryName: string): ts.Symbol | undefined;
    /**
     * Performance helper that can help make quick decisions for
     * the VSCode language server to decide whether a code fix exists
     * for the given error code.
     *
     * Related context: https://github.com/angular/vscode-ng-language-service/pull/2050#discussion_r1673079263
     */
    hasCodeFixesForErrorCode(errorCode: number): boolean;
    getCodeFixesAtPosition(fileName: string, start: number, end: number, errorCodes: readonly number[], formatOptions: ts.FormatCodeSettings, preferences: ts.UserPreferences): readonly ts.CodeFixAction[];
    getCombinedCodeFix(scope: ts.CombinedCodeFixScope, fixId: string, formatOptions: ts.FormatCodeSettings, preferences: ts.UserPreferences): ts.CombinedCodeActions;
    getComponentLocationsForTemplate(fileName: string): GetComponentLocationsForTemplateResponse;
    getTemplateLocationForComponent(fileName: string, position: number): GetTemplateLocationForComponentResponse;
    getTcb(fileName: string, position: number): GetTcbResponse | undefined;
    getPossibleRefactorings(fileName: string, positionOrRange: number | ts.TextRange): ts.ApplicableRefactorInfo[];
    /**
     * Computes edits for applying the specified refactoring.
     *
     * VSCode explicitly split code actions into two stages:
     *
     *  - 1) what actions are active?
     *  - 2) what are the edits? <- if the user presses the button
     *
     * The latter stage may take longer to compute complex edits, perform
     * analysis. This stage is currently implemented via our non-LSP standard
     * `applyRefactoring` method. We implemented it in a way to support asynchronous
     * computation, so that it can easily integrate with migrations that aren't
     * synchronous/or compute edits in parallel.
     */
    applyRefactoring(fileName: string, positionOrRange: number | ts.TextRange, refactorName: string, reportProgress: ApplyRefactoringProgressFn): Promise<ApplyRefactoringResult | undefined>;
    /**
     * Provides an instance of the `NgCompiler` and traces perf results. Perf results are logged only
     * if the log level is verbose or higher. This method is intended to be called once per public
     * method call.
     *
     * Here is an example of the log output.
     *
     * Perf 245  [16:16:39.353] LanguageService#getQuickInfoAtPosition(): {"events":{},"phases":{
     * "Unaccounted":379,"TtcSymbol":4},"memory":{}}
     *
     * Passing name of caller instead of using `arguments.caller` because 'caller', 'callee', and
     * 'arguments' properties may not be accessed in strict mode.
     *
     * @param phase the `PerfPhase` to execute the `p` callback in
     * @param p callback to be run synchronously with an instance of the `NgCompiler` as argument
     * @return the result of running the `p` callback
     */
    private withCompilerAndPerfTracing;
    getCompilerOptionsDiagnostics(): ts.Diagnostic[];
    private watchConfigFile;
}
