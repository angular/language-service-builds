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
                        compiler_1.identifierName(diDep.token.identifier) === 'TemplateRef')
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1E7SUFFbFEsK0JBQWlDO0lBV2pDLFNBQWdCLGlCQUFpQixDQUFDLEtBQVU7UUFDMUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUZELDhDQUVDO0lBS0QsU0FBZ0IsTUFBTSxDQUFDLElBQW1DO1FBQ3hELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDNUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1NBQ3pEO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBRyxDQUFDLEdBQUc7aUJBQzNELENBQUM7YUFDSDtZQUNELE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQztTQUMvRTtJQUNILENBQUM7SUFmRCx3QkFlQztJQUVELFNBQWdCLE1BQU0sQ0FBQyxRQUFnQixFQUFFLElBQVcsRUFBRSxTQUFtQjtRQUN2RSxPQUFPLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBSEQsd0JBR0M7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBVSxFQUFFLE1BQWM7UUFDbkQsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRkQsZ0NBRUM7SUFFRCxTQUFnQixVQUFVLENBQUMsS0FBVyxFQUFFLEtBQVc7UUFDakQsT0FBTyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlELENBQUM7SUFGRCxnQ0FFQztJQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQXlCOztRQUM1RCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7O2dCQUNmLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUExQixJQUFJLEtBQUssV0FBQTtvQkFDWixJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVO3dCQUNyQyx5QkFBYyxDQUFDLEtBQUssQ0FBQyxLQUFPLENBQUMsVUFBWSxDQUFDLEtBQUssYUFBYTt3QkFDOUQsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBVEQsb0RBU0M7SUFFRCxTQUFnQixZQUFZLENBQUMsSUFBZTs7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7UUFDNUQsSUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQzs7WUFDbEMsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQXBDLElBQU0sU0FBUyxXQUFBO2dCQUNsQixJQUFNLFNBQVMsR0FBa0Isc0JBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVUsQ0FBQyxDQUFDOztvQkFDekUsS0FBdUIsSUFBQSw2QkFBQSxpQkFBQSxTQUFTLENBQUEsQ0FBQSxvQ0FBQSwyREFBRTt3QkFBN0IsSUFBTSxRQUFRLHNCQUFBO3dCQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztxQkFDOUI7Ozs7Ozs7OzthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLEtBQUEsRUFBQyxDQUFDO0lBQ25DLENBQUM7SUFYRCxvQ0FXQztJQUVELFNBQWdCLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxJQUFhO1FBQzVELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUM7UUFFM0IsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXpELElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXJFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQVJELGtEQVFDO0lBRUQsU0FBZ0IsOEJBQThCLENBQUMsSUFBZTtRQUM1RCxPQUFPO1lBQ0wsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtZQUNoQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO1lBQzFCLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87WUFDOUIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQVRELHdFQVNDO0lBRUQsU0FBZ0IsaUJBQWlCLENBQzdCLEdBQWtCLEVBQUUsUUFBZ0IsRUFBRSxhQUE4QjtRQUE5Qiw4QkFBQSxFQUFBLHFCQUE4QjtRQUN0RSxJQUFNLElBQUksR0FBa0IsRUFBRSxDQUFDO1FBQy9CLElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUEyQjtZQUF6Qzs7WUE0Q3BCLENBQUM7WUEzQ0MsdUJBQUssR0FBTCxVQUFNLEdBQWdCLEVBQUUsT0FBWTtnQkFDbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksYUFBYSxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNwRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNoQjtpQkFDRjtxQkFBTTtvQkFDTCxvRUFBb0U7b0JBQ3BFLE9BQU8sSUFBSSxDQUFDO2lCQUNiO1lBQ0gsQ0FBQztZQUVELHVDQUFxQixHQUFyQixVQUFzQixHQUF3QixFQUFFLE9BQVk7Z0JBQzFELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsVUFBQSxLQUFLO29CQUN0QywyQ0FBMkM7b0JBQzNDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2pCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELDhCQUFZLEdBQVosVUFBYSxHQUFlLEVBQUUsT0FBWTtnQkFDeEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLG9CQUFvQjtvQkFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsZ0NBQWMsR0FBZCxVQUFlLEdBQWlCLEVBQUUsT0FBWTtnQkFDNUMsNENBQTRDO2dCQUM1QyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUssSUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVFLDREQUE0RDtnQkFDNUQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDWjtnQkFDRCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUE1Q21CLENBQWMsc0NBQTJCLEVBNEM1RCxDQUFDO1FBRUYsMkJBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRS9CLE9BQU8sSUFBSSxrQkFBTyxDQUFjLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBcERELDhDQW9EQztJQUVEOzs7O09BSUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhLEVBQUUsUUFBZ0I7UUFDOUQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksUUFBUSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDM0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUE3QixDQUE2QixDQUFDLElBQUksSUFBSSxDQUFDO1NBQ3RFO0lBQ0gsQ0FBQztJQUpELDRDQUlDO0lBT0Q7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUJHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBYTs7UUFDakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2xFLE9BQU87U0FDUjs7WUFDRCxLQUFnQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBNUIsSUFBTSxDQUFDLFdBQUE7Z0JBQ1YsSUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO29CQUN6RCxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNyQyxTQUFTO2lCQUNWO2dCQUNELElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNyQyxPQUFPO3dCQUNMLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVTt3QkFDNUIsU0FBUyxFQUFFLElBQUk7cUJBQ2hCLENBQUM7aUJBQ0g7YUFDRjs7Ozs7Ozs7O0lBQ0gsQ0FBQztJQWxCRCxzREFrQkM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLHVCQUF1QixDQUNuQyxTQUFrQixFQUFFLFFBQWdCLEVBQUUsU0FBdUM7UUFDL0UsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUU7WUFDeEUsSUFBQSxtQ0FBVyxDQUFjO1lBQ2hDLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQztnQkFBRSxPQUFPLFdBQVcsQ0FBQztTQUNoRDtRQUNELE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLHVCQUF1QixDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQS9DLENBQStDLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBUEQsMERBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXN0UGF0aCwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIENvbXBpbGVUeXBlTWV0YWRhdGEsIENzc1NlbGVjdG9yLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIEVtYmVkZGVkVGVtcGxhdGVBc3QsIFBhcnNlU291cmNlU3BhbiwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBUZW1wbGF0ZUFzdCwgVGVtcGxhdGVBc3RQYXRoLCBpZGVudGlmaWVyTmFtZSwgdGVtcGxhdGVWaXNpdEFsbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdCwgU2VsZWN0b3JJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge1NwYW59IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNwYW5Ib2xkZXIge1xuICBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG4gIGVuZFNvdXJjZVNwYW4/OiBQYXJzZVNvdXJjZVNwYW58bnVsbDtcbiAgY2hpbGRyZW4/OiBTcGFuSG9sZGVyW107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhcnNlU291cmNlU3Bhbih2YWx1ZTogYW55KTogdmFsdWUgaXMgUGFyc2VTb3VyY2VTcGFuIHtcbiAgcmV0dXJuIHZhbHVlICYmICEhdmFsdWUuc3RhcnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3BhbjogU3BhbkhvbGRlcik6IFNwYW47XG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW46IFBhcnNlU291cmNlU3Bhbik6IFNwYW47XG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW46IFNwYW5Ib2xkZXIgfCBQYXJzZVNvdXJjZVNwYW4gfCB1bmRlZmluZWQpOiBTcGFufHVuZGVmaW5lZDtcbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3Bhbj86IFNwYW5Ib2xkZXIgfCBQYXJzZVNvdXJjZVNwYW4pOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmICghc3BhbikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKGlzUGFyc2VTb3VyY2VTcGFuKHNwYW4pKSB7XG4gICAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmQub2Zmc2V0fTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoc3Bhbi5lbmRTb3VyY2VTcGFuKSB7XG4gICAgICByZXR1cm4ge3N0YXJ0OiBzcGFuLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kU291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbiAgICB9IGVsc2UgaWYgKHNwYW4uY2hpbGRyZW4gJiYgc3Bhbi5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXJ0OiBzcGFuLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICBlbmQ6IHNwYW5PZihzcGFuLmNoaWxkcmVuW3NwYW4uY2hpbGRyZW4ubGVuZ3RoIC0gMV0pICEuZW5kXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge3N0YXJ0OiBzcGFuLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uc291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5TcGFuKHBvc2l0aW9uOiBudW1iZXIsIHNwYW4/OiBTcGFuLCBleGNsdXNpdmU/OiBib29sZWFuKTogYm9vbGVhbiB7XG4gIHJldHVybiBzcGFuICE9IG51bGwgJiYgKGV4Y2x1c2l2ZSA/IHBvc2l0aW9uID49IHNwYW4uc3RhcnQgJiYgcG9zaXRpb24gPCBzcGFuLmVuZCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID49IHNwYW4uc3RhcnQgJiYgcG9zaXRpb24gPD0gc3Bhbi5lbmQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb2Zmc2V0U3BhbihzcGFuOiBTcGFuLCBhbW91bnQ6IG51bWJlcik6IFNwYW4ge1xuICByZXR1cm4ge3N0YXJ0OiBzcGFuLnN0YXJ0ICsgYW1vdW50LCBlbmQ6IHNwYW4uZW5kICsgYW1vdW50fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFycm93ZXIoc3BhbkE6IFNwYW4sIHNwYW5COiBTcGFuKTogYm9vbGVhbiB7XG4gIHJldHVybiBzcGFuQS5zdGFydCA+PSBzcGFuQi5zdGFydCAmJiBzcGFuQS5lbmQgPD0gc3BhbkIuZW5kO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzVGVtcGxhdGVSZWZlcmVuY2UodHlwZTogQ29tcGlsZVR5cGVNZXRhZGF0YSk6IGJvb2xlYW4ge1xuICBpZiAodHlwZS5kaURlcHMpIHtcbiAgICBmb3IgKGxldCBkaURlcCBvZiB0eXBlLmRpRGVwcykge1xuICAgICAgaWYgKGRpRGVwLnRva2VuICYmIGRpRGVwLnRva2VuLmlkZW50aWZpZXIgJiZcbiAgICAgICAgICBpZGVudGlmaWVyTmFtZShkaURlcC50b2tlbiAhLmlkZW50aWZpZXIgISkgPT09ICdUZW1wbGF0ZVJlZicpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZWxlY3RvcnMoaW5mbzogQXN0UmVzdWx0KTogU2VsZWN0b3JJbmZvIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxDc3NTZWxlY3RvciwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnk+KCk7XG4gIGNvbnN0IHJlc3VsdHM6IENzc1NlbGVjdG9yW10gPSBbXTtcbiAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW5mby5kaXJlY3RpdmVzKSB7XG4gICAgY29uc3Qgc2VsZWN0b3JzOiBDc3NTZWxlY3RvcltdID0gQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yICEpO1xuICAgIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgICByZXN1bHRzLnB1c2goc2VsZWN0b3IpO1xuICAgICAgbWFwLnNldChzZWxlY3RvciwgZGlyZWN0aXZlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtzZWxlY3RvcnM6IHJlc3VsdHMsIG1hcH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVzY3JpcHRWZXJzaW9uKGxvdzogc3RyaW5nLCBoaWdoPzogc3RyaW5nKSB7XG4gIGNvbnN0IHZlcnNpb24gPSB0cy52ZXJzaW9uO1xuXG4gIGlmICh2ZXJzaW9uLnN1YnN0cmluZygwLCBsb3cubGVuZ3RoKSA8IGxvdykgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChoaWdoICYmICh2ZXJzaW9uLnN1YnN0cmluZygwLCBoaWdoLmxlbmd0aCkgPiBoaWdoKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm86IEFzdFJlc3VsdCk6IERpYWdub3N0aWNUZW1wbGF0ZUluZm8ge1xuICByZXR1cm4ge1xuICAgIGZpbGVOYW1lOiBpbmZvLnRlbXBsYXRlLmZpbGVOYW1lLFxuICAgIG9mZnNldDogaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgIHF1ZXJ5OiBpbmZvLnRlbXBsYXRlLnF1ZXJ5LFxuICAgIG1lbWJlcnM6IGluZm8udGVtcGxhdGUubWVtYmVycyxcbiAgICBodG1sQXN0OiBpbmZvLmh0bWxBc3QsXG4gICAgdGVtcGxhdGVBc3Q6IGluZm8udGVtcGxhdGVBc3RcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRUZW1wbGF0ZUFzdEF0KFxuICAgIGFzdDogVGVtcGxhdGVBc3RbXSwgcG9zaXRpb246IG51bWJlciwgYWxsb3dXaWRlbmluZzogYm9vbGVhbiA9IGZhbHNlKTogVGVtcGxhdGVBc3RQYXRoIHtcbiAgY29uc3QgcGF0aDogVGVtcGxhdGVBc3RbXSA9IFtdO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgbGV0IHNwYW4gPSBzcGFuT2YoYXN0KTtcbiAgICAgIGlmIChpblNwYW4ocG9zaXRpb24sIHNwYW4pKSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICAgICAgICBpZiAoIWxlbiB8fCBhbGxvd1dpZGVuaW5nIHx8IGlzTmFycm93ZXIoc3Bhbiwgc3Bhbk9mKHBhdGhbbGVuIC0gMV0pKSkge1xuICAgICAgICAgIHBhdGgucHVzaChhc3QpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIC8vIElnbm9yZSByZWZlcmVuY2UsIHZhcmlhYmxlIGFuZCBwcm92aWRlcnNcbiAgICAgICAgdmlzaXQoYXN0LmF0dHJzKTtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICAvLyBJbmdub3JlIHByb3ZpZGVyc1xuICAgICAgICB2aXNpdChhc3QuYXR0cnMpO1xuICAgICAgICB2aXNpdChhc3QuaW5wdXRzKTtcbiAgICAgICAgdmlzaXQoYXN0Lm91dHB1dHMpO1xuICAgICAgICB2aXNpdChhc3QucmVmZXJlbmNlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgLy8gSWdub3JlIHRoZSBob3N0IHByb3BlcnRpZXMgb2YgYSBkaXJlY3RpdmVcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7IHZpc2l0KGFzdC5pbnB1dHMpOyB9KTtcbiAgICAgIC8vIFdlIG5ldmVyIGNhcmUgYWJvdXQgdGhlIGRpcmV0aXZlIGl0c2VsZiwganVzdCBpdHMgaW5wdXRzLlxuICAgICAgaWYgKHBhdGhbcGF0aC5sZW5ndGggLSAxXSA9PT0gYXN0KSB7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcblxuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGFzdCk7XG5cbiAgcmV0dXJuIG5ldyBBc3RQYXRoPFRlbXBsYXRlQXN0PihwYXRoLCBwb3NpdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBub2RlIHRoYXQgbW9zdCB0aWdodGx5IGVuY29tcGFzcyB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gKiBAcGFyYW0gbm9kZVxuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVGlnaHRlc3ROb2RlKG5vZGU6IHRzLk5vZGUsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfHVuZGVmaW5lZCB7XG4gIGlmIChub2RlLmdldFN0YXJ0KCkgPD0gcG9zaXRpb24gJiYgcG9zaXRpb24gPCBub2RlLmdldEVuZCgpKSB7XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKGMgPT4gZmluZFRpZ2h0ZXN0Tm9kZShjLCBwb3NpdGlvbikpIHx8IG5vZGU7XG4gIH1cbn1cblxuaW50ZXJmYWNlIERpcmVjdGl2ZUNsYXNzTGlrZSB7XG4gIGRlY29yYXRvcklkOiB0cy5JZGVudGlmaWVyOyAgLy8gZGVjb3JhdG9yIGlkZW50aWZpZXJcbiAgY2xhc3NEZWNsOiB0cy5DbGFzc0RlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIFJldHVybiBtZXRhZGF0YSBhYm91dCBgbm9kZWAgaWYgaXQgbG9va3MgbGlrZSBhbiBBbmd1bGFyIGRpcmVjdGl2ZSBjbGFzcy5cbiAqIEluIHRoaXMgY2FzZSwgcG90ZW50aWFsIG1hdGNoZXMgYXJlIGBATmdNb2R1bGVgLCBgQENvbXBvbmVudGAsIGBARGlyZWN0aXZlYCxcbiAqIGBAUGlwZWAsIGV0Yy5cbiAqIFRoZXNlIGNsYXNzIGRlY2xhcmF0aW9ucyBhbGwgc2hhcmUgc29tZSBjb21tb24gYXR0cmlidXRlcywgbmFtZWx5IHRoZWlyXG4gKiBkZWNvcmF0b3IgdGFrZXMgZXhhY3RseSBvbmUgcGFyYW1ldGVyIGFuZCB0aGUgcGFyYW1ldGVyIG11c3QgYmUgYW4gb2JqZWN0XG4gKiBsaXRlcmFsLlxuICpcbiAqIEZvciBleGFtcGxlLFxuICogICAgIHYtLS0tLS0tLS0tIGBkZWNvcmF0b3JJZGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGRlY2xhcmF0aW9uczogW10sXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiAgICAgICAgICBeLS0tLS0gYGNsYXNzRGVjbGBcbiAqXG4gKiBAcGFyYW0gbm9kZSBQb3RlbnRpYWwgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gQW5ndWxhciBkaXJlY3RpdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVDbGFzc0xpa2Uobm9kZTogdHMuTm9kZSk6IERpcmVjdGl2ZUNsYXNzTGlrZXx1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSB8fCAhbm9kZS5uYW1lIHx8ICFub2RlLmRlY29yYXRvcnMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yIChjb25zdCBkIG9mIG5vZGUuZGVjb3JhdG9ycykge1xuICAgIGNvbnN0IGV4cHIgPSBkLmV4cHJlc3Npb247XG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHIpIHx8IGV4cHIuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGV4cHIuZXhwcmVzc2lvbikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBhcmcgPSBleHByLmFyZ3VtZW50c1swXTtcbiAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihhcmcpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZWNvcmF0b3JJZDogZXhwci5leHByZXNzaW9uLFxuICAgICAgICBjbGFzc0RlY2w6IG5vZGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEZpbmRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGFzc2lnbm1lbnQgdGhhdCBpcyBuZXN0ZWQgaW4gYSBUeXBlU2NyaXB0IG5vZGUgYW5kIGlzIG9mIGEgY2VydGFpblxuICogdHlwZSBULlxuICpcbiAqIEBwYXJhbSBzdGFydE5vZGUgbm9kZSB0byBzdGFydCBzZWFyY2hpbmcgZm9yIG5lc3RlZCBwcm9wZXJ0eSBhc3NpZ25tZW50IGZyb21cbiAqIEBwYXJhbSBwcm9wTmFtZSBwcm9wZXJ0eSBhc3NpZ25tZW50IG5hbWVcbiAqIEBwYXJhbSBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdmVyaWZ5IHRoYXQgYSBub2RlIGlzIG9mIHR5cGUgVC5cbiAqIEByZXR1cm4gbm9kZSBwcm9wZXJ0eSBhc3NpZ25tZW50IHZhbHVlIG9mIHR5cGUgVCwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgaXMgZm91bmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQcm9wZXJ0eVZhbHVlT2ZUeXBlPFQgZXh0ZW5kcyB0cy5Ob2RlPihcbiAgICBzdGFydE5vZGU6IHRzLk5vZGUsIHByb3BOYW1lOiBzdHJpbmcsIHByZWRpY2F0ZTogKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgVCk6IFR8dW5kZWZpbmVkIHtcbiAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHN0YXJ0Tm9kZSkgJiYgc3RhcnROb2RlLm5hbWUuZ2V0VGV4dCgpID09PSBwcm9wTmFtZSkge1xuICAgIGNvbnN0IHtpbml0aWFsaXplcn0gPSBzdGFydE5vZGU7XG4gICAgaWYgKHByZWRpY2F0ZShpbml0aWFsaXplcikpIHJldHVybiBpbml0aWFsaXplcjtcbiAgfVxuICByZXR1cm4gc3RhcnROb2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRQcm9wZXJ0eVZhbHVlT2ZUeXBlKGMsIHByb3BOYW1lLCBwcmVkaWNhdGUpKTtcbn1cbiJdfQ==