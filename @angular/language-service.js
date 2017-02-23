/**
 * @license Angular v4.0.0-beta.8-88bc143
 * (c) 2010-2017 Google, Inc. https://angular.io/
 * License: MIT
 */
import { DomElementSchemaRegistry, TemplateParser, CompilerConfig, Lexer, Parser, I18NHtmlParser, HtmlParser, TagContentType, getHtmlTagDefinition, Element, SelectorMatcher, NAMED_ENTITIES, Text, ImplicitReceiver, PropertyRead, ParseSpan, splitNsName, CssSelector, ASTWithSource, templateVisitAll, tokenReference, EmbeddedTemplateAst, identifierName, visitAll, Attribute, ElementAst, ParseTreeResult, DEFAULT_INTERPOLATION_CONFIG, ResourceLoader, StaticReflector, StaticSymbolResolver, AotSummaryResolver, componentModuleUrl, createOfflineCompileUrlResolver, analyzeNgModules, extractProgramSymbols, SummaryResolver, CompileMetadataResolver, DirectiveNormalizer, PipeResolver, DirectiveResolver, NgModuleResolver, StaticSymbolCache } from '@angular/compiler';
import * as ts from 'typescript';
import { ViewEncapsulation, Version } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { ModuleResolutionHostAdapter, CompilerHost } from '@angular/compiler-cli';

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */ class AstPath$1 {
    constructor(path) {
        this.path = path;
    }
    get empty() { return !this.path || !this.path.length; }
    get head() { return this.path[0]; }
    get tail() { return this.path[this.path.length - 1]; }
    parentOf(node) { return this.path[this.path.indexOf(node) - 1]; }
    childOf(node) { return this.path[this.path.indexOf(node) + 1]; }
    first(ctor) {
        for (let i = this.path.length - 1; i >= 0; i--) {
            let item = this.path[i];
            if (item instanceof ctor)
                return item;
        }
    }
    push(node) { this.path.push(node); }
    pop() { return this.path.pop(); }
}

function isParseSourceSpan(value) {
    return value && !!value.start;
}
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
function inSpan(position, span, exclusive) {
    return span && exclusive ? position >= span.start && position < span.end :
        position >= span.start && position <= span.end;
}
function offsetSpan(span, amount) {
    return { start: span.start + amount, end: span.end + amount };
}
function isNarrower(spanA, spanB) {
    return spanA.start >= spanB.start && spanA.end <= spanB.end;
}
function hasTemplateReference(type) {
    if (type.diDeps) {
        for (let diDep of type.diDeps) {
            if (diDep.token.identifier && identifierName(diDep.token.identifier) == 'TemplateRef')
                return true;
        }
    }
    return false;
}
function getSelectors(info) {
    const map = new Map();
    const selectors = flatten(info.directives.map(directive => {
        const selectors = CssSelector.parse(directive.selector);
        selectors.forEach(selector => map.set(selector, directive));
        return selectors;
    }));
    return { selectors, map };
}
function flatten(a) {
    return [].concat(...a);
}
function removeSuffix(value, suffix) {
    if (value.endsWith(suffix))
        return value.substring(0, value.length - suffix.length);
    return value;
}
function uniqueByName(elements) {
    if (elements) {
        const result = [];
        const set = new Set();
        for (const element of elements) {
            if (!set.has(element.name)) {
                set.add(element.name);
                result.push(element);
            }
        }
        return result;
    }
}

