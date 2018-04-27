/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { ASTWithSource, AstPath as AstPathBase, NullAstVisitor, visitAstChildren } from '@angular/compiler';
import { AstType } from '@angular/compiler-cli/src/language_services';
import { BuiltinType } from './types';
import { inSpan } from './utils';
function findAstAt(ast, position, excludeEmpty) {
    if (excludeEmpty === void 0) { excludeEmpty = false; }
    var path = [];
    var visitor = new /** @class */ (function (_super) {
        tslib_1.__extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.visit = function (ast) {
            if ((!excludeEmpty || ast.span.start < ast.span.end) && inSpan(position, ast.span)) {
                path.push(ast);
                visitAstChildren(ast, this);
            }
        };
        return class_1;
    }(NullAstVisitor));
    // We never care about the ASTWithSource node and its visit() method calls its ast's visit so
    // the visit() method above would never see it.
    if (ast instanceof ASTWithSource) {
        ast = ast.ast;
    }
    visitor.visit(ast);
    return new AstPathBase(path, position);
}
export function getExpressionCompletions(scope, ast, position, query) {
    var path = findAstAt(ast, position);
    if (path.empty)
        return undefined;
    var tail = path.tail;
    var result = scope;
    function getType(ast) { return new AstType(scope, query, {}).getType(ast); }
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
            result = query.getBuiltinType(BuiltinType.Any).members();
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
export function getExpressionSymbol(scope, ast, position, query) {
    var path = findAstAt(ast, position, /* excludeEmpty */ true);
    if (path.empty)
        return undefined;
    var tail = path.tail;
    function getType(ast) { return new AstType(scope, query, {}).getType(ast); }
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
//# sourceMappingURL=expressions.js.map