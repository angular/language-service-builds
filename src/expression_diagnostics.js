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
        define("@angular/language-service/src/expression_diagnostics", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/language-service/src/expression_type", "@angular/language-service/src/symbols", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
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
                var symbol = info.members.get(variable.value);
                if (!symbol) {
                    symbol = getVariableTypeFromDirectiveContext(variable.value, info.query, current);
                }
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
                    this.reportDiagnostic("The template context of '" + directive.type.reference.name + "' does not define " + missingMember + ".\n" +
                        "If the context type is a base type or 'any', consider refining it to a more specific type.", spanOf(ast.sourceSpan), ts.DiagnosticCategory.Suggestion);
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
                    var _d = _c.value, message = _d.message, span = _d.span, kind = _d.kind;
                    span.start += offset;
                    span.end += offset;
                    this.reportDiagnostic(message, span, kind);
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
        ExpressionDiagnosticsVisitor.prototype.reportDiagnostic = function (message, span, kind) {
            if (kind === void 0) { kind = ts.DiagnosticCategory.Error; }
            span.start += this.info.offset;
            span.end += this.info.offset;
            this.diagnostics.push({ kind: kind, span: span, message: message });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl9kaWFnbm9zdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVZO0lBQ3ZZLCtCQUFpQztJQUVqQyxpRkFBMEM7SUFDMUMsaUVBQTZHO0lBRTdHLDZEQUFtRTtJQVduRSxTQUFnQixnQ0FBZ0MsQ0FBQyxJQUE0QjtRQUMzRSxJQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUE0QixDQUM1QyxJQUFJLEVBQUUsVUFBQyxJQUFxQixJQUFLLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUE5QixDQUE4QixDQUFDLENBQUM7UUFDckUsMkJBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QyxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDN0IsQ0FBQztJQUxELDRFQUtDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBNEI7UUFDakQsSUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztRQUV2QyxTQUFTLGlCQUFpQixDQUFDLFVBQTBCOztvQ0FDeEMsU0FBUztnQkFDbEIsSUFBSSxJQUFJLEdBQXFCLFNBQVMsQ0FBQztnQkFDdkMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO29CQUNuQixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMseUJBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztpQkFDbEU7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3BCLElBQUksRUFBRSxXQUFXO29CQUNqQixJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FB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Y2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnksIENvbXBpbGVUeXBlTWV0YWRhdGEsIERpcmVjdGl2ZUFzdCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgTm9kZSwgUGFyc2VTb3VyY2VTcGFuLCBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3IsIFJlZmVyZW5jZUFzdCwgVGVtcGxhdGVBc3QsIFRlbXBsYXRlQXN0UGF0aCwgVmFyaWFibGVBc3QsIGlkZW50aWZpZXJOYW1lLCB0ZW1wbGF0ZVZpc2l0QWxsLCB0b2tlblJlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0VHlwZX0gZnJvbSAnLi9leHByZXNzaW9uX3R5cGUnO1xuaW1wb3J0IHtCdWlsdGluVHlwZSwgRGVmaW5pdGlvbiwgU3BhbiwgU3ltYm9sLCBTeW1ib2xEZWNsYXJhdGlvbiwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHtEaWFnbm9zdGljfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZmluZE91dHB1dEJpbmRpbmcsIGdldFBhdGhUb05vZGVBdFBvc2l0aW9ufSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljVGVtcGxhdGVJbmZvIHtcbiAgZmlsZU5hbWU/OiBzdHJpbmc7XG4gIG9mZnNldDogbnVtYmVyO1xuICBxdWVyeTogU3ltYm9sUXVlcnk7XG4gIG1lbWJlcnM6IFN5bWJvbFRhYmxlO1xuICBodG1sQXN0OiBOb2RlW107XG4gIHRlbXBsYXRlQXN0OiBUZW1wbGF0ZUFzdFtdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3MoaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyk6IERpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvbkRpYWdub3N0aWNzVmlzaXRvcihcbiAgICAgIGluZm8sIChwYXRoOiBUZW1wbGF0ZUFzdFBhdGgpID0+IGdldEV4cHJlc3Npb25TY29wZShpbmZvLCBwYXRoKSk7XG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgaW5mby50ZW1wbGF0ZUFzdCk7XG4gIHJldHVybiB2aXNpdG9yLmRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBnZXRSZWZlcmVuY2VzKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8pOiBTeW1ib2xEZWNsYXJhdGlvbltdIHtcbiAgY29uc3QgcmVzdWx0OiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc1JlZmVyZW5jZXMocmVmZXJlbmNlczogUmVmZXJlbmNlQXN0W10pIHtcbiAgICBmb3IgKGNvbnN0IHJlZmVyZW5jZSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChyZWZlcmVuY2UudmFsdWUpIHtcbiAgICAgICAgdHlwZSA9IGluZm8ucXVlcnkuZ2V0VHlwZVN5bWJvbCh0b2tlblJlZmVyZW5jZShyZWZlcmVuY2UudmFsdWUpKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogcmVmZXJlbmNlLm5hbWUsXG4gICAgICAgIGtpbmQ6ICdyZWZlcmVuY2UnLFxuICAgICAgICB0eXBlOiB0eXBlIHx8IGluZm8ucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KSxcbiAgICAgICAgZ2V0IGRlZmluaXRpb24oKSB7IHJldHVybiBnZXREZWZpbml0aW9uT2YoaW5mbywgcmVmZXJlbmNlKTsgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHN1cGVyLnZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQpO1xuICAgICAgcHJvY2Vzc1JlZmVyZW5jZXMoYXN0LnJlZmVyZW5jZXMpO1xuICAgIH1cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgc3VwZXIudmlzaXRFbGVtZW50KGFzdCwgY29udGV4dCk7XG4gICAgICBwcm9jZXNzUmVmZXJlbmNlcyhhc3QucmVmZXJlbmNlcyk7XG4gICAgfVxuICB9O1xuXG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgaW5mby50ZW1wbGF0ZUFzdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbk9mKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIGFzdDogVGVtcGxhdGVBc3QpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gIGlmIChpbmZvLmZpbGVOYW1lKSB7XG4gICAgY29uc3QgdGVtcGxhdGVPZmZzZXQgPSBpbmZvLm9mZnNldDtcbiAgICByZXR1cm4gW3tcbiAgICAgIGZpbGVOYW1lOiBpbmZvLmZpbGVOYW1lLFxuICAgICAgc3Bhbjoge1xuICAgICAgICBzdGFydDogYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgdGVtcGxhdGVPZmZzZXQsXG4gICAgICAgIGVuZDogYXN0LnNvdXJjZVNwYW4uZW5kLm9mZnNldCArIHRlbXBsYXRlT2Zmc2V0XG4gICAgICB9XG4gICAgfV07XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGFsbCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW4gYSB0ZW1wbGF0ZSBieSB0cmF2ZXJzaW5nIHRoZSBzcGVjaWZpZWRcbiAqIGBwYXRoYC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gcGF0aCB0ZW1wbGF0ZSBBU1QgcGF0aFxuICovXG5mdW5jdGlvbiBnZXRWYXJEZWNsYXJhdGlvbnMoXG4gICAgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgcGF0aDogVGVtcGxhdGVBc3RQYXRoKTogU3ltYm9sRGVjbGFyYXRpb25bXSB7XG4gIGNvbnN0IHJlc3VsdHM6IFN5bWJvbERlY2xhcmF0aW9uW10gPSBbXTtcbiAgZm9yIChsZXQgY3VycmVudCA9IHBhdGguaGVhZDsgY3VycmVudDsgY3VycmVudCA9IHBhdGguY2hpbGRPZihjdXJyZW50KSkge1xuICAgIGlmICghKGN1cnJlbnQgaW5zdGFuY2VvZiBFbWJlZGRlZFRlbXBsYXRlQXN0KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgY3VycmVudC52YXJpYWJsZXMpIHtcbiAgICAgIGxldCBzeW1ib2wgPSBpbmZvLm1lbWJlcnMuZ2V0KHZhcmlhYmxlLnZhbHVlKTtcbiAgICAgIGlmICghc3ltYm9sKSB7XG4gICAgICAgIHN5bWJvbCA9IGdldFZhcmlhYmxlVHlwZUZyb21EaXJlY3RpdmVDb250ZXh0KHZhcmlhYmxlLnZhbHVlLCBpbmZvLnF1ZXJ5LCBjdXJyZW50KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGtpbmQgPSBpbmZvLnF1ZXJ5LmdldFR5cGVLaW5kKHN5bWJvbCk7XG4gICAgICBpZiAoa2luZCA9PT0gQnVpbHRpblR5cGUuQW55IHx8IGtpbmQgPT09IEJ1aWx0aW5UeXBlLlVuYm91bmQpIHtcbiAgICAgICAgLy8gRm9yIHNwZWNpYWwgY2FzZXMgc3VjaCBhcyBuZ0ZvciBhbmQgbmdJZiwgdGhlIGFueSB0eXBlIGlzIG5vdCB2ZXJ5IHVzZWZ1bC5cbiAgICAgICAgLy8gV2UgY2FuIGRvIGJldHRlciBieSByZXNvbHZpbmcgdGhlIGJpbmRpbmcgdmFsdWUuXG4gICAgICAgIGNvbnN0IHN5bWJvbHNJblNjb3BlID0gaW5mby5xdWVyeS5tZXJnZVN5bWJvbFRhYmxlKFtcbiAgICAgICAgICBpbmZvLm1lbWJlcnMsXG4gICAgICAgICAgLy8gU2luY2Ugd2UgYXJlIHRyYXZlcnNpbmcgdGhlIEFTVCBwYXRoIGZyb20gaGVhZCB0byB0YWlsLCBhbnkgdmFyaWFibGVzXG4gICAgICAgICAgLy8gdGhhdCBoYXZlIGJlZW4gZGVjbGFyZWQgc28gZmFyIGFyZSBhbHNvIGluIHNjb3BlLlxuICAgICAgICAgIGluZm8ucXVlcnkuY3JlYXRlU3ltYm9sVGFibGUocmVzdWx0cyksXG4gICAgICAgIF0pO1xuICAgICAgICBzeW1ib2wgPSByZWZpbmVkVmFyaWFibGVUeXBlKHZhcmlhYmxlLnZhbHVlLCBzeW1ib2xzSW5TY29wZSwgaW5mby5xdWVyeSwgY3VycmVudCk7XG4gICAgICB9XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lOiB2YXJpYWJsZS5uYW1lLFxuICAgICAgICBraW5kOiAndmFyaWFibGUnLFxuICAgICAgICB0eXBlOiBzeW1ib2wsIGdldCBkZWZpbml0aW9uKCkgeyByZXR1cm4gZ2V0RGVmaW5pdGlvbk9mKGluZm8sIHZhcmlhYmxlKTsgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBSZXNvbHZlIHRoZSB0eXBlIGZvciB0aGUgdmFyaWFibGUgaW4gYHRlbXBsYXRlRWxlbWVudGAgYnkgZmluZGluZyB0aGUgc3RydWN0dXJhbFxuICogZGlyZWN0aXZlIHdoaWNoIGhhcyB0aGUgY29udGV4dCBtZW1iZXIuIFJldHVybnMgYW55IHdoZW4gbm90IGZvdW5kLlxuICogQHBhcmFtIHZhbHVlIHZhcmlhYmxlIHZhbHVlIG5hbWVcbiAqIEBwYXJhbSBxdWVyeSB0eXBlIHN5bWJvbCBxdWVyeVxuICogQHBhcmFtIHRlbXBsYXRlRWxlbWVudFxuICovXG5mdW5jdGlvbiBnZXRWYXJpYWJsZVR5cGVGcm9tRGlyZWN0aXZlQ29udGV4dChcbiAgICB2YWx1ZTogc3RyaW5nLCBxdWVyeTogU3ltYm9sUXVlcnksIHRlbXBsYXRlRWxlbWVudDogRW1iZWRkZWRUZW1wbGF0ZUFzdCk6IFN5bWJvbCB7XG4gIGZvciAoY29uc3Qge2RpcmVjdGl2ZX0gb2YgdGVtcGxhdGVFbGVtZW50LmRpcmVjdGl2ZXMpIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGNvbnN0IG1lbWJlciA9IGNvbnRleHQuZ2V0KHZhbHVlKTtcbiAgICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIG1lbWJlci50eXBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgbW9yZSBzcGVjaWZpYyB0eXBlIGZvciB0aGUgdmFyaWFibGUgaW4gYHRlbXBsYXRlRWxlbWVudGAgYnkgaW5zcGVjdGluZ1xuICogYWxsIHZhcmlhYmxlcyB0aGF0IGFyZSBpbiBzY29wZSBpbiB0aGUgYG1lcmdlZFRhYmxlYC4gVGhpcyBmdW5jdGlvbiBpcyBhIHNwZWNpYWxcbiAqIGNhc2UgZm9yIGBuZ0ZvcmAgYW5kIGBuZ0lmYC4gSWYgcmVzb2x1dGlvbiBmYWlscywgcmV0dXJuIHRoZSBgYW55YCB0eXBlLlxuICogQHBhcmFtIHZhbHVlIHZhcmlhYmxlIHZhbHVlIG5hbWVcbiAqIEBwYXJhbSBtZXJnZWRUYWJsZSBzeW1ib2wgdGFibGUgZm9yIGFsbCB2YXJpYWJsZXMgaW4gc2NvcGVcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIHRlbXBsYXRlRWxlbWVudFxuICovXG5mdW5jdGlvbiByZWZpbmVkVmFyaWFibGVUeXBlKFxuICAgIHZhbHVlOiBzdHJpbmcsIG1lcmdlZFRhYmxlOiBTeW1ib2xUYWJsZSwgcXVlcnk6IFN5bWJvbFF1ZXJ5LFxuICAgIHRlbXBsYXRlRWxlbWVudDogRW1iZWRkZWRUZW1wbGF0ZUFzdCk6IFN5bWJvbCB7XG4gIGlmICh2YWx1ZSA9PT0gJyRpbXBsaWNpdCcpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2UgdGhlIG5nRm9yIGRpcmVjdGl2ZVxuICAgIGNvbnN0IG5nRm9yRGlyZWN0aXZlID0gdGVtcGxhdGVFbGVtZW50LmRpcmVjdGl2ZXMuZmluZChkID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpZGVudGlmaWVyTmFtZShkLmRpcmVjdGl2ZS50eXBlKTtcbiAgICAgIHJldHVybiBuYW1lID09ICdOZ0ZvcicgfHwgbmFtZSA9PSAnTmdGb3JPZic7XG4gICAgfSk7XG4gICAgaWYgKG5nRm9yRGlyZWN0aXZlKSB7XG4gICAgICBjb25zdCBuZ0Zvck9mQmluZGluZyA9IG5nRm9yRGlyZWN0aXZlLmlucHV0cy5maW5kKGkgPT4gaS5kaXJlY3RpdmVOYW1lID09ICduZ0Zvck9mJyk7XG4gICAgICBpZiAobmdGb3JPZkJpbmRpbmcpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSBrbm93biB0eXBlIGZvciB0aGUgbmdGb3IgYmluZGluZy5cbiAgICAgICAgY29uc3QgYmluZGluZ1R5cGUgPSBuZXcgQXN0VHlwZShtZXJnZWRUYWJsZSwgcXVlcnksIHt9KS5nZXRUeXBlKG5nRm9yT2ZCaW5kaW5nLnZhbHVlKTtcbiAgICAgICAgaWYgKGJpbmRpbmdUeXBlKSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gcXVlcnkuZ2V0RWxlbWVudFR5cGUoYmluZGluZ1R5cGUpO1xuICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU3BlY2lhbCBjYXNlIHRoZSBuZ0lmIGRpcmVjdGl2ZSAoICpuZ0lmPVwiZGF0YSQgfCBhc3luYyBhcyB2YXJpYWJsZVwiIClcbiAgaWYgKHZhbHVlID09PSAnbmdJZicpIHtcbiAgICBjb25zdCBuZ0lmRGlyZWN0aXZlID1cbiAgICAgICAgdGVtcGxhdGVFbGVtZW50LmRpcmVjdGl2ZXMuZmluZChkID0+IGlkZW50aWZpZXJOYW1lKGQuZGlyZWN0aXZlLnR5cGUpID09PSAnTmdJZicpO1xuICAgIGlmIChuZ0lmRGlyZWN0aXZlKSB7XG4gICAgICBjb25zdCBuZ0lmQmluZGluZyA9IG5nSWZEaXJlY3RpdmUuaW5wdXRzLmZpbmQoaSA9PiBpLmRpcmVjdGl2ZU5hbWUgPT09ICduZ0lmJyk7XG4gICAgICBpZiAobmdJZkJpbmRpbmcpIHtcbiAgICAgICAgY29uc3QgYmluZGluZ1R5cGUgPSBuZXcgQXN0VHlwZShtZXJnZWRUYWJsZSwgcXVlcnksIHt9KS5nZXRUeXBlKG5nSWZCaW5kaW5nLnZhbHVlKTtcbiAgICAgICAgaWYgKGJpbmRpbmdUeXBlKSB7XG4gICAgICAgICAgcmV0dXJuIGJpbmRpbmdUeXBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gV2UgY2FuJ3QgZG8gYmV0dGVyLCByZXR1cm4gYW55XG4gIHJldHVybiBxdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xufVxuXG5mdW5jdGlvbiBnZXRFdmVudERlY2xhcmF0aW9uKFxuICAgIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCk6IFN5bWJvbERlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IGV2ZW50ID0gcGF0aC50YWlsO1xuICBpZiAoIShldmVudCBpbnN0YW5jZW9mIEJvdW5kRXZlbnRBc3QpKSB7XG4gICAgLy8gTm8gZXZlbnQgYXZhaWxhYmxlIGluIHRoaXMgY29udGV4dC5cbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBnZW5lcmljRXZlbnQ6IFN5bWJvbERlY2xhcmF0aW9uID0ge1xuICAgIG5hbWU6ICckZXZlbnQnLFxuICAgIGtpbmQ6ICd2YXJpYWJsZScsXG4gICAgdHlwZTogaW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpLFxuICB9O1xuXG4gIGNvbnN0IG91dHB1dFN5bWJvbCA9IGZpbmRPdXRwdXRCaW5kaW5nKGV2ZW50LCBwYXRoLCBpbmZvLnF1ZXJ5KTtcbiAgaWYgKCFvdXRwdXRTeW1ib2wpIHtcbiAgICAvLyBUaGUgYCRldmVudGAgdmFyaWFibGUgZG9lc24ndCBiZWxvbmcgdG8gYW4gb3V0cHV0LCBzbyBpdHMgdHlwZSBjYW4ndCBiZSByZWZpbmVkLlxuICAgIC8vIFRPRE86IHR5cGUgYCRldmVudGAgdmFyaWFibGVzIGluIGJpbmRpbmdzIHRvIERPTSBldmVudHMuXG4gICAgcmV0dXJuIGdlbmVyaWNFdmVudDtcbiAgfVxuXG4gIC8vIFRoZSByYXcgZXZlbnQgdHlwZSBpcyB3cmFwcGVkIGluIGEgZ2VuZXJpYywgbGlrZSBFdmVudEVtaXR0ZXI8VD4gb3IgT2JzZXJ2YWJsZTxUPi5cbiAgY29uc3QgdGEgPSBvdXRwdXRTeW1ib2wudHlwZUFyZ3VtZW50cygpO1xuICBpZiAoIXRhIHx8IHRhLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGdlbmVyaWNFdmVudDtcbiAgY29uc3QgZXZlbnRUeXBlID0gdGFbMF07XG5cbiAgcmV0dXJuIHsuLi5nZW5lcmljRXZlbnQsIHR5cGU6IGV2ZW50VHlwZX07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc3ltYm9scyBhdmFpbGFibGUgaW4gYSBwYXJ0aWN1bGFyIHNjb3BlIG9mIGEgdGVtcGxhdGUuXG4gKiBAcGFyYW0gaW5mbyBwYXJzZWQgdGVtcGxhdGUgaW5mb3JtYXRpb25cbiAqIEBwYXJhbSBwYXRoIHBhdGggb2YgdGVtcGxhdGUgbm9kZXMgbmFycm93aW5nIHRvIHRoZSBjb250ZXh0IHRoZSBleHByZXNzaW9uIHNjb3BlIHNob3VsZCBiZVxuICogZGVyaXZlZCBmb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHByZXNzaW9uU2NvcGUoXG4gICAgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgcGF0aDogVGVtcGxhdGVBc3RQYXRoKTogU3ltYm9sVGFibGUge1xuICBsZXQgcmVzdWx0ID0gaW5mby5tZW1iZXJzO1xuICBjb25zdCByZWZlcmVuY2VzID0gZ2V0UmVmZXJlbmNlcyhpbmZvKTtcbiAgY29uc3QgdmFyaWFibGVzID0gZ2V0VmFyRGVjbGFyYXRpb25zKGluZm8sIHBhdGgpO1xuICBjb25zdCBldmVudCA9IGdldEV2ZW50RGVjbGFyYXRpb24oaW5mbywgcGF0aCk7XG4gIGlmIChyZWZlcmVuY2VzLmxlbmd0aCB8fCB2YXJpYWJsZXMubGVuZ3RoIHx8IGV2ZW50KSB7XG4gICAgY29uc3QgcmVmZXJlbmNlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHJlZmVyZW5jZXMpO1xuICAgIGNvbnN0IHZhcmlhYmxlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHZhcmlhYmxlcyk7XG4gICAgY29uc3QgZXZlbnRzVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKGV2ZW50ID8gW2V2ZW50XSA6IFtdKTtcbiAgICByZXN1bHQgPSBpbmZvLnF1ZXJ5Lm1lcmdlU3ltYm9sVGFibGUoW3Jlc3VsdCwgcmVmZXJlbmNlVGFibGUsIHZhcmlhYmxlVGFibGUsIGV2ZW50c1RhYmxlXSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuY2xhc3MgRXhwcmVzc2lvbkRpYWdub3N0aWNzVmlzaXRvciBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gIHByaXZhdGUgcGF0aDogVGVtcGxhdGVBc3RQYXRoO1xuICBwcml2YXRlIGRpcmVjdGl2ZVN1bW1hcnk6IENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5fHVuZGVmaW5lZDtcblxuICBkaWFnbm9zdGljczogRGlhZ25vc3RpY1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sXG4gICAgICBwcml2YXRlIGdldEV4cHJlc3Npb25TY29wZTogKHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgaW5jbHVkZUV2ZW50OiBib29sZWFuKSA9PiBTeW1ib2xUYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5wYXRoID0gbmV3IEFzdFBhdGg8VGVtcGxhdGVBc3Q+KFtdKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IGNoaWxkIHZpc2l0b3IgdG8gaWdub3JlIHRoZSBob3N0IHByb3BlcnRpZXMgb2YgYSBkaXJlY3RpdmUuXG4gICAgaWYgKGFzdC5pbnB1dHMgJiYgYXN0LmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRlbXBsYXRlVmlzaXRBbGwodGhpcywgYXN0LmlucHV0cywgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIGZhbHNlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0OiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIGZhbHNlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFdmVudChhc3Q6IEJvdW5kRXZlbnRBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QuaGFuZGxlciwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIHRydWUpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdFZhcmlhYmxlKGFzdDogVmFyaWFibGVBc3QpOiB2b2lkIHtcbiAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLmRpcmVjdGl2ZVN1bW1hcnk7XG4gICAgaWYgKGRpcmVjdGl2ZSAmJiBhc3QudmFsdWUpIHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLmluZm8ucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSkgITtcbiAgICAgIGlmIChjb250ZXh0ICYmICFjb250ZXh0Lmhhcyhhc3QudmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IG1pc3NpbmdNZW1iZXIgPVxuICAgICAgICAgICAgYXN0LnZhbHVlID09PSAnJGltcGxpY2l0JyA/ICdhbiBpbXBsaWNpdCB2YWx1ZScgOiBgYSBtZW1iZXIgY2FsbGVkICcke2FzdC52YWx1ZX0nYDtcbiAgICAgICAgdGhpcy5yZXBvcnREaWFnbm9zdGljKFxuICAgICAgICAgICAgYFRoZSB0ZW1wbGF0ZSBjb250ZXh0IG9mICcke2RpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZS5uYW1lfScgZG9lcyBub3QgZGVmaW5lICR7bWlzc2luZ01lbWJlcn0uXFxuYCArXG4gICAgICAgICAgICAgICAgYElmIHRoZSBjb250ZXh0IHR5cGUgaXMgYSBiYXNlIHR5cGUgb3IgJ2FueScsIGNvbnNpZGVyIHJlZmluaW5nIGl0IHRvIGEgbW9yZSBzcGVjaWZpYyB0eXBlLmAsXG4gICAgICAgICAgICBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuU3VnZ2VzdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgc3VwZXIudmlzaXRFbGVtZW50KGFzdCwgY29udGV4dCk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgY29uc3QgcHJldmlvdXNEaXJlY3RpdmVTdW1tYXJ5ID0gdGhpcy5kaXJlY3RpdmVTdW1tYXJ5O1xuXG4gICAgdGhpcy5wdXNoKGFzdCk7XG5cbiAgICAvLyBGaW5kIGRpcmVjdGl2ZSB0aGF0IHJlZmVyZW5jZXMgdGhpcyB0ZW1wbGF0ZVxuICAgIHRoaXMuZGlyZWN0aXZlU3VtbWFyeSA9XG4gICAgICAgIGFzdC5kaXJlY3RpdmVzLm1hcChkID0+IGQuZGlyZWN0aXZlKS5maW5kKGQgPT4gaGFzVGVtcGxhdGVSZWZlcmVuY2UoZC50eXBlKSkgITtcblxuICAgIC8vIFByb2Nlc3MgY2hpbGRyZW5cbiAgICBzdXBlci52aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0LCBjb250ZXh0KTtcblxuICAgIHRoaXMucG9wKCk7XG5cbiAgICB0aGlzLmRpcmVjdGl2ZVN1bW1hcnkgPSBwcmV2aW91c0RpcmVjdGl2ZVN1bW1hcnk7XG4gIH1cblxuICBwcml2YXRlIGF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0OiBUZW1wbGF0ZUFzdCkge1xuICAgIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbih0aGlzLmluZm8uaHRtbEFzdCwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICBjb25zdCBsYXN0ID0gcGF0aC50YWlsO1xuICAgIGlmIChsYXN0IGluc3RhbmNlb2YgQXR0cmlidXRlICYmIGxhc3QudmFsdWVTcGFuKSB7XG4gICAgICByZXR1cm4gbGFzdC52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIH1cbiAgICByZXR1cm4gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICB9XG5cbiAgcHJpdmF0ZSBkaWFnbm9zZUV4cHJlc3Npb24oYXN0OiBBU1QsIG9mZnNldDogbnVtYmVyLCBldmVudDogYm9vbGVhbikge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUodGhpcy5wYXRoLCBldmVudCk7XG4gICAgY29uc3QgYW5hbHl6ZXIgPSBuZXcgQXN0VHlwZShzY29wZSwgdGhpcy5pbmZvLnF1ZXJ5LCB7ZXZlbnR9KTtcbiAgICBmb3IgKGNvbnN0IHttZXNzYWdlLCBzcGFuLCBraW5kfSBvZiBhbmFseXplci5nZXREaWFnbm9zdGljcyhhc3QpKSB7XG4gICAgICBzcGFuLnN0YXJ0ICs9IG9mZnNldDtcbiAgICAgIHNwYW4uZW5kICs9IG9mZnNldDtcbiAgICAgIHRoaXMucmVwb3J0RGlhZ25vc3RpYyhtZXNzYWdlIGFzIHN0cmluZywgc3Bhbiwga2luZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdXNoKGFzdDogVGVtcGxhdGVBc3QpIHsgdGhpcy5wYXRoLnB1c2goYXN0KTsgfVxuXG4gIHByaXZhdGUgcG9wKCkgeyB0aGlzLnBhdGgucG9wKCk7IH1cblxuICBwcml2YXRlIHJlcG9ydERpYWdub3N0aWMoXG4gICAgICBtZXNzYWdlOiBzdHJpbmcsIHNwYW46IFNwYW4sIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSA9IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcikge1xuICAgIHNwYW4uc3RhcnQgKz0gdGhpcy5pbmZvLm9mZnNldDtcbiAgICBzcGFuLmVuZCArPSB0aGlzLmluZm8ub2Zmc2V0O1xuICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaCh7a2luZCwgc3BhbiwgbWVzc2FnZX0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgaWYgKHR5cGUuZGlEZXBzKSB7XG4gICAgZm9yIChsZXQgZGlEZXAgb2YgdHlwZS5kaURlcHMpIHtcbiAgICAgIGlmIChkaURlcC50b2tlbiAmJiBkaURlcC50b2tlbi5pZGVudGlmaWVyICYmXG4gICAgICAgICAgaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4gIS5pZGVudGlmaWVyICEpID09ICdUZW1wbGF0ZVJlZicpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbn1cbiJdfQ==