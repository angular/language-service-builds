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
        define("@angular/language-service/src/expressions", ["require", "exports", "tslib", "@angular/compiler", "@angular/language-service/src/expression_type", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var expression_type_1 = require("@angular/language-service/src/expression_type");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    function findAstAt(ast, position, excludeEmpty) {
        if (excludeEmpty === void 0) { excludeEmpty = false; }
        var path = [];
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visit = function (ast) {
                if ((!excludeEmpty || ast.sourceSpan.start < ast.sourceSpan.end) &&
                    utils_1.inSpan(position, ast.sourceSpan)) {
                    path.push(ast);
                    ast.visit(this);
                }
            };
            return class_1;
        }(compiler_1.RecursiveAstVisitor));
        // We never care about the ASTWithSource node and its visit() method calls its ast's visit so
        // the visit() method above would never see it.
        if (ast instanceof compiler_1.ASTWithSource) {
            ast = ast.ast;
        }
        visitor.visit(ast);
        return new compiler_1.AstPath(path, position);
    }
    function getExpressionCompletions(scope, ast, position, templateInfo) {
        var path = findAstAt(ast, position);
        if (path.empty)
            return undefined;
        var tail = path.tail;
        var result = scope;
        function getType(ast) {
            return new expression_type_1.AstType(scope, templateInfo.query, {}, templateInfo.source).getType(ast);
        }
        // If the completion request is in a not in a pipe or property access then the global scope
        // (that is the scope of the implicit receiver) is the right scope as the user is typing the
        // beginning of an expression.
        tail.visit({
            visitBinary: function (ast) { },
            visitChain: function (ast) { },
            visitConditional: function (ast) { },
            visitFunctionCall: function (ast) { },
            visitImplicitReceiver: function (ast) { },
            visitInterpolation: function (ast) {
                result = undefined;
            },
            visitKeyedRead: function (ast) { },
            visitKeyedWrite: function (ast) { },
            visitLiteralArray: function (ast) { },
            visitLiteralMap: function (ast) { },
            visitLiteralPrimitive: function (ast) { },
            visitMethodCall: function (ast) { },
            visitPipe: function (ast) {
                if (position >= ast.exp.span.end &&
                    (!ast.args || !ast.args.length || position < ast.args[0].span.start)) {
                    // We are in a position a pipe name is expected.
                    result = templateInfo.query.getPipes();
                }
            },
            visitPrefixNot: function (ast) { },
            visitNonNullAssert: function (ast) { },
            visitPropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
            visitPropertyWrite: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
            visitQuote: function (ast) {
                // For a quote, return the members of any (if there are any).
                result = templateInfo.query.getBuiltinType(types_1.BuiltinType.Any).members();
            },
            visitSafeMethodCall: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
            visitSafePropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
        });
        return result && result.values();
    }
    exports.getExpressionCompletions = getExpressionCompletions;
    /**
     * Retrieves the expression symbol at a particular position in a template.
     *
     * @param scope symbols in scope of the template
     * @param ast template AST
     * @param position absolute location in template to retrieve symbol at
     * @param query type symbol query for the template scope
     */
    function getExpressionSymbol(scope, ast, position, templateInfo) {
        var path = findAstAt(ast, position, /* excludeEmpty */ true);
        if (path.empty)
            return undefined;
        var tail = path.tail;
        function getType(ast) {
            return new expression_type_1.AstType(scope, templateInfo.query, {}, templateInfo.source).getType(ast);
        }
        var symbol = undefined;
        var span = undefined;
        // If the completion request is in a not in a pipe or property access then the global scope
        // (that is the scope of the implicit receiver) is the right scope as the user is typing the
        // beginning of an expression.
        tail.visit({
            visitBinary: function (ast) { },
            visitChain: function (ast) { },
            visitConditional: function (ast) { },
            visitFunctionCall: function (ast) { },
            visitImplicitReceiver: function (ast) { },
            visitInterpolation: function (ast) { },
            visitKeyedRead: function (ast) { },
            visitKeyedWrite: function (ast) { },
            visitLiteralArray: function (ast) { },
            visitLiteralMap: function (ast) { },
            visitLiteralPrimitive: function (ast) { },
            visitMethodCall: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = ast.span;
            },
            visitPipe: function (ast) {
                if (utils_1.inSpan(position, ast.nameSpan, /* exclusive */ true)) {
                    // We are in a position a pipe name is expected.
                    var pipes = templateInfo.query.getPipes();
                    symbol = pipes.get(ast.name);
                    // `nameSpan` is an absolute span, but the span expected by the result of this method is
                    // relative to the start of the expression.
                    // TODO(ayazhafiz): migrate to only using absolute spans
                    var offset = ast.sourceSpan.start - ast.span.start;
                    span = {
                        start: ast.nameSpan.start - offset,
                        end: ast.nameSpan.end - offset,
                    };
                }
            },
            visitPrefixNot: function (ast) { },
            visitNonNullAssert: function (ast) { },
            visitPropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = ast.span;
            },
            visitPropertyWrite: function (ast) {
                var receiverType = getType(ast.receiver);
                var start = ast.span.start;
                symbol = receiverType && receiverType.members().get(ast.name);
                // A PropertyWrite span includes both the LHS (name) and the RHS (value) of the write. In this
                // visit, only the name is relevant.
                //   prop=$event
                //   ^^^^        name
                //        ^^^^^^ value; visited separately as a nested AST
                span = { start: start, end: start + ast.name.length };
            },
            visitQuote: function (ast) { },
            visitSafeMethodCall: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = ast.span;
            },
            visitSafePropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = ast.span;
            },
        });
        if (symbol && span) {
            return { symbol: symbol, span: span };
        }
    }
    exports.getExpressionSymbol = getExpressionSymbol;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa0c7SUFFbEcsaUZBQTBDO0lBQzFDLDZEQUErRTtJQUMvRSw2REFBK0I7SUFJL0IsU0FBUyxTQUFTLENBQUMsR0FBUSxFQUFFLFFBQWdCLEVBQUUsWUFBNkI7UUFBN0IsNkJBQUEsRUFBQSxvQkFBNkI7UUFDMUUsSUFBTSxJQUFJLEdBQVUsRUFBRSxDQUFDO1FBQ3ZCLElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUFtQjtZQUFqQzs7WUFRcEIsQ0FBQztZQVBDLHVCQUFLLEdBQUwsVUFBTSxHQUFRO2dCQUNaLElBQUksQ0FBQyxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFDNUQsY0FBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakI7WUFDSCxDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUFSbUIsQ0FBYyw4QkFBbUIsRUFRcEQsQ0FBQztRQUVGLDZGQUE2RjtRQUM3RiwrQ0FBK0M7UUFDL0MsSUFBSSxHQUFHLFlBQVksd0JBQWEsRUFBRTtZQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztTQUNmO1FBRUQsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuQixPQUFPLElBQUksa0JBQVcsQ0FBTSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELFNBQWdCLHdCQUF3QixDQUNwQyxLQUFrQixFQUFFLEdBQVEsRUFBRSxRQUFnQixFQUFFLFlBQTRCO1FBRTlFLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEMsSUFBSSxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ2pDLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFLLENBQUM7UUFDeEIsSUFBSSxNQUFNLEdBQTBCLEtBQUssQ0FBQztRQUUxQyxTQUFTLE9BQU8sQ0FBQyxHQUFRO1lBQ3ZCLE9BQU8sSUFBSSx5QkFBTyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCwyRkFBMkY7UUFDM0YsNEZBQTRGO1FBQzVGLDhCQUE4QjtRQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ1QsV0FBVyxZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ25CLFVBQVUsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUNsQixnQkFBZ0IsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN4QixpQkFBaUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN6QixxQkFBcUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUM3QixrQkFBa0IsWUFBQyxHQUFHO2dCQUNwQixNQUFNLEdBQUcsU0FBUyxDQUFDO1lBQ3JCLENBQUM7WUFDRCxjQUFjLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDdEIsZUFBZSxZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ3ZCLGlCQUFpQixZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ3pCLGVBQWUsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN2QixxQkFBcUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUM3QixlQUFlLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDdkIsU0FBUyxFQUFULFVBQVUsR0FBRztnQkFDWCxJQUFJLFFBQVEsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHO29CQUM1QixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsR0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDL0UsZ0RBQWdEO29CQUNoRCxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDeEM7WUFDSCxDQUFDO1lBQ0QsY0FBYyxZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ3RCLGtCQUFrQixZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQzFCLGlCQUFpQixZQUFDLEdBQUc7Z0JBQ25CLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3pELENBQUM7WUFDRCxrQkFBa0IsWUFBQyxHQUFHO2dCQUNwQixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN6RCxDQUFDO1lBQ0QsVUFBVSxZQUFDLEdBQUc7Z0JBQ1osNkRBQTZEO2dCQUM3RCxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4RSxDQUFDO1lBQ0QsbUJBQW1CLFlBQUMsR0FBRztnQkFDckIsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDekQsQ0FBQztZQUNELHFCQUFxQixZQUFDLEdBQUc7Z0JBQ3ZCLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3pELENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQTlERCw0REE4REM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQy9CLEtBQWtCLEVBQUUsR0FBUSxFQUFFLFFBQWdCLEVBQzlDLFlBQTRCO1FBQzlCLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9ELElBQUksSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQUNqQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSyxDQUFDO1FBRXhCLFNBQVMsT0FBTyxDQUFDLEdBQVE7WUFDdkIsT0FBTyxJQUFJLHlCQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELElBQUksTUFBTSxHQUFxQixTQUFTLENBQUM7UUFDekMsSUFBSSxJQUFJLEdBQW1CLFNBQVMsQ0FBQztRQUVyQywyRkFBMkY7UUFDM0YsNEZBQTRGO1FBQzVGLDhCQUE4QjtRQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ1QsV0FBVyxZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ25CLFVBQVUsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUNsQixnQkFBZ0IsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN4QixpQkFBaUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN6QixxQkFBcUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUM3QixrQkFBa0IsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUMxQixjQUFjLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDdEIsZUFBZSxZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ3ZCLGlCQUFpQixZQUFDLEdBQUcsSUFBRyxDQUFDO1lBQ3pCLGVBQWUsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN2QixxQkFBcUIsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUM3QixlQUFlLFlBQUMsR0FBRztnQkFDakIsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxHQUFHLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELFNBQVMsWUFBQyxHQUFHO2dCQUNYLElBQUksY0FBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEQsZ0RBQWdEO29CQUNoRCxJQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUM1QyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRTdCLHdGQUF3RjtvQkFDeEYsMkNBQTJDO29CQUMzQyx3REFBd0Q7b0JBQ3hELElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUNyRCxJQUFJLEdBQUc7d0JBQ0wsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLE1BQU07d0JBQ2xDLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxNQUFNO3FCQUMvQixDQUFDO2lCQUNIO1lBQ0gsQ0FBQztZQUNELGNBQWMsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUN0QixrQkFBa0IsWUFBQyxHQUFHLElBQUcsQ0FBQztZQUMxQixpQkFBaUIsWUFBQyxHQUFHO2dCQUNuQixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNsQixDQUFDO1lBQ0Qsa0JBQWtCLFlBQUMsR0FBRztnQkFDcEIsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDcEMsSUFBQSxzQkFBSyxDQUFhO2dCQUN6QixNQUFNLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5RCw4RkFBOEY7Z0JBQzlGLG9DQUFvQztnQkFDcEMsZ0JBQWdCO2dCQUNoQixxQkFBcUI7Z0JBQ3JCLDBEQUEwRDtnQkFDMUQsSUFBSSxHQUFHLEVBQUMsS0FBSyxPQUFBLEVBQUUsR0FBRyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDO1lBQy9DLENBQUM7WUFDRCxVQUFVLFlBQUMsR0FBRyxJQUFHLENBQUM7WUFDbEIsbUJBQW1CLFlBQUMsR0FBRztnQkFDckIsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxHQUFHLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELHFCQUFxQixZQUFDLEdBQUc7Z0JBQ3ZCLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxZQUFZLElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlELElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2xCLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsT0FBTyxFQUFDLE1BQU0sUUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDO0lBcEZELGtEQW9GQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGggYXMgQXN0UGF0aEJhc2UsIEFTVFdpdGhTb3VyY2UsIFJlY3Vyc2l2ZUFzdFZpc2l0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtBc3RUeXBlfSBmcm9tICcuL2V4cHJlc3Npb25fdHlwZSc7XG5pbXBvcnQge0J1aWx0aW5UeXBlLCBTcGFuLCBTeW1ib2wsIFN5bWJvbFRhYmxlLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2luU3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbnR5cGUgQXN0UGF0aCA9IEFzdFBhdGhCYXNlPEFTVD47XG5cbmZ1bmN0aW9uIGZpbmRBc3RBdChhc3Q6IEFTVCwgcG9zaXRpb246IG51bWJlciwgZXhjbHVkZUVtcHR5OiBib29sZWFuID0gZmFsc2UpOiBBc3RQYXRoIHtcbiAgY29uc3QgcGF0aDogQVNUW10gPSBbXTtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogQVNUKSB7XG4gICAgICBpZiAoKCFleGNsdWRlRW1wdHkgfHwgYXN0LnNvdXJjZVNwYW4uc3RhcnQgPCBhc3Quc291cmNlU3Bhbi5lbmQpICYmXG4gICAgICAgICAgaW5TcGFuKHBvc2l0aW9uLCBhc3Quc291cmNlU3BhbikpIHtcbiAgICAgICAgcGF0aC5wdXNoKGFzdCk7XG4gICAgICAgIGFzdC52aXNpdCh0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gV2UgbmV2ZXIgY2FyZSBhYm91dCB0aGUgQVNUV2l0aFNvdXJjZSBub2RlIGFuZCBpdHMgdmlzaXQoKSBtZXRob2QgY2FsbHMgaXRzIGFzdCdzIHZpc2l0IHNvXG4gIC8vIHRoZSB2aXNpdCgpIG1ldGhvZCBhYm92ZSB3b3VsZCBuZXZlciBzZWUgaXQuXG4gIGlmIChhc3QgaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgYXN0ID0gYXN0LmFzdDtcbiAgfVxuXG4gIHZpc2l0b3IudmlzaXQoYXN0KTtcblxuICByZXR1cm4gbmV3IEFzdFBhdGhCYXNlPEFTVD4ocGF0aCwgcG9zaXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgIHNjb3BlOiBTeW1ib2xUYWJsZSwgYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsIHRlbXBsYXRlSW5mbzogVGVtcGxhdGVTb3VyY2UpOiBTeW1ib2xbXXxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBwYXRoID0gZmluZEFzdEF0KGFzdCwgcG9zaXRpb24pO1xuICBpZiAocGF0aC5lbXB0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdGFpbCA9IHBhdGgudGFpbCE7XG4gIGxldCByZXN1bHQ6IFN5bWJvbFRhYmxlfHVuZGVmaW5lZCA9IHNjb3BlO1xuXG4gIGZ1bmN0aW9uIGdldFR5cGUoYXN0OiBBU1QpOiBTeW1ib2wge1xuICAgIHJldHVybiBuZXcgQXN0VHlwZShzY29wZSwgdGVtcGxhdGVJbmZvLnF1ZXJ5LCB7fSwgdGVtcGxhdGVJbmZvLnNvdXJjZSkuZ2V0VHlwZShhc3QpO1xuICB9XG5cbiAgLy8gSWYgdGhlIGNvbXBsZXRpb24gcmVxdWVzdCBpcyBpbiBhIG5vdCBpbiBhIHBpcGUgb3IgcHJvcGVydHkgYWNjZXNzIHRoZW4gdGhlIGdsb2JhbCBzY29wZVxuICAvLyAodGhhdCBpcyB0aGUgc2NvcGUgb2YgdGhlIGltcGxpY2l0IHJlY2VpdmVyKSBpcyB0aGUgcmlnaHQgc2NvcGUgYXMgdGhlIHVzZXIgaXMgdHlwaW5nIHRoZVxuICAvLyBiZWdpbm5pbmcgb2YgYW4gZXhwcmVzc2lvbi5cbiAgdGFpbC52aXNpdCh7XG4gICAgdmlzaXRCaW5hcnkoYXN0KSB7fSxcbiAgICB2aXNpdENoYWluKGFzdCkge30sXG4gICAgdmlzaXRDb25kaXRpb25hbChhc3QpIHt9LFxuICAgIHZpc2l0RnVuY3Rpb25DYWxsKGFzdCkge30sXG4gICAgdmlzaXRJbXBsaWNpdFJlY2VpdmVyKGFzdCkge30sXG4gICAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdCkge1xuICAgICAgcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgIH0sXG4gICAgdmlzaXRLZXllZFJlYWQoYXN0KSB7fSxcbiAgICB2aXNpdEtleWVkV3JpdGUoYXN0KSB7fSxcbiAgICB2aXNpdExpdGVyYWxBcnJheShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbE1hcChhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3QpIHt9LFxuICAgIHZpc2l0TWV0aG9kQ2FsbChhc3QpIHt9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSBhc3QuZXhwLnNwYW4uZW5kICYmXG4gICAgICAgICAgKCFhc3QuYXJncyB8fCAhYXN0LmFyZ3MubGVuZ3RoIHx8IHBvc2l0aW9uIDwgKDxBU1Q+YXN0LmFyZ3NbMF0pLnNwYW4uc3RhcnQpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICByZXN1bHQgPSB0ZW1wbGF0ZUluZm8ucXVlcnkuZ2V0UGlwZXMoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHZpc2l0UHJlZml4Tm90KGFzdCkge30sXG4gICAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdCkge30sXG4gICAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFF1b3RlKGFzdCkge1xuICAgICAgLy8gRm9yIGEgcXVvdGUsIHJldHVybiB0aGUgbWVtYmVycyBvZiBhbnkgKGlmIHRoZXJlIGFyZSBhbnkpLlxuICAgICAgcmVzdWx0ID0gdGVtcGxhdGVJbmZvLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSkubWVtYmVycygpO1xuICAgIH0sXG4gICAgdmlzaXRTYWZlTWV0aG9kQ2FsbChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICAgIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0ICYmIHJlc3VsdC52YWx1ZXMoKTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIGV4cHJlc3Npb24gc3ltYm9sIGF0IGEgcGFydGljdWxhciBwb3NpdGlvbiBpbiBhIHRlbXBsYXRlLlxuICpcbiAqIEBwYXJhbSBzY29wZSBzeW1ib2xzIGluIHNjb3BlIG9mIHRoZSB0ZW1wbGF0ZVxuICogQHBhcmFtIGFzdCB0ZW1wbGF0ZSBBU1RcbiAqIEBwYXJhbSBwb3NpdGlvbiBhYnNvbHV0ZSBsb2NhdGlvbiBpbiB0ZW1wbGF0ZSB0byByZXRyaWV2ZSBzeW1ib2wgYXRcbiAqIEBwYXJhbSBxdWVyeSB0eXBlIHN5bWJvbCBxdWVyeSBmb3IgdGhlIHRlbXBsYXRlIHNjb3BlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHByZXNzaW9uU3ltYm9sKFxuICAgIHNjb3BlOiBTeW1ib2xUYWJsZSwgYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgdGVtcGxhdGVJbmZvOiBUZW1wbGF0ZVNvdXJjZSk6IHtzeW1ib2w6IFN5bWJvbCwgc3BhbjogU3Bhbn18dW5kZWZpbmVkIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRBc3RBdChhc3QsIHBvc2l0aW9uLCAvKiBleGNsdWRlRW1wdHkgKi8gdHJ1ZSk7XG4gIGlmIChwYXRoLmVtcHR5KSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsITtcblxuICBmdW5jdGlvbiBnZXRUeXBlKGFzdDogQVNUKTogU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IEFzdFR5cGUoc2NvcGUsIHRlbXBsYXRlSW5mby5xdWVyeSwge30sIHRlbXBsYXRlSW5mby5zb3VyY2UpLmdldFR5cGUoYXN0KTtcbiAgfVxuXG4gIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBJZiB0aGUgY29tcGxldGlvbiByZXF1ZXN0IGlzIGluIGEgbm90IGluIGEgcGlwZSBvciBwcm9wZXJ0eSBhY2Nlc3MgdGhlbiB0aGUgZ2xvYmFsIHNjb3BlXG4gIC8vICh0aGF0IGlzIHRoZSBzY29wZSBvZiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIpIGlzIHRoZSByaWdodCBzY29wZSBhcyB0aGUgdXNlciBpcyB0eXBpbmcgdGhlXG4gIC8vIGJlZ2lubmluZyBvZiBhbiBleHByZXNzaW9uLlxuICB0YWlsLnZpc2l0KHtcbiAgICB2aXNpdEJpbmFyeShhc3QpIHt9LFxuICAgIHZpc2l0Q2hhaW4oYXN0KSB7fSxcbiAgICB2aXNpdENvbmRpdGlvbmFsKGFzdCkge30sXG4gICAgdmlzaXRGdW5jdGlvbkNhbGwoYXN0KSB7fSxcbiAgICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0KSB7fSxcbiAgICB2aXNpdEludGVycG9sYXRpb24oYXN0KSB7fSxcbiAgICB2aXNpdEtleWVkUmVhZChhc3QpIHt9LFxuICAgIHZpc2l0S2V5ZWRXcml0ZShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbEFycmF5KGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsTWFwKGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKGFzdCkge30sXG4gICAgdmlzaXRNZXRob2RDYWxsKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChpblNwYW4ocG9zaXRpb24sIGFzdC5uYW1lU3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICBjb25zdCBwaXBlcyA9IHRlbXBsYXRlSW5mby5xdWVyeS5nZXRQaXBlcygpO1xuICAgICAgICBzeW1ib2wgPSBwaXBlcy5nZXQoYXN0Lm5hbWUpO1xuXG4gICAgICAgIC8vIGBuYW1lU3BhbmAgaXMgYW4gYWJzb2x1dGUgc3BhbiwgYnV0IHRoZSBzcGFuIGV4cGVjdGVkIGJ5IHRoZSByZXN1bHQgb2YgdGhpcyBtZXRob2QgaXNcbiAgICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPKGF5YXpoYWZpeik6IG1pZ3JhdGUgdG8gb25seSB1c2luZyBhYnNvbHV0ZSBzcGFuc1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydCAtIGFzdC5zcGFuLnN0YXJ0O1xuICAgICAgICBzcGFuID0ge1xuICAgICAgICAgIHN0YXJ0OiBhc3QubmFtZVNwYW4uc3RhcnQgLSBvZmZzZXQsXG4gICAgICAgICAgZW5kOiBhc3QubmFtZVNwYW4uZW5kIC0gb2Zmc2V0LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgdmlzaXRQcmVmaXhOb3QoYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0KSB7fSxcbiAgICB2aXNpdFByb3BlcnR5UmVhZChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHN5bWJvbCA9IHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgICBzcGFuID0gYXN0LnNwYW47XG4gICAgfSxcbiAgICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBjb25zdCB7c3RhcnR9ID0gYXN0LnNwYW47XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgLy8gQSBQcm9wZXJ0eVdyaXRlIHNwYW4gaW5jbHVkZXMgYm90aCB0aGUgTEhTIChuYW1lKSBhbmQgdGhlIFJIUyAodmFsdWUpIG9mIHRoZSB3cml0ZS4gSW4gdGhpc1xuICAgICAgLy8gdmlzaXQsIG9ubHkgdGhlIG5hbWUgaXMgcmVsZXZhbnQuXG4gICAgICAvLyAgIHByb3A9JGV2ZW50XG4gICAgICAvLyAgIF5eXl4gICAgICAgIG5hbWVcbiAgICAgIC8vICAgICAgICBeXl5eXl4gdmFsdWU7IHZpc2l0ZWQgc2VwYXJhdGVseSBhcyBhIG5lc3RlZCBBU1RcbiAgICAgIHNwYW4gPSB7c3RhcnQsIGVuZDogc3RhcnQgKyBhc3QubmFtZS5sZW5ndGh9O1xuICAgIH0sXG4gICAgdmlzaXRRdW90ZShhc3QpIHt9LFxuICAgIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgc3BhbiA9IGFzdC5zcGFuO1xuICAgIH0sXG4gICAgdmlzaXRTYWZlUHJvcGVydHlSZWFkKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICB9KTtcblxuICBpZiAoc3ltYm9sICYmIHNwYW4pIHtcbiAgICByZXR1cm4ge3N5bWJvbCwgc3Bhbn07XG4gIH1cbn1cbiJdfQ==