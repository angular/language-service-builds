import { NgCompiler } from '@angular/compiler-cli';
import ts from 'typescript';
export declare class ReferencesBuilder {
    private readonly tsLS;
    private readonly compiler;
    private readonly ttc;
    constructor(tsLS: ts.LanguageService, compiler: NgCompiler);
    getReferencesAtPosition(filePath: string, position: number): ts.ReferenceEntry[] | undefined;
    private getReferencesAtTemplatePosition;
    private getReferencesAtTypescriptPosition;
}
export declare class RenameBuilder {
    private readonly tsLS;
    private readonly compiler;
    private readonly ttc;
    constructor(tsLS: ts.LanguageService, compiler: NgCompiler);
    getRenameInfo(filePath: string, position: number): Omit<ts.RenameInfoSuccess, 'kind' | 'kindModifiers'> | ts.RenameInfoFailure;
    findRenameLocations(filePath: string, position: number): readonly ts.RenameLocation[] | null;
    private findRenameLocationsAtTemplatePosition;
    private findRenameLocationsAtTypescriptPosition;
    private getTsNodeAtPosition;
    private buildRenameRequestsFromTemplateDetails;
    private buildRenameRequestAtTypescriptPosition;
    private buildPipeRenameRequest;
    private buildSelectorlessRenameRequest;
    /** Gets the rename locations for a selectorless request. */
    private getSelectorlessRenameLocations;
}
