/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/common/quick_info" />
import * as ts from 'typescript';
export declare const ALIAS_NAME: string;
export declare const SYMBOL_INTERFACE: string;
export declare const SYMBOL_PUNC: string;
export declare const SYMBOL_SPACE: string;
export declare const SYMBOL_TEXT: string;
/**
 * Construct a QuickInfo object taking into account its container and type.
 * @param name Name of the QuickInfo target
 * @param kind component, directive, pipe, etc.
 * @param textSpan span of the target
 * @param containerName either the Symbol's container or the NgModule that contains the directive
 * @param type user-friendly name of the type
 * @param documentation docstring or comment
 */
export declare function createQuickInfo(name: string, kind: string, textSpan: ts.TextSpan, containerName?: string, type?: string, documentation?: ts.SymbolDisplayPart[]): ts.QuickInfo;
