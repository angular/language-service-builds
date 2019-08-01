/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/core", "fs", "path", "typescript", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var core_1 = require("@angular/core");
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var reflector_host_1 = require("@angular/language-service/src/reflector_host");
    var types_1 = require("@angular/language-service/src/types");
    /**
     * Create a `LanguageServiceHost`
     */
    function createLanguageServiceFromTypescript(host, service) {
        var ngHost = new TypeScriptServiceHost(host, service);
        var ngServer = language_service_1.createLanguageService(ngHost);
        return ngServer;
    }
    exports.createLanguageServiceFromTypescript = createLanguageServiceFromTypescript;
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
        DummyHtmlParser.prototype.parse = function () { return new compiler_1.ParseTreeResult([], []); };
        return DummyHtmlParser;
    }(compiler_1.HtmlParser));
    exports.DummyHtmlParser = DummyHtmlParser;
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
    }(compiler_1.ResourceLoader));
    exports.DummyResourceLoader = DummyResourceLoader;
    /**
     * An implementation of a `LanguageServiceHost` for a TypeScript project.
     *
     * The `TypeScriptServiceHost` implements the Angular `LanguageServiceHost` using
     * the TypeScript language services.
     *
     * @publicApi
     */
    var TypeScriptServiceHost = /** @class */ (function () {
        function TypeScriptServiceHost(host, tsService) {
            this.host = host;
            this.tsService = tsService;
            this._staticSymbolCache = new compiler_1.StaticSymbolCache();
            this.modulesOutOfDate = true;
            this.fileToComponent = new Map();
            this.collectedErrors = new Map();
            this.fileVersions = new Map();
        }
        Object.defineProperty(TypeScriptServiceHost.prototype, "resolver", {
            /**
             * Angular LanguageServiceHost implementation
             */
            get: function () {
                var _this = this;
                this.validate();
                var result = this._resolver;
                if (!result) {
                    var moduleResolver = new compiler_1.NgModuleResolver(this.reflector);
                    var directiveResolver = new compiler_1.DirectiveResolver(this.reflector);
                    var pipeResolver = new compiler_1.PipeResolver(this.reflector);
                    var elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
                    var resourceLoader = new DummyResourceLoader();
                    var urlResolver = compiler_1.createOfflineCompileUrlResolver();
                    var htmlParser = new DummyHtmlParser();
                    // This tracks the CompileConfig in codegen.ts. Currently these options
                    // are hard-coded.
                    var config = new compiler_1.CompilerConfig({ defaultEncapsulation: core_1.ViewEncapsulation.Emulated, useJit: false });
                    var directiveNormalizer = new compiler_1.DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
                    result = this._resolver = new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this._staticSymbolCache, this.reflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
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
        /**
         * Get the Angular template in the file, if any. If TS file is provided then
         * return the inline template, otherwise return the external template.
         * @param fileName Either TS or HTML file
         * @param position Only used if file is TS
         */
        TypeScriptServiceHost.prototype.getTemplateAt = function (fileName, position) {
            if (fileName.endsWith('.ts')) {
                var sourceFile = this.getSourceFile(fileName);
                if (sourceFile) {
                    this.context = sourceFile.fileName;
                    var node = this.findNode(sourceFile, position);
                    if (node) {
                        return this.getSourceFromNode(fileName, this.host.getScriptVersion(sourceFile.fileName), node);
                    }
                }
            }
            else {
                this.ensureTemplateMap();
                var componentSymbol = this.fileToComponent.get(fileName);
                if (componentSymbol) {
                    return this.getSourceFromType(fileName, this.host.getScriptVersion(fileName), componentSymbol);
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
                        compiler_1.analyzeNgModules(programFiles, analyzeHost, this.staticSymbolResolver, this.resolver);
                }
                this.analyzedModules = analyzedModules;
            }
            return analyzedModules;
        };
        TypeScriptServiceHost.prototype.getTemplates = function (fileName) {
            var _this = this;
            if (fileName.endsWith('.ts')) {
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
            else {
                this.ensureTemplateMap();
                var componentSymbol = this.fileToComponent.get(fileName);
                if (componentSymbol) {
                    var templateSource = this.getTemplateAt(fileName, 0);
                    if (templateSource) {
                        return [templateSource];
                    }
                }
            }
        };
        TypeScriptServiceHost.prototype.getDeclarations = function (fileName) {
            var _this = this;
            if (!fileName.endsWith('.ts')) {
                return [];
            }
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
            if (!fileName.endsWith('.ts')) {
                throw new Error("Non-TS source file requested: " + fileName);
            }
            return this.tsService.getProgram().getSourceFile(fileName);
        };
        TypeScriptServiceHost.prototype.updateAnalyzedModules = function () {
            this.validate();
            if (this.modulesOutOfDate) {
                this.analyzedModules = null;
                this._reflector = null;
                this.templateReferences = null;
                this.fileToComponent.clear();
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
            var e_1, _a;
            var _this = this;
            var program = this.program;
            if (this.lastProgram !== program) {
                // Invalidate file that have changed in the static symbol resolver
                var invalidateFile = function (fileName) {
                    return _this._staticSymbolResolver.invalidateFile(fileName);
                };
                this.clearCaches();
                var seen_1 = new Set();
                try {
                    for (var _b = tslib_1.__values(this.program.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sourceFile = _c.value;
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
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
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
            this._resolver = null;
            this.collectedErrors.clear();
            this.modulesOutOfDate = true;
        };
        TypeScriptServiceHost.prototype.ensureTemplateMap = function () {
            var e_2, _a, e_3, _b;
            if (!this.templateReferences) {
                var templateReference = [];
                var ngModuleSummary = this.getAnalyzedModules();
                var urlResolver = compiler_1.createOfflineCompileUrlResolver();
                try {
                    for (var _c = tslib_1.__values(ngModuleSummary.ngModules), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var module_1 = _d.value;
                        try {
                            for (var _e = (e_3 = void 0, tslib_1.__values(module_1.declaredDirectives)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var directive = _f.value;
                                var metadata = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference).metadata;
                                if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                                    var templateName = urlResolver.resolve(this.reflector.componentModuleUrl(directive.reference), metadata.template.templateUrl);
                                    this.fileToComponent.set(templateName, directive.reference);
                                    templateReference.push(templateName);
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
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
                        return language_services_1.getClassMembersFromDeclaration(t.program, t.checker, sourceFile, declaration);
                    },
                    get query() {
                        if (!queryCache) {
                            var pipes_1 = [];
                            var templateInfo = t.getTemplateAstAtPosition(fileName, node.getStart());
                            if (templateInfo) {
                                pipes_1 = templateInfo.pipes;
                            }
                            queryCache = language_services_1.getSymbolQuery(t.program, t.checker, sourceFile, function () { return language_services_1.getPipesTable(sourceFile, t.program, t.checker, pipes_1); });
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
                    var _a = tslib_1.__read(this.getTemplateClassDeclFromNode(node), 2), declaration = _a[0], decorator = _a[1];
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
                    var source = this.getSourceFile(this.context);
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
                        new reflector_host_1.ReflectorHost(function () { return _this.tsService.getProgram(); }, this.host, options);
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        TypeScriptServiceHost.prototype.collectError = function (error, filePath) {
            if (filePath) {
                var errors = this.collectedErrors.get(filePath);
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
                    this._summaryResolver = new compiler_1.AotSummaryResolver({
                        loadSummary: function (filePath) { return null; },
                        isSourceFile: function (sourceFilePath) { return true; },
                        toSummaryFileName: function (sourceFilePath) { return sourceFilePath; },
                        fromSummaryFileName: function (filePath) { return filePath; },
                    }, this._staticSymbolCache);
                    result = this._staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this._staticSymbolCache, this._summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
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
                    result = this._reflector = new compiler_1.StaticReflector(this._summaryResolver, ssr, [], [], function (e, filePath) { return _this.collectError(e, filePath); });
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
            var errors = this.collectedErrors.get(sourceFile.fileName);
            return (errors && errors.map(function (e) {
                var line = e.line || (e.position && e.position.line);
                var column = e.column || (e.position && e.position.column);
                var span = spanAt(sourceFile, line, column) || defaultSpan;
                if (compiler_1.isFormattedError(e)) {
                    return errorToDiagnosticWithChain(e, span);
                }
                return { message: e.message, span: span };
            })) ||
                [];
        };
        TypeScriptServiceHost.prototype.getDeclarationFromNode = function (sourceFile, node) {
            var e_4, _a;
            if (node.kind == ts.SyntaxKind.ClassDeclaration && node.decorators &&
                node.name) {
                try {
                    for (var _b = tslib_1.__values(node.decorators), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var decorator = _c.value;
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
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
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
        TypeScriptServiceHost.prototype.getTemplateAstAtPosition = function (fileName, position) {
            var template = this.getTemplateAt(fileName, position);
            if (template) {
                var astResult = this.getTemplateAst(template, fileName);
                if (astResult && astResult.htmlAst && astResult.templateAst && astResult.directive &&
                    astResult.directives && astResult.pipes && astResult.expressionParser)
                    return {
                        position: position,
                        fileName: fileName,
                        template: template,
                        htmlAst: astResult.htmlAst,
                        directive: astResult.directive,
                        directives: astResult.directives,
                        pipes: astResult.pipes,
                        templateAst: astResult.templateAst,
                        expressionParser: astResult.expressionParser
                    };
            }
            return undefined;
        };
        TypeScriptServiceHost.prototype.getTemplateAst = function (template, contextFile) {
            var _this = this;
            var result = undefined;
            try {
                var resolvedMetadata = this.resolver.getNonNormalizedDirectiveMetadata(template.type);
                var metadata = resolvedMetadata && resolvedMetadata.metadata;
                if (metadata) {
                    var rawHtmlParser = new compiler_1.HtmlParser();
                    var htmlParser = new compiler_1.I18NHtmlParser(rawHtmlParser);
                    var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
                    var config = new compiler_1.CompilerConfig();
                    var parser = new compiler_1.TemplateParser(config, this.resolver.getReflector(), expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, []);
                    var htmlResult = htmlParser.parse(template.source, '', { tokenizeExpansionForms: true });
                    var analyzedModules = this.getAnalyzedModules();
                    var errors = undefined;
                    var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
                    if (!ngModule) {
                        // Reported by the the declaration diagnostics.
                        ngModule = findSuitableDefaultModule(analyzedModules);
                    }
                    if (ngModule) {
                        var directives = ngModule.transitiveModule.directives
                            .map(function (d) { return _this.resolver.getNonNormalizedDirectiveMetadata(d.reference); })
                            .filter(function (d) { return d; })
                            .map(function (d) { return d.metadata.toSummary(); });
                        var pipes = ngModule.transitiveModule.pipes.map(function (p) { return _this.resolver.getOrLoadPipeMetadata(p.reference).toSummary(); });
                        var schemas = ngModule.schemas;
                        var parseResult = parser.tryParseHtml(htmlResult, metadata, directives, pipes, schemas);
                        result = {
                            htmlAst: htmlResult.rootNodes,
                            templateAst: parseResult.templateAst,
                            directive: metadata, directives: directives, pipes: pipes,
                            parseErrors: parseResult.errors, expressionParser: expressionParser, errors: errors
                        };
                    }
                }
            }
            catch (e) {
                var span = template.span;
                if (e.fileName == contextFile) {
                    span = template.query.getSpanAt(e.line, e.column) || span;
                }
                result = { errors: [{ kind: types_1.DiagnosticKind.Error, message: e.message, span: span }] };
            }
            return result || {};
        };
        TypeScriptServiceHost.missingTemplate = [undefined, undefined];
        return TypeScriptServiceHost;
    }());
    exports.TypeScriptServiceHost = TypeScriptServiceHost;
    function findSuitableDefaultModule(modules) {
        var e_5, _a;
        var result = undefined;
        var resultSize = 0;
        try {
            for (var _b = tslib_1.__values(modules.ngModules), _c = _b.next(); !_c.done; _c = _b.next()) {
                var module_2 = _c.value;
                var moduleSize = module_2.transitiveModule.directives.length;
                if (moduleSize > resultSize) {
                    result = module_2;
                    resultSize = moduleSize;
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return result;
    }
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
    function convertChain(chain) {
        return { message: chain.message, next: chain.next ? convertChain(chain.next) : undefined };
    }
    function errorToDiagnosticWithChain(error, span) {
        return { message: error.chain ? convertChain(error.chain) : error.message, span: span };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFvaUI7SUFDcGlCLGlGQUEySTtJQUMzSSxzQ0FBcUU7SUFDckUsdUJBQXlCO0lBQ3pCLDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFHakMsbUZBQXlEO0lBQ3pELCtFQUErQztJQUMvQyw2REFBME47SUFJMU47O09BRUc7SUFDSCxTQUFnQixtQ0FBbUMsQ0FDL0MsSUFBNEIsRUFBRSxPQUEyQjtRQUMzRCxJQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxJQUFNLFFBQVEsR0FBRyx3Q0FBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBTEQsa0ZBS0M7SUFFRDs7Ozs7T0FLRztJQUNIO1FBQXFDLDJDQUFVO1FBQS9DOztRQUVBLENBQUM7UUFEQywrQkFBSyxHQUFMLGNBQTJCLE9BQU8sSUFBSSwwQkFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsc0JBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBcUMscUJBQVUsR0FFOUM7SUFGWSwwQ0FBZTtJQUk1Qjs7T0FFRztJQUNIO1FBQXlDLCtDQUFjO1FBQXZEOztRQUVBLENBQUM7UUFEQyxpQ0FBRyxHQUFILFVBQUksR0FBVyxJQUFxQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLDBCQUFDO0lBQUQsQ0FBQyxBQUZELENBQXlDLHlCQUFjLEdBRXREO0lBRlksa0RBQW1CO0lBSWhDOzs7Ozs7O09BT0c7SUFD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U0FBUyxDQUFDLElBQWE7Z0JBQ2hELElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLFVBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLFVBQVEsRUFBRTtvQkFDdEYsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3BELE9BQU8sVUFBVSxJQUFJLElBQUksQ0FBQztpQkFDM0I7WUFDSCxDQUFDLENBQUM7WUFFRixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNwRCxJQUFJLElBQUksRUFBRTtnQkFDUixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFDLENBQUM7YUFDckQ7U0FDRjtJQUNILENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxLQUE0QjtRQUNoRCxPQUFPLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUFDLEtBQXFCLEVBQUUsSUFBVTtRQUNuRSxPQUFPLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztJQUNsRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FvdFN1bW1hcnlSZXNvbHZlciwgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlUGlwZVN1bW1hcnksIENvbXBpbGVyQ29uZmlnLCBEaXJlY3RpdmVOb3JtYWxpemVyLCBEaXJlY3RpdmVSZXNvbHZlciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBGb3JtYXR0ZWRFcnJvciwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBIdG1sUGFyc2VyLCBJMThOSHRtbFBhcnNlciwgSml0U3VtbWFyeVJlc29sdmVyLCBMZXhlciwgTmdBbmFseXplZE1vZHVsZXMsIE5nTW9kdWxlUmVzb2x2ZXIsIFBhcnNlVHJlZVJlc3VsdCwgUGFyc2VyLCBQaXBlUmVzb2x2ZXIsIFJlc291cmNlTG9hZGVyLCBTdGF0aWNSZWZsZWN0b3IsIFN0YXRpY1N5bWJvbCwgU3RhdGljU3ltYm9sQ2FjaGUsIFN0YXRpY1N5bWJvbFJlc29sdmVyLCBUZW1wbGF0ZVBhcnNlciwgYW5hbHl6ZU5nTW9kdWxlcywgY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlciwgaXNGb3JtYXR0ZWRFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnMsIGdldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbiwgZ2V0UGlwZXNUYWJsZSwgZ2V0U3ltYm9sUXVlcnl9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0IHtWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdCwgVGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7UmVmbGVjdG9ySG9zdH0gZnJvbSAnLi9yZWZsZWN0b3JfaG9zdCc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkVycm9yLCBEZWNsYXJhdGlvbnMsIERpYWdub3N0aWMsIERpYWdub3N0aWNLaW5kLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3QsIFNwYW4sIFN5bWJvbCwgU3ltYm9sUXVlcnksIFRlbXBsYXRlU291cmNlLCBUZW1wbGF0ZVNvdXJjZXN9IGZyb20gJy4vdHlwZXMnO1xuXG5cblxuLyoqXG4gKiBDcmVhdGUgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZUZyb21UeXBlc2NyaXB0KFxuICAgIGhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHNlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZSk6IExhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IG5nSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaG9zdCwgc2VydmljZSk7XG4gIGNvbnN0IG5nU2VydmVyID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKG5nSG9zdCk7XG4gIHJldHVybiBuZ1NlcnZlcjtcbn1cblxuLyoqXG4gKiBUaGUgbGFuZ3VhZ2Ugc2VydmljZSBuZXZlciBuZWVkcyB0aGUgbm9ybWFsaXplZCB2ZXJzaW9ucyBvZiB0aGUgbWV0YWRhdGEuIFRvIGF2b2lkIHBhcnNpbmdcbiAqIHRoZSBjb250ZW50IGFuZCByZXNvbHZpbmcgcmVmZXJlbmNlcywgcmV0dXJuIGFuIGVtcHR5IGZpbGUuIFRoaXMgYWxzbyBhbGxvd3Mgbm9ybWFsaXppbmdcbiAqIHRlbXBsYXRlIHRoYXQgYXJlIHN5bnRhdGljYWxseSBpbmNvcnJlY3Qgd2hpY2ggaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSBjb21wbGV0aW9ucyBpblxuICogc3ludGFjdGljYWxseSBpbmNvcnJlY3QgdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlIdG1sUGFyc2VyIGV4dGVuZHMgSHRtbFBhcnNlciB7XG4gIHBhcnNlKCk6IFBhcnNlVHJlZVJlc3VsdCB7IHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFtdLCBbXSk7IH1cbn1cblxuLyoqXG4gKiBBdm9pZCBsb2FkaW5nIHJlc291cmNlcyBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmNpZSBieSB1c2luZyBhIGR1bW15IGxvYWRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15UmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoJycpOyB9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgZm9yIGEgVHlwZVNjcmlwdCBwcm9qZWN0LlxuICpcbiAqIFRoZSBgVHlwZVNjcmlwdFNlcnZpY2VIb3N0YCBpbXBsZW1lbnRzIHRoZSBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCB1c2luZ1xuICogdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZXMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFNlcnZpY2VIb3N0IGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9yZXNvbHZlciAhOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB8IG51bGw7XG4gIHByaXZhdGUgX3N0YXRpY1N5bWJvbENhY2hlID0gbmV3IFN0YXRpY1N5bWJvbENhY2hlKCk7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9zdW1tYXJ5UmVzb2x2ZXIgITogQW90U3VtbWFyeVJlc29sdmVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfc3RhdGljU3ltYm9sUmVzb2x2ZXIgITogU3RhdGljU3ltYm9sUmVzb2x2ZXI7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9yZWZsZWN0b3IgITogU3RhdGljUmVmbGVjdG9yIHwgbnVsbDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3JlZmxlY3Rvckhvc3QgITogUmVmbGVjdG9ySG9zdDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX2NoZWNrZXIgITogdHMuVHlwZUNoZWNrZXIgfCBudWxsO1xuICBwcml2YXRlIGNvbnRleHQ6IHN0cmluZ3x1bmRlZmluZWQ7XG4gIHByaXZhdGUgbGFzdFByb2dyYW06IHRzLlByb2dyYW18dW5kZWZpbmVkO1xuICBwcml2YXRlIG1vZHVsZXNPdXRPZkRhdGU6IGJvb2xlYW4gPSB0cnVlO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBhbmFseXplZE1vZHVsZXMgITogTmdBbmFseXplZE1vZHVsZXMgfCBudWxsO1xuICBwcml2YXRlIGZpbGVUb0NvbXBvbmVudCA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0aWNTeW1ib2w+KCk7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHRlbXBsYXRlUmVmZXJlbmNlcyAhOiBzdHJpbmdbXSB8IG51bGw7XG4gIHByaXZhdGUgY29sbGVjdGVkRXJyb3JzID0gbmV3IE1hcDxzdHJpbmcsIGFueVtdPigpO1xuICBwcml2YXRlIGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBwcml2YXRlIHRzU2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlKSB7fVxuXG4gIC8qKlxuICAgKiBBbmd1bGFyIExhbmd1YWdlU2VydmljZUhvc3QgaW1wbGVtZW50YXRpb25cbiAgICovXG4gIGdldCByZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7XG4gICAgdGhpcy52YWxpZGF0ZSgpO1xuICAgIGxldCByZXN1bHQgPSB0aGlzLl9yZXNvbHZlcjtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTmdNb2R1bGVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgICBjb25zdCBkaXJlY3RpdmVSZXNvbHZlciA9IG5ldyBEaXJlY3RpdmVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgICBjb25zdCBwaXBlUmVzb2x2ZXIgPSBuZXcgUGlwZVJlc29sdmVyKHRoaXMucmVmbGVjdG9yKTtcbiAgICAgIGNvbnN0IGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbiAgICAgIGNvbnN0IHJlc291cmNlTG9hZGVyID0gbmV3IER1bW15UmVzb3VyY2VMb2FkZXIoKTtcbiAgICAgIGNvbnN0IHVybFJlc29sdmVyID0gY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlcigpO1xuICAgICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBEdW1teUh0bWxQYXJzZXIoKTtcbiAgICAgIC8vIFRoaXMgdHJhY2tzIHRoZSBDb21waWxlQ29uZmlnIGluIGNvZGVnZW4udHMuIEN1cnJlbnRseSB0aGVzZSBvcHRpb25zXG4gICAgICAvLyBhcmUgaGFyZC1jb2RlZC5cbiAgICAgIGNvbnN0IGNvbmZpZyA9XG4gICAgICAgICAgbmV3IENvbXBpbGVyQ29uZmlnKHtkZWZhdWx0RW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQsIHVzZUppdDogZmFsc2V9KTtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZU5vcm1hbGl6ZXIgPVxuICAgICAgICAgIG5ldyBEaXJlY3RpdmVOb3JtYWxpemVyKHJlc291cmNlTG9hZGVyLCB1cmxSZXNvbHZlciwgaHRtbFBhcnNlciwgY29uZmlnKTtcblxuICAgICAgcmVzdWx0ID0gdGhpcy5fcmVzb2x2ZXIgPSBuZXcgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIoXG4gICAgICAgICAgY29uZmlnLCBodG1sUGFyc2VyLCBtb2R1bGVSZXNvbHZlciwgZGlyZWN0aXZlUmVzb2x2ZXIsIHBpcGVSZXNvbHZlcixcbiAgICAgICAgICBuZXcgSml0U3VtbWFyeVJlc29sdmVyKCksIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgZGlyZWN0aXZlTm9ybWFsaXplciwgbmV3IENvbnNvbGUoKSxcbiAgICAgICAgICB0aGlzLl9zdGF0aWNTeW1ib2xDYWNoZSwgdGhpcy5yZWZsZWN0b3IsXG4gICAgICAgICAgKGVycm9yLCB0eXBlKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlcnJvciwgdHlwZSAmJiB0eXBlLmZpbGVQYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlVGVtcGxhdGVNYXAoKTtcbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZVJlZmVyZW5jZXMgfHwgW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBBbmd1bGFyIHRlbXBsYXRlIGluIHRoZSBmaWxlLCBpZiBhbnkuIElmIFRTIGZpbGUgaXMgcHJvdmlkZWQgdGhlblxuICAgKiByZXR1cm4gdGhlIGlubGluZSB0ZW1wbGF0ZSwgb3RoZXJ3aXNlIHJldHVybiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBFaXRoZXIgVFMgb3IgSFRNTCBmaWxlXG4gICAqIEBwYXJhbSBwb3NpdGlvbiBPbmx5IHVzZWQgaWYgZmlsZSBpcyBUU1xuICAgKi9cbiAgZ2V0VGVtcGxhdGVBdChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmZpbmROb2RlKHNvdXJjZUZpbGUsIHBvc2l0aW9uKTtcbiAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRTb3VyY2VGcm9tTm9kZShcbiAgICAgICAgICAgICAgZmlsZU5hbWUsIHRoaXMuaG9zdC5nZXRTY3JpcHRWZXJzaW9uKHNvdXJjZUZpbGUuZmlsZU5hbWUpLCBub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVuc3VyZVRlbXBsYXRlTWFwKCk7XG4gICAgICBjb25zdCBjb21wb25lbnRTeW1ib2wgPSB0aGlzLmZpbGVUb0NvbXBvbmVudC5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKGNvbXBvbmVudFN5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTb3VyY2VGcm9tVHlwZShcbiAgICAgICAgICAgIGZpbGVOYW1lLCB0aGlzLmhvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSksIGNvbXBvbmVudFN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXRBbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIHRoaXMudXBkYXRlQW5hbHl6ZWRNb2R1bGVzKCk7XG4gICAgcmV0dXJuIHRoaXMuZW5zdXJlQW5hbHl6ZWRNb2R1bGVzKCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkTW9kdWxlcygpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgbGV0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICAgIGlmICghYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICBpZiAodGhpcy5ob3N0LmdldFNjcmlwdEZpbGVOYW1lcygpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhbmFseXplZE1vZHVsZXMgPSB7XG4gICAgICAgICAgZmlsZXM6IFtdLFxuICAgICAgICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICAgICAgICBuZ01vZHVsZXM6IFtdLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgYW5hbHl6ZUhvc3QgPSB7aXNTb3VyY2VGaWxlKGZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRydWU7IH19O1xuICAgICAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0gIS5nZXRTb3VyY2VGaWxlcygpLm1hcChzZiA9PiBzZi5maWxlTmFtZSk7XG4gICAgICAgIGFuYWx5emVkTW9kdWxlcyA9XG4gICAgICAgICAgICBhbmFseXplTmdNb2R1bGVzKHByb2dyYW1GaWxlcywgYW5hbHl6ZUhvc3QsIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIsIHRoaXMucmVzb2x2ZXIpO1xuICAgICAgfVxuICAgICAgdGhpcy5hbmFseXplZE1vZHVsZXMgPSBhbmFseXplZE1vZHVsZXM7XG4gICAgfVxuICAgIHJldHVybiBhbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlcyB7XG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgbGV0IHZlcnNpb24gPSB0aGlzLmhvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICBsZXQgcmVzdWx0OiBUZW1wbGF0ZVNvdXJjZVtdID0gW107XG5cbiAgICAgIC8vIEZpbmQgZWFjaCB0ZW1wbGF0ZSBzdHJpbmcgaW4gdGhlIGZpbGVcbiAgICAgIGxldCB2aXNpdCA9IChjaGlsZDogdHMuTm9kZSkgPT4ge1xuICAgICAgICBsZXQgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLmdldFNvdXJjZUZyb21Ob2RlKGZpbGVOYW1lLCB2ZXJzaW9uLCBjaGlsZCk7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVNvdXJjZSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHRlbXBsYXRlU291cmNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoY2hpbGQsIHZpc2l0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbGV0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gKHNvdXJjZUZpbGUgYXMgYW55KS5wYXRoIHx8IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0Lmxlbmd0aCA/IHJlc3VsdCA6IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbnN1cmVUZW1wbGF0ZU1hcCgpO1xuICAgICAgY29uc3QgY29tcG9uZW50U3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChjb21wb25lbnRTeW1ib2wpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLmdldFRlbXBsYXRlQXQoZmlsZU5hbWUsIDApO1xuICAgICAgICBpZiAodGVtcGxhdGVTb3VyY2UpIHtcbiAgICAgICAgICByZXR1cm4gW3RlbXBsYXRlU291cmNlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldERlY2xhcmF0aW9ucyhmaWxlTmFtZTogc3RyaW5nKTogRGVjbGFyYXRpb25zIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQ6IERlY2xhcmF0aW9ucyA9IFtdO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICBsZXQgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgbGV0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbkZyb21Ob2RlKHNvdXJjZUZpbGUsIGNoaWxkKTtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goZGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50c1NlcnZpY2UuZ2V0UHJvZ3JhbSgpICEuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICB1cGRhdGVBbmFseXplZE1vZHVsZXMoKSB7XG4gICAgdGhpcy52YWxpZGF0ZSgpO1xuICAgIGlmICh0aGlzLm1vZHVsZXNPdXRPZkRhdGUpIHtcbiAgICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID0gbnVsbDtcbiAgICAgIHRoaXMuX3JlZmxlY3RvciA9IG51bGw7XG4gICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcyA9IG51bGw7XG4gICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5jbGVhcigpO1xuICAgICAgdGhpcy5lbnN1cmVBbmFseXplZE1vZHVsZXMoKTtcbiAgICAgIHRoaXMubW9kdWxlc091dE9mRGF0ZSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHByb2dyYW0oKSB7IHJldHVybiB0aGlzLnRzU2VydmljZS5nZXRQcm9ncmFtKCk7IH1cblxuICBwcml2YXRlIGdldCBjaGVja2VyKCkge1xuICAgIGxldCBjaGVja2VyID0gdGhpcy5fY2hlY2tlcjtcbiAgICBpZiAoIWNoZWNrZXIpIHtcbiAgICAgIGNoZWNrZXIgPSB0aGlzLl9jaGVja2VyID0gdGhpcy5wcm9ncmFtICEuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoZWNrZXI7XG4gIH1cblxuICBwcml2YXRlIHZhbGlkYXRlKCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW07XG4gICAgaWYgKHRoaXMubGFzdFByb2dyYW0gIT09IHByb2dyYW0pIHtcbiAgICAgIC8vIEludmFsaWRhdGUgZmlsZSB0aGF0IGhhdmUgY2hhbmdlZCBpbiB0aGUgc3RhdGljIHN5bWJvbCByZXNvbHZlclxuICAgICAgY29uc3QgaW52YWxpZGF0ZUZpbGUgPSAoZmlsZU5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgICB0aGlzLl9zdGF0aWNTeW1ib2xSZXNvbHZlci5pbnZhbGlkYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICB0aGlzLmNsZWFyQ2FjaGVzKCk7XG4gICAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGxldCBzb3VyY2VGaWxlIG9mIHRoaXMucHJvZ3JhbSAhLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzb3VyY2VGaWxlLmZpbGVOYW1lO1xuICAgICAgICBzZWVuLmFkZChmaWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IHZlcnNpb24gPSB0aGlzLmhvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IGxhc3RWZXJzaW9uID0gdGhpcy5maWxlVmVyc2lvbnMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT0gbGFzdFZlcnNpb24pIHtcbiAgICAgICAgICB0aGlzLmZpbGVWZXJzaW9ucy5zZXQoZmlsZU5hbWUsIHZlcnNpb24pO1xuICAgICAgICAgIGlmICh0aGlzLl9zdGF0aWNTeW1ib2xSZXNvbHZlcikge1xuICAgICAgICAgICAgaW52YWxpZGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdmUgZmlsZSB2ZXJzaW9ucyB0aGF0IGFyZSBubyBsb25nZXIgaW4gdGhlIGZpbGUgYW5kIGludmFsaWRhdGUgdGhlbS5cbiAgICAgIGNvbnN0IG1pc3NpbmcgPSBBcnJheS5mcm9tKHRoaXMuZmlsZVZlcnNpb25zLmtleXMoKSkuZmlsdGVyKGYgPT4gIXNlZW4uaGFzKGYpKTtcbiAgICAgIG1pc3NpbmcuZm9yRWFjaChmID0+IHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmKSk7XG4gICAgICBpZiAodGhpcy5fc3RhdGljU3ltYm9sUmVzb2x2ZXIpIHtcbiAgICAgICAgbWlzc2luZy5mb3JFYWNoKGludmFsaWRhdGVGaWxlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sYXN0UHJvZ3JhbSA9IHByb2dyYW07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjbGVhckNhY2hlcygpIHtcbiAgICB0aGlzLl9jaGVja2VyID0gbnVsbDtcbiAgICB0aGlzLl9yZXNvbHZlciA9IG51bGw7XG4gICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuY2xlYXIoKTtcbiAgICB0aGlzLm1vZHVsZXNPdXRPZkRhdGUgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVUZW1wbGF0ZU1hcCgpIHtcbiAgICBpZiAoIXRoaXMudGVtcGxhdGVSZWZlcmVuY2VzKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVJlZmVyZW5jZTogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlU3VtbWFyeSA9IHRoaXMuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7XG4gICAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIG5nTW9kdWxlU3VtbWFyeS5uZ01vZHVsZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSAhO1xuICAgICAgICAgIGlmIChtZXRhZGF0YS5pc0NvbXBvbmVudCAmJiBtZXRhZGF0YS50ZW1wbGF0ZSAmJiBtZXRhZGF0YS50ZW1wbGF0ZS50ZW1wbGF0ZVVybCkge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGVOYW1lID0gdXJsUmVzb2x2ZXIucmVzb2x2ZShcbiAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgICAgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpO1xuICAgICAgICAgICAgdGhpcy5maWxlVG9Db21wb25lbnQuc2V0KHRlbXBsYXRlTmFtZSwgZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICB0ZW1wbGF0ZVJlZmVyZW5jZS5wdXNoKHRlbXBsYXRlTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcyA9IHRlbXBsYXRlUmVmZXJlbmNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U291cmNlRnJvbURlY2xhcmF0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBzb3VyY2U6IHN0cmluZywgc3BhbjogU3BhbiwgdHlwZTogU3RhdGljU3ltYm9sLFxuICAgICAgZGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24sIG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBUZW1wbGF0ZVNvdXJjZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgbGV0IHF1ZXJ5Q2FjaGU6IFN5bWJvbFF1ZXJ5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCB0ID0gdGhpcztcbiAgICBpZiAoZGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZlcnNpb24sXG4gICAgICAgIHNvdXJjZSxcbiAgICAgICAgc3BhbixcbiAgICAgICAgdHlwZSxcbiAgICAgICAgZ2V0IG1lbWJlcnMoKSB7XG4gICAgICAgICAgcmV0dXJuIGdldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbih0LnByb2dyYW0gISwgdC5jaGVja2VyLCBzb3VyY2VGaWxlLCBkZWNsYXJhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIGdldCBxdWVyeSgpIHtcbiAgICAgICAgICBpZiAoIXF1ZXJ5Q2FjaGUpIHtcbiAgICAgICAgICAgIGxldCBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHQuZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lLCBub2RlLmdldFN0YXJ0KCkpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlSW5mbykge1xuICAgICAgICAgICAgICBwaXBlcyA9IHRlbXBsYXRlSW5mby5waXBlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXJ5Q2FjaGUgPSBnZXRTeW1ib2xRdWVyeShcbiAgICAgICAgICAgICAgICB0LnByb2dyYW0gISwgdC5jaGVja2VyLCBzb3VyY2VGaWxlLFxuICAgICAgICAgICAgICAgICgpID0+IGdldFBpcGVzVGFibGUoc291cmNlRmlsZSwgdC5wcm9ncmFtICEsIHQuY2hlY2tlciwgcGlwZXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHF1ZXJ5Q2FjaGU7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VGcm9tTm9kZShmaWxlTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIG5vZGU6IHRzLk5vZGUpOiBUZW1wbGF0ZVNvdXJjZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgbGV0IHJlc3VsdDogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHQgPSB0aGlzO1xuICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWw6XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbDpcbiAgICAgICAgbGV0IFtkZWNsYXJhdGlvbiwgZGVjb3JhdG9yXSA9IHRoaXMuZ2V0VGVtcGxhdGVDbGFzc0RlY2xGcm9tTm9kZShub2RlKTtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uICYmIGRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U291cmNlRnJvbURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgIGZpbGVOYW1lLCB2ZXJzaW9uLCB0aGlzLnN0cmluZ09mKG5vZGUpIHx8ICcnLCBzaHJpbmsoc3Bhbk9mKG5vZGUpKSxcbiAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woc291cmNlRmlsZS5maWxlTmFtZSwgZGVjbGFyYXRpb24ubmFtZS50ZXh0KSxcbiAgICAgICAgICAgICAgICBkZWNsYXJhdGlvbiwgbm9kZSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VGcm9tVHlwZShmaWxlTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIHR5cGU6IFN0YXRpY1N5bWJvbCk6IFRlbXBsYXRlU291cmNlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBsZXQgcmVzdWx0OiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldFRlbXBsYXRlQ2xhc3NGcm9tU3RhdGljU3ltYm9sKHR5cGUpO1xuICAgIGlmIChkZWNsYXJhdGlvbikge1xuICAgICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLmhvc3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNuYXBzaG90KSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgICAgICByZXN1bHQgPSB0aGlzLmdldFNvdXJjZUZyb21EZWNsYXJhdGlvbihcbiAgICAgICAgICAgIGZpbGVOYW1lLCB2ZXJzaW9uLCBzb3VyY2UsIHtzdGFydDogMCwgZW5kOiBzb3VyY2UubGVuZ3RofSwgdHlwZSwgZGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3Rvckhvc3QoKTogUmVmbGVjdG9ySG9zdCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMuX3JlZmxlY3Rvckhvc3Q7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICAgIC8vIE1ha2UgdXAgYSBjb250ZXh0IGJ5IGZpbmRpbmcgdGhlIGZpcnN0IHNjcmlwdCBhbmQgdXNpbmcgdGhhdCBhcyB0aGUgYmFzZSBkaXIuXG4gICAgICAgIGNvbnN0IHNjcmlwdEZpbGVOYW1lcyA9IHRoaXMuaG9zdC5nZXRTY3JpcHRGaWxlTmFtZXMoKTtcbiAgICAgICAgaWYgKDAgPT09IHNjcmlwdEZpbGVOYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludGVybmFsIGVycm9yOiBubyBzY3JpcHQgZmlsZSBuYW1lcyBmb3VuZCcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29udGV4dCA9IHNjcmlwdEZpbGVOYW1lc1swXTtcbiAgICAgIH1cblxuICAgICAgLy8gVXNlIHRoZSBmaWxlIGNvbnRleHQncyBkaXJlY3RvcnkgYXMgdGhlIGJhc2UgZGlyZWN0b3J5LlxuICAgICAgLy8gVGhlIGhvc3QncyBnZXRDdXJyZW50RGlyZWN0b3J5KCkgaXMgbm90IHJlbGlhYmxlIGFzIGl0IGlzIGFsd2F5cyBcIlwiIGluXG4gICAgICAvLyB0c3NlcnZlci4gV2UgZG9uJ3QgbmVlZCB0aGUgZXhhY3QgYmFzZSBkaXJlY3RvcnksIGp1c3Qgb25lIHRoYXQgY29udGFpbnNcbiAgICAgIC8vIGEgc291cmNlIGZpbGUuXG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmdldFNvdXJjZUZpbGUodGhpcy5jb250ZXh0KTtcbiAgICAgIGlmICghc291cmNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW50ZXJuYWwgZXJyb3I6IG5vIGNvbnRleHQgY291bGQgYmUgZGV0ZXJtaW5lZCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSBmaW5kVHNDb25maWcoc291cmNlLmZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gcGF0aC5kaXJuYW1lKHRzQ29uZmlnUGF0aCB8fCB0aGlzLmNvbnRleHQpO1xuICAgICAgY29uc3Qgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zID0ge2Jhc2VQYXRoLCBnZW5EaXI6IGJhc2VQYXRofTtcbiAgICAgIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRoaXMuaG9zdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCk7XG4gICAgICBpZiAoY29tcGlsZXJPcHRpb25zICYmIGNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsKSB7XG4gICAgICAgIG9wdGlvbnMuYmFzZVVybCA9IGNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsO1xuICAgICAgfVxuICAgICAgaWYgKGNvbXBpbGVyT3B0aW9ucyAmJiBjb21waWxlck9wdGlvbnMucGF0aHMpIHtcbiAgICAgICAgb3B0aW9ucy5wYXRocyA9IGNvbXBpbGVyT3B0aW9ucy5wYXRocztcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IHRoaXMuX3JlZmxlY3Rvckhvc3QgPVxuICAgICAgICAgIG5ldyBSZWZsZWN0b3JIb3N0KCgpID0+IHRoaXMudHNTZXJ2aWNlLmdldFByb2dyYW0oKSAhLCB0aGlzLmhvc3QsIG9wdGlvbnMpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjb2xsZWN0RXJyb3IoZXJyb3I6IGFueSwgZmlsZVBhdGg6IHN0cmluZ3xudWxsKSB7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICBsZXQgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGlmICghZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5zZXQoZmlsZVBhdGgsIGVycm9ycyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgc3RhdGljU3ltYm9sUmVzb2x2ZXIoKTogU3RhdGljU3ltYm9sUmVzb2x2ZXIge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLl9zdGF0aWNTeW1ib2xSZXNvbHZlcjtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgdGhpcy5fc3VtbWFyeVJlc29sdmVyID0gbmV3IEFvdFN1bW1hcnlSZXNvbHZlcihcbiAgICAgICAgICB7XG4gICAgICAgICAgICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgICAgICAgaXNTb3VyY2VGaWxlKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICAgICAgICB0b1N1bW1hcnlGaWxlTmFtZShzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBzb3VyY2VGaWxlUGF0aDsgfSxcbiAgICAgICAgICAgIGZyb21TdW1tYXJ5RmlsZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3tyZXR1cm4gZmlsZVBhdGg7fSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRoaXMuX3N0YXRpY1N5bWJvbENhY2hlKTtcbiAgICAgIHJlc3VsdCA9IHRoaXMuX3N0YXRpY1N5bWJvbFJlc29sdmVyID0gbmV3IFN0YXRpY1N5bWJvbFJlc29sdmVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9ySG9zdCBhcyBhbnksIHRoaXMuX3N0YXRpY1N5bWJvbENhY2hlLCB0aGlzLl9zdW1tYXJ5UmVzb2x2ZXIsXG4gICAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCAhKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogU3RhdGljUmVmbGVjdG9yIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5fcmVmbGVjdG9yO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICBjb25zdCBzc3IgPSB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyO1xuICAgICAgcmVzdWx0ID0gdGhpcy5fcmVmbGVjdG9yID0gbmV3IFN0YXRpY1JlZmxlY3RvcihcbiAgICAgICAgICB0aGlzLl9zdW1tYXJ5UmVzb2x2ZXIsIHNzciwgW10sIFtdLCAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoICEpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVDbGFzc0Zyb21TdGF0aWNTeW1ib2wodHlwZTogU3RhdGljU3ltYm9sKTogdHMuQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQoc291cmNlLCBjaGlsZCA9PiB7XG4gICAgICAgIGlmIChjaGlsZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gY2hpbGQgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lICE9IG51bGwgJiYgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQgPT09IHR5cGUubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbk5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgbWlzc2luZ1RlbXBsYXRlOiBbdHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZCwgdHMuRXhwcmVzc2lvbnx1bmRlZmluZWRdID1cbiAgICAgIFt1bmRlZmluZWQsIHVuZGVmaW5lZF07XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgdGVtcGxhdGUgc3RyaW5nIG5vZGUsIHNlZSBpZiBpdCBpcyBhbiBBbmd1bGFyIHRlbXBsYXRlIHN0cmluZywgYW5kIGlmIHNvIHJldHVybiB0aGVcbiAgICogY29udGFpbmluZyBjbGFzcy5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVDbGFzc0RlY2xGcm9tTm9kZShjdXJyZW50VG9rZW46IHRzLk5vZGUpOlxuICAgICAgW3RzLkNsYXNzRGVjbGFyYXRpb24gfCB1bmRlZmluZWQsIHRzLkV4cHJlc3Npb258dW5kZWZpbmVkXSB7XG4gICAgLy8gVmVyaWZ5IHdlIGFyZSBpbiBhICd0ZW1wbGF0ZScgcHJvcGVydHkgYXNzaWdubWVudCwgaW4gYW4gb2JqZWN0IGxpdGVyYWwsIHdoaWNoIGlzIGFuIGNhbGxcbiAgICAvLyBhcmcsIGluIGEgZGVjb3JhdG9yXG4gICAgbGV0IHBhcmVudE5vZGUgPSBjdXJyZW50VG9rZW4ucGFyZW50OyAgLy8gUHJvcGVydHlBc3NpZ25tZW50XG4gICAgaWYgKCFwYXJlbnROb2RlKSB7XG4gICAgICByZXR1cm4gVHlwZVNjcmlwdFNlcnZpY2VIb3N0Lm1pc3NpbmdUZW1wbGF0ZTtcbiAgICB9XG4gICAgaWYgKHBhcmVudE5vZGUua2luZCAhPT0gdHMuU3ludGF4S2luZC5Qcm9wZXJ0eUFzc2lnbm1lbnQpIHtcbiAgICAgIHJldHVybiBUeXBlU2NyaXB0U2VydmljZUhvc3QubWlzc2luZ1RlbXBsYXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPOiBJcyB0aGlzIGRpZmZlcmVudCBmb3IgYSBsaXRlcmFsLCBpLmUuIGEgcXVvdGVkIHByb3BlcnR5IG5hbWUgbGlrZSBcInRlbXBsYXRlXCI/XG4gICAgICBpZiAoKHBhcmVudE5vZGUgYXMgYW55KS5uYW1lLnRleHQgIT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgICB9XG4gICAgfVxuICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLnBhcmVudDsgIC8vIE9iamVjdExpdGVyYWxFeHByZXNzaW9uXG4gICAgaWYgKCFwYXJlbnROb2RlIHx8IHBhcmVudE5vZGUua2luZCAhPT0gdHMuU3ludGF4S2luZC5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50OyAgLy8gQ2FsbEV4cHJlc3Npb25cbiAgICBpZiAoIXBhcmVudE5vZGUgfHwgcGFyZW50Tm9kZS5raW5kICE9PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICByZXR1cm4gVHlwZVNjcmlwdFNlcnZpY2VIb3N0Lm1pc3NpbmdUZW1wbGF0ZTtcbiAgICB9XG4gICAgY29uc3QgY2FsbFRhcmdldCA9ICg8dHMuQ2FsbEV4cHJlc3Npb24+cGFyZW50Tm9kZSkuZXhwcmVzc2lvbjtcblxuICAgIGxldCBkZWNvcmF0b3IgPSBwYXJlbnROb2RlLnBhcmVudDsgIC8vIERlY29yYXRvclxuICAgIGlmICghZGVjb3JhdG9yIHx8IGRlY29yYXRvci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkRlY29yYXRvcikge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgbGV0IGRlY2xhcmF0aW9uID0gPHRzLkNsYXNzRGVjbGFyYXRpb24+ZGVjb3JhdG9yLnBhcmVudDsgIC8vIENsYXNzRGVjbGFyYXRpb25cbiAgICBpZiAoIWRlY2xhcmF0aW9uIHx8IGRlY2xhcmF0aW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuICAgIHJldHVybiBbZGVjbGFyYXRpb24sIGNhbGxUYXJnZXRdO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb2xsZWN0ZWRFcnJvcnMoZGVmYXVsdFNwYW46IFNwYW4sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBEZWNsYXJhdGlvbkVycm9yW10ge1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICByZXR1cm4gKGVycm9ycyAmJiBlcnJvcnMubWFwKChlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICBjb25zdCBsaW5lID0gZS5saW5lIHx8IChlLnBvc2l0aW9uICYmIGUucG9zaXRpb24ubGluZSk7XG4gICAgICAgICAgICAgY29uc3QgY29sdW1uID0gZS5jb2x1bW4gfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5jb2x1bW4pO1xuICAgICAgICAgICAgIGNvbnN0IHNwYW4gPSBzcGFuQXQoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKSB8fCBkZWZhdWx0U3BhbjtcbiAgICAgICAgICAgICBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yVG9EaWFnbm9zdGljV2l0aENoYWluKGUsIHNwYW4pO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXR1cm4ge21lc3NhZ2U6IGUubWVzc2FnZSwgc3Bhbn07XG4gICAgICAgICAgIH0pKSB8fFxuICAgICAgICBbXTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVjbGFyYXRpb25Gcm9tTm9kZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBub2RlOiB0cy5Ob2RlKTogRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgICBpZiAobm9kZS5raW5kID09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbiAmJiBub2RlLmRlY29yYXRvcnMgJiZcbiAgICAgICAgKG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbikubmFtZSkge1xuICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2Ygbm9kZS5kZWNvcmF0b3JzKSB7XG4gICAgICAgIGlmIChkZWNvcmF0b3IuZXhwcmVzc2lvbiAmJiBkZWNvcmF0b3IuZXhwcmVzc2lvbi5raW5kID09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGwgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGNhbGwuZXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24odGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRpY1N5bWJvbCA9XG4gICAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woc291cmNlRmlsZS5maWxlTmFtZSwgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQpO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlc29sdmVyLmlzRGlyZWN0aXZlKHN0YXRpY1N5bWJvbCBhcyBhbnkpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7bWV0YWRhdGF9ID1cbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShzdGF0aWNTeW1ib2wgYXMgYW55KSAhO1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKHRhcmdldCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBzdGF0aWNTeW1ib2wsXG4gICAgICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yczogdGhpcy5nZXRDb2xsZWN0ZWRFcnJvcnMoZGVjbGFyYXRpb25TcGFuLCBzb3VyY2VGaWxlKVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RFcnJvcihlLCBzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uU3BhbiA9IHNwYW5PZih0YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogc3RhdGljU3ltYm9sLFxuICAgICAgICAgICAgICAgICAgICBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgICAgICAgICAgICAgIGVycm9yczogdGhpcy5nZXRDb2xsZWN0ZWRFcnJvcnMoZGVjbGFyYXRpb25TcGFuLCBzb3VyY2VGaWxlKVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0cmluZ09mKG5vZGU6IHRzLk5vZGUpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsOlxuICAgICAgICByZXR1cm4gKDx0cy5MaXRlcmFsRXhwcmVzc2lvbj5ub2RlKS50ZXh0O1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgIHJldHVybiAoPHRzLlN0cmluZ0xpdGVyYWw+bm9kZSkudGV4dDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZpbmROb2RlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfHVuZGVmaW5lZCB7XG4gICAgZnVuY3Rpb24gZmluZChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICAgICAgaWYgKHBvc2l0aW9uID49IG5vZGUuZ2V0U3RhcnQoKSAmJiBwb3NpdGlvbiA8IG5vZGUuZ2V0RW5kKCkpIHtcbiAgICAgICAgcmV0dXJuIHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kKSB8fCBub2RlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmaW5kKHNvdXJjZUZpbGUpO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLmdldFRlbXBsYXRlQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgIGxldCBhc3RSZXN1bHQgPSB0aGlzLmdldFRlbXBsYXRlQXN0KHRlbXBsYXRlLCBmaWxlTmFtZSk7XG4gICAgICBpZiAoYXN0UmVzdWx0ICYmIGFzdFJlc3VsdC5odG1sQXN0ICYmIGFzdFJlc3VsdC50ZW1wbGF0ZUFzdCAmJiBhc3RSZXN1bHQuZGlyZWN0aXZlICYmXG4gICAgICAgICAgYXN0UmVzdWx0LmRpcmVjdGl2ZXMgJiYgYXN0UmVzdWx0LnBpcGVzICYmIGFzdFJlc3VsdC5leHByZXNzaW9uUGFyc2VyKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBvc2l0aW9uLFxuICAgICAgICAgIGZpbGVOYW1lLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGh0bWxBc3Q6IGFzdFJlc3VsdC5odG1sQXN0LFxuICAgICAgICAgIGRpcmVjdGl2ZTogYXN0UmVzdWx0LmRpcmVjdGl2ZSxcbiAgICAgICAgICBkaXJlY3RpdmVzOiBhc3RSZXN1bHQuZGlyZWN0aXZlcyxcbiAgICAgICAgICBwaXBlczogYXN0UmVzdWx0LnBpcGVzLFxuICAgICAgICAgIHRlbXBsYXRlQXN0OiBhc3RSZXN1bHQudGVtcGxhdGVBc3QsXG4gICAgICAgICAgZXhwcmVzc2lvblBhcnNlcjogYXN0UmVzdWx0LmV4cHJlc3Npb25QYXJzZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldFRlbXBsYXRlQXN0KHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZSwgY29udGV4dEZpbGU6IHN0cmluZyk6IEFzdFJlc3VsdCB7XG4gICAgbGV0IHJlc3VsdDogQXN0UmVzdWx0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzb2x2ZWRNZXRhZGF0YSA9XG4gICAgICAgICAgdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEodGVtcGxhdGUudHlwZSBhcyBhbnkpO1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSByZXNvbHZlZE1ldGFkYXRhICYmIHJlc29sdmVkTWV0YWRhdGEubWV0YWRhdGE7XG4gICAgICBpZiAobWV0YWRhdGEpIHtcbiAgICAgICAgY29uc3QgcmF3SHRtbFBhcnNlciA9IG5ldyBIdG1sUGFyc2VyKCk7XG4gICAgICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSTE4Tkh0bWxQYXJzZXIocmF3SHRtbFBhcnNlcik7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb25QYXJzZXIgPSBuZXcgUGFyc2VyKG5ldyBMZXhlcigpKTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gbmV3IENvbXBpbGVyQ29uZmlnKCk7XG4gICAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBUZW1wbGF0ZVBhcnNlcihcbiAgICAgICAgICAgIGNvbmZpZywgdGhpcy5yZXNvbHZlci5nZXRSZWZsZWN0b3IoKSwgZXhwcmVzc2lvblBhcnNlciwgbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgICAgICAgaHRtbFBhcnNlciwgbnVsbCAhLCBbXSk7XG4gICAgICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgJycsIHt0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlfSk7XG4gICAgICAgIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IHRoaXMuZ2V0QW5hbHl6ZWRNb2R1bGVzKCk7XG4gICAgICAgIGxldCBlcnJvcnM6IERpYWdub3N0aWNbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBuZ01vZHVsZSA9IGFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldCh0ZW1wbGF0ZS50eXBlKTtcbiAgICAgICAgaWYgKCFuZ01vZHVsZSkge1xuICAgICAgICAgIC8vIFJlcG9ydGVkIGJ5IHRoZSB0aGUgZGVjbGFyYXRpb24gZGlhZ25vc3RpY3MuXG4gICAgICAgICAgbmdNb2R1bGUgPSBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKGFuYWx5emVkTW9kdWxlcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5nTW9kdWxlKSB7XG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9XG4gICAgICAgICAgICAgIG5nTW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUuZGlyZWN0aXZlc1xuICAgICAgICAgICAgICAgICAgLm1hcChkID0+IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGQucmVmZXJlbmNlKSlcbiAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZCA9PiBkKVxuICAgICAgICAgICAgICAgICAgLm1hcChkID0+IGQgIS5tZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgICAgICAgY29uc3QgcGlwZXMgPSBuZ01vZHVsZS50cmFuc2l0aXZlTW9kdWxlLnBpcGVzLm1hcChcbiAgICAgICAgICAgICAgcCA9PiB0aGlzLnJlc29sdmVyLmdldE9yTG9hZFBpcGVNZXRhZGF0YShwLnJlZmVyZW5jZSkudG9TdW1tYXJ5KCkpO1xuICAgICAgICAgIGNvbnN0IHNjaGVtYXMgPSBuZ01vZHVsZS5zY2hlbWFzO1xuICAgICAgICAgIGNvbnN0IHBhcnNlUmVzdWx0ID0gcGFyc2VyLnRyeVBhcnNlSHRtbChodG1sUmVzdWx0LCBtZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgICAgICAgZGlyZWN0aXZlOiBtZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsXG4gICAgICAgICAgICBwYXJzZUVycm9yczogcGFyc2VSZXN1bHQuZXJyb3JzLCBleHByZXNzaW9uUGFyc2VyLCBlcnJvcnNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbGV0IHNwYW4gPSB0ZW1wbGF0ZS5zcGFuO1xuICAgICAgaWYgKGUuZmlsZU5hbWUgPT0gY29udGV4dEZpbGUpIHtcbiAgICAgICAgc3BhbiA9IHRlbXBsYXRlLnF1ZXJ5LmdldFNwYW5BdChlLmxpbmUsIGUuY29sdW1uKSB8fCBzcGFuO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0ge2Vycm9yczogW3traW5kOiBEaWFnbm9zdGljS2luZC5FcnJvciwgbWVzc2FnZTogZS5tZXNzYWdlLCBzcGFufV19O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IHt9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUobW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQge1xuICBsZXQgcmVzdWx0OiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCByZXN1bHRTaXplID0gMDtcbiAgZm9yIChjb25zdCBtb2R1bGUgb2YgbW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICBjb25zdCBtb2R1bGVTaXplID0gbW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUuZGlyZWN0aXZlcy5sZW5ndGg7XG4gICAgaWYgKG1vZHVsZVNpemUgPiByZXN1bHRTaXplKSB7XG4gICAgICByZXN1bHQgPSBtb2R1bGU7XG4gICAgICByZXN1bHRTaXplID0gbW9kdWxlU2l6ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZmluZFRzQ29uZmlnKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgbGV0IGRpciA9IHBhdGguZGlybmFtZShmaWxlTmFtZSk7XG4gIHdoaWxlIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBwYXRoLmpvaW4oZGlyLCAndHNjb25maWcuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHJldHVybiBjYW5kaWRhdGU7XG4gICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gZGlyKSBicmVhaztcbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3Bhbk9mKG5vZGU6IHRzLk5vZGUpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xufVxuXG5mdW5jdGlvbiBzaHJpbmsoc3BhbjogU3Bhbiwgb2Zmc2V0PzogbnVtYmVyKSB7XG4gIGlmIChvZmZzZXQgPT0gbnVsbCkgb2Zmc2V0ID0gMTtcbiAgcmV0dXJuIHtzdGFydDogc3Bhbi5zdGFydCArIG9mZnNldCwgZW5kOiBzcGFuLmVuZCAtIG9mZnNldH07XG59XG5cbmZ1bmN0aW9uIHNwYW5BdChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTogU3Bhbnx1bmRlZmluZWQge1xuICBpZiAobGluZSAhPSBudWxsICYmIGNvbHVtbiAhPSBudWxsKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0cy5nZXRQb3NpdGlvbk9mTGluZUFuZENoYXJhY3Rlcihzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pO1xuICAgIGNvbnN0IGZpbmRDaGlsZCA9IGZ1bmN0aW9uIGZpbmRDaGlsZChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB8IHVuZGVmaW5lZCB7XG4gICAgICBpZiAobm9kZS5raW5kID4gdHMuU3ludGF4S2luZC5MYXN0VG9rZW4gJiYgbm9kZS5wb3MgPD0gcG9zaXRpb24gJiYgbm9kZS5lbmQgPiBwb3NpdGlvbikge1xuICAgICAgICBjb25zdCBiZXR0ZXJOb2RlID0gdHMuZm9yRWFjaENoaWxkKG5vZGUsIGZpbmRDaGlsZCk7XG4gICAgICAgIHJldHVybiBiZXR0ZXJOb2RlIHx8IG5vZGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZmluZENoaWxkKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge21lc3NhZ2U6IGNoYWluLm1lc3NhZ2UsIG5leHQ6IGNoYWluLm5leHQgPyBjb252ZXJ0Q2hhaW4oY2hhaW4ubmV4dCkgOiB1bmRlZmluZWR9O1xufVxuXG5mdW5jdGlvbiBlcnJvclRvRGlhZ25vc3RpY1dpdGhDaGFpbihlcnJvcjogRm9ybWF0dGVkRXJyb3IsIHNwYW46IFNwYW4pOiBEZWNsYXJhdGlvbkVycm9yIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBlcnJvci5jaGFpbiA/IGNvbnZlcnRDaGFpbihlcnJvci5jaGFpbikgOiBlcnJvci5tZXNzYWdlLCBzcGFufTtcbn1cbiJdfQ==