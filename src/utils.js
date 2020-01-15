/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/language-service/src/utils", ["require", "exports", "tslib", "@angular/compiler", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    function isParseSourceSpan(value) {
        return value && !!value.start;
    }
    exports.isParseSourceSpan = isParseSourceSpan;
    function spanOf(span) {
        if (!span)
            return undefined;
        if (isParseSourceSpan(span)) {
            return { start: span.start.offset, end: span.end.offset };
        }
        else {
            if (span.endSourceSpan) {
                return { start: span.sourceSpan.start.offset, end: span.endSourceSpan.end.offset };
            }
            else if (span.children && span.children.length) {
                return {
                    start: span.sourceSpan.start.offset,
                    end: spanOf(span.children[span.children.length - 1]).end
                };
            }
            return { start: span.sourceSpan.start.offset, end: span.sourceSpan.end.offset };
        }
    }
    exports.spanOf = spanOf;
    function inSpan(position, span, exclusive) {
        return span != null && (exclusive ? position >= span.start && position < span.end :
            position >= span.start && position <= span.end);
    }
    exports.inSpan = inSpan;
    function offsetSpan(span, amount) {
        return { start: span.start + amount, end: span.end + amount };
    }
    exports.offsetSpan = offsetSpan;
    function isNarrower(spanA, spanB) {
        return spanA.start >= spanB.start && spanA.end <= spanB.end;
    }
    exports.isNarrower = isNarrower;
    function hasTemplateReference(type) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(type.diDeps), _c = _b.next(); !_c.done; _c = _b.next()) {
                var diDep = _c.value;
                if (diDep.token && compiler_1.identifierName(diDep.token.identifier) === compiler_1.Identifiers.TemplateRef.name) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    }
    exports.hasTemplateReference = hasTemplateReference;
    function getSelectors(info) {
        var e_2, _a, e_3, _b;
        var map = new Map();
        var results = [];
        try {
            for (var _c = tslib_1.__values(info.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                var directive = _d.value;
                var selectors = compiler_1.CssSelector.parse(directive.selector);
                try {
                    for (var selectors_1 = (e_3 = void 0, tslib_1.__values(selectors)), selectors_1_1 = selectors_1.next(); !selectors_1_1.done; selectors_1_1 = selectors_1.next()) {
                        var selector = selectors_1_1.value;
                        results.push(selector);
                        map.set(selector, directive);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (selectors_1_1 && !selectors_1_1.done && (_b = selectors_1.return)) _b.call(selectors_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return { selectors: results, map: map };
    }
    exports.getSelectors = getSelectors;
    function isTypescriptVersion(low, high) {
        var version = ts.version;
        if (version.substring(0, low.length) < low)
            return false;
        if (high && (version.substring(0, high.length) > high))
            return false;
        return true;
    }
    exports.isTypescriptVersion = isTypescriptVersion;
    function diagnosticInfoFromTemplateInfo(info) {
        return {
            fileName: info.template.fileName,
            offset: info.template.span.start,
            query: info.template.query,
            members: info.template.members,
            htmlAst: info.htmlAst,
            templateAst: info.templateAst
        };
    }
    exports.diagnosticInfoFromTemplateInfo = diagnosticInfoFromTemplateInfo;
    function findTemplateAstAt(ast, position) {
        var path = [];
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visit = function (ast, context) {
                var span = spanOf(ast);
                if (inSpan(position, span)) {
                    var len = path.length;
                    if (!len || isNarrower(span, spanOf(path[len - 1]))) {
                        path.push(ast);
                    }
                }
                else {
                    // Returning a value here will result in the children being skipped.
                    return true;
                }
            };
            class_1.prototype.visitEmbeddedTemplate = function (ast, context) {
                return this.visitChildren(context, function (visit) {
                    // Ignore reference, variable and providers
                    visit(ast.attrs);
                    visit(ast.directives);
                    visit(ast.children);
                });
            };
            class_1.prototype.visitElement = function (ast, context) {
                return this.visitChildren(context, function (visit) {
                    // Ingnore providers
                    visit(ast.attrs);
                    visit(ast.inputs);
                    visit(ast.outputs);
                    visit(ast.references);
                    visit(ast.directives);
                    visit(ast.children);
                });
            };
            class_1.prototype.visitDirective = function (ast, context) {
                // Ignore the host properties of a directive
                var result = this.visitChildren(context, function (visit) { visit(ast.inputs); });
                // We never care about the diretive itself, just its inputs.
                if (path[path.length - 1] === ast) {
                    path.pop();
                }
                return result;
            };
            return class_1;
        }(compiler_1.RecursiveTemplateAstVisitor));
        compiler_1.templateVisitAll(visitor, ast);
        return new compiler_1.AstPath(path, position);
    }
    exports.findTemplateAstAt = findTemplateAstAt;
    /**
     * Return the node that most tightly encompass the specified `position`.
     * @param node
     * @param position
     */
    function findTightestNode(node, position) {
        if (node.getStart() <= position && position < node.getEnd()) {
            return node.forEachChild(function (c) { return findTightestNode(c, position); }) || node;
        }
    }
    exports.findTightestNode = findTightestNode;
    /**
     * Return metadata about `node` if it looks like an Angular directive class.
     * In this case, potential matches are `@NgModule`, `@Component`, `@Directive`,
     * `@Pipe`, etc.
     * These class declarations all share some common attributes, namely their
     * decorator takes exactly one parameter and the parameter must be an object
     * literal.
     *
     * For example,
     *     v---------- `decoratorId`
     * @NgModule({
     *   declarations: [],
     * })
     * class AppModule {}
     *          ^----- `classDecl`
     *
     * @param node Potential node that represents an Angular directive.
     */
    function getDirectiveClassLike(node) {
        var e_4, _a;
        if (!ts.isClassDeclaration(node) || !node.name || !node.decorators) {
            return;
        }
        try {
            for (var _b = tslib_1.__values(node.decorators), _c = _b.next(); !_c.done; _c = _b.next()) {
                var d = _c.value;
                var expr = d.expression;
                if (!ts.isCallExpression(expr) || expr.arguments.length !== 1 ||
                    !ts.isIdentifier(expr.expression)) {
                    continue;
                }
                var arg = expr.arguments[0];
                if (ts.isObjectLiteralExpression(arg)) {
                    return {
                        decoratorId: expr.expression,
                        classDecl: node,
                    };
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
    exports.getDirectiveClassLike = getDirectiveClassLike;
    /**
     * Finds the value of a property assignment that is nested in a TypeScript node and is of a certain
     * type T.
     *
     * @param startNode node to start searching for nested property assignment from
     * @param propName property assignment name
     * @param predicate function to verify that a node is of type T.
     * @return node property assignment value of type T, or undefined if none is found
     */
    function findPropertyValueOfType(startNode, propName, predicate) {
        if (ts.isPropertyAssignment(startNode) && startNode.name.getText() === propName) {
            var initializer = startNode.initializer;
            if (predicate(initializer))
                return initializer;
        }
        return startNode.forEachChild(function (c) { return findPropertyValueOfType(c, propName, predicate); });
    }
    exports.findPropertyValueOfType = findPropertyValueOfType;
    /**
     * Find the tightest node at the specified `position` from the AST `nodes`, and
     * return the path to the node.
     * @param nodes HTML AST nodes
     * @param position
     */
    function getPathToNodeAtPosition(nodes, position) {
        var path = [];
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_2, _super);
            function class_2() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_2.prototype.visit = function (ast) {
                var span = spanOf(ast);
                if (inSpan(position, span)) {
                    path.push(ast);
                }
                else {
                    // Returning a truthy value here will skip all children and terminate
                    // the visit.
                    return true;
                }
            };
            return class_2;
        }(compiler_1.RecursiveVisitor));
        compiler_1.visitAll(visitor, nodes);
        return new compiler_1.AstPath(path, position);
    }
    exports.getPathToNodeAtPosition = getPathToNodeAtPosition;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOFQ7SUFDOVQsK0JBQWlDO0lBWWpDLFNBQWdCLGlCQUFpQixDQUFDLEtBQVU7UUFDMUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUZELDhDQUVDO0lBS0QsU0FBZ0IsTUFBTSxDQUFDLElBQW1DO1FBQ3hELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDNUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1NBQ3pEO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBRyxDQUFDLEdBQUc7aUJB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QkFDekIsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNoQjtxQkFBTTtvQkFDTCxxRUFBcUU7b0JBQ3JFLGFBQWE7b0JBQ2IsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUFYbUIsQ0FBYywyQkFBZ0IsRUFXakQsQ0FBQztRQUNGLG1CQUFRLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxrQkFBTyxDQUFPLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBaEJELDBEQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBc3RQYXRoLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZVR5cGVNZXRhZGF0YSwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgSHRtbEFzdFBhdGgsIElkZW50aWZpZXJzLCBOb2RlLCBQYXJzZVNvdXJjZVNwYW4sIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciwgUmVjdXJzaXZlVmlzaXRvciwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgaWRlbnRpZmllck5hbWUsIHRlbXBsYXRlVmlzaXRBbGwsIHZpc2l0QWxsfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RSZXN1bHQsIFNlbGVjdG9ySW5mb30gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtTcGFufSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBTcGFuSG9sZGVyIHtcbiAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xuICBlbmRTb3VyY2VTcGFuPzogUGFyc2VTb3VyY2VTcGFufG51bGw7XG4gIGNoaWxkcmVuPzogU3BhbkhvbGRlcltdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQYXJzZVNvdXJjZVNwYW4odmFsdWU6IGFueSk6IHZhbHVlIGlzIFBhcnNlU291cmNlU3BhbiB7XG4gIHJldHVybiB2YWx1ZSAmJiAhIXZhbHVlLnN0YXJ0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW46IFNwYW5Ib2xkZXIpOiBTcGFuO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBTcGFuSG9sZGVyIHwgUGFyc2VTb3VyY2VTcGFuIHwgdW5kZWZpbmVkKTogU3Bhbnx1bmRlZmluZWQ7XG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW4/OiBTcGFuSG9sZGVyIHwgUGFyc2VTb3VyY2VTcGFuKTogU3Bhbnx1bmRlZmluZWQge1xuICBpZiAoIXNwYW4pIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChpc1BhcnNlU291cmNlU3BhbihzcGFuKSkge1xuICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kLm9mZnNldH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKHNwYW4uZW5kU291cmNlU3Bhbikge1xuICAgICAgcmV0dXJuIHtzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldH07XG4gICAgfSBlbHNlIGlmIChzcGFuLmNoaWxkcmVuICYmIHNwYW4uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgZW5kOiBzcGFuT2Yoc3Bhbi5jaGlsZHJlbltzcGFuLmNoaWxkcmVuLmxlbmd0aCAtIDFdKSAhLmVuZFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHtzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLnNvdXJjZVNwYW4uZW5kLm9mZnNldH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluU3Bhbihwb3NpdGlvbjogbnVtYmVyLCBzcGFuPzogU3BhbiwgZXhjbHVzaXZlPzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gc3BhbiAhPSBudWxsICYmIChleGNsdXNpdmUgPyBwb3NpdGlvbiA+PSBzcGFuLnN0YXJ0ICYmIHBvc2l0aW9uIDwgc3Bhbi5lbmQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA+PSBzcGFuLnN0YXJ0ICYmIHBvc2l0aW9uIDw9IHNwYW4uZW5kKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9mZnNldFNwYW4oc3BhbjogU3BhbiwgYW1vdW50OiBudW1iZXIpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydCArIGFtb3VudCwgZW5kOiBzcGFuLmVuZCArIGFtb3VudH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05hcnJvd2VyKHNwYW5BOiBTcGFuLCBzcGFuQjogU3Bhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gc3BhbkEuc3RhcnQgPj0gc3BhbkIuc3RhcnQgJiYgc3BhbkEuZW5kIDw9IHNwYW5CLmVuZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgZm9yIChjb25zdCBkaURlcCBvZiB0eXBlLmRpRGVwcykge1xuICAgIGlmIChkaURlcC50b2tlbiAmJiBpZGVudGlmaWVyTmFtZShkaURlcC50b2tlbi5pZGVudGlmaWVyKSA9PT0gSWRlbnRpZmllcnMuVGVtcGxhdGVSZWYubmFtZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNlbGVjdG9ycyhpbmZvOiBBc3RSZXN1bHQpOiBTZWxlY3RvckluZm8ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPENzc1NlbGVjdG9yLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeT4oKTtcbiAgY29uc3QgcmVzdWx0czogQ3NzU2VsZWN0b3JbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbmZvLmRpcmVjdGl2ZXMpIHtcbiAgICBjb25zdCBzZWxlY3RvcnM6IENzc1NlbGVjdG9yW10gPSBDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IgISk7XG4gICAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBzZWxlY3RvcnMpIHtcbiAgICAgIHJlc3VsdHMucHVzaChzZWxlY3Rvcik7XG4gICAgICBtYXAuc2V0KHNlbGVjdG9yLCBkaXJlY3RpdmUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ge3NlbGVjdG9yczogcmVzdWx0cywgbWFwfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZXNjcmlwdFZlcnNpb24obG93OiBzdHJpbmcsIGhpZ2g/OiBzdHJpbmcpIHtcbiAgY29uc3QgdmVyc2lvbiA9IHRzLnZlcnNpb247XG5cbiAgaWYgKHZlcnNpb24uc3Vic3RyaW5nKDAsIGxvdy5sZW5ndGgpIDwgbG93KSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGhpZ2ggJiYgKHZlcnNpb24uc3Vic3RyaW5nKDAsIGhpZ2gubGVuZ3RoKSA+IGhpZ2gpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbzogQXN0UmVzdWx0KTogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyB7XG4gIHJldHVybiB7XG4gICAgZmlsZU5hbWU6IGluZm8udGVtcGxhdGUuZmlsZU5hbWUsXG4gICAgb2Zmc2V0OiBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQsXG4gICAgcXVlcnk6IGluZm8udGVtcGxhdGUucXVlcnksXG4gICAgbWVtYmVyczogaW5mby50ZW1wbGF0ZS5tZW1iZXJzLFxuICAgIGh0bWxBc3Q6IGluZm8uaHRtbEFzdCxcbiAgICB0ZW1wbGF0ZUFzdDogaW5mby50ZW1wbGF0ZUFzdFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFRlbXBsYXRlQXN0QXQoYXN0OiBUZW1wbGF0ZUFzdFtdLCBwb3NpdGlvbjogbnVtYmVyKTogVGVtcGxhdGVBc3RQYXRoIHtcbiAgY29uc3QgcGF0aDogVGVtcGxhdGVBc3RbXSA9IFtdO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgbGV0IHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgIGlmIChpblNwYW4ocG9zaXRpb24sIHNwYW4pKSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgICAgICBpZiAoIWxlbiB8fCBpc05hcnJvd2VyKHNwYW4sIHNwYW5PZihwYXRoW2xlbiAtIDFdKSkpIHtcbiAgICAgICAgICBwYXRoLnB1c2goYXN0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUmV0dXJuaW5nIGEgdmFsdWUgaGVyZSB3aWxsIHJlc3VsdCBpbiB0aGUgY2hpbGRyZW4gYmVpbmcgc2tpcHBlZC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICAvLyBJZ25vcmUgcmVmZXJlbmNlLCB2YXJpYWJsZSBhbmQgcHJvdmlkZXJzXG4gICAgICAgIHZpc2l0KGFzdC5hdHRycyk7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgLy8gSW5nbm9yZSBwcm92aWRlcnNcbiAgICAgICAgdmlzaXQoYXN0LmF0dHJzKTtcbiAgICAgICAgdmlzaXQoYXN0LmlucHV0cyk7XG4gICAgICAgIHZpc2l0KGFzdC5vdXRwdXRzKTtcbiAgICAgICAgdmlzaXQoYXN0LnJlZmVyZW5jZXMpO1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdERpcmVjdGl2ZShhc3Q6IERpcmVjdGl2ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIC8vIElnbm9yZSB0aGUgaG9zdCBwcm9wZXJ0aWVzIG9mIGEgZGlyZWN0aXZlXG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4geyB2aXNpdChhc3QuaW5wdXRzKTsgfSk7XG4gICAgICAvLyBXZSBuZXZlciBjYXJlIGFib3V0IHRoZSBkaXJldGl2ZSBpdHNlbGYsIGp1c3QgaXRzIGlucHV0cy5cbiAgICAgIGlmIChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09IGFzdCkge1xuICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG5cbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBhc3QpO1xuXG4gIHJldHVybiBuZXcgQXN0UGF0aDxUZW1wbGF0ZUFzdD4ocGF0aCwgcG9zaXRpb24pO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbm9kZSB0aGF0IG1vc3QgdGlnaHRseSBlbmNvbXBhc3MgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICogQHBhcmFtIG5vZGVcbiAqIEBwYXJhbSBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFRpZ2h0ZXN0Tm9kZShub2RlOiB0cy5Ob2RlLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICBpZiAobm9kZS5nZXRTdGFydCgpIDw9IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgbm9kZS5nZXRFbmQoKSkge1xuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRUaWdodGVzdE5vZGUoYywgcG9zaXRpb24pKSB8fCBub2RlO1xuICB9XG59XG5cbmludGVyZmFjZSBEaXJlY3RpdmVDbGFzc0xpa2Uge1xuICBkZWNvcmF0b3JJZDogdHMuSWRlbnRpZmllcjsgIC8vIGRlY29yYXRvciBpZGVudGlmaWVyXG4gIGNsYXNzRGVjbDogdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm4gbWV0YWRhdGEgYWJvdXQgYG5vZGVgIGlmIGl0IGxvb2tzIGxpa2UgYW4gQW5ndWxhciBkaXJlY3RpdmUgY2xhc3MuXG4gKiBJbiB0aGlzIGNhc2UsIHBvdGVudGlhbCBtYXRjaGVzIGFyZSBgQE5nTW9kdWxlYCwgYEBDb21wb25lbnRgLCBgQERpcmVjdGl2ZWAsXG4gKiBgQFBpcGVgLCBldGMuXG4gKiBUaGVzZSBjbGFzcyBkZWNsYXJhdGlvbnMgYWxsIHNoYXJlIHNvbWUgY29tbW9uIGF0dHJpYnV0ZXMsIG5hbWVseSB0aGVpclxuICogZGVjb3JhdG9yIHRha2VzIGV4YWN0bHkgb25lIHBhcmFtZXRlciBhbmQgdGhlIHBhcmFtZXRlciBtdXN0IGJlIGFuIG9iamVjdFxuICogbGl0ZXJhbC5cbiAqXG4gKiBGb3IgZXhhbXBsZSxcbiAqICAgICB2LS0tLS0tLS0tLSBgZGVjb3JhdG9ySWRgXG4gKiBATmdNb2R1bGUoe1xuICogICBkZWNsYXJhdGlvbnM6IFtdLFxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogICAgICAgICAgXi0tLS0tIGBjbGFzc0RlY2xgXG4gKlxuICogQHBhcmFtIG5vZGUgUG90ZW50aWFsIG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlQ2xhc3NMaWtlKG5vZGU6IHRzLk5vZGUpOiBEaXJlY3RpdmVDbGFzc0xpa2V8dW5kZWZpbmVkIHtcbiAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgfHwgIW5vZGUubmFtZSB8fCAhbm9kZS5kZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgZCBvZiBub2RlLmRlY29yYXRvcnMpIHtcbiAgICBjb25zdCBleHByID0gZC5leHByZXNzaW9uO1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByKSB8fCBleHByLmFyZ3VtZW50cy5sZW5ndGggIT09IDEgfHxcbiAgICAgICAgIXRzLmlzSWRlbnRpZmllcihleHByLmV4cHJlc3Npb24pKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgYXJnID0gZXhwci5hcmd1bWVudHNbMF07XG4gICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oYXJnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGVjb3JhdG9ySWQ6IGV4cHIuZXhwcmVzc2lvbixcbiAgICAgICAgY2xhc3NEZWNsOiBub2RlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBhc3NpZ25tZW50IHRoYXQgaXMgbmVzdGVkIGluIGEgVHlwZVNjcmlwdCBub2RlIGFuZCBpcyBvZiBhIGNlcnRhaW5cbiAqIHR5cGUgVC5cbiAqXG4gKiBAcGFyYW0gc3RhcnROb2RlIG5vZGUgdG8gc3RhcnQgc2VhcmNoaW5nIGZvciBuZXN0ZWQgcHJvcGVydHkgYXNzaWdubWVudCBmcm9tXG4gKiBAcGFyYW0gcHJvcE5hbWUgcHJvcGVydHkgYXNzaWdubWVudCBuYW1lXG4gKiBAcGFyYW0gcHJlZGljYXRlIGZ1bmN0aW9uIHRvIHZlcmlmeSB0aGF0IGEgbm9kZSBpcyBvZiB0eXBlIFQuXG4gKiBAcmV0dXJuIG5vZGUgcHJvcGVydHkgYXNzaWdubWVudCB2YWx1ZSBvZiB0eXBlIFQsIG9yIHVuZGVmaW5lZCBpZiBub25lIGlzIGZvdW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZTxUIGV4dGVuZHMgdHMuTm9kZT4oXG4gICAgc3RhcnROb2RlOiB0cy5Ob2RlLCBwcm9wTmFtZTogc3RyaW5nLCBwcmVkaWNhdGU6IChub2RlOiB0cy5Ob2RlKSA9PiBub2RlIGlzIFQpOiBUfHVuZGVmaW5lZCB7XG4gIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChzdGFydE5vZGUpICYmIHN0YXJ0Tm9kZS5uYW1lLmdldFRleHQoKSA9PT0gcHJvcE5hbWUpIHtcbiAgICBjb25zdCB7aW5pdGlhbGl6ZXJ9ID0gc3RhcnROb2RlO1xuICAgIGlmIChwcmVkaWNhdGUoaW5pdGlhbGl6ZXIpKSByZXR1cm4gaW5pdGlhbGl6ZXI7XG4gIH1cbiAgcmV0dXJuIHN0YXJ0Tm9kZS5mb3JFYWNoQ2hpbGQoYyA9PiBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShjLCBwcm9wTmFtZSwgcHJlZGljYXRlKSk7XG59XG5cbi8qKlxuICogRmluZCB0aGUgdGlnaHRlc3Qgbm9kZSBhdCB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAgZnJvbSB0aGUgQVNUIGBub2Rlc2AsIGFuZFxuICogcmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBub2RlLlxuICogQHBhcmFtIG5vZGVzIEhUTUwgQVNUIG5vZGVzXG4gKiBAcGFyYW0gcG9zaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKG5vZGVzOiBOb2RlW10sIHBvc2l0aW9uOiBudW1iZXIpOiBIdG1sQXN0UGF0aCB7XG4gIGNvbnN0IHBhdGg6IE5vZGVbXSA9IFtdO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVmlzaXRvciB7XG4gICAgdmlzaXQoYXN0OiBOb2RlKSB7XG4gICAgICBjb25zdCBzcGFuID0gc3Bhbk9mKGFzdCk7XG4gICAgICBpZiAoaW5TcGFuKHBvc2l0aW9uLCBzcGFuKSkge1xuICAgICAgICBwYXRoLnB1c2goYXN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldHVybmluZyBhIHRydXRoeSB2YWx1ZSBoZXJlIHdpbGwgc2tpcCBhbGwgY2hpbGRyZW4gYW5kIHRlcm1pbmF0ZVxuICAgICAgICAvLyB0aGUgdmlzaXQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgdmlzaXRBbGwodmlzaXRvciwgbm9kZXMpO1xuICByZXR1cm4gbmV3IEFzdFBhdGg8Tm9kZT4ocGF0aCwgcG9zaXRpb24pO1xufVxuIl19