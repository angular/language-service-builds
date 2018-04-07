/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { MetadataCollector, createMetadataReaderCache, readMetadata } from '@angular/compiler-cli/src/language_services';
import * as path from 'path';
import * as ts from 'typescript';
var ReflectorModuleModuleResolutionHost = /** @class */ (function () {
    function ReflectorModuleModuleResolutionHost(host, getProgram) {
        var _this = this;
        this.host = host;
        this.getProgram = getProgram;
        // Note: verboseInvalidExpressions is important so that
        // the collector will collect errors instead of throwing
        this.metadataCollector = new MetadataCollector({ verboseInvalidExpression: true });
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
    function ReflectorHost(getProgram, serviceHost, options) {
        this.options = options;
        this.metadataReaderCache = createMetadataReaderCache();
        this.hostAdapter = new ReflectorModuleModuleResolutionHost(serviceHost, getProgram);
        this.moduleResolutionCache =
            ts.createModuleResolutionCache(serviceHost.getCurrentDirectory(), function (s) { return s; });
    }
    ReflectorHost.prototype.getMetadataFor = function (modulePath) {
        return readMetadata(modulePath, this.hostAdapter, this.metadataReaderCache);
    };
    ReflectorHost.prototype.moduleNameToFileName = function (moduleName, containingFile) {
        if (!containingFile) {
            if (moduleName.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = path.join(this.options.basePath, 'index.ts').replace(/\\/g, '/');
        }
        var resolved = ts.resolveModuleName(moduleName, containingFile, this.options, this.hostAdapter)
            .resolvedModule;
        return resolved ? resolved.resolvedFileName : null;
    };
    ReflectorHost.prototype.getOutputName = function (filePath) { return filePath; };
    return ReflectorHost;
}());
export { ReflectorHost };
//# sourceMappingURL=reflector_host.js.map