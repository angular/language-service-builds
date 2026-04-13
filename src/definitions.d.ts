/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli';
import ts from 'typescript';
export declare class DefinitionBuilder {
    private readonly tsLS;
    private readonly compiler;
    private readonly ttc;
    constructor(tsLS: ts.LanguageService, compiler: NgCompiler);
    getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined;
    private getDefinitionsForSymbol;
    private getDefinitionsForSymbols;
    /**
     * Converts and definition info result that points to a template typecheck file to a reference to
     * the corresponding location in the template.
     */
    private mapShimResultsToTemplates;
    getTypeDefinitionsAtPosition(fileName: string, position: number): readonly ts.DefinitionInfo[] | undefined;
    private getTypeDefinitionsForTemplateInstance;
    private getDirectiveTypeDefsForBindingNode;
    private getTypeDefinitionsForSymbols;
    private getDefinitionMetaAtPosition;
}
