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
    exports.ReflectorHost = void 0;
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var path = require("path");
    var ts = require("typescript");
    var ReflectorModuleModuleResolutionHost = /** @class */ (function () {
        function ReflectorModuleModuleResolutionHost(tsLSHost, getProgram) {
            this.tsLSHost = tsLSHost;
            this.getProgram = getProgram;
            this.metadataCollector = new language_services_1.MetadataCollector({
                // Note: verboseInvalidExpressions is important so that
                // the collector will collect errors instead of throwing
                verboseInvalidExpression: true,
            });
            if (tsLSHost.directoryExists) {
                this.directoryExists = function (directoryName) { return tsLSHost.directoryExists(directoryName); };
            }
            if (tsLSHost.realpath) {
                this.realpath = function (path) { return tsLSHost.realpath(path); };
            }
        }
        ReflectorModuleModuleResolutionHost.prototype.fileExists = function (fileName) {
            // TypeScript resolution logic walks through the following sequence in order:
            // package.json (read "types" field) -> .ts -> .tsx -> .d.ts
            // For more info, see
            // https://www.typescriptlang.org/docs/handbook/module-resolution.html
            // For Angular specifically, we can skip .tsx lookup
            if (fileName.endsWith('.tsx')) {
                return false;
            }
            if (this.tsLSHost.fileExists) {
                return this.tsLSHost.fileExists(fileName);
            }
            return !!this.tsLSHost.getScriptSnapshot(fileName);
        };
        ReflectorModuleModuleResolutionHost.prototype.readFile = function (fileName) {
            // readFile() is used by TypeScript to read package.json during module
            // resolution, and it's used by Angular to read metadata.json during
            // metadata resolution.
            if (this.tsLSHost.readFile) {
                return this.tsLSHost.readFile(fileName);
            }
            // As a fallback, read the JSON files from the editor snapshot.
            var snapshot = this.tsLSHost.getScriptSnapshot(fileName);
            if (!snapshot) {
                // MetadataReaderHost readFile() declaration should be
                // `readFile(fileName: string): string | undefined`
                return undefined;
            }
            return snapshot.getText(0, snapshot.getLength());
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
        ReflectorHost.prototype.getOutputName = function (filePath) {
            return filePath;
        };
        return ReflectorHost;
    }());
    exports.ReflectorHost = ReflectorHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9yZWZsZWN0b3JfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBMkk7SUFDM0ksMkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQztRQVdFLDZDQUNxQixRQUFnQyxFQUNoQyxVQUE0QjtZQUQ1QixhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQUNoQyxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQVpoQyxzQkFBaUIsR0FBRyxJQUFJLHFDQUFpQixDQUFDO2dCQUN6RCx1REFBdUQ7Z0JBQ3ZELHdEQUF3RDtnQkFDeEQsd0JBQXdCLEVBQUUsSUFBSTthQUMvQixDQUFDLENBQUM7WUFTRCxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBQSxhQUFhLElBQUksT0FBQSxRQUFRLENBQUMsZUFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBeEMsQ0FBd0MsQ0FBQzthQUNsRjtZQUNELElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFBLElBQUksSUFBSSxPQUFBLFFBQVEsQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDLEVBQXhCLENBQXdCLENBQUM7YUFDbEQ7UUFDSCxDQUFDO1FBRUQsd0RBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLDZFQUE2RTtZQUM3RSw0REFBNEQ7WUFDNUQscUJBQXFCO1lBQ3JCLHNFQUFzRTtZQUN0RSxvREFBb0Q7WUFDcEQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM3QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTtnQkFDNUIs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QUFzQixVQUFVLGlDQUE4QixDQUFDLENBQUM7aUJBQ2pGO2dCQUNELGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUM7YUFDMUM7WUFDRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDL0QsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUNkLFVBQVUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQzdELElBQUksQ0FBQyxxQkFBcUIsQ0FBQztpQkFDNUIsY0FBYyxDQUFDO1lBQ3JDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRCxDQUFDO1FBRUQscUNBQWEsR0FBYixVQUFjLFFBQWdCO1lBQzVCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUEvQ0QsSUErQ0M7SUEvQ1ksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7U3RhdGljU3ltYm9sUmVzb2x2ZXJIb3N0fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2NyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIE1ldGFkYXRhQ29sbGVjdG9yLCBNZXRhZGF0YVJlYWRlckhvc3QsIHJlYWRNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmNsYXNzIFJlZmxlY3Rvck1vZHVsZU1vZHVsZVJlc29sdXRpb25Ib3N0IGltcGxlbWVudHMgdHMuTW9kdWxlUmVzb2x1dGlvbkhvc3QsIE1ldGFkYXRhUmVhZGVySG9zdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWV0YWRhdGFDb2xsZWN0b3IgPSBuZXcgTWV0YWRhdGFDb2xsZWN0b3Ioe1xuICAgIC8vIE5vdGU6IHZlcmJvc2VJbnZhbGlkRXhwcmVzc2lvbnMgaXMgaW1wb3J0YW50IHNvIHRoYXRcbiAgICAvLyB0aGUgY29sbGVjdG9yIHdpbGwgY29sbGVjdCBlcnJvcnMgaW5zdGVhZCBvZiB0aHJvd2luZ1xuICAgIHZlcmJvc2VJbnZhbGlkRXhwcmVzc2lvbjogdHJ1ZSxcbiAgfSk7XG5cbiAgcmVhZG9ubHkgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcbiAgLy8gUmVzb2x2ZSBhIHN5bWJvbGljIGxpbmsuXG4gIHJlYWxwYXRoPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTSG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZ2V0UHJvZ3JhbTogKCkgPT4gdHMuUHJvZ3JhbSkge1xuICAgIGlmICh0c0xTSG9zdC5kaXJlY3RvcnlFeGlzdHMpIHtcbiAgICAgIHRoaXMuZGlyZWN0b3J5RXhpc3RzID0gZGlyZWN0b3J5TmFtZSA9PiB0c0xTSG9zdC5kaXJlY3RvcnlFeGlzdHMhKGRpcmVjdG9yeU5hbWUpO1xuICAgIH1cbiAgICBpZiAodHNMU0hvc3QucmVhbHBhdGgpIHtcbiAgICAgIHRoaXMucmVhbHBhdGggPSBwYXRoID0+IHRzTFNIb3N0LnJlYWxwYXRoIShwYXRoKTtcbiAgICB9XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBUeXBlU2NyaXB0IHJlc29sdXRpb24gbG9naWMgd2Fsa3MgdGhyb3VnaCB0aGUgZm9sbG93aW5nIHNlcXVlbmNlIGluIG9yZGVyOlxuICAgIC8vIHBhY2thZ2UuanNvbiAocmVhZCBcInR5cGVzXCIgZmllbGQpIC0+IC50cyAtPiAudHN4IC0+IC5kLnRzXG4gICAgLy8gRm9yIG1vcmUgaW5mbywgc2VlXG4gICAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbFxuICAgIC8vIEZvciBBbmd1bGFyIHNwZWNpZmljYWxseSwgd2UgY2FuIHNraXAgLnRzeCBsb29rdXBcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50c3gnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy50c0xTSG9zdC5maWxlRXhpc3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTSG9zdC5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuICEhdGhpcy50c0xTSG9zdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyByZWFkRmlsZSgpIGlzIHVzZWQgYnkgVHlwZVNjcmlwdCB0byByZWFkIHBhY2thZ2UuanNvbiBkdXJpbmcgbW9kdWxlXG4gICAgLy8gcmVzb2x1dGlvbiwgYW5kIGl0J3MgdXNlZCBieSBBbmd1bGFyIHRvIHJlYWQgbWV0YWRhdGEuanNvbiBkdXJpbmdcbiAgICAvLyBtZXRhZGF0YSByZXNvbHV0aW9uLlxuICAgIGlmICh0aGlzLnRzTFNIb3N0LnJlYWRGaWxlKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0xTSG9zdC5yZWFkRmlsZShmaWxlTmFtZSkhO1xuICAgIH1cbiAgICAvLyBBcyBhIGZhbGxiYWNrLCByZWFkIHRoZSBKU09OIGZpbGVzIGZyb20gdGhlIGVkaXRvciBzbmFwc2hvdC5cbiAgICBjb25zdCBzbmFwc2hvdCA9IHRoaXMudHNMU0hvc3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpO1xuICAgIGlmICghc25hcHNob3QpIHtcbiAgICAgIC8vIE1ldGFkYXRhUmVhZGVySG9zdCByZWFkRmlsZSgpIGRlY2xhcmF0aW9uIHNob3VsZCBiZVxuICAgICAgLy8gYHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWRgXG4gICAgICByZXR1cm4gdW5kZWZpbmVkITtcbiAgICB9XG4gICAgcmV0dXJuIHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICB9XG5cbiAgZ2V0U291cmNlRmlsZU1ldGFkYXRhKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzZiA9IHRoaXMuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiBzZiA/IHRoaXMubWV0YWRhdGFDb2xsZWN0b3IuZ2V0TWV0YWRhdGEoc2YpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgY2FjaGVNZXRhZGF0YShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gRG9uJ3QgY2FjaGUgdGhlIG1ldGFkYXRhIGZvciAudHMgZmlsZXMgYXMgdGhleSBtaWdodCBjaGFuZ2UgaW4gdGhlIGVkaXRvciFcbiAgICByZXR1cm4gZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlZmxlY3Rvckhvc3QgaW1wbGVtZW50cyBTdGF0aWNTeW1ib2xSZXNvbHZlckhvc3Qge1xuICBwcml2YXRlIHJlYWRvbmx5IGhvc3RBZGFwdGVyOiBSZWZsZWN0b3JNb2R1bGVNb2R1bGVSZXNvbHV0aW9uSG9zdDtcbiAgcHJpdmF0ZSByZWFkb25seSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuICBwcml2YXRlIHJlYWRvbmx5IG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIHJlYWRvbmx5IGZha2VDb250YWluaW5nUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGdldFByb2dyYW06ICgpID0+IHRzLlByb2dyYW0sIHByaXZhdGUgcmVhZG9ubHkgdHNMU0hvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QpIHtcbiAgICAvLyB0c0xTSG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkgcmV0dXJucyB0aGUgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnLmpzb25cbiAgICAvLyBpcyBsb2NhdGVkLiBUaGlzIGlzIG5vdCB0aGUgc2FtZSBhcyBwcm9jZXNzLmN3ZCgpIGJlY2F1c2UgdGhlIGxhbmd1YWdlXG4gICAgLy8gc2VydmljZSBob3N0IHNldHMgdGhlIFwicHJvamVjdCByb290IHBhdGhcIiBhcyBpdHMgY3VycmVudCBkaXJlY3RvcnkuXG4gICAgY29uc3QgY3VycmVudERpciA9IHRzTFNIb3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKTtcbiAgICB0aGlzLmZha2VDb250YWluaW5nUGF0aCA9IGN1cnJlbnREaXIgPyBwYXRoLmpvaW4oY3VycmVudERpciwgJ2Zha2VDb250YWluaW5nRmlsZS50cycpIDogJyc7XG4gICAgdGhpcy5ob3N0QWRhcHRlciA9IG5ldyBSZWZsZWN0b3JNb2R1bGVNb2R1bGVSZXNvbHV0aW9uSG9zdCh0c0xTSG9zdCwgZ2V0UHJvZ3JhbSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICAgIGN1cnJlbnREaXIsXG4gICAgICAgIHMgPT4gcywgIC8vIGdldENhbm9uaWNhbEZpbGVOYW1lXG4gICAgICAgIHRzTFNIb3N0LmdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSk7XG4gIH1cblxuICBnZXRNZXRhZGF0YUZvcihtb2R1bGVQYXRoOiBzdHJpbmcpOiB7W2tleTogc3RyaW5nXTogYW55fVtdfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHJlYWRNZXRhZGF0YShtb2R1bGVQYXRoLCB0aGlzLmhvc3RBZGFwdGVyLCB0aGlzLm1ldGFkYXRhUmVhZGVyQ2FjaGUpO1xuICB9XG5cbiAgbW9kdWxlTmFtZVRvRmlsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZT86IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAoIWNvbnRhaW5pbmdGaWxlKSB7XG4gICAgICBpZiAobW9kdWxlTmFtZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzIHJlcXVpcmVzIGEgY29udGFpbmluZyBmaWxlLicpO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmZha2VDb250YWluaW5nUGF0aCkge1xuICAgICAgICAvLyBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBlbXB0eSB0aGVuIHRoZSBmaWxlIG11c3QgYmVsb25nIHRvIGFuIGluZmVycmVkXG4gICAgICAgIC8vIHByb2plY3QgKG5vIHRzY29uZmlnLmpzb24pLCBpbiB3aGljaCBjYXNlIGl0J3Mgbm90IHBvc3NpYmxlIHRvIHJlc29sdmVcbiAgICAgICAgLy8gdGhlIG1vZHVsZSB3aXRob3V0IHRoZSBjYWxsZXIgZXhwbGljaXRseSBwcm92aWRpbmcgYSBjb250YWluaW5nIGZpbGUuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJyR7bW9kdWxlTmFtZX0nIHdpdGhvdXQgYSBjb250YWluaW5nIGZpbGUuYCk7XG4gICAgICB9XG4gICAgICBjb250YWluaW5nRmlsZSA9IHRoaXMuZmFrZUNvbnRhaW5pbmdQYXRoO1xuICAgIH1cbiAgICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0aGlzLnRzTFNIb3N0LmdldENvbXBpbGF0aW9uU2V0dGluZ3MoKTtcbiAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUsIGNvbXBpbGVyT3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlKVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXNvbHZlZE1vZHVsZTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgPyByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lIDogbnVsbDtcbiAgfVxuXG4gIGdldE91dHB1dE5hbWUoZmlsZVBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBmaWxlUGF0aDtcbiAgfVxufVxuIl19