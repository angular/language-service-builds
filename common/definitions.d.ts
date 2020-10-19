/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/common/definitions" />
import * as ts from 'typescript';
export interface ResourceResolver {
    /**
     * Resolve the url of a resource relative to the file that contains the reference to it.
     *
     * @param file The, possibly relative, url of the resource.
     * @param basePath The path to the file that contains the URL of the resource.
     * @returns A resolved url of resource.
     * @throws An error if the resource cannot be resolved.
     */
    resolve(file: string, basePath: string): string;
}
/**
 * Gets an Angular-specific definition in a TypeScript source file.
 */
export declare function getTsDefinitionAndBoundSpan(sf: ts.SourceFile, position: number, resourceResolver: ResourceResolver): ts.DefinitionInfoAndBoundSpan | undefined;
