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
    function getEventDeclaration(info, path) {
        var result = [];
        if (path.tail instanceof compiler_1.BoundEventAst) {
            // TODO: Determine the type of the event parameter based on the Observable<T> or EventEmitter<T>
            // of the event.
            result = [{ name: '$event', kind: 'variable', type: info.query.getBuiltinType(symbols_1.BuiltinType.Any) }];
        }
        return result;
    }
    function getExpressionScope(info, path) {
        var result = info.members;
        var references = getReferences(info);
        var variables = getVarDeclarations(info, path);
        var events = getEventDeclaration(info, path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl9kaWFnbm9zdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVZO0lBQ3ZZLCtCQUFpQztJQUVqQyxpRkFBd0Y7SUFDeEYsaUVBQTZHO0lBRTdHLDZEQUFnRDtJQVdoRCxTQUFnQixnQ0FBZ0MsQ0FBQyxJQUE0QjtRQUMzRSxJQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUE0QixDQUM1QyxJQUFJLEVBQUUsVUFBQyxJQUFxQixJQUFLLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUE5QixDQUE4QixDQUFDLENBQUM7UUFDckUsMkJBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QyxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDN0IsQ0FBQztJQUxELDRFQUtDO0lBRUQsU0FBZ0Isd0JBQXdCLENBQ3BDLEtBQWtCLEVBQUUsR0FBUSxFQUFFLEtBQWtCLEVBQ2hELE9BQTBDO1FBQTFDLHdCQUFBLEVBQUEsWUFBMEM7UUFDNUMsSUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBTyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEQsUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUM7SUFDOUIsQ0FBQztJQU5ELDREQU1DO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBNEI7UUFDakQsSUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztRQUV2QyxTQUFTLGlCQUFpQixDQUFDLFVBQTBCOztvQ0FDeEMsU0FBUztnQkFDbEIsSUFBSSxJQUFJLEdBQXFC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QyxNQUFNLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTFCLElBQUksS0FBSyxXQUFBO29CQUNaLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVU7d0JBQ3JDLHlCQUFjLENBQUMsS0FBSyxDQUFDLEtBQU8sQ0FBQyxVQUFZLENBQUMsSUFBSSxhQUFhO3dCQUM3RCxPQUFPLElBQUksQ0FBQztpQkFDZjs7Ozs7Ozs7O1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFVLEVBQUUsTUFBYztRQUM1QyxPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxTQUFTLE1BQU0sQ0FBQyxVQUEyQjtRQUN6QyxPQUFPLEVBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDO0lBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBc3RQYXRoLCBBdHRyaWJ1dGUsIEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIEJvdW5kRWxlbWVudFByb3BlcnR5QXN0LCBCb3VuZEV2ZW50QXN0LCBCb3VuZFRleHRBc3QsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlVHlwZU1ldGFkYXRhLCBEaXJlY3RpdmVBc3QsIEVsZW1lbnRBc3QsIEVtYmVkZGVkVGVtcGxhdGVBc3QsIE5vZGUsIFBhcnNlU291cmNlU3BhbiwgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yLCBSZWZlcmVuY2VBc3QsIFRlbXBsYXRlQXN0LCBUZW1wbGF0ZUFzdFBhdGgsIFZhcmlhYmxlQXN0LCBpZGVudGlmaWVyTmFtZSwgdGVtcGxhdGVWaXNpdEFsbCwgdG9rZW5SZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFR5cGUsIEV4cHJlc3Npb25EaWFnbm9zdGljc0NvbnRleHQsIFR5cGVEaWFnbm9zdGljfSBmcm9tICcuL2V4cHJlc3Npb25fdHlwZSc7XG5pbXBvcnQge0J1aWx0aW5UeXBlLCBEZWZpbml0aW9uLCBTcGFuLCBTeW1ib2wsIFN5bWJvbERlY2xhcmF0aW9uLCBTeW1ib2xRdWVyeSwgU3ltYm9sVGFibGV9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQge0RpYWdub3N0aWN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyB7XG4gIGZpbGVOYW1lPzogc3RyaW5nO1xuICBvZmZzZXQ6IG51bWJlcjtcbiAgcXVlcnk6IFN5bWJvbFF1ZXJ5O1xuICBtZW1iZXJzOiBTeW1ib2xUYWJsZTtcbiAgaHRtbEFzdDogTm9kZVtdO1xuICB0ZW1wbGF0ZUFzdDogVGVtcGxhdGVBc3RbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8pOiBEaWFnbm9zdGljW10ge1xuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25EaWFnbm9zdGljc1Zpc2l0b3IoXG4gICAgICBpbmZvLCAocGF0aDogVGVtcGxhdGVBc3RQYXRoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoaW5mbywgcGF0aCkpO1xuICB0ZW1wbGF0ZVZpc2l0QWxsKHZpc2l0b3IsIGluZm8udGVtcGxhdGVBc3QpO1xuICByZXR1cm4gdmlzaXRvci5kaWFnbm9zdGljcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25EaWFnbm9zdGljcyhcbiAgICBzY29wZTogU3ltYm9sVGFibGUsIGFzdDogQVNULCBxdWVyeTogU3ltYm9sUXVlcnksXG4gICAgY29udGV4dDogRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCA9IHt9KTogVHlwZURpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGFuYWx5emVyID0gbmV3IEFzdFR5cGUoc2NvcGUsIHF1ZXJ5LCBjb250ZXh0KTtcbiAgYW5hbHl6ZXIuZ2V0RGlhZ25vc3RpY3MoYXN0KTtcbiAgcmV0dXJuIGFuYWx5emVyLmRpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBnZXRSZWZlcmVuY2VzKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8pOiBTeW1ib2xEZWNsYXJhdGlvbltdIHtcbiAgY29uc3QgcmVzdWx0OiBTeW1ib2xEZWNsYXJhdGlvbltdID0gW107XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc1JlZmVyZW5jZXMocmVmZXJlbmNlczogUmVmZXJlbmNlQXN0W10pIHtcbiAgICBmb3IgKGNvbnN0IHJlZmVyZW5jZSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChyZWZlcmVuY2UudmFsdWUpIHtcbiAgICAgICAgdHlwZSA9IGluZm8ucXVlcnkuZ2V0VHlwZVN5bWJvbCh0b2tlblJlZmVyZW5jZShyZWZlcmVuY2UudmFsdWUpKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogcmVmZXJlbmNlLm5hbWUsXG4gICAgICAgIGtpbmQ6ICdyZWZlcmVuY2UnLFxuICAgICAgICB0eXBlOiB0eXBlIHx8IGluZm8ucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KSxcbiAgICAgICAgZ2V0IGRlZmluaXRpb24oKSB7IHJldHVybiBnZXREZWZpbml0aW9uT2YoaW5mbywgcmVmZXJlbmNlKTsgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBjbGFzcyBleHRlbmRzIFJlY3Vyc2l2ZVRlbXBsYXRlQXN0VmlzaXRvciB7XG4gICAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICAgIHN1cGVyLnZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQpO1xuICAgICAgcHJvY2Vzc1JlZmVyZW5jZXMoYXN0LnJlZmVyZW5jZXMpO1xuICAgIH1cbiAgICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgICAgc3VwZXIudmlzaXRFbGVtZW50KGFzdCwgY29udGV4dCk7XG4gICAgICBwcm9jZXNzUmVmZXJlbmNlcyhhc3QucmVmZXJlbmNlcyk7XG4gICAgfVxuICB9O1xuXG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgaW5mby50ZW1wbGF0ZUFzdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbk9mKGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIGFzdDogVGVtcGxhdGVBc3QpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gIGlmIChpbmZvLmZpbGVOYW1lKSB7XG4gICAgY29uc3QgdGVtcGxhdGVPZmZzZXQgPSBpbmZvLm9mZnNldDtcbiAgICByZXR1cm4gW3tcbiAgICAgIGZpbGVOYW1lOiBpbmZvLmZpbGVOYW1lLFxuICAgICAgc3Bhbjoge1xuICAgICAgICBzdGFydDogYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0ICsgdGVtcGxhdGVPZmZzZXQsXG4gICAgICAgIGVuZDogYXN0LnNvdXJjZVNwYW4uZW5kLm9mZnNldCArIHRlbXBsYXRlT2Zmc2V0XG4gICAgICB9XG4gICAgfV07XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGFsbCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW4gYSB0ZW1wbGF0ZSBieSB0cmF2ZXJzaW5nIHRoZSBzcGVjaWZpZWRcbiAqIGBwYXRoYC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gcGF0aCB0ZW1wbGF0ZSBBU1QgcGF0aFxuICovXG5mdW5jdGlvbiBnZXRWYXJEZWNsYXJhdGlvbnMoXG4gICAgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbywgcGF0aDogVGVtcGxhdGVBc3RQYXRoKTogU3ltYm9sRGVjbGFyYXRpb25bXSB7XG4gIGNvbnN0IHJlc3VsdHM6IFN5bWJvbERlY2xhcmF0aW9uW10gPSBbXTtcbiAgZm9yIChsZXQgY3VycmVudCA9IHBhdGguaGVhZDsgY3VycmVudDsgY3VycmVudCA9IHBhdGguY2hpbGRPZihjdXJyZW50KSkge1xuICAgIGlmICghKGN1cnJlbnQgaW5zdGFuY2VvZiBFbWJlZGRlZFRlbXBsYXRlQXN0KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgY3VycmVudC52YXJpYWJsZXMpIHtcbiAgICAgIGxldCBzeW1ib2wgPSBpbmZvLm1lbWJlcnMuZ2V0KHZhcmlhYmxlLnZhbHVlKSB8fCBpbmZvLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG4gICAgICBjb25zdCBraW5kID0gaW5mby5xdWVyeS5nZXRUeXBlS2luZChzeW1ib2wpO1xuICAgICAgaWYgKGtpbmQgPT09IEJ1aWx0aW5UeXBlLkFueSB8fCBraW5kID09PSBCdWlsdGluVHlwZS5VbmJvdW5kKSB7XG4gICAgICAgIC8vIEZvciBzcGVjaWFsIGNhc2VzIHN1Y2ggYXMgbmdGb3IgYW5kIG5nSWYsIHRoZSBhbnkgdHlwZSBpcyBub3QgdmVyeSB1c2VmdWwuXG4gICAgICAgIC8vIFdlIGNhbiBkbyBiZXR0ZXIgYnkgcmVzb2x2aW5nIHRoZSBiaW5kaW5nIHZhbHVlLlxuICAgICAgICBjb25zdCBzeW1ib2xzSW5TY29wZSA9IGluZm8ucXVlcnkubWVyZ2VTeW1ib2xUYWJsZShbXG4gICAgICAgICAgaW5mby5tZW1iZXJzLFxuICAgICAgICAgIC8vIFNpbmNlIHdlIGFyZSB0cmF2ZXJzaW5nIHRoZSBBU1QgcGF0aCBmcm9tIGhlYWQgdG8gdGFpbCwgYW55IHZhcmlhYmxlc1xuICAgICAgICAgIC8vIHRoYXQgaGF2ZSBiZWVuIGRlY2xhcmVkIHNvIGZhciBhcmUgYWxzbyBpbiBzY29wZS5cbiAgICAgICAgICBpbmZvLnF1ZXJ5LmNyZWF0ZVN5bWJvbFRhYmxlKHJlc3VsdHMpLFxuICAgICAgICBdKTtcbiAgICAgICAgc3ltYm9sID0gcmVmaW5lZFZhcmlhYmxlVHlwZSh2YXJpYWJsZS52YWx1ZSwgc3ltYm9sc0luU2NvcGUsIGluZm8ucXVlcnksIGN1cnJlbnQpO1xuICAgICAgfVxuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZTogdmFyaWFibGUubmFtZSxcbiAgICAgICAga2luZDogJ3ZhcmlhYmxlJyxcbiAgICAgICAgdHlwZTogc3ltYm9sLCBnZXQgZGVmaW5pdGlvbigpIHsgcmV0dXJuIGdldERlZmluaXRpb25PZihpbmZvLCB2YXJpYWJsZSk7IH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgdHlwZSBvZiBhbiBuZ0ZvciBleHBvcnRlZCB2YWx1ZSwgYXMgZW51bWVyYXRlZCBpblxuICogaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9jb21tb24vTmdGb3JPZkNvbnRleHRcbiAqIEBwYXJhbSB2YWx1ZSBleHBvcnRlZCB2YWx1ZSBuYW1lXG4gKiBAcGFyYW0gcXVlcnkgdHlwZSBzeW1ib2wgcXVlcnlcbiAqL1xuZnVuY3Rpb24gZ2V0TmdGb3JFeHBvcnRlZFZhbHVlVHlwZSh2YWx1ZTogc3RyaW5nLCBxdWVyeTogU3ltYm9sUXVlcnkpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgc3dpdGNoICh2YWx1ZSkge1xuICAgIGNhc2UgJ2luZGV4JzpcbiAgICBjYXNlICdjb3VudCc6XG4gICAgICByZXR1cm4gcXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuTnVtYmVyKTtcbiAgICBjYXNlICdmaXJzdCc6XG4gICAgY2FzZSAnbGFzdCc6XG4gICAgY2FzZSAnZXZlbic6XG4gICAgY2FzZSAnb2RkJzpcbiAgICAgIHJldHVybiBxdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5Cb29sZWFuKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSBtb3JlIHNwZWNpZmljIHR5cGUgZm9yIHRoZSB2YXJpYWJsZSBpbiBgdGVtcGxhdGVFbGVtZW50YCBieSBpbnNwZWN0aW5nXG4gKiBhbGwgdmFyaWFibGVzIHRoYXQgYXJlIGluIHNjb3BlIGluIHRoZSBgbWVyZ2VkVGFibGVgLiBUaGlzIGZ1bmN0aW9uIGlzIGEgc3BlY2lhbFxuICogY2FzZSBmb3IgYG5nRm9yYCBhbmQgYG5nSWZgLiBJZiByZXNvbHV0aW9uIGZhaWxzLCByZXR1cm4gdGhlIGBhbnlgIHR5cGUuXG4gKiBAcGFyYW0gdmFsdWUgdmFyaWFibGUgdmFsdWUgbmFtZVxuICogQHBhcmFtIG1lcmdlZFRhYmxlIHN5bWJvbCB0YWJsZSBmb3IgYWxsIHZhcmlhYmxlcyBpbiBzY29wZVxuICogQHBhcmFtIHF1ZXJ5XG4gKiBAcGFyYW0gdGVtcGxhdGVFbGVtZW50XG4gKi9cbmZ1bmN0aW9uIHJlZmluZWRWYXJpYWJsZVR5cGUoXG4gICAgdmFsdWU6IHN0cmluZywgbWVyZ2VkVGFibGU6IFN5bWJvbFRhYmxlLCBxdWVyeTogU3ltYm9sUXVlcnksXG4gICAgdGVtcGxhdGVFbGVtZW50OiBFbWJlZGRlZFRlbXBsYXRlQXN0KTogU3ltYm9sIHtcbiAgLy8gU3BlY2lhbCBjYXNlIHRoZSBuZ0ZvciBkaXJlY3RpdmVcbiAgY29uc3QgbmdGb3JEaXJlY3RpdmUgPSB0ZW1wbGF0ZUVsZW1lbnQuZGlyZWN0aXZlcy5maW5kKGQgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSBpZGVudGlmaWVyTmFtZShkLmRpcmVjdGl2ZS50eXBlKTtcbiAgICByZXR1cm4gbmFtZSA9PSAnTmdGb3InIHx8IG5hbWUgPT0gJ05nRm9yT2YnO1xuICB9KTtcbiAgaWYgKG5nRm9yRGlyZWN0aXZlKSB7XG4gICAgY29uc3QgbmdGb3JPZkJpbmRpbmcgPSBuZ0ZvckRpcmVjdGl2ZS5pbnB1dHMuZmluZChpID0+IGkuZGlyZWN0aXZlTmFtZSA9PSAnbmdGb3JPZicpO1xuICAgIGlmIChuZ0Zvck9mQmluZGluZykge1xuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHZhcmlhYmxlIHZhbHVlIGlzIGEgdHlwZSBleHBvcnRlZCBieSB0aGUgbmdGb3Igc3RhdGVtZW50LlxuICAgICAgbGV0IHJlc3VsdCA9IGdldE5nRm9yRXhwb3J0ZWRWYWx1ZVR5cGUodmFsdWUsIHF1ZXJ5KTtcblxuICAgICAgLy8gT3RoZXJ3aXNlLCBjaGVjayBpZiB0aGVyZSBpcyBhIGtub3duIHR5cGUgZm9yIHRoZSBuZ0ZvciBiaW5kaW5nLlxuICAgICAgY29uc3QgYmluZGluZ1R5cGUgPSBuZXcgQXN0VHlwZShtZXJnZWRUYWJsZSwgcXVlcnksIHt9KS5nZXRUeXBlKG5nRm9yT2ZCaW5kaW5nLnZhbHVlKTtcbiAgICAgIGlmICghcmVzdWx0ICYmIGJpbmRpbmdUeXBlKSB7XG4gICAgICAgIHJlc3VsdCA9IHF1ZXJ5LmdldEVsZW1lbnRUeXBlKGJpbmRpbmdUeXBlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNwZWNpYWwgY2FzZSB0aGUgbmdJZiBkaXJlY3RpdmUgKCAqbmdJZj1cImRhdGEkIHwgYXN5bmMgYXMgdmFyaWFibGVcIiApXG4gIGNvbnN0IG5nSWZEaXJlY3RpdmUgPVxuICAgICAgdGVtcGxhdGVFbGVtZW50LmRpcmVjdGl2ZXMuZmluZChkID0+IGlkZW50aWZpZXJOYW1lKGQuZGlyZWN0aXZlLnR5cGUpID09PSAnTmdJZicpO1xuICBpZiAobmdJZkRpcmVjdGl2ZSkge1xuICAgIGNvbnN0IG5nSWZCaW5kaW5nID0gbmdJZkRpcmVjdGl2ZS5pbnB1dHMuZmluZChpID0+IGkuZGlyZWN0aXZlTmFtZSA9PT0gJ25nSWYnKTtcbiAgICBpZiAobmdJZkJpbmRpbmcpIHtcbiAgICAgIGNvbnN0IGJpbmRpbmdUeXBlID0gbmV3IEFzdFR5cGUobWVyZ2VkVGFibGUsIHF1ZXJ5LCB7fSkuZ2V0VHlwZShuZ0lmQmluZGluZy52YWx1ZSk7XG4gICAgICBpZiAoYmluZGluZ1R5cGUpIHtcbiAgICAgICAgcmV0dXJuIGJpbmRpbmdUeXBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFdlIGNhbid0IGRvIGJldHRlciwgcmV0dXJuIGFueVxuICByZXR1cm4gcXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbn1cblxuZnVuY3Rpb24gZ2V0RXZlbnREZWNsYXJhdGlvbihpbmZvOiBEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBwYXRoOiBUZW1wbGF0ZUFzdFBhdGgpIHtcbiAgbGV0IHJlc3VsdDogU3ltYm9sRGVjbGFyYXRpb25bXSA9IFtdO1xuICBpZiAocGF0aC50YWlsIGluc3RhbmNlb2YgQm91bmRFdmVudEFzdCkge1xuICAgIC8vIFRPRE86IERldGVybWluZSB0aGUgdHlwZSBvZiB0aGUgZXZlbnQgcGFyYW1ldGVyIGJhc2VkIG9uIHRoZSBPYnNlcnZhYmxlPFQ+IG9yIEV2ZW50RW1pdHRlcjxUPlxuICAgIC8vIG9mIHRoZSBldmVudC5cbiAgICByZXN1bHQgPSBbe25hbWU6ICckZXZlbnQnLCBraW5kOiAndmFyaWFibGUnLCB0eXBlOiBpbmZvLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSl9XTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhwcmVzc2lvblNjb3BlKFxuICAgIGluZm86IERpYWdub3N0aWNUZW1wbGF0ZUluZm8sIHBhdGg6IFRlbXBsYXRlQXN0UGF0aCk6IFN5bWJvbFRhYmxlIHtcbiAgbGV0IHJlc3VsdCA9IGluZm8ubWVtYmVycztcbiAgY29uc3QgcmVmZXJlbmNlcyA9IGdldFJlZmVyZW5jZXMoaW5mbyk7XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGdldFZhckRlY2xhcmF0aW9ucyhpbmZvLCBwYXRoKTtcbiAgY29uc3QgZXZlbnRzID0gZ2V0RXZlbnREZWNsYXJhdGlvbihpbmZvLCBwYXRoKTtcbiAgaWYgKHJlZmVyZW5jZXMubGVuZ3RoIHx8IHZhcmlhYmxlcy5sZW5ndGggfHwgZXZlbnRzLmxlbmd0aCkge1xuICAgIGNvbnN0IHJlZmVyZW5jZVRhYmxlID0gaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZShyZWZlcmVuY2VzKTtcbiAgICBjb25zdCB2YXJpYWJsZVRhYmxlID0gaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZSh2YXJpYWJsZXMpO1xuICAgIGNvbnN0IGV2ZW50c1RhYmxlID0gaW5mby5xdWVyeS5jcmVhdGVTeW1ib2xUYWJsZShldmVudHMpO1xuICAgIHJlc3VsdCA9IGluZm8ucXVlcnkubWVyZ2VTeW1ib2xUYWJsZShbcmVzdWx0LCByZWZlcmVuY2VUYWJsZSwgdmFyaWFibGVUYWJsZSwgZXZlbnRzVGFibGVdKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jbGFzcyBFeHByZXNzaW9uRGlhZ25vc3RpY3NWaXNpdG9yIGV4dGVuZHMgUmVjdXJzaXZlVGVtcGxhdGVBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBwYXRoOiBUZW1wbGF0ZUFzdFBhdGg7XG4gIHByaXZhdGUgZGlyZWN0aXZlU3VtbWFyeTogQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnl8dW5kZWZpbmVkO1xuXG4gIGRpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5mbzogRGlhZ25vc3RpY1RlbXBsYXRlSW5mbyxcbiAgICAgIHByaXZhdGUgZ2V0RXhwcmVzc2lvblNjb3BlOiAocGF0aDogVGVtcGxhdGVBc3RQYXRoLCBpbmNsdWRlRXZlbnQ6IGJvb2xlYW4pID0+IFN5bWJvbFRhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnBhdGggPSBuZXcgQXN0UGF0aDxUZW1wbGF0ZUFzdD4oW10pO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmUoYXN0OiBEaXJlY3RpdmVBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgLy8gT3ZlcnJpZGUgdGhlIGRlZmF1bHQgY2hpbGQgdmlzaXRvciB0byBpZ25vcmUgdGhlIGhvc3QgcHJvcGVydGllcyBvZiBhIGRpcmVjdGl2ZS5cbiAgICBpZiAoYXN0LmlucHV0cyAmJiBhc3QuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGVtcGxhdGVWaXNpdEFsbCh0aGlzLCBhc3QuaW5wdXRzLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICB2aXNpdEJvdW5kVGV4dChhc3Q6IEJvdW5kVGV4dEFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC52YWx1ZSwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBmYWxzZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LnZhbHVlLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wdXNoKGFzdCk7XG4gICAgdGhpcy5kaWFnbm9zZUV4cHJlc3Npb24oYXN0LnZhbHVlLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgZmFsc2UpO1xuICAgIHRoaXMucG9wKCk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQge1xuICAgIHRoaXMucHVzaChhc3QpO1xuICAgIHRoaXMuZGlhZ25vc2VFeHByZXNzaW9uKGFzdC5oYW5kbGVyLCB0aGlzLmF0dHJpYnV0ZVZhbHVlTG9jYXRpb24oYXN0KSwgdHJ1ZSk7XG4gICAgdGhpcy5wb3AoKTtcbiAgfVxuXG4gIHZpc2l0VmFyaWFibGUoYXN0OiBWYXJpYWJsZUFzdCk6IHZvaWQge1xuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuZGlyZWN0aXZlU3VtbWFyeTtcbiAgICBpZiAoZGlyZWN0aXZlICYmIGFzdC52YWx1ZSkge1xuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuaW5mby5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlLnR5cGUucmVmZXJlbmNlKSAhO1xuICAgICAgaWYgKGNvbnRleHQgJiYgIWNvbnRleHQuaGFzKGFzdC52YWx1ZSkpIHtcbiAgICAgICAgaWYgKGFzdC52YWx1ZSA9PT0gJyRpbXBsaWNpdCcpIHtcbiAgICAgICAgICB0aGlzLnJlcG9ydEVycm9yKFxuICAgICAgICAgICAgICAnVGhlIHRlbXBsYXRlIGNvbnRleHQgZG9lcyBub3QgaGF2ZSBhbiBpbXBsaWNpdCB2YWx1ZScsIHNwYW5PZihhc3Quc291cmNlU3BhbikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVwb3J0RXJyb3IoXG4gICAgICAgICAgICAgIGBUaGUgdGVtcGxhdGUgY29udGV4dCBkb2VzIG5vdCBkZWZpbmUgYSBtZW1iZXIgY2FsbGVkICcke2FzdC52YWx1ZX0nYCxcbiAgICAgICAgICAgICAgc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLnB1c2goYXN0KTtcbiAgICBzdXBlci52aXNpdEVsZW1lbnQoYXN0LCBjb250ZXh0KTtcbiAgICB0aGlzLnBvcCgpO1xuICB9XG5cbiAgdmlzaXRFbWJlZGRlZFRlbXBsYXRlKGFzdDogRW1iZWRkZWRUZW1wbGF0ZUFzdCwgY29udGV4dDogYW55KTogYW55IHtcbiAgICBjb25zdCBwcmV2aW91c0RpcmVjdGl2ZVN1bW1hcnkgPSB0aGlzLmRpcmVjdGl2ZVN1bW1hcnk7XG5cbiAgICB0aGlzLnB1c2goYXN0KTtcblxuICAgIC8vIEZpbmQgZGlyZWN0aXZlIHRoYXQgcmVmZXJlbmNlcyB0aGlzIHRlbXBsYXRlXG4gICAgdGhpcy5kaXJlY3RpdmVTdW1tYXJ5ID1cbiAgICAgICAgYXN0LmRpcmVjdGl2ZXMubWFwKGQgPT4gZC5kaXJlY3RpdmUpLmZpbmQoZCA9PiBoYXNUZW1wbGF0ZVJlZmVyZW5jZShkLnR5cGUpKSAhO1xuXG4gICAgLy8gUHJvY2VzcyBjaGlsZHJlblxuICAgIHN1cGVyLnZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQpO1xuXG4gICAgdGhpcy5wb3AoKTtcblxuICAgIHRoaXMuZGlyZWN0aXZlU3VtbWFyeSA9IHByZXZpb3VzRGlyZWN0aXZlU3VtbWFyeTtcbiAgfVxuXG4gIHByaXZhdGUgYXR0cmlidXRlVmFsdWVMb2NhdGlvbihhc3Q6IFRlbXBsYXRlQXN0KSB7XG4gICAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKHRoaXMuaW5mby5odG1sQXN0LCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAgIGNvbnN0IGxhc3QgPSBwYXRoLnRhaWw7XG4gICAgaWYgKGxhc3QgaW5zdGFuY2VvZiBBdHRyaWJ1dGUgJiYgbGFzdC52YWx1ZVNwYW4pIHtcbiAgICAgIHJldHVybiBsYXN0LnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgfVxuICAgIHJldHVybiBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gIH1cblxuICBwcml2YXRlIGRpYWdub3NlRXhwcmVzc2lvbihhc3Q6IEFTVCwgb2Zmc2V0OiBudW1iZXIsIGluY2x1ZGVFdmVudDogYm9vbGVhbikge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUodGhpcy5wYXRoLCBpbmNsdWRlRXZlbnQpO1xuICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaCguLi5nZXRFeHByZXNzaW9uRGlhZ25vc3RpY3Moc2NvcGUsIGFzdCwgdGhpcy5pbmZvLnF1ZXJ5LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGluY2x1ZGVFdmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5tYXAoZCA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuOiBvZmZzZXRTcGFuKGQuYXN0LnNwYW4sIG9mZnNldCArIHRoaXMuaW5mby5vZmZzZXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBkLmtpbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGQubWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgfVxuXG4gIHByaXZhdGUgcHVzaChhc3Q6IFRlbXBsYXRlQXN0KSB7IHRoaXMucGF0aC5wdXNoKGFzdCk7IH1cblxuICBwcml2YXRlIHBvcCgpIHsgdGhpcy5wYXRoLnBvcCgpOyB9XG5cbiAgcHJpdmF0ZSByZXBvcnRFcnJvcihtZXNzYWdlOiBzdHJpbmcsIHNwYW46IFNwYW58dW5kZWZpbmVkKSB7XG4gICAgaWYgKHNwYW4pIHtcbiAgICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICB7c3Bhbjogb2Zmc2V0U3BhbihzcGFuLCB0aGlzLmluZm8ub2Zmc2V0KSwga2luZDogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBtZXNzYWdlfSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhc1RlbXBsYXRlUmVmZXJlbmNlKHR5cGU6IENvbXBpbGVUeXBlTWV0YWRhdGEpOiBib29sZWFuIHtcbiAgaWYgKHR5cGUuZGlEZXBzKSB7XG4gICAgZm9yIChsZXQgZGlEZXAgb2YgdHlwZS5kaURlcHMpIHtcbiAgICAgIGlmIChkaURlcC50b2tlbiAmJiBkaURlcC50b2tlbi5pZGVudGlmaWVyICYmXG4gICAgICAgICAgaWRlbnRpZmllck5hbWUoZGlEZXAudG9rZW4gIS5pZGVudGlmaWVyICEpID09ICdUZW1wbGF0ZVJlZicpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9mZnNldFNwYW4oc3BhbjogU3BhbiwgYW1vdW50OiBudW1iZXIpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydCArIGFtb3VudCwgZW5kOiBzcGFuLmVuZCArIGFtb3VudH07XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIGVuZDogc291cmNlU3Bhbi5lbmQub2Zmc2V0fTtcbn1cbiJdfQ==