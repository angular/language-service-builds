/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NgCompiler, NgCompilerOptions, ProgramDriver } from '@angular/compiler-cli';
import { LanguageServiceAdapter } from './adapters';
/**
 * Manages the `NgCompiler` instance which backs the language service, updating or replacing it as
 * needed to produce an up-to-date understanding of the current program.
 *
 * TODO(alxhub): currently the options used for the compiler are specified at `CompilerFactory`
 * construction, and are not changeable. In a real project, users can update `tsconfig.json`. We
 * need to properly handle a change in the compiler options, either by having an API to update the
 * `CompilerFactory` to use new options, or by replacing it entirely.
 */
export declare class CompilerFactory {
    private readonly adapter;
    private readonly programStrategy;
    private readonly options;
    private readonly incrementalStrategy;
    private compiler;
    constructor(adapter: LanguageServiceAdapter, programStrategy: ProgramDriver, options: NgCompilerOptions);
    getOrCreate(): NgCompiler;
}
