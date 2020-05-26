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
    exports.getExpressionSymbol = exports.getExpressionCompletions = void 0;
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
            visitBinary: function (_ast) { },
            visitChain: function (_ast) { },
            visitConditional: function (_ast) { },
            visitFunctionCall: function (_ast) { },
            visitImplicitReceiver: function (_ast) { },
            visitInterpolation: function (_ast) {
                result = undefined;
            },
            visitKeyedRead: function (_ast) { },
            visitKeyedWrite: function (_ast) { },
            visitLiteralArray: function (_ast) { },
            visitLiteralMap: function (_ast) { },
            visitLiteralPrimitive: function (_ast) { },
            visitMethodCall: function (_ast) { },
            visitPipe: function (ast) {
                if (position >= ast.exp.span.end &&
                    (!ast.args || !ast.args.length || position < ast.args[0].span.start)) {
                    // We are in a position a pipe name is expected.
                    result = templateInfo.query.getPipes();
                }
            },
            visitPrefixNot: function (_ast) { },
            visitNonNullAssert: function (_ast) { },
            visitPropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
            visitPropertyWrite: function (ast) {
                var receiverType = getType(ast.receiver);
                result = receiverType ? receiverType.members() : scope;
            },
            visitQuote: function (_ast) {
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
        function spanFromName(ast) {
            // `nameSpan` is an absolute span, but the span expected by the result of this method is
            // relative to the start of the expression.
            // TODO(ayazhafiz): migrate to only using absolute spans
            var offset = ast.sourceSpan.start - ast.span.start;
            return {
                start: ast.nameSpan.start - offset,
                end: ast.nameSpan.end - offset,
            };
        }
        var symbol = undefined;
        var span = undefined;
        // If the completion request is in a not in a pipe or property access then the global scope
        // (that is the scope of the implicit receiver) is the right scope as the user is typing the
        // beginning of an expression.
        tail.visit({
            visitBinary: function (_ast) { },
            visitChain: function (_ast) { },
            visitConditional: function (_ast) { },
            visitFunctionCall: function (_ast) { },
            visitImplicitReceiver: function (_ast) { },
            visitInterpolation: function (_ast) { },
            visitKeyedRead: function (_ast) { },
            visitKeyedWrite: function (_ast) { },
            visitLiteralArray: function (_ast) { },
            visitLiteralMap: function (_ast) { },
            visitLiteralPrimitive: function (_ast) { },
            visitMethodCall: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = spanFromName(ast);
            },
            visitPipe: function (ast) {
                if (utils_1.inSpan(position, ast.nameSpan, /* exclusive */ true)) {
                    // We are in a position a pipe name is expected.
                    var pipes = templateInfo.query.getPipes();
                    symbol = pipes.get(ast.name);
                    span = spanFromName(ast);
                }
            },
            visitPrefixNot: function (_ast) { },
            visitNonNullAssert: function (_ast) { },
            visitPropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = spanFromName(ast);
            },
            visitPropertyWrite: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = spanFromName(ast);
            },
            visitQuote: function (_ast) { },
            visitSafeMethodCall: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = spanFromName(ast);
            },
            visitSafePropertyRead: function (ast) {
                var receiverType = getType(ast.receiver);
                symbol = receiverType && receiverType.members().get(ast.name);
                span = spanFromName(ast);
            },
        });
        if (symbol && span) {
            return { symbol: symbol, span: span };
        }
    }
    exports.getExpressionSymbol = getExpressionSymbol;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStHO0lBRS9HLGlGQUEwQztJQUMxQyw2REFBK0U7SUFDL0UsNkRBQStCO0lBSS9CLFNBQVMsU0FBUyxDQUFDLEdBQVEsRUFBRSxRQUFnQixFQUFFLFlBQTZCO1FBQTdCLDZCQUFBLEVBQUEsb0JBQTZCO1FBQzFFLElBQU0sSUFBSSxHQUFVLEVBQUUsQ0FBQztRQUN2QixJQUFNLE9BQU8sR0FBRztZQUFrQixtQ0FBbUI7WUFBakM7O1lBUXBCLENBQUM7WUFQQyx1QkFBSyxHQUFMLFVBQU0sR0FBUTtnQkFDWixJQUFJLENBQUMsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7b0JBQzVELGNBQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2pCO1lBQ0gsQ0FBQztZQUNILGNBQUM7UUFBRCxDQUFDLEFBUm1CLENBQWMsOEJBQW1CLEVBUXBELENBQUM7UUFFRiw2RkFBNkY7UUFDN0YsK0NBQStDO1FBQy9DLElBQUksR0FBRyxZQUFZLHdCQUFhLEVBQUU7WUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7U0FDZjtRQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbkIsT0FBTyxJQUFJLGtCQUFXLENBQU0sSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzlD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Q0FBQyxDQUFDO2dCQUM5RCxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLENBQUM7WUFDRCxxQkFBcUIsWUFBQyxHQUFHO2dCQUN2QixJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsT0FBTyxFQUFDLE1BQU0sUUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDO0lBakZELGtEQWlGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGggYXMgQXN0UGF0aEJhc2UsIEFTVFdpdGhOYW1lLCBBU1RXaXRoU291cmNlLCBSZWN1cnNpdmVBc3RWaXNpdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7QXN0VHlwZX0gZnJvbSAnLi9leHByZXNzaW9uX3R5cGUnO1xuaW1wb3J0IHtCdWlsdGluVHlwZSwgU3BhbiwgU3ltYm9sLCBTeW1ib2xUYWJsZSwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtpblNwYW59IGZyb20gJy4vdXRpbHMnO1xuXG50eXBlIEFzdFBhdGggPSBBc3RQYXRoQmFzZTxBU1Q+O1xuXG5mdW5jdGlvbiBmaW5kQXN0QXQoYXN0OiBBU1QsIHBvc2l0aW9uOiBudW1iZXIsIGV4Y2x1ZGVFbXB0eTogYm9vbGVhbiA9IGZhbHNlKTogQXN0UGF0aCB7XG4gIGNvbnN0IHBhdGg6IEFTVFtdID0gW107XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdChhc3Q6IEFTVCkge1xuICAgICAgaWYgKCghZXhjbHVkZUVtcHR5IHx8IGFzdC5zb3VyY2VTcGFuLnN0YXJ0IDwgYXN0LnNvdXJjZVNwYW4uZW5kKSAmJlxuICAgICAgICAgIGluU3Bhbihwb3NpdGlvbiwgYXN0LnNvdXJjZVNwYW4pKSB7XG4gICAgICAgIHBhdGgucHVzaChhc3QpO1xuICAgICAgICBhc3QudmlzaXQodGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFdlIG5ldmVyIGNhcmUgYWJvdXQgdGhlIEFTVFdpdGhTb3VyY2Ugbm9kZSBhbmQgaXRzIHZpc2l0KCkgbWV0aG9kIGNhbGxzIGl0cyBhc3QncyB2aXNpdCBzb1xuICAvLyB0aGUgdmlzaXQoKSBtZXRob2QgYWJvdmUgd291bGQgbmV2ZXIgc2VlIGl0LlxuICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgIGFzdCA9IGFzdC5hc3Q7XG4gIH1cblxuICB2aXNpdG9yLnZpc2l0KGFzdCk7XG5cbiAgcmV0dXJuIG5ldyBBc3RQYXRoQmFzZTxBU1Q+KHBhdGgsIHBvc2l0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICBzY29wZTogU3ltYm9sVGFibGUsIGFzdDogQVNULCBwb3NpdGlvbjogbnVtYmVyLCB0ZW1wbGF0ZUluZm86IFRlbXBsYXRlU291cmNlKTogU3ltYm9sW118XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRBc3RBdChhc3QsIHBvc2l0aW9uKTtcbiAgaWYgKHBhdGguZW1wdHkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWwhO1xuICBsZXQgcmVzdWx0OiBTeW1ib2xUYWJsZXx1bmRlZmluZWQgPSBzY29wZTtcblxuICBmdW5jdGlvbiBnZXRUeXBlKGFzdDogQVNUKTogU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IEFzdFR5cGUoc2NvcGUsIHRlbXBsYXRlSW5mby5xdWVyeSwge30sIHRlbXBsYXRlSW5mby5zb3VyY2UpLmdldFR5cGUoYXN0KTtcbiAgfVxuXG4gIC8vIElmIHRoZSBjb21wbGV0aW9uIHJlcXVlc3QgaXMgaW4gYSBub3QgaW4gYSBwaXBlIG9yIHByb3BlcnR5IGFjY2VzcyB0aGVuIHRoZSBnbG9iYWwgc2NvcGVcbiAgLy8gKHRoYXQgaXMgdGhlIHNjb3BlIG9mIHRoZSBpbXBsaWNpdCByZWNlaXZlcikgaXMgdGhlIHJpZ2h0IHNjb3BlIGFzIHRoZSB1c2VyIGlzIHR5cGluZyB0aGVcbiAgLy8gYmVnaW5uaW5nIG9mIGFuIGV4cHJlc3Npb24uXG4gIHRhaWwudmlzaXQoe1xuICAgIHZpc2l0QmluYXJ5KF9hc3QpIHt9LFxuICAgIHZpc2l0Q2hhaW4oX2FzdCkge30sXG4gICAgdmlzaXRDb25kaXRpb25hbChfYXN0KSB7fSxcbiAgICB2aXNpdEZ1bmN0aW9uQ2FsbChfYXN0KSB7fSxcbiAgICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoX2FzdCkge30sXG4gICAgdmlzaXRJbnRlcnBvbGF0aW9uKF9hc3QpIHtcbiAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICB9LFxuICAgIHZpc2l0S2V5ZWRSZWFkKF9hc3QpIHt9LFxuICAgIHZpc2l0S2V5ZWRXcml0ZShfYXN0KSB7fSxcbiAgICB2aXNpdExpdGVyYWxBcnJheShfYXN0KSB7fSxcbiAgICB2aXNpdExpdGVyYWxNYXAoX2FzdCkge30sXG4gICAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKF9hc3QpIHt9LFxuICAgIHZpc2l0TWV0aG9kQ2FsbChfYXN0KSB7fSxcbiAgICB2aXNpdFBpcGUoYXN0KSB7XG4gICAgICBpZiAocG9zaXRpb24gPj0gYXN0LmV4cC5zcGFuLmVuZCAmJlxuICAgICAgICAgICghYXN0LmFyZ3MgfHwgIWFzdC5hcmdzLmxlbmd0aCB8fCBwb3NpdGlvbiA8ICg8QVNUPmFzdC5hcmdzWzBdKS5zcGFuLnN0YXJ0KSkge1xuICAgICAgICAvLyBXZSBhcmUgaW4gYSBwb3NpdGlvbiBhIHBpcGUgbmFtZSBpcyBleHBlY3RlZC5cbiAgICAgICAgcmVzdWx0ID0gdGVtcGxhdGVJbmZvLnF1ZXJ5LmdldFBpcGVzKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB2aXNpdFByZWZpeE5vdChfYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoX2FzdCkge30sXG4gICAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFF1b3RlKF9hc3QpIHtcbiAgICAgIC8vIEZvciBhIHF1b3RlLCByZXR1cm4gdGhlIG1lbWJlcnMgb2YgYW55IChpZiB0aGVyZSBhcmUgYW55KS5cbiAgICAgIHJlc3VsdCA9IHRlbXBsYXRlSW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpLm1lbWJlcnMoKTtcbiAgICB9LFxuICAgIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICByZXN1bHQgPSByZWNlaXZlclR5cGUgPyByZWNlaXZlclR5cGUubWVtYmVycygpIDogc2NvcGU7XG4gICAgfSxcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdCAmJiByZXN1bHQudmFsdWVzKCk7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBleHByZXNzaW9uIHN5bWJvbCBhdCBhIHBhcnRpY3VsYXIgcG9zaXRpb24gaW4gYSB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gc2NvcGUgc3ltYm9scyBpbiBzY29wZSBvZiB0aGUgdGVtcGxhdGVcbiAqIEBwYXJhbSBhc3QgdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gYWJzb2x1dGUgbG9jYXRpb24gaW4gdGVtcGxhdGUgdG8gcmV0cmlldmUgc3ltYm9sIGF0XG4gKiBAcGFyYW0gcXVlcnkgdHlwZSBzeW1ib2wgcXVlcnkgZm9yIHRoZSB0ZW1wbGF0ZSBzY29wZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwcmVzc2lvblN5bWJvbChcbiAgICBzY29wZTogU3ltYm9sVGFibGUsIGFzdDogQVNULCBwb3NpdGlvbjogbnVtYmVyLFxuICAgIHRlbXBsYXRlSW5mbzogVGVtcGxhdGVTb3VyY2UpOiB7c3ltYm9sOiBTeW1ib2wsIHNwYW46IFNwYW59fHVuZGVmaW5lZCB7XG4gIGNvbnN0IHBhdGggPSBmaW5kQXN0QXQoYXN0LCBwb3NpdGlvbiwgLyogZXhjbHVkZUVtcHR5ICovIHRydWUpO1xuICBpZiAocGF0aC5lbXB0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdGFpbCA9IHBhdGgudGFpbCE7XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZShhc3Q6IEFTVCk6IFN5bWJvbCB7XG4gICAgcmV0dXJuIG5ldyBBc3RUeXBlKHNjb3BlLCB0ZW1wbGF0ZUluZm8ucXVlcnksIHt9LCB0ZW1wbGF0ZUluZm8uc291cmNlKS5nZXRUeXBlKGFzdCk7XG4gIH1cblxuICBmdW5jdGlvbiBzcGFuRnJvbU5hbWUoYXN0OiBBU1RXaXRoTmFtZSk6IFNwYW4ge1xuICAgIC8vIGBuYW1lU3BhbmAgaXMgYW4gYWJzb2x1dGUgc3BhbiwgYnV0IHRoZSBzcGFuIGV4cGVjdGVkIGJ5IHRoZSByZXN1bHQgb2YgdGhpcyBtZXRob2QgaXNcbiAgICAvLyByZWxhdGl2ZSB0byB0aGUgc3RhcnQgb2YgdGhlIGV4cHJlc3Npb24uXG4gICAgLy8gVE9ETyhheWF6aGFmaXopOiBtaWdyYXRlIHRvIG9ubHkgdXNpbmcgYWJzb2x1dGUgc3BhbnNcbiAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydCAtIGFzdC5zcGFuLnN0YXJ0O1xuICAgIHJldHVybiB7XG4gICAgICBzdGFydDogYXN0Lm5hbWVTcGFuLnN0YXJ0IC0gb2Zmc2V0LFxuICAgICAgZW5kOiBhc3QubmFtZVNwYW4uZW5kIC0gb2Zmc2V0LFxuICAgIH07XG4gIH1cblxuICBsZXQgc3ltYm9sOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgc3BhbjogU3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLy8gSWYgdGhlIGNvbXBsZXRpb24gcmVxdWVzdCBpcyBpbiBhIG5vdCBpbiBhIHBpcGUgb3IgcHJvcGVydHkgYWNjZXNzIHRoZW4gdGhlIGdsb2JhbCBzY29wZVxuICAvLyAodGhhdCBpcyB0aGUgc2NvcGUgb2YgdGhlIGltcGxpY2l0IHJlY2VpdmVyKSBpcyB0aGUgcmlnaHQgc2NvcGUgYXMgdGhlIHVzZXIgaXMgdHlwaW5nIHRoZVxuICAvLyBiZWdpbm5pbmcgb2YgYW4gZXhwcmVzc2lvbi5cbiAgdGFpbC52aXNpdCh7XG4gICAgdmlzaXRCaW5hcnkoX2FzdCkge30sXG4gICAgdmlzaXRDaGFpbihfYXN0KSB7fSxcbiAgICB2aXNpdENvbmRpdGlvbmFsKF9hc3QpIHt9LFxuICAgIHZpc2l0RnVuY3Rpb25DYWxsKF9hc3QpIHt9LFxuICAgIHZpc2l0SW1wbGljaXRSZWNlaXZlcihfYXN0KSB7fSxcbiAgICB2aXNpdEludGVycG9sYXRpb24oX2FzdCkge30sXG4gICAgdmlzaXRLZXllZFJlYWQoX2FzdCkge30sXG4gICAgdmlzaXRLZXllZFdyaXRlKF9hc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbEFycmF5KF9hc3QpIHt9LFxuICAgIHZpc2l0TGl0ZXJhbE1hcChfYXN0KSB7fSxcbiAgICB2aXNpdExpdGVyYWxQcmltaXRpdmUoX2FzdCkge30sXG4gICAgdmlzaXRNZXRob2RDYWxsKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBzcGFuRnJvbU5hbWUoYXN0KTtcbiAgICB9LFxuICAgIHZpc2l0UGlwZShhc3QpIHtcbiAgICAgIGlmIChpblNwYW4ocG9zaXRpb24sIGFzdC5uYW1lU3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiBhIHBvc2l0aW9uIGEgcGlwZSBuYW1lIGlzIGV4cGVjdGVkLlxuICAgICAgICBjb25zdCBwaXBlcyA9IHRlbXBsYXRlSW5mby5xdWVyeS5nZXRQaXBlcygpO1xuICAgICAgICBzeW1ib2wgPSBwaXBlcy5nZXQoYXN0Lm5hbWUpO1xuICAgICAgICBzcGFuID0gc3BhbkZyb21OYW1lKGFzdCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB2aXNpdFByZWZpeE5vdChfYXN0KSB7fSxcbiAgICB2aXNpdE5vbk51bGxBc3NlcnQoX2FzdCkge30sXG4gICAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgc3BhbiA9IHNwYW5Gcm9tTmFtZShhc3QpO1xuICAgIH0sXG4gICAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdCkge1xuICAgICAgY29uc3QgcmVjZWl2ZXJUeXBlID0gZ2V0VHlwZShhc3QucmVjZWl2ZXIpO1xuICAgICAgc3ltYm9sID0gcmVjZWl2ZXJUeXBlICYmIHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICAgIHNwYW4gPSBzcGFuRnJvbU5hbWUoYXN0KTtcbiAgICB9LFxuICAgIHZpc2l0UXVvdGUoX2FzdCkge30sXG4gICAgdmlzaXRTYWZlTWV0aG9kQ2FsbChhc3QpIHtcbiAgICAgIGNvbnN0IHJlY2VpdmVyVHlwZSA9IGdldFR5cGUoYXN0LnJlY2VpdmVyKTtcbiAgICAgIHN5bWJvbCA9IHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgICBzcGFuID0gc3BhbkZyb21OYW1lKGFzdCk7XG4gICAgfSxcbiAgICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0KSB7XG4gICAgICBjb25zdCByZWNlaXZlclR5cGUgPSBnZXRUeXBlKGFzdC5yZWNlaXZlcik7XG4gICAgICBzeW1ib2wgPSByZWNlaXZlclR5cGUgJiYgcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgICAgc3BhbiA9IHNwYW5Gcm9tTmFtZShhc3QpO1xuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChzeW1ib2wgJiYgc3Bhbikge1xuICAgIHJldHVybiB7c3ltYm9sLCBzcGFufTtcbiAgfVxufVxuIl19