class TemplateAstPath extends AstPath$1 {
    constructor(ast, position, allowWidening = false) {
        super(buildTemplatePath(ast, position, allowWidening));
        this.position = position;
    }
}
function buildTemplatePath(ast, position, allowWidening = false) {
    const visitor = new TemplateAstPathBuilder(position, allowWidening);
    templateVisitAll(visitor, ast);
    return visitor.getPath();
}
class NullTemplateVisitor {
    visitNgContent(ast) { }
    visitEmbeddedTemplate(ast) { }
    visitElement(ast) { }
    visitReference(ast) { }
    visitVariable(ast) { }
    visitEvent(ast) { }
    visitElementProperty(ast) { }
    visitAttr(ast) { }
    visitBoundText(ast) { }
    visitText(ast) { }
    visitDirective(ast) { }
    visitDirectiveProperty(ast) { }
}
class TemplateAstChildVisitor {
    constructor(visitor) {
        this.visitor = visitor;
    }
    // Nodes with children
    visitEmbeddedTemplate(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.references);
            visit(ast.variables);
            visit(ast.directives);
            visit(ast.providers);
            visit(ast.children);
        });
    }
    visitElement(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.inputs);
            visit(ast.outputs);
            visit(ast.references);
            visit(ast.directives);
            visit(ast.providers);
            visit(ast.children);
        });
    }
    visitDirective(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.inputs);
            visit(ast.hostProperties);
            visit(ast.hostEvents);
        });
    }
    // Terminal nodes
    visitNgContent(ast, context) { }
    visitReference(ast, context) { }
    visitVariable(ast, context) { }
    visitEvent(ast, context) { }
    visitElementProperty(ast, context) { }
    visitAttr(ast, context) { }
    visitBoundText(ast, context) { }
    visitText(ast, context) { }
    visitDirectiveProperty(ast, context) { }
    visitChildren(context, cb) {
        const visitor = this.visitor || this;
        let results = [];
        function visit(children) {
            if (children && children.length)
                results.push(templateVisitAll(visitor, children, context));
        }
        cb(visit);
        return [].concat.apply([], results);
    }
}
class TemplateAstPathBuilder extends TemplateAstChildVisitor {
    constructor(position, allowWidening) {
        super();
        this.position = position;
        this.allowWidening = allowWidening;
        this.path = [];
    }
    visit(ast, context) {
        let span = spanOf(ast);
        if (inSpan(this.position, span)) {
            const len = this.path.length;
            if (!len || this.allowWidening || isNarrower(span, spanOf(this.path[len - 1]))) {
                this.path.push(ast);
            }
        }
        else {
            // Returning a value here will result in the children being skipped.
            return true;
        }
    }
    visitEmbeddedTemplate(ast, context) {
        return this.visitChildren(context, visit => {
            // Ignore reference, variable and providers
            visit(ast.attrs);
            visit(ast.directives);
            visit(ast.children);
        });
    }
    visitElement(ast, context) {
        return this.visitChildren(context, visit => {
            // Ingnore providers
            visit(ast.attrs);
            visit(ast.inputs);
            visit(ast.outputs);
            visit(ast.references);
            visit(ast.directives);
            visit(ast.children);
        });
    }
    visitDirective(ast, context) {
        // Ignore the host properties of a directive
        const result = this.visitChildren(context, visit => { visit(ast.inputs); });
        // We never care about the diretive itself, just its inputs.
        if (this.path[this.path.length - 1] == ast) {
            this.path.pop();
        }
        return result;
    }
    getPath() { return this.path; }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * An enumeration of basic types.
 *
 * A `LanguageServiceHost` interface.
 *
 * @experimental
 */
var BuiltinType;
(function (BuiltinType) {
    /**
     * The type is a type that can hold any other type.
     */
    BuiltinType[BuiltinType["Any"] = 0] = "Any";
    /**
     * The type of a string literal.
     */
    BuiltinType[BuiltinType["String"] = 1] = "String";
    /**
     * The type of a numeric literal.
     */
    BuiltinType[BuiltinType["Number"] = 2] = "Number";
    /**
     * The type of the `true` and `false` literals.
     */
    BuiltinType[BuiltinType["Boolean"] = 3] = "Boolean";
    /**
     * The type of the `undefined` literal.
     */
    BuiltinType[BuiltinType["Undefined"] = 4] = "Undefined";
    /**
     * the type of the `null` literal.
     */
    BuiltinType[BuiltinType["Null"] = 5] = "Null";
    /**
     * the type is an unbound type parameter.
     */
    BuiltinType[BuiltinType["Unbound"] = 6] = "Unbound";
    /**
     * Not a built-in type.
     */
    BuiltinType[BuiltinType["Other"] = 7] = "Other";
})(BuiltinType || (BuiltinType = {}));
/**
 * The kind of diagnostic message.
 *
 * @experimental
 */
var DiagnosticKind;
(function (DiagnosticKind) {
    DiagnosticKind[DiagnosticKind["Error"] = 0] = "Error";
    DiagnosticKind[DiagnosticKind["Warning"] = 1] = "Warning";
})(DiagnosticKind || (DiagnosticKind = {}));

function getExpressionDiagnostics(scope, ast, query, context = {}) {
    const analyzer = new AstType(scope, query, context);
    analyzer.getDiagnostics(ast);
    return analyzer.diagnostics;
}
function getExpressionCompletions(scope, ast, position, query) {
    const path = new AstPath(ast, position);
    if (path.empty)
        return undefined;
    const tail = path.tail;
    let result = scope;
    function getType(ast) { return new AstType(scope, query, {}).getType(ast); }
    // If the completion request is in a not in a pipe or property access then the global scope
    // (that is the scope of the implicit receiver) is the right scope as the user is typing the
    // beginning of an expression.
    tail.visit({
        visitBinary(ast) { },
        visitChain(ast) { },
        visitConditional(ast) { },
        visitFunctionCall(ast) { },
        visitImplicitReceiver(ast) { },
        visitInterpolation(ast) { result = undefined; },
        visitKeyedRead(ast) { },
        visitKeyedWrite(ast) { },
        visitLiteralArray(ast) { },
        visitLiteralMap(ast) { },
        visitLiteralPrimitive(ast) { },
        visitMethodCall(ast) { },
        visitPipe(ast) {
            if (position >= ast.exp.span.end &&
                (!ast.args || !ast.args.length || position < ast.args[0].span.start)) {
                // We are in a position a pipe name is expected.
                result = query.getPipes();
            }
        },
        visitPrefixNot(ast) { },
        visitPropertyRead(ast) {
            const receiverType = getType(ast.receiver);
            result = receiverType ? receiverType.members() : scope;
        },
        visitPropertyWrite(ast) {
            const receiverType = getType(ast.receiver);
            result = receiverType ? receiverType.members() : scope;
        },
        visitQuote(ast) {
            // For a quote, return the members of any (if there are any).
            result = query.getBuiltinType(BuiltinType.Any).members();
        },
        visitSafeMethodCall(ast) {
            const receiverType = getType(ast.receiver);
            result = receiverType ? receiverType.members() : scope;
        },
        visitSafePropertyRead(ast) {
            const receiverType = getType(ast.receiver);
            result = receiverType ? receiverType.members() : scope;
        },
    });
    return result && result.values();
}
function getExpressionSymbol(scope, ast, position, query) {
    const path = new AstPath(ast, position, /* excludeEmpty */ true);
    if (path.empty)
        return undefined;
    const tail = path.tail;
    function getType(ast) { return new AstType(scope, query, {}).getType(ast); }
    let symbol = undefined;
    let span = undefined;
    // If the completion request is in a not in a pipe or property access then the global scope
    // (that is the scope of the implicit receiver) is the right scope as the user is typing the
    // beginning of an expression.
    tail.visit({
        visitBinary(ast) { },
        visitChain(ast) { },
        visitConditional(ast) { },
        visitFunctionCall(ast) { },
        visitImplicitReceiver(ast) { },
        visitInterpolation(ast) { },
        visitKeyedRead(ast) { },
        visitKeyedWrite(ast) { },
        visitLiteralArray(ast) { },
        visitLiteralMap(ast) { },
        visitLiteralPrimitive(ast) { },
        visitMethodCall(ast) {
            const receiverType = getType(ast.receiver);
            symbol = receiverType && receiverType.members().get(ast.name);
            span = ast.span;
        },
        visitPipe(ast) {
            if (position >= ast.exp.span.end &&
                (!ast.args || !ast.args.length || position < ast.args[0].span.start)) {
                // We are in a position a pipe name is expected.
                const pipes = query.getPipes();
                if (pipes) {
                    symbol = pipes.get(ast.name);
                    span = ast.span;
                }
            }
        },
        visitPrefixNot(ast) { },
        visitPropertyRead(ast) {
            const receiverType = getType(ast.receiver);
            symbol = receiverType && receiverType.members().get(ast.name);
            span = ast.span;
        },
        visitPropertyWrite(ast) {
            const receiverType = getType(ast.receiver);
            symbol = receiverType && receiverType.members().get(ast.name);
            span = ast.span;
        },
        visitQuote(ast) { },
        visitSafeMethodCall(ast) {
            const receiverType = getType(ast.receiver);
            symbol = receiverType && receiverType.members().get(ast.name);
            span = ast.span;
        },
        visitSafePropertyRead(ast) {
            const receiverType = getType(ast.receiver);
            symbol = receiverType && receiverType.members().get(ast.name);
            span = ast.span;
        },
    });
    if (symbol && span) {
        return { symbol, span };
    }
}
// Consider moving to expression_parser/ast
class NullVisitor {
    visitBinary(ast) { }
    visitChain(ast) { }
    visitConditional(ast) { }
    visitFunctionCall(ast) { }
    visitImplicitReceiver(ast) { }
    visitInterpolation(ast) { }
    visitKeyedRead(ast) { }
    visitKeyedWrite(ast) { }
    visitLiteralArray(ast) { }
    visitLiteralMap(ast) { }
    visitLiteralPrimitive(ast) { }
    visitMethodCall(ast) { }
    visitPipe(ast) { }
    visitPrefixNot(ast) { }
    visitPropertyRead(ast) { }
    visitPropertyWrite(ast) { }
    visitQuote(ast) { }
    visitSafeMethodCall(ast) { }
    visitSafePropertyRead(ast) { }
}
class TypeDiagnostic {
    constructor(kind, message, ast) {
        this.kind = kind;
        this.message = message;
        this.ast = ast;
    }
}
// AstType calculatetype of the ast given AST element.
class AstType {
    constructor(scope, query, context) {
        this.scope = scope;
        this.query = query;
        this.context = context;
    }
    getType(ast) { return ast.visit(this); }
    getDiagnostics(ast) {
        this.diagnostics = [];
        const type = ast.visit(this);
        if (this.context.event && type.callable) {
            this.reportWarning('Unexpected callable expression. Expected a method call', ast);
        }
        return this.diagnostics;
    }
    visitBinary(ast) {
        // Treat undefined and null as other.
        function normalize(kind, other) {
            switch (kind) {
                case BuiltinType.Undefined:
                case BuiltinType.Null:
                    return normalize(other, BuiltinType.Other);
            }
            return kind;
        }
        const leftType = this.getType(ast.left);
        const rightType = this.getType(ast.right);
        const leftRawKind = this.query.getTypeKind(leftType);
        const rightRawKind = this.query.getTypeKind(rightType);
        const leftKind = normalize(leftRawKind, rightRawKind);
        const rightKind = normalize(rightRawKind, leftRawKind);
        // The following swtich implements operator typing similar to the
        // type production tables in the TypeScript specification.
        // https://github.com/Microsoft/TypeScript/blob/v1.8.10/doc/spec.md#4.19
        const operKind = leftKind << 8 | rightKind;
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
                    case BuiltinType.Any << 8 | BuiltinType.Any:
                    case BuiltinType.Number << 8 | BuiltinType.Any:
                    case BuiltinType.Any << 8 | BuiltinType.Number:
                    case BuiltinType.Number << 8 | BuiltinType.Number:
                        return this.query.getBuiltinType(BuiltinType.Number);
                    default:
                        let errorAst = ast.left;
                        switch (leftKind) {
                            case BuiltinType.Any:
                            case BuiltinType.Number:
                                errorAst = ast.right;
                                break;
                        }
                        return this.reportError('Expected a numeric type', errorAst);
                }
            case '+':
                switch (operKind) {
                    case BuiltinType.Any << 8 | BuiltinType.Any:
                    case BuiltinType.Any << 8 | BuiltinType.Boolean:
                    case BuiltinType.Any << 8 | BuiltinType.Number:
                    case BuiltinType.Any << 8 | BuiltinType.Other:
                    case BuiltinType.Boolean << 8 | BuiltinType.Any:
                    case BuiltinType.Number << 8 | BuiltinType.Any:
                    case BuiltinType.Other << 8 | BuiltinType.Any:
                        return this.anyType;
                    case BuiltinType.Any << 8 | BuiltinType.String:
                    case BuiltinType.Boolean << 8 | BuiltinType.String:
                    case BuiltinType.Number << 8 | BuiltinType.String:
                    case BuiltinType.String << 8 | BuiltinType.Any:
                    case BuiltinType.String << 8 | BuiltinType.Boolean:
                    case BuiltinType.String << 8 | BuiltinType.Number:
                    case BuiltinType.String << 8 | BuiltinType.String:
                    case BuiltinType.String << 8 | BuiltinType.Other:
                    case BuiltinType.Other << 8 | BuiltinType.String:
                        return this.query.getBuiltinType(BuiltinType.String);
                    case BuiltinType.Number << 8 | BuiltinType.Number:
                        return this.query.getBuiltinType(BuiltinType.Number);
                    case BuiltinType.Boolean << 8 | BuiltinType.Number:
                    case BuiltinType.Other << 8 | BuiltinType.Number:
                        return this.reportError('Expected a number type', ast.left);
                    case BuiltinType.Number << 8 | BuiltinType.Boolean:
                    case BuiltinType.Number << 8 | BuiltinType.Other:
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
                    case BuiltinType.Any << 8 | BuiltinType.Any:
                    case BuiltinType.Any << 8 | BuiltinType.Boolean:
                    case BuiltinType.Any << 8 | BuiltinType.Number:
                    case BuiltinType.Any << 8 | BuiltinType.String:
                    case BuiltinType.Any << 8 | BuiltinType.Other:
                    case BuiltinType.Boolean << 8 | BuiltinType.Any:
                    case BuiltinType.Boolean << 8 | BuiltinType.Boolean:
                    case BuiltinType.Number << 8 | BuiltinType.Any:
                    case BuiltinType.Number << 8 | BuiltinType.Number:
                    case BuiltinType.String << 8 | BuiltinType.Any:
                    case BuiltinType.String << 8 | BuiltinType.String:
                    case BuiltinType.Other << 8 | BuiltinType.Any:
                    case BuiltinType.Other << 8 | BuiltinType.Other:
                        return this.query.getBuiltinType(BuiltinType.Boolean);
                    default:
                        return this.reportError('Expected the operants to be of similar type or any', ast);
                }
            case '&&':
                return rightType;
            case '||':
                return this.query.getTypeUnion(leftType, rightType);
        }
        return this.reportError(`Unrecognized operator ${ast.operation}`, ast);
    }
    visitChain(ast) {
        if (this.diagnostics) {
            // If we are producing diagnostics, visit the children
            visitChildren(ast, this);
        }
        // The type of a chain is always undefined.
        return this.query.getBuiltinType(BuiltinType.Undefined);
    }
    visitConditional(ast) {
        // The type of a conditional is the union of the true and false conditions.
        return this.query.getTypeUnion(this.getType(ast.trueExp), this.getType(ast.falseExp));
    }
    visitFunctionCall(ast) {
        // The type of a function call is the return type of the selected signature.
        // The signature is selected based on the types of the arguments. Angular doesn't
        // support contextual typing of arguments so this is simpler than TypeScript's
        // version.
        const args = ast.args.map(arg => this.getType(arg));
        const target = this.getType(ast.target);
        if (!target || !target.callable)
            return this.reportError('Call target is not callable', ast);
        const signature = target.selectSignature(args);
        if (signature)
            return signature.result;
        // TODO: Consider a better error message here.
        return this.reportError('Unable no compatible signature found for call', ast);
    }
    visitImplicitReceiver(ast) {
        const _this = this;
        // Return a pseudo-symbol for the implicit receiver.
        // The members of the implicit receiver are what is defined by the
        // scope passed into this class.
        return {
            name: '$implict',
            kind: 'component',
            language: 'ng-template',
            type: undefined,
            container: undefined,
            callable: false,
            public: true,
            definition: undefined,
            members() { return _this.scope; },
            signatures() { return []; },
            selectSignature(types) { return undefined; },
            indexed(argument) { return undefined; }
        };
    }
    visitInterpolation(ast) {
        // If we are producing diagnostics, visit the children.
        if (this.diagnostics) {
            visitChildren(ast, this);
        }
        return this.undefinedType;
    }
    visitKeyedRead(ast) {
        const targetType = this.getType(ast.obj);
        const keyType = this.getType(ast.key);
        const result = targetType.indexed(keyType);
        return result || this.anyType;
    }
    visitKeyedWrite(ast) {
        // The write of a type is the type of the value being written.
        return this.getType(ast.value);
    }
    visitLiteralArray(ast) {
        // A type literal is an array type of the union of the elements
        return this.query.getArrayType(this.query.getTypeUnion(...ast.expressions.map(element => this.getType(element))));
    }
    visitLiteralMap(ast) {
        // If we are producing diagnostics, visit the children
        if (this.diagnostics) {
            visitChildren(ast, this);
        }
        // TODO: Return a composite type.
        return this.anyType;
    }
    visitLiteralPrimitive(ast) {
        // The type of a literal primitive depends on the value of the literal.
        switch (ast.value) {
            case true:
            case false:
                return this.query.getBuiltinType(BuiltinType.Boolean);
            case null:
                return this.query.getBuiltinType(BuiltinType.Null);
            case undefined:
                return this.query.getBuiltinType(BuiltinType.Undefined);
            default:
                switch (typeof ast.value) {
                    case 'string':
                        return this.query.getBuiltinType(BuiltinType.String);
                    case 'number':
                        return this.query.getBuiltinType(BuiltinType.Number);
                    default:
                        return this.reportError('Unrecognized primitive', ast);
                }
        }
    }
    visitMethodCall(ast) {
        return this.resolveMethodCall(this.getType(ast.receiver), ast);
    }
    visitPipe(ast) {
        // The type of a pipe node is the return type of the pipe's transform method. The table returned
        // by getPipes() is expected to contain symbols with the corresponding transform method type.
        const pipe = this.query.getPipes().get(ast.name);
        if (!pipe)
            return this.reportError(`No pipe by the name ${pipe.name} found`, ast);
        const expType = this.getType(ast.exp);
        const signature = pipe.selectSignature([expType].concat(ast.args.map(arg => this.getType(arg))));
        if (!signature)
            return this.reportError('Unable to resolve signature for pipe invocation', ast);
        return signature.result;
    }
    visitPrefixNot(ast) {
        // The type of a prefix ! is always boolean.
        return this.query.getBuiltinType(BuiltinType.Boolean);
    }
    visitPropertyRead(ast) {
        return this.resolvePropertyRead(this.getType(ast.receiver), ast);
    }
    visitPropertyWrite(ast) {
        // The type of a write is the type of the value being written.
        return this.getType(ast.value);
    }
    visitQuote(ast) {
        // The type of a quoted expression is any.
        return this.query.getBuiltinType(BuiltinType.Any);
    }
    visitSafeMethodCall(ast) {
        return this.resolveMethodCall(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
    }
    visitSafePropertyRead(ast) {
        return this.resolvePropertyRead(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
    }
    get anyType() {
        let result = this._anyType;
        if (!result) {
            result = this._anyType = this.query.getBuiltinType(BuiltinType.Any);
        }
        return result;
    }
    get undefinedType() {
        let result = this._undefinedType;
        if (!result) {
            result = this._undefinedType = this.query.getBuiltinType(BuiltinType.Undefined);
        }
        return result;
    }
    resolveMethodCall(receiverType, ast) {
        if (this.isAny(receiverType)) {
            return this.anyType;
        }
        // The type of a method is the selected methods result type.
        const method = receiverType.members().get(ast.name);
        if (!method)
            return this.reportError(`Unknown method ${ast.name}`, ast);
        if (!method.type.callable)
            return this.reportError(`Member ${ast.name} is not callable`, ast);
        const signature = method.type.selectSignature(ast.args.map(arg => this.getType(arg)));
        if (!signature)
            return this.reportError(`Unable to resolve signature for call of method ${ast.name}`, ast);
        return signature.result;
    }
    resolvePropertyRead(receiverType, ast) {
        if (this.isAny(receiverType)) {
            return this.anyType;
        }
        // The type of a property read is the seelcted member's type.
        const member = receiverType.members().get(ast.name);
        if (!member) {
            let receiverInfo = receiverType.name;
            if (receiverInfo == '$implict') {
                receiverInfo =
                    'The component declaration, template variable declarations, and element references do';
            }
            else {
                receiverInfo = `'${receiverInfo}' does`;
            }
            return this.reportError(`Identifier '${ast.name}' is not defined. ${receiverInfo} not contain such a member`, ast);
        }
        if (!member.public) {
            let receiverInfo = receiverType.name;
            if (receiverInfo == '$implict') {
                receiverInfo = 'the component';
            }
            else {
                receiverInfo = `'${receiverInfo}'`;
            }
            this.reportWarning(`Identifier '${ast.name}' refers to a private member of ${receiverInfo}`, ast);
        }
        return member.type;
    }
    reportError(message, ast) {
        if (this.diagnostics) {
            this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Error, message, ast));
        }
        return this.anyType;
    }
    reportWarning(message, ast) {
        if (this.diagnostics) {
            this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Warning, message, ast));
        }
        return this.anyType;
    }
    isAny(symbol) {
        return !symbol || this.query.getTypeKind(symbol) == BuiltinType.Any ||
            (symbol.type && this.isAny(symbol.type));
    }
}
class AstPath extends AstPath$1 {
    constructor(ast, position, excludeEmpty = false) {
        super(new AstPathVisitor(position, excludeEmpty).buildPath(ast).path);
        this.position = position;
    }
}
class AstPathVisitor extends NullVisitor {
    constructor(position, excludeEmpty) {
        super();
        this.position = position;
        this.excludeEmpty = excludeEmpty;
        this.path = [];
    }
    visit(ast) {
        if ((!this.excludeEmpty || ast.span.start < ast.span.end) && inSpan(this.position, ast.span)) {
            this.path.push(ast);
            visitChildren(ast, this);
        }
    }
    buildPath(ast) {
        // We never care about the ASTWithSource node and its visit() method calls its ast's visit so
        // the visit() method above would never see it.
        if (ast instanceof ASTWithSource) {
            ast = ast.ast;
        }
        this.visit(ast);
        return this;
    }
}
// TODO: Consider moving to expression_parser/ast
function visitChildren(ast, visitor) {
    function visit(ast) { visitor.visit && visitor.visit(ast) || ast.visit(visitor); }
    function visitAll(asts) { asts.forEach(visit); }
    ast.visit({
        visitBinary(ast) {
            visit(ast.left);
            visit(ast.right);
        },
        visitChain(ast) { visitAll(ast.expressions); },
        visitConditional(ast) {
            visit(ast.condition);
            visit(ast.trueExp);
            visit(ast.falseExp);
        },
        visitFunctionCall(ast) {
            visit(ast.target);
            visitAll(ast.args);
        },
        visitImplicitReceiver(ast) { },
        visitInterpolation(ast) { visitAll(ast.expressions); },
        visitKeyedRead(ast) {
            visit(ast.obj);
            visit(ast.key);
        },
        visitKeyedWrite(ast) {
            visit(ast.obj);
            visit(ast.key);
            visit(ast.obj);
        },
        visitLiteralArray(ast) { visitAll(ast.expressions); },
        visitLiteralMap(ast) { },
        visitLiteralPrimitive(ast) { },
        visitMethodCall(ast) {
            visit(ast.receiver);
            visitAll(ast.args);
        },
        visitPipe(ast) {
            visit(ast.exp);
            visitAll(ast.args);
        },
        visitPrefixNot(ast) { visit(ast.expression); },
        visitPropertyRead(ast) { visit(ast.receiver); },
        visitPropertyWrite(ast) {
            visit(ast.receiver);
            visit(ast.value);
        },
        visitQuote(ast) { },
        visitSafeMethodCall(ast) {
            visit(ast.receiver);
            visitAll(ast.args);
        },
        visitSafePropertyRead(ast) { visit(ast.receiver); },
    });
}
function getExpressionScope(info, path, includeEvent) {
    let result = info.template.members;
    const references = getReferences(info);
    const variables = getVarDeclarations(info, path);
    const events = getEventDeclaration(info, path, includeEvent);
    if (references.length || variables.length || events.length) {
        const referenceTable = info.template.query.createSymbolTable(references);
        const variableTable = info.template.query.createSymbolTable(variables);
        const eventsTable = info.template.query.createSymbolTable(events);
        result =
            info.template.query.mergeSymbolTable([result, referenceTable, variableTable, eventsTable]);
    }
    return result;
}
function getEventDeclaration(info, path, includeEvent) {
    let result = [];
    if (includeEvent) {
        // TODO: Determine the type of the event parameter based on the Observable<T> or EventEmitter<T>
        // of the event.
        result = [{
                name: '$event',
                kind: 'variable',
                type: info.template.query.getBuiltinType(BuiltinType.Any)
            }];
    }
    return result;
}
function getReferences(info) {
    const result = [];
    function processReferences(references) {
        for (const reference of references) {
            let type;
            if (reference.value) {
                type = info.template.query.getTypeSymbol(tokenReference(reference.value));
            }
            result.push({
                name: reference.name,
                kind: 'reference',
                type: type || info.template.query.getBuiltinType(BuiltinType.Any),
                get definition() { return getDefintionOf(info, reference); }
            });
        }
    }
    const visitor = new class extends TemplateAstChildVisitor {
        visitEmbeddedTemplate(ast, context) {
            super.visitEmbeddedTemplate(ast, context);
            processReferences(ast.references);
        }
        visitElement(ast, context) {
            super.visitElement(ast, context);
            processReferences(ast.references);
        }
    };
    templateVisitAll(visitor, info.templateAst);
    return result;
}
function getVarDeclarations(info, path) {
    const result = [];
    let current = path.tail;
    while (current) {
        if (current instanceof EmbeddedTemplateAst) {
            for (const variable of current.variables) {
                const name = variable.name;
                // Find the first directive with a context.
                const context = current.directives
                    .map(d => info.template.query.getTemplateContext(d.directive.type.reference))
                    .find(c => !!c);
                // Determine the type of the context field referenced by variable.value.
                let type;
                if (context) {
                    const value = context.get(variable.value);
                    if (value) {
                        type = value.type;
                        let kind = info.template.query.getTypeKind(type);
                        if (kind === BuiltinType.Any || kind == BuiltinType.Unbound) {
                            // The any type is not very useful here. For special cases, such as ngFor, we can do
                            // better.
                            type = refinedVariableType(type, info, current);
                        }
                    }
                }
                if (!type) {
                    type = info.template.query.getBuiltinType(BuiltinType.Any);
                }
                result.push({
                    name,
                    kind: 'variable', type, get definition() { return getDefintionOf(info, variable); }
                });
            }
        }
        current = path.parentOf(current);
    }
    return result;
}
function refinedVariableType(type, info, templateElement) {
    // Special case the ngFor directive
    const ngForDirective = templateElement.directives.find(d => {
        const name = identifierName(d.directive.type);
        return name == 'NgFor' || name == 'NgForOf';
    });
    if (ngForDirective) {
        const ngForOfBinding = ngForDirective.inputs.find(i => i.directiveName == 'ngForOf');
        if (ngForOfBinding) {
            const bindingType = new AstType(info.template.members, info.template.query, {}).getType(ngForOfBinding.value);
            if (bindingType) {
                return info.template.query.getElementType(bindingType);
            }
        }
    }
    // We can't do better, just return the original type.
    return type;
}
function getDefintionOf(info, ast) {
    if (info.fileName) {
        const templateOffset = info.template.span.start;
        return [{
                fileName: info.fileName,
                span: {
                    start: ast.sourceSpan.start.offset + templateOffset,
                    end: ast.sourceSpan.end.offset + templateOffset
                }
            }];
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const values = [
    'ID',
    'CDATA',
    'NAME',
    ['ltr', 'rtl'],
    ['rect', 'circle', 'poly', 'default'],
    'NUMBER',
    ['nohref'],
    ['ismap'],
    ['declare'],
    ['DATA', 'REF', 'OBJECT'],
    ['GET', 'POST'],
    'IDREF',
    ['TEXT', 'PASSWORD', 'CHECKBOX', 'RADIO', 'SUBMIT', 'RESET', 'FILE', 'HIDDEN', 'IMAGE', 'BUTTON'],
    ['checked'],
    ['disabled'],
    ['readonly'],
    ['multiple'],
    ['selected'],
    ['button', 'submit', 'reset'],
    ['void', 'above', 'below', 'hsides', 'lhs', 'rhs', 'vsides', 'box', 'border'],
    ['none', 'groups', 'rows', 'cols', 'all'],
    ['left', 'center', 'right', 'justify', 'char'],
    ['top', 'middle', 'bottom', 'baseline'],
    'IDREFS',
    ['row', 'col', 'rowgroup', 'colgroup'],
    ['defer']
];
const groups = [
    { id: 0 },
    {
        onclick: 1,
        ondblclick: 1,
        onmousedown: 1,
        onmouseup: 1,
        onmouseover: 1,
        onmousemove: 1,
        onmouseout: 1,
        onkeypress: 1,
        onkeydown: 1,
        onkeyup: 1
    },
    { lang: 2, dir: 3 },
    { onload: 1, onunload: 1 },
    { name: 1 },
    { href: 1 },
    { type: 1 },
    { alt: 1 },
    { tabindex: 5 },
    { media: 1 },
    { nohref: 6 },
    { usemap: 1 },
    { src: 1 },
    { onfocus: 1, onblur: 1 },
    { charset: 1 },
    { declare: 8, classid: 1, codebase: 1, data: 1, codetype: 1, archive: 1, standby: 1 },
    { title: 1 },
    { value: 1 },
    { cite: 1 },
    { datetime: 1 },
    { accept: 1 },
    { shape: 4, coords: 1 },
    { for: 11
    },
    { action: 1, method: 10, enctype: 1, onsubmit: 1, onreset: 1, 'accept-charset': 1 },
    { valuetype: 9 },
    { longdesc: 1 },
    { width: 1 },
    { disabled: 14 },
    { readonly: 15, onselect: 1 },
    { accesskey: 1 },
    { size: 5, multiple: 16 },
    { onchange: 1 },
    { label: 1 },
    { selected: 17 },
    { type: 12, checked: 13, size: 1, maxlength: 5 },
    { rows: 5, cols: 5 },
    { type: 18 },
    { height: 1 },
    { summary: 1, border: 1, frame: 19, rules: 20, cellspacing: 1, cellpadding: 1, datapagesize: 1 },
    { align: 21, char: 1, charoff: 1, valign: 22 },
    { span: 5 },
    { abbr: 1, axis: 1, headers: 23, scope: 24, rowspan: 5, colspan: 5 },
    { profile: 1 },
    { 'http-equiv': 2, name: 2, content: 1, scheme: 1 },
    { class: 1, style: 1 },
    { hreflang: 2, rel: 1, rev: 1 },
    { ismap: 7 },
    { defer: 25, event: 1, for: 1 }
];
const elements = {
    TT: [0, 1, 2, 16, 44],
    I: [0, 1, 2, 16, 44],
    B: [0, 1, 2, 16, 44],
    BIG: [0, 1, 2, 16, 44],
    SMALL: [0, 1, 2, 16, 44],
    EM: [0, 1, 2, 16, 44],
    STRONG: [0, 1, 2, 16, 44],
    DFN: [0, 1, 2, 16, 44],
    CODE: [0, 1, 2, 16, 44],
    SAMP: [0, 1, 2, 16, 44],
    KBD: [0, 1, 2, 16, 44],
    VAR: [0, 1, 2, 16, 44],
    CITE: [0, 1, 2, 16, 44],
    ABBR: [0, 1, 2, 16, 44],
    ACRONYM: [0, 1, 2, 16, 44],
    SUB: [0, 1, 2, 16, 44],
    SUP: [0, 1, 2, 16, 44],
    SPAN: [0, 1, 2, 16, 44],
    BDO: [0, 2, 16, 44],
    BR: [0, 16, 44],
    BODY: [0, 1, 2, 3, 16, 44],
    ADDRESS: [0, 1, 2, 16, 44],
    DIV: [0, 1, 2, 16, 44],
    A: [0, 1, 2, 4, 5, 6, 8, 13, 14, 16, 21, 29, 44, 45],
    MAP: [0, 1, 2, 4, 16, 44],
    AREA: [0, 1, 2, 5, 7, 8, 10, 13, 16, 21, 29, 44],
    LINK: [0, 1, 2, 5, 6, 9, 14, 16, 44, 45],
    IMG: [0, 1, 2, 4, 7, 11, 12, 16, 25, 26, 37, 44, 46],
    OBJECT: [0, 1, 2, 4, 6, 8, 11, 15, 16, 26, 37, 44],
    PARAM: [0, 4, 6, 17, 24],
    HR: [0, 1, 2, 16, 44],
    P: [0, 1, 2, 16, 44],
    H1: [0, 1, 2, 16, 44],
    H2: [0, 1, 2, 16, 44],
    H3: [0, 1, 2, 16, 44],
    H4: [0, 1, 2, 16, 44],
    H5: [0, 1, 2, 16, 44],
    H6: [0, 1, 2, 16, 44],
    PRE: [0, 1, 2, 16, 44],
    Q: [0, 1, 2, 16, 18, 44],
    BLOCKQUOTE: [0, 1, 2, 16, 18, 44],
    INS: [0, 1, 2, 16, 18, 19, 44],
    DEL: [0, 1, 2, 16, 18, 19, 44],
    DL: [0, 1, 2, 16, 44],
    DT: [0, 1, 2, 16, 44],
    DD: [0, 1, 2, 16, 44],
    OL: [0, 1, 2, 16, 44],
    UL: [0, 1, 2, 16, 44],
    LI: [0, 1, 2, 16, 44],
    FORM: [0, 1, 2, 4, 16, 20, 23, 44],
    LABEL: [0, 1, 2, 13, 16, 22, 29, 44],
    INPUT: [0, 1, 2, 4, 7, 8, 11, 12, 13, 16, 17, 20, 27, 28, 29, 31, 34, 44, 46],
    SELECT: [0, 1, 2, 4, 8, 13, 16, 27, 30, 31, 44],
    OPTGROUP: [0, 1, 2, 16, 27, 32, 44],
    OPTION: [0, 1, 2, 16, 17, 27, 32, 33, 44],
    TEXTAREA: [0, 1, 2, 4, 8, 13, 16, 27, 28, 29, 31, 35, 44],
    FIELDSET: [0, 1, 2, 16, 44],
    LEGEND: [0, 1, 2, 16, 29, 44],
    BUTTON: [0, 1, 2, 4, 8, 13, 16, 17, 27, 29, 36, 44],
    TABLE: [0, 1, 2, 16, 26, 38, 44],
    CAPTION: [0, 1, 2, 16, 44],
    COLGROUP: [0, 1, 2, 16, 26, 39, 40, 44],
    COL: [0, 1, 2, 16, 26, 39, 40, 44],
    THEAD: [0, 1, 2, 16, 39, 44],
    TBODY: [0, 1, 2, 16, 39, 44],
    TFOOT: [0, 1, 2, 16, 39, 44],
    TR: [0, 1, 2, 16, 39, 44],
    TH: [0, 1, 2, 16, 39, 41, 44],
    TD: [0, 1, 2, 16, 39, 41, 44],
    HEAD: [2, 42],
    TITLE: [2],
    BASE: [5],
    META: [2, 43],
    STYLE: [2, 6, 9, 16],
    SCRIPT: [6, 12, 14, 47],
    NOSCRIPT: [0, 1, 2, 16, 44],
    HTML: [2]
};
const defaultAttributes = [0, 1, 2, 4];
function elementNames() {
    return Object.keys(elements).sort().map(v => v.toLowerCase());
}
function compose(indexes) {
    const result = {};
    if (indexes) {
        for (let index of indexes) {
            const group = groups[index];
            for (let name in group)
                if (group.hasOwnProperty(name))
                    result[name] = values[group[name]];
        }
    }
    return result;
}
function attributeNames(element) {
    return Object.keys(compose(elements[element.toUpperCase()] || defaultAttributes)).sort();
}
// This section is describes the DOM property surface of a DOM element and is dervided from
// from the SCHEMA strings from the security context information. SCHEMA is copied here because
// it would be an unnecessary risk to allow this array to be imported from the security context
// schema registry.
const SCHEMA = [
    '[Element]|textContent,%classList,className,id,innerHTML,*beforecopy,*beforecut,*beforepaste,*copy,*cut,*paste,*search,*selectstart,*webkitfullscreenchange,*webkitfullscreenerror,*wheel,outerHTML,#scrollLeft,#scrollTop',
    '[HTMLElement]^[Element]|accessKey,contentEditable,dir,!draggable,!hidden,innerText,lang,*abort,*beforecopy,*beforecut,*beforepaste,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*message,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*mozfullscreenchange,*mozfullscreenerror,*mozpointerlockchange,*mozpointerlockerror,*paste,*pause,*play,*playing,*progress,*ratechange,*reset,*resize,*scroll,*search,*seeked,*seeking,*select,*selectstart,*show,*stalled,*submit,*suspend,*timeupdate,*toggle,*volumechange,*waiting,*webglcontextcreationerror,*webglcontextlost,*webglcontextrestored,*webkitfullscreenchange,*webkitfullscreenerror,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate',
    'abbr,address,article,aside,b,bdi,bdo,cite,code,dd,dfn,dt,em,figcaption,figure,footer,header,i,kbd,main,mark,nav,noscript,rb,rp,rt,rtc,ruby,s,samp,section,small,strong,sub,sup,u,var,wbr^[HTMLElement]|accessKey,contentEditable,dir,!draggable,!hidden,innerText,lang,*abort,*beforecopy,*beforecut,*beforepaste,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*message,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*mozfullscreenchange,*mozfullscreenerror,*mozpointerlockchange,*mozpointerlockerror,*paste,*pause,*play,*playing,*progress,*ratechange,*reset,*resize,*scroll,*search,*seeked,*seeking,*select,*selectstart,*show,*stalled,*submit,*suspend,*timeupdate,*toggle,*volumechange,*waiting,*webglcontextcreationerror,*webglcontextlost,*webglcontextrestored,*webkitfullscreenchange,*webkitfullscreenerror,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate',
    'media^[HTMLElement]|!autoplay,!controls,%crossOrigin,#currentTime,!defaultMuted,#defaultPlaybackRate,!disableRemotePlayback,!loop,!muted,*encrypted,#playbackRate,preload,src,%srcObject,#volume',
    ':svg:^[HTMLElement]|*abort,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*cuechange,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*pause,*play,*playing,*progress,*ratechange,*reset,*resize,*scroll,*seeked,*seeking,*select,*show,*stalled,*submit,*suspend,*timeupdate,*toggle,*volumechange,*waiting,%style,#tabIndex',
    ':svg:graphics^:svg:|',
    ':svg:animation^:svg:|*begin,*end,*repeat',
    ':svg:geometry^:svg:|',
    ':svg:componentTransferFunction^:svg:|',
    ':svg:gradient^:svg:|',
    ':svg:textContent^:svg:graphics|',
    ':svg:textPositioning^:svg:textContent|',
    'a^[HTMLElement]|charset,coords,download,hash,host,hostname,href,hreflang,name,password,pathname,ping,port,protocol,referrerPolicy,rel,rev,search,shape,target,text,type,username',
    'area^[HTMLElement]|alt,coords,hash,host,hostname,href,!noHref,password,pathname,ping,port,protocol,referrerPolicy,search,shape,target,username',
    'audio^media|',
    'br^[HTMLElement]|clear',
    'base^[HTMLElement]|href,target',
    'body^[HTMLElement]|aLink,background,bgColor,link,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,text,vLink',
    'button^[HTMLElement]|!autofocus,!disabled,formAction,formEnctype,formMethod,!formNoValidate,formTarget,name,type,value',
    'canvas^[HTMLElement]|#height,#width',
    'content^[HTMLElement]|select',
    'dl^[HTMLElement]|!compact',
    'datalist^[HTMLElement]|',
    'details^[HTMLElement]|!open',
    'dialog^[HTMLElement]|!open,returnValue',
    'dir^[HTMLElement]|!compact',
    'div^[HTMLElement]|align',
    'embed^[HTMLElement]|align,height,name,src,type,width',
    'fieldset^[HTMLElement]|!disabled,name',
    'font^[HTMLElement]|color,face,size',
    'form^[HTMLElement]|acceptCharset,action,autocomplete,encoding,enctype,method,name,!noValidate,target',
    'frame^[HTMLElement]|frameBorder,longDesc,marginHeight,marginWidth,name,!noResize,scrolling,src',
    'frameset^[HTMLElement]|cols,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,rows',
    'hr^[HTMLElement]|align,color,!noShade,size,width',
    'head^[HTMLElement]|',
    'h1,h2,h3,h4,h5,h6^[HTMLElement]|align',
    'html^[HTMLElement]|version',
    'iframe^[HTMLElement]|align,!allowFullscreen,frameBorder,height,longDesc,marginHeight,marginWidth,name,referrerPolicy,%sandbox,scrolling,src,srcdoc,width',
    'img^[HTMLElement]|align,alt,border,%crossOrigin,#height,#hspace,!isMap,longDesc,lowsrc,name,referrerPolicy,sizes,src,srcset,useMap,#vspace,#width',
    'input^[HTMLElement]|accept,align,alt,autocapitalize,autocomplete,!autofocus,!checked,!defaultChecked,defaultValue,dirName,!disabled,%files,formAction,formEnctype,formMethod,!formNoValidate,formTarget,#height,!incremental,!indeterminate,max,#maxLength,min,#minLength,!multiple,name,pattern,placeholder,!readOnly,!required,selectionDirection,#selectionEnd,#selectionStart,#size,src,step,type,useMap,value,%valueAsDate,#valueAsNumber,#width',
    'keygen^[HTMLElement]|!autofocus,challenge,!disabled,keytype,name',
    'li^[HTMLElement]|type,#value',
    'label^[HTMLElement]|htmlFor',
    'legend^[HTMLElement]|align',
    'link^[HTMLElement]|as,charset,%crossOrigin,!disabled,href,hreflang,integrity,media,rel,%relList,rev,%sizes,target,type',
    'map^[HTMLElement]|name',
    'marquee^[HTMLElement]|behavior,bgColor,direction,height,#hspace,#loop,#scrollAmount,#scrollDelay,!trueSpeed,#vspace,width',
    'menu^[HTMLElement]|!compact',
    'meta^[HTMLElement]|content,httpEquiv,name,scheme',
    'meter^[HTMLElement]|#high,#low,#max,#min,#optimum,#value',
    'ins,del^[HTMLElement]|cite,dateTime',
    'ol^[HTMLElement]|!compact,!reversed,#start,type',
    'object^[HTMLElement]|align,archive,border,code,codeBase,codeType,data,!declare,height,#hspace,name,standby,type,useMap,#vspace,width',
    'optgroup^[HTMLElement]|!disabled,label',
    'option^[HTMLElement]|!defaultSelected,!disabled,label,!selected,text,value',
    'output^[HTMLElement]|defaultValue,%htmlFor,name,value',
    'p^[HTMLElement]|align',
    'param^[HTMLElement]|name,type,value,valueType',
    'picture^[HTMLElement]|',
    'pre^[HTMLElement]|#width',
    'progress^[HTMLElement]|#max,#value',
    'q,blockquote,cite^[HTMLElement]|',
    'script^[HTMLElement]|!async,charset,%crossOrigin,!defer,event,htmlFor,integrity,src,text,type',
    'select^[HTMLElement]|!autofocus,!disabled,#length,!multiple,name,!required,#selectedIndex,#size,value',
    'shadow^[HTMLElement]|',
    'source^[HTMLElement]|media,sizes,src,srcset,type',
    'span^[HTMLElement]|',
    'style^[HTMLElement]|!disabled,media,type',
    'caption^[HTMLElement]|align',
    'th,td^[HTMLElement]|abbr,align,axis,bgColor,ch,chOff,#colSpan,headers,height,!noWrap,#rowSpan,scope,vAlign,width',
    'col,colgroup^[HTMLElement]|align,ch,chOff,#span,vAlign,width',
    'table^[HTMLElement]|align,bgColor,border,%caption,cellPadding,cellSpacing,frame,rules,summary,%tFoot,%tHead,width',
    'tr^[HTMLElement]|align,bgColor,ch,chOff,vAlign',
    'tfoot,thead,tbody^[HTMLElement]|align,ch,chOff,vAlign',
    'template^[HTMLElement]|',
    'textarea^[HTMLElement]|autocapitalize,!autofocus,#cols,defaultValue,dirName,!disabled,#maxLength,#minLength,name,placeholder,!readOnly,!required,#rows,selectionDirection,#selectionEnd,#selectionStart,value,wrap',
    'title^[HTMLElement]|text',
    'track^[HTMLElement]|!default,kind,label,src,srclang',
    'ul^[HTMLElement]|!compact,type',
    'unknown^[HTMLElement]|',
    'video^media|#height,poster,#width',
    ':svg:a^:svg:graphics|',
    ':svg:animate^:svg:animation|',
    ':svg:animateMotion^:svg:animation|',
    ':svg:animateTransform^:svg:animation|',
    ':svg:circle^:svg:geometry|',
    ':svg:clipPath^:svg:graphics|',
    ':svg:cursor^:svg:|',
    ':svg:defs^:svg:graphics|',
    ':svg:desc^:svg:|',
    ':svg:discard^:svg:|',
    ':svg:ellipse^:svg:geometry|',
    ':svg:feBlend^:svg:|',
    ':svg:feColorMatrix^:svg:|',
    ':svg:feComponentTransfer^:svg:|',
    ':svg:feComposite^:svg:|',
    ':svg:feConvolveMatrix^:svg:|',
    ':svg:feDiffuseLighting^:svg:|',
    ':svg:feDisplacementMap^:svg:|',
    ':svg:feDistantLight^:svg:|',
    ':svg:feDropShadow^:svg:|',
    ':svg:feFlood^:svg:|',
    ':svg:feFuncA^:svg:componentTransferFunction|',
    ':svg:feFuncB^:svg:componentTransferFunction|',
    ':svg:feFuncG^:svg:componentTransferFunction|',
    ':svg:feFuncR^:svg:componentTransferFunction|',
    ':svg:feGaussianBlur^:svg:|',
    ':svg:feImage^:svg:|',
    ':svg:feMerge^:svg:|',
    ':svg:feMergeNode^:svg:|',
    ':svg:feMorphology^:svg:|',
    ':svg:feOffset^:svg:|',
    ':svg:fePointLight^:svg:|',
    ':svg:feSpecularLighting^:svg:|',
    ':svg:feSpotLight^:svg:|',
    ':svg:feTile^:svg:|',
    ':svg:feTurbulence^:svg:|',
    ':svg:filter^:svg:|',
    ':svg:foreignObject^:svg:graphics|',
    ':svg:g^:svg:graphics|',
    ':svg:image^:svg:graphics|',
    ':svg:line^:svg:geometry|',
    ':svg:linearGradient^:svg:gradient|',
    ':svg:mpath^:svg:|',
    ':svg:marker^:svg:|',
    ':svg:mask^:svg:|',
    ':svg:metadata^:svg:|',
    ':svg:path^:svg:geometry|',
    ':svg:pattern^:svg:|',
    ':svg:polygon^:svg:geometry|',
    ':svg:polyline^:svg:geometry|',
    ':svg:radialGradient^:svg:gradient|',
    ':svg:rect^:svg:geometry|',
    ':svg:svg^:svg:graphics|#currentScale,#zoomAndPan',
    ':svg:script^:svg:|type',
    ':svg:set^:svg:animation|',
    ':svg:stop^:svg:|',
    ':svg:style^:svg:|!disabled,media,title,type',
    ':svg:switch^:svg:graphics|',
    ':svg:symbol^:svg:|',
    ':svg:tspan^:svg:textPositioning|',
    ':svg:text^:svg:textPositioning|',
    ':svg:textPath^:svg:textContent|',
    ':svg:title^:svg:|',
    ':svg:use^:svg:graphics|',
    ':svg:view^:svg:|#zoomAndPan',
    'data^[HTMLElement]|value',
    'menuitem^[HTMLElement]|type,label,icon,!disabled,!checked,radiogroup,!default',
    'summary^[HTMLElement]|',
    'time^[HTMLElement]|dateTime',
];
const EVENT = 'event';
const BOOLEAN = 'boolean';
const NUMBER = 'number';
const STRING = 'string';
const OBJECT = 'object';
class SchemaInformation {
    constructor() {
        this.schema = {};
        SCHEMA.forEach(encodedType => {
            const parts = encodedType.split('|');
            const properties = parts[1].split(',');
            const typeParts = (parts[0] + '^').split('^');
            const typeName = typeParts[0];
            const type = {};
            typeName.split(',').forEach(tag => this.schema[tag.toLowerCase()] = type);
            const superName = typeParts[1];
            const superType = superName && this.schema[superName.toLowerCase()];
            if (superType) {
                for (const key in superType) {
                    type[key] = superType[key];
                }
            }
            properties.forEach((property) => {
                if (property == '') {
                }
                else if (property.startsWith('*')) {
                    type[property.substring(1)] = EVENT;
                }
                else if (property.startsWith('!')) {
                    type[property.substring(1)] = BOOLEAN;
                }
                else if (property.startsWith('#')) {
                    type[property.substring(1)] = NUMBER;
                }
                else if (property.startsWith('%')) {
                    type[property.substring(1)] = OBJECT;
                }
                else {
                    type[property] = STRING;
                }
            });
        });
    }
    allKnownElements() { return Object.keys(this.schema); }
    eventsOf(elementName) {
        const elementType = this.schema[elementName.toLowerCase()] || {};
        return Object.keys(elementType).filter(property => elementType[property] === EVENT);
    }
    propertiesOf(elementName) {
        const elementType = this.schema[elementName.toLowerCase()] || {};
        return Object.keys(elementType).filter(property => elementType[property] !== EVENT);
    }
    typeOf(elementName, property) {
        return (this.schema[elementName.toLowerCase()] || {})[property];
    }
    static get instance() {
        let result = SchemaInformation._instance;
        if (!result) {
            result = SchemaInformation._instance = new SchemaInformation();
        }
        return result;
    }
}
function eventNames(elementName) {
    return SchemaInformation.instance.eventsOf(elementName);
}
function propertyNames(elementName) {
    return SchemaInformation.instance.propertiesOf(elementName);
}

class HtmlAstPath extends AstPath$1 {
    constructor(ast, position) {
        super(buildPath(ast, position));
        this.position = position;
    }
}
function buildPath(ast, position) {
    let visitor = new HtmlAstPathBuilder(position);
    visitAll(visitor, ast);
    return visitor.getPath();
}
class ChildVisitor {
    constructor(visitor) {
        this.visitor = visitor;
    }
    visitElement(ast, context) {
        this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.children);
        });
    }
    visitAttribute(ast, context) { }
    visitText(ast, context) { }
    visitComment(ast, context) { }
    visitExpansion(ast, context) {
        return this.visitChildren(context, visit => { visit(ast.cases); });
    }
    visitExpansionCase(ast, context) { }
    visitChildren(context, cb) {
        const visitor = this.visitor || this;
        let results = [];
        function visit(children) {
            if (children)
                results.push(visitAll(visitor, children, context));
        }
        cb(visit);
        return [].concat.apply([], results);
    }
}
class HtmlAstPathBuilder extends ChildVisitor {
    constructor(position) {
        super();
        this.position = position;
        this.path = [];
    }
    visit(ast, context) {
        let span = spanOf(ast);
        if (inSpan(this.position, span)) {
            this.path.push(ast);
        }
        else {
            // Returning a value here will result in the children being skipped.
            return true;
        }
    }
    getPath() { return this.path; }
}

