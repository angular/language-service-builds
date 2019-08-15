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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var ts = require("typescript");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var reflector_host_1 = require("@angular/language-service/src/reflector_host");
    var template_1 = require("@angular/language-service/src/template");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
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
            this.summaryResolver = new compiler_1.AotSummaryResolver({
                loadSummary: function (filePath) { return null; },
                isSourceFile: function (sourceFilePath) { return true; },
                toSummaryFileName: function (sourceFilePath) { return sourceFilePath; },
                fromSummaryFileName: function (filePath) { return filePath; },
            }, this.staticSymbolCache);
            this.reflectorHost = new reflector_host_1.ReflectorHost(function () { return tsLS.getProgram(); }, host);
            this.staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this.staticSymbolCache, this.summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
            this.reflector = new compiler_1.StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], // knownMetadataClasses
            [], // knownMetadataFunctions
            function (e, filePath) { return _this.collectError(e, filePath); });
            this.resolver = this.createMetadataResolver();
        }
        /**
         * Creates a new metadata resolver. This should only be called once.
         */
        TypeScriptServiceHost.prototype.createMetadataResolver = function () {
            var _this = this;
            if (this.resolver) {
                return this.resolver; // There should only be a single instance
            }
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
            return new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this.staticSymbolCache, this.reflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
        };
        TypeScriptServiceHost.prototype.getTemplateReferences = function () { return tslib_1.__spread(this.templateReferences); };
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
        /**
         * Find all templates in the specified `file`.
         * @param fileName TS or HTML file
         */
        TypeScriptServiceHost.prototype.getTemplates = function (fileName) {
            var _this = this;
            var results = [];
            if (fileName.endsWith('.ts')) {
                // Find every template string in the file
                var visit_1 = function (child) {
                    var template = _this.getInternalTemplate(child);
                    if (template) {
                        results.push(template);
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
                var template = this.getExternalTemplate(fileName);
                if (template) {
                    results.push(template);
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
         *
         * @param node Potential template node
         */
        TypeScriptServiceHost.prototype.getInternalTemplate = function (node) {
            if (!ts.isStringLiteralLike(node)) {
                return;
            }
            var classDecl = template_1.getClassDeclFromTemplateNode(node);
            if (!classDecl || !classDecl.name) { // Does not handle anonymous class
                return;
            }
            var fileName = node.getSourceFile().fileName;
            var classSymbol = this.reflector.getStaticSymbol(fileName, classDecl.name.text);
            return new template_1.InlineTemplate(node, classDecl, classSymbol, this);
        };
        /**
         * Return the external template for `fileName`.
         * @param fileName HTML file
         */
        TypeScriptServiceHost.prototype.getExternalTemplate = function (fileName) {
            // First get the text for the template
            var snapshot = this.host.getScriptSnapshot(fileName);
            if (!snapshot) {
                return;
            }
            var source = snapshot.getText(0, snapshot.getLength());
            // Next find the component class symbol
            var classSymbol = this.fileToComponent.get(fileName);
            if (!classSymbol) {
                return;
            }
            // Then use the class symbol to find the actual ts.ClassDeclaration node
            var sourceFile = this.getSourceFile(classSymbol.filePath);
            if (!sourceFile) {
                return;
            }
            // TODO: This only considers top-level class declarations in a source file.
            // This would not find a class declaration in a namespace, for example.
            var classDecl = sourceFile.forEachChild(function (child) {
                if (ts.isClassDeclaration(child) && child.name && child.name.text === classSymbol.name) {
                    return child;
                }
            });
            if (!classDecl) {
                return;
            }
            return new template_1.ExternalTemplate(source, fileName, classDecl, classSymbol, this);
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
        TypeScriptServiceHost.prototype.getCollectedErrors = function (defaultSpan, sourceFile) {
            var errors = this.collectedErrors.get(sourceFile.fileName);
            if (!errors) {
                return [];
            }
            // TODO: Add better typings for the errors
            return errors.map(function (e) {
                var line = e.line || (e.position && e.position.line);
                var column = e.column || (e.position && e.position.column);
                var span = spanAt(sourceFile, line, column) || defaultSpan;
                if (compiler_1.isFormattedError(e)) {
                    return errorToDiagnosticWithChain(e, span);
                }
                return { message: e.message, span: span };
            });
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
        /**
         * Return the parsed template for the template at the specified `position`.
         * @param fileName TS or HTML file
         * @param position Position of the template in the TS file, otherwise ignored.
         */
        TypeScriptServiceHost.prototype.getTemplateAstAtPosition = function (fileName, position) {
            var template;
            if (fileName.endsWith('.ts')) {
                var sourceFile = this.getSourceFile(fileName);
                if (!sourceFile) {
                    return;
                }
                // Find the node that most closely matches the position
                var node = utils_1.findTighestNode(sourceFile, position);
                if (!node) {
                    return;
                }
                template = this.getInternalTemplate(node);
            }
            else {
                template = this.getExternalTemplate(fileName);
            }
            if (!template) {
                return;
            }
            var astResult = this.getTemplateAst(template);
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
        TypeScriptServiceHost.prototype.getTemplateAst = function (template) {
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
                var parser = new compiler_1.TemplateParser(config, this.reflector, expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, []);
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
                var span = e.fileName === template.fileName && template.query.getSpanAt(e.line, e.column) ||
                    template.span;
                return {
                    errors: [{
                            kind: types_1.DiagnosticKind.Error,
                            message: e.message, span: span,
                        }],
                };
            }
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnaEI7SUFDaGhCLHNDQUFxRTtJQUNyRSwrQkFBaUM7SUFHakMsbUZBQXlEO0lBQ3pELCtFQUErQztJQUMvQyxtRUFBMEY7SUFDMUYsNkRBQW9MO0lBQ3BMLDZEQUF3QztJQUV4Qzs7T0FFRztJQUNILFNBQWdCLG1DQUFtQyxDQUMvQyxJQUE0QixFQUFFLE9BQTJCO1FBQzNELElBQU0sTUFBTSxHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELElBQU0sUUFBUSxHQUFHLHdDQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFMRCxrRkFLQztJQUVEOzs7OztPQUtHO0lBQ0g7UUFBcUMsMkNBQVU7UUFBL0M7O1FBRUEsQ0FBQztRQURDLCtCQUFLLEdBQUwsY0FBMkIsT0FBTyxJQUFJLDBCQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxzQkFBQztJQUFELENBQUMsQUFGRCxDQUFxQyxxQkFBVSxHQUU5QztJQUZZLDBDQUFlO0lBSTVCOztPQUVHO0lBQ0g7UUFBeUMsK0NBQWM7UUFBdkQ7O1FBRUEsQ0FBQztRQURDLGlDQUFHLEdBQUgsVUFBSSxHQUFXLElBQXFCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsMEJBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBeUMseUJBQWMsR0FFdEQ7SUFGWSxrREFBbUI7SUFJaEM7Ozs7Ozs7T0FPRztJQUNIO1FBb0JFLCtCQUNx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Q0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUFDLEtBQXFCLEVBQUUsSUFBVTtRQUNuRSxPQUFPLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztJQUNsRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FvdFN1bW1hcnlSZXNvbHZlciwgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlckNvbmZpZywgRGlyZWN0aXZlTm9ybWFsaXplciwgRGlyZWN0aXZlUmVzb2x2ZXIsIERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgRm9ybWF0dGVkRXJyb3IsIEZvcm1hdHRlZE1lc3NhZ2VDaGFpbiwgSHRtbFBhcnNlciwgSTE4Tkh0bWxQYXJzZXIsIEppdFN1bW1hcnlSZXNvbHZlciwgTGV4ZXIsIE5nQW5hbHl6ZWRNb2R1bGVzLCBOZ01vZHVsZVJlc29sdmVyLCBQYXJzZVRyZWVSZXN1bHQsIFBhcnNlciwgUGlwZVJlc29sdmVyLCBSZXNvdXJjZUxvYWRlciwgU3RhdGljUmVmbGVjdG9yLCBTdGF0aWNTeW1ib2wsIFN0YXRpY1N5bWJvbENhY2hlLCBTdGF0aWNTeW1ib2xSZXNvbHZlciwgVGVtcGxhdGVQYXJzZXIsIGFuYWx5emVOZ01vZHVsZXMsIGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIsIGlzRm9ybWF0dGVkRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Vmlld0VuY2Fwc3VsYXRpb24sIMm1Q29uc29sZSBhcyBDb25zb2xlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdCwgVGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7UmVmbGVjdG9ySG9zdH0gZnJvbSAnLi9yZWZsZWN0b3JfaG9zdCc7XG5pbXBvcnQge0V4dGVybmFsVGVtcGxhdGUsIElubGluZVRlbXBsYXRlLCBnZXRDbGFzc0RlY2xGcm9tVGVtcGxhdGVOb2RlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRXJyb3IsIERlY2xhcmF0aW9ucywgRGlhZ25vc3RpYywgRGlhZ25vc3RpY0tpbmQsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIExhbmd1YWdlU2VydmljZSwgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgU3BhbiwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtmaW5kVGlnaGVzdE5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIENyZWF0ZSBhIGBMYW5ndWFnZVNlcnZpY2VIb3N0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlRnJvbVR5cGVzY3JpcHQoXG4gICAgaG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgc2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlKTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3QgbmdIb3N0ID0gbmV3IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdChob3N0LCBzZXJ2aWNlKTtcbiAgY29uc3QgbmdTZXJ2ZXIgPSBjcmVhdGVMYW5ndWFnZVNlcnZpY2UobmdIb3N0KTtcbiAgcmV0dXJuIG5nU2VydmVyO1xufVxuXG4vKipcbiAqIFRoZSBsYW5ndWFnZSBzZXJ2aWNlIG5ldmVyIG5lZWRzIHRoZSBub3JtYWxpemVkIHZlcnNpb25zIG9mIHRoZSBtZXRhZGF0YS4gVG8gYXZvaWQgcGFyc2luZ1xuICogdGhlIGNvbnRlbnQgYW5kIHJlc29sdmluZyByZWZlcmVuY2VzLCByZXR1cm4gYW4gZW1wdHkgZmlsZS4gVGhpcyBhbHNvIGFsbG93cyBub3JtYWxpemluZ1xuICogdGVtcGxhdGUgdGhhdCBhcmUgc3ludGF0aWNhbGx5IGluY29ycmVjdCB3aGljaCBpcyByZXF1aXJlZCB0byBwcm92aWRlIGNvbXBsZXRpb25zIGluXG4gKiBzeW50YWN0aWNhbGx5IGluY29ycmVjdCB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdW1teUh0bWxQYXJzZXIgZXh0ZW5kcyBIdG1sUGFyc2VyIHtcbiAgcGFyc2UoKTogUGFyc2VUcmVlUmVzdWx0IHsgcmV0dXJuIG5ldyBQYXJzZVRyZWVSZXN1bHQoW10sIFtdKTsgfVxufVxuXG4vKipcbiAqIEF2b2lkIGxvYWRpbmcgcmVzb3VyY2VzIGluIHRoZSBsYW5ndWFnZSBzZXJ2Y2llIGJ5IHVzaW5nIGEgZHVtbXkgbG9hZGVyLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlSZXNvdXJjZUxvYWRlciBleHRlbmRzIFJlc291cmNlTG9hZGVyIHtcbiAgZ2V0KHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgnJyk7IH1cbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBhIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCBmb3IgYSBUeXBlU2NyaXB0IHByb2plY3QuXG4gKlxuICogVGhlIGBUeXBlU2NyaXB0U2VydmljZUhvc3RgIGltcGxlbWVudHMgdGhlIEFuZ3VsYXIgYExhbmd1YWdlU2VydmljZUhvc3RgIHVzaW5nXG4gKiB0aGUgVHlwZVNjcmlwdCBsYW5ndWFnZSBzZXJ2aWNlcy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0U2VydmljZUhvc3QgaW1wbGVtZW50cyBMYW5ndWFnZVNlcnZpY2VIb3N0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBzdW1tYXJ5UmVzb2x2ZXI6IEFvdFN1bW1hcnlSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZWFkb25seSByZWZsZWN0b3JIb3N0OiBSZWZsZWN0b3JIb3N0O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRpY1N5bWJvbFJlc29sdmVyOiBTdGF0aWNTeW1ib2xSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZWFkb25seSByZWZsZWN0b3I6IFN0YXRpY1JlZmxlY3RvcjtcbiAgcHJpdmF0ZSByZWFkb25seSByZXNvbHZlcjogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXI7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xDYWNoZSA9IG5ldyBTdGF0aWNTeW1ib2xDYWNoZSgpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVUb0NvbXBvbmVudCA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0aWNTeW1ib2w+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29sbGVjdGVkRXJyb3JzID0gbmV3IE1hcDxzdHJpbmcsIGFueVtdPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgcHJpdmF0ZSBsYXN0UHJvZ3JhbTogdHMuUHJvZ3JhbXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgdGVtcGxhdGVSZWZlcmVuY2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gICAgZmlsZXM6IFtdLFxuICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICBuZ01vZHVsZXM6IFtdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSkge1xuICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyID0gbmV3IEFvdFN1bW1hcnlSZXNvbHZlcihcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRTdW1tYXJ5KGZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICAgICAgaXNTb3VyY2VGaWxlKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICAgICAgdG9TdW1tYXJ5RmlsZU5hbWUoc291cmNlRmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gc291cmNlRmlsZVBhdGg7IH0sXG4gICAgICAgICAgZnJvbVN1bW1hcnlGaWxlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5ne3JldHVybiBmaWxlUGF0aDt9LFxuICAgICAgICB9LFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlKTtcbiAgICB0aGlzLnJlZmxlY3Rvckhvc3QgPSBuZXcgUmVmbGVjdG9ySG9zdCgoKSA9PiB0c0xTLmdldFByb2dyYW0oKSAhLCBob3N0KTtcbiAgICB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyID0gbmV3IFN0YXRpY1N5bWJvbFJlc29sdmVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rvckhvc3QsIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUsIHRoaXMuc3VtbWFyeVJlc29sdmVyLFxuICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoKSk7XG4gICAgdGhpcy5yZWZsZWN0b3IgPSBuZXcgU3RhdGljUmVmbGVjdG9yKFxuICAgICAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlcixcbiAgICAgICAgW10sICAvLyBrbm93bk1ldGFkYXRhQ2xhc3Nlc1xuICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFGdW5jdGlvbnNcbiAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCkpO1xuICAgIHRoaXMucmVzb2x2ZXIgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhUmVzb2x2ZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IG1ldGFkYXRhIHJlc29sdmVyLiBUaGlzIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbmNlLlxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVNZXRhZGF0YVJlc29sdmVyKCk6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyIHtcbiAgICBpZiAodGhpcy5yZXNvbHZlcikge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZXI7ICAvLyBUaGVyZSBzaG91bGQgb25seSBiZSBhIHNpbmdsZSBpbnN0YW5jZVxuICAgIH1cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBOZ01vZHVsZVJlc29sdmVyKHRoaXMucmVmbGVjdG9yKTtcbiAgICBjb25zdCBkaXJlY3RpdmVSZXNvbHZlciA9IG5ldyBEaXJlY3RpdmVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgcGlwZVJlc29sdmVyID0gbmV3IFBpcGVSZXNvbHZlcih0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IHJlc291cmNlTG9hZGVyID0gbmV3IER1bW15UmVzb3VyY2VMb2FkZXIoKTtcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IER1bW15SHRtbFBhcnNlcigpO1xuICAgIC8vIFRoaXMgdHJhY2tzIHRoZSBDb21waWxlQ29uZmlnIGluIGNvZGVnZW4udHMuIEN1cnJlbnRseSB0aGVzZSBvcHRpb25zXG4gICAgLy8gYXJlIGhhcmQtY29kZWQuXG4gICAgY29uc3QgY29uZmlnID0gbmV3IENvbXBpbGVyQ29uZmlnKHtcbiAgICAgIGRlZmF1bHRFbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgIHVzZUppdDogZmFsc2UsXG4gICAgfSk7XG4gICAgY29uc3QgZGlyZWN0aXZlTm9ybWFsaXplciA9XG4gICAgICAgIG5ldyBEaXJlY3RpdmVOb3JtYWxpemVyKHJlc291cmNlTG9hZGVyLCB1cmxSZXNvbHZlciwgaHRtbFBhcnNlciwgY29uZmlnKTtcbiAgICByZXR1cm4gbmV3IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyKFxuICAgICAgICBjb25maWcsIGh0bWxQYXJzZXIsIG1vZHVsZVJlc29sdmVyLCBkaXJlY3RpdmVSZXNvbHZlciwgcGlwZVJlc29sdmVyLFxuICAgICAgICBuZXcgSml0U3VtbWFyeVJlc29sdmVyKCksIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgZGlyZWN0aXZlTm9ybWFsaXplciwgbmV3IENvbnNvbGUoKSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgdGhpcy5yZWZsZWN0b3IsXG4gICAgICAgIChlcnJvciwgdHlwZSkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZXJyb3IsIHR5cGUgJiYgdHlwZS5maWxlUGF0aCkpO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFsuLi50aGlzLnRlbXBsYXRlUmVmZXJlbmNlc107IH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQgYW5kIHJldHVybnMgYWxsIGFuYWx5emVkIG1vZHVsZXMuXG4gICAqIElmIHByb2dyYW0gaGFzIGNoYW5nZWQsIGludmFsaWRhdGUgYWxsIGNhY2hlcyBhbmQgdXBkYXRlIGZpbGVUb0NvbXBvbmVudFxuICAgKiBhbmQgdGVtcGxhdGVSZWZlcmVuY2VzLlxuICAgKiBJbiBhZGRpdGlvbiB0byByZXR1cm5pbmcgaW5mb3JtYXRpb24gYWJvdXQgTmdNb2R1bGVzLCB0aGlzIG1ldGhvZCBwbGF5cyB0aGVcbiAgICogc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJyBpbiB0c3NlcnZlci5cbiAgICovXG4gIGdldEFuYWx5emVkTW9kdWxlcygpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgaWYgKHRoaXMudXBUb0RhdGUoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgY2FjaGVzXG4gICAgdGhpcy50ZW1wbGF0ZVJlZmVyZW5jZXMgPSBbXTtcbiAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5jbGVhcigpO1xuICAgIHRoaXMuY29sbGVjdGVkRXJyb3JzLmNsZWFyKCk7XG5cbiAgICBjb25zdCBhbmFseXplSG9zdCA9IHtpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gdHJ1ZTsgfX07XG4gICAgY29uc3QgcHJvZ3JhbUZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNmID0+IHNmLmZpbGVOYW1lKTtcbiAgICB0aGlzLmFuYWx5emVkTW9kdWxlcyA9XG4gICAgICAgIGFuYWx5emVOZ01vZHVsZXMocHJvZ3JhbUZpbGVzLCBhbmFseXplSG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlciwgdGhpcy5yZXNvbHZlcik7XG5cbiAgICAvLyB1cGRhdGUgdGVtcGxhdGUgcmVmZXJlbmNlcyBhbmQgZmlsZVRvQ29tcG9uZW50XG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyKCk7XG4gICAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiB0aGlzLmFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7bWV0YWRhdGF9ID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlLnJlZmVyZW5jZSkgITtcbiAgICAgICAgaWYgKG1ldGFkYXRhLmlzQ29tcG9uZW50ICYmIG1ldGFkYXRhLnRlbXBsYXRlICYmIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKSB7XG4gICAgICAgICAgY29uc3QgdGVtcGxhdGVOYW1lID0gdXJsUmVzb2x2ZXIucmVzb2x2ZShcbiAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0b3IuY29tcG9uZW50TW9kdWxlVXJsKGRpcmVjdGl2ZS5yZWZlcmVuY2UpLFxuICAgICAgICAgICAgICBtZXRhZGF0YS50ZW1wbGF0ZS50ZW1wbGF0ZVVybCk7XG4gICAgICAgICAgdGhpcy5maWxlVG9Db21wb25lbnQuc2V0KHRlbXBsYXRlTmFtZSwgZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgdGhpcy50ZW1wbGF0ZVJlZmVyZW5jZXMucHVzaCh0ZW1wbGF0ZU5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRlbXBsYXRlcyBpbiB0aGUgc3BlY2lmaWVkIGBmaWxlYC5cbiAgICogQHBhcmFtIGZpbGVOYW1lIFRTIG9yIEhUTUwgZmlsZVxuICAgKi9cbiAgZ2V0VGVtcGxhdGVzKGZpbGVOYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVNvdXJjZVtdIHtcbiAgICBjb25zdCByZXN1bHRzOiBUZW1wbGF0ZVNvdXJjZVtdID0gW107XG4gICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgLy8gRmluZCBldmVyeSB0ZW1wbGF0ZSBzdHJpbmcgaW4gdGhlIGZpbGVcbiAgICAgIGNvbnN0IHZpc2l0ID0gKGNoaWxkOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5nZXRJbnRlcm5hbFRlbXBsYXRlKGNoaWxkKTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoY2hpbGQsIHZpc2l0KTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEV4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25zKGZpbGVOYW1lOiBzdHJpbmcpOiBEZWNsYXJhdGlvbnMge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdDogRGVjbGFyYXRpb25zID0gW107XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgIGNvbnN0IHZpc2l0ID0gKGNoaWxkOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbkZyb21Ob2RlKHNvdXJjZUZpbGUsIGNoaWxkKTtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goZGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IHByb2dyYW0oKSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQsIGFuZCBpbnZhbGlkYXRlIGNhY2hlcyBpZiBpdCBoYXMuXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBtb2R1bGVzIGFyZSB1cC10by1kYXRlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJ5IGdldEFuYWx5emVkTW9kdWxlcygpLlxuICAgKi9cbiAgcHJpdmF0ZSB1cFRvRGF0ZSgpIHtcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtO1xuICAgIGlmICh0aGlzLmxhc3RQcm9ncmFtID09PSBwcm9ncmFtKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBJbnZhbGlkYXRlIGZpbGUgdGhhdCBoYXZlIGNoYW5nZWQgaW4gdGhlIHN0YXRpYyBzeW1ib2wgcmVzb2x2ZXJcbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3QgZmlsZU5hbWUgPSBzb3VyY2VGaWxlLmZpbGVOYW1lO1xuICAgICAgc2Vlbi5hZGQoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHRoaXMuaG9zdC5nZXRTY3JpcHRWZXJzaW9uKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGxhc3RWZXJzaW9uID0gdGhpcy5maWxlVmVyc2lvbnMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmICh2ZXJzaW9uICE9PSBsYXN0VmVyc2lvbikge1xuICAgICAgICB0aGlzLmZpbGVWZXJzaW9ucy5zZXQoZmlsZU5hbWUsIHZlcnNpb24pO1xuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLmludmFsaWRhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgZmlsZSB2ZXJzaW9ucyB0aGF0IGFyZSBubyBsb25nZXIgaW4gdGhlIGZpbGUgYW5kIGludmFsaWRhdGUgdGhlbS5cbiAgICBjb25zdCBtaXNzaW5nID0gQXJyYXkuZnJvbSh0aGlzLmZpbGVWZXJzaW9ucy5rZXlzKCkpLmZpbHRlcihmID0+ICFzZWVuLmhhcyhmKSk7XG4gICAgbWlzc2luZy5mb3JFYWNoKGYgPT4ge1xuICAgICAgdGhpcy5maWxlVmVyc2lvbnMuZGVsZXRlKGYpO1xuICAgICAgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlci5pbnZhbGlkYXRlRmlsZShmKTtcbiAgICB9KTtcblxuICAgIHRoaXMubGFzdFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgVGVtcGxhdGVTb3VyY2UgaWYgYG5vZGVgIGlzIGEgdGVtcGxhdGUgbm9kZS5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsXG4gICAqXG4gICAqIEBDb21wb25lbnQoe1xuICAgKiAgIHRlbXBsYXRlOiAnPGRpdj48L2Rpdj4nIDwtLSB0ZW1wbGF0ZSBub2RlXG4gICAqIH0pXG4gICAqIGNsYXNzIEFwcENvbXBvbmVudCB7fVxuICAgKiAgICAgICAgICAgXi0tLS0gY2xhc3MgZGVjbGFyYXRpb24gbm9kZVxuICAgKlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBQb3RlbnRpYWwgdGVtcGxhdGUgbm9kZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRJbnRlcm5hbFRlbXBsYXRlKG5vZGU6IHRzLk5vZGUpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsTGlrZShub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBnZXRDbGFzc0RlY2xGcm9tVGVtcGxhdGVOb2RlKG5vZGUpO1xuICAgIGlmICghY2xhc3NEZWNsIHx8ICFjbGFzc0RlY2wubmFtZSkgeyAgLy8gRG9lcyBub3QgaGFuZGxlIGFub255bW91cyBjbGFzc1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWxlTmFtZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKGZpbGVOYW1lLCBjbGFzc0RlY2wubmFtZS50ZXh0KTtcbiAgICByZXR1cm4gbmV3IElubGluZVRlbXBsYXRlKG5vZGUsIGNsYXNzRGVjbCwgY2xhc3NTeW1ib2wsIHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUgZm9yIGBmaWxlTmFtZWAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBIVE1MIGZpbGVcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICAvLyBGaXJzdCBnZXQgdGhlIHRleHQgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy5ob3N0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgIC8vIE5leHQgZmluZCB0aGUgY29tcG9uZW50IGNsYXNzIHN5bWJvbFxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoZW4gdXNlIHRoZSBjbGFzcyBzeW1ib2wgdG8gZmluZCB0aGUgYWN0dWFsIHRzLkNsYXNzRGVjbGFyYXRpb24gbm9kZVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoY2xhc3NTeW1ib2wuZmlsZVBhdGgpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUT0RPOiBUaGlzIG9ubHkgY29uc2lkZXJzIHRvcC1sZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZS5cbiAgICAvLyBUaGlzIHdvdWxkIG5vdCBmaW5kIGEgY2xhc3MgZGVjbGFyYXRpb24gaW4gYSBuYW1lc3BhY2UsIGZvciBleGFtcGxlLlxuICAgIGNvbnN0IGNsYXNzRGVjbCA9IHNvdXJjZUZpbGUuZm9yRWFjaENoaWxkKChjaGlsZCkgPT4ge1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjaGlsZCkgJiYgY2hpbGQubmFtZSAmJiBjaGlsZC5uYW1lLnRleHQgPT09IGNsYXNzU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghY2xhc3NEZWNsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxUZW1wbGF0ZShzb3VyY2UsIGZpbGVOYW1lLCBjbGFzc0RlY2wsIGNsYXNzU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEVycm9yKGVycm9yOiBhbnksIGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICBsZXQgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGlmICghZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5zZXQoZmlsZVBhdGgsIGVycm9ycyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb2xsZWN0ZWRFcnJvcnMoZGVmYXVsdFNwYW46IFNwYW4sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBEZWNsYXJhdGlvbkVycm9yW10ge1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBpZiAoIWVycm9ycykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBUT0RPOiBBZGQgYmV0dGVyIHR5cGluZ3MgZm9yIHRoZSBlcnJvcnNcbiAgICByZXR1cm4gZXJyb3JzLm1hcCgoZTogYW55KSA9PiB7XG4gICAgICBjb25zdCBsaW5lID0gZS5saW5lIHx8IChlLnBvc2l0aW9uICYmIGUucG9zaXRpb24ubGluZSk7XG4gICAgICBjb25zdCBjb2x1bW4gPSBlLmNvbHVtbiB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmNvbHVtbik7XG4gICAgICBjb25zdCBzcGFuID0gc3BhbkF0KHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbikgfHwgZGVmYXVsdFNwYW47XG4gICAgICBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlKSkge1xuICAgICAgICByZXR1cm4gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZSwgc3Bhbik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge21lc3NhZ2U6IGUubWVzc2FnZSwgc3Bhbn07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldERlY2xhcmF0aW9uRnJvbU5vZGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbm9kZTogdHMuTm9kZSk6IERlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gICAgaWYgKG5vZGUua2luZCA9PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24gJiYgbm9kZS5kZWNvcmF0b3JzICYmXG4gICAgICAgIChub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb24pLm5hbWUpIHtcbiAgICAgIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIG5vZGUuZGVjb3JhdG9ycykge1xuICAgICAgICBpZiAoZGVjb3JhdG9yLmV4cHJlc3Npb24gJiYgZGVjb3JhdG9yLmV4cHJlc3Npb24ua2luZCA9PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBjYWxsID0gZGVjb3JhdG9yLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBjYWxsLmV4cHJlc3Npb247XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24odGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRpY1N5bWJvbCA9XG4gICAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woc291cmNlRmlsZS5maWxlTmFtZSwgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQpO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlc29sdmVyLmlzRGlyZWN0aXZlKHN0YXRpY1N5bWJvbCBhcyBhbnkpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7bWV0YWRhdGF9ID1cbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShzdGF0aWNTeW1ib2wgYXMgYW55KSAhO1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKHRhcmdldCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBzdGF0aWNTeW1ib2wsXG4gICAgICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yczogdGhpcy5nZXRDb2xsZWN0ZWRFcnJvcnMoZGVjbGFyYXRpb25TcGFuLCBzb3VyY2VGaWxlKVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RFcnJvcihlLCBzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uU3BhbiA9IHNwYW5PZih0YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogc3RhdGljU3ltYm9sLFxuICAgICAgICAgICAgICAgICAgICBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgICAgICAgICAgICAgIGVycm9yczogdGhpcy5nZXRDb2xsZWN0ZWRFcnJvcnMoZGVjbGFyYXRpb25TcGFuLCBzb3VyY2VGaWxlKVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBwYXJzZWQgdGVtcGxhdGUgZm9yIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBvciBIVE1MIGZpbGVcbiAgICogQHBhcmFtIHBvc2l0aW9uIFBvc2l0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpbiB0aGUgVFMgZmlsZSwgb3RoZXJ3aXNlIGlnbm9yZWQuXG4gICAqL1xuICBnZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IFRlbXBsYXRlSW5mb3x1bmRlZmluZWQge1xuICAgIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkO1xuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIEZpbmQgdGhlIG5vZGUgdGhhdCBtb3N0IGNsb3NlbHkgbWF0Y2hlcyB0aGUgcG9zaXRpb25cbiAgICAgIGNvbnN0IG5vZGUgPSBmaW5kVGlnaGVzdE5vZGUoc291cmNlRmlsZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRJbnRlcm5hbFRlbXBsYXRlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgfVxuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYXN0UmVzdWx0ID0gdGhpcy5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSk7XG4gICAgaWYgKGFzdFJlc3VsdCAmJiBhc3RSZXN1bHQuaHRtbEFzdCAmJiBhc3RSZXN1bHQudGVtcGxhdGVBc3QgJiYgYXN0UmVzdWx0LmRpcmVjdGl2ZSAmJlxuICAgICAgICBhc3RSZXN1bHQuZGlyZWN0aXZlcyAmJiBhc3RSZXN1bHQucGlwZXMgJiYgYXN0UmVzdWx0LmV4cHJlc3Npb25QYXJzZXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBvc2l0aW9uLFxuICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGh0bWxBc3Q6IGFzdFJlc3VsdC5odG1sQXN0LFxuICAgICAgICBkaXJlY3RpdmU6IGFzdFJlc3VsdC5kaXJlY3RpdmUsXG4gICAgICAgIGRpcmVjdGl2ZXM6IGFzdFJlc3VsdC5kaXJlY3RpdmVzLFxuICAgICAgICBwaXBlczogYXN0UmVzdWx0LnBpcGVzLFxuICAgICAgICB0ZW1wbGF0ZUFzdDogYXN0UmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgICBleHByZXNzaW9uUGFyc2VyOiBhc3RSZXN1bHQuZXhwcmVzc2lvblBhcnNlclxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBnZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UpOiBBc3RSZXN1bHQge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNvbHZlZE1ldGFkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEodGVtcGxhdGUudHlwZSk7XG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHJlc29sdmVkTWV0YWRhdGEgJiYgcmVzb2x2ZWRNZXRhZGF0YS5tZXRhZGF0YTtcbiAgICAgIGlmICghbWV0YWRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgfVxuICAgICAgY29uc3QgcmF3SHRtbFBhcnNlciA9IG5ldyBIdG1sUGFyc2VyKCk7XG4gICAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IEkxOE5IdG1sUGFyc2VyKHJhd0h0bWxQYXJzZXIpO1xuICAgICAgY29uc3QgZXhwcmVzc2lvblBhcnNlciA9IG5ldyBQYXJzZXIobmV3IExleGVyKCkpO1xuICAgICAgY29uc3QgY29uZmlnID0gbmV3IENvbXBpbGVyQ29uZmlnKCk7XG4gICAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgICAgY29uZmlnLCB0aGlzLnJlZmxlY3RvciwgZXhwcmVzc2lvblBhcnNlciwgbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpLCBodG1sUGFyc2VyLFxuICAgICAgICAgIG51bGwgISwgW10pO1xuICAgICAgY29uc3QgaHRtbFJlc3VsdCA9IGh0bWxQYXJzZXIucGFyc2UodGVtcGxhdGUuc291cmNlLCAnJywge3Rva2VuaXplRXhwYW5zaW9uRm9ybXM6IHRydWV9KTtcbiAgICAgIGNvbnN0IGVycm9yczogRGlhZ25vc3RpY1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5hbmFseXplZE1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5nZXQodGVtcGxhdGUudHlwZSkgfHxcbiAgICAgICAgICAvLyBSZXBvcnRlZCBieSB0aGUgdGhlIGRlY2xhcmF0aW9uIGRpYWdub3N0aWNzLlxuICAgICAgICAgIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUodGhpcy5hbmFseXplZE1vZHVsZXMpO1xuICAgICAgaWYgKCFuZ01vZHVsZSkge1xuICAgICAgICByZXR1cm4ge307XG4gICAgICB9XG4gICAgICBjb25zdCBkaXJlY3RpdmVzID0gbmdNb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5kaXJlY3RpdmVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZCA9PiB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkLnJlZmVyZW5jZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZCA9PiBkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGQgPT4gZCAhLm1ldGFkYXRhLnRvU3VtbWFyeSgpKTtcbiAgICAgIGNvbnN0IHBpcGVzID0gbmdNb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5waXBlcy5tYXAoXG4gICAgICAgICAgcCA9PiB0aGlzLnJlc29sdmVyLmdldE9yTG9hZFBpcGVNZXRhZGF0YShwLnJlZmVyZW5jZSkudG9TdW1tYXJ5KCkpO1xuICAgICAgY29uc3Qgc2NoZW1hcyA9IG5nTW9kdWxlLnNjaGVtYXM7XG4gICAgICBjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgbWV0YWRhdGEsIGRpcmVjdGl2ZXMsIHBpcGVzLCBzY2hlbWFzKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgICB0ZW1wbGF0ZUFzdDogcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QsXG4gICAgICAgIGRpcmVjdGl2ZTogbWV0YWRhdGEsIGRpcmVjdGl2ZXMsIHBpcGVzLFxuICAgICAgICBwYXJzZUVycm9yczogcGFyc2VSZXN1bHQuZXJyb3JzLCBleHByZXNzaW9uUGFyc2VyLCBlcnJvcnNcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3Qgc3BhbiA9IGUuZmlsZU5hbWUgPT09IHRlbXBsYXRlLmZpbGVOYW1lICYmIHRlbXBsYXRlLnF1ZXJ5LmdldFNwYW5BdChlLmxpbmUsIGUuY29sdW1uKSB8fFxuICAgICAgICAgIHRlbXBsYXRlLnNwYW47XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IFt7XG4gICAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgbWVzc2FnZTogZS5tZXNzYWdlLCBzcGFuLFxuICAgICAgICB9XSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUobW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQge1xuICBsZXQgcmVzdWx0OiBDb21waWxlTmdNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCByZXN1bHRTaXplID0gMDtcbiAgZm9yIChjb25zdCBtb2R1bGUgb2YgbW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICBjb25zdCBtb2R1bGVTaXplID0gbW9kdWxlLnRyYW5zaXRpdmVNb2R1bGUuZGlyZWN0aXZlcy5sZW5ndGg7XG4gICAgaWYgKG1vZHVsZVNpemUgPiByZXN1bHRTaXplKSB7XG4gICAgICByZXN1bHQgPSBtb2R1bGU7XG4gICAgICByZXN1bHRTaXplID0gbW9kdWxlU2l6ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc3Bhbk9mKG5vZGU6IHRzLk5vZGUpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgICAgaWYgKG5vZGUua2luZCA+IHRzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kQ2hpbGQpO1xuICAgICAgICByZXR1cm4gYmV0dGVyTm9kZSB8fCBub2RlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBub2RlID0gdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZpbmRDaGlsZCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY29udmVydENoYWluKGNoYWluOiBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4pOiBEaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBjaGFpbi5tZXNzYWdlLCBuZXh0OiBjaGFpbi5uZXh0ID8gY29udmVydENoYWluKGNoYWluLm5leHQpIDogdW5kZWZpbmVkfTtcbn1cblxuZnVuY3Rpb24gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZXJyb3I6IEZvcm1hdHRlZEVycm9yLCBzcGFuOiBTcGFuKTogRGVjbGFyYXRpb25FcnJvciB7XG4gIHJldHVybiB7bWVzc2FnZTogZXJyb3IuY2hhaW4gPyBjb252ZXJ0Q2hhaW4oZXJyb3IuY2hhaW4pIDogZXJyb3IubWVzc2FnZSwgc3Bhbn07XG59XG4iXX0=