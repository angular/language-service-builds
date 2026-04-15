/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { CompilerOptions } from '@angular/compiler-cli';
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import { MigrationConfig } from '@angular/core/schematics/migrations/signal-migration/src';
import { ApplyRefactoringProgressFn, ApplyRefactoringResult } from '../../../api';
import ts from 'typescript';
import type { ActiveRefactoring } from '../refactoring';
/**
 * Base language service refactoring action that can convert decorator
 * queries of a full class to signal queries.
 *
 * The user can click on an class with decorator queries and ask for all the queries
 * to be migrated. All references, imports and the declaration are updated automatically.
 */
declare abstract class BaseConvertFullClassToSignalQueriesRefactoring implements ActiveRefactoring {
    private project;
    abstract config: MigrationConfig;
    constructor(project: ts.server.Project);
    static isApplicable(compiler: NgCompiler, fileName: string, positionOrRange: number | ts.TextRange): boolean;
    computeEditsForFix(compiler: NgCompiler, compilerOptions: CompilerOptions, fileName: string, positionOrRange: number | ts.TextRange, reportProgress: ApplyRefactoringProgressFn): Promise<ApplyRefactoringResult>;
}
export declare class ConvertFullClassToSignalQueriesRefactoring extends BaseConvertFullClassToSignalQueriesRefactoring {
    static id: string;
    static description: string;
    config: MigrationConfig;
}
export declare class ConvertFullClassToSignalQueriesBestEffortRefactoring extends BaseConvertFullClassToSignalQueriesRefactoring {
    static id: string;
    static description: string;
    config: MigrationConfig;
}
export {};
