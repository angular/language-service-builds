/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript/lib/tsserverlibrary", "@angular/language-service/common/ts_utils", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/ts_utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeScriptServiceHost = exports.DummyResourceLoader = exports.DummyHtmlParser = exports.createLanguageServiceFromTypescript = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var tss = require("typescript/lib/tsserverlibrary");
    var ts_utils_1 = require("@angular/language-service/common/ts_utils");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var reflector_host_1 = require("@angular/language-service/src/reflector_host");
    var template_1 = require("@angular/language-service/src/template");
    var ts_utils_2 = require("@angular/language-service/src/ts_utils");
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
        DummyHtmlParser.prototype.parse = function () {
            return new compiler_1.ParseTreeResult([], []);
        };
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
        DummyResourceLoader.prototype.get = function (_url) {
            return Promise.resolve('');
        };
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
        function TypeScriptServiceHost(tsLsHost, tsLS) {
            var _this = this;
            this.tsLsHost = tsLsHost;
            this.tsLS = tsLS;
            this.staticSymbolCache = new compiler_1.StaticSymbolCache();
            this.fileToComponent = new Map();
            this.collectedErrors = new Map();
            this.fileVersions = new Map();
            this.lastProgram = undefined;
            this.analyzedModules = {
                files: [],
                ngModuleByPipeOrDirective: new Map(),
                ngModules: [],
            };
            this.summaryResolver = new compiler_1.AotSummaryResolver({
                loadSummary: function (_filePath) {
                    return null;
                },
                isSourceFile: function (_sourceFilePath) {
                    return true;
                },
                toSummaryFileName: function (sourceFilePath) {
                    return sourceFilePath;
                },
                fromSummaryFileName: function (filePath) {
                    return filePath;
                },
            }, this.staticSymbolCache);
            this.reflectorHost = new reflector_host_1.ReflectorHost(function () { return _this.program; }, tsLsHost);
            this.staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this.staticSymbolCache, this.summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
        }
        Object.defineProperty(TypeScriptServiceHost.prototype, "resolver", {
            /**
             * Return the singleton instance of the MetadataResolver.
             */
            get: function () {
                var _this = this;
                if (this._resolver) {
                    return this._resolver;
                }
                // StaticReflector keeps its own private caches that are not clearable.
                // We have no choice but to create a new instance to invalidate the caches.
                // TODO: Revisit this when language service gets rewritten for Ivy.
                var staticReflector = new compiler_1.StaticReflector(this.summaryResolver, this.staticSymbolResolver, [], // knownMetadataClasses
                [], // knownMetadataFunctions
                function (e, filePath) { return _this.collectError(e, filePath); });
                // Because static reflector above is changed, we need to create a new
                // resolver.
                var moduleResolver = new compiler_1.NgModuleResolver(staticReflector);
                var directiveResolver = new compiler_1.DirectiveResolver(staticReflector);
                var pipeResolver = new compiler_1.PipeResolver(staticReflector);
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
                this._resolver = new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this.staticSymbolCache, staticReflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
                return this._resolver;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TypeScriptServiceHost.prototype, "reflector", {
            /**
             * Return the singleton instance of the StaticReflector hosted in the
             * MetadataResolver.
             */
            get: function () {
                return this.resolver.getReflector();
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Return all known external templates.
         */
        TypeScriptServiceHost.prototype.getExternalTemplates = function () {
            return tslib_1.__spread(this.fileToComponent.keys());
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
            this.fileToComponent.clear();
            this.collectedErrors.clear();
            this.resolver.clearCache();
            var analyzeHost = {
                isSourceFile: function (_filePath) {
                    return true;
                }
            };
            var programFiles = this.program.getSourceFiles().map(function (sf) { return sf.fileName; });
            try {
                this.analyzedModules =
                    compiler_1.analyzeNgModules(programFiles, analyzeHost, this.staticSymbolResolver, this.resolver);
            }
            catch (e) {
                // Analyzing modules may throw; in that case, reuse the old modules.
                this.error("Analyzing NgModules failed. " + e);
                return this.analyzedModules;
            }
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
         * Checks whether the program has changed, and invalidate static symbols in
         * the source files that have changed.
         * Returns true if modules are up-to-date, false otherwise.
         * This should only be called by getAnalyzedModules().
         */
        TypeScriptServiceHost.prototype.upToDate = function () {
            var e_3, _a, e_4, _b, e_5, _c;
            var _d = this, lastProgram = _d.lastProgram, program = _d.program;
            if (lastProgram === program) {
                return true;
            }
            this.lastProgram = program;
            // Even though the program has changed, it could be the case that none of
            // the source files have changed. If all source files remain the same, then
            // program is still up-to-date, and we should not invalidate caches.
            var filesAdded = 0;
            var filesChangedOrRemoved = [];
            // Check if any source files have been added / changed since last computation.
            var seen = new Set();
            var ANGULAR_CORE = '@angular/core';
            var corePath = this.reflectorHost.moduleNameToFileName(ANGULAR_CORE);
            try {
                for (var _e = tslib_1.__values(program.getSourceFiles()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var fileName = _f.value.fileName;
                    // If `@angular/core` is edited, the language service would have to be
                    // restarted, so ignore changes to `@angular/core`.
                    // When the StaticReflector is initialized at startup, it loads core
                    // symbols from @angular/core by calling initializeConversionMap(). This
                    // is only done once. If the file is invalidated, some of the core symbols
                    // will be lost permanently.
                    if (fileName === corePath) {
                        continue;
                    }
                    seen.add(fileName);
                    var version = this.tsLsHost.getScriptVersion(fileName);
                    var lastVersion = this.fileVersions.get(fileName);
                    if (lastVersion === undefined) {
                        filesAdded++;
                        this.fileVersions.set(fileName, version);
                    }
                    else if (version !== lastVersion) {
                        filesChangedOrRemoved.push(fileName); // changed
                        this.fileVersions.set(fileName, version);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                // Check if any source files have been removed since last computation.
                for (var _g = tslib_1.__values(this.fileVersions), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var _j = tslib_1.__read(_h.value, 1), fileName = _j[0];
                    if (!seen.has(fileName)) {
                        filesChangedOrRemoved.push(fileName); // removed
                        // Because Maps are iterated in insertion order, it is safe to delete
                        // entries from the same map while iterating.
                        // See https://stackoverflow.com/questions/35940216 and
                        // https://www.ecma-international.org/ecma-262/10.0/index.html#sec-map.prototype.foreach
                        this.fileVersions.delete(fileName);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_4) throw e_4.error; }
            }
            try {
                for (var filesChangedOrRemoved_1 = tslib_1.__values(filesChangedOrRemoved), filesChangedOrRemoved_1_1 = filesChangedOrRemoved_1.next(); !filesChangedOrRemoved_1_1.done; filesChangedOrRemoved_1_1 = filesChangedOrRemoved_1.next()) {
                    var fileName = filesChangedOrRemoved_1_1.value;
                    var symbols = this.staticSymbolResolver.invalidateFile(fileName);
                    this.reflector.invalidateSymbols(symbols);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (filesChangedOrRemoved_1_1 && !filesChangedOrRemoved_1_1.done && (_c = filesChangedOrRemoved_1.return)) _c.call(filesChangedOrRemoved_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            // Program is up-to-date iff no files are added, changed, or removed.
            return filesAdded === 0 && filesChangedOrRemoved.length === 0;
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
                        tss.forEachChild(child, visit_1);
                    }
                };
                var sourceFile = this.getSourceFile(fileName);
                if (sourceFile) {
                    tss.forEachChild(sourceFile, visit_1);
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
        /**
         * Return metadata about all class declarations in the file that are Angular
         * directives. Potential matches are `@NgModule`, `@Component`, `@Directive`,
         * `@Pipes`, etc. class declarations.
         *
         * @param fileName TS file
         */
        TypeScriptServiceHost.prototype.getDeclarations = function (fileName) {
            var _this = this;
            if (!fileName.endsWith('.ts')) {
                return [];
            }
            var sourceFile = this.getSourceFile(fileName);
            if (!sourceFile) {
                return [];
            }
            var results = [];
            var visit = function (child) {
                var candidate = ts_utils_2.getDirectiveClassLike(child);
                if (candidate) {
                    var classId = candidate.classId;
                    var declarationSpan = spanOf(classId);
                    var className = classId.getText();
                    var classSymbol = _this.reflector.getStaticSymbol(sourceFile.fileName, className);
                    // Ask the resolver to check if candidate is actually Angular directive
                    if (!_this.resolver.isDirective(classSymbol)) {
                        return;
                    }
                    var data = _this.resolver.getNonNormalizedDirectiveMetadata(classSymbol);
                    if (!data) {
                        return;
                    }
                    results.push({
                        type: classSymbol,
                        declarationSpan: declarationSpan,
                        metadata: data.metadata,
                        errors: _this.getCollectedErrors(declarationSpan, sourceFile),
                    });
                }
                else {
                    child.forEachChild(visit);
                }
            };
            tss.forEachChild(sourceFile, visit);
            return results;
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
            enumerable: false,
            configurable: true
        });
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
        TypeScriptServiceHost.prototype.getInternalTemplate = function (node) {
            if (!tss.isStringLiteralLike(node)) {
                return;
            }
            var classDecl = ts_utils_1.getClassDeclOfInlineTemplateNode(node);
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
            var snapshot = this.tsLsHost.getScriptSnapshot(fileName);
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
                if (tss.isClassDeclaration(child) && child.name && child.name.text === classSymbol.name) {
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
                var node = ts_utils_1.findTightestNode(sourceFile, position);
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
            return this.getTemplateAst(template);
        };
        /**
         * Find the NgModule which the directive associated with the `classSymbol`
         * belongs to, then return its schema and transitive directives and pipes.
         * @param classSymbol Angular Symbol that defines a directive
         */
        TypeScriptServiceHost.prototype.getModuleMetadataForDirective = function (classSymbol) {
            var e_6, _a, e_7, _b, _c;
            var result = {
                directives: [],
                pipes: [],
                schemas: [],
            };
            // First find which NgModule the directive belongs to.
            var ngModule = this.analyzedModules.ngModuleByPipeOrDirective.get(classSymbol) ||
                findSuitableDefaultModule(this.analyzedModules);
            if (!ngModule) {
                return result;
            }
            // Then gather all transitive directives and pipes.
            var _d = ngModule.transitiveModule, directives = _d.directives, pipes = _d.pipes;
            try {
                for (var directives_1 = tslib_1.__values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
                    var directive = directives_1_1.value;
                    var data = this.resolver.getNonNormalizedDirectiveMetadata(directive.reference);
                    if (data) {
                        result.directives.push(data.metadata.toSummary());
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            try {
                for (var pipes_1 = tslib_1.__values(pipes), pipes_1_1 = pipes_1.next(); !pipes_1_1.done; pipes_1_1 = pipes_1.next()) {
                    var pipe = pipes_1_1.value;
                    var metadata = this.resolver.getOrLoadPipeMetadata(pipe.reference);
                    result.pipes.push(metadata.toSummary());
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (pipes_1_1 && !pipes_1_1.done && (_b = pipes_1.return)) _b.call(pipes_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
            (_c = result.schemas).push.apply(_c, tslib_1.__spread(ngModule.schemas));
            return result;
        };
        /**
         * Parse the `template` and return its AST, if any.
         * @param template template to be parsed
         */
        TypeScriptServiceHost.prototype.getTemplateAst = function (template) {
            var classSymbol = template.type, fileName = template.fileName;
            var data = this.resolver.getNonNormalizedDirectiveMetadata(classSymbol);
            if (!data) {
                return;
            }
            var htmlParser = new compiler_1.HtmlParser();
            var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
            var parser = new compiler_1.TemplateParser(new compiler_1.CompilerConfig(), this.reflector, expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, // console
            [] // tranforms
            );
            var htmlResult = htmlParser.parse(template.source, fileName, {
                tokenizeExpansionForms: true,
                preserveLineEndings: true,
            });
            var _a = this.getModuleMetadataForDirective(classSymbol), directives = _a.directives, pipes = _a.pipes, schemas = _a.schemas;
            var parseResult = parser.tryParseHtml(htmlResult, data.metadata, directives, pipes, schemas);
            if (!parseResult.templateAst) {
                return;
            }
            return {
                htmlAst: htmlResult.rootNodes,
                templateAst: parseResult.templateAst,
                directive: data.metadata,
                directives: directives,
                pipes: pipes,
                parseErrors: parseResult.errors,
                expressionParser: expressionParser,
                template: template,
            };
        };
        /**
         * Log the specified `msg` to file at INFO level. If logging is not enabled
         * this method is a no-op.
         * @param msg Log message
         */
        TypeScriptServiceHost.prototype.log = function (msg) {
            if (this.tsLsHost.log) {
                this.tsLsHost.log(msg);
            }
        };
        /**
         * Log the specified `msg` to file at ERROR level. If logging is not enabled
         * this method is a no-op.
         * @param msg error message
         */
        TypeScriptServiceHost.prototype.error = function (msg) {
            if (this.tsLsHost.error) {
                this.tsLsHost.error(msg);
            }
        };
        /**
         * Log debugging info to file at INFO level, only if verbose setting is turned
         * on. Otherwise, this method is a no-op.
         * @param msg debugging message
         */
        TypeScriptServiceHost.prototype.debug = function (msg) {
            var project = this.tsLsHost;
            if (!project.projectService) {
                // tsLsHost is not a Project
                return;
            }
            var logger = project.projectService.logger;
            if (logger.hasLevel(tss.server.LogLevel.verbose)) {
                logger.info(msg);
            }
        };
        return TypeScriptServiceHost;
    }());
    exports.TypeScriptServiceHost = TypeScriptServiceHost;
    function findSuitableDefaultModule(modules) {
        var e_8, _a;
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
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return result;
    }
    function spanOf(node) {
        return { start: node.getStart(), end: node.getEnd() };
    }
    function spanAt(sourceFile, line, column) {
        if (line != null && column != null) {
            var position_1 = tss.getPositionOfLineAndCharacter(sourceFile, line, column);
            var findChild = function findChild(node) {
                if (node.kind > tss.SyntaxKind.LastToken && node.pos <= position_1 && node.end > position_1) {
                    var betterNode = tss.forEachChild(node, findChild);
                    return betterNode || node;
                }
            };
            var node = tss.forEachChild(sourceFile, findChild);
            if (node) {
                return { start: node.getStart(), end: node.getEnd() };
            }
        }
    }
    function convertChain(chain) {
        return { message: chain.message, next: chain.next ? chain.next.map(convertChain) : undefined };
    }
    function errorToDiagnosticWithChain(error, span) {
        return { message: error.chain ? convertChain(error.chain) : error.message, span: span };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNmlCO0lBQzdpQixzQ0FBcUY7SUFDckYsb0RBQXNEO0lBRXRELHNFQUFzRjtJQUV0RixtRkFBeUQ7SUFDekQsK0VBQStDO0lBQy9DLG1FQUE0RDtJQUM1RCxtRUFBaUQ7SUFHakQ7O09BRUc7SUFDSCxTQUFnQixtQ0FBbUMsQ0FDL0MsSUFBNkIsRUFBRSxPQUE0QjtRQUM3RCxJQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxJQUFNLFFBQVEsR0FBRyx3Q0FBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBTEQsa0ZBS0M7SUFFRDs7Ozs7T0FLRztJQUNIO1FBQXFDLDJDQUFVO1FBQS9DOztRQUlBLENBQUM7UUFIQywrQkFBSyxHQUFMO1lBQ0UsT0FBTyxJQUFJLDBCQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFDSCxzQkFBQztJQUFELENBQUMsQUFKRCxDQUFxQyxxQkFBVSxHQUk5QztJQUpZLDBDQUFlO0lBTTVCOztPQUVHO0lBQ0g7UUFBeUMsK0NBQWM7UUFBdkQ7O1FBSUEsQ0FBQztRQUhDLGlDQUFHLEdBQUgsVUFBSSxJQUFZO1lBQ2QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUFKRCxDQUF5Qyx5QkFBYyxHQUl0RDtJQUpZLGtEQUFtQjtJQU1oQzs7Ozs7OztPQU9HO0lBQ0g7UUFpQkUsK0JBQXFC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QUFJLElBQUksQ0FBQyxHQUFHLElBQUksVUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBUSxFQUFFO29CQUN2RixJQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDckQsT0FBTyxVQUFVLElBQUksSUFBSSxDQUFDO2lCQUMzQjtZQUNILENBQUMsQ0FBQztZQUVGLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3JELElBQUksSUFBSSxFQUFFO2dCQUNSLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUMsQ0FBQzthQUNyRDtTQUNGO0lBQ0gsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLEtBQTRCO1FBQ2hELE9BQU8sRUFBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDO0lBQy9GLENBQUM7SUFFRCxTQUFTLDBCQUEwQixDQUFDLEtBQXFCLEVBQUUsSUFBVTtRQUNuRSxPQUFPLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztJQUNsRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7YW5hbHl6ZU5nTW9kdWxlcywgQW90U3VtbWFyeVJlc29sdmVyLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlUGlwZVN1bW1hcnksIENvbXBpbGVyQ29uZmlnLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBEaXJlY3RpdmVOb3JtYWxpemVyLCBEaXJlY3RpdmVSZXNvbHZlciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBGb3JtYXR0ZWRFcnJvciwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBIdG1sUGFyc2VyLCBpc0Zvcm1hdHRlZEVycm9yLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VyLCBQYXJzZVRyZWVSZXN1bHQsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NjaGVtYU1ldGFkYXRhLCBWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0Q2xhc3NEZWNsT2ZJbmxpbmVUZW1wbGF0ZU5vZGV9IGZyb20gJy4uL2NvbW1vbi90c191dGlscyc7XG5cbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtSZWZsZWN0b3JIb3N0fSBmcm9tICcuL3JlZmxlY3Rvcl9ob3N0JztcbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZSwgSW5saW5lVGVtcGxhdGV9IGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0IHtnZXREaXJlY3RpdmVDbGFzc0xpa2V9IGZyb20gJy4vdHNfdXRpbHMnO1xuaW1wb3J0IHtBc3RSZXN1bHQsIERlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkVycm9yLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3QsIFNwYW4sIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDcmVhdGUgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZUZyb21UeXBlc2NyaXB0KFxuICAgIGhvc3Q6IHRzcy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBzZXJ2aWNlOiB0c3MuTGFuZ3VhZ2VTZXJ2aWNlKTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3QgbmdIb3N0ID0gbmV3IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdChob3N0LCBzZXJ2aWNlKTtcbiAgY29uc3QgbmdTZXJ2ZXIgPSBjcmVhdGVMYW5ndWFnZVNlcnZpY2UobmdIb3N0KTtcbiAgcmV0dXJuIG5nU2VydmVyO1xufVxuXG4vKipcbiAqIFRoZSBsYW5ndWFnZSBzZXJ2aWNlIG5ldmVyIG5lZWRzIHRoZSBub3JtYWxpemVkIHZlcnNpb25zIG9mIHRoZSBtZXRhZGF0YS4gVG8gYXZvaWQgcGFyc2luZ1xuICogdGhlIGNvbnRlbnQgYW5kIHJlc29sdmluZyByZWZlcmVuY2VzLCByZXR1cm4gYW4gZW1wdHkgZmlsZS4gVGhpcyBhbHNvIGFsbG93cyBub3JtYWxpemluZ1xuICogdGVtcGxhdGUgdGhhdCBhcmUgc3ludGF0aWNhbGx5IGluY29ycmVjdCB3aGljaCBpcyByZXF1aXJlZCB0byBwcm92aWRlIGNvbXBsZXRpb25zIGluXG4gKiBzeW50YWN0aWNhbGx5IGluY29ycmVjdCB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdW1teUh0bWxQYXJzZXIgZXh0ZW5kcyBIdG1sUGFyc2VyIHtcbiAgcGFyc2UoKTogUGFyc2VUcmVlUmVzdWx0IHtcbiAgICByZXR1cm4gbmV3IFBhcnNlVHJlZVJlc3VsdChbXSwgW10pO1xuICB9XG59XG5cbi8qKlxuICogQXZvaWQgbG9hZGluZyByZXNvdXJjZXMgaW4gdGhlIGxhbmd1YWdlIHNlcnZjaWUgYnkgdXNpbmcgYSBkdW1teSBsb2FkZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdW1teVJlc291cmNlTG9hZGVyIGV4dGVuZHMgUmVzb3VyY2VMb2FkZXIge1xuICBnZXQoX3VybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCcnKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIGEgYExhbmd1YWdlU2VydmljZUhvc3RgIGZvciBhIFR5cGVTY3JpcHQgcHJvamVjdC5cbiAqXG4gKiBUaGUgYFR5cGVTY3JpcHRTZXJ2aWNlSG9zdGAgaW1wbGVtZW50cyB0aGUgQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgdXNpbmdcbiAqIHRoZSBUeXBlU2NyaXB0IGxhbmd1YWdlIHNlcnZpY2VzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCBpbXBsZW1lbnRzIExhbmd1YWdlU2VydmljZUhvc3Qge1xuICBwcml2YXRlIHJlYWRvbmx5IHN1bW1hcnlSZXNvbHZlcjogQW90U3VtbWFyeVJlc29sdmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlZmxlY3Rvckhvc3Q6IFJlZmxlY3Rvckhvc3Q7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGljU3ltYm9sUmVzb2x2ZXI6IFN0YXRpY1N5bWJvbFJlc29sdmVyO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGljU3ltYm9sQ2FjaGUgPSBuZXcgU3RhdGljU3ltYm9sQ2FjaGUoKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVG9Db21wb25lbnQgPSBuZXcgTWFwPHN0cmluZywgU3RhdGljU3ltYm9sPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbGxlY3RlZEVycm9ycyA9IG5ldyBNYXA8c3RyaW5nLCBhbnlbXT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVmVyc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIHByaXZhdGUgbGFzdFByb2dyYW06IHRzcy5Qcm9ncmFtfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICAgIGZpbGVzOiBbXSxcbiAgICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gICAgbmdNb2R1bGVzOiBbXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSB0c0xzSG9zdDogdHNzLkxhbmd1YWdlU2VydmljZUhvc3QsIHJlYWRvbmx5IHRzTFM6IHRzcy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciA9IG5ldyBBb3RTdW1tYXJ5UmVzb2x2ZXIoXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkU3VtbWFyeShfZmlsZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpc1NvdXJjZUZpbGUoX3NvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdG9TdW1tYXJ5RmlsZU5hbWUoc291cmNlRmlsZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUZpbGVQYXRoO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZnJvbVN1bW1hcnlGaWxlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlKTtcbiAgICB0aGlzLnJlZmxlY3Rvckhvc3QgPSBuZXcgUmVmbGVjdG9ySG9zdCgoKSA9PiB0aGlzLnByb2dyYW0sIHRzTHNIb3N0KTtcbiAgICB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyID0gbmV3IFN0YXRpY1N5bWJvbFJlc29sdmVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rvckhvc3QsIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUsIHRoaXMuc3VtbWFyeVJlc29sdmVyLFxuICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoKSk7XG4gIH1cblxuICAvLyBUaGUgcmVzb2x2ZXIgaXMgaW5zdGFudGlhdGVkIGxhemlseSBhbmQgc2hvdWxkIG5vdCBiZSBhY2Nlc3NlZCBkaXJlY3RseS5cbiAgLy8gSW5zdGVhZCwgY2FsbCB0aGUgcmVzb2x2ZXIgZ2V0dGVyLiBUaGUgaW5zdGFudGlhdGlvbiBvZiB0aGUgcmVzb2x2ZXIgYWxzb1xuICAvLyByZXF1aXJlcyBpbnN0YW50aWF0aW9uIG9mIHRoZSBTdGF0aWNSZWZsZWN0b3IsIGFuZCB0aGUgbGF0dGVyIHJlcXVpcmVzXG4gIC8vIHJlc29sdXRpb24gb2YgY29yZSBBbmd1bGFyIHN5bWJvbHMuIE1vZHVsZSByZXNvbHV0aW9uIHNob3VsZCBub3QgYmUgZG9uZVxuICAvLyBkdXJpbmcgaW5zdGFudGlhdGlvbiB0byBhdm9pZCBjeWNsaWMgZGVwZW5kZW5jeSBiZXR3ZWVuIHRoZSBwbHVnaW4gYW5kIHRoZVxuICAvLyBjb250YWluaW5nIFByb2plY3QsIHNvIHRoZSBTaW5nbGV0b24gcGF0dGVybiBpcyB1c2VkIGhlcmUuXG4gIHByaXZhdGUgX3Jlc29sdmVyOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlcnx1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgc2luZ2xldG9uIGluc3RhbmNlIG9mIHRoZSBNZXRhZGF0YVJlc29sdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgcmVzb2x2ZXIoKTogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIge1xuICAgIGlmICh0aGlzLl9yZXNvbHZlcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVyO1xuICAgIH1cbiAgICAvLyBTdGF0aWNSZWZsZWN0b3Iga2VlcHMgaXRzIG93biBwcml2YXRlIGNhY2hlcyB0aGF0IGFyZSBub3QgY2xlYXJhYmxlLlxuICAgIC8vIFdlIGhhdmUgbm8gY2hvaWNlIGJ1dCB0byBjcmVhdGUgYSBuZXcgaW5zdGFuY2UgdG8gaW52YWxpZGF0ZSB0aGUgY2FjaGVzLlxuICAgIC8vIFRPRE86IFJldmlzaXQgdGhpcyB3aGVuIGxhbmd1YWdlIHNlcnZpY2UgZ2V0cyByZXdyaXR0ZW4gZm9yIEl2eS5cbiAgICBjb25zdCBzdGF0aWNSZWZsZWN0b3IgPSBuZXcgU3RhdGljUmVmbGVjdG9yKFxuICAgICAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlcixcbiAgICAgICAgW10sICAvLyBrbm93bk1ldGFkYXRhQ2xhc3Nlc1xuICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFGdW5jdGlvbnNcbiAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCkpO1xuICAgIC8vIEJlY2F1c2Ugc3RhdGljIHJlZmxlY3RvciBhYm92ZSBpcyBjaGFuZ2VkLCB3ZSBuZWVkIHRvIGNyZWF0ZSBhIG5ld1xuICAgIC8vIHJlc29sdmVyLlxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE5nTW9kdWxlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBkaXJlY3RpdmVSZXNvbHZlciA9IG5ldyBEaXJlY3RpdmVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IHBpcGVSZXNvbHZlciA9IG5ldyBQaXBlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRHVtbXlSZXNvdXJjZUxvYWRlcigpO1xuICAgIGNvbnN0IHVybFJlc29sdmVyID0gY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlcigpO1xuICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgRHVtbXlIdG1sUGFyc2VyKCk7XG4gICAgLy8gVGhpcyB0cmFja3MgdGhlIENvbXBpbGVDb25maWcgaW4gY29kZWdlbi50cy4gQ3VycmVudGx5IHRoZXNlIG9wdGlvbnNcbiAgICAvLyBhcmUgaGFyZC1jb2RlZC5cbiAgICBjb25zdCBjb25maWcgPSBuZXcgQ29tcGlsZXJDb25maWcoe1xuICAgICAgZGVmYXVsdEVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLkVtdWxhdGVkLFxuICAgICAgdXNlSml0OiBmYWxzZSxcbiAgICB9KTtcbiAgICBjb25zdCBkaXJlY3RpdmVOb3JtYWxpemVyID1cbiAgICAgICAgbmV3IERpcmVjdGl2ZU5vcm1hbGl6ZXIocmVzb3VyY2VMb2FkZXIsIHVybFJlc29sdmVyLCBodG1sUGFyc2VyLCBjb25maWcpO1xuICAgIHRoaXMuX3Jlc29sdmVyID0gbmV3IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyKFxuICAgICAgICBjb25maWcsIGh0bWxQYXJzZXIsIG1vZHVsZVJlc29sdmVyLCBkaXJlY3RpdmVSZXNvbHZlciwgcGlwZVJlc29sdmVyLFxuICAgICAgICBuZXcgSml0U3VtbWFyeVJlc29sdmVyKCksIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgZGlyZWN0aXZlTm9ybWFsaXplciwgbmV3IENvbnNvbGUoKSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgc3RhdGljUmVmbGVjdG9yLFxuICAgICAgICAoZXJyb3IsIHR5cGUpID0+IHRoaXMuY29sbGVjdEVycm9yKGVycm9yLCB0eXBlICYmIHR5cGUuZmlsZVBhdGgpKTtcbiAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIFN0YXRpY1JlZmxlY3RvciBob3N0ZWQgaW4gdGhlXG4gICAqIE1ldGFkYXRhUmVzb2x2ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogU3RhdGljUmVmbGVjdG9yIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5nZXRSZWZsZWN0b3IoKSBhcyBTdGF0aWNSZWZsZWN0b3I7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFsbCBrbm93biBleHRlcm5hbCB0ZW1wbGF0ZXMuXG4gICAqL1xuICBnZXRFeHRlcm5hbFRlbXBsYXRlcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmZpbGVUb0NvbXBvbmVudC5rZXlzKCldO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkIGFuZCByZXR1cm5zIGFsbCBhbmFseXplZCBtb2R1bGVzLlxuICAgKiBJZiBwcm9ncmFtIGhhcyBjaGFuZ2VkLCBpbnZhbGlkYXRlIGFsbCBjYWNoZXMgYW5kIHVwZGF0ZSBmaWxlVG9Db21wb25lbnRcbiAgICogYW5kIHRlbXBsYXRlUmVmZXJlbmNlcy5cbiAgICogSW4gYWRkaXRpb24gdG8gcmV0dXJuaW5nIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgdGhpcyBtZXRob2QgcGxheXMgdGhlXG4gICAqIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YScgaW4gdHNzZXJ2ZXIuXG4gICAqL1xuICBnZXRBbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICh0aGlzLnVwVG9EYXRlKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmFuYWx5emVkTW9kdWxlcztcbiAgICB9XG5cbiAgICAvLyBJbnZhbGlkYXRlIGNhY2hlc1xuICAgIHRoaXMuZmlsZVRvQ29tcG9uZW50LmNsZWFyKCk7XG4gICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuY2xlYXIoKTtcbiAgICB0aGlzLnJlc29sdmVyLmNsZWFyQ2FjaGUoKTtcblxuICAgIGNvbnN0IGFuYWx5emVIb3N0ID0ge1xuICAgICAgaXNTb3VyY2VGaWxlKF9maWxlUGF0aDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH07XG4gICAgY29uc3QgcHJvZ3JhbUZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNmID0+IHNmLmZpbGVOYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICB0aGlzLmFuYWx5emVkTW9kdWxlcyA9XG4gICAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBBbmFseXppbmcgbW9kdWxlcyBtYXkgdGhyb3c7IGluIHRoYXQgY2FzZSwgcmV1c2UgdGhlIG9sZCBtb2R1bGVzLlxuICAgICAgdGhpcy5lcnJvcihgQW5hbHl6aW5nIE5nTW9kdWxlcyBmYWlsZWQuICR7ZX1gKTtcbiAgICAgIHJldHVybiB0aGlzLmFuYWx5emVkTW9kdWxlcztcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgdGVtcGxhdGUgcmVmZXJlbmNlcyBhbmQgZmlsZVRvQ29tcG9uZW50XG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyKCk7XG4gICAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiB0aGlzLmFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7bWV0YWRhdGF9ID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlLnJlZmVyZW5jZSkhO1xuICAgICAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQgJiYgbWV0YWRhdGEudGVtcGxhdGUgJiYgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB1cmxSZXNvbHZlci5yZXNvbHZlKFxuICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5zZXQodGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFuYWx5emVkTW9kdWxlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgYW5kIGludmFsaWRhdGUgc3RhdGljIHN5bWJvbHMgaW5cbiAgICogdGhlIHNvdXJjZSBmaWxlcyB0aGF0IGhhdmUgY2hhbmdlZC5cbiAgICogUmV0dXJucyB0cnVlIGlmIG1vZHVsZXMgYXJlIHVwLXRvLWRhdGUsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogVGhpcyBzaG91bGQgb25seSBiZSBjYWxsZWQgYnkgZ2V0QW5hbHl6ZWRNb2R1bGVzKCkuXG4gICAqL1xuICBwcml2YXRlIHVwVG9EYXRlKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHtsYXN0UHJvZ3JhbSwgcHJvZ3JhbX0gPSB0aGlzO1xuICAgIGlmIChsYXN0UHJvZ3JhbSA9PT0gcHJvZ3JhbSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRoaXMubGFzdFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgLy8gRXZlbiB0aG91Z2ggdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQsIGl0IGNvdWxkIGJlIHRoZSBjYXNlIHRoYXQgbm9uZSBvZlxuICAgIC8vIHRoZSBzb3VyY2UgZmlsZXMgaGF2ZSBjaGFuZ2VkLiBJZiBhbGwgc291cmNlIGZpbGVzIHJlbWFpbiB0aGUgc2FtZSwgdGhlblxuICAgIC8vIHByb2dyYW0gaXMgc3RpbGwgdXAtdG8tZGF0ZSwgYW5kIHdlIHNob3VsZCBub3QgaW52YWxpZGF0ZSBjYWNoZXMuXG4gICAgbGV0IGZpbGVzQWRkZWQgPSAwO1xuICAgIGNvbnN0IGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZDogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIENoZWNrIGlmIGFueSBzb3VyY2UgZmlsZXMgaGF2ZSBiZWVuIGFkZGVkIC8gY2hhbmdlZCBzaW5jZSBsYXN0IGNvbXB1dGF0aW9uLlxuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBBTkdVTEFSX0NPUkUgPSAnQGFuZ3VsYXIvY29yZSc7XG4gICAgY29uc3QgY29yZVBhdGggPSB0aGlzLnJlZmxlY3Rvckhvc3QubW9kdWxlTmFtZVRvRmlsZU5hbWUoQU5HVUxBUl9DT1JFKTtcbiAgICBmb3IgKGNvbnN0IHtmaWxlTmFtZX0gb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAvLyBJZiBgQGFuZ3VsYXIvY29yZWAgaXMgZWRpdGVkLCB0aGUgbGFuZ3VhZ2Ugc2VydmljZSB3b3VsZCBoYXZlIHRvIGJlXG4gICAgICAvLyByZXN0YXJ0ZWQsIHNvIGlnbm9yZSBjaGFuZ2VzIHRvIGBAYW5ndWxhci9jb3JlYC5cbiAgICAgIC8vIFdoZW4gdGhlIFN0YXRpY1JlZmxlY3RvciBpcyBpbml0aWFsaXplZCBhdCBzdGFydHVwLCBpdCBsb2FkcyBjb3JlXG4gICAgICAvLyBzeW1ib2xzIGZyb20gQGFuZ3VsYXIvY29yZSBieSBjYWxsaW5nIGluaXRpYWxpemVDb252ZXJzaW9uTWFwKCkuIFRoaXNcbiAgICAgIC8vIGlzIG9ubHkgZG9uZSBvbmNlLiBJZiB0aGUgZmlsZSBpcyBpbnZhbGlkYXRlZCwgc29tZSBvZiB0aGUgY29yZSBzeW1ib2xzXG4gICAgICAvLyB3aWxsIGJlIGxvc3QgcGVybWFuZW50bHkuXG4gICAgICBpZiAoZmlsZU5hbWUgPT09IGNvcmVQYXRoKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgc2Vlbi5hZGQoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHRoaXMudHNMc0hvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICBjb25zdCBsYXN0VmVyc2lvbiA9IHRoaXMuZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAobGFzdFZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaWxlc0FkZGVkKys7XG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgICB9IGVsc2UgaWYgKHZlcnNpb24gIT09IGxhc3RWZXJzaW9uKSB7XG4gICAgICAgIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5wdXNoKGZpbGVOYW1lKTsgIC8vIGNoYW5nZWRcbiAgICAgICAgdGhpcy5maWxlVmVyc2lvbnMuc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgc291cmNlIGZpbGVzIGhhdmUgYmVlbiByZW1vdmVkIHNpbmNlIGxhc3QgY29tcHV0YXRpb24uXG4gICAgZm9yIChjb25zdCBbZmlsZU5hbWVdIG9mIHRoaXMuZmlsZVZlcnNpb25zKSB7XG4gICAgICBpZiAoIXNlZW4uaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICBmaWxlc0NoYW5nZWRPclJlbW92ZWQucHVzaChmaWxlTmFtZSk7ICAvLyByZW1vdmVkXG4gICAgICAgIC8vIEJlY2F1c2UgTWFwcyBhcmUgaXRlcmF0ZWQgaW4gaW5zZXJ0aW9uIG9yZGVyLCBpdCBpcyBzYWZlIHRvIGRlbGV0ZVxuICAgICAgICAvLyBlbnRyaWVzIGZyb20gdGhlIHNhbWUgbWFwIHdoaWxlIGl0ZXJhdGluZy5cbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1OTQwMjE2IGFuZFxuICAgICAgICAvLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzEwLjAvaW5kZXguaHRtbCNzZWMtbWFwLnByb3RvdHlwZS5mb3JlYWNoXG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlc0NoYW5nZWRPclJlbW92ZWQpIHtcbiAgICAgIGNvbnN0IHN5bWJvbHMgPSB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLmludmFsaWRhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIHRoaXMucmVmbGVjdG9yLmludmFsaWRhdGVTeW1ib2xzKHN5bWJvbHMpO1xuICAgIH1cblxuICAgIC8vIFByb2dyYW0gaXMgdXAtdG8tZGF0ZSBpZmYgbm8gZmlsZXMgYXJlIGFkZGVkLCBjaGFuZ2VkLCBvciByZW1vdmVkLlxuICAgIHJldHVybiBmaWxlc0FkZGVkID09PSAwICYmIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5sZW5ndGggPT09IDA7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGVtcGxhdGVzIGluIHRoZSBzcGVjaWZpZWQgYGZpbGVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqL1xuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzcy5Ob2RlKSA9PiB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5nZXRJbnRlcm5hbFRlbXBsYXRlKGNoaWxkKTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0c3MuZm9yRWFjaENoaWxkKGNoaWxkLCB2aXNpdCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIHRzcy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG1ldGFkYXRhIGFib3V0IGFsbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gdGhlIGZpbGUgdGhhdCBhcmUgQW5ndWxhclxuICAgKiBkaXJlY3RpdmVzLiBQb3RlbnRpYWwgbWF0Y2hlcyBhcmUgYEBOZ01vZHVsZWAsIGBAQ29tcG9uZW50YCwgYEBEaXJlY3RpdmVgLFxuICAgKiBgQFBpcGVzYCwgZXRjLiBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBmaWxlXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbnMoZmlsZU5hbWU6IHN0cmluZyk6IERlY2xhcmF0aW9uW10ge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBEZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzcy5Ob2RlKSA9PiB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSBnZXREaXJlY3RpdmVDbGFzc0xpa2UoY2hpbGQpO1xuICAgICAgaWYgKGNhbmRpZGF0ZSkge1xuICAgICAgICBjb25zdCB7Y2xhc3NJZH0gPSBjYW5kaWRhdGU7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uU3BhbiA9IHNwYW5PZihjbGFzc0lkKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NJZC5nZXRUZXh0KCk7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKHNvdXJjZUZpbGUuZmlsZU5hbWUsIGNsYXNzTmFtZSk7XG4gICAgICAgIC8vIEFzayB0aGUgcmVzb2x2ZXIgdG8gY2hlY2sgaWYgY2FuZGlkYXRlIGlzIGFjdHVhbGx5IEFuZ3VsYXIgZGlyZWN0aXZlXG4gICAgICAgIGlmICghdGhpcy5yZXNvbHZlci5pc0RpcmVjdGl2ZShjbGFzc1N5bWJvbCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGNsYXNzU3ltYm9sKTtcbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogY2xhc3NTeW1ib2wsXG4gICAgICAgICAgZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICAgIG1ldGFkYXRhOiBkYXRhLm1ldGFkYXRhLFxuICAgICAgICAgIGVycm9yczogdGhpcy5nZXRDb2xsZWN0ZWRFcnJvcnMoZGVjbGFyYXRpb25TcGFuLCBzb3VyY2VGaWxlKSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZC5mb3JFYWNoQ2hpbGQodmlzaXQpO1xuICAgICAgfVxuICAgIH07XG4gICAgdHNzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzcy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLVRTIHNvdXJjZSBmaWxlIHJlcXVlc3RlZDogJHtmaWxlTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIGdldCBwcm9ncmFtKCk6IHRzcy5Qcm9ncmFtIHtcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy50c0xTLmdldFByb2dyYW0oKTtcbiAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgIC8vIFByb2dyYW0gaXMgdmVyeSB2ZXJ5IHVubGlrZWx5IHRvIGJlIHVuZGVmaW5lZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gcHJvZ3JhbSBpbiBsYW5ndWFnZSBzZXJ2aWNlIScpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIFRlbXBsYXRlU291cmNlIGlmIGBub2RlYCBpcyBhIHRlbXBsYXRlIG5vZGUuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBAQ29tcG9uZW50KHtcbiAgICogICB0ZW1wbGF0ZTogJzxkaXY+PC9kaXY+JyA8LS0gdGVtcGxhdGUgbm9kZVxuICAgKiB9KVxuICAgKiBjbGFzcyBBcHBDb21wb25lbnQge31cbiAgICogICAgICAgICAgIF4tLS0tIGNsYXNzIGRlY2xhcmF0aW9uIG5vZGVcbiAgICpcbiAgICogQHBhcmFtIG5vZGUgUG90ZW50aWFsIHRlbXBsYXRlIG5vZGVcbiAgICovXG4gIHByaXZhdGUgZ2V0SW50ZXJuYWxUZW1wbGF0ZShub2RlOiB0c3MuTm9kZSk6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0c3MuaXNTdHJpbmdMaXRlcmFsTGlrZShub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBnZXRDbGFzc0RlY2xPZklubGluZVRlbXBsYXRlTm9kZShub2RlKTtcbiAgICBpZiAoIWNsYXNzRGVjbCB8fCAhY2xhc3NEZWNsLm5hbWUpIHsgIC8vIERvZXMgbm90IGhhbmRsZSBhbm9ueW1vdXMgY2xhc3NcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmlsZU5hbWUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChmaWxlTmFtZSwgY2xhc3NEZWNsLm5hbWUudGV4dCk7XG4gICAgcmV0dXJuIG5ldyBJbmxpbmVUZW1wbGF0ZShub2RlLCBjbGFzc0RlY2wsIGNsYXNzU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIGV4dGVybmFsIHRlbXBsYXRlIGZvciBgZmlsZU5hbWVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgSFRNTCBmaWxlXG4gICAqL1xuICBwcml2YXRlIGdldEV4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZCB7XG4gICAgLy8gRmlyc3QgZ2V0IHRoZSB0ZXh0IGZvciB0aGUgdGVtcGxhdGVcbiAgICBjb25zdCBzbmFwc2hvdCA9IHRoaXMudHNMc0hvc3QuZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWUpO1xuICAgIGlmICghc25hcHNob3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlID0gc25hcHNob3QuZ2V0VGV4dCgwLCBzbmFwc2hvdC5nZXRMZW5ndGgoKSk7XG4gICAgLy8gTmV4dCBmaW5kIHRoZSBjb21wb25lbnQgY2xhc3Mgc3ltYm9sXG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmZpbGVUb0NvbXBvbmVudC5nZXQoZmlsZU5hbWUpO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVGhlbiB1c2UgdGhlIGNsYXNzIHN5bWJvbCB0byBmaW5kIHRoZSBhY3R1YWwgdHMuQ2xhc3NEZWNsYXJhdGlvbiBub2RlXG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShjbGFzc1N5bWJvbC5maWxlUGF0aCk7XG4gICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRPRE86IFRoaXMgb25seSBjb25zaWRlcnMgdG9wLWxldmVsIGNsYXNzIGRlY2xhcmF0aW9ucyBpbiBhIHNvdXJjZSBmaWxlLlxuICAgIC8vIFRoaXMgd291bGQgbm90IGZpbmQgYSBjbGFzcyBkZWNsYXJhdGlvbiBpbiBhIG5hbWVzcGFjZSwgZm9yIGV4YW1wbGUuXG4gICAgY29uc3QgY2xhc3NEZWNsID0gc291cmNlRmlsZS5mb3JFYWNoQ2hpbGQoKGNoaWxkKSA9PiB7XG4gICAgICBpZiAodHNzLmlzQ2xhc3NEZWNsYXJhdGlvbihjaGlsZCkgJiYgY2hpbGQubmFtZSAmJiBjaGlsZC5uYW1lLnRleHQgPT09IGNsYXNzU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghY2xhc3NEZWNsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxUZW1wbGF0ZShzb3VyY2UsIGZpbGVOYW1lLCBjbGFzc0RlY2wsIGNsYXNzU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEVycm9yKGVycm9yOiBhbnksIGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICBsZXQgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGlmICghZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5zZXQoZmlsZVBhdGgsIGVycm9ycyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb2xsZWN0ZWRFcnJvcnMoZGVmYXVsdFNwYW46IFNwYW4sIHNvdXJjZUZpbGU6IHRzcy5Tb3VyY2VGaWxlKTogRGVjbGFyYXRpb25FcnJvcltdIHtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLmNvbGxlY3RlZEVycm9ycy5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgaWYgKCFlcnJvcnMpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgLy8gVE9ETzogQWRkIGJldHRlciB0eXBpbmdzIGZvciB0aGUgZXJyb3JzXG4gICAgcmV0dXJuIGVycm9ycy5tYXAoKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgbGluZSA9IGUubGluZSB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmxpbmUpO1xuICAgICAgY29uc3QgY29sdW1uID0gZS5jb2x1bW4gfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5jb2x1bW4pO1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5BdChzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pIHx8IGRlZmF1bHRTcGFuO1xuICAgICAgaWYgKGlzRm9ybWF0dGVkRXJyb3IoZSkpIHtcbiAgICAgICAgcmV0dXJuIGVycm9yVG9EaWFnbm9zdGljV2l0aENoYWluKGUsIHNwYW4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHttZXNzYWdlOiBlLm1lc3NhZ2UsIHNwYW59O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgcGFyc2VkIHRlbXBsYXRlIGZvciB0aGUgdGVtcGxhdGUgYXQgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqIEBwYXJhbSBwb3NpdGlvbiBQb3NpdGlvbiBvZiB0aGUgdGVtcGxhdGUgaW4gdGhlIFRTIGZpbGUsIG90aGVyd2lzZSBpZ25vcmVkLlxuICAgKi9cbiAgZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBBc3RSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBGaW5kIHRoZSBub2RlIHRoYXQgbW9zdCBjbG9zZWx5IG1hdGNoZXMgdGhlIHBvc2l0aW9uXG4gICAgICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzb3VyY2VGaWxlLCBwb3NpdGlvbik7XG4gICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgTmdNb2R1bGUgd2hpY2ggdGhlIGRpcmVjdGl2ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGBjbGFzc1N5bWJvbGBcbiAgICogYmVsb25ncyB0bywgdGhlbiByZXR1cm4gaXRzIHNjaGVtYSBhbmQgdHJhbnNpdGl2ZSBkaXJlY3RpdmVzIGFuZCBwaXBlcy5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIEFuZ3VsYXIgU3ltYm9sIHRoYXQgZGVmaW5lcyBhIGRpcmVjdGl2ZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRNb2R1bGVNZXRhZGF0YUZvckRpcmVjdGl2ZShjbGFzc1N5bWJvbDogU3RhdGljU3ltYm9sKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgZGlyZWN0aXZlczogW10gYXMgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnlbXSxcbiAgICAgIHBpcGVzOiBbXSBhcyBDb21waWxlUGlwZVN1bW1hcnlbXSxcbiAgICAgIHNjaGVtYXM6IFtdIGFzIFNjaGVtYU1ldGFkYXRhW10sXG4gICAgfTtcbiAgICAvLyBGaXJzdCBmaW5kIHdoaWNoIE5nTW9kdWxlIHRoZSBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KGNsYXNzU3ltYm9sKSB8fFxuICAgICAgICBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzKTtcbiAgICBpZiAoIW5nTW9kdWxlKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBUaGVuIGdhdGhlciBhbGwgdHJhbnNpdGl2ZSBkaXJlY3RpdmVzIGFuZCBwaXBlcy5cbiAgICBjb25zdCB7ZGlyZWN0aXZlcywgcGlwZXN9ID0gbmdNb2R1bGUudHJhbnNpdGl2ZU1vZHVsZTtcbiAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXN1bHQuZGlyZWN0aXZlcy5wdXNoKGRhdGEubWV0YWRhdGEudG9TdW1tYXJ5KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBpcGUgb2YgcGlwZXMpIHtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5yZXNvbHZlci5nZXRPckxvYWRQaXBlTWV0YWRhdGEocGlwZS5yZWZlcmVuY2UpO1xuICAgICAgcmVzdWx0LnBpcGVzLnB1c2gobWV0YWRhdGEudG9TdW1tYXJ5KCkpO1xuICAgIH1cbiAgICByZXN1bHQuc2NoZW1hcy5wdXNoKC4uLm5nTW9kdWxlLnNjaGVtYXMpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgdGhlIGB0ZW1wbGF0ZWAgYW5kIHJldHVybiBpdHMgQVNULCBpZiBhbnkuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWRcbiAgICovXG4gIGdldFRlbXBsYXRlQXN0KHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZSk6IEFzdFJlc3VsdHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHt0eXBlOiBjbGFzc1N5bWJvbCwgZmlsZU5hbWV9ID0gdGVtcGxhdGU7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGNsYXNzU3ltYm9sKTtcbiAgICBpZiAoIWRhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBIdG1sUGFyc2VyKCk7XG4gICAgY29uc3QgZXhwcmVzc2lvblBhcnNlciA9IG5ldyBQYXJzZXIobmV3IExleGVyKCkpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBUZW1wbGF0ZVBhcnNlcihcbiAgICAgICAgbmV3IENvbXBpbGVyQ29uZmlnKCksIHRoaXMucmVmbGVjdG9yLCBleHByZXNzaW9uUGFyc2VyLCBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCksXG4gICAgICAgIGh0bWxQYXJzZXIsXG4gICAgICAgIG51bGwsICAvLyBjb25zb2xlXG4gICAgICAgIFtdICAgICAvLyB0cmFuZm9ybXNcbiAgICApO1xuICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgZmlsZU5hbWUsIHtcbiAgICAgIHRva2VuaXplRXhwYW5zaW9uRm9ybXM6IHRydWUsXG4gICAgICBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiB0cnVlLCAgLy8gZG8gbm90IGNvbnZlcnQgQ1JMRiB0byBMRlxuICAgIH0pO1xuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hc30gPSB0aGlzLmdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgIGlmICghcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgZGlyZWN0aXZlOiBkYXRhLm1ldGFkYXRhLFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICAgIHBpcGVzLFxuICAgICAgcGFyc2VFcnJvcnM6IHBhcnNlUmVzdWx0LmVycm9ycyxcbiAgICAgIGV4cHJlc3Npb25QYXJzZXIsXG4gICAgICB0ZW1wbGF0ZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgSU5GTyBsZXZlbC4gSWYgbG9nZ2luZyBpcyBub3QgZW5hYmxlZFxuICAgKiB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIExvZyBtZXNzYWdlXG4gICAqL1xuICBsb2cobXNnOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy50c0xzSG9zdC5sb2cpIHtcbiAgICAgIHRoaXMudHNMc0hvc3QubG9nKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgRVJST1IgbGV2ZWwuIElmIGxvZ2dpbmcgaXMgbm90IGVuYWJsZWRcbiAgICogdGhpcyBtZXRob2QgaXMgYSBuby1vcC5cbiAgICogQHBhcmFtIG1zZyBlcnJvciBtZXNzYWdlXG4gICAqL1xuICBlcnJvcihtc2c6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRzTHNIb3N0LmVycm9yKSB7XG4gICAgICB0aGlzLnRzTHNIb3N0LmVycm9yKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyBkZWJ1Z2dpbmcgaW5mbyB0byBmaWxlIGF0IElORk8gbGV2ZWwsIG9ubHkgaWYgdmVyYm9zZSBzZXR0aW5nIGlzIHR1cm5lZFxuICAgKiBvbi4gT3RoZXJ3aXNlLCB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIGRlYnVnZ2luZyBtZXNzYWdlXG4gICAqL1xuICBkZWJ1Zyhtc2c6IHN0cmluZykge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLnRzTHNIb3N0IGFzIHRzcy5zZXJ2ZXIuUHJvamVjdDtcbiAgICBpZiAoIXByb2plY3QucHJvamVjdFNlcnZpY2UpIHtcbiAgICAgIC8vIHRzTHNIb3N0IGlzIG5vdCBhIFByb2plY3RcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2xvZ2dlcn0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGlmIChsb2dnZXIuaGFzTGV2ZWwodHNzLnNlcnZlci5Mb2dMZXZlbC52ZXJib3NlKSkge1xuICAgICAgbG9nZ2VyLmluZm8obXNnKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFN1aXRhYmxlRGVmYXVsdE1vZHVsZShtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCB7XG4gIGxldCByZXN1bHQ6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IHJlc3VsdFNpemUgPSAwO1xuICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGNvbnN0IG1vZHVsZVNpemUgPSBtb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5kaXJlY3RpdmVzLmxlbmd0aDtcbiAgICBpZiAobW9kdWxlU2l6ZSA+IHJlc3VsdFNpemUpIHtcbiAgICAgIHJlc3VsdCA9IG1vZHVsZTtcbiAgICAgIHJlc3VsdFNpemUgPSBtb2R1bGVTaXplO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzcGFuT2Yobm9kZTogdHNzLk5vZGUpOiBTcGFuIHtcbiAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHNzLlNvdXJjZUZpbGUsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmIChsaW5lICE9IG51bGwgJiYgY29sdW1uICE9IG51bGwpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRzcy5nZXRQb3NpdGlvbk9mTGluZUFuZENoYXJhY3Rlcihzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pO1xuICAgIGNvbnN0IGZpbmRDaGlsZCA9IGZ1bmN0aW9uIGZpbmRDaGlsZChub2RlOiB0c3MuTm9kZSk6IHRzcy5Ob2RlfHVuZGVmaW5lZCB7XG4gICAgICBpZiAobm9kZS5raW5kID4gdHNzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzcy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzcy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZmluZENoaWxkKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge21lc3NhZ2U6IGNoYWluLm1lc3NhZ2UsIG5leHQ6IGNoYWluLm5leHQgPyBjaGFpbi5uZXh0Lm1hcChjb252ZXJ0Q2hhaW4pIDogdW5kZWZpbmVkfTtcbn1cblxuZnVuY3Rpb24gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZXJyb3I6IEZvcm1hdHRlZEVycm9yLCBzcGFuOiBTcGFuKTogRGVjbGFyYXRpb25FcnJvciB7XG4gIHJldHVybiB7bWVzc2FnZTogZXJyb3IuY2hhaW4gPyBjb252ZXJ0Q2hhaW4oZXJyb3IuY2hhaW4pIDogZXJyb3IubWVzc2FnZSwgc3Bhbn07XG59XG4iXX0=