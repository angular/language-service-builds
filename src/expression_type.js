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
    // AstType calculatetype of the ast given AST element.
    var AstType = /** @class */ (function () {
        function AstType(scope, query, context) {
            this.scope = scope;
            this.query = query;
            this.context = context;
            this.diagnostics = [];
        }
        AstType.prototype.getType = function (ast) { return ast.visit(this); };
        AstType.prototype.getDiagnostics = function (ast) {
            var type = ast.visit(this);
            if (this.context.event && type.callable) {
                this.reportDiagnostic('Unexpected callable expression. Expected a method call', ast, ts.DiagnosticCategory.Warning);
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
                            _this_1.reportDiagnostic("The expression might be null", ast);
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
                            this.reportDiagnostic('Expected a numeric type', errorAst);
                            return this.anyType;
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
                            this.reportDiagnostic('Expected a number type', ast.left);
                            return this.anyType;
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Other:
                            this.reportDiagnostic('Expected a number type', ast.right);
                            return this.anyType;
                        default:
                            this.reportDiagnostic('Expected operands to be a string or number type', ast);
                            return this.anyType;
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
                            this.reportDiagnostic('Expected the operants to be of similar type or any', ast);
                            return this.anyType;
                    }
                case '&&':
                    return rightType;
                case '||':
                    return this.query.getTypeUnion(leftType, rightType);
            }
            this.reportDiagnostic("Unrecognized operator " + ast.operation, ast);
            return this.anyType;
        };
        AstType.prototype.visitChain = function (ast) {
            var e_1, _a;
            try {
                // If we are producing diagnostics, visit the children
                for (var _b = tslib_1.__values(ast.expressions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var expr = _c.value;
                    expr.visit(this);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // The type of a chain is always undefined.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
        };
        AstType.prototype.visitConditional = function (ast) {
            // The type of a conditional is the union of the true and false conditions.
            ast.condition.visit(this);
            ast.trueExp.visit(this);
            ast.falseExp.visit(this);
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
            if (!target || !target.callable) {
                this.reportDiagnostic('Call target is not callable', ast);
                return this.anyType;
            }
            var signature = target.selectSignature(args);
            if (signature) {
                return signature.result;
            }
            // TODO: Consider a better error message here.
            this.reportDiagnostic('Unable no compatible signature found for call', ast);
            return this.anyType;
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
                documentation: [],
                members: function () { return _this.scope; },
                signatures: function () { return []; },
                selectSignature: function (types) { return undefined; },
                indexed: function (argument) { return undefined; },
                typeArguments: function () { return undefined; },
            };
        };
        AstType.prototype.visitInterpolation = function (ast) {
            var e_2, _a;
            try {
                // If we are producing diagnostics, visit the children.
                for (var _b = tslib_1.__values(ast.expressions), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var expr = _c.value;
                    expr.visit(this);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
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
            var e_3, _a;
            try {
                // If we are producing diagnostics, visit the children
                for (var _b = tslib_1.__values(ast.values), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var value = _c.value;
                    value.visit(this);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
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
                            this.reportDiagnostic('Unrecognized primitive', ast);
                            return this.anyType;
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
            if (!pipe) {
                this.reportDiagnostic("No pipe by the name " + ast.name + " found", ast);
                return this.anyType;
            }
            var expType = this.getType(ast.exp);
            var signature = pipe.selectSignature([expType].concat(ast.args.map(function (arg) { return _this_1.getType(arg); })));
            if (!signature) {
                this.reportDiagnostic('Unable to resolve signature for pipe invocation', ast);
                return this.anyType;
            }
            return signature.result;
        };
        AstType.prototype.visitPrefixNot = function (ast) {
            // If we are producing diagnostics, visit the children
            ast.expression.visit(this);
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
            var methodType = this.resolvePropertyRead(receiverType, ast);
            if (!methodType) {
                this.reportDiagnostic("Could not find a type for '" + ast.name + "'", ast);
                return this.anyType;
            }
            if (this.isAny(methodType)) {
                return this.anyType;
            }
            if (!methodType.callable) {
                this.reportDiagnostic("Member '" + ast.name + "' is not callable", ast);
                return this.anyType;
            }
            var signature = methodType.selectSignature(ast.args.map(function (arg) { return _this_1.getType(arg); }));
            if (!signature) {
                this.reportDiagnostic("Unable to resolve signature for call of method " + ast.name, ast);
                return this.anyType;
            }
            return signature.result;
        };
        AstType.prototype.resolvePropertyRead = function (receiverType, ast) {
            if (this.isAny(receiverType)) {
                return this.anyType;
            }
            // The type of a property read is the seelcted member's type.
            var member = receiverType.members().get(ast.name);
            if (!member) {
                if (receiverType.name === '$implicit') {
                    this.reportDiagnostic("Identifier '" + ast.name + "' is not defined. " +
                        "The component declaration, template variable declarations, and element references do not contain such a member", ast);
                }
                else if (receiverType.nullable && ast.receiver instanceof compiler_1.PropertyRead) {
                    var receiver = ast.receiver.name;
                    this.reportDiagnostic("'" + receiver + "' is possibly undefined. Consider using the safe navigation operator (" + receiver + "?." + ast.name + ") " +
                        ("or non-null assertion operator (" + receiver + "!." + ast.name + ")."), ast, ts.DiagnosticCategory.Suggestion);
                }
                else {
                    this.reportDiagnostic("Identifier '" + ast.name + "' is not defined. '" + receiverType.name + "' does not contain such a member", ast);
                }
                return this.anyType;
            }
            if (!member.public) {
                this.reportDiagnostic("Identifier '" + ast.name + "' refers to a private member of " + (receiverType.name === '$implicit' ? 'the component' : "\n      '" + receiverType.name + "'\n          "), ast, ts.DiagnosticCategory.Warning);
            }
            return member.type;
        };
        AstType.prototype.reportDiagnostic = function (message, ast, kind) {
            if (kind === void 0) { kind = ts.DiagnosticCategory.Error; }
            this.diagnostics.push({ kind: kind, span: ast.span, message: message });
        };
        AstType.prototype.isAny = function (symbol) {
            return !symbol || this.query.getTypeKind(symbol) === symbols_1.BuiltinType.Any ||
                (!!symbol.type && this.isAny(symbol.type));
        };
        return AstType;
    }());
    exports.AstType = AstType;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl90eXBlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvZXhwcmVzc2lvbl90eXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF5VDtJQUN6VCwrQkFBaUM7SUFFakMsaUVBQW1GO0lBS25GLHNEQUFzRDtJQUN0RDtRQUdFLGlCQUNZLEtBQWtCLEVBQVUsS0FBa0IsRUFDOUMsT0FBcUM7WUFEckMsVUFBSyxHQUFMLEtBQUssQ0FBYTtZQUFVLFVBQUssR0FBTCxLQUFLLENBQWE7WUFDOUMsWUFBTyxHQUFQLE9BQU8sQ0FBOEI7WUFKaEMsZ0JBQVcsR0FBb0IsRUFBRSxDQUFDO1FBSUMsQ0FBQztRQUVyRCx5QkFBTyxHQUFQLFVBQVEsR0FBUSxJQUFZLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckQsZ0NBQWMsR0FBZCxVQUFlLEdBQVE7WUFDckIsSUFBTSxJQUFJLEdBQVcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDakIsd0RBQXdELEVBQUUsR0FBRyxFQUM3RCxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEM7WUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDMUIsQ0FBQztRQUVELDZCQUFXLEdBQVgsVUFBWSxHQUFXO1lBQXZCLG1CQTRJQztZQTNJQyxxQ0FBcUM7WUFDckMsU0FBUyxTQUFTLENBQUMsSUFBaUIsRUFBRSxLQUFrQjtnQkFDdEQsUUFBUSxJQUFJLEVBQUU7b0JBQ1osS0FBSyxxQkFBVyxDQUFDLFNB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QztRQUN6RCxDQUFDO1FBRU8sdUJBQUssR0FBYixVQUFjLE1BQWM7WUFDMUIsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxxQkFBVyxDQUFDLEdBQUc7Z0JBQ2hFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0gsY0FBQztJQUFELENBQUMsQUF0YUQsSUFzYUM7SUF0YVksMEJBQU8iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBc3RWaXNpdG9yLCBCaW5hcnksIEJpbmRpbmdQaXBlLCBDaGFpbiwgQ29uZGl0aW9uYWwsIEZ1bmN0aW9uQ2FsbCwgSW1wbGljaXRSZWNlaXZlciwgSW50ZXJwb2xhdGlvbiwgS2V5ZWRSZWFkLCBLZXllZFdyaXRlLCBMaXRlcmFsQXJyYXksIExpdGVyYWxNYXAsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIE5vbk51bGxBc3NlcnQsIFByZWZpeE5vdCwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBRdW90ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0J1aWx0aW5UeXBlLCBTaWduYXR1cmUsIFN5bWJvbCwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCB7IGV2ZW50PzogYm9vbGVhbjsgfVxuXG4vLyBBc3RUeXBlIGNhbGN1bGF0ZXR5cGUgb2YgdGhlIGFzdCBnaXZlbiBBU1QgZWxlbWVudC5cbmV4cG9ydCBjbGFzcyBBc3RUeXBlIGltcGxlbWVudHMgQXN0VmlzaXRvciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZGlhZ25vc3RpY3M6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBzY29wZTogU3ltYm9sVGFibGUsIHByaXZhdGUgcXVlcnk6IFN5bWJvbFF1ZXJ5LFxuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBFeHByZXNzaW9uRGlhZ25vc3RpY3NDb250ZXh0KSB7fVxuXG4gIGdldFR5cGUoYXN0OiBBU1QpOiBTeW1ib2wgeyByZXR1cm4gYXN0LnZpc2l0KHRoaXMpOyB9XG5cbiAgZ2V0RGlhZ25vc3RpY3MoYXN0OiBBU1QpOiBuZy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHR5cGU6IFN5bWJvbCA9IGFzdC52aXNpdCh0aGlzKTtcbiAgICBpZiAodGhpcy5jb250ZXh0LmV2ZW50ICYmIHR5cGUuY2FsbGFibGUpIHtcbiAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhcbiAgICAgICAgICAnVW5leHBlY3RlZCBjYWxsYWJsZSBleHByZXNzaW9uLiBFeHBlY3RlZCBhIG1ldGhvZCBjYWxsJywgYXN0LFxuICAgICAgICAgIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5XYXJuaW5nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3M7XG4gIH1cblxuICB2aXNpdEJpbmFyeShhc3Q6IEJpbmFyeSk6IFN5bWJvbCB7XG4gICAgLy8gVHJlYXQgdW5kZWZpbmVkIGFuZCBudWxsIGFzIG90aGVyLlxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZShraW5kOiBCdWlsdGluVHlwZSwgb3RoZXI6IEJ1aWx0aW5UeXBlKTogQnVpbHRpblR5cGUge1xuICAgICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgIGNhc2UgQnVpbHRpblR5cGUuVW5kZWZpbmVkOlxuICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bGw6XG4gICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZShvdGhlciwgQnVpbHRpblR5cGUuT3RoZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtpbmQ7XG4gICAgfVxuXG4gICAgY29uc3QgZ2V0VHlwZSA9IChhc3Q6IEFTVCwgb3BlcmF0aW9uOiBzdHJpbmcpOiBTeW1ib2wgPT4ge1xuICAgICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZShhc3QpO1xuICAgICAgaWYgKHR5cGUubnVsbGFibGUpIHtcbiAgICAgICAgc3dpdGNoIChvcGVyYXRpb24pIHtcbiAgICAgICAgICBjYXNlICcmJic6XG4gICAgICAgICAgY2FzZSAnfHwnOlxuICAgICAgICAgIGNhc2UgJz09JzpcbiAgICAgICAgICBjYXNlICchPSc6XG4gICAgICAgICAgY2FzZSAnPT09JzpcbiAgICAgICAgICBjYXNlICchPT0nOlxuICAgICAgICAgICAgLy8gTnVsbGFibGUgYWxsb3dlZC5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoYFRoZSBleHByZXNzaW9uIG1pZ2h0IGJlIG51bGxgLCBhc3QpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKHR5cGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHR5cGU7XG4gICAgfTtcblxuICAgIGNvbnN0IGxlZnRUeXBlID0gZ2V0VHlwZShhc3QubGVmdCwgYXN0Lm9wZXJhdGlvbik7XG4gICAgY29uc3QgcmlnaHRUeXBlID0gZ2V0VHlwZShhc3QucmlnaHQsIGFzdC5vcGVyYXRpb24pO1xuICAgIGNvbnN0IGxlZnRSYXdLaW5kID0gdGhpcy5xdWVyeS5nZXRUeXBlS2luZChsZWZ0VHlwZSk7XG4gICAgY29uc3QgcmlnaHRSYXdLaW5kID0gdGhpcy5xdWVyeS5nZXRUeXBlS2luZChyaWdodFR5cGUpO1xuICAgIGNvbnN0IGxlZnRLaW5kID0gbm9ybWFsaXplKGxlZnRSYXdLaW5kLCByaWdodFJhd0tpbmQpO1xuICAgIGNvbnN0IHJpZ2h0S2luZCA9IG5vcm1hbGl6ZShyaWdodFJhd0tpbmQsIGxlZnRSYXdLaW5kKTtcblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgc3d0aWNoIGltcGxlbWVudHMgb3BlcmF0b3IgdHlwaW5nIHNpbWlsYXIgdG8gdGhlXG4gICAgLy8gdHlwZSBwcm9kdWN0aW9uIHRhYmxlcyBpbiB0aGUgVHlwZVNjcmlwdCBzcGVjaWZpY2F0aW9uLlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YxLjguMTAvZG9jL3NwZWMubWQjNC4xOVxuICAgIGNvbnN0IG9wZXJLaW5kID0gbGVmdEtpbmQgPDwgOCB8IHJpZ2h0S2luZDtcbiAgICBzd2l0Y2ggKGFzdC5vcGVyYXRpb24pIHtcbiAgICAgIGNhc2UgJyonOlxuICAgICAgY2FzZSAnLyc6XG4gICAgICBjYXNlICclJzpcbiAgICAgIGNhc2UgJy0nOlxuICAgICAgY2FzZSAnPDwnOlxuICAgICAgY2FzZSAnPj4nOlxuICAgICAgY2FzZSAnPj4+JzpcbiAgICAgIGNhc2UgJyYnOlxuICAgICAgY2FzZSAnXic6XG4gICAgICBjYXNlICd8JzpcbiAgICAgICAgc3dpdGNoIChvcGVyS2luZCkge1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdW1iZXIpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBsZXQgZXJyb3JBc3QgPSBhc3QubGVmdDtcbiAgICAgICAgICAgIHN3aXRjaCAobGVmdEtpbmQpIHtcbiAgICAgICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgICAgICAgIGVycm9yQXN0ID0gYXN0LnJpZ2h0O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKCdFeHBlY3RlZCBhIG51bWVyaWMgdHlwZScsIGVycm9yQXN0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgJysnOlxuICAgICAgICBzd2l0Y2ggKG9wZXJLaW5kKSB7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkJvb2xlYW4gPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkJvb2xlYW4gPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLkJvb2xlYW46XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk90aGVyIDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5TdHJpbmcpO1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdW1iZXIpO1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYygnRXhwZWN0ZWQgYSBudW1iZXIgdHlwZScsIGFzdC5sZWZ0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkJvb2xlYW46XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKCdFeHBlY3RlZCBhIG51bWJlciB0eXBlJywgYXN0LnJpZ2h0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYygnRXhwZWN0ZWQgb3BlcmFuZHMgdG8gYmUgYSBzdHJpbmcgb3IgbnVtYmVyIHR5cGUnLCBhc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICAgICAgfVxuICAgICAgY2FzZSAnPic6XG4gICAgICBjYXNlICc8JzpcbiAgICAgIGNhc2UgJzw9JzpcbiAgICAgIGNhc2UgJz49JzpcbiAgICAgIGNhc2UgJz09JzpcbiAgICAgIGNhc2UgJyE9JzpcbiAgICAgIGNhc2UgJz09PSc6XG4gICAgICBjYXNlICchPT0nOlxuICAgICAgICBzd2l0Y2ggKG9wZXJLaW5kKSB7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk90aGVyIDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkJvb2xlYW4pO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoJ0V4cGVjdGVkIHRoZSBvcGVyYW50cyB0byBiZSBvZiBzaW1pbGFyIHR5cGUgb3IgYW55JywgYXN0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgJyYmJzpcbiAgICAgICAgcmV0dXJuIHJpZ2h0VHlwZTtcbiAgICAgIGNhc2UgJ3x8JzpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0VHlwZVVuaW9uKGxlZnRUeXBlLCByaWdodFR5cGUpO1xuICAgIH1cblxuICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhgVW5yZWNvZ25pemVkIG9wZXJhdG9yICR7YXN0Lm9wZXJhdGlvbn1gLCBhc3QpO1xuICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gIH1cblxuICB2aXNpdENoYWluKGFzdDogQ2hhaW4pIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW5cbiAgICBmb3IgKGNvbnN0IGV4cHIgb2YgYXN0LmV4cHJlc3Npb25zKSB7XG4gICAgICBleHByLnZpc2l0KHRoaXMpO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBvZiBhIGNoYWluIGlzIGFsd2F5cyB1bmRlZmluZWQuXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuVW5kZWZpbmVkKTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWwoYXN0OiBDb25kaXRpb25hbCkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgY29uZGl0aW9uYWwgaXMgdGhlIHVuaW9uIG9mIHRoZSB0cnVlIGFuZCBmYWxzZSBjb25kaXRpb25zLlxuICAgIGFzdC5jb25kaXRpb24udmlzaXQodGhpcyk7XG4gICAgYXN0LnRydWVFeHAudmlzaXQodGhpcyk7XG4gICAgYXN0LmZhbHNlRXhwLnZpc2l0KHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldFR5cGVVbmlvbih0aGlzLmdldFR5cGUoYXN0LnRydWVFeHApLCB0aGlzLmdldFR5cGUoYXN0LmZhbHNlRXhwKSk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uQ2FsbChhc3Q6IEZ1bmN0aW9uQ2FsbCkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgZnVuY3Rpb24gY2FsbCBpcyB0aGUgcmV0dXJuIHR5cGUgb2YgdGhlIHNlbGVjdGVkIHNpZ25hdHVyZS5cbiAgICAvLyBUaGUgc2lnbmF0dXJlIGlzIHNlbGVjdGVkIGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0aGUgYXJndW1lbnRzLiBBbmd1bGFyIGRvZXNuJ3RcbiAgICAvLyBzdXBwb3J0IGNvbnRleHR1YWwgdHlwaW5nIG9mIGFyZ3VtZW50cyBzbyB0aGlzIGlzIHNpbXBsZXIgdGhhbiBUeXBlU2NyaXB0J3NcbiAgICAvLyB2ZXJzaW9uLlxuICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMuZ2V0VHlwZShhcmcpKTtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldFR5cGUoYXN0LnRhcmdldCAhKTtcbiAgICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0LmNhbGxhYmxlKSB7XG4gICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoJ0NhbGwgdGFyZ2V0IGlzIG5vdCBjYWxsYWJsZScsIGFzdCk7XG4gICAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICAgIH1cbiAgICBjb25zdCBzaWduYXR1cmUgPSB0YXJnZXQuc2VsZWN0U2lnbmF0dXJlKGFyZ3MpO1xuICAgIGlmIChzaWduYXR1cmUpIHtcbiAgICAgIHJldHVybiBzaWduYXR1cmUucmVzdWx0O1xuICAgIH1cbiAgICAvLyBUT0RPOiBDb25zaWRlciBhIGJldHRlciBlcnJvciBtZXNzYWdlIGhlcmUuXG4gICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKCdVbmFibGUgbm8gY29tcGF0aWJsZSBzaWduYXR1cmUgZm91bmQgZm9yIGNhbGwnLCBhc3QpO1xuICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gIH1cblxuICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0OiBJbXBsaWNpdFJlY2VpdmVyKTogU3ltYm9sIHtcbiAgICBjb25zdCBfdGhpcyA9IHRoaXM7XG4gICAgLy8gUmV0dXJuIGEgcHNldWRvLXN5bWJvbCBmb3IgdGhlIGltcGxpY2l0IHJlY2VpdmVyLlxuICAgIC8vIFRoZSBtZW1iZXJzIG9mIHRoZSBpbXBsaWNpdCByZWNlaXZlciBhcmUgd2hhdCBpcyBkZWZpbmVkIGJ5IHRoZVxuICAgIC8vIHNjb3BlIHBhc3NlZCBpbnRvIHRoaXMgY2xhc3MuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICckaW1wbGljaXQnLFxuICAgICAga2luZDogJ2NvbXBvbmVudCcsXG4gICAgICBsYW5ndWFnZTogJ25nLXRlbXBsYXRlJyxcbiAgICAgIHR5cGU6IHVuZGVmaW5lZCxcbiAgICAgIGNvbnRhaW5lcjogdW5kZWZpbmVkLFxuICAgICAgY2FsbGFibGU6IGZhbHNlLFxuICAgICAgbnVsbGFibGU6IGZhbHNlLFxuICAgICAgcHVibGljOiB0cnVlLFxuICAgICAgZGVmaW5pdGlvbjogdW5kZWZpbmVkLFxuICAgICAgZG9jdW1lbnRhdGlvbjogW10sXG4gICAgICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxle3JldHVybiBfdGhpcy5zY29wZTt9LFxuICAgICAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXXtyZXR1cm4gW107fSxcbiAgICAgIHNlbGVjdFNpZ25hdHVyZSh0eXBlcyk6IFNpZ25hdHVyZSB8IHVuZGVmaW5lZHtyZXR1cm4gdW5kZWZpbmVkO30sXG4gICAgICBpbmRleGVkKGFyZ3VtZW50KTogU3ltYm9sIHwgdW5kZWZpbmVke3JldHVybiB1bmRlZmluZWQ7fSxcbiAgICAgIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW10gfCB1bmRlZmluZWR7cmV0dXJuIHVuZGVmaW5lZDt9LFxuICAgIH07XG4gIH1cblxuICB2aXNpdEludGVycG9sYXRpb24oYXN0OiBJbnRlcnBvbGF0aW9uKTogU3ltYm9sIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW4uXG4gICAgZm9yIChjb25zdCBleHByIG9mIGFzdC5leHByZXNzaW9ucykge1xuICAgICAgZXhwci52aXNpdCh0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudW5kZWZpbmVkVHlwZTtcbiAgfVxuXG4gIHZpc2l0S2V5ZWRSZWFkKGFzdDogS2V5ZWRSZWFkKTogU3ltYm9sIHtcbiAgICBjb25zdCB0YXJnZXRUeXBlID0gdGhpcy5nZXRUeXBlKGFzdC5vYmopO1xuICAgIGNvbnN0IGtleVR5cGUgPSB0aGlzLmdldFR5cGUoYXN0LmtleSk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGFyZ2V0VHlwZS5pbmRleGVkKFxuICAgICAgICBrZXlUeXBlLCBhc3Qua2V5IGluc3RhbmNlb2YgTGl0ZXJhbFByaW1pdGl2ZSA/IGFzdC5rZXkudmFsdWUgOiB1bmRlZmluZWQpO1xuICAgIHJldHVybiByZXN1bHQgfHwgdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgdmlzaXRLZXllZFdyaXRlKGFzdDogS2V5ZWRXcml0ZSk6IFN5bWJvbCB7XG4gICAgLy8gVGhlIHdyaXRlIG9mIGEgdHlwZSBpcyB0aGUgdHlwZSBvZiB0aGUgdmFsdWUgYmVpbmcgd3JpdHRlbi5cbiAgICByZXR1cm4gdGhpcy5nZXRUeXBlKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheShhc3Q6IExpdGVyYWxBcnJheSk6IFN5bWJvbCB7XG4gICAgLy8gQSB0eXBlIGxpdGVyYWwgaXMgYW4gYXJyYXkgdHlwZSBvZiB0aGUgdW5pb24gb2YgdGhlIGVsZW1lbnRzXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QXJyYXlUeXBlKFxuICAgICAgICB0aGlzLnF1ZXJ5LmdldFR5cGVVbmlvbiguLi5hc3QuZXhwcmVzc2lvbnMubWFwKGVsZW1lbnQgPT4gdGhpcy5nZXRUeXBlKGVsZW1lbnQpKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IFN5bWJvbCB7XG4gICAgLy8gSWYgd2UgYXJlIHByb2R1Y2luZyBkaWFnbm9zdGljcywgdmlzaXQgdGhlIGNoaWxkcmVuXG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBhc3QudmFsdWVzKSB7XG4gICAgICB2YWx1ZS52aXNpdCh0aGlzKTtcbiAgICB9XG4gICAgLy8gVE9ETzogUmV0dXJuIGEgY29tcG9zaXRlIHR5cGUuXG4gICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpIHtcbiAgICAvLyBUaGUgdHlwZSBvZiBhIGxpdGVyYWwgcHJpbWl0aXZlIGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIHRoZSBsaXRlcmFsLlxuICAgIHN3aXRjaCAoYXN0LnZhbHVlKSB7XG4gICAgICBjYXNlIHRydWU6XG4gICAgICBjYXNlIGZhbHNlOlxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5Cb29sZWFuKTtcbiAgICAgIGNhc2UgbnVsbDpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuTnVsbCk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuVW5kZWZpbmVkKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIGFzdC52YWx1ZSkge1xuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5TdHJpbmcpO1xuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdW1iZXIpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoJ1VucmVjb2duaXplZCBwcmltaXRpdmUnLCBhc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0TWV0aG9kQ2FsbChhc3Q6IE1ldGhvZENhbGwpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlTWV0aG9kQ2FsbCh0aGlzLmdldFR5cGUoYXN0LnJlY2VpdmVyKSwgYXN0KTtcbiAgfVxuXG4gIHZpc2l0UGlwZShhc3Q6IEJpbmRpbmdQaXBlKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBwaXBlIG5vZGUgaXMgdGhlIHJldHVybiB0eXBlIG9mIHRoZSBwaXBlJ3MgdHJhbnNmb3JtIG1ldGhvZC4gVGhlIHRhYmxlIHJldHVybmVkXG4gICAgLy8gYnkgZ2V0UGlwZXMoKSBpcyBleHBlY3RlZCB0byBjb250YWluIHN5bWJvbHMgd2l0aCB0aGUgY29ycmVzcG9uZGluZyB0cmFuc2Zvcm0gbWV0aG9kIHR5cGUuXG4gICAgY29uc3QgcGlwZSA9IHRoaXMucXVlcnkuZ2V0UGlwZXMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgIGlmICghcGlwZSkge1xuICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKGBObyBwaXBlIGJ5IHRoZSBuYW1lICR7YXN0Lm5hbWV9IGZvdW5kYCwgYXN0KTtcbiAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgfVxuICAgIGNvbnN0IGV4cFR5cGUgPSB0aGlzLmdldFR5cGUoYXN0LmV4cCk7XG4gICAgY29uc3Qgc2lnbmF0dXJlID1cbiAgICAgICAgcGlwZS5zZWxlY3RTaWduYXR1cmUoW2V4cFR5cGVdLmNvbmNhdChhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMuZ2V0VHlwZShhcmcpKSkpO1xuICAgIGlmICghc2lnbmF0dXJlKSB7XG4gICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoJ1VuYWJsZSB0byByZXNvbHZlIHNpZ25hdHVyZSBmb3IgcGlwZSBpbnZvY2F0aW9uJywgYXN0KTtcbiAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgfVxuICAgIHJldHVybiBzaWduYXR1cmUucmVzdWx0O1xuICB9XG5cbiAgdmlzaXRQcmVmaXhOb3QoYXN0OiBQcmVmaXhOb3QpIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW5cbiAgICBhc3QuZXhwcmVzc2lvbi52aXNpdCh0aGlzKTtcbiAgICAvLyBUaGUgdHlwZSBvZiBhIHByZWZpeCAhIGlzIGFsd2F5cyBib29sZWFuLlxuICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkJvb2xlYW4pO1xuICB9XG5cbiAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdDogTm9uTnVsbEFzc2VydCkge1xuICAgIGNvbnN0IGV4cHJlc3Npb25UeXBlID0gdGhpcy5nZXRUeXBlKGFzdC5leHByZXNzaW9uKTtcbiAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXROb25OdWxsYWJsZVR5cGUoZXhwcmVzc2lvblR5cGUpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0OiBQcm9wZXJ0eVJlYWQpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlUHJvcGVydHlSZWFkKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpLCBhc3QpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgd3JpdGUgaXMgdGhlIHR5cGUgb2YgdGhlIHZhbHVlIGJlaW5nIHdyaXR0ZW4uXG4gICAgcmV0dXJuIHRoaXMuZ2V0VHlwZShhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRRdW90ZShhc3Q6IFF1b3RlKSB7XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBxdW90ZWQgZXhwcmVzc2lvbiBpcyBhbnkuXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0OiBTYWZlTWV0aG9kQ2FsbCkge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVNZXRob2RDYWxsKHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpKSwgYXN0KTtcbiAgfVxuXG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlUHJvcGVydHlSZWFkKHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMuZ2V0VHlwZShhc3QucmVjZWl2ZXIpKSwgYXN0KTtcbiAgfVxuXG4gIHByaXZhdGUgX2FueVR5cGU6IFN5bWJvbHx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZ2V0IGFueVR5cGUoKTogU3ltYm9sIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5fYW55VHlwZTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5fYW55VHlwZSA9IHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgX3VuZGVmaW5lZFR5cGU6IFN5bWJvbHx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZ2V0IHVuZGVmaW5lZFR5cGUoKTogU3ltYm9sIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5fdW5kZWZpbmVkVHlwZTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5fdW5kZWZpbmVkVHlwZSA9IHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuVW5kZWZpbmVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1ldGhvZENhbGwocmVjZWl2ZXJUeXBlOiBTeW1ib2wsIGFzdDogU2FmZU1ldGhvZENhbGx8TWV0aG9kQ2FsbCkge1xuICAgIGlmICh0aGlzLmlzQW55KHJlY2VpdmVyVHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgfVxuICAgIGNvbnN0IG1ldGhvZFR5cGUgPSB0aGlzLnJlc29sdmVQcm9wZXJ0eVJlYWQocmVjZWl2ZXJUeXBlLCBhc3QpO1xuICAgIGlmICghbWV0aG9kVHlwZSkge1xuICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKGBDb3VsZCBub3QgZmluZCBhIHR5cGUgZm9yICcke2FzdC5uYW1lfSdgLCBhc3QpO1xuICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNBbnkobWV0aG9kVHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgfVxuICAgIGlmICghbWV0aG9kVHlwZS5jYWxsYWJsZSkge1xuICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKGBNZW1iZXIgJyR7YXN0Lm5hbWV9JyBpcyBub3QgY2FsbGFibGVgLCBhc3QpO1xuICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICB9XG4gICAgY29uc3Qgc2lnbmF0dXJlID0gbWV0aG9kVHlwZS5zZWxlY3RTaWduYXR1cmUoYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLmdldFR5cGUoYXJnKSkpO1xuICAgIGlmICghc2lnbmF0dXJlKSB7XG4gICAgICB0aGlzLnJlcG9ydERpYWdub3N0aWMoYFVuYWJsZSB0byByZXNvbHZlIHNpZ25hdHVyZSBmb3IgY2FsbCBvZiBtZXRob2QgJHthc3QubmFtZX1gLCBhc3QpO1xuICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIHNpZ25hdHVyZS5yZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVQcm9wZXJ0eVJlYWQocmVjZWl2ZXJUeXBlOiBTeW1ib2wsIGFzdDogU2FmZVByb3BlcnR5UmVhZHxQcm9wZXJ0eVJlYWQpIHtcbiAgICBpZiAodGhpcy5pc0FueShyZWNlaXZlclR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBvZiBhIHByb3BlcnR5IHJlYWQgaXMgdGhlIHNlZWxjdGVkIG1lbWJlcidzIHR5cGUuXG4gICAgY29uc3QgbWVtYmVyID0gcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICBpZiAocmVjZWl2ZXJUeXBlLm5hbWUgPT09ICckaW1wbGljaXQnKSB7XG4gICAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGBJZGVudGlmaWVyICcke2FzdC5uYW1lfScgaXMgbm90IGRlZmluZWQuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGUgY29tcG9uZW50IGRlY2xhcmF0aW9uLCB0ZW1wbGF0ZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMsIGFuZCBlbGVtZW50IHJlZmVyZW5jZXMgZG8gbm90IGNvbnRhaW4gc3VjaCBhIG1lbWJlcmAsXG4gICAgICAgICAgICBhc3QpO1xuICAgICAgfSBlbHNlIGlmIChyZWNlaXZlclR5cGUubnVsbGFibGUgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgUHJvcGVydHlSZWFkKSB7XG4gICAgICAgIGNvbnN0IHJlY2VpdmVyID0gYXN0LnJlY2VpdmVyLm5hbWU7XG4gICAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGAnJHtyZWNlaXZlcn0nIGlzIHBvc3NpYmx5IHVuZGVmaW5lZC4gQ29uc2lkZXIgdXNpbmcgdGhlIHNhZmUgbmF2aWdhdGlvbiBvcGVyYXRvciAoJHtyZWNlaXZlcn0/LiR7YXN0Lm5hbWV9KSBgICtcbiAgICAgICAgICAgICAgICBgb3Igbm9uLW51bGwgYXNzZXJ0aW9uIG9wZXJhdG9yICgke3JlY2VpdmVyfSEuJHthc3QubmFtZX0pLmAsXG4gICAgICAgICAgICBhc3QsIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5TdWdnZXN0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGBJZGVudGlmaWVyICcke2FzdC5uYW1lfScgaXMgbm90IGRlZmluZWQuICcke3JlY2VpdmVyVHlwZS5uYW1lfScgZG9lcyBub3QgY29udGFpbiBzdWNoIGEgbWVtYmVyYCxcbiAgICAgICAgICAgIGFzdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICAgIH1cbiAgICBpZiAoIW1lbWJlci5wdWJsaWMpIHtcbiAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhcbiAgICAgICAgICBgSWRlbnRpZmllciAnJHthc3QubmFtZX0nIHJlZmVycyB0byBhIHByaXZhdGUgbWVtYmVyIG9mICR7cmVjZWl2ZXJUeXBlLm5hbWUgPT09ICckaW1wbGljaXQnID8gJ3RoZSBjb21wb25lbnQnIDogYFxuICAgICAgJyR7cmVjZWl2ZXJUeXBlLm5hbWV9J1xuICAgICAgICAgIGB9YCxcbiAgICAgICAgICBhc3QsIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5XYXJuaW5nKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlci50eXBlO1xuICB9XG5cbiAgcHJpdmF0ZSByZXBvcnREaWFnbm9zdGljKG1lc3NhZ2U6IHN0cmluZywgYXN0OiBBU1QsIGtpbmQgPSB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IpIHtcbiAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goe2tpbmQsIHNwYW46IGFzdC5zcGFuLCBtZXNzYWdlfSk7XG4gIH1cblxuICBwcml2YXRlIGlzQW55KHN5bWJvbDogU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFzeW1ib2wgfHwgdGhpcy5xdWVyeS5nZXRUeXBlS2luZChzeW1ib2wpID09PSBCdWlsdGluVHlwZS5BbnkgfHxcbiAgICAgICAgKCEhc3ltYm9sLnR5cGUgJiYgdGhpcy5pc0FueShzeW1ib2wudHlwZSkpO1xuICB9XG59XG4iXX0=