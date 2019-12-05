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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2akI7SUFDN2pCLHNDQUFxRjtJQUNyRiwrQkFBaUM7SUFDakMsb0RBQXNEO0lBR3RELG1GQUF5RDtJQUN6RCwrRUFBK0M7SUFDL0MsbUVBQTJIO0lBRTNILDZEQUFnRTtJQUdoRTs7T0FFRztJQUNILFNBQWdCLG1DQUFtQyxDQUMvQyxJQUE0QixFQUFFLE9BQTJCO1FBQzNELElBQU0sTUFBTSxHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELElBQU0sUUFBUSxHQUFHLHdDQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFMRCxrRkFLQztJQUVEOzs7OztPQUtHO0lBQ0g7UUFBcUMsMkNBQVU7UUFBL0M7O1FBRUEsQ0FBQztRQURDLCtCQUFLLEdBQUwsY0FBMkIsT0FBTyxJQUFJLDBCQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxzQkFBQztJQUFELENBQUMsQUFGRCxDQUFxQyxxQkFBVSxHQUU5QztJQUZZLDBDQUFlO0lBSTVCOztPQUVHO0lBQ0g7UUFBeUMsK0NBQWM7UUFBdkQ7O1FBRUEsQ0FBQztRQURDLGlDQUFHLEdBQUgsVUFBSSxHQUFXLElBQXFCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsMEJBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBeUMseUJBQWMsR0FFdEQ7SUFGWSxrREFBbUI7SUFJaEM7Ozs7Ozs7T0FPRztJQUNIO1FBaUJFLCtCQUNh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LEVBQUUsRUFBQyxDQUFDO2FBQ3JEO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsS0FBNEI7UUFDaEQsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsS0FBcUIsRUFBRSxJQUFVO1FBQ25FLE9BQU8sRUFBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDO0lBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QW90U3VtbWFyeVJlc29sdmVyLCBDb21waWxlRGlyZWN0aXZlU3VtbWFyeSwgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIsIENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhLCBDb21waWxlUGlwZVN1bW1hcnksIENvbXBpbGVyQ29uZmlnLCBEaXJlY3RpdmVOb3JtYWxpemVyLCBEaXJlY3RpdmVSZXNvbHZlciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBGb3JtYXR0ZWRFcnJvciwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBIdG1sUGFyc2VyLCBJMThOSHRtbFBhcnNlciwgSml0U3VtbWFyeVJlc29sdmVyLCBMZXhlciwgTmdBbmFseXplZE1vZHVsZXMsIE5nTW9kdWxlUmVzb2x2ZXIsIFBhcnNlVHJlZVJlc3VsdCwgUGFyc2VyLCBQaXBlUmVzb2x2ZXIsIFJlc291cmNlTG9hZGVyLCBTdGF0aWNSZWZsZWN0b3IsIFN0YXRpY1N5bWJvbCwgU3RhdGljU3ltYm9sQ2FjaGUsIFN0YXRpY1N5bWJvbFJlc29sdmVyLCBUZW1wbGF0ZVBhcnNlciwgYW5hbHl6ZU5nTW9kdWxlcywgY3JlYXRlT2ZmbGluZUNvbXBpbGVVcmxSZXNvbHZlciwgaXNGb3JtYXR0ZWRFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtTY2hlbWFNZXRhZGF0YSwgVmlld0VuY2Fwc3VsYXRpb24sIMm1Q29uc29sZSBhcyBDb25zb2xlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7UmVmbGVjdG9ySG9zdH0gZnJvbSAnLi9yZWZsZWN0b3JfaG9zdCc7XG5pbXBvcnQge0V4dGVybmFsVGVtcGxhdGUsIElubGluZVRlbXBsYXRlLCBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRXJyb3IsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIExhbmd1YWdlU2VydmljZSwgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgU3BhbiwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXREaXJlY3RpdmVDbGFzc0xpa2V9IGZyb20gJy4vdXRpbHMnO1xuXG5cbi8qKlxuICogQ3JlYXRlIGEgYExhbmd1YWdlU2VydmljZUhvc3RgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYW5ndWFnZVNlcnZpY2VGcm9tVHlwZXNjcmlwdChcbiAgICBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBzZXJ2aWNlOiB0cy5MYW5ndWFnZVNlcnZpY2UpOiBMYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCBuZ0hvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KGhvc3QsIHNlcnZpY2UpO1xuICBjb25zdCBuZ1NlcnZlciA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShuZ0hvc3QpO1xuICByZXR1cm4gbmdTZXJ2ZXI7XG59XG5cbi8qKlxuICogVGhlIGxhbmd1YWdlIHNlcnZpY2UgbmV2ZXIgbmVlZHMgdGhlIG5vcm1hbGl6ZWQgdmVyc2lvbnMgb2YgdGhlIG1ldGFkYXRhLiBUbyBhdm9pZCBwYXJzaW5nXG4gKiB0aGUgY29udGVudCBhbmQgcmVzb2x2aW5nIHJlZmVyZW5jZXMsIHJldHVybiBhbiBlbXB0eSBmaWxlLiBUaGlzIGFsc28gYWxsb3dzIG5vcm1hbGl6aW5nXG4gKiB0ZW1wbGF0ZSB0aGF0IGFyZSBzeW50YXRpY2FsbHkgaW5jb3JyZWN0IHdoaWNoIGlzIHJlcXVpcmVkIHRvIHByb3ZpZGUgY29tcGxldGlvbnMgaW5cbiAqIHN5bnRhY3RpY2FsbHkgaW5jb3JyZWN0IHRlbXBsYXRlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15SHRtbFBhcnNlciBleHRlbmRzIEh0bWxQYXJzZXIge1xuICBwYXJzZSgpOiBQYXJzZVRyZWVSZXN1bHQgeyByZXR1cm4gbmV3IFBhcnNlVHJlZVJlc3VsdChbXSwgW10pOyB9XG59XG5cbi8qKlxuICogQXZvaWQgbG9hZGluZyByZXNvdXJjZXMgaW4gdGhlIGxhbmd1YWdlIHNlcnZjaWUgYnkgdXNpbmcgYSBkdW1teSBsb2FkZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdW1teVJlc291cmNlTG9hZGVyIGV4dGVuZHMgUmVzb3VyY2VMb2FkZXIge1xuICBnZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4geyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCcnKTsgfVxufVxuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIGEgYExhbmd1YWdlU2VydmljZUhvc3RgIGZvciBhIFR5cGVTY3JpcHQgcHJvamVjdC5cbiAqXG4gKiBUaGUgYFR5cGVTY3JpcHRTZXJ2aWNlSG9zdGAgaW1wbGVtZW50cyB0aGUgQW5ndWxhciBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgdXNpbmdcbiAqIHRoZSBUeXBlU2NyaXB0IGxhbmd1YWdlIHNlcnZpY2VzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCBpbXBsZW1lbnRzIExhbmd1YWdlU2VydmljZUhvc3Qge1xuICBwcml2YXRlIHJlYWRvbmx5IHN1bW1hcnlSZXNvbHZlcjogQW90U3VtbWFyeVJlc29sdmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlZmxlY3Rvckhvc3Q6IFJlZmxlY3Rvckhvc3Q7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGljU3ltYm9sUmVzb2x2ZXI6IFN0YXRpY1N5bWJvbFJlc29sdmVyO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGljU3ltYm9sQ2FjaGUgPSBuZXcgU3RhdGljU3ltYm9sQ2FjaGUoKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVG9Db21wb25lbnQgPSBuZXcgTWFwPHN0cmluZywgU3RhdGljU3ltYm9sPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbGxlY3RlZEVycm9ycyA9IG5ldyBNYXA8c3RyaW5nLCBhbnlbXT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVmVyc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIHByaXZhdGUgbGFzdFByb2dyYW06IHRzLlByb2dyYW18dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gICAgZmlsZXM6IFtdLFxuICAgIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgICBuZ01vZHVsZXM6IFtdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgdHNMc0hvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlKSB7XG4gICAgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIgPSBuZXcgQW90U3VtbWFyeVJlc29sdmVyKFxuICAgICAgICB7XG4gICAgICAgICAgbG9hZFN1bW1hcnkoZmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgICAgICBpc1NvdXJjZUZpbGUoc291cmNlRmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgICAgICB0b1N1bW1hcnlGaWxlTmFtZShzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBzb3VyY2VGaWxlUGF0aDsgfSxcbiAgICAgICAgICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd7cmV0dXJuIGZpbGVQYXRoO30sXG4gICAgICAgIH0sXG4gICAgICAgIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUpO1xuICAgIHRoaXMucmVmbGVjdG9ySG9zdCA9IG5ldyBSZWZsZWN0b3JIb3N0KCgpID0+IHRoaXMucHJvZ3JhbSwgdHNMc0hvc3QpO1xuICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIgPSBuZXcgU3RhdGljU3ltYm9sUmVzb2x2ZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdG9ySG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIsXG4gICAgICAgIChlLCBmaWxlUGF0aCkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZSwgZmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8vIFRoZSByZXNvbHZlciBpcyBpbnN0YW50aWF0ZWQgbGF6aWx5IGFuZCBzaG91bGQgbm90IGJlIGFjY2Vzc2VkIGRpcmVjdGx5LlxuICAvLyBJbnN0ZWFkLCBjYWxsIHRoZSByZXNvbHZlciBnZXR0ZXIuIFRoZSBpbnN0YW50aWF0aW9uIG9mIHRoZSByZXNvbHZlciBhbHNvXG4gIC8vIHJlcXVpcmVzIGluc3RhbnRpYXRpb24gb2YgdGhlIFN0YXRpY1JlZmxlY3RvciwgYW5kIHRoZSBsYXR0ZXIgcmVxdWlyZXNcbiAgLy8gcmVzb2x1dGlvbiBvZiBjb3JlIEFuZ3VsYXIgc3ltYm9scy4gTW9kdWxlIHJlc29sdXRpb24gc2hvdWxkIG5vdCBiZSBkb25lXG4gIC8vIGR1cmluZyBpbnN0YW50aWF0aW9uIHRvIGF2b2lkIGN5Y2xpYyBkZXBlbmRlbmN5IGJldHdlZW4gdGhlIHBsdWdpbiBhbmQgdGhlXG4gIC8vIGNvbnRhaW5pbmcgUHJvamVjdCwgc28gdGhlIFNpbmdsZXRvbiBwYXR0ZXJuIGlzIHVzZWQgaGVyZS5cbiAgcHJpdmF0ZSBfcmVzb2x2ZXI6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyfHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBzaW5nbGV0b24gaW5zdGFuY2Ugb2YgdGhlIE1ldGFkYXRhUmVzb2x2ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldCByZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7XG4gICAgaWYgKHRoaXMuX3Jlc29sdmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVzb2x2ZXI7XG4gICAgfVxuICAgIC8vIFN0YXRpY1JlZmxlY3RvciBrZWVwcyBpdHMgb3duIHByaXZhdGUgY2FjaGVzIHRoYXQgYXJlIG5vdCBjbGVhcmFibGUuXG4gICAgLy8gV2UgaGF2ZSBubyBjaG9pY2UgYnV0IHRvIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZSB0byBpbnZhbGlkYXRlIHRoZSBjYWNoZXMuXG4gICAgLy8gVE9ETzogUmV2aXNpdCB0aGlzIHdoZW4gbGFuZ3VhZ2Ugc2VydmljZSBnZXRzIHJld3JpdHRlbiBmb3IgSXZ5LlxuICAgIGNvbnN0IHN0YXRpY1JlZmxlY3RvciA9IG5ldyBTdGF0aWNSZWZsZWN0b3IoXG4gICAgICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyLCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLFxuICAgICAgICBbXSwgIC8vIGtub3duTWV0YWRhdGFDbGFzc2VzXG4gICAgICAgIFtdLCAgLy8ga25vd25NZXRhZGF0YUZ1bmN0aW9uc1xuICAgICAgICAoZSwgZmlsZVBhdGgpID0+IHRoaXMuY29sbGVjdEVycm9yKGUsIGZpbGVQYXRoKSk7XG4gICAgLy8gQmVjYXVzZSBzdGF0aWMgcmVmbGVjdG9yIGFib3ZlIGlzIGNoYW5nZWQsIHdlIG5lZWQgdG8gY3JlYXRlIGEgbmV3XG4gICAgLy8gcmVzb2x2ZXIuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTmdNb2R1bGVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc29sdmVyID0gbmV3IERpcmVjdGl2ZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgcGlwZVJlc29sdmVyID0gbmV3IFBpcGVSZXNvbHZlcihzdGF0aWNSZWZsZWN0b3IpO1xuICAgIGNvbnN0IGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbiAgICBjb25zdCByZXNvdXJjZUxvYWRlciA9IG5ldyBEdW1teVJlc291cmNlTG9hZGVyKCk7XG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyKCk7XG4gICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBEdW1teUh0bWxQYXJzZXIoKTtcbiAgICAvLyBUaGlzIHRyYWNrcyB0aGUgQ29tcGlsZUNvbmZpZyBpbiBjb2RlZ2VuLnRzLiBDdXJyZW50bHkgdGhlc2Ugb3B0aW9uc1xuICAgIC8vIGFyZSBoYXJkLWNvZGVkLlxuICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBDb21waWxlckNvbmZpZyh7XG4gICAgICBkZWZhdWx0RW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQsXG4gICAgICB1c2VKaXQ6IGZhbHNlLFxuICAgIH0pO1xuICAgIGNvbnN0IGRpcmVjdGl2ZU5vcm1hbGl6ZXIgPVxuICAgICAgICBuZXcgRGlyZWN0aXZlTm9ybWFsaXplcihyZXNvdXJjZUxvYWRlciwgdXJsUmVzb2x2ZXIsIGh0bWxQYXJzZXIsIGNvbmZpZyk7XG4gICAgdGhpcy5fcmVzb2x2ZXIgPSBuZXcgQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXIoXG4gICAgICAgIGNvbmZpZywgaHRtbFBhcnNlciwgbW9kdWxlUmVzb2x2ZXIsIGRpcmVjdGl2ZVJlc29sdmVyLCBwaXBlUmVzb2x2ZXIsXG4gICAgICAgIG5ldyBKaXRTdW1tYXJ5UmVzb2x2ZXIoKSwgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBkaXJlY3RpdmVOb3JtYWxpemVyLCBuZXcgQ29uc29sZSgpLFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlLCBzdGF0aWNSZWZsZWN0b3IsXG4gICAgICAgIChlcnJvciwgdHlwZSkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZXJyb3IsIHR5cGUgJiYgdHlwZS5maWxlUGF0aCkpO1xuICAgIHJldHVybiB0aGlzLl9yZXNvbHZlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgU3RhdGljUmVmbGVjdG9yIGhvc3RlZCBpbiB0aGVcbiAgICogTWV0YWRhdGFSZXNvbHZlci5cbiAgICovXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3RvcigpOiBTdGF0aWNSZWZsZWN0b3Ige1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLmdldFJlZmxlY3RvcigpIGFzIFN0YXRpY1JlZmxlY3RvcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCBhbmQgcmV0dXJucyBhbGwgYW5hbHl6ZWQgbW9kdWxlcy5cbiAgICogSWYgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgaW52YWxpZGF0ZSBhbGwgY2FjaGVzIGFuZCB1cGRhdGUgZmlsZVRvQ29tcG9uZW50XG4gICAqIGFuZCB0ZW1wbGF0ZVJlZmVyZW5jZXMuXG4gICAqIEluIGFkZGl0aW9uIHRvIHJldHVybmluZyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIHRoaXMgbWV0aG9kIHBsYXlzIHRoZVxuICAgKiBzYW1lIHJvbGUgYXMgJ3N5bmNocm9uaXplSG9zdERhdGEnIGluIHRzc2VydmVyLlxuICAgKiBAcGFyYW0gZW5zdXJlU3luY2hyb25pemVkIHdoZXRoZXIgb3Igbm90IHRoZSBMYW5ndWFnZSBTZXJ2aWNlIHNob3VsZCBtYWtlIHN1cmUgYW5hbHl6ZWRNb2R1bGVzXG4gICAqICAgYXJlIHN5bmNlZCB0byB0aGUgbGFzdCB1cGRhdGUgb2YgdGhlIHByb2plY3QuIElmIGZhbHNlLCByZXR1cm5zIHRoZSBzZXQgb2YgYW5hbHl6ZWRNb2R1bGVzXG4gICAqICAgdGhhdCBpcyBhbHJlYWR5IGNhY2hlZC4gVGhpcyBpcyB1c2VmdWwgaWYgdGhlIHByb2plY3QgbXVzdCBub3QgYmUgcmVhbmFseXplZCwgZXZlbiBpZiBpdHNcbiAgICogICBmaWxlIHdhdGNoZXJzICh3aGljaCBhcmUgZGlzam9pbnQgZnJvbSB0aGUgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KSBkZXRlY3QgYW4gdXBkYXRlLlxuICAgKi9cbiAgZ2V0QW5hbHl6ZWRNb2R1bGVzKGVuc3VyZVN5bmNocm9uaXplZCA9IHRydWUpOiBOZ0FuYWx5emVkTW9kdWxlcyB7XG4gICAgaWYgKCFlbnN1cmVTeW5jaHJvbml6ZWQgfHwgdGhpcy51cFRvRGF0ZSgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gICAgfVxuXG4gICAgLy8gSW52YWxpZGF0ZSBjYWNoZXNcbiAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5jbGVhcigpO1xuICAgIHRoaXMuY29sbGVjdGVkRXJyb3JzLmNsZWFyKCk7XG4gICAgdGhpcy5yZXNvbHZlci5jbGVhckNhY2hlKCk7XG5cbiAgICBjb25zdCBhbmFseXplSG9zdCA9IHtpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gdHJ1ZTsgfX07XG4gICAgY29uc3QgcHJvZ3JhbUZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNmID0+IHNmLmZpbGVOYW1lKTtcbiAgICB0aGlzLmFuYWx5emVkTW9kdWxlcyA9XG4gICAgICAgIGFuYWx5emVOZ01vZHVsZXMocHJvZ3JhbUZpbGVzLCBhbmFseXplSG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlciwgdGhpcy5yZXNvbHZlcik7XG5cbiAgICAvLyB1cGRhdGUgdGVtcGxhdGUgcmVmZXJlbmNlcyBhbmQgZmlsZVRvQ29tcG9uZW50XG4gICAgY29uc3QgdXJsUmVzb2x2ZXIgPSBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyKCk7XG4gICAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiB0aGlzLmFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7bWV0YWRhdGF9ID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlLnJlZmVyZW5jZSkgITtcbiAgICAgICAgaWYgKG1ldGFkYXRhLmlzQ29tcG9uZW50ICYmIG1ldGFkYXRhLnRlbXBsYXRlICYmIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKSB7XG4gICAgICAgICAgY29uc3QgdGVtcGxhdGVOYW1lID0gdXJsUmVzb2x2ZXIucmVzb2x2ZShcbiAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0b3IuY29tcG9uZW50TW9kdWxlVXJsKGRpcmVjdGl2ZS5yZWZlcmVuY2UpLFxuICAgICAgICAgICAgICBtZXRhZGF0YS50ZW1wbGF0ZS50ZW1wbGF0ZVVybCk7XG4gICAgICAgICAgdGhpcy5maWxlVG9Db21wb25lbnQuc2V0KHRlbXBsYXRlTmFtZSwgZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQsIGFuZCBpbnZhbGlkYXRlIHN0YXRpYyBzeW1ib2xzIGluXG4gICAqIHRoZSBzb3VyY2UgZmlsZXMgdGhhdCBoYXZlIGNoYW5nZWQuXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBtb2R1bGVzIGFyZSB1cC10by1kYXRlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJ5IGdldEFuYWx5emVkTW9kdWxlcygpLlxuICAgKi9cbiAgcHJpdmF0ZSB1cFRvRGF0ZSgpOiBib29sZWFuIHtcbiAgICBjb25zdCB7bGFzdFByb2dyYW0sIHByb2dyYW19ID0gdGhpcztcbiAgICBpZiAobGFzdFByb2dyYW0gPT09IHByb2dyYW0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLmxhc3RQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIC8vIEV2ZW4gdGhvdWdoIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkLCBpdCBjb3VsZCBiZSB0aGUgY2FzZSB0aGF0IG5vbmUgb2ZcbiAgICAvLyB0aGUgc291cmNlIGZpbGVzIGhhdmUgY2hhbmdlZC4gSWYgYWxsIHNvdXJjZSBmaWxlcyByZW1haW4gdGhlIHNhbWUsIHRoZW5cbiAgICAvLyBwcm9ncmFtIGlzIHN0aWxsIHVwLXRvLWRhdGUsIGFuZCB3ZSBzaG91bGQgbm90IGludmFsaWRhdGUgY2FjaGVzLlxuICAgIGxldCBmaWxlc0FkZGVkID0gMDtcbiAgICBjb25zdCBmaWxlc0NoYW5nZWRPclJlbW92ZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgc291cmNlIGZpbGVzIGhhdmUgYmVlbiBhZGRlZCAvIGNoYW5nZWQgc2luY2UgbGFzdCBjb21wdXRhdGlvbi5cbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB7ZmlsZU5hbWV9IG9mIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgc2Vlbi5hZGQoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHRoaXMudHNMc0hvc3QuZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZSk7XG4gICAgICBjb25zdCBsYXN0VmVyc2lvbiA9IHRoaXMuZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAobGFzdFZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaWxlc0FkZGVkKys7XG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgICB9IGVsc2UgaWYgKHZlcnNpb24gIT09IGxhc3RWZXJzaW9uKSB7XG4gICAgICAgIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5wdXNoKGZpbGVOYW1lKTsgIC8vIGNoYW5nZWRcbiAgICAgICAgdGhpcy5maWxlVmVyc2lvbnMuc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgc291cmNlIGZpbGVzIGhhdmUgYmVlbiByZW1vdmVkIHNpbmNlIGxhc3QgY29tcHV0YXRpb24uXG4gICAgZm9yIChjb25zdCBbZmlsZU5hbWVdIG9mIHRoaXMuZmlsZVZlcnNpb25zKSB7XG4gICAgICBpZiAoIXNlZW4uaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICBmaWxlc0NoYW5nZWRPclJlbW92ZWQucHVzaChmaWxlTmFtZSk7ICAvLyByZW1vdmVkXG4gICAgICAgIC8vIEJlY2F1c2UgTWFwcyBhcmUgaXRlcmF0ZWQgaW4gaW5zZXJ0aW9uIG9yZGVyLCBpdCBpcyBzYWZlIHRvIGRlbGV0ZVxuICAgICAgICAvLyBlbnRyaWVzIGZyb20gdGhlIHNhbWUgbWFwIHdoaWxlIGl0ZXJhdGluZy5cbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1OTQwMjE2IGFuZFxuICAgICAgICAvLyBodHRwczovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzEwLjAvaW5kZXguaHRtbCNzZWMtbWFwLnByb3RvdHlwZS5mb3JlYWNoXG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlc0NoYW5nZWRPclJlbW92ZWQpIHtcbiAgICAgIGNvbnN0IHN5bWJvbHMgPSB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLmludmFsaWRhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIHRoaXMucmVmbGVjdG9yLmludmFsaWRhdGVTeW1ib2xzKHN5bWJvbHMpO1xuICAgIH1cblxuICAgIC8vIFByb2dyYW0gaXMgdXAtdG8tZGF0ZSBpZmYgbm8gZmlsZXMgYXJlIGFkZGVkLCBjaGFuZ2VkLCBvciByZW1vdmVkLlxuICAgIHJldHVybiBmaWxlc0FkZGVkID09PSAwICYmIGZpbGVzQ2hhbmdlZE9yUmVtb3ZlZC5sZW5ndGggPT09IDA7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGVtcGxhdGVzIGluIHRoZSBzcGVjaWZpZWQgYGZpbGVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqL1xuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUoY2hpbGQpO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG1ldGFkYXRhIGFib3V0IGFsbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gdGhlIGZpbGUgdGhhdCBhcmUgQW5ndWxhclxuICAgKiBkaXJlY3RpdmVzLiBQb3RlbnRpYWwgbWF0Y2hlcyBhcmUgYEBOZ01vZHVsZWAsIGBAQ29tcG9uZW50YCwgYEBEaXJlY3RpdmVgLFxuICAgKiBgQFBpcGVzYCwgZXRjLiBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBmaWxlXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbnMoZmlsZU5hbWU6IHN0cmluZyk6IERlY2xhcmF0aW9uW10ge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBEZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGdldERpcmVjdGl2ZUNsYXNzTGlrZShjaGlsZCk7XG4gICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtkZWNvcmF0b3JJZCwgY2xhc3NEZWNsfSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKGRlY29yYXRvcklkKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NEZWNsLm5hbWUgIS50ZXh0O1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChzb3VyY2VGaWxlLmZpbGVOYW1lLCBjbGFzc05hbWUpO1xuICAgICAgICAvLyBBc2sgdGhlIHJlc29sdmVyIHRvIGNoZWNrIGlmIGNhbmRpZGF0ZSBpcyBhY3R1YWxseSBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIuaXNEaXJlY3RpdmUoY2xhc3NTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICBtZXRhZGF0YTogZGF0YS5tZXRhZGF0YSxcbiAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuZm9yRWFjaENoaWxkKHZpc2l0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IHByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBUZW1wbGF0ZVNvdXJjZSBpZiBgbm9kZWAgaXMgYSB0ZW1wbGF0ZSBub2RlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogQENvbXBvbmVudCh7XG4gICAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PicgPC0tIHRlbXBsYXRlIG5vZGVcbiAgICogfSlcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHt9XG4gICAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIFBvdGVudGlhbCB0ZW1wbGF0ZSBub2RlXG4gICAqL1xuICBwcml2YXRlIGdldEludGVybmFsVGVtcGxhdGUobm9kZTogdHMuTm9kZSk6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKG5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRtcGxBc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKG5vZGUpO1xuICAgIGlmICghdG1wbEFzZ24gfHwgdG1wbEFzZ24ubmFtZS5nZXRUZXh0KCkgIT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2xhc3NEZWNsID0gZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AodG1wbEFzZ24pO1xuICAgIGlmICghY2xhc3NEZWNsIHx8ICFjbGFzc0RlY2wubmFtZSkgeyAgLy8gRG9lcyBub3QgaGFuZGxlIGFub255bW91cyBjbGFzc1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWxlTmFtZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKGZpbGVOYW1lLCBjbGFzc0RlY2wubmFtZS50ZXh0KTtcbiAgICByZXR1cm4gbmV3IElubGluZVRlbXBsYXRlKG5vZGUsIGNsYXNzRGVjbCwgY2xhc3NTeW1ib2wsIHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUgZm9yIGBmaWxlTmFtZWAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBIVE1MIGZpbGVcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICAvLyBGaXJzdCBnZXQgdGhlIHRleHQgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy50c0xzSG9zdC5nZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZSk7XG4gICAgaWYgKCFzbmFwc2hvdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2UgPSBzbmFwc2hvdC5nZXRUZXh0KDAsIHNuYXBzaG90LmdldExlbmd0aCgpKTtcbiAgICAvLyBOZXh0IGZpbmQgdGhlIGNvbXBvbmVudCBjbGFzcyBzeW1ib2xcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZmlsZVRvQ29tcG9uZW50LmdldChmaWxlTmFtZSk7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGVuIHVzZSB0aGUgY2xhc3Mgc3ltYm9sIHRvIGZpbmQgdGhlIGFjdHVhbCB0cy5DbGFzc0RlY2xhcmF0aW9uIG5vZGVcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGNsYXNzU3ltYm9sLmZpbGVQYXRoKTtcbiAgICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVE9ETzogVGhpcyBvbmx5IGNvbnNpZGVycyB0b3AtbGV2ZWwgY2xhc3MgZGVjbGFyYXRpb25zIGluIGEgc291cmNlIGZpbGUuXG4gICAgLy8gVGhpcyB3b3VsZCBub3QgZmluZCBhIGNsYXNzIGRlY2xhcmF0aW9uIGluIGEgbmFtZXNwYWNlLCBmb3IgZXhhbXBsZS5cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBzb3VyY2VGaWxlLmZvckVhY2hDaGlsZCgoY2hpbGQpID0+IHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2hpbGQpICYmIGNoaWxkLm5hbWUgJiYgY2hpbGQubmFtZS50ZXh0ID09PSBjbGFzc1N5bWJvbC5uYW1lKSB7XG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWNsYXNzRGVjbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsVGVtcGxhdGUoc291cmNlLCBmaWxlTmFtZSwgY2xhc3NEZWNsLCBjbGFzc1N5bWJvbCwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIGNvbGxlY3RFcnJvcihlcnJvcjogYW55LCBmaWxlUGF0aD86IHN0cmluZykge1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgbGV0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChmaWxlUGF0aCk7XG4gICAgICBpZiAoIWVycm9ycykge1xuICAgICAgICBlcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5jb2xsZWN0ZWRFcnJvcnMuc2V0KGZpbGVQYXRoLCBlcnJvcnMpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29sbGVjdGVkRXJyb3JzKGRlZmF1bHRTcGFuOiBTcGFuLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogRGVjbGFyYXRpb25FcnJvcltdIHtcbiAgICBjb25zdCBlcnJvcnMgPSB0aGlzLmNvbGxlY3RlZEVycm9ycy5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgaWYgKCFlcnJvcnMpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgLy8gVE9ETzogQWRkIGJldHRlciB0eXBpbmdzIGZvciB0aGUgZXJyb3JzXG4gICAgcmV0dXJuIGVycm9ycy5tYXAoKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgbGluZSA9IGUubGluZSB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmxpbmUpO1xuICAgICAgY29uc3QgY29sdW1uID0gZS5jb2x1bW4gfHwgKGUucG9zaXRpb24gJiYgZS5wb3NpdGlvbi5jb2x1bW4pO1xuICAgICAgY29uc3Qgc3BhbiA9IHNwYW5BdChzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pIHx8IGRlZmF1bHRTcGFuO1xuICAgICAgaWYgKGlzRm9ybWF0dGVkRXJyb3IoZSkpIHtcbiAgICAgICAgcmV0dXJuIGVycm9yVG9EaWFnbm9zdGljV2l0aENoYWluKGUsIHNwYW4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHttZXNzYWdlOiBlLm1lc3NhZ2UsIHNwYW59O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgcGFyc2VkIHRlbXBsYXRlIGZvciB0aGUgdGVtcGxhdGUgYXQgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqIEBwYXJhbSBwb3NpdGlvbiBQb3NpdGlvbiBvZiB0aGUgdGVtcGxhdGUgaW4gdGhlIFRTIGZpbGUsIG90aGVyd2lzZSBpZ25vcmVkLlxuICAgKi9cbiAgZ2V0VGVtcGxhdGVBc3RBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBBc3RSZXN1bHR8dW5kZWZpbmVkIHtcbiAgICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBGaW5kIHRoZSBub2RlIHRoYXQgbW9zdCBjbG9zZWx5IG1hdGNoZXMgdGhlIHBvc2l0aW9uXG4gICAgICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzb3VyY2VGaWxlLCBwb3NpdGlvbik7XG4gICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIFN0YXRpY1N5bWJvbCBmcm9tIGEgZmlsZSBhbmQgc3ltYm9sIG5hbWUuXG4gICAqIEByZXR1cm4gQW5ndWxhciBTdGF0aWNTeW1ib2wgbWF0Y2hpbmcgdGhlIGZpbGUgYW5kIG5hbWUsIGlmIGFueVxuICAgKi9cbiAgZ2V0U3RhdGljU3ltYm9sKGZpbGU6IHN0cmluZywgbmFtZTogc3RyaW5nKTogU3RhdGljU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChmaWxlLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBOZ01vZHVsZSB3aGljaCB0aGUgZGlyZWN0aXZlIGFzc29jaWF0ZWQgd2l0aCB0aGUgYGNsYXNzU3ltYm9sYFxuICAgKiBiZWxvbmdzIHRvLCB0aGVuIHJldHVybiBpdHMgc2NoZW1hIGFuZCB0cmFuc2l0aXZlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgQW5ndWxhciBTeW1ib2wgdGhhdCBkZWZpbmVzIGEgZGlyZWN0aXZlXG4gICAqL1xuICBwcml2YXRlIGdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sOiBTdGF0aWNTeW1ib2wpIHtcbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBbXSBhcyBDb21waWxlRGlyZWN0aXZlU3VtbWFyeVtdLFxuICAgICAgcGlwZXM6IFtdIGFzIENvbXBpbGVQaXBlU3VtbWFyeVtdLFxuICAgICAgc2NoZW1hczogW10gYXMgU2NoZW1hTWV0YWRhdGFbXSxcbiAgICB9O1xuICAgIC8vIEZpcnN0IGZpbmQgd2hpY2ggTmdNb2R1bGUgdGhlIGRpcmVjdGl2ZSBiZWxvbmdzIHRvLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5hbmFseXplZE1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5nZXQoY2xhc3NTeW1ib2wpIHx8XG4gICAgICAgIGZpbmRTdWl0YWJsZURlZmF1bHRNb2R1bGUodGhpcy5hbmFseXplZE1vZHVsZXMpO1xuICAgIGlmICghbmdNb2R1bGUpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIC8vIFRoZW4gZ2F0aGVyIGFsbCB0cmFuc2l0aXZlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzLlxuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlc30gPSBuZ01vZHVsZS50cmFuc2l0aXZlTW9kdWxlO1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdC5kaXJlY3RpdmVzLnB1c2goZGF0YS5tZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcGlwZSBvZiBwaXBlcykge1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE9yTG9hZFBpcGVNZXRhZGF0YShwaXBlLnJlZmVyZW5jZSk7XG4gICAgICByZXN1bHQucGlwZXMucHVzaChtZXRhZGF0YS50b1N1bW1hcnkoKSk7XG4gICAgfVxuICAgIHJlc3VsdC5zY2hlbWFzLnB1c2goLi4ubmdNb2R1bGUuc2NoZW1hcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSB0aGUgYHRlbXBsYXRlYCBhbmQgcmV0dXJuIGl0cyBBU1QsIGlmIGFueS5cbiAgICogQHBhcmFtIHRlbXBsYXRlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZFxuICAgKi9cbiAgZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGU6IFRlbXBsYXRlU291cmNlKTogQXN0UmVzdWx0fHVuZGVmaW5lZCB7XG4gICAgY29uc3Qge3R5cGU6IGNsYXNzU3ltYm9sLCBmaWxlTmFtZX0gPSB0ZW1wbGF0ZTtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoY2xhc3NTeW1ib2wpO1xuICAgIGlmICghZGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IEkxOE5IdG1sUGFyc2VyKG5ldyBIdG1sUGFyc2VyKCkpO1xuICAgIGNvbnN0IGV4cHJlc3Npb25QYXJzZXIgPSBuZXcgUGFyc2VyKG5ldyBMZXhlcigpKTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgIG5ldyBDb21waWxlckNvbmZpZygpLCB0aGlzLnJlZmxlY3RvciwgZXhwcmVzc2lvblBhcnNlciwgbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpLFxuICAgICAgICBodG1sUGFyc2VyLFxuICAgICAgICBudWxsICEsICAvLyBjb25zb2xlXG4gICAgICAgIFtdICAgICAgIC8vIHRyYW5mb3Jtc1xuICAgICAgICApO1xuICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgZmlsZU5hbWUsIHtcbiAgICAgIHRva2VuaXplRXhwYW5zaW9uRm9ybXM6IHRydWUsXG4gICAgICBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiB0cnVlLCAgLy8gZG8gbm90IGNvbnZlcnQgQ1JMRiB0byBMRlxuICAgIH0pO1xuICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hc30gPSB0aGlzLmdldE1vZHVsZU1ldGFkYXRhRm9yRGlyZWN0aXZlKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBwYXJzZVJlc3VsdCA9IHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgIGlmICghcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgdGVtcGxhdGVBc3Q6IHBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0LFxuICAgICAgZGlyZWN0aXZlOiBkYXRhLm1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcyxcbiAgICAgIHBhcnNlRXJyb3JzOiBwYXJzZVJlc3VsdC5lcnJvcnMsIGV4cHJlc3Npb25QYXJzZXIsIHRlbXBsYXRlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTG9nIHRoZSBzcGVjaWZpZWQgYG1zZ2AgdG8gZmlsZSBhdCBJTkZPIGxldmVsLiBJZiBsb2dnaW5nIGlzIG5vdCBlbmFibGVkXG4gICAqIHRoaXMgbWV0aG9kIGlzIGEgbm8tb3AuXG4gICAqIEBwYXJhbSBtc2cgTG9nIG1lc3NhZ2VcbiAgICovXG4gIGxvZyhtc2c6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRzTHNIb3N0LmxvZykge1xuICAgICAgdGhpcy50c0xzSG9zdC5sb2cobXNnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTG9nIHRoZSBzcGVjaWZpZWQgYG1zZ2AgdG8gZmlsZSBhdCBFUlJPUiBsZXZlbC4gSWYgbG9nZ2luZyBpcyBub3QgZW5hYmxlZFxuICAgKiB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIGVycm9yIG1lc3NhZ2VcbiAgICovXG4gIGVycm9yKG1zZzogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMudHNMc0hvc3QuZXJyb3IpIHtcbiAgICAgIHRoaXMudHNMc0hvc3QuZXJyb3IobXNnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTG9nIGRlYnVnZ2luZyBpbmZvIHRvIGZpbGUgYXQgSU5GTyBsZXZlbCwgb25seSBpZiB2ZXJib3NlIHNldHRpbmcgaXMgdHVybmVkXG4gICAqIG9uLiBPdGhlcndpc2UsIHRoaXMgbWV0aG9kIGlzIGEgbm8tb3AuXG4gICAqIEBwYXJhbSBtc2cgZGVidWdnaW5nIG1lc3NhZ2VcbiAgICovXG4gIGRlYnVnKG1zZzogc3RyaW5nKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMudHNMc0hvc3QgYXMgdHNzLnNlcnZlci5Qcm9qZWN0O1xuICAgIGlmICghcHJvamVjdC5wcm9qZWN0U2VydmljZSkge1xuICAgICAgLy8gdHNMc0hvc3QgaXMgbm90IGEgUHJvamVjdFxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7bG9nZ2VyfSA9IHByb2plY3QucHJvamVjdFNlcnZpY2U7XG4gICAgaWYgKGxvZ2dlci5oYXNMZXZlbCh0c3Muc2VydmVyLkxvZ0xldmVsLnZlcmJvc2UpKSB7XG4gICAgICBsb2dnZXIuaW5mbyhtc2cpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKG1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgbGV0IHJlc3VsdDogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgcmVzdWx0U2l6ZSA9IDA7XG4gIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMubmdNb2R1bGVzKSB7XG4gICAgY29uc3QgbW9kdWxlU2l6ZSA9IG1vZHVsZS50cmFuc2l0aXZlTW9kdWxlLmRpcmVjdGl2ZXMubGVuZ3RoO1xuICAgIGlmIChtb2R1bGVTaXplID4gcmVzdWx0U2l6ZSkge1xuICAgICAgcmVzdWx0ID0gbW9kdWxlO1xuICAgICAgcmVzdWx0U2l6ZSA9IG1vZHVsZVNpemU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihub2RlOiB0cy5Ob2RlKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbn1cblxuZnVuY3Rpb24gc3BhbkF0KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmIChsaW5lICE9IG51bGwgJiYgY29sdW1uICE9IG51bGwpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRzLmdldFBvc2l0aW9uT2ZMaW5lQW5kQ2hhcmFjdGVyKHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbik7XG4gICAgY29uc3QgZmluZENoaWxkID0gZnVuY3Rpb24gZmluZENoaWxkKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICAgIGlmIChub2RlLmtpbmQgPiB0cy5TeW50YXhLaW5kLkxhc3RUb2tlbiAmJiBub2RlLnBvcyA8PSBwb3NpdGlvbiAmJiBub2RlLmVuZCA+IHBvc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IGJldHRlck5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBmaW5kQ2hpbGQpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICByZXR1cm4ge3N0YXJ0OiBub2RlLmdldFN0YXJ0KCksIGVuZDogbm9kZS5nZXRFbmQoKX07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRDaGFpbihjaGFpbjogRm9ybWF0dGVkTWVzc2FnZUNoYWluKTogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7bWVzc2FnZTogY2hhaW4ubWVzc2FnZSwgbmV4dDogY2hhaW4ubmV4dCA/IGNoYWluLm5leHQubWFwKGNvbnZlcnRDaGFpbikgOiB1bmRlZmluZWR9O1xufVxuXG5mdW5jdGlvbiBlcnJvclRvRGlhZ25vc3RpY1dpdGhDaGFpbihlcnJvcjogRm9ybWF0dGVkRXJyb3IsIHNwYW46IFNwYW4pOiBEZWNsYXJhdGlvbkVycm9yIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBlcnJvci5jaGFpbiA/IGNvbnZlcnRDaGFpbihlcnJvci5jaGFpbikgOiBlcnJvci5tZXNzYWdlLCBzcGFufTtcbn1cbiJdfQ==