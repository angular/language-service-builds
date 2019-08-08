/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/definitions" />
import * as ts from 'typescript';
import { TemplateInfo } from './common';
export declare function getDefinitionAndBoundSpan(info: TemplateInfo): ts.DefinitionInfoAndBoundSpan | undefined;
