/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/utils" />
import { CompileTypeMetadata, ParseSourceSpan, TemplateAst, TemplateAstPath } from '@angular/compiler';
import { DiagnosticTemplateInfo } from '@angular/compiler-cli/src/language_services';
import * as ts from 'typescript';
import { AstResult, SelectorInfo } from './common';
import { Span } from './types';
export interface SpanHolder {
    sourceSpan: ParseSourceSpan;
    endSourceSpan?: ParseSourceSpan | null;
    children?: SpanHolder[];
}
export declare function isParseSourceSpan(value: any): value is ParseSourceSpan;
export declare function spanOf(span: SpanHolder): Span;
export declare function spanOf(span: ParseSourceSpan): Span;
export declare function spanOf(span: SpanHolder | ParseSourceSpan | undefined): Span | undefined;
export declare function inSpan(position: number, span?: Span, exclusive?: boolean): boolean;
export declare function offsetSpan(span: Span, amount: number): Span;
export declare function isNarrower(spanA: Span, spanB: Span): boolean;
export declare function hasTemplateReference(type: CompileTypeMetadata): boolean;
export declare function getSelectors(info: AstResult): SelectorInfo;
export declare function flatten<T>(a: T[][]): T[];
export declare function removeSuffix(value: string, suffix: string): string;
export declare function uniqueByName<T extends {
    name: string;
}>(elements: T[] | undefined): T[] | undefined;
export declare function isTypescriptVersion(low: string, high?: string): boolean;
export declare function diagnosticInfoFromTemplateInfo(info: AstResult): DiagnosticTemplateInfo;
export declare function findTemplateAstAt(ast: TemplateAst[], position: number, allowWidening?: boolean): TemplateAstPath;
/**
 * Return the node that most tightly encompass the specified `position`.
 * @param node
 * @param position
 */
export declare function findTightestNode(node: ts.Node, position: number): ts.Node | undefined;
interface DirectiveClassLike {
    decoratorId: ts.Identifier;
    classDecl: ts.ClassDeclaration;
}
/**
 * Return metadata about `node` if it looks like an Angular directive class.
 * In this case, potential matches are `@NgModule`, `@Component`, `@Directive`,
 * `@Pipe`, etc.
 * These class declarations all share some common attributes, namely their
 * decorator takes exactly one parameter and the parameter must be an object
 * literal.
 *
 * For example,
 *     v---------- `decoratorId`
 * @NgModule({
 *   declarations: [],
 * })
 * class AppModule {}
 *          ^----- `classDecl`
 *
 * @param node Potential node that represents an Angular directive.
 */
export declare function getDirectiveClassLike(node: ts.Node): DirectiveClassLike | undefined;
export {};
