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
        define("@angular/language-service/ivy/adapters", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "path", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LSParseConfigHost = exports.LanguageServiceAdapter = void 0;
    var tslib_1 = require("tslib");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var p = require("path");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var LanguageServiceAdapter = /** @class */ (function () {
        function LanguageServiceAdapter(project) {
            this.project = project;
            this.entryPoint = null;
            this.constructionDiagnostics = [];
            this.ignoreForEmit = new Set();
            this.factoryTracker = null; // no .ngfactory shims
            this.unifiedModulesHost = null; // only used in Bazel
            this.templateVersion = new Map();
            this.rootDirs = typescript_1.getRootDirs(this, project.getCompilationSettings());
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
            return p.resolve.apply(p, tslib_1.__spread(paths));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9hZGFwdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBT0gsK0RBQTZEO0lBQzdELGtGQUFnRjtJQUNoRix3QkFBMEI7SUFHMUIsNkRBQXlDO0lBRXpDO1FBU0UsZ0NBQTZCLE9BQTBCO1lBQTFCLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBUjlDLGVBQVUsR0FBRyxJQUFJLENBQUM7WUFDbEIsNEJBQXVCLEdBQW9CLEVBQUUsQ0FBQztZQUM5QyxrQkFBYSxHQUF1QixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQzlDLG1CQUFjLEdBQUcsSUFBSSxDQUFDLENBQU0sc0JBQXNCO1lBQ2xELHVCQUFrQixHQUFHLElBQUksQ0FBQyxDQUFFLHFCQUFxQjtZQUV6QyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBRzNELElBQUksQ0FBQyxRQUFRLEdBQUcsd0JBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsdUNBQU0sR0FBTixVQUFPLEVBQWlCO1lBQ3RCLE9BQU8sY0FBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCwyQ0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQseUNBQVEsR0FBUixVQUFTLFFBQWdCO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELG9EQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxD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LE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBQ0QsbUNBQU8sR0FBUDtZQUFRLGVBQWtCO2lCQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7Z0JBQWxCLDBCQUFrQjs7WUFDeEIsT0FBTyxDQUFDLENBQUMsT0FBTyxPQUFULENBQUMsbUJBQVksS0FBSyxFQUFtQixDQUFDO1FBQy9DLENBQUM7UUFDRCxtQ0FBTyxHQUFQLFVBQThCLElBQU87WUFDbkMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBTSxDQUFDO1FBQzlCLENBQUM7UUFDRCxnQ0FBSSxHQUFKLFVBQTJCLFFBQVc7WUFBRSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiw4QkFBa0I7O1lBQ3hELE9BQU8sQ0FBQyxDQUFDLElBQUksT0FBTixDQUFDLG9CQUFNLFFBQVEsR0FBSyxLQUFLLEVBQU0sQ0FBQztRQUN6QyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBeENELElBd0NDO0lBeENZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKiogQGZpbGVvdmVydmlldyBwcm92aWRlcyBhZGFwdGVycyBmb3IgY29tbXVuaWNhdGluZyB3aXRoIHRoZSBuZyBjb21waWxlciAqL1xuXG5pbXBvcnQge0NvbmZpZ3VyYXRpb25Ib3N0fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHtOZ0NvbXBpbGVyQWRhcHRlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlL2FwaSc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3RhdHMsIFBhdGhTZWdtZW50LCBQYXRoU3RyaW5nfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNTaGltfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zJztcbmltcG9ydCB7Z2V0Um9vdERpcnN9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBwIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtpc1R5cGVTY3JpcHRGaWxlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIExhbmd1YWdlU2VydmljZUFkYXB0ZXIgaW1wbGVtZW50cyBOZ0NvbXBpbGVyQWRhcHRlciB7XG4gIHJlYWRvbmx5IGVudHJ5UG9pbnQgPSBudWxsO1xuICByZWFkb25seSBjb25zdHJ1Y3Rpb25EaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIHJlYWRvbmx5IGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPiA9IG5ldyBTZXQoKTtcbiAgcmVhZG9ubHkgZmFjdG9yeVRyYWNrZXIgPSBudWxsOyAgICAgIC8vIG5vIC5uZ2ZhY3Rvcnkgc2hpbXNcbiAgcmVhZG9ubHkgdW5pZmllZE1vZHVsZXNIb3N0ID0gbnVsbDsgIC8vIG9ubHkgdXNlZCBpbiBCYXplbFxuICByZWFkb25seSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVZlcnNpb24gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpIHtcbiAgICB0aGlzLnJvb3REaXJzID0gZ2V0Um9vdERpcnModGhpcywgcHJvamVjdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCkpO1xuICB9XG5cbiAgaXNTaGltKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzU2hpbShzZik7XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0LmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByb2plY3QucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnByb2plY3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICB9XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdC5wcm9qZWN0U2VydmljZS50b0Nhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiByZWFkUmVzb3VyY2UoKSBpcyBhbiBBbmd1bGFyLXNwZWNpZmljIG1ldGhvZCBmb3IgcmVhZGluZyBmaWxlcyB0aGF0IGFyZSBub3RcbiAgICogbWFuYWdlZCBieSB0aGUgVFMgY29tcGlsZXIgaG9zdCwgbmFtZWx5IHRlbXBsYXRlcyBhbmQgc3R5bGVzaGVldHMuXG4gICAqIEl0IGlzIGEgbWV0aG9kIG9uIEV4dGVuZGVkVHNDb21waWxlckhvc3QsIHNlZVxuICAgKiBwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpL3NyYy9pbnRlcmZhY2VzLnRzXG4gICAqL1xuICByZWFkUmVzb3VyY2UoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWRSZXNvdXJjZSgpIHNob3VsZCBub3QgYmUgY2FsbGVkIG9uIFRTIGZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIC8vIENhbGxpbmcgZ2V0U2NyaXB0U25hcHNob3QoKSB3aWxsIGFjdHVhbGx5IGNyZWF0ZSBhIFNjcmlwdEluZm8gaWYgaXQgZG9lc1xuICAgIC8vIG5vdCBleGlzdCEgVGhlIHNhbWUgYXBwbGllcyBmb3IgZ2V0U2NyaXB0VmVyc2lvbigpLlxuICAgIC8vIGdldFNjcmlwdEluZm8oKSB3aWxsIG5vdCBjcmVhdGUgb25lIGlmIGl0IGRvZXMgbm90IGV4aXN0LlxuICAgIC8vIEluIHRoaXMgY2FzZSwgd2UgKndhbnQqIGEgc2NyaXB0IGluZm8gdG8gYmUgY3JlYXRlZCBzbyB0aGF0IHdlIGNvdWxkXG4gICAgLy8ga2VlcCB0cmFjayBvZiBpdHMgdmVyc2lvbi5cbiAgICBjb25zdCBzbmFwc2hvdCA9IHRoaXMucHJvamVjdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7XG4gICAgaWYgKCFzbmFwc2hvdCkge1xuICAgICAgLy8gVGhpcyB3b3VsZCBmYWlsIGlmIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0LCBvciByZWFkRmlsZSgpIGZhaWxzIGZvclxuICAgICAgLy8gd2hhdGV2ZXIgcmVhc29ucy5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGdldCBzY3JpcHQgc25hcHNob3Qgd2hpbGUgdHJ5aW5nIHRvIHJlYWQgJHtmaWxlTmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgdmVyc2lvbiA9IHRoaXMucHJvamVjdC5nZXRTY3JpcHRWZXJzaW9uKGZpbGVOYW1lKTtcbiAgICB0aGlzLnRlbXBsYXRlVmVyc2lvbi5zZXQoZmlsZU5hbWUsIHZlcnNpb24pO1xuICAgIHJldHVybiBzbmFwc2hvdC5nZXRUZXh0KDAsIHNuYXBzaG90LmdldExlbmd0aCgpKTtcbiAgfVxuXG4gIGlzVGVtcGxhdGVEaXJ0eShmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGFzdFZlcnNpb24gPSB0aGlzLnRlbXBsYXRlVmVyc2lvbi5nZXQoZmlsZU5hbWUpO1xuICAgIGNvbnN0IGxhdGVzdFZlcnNpb24gPSB0aGlzLnByb2plY3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgcmV0dXJuIGxhc3RWZXJzaW9uICE9PSBsYXRlc3RWZXJzaW9uO1xuICB9XG59XG5cbi8qKlxuICogVXNlZCB0byByZWFkIGNvbmZpZ3VyYXRpb24gZmlsZXMuXG4gKlxuICogQSBsYW5ndWFnZSBzZXJ2aWNlIHBhcnNlIGNvbmZpZ3VyYXRpb24gaG9zdCBpcyBpbmRlcGVuZGVudCBvZiB0aGUgYWRhcHRlclxuICogYmVjYXVzZSBzaWduYXR1cmVzIG9mIGNhbGxzIGxpa2UgYEZpbGVTeXN0ZW0jcmVhZEZpbGVgIGFyZSBhIGJpdCBzdHJpY3RlclxuICogdGhhbiB0aG9zZSBvbiB0aGUgYWRhcHRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIExTUGFyc2VDb25maWdIb3N0IGltcGxlbWVudHMgQ29uZmlndXJhdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHNlcnZlckhvc3Q6IHRzLnNlcnZlci5TZXJ2ZXJIb3N0KSB7fVxuICBleGlzdHMocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJIb3N0LmZpbGVFeGlzdHMocGF0aCkgfHwgdGhpcy5zZXJ2ZXJIb3N0LmRpcmVjdG9yeUV4aXN0cyhwYXRoKTtcbiAgfVxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgY29uc3QgY29udGVudCA9IHRoaXMuc2VydmVySG9zdC5yZWFkRmlsZShwYXRoKTtcbiAgICBpZiAoY29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYExhbmd1YWdlU2VydmljZUZTI3JlYWRGaWxlIGNhbGxlZCBvbiB1bmF2YWlsYWJsZSBmaWxlICR7cGF0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIHJldHVybiB7XG4gICAgICBpc0ZpbGU6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VydmVySG9zdC5maWxlRXhpc3RzKHBhdGgpO1xuICAgICAgfSxcbiAgICAgIGlzRGlyZWN0b3J5OiAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlcnZlckhvc3QuZGlyZWN0b3J5RXhpc3RzKHBhdGgpO1xuICAgICAgfSxcbiAgICAgIGlzU3ltYm9saWNMaW5rOiAoKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTGFuZ3VhZ2VTZXJ2aWNlRlMjbHN0YXQjaXNTeW1ib2xpY0xpbmsgbm90IGltcGxlbWVudGVkYCk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cbiAgcHdkKCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJIb3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgfVxuICBleHRuYW1lKHBhdGg6IEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcC5leHRuYW1lKHBhdGgpO1xuICB9XG4gIHJlc29sdmUoLi4ucGF0aHM6IHN0cmluZ1tdKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiBwLnJlc29sdmUoLi4ucGF0aHMpIGFzIEFic29sdXRlRnNQYXRoO1xuICB9XG4gIGRpcm5hbWU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZpbGU6IFQpOiBUIHtcbiAgICByZXR1cm4gcC5kaXJuYW1lKGZpbGUpIGFzIFQ7XG4gIH1cbiAgam9pbjxUIGV4dGVuZHMgUGF0aFN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQge1xuICAgIHJldHVybiBwLmpvaW4oYmFzZVBhdGgsIC4uLnBhdGhzKSBhcyBUO1xuICB9XG59XG4iXX0=