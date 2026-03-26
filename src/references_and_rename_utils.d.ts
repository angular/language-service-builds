/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AST, TmplAstNode, TmplAstComponent, TmplAstDirective, TmplAstRecursiveVisitor } from '@angular/compiler';
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { DirectiveMeta, PipeMeta } from '@angular/compiler-cli/src/ngtsc/metadata';
import { Symbol, TemplateTypeChecker } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import ts from 'typescript';
import { TypeCheckInfo } from './utils';
/** Represents a location in a file. */
export interface FilePosition {
    fileName: string;
    position: number;
}
export interface TemplateLocationDetails {
    /**
     * A target node in a template.
     */
    templateTarget: TmplAstNode | AST;
    /**
     * TypeScript locations which the template node maps to. A given template node might map to
     * several TS nodes. For example, a template node for an attribute might resolve to several
     * directives or a directive and one of its inputs.
     */
    typescriptLocations: FilePosition[];
    /**
     * The resolved Symbol for the template target.
     */
    symbol: Symbol;
}
/**
 * Takes a position in a template and finds equivalent targets in TS files as well as details about
 * the targeted template node.
 */
export declare function getTargetDetailsAtTemplatePosition(info: TypeCheckInfo, position: number, templateTypeChecker: TemplateTypeChecker): TemplateLocationDetails[] | null;
/**
 * Creates a "key" for a rename/reference location by concatenating file name, span start, and span
 * length. This allows us to de-duplicate template results when an item may appear several times
 * in the TCB but map back to the same template location.
 */
export declare function createLocationKey(ds: ts.DocumentSpan): string;
/**
 * Converts a given `ts.DocumentSpan` in a shim file to its equivalent `ts.DocumentSpan` in the
 * template.
 *
 * You can optionally provide a `requiredNodeText` that ensures the equivalent template node's text
 * matches. If it does not, this function will return `null`.
 */
export declare function convertToTemplateDocumentSpan<T extends ts.DocumentSpan>(shimDocumentSpan: T, templateTypeChecker: TemplateTypeChecker, program: ts.Program, requiredNodeText?: string): T | null;
/**
 * Finds the text and `ts.TextSpan` for the node at a position in a template.
 */
export declare function getRenameTextAndSpanAtPosition(node: TmplAstNode | AST, position: number): {
    text: string;
    span: ts.TextSpan;
} | null;
/**
 * Retrieves the `PipeMeta` or `DirectiveMeta` of the given `ts.Node`'s parent class.
 *
 * Returns `null` if the node has no parent class or there is no meta associated with the class.
 */
export declare function getParentClassMeta(requestNode: ts.Node, compiler: NgCompiler): PipeMeta | DirectiveMeta | null;
/** Visitor that collects all selectorless AST nodes from a template. */
export declare class SelectorlessCollector extends TmplAstRecursiveVisitor {
    private nodes;
    static getSelectorlessNodes(nodes: TmplAstNode[]): (TmplAstComponent | TmplAstDirective)[];
    visit(node: TmplAstNode): void;
}
