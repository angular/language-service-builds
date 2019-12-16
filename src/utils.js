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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1E7SUFDbFEsK0JBQWlDO0lBWWpDLFNBQWdCLGlCQUFpQixDQUFDLEtBQVU7UUFDMUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUZELDhDQUVDO0lBS0QsU0FBZ0IsTUFBTSxDQUFDLElBQW1DO1FBQ3hELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDNUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1NBQ3pEO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBRyxDQUFDLEdBQUc7aUJBQzNELENBQUM7YUFDSDtZQUNELE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQztTQUMvRTtJQUNILENBQUM7SUFmRCx3QkFlQztJQUVELFNBQWdCLE1BQU0sQ0FBQyxRQUFnQixFQUFFLElBQVcsRUFBRSxTQUFtQjtRQUN2RSxPQUFPLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBSEQsd0JBR0M7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBVSxFQUFFLE1BQWM7UUFDbkQsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRkQsZ0NBRUM7SUFFRCxTQUFnQixVQUFVLENBQUMsS0FBVyxFQUFFLEtBQVc7UUFDakQsT0FBTyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlELENBQUM7SUFGRCxnQ0FFQztJQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQXlCOztRQUM1RCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7O2dCQUNmLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUExQixJQUFJLEtBQUssV0FBQTtvQkFDWixJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVO3dCQUNyQyx5QkFBYyxDQUFDLEtBQUssQ0FBQyxLQUFPLENBQUMsVUFBWSxDQUFDLEtBQUssYUFBYTt3QkFDOUQsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBVEQsb0RBU0M7SUFFRCxTQUFnQixZQUFZLENBQUMsSUFBZTs7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7UUFDNUQsSUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQzs7WUFDbEMsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQXBDLElBQU0sU0FBUyxXQUFBO2dCQUNsQixJQUFNLFNBQVMsR0FBa0Isc0JBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVUsQ0FBQyxDQUFDOztvQkFDekUsS0FBdUIsSUFBQSw2QkFBQSxpQkFBQSxTQUFTLENBQUEsQ0FBQSxvQ0FBQSwyREFBRTt3QkFBN0IsSUFBTSxRQUFRLHNCQUFBO3dCQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztxQkFDOUI7Ozs7Ozs7OzthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLEtBQUEsRUFBQyxDQUFDO0lBQ25DLENBQUM7SUFYRCxvQ0FXQztJQUVELFNBQWdCLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxJQUFhO1FBQzVELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUM7UUFFM0IsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXpELElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXJFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQVJELGtEQVFDO0lBRUQsU0FBZ0IsOEJBQThCLENBQUMsSUFBZTtRQUM1RCxPQUFPO1lBQ0wsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtZQUNoQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO1lBQzFCLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87WUFDOUIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQVRELHdFQVNDO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUMsR0FBa0IsRUFBRSxRQUFnQjtRQUNwRSxJQUFNLElBQUksR0FBa0IsRUFBRSxDQUFDO1FBQy9CLElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUEyQjtZQUF6Qzs7WUE0Q3BCLENBQUM7WUEzQ0MsdUJBQUssR0FBTCxVQUFNLEdBQWdCLEVBQUUsT0FBWTtnQkFDbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2hCO2lCQUNGO3FCQUFNO29CQUNMLG9FQUFvRTtvQkFDcEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBRUQsdUNBQXFCLEdBQXJCLFVBQXNCLEdBQXdCLEVBQUUsT0FBWTtnQkFDMUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLDJDQUEyQztvQkFDM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsOEJBQVksR0FBWixVQUFhLEdBQWUsRUFBRSxPQUFZO2dCQUN4QyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQUEsS0FBSztvQkFDdEMsb0JBQW9CO29CQUNwQixLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNsQixLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxnQ0FBYyxHQUFkLFVBQWUsR0FBaUIsRUFBRSxPQUFZO2dCQUM1Qyw0Q0FBNEM7Z0JBQzVDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQUEsS0FBSyxJQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUUsNERBQTREO2dCQUM1RCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtvQkFDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2lCQUNaO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUM7WUFDSCxjQUFDO1FBQUQsQ0FBQyxBQTVDbUIsQ0FBYyxzQ0FBMkIsRUE0QzVELENBQUM7UUFFRiwyQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFL0IsT0FBTyxJQUFJLGtCQUFPLENBQWMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFuREQsOENBbURDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxRQUFnQjtRQUM5RCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMzRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQTdCLENBQTZCLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDdEU7SUFDSCxDQUFDO0lBSkQsNENBSUM7SUFPRDs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FpQkc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUFhOztRQUNqRCxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbEUsT0FBTztTQUNSOztZQUNELEtBQWdCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE1QixJQUFNLENBQUMsV0FBQTtnQkFDVixJQUFNLElBQUksR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO2dCQUMxQixJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7b0JBQ3pELENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3JDLFNBQVM7aUJBQ1Y7Z0JBQ0QsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3JDLE9BQU87d0JBQ0wsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUM1QixTQUFTLEVBQUUsSUFBSTtxQkFDaEIsQ0FBQztpQkFDSDthQUNGOzs7Ozs7Ozs7SUFDSCxDQUFDO0lBbEJELHNEQWtCQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsU0FBZ0IsdUJBQXVCLENBQ25DLFNBQWtCLEVBQUUsUUFBZ0IsRUFBRSxTQUF1QztRQUMvRSxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFFBQVEsRUFBRTtZQUN4RSxJQUFBLG1DQUFXLENBQWM7WUFDaEMsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDO2dCQUFFLE9BQU8sV0FBVyxDQUFDO1NBQ2hEO1FBQ0QsT0FBTyxTQUFTLENBQUMsWUFBWSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBL0MsQ0FBK0MsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFQRCwwREFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBc3RQYXRoLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZVR5cGVNZXRhZGF0YSwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIGlkZW50aWZpZXJOYW1lLCB0ZW1wbGF0ZVZpc2l0QWxsfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RSZXN1bHQsIFNlbGVjdG9ySW5mb30gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtTcGFufSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBTcGFuSG9sZGVyIHtcbiAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xuICBlbmRTb3VyY2VTcGFuPzogUGFyc2VTb3VyY2VTcGFufG51bGw7XG4gIGNoaWxkcmVuPzogU3BhbkhvbGRlcltdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQYXJzZVNvdXJjZVNwYW4odmFsdWU6IGFueSk6IHZhbHVlIGlzIFBhcnNlU291cmNlU3BhbiB7XG4gIHJldHVybiB2YWx1ZSAmJiAhIXZhbHVlLnN0YXJ0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW46IFNwYW5Ib2xkZXIpOiBTcGFuO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBTcGFuSG9sZGVyIHwgUGFyc2VTb3VyY2VTcGFuIHwgdW5kZWZpbmVkKTogU3Bhbnx1bmRlZmluZWQ7XG5leHBvcnQgZnVuY3Rpb24gc3Bhbk9mKHNwYW4/OiBTcGFuSG9sZGVyIHwgUGFyc2VTb3VyY2VTcGFuKTogU3Bhbnx1bmRlZmluZWQge1xuICBpZiAoIXNwYW4pIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChpc1BhcnNlU291cmNlU3BhbihzcGFuKSkge1xuICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LCBlbmQ6IHNwYW4uZW5kLm9mZnNldH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKHNwYW4uZW5kU291cmNlU3Bhbikge1xuICAgICAgcmV0dXJuIHtzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLmVuZFNvdXJjZVNwYW4uZW5kLm9mZnNldH07XG4gICAgfSBlbHNlIGlmIChzcGFuLmNoaWxkcmVuICYmIHNwYW4uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgZW5kOiBzcGFuT2Yoc3Bhbi5jaGlsZHJlbltzcGFuLmNoaWxkcmVuLmxlbmd0aCAtIDFdKSAhLmVuZFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHtzdGFydDogc3Bhbi5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLnNvdXJjZVNwYW4uZW5kLm9mZnNldH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluU3Bhbihwb3NpdGlvbjogbnVtYmVyLCBzcGFuPzogU3BhbiwgZXhjbHVzaXZlPzogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gc3BhbiAhPSBudWxsICYmIChleGNsdXNpdmUgPyBwb3NpdGlvbiA+PSBzcGFuLnN0YXJ0ICYmIHBvc2l0aW9uIDwgc3Bhbi5lbmQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA+PSBzcGFuLnN0YXJ0ICYmIHBvc2l0aW9uIDw9IHNwYW4uZW5kKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9mZnNldFNwYW4oc3BhbjogU3BhbiwgYW1vdW50OiBudW1iZXIpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydCArIGFtb3VudCwgZW5kOiBzcGFuLmVuZCArIGFtb3VudH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05hcnJvd2VyKHNwYW5BOiBTcGFuLCBzcGFuQjogU3Bhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gc3BhbkEuc3RhcnQgPj0gc3BhbkIuc3RhcnQgJiYgc3BhbkEuZW5kIDw9IHNwYW5CLmVuZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgaWYgKHR5cGUuZGlEZXBzKSB7XG4gICAgZm9yIChsZXQgZGlEZXAgb2YgdHlwZS5kaURlcHMpIHtcbiAgICAgIGlmIChkaURlcC50b2tlbiAmJiBkaURlcC50b2tlbi5pZGVudGlmaWVyICYmXG4gICAgICAgICAgaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4gIS5pZGVudGlmaWVyICEpID09PSAnVGVtcGxhdGVSZWYnKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0b3JzKGluZm86IEFzdFJlc3VsdCk6IFNlbGVjdG9ySW5mbyB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8Q3NzU2VsZWN0b3IsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5PigpO1xuICBjb25zdCByZXN1bHRzOiBDc3NTZWxlY3RvcltdID0gW107XG4gIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGluZm8uZGlyZWN0aXZlcykge1xuICAgIGNvbnN0IHNlbGVjdG9yczogQ3NzU2VsZWN0b3JbXSA9IENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciAhKTtcbiAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgICAgcmVzdWx0cy5wdXNoKHNlbGVjdG9yKTtcbiAgICAgIG1hcC5zZXQoc2VsZWN0b3IsIGRpcmVjdGl2ZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7c2VsZWN0b3JzOiByZXN1bHRzLCBtYXB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlc2NyaXB0VmVyc2lvbihsb3c6IHN0cmluZywgaGlnaD86IHN0cmluZykge1xuICBjb25zdCB2ZXJzaW9uID0gdHMudmVyc2lvbjtcblxuICBpZiAodmVyc2lvbi5zdWJzdHJpbmcoMCwgbG93Lmxlbmd0aCkgPCBsb3cpIHJldHVybiBmYWxzZTtcblxuICBpZiAoaGlnaCAmJiAodmVyc2lvbi5zdWJzdHJpbmcoMCwgaGlnaC5sZW5ndGgpID4gaGlnaCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvOiBBc3RSZXN1bHQpOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvIHtcbiAgcmV0dXJuIHtcbiAgICBmaWxlTmFtZTogaW5mby50ZW1wbGF0ZS5maWxlTmFtZSxcbiAgICBvZmZzZXQ6IGluZm8udGVtcGxhdGUuc3Bhbi5zdGFydCxcbiAgICBxdWVyeTogaW5mby50ZW1wbGF0ZS5xdWVyeSxcbiAgICBtZW1iZXJzOiBpbmZvLnRlbXBsYXRlLm1lbWJlcnMsXG4gICAgaHRtbEFzdDogaW5mby5odG1sQXN0LFxuICAgIHRlbXBsYXRlQXN0OiBpbmZvLnRlbXBsYXRlQXN0XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVGVtcGxhdGVBc3RBdChhc3Q6IFRlbXBsYXRlQXN0W10sIHBvc2l0aW9uOiBudW1iZXIpOiBUZW1wbGF0ZUFzdFBhdGgge1xuICBjb25zdCBwYXRoOiBUZW1wbGF0ZUFzdFtdID0gW107XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICBsZXQgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKGluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgICAgIGlmICghbGVuIHx8IGlzTmFycm93ZXIoc3Bhbiwgc3Bhbk9mKHBhdGhbbGVuIC0gMV0pKSkge1xuICAgICAgICAgIHBhdGgucHVzaChhc3QpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIC8vIElnbm9yZSByZWZlcmVuY2UsIHZhcmlhYmxlIGFuZCBwcm92aWRlcnNcbiAgICAgICAgdmlzaXQoYXN0LmF0dHJzKTtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICAvLyBJbmdub3JlIHByb3ZpZGVyc1xuICAgICAgICB2aXNpdChhc3QuYXR0cnMpO1xuICAgICAgICB2aXNpdChhc3QuaW5wdXRzKTtcbiAgICAgICAgdmlzaXQoYXN0Lm91dHB1dHMpO1xuICAgICAgICB2aXNpdChhc3QucmVmZXJlbmNlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgLy8gSWdub3JlIHRoZSBob3N0IHByb3BlcnRpZXMgb2YgYSBkaXJlY3RpdmVcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7IHZpc2l0KGFzdC5pbnB1dHMpOyB9KTtcbiAgICAgIC8vIFdlIG5ldmVyIGNhcmUgYWJvdXQgdGhlIGRpcmV0aXZlIGl0c2VsZiwganVzdCBpdHMgaW5wdXRzLlxuICAgICAgaWYgKHBhdGhbcGF0aC5sZW5ndGggLSAxXSA9PT0gYXN0KSB7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcblxuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGFzdCk7XG5cbiAgcmV0dXJuIG5ldyBBc3RQYXRoPFRlbXBsYXRlQXN0PihwYXRoLCBwb3NpdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBub2RlIHRoYXQgbW9zdCB0aWdodGx5IGVuY29tcGFzcyB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gKiBAcGFyYW0gbm9kZVxuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVGlnaHRlc3ROb2RlKG5vZGU6IHRzLk5vZGUsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfHVuZGVmaW5lZCB7XG4gIGlmIChub2RlLmdldFN0YXJ0KCkgPD0gcG9zaXRpb24gJiYgcG9zaXRpb24gPCBub2RlLmdldEVuZCgpKSB7XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKGMgPT4gZmluZFRpZ2h0ZXN0Tm9kZShjLCBwb3NpdGlvbikpIHx8IG5vZGU7XG4gIH1cbn1cblxuaW50ZXJmYWNlIERpcmVjdGl2ZUNsYXNzTGlrZSB7XG4gIGRlY29yYXRvcklkOiB0cy5JZGVudGlmaWVyOyAgLy8gZGVjb3JhdG9yIGlkZW50aWZpZXJcbiAgY2xhc3NEZWNsOiB0cy5DbGFzc0RlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIFJldHVybiBtZXRhZGF0YSBhYm91dCBgbm9kZWAgaWYgaXQgbG9va3MgbGlrZSBhbiBBbmd1bGFyIGRpcmVjdGl2ZSBjbGFzcy5cbiAqIEluIHRoaXMgY2FzZSwgcG90ZW50aWFsIG1hdGNoZXMgYXJlIGBATmdNb2R1bGVgLCBgQENvbXBvbmVudGAsIGBARGlyZWN0aXZlYCxcbiAqIGBAUGlwZWAsIGV0Yy5cbiAqIFRoZXNlIGNsYXNzIGRlY2xhcmF0aW9ucyBhbGwgc2hhcmUgc29tZSBjb21tb24gYXR0cmlidXRlcywgbmFtZWx5IHRoZWlyXG4gKiBkZWNvcmF0b3IgdGFrZXMgZXhhY3RseSBvbmUgcGFyYW1ldGVyIGFuZCB0aGUgcGFyYW1ldGVyIG11c3QgYmUgYW4gb2JqZWN0XG4gKiBsaXRlcmFsLlxuICpcbiAqIEZvciBleGFtcGxlLFxuICogICAgIHYtLS0tLS0tLS0tIGBkZWNvcmF0b3JJZGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGRlY2xhcmF0aW9uczogW10sXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiAgICAgICAgICBeLS0tLS0gYGNsYXNzRGVjbGBcbiAqXG4gKiBAcGFyYW0gbm9kZSBQb3RlbnRpYWwgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gQW5ndWxhciBkaXJlY3RpdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVDbGFzc0xpa2Uobm9kZTogdHMuTm9kZSk6IERpcmVjdGl2ZUNsYXNzTGlrZXx1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSB8fCAhbm9kZS5uYW1lIHx8ICFub2RlLmRlY29yYXRvcnMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yIChjb25zdCBkIG9mIG5vZGUuZGVjb3JhdG9ycykge1xuICAgIGNvbnN0IGV4cHIgPSBkLmV4cHJlc3Npb247XG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHIpIHx8IGV4cHIuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGV4cHIuZXhwcmVzc2lvbikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBhcmcgPSBleHByLmFyZ3VtZW50c1swXTtcbiAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihhcmcpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZWNvcmF0b3JJZDogZXhwci5leHByZXNzaW9uLFxuICAgICAgICBjbGFzc0RlY2w6IG5vZGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEZpbmRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGFzc2lnbm1lbnQgdGhhdCBpcyBuZXN0ZWQgaW4gYSBUeXBlU2NyaXB0IG5vZGUgYW5kIGlzIG9mIGEgY2VydGFpblxuICogdHlwZSBULlxuICpcbiAqIEBwYXJhbSBzdGFydE5vZGUgbm9kZSB0byBzdGFydCBzZWFyY2hpbmcgZm9yIG5lc3RlZCBwcm9wZXJ0eSBhc3NpZ25tZW50IGZyb21cbiAqIEBwYXJhbSBwcm9wTmFtZSBwcm9wZXJ0eSBhc3NpZ25tZW50IG5hbWVcbiAqIEBwYXJhbSBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdmVyaWZ5IHRoYXQgYSBub2RlIGlzIG9mIHR5cGUgVC5cbiAqIEByZXR1cm4gbm9kZSBwcm9wZXJ0eSBhc3NpZ25tZW50IHZhbHVlIG9mIHR5cGUgVCwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgaXMgZm91bmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQcm9wZXJ0eVZhbHVlT2ZUeXBlPFQgZXh0ZW5kcyB0cy5Ob2RlPihcbiAgICBzdGFydE5vZGU6IHRzLk5vZGUsIHByb3BOYW1lOiBzdHJpbmcsIHByZWRpY2F0ZTogKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgVCk6IFR8dW5kZWZpbmVkIHtcbiAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHN0YXJ0Tm9kZSkgJiYgc3RhcnROb2RlLm5hbWUuZ2V0VGV4dCgpID09PSBwcm9wTmFtZSkge1xuICAgIGNvbnN0IHtpbml0aWFsaXplcn0gPSBzdGFydE5vZGU7XG4gICAgaWYgKHByZWRpY2F0ZShpbml0aWFsaXplcikpIHJldHVybiBpbml0aWFsaXplcjtcbiAgfVxuICByZXR1cm4gc3RhcnROb2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRQcm9wZXJ0eVZhbHVlT2ZUeXBlKGMsIHByb3BOYW1lLCBwcmVkaWNhdGUpKTtcbn1cbiJdfQ==