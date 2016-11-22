/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { MetadataCollector } from '@angular/tsc-wrapped/src/collector';
import * as path from 'path';
import * as ts from 'typescript';
var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
var DTS = /\.d\.ts$/;
var serialNumber = 0;
var ReflectorModuleModuleResolutionHost = (function () {
    function ReflectorModuleModuleResolutionHost(host) {
        var _this = this;
        this.host = host;
        this.forceExists = [];
        if (host.directoryExists)
            this.directoryExists = function (directoryName) { return _this.host.directoryExists(directoryName); };
    }
    ReflectorModuleModuleResolutionHost.prototype.fileExists = function (fileName) {
        return !!this.host.getScriptSnapshot(fileName) || this.forceExists.indexOf(fileName) >= 0;
    };
    ReflectorModuleModuleResolutionHost.prototype.readFile = function (fileName) {
        var snapshot = this.host.getScriptSnapshot(fileName);
        if (snapshot) {
            return snapshot.getText(0, snapshot.getLength());
        }
    };
    ReflectorModuleModuleResolutionHost.prototype.forceExist = function (fileName) { this.forceExists.push(fileName); };
    return ReflectorModuleModuleResolutionHost;
}());
export var ReflectorHost = (function () {
    function ReflectorHost(getProgram, serviceHost, options, basePath) {
        this.getProgram = getProgram;
        this.serviceHost = serviceHost;
        this.options = options;
        this.basePath = basePath;
        this.metadataCache = new Map();
        this.typeCache = new Map();
        this.moduleResolverHost = new ReflectorModuleModuleResolutionHost(serviceHost);
        this.metadataCollector = new MetadataCollector();
    }
    ReflectorHost.prototype.getCanonicalFileName = function (fileName) { return fileName; };
    Object.defineProperty(ReflectorHost.prototype, "program", {
        get: function () { return this.getProgram(); },
        enumerable: true,
        configurable: true
    });
    ReflectorHost.prototype.moduleNameToFileName = function (moduleName, containingFile) {
        if (!containingFile || !containingFile.length) {
            if (moduleName.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = this.getCanonicalFileName(path.join(this.basePath, 'index.ts'));
        }
        moduleName = moduleName.replace(EXT, '');
        var resolved = ts.resolveModuleName(moduleName, containingFile, this.options, this.moduleResolverHost)
            .resolvedModule;
        return resolved ? resolved.resolvedFileName : null;
    };
    ;
    /**
     * We want a moduleId that will appear in import statements in the generated code.
     * These need to be in a form that system.js can load, so absolute file paths don't work.
     * Relativize the paths by checking candidate prefixes of the absolute path, to see if
     * they are resolvable by the moduleResolution strategy from the CompilerHost.
     */
    ReflectorHost.prototype.fileNameToModuleName = function (importedFile, containingFile) {
        // TODO(tbosch): if a file does not yet exist (because we compile it later),
        // we still need to create it so that the `resolve` method works!
        if (!this.moduleResolverHost.fileExists(importedFile)) {
            this.moduleResolverHost.forceExist(importedFile);
        }
        var parts = importedFile.replace(EXT, '').split(path.sep).filter(function (p) { return !!p; });
        for (var index = parts.length - 1; index >= 0; index--) {
            var candidate = parts.slice(index, parts.length).join(path.sep);
            if (this.moduleNameToFileName('.' + path.sep + candidate, containingFile) === importedFile) {
                return "./" + candidate;
            }
            if (this.moduleNameToFileName(candidate, containingFile) === importedFile) {
                return candidate;
            }
        }
        throw new Error("Unable to find any resolvable import for " + importedFile + " relative to " + containingFile);
    };
    Object.defineProperty(ReflectorHost.prototype, "typeChecker", {
        get: function () {
            var result = this._typeChecker;
            if (!result) {
                result = this._typeChecker = this.program.getTypeChecker();
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    // TODO(alexeagle): take a statictype
    ReflectorHost.prototype.getMetadataFor = function (filePath) {
        if (!this.moduleResolverHost.fileExists(filePath)) {
            throw new Error("No such file '" + filePath + "'");
        }
        if (DTS.test(filePath)) {
            var metadataPath = filePath.replace(DTS, '.metadata.json');
            if (this.moduleResolverHost.fileExists(metadataPath)) {
                return this.readMetadata(metadataPath);
            }
        }
        var sf = this.program.getSourceFile(filePath);
        if (!sf) {
            throw new Error("Source file " + filePath + " not present in program.");
        }
        var entry = this.metadataCache.get(sf.path);
        var version = this.serviceHost.getScriptVersion(sf.path);
        if (entry && entry.version == version) {
            if (!entry.content)
                return undefined;
            return [entry.content];
        }
        var metadata = this.metadataCollector.getMetadata(sf);
        this.metadataCache.set(sf.path, { version: version, content: metadata });
        if (metadata)
            return [metadata];
    };
    ReflectorHost.prototype.readMetadata = function (filePath) {
        try {
            var text = this.moduleResolverHost.readFile(filePath);
            var result = JSON.parse(text);
            if (!Array.isArray(result))
                return [result];
            return result;
        }
        catch (e) {
            console.error("Failed to read JSON file " + filePath);
            throw e;
        }
    };
    return ReflectorHost;
}());
//# sourceMappingURL=reflector_host.js.map