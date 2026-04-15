/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AbsoluteSourceSpan, AST, ParseSourceSpan, ParseSpan, PropertyRead, TmplAstBoundEvent, TmplAstElement, TmplAstNode, TmplAstTemplate } from '@angular/compiler';
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { AbsoluteFsPath } from '@angular/compiler-cli/src/ngtsc/file_system';
import { DirectiveSymbol, TemplateTypeChecker } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import ts from 'typescript';
import { DisplayInfoKind } from './display_parts';
export declare function getTextSpanOfNode(node: TmplAstNode | AST): ts.TextSpan;
export declare function toTextSpan(span: AbsoluteSourceSpan | ParseSourceSpan | ParseSpan): ts.TextSpan;
interface NodeWithKeyAndValue extends TmplAstNode {
    keySpan: ParseSourceSpan;
    valueSpan?: ParseSourceSpan;
}
export declare function isTemplateNodeWithKeyAndValue(node: TmplAstNode | AST): node is NodeWithKeyAndValue;
export declare function isWithinKey(position: number, node: NodeWithKeyAndValue): boolean;
export declare function isWithinKeyValue(position: number, node: NodeWithKeyAndValue): boolean;
export declare function isTemplateNode(node: TmplAstNode | AST): node is TmplAstNode;
export declare function isExpressionNode(node: TmplAstNode | AST): node is AST;
export interface TypeCheckInfo {
    nodes: TmplAstNode[];
    declaration: ts.ClassDeclaration;
}
/**
 * Retrieves the `ts.ClassDeclaration` at a location along with its template AST nodes.
 */
export declare function getTypeCheckInfoAtPosition(fileName: string, position: number, compiler: NgCompiler): TypeCheckInfo | undefined;
export declare function getFirstComponentForTemplateFile(fileName: string, compiler: NgCompiler): TypeCheckInfo | undefined;
/**
 * Given an element or template, determines which directives match because the tag is present. For
 * example, if a directive selector is `div[myAttr]`, this would match div elements but would not if
 * the selector were just `[myAttr]`. We find which directives are applied because of this tag by
 * elimination: compare the directive matches with the tag present against the directive matches
 * without it. The difference would be the directives which match because the tag is present.
 *
 * @param element The element or template node that the attribute/tag is part of.
 * @param directives The list of directives to match against.
 * @returns The list of directives matching the tag name via the strategy described above.
 */
export declare function getDirectiveMatchesForElementTag<T extends {
    selector: string | null;
}>(element: TmplAstTemplate | TmplAstElement, directives: T[]): Set<T>;
export declare function makeElementSelector(element: TmplAstElement | TmplAstTemplate): string;
/**
 * Given an attribute name, determines which directives match because the attribute is present. We
 * find which directives are applied because of this attribute by elimination: compare the directive
 * matches with the attribute present against the directive matches without it. The difference would
 * be the directives which match because the attribute is present.
 *
 * @param name The name of the attribute
 * @param hostNode The node which the attribute appears on
 * @param directives The list of directives to match against.
 * @returns The list of directives matching the tag name via the strategy described above.
 */
export declare function getDirectiveMatchesForAttribute(name: string, hostNode: TmplAstTemplate | TmplAstElement, directives: DirectiveSymbol[]): Set<DirectiveSymbol>;
/**
 * Returns a new `ts.SymbolDisplayPart` array which has the alias imports from the tcb filtered
 * out, i.e. `i0.NgForOf`.
 */
export declare function filterAliasImports(displayParts: ts.SymbolDisplayPart[]): ts.SymbolDisplayPart[];
export declare function isDollarEvent(n: TmplAstNode | AST): n is PropertyRead;
export declare function isTypeScriptFile(fileName: string): boolean;
export declare function isExternalTemplate(fileName: string): boolean;
export declare function isWithin(position: number, span: AbsoluteSourceSpan | ParseSourceSpan): boolean;
/**
 * For a given location in a shim file, retrieves the corresponding file url for the template and
 * the span in the template.
 */
export declare function getTemplateLocationFromTcbLocation(templateTypeChecker: TemplateTypeChecker, tcbPath: AbsoluteFsPath, tcbIsShim: boolean, positionInFile: number): {
    templateUrl: AbsoluteFsPath;
    span: ParseSourceSpan;
} | null;
export declare function isBoundEventWithSyntheticHandler(event: TmplAstBoundEvent): boolean;
/**
 * Construct a QuickInfo object taking into account its container and type.
 * @param name Name of the QuickInfo target
 * @param kind component, directive, pipe, etc.
 * @param textSpan span of the target
 * @param containerName either the Symbol's container or the NgModule that contains the directive
 * @param type user-friendly name of the type
 * @param documentation docstring or comment
 */
export declare function createQuickInfo(name: string, kind: DisplayInfoKind, textSpan: ts.TextSpan, containerName?: string, type?: string, documentation?: ts.SymbolDisplayPart[], tags?: ts.JSDocTagInfo[]): ts.QuickInfo;
export {};
