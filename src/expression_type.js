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
        define("@angular/language-service/src/expression_type", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/language-service/src/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var symbols_1 = require("@angular/language-service/src/symbols");
    var TypeDiagnostic = /** @class */ (function () {
        function TypeDiagnostic(kind, message, ast) {
            this.kind = kind;
            this.message = message;
            this.ast = ast;
        }
        return TypeDiagnostic;
    }());
    exports.TypeDiagnostic = TypeDiagnostic;
    // AstType calculatetype of the ast given AST element.
    var AstType = /** @class */ (function () {
        function AstType(scope, query, context) {
            this.scope = scope;
            this.query = query;
            this.context = context;
        }
        AstType.prototype.getType = function (ast) { return ast.visit(this); };
        AstType.prototype.getDiagnostics = function (ast) {
            this.diagnostics = [];
            var type = ast.visit(this);
            if (this.context.event && type.callable) {
                this.reportWarning('Unexpected callable expression. Expected a method call', ast);
            }
            return this.diagnostics;
        };
        AstType.prototype.visitBinary = function (ast) {
            var _this_1 = this;
            // Treat undefined and null as other.
            function normalize(kind, other) {
                switch (kind) {
                    case symbols_1.BuiltinType.Undefined:
                    case symbols_1.BuiltinType.Null:
                        return normalize(other, symbols_1.BuiltinType.Other);
                }
                return kind;
            }
            var getType = function (ast, operation) {
                var type = _this_1.getType(ast);
                if (type.nullable) {
                    switch (operation) {
                        case '&&':
                        case '||':
                        case '==':
                        case '!=':
                        case '===':
                        case '!==':
                            // Nullable allowed.
                            break;
                        default:
                            _this_1.reportError("The expression might be null", ast);
                            break;
                    }
                    return _this_1.query.getNonNullableType(type);
                }
                return type;
            };
            var leftType = getType(ast.left, ast.operation);
            var rightType = getType(ast.right, ast.operation);
            var leftRawKind = this.query.getTypeKind(leftType);
            var rightRawKind = this.query.getTypeKind(rightType);
            var leftKind = normalize(leftRawKind, rightRawKind);
            var rightKind = normalize(rightRawKind, leftRawKind);
            // The following swtich implements operator typing similar to the
            // type production tables in the TypeScript specification.
            // https://github.com/Microsoft/TypeScript/blob/v1.8.10/doc/spec.md#4.19
            var operKind = leftKind << 8 | rightKind;
            switch (ast.operation) {
                case '*':
                case '/':
                case '%':
                case '-':
                case '<<':
                case '>>':
                case '>>>':
                case '&':
                case '^':
                case '|':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        default:
                            var errorAst = ast.left;
                            switch (leftKind) {
                                case symbols_1.BuiltinType.Any:
                                case symbols_1.BuiltinType.Number:
                                    errorAst = ast.right;
                                    break;
                            }
                            return this.reportError('Expected a numeric type', errorAst);
                    }
                case '+':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Any:
                            return this.anyType;
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.String:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.String);
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Number:
                            return this.reportError('Expected a number type', ast.left);
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Other:
                            return this.reportError('Expected a number type', ast.right);
                        default:
                            return this.reportError('Expected operands to be a string or number type', ast);
                    }
                case '>':
                case '<':
                case '<=':
                case '>=':
                case '==':
                case '!=':
                case '===':
                case '!==':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Other:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
                        default:
                            return this.reportError('Expected the operants to be of similar type or any', ast);
                    }
                case '&&':
                    return rightType;
                case '||':
                    return this.query.getTypeUnion(leftType, rightType);
            }
            return this.reportError("Unrecognized operator " + ast.operation, ast);
        };
        AstType.prototype.visitChain = function (ast) {
            if (this.diagnostics) {
                // If we are producing diagnostics, visit the children
                compiler_1.visitAstChildren(ast, this);
            }
            // The type of a chain is always undefined.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
        };
        AstType.prototype.visitConditional = function (ast) {
            // The type of a conditional is the union of the true and false conditions.
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            return this.query.getTypeUnion(this.getType(ast.trueExp), this.getType(ast.falseExp));
        };
        AstType.prototype.visitFunctionCall = function (ast) {
            var _this_1 = this;
            // The type of a function call is the return type of the selected signature.
            // The signature is selected based on the types of the arguments. Angular doesn't
            // support contextual typing of arguments so this is simpler than TypeScript's
            // version.
            var args = ast.args.map(function (arg) { return _this_1.getType(arg); });
            var target = this.getType(ast.target);
            if (!target || !target.callable)
                return this.reportError('Call target is not callable', ast);
            var signature = target.selectSignature(args);
            if (signature)
                return signature.result;
            // TODO: Consider a better error message here.
            return this.reportError('Unable no compatible signature found for call', ast);
        };
        AstType.prototype.visitImplicitReceiver = function (ast) {
            var _this = this;
            // Return a pseudo-symbol for the implicit receiver.
            // The members of the implicit receiver are what is defined by the
            // scope passed into this class.
            return {
                name: '$implicit',
                kind: 'component',
                language: 'ng-template',
                type: undefined,
                container: undefined,
                callable: false,
                nullable: false,
                public: true,
                definition: undefined,
                members: function () { return _this.scope; },
                signatures: function () { return []; },
                selectSignature: function (types) { return undefined; },
                indexed: function (argument) { return undefined; }
            };
        };
        AstType.prototype.visitInterpolation = function (ast) {
            // If we are producing diagnostics, visit the children.
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            return this.undefinedType;
        };
        AstType.prototype.visitKeyedRead = function (ast) {
            var targetType = this.getType(ast.obj);
            var keyType = this.getType(ast.key);
            var result = targetType.indexed(keyType, ast.key instanceof compiler_1.LiteralPrimitive ? ast.key.value : undefined);
            return result || this.anyType;
        };
        AstType.prototype.visitKeyedWrite = function (ast) {
            // The write of a type is the type of the value being written.
            return this.getType(ast.value);
        };
        AstType.prototype.visitLiteralArray = function (ast) {
            var _a;
            var _this_1 = this;
            // A type literal is an array type of the union of the elements
            return this.query.getArrayType((_a = this.query).getTypeUnion.apply(_a, tslib_1.__spread(ast.expressions.map(function (element) { return _this_1.getType(element); }))));
        };
        AstType.prototype.visitLiteralMap = function (ast) {
            // If we are producing diagnostics, visit the children
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            // TODO: Return a composite type.
            return this.anyType;
        };
        AstType.prototype.visitLiteralPrimitive = function (ast) {
            // The type of a literal primitive depends on the value of the literal.
            switch (ast.value) {
                case true:
                case false:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
                case null:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Null);
                case undefined:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
                default:
                    switch (typeof ast.value) {
                        case 'string':
                            return this.query.getBuiltinType(symbols_1.BuiltinType.String);
                        case 'number':
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        default:
                            return this.reportError('Unrecognized primitive', ast);
                    }
            }
        };
        AstType.prototype.visitMethodCall = function (ast) {
            return this.resolveMethodCall(this.getType(ast.receiver), ast);
        };
        AstType.prototype.visitPipe = function (ast) {
            var _this_1 = this;
            // The type of a pipe node is the return type of the pipe's transform method. The table returned
            // by getPipes() is expected to contain symbols with the corresponding transform method type.
            var pipe = this.query.getPipes().get(ast.name);
            if (!pipe)
                return this.reportError("No pipe by the name " + ast.name + " found", ast);
            var expType = this.getType(ast.exp);
            var signature = pipe.selectSignature([expType].concat(ast.args.map(function (arg) { return _this_1.getType(arg); })));
            if (!signature)
                return this.reportError('Unable to resolve signature for pipe invocation', ast);
            return signature.result;
        };
        AstType.prototype.visitPrefixNot = function (ast) {
            // If we are producing diagnostics, visit the children
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            // The type of a prefix ! is always boolean.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
        };
        AstType.prototype.visitNonNullAssert = function (ast) {
            var expressionType = this.getType(ast.expression);
            return this.query.getNonNullableType(expressionType);
        };
        AstType.prototype.visitPropertyRead = function (ast) {
            return this.resolvePropertyRead(this.getType(ast.receiver), ast);
        };
        AstType.prototype.visitPropertyWrite = function (ast) {
            // The type of a write is the type of the value being written.
            return this.getType(ast.value);
        };
        AstType.prototype.visitQuote = function (ast) {
            // The type of a quoted expression is any.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Any);
        };
        AstType.prototype.visitSafeMethodCall = function (ast) {
            return this.resolveMethodCall(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
        };
        AstType.prototype.visitSafePropertyRead = function (ast) {
            return this.resolvePropertyRead(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
        };
        Object.defineProperty(AstType.prototype, "anyType", {
            get: function () {
                var result = this._anyType;
                if (!result) {
                    result = this._anyType = this.query.getBuiltinType(symbols_1.BuiltinType.Any);
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstType.prototype, "undefinedType", {
            get: function () {
                var result = this._undefinedType;
                if (!result) {
                    result = this._undefinedType = this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        AstType.prototype.resolveMethodCall = function (receiverType, ast) {
            var _this_1 = this;
            if (this.isAny(receiverType)) {
                return this.anyType;
            }
            // The type of a method is the selected methods result type.
            var method = receiverType.members().get(ast.name);
            if (!method)
                return this.reportError("Unknown method '" + ast.name + "'", ast);
            if (!method.type)
                return this.reportError("Could not find a type for '" + ast.name + "'", ast);
            if (!method.type.callable)
                return this.reportError("Member '" + ast.name + "' is not callable", ast);
            var signature = method.type.selectSignature(ast.args.map(function (arg) { return _this_1.getType(arg); }));
            if (!signature)
                return this.reportError("Unable to resolve signature for call of method " + ast.name, ast);
            return signature.result;
        };
        AstType.prototype.resolvePropertyRead = function (receiverType, ast) {
            if (this.isAny(receiverType)) {
                return this.anyType;
            }
            // The type of a property read is the seelcted member's type.
            var member = receiverType.members().get(ast.name);
            if (!member) {
                var receiverInfo = receiverType.name;
                if (receiverInfo == '$implicit') {
                    receiverInfo =
                        'The component declaration, template variable declarations, and element references do';
                }
                else if (receiverType.nullable) {
                    return this.reportError("The expression might be null", ast.receiver);
                }
                else {
                    receiverInfo = "'" + receiverInfo + "' does";
                }
                return this.reportError("Identifier '" + ast.name + "' is not defined. " + receiverInfo + " not contain such a member", ast);
            }
            if (!member.public) {
                var receiverInfo = receiverType.name;
                if (receiverInfo == '$implicit') {
                    receiverInfo = 'the component';
                }
                else {
                    receiverInfo = "'" + receiverInfo + "'";
                }
                this.reportWarning("Identifier '" + ast.name + "' refers to a private member of " + receiverInfo, ast);
            }
            return member.type;
        };
        AstType.prototype.reportError = function (message, ast) {
            if (this.diagnostics) {
                this.diagnostics.push(new TypeDiagnostic(ts.DiagnosticCategory.Error, message, ast));
            }
            return this.anyType;
        };
        AstType.prototype.reportWarning = function (message, ast) {
            if (this.diagnostics) {
                this.diagnostics.push(new TypeDiagnostic(ts.DiagnosticCategory.Warning, message, ast));
            }
            return this.anyType;
        };
        AstType.prototype.isAny = function (symbol) {
            return !symbol || this.query.getTypeKind(symbol) == symbols_1.BuiltinType.Any ||
                (!!symbol.type && this.isAny(symbol.type));
        };
        return AstType;
    }());
    exports.AstType = AstType;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl90eXBlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvZXhwcmVzc2lvbl90eXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyVTtJQUMzVSwrQkFBaUM7SUFFakMsaUVBQW1GO0lBSW5GO1FBQ0Usd0JBQW1CLElBQTJCLEVBQVMsT0FBZSxFQUFTLEdBQVE7WUFBcEUsU0FBSSxHQUFKLElBQUksQ0FBdUI7WUFBUyxZQUFPLEdBQVAsT0FBTyxDQUFRO1lBQVMsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFHLENBQUM7UUFDN0YscUJBQUM7SUFBRCxDQUFDLEFBRkQsSUFFQztJQUZZLHdDQUFjO0lBSTNCLHNEQUFzRDtJQUN0RDtRQUlFLGlCQUNZLEtBQWtCLEVBQVUsS0FBa0IsRUFDOUMsT0FBcUM7WUFEckMsVUFBSyxHQUFMLEtBQUssQ0FBYTtZQUFVLFVBQUssR0FBTCxLQUFLLENBQWE7WUFDOUMsWUFBTyxHQUFQLE9BQU8sQ0FBOEI7UUFBRyxDQUFDO1FBRXJELHlCQUFPLEdBQVAsVUFBUSxHQUFRLElBQVksT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRCxnQ0FBYyxHQUFkLFVBQWUsR0FBUTtZQUNyQixJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUN0QixJQUFNLElBQUksR0FBVyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDdkMsSUFBSSxDQUFDLGFBQWEsQ0FBQyx3REFBd0QsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUNuRjtZQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztR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QUFXLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksY0FBYyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDdEY7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEIsQ0FBQztRQUVPLCtCQUFhLEdBQXJCLFVBQXNCLE9BQWUsRUFBRSxHQUFRO1lBQzdDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUN4RjtZQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFDO1FBRU8sdUJBQUssR0FBYixVQUFjLE1BQWM7WUFDMUIsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxxQkFBVyxDQUFDLEdBQUc7Z0JBQy9ELENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0gsY0FBQztJQUFELENBQUMsQUF0WkQsSUFzWkM7SUF0WlksMEJBQU8iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBc3RWaXNpdG9yLCBCaW5hcnksIEJpbmRpbmdQaXBlLCBDaGFpbiwgQ29uZGl0aW9uYWwsIEZ1bmN0aW9uQ2FsbCwgSW1wbGljaXRSZWNlaXZlciwgSW50ZXJwb2xhdGlvbiwgS2V5ZWRSZWFkLCBLZXllZFdyaXRlLCBMaXRlcmFsQXJyYXksIExpdGVyYWxNYXAsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIE5vbk51bGxBc3NlcnQsIFByZWZpeE5vdCwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBRdW90ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIHZpc2l0QXN0Q2hpbGRyZW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0J1aWx0aW5UeXBlLCBTaWduYXR1cmUsIFN5bWJvbCwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cHJlc3Npb25EaWFnbm9zdGljc0NvbnRleHQgeyBldmVudD86IGJvb2xlYW47IH1cblxuZXhwb3J0IGNsYXNzIFR5cGVEaWFnbm9zdGljIHtcbiAgY29uc3RydWN0b3IocHVibGljIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSwgcHVibGljIG1lc3NhZ2U6IHN0cmluZywgcHVibGljIGFzdDogQVNUKSB7fVxufVxuXG4vLyBBc3RUeXBlIGNhbGN1bGF0ZXR5cGUgb2YgdGhlIGFzdCBnaXZlbiBBU1QgZWxlbWVudC5cbmV4cG9ydCBjbGFzcyBBc3RUeXBlIGltcGxlbWVudHMgQXN0VmlzaXRvciB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwdWJsaWMgZGlhZ25vc3RpY3MgITogVHlwZURpYWdub3N0aWNbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgc2NvcGU6IFN5bWJvbFRhYmxlLCBwcml2YXRlIHF1ZXJ5OiBTeW1ib2xRdWVyeSxcbiAgICAgIHByaXZhdGUgY29udGV4dDogRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCkge31cblxuICBnZXRUeXBlKGFzdDogQVNUKTogU3ltYm9sIHsgcmV0dXJuIGFzdC52aXNpdCh0aGlzKTsgfVxuXG4gIGdldERpYWdub3N0aWNzKGFzdDogQVNUKTogVHlwZURpYWdub3N0aWNbXSB7XG4gICAgdGhpcy5kaWFnbm9zdGljcyA9IFtdO1xuICAgIGNvbnN0IHR5cGU6IFN5bWJvbCA9IGFzdC52aXNpdCh0aGlzKTtcbiAgICBpZiAodGhpcy5jb250ZXh0LmV2ZW50ICYmIHR5cGUuY2FsbGFibGUpIHtcbiAgICAgIHRoaXMucmVwb3J0V2FybmluZygnVW5leHBlY3RlZCBjYWxsYWJsZSBleHByZXNzaW9uLiBFeHBlY3RlZCBhIG1ldGhvZCBjYWxsJywgYXN0KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3M7XG4gIH1cblxuICB2aXNpdEJpbmFyeShhc3Q6IEJpbmFyeSk6IFN5bWJvbCB7XG4gICAgLy8gVHJlYXQgdW5kZWZpbmVkIGFuZCBudWxsIGFzIG90aGVyLlxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZShraW5kOiBCdWlsdGluVHlwZSwgb3RoZXI6IEJ1aWx0aW5UeXBlKTogQnVpbHRpblR5cGUge1xuICAgICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgIGNhc2UgQnVpbHRpblR5cGUuVW5kZWZpbmVkOlxuICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bGw6XG4gICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZShvdGhlciwgQnVpbHRpblR5cGUuT3RoZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtpbmQ7XG4gICAgfVxuXG4gICAgY29uc3QgZ2V0VHlwZSA9IChhc3Q6IEFTVCwgb3BlcmF0aW9uOiBzdHJpbmcpOiBTeW1ib2wgPT4ge1xuICAgICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZShhc3QpO1xuICAgICAgaWYgKHR5cGUubnVsbGFibGUpIHtcbiAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICBjYXNlICcmJic6XG4gICAgICAgICAgY2FzZSAnfHwnOlxuICAgICAgICAgIGNhc2UgJz09JzpcbiAgICAgICAgICBjYXNlICchPSc6XG4gICAgICAgICAgY2FzZSAnPT09JzpcbiAgICAgICAgICBjYXNlICchPT0nOlxuICAgICAgICAgICAgLy8gTnVsbGFibGUgYWxsb3dlZC5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLnJlcG9ydEVycm9yKGBUaGUgZXhwcmVzc2lvbiBtaWdodCBiZSBudWxsYCwgYXN0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldE5vbk51bGxhYmxlVHlwZSh0eXBlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0eXBlO1xuICAgIH07XG5cbiAgICBjb25zdCBsZWZ0VHlwZSA9IGdldFR5cGUoYXN0LmxlZnQsIGFzdC5vcGVyYXRpb24pO1xuICAgIGNvbnN0IHJpZ2h0VHlwZSA9IGdldFR5cGUoYXN0LnJpZ2h0LCBhc3Qub3BlcmF0aW9uKTtcbiAgICBjb25zdCBsZWZ0UmF3S2luZCA9IHRoaXMucXVlcnkuZ2V0VHlwZUtpbmQobGVmdFR5cGUpO1xuICAgIGNvbnN0IHJpZ2h0UmF3S2luZCA9IHRoaXMucXVlcnkuZ2V0VHlwZUtpbmQocmlnaHRUeXBlKTtcbiAgICBjb25zdCBsZWZ0S2luZCA9IG5vcm1hbGl6ZShsZWZ0UmF3S2luZCwgcmlnaHRSYXdLaW5kKTtcbiAgICBjb25zdCByaWdodEtpbmQgPSBub3JtYWxpemUocmlnaHRSYXdLaW5kLCBsZWZ0UmF3S2luZCk7XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIHN3dGljaCBpbXBsZW1lbnRzIG9wZXJhdG9yIHR5cGluZyBzaW1pbGFyIHRvIHRoZVxuICAgIC8vIHR5cGUgcHJvZHVjdGlvbiB0YWJsZXMgaW4gdGhlIFR5cGVTY3JpcHQgc3BlY2lmaWNhdGlvbi5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92MS44LjEwL2RvYy9zcGVjLm1kIzQuMTlcbiAgICBjb25zdCBvcGVyS2luZCA9IGxlZnRLaW5kIDw8IDggfCByaWdodEtpbmQ7XG4gICAgc3dpdGNoIChhc3Qub3BlcmF0aW9uKSB7XG4gICAgICBjYXNlICcqJzpcbiAgICAgIGNhc2UgJy8nOlxuICAgICAgY2FzZSAnJSc6XG4gICAgICBjYXNlICctJzpcbiAgICAgIGNhc2UgJzw8JzpcbiAgICAgIGNhc2UgJz4+JzpcbiAgICAgIGNhc2UgJz4+Pic6XG4gICAgICBjYXNlICcmJzpcbiAgICAgIGNhc2UgJ14nOlxuICAgICAgY2FzZSAnfCc6XG4gICAgICAgIHN3aXRjaCAob3BlcktpbmQpIHtcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuTnVtYmVyKTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgbGV0IGVycm9yQXN0ID0gYXN0LmxlZnQ7XG4gICAgICAgICAgICBzd2l0Y2ggKGxlZnRLaW5kKSB7XG4gICAgICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICAgICAgICBlcnJvckFzdCA9IGFzdC5yaWdodDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdFeHBlY3RlZCBhIG51bWVyaWMgdHlwZScsIGVycm9yQXN0KTtcbiAgICAgICAgfVxuICAgICAgY2FzZSAnKyc6XG4gICAgICAgIHN3aXRjaCAob3BlcktpbmQpIHtcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5Cb29sZWFuOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5PdGhlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLlN0cmluZyk7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLk51bWJlcik7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5Cb29sZWFuIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5PdGhlciA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyIHR5cGUnLCBhc3QubGVmdCk7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkJvb2xlYW46XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyIHR5cGUnLCBhc3QucmlnaHQpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignRXhwZWN0ZWQgb3BlcmFuZHMgdG8gYmUgYSBzdHJpbmcgb3IgbnVtYmVyIHR5cGUnLCBhc3QpO1xuICAgICAgICB9XG4gICAgICBjYXNlICc+JzpcbiAgICAgIGNhc2UgJzwnOlxuICAgICAgY2FzZSAnPD0nOlxuICAgICAgY2FzZSAnPj0nOlxuICAgICAgY2FzZSAnPT0nOlxuICAgICAgY2FzZSAnIT0nOlxuICAgICAgY2FzZSAnPT09JzpcbiAgICAgIGNhc2UgJyE9PSc6XG4gICAgICAgIHN3aXRjaCAob3BlcktpbmQpIHtcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5Cb29sZWFuOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuT3RoZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5Cb29sZWFuIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5Cb29sZWFuIDw8IDggfCBCdWlsdGluVHlwZS5Cb29sZWFuOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5PdGhlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQm9vbGVhbik7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdFeHBlY3RlZCB0aGUgb3BlcmFudHMgdG8gYmUgb2Ygc2ltaWxhciB0eXBlIG9yIGFueScsIGFzdCk7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgJyYmJzpcbiAgICAgICAgcmV0dXJuIHJpZ2h0VHlwZTtcbiAgICAgIGNhc2UgJ3x8JzpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0VHlwZVVuaW9uKGxlZnRUeXBlLCByaWdodFR5cGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBVbnJlY29nbml6ZWQgb3BlcmF0b3IgJHthc3Qub3BlcmF0aW9ufWAsIGFzdCk7XG4gIH1cblxuICB2aXNpdENoYWluKGFzdDogQ2hhaW4pIHtcbiAgICBpZiAodGhpcy5kaWFnbm9zdGljcykge1xuICAgICAgLy8gSWYgd2UgYXJlIHByb2R1Y2luZyBkaWFnbm9zdGljcywgdmlzaXQgdGhlIGNoaWxkcmVuXG4gICAgICB2aXNpdEFzdENoaWxkcmVuKGFzdCwgdGhpcyk7XG4gICAgfVxuICAgIC8vIFRoZSB0eXBlIG9mIGEgY2hhaW4gaXMgYWx3YXlzIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5VbmRlZmluZWQpO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbChhc3Q6IENvbmRpdGlvbmFsKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBjb25kaXRpb25hbCBpcyB0aGUgdW5pb24gb2YgdGhlIHRydWUgYW5kIGZhbHNlIGNvbmRpdGlvbnMuXG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIHZpc2l0QXN0Q2hpbGRyZW4oYXN0LCB0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0VHlwZVVuaW9uKHRoaXMuZ2V0VHlwZShhc3QudHJ1ZUV4cCksIHRoaXMuZ2V0VHlwZShhc3QuZmFsc2VFeHApKTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25DYWxsKGFzdDogRnVuY3Rpb25DYWxsKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBmdW5jdGlvbiBjYWxsIGlzIHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgc2VsZWN0ZWQgc2lnbmF0dXJlLlxuICAgIC8vIFRoZSBzaWduYXR1cmUgaXMgc2VsZWN0ZWQgYmFzZWQgb24gdGhlIHR5cGVzIG9mIHRoZSBhcmd1bWVudHMuIEFuZ3VsYXIgZG9lc24ndFxuICAgIC8vIHN1cHBvcnQgY29udGV4dHVhbCB0eXBpbmcgb2YgYXJndW1lbnRzIHNvIHRoaXMgaXMgc2ltcGxlciB0aGFuIFR5cGVTY3JpcHQnc1xuICAgIC8vIHZlcnNpb24uXG4gICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy5nZXRUeXBlKGFyZykpO1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0VHlwZShhc3QudGFyZ2V0ICEpO1xuICAgIGlmICghdGFyZ2V0IHx8ICF0YXJnZXQuY2FsbGFibGUpIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdDYWxsIHRhcmdldCBpcyBub3QgY2FsbGFibGUnLCBhc3QpO1xuICAgIGNvbnN0IHNpZ25hdHVyZSA9IHRhcmdldC5zZWxlY3RTaWduYXR1cmUoYXJncyk7XG4gICAgaWYgKHNpZ25hdHVyZSkgcmV0dXJuIHNpZ25hdHVyZS5yZXN1bHQ7XG4gICAgLy8gVE9ETzogQ29uc2lkZXIgYSBiZXR0ZXIgZXJyb3IgbWVzc2FnZSBoZXJlLlxuICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdVbmFibGUgbm8gY29tcGF0aWJsZSBzaWduYXR1cmUgZm91bmQgZm9yIGNhbGwnLCBhc3QpO1xuICB9XG5cbiAgdmlzaXRJbXBsaWNpdFJlY2VpdmVyKGFzdDogSW1wbGljaXRSZWNlaXZlcik6IFN5bWJvbCB7XG4gICAgY29uc3QgX3RoaXMgPSB0aGlzO1xuICAgIC8vIFJldHVybiBhIHBzZXVkby1zeW1ib2wgZm9yIHRoZSBpbXBsaWNpdCByZWNlaXZlci5cbiAgICAvLyBUaGUgbWVtYmVycyBvZiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIgYXJlIHdoYXQgaXMgZGVmaW5lZCBieSB0aGVcbiAgICAvLyBzY29wZSBwYXNzZWQgaW50byB0aGlzIGNsYXNzLlxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnJGltcGxpY2l0JyxcbiAgICAgIGtpbmQ6ICdjb21wb25lbnQnLFxuICAgICAgbGFuZ3VhZ2U6ICduZy10ZW1wbGF0ZScsXG4gICAgICB0eXBlOiB1bmRlZmluZWQsXG4gICAgICBjb250YWluZXI6IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxhYmxlOiBmYWxzZSxcbiAgICAgIG51bGxhYmxlOiBmYWxzZSxcbiAgICAgIHB1YmxpYzogdHJ1ZSxcbiAgICAgIGRlZmluaXRpb246IHVuZGVmaW5lZCxcbiAgICAgIG1lbWJlcnMoKTogU3ltYm9sVGFibGV7cmV0dXJuIF90aGlzLnNjb3BlO30sXG4gICAgICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtde3JldHVybiBbXTt9LFxuICAgICAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzKTogU2lnbmF0dXJlIHwgdW5kZWZpbmVke3JldHVybiB1bmRlZmluZWQ7fSxcbiAgICAgIGluZGV4ZWQoYXJndW1lbnQpOiBTeW1ib2wgfCB1bmRlZmluZWR7cmV0dXJuIHVuZGVmaW5lZDt9XG4gICAgfTtcbiAgfVxuXG4gIHZpc2l0SW50ZXJwb2xhdGlvbihhc3Q6IEludGVycG9sYXRpb24pOiBTeW1ib2wge1xuICAgIC8vIElmIHdlIGFyZSBwcm9kdWNpbmcgZGlhZ25vc3RpY3MsIHZpc2l0IHRoZSBjaGlsZHJlbi5cbiAgICBpZiAodGhpcy5kaWFnbm9zdGljcykge1xuICAgICAgdmlzaXRBc3RDaGlsZHJlbihhc3QsIHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy51bmRlZmluZWRUeXBlO1xuICB9XG5cbiAgdmlzaXRLZXllZFJlYWQoYXN0OiBLZXllZFJlYWQpOiBTeW1ib2wge1xuICAgIGNvbnN0IHRhcmdldFR5cGUgPSB0aGlzLmdldFR5cGUoYXN0Lm9iaik7XG4gICAgY29uc3Qga2V5VHlwZSA9IHRoaXMuZ2V0VHlwZShhc3Qua2V5KTtcbiAgICBjb25zdCByZXN1bHQgPSB0YXJnZXRUeXBlLmluZGV4ZWQoXG4gICAgICAgIGtleVR5cGUsIGFzdC5rZXkgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlID8gYXN0LmtleS52YWx1ZSA6IHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIHJlc3VsdCB8fCB0aGlzLmFueVR5cGU7XG4gIH1cblxuICB2aXNpdEtleWVkV3JpdGUoYXN0OiBLZXllZFdyaXRlKTogU3ltYm9sIHtcbiAgICAvLyBUaGUgd3JpdGUgb2YgYSB0eXBlIGlzIHRoZSB0eXBlIG9mIHRoZSB2YWx1ZSBiZWluZyB3cml0dGVuLlxuICAgIHJldHVybiB0aGlzLmdldFR5cGUoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5KGFzdDogTGl0ZXJhbEFycmF5KTogU3ltYm9sIHtcbiAgICAvLyBBIHR5cGUgbGl0ZXJhbCBpcyBhbiBhcnJheSB0eXBlIG9mIHRoZSB1bmlvbiBvZiB0aGUgZWxlbWVudHNcbiAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRBcnJheVR5cGUoXG4gICAgICAgIHRoaXMucXVlcnkuZ2V0VHlwZVVuaW9uKC4uLmFzdC5leHByZXNzaW9ucy5tYXAoZWxlbWVudCA9PiB0aGlzLmdldFR5cGUoZWxlbWVudCkpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXAoYXN0OiBMaXRlcmFsTWFwKTogU3ltYm9sIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW5cbiAgICBpZiAodGhpcy5kaWFnbm9zdGljcykge1xuICAgICAgdmlzaXRBc3RDaGlsZHJlbihhc3QsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBUT0RPOiBSZXR1cm4gYSBjb21wb3NpdGUgdHlwZS5cbiAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsUHJpbWl0aXZlKGFzdDogTGl0ZXJhbFByaW1pdGl2ZSkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgbGl0ZXJhbCBwcmltaXRpdmUgZGVwZW5kcyBvbiB0aGUgdmFsdWUgb2YgdGhlIGxpdGVyYWwuXG4gICAgc3dpdGNoIChhc3QudmFsdWUpIHtcbiAgICAgIGNhc2UgdHJ1ZTpcbiAgICAgIGNhc2UgZmFsc2U6XG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkJvb2xlYW4pO1xuICAgICAgY2FzZSBudWxsOlxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdWxsKTtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5VbmRlZmluZWQpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgYXN0LnZhbHVlKSB7XG4gICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLlN0cmluZyk7XG4gICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLk51bWJlcik7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdVbnJlY29nbml6ZWQgcHJpbWl0aXZlJywgYXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0TWV0aG9kQ2FsbChhc3Q6IE1ldGhvZENhbGwpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlTWV0aG9kQ2FsbCh0aGlzLmdldFR5cGUoYXN0LnJlY2VpdmVyKSwgYXN0KTtcbiAgfVxuXG4gIHZpc2l0UGlwZShhc3Q6IEJpbmRpbmdQaXBlKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBwaXBlIG5vZGUgaXMgdGhlIHJldHVybiB0eXBlIG9mIHRoZSBwaXBlJ3MgdHJhbnNmb3JtIG1ldGhvZC4gVGhlIHRhYmxlIHJldHVybmVkXG4gICAgLy8gYnkgZ2V0UGlwZXMoKSBpcyBleHBlY3RlZCB0byBjb250YWluIHN5bWJvbHMgd2l0aCB0aGUgY29ycmVzcG9uZGluZyB0cmFuc2Zvcm0gbWV0aG9kIHR5cGUuXG4gICAgY29uc3QgcGlwZSA9IHRoaXMucXVlcnkuZ2V0UGlwZXMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgIGlmICghcGlwZSkgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoYE5vIHBpcGUgYnkgdGhlIG5hbWUgJHthc3QubmFtZX0gZm91bmRgLCBhc3QpO1xuICAgIGNvbnN0IGV4cFR5cGUgPSB0aGlzLmdldFR5cGUoYXN0LmV4cCk7XG4gICAgY29uc3Qgc2lnbmF0dXJlID1cbiAgICAgICAgcGlwZS5zZWxlY3RTaWduYXR1cmUoW2V4cFR5cGVdLmNvbmNhdChhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMuZ2V0VHlwZShhcmcpKSkpO1xuICAgIGlmICghc2lnbmF0dXJlKSByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignVW5hYmxlIHRvIHJlc29sdmUgc2lnbmF0dXJlIGZvciBwaXBlIGludm9jYXRpb24nLCBhc3QpO1xuICAgIHJldHVybiBzaWduYXR1cmUucmVzdWx0O1xuICB9XG5cbiAgdmlzaXRQcmVmaXhOb3QoYXN0OiBQcmVmaXhOb3QpIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW5cbiAgICBpZiAodGhpcy5kaWFnbm9zdGljcykge1xuICAgICAgdmlzaXRBc3RDaGlsZHJlbihhc3QsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBvZiBhIHByZWZpeCAhIGlzIGFsd2F5cyBib29sZWFuLlxuICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkJvb2xlYW4pO1xuICB9XG5cbiAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdDogTm9uTnVsbEFzc2VydCkge1xuICAgIGNvbnN0IGV4cHJlc3Npb25UeXBlID0gdGhpcy5nZXRUeXBlKGFzdC5leHByZXNzaW9uKTtcbiAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXROb25OdWxsYWJsZVR5cGUoZXhwcmVzc2lvblR5cGUpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0OiBQcm9wZXJ0eVJlYWQpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlUHJvcGVydHlSZWFkKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpLCBhc3QpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgd3JpdGUgaXMgdGhlIHR5cGUgb2YgdGhlIHZhbHVlIGJlaW5nIHdyaXR0ZW4uXG4gICAgcmV0dXJuIHRoaXMuZ2V0VHlwZShhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRRdW90ZShhc3Q6IFF1b3RlKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBxdW90ZWQgZXhwcmVzc2lvbiBpcyBhbnkuXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0OiBTYWZlTWV0aG9kQ2FsbCkge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVNZXRob2RDYWxsKHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpKSwgYXN0KTtcbiAgfVxuXG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlUHJvcGVydHlSZWFkKHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpKSwgYXN0KTtcbiAgfVxuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9hbnlUeXBlICE6IFN5bWJvbDtcbiAgcHJpdmF0ZSBnZXQgYW55VHlwZSgpOiBTeW1ib2wge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLl9hbnlUeXBlO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLl9hbnlUeXBlID0gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3VuZGVmaW5lZFR5cGUgITogU3ltYm9sO1xuICBwcml2YXRlIGdldCB1bmRlZmluZWRUeXBlKCk6IFN5bWJvbCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMuX3VuZGVmaW5lZFR5cGU7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMuX3VuZGVmaW5lZFR5cGUgPSB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLlVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNZXRob2RDYWxsKHJlY2VpdmVyVHlwZTogU3ltYm9sLCBhc3Q6IFNhZmVNZXRob2RDYWxsfE1ldGhvZENhbGwpIHtcbiAgICBpZiAodGhpcy5pc0FueShyZWNlaXZlclR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICAgIH1cblxuICAgIC8vIFRoZSB0eXBlIG9mIGEgbWV0aG9kIGlzIHRoZSBzZWxlY3RlZCBtZXRob2RzIHJlc3VsdCB0eXBlLlxuICAgIGNvbnN0IG1ldGhvZCA9IHJlY2VpdmVyVHlwZS5tZW1iZXJzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICBpZiAoIW1ldGhvZCkgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoYFVua25vd24gbWV0aG9kICcke2FzdC5uYW1lfSdgLCBhc3QpO1xuICAgIGlmICghbWV0aG9kLnR5cGUpIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBDb3VsZCBub3QgZmluZCBhIHR5cGUgZm9yICcke2FzdC5uYW1lfSdgLCBhc3QpO1xuICAgIGlmICghbWV0aG9kLnR5cGUuY2FsbGFibGUpIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBNZW1iZXIgJyR7YXN0Lm5hbWV9JyBpcyBub3QgY2FsbGFibGVgLCBhc3QpO1xuICAgIGNvbnN0IHNpZ25hdHVyZSA9IG1ldGhvZC50eXBlLnNlbGVjdFNpZ25hdHVyZShhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMuZ2V0VHlwZShhcmcpKSk7XG4gICAgaWYgKCFzaWduYXR1cmUpXG4gICAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcihgVW5hYmxlIHRvIHJlc29sdmUgc2lnbmF0dXJlIGZvciBjYWxsIG9mIG1ldGhvZCAke2FzdC5uYW1lfWAsIGFzdCk7XG4gICAgcmV0dXJuIHNpZ25hdHVyZS5yZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVQcm9wZXJ0eVJlYWQocmVjZWl2ZXJUeXBlOiBTeW1ib2wsIGFzdDogU2FmZVByb3BlcnR5UmVhZHxQcm9wZXJ0eVJlYWQpIHtcbiAgICBpZiAodGhpcy5pc0FueShyZWNlaXZlclR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICAgIH1cblxuICAgIC8vIFRoZSB0eXBlIG9mIGEgcHJvcGVydHkgcmVhZCBpcyB0aGUgc2VlbGN0ZWQgbWVtYmVyJ3MgdHlwZS5cbiAgICBjb25zdCBtZW1iZXIgPSByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIGxldCByZWNlaXZlckluZm8gPSByZWNlaXZlclR5cGUubmFtZTtcbiAgICAgIGlmIChyZWNlaXZlckluZm8gPT0gJyRpbXBsaWNpdCcpIHtcbiAgICAgICAgcmVjZWl2ZXJJbmZvID1cbiAgICAgICAgICAgICdUaGUgY29tcG9uZW50IGRlY2xhcmF0aW9uLCB0ZW1wbGF0ZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMsIGFuZCBlbGVtZW50IHJlZmVyZW5jZXMgZG8nO1xuICAgICAgfSBlbHNlIGlmIChyZWNlaXZlclR5cGUubnVsbGFibGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoYFRoZSBleHByZXNzaW9uIG1pZ2h0IGJlIG51bGxgLCBhc3QucmVjZWl2ZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVjZWl2ZXJJbmZvID0gYCcke3JlY2VpdmVySW5mb30nIGRvZXNgO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoXG4gICAgICAgICAgYElkZW50aWZpZXIgJyR7YXN0Lm5hbWV9JyBpcyBub3QgZGVmaW5lZC4gJHtyZWNlaXZlckluZm99IG5vdCBjb250YWluIHN1Y2ggYSBtZW1iZXJgLFxuICAgICAgICAgIGFzdCk7XG4gICAgfVxuICAgIGlmICghbWVtYmVyLnB1YmxpYykge1xuICAgICAgbGV0IHJlY2VpdmVySW5mbyA9IHJlY2VpdmVyVHlwZS5uYW1lO1xuICAgICAgaWYgKHJlY2VpdmVySW5mbyA9PSAnJGltcGxpY2l0Jykge1xuICAgICAgICByZWNlaXZlckluZm8gPSAndGhlIGNvbXBvbmVudCc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWNlaXZlckluZm8gPSBgJyR7cmVjZWl2ZXJJbmZvfSdgO1xuICAgICAgfVxuICAgICAgdGhpcy5yZXBvcnRXYXJuaW5nKFxuICAgICAgICAgIGBJZGVudGlmaWVyICcke2FzdC5uYW1lfScgcmVmZXJzIHRvIGEgcHJpdmF0ZSBtZW1iZXIgb2YgJHtyZWNlaXZlckluZm99YCwgYXN0KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlci50eXBlO1xuICB9XG5cbiAgcHJpdmF0ZSByZXBvcnRFcnJvcihtZXNzYWdlOiBzdHJpbmcsIGFzdDogQVNUKTogU3ltYm9sIHtcbiAgICBpZiAodGhpcy5kaWFnbm9zdGljcykge1xuICAgICAgdGhpcy5kaWFnbm9zdGljcy5wdXNoKG5ldyBUeXBlRGlhZ25vc3RpYyh0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsIG1lc3NhZ2UsIGFzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSByZXBvcnRXYXJuaW5nKG1lc3NhZ2U6IHN0cmluZywgYXN0OiBBU1QpOiBTeW1ib2wge1xuICAgIGlmICh0aGlzLmRpYWdub3N0aWNzKSB7XG4gICAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2gobmV3IFR5cGVEaWFnbm9zdGljKHRzLkRpYWdub3N0aWNDYXRlZ29yeS5XYXJuaW5nLCBtZXNzYWdlLCBhc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgaXNBbnkoc3ltYm9sOiBTeW1ib2wpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIXN5bWJvbCB8fCB0aGlzLnF1ZXJ5LmdldFR5cGVLaW5kKHN5bWJvbCkgPT0gQnVpbHRpblR5cGUuQW55IHx8XG4gICAgICAgICghIXN5bWJvbC50eXBlICYmIHRoaXMuaXNBbnkoc3ltYm9sLnR5cGUpKTtcbiAgfVxufVxuIl19