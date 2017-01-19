/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AotSummaryResolver, CompilerConfig, StaticReflector, StaticSymbolCache, StaticSymbolResolver, componentModuleUrl, createOfflineCompileUrlResolver } from '@angular/compiler';
import { analyzeNgModules, extractProgramSymbols } from '@angular/compiler/src/aot/compiler';
import { DirectiveNormalizer } from '@angular/compiler/src/directive_normalizer';
import { DirectiveResolver } from '@angular/compiler/src/directive_resolver';
import { CompileMetadataResolver } from '@angular/compiler/src/metadata_resolver';
import { HtmlParser } from '@angular/compiler/src/ml_parser/html_parser';
import { DEFAULT_INTERPOLATION_CONFIG } from '@angular/compiler/src/ml_parser/interpolation_config';
import { ParseTreeResult } from '@angular/compiler/src/ml_parser/parser';
import { NgModuleResolver } from '@angular/compiler/src/ng_module_resolver';
import { PipeResolver } from '@angular/compiler/src/pipe_resolver';
import { ResourceLoader } from '@angular/compiler/src/resource_loader';
import { DomElementSchemaRegistry } from '@angular/compiler/src/schema/dom_element_schema_registry';
import { SummaryResolver } from '@angular/compiler/src/summary_resolver';
import { ViewEncapsulation } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { createLanguageService } from './language_service';
import { ReflectorHost } from './reflector_host';
import { BuiltinType } from './types';
// In TypeScript 2.1 these flags moved
// These helpers work for both 2.0 and 2.1.
const isPrivate = ts.ModifierFlags ?
    ((node) => !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private)) :
    ((node) => !!(node.flags & ts.NodeFlags.Private));
const isReferenceType = ts.ObjectFlags ?
    ((type) => !!(type.flags & ts.TypeFlags.Object &&
        type.objectFlags & ts.ObjectFlags.Reference)) :
    ((type) => !!(type.flags & ts.TypeFlags.Reference));
/**
 * Create a `LanguageServiceHost`
 */
export function createLanguageServiceFromTypescript(host, service) {
    const ngHost = new TypeScriptServiceHost(host, service);
    const ngServer = createLanguageService(ngHost);
    ngHost.setSite(ngServer);
    return ngServer;
}
/**
 * The language service never needs the normalized versions of the metadata. To avoid parsing
 * the content and resolving references, return an empty file. This also allows normalizing
 * template that are syntatically incorrect which is required to provide completions in
 * syntatically incorrect templates.
 */
export class DummyHtmlParser extends HtmlParser {
    constructor() {
        super();
    }
    parse(source, url, parseExpansionForms = false, interpolationConfig = DEFAULT_INTERPOLATION_CONFIG) {
        return new ParseTreeResult([], []);
    }
}
/**
 * Avoid loading resources in the language servcie by using a dummy loader.
 */
export class DummyResourceLoader extends ResourceLoader {
    get(url) { return Promise.resolve(''); }
}
/**
 * An implemntation of a `LanguageSerivceHost` for a TypeScript project.
 *
 * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
 * the TypeScript language services.
 *
 * @expermental
 */
