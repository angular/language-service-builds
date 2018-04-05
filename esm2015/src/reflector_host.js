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
class ReflectorModuleModuleResolutionHost {
    constructor(host, getProgram) {
        this.host = host;
        this.getProgram = getProgram;
        // Note: verboseInvalidExpressions is important so that
        // the collector will collect errors instead of throwing
        this.metadataCollector = new MetadataCollector({ verboseInvalidExpression: true });
        if (host.directoryExists)
            this.directoryExists = directoryName => this.host.directoryExists(directoryName);
    }
    fileExists(fileName) { return !!this.host.getScriptSnapshot(fileName); }
    readFile(fileName) {
        let snapshot = this.host.getScriptSnapshot(fileName);
        if (snapshot) {
            return snapshot.getText(0, snapshot.getLength());
        }
        // Typescript readFile() declaration should be `readFile(fileName: string): string | undefined
        return undefined;
    }
    getSourceFileMetadata(fileName) {
        const sf = this.getProgram().getSourceFile(fileName);
        return sf ? this.metadataCollector.getMetadata(sf) : undefined;
    }
    cacheMetadata(fileName) {
        // Don't cache the metadata for .ts files as they might change in the editor!
        return fileName.endsWith('.d.ts');
    }
}
export class ReflectorHost {
    constructor(getProgram, serviceHost, options) {
        this.options = options;
        this.metadataReaderCache = createMetadataReaderCache();
        this.hostAdapter = new ReflectorModuleModuleResolutionHost(serviceHost, getProgram);
        this.moduleResolutionCache =
            ts.createModuleResolutionCache(serviceHost.getCurrentDirectory(), (s) => s);
    }
    getMetadataFor(modulePath) {
        return readMetadata(modulePath, this.hostAdapter, this.metadataReaderCache);
    }
    moduleNameToFileName(moduleName, containingFile) {
        if (!containingFile) {
            if (moduleName.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = path.join(this.options.basePath, 'index.ts').replace(/\\/g, '/');
        }
        const resolved = ts.resolveModuleName(moduleName, containingFile, this.options, this.hostAdapter)
            .resolvedModule;
        return resolved ? resolved.resolvedFileName : null;
    }
    getOutputName(filePath) { return filePath; }
}
//# sourceMappingURL=reflector_host.js.map