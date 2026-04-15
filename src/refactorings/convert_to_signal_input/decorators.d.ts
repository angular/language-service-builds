/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type ts from 'typescript';
import { ReflectionHost } from '@angular/compiler-cli/src/ngtsc/reflection';
export declare function isDecoratorInputClassField(node: ts.ClassElement, reflector: ReflectionHost): boolean;
export declare function isDirectiveOrComponentWithInputs(node: ts.ClassDeclaration, reflector: ReflectionHost): boolean;
