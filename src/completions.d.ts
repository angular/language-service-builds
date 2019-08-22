/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/completions" />
import { AstResult } from './common';
import { Completion, Completions } from './types';
export declare function getTemplateCompletions(templateInfo: AstResult, position: number): Completions | undefined;
export declare function ngCompletionToTsCompletionEntry(completion: Completion): ts.CompletionEntry;
