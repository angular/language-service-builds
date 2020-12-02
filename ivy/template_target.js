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
        define("@angular/language-service/ivy/template_target", ["require", "exports", "tslib", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTargetAtPosition = void 0;
    var tslib_1 = require("tslib");
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
            if (utils_1.isWithin(this.position, { start: start, end: end })) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdGVtcGxhdGVfdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrREFBaUUsQ0FBRSx1QkFBdUI7SUFDMUYsd0RBQTBELENBQVMscUJBQXFCO0lBRXhGLDZEQUFnRjtJQTRCaEY7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsUUFBa0IsRUFBRSxRQUFnQjtRQUN0RSxJQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JFLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDckIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLElBQUkscUNBQTZCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDckMsSUFBQSxPQUFPLEdBQWUsU0FBUyxRQUF4QixFQUFFLFNBQVMsR0FBSSxTQUFTLFVBQWIsQ0FBYztZQUN2QyxJQUFNLGdCQUFnQixHQUNsQixnQkFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxnQkFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDckIseUVBQXlFO2dCQUN6RSwwQkFBMEI7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELDhGQUE4RjtRQUM5RixJQUFJLE9BQU8sR0FBb0IsSUFBSSxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FB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QUFXO1FBQ3pDLElBQU0sTUFBTSxHQUFHO1lBQ2IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDbEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU07U0FDL0IsQ0FBQztRQUNGLDBFQUEwRTtRQUMxRSwwRUFBMEU7UUFDMUUsNERBQTREO1FBQzVELHdFQUF3RTtRQUN4RSxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRTtZQUNoRixNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztTQUMzQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvZXhwcmVzc2lvbl9wYXJzZXIvYXN0JzsgIC8vIGUgZm9yIGV4cHJlc3Npb24gQVNUXG5pbXBvcnQgKiBhcyB0IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7ICAgICAgICAgLy8gdCBmb3IgdGVtcGxhdGUgQVNUXG5cbmltcG9ydCB7aXNUZW1wbGF0ZU5vZGUsIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlLCBpc1dpdGhpbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQ29udGV4dHVhbCBpbmZvcm1hdGlvbiBmb3IgYSB0YXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVRhcmdldCB7XG4gIC8qKlxuICAgKiBUYXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHBvc2l0aW9uOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSB0ZW1wbGF0ZSBub2RlIChvciBBU1QgZXhwcmVzc2lvbikgY2xvc2VzdCB0byB0aGUgc2VhcmNoIHBvc2l0aW9uLlxuICAgKi9cbiAgbm9kZTogdC5Ob2RlfGUuQVNUO1xuXG4gIC8qKlxuICAgKiBUaGUgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSBmb3VuZCBub2RlIG9yIGV4cHJlc3Npb24gKG9yIGBudWxsYCBpZiBpbiB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSkuXG4gICAqL1xuICBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBpbW1lZGlhdGUgcGFyZW50IG5vZGUgb2YgdGhlIHRhcmdldGVkIG5vZGUuXG4gICAqL1xuICBwYXJlbnQ6IHQuTm9kZXxlLkFTVHxudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdGVtcGxhdGUgQVNUIG5vZGUgb3IgZXhwcmVzc2lvbiBBU1Qgbm9kZSB0aGF0IG1vc3QgYWNjdXJhdGVseVxuICogcmVwcmVzZW50cyB0aGUgbm9kZSBhdCB0aGUgc3BlY2lmaWVkIGN1cnNvciBgcG9zaXRpb25gLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSBBU1QgdHJlZSBvZiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSBwb3NpdGlvbiB0YXJnZXQgY3Vyc29yIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlOiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlVGFyZ2V0fG51bGwge1xuICBjb25zdCBwYXRoID0gVGVtcGxhdGVUYXJnZXRWaXNpdG9yLnZpc2l0VGVtcGxhdGUodGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShjYW5kaWRhdGUpKSB7XG4gICAgY29uc3Qge2tleVNwYW4sIHZhbHVlU3Bhbn0gPSBjYW5kaWRhdGU7XG4gICAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICAgIGlzV2l0aGluKHBvc2l0aW9uLCBrZXlTcGFuKSB8fCAodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgICBpZiAoIWlzV2l0aGluS2V5VmFsdWUpIHtcbiAgICAgIC8vIElmIGN1cnNvciBpcyB3aXRoaW4gc291cmNlIHNwYW4gYnV0IG5vdCB3aXRoaW4ga2V5IHNwYW4gb3IgdmFsdWUgc3BhbixcbiAgICAgIC8vIGRvIG5vdCByZXR1cm4gdGhlIG5vZGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBXYWxrIHVwIHRoZSByZXN1bHQgbm9kZXMgdG8gZmluZCB0aGUgbmVhcmVzdCBgdC5UZW1wbGF0ZWAgd2hpY2ggY29udGFpbnMgdGhlIHRhcmdldGVkIG5vZGUuXG4gIGxldCBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGwgPSBudWxsO1xuICBmb3IgKGxldCBpID0gcGF0aC5sZW5ndGggLSAyOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IG5vZGUgPSBwYXRoW2ldO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkge1xuICAgICAgY29udGV4dCA9IG5vZGU7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBsZXQgcGFyZW50OiB0Lk5vZGV8ZS5BU1R8bnVsbCA9IG51bGw7XG4gIGlmIChwYXRoLmxlbmd0aCA+PSAyKSB7XG4gICAgcGFyZW50ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDJdO1xuICB9XG5cbiAgcmV0dXJuIHtwb3NpdGlvbiwgbm9kZTogY2FuZGlkYXRlLCBjb250ZXh0LCBwYXJlbnR9O1xufVxuXG4vKipcbiAqIFZpc2l0b3Igd2hpY2gsIGdpdmVuIGEgcG9zaXRpb24gYW5kIGEgdGVtcGxhdGUsIGlkZW50aWZpZXMgdGhlIG5vZGUgd2l0aGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGF0XG4gKiBwb3NpdGlvbiwgYXMgd2VsbCBhcyByZWNvcmRzIHRoZSBwYXRoIG9mIGluY3JlYXNpbmdseSBuZXN0ZWQgbm9kZXMgdGhhdCB3ZXJlIHRyYXZlcnNlZCB0byByZWFjaFxuICogdGhhdCBwb3NpdGlvbi5cbiAqL1xuY2xhc3MgVGVtcGxhdGVUYXJnZXRWaXNpdG9yIGltcGxlbWVudHMgdC5WaXNpdG9yIHtcbiAgLy8gV2UgbmVlZCB0byBrZWVwIGEgcGF0aCBpbnN0ZWFkIG9mIHRoZSBsYXN0IG5vZGUgYmVjYXVzZSB3ZSBtaWdodCBuZWVkIG1vcmVcbiAgLy8gY29udGV4dCBmb3IgdGhlIGxhc3Qgbm9kZSwgZm9yIGV4YW1wbGUgd2hhdCBpcyB0aGUgcGFyZW50IG5vZGU/XG4gIHJlYWRvbmx5IHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4gPSBbXTtcblxuICBzdGF0aWMgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5Ob2RlW10sIHBvc2l0aW9uOiBudW1iZXIpOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+IHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVGFyZ2V0VmlzaXRvcihwb3NpdGlvbik7XG4gICAgdmlzaXRvci52aXNpdEFsbCh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHZpc2l0b3IucGF0aDtcbiAgfVxuXG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcG9zaXRpb246IG51bWJlcikge31cblxuICB2aXNpdChub2RlOiB0Lk5vZGUpIHtcbiAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBnZXRTcGFuSW5jbHVkaW5nRW5kVGFnKG5vZGUpO1xuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCB7c3RhcnQsIGVuZH0pKSB7XG4gICAgICBjb25zdCBsZW5ndGggPSBlbmQgLSBzdGFydDtcbiAgICAgIGNvbnN0IGxhc3Q6IHQuTm9kZXxlLkFTVHx1bmRlZmluZWQgPSB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gaXNUZW1wbGF0ZU5vZGUobGFzdCkgPyBnZXRTcGFuSW5jbHVkaW5nRW5kVGFnKGxhc3QpIDogbGFzdC5zb3VyY2VTcGFuO1xuICAgICAgICBjb25zdCBsYXN0TGVuZ3RoID0gZW5kIC0gc3RhcnQ7XG4gICAgICAgIGlmIChsZW5ndGggPiBsYXN0TGVuZ3RoKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgbm9kZSBoYXMgYSBzcGFuIHRoYXQgaXMgbGFyZ2VyIHRoYW4gdGhlIGxhc3Qgbm9kZSBmb3VuZFxuICAgICAgICAgIC8vIHNvIHdlIGRvIG5vdCBkZXNjZW5kIGludG8gaXQuIFRoaXMgdHlwaWNhbGx5IG1lYW5zIHdlIGhhdmUgZm91bmRcbiAgICAgICAgICAvLyBhIGNhbmRpZGF0ZSBpbiBvbmUgb2YgdGhlIHJvb3Qgbm9kZXMgc28gd2UgZG8gbm90IG5lZWQgdG8gdmlzaXRcbiAgICAgICAgICAvLyBvdGhlciByb290IG5vZGVzLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5wYXRoLnB1c2gobm9kZSk7XG4gICAgICBub2RlLnZpc2l0KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiB0LkVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50Lm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuY2hpbGRyZW4pO1xuICB9XG5cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5UZW1wbGF0ZSkge1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5pbnB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUub3V0cHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHZpc2l0Q29udGVudChjb250ZW50OiB0LkNvbnRlbnQpIHtcbiAgICB0LnZpc2l0QWxsKHRoaXMsIGNvbnRlbnQuYXR0cmlidXRlcyk7XG4gIH1cblxuICB2aXNpdFZhcmlhYmxlKHZhcmlhYmxlOiB0LlZhcmlhYmxlKSB7XG4gICAgLy8gVmFyaWFibGUgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdFJlZmVyZW5jZShyZWZlcmVuY2U6IHQuUmVmZXJlbmNlKSB7XG4gICAgLy8gUmVmZXJlbmNlIGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRUZXh0QXR0cmlidXRlKGF0dHJpYnV0ZTogdC5UZXh0QXR0cmlidXRlKSB7XG4gICAgLy8gVGV4dCBhdHRyaWJ1dGUgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdEJvdW5kQXR0cmlidXRlKGF0dHJpYnV0ZTogdC5Cb3VuZEF0dHJpYnV0ZSkge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IodGhpcy5wb3NpdGlvbik7XG4gICAgdmlzaXRvci52aXNpdChhdHRyaWJ1dGUudmFsdWUsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdEJvdW5kRXZlbnQoZXZlbnQ6IHQuQm91bmRFdmVudCkge1xuICAgIGNvbnN0IGlzVHdvV2F5QmluZGluZyA9XG4gICAgICAgIHRoaXMucGF0aC5zb21lKG4gPT4gbiBpbnN0YW5jZW9mIHQuQm91bmRBdHRyaWJ1dGUgJiYgZXZlbnQubmFtZSA9PT0gbi5uYW1lICsgJ0NoYW5nZScpO1xuICAgIGlmIChpc1R3b1dheUJpbmRpbmcpIHtcbiAgICAgIC8vIEZvciB0d28td2F5IGJpbmRpbmcgYWthIGJhbmFuYS1pbi1hLWJveCwgdGhlcmUgYXJlIHR3byBtYXRjaGVzOlxuICAgICAgLy8gQm91bmRBdHRyaWJ1dGUgYW5kIEJvdW5kRXZlbnQuIEJvdGggaGF2ZSB0aGUgc2FtZSBzcGFucy4gV2UgY2hvb3NlIHRvXG4gICAgICAvLyByZXR1cm4gQm91bmRBdHRyaWJ1dGUgYmVjYXVzZSBpdCBtYXRjaGVzIHRoZSBpZGVudGlmaWVyIG5hbWUgdmVyYmF0aW0uXG4gICAgICAvLyBUT0RPOiBGb3Igb3BlcmF0aW9ucyBsaWtlIGdvIHRvIGRlZmluaXRpb24sIGlkZWFsbHkgd2Ugd2FudCB0byByZXR1cm5cbiAgICAgIC8vIGJvdGguXG4gICAgICB0aGlzLnBhdGgucG9wKCk7ICAvLyByZW1vdmUgYm91bmQgZXZlbnQgZnJvbSB0aGUgQVNUIHBhdGhcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGV2ZW50LmhhbmRsZXIsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdFRleHQodGV4dDogdC5UZXh0KSB7XG4gICAgLy8gVGV4dCBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KHRleHQ6IHQuQm91bmRUZXh0KSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KHRleHQudmFsdWUsIHRoaXMucGF0aCk7XG4gIH1cblxuICB2aXNpdEljdShpY3U6IHQuSWN1KSB7XG4gICAgZm9yIChjb25zdCBib3VuZFRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UudmFycykpIHtcbiAgICAgIHRoaXMudmlzaXQoYm91bmRUZXh0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBib3VuZFRleHRPclRleHQgb2YgT2JqZWN0LnZhbHVlcyhpY3UucGxhY2Vob2xkZXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHRPclRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiB0Lk5vZGVbXSkge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgdGhpcy52aXNpdChub2RlKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBlLlJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICAvLyBQb3NpdGlvbiBtdXN0IGJlIGFic29sdXRlIGluIHRoZSBzb3VyY2UgZmlsZS5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0KG5vZGU6IGUuQVNULCBwYXRoOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+KSB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBlLkFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIC8vIEluIG9yZGVyIHRvIHJlZHVjZSBub2lzZSwgZG8gbm90IGluY2x1ZGUgYEFTVFdpdGhTb3VyY2VgIGluIHRoZSBwYXRoLlxuICAgICAgLy8gRm9yIHRoZSBwdXJwb3NlIG9mIHNvdXJjZSBzcGFucywgdGhlcmUgaXMgbm8gZGlmZmVyZW5jZSBiZXR3ZWVuXG4gICAgICAvLyBgQVNUV2l0aFNvdXJjZWAgYW5kIGFuZCB1bmRlcmx5aW5nIG5vZGUgdGhhdCBpdCB3cmFwcy5cbiAgICAgIG5vZGUgPSBub2RlLmFzdDtcbiAgICB9XG4gICAgLy8gVGhlIHRoaXJkIGNvbmRpdGlvbiBpcyB0byBhY2NvdW50IGZvciB0aGUgaW1wbGljaXQgcmVjZWl2ZXIsIHdoaWNoIHNob3VsZFxuICAgIC8vIG5vdCBiZSB2aXNpdGVkLlxuICAgIGlmIChpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCBub2RlLnNvdXJjZVNwYW4pICYmICEobm9kZSBpbnN0YW5jZW9mIGUuSW1wbGljaXRSZWNlaXZlcikpIHtcbiAgICAgIHBhdGgucHVzaChub2RlKTtcbiAgICAgIG5vZGUudmlzaXQodGhpcywgcGF0aCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNwYW5JbmNsdWRpbmdFbmRUYWcoYXN0OiB0Lk5vZGUpIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIHN0YXJ0OiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgZW5kOiBhc3Quc291cmNlU3Bhbi5lbmQub2Zmc2V0LFxuICB9O1xuICAvLyBGb3IgRWxlbWVudCBhbmQgVGVtcGxhdGUgbm9kZSwgc291cmNlU3Bhbi5lbmQgaXMgdGhlIGVuZCBvZiB0aGUgb3BlbmluZ1xuICAvLyB0YWcuIEZvciB0aGUgcHVycG9zZSBvZiBsYW5ndWFnZSBzZXJ2aWNlLCB3ZSBuZWVkIHRvIGFjdHVhbGx5IHJlY29nbml6ZVxuICAvLyB0aGUgZW5kIG9mIHRoZSBjbG9zaW5nIHRhZy4gT3RoZXJ3aXNlLCBmb3Igc2l0dWF0aW9uIGxpa2VcbiAgLy8gPG15LWNvbXBvbmVudD48L215LWNvbXDCpm9uZW50PiB3aGVyZSB0aGUgY3Vyc29yIGlzIGluIHRoZSBjbG9zaW5nIHRhZ1xuICAvLyB3ZSB3aWxsIG5vdCBiZSBhYmxlIHRvIHJldHVybiBhbnkgaW5mb3JtYXRpb24uXG4gIGlmICgoYXN0IGluc3RhbmNlb2YgdC5FbGVtZW50IHx8IGFzdCBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpICYmIGFzdC5lbmRTb3VyY2VTcGFuKSB7XG4gICAgcmVzdWx0LmVuZCA9IGFzdC5lbmRTb3VyY2VTcGFuLmVuZC5vZmZzZXQ7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==