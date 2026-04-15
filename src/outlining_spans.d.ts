/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import ts from 'typescript';
export declare function getOutliningSpans(compiler: NgCompiler, fileName: string): ts.OutliningSpan[];
