/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli';
import ts from 'typescript';
/**
 * Computes the smart selection range (nested ranges used by the editor's
 * "Expand/Shrink Selection" feature) for a position inside an Angular template.
 *
 * The chain includes, from innermost to outermost, every expression and
 * template AST node that contains the position (property reads, calls,
 * interpolations, attributes, elements, control flow blocks, ...). For nodes
 * delimited by braces or tags, the content between the delimiters is included
 * as an extra step so that e.g. the body of an `@if` block can be selected
 * before the whole block.
 *
 * Returns `undefined` when the position is not inside an Angular template that
 * this language service knows about. Merging with the surrounding TypeScript
 * structure is left to the editor, which queries every registered selection
 * range provider and combines the resulting containment trees.
 */
export declare function getTemplateSelectionRange(compiler: NgCompiler, fileName: string, position: number): ts.SelectionRange | undefined;
