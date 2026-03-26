/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AST, Call, SafeCall, TmplAstBoundAttribute, TmplAstBoundEvent, TmplAstComponent, TmplAstDirective, TmplAstElement, TmplAstNode, TmplAstTemplate, TmplAstTextAttribute } from '@angular/compiler';
import tss from 'typescript';
/**
 * Contextual information for a target position within the template.
 */
export interface TemplateTarget {
    /**
     * Target position within the template.
     */
    position: number;
    /**
     * The template (or AST expression) node or nodes closest to the search position.
     */
    context: TargetContext;
    /**
     * The `TmplAstTemplate` which contains the found node or expression (or `null` if in the root
     * template).
     */
    template: TmplAstTemplate | null;
    /**
     * The immediate parent node of the targeted node.
     */
    parent: TmplAstNode | AST | null;
}
/**
 * A node or nodes targeted at a given position in the template, including potential contextual
 * information about the specific aspect of the node being referenced.
 *
 * Some nodes have multiple interior contexts. For example, `TmplAstElement` nodes have both a tag
 * name as well as a body, and a given position definitively points to one or the other.
 * `TargetNode` captures the node itself, as well as this additional contextual disambiguation.
 */
export type TargetContext = SingleNodeTarget | MultiNodeTarget;
/** Contexts which logically target only a single node in the template AST. */
export type SingleNodeTarget = RawExpression | CallExpressionInArgContext | RawTemplateNode | ElementInBodyContext | ElementInTagContext | AttributeInKeyContext | AttributeInValueContext | ComponentInBodyContext | ComponentInTagContext | DirectiveInNameContext | DirectiveInBodyContext;
/**
 * Contexts which logically target multiple nodes in the template AST, which cannot be
 * disambiguated given a single position because they are all equally relevant. For example, in the
 * banana-in-a-box syntax `[(ngModel)]="formValues.person"`, the position in the template for the
 * key `ngModel` refers to both the bound event `ngModelChange` and the input `ngModel`.
 */
export type MultiNodeTarget = TwoWayBindingContext;
/**
 * Differentiates the various kinds of `TargetNode`s.
 */
export declare enum TargetNodeKind {
    RawExpression = 0,
    CallExpressionInArgContext = 1,
    RawTemplateNode = 2,
    ElementInTagContext = 3,
    ElementInBodyContext = 4,
    AttributeInKeyContext = 5,
    AttributeInValueContext = 6,
    TwoWayBindingContext = 7,
    ComponentInTagContext = 8,
    ComponentInBodyContext = 9,
    DirectiveInNameContext = 10,
    DirectiveInBodyContext = 11
}
/**
 * An `AST` expression that's targeted at a given position, with no additional context.
 */
export interface RawExpression {
    kind: TargetNodeKind.RawExpression;
    node: AST;
    parents: AST[];
}
/**
 * An `e.Call` expression with the cursor in a position where an argument could appear.
 *
 * This is returned when the only matching node is the method call expression, but the cursor is
 * within the method call parentheses. For example, in the expression `foo(|)` there is no argument
 * expression that the cursor could be targeting, but the cursor is in a position where one could
 * appear.
 */
export interface CallExpressionInArgContext {
    kind: TargetNodeKind.CallExpressionInArgContext;
    node: Call | SafeCall;
}
/**
 * A `TmplAstNode` template node that's targeted at a given position, with no additional context.
 */
export interface RawTemplateNode {
    kind: TargetNodeKind.RawTemplateNode;
    node: TmplAstNode;
}
/**
 * A `TmplAstElement` (or `TmplAstTemplate`) element node that's targeted, where the given position
 * is within the tag name.
 */
export interface ElementInTagContext {
    kind: TargetNodeKind.ElementInTagContext;
    node: TmplAstElement | TmplAstTemplate;
}
/**
 * A `TmplAstElement` (or `TmplAstTemplate`) element node that's targeted, where the given position
 * is within the element body.
 */
export interface ElementInBodyContext {
    kind: TargetNodeKind.ElementInBodyContext;
    node: TmplAstElement | TmplAstTemplate;
}
/**
 * A `TmplAstComponent` element node that's targeted, where the given position is within the tag,
 * e.g. `MyComp` in `<MyComp foo="bar"/>`.
 */
export interface ComponentInTagContext {
    kind: TargetNodeKind.ComponentInTagContext;
    node: TmplAstComponent;
}
/**
 * A `TmplAstComponent` element node that's targeted, where the given position is within the body,
 * e.g. `foo="bar"/>` in `<MyComp foo="bar"/>`.
 */
export interface ComponentInBodyContext {
    kind: TargetNodeKind.ComponentInBodyContext;
    node: TmplAstComponent;
}
/**
 * A `TmplAstDirective` element node that's targeted, where the given position is within the
 * directive's name (e.g. `MyDir` in `@MyDir`).
 */
export interface DirectiveInNameContext {
    kind: TargetNodeKind.DirectiveInNameContext;
    node: TmplAstDirective;
}
/**
 * A `TmplAstDirective` element node that's targeted, where the given position is within the body,
 * e.g. `(foo="bar")` in `@MyDir(foo="bar")`.
 */
export interface DirectiveInBodyContext {
    kind: TargetNodeKind.DirectiveInBodyContext;
    node: TmplAstDirective;
}
export interface AttributeInKeyContext {
    kind: TargetNodeKind.AttributeInKeyContext;
    node: TmplAstTextAttribute | TmplAstBoundAttribute | TmplAstBoundEvent;
}
export interface AttributeInValueContext {
    kind: TargetNodeKind.AttributeInValueContext;
    node: TmplAstTextAttribute | TmplAstBoundAttribute | TmplAstBoundEvent;
}
/**
 * A `TmplAstBoundAttribute` and `TmplAstBoundEvent` pair that are targeted, where the given
 * position is within the key span of both.
 */
export interface TwoWayBindingContext {
    kind: TargetNodeKind.TwoWayBindingContext;
    nodes: [TmplAstBoundAttribute, TmplAstBoundEvent];
}
/**
 * Return the template AST node or expression AST node that most accurately
 * represents the node at the specified cursor `position`.
 *
 * @param template AST tree of the template
 * @param position target cursor position
 */
export declare function getTargetAtPosition(template: TmplAstNode[], position: number): TemplateTarget | null;
/**
 * A tcb nodes for the template at a given position, include the tcb node of the template.
 */
interface TcbNodesInfoForTemplate {
    componentTcbNode: tss.Node;
    nodes: tss.Node[];
}
/**
 * Return the nodes in `TCB` of the node at the specified cursor `position`.
 *
 */
export declare function getTcbNodesOfTemplateAtPosition(templateNodes: TmplAstNode[], position: number, tcb: tss.Node): TcbNodesInfoForTemplate | null;
export {};
