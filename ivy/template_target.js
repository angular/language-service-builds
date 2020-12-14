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
        if (utils_1.isTemplateNodeWithKeyAndValue(candidate)) {
            var keySpan = candidate.keySpan, valueSpan = candidate.valueSpan;
            if (valueSpan === undefined && candidate instanceof compiler_1.TmplAstBoundEvent) {
                valueSpan = candidate.handlerSpan;
            }
            var isWithinKeyValue = utils_1.isWithin(position, keySpan) || (valueSpan && utils_1.isWithin(position, valueSpan));
            if (!isWithinKeyValue) {
                // If cursor is within source span but not within key span or value span,
                // do not return the node.
                return null;
            }
        }
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
            return visitor.path;
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
            if (utils_1.isWithin(this.position, { start: start, end: end })) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdGVtcGxhdGVfdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb0Q7SUFDcEQsK0RBQWlFLENBQUUsdUJBQXVCO0lBQzFGLHdEQUEwRCxDQUFTLHFCQUFxQjtJQUV4Riw2REFBZ0Y7SUF1Q2hGOztPQUVHO0lBQ0gsSUFBWSxjQU9YO0lBUEQsV0FBWSxjQUFjO1FBQ3hCLHFFQUFhLENBQUE7UUFDYix5RUFBZSxDQUFBO1FBQ2YsaUZBQW1CLENBQUE7UUFDbkIsbUZBQW9CLENBQUE7UUFDcEIscUZBQXFCLENBQUE7UUFDckIseUZBQXVCLENBQUE7SUFDekIsQ0FBQyxFQVBXLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBT3pCO0lBOENEOzs7Ozs7T0FNRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFFBQWtCLEVBQUUsUUFBZ0I7UUFDdEUsSUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxJQUFJLHFDQUE2QixDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3ZDLElBQUEsT0FBTyxHQUFlLFNBQVMsUUFBeEIsRUFBRSxTQUFTLEdBQUksU0FBUyxVQUFiLENBQWM7WUFDckMsSUFBSSxTQUFTLEtBQUssU0FBUyxJQUFJLFNBQVMsWUFBWSw0QkFBaUIsRUFBRTtnQkFDckUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFX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QUFNLEdBQUc7WUFDYixLQUFLLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUNsQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTTtTQUMvQixDQUFDO1FBQ0YsMEVBQTBFO1FBQzFFLDBFQUEwRTtRQUMxRSw0REFBNEQ7UUFDNUQsd0VBQXdFO1FBQ3hFLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQyxPQUFPLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFO1lBQ2hGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO1NBQzNDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1RtcGxBc3RCb3VuZEV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBlIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9leHByZXNzaW9uX3BhcnNlci9hc3QnOyAgLy8gZSBmb3IgZXhwcmVzc2lvbiBBU1RcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JzsgICAgICAgICAvLyB0IGZvciB0ZW1wbGF0ZSBBU1RcblxuaW1wb3J0IHtpc1RlbXBsYXRlTm9kZSwgaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUsIGlzV2l0aGlufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBDb250ZXh0dWFsIGluZm9ybWF0aW9uIGZvciBhIHRhcmdldCBwb3NpdGlvbiB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlVGFyZ2V0IHtcbiAgLyoqXG4gICAqIFRhcmdldCBwb3NpdGlvbiB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgcG9zaXRpb246IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHRlbXBsYXRlIG5vZGUgKG9yIEFTVCBleHByZXNzaW9uKSBjbG9zZXN0IHRvIHRoZSBzZWFyY2ggcG9zaXRpb24uXG4gICAqL1xuICBub2RlSW5Db250ZXh0OiBUYXJnZXROb2RlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSBmb3VuZCBub2RlIG9yIGV4cHJlc3Npb24gKG9yIGBudWxsYCBpZiBpbiB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSkuXG4gICAqL1xuICB0ZW1wbGF0ZTogdC5UZW1wbGF0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgaW1tZWRpYXRlIHBhcmVudCBub2RlIG9mIHRoZSB0YXJnZXRlZCBub2RlLlxuICAgKi9cbiAgcGFyZW50OiB0Lk5vZGV8ZS5BU1R8bnVsbDtcbn1cblxuLyoqXG4gKiBBIG5vZGUgdGFyZ2V0ZWQgYXQgYSBnaXZlbiBwb3NpdGlvbiBpbiB0aGUgdGVtcGxhdGUsIGluY2x1ZGluZyBwb3RlbnRpYWwgY29udGV4dHVhbCBpbmZvcm1hdGlvblxuICogYWJvdXQgdGhlIHNwZWNpZmljIGFzcGVjdCBvZiB0aGUgbm9kZSBiZWluZyByZWZlcmVuY2VkLlxuICpcbiAqIFNvbWUgbm9kZXMgaGF2ZSBtdWx0aXBsZSBpbnRlcmlvciBjb250ZXh0cy4gRm9yIGV4YW1wbGUsIGB0LkVsZW1lbnRgIG5vZGVzIGhhdmUgYm90aCBhIHRhZyBuYW1lXG4gKiBhcyB3ZWxsIGFzIGEgYm9keSwgYW5kIGEgZ2l2ZW4gcG9zaXRpb24gZGVmaW5pdGl2ZWx5IHBvaW50cyB0byBvbmUgb3IgdGhlIG90aGVyLiBgVGFyZ2V0Tm9kZWBcbiAqIGNhcHR1cmVzIHRoZSBub2RlIGl0c2VsZiwgYXMgd2VsbCBhcyB0aGlzIGFkZGl0aW9uYWwgY29udGV4dHVhbCBkaXNhbWJpZ3VhdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgVGFyZ2V0Tm9kZSA9IFJhd0V4cHJlc3Npb258UmF3VGVtcGxhdGVOb2RlfEVsZW1lbnRJbkJvZHlDb250ZXh0fEVsZW1lbnRJblRhZ0NvbnRleHR8XG4gICAgQXR0cmlidXRlSW5LZXlDb250ZXh0fEF0dHJpYnV0ZUluVmFsdWVDb250ZXh0O1xuXG4vKipcbiAqIERpZmZlcmVudGlhdGVzIHRoZSB2YXJpb3VzIGtpbmRzIG9mIGBUYXJnZXROb2RlYHMuXG4gKi9cbmV4cG9ydCBlbnVtIFRhcmdldE5vZGVLaW5kIHtcbiAgUmF3RXhwcmVzc2lvbixcbiAgUmF3VGVtcGxhdGVOb2RlLFxuICBFbGVtZW50SW5UYWdDb250ZXh0LFxuICBFbGVtZW50SW5Cb2R5Q29udGV4dCxcbiAgQXR0cmlidXRlSW5LZXlDb250ZXh0LFxuICBBdHRyaWJ1dGVJblZhbHVlQ29udGV4dCxcbn1cblxuLyoqXG4gKiBBbiBgZS5BU1RgIGV4cHJlc3Npb24gdGhhdCdzIHRhcmdldGVkIGF0IGEgZ2l2ZW4gcG9zaXRpb24sIHdpdGggbm8gYWRkaXRpb25hbCBjb250ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJhd0V4cHJlc3Npb24ge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5SYXdFeHByZXNzaW9uO1xuICBub2RlOiBlLkFTVDtcbn1cblxuLyoqXG4gKiBBIGB0Lk5vZGVgIHRlbXBsYXRlIG5vZGUgdGhhdCdzIHRhcmdldGVkIGF0IGEgZ2l2ZW4gcG9zaXRpb24sIHdpdGggbm8gYWRkaXRpb25hbCBjb250ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJhd1RlbXBsYXRlTm9kZSB7XG4gIGtpbmQ6IFRhcmdldE5vZGVLaW5kLlJhd1RlbXBsYXRlTm9kZTtcbiAgbm9kZTogdC5Ob2RlO1xufVxuXG4vKipcbiAqIEEgYHQuRWxlbWVudGAgKG9yIGB0LlRlbXBsYXRlYCkgZWxlbWVudCBub2RlIHRoYXQncyB0YXJnZXRlZCwgd2hlcmUgdGhlIGdpdmVuIHBvc2l0aW9uIGlzIHdpdGhpblxuICogdGhlIHRhZyBuYW1lLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRJblRhZ0NvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0O1xuICBub2RlOiB0LkVsZW1lbnR8dC5UZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBBIGB0LkVsZW1lbnRgIChvciBgdC5UZW1wbGF0ZWApIGVsZW1lbnQgbm9kZSB0aGF0J3MgdGFyZ2V0ZWQsIHdoZXJlIHRoZSBnaXZlbiBwb3NpdGlvbiBpcyB3aXRoaW5cbiAqIHRoZSBlbGVtZW50IGJvZHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudEluQm9keUNvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5Cb2R5Q29udGV4dDtcbiAgbm9kZTogdC5FbGVtZW50fHQuVGVtcGxhdGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlSW5LZXlDb250ZXh0IHtcbiAga2luZDogVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5LZXlDb250ZXh0O1xuICBub2RlOiB0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlSW5WYWx1ZUNvbnRleHQge1xuICBraW5kOiBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dDtcbiAgbm9kZTogdC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50O1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdGVtcGxhdGUgQVNUIG5vZGUgb3IgZXhwcmVzc2lvbiBBU1Qgbm9kZSB0aGF0IG1vc3QgYWNjdXJhdGVseVxuICogcmVwcmVzZW50cyB0aGUgbm9kZSBhdCB0aGUgc3BlY2lmaWVkIGN1cnNvciBgcG9zaXRpb25gLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSBBU1QgdHJlZSBvZiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSBwb3NpdGlvbiB0YXJnZXQgY3Vyc29yIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlOiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlVGFyZ2V0fG51bGwge1xuICBjb25zdCBwYXRoID0gVGVtcGxhdGVUYXJnZXRWaXNpdG9yLnZpc2l0VGVtcGxhdGUodGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShjYW5kaWRhdGUpKSB7XG4gICAgbGV0IHtrZXlTcGFuLCB2YWx1ZVNwYW59ID0gY2FuZGlkYXRlO1xuICAgIGlmICh2YWx1ZVNwYW4gPT09IHVuZGVmaW5lZCAmJiBjYW5kaWRhdGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgdmFsdWVTcGFuID0gY2FuZGlkYXRlLmhhbmRsZXJTcGFuO1xuICAgIH1cbiAgICBjb25zdCBpc1dpdGhpbktleVZhbHVlID1cbiAgICAgICAgaXNXaXRoaW4ocG9zaXRpb24sIGtleVNwYW4pIHx8ICh2YWx1ZVNwYW4gJiYgaXNXaXRoaW4ocG9zaXRpb24sIHZhbHVlU3BhbikpO1xuICAgIGlmICghaXNXaXRoaW5LZXlWYWx1ZSkge1xuICAgICAgLy8gSWYgY3Vyc29yIGlzIHdpdGhpbiBzb3VyY2Ugc3BhbiBidXQgbm90IHdpdGhpbiBrZXkgc3BhbiBvciB2YWx1ZSBzcGFuLFxuICAgICAgLy8gZG8gbm90IHJldHVybiB0aGUgbm9kZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFdhbGsgdXAgdGhlIHJlc3VsdCBub2RlcyB0byBmaW5kIHRoZSBuZWFyZXN0IGB0LlRlbXBsYXRlYCB3aGljaCBjb250YWlucyB0aGUgdGFyZ2V0ZWQgbm9kZS5cbiAgbGV0IGNvbnRleHQ6IHQuVGVtcGxhdGV8bnVsbCA9IG51bGw7XG4gIGZvciAobGV0IGkgPSBwYXRoLmxlbmd0aCAtIDI7IGkgPj0gMDsgaS0tKSB7XG4gICAgY29uc3Qgbm9kZSA9IHBhdGhbaV07XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiB0LlRlbXBsYXRlKSB7XG4gICAgICBjb250ZXh0ID0gbm9kZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGxldCBwYXJlbnQ6IHQuTm9kZXxlLkFTVHxudWxsID0gbnVsbDtcbiAgaWYgKHBhdGgubGVuZ3RoID49IDIpIHtcbiAgICBwYXJlbnQgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMl07XG4gIH1cblxuICAvLyBHaXZlbiB0aGUgY2FuZGlkYXRlIG5vZGUsIGRldGVybWluZSB0aGUgZnVsbCB0YXJnZXRlZCBjb250ZXh0LlxuICBsZXQgbm9kZUluQ29udGV4dDogVGFyZ2V0Tm9kZTtcbiAgaWYgKGNhbmRpZGF0ZSBpbnN0YW5jZW9mIGUuQVNUKSB7XG4gICAgbm9kZUluQ29udGV4dCA9IHtcbiAgICAgIGtpbmQ6IFRhcmdldE5vZGVLaW5kLlJhd0V4cHJlc3Npb24sXG4gICAgICBub2RlOiBjYW5kaWRhdGUsXG4gICAgfTtcbiAgfSBlbHNlIGlmIChjYW5kaWRhdGUgaW5zdGFuY2VvZiB0LkVsZW1lbnQpIHtcbiAgICAvLyBFbGVtZW50cyBoYXZlIHR3byBjb250ZXh0czogdGhlIHRhZyBjb250ZXh0IChwb3NpdGlvbiBpcyB3aXRoaW4gdGhlIGVsZW1lbnQgdGFnKSBvciB0aGVcbiAgICAvLyBlbGVtZW50IGJvZHkgY29udGV4dCAocG9zaXRpb24gaXMgb3V0c2lkZSBvZiB0aGUgdGFnIG5hbWUsIGJ1dCBzdGlsbCBpbiB0aGUgZWxlbWVudCkuXG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGVuZCBvZiB0aGUgZWxlbWVudCB0YWcgbmFtZS4gQW55IHBvc2l0aW9uIGJleW9uZCB0aGlzIGlzIGluIHRoZSBlbGVtZW50IGJvZHkuXG4gICAgY29uc3QgdGFnRW5kUG9zID1cbiAgICAgICAgY2FuZGlkYXRlLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgMSAvKiAnPCcgZWxlbWVudCBvcGVuICovICsgY2FuZGlkYXRlLm5hbWUubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+IHRhZ0VuZFBvcykge1xuICAgICAgLy8gUG9zaXRpb24gaXMgd2l0aGluIHRoZSBlbGVtZW50IGJvZHlcbiAgICAgIG5vZGVJbkNvbnRleHQgPSB7XG4gICAgICAgIGtpbmQ6IFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJbkJvZHlDb250ZXh0LFxuICAgICAgICBub2RlOiBjYW5kaWRhdGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlSW5Db250ZXh0ID0ge1xuICAgICAgICBraW5kOiBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0LFxuICAgICAgICBub2RlOiBjYW5kaWRhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfSBlbHNlIGlmIChcbiAgICAgIChjYW5kaWRhdGUgaW5zdGFuY2VvZiB0LkJvdW5kQXR0cmlidXRlIHx8IGNhbmRpZGF0ZSBpbnN0YW5jZW9mIHQuQm91bmRFdmVudCB8fFxuICAgICAgIGNhbmRpZGF0ZSBpbnN0YW5jZW9mIHQuVGV4dEF0dHJpYnV0ZSkgJiZcbiAgICAgIGNhbmRpZGF0ZS5rZXlTcGFuICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXNXaXRoaW4ocG9zaXRpb24sIGNhbmRpZGF0ZS5rZXlTcGFuKSkge1xuICAgICAgbm9kZUluQ29udGV4dCA9IHtcbiAgICAgICAga2luZDogVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5LZXlDb250ZXh0LFxuICAgICAgICBub2RlOiBjYW5kaWRhdGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlSW5Db250ZXh0ID0ge1xuICAgICAgICBraW5kOiBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dCxcbiAgICAgICAgbm9kZTogY2FuZGlkYXRlLFxuICAgICAgfTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbm9kZUluQ29udGV4dCA9IHtcbiAgICAgIGtpbmQ6IFRhcmdldE5vZGVLaW5kLlJhd1RlbXBsYXRlTm9kZSxcbiAgICAgIG5vZGU6IGNhbmRpZGF0ZSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtwb3NpdGlvbiwgbm9kZUluQ29udGV4dCwgdGVtcGxhdGU6IGNvbnRleHQsIHBhcmVudH07XG59XG5cbi8qKlxuICogVmlzaXRvciB3aGljaCwgZ2l2ZW4gYSBwb3NpdGlvbiBhbmQgYSB0ZW1wbGF0ZSwgaWRlbnRpZmllcyB0aGUgbm9kZSB3aXRoaW4gdGhlIHRlbXBsYXRlIGF0IHRoYXRcbiAqIHBvc2l0aW9uLCBhcyB3ZWxsIGFzIHJlY29yZHMgdGhlIHBhdGggb2YgaW5jcmVhc2luZ2x5IG5lc3RlZCBub2RlcyB0aGF0IHdlcmUgdHJhdmVyc2VkIHRvIHJlYWNoXG4gKiB0aGF0IHBvc2l0aW9uLlxuICovXG5jbGFzcyBUZW1wbGF0ZVRhcmdldFZpc2l0b3IgaW1wbGVtZW50cyB0LlZpc2l0b3Ige1xuICAvLyBXZSBuZWVkIHRvIGtlZXAgYSBwYXRoIGluc3RlYWQgb2YgdGhlIGxhc3Qgbm9kZSBiZWNhdXNlIHdlIG1pZ2h0IG5lZWQgbW9yZVxuICAvLyBjb250ZXh0IGZvciB0aGUgbGFzdCBub2RlLCBmb3IgZXhhbXBsZSB3aGF0IGlzIHRoZSBwYXJlbnQgbm9kZT9cbiAgcmVhZG9ubHkgcGF0aDogQXJyYXk8dC5Ob2RlfGUuQVNUPiA9IFtdO1xuXG4gIHN0YXRpYyB2aXNpdFRlbXBsYXRlKHRlbXBsYXRlOiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IEFycmF5PHQuTm9kZXxlLkFTVD4ge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgVGVtcGxhdGVUYXJnZXRWaXNpdG9yKHBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0QWxsKHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdmlzaXRvci5wYXRoO1xuICB9XG5cbiAgLy8gUG9zaXRpb24gbXVzdCBiZSBhYnNvbHV0ZSBpbiB0aGUgc291cmNlIGZpbGUuXG4gIHByaXZhdGUgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHQuTm9kZSkge1xuICAgIGNvbnN0IGxhc3Q6IHQuTm9kZXxlLkFTVHx1bmRlZmluZWQgPSB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0ICYmIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKGxhc3QpICYmIGlzV2l0aGluKHRoaXMucG9zaXRpb24sIGxhc3Qua2V5U3BhbikpIHtcbiAgICAgIC8vIFdlJ3ZlIGFscmVhZHkgaWRlbnRpZmllZCB0aGF0IHdlIGFyZSB3aXRoaW4gYSBga2V5U3BhbmAgb2YgYSBub2RlLlxuICAgICAgLy8gV2Ugc2hvdWxkIHN0b3AgcHJvY2Vzc2luZyBub2RlcyBhdCB0aGlzIHBvaW50IHRvIHByZXZlbnQgbWF0Y2hpbmdcbiAgICAgIC8vIGFueSBvdGhlciBub2Rlcy4gVGhpcyBjYW4gaGFwcGVuIHdoZW4gdGhlIGVuZCBzcGFuIG9mIGEgZGlmZmVyZW50IG5vZGVcbiAgICAgIC8vIHRvdWNoZXMgdGhlIHN0YXJ0IG9mIHRoZSBrZXlTcGFuIGZvciB0aGUgY2FuZGlkYXRlIG5vZGUuIEJlY2F1c2VcbiAgICAgIC8vIG91ciBgaXNXaXRoaW5gIGxvZ2ljIGlzIGluY2x1c2l2ZSBvbiBib3RoIGVuZHMsIHdlIGNhbiBtYXRjaCBib3RoIG5vZGVzLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBnZXRTcGFuSW5jbHVkaW5nRW5kVGFnKG5vZGUpO1xuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCB7c3RhcnQsIGVuZH0pKSB7XG4gICAgICB0aGlzLnBhdGgucHVzaChub2RlKTtcbiAgICAgIG5vZGUudmlzaXQodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IHQuRWxlbWVudCkge1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQub3V0cHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LnJlZmVyZW5jZXMpO1xuICAgIGNvbnN0IGxhc3Q6IHQuTm9kZXxlLkFTVHx1bmRlZmluZWQgPSB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aCAtIDFdO1xuICAgIC8vIElmIHdlIGdldCBoZXJlIGFuZCBoYXZlIG5vdCBmb3VuZCBhIGNhbmRpZGF0ZSBub2RlIG9uIHRoZSBlbGVtZW50IGl0c2VsZiwgcHJvY2VlZCB3aXRoXG4gICAgLy8gbG9va2luZyBmb3IgYSBtb3JlIHNwZWNpZmljIG5vZGUgb24gdGhlIGVsZW1lbnQgY2hpbGRyZW4uXG4gICAgaWYgKGxhc3QgPT09IGVsZW1lbnQpIHtcbiAgICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5jaGlsZHJlbik7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5UZW1wbGF0ZSkge1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5pbnB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUub3V0cHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgICBjb25zdCBsYXN0OiB0Lk5vZGV8ZS5BU1R8dW5kZWZpbmVkID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgICAvLyBJZiB3ZSBnZXQgaGVyZSBhbmQgaGF2ZSBub3QgZm91bmQgYSBjYW5kaWRhdGUgbm9kZSBvbiB0aGUgdGVtcGxhdGUgaXRzZWxmLCBwcm9jZWVkIHdpdGhcbiAgICAvLyBsb29raW5nIGZvciBhIG1vcmUgc3BlY2lmaWMgbm9kZSBvbiB0aGUgdGVtcGxhdGUgY2hpbGRyZW4uXG4gICAgaWYgKGxhc3QgPT09IHRlbXBsYXRlKSB7XG4gICAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbnRlbnQoY29udGVudDogdC5Db250ZW50KSB7XG4gICAgdC52aXNpdEFsbCh0aGlzLCBjb250ZW50LmF0dHJpYnV0ZXMpO1xuICB9XG5cbiAgdmlzaXRWYXJpYWJsZSh2YXJpYWJsZTogdC5WYXJpYWJsZSkge1xuICAgIC8vIFZhcmlhYmxlIGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRSZWZlcmVuY2UocmVmZXJlbmNlOiB0LlJlZmVyZW5jZSkge1xuICAgIC8vIFJlZmVyZW5jZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0VGV4dEF0dHJpYnV0ZShhdHRyaWJ1dGU6IHQuVGV4dEF0dHJpYnV0ZSkge1xuICAgIC8vIFRleHQgYXR0cmlidXRlIGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRCb3VuZEF0dHJpYnV0ZShhdHRyaWJ1dGU6IHQuQm91bmRBdHRyaWJ1dGUpIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQoYXR0cmlidXRlLnZhbHVlLCB0aGlzLnBhdGgpO1xuICB9XG5cbiAgdmlzaXRCb3VuZEV2ZW50KGV2ZW50OiB0LkJvdW5kRXZlbnQpIHtcbiAgICBjb25zdCBpc1R3b1dheUJpbmRpbmcgPVxuICAgICAgICB0aGlzLnBhdGguc29tZShuID0+IG4gaW5zdGFuY2VvZiB0LkJvdW5kQXR0cmlidXRlICYmIGV2ZW50Lm5hbWUgPT09IG4ubmFtZSArICdDaGFuZ2UnKTtcbiAgICBpZiAoaXNUd29XYXlCaW5kaW5nKSB7XG4gICAgICAvLyBGb3IgdHdvLXdheSBiaW5kaW5nIGFrYSBiYW5hbmEtaW4tYS1ib3gsIHRoZXJlIGFyZSB0d28gbWF0Y2hlczpcbiAgICAgIC8vIEJvdW5kQXR0cmlidXRlIGFuZCBCb3VuZEV2ZW50LiBCb3RoIGhhdmUgdGhlIHNhbWUgc3BhbnMuIFdlIGNob29zZSB0b1xuICAgICAgLy8gcmV0dXJuIEJvdW5kQXR0cmlidXRlIGJlY2F1c2UgaXQgbWF0Y2hlcyB0aGUgaWRlbnRpZmllciBuYW1lIHZlcmJhdGltLlxuICAgICAgLy8gVE9ETzogRm9yIG9wZXJhdGlvbnMgbGlrZSBnbyB0byBkZWZpbml0aW9uLCBpZGVhbGx5IHdlIHdhbnQgdG8gcmV0dXJuXG4gICAgICAvLyBib3RoLlxuICAgICAgdGhpcy5wYXRoLnBvcCgpOyAgLy8gcmVtb3ZlIGJvdW5kIGV2ZW50IGZyb20gdGhlIEFTVCBwYXRoXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQW4gZXZlbnQgYmluZGluZyB3aXRoIG5vIHZhbHVlIChlLmcuIGAoZXZlbnR8KWApIHBhcnNlcyB0byBhIGBCb3VuZEV2ZW50YCB3aXRoIGFcbiAgICAvLyBgTGl0ZXJhbFByaW1pdGl2ZWAgaGFuZGxlciB3aXRoIHZhbHVlIGAnRVJST1InYCwgYXMgb3Bwb3NlZCB0byBhIHByb3BlcnR5IGJpbmRpbmcgd2l0aCBub1xuICAgIC8vIHZhbHVlIHdoaWNoIGhhcyBhbiBgRW1wdHlFeHByYCBhcyBpdHMgdmFsdWUuIFRoaXMgaXMgYSBzeW50aGV0aWMgbm9kZSBjcmVhdGVkIGJ5IHRoZSBiaW5kaW5nXG4gICAgLy8gcGFyc2VyLCBhbmQgaXMgbm90IHN1aXRhYmxlIHRvIHVzZSBmb3IgTGFuZ3VhZ2UgU2VydmljZSBhbmFseXNpcy4gU2tpcCBpdC5cbiAgICAvL1xuICAgIC8vIFRPRE8oYWx4aHViKTogbW9kaWZ5IHRoZSBwYXJzZXIgdG8gZ2VuZXJhdGUgYW4gYEVtcHR5RXhwcmAgaW5zdGVhZC5cbiAgICBsZXQgaGFuZGxlcjogZS5BU1QgPSBldmVudC5oYW5kbGVyO1xuICAgIGlmIChoYW5kbGVyIGluc3RhbmNlb2YgZS5BU1RXaXRoU291cmNlKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlci5hc3Q7XG4gICAgfVxuICAgIGlmIChoYW5kbGVyIGluc3RhbmNlb2YgZS5MaXRlcmFsUHJpbWl0aXZlICYmIGhhbmRsZXIudmFsdWUgPT09ICdFUlJPUicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQoZXZlbnQuaGFuZGxlciwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0VGV4dCh0ZXh0OiB0LlRleHQpIHtcbiAgICAvLyBUZXh0IGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQodGV4dDogdC5Cb3VuZFRleHQpIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQodGV4dC52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0SWN1KGljdTogdC5JY3UpIHtcbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS52YXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dE9yVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS5wbGFjZWhvbGRlcnMpKSB7XG4gICAgICB0aGlzLnZpc2l0KGJvdW5kVGV4dE9yVGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRBbGwobm9kZXM6IHQuTm9kZVtdKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICB0aGlzLnZpc2l0KG5vZGUpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIGUuUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXQobm9kZTogZS5BU1QsIHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4pIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIGUuQVNUV2l0aFNvdXJjZSkge1xuICAgICAgLy8gSW4gb3JkZXIgdG8gcmVkdWNlIG5vaXNlLCBkbyBub3QgaW5jbHVkZSBgQVNUV2l0aFNvdXJjZWAgaW4gdGhlIHBhdGguXG4gICAgICAvLyBGb3IgdGhlIHB1cnBvc2Ugb2Ygc291cmNlIHNwYW5zLCB0aGVyZSBpcyBubyBkaWZmZXJlbmNlIGJldHdlZW5cbiAgICAgIC8vIGBBU1RXaXRoU291cmNlYCBhbmQgYW5kIHVuZGVybHlpbmcgbm9kZSB0aGF0IGl0IHdyYXBzLlxuICAgICAgbm9kZSA9IG5vZGUuYXN0O1xuICAgIH1cbiAgICAvLyBUaGUgdGhpcmQgY29uZGl0aW9uIGlzIHRvIGFjY291bnQgZm9yIHRoZSBpbXBsaWNpdCByZWNlaXZlciwgd2hpY2ggc2hvdWxkXG4gICAgLy8gbm90IGJlIHZpc2l0ZWQuXG4gICAgaWYgKGlzV2l0aGluKHRoaXMucG9zaXRpb24sIG5vZGUuc291cmNlU3BhbikgJiYgIShub2RlIGluc3RhbmNlb2YgZS5JbXBsaWNpdFJlY2VpdmVyKSkge1xuICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgbm9kZS52aXNpdCh0aGlzLCBwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3BhbkluY2x1ZGluZ0VuZFRhZyhhc3Q6IHQuTm9kZSkge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgc3RhcnQ6IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICBlbmQ6IGFzdC5zb3VyY2VTcGFuLmVuZC5vZmZzZXQsXG4gIH07XG4gIC8vIEZvciBFbGVtZW50IGFuZCBUZW1wbGF0ZSBub2RlLCBzb3VyY2VTcGFuLmVuZCBpcyB0aGUgZW5kIG9mIHRoZSBvcGVuaW5nXG4gIC8vIHRhZy4gRm9yIHRoZSBwdXJwb3NlIG9mIGxhbmd1YWdlIHNlcnZpY2UsIHdlIG5lZWQgdG8gYWN0dWFsbHkgcmVjb2duaXplXG4gIC8vIHRoZSBlbmQgb2YgdGhlIGNsb3NpbmcgdGFnLiBPdGhlcndpc2UsIGZvciBzaXR1YXRpb24gbGlrZVxuICAvLyA8bXktY29tcG9uZW50PjwvbXktY29tcMKmb25lbnQ+IHdoZXJlIHRoZSBjdXJzb3IgaXMgaW4gdGhlIGNsb3NpbmcgdGFnXG4gIC8vIHdlIHdpbGwgbm90IGJlIGFibGUgdG8gcmV0dXJuIGFueSBpbmZvcm1hdGlvbi5cbiAgaWYgKChhc3QgaW5zdGFuY2VvZiB0LkVsZW1lbnQgfHwgYXN0IGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkgJiYgYXN0LmVuZFNvdXJjZVNwYW4pIHtcbiAgICByZXN1bHQuZW5kID0gYXN0LmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19