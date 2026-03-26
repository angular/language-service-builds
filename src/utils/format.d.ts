/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
/**
 * Try to guess the indentation of the node.
 *
 * This function returns the indentation only if the start character of this node is
 * the first non-whitespace character in a line where the node is, otherwise,
 * it returns `undefined`. When computing the start of the node, it should include
 * the leading comments.
 */
export declare function guessIndentationInSingleLine(node: ts.Node, sourceFile: ts.SourceFile): number | undefined;
