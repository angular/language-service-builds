/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/ivy/hybrid_visitor" />
import * as e from '@angular/compiler/src/expression_parser/ast';
import * as t from '@angular/compiler/src/render3/r3_ast';
/**
 * Return the path to the template AST node or expression AST node that most accurately
 * represents the node at the specified cursor `position`.
 *
 * @param ast AST tree
 * @param position cursor position
 */
export declare function getPathToNodeAtPosition(ast: t.Node[], position: number): Array<t.Node | e.AST> | undefined;
/**
 * Return the template AST node or expression AST node that most accurately
 * represents the node at the specified cursor `position`.
 *
 * @param ast AST tree
 * @param position cursor position
 */
export declare function findNodeAtPosition(ast: t.Node[], position: number): t.Node | e.AST | undefined;
