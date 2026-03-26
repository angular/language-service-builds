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
/**
 * see https://github.com/microsoft/TypeScript/blob/c85e626d8e17427a6865521737b45ccbbe9c78ef/src/services/classifier2020.ts#L49
 */
export declare const enum TokenEncodingConsts {
    typeOffset = 8,
    modifierMask = 255
}
/**
 * Token types extended from TypeScript
 * see https://github.com/microsoft/TypeScript/blob/c85e626d8e17427a6865521737b45ccbbe9c78ef/src/services/classifier2020.ts#L55
 */
export declare const enum TokenType {
    class = 0,
    enum = 1,
    interface = 2,
    namespace = 3,
    typeParameter = 4,
    type = 5,
    parameter = 6,
    variable = 7,
    enumMember = 8,
    property = 9,
    function = 10,
    member = 11
}
/**
 * Token modifiers extended from TypeScript
 * see https://github.com/microsoft/TypeScript/blob/c85e626d8e17427a6865521737b45ccbbe9c78ef/src/services/classifier2020.ts#L71
 */
export declare const enum TokenModifier {
    declaration = 0,
    static = 1,
    async = 2,
    readonly = 3,
    defaultLibrary = 4,
    local = 5
}
export declare function getClassificationsForTemplate(compiler: NgCompiler, typeCheckInfo: TypeCheckInfo, range: ts.TextSpan): ts.Classifications;
