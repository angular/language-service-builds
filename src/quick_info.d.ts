/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AST, TmplAstNode } from '@angular/compiler';
import { NgCompiler } from '@angular/compiler-cli';
import ts from 'typescript';
import { TemplateTarget } from './template_target';
export declare class QuickInfoBuilder {
    private readonly tsLS;
    private readonly compiler;
    private readonly component;
    private node;
    private readonly positionDetails;
    private readonly typeChecker;
    private readonly parent;
    constructor(tsLS: ts.LanguageService, compiler: NgCompiler, component: ts.ClassDeclaration, node: TmplAstNode | AST, positionDetails: TemplateTarget);
    get(): ts.QuickInfo | undefined;
    private getQuickInfoForSymbol;
    private getQuickInfoForBindingSymbol;
    private getQuickInfoForElementSymbol;
    private getQuickInfoForVariableSymbol;
    private getQuickInfoForLetDeclarationSymbol;
    private getQuickInfoForReferenceSymbol;
    private getQuickInfoForPipeSymbol;
    private getQuickInfoForDomBinding;
    private getQuickInfoForDirectiveSymbol;
    private getQuickInfoForSelectorlessSymbol;
    private getQuickInfoFromTypeDefAtLocation;
    private getQuickInfoAtTcbLocation;
}
