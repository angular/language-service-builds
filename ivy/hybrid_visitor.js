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
        define("@angular/language-service/ivy/hybrid_visitor", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findNodeAtPosition = exports.getPathToNodeAtPosition = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var e = require("@angular/compiler/src/expression_parser/ast"); // e for expression AST
    var t = require("@angular/compiler/src/render3/r3_ast"); // t for template AST
    var utils_1 = require("@angular/language-service/ivy/utils");
    /**
     * Return the path to the template AST node or expression AST node that most accurately
     * represents the node at the specified cursor `position`.
     *
     * @param ast AST tree
     * @param position cursor position
     */
    function getPathToNodeAtPosition(ast, position) {
        var visitor = new R3Visitor(position);
        visitor.visitAll(ast);
        var candidate = visitor.path[visitor.path.length - 1];
        if (!candidate) {
            return;
        }
        if (utils_1.isTemplateNodeWithKeyAndValue(candidate)) {
            var keySpan = candidate.keySpan, valueSpan = candidate.valueSpan;
            var isWithinKeyValue = isWithin(position, keySpan) || (valueSpan && isWithin(position, valueSpan));
            if (!isWithinKeyValue) {
                // If cursor is within source span but not within key span or value span,
                // do not return the node.
                return;
            }
        }
        return visitor.path;
    }
    exports.getPathToNodeAtPosition = getPathToNodeAtPosition;
    /**
     * Return the template AST node or expression AST node that most accurately
     * represents the node at the specified cursor `position`.
     *
     * @param ast AST tree
     * @param position cursor position
     */
    function findNodeAtPosition(ast, position) {
        var path = getPathToNodeAtPosition(ast, position);
        if (!path) {
            return;
        }
        return path[path.length - 1];
    }
    exports.findNodeAtPosition = findNodeAtPosition;
    var R3Visitor = /** @class */ (function () {
        // Position must be absolute in the source file.
        function R3Visitor(position) {
            this.position = position;
            // We need to keep a path instead of the last node because we might need more
            // context for the last node, for example what is the parent node?
            this.path = [];
        }
        R3Visitor.prototype.visit = function (node) {
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
        R3Visitor.prototype.visitElement = function (element) {
            this.visitAll(element.attributes);
            this.visitAll(element.inputs);
            this.visitAll(element.outputs);
            this.visitAll(element.references);
            this.visitAll(element.children);
        };
        R3Visitor.prototype.visitTemplate = function (template) {
            this.visitAll(template.attributes);
            this.visitAll(template.inputs);
            this.visitAll(template.outputs);
            this.visitAll(template.templateAttrs);
            this.visitAll(template.references);
            this.visitAll(template.variables);
            this.visitAll(template.children);
        };
        R3Visitor.prototype.visitContent = function (content) {
            t.visitAll(this, content.attributes);
        };
        R3Visitor.prototype.visitVariable = function (variable) {
            // Variable has no template nodes or expression nodes.
        };
        R3Visitor.prototype.visitReference = function (reference) {
            // Reference has no template nodes or expression nodes.
        };
        R3Visitor.prototype.visitTextAttribute = function (attribute) {
            // Text attribute has no template nodes or expression nodes.
        };
        R3Visitor.prototype.visitBoundAttribute = function (attribute) {
            var visitor = new ExpressionVisitor(this.position);
            visitor.visit(attribute.value, this.path);
        };
        R3Visitor.prototype.visitBoundEvent = function (event) {
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
        R3Visitor.prototype.visitText = function (text) {
            // Text has no template nodes or expression nodes.
        };
        R3Visitor.prototype.visitBoundText = function (text) {
            var visitor = new ExpressionVisitor(this.position);
            visitor.visit(text.value, this.path);
        };
        R3Visitor.prototype.visitIcu = function (icu) {
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
        R3Visitor.prototype.visitAll = function (nodes) {
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
        return R3Visitor;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlicmlkX3Zpc2l0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9oeWJyaWRfdmlzaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNFO0lBQ3RFLCtEQUFpRSxDQUFFLHVCQUF1QjtJQUMxRix3REFBMEQsQ0FBUyxxQkFBcUI7SUFFeEYsNkRBQXNFO0lBRXRFOzs7Ozs7T0FNRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQWEsRUFBRSxRQUFnQjtRQUVyRSxJQUFNLE9BQU8sR0FBRyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLE9BQU87U0FDUjtRQUNELElBQUkscUNBQTZCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDckMsSUFBQSxPQUFPLEdBQWUsU0FBUyxRQUF4QixFQUFFLFNBQVMsR0FBSSxTQUFTLFVBQWIsQ0FBYztZQUN2QyxJQUFNLGdCQUFnQixHQUNsQixRQUFRLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3JCLHlFQUF5RTtnQkFDekUsMEJBQTBCO2dCQUMxQixPQUFPO2FBQ1I7U0FDRjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQztJQUN0QixDQUFDO0lBbkJELDBEQW1CQztJQUVEOzs7Ozs7T0FNRztJQUNI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QUFTLFFBQVEsQ0FBQyxRQUFnQixFQUFFLElBQXdDO1FBQzFFLElBQUksS0FBYSxFQUFFLEdBQVcsQ0FBQztRQUMvQixJQUFJLElBQUksWUFBWSwwQkFBZSxFQUFFO1lBQ25DLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUMxQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7U0FDdkI7YUFBTTtZQUNMLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ2hCO1FBQ0QsNEVBQTRFO1FBQzVFLDhDQUE4QztRQUM5QyxPQUFPLEtBQUssSUFBSSxRQUFRLElBQUksUUFBUSxJQUFJLEdBQUcsQ0FBQztJQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBQYXJzZVNvdXJjZVNwYW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIGUgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2V4cHJlc3Npb25fcGFyc2VyL2FzdCc7ICAvLyBlIGZvciBleHByZXNzaW9uIEFTVFxuaW1wb3J0ICogYXMgdCBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnOyAgICAgICAgIC8vIHQgZm9yIHRlbXBsYXRlIEFTVFxuXG5pbXBvcnQge2lzVGVtcGxhdGVOb2RlLCBpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZX0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSB0ZW1wbGF0ZSBBU1Qgbm9kZSBvciBleHByZXNzaW9uIEFTVCBub2RlIHRoYXQgbW9zdCBhY2N1cmF0ZWx5XG4gKiByZXByZXNlbnRzIHRoZSBub2RlIGF0IHRoZSBzcGVjaWZpZWQgY3Vyc29yIGBwb3NpdGlvbmAuXG4gKlxuICogQHBhcmFtIGFzdCBBU1QgdHJlZVxuICogQHBhcmFtIHBvc2l0aW9uIGN1cnNvciBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24oYXN0OiB0Lk5vZGVbXSwgcG9zaXRpb246IG51bWJlcik6IEFycmF5PHQuTm9kZXxlLkFTVD58XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBSM1Zpc2l0b3IocG9zaXRpb24pO1xuICB2aXNpdG9yLnZpc2l0QWxsKGFzdCk7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHZpc2l0b3IucGF0aFt2aXNpdG9yLnBhdGgubGVuZ3RoIC0gMV07XG4gIGlmICghY2FuZGlkYXRlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShjYW5kaWRhdGUpKSB7XG4gICAgY29uc3Qge2tleVNwYW4sIHZhbHVlU3Bhbn0gPSBjYW5kaWRhdGU7XG4gICAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICAgIGlzV2l0aGluKHBvc2l0aW9uLCBrZXlTcGFuKSB8fCAodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgICBpZiAoIWlzV2l0aGluS2V5VmFsdWUpIHtcbiAgICAgIC8vIElmIGN1cnNvciBpcyB3aXRoaW4gc291cmNlIHNwYW4gYnV0IG5vdCB3aXRoaW4ga2V5IHNwYW4gb3IgdmFsdWUgc3BhbixcbiAgICAgIC8vIGRvIG5vdCByZXR1cm4gdGhlIG5vZGUuXG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHJldHVybiB2aXNpdG9yLnBhdGg7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0ZW1wbGF0ZSBBU1Qgbm9kZSBvciBleHByZXNzaW9uIEFTVCBub2RlIHRoYXQgbW9zdCBhY2N1cmF0ZWx5XG4gKiByZXByZXNlbnRzIHRoZSBub2RlIGF0IHRoZSBzcGVjaWZpZWQgY3Vyc29yIGBwb3NpdGlvbmAuXG4gKlxuICogQHBhcmFtIGFzdCBBU1QgdHJlZVxuICogQHBhcmFtIHBvc2l0aW9uIGN1cnNvciBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZE5vZGVBdFBvc2l0aW9uKGFzdDogdC5Ob2RlW10sIHBvc2l0aW9uOiBudW1iZXIpOiB0Lk5vZGV8ZS5BU1R8dW5kZWZpbmVkIHtcbiAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKGFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXBhdGgpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbn1cblxuY2xhc3MgUjNWaXNpdG9yIGltcGxlbWVudHMgdC5WaXNpdG9yIHtcbiAgLy8gV2UgbmVlZCB0byBrZWVwIGEgcGF0aCBpbnN0ZWFkIG9mIHRoZSBsYXN0IG5vZGUgYmVjYXVzZSB3ZSBtaWdodCBuZWVkIG1vcmVcbiAgLy8gY29udGV4dCBmb3IgdGhlIGxhc3Qgbm9kZSwgZm9yIGV4YW1wbGUgd2hhdCBpcyB0aGUgcGFyZW50IG5vZGU/XG4gIHJlYWRvbmx5IHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4gPSBbXTtcblxuICAvLyBQb3NpdGlvbiBtdXN0IGJlIGFic29sdXRlIGluIHRoZSBzb3VyY2UgZmlsZS5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHQuTm9kZSkge1xuICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IGdldFNwYW5JbmNsdWRpbmdFbmRUYWcobm9kZSk7XG4gICAgaWYgKGlzV2l0aGluKHRoaXMucG9zaXRpb24sIHtzdGFydCwgZW5kfSkpIHtcbiAgICAgIGNvbnN0IGxlbmd0aCA9IGVuZCAtIHN0YXJ0O1xuICAgICAgY29uc3QgbGFzdDogdC5Ob2RlfGUuQVNUfHVuZGVmaW5lZCA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gICAgICBpZiAobGFzdCkge1xuICAgICAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBpc1RlbXBsYXRlTm9kZShsYXN0KSA/IGdldFNwYW5JbmNsdWRpbmdFbmRUYWcobGFzdCkgOiBsYXN0LnNvdXJjZVNwYW47XG4gICAgICAgIGNvbnN0IGxhc3RMZW5ndGggPSBlbmQgLSBzdGFydDtcbiAgICAgICAgaWYgKGxlbmd0aCA+IGxhc3RMZW5ndGgpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBub2RlIGhhcyBhIHNwYW4gdGhhdCBpcyBsYXJnZXIgdGhhbiB0aGUgbGFzdCBub2RlIGZvdW5kXG4gICAgICAgICAgLy8gc28gd2UgZG8gbm90IGRlc2NlbmQgaW50byBpdC4gVGhpcyB0eXBpY2FsbHkgbWVhbnMgd2UgaGF2ZSBmb3VuZFxuICAgICAgICAgIC8vIGEgY2FuZGlkYXRlIGluIG9uZSBvZiB0aGUgcm9vdCBub2RlcyBzbyB3ZSBkbyBub3QgbmVlZCB0byB2aXNpdFxuICAgICAgICAgIC8vIG90aGVyIHJvb3Qgbm9kZXMuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnBhdGgucHVzaChub2RlKTtcbiAgICAgIG5vZGUudmlzaXQodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFbGVtZW50KGVsZW1lbnQ6IHQuRWxlbWVudCkge1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQub3V0cHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LnJlZmVyZW5jZXMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5jaGlsZHJlbik7XG4gIH1cblxuICB2aXNpdFRlbXBsYXRlKHRlbXBsYXRlOiB0LlRlbXBsYXRlKSB7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5hdHRyaWJ1dGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5vdXRwdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnRlbXBsYXRlQXR0cnMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUucmVmZXJlbmNlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuY2hpbGRyZW4pO1xuICB9XG5cbiAgdmlzaXRDb250ZW50KGNvbnRlbnQ6IHQuQ29udGVudCkge1xuICAgIHQudmlzaXRBbGwodGhpcywgY29udGVudC5hdHRyaWJ1dGVzKTtcbiAgfVxuXG4gIHZpc2l0VmFyaWFibGUodmFyaWFibGU6IHQuVmFyaWFibGUpIHtcbiAgICAvLyBWYXJpYWJsZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0UmVmZXJlbmNlKHJlZmVyZW5jZTogdC5SZWZlcmVuY2UpIHtcbiAgICAvLyBSZWZlcmVuY2UgaGFzIG5vIHRlbXBsYXRlIG5vZGVzIG9yIGV4cHJlc3Npb24gbm9kZXMuXG4gIH1cblxuICB2aXNpdFRleHRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LlRleHRBdHRyaWJ1dGUpIHtcbiAgICAvLyBUZXh0IGF0dHJpYnV0ZSBoYXMgbm8gdGVtcGxhdGUgbm9kZXMgb3IgZXhwcmVzc2lvbiBub2Rlcy5cbiAgfVxuXG4gIHZpc2l0Qm91bmRBdHRyaWJ1dGUoYXR0cmlidXRlOiB0LkJvdW5kQXR0cmlidXRlKSB7XG4gICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcih0aGlzLnBvc2l0aW9uKTtcbiAgICB2aXNpdG9yLnZpc2l0KGF0dHJpYnV0ZS52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0Qm91bmRFdmVudChldmVudDogdC5Cb3VuZEV2ZW50KSB7XG4gICAgY29uc3QgaXNUd29XYXlCaW5kaW5nID1cbiAgICAgICAgdGhpcy5wYXRoLnNvbWUobiA9PiBuIGluc3RhbmNlb2YgdC5Cb3VuZEF0dHJpYnV0ZSAmJiBldmVudC5uYW1lID09PSBuLm5hbWUgKyAnQ2hhbmdlJyk7XG4gICAgaWYgKGlzVHdvV2F5QmluZGluZykge1xuICAgICAgLy8gRm9yIHR3by13YXkgYmluZGluZyBha2EgYmFuYW5hLWluLWEtYm94LCB0aGVyZSBhcmUgdHdvIG1hdGNoZXM6XG4gICAgICAvLyBCb3VuZEF0dHJpYnV0ZSBhbmQgQm91bmRFdmVudC4gQm90aCBoYXZlIHRoZSBzYW1lIHNwYW5zLiBXZSBjaG9vc2UgdG9cbiAgICAgIC8vIHJldHVybiBCb3VuZEF0dHJpYnV0ZSBiZWNhdXNlIGl0IG1hdGNoZXMgdGhlIGlkZW50aWZpZXIgbmFtZSB2ZXJiYXRpbS5cbiAgICAgIC8vIFRPRE86IEZvciBvcGVyYXRpb25zIGxpa2UgZ28gdG8gZGVmaW5pdGlvbiwgaWRlYWxseSB3ZSB3YW50IHRvIHJldHVyblxuICAgICAgLy8gYm90aC5cbiAgICAgIHRoaXMucGF0aC5wb3AoKTsgIC8vIHJlbW92ZSBib3VuZCBldmVudCBmcm9tIHRoZSBBU1QgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQoZXZlbnQuaGFuZGxlciwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0VGV4dCh0ZXh0OiB0LlRleHQpIHtcbiAgICAvLyBUZXh0IGhhcyBubyB0ZW1wbGF0ZSBub2RlcyBvciBleHByZXNzaW9uIG5vZGVzLlxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQodGV4dDogdC5Cb3VuZFRleHQpIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKHRoaXMucG9zaXRpb24pO1xuICAgIHZpc2l0b3IudmlzaXQodGV4dC52YWx1ZSwgdGhpcy5wYXRoKTtcbiAgfVxuXG4gIHZpc2l0SWN1KGljdTogdC5JY3UpIHtcbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS52YXJzKSkge1xuICAgICAgdGhpcy52aXNpdChib3VuZFRleHQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGJvdW5kVGV4dE9yVGV4dCBvZiBPYmplY3QudmFsdWVzKGljdS5wbGFjZWhvbGRlcnMpKSB7XG4gICAgICB0aGlzLnZpc2l0KGJvdW5kVGV4dE9yVGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRBbGwobm9kZXM6IHQuTm9kZVtdKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICB0aGlzLnZpc2l0KG5vZGUpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIGUuUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIC8vIFBvc2l0aW9uIG11c3QgYmUgYWJzb2x1dGUgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXQobm9kZTogZS5BU1QsIHBhdGg6IEFycmF5PHQuTm9kZXxlLkFTVD4pIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIGUuQVNUV2l0aFNvdXJjZSkge1xuICAgICAgLy8gSW4gb3JkZXIgdG8gcmVkdWNlIG5vaXNlLCBkbyBub3QgaW5jbHVkZSBgQVNUV2l0aFNvdXJjZWAgaW4gdGhlIHBhdGguXG4gICAgICAvLyBGb3IgdGhlIHB1cnBvc2Ugb2Ygc291cmNlIHNwYW5zLCB0aGVyZSBpcyBubyBkaWZmZXJlbmNlIGJldHdlZW5cbiAgICAgIC8vIGBBU1RXaXRoU291cmNlYCBhbmQgYW5kIHVuZGVybHlpbmcgbm9kZSB0aGF0IGl0IHdyYXBzLlxuICAgICAgbm9kZSA9IG5vZGUuYXN0O1xuICAgIH1cbiAgICAvLyBUaGUgdGhpcmQgY29uZGl0aW9uIGlzIHRvIGFjY291bnQgZm9yIHRoZSBpbXBsaWNpdCByZWNlaXZlciwgd2hpY2ggc2hvdWxkXG4gICAgLy8gbm90IGJlIHZpc2l0ZWQuXG4gICAgaWYgKGlzV2l0aGluKHRoaXMucG9zaXRpb24sIG5vZGUuc291cmNlU3BhbikgJiYgIShub2RlIGluc3RhbmNlb2YgZS5JbXBsaWNpdFJlY2VpdmVyKSkge1xuICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgbm9kZS52aXNpdCh0aGlzLCBwYXRoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3BhbkluY2x1ZGluZ0VuZFRhZyhhc3Q6IHQuTm9kZSkge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgc3RhcnQ6IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICBlbmQ6IGFzdC5zb3VyY2VTcGFuLmVuZC5vZmZzZXQsXG4gIH07XG4gIC8vIEZvciBFbGVtZW50IGFuZCBUZW1wbGF0ZSBub2RlLCBzb3VyY2VTcGFuLmVuZCBpcyB0aGUgZW5kIG9mIHRoZSBvcGVuaW5nXG4gIC8vIHRhZy4gRm9yIHRoZSBwdXJwb3NlIG9mIGxhbmd1YWdlIHNlcnZpY2UsIHdlIG5lZWQgdG8gYWN0dWFsbHkgcmVjb2duaXplXG4gIC8vIHRoZSBlbmQgb2YgdGhlIGNsb3NpbmcgdGFnLiBPdGhlcndpc2UsIGZvciBzaXR1YXRpb24gbGlrZVxuICAvLyA8bXktY29tcG9uZW50PjwvbXktY29tcMKmb25lbnQ+IHdoZXJlIHRoZSBjdXJzb3IgaXMgaW4gdGhlIGNsb3NpbmcgdGFnXG4gIC8vIHdlIHdpbGwgbm90IGJlIGFibGUgdG8gcmV0dXJuIGFueSBpbmZvcm1hdGlvbi5cbiAgaWYgKChhc3QgaW5zdGFuY2VvZiB0LkVsZW1lbnQgfHwgYXN0IGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkgJiYgYXN0LmVuZFNvdXJjZVNwYW4pIHtcbiAgICByZXN1bHQuZW5kID0gYXN0LmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc1dpdGhpbihwb3NpdGlvbjogbnVtYmVyLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW58UGFyc2VTb3VyY2VTcGFuKTogYm9vbGVhbiB7XG4gIGxldCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcjtcbiAgaWYgKHNwYW4gaW5zdGFuY2VvZiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQ7XG4gICAgZW5kID0gc3Bhbi5lbmQ7XG4gIH1cbiAgLy8gTm90ZSBib3RoIHN0YXJ0IGFuZCBlbmQgYXJlIGluY2x1c2l2ZSBiZWNhdXNlIHdlIHdhbnQgdG8gbWF0Y2ggY29uZGl0aW9uc1xuICAvLyBsaWtlIMKmc3RhcnQgYW5kIGVuZMKmIHdoZXJlIMKmIGlzIHRoZSBjdXJzb3IuXG4gIHJldHVybiBzdGFydCA8PSBwb3NpdGlvbiAmJiBwb3NpdGlvbiA8PSBlbmQ7XG59XG4iXX0=