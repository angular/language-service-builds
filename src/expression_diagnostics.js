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
        define("@angular/language-service/src/expression_diagnostics", ["require", "exports", "tslib", "@angular/compiler", "@angular/language-service/src/diagnostic_messages", "@angular/language-service/src/expression_type", "@angular/language-service/src/symbols", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var diagnostic_messages_1 = require("@angular/language-service/src/diagnostic_messages");
    var expression_type_1 = require("@angular/language-service/src/expression_type");
    var symbols_1 = require("@angular/language-service/src/symbols");
    var utils_1 = require("@angular/language-service/src/utils");
    function getTemplateExpressionDiagnostics(info) {
        var visitor = new ExpressionDiagnosticsVisitor(info, function (path) { return getExpressionScope(info, path); });
        compiler_1.templateVisitAll(visitor, info.templateAst);
        return visitor.diagnostics;
    }
    exports.getTemplateExpressionDiagnostics = getTemplateExpressionDiagnostics;
    function getReferences(info) {
        var result = [];
        function processReferences(references) {
            var e_1, _a;
            var _loop_1 = function (reference) {
                var type = undefined;
                if (reference.value) {
                    type = info.query.getTypeSymbol(compiler_1.tokenReference(reference.value));
                }
                result.push({
                    name: reference.name,
                    kind: 'reference',
                    type: type || info.query.getBuiltinType(symbols_1.BuiltinType.Any),
                    get definition() { return getDefinitionOf(info, reference); }
                });
            };
            try {
                for (var references_1 = tslib_1.__values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
                    var reference = references_1_1.value;
                    _loop_1(reference);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        var visitor = new /** @class */ (function (_super) {
            tslib_1.__extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.visitEmbeddedTemplate = function (ast, context) {
                _super.prototype.visitEmbeddedTemplate.call(this, ast, context);
                processReferences(ast.references);
            };
            class_1.prototype.visitElement = function (ast, context) {
                _super.prototype.visitElement.call(this, ast, context);
                processReferences(ast.references);
            };
            return class_1;
        }(compiler_1.RecursiveTemplateAstVisitor));
        compiler_1.templateVisitAll(visitor, info.templateAst);
        return result;
    }
    function getDefinitionOf(info, ast) {
        if (info.fileName) {
            var templateOffset = info.offset;
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
     * Resolve all variable declarations in a template by traversing the specified
     * `path`.
     * @param info
     * @param path template AST path
     */
    function getVarDeclarations(info, path) {
        var e_2, _a;
        var results = [];
        for (var current = path.head; current; current = path.childOf(current)) {
            if (!(current instanceof compiler_1.EmbeddedTemplateAst)) {
                continue;
            }
            var _loop_2 = function (variable) {
                var symbol = getVariableTypeFromDirectiveContext(variable.value, info.query, current);
                var kind = info.query.getTypeKind(symbol);
                if (kind === symbols_1.BuiltinType.Any || kind === symbols_1.BuiltinType.Unbound) {
                    // For special cases such as ngFor and ngIf, the any type is not very useful.
                    // We can do better by resolving the binding value.
                    var symbolsInScope = info.query.mergeSymbolTable([
                        info.members,
                        // Since we are traversing the AST path from head to tail, any variables
                        // that have been declared so far are also in scope.
                        info.query.createSymbolTable(results),
                    ]);
                    symbol = refinedVariableType(variable.value, symbolsInScope, info.query, current);
                }
                results.push({
                    name: variable.name,
                    kind: 'variable',
                    type: symbol, get definition() { return getDefinitionOf(info, variable); },
                });
            };
            try {
                for (var _b = (e_2 = void 0, tslib_1.__values(current.variables)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var variable = _c.value;
                    _loop_2(variable);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return results;
    }
    /**
     * Resolve the type for the variable in `templateElement` by finding the structural
     * directive which has the context member. Returns any when not found.
     * @param value variable value name
     * @param query type symbol query
     * @param templateElement
     */
    function getVariableTypeFromDirectiveContext(value, query, templateElement) {
        var e_3, _a;
        try {
            for (var _b = tslib_1.__values(templateElement.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                var directive = _c.value.directive;
                var context = query.getTemplateContext(directive.type.reference);
                if (context) {
                    var member = context.get(value);
                    if (member && member.type) {
                        return member.type;
                    }
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    /**
     * Resolve a more specific type for the variable in `templateElement` by inspecting
     * all variables that are in scope in the `mergedTable`. This function is a special
     * case for `ngFor` and `ngIf`. If resolution fails, return the `any` type.
     * @param value variable value name
     * @param mergedTable symbol table for all variables in scope
     * @param query
     * @param templateElement
     */
    function refinedVariableType(value, mergedTable, query, templateElement) {
        if (value === '$implicit') {
            // Special case the ngFor directive
            var ngForDirective = templateElement.directives.find(function (d) {
                var name = compiler_1.identifierName(d.directive.type);
                return name == 'NgFor' || name == 'NgForOf';
            });
            if (ngForDirective) {
                var ngForOfBinding = ngForDirective.inputs.find(function (i) { return i.directiveName == 'ngForOf'; });
                if (ngForOfBinding) {
                    // Check if there is a known type for the ngFor binding.
                    var bindingType = new expression_type_1.AstType(mergedTable, query, {}).getType(ngForOfBinding.value);
                    if (bindingType) {
                        var result = query.getElementType(bindingType);
                        if (result) {
                            return result;
                        }
                    }
                }
            }
        }
        // Special case the ngIf directive ( *ngIf="data$ | async as variable" )
        if (value === 'ngIf') {
            var ngIfDirective = templateElement.directives.find(function (d) { return compiler_1.identifierName(d.directive.type) === 'NgIf'; });
            if (ngIfDirective) {
                var ngIfBinding = ngIfDirective.inputs.find(function (i) { return i.directiveName === 'ngIf'; });
                if (ngIfBinding) {
                    var bindingType = new expression_type_1.AstType(mergedTable, query, {}).getType(ngIfBinding.value);
                    if (bindingType) {
                        return bindingType;
                    }
                }
            }
        }
        // We can't do better, return any
        return query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    function getEventDeclaration(info, path) {
        var event = path.tail;
        if (!(event instanceof compiler_1.BoundEventAst)) {
            // No event available in this context.
            return;
        }
        var genericEvent = {
            name: '$event',
            kind: 'variable',
            type: info.query.getBuiltinType(symbols_1.BuiltinType.Any),
        };
        var outputSymbol = utils_1.findOutputBinding(event, path, info.query);
        if (!outputSymbol) {
            // The `$event` variable doesn't belong to an output, so its type can't be refined.
            // TODO: type `$event` variables in bindings to DOM events.
            return genericEvent;
        }
        // The raw event type is wrapped in a generic, like EventEmitter<T> or Observable<T>.
        var ta = outputSymbol.typeArguments();
        if (!ta || ta.length !== 1)
            return genericEvent;
        var eventType = ta[0];
        return tslib_1.__assign(tslib_1.__assign({}, genericEvent), { type: eventType });
    }
    /**
     * Returns the symbols available in a particular scope of a template.
     * @param info parsed template information
     * @param path path of template nodes narrowing to the context the expression scope should be
     * derived for.
     */
    function getExpressionScope(info, path) {
        var result = info.members;
        var references = getReferences(info);
        var variables = getVarDeclarations(info, path);
        var event = getEventDeclaration(info, path);
        if (references.length || variables.length || event) {
            var referenceTable = info.query.createSymbolTable(references);
            var variableTable = info.query.createSymbolTable(variables);
            var eventsTable = info.query.createSymbolTable(event ? [event] : []);
            result = info.query.mergeSymbolTable([result, referenceTable, variableTable, eventsTable]);
        }
        return result;
    }
    exports.getExpressionScope = getExpressionScope;
    var ExpressionDiagnosticsVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionDiagnosticsVisitor, _super);
        function ExpressionDiagnosticsVisitor(info, getExpressionScope) {
            var _this = _super.call(this) || this;
            _this.info = info;
            _this.getExpressionScope = getExpressionScope;
            _this.diagnostics = [];
            _this.path = new compiler_1.AstPath([]);
            return _this;
        }
        ExpressionDiagnosticsVisitor.prototype.visitDirective = function (ast, context) {
            // Override the default child visitor to ignore the host properties of a directive.
            if (ast.inputs && ast.inputs.length) {
                compiler_1.templateVisitAll(this, ast.inputs, context);
            }
        };
        ExpressionDiagnosticsVisitor.prototype.visitBoundText = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, ast.sourceSpan.start.offset, false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitElementProperty = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.value, this.attributeValueLocation(ast), false);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitEvent = function (ast) {
            this.push(ast);
            this.diagnoseExpression(ast.handler, this.attributeValueLocation(ast), true);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitVariable = function (ast) {
            var directive = this.directiveSummary;
            if (directive && ast.value) {
                var context = this.info.query.getTemplateContext(directive.type.reference);
                if (context && !context.has(ast.value)) {
                    var missingMember = ast.value === '$implicit' ? 'an implicit value' : "a member called '" + ast.value + "'";
                    var span = this.absSpan(spanOf(ast.sourceSpan));
                    this.diagnostics.push(diagnostic_messages_1.createDiagnostic(span, diagnostic_messages_1.Diagnostic.template_context_missing_member, directive.type.reference.name, missingMember));
                }
            }
        };
        ExpressionDiagnosticsVisitor.prototype.visitElement = function (ast, context) {
            this.push(ast);
            _super.prototype.visitElement.call(this, ast, context);
            this.pop();
        };
        ExpressionDiagnosticsVisitor.prototype.visitEmbeddedTemplate = function (ast, context) {
            var previousDirectiveSummary = this.directiveSummary;
            this.push(ast);
            // Find directive that references this template
            this.directiveSummary =
                ast.directives.map(function (d) { return d.directive; }).find(function (d) { return hasTemplateReference(d.type); });
            // Process children
            _super.prototype.visitEmbeddedTemplate.call(this, ast, context);
            this.pop();
            this.directiveSummary = previousDirectiveSummary;
        };
        ExpressionDiagnosticsVisitor.prototype.attributeValueLocation = function (ast) {
            var path = utils_1.getPathToNodeAtPosition(this.info.htmlAst, ast.sourceSpan.start.offset);
            var last = path.tail;
            if (last instanceof compiler_1.Attribute && last.valueSpan) {
                return last.valueSpan.start.offset;
            }
            return ast.sourceSpan.start.offset;
        };
        ExpressionDiagnosticsVisitor.prototype.diagnoseExpression = function (ast, offset, event) {
            var e_4, _a;
            var scope = this.getExpressionScope(this.path, event);
            var analyzer = new expression_type_1.AstType(scope, this.info.query, { event: event });
            try {
                for (var _b = tslib_1.__values(analyzer.getDiagnostics(ast)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var diagnostic = _c.value;
                    diagnostic.span = this.absSpan(diagnostic.span, offset);
                    this.diagnostics.push(diagnostic);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        ExpressionDiagnosticsVisitor.prototype.push = function (ast) { this.path.push(ast); };
        ExpressionDiagnosticsVisitor.prototype.pop = function () { this.path.pop(); };
        ExpressionDiagnosticsVisitor.prototype.absSpan = function (span, additionalOffset) {
            if (additionalOffset === void 0) { additionalOffset = 0; }
            return {
                start: span.start + this.info.offset + additionalOffset,
                end: span.end + this.info.offset + additionalOffset,
            };
        };
        return ExpressionDiagnosticsVisitor;
    }(compiler_1.RecursiveTemplateAstVisitor));
    function hasTemplateReference(type) {
        var e_5, _a;
        if (type.diDeps) {
            try {
                for (var _b = tslib_1.__values(type.diDeps), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var diDep = _c.value;
                    if (diDep.token && diDep.token.identifier &&
                        compiler_1.identifierName(diDep.token.identifier) == 'TemplateRef')
                        return true;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        return false;
    }
    function spanOf(sourceSpan) {
        return { start: sourceSpan.start.offset, end: sourceSpan.end.offset };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl9kaWFnbm9zdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVZO0lBRXZZLHlGQUFtRTtJQUNuRSxpRkFBMEM7SUFDMUMsaUVBQTZHO0lBRTdHLDZEQUFtRTtJQVduRSxTQUFnQixnQ0FBZ0MsQ0FBQyxJQUE0QjtRQUMzRSxJQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUE0QixDQUM1QyxJQUFJLEVBQUUsVUFBQyxJQUFxQixJQUFLLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUE5QixDQUE4QixDQUFDLENBQUM7UUFDckUsMkJBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QyxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDN0IsQ0FBQztJQUxELDRFQUtDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBNEI7UUFDakQsSUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztRQUV2QyxTQUFTLGlCQUFpQixDQUFDLFVBQTBCOztvQ0FDeEMsU0FBUztnQkFDbEIsSUFBSSxJQUFJLEdBQXFCLFNBQVMsQ0FBQztnQkFDdkMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO29CQUNuQixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMseUJBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztpQkFDbEU7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3BCLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FB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QSxvQkFBNEI7WUFDdEQsT0FBTztnQkFDTCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0I7Z0JBQ3ZELEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLGdCQUFnQjthQUNwRCxDQUFDO1FBQ0osQ0FBQztRQUNILG1DQUFDO0lBQUQsQ0FBQyxBQS9HRCxDQUEyQyxzQ0FBMkIsR0ErR3JFO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxJQUF5Qjs7UUFDckQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFOztnQkFDZixLQUFrQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUIsSUFBSSxLQUFLLFdBQUE7b0JBQ1osSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVTt3QkFDckMseUJBQWMsQ0FBQyxLQUFLLENBQUMsS0FBTyxDQUFDLFVBQVksQ0FBQyxJQUFJLGFBQWE7d0JBQzdELE9BQU8sSUFBSSxDQUFDO2lCQUNmOzs7Ozs7Ozs7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMsTUFBTSxDQUFDLFVBQTJCO1FBQ3pDLE9BQU8sRUFBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIENvbXBpbGVUeXBlTWV0YWRhdGEsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgTm9kZSwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFJlZmVyZW5jZUFzdCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgVmFyaWFibGVBc3QsIGlkZW50aWZpZXJOYW1lLCB0ZW1wbGF0ZVZpc2l0QWxsLCB0b2tlblJlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge0RpYWdub3N0aWMsIGNyZWF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY19tZXNzYWdlcyc7XG5pbXBvcnQge0FzdFR5cGV9IGZyb20gJy4vZXhwcmVzc2lvbl90eXBlJztcbmltcG9ydCB7QnVpbHRpblR5cGUsIERlZmluaXRpb24sIFNwYW4sIFN5bWJvbCwgU3ltYm9sRGVjbGFyYXRpb24sIFN5bWJvbFF1ZXJ5LCBTeW1ib2xUYWJsZX0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtmaW5kT3V0cHV0QmluZGluZywgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNUZW1wbGF0ZUluZm8ge1xuICBmaWxlTmFtZT86IHN0cmluZztcbiAgb2Zmc2V0OiBudW1iZXI7XG4gIHF1ZXJ5OiBTeW1ib2xRdWVyeTtcbiAgbWVtYmVyczogU3ltYm9sVGFibGU7XG4gIGh0bWxBc3Q6IE5vZGVbXTtcbiAgdGVtcGxhdGVBc3Q6IFRlbXBsYXRlQXN0W107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljcyhpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvKTogbmcuRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uRGlhZ25vc3RpY3NWaXNpdG9yKFxuICAgICAgaW5mbywgKHBhdGg6IFRlbXBsYXRlQXN0UGF0aCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGluZm8sIHBhdGgpKTtcbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBpbmZvLnRlbXBsYXRlQXN0KTtcbiAgcmV0dXJuIHZpc2l0b3IuZGlhZ25vc3RpY3M7XG59XG5cbmZ1bmN0aW9uIGdldFJlZmVyZW5jZXMoaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyk6IFN5bWJvbERlY2xhcmF0aW9uW10ge1xuICBjb25zdCByZXN1bHQ6IFN5bWJvbERlY2xhcmF0aW9uW10gPSBbXTtcblxuICBmdW5jdGlvbiBwcm9jZXNzUmVmZXJlbmNlcyhyZWZlcmVuY2VzOiBSZWZlcmVuY2VBc3RbXSkge1xuICAgIGZvciAoY29uc3QgcmVmZXJlbmNlIG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCB0eXBlOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKHJlZmVyZW5jZS52YWx1ZSkge1xuICAgICAgICB0eXBlID0gaW5mby5xdWVyeS5nZXRUeXBlU3ltYm9sKHRva2VuUmVmZXJlbmNlKHJlZmVyZW5jZS52YWx1ZSkpO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBuYW1lOiByZWZlcmVuY2UubmFtZSxcbiAgICAgICAga2luZDogJ3JlZmVyZW5jZScsXG4gICAgICAgIHR5cGU6IHR5cGUgfHwgaW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpLFxuICAgICAgICBnZXQgZGVmaW5pdGlvbigpIHsgcmV0dXJuIGdldERlZmluaXRpb25PZihpbmZvLCByZWZlcmVuY2UpOyB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCB2aXNpdG9yID0gbmV3IGNsYXNzIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgICB2aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0OiBFbWJlZGRlZFRlbXBsYXRlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgc3VwZXIudmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdCwgY29udGV4dCk7XG4gICAgICBwcm9jZXNzUmVmZXJlbmNlcyhhc3QucmVmZXJlbmNlcyk7XG4gICAgfVxuICAgIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICBzdXBlci52aXNpdEVsZW1lbnQoYXN0LCBjb250ZXh0KTtcbiAgICAgIHByb2Nlc3NSZWZlcmVuY2VzKGFzdC5yZWZlcmVuY2VzKTtcbiAgICB9XG4gIH07XG5cbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBpbmZvLnRlbXBsYXRlQXN0KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXREZWZpbml0aW9uT2YoaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgYXN0OiBUZW1wbGF0ZUFzdCk6IERlZmluaXRpb258dW5kZWZpbmVkIHtcbiAgaWYgKGluZm8uZmlsZU5hbWUpIHtcbiAgICBjb25zdCB0ZW1wbGF0ZU9mZnNldCA9IGluZm8ub2Zmc2V0O1xuICAgIHJldHVybiBbe1xuICAgICAgZmlsZU5hbWU6IGluZm8uZmlsZU5hbWUsXG4gICAgICBzcGFuOiB7XG4gICAgICAgIHN0YXJ0OiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyB0ZW1wbGF0ZU9mZnNldCxcbiAgICAgICAgZW5kOiBhc3Quc291cmNlU3Bhbi5lbmQub2Zmc2V0ICsgdGVtcGxhdGVPZmZzZXRcbiAgICAgIH1cbiAgICB9XTtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYWxsIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiBhIHRlbXBsYXRlIGJ5IHRyYXZlcnNpbmcgdGhlIHNwZWNpZmllZFxuICogYHBhdGhgLlxuICogQHBhcmFtIGluZm9cbiAqIEBwYXJhbSBwYXRoIHRlbXBsYXRlIEFTVCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGdldFZhckRlY2xhcmF0aW9ucyhcbiAgICBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgpOiBTeW1ib2xEZWNsYXJhdGlvbltdIHtcbiAgY29uc3QgcmVzdWx0czogU3ltYm9sRGVjbGFyYXRpb25bXSA9IFtdO1xuICBmb3IgKGxldCBjdXJyZW50ID0gcGF0aC5oZWFkOyBjdXJyZW50OyBjdXJyZW50ID0gcGF0aC5jaGlsZE9mKGN1cnJlbnQpKSB7XG4gICAgaWYgKCEoY3VycmVudCBpbnN0YW5jZW9mIEVtYmVkZGVkVGVtcGxhdGVBc3QpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB2YXJpYWJsZSBvZiBjdXJyZW50LnZhcmlhYmxlcykge1xuICAgICAgbGV0IHN5bWJvbCA9IGdldFZhcmlhYmxlVHlwZUZyb21EaXJlY3RpdmVDb250ZXh0KHZhcmlhYmxlLnZhbHVlLCBpbmZvLnF1ZXJ5LCBjdXJyZW50KTtcblxuICAgICAgY29uc3Qga2luZCA9IGluZm8ucXVlcnkuZ2V0VHlwZUtpbmQoc3ltYm9sKTtcbiAgICAgIGlmIChraW5kID09PSBCdWlsdGluVHlwZS5BbnkgfHwga2luZCA9PT0gQnVpbHRpblR5cGUuVW5ib3VuZCkge1xuICAgICAgICAvLyBGb3Igc3BlY2lhbCBjYXNlcyBzdWNoIGFzIG5nRm9yIGFuZCBuZ0lmLCB0aGUgYW55IHR5cGUgaXMgbm90IHZlcnkgdXNlZnVsLlxuICAgICAgICAvLyBXZSBjYW4gZG8gYmV0dGVyIGJ5IHJlc29sdmluZyB0aGUgYmluZGluZyB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc3ltYm9sc0luU2NvcGUgPSBpbmZvLnF1ZXJ5Lm1lcmdlU3ltYm9sVGFibGUoW1xuICAgICAgICAgIGluZm8ubWVtYmVycyxcbiAgICAgICAgICAvLyBTaW5jZSB3ZSBhcmUgdHJhdmVyc2luZyB0aGUgQVNUIHBhdGggZnJvbSBoZWFkIHRvIHRhaWwsIGFueSB2YXJpYWJsZXNcbiAgICAgICAgICAvLyB0aGF0IGhhdmUgYmVlbiBkZWNsYXJlZCBzbyBmYXIgYXJlIGFsc28gaW4gc2NvcGUuXG4gICAgICAgICAgaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZShyZXN1bHRzKSxcbiAgICAgICAgXSk7XG4gICAgICAgIHN5bWJvbCA9IHJlZmluZWRWYXJpYWJsZVR5cGUodmFyaWFibGUudmFsdWUsIHN5bWJvbHNJblNjb3BlLCBpbmZvLnF1ZXJ5LCBjdXJyZW50KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWU6IHZhcmlhYmxlLm5hbWUsXG4gICAgICAgIGtpbmQ6ICd2YXJpYWJsZScsXG4gICAgICAgIHR5cGU6IHN5bWJvbCwgZ2V0IGRlZmluaXRpb24oKSB7IHJldHVybiBnZXREZWZpbml0aW9uT2YoaW5mbywgdmFyaWFibGUpOyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFJlc29sdmUgdGhlIHR5cGUgZm9yIHRoZSB2YXJpYWJsZSBpbiBgdGVtcGxhdGVFbGVtZW50YCBieSBmaW5kaW5nIHRoZSBzdHJ1Y3R1cmFsXG4gKiBkaXJlY3RpdmUgd2hpY2ggaGFzIHRoZSBjb250ZXh0IG1lbWJlci4gUmV0dXJucyBhbnkgd2hlbiBub3QgZm91bmQuXG4gKiBAcGFyYW0gdmFsdWUgdmFyaWFibGUgdmFsdWUgbmFtZVxuICogQHBhcmFtIHF1ZXJ5IHR5cGUgc3ltYm9sIHF1ZXJ5XG4gKiBAcGFyYW0gdGVtcGxhdGVFbGVtZW50XG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlVHlwZUZyb21EaXJlY3RpdmVDb250ZXh0KFxuICAgIHZhbHVlOiBzdHJpbmcsIHF1ZXJ5OiBTeW1ib2xRdWVyeSwgdGVtcGxhdGVFbGVtZW50OiBFbWJlZGRlZFRlbXBsYXRlQXN0KTogU3ltYm9sIHtcbiAgZm9yIChjb25zdCB7ZGlyZWN0aXZlfSBvZiB0ZW1wbGF0ZUVsZW1lbnQuZGlyZWN0aXZlcykge1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKTtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgY29uc3QgbWVtYmVyID0gY29udGV4dC5nZXQodmFsdWUpO1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIudHlwZSkge1xuICAgICAgICByZXR1cm4gbWVtYmVyLnR5cGU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBxdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xufVxuXG4vKipcbiAqIFJlc29sdmUgYSBtb3JlIHNwZWNpZmljIHR5cGUgZm9yIHRoZSB2YXJpYWJsZSBpbiBgdGVtcGxhdGVFbGVtZW50YCBieSBpbnNwZWN0aW5nXG4gKiBhbGwgdmFyaWFibGVzIHRoYXQgYXJlIGluIHNjb3BlIGluIHRoZSBgbWVyZ2VkVGFibGVgLiBUaGlzIGZ1bmN0aW9uIGlzIGEgc3BlY2lhbFxuICogY2FzZSBmb3IgYG5nRm9yYCBhbmQgYG5nSWZgLiBJZiByZXNvbHV0aW9uIGZhaWxzLCByZXR1cm4gdGhlIGBhbnlgIHR5cGUuXG4gKiBAcGFyYW0gdmFsdWUgdmFyaWFibGUgdmFsdWUgbmFtZVxuICogQHBhcmFtIG1lcmdlZFRhYmxlIHN5bWJvbCB0YWJsZSBmb3IgYWxsIHZhcmlhYmxlcyBpbiBzY29wZVxuICogQHBhcmFtIHF1ZXJ5XG4gKiBAcGFyYW0gdGVtcGxhdGVFbGVtZW50XG4gKi9cbmZ1bmN0aW9uIHJlZmluZWRWYXJpYWJsZVR5cGUoXG4gICAgdmFsdWU6IHN0cmluZywgbWVyZ2VkVGFibGU6IFN5bWJvbFRhYmxlLCBxdWVyeTogU3ltYm9sUXVlcnksXG4gICAgdGVtcGxhdGVFbGVtZW50OiBFbWJlZGRlZFRlbXBsYXRlQXN0KTogU3ltYm9sIHtcbiAgaWYgKHZhbHVlID09PSAnJGltcGxpY2l0Jykge1xuICAgIC8vIFNwZWNpYWwgY2FzZSB0aGUgbmdGb3IgZGlyZWN0aXZlXG4gICAgY29uc3QgbmdGb3JEaXJlY3RpdmUgPSB0ZW1wbGF0ZUVsZW1lbnQuZGlyZWN0aXZlcy5maW5kKGQgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGlkZW50aWZpZXJOYW1lKGQuZGlyZWN0aXZlLnR5cGUpO1xuICAgICAgcmV0dXJuIG5hbWUgPT0gJ05nRm9yJyB8fCBuYW1lID09ICdOZ0Zvck9mJztcbiAgICB9KTtcbiAgICBpZiAobmdGb3JEaXJlY3RpdmUpIHtcbiAgICAgIGNvbnN0IG5nRm9yT2ZCaW5kaW5nID0gbmdGb3JEaXJlY3RpdmUuaW5wdXRzLmZpbmQoaSA9PiBpLmRpcmVjdGl2ZU5hbWUgPT0gJ25nRm9yT2YnKTtcbiAgICAgIGlmIChuZ0Zvck9mQmluZGluZykge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIGtub3duIHR5cGUgZm9yIHRoZSBuZ0ZvciBiaW5kaW5nLlxuICAgICAgICBjb25zdCBiaW5kaW5nVHlwZSA9IG5ldyBBc3RUeXBlKG1lcmdlZFRhYmxlLCBxdWVyeSwge30pLmdldFR5cGUobmdGb3JPZkJpbmRpbmcudmFsdWUpO1xuICAgICAgICBpZiAoYmluZGluZ1R5cGUpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBxdWVyeS5nZXRFbGVtZW50VHlwZShiaW5kaW5nVHlwZSk7XG4gICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgdGhlIG5nSWYgZGlyZWN0aXZlICggKm5nSWY9XCJkYXRhJCB8IGFzeW5jIGFzIHZhcmlhYmxlXCIgKVxuICBpZiAodmFsdWUgPT09ICduZ0lmJykge1xuICAgIGNvbnN0IG5nSWZEaXJlY3RpdmUgPVxuICAgICAgICB0ZW1wbGF0ZUVsZW1lbnQuZGlyZWN0aXZlcy5maW5kKGQgPT4gaWRlbnRpZmllck5hbWUoZC5kaXJlY3RpdmUudHlwZSkgPT09ICdOZ0lmJyk7XG4gICAgaWYgKG5nSWZEaXJlY3RpdmUpIHtcbiAgICAgIGNvbnN0IG5nSWZCaW5kaW5nID0gbmdJZkRpcmVjdGl2ZS5pbnB1dHMuZmluZChpID0+IGkuZGlyZWN0aXZlTmFtZSA9PT0gJ25nSWYnKTtcbiAgICAgIGlmIChuZ0lmQmluZGluZykge1xuICAgICAgICBjb25zdCBiaW5kaW5nVHlwZSA9IG5ldyBBc3RUeXBlKG1lcmdlZFRhYmxlLCBxdWVyeSwge30pLmdldFR5cGUobmdJZkJpbmRpbmcudmFsdWUpO1xuICAgICAgICBpZiAoYmluZGluZ1R5cGUpIHtcbiAgICAgICAgICByZXR1cm4gYmluZGluZ1R5cGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBjYW4ndCBkbyBiZXR0ZXIsIHJldHVybiBhbnlcbiAgcmV0dXJuIHF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG59XG5cbmZ1bmN0aW9uIGdldEV2ZW50RGVjbGFyYXRpb24oXG4gICAgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgcGF0aDogVGVtcGxhdGVBc3RQYXRoKTogU3ltYm9sRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgY29uc3QgZXZlbnQgPSBwYXRoLnRhaWw7XG4gIGlmICghKGV2ZW50IGluc3RhbmNlb2YgQm91bmRFdmVudEFzdCkpIHtcbiAgICAvLyBObyBldmVudCBhdmFpbGFibGUgaW4gdGhpcyBjb250ZXh0LlxuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGdlbmVyaWNFdmVudDogU3ltYm9sRGVjbGFyYXRpb24gPSB7XG4gICAgbmFtZTogJyRldmVudCcsXG4gICAga2luZDogJ3ZhcmlhYmxlJyxcbiAgICB0eXBlOiBpbmZvLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSksXG4gIH07XG5cbiAgY29uc3Qgb3V0cHV0U3ltYm9sID0gZmluZE91dHB1dEJpbmRpbmcoZXZlbnQsIHBhdGgsIGluZm8ucXVlcnkpO1xuICBpZiAoIW91dHB1dFN5bWJvbCkge1xuICAgIC8vIFRoZSBgJGV2ZW50YCB2YXJpYWJsZSBkb2Vzbid0IGJlbG9uZyB0byBhbiBvdXRwdXQsIHNvIGl0cyB0eXBlIGNhbid0IGJlIHJlZmluZWQuXG4gICAgLy8gVE9ETzogdHlwZSBgJGV2ZW50YCB2YXJpYWJsZXMgaW4gYmluZGluZ3MgdG8gRE9NIGV2ZW50cy5cbiAgICByZXR1cm4gZ2VuZXJpY0V2ZW50O1xuICB9XG5cbiAgLy8gVGhlIHJhdyBldmVudCB0eXBlIGlzIHdyYXBwZWQgaW4gYSBnZW5lcmljLCBsaWtlIEV2ZW50RW1pdHRlcjxUPiBvciBPYnNlcnZhYmxlPFQ+LlxuICBjb25zdCB0YSA9IG91dHB1dFN5bWJvbC50eXBlQXJndW1lbnRzKCk7XG4gIGlmICghdGEgfHwgdGEubGVuZ3RoICE9PSAxKSByZXR1cm4gZ2VuZXJpY0V2ZW50O1xuICBjb25zdCBldmVudFR5cGUgPSB0YVswXTtcblxuICByZXR1cm4gey4uLmdlbmVyaWNFdmVudCwgdHlwZTogZXZlbnRUeXBlfTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzeW1ib2xzIGF2YWlsYWJsZSBpbiBhIHBhcnRpY3VsYXIgc2NvcGUgb2YgYSB0ZW1wbGF0ZS5cbiAqIEBwYXJhbSBpbmZvIHBhcnNlZCB0ZW1wbGF0ZSBpbmZvcm1hdGlvblxuICogQHBhcmFtIHBhdGggcGF0aCBvZiB0ZW1wbGF0ZSBub2RlcyBuYXJyb3dpbmcgdG8gdGhlIGNvbnRleHQgdGhlIGV4cHJlc3Npb24gc2NvcGUgc2hvdWxkIGJlXG4gKiBkZXJpdmVkIGZvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25TY29wZShcbiAgICBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgpOiBTeW1ib2xUYWJsZSB7XG4gIGxldCByZXN1bHQgPSBpbmZvLm1lbWJlcnM7XG4gIGNvbnN0IHJlZmVyZW5jZXMgPSBnZXRSZWZlcmVuY2VzKGluZm8pO1xuICBjb25zdCB2YXJpYWJsZXMgPSBnZXRWYXJEZWNsYXJhdGlvbnMoaW5mbywgcGF0aCk7XG4gIGNvbnN0IGV2ZW50ID0gZ2V0RXZlbnREZWNsYXJhdGlvbihpbmZvLCBwYXRoKTtcbiAgaWYgKHJlZmVyZW5jZXMubGVuZ3RoIHx8IHZhcmlhYmxlcy5sZW5ndGggfHwgZXZlbnQpIHtcbiAgICBjb25zdCByZWZlcmVuY2VUYWJsZSA9IGluZm8ucXVlcnkuY3JlYXRlU3ltYm9sVGFibGUocmVmZXJlbmNlcyk7XG4gICAgY29uc3QgdmFyaWFibGVUYWJsZSA9IGluZm8ucXVlcnkuY3JlYXRlU3ltYm9sVGFibGUodmFyaWFibGVzKTtcbiAgICBjb25zdCBldmVudHNUYWJsZSA9IGluZm8ucXVlcnkuY3JlYXRlU3ltYm9sVGFibGUoZXZlbnQgPyBbZXZlbnRdIDogW10pO1xuICAgIHJlc3VsdCA9IGluZm8ucXVlcnkubWVyZ2VTeW1ib2xUYWJsZShbcmVzdWx0LCByZWZlcmVuY2VUYWJsZSwgdmFyaWFibGVUYWJsZSwgZXZlbnRzVGFibGVdKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jbGFzcyBFeHByZXNzaW9uRGlhZ25vc3RpY3NWaXNpdG9yIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBwYXRoOiBUZW1wbGF0ZUFzdFBhdGg7XG4gIHByaXZhdGUgZGlyZWN0aXZlU3VtbWFyeTogQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnl8dW5kZWZpbmVkO1xuXG4gIGRpYWdub3N0aWNzOiBuZy5EaWFnbm9zdGljW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyxcbiAgICAgIHByaXZhdGUgZ2V0RXhwcmVzc2lvblNjb3BlOiAocGF0aDogVGVtcGxhdGVBc3RQYXRoLCBpbmNsdWRlRXZlbnQ6IGJvb2xlYW4pID0+IFN5bWJvbFRhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnBhdGggPSBuZXcgQXN0UGF0aDxUZW1wbGF0ZUFzdD4oW10pO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmUoYXN0OiBEaXJlY3RpdmVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgLy8gT3ZlcnJpZGUgdGhlIGRlZmF1bHQgY2hpbGQgdmlzaXRvciB0byBpZ25vcmUgdGhlIGhvc3QgcHJvcGVydGllcyBvZiBhIGRpcmVjdGl2ZS5cbiAgICBpZiAoYXN0LmlucHV0cyAmJiBhc3QuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGVtcGxhdGVWaXNpdEFsbCh0aGlzLCBhc3QuaW5wdXRzLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICB2aXNpdEJvdW5kVGV4dChhc3Q6IEJvdW5kVGV4dEFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBmYWxzZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LnZhbHVlLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LnZhbHVlLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC5oYW5kbGVyLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgdHJ1ZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0VmFyaWFibGUoYXN0OiBWYXJpYWJsZUFzdCk6IHZvaWQge1xuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuZGlyZWN0aXZlU3VtbWFyeTtcbiAgICBpZiAoZGlyZWN0aXZlICYmIGFzdC52YWx1ZSkge1xuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuaW5mby5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKSAhO1xuICAgICAgaWYgKGNvbnRleHQgJiYgIWNvbnRleHQuaGFzKGFzdC52YWx1ZSkpIHtcbiAgICAgICAgY29uc3QgbWlzc2luZ01lbWJlciA9XG4gICAgICAgICAgICBhc3QudmFsdWUgPT09ICckaW1wbGljaXQnID8gJ2FuIGltcGxpY2l0IHZhbHVlJyA6IGBhIG1lbWJlciBjYWxsZWQgJyR7YXN0LnZhbHVlfSdgO1xuXG4gICAgICAgIGNvbnN0IHNwYW4gPSB0aGlzLmFic1NwYW4oc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKSk7XG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaChjcmVhdGVEaWFnbm9zdGljKFxuICAgICAgICAgICAgc3BhbiwgRGlhZ25vc3RpYy50ZW1wbGF0ZV9jb250ZXh0X21pc3NpbmdfbWVtYmVyLCBkaXJlY3RpdmUudHlwZS5yZWZlcmVuY2UubmFtZSxcbiAgICAgICAgICAgIG1pc3NpbmdNZW1iZXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICBzdXBlci52aXNpdEVsZW1lbnQoYXN0LCBjb250ZXh0KTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICBjb25zdCBwcmV2aW91c0RpcmVjdGl2ZVN1bW1hcnkgPSB0aGlzLmRpcmVjdGl2ZVN1bW1hcnk7XG5cbiAgICB0aGlzLnB1c2goYXN0KTtcblxuICAgIC8vIEZpbmQgZGlyZWN0aXZlIHRoYXQgcmVmZXJlbmNlcyB0aGlzIHRlbXBsYXRlXG4gICAgdGhpcy5kaXJlY3RpdmVTdW1tYXJ5ID1cbiAgICAgICAgYXN0LmRpcmVjdGl2ZXMubWFwKGQgPT4gZC5kaXJlY3RpdmUpLmZpbmQoZCA9PiBoYXNUZW1wbGF0ZVJlZmVyZW5jZShkLnR5cGUpKSAhO1xuXG4gICAgLy8gUHJvY2VzcyBjaGlsZHJlblxuICAgIHN1cGVyLnZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQpO1xuXG4gICAgdGhpcy5wb3AoKTtcblxuICAgIHRoaXMuZGlyZWN0aXZlU3VtbWFyeSA9IHByZXZpb3VzRGlyZWN0aXZlU3VtbWFyeTtcbiAgfVxuXG4gIHByaXZhdGUgYXR0cmlidXRlVmFsdWVMb2NhdGlvbihhc3Q6IFRlbXBsYXRlQXN0KSB7XG4gICAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKHRoaXMuaW5mby5odG1sQXN0LCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAgIGNvbnN0IGxhc3QgPSBwYXRoLnRhaWw7XG4gICAgaWYgKGxhc3QgaW5zdGFuY2VvZiBBdHRyaWJ1dGUgJiYgbGFzdC52YWx1ZVNwYW4pIHtcbiAgICAgIHJldHVybiBsYXN0LnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgfVxuICAgIHJldHVybiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gIH1cblxuICBwcml2YXRlIGRpYWdub3NlRXhwcmVzc2lvbihhc3Q6IEFTVCwgb2Zmc2V0OiBudW1iZXIsIGV2ZW50OiBib29sZWFuKSB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmdldEV4cHJlc3Npb25TY29wZSh0aGlzLnBhdGgsIGV2ZW50KTtcbiAgICBjb25zdCBhbmFseXplciA9IG5ldyBBc3RUeXBlKHNjb3BlLCB0aGlzLmluZm8ucXVlcnksIHtldmVudH0pO1xuICAgIGZvciAoY29uc3QgZGlhZ25vc3RpYyBvZiBhbmFseXplci5nZXREaWFnbm9zdGljcyhhc3QpKSB7XG4gICAgICBkaWFnbm9zdGljLnNwYW4gPSB0aGlzLmFic1NwYW4oZGlhZ25vc3RpYy5zcGFuLCBvZmZzZXQpO1xuICAgICAgdGhpcy5kaWFnbm9zdGljcy5wdXNoKGRpYWdub3N0aWMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHVzaChhc3Q6IFRlbXBsYXRlQXN0KSB7IHRoaXMucGF0aC5wdXNoKGFzdCk7IH1cblxuICBwcml2YXRlIHBvcCgpIHsgdGhpcy5wYXRoLnBvcCgpOyB9XG5cbiAgcHJpdmF0ZSBhYnNTcGFuKHNwYW46IFNwYW4sIGFkZGl0aW9uYWxPZmZzZXQ6IG51bWJlciA9IDApOiBTcGFuIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhcnQ6IHNwYW4uc3RhcnQgKyB0aGlzLmluZm8ub2Zmc2V0ICsgYWRkaXRpb25hbE9mZnNldCxcbiAgICAgIGVuZDogc3Bhbi5lbmQgKyB0aGlzLmluZm8ub2Zmc2V0ICsgYWRkaXRpb25hbE9mZnNldCxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgaWYgKHR5cGUuZGlEZXBzKSB7XG4gICAgZm9yIChsZXQgZGlEZXAgb2YgdHlwZS5kaURlcHMpIHtcbiAgICAgIGlmIChkaURlcC50b2tlbiAmJiBkaURlcC50b2tlbi5pZGVudGlmaWVyICYmXG4gICAgICAgICAgaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4gIS5pZGVudGlmaWVyICEpID09ICdUZW1wbGF0ZVJlZicpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbn1cbiJdfQ==