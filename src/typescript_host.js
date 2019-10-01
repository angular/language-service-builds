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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript", "typescript/lib/tsserverlibrary", "@angular/language-service/src/common", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var ts = require("typescript");
    var tss = require("typescript/lib/tsserverlibrary");
    var common_1 = require("@angular/language-service/src/common");
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
        TypeScriptServiceHost.prototype.getTemplateReferences = function () { return tslib_1.__spread(this.templateReferences); };
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
            // TODO: This is only temporary. When https://github.com/angular/angular/pull/32543
            // is merged this is no longer necessary.
            this._resolver = undefined; // Invalidate the resolver
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
            var hasChanges = false;
            try {
                for (var _b = tslib_1.__values(program.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sourceFile = _c.value;
                    var fileName = sourceFile.fileName;
                    seen.add(fileName);
                    var version = this.tsLsHost.getScriptVersion(fileName);
                    var lastVersion = this.fileVersions.get(fileName);
                    if (version !== lastVersion) {
                        hasChanges = true;
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
            return missing.length === 0 && !hasChanges;
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
            var astResult = this.getTemplateAst(template);
            if (!common_1.isAstResult(astResult)) {
                return;
            }
            return astResult;
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
            var e_4, _a, e_5, _b, _c;
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
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
            try {
                for (var pipes_1 = tslib_1.__values(pipes), pipes_1_1 = pipes_1.next(); !pipes_1_1.done; pipes_1_1 = pipes_1.next()) {
                    var pipe = pipes_1_1.value;
                    var metadata = this.resolver.getOrLoadPipeMetadata(pipe.reference);
                    result.pipes.push(metadata.toSummary());
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (pipes_1_1 && !pipes_1_1.done && (_b = pipes_1.return)) _b.call(pipes_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            (_c = result.schemas).push.apply(_c, tslib_1.__spread(ngModule.schemas));
            return result;
        };
        /**
         * Parse the `template` and return its AST if there's no error. Otherwise
         * return a Diagnostic message.
         * @param template template to be parsed
         */
        TypeScriptServiceHost.prototype.getTemplateAst = function (template) {
            var classSymbol = template.type, fileName = template.fileName;
            try {
                var data = this.resolver.getNonNormalizedDirectiveMetadata(classSymbol);
                if (!data) {
                    return {
                        kind: types_1.DiagnosticKind.Error,
                        message: "No metadata found for '" + classSymbol.name + "' in " + fileName + ".",
                        span: template.span,
                    };
                }
                var htmlParser = new compiler_1.I18NHtmlParser(new compiler_1.HtmlParser());
                var expressionParser = new compiler_1.Parser(new compiler_1.Lexer());
                var parser = new compiler_1.TemplateParser(new compiler_1.CompilerConfig(), this.reflector, expressionParser, new compiler_1.DomElementSchemaRegistry(), htmlParser, null, // console
                [] // tranforms
                );
                var htmlResult = htmlParser.parse(template.source, fileName, {
                    tokenizeExpansionForms: true,
                });
                var _a = this.getModuleMetadataForDirective(classSymbol), directives = _a.directives, pipes = _a.pipes, schemas = _a.schemas;
                var parseResult = parser.tryParseHtml(htmlResult, data.metadata, directives, pipes, schemas);
                if (!parseResult.templateAst) {
                    return {
                        kind: types_1.DiagnosticKind.Error,
                        message: "Failed to parse template for '" + classSymbol.name + "' in " + fileName,
                        span: template.span,
                    };
                }
                return {
                    htmlAst: htmlResult.rootNodes,
                    templateAst: parseResult.templateAst,
                    directive: data.metadata, directives: directives, pipes: pipes,
                    parseErrors: parseResult.errors, expressionParser: expressionParser, template: template,
                };
            }
            catch (e) {
                return {
                    kind: types_1.DiagnosticKind.Error,
                    message: e.message,
                    span: e.fileName === fileName && template.query.getSpanAt(e.line, e.column) || template.span,
                };
            }
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
        var e_6, _a;
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
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2akI7SUFDN2pCLHNDQUFxRjtJQUNyRiwrQkFBaUM7SUFDakMsb0RBQXNEO0lBRXRELCtEQUFnRDtJQUNoRCxtRkFBeUQ7SUFDekQsK0VBQStDO0lBQy9DLG1FQUEySDtJQUMzSCw2REFBc0s7SUFDdEssNkRBQWdFO0lBR2hFOztPQUVHO0lBQ0gsU0FBZ0IsbUNBQW1DLENBQy9DLElBQTRCLEVBQUUsT0FBMkI7UUFDM0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBTSxRQUFRLEdBQUcsd0NBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUxELGtGQUtDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQUFxQywyQ0FBVTtRQUEvQzs7UUFFQSxDQUFDO1FBREMsK0JBQUssR0FBTCxjQUEyQixPQUFPLElBQUksMEJBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLHNCQUFDO0lBQUQsQ0FBQyxBQUZELENBQXFDLHFCQUFVLEdBRTlDO0lBRlksMENBQWU7SUFJNUI7O09BRUc7SUFDSDtRQUF5QywrQ0FBYztRQUF2RDs7UUFFQSxDQUFDO1FBREMsaUNBQUcsR0FBSCxVQUFJLEdBQVcsSUFBcUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSwwQkFBQztJQUFELENBQUMsQUFGRCxDQUF5Qyx5QkFBYyxHQUV0RDtJQUZZLGtEQUFtQjtJQUloQzs7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QUFDLENBQUM7SUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RTdW1tYXJ5UmVzb2x2ZXIsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlTWV0YWRhdGFSZXNvbHZlciwgQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEsIENvbXBpbGVQaXBlU3VtbWFyeSwgQ29tcGlsZXJDb25maWcsIERpcmVjdGl2ZU5vcm1hbGl6ZXIsIERpcmVjdGl2ZVJlc29sdmVyLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEZvcm1hdHRlZEVycm9yLCBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4sIEh0bWxQYXJzZXIsIEkxOE5IdG1sUGFyc2VyLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VUcmVlUmVzdWx0LCBQYXJzZXIsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyLCBhbmFseXplTmdNb2R1bGVzLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBpc0Zvcm1hdHRlZEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NjaGVtYU1ldGFkYXRhLCBWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtBc3RSZXN1bHQsIGlzQXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7UmVmbGVjdG9ySG9zdH0gZnJvbSAnLi9yZWZsZWN0b3JfaG9zdCc7XG5pbXBvcnQge0V4dGVybmFsVGVtcGxhdGUsIElubGluZVRlbXBsYXRlLCBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRXJyb3IsIERpYWdub3N0aWMsIERpYWdub3N0aWNLaW5kLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMYW5ndWFnZVNlcnZpY2UsIExhbmd1YWdlU2VydmljZUhvc3QsIFNwYW4sIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0RGlyZWN0aXZlQ2xhc3NMaWtlfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIENyZWF0ZSBhIGBMYW5ndWFnZVNlcnZpY2VIb3N0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlRnJvbVR5cGVzY3JpcHQoXG4gICAgaG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgc2VydmljZTogdHMuTGFuZ3VhZ2VTZXJ2aWNlKTogTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3QgbmdIb3N0ID0gbmV3IFR5cGVTY3JpcHRTZXJ2aWNlSG9zdChob3N0LCBzZXJ2aWNlKTtcbiAgY29uc3QgbmdTZXJ2ZXIgPSBjcmVhdGVMYW5ndWFnZVNlcnZpY2UobmdIb3N0KTtcbiAgcmV0dXJuIG5nU2VydmVyO1xufVxuXG4vKipcbiAqIFRoZSBsYW5ndWFnZSBzZXJ2aWNlIG5ldmVyIG5lZWRzIHRoZSBub3JtYWxpemVkIHZlcnNpb25zIG9mIHRoZSBtZXRhZGF0YS4gVG8gYXZvaWQgcGFyc2luZ1xuICogdGhlIGNvbnRlbnQgYW5kIHJlc29sdmluZyByZWZlcmVuY2VzLCByZXR1cm4gYW4gZW1wdHkgZmlsZS4gVGhpcyBhbHNvIGFsbG93cyBub3JtYWxpemluZ1xuICogdGVtcGxhdGUgdGhhdCBhcmUgc3ludGF0aWNhbGx5IGluY29ycmVjdCB3aGljaCBpcyByZXF1aXJlZCB0byBwcm92aWRlIGNvbXBsZXRpb25zIGluXG4gKiBzeW50YWN0aWNhbGx5IGluY29ycmVjdCB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdW1teUh0bWxQYXJzZXIgZXh0ZW5kcyBIdG1sUGFyc2VyIHtcbiAgcGFyc2UoKTogUGFyc2VUcmVlUmVzdWx0IHsgcmV0dXJuIG5ldyBQYXJzZVRyZWVSZXN1bHQoW10sIFtdKTsgfVxufVxuXG4vKipcbiAqIEF2b2lkIGxvYWRpbmcgcmVzb3VyY2VzIGluIHRoZSBsYW5ndWFnZSBzZXJ2Y2llIGJ5IHVzaW5nIGEgZHVtbXkgbG9hZGVyLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlSZXNvdXJjZUxvYWRlciBleHRlbmRzIFJlc291cmNlTG9hZGVyIHtcbiAgZ2V0KHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgnJyk7IH1cbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBhIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCBmb3IgYSBUeXBlU2NyaXB0IHByb2plY3QuXG4gKlxuICogVGhlIGBUeXBlU2NyaXB0U2VydmljZUhvc3RgIGltcGxlbWVudHMgdGhlIEFuZ3VsYXIgYExhbmd1YWdlU2VydmljZUhvc3RgIHVzaW5nXG4gKiB0aGUgVHlwZVNjcmlwdCBsYW5ndWFnZSBzZXJ2aWNlcy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0U2VydmljZUhvc3QgaW1wbGVtZW50cyBMYW5ndWFnZVNlcnZpY2VIb3N0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBzdW1tYXJ5UmVzb2x2ZXI6IEFvdFN1bW1hcnlSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZWFkb25seSByZWZsZWN0b3JIb3N0OiBSZWZsZWN0b3JIb3N0O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRpY1N5bWJvbFJlc29sdmVyOiBTdGF0aWNTeW1ib2xSZXNvbHZlcjtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRpY1N5bWJvbENhY2hlID0gbmV3IFN0YXRpY1N5bWJvbENhY2hlKCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZVRvQ29tcG9uZW50ID0gbmV3IE1hcDxzdHJpbmcsIFN0YXRpY1N5bWJvbD4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjb2xsZWN0ZWRFcnJvcnMgPSBuZXcgTWFwPHN0cmluZywgYW55W10+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZVZlcnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBwcml2YXRlIGxhc3RQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSB0ZW1wbGF0ZVJlZmVyZW5jZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyA9IHtcbiAgICBmaWxlczogW10sXG4gICAgbmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZTogbmV3IE1hcCgpLFxuICAgIG5nTW9kdWxlczogW10sXG4gIH07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSB0c0xzSG9zdDogdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnN1bW1hcnlSZXNvbHZlciA9IG5ldyBBb3RTdW1tYXJ5UmVzb2x2ZXIoXG4gICAgICAgIHtcbiAgICAgICAgICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgICAgIGlzU291cmNlRmlsZShzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgICAgIHRvU3VtbWFyeUZpbGVOYW1lKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHNvdXJjZUZpbGVQYXRoOyB9LFxuICAgICAgICAgIGZyb21TdW1tYXJ5RmlsZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3tyZXR1cm4gZmlsZVBhdGg7fSxcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSk7XG4gICAgdGhpcy5yZWZsZWN0b3JIb3N0ID0gbmV3IFJlZmxlY3Rvckhvc3QoKCkgPT4gdGhpcy5wcm9ncmFtLCB0c0xzSG9zdCk7XG4gICAgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlciA9IG5ldyBTdGF0aWNTeW1ib2xSZXNvbHZlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0b3JIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbENhY2hlLCB0aGlzLnN1bW1hcnlSZXNvbHZlcixcbiAgICAgICAgKGUsIGZpbGVQYXRoKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlLCBmaWxlUGF0aCkpO1xuICB9XG5cbiAgLy8gVGhlIHJlc29sdmVyIGlzIGluc3RhbnRpYXRlZCBsYXppbHkgYW5kIHNob3VsZCBub3QgYmUgYWNjZXNzZWQgZGlyZWN0bHkuXG4gIC8vIEluc3RlYWQsIGNhbGwgdGhlIHJlc29sdmVyIGdldHRlci4gVGhlIGluc3RhbnRpYXRpb24gb2YgdGhlIHJlc29sdmVyIGFsc29cbiAgLy8gcmVxdWlyZXMgaW5zdGFudGlhdGlvbiBvZiB0aGUgU3RhdGljUmVmbGVjdG9yLCBhbmQgdGhlIGxhdHRlciByZXF1aXJlc1xuICAvLyByZXNvbHV0aW9uIG9mIGNvcmUgQW5ndWxhciBzeW1ib2xzLiBNb2R1bGUgcmVzb2x1dGlvbiBzaG91bGQgbm90IGJlIGRvbmVcbiAgLy8gZHVyaW5nIGluc3RhbnRpYXRpb24gdG8gYXZvaWQgY3ljbGljIGRlcGVuZGVuY3kgYmV0d2VlbiB0aGUgcGx1Z2luIGFuZCB0aGVcbiAgLy8gY29udGFpbmluZyBQcm9qZWN0LCBzbyB0aGUgU2luZ2xldG9uIHBhdHRlcm4gaXMgdXNlZCBoZXJlLlxuICBwcml2YXRlIF9yZXNvbHZlcjogQ29tcGlsZU1ldGFkYXRhUmVzb2x2ZXJ8dW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiB0aGUgTWV0YWRhdGFSZXNvbHZlci5cbiAgICovXG4gIHByaXZhdGUgZ2V0IHJlc29sdmVyKCk6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyIHtcbiAgICBpZiAodGhpcy5fcmVzb2x2ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZXNvbHZlcjtcbiAgICB9XG4gICAgLy8gU3RhdGljUmVmbGVjdG9yIGtlZXBzIGl0cyBvd24gcHJpdmF0ZSBjYWNoZXMgdGhhdCBhcmUgbm90IGNsZWFyYWJsZS5cbiAgICAvLyBXZSBoYXZlIG5vIGNob2ljZSBidXQgdG8gY3JlYXRlIGEgbmV3IGluc3RhbmNlIHRvIGludmFsaWRhdGUgdGhlIGNhY2hlcy5cbiAgICAvLyBUT0RPOiBSZXZpc2l0IHRoaXMgd2hlbiBsYW5ndWFnZSBzZXJ2aWNlIGdldHMgcmV3cml0dGVuIGZvciBJdnkuXG4gICAgY29uc3Qgc3RhdGljUmVmbGVjdG9yID0gbmV3IFN0YXRpY1JlZmxlY3RvcihcbiAgICAgICAgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIsIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIsXG4gICAgICAgIFtdLCAgLy8ga25vd25NZXRhZGF0YUNsYXNzZXNcbiAgICAgICAgW10sICAvLyBrbm93bk1ldGFkYXRhRnVuY3Rpb25zXG4gICAgICAgIChlLCBmaWxlUGF0aCkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZSwgZmlsZVBhdGgpKTtcbiAgICAvLyBCZWNhdXNlIHN0YXRpYyByZWZsZWN0b3IgYWJvdmUgaXMgY2hhbmdlZCwgd2UgbmVlZCB0byBjcmVhdGUgYSBuZXdcbiAgICAvLyByZXNvbHZlci5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBOZ01vZHVsZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgZGlyZWN0aXZlUmVzb2x2ZXIgPSBuZXcgRGlyZWN0aXZlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBwaXBlUmVzb2x2ZXIgPSBuZXcgUGlwZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IHJlc291cmNlTG9hZGVyID0gbmV3IER1bW15UmVzb3VyY2VMb2FkZXIoKTtcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IER1bW15SHRtbFBhcnNlcigpO1xuICAgIC8vIFRoaXMgdHJhY2tzIHRoZSBDb21waWxlQ29uZmlnIGluIGNvZGVnZW4udHMuIEN1cnJlbnRseSB0aGVzZSBvcHRpb25zXG4gICAgLy8gYXJlIGhhcmQtY29kZWQuXG4gICAgY29uc3QgY29uZmlnID0gbmV3IENvbXBpbGVyQ29uZmlnKHtcbiAgICAgIGRlZmF1bHRFbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgIHVzZUppdDogZmFsc2UsXG4gICAgfSk7XG4gICAgY29uc3QgZGlyZWN0aXZlTm9ybWFsaXplciA9XG4gICAgICAgIG5ldyBEaXJlY3RpdmVOb3JtYWxpemVyKHJlc291cmNlTG9hZGVyLCB1cmxSZXNvbHZlciwgaHRtbFBhcnNlciwgY29uZmlnKTtcbiAgICB0aGlzLl9yZXNvbHZlciA9IG5ldyBDb21waWxlTWV0YWRhdGFSZXNvbHZlcihcbiAgICAgICAgY29uZmlnLCBodG1sUGFyc2VyLCBtb2R1bGVSZXNvbHZlciwgZGlyZWN0aXZlUmVzb2x2ZXIsIHBpcGVSZXNvbHZlcixcbiAgICAgICAgbmV3IEppdFN1bW1hcnlSZXNvbHZlcigpLCBlbGVtZW50U2NoZW1hUmVnaXN0cnksIGRpcmVjdGl2ZU5vcm1hbGl6ZXIsIG5ldyBDb25zb2xlKCksXG4gICAgICAgIHRoaXMuc3RhdGljU3ltYm9sQ2FjaGUsIHN0YXRpY1JlZmxlY3RvcixcbiAgICAgICAgKGVycm9yLCB0eXBlKSA9PiB0aGlzLmNvbGxlY3RFcnJvcihlcnJvciwgdHlwZSAmJiB0eXBlLmZpbGVQYXRoKSk7XG4gICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgc2luZ2xldG9uIGluc3RhbmNlIG9mIHRoZSBTdGF0aWNSZWZsZWN0b3IgaG9zdGVkIGluIHRoZVxuICAgKiBNZXRhZGF0YVJlc29sdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgcmVmbGVjdG9yKCk6IFN0YXRpY1JlZmxlY3RvciB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZXIuZ2V0UmVmbGVjdG9yKCkgYXMgU3RhdGljUmVmbGVjdG9yO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFsuLi50aGlzLnRlbXBsYXRlUmVmZXJlbmNlc107IH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQgYW5kIHJldHVybnMgYWxsIGFuYWx5emVkIG1vZHVsZXMuXG4gICAqIElmIHByb2dyYW0gaGFzIGNoYW5nZWQsIGludmFsaWRhdGUgYWxsIGNhY2hlcyBhbmQgdXBkYXRlIGZpbGVUb0NvbXBvbmVudFxuICAgKiBhbmQgdGVtcGxhdGVSZWZlcmVuY2VzLlxuICAgKiBJbiBhZGRpdGlvbiB0byByZXR1cm5pbmcgaW5mb3JtYXRpb24gYWJvdXQgTmdNb2R1bGVzLCB0aGlzIG1ldGhvZCBwbGF5cyB0aGVcbiAgICogc2FtZSByb2xlIGFzICdzeW5jaHJvbml6ZUhvc3REYXRhJyBpbiB0c3NlcnZlci5cbiAgICogQHBhcmFtIGVuc3VyZVN5bmNocm9uaXplZCB3aGV0aGVyIG9yIG5vdCB0aGUgTGFuZ3VhZ2UgU2VydmljZSBzaG91bGQgbWFrZSBzdXJlIGFuYWx5emVkTW9kdWxlc1xuICAgKiAgIGFyZSBzeW5jZWQgdG8gdGhlIGxhc3QgdXBkYXRlIG9mIHRoZSBwcm9qZWN0LiBJZiBmYWxzZSwgcmV0dXJucyB0aGUgc2V0IG9mIGFuYWx5emVkTW9kdWxlc1xuICAgKiAgIHRoYXQgaXMgYWxyZWFkeSBjYWNoZWQuIFRoaXMgaXMgdXNlZnVsIGlmIHRoZSBwcm9qZWN0IG11c3Qgbm90IGJlIHJlYW5hbHl6ZWQsIGV2ZW4gaWYgaXRzXG4gICAqICAgZmlsZSB3YXRjaGVycyAod2hpY2ggYXJlIGRpc2pvaW50IGZyb20gdGhlIFR5cGVTY3JpcHRTZXJ2aWNlSG9zdCkgZGV0ZWN0IGFuIHVwZGF0ZS5cbiAgICovXG4gIGdldEFuYWx5emVkTW9kdWxlcyhlbnN1cmVTeW5jaHJvbml6ZWQgPSB0cnVlKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICghZW5zdXJlU3luY2hyb25pemVkIHx8IHRoaXMudXBUb0RhdGUoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuYW5hbHl6ZWRNb2R1bGVzO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgY2FjaGVzXG4gICAgdGhpcy50ZW1wbGF0ZVJlZmVyZW5jZXMgPSBbXTtcbiAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5jbGVhcigpO1xuICAgIHRoaXMuY29sbGVjdGVkRXJyb3JzLmNsZWFyKCk7XG4gICAgLy8gVE9ETzogVGhpcyBpcyBvbmx5IHRlbXBvcmFyeS4gV2hlbiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL3B1bGwvMzI1NDNcbiAgICAvLyBpcyBtZXJnZWQgdGhpcyBpcyBubyBsb25nZXIgbmVjZXNzYXJ5LlxuICAgIHRoaXMuX3Jlc29sdmVyID0gdW5kZWZpbmVkOyAgLy8gSW52YWxpZGF0ZSB0aGUgcmVzb2x2ZXJcblxuICAgIGNvbnN0IGFuYWx5emVIb3N0ID0ge2lzU291cmNlRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9fTtcbiAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpO1xuICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID1cbiAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0ZW1wbGF0ZSByZWZlcmVuY2VzIGFuZCBmaWxlVG9Db21wb25lbnRcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlcykge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSAhO1xuICAgICAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQgJiYgbWV0YWRhdGEudGVtcGxhdGUgJiYgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB1cmxSZXNvbHZlci5yZXNvbHZlKFxuICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5zZXQodGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcy5wdXNoKHRlbXBsYXRlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGVtcGxhdGVzIGluIHRoZSBzcGVjaWZpZWQgYGZpbGVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqL1xuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUoY2hpbGQpO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG1ldGFkYXRhIGFib3V0IGFsbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gdGhlIGZpbGUgdGhhdCBhcmUgQW5ndWxhclxuICAgKiBkaXJlY3RpdmVzLiBQb3RlbnRpYWwgbWF0Y2hlcyBhcmUgYEBOZ01vZHVsZWAsIGBAQ29tcG9uZW50YCwgYEBEaXJlY3RpdmVgLFxuICAgKiBgQFBpcGVzYCwgZXRjLiBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBmaWxlXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbnMoZmlsZU5hbWU6IHN0cmluZyk6IERlY2xhcmF0aW9uW10ge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBEZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGdldERpcmVjdGl2ZUNsYXNzTGlrZShjaGlsZCk7XG4gICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtkZWNvcmF0b3JJZCwgY2xhc3NEZWNsfSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKGRlY29yYXRvcklkKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NEZWNsLm5hbWUgIS50ZXh0O1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChzb3VyY2VGaWxlLmZpbGVOYW1lLCBjbGFzc05hbWUpO1xuICAgICAgICAvLyBBc2sgdGhlIHJlc29sdmVyIHRvIGNoZWNrIGlmIGNhbmRpZGF0ZSBpcyBhY3R1YWxseSBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIuaXNEaXJlY3RpdmUoY2xhc3NTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICBtZXRhZGF0YTogZGF0YS5tZXRhZGF0YSxcbiAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuZm9yRWFjaENoaWxkKHZpc2l0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IHByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHByb2dyYW0gaGFzIGNoYW5nZWQsIGFuZCBpbnZhbGlkYXRlIGNhY2hlcyBpZiBpdCBoYXMuXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBtb2R1bGVzIGFyZSB1cC10by1kYXRlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIFRoaXMgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJ5IGdldEFuYWx5emVkTW9kdWxlcygpLlxuICAgKi9cbiAgcHJpdmF0ZSB1cFRvRGF0ZSgpIHtcbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtO1xuICAgIGlmICh0aGlzLmxhc3RQcm9ncmFtID09PSBwcm9ncmFtKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBJbnZhbGlkYXRlIGZpbGUgdGhhdCBoYXZlIGNoYW5nZWQgaW4gdGhlIHN0YXRpYyBzeW1ib2wgcmVzb2x2ZXJcbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgbGV0IGhhc0NoYW5nZXMgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBmaWxlTmFtZSA9IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICBzZWVuLmFkZChmaWxlTmFtZSk7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gdGhpcy50c0xzSG9zdC5nZXRTY3JpcHRWZXJzaW9uKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGxhc3RWZXJzaW9uID0gdGhpcy5maWxlVmVyc2lvbnMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmICh2ZXJzaW9uICE9PSBsYXN0VmVyc2lvbikge1xuICAgICAgICBoYXNDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5maWxlVmVyc2lvbnMuc2V0KGZpbGVOYW1lLCB2ZXJzaW9uKTtcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xSZXNvbHZlci5pbnZhbGlkYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGZpbGUgdmVyc2lvbnMgdGhhdCBhcmUgbm8gbG9uZ2VyIGluIHRoZSBmaWxlIGFuZCBpbnZhbGlkYXRlIHRoZW0uXG4gICAgY29uc3QgbWlzc2luZyA9IEFycmF5LmZyb20odGhpcy5maWxlVmVyc2lvbnMua2V5cygpKS5maWx0ZXIoZiA9PiAhc2Vlbi5oYXMoZikpO1xuICAgIG1pc3NpbmcuZm9yRWFjaChmID0+IHtcbiAgICAgIHRoaXMuZmlsZVZlcnNpb25zLmRlbGV0ZShmKTtcbiAgICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIuaW52YWxpZGF0ZUZpbGUoZik7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxhc3RQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBtaXNzaW5nLmxlbmd0aCA9PT0gMCAmJiAhaGFzQ2hhbmdlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIFRlbXBsYXRlU291cmNlIGlmIGBub2RlYCBpcyBhIHRlbXBsYXRlIG5vZGUuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBAQ29tcG9uZW50KHtcbiAgICogICB0ZW1wbGF0ZTogJzxkaXY+PC9kaXY+JyA8LS0gdGVtcGxhdGUgbm9kZVxuICAgKiB9KVxuICAgKiBjbGFzcyBBcHBDb21wb25lbnQge31cbiAgICogICAgICAgICAgIF4tLS0tIGNsYXNzIGRlY2xhcmF0aW9uIG5vZGVcbiAgICpcbiAgICogQHBhcmFtIG5vZGUgUG90ZW50aWFsIHRlbXBsYXRlIG5vZGVcbiAgICovXG4gIHByaXZhdGUgZ2V0SW50ZXJuYWxUZW1wbGF0ZShub2RlOiB0cy5Ob2RlKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2Uobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdG1wbEFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUobm9kZSk7XG4gICAgaWYgKCF0bXBsQXNnbiB8fCB0bXBsQXNnbi5uYW1lLmdldFRleHQoKSAhPT0gJ3RlbXBsYXRlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGFzc0RlY2wgPSBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCh0bXBsQXNnbik7XG4gICAgaWYgKCFjbGFzc0RlY2wgfHwgIWNsYXNzRGVjbC5uYW1lKSB7ICAvLyBEb2VzIG5vdCBoYW5kbGUgYW5vbnltb3VzIGNsYXNzXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpbGVOYW1lID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woZmlsZU5hbWUsIGNsYXNzRGVjbC5uYW1lLnRleHQpO1xuICAgIHJldHVybiBuZXcgSW5saW5lVGVtcGxhdGUobm9kZSwgY2xhc3NEZWNsLCBjbGFzc1N5bWJvbCwgdGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZSBmb3IgYGZpbGVOYW1lYC5cbiAgICogQHBhcmFtIGZpbGVOYW1lIEhUTUwgZmlsZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVNvdXJjZXx1bmRlZmluZWQge1xuICAgIC8vIEZpcnN0IGdldCB0aGUgdGV4dCBmb3IgdGhlIHRlbXBsYXRlXG4gICAgY29uc3Qgc25hcHNob3QgPSB0aGlzLnRzTHNIb3N0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgIC8vIE5leHQgZmluZCB0aGUgY29tcG9uZW50IGNsYXNzIHN5bWJvbFxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoZW4gdXNlIHRoZSBjbGFzcyBzeW1ib2wgdG8gZmluZCB0aGUgYWN0dWFsIHRzLkNsYXNzRGVjbGFyYXRpb24gbm9kZVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoY2xhc3NTeW1ib2wuZmlsZVBhdGgpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUT0RPOiBUaGlzIG9ubHkgY29uc2lkZXJzIHRvcC1sZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZS5cbiAgICAvLyBUaGlzIHdvdWxkIG5vdCBmaW5kIGEgY2xhc3MgZGVjbGFyYXRpb24gaW4gYSBuYW1lc3BhY2UsIGZvciBleGFtcGxlLlxuICAgIGNvbnN0IGNsYXNzRGVjbCA9IHNvdXJjZUZpbGUuZm9yRWFjaENoaWxkKChjaGlsZCkgPT4ge1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjaGlsZCkgJiYgY2hpbGQubmFtZSAmJiBjaGlsZC5uYW1lLnRleHQgPT09IGNsYXNzU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghY2xhc3NEZWNsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxUZW1wbGF0ZShzb3VyY2UsIGZpbGVOYW1lLCBjbGFzc0RlY2wsIGNsYXNzU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEVycm9yKGVycm9yOiBhbnksIGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICBsZXQgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGlmICghZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5zZXQoZmlsZVBhdGgsIGVycm9ycyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb2xsZWN0ZWRFcnJvcnMoZGVmYXVsdFNwYW46IFNwYW4sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBEZWNsYXJhdGlvbkVycm9yW10ge1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBpZiAoIWVycm9ycykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBUT0RPOiBBZGQgYmV0dGVyIHR5cGluZ3MgZm9yIHRoZSBlcnJvcnNcbiAgICByZXR1cm4gZXJyb3JzLm1hcCgoZTogYW55KSA9PiB7XG4gICAgICBjb25zdCBsaW5lID0gZS5saW5lIHx8IChlLnBvc2l0aW9uICYmIGUucG9zaXRpb24ubGluZSk7XG4gICAgICBjb25zdCBjb2x1bW4gPSBlLmNvbHVtbiB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmNvbHVtbik7XG4gICAgICBjb25zdCBzcGFuID0gc3BhbkF0KHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbikgfHwgZGVmYXVsdFNwYW47XG4gICAgICBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlKSkge1xuICAgICAgICByZXR1cm4gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZSwgc3Bhbik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge21lc3NhZ2U6IGUubWVzc2FnZSwgc3Bhbn07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBwYXJzZWQgdGVtcGxhdGUgZm9yIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBvciBIVE1MIGZpbGVcbiAgICogQHBhcmFtIHBvc2l0aW9uIFBvc2l0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpbiB0aGUgVFMgZmlsZSwgb3RoZXJ3aXNlIGlnbm9yZWQuXG4gICAqL1xuICBnZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IEFzdFJlc3VsdHx1bmRlZmluZWQge1xuICAgIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkO1xuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIEZpbmQgdGhlIG5vZGUgdGhhdCBtb3N0IGNsb3NlbHkgbWF0Y2hlcyB0aGUgcG9zaXRpb25cbiAgICAgIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNvdXJjZUZpbGUsIHBvc2l0aW9uKTtcbiAgICAgIGlmICghbm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZ2V0SW50ZXJuYWxUZW1wbGF0ZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldEV4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGFzdFJlc3VsdCA9IHRoaXMuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICAgIGlmICghaXNBc3RSZXN1bHQoYXN0UmVzdWx0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gYXN0UmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBTdGF0aWNTeW1ib2wgZnJvbSBhIGZpbGUgYW5kIHN5bWJvbCBuYW1lLlxuICAgKiBAcmV0dXJuIEFuZ3VsYXIgU3RhdGljU3ltYm9sIG1hdGNoaW5nIHRoZSBmaWxlIGFuZCBuYW1lLCBpZiBhbnlcbiAgICovXG4gIGdldFN0YXRpY1N5bWJvbChmaWxlOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IFN0YXRpY1N5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnJlZmxlY3Rvci5nZXRTdGF0aWNTeW1ib2woZmlsZSwgbmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgTmdNb2R1bGUgd2hpY2ggdGhlIGRpcmVjdGl2ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGBjbGFzc1N5bWJvbGBcbiAgICogYmVsb25ncyB0bywgdGhlbiByZXR1cm4gaXRzIHNjaGVtYSBhbmQgdHJhbnNpdGl2ZSBkaXJlY3RpdmVzIGFuZCBwaXBlcy5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIEFuZ3VsYXIgU3ltYm9sIHRoYXQgZGVmaW5lcyBhIGRpcmVjdGl2ZVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRNb2R1bGVNZXRhZGF0YUZvckRpcmVjdGl2ZShjbGFzc1N5bWJvbDogU3RhdGljU3ltYm9sKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgZGlyZWN0aXZlczogW10gYXMgQ29tcGlsZURpcmVjdGl2ZVN1bW1hcnlbXSxcbiAgICAgIHBpcGVzOiBbXSBhcyBDb21waWxlUGlwZVN1bW1hcnlbXSxcbiAgICAgIHNjaGVtYXM6IFtdIGFzIFNjaGVtYU1ldGFkYXRhW10sXG4gICAgfTtcbiAgICAvLyBGaXJzdCBmaW5kIHdoaWNoIE5nTW9kdWxlIHRoZSBkaXJlY3RpdmUgYmVsb25ncyB0by5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KGNsYXNzU3ltYm9sKSB8fFxuICAgICAgICBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzKTtcbiAgICBpZiAoIW5nTW9kdWxlKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBUaGVuIGdhdGhlciBhbGwgdHJhbnNpdGl2ZSBkaXJlY3RpdmVzIGFuZCBwaXBlcy5cbiAgICBjb25zdCB7ZGlyZWN0aXZlcywgcGlwZXN9ID0gbmdNb2R1bGUudHJhbnNpdGl2ZU1vZHVsZTtcbiAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXN1bHQuZGlyZWN0aXZlcy5wdXNoKGRhdGEubWV0YWRhdGEudG9TdW1tYXJ5KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBpcGUgb2YgcGlwZXMpIHtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5yZXNvbHZlci5nZXRPckxvYWRQaXBlTWV0YWRhdGEocGlwZS5yZWZlcmVuY2UpO1xuICAgICAgcmVzdWx0LnBpcGVzLnB1c2gobWV0YWRhdGEudG9TdW1tYXJ5KCkpO1xuICAgIH1cbiAgICByZXN1bHQuc2NoZW1hcy5wdXNoKC4uLm5nTW9kdWxlLnNjaGVtYXMpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgdGhlIGB0ZW1wbGF0ZWAgYW5kIHJldHVybiBpdHMgQVNUIGlmIHRoZXJlJ3Mgbm8gZXJyb3IuIE90aGVyd2lzZVxuICAgKiByZXR1cm4gYSBEaWFnbm9zdGljIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWRcbiAgICovXG4gIGdldFRlbXBsYXRlQXN0KHRlbXBsYXRlOiBUZW1wbGF0ZVNvdXJjZSk6IEFzdFJlc3VsdHxEaWFnbm9zdGljIHtcbiAgICBjb25zdCB7dHlwZTogY2xhc3NTeW1ib2wsIGZpbGVOYW1lfSA9IHRlbXBsYXRlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5yZXNvbHZlci5nZXROb25Ob3JtYWxpemVkRGlyZWN0aXZlTWV0YWRhdGEoY2xhc3NTeW1ib2wpO1xuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgbWVzc2FnZTogYE5vIG1ldGFkYXRhIGZvdW5kIGZvciAnJHtjbGFzc1N5bWJvbC5uYW1lfScgaW4gJHtmaWxlTmFtZX0uYCxcbiAgICAgICAgICBzcGFuOiB0ZW1wbGF0ZS5zcGFuLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgaHRtbFBhcnNlciA9IG5ldyBJMThOSHRtbFBhcnNlcihuZXcgSHRtbFBhcnNlcigpKTtcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25QYXJzZXIgPSBuZXcgUGFyc2VyKG5ldyBMZXhlcigpKTtcbiAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBUZW1wbGF0ZVBhcnNlcihcbiAgICAgICAgICBuZXcgQ29tcGlsZXJDb25maWcoKSwgdGhpcy5yZWZsZWN0b3IsIGV4cHJlc3Npb25QYXJzZXIsIG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKSxcbiAgICAgICAgICBodG1sUGFyc2VyLFxuICAgICAgICAgIG51bGwgISwgIC8vIGNvbnNvbGVcbiAgICAgICAgICBbXSAgICAgICAvLyB0cmFuZm9ybXNcbiAgICAgICAgICApO1xuICAgICAgY29uc3QgaHRtbFJlc3VsdCA9IGh0bWxQYXJzZXIucGFyc2UodGVtcGxhdGUuc291cmNlLCBmaWxlTmFtZSwge1xuICAgICAgICB0b2tlbml6ZUV4cGFuc2lvbkZvcm1zOiB0cnVlLFxuICAgICAgfSk7XG4gICAgICBjb25zdCB7ZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXN9ID0gdGhpcy5nZXRNb2R1bGVNZXRhZGF0YUZvckRpcmVjdGl2ZShjbGFzc1N5bWJvbCk7XG4gICAgICBjb25zdCBwYXJzZVJlc3VsdCA9XG4gICAgICAgICAgcGFyc2VyLnRyeVBhcnNlSHRtbChodG1sUmVzdWx0LCBkYXRhLm1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcywgc2NoZW1hcyk7XG4gICAgICBpZiAoIXBhcnNlUmVzdWx0LnRlbXBsYXRlQXN0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2luZDogRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgbWVzc2FnZTogYEZhaWxlZCB0byBwYXJzZSB0ZW1wbGF0ZSBmb3IgJyR7Y2xhc3NTeW1ib2wubmFtZX0nIGluICR7ZmlsZU5hbWV9YCxcbiAgICAgICAgICBzcGFuOiB0ZW1wbGF0ZS5zcGFuLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaHRtbEFzdDogaHRtbFJlc3VsdC5yb290Tm9kZXMsXG4gICAgICAgIHRlbXBsYXRlQXN0OiBwYXJzZVJlc3VsdC50ZW1wbGF0ZUFzdCxcbiAgICAgICAgZGlyZWN0aXZlOiBkYXRhLm1ldGFkYXRhLCBkaXJlY3RpdmVzLCBwaXBlcyxcbiAgICAgICAgcGFyc2VFcnJvcnM6IHBhcnNlUmVzdWx0LmVycm9ycywgZXhwcmVzc2lvblBhcnNlciwgdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IERpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICAgIHNwYW46XG4gICAgICAgICAgICBlLmZpbGVOYW1lID09PSBmaWxlTmFtZSAmJiB0ZW1wbGF0ZS5xdWVyeS5nZXRTcGFuQXQoZS5saW5lLCBlLmNvbHVtbikgfHwgdGVtcGxhdGUuc3BhbixcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgSU5GTyBsZXZlbC4gSWYgbG9nZ2luZyBpcyBub3QgZW5hYmxlZFxuICAgKiB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIExvZyBtZXNzYWdlXG4gICAqL1xuICBsb2cobXNnOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy50c0xzSG9zdC5sb2cpIHtcbiAgICAgIHRoaXMudHNMc0hvc3QubG9nKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyB0aGUgc3BlY2lmaWVkIGBtc2dgIHRvIGZpbGUgYXQgRVJST1IgbGV2ZWwuIElmIGxvZ2dpbmcgaXMgbm90IGVuYWJsZWRcbiAgICogdGhpcyBtZXRob2QgaXMgYSBuby1vcC5cbiAgICogQHBhcmFtIG1zZyBlcnJvciBtZXNzYWdlXG4gICAqL1xuICBlcnJvcihtc2c6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRzTHNIb3N0LmVycm9yKSB7XG4gICAgICB0aGlzLnRzTHNIb3N0LmVycm9yKG1zZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvZyBkZWJ1Z2dpbmcgaW5mbyB0byBmaWxlIGF0IElORk8gbGV2ZWwsIG9ubHkgaWYgdmVyYm9zZSBzZXR0aW5nIGlzIHR1cm5lZFxuICAgKiBvbi4gT3RoZXJ3aXNlLCB0aGlzIG1ldGhvZCBpcyBhIG5vLW9wLlxuICAgKiBAcGFyYW0gbXNnIGRlYnVnZ2luZyBtZXNzYWdlXG4gICAqL1xuICBkZWJ1Zyhtc2c6IHN0cmluZykge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLnRzTHNIb3N0IGFzIHRzcy5zZXJ2ZXIuUHJvamVjdDtcbiAgICBpZiAoIXByb2plY3QucHJvamVjdFNlcnZpY2UpIHtcbiAgICAgIC8vIHRzTHNIb3N0IGlzIG5vdCBhIFByb2plY3RcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2xvZ2dlcn0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGlmIChsb2dnZXIuaGFzTGV2ZWwodHNzLnNlcnZlci5Mb2dMZXZlbC52ZXJib3NlKSkge1xuICAgICAgbG9nZ2VyLmluZm8obXNnKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFN1aXRhYmxlRGVmYXVsdE1vZHVsZShtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCB7XG4gIGxldCByZXN1bHQ6IENvbXBpbGVOZ01vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IHJlc3VsdFNpemUgPSAwO1xuICBmb3IgKGNvbnN0IG1vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGNvbnN0IG1vZHVsZVNpemUgPSBtb2R1bGUudHJhbnNpdGl2ZU1vZHVsZS5kaXJlY3RpdmVzLmxlbmd0aDtcbiAgICBpZiAobW9kdWxlU2l6ZSA+IHJlc3VsdFNpemUpIHtcbiAgICAgIHJlc3VsdCA9IG1vZHVsZTtcbiAgICAgIHJlc3VsdFNpemUgPSBtb2R1bGVTaXplO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzcGFuT2Yobm9kZTogdHMuTm9kZSk6IFNwYW4ge1xuICByZXR1cm4ge3N0YXJ0OiBub2RlLmdldFN0YXJ0KCksIGVuZDogbm9kZS5nZXRFbmQoKX07XG59XG5cbmZ1bmN0aW9uIHNwYW5BdChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTogU3Bhbnx1bmRlZmluZWQge1xuICBpZiAobGluZSAhPSBudWxsICYmIGNvbHVtbiAhPSBudWxsKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0cy5nZXRQb3NpdGlvbk9mTGluZUFuZENoYXJhY3Rlcihzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pO1xuICAgIGNvbnN0IGZpbmRDaGlsZCA9IGZ1bmN0aW9uIGZpbmRDaGlsZChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB8IHVuZGVmaW5lZCB7XG4gICAgICBpZiAobm9kZS5raW5kID4gdHMuU3ludGF4S2luZC5MYXN0VG9rZW4gJiYgbm9kZS5wb3MgPD0gcG9zaXRpb24gJiYgbm9kZS5lbmQgPiBwb3NpdGlvbikge1xuICAgICAgICBjb25zdCBiZXR0ZXJOb2RlID0gdHMuZm9yRWFjaENoaWxkKG5vZGUsIGZpbmRDaGlsZCk7XG4gICAgICAgIHJldHVybiBiZXR0ZXJOb2RlIHx8IG5vZGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZmluZENoaWxkKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge21lc3NhZ2U6IGNoYWluLm1lc3NhZ2UsIG5leHQ6IGNoYWluLm5leHQgPyBjb252ZXJ0Q2hhaW4oY2hhaW4ubmV4dCkgOiB1bmRlZmluZWR9O1xufVxuXG5mdW5jdGlvbiBlcnJvclRvRGlhZ25vc3RpY1dpdGhDaGFpbihlcnJvcjogRm9ybWF0dGVkRXJyb3IsIHNwYW46IFNwYW4pOiBEZWNsYXJhdGlvbkVycm9yIHtcbiAgcmV0dXJuIHttZXNzYWdlOiBlcnJvci5jaGFpbiA/IGNvbnZlcnRDaGFpbihlcnJvci5jaGFpbikgOiBlcnJvci5tZXNzYWdlLCBzcGFufTtcbn1cbiJdfQ==