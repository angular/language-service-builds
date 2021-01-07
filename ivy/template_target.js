/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/template_target", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTargetAtPosition = exports.TargetNodeKind = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var e = require("@angular/compiler/src/expression_parser/ast"); // e for expression AST
    var t = require("@angular/compiler/src/render3/r3_ast"); // t for template AST
    var utils_1 = require("@angular/language-service/ivy/utils");
    /**
     * Differentiates the various kinds of `TargetNode`s.
     */
    var TargetNodeKind;
    (function (TargetNodeKind) {
        TargetNodeKind[TargetNodeKind["RawExpression"] = 0] = "RawExpression";
        TargetNodeKind[TargetNodeKind["RawTemplateNode"] = 1] = "RawTemplateNode";
        TargetNodeKind[TargetNodeKind["ElementInTagContext"] = 2] = "ElementInTagContext";
        TargetNodeKind[TargetNodeKind["ElementInBodyContext"] = 3] = "ElementInBodyContext";
        TargetNodeKind[TargetNodeKind["AttributeInKeyContext"] = 4] = "AttributeInKeyContext";
        TargetNodeKind[TargetNodeKind["AttributeInValueContext"] = 5] = "AttributeInValueContext";
    })(TargetNodeKind = exports.TargetNodeKind || (exports.TargetNodeKind = {}));
    /**
     * This special marker is added to the path when the cursor is within the sourceSpan but not the key
     * or value span of a node with key/value spans.
     */
    var OUTSIDE_K_V_MARKER = new e.AST(new compiler_1.ParseSpan(-1, -1), new e.AbsoluteSourceSpan(-1, -1));
    /**
     * Return the template AST node or expression AST node that most accurately
     * represents the node at the specified cursor `position`.
     *
     * @param template AST tree of the template
     * @param position target cursor position
     */
    function getTargetAtPosition(template, position) {
        var path = TemplateTargetVisitor.visitTemplate(template, position);
        if (path.length === 0) {
            return null;
        }
        var candidate = path[path.length - 1];
        // Walk up the result nodes to find the nearest `t.Template` which contains the targeted node.
        var context = null;
        for (var i = path.length - 2; i >= 0; i--) {
            var node = path[i];
            if (node instanceof t.Template) {
                context = node;
                break;
            }
        }
        var parent = null;
        if (path.length >= 2) {
            parent = path[path.length - 2];
        }
        // Given the candidate node, determine the full targeted context.
        var nodeInContext;
        if (candidate instanceof e.AST) {
            nodeInContext = {
                kind: TargetNodeKind.RawExpression,
                node: candidate,
            };
        }
        else if (candidate instanceof t.Element) {
            // Elements have two contexts: the tag context (position is within the element tag) or the
            // element body context (position is outside of the tag name, but still in the element).
            // Calculate the end of the element tag name. Any position beyond this is in the element body.
            var tagEndPos = candidate.sourceSpan.start.offset + 1 /* '<' element open */ + candidate.name.length;
            if (position > tagEndPos) {
                // Position is within the element body
                nodeInContext = {
                    kind: TargetNodeKind.ElementInBodyContext,
                    node: candidate,
                };
            }
            else {
                nodeInContext = {
                    kind: TargetNodeKind.ElementInTagContext,
                    node: candidate,
                };
            }
        }
        else if ((candidate instanceof t.BoundAttribute || candidate instanceof t.BoundEvent ||
            candidate instanceof t.TextAttribute) &&
            candidate.keySpan !== undefined) {
            if (utils_1.isWithin(position, candidate.keySpan)) {
                nodeInContext = {
                    kind: TargetNodeKind.AttributeInKeyContext,
                    node: candidate,
                };
            }
            else {
                nodeInContext = {
                    kind: TargetNodeKind.AttributeInValueContext,
                    node: candidate,
                };
            }
        }
        else {
            nodeInContext = {
                kind: TargetNodeKind.RawTemplateNode,
                node: candidate,
            };
        }
        return { position: position, nodeInContext: nodeInContext, template: context, parent: parent };
    }
    exports.getTargetAtPosition = getTargetAtPosition;
    /**
     * Visitor which, given a position and a template, identifies the node within the template at that
     * position, as well as records the path of increasingly nested nodes that were traversed to reach
     * that position.
     */
    var TemplateTargetVisitor = /** @class */ (function () {
        // Position must be absolute in the source file.
        function TemplateTargetVisitor(position) {
            this.position = position;
            // We need to keep a path instead of the last node because we might need more
            // context for the last node, for example what is the parent node?
            this.path = [];
        }
        TemplateTargetVisitor.visitTemplate = function (template, position) {
            var visitor = new TemplateTargetVisitor(position);
            visitor.visitAll(template);
            var path = visitor.path;
            var strictPath = path.filter(function (v) { return v !== OUTSIDE_K_V_MARKER; });
            var candidate = strictPath[strictPath.length - 1];
            var matchedASourceSpanButNotAKvSpan = path.some(function (v) { return v === OUTSIDE_K_V_MARKER; });
            if (matchedASourceSpanButNotAKvSpan &&
                (candidate instanceof t.Template || candidate instanceof t.Element)) {
                // Template nodes with key and value spans are always defined on a `t.Template` or
                // `t.Element`. If we found a node on a template with a `sourceSpan` that includes the cursor,
                // it is possible that we are outside the k/v spans (i.e. in-between them). If this is the
                // case and we do not have any other candidate matches on the `t.Element` or `t.Template`, we
                // want to return no results. Otherwise, the `t.Element`/`t.Template` result is incorrect for
                // that cursor position.
                return [];
            }
            return strictPath;
        };
        TemplateTargetVisitor.prototype.visit = function (node) {
            var last = this.path[this.path.length - 1];
            if (last && utils_1.isTemplateNodeWithKeyAndValue(last) && utils_1.isWithin(this.position, last.keySpan)) {
                // We've already identified that we are within a `keySpan` of a node.
                // We should stop processing nodes at this point to prevent matching
                // any other nodes. This can happen when the end span of a different node
                // touches the start of the keySpan for the candidate node. Because
                // our `isWithin` logic is inclusive on both ends, we can match both nodes.
                return;
            }
            var _a = getSpanIncludingEndTag(node), start = _a.start, end = _a.end;
            if (!utils_1.isWithin(this.position, { start: start, end: end })) {
                return;
            }
            if (utils_1.isTemplateNodeWithKeyAndValue(node) && !utils_1.isWithinKeyValue(this.position, node)) {
                // If cursor is within source span but not within key span or value span,
                // do not return the node.
                this.path.push(OUTSIDE_K_V_MARKER);
            }
            else {
                this.path.push(node);
                node.visit(this);
            }
        };
        TemplateTargetVisitor.prototype.visitElement = function (element) {
            this.visitAll(element.attributes);
            this.visitAll(element.inputs);
            this.visitAll(element.outputs);
            this.visitAll(element.references);
            var last = this.path[this.path.length - 1];
            // If we get here and have not found a candidate node on the element itself, proceed with
            // looking for a more specific node on the element children.
            if (last === element) {
                this.visitAll(element.children);
            }
        };
        TemplateTargetVisitor.prototype.visitTemplate = function (template) {
            this.visitAll(template.attributes);
            this.visitAll(template.inputs);
            this.visitAll(template.outputs);
            this.visitAll(template.templateAttrs);
            this.visitAll(template.references);
            this.visitAll(template.variables);
            var last = this.path[this.path.length - 1];
            // If we get here and have not found a candidate node on the template itself, proceed with
            // looking for a more specific node on the template children.
            if (last === template) {
                this.visitAll(template.children);
            }
        };
        TemplateTargetVisitor.prototype.visitContent = function (content) {
            t.visitAll(this, content.attributes);
        };
        TemplateTargetVisitor.prototype.visitVariable = function (variable) {
            // Variable has no template nodes or expression nodes.
        };
        TemplateTargetVisitor.prototype.visitReference = function (reference) {
            // Reference has no template nodes or expression nodes.
        };
        TemplateTargetVisitor.prototype.visitTextAttribute = function (attribute) {
            // Text attribute has no template nodes or expression nodes.
        };
        TemplateTargetVisitor.prototype.visitBoundAttribute = function (attribute) {
            var visitor = new ExpressionVisitor(this.position);
            visitor.visit(attribute.value, this.path);
        };
        TemplateTargetVisitor.prototype.visitBoundEvent = function (event) {
            var isTwoWayBinding = this.path.some(function (n) { return n instanceof t.BoundAttribute && event.name === n.name + 'Change'; });
            if (isTwoWayBinding) {
                // For two-way binding aka banana-in-a-box, there are two matches:
                // BoundAttribute and BoundEvent. Both have the same spans. We choose to
                // return BoundAttribute because it matches the identifier name verbatim.
                // TODO: For operations like go to definition, ideally we want to return
                // both.
                this.path.pop(); // remove bound event from the AST path
                return;
            }
            // An event binding with no value (e.g. `(event|)`) parses to a `BoundEvent` with a
            // `LiteralPrimitive` handler with value `'ERROR'`, as opposed to a property binding with no
            // value which has an `EmptyExpr` as its value. This is a synthetic node created by the binding
            // parser, and is not suitable to use for Language Service analysis. Skip it.
            //
            // TODO(alxhub): modify the parser to generate an `EmptyExpr` instead.
            var handler = event.handler;
            if (handler instanceof e.ASTWithSource) {
                handler = handler.ast;
            }
            if (handler instanceof e.LiteralPrimitive && handler.value === 'ERROR') {
                return;
            }
            var visitor = new ExpressionVisitor(this.position);
            visitor.visit(event.handler, this.path);
        };
        TemplateTargetVisitor.prototype.visitText = function (text) {
            // Text has no template nodes or expression nodes.
        };
        TemplateTargetVisitor.prototype.visitBoundText = function (text) {
            var visitor = new ExpressionVisitor(this.position);
            visitor.visit(text.value, this.path);
        };
        TemplateTargetVisitor.prototype.visitIcu = function (icu) {
            var e_1, _a, e_2, _b;
            try {
                for (var _c = tslib_1.__values(Object.values(icu.vars)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var boundText = _d.value;
                    this.visit(boundText);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _e = tslib_1.__values(Object.values(icu.placeholders)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var boundTextOrText = _f.value;
                    this.visit(boundTextOrText);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        TemplateTargetVisitor.prototype.visitAll = function (nodes) {
            var e_3, _a;
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    this.visit(node);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        return TemplateTargetVisitor;
    }());
    var ExpressionVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionVisitor, _super);
        // Position must be absolute in the source file.
        function ExpressionVisitor(position) {
            var _this = _super.call(this) || this;
            _this.position = position;
            return _this;
        }
        ExpressionVisitor.prototype.visit = function (node, path) {
            if (node instanceof e.ASTWithSource) {
                // In order to reduce noise, do not include `ASTWithSource` in the path.
                // For the purpose of source spans, there is no difference between
                // `ASTWithSource` and and underlying node that it wraps.
                node = node.ast;
            }
            // The third condition is to account for the implicit receiver, which should
            // not be visited.
            if (utils_1.isWithin(this.position, node.sourceSpan) && !(node instanceof e.ImplicitReceiver)) {
                path.push(node);
                node.visit(this, path);
            }
        };
        return ExpressionVisitor;
    }(e.RecursiveAstVisitor));
    function getSpanIncludingEndTag(ast) {
        var result = {
            start: ast.sourceSpan.start.offset,
            end: ast.sourceSpan.end.offset,
        };
        // For Element and Template node, sourceSpan.end is the end of the opening
        // tag. For the purpose of language service, we need to actually recognize
        // the end of the closing tag. Otherwise, for situation like
        // <my-component></my-comp¦onent> where the cursor is in the closing tag
        // we will not be able to return any information.
        if ((ast instanceof t.Element || ast instanceof t.Template) && ast.endSourceSpan) {
            result.end = ast.endSourceSpan.end.offset;
        }
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdGVtcGxhdGVfdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Q7SUFDL0QsK0RBQWlFLENBQUUsdUJBQXVCO0lBQzFGLHdEQUEwRCxDQUFTLHFCQUFxQjtJQUV4Riw2REFBa0c7SUF1Q2xHOztPQUVHO0lBQ0gsSUFBWSxjQU9YO0lBUEQsV0FBWSxjQUFjO1FBQ3hCLHFFQUFhLENBQUE7UUFDYix5RUFBZSxDQUFBO1FBQ2YsaUZBQW1CLENBQUE7UUFDbkIsbUZBQW9CLENBQUE7UUFDcEIscUZBQXFCLENBQUE7UUFDckIseUZBQXVCLENBQUE7SUFDekIsQ0FBQyxFQVBXLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBT3pCO0lBOENEOzs7T0FHRztJQUNILElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksb0JBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5Rjs7Ozs7O09BTUc7SUFDSCxTQUFnQixtQkFBbUIsQ0FBQyxRQUFrQixFQUFFLFFBQWdCO1FBQ3RFLElBQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDckUsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEMs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biAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQYXJzZVNwYW4sIFRtcGxBc3RCb3VuZEV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBlIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9leHByZXNzaW9uX3BhcnNlci9hc3QnOyAgLy8gZSBmb3IgZXhwcmVzc2lvbiBBU1RcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JzsgICAgICAgICAvLyB0IGZvciB0ZW1wbGF0ZSBBU1RcblxuaW1wb3J0IHtpc1RlbXBsYXRlTm9kZSwgaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUsIGlzV2l0aGluLCBpc1dpdGhpbktleVZhbHVlfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBDb250ZXh0dWFsIGluZm9ybWF0aW9uIGZvciBhIHRhcmdldCBwb3NpdGlvbiB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlVGFyZ2V0IHtcbiAgLyoqXG4gICAqIFRhcmdldCBwb3NpdGlvbiB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgcG9zaXRpb246IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHRlbXBsYXRlIG5vZGUgKG9yIEFTVCBleHByZXNzaW9uKSBjbG9zZXN0IHRvIHRoZSBzZWFyY2ggcG9zaXRpb24uXG4gICAqL1xuICBub2RlSW5Db250ZXh0OiBUYXJnZXROb2RlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSBmb3VuZCBub2RlIG9yIGV4cHJlc3Npb24gKG9yIGBudWxsYCBpZiBpbiB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSkuXG4gICAqL1xuICB0ZW1wbGF0ZTogdC5UZW1wbGF0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgaW1tZWRpYXRlIHBhcmVudCBub2RlIG9mIHRoZSB0YXJnZXRlZCBub2RlLlxuICAgKi9cbiAgcGFyZW50OiB0Lk5vZGV8ZS5BU1R8bnVsbDtcbn1cblxuLyoqXG4gKiBBIG5vZGUgdGFyZ2V0ZWQgYXQgYSBnaXZlbiBwb3NpdGlvbiBpbiB0aGUgdGVtcGxhdGUsIGluY2x1ZGluZyBwb3RlbnRpYWwgY29udGV4dHVhbCBpbmZvcm1hdGlvblxuICogYWJvdXQgdGhlIHNwZWNpZmljIGFzcGVjdCBvZiB0aGUgbm9kZSBiZWluZyByZWZlcmVuY2VkLlxuICpcbiAqIFNvbWUgbm9kZXMgaGF2ZSBtdWx0aXBsZSBpbnRlcmlvciBjb250ZXh0cy4gRm9yIGV4YW1wbGUsIGB0LkVsZW1lbnRgIG5vZGVzIGhhdmUgYm90aCBhIHRhZyBuYW1lXG4gKiBhcyB3ZWxsIGFzIGEgYm9keSwgYW5kIGEgZ2l2ZW4gcG9zaXRpb24gZGVmaW5pdGl2ZWx5IHBvaW50cyB0byBvbmUgb3IgdGhlIG90aGVyLiBgVGFyZ2V0Tm9kZWBcbiAqIGNhcHR1cmVzIHRoZSBub2RlIGl0c2VsZiwgYXMgd2VsbCBhcyB0aGlzIGFkZGl0aW9uYWwgY29udGV4dHVhbCBkaXNhbWJpZ3VhdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgVGFyZ2V0Tm9kZSA9IFJhd0V4cHJlc3Npb258UmF3VGVtcGxhdGVOb2RlfEVsZW1lbnRJbkJvZHlDb250ZXh0fEVsZW1lbnRJblRhZ0NvbnRleHR8XG4gICAgQXR0cmlidXRlSW5LZXlDb250ZXh0fEF0dHJpYnV0ZUluVmFsdWVDb250ZXh0O1xuXG4vKipcbiAqIERpZmZlcmVudGlhdGVzIHRoZSB2YXJpb3VzIGtpbmRzIG9mIGBUYXJnZXROb2RlYHMuXG4gKi9cbmV4cG9ydCBlbnVtIFRhcmdldE5vZGVLaW5kIHtcbiAgUmF3RXhwcmVzc2lvbixcbiAgUmF3VGVtcGxhdGVOb2RlLFxuICBFbGVtZW50SW5UYWdDb250ZXh0LFxuICBFbGVtZW50SW5Cb2R5Q29udGV4dCxcbiAgQXR0cmlidXRlSW5LZXlDb250ZXh0LFxuICBBdHRyaWJ1dGVJblZhbHVlQ29udGV4dCxcbn1cblxuLyoqXG4gKiBBbiBgZS5BU1RgIGV4cHJlc3Npb24gdGhhdCdzIHRhcmdldGVkIGF0IGEgZ2l2ZW4gcG9zaXRpb24sIHdpdGggbm8gYWRkaXRpb25hbCBjb250ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJhd0V4cHJlc3Npb24ge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5SYXdFeHByZXNzaW9uO1xuICBub2RlOiBlLkFTVDtcbn1cblxuLyoqXG4gKiBBIGB0Lk5vZGVgIHRlbXBsYXRlIG5vZGUgdGhhdCdzIHRhcmdldGVkIGF0IGEgZ2l2ZW4gcG9zaXRpb24sIHdpdGggbm8gYWRkaXRpb25hbCBjb250ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJhd1RlbXBsYXRlTm9kZSB7XG4gIGtpbmQ6IFRhcmdldE5vZGVLaW5kLlJhd1RlbXBsYXRlTm9kZTtcbiAgbm9kZTogdC5Ob2RlO1xufVxuXG4vKipcbiAqIEEgYHQuRWxlbWVudGAgKG9yIGB0LlRlbXBsYXRlYCkgZWxlbWVudCBub2RlIHRoYXQncyB0YXJnZXRlZCwgd2hlcmUgdGhlIGdpdmVuIHBvc2l0aW9uIGlzIHdpdGhpblxuICogdGhlIHRhZyBuYW1lLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRJblRhZ0NvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0O1xuICBub2RlOiB0LkVsZW1lbnR8dC5UZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBBIGB0LkVsZW1lbnRgIChvciBgdC5UZW1wbGF0ZWApIGVsZW1lbnQgbm9kZSB0aGF0J3MgdGFyZ2V0ZWQsIHdoZXJlIHRoZSBnaXZlbiBwb3NpdGlvbiBpcyB3aXRoaW5cbiAqIHRoZSBlbGVtZW50IGJvZHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudEluQm9keUNvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5Cb2R5Q29udGV4dDtcbiAgbm9kZTogdC5FbGVtZW50fHQuVGVtcGxhdGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlSW5LZXlDb250ZXh0IHtcbiAga2luZDogVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5LZXlDb250ZXh0O1xuICBub2RlOiB0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlSW5WYWx1ZUNvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dDtcbiAgbm9kZTogdC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50O1xufVxuXG4vKipcbiAqIFRoaXMgc3BlY2lhbCBtYXJrZXIgaXMgYWRkZWQgdG8gdGhlIHBhdGggd2hlbiB0aGUgY3Vyc29yIGlzIHdpdGhpbiB0aGUgc291cmNlU3BhbiBidXQgbm90IHRoZSBrZXlcbiAqIG9yIHZhbHVlIHNwYW4gb2YgYSBub2RlIHdpdGgga2V5L3ZhbHVlIHNwYW5zLlxuICovXG5jb25zdCBPVVRTSURFX0tfVl9NQVJLRVIgPSBuZXcgZS5BU1QobmV3IFBhcnNlU3BhbigtMSwgLTEpLCBuZXcgZS5BYnNvbHV0ZVNvdXJjZVNwYW4oLTEsIC0xKSk7XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0ZW1wbGF0ZSBBU1Qgbm9kZSBvciBleHByZXNzaW9uIEFTVCBub2RlIHRoYXQgbW9zdCBhY2N1cmF0ZWx5XG4gKiByZXByZXNlbnRzIHRoZSBub2RlIGF0IHRoZSBzcGVjaWZpZWQgY3Vyc29yIGBwb3NpdGlvbmAuXG4gKlxuICogQHBhcmFtIHRlbXBsYXRlIEFTVCB0cmVlIG9mIHRoZSB0ZW1wbGF0ZVxuICogQHBhcmFtIHBvc2l0aW9uIHRhcmdldCBjdXJzb3IgcG9zaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGU6IHQuTm9kZVtdLCBwb3NpdGlvbjogbnVtYmVyKTogVGVtcGxhdGVUYXJnZXR8bnVsbCB7XG4gIGNvbnN0IHBhdGggPSBUZW1wbGF0ZVRhcmdldFZpc2l0b3IudmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgLy8gV2FsayB1cCB0aGUgcmVzdWx0IG5vZGVzIHRvIGZpbmQgdGhlIG5lYXJlc3QgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSB0YXJnZXRlZCBub2RlLlxuICBsZXQgY29udGV4dDogdC5UZW1wbGF0ZXxudWxsID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMjsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBub2RlID0gcGF0aFtpXTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpIHtcbiAgICAgIGNvbnRleHQgPSBub2RlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgbGV0IHBhcmVudDogdC5Ob2RlfGUuQVNUfG51bGwgPSBudWxsO1xuICBpZiAocGF0aC5sZW5ndGggPj0gMikge1xuICAgIHBhcmVudCA9IHBhdGhbcGF0aC5sZW5ndGggLSAyXTtcbiAgfVxuXG4gIC8vIEdpdmVuIHRoZSBjYW5kaWRhdGUgbm9kZSwgZGV0ZXJtaW5lIHRoZSBmdWxsIHRhcmdldGVkIGNvbnRleHQuXG4gIGxldCBub2RlSW5Db250ZXh0OiBUYXJnZXROb2RlO1xuICBpZiAoY2FuZGlkYXRlIGluc3RhbmNlb2YgZS5BU1QpIHtcbiAgICBub2RlSW5Db250ZXh0ID0ge1xuICAgICAga2luZDogVGFyZ2V0Tm9kZUtpbmQuUmF3RXhwcmVzc2lvbixcbiAgICAgIG5vZGU6IGNhbmRpZGF0ZSxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGNhbmRpZGF0ZSBpbnN0YW5jZW9mIHQuRWxlbWVudCkge1xuICAgIC8vIEVsZW1lbnRzIGhhdmUgdHdvIGNvbnRleHRzOiB0aGUgdGFnIGNvbnRleHQgKHBvc2l0aW9uIGlzIHdpdGhpbiB0aGUgZWxlbWVudCB0YWcpIG9yIHRoZVxuICAgIC8vIGVsZW1lbnQgYm9keSBjb250ZXh0IChwb3NpdGlvbiBpcyBvdXRzaWRlIG9mIHRoZSB0YWcgbmFtZSwgYnV0IHN0aWxsIGluIHRoZSBlbGVtZW50KS5cblxuICAgIC8vIENhbGN1bGF0ZSB0aGUgZW5kIG9mIHRoZSBlbGVtZW50IHRhZyBuYW1lLiBBbnkgcG9zaXRpb24gYmV5b25kIHRoaXMgaXMgaW4gdGhlIGVsZW1lbnQgYm9keS5cbiAgICBjb25zdCB0YWdFbmRQb3MgPVxuICAgICAgICBjYW5kaWRhdGUuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyAxIC8qICc8JyBlbGVtZW50IG9wZW4gKi8gKyBjYW5kaWRhdGUubmFtZS5sZW5ndGg7XG4gICAgaWYgKHBvc2l0aW9uID4gdGFnRW5kUG9zKSB7XG4gICAgICAvLyBQb3NpdGlvbiBpcyB3aXRoaW4gdGhlIGVsZW1lbnQgYm9keVxuICAgICAgbm9kZUluQ29udGV4dCA9IHtcbiAgICAgICAga2luZDogVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluQm9keUNvbnRleHQsXG4gICAgICAgIG5vZGU6IGNhbmRpZGF0ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGVJbkNvbnRleHQgPSB7XG4gICAgICAgIGtpbmQ6IFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJblRhZ0NvbnRleHQsXG4gICAgICAgIG5vZGU6IGNhbmRpZGF0ZSxcbiAgICAgIH07XG4gICAgfVxuICB9IGVsc2UgaWYgKFxuICAgICAgKGNhbmRpZGF0ZSBpbnN0YW5jZW9mIHQuQm91bmRBdHRyaWJ1dGUgfHwgY2FuZGlkYXRlIGluc3RhbmNlb2YgdC5Cb3VuZEV2ZW50IHx8XG4gICAgICAgY2FuZGlkYXRlIGluc3RhbmNlb2YgdC5UZXh0QXR0cmlidXRlKSAmJlxuICAgICAgY2FuZGlkYXRlLmtleVNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChpc1dpdGhpbihwb3NpdGlvbiwgY2FuZGlkYXRlLmtleVNwYW4pKSB7XG4gICAgICBub2RlSW5Db250ZXh0ID0ge1xuICAgICAgICBraW5kOiBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJbktleUNvbnRleHQsXG4gICAgICAgIG5vZGU6IGNhbmRpZGF0ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGVJbkNvbnRleHQgPSB7XG4gICAgICAgIGtpbmQ6IFRhcmdldE5vZGVLaW5kLkF0dHJpYnV0ZUluVmFsdWVDb250ZXh0LFxuICAgICAgICBub2RlOiBjYW5kaWRhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBub2RlSW5Db250ZXh0ID0ge1xuICAgICAga2luZDogVGFyZ2V0Tm9kZUtpbmQuUmF3VGVtcGxhdGVOb2RlLFxuICAgICAgbm9kZTogY2FuZGlkYXRlLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge3Bvc2l0aW9uLCBub2RlSW5Db250ZXh0LCB0ZW1wbGF0ZTogY29udGV4dCwgcGFyZW50fTtcbn1cblxuLyoqXG4gKiBWaXNpdG9yIHdoaWNoLCBnaXZlbiBhIHBvc2l0aW9uIGFuZCBhIHRlbXBsYXRlLCBpZGVudGlmaWVzIHRoZSBub2RlIHdpdGhpbiB0aGUgdGVtcGxhdGUgYXQgdGhhdFxuICogcG9zaXRpb24sIGFzIHdlbGwgYXMgcmVjb3JkcyB0aGUgcGF0aCBvZiBpbmNyZWFzaW5nbHkgbmVzdGVkIG5vZGVzIHRoYXQgd2VyZSB0cmF2ZXJzZWQgdG8gcmVhY2hcbiAqIHRoYXQgcG9zaXRpb24uXG4gKi9cbmNsYXNzIFRlbXBsYXRlVGFyZ2V0VmlzaXRvciBpbXBsZW1lbnRzIHQuVmlzaXRvciB7XG4gIC8vIFdlIG5lZWQgdG8ga2VlcCBhIHBhdGggaW5zdGVhZCBvZiB0aGUgbGFzdCBub2RlIGJlY2F1c2Ugd2UgbWlnaHQgbmVlZCBtb3JlXG4gIC8vIGNvbnRleHQgZm9yIHRoZSBsYXN0IG5vZGUsIGZvciBleGFtcGxlIHdoYXQgaXMgdGhlIHBhcmVudCBub2RlP1xuICByZWFkb25seSBwYXRoOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+ID0gW107XG5cbiAgc3RhdGljIHZpc2l0VGVtcGxhdGUodGVtcGxhdGU6IHQuTm9kZVtdLCBwb3NpdGlvbjogbnVtYmVyKTogQXJyYXk8dC5Ob2RlfGUuQVNUPiB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVRhcmdldFZpc2l0b3IocG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXRBbGwodGVtcGxhdGUpO1xuICAgIGNvbnN0IHtwYXRofSA9IHZpc2l0b3I7XG5cbiAgICBjb25zdCBzdHJpY3RQYXRoID0gcGF0aC5maWx0ZXIodiA9PiB2ICE9PSBPVVRTSURFX0tfVl9NQVJLRVIpO1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHN0cmljdFBhdGhbc3RyaWN0UGF0aC5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBtYXRjaGVkQVNvdXJjZVNwYW5CdXROb3RBS3ZTcGFuID0gcGF0aC5zb21lKHYgPT4gdiA9PT0gT1VUU0lERV9LX1ZfTUFSS0VSKTtcbiAgICBpZiAobWF0Y2hlZEFTb3VyY2VTcGFuQnV0Tm90QUt2U3BhbiAmJlxuICAgICAgICAoY2FuZGlkYXRlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSB8fCBjYW5kaWRhdGUgaW5zdGFuY2VvZiB0LkVsZW1lbnQpKSB7XG4gICAgICAvLyBUZW1wbGF0ZSBub2RlcyB3aXRoIGtleSBhbmQgdmFsdWUgc3BhbnMgYXJlIGFsd2F5cyBkZWZpbmVkIG9uIGEgYHQuVGVtcGxhdGVgIG9yXG4gICAgICAvLyBgdC5FbGVtZW50YC4gSWYgd2UgZm91bmQgYSBub2RlIG9uIGEgdGVtcGxhdGUgd2l0aCBhIGBzb3VyY2VTcGFuYCB0aGF0IGluY2x1ZGVzIHRoZSBjdXJzb3IsXG4gICAgICAvLyBpdCBpcyBwb3NzaWJsZSB0aGF0IHdlIGFyZSBvdXRzaWRlIHRoZSBrL3Ygc3BhbnMgKGkuZS4gaW4tYmV0d2VlbiB0aGVtKS4gSWYgdGhpcyBpcyB0aGVcbiAgICAgIC8vIGNhc2UgYW5kIHdlIGRvIG5vdCBoYXZlIGFueSBvdGhlciBjYW5kaWRhdGUgbWF0Y2hlcyBvbiB0aGUgYHQuRWxlbWVudGAgb3IgYHQuVGVtcGxhdGVgLCB3ZVxuICAgICAgLy8gd2FudCB0byByZXR1cm4gbm8gcmVzdWx0cy4gT3RoZXJ3aXNlLCB0aGUgYHQuRWxlbWVudGAvYHQuVGVtcGxhdGVgIHJlc3VsdCBpcyBpbmNvcnJlY3QgZm9yXG4gICAgICAvLyB0aGF0IGN1cnNvciBwb3NpdGlvbi5cbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmljdFBhdGg7XG4gIH1cblxuICAvLyBQb3NpdGlvbiBtdXN0IGJlIGFic29sdXRlIGluIHRoZSBzb3VyY2UgZmlsZS5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIpIHt9XG5cbiAgdmlzaXQobm9kZTogdC5Ob2RlKSB7XG4gICAgY29uc3QgbGFzdDogdC5Ob2RlfGUuQVNUfHVuZGVmaW5lZCA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gICAgaWYgKGxhc3QgJiYgaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUobGFzdCkgJiYgaXNXaXRoaW4odGhpcy5wb3NpdGlvbiwgbGFzdC5rZXlTcGFuKSkge1xuICAgICAgLy8gV2UndmUgYWxyZWFkeSBpZGVudGlmaWVkIHRoYXQgd2UgYXJlIHdpdGhpbiBhIGBrZXlTcGFuYCBvZiBhIG5vZGUuXG4gICAgICAvLyBXZSBzaG91bGQgc3RvcCBwcm9jZXNzaW5nIG5vZGVzIGF0IHRoaXMgcG9pbnQgdG8gcHJldmVudCBtYXRjaGluZ1xuICAgICAgLy8gYW55IG90aGVyIG5vZGVzLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiB0aGUgZW5kIHNwYW4gb2YgYSBkaWZmZXJlbnQgbm9kZVxuICAgICAgLy8gdG91Y2hlcyB0aGUgc3RhcnQgb2YgdGhlIGtleVNwYW4gZm9yIHRoZSBjYW5kaWRhdGUgbm9kZS4gQmVjYXVzZVxuICAgICAgLy8gb3VyIGBpc1dpdGhpbmAgbG9naWMgaXMgaW5jbHVzaXZlIG9uIGJvdGggZW5kcywgd2UgY2FuIG1hdGNoIGJvdGggbm9kZXMuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IGdldFNwYW5JbmNsdWRpbmdFbmRUYWcobm9kZSk7XG4gICAgaWYgKCFpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCB7c3RhcnQsIGVuZH0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKG5vZGUpICYmICFpc1dpdGhpbktleVZhbHVlKHRoaXMucG9zaXRpb24sIG5vZGUpKSB7XG4gICAgICAvLyBJZiBjdXJzb3IgaXMgd2l0aGluIHNvdXJjZSBzcGFuIGJ1dCBub3Qgd2l0aGluIGtleSBzcGFuIG9yIHZhbHVlIHNwYW4sXG4gICAgICAvLyBkbyBub3QgcmV0dXJuIHRoZSBub2RlLlxuICAgICAgdGhpcy5wYXRoLnB1c2goT1VUU0lERV9LX1ZfTUFSS0VSKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXRoLnB1c2gobm9kZSk7XG4gICAgICBub2RlLnZpc2l0KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiB0LkVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50Lm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICBjb25zdCBsYXN0OiB0Lk5vZGV8ZS5BU1R8dW5kZWZpbmVkID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgICAvLyBJZiB3ZSBnZXQgaGVyZSBhbmQgaGF2ZSBub3QgZm91bmQgYSBjYW5kaWRhdGUgbm9kZSBvbiB0aGUgZWxlbWVudCBpdHNlbGYsIHByb2NlZWQgd2l0aFxuICAgIC8vIGxvb2tpbmcgZm9yIGEgbW9yZSBzcGVjaWZpYyBub2RlIG9uIHRoZSBlbGVtZW50IGNoaWxkcmVuLlxuICAgIGlmIChsYXN0ID09PSBlbGVtZW50KSB7XG4gICAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0VGVtcGxhdGUodGVtcGxhdGU6IHQuVGVtcGxhdGUpIHtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudGVtcGxhdGVBdHRycyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnZhcmlhYmxlcyk7XG4gICAgY29uc3QgbGFzdDogdC5Ob2RlfGUuQVNUfHVuZGVmaW5lZCA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUgYW5kIGhhdmUgbm90IGZvdW5kIGEgY2FuZGlkYXRlIG5vZGUgb24gdGhlIHRlbXBsYXRlIGl0c2VsZiwgcHJvY2VlZCB3aXRoXG4gICAgLy8gbG9va2luZyBmb3IgYSBtb3JlIHNwZWNpZmljIG5vZGUgb24gdGhlIHRlbXBsYXRlIGNoaWxkcmVuLlxuICAgIGlmIChsYXN0ID09PSB0ZW1wbGF0ZSkge1xuICAgICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5jaGlsZHJlbik7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRDb250ZW50KGNvbnRlbnQ6IHQuQ29udGVudCkge1xuICAgIHQudmlzaXRBbGwodGhpcywgY29udGVudC5hdHRyaWJ1dGVzKTtcbiAgfVxuXG4gIHZpc2l0VmFyaWFibGUodmFyaWFibGU6IHQuVmFyaWFibGUpIHtcbiAgICAvLyBWYXJpYWJsZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0UmVmZXJlbmNlKHJlZmVyZW5jZTogdC5SZWZlcmVuY2UpIHtcbiAgICAvLyBSZWZlcmVuY2UgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdFRleHRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LlRleHRBdHRyaWJ1dGUpIHtcbiAgICAvLyBUZXh0IGF0dHJpYnV0ZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LkJvdW5kQXR0cmlidXRlKSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGF0dHJpYnV0ZS52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0Qm91bmRFdmVudChldmVudDogdC5Cb3VuZEV2ZW50KSB7XG4gICAgY29uc3QgaXNUd29XYXlCaW5kaW5nID1cbiAgICAgICAgdGhpcy5wYXRoLnNvbWUobiA9PiBuIGluc3RhbmNlb2YgdC5Cb3VuZEF0dHJpYnV0ZSAmJiBldmVudC5uYW1lID09PSBuLm5hbWUgKyAnQ2hhbmdlJyk7XG4gICAgaWYgKGlzVHdvV2F5QmluZGluZykge1xuICAgICAgLy8gRm9yIHR3by13YXkgYmluZGluZyBha2EgYmFuYW5hLWluLWEtYm94LCB0aGVyZSBhcmUgdHdvIG1hdGNoZXM6XG4gICAgICAvLyBCb3VuZEF0dHJpYnV0ZSBhbmQgQm91bmRFdmVudC4gQm90aCBoYXZlIHRoZSBzYW1lIHNwYW5zLiBXZSBjaG9vc2UgdG9cbiAgICAgIC8vIHJldHVybiBCb3VuZEF0dHJpYnV0ZSBiZWNhdXNlIGl0IG1hdGNoZXMgdGhlIGlkZW50aWZpZXIgbmFtZSB2ZXJiYXRpbS5cbiAgICAgIC8vIFRPRE86IEZvciBvcGVyYXRpb25zIGxpa2UgZ28gdG8gZGVmaW5pdGlvbiwgaWRlYWxseSB3ZSB3YW50IHRvIHJldHVyblxuICAgICAgLy8gYm90aC5cbiAgICAgIHRoaXMucGF0aC5wb3AoKTsgIC8vIHJlbW92ZSBib3VuZCBldmVudCBmcm9tIHRoZSBBU1QgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFuIGV2ZW50IGJpbmRpbmcgd2l0aCBubyB2YWx1ZSAoZS5nLiBgKGV2ZW50fClgKSBwYXJzZXMgdG8gYSBgQm91bmRFdmVudGAgd2l0aCBhXG4gICAgLy8gYExpdGVyYWxQcmltaXRpdmVgIGhhbmRsZXIgd2l0aCB2YWx1ZSBgJ0VSUk9SJ2AsIGFzIG9wcG9zZWQgdG8gYSBwcm9wZXJ0eSBiaW5kaW5nIHdpdGggbm9cbiAgICAvLyB2YWx1ZSB3aGljaCBoYXMgYW4gYEVtcHR5RXhwcmAgYXMgaXRzIHZhbHVlLiBUaGlzIGlzIGEgc3ludGhldGljIG5vZGUgY3JlYXRlZCBieSB0aGUgYmluZGluZ1xuICAgIC8vIHBhcnNlciwgYW5kIGlzIG5vdCBzdWl0YWJsZSB0byB1c2UgZm9yIExhbmd1YWdlIFNlcnZpY2UgYW5hbHlzaXMuIFNraXAgaXQuXG4gICAgLy9cbiAgICAvLyBUT0RPKGFseGh1Yik6IG1vZGlmeSB0aGUgcGFyc2VyIHRvIGdlbmVyYXRlIGFuIGBFbXB0eUV4cHJgIGluc3RlYWQuXG4gICAgbGV0IGhhbmRsZXI6IGUuQVNUID0gZXZlbnQuaGFuZGxlcjtcbiAgICBpZiAoaGFuZGxlciBpbnN0YW5jZW9mIGUuQVNUV2l0aFNvdXJjZSkge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXIuYXN0O1xuICAgIH1cbiAgICBpZiAoaGFuZGxlciBpbnN0YW5jZW9mIGUuTGl0ZXJhbFByaW1pdGl2ZSAmJiBoYW5kbGVyLnZhbHVlID09PSAnRVJST1InKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGV2ZW50LmhhbmRsZXIsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdFRleHQodGV4dDogdC5UZXh0KSB7XG4gICAgLy8gVGV4dCBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KHRleHQ6IHQuQm91bmRUZXh0KSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KHRleHQudmFsdWUsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdEljdShpY3U6IHQuSWN1KSB7XG4gICAgZm9yIChjb25zdCBib3VuZFRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UudmFycykpIHtcbiAgICAgIHRoaXMudmlzaXQoYm91bmRUZXh0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBib3VuZFRleHRPclRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UucGxhY2Vob2xkZXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHRPclRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiB0Lk5vZGVbXSkge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgdGhpcy52aXNpdChub2RlKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBlLlJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICAvLyBQb3NpdGlvbiBtdXN0IGJlIGFic29sdXRlIGluIHRoZSBzb3VyY2UgZmlsZS5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0KG5vZGU6IGUuQVNULCBwYXRoOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+KSB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBlLkFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIC8vIEluIG9yZGVyIHRvIHJlZHVjZSBub2lzZSwgZG8gbm90IGluY2x1ZGUgYEFTVFdpdGhTb3VyY2VgIGluIHRoZSBwYXRoLlxuICAgICAgLy8gRm9yIHRoZSBwdXJwb3NlIG9mIHNvdXJjZSBzcGFucywgdGhlcmUgaXMgbm8gZGlmZmVyZW5jZSBiZXR3ZWVuXG4gICAgICAvLyBgQVNUV2l0aFNvdXJjZWAgYW5kIGFuZCB1bmRlcmx5aW5nIG5vZGUgdGhhdCBpdCB3cmFwcy5cbiAgICAgIG5vZGUgPSBub2RlLmFzdDtcbiAgICB9XG4gICAgLy8gVGhlIHRoaXJkIGNvbmRpdGlvbiBpcyB0byBhY2NvdW50IGZvciB0aGUgaW1wbGljaXQgcmVjZWl2ZXIsIHdoaWNoIHNob3VsZFxuICAgIC8vIG5vdCBiZSB2aXNpdGVkLlxuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCBub2RlLnNvdXJjZVNwYW4pICYmICEobm9kZSBpbnN0YW5jZW9mIGUuSW1wbGljaXRSZWNlaXZlcikpIHtcbiAgICAgIHBhdGgucHVzaChub2RlKTtcbiAgICAgIG5vZGUudmlzaXQodGhpcywgcGF0aCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNwYW5JbmNsdWRpbmdFbmRUYWcoYXN0OiB0Lk5vZGUpIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIHN0YXJ0OiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgZW5kOiBhc3Quc291cmNlU3Bhbi5lbmQub2Zmc2V0LFxuICB9O1xuICAvLyBGb3IgRWxlbWVudCBhbmQgVGVtcGxhdGUgbm9kZSwgc291cmNlU3Bhbi5lbmQgaXMgdGhlIGVuZCBvZiB0aGUgb3BlbmluZ1xuICAvLyB0YWcuIEZvciB0aGUgcHVycG9zZSBvZiBsYW5ndWFnZSBzZXJ2aWNlLCB3ZSBuZWVkIHRvIGFjdHVhbGx5IHJlY29nbml6ZVxuICAvLyB0aGUgZW5kIG9mIHRoZSBjbG9zaW5nIHRhZy4gT3RoZXJ3aXNlLCBmb3Igc2l0dWF0aW9uIGxpa2VcbiAgLy8gPG15LWNvbXBvbmVudD48L215LWNvbXDCpm9uZW50PiB3aGVyZSB0aGUgY3Vyc29yIGlzIGluIHRoZSBjbG9zaW5nIHRhZ1xuICAvLyB3ZSB3aWxsIG5vdCBiZSBhYmxlIHRvIHJldHVybiBhbnkgaW5mb3JtYXRpb24uXG4gIGlmICgoYXN0IGluc3RhbmNlb2YgdC5FbGVtZW50IHx8IGFzdCBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpICYmIGFzdC5lbmRTb3VyY2VTcGFuKSB7XG4gICAgcmVzdWx0LmVuZCA9IGFzdC5lbmRTb3VyY2VTcGFuLmVuZC5vZmZzZXQ7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==