const TEMPLATE_ATTR_PREFIX = '*';
const hiddenHtmlElements = {
    html: true,
    script: true,
    noscript: true,
    base: true,
    body: true,
    title: true,
    head: true,
    link: true,
};
function getTemplateCompletions(templateInfo) {
    let result = undefined;
    let { htmlAst, templateAst, template } = templateInfo;
    // The templateNode starts at the delimiter character so we add 1 to skip it.
    let templatePosition = templateInfo.position - template.span.start;
    let path = new HtmlAstPath(htmlAst, templatePosition);
    let mostSpecific = path.tail;
    if (path.empty) {
        result = elementCompletions(templateInfo, path);
    }
    else {
        let astPosition = templatePosition - mostSpecific.sourceSpan.start.offset;
        mostSpecific.visit({
            visitElement(ast) {
                let startTagSpan = spanOf(ast.sourceSpan);
                let tagLen = ast.name.length;
                if (templatePosition <=
                    startTagSpan.start + tagLen + 1 /* 1 for the opening angle bracked */) {
                    // If we are in the tag then return the element completions.
                    result = elementCompletions(templateInfo, path);
                }
                else if (templatePosition < startTagSpan.end) {
                    // We are in the attribute section of the element (but not in an attribute).
                    // Return the attribute completions.
                    result = attributeCompletions(templateInfo, path);
                }
            },
            visitAttribute(ast) {
                if (!ast.valueSpan || !inSpan(templatePosition, spanOf(ast.valueSpan))) {
                    // We are in the name of an attribute. Show attribute completions.
                    result = attributeCompletions(templateInfo, path);
                }
                else if (ast.valueSpan && inSpan(templatePosition, spanOf(ast.valueSpan))) {
                    result = attributeValueCompletions(templateInfo, templatePosition, ast);
                }
            },
            visitText(ast) {
                // Check if we are in a entity.
                result = entityCompletions(getSourceText(template, spanOf(ast)), astPosition);
                if (result)
                    return result;
                result = interpolationCompletions(templateInfo, templatePosition);
                if (result)
                    return result;
                let element = path.first(Element$1);
                if (element) {
                    let definition = getHtmlTagDefinition(element.name);
                    if (definition.contentType === TagContentType.PARSABLE_DATA) {
                        result = voidElementAttributeCompletions(templateInfo, path);
                        if (!result) {
                            // If the element can hold content Show element completions.
                            result = elementCompletions(templateInfo, path);
                        }
                    }
                }
                else {
                    // If no element container, implies parsable data so show elements.
                    result = voidElementAttributeCompletions(templateInfo, path);
                    if (!result) {
                        result = elementCompletions(templateInfo, path);
                    }
                }
            },
            visitComment(ast) { },
            visitExpansion(ast) { },
            visitExpansionCase(ast) { }
        }, null);
    }
    return result;
}
function attributeCompletions(info, path) {
    let item = path.tail instanceof Element$1 ? path.tail : path.parentOf(path.tail);
    if (item instanceof Element$1) {
        return attributeCompletionsForElement(info, item.name, item);
    }
    return undefined;
}
function attributeCompletionsForElement(info, elementName, element) {
    const attributes = getAttributeInfosForElement(info, elementName, element);
    // Map all the attributes to a completion
    return attributes.map(attr => ({
        kind: attr.fromHtml ? 'html attribute' : 'attribute',
        name: nameOfAttr(attr),
        sort: attr.name
    }));
}
function getAttributeInfosForElement(info, elementName, element) {
    let attributes = [];
    // Add html attributes
    let htmlAttributes = attributeNames(elementName) || [];
    if (htmlAttributes) {
        attributes.push(...htmlAttributes.map(name => ({ name, fromHtml: true })));
    }
    // Add html properties
    let htmlProperties = propertyNames(elementName);
    if (htmlProperties) {
        attributes.push(...htmlProperties.map(name => ({ name, input: true })));
    }
    // Add html events
    let htmlEvents = eventNames(elementName);
    if (htmlEvents) {
        attributes.push(...htmlEvents.map(name => ({ name, output: true })));
    }
    let { selectors, map: selectorMap } = getSelectors(info);
    if (selectors && selectors.length) {
        // All the attributes that are selectable should be shown.
        const applicableSelectors = selectors.filter(selector => !selector.element || selector.element == elementName);
        const selectorAndAttributeNames = applicableSelectors.map(selector => ({ selector, attrs: selector.attrs.filter(a => !!a) }));
        let attrs = flatten(selectorAndAttributeNames.map(selectorAndAttr => {
            const directive = selectorMap.get(selectorAndAttr.selector);
            const result = selectorAndAttr.attrs.map(name => ({ name, input: name in directive.inputs, output: name in directive.outputs }));
            return result;
        }));
        // Add template attribute if a directive contains a template reference
        selectorAndAttributeNames.forEach(selectorAndAttr => {
            const selector = selectorAndAttr.selector;
            const directive = selectorMap.get(selector);
            if (directive && hasTemplateReference(directive.type) && selector.attrs.length &&
                selector.attrs[0]) {
                attrs.push({ name: selector.attrs[0], template: true });
            }
        });
        // All input and output properties of the matching directives should be added.
        let elementSelector = element ?
            createElementCssSelector(element) :
            createElementCssSelector(new Element$1(elementName, [], [], undefined, undefined, undefined));
        let matcher = new SelectorMatcher();
        matcher.addSelectables(selectors);
        matcher.match(elementSelector, selector => {
            let directive = selectorMap.get(selector);
            if (directive) {
                attrs.push(...Object.keys(directive.inputs).map(name => ({ name, input: true })));
                attrs.push(...Object.keys(directive.outputs).map(name => ({ name, output: true })));
            }
        });
        // If a name shows up twice, fold it into a single value.
        attrs = foldAttrs(attrs);
        // Now expand them back out to ensure that input/output shows up as well as input and
        // output.
        attributes.push(...flatten(attrs.map(expandedAttr)));
    }
    return attributes;
}
function attributeValueCompletions(info, position, attr) {
    const path = new TemplateAstPath(info.templateAst, position);
    const mostSpecific = path.tail;
    if (mostSpecific) {
        const visitor = new ExpressionVisitor(info, position, attr, () => getExpressionScope(info, path, false));
        mostSpecific.visit(visitor, null);
        if (!visitor.result || !visitor.result.length) {
            // Try allwoing widening the path
            const widerPath = new TemplateAstPath(info.templateAst, position, /* allowWidening */ true);
            if (widerPath.tail) {
                const widerVisitor = new ExpressionVisitor(info, position, attr, () => getExpressionScope(info, widerPath, false));
                widerPath.tail.visit(widerVisitor, null);
                return widerVisitor.result;
            }
        }
        return visitor.result;
    }
}
function elementCompletions(info, path) {
    let htmlNames = elementNames().filter(name => !(name in hiddenHtmlElements));
    // Collect the elements referenced by the selectors
    let directiveElements = getSelectors(info).selectors.map(selector => selector.element).filter(name => !!name);
    let components = directiveElements.map(name => ({ kind: 'component', name: name, sort: name }));
    let htmlElements = htmlNames.map(name => ({ kind: 'element', name: name, sort: name }));
    // Return components and html elements
    return uniqueByName(htmlElements.concat(components));
}
function entityCompletions(value, position) {
    // Look for entity completions
    const re = /&[A-Za-z]*;?(?!\d)/g;
    let found;
    let result;
    while (found = re.exec(value)) {
        let len = found[0].length;
        if (position >= found.index && position < (found.index + len)) {
            result = Object.keys(NAMED_ENTITIES)
                .map(name => ({ kind: 'entity', name: `&${name};`, sort: name }));
            break;
        }
    }
    return result;
}
function interpolationCompletions(info, position) {
    // Look for an interpolation in at the position.
    const templatePath = new TemplateAstPath(info.templateAst, position);
    const mostSpecific = templatePath.tail;
    if (mostSpecific) {
        let visitor = new ExpressionVisitor(info, position, undefined, () => getExpressionScope(info, templatePath, false));
        mostSpecific.visit(visitor, null);
        return uniqueByName(visitor.result);
    }
}
// There is a special case of HTML where text that contains a unclosed tag is treated as
// text. For exaple '<h1> Some <a text </h1>' produces a text nodes inside of the H1
// element "Some <a text". We, however, want to treat this as if the user was requesting
// the attributes of an "a" element, not requesting completion in the a text element. This
// code checks for this case and returns element completions if it is detected or undefined
// if it is not.
function voidElementAttributeCompletions(info, path) {
    let tail = path.tail;
    if (tail instanceof Text) {
        let match = tail.value.match(/<(\w(\w|\d|-)*:)?(\w(\w|\d|-)*)\s/);
        // The position must be after the match, otherwise we are still in a place where elements
        // are expected (such as `<|a` or `<a|`; we only want attributes for `<a |` or after).
        if (match && path.position >= match.index + match[0].length + tail.sourceSpan.start.offset) {
            return attributeCompletionsForElement(info, match[3]);
        }
    }
}
class ExpressionVisitor extends NullTemplateVisitor {
    constructor(info, position, attr, getExpressionScope) {
        super();
        this.info = info;
        this.position = position;
        this.attr = attr;
        this.getExpressionScope = getExpressionScope;
        if (!getExpressionScope) {
            this.getExpressionScope = () => info.template.members;
        }
    }
    visitDirectiveProperty(ast) {
        this.attributeValueCompletions(ast.value);
    }
    visitElementProperty(ast) {
        this.attributeValueCompletions(ast.value);
    }
    visitEvent(ast) { this.attributeValueCompletions(ast.handler); }
    visitElement(ast) {
        if (this.attr && getSelectors(this.info) && this.attr.name.startsWith(TEMPLATE_ATTR_PREFIX)) {
            // The value is a template expression but the expression AST was not produced when the
            // TemplateAst was produce so
            // do that now.
            const key = this.attr.name.substr(TEMPLATE_ATTR_PREFIX.length);
            // Find the selector
            const selectorInfo = getSelectors(this.info);
            const selectors = selectorInfo.selectors;
            const selector = selectors.filter(s => s.attrs.some((attr, i) => i % 2 == 0 && attr == key))[0];
            const templateBindingResult = this.info.expressionParser.parseTemplateBindings(key, this.attr.value, null);
            // find the template binding that contains the position
            const valueRelativePosition = this.position - this.attr.valueSpan.start.offset - 1;
            const bindings = templateBindingResult.templateBindings;
            const binding = bindings.find(binding => inSpan(valueRelativePosition, binding.span, /* exclusive */ true)) ||
                bindings.find(binding => inSpan(valueRelativePosition, binding.span));
            const keyCompletions = () => {
                let keys = [];
                if (selector) {
                    const attrNames = selector.attrs.filter((_, i) => i % 2 == 0);
                    keys = attrNames.filter(name => name.startsWith(key) && name != key)
                        .map(name => lowerName(name.substr(key.length)));
                }
                keys.push('let');
                this.result = keys.map(key => ({ kind: 'key', name: key, sort: key }));
            };
            if (!binding || (binding.key == key && !binding.expression)) {
                // We are in the root binding. We should return `let` and keys that are left in the
                // selector.
                keyCompletions();
            }
            else if (binding.keyIsVar) {
                const equalLocation = this.attr.value.indexOf('=');
                this.result = [];
                if (equalLocation >= 0 && valueRelativePosition >= equalLocation) {
                    // We are after the '=' in a let clause. The valid values here are the members of the
                    // template reference's type parameter.
                    const directiveMetadata = selectorInfo.map.get(selector);
                    const contextTable = this.info.template.query.getTemplateContext(directiveMetadata.type.reference);
                    if (contextTable) {
                        this.result = this.symbolsToCompletions(contextTable.values());
                    }
                }
                else if (binding.key && valueRelativePosition <= (binding.key.length - key.length)) {
                    keyCompletions();
                }
            }
            else {
                // If the position is in the expression or after the key or there is no key, return the
                // expression completions
                if ((binding.expression && inSpan(valueRelativePosition, binding.expression.ast.span)) ||
                    (binding.key &&
                        valueRelativePosition > binding.span.start + (binding.key.length - key.length)) ||
                    !binding.key) {
                    const span = new ParseSpan(0, this.attr.value.length);
                    this.attributeValueCompletions(binding.expression ? binding.expression.ast :
                        new PropertyRead(span, new ImplicitReceiver(span), ''), valueRelativePosition);
                }
                else {
                    keyCompletions();
                }
            }
        }
    }
    visitBoundText(ast) {
        const expressionPosition = this.position - ast.sourceSpan.start.offset;
        if (inSpan(expressionPosition, ast.value.span)) {
            const completions = getExpressionCompletions(this.getExpressionScope(), ast.value, expressionPosition, this.info.template.query);
            if (completions) {
                this.result = this.symbolsToCompletions(completions);
            }
        }
    }
    attributeValueCompletions(value, position) {
        const symbols = getExpressionCompletions(this.getExpressionScope(), value, position == null ? this.attributeValuePosition : position, this.info.template.query);
        if (symbols) {
            this.result = this.symbolsToCompletions(symbols);
        }
    }
    symbolsToCompletions(symbols) {
        return symbols.filter(s => !s.name.startsWith('__') && s.public)
            .map(symbol => ({ kind: symbol.kind, name: symbol.name, sort: symbol.name }));
    }
    get attributeValuePosition() {
        return this.position - this.attr.valueSpan.start.offset - 1;
    }
}
function getSourceText(template, span) {
    return template.source.substring(span.start, span.end);
}
function nameOfAttr(attr) {
    let name = attr.name;
    if (attr.output) {
        name = removeSuffix(name, 'Events');
        name = removeSuffix(name, 'Changed');
    }
    let result = [name];
    if (attr.input) {
        result.unshift('[');
        result.push(']');
    }
    if (attr.output) {
        result.unshift('(');
        result.push(')');
    }
    if (attr.template) {
        result.unshift('*');
    }
    return result.join('');
}
const templateAttr = /^(\w+:)?(template$|^\*)/;
function createElementCssSelector(element) {
    const cssSelector = new CssSelector();
    let elNameNoNs = splitNsName(element.name)[1];
    cssSelector.setElement(elNameNoNs);
    for (let attr of element.attrs) {
        if (!attr.name.match(templateAttr)) {
            let [_, attrNameNoNs] = splitNsName(attr.name);
            cssSelector.addAttribute(attrNameNoNs, attr.value);
            if (attr.name.toLowerCase() == 'class') {
                const classes = attr.value.split(/s+/g);
                classes.forEach(className => cssSelector.addClassName(className));
            }
        }
    }
    return cssSelector;
}
function foldAttrs(attrs) {
    let inputOutput = new Map();
    let templates = new Map();
    let result = [];
    attrs.forEach(attr => {
        if (attr.fromHtml) {
            return attr;
        }
        if (attr.template) {
            let duplicate = templates.get(attr.name);
            if (!duplicate) {
                result.push({ name: attr.name, template: true });
                templates.set(attr.name, attr);
            }
        }
        if (attr.input || attr.output) {
            let duplicate = inputOutput.get(attr.name);
            if (duplicate) {
                duplicate.input = duplicate.input || attr.input;
                duplicate.output = duplicate.output || attr.output;
            }
            else {
                let cloneAttr = { name: attr.name };
                if (attr.input)
                    cloneAttr.input = true;
                if (attr.output)
                    cloneAttr.output = true;
                result.push(cloneAttr);
                inputOutput.set(attr.name, cloneAttr);
            }
        }
    });
    return result;
}
function expandedAttr(attr) {
    if (attr.input && attr.output) {
        return [
            attr, { name: attr.name, input: true, output: false },
            { name: attr.name, input: false, output: true }
        ];
    }
    return [attr];
}
function lowerName(name) {
    return name && (name[0].toLowerCase() + name.substr(1));
}

