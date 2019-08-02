/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/definitions" />
import * as tss from 'typescript/lib/tsserverlibrary';
import { TemplateInfo } from './common';
import { Location } from './types';
export declare function getDefinition(info: TemplateInfo): Location[] | undefined;
export declare function ngLocationToTsDefinitionInfo(loc: Location): tss.DefinitionInfo;
