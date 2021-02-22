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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/ts_utils", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LanguageService = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    var ts = require("typescript/lib/tsserverlibrary");
    var adapters_1 = require("@angular/language-service/ivy/adapters");
    var compiler_factory_1 = require("@angular/language-service/ivy/compiler_factory");
    var completions_1 = require("@angular/language-service/ivy/completions");
    var definitions_1 = require("@angular/language-service/ivy/definitions");
    var quick_info_1 = require("@angular/language-service/ivy/quick_info");
    var references_1 = require("@angular/language-service/ivy/references");
    var template_target_1 = require("@angular/language-service/ivy/template_target");
    var ts_utils_1 = require("@angular/language-service/ivy/ts_utils");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var LanguageService = /** @class */ (function () {
        function LanguageService(project, tsLS) {
            this.project = project;
            this.tsLS = tsLS;
            this.parseConfigHost = new adapters_1.LSParseConfigHost(project.projectService.host);
            this.options = parseNgCompilerOptions(project, this.parseConfigHost);
            logCompilerOptions(project, this.options);
            this.strategy = createTypeCheckingProgramStrategy(project);
            this.adapter = new adapters_1.LanguageServiceAdapter(project);
            this.compilerFactory = new compiler_factory_1.CompilerFactory(this.adapter, this.strategy, this.options);
            this.watchConfigFile(project);
        }
        LanguageService.prototype.getCompilerOptions = function () {
            return this.options;
        };
        LanguageService.prototype.getSemanticDiagnostics = function (fileName) {
            var e_1, _a;
            var compiler = this.compilerFactory.getOrCreate();
            var ttc = compiler.getTemplateTypeChecker();
            var diagnostics = [];
            if (utils_1.isTypeScriptFile(fileName)) {
                var program = compiler.getNextProgram();
                var sourceFile = program.getSourceFile(fileName);
                if (sourceFile) {
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(compiler.getDiagnosticsForFile(sourceFile, api_1.OptimizeFor.SingleFile)));
                }
            }
            else {
                var components = compiler.getComponentsWithTemplateFile(fileName);
                try {
                    for (var components_1 = tslib_1.__values(components), components_1_1 = components_1.next(); !components_1_1.done; components_1_1 = components_1.next()) {
                        var component = components_1_1.value;
                        if (ts.isClassDeclaration(component)) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spread(ttc.getDiagnosticsForComponent(component)));
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (components_1_1 && !components_1_1.done && (_a = components_1.return)) _a.call(components_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            this.compilerFactory.registerLastKnownProgram();
            return diagnostics;
        };
        LanguageService.prototype.getDefinitionAndBoundSpan = function (fileName, position) {
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isInAngularContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
                return new definitions_1.DefinitionBuilder(_this.tsLS, compiler)
                    .getDefinitionAndBoundSpan(fileName, position);
            });
        };
        LanguageService.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isTemplateContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
                return new definitions_1.DefinitionBuilder(_this.tsLS, compiler)
                    .getTypeDefinitionsAtPosition(fileName, position);
            });
        };
        LanguageService.prototype.getQuickInfoAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreate();
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, compiler);
            if (templateInfo === undefined) {
                return undefined;
            }
            var positionDetails = template_target_1.getTargetAtPosition(templateInfo.template, position);
            if (positionDetails === null) {
                return undefined;
            }
            // Because we can only show 1 quick info, just use the bound attribute if the target is a two
            // way binding. We may consider concatenating additional display parts from the other target
            // nodes or representing the two way binding in some other manner in the future.
            var node = positionDetails.context.kind === template_target_1.TargetNodeKind.TwoWayBindingContext ?
                positionDetails.context.nodes[0] :
                positionDetails.context.node;
            var results = new quick_info_1.QuickInfoBuilder(this.tsLS, compiler, templateInfo.component, node).get();
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getReferencesAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreate();
            var results = new references_1.ReferencesAndRenameBuilder(this.strategy, this.tsLS, compiler)
                .getReferencesAtPosition(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getRenameInfo = function (fileName, position) {
            var _a, _b, _c;
            var compiler = this.compilerFactory.getOrCreate();
            var renameInfo = new references_1.ReferencesAndRenameBuilder(this.strategy, this.tsLS, compiler)
                .getRenameInfo(file_system_1.absoluteFrom(fileName), position);
            if (!renameInfo.canRename) {
                return renameInfo;
            }
            var quickInfo = (_a = this.getQuickInfoAtPosition(fileName, position)) !== null && _a !== void 0 ? _a : this.tsLS.getQuickInfoAtPosition(fileName, position);
            var kind = (_b = quickInfo === null || quickInfo === void 0 ? void 0 : quickInfo.kind) !== null && _b !== void 0 ? _b : ts.ScriptElementKind.unknown;
            var kindModifiers = (_c = quickInfo === null || quickInfo === void 0 ? void 0 : quickInfo.kindModifiers) !== null && _c !== void 0 ? _c : ts.ScriptElementKind.unknown;
            return tslib_1.__assign(tslib_1.__assign({}, renameInfo), { kind: kind, kindModifiers: kindModifiers });
        };
        LanguageService.prototype.findRenameLocations = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreate();
            var results = new references_1.ReferencesAndRenameBuilder(this.strategy, this.tsLS, compiler)
                .findRenameLocations(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getCompletionBuilder = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreate();
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, compiler);
            if (templateInfo === undefined) {
                return null;
            }
            var positionDetails = template_target_1.getTargetAtPosition(templateInfo.template, position);
            if (positionDetails === null) {
                return null;
            }
            // For two-way bindings, we actually only need to be concerned with the bound attribute because
            // the bindings in the template are written with the attribute name, not the event name.
            var node = positionDetails.context.kind === template_target_1.TargetNodeKind.TwoWayBindingContext ?
                positionDetails.context.nodes[0] :
                positionDetails.context.node;
            return new completions_1.CompletionBuilder(this.tsLS, compiler, templateInfo.component, node, nodeContextFromTarget(positionDetails.context), positionDetails.parent, positionDetails.template);
        };
        LanguageService.prototype.getCompletionsAtPosition = function (fileName, position, options) {
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isTemplateContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
                var builder = _this.getCompletionBuilder(fileName, position);
                if (builder === null) {
                    return undefined;
                }
                return builder.getCompletionsAtPosition(options);
            });
        };
        LanguageService.prototype.getCompletionEntryDetails = function (fileName, position, entryName, formatOptions, preferences) {
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isTemplateContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
                var builder = _this.getCompletionBuilder(fileName, position);
                if (builder === null) {
                    return undefined;
                }
                return builder.getCompletionEntryDetails(entryName, formatOptions, preferences);
            });
        };
        LanguageService.prototype.getCompletionEntrySymbol = function (fileName, position, entryName) {
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isTemplateContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
                var builder = _this.getCompletionBuilder(fileName, position);
                if (builder === null) {
                    return undefined;
                }
                var result = builder.getCompletionEntrySymbol(entryName);
                _this.compilerFactory.registerLastKnownProgram();
                return result;
            });
        };
        LanguageService.prototype.getComponentLocationsForTemplate = function (fileName) {
            return this.withCompiler(function (compiler) {
                var components = compiler.getComponentsWithTemplateFile(fileName);
                var componentDeclarationLocations = Array.from(components.values()).map(function (c) {
                    var contextSpan = undefined;
                    var textSpan;
                    if (reflection_1.isNamedClassDeclaration(c)) {
                        textSpan = ts.createTextSpanFromBounds(c.name.getStart(), c.name.getEnd());
                        contextSpan = ts.createTextSpanFromBounds(c.getStart(), c.getEnd());
                    }
                    else {
                        textSpan = ts.createTextSpanFromBounds(c.getStart(), c.getEnd());
                    }
                    return {
                        fileName: c.getSourceFile().fileName,
                        textSpan: textSpan,
                        contextSpan: contextSpan,
                    };
                });
                return componentDeclarationLocations;
            });
        };
        LanguageService.prototype.getTcb = function (fileName, position) {
            return this.withCompiler(function (compiler) {
                var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, compiler);
                if (templateInfo === undefined) {
                    return undefined;
                }
                var tcb = compiler.getTemplateTypeChecker().getTypeCheckBlock(templateInfo.component);
                if (tcb === null) {
                    return undefined;
                }
                var sf = tcb.getSourceFile();
                var selections = [];
                var target = template_target_1.getTargetAtPosition(templateInfo.template, position);
                if (target !== null) {
                    var selectionSpans = void 0;
                    if ('nodes' in target.context) {
                        selectionSpans = target.context.nodes.map(function (n) { return n.sourceSpan; });
                    }
                    else {
                        selectionSpans = [target.context.node.sourceSpan];
                    }
                    var selectionNodes = selectionSpans
                        .map(function (s) { return comments_1.findFirstMatchingNode(tcb, {
                        withSpan: s,
                        filter: function (node) { return true; },
                    }); })
                        .filter(function (n) { return n !== null; });
                    selections = selectionNodes.map(function (n) {
                        return {
                            start: n.getStart(sf),
                            length: n.getEnd() - n.getStart(sf),
                        };
                    });
                }
                return {
                    fileName: sf.fileName,
                    content: sf.getFullText(),
                    selections: selections,
                };
            });
        };
        LanguageService.prototype.withCompiler = function (p) {
            var compiler = this.compilerFactory.getOrCreate();
            var result = p(compiler);
            this.compilerFactory.registerLastKnownProgram();
            return result;
        };
        LanguageService.prototype.getCompilerOptionsDiagnostics = function () {
            var project = this.project;
            if (!(project instanceof ts.server.ConfiguredProject)) {
                return [];
            }
            var diagnostics = [];
            var configSourceFile = ts.readJsonConfigFile(project.getConfigFilePath(), function (path) { return project.readFile(path); });
            if (!this.options.strictTemplates && !this.options.fullTemplateTypeCheck) {
                diagnostics.push({
                    messageText: 'Some language features are not available. ' +
                        'To access all features, enable `strictTemplates` in `angularCompilerOptions`.',
                    category: ts.DiagnosticCategory.Suggestion,
                    code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SUGGEST_STRICT_TEMPLATES),
                    file: configSourceFile,
                    start: undefined,
                    length: undefined,
                });
            }
            var compiler = this.compilerFactory.getOrCreate();
            diagnostics.push.apply(diagnostics, tslib_1.__spread(compiler.getOptionDiagnostics()));
            return diagnostics;
        };
        LanguageService.prototype.watchConfigFile = function (project) {
            var _this = this;
            // TODO: Check the case when the project is disposed. An InferredProject
            // could be disposed when a tsconfig.json is added to the workspace,
            // in which case it becomes a ConfiguredProject (or vice-versa).
            // We need to make sure that the FileWatcher is closed.
            if (!(project instanceof ts.server.ConfiguredProject)) {
                return;
            }
            var host = project.projectService.host;
            host.watchFile(project.getConfigFilePath(), function (fileName, eventKind) {
                project.log("Config file changed: " + fileName);
                if (eventKind === ts.FileWatcherEventKind.Changed) {
                    _this.options = parseNgCompilerOptions(project, _this.parseConfigHost);
                    logCompilerOptions(project, _this.options);
                }
            });
        };
        return LanguageService;
    }());
    exports.LanguageService = LanguageService;
    function logCompilerOptions(project, options) {
        var logger = project.projectService.logger;
        var projectName = project.getProjectName();
        logger.info("Angular compiler options for " + projectName + ": " + JSON.stringify(options, null, 2));
    }
    function parseNgCompilerOptions(project, host) {
        if (!(project instanceof ts.server.ConfiguredProject)) {
            return {};
        }
        var _a = compiler_cli_1.readConfiguration(project.getConfigFilePath(), /* existingOptions */ undefined, host), options = _a.options, errors = _a.errors;
        if (errors.length > 0) {
            project.setProjectErrors(errors);
        }
        // Projects loaded into the Language Service often include test files which are not part of the
        // app's main compilation unit, and these test files often include inline NgModules that declare
        // components from the app. These declarations conflict with the main declarations of such
        // components in the app's NgModules. This conflict is not normally present during regular
        // compilation because the app and the tests are part of separate compilation units.
        //
        // As a temporary mitigation of this problem, we instruct the compiler to ignore classes which
        // are not exported. In many cases, this ensures the test NgModules are ignored by the compiler
        // and only the real component declaration is used.
        options.compileNonExportedClasses = false;
        return options;
    }
    function createTypeCheckingProgramStrategy(project) {
        return {
            supportsInlineOperations: false,
            shimPathForComponent: function (component) {
                return typecheck_1.TypeCheckShimGenerator.shimFor(file_system_1.absoluteFromSourceFile(component.getSourceFile()));
            },
            getProgram: function () {
                var program = project.getLanguageService().getProgram();
                if (!program) {
                    throw new Error('Language service does not have a program!');
                }
                return program;
            },
            updateFiles: function (contents) {
                var e_2, _a;
                try {
                    for (var contents_1 = tslib_1.__values(contents), contents_1_1 = contents_1.next(); !contents_1_1.done; contents_1_1 = contents_1.next()) {
                        var _b = tslib_1.__read(contents_1_1.value, 2), fileName = _b[0], newText = _b[1];
                        var scriptInfo = getOrCreateTypeCheckScriptInfo(project, fileName);
                        var snapshot = scriptInfo.getSnapshot();
                        var length_1 = snapshot.getLength();
                        scriptInfo.editContent(0, length_1, newText);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (contents_1_1 && !contents_1_1.done && (_a = contents_1.return)) _a.call(contents_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            },
        };
    }
    function getOrCreateTypeCheckScriptInfo(project, tcf) {
        // First check if there is already a ScriptInfo for the tcf
        var projectService = project.projectService;
        var scriptInfo = projectService.getScriptInfo(tcf);
        if (!scriptInfo) {
            // ScriptInfo needs to be opened by client to be able to set its user-defined
            // content. We must also provide file content, otherwise the service will
            // attempt to fetch the content from disk and fail.
            scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(ts.server.toNormalizedPath(tcf), true, // openedByClient
            '', // fileContent
            // script info added by plugins should be marked as external, see
            // https://github.com/microsoft/TypeScript/blob/b217f22e798c781f55d17da72ed099a9dee5c650/src/compiler/program.ts#L1897-L1899
            ts.ScriptKind.External);
            if (!scriptInfo) {
                throw new Error("Failed to create script info for " + tcf);
            }
        }
        // Add ScriptInfo to project if it's missing. A ScriptInfo needs to be part of
        // the project so that it becomes part of the program.
        if (!project.containsScriptInfo(scriptInfo)) {
            project.addRoot(scriptInfo);
        }
        return scriptInfo;
    }
    function nodeContextFromTarget(target) {
        switch (target.kind) {
            case template_target_1.TargetNodeKind.ElementInTagContext:
                return completions_1.CompletionNodeContext.ElementTag;
            case template_target_1.TargetNodeKind.ElementInBodyContext:
                // Completions in element bodies are for new attributes.
                return completions_1.CompletionNodeContext.ElementAttributeKey;
            case template_target_1.TargetNodeKind.TwoWayBindingContext:
                return completions_1.CompletionNodeContext.TwoWayBinding;
            case template_target_1.TargetNodeKind.AttributeInKeyContext:
                return completions_1.CompletionNodeContext.ElementAttributeKey;
            case template_target_1.TargetNodeKind.AttributeInValueContext:
                if (target.node instanceof compiler_1.TmplAstBoundEvent) {
                    return completions_1.CompletionNodeContext.EventValue;
                }
                else {
                    return completions_1.CompletionNodeContext.None;
                }
            default:
                // No special context is available.
                return completions_1.CompletionNodeContext.None;
        }
    }
    function isTemplateContext(program, fileName, position) {
        if (!utils_1.isTypeScriptFile(fileName)) {
            // If we aren't in a TS file, we must be in an HTML file, which we treat as template context
            return true;
        }
        var node = findTightestNodeAtPosition(program, fileName, position);
        if (node === undefined) {
            return false;
        }
        var asgn = ts_utils_1.getPropertyAssignmentFromValue(node, 'template');
        if (asgn === null) {
            return false;
        }
        return ts_utils_1.getClassDeclFromDecoratorProp(asgn) !== null;
    }
    function isInAngularContext(program, fileName, position) {
        var _a, _b;
        if (!utils_1.isTypeScriptFile(fileName)) {
            return true;
        }
        var node = findTightestNodeAtPosition(program, fileName, position);
        if (node === undefined) {
            return false;
        }
        var asgn = (_b = (_a = ts_utils_1.getPropertyAssignmentFromValue(node, 'template')) !== null && _a !== void 0 ? _a : ts_utils_1.getPropertyAssignmentFromValue(node, 'templateUrl')) !== null && _b !== void 0 ? _b : ts_utils_1.getPropertyAssignmentFromValue(node.parent, 'styleUrls');
        return asgn !== null && ts_utils_1.getClassDeclFromDecoratorProp(asgn) !== null;
    }
    function findTightestNodeAtPosition(program, fileName, position) {
        var sourceFile = program.getSourceFile(fileName);
        if (sourceFile === undefined) {
            return undefined;
        }
        return ts_utils_1.findTightestNode(sourceFile, position);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyRztJQUMzRyxzREFBNEY7SUFFNUYsMkVBQW1GO0lBQ25GLDJFQUFpSDtJQUNqSCx5RUFBbUY7SUFDbkYsdUVBQWlGO0lBQ2pGLHFFQUF1RztJQUN2RyxtRkFBNkY7SUFDN0YsbURBQXFEO0lBSXJELG1FQUFxRTtJQUNyRSxtRkFBbUQ7SUFDbkQseUVBQXVFO0lBQ3ZFLHlFQUFnRDtJQUNoRCx1RUFBOEM7SUFDOUMsdUVBQXdEO0lBQ3hELGlGQUFxRjtJQUNyRixtRUFBMkc7SUFDM0csNkRBQW9FO0lBRXBFO1FBT0UseUJBQ3FCLE9BQTBCLEVBQW1CLElBQXdCO1lBQXJFLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBQW1CLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQ3hGLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSw0QkFBaUIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlDQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFD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QUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEFTVCwgUGFyc2VTb3VyY2VTcGFuLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBDb25maWd1cmF0aW9uSG9zdCwgcmVhZENvbmZpZ3VyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNOYW1lZENsYXNzRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7ZmluZEZpcnN0TWF0Y2hpbmdOb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtHZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZVJlc3BvbnNlLCBHZXRUY2JSZXNwb25zZX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLCBMU1BhcnNlQ29uZmlnSG9zdH0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7Q29tcGxldGlvbkJ1aWxkZXIsIENvbXBsZXRpb25Ob2RlQ29udGV4dH0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7UmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXJ9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb24sIFRhcmdldENvbnRleHQsIFRhcmdldE5vZGVLaW5kfSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wLCBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWV9IGZyb20gJy4vdHNfdXRpbHMnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1R5cGVTY3JpcHRGaWxlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIExhbmd1YWdlU2VydmljZSB7XG4gIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICByZWFkb25seSBjb21waWxlckZhY3Rvcnk6IENvbXBpbGVyRmFjdG9yeTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5O1xuICBwcml2YXRlIHJlYWRvbmx5IGFkYXB0ZXI6IExhbmd1YWdlU2VydmljZUFkYXB0ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFyc2VDb25maWdIb3N0OiBMU1BhcnNlQ29uZmlnSG9zdDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlKSB7XG4gICAgdGhpcy5wYXJzZUNvbmZpZ0hvc3QgPSBuZXcgTFNQYXJzZUNvbmZpZ0hvc3QocHJvamVjdC5wcm9qZWN0U2VydmljZS5ob3N0KTtcbiAgICB0aGlzLm9wdGlvbnMgPSBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMucGFyc2VDb25maWdIb3N0KTtcbiAgICBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLnN0cmF0ZWd5ID0gY3JlYXRlVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5KHByb2plY3QpO1xuICAgIHRoaXMuYWRhcHRlciA9IG5ldyBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyKHByb2plY3QpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5ID0gbmV3IENvbXBpbGVyRmFjdG9yeSh0aGlzLmFkYXB0ZXIsIHRoaXMuc3RyYXRlZ3ksIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy53YXRjaENvbmZpZ0ZpbGUocHJvamVjdCk7XG4gIH1cblxuICBnZXRDb21waWxlck9wdGlvbnMoKTogQ29tcGlsZXJPcHRpb25zIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zO1xuICB9XG5cbiAgZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGVyLmdldERpYWdub3N0aWNzRm9yRmlsZShzb3VyY2VGaWxlLCBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBjb21wb25lbnRzKSB7XG4gICAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHRjLmdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzSW5Bbmd1bGFyQ29udGV4dChjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLCBmaWxlTmFtZSwgcG9zaXRpb24pKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpXG4gICAgICAgICAgLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAuZ2V0VHlwZURlZmluaXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQmVjYXVzZSB3ZSBjYW4gb25seSBzaG93IDEgcXVpY2sgaW5mbywganVzdCB1c2UgdGhlIGJvdW5kIGF0dHJpYnV0ZSBpZiB0aGUgdGFyZ2V0IGlzIGEgdHdvXG4gICAgLy8gd2F5IGJpbmRpbmcuIFdlIG1heSBjb25zaWRlciBjb25jYXRlbmF0aW5nIGFkZGl0aW9uYWwgZGlzcGxheSBwYXJ0cyBmcm9tIHRoZSBvdGhlciB0YXJnZXRcbiAgICAvLyBub2RlcyBvciByZXByZXNlbnRpbmcgdGhlIHR3byB3YXkgYmluZGluZyBpbiBzb21lIG90aGVyIG1hbm5lciBpbiB0aGUgZnV0dXJlLlxuICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzWzBdIDpcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZTtcbiAgICBjb25zdCByZXN1bHRzID0gbmV3IFF1aWNrSW5mb0J1aWxkZXIodGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgbm9kZSkuZ2V0KCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHRzID0gbmV3IFJlZmVyZW5jZXNBbmRSZW5hbWVCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFJlbmFtZUluZm8oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlbmFtZUluZm8ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZW5hbWVJbmZvID0gbmV3IFJlZmVyZW5jZXNBbmRSZW5hbWVCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZ2V0UmVuYW1lSW5mbyhhYnNvbHV0ZUZyb20oZmlsZU5hbWUpLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZW5hbWVJbmZvLmNhblJlbmFtZSkge1xuICAgICAgcmV0dXJuIHJlbmFtZUluZm87XG4gICAgfVxuXG4gICAgY29uc3QgcXVpY2tJbmZvID0gdGhpcy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgdGhpcy50c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBjb25zdCBraW5kID0gcXVpY2tJbmZvPy5raW5kID8/IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gICAgY29uc3Qga2luZE1vZGlmaWVycyA9IHF1aWNrSW5mbz8ua2luZE1vZGlmaWVycyA/PyB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duO1xuICAgIHJldHVybiB7Li4ucmVuYW1lSW5mbywga2luZCwga2luZE1vZGlmaWVyc307XG4gIH1cblxuICBmaW5kUmVuYW1lTG9jYXRpb25zKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kUmVuYW1lTG9jYXRpb25zKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdE5vZGV8QVNUPnxudWxsIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZvciB0d28td2F5IGJpbmRpbmdzLCB3ZSBhY3R1YWxseSBvbmx5IG5lZWQgdG8gYmUgY29uY2VybmVkIHdpdGggdGhlIGJvdW5kIGF0dHJpYnV0ZSBiZWNhdXNlXG4gICAgLy8gdGhlIGJpbmRpbmdzIGluIHRoZSB0ZW1wbGF0ZSBhcmUgd3JpdHRlbiB3aXRoIHRoZSBhdHRyaWJ1dGUgbmFtZSwgbm90IHRoZSBldmVudCBuYW1lLlxuICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzWzBdIDpcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZTtcbiAgICByZXR1cm4gbmV3IENvbXBsZXRpb25CdWlsZGVyKFxuICAgICAgICB0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlLFxuICAgICAgICBub2RlQ29udGV4dEZyb21UYXJnZXQocG9zaXRpb25EZXRhaWxzLmNvbnRleHQpLCBwb3NpdGlvbkRldGFpbHMucGFyZW50LFxuICAgICAgICBwb3NpdGlvbkRldGFpbHMudGVtcGxhdGUpO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcigoY29tcGlsZXIpID0+IHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZUNvbnRleHQoY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKSwgZmlsZU5hbWUsIHBvc2l0aW9uKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBidWlsZGVyLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChlbnRyeU5hbWUpO1xuICAgICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0Q29tcG9uZW50TG9jYXRpb25zRm9yVGVtcGxhdGUoZmlsZU5hbWU6IHN0cmluZyk6IEdldENvbXBvbmVudExvY2F0aW9uc0ZvclRlbXBsYXRlUmVzcG9uc2Uge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcjxHZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZVJlc3BvbnNlPigoY29tcGlsZXIpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICBjb25zdCBjb21wb25lbnREZWNsYXJhdGlvbkxvY2F0aW9uczogdHMuRG9jdW1lbnRTcGFuW10gPVxuICAgICAgICAgIEFycmF5LmZyb20oY29tcG9uZW50cy52YWx1ZXMoKSkubWFwKGMgPT4ge1xuICAgICAgICAgICAgbGV0IGNvbnRleHRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgdGV4dFNwYW46IHRzLlRleHRTcGFuO1xuICAgICAgICAgICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGMpKSB7XG4gICAgICAgICAgICAgIHRleHRTcGFuID0gdHMuY3JlYXRlVGV4dFNwYW5Gcm9tQm91bmRzKGMubmFtZS5nZXRTdGFydCgpLCBjLm5hbWUuZ2V0RW5kKCkpO1xuICAgICAgICAgICAgICBjb250ZXh0U3BhbiA9IHRzLmNyZWF0ZVRleHRTcGFuRnJvbUJvdW5kcyhjLmdldFN0YXJ0KCksIGMuZ2V0RW5kKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGV4dFNwYW4gPSB0cy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoYy5nZXRTdGFydCgpLCBjLmdldEVuZCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGZpbGVOYW1lOiBjLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICAgICAgICAgICAgdGV4dFNwYW4sXG4gICAgICAgICAgICAgIGNvbnRleHRTcGFuLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgIHJldHVybiBjb21wb25lbnREZWNsYXJhdGlvbkxvY2F0aW9ucztcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRjYihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogR2V0VGNiUmVzcG9uc2Uge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcjxHZXRUY2JSZXNwb25zZT4oY29tcGlsZXIgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgdGNiID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFR5cGVDaGVja0Jsb2NrKHRlbXBsYXRlSW5mby5jb21wb25lbnQpO1xuICAgICAgaWYgKHRjYiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2YgPSB0Y2IuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgICBsZXQgc2VsZWN0aW9uczogdHMuVGV4dFNwYW5bXSA9IFtdO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICAgIGlmICh0YXJnZXQgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IHNlbGVjdGlvblNwYW5zOiBBcnJheTxQYXJzZVNvdXJjZVNwYW58QWJzb2x1dGVTb3VyY2VTcGFuPjtcbiAgICAgICAgaWYgKCdub2RlcycgaW4gdGFyZ2V0LmNvbnRleHQpIHtcbiAgICAgICAgICBzZWxlY3Rpb25TcGFucyA9IHRhcmdldC5jb250ZXh0Lm5vZGVzLm1hcChuID0+IG4uc291cmNlU3Bhbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZWN0aW9uU3BhbnMgPSBbdGFyZ2V0LmNvbnRleHQubm9kZS5zb3VyY2VTcGFuXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzZWxlY3Rpb25Ob2RlczogdHMuTm9kZVtdID1cbiAgICAgICAgICAgIHNlbGVjdGlvblNwYW5zXG4gICAgICAgICAgICAgICAgLm1hcChzID0+IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0Y2IsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgd2l0aFNwYW46IHMsXG4gICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLk5vZGUgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG4pOiBuIGlzIHRzLk5vZGUgPT4gbiAhPT0gbnVsbCk7XG5cbiAgICAgICAgc2VsZWN0aW9ucyA9IHNlbGVjdGlvbk5vZGVzLm1hcChuID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnQ6IG4uZ2V0U3RhcnQoc2YpLFxuICAgICAgICAgICAgbGVuZ3RoOiBuLmdldEVuZCgpIC0gbi5nZXRTdGFydChzZiksXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGVOYW1lOiBzZi5maWxlTmFtZSxcbiAgICAgICAgY29udGVudDogc2YuZ2V0RnVsbFRleHQoKSxcbiAgICAgICAgc2VsZWN0aW9ucyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHdpdGhDb21waWxlcjxUPihwOiAoY29tcGlsZXI6IE5nQ29tcGlsZXIpID0+IFQpOiBUIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gcChjb21waWxlcik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMucHJvamVjdDtcbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBjb25maWdTb3VyY2VGaWxlID0gdHMucmVhZEpzb25Db25maWdGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChwYXRoOiBzdHJpbmcpID0+IHByb2plY3QucmVhZEZpbGUocGF0aCkpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzICYmICF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgbWVzc2FnZVRleHQ6ICdTb21lIGxhbmd1YWdlIGZlYXR1cmVzIGFyZSBub3QgYXZhaWxhYmxlLiAnICtcbiAgICAgICAgICAgICdUbyBhY2Nlc3MgYWxsIGZlYXR1cmVzLCBlbmFibGUgYHN0cmljdFRlbXBsYXRlc2AgaW4gYGFuZ3VsYXJDb21waWxlck9wdGlvbnNgLicsXG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuU3VnZ2VzdGlvbixcbiAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLlNVR0dFU1RfU1RSSUNUX1RFTVBMQVRFUyksXG4gICAgICAgIGZpbGU6IGNvbmZpZ1NvdXJjZUZpbGUsXG4gICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKSk7XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgICAgICAgICBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IHtsb2dnZXJ9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0LmdldFByb2plY3ROYW1lKCk7XG4gIGxvZ2dlci5pbmZvKGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgZm9yICR7cHJvamVjdE5hbWV9OiBgICsgSlNPTi5zdHJpbmdpZnkob3B0aW9ucywgbnVsbCwgMikpO1xufVxuXG5mdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IHtvcHRpb25zLCBlcnJvcnN9ID1cbiAgICAgIHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgLyogZXhpc3RpbmdPcHRpb25zICovIHVuZGVmaW5lZCwgaG9zdCk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHByb2plY3Quc2V0UHJvamVjdEVycm9ycyhlcnJvcnMpO1xuICB9XG5cbiAgLy8gUHJvamVjdHMgbG9hZGVkIGludG8gdGhlIExhbmd1YWdlIFNlcnZpY2Ugb2Z0ZW4gaW5jbHVkZSB0ZXN0IGZpbGVzIHdoaWNoIGFyZSBub3QgcGFydCBvZiB0aGVcbiAgLy8gYXBwJ3MgbWFpbiBjb21waWxhdGlvbiB1bml0LCBhbmQgdGhlc2UgdGVzdCBmaWxlcyBvZnRlbiBpbmNsdWRlIGlubGluZSBOZ01vZHVsZXMgdGhhdCBkZWNsYXJlXG4gIC8vIGNvbXBvbmVudHMgZnJvbSB0aGUgYXBwLiBUaGVzZSBkZWNsYXJhdGlvbnMgY29uZmxpY3Qgd2l0aCB0aGUgbWFpbiBkZWNsYXJhdGlvbnMgb2Ygc3VjaFxuICAvLyBjb21wb25lbnRzIGluIHRoZSBhcHAncyBOZ01vZHVsZXMuIFRoaXMgY29uZmxpY3QgaXMgbm90IG5vcm1hbGx5IHByZXNlbnQgZHVyaW5nIHJlZ3VsYXJcbiAgLy8gY29tcGlsYXRpb24gYmVjYXVzZSB0aGUgYXBwIGFuZCB0aGUgdGVzdHMgYXJlIHBhcnQgb2Ygc2VwYXJhdGUgY29tcGlsYXRpb24gdW5pdHMuXG4gIC8vXG4gIC8vIEFzIGEgdGVtcG9yYXJ5IG1pdGlnYXRpb24gb2YgdGhpcyBwcm9ibGVtLCB3ZSBpbnN0cnVjdCB0aGUgY29tcGlsZXIgdG8gaWdub3JlIGNsYXNzZXMgd2hpY2hcbiAgLy8gYXJlIG5vdCBleHBvcnRlZC4gSW4gbWFueSBjYXNlcywgdGhpcyBlbnN1cmVzIHRoZSB0ZXN0IE5nTW9kdWxlcyBhcmUgaWdub3JlZCBieSB0aGUgY29tcGlsZXJcbiAgLy8gYW5kIG9ubHkgdGhlIHJlYWwgY29tcG9uZW50IGRlY2xhcmF0aW9uIGlzIHVzZWQuXG4gIG9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyA9IGZhbHNlO1xuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOlxuICAgIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSB7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zOiBmYWxzZSxcbiAgICBzaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgICByZXR1cm4gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIH0sXG4gICAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBwcm9qZWN0LmdldExhbmd1YWdlU2VydmljZSgpLmdldFByb2dyYW0oKTtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZG9lcyBub3QgaGF2ZSBhIHByb2dyYW0hJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4pIHtcbiAgICAgIGZvciAoY29uc3QgW2ZpbGVOYW1lLCBuZXdUZXh0XSBvZiBjb250ZW50cykge1xuICAgICAgICBjb25zdCBzY3JpcHRJbmZvID0gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKHByb2plY3QsIGZpbGVOYW1lKTtcbiAgICAgICAgY29uc3Qgc25hcHNob3QgPSBzY3JpcHRJbmZvLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHNuYXBzaG90LmdldExlbmd0aCgpO1xuICAgICAgICBzY3JpcHRJbmZvLmVkaXRDb250ZW50KDAsIGxlbmd0aCwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCB0Y2Y6IHN0cmluZyk6IHRzLnNlcnZlci5TY3JpcHRJbmZvIHtcbiAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIFNjcmlwdEluZm8gZm9yIHRoZSB0Y2ZcbiAgY29uc3Qge3Byb2plY3RTZXJ2aWNlfSA9IHByb2plY3Q7XG4gIGxldCBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0U2NyaXB0SW5mbyh0Y2YpO1xuICBpZiAoIXNjcmlwdEluZm8pIHtcbiAgICAvLyBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIG9wZW5lZCBieSBjbGllbnQgdG8gYmUgYWJsZSB0byBzZXQgaXRzIHVzZXItZGVmaW5lZFxuICAgIC8vIGNvbnRlbnQuIFdlIG11c3QgYWxzbyBwcm92aWRlIGZpbGUgY29udGVudCwgb3RoZXJ3aXNlIHRoZSBzZXJ2aWNlIHdpbGxcbiAgICAvLyBhdHRlbXB0IHRvIGZldGNoIHRoZSBjb250ZW50IGZyb20gZGlzayBhbmQgZmFpbC5cbiAgICBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0T3JDcmVhdGVTY3JpcHRJbmZvRm9yTm9ybWFsaXplZFBhdGgoXG4gICAgICAgIHRzLnNlcnZlci50b05vcm1hbGl6ZWRQYXRoKHRjZiksXG4gICAgICAgIHRydWUsICAvLyBvcGVuZWRCeUNsaWVudFxuICAgICAgICAnJywgICAgLy8gZmlsZUNvbnRlbnRcbiAgICAgICAgLy8gc2NyaXB0IGluZm8gYWRkZWQgYnkgcGx1Z2lucyBzaG91bGQgYmUgbWFya2VkIGFzIGV4dGVybmFsLCBzZWVcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvYjIxN2YyMmU3OThjNzgxZjU1ZDE3ZGE3MmVkMDk5YTlkZWU1YzY1MC9zcmMvY29tcGlsZXIvcHJvZ3JhbS50cyNMMTg5Ny1MMTg5OVxuICAgICAgICB0cy5TY3JpcHRLaW5kLkV4dGVybmFsLCAgLy8gc2NyaXB0S2luZFxuICAgICk7XG4gICAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgc2NyaXB0IGluZm8gZm9yICR7dGNmfWApO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgU2NyaXB0SW5mbyB0byBwcm9qZWN0IGlmIGl0J3MgbWlzc2luZy4gQSBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIHBhcnQgb2ZcbiAgLy8gdGhlIHByb2plY3Qgc28gdGhhdCBpdCBiZWNvbWVzIHBhcnQgb2YgdGhlIHByb2dyYW0uXG4gIGlmICghcHJvamVjdC5jb250YWluc1NjcmlwdEluZm8oc2NyaXB0SW5mbykpIHtcbiAgICBwcm9qZWN0LmFkZFJvb3Qoc2NyaXB0SW5mbyk7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdEluZm87XG59XG5cbmZ1bmN0aW9uIG5vZGVDb250ZXh0RnJvbVRhcmdldCh0YXJnZXQ6IFRhcmdldENvbnRleHQpOiBDb21wbGV0aW9uTm9kZUNvbnRleHQge1xuICBzd2l0Y2ggKHRhcmdldC5raW5kKSB7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50VGFnO1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluQm9keUNvbnRleHQ6XG4gICAgICAvLyBDb21wbGV0aW9ucyBpbiBlbGVtZW50IGJvZGllcyBhcmUgZm9yIG5ldyBhdHRyaWJ1dGVzLlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5O1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LlR3b1dheUJpbmRpbmc7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJbktleUNvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXk7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dDpcbiAgICAgIGlmICh0YXJnZXQubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRXZlbnRWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gTm8gc3BlY2lhbCBjb250ZXh0IGlzIGF2YWlsYWJsZS5cbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1RlbXBsYXRlQ29udGV4dChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmICghaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAvLyBJZiB3ZSBhcmVuJ3QgaW4gYSBUUyBmaWxlLCB3ZSBtdXN0IGJlIGluIGFuIEhUTUwgZmlsZSwgd2hpY2ggd2UgdHJlYXQgYXMgdGVtcGxhdGUgY29udGV4dFxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGVBdFBvc2l0aW9uKHByb2dyYW0sIGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIGlmIChub2RlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgYXNnbiA9IGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZShub2RlLCAndGVtcGxhdGUnKTtcbiAgaWYgKGFzZ24gPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKGFzZ24pICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0luQW5ndWxhckNvbnRleHQocHJvZ3JhbTogdHMuUHJvZ3JhbSwgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcikge1xuICBpZiAoIWlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZUF0UG9zaXRpb24ocHJvZ3JhbSwgZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUobm9kZSwgJ3RlbXBsYXRlJykgPz9cbiAgICAgIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZShub2RlLCAndGVtcGxhdGVVcmwnKSA/P1xuICAgICAgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKG5vZGUucGFyZW50LCAnc3R5bGVVcmxzJyk7XG4gIHJldHVybiBhc2duICE9PSBudWxsICYmIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKGFzZ24pICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBmaW5kVGlnaHRlc3ROb2RlQXRQb3NpdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKSB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmaW5kVGlnaHRlc3ROb2RlKHNvdXJjZUZpbGUsIHBvc2l0aW9uKTtcbn0iXX0=