/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { StaticReflectorHost } from '@angular/compiler';
import { ModuleMetadata } from '@angular/tsc-wrapped/src/schema';
import * as ts from 'typescript';
export declare class ReflectorHost implements StaticReflectorHost {
    private getProgram;
    private serviceHost;
    private options;
    private basePath;
    private metadataCollector;
    private moduleResolverHost;
    private _typeChecker;
    private metadataCache;
    constructor(getProgram: () => ts.Program, serviceHost: ts.LanguageServiceHost, options: ts.CompilerOptions, basePath: string);
    getCanonicalFileName(fileName: string): string;
    private program;
    moduleNameToFileName(moduleName: string, containingFile: string): string;
    /**
     * We want a moduleId that will appear in import statements in the generated code.
     * These need to be in a form that system.js can load, so absolute file paths don't work.
     * Relativize the paths by checking candidate prefixes of the absolute path, to see if
     * they are resolvable by the moduleResolution strategy from the CompilerHost.
     */
    fileNameToModuleName(importedFile: string, containingFile: string): string;
    private typeChecker;
    private typeCache;
    getMetadataFor(filePath: string): ModuleMetadata[];
    readMetadata(filePath: string): any[];
}
