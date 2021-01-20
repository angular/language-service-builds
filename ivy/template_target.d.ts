/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/ivy/template_target" />
import * as e from '@angular/compiler/src/expression_parser/ast';
import * as t from '@angular/compiler/src/render3/r3_ast';
/**
 * Contextual information for a target position within the template.
 */
export interface TemplateTarget {
    /**
     * Target position within the template.
     */
    position: number;
    /**
     * The template node (or AST expression) closest to the search position.
     */
    node: t.Node | e.AST;
    /**
     * The `t.Template` which contains the found node or expression (or `null` if in the root
     * template).
     */
    context: t.Template | null;
    /**
     * The immediate parent node of the targeted node.
     */
    parent: t.Node | e.AST | null;
}
/**
 * Return the template AST node or expression AST node that most accurately
 * represents the node at the specified cursor `position`.
 *
 * @param template AST tree of the template
 * @param position target cursor position
 */
export declare function getTargetAtPosition(template: t.Node[], position: number): TemplateTarget | null;
