/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { CompilerOptions } from '@angular/compiler-cli';
import { NgCompiler } from '@angular/compiler-cli/src/ngtsc/core';
import type ts from 'typescript';
import { KnownInputInfo, MigrationConfig } from '@angular/core/schematics/migrations/signal-migration/src';
import { ApplyRefactoringProgressFn, ApplyRefactoringResult } from '../../../api';
export declare function applySignalInputRefactoring(compiler: NgCompiler, compilerOptions: CompilerOptions, config: MigrationConfig, project: ts.server.Project, reportProgress: ApplyRefactoringProgressFn, shouldMigrateInput: (input: KnownInputInfo) => boolean, multiMode: boolean): Promise<ApplyRefactoringResult>;
