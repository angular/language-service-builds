/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { CompilerOptions, NgCompiler } from '@angular/compiler-cli';
import { MigrationConfig } from '@angular/core/schematics/migrations/signal-migration/src';
import { ApplyRefactoringProgressFn, ApplyRefactoringResult } from '../../../api';
import ts from 'typescript';
import type { ActiveRefactoring } from '../refactoring';
/**
 * Base language service refactoring action that can convert `@Input()`
 * declarations of a full class to signal inputs.
 *
 * The user can click on an class with `@Input`s and ask for all the input to be migrated.
 * All references, imports and the declaration are updated automatically.
 */
declare abstract class BaseConvertFullClassToSignalInputsRefactoring implements ActiveRefactoring {
    private project;
    abstract config: MigrationConfig;
    constructor(project: ts.server.Project);
    static isApplicable(compiler: NgCompiler, fileName: string, positionOrRange: number | ts.TextRange): boolean;
    computeEditsForFix(compiler: NgCompiler, compilerOptions: CompilerOptions, fileName: string, positionOrRange: number | ts.TextRange, reportProgress: ApplyRefactoringProgressFn): Promise<ApplyRefactoringResult>;
}
export declare class ConvertFullClassToSignalInputsRefactoring extends BaseConvertFullClassToSignalInputsRefactoring {
    static id: string;
    static description: string;
    config: MigrationConfig;
}
export declare class ConvertFullClassToSignalInputsBestEffortRefactoring extends BaseConvertFullClassToSignalInputsRefactoring {
    static id: string;
    static description: string;
    config: MigrationConfig;
}
export {};
