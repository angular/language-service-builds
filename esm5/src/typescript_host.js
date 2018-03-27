/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { AotSummaryResolver, CompileMetadataResolver, CompilerConfig, DEFAULT_INTERPOLATION_CONFIG, DirectiveNormalizer, DirectiveResolver, DomElementSchemaRegistry, HtmlParser, JitSummaryResolver, NgModuleResolver, ParseTreeResult, PipeResolver, ResourceLoader, StaticReflector, StaticSymbolCache, StaticSymbolResolver, analyzeNgModules, createOfflineCompileUrlResolver, isFormattedError } from '@angular/compiler';
import { getClassMembersFromDeclaration, getPipesTable, getSymbolQuery } from '@angular/compiler-cli/src/language_services';
import { ViewEncapsulation, ɵConsole as Console } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { createLanguageService } from './language_service';
import { ReflectorHost } from './reflector_host';
/**
 * Create a `LanguageServiceHost`
 */
export function createLanguageServiceFromTypescript(host, service) {
    var ngHost = new TypeScriptServiceHost(host, service);
    var ngServer = createLanguageService(ngHost);
    ngHost.setSite(ngServer);
    return ngServer;
}
/**
 * The language service never needs the normalized versions of the metadata. To avoid parsing
 * the content and resolving references, return an empty file. This also allows normalizing
 * template that are syntatically incorrect which is required to provide completions in
 * syntactically incorrect templates.
 */
var DummyHtmlParser = /** @class */ (function (_super) {
    tslib_1.__extends(DummyHtmlParser, _super);
    function DummyHtmlParser() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DummyHtmlParser.prototype.parse = function (source, url, parseExpansionForms, interpolationConfig) {
        if (parseExpansionForms === void 0) { parseExpansionForms = false; }
        if (interpolationConfig === void 0) { interpolationConfig = DEFAULT_INTERPOLATION_CONFIG; }
        return new ParseTreeResult([], []);
    };
    return DummyHtmlParser;
}(HtmlParser));
export { DummyHtmlParser };
/**
 * Avoid loading resources in the language servcie by using a dummy loader.
 */
var DummyResourceLoader = /** @class */ (function (_super) {
    tslib_1.__extends(DummyResourceLoader, _super);
    function DummyResourceLoader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DummyResourceLoader.prototype.get = function (url) { return Promise.resolve(''); };
    return DummyResourceLoader;
}(ResourceLoader));
export { DummyResourceLoader };
/**
 * An implemntation of a `LanguageServiceHost` for a TypeScript project.
 *
 * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
 * the TypeScript language services.
 *
 * @experimental
 */
