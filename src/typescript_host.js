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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/core", "typescript", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var core_1 = require("@angular/core");
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
        function TypeScriptServiceHost(host, tsLS) {
            var _this = this;
            this.host = host;
            this.tsLS = tsLS;
            this.staticSymbolCache = new compiler_1.StaticSymbolCache();
            this.fileToComponent = new Map();
            this.collectedErrors = new Map();
            this.fileVersions = new Map();
            this.lastProgram = undefined;
            this.templateReferences = [];
            this.analyzedModules = {
                files: [],
                ngModuleByPipeOrDirective: new Map(),
                ngModules: [],
            };
            // Data members below are prefixed with '_' because they have corresponding
            // getters. These properties get invalidated when caches are cleared.
            this._resolver = null;
            this._reflector = null;
            this.summaryResolver = new compiler_1.AotSummaryResolver({
                loadSummary: function (filePath) { return null; },
                isSourceFile: function (sourceFilePath) { return true; },
                toSummaryFileName: function (sourceFilePath) { return sourceFilePath; },
                fromSummaryFileName: function (filePath) { return filePath; },
            }, this.staticSymbolCache);
            this.reflectorHost = new reflector_host_1.ReflectorHost(function () { return tsLS.getProgram(); }, host);
            this.staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this.staticSymbolCache, this.summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
        }
        Object.defineProperty(TypeScriptServiceHost.prototype, "resolver", {
            get: function () {
                var _this = this;
                if (!this._resolver) {
                    var moduleResolver = new compiler_1.NgModuleResolver(this.reflector);
                    var directiveResolver = new compiler_1.DirectiveResolver(this.reflector);
                    var pipeResolver = new compiler_1.PipeResolver(this.reflector);
                    var elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
                    var resourceLoader = new DummyResourceLoader();
                    var urlResolver = compiler_1.createOfflineCompileUrlResolver();
                    var htmlParser = new DummyHtmlParser();
                    // This tracks the CompileConfig in codegen.ts. Currently these options
                    // are hard-coded.
                    var config = new compiler_1.CompilerConfig({
                        defaultEncapsulation: core_1.ViewEncapsulation.Emulated,
                        useJit: false,
                    });
                    var directiveNormalizer = new compiler_1.DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
                    this._resolver = new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this.staticSymbolCache, this.reflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
                }
                return this._resolver;
            },
            enumerable: true,
            configurable: true
        });
        TypeScriptServiceHost.prototype.getTemplateReferences = function () { return tslib_1.__spread(this.templateReferences); };
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
                    var node = this.findNode(sourceFile, position);
                    if (node) {
                        return this.getSourceFromNode(fileName, node);
                    }
                }
            }
            else {
                var componentSymbol = this.fileToComponent.get(fileName);
                if (componentSymbol) {
                    return this.getSourceFromType(fileName, componentSymbol);
                }
            }
            return undefined;
        };
        /**
         * Checks whether the program has changed and returns all analyzed modules.
         * If program has changed, invalidate all caches and update fileToComponent
         * and templateReferences.
         * In addition to returning information about NgModules, this method plays the
         * same role as 'synchronizeHostData' in tsserver.
         */
        TypeScriptServiceHost.prototype.getAnalyzedModules = function () {
            var e_1, _a, e_2, _b;
            if (this.upToDate()) {
                return this.analyzedModules;
            }
            // Invalidate caches
            this.templateReferences = [];
            this.fileToComponent.clear();
            this.collectedErrors.clear();
            var analyzeHost = { isSourceFile: function (filePath) { return true; } };
            var programFiles = this.program.getSourceFiles().map(function (sf) { return sf.fileName; });
            this.analyzedModules =
                compiler_1.analyzeNgModules(programFiles, analyzeHost, this.staticSymbolResolver, this.resolver);
            // update template references and fileToComponent
            var urlResolver = compiler_1.createOfflineCompileUrlResolver();
            try {
                for (var _c = tslib_1.__values(this.analyzedModules.ngModules), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var ngModule = _d.value;
                    try {
                        for (var _e = (e_2 = void 0, tslib_1.__values(ngModule.declaredDirectives)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var directive = _f.value;
                            var metadata = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference).metadata;
                            if (metadata.isComponent && metadata.template && metadata.template.templateUrl) {
                                var templateName = urlResolver.resolve(this.reflector.componentModuleUrl(directive.reference), metadata.template.templateUrl);
                                this.fileToComponent.set(templateName, directive.reference);
                                this.templateReferences.push(templateName);
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.analyzedModules;
        };
        TypeScriptServiceHost.prototype.getTemplates = function (fileName) {
            var _this = this;
            var results = [];
            if (fileName.endsWith('.ts')) {
                // Find every template string in the file
                var visit_1 = function (child) {
                    var templateSource = _this.getSourceFromNode(fileName, child);
                    if (templateSource) {
                        results.push(templateSource);
                    }
                    else {
                        ts.forEachChild(child, visit_1);
                    }
                };
                var sourceFile = this.getSourceFile(fileName);
                if (sourceFile) {
                    ts.forEachChild(sourceFile, visit_1);
                }
            }
            else {
                var componentSymbol = this.fileToComponent.get(fileName);
                if (componentSymbol) {
                    var templateSource = this.getTemplateAt(fileName, 0);
                    if (templateSource) {
                        results.push(templateSource);
                    }
                }
            }
            return results;
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
            return this.program.getSourceFile(fileName);
        };
        Object.defineProperty(TypeScriptServiceHost.prototype, "program", {
            get: function () {
                var program = this.tsLS.getProgram();
                if (!program) {
                    // Program is very very unlikely to be undefined.
                    throw new Error('No program in language service!');
                }
                return program;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Checks whether the program has changed, and invalidate caches if it has.
         * Returns true if modules are up-to-date, false otherwise.
         * This should only be called by getAnalyzedModules().
         */
        TypeScriptServiceHost.prototype.upToDate = function () {
            var e_3, _a;
            var _this = this;
            var program = this.program;
            if (this.lastProgram === program) {
                return true;
            }
            this._resolver = null;
            this._reflector = null;
            // Invalidate file that have changed in the static symbol resolver
            var seen = new Set();
            try {
                for (var _b = tslib_1.__values(program.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sourceFile = _c.value;
                    var fileName = sourceFile.fileName;
                    seen.add(fileName);
                    var version = this.host.getScriptVersion(fileName);
                    var lastVersion = this.fileVersions.get(fileName);
                    if (version !== lastVersion) {
                        this.fileVersions.set(fileName, version);
                        this.staticSymbolResolver.invalidateFile(fileName);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // Remove file versions that are no longer in the file and invalidate them.
            var missing = Array.from(this.fileVersions.keys()).filter(function (f) { return !seen.has(f); });
            missing.forEach(function (f) {
                _this.fileVersions.delete(f);
                _this.staticSymbolResolver.invalidateFile(f);
            });
            this.lastProgram = program;
            return false;
        };
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
        TypeScriptServiceHost.prototype.getSourceFromDeclaration = function (fileName, source, span, classSymbol, declaration, node, sourceFile) {
            var queryCache = undefined;
            var self = this;
            var program = this.program;
            var typeChecker = program.getTypeChecker();
            if (declaration) {
                return {
                    version: this.host.getScriptVersion(fileName),
                    source: source,
                    span: span,
                    type: classSymbol,
                    get members() {
                        return language_services_1.getClassMembersFromDeclaration(program, typeChecker, sourceFile, declaration);
                    },
                    get query() {
                        if (!queryCache) {
                            var templateInfo = self.getTemplateAst(this, fileName);
                            var pipes_1 = templateInfo && templateInfo.pipes || [];
                            queryCache = language_services_1.getSymbolQuery(program, typeChecker, sourceFile, function () { return language_services_1.getPipesTable(sourceFile, program, typeChecker, pipes_1); });
                        }
                        return queryCache;
                    }
                };
            }
        };
        /**
         * Return the TemplateSource for the inline template.
         * @param fileName TS file that contains the template
         * @param node Potential template node
         */
        TypeScriptServiceHost.prototype.getSourceFromNode = function (fileName, node) {
            switch (node.kind) {
                case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                case ts.SyntaxKind.StringLiteral:
                    var _a = tslib_1.__read(this.getTemplateClassDeclFromNode(node), 1), declaration = _a[0];
                    if (declaration && declaration.name) {
                        var sourceFile = this.getSourceFile(fileName);
                        if (sourceFile) {
                            return this.getSourceFromDeclaration(fileName, this.stringOf(node) || '', shrink(spanOf(node)), this.reflector.getStaticSymbol(sourceFile.fileName, declaration.name.text), declaration, node, sourceFile);
                        }
                    }
                    break;
            }
            return;
        };
        /**
         * Return the TemplateSource for the template associated with the classSymbol.
         * @param fileName Template file (HTML)
         * @param classSymbol
         */
        TypeScriptServiceHost.prototype.getSourceFromType = function (fileName, classSymbol) {
            var declaration = this.getTemplateClassFromStaticSymbol(classSymbol);
            if (declaration) {
                var snapshot = this.host.getScriptSnapshot(fileName);
                if (snapshot) {
                    var source = snapshot.getText(0, snapshot.getLength());
                    return this.getSourceFromDeclaration(fileName, source, { start: 0, end: source.length }, classSymbol, declaration, declaration, declaration.getSourceFile());
                }
            }
            return;
        };
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
        Object.defineProperty(TypeScriptServiceHost.prototype, "reflector", {
            get: function () {
                var _this = this;
                if (!this._reflector) {
                    this._reflector = new compiler_1.StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], // knownMetadataClasses
                    [], // knownMetadataFunctions
                    function (e, filePath) { return _this.collectError(e, filePath); });
                }
                return this._reflector;
            },
            enumerable: true,
            configurable: true
        });
        TypeScriptServiceHost.prototype.getTemplateClassFromStaticSymbol = function (type) {
            var source = this.getSourceFile(type.filePath);
            if (!source) {
                return;
            }
            var declarationNode = ts.forEachChild(source, function (child) {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    var classDeclaration = child;
                    if (classDeclaration.name && classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
            return declarationNode;
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
                                var type = this.program.getTypeChecker().getTypeAtLocation(target);
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
            if (!template) {
                return;
            }
            var astResult = this.getTemplateAst(template, fileName);
            if (astResult && astResult.htmlAst && astResult.templateAst && astResult.directive &&
                astResult.directives && astResult.pipes && astResult.expressionParser) {
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
        };
        TypeScriptServiceHost.prototype.getTemplateAst = function (template, contextFile) {
            var _this = this;
            try {
                var resolvedMetadata = this.resolver.getNonNormalizedDirectiveMetadata(template.type);
                var metadata = resolvedMetadata && resolvedMetadata.metadata;
                if (!metadata) {
                    return {};
                }
                var rawHtmlParser = new compiler_1.HtmlParser();
                var htmlParser = new compiler_1.I18NHtmlParser(rawHtmlParser);
                var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
                var config = new compiler_1.CompilerConfig();
                var parser = new compiler_1.TemplateParser(config, this.resolver.getReflector(), expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, []);
                var htmlResult = htmlParser.parse(template.source, '', { tokenizeExpansionForms: true });
                var errors = undefined;
                var ngModule = this.analyzedModules.ngModuleByPipeOrDirective.get(template.type) ||
                    // Reported by the the declaration diagnostics.
                    findSuitableDefaultModule(this.analyzedModules);
                if (!ngModule) {
                    return {};
                }
                var directives = ngModule.transitiveModule.directives
                    .map(function (d) { return _this.resolver.getNonNormalizedDirectiveMetadata(d.reference); })
                    .filter(function (d) { return d; })
                    .map(function (d) { return d.metadata.toSummary(); });
                var pipes = ngModule.transitiveModule.pipes.map(function (p) { return _this.resolver.getOrLoadPipeMetadata(p.reference).toSummary(); });
                var schemas = ngModule.schemas;
                var parseResult = parser.tryParseHtml(htmlResult, metadata, directives, pipes, schemas);
                return {
                    htmlAst: htmlResult.rootNodes,
                    templateAst: parseResult.templateAst,
                    directive: metadata, directives: directives, pipes: pipes,
                    parseErrors: parseResult.errors, expressionParser: expressionParser, errors: errors
                };
            }
            catch (e) {
                var span = e.fileName === contextFile && template.query.getSpanAt(e.line, e.column) || template.span;
                return {
                    errors: [{
                            kind: types_1.DiagnosticKind.Error,
                            message: e.message, span: span,
                        }],
                };
            }
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
                var module_1 = _c.value;
                var moduleSize = module_1.transitiveModule.directives.length;
                if (moduleSize > resultSize) {
                    result = module_1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnaEI7SUFDaGhCLGlGQUEwSDtJQUMxSCxzQ0FBcUU7SUFDckUsK0JBQWlDO0lBR2pDLG1GQUF5RDtJQUN6RCwrRUFBK0M7SUFDL0MsNkRBQWlNO0lBRWpNOztPQUVHO0lBQ0gsU0FBZ0IsbUNBQW1DLENBQy9DLElBQTRCLEVBQUUsT0FBMkI7UUFDM0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBTSxRQUFRLEdBQUcsd0NBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUxELGtGQUtDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQUFxQywyQ0FBVTtRQUEvQzs7UUFFQSxDQUFDO1FBREMsK0JBQUssR0FBTCxjQUEyQixPQUFPLElBQUksMEJBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLHNCQUFDO0lBQUQsQ0FBQyxBQUZELENBQXFDLHFCQUFVLEdBRTlDO0lBRlksMENBQWU7SUFJNUI7O09BRUc7SUFDSDtRQUF5QywrQ0FBYztRQUF2RDs7UUFFQSxDQUFDO1FBREMsaUNBQUcsR0FBSCxVQUFJLEdBQVcsSUFBcUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSwwQkFBQztJQUFELENBQUMsQUFGRCxDQUF5Qyx5QkFBYyxHQUV0RDtJQUZZLGtEQUFtQjtJQUloQzs7Ozs7OztPQU9HO0lBQ0g7UUF1QkUsK0JBQ3FCLElBQTRCLEVBQW1C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QUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FBQyxLQUFxQixFQUFFLElBQVU7UUFDbkUsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7SUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RTdW1tYXJ5UmVzb2x2ZXIsIENvbXBpbGVNZXRhZGF0YVJlc29sdmVyLCBDb21waWxlTmdNb2R1bGVNZXRhZGF0YSwgQ29tcGlsZXJDb25maWcsIERpcmVjdGl2ZU5vcm1hbGl6ZXIsIERpcmVjdGl2ZVJlc29sdmVyLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEZvcm1hdHRlZEVycm9yLCBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4sIEh0bWxQYXJzZXIsIEkxOE5IdG1sUGFyc2VyLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VUcmVlUmVzdWx0LCBQYXJzZXIsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyLCBhbmFseXplTmdNb2R1bGVzLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBpc0Zvcm1hdHRlZEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbiwgZ2V0UGlwZXNUYWJsZSwgZ2V0U3ltYm9sUXVlcnl9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0IHtWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBUZW1wbGF0ZUluZm99IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtSZWZsZWN0b3JIb3N0fSBmcm9tICcuL3JlZmxlY3Rvcl9ob3N0JztcbmltcG9ydCB7RGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRXJyb3IsIERlY2xhcmF0aW9ucywgRGlhZ25vc3RpYywgRGlhZ25vc3RpY0tpbmQsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIExhbmd1YWdlU2VydmljZSwgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgU3BhbiwgU3ltYm9sUXVlcnksIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDcmVhdGUgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZUZyb21UeXBlc2NyaXB0KFxuICAgIGhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHNlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZSk6IExhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IG5nSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaG9zdCwgc2VydmljZSk7XG4gIGNvbnN0IG5nU2VydmVyID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKG5nSG9zdCk7XG4gIHJldHVybiBuZ1NlcnZlcjtcbn1cblxuLyoqXG4gKiBUaGUgbGFuZ3VhZ2Ugc2VydmljZSBuZXZlciBuZWVkcyB0aGUgbm9ybWFsaXplZCB2ZXJzaW9ucyBvZiB0aGUgbWV0YWRhdGEuIFRvIGF2b2lkIHBhcnNpbmdcbiAqIHRoZSBjb250ZW50IGFuZCByZXNvbHZpbmcgcmVmZXJlbmNlcywgcmV0dXJuIGFuIGVtcHR5IGZpbGUuIFRoaXMgYWxzbyBhbGxvd3Mgbm9ybWFsaXppbmdcbiAqIHRlbXBsYXRlIHRoYXQgYXJlIHN5bnRhdGljYWxseSBpbmNvcnJlY3Qgd2hpY2ggaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSBjb21wbGV0aW9ucyBpblxuICogc3ludGFjdGljYWxseSBpbmNvcnJlY3QgdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlIdG1sUGFyc2VyIGV4dGVuZHMgSHRtbFBhcnNlciB7XG4gIHBhcnNlKCk6IFBhcnNlVHJlZVJlc3VsdCB7IHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFtdLCBbXSk7IH1cbn1cblxuLyoqXG4gKiBBdm9pZCBsb2FkaW5nIHJlc291cmNlcyBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmNpZSBieSB1c2luZyBhIGR1bW15IGxvYWRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15UmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoJycpOyB9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgZm9yIGEgVHlwZVNjcmlwdCBwcm9qZWN0LlxuICpcbiAqIFRoZSBgVHlwZVNjcmlwdFNlcnZpY2VIb3N0YCBpbXBsZW1lbnRzIHRoZSBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCB1c2luZ1xuICogdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZXMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFNlcnZpY2VIb3N0IGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3VtbWFyeVJlc29sdmVyOiBBb3RTdW1tYXJ5UmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVmbGVjdG9ySG9zdDogUmVmbGVjdG9ySG9zdDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXI7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xDYWNoZSA9IG5ldyBTdGF0aWNTeW1ib2xDYWNoZSgpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVUb0NvbXBvbmVudCA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0aWNTeW1ib2w+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29sbGVjdGVkRXJyb3JzID0gbmV3IE1hcDxzdHJpbmcsIGFueVtdPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgcHJpdmF0ZSBsYXN0UHJvZ3JhbTogdHMuUHJvZ3JhbXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgdGVtcGxhdGVSZWZlcmVuY2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gICAgZmlsZXM6IFtdLFxuICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICBuZ01vZHVsZXM6IFtdLFxuICB9O1xuXG4gIC8vIERhdGEgbWVtYmVycyBiZWxvdyBhcmUgcHJlZml4ZWQgd2l0aCAnXycgYmVjYXVzZSB0aGV5IGhhdmUgY29ycmVzcG9uZGluZ1xuICAvLyBnZXR0ZXJzLiBUaGVzZSBwcm9wZXJ0aWVzIGdldCBpbnZhbGlkYXRlZCB3aGVuIGNhY2hlcyBhcmUgY2xlYXJlZC5cbiAgcHJpdmF0ZSBfcmVzb2x2ZXI6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9yZWZsZWN0b3I6IFN0YXRpY1JlZmxlY3RvcnxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciA9IG5ldyBBb3RTdW1tYXJ5UmVzb2x2ZXIoXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgICAgIGlzU291cmNlRmlsZShzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgICAgIHRvU3VtbWFyeUZpbGVOYW1lKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHNvdXJjZUZpbGVQYXRoOyB9LFxuICAgICAgICAgIGZyb21TdW1tYXJ5RmlsZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3tyZXR1cm4gZmlsZVBhdGg7fSxcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSk7XG4gICAgdGhpcy5yZWZsZWN0b3JIb3N0ID0gbmV3IFJlZmxlY3Rvckhvc3QoKCkgPT4gdHNMUy5nZXRQcm9ncmFtKCkgISwgaG9zdCk7XG4gICAgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlciA9IG5ldyBTdGF0aWNTeW1ib2xSZXNvbHZlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0b3JIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbENhY2hlLCB0aGlzLnN1bW1hcnlSZXNvbHZlcixcbiAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCAhKSk7XG4gIH1cblxuICBwcml2YXRlIGdldCByZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7XG4gICAgaWYgKCF0aGlzLl9yZXNvbHZlcikge1xuICAgICAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTmdNb2R1bGVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgICBjb25zdCBkaXJlY3RpdmVSZXNvbHZlciA9IG5ldyBEaXJlY3RpdmVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgICBjb25zdCBwaXBlUmVzb2x2ZXIgPSBuZXcgUGlwZVJlc29sdmVyKHRoaXMucmVmbGVjdG9yKTtcbiAgICAgIGNvbnN0IGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbiAgICAgIGNvbnN0IHJlc291cmNlTG9hZGVyID0gbmV3IER1bW15UmVzb3VyY2VMb2FkZXIoKTtcbiAgICAgIGNvbnN0IHVybFJlc29sdmVyID0gY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlcigpO1xuICAgICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBEdW1teUh0bWxQYXJzZXIoKTtcbiAgICAgIC8vIFRoaXMgdHJhY2tzIHRoZSBDb21waWxlQ29uZmlnIGluIGNvZGVnZW4udHMuIEN1cnJlbnRseSB0aGVzZSBvcHRpb25zXG4gICAgICAvLyBhcmUgaGFyZC1jb2RlZC5cbiAgICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBDb21waWxlckNvbmZpZyh7XG4gICAgICAgIGRlZmF1bHRFbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgICAgdXNlSml0OiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGlyZWN0aXZlTm9ybWFsaXplciA9XG4gICAgICAgICAgbmV3IERpcmVjdGl2ZU5vcm1hbGl6ZXIocmVzb3VyY2VMb2FkZXIsIHVybFJlc29sdmVyLCBodG1sUGFyc2VyLCBjb25maWcpO1xuXG4gICAgICB0aGlzLl9yZXNvbHZlciA9IG5ldyBDb21waWxlTWV0YWRhdGFSZXNvbHZlcihcbiAgICAgICAgICBjb25maWcsIGh0bWxQYXJzZXIsIG1vZHVsZVJlc29sdmVyLCBkaXJlY3RpdmVSZXNvbHZlciwgcGlwZVJlc29sdmVyLFxuICAgICAgICAgIG5ldyBKaXRTdW1tYXJ5UmVzb2x2ZXIoKSwgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBkaXJlY3RpdmVOb3JtYWxpemVyLCBuZXcgQ29uc29sZSgpLFxuICAgICAgICAgIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUsIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICAgIChlcnJvciwgdHlwZSkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZXJyb3IsIHR5cGUgJiYgdHlwZS5maWxlUGF0aCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXI7XG4gIH1cblxuICBnZXRUZW1wbGF0ZVJlZmVyZW5jZXMoKTogc3RyaW5nW10geyByZXR1cm4gWy4uLnRoaXMudGVtcGxhdGVSZWZlcmVuY2VzXTsgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIEFuZ3VsYXIgdGVtcGxhdGUgaW4gdGhlIGZpbGUsIGlmIGFueS4gSWYgVFMgZmlsZSBpcyBwcm92aWRlZCB0aGVuXG4gICAqIHJldHVybiB0aGUgaW5saW5lIHRlbXBsYXRlLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAgICogQHBhcmFtIGZpbGVOYW1lIEVpdGhlciBUUyBvciBIVE1MIGZpbGVcbiAgICogQHBhcmFtIHBvc2l0aW9uIE9ubHkgdXNlZCBpZiBmaWxlIGlzIFRTXG4gICAqL1xuICBnZXRUZW1wbGF0ZUF0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZmluZE5vZGUoc291cmNlRmlsZSwgcG9zaXRpb24pO1xuICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldFNvdXJjZUZyb21Ob2RlKGZpbGVOYW1lLCBub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb21wb25lbnRTeW1ib2wgPSB0aGlzLmZpbGVUb0NvbXBvbmVudC5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKGNvbXBvbmVudFN5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTb3VyY2VGcm9tVHlwZShmaWxlTmFtZSwgY29tcG9uZW50U3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCBhbmQgcmV0dXJucyBhbGwgYW5hbHl6ZWQgbW9kdWxlcy5cbiAgICogSWYgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgaW52YWxpZGF0ZSBhbGwgY2FjaGVzIGFuZCB1cGRhdGUgZmlsZVRvQ29tcG9uZW50XG4gICAqIGFuZCB0ZW1wbGF0ZVJlZmVyZW5jZXMuXG4gICAqIEluIGFkZGl0aW9uIHRvIHJldHVybmluZyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIHRoaXMgbWV0aG9kIHBsYXlzIHRoZVxuICAgKiBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnIGluIHRzc2VydmVyLlxuICAgKi9cbiAgZ2V0QW5hbHl6ZWRNb2R1bGVzKCk6IE5nQW5hbHl6ZWRNb2R1bGVzIHtcbiAgICBpZiAodGhpcy51cFRvRGF0ZSgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gICAgfVxuXG4gICAgLy8gSW52YWxpZGF0ZSBjYWNoZXNcbiAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcyA9IFtdO1xuICAgIHRoaXMuZmlsZVRvQ29tcG9uZW50LmNsZWFyKCk7XG4gICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuY2xlYXIoKTtcblxuICAgIGNvbnN0IGFuYWx5emVIb3N0ID0ge2lzU291cmNlRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9fTtcbiAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpO1xuICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID1cbiAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0ZW1wbGF0ZSByZWZlcmVuY2VzIGFuZCBmaWxlVG9Db21wb25lbnRcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlcykge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSAhO1xuICAgICAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQgJiYgbWV0YWRhdGEudGVtcGxhdGUgJiYgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB1cmxSZXNvbHZlci5yZXNvbHZlKFxuICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5zZXQodGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcy5wdXNoKHRlbXBsYXRlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLmdldFNvdXJjZUZyb21Ob2RlKGZpbGVOYW1lLCBjaGlsZCk7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVNvdXJjZSkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCh0ZW1wbGF0ZVNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHMuZm9yRWFjaENoaWxkKGNoaWxkLCB2aXNpdCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50U3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChjb21wb25lbnRTeW1ib2wpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLmdldFRlbXBsYXRlQXQoZmlsZU5hbWUsIDApO1xuICAgICAgICBpZiAodGVtcGxhdGVTb3VyY2UpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godGVtcGxhdGVTb3VyY2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lOiBzdHJpbmcpOiBEZWNsYXJhdGlvbnMge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdDogRGVjbGFyYXRpb25zID0gW107XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgIGNvbnN0IHZpc2l0ID0gKGNoaWxkOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbkZyb21Ob2RlKHNvdXJjZUZpbGUsIGNoaWxkKTtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goZGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgcHJvZ3JhbSgpIHtcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy50c0xTLmdldFByb2dyYW0oKTtcbiAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgIC8vIFByb2dyYW0gaXMgdmVyeSB2ZXJ5IHVubGlrZWx5IHRvIGJlIHVuZGVmaW5lZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gcHJvZ3JhbSBpbiBsYW5ndWFnZSBzZXJ2aWNlIScpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgYW5kIGludmFsaWRhdGUgY2FjaGVzIGlmIGl0IGhhcy5cbiAgICogUmV0dXJucyB0cnVlIGlmIG1vZHVsZXMgYXJlIHVwLXRvLWRhdGUsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogVGhpcyBzaG91bGQgb25seSBiZSBjYWxsZWQgYnkgZ2V0QW5hbHl6ZWRNb2R1bGVzKCkuXG4gICAqL1xuICBwcml2YXRlIHVwVG9EYXRlKCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW07XG4gICAgaWYgKHRoaXMubGFzdFByb2dyYW0gPT09IHByb2dyYW0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3Jlc29sdmVyID0gbnVsbDtcbiAgICB0aGlzLl9yZWZsZWN0b3IgPSBudWxsO1xuXG4gICAgLy8gSW52YWxpZGF0ZSBmaWxlIHRoYXQgaGF2ZSBjaGFuZ2VkIGluIHRoZSBzdGF0aWMgc3ltYm9sIHJlc29sdmVyXG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIHNlZW4uYWRkKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSB0aGlzLmhvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICBjb25zdCBsYXN0VmVyc2lvbiA9IHRoaXMuZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAodmVyc2lvbiAhPT0gbGFzdFZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5maWxlVmVyc2lvbnMuc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlci5pbnZhbGlkYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGZpbGUgdmVyc2lvbnMgdGhhdCBhcmUgbm8gbG9uZ2VyIGluIHRoZSBmaWxlIGFuZCBpbnZhbGlkYXRlIHRoZW0uXG4gICAgY29uc3QgbWlzc2luZyA9IEFycmF5LmZyb20odGhpcy5maWxlVmVyc2lvbnMua2V5cygpKS5maWx0ZXIoZiA9PiAhc2Vlbi5oYXMoZikpO1xuICAgIG1pc3NpbmcuZm9yRWFjaChmID0+IHtcbiAgICAgIHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmKTtcbiAgICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIuaW52YWxpZGF0ZUZpbGUoZik7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxhc3RQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHRlbXBsYXRlIHNvdXJjZSBnaXZlbiB0aGUgQ2xhc3MgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgTmFtZSBvZiB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZS4gQ291bGQgYmUgVFMgb3IgSFRNTC5cbiAgICogQHBhcmFtIHNvdXJjZSBTb3VyY2UgdGV4dCBvZiB0aGUgdGVtcGxhdGUuXG4gICAqIEBwYXJhbSBzcGFuIFNvdXJjZSBzcGFuIG9mIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIEFuZ3VsYXIgc3ltYm9sIGZvciB0aGUgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUeXBlU2NyaXB0IHN5bWJvbCBmb3IgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gbm9kZSBJZiBmaWxlIGlzIFRTIHRoaXMgaXMgdGhlIHRlbXBsYXRlIG5vZGUsIG90aGVyd2lzZSBpdCdzIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBTb3VyY2UgZmlsZSBvZiB0aGUgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFNvdXJjZUZyb21EZWNsYXJhdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nLCBzcGFuOiBTcGFuLCBjbGFzc1N5bWJvbDogU3RhdGljU3ltYm9sLFxuICAgICAgZGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24sIG5vZGU6IHRzLk5vZGUsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBUZW1wbGF0ZVNvdXJjZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgbGV0IHF1ZXJ5Q2FjaGU6IFN5bWJvbFF1ZXJ5fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtO1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGlmIChkZWNsYXJhdGlvbikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmVyc2lvbjogdGhpcy5ob3N0LmdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWUpLFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIHNwYW4sXG4gICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICBnZXQgbWVtYmVycygpIHtcbiAgICAgICAgICByZXR1cm4gZ2V0Q2xhc3NNZW1iZXJzRnJvbURlY2xhcmF0aW9uKHByb2dyYW0sIHR5cGVDaGVja2VyLCBzb3VyY2VGaWxlLCBkZWNsYXJhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIGdldCBxdWVyeSgpIHtcbiAgICAgICAgICBpZiAoIXF1ZXJ5Q2FjaGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHNlbGYuZ2V0VGVtcGxhdGVBc3QodGhpcywgZmlsZU5hbWUpO1xuICAgICAgICAgICAgY29uc3QgcGlwZXMgPSB0ZW1wbGF0ZUluZm8gJiYgdGVtcGxhdGVJbmZvLnBpcGVzIHx8IFtdO1xuICAgICAgICAgICAgcXVlcnlDYWNoZSA9IGdldFN5bWJvbFF1ZXJ5KFxuICAgICAgICAgICAgICAgIHByb2dyYW0sIHR5cGVDaGVja2VyLCBzb3VyY2VGaWxlLFxuICAgICAgICAgICAgICAgICgpID0+IGdldFBpcGVzVGFibGUoc291cmNlRmlsZSwgcHJvZ3JhbSwgdHlwZUNoZWNrZXIsIHBpcGVzKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBxdWVyeUNhY2hlO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIFRlbXBsYXRlU291cmNlIGZvciB0aGUgaW5saW5lIHRlbXBsYXRlLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZVxuICAgKiBAcGFyYW0gbm9kZSBQb3RlbnRpYWwgdGVtcGxhdGUgbm9kZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTb3VyY2VGcm9tTm9kZShmaWxlTmFtZTogc3RyaW5nLCBub2RlOiB0cy5Ob2RlKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgIGNvbnN0IFtkZWNsYXJhdGlvbl0gPSB0aGlzLmdldFRlbXBsYXRlQ2xhc3NEZWNsRnJvbU5vZGUobm9kZSk7XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiBkZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFNvdXJjZUZyb21EZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICBmaWxlTmFtZSwgdGhpcy5zdHJpbmdPZihub2RlKSB8fCAnJywgc2hyaW5rKHNwYW5PZihub2RlKSksXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKHNvdXJjZUZpbGUuZmlsZU5hbWUsIGRlY2xhcmF0aW9uLm5hbWUudGV4dCksXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb24sIG5vZGUsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgVGVtcGxhdGVTb3VyY2UgZm9yIHRoZSB0ZW1wbGF0ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGNsYXNzU3ltYm9sLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVGVtcGxhdGUgZmlsZSAoSFRNTClcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sXG4gICAqL1xuICBwcml2YXRlIGdldFNvdXJjZUZyb21UeXBlKGZpbGVOYW1lOiBzdHJpbmcsIGNsYXNzU3ltYm9sOiBTdGF0aWNTeW1ib2wpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXRUZW1wbGF0ZUNsYXNzRnJvbVN0YXRpY1N5bWJvbChjbGFzc1N5bWJvbCk7XG4gICAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgICBjb25zdCBzbmFwc2hvdCA9IHRoaXMuaG9zdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7XG4gICAgICBpZiAoc25hcHNob3QpIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gc25hcHNob3QuZ2V0VGV4dCgwLCBzbmFwc2hvdC5nZXRMZW5ndGgoKSk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFNvdXJjZUZyb21EZWNsYXJhdGlvbihcbiAgICAgICAgICAgIGZpbGVOYW1lLCBzb3VyY2UsIHtzdGFydDogMCwgZW5kOiBzb3VyY2UubGVuZ3RofSwgY2xhc3NTeW1ib2wsIGRlY2xhcmF0aW9uLCBkZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEVycm9yKGVycm9yOiBhbnksIGZpbGVQYXRoOiBzdHJpbmd8bnVsbCkge1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgbGV0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChmaWxlUGF0aCk7XG4gICAgICBpZiAoIWVycm9ycykge1xuICAgICAgICBlcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuc2V0KGZpbGVQYXRoLCBlcnJvcnMpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3RvcigpOiBTdGF0aWNSZWZsZWN0b3Ige1xuICAgIGlmICghdGhpcy5fcmVmbGVjdG9yKSB7XG4gICAgICB0aGlzLl9yZWZsZWN0b3IgPSBuZXcgU3RhdGljUmVmbGVjdG9yKFxuICAgICAgICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyLCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLFxuICAgICAgICAgIFtdLCAgLy8ga25vd25NZXRhZGF0YUNsYXNzZXNcbiAgICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFGdW5jdGlvbnNcbiAgICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoICEpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3JlZmxlY3RvcjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVDbGFzc0Zyb21TdGF0aWNTeW1ib2wodHlwZTogU3RhdGljU3ltYm9sKTogdHMuQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbk5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQoc291cmNlLCBjaGlsZCA9PiB7XG4gICAgICBpZiAoY2hpbGQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjaGlsZCBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lICYmIGNsYXNzRGVjbGFyYXRpb24ubmFtZS50ZXh0ID09PSB0eXBlLm5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gY2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkZWNsYXJhdGlvbk5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIG1pc3NpbmdUZW1wbGF0ZTogW3RzLkNsYXNzRGVjbGFyYXRpb24gfCB1bmRlZmluZWQsIHRzLkV4cHJlc3Npb258dW5kZWZpbmVkXSA9XG4gICAgICBbdW5kZWZpbmVkLCB1bmRlZmluZWRdO1xuXG4gIC8qKlxuICAgKiBHaXZlbiBhIHRlbXBsYXRlIHN0cmluZyBub2RlLCBzZWUgaWYgaXQgaXMgYW4gQW5ndWxhciB0ZW1wbGF0ZSBzdHJpbmcsIGFuZCBpZiBzbyByZXR1cm4gdGhlXG4gICAqIGNvbnRhaW5pbmcgY2xhc3MuXG4gICAqL1xuICBwcml2YXRlIGdldFRlbXBsYXRlQ2xhc3NEZWNsRnJvbU5vZGUoY3VycmVudFRva2VuOiB0cy5Ob2RlKTpcbiAgICAgIFt0cy5DbGFzc0RlY2xhcmF0aW9uIHwgdW5kZWZpbmVkLCB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZF0ge1xuICAgIC8vIFZlcmlmeSB3ZSBhcmUgaW4gYSAndGVtcGxhdGUnIHByb3BlcnR5IGFzc2lnbm1lbnQsIGluIGFuIG9iamVjdCBsaXRlcmFsLCB3aGljaCBpcyBhbiBjYWxsXG4gICAgLy8gYXJnLCBpbiBhIGRlY29yYXRvclxuICAgIGxldCBwYXJlbnROb2RlID0gY3VycmVudFRva2VuLnBhcmVudDsgIC8vIFByb3BlcnR5QXNzaWdubWVudFxuICAgIGlmICghcGFyZW50Tm9kZSkge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuICAgIGlmIChwYXJlbnROb2RlLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuUHJvcGVydHlBc3NpZ25tZW50KSB7XG4gICAgICByZXR1cm4gVHlwZVNjcmlwdFNlcnZpY2VIb3N0Lm1pc3NpbmdUZW1wbGF0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETzogSXMgdGhpcyBkaWZmZXJlbnQgZm9yIGEgbGl0ZXJhbCwgaS5lLiBhIHF1b3RlZCBwcm9wZXJ0eSBuYW1lIGxpa2UgXCJ0ZW1wbGF0ZVwiP1xuICAgICAgaWYgKChwYXJlbnROb2RlIGFzIGFueSkubmFtZS50ZXh0ICE9PSAndGVtcGxhdGUnKSB7XG4gICAgICAgIHJldHVybiBUeXBlU2NyaXB0U2VydmljZUhvc3QubWlzc2luZ1RlbXBsYXRlO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnQ7ICAvLyBPYmplY3RMaXRlcmFsRXhwcmVzc2lvblxuICAgIGlmICghcGFyZW50Tm9kZSB8fCBwYXJlbnROb2RlLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pIHtcbiAgICAgIHJldHVybiBUeXBlU2NyaXB0U2VydmljZUhvc3QubWlzc2luZ1RlbXBsYXRlO1xuICAgIH1cblxuICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLnBhcmVudDsgIC8vIENhbGxFeHByZXNzaW9uXG4gICAgaWYgKCFwYXJlbnROb2RlIHx8IHBhcmVudE5vZGUua2luZCAhPT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuICAgIGNvbnN0IGNhbGxUYXJnZXQgPSAoPHRzLkNhbGxFeHByZXNzaW9uPnBhcmVudE5vZGUpLmV4cHJlc3Npb247XG5cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBwYXJlbnROb2RlLnBhcmVudDsgIC8vIERlY29yYXRvclxuICAgIGlmICghZGVjb3JhdG9yIHx8IGRlY29yYXRvci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkRlY29yYXRvcikge1xuICAgICAgcmV0dXJuIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdC5taXNzaW5nVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSA8dHMuQ2xhc3NEZWNsYXJhdGlvbj5kZWNvcmF0b3IucGFyZW50OyAgLy8gQ2xhc3NEZWNsYXJhdGlvblxuICAgIGlmICghZGVjbGFyYXRpb24gfHwgZGVjbGFyYXRpb24ua2luZCAhPT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICByZXR1cm4gVHlwZVNjcmlwdFNlcnZpY2VIb3N0Lm1pc3NpbmdUZW1wbGF0ZTtcbiAgICB9XG4gICAgcmV0dXJuIFtkZWNsYXJhdGlvbiwgY2FsbFRhcmdldF07XG4gIH1cblxuICBwcml2YXRlIGdldENvbGxlY3RlZEVycm9ycyhkZWZhdWx0U3BhbjogU3Bhbiwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IERlY2xhcmF0aW9uRXJyb3JbXSB7XG4gICAgY29uc3QgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIHJldHVybiAoZXJyb3JzICYmIGVycm9ycy5tYXAoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBlLmxpbmUgfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5saW5lKTtcbiAgICAgICAgICAgICBjb25zdCBjb2x1bW4gPSBlLmNvbHVtbiB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmNvbHVtbik7XG4gICAgICAgICAgICAgY29uc3Qgc3BhbiA9IHNwYW5BdChzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pIHx8IGRlZmF1bHRTcGFuO1xuICAgICAgICAgICAgIGlmIChpc0Zvcm1hdHRlZEVycm9yKGUpKSB7XG4gICAgICAgICAgICAgICByZXR1cm4gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZSwgc3Bhbik7XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIHJldHVybiB7bWVzc2FnZTogZS5tZXNzYWdlLCBzcGFufTtcbiAgICAgICAgICAgfSkpIHx8XG4gICAgICAgIFtdO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREZWNsYXJhdGlvbkZyb21Ob2RlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG5vZGU6IHRzLk5vZGUpOiBEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uICYmIG5vZGUuZGVjb3JhdG9ycyAmJlxuICAgICAgICAobm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uKS5uYW1lKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBub2RlLmRlY29yYXRvcnMpIHtcbiAgICAgICAgaWYgKGRlY29yYXRvci5leHByZXNzaW9uICYmIGRlY29yYXRvci5leHByZXNzaW9uLmtpbmQgPT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgY2FsbCA9IGRlY29yYXRvci5leHByZXNzaW9uIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gY2FsbC5leHByZXNzaW9uO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHRoaXMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgICAgICBjb25zdCBzdGF0aWNTeW1ib2wgPVxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKHNvdXJjZUZpbGUuZmlsZU5hbWUsIGNsYXNzRGVjbGFyYXRpb24ubmFtZS50ZXh0KTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXNvbHZlci5pc0RpcmVjdGl2ZShzdGF0aWNTeW1ib2wgYXMgYW55KSkge1xuICAgICAgICAgICAgICAgICAgY29uc3Qge21ldGFkYXRhfSA9XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoc3RhdGljU3ltYm9sIGFzIGFueSkgITtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uU3BhbiA9IHNwYW5PZih0YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogc3RhdGljU3ltYm9sLFxuICAgICAgICAgICAgICAgICAgICBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSlcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0RXJyb3IoZSwgc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICBjb25zdCBkZWNsYXJhdGlvblNwYW4gPSBzcGFuT2YodGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHN0YXRpY1N5bWJvbCxcbiAgICAgICAgICAgICAgICAgICAgZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSlcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdHJpbmdPZihub2RlOiB0cy5Ob2RlKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbDpcbiAgICAgICAgcmV0dXJuICg8dHMuTGl0ZXJhbEV4cHJlc3Npb24+bm9kZSkudGV4dDtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgICAgICByZXR1cm4gKDx0cy5TdHJpbmdMaXRlcmFsPm5vZGUpLnRleHQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBmaW5kTm9kZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICAgIGZ1bmN0aW9uIGZpbmQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8dW5kZWZpbmVkIHtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSBub2RlLmdldFN0YXJ0KCkgJiYgcG9zaXRpb24gPCBub2RlLmdldEVuZCgpKSB7XG4gICAgICAgIHJldHVybiB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZCkgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmluZChzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlQXN0QXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogVGVtcGxhdGVJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldFRlbXBsYXRlQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGFzdFJlc3VsdCA9IHRoaXMuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUsIGZpbGVOYW1lKTtcbiAgICBpZiAoYXN0UmVzdWx0ICYmIGFzdFJlc3VsdC5odG1sQXN0ICYmIGFzdFJlc3VsdC50ZW1wbGF0ZUFzdCAmJiBhc3RSZXN1bHQuZGlyZWN0aXZlICYmXG4gICAgICAgIGFzdFJlc3VsdC5kaXJlY3RpdmVzICYmIGFzdFJlc3VsdC5waXBlcyAmJiBhc3RSZXN1bHQuZXhwcmVzc2lvblBhcnNlcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcG9zaXRpb24sXG4gICAgICAgIGZpbGVOYW1lLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgaHRtbEFzdDogYXN0UmVzdWx0Lmh0bWxBc3QsXG4gICAgICAgIGRpcmVjdGl2ZTogYXN0UmVzdWx0LmRpcmVjdGl2ZSxcbiAgICAgICAgZGlyZWN0aXZlczogYXN0UmVzdWx0LmRpcmVjdGl2ZXMsXG4gICAgICAgIHBpcGVzOiBhc3RSZXN1bHQucGlwZXMsXG4gICAgICAgIHRlbXBsYXRlQXN0OiBhc3RSZXN1bHQudGVtcGxhdGVBc3QsXG4gICAgICAgIGV4cHJlc3Npb25QYXJzZXI6IGFzdFJlc3VsdC5leHByZXNzaW9uUGFyc2VyXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGdldFRlbXBsYXRlQXN0KHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZSwgY29udGV4dEZpbGU6IHN0cmluZyk6IEFzdFJlc3VsdCB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc29sdmVkTWV0YWRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YSh0ZW1wbGF0ZS50eXBlKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gcmVzb2x2ZWRNZXRhZGF0YSAmJiByZXNvbHZlZE1ldGFkYXRhLm1ldGFkYXRhO1xuICAgICAgaWYgKCFtZXRhZGF0YSkge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgICBjb25zdCByYXdIdG1sUGFyc2VyID0gbmV3IEh0bWxQYXJzZXIoKTtcbiAgICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSTE4Tkh0bWxQYXJzZXIocmF3SHRtbFBhcnNlcik7XG4gICAgICBjb25zdCBleHByZXNzaW9uUGFyc2VyID0gbmV3IFBhcnNlcihuZXcgTGV4ZXIoKSk7XG4gICAgICBjb25zdCBjb25maWcgPSBuZXcgQ29tcGlsZXJDb25maWcoKTtcbiAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBUZW1wbGF0ZVBhcnNlcihcbiAgICAgICAgICBjb25maWcsIHRoaXMucmVzb2x2ZXIuZ2V0UmVmbGVjdG9yKCksIGV4cHJlc3Npb25QYXJzZXIsIG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKSxcbiAgICAgICAgICBodG1sUGFyc2VyLCBudWxsICEsIFtdKTtcbiAgICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgJycsIHt0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlfSk7XG4gICAgICBjb25zdCBlcnJvcnM6IERpYWdub3N0aWNbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHRlbXBsYXRlLnR5cGUpIHx8XG4gICAgICAgICAgLy8gUmVwb3J0ZWQgYnkgdGhlIHRoZSBkZWNsYXJhdGlvbiBkaWFnbm9zdGljcy5cbiAgICAgICAgICBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzKTtcbiAgICAgIGlmICghbmdNb2R1bGUpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IG5nTW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUuZGlyZWN0aXZlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGQgPT4gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZC5yZWZlcmVuY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGQgPT4gZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkID0+IGQgIS5tZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgICBjb25zdCBwaXBlcyA9IG5nTW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUucGlwZXMubWFwKFxuICAgICAgICAgIHAgPT4gdGhpcy5yZXNvbHZlci5nZXRPckxvYWRQaXBlTWV0YWRhdGEocC5yZWZlcmVuY2UpLnRvU3VtbWFyeSgpKTtcbiAgICAgIGNvbnN0IHNjaGVtYXMgPSBuZ01vZHVsZS5zY2hlbWFzO1xuICAgICAgY29uc3QgcGFyc2VSZXN1bHQgPSBwYXJzZXIudHJ5UGFyc2VIdG1sKGh0bWxSZXN1bHQsIG1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hcyk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBodG1sQXN0OiBodG1sUmVzdWx0LnJvb3ROb2RlcyxcbiAgICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgICBkaXJlY3RpdmU6IG1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcyxcbiAgICAgICAgcGFyc2VFcnJvcnM6IHBhcnNlUmVzdWx0LmVycm9ycywgZXhwcmVzc2lvblBhcnNlciwgZXJyb3JzXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IHNwYW4gPVxuICAgICAgICAgIGUuZmlsZU5hbWUgPT09IGNvbnRleHRGaWxlICYmIHRlbXBsYXRlLnF1ZXJ5LmdldFNwYW5BdChlLmxpbmUsIGUuY29sdW1uKSB8fCB0ZW1wbGF0ZS5zcGFuO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiBbe1xuICAgICAgICAgIGtpbmQ6IERpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSwgc3BhbixcbiAgICAgICAgfV0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKG1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgbGV0IHJlc3VsdDogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgcmVzdWx0U2l6ZSA9IDA7XG4gIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMubmdNb2R1bGVzKSB7XG4gICAgY29uc3QgbW9kdWxlU2l6ZSA9IG1vZHVsZS50cmFuc2l0aXZlTW9kdWxlLmRpcmVjdGl2ZXMubGVuZ3RoO1xuICAgIGlmIChtb2R1bGVTaXplID4gcmVzdWx0U2l6ZSkge1xuICAgICAgcmVzdWx0ID0gbW9kdWxlO1xuICAgICAgcmVzdWx0U2l6ZSA9IG1vZHVsZVNpemU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihub2RlOiB0cy5Ob2RlKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbn1cblxuZnVuY3Rpb24gc2hyaW5rKHNwYW46IFNwYW4sIG9mZnNldD86IG51bWJlcikge1xuICBpZiAob2Zmc2V0ID09IG51bGwpIG9mZnNldCA9IDE7XG4gIHJldHVybiB7c3RhcnQ6IHNwYW4uc3RhcnQgKyBvZmZzZXQsIGVuZDogc3Bhbi5lbmQgLSBvZmZzZXR9O1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgICAgaWYgKG5vZGUua2luZCA+IHRzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kQ2hpbGQpO1xuICAgICAgICByZXR1cm4gYmV0dGVyTm9kZSB8fCBub2RlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBub2RlID0gdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZpbmRDaGlsZCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY29udmVydENoYWluKGNoYWluOiBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4pOiBEaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBjaGFpbi5tZXNzYWdlLCBuZXh0OiBjaGFpbi5uZXh0ID8gY29udmVydENoYWluKGNoYWluLm5leHQpIDogdW5kZWZpbmVkfTtcbn1cblxuZnVuY3Rpb24gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZXJyb3I6IEZvcm1hdHRlZEVycm9yLCBzcGFuOiBTcGFuKTogRGVjbGFyYXRpb25FcnJvciB7XG4gIHJldHVybiB7bWVzc2FnZTogZXJyb3IuY2hhaW4gPyBjb252ZXJ0Q2hhaW4oZXJyb3IuY2hhaW4pIDogZXJyb3IubWVzc2FnZSwgc3Bhbn07XG59XG4iXX0=