function locateSymbol(info) {
    const templatePosition = info.position - info.template.span.start;
    const path = new TemplateAstPath(info.templateAst, templatePosition);
    if (path.tail) {
        let symbol = undefined;
        let span = undefined;
        const attributeValueSymbol = (ast, inEvent = false) => {
            const attribute = findAttribute(info);
            if (attribute) {
                if (inSpan(templatePosition, spanOf(attribute.valueSpan))) {
                    const scope = getExpressionScope(info, path, inEvent);
                    const expressionOffset = attribute.valueSpan.start.offset + 1;
                    const result = getExpressionSymbol(scope, ast, templatePosition - expressionOffset, info.template.query);
                    if (result) {
                        symbol = result.symbol;
                        span = offsetSpan(result.span, expressionOffset);
                    }
                    return true;
                }
            }
            return false;
        };
        path.tail.visit({
            visitNgContent(ast) { },
            visitEmbeddedTemplate(ast) { },
            visitElement(ast) {
                const component = ast.directives.find(d => d.directive.isComponent);
                if (component) {
                    symbol = info.template.query.getTypeSymbol(component.directive.type.reference);
                    symbol = symbol && new OverrideKindSymbol(symbol, 'component');
                    span = spanOf(ast);
                }
                else {
                    // Find a directive that matches the element name
                    const directive = ast.directives.find(d => d.directive.selector.indexOf(ast.name) >= 0);
                    if (directive) {
                        symbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                        symbol = symbol && new OverrideKindSymbol(symbol, 'directive');
                        span = spanOf(ast);
                    }
                }
            },
            visitReference(ast) {
                symbol = info.template.query.getTypeSymbol(tokenReference(ast.value));
                span = spanOf(ast);
            },
            visitVariable(ast) { },
            visitEvent(ast) {
                if (!attributeValueSymbol(ast.handler, /* inEvent */ true)) {
                    symbol = findOutputBinding(info, path, ast);
                    symbol = symbol && new OverrideKindSymbol(symbol, 'event');
                    span = spanOf(ast);
                }
            },
            visitElementProperty(ast) { attributeValueSymbol(ast.value); },
            visitAttr(ast) { },
            visitBoundText(ast) {
                const expressionPosition = templatePosition - ast.sourceSpan.start.offset;
                if (inSpan(expressionPosition, ast.value.span)) {
                    const scope = getExpressionScope(info, path, /* includeEvent */ false);
                    const result = getExpressionSymbol(scope, ast.value, expressionPosition, info.template.query);
                    if (result) {
                        symbol = result.symbol;
                        span = offsetSpan(result.span, ast.sourceSpan.start.offset);
                    }
                }
            },
            visitText(ast) { },
            visitDirective(ast) {
                symbol = info.template.query.getTypeSymbol(ast.directive.type.reference);
                span = spanOf(ast);
            },
            visitDirectiveProperty(ast) {
                if (!attributeValueSymbol(ast.value)) {
                    symbol = findInputBinding(info, path, ast);
                    span = spanOf(ast);
                }
            }
        }, null);
        if (symbol && span) {
            return { symbol, span: offsetSpan(span, info.template.span.start) };
        }
    }
}
function findAttribute(info) {
    const templatePosition = info.position - info.template.span.start;
    const path = new HtmlAstPath(info.htmlAst, templatePosition);
    return path.first(Attribute);
}
function findInputBinding(info, path, binding) {
    const element = path.first(ElementAst);
    if (element) {
        for (const directive of element.directives) {
            const invertedInput = invertMap(directive.directive.inputs);
            const fieldName = invertedInput[binding.templateName];
            if (fieldName) {
                const classSymbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                if (classSymbol) {
                    return classSymbol.members().get(fieldName);
                }
            }
        }
    }
}
function findOutputBinding(info, path, binding) {
    const element = path.first(ElementAst);
    if (element) {
        for (const directive of element.directives) {
            const invertedOutputs = invertMap(directive.directive.outputs);
            const fieldName = invertedOutputs[binding.name];
            if (fieldName) {
                const classSymbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                if (classSymbol) {
                    return classSymbol.members().get(fieldName);
                }
            }
        }
    }
}
function invertMap(obj) {
    const result = {};
    for (const name of Object.keys(obj)) {
        const v = obj[name];
        result[v] = name;
    }
    return result;
}
/**
 * Wrap a symbol and change its kind to component.
 */
