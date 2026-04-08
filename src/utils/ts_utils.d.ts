/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { PotentialDirective, PotentialPipe, TemplateTypeChecker, SymbolReference } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import ts from 'typescript';
/**
 * Return the node that most tightly encompasses the specified `position`.
 * @param node The starting node to start the top-down search.
 * @param position The target position within the `node`.
 */
export declare function findTightestNode(node: ts.Node, position: number): ts.Node | undefined;
export interface FindOptions<T extends ts.Node> {
    filter: (node: ts.Node) => node is T;
    position?: number;
}
/**
 * Finds TypeScript nodes descending from the provided root which match the given filter.
 */
export declare function findAllMatchingNodes<T extends ts.Node>(root: ts.Node, opts: FindOptions<T>): T[];
/**
 * Finds TypeScript nodes descending from the provided root which match the given filter.
 */
export declare function findFirstMatchingNode<T extends ts.Node>(root: ts.Node, opts: FindOptions<T>): T | null;
/**
 * Resolves a ClassDeclaration from a SymbolReference.
 */
export declare function getClassDeclarationFromSymbolReference(ls: ts.LanguageService, ref: SymbolReference): ts.ClassDeclaration | null;
export declare function getParentClassDeclaration(startNode: ts.Node): ts.ClassDeclaration | undefined;
/**
 * Returns a property assignment from the assignment value if the property name
 * matches the specified `key`, or `null` if there is no match.
 */
export declare function getPropertyAssignmentFromValue(value: ts.Node, key: string): ts.PropertyAssignment | null;
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
 * Collects all member methods, including those from base classes.
 */
export declare function collectMemberMethods(clazz: ts.ClassDeclaration, typeChecker: ts.TypeChecker): ts.MethodDeclaration[];
/**
 * Given an existing array literal expression, update it by pushing a new expression.
 */
export declare function addElementToArrayLiteral(arr: ts.ArrayLiteralExpression, elem: ts.Expression): ts.ArrayLiteralExpression;
/**
 * Given an ObjectLiteralExpression node, extract and return the PropertyAssignment corresponding to
 * the given key. `null` if no such key exists.
 */
export declare function objectPropertyAssignmentForKey(obj: ts.ObjectLiteralExpression, key: string): ts.PropertyAssignment | null;
/**
 * Given an ObjectLiteralExpression node, create or update the specified key, using the provided
 * callback to generate the new value (possibly based on an old value), and return the `ts.PropertyAssignment`
 * for the key.
 */
export declare function updateObjectValueForKey(obj: ts.ObjectLiteralExpression, key: string, newValueFn: (oldValue?: ts.Expression) => ts.Expression): ts.PropertyAssignment;
/**
 * Create a new ArrayLiteralExpression, or accept an existing one.
 * Ensure the array contains the provided identifier.
 * Returns the array, either updated or newly created.
 * If no update is needed, returns `null`.
 */
export declare function ensureArrayWithIdentifier(identifierText: string, expression: ts.Expression, arr?: ts.ArrayLiteralExpression): ts.ArrayLiteralExpression | null;
/**
 * Determine whether this an import of the given `propertyName` from a particular module
 * specifier already exists. If so, return the local name for that import, which might be an
 * alias.
 */
export declare function hasImport(importDeclarations: ts.ImportDeclaration[], propName: string, moduleSpecifier: string): string | null;
/**
 * Transform the given import name into an alias that does not collide with any other import
 * symbol.
 */
export declare function nonCollidingImportName(importDeclarations: ts.ImportDeclaration[], name: string): string;
/**
 * If the provided trait is standalone, just return it. Otherwise, returns the owning ngModule.
 */
export declare function standaloneTraitOrNgModule(checker: TemplateTypeChecker, trait: ts.ClassDeclaration): ts.ClassDeclaration | null;
/**
 * Updates the imports on a TypeScript file, by ensuring the provided import is present.
 * Returns the text changes, as well as the name with which the imported symbol can be referred to.
 *
 * When the component is exported by default, the `symbolName` is `default`, and the `declarationName`
 * should be used as the import name.
 */
export declare function updateImportsForTypescriptFile(file: ts.SourceFile, symbolName: string, declarationName: string, moduleSpecifier: string): [ts.TextChange[], string];
/**
 * Updates a given Angular trait, such as an NgModule or standalone Component, by adding
 * `importName` to the list of imports on the decorator arguments.
 */
export declare function updateImportsForAngularTrait(checker: TemplateTypeChecker, trait: ts.ClassDeclaration, importName: string, forwardRefName: string | null): ts.TextChange[];
/**
 * Return whether a given Angular decorator specifies `standalone: true`.
 */
export declare function isStandaloneDecorator(decorator: ts.Decorator): boolean | null;
/**
 * Generate a new import. Follows the format:
 * ```ts
 * import {exportedSpecifierName as localName} from 'rawModuleSpecifier';
 * ```
 *
 * If the component is exported by default, follows the format:
 *
 * ```ts
 * import exportedSpecifierName from 'rawModuleSpecifier';
 * ```
 *
 * If `exportedSpecifierName` is null, or is equal to `name`, then the qualified import alias will
 * be omitted.
 */
export declare function generateImport(localName: string, exportedSpecifierName: string | null, rawModuleSpecifier: string): ts.ImportDeclaration;
/**
 * Update an existing named import with a new member.
 * If `exportedSpecifierName` is null, or is equal to `name`, then the qualified import alias will
 * be omitted.
 * If the `localName` is `default` and `exportedSpecifierName` is not null, the `exportedSpecifierName`
 * is used as the default import name.
 */
export declare function updateImport(importDeclaration: ts.ImportDeclaration, localName: string, exportedSpecifierName: string | null): ts.ImportClause | undefined;
/**
 * Print a given TypeScript node into a string. Used to serialize entirely synthetic generated AST,
 * which will not have `.text` or `.fullText` set.
 */
export declare function printNode(node: ts.Node, sourceFile: ts.SourceFile): string;
/**
 * Get the code actions to tell the vscode how to import the directive into the standalone component or ng module.
 */
export declare function getCodeActionToImportTheDirectiveDeclaration(compiler: NgCompiler, component: ts.ClassDeclaration, importOn: ts.ClassDeclaration, directive: PotentialDirective | PotentialPipe, tsLs: ts.LanguageService, includeCompletionsForModuleExports?: boolean): ts.CodeAction[] | undefined;
