/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli';
import ts from 'typescript';
/**
 * Queries the TypeScript Language Service to get signature help for a template position.
 */
export declare function getSignatureHelp(compiler: NgCompiler, tsLS: ts.LanguageService, fileName: string, position: number, options: ts.SignatureHelpItemsOptions | undefined): ts.SignatureHelpItems | undefined;