class OverrideKindSymbol {
    constructor(sym, kindOverride) {
        this.sym = sym;
        this.kindOverride = kindOverride;
    }
    get name() { return this.sym.name; }
    get kind() { return this.kindOverride; }
    get language() { return this.sym.language; }
    get type() { return this.sym.type; }
    get container() { return this.sym.container; }
    get public() { return this.sym.public; }
    get callable() { return this.sym.callable; }
    get definition() { return this.sym.definition; }
    members() { return this.sym.members(); }
    signatures() { return this.sym.signatures(); }
    selectSignature(types) { return this.sym.selectSignature(types); }
    indexed(argument) { return this.sym.indexed(argument); }
}

function getDefinition(info) {
    const result = locateSymbol(info);
    return result && result.symbol.definition;
}

function getTemplateDiagnostics(fileName, astProvider, templates) {
    const results = [];
    for (const template of templates) {
        const ast = astProvider.getTemplateAst(template, fileName);
        if (ast) {
            if (ast.parseErrors && ast.parseErrors.length) {
                results.push(...ast.parseErrors.map(e => ({
                    kind: DiagnosticKind.Error,
                    span: offsetSpan(spanOf(e.span), template.span.start),
                    message: e.msg
                })));
            }
            else if (ast.templateAst) {
                const expressionDiagnostics = getTemplateExpressionDiagnostics(template, ast);
                results.push(...expressionDiagnostics);
            }
            if (ast.errors) {
                results.push(...ast.errors.map(e => ({ kind: e.kind, span: e.span || template.span, message: e.message })));
            }
        }
    }
    return results;
}
function getDeclarationDiagnostics(declarations, modules) {
    const results = [];
    let directives = undefined;
    for (const declaration of declarations) {
        const report = (message, span) => {
            results.push({
                kind: DiagnosticKind.Error,
                span: span || declaration.declarationSpan, message
            });
        };
        for (const error of declaration.errors) {
            report(error.message, error.span);
        }
        if (declaration.metadata) {
            if (declaration.metadata.isComponent) {
                if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                    report(`Component '${declaration.type.name}' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration`);
                }
                if (declaration.metadata.template.template == null &&
                    !declaration.metadata.template.templateUrl) {
                    report(`Component ${declaration.type.name} must have a template or templateUrl`);
                }
            }
            else {
                if (!directives) {
                    directives = new Set();
                    modules.ngModules.forEach(module => {
                        module.declaredDirectives.forEach(directive => { directives.add(directive.reference); });
                    });
                }
                if (!directives.has(declaration.type)) {
                    report(`Directive '${declaration.type.name}' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration`);
                }
            }
        }
    }
    return results;
}
function getTemplateExpressionDiagnostics(template, astResult) {
    const info = {
        template,
        htmlAst: astResult.htmlAst,
        directive: astResult.directive,
        directives: astResult.directives,
        pipes: astResult.pipes,
        templateAst: astResult.templateAst,
        expressionParser: astResult.expressionParser
    };
    const visitor = new ExpressionDiagnosticsVisitor(info, (path, includeEvent) => getExpressionScope(info, path, includeEvent));
    templateVisitAll(visitor, astResult.templateAst);
    return visitor.diagnostics;
}
class ExpressionDiagnosticsVisitor extends TemplateAstChildVisitor {
    constructor(info, getExpressionScope) {
        super();
        this.info = info;
        this.getExpressionScope = getExpressionScope;
        this.diagnostics = [];
        this.path = new TemplateAstPath([], 0);
    }
    visitDirective(ast, context) {
        // Override the default child visitor to ignore the host properties of a directive.
        if (ast.inputs && ast.inputs.length) {
            templateVisitAll(this, ast.inputs, context);
        }
    }
    visitBoundText(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, ast.sourceSpan.start.offset, false);
        this.pop();
    }
    visitDirectiveProperty(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
        this.pop();
    }
    visitElementProperty(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
        this.pop();
    }
    visitEvent(ast) {
        this.push(ast);
        this.diagnoseExpression(ast.handler, this.attributeValueLocation(ast), true);
        this.pop();
    }
    visitVariable(ast) {
        const directive = this.directiveSummary;
        if (directive && ast.value) {
            const context = this.info.template.query.getTemplateContext(directive.type.reference);
            if (!context.has(ast.value)) {
                if (ast.value === '$implicit') {
                    this.reportError('The template context does not have an implicit value', spanOf(ast.sourceSpan));
                }
                else {
                    this.reportError(`The template context does not defined a member called '${ast.value}'`, spanOf(ast.sourceSpan));
                }
            }
        }
    }
    visitElement(ast, context) {
        this.push(ast);
        super.visitElement(ast, context);
        this.pop();
    }
    visitEmbeddedTemplate(ast, context) {
        const previousDirectiveSummary = this.directiveSummary;
        this.push(ast);
        // Find directive that refernces this template
        this.directiveSummary =
            ast.directives.map(d => d.directive).find(d => hasTemplateReference(d.type));
        // Process children
        super.visitEmbeddedTemplate(ast, context);
        this.pop();
        this.directiveSummary = previousDirectiveSummary;
    }
    attributeValueLocation(ast) {
        const path = new HtmlAstPath(this.info.htmlAst, ast.sourceSpan.start.offset);
        const last = path.tail;
        if (last instanceof Attribute && last.valueSpan) {
            // Add 1 for the quote.
            return last.valueSpan.start.offset + 1;
        }
        return ast.sourceSpan.start.offset;
    }
    diagnoseExpression(ast, offset, includeEvent) {
        const scope = this.getExpressionScope(this.path, includeEvent);
        this.diagnostics.push(...getExpressionDiagnostics(scope, ast, this.info.template.query, {
            event: includeEvent
        }).map(d => ({
            span: offsetSpan(d.ast.span, offset + this.info.template.span.start),
            kind: d.kind,
            message: d.message
        })));
    }
    push(ast) { this.path.push(ast); }
    pop() { this.path.pop(); }
    selectors() {
        let result = this._selectors;
        if (!result) {
            this._selectors = result = getSelectors(this.info);
        }
        return result;
    }
    findElement(position) {
        const htmlPath = new HtmlAstPath(this.info.htmlAst, position);
        if (htmlPath.tail instanceof Element) {
            return htmlPath.tail;
        }
    }
    reportError(message, span) {
        this.diagnostics.push({
            span: offsetSpan(span, this.info.template.span.start),
            kind: DiagnosticKind.Error, message
        });
    }
    reportWarning(message, span) {
        this.diagnostics.push({
            span: offsetSpan(span, this.info.template.span.start),
            kind: DiagnosticKind.Warning, message
        });
    }
}

