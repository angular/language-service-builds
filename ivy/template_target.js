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
    exports.getTargetAtPosition = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var e = require("@angular/compiler/src/expression_parser/ast"); // e for expression AST
    var t = require("@angular/compiler/src/render3/r3_ast"); // t for template AST
    var utils_1 = require("@angular/language-service/ivy/utils");
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
            var isWithinKeyValue = isWithin(position, keySpan) || (valueSpan && isWithin(position, valueSpan));
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
        return { position: position, node: candidate, context: context, parent: parent };
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
            var _a = getSpanIncludingEndTag(node), start = _a.start, end = _a.end;
            if (isWithin(this.position, { start: start, end: end })) {
                var length_1 = end - start;
                var last = this.path[this.path.length - 1];
                if (last) {
                    var _b = utils_1.isTemplateNode(last) ? getSpanIncludingEndTag(last) : last.sourceSpan, start_1 = _b.start, end_1 = _b.end;
                    var lastLength = end_1 - start_1;
                    if (length_1 > lastLength) {
                        // The current node has a span that is larger than the last node found
                        // so we do not descend into it. This typically means we have found
                        // a candidate in one of the root nodes so we do not need to visit
                        // other root nodes.
                        return;
                    }
                }
                this.path.push(node);
                node.visit(this);
            }
        };
        TemplateTargetVisitor.prototype.visitElement = function (element) {
            this.visitAll(element.attributes);
            this.visitAll(element.inputs);
            this.visitAll(element.outputs);
            this.visitAll(element.references);
            this.visitAll(element.children);
        };
        TemplateTargetVisitor.prototype.visitTemplate = function (template) {
            this.visitAll(template.attributes);
            this.visitAll(template.inputs);
            this.visitAll(template.outputs);
            this.visitAll(template.templateAttrs);
            this.visitAll(template.references);
            this.visitAll(template.variables);
            this.visitAll(template.children);
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
            if (isWithin(this.position, node.sourceSpan) && !(node instanceof e.ImplicitReceiver)) {
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
    function isWithin(position, span) {
        var start, end;
        if (span instanceof compiler_1.ParseSourceSpan) {
            start = span.start.offset;
            end = span.end.offset;
        }
        else {
            start = span.start;
            end = span.end;
        }
        // Note both start and end are inclusive because we want to match conditions
        // like ¦start and end¦ where ¦ is the cursor.
        return start <= position && position <= end;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdGVtcGxhdGVfdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBc0U7SUFDdEUsK0RBQWlFLENBQUUsdUJBQXVCO0lBQzFGLHdEQUEwRCxDQUFTLHFCQUFxQjtJQUV4Riw2REFBc0U7SUE0QnRFOzs7Ozs7T0FNRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFFBQWtCLEVBQUUsUUFBZ0I7UUFDdEUsSUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxJQUFJLHFDQUE2QixDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3JDLElBQUEsT0FBTyxHQUFlLFNBQVMsUUFBeEIsRUFBRSxTQUFTLEdBQUksU0FBUyxVQUFiLENBQWM7WUFDdkMsSUFBTSxnQkFBZ0IsR0FDbEIsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLGdCQUFnQixFQUFFO2dCQUNyQix5RUFBeUU7Z0JBQ3pFLDBCQUEwQjtnQkFDMUIsT0FBTyxJQUFJLENBQUM7YUFDYjtTQUNGO1FBRUQsOEZBQThGO1FBQzlGLElBQUksT0FBTyxHQUFvQixJQUFJLENBQUM7UUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENB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c0IsQ0FBQyxHQUFXO1FBQ3pDLElBQU0sTUFBTSxHQUFHO1lBQ2IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDbEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU07U0FDL0IsQ0FBQztRQUNGLDBFQUEwRTtRQUMxRSwwRUFBMEU7UUFDMUUsNERBQTREO1FBQzVELHdFQUF3RTtRQUN4RSxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRTtZQUNoRixNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztTQUMzQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxTQUFTLFFBQVEsQ0FBQyxRQUFnQixFQUFFLElBQXdDO1FBQzFFLElBQUksS0FBYSxFQUFFLEdBQVcsQ0FBQztRQUMvQixJQUFJLElBQUksWUFBWSwwQkFBZSxFQUFFO1lBQ25DLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUMxQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7U0FDdkI7YUFBTTtZQUNMLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ2hCO1FBQ0QsNEVBQTRFO1FBQzVFLDhDQUE4QztRQUM5QyxPQUFPLEtBQUssSUFBSSxRQUFRLElBQUksUUFBUSxJQUFJLEdBQUcsQ0FBQztJQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBQYXJzZVNvdXJjZVNwYW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIGUgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2V4cHJlc3Npb25fcGFyc2VyL2FzdCc7ICAvLyBlIGZvciBleHByZXNzaW9uIEFTVFxuaW1wb3J0ICogYXMgdCBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnOyAgICAgICAgIC8vIHQgZm9yIHRlbXBsYXRlIEFTVFxuXG5pbXBvcnQge2lzVGVtcGxhdGVOb2RlLCBpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZX0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQ29udGV4dHVhbCBpbmZvcm1hdGlvbiBmb3IgYSB0YXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVRhcmdldCB7XG4gIC8qKlxuICAgKiBUYXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHBvc2l0aW9uOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSB0ZW1wbGF0ZSBub2RlIChvciBBU1QgZXhwcmVzc2lvbikgY2xvc2VzdCB0byB0aGUgc2VhcmNoIHBvc2l0aW9uLlxuICAgKi9cbiAgbm9kZTogdC5Ob2RlfGUuQVNUO1xuXG4gIC8qKlxuICAgKiBUaGUgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSBmb3VuZCBub2RlIG9yIGV4cHJlc3Npb24gKG9yIGBudWxsYCBpZiBpbiB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSkuXG4gICAqL1xuICBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBpbW1lZGlhdGUgcGFyZW50IG5vZGUgb2YgdGhlIHRhcmdldGVkIG5vZGUuXG4gICAqL1xuICBwYXJlbnQ6IHQuTm9kZXxlLkFTVHxudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdGVtcGxhdGUgQVNUIG5vZGUgb3IgZXhwcmVzc2lvbiBBU1Qgbm9kZSB0aGF0IG1vc3QgYWNjdXJhdGVseVxuICogcmVwcmVzZW50cyB0aGUgbm9kZSBhdCB0aGUgc3BlY2lmaWVkIGN1cnNvciBgcG9zaXRpb25gLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSBBU1QgdHJlZSBvZiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSBwb3NpdGlvbiB0YXJnZXQgY3Vyc29yIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlOiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlVGFyZ2V0fG51bGwge1xuICBjb25zdCBwYXRoID0gVGVtcGxhdGVUYXJnZXRWaXNpdG9yLnZpc2l0VGVtcGxhdGUodGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShjYW5kaWRhdGUpKSB7XG4gICAgY29uc3Qge2tleVNwYW4sIHZhbHVlU3Bhbn0gPSBjYW5kaWRhdGU7XG4gICAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICAgIGlzV2l0aGluKHBvc2l0aW9uLCBrZXlTcGFuKSB8fCAodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgICBpZiAoIWlzV2l0aGluS2V5VmFsdWUpIHtcbiAgICAgIC8vIElmIGN1cnNvciBpcyB3aXRoaW4gc291cmNlIHNwYW4gYnV0IG5vdCB3aXRoaW4ga2V5IHNwYW4gb3IgdmFsdWUgc3BhbixcbiAgICAgIC8vIGRvIG5vdCByZXR1cm4gdGhlIG5vZGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBXYWxrIHVwIHRoZSByZXN1bHQgbm9kZXMgdG8gZmluZCB0aGUgbmVhcmVzdCBgdC5UZW1wbGF0ZWAgd2hpY2ggY29udGFpbnMgdGhlIHRhcmdldGVkIG5vZGUuXG4gIGxldCBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGwgPSBudWxsO1xuICBmb3IgKGxldCBpID0gcGF0aC5sZW5ndGggLSAyOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IG5vZGUgPSBwYXRoW2ldO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkge1xuICAgICAgY29udGV4dCA9IG5vZGU7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBsZXQgcGFyZW50OiB0Lk5vZGV8ZS5BU1R8bnVsbCA9IG51bGw7XG4gIGlmIChwYXRoLmxlbmd0aCA+PSAyKSB7XG4gICAgcGFyZW50ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDJdO1xuICB9XG5cbiAgcmV0dXJuIHtwb3NpdGlvbiwgbm9kZTogY2FuZGlkYXRlLCBjb250ZXh0LCBwYXJlbnR9O1xufVxuXG4vKipcbiAqIFZpc2l0b3Igd2hpY2gsIGdpdmVuIGEgcG9zaXRpb24gYW5kIGEgdGVtcGxhdGUsIGlkZW50aWZpZXMgdGhlIG5vZGUgd2l0aGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGF0XG4gKiBwb3NpdGlvbiwgYXMgd2VsbCBhcyByZWNvcmRzIHRoZSBwYXRoIG9mIGluY3JlYXNpbmdseSBuZXN0ZWQgbm9kZXMgdGhhdCB3ZXJlIHRyYXZlcnNlZCB0byByZWFjaFxuICogdGhhdCBwb3NpdGlvbi5cbiAqL1xuY2xhc3MgVGVtcGxhdGVUYXJnZXRWaXNpdG9yIGltcGxlbWVudHMgdC5WaXNpdG9yIHtcbiAgLy8gV2UgbmVlZCB0byBrZWVwIGEgcGF0aCBpbnN0ZWFkIG9mIHRoZSBsYXN0IG5vZGUgYmVjYXVzZSB3ZSBtaWdodCBuZWVkIG1vcmVcbiAgLy8gY29udGV4dCBmb3IgdGhlIGxhc3Qgbm9kZSwgZm9yIGV4YW1wbGUgd2hhdCBpcyB0aGUgcGFyZW50IG5vZGU/XG4gIHJlYWRvbmx5IHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4gPSBbXTtcblxuICBzdGF0aWMgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5Ob2RlW10sIHBvc2l0aW9uOiBudW1iZXIpOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+IHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVGFyZ2V0VmlzaXRvcihwb3NpdGlvbik7XG4gICAgdmlzaXRvci52aXNpdEFsbCh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHZpc2l0b3IucGF0aDtcbiAgfVxuXG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcG9zaXRpb246IG51bWJlcikge31cblxuICB2aXNpdChub2RlOiB0Lk5vZGUpIHtcbiAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBnZXRTcGFuSW5jbHVkaW5nRW5kVGFnKG5vZGUpO1xuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCB7c3RhcnQsIGVuZH0pKSB7XG4gICAgICBjb25zdCBsZW5ndGggPSBlbmQgLSBzdGFydDtcbiAgICAgIGNvbnN0IGxhc3Q6IHQuTm9kZXxlLkFTVHx1bmRlZmluZWQgPSB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gaXNUZW1wbGF0ZU5vZGUobGFzdCkgPyBnZXRTcGFuSW5jbHVkaW5nRW5kVGFnKGxhc3QpIDogbGFzdC5zb3VyY2VTcGFuO1xuICAgICAgICBjb25zdCBsYXN0TGVuZ3RoID0gZW5kIC0gc3RhcnQ7XG4gICAgICAgIGlmIChsZW5ndGggPiBsYXN0TGVuZ3RoKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgbm9kZSBoYXMgYSBzcGFuIHRoYXQgaXMgbGFyZ2VyIHRoYW4gdGhlIGxhc3Qgbm9kZSBmb3VuZFxuICAgICAgICAgIC8vIHNvIHdlIGRvIG5vdCBkZXNjZW5kIGludG8gaXQuIFRoaXMgdHlwaWNhbGx5IG1lYW5zIHdlIGhhdmUgZm91bmRcbiAgICAgICAgICAvLyBhIGNhbmRpZGF0ZSBpbiBvbmUgb2YgdGhlIHJvb3Qgbm9kZXMgc28gd2UgZG8gbm90IG5lZWQgdG8gdmlzaXRcbiAgICAgICAgICAvLyBvdGhlciByb290IG5vZGVzLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5wYXRoLnB1c2gobm9kZSk7XG4gICAgICBub2RlLnZpc2l0KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiB0LkVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50Lm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuY2hpbGRyZW4pO1xuICB9XG5cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5UZW1wbGF0ZSkge1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5pbnB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUub3V0cHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHZpc2l0Q29udGVudChjb250ZW50OiB0LkNvbnRlbnQpIHtcbiAgICB0LnZpc2l0QWxsKHRoaXMsIGNvbnRlbnQuYXR0cmlidXRlcyk7XG4gIH1cblxuICB2aXNpdFZhcmlhYmxlKHZhcmlhYmxlOiB0LlZhcmlhYmxlKSB7XG4gICAgLy8gVmFyaWFibGUgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdFJlZmVyZW5jZShyZWZlcmVuY2U6IHQuUmVmZXJlbmNlKSB7XG4gICAgLy8gUmVmZXJlbmNlIGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRUZXh0QXR0cmlidXRlKGF0dHJpYnV0ZTogdC5UZXh0QXR0cmlidXRlKSB7XG4gICAgLy8gVGV4dCBhdHRyaWJ1dGUgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdEJvdW5kQXR0cmlidXRlKGF0dHJpYnV0ZTogdC5Cb3VuZEF0dHJpYnV0ZSkge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IodGhpcy5wb3NpdGlvbik7XG4gICAgdmlzaXRvci52aXNpdChhdHRyaWJ1dGUudmFsdWUsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdEJvdW5kRXZlbnQoZXZlbnQ6IHQuQm91bmRFdmVudCkge1xuICAgIGNvbnN0IGlzVHdvV2F5QmluZGluZyA9XG4gICAgICAgIHRoaXMucGF0aC5zb21lKG4gPT4gbiBpbnN0YW5jZW9mIHQuQm91bmRBdHRyaWJ1dGUgJiYgZXZlbnQubmFtZSA9PT0gbi5uYW1lICsgJ0NoYW5nZScpO1xuICAgIGlmIChpc1R3b1dheUJpbmRpbmcpIHtcbiAgICAgIC8vIEZvciB0d28td2F5IGJpbmRpbmcgYWthIGJhbmFuYS1pbi1hLWJveCwgdGhlcmUgYXJlIHR3byBtYXRjaGVzOlxuICAgICAgLy8gQm91bmRBdHRyaWJ1dGUgYW5kIEJvdW5kRXZlbnQuIEJvdGggaGF2ZSB0aGUgc2FtZSBzcGFucy4gV2UgY2hvb3NlIHRvXG4gICAgICAvLyByZXR1cm4gQm91bmRBdHRyaWJ1dGUgYmVjYXVzZSBpdCBtYXRjaGVzIHRoZSBpZGVudGlmaWVyIG5hbWUgdmVyYmF0aW0uXG4gICAgICAvLyBUT0RPOiBGb3Igb3BlcmF0aW9ucyBsaWtlIGdvIHRvIGRlZmluaXRpb24sIGlkZWFsbHkgd2Ugd2FudCB0byByZXR1cm5cbiAgICAgIC8vIGJvdGguXG4gICAgICB0aGlzLnBhdGgucG9wKCk7ICAvLyByZW1vdmUgYm91bmQgZXZlbnQgZnJvbSB0aGUgQVNUIHBhdGhcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGV2ZW50LmhhbmRsZXIsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdFRleHQodGV4dDogdC5UZXh0KSB7XG4gICAgLy8gVGV4dCBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KHRleHQ6IHQuQm91bmRUZXh0KSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KHRleHQudmFsdWUsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdEljdShpY3U6IHQuSWN1KSB7XG4gICAgZm9yIChjb25zdCBib3VuZFRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UudmFycykpIHtcbiAgICAgIHRoaXMudmlzaXQoYm91bmRUZXh0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBib3VuZFRleHRPclRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UucGxhY2Vob2xkZXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHRPclRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiB0Lk5vZGVbXSkge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgdGhpcy52aXNpdChub2RlKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBlLlJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICAvLyBQb3NpdGlvbiBtdXN0IGJlIGFic29sdXRlIGluIHRoZSBzb3VyY2UgZmlsZS5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0KG5vZGU6IGUuQVNULCBwYXRoOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+KSB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBlLkFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIC8vIEluIG9yZGVyIHRvIHJlZHVjZSBub2lzZSwgZG8gbm90IGluY2x1ZGUgYEFTVFdpdGhTb3VyY2VgIGluIHRoZSBwYXRoLlxuICAgICAgLy8gRm9yIHRoZSBwdXJwb3NlIG9mIHNvdXJjZSBzcGFucywgdGhlcmUgaXMgbm8gZGlmZmVyZW5jZSBiZXR3ZWVuXG4gICAgICAvLyBgQVNUV2l0aFNvdXJjZWAgYW5kIGFuZCB1bmRlcmx5aW5nIG5vZGUgdGhhdCBpdCB3cmFwcy5cbiAgICAgIG5vZGUgPSBub2RlLmFzdDtcbiAgICB9XG4gICAgLy8gVGhlIHRoaXJkIGNvbmRpdGlvbiBpcyB0byBhY2NvdW50IGZvciB0aGUgaW1wbGljaXQgcmVjZWl2ZXIsIHdoaWNoIHNob3VsZFxuICAgIC8vIG5vdCBiZSB2aXNpdGVkLlxuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCBub2RlLnNvdXJjZVNwYW4pICYmICEobm9kZSBpbnN0YW5jZW9mIGUuSW1wbGljaXRSZWNlaXZlcikpIHtcbiAgICAgIHBhdGgucHVzaChub2RlKTtcbiAgICAgIG5vZGUudmlzaXQodGhpcywgcGF0aCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNwYW5JbmNsdWRpbmdFbmRUYWcoYXN0OiB0Lk5vZGUpIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIHN0YXJ0OiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgZW5kOiBhc3Quc291cmNlU3Bhbi5lbmQub2Zmc2V0LFxuICB9O1xuICAvLyBGb3IgRWxlbWVudCBhbmQgVGVtcGxhdGUgbm9kZSwgc291cmNlU3Bhbi5lbmQgaXMgdGhlIGVuZCBvZiB0aGUgb3BlbmluZ1xuICAvLyB0YWcuIEZvciB0aGUgcHVycG9zZSBvZiBsYW5ndWFnZSBzZXJ2aWNlLCB3ZSBuZWVkIHRvIGFjdHVhbGx5IHJlY29nbml6ZVxuICAvLyB0aGUgZW5kIG9mIHRoZSBjbG9zaW5nIHRhZy4gT3RoZXJ3aXNlLCBmb3Igc2l0dWF0aW9uIGxpa2VcbiAgLy8gPG15LWNvbXBvbmVudD48L215LWNvbXDCpm9uZW50PiB3aGVyZSB0aGUgY3Vyc29yIGlzIGluIHRoZSBjbG9zaW5nIHRhZ1xuICAvLyB3ZSB3aWxsIG5vdCBiZSBhYmxlIHRvIHJldHVybiBhbnkgaW5mb3JtYXRpb24uXG4gIGlmICgoYXN0IGluc3RhbmNlb2YgdC5FbGVtZW50IHx8IGFzdCBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpICYmIGFzdC5lbmRTb3VyY2VTcGFuKSB7XG4gICAgcmVzdWx0LmVuZCA9IGFzdC5lbmRTb3VyY2VTcGFuLmVuZC5vZmZzZXQ7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNXaXRoaW4ocG9zaXRpb246IG51bWJlciwgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IGJvb2xlYW4ge1xuICBsZXQgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXI7XG4gIGlmIChzcGFuIGluc3RhbmNlb2YgUGFyc2VTb3VyY2VTcGFuKSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBlbmQgPSBzcGFuLmVuZC5vZmZzZXQ7XG4gIH0gZWxzZSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0O1xuICAgIGVuZCA9IHNwYW4uZW5kO1xuICB9XG4gIC8vIE5vdGUgYm90aCBzdGFydCBhbmQgZW5kIGFyZSBpbmNsdXNpdmUgYmVjYXVzZSB3ZSB3YW50IHRvIG1hdGNoIGNvbmRpdGlvbnNcbiAgLy8gbGlrZSDCpnN0YXJ0IGFuZCBlbmTCpiB3aGVyZSDCpiBpcyB0aGUgY3Vyc29yLlxuICByZXR1cm4gc3RhcnQgPD0gcG9zaXRpb24gJiYgcG9zaXRpb24gPD0gZW5kO1xufVxuIl19