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
        var visitor = new ExpressionDiagnosticsVisitor(info, function (path, includeEvent) {
            return getExpressionScope(info, path, includeEvent);
        });
        compiler_1.templateVisitAll(visitor, info.templateAst);
        return visitor.diagnostics;
    }
    exports.getTemplateExpressionDiagnostics = getTemplateExpressionDiagnostics;
    function getExpressionDiagnostics(scope, ast, query, context) {
        if (context === void 0) { context = {}; }
        var analyzer = new expression_type_1.AstType(scope, query, context);
        analyzer.getDiagnostics(ast);
        return analyzer.diagnostics;
    }
    exports.getExpressionDiagnostics = getExpressionDiagnostics;
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
                var symbol = info.members.get(variable.value) || info.query.getBuiltinType(symbols_1.BuiltinType.Any);
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
     * Gets the type of an ngFor exported value, as enumerated in
     * https://angular.io/api/common/NgForOfContext
     * @param value exported value name
     * @param query type symbol query
     */
    function getNgForExportedValueType(value, query) {
        switch (value) {
            case 'index':
            case 'count':
                return query.getBuiltinType(symbols_1.BuiltinType.Number);
            case 'first':
            case 'last':
            case 'even':
            case 'odd':
                return query.getBuiltinType(symbols_1.BuiltinType.Boolean);
        }
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
        // Special case the ngFor directive
        var ngForDirective = templateElement.directives.find(function (d) {
            var name = compiler_1.identifierName(d.directive.type);
            return name == 'NgFor' || name == 'NgForOf';
        });
        if (ngForDirective) {
            var ngForOfBinding = ngForDirective.inputs.find(function (i) { return i.directiveName == 'ngForOf'; });
            if (ngForOfBinding) {
                // Check if the variable value is a type exported by the ngFor statement.
                var result = getNgForExportedValueType(value, query);
                // Otherwise, check if there is a known type for the ngFor binding.
                var bindingType = new expression_type_1.AstType(mergedTable, query, {}).getType(ngForOfBinding.value);
                if (!result && bindingType) {
                    result = query.getElementType(bindingType);
                }
                if (result) {
                    return result;
                }
            }
        }
        // Special case the ngIf directive ( *ngIf="data$ | async as variable" )
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
        // We can't do better, return any
        return query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    function getEventDeclaration(info, includeEvent) {
        var result = [];
        if (includeEvent) {
            // TODO: Determine the type of the event parameter based on the Observable<T> or EventEmitter<T>
            // of the event.
            result = [{ name: '$event', kind: 'variable', type: info.query.getBuiltinType(symbols_1.BuiltinType.Any) }];
        }
        return result;
    }
    function getExpressionScope(info, path, includeEvent) {
        var result = info.members;
        var references = getReferences(info);
        var variables = getVarDeclarations(info, path);
        var events = getEventDeclaration(info, includeEvent);
        if (references.length || variables.length || events.length) {
            var referenceTable = info.query.createSymbolTable(references);
            var variableTable = info.query.createSymbolTable(variables);
            var eventsTable = info.query.createSymbolTable(events);
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
                    if (ast.value === '$implicit') {
                        this.reportError('The template context does not have an implicit value', spanOf(ast.sourceSpan));
                    }
                    else {
                        this.reportError("The template context does not define a member called '" + ast.value + "'", spanOf(ast.sourceSpan));
                    }
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
        ExpressionDiagnosticsVisitor.prototype.diagnoseExpression = function (ast, offset, includeEvent) {
            var _a;
            var _this = this;
            var scope = this.getExpressionScope(this.path, includeEvent);
            (_a = this.diagnostics).push.apply(_a, tslib_1.__spread(getExpressionDiagnostics(scope, ast, this.info.query, {
                event: includeEvent
            }).map(function (d) { return ({
                span: offsetSpan(d.ast.span, offset + _this.info.offset),
                kind: d.kind,
                message: d.message
            }); })));
        };
        ExpressionDiagnosticsVisitor.prototype.push = function (ast) { this.path.push(ast); };
        ExpressionDiagnosticsVisitor.prototype.pop = function () { this.path.pop(); };
        ExpressionDiagnosticsVisitor.prototype.reportError = function (message, span) {
            if (span) {
                this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: ts.DiagnosticCategory.Error, message: message });
            }
        };
        ExpressionDiagnosticsVisitor.prototype.reportWarning = function (message, span) {
            this.diagnostics.push({ span: offsetSpan(span, this.info.offset), kind: ts.DiagnosticCategory.Warning, message: message });
        };
        return ExpressionDiagnosticsVisitor;
    }(compiler_1.RecursiveTemplateAstVisitor));
    function hasTemplateReference(type) {
        var e_3, _a;
        if (type.diDeps) {
            try {
                for (var _b = tslib_1.__values(type.diDeps), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var diDep = _c.value;
                    if (diDep.token && diDep.token.identifier &&
                        compiler_1.identifierName(diDep.token.identifier) == 'TemplateRef')
                        return true;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        return false;
    }
    function offsetSpan(span, amount) {
        return { start: span.start + amount, end: span.end + amount };
    }
    function spanOf(sourceSpan) {
        return { start: sourceSpan.start.offset, end: sourceSpan.end.offset };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl9kaWFnbm9zdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVZO0lBQ3ZZLCtCQUFpQztJQUVqQyxpRkFBd0Y7SUFDeEYsaUVBQTZHO0lBRTdHLDZEQUFnRDtJQVdoRCxTQUFnQixnQ0FBZ0MsQ0FBQyxJQUE0QjtRQUMzRSxJQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUE0QixDQUM1QyxJQUFJLEVBQUUsVUFBQyxJQUFxQixFQUFFLFlBQXFCO1lBQ3pDLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUM7UUFBNUMsQ0FBNEMsQ0FBQyxDQUFDO1FBQzVELDJCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUMsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO0lBQzdCLENBQUM7SUFORCw0RUFNQztJQUVELFNBQWdCLHdCQUF3QixDQUNwQyxLQUFrQixFQUFFLEdBQVEsRUFBRSxLQUFrQixFQUNoRCxPQUEwQztRQUExQyx3QkFBQSxFQUFBLFlBQTBDO1FBQzVDLElBQU0sUUFBUSxHQUFHLElBQUkseUJBQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDO0lBQzlCLENBQUM7SUFORCw0REFNQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQTRCO1FBQ2pELElBQU0sTUFBTSxHQUF3QixFQUFFLENBQUM7UUFFdkMsU0FBUyxpQkFBaUIsQ0FBQyxVQUEwQjs7b0NBQ3hDLFNBQVM7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QU0sQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE9BQU8sU0FBQSxFQUFDLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBQ0gsbUNBQUM7SUFBRCxDQUFDLEFBeEhELENBQTJDLHNDQUEyQixHQXdIckU7SUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQXlCOztRQUNyRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7O2dCQUNmLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUExQixJQUFJLEtBQUssV0FBQTtvQkFDWixJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVO3dCQUNyQyx5QkFBYyxDQUFDLEtBQUssQ0FBQyxLQUFPLENBQUMsVUFBWSxDQUFDLElBQUksYUFBYTt3QkFDN0QsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUMsSUFBVSxFQUFFLE1BQWM7UUFDNUMsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsU0FBUyxNQUFNLENBQUMsVUFBMkI7UUFDekMsT0FBTyxFQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQztJQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0UGF0aCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQm91bmRUZXh0QXN0LCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZVR5cGVNZXRhZGF0YSwgRGlyZWN0aXZlQXN0LCBFbGVtZW50QXN0LCBFbWJlZGRlZFRlbXBsYXRlQXN0LCBOb2RlLCBQYXJzZVNvdXJjZVNwYW4sIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciwgUmVmZXJlbmNlQXN0LCBUZW1wbGF0ZUFzdCwgVGVtcGxhdGVBc3RQYXRoLCBWYXJpYWJsZUFzdCwgaWRlbnRpZmllck5hbWUsIHRlbXBsYXRlVmlzaXRBbGwsIHRva2VuUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RUeXBlLCBFeHByZXNzaW9uRGlhZ25vc3RpY3NDb250ZXh0LCBUeXBlRGlhZ25vc3RpY30gZnJvbSAnLi9leHByZXNzaW9uX3R5cGUnO1xuaW1wb3J0IHtCdWlsdGluVHlwZSwgRGVmaW5pdGlvbiwgU3BhbiwgU3ltYm9sLCBTeW1ib2xEZWNsYXJhdGlvbiwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHtEaWFnbm9zdGljfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0UGF0aFRvTm9kZUF0UG9zaXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNUZW1wbGF0ZUluZm8ge1xuICBmaWxlTmFtZT86IHN0cmluZztcbiAgb2Zmc2V0OiBudW1iZXI7XG4gIHF1ZXJ5OiBTeW1ib2xRdWVyeTtcbiAgbWVtYmVyczogU3ltYm9sVGFibGU7XG4gIGh0bWxBc3Q6IE5vZGVbXTtcbiAgdGVtcGxhdGVBc3Q6IFRlbXBsYXRlQXN0W107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljcyhpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvKTogRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uRGlhZ25vc3RpY3NWaXNpdG9yKFxuICAgICAgaW5mbywgKHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgaW5jbHVkZUV2ZW50OiBib29sZWFuKSA9PlxuICAgICAgICAgICAgICAgIGdldEV4cHJlc3Npb25TY29wZShpbmZvLCBwYXRoLCBpbmNsdWRlRXZlbnQpKTtcbiAgdGVtcGxhdGVWaXNpdEFsbCh2aXNpdG9yLCBpbmZvLnRlbXBsYXRlQXN0KTtcbiAgcmV0dXJuIHZpc2l0b3IuZGlhZ25vc3RpY3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHByZXNzaW9uRGlhZ25vc3RpY3MoXG4gICAgc2NvcGU6IFN5bWJvbFRhYmxlLCBhc3Q6IEFTVCwgcXVlcnk6IFN5bWJvbFF1ZXJ5LFxuICAgIGNvbnRleHQ6IEV4cHJlc3Npb25EaWFnbm9zdGljc0NvbnRleHQgPSB7fSk6IFR5cGVEaWFnbm9zdGljW10ge1xuICBjb25zdCBhbmFseXplciA9IG5ldyBBc3RUeXBlKHNjb3BlLCBxdWVyeSwgY29udGV4dCk7XG4gIGFuYWx5emVyLmdldERpYWdub3N0aWNzKGFzdCk7XG4gIHJldHVybiBhbmFseXplci5kaWFnbm9zdGljcztcbn1cblxuZnVuY3Rpb24gZ2V0UmVmZXJlbmNlcyhpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvKTogU3ltYm9sRGVjbGFyYXRpb25bXSB7XG4gIGNvbnN0IHJlc3VsdDogU3ltYm9sRGVjbGFyYXRpb25bXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHByb2Nlc3NSZWZlcmVuY2VzKHJlZmVyZW5jZXM6IFJlZmVyZW5jZUFzdFtdKSB7XG4gICAgZm9yIChjb25zdCByZWZlcmVuY2Ugb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHR5cGU6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAocmVmZXJlbmNlLnZhbHVlKSB7XG4gICAgICAgIHR5cGUgPSBpbmZvLnF1ZXJ5LmdldFR5cGVTeW1ib2wodG9rZW5SZWZlcmVuY2UocmVmZXJlbmNlLnZhbHVlKSk7XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIG5hbWU6IHJlZmVyZW5jZS5uYW1lLFxuICAgICAgICBraW5kOiAncmVmZXJlbmNlJyxcbiAgICAgICAgdHlwZTogdHlwZSB8fCBpbmZvLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSksXG4gICAgICAgIGdldCBkZWZpbml0aW9uKCkgeyByZXR1cm4gZ2V0RGVmaW5pdGlvbk9mKGluZm8sIHJlZmVyZW5jZSk7IH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICAgIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgICBzdXBlci52aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0LCBjb250ZXh0KTtcbiAgICAgIHByb2Nlc3NSZWZlcmVuY2VzKGFzdC5yZWZlcmVuY2VzKTtcbiAgICB9XG4gICAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHN1cGVyLnZpc2l0RWxlbWVudChhc3QsIGNvbnRleHQpO1xuICAgICAgcHJvY2Vzc1JlZmVyZW5jZXMoYXN0LnJlZmVyZW5jZXMpO1xuICAgIH1cbiAgfTtcblxuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGluZm8udGVtcGxhdGVBc3QpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldERlZmluaXRpb25PZihpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBhc3Q6IFRlbXBsYXRlQXN0KTogRGVmaW5pdGlvbnx1bmRlZmluZWQge1xuICBpZiAoaW5mby5maWxlTmFtZSkge1xuICAgIGNvbnN0IHRlbXBsYXRlT2Zmc2V0ID0gaW5mby5vZmZzZXQ7XG4gICAgcmV0dXJuIFt7XG4gICAgICBmaWxlTmFtZTogaW5mby5maWxlTmFtZSxcbiAgICAgIHNwYW46IHtcbiAgICAgICAgc3RhcnQ6IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCArIHRlbXBsYXRlT2Zmc2V0LFxuICAgICAgICBlbmQ6IGFzdC5zb3VyY2VTcGFuLmVuZC5vZmZzZXQgKyB0ZW1wbGF0ZU9mZnNldFxuICAgICAgfVxuICAgIH1dO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhbGwgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIGEgdGVtcGxhdGUgYnkgdHJhdmVyc2luZyB0aGUgc3BlY2lmaWVkXG4gKiBgcGF0aGAuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIHBhdGggdGVtcGxhdGUgQVNUIHBhdGhcbiAqL1xuZnVuY3Rpb24gZ2V0VmFyRGVjbGFyYXRpb25zKFxuICAgIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCk6IFN5bWJvbERlY2xhcmF0aW9uW10ge1xuICBjb25zdCByZXN1bHRzOiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG4gIGZvciAobGV0IGN1cnJlbnQgPSBwYXRoLmhlYWQ7IGN1cnJlbnQ7IGN1cnJlbnQgPSBwYXRoLmNoaWxkT2YoY3VycmVudCkpIHtcbiAgICBpZiAoIShjdXJyZW50IGluc3RhbmNlb2YgRW1iZWRkZWRUZW1wbGF0ZUFzdCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHZhcmlhYmxlIG9mIGN1cnJlbnQudmFyaWFibGVzKSB7XG4gICAgICBsZXQgc3ltYm9sID0gaW5mby5tZW1iZXJzLmdldCh2YXJpYWJsZS52YWx1ZSkgfHwgaW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xuICAgICAgY29uc3Qga2luZCA9IGluZm8ucXVlcnkuZ2V0VHlwZUtpbmQoc3ltYm9sKTtcbiAgICAgIGlmIChraW5kID09PSBCdWlsdGluVHlwZS5BbnkgfHwga2luZCA9PT0gQnVpbHRpblR5cGUuVW5ib3VuZCkge1xuICAgICAgICAvLyBGb3Igc3BlY2lhbCBjYXNlcyBzdWNoIGFzIG5nRm9yIGFuZCBuZ0lmLCB0aGUgYW55IHR5cGUgaXMgbm90IHZlcnkgdXNlZnVsLlxuICAgICAgICAvLyBXZSBjYW4gZG8gYmV0dGVyIGJ5IHJlc29sdmluZyB0aGUgYmluZGluZyB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc3ltYm9sc0luU2NvcGUgPSBpbmZvLnF1ZXJ5Lm1lcmdlU3ltYm9sVGFibGUoW1xuICAgICAgICAgIGluZm8ubWVtYmVycyxcbiAgICAgICAgICAvLyBTaW5jZSB3ZSBhcmUgdHJhdmVyc2luZyB0aGUgQVNUIHBhdGggZnJvbSBoZWFkIHRvIHRhaWwsIGFueSB2YXJpYWJsZXNcbiAgICAgICAgICAvLyB0aGF0IGhhdmUgYmVlbiBkZWNsYXJlZCBzbyBmYXIgYXJlIGFsc28gaW4gc2NvcGUuXG4gICAgICAgICAgaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZShyZXN1bHRzKSxcbiAgICAgICAgXSk7XG4gICAgICAgIHN5bWJvbCA9IHJlZmluZWRWYXJpYWJsZVR5cGUodmFyaWFibGUudmFsdWUsIHN5bWJvbHNJblNjb3BlLCBpbmZvLnF1ZXJ5LCBjdXJyZW50KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWU6IHZhcmlhYmxlLm5hbWUsXG4gICAgICAgIGtpbmQ6ICd2YXJpYWJsZScsXG4gICAgICAgIHR5cGU6IHN5bWJvbCwgZ2V0IGRlZmluaXRpb24oKSB7IHJldHVybiBnZXREZWZpbml0aW9uT2YoaW5mbywgdmFyaWFibGUpOyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHR5cGUgb2YgYW4gbmdGb3IgZXhwb3J0ZWQgdmFsdWUsIGFzIGVudW1lcmF0ZWQgaW5cbiAqIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29tbW9uL05nRm9yT2ZDb250ZXh0XG4gKiBAcGFyYW0gdmFsdWUgZXhwb3J0ZWQgdmFsdWUgbmFtZVxuICogQHBhcmFtIHF1ZXJ5IHR5cGUgc3ltYm9sIHF1ZXJ5XG4gKi9cbmZ1bmN0aW9uIGdldE5nRm9yRXhwb3J0ZWRWYWx1ZVR5cGUodmFsdWU6IHN0cmluZywgcXVlcnk6IFN5bWJvbFF1ZXJ5KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAodmFsdWUpIHtcbiAgICBjYXNlICdpbmRleCc6XG4gICAgY2FzZSAnY291bnQnOlxuICAgICAgcmV0dXJuIHF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLk51bWJlcik7XG4gICAgY2FzZSAnZmlyc3QnOlxuICAgIGNhc2UgJ2xhc3QnOlxuICAgIGNhc2UgJ2V2ZW4nOlxuICAgIGNhc2UgJ29kZCc6XG4gICAgICByZXR1cm4gcXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQm9vbGVhbik7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgbW9yZSBzcGVjaWZpYyB0eXBlIGZvciB0aGUgdmFyaWFibGUgaW4gYHRlbXBsYXRlRWxlbWVudGAgYnkgaW5zcGVjdGluZ1xuICogYWxsIHZhcmlhYmxlcyB0aGF0IGFyZSBpbiBzY29wZSBpbiB0aGUgYG1lcmdlZFRhYmxlYC4gVGhpcyBmdW5jdGlvbiBpcyBhIHNwZWNpYWxcbiAqIGNhc2UgZm9yIGBuZ0ZvcmAgYW5kIGBuZ0lmYC4gSWYgcmVzb2x1dGlvbiBmYWlscywgcmV0dXJuIHRoZSBgYW55YCB0eXBlLlxuICogQHBhcmFtIHZhbHVlIHZhcmlhYmxlIHZhbHVlIG5hbWVcbiAqIEBwYXJhbSBtZXJnZWRUYWJsZSBzeW1ib2wgdGFibGUgZm9yIGFsbCB2YXJpYWJsZXMgaW4gc2NvcGVcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIHRlbXBsYXRlRWxlbWVudFxuICovXG5mdW5jdGlvbiByZWZpbmVkVmFyaWFibGVUeXBlKFxuICAgIHZhbHVlOiBzdHJpbmcsIG1lcmdlZFRhYmxlOiBTeW1ib2xUYWJsZSwgcXVlcnk6IFN5bWJvbFF1ZXJ5LFxuICAgIHRlbXBsYXRlRWxlbWVudDogRW1iZWRkZWRUZW1wbGF0ZUFzdCk6IFN5bWJvbCB7XG4gIC8vIFNwZWNpYWwgY2FzZSB0aGUgbmdGb3IgZGlyZWN0aXZlXG4gIGNvbnN0IG5nRm9yRGlyZWN0aXZlID0gdGVtcGxhdGVFbGVtZW50LmRpcmVjdGl2ZXMuZmluZChkID0+IHtcbiAgICBjb25zdCBuYW1lID0gaWRlbnRpZmllck5hbWUoZC5kaXJlY3RpdmUudHlwZSk7XG4gICAgcmV0dXJuIG5hbWUgPT0gJ05nRm9yJyB8fCBuYW1lID09ICdOZ0Zvck9mJztcbiAgfSk7XG4gIGlmIChuZ0ZvckRpcmVjdGl2ZSkge1xuICAgIGNvbnN0IG5nRm9yT2ZCaW5kaW5nID0gbmdGb3JEaXJlY3RpdmUuaW5wdXRzLmZpbmQoaSA9PiBpLmRpcmVjdGl2ZU5hbWUgPT0gJ25nRm9yT2YnKTtcbiAgICBpZiAobmdGb3JPZkJpbmRpbmcpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSB2YXJpYWJsZSB2YWx1ZSBpcyBhIHR5cGUgZXhwb3J0ZWQgYnkgdGhlIG5nRm9yIHN0YXRlbWVudC5cbiAgICAgIGxldCByZXN1bHQgPSBnZXROZ0ZvckV4cG9ydGVkVmFsdWVUeXBlKHZhbHVlLCBxdWVyeSk7XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgY2hlY2sgaWYgdGhlcmUgaXMgYSBrbm93biB0eXBlIGZvciB0aGUgbmdGb3IgYmluZGluZy5cbiAgICAgIGNvbnN0IGJpbmRpbmdUeXBlID0gbmV3IEFzdFR5cGUobWVyZ2VkVGFibGUsIHF1ZXJ5LCB7fSkuZ2V0VHlwZShuZ0Zvck9mQmluZGluZy52YWx1ZSk7XG4gICAgICBpZiAoIXJlc3VsdCAmJiBiaW5kaW5nVHlwZSkge1xuICAgICAgICByZXN1bHQgPSBxdWVyeS5nZXRFbGVtZW50VHlwZShiaW5kaW5nVHlwZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgdGhlIG5nSWYgZGlyZWN0aXZlICggKm5nSWY9XCJkYXRhJCB8IGFzeW5jIGFzIHZhcmlhYmxlXCIgKVxuICBjb25zdCBuZ0lmRGlyZWN0aXZlID1cbiAgICAgIHRlbXBsYXRlRWxlbWVudC5kaXJlY3RpdmVzLmZpbmQoZCA9PiBpZGVudGlmaWVyTmFtZShkLmRpcmVjdGl2ZS50eXBlKSA9PT0gJ05nSWYnKTtcbiAgaWYgKG5nSWZEaXJlY3RpdmUpIHtcbiAgICBjb25zdCBuZ0lmQmluZGluZyA9IG5nSWZEaXJlY3RpdmUuaW5wdXRzLmZpbmQoaSA9PiBpLmRpcmVjdGl2ZU5hbWUgPT09ICduZ0lmJyk7XG4gICAgaWYgKG5nSWZCaW5kaW5nKSB7XG4gICAgICBjb25zdCBiaW5kaW5nVHlwZSA9IG5ldyBBc3RUeXBlKG1lcmdlZFRhYmxlLCBxdWVyeSwge30pLmdldFR5cGUobmdJZkJpbmRpbmcudmFsdWUpO1xuICAgICAgaWYgKGJpbmRpbmdUeXBlKSB7XG4gICAgICAgIHJldHVybiBiaW5kaW5nVHlwZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBjYW4ndCBkbyBiZXR0ZXIsIHJldHVybiBhbnlcbiAgcmV0dXJuIHF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG59XG5cbmZ1bmN0aW9uIGdldEV2ZW50RGVjbGFyYXRpb24oaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgaW5jbHVkZUV2ZW50PzogYm9vbGVhbikge1xuICBsZXQgcmVzdWx0OiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG4gIGlmIChpbmNsdWRlRXZlbnQpIHtcbiAgICAvLyBUT0RPOiBEZXRlcm1pbmUgdGhlIHR5cGUgb2YgdGhlIGV2ZW50IHBhcmFtZXRlciBiYXNlZCBvbiB0aGUgT2JzZXJ2YWJsZTxUPiBvciBFdmVudEVtaXR0ZXI8VD5cbiAgICAvLyBvZiB0aGUgZXZlbnQuXG4gICAgcmVzdWx0ID0gW3tuYW1lOiAnJGV2ZW50Jywga2luZDogJ3ZhcmlhYmxlJywgdHlwZTogaW5mby5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpfV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25TY29wZShcbiAgICBpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgsIGluY2x1ZGVFdmVudDogYm9vbGVhbik6IFN5bWJvbFRhYmxlIHtcbiAgbGV0IHJlc3VsdCA9IGluZm8ubWVtYmVycztcbiAgY29uc3QgcmVmZXJlbmNlcyA9IGdldFJlZmVyZW5jZXMoaW5mbyk7XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGdldFZhckRlY2xhcmF0aW9ucyhpbmZvLCBwYXRoKTtcbiAgY29uc3QgZXZlbnRzID0gZ2V0RXZlbnREZWNsYXJhdGlvbihpbmZvLCBpbmNsdWRlRXZlbnQpO1xuICBpZiAocmVmZXJlbmNlcy5sZW5ndGggfHwgdmFyaWFibGVzLmxlbmd0aCB8fCBldmVudHMubGVuZ3RoKSB7XG4gICAgY29uc3QgcmVmZXJlbmNlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHJlZmVyZW5jZXMpO1xuICAgIGNvbnN0IHZhcmlhYmxlVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHZhcmlhYmxlcyk7XG4gICAgY29uc3QgZXZlbnRzVGFibGUgPSBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKGV2ZW50cyk7XG4gICAgcmVzdWx0ID0gaW5mby5xdWVyeS5tZXJnZVN5bWJvbFRhYmxlKFtyZXN1bHQsIHJlZmVyZW5jZVRhYmxlLCB2YXJpYWJsZVRhYmxlLCBldmVudHNUYWJsZV0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmNsYXNzIEV4cHJlc3Npb25EaWFnbm9zdGljc1Zpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICBwcml2YXRlIHBhdGg6IFRlbXBsYXRlQXN0UGF0aDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgZGlyZWN0aXZlU3VtbWFyeSAhOiBDb21waWxlRGlyZWN0aXZlU3VtbWFyeTtcblxuICBkaWFnbm9zdGljczogRGlhZ25vc3RpY1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sXG4gICAgICBwcml2YXRlIGdldEV4cHJlc3Npb25TY29wZTogKHBhdGg6IFRlbXBsYXRlQXN0UGF0aCwgaW5jbHVkZUV2ZW50OiBib29sZWFuKSA9PiBTeW1ib2xUYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5wYXRoID0gbmV3IEFzdFBhdGg8VGVtcGxhdGVBc3Q+KFtdKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIC8vIE92ZXJyaWRlIHRoZSBkZWZhdWx0IGNoaWxkIHZpc2l0b3IgdG8gaWdub3JlIHRoZSBob3N0IHByb3BlcnRpZXMgb2YgYSBkaXJlY3RpdmUuXG4gICAgaWYgKGFzdC5pbnB1dHMgJiYgYXN0LmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRlbXBsYXRlVmlzaXRBbGwodGhpcywgYXN0LmlucHV0cywgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIGZhbHNlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0OiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIGZhbHNlKTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFdmVudChhc3Q6IEJvdW5kRXZlbnRBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICB0aGlzLmRpYWdub3NlRXhwcmVzc2lvbihhc3QuaGFuZGxlciwgdGhpcy5hdHRyaWJ1dGVWYWx1ZUxvY2F0aW9uKGFzdCksIHRydWUpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdFZhcmlhYmxlKGFzdDogVmFyaWFibGVBc3QpOiB2b2lkIHtcbiAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLmRpcmVjdGl2ZVN1bW1hcnk7XG4gICAgaWYgKGRpcmVjdGl2ZSAmJiBhc3QudmFsdWUpIHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLmluZm8ucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZS50eXBlLnJlZmVyZW5jZSkgITtcbiAgICAgIGlmIChjb250ZXh0ICYmICFjb250ZXh0Lmhhcyhhc3QudmFsdWUpKSB7XG4gICAgICAgIGlmIChhc3QudmFsdWUgPT09ICckaW1wbGljaXQnKSB7XG4gICAgICAgICAgdGhpcy5yZXBvcnRFcnJvcihcbiAgICAgICAgICAgICAgJ1RoZSB0ZW1wbGF0ZSBjb250ZXh0IGRvZXMgbm90IGhhdmUgYW4gaW1wbGljaXQgdmFsdWUnLCBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnJlcG9ydEVycm9yKFxuICAgICAgICAgICAgICBgVGhlIHRlbXBsYXRlIGNvbnRleHQgZG9lcyBub3QgZGVmaW5lIGEgbWVtYmVyIGNhbGxlZCAnJHthc3QudmFsdWV9J2AsXG4gICAgICAgICAgICAgIHNwYW5PZihhc3Quc291cmNlU3BhbikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCwgY29udGV4dDogYW55KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgc3VwZXIudmlzaXRFbGVtZW50KGFzdCwgY29udGV4dCk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgY29uc3QgcHJldmlvdXNEaXJlY3RpdmVTdW1tYXJ5ID0gdGhpcy5kaXJlY3RpdmVTdW1tYXJ5O1xuXG4gICAgdGhpcy5wdXNoKGFzdCk7XG5cbiAgICAvLyBGaW5kIGRpcmVjdGl2ZSB0aGF0IHJlZmVyZW5jZXMgdGhpcyB0ZW1wbGF0ZVxuICAgIHRoaXMuZGlyZWN0aXZlU3VtbWFyeSA9XG4gICAgICAgIGFzdC5kaXJlY3RpdmVzLm1hcChkID0+IGQuZGlyZWN0aXZlKS5maW5kKGQgPT4gaGFzVGVtcGxhdGVSZWZlcmVuY2UoZC50eXBlKSkgITtcblxuICAgIC8vIFByb2Nlc3MgY2hpbGRyZW5cbiAgICBzdXBlci52aXNpdEVtYmVkZGVkVGVtcGxhdGUoYXN0LCBjb250ZXh0KTtcblxuICAgIHRoaXMucG9wKCk7XG5cbiAgICB0aGlzLmRpcmVjdGl2ZVN1bW1hcnkgPSBwcmV2aW91c0RpcmVjdGl2ZVN1bW1hcnk7XG4gIH1cblxuICBwcml2YXRlIGF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0OiBUZW1wbGF0ZUFzdCkge1xuICAgIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbih0aGlzLmluZm8uaHRtbEFzdCwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICBjb25zdCBsYXN0ID0gcGF0aC50YWlsO1xuICAgIGlmIChsYXN0IGluc3RhbmNlb2YgQXR0cmlidXRlICYmIGxhc3QudmFsdWVTcGFuKSB7XG4gICAgICByZXR1cm4gbGFzdC52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIH1cbiAgICByZXR1cm4gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICB9XG5cbiAgcHJpdmF0ZSBkaWFnbm9zZUV4cHJlc3Npb24oYXN0OiBBU1QsIG9mZnNldDogbnVtYmVyLCBpbmNsdWRlRXZlbnQ6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKHRoaXMucGF0aCwgaW5jbHVkZUV2ZW50KTtcbiAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goLi4uZ2V0RXhwcmVzc2lvbkRpYWdub3N0aWNzKHNjb3BlLCBhc3QsIHRoaXMuaW5mby5xdWVyeSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBpbmNsdWRlRXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSkubWFwKGQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Bhbjogb2Zmc2V0U3BhbihkLmFzdC5zcGFuLCBvZmZzZXQgKyB0aGlzLmluZm8ub2Zmc2V0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZDogZC5raW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBkLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gIH1cblxuICBwcml2YXRlIHB1c2goYXN0OiBUZW1wbGF0ZUFzdCkgeyB0aGlzLnBhdGgucHVzaChhc3QpOyB9XG5cbiAgcHJpdmF0ZSBwb3AoKSB7IHRoaXMucGF0aC5wb3AoKTsgfVxuXG4gIHByaXZhdGUgcmVwb3J0RXJyb3IobWVzc2FnZTogc3RyaW5nLCBzcGFuOiBTcGFufHVuZGVmaW5lZCkge1xuICAgIGlmIChzcGFuKSB7XG4gICAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAge3NwYW46IG9mZnNldFNwYW4oc3BhbiwgdGhpcy5pbmZvLm9mZnNldCksIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvciwgbWVzc2FnZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0V2FybmluZyhtZXNzYWdlOiBzdHJpbmcsIHNwYW46IFNwYW4pIHtcbiAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIHtzcGFuOiBvZmZzZXRTcGFuKHNwYW4sIHRoaXMuaW5mby5vZmZzZXQpLCBraW5kOiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuV2FybmluZywgbWVzc2FnZX0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgaWYgKHR5cGUuZGlEZXBzKSB7XG4gICAgZm9yIChsZXQgZGlEZXAgb2YgdHlwZS5kaURlcHMpIHtcbiAgICAgIGlmIChkaURlcC50b2tlbiAmJiBkaURlcC50b2tlbi5pZGVudGlmaWVyICYmXG4gICAgICAgICAgaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4gIS5pZGVudGlmaWVyICEpID09ICdUZW1wbGF0ZVJlZicpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9mZnNldFNwYW4oc3BhbjogU3BhbiwgYW1vdW50OiBudW1iZXIpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydCArIGFtb3VudCwgZW5kOiBzcGFuLmVuZCArIGFtb3VudH07XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbn1cbiJdfQ==