function getHover(info) {
    const result = locateSymbol(info);
    if (result) {
        return { text: hoverTextOf(result.symbol), span: result.span };
    }
}
function hoverTextOf(symbol) {
    const result = [{ text: symbol.kind }, { text: ' ' }, { text: symbol.name, language: symbol.language }];
    const container = symbol.container;
    if (container) {
        result.push({ text: ' of ' }, { text: container.name, language: container.language });
    }
    return result;
}

/**
 * Create an instance of an Angular `LanguageService`.
 *
 * @experimental
 */
function createLanguageService(host) {
    return new LanguageServiceImpl(host);
}
class LanguageServiceImpl {
    constructor(host) {
        this.host = host;
    }
    get metadataResolver() { return this.host.resolver; }
    getTemplateReferences() { return this.host.getTemplateReferences(); }
    getDiagnostics(fileName) {
        let results = [];
        let templates = this.host.getTemplates(fileName);
        if (templates && templates.length) {
            results.push(...getTemplateDiagnostics(fileName, this, templates));
        }
        let declarations = this.host.getDeclarations(fileName);
        if (declarations && declarations.length) {
            const summary = this.host.getAnalyzedModules();
            results.push(...getDeclarationDiagnostics(declarations, summary));
        }
        return uniqueBySpan(results);
    }
    getPipesAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return templateInfo.pipes.map(pipeInfo => ({ name: pipeInfo.name, symbol: pipeInfo.type.reference }));
        }
    }
    getCompletionsAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getTemplateCompletions(templateInfo);
        }
    }
    getDefinitionAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getDefinition(templateInfo);
        }
    }
    getHoverAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getHover(templateInfo);
        }
    }
    getTemplateAstAtPosition(fileName, position) {
        let template = this.host.getTemplateAt(fileName, position);
        if (template) {
            let astResult = this.getTemplateAst(template, fileName);
            if (astResult && astResult.htmlAst && astResult.templateAst)
                return {
                    position,
                    fileName,
                    template,
                    htmlAst: astResult.htmlAst,
                    directive: astResult.directive,
                    directives: astResult.directives,
                    pipes: astResult.pipes,
                    templateAst: astResult.templateAst,
                    expressionParser: astResult.expressionParser
                };
        }
        return undefined;
    }
    getTemplateAst(template, contextFile) {
        let result;
        try {
            const resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(template.type);
            const metadata = resolvedMetadata && resolvedMetadata.metadata;
            if (metadata) {
                const rawHtmlParser = new HtmlParser();
                const htmlParser = new I18NHtmlParser(rawHtmlParser);
                const expressionParser = new Parser(new Lexer());
                const config = new CompilerConfig();
                const parser = new TemplateParser(config, expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
                const htmlResult = htmlParser.parse(template.source, '');
                const analyzedModules = this.host.getAnalyzedModules();
                let errors = undefined;
                let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
                if (!ngModule) {
                    // Reported by the the declaration diagnostics.
                    ngModule = findSuitableDefaultModule(analyzedModules);
                }
                if (ngModule) {
                    const resolvedDirectives = ngModule.transitiveModule.directives.map(d => this.host.resolver.getNonNormalizedDirectiveMetadata(d.reference));
                    const directives = resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
                    const pipes = ngModule.transitiveModule.pipes.map(p => this.host.resolver.getOrLoadPipeMetadata(p.reference).toSummary());
                    const schemas = ngModule.schemas;
                    const parseResult = parser.tryParseHtml(htmlResult, metadata, template.source, directives, pipes, schemas, '');
                    result = {
                        htmlAst: htmlResult.rootNodes,
                        templateAst: parseResult.templateAst,
                        directive: metadata, directives, pipes,
                        parseErrors: parseResult.errors, expressionParser, errors
                    };
                }
            }
        }
        catch (e) {
            let span = template.span;
            if (e.fileName == contextFile) {
                span = template.query.getSpanAt(e.line, e.column) || span;
            }
            result = { errors: [{ kind: DiagnosticKind.Error, message: e.message, span }] };
        }
        return result;
    }
}
function uniqueBySpan(elements) {
    if (elements) {
        const result = [];
        const map = new Map();
        for (const element of elements) {
            let span = element.span;
            let set = map.get(span.start);
            if (!set) {
                set = new Set();
                map.set(span.start, set);
            }
            if (!set.has(span.end)) {
                set.add(span.end);
                result.push(element);
            }
        }
        return result;
    }
}
function findSuitableDefaultModule(modules) {
    let result;
    let resultSize = 0;
    for (const module of modules.ngModules) {
        const moduleSize = module.transitiveModule.directives.length;
        if (moduleSize > resultSize) {
            result = module;
            resultSize = moduleSize;
        }
    }
    return result;
}

class ReflectorModuleModuleResolutionHost {
    constructor(host) {
        this.host = host;
        if (host.directoryExists)
            this.directoryExists = directoryName => this.host.directoryExists(directoryName);
    }
    fileExists(fileName) { return !!this.host.getScriptSnapshot(fileName); }
    readFile(fileName) {
        let snapshot = this.host.getScriptSnapshot(fileName);
        if (snapshot) {
            return snapshot.getText(0, snapshot.getLength());
        }
    }
}
class ReflectorHost extends CompilerHost {
    constructor(getProgram, serviceHost, options) {
        super(null, options, new ModuleResolutionHostAdapter(new ReflectorModuleModuleResolutionHost(serviceHost)));
        this.getProgram = getProgram;
    }
    get program() { return this.getProgram(); }
    set program(value) {
        // Discard the result set by ancestor constructor
    }
}

// In TypeScript 2.1 these flags moved
// These helpers work for both 2.0 and 2.1.
const isPrivate = ts.ModifierFlags ?
    ((node) => !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private)) :
    ((node) => !!(node.flags & ts.NodeFlags.Private));
const isReferenceType = ts.ObjectFlags ?
    ((type) => !!(type.flags & ts.TypeFlags.Object &&
        type.objectFlags & ts.ObjectFlags.Reference)) :
    ((type) => !!(type.flags & ts.TypeFlags.Reference));
/**
 * Create a `LanguageServiceHost`
 */
function createLanguageServiceFromTypescript(host, service) {
    const ngHost = new TypeScriptServiceHost(host, service);
    const ngServer = createLanguageService(ngHost);
    ngHost.setSite(ngServer);
    return ngServer;
}
/**
 * The language service never needs the normalized versions of the metadata. To avoid parsing
 * the content and resolving references, return an empty file. This also allows normalizing
 * template that are syntatically incorrect which is required to provide completions in
 * syntatically incorrect templates.
 */
class DummyHtmlParser extends HtmlParser {
    constructor() { super(); }
    parse(source, url, parseExpansionForms = false, interpolationConfig = DEFAULT_INTERPOLATION_CONFIG) {
        return new ParseTreeResult([], []);
    }
}
/**
 * Avoid loading resources in the language servcie by using a dummy loader.
 */
class DummyResourceLoader extends ResourceLoader {
    get(url) { return Promise.resolve(''); }
}
/**
 * An implemntation of a `LanguageServiceHost` for a TypeScript project.
 *
 * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
 * the TypeScript language services.
 *
 * @expermental
 */
