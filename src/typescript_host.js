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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript", "typescript/lib/tsserverlibrary", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var ts = require("typescript");
    var tss = require("typescript/lib/tsserverlibrary");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var reflector_host_1 = require("@angular/language-service/src/reflector_host");
    var template_1 = require("@angular/language-service/src/template");
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
        function TypeScriptServiceHost(tsLsHost, tsLS) {
            var _this = this;
            this.tsLsHost = tsLsHost;
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
            enumerable: true,
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
            enumerable: true,
            configurable: true
        });
        TypeScriptServiceHost.prototype.getTemplateReferences = function () {
            this.getAnalyzedModules();
            return tslib_1.__spread(this.templateReferences);
        };
        /**
         * Checks whether the program has changed and returns all analyzed modules.
         * If program has changed, invalidate all caches and update fileToComponent
         * and templateReferences.
         * In addition to returning information about NgModules, this method plays the
         * same role as 'synchronizeHostData' in tsserver.
         * @param ensureSynchronized whether or not the Language Service should make sure analyzedModules
         *   are synced to the last update of the project. If false, returns the set of analyzedModules
         *   that is already cached. This is useful if the project must not be reanalyzed, even if its
         *   file watchers (which are disjoint from the TypeScriptServiceHost) detect an update.
         */
        TypeScriptServiceHost.prototype.getAnalyzedModules = function (ensureSynchronized) {
            var e_1, _a, e_2, _b;
            if (ensureSynchronized === void 0) { ensureSynchronized = true; }
            if (!ensureSynchronized || this.upToDate()) {
                return this.analyzedModules;
            }
            // Invalidate caches
            this.templateReferences = [];
            this.fileToComponent.clear();
            this.collectedErrors.clear();
            this.resolver.clearCache();
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
            try {
                for (var _e = tslib_1.__values(program.getSourceFiles()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var fileName = _f.value.fileName;
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
                var candidate = utils_1.getDirectiveClassLike(child);
                if (candidate) {
                    var decoratorId = candidate.decoratorId, classDecl = candidate.classDecl;
                    var declarationSpan = spanOf(decoratorId);
                    var className = classDecl.name.text;
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
            ts.forEachChild(sourceFile, visit);
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
            enumerable: true,
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
            if (!ts.isStringLiteralLike(node)) {
                return;
            }
            var tmplAsgn = template_1.getPropertyAssignmentFromValue(node);
            if (!tmplAsgn || tmplAsgn.name.getText() !== 'template') {
                return;
            }
            var classDecl = template_1.getClassDeclFromDecoratorProp(tmplAsgn);
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
                var node = utils_1.findTightestNode(sourceFile, position);
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
         * Gets a StaticSymbol from a file and symbol name.
         * @return Angular StaticSymbol matching the file and name, if any
         */
        TypeScriptServiceHost.prototype.getStaticSymbol = function (file, name) {
            return this.reflector.getStaticSymbol(file, name);
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
            var htmlParser = new compiler_1.I18NHtmlParser(new compiler_1.HtmlParser());
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
                directive: data.metadata, directives: directives, pipes: pipes,
                parseErrors: parseResult.errors, expressionParser: expressionParser, template: template,
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
        return { message: chain.message, next: chain.next ? chain.next.map(convertChain) : undefined };
    }
    function errorToDiagnosticWithChain(error, span) {
        return { message: error.chain ? convertChain(error.chain) : error.message, span: span };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2akI7SUFDN2pCLHNDQUFxRjtJQUNyRiwrQkFBaUM7SUFDakMsb0RBQXNEO0lBR3RELG1GQUF5RDtJQUN6RCwrRUFBK0M7SUFDL0MsbUVBQTJIO0lBRTNILDZEQUFnRTtJQUdoRTs7T0FFRztJQUNILFNBQWdCLG1DQUFtQyxDQUMvQyxJQUE0QixFQUFFLE9BQTJCO1FBQzNELElBQU0sTUFBTSxHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELElBQU0sUUFBUSxHQUFHLHdDQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFMRCxrRkFLQztJQUVEOzs7OztPQUtHO0lBQ0g7UUFBcUMsMkNBQVU7UUFBL0M7O1FBRUEsQ0FBQztRQURDLCtCQUFLLEdBQUwsY0FBMkIsT0FBTyxJQUFJLDBCQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxzQkFBQztJQUFELENBQUMsQUFGRCxDQUFxQyxxQkFBVSxHQUU5QztJQUZZLDBDQUFlO0lBSTVCOztPQUVHO0lBQ0g7UUFBeUMsK0NBQWM7UUFBdkQ7O1FBRUEsQ0FBQztRQURDLGlDQUFHLEdBQUgsVUFBSSxHQUFXLElBQXFCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsMEJBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBeUMseUJBQWMsR0FFdEQ7SUFGWSxrREFBbUI7SUFJaEM7Ozs7Ozs7T0FPRztJQUNIO1FBa0JFLCtCQUNh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QUM7b0JBQ3BELE9BQU8sVUFBVSxJQUFJLElBQUksQ0FBQztpQkFDM0I7WUFDSCxDQUFDLENBQUM7WUFFRixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNwRCxJQUFJLElBQUksRUFBRTtnQkFDUixPQUFPLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFDLENBQUM7YUFDckQ7U0FDRjtJQUNILENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxLQUE0QjtRQUNoRCxPQUFPLEVBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FBQyxLQUFxQixFQUFFLElBQVU7UUFDbkUsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7SUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RTdW1tYXJ5UmVzb2x2ZXIsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlTWV0YWRhdGFSZXNvbHZlciwgQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEsIENvbXBpbGVQaXBlU3VtbWFyeSwgQ29tcGlsZXJDb25maWcsIERpcmVjdGl2ZU5vcm1hbGl6ZXIsIERpcmVjdGl2ZVJlc29sdmVyLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEZvcm1hdHRlZEVycm9yLCBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4sIEh0bWxQYXJzZXIsIEkxOE5IdG1sUGFyc2VyLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VUcmVlUmVzdWx0LCBQYXJzZXIsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyLCBhbmFseXplTmdNb2R1bGVzLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBpc0Zvcm1hdHRlZEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NjaGVtYU1ldGFkYXRhLCBWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtSZWZsZWN0b3JIb3N0fSBmcm9tICcuL3JlZmxlY3Rvcl9ob3N0JztcbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZSwgSW5saW5lVGVtcGxhdGUsIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wLCBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWV9IGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25FcnJvciwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgTGFuZ3VhZ2VTZXJ2aWNlLCBMYW5ndWFnZVNlcnZpY2VIb3N0LCBTcGFuLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldERpcmVjdGl2ZUNsYXNzTGlrZX0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBDcmVhdGUgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZUZyb21UeXBlc2NyaXB0KFxuICAgIGhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHNlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZSk6IExhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IG5nSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaG9zdCwgc2VydmljZSk7XG4gIGNvbnN0IG5nU2VydmVyID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKG5nSG9zdCk7XG4gIHJldHVybiBuZ1NlcnZlcjtcbn1cblxuLyoqXG4gKiBUaGUgbGFuZ3VhZ2Ugc2VydmljZSBuZXZlciBuZWVkcyB0aGUgbm9ybWFsaXplZCB2ZXJzaW9ucyBvZiB0aGUgbWV0YWRhdGEuIFRvIGF2b2lkIHBhcnNpbmdcbiAqIHRoZSBjb250ZW50IGFuZCByZXNvbHZpbmcgcmVmZXJlbmNlcywgcmV0dXJuIGFuIGVtcHR5IGZpbGUuIFRoaXMgYWxzbyBhbGxvd3Mgbm9ybWFsaXppbmdcbiAqIHRlbXBsYXRlIHRoYXQgYXJlIHN5bnRhdGljYWxseSBpbmNvcnJlY3Qgd2hpY2ggaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSBjb21wbGV0aW9ucyBpblxuICogc3ludGFjdGljYWxseSBpbmNvcnJlY3QgdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlIdG1sUGFyc2VyIGV4dGVuZHMgSHRtbFBhcnNlciB7XG4gIHBhcnNlKCk6IFBhcnNlVHJlZVJlc3VsdCB7IHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFtdLCBbXSk7IH1cbn1cblxuLyoqXG4gKiBBdm9pZCBsb2FkaW5nIHJlc291cmNlcyBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmNpZSBieSB1c2luZyBhIGR1bW15IGxvYWRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15UmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoJycpOyB9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgZm9yIGEgVHlwZVNjcmlwdCBwcm9qZWN0LlxuICpcbiAqIFRoZSBgVHlwZVNjcmlwdFNlcnZpY2VIb3N0YCBpbXBsZW1lbnRzIHRoZSBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCB1c2luZ1xuICogdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZXMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFNlcnZpY2VIb3N0IGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3VtbWFyeVJlc29sdmVyOiBBb3RTdW1tYXJ5UmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVmbGVjdG9ySG9zdDogUmVmbGVjdG9ySG9zdDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXI7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xDYWNoZSA9IG5ldyBTdGF0aWNTeW1ib2xDYWNoZSgpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVUb0NvbXBvbmVudCA9IG5ldyBNYXA8c3RyaW5nLCBTdGF0aWNTeW1ib2w+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29sbGVjdGVkRXJyb3JzID0gbmV3IE1hcDxzdHJpbmcsIGFueVtdPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgcHJpdmF0ZSBsYXN0UHJvZ3JhbTogdHMuUHJvZ3JhbXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgdGVtcGxhdGVSZWZlcmVuY2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gICAgZmlsZXM6IFtdLFxuICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICBuZ01vZHVsZXM6IFtdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgdHNMc0hvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlKSB7XG4gICAgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIgPSBuZXcgQW90U3VtbWFyeVJlc29sdmVyKFxuICAgICAgICB7XG4gICAgICAgICAgbG9hZFN1bW1hcnkoZmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgICAgICBpc1NvdXJjZUZpbGUoc291cmNlRmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgICAgICB0b1N1bW1hcnlGaWxlTmFtZShzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBzb3VyY2VGaWxlUGF0aDsgfSxcbiAgICAgICAgICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd7cmV0dXJuIGZpbGVQYXRoO30sXG4gICAgICAgIH0sXG4gICAgICAgIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUpO1xuICAgIHRoaXMucmVmbGVjdG9ySG9zdCA9IG5ldyBSZWZsZWN0b3JIb3N0KCgpID0+IHRoaXMucHJvZ3JhbSwgdHNMc0hvc3QpO1xuICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIgPSBuZXcgU3RhdGljU3ltYm9sUmVzb2x2ZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdG9ySG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIsXG4gICAgICAgIChlLCBmaWxlUGF0aCkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZSwgZmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8vIFRoZSByZXNvbHZlciBpcyBpbnN0YW50aWF0ZWQgbGF6aWx5IGFuZCBzaG91bGQgbm90IGJlIGFjY2Vzc2VkIGRpcmVjdGx5LlxuICAvLyBJbnN0ZWFkLCBjYWxsIHRoZSByZXNvbHZlciBnZXR0ZXIuIFRoZSBpbnN0YW50aWF0aW9uIG9mIHRoZSByZXNvbHZlciBhbHNvXG4gIC8vIHJlcXVpcmVzIGluc3RhbnRpYXRpb24gb2YgdGhlIFN0YXRpY1JlZmxlY3RvciwgYW5kIHRoZSBsYXR0ZXIgcmVxdWlyZXNcbiAgLy8gcmVzb2x1dGlvbiBvZiBjb3JlIEFuZ3VsYXIgc3ltYm9scy4gTW9kdWxlIHJlc29sdXRpb24gc2hvdWxkIG5vdCBiZSBkb25lXG4gIC8vIGR1cmluZyBpbnN0YW50aWF0aW9uIHRvIGF2b2lkIGN5Y2xpYyBkZXBlbmRlbmN5IGJldHdlZW4gdGhlIHBsdWdpbiBhbmQgdGhlXG4gIC8vIGNvbnRhaW5pbmcgUHJvamVjdCwgc28gdGhlIFNpbmdsZXRvbiBwYXR0ZXJuIGlzIHVzZWQgaGVyZS5cbiAgcHJpdmF0ZSBfcmVzb2x2ZXI6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyfHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIE1ldGFkYXRhUmVzb2x2ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldCByZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7XG4gICAgaWYgKHRoaXMuX3Jlc29sdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXI7XG4gICAgfVxuICAgIC8vIFN0YXRpY1JlZmxlY3RvciBrZWVwcyBpdHMgb3duIHByaXZhdGUgY2FjaGVzIHRoYXQgYXJlIG5vdCBjbGVhcmFibGUuXG4gICAgLy8gV2UgaGF2ZSBubyBjaG9pY2UgYnV0IHRvIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZSB0byBpbnZhbGlkYXRlIHRoZSBjYWNoZXMuXG4gICAgLy8gVE9ETzogUmV2aXNpdCB0aGlzIHdoZW4gbGFuZ3VhZ2Ugc2VydmljZSBnZXRzIHJld3JpdHRlbiBmb3IgSXZ5LlxuICAgIGNvbnN0IHN0YXRpY1JlZmxlY3RvciA9IG5ldyBTdGF0aWNSZWZsZWN0b3IoXG4gICAgICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyLCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLFxuICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFDbGFzc2VzXG4gICAgICAgIFtdLCAgLy8ga25vd25NZXRhZGF0YUZ1bmN0aW9uc1xuICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoKSk7XG4gICAgLy8gQmVjYXVzZSBzdGF0aWMgcmVmbGVjdG9yIGFib3ZlIGlzIGNoYW5nZWQsIHdlIG5lZWQgdG8gY3JlYXRlIGEgbmV3XG4gICAgLy8gcmVzb2x2ZXIuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTmdNb2R1bGVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc29sdmVyID0gbmV3IERpcmVjdGl2ZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgcGlwZVJlc29sdmVyID0gbmV3IFBpcGVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbiAgICBjb25zdCByZXNvdXJjZUxvYWRlciA9IG5ldyBEdW1teVJlc291cmNlTG9hZGVyKCk7XG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyKCk7XG4gICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBEdW1teUh0bWxQYXJzZXIoKTtcbiAgICAvLyBUaGlzIHRyYWNrcyB0aGUgQ29tcGlsZUNvbmZpZyBpbiBjb2RlZ2VuLnRzLiBDdXJyZW50bHkgdGhlc2Ugb3B0aW9uc1xuICAgIC8vIGFyZSBoYXJkLWNvZGVkLlxuICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBDb21waWxlckNvbmZpZyh7XG4gICAgICBkZWZhdWx0RW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQsXG4gICAgICB1c2VKaXQ6IGZhbHNlLFxuICAgIH0pO1xuICAgIGNvbnN0IGRpcmVjdGl2ZU5vcm1hbGl6ZXIgPVxuICAgICAgICBuZXcgRGlyZWN0aXZlTm9ybWFsaXplcihyZXNvdXJjZUxvYWRlciwgdXJsUmVzb2x2ZXIsIGh0bWxQYXJzZXIsIGNvbmZpZyk7XG4gICAgdGhpcy5fcmVzb2x2ZXIgPSBuZXcgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIoXG4gICAgICAgIGNvbmZpZywgaHRtbFBhcnNlciwgbW9kdWxlUmVzb2x2ZXIsIGRpcmVjdGl2ZVJlc29sdmVyLCBwaXBlUmVzb2x2ZXIsXG4gICAgICAgIG5ldyBKaXRTdW1tYXJ5UmVzb2x2ZXIoKSwgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBkaXJlY3RpdmVOb3JtYWxpemVyLCBuZXcgQ29uc29sZSgpLFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlLCBzdGF0aWNSZWZsZWN0b3IsXG4gICAgICAgIChlcnJvciwgdHlwZSkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZXJyb3IsIHR5cGUgJiYgdHlwZS5maWxlUGF0aCkpO1xuICAgIHJldHVybiB0aGlzLl9yZXNvbHZlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgU3RhdGljUmVmbGVjdG9yIGhvc3RlZCBpbiB0aGVcbiAgICogTWV0YWRhdGFSZXNvbHZlci5cbiAgICovXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3RvcigpOiBTdGF0aWNSZWZsZWN0b3Ige1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLmdldFJlZmxlY3RvcigpIGFzIFN0YXRpY1JlZmxlY3RvcjtcbiAgfVxuXG4gIGdldFRlbXBsYXRlUmVmZXJlbmNlcygpOiBzdHJpbmdbXSB7XG4gICAgdGhpcy5nZXRBbmFseXplZE1vZHVsZXMoKTtcbiAgICByZXR1cm4gWy4uLnRoaXMudGVtcGxhdGVSZWZlcmVuY2VzXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCBhbmQgcmV0dXJucyBhbGwgYW5hbHl6ZWQgbW9kdWxlcy5cbiAgICogSWYgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgaW52YWxpZGF0ZSBhbGwgY2FjaGVzIGFuZCB1cGRhdGUgZmlsZVRvQ29tcG9uZW50XG4gICAqIGFuZCB0ZW1wbGF0ZVJlZmVyZW5jZXMuXG4gICAqIEluIGFkZGl0aW9uIHRvIHJldHVybmluZyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIHRoaXMgbWV0aG9kIHBsYXlzIHRoZVxuICAgKiBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnIGluIHRzc2VydmVyLlxuICAgKiBAcGFyYW0gZW5zdXJlU3luY2hyb25pemVkIHdoZXRoZXIgb3Igbm90IHRoZSBMYW5ndWFnZSBTZXJ2aWNlIHNob3VsZCBtYWtlIHN1cmUgYW5hbHl6ZWRNb2R1bGVzXG4gICAqICAgYXJlIHN5bmNlZCB0byB0aGUgbGFzdCB1cGRhdGUgb2YgdGhlIHByb2plY3QuIElmIGZhbHNlLCByZXR1cm5zIHRoZSBzZXQgb2YgYW5hbHl6ZWRNb2R1bGVzXG4gICAqICAgdGhhdCBpcyBhbHJlYWR5IGNhY2hlZC4gVGhpcyBpcyB1c2VmdWwgaWYgdGhlIHByb2plY3QgbXVzdCBub3QgYmUgcmVhbmFseXplZCwgZXZlbiBpZiBpdHNcbiAgICogICBmaWxlIHdhdGNoZXJzICh3aGljaCBhcmUgZGlzam9pbnQgZnJvbSB0aGUgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSBkZXRlY3QgYW4gdXBkYXRlLlxuICAgKi9cbiAgZ2V0QW5hbHl6ZWRNb2R1bGVzKGVuc3VyZVN5bmNocm9uaXplZCA9IHRydWUpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgaWYgKCFlbnN1cmVTeW5jaHJvbml6ZWQgfHwgdGhpcy51cFRvRGF0ZSgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gICAgfVxuXG4gICAgLy8gSW52YWxpZGF0ZSBjYWNoZXNcbiAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcyA9IFtdO1xuICAgIHRoaXMuZmlsZVRvQ29tcG9uZW50LmNsZWFyKCk7XG4gICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuY2xlYXIoKTtcbiAgICB0aGlzLnJlc29sdmVyLmNsZWFyQ2FjaGUoKTtcblxuICAgIGNvbnN0IGFuYWx5emVIb3N0ID0ge2lzU291cmNlRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9fTtcbiAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpO1xuICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID1cbiAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0ZW1wbGF0ZSByZWZlcmVuY2VzIGFuZCBmaWxlVG9Db21wb25lbnRcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlcykge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSAhO1xuICAgICAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQgJiYgbWV0YWRhdGEudGVtcGxhdGUgJiYgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB1cmxSZXNvbHZlci5yZXNvbHZlKFxuICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5zZXQodGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcy5wdXNoKHRlbXBsYXRlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQsIGFuZCBpbnZhbGlkYXRlIHN0YXRpYyBzeW1ib2xzIGluXG4gICAqIHRoZSBzb3VyY2UgZmlsZXMgdGhhdCBoYXZlIGNoYW5nZWQuXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBtb2R1bGVzIGFyZSB1cC10by1kYXRlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJ5IGdldEFuYWx5emVkTW9kdWxlcygpLlxuICAgKi9cbiAgcHJpdmF0ZSB1cFRvRGF0ZSgpOiBib29sZWFuIHtcbiAgICBjb25zdCB7bGFzdFByb2dyYW0sIHByb2dyYW19ID0gdGhpcztcbiAgICBpZiAobGFzdFByb2dyYW0gPT09IHByb2dyYW0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLmxhc3RQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIC8vIEV2ZW4gdGhvdWdoIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkLCBpdCBjb3VsZCBiZSB0aGUgY2FzZSB0aGF0IG5vbmUgb2ZcbiAgICAvLyB0aGUgc291cmNlIGZpbGVzIGhhdmUgY2hhbmdlZC4gSWYgYWxsIHNvdXJjZSBmaWxlcyByZW1haW4gdGhlIHNhbWUsIHRoZW5cbiAgICAvLyBwcm9ncmFtIGlzIHN0aWxsIHVwLXRvLWRhdGUsIGFuZCB3ZSBzaG91bGQgbm90IGludmFsaWRhdGUgY2FjaGVzLlxuICAgIGxldCBmaWxlc0FkZGVkID0gMDtcbiAgICBjb25zdCBmaWxlc0NoYW5nZWRPclJlbW92ZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgc291cmNlIGZpbGVzIGhhdmUgYmVlbiBhZGRlZCAvIGNoYW5nZWQgc2luY2UgbGFzdCBjb21wdXRhdGlvbi5cbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB7ZmlsZU5hbWV9IG9mIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgc2Vlbi5hZGQoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHRoaXMudHNMc0hvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICBjb25zdCBsYXN0VmVyc2lvbiA9IHRoaXMuZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAobGFzdFZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaWxlc0FkZGVkKys7XG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgICB9IGVsc2UgaWYgKHZlcnNpb24gIT09IGxhc3RWZXJzaW9uKSB7XG4gICAgICAgIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5wdXNoKGZpbGVOYW1lKTsgIC8vIGNoYW5nZWRcbiAgICAgICAgdGhpcy5maWxlVmVyc2lvbnMuc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgc291cmNlIGZpbGVzIGhhdmUgYmVlbiByZW1vdmVkIHNpbmNlIGxhc3QgY29tcHV0YXRpb24uXG4gICAgZm9yIChjb25zdCBbZmlsZU5hbWVdIG9mIHRoaXMuZmlsZVZlcnNpb25zKSB7XG4gICAgICBpZiAoIXNlZW4uaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICBmaWxlc0NoYW5nZWRPclJlbW92ZWQucHVzaChmaWxlTmFtZSk7ICAvLyByZW1vdmVkXG4gICAgICAgIC8vIEJlY2F1c2UgTWFwcyBhcmUgaXRlcmF0ZWQgaW4gaW5zZXJ0aW9uIG9yZGVyLCBpdCBpcyBzYWZlIHRvIGRlbGV0ZVxuICAgICAgICAvLyBlbnRyaWVzIGZyb20gdGhlIHNhbWUgbWFwIHdoaWxlIGl0ZXJhdGluZy5cbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1OTQwMjE2IGFuZFxuICAgICAgICAvLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzEwLjAvaW5kZXguaHRtbCNzZWMtbWFwLnByb3RvdHlwZS5mb3JlYWNoXG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlc0NoYW5nZWRPclJlbW92ZWQpIHtcbiAgICAgIGNvbnN0IHN5bWJvbHMgPSB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLmludmFsaWRhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIHRoaXMucmVmbGVjdG9yLmludmFsaWRhdGVTeW1ib2xzKHN5bWJvbHMpO1xuICAgIH1cblxuICAgIC8vIFByb2dyYW0gaXMgdXAtdG8tZGF0ZSBpZmYgbm8gZmlsZXMgYXJlIGFkZGVkLCBjaGFuZ2VkLCBvciByZW1vdmVkLlxuICAgIHJldHVybiBmaWxlc0FkZGVkID09PSAwICYmIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5sZW5ndGggPT09IDA7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGVtcGxhdGVzIGluIHRoZSBzcGVjaWZpZWQgYGZpbGVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqL1xuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUoY2hpbGQpO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG1ldGFkYXRhIGFib3V0IGFsbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gdGhlIGZpbGUgdGhhdCBhcmUgQW5ndWxhclxuICAgKiBkaXJlY3RpdmVzLiBQb3RlbnRpYWwgbWF0Y2hlcyBhcmUgYEBOZ01vZHVsZWAsIGBAQ29tcG9uZW50YCwgYEBEaXJlY3RpdmVgLFxuICAgKiBgQFBpcGVzYCwgZXRjLiBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBmaWxlXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbnMoZmlsZU5hbWU6IHN0cmluZyk6IERlY2xhcmF0aW9uW10ge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBEZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGdldERpcmVjdGl2ZUNsYXNzTGlrZShjaGlsZCk7XG4gICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtkZWNvcmF0b3JJZCwgY2xhc3NEZWNsfSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKGRlY29yYXRvcklkKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NEZWNsLm5hbWUgIS50ZXh0O1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChzb3VyY2VGaWxlLmZpbGVOYW1lLCBjbGFzc05hbWUpO1xuICAgICAgICAvLyBBc2sgdGhlIHJlc29sdmVyIHRvIGNoZWNrIGlmIGNhbmRpZGF0ZSBpcyBhY3R1YWxseSBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIuaXNEaXJlY3RpdmUoY2xhc3NTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICBtZXRhZGF0YTogZGF0YS5tZXRhZGF0YSxcbiAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuZm9yRWFjaENoaWxkKHZpc2l0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IHByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBUZW1wbGF0ZVNvdXJjZSBpZiBgbm9kZWAgaXMgYSB0ZW1wbGF0ZSBub2RlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogQENvbXBvbmVudCh7XG4gICAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PicgPC0tIHRlbXBsYXRlIG5vZGVcbiAgICogfSlcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHt9XG4gICAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIFBvdGVudGlhbCB0ZW1wbGF0ZSBub2RlXG4gICAqL1xuICBwcml2YXRlIGdldEludGVybmFsVGVtcGxhdGUobm9kZTogdHMuTm9kZSk6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKG5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRtcGxBc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKG5vZGUpO1xuICAgIGlmICghdG1wbEFzZ24gfHwgdG1wbEFzZ24ubmFtZS5nZXRUZXh0KCkgIT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2xhc3NEZWNsID0gZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AodG1wbEFzZ24pO1xuICAgIGlmICghY2xhc3NEZWNsIHx8ICFjbGFzc0RlY2wubmFtZSkgeyAgLy8gRG9lcyBub3QgaGFuZGxlIGFub255bW91cyBjbGFzc1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWxlTmFtZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKGZpbGVOYW1lLCBjbGFzc0RlY2wubmFtZS50ZXh0KTtcbiAgICByZXR1cm4gbmV3IElubGluZVRlbXBsYXRlKG5vZGUsIGNsYXNzRGVjbCwgY2xhc3NTeW1ib2wsIHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUgZm9yIGBmaWxlTmFtZWAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBIVE1MIGZpbGVcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICAvLyBGaXJzdCBnZXQgdGhlIHRleHQgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy50c0xzSG9zdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7XG4gICAgaWYgKCFzbmFwc2hvdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2UgPSBzbmFwc2hvdC5nZXRUZXh0KDAsIHNuYXBzaG90LmdldExlbmd0aCgpKTtcbiAgICAvLyBOZXh0IGZpbmQgdGhlIGNvbXBvbmVudCBjbGFzcyBzeW1ib2xcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZmlsZVRvQ29tcG9uZW50LmdldChmaWxlTmFtZSk7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGVuIHVzZSB0aGUgY2xhc3Mgc3ltYm9sIHRvIGZpbmQgdGhlIGFjdHVhbCB0cy5DbGFzc0RlY2xhcmF0aW9uIG5vZGVcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGNsYXNzU3ltYm9sLmZpbGVQYXRoKTtcbiAgICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVE9ETzogVGhpcyBvbmx5IGNvbnNpZGVycyB0b3AtbGV2ZWwgY2xhc3MgZGVjbGFyYXRpb25zIGluIGEgc291cmNlIGZpbGUuXG4gICAgLy8gVGhpcyB3b3VsZCBub3QgZmluZCBhIGNsYXNzIGRlY2xhcmF0aW9uIGluIGEgbmFtZXNwYWNlLCBmb3IgZXhhbXBsZS5cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBzb3VyY2VGaWxlLmZvckVhY2hDaGlsZCgoY2hpbGQpID0+IHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2hpbGQpICYmIGNoaWxkLm5hbWUgJiYgY2hpbGQubmFtZS50ZXh0ID09PSBjbGFzc1N5bWJvbC5uYW1lKSB7XG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWNsYXNzRGVjbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsVGVtcGxhdGUoc291cmNlLCBmaWxlTmFtZSwgY2xhc3NEZWNsLCBjbGFzc1N5bWJvbCwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFcnJvcihlcnJvcjogYW55LCBmaWxlUGF0aD86IHN0cmluZykge1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgbGV0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChmaWxlUGF0aCk7XG4gICAgICBpZiAoIWVycm9ycykge1xuICAgICAgICBlcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuc2V0KGZpbGVQYXRoLCBlcnJvcnMpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29sbGVjdGVkRXJyb3JzKGRlZmF1bHRTcGFuOiBTcGFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogRGVjbGFyYXRpb25FcnJvcltdIHtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLmNvbGxlY3RlZEVycm9ycy5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgaWYgKCFlcnJvcnMpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgLy8gVE9ETzogQWRkIGJldHRlciB0eXBpbmdzIGZvciB0aGUgZXJyb3JzXG4gICAgcmV0dXJuIGVycm9ycy5tYXAoKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgbGluZSA9IGUubGluZSB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmxpbmUpO1xuICAgICAgY29uc3QgY29sdW1uID0gZS5jb2x1bW4gfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5jb2x1bW4pO1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5BdChzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pIHx8IGRlZmF1bHRTcGFuO1xuICAgICAgaWYgKGlzRm9ybWF0dGVkRXJyb3IoZSkpIHtcbiAgICAgICAgcmV0dXJuIGVycm9yVG9EaWFnbm9zdGljV2l0aENoYWluKGUsIHNwYW4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHttZXNzYWdlOiBlLm1lc3NhZ2UsIHNwYW59O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgcGFyc2VkIHRlbXBsYXRlIGZvciB0aGUgdGVtcGxhdGUgYXQgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqIEBwYXJhbSBwb3NpdGlvbiBQb3NpdGlvbiBvZiB0aGUgdGVtcGxhdGUgaW4gdGhlIFRTIGZpbGUsIG90aGVyd2lzZSBpZ25vcmVkLlxuICAgKi9cbiAgZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBBc3RSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBGaW5kIHRoZSBub2RlIHRoYXQgbW9zdCBjbG9zZWx5IG1hdGNoZXMgdGhlIHBvc2l0aW9uXG4gICAgICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzb3VyY2VGaWxlLCBwb3NpdGlvbik7XG4gICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIFN0YXRpY1N5bWJvbCBmcm9tIGEgZmlsZSBhbmQgc3ltYm9sIG5hbWUuXG4gICAqIEByZXR1cm4gQW5ndWxhciBTdGF0aWNTeW1ib2wgbWF0Y2hpbmcgdGhlIGZpbGUgYW5kIG5hbWUsIGlmIGFueVxuICAgKi9cbiAgZ2V0U3RhdGljU3ltYm9sKGZpbGU6IHN0cmluZywgbmFtZTogc3RyaW5nKTogU3RhdGljU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChmaWxlLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBOZ01vZHVsZSB3aGljaCB0aGUgZGlyZWN0aXZlIGFzc29jaWF0ZWQgd2l0aCB0aGUgYGNsYXNzU3ltYm9sYFxuICAgKiBiZWxvbmdzIHRvLCB0aGVuIHJldHVybiBpdHMgc2NoZW1hIGFuZCB0cmFuc2l0aXZlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgQW5ndWxhciBTeW1ib2wgdGhhdCBkZWZpbmVzIGEgZGlyZWN0aXZlXG4gICAqL1xuICBwcml2YXRlIGdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sOiBTdGF0aWNTeW1ib2wpIHtcbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBbXSBhcyBDb21waWxlRGlyZWN0aXZlU3VtbWFyeVtdLFxuICAgICAgcGlwZXM6IFtdIGFzIENvbXBpbGVQaXBlU3VtbWFyeVtdLFxuICAgICAgc2NoZW1hczogW10gYXMgU2NoZW1hTWV0YWRhdGFbXSxcbiAgICB9O1xuICAgIC8vIEZpcnN0IGZpbmQgd2hpY2ggTmdNb2R1bGUgdGhlIGRpcmVjdGl2ZSBiZWxvbmdzIHRvLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5hbmFseXplZE1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5nZXQoY2xhc3NTeW1ib2wpIHx8XG4gICAgICAgIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUodGhpcy5hbmFseXplZE1vZHVsZXMpO1xuICAgIGlmICghbmdNb2R1bGUpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIC8vIFRoZW4gZ2F0aGVyIGFsbCB0cmFuc2l0aXZlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzLlxuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlc30gPSBuZ01vZHVsZS50cmFuc2l0aXZlTW9kdWxlO1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdC5kaXJlY3RpdmVzLnB1c2goZGF0YS5tZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcGlwZSBvZiBwaXBlcykge1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE9yTG9hZFBpcGVNZXRhZGF0YShwaXBlLnJlZmVyZW5jZSk7XG4gICAgICByZXN1bHQucGlwZXMucHVzaChtZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgfVxuICAgIHJlc3VsdC5zY2hlbWFzLnB1c2goLi4ubmdNb2R1bGUuc2NoZW1hcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSB0aGUgYHRlbXBsYXRlYCBhbmQgcmV0dXJuIGl0cyBBU1QsIGlmIGFueS5cbiAgICogQHBhcmFtIHRlbXBsYXRlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZFxuICAgKi9cbiAgZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGU6IFRlbXBsYXRlU291cmNlKTogQXN0UmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgY29uc3Qge3R5cGU6IGNsYXNzU3ltYm9sLCBmaWxlTmFtZX0gPSB0ZW1wbGF0ZTtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoY2xhc3NTeW1ib2wpO1xuICAgIGlmICghZGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IEkxOE5IdG1sUGFyc2VyKG5ldyBIdG1sUGFyc2VyKCkpO1xuICAgIGNvbnN0IGV4cHJlc3Npb25QYXJzZXIgPSBuZXcgUGFyc2VyKG5ldyBMZXhlcigpKTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgIG5ldyBDb21waWxlckNvbmZpZygpLCB0aGlzLnJlZmxlY3RvciwgZXhwcmVzc2lvblBhcnNlciwgbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgICBodG1sUGFyc2VyLFxuICAgICAgICBudWxsICEsICAvLyBjb25zb2xlXG4gICAgICAgIFtdICAgICAgIC8vIHRyYW5mb3Jtc1xuICAgICAgICApO1xuICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgZmlsZU5hbWUsIHtcbiAgICAgIHRva2VuaXplRXhwYW5zaW9uRm9ybXM6IHRydWUsXG4gICAgICBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiB0cnVlLCAgLy8gZG8gbm90IGNvbnZlcnQgQ1JMRiB0byBMRlxuICAgIH0pO1xuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hc30gPSB0aGlzLmdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgIGlmICghcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgZGlyZWN0aXZlOiBkYXRhLm1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcyxcbiAgICAgIHBhcnNlRXJyb3JzOiBwYXJzZVJlc3VsdC5lcnJvcnMsIGV4cHJlc3Npb25QYXJzZXIsIHRlbXBsYXRlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTG9nIHRoZSBzcGVjaWZpZWQgYG1zZ2AgdG8gZmlsZSBhdCBJTkZPIGxldmVsLiBJZiBsb2dnaW5nIGlzIG5vdCBlbmFibGVkXG4gICAqIHRoaXMgbWV0aG9kIGlzIGEgbm8tb3AuXG4gICAqIEBwYXJhbSBtc2cgTG9nIG1lc3NhZ2VcbiAgICovXG4gIGxvZyhtc2c6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRzTHNIb3N0LmxvZykge1xuICAgICAgdGhpcy50c0xzSG9zdC5sb2cobXNnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTG9nIHRoZSBzcGVjaWZpZWQgYG1zZ2AgdG8gZmlsZSBhdCBFUlJPUiBsZXZlbC4gSWYgbG9nZ2luZyBpcyBub3QgZW5hYmxlZFxuICAgKiB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIGVycm9yIG1lc3NhZ2VcbiAgICovXG4gIGVycm9yKG1zZzogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMudHNMc0hvc3QuZXJyb3IpIHtcbiAgICAgIHRoaXMudHNMc0hvc3QuZXJyb3IobXNnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTG9nIGRlYnVnZ2luZyBpbmZvIHRvIGZpbGUgYXQgSU5GTyBsZXZlbCwgb25seSBpZiB2ZXJib3NlIHNldHRpbmcgaXMgdHVybmVkXG4gICAqIG9uLiBPdGhlcndpc2UsIHRoaXMgbWV0aG9kIGlzIGEgbm8tb3AuXG4gICAqIEBwYXJhbSBtc2cgZGVidWdnaW5nIG1lc3NhZ2VcbiAgICovXG4gIGRlYnVnKG1zZzogc3RyaW5nKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMudHNMc0hvc3QgYXMgdHNzLnNlcnZlci5Qcm9qZWN0O1xuICAgIGlmICghcHJvamVjdC5wcm9qZWN0U2VydmljZSkge1xuICAgICAgLy8gdHNMc0hvc3QgaXMgbm90IGEgUHJvamVjdFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7bG9nZ2VyfSA9IHByb2plY3QucHJvamVjdFNlcnZpY2U7XG4gICAgaWYgKGxvZ2dlci5oYXNMZXZlbCh0c3Muc2VydmVyLkxvZ0xldmVsLnZlcmJvc2UpKSB7XG4gICAgICBsb2dnZXIuaW5mbyhtc2cpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKG1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgbGV0IHJlc3VsdDogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgcmVzdWx0U2l6ZSA9IDA7XG4gIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMubmdNb2R1bGVzKSB7XG4gICAgY29uc3QgbW9kdWxlU2l6ZSA9IG1vZHVsZS50cmFuc2l0aXZlTW9kdWxlLmRpcmVjdGl2ZXMubGVuZ3RoO1xuICAgIGlmIChtb2R1bGVTaXplID4gcmVzdWx0U2l6ZSkge1xuICAgICAgcmVzdWx0ID0gbW9kdWxlO1xuICAgICAgcmVzdWx0U2l6ZSA9IG1vZHVsZVNpemU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihub2RlOiB0cy5Ob2RlKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbn1cblxuZnVuY3Rpb24gc3BhbkF0KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmIChsaW5lICE9IG51bGwgJiYgY29sdW1uICE9IG51bGwpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRzLmdldFBvc2l0aW9uT2ZMaW5lQW5kQ2hhcmFjdGVyKHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbik7XG4gICAgY29uc3QgZmluZENoaWxkID0gZnVuY3Rpb24gZmluZENoaWxkKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICAgIGlmIChub2RlLmtpbmQgPiB0cy5TeW50YXhLaW5kLkxhc3RUb2tlbiAmJiBub2RlLnBvcyA8PSBwb3NpdGlvbiAmJiBub2RlLmVuZCA+IHBvc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IGJldHRlck5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBmaW5kQ2hpbGQpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICByZXR1cm4ge3N0YXJ0OiBub2RlLmdldFN0YXJ0KCksIGVuZDogbm9kZS5nZXRFbmQoKX07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRDaGFpbihjaGFpbjogRm9ybWF0dGVkTWVzc2FnZUNoYWluKTogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7bWVzc2FnZTogY2hhaW4ubWVzc2FnZSwgbmV4dDogY2hhaW4ubmV4dCA/IGNoYWluLm5leHQubWFwKGNvbnZlcnRDaGFpbikgOiB1bmRlZmluZWR9O1xufVxuXG5mdW5jdGlvbiBlcnJvclRvRGlhZ25vc3RpY1dpdGhDaGFpbihlcnJvcjogRm9ybWF0dGVkRXJyb3IsIHNwYW46IFNwYW4pOiBEZWNsYXJhdGlvbkVycm9yIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBlcnJvci5jaGFpbiA/IGNvbnZlcnRDaGFpbihlcnJvci5jaGFpbikgOiBlcnJvci5tZXNzYWdlLCBzcGFufTtcbn1cbiJdfQ==