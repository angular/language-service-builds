/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/language-service/src/typescript_host" />
import { HtmlParser, NgAnalyzedModules, ParseTreeResult, ResourceLoader } from '@angular/compiler';
import * as ts from 'typescript';
import { AstResult, TemplateInfo } from './common';
import { Declarations, LanguageService, LanguageServiceHost, TemplateSource } from './types';
/**
 * Create a `LanguageServiceHost`
 */
export declare function createLanguageServiceFromTypescript(host: ts.LanguageServiceHost, service: ts.LanguageService): LanguageService;
/**
 * The language service never needs the normalized versions of the metadata. To avoid parsing
 * the content and resolving references, return an empty file. This also allows normalizing
 * template that are syntatically incorrect which is required to provide completions in
 * syntactically incorrect templates.
 */
export declare class DummyHtmlParser extends HtmlParser {
    parse(): ParseTreeResult;
}
/**
 * Avoid loading resources in the language servcie by using a dummy loader.
 */
export declare class DummyResourceLoader extends ResourceLoader {
    get(url: string): Promise<string>;
}
/**
 * An implementation of a `LanguageServiceHost` for a TypeScript project.
 *
 * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
 * the TypeScript language services.
 *
 * @publicApi
 */
export declare class TypeScriptServiceHost implements LanguageServiceHost {
    private readonly host;
    private readonly tsLS;
    private readonly summaryResolver;
    private readonly reflectorHost;
    private readonly staticSymbolResolver;
    private readonly staticSymbolCache;
    private readonly fileToComponent;
    private readonly collectedErrors;
    private readonly fileVersions;
    private lastProgram;
    private templateReferences;
    private analyzedModules;
    private _resolver;
    private _reflector;
    constructor(host: ts.LanguageServiceHost, tsLS: ts.LanguageService);
    private readonly resolver;
    getTemplateReferences(): string[];
    /**
     * Get the Angular template in the file, if any. If TS file is provided then
     * return the inline template, otherwise return the external template.
     * @param fileName Either TS or HTML file
     * @param position Only used if file is TS
     */
    getTemplateAt(fileName: string, position: number): TemplateSource | undefined;
    /**
     * Checks whether the program has changed and returns all analyzed modules.
     * If program has changed, invalidate all caches and update fileToComponent
     * and templateReferences.
     * In addition to returning information about NgModules, this method plays the
     * same role as 'synchronizeHostData' in tsserver.
     */
    getAnalyzedModules(): NgAnalyzedModules;
    getTemplates(fileName: string): TemplateSource[];
    getDeclarations(fileName: string): Declarations;
    getSourceFile(fileName: string): ts.SourceFile | undefined;
    private readonly program;
    /**
     * Checks whether the program has changed, and invalidate caches if it has.
     * Returns true if modules are up-to-date, false otherwise.
     * This should only be called by getAnalyzedModules().
     */
    private upToDate;
    /**
     * Return the template source given the Class declaration node for the template.
     * @param fileName Name of the file that contains the template. Could be TS or HTML.
     * @param source Source text of the template.
     * @param span Source span of the template.
     * @param classSymbol Angular symbol for the class declaration.
     * @param declaration TypeScript symbol for the class declaration.
     * @param node If file is TS this is the template node, otherwise it's the class declaration node.
     * @param sourceFile Source file of the class declaration.
     */
    private getSourceFromDeclaration;
    /**
     * Return the TemplateSource for the inline template.
     * @param fileName TS file that contains the template
     * @param node Potential template node
     */
    private getSourceFromNode;
    /**
     * Return the TemplateSource for the template associated with the classSymbol.
     * @param fileName Template file (HTML)
     * @param classSymbol
     */
    private getSourceFromType;
    private collectError;
    private readonly reflector;
    private getTemplateClassFromStaticSymbol;
    private static missingTemplate;
    /**
     * Given a template string node, see if it is an Angular template string, and if so return the
     * containing class.
     */
    private getTemplateClassDeclFromNode;
    private getCollectedErrors;
    private getDeclarationFromNode;
    private stringOf;
    private findNode;
    getTemplateAstAtPosition(fileName: string, position: number): TemplateInfo | undefined;
    getTemplateAst(template: TemplateSource, contextFile: string): AstResult;
}