class TypeScriptServiceHost {
    constructor(host, tsService) {
        this.host = host;
        this.tsService = tsService;
        this._staticSymbolCache = new StaticSymbolCache();
        this._typeCache = [];
        this.modulesOutOfDate = true;
    }
    setSite(service) { this.service = service; }
    /**
     * Angular LanguageServiceHost implementation
     */
    get resolver() {
        this.validate();
        let result = this._resolver;
        if (!result) {
            const moduleResolver = new NgModuleResolver(this.reflector);
            const directiveResolver = new DirectiveResolver(this.reflector);
            const pipeResolver = new PipeResolver(this.reflector);
            const elementSchemaRegistry = new DomElementSchemaRegistry();
            const resourceLoader = new DummyResourceLoader();
            const urlResolver = createOfflineCompileUrlResolver();
            const htmlParser = new DummyHtmlParser();
            // This tracks the CompileConfig in codegen.ts. Currently these options
            // are hard-coded except for genDebugInfo which is not applicable as we
            // never generate code.
            const config = new CompilerConfig({
                genDebugInfo: false,
                defaultEncapsulation: ViewEncapsulation.Emulated,
                logBindingUpdate: false,
                useJit: false
            });
            const directiveNormalizer = new DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
            result = this._resolver = new CompileMetadataResolver(config, moduleResolver, directiveResolver, pipeResolver, new SummaryResolver(), elementSchemaRegistry, directiveNormalizer, this._staticSymbolCache, this.reflector, (error, type) => this.collectError(error, type && type.filePath));
        }
        return result;
    }
    getTemplateReferences() {
        this.ensureTemplateMap();
        return this.templateReferences;
    }
    getTemplateAt(fileName, position) {
        let sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            this.context = sourceFile.fileName;
            let node = this.findNode(sourceFile, position);
            if (node) {
                return this.getSourceFromNode(fileName, this.host.getScriptVersion(sourceFile.fileName), node);
            }
        }
        else {
            this.ensureTemplateMap();
            // TODO: Cannocalize the file?
            const componentType = this.fileToComponent.get(fileName);
            if (componentType) {
                return this.getSourceFromType(fileName, this.host.getScriptVersion(fileName), componentType);
            }
        }
    }
    getAnalyzedModules() {
        this.validate();
        return this.ensureAnalyzedModules();
    }
    ensureAnalyzedModules() {
        let analyzedModules = this.analyzedModules;
        if (!analyzedModules) {
            const analyzeHost = { isSourceFile(filePath) { return true; } };
            const programSymbols = extractProgramSymbols(this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), analyzeHost);
            analyzedModules = this.analyzedModules =
                analyzeNgModules(programSymbols, analyzeHost, this.resolver);
        }
        return analyzedModules;
    }
    getTemplates(fileName) {
        this.ensureTemplateMap();
        const componentType = this.fileToComponent.get(fileName);
        if (componentType) {
            const templateSource = this.getTemplateAt(fileName, 0);
            if (templateSource) {
                return [templateSource];
            }
        }
        else {
            let version = this.host.getScriptVersion(fileName);
            let result = [];
            // Find each template string in the file
            let visit = (child) => {
                let templateSource = this.getSourceFromNode(fileName, version, child);
                if (templateSource) {
                    result.push(templateSource);
                }
                else {
                    ts.forEachChild(child, visit);
                }
            };
            let sourceFile = this.getSourceFile(fileName);
            if (sourceFile) {
                this.context = sourceFile.path;
                ts.forEachChild(sourceFile, visit);
            }
            return result.length ? result : undefined;
        }
    }
    getDeclarations(fileName) {
        const result = [];
        const sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            let visit = (child) => {
                let declaration = this.getDeclarationFromNode(sourceFile, child);
                if (declaration) {
                    result.push(declaration);
                }
                else {
                    ts.forEachChild(child, visit);
                }
            };
            ts.forEachChild(sourceFile, visit);
        }
        return result;
    }
    getSourceFile(fileName) {
        return this.tsService.getProgram().getSourceFile(fileName);
    }
    updateAnalyzedModules() {
        this.validate();
        if (this.modulesOutOfDate) {
            this.analyzedModules = null;
            this._reflector = null;
            this._staticSymbolResolver = null;
            this.templateReferences = null;
            this.fileToComponent = null;
            this.ensureAnalyzedModules();
            this.modulesOutOfDate = false;
        }
    }
    get program() { return this.tsService.getProgram(); }
    get checker() {
        let checker = this._checker;
        if (!checker) {
            checker = this._checker = this.program.getTypeChecker();
        }
        return checker;
    }
    validate() {
        const program = this.program;
        if (this.lastProgram != program) {
            this.clearCaches();
            this.lastProgram = program;
        }
    }
    clearCaches() {
        this._checker = null;
        this._typeCache = [];
        this._resolver = null;
        this.collectedErrors = null;
        this.modulesOutOfDate = true;
    }
    ensureTemplateMap() {
        if (!this.fileToComponent || !this.templateReferences) {
            const fileToComponent = new Map();
            const templateReference = [];
            const ngModuleSummary = this.getAnalyzedModules();
            const urlResolver = createOfflineCompileUrlResolver();
            for (const module of ngModuleSummary.ngModules) {
                for (const directive of module.declaredDirectives) {
                    const { metadata, annotation } = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference);
                    if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                        const templateName = urlResolver.resolve(componentModuleUrl(this.reflector, directive.reference, annotation), metadata.template.templateUrl);
                        fileToComponent.set(templateName, directive.reference);
                        templateReference.push(templateName);
                    }
                }
            }
            this.fileToComponent = fileToComponent;
            this.templateReferences = templateReference;
        }
    }
    getSourceFromDeclaration(fileName, version, source, span, type, declaration, node, sourceFile) {
        let queryCache = undefined;
        const t = this;
        if (declaration) {
            return {
                version,
                source,
                span,
                type,
                get members() {
                    const checker = t.checker;
                    const program = t.program;
                    const type = checker.getTypeAtLocation(declaration);
                    return new TypeWrapper(type, { node, program, checker }).members();
                },
                get query() {
                    if (!queryCache) {
                        queryCache = new TypeScriptSymbolQuery(t.program, t.checker, sourceFile, () => {
                            const pipes = t.service.getPipesAt(fileName, node.getStart());
                            const checker = t.checker;
                            const program = t.program;
                            return new PipesTable(pipes, { node, program, checker });
                        });
                    }
                    return queryCache;
                }
            };
        }
    }
    getSourceFromNode(fileName, version, node) {
        let result = undefined;
        const t = this;
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.StringLiteral:
                let [declaration, decorator] = this.getTemplateClassDeclFromNode(node);
                let queryCache = undefined;
                if (declaration && declaration.name) {
                    const sourceFile = this.getSourceFile(fileName);
                    return this.getSourceFromDeclaration(fileName, version, this.stringOf(node), shrink(spanOf$1(node)), this.reflector.getStaticSymbol(sourceFile.fileName, declaration.name.text), declaration, node, sourceFile);
                }
                break;
        }
        return result;
    }
    getSourceFromType(fileName, version, type) {
        let result = undefined;
        const declaration = this.getTemplateClassFromStaticSymbol(type);
        if (declaration) {
            const snapshot = this.host.getScriptSnapshot(fileName);
            const source = snapshot.getText(0, snapshot.getLength());
            result = this.getSourceFromDeclaration(fileName, version, source, { start: 0, end: source.length }, type, declaration, declaration, declaration.getSourceFile());
        }
        return result;
    }
    get reflectorHost() {
        let result = this._reflectorHost;
        if (!result) {
            if (!this.context) {
                // Make up a context by finding the first script and using that as the base dir.
                this.context = this.host.getScriptFileNames()[0];
            }
            // Use the file context's directory as the base directory.
            // The host's getCurrentDirectory() is not reliable as it is always "" in
            // tsserver. We don't need the exact base directory, just one that contains
            // a source file.
            const source = this.tsService.getProgram().getSourceFile(this.context);
            if (!source) {
                throw new Error('Internal error: no context could be determined');
            }
            const tsConfigPath = findTsConfig(source.fileName);
            const basePath = path.dirname(tsConfigPath || this.context);
            result = this._reflectorHost = new ReflectorHost(() => this.tsService.getProgram(), this.host, { basePath, genDir: basePath });
        }
        return result;
    }
    collectError(error, filePath) {
        let errorMap = this.collectedErrors;
        if (!errorMap) {
            errorMap = this.collectedErrors = new Map();
        }
        let errors = errorMap.get(filePath);
        if (!errors) {
            errors = [];
            this.collectedErrors.set(filePath, errors);
        }
        errors.push(error);
    }
    get staticSymbolResolver() {
        let result = this._staticSymbolResolver;
        if (!result) {
            const summaryResolver = new AotSummaryResolver({
                loadSummary(filePath) { return null; },
                isSourceFile(sourceFilePath) { return true; },
                getOutputFileName(sourceFilePath) { return null; }
            }, this._staticSymbolCache);
            result = this._staticSymbolResolver = new StaticSymbolResolver(this.reflectorHost, this._staticSymbolCache, summaryResolver, (e, filePath) => this.collectError(e, filePath));
        }
        return result;
    }
    get reflector() {
        let result = this._reflector;
        if (!result) {
            result = this._reflector = new StaticReflector(this.staticSymbolResolver, [], [], (e, filePath) => this.collectError(e, filePath));
        }
        return result;
    }
    getTemplateClassFromStaticSymbol(type) {
        const source = this.getSourceFile(type.filePath);
        if (source) {
            const declarationNode = ts.forEachChild(source, child => {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDeclaration = child;
                    if (classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
            return declarationNode;
        }
        return undefined;
    }
    /**
     * Given a template string node, see if it is an Angular template string, and if so return the
     * containing class.
     */
    getTemplateClassDeclFromNode(currentToken) {
        // Verify we are in a 'template' property assignment, in an object literal, which is an call
        // arg, in a decorator
        let parentNode = currentToken.parent; // PropertyAssignment
        if (!parentNode) {
            return TypeScriptServiceHost.missingTemplate;
        }
        if (parentNode.kind !== ts.SyntaxKind.PropertyAssignment) {
            return TypeScriptServiceHost.missingTemplate;
        }
        else {
            // TODO: Is this different for a literal, i.e. a quoted property name like "template"?
            if (parentNode.name.text !== 'template') {
                return TypeScriptServiceHost.missingTemplate;
            }
        }
        parentNode = parentNode.parent; // ObjectLiteralExpression
        if (!parentNode || parentNode.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
            return TypeScriptServiceHost.missingTemplate;
        }
        parentNode = parentNode.parent; // CallExpression
        if (!parentNode || parentNode.kind !== ts.SyntaxKind.CallExpression) {
            return TypeScriptServiceHost.missingTemplate;
        }
        const callTarget = parentNode.expression;
        let decorator = parentNode.parent; // Decorator
        if (!decorator || decorator.kind !== ts.SyntaxKind.Decorator) {
            return TypeScriptServiceHost.missingTemplate;
        }
        let declaration = decorator.parent; // ClassDeclaration
        if (!declaration || declaration.kind !== ts.SyntaxKind.ClassDeclaration) {
            return TypeScriptServiceHost.missingTemplate;
        }
        return [declaration, callTarget];
    }
    getCollectedErrors(defaultSpan, sourceFile) {
        const errors = (this.collectedErrors && this.collectedErrors.get(sourceFile.fileName));
        return (errors && errors.map((e) => {
            return { message: e.message, span: spanAt(sourceFile, e.line, e.column) || defaultSpan };
        })) ||
            [];
    }
    getDeclarationFromNode(sourceFile, node) {
        if (node.kind == ts.SyntaxKind.ClassDeclaration && node.decorators &&
            node.name) {
            for (const decorator of node.decorators) {
                if (decorator.expression && decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                    const classDeclaration = node;
                    if (classDeclaration.name) {
                        const call = decorator.expression;
                        const target = call.expression;
                        const type = this.checker.getTypeAtLocation(target);
                        if (type) {
                            const staticSymbol = this._reflector.getStaticSymbol(sourceFile.fileName, classDeclaration.name.text);
                            try {
                                if (this.resolver.isDirective(staticSymbol)) {
                                    const { metadata } = this.resolver.getNonNormalizedDirectiveMetadata(staticSymbol);
                                    const declarationSpan = spanOf$1(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan,
                                        metadata,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                            catch (e) {
                                if (e.message) {
                                    this.collectError(e, sourceFile.fileName);
                                    const declarationSpan = spanOf$1(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    stringOf(node) {
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return node.text;
            case ts.SyntaxKind.StringLiteral:
                return node.text;
        }
    }
    findNode(sourceFile, position) {
        let _this = this;
        function find(node) {
            if (position >= node.getStart() && position < node.getEnd()) {
                return ts.forEachChild(node, find) || node;
            }
        }
        return find(sourceFile);
    }
    findLiteralType(kind, context) {
        const checker = this.checker;
        let type;
        switch (kind) {
            case BuiltinType.Any:
                type = checker.getTypeAtLocation({
                    kind: ts.SyntaxKind.AsExpression,
                    expression: { kind: ts.SyntaxKind.TrueKeyword },
                    type: { kind: ts.SyntaxKind.AnyKeyword }
                });
                break;
            case BuiltinType.Boolean:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.TrueKeyword });
                break;
            case BuiltinType.Null:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.NullKeyword });
                break;
            case BuiltinType.Number:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.NumericLiteral });
                break;
            case BuiltinType.String:
                type =
                    checker.getTypeAtLocation({ kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral });
                break;
            case BuiltinType.Undefined:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.VoidExpression });
                break;
            default:
                throw new Error(`Internal error, unhandled literal kind ${kind}:${BuiltinType[kind]}`);
        }
        return new TypeWrapper(type, context);
    }
}
TypeScriptServiceHost.missingTemplate = [];
class TypeScriptSymbolQuery {
    constructor(program, checker, source, fetchPipes) {
        this.program = program;
        this.checker = checker;
        this.source = source;
        this.fetchPipes = fetchPipes;
        this.typeCache = new Map();
    }
    getTypeKind(symbol) { return typeKindOf(this.getTsTypeOf(symbol)); }
    getBuiltinType(kind) {
        // TODO: Replace with typeChecker API when available.
        let result = this.typeCache.get(kind);
        if (!result) {
            const type = getBuiltinTypeFromTs(kind, { checker: this.checker, node: this.source, program: this.program });
            result =
                new TypeWrapper(type, { program: this.program, checker: this.checker, node: this.source });
            this.typeCache.set(kind, result);
        }
        return result;
    }
    getTypeUnion(...types) {
        // TODO: Replace with typeChecker API when available
        const checker = this.checker;
        // No API exists so the cheat is to just return the last type any if no types are given.
        return types.length ? types[types.length - 1] : this.getBuiltinType(BuiltinType.Any);
    }
    getArrayType(type) {
        // TODO: Replace with typeChecker API when available
        return this.getBuiltinType(BuiltinType.Any);
    }
    getElementType(type) {
        if (type instanceof TypeWrapper) {
            const elementType = getTypeParameterOf(type.tsType, 'Array');
            if (elementType) {
                return new TypeWrapper(elementType, type.context);
            }
        }
    }
    getNonNullableType(symbol) {
        // TODO: Replace with typeChecker API when available;
        return symbol;
    }
    getPipes() {
        let result = this.pipesCache;
        if (!result) {
            result = this.pipesCache = this.fetchPipes();
        }
        return result;
    }
    getTemplateContext(type) {
        const context = { node: this.source, program: this.program, checker: this.checker };
        const typeSymbol = findClassSymbolInContext(type, context);
        if (typeSymbol) {
            const contextType = this.getTemplateRefContextType(typeSymbol);
            if (contextType)
                return new SymbolWrapper(contextType, context).members();
        }
    }
    getTypeSymbol(type) {
        const context = { node: this.source, program: this.program, checker: this.checker };
        const typeSymbol = findClassSymbolInContext(type, context);
        return new SymbolWrapper(typeSymbol, context);
    }
    createSymbolTable(symbols) {
        const result = new MapSymbolTable();
        result.addAll(symbols.map(s => new DeclaredSymbol(s)));
        return result;
    }
    mergeSymbolTable(symbolTables) {
        const result = new MapSymbolTable();
        for (const symbolTable of symbolTables) {
            result.addAll(symbolTable.values());
        }
        return result;
    }
    getSpanAt(line, column) { return spanAt(this.source, line, column); }
    getTemplateRefContextType(type) {
        const constructor = type.members['__constructor'];
        if (constructor) {
            const constructorDeclaration = constructor.declarations[0];
            for (const parameter of constructorDeclaration.parameters) {
                const type = this.checker.getTypeAtLocation(parameter.type);
                if (type.symbol.name == 'TemplateRef' && isReferenceType(type)) {
                    const typeReference = type;
                    if (typeReference.typeArguments.length === 1) {
                        return typeReference.typeArguments[0].symbol;
                    }
                }
            }
            ;
        }
    }
    getTsTypeOf(symbol) {
        const type = this.getTypeWrapper(symbol);
        return type && type.tsType;
    }
    getTypeWrapper(symbol) {
        let type = undefined;
        if (symbol instanceof TypeWrapper) {
            type = symbol;
        }
        else if (symbol.type instanceof TypeWrapper) {
            type = symbol.type;
        }
        return type;
    }
}
function typeCallable(type) {
    const signatures = type.getCallSignatures();
    return signatures && signatures.length != 0;
}
function signaturesOf(type, context) {
    return type.getCallSignatures().map(s => new SignatureWrapper(s, context));
}
function selectSignature(type, context, types) {
    // TODO: Do a better job of selecting the right signature.
    const signatures = type.getCallSignatures();
    return signatures.length ? new SignatureWrapper(signatures[0], context) : undefined;
}
function toSymbolTable(symbols) {
    const result = {};
    for (const symbol of symbols) {
        result[symbol.name] = symbol;
    }
    return result;
}
function toSymbols(symbolTable, filter) {
    const result = [];
    const own = typeof symbolTable.hasOwnProperty === 'function' ?
        (name) => symbolTable.hasOwnProperty(name) :
        (name) => !!symbolTable[name];
    for (const name in symbolTable) {
        if (own(name) && (!filter || filter(symbolTable[name]))) {
            result.push(symbolTable[name]);
        }
    }
    return result;
}
class TypeWrapper {
    constructor(tsType, context) {
        this.tsType = tsType;
        this.context = context;
        if (!tsType) {
            throw Error('Internal: null type');
        }
    }
    get name() {
        const symbol = this.tsType.symbol;
        return (symbol && symbol.name) || '<anonymous>';
    }
    get kind() { return 'type'; }
    get language() { return 'typescript'; }
    get type() { return undefined; }
    get container() { return undefined; }
    get public() { return true; }
    get callable() { return typeCallable(this.tsType); }
    get definition() { return definitionFromTsSymbol(this.tsType.getSymbol()); }
    members() {
        return new SymbolTableWrapper(this.tsType.getProperties(), this.context);
    }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        return selectSignature(this.tsType, this.context, types);
    }
    indexed(argument) { return undefined; }
}
class SymbolWrapper {
    constructor(symbol, context) {
        this.symbol = symbol;
        this.context = context;
    }
    get name() { return this.symbol.name; }
    get kind() { return this.callable ? 'method' : 'property'; }
    get language() { return 'typescript'; }
    get type() { return new TypeWrapper(this.tsType, this.context); }
    get container() { return getContainerOf(this.symbol, this.context); }
    get public() {
        // Symbols that are not explicitly made private are public.
        return !isSymbolPrivate(this.symbol);
    }
    get callable() { return typeCallable(this.tsType); }
    get definition() { return definitionFromTsSymbol(this.symbol); }
    members() { return new SymbolTableWrapper(this.symbol.members, this.context); }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        return selectSignature(this.tsType, this.context, types);
    }
    indexed(argument) { return undefined; }
    get tsType() {
        let type = this._tsType;
        if (!type) {
            type = this._tsType =
                this.context.checker.getTypeOfSymbolAtLocation(this.symbol, this.context.node);
        }
        return type;
    }
}
class DeclaredSymbol {
    constructor(declaration) {
        this.declaration = declaration;
    }
    get name() { return this.declaration.name; }
    get kind() { return this.declaration.kind; }
    get language() { return 'ng-template'; }
    get container() { return undefined; }
    get type() { return this.declaration.type; }
    get callable() { return this.declaration.type.callable; }
    get public() { return true; }
    get definition() { return this.declaration.definition; }
    members() { return this.declaration.type.members(); }
    signatures() { return this.declaration.type.signatures(); }
    selectSignature(types) {
        return this.declaration.type.selectSignature(types);
    }
    indexed(argument) { return undefined; }
}
class SignatureWrapper {
    constructor(signature, context) {
        this.signature = signature;
        this.context = context;
    }
    get arguments() {
        return new SymbolTableWrapper(this.signature.getParameters(), this.context);
    }
    get result() { return new TypeWrapper(this.signature.getReturnType(), this.context); }
}
class SignatureResultOverride {
    constructor(signature, resultType) {
        this.signature = signature;
        this.resultType = resultType;
    }
    get arguments() { return this.signature.arguments; }
    get result() { return this.resultType; }
}
class SymbolTableWrapper {
    constructor(symbols, context, filter) {
        this.context = context;
        if (Array.isArray(symbols)) {
            this.symbols = filter ? symbols.filter(filter) : symbols;
            this.symbolTable = toSymbolTable(symbols);
        }
        else {
            this.symbols = toSymbols(symbols, filter);
            this.symbolTable = filter ? toSymbolTable(this.symbols) : symbols;
        }
    }
    get size() { return this.symbols.length; }
    get(key) {
        const symbol = this.symbolTable[key];
        return symbol ? new SymbolWrapper(symbol, this.context) : undefined;
    }
    has(key) { return this.symbolTable[key] != null; }
    values() { return this.symbols.map(s => new SymbolWrapper(s, this.context)); }
}
class MapSymbolTable {
    constructor() {
        this.map = new Map();
        this._values = [];
    }
    get size() { return this.map.size; }
    get(key) { return this.map.get(key); }
    add(symbol) {
        if (this.map.has(symbol.name)) {
            const previous = this.map.get(symbol.name);
            this._values[this._values.indexOf(previous)] = symbol;
        }
        this.map.set(symbol.name, symbol);
        this._values.push(symbol);
    }
    addAll(symbols) {
        for (const symbol of symbols) {
            this.add(symbol);
        }
    }
    has(key) { return this.map.has(key); }
    values() {
        // Switch to this.map.values once iterables are supported by the target language.
        return this._values;
    }
}
class PipesTable {
    constructor(pipes, context) {
        this.pipes = pipes;
        this.context = context;
    }
    get size() { return this.pipes.length; }
    get(key) {
        const pipe = this.pipes.find(pipe => pipe.name == key);
        if (pipe) {
            return new PipeSymbol(pipe, this.context);
        }
    }
    has(key) { return this.pipes.find(pipe => pipe.name == key) != null; }
    values() { return this.pipes.map(pipe => new PipeSymbol(pipe, this.context)); }
}
class PipeSymbol {
    constructor(pipe, context) {
        this.pipe = pipe;
        this.context = context;
    }
    get name() { return this.pipe.name; }
    get kind() { return 'pipe'; }
    get language() { return 'typescript'; }
    get type() { return new TypeWrapper(this.tsType, this.context); }
    get container() { return undefined; }
    get callable() { return true; }
    get public() { return true; }
    get definition() { return definitionFromTsSymbol(this.tsType.getSymbol()); }
    members() { return EmptyTable.instance; }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        let signature = selectSignature(this.tsType, this.context, types);
        if (types.length == 1) {
            const parameterType = types[0];
            if (parameterType instanceof TypeWrapper) {
                let resultType = undefined;
                switch (this.name) {
                    case 'async':
                        switch (parameterType.name) {
                            case 'Observable':
                            case 'Promise':
                            case 'EventEmitter':
                                resultType = getTypeParameterOf(parameterType.tsType, parameterType.name);
                                break;
                        }
                        break;
                    case 'slice':
                        resultType = getTypeParameterOf(parameterType.tsType, 'Array');
                        break;
                }
                if (resultType) {
                    signature = new SignatureResultOverride(signature, new TypeWrapper(resultType, parameterType.context));
                }
            }
        }
        return signature;
    }
    indexed(argument) { return undefined; }
    get tsType() {
        let type = this._tsType;
        if (!type) {
            const classSymbol = this.findClassSymbol(this.pipe.symbol);
            if (classSymbol) {
                type = this._tsType = this.findTransformMethodType(classSymbol);
            }
            if (!type) {
                type = this._tsType = getBuiltinTypeFromTs(BuiltinType.Any, this.context);
            }
        }
        return type;
    }
    findClassSymbol(type) {
        return findClassSymbolInContext(type, this.context);
    }
    findTransformMethodType(classSymbol) {
        const transform = classSymbol.members['transform'];
        if (transform) {
            return this.context.checker.getTypeOfSymbolAtLocation(transform, this.context.node);
        }
    }
}
function findClassSymbolInContext(type, context) {
    const sourceFile = context.program.getSourceFile(type.filePath);
    if (sourceFile) {
        const moduleSymbol = sourceFile.module || sourceFile.symbol;
        const exports = context.checker.getExportsOfModule(moduleSymbol);
        return (exports || []).find(symbol => symbol.name == type.name);
    }
}
class EmptyTable {
    get size() { return 0; }
    get(key) { return undefined; }
    has(key) { return false; }
    values() { return []; }
}
EmptyTable.instance = new EmptyTable();
function findTsConfig(fileName) {
    let dir = path.dirname(fileName);
    while (fs.existsSync(dir)) {
        const candidate = path.join(dir, 'tsconfig.json');
        if (fs.existsSync(candidate))
            return candidate;
        dir = path.dirname(dir);
    }
}
function isSymbolPrivate(s) {
    return s.valueDeclaration && isPrivate(s.valueDeclaration);
}
function getBuiltinTypeFromTs(kind, context) {
    let type;
    const checker = context.checker;
    const node = context.node;
    switch (kind) {
        case BuiltinType.Any:
            type = checker.getTypeAtLocation(setParents({
                kind: ts.SyntaxKind.AsExpression,
                expression: { kind: ts.SyntaxKind.TrueKeyword },
                type: { kind: ts.SyntaxKind.AnyKeyword }
            }, node));
            break;
        case BuiltinType.Boolean:
            type =
                checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.TrueKeyword }, node));
            break;
        case BuiltinType.Null:
            type =
                checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NullKeyword }, node));
            break;
        case BuiltinType.Number:
            const numeric = { kind: ts.SyntaxKind.NumericLiteral };
            setParents({ kind: ts.SyntaxKind.ExpressionStatement, expression: numeric }, node);
            type = checker.getTypeAtLocation(numeric);
            break;
        case BuiltinType.String:
            type = checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral }, node));
            break;
        case BuiltinType.Undefined:
            type = checker.getTypeAtLocation(setParents({
                kind: ts.SyntaxKind.VoidExpression,
                expression: { kind: ts.SyntaxKind.NumericLiteral }
            }, node));
            break;
        default:
            throw new Error(`Internal error, unhandled literal kind ${kind}:${BuiltinType[kind]}`);
    }
    return type;
}
function setParents(node, parent) {
    node.parent = parent;
    ts.forEachChild(node, child => setParents(child, node));
    return node;
}
function spanOf$1(node) {
    return { start: node.getStart(), end: node.getEnd() };
}
function shrink(span, offset) {
    if (offset == null)
        offset = 1;
    return { start: span.start + offset, end: span.end - offset };
}
function spanAt(sourceFile, line, column) {
    if (line != null && column != null) {
        const position = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
        const findChild = function findChild(node) {
            if (node.kind > ts.SyntaxKind.LastToken && node.pos <= position && node.end > position) {
                const betterNode = ts.forEachChild(node, findChild);
                return betterNode || node;
            }
        };
        const node = ts.forEachChild(sourceFile, findChild);
        if (node) {
            return { start: node.getStart(), end: node.getEnd() };
        }
    }
}
function definitionFromTsSymbol(symbol) {
    const declarations = symbol.declarations;
    if (declarations) {
        return declarations.map(declaration => {
            const sourceFile = declaration.getSourceFile();
            return {
                fileName: sourceFile.fileName,
                span: { start: declaration.getStart(), end: declaration.getEnd() }
            };
        });
    }
}
function parentDeclarationOf(node) {
    while (node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
                return node;
            case ts.SyntaxKind.SourceFile:
                return null;
        }
        node = node.parent;
    }
}
function getContainerOf(symbol, context) {
    if (symbol.getFlags() & ts.SymbolFlags.ClassMember && symbol.declarations) {
        for (const declaration of symbol.declarations) {
            const parent = parentDeclarationOf(declaration);
            if (parent) {
                const type = context.checker.getTypeAtLocation(parent);
                if (type) {
                    return new TypeWrapper(type, context);
                }
            }
        }
    }
}
function getTypeParameterOf(type, name) {
    if (type && type.symbol && type.symbol.name == name) {
        const typeArguments = type.typeArguments;
        if (typeArguments && typeArguments.length <= 1) {
            return typeArguments[0];
        }
    }
}
function typeKindOf(type) {
    if (type) {
        if (type.flags & ts.TypeFlags.Any) {
            return BuiltinType.Any;
        }
        else if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral)) {
            return BuiltinType.String;
        }
        else if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike)) {
            return BuiltinType.Number;
        }
        else if (type.flags & (ts.TypeFlags.Undefined)) {
            return BuiltinType.Undefined;
        }
        else if (type.flags & (ts.TypeFlags.Null)) {
            return BuiltinType.Null;
        }
        else if (type.flags & ts.TypeFlags.Union) {
            // If all the constituent types of a union are the same kind, it is also that kind.
            let candidate;
            const unionType = type;
            if (unionType.types.length > 0) {
                candidate = typeKindOf(unionType.types[0]);
                for (const subType of unionType.types) {
                    if (candidate != typeKindOf(subType)) {
                        return BuiltinType.Other;
                    }
                }
            }
            return candidate;
        }
        else if (type.flags & ts.TypeFlags.TypeParameter) {
            return BuiltinType.Unbound;
        }
    }
    return BuiltinType.Other;
}

