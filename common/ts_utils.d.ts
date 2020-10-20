/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/common/ts_utils" />
import * as ts from 'typescript';
/**
 * Return the node that most tightly encompass the specified `position`.
 * @param node
 * @param position
 */
export declare function findTightestNode(node: ts.Node, position: number): ts.Node | undefined;
/**
 * Returns a property assignment from the assignment value if the property name
 * matches the specified `key`, or `undefined` if there is no match.
 */
export declare function getPropertyAssignmentFromValue(value: ts.Node, key: string): ts.PropertyAssignment | undefined;
/**
 * Given a decorator property assignment, return the ClassDeclaration node that corresponds to the
 * directive class the property applies to.
 * If the property assignment is not on a class decorator, no declaration is returned.
 *
 * For example,
 *
 * @Component({
 *   template: '<div></div>'
 *   ^^^^^^^^^^^^^^^^^^^^^^^---- property assignment
 * })
 * class AppComponent {}
 *           ^---- class declaration node
 *
 * @param propAsgnNode property assignment
 */
export declare function getClassDeclFromDecoratorProp(propAsgnNode: ts.PropertyAssignment): ts.ClassDeclaration | undefined;
/**
 * Given the node which is the string of the inline template for a component, returns the
 * `ts.ClassDeclaration` for the component.
 */
export declare function getClassDeclOfInlineTemplateNode(templateStringNode: ts.Node): ts.ClassDeclaration | undefined;
