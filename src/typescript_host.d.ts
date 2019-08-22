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
import { AstResult } from './common';
import { Declaration, Diagnostic, LanguageService, LanguageServiceHost, TemplateSource } from './types';
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
    private readonly reflector;
    private readonly resolver;
    private readonly staticSymbolCache;
    private readonly fileToComponent;
    private readonly collectedErrors;
    private readonly fileVersions;
    private lastProgram;
    private templateReferences;
    private analyzedModules;
    constructor(host: ts.LanguageServiceHost, tsLS: ts.LanguageService);
    /**
     * Creates a new metadata resolver. This should only be called once.
     */
    private createMetadataResolver;
    getTemplateReferences(): string[];
    /**
     * Checks whether the program has changed and returns all analyzed modules.
     * If program has changed, invalidate all caches and update fileToComponent
     * and templateReferences.
     * In addition to returning information about NgModules, this method plays the
     * same role as 'synchronizeHostData' in tsserver.
     */
    getAnalyzedModules(): NgAnalyzedModules;
    /**
     * Find all templates in the specified `file`.
     * @param fileName TS or HTML file
     */
    getTemplates(fileName: string): TemplateSource[];
    /**
     * Return metadata about all class declarations in the file that are Angular
     * directives. Potential matches are `@NgModule`, `@Component`, `@Directive`,
     * `@Pipes`, etc. class declarations.
     *
     * @param fileName TS file
     */
    getDeclarations(fileName: string): Declaration[];
    getSourceFile(fileName: string): ts.SourceFile | undefined;
    readonly program: ts.Program;
    /**
     * Checks whether the program has changed, and invalidate caches if it has.
     * Returns true if modules are up-to-date, false otherwise.
     * This should only be called by getAnalyzedModules().
     */
    private upToDate;
    /**
     * Return the TemplateSource if `node` is a template node.
     *
     * For example,
     *
     * @Component({
     *   template: '<div></div>' <-- template node
     * })
     * class AppComponent {}
     *           ^---- class declaration node
     *
     * @param node Potential template node
     */
    private getInternalTemplate;
    /**
     * Return the external template for `fileName`.
     * @param fileName HTML file
     */
    private getExternalTemplate;
    private collectError;
    private getCollectedErrors;
    /**
     * Return the parsed template for the template at the specified `position`.
     * @param fileName TS or HTML file
     * @param position Position of the template in the TS file, otherwise ignored.
     */
    getTemplateAstAtPosition(fileName: string, position: number): AstResult | undefined;
    /**
     * Find the NgModule which the directive associated with the `classSymbol`
     * belongs to, then return its schema and transitive directives and pipes.
     * @param classSymbol Angular Symbol that defines a directive
     */
    private getModuleMetadataForDirective;
    /**
     * Parse the `template` and return its AST if there's no error. Otherwise
     * return a Diagnostic message.
     * @param template template to be parsed
     */
    getTemplateAst(template: TemplateSource): AstResult | Diagnostic;
}
