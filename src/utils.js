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
        if (type.diDeps) {
            try {
                for (var _b = tslib_1.__values(type.diDeps), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var diDep = _c.value;
                    if (diDep.token && diDep.token.identifier &&
                        compiler_1.identifierName(diDep.token.identifier) == 'TemplateRef')
                        return true;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return false;
    }
    exports.hasTemplateReference = hasTemplateReference;
    function getSelectors(info) {
        var map = new Map();
        var selectors = flatten(info.directives.map(function (directive) {
            var selectors = compiler_1.CssSelector.parse(directive.selector);
            selectors.forEach(function (selector) { return map.set(selector, directive); });
            return selectors;
        }));
        return { selectors: selectors, map: map };
    }
    exports.getSelectors = getSelectors;
    function flatten(a) {
        var _a;
        return (_a = []).concat.apply(_a, tslib_1.__spread(a));
    }
    exports.flatten = flatten;
    function removeSuffix(value, suffix) {
        if (value.endsWith(suffix))
            return value.substring(0, value.length - suffix.length);
        return value;
    }
    exports.removeSuffix = removeSuffix;
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
    function findTemplateAstAt(ast, position, allowWidening) {
        if (allowWidening === void 0) { allowWidening = false; }
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
                    if (!len || allowWidening || isNarrower(span, spanOf(path[len - 1]))) {
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
                if (path[path.length - 1] == ast) {
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
        var e_2, _a;
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1E7SUFFbFEsK0JBQWlDO0lBV2pDLFNBQWdCLGlCQUFpQixDQUFDLEtBQVU7UUFDMUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUZELDhDQUVDO0lBS0QsU0FBZ0IsTUFBTSxDQUFDLElBQW1DO1FBQ3hELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDNUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1NBQ3pEO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBRyxDQUFDLEdBQUc7aUJB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dUJBQXVCLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBL0MsQ0FBK0MsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFQRCwwREFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBc3RQYXRoLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZVR5cGVNZXRhZGF0YSwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIGlkZW50aWZpZXJOYW1lLCB0ZW1wbGF0ZVZpc2l0QWxsfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0RpYWdub3N0aWNUZW1wbGF0ZUluZm99IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBTZWxlY3RvckluZm99IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7U3Bhbn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BhbkhvbGRlciB7XG4gIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbjtcbiAgZW5kU291cmNlU3Bhbj86IFBhcnNlU291cmNlU3BhbnxudWxsO1xuICBjaGlsZHJlbj86IFNwYW5Ib2xkZXJbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFyc2VTb3VyY2VTcGFuKHZhbHVlOiBhbnkpOiB2YWx1ZSBpcyBQYXJzZVNvdXJjZVNwYW4ge1xuICByZXR1cm4gdmFsdWUgJiYgISF2YWx1ZS5zdGFydDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBTcGFuSG9sZGVyKTogU3BhbjtcbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogU3BhbjtcbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3BhbjogU3BhbkhvbGRlciB8IFBhcnNlU291cmNlU3BhbiB8IHVuZGVmaW5lZCk6IFNwYW58dW5kZWZpbmVkO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuPzogU3BhbkhvbGRlciB8IFBhcnNlU291cmNlU3Bhbik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKCFzcGFuKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoaXNQYXJzZVNvdXJjZVNwYW4oc3BhbikpIHtcbiAgICByZXR1cm4ge3N0YXJ0OiBzcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLmVuZC5vZmZzZXR9O1xuICB9IGVsc2Uge1xuICAgIGlmIChzcGFuLmVuZFNvdXJjZVNwYW4pIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmRTb3VyY2VTcGFuLmVuZC5vZmZzZXR9O1xuICAgIH0gZWxzZSBpZiAoc3Bhbi5jaGlsZHJlbiAmJiBzcGFuLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIGVuZDogc3Bhbk9mKHNwYW4uY2hpbGRyZW5bc3Bhbi5jaGlsZHJlbi5sZW5ndGggLSAxXSkgIS5lbmRcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5zb3VyY2VTcGFuLmVuZC5vZmZzZXR9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpblNwYW4ocG9zaXRpb246IG51bWJlciwgc3Bhbj86IFNwYW4sIGV4Y2x1c2l2ZT86IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHNwYW4gIT0gbnVsbCAmJiAoZXhjbHVzaXZlID8gcG9zaXRpb24gPj0gc3Bhbi5zdGFydCAmJiBwb3NpdGlvbiA8IHNwYW4uZW5kIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPj0gc3Bhbi5zdGFydCAmJiBwb3NpdGlvbiA8PSBzcGFuLmVuZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvZmZzZXRTcGFuKHNwYW46IFNwYW4sIGFtb3VudDogbnVtYmVyKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IHNwYW4uc3RhcnQgKyBhbW91bnQsIGVuZDogc3Bhbi5lbmQgKyBhbW91bnR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOYXJyb3dlcihzcGFuQTogU3Bhbiwgc3BhbkI6IFNwYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHNwYW5BLnN0YXJ0ID49IHNwYW5CLnN0YXJ0ICYmIHNwYW5BLmVuZCA8PSBzcGFuQi5lbmQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNUZW1wbGF0ZVJlZmVyZW5jZSh0eXBlOiBDb21waWxlVHlwZU1ldGFkYXRhKTogYm9vbGVhbiB7XG4gIGlmICh0eXBlLmRpRGVwcykge1xuICAgIGZvciAobGV0IGRpRGVwIG9mIHR5cGUuZGlEZXBzKSB7XG4gICAgICBpZiAoZGlEZXAudG9rZW4gJiYgZGlEZXAudG9rZW4uaWRlbnRpZmllciAmJlxuICAgICAgICAgIGlkZW50aWZpZXJOYW1lKGRpRGVwLnRva2VuICEuaWRlbnRpZmllciAhKSA9PSAnVGVtcGxhdGVSZWYnKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0b3JzKGluZm86IEFzdFJlc3VsdCk6IFNlbGVjdG9ySW5mbyB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8Q3NzU2VsZWN0b3IsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5PigpO1xuICBjb25zdCBzZWxlY3RvcnM6IENzc1NlbGVjdG9yW10gPSBmbGF0dGVuKGluZm8uZGlyZWN0aXZlcy5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICBjb25zdCBzZWxlY3RvcnM6IENzc1NlbGVjdG9yW10gPSBDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IgISk7XG4gICAgc2VsZWN0b3JzLmZvckVhY2goc2VsZWN0b3IgPT4gbWFwLnNldChzZWxlY3RvciwgZGlyZWN0aXZlKSk7XG4gICAgcmV0dXJuIHNlbGVjdG9ycztcbiAgfSkpO1xuICByZXR1cm4ge3NlbGVjdG9ycywgbWFwfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZsYXR0ZW48VD4oYTogVFtdW10pIHtcbiAgcmV0dXJuICg8VFtdPltdKS5jb25jYXQoLi4uYSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTdWZmaXgodmFsdWU6IHN0cmluZywgc3VmZml4OiBzdHJpbmcpIHtcbiAgaWYgKHZhbHVlLmVuZHNXaXRoKHN1ZmZpeCkpIHJldHVybiB2YWx1ZS5zdWJzdHJpbmcoMCwgdmFsdWUubGVuZ3RoIC0gc3VmZml4Lmxlbmd0aCk7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZXNjcmlwdFZlcnNpb24obG93OiBzdHJpbmcsIGhpZ2g/OiBzdHJpbmcpIHtcbiAgY29uc3QgdmVyc2lvbiA9IHRzLnZlcnNpb247XG5cbiAgaWYgKHZlcnNpb24uc3Vic3RyaW5nKDAsIGxvdy5sZW5ndGgpIDwgbG93KSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGhpZ2ggJiYgKHZlcnNpb24uc3Vic3RyaW5nKDAsIGhpZ2gubGVuZ3RoKSA+IGhpZ2gpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbzogQXN0UmVzdWx0KTogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyB7XG4gIHJldHVybiB7XG4gICAgZmlsZU5hbWU6IGluZm8udGVtcGxhdGUuZmlsZU5hbWUsXG4gICAgb2Zmc2V0OiBpbmZvLnRlbXBsYXRlLnNwYW4uc3RhcnQsXG4gICAgcXVlcnk6IGluZm8udGVtcGxhdGUucXVlcnksXG4gICAgbWVtYmVyczogaW5mby50ZW1wbGF0ZS5tZW1iZXJzLFxuICAgIGh0bWxBc3Q6IGluZm8uaHRtbEFzdCxcbiAgICB0ZW1wbGF0ZUFzdDogaW5mby50ZW1wbGF0ZUFzdFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFRlbXBsYXRlQXN0QXQoXG4gICAgYXN0OiBUZW1wbGF0ZUFzdFtdLCBwb3NpdGlvbjogbnVtYmVyLCBhbGxvd1dpZGVuaW5nOiBib29sZWFuID0gZmFsc2UpOiBUZW1wbGF0ZUFzdFBhdGgge1xuICBjb25zdCBwYXRoOiBUZW1wbGF0ZUFzdFtdID0gW107XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICBsZXQgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKGluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgICAgIGlmICghbGVuIHx8IGFsbG93V2lkZW5pbmcgfHwgaXNOYXJyb3dlcihzcGFuLCBzcGFuT2YocGF0aFtsZW4gLSAxXSkpKSB7XG4gICAgICAgICAgcGF0aC5wdXNoKGFzdCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldHVybmluZyBhIHZhbHVlIGhlcmUgd2lsbCByZXN1bHQgaW4gdGhlIGNoaWxkcmVuIGJlaW5nIHNraXBwZWQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHtcbiAgICAgICAgLy8gSWdub3JlIHJlZmVyZW5jZSwgdmFyaWFibGUgYW5kIHByb3ZpZGVyc1xuICAgICAgICB2aXNpdChhc3QuYXR0cnMpO1xuICAgICAgICB2aXNpdChhc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5jaGlsZHJlbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIC8vIEluZ25vcmUgcHJvdmlkZXJzXG4gICAgICAgIHZpc2l0KGFzdC5hdHRycyk7XG4gICAgICAgIHZpc2l0KGFzdC5pbnB1dHMpO1xuICAgICAgICB2aXNpdChhc3Qub3V0cHV0cyk7XG4gICAgICAgIHZpc2l0KGFzdC5yZWZlcmVuY2VzKTtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXREaXJlY3RpdmUoYXN0OiBEaXJlY3RpdmVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICAvLyBJZ25vcmUgdGhlIGhvc3QgcHJvcGVydGllcyBvZiBhIGRpcmVjdGl2ZVxuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52aXNpdENoaWxkcmVuKGNvbnRleHQsIHZpc2l0ID0+IHsgdmlzaXQoYXN0LmlucHV0cyk7IH0pO1xuICAgICAgLy8gV2UgbmV2ZXIgY2FyZSBhYm91dCB0aGUgZGlyZXRpdmUgaXRzZWxmLCBqdXN0IGl0cyBpbnB1dHMuXG4gICAgICBpZiAocGF0aFtwYXRoLmxlbmd0aCAtIDFdID09IGFzdCkge1xuICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG5cbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBhc3QpO1xuXG4gIHJldHVybiBuZXcgQXN0UGF0aDxUZW1wbGF0ZUFzdD4ocGF0aCwgcG9zaXRpb24pO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbm9kZSB0aGF0IG1vc3QgdGlnaHRseSBlbmNvbXBhc3MgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICogQHBhcmFtIG5vZGVcbiAqIEBwYXJhbSBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFRpZ2h0ZXN0Tm9kZShub2RlOiB0cy5Ob2RlLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICBpZiAobm9kZS5nZXRTdGFydCgpIDw9IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgbm9kZS5nZXRFbmQoKSkge1xuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRUaWdodGVzdE5vZGUoYywgcG9zaXRpb24pKSB8fCBub2RlO1xuICB9XG59XG5cbmludGVyZmFjZSBEaXJlY3RpdmVDbGFzc0xpa2Uge1xuICBkZWNvcmF0b3JJZDogdHMuSWRlbnRpZmllcjsgIC8vIGRlY29yYXRvciBpZGVudGlmaWVyXG4gIGNsYXNzRGVjbDogdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm4gbWV0YWRhdGEgYWJvdXQgYG5vZGVgIGlmIGl0IGxvb2tzIGxpa2UgYW4gQW5ndWxhciBkaXJlY3RpdmUgY2xhc3MuXG4gKiBJbiB0aGlzIGNhc2UsIHBvdGVudGlhbCBtYXRjaGVzIGFyZSBgQE5nTW9kdWxlYCwgYEBDb21wb25lbnRgLCBgQERpcmVjdGl2ZWAsXG4gKiBgQFBpcGVgLCBldGMuXG4gKiBUaGVzZSBjbGFzcyBkZWNsYXJhdGlvbnMgYWxsIHNoYXJlIHNvbWUgY29tbW9uIGF0dHJpYnV0ZXMsIG5hbWVseSB0aGVpclxuICogZGVjb3JhdG9yIHRha2VzIGV4YWN0bHkgb25lIHBhcmFtZXRlciBhbmQgdGhlIHBhcmFtZXRlciBtdXN0IGJlIGFuIG9iamVjdFxuICogbGl0ZXJhbC5cbiAqXG4gKiBGb3IgZXhhbXBsZSxcbiAqICAgICB2LS0tLS0tLS0tLSBgZGVjb3JhdG9ySWRgXG4gKiBATmdNb2R1bGUoe1xuICogICBkZWNsYXJhdGlvbnM6IFtdLFxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogICAgICAgICAgXi0tLS0tIGBjbGFzc0RlY2xgXG4gKlxuICogQHBhcmFtIG5vZGUgUG90ZW50aWFsIG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlQ2xhc3NMaWtlKG5vZGU6IHRzLk5vZGUpOiBEaXJlY3RpdmVDbGFzc0xpa2V8dW5kZWZpbmVkIHtcbiAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgfHwgIW5vZGUubmFtZSB8fCAhbm9kZS5kZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgZCBvZiBub2RlLmRlY29yYXRvcnMpIHtcbiAgICBjb25zdCBleHByID0gZC5leHByZXNzaW9uO1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByKSB8fCBleHByLmFyZ3VtZW50cy5sZW5ndGggIT09IDEgfHxcbiAgICAgICAgIXRzLmlzSWRlbnRpZmllcihleHByLmV4cHJlc3Npb24pKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgYXJnID0gZXhwci5hcmd1bWVudHNbMF07XG4gICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oYXJnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGVjb3JhdG9ySWQ6IGV4cHIuZXhwcmVzc2lvbixcbiAgICAgICAgY2xhc3NEZWNsOiBub2RlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBhc3NpZ25tZW50IHRoYXQgaXMgbmVzdGVkIGluIGEgVHlwZVNjcmlwdCBub2RlIGFuZCBpcyBvZiBhIGNlcnRhaW5cbiAqIHR5cGUgVC5cbiAqXG4gKiBAcGFyYW0gc3RhcnROb2RlIG5vZGUgdG8gc3RhcnQgc2VhcmNoaW5nIGZvciBuZXN0ZWQgcHJvcGVydHkgYXNzaWdubWVudCBmcm9tXG4gKiBAcGFyYW0gcHJvcE5hbWUgcHJvcGVydHkgYXNzaWdubWVudCBuYW1lXG4gKiBAcGFyYW0gcHJlZGljYXRlIGZ1bmN0aW9uIHRvIHZlcmlmeSB0aGF0IGEgbm9kZSBpcyBvZiB0eXBlIFQuXG4gKiBAcmV0dXJuIG5vZGUgcHJvcGVydHkgYXNzaWdubWVudCB2YWx1ZSBvZiB0eXBlIFQsIG9yIHVuZGVmaW5lZCBpZiBub25lIGlzIGZvdW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZTxUIGV4dGVuZHMgdHMuTm9kZT4oXG4gICAgc3RhcnROb2RlOiB0cy5Ob2RlLCBwcm9wTmFtZTogc3RyaW5nLCBwcmVkaWNhdGU6IChub2RlOiB0cy5Ob2RlKSA9PiBub2RlIGlzIFQpOiBUfHVuZGVmaW5lZCB7XG4gIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChzdGFydE5vZGUpICYmIHN0YXJ0Tm9kZS5uYW1lLmdldFRleHQoKSA9PT0gcHJvcE5hbWUpIHtcbiAgICBjb25zdCB7aW5pdGlhbGl6ZXJ9ID0gc3RhcnROb2RlO1xuICAgIGlmIChwcmVkaWNhdGUoaW5pdGlhbGl6ZXIpKSByZXR1cm4gaW5pdGlhbGl6ZXI7XG4gIH1cbiAgcmV0dXJuIHN0YXJ0Tm9kZS5mb3JFYWNoQ2hpbGQoYyA9PiBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShjLCBwcm9wTmFtZSwgcHJlZGljYXRlKSk7XG59XG4iXX0=