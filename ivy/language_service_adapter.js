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
        define("@angular/language-service/ivy/language_service_adapter", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isExternalTemplate = exports.isTypeScriptFile = exports.LanguageServiceAdapter = void 0;
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
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
            if (isTypeScriptFile(fileName)) {
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
    function isTypeScriptFile(fileName) {
        return fileName.endsWith('.ts');
    }
    exports.isTypeScriptFile = isTypeScriptFile;
    function isExternalTemplate(fileName) {
        return !isTypeScriptFile(fileName);
    }
    exports.isExternalTemplate = isExternalTemplate;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZV9hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvbGFuZ3VhZ2Vfc2VydmljZV9hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJFQUF5RjtJQUN6RiwrREFBNkQ7SUFHN0Q7UUFTRSxnQ0FBNkIsT0FBMEI7O1lBQTFCLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBUjlDLGVBQVUsR0FBRyxJQUFJLENBQUM7WUFDbEIsNEJBQXVCLEdBQW9CLEVBQUUsQ0FBQztZQUM5QyxrQkFBYSxHQUF1QixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQzlDLG1CQUFjLEdBQUcsSUFBSSxDQUFDLENBQU0sc0JBQXNCO1lBQ2xELHVCQUFrQixHQUFHLElBQUksQ0FBQyxDQUFFLHFCQUFxQjtZQUV6QyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBRzNELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBQSxPQUFPLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxRQUFRLDBDQUFFLEdBQUcsQ0FBQywwQkFBWSxNQUFLLEVBQUUsQ0FBQztRQUNyRixDQUFDO1FBRUQsdUNBQU0sR0FBTixVQUFPLEVBQWlCO1lBQ3RCLE9BQU8sY0FBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCwyQ0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQseUNBQVEsR0FBUixVQUFTLFFBQWdCO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELG9EQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzVDLENBQUM7UUFFRCxxREFBb0IsR0FBcEIsVUFBcUIsUUFBZ0I7WUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCw2Q0FBWSxHQUFaLFVBQWEsUUFBZ0I7WUFDM0IsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBbUQsUUFBVSxDQUFDLENBQUM7YUFDaEY7WUFDRCwyRUFBMkU7WUFDM0Usc0RBQXNEO1lBQ3RELDREQUE0RDtZQUM1RCx1RUFBdUU7WUFDdkUsNkJBQTZCO1lBQzdCLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDYixzRUFBc0U7Z0JBQ3RFLG9CQUFvQjtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBc0QsUUFBVSxDQUFDLENBQUM7YUFDbkY7WUFDRCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM1QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFFRCxnREFBZSxHQUFmLFVBQWdCLFFBQWdCO1lBQzlCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUQsT0FBTyxXQUFXLEtBQUssYUFBYSxDQUFDO1FBQ3ZDLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUFoRUQsSUFnRUM7SUFoRVksd0RBQXNCO0lBa0VuQyxTQUFnQixnQkFBZ0IsQ0FBQyxRQUFnQjtRQUMvQyxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUZELDRDQUVDO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUMsUUFBZ0I7UUFDakQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFGRCxnREFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQ29tcGlsZXJBZGFwdGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzU2hpbX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zaGltcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlciBpbXBsZW1lbnRzIE5nQ29tcGlsZXJBZGFwdGVyIHtcbiAgcmVhZG9ubHkgZW50cnlQb2ludCA9IG51bGw7XG4gIHJlYWRvbmx5IGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+ID0gbmV3IFNldCgpO1xuICByZWFkb25seSBmYWN0b3J5VHJhY2tlciA9IG51bGw7ICAgICAgLy8gbm8gLm5nZmFjdG9yeSBzaGltc1xuICByZWFkb25seSB1bmlmaWVkTW9kdWxlc0hvc3QgPSBudWxsOyAgLy8gb25seSB1c2VkIGluIEJhemVsXG4gIHJlYWRvbmx5IHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlVmVyc2lvbiA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIHRoaXMucm9vdERpcnMgPSBwcm9qZWN0LmdldENvbXBpbGF0aW9uU2V0dGluZ3MoKS5yb290RGlycz8ubWFwKGFic29sdXRlRnJvbSkgfHwgW107XG4gIH1cblxuICBpc1NoaW0oc2Y6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNTaGltKHNmKTtcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByb2plY3QuZmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdC5yZWFkRmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdC5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gIH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wcm9qZWN0LnByb2plY3RTZXJ2aWNlLnRvQ2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlYWRSZXNvdXJjZSgpIGlzIGFuIEFuZ3VsYXItc3BlY2lmaWMgbWV0aG9kIGZvciByZWFkaW5nIGZpbGVzIHRoYXQgYXJlIG5vdFxuICAgKiBtYW5hZ2VkIGJ5IHRoZSBUUyBjb21waWxlciBob3N0LCBuYW1lbHkgdGVtcGxhdGVzIGFuZCBzdHlsZXNoZWV0cy5cbiAgICogSXQgaXMgYSBtZXRob2Qgb24gRXh0ZW5kZWRUc0NvbXBpbGVySG9zdCwgc2VlXG4gICAqIHBhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9hcGkvc3JjL2ludGVyZmFjZXMudHNcbiAgICovXG4gIHJlYWRSZXNvdXJjZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcmVhZFJlc291cmNlKCkgc2hvdWxkIG5vdCBiZSBjYWxsZWQgb24gVFMgZmlsZTogJHtmaWxlTmFtZX1gKTtcbiAgICB9XG4gICAgLy8gQ2FsbGluZyBnZXRTY3JpcHRTbmFwc2hvdCgpIHdpbGwgYWN0dWFsbHkgY3JlYXRlIGEgU2NyaXB0SW5mbyBpZiBpdCBkb2VzXG4gICAgLy8gbm90IGV4aXN0ISBUaGUgc2FtZSBhcHBsaWVzIGZvciBnZXRTY3JpcHRWZXJzaW9uKCkuXG4gICAgLy8gZ2V0U2NyaXB0SW5mbygpIHdpbGwgbm90IGNyZWF0ZSBvbmUgaWYgaXQgZG9lcyBub3QgZXhpc3QuXG4gICAgLy8gSW4gdGhpcyBjYXNlLCB3ZSAqd2FudCogYSBzY3JpcHQgaW5mbyB0byBiZSBjcmVhdGVkIHNvIHRoYXQgd2UgY291bGRcbiAgICAvLyBrZWVwIHRyYWNrIG9mIGl0cyB2ZXJzaW9uLlxuICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy5wcm9qZWN0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICAvLyBUaGlzIHdvdWxkIGZhaWwgaWYgdGhlIGZpbGUgZG9lcyBub3QgZXhpc3QsIG9yIHJlYWRGaWxlKCkgZmFpbHMgZm9yXG4gICAgICAvLyB3aGF0ZXZlciByZWFzb25zLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IHNjcmlwdCBzbmFwc2hvdCB3aGlsZSB0cnlpbmcgdG8gcmVhZCAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCB2ZXJzaW9uID0gdGhpcy5wcm9qZWN0LmdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWUpO1xuICAgIHRoaXMudGVtcGxhdGVWZXJzaW9uLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgcmV0dXJuIHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICB9XG5cbiAgaXNUZW1wbGF0ZURpcnR5KGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBsYXN0VmVyc2lvbiA9IHRoaXMudGVtcGxhdGVWZXJzaW9uLmdldChmaWxlTmFtZSk7XG4gICAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IHRoaXMucHJvamVjdC5nZXRTY3JpcHRWZXJzaW9uKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbGFzdFZlcnNpb24gIT09IGxhdGVzdFZlcnNpb247XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICFpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKTtcbn1cbiJdfQ==