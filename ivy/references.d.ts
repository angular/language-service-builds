/// <amd-module name="@angular/language-service/ivy/references" />
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { TypeCheckingProgramStrategy } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import * as ts from 'typescript';
export declare class ReferenceBuilder {
    private readonly strategy;
    private readonly tsLS;
    private readonly compiler;
    private readonly ttc;
    constructor(strategy: TypeCheckingProgramStrategy, tsLS: ts.LanguageService, compiler: NgCompiler);
    get(filePath: string, position: number): ts.ReferenceEntry[] | undefined;
    private getReferencesAtTemplatePosition;
    private getReferencesForDirectives;
    private getReferencesAtTypescriptPosition;
    private convertToTemplateReferenceEntry;
}
