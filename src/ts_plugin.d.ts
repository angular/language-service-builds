/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type ts from 'typescript';
import { NgLanguageService } from '../api';
export declare function create(info: ts.server.PluginCreateInfo): NgLanguageService;
/** Implementation of a ts.server.PluginModuleFactory */
export declare function initialize(mod: {
    typescript: typeof ts;
}): ts.server.PluginModule;
