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
        define("@angular/language-service/src/typescript_host", ["require", "exports", "tslib", "@angular/compiler", "@angular/core", "typescript", "@angular/language-service/src/common", "@angular/language-service/src/language_service", "@angular/language-service/src/reflector_host", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/core");
    var ts = require("typescript");
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
            this.reflectorHost = new reflector_host_1.ReflectorHost(function () { return _this.program; }, host);
            this.staticSymbolResolver = new compiler_1.StaticSymbolResolver(this.reflectorHost, this.staticSymbolCache, this.summaryResolver, function (e, filePath) { return _this.collectError(e, filePath); });
            this.resolver = this.createMetadataResolver();
        }
        /**
         * Creates a new metadata resolver. This is needed whenever the program
         * changes.
         */
        TypeScriptServiceHost.prototype.createMetadataResolver = function () {
            var _this = this;
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
            return new compiler_1.CompileMetadataResolver(config, htmlParser, moduleResolver, directiveResolver, pipeResolver, new compiler_1.JitSummaryResolver(), elementSchemaRegistry, directiveNormalizer, new core_1.ɵConsole(), this.staticSymbolCache, staticReflector, function (error, type) { return _this.collectError(error, type && type.filePath); });
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
            this.resolver = this.createMetadataResolver();
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
        Object.defineProperty(TypeScriptServiceHost.prototype, "reflector", {
            get: function () { return this.resolver.getReflector(); },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2akI7SUFDN2pCLHNDQUFxRjtJQUNyRiwrQkFBaUM7SUFFakMsK0RBQWdEO0lBQ2hELG1GQUF5RDtJQUN6RCwrRUFBK0M7SUFDL0MsbUVBQTJIO0lBQzNILDZEQUFzSztJQUN0Syw2REFBZ0U7SUFHaEU7O09BRUc7SUFDSCxTQUFnQixtQ0FBbUMsQ0FDL0MsSUFBNEIsRUFBRSxPQUEyQjtRQUMzRCxJQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxJQUFNLFFBQVEsR0FBRyx3Q0FBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBTEQsa0ZBS0M7SUFFRDs7Ozs7T0FLRztJQUNIO1FBQXFDLDJDQUFVO1FBQS9DOztRQUVBLENBQUM7UUFEQywrQkFBSyxHQUFMLGNBQTJCLE9BQU8sSUFBSSwwQkFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsc0JBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBcUMscUJBQVUsR0FFOUM7SUFGWSwwQ0FBZTtJQUk1Qjs7T0FFRztJQUNIO1FBQXlDLCtDQUFjO1FBQXZEOztRQUVBLENBQUM7UUFEQyxpQ0FBRyxHQUFILFVBQUksR0FBVyxJQUFxQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLDBCQUFDO0lBQUQsQ0FBQyxBQUZELENBQXlDLHlCQUFjLEdBRXREO0lBRlksa0RBQW1CO0lBSWhDOzs7Ozs7O09BT0c7SUFD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Q0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxVQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFRLEVBQUU7b0JBQ3RGLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNwRCxPQUFPLFVBQVUsSUFBSSxJQUFJLENBQUM7aUJBQzNCO1lBQ0gsQ0FBQyxDQUFDO1lBRUYsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBQyxDQUFDO2FBQ3JEO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsS0FBNEI7UUFDaEQsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FBQyxLQUFxQixFQUFFLElBQVU7UUFDbkUsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7SUFDbEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RTdW1tYXJ5UmVzb2x2ZXIsIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5LCBDb21waWxlTWV0YWRhdGFSZXNvbHZlciwgQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGEsIENvbXBpbGVQaXBlU3VtbWFyeSwgQ29tcGlsZXJDb25maWcsIERpcmVjdGl2ZU5vcm1hbGl6ZXIsIERpcmVjdGl2ZVJlc29sdmVyLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEZvcm1hdHRlZEVycm9yLCBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4sIEh0bWxQYXJzZXIsIEkxOE5IdG1sUGFyc2VyLCBKaXRTdW1tYXJ5UmVzb2x2ZXIsIExleGVyLCBOZ0FuYWx5emVkTW9kdWxlcywgTmdNb2R1bGVSZXNvbHZlciwgUGFyc2VUcmVlUmVzdWx0LCBQYXJzZXIsIFBpcGVSZXNvbHZlciwgUmVzb3VyY2VMb2FkZXIsIFN0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sLCBTdGF0aWNTeW1ib2xDYWNoZSwgU3RhdGljU3ltYm9sUmVzb2x2ZXIsIFRlbXBsYXRlUGFyc2VyLCBhbmFseXplTmdNb2R1bGVzLCBjcmVhdGVPZmZsaW5lQ29tcGlsZVVybFJlc29sdmVyLCBpc0Zvcm1hdHRlZEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NjaGVtYU1ldGFkYXRhLCBWaWV3RW5jYXBzdWxhdGlvbiwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBpc0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtjcmVhdGVMYW5ndWFnZVNlcnZpY2V9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZSc7XG5pbXBvcnQge1JlZmxlY3Rvckhvc3R9IGZyb20gJy4vcmVmbGVjdG9yX2hvc3QnO1xuaW1wb3J0IHtFeHRlcm5hbFRlbXBsYXRlLCBJbmxpbmVUZW1wbGF0ZSwgZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AsIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZX0gZnJvbSAnLi90ZW1wbGF0ZSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkVycm9yLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljS2luZCwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiwgTGFuZ3VhZ2VTZXJ2aWNlLCBMYW5ndWFnZVNlcnZpY2VIb3N0LCBTcGFuLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldERpcmVjdGl2ZUNsYXNzTGlrZX0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBDcmVhdGUgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhbmd1YWdlU2VydmljZUZyb21UeXBlc2NyaXB0KFxuICAgIGhvc3Q6IHRzLkxhbmd1YWdlU2VydmljZUhvc3QsIHNlcnZpY2U6IHRzLkxhbmd1YWdlU2VydmljZSk6IExhbmd1YWdlU2VydmljZSB7XG4gIGNvbnN0IG5nSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaG9zdCwgc2VydmljZSk7XG4gIGNvbnN0IG5nU2VydmVyID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKG5nSG9zdCk7XG4gIHJldHVybiBuZ1NlcnZlcjtcbn1cblxuLyoqXG4gKiBUaGUgbGFuZ3VhZ2Ugc2VydmljZSBuZXZlciBuZWVkcyB0aGUgbm9ybWFsaXplZCB2ZXJzaW9ucyBvZiB0aGUgbWV0YWRhdGEuIFRvIGF2b2lkIHBhcnNpbmdcbiAqIHRoZSBjb250ZW50IGFuZCByZXNvbHZpbmcgcmVmZXJlbmNlcywgcmV0dXJuIGFuIGVtcHR5IGZpbGUuIFRoaXMgYWxzbyBhbGxvd3Mgbm9ybWFsaXppbmdcbiAqIHRlbXBsYXRlIHRoYXQgYXJlIHN5bnRhdGljYWxseSBpbmNvcnJlY3Qgd2hpY2ggaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSBjb21wbGV0aW9ucyBpblxuICogc3ludGFjdGljYWxseSBpbmNvcnJlY3QgdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHVtbXlIdG1sUGFyc2VyIGV4dGVuZHMgSHRtbFBhcnNlciB7XG4gIHBhcnNlKCk6IFBhcnNlVHJlZVJlc3VsdCB7IHJldHVybiBuZXcgUGFyc2VUcmVlUmVzdWx0KFtdLCBbXSk7IH1cbn1cblxuLyoqXG4gKiBBdm9pZCBsb2FkaW5nIHJlc291cmNlcyBpbiB0aGUgbGFuZ3VhZ2Ugc2VydmNpZSBieSB1c2luZyBhIGR1bW15IGxvYWRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIER1bW15UmVzb3VyY2VMb2FkZXIgZXh0ZW5kcyBSZXNvdXJjZUxvYWRlciB7XG4gIGdldCh1cmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoJycpOyB9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBgTGFuZ3VhZ2VTZXJ2aWNlSG9zdGAgZm9yIGEgVHlwZVNjcmlwdCBwcm9qZWN0LlxuICpcbiAqIFRoZSBgVHlwZVNjcmlwdFNlcnZpY2VIb3N0YCBpbXBsZW1lbnRzIHRoZSBBbmd1bGFyIGBMYW5ndWFnZVNlcnZpY2VIb3N0YCB1c2luZ1xuICogdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZXMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFNlcnZpY2VIb3N0IGltcGxlbWVudHMgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3VtbWFyeVJlc29sdmVyOiBBb3RTdW1tYXJ5UmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVmbGVjdG9ySG9zdDogUmVmbGVjdG9ySG9zdDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0aWNTeW1ib2xSZXNvbHZlcjogU3RhdGljU3ltYm9sUmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVzb2x2ZXI6IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGljU3ltYm9sQ2FjaGUgPSBuZXcgU3RhdGljU3ltYm9sQ2FjaGUoKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVG9Db21wb25lbnQgPSBuZXcgTWFwPHN0cmluZywgU3RhdGljU3ltYm9sPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbGxlY3RlZEVycm9ycyA9IG5ldyBNYXA8c3RyaW5nLCBhbnlbXT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlVmVyc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIHByaXZhdGUgbGFzdFByb2dyYW06IHRzLlByb2dyYW18dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIHRlbXBsYXRlUmVmZXJlbmNlczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICAgIGZpbGVzOiBbXSxcbiAgICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gICAgbmdNb2R1bGVzOiBbXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBob3N0OiB0cy5MYW5ndWFnZVNlcnZpY2VIb3N0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSkge1xuICAgIHRoaXMuc3VtbWFyeVJlc29sdmVyID0gbmV3IEFvdFN1bW1hcnlSZXNvbHZlcihcbiAgICAgICAge1xuICAgICAgICAgIGxvYWRTdW1tYXJ5KGZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICAgICAgaXNTb3VyY2VGaWxlKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICAgICAgdG9TdW1tYXJ5RmlsZU5hbWUoc291cmNlRmlsZVBhdGg6IHN0cmluZykgeyByZXR1cm4gc291cmNlRmlsZVBhdGg7IH0sXG4gICAgICAgICAgZnJvbVN1bW1hcnlGaWxlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5ne3JldHVybiBmaWxlUGF0aDt9LFxuICAgICAgICB9LFxuICAgICAgICB0aGlzLnN0YXRpY1N5bWJvbENhY2hlKTtcbiAgICB0aGlzLnJlZmxlY3Rvckhvc3QgPSBuZXcgUmVmbGVjdG9ySG9zdCgoKSA9PiB0aGlzLnByb2dyYW0sIGhvc3QpO1xuICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIgPSBuZXcgU3RhdGljU3ltYm9sUmVzb2x2ZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdG9ySG9zdCwgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIsXG4gICAgICAgIChlLCBmaWxlUGF0aCkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZSwgZmlsZVBhdGgpKTtcbiAgICB0aGlzLnJlc29sdmVyID0gdGhpcy5jcmVhdGVNZXRhZGF0YVJlc29sdmVyKCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBtZXRhZGF0YSByZXNvbHZlci4gVGhpcyBpcyBuZWVkZWQgd2hlbmV2ZXIgdGhlIHByb2dyYW1cbiAgICogY2hhbmdlcy5cbiAgICovXG4gIHByaXZhdGUgY3JlYXRlTWV0YWRhdGFSZXNvbHZlcigpOiBDb21waWxlTWV0YWRhdGFSZXNvbHZlciB7XG4gICAgLy8gU3RhdGljUmVmbGVjdG9yIGtlZXBzIGl0cyBvd24gcHJpdmF0ZSBjYWNoZXMgdGhhdCBhcmUgbm90IGNsZWFyYWJsZS5cbiAgICAvLyBXZSBoYXZlIG5vIGNob2ljZSBidXQgdG8gY3JlYXRlIGEgbmV3IGluc3RhbmNlIHRvIGludmFsaWRhdGUgdGhlIGNhY2hlcy5cbiAgICAvLyBUT0RPOiBSZXZpc2l0IHRoaXMgd2hlbiBsYW5ndWFnZSBzZXJ2aWNlIGdldHMgcmV3cml0dGVuIGZvciBJdnkuXG4gICAgY29uc3Qgc3RhdGljUmVmbGVjdG9yID0gbmV3IFN0YXRpY1JlZmxlY3RvcihcbiAgICAgICAgdGhpcy5zdW1tYXJ5UmVzb2x2ZXIsIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIsXG4gICAgICAgIFtdLCAgLy8ga25vd25NZXRhZGF0YUNsYXNzZXNcbiAgICAgICAgW10sICAvLyBrbm93bk1ldGFkYXRhRnVuY3Rpb25zXG4gICAgICAgIChlLCBmaWxlUGF0aCkgPT4gdGhpcy5jb2xsZWN0RXJyb3IoZSwgZmlsZVBhdGgpKTtcbiAgICAvLyBCZWNhdXNlIHN0YXRpYyByZWZsZWN0b3IgYWJvdmUgaXMgY2hhbmdlZCwgd2UgbmVlZCB0byBjcmVhdGUgYSBuZXdcbiAgICAvLyByZXNvbHZlci5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBOZ01vZHVsZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgZGlyZWN0aXZlUmVzb2x2ZXIgPSBuZXcgRGlyZWN0aXZlUmVzb2x2ZXIoc3RhdGljUmVmbGVjdG9yKTtcbiAgICBjb25zdCBwaXBlUmVzb2x2ZXIgPSBuZXcgUGlwZVJlc29sdmVyKHN0YXRpY1JlZmxlY3Rvcik7XG4gICAgY29uc3QgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IHJlc291cmNlTG9hZGVyID0gbmV3IER1bW15UmVzb3VyY2VMb2FkZXIoKTtcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBjb25zdCBodG1sUGFyc2VyID0gbmV3IER1bW15SHRtbFBhcnNlcigpO1xuICAgIC8vIFRoaXMgdHJhY2tzIHRoZSBDb21waWxlQ29uZmlnIGluIGNvZGVnZW4udHMuIEN1cnJlbnRseSB0aGVzZSBvcHRpb25zXG4gICAgLy8gYXJlIGhhcmQtY29kZWQuXG4gICAgY29uc3QgY29uZmlnID0gbmV3IENvbXBpbGVyQ29uZmlnKHtcbiAgICAgIGRlZmF1bHRFbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgIHVzZUppdDogZmFsc2UsXG4gICAgfSk7XG4gICAgY29uc3QgZGlyZWN0aXZlTm9ybWFsaXplciA9XG4gICAgICAgIG5ldyBEaXJlY3RpdmVOb3JtYWxpemVyKHJlc291cmNlTG9hZGVyLCB1cmxSZXNvbHZlciwgaHRtbFBhcnNlciwgY29uZmlnKTtcbiAgICByZXR1cm4gbmV3IENvbXBpbGVNZXRhZGF0YVJlc29sdmVyKFxuICAgICAgICBjb25maWcsIGh0bWxQYXJzZXIsIG1vZHVsZVJlc29sdmVyLCBkaXJlY3RpdmVSZXNvbHZlciwgcGlwZVJlc29sdmVyLFxuICAgICAgICBuZXcgSml0U3VtbWFyeVJlc29sdmVyKCksIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgZGlyZWN0aXZlTm9ybWFsaXplciwgbmV3IENvbnNvbGUoKSxcbiAgICAgICAgdGhpcy5zdGF0aWNTeW1ib2xDYWNoZSwgc3RhdGljUmVmbGVjdG9yLFxuICAgICAgICAoZXJyb3IsIHR5cGUpID0+IHRoaXMuY29sbGVjdEVycm9yKGVycm9yLCB0eXBlICYmIHR5cGUuZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlUmVmZXJlbmNlcygpOiBzdHJpbmdbXSB7IHJldHVybiBbLi4udGhpcy50ZW1wbGF0ZVJlZmVyZW5jZXNdOyB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBwcm9ncmFtIGhhcyBjaGFuZ2VkIGFuZCByZXR1cm5zIGFsbCBhbmFseXplZCBtb2R1bGVzLlxuICAgKiBJZiBwcm9ncmFtIGhhcyBjaGFuZ2VkLCBpbnZhbGlkYXRlIGFsbCBjYWNoZXMgYW5kIHVwZGF0ZSBmaWxlVG9Db21wb25lbnRcbiAgICogYW5kIHRlbXBsYXRlUmVmZXJlbmNlcy5cbiAgICogSW4gYWRkaXRpb24gdG8gcmV0dXJuaW5nIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgdGhpcyBtZXRob2QgcGxheXMgdGhlXG4gICAqIHNhbWUgcm9sZSBhcyAnc3luY2hyb25pemVIb3N0RGF0YScgaW4gdHNzZXJ2ZXIuXG4gICAqL1xuICBnZXRBbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICh0aGlzLnVwVG9EYXRlKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmFuYWx5emVkTW9kdWxlcztcbiAgICB9XG5cbiAgICAvLyBJbnZhbGlkYXRlIGNhY2hlc1xuICAgIHRoaXMudGVtcGxhdGVSZWZlcmVuY2VzID0gW107XG4gICAgdGhpcy5maWxlVG9Db21wb25lbnQuY2xlYXIoKTtcbiAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5jbGVhcigpO1xuICAgIHRoaXMucmVzb2x2ZXIgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhUmVzb2x2ZXIoKTtcblxuICAgIGNvbnN0IGFuYWx5emVIb3N0ID0ge2lzU291cmNlRmlsZShmaWxlUGF0aDogc3RyaW5nKSB7IHJldHVybiB0cnVlOyB9fTtcbiAgICBjb25zdCBwcm9ncmFtRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpO1xuICAgIHRoaXMuYW5hbHl6ZWRNb2R1bGVzID1cbiAgICAgICAgYW5hbHl6ZU5nTW9kdWxlcyhwcm9ncmFtRmlsZXMsIGFuYWx5emVIb3N0LCB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLCB0aGlzLnJlc29sdmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0ZW1wbGF0ZSByZWZlcmVuY2VzIGFuZCBmaWxlVG9Db21wb25lbnRcbiAgICBjb25zdCB1cmxSZXNvbHZlciA9IGNyZWF0ZU9mZmxpbmVDb21waWxlVXJsUmVzb2x2ZXIoKTtcbiAgICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIHRoaXMuYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlcykge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IHttZXRhZGF0YX0gPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUucmVmZXJlbmNlKSAhO1xuICAgICAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQgJiYgbWV0YWRhdGEudGVtcGxhdGUgJiYgbWV0YWRhdGEudGVtcGxhdGUudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZU5hbWUgPSB1cmxSZXNvbHZlci5yZXNvbHZlKFxuICAgICAgICAgICAgICB0aGlzLnJlZmxlY3Rvci5jb21wb25lbnRNb2R1bGVVcmwoZGlyZWN0aXZlLnJlZmVyZW5jZSksXG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRlbXBsYXRlLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NvbXBvbmVudC5zZXQodGVtcGxhdGVOYW1lLCBkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlUmVmZXJlbmNlcy5wdXNoKHRlbXBsYXRlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXplZE1vZHVsZXM7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGVtcGxhdGVzIGluIHRoZSBzcGVjaWZpZWQgYGZpbGVgLlxuICAgKiBAcGFyYW0gZmlsZU5hbWUgVFMgb3IgSFRNTCBmaWxlXG4gICAqL1xuICBnZXRUZW1wbGF0ZXMoZmlsZU5hbWU6IHN0cmluZyk6IFRlbXBsYXRlU291cmNlW10ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFRlbXBsYXRlU291cmNlW10gPSBbXTtcbiAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAvLyBGaW5kIGV2ZXJ5IHRlbXBsYXRlIHN0cmluZyBpbiB0aGUgZmlsZVxuICAgICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmdldEludGVybmFsVGVtcGxhdGUoY2hpbGQpO1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRzLmZvckVhY2hDaGlsZChjaGlsZCwgdmlzaXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHRoaXMuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZSk7XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG1ldGFkYXRhIGFib3V0IGFsbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gdGhlIGZpbGUgdGhhdCBhcmUgQW5ndWxhclxuICAgKiBkaXJlY3RpdmVzLiBQb3RlbnRpYWwgbWF0Y2hlcyBhcmUgYEBOZ01vZHVsZWAsIGBAQ29tcG9uZW50YCwgYEBEaXJlY3RpdmVgLFxuICAgKiBgQFBpcGVzYCwgZXRjLiBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBmaWxlXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbnMoZmlsZU5hbWU6IHN0cmluZyk6IERlY2xhcmF0aW9uW10ge1xuICAgIGlmICghZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzOiBEZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgdmlzaXQgPSAoY2hpbGQ6IHRzLk5vZGUpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGdldERpcmVjdGl2ZUNsYXNzTGlrZShjaGlsZCk7XG4gICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtkZWNvcmF0b3JJZCwgY2xhc3NEZWNsfSA9IGNhbmRpZGF0ZTtcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25TcGFuID0gc3Bhbk9mKGRlY29yYXRvcklkKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NEZWNsLm5hbWUgIS50ZXh0O1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdG9yLmdldFN0YXRpY1N5bWJvbChzb3VyY2VGaWxlLmZpbGVOYW1lLCBjbGFzc05hbWUpO1xuICAgICAgICAvLyBBc2sgdGhlIHJlc29sdmVyIHRvIGNoZWNrIGlmIGNhbmRpZGF0ZSBpcyBhY3R1YWxseSBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIuaXNEaXJlY3RpdmUoY2xhc3NTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnJlc29sdmVyLmdldE5vbk5vcm1hbGl6ZWREaXJlY3RpdmVNZXRhZGF0YShjbGFzc1N5bWJvbCk7XG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGNsYXNzU3ltYm9sLFxuICAgICAgICAgIGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICBtZXRhZGF0YTogZGF0YS5tZXRhZGF0YSxcbiAgICAgICAgICBlcnJvcnM6IHRoaXMuZ2V0Q29sbGVjdGVkRXJyb3JzKGRlY2xhcmF0aW9uU3Bhbiwgc291cmNlRmlsZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuZm9yRWFjaENoaWxkKHZpc2l0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdCk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tVFMgc291cmNlIGZpbGUgcmVxdWVzdGVkOiAke2ZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IHByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHNMUy5nZXRQcm9ncmFtKCk7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAvLyBQcm9ncmFtIGlzIHZlcnkgdmVyeSB1bmxpa2VseSB0byBiZSB1bmRlZmluZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHByb2dyYW0gaW4gbGFuZ3VhZ2Ugc2VydmljZSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICBnZXQgcmVmbGVjdG9yKCk6IFN0YXRpY1JlZmxlY3RvciB7IHJldHVybiB0aGlzLnJlc29sdmVyLmdldFJlZmxlY3RvcigpIGFzIFN0YXRpY1JlZmxlY3RvcjsgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvZ3JhbSBoYXMgY2hhbmdlZCwgYW5kIGludmFsaWRhdGUgY2FjaGVzIGlmIGl0IGhhcy5cbiAgICogUmV0dXJucyB0cnVlIGlmIG1vZHVsZXMgYXJlIHVwLXRvLWRhdGUsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogVGhpcyBzaG91bGQgb25seSBiZSBjYWxsZWQgYnkgZ2V0QW5hbHl6ZWRNb2R1bGVzKCkuXG4gICAqL1xuICBwcml2YXRlIHVwVG9EYXRlKCkge1xuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW07XG4gICAgaWYgKHRoaXMubGFzdFByb2dyYW0gPT09IHByb2dyYW0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgZmlsZSB0aGF0IGhhdmUgY2hhbmdlZCBpbiB0aGUgc3RhdGljIHN5bWJvbCByZXNvbHZlclxuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBmaWxlTmFtZSA9IHNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICBzZWVuLmFkZChmaWxlTmFtZSk7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gdGhpcy5ob3N0LmdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWUpO1xuICAgICAgY29uc3QgbGFzdFZlcnNpb24gPSB0aGlzLmZpbGVWZXJzaW9ucy5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKHZlcnNpb24gIT09IGxhc3RWZXJzaW9uKSB7XG4gICAgICAgIHRoaXMuZmlsZVZlcnNpb25zLnNldChmaWxlTmFtZSwgdmVyc2lvbik7XG4gICAgICAgIHRoaXMuc3RhdGljU3ltYm9sUmVzb2x2ZXIuaW52YWxpZGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBmaWxlIHZlcnNpb25zIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgZmlsZSBhbmQgaW52YWxpZGF0ZSB0aGVtLlxuICAgIGNvbnN0IG1pc3NpbmcgPSBBcnJheS5mcm9tKHRoaXMuZmlsZVZlcnNpb25zLmtleXMoKSkuZmlsdGVyKGYgPT4gIXNlZW4uaGFzKGYpKTtcbiAgICBtaXNzaW5nLmZvckVhY2goZiA9PiB7XG4gICAgICB0aGlzLmZpbGVWZXJzaW9ucy5kZWxldGUoZik7XG4gICAgICB0aGlzLnN0YXRpY1N5bWJvbFJlc29sdmVyLmludmFsaWRhdGVGaWxlKGYpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sYXN0UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBUZW1wbGF0ZVNvdXJjZSBpZiBgbm9kZWAgaXMgYSB0ZW1wbGF0ZSBub2RlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogQENvbXBvbmVudCh7XG4gICAqICAgdGVtcGxhdGU6ICc8ZGl2PjwvZGl2PicgPC0tIHRlbXBsYXRlIG5vZGVcbiAgICogfSlcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHt9XG4gICAqICAgICAgICAgICBeLS0tLSBjbGFzcyBkZWNsYXJhdGlvbiBub2RlXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIFBvdGVudGlhbCB0ZW1wbGF0ZSBub2RlXG4gICAqL1xuICBwcml2YXRlIGdldEludGVybmFsVGVtcGxhdGUobm9kZTogdHMuTm9kZSk6IFRlbXBsYXRlU291cmNlfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKG5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRtcGxBc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKG5vZGUpO1xuICAgIGlmICghdG1wbEFzZ24gfHwgdG1wbEFzZ24ubmFtZS5nZXRUZXh0KCkgIT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2xhc3NEZWNsID0gZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AodG1wbEFzZ24pO1xuICAgIGlmICghY2xhc3NEZWNsIHx8ICFjbGFzc0RlY2wubmFtZSkgeyAgLy8gRG9lcyBub3QgaGFuZGxlIGFub255bW91cyBjbGFzc1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWxlTmFtZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0b3IuZ2V0U3RhdGljU3ltYm9sKGZpbGVOYW1lLCBjbGFzc0RlY2wubmFtZS50ZXh0KTtcbiAgICByZXR1cm4gbmV3IElubGluZVRlbXBsYXRlKG5vZGUsIGNsYXNzRGVjbCwgY2xhc3NTeW1ib2wsIHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUgZm9yIGBmaWxlTmFtZWAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBIVE1MIGZpbGVcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkIHtcbiAgICAvLyBGaXJzdCBnZXQgdGhlIHRleHQgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IHNuYXBzaG90ID0gdGhpcy5ob3N0LmdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lKTtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LmdldFRleHQoMCwgc25hcHNob3QuZ2V0TGVuZ3RoKCkpO1xuICAgIC8vIE5leHQgZmluZCB0aGUgY29tcG9uZW50IGNsYXNzIHN5bWJvbFxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maWxlVG9Db21wb25lbnQuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoZW4gdXNlIHRoZSBjbGFzcyBzeW1ib2wgdG8gZmluZCB0aGUgYWN0dWFsIHRzLkNsYXNzRGVjbGFyYXRpb24gbm9kZVxuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoY2xhc3NTeW1ib2wuZmlsZVBhdGgpO1xuICAgIGlmICghc291cmNlRmlsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUT0RPOiBUaGlzIG9ubHkgY29uc2lkZXJzIHRvcC1sZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZS5cbiAgICAvLyBUaGlzIHdvdWxkIG5vdCBmaW5kIGEgY2xhc3MgZGVjbGFyYXRpb24gaW4gYSBuYW1lc3BhY2UsIGZvciBleGFtcGxlLlxuICAgIGNvbnN0IGNsYXNzRGVjbCA9IHNvdXJjZUZpbGUuZm9yRWFjaENoaWxkKChjaGlsZCkgPT4ge1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjaGlsZCkgJiYgY2hpbGQubmFtZSAmJiBjaGlsZC5uYW1lLnRleHQgPT09IGNsYXNzU3ltYm9sLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghY2xhc3NEZWNsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxUZW1wbGF0ZShzb3VyY2UsIGZpbGVOYW1lLCBjbGFzc0RlY2wsIGNsYXNzU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29sbGVjdEVycm9yKGVycm9yOiBhbnksIGZpbGVQYXRoPzogc3RyaW5nKSB7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICBsZXQgZXJyb3JzID0gdGhpcy5jb2xsZWN0ZWRFcnJvcnMuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGlmICghZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLmNvbGxlY3RlZEVycm9ycy5zZXQoZmlsZVBhdGgsIGVycm9ycyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaChlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb2xsZWN0ZWRFcnJvcnMoZGVmYXVsdFNwYW46IFNwYW4sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBEZWNsYXJhdGlvbkVycm9yW10ge1xuICAgIGNvbnN0IGVycm9ycyA9IHRoaXMuY29sbGVjdGVkRXJyb3JzLmdldChzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBpZiAoIWVycm9ycykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBUT0RPOiBBZGQgYmV0dGVyIHR5cGluZ3MgZm9yIHRoZSBlcnJvcnNcbiAgICByZXR1cm4gZXJyb3JzLm1hcCgoZTogYW55KSA9PiB7XG4gICAgICBjb25zdCBsaW5lID0gZS5saW5lIHx8IChlLnBvc2l0aW9uICYmIGUucG9zaXRpb24ubGluZSk7XG4gICAgICBjb25zdCBjb2x1bW4gPSBlLmNvbHVtbiB8fCAoZS5wb3NpdGlvbiAmJiBlLnBvc2l0aW9uLmNvbHVtbik7XG4gICAgICBjb25zdCBzcGFuID0gc3BhbkF0KHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbikgfHwgZGVmYXVsdFNwYW47XG4gICAgICBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlKSkge1xuICAgICAgICByZXR1cm4gZXJyb3JUb0RpYWdub3N0aWNXaXRoQ2hhaW4oZSwgc3Bhbik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge21lc3NhZ2U6IGUubWVzc2FnZSwgc3Bhbn07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBwYXJzZWQgdGVtcGxhdGUgZm9yIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgc3BlY2lmaWVkIGBwb3NpdGlvbmAuXG4gICAqIEBwYXJhbSBmaWxlTmFtZSBUUyBvciBIVE1MIGZpbGVcbiAgICogQHBhcmFtIHBvc2l0aW9uIFBvc2l0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpbiB0aGUgVFMgZmlsZSwgb3RoZXJ3aXNlIGlnbm9yZWQuXG4gICAqL1xuICBnZXRUZW1wbGF0ZUFzdEF0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IEFzdFJlc3VsdHx1bmRlZmluZWQge1xuICAgIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2V8dW5kZWZpbmVkO1xuICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIEZpbmQgdGhlIG5vZGUgdGhhdCBtb3N0IGNsb3NlbHkgbWF0Y2hlcyB0aGUgcG9zaXRpb25cbiAgICAgIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNvdXJjZUZpbGUsIHBvc2l0aW9uKTtcbiAgICAgIGlmICghbm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZ2V0SW50ZXJuYWxUZW1wbGF0ZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldEV4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWUpO1xuICAgIH1cbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGFzdFJlc3VsdCA9IHRoaXMuZ2V0VGVtcGxhdGVBc3QodGVtcGxhdGUpO1xuICAgIGlmICghaXNBc3RSZXN1bHQoYXN0UmVzdWx0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gYXN0UmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIE5nTW9kdWxlIHdoaWNoIHRoZSBkaXJlY3RpdmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBgY2xhc3NTeW1ib2xgXG4gICAqIGJlbG9uZ3MgdG8sIHRoZW4gcmV0dXJuIGl0cyBzY2hlbWEgYW5kIHRyYW5zaXRpdmUgZGlyZWN0aXZlcyBhbmQgcGlwZXMuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBBbmd1bGFyIFN5bWJvbCB0aGF0IGRlZmluZXMgYSBkaXJlY3RpdmVcbiAgICovXG4gIHByaXZhdGUgZ2V0TW9kdWxlTWV0YWRhdGFGb3JEaXJlY3RpdmUoY2xhc3NTeW1ib2w6IFN0YXRpY1N5bWJvbCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IFtdIGFzIENvbXBpbGVEaXJlY3RpdmVTdW1tYXJ5W10sXG4gICAgICBwaXBlczogW10gYXMgQ29tcGlsZVBpcGVTdW1tYXJ5W10sXG4gICAgICBzY2hlbWFzOiBbXSBhcyBTY2hlbWFNZXRhZGF0YVtdLFxuICAgIH07XG4gICAgLy8gRmlyc3QgZmluZCB3aGljaCBOZ01vZHVsZSB0aGUgZGlyZWN0aXZlIGJlbG9uZ3MgdG8uXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChjbGFzc1N5bWJvbCkgfHxcbiAgICAgICAgZmluZFN1aXRhYmxlRGVmYXVsdE1vZHVsZSh0aGlzLmFuYWx5emVkTW9kdWxlcyk7XG4gICAgaWYgKCFuZ01vZHVsZSkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLy8gVGhlbiBnYXRoZXIgYWxsIHRyYW5zaXRpdmUgZGlyZWN0aXZlcyBhbmQgcGlwZXMuXG4gICAgY29uc3Qge2RpcmVjdGl2ZXMsIHBpcGVzfSA9IG5nTW9kdWxlLnRyYW5zaXRpdmVNb2R1bGU7XG4gICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGRpcmVjdGl2ZS5yZWZlcmVuY2UpO1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgcmVzdWx0LmRpcmVjdGl2ZXMucHVzaChkYXRhLm1ldGFkYXRhLnRvU3VtbWFyeSgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwaXBlIG9mIHBpcGVzKSB7XG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0T3JMb2FkUGlwZU1ldGFkYXRhKHBpcGUucmVmZXJlbmNlKTtcbiAgICAgIHJlc3VsdC5waXBlcy5wdXNoKG1ldGFkYXRhLnRvU3VtbWFyeSgpKTtcbiAgICB9XG4gICAgcmVzdWx0LnNjaGVtYXMucHVzaCguLi5uZ01vZHVsZS5zY2hlbWFzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBgdGVtcGxhdGVgIGFuZCByZXR1cm4gaXRzIEFTVCBpZiB0aGVyZSdzIG5vIGVycm9yLiBPdGhlcndpc2VcbiAgICogcmV0dXJuIGEgRGlhZ25vc3RpYyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgdGVtcGxhdGUgdG8gYmUgcGFyc2VkXG4gICAqL1xuICBnZXRUZW1wbGF0ZUFzdCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UpOiBBc3RSZXN1bHR8RGlhZ25vc3RpYyB7XG4gICAgY29uc3Qge3R5cGU6IGNsYXNzU3ltYm9sLCBmaWxlTmFtZX0gPSB0ZW1wbGF0ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMucmVzb2x2ZXIuZ2V0Tm9uTm9ybWFsaXplZERpcmVjdGl2ZU1ldGFkYXRhKGNsYXNzU3ltYm9sKTtcbiAgICAgIGlmICghZGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtpbmQ6IERpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2U6IGBObyBtZXRhZGF0YSBmb3VuZCBmb3IgJyR7Y2xhc3NTeW1ib2wubmFtZX0nIGluICR7ZmlsZU5hbWV9LmAsXG4gICAgICAgICAgc3BhbjogdGVtcGxhdGUuc3BhbixcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGh0bWxQYXJzZXIgPSBuZXcgSTE4Tkh0bWxQYXJzZXIobmV3IEh0bWxQYXJzZXIoKSk7XG4gICAgICBjb25zdCBleHByZXNzaW9uUGFyc2VyID0gbmV3IFBhcnNlcihuZXcgTGV4ZXIoKSk7XG4gICAgICBjb25zdCBwYXJzZXIgPSBuZXcgVGVtcGxhdGVQYXJzZXIoXG4gICAgICAgICAgbmV3IENvbXBpbGVyQ29uZmlnKCksIHRoaXMucmVmbGVjdG9yLCBleHByZXNzaW9uUGFyc2VyLCBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCksXG4gICAgICAgICAgaHRtbFBhcnNlcixcbiAgICAgICAgICBudWxsICEsICAvLyBjb25zb2xlXG4gICAgICAgICAgW10gICAgICAgLy8gdHJhbmZvcm1zXG4gICAgICAgICAgKTtcbiAgICAgIGNvbnN0IGh0bWxSZXN1bHQgPSBodG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLnNvdXJjZSwgZmlsZU5hbWUsIHtcbiAgICAgICAgdG9rZW5pemVFeHBhbnNpb25Gb3JtczogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgY29uc3Qge2RpcmVjdGl2ZXMsIHBpcGVzLCBzY2hlbWFzfSA9IHRoaXMuZ2V0TW9kdWxlTWV0YWRhdGFGb3JEaXJlY3RpdmUoY2xhc3NTeW1ib2wpO1xuICAgICAgY29uc3QgcGFyc2VSZXN1bHQgPVxuICAgICAgICAgIHBhcnNlci50cnlQYXJzZUh0bWwoaHRtbFJlc3VsdCwgZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHNjaGVtYXMpO1xuICAgICAgaWYgKCFwYXJzZVJlc3VsdC50ZW1wbGF0ZUFzdCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtpbmQ6IERpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2U6IGBGYWlsZWQgdG8gcGFyc2UgdGVtcGxhdGUgZm9yICcke2NsYXNzU3ltYm9sLm5hbWV9JyBpbiAke2ZpbGVOYW1lfWAsXG4gICAgICAgICAgc3BhbjogdGVtcGxhdGUuc3BhbixcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGh0bWxBc3Q6IGh0bWxSZXN1bHQucm9vdE5vZGVzLFxuICAgICAgICB0ZW1wbGF0ZUFzdDogcGFyc2VSZXN1bHQudGVtcGxhdGVBc3QsXG4gICAgICAgIGRpcmVjdGl2ZTogZGF0YS5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsXG4gICAgICAgIHBhcnNlRXJyb3JzOiBwYXJzZVJlc3VsdC5lcnJvcnMsIGV4cHJlc3Npb25QYXJzZXIsIHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBEaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgbWVzc2FnZTogZS5tZXNzYWdlLFxuICAgICAgICBzcGFuOlxuICAgICAgICAgICAgZS5maWxlTmFtZSA9PT0gZmlsZU5hbWUgJiYgdGVtcGxhdGUucXVlcnkuZ2V0U3BhbkF0KGUubGluZSwgZS5jb2x1bW4pIHx8IHRlbXBsYXRlLnNwYW4sXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3VpdGFibGVEZWZhdWx0TW9kdWxlKG1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgbGV0IHJlc3VsdDogQ29tcGlsZU5nTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgcmVzdWx0U2l6ZSA9IDA7XG4gIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMubmdNb2R1bGVzKSB7XG4gICAgY29uc3QgbW9kdWxlU2l6ZSA9IG1vZHVsZS50cmFuc2l0aXZlTW9kdWxlLmRpcmVjdGl2ZXMubGVuZ3RoO1xuICAgIGlmIChtb2R1bGVTaXplID4gcmVzdWx0U2l6ZSkge1xuICAgICAgcmVzdWx0ID0gbW9kdWxlO1xuICAgICAgcmVzdWx0U2l6ZSA9IG1vZHVsZVNpemU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNwYW5PZihub2RlOiB0cy5Ob2RlKTogU3BhbiB7XG4gIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbn1cblxuZnVuY3Rpb24gc3BhbkF0KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gIGlmIChsaW5lICE9IG51bGwgJiYgY29sdW1uICE9IG51bGwpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRzLmdldFBvc2l0aW9uT2ZMaW5lQW5kQ2hhcmFjdGVyKHNvdXJjZUZpbGUsIGxpbmUsIGNvbHVtbik7XG4gICAgY29uc3QgZmluZENoaWxkID0gZnVuY3Rpb24gZmluZENoaWxkKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICAgIGlmIChub2RlLmtpbmQgPiB0cy5TeW50YXhLaW5kLkxhc3RUb2tlbiAmJiBub2RlLnBvcyA8PSBwb3NpdGlvbiAmJiBub2RlLmVuZCA+IHBvc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IGJldHRlck5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBmaW5kQ2hpbGQpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICByZXR1cm4ge3N0YXJ0OiBub2RlLmdldFN0YXJ0KCksIGVuZDogbm9kZS5nZXRFbmQoKX07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRDaGFpbihjaGFpbjogRm9ybWF0dGVkTWVzc2FnZUNoYWluKTogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7bWVzc2FnZTogY2hhaW4ubWVzc2FnZSwgbmV4dDogY2hhaW4ubmV4dCA/IGNvbnZlcnRDaGFpbihjaGFpbi5uZXh0KSA6IHVuZGVmaW5lZH07XG59XG5cbmZ1bmN0aW9uIGVycm9yVG9EaWFnbm9zdGljV2l0aENoYWluKGVycm9yOiBGb3JtYXR0ZWRFcnJvciwgc3BhbjogU3Bhbik6IERlY2xhcmF0aW9uRXJyb3Ige1xuICByZXR1cm4ge21lc3NhZ2U6IGVycm9yLmNoYWluID8gY29udmVydENoYWluKGVycm9yLmNoYWluKSA6IGVycm9yLm1lc3NhZ2UsIHNwYW59O1xufVxuIl19