function create(info /* ts.server.PluginCreateInfo */) {
    // Create the proxy
    const proxy = Object.create(null);
    const oldLS = info.languageService;
    for (const k in oldLS) {
        proxy[k] = function () { return oldLS[k].apply(oldLS, arguments); };
    }
    function completionToEntry(c) {
        return { kind: c.kind, name: c.name, sortText: c.sort, kindModifiers: '' };
    }
    function diagnosticToDiagnostic(d, file) {
        return {
            file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: d.message,
            category: ts.DiagnosticCategory.Error,
            code: 0
        };
    }
    function tryOperation(attempting, callback) {
        try {
            callback();
        }
        catch (e) {
            info.project.projectService.logger.info(`Failed to ${attempting}: ${e.toString()}`);
            info.project.projectService.logger.info(`Stack trace: ${e.stack}`);
        }
    }
    const serviceHost = new TypeScriptServiceHost(info.languageServiceHost, info.languageService);
    const ls = createLanguageService(serviceHost);
    serviceHost.setSite(ls);
    proxy.getCompletionsAtPosition = function (fileName, position) {
        let base = oldLS.getCompletionsAtPosition(fileName, position);
        tryOperation('get completions', () => {
            const results = ls.getCompletionsAt(fileName, position);
            if (results && results.length) {
                if (base === undefined) {
                    base = {
                        isGlobalCompletion: false,
                        isMemberCompletion: false,
                        isNewIdentifierLocation: false,
                        entries: []
                    };
                }
                for (const entry of results) {
                    base.entries.push(completionToEntry(entry));
                }
            }
        });
        return base;
    };
    proxy.getQuickInfoAtPosition = function (fileName, position) {
        let base = oldLS.getQuickInfoAtPosition(fileName, position);
        tryOperation('get quick info', () => {
            const ours = ls.getHoverAt(fileName, position);
            if (ours) {
                const displayParts = [];
                for (const part of ours.text) {
                    displayParts.push({ kind: part.language, text: part.text });
                }
                base = {
                    displayParts,
                    documentation: [],
                    kind: 'angular',
                    kindModifiers: 'what does this do?',
                    textSpan: { start: ours.span.start, length: ours.span.end - ours.span.start },
                    tags: [],
                };
            }
        });
        return base;
    };
    proxy.getSemanticDiagnostics = function (fileName) {
        let base = oldLS.getSemanticDiagnostics(fileName);
        if (base === undefined) {
            base = [];
        }
        tryOperation('get diagnostics', () => {
            info.project.projectService.logger.info(`Computing Angular semantic diagnostics...`);
            const ours = ls.getDiagnostics(fileName);
            if (ours && ours.length) {
                const file = oldLS.getProgram().getSourceFile(fileName);
                base.push.apply(base, ours.map(d => diagnosticToDiagnostic(d, file)));
            }
        });
        return base;
    };
    proxy.getDefinitionAtPosition = function (fileName, position) {
        let base = oldLS.getDefinitionAtPosition(fileName, position);
        if (base && base.length) {
            return base;
        }
        tryOperation('get definition', () => {
            const ours = ls.getDefinitionAt(fileName, position);
            if (ours && ours.length) {
                base = base || [];
                for (const loc of ours) {
                    base.push({
                        fileName: loc.fileName,
                        textSpan: { start: loc.span.start, length: loc.span.end - loc.span.start },
                        name: '',
                        kind: 'definition',
                        containerName: loc.fileName,
                        containerKind: 'file'
                    });
                }
            }
        });
        return base;
    };
    return proxy;
}

/**
 * @stable
 */
const VERSION = new Version('4.0.0-beta.8-88bc143');

export { createLanguageService, create, TypeScriptServiceHost, createLanguageServiceFromTypescript, VERSION };