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
        define("@angular/language-service/src/template", ["require", "exports", "tslib", "@angular/compiler-cli", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var ts = require("typescript");
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
                        return compiler_cli_1.getPipesTable(sourceFile_1, program_1, typeChecker_1, ast.pipes || []);
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
     * Given a template node, return the ClassDeclaration node that corresponds to
     * the component class for the template.
     *
     * For example,
     *
     * @Component({
     *   template: '<div></div>' <-- template node
     * })
     * class AppComponent {}
     *           ^---- class declaration node
     *
     * @param node template node
     */
    function getClassDeclFromTemplateNode(node) {
        if (!ts.isStringLiteralLike(node)) {
            return;
        }
        if (!node.parent || !ts.isPropertyAssignment(node.parent)) {
            return;
        }
        var propAsgnNode = node.parent;
        if (propAsgnNode.name.getText() !== 'template') {
            return;
        }
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
    exports.getClassDeclFromTemplateNode = getClassDeclFromTemplateNode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy90ZW1wbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzREFBb0c7SUFDcEcsK0JBQWlDO0lBSWpDOzs7OztPQUtHO0lBQ0g7UUFLRSxzQkFDcUIsSUFBMkIsRUFDM0IsYUFBa0MsRUFDbEMsV0FBNEI7WUFGNUIsU0FBSSxHQUFKLElBQUksQ0FBdUI7WUFDM0Isa0JBQWEsR0FBYixhQUFhLENBQXFCO1lBQ2xDLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtZQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDOUIsQ0FBQztRQVNELHNCQUFJLDhCQUFJO1lBSFI7O2VBRUc7aUJBQ0gsY0FBYSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQU12QyxzQkFBSSxpQ0FBTztZQUpYOzs7ZUFHRztpQkFDSDtnQkFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtvQkFDdEIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbEQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDdEQsSUFBSSxDQUFDLFlBQVk7d0JBQ2IsNkNBQThCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztpQkFDL0Y7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzNCLENBQUM7OztXQUFBO1FBTUQsc0JBQUksK0JBQUs7WUFKVDs7O2VBR0c7aUJBQ0g7Z0JBQUEsaUJBZUM7Z0JBZEMsSUFBSSxDQUFDLElBQUksQ0FB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WUFDOUMsT0FBTztTQUNSO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzlFLE9BQU87U0FDUjtRQUNELElBQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3pFLE9BQU87U0FDUjtRQUNELElBQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNoRSxPQUFPO1NBQ1I7UUFDRCxJQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNqRSxPQUFPO1NBQ1I7UUFDRCxJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3ZDLE9BQU8sYUFBYSxDQUFDO0lBQ3ZCLENBQUM7SUE1QkQsb0VBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2dldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbiwgZ2V0UGlwZXNUYWJsZSwgZ2V0U3ltYm9sUXVlcnl9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcblxuLyoqXG4gKiBBIGJhc2UgY2xhc3MgdG8gcmVwcmVzZW50IGEgdGVtcGxhdGUgYW5kIHdoaWNoIGNvbXBvbmVudCBjbGFzcyBpdCBpc1xuICogYXNzb2NpYXRlZCB3aXRoLiBBIHRlbXBsYXRlIHNvdXJjZSBjb3VsZCBhbnN3ZXIgYmFzaWMgcXVlc3Rpb25zIGFib3V0XG4gKiB0b3AtbGV2ZWwgZGVjbGFyYXRpb25zIG9mIGl0cyBjbGFzcyB0aHJvdWdoIHRoZSBtZW1iZXJzKCkgYW5kIHF1ZXJ5KClcbiAqIG1ldGhvZHMuXG4gKi9cbmFic3RyYWN0IGNsYXNzIEJhc2VUZW1wbGF0ZSBpbXBsZW1lbnRzIG5nLlRlbXBsYXRlU291cmNlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBwcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIG1lbWJlcnNUYWJsZTogbmcuU3ltYm9sVGFibGV8dW5kZWZpbmVkO1xuICBwcml2YXRlIHF1ZXJ5Q2FjaGU6IG5nLlN5bWJvbFF1ZXJ5fHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjbGFzc0RlY2xOb2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sKSB7XG4gICAgdGhpcy5wcm9ncmFtID0gaG9zdC5wcm9ncmFtO1xuICB9XG5cbiAgYWJzdHJhY3QgZ2V0IHNwYW4oKTogbmcuU3BhbjtcbiAgYWJzdHJhY3QgZ2V0IGZpbGVOYW1lKCk6IHN0cmluZztcbiAgYWJzdHJhY3QgZ2V0IHNvdXJjZSgpOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgQW5ndWxhciBTdGF0aWNTeW1ib2wgZm9yIHRoZSBjbGFzcyB0aGF0IGNvbnRhaW5zIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuY2xhc3NTeW1ib2w7IH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgTWFwLWxpa2UgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBhbGxvd3MgdXNlcnMgdG8gcmV0cmlldmUgc29tZSBvciBhbGxcbiAgICogdG9wLWxldmVsIGRlY2xhcmF0aW9ucyBpbiB0aGUgYXNzb2NpYXRlZCBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgbWVtYmVycygpIHtcbiAgICBpZiAoIXRoaXMubWVtYmVyc1RhYmxlKSB7XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB0aGlzLm1lbWJlcnNUYWJsZSA9XG4gICAgICAgICAgZ2V0Q2xhc3NNZW1iZXJzRnJvbURlY2xhcmF0aW9uKHRoaXMucHJvZ3JhbSwgdHlwZUNoZWNrZXIsIHNvdXJjZUZpbGUsIHRoaXMuY2xhc3NEZWNsTm9kZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1lbWJlcnNUYWJsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gZW5naW5lIHRoYXQgcHJvdmlkZXMgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCBzeW1ib2xzIGluIHRoZVxuICAgKiB0ZW1wbGF0ZS5cbiAgICovXG4gIGdldCBxdWVyeSgpIHtcbiAgICBpZiAoIXRoaXMucXVlcnlDYWNoZSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbTtcbiAgICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB0aGlzLnF1ZXJ5Q2FjaGUgPSBnZXRTeW1ib2xRdWVyeShwcm9ncmFtLCB0eXBlQ2hlY2tlciwgc291cmNlRmlsZSwgKCkgPT4ge1xuICAgICAgICAvLyBDb21wdXRpbmcgdGhlIGFzdCBpcyByZWxhdGl2ZWx5IGV4cGVuc2l2ZS4gRG8gaXQgb25seSB3aGVuIGFic29sdXRlbHlcbiAgICAgICAgLy8gbmVjZXNzYXJ5LlxuICAgICAgICAvLyBUT0RPOiBUaGVyZSBpcyBjaXJjdWxhciBkZXBlbmRlbmN5IGhlcmUgYmV0d2VlbiBUZW1wbGF0ZVNvdXJjZSBhbmRcbiAgICAgICAgLy8gVHlwZVNjcmlwdEhvc3QuIENvbnNpZGVyIHJlZmFjdG9yaW5nIHRoZSBjb2RlIHRvIGJyZWFrIHRoaXMgY3ljbGUuXG4gICAgICAgIGNvbnN0IGFzdCA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZUFzdCh0aGlzKTtcbiAgICAgICAgcmV0dXJuIGdldFBpcGVzVGFibGUoc291cmNlRmlsZSwgcHJvZ3JhbSwgdHlwZUNoZWNrZXIsIGFzdC5waXBlcyB8fCBbXSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucXVlcnlDYWNoZTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIElubGluZVRlbXBsYXRlIHJlcHJlc2VudHMgdGVtcGxhdGUgZGVmaW5lZCBpbiBhIFRTIGZpbGUgdGhyb3VnaCB0aGVcbiAqIGB0ZW1wbGF0ZWAgYXR0cmlidXRlIGluIHRoZSBkZWNvcmF0b3IuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmxpbmVUZW1wbGF0ZSBleHRlbmRzIEJhc2VUZW1wbGF0ZSB7XG4gIHB1YmxpYyByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgc291cmNlOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBzcGFuOiBuZy5TcGFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgdGVtcGxhdGVOb2RlOiB0cy5TdHJpbmdMaXRlcmFsTGlrZSwgY2xhc3NEZWNsTm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGNsYXNzU3ltYm9sOiBuZy5TdGF0aWNTeW1ib2wsIGhvc3Q6IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkge1xuICAgIHN1cGVyKGhvc3QsIGNsYXNzRGVjbE5vZGUsIGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGVtcGxhdGVOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoc291cmNlRmlsZSAhPT0gY2xhc3NEZWNsTm9kZS5nZXRTb3VyY2VGaWxlKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5saW5lIHRlbXBsYXRlIGFuZCBjb21wb25lbnQgY2xhc3Mgc2hvdWxkIGJlbG9uZyB0byB0aGUgc2FtZSBzb3VyY2UgZmlsZWApO1xuICAgIH1cbiAgICB0aGlzLmZpbGVOYW1lID0gc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICB0aGlzLnNvdXJjZSA9IHRlbXBsYXRlTm9kZS50ZXh0O1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIC8vIFRTIHN0cmluZyBsaXRlcmFsIGluY2x1ZGVzIHN1cnJvdW5kaW5nIHF1b3RlcyBpbiB0aGUgc3RhcnQvZW5kIG9mZnNldHMuXG4gICAgICBzdGFydDogdGVtcGxhdGVOb2RlLmdldFN0YXJ0KCkgKyAxLFxuICAgICAgZW5kOiB0ZW1wbGF0ZU5vZGUuZ2V0RW5kKCkgLSAxLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBFeHRlcm5hbFRlbXBsYXRlIHJlcHJlc2VudHMgdGVtcGxhdGUgZGVmaW5lZCBpbiBhbiBleHRlcm5hbCAobW9zdCBsaWtlbHlcbiAqIEhUTUwsIGJ1dCBub3QgbmVjZXNzYXJpbHkpIGZpbGUgdGhyb3VnaCB0aGUgYHRlbXBsYXRlVXJsYCBhdHRyaWJ1dGUgaW4gdGhlXG4gKiBkZWNvcmF0b3IuXG4gKiBOb3RlIHRoYXQgdGhlcmUgaXMgbm8gdHMuTm9kZSBhc3NvY2lhdGVkIHdpdGggdGhlIHRlbXBsYXRlIGJlY2F1c2UgaXQncyBub3RcbiAqIGEgVFMgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsVGVtcGxhdGUgZXh0ZW5kcyBCYXNlVGVtcGxhdGUge1xuICBwdWJsaWMgcmVhZG9ubHkgc3BhbjogbmcuU3BhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyByZWFkb25seSBzb3VyY2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IGZpbGVOYW1lOiBzdHJpbmcsXG4gICAgICBjbGFzc0RlY2xOb2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBjbGFzc1N5bWJvbDogbmcuU3RhdGljU3ltYm9sLFxuICAgICAgaG9zdDogVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSB7XG4gICAgc3VwZXIoaG9zdCwgY2xhc3NEZWNsTm9kZSwgY2xhc3NTeW1ib2wpO1xuICAgIHRoaXMuc3BhbiA9IHtcbiAgICAgIHN0YXJ0OiAwLFxuICAgICAgZW5kOiBzb3VyY2UubGVuZ3RoLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHaXZlbiBhIHRlbXBsYXRlIG5vZGUsIHJldHVybiB0aGUgQ2xhc3NEZWNsYXJhdGlvbiBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG9cbiAqIHRoZSBjb21wb25lbnQgY2xhc3MgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBGb3IgZXhhbXBsZSxcbiAqXG4gKiBAQ29tcG9uZW50KHtcbiAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PicgPC0tIHRlbXBsYXRlIG5vZGVcbiAqIH0pXG4gKiBjbGFzcyBBcHBDb21wb25lbnQge31cbiAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gKlxuICogQHBhcmFtIG5vZGUgdGVtcGxhdGUgbm9kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsRnJvbVRlbXBsYXRlTm9kZShub2RlOiB0cy5Ob2RlKTogdHMuQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2Uobm9kZSkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFub2RlLnBhcmVudCB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByb3BBc2duTm9kZSA9IG5vZGUucGFyZW50O1xuICBpZiAocHJvcEFzZ25Ob2RlLm5hbWUuZ2V0VGV4dCgpICE9PSAndGVtcGxhdGUnKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghcHJvcEFzZ25Ob2RlLnBhcmVudCB8fCAhdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wQXNnbk5vZGUucGFyZW50KSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBvYmpMaXRFeHByTm9kZSA9IHByb3BBc2duTm9kZS5wYXJlbnQ7XG4gIGlmICghb2JqTGl0RXhwck5vZGUucGFyZW50IHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG9iakxpdEV4cHJOb2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2FsbEV4cHJOb2RlID0gb2JqTGl0RXhwck5vZGUucGFyZW50O1xuICBpZiAoIWNhbGxFeHByTm9kZS5wYXJlbnQgfHwgIXRzLmlzRGVjb3JhdG9yKGNhbGxFeHByTm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGRlY29yYXRvciA9IGNhbGxFeHByTm9kZS5wYXJlbnQ7XG4gIGlmICghZGVjb3JhdG9yLnBhcmVudCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY29yYXRvci5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNsYXNzRGVjbE5vZGUgPSBkZWNvcmF0b3IucGFyZW50O1xuICByZXR1cm4gY2xhc3NEZWNsTm9kZTtcbn1cbiJdfQ==