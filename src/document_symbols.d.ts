/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { AngularSymbolKind, DocumentSymbolsOptions, TemplateDocumentSymbol } from '../api';
export type { AngularSymbolKind, DocumentSymbolsOptions, TemplateDocumentSymbol };
/**
 * Gets document symbols for Angular templates in the given file.
 * For TypeScript files with inline templates, returns symbols for each template.
 * For external template files (.html), returns symbols for the template content.
 *
 * @param compiler The Angular compiler instance
 * @param fileName The file path to get template symbols for
 * @param options Optional configuration for document symbols behavior
 */
export declare function getTemplateDocumentSymbols(compiler: NgCompiler, fileName: string, options?: DocumentSymbolsOptions): TemplateDocumentSymbol[];
