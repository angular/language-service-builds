/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/ivy/compiler_factory" />
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { NgCompilerOptions } from '@angular/compiler-cli/src/ngtsc/core/api';
import { TypeCheckingProgramStrategy } from '@angular/compiler-cli/src/ngtsc/typecheck/api';
import { LanguageServiceAdapter } from './language_service_adapter';
export declare class CompilerFactory {
    private readonly adapter;
    private readonly programStrategy;
    private readonly incrementalStrategy;
    private compiler;
    private lastKnownProgram;
    constructor(adapter: LanguageServiceAdapter, programStrategy: TypeCheckingProgramStrategy);
    /**
     * Create a new instance of the Ivy compiler if the program has changed since
     * the last time the compiler was instantiated. If the program has not changed,
     * return the existing instance.
     * @param fileName override the template if this is an external template file
     * @param options angular compiler options
     */
    getOrCreateWithChangedFile(fileName: string, options: NgCompilerOptions): NgCompiler;
    private overrideTemplate;
    registerLastKnownProgram(): void;
}
