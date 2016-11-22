import { NgAnalyzedModules } from '@angular/compiler/src/aot/compiler';
import { CompileMetadataResolver } from '@angular/compiler/src/metadata_resolver';
import * as ts from 'typescript';
import { Declarations, LanguageService, LanguageServiceHost, TemplateSource, TemplateSources } from './types';
/**
 * Create a `LanguageServiceHost`
 */
export declare function createLanguageServiceFromTypescript(typescript: typeof ts, host: ts.LanguageServiceHost, service: ts.LanguageService): LanguageService;
/**
 * An implemntation of a `LanguageSerivceHost` for a TypeScript project.
 *
 * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
 * the TypeScript language services.
 *
 * @expermental
 */
export declare class TypeScriptServiceHost implements LanguageServiceHost {
    private host;
    private tsService;
    private ts;
    private _resolver;
    private _staticSymbolCache;
    private _reflector;
    private _reflectorHost;
    private _checker;
    private _typeCache;
    private context;
    private lastProgram;
    private modulesOutOfDate;
    private analyzedModules;
    private service;
    private fileToComponent;
    private templateReferences;
    constructor(typescript: typeof ts, host: ts.LanguageServiceHost, tsService: ts.LanguageService);
    setSite(service: LanguageService): void;
    /**
     * Angular LanguageServiceHost implementation
     */
    resolver: CompileMetadataResolver;
    getTemplateReferences(): string[];
    getTemplateAt(fileName: string, position: number): TemplateSource | undefined;
    getAnalyzedModules(): NgAnalyzedModules;
    getTemplates(fileName: string): TemplateSources;
    getDeclarations(fileName: string): Declarations;
    getSourceFile(fileName: string): ts.SourceFile;
    updateAnalyzedModules(): void;
    private program;
    private checker;
    private validate();
    private clearCaches();
    private ensureTemplateMap();
    private getSourceFromDeclaration(fileName, version, source, span, type, declaration, node, sourceFile);
    private getSourceFromNode(fileName, version, node);
    private getSourceFromType(fileName, version, type);
    private reflectorHost;
    private reflector;
    private getTemplateClassFromStaticSymbol(type);
    private static missingTemplate;
    /**
     * Given a template string node, see if it is an Angular template string, and if so return the
     * containing class.
     */
    private getTemplateClassDeclFromNode(currentToken);
    private getDeclarationFromNode(sourceFile, node);
    private stringOf(node);
    private findNode(sourceFile, position);
    private findLiteralType(kind, context);
}
