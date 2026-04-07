/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { LetDeclarationSymbol, PotentialDirective, ReferenceSymbol, TemplateTypeChecker, VariableSymbol } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import ts from 'typescript';
export declare const ALIAS_NAME: string;
export declare const SYMBOL_INTERFACE: string;
export declare const SYMBOL_PUNC: string;
export declare const SYMBOL_SPACE: string;
export declare const SYMBOL_TEXT: string;
/**
 * Label for various kinds of Angular entities for TS display info.
 */
export declare enum DisplayInfoKind {
    ATTRIBUTE = "attribute",
    BLOCK = "block",
    TRIGGER = "trigger",
    COMPONENT = "component",
    DIRECTIVE = "directive",
    EVENT = "event",
    REFERENCE = "reference",
    ELEMENT = "element",
    VARIABLE = "variable",
    PIPE = "pipe",
    PROPERTY = "property",
    METHOD = "method",
    TEMPLATE = "template",
    KEYWORD = "keyword",
    LET = "let"
}
export interface DisplayInfo {
    kind: DisplayInfoKind;
    displayParts: ts.SymbolDisplayPart[];
    documentation: ts.SymbolDisplayPart[] | undefined;
    tags: ts.JSDocTagInfo[] | undefined;
}
export declare function getSymbolDisplayInfo(tsLS: ts.LanguageService, typeChecker: ts.TypeChecker, symbol: ReferenceSymbol | VariableSymbol | LetDeclarationSymbol, templateTypeChecker: TemplateTypeChecker): DisplayInfo;
/**
 * Construct a compound `ts.SymbolDisplayPart[]` which incorporates the container and type of a
 * target declaration.
 * @param name Name of the target
 * @param kind component, directive, pipe, etc.
 * @param containerName either the Symbol's container or the NgModule that contains the directive
 * @param type user-friendly name of the type
 * @param documentation docstring or comment
 */
export declare function createDisplayParts(name: string, kind: DisplayInfoKind, containerName: string | undefined, type: string | undefined): ts.SymbolDisplayPart[];
/**
 * Convert a `SymbolDisplayInfoKind` to a `ts.ScriptElementKind` type, allowing it to pass through
 * TypeScript APIs.
 *
 * In practice, this is an "illegal" type cast. Since `ts.ScriptElementKind` is a string, this is
 * safe to do if TypeScript only uses the value in a string context. Consumers of this conversion
 * function are responsible for ensuring this is the case.
 */
export declare function unsafeCastDisplayInfoKindToScriptElementKind(kind: DisplayInfoKind): ts.ScriptElementKind;
export declare function getDirectiveDisplayInfo(tsLS: ts.LanguageService, dir: PotentialDirective): DisplayInfo;
export declare function getTsSymbolDisplayInfo(tsLS: ts.LanguageService, checker: ts.TypeChecker, symbol: ts.Symbol, kind: DisplayInfoKind, ownerName: string | null): DisplayInfo | null;
