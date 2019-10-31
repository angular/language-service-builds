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
        define("@angular/language-service/src/expressions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
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
                    compiler_1.visitAstChildren(ast, this);
                }
            };
            return class_1;
        }(compiler_1.NullAstVisitor));
        // We never care about the ASTWithSource node and its visit() method calls its ast's visit so
        // the visit() method above would never see it.
        if (ast instanceof compiler_1.ASTWithSource) {
            ast = ast.ast;
        }
        visitor.visit(ast);
        return new compiler_1.AstPath(path, position);
    }
    function getExpressionCompletions(scope, ast, position, query) {
        var path = findAstAt(ast, position);
        if (path.empty)
            return undefined;
        var tail = path.tail;
        var result = scope;
        function getType(ast) { return new language_services_1.AstType(scope, query, {}).getType(ast); }
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
                    result = query.getPipes();
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
                result = query.getBuiltinType(types_1.BuiltinType.Any).members();
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
    function getExpressionSymbol(scope, ast, position, query) {
        var path = findAstAt(ast, position, /* excludeEmpty */ true);
        if (path.empty)
            return undefined;
        var tail = path.tail;
        function getType(ast) { return new language_services_1.AstType(scope, query, {}).getType(ast); }
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
                if (position >= ast.exp.span.end &&
                    (!ast.args || !ast.args.length || position < ast.args[0].span.start)) {
                    // We are in a position a pipe name is expected.
                    var pipes = query.getPipes();
                    if (pipes) {
                        symbol = pipes.get(ast.name);
                        span = ast.span;
                    }
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
                symbol = receiverType && receiverType.members().get(ast.name);
                span = ast.span;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0c7SUFDL0csaUZBQW9FO0lBRXBFLDZEQUE0RTtJQUM1RSw2REFBK0I7SUFJL0IsU0FBUyxTQUFTLENBQUMsR0FBUSxFQUFFLFFBQWdCLEVBQUUsWUFBNkI7UUFBN0IsNkJBQUEsRUFBQSxvQkFBNkI7UUFDMUUsSUFBTSxJQUFJLEdBQVUsRUFBRSxDQUFDO1FBQ3ZCLElBQU0sT0FBTyxHQUFHO1lBQWtCLG1DQUFjO1lBQTVCOztZQVFwQixDQUFDO1lBUEMsdUJBQUssR0FBTCxVQUFNLEdBQVE7Z0JBQ1osSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO29CQUM1RCxjQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDZiwyQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQzdCO1lBQ0gsQ0FBQztZQUNILGNBQUM7UUFBRCxDQUFDLEFBUm1CLENBQWMseUJBQWMsRUFRL0MsQ0FBQztRQUVGLDZGQUE2RjtRQUM3RiwrQ0FBK0M7UUFDL0MsSUFBSSxHQUFHLFlBQVksd0JBQWEsRUFBRTtZQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztTQUNmO1FBRUQsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuQixPQUFPLElBQUksa0JBQVcsQ0FBTSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUMs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QUM7WUFDbEIsQ0FBQztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQixPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztTQUN2QjtJQUNILENBQUM7SUF2RUQsa0RBdUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQVNUV2l0aFNvdXJjZSwgQXN0UGF0aCBhcyBBc3RQYXRoQmFzZSwgTnVsbEFzdFZpc2l0b3IsIHZpc2l0QXN0Q2hpbGRyZW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QXN0VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7QnVpbHRpblR5cGUsIFNwYW4sIFN5bWJvbCwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7aW5TcGFufSBmcm9tICcuL3V0aWxzJztcblxudHlwZSBBc3RQYXRoID0gQXN0UGF0aEJhc2U8QVNUPjtcblxuZnVuY3Rpb24gZmluZEFzdEF0KGFzdDogQVNULCBwb3NpdGlvbjogbnVtYmVyLCBleGNsdWRlRW1wdHk6IGJvb2xlYW4gPSBmYWxzZSk6IEFzdFBhdGgge1xuICBjb25zdCBwYXRoOiBBU1RbXSA9IFtdO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgTnVsbEFzdFZpc2l0b3Ige1xuICAgIHZpc2l0KGFzdDogQVNUKSB7XG4gICAgICBpZiAoKCFleGNsdWRlRW1wdHkgfHwgYXN0LnNvdXJjZVNwYW4uc3RhcnQgPCBhc3Quc291cmNlU3Bhbi5lbmQpICYmXG4gICAgICAgICAgaW5TcGFuKHBvc2l0aW9uLCBhc3Quc291cmNlU3BhbikpIHtcbiAgICAgICAgcGF0aC5wdXNoKGFzdCk7XG4gICAgICAgIHZpc2l0QXN0Q2hpbGRyZW4oYXN0LCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gV2UgbmV2ZXIgY2FyZSBhYm91dCB0aGUgQVNUV2l0aFNvdXJjZSBub2RlIGFuZCBpdHMgdmlzaXQoKSBtZXRob2QgY2FsbHMgaXRzIGFzdCdzIHZpc2l0IHNvXG4gIC8vIHRoZSB2aXNpdCgpIG1ldGhvZCBhYm92ZSB3b3VsZCBuZXZlciBzZWUgaXQuXG4gIGlmIChhc3QgaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgYXN0ID0gYXN0LmFzdDtcbiAgfVxuXG4gIHZpc2l0b3IudmlzaXQoYXN0KTtcblxuICByZXR1cm4gbmV3IEFzdFBhdGhCYXNlPEFTVD4ocGF0aCwgcG9zaXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgIHNjb3BlOiBTeW1ib2xUYWJsZSwgYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsIHF1ZXJ5OiBTeW1ib2xRdWVyeSk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHBhdGggPSBmaW5kQXN0QXQoYXN0LCBwb3NpdGlvbik7XG4gIGlmIChwYXRoLmVtcHR5KSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsICE7XG4gIGxldCByZXN1bHQ6IFN5bWJvbFRhYmxlfHVuZGVmaW5lZCA9IHNjb3BlO1xuXG4gIGZ1bmN0aW9uIGdldFR5cGUoYXN0OiBBU1QpOiBTeW1ib2wgeyByZXR1cm4gbmV3IEFzdFR5cGUoc2NvcGUsIHF1ZXJ5LCB7fSkuZ2V0VHlwZShhc3QpOyB9XG5cbiAgLy8gSWYgdGhlIGNvbXBsZXRpb24gcmVxdWVzdCBpcyBpbiBhIG5vdCBpbiBhIHBpcGUgb3IgcHJvcGVydHkgYWNjZXNzIHRoZW4gdGhlIGdsb2JhbCBzY29wZVxuICAvLyAodGhhdCBpcyB0aGUgc2NvcGUgb2YgdGhlIGltcGxpY2l0IHJlY2VpdmVyKSBpcyB0aGUgcmlnaHQgc2NvcGUgYXMgdGhlIHVzZXIgaXMgdHlwaW5nIHRoZVxuICAvLyBiZWdpbm5pbmcgb2YgYW4gZXhwcmVzc2lvbi5cbiAgdGFpbC52aXNpdCh7XG4gICAgdmlzaXRCaW5hcnkoYXN0KSB7fSxcbiAgICB2aXNpdENoYWluKGFzdCkge30sXG4gICAgdmlzaXRDb25kaXRpb25hbChhc3QpIHt9LFxuICAgIHZpc2l0RnVuY3Rpb25DYWxsKGFzdCkge30sXG4gICAgdmlzaXRJbXBsaWNpdFJlY2VpdmVyKGFzdCkge30sXG4gICAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdCkgeyByZXN1bHQgPSB1bmRlZmluZWQ7IH0sXG4gICAgdmlzaXRLZXllZFJlYWQoYXN0KSB7fSxcbiAgICB2aXNpdEtleWVkV3JpdGUoYXN0KSB7fSxcbiAgICB2aXNpdExpdGVyYWxBcnJheShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbE1hcChhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3QpIHt9LFxuICAgIHZpc2l0TWV0aG9kQ2FsbChhc3QpIHt9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSBhc3QuZXhwLnNwYW4uZW5kICYmXG4gICAgICAgICAgKCFhc3QuYXJncyB8fCAhYXN0LmFyZ3MubGVuZ3RoIHx8IHBvc2l0aW9uIDwgKDxBU1Q+YXN0LmFyZ3NbMF0pLnNwYW4uc3RhcnQpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICByZXN1bHQgPSBxdWVyeS5nZXRQaXBlcygpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdmlzaXRQcmVmaXhOb3QoYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0KSB7fSxcbiAgICB2aXNpdFByb3BlcnR5UmVhZChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICAgIHZpc2l0UHJvcGVydHlXcml0ZShhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHJlc3VsdCA9IHJlY2VpdmVyVHlwZSA/IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkgOiBzY29wZTtcbiAgICB9LFxuICAgIHZpc2l0UXVvdGUoYXN0KSB7XG4gICAgICAvLyBGb3IgYSBxdW90ZSwgcmV0dXJuIHRoZSBtZW1iZXJzIG9mIGFueSAoaWYgdGhlcmUgYXJlIGFueSkuXG4gICAgICByZXN1bHQgPSBxdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpLm1lbWJlcnMoKTtcbiAgICB9LFxuICAgIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdCAmJiByZXN1bHQudmFsdWVzKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHByZXNzaW9uU3ltYm9sKFxuICAgIHNjb3BlOiBTeW1ib2xUYWJsZSwgYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgcXVlcnk6IFN5bWJvbFF1ZXJ5KToge3N5bWJvbDogU3ltYm9sLCBzcGFuOiBTcGFufXx1bmRlZmluZWQge1xuICBjb25zdCBwYXRoID0gZmluZEFzdEF0KGFzdCwgcG9zaXRpb24sIC8qIGV4Y2x1ZGVFbXB0eSAqLyB0cnVlKTtcbiAgaWYgKHBhdGguZW1wdHkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWwgITtcblxuICBmdW5jdGlvbiBnZXRUeXBlKGFzdDogQVNUKTogU3ltYm9sIHsgcmV0dXJuIG5ldyBBc3RUeXBlKHNjb3BlLCBxdWVyeSwge30pLmdldFR5cGUoYXN0KTsgfVxuXG4gIGxldCBzeW1ib2w6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCBzcGFuOiBTcGFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvLyBJZiB0aGUgY29tcGxldGlvbiByZXF1ZXN0IGlzIGluIGEgbm90IGluIGEgcGlwZSBvciBwcm9wZXJ0eSBhY2Nlc3MgdGhlbiB0aGUgZ2xvYmFsIHNjb3BlXG4gIC8vICh0aGF0IGlzIHRoZSBzY29wZSBvZiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIpIGlzIHRoZSByaWdodCBzY29wZSBhcyB0aGUgdXNlciBpcyB0eXBpbmcgdGhlXG4gIC8vIGJlZ2lubmluZyBvZiBhbiBleHByZXNzaW9uLlxuICB0YWlsLnZpc2l0KHtcbiAgICB2aXNpdEJpbmFyeShhc3QpIHt9LFxuICAgIHZpc2l0Q2hhaW4oYXN0KSB7fSxcbiAgICB2aXNpdENvbmRpdGlvbmFsKGFzdCkge30sXG4gICAgdmlzaXRGdW5jdGlvbkNhbGwoYXN0KSB7fSxcbiAgICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0KSB7fSxcbiAgICB2aXNpdEludGVycG9sYXRpb24oYXN0KSB7fSxcbiAgICB2aXNpdEtleWVkUmVhZChhc3QpIHt9LFxuICAgIHZpc2l0S2V5ZWRXcml0ZShhc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbEFycmF5KGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsTWFwKGFzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKGFzdCkge30sXG4gICAgdmlzaXRNZXRob2RDYWxsKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSBhc3QuZXhwLnNwYW4uZW5kICYmXG4gICAgICAgICAgKCFhc3QuYXJncyB8fCAhYXN0LmFyZ3MubGVuZ3RoIHx8IHBvc2l0aW9uIDwgKDxBU1Q+YXN0LmFyZ3NbMF0pLnNwYW4uc3RhcnQpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICBjb25zdCBwaXBlcyA9IHF1ZXJ5LmdldFBpcGVzKCk7XG4gICAgICAgIGlmIChwaXBlcykge1xuICAgICAgICAgIHN5bWJvbCA9IHBpcGVzLmdldChhc3QubmFtZSk7XG4gICAgICAgICAgc3BhbiA9IGFzdC5zcGFuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB2aXNpdFByZWZpeE5vdChhc3QpIHt9LFxuICAgIHZpc2l0Tm9uTnVsbEFzc2VydChhc3QpIHt9LFxuICAgIHZpc2l0UHJvcGVydHlSZWFkKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBhc3Quc3BhbjtcbiAgICB9LFxuICAgIHZpc2l0UHJvcGVydHlXcml0ZShhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHN5bWJvbCA9IHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgICBzcGFuID0gYXN0LnNwYW47XG4gICAgfSxcbiAgICB2aXNpdFF1b3RlKGFzdCkge30sXG4gICAgdmlzaXRTYWZlTWV0aG9kQ2FsbChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHN5bWJvbCA9IHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgICBzcGFuID0gYXN0LnNwYW47XG4gICAgfSxcbiAgICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgc3BhbiA9IGFzdC5zcGFuO1xuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChzeW1ib2wgJiYgc3Bhbikge1xuICAgIHJldHVybiB7c3ltYm9sLCBzcGFufTtcbiAgfVxufVxuIl19