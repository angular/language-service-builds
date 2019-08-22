/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/definitions" />
import * as ts from 'typescript';
import { AstResult } from './common';
/**
 * Traverse the template AST and look for the symbol located at `position`, then
 * return its definition and span of bound text.
 * @param info
 * @param position
 */
export declare function getDefinitionAndBoundSpan(info: AstResult, position: number): ts.DefinitionInfoAndBoundSpan | undefined;
