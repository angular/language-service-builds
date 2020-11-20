/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/ivy/language_service_adapter" />
import { NgCompilerAdapter } from '@angular/compiler-cli/src/ngtsc/core/api';
import { AbsoluteFsPath } from '@angular/compiler-cli/src/ngtsc/file_system';
import * as ts from 'typescript/lib/tsserverlibrary';
export declare class LanguageServiceAdapter implements NgCompilerAdapter {
    private readonly project;
    readonly entryPoint: null;
    readonly constructionDiagnostics: ts.Diagnostic[];
    readonly ignoreForEmit: Set<ts.SourceFile>;
    readonly factoryTracker: null;
    readonly unifiedModulesHost: null;
    readonly rootDirs: AbsoluteFsPath[];
    private readonly templateVersion;
    constructor(project: ts.server.Project);
    isShim(sf: ts.SourceFile): boolean;
    fileExists(fileName: string): boolean;
    readFile(fileName: string): string | undefined;
    getCurrentDirectory(): string;
    getCanonicalFileName(fileName: string): string;
    /**
     * readResource() is an Angular-specific method for reading files that are not
     * managed by the TS compiler host, namely templates and stylesheets.
     * It is a method on ExtendedTsCompilerHost, see
     * packages/compiler-cli/src/ngtsc/core/api/src/interfaces.ts
     */
    readResource(fileName: string): string;
    isTemplateDirty(fileName: string): boolean;
}
export declare function isTypeScriptFile(fileName: string): boolean;
export declare function isExternalTemplate(fileName: string): boolean;
