/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli';
import { LinkedEditingRanges } from '../api';
/**
 * Gets linked editing ranges for synchronized editing of HTML tag pairs.
 *
 * When the cursor is on an element tag name, returns both the opening and closing
 * tag name spans so they can be edited simultaneously.
 *
 * @param compiler The Angular compiler instance
 * @param fileName The file to check
 * @param position The cursor position in the file
 * @returns LinkedEditingRanges if on a tag name, null otherwise
 */
export declare function getLinkedEditingRangeAtPosition(compiler: NgCompiler, fileName: string, position: number): LinkedEditingRanges | null;
