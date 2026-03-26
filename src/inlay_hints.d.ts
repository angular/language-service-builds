/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import ts from 'typescript';
import { TypeCheckInfo } from './utils';
export type { AngularInlayHint, InlayHintsConfig, InlayHintDisplayPart } from '../api';
import type { AngularInlayHint, InlayHintsConfig } from '../api';
/**
 * Get Angular-specific inlay hints for a template.
 */
export declare function getInlayHintsForTemplate(compiler: NgCompiler, typeCheckInfo: TypeCheckInfo, span: ts.TextSpan, config?: InlayHintsConfig): AngularInlayHint[];
