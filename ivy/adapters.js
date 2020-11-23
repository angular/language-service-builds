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
        define("@angular/language-service/ivy/adapters", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims", "path", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LSParseConfigHost = exports.LanguageServiceAdapter = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var p = require("path");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var LanguageServiceAdapter = /** @class */ (function () {
        function LanguageServiceAdapter(project) {
            var _a;
            this.project = project;
            this.entryPoint = null;
            this.constructionDiagnostics = [];
            this.ignoreForEmit = new Set();
            this.factoryTracker = null; // no .ngfactory shims
            this.unifiedModulesHost = null; // only used in Bazel
            this.templateVersion = new Map();
            this.rootDirs = ((_a = project.getCompilationSettings().rootDirs) === null || _a === void 0 ? void 0 : _a.map(file_system_1.absoluteFrom)) || [];
        }
        LanguageServiceAdapter.prototype.isShim = function (sf) {
            return shims_1.isShim(sf);
        };
        LanguageServiceAdapter.prototype.fileExists = function (fileName) {
            return this.project.fileExists(fileName);
        };
        LanguageServiceAdapter.prototype.readFile = function (fileName) {
            return this.project.readFile(fileName);
        };
        LanguageServiceAdapter.prototype.getCurrentDirectory = function () {
            return this.project.getCurrentDirectory();
        };
        LanguageServiceAdapter.prototype.getCanonicalFileName = function (fileName) {
            return this.project.projectService.toCanonicalFileName(fileName);
        };
        /**
         * readResource() is an Angular-specific method for reading files that are not
         * managed by the TS compiler host, namely templates and stylesheets.
         * It is a method on ExtendedTsCompilerHost, see
         * packages/compiler-cli/src/ngtsc/core/api/src/interfaces.ts
         */
        LanguageServiceAdapter.prototype.readResource = function (fileName) {
            if (utils_1.isTypeScriptFile(fileName)) {
                throw new Error("readResource() should not be called on TS file: " + fileName);
            }
            // Calling getScriptSnapshot() will actually create a ScriptInfo if it does
            // not exist! The same applies for getScriptVersion().
            // getScriptInfo() will not create one if it does not exist.
            // In this case, we *want* a script info to be created so that we could
            // keep track of its version.
            var snapshot = this.project.getScriptSnapshot(fileName);
            if (!snapshot) {
                // This would fail if the file does not exist, or readFile() fails for
                // whatever reasons.
                throw new Error("Failed to get script snapshot while trying to read " + fileName);
            }
            var version = this.project.getScriptVersion(fileName);
            this.templateVersion.set(fileName, version);
            return snapshot.getText(0, snapshot.getLength());
        };
        LanguageServiceAdapter.prototype.isTemplateDirty = function (fileName) {
            var lastVersion = this.templateVersion.get(fileName);
            var latestVersion = this.project.getScriptVersion(fileName);
            return lastVersion !== latestVersion;
        };
        return LanguageServiceAdapter;
    }());
    exports.LanguageServiceAdapter = LanguageServiceAdapter;
    /**
     * Used to read configuration files.
     *
     * A language service parse configuration host is independent of the adapter
     * because signatures of calls like `FileSystem#readFile` are a bit stricter
     * than those on the adapter.
     */
    var LSParseConfigHost = /** @class */ (function () {
        function LSParseConfigHost(serverHost) {
            this.serverHost = serverHost;
        }
        LSParseConfigHost.prototype.exists = function (path) {
            return this.serverHost.fileExists(path) || this.serverHost.directoryExists(path);
        };
        LSParseConfigHost.prototype.readFile = function (path) {
            var content = this.serverHost.readFile(path);
            if (content === undefined) {
                throw new Error("LanguageServiceFS#readFile called on unavailable file " + path);
            }
            return content;
        };
        LSParseConfigHost.prototype.lstat = function (path) {
            var _this = this;
            return {
                isFile: function () {
                    return _this.serverHost.fileExists(path);
                },
                isDirectory: function () {
                    return _this.serverHost.directoryExists(path);
                },
                isSymbolicLink: function () {
                    throw new Error("LanguageServiceFS#lstat#isSymbolicLink not implemented");
                },
            };
        };
        LSParseConfigHost.prototype.pwd = function () {
            return this.serverHost.getCurrentDirectory();
        };
        LSParseConfigHost.prototype.extname = function (path) {
            return p.extname(path);
        };
        LSParseConfigHost.prototype.resolve = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return this.serverHost.resolvePath(this.join.apply(this, tslib_1.__spread([paths[0]], paths.slice(1))));
        };
        LSParseConfigHost.prototype.dirname = function (file) {
            return p.dirname(file);
        };
        LSParseConfigHost.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return p.join.apply(p, tslib_1.__spread([basePath], paths));
        };
        return LSParseConfigHost;
    }());
    exports.LSParseConfigHost = LSParseConfigHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9hZGFwdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUgsMkVBQTZIO0lBQzdILCtEQUE2RDtJQUM3RCx3QkFBMEI7SUFHMUIsNkRBQXlDO0lBRXpDO1FBU0UsZ0NBQTZCLE9BQTBCOztZQUExQixZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQVI5QyxlQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLDRCQUF1QixHQUFvQixFQUFFLENBQUM7WUFDOUMsa0JBQWEsR0FBdUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUM5QyxtQkFBYyxHQUFHLElBQUksQ0FBQyxDQUFNLHNCQUFzQjtZQUNsRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsQ0FBRSxxQkFBcUI7WUFFekMsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUczRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQUEsT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUMsUUFBUSwwQ0FBRSxHQUFHLENBQUMsMEJBQVksTUFBSyxFQUFFLENBQUM7UUFDckYsQ0FBQztRQUVELHVDQUFNLEdBQU4sVUFBTyxFQUFpQjtZQUN0QixPQUFPLGNBQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBRUQsMkNBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELHlDQUFRLEdBQVIsVUFBUyxRQUFnQjtZQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxvREFBbUIsR0FBbkI7WUFDRSxPQUFPLElBQUksQ0FBQyxP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LEdBQVAsVUFBUSxJQUFnQztZQUN0QyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUNELG1DQUFPLEdBQVA7WUFBUSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiwwQkFBa0I7O1lBQ3hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksT0FBVCxJQUFJLG9CQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFvQixDQUFDO1FBQy9GLENBQUM7UUFDRCxtQ0FBTyxHQUFQLFVBQThCLElBQU87WUFDbkMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBTSxDQUFDO1FBQzlCLENBQUM7UUFDRCxnQ0FBSSxHQUFKLFVBQTJCLFFBQVc7WUFBRSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiw4QkFBa0I7O1lBQ3hELE9BQU8sQ0FBQyxDQUFDLElBQUksT0FBTixDQUFDLG9CQUFNLFFBQVEsR0FBSyxLQUFLLEVBQU0sQ0FBQztRQUN6QyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBeENELElBd0NDO0lBeENZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKiogQGZpbGVvdmVydmlldyBwcm92aWRlcyBhZGFwdGVycyBmb3IgY29tbXVuaWNhdGluZyB3aXRoIHRoZSBuZyBjb21waWxlciAqL1xuXG5pbXBvcnQge0NvbmZpZ3VyYXRpb25Ib3N0fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHtOZ0NvbXBpbGVyQWRhcHRlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlL2FwaSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGgsIEZpbGVTdGF0cywgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc1NoaW19IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMnO1xuaW1wb3J0ICogYXMgcCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7aXNUeXBlU2NyaXB0RmlsZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyIGltcGxlbWVudHMgTmdDb21waWxlckFkYXB0ZXIge1xuICByZWFkb25seSBlbnRyeVBvaW50ID0gbnVsbDtcbiAgcmVhZG9ubHkgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT4gPSBuZXcgU2V0KCk7XG4gIHJlYWRvbmx5IGZhY3RvcnlUcmFja2VyID0gbnVsbDsgICAgICAvLyBubyAubmdmYWN0b3J5IHNoaW1zXG4gIHJlYWRvbmx5IHVuaWZpZWRNb2R1bGVzSG9zdCA9IG51bGw7ICAvLyBvbmx5IHVzZWQgaW4gQmF6ZWxcbiAgcmVhZG9ubHkgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW107XG4gIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVWZXJzaW9uID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KSB7XG4gICAgdGhpcy5yb290RGlycyA9IHByb2plY3QuZ2V0Q29tcGlsYXRpb25TZXR0aW5ncygpLnJvb3REaXJzPy5tYXAoYWJzb2x1dGVGcm9tKSB8fCBbXTtcbiAgfVxuXG4gIGlzU2hpbShzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc1NoaW0oc2YpO1xuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdC5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0LnJlYWRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0LmdldEN1cnJlbnREaXJlY3RvcnkoKTtcbiAgfVxuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnByb2plY3QucHJvamVjdFNlcnZpY2UudG9DYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogcmVhZFJlc291cmNlKCkgaXMgYW4gQW5ndWxhci1zcGVjaWZpYyBtZXRob2QgZm9yIHJlYWRpbmcgZmlsZXMgdGhhdCBhcmUgbm90XG4gICAqIG1hbmFnZWQgYnkgdGhlIFRTIGNvbXBpbGVyIGhvc3QsIG5hbWVseSB0ZW1wbGF0ZXMgYW5kIHN0eWxlc2hlZXRzLlxuICAgKiBJdCBpcyBhIG1ldGhvZCBvbiBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0LCBzZWVcbiAgICogcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlL2FwaS9zcmMvaW50ZXJmYWNlcy50c1xuICAgKi9cbiAgcmVhZFJlc291cmNlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGByZWFkUmVzb3VyY2UoKSBzaG91bGQgbm90IGJlIGNhbGxlZCBvbiBUUyBmaWxlOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICAvLyBDYWxsaW5nIGdldFNjcmlwdFNuYXBzaG90KCkgd2lsbCBhY3R1YWxseSBjcmVhdGUgYSBTY3JpcHRJbmZvIGlmIGl0IGRvZXNcbiAgICAvLyBub3QgZXhpc3QhIFRoZSBzYW1lIGFwcGxpZXMgZm9yIGdldFNjcmlwdFZlcnNpb24oKS5cbiAgICAvLyBnZXRTY3JpcHRJbmZvKCkgd2lsbCBub3QgY3JlYXRlIG9uZSBpZiBpdCBkb2VzIG5vdCBleGlzdC5cbiAgICAvLyBJbiB0aGlzIGNhc2UsIHdlICp3YW50KiBhIHNjcmlwdCBpbmZvIHRvIGJlIGNyZWF0ZWQgc28gdGhhdCB3ZSBjb3VsZFxuICAgIC8vIGtlZXAgdHJhY2sgb2YgaXRzIHZlcnNpb24uXG4gICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLnByb2plY3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpO1xuICAgIGlmICghc25hcHNob3QpIHtcbiAgICAgIC8vIFRoaXMgd291bGQgZmFpbCBpZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCwgb3IgcmVhZEZpbGUoKSBmYWlscyBmb3JcbiAgICAgIC8vIHdoYXRldmVyIHJlYXNvbnMuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgc2NyaXB0IHNuYXBzaG90IHdoaWxlIHRyeWluZyB0byByZWFkICR7ZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIGNvbnN0IHZlcnNpb24gPSB0aGlzLnByb2plY3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgdGhpcy50ZW1wbGF0ZVZlcnNpb24uc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICByZXR1cm4gc25hcHNob3QuZ2V0VGV4dCgwLCBzbmFwc2hvdC5nZXRMZW5ndGgoKSk7XG4gIH1cblxuICBpc1RlbXBsYXRlRGlydHkoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxhc3RWZXJzaW9uID0gdGhpcy50ZW1wbGF0ZVZlcnNpb24uZ2V0KGZpbGVOYW1lKTtcbiAgICBjb25zdCBsYXRlc3RWZXJzaW9uID0gdGhpcy5wcm9qZWN0LmdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWUpO1xuICAgIHJldHVybiBsYXN0VmVyc2lvbiAhPT0gbGF0ZXN0VmVyc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIFVzZWQgdG8gcmVhZCBjb25maWd1cmF0aW9uIGZpbGVzLlxuICpcbiAqIEEgbGFuZ3VhZ2Ugc2VydmljZSBwYXJzZSBjb25maWd1cmF0aW9uIGhvc3QgaXMgaW5kZXBlbmRlbnQgb2YgdGhlIGFkYXB0ZXJcbiAqIGJlY2F1c2Ugc2lnbmF0dXJlcyBvZiBjYWxscyBsaWtlIGBGaWxlU3lzdGVtI3JlYWRGaWxlYCBhcmUgYSBiaXQgc3RyaWN0ZXJcbiAqIHRoYW4gdGhvc2Ugb24gdGhlIGFkYXB0ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBMU1BhcnNlQ29uZmlnSG9zdCBpbXBsZW1lbnRzIENvbmZpZ3VyYXRpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBzZXJ2ZXJIb3N0OiB0cy5zZXJ2ZXIuU2VydmVySG9zdCkge31cbiAgZXhpc3RzKHBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmVySG9zdC5maWxlRXhpc3RzKHBhdGgpIHx8IHRoaXMuc2VydmVySG9zdC5kaXJlY3RvcnlFeGlzdHMocGF0aCk7XG4gIH1cbiAgcmVhZEZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLnNlcnZlckhvc3QucmVhZEZpbGUocGF0aCk7XG4gICAgaWYgKGNvbnRlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBMYW5ndWFnZVNlcnZpY2VGUyNyZWFkRmlsZSBjYWxsZWQgb24gdW5hdmFpbGFibGUgZmlsZSAke3BhdGh9YCk7XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9XG4gIGxzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHtcbiAgICByZXR1cm4ge1xuICAgICAgaXNGaWxlOiAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlcnZlckhvc3QuZmlsZUV4aXN0cyhwYXRoKTtcbiAgICAgIH0sXG4gICAgICBpc0RpcmVjdG9yeTogKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZXJIb3N0LmRpcmVjdG9yeUV4aXN0cyhwYXRoKTtcbiAgICAgIH0sXG4gICAgICBpc1N5bWJvbGljTGluazogKCkgPT4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExhbmd1YWdlU2VydmljZUZTI2xzdGF0I2lzU3ltYm9saWNMaW5rIG5vdCBpbXBsZW1lbnRlZGApO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmVySG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH1cbiAgZXh0bmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHAuZXh0bmFtZShwYXRoKTtcbiAgfVxuICByZXNvbHZlKC4uLnBhdGhzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJIb3N0LnJlc29sdmVQYXRoKHRoaXMuam9pbihwYXRoc1swXSwgLi4ucGF0aHMuc2xpY2UoMSkpKSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgfVxuICBkaXJuYW1lPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmaWxlOiBUKTogVCB7XG4gICAgcmV0dXJuIHAuZGlybmFtZShmaWxlKSBhcyBUO1xuICB9XG4gIGpvaW48VCBleHRlbmRzIFBhdGhTdHJpbmc+KGJhc2VQYXRoOiBULCAuLi5wYXRoczogc3RyaW5nW10pOiBUIHtcbiAgICByZXR1cm4gcC5qb2luKGJhc2VQYXRoLCAuLi5wYXRocykgYXMgVDtcbiAgfVxufVxuIl19