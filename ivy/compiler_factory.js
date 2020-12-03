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
        define("@angular/language-service/ivy/compiler_factory", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/incremental", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompilerFactory = void 0;
    var tslib_1 = require("tslib");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var ts = require("typescript/lib/tsserverlibrary");
    var utils_1 = require("@angular/language-service/ivy/utils");
    /**
     * Manages the `NgCompiler` instance which backs the language service, updating or replacing it as
     * needed to produce an up-to-date understanding of the current program.
     *
     * TODO(alxhub): currently the options used for the compiler are specified at `CompilerFactory`
     * construction, and are not changable. In a real project, users can update `tsconfig.json`. We need
     * to properly handle a change in the compiler options, either by having an API to update the
     * `CompilerFactory` to use new options, or by replacing it entirely.
     */
    var CompilerFactory = /** @class */ (function () {
        function CompilerFactory(adapter, programStrategy, options) {
            this.adapter = adapter;
            this.programStrategy = programStrategy;
            this.options = options;
            this.incrementalStrategy = new incremental_1.TrackedIncrementalBuildStrategy();
            this.compiler = null;
            this.lastKnownProgram = null;
        }
        CompilerFactory.prototype.getOrCreate = function () {
            var program = this.programStrategy.getProgram();
            if (this.compiler === null || program !== this.lastKnownProgram) {
                this.compiler = new core_1.NgCompiler(this.adapter, // like compiler host
                this.options, // angular compiler options
                program, this.programStrategy, this.incrementalStrategy, true, // enableTemplateTypeChecker
                true, // usePoisonedData
                this.lastKnownProgram, undefined);
                this.lastKnownProgram = program;
            }
            return this.compiler;
        };
        /**
         * Create a new instance of the Ivy compiler if the program has changed since
         * the last time the compiler was instantiated. If the program has not changed,
         * return the existing instance.
         * @param fileName override the template if this is an external template file
         * @param options angular compiler options
         */
        CompilerFactory.prototype.getOrCreateWithChangedFile = function (fileName) {
            var compiler = this.getOrCreate();
            if (utils_1.isExternalTemplate(fileName)) {
                this.overrideTemplate(fileName, compiler);
            }
            return compiler;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2NvbXBpbGVyX2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDZEQUFnRTtJQUVoRSwyRUFBNEY7SUFFNUYsbURBQXFEO0lBR3JELDZEQUEyQztJQUUzQzs7Ozs7Ozs7T0FRRztJQUNIO1FBS0UseUJBQ3FCLE9BQStCLEVBQy9CLGVBQTRDLEVBQzVDLE9BQTBCO1lBRjFCLFlBQU8sR0FBUCxPQUFPLENBQXdCO1lBQy9CLG9CQUFlLEdBQWYsZUFBZSxDQUE2QjtZQUM1QyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQVA5Qix3QkFBbUIsR0FBRyxJQUFJLDZDQUErQixFQUFFLENBQUM7WUFDckUsYUFBUSxHQUFvQixJQUFJLENBQUM7WUFDakMscUJBQWdCLEdBQW9CLElBQUksQ0FBQztRQU05QyxDQUFDO1FBRUoscUNBQVcsR0FBWDtZQUNFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFO2dCQUMvRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksaUJBQVUsQ0FDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRyxxQkFBcUI7Z0JBQ3BDLElBQUksQ0FBQyxPQUFPLEVBQUcsMkJBQTJCO2dCQUMxQyxPQUFPLEVBQ1AsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLG1CQUFtQixFQUN4QixJQUFJLEVBQUcsNEJBQTRCO2dCQUNuQyxJQUFJLEVBQUcsa0JBQWtCO2dCQUN6QixJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLFNBQVMsQ0FDWixDQUFDO2dCQUNGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7YUFDakM7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDdkIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNILG9EQUEwQixHQUExQixVQUEyQixRQUFnQjtZQUN6QyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsSUFBSSwwQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUMzQztZQUNELE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFFTywwQ0FBZ0IsR0FBeEIsVUFBeUIsUUFBZ0IsRUFBRSxRQUFvQjs7WUFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMzQyxPQUFPO2FBQ1I7WUFDRCw2QkFBNkI7WUFDN0IsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0QsK0NBQStDO1lBQy9DLElBQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQzlDLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQ3BFLCtCQUErQjtnQkFDL0IsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtvQkFBL0IsSUFBTSxTQUFTLHVCQUFBO29CQUNsQixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDcEMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztxQkFDMUQ7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRCxrREFBd0IsR0FBeEI7WUFDRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM1RCxDQUFDO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBakVELElBaUVDO0lBakVZLDBDQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnN9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9hcGknO1xuaW1wb3J0IHtUcmFja2VkSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsJztcbmltcG9ydCB7VHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyfSBmcm9tICcuL2FkYXB0ZXJzJztcbmltcG9ydCB7aXNFeHRlcm5hbFRlbXBsYXRlfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBgTmdDb21waWxlcmAgaW5zdGFuY2Ugd2hpY2ggYmFja3MgdGhlIGxhbmd1YWdlIHNlcnZpY2UsIHVwZGF0aW5nIG9yIHJlcGxhY2luZyBpdCBhc1xuICogbmVlZGVkIHRvIHByb2R1Y2UgYW4gdXAtdG8tZGF0ZSB1bmRlcnN0YW5kaW5nIG9mIHRoZSBjdXJyZW50IHByb2dyYW0uXG4gKlxuICogVE9ETyhhbHhodWIpOiBjdXJyZW50bHkgdGhlIG9wdGlvbnMgdXNlZCBmb3IgdGhlIGNvbXBpbGVyIGFyZSBzcGVjaWZpZWQgYXQgYENvbXBpbGVyRmFjdG9yeWBcbiAqIGNvbnN0cnVjdGlvbiwgYW5kIGFyZSBub3QgY2hhbmdhYmxlLiBJbiBhIHJlYWwgcHJvamVjdCwgdXNlcnMgY2FuIHVwZGF0ZSBgdHNjb25maWcuanNvbmAuIFdlIG5lZWRcbiAqIHRvIHByb3Blcmx5IGhhbmRsZSBhIGNoYW5nZSBpbiB0aGUgY29tcGlsZXIgb3B0aW9ucywgZWl0aGVyIGJ5IGhhdmluZyBhbiBBUEkgdG8gdXBkYXRlIHRoZVxuICogYENvbXBpbGVyRmFjdG9yeWAgdG8gdXNlIG5ldyBvcHRpb25zLCBvciBieSByZXBsYWNpbmcgaXQgZW50aXJlbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21waWxlckZhY3Rvcnkge1xuICBwcml2YXRlIHJlYWRvbmx5IGluY3JlbWVudGFsU3RyYXRlZ3kgPSBuZXcgVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSgpO1xuICBwcml2YXRlIGNvbXBpbGVyOiBOZ0NvbXBpbGVyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RLbm93blByb2dyYW06IHRzLlByb2dyYW18bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGFkYXB0ZXI6IExhbmd1YWdlU2VydmljZUFkYXB0ZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHByb2dyYW1TdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgKSB7fVxuXG4gIGdldE9yQ3JlYXRlKCk6IE5nQ29tcGlsZXIge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1TdHJhdGVneS5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKHRoaXMuY29tcGlsZXIgPT09IG51bGwgfHwgcHJvZ3JhbSAhPT0gdGhpcy5sYXN0S25vd25Qcm9ncmFtKSB7XG4gICAgICB0aGlzLmNvbXBpbGVyID0gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgdGhpcy5hZGFwdGVyLCAgLy8gbGlrZSBjb21waWxlciBob3N0XG4gICAgICAgICAgdGhpcy5vcHRpb25zLCAgLy8gYW5ndWxhciBjb21waWxlciBvcHRpb25zXG4gICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICB0aGlzLnByb2dyYW1TdHJhdGVneSxcbiAgICAgICAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3ksXG4gICAgICAgICAgdHJ1ZSwgIC8vIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXJcbiAgICAgICAgICB0cnVlLCAgLy8gdXNlUG9pc29uZWREYXRhXG4gICAgICAgICAgdGhpcy5sYXN0S25vd25Qcm9ncmFtLFxuICAgICAgICAgIHVuZGVmaW5lZCwgIC8vIHBlcmZSZWNvcmRlciAodXNlIGRlZmF1bHQpXG4gICAgICApO1xuICAgICAgdGhpcy5sYXN0S25vd25Qcm9ncmFtID0gcHJvZ3JhbTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXI7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBJdnkgY29tcGlsZXIgaWYgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQgc2luY2VcbiAgICogdGhlIGxhc3QgdGltZSB0aGUgY29tcGlsZXIgd2FzIGluc3RhbnRpYXRlZC4gSWYgdGhlIHByb2dyYW0gaGFzIG5vdCBjaGFuZ2VkLFxuICAgKiByZXR1cm4gdGhlIGV4aXN0aW5nIGluc3RhbmNlLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgb3ZlcnJpZGUgdGhlIHRlbXBsYXRlIGlmIHRoaXMgaXMgYW4gZXh0ZXJuYWwgdGVtcGxhdGUgZmlsZVxuICAgKiBAcGFyYW0gb3B0aW9ucyBhbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnNcbiAgICovXG4gIGdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBOZ0NvbXBpbGVyIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuZ2V0T3JDcmVhdGUoKTtcbiAgICBpZiAoaXNFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5vdmVycmlkZVRlbXBsYXRlKGZpbGVOYW1lLCBjb21waWxlcik7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlcjtcbiAgfVxuXG4gIHByaXZhdGUgb3ZlcnJpZGVUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nLCBjb21waWxlcjogTmdDb21waWxlcikge1xuICAgIGlmICghdGhpcy5hZGFwdGVyLmlzVGVtcGxhdGVEaXJ0eShmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gMS4gR2V0IHRoZSBsYXRlc3Qgc25hcHNob3RcbiAgICBjb25zdCBsYXRlc3RUZW1wbGF0ZSA9IHRoaXMuYWRhcHRlci5yZWFkUmVzb3VyY2UoZmlsZU5hbWUpO1xuICAgIC8vIDIuIEZpbmQgYWxsIGNvbXBvbmVudHMgdGhhdCB1c2UgdGhlIHRlbXBsYXRlXG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgLy8gMy4gVXBkYXRlIGNvbXBvbmVudCB0ZW1wbGF0ZVxuICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0dGMub3ZlcnJpZGVDb21wb25lbnRUZW1wbGF0ZShjb21wb25lbnQsIGxhdGVzdFRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKSB7XG4gICAgdGhpcy5sYXN0S25vd25Qcm9ncmFtID0gdGhpcy5wcm9ncmFtU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICB9XG59XG4iXX0=