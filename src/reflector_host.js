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
        function ReflectorHost(getProgram, serviceHost) {
            this.serviceHost = serviceHost;
            this.metadataReaderCache = language_services_1.createMetadataReaderCache();
            this.hostAdapter = new ReflectorModuleModuleResolutionHost(serviceHost, getProgram);
        }
        ReflectorHost.prototype.getMetadataFor = function (modulePath) {
            return language_services_1.readMetadata(modulePath, this.hostAdapter, this.metadataReaderCache);
        };
        ReflectorHost.prototype.moduleNameToFileName = function (moduleName, containingFile) {
            if (!containingFile) {
                if (moduleName.startsWith('.')) {
                    throw new Error('Resolution of relative paths requires a containing file.');
                }
                // serviceHost.getCurrentDirectory() returns the directory where tsconfig.json
                // is located. This is not the same as process.cwd() because the language
                // service host sets the "project root path" as its current directory.
                var currentDirectory = this.serviceHost.getCurrentDirectory();
                if (!currentDirectory) {
                    // If current directory is empty then the file must belong to an inferred
                    // project (no tsconfig.json), in which case it's not possible to resolve
                    // the module without the caller explicitly providing a containing file.
                    throw new Error("Could not resolve '" + moduleName + "' without a containing file.");
                }
                // Any containing file gives the same result for absolute imports
                containingFile = path.join(currentDirectory, 'index.ts');
            }
            var compilerOptions = this.serviceHost.getCompilationSettings();
            var resolved = ts.resolveModuleName(moduleName, containingFile, compilerOptions, this.hostAdapter)
                .resolvedModule;
            return resolved ? resolved.resolvedFileName : null;
        };
        ReflectorHost.prototype.getOutputName = function (filePath) { return filePath; };
        return ReflectorHost;
    }());
    exports.ReflectorHost = ReflectorHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9yZWZsZWN0b3JfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILGlGQUEySTtJQUMzSSwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDO1FBS0UsNkNBQW9CLElBQTRCLEVBQVUsVUFBNEI7WUFBdEYsaUJBR0M7WUFIbUIsU0FBSSxHQUFKLElBQUksQ0FBd0I7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUp0Rix1REFBdUQ7WUFDdkQsd0RBQXdEO1lBQ2hELHNCQUFpQixHQUFHLElBQUkscUNBQWlCLENBQUMsRUFBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBR2xGLElBQUksSUFBSSxDQUFDLGVBQWU7Z0JBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBQSxhQUFhLElBQUksT0FBQSxLQUFJLENBQUMsSUFBSSxDQUFDLGVBQWlCLENBQUMsYUFBYSxDQUFDLEVBQTFDLENBQTBDLENBQUM7UUFDdkYsQ0FBQztRQUVELHdEQUFVLEdBQVYsVUFBVyxRQUFnQixJQUFhLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpGLHNEQUFRLEdBQVIsVUFBUyxRQUFnQjtZQUN2QixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELElBQUksUUFBUSxFQUFFO2dCQUNaLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7YUFDbEQ7WUFFRCw4RkFBOEY7WUFDOUYsT0FBTyxTQUFXLENBQUM7UUFDckIsQ0FBQztRQUtELG1FQUFxQixHQUFyQixVQUFzQixRQUFnQjtZQUNwQyxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDakUsQ0FBQztRQUVELDJEQUFhLEdBQWIsVUFBYyxRQUFnQjtZQUM1Qiw2RUFBNkU7WUFDN0UsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDSCwwQ0FBQztJQUFELENBQUMsQUFsQ0QsSUFrQ0M7SUFFRDtRQUlFLHVCQUFZLFVBQTRCLEVBQW1CLFdBQW1DO1lBQW5DLGdCQUFXLEdBQVgsV0FBVyxDQUF3QjtZQUZ0Rix3QkFBbUIsR0FBRyw2Q0FBeUIsRUFBRSxDQUFDO1lBR3hELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxtQ0FBbUMsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELHNDQUFjLEdBQWQsVUFBZSxVQUFrQjtZQUMvQixPQUFPLGdDQUFZLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUVELDRDQUFvQixHQUFwQixVQUFxQixVQUFrQixFQUFFLGNBQXVCO1lBQzlELElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQywwREFBMEQsQ0FBQyxDQUFDO2lCQUM3RTtnQkFDRCw4RUFBOEU7Z0JBQzlFLHlFQUF5RTtnQkFDekUsc0VBQXNFO2dCQUN0RSxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO29CQUNyQix5RUFBeUU7b0JBQ3pFLHlFQUF5RTtvQkFDekUsd0VBQXdFO29CQUN4RSxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUFzQixVQUFVLGlDQUE4QixDQUFDLENBQUM7aUJBQ2pGO2dCQUNELGlFQUFpRTtnQkFDakUsY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDMUQ7WUFDRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDbEUsSUFBTSxRQUFRLEdBQ1YsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUM7aUJBQzlFLGNBQWMsQ0FBQztZQUN4QixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDckQsQ0FBQztRQUVELHFDQUFhLEdBQWIsVUFBYyxRQUFnQixJQUFJLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN0RCxvQkFBQztJQUFELENBQUMsQUF0Q0QsSUFzQ0M7SUF0Q1ksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7U3RhdGljU3ltYm9sUmVzb2x2ZXJIb3N0fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge01ldGFkYXRhQ29sbGVjdG9yLCBNZXRhZGF0YVJlYWRlckhvc3QsIGNyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIHJlYWRNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmNsYXNzIFJlZmxlY3Rvck1vZHVsZU1vZHVsZVJlc29sdXRpb25Ib3N0IGltcGxlbWVudHMgdHMuTW9kdWxlUmVzb2x1dGlvbkhvc3QsIE1ldGFkYXRhUmVhZGVySG9zdCB7XG4gIC8vIE5vdGU6IHZlcmJvc2VJbnZhbGlkRXhwcmVzc2lvbnMgaXMgaW1wb3J0YW50IHNvIHRoYXRcbiAgLy8gdGhlIGNvbGxlY3RvciB3aWxsIGNvbGxlY3QgZXJyb3JzIGluc3RlYWQgb2YgdGhyb3dpbmdcbiAgcHJpdmF0ZSBtZXRhZGF0YUNvbGxlY3RvciA9IG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7dmVyYm9zZUludmFsaWRFeHByZXNzaW9uOiB0cnVlfSk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBwcml2YXRlIGdldFByb2dyYW06ICgpID0+IHRzLlByb2dyYW0pIHtcbiAgICBpZiAoaG9zdC5kaXJlY3RvcnlFeGlzdHMpXG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IGRpcmVjdG9yeU5hbWUgPT4gdGhpcy5ob3N0LmRpcmVjdG9yeUV4aXN0cyAhKGRpcmVjdG9yeU5hbWUpO1xuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiAhIXRoaXMuaG9zdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7IH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBsZXQgc25hcHNob3QgPSB0aGlzLmhvc3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpO1xuICAgIGlmIChzbmFwc2hvdCkge1xuICAgICAgcmV0dXJuIHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgIH1cblxuICAgIC8vIFR5cGVzY3JpcHQgcmVhZEZpbGUoKSBkZWNsYXJhdGlvbiBzaG91bGQgYmUgYHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWRcbiAgICByZXR1cm4gdW5kZWZpbmVkICE7XG4gIH1cblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgZGlyZWN0b3J5RXhpc3RzICE6IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGJvb2xlYW47XG5cbiAgZ2V0U291cmNlRmlsZU1ldGFkYXRhKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzZiA9IHRoaXMuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiBzZiA/IHRoaXMubWV0YWRhdGFDb2xsZWN0b3IuZ2V0TWV0YWRhdGEoc2YpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgY2FjaGVNZXRhZGF0YShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gRG9uJ3QgY2FjaGUgdGhlIG1ldGFkYXRhIGZvciAudHMgZmlsZXMgYXMgdGhleSBtaWdodCBjaGFuZ2UgaW4gdGhlIGVkaXRvciFcbiAgICByZXR1cm4gZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlZmxlY3Rvckhvc3QgaW1wbGVtZW50cyBTdGF0aWNTeW1ib2xSZXNvbHZlckhvc3Qge1xuICBwcml2YXRlIGhvc3RBZGFwdGVyOiBSZWZsZWN0b3JNb2R1bGVNb2R1bGVSZXNvbHV0aW9uSG9zdDtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuXG4gIGNvbnN0cnVjdG9yKGdldFByb2dyYW06ICgpID0+IHRzLlByb2dyYW0sIHByaXZhdGUgcmVhZG9ubHkgc2VydmljZUhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QpIHtcbiAgICB0aGlzLmhvc3RBZGFwdGVyID0gbmV3IFJlZmxlY3Rvck1vZHVsZU1vZHVsZVJlc29sdXRpb25Ib3N0KHNlcnZpY2VIb3N0LCBnZXRQcm9ncmFtKTtcbiAgfVxuXG4gIGdldE1ldGFkYXRhRm9yKG1vZHVsZVBhdGg6IHN0cmluZyk6IHtba2V5OiBzdHJpbmddOiBhbnl9W118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gcmVhZE1ldGFkYXRhKG1vZHVsZVBhdGgsIHRoaXMuaG9zdEFkYXB0ZXIsIHRoaXMubWV0YWRhdGFSZWFkZXJDYWNoZSk7XG4gIH1cblxuICBtb2R1bGVOYW1lVG9GaWxlTmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlPzogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmICghY29udGFpbmluZ0ZpbGUpIHtcbiAgICAgIGlmIChtb2R1bGVOYW1lLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgcmVxdWlyZXMgYSBjb250YWluaW5nIGZpbGUuJyk7XG4gICAgICB9XG4gICAgICAvLyBzZXJ2aWNlSG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkgcmV0dXJucyB0aGUgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnLmpzb25cbiAgICAgIC8vIGlzIGxvY2F0ZWQuIFRoaXMgaXMgbm90IHRoZSBzYW1lIGFzIHByb2Nlc3MuY3dkKCkgYmVjYXVzZSB0aGUgbGFuZ3VhZ2VcbiAgICAgIC8vIHNlcnZpY2UgaG9zdCBzZXRzIHRoZSBcInByb2plY3Qgcm9vdCBwYXRoXCIgYXMgaXRzIGN1cnJlbnQgZGlyZWN0b3J5LlxuICAgICAgY29uc3QgY3VycmVudERpcmVjdG9yeSA9IHRoaXMuc2VydmljZUhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICAgICAgaWYgKCFjdXJyZW50RGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGVtcHR5IHRoZW4gdGhlIGZpbGUgbXVzdCBiZWxvbmcgdG8gYW4gaW5mZXJyZWRcbiAgICAgICAgLy8gcHJvamVjdCAobm8gdHNjb25maWcuanNvbiksIGluIHdoaWNoIGNhc2UgaXQncyBub3QgcG9zc2libGUgdG8gcmVzb2x2ZVxuICAgICAgICAvLyB0aGUgbW9kdWxlIHdpdGhvdXQgdGhlIGNhbGxlciBleHBsaWNpdGx5IHByb3ZpZGluZyBhIGNvbnRhaW5pbmcgZmlsZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSAnJHttb2R1bGVOYW1lfScgd2l0aG91dCBhIGNvbnRhaW5pbmcgZmlsZS5gKTtcbiAgICAgIH1cbiAgICAgIC8vIEFueSBjb250YWluaW5nIGZpbGUgZ2l2ZXMgdGhlIHNhbWUgcmVzdWx0IGZvciBhYnNvbHV0ZSBpbXBvcnRzXG4gICAgICBjb250YWluaW5nRmlsZSA9IHBhdGguam9pbihjdXJyZW50RGlyZWN0b3J5LCAnaW5kZXgudHMnKTtcbiAgICB9XG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdGhpcy5zZXJ2aWNlSG9zdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCk7XG4gICAgY29uc3QgcmVzb2x2ZWQgPVxuICAgICAgICB0cy5yZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZSwgY29tcGlsZXJPcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyKVxuICAgICAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICAgIHJldHVybiByZXNvbHZlZCA/IHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUgOiBudWxsO1xuICB9XG5cbiAgZ2V0T3V0cHV0TmFtZShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBmaWxlUGF0aDsgfVxufVxuIl19