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
        define("@angular/language-service/src/template", ["require", "exports", "tslib", "@angular/compiler-cli", "typescript", "@angular/language-service/src/common", "@angular/language-service/src/global_symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var ts = require("typescript");
    var common_1 = require("@angular/language-service/src/common");
    var global_symbols_1 = require("@angular/language-service/src/global_symbols");
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
                    this.membersTable = this.query.mergeSymbolTable([
                        global_symbols_1.createGlobalSymbolTable(this.query),
                        compiler_cli_1.getClassMembersFromDeclaration(this.program, typeChecker, sourceFile, this.classDeclNode),
                    ]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzREFBb0c7SUFDcEcsK0JBQWlDO0lBRWpDLCtEQUFxQztJQUNyQywrRUFBeUQ7SUFJekQ7Ozs7O09BS0c7SUFDSDtRQUtFLHNCQUNxQixJQUEyQixFQUMzQixhQUFrQyxFQUNsQyxXQUE0QjtZQUY1QixTQUFJLEdBQUosSUFBSSxDQUF1QjtZQUMzQixrQkFBYSxHQUFiLGFBQWEsQ0FBcUI7WUFDbEMsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1lBQy9DLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM5QixDQUFDO1FBU0Qsc0JBQUksOEJBQUk7WUFIUjs7ZUFFRztpQkFDSCxjQUFhLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBTXZDLHNCQUFJLGlDQUFPO1lBSlg7OztlQUdHO2lCQUNIO2dCQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO29CQUN0QixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNsRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUN0RCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7d0JBQzlDLHdDQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7d0JBQ25DLDZDQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDO3FCQUMxRixDQUFDLENBQUM7aUJBQ0o7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzNCLENBQUM7OztXQUFBO1FBTUQsc0JBQUksK0JBQUs7WUFKVDs7O2VBR0c7aUJBQ0g7Z0JBQUEsaUJBZ0JDO2dCQWZDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNwQixJQUFNLFNBQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUM3QixJQUFNLGFBQVcsR0FBRyxTQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQzdDLElBQU0sWUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3RELElBQUksQ0FBQyxVQUFVLEdBQUcsNkJBQWMsQ0FBQyxTQUFPLEVBQUUsYUFBVyxFQUFFLFlBQVUsRUFBRTt3QkFDakUsd0VBQXdFO3dCQUN4RSxhQUFhO3dCQUNiLHFFQUFxRTt3QkFDckUscUVBQXFFO3dCQUNyRSxJQUFNLEdBQUcsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsQ0FBQzt3QkFDM0MsSUFBTSxLQUFLLEdBQUcsb0JBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNoRCxPQUFPLDRCQUFhLENBQUMsWUFBVSxFQUFFLFNBQU8sRUFBRSxhQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2hFLENBQUMsQ0FBQyxDQUFDO2lCQUNKO2dCQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN6QixDQUFDOzs7V0FBQTtRQUNILG1CQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQUVEOzs7T0FHRztJQUNIO1FBQW9DLDBDQUFZO1FBSzlDLHdCQUNJLFlBQWtDLEVBQUUsYUFBa0MsRUFDdEUsV0FBNEIsRUFBRSxJQUEyQjtZQUY3RCxZQUdFLGtCQUFNLElBQUksRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLFNBWXhDO1lBWEMsSUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2hELElBQUksVUFBVSxLQUFLLGFBQWEsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQywyRUFBMkUsQ0FBQyxDQUFDO2FBQzlGO1lBQ0QsS0FBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ3BDLEtBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUNoQyxLQUFJLENBQUMsSUFBSSxHQUFHO2dCQUNWLDBFQUEwRTtnQkFDMUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO2dCQUNsQyxHQUFHLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7YUFDL0IsQ0FBQzs7UUFDSixDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBckJELENBQW9DLFlBQVksR0FxQi9DO0lBckJZLHdDQUFjO0lBdUIzQjs7Ozs7O09BTUc7SUFDSDtRQUFzQyw0Q0FBWTtRQUdoRCwwQkFDb0IsTUFBYyxFQUFrQixRQUFnQixFQUNoRSxhQUFrQyxFQUFFLFdBQTRCLEVBQ2hFLElBQTJCO1lBSC9CLFlBSUUsa0JBQU0sSUFBSSxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsU0FLeEM7WUFSbUIsWUFBTSxHQUFOLE1BQU0sQ0FBUTtZQUFrQixjQUFRLEdBQVIsUUFBUSxDQUFRO1lBSWxFLEtBQUksQ0FBQyxJQUFJLEdBQUc7Z0JBQ1YsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNO2FBQ25CLENBQUM7O1FBQ0osQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWJELENBQXNDLFlBQVksR0FhakQ7SUFiWSw0Q0FBZ0I7SUFlN0I7OztPQUdHO0lBQ0gsU0FBZ0IsOEJBQThCLENBQUMsS0FBYztRQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0QsT0FBTztTQUNSO1FBQ0QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFMRCx3RUFLQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7T0FlRztJQUNILFNBQWdCLDZCQUE2QixDQUFDLFlBQW1DO1FBRS9FLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5RSxPQUFPO1NBQ1I7UUFDRCxJQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6RSxPQUFPO1NBQ1I7UUFDRCxJQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEUsT0FBTztTQUNSO1FBQ0QsSUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakUsT0FBTztTQUNSO1FBQ0QsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUN2QyxPQUFPLGFBQWEsQ0FBQztJQUN2QixDQUFDO0lBbkJELHNFQW1CQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLHdCQUF3QixDQUFDLFFBQStCO1FBQ3RFLE9BQU8sQ0FBQyxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFGRCw0REFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtnZXRDbGFzc01lbWJlcnNGcm9tRGVjbGFyYXRpb24sIGdldFBpcGVzVGFibGUsIGdldFN5bWJvbFF1ZXJ5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7aXNBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Y3JlYXRlR2xvYmFsU3ltYm9sVGFibGV9IGZyb20gJy4vZ2xvYmFsX3N5bWJvbHMnO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG4vKipcbiAqIEEgYmFzZSBjbGFzcyB0byByZXByZXNlbnQgYSB0ZW1wbGF0ZSBhbmQgd2hpY2ggY29tcG9uZW50IGNsYXNzIGl0IGlzXG4gKiBhc3NvY2lhdGVkIHdpdGguIEEgdGVtcGxhdGUgc291cmNlIGNvdWxkIGFuc3dlciBiYXNpYyBxdWVzdGlvbnMgYWJvdXRcbiAqIHRvcC1sZXZlbCBkZWNsYXJhdGlvbnMgb2YgaXRzIGNsYXNzIHRocm91Z2ggdGhlIG1lbWJlcnMoKSBhbmQgcXVlcnkoKVxuICogbWV0aG9kcy5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgQmFzZVRlbXBsYXRlIGltcGxlbWVudHMgbmcuVGVtcGxhdGVTb3VyY2Uge1xuICBwcml2YXRlIHJlYWRvbmx5IHByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgbWVtYmVyc1RhYmxlOiBuZy5TeW1ib2xUYWJsZXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgcXVlcnlDYWNoZTogbmcuU3ltYm9sUXVlcnl8dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNsYXNzRGVjbE5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNsYXNzU3ltYm9sOiBuZy5TdGF0aWNTeW1ib2wpIHtcbiAgICB0aGlzLnByb2dyYW0gPSBob3N0LnByb2dyYW07XG4gIH1cblxuICBhYnN0cmFjdCBnZXQgc3BhbigpOiBuZy5TcGFuO1xuICBhYnN0cmFjdCBnZXQgZmlsZU5hbWUoKTogc3RyaW5nO1xuICBhYnN0cmFjdCBnZXQgc291cmNlKCk6IHN0cmluZztcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBBbmd1bGFyIFN0YXRpY1N5bWJvbCBmb3IgdGhlIGNsYXNzIHRoYXQgY29udGFpbnMgdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5jbGFzc1N5bWJvbDsgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBNYXAtbGlrZSBkYXRhIHN0cnVjdHVyZSB0aGF0IGFsbG93cyB1c2VycyB0byByZXRyaWV2ZSBzb21lIG9yIGFsbFxuICAgKiB0b3AtbGV2ZWwgZGVjbGFyYXRpb25zIGluIHRoZSBhc3NvY2lhdGVkIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBtZW1iZXJzKCkge1xuICAgIGlmICghdGhpcy5tZW1iZXJzVGFibGUpIHtcbiAgICAgIGNvbnN0IHR5cGVDaGVja2VyID0gdGhpcy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5jbGFzc0RlY2xOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIHRoaXMubWVtYmVyc1RhYmxlID0gdGhpcy5xdWVyeS5tZXJnZVN5bWJvbFRhYmxlKFtcbiAgICAgICAgY3JlYXRlR2xvYmFsU3ltYm9sVGFibGUodGhpcy5xdWVyeSksXG4gICAgICAgIGdldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbih0aGlzLnByb2dyYW0sIHR5cGVDaGVja2VyLCBzb3VyY2VGaWxlLCB0aGlzLmNsYXNzRGVjbE5vZGUpLFxuICAgICAgXSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1lbWJlcnNUYWJsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gZW5naW5lIHRoYXQgcHJvdmlkZXMgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCBzeW1ib2xzIGluIHRoZVxuICAgKiB0ZW1wbGF0ZS5cbiAgICovXG4gIGdldCBxdWVyeSgpIHtcbiAgICBpZiAoIXRoaXMucXVlcnlDYWNoZSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbTtcbiAgICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB0aGlzLnF1ZXJ5Q2FjaGUgPSBnZXRTeW1ib2xRdWVyeShwcm9ncmFtLCB0eXBlQ2hlY2tlciwgc291cmNlRmlsZSwgKCkgPT4ge1xuICAgICAgICAvLyBDb21wdXRpbmcgdGhlIGFzdCBpcyByZWxhdGl2ZWx5IGV4cGVuc2l2ZS4gRG8gaXQgb25seSB3aGVuIGFic29sdXRlbHlcbiAgICAgICAgLy8gbmVjZXNzYXJ5LlxuICAgICAgICAvLyBUT0RPOiBUaGVyZSBpcyBjaXJjdWxhciBkZXBlbmRlbmN5IGhlcmUgYmV0d2VlbiBUZW1wbGF0ZVNvdXJjZSBhbmRcbiAgICAgICAgLy8gVHlwZVNjcmlwdEhvc3QuIENvbnNpZGVyIHJlZmFjdG9yaW5nIHRoZSBjb2RlIHRvIGJyZWFrIHRoaXMgY3ljbGUuXG4gICAgICAgIGNvbnN0IGFzdCA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdCh0aGlzKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSBpc0FzdFJlc3VsdChhc3QpID8gYXN0LnBpcGVzIDogW107XG4gICAgICAgIHJldHVybiBnZXRQaXBlc1RhYmxlKHNvdXJjZUZpbGUsIHByb2dyYW0sIHR5cGVDaGVja2VyLCBwaXBlcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucXVlcnlDYWNoZTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIElubGluZVRlbXBsYXRlIHJlcHJlc2VudHMgdGVtcGxhdGUgZGVmaW5lZCBpbiBhIFRTIGZpbGUgdGhyb3VnaCB0aGVcbiAqIGB0ZW1wbGF0ZWAgYXR0cmlidXRlIGluIHRoZSBkZWNvcmF0b3IuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmxpbmVUZW1wbGF0ZSBleHRlbmRzIEJhc2VUZW1wbGF0ZSB7XG4gIHB1YmxpYyByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgc291cmNlOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBzcGFuOiBuZy5TcGFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgdGVtcGxhdGVOb2RlOiB0cy5TdHJpbmdMaXRlcmFsTGlrZSwgY2xhc3NEZWNsTm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGNsYXNzU3ltYm9sOiBuZy5TdGF0aWNTeW1ib2wsIGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkge1xuICAgIHN1cGVyKGhvc3QsIGNsYXNzRGVjbE5vZGUsIGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGVtcGxhdGVOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoc291cmNlRmlsZSAhPT0gY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5saW5lIHRlbXBsYXRlIGFuZCBjb21wb25lbnQgY2xhc3Mgc2hvdWxkIGJlbG9uZyB0byB0aGUgc2FtZSBzb3VyY2UgZmlsZWApO1xuICAgIH1cbiAgICB0aGlzLmZpbGVOYW1lID0gc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICB0aGlzLnNvdXJjZSA9IHRlbXBsYXRlTm9kZS50ZXh0O1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIC8vIFRTIHN0cmluZyBsaXRlcmFsIGluY2x1ZGVzIHN1cnJvdW5kaW5nIHF1b3RlcyBpbiB0aGUgc3RhcnQvZW5kIG9mZnNldHMuXG4gICAgICBzdGFydDogdGVtcGxhdGVOb2RlLmdldFN0YXJ0KCkgKyAxLFxuICAgICAgZW5kOiB0ZW1wbGF0ZU5vZGUuZ2V0RW5kKCkgLSAxLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBFeHRlcm5hbFRlbXBsYXRlIHJlcHJlc2VudHMgdGVtcGxhdGUgZGVmaW5lZCBpbiBhbiBleHRlcm5hbCAobW9zdCBsaWtlbHlcbiAqIEhUTUwsIGJ1dCBub3QgbmVjZXNzYXJpbHkpIGZpbGUgdGhyb3VnaCB0aGUgYHRlbXBsYXRlVXJsYCBhdHRyaWJ1dGUgaW4gdGhlXG4gKiBkZWNvcmF0b3IuXG4gKiBOb3RlIHRoYXQgdGhlcmUgaXMgbm8gdHMuTm9kZSBhc3NvY2lhdGVkIHdpdGggdGhlIHRlbXBsYXRlIGJlY2F1c2UgaXQncyBub3RcbiAqIGEgVFMgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsVGVtcGxhdGUgZXh0ZW5kcyBCYXNlVGVtcGxhdGUge1xuICBwdWJsaWMgcmVhZG9ubHkgc3BhbjogbmcuU3BhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyByZWFkb25seSBzb3VyY2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IGZpbGVOYW1lOiBzdHJpbmcsXG4gICAgICBjbGFzc0RlY2xOb2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sLFxuICAgICAgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gICAgc3VwZXIoaG9zdCwgY2xhc3NEZWNsTm9kZSwgY2xhc3NTeW1ib2wpO1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIHN0YXJ0OiAwLFxuICAgICAgZW5kOiBzb3VyY2UubGVuZ3RoLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvcGVydHkgYXNzaWdubWVudCBmcm9tIHRoZSBhc3NpZ25tZW50IHZhbHVlLCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBpcyBub1xuICogYXNzaWdubWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZSh2YWx1ZTogdHMuTm9kZSk6IHRzLlByb3BlcnR5QXNzaWdubWVudHx1bmRlZmluZWQge1xuICBpZiAoIXZhbHVlLnBhcmVudCB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQodmFsdWUucGFyZW50KSkge1xuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gdmFsdWUucGFyZW50O1xufVxuXG4vKipcbiAqIEdpdmVuIGEgZGVjb3JhdG9yIHByb3BlcnR5IGFzc2lnbm1lbnQsIHJldHVybiB0aGUgQ2xhc3NEZWNsYXJhdGlvbiBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlXG4gKiBkaXJlY3RpdmUgY2xhc3MgdGhlIHByb3BlcnR5IGFwcGxpZXMgdG8uXG4gKiBJZiB0aGUgcHJvcGVydHkgYXNzaWdubWVudCBpcyBub3Qgb24gYSBjbGFzcyBkZWNvcmF0b3IsIG5vIGRlY2xhcmF0aW9uIGlzIHJldHVybmVkLlxuICpcbiAqIEZvciBleGFtcGxlLFxuICpcbiAqIEBDb21wb25lbnQoe1xuICogICB0ZW1wbGF0ZTogJzxkaXY+PC9kaXY+J1xuICogICBeXl5eXl5eXl5eXl5eXl5eXl5eXl5eXi0tLS0gcHJvcGVydHkgYXNzaWdubWVudFxuICogfSlcbiAqIGNsYXNzIEFwcENvbXBvbmVudCB7fVxuICogICAgICAgICAgIF4tLS0tIGNsYXNzIGRlY2xhcmF0aW9uIG5vZGVcbiAqXG4gKiBAcGFyYW0gcHJvcEFzZ24gcHJvcGVydHkgYXNzaWdubWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AocHJvcEFzZ25Ob2RlOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpOlxuICAgIHRzLkNsYXNzRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgaWYgKCFwcm9wQXNnbk5vZGUucGFyZW50IHx8ICF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BBc2duTm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG9iakxpdEV4cHJOb2RlID0gcHJvcEFzZ25Ob2RlLnBhcmVudDtcbiAgaWYgKCFvYmpMaXRFeHByTm9kZS5wYXJlbnQgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob2JqTGl0RXhwck5vZGUucGFyZW50KSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjYWxsRXhwck5vZGUgPSBvYmpMaXRFeHByTm9kZS5wYXJlbnQ7XG4gIGlmICghY2FsbEV4cHJOb2RlLnBhcmVudCB8fCAhdHMuaXNEZWNvcmF0b3IoY2FsbEV4cHJOb2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgZGVjb3JhdG9yID0gY2FsbEV4cHJOb2RlLnBhcmVudDtcbiAgaWYgKCFkZWNvcmF0b3IucGFyZW50IHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjb3JhdG9yLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsTm9kZSA9IGRlY29yYXRvci5wYXJlbnQ7XG4gIHJldHVybiBjbGFzc0RlY2xOb2RlO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG9uIGEgY2xhc3MgZGVjb3JhdG9yLlxuICogU2VlIGBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcGVydHlgLCB3aGljaCBnZXRzIHRoZSBjbGFzcyB0aGUgZGVjb3JhdG9yIGlzIGFwcGxpZWQgdG8sIGZvclxuICogbW9yZSBkZXRhaWxzLlxuICpcbiAqIEBwYXJhbSBwcm9wIHByb3BlcnR5IGFzc2lnbm1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWNvcmF0b3JQcm9wZXJ0eShwcm9wQXNnbjogdHMuUHJvcGVydHlBc3NpZ25tZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiAhIWdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKHByb3BBc2duKTtcbn1cbiJdfQ==