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
        define("@angular/language-service/src/template", ["require", "exports", "tslib", "@angular/language-service/src/global_symbols", "@angular/language-service/src/typescript_symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExternalTemplate = exports.InlineTemplate = void 0;
    var tslib_1 = require("tslib");
    var global_symbols_1 = require("@angular/language-service/src/global_symbols");
    var typescript_symbols_1 = require("@angular/language-service/src/typescript_symbols");
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
            get: function () {
                return this.classSymbol;
            },
            enumerable: false,
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
                        typescript_symbols_1.getClassMembersFromDeclaration(this.program, typeChecker, sourceFile, this.classDeclNode),
                    ]);
                }
                return this.membersTable;
            },
            enumerable: false,
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
                    this.queryCache = typescript_symbols_1.getSymbolQuery(program_1, typeChecker_1, sourceFile_1, function () {
                        // Computing the ast is relatively expensive. Do it only when absolutely
                        // necessary.
                        // TODO: There is circular dependency here between TemplateSource and
                        // TypeScriptHost. Consider refactoring the code to break this cycle.
                        var ast = _this.host.getTemplateAst(_this);
                        var pipes = (ast && ast.pipes) || [];
                        return typescript_symbols_1.getPipesTable(sourceFile_1, program_1, typeChecker_1, pipes);
                    });
                }
                return this.queryCache;
            },
            enumerable: false,
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
            // node.text returns the TS internal representation of the normalized text,
            // and all CR characters are stripped. node.getText() returns the raw text.
            _this.source = templateNode.getText().slice(1, -1); // strip leading and trailing quotes
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsK0VBQXlEO0lBR3pELHVGQUFtRztJQUduRzs7Ozs7T0FLRztJQUNIO1FBS0Usc0JBQ3FCLElBQTJCLEVBQzNCLGFBQWtDLEVBQ2xDLFdBQTRCO1lBRjVCLFNBQUksR0FBSixJQUFJLENBQXVCO1lBQzNCLGtCQUFhLEdBQWIsYUFBYSxDQUFxQjtZQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7WUFDL0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzlCLENBQUM7UUFTRCxzQkFBSSw4QkFBSTtZQUhSOztlQUVHO2lCQUNIO2dCQUNFLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUMxQixDQUFDOzs7V0FBQTtRQU1ELHNCQUFJLGlDQUFPO1lBSlg7OztlQUdHO2lCQUNIO2dCQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO29CQUN0QixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNsRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUN0RCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7d0JBQzlDLHdDQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7d0JBQ25DLG1EQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDO3FCQUMxRixDQUFDLENBQUM7aUJBQ0o7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzNCLENBQUM7OztXQUFBO1FBTUQsc0JBQUksK0JBQUs7WUFKVDs7O2VBR0c7aUJBQ0g7Z0JBQUEsaUJBZ0JDO2dCQWZDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNwQixJQUFNLFNBQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUM3QixJQUFNLGFBQVcsR0FBRyxTQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQzdDLElBQU0sWUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3RELElBQUksQ0FBQyxVQUFVLEdBQUcsbUNBQWMsQ0FBQyxTQUFPLEVBQUUsYUFBVyxFQUFFLFlBQVUsRUFBRTt3QkFDakUsd0VBQXdFO3dCQUN4RSxhQUFhO3dCQUNiLHFFQUFxRTt3QkFDckUscUVBQXFFO3dCQUNyRSxJQUFNLEdBQUcsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsQ0FBQzt3QkFDM0MsSUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDdkMsT0FBTyxrQ0FBYSxDQUFDLFlBQVUsRUFBRSxTQUFPLEVBQUUsYUFBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNoRSxDQUFDLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekIsQ0FBQzs7O1dBQUE7UUFDSCxtQkFBQztJQUFELENBQUMsQUE1REQsSUE0REM7SUFFRDs7O09BR0c7SUFDSDtRQUFvQywwQ0FBWTtRQUs5Qyx3QkFDSSxZQUFrQyxFQUFFLGFBQWtDLEVBQ3RFLFdBQTRCLEVBQUUsSUFBMkI7WUFGN0QsWUFHRSxrQkFBTSxJQUFJLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxTQWN4QztZQWJDLElBQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoRCxJQUFJLFVBQVUsS0FBSyxhQUFhLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsMkVBQTJFLENBQUMsQ0FBQzthQUM5RjtZQUNELEtBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNwQywyRUFBMkU7WUFDM0UsMkVBQTJFO1lBQzNFLEtBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLG9DQUFvQztZQUN4RixLQUFJLENBQUMsSUFBSSxHQUFHO2dCQUNWLDBFQUEwRTtnQkFDMUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO2dCQUNsQyxHQUFHLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7YUFDL0IsQ0FBQzs7UUFDSixDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBdkJELENBQW9DLFlBQVksR0F1Qi9DO0lBdkJZLHdDQUFjO0lBeUIzQjs7Ozs7O09BTUc7SUFDSDtRQUFzQyw0Q0FBWTtRQUdoRCwwQkFDb0IsTUFBYyxFQUFrQixRQUFnQixFQUNoRSxhQUFrQyxFQUFFLFdBQTRCLEVBQ2hFLElBQTJCO1lBSC9CLFlBSUUsa0JBQU0sSUFBSSxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsU0FLeEM7WUFSbUIsWUFBTSxHQUFOLE1BQU0sQ0FBUTtZQUFrQixjQUFRLEdBQVIsUUFBUSxDQUFRO1lBSWxFLEtBQUksQ0FBQyxJQUFJLEdBQUc7Z0JBQ1YsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNO2FBQ25CLENBQUM7O1FBQ0osQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWJELENBQXNDLFlBQVksR0FhakQ7SUFiWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZUdsb2JhbFN5bWJvbFRhYmxlfSBmcm9tICcuL2dsb2JhbF9zeW1ib2xzJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcbmltcG9ydCB7Z2V0Q2xhc3NNZW1iZXJzRnJvbURlY2xhcmF0aW9uLCBnZXRQaXBlc1RhYmxlLCBnZXRTeW1ib2xRdWVyeX0gZnJvbSAnLi90eXBlc2NyaXB0X3N5bWJvbHMnO1xuXG5cbi8qKlxuICogQSBiYXNlIGNsYXNzIHRvIHJlcHJlc2VudCBhIHRlbXBsYXRlIGFuZCB3aGljaCBjb21wb25lbnQgY2xhc3MgaXQgaXNcbiAqIGFzc29jaWF0ZWQgd2l0aC4gQSB0ZW1wbGF0ZSBzb3VyY2UgY291bGQgYW5zd2VyIGJhc2ljIHF1ZXN0aW9ucyBhYm91dFxuICogdG9wLWxldmVsIGRlY2xhcmF0aW9ucyBvZiBpdHMgY2xhc3MgdGhyb3VnaCB0aGUgbWVtYmVycygpIGFuZCBxdWVyeSgpXG4gKiBtZXRob2RzLlxuICovXG5hYnN0cmFjdCBjbGFzcyBCYXNlVGVtcGxhdGUgaW1wbGVtZW50cyBuZy5UZW1wbGF0ZVNvdXJjZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSBtZW1iZXJzVGFibGU6IG5nLlN5bWJvbFRhYmxlfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBxdWVyeUNhY2hlOiBuZy5TeW1ib2xRdWVyeXx1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NEZWNsTm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2xhc3NTeW1ib2w6IG5nLlN0YXRpY1N5bWJvbCkge1xuICAgIHRoaXMucHJvZ3JhbSA9IGhvc3QucHJvZ3JhbTtcbiAgfVxuXG4gIGFic3RyYWN0IGdldCBzcGFuKCk6IG5nLlNwYW47XG4gIGFic3RyYWN0IGdldCBmaWxlTmFtZSgpOiBzdHJpbmc7XG4gIGFic3RyYWN0IGdldCBzb3VyY2UoKTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIEFuZ3VsYXIgU3RhdGljU3ltYm9sIGZvciB0aGUgY2xhc3MgdGhhdCBjb250YWlucyB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgZ2V0IHR5cGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xhc3NTeW1ib2w7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgTWFwLWxpa2UgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBhbGxvd3MgdXNlcnMgdG8gcmV0cmlldmUgc29tZSBvciBhbGxcbiAgICogdG9wLWxldmVsIGRlY2xhcmF0aW9ucyBpbiB0aGUgYXNzb2NpYXRlZCBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgbWVtYmVycygpIHtcbiAgICBpZiAoIXRoaXMubWVtYmVyc1RhYmxlKSB7XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB0aGlzLm1lbWJlcnNUYWJsZSA9IHRoaXMucXVlcnkubWVyZ2VTeW1ib2xUYWJsZShbXG4gICAgICAgIGNyZWF0ZUdsb2JhbFN5bWJvbFRhYmxlKHRoaXMucXVlcnkpLFxuICAgICAgICBnZXRDbGFzc01lbWJlcnNGcm9tRGVjbGFyYXRpb24odGhpcy5wcm9ncmFtLCB0eXBlQ2hlY2tlciwgc291cmNlRmlsZSwgdGhpcy5jbGFzc0RlY2xOb2RlKSxcbiAgICAgIF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZW1iZXJzVGFibGU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFuIGVuZ2luZSB0aGF0IHByb3ZpZGVzIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgc3ltYm9scyBpbiB0aGVcbiAgICogdGVtcGxhdGUuXG4gICAqL1xuICBnZXQgcXVlcnkoKSB7XG4gICAgaWYgKCF0aGlzLnF1ZXJ5Q2FjaGUpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW07XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmNsYXNzRGVjbE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgdGhpcy5xdWVyeUNhY2hlID0gZ2V0U3ltYm9sUXVlcnkocHJvZ3JhbSwgdHlwZUNoZWNrZXIsIHNvdXJjZUZpbGUsICgpID0+IHtcbiAgICAgICAgLy8gQ29tcHV0aW5nIHRoZSBhc3QgaXMgcmVsYXRpdmVseSBleHBlbnNpdmUuIERvIGl0IG9ubHkgd2hlbiBhYnNvbHV0ZWx5XG4gICAgICAgIC8vIG5lY2Vzc2FyeS5cbiAgICAgICAgLy8gVE9ETzogVGhlcmUgaXMgY2lyY3VsYXIgZGVwZW5kZW5jeSBoZXJlIGJldHdlZW4gVGVtcGxhdGVTb3VyY2UgYW5kXG4gICAgICAgIC8vIFR5cGVTY3JpcHRIb3N0LiBDb25zaWRlciByZWZhY3RvcmluZyB0aGUgY29kZSB0byBicmVhayB0aGlzIGN5Y2xlLlxuICAgICAgICBjb25zdCBhc3QgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVBc3QodGhpcyk7XG4gICAgICAgIGNvbnN0IHBpcGVzID0gKGFzdCAmJiBhc3QucGlwZXMpIHx8IFtdO1xuICAgICAgICByZXR1cm4gZ2V0UGlwZXNUYWJsZShzb3VyY2VGaWxlLCBwcm9ncmFtLCB0eXBlQ2hlY2tlciwgcGlwZXMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnF1ZXJ5Q2FjaGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBJbmxpbmVUZW1wbGF0ZSByZXByZXNlbnRzIHRlbXBsYXRlIGRlZmluZWQgaW4gYSBUUyBmaWxlIHRocm91Z2ggdGhlXG4gKiBgdGVtcGxhdGVgIGF0dHJpYnV0ZSBpbiB0aGUgZGVjb3JhdG9yLlxuICovXG5leHBvcnQgY2xhc3MgSW5saW5lVGVtcGxhdGUgZXh0ZW5kcyBCYXNlVGVtcGxhdGUge1xuICBwdWJsaWMgcmVhZG9ubHkgZmlsZU5hbWU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IHNvdXJjZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgc3BhbjogbmcuU3BhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHRlbXBsYXRlTm9kZTogdHMuU3RyaW5nTGl0ZXJhbExpa2UsIGNsYXNzRGVjbE5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sLCBob3N0OiBUeXBlU2NyaXB0U2VydmljZUhvc3QpIHtcbiAgICBzdXBlcihob3N0LCBjbGFzc0RlY2xOb2RlLCBjbGFzc1N5bWJvbCk7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRlbXBsYXRlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKHNvdXJjZUZpbGUgIT09IGNsYXNzRGVjbE5vZGUuZ2V0U291cmNlRmlsZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElubGluZSB0ZW1wbGF0ZSBhbmQgY29tcG9uZW50IGNsYXNzIHNob3VsZCBiZWxvbmcgdG8gdGhlIHNhbWUgc291cmNlIGZpbGVgKTtcbiAgICB9XG4gICAgdGhpcy5maWxlTmFtZSA9IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgLy8gbm9kZS50ZXh0IHJldHVybnMgdGhlIFRTIGludGVybmFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBub3JtYWxpemVkIHRleHQsXG4gICAgLy8gYW5kIGFsbCBDUiBjaGFyYWN0ZXJzIGFyZSBzdHJpcHBlZC4gbm9kZS5nZXRUZXh0KCkgcmV0dXJucyB0aGUgcmF3IHRleHQuXG4gICAgdGhpcy5zb3VyY2UgPSB0ZW1wbGF0ZU5vZGUuZ2V0VGV4dCgpLnNsaWNlKDEsIC0xKTsgIC8vIHN0cmlwIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHF1b3Rlc1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIC8vIFRTIHN0cmluZyBsaXRlcmFsIGluY2x1ZGVzIHN1cnJvdW5kaW5nIHF1b3RlcyBpbiB0aGUgc3RhcnQvZW5kIG9mZnNldHMuXG4gICAgICBzdGFydDogdGVtcGxhdGVOb2RlLmdldFN0YXJ0KCkgKyAxLFxuICAgICAgZW5kOiB0ZW1wbGF0ZU5vZGUuZ2V0RW5kKCkgLSAxLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBFeHRlcm5hbFRlbXBsYXRlIHJlcHJlc2VudHMgdGVtcGxhdGUgZGVmaW5lZCBpbiBhbiBleHRlcm5hbCAobW9zdCBsaWtlbHlcbiAqIEhUTUwsIGJ1dCBub3QgbmVjZXNzYXJpbHkpIGZpbGUgdGhyb3VnaCB0aGUgYHRlbXBsYXRlVXJsYCBhdHRyaWJ1dGUgaW4gdGhlXG4gKiBkZWNvcmF0b3IuXG4gKiBOb3RlIHRoYXQgdGhlcmUgaXMgbm8gdHMuTm9kZSBhc3NvY2lhdGVkIHdpdGggdGhlIHRlbXBsYXRlIGJlY2F1c2UgaXQncyBub3RcbiAqIGEgVFMgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsVGVtcGxhdGUgZXh0ZW5kcyBCYXNlVGVtcGxhdGUge1xuICBwdWJsaWMgcmVhZG9ubHkgc3BhbjogbmcuU3BhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyByZWFkb25seSBzb3VyY2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IGZpbGVOYW1lOiBzdHJpbmcsXG4gICAgICBjbGFzc0RlY2xOb2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sLFxuICAgICAgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gICAgc3VwZXIoaG9zdCwgY2xhc3NEZWNsTm9kZSwgY2xhc3NTeW1ib2wpO1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIHN0YXJ0OiAwLFxuICAgICAgZW5kOiBzb3VyY2UubGVuZ3RoLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==