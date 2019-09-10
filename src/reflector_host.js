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
        define("@angular/language-service/src/reflector_host", ["require", "exports", "@angular/compiler-cli/src/language_services", "path", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var path = require("path");
    var ts = require("typescript");
    var ReflectorModuleModuleResolutionHost = /** @class */ (function () {
        function ReflectorModuleModuleResolutionHost(host, getProgram) {
            var _this = this;
            this.host = host;
            this.getProgram = getProgram;
            // Note: verboseInvalidExpressions is important so that
            // the collector will collect errors instead of throwing
            this.metadataCollector = new language_services_1.MetadataCollector({ verboseInvalidExpression: true });
            if (host.directoryExists)
                this.directoryExists = function (directoryName) { return _this.host.directoryExists(directoryName); };
        }
        ReflectorModuleModuleResolutionHost.prototype.fileExists = function (fileName) { return !!this.host.getScriptSnapshot(fileName); };
        ReflectorModuleModuleResolutionHost.prototype.readFile = function (fileName) {
            var snapshot = this.host.getScriptSnapshot(fileName);
            if (snapshot) {
                return snapshot.getText(0, snapshot.getLength());
            }
            // Typescript readFile() declaration should be `readFile(fileName: string): string | undefined
            return undefined;
        };
        ReflectorModuleModuleResolutionHost.prototype.getSourceFileMetadata = function (fileName) {
            var sf = this.getProgram().getSourceFile(fileName);
            return sf ? this.metadataCollector.getMetadata(sf) : undefined;
        };
        ReflectorModuleModuleResolutionHost.prototype.cacheMetadata = function (fileName) {
            // Don't cache the metadata for .ts files as they might change in the editor!
            return fileName.endsWith('.d.ts');
        };
        return ReflectorModuleModuleResolutionHost;
    }());
    var ReflectorHost = /** @class */ (function () {
        function ReflectorHost(getProgram, tsLSHost) {
            this.tsLSHost = tsLSHost;
            this.metadataReaderCache = language_services_1.createMetadataReaderCache();
            // tsLSHost.getCurrentDirectory() returns the directory where tsconfig.json
            // is located. This is not the same as process.cwd() because the language
            // service host sets the "project root path" as its current directory.
            var currentDir = tsLSHost.getCurrentDirectory();
            this.fakeContainingPath = currentDir ? path.join(currentDir, 'fakeContainingFile.ts') : '';
            this.hostAdapter = new ReflectorModuleModuleResolutionHost(tsLSHost, getProgram);
            this.moduleResolutionCache = ts.createModuleResolutionCache(currentDir, function (s) { return s; }, // getCanonicalFileName
            tsLSHost.getCompilationSettings());
        }
        ReflectorHost.prototype.getMetadataFor = function (modulePath) {
            return language_services_1.readMetadata(modulePath, this.hostAdapter, this.metadataReaderCache);
        };
        ReflectorHost.prototype.moduleNameToFileName = function (moduleName, containingFile) {
            if (!containingFile) {
                if (moduleName.startsWith('.')) {
                    throw new Error('Resolution of relative paths requires a containing file.');
                }
                if (!this.fakeContainingPath) {
                    // If current directory is empty then the file must belong to an inferred
                    // project (no tsconfig.json), in which case it's not possible to resolve
                    // the module without the caller explicitly providing a containing file.
                    throw new Error("Could not resolve '" + moduleName + "' without a containing file.");
                }
                containingFile = this.fakeContainingPath;
            }
            var compilerOptions = this.tsLSHost.getCompilationSettings();
            var resolved = ts.resolveModuleName(moduleName, containingFile, compilerOptions, this.hostAdapter, this.moduleResolutionCache)
                .resolvedModule;
            return resolved ? resolved.resolvedFileName : null;
        };
        ReflectorHost.prototype.getOutputName = function (filePath) { return filePath; };
        return ReflectorHost;
    }());
    exports.ReflectorHost = ReflectorHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9yZWZsZWN0b3JfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILGlGQUEySTtJQUMzSSwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDO1FBS0UsNkNBQW9CLElBQTRCLEVBQVUsVUFBNEI7WUFBdEYsaUJBR0M7WUFIbUIsU0FBSSxHQUFKLElBQUksQ0FBd0I7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUp0Rix1REFBdUQ7WUFDdkQsd0RBQXdEO1lBQ2hELHNCQUFpQixHQUFHLElBQUkscUNBQWlCLENBQUMsRUFBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBR2xGLElBQUksSUFBSSxDQUFDLGVBQWU7Z0JBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBQSxhQUFhLElBQUksT0FBQSxLQUFJLENBQUMsSUFBSSxDQUFDLGVBQWlCLENBQUMsYUFBYSxDQUFDLEVBQTFDLENBQTBDLENBQUM7UUFDdkYsQ0FBQztRQUVELHdEQUFVLEdBQVYsVUFBVyxRQUFnQixJQUFhLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpGLHNEQUFRLEdBQVIsVUFBUyxRQUFnQjtZQUN2QixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELElBQUksUUFBUSxFQUFFO2dCQUNaLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7YUFDbEQ7WUFFRCw4RkFBOEY7WUFDOUYsT0FBTyxTQUFXLENBQUM7UUFDckIsQ0FBQztRQUtELG1FQUFxQixHQUFyQixVQUFzQixRQUFnQjtZQUNwQyxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDakUsQ0FBQztRQUVELDJEQUFhLEdBQWIsVUFBYyxRQUFnQjtZQUM1Qiw2RUFBNkU7WUFDN0UsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDSCwwQ0FBQztJQUFELENBQUMsQUFsQ0QsSUFrQ0M7SUFFRDtRQU1FLHVCQUFZLFVBQTRCLEVBQW1CLFFBQWdDO1lBQWhDLGFBQVEsR0FBUixRQUFRLENBQXdCO1lBSjFFLHdCQUFtQixHQUFHLDZDQUF5QixFQUFFLENBQUM7WUFLakUsMkVBQTJFO1lBQzNFLHlFQUF5RTtZQUN6RSxzRUFBc0U7WUFDdEUsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxtQ0FBbUMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDakYsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEVBQUUsQ0FBQywyQkFBMkIsQ0FDdkQsVUFBVSxFQUNWLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxFQUFELENBQUMsRUFBRyx1QkFBdUI7WUFDaEMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsc0NBQWMsR0FBZCxVQUFlLFVBQWtCO1lBQy9CLE9BQU8sZ0NBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBRUQsNENBQW9CLEdBQXBCLFVBQXFCLFVBQWtCLEVBQUUsY0FBdUI7WUFDOUQsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDbkIsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7aUJBQzdFO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7b0JBQzVCLHlFQUF5RTtvQkFDekUseUVBQXlFO29CQUN6RSx3RUFBd0U7b0JBQ3hFLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXNCLFVBQVUsaUNBQThCLENBQUMsQ0FBQztpQkFDakY7Z0JBQ0QsY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQzthQUMxQztZQUNELElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUMvRCxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQ2QsVUFBVSxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFDN0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDO2lCQUM1QixjQUFjLENBQUM7WUFDckMsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3JELENBQUM7UUFFRCxxQ0FBYSxHQUFiLFVBQWMsUUFBZ0IsSUFBSSxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdEQsb0JBQUM7SUFBRCxDQUFDLEFBN0NELElBNkNDO0lBN0NZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1N0YXRpY1N5bWJvbFJlc29sdmVySG9zdH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtNZXRhZGF0YUNvbGxlY3RvciwgTWV0YWRhdGFSZWFkZXJIb3N0LCBjcmVhdGVNZXRhZGF0YVJlYWRlckNhY2hlLCByZWFkTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5jbGFzcyBSZWZsZWN0b3JNb2R1bGVNb2R1bGVSZXNvbHV0aW9uSG9zdCBpbXBsZW1lbnRzIHRzLk1vZHVsZVJlc29sdXRpb25Ib3N0LCBNZXRhZGF0YVJlYWRlckhvc3Qge1xuICAvLyBOb3RlOiB2ZXJib3NlSW52YWxpZEV4cHJlc3Npb25zIGlzIGltcG9ydGFudCBzbyB0aGF0XG4gIC8vIHRoZSBjb2xsZWN0b3Igd2lsbCBjb2xsZWN0IGVycm9ycyBpbnN0ZWFkIG9mIHRocm93aW5nXG4gIHByaXZhdGUgbWV0YWRhdGFDb2xsZWN0b3IgPSBuZXcgTWV0YWRhdGFDb2xsZWN0b3Ioe3ZlcmJvc2VJbnZhbGlkRXhwcmVzc2lvbjogdHJ1ZX0pO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgcHJpdmF0ZSBnZXRQcm9ncmFtOiAoKSA9PiB0cy5Qcm9ncmFtKSB7XG4gICAgaWYgKGhvc3QuZGlyZWN0b3J5RXhpc3RzKVxuICAgICAgdGhpcy5kaXJlY3RvcnlFeGlzdHMgPSBkaXJlY3RvcnlOYW1lID0+IHRoaXMuaG9zdC5kaXJlY3RvcnlFeGlzdHMgIShkaXJlY3RvcnlOYW1lKTtcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gISF0aGlzLmhvc3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpOyB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgbGV0IHNuYXBzaG90ID0gdGhpcy5ob3N0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoc25hcHNob3QpIHtcbiAgICAgIHJldHVybiBzbmFwc2hvdC5nZXRUZXh0KDAsIHNuYXBzaG90LmdldExlbmd0aCgpKTtcbiAgICB9XG5cbiAgICAvLyBUeXBlc2NyaXB0IHJlYWRGaWxlKCkgZGVjbGFyYXRpb24gc2hvdWxkIGJlIGByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkXG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhO1xuICB9XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGRpcmVjdG9yeUV4aXN0cyAhOiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBib29sZWFuO1xuXG4gIGdldFNvdXJjZUZpbGVNZXRhZGF0YShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgc2YgPSB0aGlzLmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gc2YgPyB0aGlzLm1ldGFkYXRhQ29sbGVjdG9yLmdldE1ldGFkYXRhKHNmKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNhY2hlTWV0YWRhdGEoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIC8vIERvbid0IGNhY2hlIHRoZSBtZXRhZGF0YSBmb3IgLnRzIGZpbGVzIGFzIHRoZXkgbWlnaHQgY2hhbmdlIGluIHRoZSBlZGl0b3IhXG4gICAgcmV0dXJuIGZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWZsZWN0b3JIb3N0IGltcGxlbWVudHMgU3RhdGljU3ltYm9sUmVzb2x2ZXJIb3N0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBob3N0QWRhcHRlcjogUmVmbGVjdG9yTW9kdWxlTW9kdWxlUmVzb2x1dGlvbkhvc3Q7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWV0YWRhdGFSZWFkZXJDYWNoZSA9IGNyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUoKTtcbiAgcHJpdmF0ZSByZWFkb25seSBtb2R1bGVSZXNvbHV0aW9uQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZTtcbiAgcHJpdmF0ZSByZWFkb25seSBmYWtlQ29udGFpbmluZ1BhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihnZXRQcm9ncmFtOiAoKSA9PiB0cy5Qcm9ncmFtLCBwcml2YXRlIHJlYWRvbmx5IHRzTFNIb3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0KSB7XG4gICAgLy8gdHNMU0hvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpIHJldHVybnMgdGhlIGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZy5qc29uXG4gICAgLy8gaXMgbG9jYXRlZC4gVGhpcyBpcyBub3QgdGhlIHNhbWUgYXMgcHJvY2Vzcy5jd2QoKSBiZWNhdXNlIHRoZSBsYW5ndWFnZVxuICAgIC8vIHNlcnZpY2UgaG9zdCBzZXRzIHRoZSBcInByb2plY3Qgcm9vdCBwYXRoXCIgYXMgaXRzIGN1cnJlbnQgZGlyZWN0b3J5LlxuICAgIGNvbnN0IGN1cnJlbnREaXIgPSB0c0xTSG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gICAgdGhpcy5mYWtlQ29udGFpbmluZ1BhdGggPSBjdXJyZW50RGlyID8gcGF0aC5qb2luKGN1cnJlbnREaXIsICdmYWtlQ29udGFpbmluZ0ZpbGUudHMnKSA6ICcnO1xuICAgIHRoaXMuaG9zdEFkYXB0ZXIgPSBuZXcgUmVmbGVjdG9yTW9kdWxlTW9kdWxlUmVzb2x1dGlvbkhvc3QodHNMU0hvc3QsIGdldFByb2dyYW0pO1xuICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICBjdXJyZW50RGlyLFxuICAgICAgICBzID0+IHMsICAvLyBnZXRDYW5vbmljYWxGaWxlTmFtZVxuICAgICAgICB0c0xTSG9zdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCkpO1xuICB9XG5cbiAgZ2V0TWV0YWRhdGFGb3IobW9kdWxlUGF0aDogc3RyaW5nKToge1trZXk6IHN0cmluZ106IGFueX1bXXx1bmRlZmluZWQge1xuICAgIHJldHVybiByZWFkTWV0YWRhdGEobW9kdWxlUGF0aCwgdGhpcy5ob3N0QWRhcHRlciwgdGhpcy5tZXRhZGF0YVJlYWRlckNhY2hlKTtcbiAgfVxuXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKCFjb250YWluaW5nRmlsZSkge1xuICAgICAgaWYgKG1vZHVsZU5hbWUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyByZXF1aXJlcyBhIGNvbnRhaW5pbmcgZmlsZS4nKTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5mYWtlQ29udGFpbmluZ1BhdGgpIHtcbiAgICAgICAgLy8gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgZW1wdHkgdGhlbiB0aGUgZmlsZSBtdXN0IGJlbG9uZyB0byBhbiBpbmZlcnJlZFxuICAgICAgICAvLyBwcm9qZWN0IChubyB0c2NvbmZpZy5qc29uKSwgaW4gd2hpY2ggY2FzZSBpdCdzIG5vdCBwb3NzaWJsZSB0byByZXNvbHZlXG4gICAgICAgIC8vIHRoZSBtb2R1bGUgd2l0aG91dCB0aGUgY2FsbGVyIGV4cGxpY2l0bHkgcHJvdmlkaW5nIGEgY29udGFpbmluZyBmaWxlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICcke21vZHVsZU5hbWV9JyB3aXRob3V0IGEgY29udGFpbmluZyBmaWxlLmApO1xuICAgICAgfVxuICAgICAgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmZha2VDb250YWluaW5nUGF0aDtcbiAgICB9XG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdGhpcy50c0xTSG9zdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCk7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBjb21waWxlck9wdGlvbnMsIHRoaXMuaG9zdEFkYXB0ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZVJlc29sdXRpb25DYWNoZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAucmVzb2x2ZWRNb2R1bGU7XG4gICAgcmV0dXJuIHJlc29sdmVkID8gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSA6IG51bGw7XG4gIH1cblxuICBnZXRPdXRwdXROYW1lKGZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIGZpbGVQYXRoOyB9XG59XG4iXX0=