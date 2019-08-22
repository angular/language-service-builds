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
        define("@angular/language-service/src/template", ["require", "exports", "tslib", "@angular/compiler-cli", "typescript", "@angular/language-service/src/common"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var ts = require("typescript");
    var common_1 = require("@angular/language-service/src/common");
    /**
     * A base class to represent a template and which component class it is
     * associated with. A template source could answer basic questions about
     * top-level declarations of its class through the members() and query()
     * methods.
     */
    var BaseTemplate = /** @class */ (function () {
        function BaseTemplate(host, classDeclNode, classSymbol) {
            this.host = host;
            this.classDeclNode = classDeclNode;
            this.classSymbol = classSymbol;
            this.program = host.program;
        }
        Object.defineProperty(BaseTemplate.prototype, "type", {
            /**
             * Return the Angular StaticSymbol for the class that contains this template.
             */
            get: function () { return this.classSymbol; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BaseTemplate.prototype, "members", {
            /**
             * Return a Map-like data structure that allows users to retrieve some or all
             * top-level declarations in the associated component class.
             */
            get: function () {
                if (!this.membersTable) {
                    var typeChecker = this.program.getTypeChecker();
                    var sourceFile = this.classDeclNode.getSourceFile();
                    this.membersTable =
                        compiler_cli_1.getClassMembersFromDeclaration(this.program, typeChecker, sourceFile, this.classDeclNode);
                }
                return this.membersTable;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BaseTemplate.prototype, "query", {
            /**
             * Return an engine that provides more information about symbols in the
             * template.
             */
            get: function () {
                var _this = this;
                if (!this.queryCache) {
                    var program_1 = this.program;
                    var typeChecker_1 = program_1.getTypeChecker();
                    var sourceFile_1 = this.classDeclNode.getSourceFile();
                    this.queryCache = compiler_cli_1.getSymbolQuery(program_1, typeChecker_1, sourceFile_1, function () {
                        // Computing the ast is relatively expensive. Do it only when absolutely
                        // necessary.
                        // TODO: There is circular dependency here between TemplateSource and
                        // TypeScriptHost. Consider refactoring the code to break this cycle.
                        var ast = _this.host.getTemplateAst(_this);
                        var pipes = common_1.isAstResult(ast) ? ast.pipes : [];
                        return compiler_cli_1.getPipesTable(sourceFile_1, program_1, typeChecker_1, pipes);
                    });
                }
                return this.queryCache;
            },
            enumerable: true,
            configurable: true
        });
        return BaseTemplate;
    }());
    /**
     * An InlineTemplate represents template defined in a TS file through the
     * `template` attribute in the decorator.
     */
    var InlineTemplate = /** @class */ (function (_super) {
        tslib_1.__extends(InlineTemplate, _super);
        function InlineTemplate(templateNode, classDeclNode, classSymbol, host) {
            var _this = _super.call(this, host, classDeclNode, classSymbol) || this;
            var sourceFile = templateNode.getSourceFile();
            if (sourceFile !== classDeclNode.getSourceFile()) {
                throw new Error("Inline template and component class should belong to the same source file");
            }
            _this.fileName = sourceFile.fileName;
            _this.source = templateNode.text;
            _this.span = {
                // TS string literal includes surrounding quotes in the start/end offsets.
                start: templateNode.getStart() + 1,
                end: templateNode.getEnd() - 1,
            };
            return _this;
        }
        return InlineTemplate;
    }(BaseTemplate));
    exports.InlineTemplate = InlineTemplate;
    /**
     * An ExternalTemplate represents template defined in an external (most likely
     * HTML, but not necessarily) file through the `templateUrl` attribute in the
     * decorator.
     * Note that there is no ts.Node associated with the template because it's not
     * a TS file.
     */
    var ExternalTemplate = /** @class */ (function (_super) {
        tslib_1.__extends(ExternalTemplate, _super);
        function ExternalTemplate(source, fileName, classDeclNode, classSymbol, host) {
            var _this = _super.call(this, host, classDeclNode, classSymbol) || this;
            _this.source = source;
            _this.fileName = fileName;
            _this.span = {
                start: 0,
                end: source.length,
            };
            return _this;
        }
        return ExternalTemplate;
    }(BaseTemplate));
    exports.ExternalTemplate = ExternalTemplate;
    /**
     * Returns a property assignment from the assignment value, or `undefined` if there is no
     * assignment.
     */
    function getPropertyAssignmentFromValue(value) {
        if (!value.parent || !ts.isPropertyAssignment(value.parent)) {
            return;
        }
        return value.parent;
    }
    exports.getPropertyAssignmentFromValue = getPropertyAssignmentFromValue;
    /**
     * Given a decorator property assignment, return the ClassDeclaration node that corresponds to the
     * directive class the property applies to.
     * If the property assignment is not on a class decorator, no declaration is returned.
     *
     * For example,
     *
     * @Component({
     *   template: '<div></div>'
     *   ^^^^^^^^^^^^^^^^^^^^^^^---- property assignment
     * })
     * class AppComponent {}
     *           ^---- class declaration node
     *
     * @param propAsgn property assignment
     */
    function getClassDeclFromDecoratorProp(propAsgnNode) {
        if (!propAsgnNode.parent || !ts.isObjectLiteralExpression(propAsgnNode.parent)) {
            return;
        }
        var objLitExprNode = propAsgnNode.parent;
        if (!objLitExprNode.parent || !ts.isCallExpression(objLitExprNode.parent)) {
            return;
        }
        var callExprNode = objLitExprNode.parent;
        if (!callExprNode.parent || !ts.isDecorator(callExprNode.parent)) {
            return;
        }
        var decorator = callExprNode.parent;
        if (!decorator.parent || !ts.isClassDeclaration(decorator.parent)) {
            return;
        }
        var classDeclNode = decorator.parent;
        return classDeclNode;
    }
    exports.getClassDeclFromDecoratorProp = getClassDeclFromDecoratorProp;
    /**
     * Determines if a property assignment is on a class decorator.
     * See `getClassDeclFromDecoratorProperty`, which gets the class the decorator is applied to, for
     * more details.
     *
     * @param prop property assignment
     */
    function isClassDecoratorProperty(propAsgn) {
        return !!getClassDeclFromDecoratorProp(propAsgn);
    }
    exports.isClassDecoratorProperty = isClassDecoratorProperty;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzREFBb0c7SUFDcEcsK0JBQWlDO0lBRWpDLCtEQUFxQztJQUlyQzs7Ozs7T0FLRztJQUNIO1FBS0Usc0JBQ3FCLElBQTJCLEVBQzNCLGFBQWtDLEVBQ2xDLFdBQTRCO1lBRjVCLFNBQUksR0FBSixJQUFJLENBQXVCO1lBQzNCLGtCQUFhLEdBQWIsYUFBYSxDQUFxQjtZQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7WUFDL0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzlCLENBQUM7UUFTRCxzQkFBSSw4QkFBSTtZQUhSOztlQUVHO2lCQUNILGNBQWEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFNdkMsc0JBQUksaUNBQU87WUFKWDs7O2VBR0c7aUJBQ0g7Z0JBQ0UsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7b0JBQ3RCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ2xELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3RELElBQUksQ0FBQyxZQUFZO3dCQUNiLDZDQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7aUJBQy9GO2dCQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzQixDQUFDOzs7V0FBQTtRQU1ELHNCQUFJLCtCQUFLO1lBSlQ7OztlQUdHO2lCQUNIO2dCQUFBLGlCQWdCQztnQkFmQyxJQUFJ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QUFnQiw2QkFBNkIsQ0FBQyxZQUFtQztRQUUvRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDOUUsT0FBTztTQUNSO1FBQ0QsSUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDekUsT0FBTztTQUNSO1FBQ0QsSUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztRQUMzQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2hFLE9BQU87U0FDUjtRQUNELElBQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pFLE9BQU87U0FDUjtRQUNELElBQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFDdkMsT0FBTyxhQUFhLENBQUM7SUFDdkIsQ0FBQztJQW5CRCxzRUFtQkM7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFnQix3QkFBd0IsQ0FBQyxRQUErQjtRQUN0RSxPQUFPLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRkQsNERBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Z2V0Q2xhc3NNZW1iZXJzRnJvbURlY2xhcmF0aW9uLCBnZXRQaXBlc1RhYmxlLCBnZXRTeW1ib2xRdWVyeX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzQXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5cbi8qKlxuICogQSBiYXNlIGNsYXNzIHRvIHJlcHJlc2VudCBhIHRlbXBsYXRlIGFuZCB3aGljaCBjb21wb25lbnQgY2xhc3MgaXQgaXNcbiAqIGFzc29jaWF0ZWQgd2l0aC4gQSB0ZW1wbGF0ZSBzb3VyY2UgY291bGQgYW5zd2VyIGJhc2ljIHF1ZXN0aW9ucyBhYm91dFxuICogdG9wLWxldmVsIGRlY2xhcmF0aW9ucyBvZiBpdHMgY2xhc3MgdGhyb3VnaCB0aGUgbWVtYmVycygpIGFuZCBxdWVyeSgpXG4gKiBtZXRob2RzLlxuICovXG5hYnN0cmFjdCBjbGFzcyBCYXNlVGVtcGxhdGUgaW1wbGVtZW50cyBuZy5UZW1wbGF0ZVNvdXJjZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSBtZW1iZXJzVGFibGU6IG5nLlN5bWJvbFRhYmxlfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBxdWVyeUNhY2hlOiBuZy5TeW1ib2xRdWVyeXx1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NEZWNsTm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NTeW1ib2w6IG5nLlN0YXRpY1N5bWJvbCkge1xuICAgIHRoaXMucHJvZ3JhbSA9IGhvc3QucHJvZ3JhbTtcbiAgfVxuXG4gIGFic3RyYWN0IGdldCBzcGFuKCk6IG5nLlNwYW47XG4gIGFic3RyYWN0IGdldCBmaWxlTmFtZSgpOiBzdHJpbmc7XG4gIGFic3RyYWN0IGdldCBzb3VyY2UoKTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIEFuZ3VsYXIgU3RhdGljU3ltYm9sIGZvciB0aGUgY2xhc3MgdGhhdCBjb250YWlucyB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgZ2V0IHR5cGUoKSB7IHJldHVybiB0aGlzLmNsYXNzU3ltYm9sOyB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIE1hcC1saWtlIGRhdGEgc3RydWN0dXJlIHRoYXQgYWxsb3dzIHVzZXJzIHRvIHJldHJpZXZlIHNvbWUgb3IgYWxsXG4gICAqIHRvcC1sZXZlbCBkZWNsYXJhdGlvbnMgaW4gdGhlIGFzc29jaWF0ZWQgY29tcG9uZW50IGNsYXNzLlxuICAgKi9cbiAgZ2V0IG1lbWJlcnMoKSB7XG4gICAgaWYgKCF0aGlzLm1lbWJlcnNUYWJsZSkge1xuICAgICAgY29uc3QgdHlwZUNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmNsYXNzRGVjbE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgdGhpcy5tZW1iZXJzVGFibGUgPVxuICAgICAgICAgIGdldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbih0aGlzLnByb2dyYW0sIHR5cGVDaGVja2VyLCBzb3VyY2VGaWxlLCB0aGlzLmNsYXNzRGVjbE5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZW1iZXJzVGFibGU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFuIGVuZ2luZSB0aGF0IHByb3ZpZGVzIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgc3ltYm9scyBpbiB0aGVcbiAgICogdGVtcGxhdGUuXG4gICAqL1xuICBnZXQgcXVlcnkoKSB7XG4gICAgaWYgKCF0aGlzLnF1ZXJ5Q2FjaGUpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW07XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmNsYXNzRGVjbE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgdGhpcy5xdWVyeUNhY2hlID0gZ2V0U3ltYm9sUXVlcnkocHJvZ3JhbSwgdHlwZUNoZWNrZXIsIHNvdXJjZUZpbGUsICgpID0+IHtcbiAgICAgICAgLy8gQ29tcHV0aW5nIHRoZSBhc3QgaXMgcmVsYXRpdmVseSBleHBlbnNpdmUuIERvIGl0IG9ubHkgd2hlbiBhYnNvbHV0ZWx5XG4gICAgICAgIC8vIG5lY2Vzc2FyeS5cbiAgICAgICAgLy8gVE9ETzogVGhlcmUgaXMgY2lyY3VsYXIgZGVwZW5kZW5jeSBoZXJlIGJldHdlZW4gVGVtcGxhdGVTb3VyY2UgYW5kXG4gICAgICAgIC8vIFR5cGVTY3JpcHRIb3N0LiBDb25zaWRlciByZWZhY3RvcmluZyB0aGUgY29kZSB0byBicmVhayB0aGlzIGN5Y2xlLlxuICAgICAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3QodGhpcyk7XG4gICAgICAgIGNvbnN0IHBpcGVzID0gaXNBc3RSZXN1bHQoYXN0KSA/IGFzdC5waXBlcyA6IFtdO1xuICAgICAgICByZXR1cm4gZ2V0UGlwZXNUYWJsZShzb3VyY2VGaWxlLCBwcm9ncmFtLCB0eXBlQ2hlY2tlciwgcGlwZXMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnF1ZXJ5Q2FjaGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBJbmxpbmVUZW1wbGF0ZSByZXByZXNlbnRzIHRlbXBsYXRlIGRlZmluZWQgaW4gYSBUUyBmaWxlIHRocm91Z2ggdGhlXG4gKiBgdGVtcGxhdGVgIGF0dHJpYnV0ZSBpbiB0aGUgZGVjb3JhdG9yLlxuICovXG5leHBvcnQgY2xhc3MgSW5saW5lVGVtcGxhdGUgZXh0ZW5kcyBCYXNlVGVtcGxhdGUge1xuICBwdWJsaWMgcmVhZG9ubHkgZmlsZU5hbWU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IHNvdXJjZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgc3BhbjogbmcuU3BhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHRlbXBsYXRlTm9kZTogdHMuU3RyaW5nTGl0ZXJhbExpa2UsIGNsYXNzRGVjbE5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sLCBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QpIHtcbiAgICBzdXBlcihob3N0LCBjbGFzc0RlY2xOb2RlLCBjbGFzc1N5bWJvbCk7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRlbXBsYXRlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKHNvdXJjZUZpbGUgIT09IGNsYXNzRGVjbE5vZGUuZ2V0U291cmNlRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElubGluZSB0ZW1wbGF0ZSBhbmQgY29tcG9uZW50IGNsYXNzIHNob3VsZCBiZWxvbmcgdG8gdGhlIHNhbWUgc291cmNlIGZpbGVgKTtcbiAgICB9XG4gICAgdGhpcy5maWxlTmFtZSA9IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgdGhpcy5zb3VyY2UgPSB0ZW1wbGF0ZU5vZGUudGV4dDtcbiAgICB0aGlzLnNwYW4gPSB7XG4gICAgICAvLyBUUyBzdHJpbmcgbGl0ZXJhbCBpbmNsdWRlcyBzdXJyb3VuZGluZyBxdW90ZXMgaW4gdGhlIHN0YXJ0L2VuZCBvZmZzZXRzLlxuICAgICAgc3RhcnQ6IHRlbXBsYXRlTm9kZS5nZXRTdGFydCgpICsgMSxcbiAgICAgIGVuZDogdGVtcGxhdGVOb2RlLmdldEVuZCgpIC0gMSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogQW4gRXh0ZXJuYWxUZW1wbGF0ZSByZXByZXNlbnRzIHRlbXBsYXRlIGRlZmluZWQgaW4gYW4gZXh0ZXJuYWwgKG1vc3QgbGlrZWx5XG4gKiBIVE1MLCBidXQgbm90IG5lY2Vzc2FyaWx5KSBmaWxlIHRocm91Z2ggdGhlIGB0ZW1wbGF0ZVVybGAgYXR0cmlidXRlIGluIHRoZVxuICogZGVjb3JhdG9yLlxuICogTm90ZSB0aGF0IHRoZXJlIGlzIG5vIHRzLk5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoZSB0ZW1wbGF0ZSBiZWNhdXNlIGl0J3Mgbm90XG4gKiBhIFRTIGZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBFeHRlcm5hbFRlbXBsYXRlIGV4dGVuZHMgQmFzZVRlbXBsYXRlIHtcbiAgcHVibGljIHJlYWRvbmx5IHNwYW46IG5nLlNwYW47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgc291cmNlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nLFxuICAgICAgY2xhc3NEZWNsTm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgY2xhc3NTeW1ib2w6IG5nLlN0YXRpY1N5bWJvbCxcbiAgICAgIGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkge1xuICAgIHN1cGVyKGhvc3QsIGNsYXNzRGVjbE5vZGUsIGNsYXNzU3ltYm9sKTtcbiAgICB0aGlzLnNwYW4gPSB7XG4gICAgICBzdGFydDogMCxcbiAgICAgIGVuZDogc291cmNlLmxlbmd0aCxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHByb3BlcnR5IGFzc2lnbm1lbnQgZnJvbSB0aGUgYXNzaWdubWVudCB2YWx1ZSwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgaXMgbm9cbiAqIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUodmFsdWU6IHRzLk5vZGUpOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnR8dW5kZWZpbmVkIHtcbiAgaWYgKCF2YWx1ZS5wYXJlbnQgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHZhbHVlLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIHZhbHVlLnBhcmVudDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhIGRlY29yYXRvciBwcm9wZXJ0eSBhc3NpZ25tZW50LCByZXR1cm4gdGhlIENsYXNzRGVjbGFyYXRpb24gbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZVxuICogZGlyZWN0aXZlIGNsYXNzIHRoZSBwcm9wZXJ0eSBhcHBsaWVzIHRvLlxuICogSWYgdGhlIHByb3BlcnR5IGFzc2lnbm1lbnQgaXMgbm90IG9uIGEgY2xhc3MgZGVjb3JhdG9yLCBubyBkZWNsYXJhdGlvbiBpcyByZXR1cm5lZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSxcbiAqXG4gKiBAQ29tcG9uZW50KHtcbiAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PidcbiAqICAgXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl4tLS0tIHByb3BlcnR5IGFzc2lnbm1lbnRcbiAqIH0pXG4gKiBjbGFzcyBBcHBDb21wb25lbnQge31cbiAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gKlxuICogQHBhcmFtIHByb3BBc2duIHByb3BlcnR5IGFzc2lnbm1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKHByb3BBc2duTm9kZTogdHMuUHJvcGVydHlBc3NpZ25tZW50KTpcbiAgICB0cy5DbGFzc0RlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gIGlmICghcHJvcEFzZ25Ob2RlLnBhcmVudCB8fCAhdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wQXNnbk5vZGUucGFyZW50KSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBvYmpMaXRFeHByTm9kZSA9IHByb3BBc2duTm9kZS5wYXJlbnQ7XG4gIGlmICghb2JqTGl0RXhwck5vZGUucGFyZW50IHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG9iakxpdEV4cHJOb2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2FsbEV4cHJOb2RlID0gb2JqTGl0RXhwck5vZGUucGFyZW50O1xuICBpZiAoIWNhbGxFeHByTm9kZS5wYXJlbnQgfHwgIXRzLmlzRGVjb3JhdG9yKGNhbGxFeHByTm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGRlY29yYXRvciA9IGNhbGxFeHByTm9kZS5wYXJlbnQ7XG4gIGlmICghZGVjb3JhdG9yLnBhcmVudCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY29yYXRvci5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNsYXNzRGVjbE5vZGUgPSBkZWNvcmF0b3IucGFyZW50O1xuICByZXR1cm4gY2xhc3NEZWNsTm9kZTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgYXNzaWdubWVudCBpcyBvbiBhIGNsYXNzIGRlY29yYXRvci5cbiAqIFNlZSBgZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3BlcnR5YCwgd2hpY2ggZ2V0cyB0aGUgY2xhc3MgdGhlIGRlY29yYXRvciBpcyBhcHBsaWVkIHRvLCBmb3JcbiAqIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBAcGFyYW0gcHJvcCBwcm9wZXJ0eSBhc3NpZ25tZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVjb3JhdG9yUHJvcGVydHkocHJvcEFzZ246IHRzLlByb3BlcnR5QXNzaWdubWVudCk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcChwcm9wQXNnbik7XG59XG4iXX0=