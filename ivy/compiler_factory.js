/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/language-service/ivy/compiler_factory", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/incremental", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/language_service_adapter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompilerFactory = void 0;
    var tslib_1 = require("tslib");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var ts = require("typescript/lib/tsserverlibrary");
    var language_service_adapter_1 = require("@angular/language-service/ivy/language_service_adapter");
    var CompilerFactory = /** @class */ (function () {
        function CompilerFactory(adapter, programStrategy) {
            this.adapter = adapter;
            this.programStrategy = programStrategy;
            this.incrementalStrategy = new incremental_1.TrackedIncrementalBuildStrategy();
            this.compiler = null;
            this.lastKnownProgram = null;
        }
        /**
         * Create a new instance of the Ivy compiler if the program has changed since
         * the last time the compiler was instantiated. If the program has not changed,
         * return the existing instance.
         * @param fileName override the template if this is an external template file
         * @param options angular compiler options
         */
        CompilerFactory.prototype.getOrCreateWithChangedFile = function (fileName, options) {
            var program = this.programStrategy.getProgram();
            if (!this.compiler || program !== this.lastKnownProgram) {
                this.compiler = new core_1.NgCompiler(this.adapter, // like compiler host
                options, // angular compiler options
                program, this.programStrategy, this.incrementalStrategy, true, // enableTemplateTypeChecker
                true, // usePoisonedData
                this.lastKnownProgram, undefined);
                this.lastKnownProgram = program;
            }
            if (language_service_adapter_1.isExternalTemplate(fileName)) {
                this.overrideTemplate(fileName, this.compiler);
            }
            return this.compiler;
        };
        CompilerFactory.prototype.overrideTemplate = function (fileName, compiler) {
            var e_1, _a;
            if (!this.adapter.isTemplateDirty(fileName)) {
                return;
            }
            // 1. Get the latest snapshot
            var latestTemplate = this.adapter.readResource(fileName);
            // 2. Find all components that use the template
            var ttc = compiler.getTemplateTypeChecker();
            var components = compiler.getComponentsWithTemplateFile(fileName);
            try {
                // 3. Update component template
                for (var components_1 = tslib_1.__values(components), components_1_1 = components_1.next(); !components_1_1.done; components_1_1 = components_1.next()) {
                    var component = components_1_1.value;
                    if (ts.isClassDeclaration(component)) {
                        ttc.overrideComponentTemplate(component, latestTemplate);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (components_1_1 && !components_1_1.done && (_a = components_1.return)) _a.call(components_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        CompilerFactory.prototype.registerLastKnownProgram = function () {
            this.lastKnownProgram = this.programStrategy.getProgram();
        };
        return CompilerFactory;
    }());
    exports.CompilerFactory = CompilerFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2NvbXBpbGVyX2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDZEQUFnRTtJQUVoRSwyRUFBNEY7SUFFNUYsbURBQXFEO0lBRXJELG1HQUFzRjtJQUV0RjtRQUtFLHlCQUNxQixPQUErQixFQUMvQixlQUE0QztZQUQ1QyxZQUFPLEdBQVAsT0FBTyxDQUF3QjtZQUMvQixvQkFBZSxHQUFmLGVBQWUsQ0FBNkI7WUFOaEQsd0JBQW1CLEdBQUcsSUFBSSw2Q0FBK0IsRUFBRSxDQUFDO1lBQ3JFLGFBQVEsR0FBb0IsSUFBSSxDQUFDO1lBQ2pDLHFCQUFnQixHQUFvQixJQUFJLENBQUM7UUFLOUMsQ0FBQztRQUVKOzs7Ozs7V0FNRztRQUNILG9EQUEwQixHQUExQixVQUEyQixRQUFnQixFQUFFLE9BQTBCO1lBQ3JFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDdkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGlCQUFVLENBQzFCLElBQUksQ0FBQyxPQUFPLEVBQUcscUJBQXFCO2dCQUNwQyxPQUFPLEVBQVEsMkJBQTJCO2dCQUMxQyxPQUFPLEVBQ1AsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLG1CQUFtQixFQUN4QixJQUFJLEVBQUcsNEJBQTRCO2dCQUNuQyxJQUFJLEVBQUcsa0JBQWtCO2dCQUN6QixJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLFNBQVMsQ0FDWixDQUFDO2dCQUNGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7YUFDakM7WUFDRCxJQUFJLDZDQUFrQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNoRDtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2QixDQUFDO1FBRU8sMENBQWdCLEdBQXhCLFVBQXlCLFFBQWdCLEVBQUUsUUFBb0I7O1lBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0MsT0FBTzthQUNSO1lBQ0QsNkJBQTZCO1lBQzdCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNELCtDQUErQztZQUMvQyxJQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM5QyxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7O2dCQUNwRSwrQkFBK0I7Z0JBQy9CLEtBQXdCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7b0JBQS9CLElBQU0sU0FBUyx1QkFBQTtvQkFDbEIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ3BDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQzFEO2lCQUNGOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsa0RBQXdCLEdBQXhCO1lBQ0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDNUQsQ0FBQztRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQTNERCxJQTJEQztJQTNEWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpJztcbmltcG9ydCB7VHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge1R5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7aXNFeHRlcm5hbFRlbXBsYXRlLCBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2VfYWRhcHRlcic7XG5cbmV4cG9ydCBjbGFzcyBDb21waWxlckZhY3Rvcnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGluY3JlbWVudGFsU3RyYXRlZ3kgPSBuZXcgVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSgpO1xuICBwcml2YXRlIGNvbXBpbGVyOiBOZ0NvbXBpbGVyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RLbm93blByb2dyYW06IHRzLlByb2dyYW18bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGFkYXB0ZXI6IExhbmd1YWdlU2VydmljZUFkYXB0ZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHByb2dyYW1TdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICApIHt9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgSXZ5IGNvbXBpbGVyIGlmIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkIHNpbmNlXG4gICAqIHRoZSBsYXN0IHRpbWUgdGhlIGNvbXBpbGVyIHdhcyBpbnN0YW50aWF0ZWQuIElmIHRoZSBwcm9ncmFtIGhhcyBub3QgY2hhbmdlZCxcbiAgICogcmV0dXJuIHRoZSBleGlzdGluZyBpbnN0YW5jZS5cbiAgICogQHBhcmFtIGZpbGVOYW1lIG92ZXJyaWRlIHRoZSB0ZW1wbGF0ZSBpZiB0aGlzIGlzIGFuIGV4dGVybmFsIHRlbXBsYXRlIGZpbGVcbiAgICogQHBhcmFtIG9wdGlvbnMgYW5ndWxhciBjb21waWxlciBvcHRpb25zXG4gICAqL1xuICBnZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZTogc3RyaW5nLCBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyk6IE5nQ29tcGlsZXIge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1TdHJhdGVneS5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCF0aGlzLmNvbXBpbGVyIHx8IHByb2dyYW0gIT09IHRoaXMubGFzdEtub3duUHJvZ3JhbSkge1xuICAgICAgdGhpcy5jb21waWxlciA9IG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgIHRoaXMuYWRhcHRlciwgIC8vIGxpa2UgY29tcGlsZXIgaG9zdFxuICAgICAgICAgIG9wdGlvbnMsICAgICAgIC8vIGFuZ3VsYXIgY29tcGlsZXIgb3B0aW9uc1xuICAgICAgICAgIHByb2dyYW0sXG4gICAgICAgICAgdGhpcy5wcm9ncmFtU3RyYXRlZ3ksXG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LFxuICAgICAgICAgIHRydWUsICAvLyBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyXG4gICAgICAgICAgdHJ1ZSwgIC8vIHVzZVBvaXNvbmVkRGF0YVxuICAgICAgICAgIHRoaXMubGFzdEtub3duUHJvZ3JhbSxcbiAgICAgICAgICB1bmRlZmluZWQsICAvLyBwZXJmUmVjb3JkZXIgKHVzZSBkZWZhdWx0KVxuICAgICAgKTtcbiAgICAgIHRoaXMubGFzdEtub3duUHJvZ3JhbSA9IHByb2dyYW07XG4gICAgfVxuICAgIGlmIChpc0V4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWUpKSB7XG4gICAgICB0aGlzLm92ZXJyaWRlVGVtcGxhdGUoZmlsZU5hbWUsIHRoaXMuY29tcGlsZXIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgb3ZlcnJpZGVUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nLCBjb21waWxlcjogTmdDb21waWxlcikge1xuICAgIGlmICghdGhpcy5hZGFwdGVyLmlzVGVtcGxhdGVEaXJ0eShmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gMS4gR2V0IHRoZSBsYXRlc3Qgc25hcHNob3RcbiAgICBjb25zdCBsYXRlc3RUZW1wbGF0ZSA9IHRoaXMuYWRhcHRlci5yZWFkUmVzb3VyY2UoZmlsZU5hbWUpO1xuICAgIC8vIDIuIEZpbmQgYWxsIGNvbXBvbmVudHMgdGhhdCB1c2UgdGhlIHRlbXBsYXRlXG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgLy8gMy4gVXBkYXRlIGNvbXBvbmVudCB0ZW1wbGF0ZVxuICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0dGMub3ZlcnJpZGVDb21wb25lbnRUZW1wbGF0ZShjb21wb25lbnQsIGxhdGVzdFRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKSB7XG4gICAgdGhpcy5sYXN0S25vd25Qcm9ncmFtID0gdGhpcy5wcm9ncmFtU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICB9XG59XG4iXX0=