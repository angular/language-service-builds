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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvdGVtcGxhdGVfdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrREFBaUUsQ0FBRSx1QkFBdUI7SUFDMUYsd0RBQTBELENBQVMscUJBQXFCO0lBRXhGLDZEQUFnRjtJQTRCaEY7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsUUFBa0IsRUFBRSxRQUFnQjtRQUN0RSxJQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JFLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDckIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLElBQUkscUNBQTZCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDckMsSUFBQSxPQUFPLEdBQWUsU0FBUyxRQUF4QixFQUFFLFNBQVMsR0FBSSxTQUFTLFVBQWIsQ0FBYztZQUN2QyxJQUFNLGdCQUFnQixHQUNsQixnQkFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxnQkFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDckIseUVBQXlFO2dCQUN6RSwwQkFBMEI7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7U0FDRjtRQUVELDhGQUE4RjtRQUM5RixJQUFJLE9BQU8sR0FBb0IsSUFBSSxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsSUFBSSxJQUFJLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFBRTtnQkFDOUIsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDZixNQUFNO2FBQ1A7U0FDRjtRQUVELElBQUksTUFBTSxHQUFzQixJQUFJLENBQUM7UUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNwQixNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDaEM7UUFFRCxPQUFPLEVBQUMsUUFBUSxVQUFBLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLFNBQUEsRUFBRSxNQUFNLFFBQUEsRUFBQyxDQUFDO0lBQ3RELENBQUM7SUFsQ0Qsa0RBa0NDO0lBRUQ7Ozs7T0FJRztJQUNIO1FBV0UsZ0RBQWdEO1FBQ2hELCtCQUFxQyxRQUFnQjtZQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1lBWHJELDZFQUE2RTtZQUM3RSxrRUFBa0U7WUFDekQsU0FBSSxHQUF3QixFQUFFLENBQUM7UUFTZ0IsQ0FBQztRQVBsRCxtQ0FBYSxHQUFwQixVQUFxQixRQUFrQixFQUFFLFFBQWdCO1lBQ3ZELElBQU0sT0FBTyxHQUFHLElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUtELHFDQUFLLEdBQUwsVUFBTSxJQUFZO1lBQ2hCLElBQU0sSUFBSSxHQUEyQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLElBQUksSUFBSSxJQUFJLHFDQUE2QixDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3hGLHFFQUFxRTtnQkFDckUsb0VBQW9FO2dCQUNwRSx5RUFBeUU7Z0JBQ3pFLG1FQUFtRTtnQkFDbkUsMkVBQTJFO2dCQUMzRSxPQUFPO2FBQ1I7WUFDSyxJQUFBLEtBQWUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQTFDLEtBQUssV0FBQSxFQUFFLEdBQUcsU0FBZ0MsQ0FBQztZQUNsRCxJQUFJLGdCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLEtBQUssT0FBQSxFQUFFLEdBQUcsS0FBQSxFQUFDLENBQUMsRUFBRTtnQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBRUQsNENBQVksR0FBWixVQUFhLE9BQWtCO1lBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLElBQU0sSUFBSSxHQUEyQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLHlGQUF5RjtZQUN6Riw0REFBNEQ7WUFDNUQsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFO2dCQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNqQztRQUNILENBQUM7UUFFRCw2Q0FBYSxHQUFiLFVBQWMsUUFBb0I7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEMsSUFBTSxJQUFJLEdBQTJCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckUsMEZBQTBGO1lBQzFGLDZEQUE2RDtZQUM3RCxJQUFJLElBQUksS0FBSyxRQUFRLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ2xDO1FBQ0gsQ0FBQztRQUVELDRDQUFZLEdBQVosVUFBYSxPQUFrQjtZQUM3QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELDZDQUFhLEdBQWIsVUFBYyxRQUFvQjtZQUNoQyxzREFBc0Q7UUFDeEQsQ0FBQztRQUVELDhDQUFjLEdBQWQsVUFBZSxTQUFzQjtZQUNuQyx1REFBdUQ7UUFDekQsQ0FBQztRQUVELGtEQUFrQixHQUFsQixVQUFtQixTQUEwQjtZQUMzQyw0REFBNEQ7UUFDOUQsQ0FBQztRQUVELG1EQUFtQixHQUFuQixVQUFvQixTQUEyQjtZQUM3QyxJQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyRCxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRCwrQ0FBZSxHQUFmLFVBQWdCLEtBQW1CO1lBQ2pDLElBQU0sZUFBZSxHQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsWUFBWSxDQUFDLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxRQUFRLEVBQWpFLENBQWlFLENBQUMsQ0FBQztZQUMzRixJQUFJLGVBQWUsRUFBRTtnQkFDbkIsa0VBQWtFO2dCQUNsRSx3RUFBd0U7Z0JBQ3hFLHlFQUF5RTtnQkFDekUsd0VBQXdFO2dCQUN4RSxRQUFRO2dCQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBRSx1Q0FBdUM7Z0JBQ3pELE9BQU87YUFDUjtZQUNELElBQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELHlDQUFTLEdBQVQsVUFBVSxJQUFZO1lBQ3BCLGtEQUFrRDtRQUNwRCxDQUFDO1FBRUQsOENBQWMsR0FBZCxVQUFlLElBQWlCO1lBQzlCLElBQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELHdDQUFRLEdBQVIsVUFBUyxHQUFVOzs7Z0JBQ2pCLEtBQXdCLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBNUMsSUFBTSxTQUFTLFdBQUE7b0JBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ3ZCOzs7Ozs7Ozs7O2dCQUNELEtBQThCLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUQsSUFBTSxlQUFlLFdBQUE7b0JBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQzdCOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsd0NBQVEsR0FBUixVQUFTLEtBQWU7OztnQkFDdEIsS0FBbUIsSUFBQSxVQUFBLGlCQUFBLEtBQUssQ0FBQSw0QkFBQSwrQ0FBRTtvQkFBckIsSUFBTSxJQUFJLGtCQUFBO29CQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2xCOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBdkhELElBdUhDO0lBRUQ7UUFBZ0MsNkNBQXFCO1FBQ25ELGdEQUFnRDtRQUNoRCwyQkFBNkIsUUFBZ0I7WUFBN0MsWUFDRSxpQkFBTyxTQUNSO1lBRjRCLGNBQVEsR0FBUixRQUFRLENBQVE7O1FBRTdDLENBQUM7UUFFRCxpQ0FBSyxHQUFMLFVBQU0sSUFBVyxFQUFFLElBQXlCO1lBQzFDLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ25DLHdFQUF3RTtnQkFDeEUsa0VBQWtFO2dCQUNsRSx5REFBeUQ7Z0JBQ3pELElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO2FBQ2pCO1lBQ0QsNEVBQTRFO1lBQzVFLGtCQUFrQjtZQUNsQixJQUFJLGdCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDckYsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDeEI7UUFDSCxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBcEJELENBQWdDLENBQUMsQ0FBQyxtQkFBbUIsR0FvQnBEO0lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxHQUFXO1FBQ3pDLElBQU0sTUFBTSxHQUFHO1lBQ2IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDbEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU07U0FDL0IsQ0FBQztRQUNGLDBFQUEwRTtRQUMxRSwwRUFBMEU7UUFDMUUsNERBQTREO1FBQzVELHdFQUF3RTtRQUN4RSxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRTtZQUNoRixNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztTQUMzQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvZXhwcmVzc2lvbl9wYXJzZXIvYXN0JzsgIC8vIGUgZm9yIGV4cHJlc3Npb24gQVNUXG5pbXBvcnQgKiBhcyB0IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7ICAgICAgICAgLy8gdCBmb3IgdGVtcGxhdGUgQVNUXG5cbmltcG9ydCB7aXNUZW1wbGF0ZU5vZGUsIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlLCBpc1dpdGhpbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQ29udGV4dHVhbCBpbmZvcm1hdGlvbiBmb3IgYSB0YXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVRhcmdldCB7XG4gIC8qKlxuICAgKiBUYXJnZXQgcG9zaXRpb24gd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHBvc2l0aW9uOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSB0ZW1wbGF0ZSBub2RlIChvciBBU1QgZXhwcmVzc2lvbikgY2xvc2VzdCB0byB0aGUgc2VhcmNoIHBvc2l0aW9uLlxuICAgKi9cbiAgbm9kZTogdC5Ob2RlfGUuQVNUO1xuXG4gIC8qKlxuICAgKiBUaGUgYHQuVGVtcGxhdGVgIHdoaWNoIGNvbnRhaW5zIHRoZSBmb3VuZCBub2RlIG9yIGV4cHJlc3Npb24gKG9yIGBudWxsYCBpZiBpbiB0aGUgcm9vdFxuICAgKiB0ZW1wbGF0ZSkuXG4gICAqL1xuICBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBpbW1lZGlhdGUgcGFyZW50IG5vZGUgb2YgdGhlIHRhcmdldGVkIG5vZGUuXG4gICAqL1xuICBwYXJlbnQ6IHQuTm9kZXxlLkFTVHxudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdGVtcGxhdGUgQVNUIG5vZGUgb3IgZXhwcmVzc2lvbiBBU1Qgbm9kZSB0aGF0IG1vc3QgYWNjdXJhdGVseVxuICogcmVwcmVzZW50cyB0aGUgbm9kZSBhdCB0aGUgc3BlY2lmaWVkIGN1cnNvciBgcG9zaXRpb25gLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSBBU1QgdHJlZSBvZiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSBwb3NpdGlvbiB0YXJnZXQgY3Vyc29yIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlOiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlVGFyZ2V0fG51bGwge1xuICBjb25zdCBwYXRoID0gVGVtcGxhdGVUYXJnZXRWaXNpdG9yLnZpc2l0VGVtcGxhdGUodGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShjYW5kaWRhdGUpKSB7XG4gICAgY29uc3Qge2tleVNwYW4sIHZhbHVlU3Bhbn0gPSBjYW5kaWRhdGU7XG4gICAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICAgIGlzV2l0aGluKHBvc2l0aW9uLCBrZXlTcGFuKSB8fCAodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgICBpZiAoIWlzV2l0aGluS2V5VmFsdWUpIHtcbiAgICAgIC8vIElmIGN1cnNvciBpcyB3aXRoaW4gc291cmNlIHNwYW4gYnV0IG5vdCB3aXRoaW4ga2V5IHNwYW4gb3IgdmFsdWUgc3BhbixcbiAgICAgIC8vIGRvIG5vdCByZXR1cm4gdGhlIG5vZGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBXYWxrIHVwIHRoZSByZXN1bHQgbm9kZXMgdG8gZmluZCB0aGUgbmVhcmVzdCBgdC5UZW1wbGF0ZWAgd2hpY2ggY29udGFpbnMgdGhlIHRhcmdldGVkIG5vZGUuXG4gIGxldCBjb250ZXh0OiB0LlRlbXBsYXRlfG51bGwgPSBudWxsO1xuICBmb3IgKGxldCBpID0gcGF0aC5sZW5ndGggLSAyOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IG5vZGUgPSBwYXRoW2ldO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkge1xuICAgICAgY29udGV4dCA9IG5vZGU7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBsZXQgcGFyZW50OiB0Lk5vZGV8ZS5BU1R8bnVsbCA9IG51bGw7XG4gIGlmIChwYXRoLmxlbmd0aCA+PSAyKSB7XG4gICAgcGFyZW50ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDJdO1xuICB9XG5cbiAgcmV0dXJuIHtwb3NpdGlvbiwgbm9kZTogY2FuZGlkYXRlLCBjb250ZXh0LCBwYXJlbnR9O1xufVxuXG4vKipcbiAqIFZpc2l0b3Igd2hpY2gsIGdpdmVuIGEgcG9zaXRpb24gYW5kIGEgdGVtcGxhdGUsIGlkZW50aWZpZXMgdGhlIG5vZGUgd2l0aGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGF0XG4gKiBwb3NpdGlvbiwgYXMgd2VsbCBhcyByZWNvcmRzIHRoZSBwYXRoIG9mIGluY3JlYXNpbmdseSBuZXN0ZWQgbm9kZXMgdGhhdCB3ZXJlIHRyYXZlcnNlZCB0byByZWFjaFxuICogdGhhdCBwb3NpdGlvbi5cbiAqL1xuY2xhc3MgVGVtcGxhdGVUYXJnZXRWaXNpdG9yIGltcGxlbWVudHMgdC5WaXNpdG9yIHtcbiAgLy8gV2UgbmVlZCB0byBrZWVwIGEgcGF0aCBpbnN0ZWFkIG9mIHRoZSBsYXN0IG5vZGUgYmVjYXVzZSB3ZSBtaWdodCBuZWVkIG1vcmVcbiAgLy8gY29udGV4dCBmb3IgdGhlIGxhc3Qgbm9kZSwgZm9yIGV4YW1wbGUgd2hhdCBpcyB0aGUgcGFyZW50IG5vZGU/XG4gIHJlYWRvbmx5IHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4gPSBbXTtcblxuICBzdGF0aWMgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogdC5Ob2RlW10sIHBvc2l0aW9uOiBudW1iZXIpOiBBcnJheTx0Lk5vZGV8ZS5BU1Q+IHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVGFyZ2V0VmlzaXRvcihwb3NpdGlvbik7XG4gICAgdmlzaXRvci52aXNpdEFsbCh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHZpc2l0b3IucGF0aDtcbiAgfVxuXG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcG9zaXRpb246IG51bWJlcikge31cblxuICB2aXNpdChub2RlOiB0Lk5vZGUpIHtcbiAgICBjb25zdCBsYXN0OiB0Lk5vZGV8ZS5BU1R8dW5kZWZpbmVkID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdCAmJiBpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShsYXN0KSAmJiBpc1dpdGhpbih0aGlzLnBvc2l0aW9uLCBsYXN0LmtleVNwYW4pKSB7XG4gICAgICAvLyBXZSd2ZSBhbHJlYWR5IGlkZW50aWZpZWQgdGhhdCB3ZSBhcmUgd2l0aGluIGEgYGtleVNwYW5gIG9mIGEgbm9kZS5cbiAgICAgIC8vIFdlIHNob3VsZCBzdG9wIHByb2Nlc3Npbmcgbm9kZXMgYXQgdGhpcyBwb2ludCB0byBwcmV2ZW50IG1hdGNoaW5nXG4gICAgICAvLyBhbnkgb3RoZXIgbm9kZXMuIFRoaXMgY2FuIGhhcHBlbiB3aGVuIHRoZSBlbmQgc3BhbiBvZiBhIGRpZmZlcmVudCBub2RlXG4gICAgICAvLyB0b3VjaGVzIHRoZSBzdGFydCBvZiB0aGUga2V5U3BhbiBmb3IgdGhlIGNhbmRpZGF0ZSBub2RlLiBCZWNhdXNlXG4gICAgICAvLyBvdXIgYGlzV2l0aGluYCBsb2dpYyBpcyBpbmNsdXNpdmUgb24gYm90aCBlbmRzLCB3ZSBjYW4gbWF0Y2ggYm90aCBub2Rlcy5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gZ2V0U3BhbkluY2x1ZGluZ0VuZFRhZyhub2RlKTtcbiAgICBpZiAoaXNXaXRoaW4odGhpcy5wb3NpdGlvbiwge3N0YXJ0LCBlbmR9KSkge1xuICAgICAgdGhpcy5wYXRoLnB1c2gobm9kZSk7XG4gICAgICBub2RlLnZpc2l0KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiB0LkVsZW1lbnQpIHtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50Lm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICBjb25zdCBsYXN0OiB0Lk5vZGV8ZS5BU1R8dW5kZWZpbmVkID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgICAvLyBJZiB3ZSBnZXQgaGVyZSBhbmQgaGF2ZSBub3QgZm91bmQgYSBjYW5kaWRhdGUgbm9kZSBvbiB0aGUgZWxlbWVudCBpdHNlbGYsIHByb2NlZWQgd2l0aFxuICAgIC8vIGxvb2tpbmcgZm9yIGEgbW9yZSBzcGVjaWZpYyBub2RlIG9uIHRoZSBlbGVtZW50IGNoaWxkcmVuLlxuICAgIGlmIChsYXN0ID09PSBlbGVtZW50KSB7XG4gICAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0VGVtcGxhdGUodGVtcGxhdGU6IHQuVGVtcGxhdGUpIHtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLm91dHB1dHMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudGVtcGxhdGVBdHRycyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnZhcmlhYmxlcyk7XG4gICAgY29uc3QgbGFzdDogdC5Ob2RlfGUuQVNUfHVuZGVmaW5lZCA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUgYW5kIGhhdmUgbm90IGZvdW5kIGEgY2FuZGlkYXRlIG5vZGUgb24gdGhlIHRlbXBsYXRlIGl0c2VsZiwgcHJvY2VlZCB3aXRoXG4gICAgLy8gbG9va2luZyBmb3IgYSBtb3JlIHNwZWNpZmljIG5vZGUgb24gdGhlIHRlbXBsYXRlIGNoaWxkcmVuLlxuICAgIGlmIChsYXN0ID09PSB0ZW1wbGF0ZSkge1xuICAgICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5jaGlsZHJlbik7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRDb250ZW50KGNvbnRlbnQ6IHQuQ29udGVudCkge1xuICAgIHQudmlzaXRBbGwodGhpcywgY29udGVudC5hdHRyaWJ1dGVzKTtcbiAgfVxuXG4gIHZpc2l0VmFyaWFibGUodmFyaWFibGU6IHQuVmFyaWFibGUpIHtcbiAgICAvLyBWYXJpYWJsZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0UmVmZXJlbmNlKHJlZmVyZW5jZTogdC5SZWZlcmVuY2UpIHtcbiAgICAvLyBSZWZlcmVuY2UgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdFRleHRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LlRleHRBdHRyaWJ1dGUpIHtcbiAgICAvLyBUZXh0IGF0dHJpYnV0ZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LkJvdW5kQXR0cmlidXRlKSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGF0dHJpYnV0ZS52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0Qm91bmRFdmVudChldmVudDogdC5Cb3VuZEV2ZW50KSB7XG4gICAgY29uc3QgaXNUd29XYXlCaW5kaW5nID1cbiAgICAgICAgdGhpcy5wYXRoLnNvbWUobiA9PiBuIGluc3RhbmNlb2YgdC5Cb3VuZEF0dHJpYnV0ZSAmJiBldmVudC5uYW1lID09PSBuLm5hbWUgKyAnQ2hhbmdlJyk7XG4gICAgaWYgKGlzVHdvV2F5QmluZGluZykge1xuICAgICAgLy8gRm9yIHR3by13YXkgYmluZGluZyBha2EgYmFuYW5hLWluLWEtYm94LCB0aGVyZSBhcmUgdHdvIG1hdGNoZXM6XG4gICAgICAvLyBCb3VuZEF0dHJpYnV0ZSBhbmQgQm91bmRFdmVudC4gQm90aCBoYXZlIHRoZSBzYW1lIHNwYW5zLiBXZSBjaG9vc2UgdG9cbiAgICAgIC8vIHJldHVybiBCb3VuZEF0dHJpYnV0ZSBiZWNhdXNlIGl0IG1hdGNoZXMgdGhlIGlkZW50aWZpZXIgbmFtZSB2ZXJiYXRpbS5cbiAgICAgIC8vIFRPRE86IEZvciBvcGVyYXRpb25zIGxpa2UgZ28gdG8gZGVmaW5pdGlvbiwgaWRlYWxseSB3ZSB3YW50IHRvIHJldHVyblxuICAgICAgLy8gYm90aC5cbiAgICAgIHRoaXMucGF0aC5wb3AoKTsgIC8vIHJlbW92ZSBib3VuZCBldmVudCBmcm9tIHRoZSBBU1QgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQoZXZlbnQuaGFuZGxlciwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0VGV4dCh0ZXh0OiB0LlRleHQpIHtcbiAgICAvLyBUZXh0IGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQodGV4dDogdC5Cb3VuZFRleHQpIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQodGV4dC52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0SWN1KGljdTogdC5JY3UpIHtcbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS52YXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dE9yVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS5wbGFjZWhvbGRlcnMpKSB7XG4gICAgICB0aGlzLnZpc2l0KGJvdW5kVGV4dE9yVGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRBbGwobm9kZXM6IHQuTm9kZVtdKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICB0aGlzLnZpc2l0KG5vZGUpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIGUuUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXQobm9kZTogZS5BU1QsIHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4pIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIGUuQVNUV2l0aFNvdXJjZSkge1xuICAgICAgLy8gSW4gb3JkZXIgdG8gcmVkdWNlIG5vaXNlLCBkbyBub3QgaW5jbHVkZSBgQVNUV2l0aFNvdXJjZWAgaW4gdGhlIHBhdGguXG4gICAgICAvLyBGb3IgdGhlIHB1cnBvc2Ugb2Ygc291cmNlIHNwYW5zLCB0aGVyZSBpcyBubyBkaWZmZXJlbmNlIGJldHdlZW5cbiAgICAgIC8vIGBBU1RXaXRoU291cmNlYCBhbmQgYW5kIHVuZGVybHlpbmcgbm9kZSB0aGF0IGl0IHdyYXBzLlxuICAgICAgbm9kZSA9IG5vZGUuYXN0O1xuICAgIH1cbiAgICAvLyBUaGUgdGhpcmQgY29uZGl0aW9uIGlzIHRvIGFjY291bnQgZm9yIHRoZSBpbXBsaWNpdCByZWNlaXZlciwgd2hpY2ggc2hvdWxkXG4gICAgLy8gbm90IGJlIHZpc2l0ZWQuXG4gICAgaWYgKGlzV2l0aGluKHRoaXMucG9zaXRpb24sIG5vZGUuc291cmNlU3BhbikgJiYgIShub2RlIGluc3RhbmNlb2YgZS5JbXBsaWNpdFJlY2VpdmVyKSkge1xuICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgbm9kZS52aXNpdCh0aGlzLCBwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3BhbkluY2x1ZGluZ0VuZFRhZyhhc3Q6IHQuTm9kZSkge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgc3RhcnQ6IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICBlbmQ6IGFzdC5zb3VyY2VTcGFuLmVuZC5vZmZzZXQsXG4gIH07XG4gIC8vIEZvciBFbGVtZW50IGFuZCBUZW1wbGF0ZSBub2RlLCBzb3VyY2VTcGFuLmVuZCBpcyB0aGUgZW5kIG9mIHRoZSBvcGVuaW5nXG4gIC8vIHRhZy4gRm9yIHRoZSBwdXJwb3NlIG9mIGxhbmd1YWdlIHNlcnZpY2UsIHdlIG5lZWQgdG8gYWN0dWFsbHkgcmVjb2duaXplXG4gIC8vIHRoZSBlbmQgb2YgdGhlIGNsb3NpbmcgdGFnLiBPdGhlcndpc2UsIGZvciBzaXR1YXRpb24gbGlrZVxuICAvLyA8bXktY29tcG9uZW50PjwvbXktY29tcMKmb25lbnQ+IHdoZXJlIHRoZSBjdXJzb3IgaXMgaW4gdGhlIGNsb3NpbmcgdGFnXG4gIC8vIHdlIHdpbGwgbm90IGJlIGFibGUgdG8gcmV0dXJuIGFueSBpbmZvcm1hdGlvbi5cbiAgaWYgKChhc3QgaW5zdGFuY2VvZiB0LkVsZW1lbnQgfHwgYXN0IGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkgJiYgYXN0LmVuZFNvdXJjZVNwYW4pIHtcbiAgICByZXN1bHQuZW5kID0gYXN0LmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19