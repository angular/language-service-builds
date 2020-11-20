/// <amd-module name="@angular/language-service/ivy/quick_info" />
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import * as ts from 'typescript';
/**
 * The type of Angular directive. Used for QuickInfo in template.
 */
export declare enum QuickInfoKind {
    COMPONENT = "component",
    DIRECTIVE = "directive",
    EVENT = "event",
    REFERENCE = "reference",
    ELEMENT = "element",
    VARIABLE = "variable",
    PIPE = "pipe",
    PROPERTY = "property",
    METHOD = "method",
    TEMPLATE = "template"
}
export declare class QuickInfoBuilder {
    private readonly tsLS;
    private readonly compiler;
    private readonly typeChecker;
    constructor(tsLS: ts.LanguageService, compiler: NgCompiler);
    get(fileName: string, position: number): ts.QuickInfo | undefined;
    private getQuickInfoForSymbol;
    private getQuickInfoForBindingSymbol;
    private getQuickInfoForElementSymbol;
    private getQuickInfoForVariableSymbol;
    private getQuickInfoForReferenceSymbol;
    private getQuickInfoForPipeSymbol;
    private getQuickInfoForDomBinding;
    private getQuickInfoForDirectiveSymbol;
    private getDocumentationFromTypeDefAtLocation;
    private getQuickInfoAtShimLocation;
}