export class TypeScriptServiceHost {
    constructor(host, tsService) {
        this.host = host;
        this.tsService = tsService;
        this._staticSymbolCache = new StaticSymbolCache();
        this._typeCache = [];
        this.modulesOutOfDate = true;
    }
    setSite(service) { this.service = service; }
    /**
     * Angular LanguageServiceHost implementation
     */
    get resolver() {
        this.validate();
        let result = this._resolver;
        if (!result) {
            const moduleResolver = new NgModuleResolver(this.reflector);
            const directiveResolver = new DirectiveResolver(this.reflector);
            const pipeResolver = new PipeResolver(this.reflector);
            const elementSchemaRegistry = new DomElementSchemaRegistry();
            const resourceLoader = new DummyResourceLoader();
            const urlResolver = createOfflineCompileUrlResolver();
            const htmlParser = new DummyHtmlParser();
            // This tracks the CompileConfig in codegen.ts. Currently these options
            // are hard-coded except for genDebugInfo which is not applicable as we
            // never generate code.
            const config = new CompilerConfig({
                genDebugInfo: false,
                defaultEncapsulation: ViewEncapsulation.Emulated,
                logBindingUpdate: false,
                useJit: false
            });
            const directiveNormalizer = new DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
            result = this._resolver = new CompileMetadataResolver(moduleResolver, directiveResolver, pipeResolver, new SummaryResolver(), elementSchemaRegistry, directiveNormalizer, this._staticSymbolCache, this.reflector, (error, type) => this.collectError(error, type && type.filePath));
        }
        return result;
    }
    getTemplateReferences() {
        this.ensureTemplateMap();
        return this.templateReferences;
    }
    getTemplateAt(fileName, position) {
        let sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            this.context = sourceFile.fileName;
            let node = this.findNode(sourceFile, position);
            if (node) {
                return this.getSourceFromNode(fileName, this.host.getScriptVersion(sourceFile.fileName), node);
            }
        }
        else {
            this.ensureTemplateMap();
            // TODO: Cannocalize the file?
            const componentType = this.fileToComponent.get(fileName);
            if (componentType) {
                return this.getSourceFromType(fileName, this.host.getScriptVersion(fileName), componentType);
            }
        }
    }
    getAnalyzedModules() {
        this.validate();
        return this.ensureAnalyzedModules();
    }
    ensureAnalyzedModules() {
        let analyzedModules = this.analyzedModules;
        if (!analyzedModules) {
            const analyzeHost = { isSourceFile(filePath) { return true; } };
            const programSymbols = extractProgramSymbols(this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), analyzeHost);
            analyzedModules = this.analyzedModules =
                analyzeNgModules(programSymbols, analyzeHost, this.resolver);
        }
        return analyzedModules;
    }
    getTemplates(fileName) {
        this.ensureTemplateMap();
        const componentType = this.fileToComponent.get(fileName);
        if (componentType) {
            const templateSource = this.getTemplateAt(fileName, 0);
            if (templateSource) {
                return [templateSource];
            }
        }
        else {
            let version = this.host.getScriptVersion(fileName);
            let result = [];
            // Find each template string in the file
            let visit = (child) => {
                let templateSource = this.getSourceFromNode(fileName, version, child);
                if (templateSource) {
                    result.push(templateSource);
                }
                else {
                    ts.forEachChild(child, visit);
                }
            };
            let sourceFile = this.getSourceFile(fileName);
            if (sourceFile) {
                this.context = sourceFile.path;
                ts.forEachChild(sourceFile, visit);
            }
            return result.length ? result : undefined;
        }
    }
    getDeclarations(fileName) {
        const result = [];
        const sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            let visit = (child) => {
                let declaration = this.getDeclarationFromNode(sourceFile, child);
                if (declaration) {
                    result.push(declaration);
                }
                else {
                    ts.forEachChild(child, visit);
                }
            };
            ts.forEachChild(sourceFile, visit);
        }
        return result;
    }
    getSourceFile(fileName) {
        return this.tsService.getProgram().getSourceFile(fileName);
    }
    updateAnalyzedModules() {
        this.validate();
        if (this.modulesOutOfDate) {
            this.analyzedModules = null;
            this._reflector = null;
            this._staticSymbolResolver = null;
            this.templateReferences = null;
            this.fileToComponent = null;
            this.ensureAnalyzedModules();
            this.modulesOutOfDate = false;
        }
    }
    get program() { return this.tsService.getProgram(); }
    get checker() {
        let checker = this._checker;
        if (!checker) {
            checker = this._checker = this.program.getTypeChecker();
        }
        return checker;
    }
    validate() {
        const program = this.program;
        if (this.lastProgram != program) {
            this.clearCaches();
            this.lastProgram = program;
        }
    }
    clearCaches() {
        this._checker = null;
        this._typeCache = [];
        this._resolver = null;
        this.collectedErrors = null;
        this.modulesOutOfDate = true;
    }
    ensureTemplateMap() {
        if (!this.fileToComponent || !this.templateReferences) {
            const fileToComponent = new Map();
            const templateReference = [];
            const ngModuleSummary = this.getAnalyzedModules();
            const urlResolver = createOfflineCompileUrlResolver();
            for (const module of ngModuleSummary.ngModules) {
                for (const directive of module.declaredDirectives) {
                    const { metadata, annotation } = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference);
                    if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                        const templateName = urlResolver.resolve(componentModuleUrl(this.reflector, directive.reference, annotation), metadata.template.templateUrl);
                        fileToComponent.set(templateName, directive.reference);
                        templateReference.push(templateName);
                    }
                }
            }
            this.fileToComponent = fileToComponent;
            this.templateReferences = templateReference;
        }
    }
    getSourceFromDeclaration(fileName, version, source, span, type, declaration, node, sourceFile) {
        let queryCache = undefined;
        const t = this;
        if (declaration) {
            return {
                version,
                source,
                span,
                type,
                get members() {
                    const checker = t.checker;
                    const program = t.program;
                    const type = checker.getTypeAtLocation(declaration);
                    return new TypeWrapper(type, { node, program, checker }).members();
                },
                get query() {
                    if (!queryCache) {
                        queryCache = new TypeScriptSymbolQuery(t.program, t.checker, sourceFile, () => {
                            const pipes = t.service.getPipesAt(fileName, node.getStart());
                            const checker = t.checker;
                            const program = t.program;
                            return new PipesTable(pipes, { node, program, checker });
                        });
                    }
                    return queryCache;
                }
            };
        }
    }
    getSourceFromNode(fileName, version, node) {
        let result = undefined;
        const t = this;
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.StringLiteral:
                let [declaration, decorator] = this.getTemplateClassDeclFromNode(node);
                let queryCache = undefined;
                if (declaration && declaration.name) {
                    const sourceFile = this.getSourceFile(fileName);
                    return this.getSourceFromDeclaration(fileName, version, this.stringOf(node), shrink(spanOf(node)), this.reflector.getStaticSymbol(sourceFile.fileName, declaration.name.text), declaration, node, sourceFile);
                }
                break;
        }
        return result;
    }
    getSourceFromType(fileName, version, type) {
        let result = undefined;
        const declaration = this.getTemplateClassFromStaticSymbol(type);
        if (declaration) {
            const snapshot = this.host.getScriptSnapshot(fileName);
            const source = snapshot.getText(0, snapshot.getLength());
            result = this.getSourceFromDeclaration(fileName, version, source, { start: 0, end: source.length }, type, declaration, declaration, declaration.getSourceFile());
        }
        return result;
    }
    get reflectorHost() {
        let result = this._reflectorHost;
        if (!result) {
            if (!this.context) {
                // Make up a context by finding the first script and using that as the base dir.
                this.context = this.host.getScriptFileNames()[0];
            }
            // Use the file context's directory as the base directory.
            // The host's getCurrentDirectory() is not reliable as it is always "" in
            // tsserver. We don't need the exact base directory, just one that contains
            // a source file.
            const source = this.tsService.getProgram().getSourceFile(this.context);
            if (!source) {
                throw new Error('Internal error: no context could be determined');
            }
            const tsConfigPath = findTsConfig(source.fileName);
            const basePath = path.dirname(tsConfigPath || this.context);
            result = this._reflectorHost = new ReflectorHost(() => this.tsService.getProgram(), this.host, { basePath, genDir: basePath });
        }
        return result;
    }
    collectError(error, filePath) {
        let errorMap = this.collectedErrors;
        if (!errorMap) {
            errorMap = this.collectedErrors = new Map();
        }
        let errors = errorMap.get(filePath);
        if (!errors) {
            errors = [];
            this.collectedErrors.set(filePath, errors);
        }
        errors.push(error);
    }
    get staticSymbolResolver() {
        let result = this._staticSymbolResolver;
        if (!result) {
            const summaryResolver = new AotSummaryResolver({
                loadSummary(filePath) { return null; },
                isSourceFile(sourceFilePath) { return true; },
                getOutputFileName(sourceFilePath) { return null; }
            }, this._staticSymbolCache);
            result = this._staticSymbolResolver = new StaticSymbolResolver(this.reflectorHost, this._staticSymbolCache, summaryResolver, (e, filePath) => this.collectError(e, filePath));
        }
        return result;
    }
    get reflector() {
        let result = this._reflector;
        if (!result) {
            result = this._reflector = new StaticReflector(this.staticSymbolResolver, [], [], (e, filePath) => this.collectError(e, filePath));
        }
        return result;
    }
    getTemplateClassFromStaticSymbol(type) {
        const source = this.getSourceFile(type.filePath);
        if (source) {
            const declarationNode = ts.forEachChild(source, child => {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDeclaration = child;
                    if (classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
            return declarationNode;
        }
        return undefined;
    }
    /**
     * Given a template string node, see if it is an Angular template string, and if so return the
     * containing class.
     */
    getTemplateClassDeclFromNode(currentToken) {
        // Verify we are in a 'template' property assignment, in an object literal, which is an call
        // arg, in a decorator
        let parentNode = currentToken.parent; // PropertyAssignment
        if (!parentNode) {
            return TypeScriptServiceHost.missingTemplate;
        }
        if (parentNode.kind !== ts.SyntaxKind.PropertyAssignment) {
            return TypeScriptServiceHost.missingTemplate;
        }
        else {
            // TODO: Is this different for a literal, i.e. a quoted property name like "template"?
            if (parentNode.name.text !== 'template') {
                return TypeScriptServiceHost.missingTemplate;
            }
        }
        parentNode = parentNode.parent; // ObjectLiteralExpression
        if (!parentNode || parentNode.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
            return TypeScriptServiceHost.missingTemplate;
        }
        parentNode = parentNode.parent; // CallExpression
        if (!parentNode || parentNode.kind !== ts.SyntaxKind.CallExpression) {
            return TypeScriptServiceHost.missingTemplate;
        }
        const callTarget = parentNode.expression;
        let decorator = parentNode.parent; // Decorator
        if (!decorator || decorator.kind !== ts.SyntaxKind.Decorator) {
            return TypeScriptServiceHost.missingTemplate;
        }
        let declaration = decorator.parent; // ClassDeclaration
        if (!declaration || declaration.kind !== ts.SyntaxKind.ClassDeclaration) {
            return TypeScriptServiceHost.missingTemplate;
        }
        return [declaration, callTarget];
    }
    getCollectedErrors(defaultSpan, sourceFile) {
        const errors = (this.collectedErrors && this.collectedErrors.get(sourceFile.fileName));
        return (errors && errors.map((e) => {
            return { message: e.message, span: spanAt(sourceFile, e.line, e.column) || defaultSpan };
        })) ||
            [];
    }
    getDeclarationFromNode(sourceFile, node) {
        if (node.kind == ts.SyntaxKind.ClassDeclaration && node.decorators &&
            node.name) {
            for (const decorator of node.decorators) {
                if (decorator.expression && decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                    const classDeclaration = node;
                    if (classDeclaration.name) {
                        const call = decorator.expression;
                        const target = call.expression;
                        const type = this.checker.getTypeAtLocation(target);
                        if (type) {
                            const staticSymbol = this._reflector.getStaticSymbol(sourceFile.fileName, classDeclaration.name.text);
                            try {
                                if (this.resolver.isDirective(staticSymbol)) {
                                    const { metadata } = this.resolver.getNonNormalizedDirectiveMetadata(staticSymbol);
                                    const declarationSpan = spanOf(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan,
                                        metadata,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                            catch (e) {
                                if (e.message) {
                                    this.collectError(e, sourceFile.fileName);
                                    const declarationSpan = spanOf(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    stringOf(node) {
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return node.text;
            case ts.SyntaxKind.StringLiteral:
                return node.text;
        }
    }
    findNode(sourceFile, position) {
        let _this = this;
        function find(node) {
            if (position >= node.getStart() && position < node.getEnd()) {
                return ts.forEachChild(node, find) || node;
            }
        }
        return find(sourceFile);
    }
    findLiteralType(kind, context) {
        const checker = this.checker;
        let type;
        switch (kind) {
            case BuiltinType.Any:
                type = checker.getTypeAtLocation({
                    kind: ts.SyntaxKind.AsExpression,
                    expression: { kind: ts.SyntaxKind.TrueKeyword },
                    type: { kind: ts.SyntaxKind.AnyKeyword }
                });
                break;
            case BuiltinType.Boolean:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.TrueKeyword });
                break;
            case BuiltinType.Null:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.NullKeyword });
                break;
            case BuiltinType.Number:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.NumericLiteral });
                break;
            case BuiltinType.String:
                type =
                    checker.getTypeAtLocation({ kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral });
                break;
            case BuiltinType.Undefined:
                type = checker.getTypeAtLocation({ kind: ts.SyntaxKind.VoidExpression });
                break;
            default:
                throw new Error(`Internal error, unhandled literal kind ${kind}:${BuiltinType[kind]}`);
        }
        return new TypeWrapper(type, context);
    }
}
TypeScriptServiceHost.missingTemplate = [];
class TypeScriptSymbolQuery {
    constructor(program, checker, source, fetchPipes) {
        this.program = program;
        this.checker = checker;
        this.source = source;
        this.fetchPipes = fetchPipes;
        this.typeCache = new Map();
    }
    getTypeKind(symbol) { return typeKindOf(this.getTsTypeOf(symbol)); }
    getBuiltinType(kind) {
        // TODO: Replace with typeChecker API when available.
        let result = this.typeCache.get(kind);
        if (!result) {
            const type = getBuiltinTypeFromTs(kind, { checker: this.checker, node: this.source, program: this.program });
            result =
                new TypeWrapper(type, { program: this.program, checker: this.checker, node: this.source });
            this.typeCache.set(kind, result);
        }
        return result;
    }
    getTypeUnion(...types) {
        // TODO: Replace with typeChecker API when available
        const checker = this.checker;
        // No API exists so the cheat is to just return the last type any if no types are given.
        return types.length ? types[types.length - 1] : this.getBuiltinType(BuiltinType.Any);
    }
    getArrayType(type) {
        // TODO: Replace with typeChecker API when available
        return this.getBuiltinType(BuiltinType.Any);
    }
    getElementType(type) {
        if (type instanceof TypeWrapper) {
            const elementType = getTypeParameterOf(type.tsType, 'Array');
            if (elementType) {
                return new TypeWrapper(elementType, type.context);
            }
        }
    }
    getNonNullableType(symbol) {
        // TODO: Replace with typeChecker API when available;
        return symbol;
    }
    getPipes() {
        let result = this.pipesCache;
        if (!result) {
            result = this.pipesCache = this.fetchPipes();
        }
        return result;
    }
    getTemplateContext(type) {
        const context = { node: this.source, program: this.program, checker: this.checker };
        const typeSymbol = findClassSymbolInContext(type, context);
        if (typeSymbol) {
            const contextType = this.getTemplateRefContextType(typeSymbol);
            if (contextType)
                return new SymbolWrapper(contextType, context).members();
        }
    }
    getTypeSymbol(type) {
        const context = { node: this.source, program: this.program, checker: this.checker };
        const typeSymbol = findClassSymbolInContext(type, context);
        return new SymbolWrapper(typeSymbol, context);
    }
    createSymbolTable(symbols) {
        const result = new MapSymbolTable();
        result.addAll(symbols.map(s => new DeclaredSymbol(s)));
        return result;
    }
    mergeSymbolTable(symbolTables) {
        const result = new MapSymbolTable();
        for (const symbolTable of symbolTables) {
            result.addAll(symbolTable.values());
        }
        return result;
    }
    getSpanAt(line, column) { return spanAt(this.source, line, column); }
    getTemplateRefContextType(type) {
        const constructor = type.members['__constructor'];
        if (constructor) {
            const constructorDeclaration = constructor.declarations[0];
            for (const parameter of constructorDeclaration.parameters) {
                const type = this.checker.getTypeAtLocation(parameter.type);
                if (type.symbol.name == 'TemplateRef' && isReferenceType(type)) {
                    const typeReference = type;
                    if (typeReference.typeArguments.length === 1) {
                        return typeReference.typeArguments[0].symbol;
                    }
                }
            }
            ;
        }
    }
    getTsTypeOf(symbol) {
        const type = this.getTypeWrapper(symbol);
        return type && type.tsType;
    }
    getTypeWrapper(symbol) {
        let type = undefined;
        if (symbol instanceof TypeWrapper) {
            type = symbol;
        }
        else if (symbol.type instanceof TypeWrapper) {
            type = symbol.type;
        }
        return type;
    }
}
function typeCallable(type) {
    const signatures = type.getCallSignatures();
    return signatures && signatures.length != 0;
}
function signaturesOf(type, context) {
    return type.getCallSignatures().map(s => new SignatureWrapper(s, context));
}
function selectSignature(type, context, types) {
    // TODO: Do a better job of selecting the right signature.
    const signatures = type.getCallSignatures();
    return signatures.length ? new SignatureWrapper(signatures[0], context) : undefined;
}
function toSymbolTable(symbols) {
    const result = {};
    for (const symbol of symbols) {
        result[symbol.name] = symbol;
    }
    return result;
}
function toSymbols(symbolTable, filter) {
    const result = [];
    const own = typeof symbolTable.hasOwnProperty === 'function' ?
            (name) => symbolTable.hasOwnProperty(name) :
            (name) => !!symbolTable[name];
    for (const name in symbolTable) {
        if (own(name) && (!filter || filter(symbolTable[name]))) {
            result.push(symbolTable[name]);
        }
    }
    return result;
}
class TypeWrapper {
    constructor(tsType, context) {
        this.tsType = tsType;
        this.context = context;
        if (!tsType) {
            throw Error('Internal: null type');
        }
    }
    get name() {
        const symbol = this.tsType.symbol;
        return (symbol && symbol.name) || '<anonymous>';
    }
    get kind() { return 'type'; }
    get language() { return 'typescript'; }
    get type() { return undefined; }
    get container() { return undefined; }
    get public() { return true; }
    get callable() { return typeCallable(this.tsType); }
    get definition() { return definitionFromTsSymbol(this.tsType.getSymbol()); }
    members() {
        return new SymbolTableWrapper(this.tsType.getProperties(), this.context);
    }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        return selectSignature(this.tsType, this.context, types);
    }
    indexed(argument) { return undefined; }
}
class SymbolWrapper {
    constructor(symbol, context) {
        this.symbol = symbol;
        this.context = context;
    }
    get name() { return this.symbol.name; }
    get kind() { return this.callable ? 'method' : 'property'; }
    get language() { return 'typescript'; }
    get type() { return new TypeWrapper(this.tsType, this.context); }
    get container() { return getContainerOf(this.symbol, this.context); }
    get public() {
        // Symbols that are not explicitly made private are public.
        return !isSymbolPrivate(this.symbol);
    }
    get callable() { return typeCallable(this.tsType); }
    get definition() { return definitionFromTsSymbol(this.symbol); }
    members() { return new SymbolTableWrapper(this.symbol.members, this.context); }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        return selectSignature(this.tsType, this.context, types);
    }
    indexed(argument) { return undefined; }
    get tsType() {
        let type = this._tsType;
        if (!type) {
            type = this._tsType =
                this.context.checker.getTypeOfSymbolAtLocation(this.symbol, this.context.node);
        }
        return type;
    }
}
class DeclaredSymbol {
    constructor(declaration) {
        this.declaration = declaration;
    }
    get name() { return this.declaration.name; }
    get kind() { return this.declaration.kind; }
    get language() { return 'ng-template'; }
    get container() { return undefined; }
    get type() { return this.declaration.type; }
    get callable() { return this.declaration.type.callable; }
    get public() { return true; }
    get definition() { return this.declaration.definition; }
    members() { return this.declaration.type.members(); }
    signatures() { return this.declaration.type.signatures(); }
    selectSignature(types) {
        return this.declaration.type.selectSignature(types);
    }
    indexed(argument) { return undefined; }
}
class SignatureWrapper {
    constructor(signature, context) {
        this.signature = signature;
        this.context = context;
    }
    get arguments() {
        return new SymbolTableWrapper(this.signature.getParameters(), this.context);
    }
    get result() { return new TypeWrapper(this.signature.getReturnType(), this.context); }
}
class SignatureResultOverride {
    constructor(signature, resultType) {
        this.signature = signature;
        this.resultType = resultType;
    }
    get arguments() { return this.signature.arguments; }
    get result() { return this.resultType; }
}
class SymbolTableWrapper {
    constructor(symbols, context, filter) {
        this.context = context;
        if (Array.isArray(symbols)) {
            this.symbols = filter ? symbols.filter(filter) : symbols;
            this.symbolTable = toSymbolTable(symbols);
        }
        else {
            this.symbols = toSymbols(symbols, filter);
            this.symbolTable = filter ? toSymbolTable(this.symbols) : symbols;
        }
    }
    get size() { return this.symbols.length; }
    get(key) {
        const symbol = this.symbolTable[key];
        return symbol ? new SymbolWrapper(symbol, this.context) : undefined;
    }
    has(key) { return this.symbolTable[key] != null; }
    values() { return this.symbols.map(s => new SymbolWrapper(s, this.context)); }
}
class MapSymbolTable {
    constructor() {
        this.map = new Map();
        this._values = [];
    }
    get size() { return this.map.size; }
    get(key) { return this.map.get(key); }
    add(symbol) {
        if (this.map.has(symbol.name)) {
            const previous = this.map.get(symbol.name);
            this._values[this._values.indexOf(previous)] = symbol;
        }
        this.map.set(symbol.name, symbol);
        this._values.push(symbol);
    }
    addAll(symbols) {
        for (const symbol of symbols) {
            this.add(symbol);
        }
    }
    has(key) { return this.map.has(key); }
    values() {
        // Switch to this.map.values once iterables are supported by the target language.
        return this._values;
    }
}
class PipesTable {
    constructor(pipes, context) {
        this.pipes = pipes;
        this.context = context;
    }
    get size() { return this.pipes.length; }
    get(key) {
        const pipe = this.pipes.find(pipe => pipe.name == key);
        if (pipe) {
            return new PipeSymbol(pipe, this.context);
        }
    }
    has(key) { return this.pipes.find(pipe => pipe.name == key) != null; }
    values() { return this.pipes.map(pipe => new PipeSymbol(pipe, this.context)); }
}
class PipeSymbol {
    constructor(pipe, context) {
        this.pipe = pipe;
        this.context = context;
    }
    get name() { return this.pipe.name; }
    get kind() { return 'pipe'; }
    get language() { return 'typescript'; }
    get type() { return new TypeWrapper(this.tsType, this.context); }
    get container() { return undefined; }
    get callable() { return true; }
    get public() { return true; }
    get definition() { return definitionFromTsSymbol(this.tsType.getSymbol()); }
    members() { return EmptyTable.instance; }
    signatures() { return signaturesOf(this.tsType, this.context); }
    selectSignature(types) {
        let signature = selectSignature(this.tsType, this.context, types);
        if (types.length == 1) {
            const parameterType = types[0];
            if (parameterType instanceof TypeWrapper) {
                let resultType = undefined;
                switch (this.name) {
                    case 'async':
                        switch (parameterType.name) {
                            case 'Observable':
                            case 'Promise':
                            case 'EventEmitter':
                                resultType = getTypeParameterOf(parameterType.tsType, parameterType.name);
                                break;
                        }
                        break;
                    case 'slice':
                        resultType = getTypeParameterOf(parameterType.tsType, 'Array');
                        break;
                }
                if (resultType) {
                    signature = new SignatureResultOverride(signature, new TypeWrapper(resultType, parameterType.context));
                }
            }
        }
        return signature;
    }
    indexed(argument) { return undefined; }
    get tsType() {
        let type = this._tsType;
        if (!type) {
            const classSymbol = this.findClassSymbol(this.pipe.symbol);
            if (classSymbol) {
                type = this._tsType = this.findTransformMethodType(classSymbol);
            }
            if (!type) {
                type = this._tsType = getBuiltinTypeFromTs(BuiltinType.Any, this.context);
            }
        }
        return type;
    }
    findClassSymbol(type) {
        return findClassSymbolInContext(type, this.context);
    }
    findTransformMethodType(classSymbol) {
        const transform = classSymbol.members['transform'];
        if (transform) {
            return this.context.checker.getTypeOfSymbolAtLocation(transform, this.context.node);
        }
    }
}
function findClassSymbolInContext(type, context) {
    const sourceFile = context.program.getSourceFile(type.filePath);
    if (sourceFile) {
        const moduleSymbol = sourceFile.module || sourceFile.symbol;
        const exports = context.checker.getExportsOfModule(moduleSymbol);
        return (exports || []).find(symbol => symbol.name == type.name);
    }
}
class EmptyTable {
    get size() { return 0; }
    get(key) { return undefined; }
    has(key) { return false; }
    values() { return []; }
}
EmptyTable.instance = new EmptyTable();
function findTsConfig(fileName) {
    let dir = path.dirname(fileName);
    while (fs.existsSync(dir)) {
        const candidate = path.join(dir, 'tsconfig.json');
        if (fs.existsSync(candidate))
            return candidate;
        dir = path.dirname(dir);
    }
}
function isBindingPattern(node) {
    return !!node && (node.kind === ts.SyntaxKind.ArrayBindingPattern ||
        node.kind === ts.SyntaxKind.ObjectBindingPattern);
}
function walkUpBindingElementsAndPatterns(node) {
    while (node && (node.kind === ts.SyntaxKind.BindingElement || isBindingPattern(node))) {
        node = node.parent;
    }
    return node;
}
function getCombinedNodeFlags(node) {
    node = walkUpBindingElementsAndPatterns(node);
    let flags = node.flags;
    if (node.kind === ts.SyntaxKind.VariableDeclaration) {
        node = node.parent;
    }
    if (node && node.kind === ts.SyntaxKind.VariableDeclarationList) {
        flags |= node.flags;
        node = node.parent;
    }
    if (node && node.kind === ts.SyntaxKind.VariableStatement) {
        flags |= node.flags;
    }
    return flags;
}
function isSymbolPrivate(s) {
    return s.valueDeclaration && isPrivate(s.valueDeclaration);
}
function getBuiltinTypeFromTs(kind, context) {
    let type;
    const checker = context.checker;
    const node = context.node;
    switch (kind) {
        case BuiltinType.Any:
            type = checker.getTypeAtLocation(setParents({
                kind: ts.SyntaxKind.AsExpression,
                expression: { kind: ts.SyntaxKind.TrueKeyword },
                type: { kind: ts.SyntaxKind.AnyKeyword }
            }, node));
            break;
        case BuiltinType.Boolean:
            type =
                checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.TrueKeyword }, node));
            break;
        case BuiltinType.Null:
            type =
                checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NullKeyword }, node));
            break;
        case BuiltinType.Number:
            const numeric = { kind: ts.SyntaxKind.NumericLiteral };
            setParents({ kind: ts.SyntaxKind.ExpressionStatement, expression: numeric }, node);
            type = checker.getTypeAtLocation(numeric);
            break;
        case BuiltinType.String:
            type = checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral }, node));
            break;
        case BuiltinType.Undefined:
            type = checker.getTypeAtLocation(setParents({
                kind: ts.SyntaxKind.VoidExpression,
                expression: { kind: ts.SyntaxKind.NumericLiteral }
            }, node));
            break;
        default:
            throw new Error(`Internal error, unhandled literal kind ${kind}:${BuiltinType[kind]}`);
    }
    return type;
}
function setParents(node, parent) {
    node.parent = parent;
    ts.forEachChild(node, child => setParents(child, node));
    return node;
}
function spanOf(node) {
    return { start: node.getStart(), end: node.getEnd() };
}
function shrink(span, offset) {
    if (offset == null)
        offset = 1;
    return { start: span.start + offset, end: span.end - offset };
}
function spanAt(sourceFile, line, column) {
    if (line != null && column != null) {
        const position = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
        const findChild = function findChild(node) {
            if (node.kind > ts.SyntaxKind.LastToken && node.pos <= position && node.end > position) {
                const betterNode = ts.forEachChild(node, findChild);
                return betterNode || node;
            }
        };
        const node = ts.forEachChild(sourceFile, findChild);
        if (node) {
            return { start: node.getStart(), end: node.getEnd() };
        }
    }
}
function definitionFromTsSymbol(symbol) {
    const declarations = symbol.declarations;
    if (declarations) {
        return declarations.map(declaration => {
            const sourceFile = declaration.getSourceFile();
            return {
                fileName: sourceFile.fileName,
                span: { start: declaration.getStart(), end: declaration.getEnd() }
            };
        });
    }
}
function parentDeclarationOf(node) {
    while (node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
                return node;
            case ts.SyntaxKind.SourceFile:
                return null;
        }
        node = node.parent;
    }
}
function getContainerOf(symbol, context) {
    if (symbol.getFlags() & ts.SymbolFlags.ClassMember && symbol.declarations) {
        for (const declaration of symbol.declarations) {
            const parent = parentDeclarationOf(declaration);
            if (parent) {
                const type = context.checker.getTypeAtLocation(parent);
                if (type) {
                    return new TypeWrapper(type, context);
                }
            }
        }
    }
}
function getTypeParameterOf(type, name) {
    if (type && type.symbol && type.symbol.name == name) {
        const typeArguments = type.typeArguments;
        if (typeArguments && typeArguments.length <= 1) {
            return typeArguments[0];
        }
    }
}
function typeKindOf(type) {
    if (type) {
        if (type.flags & ts.TypeFlags.Any) {
            return BuiltinType.Any;
        }
        else if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral)) {
            return BuiltinType.String;
        }
        else if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike)) {
            return BuiltinType.Number;
        }
        else if (type.flags & (ts.TypeFlags.Undefined)) {
            return BuiltinType.Undefined;
        }
        else if (type.flags & (ts.TypeFlags.Null)) {
            return BuiltinType.Null;
        }
        else if (type.flags & ts.TypeFlags.Union) {
            // If all the constituent types of a union are the same kind, it is also that kind.
            let candidate;
            const unionType = type;
            if (unionType.types.length > 0) {
                candidate = typeKindOf(unionType.types[0]);
                for (const subType of unionType.types) {
                    if (candidate != typeKindOf(subType)) {
                        return BuiltinType.Other;
                    }
                }
            }
            return candidate;
        }
    }
    return BuiltinType.Other;
}
//# sourceMappingURL=typescript_host.js.map