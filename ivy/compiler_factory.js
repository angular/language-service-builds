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
                var ticket = void 0;
                if (this.compiler === null || this.lastKnownProgram === null) {
                    ticket = core_1.freshCompilationTicket(program, this.options, this.incrementalStrategy, this.programStrategy, true, true);
                }
                else {
                    ticket = core_1.incrementalFromCompilerTicket(this.compiler, program, this.incrementalStrategy, this.programStrategy, new Set());
                }
                this.compiler = core_1.NgCompiler.fromTicket(ticket, this.adapter);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2NvbXBpbGVyX2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDZEQUEwSTtJQUUxSSwyRUFBNEY7SUFFNUYsbURBQXFEO0lBR3JELDZEQUEyQztJQUUzQzs7Ozs7Ozs7T0FRRztJQUNIO1FBS0UseUJBQ3FCLE9BQStCLEVBQy9CLGVBQTRDLEVBQzVDLE9BQTBCO1lBRjFCLFlBQU8sR0FBUCxPQUFPLENBQXdCO1lBQy9CLG9CQUFlLEdBQWYsZUFBZSxDQUE2QjtZQUM1QyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQVA5Qix3QkFBbUIsR0FBRyxJQUFJLDZDQUErQixFQUFFLENBQUM7WUFDckUsYUFBUSxHQUFvQixJQUFJLENBQUM7WUFDakMscUJBQWdCLEdBQW9CLElBQUksQ0FBQztRQU05QyxDQUFDO1FBRUoscUNBQVcsR0FBWDtZQUNFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFO2dCQUMvRCxJQUFJLE1BQU0sU0FBbUIsQ0FBQztnQkFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFFO29CQUM1RCxNQUFNLEdBQUcsNkJBQXNCLENBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDeEY7cUJBQU07b0JBQ0wsTUFBTSxHQUFHLG9DQUE2QixDQUNsQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7aUJBQ3hGO2dCQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQzthQUNqQztZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2QixDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0gsb0RBQTBCLEdBQTFCLFVBQTJCLFFBQWdCO1lBQ3pDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxJQUFJLDBCQUFrQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVPLDBDQUFnQixHQUF4QixVQUF5QixRQUFnQixFQUFFLFFBQW9COztZQUM3RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzNDLE9BQU87YUFDUjtZQUNELDZCQUE2QjtZQUM3QixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzRCwrQ0FBK0M7WUFDL0MsSUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDOUMsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDOztnQkFDcEUsK0JBQStCO2dCQUMvQixLQUF3QixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUEvQixJQUFNLFNBQVMsdUJBQUE7b0JBQ2xCLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxFQUFFO3dCQUNwQyxHQUFHLENBQUMseUJBQXlCLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO3FCQUMxRDtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELGtEQUF3QixHQUF4QjtZQUNFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzVELENBQUM7UUFDSCxzQkFBQztJQUFELENBQUMsQUEvREQsSUErREM7SUEvRFksMENBQWUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxhdGlvblRpY2tldCwgZnJlc2hDb21waWxhdGlvblRpY2tldCwgaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQsIE5nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpJztcbmltcG9ydCB7VHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge1R5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcn0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge2lzRXh0ZXJuYWxUZW1wbGF0ZX0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogTWFuYWdlcyB0aGUgYE5nQ29tcGlsZXJgIGluc3RhbmNlIHdoaWNoIGJhY2tzIHRoZSBsYW5ndWFnZSBzZXJ2aWNlLCB1cGRhdGluZyBvciByZXBsYWNpbmcgaXQgYXNcbiAqIG5lZWRlZCB0byBwcm9kdWNlIGFuIHVwLXRvLWRhdGUgdW5kZXJzdGFuZGluZyBvZiB0aGUgY3VycmVudCBwcm9ncmFtLlxuICpcbiAqIFRPRE8oYWx4aHViKTogY3VycmVudGx5IHRoZSBvcHRpb25zIHVzZWQgZm9yIHRoZSBjb21waWxlciBhcmUgc3BlY2lmaWVkIGF0IGBDb21waWxlckZhY3RvcnlgXG4gKiBjb25zdHJ1Y3Rpb24sIGFuZCBhcmUgbm90IGNoYW5nYWJsZS4gSW4gYSByZWFsIHByb2plY3QsIHVzZXJzIGNhbiB1cGRhdGUgYHRzY29uZmlnLmpzb25gLiBXZSBuZWVkXG4gKiB0byBwcm9wZXJseSBoYW5kbGUgYSBjaGFuZ2UgaW4gdGhlIGNvbXBpbGVyIG9wdGlvbnMsIGVpdGhlciBieSBoYXZpbmcgYW4gQVBJIHRvIHVwZGF0ZSB0aGVcbiAqIGBDb21waWxlckZhY3RvcnlgIHRvIHVzZSBuZXcgb3B0aW9ucywgb3IgYnkgcmVwbGFjaW5nIGl0IGVudGlyZWx5LlxuICovXG5leHBvcnQgY2xhc3MgQ29tcGlsZXJGYWN0b3J5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBpbmNyZW1lbnRhbFN0cmF0ZWd5ID0gbmV3IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3koKTtcbiAgcHJpdmF0ZSBjb21waWxlcjogTmdDb21waWxlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBsYXN0S25vd25Qcm9ncmFtOiB0cy5Qcm9ncmFtfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBhZGFwdGVyOiBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBwcm9ncmFtU3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICkge31cblxuICBnZXRPckNyZWF0ZSgpOiBOZ0NvbXBpbGVyIHtcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICAgIGlmICh0aGlzLmNvbXBpbGVyID09PSBudWxsIHx8IHByb2dyYW0gIT09IHRoaXMubGFzdEtub3duUHJvZ3JhbSkge1xuICAgICAgbGV0IHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQ7XG4gICAgICBpZiAodGhpcy5jb21waWxlciA9PT0gbnVsbCB8fCB0aGlzLmxhc3RLbm93blByb2dyYW0gPT09IG51bGwpIHtcbiAgICAgICAgdGlja2V0ID0gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICAgICAgICAgIHByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LCB0aGlzLnByb2dyYW1TdHJhdGVneSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aWNrZXQgPSBpbmNyZW1lbnRhbEZyb21Db21waWxlclRpY2tldChcbiAgICAgICAgICAgIHRoaXMuY29tcGlsZXIsIHByb2dyYW0sIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneSwgdGhpcy5wcm9ncmFtU3RyYXRlZ3ksIG5ldyBTZXQoKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmNvbXBpbGVyID0gTmdDb21waWxlci5mcm9tVGlja2V0KHRpY2tldCwgdGhpcy5hZGFwdGVyKTtcbiAgICAgIHRoaXMubGFzdEtub3duUHJvZ3JhbSA9IHByb2dyYW07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgSXZ5IGNvbXBpbGVyIGlmIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkIHNpbmNlXG4gICAqIHRoZSBsYXN0IHRpbWUgdGhlIGNvbXBpbGVyIHdhcyBpbnN0YW50aWF0ZWQuIElmIHRoZSBwcm9ncmFtIGhhcyBub3QgY2hhbmdlZCxcbiAgICogcmV0dXJuIHRoZSBleGlzdGluZyBpbnN0YW5jZS5cbiAgICogQHBhcmFtIGZpbGVOYW1lIG92ZXJyaWRlIHRoZSB0ZW1wbGF0ZSBpZiB0aGlzIGlzIGFuIGV4dGVybmFsIHRlbXBsYXRlIGZpbGVcbiAgICogQHBhcmFtIG9wdGlvbnMgYW5ndWxhciBjb21waWxlciBvcHRpb25zXG4gICAqL1xuICBnZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogTmdDb21waWxlciB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmdldE9yQ3JlYXRlKCk7XG4gICAgaWYgKGlzRXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMub3ZlcnJpZGVUZW1wbGF0ZShmaWxlTmFtZSwgY29tcGlsZXIpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZXI7XG4gIH1cblxuICBwcml2YXRlIG92ZXJyaWRlVGVtcGxhdGUoZmlsZU5hbWU6IHN0cmluZywgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHtcbiAgICBpZiAoIXRoaXMuYWRhcHRlci5pc1RlbXBsYXRlRGlydHkoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIDEuIEdldCB0aGUgbGF0ZXN0IHNuYXBzaG90XG4gICAgY29uc3QgbGF0ZXN0VGVtcGxhdGUgPSB0aGlzLmFkYXB0ZXIucmVhZFJlc291cmNlKGZpbGVOYW1lKTtcbiAgICAvLyAyLiBGaW5kIGFsbCBjb21wb25lbnRzIHRoYXQgdXNlIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IHR0YyA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBjb21wb25lbnRzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgIC8vIDMuIFVwZGF0ZSBjb21wb25lbnQgdGVtcGxhdGVcbiAgICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBjb21wb25lbnRzKSB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgdHRjLm92ZXJyaWRlQ29tcG9uZW50VGVtcGxhdGUoY29tcG9uZW50LCBsYXRlc3RUZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCkge1xuICAgIHRoaXMubGFzdEtub3duUHJvZ3JhbSA9IHRoaXMucHJvZ3JhbVN0cmF0ZWd5LmdldFByb2dyYW0oKTtcbiAgfVxufVxuIl19