var TypeScriptServiceHost = /** @class */ (function () {
    function TypeScriptServiceHost(host, tsService) {
        this.host = host;
        this.tsService = tsService;
        this._staticSymbolCache = new StaticSymbolCache();
        this._typeCache = [];
        this.modulesOutOfDate = true;
        this.fileVersions = new Map();
    }
    TypeScriptServiceHost.prototype.setSite = function (service) { this.service = service; };
    Object.defineProperty(TypeScriptServiceHost.prototype, "resolver", {
        /**
         * Angular LanguageServiceHost implementation
         */
        get: function () {
            var _this = this;
            this.validate();
            var result = this._resolver;
            if (!result) {
                var moduleResolver = new NgModuleResolver(this.reflector);
                var directiveResolver = new DirectiveResolver(this.reflector);
                var pipeResolver = new PipeResolver(this.reflector);
                var elementSchemaRegistry = new DomElementSchemaRegistry();
                var resourceLoader = new DummyResourceLoader();
                var urlResolver = createOfflineCompileUrlResolver();
                var htmlParser = new DummyHtmlParser();
                // This tracks the CompileConfig in codegen.ts. Currently these options
                // are hard-coded.
                var config = new CompilerConfig({ defaultEncapsulation: ViewEncapsulation.Emulated, useJit: false });
                var directiveNormalizer = new DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
                result = this._resolver = new CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new Console(), this._staticSymbolCache, this.reflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceHost.prototype.getTemplateReferences = function () {
        this.ensureTemplateMap();
        return this.templateReferences || [];
    };
    TypeScriptServiceHost.prototype.getTemplateAt = function (fileName, position) {
        var sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            this.context = sourceFile.fileName;
            var node = this.findNode(sourceFile, position);
            if (node) {
                return this.getSourceFromNode(fileName, this.host.getScriptVersion(sourceFile.fileName), node);
            }
        }
        else {
            this.ensureTemplateMap();
            // TODO: Cannocalize the file?
            var componentType = this.fileToComponent.get(fileName);
            if (componentType) {
                return this.getSourceFromType(fileName, this.host.getScriptVersion(fileName), componentType);
            }
        }
        return undefined;
    };
    TypeScriptServiceHost.prototype.getAnalyzedModules = function () {
        this.updateAnalyzedModules();
        return this.ensureAnalyzedModules();
    };
    TypeScriptServiceHost.prototype.ensureAnalyzedModules = function () {
        var analyzedModules = this.analyzedModules;
        if (!analyzedModules) {
            if (this.host.getScriptFileNames().length === 0) {
                analyzedModules = {
                    files: [],
                    ngModuleByPipeOrDirective: new Map(),
                    ngModules: [],
                };
            }
            else {
                var analyzeHost = { isSourceFile: function (filePath) { return true; } };
                var programFiles = this.program.getSourceFiles().map(function (sf) { return sf.fileName; });
                analyzedModules =
                    analyzeNgModules(programFiles, analyzeHost, this.staticSymbolResolver, this.resolver);
            }
            this.analyzedModules = analyzedModules;
        }
        return analyzedModules;
    };
    TypeScriptServiceHost.prototype.getTemplates = function (fileName) {
        var _this = this;
        this.ensureTemplateMap();
        var componentType = this.fileToComponent.get(fileName);
        if (componentType) {
            var templateSource = this.getTemplateAt(fileName, 0);
            if (templateSource) {
                return [templateSource];
            }
        }
        else {
            var version_1 = this.host.getScriptVersion(fileName);
            var result_1 = [];
            // Find each template string in the file
            var visit_1 = function (child) {
                var templateSource = _this.getSourceFromNode(fileName, version_1, child);
                if (templateSource) {
                    result_1.push(templateSource);
                }
                else {
                    ts.forEachChild(child, visit_1);
                }
            };
            var sourceFile = this.getSourceFile(fileName);
            if (sourceFile) {
                this.context = sourceFile.path || sourceFile.fileName;
                ts.forEachChild(sourceFile, visit_1);
            }
            return result_1.length ? result_1 : undefined;
        }
    };
    TypeScriptServiceHost.prototype.getDeclarations = function (fileName) {
        var _this = this;
        var result = [];
        var sourceFile = this.getSourceFile(fileName);
        if (sourceFile) {
            var visit_2 = function (child) {
                var declaration = _this.getDeclarationFromNode(sourceFile, child);
                if (declaration) {
                    result.push(declaration);
                }
                else {
                    ts.forEachChild(child, visit_2);
                }
            };
            ts.forEachChild(sourceFile, visit_2);
        }
        return result;
    };
    TypeScriptServiceHost.prototype.getSourceFile = function (fileName) {
        return this.tsService.getProgram().getSourceFile(fileName);
    };
    TypeScriptServiceHost.prototype.updateAnalyzedModules = function () {
        this.validate();
        if (this.modulesOutOfDate) {
            this.analyzedModules = null;
            this._reflector = null;
            this.templateReferences = null;
            this.fileToComponent = null;
            this.ensureAnalyzedModules();
            this.modulesOutOfDate = false;
        }
    };
    Object.defineProperty(TypeScriptServiceHost.prototype, "program", {
        get: function () { return this.tsService.getProgram(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TypeScriptServiceHost.prototype, "checker", {
        get: function () {
            var checker = this._checker;
            if (!checker) {
                checker = this._checker = this.program.getTypeChecker();
            }
            return checker;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceHost.prototype.validate = function () {
        var _this = this;
        var program = this.program;
        if (this.lastProgram !== program) {
            // Invalidate file that have changed in the static symbol resolver
            var invalidateFile = function (fileName) {
                return _this._staticSymbolResolver.invalidateFile(fileName);
            };
            this.clearCaches();
            var seen_1 = new Set();
            for (var _i = 0, _a = this.program.getSourceFiles(); _i < _a.length; _i++) {
                var sourceFile = _a[_i];
                var fileName = sourceFile.fileName;
                seen_1.add(fileName);
                var version = this.host.getScriptVersion(fileName);
                var lastVersion = this.fileVersions.get(fileName);
                if (version != lastVersion) {
                    this.fileVersions.set(fileName, version);
                    if (this._staticSymbolResolver) {
                        invalidateFile(fileName);
                    }
                }
            }
            // Remove file versions that are no longer in the file and invalidate them.
            var missing = Array.from(this.fileVersions.keys()).filter(function (f) { return !seen_1.has(f); });
            missing.forEach(function (f) { return _this.fileVersions.delete(f); });
            if (this._staticSymbolResolver) {
                missing.forEach(invalidateFile);
            }
            this.lastProgram = program;
        }
    };
    TypeScriptServiceHost.prototype.clearCaches = function () {
        this._checker = null;
        this._typeCache = [];
        this._resolver = null;
        this.collectedErrors = null;
        this.modulesOutOfDate = true;
    };
    TypeScriptServiceHost.prototype.ensureTemplateMap = function () {
        if (!this.fileToComponent || !this.templateReferences) {
            var fileToComponent = new Map();
            var templateReference = [];
            var ngModuleSummary = this.getAnalyzedModules();
            var urlResolver = createOfflineCompileUrlResolver();
            for (var _i = 0, _a = ngModuleSummary.ngModules; _i < _a.length; _i++) {
                var module_1 = _a[_i];
                for (var _b = 0, _c = module_1.declaredDirectives; _b < _c.length; _b++) {
                    var directive = _c[_b];
                    var metadata = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference).metadata;
                    if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                        var templateName = urlResolver.resolve(this.reflector.componentModuleUrl(directive.reference), metadata.template.templateUrl);
                        fileToComponent.set(templateName, directive.reference);
                        templateReference.push(templateName);
                    }
                }
            }
            this.fileToComponent = fileToComponent;
            this.templateReferences = templateReference;
        }
    };
    TypeScriptServiceHost.prototype.getSourceFromDeclaration = function (fileName, version, source, span, type, declaration, node, sourceFile) {
        var queryCache = undefined;
        var t = this;
        if (declaration) {
            return {
                version: version,
                source: source,
                span: span,
                type: type,
                get members() {
                    return getClassMembersFromDeclaration(t.program, t.checker, sourceFile, declaration);
                },
                get query() {
                    if (!queryCache) {
                        var pipes_1 = t.service.getPipesAt(fileName, node.getStart());
                        queryCache = getSymbolQuery(t.program, t.checker, sourceFile, function () { return getPipesTable(sourceFile, t.program, t.checker, pipes_1); });
                    }
                    return queryCache;
                }
            };
        }
    };
    TypeScriptServiceHost.prototype.getSourceFromNode = function (fileName, version, node) {
        var result = undefined;
        var t = this;
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.StringLiteral:
                var _a = this.getTemplateClassDeclFromNode(node), declaration = _a[0], decorator = _a[1];
                if (declaration && declaration.name) {
                    var sourceFile = this.getSourceFile(fileName);
                    if (sourceFile) {
                        return this.getSourceFromDeclaration(fileName, version, this.stringOf(node) || '', shrink(spanOf(node)), this.reflector.getStaticSymbol(sourceFile.fileName, declaration.name.text), declaration, node, sourceFile);
                    }
                }
                break;
        }
        return result;
    };
    TypeScriptServiceHost.prototype.getSourceFromType = function (fileName, version, type) {
        var result = undefined;
        var declaration = this.getTemplateClassFromStaticSymbol(type);
        if (declaration) {
            var snapshot = this.host.getScriptSnapshot(fileName);
            if (snapshot) {
                var source = snapshot.getText(0, snapshot.getLength());
                result = this.getSourceFromDeclaration(fileName, version, source, { start: 0, end: source.length }, type, declaration, declaration, declaration.getSourceFile());
            }
        }
        return result;
    };
    Object.defineProperty(TypeScriptServiceHost.prototype, "reflectorHost", {
        get: function () {
            var _this = this;
            var result = this._reflectorHost;
            if (!result) {
                if (!this.context) {
                    // Make up a context by finding the first script and using that as the base dir.
                    var scriptFileNames = this.host.getScriptFileNames();
                    if (0 === scriptFileNames.length) {
                        throw new Error('Internal error: no script file names found');
                    }
                    this.context = scriptFileNames[0];
                }
                // Use the file context's directory as the base directory.
                // The host's getCurrentDirectory() is not reliable as it is always "" in
                // tsserver. We don't need the exact base directory, just one that contains
                // a source file.
                var source = this.tsService.getProgram().getSourceFile(this.context);
                if (!source) {
                    throw new Error('Internal error: no context could be determined');
                }
                var tsConfigPath = findTsConfig(source.fileName);
                var basePath = path.dirname(tsConfigPath || this.context);
                var options = { basePath: basePath, genDir: basePath };
                var compilerOptions = this.host.getCompilationSettings();
                if (compilerOptions && compilerOptions.baseUrl) {
                    options.baseUrl = compilerOptions.baseUrl;
                }
                if (compilerOptions && compilerOptions.paths) {
                    options.paths = compilerOptions.paths;
                }
                result = this._reflectorHost =
                    new ReflectorHost(function () { return _this.tsService.getProgram(); }, this.host, options);
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceHost.prototype.collectError = function (error, filePath) {
        if (filePath) {
            var errorMap = this.collectedErrors;
            if (!errorMap || !this.collectedErrors) {
                errorMap = this.collectedErrors = new Map();
            }
            var errors = errorMap.get(filePath);
            if (!errors) {
                errors = [];
                this.collectedErrors.set(filePath, errors);
            }
            errors.push(error);
        }
    };
    Object.defineProperty(TypeScriptServiceHost.prototype, "staticSymbolResolver", {
        get: function () {
            var _this = this;
            var result = this._staticSymbolResolver;
            if (!result) {
                this._summaryResolver = new AotSummaryResolver({
                    loadSummary: function (filePath) { return null; },
                    isSourceFile: function (sourceFilePath) { return true; },
                    toSummaryFileName: function (sourceFilePath) { return sourceFilePath; },
                    fromSummaryFileName: function (filePath) { return filePath; },
                }, this._staticSymbolCache);
                result = this._staticSymbolResolver = new StaticSymbolResolver(this.reflectorHost, this._staticSymbolCache, this._summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TypeScriptServiceHost.prototype, "reflector", {
        get: function () {
            var _this = this;
            var result = this._reflector;
            if (!result) {
                var ssr = this.staticSymbolResolver;
                result = this._reflector = new StaticReflector(this._summaryResolver, ssr, [], [], function (e, filePath) { return _this.collectError(e, filePath); });
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceHost.prototype.getTemplateClassFromStaticSymbol = function (type) {
        var source = this.getSourceFile(type.filePath);
        if (source) {
            var declarationNode = ts.forEachChild(source, function (child) {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    var classDeclaration = child;
                    if (classDeclaration.name != null && classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
            return declarationNode;
        }
        return undefined;
    };
    /**
     * Given a template string node, see if it is an Angular template string, and if so return the
     * containing class.
     */
    TypeScriptServiceHost.prototype.getTemplateClassDeclFromNode = function (currentToken) {
        // Verify we are in a 'template' property assignment, in an object literal, which is an call
        // arg, in a decorator
        var parentNode = currentToken.parent; // PropertyAssignment
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
        var callTarget = parentNode.expression;
        var decorator = parentNode.parent; // Decorator
        if (!decorator || decorator.kind !== ts.SyntaxKind.Decorator) {
            return TypeScriptServiceHost.missingTemplate;
        }
        var declaration = decorator.parent; // ClassDeclaration
        if (!declaration || declaration.kind !== ts.SyntaxKind.ClassDeclaration) {
            return TypeScriptServiceHost.missingTemplate;
        }
        return [declaration, callTarget];
    };
    TypeScriptServiceHost.prototype.getCollectedErrors = function (defaultSpan, sourceFile) {
        var errors = (this.collectedErrors && this.collectedErrors.get(sourceFile.fileName));
        return (errors && errors.map(function (e) {
            var line = e.line || (e.position && e.position.line);
            var column = e.column || (e.position && e.position.column);
            var span = spanAt(sourceFile, line, column) || defaultSpan;
            if (isFormattedError(e)) {
                return errorToDiagnosticWithChain(e, span);
            }
            return { message: e.message, span: span };
        })) ||
            [];
    };
    TypeScriptServiceHost.prototype.getDeclarationFromNode = function (sourceFile, node) {
        if (node.kind == ts.SyntaxKind.ClassDeclaration && node.decorators &&
            node.name) {
            for (var _i = 0, _a = node.decorators; _i < _a.length; _i++) {
                var decorator = _a[_i];
                if (decorator.expression && decorator.expression.kind == ts.SyntaxKind.CallExpression) {
                    var classDeclaration = node;
                    if (classDeclaration.name) {
                        var call = decorator.expression;
                        var target = call.expression;
                        var type = this.checker.getTypeAtLocation(target);
                        if (type) {
                            var staticSymbol = this.reflector.getStaticSymbol(sourceFile.fileName, classDeclaration.name.text);
                            try {
                                if (this.resolver.isDirective(staticSymbol)) {
                                    var metadata = this.resolver.getNonNormalizedDirectiveMetadata(staticSymbol).metadata;
                                    var declarationSpan = spanOf(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan: declarationSpan,
                                        metadata: metadata,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                            catch (e) {
                                if (e.message) {
                                    this.collectError(e, sourceFile.fileName);
                                    var declarationSpan = spanOf(target);
                                    return {
                                        type: staticSymbol,
                                        declarationSpan: declarationSpan,
                                        errors: this.getCollectedErrors(declarationSpan, sourceFile)
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    TypeScriptServiceHost.prototype.stringOf = function (node) {
        switch (node.kind) {
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return node.text;
            case ts.SyntaxKind.StringLiteral:
                return node.text;
        }
    };
    TypeScriptServiceHost.prototype.findNode = function (sourceFile, position) {
        function find(node) {
            if (position >= node.getStart() && position < node.getEnd()) {
                return ts.forEachChild(node, find) || node;
            }
        }
        return find(sourceFile);
    };
    TypeScriptServiceHost.missingTemplate = [undefined, undefined];
    return TypeScriptServiceHost;
}());
export { TypeScriptServiceHost };
function findTsConfig(fileName) {
    var dir = path.dirname(fileName);
    while (fs.existsSync(dir)) {
        var candidate = path.join(dir, 'tsconfig.json');
        if (fs.existsSync(candidate))
            return candidate;
        var parentDir = path.dirname(dir);
        if (parentDir === dir)
            break;
        dir = parentDir;
    }
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
        var position_1 = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
        var findChild = function findChild(node) {
            if (node.kind > ts.SyntaxKind.LastToken && node.pos <= position_1 && node.end > position_1) {
                var betterNode = ts.forEachChild(node, findChild);
                return betterNode || node;
            }
        };
        var node = ts.forEachChild(sourceFile, findChild);
        if (node) {
            return { start: node.getStart(), end: node.getEnd() };
        }
    }
}
function chainedMessage(chain, indent) {
    if (indent === void 0) { indent = ''; }
    return indent + chain.message + (chain.next ? chainedMessage(chain.next, indent + '  ') : '');
}
var DiagnosticMessageChainImpl = /** @class */ (function () {
    function DiagnosticMessageChainImpl(message, next) {
        this.message = message;
        this.next = next;
    }
    DiagnosticMessageChainImpl.prototype.toString = function () { return chainedMessage(this); };
    return DiagnosticMessageChainImpl;
}());
function convertChain(chain) {
    return { message: chain.message, next: chain.next ? convertChain(chain.next) : undefined };
}
function errorToDiagnosticWithChain(error, span) {
    return { message: error.chain ? convertChain(error.chain) : error.message, span: span };
}
//# sourceMappingURL=typescript_host.js.map