/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { CompilerOptions } from '@angular/compiler-cli';
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import ts from 'typescript';
import { ApplyRefactoringProgressFn, ApplyRefactoringResult } from '../../../api';
import { MigrationConfig } from '@angular/core/schematics/migrations/signal-queries-migration';
export declare function applySignalQueriesRefactoring(compiler: NgCompiler, compilerOptions: CompilerOptions, config: MigrationConfig, project: ts.server.Project, reportProgress: ApplyRefactoringProgressFn, shouldMigrateQuery: NonNullable<MigrationConfig['shouldMigrateQuery']>, multiMode: boolean): Promise<ApplyRefactoringResult>;
