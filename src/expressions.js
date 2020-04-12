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
            visitInterpolation: function (ast) { result = undefined; },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa0c7SUFFbEcsaUZBQTBDO0lBQzFDLDZEQUErRTtJQUMvRSw2REFBK0I7SUFJL0IsU0FBUyxTQUFTLENBQUMsR0FBUSxFQUFFLFFBQWdCLEVBQUUsWUFBNkI7UUFBN0IsNkJBQUEsRUFBQSxvQkFBNkI7UUFDMUUsSUFBTSxJQUFJLEdBQVUsRUFBRSxDQUFDO1FBQ3ZCLElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUFtQjtZQUFqQzs7WUFRcEIsQ0FBQztZQVBDLHVCQUFLLEdBQUwsVUFBTSxHQUFRO2dCQUNaLElBQUksQ0FBQyxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFDNUQsY0FBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakI7WUFDSCxDQUFDO1lBQ0gsY0FBQztRQUFELENBQUMsQUFSbUIsQ0FBYyw4QkFBbUIsRUFRcEQsQ0FBQztRQUVGLDZGQUE2RjtRQUM3RiwrQ0FBK0M7UUFDL0MsSUFBSSxHQUFHLFlBQVksd0JBQWEsRUFBRTtZQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztTQUNmO1FBRUQsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuQixPQUFPLElBQUksa0JBQVcsQ0FBTSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUMs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RyxZQUFZLElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlELElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2xCLENBQUM7WUFDRCxxQkFBcUIsWUFBQyxHQUFHO2dCQUN2QixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNsQixDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLE9BQU8sRUFBQyxNQUFNLFFBQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQztJQXBGRCxrREFvRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBU1RXaXRoU291cmNlLCBBc3RQYXRoIGFzIEFzdFBhdGhCYXNlLCBSZWN1cnNpdmVBc3RWaXNpdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7QXN0VHlwZX0gZnJvbSAnLi9leHByZXNzaW9uX3R5cGUnO1xuaW1wb3J0IHtCdWlsdGluVHlwZSwgU3BhbiwgU3ltYm9sLCBTeW1ib2xUYWJsZSwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtpblNwYW59IGZyb20gJy4vdXRpbHMnO1xuXG50eXBlIEFzdFBhdGggPSBBc3RQYXRoQmFzZTxBU1Q+O1xuXG5mdW5jdGlvbiBmaW5kQXN0QXQoYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsIGV4Y2x1ZGVFbXB0eTogYm9vbGVhbiA9IGZhbHNlKTogQXN0UGF0aCB7XG4gIGNvbnN0IHBhdGg6IEFTVFtdID0gW107XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IEFTVCkge1xuICAgICAgaWYgKCghZXhjbHVkZUVtcHR5IHx8IGFzdC5zb3VyY2VTcGFuLnN0YXJ0IDwgYXN0LnNvdXJjZVNwYW4uZW5kKSAmJlxuICAgICAgICAgIGluU3Bhbihwb3NpdGlvbiwgYXN0LnNvdXJjZVNwYW4pKSB7XG4gICAgICAgIHBhdGgucHVzaChhc3QpO1xuICAgICAgICBhc3QudmlzaXQodGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFdlIG5ldmVyIGNhcmUgYWJvdXQgdGhlIEFTVFdpdGhTb3VyY2Ugbm9kZSBhbmQgaXRzIHZpc2l0KCkgbWV0aG9kIGNhbGxzIGl0cyBhc3QncyB2aXNpdCBzb1xuICAvLyB0aGUgdmlzaXQoKSBtZXRob2QgYWJvdmUgd291bGQgbmV2ZXIgc2VlIGl0LlxuICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgIGFzdCA9IGFzdC5hc3Q7XG4gIH1cblxuICB2aXNpdG9yLnZpc2l0KGFzdCk7XG5cbiAgcmV0dXJuIG5ldyBBc3RQYXRoQmFzZTxBU1Q+KHBhdGgsIHBvc2l0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICBzY29wZTogU3ltYm9sVGFibGUsIGFzdDogQVNULCBwb3NpdGlvbjogbnVtYmVyLCB0ZW1wbGF0ZUluZm86IFRlbXBsYXRlU291cmNlKTogU3ltYm9sW118XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRBc3RBdChhc3QsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGguZW1wdHkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWwgITtcbiAgbGV0IHJlc3VsdDogU3ltYm9sVGFibGV8dW5kZWZpbmVkID0gc2NvcGU7XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZShhc3Q6IEFTVCk6IFN5bWJvbCB7XG4gICAgcmV0dXJuIG5ldyBBc3RUeXBlKHNjb3BlLCB0ZW1wbGF0ZUluZm8ucXVlcnksIHt9LCB0ZW1wbGF0ZUluZm8uc291cmNlKS5nZXRUeXBlKGFzdCk7XG4gIH1cblxuICAvLyBJZiB0aGUgY29tcGxldGlvbiByZXF1ZXN0IGlzIGluIGEgbm90IGluIGEgcGlwZSBvciBwcm9wZXJ0eSBhY2Nlc3MgdGhlbiB0aGUgZ2xvYmFsIHNjb3BlXG4gIC8vICh0aGF0IGlzIHRoZSBzY29wZSBvZiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIpIGlzIHRoZSByaWdodCBzY29wZSBhcyB0aGUgdXNlciBpcyB0eXBpbmcgdGhlXG4gIC8vIGJlZ2lubmluZyBvZiBhbiBleHByZXNzaW9uLlxuICB0YWlsLnZpc2l0KHtcbiAgICB2aXNpdEJpbmFyeShhc3QpIHt9LFxuICAgIHZpc2l0Q2hhaW4oYXN0KSB7fSxcbiAgICB2aXNpdENvbmRpdGlvbmFsKGFzdCkge30sXG4gICAgdmlzaXRGdW5jdGlvbkNhbGwoYXN0KSB7fSxcbiAgICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0KSB7fSxcbiAgICB2aXNpdEludGVycG9sYXRpb24oYXN0KSB7IHJlc3VsdCA9IHVuZGVmaW5lZDsgfSxcbiAgICB2aXNpdEtleWVkUmVhZChhc3QpIHt9LFxuICAgIHZpc2l0S2V5ZWRXcml0ZShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbEFycmF5KGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsTWFwKGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKGFzdCkge30sXG4gICAgdmlzaXRNZXRob2RDYWxsKGFzdCkge30sXG4gICAgdmlzaXRQaXBlKGFzdCkge1xuICAgICAgaWYgKHBvc2l0aW9uID49IGFzdC5leHAuc3Bhbi5lbmQgJiZcbiAgICAgICAgICAoIWFzdC5hcmdzIHx8ICFhc3QuYXJncy5sZW5ndGggfHwgcG9zaXRpb24gPCAoPEFTVD5hc3QuYXJnc1swXSkuc3Bhbi5zdGFydCkpIHtcbiAgICAgICAgLy8gV2UgYXJlIGluIGEgcG9zaXRpb24gYSBwaXBlIG5hbWUgaXMgZXhwZWN0ZWQuXG4gICAgICAgIHJlc3VsdCA9IHRlbXBsYXRlSW5mby5xdWVyeS5nZXRQaXBlcygpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdmlzaXRQcmVmaXhOb3QoYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0KSB7fSxcbiAgICB2aXNpdFByb3BlcnR5UmVhZChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICAgIHZpc2l0UHJvcGVydHlXcml0ZShhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICAgIHZpc2l0UXVvdGUoYXN0KSB7XG4gICAgICAvLyBGb3IgYSBxdW90ZSwgcmV0dXJuIHRoZSBtZW1iZXJzIG9mIGFueSAoaWYgdGhlcmUgYXJlIGFueSkuXG4gICAgICByZXN1bHQgPSB0ZW1wbGF0ZUluZm8ucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KS5tZW1iZXJzKCk7XG4gICAgfSxcbiAgICB2aXNpdFNhZmVNZXRob2RDYWxsKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgcmVzdWx0ID0gcmVjZWl2ZXJUeXBlID8gcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKSA6IHNjb3BlO1xuICAgIH0sXG4gICAgdmlzaXRTYWZlUHJvcGVydHlSZWFkKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgcmVzdWx0ID0gcmVjZWl2ZXJUeXBlID8gcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKSA6IHNjb3BlO1xuICAgIH0sXG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQgJiYgcmVzdWx0LnZhbHVlcygpO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgZXhwcmVzc2lvbiBzeW1ib2wgYXQgYSBwYXJ0aWN1bGFyIHBvc2l0aW9uIGluIGEgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtIHNjb3BlIHN5bWJvbHMgaW4gc2NvcGUgb2YgdGhlIHRlbXBsYXRlXG4gKiBAcGFyYW0gYXN0IHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIHBvc2l0aW9uIGFic29sdXRlIGxvY2F0aW9uIGluIHRlbXBsYXRlIHRvIHJldHJpZXZlIHN5bWJvbCBhdFxuICogQHBhcmFtIHF1ZXJ5IHR5cGUgc3ltYm9sIHF1ZXJ5IGZvciB0aGUgdGVtcGxhdGUgc2NvcGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25TeW1ib2woXG4gICAgc2NvcGU6IFN5bWJvbFRhYmxlLCBhc3Q6IEFTVCwgcG9zaXRpb246IG51bWJlcixcbiAgICB0ZW1wbGF0ZUluZm86IFRlbXBsYXRlU291cmNlKToge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQge1xuICBjb25zdCBwYXRoID0gZmluZEFzdEF0KGFzdCwgcG9zaXRpb24sIC8qIGV4Y2x1ZGVFbXB0eSAqLyB0cnVlKTtcbiAgaWYgKHBhdGguZW1wdHkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWwgITtcblxuICBmdW5jdGlvbiBnZXRUeXBlKGFzdDogQVNUKTogU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IEFzdFR5cGUoc2NvcGUsIHRlbXBsYXRlSW5mby5xdWVyeSwge30sIHRlbXBsYXRlSW5mby5zb3VyY2UpLmdldFR5cGUoYXN0KTtcbiAgfVxuXG4gIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBJZiB0aGUgY29tcGxldGlvbiByZXF1ZXN0IGlzIGluIGEgbm90IGluIGEgcGlwZSBvciBwcm9wZXJ0eSBhY2Nlc3MgdGhlbiB0aGUgZ2xvYmFsIHNjb3BlXG4gIC8vICh0aGF0IGlzIHRoZSBzY29wZSBvZiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIpIGlzIHRoZSByaWdodCBzY29wZSBhcyB0aGUgdXNlciBpcyB0eXBpbmcgdGhlXG4gIC8vIGJlZ2lubmluZyBvZiBhbiBleHByZXNzaW9uLlxuICB0YWlsLnZpc2l0KHtcbiAgICB2aXNpdEJpbmFyeShhc3QpIHt9LFxuICAgIHZpc2l0Q2hhaW4oYXN0KSB7fSxcbiAgICB2aXNpdENvbmRpdGlvbmFsKGFzdCkge30sXG4gICAgdmlzaXRGdW5jdGlvbkNhbGwoYXN0KSB7fSxcbiAgICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0KSB7fSxcbiAgICB2aXNpdEludGVycG9sYXRpb24oYXN0KSB7fSxcbiAgICB2aXNpdEtleWVkUmVhZChhc3QpIHt9LFxuICAgIHZpc2l0S2V5ZWRXcml0ZShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbEFycmF5KGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsTWFwKGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKGFzdCkge30sXG4gICAgdmlzaXRNZXRob2RDYWxsKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChpblNwYW4ocG9zaXRpb24sIGFzdC5uYW1lU3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICBjb25zdCBwaXBlcyA9IHRlbXBsYXRlSW5mby5xdWVyeS5nZXRQaXBlcygpO1xuICAgICAgICBzeW1ib2wgPSBwaXBlcy5nZXQoYXN0Lm5hbWUpO1xuXG4gICAgICAgIC8vIGBuYW1lU3BhbmAgaXMgYW4gYWJzb2x1dGUgc3BhbiwgYnV0IHRoZSBzcGFuIGV4cGVjdGVkIGJ5IHRoZSByZXN1bHQgb2YgdGhpcyBtZXRob2QgaXNcbiAgICAgICAgLy8gcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPKGF5YXpoYWZpeik6IG1pZ3JhdGUgdG8gb25seSB1c2luZyBhYnNvbHV0ZSBzcGFuc1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydCAtIGFzdC5zcGFuLnN0YXJ0O1xuICAgICAgICBzcGFuID0ge1xuICAgICAgICAgIHN0YXJ0OiBhc3QubmFtZVNwYW4uc3RhcnQgLSBvZmZzZXQsXG4gICAgICAgICAgZW5kOiBhc3QubmFtZVNwYW4uZW5kIC0gb2Zmc2V0LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgdmlzaXRQcmVmaXhOb3QoYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0KSB7fSxcbiAgICB2aXNpdFByb3BlcnR5UmVhZChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHN5bWJvbCA9IHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgICBzcGFuID0gYXN0LnNwYW47XG4gICAgfSxcbiAgICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBjb25zdCB7c3RhcnR9ID0gYXN0LnNwYW47XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgLy8gQSBQcm9wZXJ0eVdyaXRlIHNwYW4gaW5jbHVkZXMgYm90aCB0aGUgTEhTIChuYW1lKSBhbmQgdGhlIFJIUyAodmFsdWUpIG9mIHRoZSB3cml0ZS4gSW4gdGhpc1xuICAgICAgLy8gdmlzaXQsIG9ubHkgdGhlIG5hbWUgaXMgcmVsZXZhbnQuXG4gICAgICAvLyAgIHByb3A9JGV2ZW50XG4gICAgICAvLyAgIF5eXl4gICAgICAgIG5hbWVcbiAgICAgIC8vICAgICAgICBeXl5eXl4gdmFsdWU7IHZpc2l0ZWQgc2VwYXJhdGVseSBhcyBhIG5lc3RlZCBBU1RcbiAgICAgIHNwYW4gPSB7c3RhcnQsIGVuZDogc3RhcnQgKyBhc3QubmFtZS5sZW5ndGh9O1xuICAgIH0sXG4gICAgdmlzaXRRdW90ZShhc3QpIHt9LFxuICAgIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgc3BhbiA9IGFzdC5zcGFuO1xuICAgIH0sXG4gICAgdmlzaXRTYWZlUHJvcGVydHlSZWFkKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICB9KTtcblxuICBpZiAoc3ltYm9sICYmIHNwYW4pIHtcbiAgICByZXR1cm4ge3N5bWJvbCwgc3Bhbn07XG4gIH1cbn1cbiJdfQ==