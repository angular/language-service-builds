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
    function isStructuralDirective(type) {
        var e_1, _a;
        var _b;
        try {
            for (var _c = tslib_1.__values(type.diDeps), _d = _c.next(); !_d.done; _d = _c.next()) {
                var diDep = _d.value;
                var diDepName = compiler_1.identifierName((_b = diDep.token) === null || _b === void 0 ? void 0 : _b.identifier);
                if (diDepName === compiler_1.Identifiers.TemplateRef.name ||
                    diDepName === compiler_1.Identifiers.ViewContainerRef.name) {
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    }
    exports.isStructuralDirective = isStructuralDirective;
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
            class_1.prototype.visit = function (ast) {
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
     * @NgModule({           <
     *   declarations: [],   < classDecl
     * })                    <
     * class AppModule {}    <
     *          ^----- `classId`
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
                        classId: node.name,
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
    /**
     * Inverts an object's key-value pairs.
     */
    function invertMap(obj) {
        var e_5, _a;
        var result = {};
        try {
            for (var _b = tslib_1.__values(Object.keys(obj)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var name_1 = _c.value;
                var v = obj[name_1];
                result[v] = name_1;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return result;
    }
    exports.invertMap = invertMap;
    /**
     * Finds the directive member providing a template output binding, if one exists.
     * @param info aggregate template AST information
     * @param path narrowing
     */
    function findOutputBinding(binding, path, query) {
        var e_6, _a;
        var element = path.first(compiler_1.ElementAst);
        if (element) {
            try {
                for (var _b = tslib_1.__values(element.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var directive = _c.value;
                    var invertedOutputs = invertMap(directive.directive.outputs);
                    var fieldName = invertedOutputs[binding.name];
                    if (fieldName) {
                        var classSymbol = query.getTypeSymbol(directive.directive.type.reference);
                        if (classSymbol) {
                            return classSymbol.members().get(fieldName);
                        }
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
    }
    exports.findOutputBinding = findOutputBinding;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNlU7SUFDN1UsK0JBQWlDO0lBWWpDLFNBQWdCLGlCQUFpQixDQUFDLEtBQVU7UUFDMUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUZELDhDQUVDO0lBS0QsU0FBZ0IsTUFBTSxDQUFDLElBQW1DO1FBQ3hELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDNUIsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO1NBQ3pEO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU07b0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBRyxDQUFDLEdBQUc7aUJBQzNELENBQUM7YUFDSDtZQUNELE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQztTQUMvRTtJQUNILENBQUM7SUFmRCx3QkFlQztJQUVELFNBQWdCLE1BQU0sQ0FBQyxRQUFnQixFQUFFLElBQVcsRUFBRSxTQUFtQjtRQUN2RSxPQUFPLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBSEQsd0JBR0M7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBVSxFQUFFLE1BQWM7UUFDbkQsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRkQsZ0NBRUM7SUFFRCxTQUFnQixVQUFVLENBQUMsS0FBVyxFQUFFLEtBQVc7UUFDakQsT0FBTyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlELENBQUM7SUFGRCxnQ0FFQztJQUVELFNBQWdCLHFCQUFxQixDQUFDLElBQXlCOzs7O1lBQzdELEtBQW9CLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE1QixJQUFNLEtBQUssV0FBQTtnQkFDZCxJQUFNLFNBQVMsR0FBRyx5QkFBYyxPQUFDLEtBQUssQ0FBQyxLQUFLLDBDQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFNBQVMsS0FBSyxzQkFBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJO29CQUMxQyxTQUFTLEtBQUssc0JBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUU7b0JBQ25ELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQVRELHNEQVNDO0lBRUQsU0FBZ0IsWUFBWSxDQUFDLElBQWU7O1FBQzFDLElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDO1FBQzVELElBQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7O1lBQ2xDLEtBQXdCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO2dCQUFwQyxJQUFNLFNBQVMsV0FBQTtnQkFDbEIsSUFBTSxTQUFTLEdBQWtCLHNCQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFVLENBQUMsQ0FBQzs7b0JBQ3pFLEtBQXVCLElBQUEsNkJBQUEsaUJBQUEsU0FBUyxDQUFBLENBQUEsb0NBQUEsMkRBQUU7d0JBQTdCLElBQU0sUUFBUSxzQkFBQTt3QkFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDdkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7cUJBQzlCOzs7Ozs7Ozs7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxFQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFBLEVBQUMsQ0FBQztJQUNuQyxDQUFDO0lBWEQsb0NBV0M7SUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsSUFBYTtRQUM1RCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO1FBRTNCLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUc7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUV6RCxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUVyRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFSRCxrREFRQztJQUVELFNBQWdCLDhCQUE4QixDQUFDLElBQWU7UUFDNUQsT0FBTztZQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVE7WUFDaEMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztZQUMxQixPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO1lBQzlCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFURCx3RUFTQztJQUVELFNBQWdCLGlCQUFpQixDQUFDLEdBQWtCLEVBQUUsUUFBZ0I7UUFDcEUsSUFBTSxJQUFJLEdBQWtCLEVBQUUsQ0FBQztRQUMvQixJQUFNLE9BQU8sR0FBRztZQUFrQixtQ0FBMkI7WUFBekM7O1lBNENwQixDQUFDO1lBM0NDLHVCQUFLLEdBQUwsVUFBTSxHQUFnQjtnQkFDcEIsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2hCO2lCQUNGO3FCQUFNO29CQUNMLG9FQUFvRTtvQkFDcEUsT0FBTyxJQUFJLENBQUM7aUJBQ2I7WUFDSCxDQUFDO1lBRUQsdUNBQXFCLEdBQXJCLFVBQXNCLEdBQXdCLEVBQUUsT0FBWTtnQkFDMUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7b0JBQ3RDLDJDQUEyQztvQkFDM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsOEJBQVksR0FBWixVQUFhLEdBQWUsRUFBRSxPQUFZO2dCQUN4QyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQUEsS0FBSztvQkFDdEMsb0JBQW9CO29CQUNwQixLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNsQixLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0QixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxnQ0FBYyxHQUFkLFVBQWUsR0FBaUIsRUFBRSxPQUFZO2dCQUM1Qyw0Q0FBNEM7Z0JBQzVDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQUEsS0FBSyxJQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUUsNERBQTREO2dCQUM1RCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtvQkFDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2lCQUNaO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUM7WUFDSCxjQUFDO1FBQUQsQ0FBQyxBQTVDbUIsQ0FBYyxzQ0FBMkIsRUE0QzVELENBQUM7UUFFRiwyQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFL0IsT0FBTyxJQUFJLGtCQUFPLENBQWMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFuREQsOENBbURDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxRQUFnQjtRQUM5RCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMzRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQTdCLENBQTZCLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDdEU7SUFDSCxDQUFDO0lBSkQsNENBSUM7SUFPRDs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FpQkc7SUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUFhOztRQUNqRCxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbEUsT0FBTztTQUNSOztZQUNELEtBQWdCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE1QixJQUFNLENBQUMsV0FBQTtnQkFDVixJQUFNLElBQUksR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO2dCQUMxQixJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7b0JBQ3pELENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3JDLFNBQVM7aUJBQ1Y7Z0JBQ0QsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3JDLE9BQU87d0JBQ0wsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVO3dCQUM1QixPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUk7cUJBQ25CLENBQUM7aUJBQ0g7YUFDRjs7Ozs7Ozs7O0lBQ0gsQ0FBQztJQWxCRCxzREFrQkM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLHVCQUF1QixDQUNuQyxTQUFrQixFQUFFLFFBQWdCLEVBQUUsU0FBdUM7UUFDL0UsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUU7WUFDeEUsSUFBQSxtQ0FBVyxDQUFjO1lBQ2hDLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQztnQkFBRSxPQUFPLFdBQVcsQ0FBQztTQUNoRDtRQUNELE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLHVCQUF1QixDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQS9DLENBQStDLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBUEQsMERBT0M7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUNyRSxJQUFNLElBQUksR0FBVyxFQUFFLENBQUM7UUFDeEIsSUFBTSxPQUFPLEdBQUc7WUFBa0IsbUNBQWdCO1lBQTlCOztZQVdwQixDQUFDO1lBVkMsdUJBQUssR0FBTCxVQUFNLEdBQVM7Z0JBQ2IsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2hCO3FCQUFNO29CQUNMLHFFQUFxRTtvQkFDckUsYUFBYTtvQkFDYixPQUFPLElBQUksQ0FBQztpQkFDYjtZQUNILENBQUM7WUFDSCxjQUFDO1FBQUQsQ0FBQyxBQVhtQixDQUFjLDJCQUFnQixFQVdqRCxDQUFDO1FBQ0YsbUJBQVEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekIsT0FBTyxJQUFJLGtCQUFPLENBQU8sSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFoQkQsMERBZ0JDO0lBR0Q7O09BRUc7SUFDSCxTQUFnQixTQUFTLENBQUMsR0FBNkI7O1FBQ3JELElBQU0sTUFBTSxHQUE2QixFQUFFLENBQUM7O1lBQzVDLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLGdCQUFBLDRCQUFFO2dCQUFoQyxJQUFNLE1BQUksV0FBQTtnQkFDYixJQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBSSxDQUFDLENBQUM7Z0JBQ3BCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFJLENBQUM7YUFDbEI7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFQRCw4QkFPQztJQUdEOzs7O09BSUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsT0FBc0IsRUFBRSxJQUFxQixFQUFFLEtBQWtCOztRQUNuRSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFVLENBQUMsQ0FBQztRQUN2QyxJQUFJLE9BQU8sRUFBRTs7Z0JBQ1gsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLE9BQU8sQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXZDLElBQU0sU0FBUyxXQUFBO29CQUNsQixJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDL0QsSUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsSUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDNUUsSUFBSSxXQUFXLEVBQUU7NEJBQ2YsT0FBTyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3lCQUM3QztxQkFDRjtpQkFDRjs7Ozs7Ozs7O1NBQ0Y7SUFDSCxDQUFDO0lBZkQsOENBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXN0UGF0aCwgQm91bmRFdmVudEFzdCwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIENvbXBpbGVUeXBlTWV0YWRhdGEsIENzc1NlbGVjdG9yLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIEVtYmVkZGVkVGVtcGxhdGVBc3QsIEh0bWxBc3RQYXRoLCBJZGVudGlmaWVycywgTm9kZSwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFJlY3Vyc2l2ZVZpc2l0b3IsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIGlkZW50aWZpZXJOYW1lLCB0ZW1wbGF0ZVZpc2l0QWxsLCB2aXNpdEFsbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBTZWxlY3RvckluZm99IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7RGlhZ25vc3RpY1RlbXBsYXRlSW5mb30gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7U3BhbiwgU3ltYm9sLCBTeW1ib2xRdWVyeX0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BhbkhvbGRlciB7XG4gIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbjtcbiAgZW5kU291cmNlU3Bhbj86IFBhcnNlU291cmNlU3BhbnxudWxsO1xuICBjaGlsZHJlbj86IFNwYW5Ib2xkZXJbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGFyc2VTb3VyY2VTcGFuKHZhbHVlOiBhbnkpOiB2YWx1ZSBpcyBQYXJzZVNvdXJjZVNwYW4ge1xuICByZXR1cm4gdmFsdWUgJiYgISF2YWx1ZS5zdGFydDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuOiBTcGFuSG9sZGVyKTogU3BhbjtcbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogU3BhbjtcbmV4cG9ydCBmdW5jdGlvbiBzcGFuT2Yoc3BhbjogU3BhbkhvbGRlciB8IFBhcnNlU291cmNlU3BhbiB8IHVuZGVmaW5lZCk6IFNwYW58dW5kZWZpbmVkO1xuZXhwb3J0IGZ1bmN0aW9uIHNwYW5PZihzcGFuPzogU3BhbkhvbGRlciB8IFBhcnNlU291cmNlU3Bhbik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKCFzcGFuKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoaXNQYXJzZVNvdXJjZVNwYW4oc3BhbikpIHtcbiAgICByZXR1cm4ge3N0YXJ0OiBzcGFuLnN0YXJ0Lm9mZnNldCwgZW5kOiBzcGFuLmVuZC5vZmZzZXR9O1xuICB9IGVsc2Uge1xuICAgIGlmIChzcGFuLmVuZFNvdXJjZVNwYW4pIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5lbmRTb3VyY2VTcGFuLmVuZC5vZmZzZXR9O1xuICAgIH0gZWxzZSBpZiAoc3Bhbi5jaGlsZHJlbiAmJiBzcGFuLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIGVuZDogc3Bhbk9mKHNwYW4uY2hpbGRyZW5bc3Bhbi5jaGlsZHJlbi5sZW5ndGggLSAxXSkgIS5lbmRcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7c3RhcnQ6IHNwYW4uc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc3Bhbi5zb3VyY2VTcGFuLmVuZC5vZmZzZXR9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpblNwYW4ocG9zaXRpb246IG51bWJlciwgc3Bhbj86IFNwYW4sIGV4Y2x1c2l2ZT86IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHNwYW4gIT0gbnVsbCAmJiAoZXhjbHVzaXZlID8gcG9zaXRpb24gPj0gc3Bhbi5zdGFydCAmJiBwb3NpdGlvbiA8IHNwYW4uZW5kIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPj0gc3Bhbi5zdGFydCAmJiBwb3NpdGlvbiA8PSBzcGFuLmVuZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvZmZzZXRTcGFuKHNwYW46IFNwYW4sIGFtb3VudDogbnVtYmVyKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IHNwYW4uc3RhcnQgKyBhbW91bnQsIGVuZDogc3Bhbi5lbmQgKyBhbW91bnR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOYXJyb3dlcihzcGFuQTogU3Bhbiwgc3BhbkI6IFNwYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHNwYW5BLnN0YXJ0ID49IHNwYW5CLnN0YXJ0ICYmIHNwYW5BLmVuZCA8PSBzcGFuQi5lbmQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cnVjdHVyYWxEaXJlY3RpdmUodHlwZTogQ29tcGlsZVR5cGVNZXRhZGF0YSk6IGJvb2xlYW4ge1xuICBmb3IgKGNvbnN0IGRpRGVwIG9mIHR5cGUuZGlEZXBzKSB7XG4gICAgY29uc3QgZGlEZXBOYW1lID0gaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4/LmlkZW50aWZpZXIpO1xuICAgIGlmIChkaURlcE5hbWUgPT09IElkZW50aWZpZXJzLlRlbXBsYXRlUmVmLm5hbWUgfHxcbiAgICAgICAgZGlEZXBOYW1lID09PSBJZGVudGlmaWVycy5WaWV3Q29udGFpbmVyUmVmLm5hbWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZWxlY3RvcnMoaW5mbzogQXN0UmVzdWx0KTogU2VsZWN0b3JJbmZvIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxDc3NTZWxlY3RvciwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnk+KCk7XG4gIGNvbnN0IHJlc3VsdHM6IENzc1NlbGVjdG9yW10gPSBbXTtcbiAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW5mby5kaXJlY3RpdmVzKSB7XG4gICAgY29uc3Qgc2VsZWN0b3JzOiBDc3NTZWxlY3RvcltdID0gQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yICEpO1xuICAgIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgICByZXN1bHRzLnB1c2goc2VsZWN0b3IpO1xuICAgICAgbWFwLnNldChzZWxlY3RvciwgZGlyZWN0aXZlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtzZWxlY3RvcnM6IHJlc3VsdHMsIG1hcH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVzY3JpcHRWZXJzaW9uKGxvdzogc3RyaW5nLCBoaWdoPzogc3RyaW5nKSB7XG4gIGNvbnN0IHZlcnNpb24gPSB0cy52ZXJzaW9uO1xuXG4gIGlmICh2ZXJzaW9uLnN1YnN0cmluZygwLCBsb3cubGVuZ3RoKSA8IGxvdykgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChoaWdoICYmICh2ZXJzaW9uLnN1YnN0cmluZygwLCBoaWdoLmxlbmd0aCkgPiBoaWdoKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm86IEFzdFJlc3VsdCk6IERpYWdub3N0aWNUZW1wbGF0ZUluZm8ge1xuICByZXR1cm4ge1xuICAgIGZpbGVOYW1lOiBpbmZvLnRlbXBsYXRlLmZpbGVOYW1lLFxuICAgIG9mZnNldDogaW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgIHF1ZXJ5OiBpbmZvLnRlbXBsYXRlLnF1ZXJ5LFxuICAgIG1lbWJlcnM6IGluZm8udGVtcGxhdGUubWVtYmVycyxcbiAgICBodG1sQXN0OiBpbmZvLmh0bWxBc3QsXG4gICAgdGVtcGxhdGVBc3Q6IGluZm8udGVtcGxhdGVBc3RcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRUZW1wbGF0ZUFzdEF0KGFzdDogVGVtcGxhdGVBc3RbXSwgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlQXN0UGF0aCB7XG4gIGNvbnN0IHBhdGg6IFRlbXBsYXRlQXN0W10gPSBbXTtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXQoYXN0OiBUZW1wbGF0ZUFzdCk6IGFueSB7XG4gICAgICBsZXQgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKGluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgICAgIGlmICghbGVuIHx8IGlzTmFycm93ZXIoc3Bhbiwgc3Bhbk9mKHBhdGhbbGVuIC0gMV0pKSkge1xuICAgICAgICAgIHBhdGgucHVzaChhc3QpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB2YWx1ZSBoZXJlIHdpbGwgcmVzdWx0IGluIHRoZSBjaGlsZHJlbiBiZWluZyBza2lwcGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7XG4gICAgICAgIC8vIElnbm9yZSByZWZlcmVuY2UsIHZhcmlhYmxlIGFuZCBwcm92aWRlcnNcbiAgICAgICAgdmlzaXQoYXN0LmF0dHJzKTtcbiAgICAgICAgdmlzaXQoYXN0LmRpcmVjdGl2ZXMpO1xuICAgICAgICB2aXNpdChhc3QuY2hpbGRyZW4pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2hpbGRyZW4oY29udGV4dCwgdmlzaXQgPT4ge1xuICAgICAgICAvLyBJbmdub3JlIHByb3ZpZGVyc1xuICAgICAgICB2aXNpdChhc3QuYXR0cnMpO1xuICAgICAgICB2aXNpdChhc3QuaW5wdXRzKTtcbiAgICAgICAgdmlzaXQoYXN0Lm91dHB1dHMpO1xuICAgICAgICB2aXNpdChhc3QucmVmZXJlbmNlcyk7XG4gICAgICAgIHZpc2l0KGFzdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgdmlzaXQoYXN0LmNoaWxkcmVuKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgLy8gSWdub3JlIHRoZSBob3N0IHByb3BlcnRpZXMgb2YgYSBkaXJlY3RpdmVcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRDaGlsZHJlbihjb250ZXh0LCB2aXNpdCA9PiB7IHZpc2l0KGFzdC5pbnB1dHMpOyB9KTtcbiAgICAgIC8vIFdlIG5ldmVyIGNhcmUgYWJvdXQgdGhlIGRpcmV0aXZlIGl0c2VsZiwganVzdCBpdHMgaW5wdXRzLlxuICAgICAgaWYgKHBhdGhbcGF0aC5sZW5ndGggLSAxXSA9PT0gYXN0KSB7XG4gICAgICAgIHBhdGgucG9wKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcblxuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGFzdCk7XG5cbiAgcmV0dXJuIG5ldyBBc3RQYXRoPFRlbXBsYXRlQXN0PihwYXRoLCBwb3NpdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBub2RlIHRoYXQgbW9zdCB0aWdodGx5IGVuY29tcGFzcyB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gKiBAcGFyYW0gbm9kZVxuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVGlnaHRlc3ROb2RlKG5vZGU6IHRzLk5vZGUsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfHVuZGVmaW5lZCB7XG4gIGlmIChub2RlLmdldFN0YXJ0KCkgPD0gcG9zaXRpb24gJiYgcG9zaXRpb24gPCBub2RlLmdldEVuZCgpKSB7XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKGMgPT4gZmluZFRpZ2h0ZXN0Tm9kZShjLCBwb3NpdGlvbikpIHx8IG5vZGU7XG4gIH1cbn1cblxuaW50ZXJmYWNlIERpcmVjdGl2ZUNsYXNzTGlrZSB7XG4gIGRlY29yYXRvcklkOiB0cy5JZGVudGlmaWVyOyAgLy8gZGVjb3JhdG9yIGlkZW50aWZpZXIsIGxpa2UgQENvbXBvbmVudFxuICBjbGFzc0lkOiB0cy5JZGVudGlmaWVyO1xufVxuXG4vKipcbiAqIFJldHVybiBtZXRhZGF0YSBhYm91dCBgbm9kZWAgaWYgaXQgbG9va3MgbGlrZSBhbiBBbmd1bGFyIGRpcmVjdGl2ZSBjbGFzcy5cbiAqIEluIHRoaXMgY2FzZSwgcG90ZW50aWFsIG1hdGNoZXMgYXJlIGBATmdNb2R1bGVgLCBgQENvbXBvbmVudGAsIGBARGlyZWN0aXZlYCxcbiAqIGBAUGlwZWAsIGV0Yy5cbiAqIFRoZXNlIGNsYXNzIGRlY2xhcmF0aW9ucyBhbGwgc2hhcmUgc29tZSBjb21tb24gYXR0cmlidXRlcywgbmFtZWx5IHRoZWlyXG4gKiBkZWNvcmF0b3IgdGFrZXMgZXhhY3RseSBvbmUgcGFyYW1ldGVyIGFuZCB0aGUgcGFyYW1ldGVyIG11c3QgYmUgYW4gb2JqZWN0XG4gKiBsaXRlcmFsLlxuICpcbiAqIEZvciBleGFtcGxlLFxuICogICAgIHYtLS0tLS0tLS0tIGBkZWNvcmF0b3JJZGBcbiAqIEBOZ01vZHVsZSh7ICAgICAgICAgICA8XG4gKiAgIGRlY2xhcmF0aW9uczogW10sICAgPCBjbGFzc0RlY2xcbiAqIH0pICAgICAgICAgICAgICAgICAgICA8XG4gKiBjbGFzcyBBcHBNb2R1bGUge30gICAgPFxuICogICAgICAgICAgXi0tLS0tIGBjbGFzc0lkYFxuICpcbiAqIEBwYXJhbSBub2RlIFBvdGVudGlhbCBub2RlIHRoYXQgcmVwcmVzZW50cyBhbiBBbmd1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERpcmVjdGl2ZUNsYXNzTGlrZShub2RlOiB0cy5Ob2RlKTogRGlyZWN0aXZlQ2xhc3NMaWtlfHVuZGVmaW5lZCB7XG4gIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpIHx8ICFub2RlLm5hbWUgfHwgIW5vZGUuZGVjb3JhdG9ycykge1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGNvbnN0IGQgb2Ygbm9kZS5kZWNvcmF0b3JzKSB7XG4gICAgY29uc3QgZXhwciA9IGQuZXhwcmVzc2lvbjtcbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcikgfHwgZXhwci5hcmd1bWVudHMubGVuZ3RoICE9PSAxIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoZXhwci5leHByZXNzaW9uKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGFyZyA9IGV4cHIuYXJndW1lbnRzWzBdO1xuICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGFyZykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRlY29yYXRvcklkOiBleHByLmV4cHJlc3Npb24sXG4gICAgICAgIGNsYXNzSWQ6IG5vZGUubmFtZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRmluZHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgYXNzaWdubWVudCB0aGF0IGlzIG5lc3RlZCBpbiBhIFR5cGVTY3JpcHQgbm9kZSBhbmQgaXMgb2YgYSBjZXJ0YWluXG4gKiB0eXBlIFQuXG4gKlxuICogQHBhcmFtIHN0YXJ0Tm9kZSBub2RlIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgbmVzdGVkIHByb3BlcnR5IGFzc2lnbm1lbnQgZnJvbVxuICogQHBhcmFtIHByb3BOYW1lIHByb3BlcnR5IGFzc2lnbm1lbnQgbmFtZVxuICogQHBhcmFtIHByZWRpY2F0ZSBmdW5jdGlvbiB0byB2ZXJpZnkgdGhhdCBhIG5vZGUgaXMgb2YgdHlwZSBULlxuICogQHJldHVybiBub2RlIHByb3BlcnR5IGFzc2lnbm1lbnQgdmFsdWUgb2YgdHlwZSBULCBvciB1bmRlZmluZWQgaWYgbm9uZSBpcyBmb3VuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFByb3BlcnR5VmFsdWVPZlR5cGU8VCBleHRlbmRzIHRzLk5vZGU+KFxuICAgIHN0YXJ0Tm9kZTogdHMuTm9kZSwgcHJvcE5hbWU6IHN0cmluZywgcHJlZGljYXRlOiAobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyBUKTogVHx1bmRlZmluZWQge1xuICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQoc3RhcnROb2RlKSAmJiBzdGFydE5vZGUubmFtZS5nZXRUZXh0KCkgPT09IHByb3BOYW1lKSB7XG4gICAgY29uc3Qge2luaXRpYWxpemVyfSA9IHN0YXJ0Tm9kZTtcbiAgICBpZiAocHJlZGljYXRlKGluaXRpYWxpemVyKSkgcmV0dXJuIGluaXRpYWxpemVyO1xuICB9XG4gIHJldHVybiBzdGFydE5vZGUuZm9yRWFjaENoaWxkKGMgPT4gZmluZFByb3BlcnR5VmFsdWVPZlR5cGUoYywgcHJvcE5hbWUsIHByZWRpY2F0ZSkpO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIHRpZ2h0ZXN0IG5vZGUgYXQgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gIGZyb20gdGhlIEFTVCBgbm9kZXNgLCBhbmRcbiAqIHJldHVybiB0aGUgcGF0aCB0byB0aGUgbm9kZS5cbiAqIEBwYXJhbSBub2RlcyBIVE1MIEFTVCBub2Rlc1xuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbihub2RlczogTm9kZVtdLCBwb3NpdGlvbjogbnVtYmVyKTogSHRtbEFzdFBhdGgge1xuICBjb25zdCBwYXRoOiBOb2RlW10gPSBbXTtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogTm9kZSkge1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5PZihhc3QpO1xuICAgICAgaWYgKGluU3Bhbihwb3NpdGlvbiwgc3BhbikpIHtcbiAgICAgICAgcGF0aC5wdXNoKGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXR1cm5pbmcgYSB0cnV0aHkgdmFsdWUgaGVyZSB3aWxsIHNraXAgYWxsIGNoaWxkcmVuIGFuZCB0ZXJtaW5hdGVcbiAgICAgICAgLy8gdGhlIHZpc2l0LlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHZpc2l0QWxsKHZpc2l0b3IsIG5vZGVzKTtcbiAgcmV0dXJuIG5ldyBBc3RQYXRoPE5vZGU+KHBhdGgsIHBvc2l0aW9uKTtcbn1cblxuXG4vKipcbiAqIEludmVydHMgYW4gb2JqZWN0J3Mga2V5LXZhbHVlIHBhaXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW52ZXJ0TWFwKG9iajoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KToge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgcmVzdWx0OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKG9iaikpIHtcbiAgICBjb25zdCB2ID0gb2JqW25hbWVdO1xuICAgIHJlc3VsdFt2XSA9IG5hbWU7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG4vKipcbiAqIEZpbmRzIHRoZSBkaXJlY3RpdmUgbWVtYmVyIHByb3ZpZGluZyBhIHRlbXBsYXRlIG91dHB1dCBiaW5kaW5nLCBpZiBvbmUgZXhpc3RzLlxuICogQHBhcmFtIGluZm8gYWdncmVnYXRlIHRlbXBsYXRlIEFTVCBpbmZvcm1hdGlvblxuICogQHBhcmFtIHBhdGggbmFycm93aW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kT3V0cHV0QmluZGluZyhcbiAgICBiaW5kaW5nOiBCb3VuZEV2ZW50QXN0LCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIHF1ZXJ5OiBTeW1ib2xRdWVyeSk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBjb25zdCBlbGVtZW50ID0gcGF0aC5maXJzdChFbGVtZW50QXN0KTtcbiAgaWYgKGVsZW1lbnQpIHtcbiAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBlbGVtZW50LmRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGludmVydGVkT3V0cHV0cyA9IGludmVydE1hcChkaXJlY3RpdmUuZGlyZWN0aXZlLm91dHB1dHMpO1xuICAgICAgY29uc3QgZmllbGROYW1lID0gaW52ZXJ0ZWRPdXRwdXRzW2JpbmRpbmcubmFtZV07XG4gICAgICBpZiAoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gcXVlcnkuZ2V0VHlwZVN5bWJvbChkaXJlY3RpdmUuZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sLm1lbWJlcnMoKS5nZXQoZmllbGROYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19