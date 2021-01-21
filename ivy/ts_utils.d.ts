/// <amd-module name="@angular/language-service/ivy/ts_utils" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
/**
 * Return the node that most tightly encompasses the specified `position`.
 * @param node The starting node to start the top-down search.
 * @param position The target position within the `node`.
 */
export declare function findTightestNode(node: ts.Node, position: number): ts.Node | undefined;
export declare function getParentClassDeclaration(startNode: ts.Node): ts.ClassDeclaration | undefined;
