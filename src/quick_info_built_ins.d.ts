/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AST, Call, TmplAstBlockNode, TmplAstDeferredTrigger, TmplAstNode } from '@angular/compiler';
import type ts from 'typescript';
export declare function isDollarAny(node: TmplAstNode | AST): node is Call;
export declare function createDollarAnyQuickInfo(node: Call): ts.QuickInfo;
export declare function createNgTemplateQuickInfo(node: TmplAstNode | AST): ts.QuickInfo;
export declare function createQuickInfoForBuiltIn(node: TmplAstDeferredTrigger | TmplAstBlockNode, cursorPositionInTemplate: number): ts.QuickInfo | undefined;
