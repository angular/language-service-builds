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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
            var compiler = this.compilerFactory.getOrCreate();
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getDefinitionAndBoundSpan(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreate();
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getTypeDefinitionsAtPosition(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
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
            var builder = this.getCompletionBuilder(fileName, position);
            if (builder === null) {
                return undefined;
            }
            var result = builder.getCompletionsAtPosition(options);
            this.compilerFactory.registerLastKnownProgram();
            return result;
        };
        LanguageService.prototype.getCompletionEntryDetails = function (fileName, position, entryName, formatOptions, preferences) {
            var builder = this.getCompletionBuilder(fileName, position);
            if (builder === null) {
                return undefined;
            }
            var result = builder.getCompletionEntryDetails(entryName, formatOptions, preferences);
            this.compilerFactory.registerLastKnownProgram();
            return result;
        };
        LanguageService.prototype.getCompletionEntrySymbol = function (fileName, position, entryName) {
            var builder = this.getCompletionBuilder(fileName, position);
            if (builder === null) {
                return undefined;
            }
            var result = builder.getCompletionEntrySymbol(entryName);
            this.compilerFactory.registerLastKnownProgram();
            return result;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyRztJQUMzRyxzREFBNEY7SUFFNUYsMkVBQW1GO0lBQ25GLDJFQUFpSDtJQUNqSCx5RUFBbUY7SUFDbkYsdUVBQWlGO0lBQ2pGLHFFQUF1RztJQUN2RyxtRkFBNkY7SUFDN0YsbURBQXFEO0lBSXJELG1FQUFxRTtJQUNyRSxtRkFBbUQ7SUFDbkQseUVBQXVFO0lBQ3ZFLHlFQUFnRDtJQUNoRCx1RUFBOEM7SUFDOUMsdUVBQXdEO0lBQ3hELGlGQUFxRjtJQUNyRiw2REFBb0U7SUFFcEU7UUFPRSx5QkFDcUIsT0FBMEIsRUFBbUIsSUFBd0I7WUFBckUsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7WUFBbUIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDeEYsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLDRCQUFpQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksaUNBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGtDQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCw0Q0FBa0IsR0FBbEI7WUFDRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEIsQ0FBQztRQUVELGdEQUFzQixHQUF0QixVQUF1QixRQUFnQjs7WUFDckMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM5QyxJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksd0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzlCLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDMUMsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxVQUFVLEVBQUU7b0JBQ2QsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxRQUFRLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLGlCQUFXLENBQUMsVUFBVSxDQUFDLEdBQUU7aUJBQ3pGO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDOztvQkFDcEUsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTt3QkFBL0IsSUFBTSxTQUFTLHVCQUFBO3dCQUNsQixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRTs0QkFDcEMsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxHQUFHLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLEdBQUU7eUJBQ2hFO3FCQUNGOzs7Ozs7Ozs7YUFDRjtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoRCxPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDO1FBRUQsbURBQXlCLEdBQXpCLFVBQTBCLFFBQWdCLEVBQUUsUUFBZ0I7WUFFMUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLE9BQU8sR0FDVCxJQUFJLCtCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdGLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRUQscURBQTJCLEdBQTNCLFVBQTRCLFFBQWdCLEVBQUUsUUFBZ0I7WUFFNUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLE9BQU8sR0FDVCxJQUFJLCtCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsNEJBQTRCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hHLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRUQsZ0RBQXNCLEdBQXRCLFVBQXVCLFFBQWdCLEVBQUUsUUFBZ0I7WUFDdkQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdFLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLGVBQWUsR0FBRyxxQ0FBbUIsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdFLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtnQkFDNUIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCw2RkFBNkY7WUFDN0YsNEZBQTRGO1lBQzVGLGdGQUFnRjtZQUNoRixJQUFNLElBQUksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQy9FLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ2pDLElBQU0sT0FBTyxHQUFHLElBQUksNkJBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM5RixJQUFJLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVELGlEQUF1QixHQUF2QixVQUF3QixRQUFnQixFQUFFLFFBQWdCO1lBQ3hELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEQsSUFBTSxPQUFPLEdBQUcsSUFBSSx1Q0FBMEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO2lCQUM3RCx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFRCx1Q0FBYSxHQUFiLFVBQWMsUUFBZ0IsRUFBRSxRQUFnQjs7WUFDOUMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLFVBQVUsR0FBRyxJQUFJLHVDQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7aUJBQzdELGFBQWEsQ0FBQywwQkFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFO2dCQUN6QixPQUFPLFVBQVUsQ0FBQzthQUNuQjtZQUVELElBQU0sU0FBUyxTQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLG1DQUM3RCxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN6RCxJQUFNLElBQUksU0FBRyxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsSUFBSSxtQ0FBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1lBQzdELElBQU0sYUFBYSxTQUFHLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxhQUFhLG1DQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7WUFDL0UsNkNBQVcsVUFBVSxLQUFFLElBQUksTUFBQSxFQUFFLGFBQWEsZUFBQSxJQUFFO1FBQzlDLENBQUM7UUFFRCw2Q0FBbUIsR0FBbkIsVUFBb0IsUUFBZ0IsRUFBRSxRQUFnQjtZQUNwRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BELElBQU0sT0FBTyxHQUFHLElBQUksdUNBQTBCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztpQkFDN0QsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRU8sOENBQW9CLEdBQTVCLFVBQTZCLFFBQWdCLEVBQUUsUUFBZ0I7WUFFN0QsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwRCxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdFLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sZUFBZSxHQUFHLHFDQUFtQixDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDN0UsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO2dCQUM1QixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsK0ZBQStGO1lBQy9GLHdGQUF3RjtZQUN4RixJQUFNLElBQUksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQy9FLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSwrQkFBaUIsQ0FDeEIsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQ2pELHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxlQUFlLENBQUMsTUFBTSxFQUN0RSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELGtEQUF3QixHQUF4QixVQUNJLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxPQUFxRDtZQUUzRixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDcEIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxtREFBeUIsR0FBekIsVUFDSSxRQUFnQixFQUFFLFFBQWdCLEVBQUUsU0FBaUIsRUFDckQsYUFBbUUsRUFDbkUsV0FBeUM7WUFDM0MsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7Z0JBQ3BCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxrREFBd0IsR0FBeEIsVUFBeUIsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLFNBQWlCO1lBRTVFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUNwQixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELDBEQUFnQyxHQUFoQyxVQUFpQyxRQUFnQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQTJDLFVBQUMsUUFBUTtnQkFDMUUsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRSxJQUFNLDZCQUE2QixHQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7b0JBQ25DLElBQUksV0FBVyxHQUEwQixTQUFTLENBQUM7b0JBQ25ELElBQUksUUFBcUIsQ0FBQztvQkFDMUIsSUFBSSxvQ0FBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDOUIsUUFBUSxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQzt3QkFDM0UsV0FBVyxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7cUJBQ3JFO3lCQUFNO3dCQUNMLFFBQVEsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO3FCQUNsRTtvQkFDRCxPQUFPO3dCQUNMLFFBQVEsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTt3QkFDcEMsUUFBUSxVQUFBO3dCQUNSLFdBQVcsYUFBQTtxQkFDWixDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO2dCQUNQLE9BQU8sNkJBQTZCLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsZ0NBQU0sR0FBTixVQUFPLFFBQWdCLEVBQUUsUUFBZ0I7WUFDdkMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFpQixVQUFBLFFBQVE7Z0JBQy9DLElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdFLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtvQkFDOUIsT0FBTyxTQUFTLENBQUM7aUJBQ2xCO2dCQUNELElBQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDeEYsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO29CQUNoQixPQUFPLFNBQVMsQ0FBQztpQkFDbEI7Z0JBQ0QsSUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUUvQixJQUFJLFVBQVUsR0FBa0IsRUFBRSxDQUFDO2dCQUNuQyxJQUFNLE1BQU0sR0FBRyxxQ0FBbUIsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7b0JBQ25CLElBQUksY0FBYyxTQUEyQyxDQUFDO29CQUM5RCxJQUFJLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO3dCQUM3QixjQUFjLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFVBQVUsRUFBWixDQUFZLENBQUMsQ0FBQztxQkFDOUQ7eUJBQU07d0JBQ0wsY0FBYyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7cUJBQ25EO29CQUNELElBQU0sY0FBYyxHQUNoQixjQUFjO3lCQUNULEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGdDQUFxQixDQUFDLEdBQUcsRUFBRTt3QkFDOUIsUUFBUSxFQUFFLENBQUM7d0JBQ1gsTUFBTSxFQUFFLFVBQUMsSUFBYSxJQUFzQixPQUFBLElBQUksRUFBSixDQUFJO3FCQUNqRCxDQUFDLEVBSEcsQ0FHSCxDQUFDO3lCQUNQLE1BQU0sQ0FBQyxVQUFDLENBQUMsSUFBbUIsT0FBQSxDQUFDLEtBQUssSUFBSSxFQUFWLENBQVUsQ0FBQyxDQUFDO29CQUVqRCxVQUFVLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7d0JBQy9CLE9BQU87NEJBQ0wsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDOzRCQUNyQixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO3lCQUNwQyxDQUFDO29CQUNKLENBQUMsQ0FBQyxDQUFDO2lCQUNKO2dCQUVELE9BQU87b0JBQ0wsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRO29CQUNyQixPQUFPLEVBQUUsRUFBRSxDQUFDLFdBQVcsRUFBRTtvQkFDekIsVUFBVSxZQUFBO2lCQUNYLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFTyxzQ0FBWSxHQUFwQixVQUF3QixDQUE4QjtZQUNwRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BELElBQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELHVEQUE2QixHQUE3QjtZQUNFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDN0IsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLEVBQUUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDckQsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7WUFDeEMsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQzFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLFVBQUMsSUFBWSxJQUFLLE9BQUEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBdEIsQ0FBc0IsQ0FBQyxDQUFDO1lBRTNFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUU7Z0JBQ3hFLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0JBQ2YsV0FBVyxFQUFFLDRDQUE0Qzt3QkFDckQsK0VBQStFO29CQUNuRixRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVU7b0JBQzFDLElBQUksRUFBRSx5QkFBVyxDQUFDLHVCQUFTLENBQUMsd0JBQXdCLENBQUM7b0JBQ3JELElBQUksRUFBRSxnQkFBZ0I7b0JBQ3RCLEtBQUssRUFBRSxTQUFTO29CQUNoQixNQUFNLEVBQUUsU0FBUztpQkFDbEIsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BELFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUU7WUFFckQsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVPLHlDQUFlLEdBQXZCLFVBQXdCLE9BQTBCO1lBQWxELGlCQWlCQztZQWhCQyx3RUFBd0U7WUFDeEUsb0VBQW9FO1lBQ3BFLGdFQUFnRTtZQUNoRSx1REFBdUQ7WUFDdkQsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLEVBQUUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDckQsT0FBTzthQUNSO1lBQ00sSUFBQSxJQUFJLEdBQUksT0FBTyxDQUFDLGNBQWMsS0FBMUIsQ0FBMkI7WUFDdEMsSUFBSSxDQUFDLFNBQVMsQ0FDVixPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxVQUFDLFFBQWdCLEVBQUUsU0FBa0M7Z0JBQ2hGLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQXdCLFFBQVUsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLFNBQVMsS0FBSyxFQUFFLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFO29CQUNqRCxLQUFJLENBQUMsT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxLQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ3JFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzNDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDVCxDQUFDO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBdlNELElBdVNDO0lBdlNZLDBDQUFlO0lBeVM1QixTQUFTLGtCQUFrQixDQUFDLE9BQTBCLEVBQUUsT0FBd0I7UUFDdkUsSUFBQSxNQUFNLEdBQUksT0FBTyxDQUFDLGNBQWMsT0FBMUIsQ0FBMkI7UUFDeEMsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWdDLFdBQVcsT0FBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUMzQixPQUEwQixFQUFFLElBQXVCO1FBQ3JELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDckQsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUNLLElBQUEsS0FDRixnQ0FBaUIsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBRGxGLE9BQU8sYUFBQSxFQUFFLE1BQU0sWUFDbUUsQ0FBQztRQUMxRixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNsQztRQUVELCtGQUErRjtRQUMvRixnR0FBZ0c7UUFDaEcsMEZBQTBGO1FBQzFGLDBGQUEwRjtRQUMxRixvRkFBb0Y7UUFDcEYsRUFBRTtRQUNGLDhGQUE4RjtRQUM5RiwrRkFBK0Y7UUFDL0YsbURBQW1EO1FBQ25ELE9BQU8sQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUM7UUFFMUMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVELFNBQVMsaUNBQWlDLENBQUMsT0FBMEI7UUFFbkUsT0FBTztZQUNMLHdCQUF3QixFQUFFLEtBQUs7WUFDL0Isb0JBQW9CLEVBQXBCLFVBQXFCLFNBQThCO2dCQUNqRCxPQUFPLGtDQUFzQixDQUFDLE9BQU8sQ0FBQyxvQ0FBc0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNGLENBQUM7WUFDRCxVQUFVLEVBQVY7Z0JBQ0UsSUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzFELElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO2lCQUM5RDtnQkFDRCxPQUFPLE9BQU8sQ0FBQztZQUNqQixDQUFDO1lBQ0QsV0FBVyxFQUFYLFVBQVksUUFBcUM7OztvQkFDL0MsS0FBa0MsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTt3QkFBakMsSUFBQSxLQUFBLHFDQUFtQixFQUFsQixRQUFRLFFBQUEsRUFBRSxPQUFPLFFBQUE7d0JBQzNCLElBQU0sVUFBVSxHQUFHLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDckUsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUMxQyxJQUFNLFFBQU0sR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3BDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLFFBQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDNUM7Ozs7Ozs7OztZQUNILENBQUM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsOEJBQThCLENBQ25DLE9BQTBCLEVBQUUsR0FBVztRQUN6QywyREFBMkQ7UUFDcEQsSUFBQSxjQUFjLEdBQUksT0FBTyxlQUFYLENBQVk7UUFDakMsSUFBSSxVQUFVLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsNkVBQTZFO1lBQzdFLHlFQUF5RTtZQUN6RSxtREFBbUQ7WUFDbkQsVUFBVSxHQUFHLGNBQWMsQ0FBQyxzQ0FBc0MsQ0FDOUQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFDL0IsSUFBSSxFQUFHLGlCQUFpQjtZQUN4QixFQUFFLEVBQUssY0FBYztZQUNyQixpRUFBaUU7WUFDakUsNEhBQTRIO1lBQzVILEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUN6QixDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFvQyxHQUFLLENBQUMsQ0FBQzthQUM1RDtTQUNGO1FBQ0QsOEVBQThFO1FBQzlFLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDN0I7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FBQyxNQUFxQjtRQUNsRCxRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUU7WUFDbkIsS0FBSyxnQ0FBYyxDQUFDLG1CQUFtQjtnQkFDckMsT0FBTyxtQ0FBcUIsQ0FBQyxVQUFVLENBQUM7WUFDMUMsS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQjtnQkFDdEMsd0RBQXdEO2dCQUN4RCxPQUFPLG1DQUFxQixDQUFDLG1CQUFtQixDQUFDO1lBQ25ELEtBQUssZ0NBQWMsQ0FBQyxvQkFBb0I7Z0JBQ3RDLE9BQU8sbUNBQXFCLENBQUMsYUFBYSxDQUFDO1lBQzdDLEtBQUssZ0NBQWMsQ0FBQyxxQkFBcUI7Z0JBQ3ZDLE9BQU8sbUNBQXFCLENBQUMsbUJBQW1CLENBQUM7WUFDbkQsS0FBSyxnQ0FBYyxDQUFDLHVCQUF1QjtnQkFDekMsSUFBSSxNQUFNLENBQUMsSUFBSSxZQUFZLDRCQUFpQixFQUFFO29CQUM1QyxPQUFPLG1DQUFxQixDQUFDLFVBQVUsQ0FBQztpQkFDekM7cUJBQU07b0JBQ0wsT0FBTyxtQ0FBcUIsQ0FBQyxJQUFJLENBQUM7aUJBQ25DO1lBQ0g7Z0JBQ0UsbUNBQW1DO2dCQUNuQyxPQUFPLG1DQUFxQixDQUFDLElBQUksQ0FBQztTQUNyQztJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEFTVCwgUGFyc2VTb3VyY2VTcGFuLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBDb25maWd1cmF0aW9uSG9zdCwgcmVhZENvbmZpZ3VyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNOYW1lZENsYXNzRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7ZmluZEZpcnN0TWF0Y2hpbmdOb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtHZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZVJlc3BvbnNlLCBHZXRUY2JSZXNwb25zZX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLCBMU1BhcnNlQ29uZmlnSG9zdH0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7Q29tcGxldGlvbkJ1aWxkZXIsIENvbXBsZXRpb25Ob2RlQ29udGV4dH0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7UmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXJ9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb24sIFRhcmdldENvbnRleHQsIFRhcmdldE5vZGVLaW5kfSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGlzVHlwZVNjcmlwdEZpbGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJzZUNvbmZpZ0hvc3Q6IExTUGFyc2VDb25maWdIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnBhcnNlQ29uZmlnSG9zdCA9IG5ldyBMU1BhcnNlQ29uZmlnSG9zdChwcm9qZWN0LnByb2plY3RTZXJ2aWNlLmhvc3QpO1xuICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QpO1xuICAgIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuc3RyYXRlZ3kgPSBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdCk7XG4gICAgdGhpcy5hZGFwdGVyID0gbmV3IExhbmd1YWdlU2VydmljZUFkYXB0ZXIocHJvamVjdCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkgPSBuZXcgQ29tcGlsZXJGYWN0b3J5KHRoaXMuYWRhcHRlciwgdGhpcy5zdHJhdGVneSwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLndhdGNoQ29uZmlnRmlsZShwcm9qZWN0KTtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9ucygpOiBDb21waWxlck9wdGlvbnMge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnM7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmIChpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNvdXJjZUZpbGUsIE9wdGltaXplRm9yLlNpbmdsZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBEZWZpbml0aW9uQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyKS5nZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIHdlIGNhbiBvbmx5IHNob3cgMSBxdWljayBpbmZvLCBqdXN0IHVzZSB0aGUgYm91bmQgYXR0cmlidXRlIGlmIHRoZSB0YXJnZXQgaXMgYSB0d29cbiAgICAvLyB3YXkgYmluZGluZy4gV2UgbWF5IGNvbnNpZGVyIGNvbmNhdGVuYXRpbmcgYWRkaXRpb25hbCBkaXNwbGF5IHBhcnRzIGZyb20gdGhlIG90aGVyIHRhcmdldFxuICAgIC8vIG5vZGVzIG9yIHJlcHJlc2VudGluZyB0aGUgdHdvIHdheSBiaW5kaW5nIGluIHNvbWUgb3RoZXIgbWFubmVyIGluIHRoZSBmdXR1cmUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUXVpY2tJbmZvQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlKS5nZXQoKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UmVuYW1lSW5mbyhmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVuYW1lSW5mbyB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlbmFtZUluZm8gPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRSZW5hbWVJbmZvKGFic29sdXRlRnJvbShmaWxlTmFtZSksIHBvc2l0aW9uKTtcbiAgICBpZiAoIXJlbmFtZUluZm8uY2FuUmVuYW1lKSB7XG4gICAgICByZXR1cm4gcmVuYW1lSW5mbztcbiAgICB9XG5cbiAgICBjb25zdCBxdWlja0luZm8gPSB0aGlzLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICB0aGlzLnRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGNvbnN0IGtpbmQgPSBxdWlja0luZm8/LmtpbmQgPz8gdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgICBjb25zdCBraW5kTW9kaWZpZXJzID0gcXVpY2tJbmZvPy5raW5kTW9kaWZpZXJzID8/IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gICAgcmV0dXJuIHsuLi5yZW5hbWVJbmZvLCBraW5kLCBraW5kTW9kaWZpZXJzfTtcbiAgfVxuXG4gIGZpbmRSZW5hbWVMb2NhdGlvbnMoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHJlYWRvbmx5IHRzLlJlbmFtZUxvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0cyA9IG5ldyBSZWZlcmVuY2VzQW5kUmVuYW1lQnVpbGRlcih0aGlzLnN0cmF0ZWd5LCB0aGlzLnRzTFMsIGNvbXBpbGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmRSZW5hbWVMb2NhdGlvbnMoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0Tm9kZXxBU1Q+fG51bGwge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRm9yIHR3by13YXkgYmluZGluZ3MsIHdlIGFjdHVhbGx5IG9ubHkgbmVlZCB0byBiZSBjb25jZXJuZWQgd2l0aCB0aGUgYm91bmQgYXR0cmlidXRlIGJlY2F1c2VcbiAgICAvLyB0aGUgYmluZGluZ3MgaW4gdGhlIHRlbXBsYXRlIGFyZSB3cml0dGVuIHdpdGggdGhlIGF0dHJpYnV0ZSBuYW1lLCBub3QgdGhlIGV2ZW50IG5hbWUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIHJldHVybiBuZXcgQ29tcGxldGlvbkJ1aWxkZXIoXG4gICAgICAgIHRoaXMudHNMUywgY29tcGlsZXIsIHRlbXBsYXRlSW5mby5jb21wb25lbnQsIG5vZGUsXG4gICAgICAgIG5vZGVDb250ZXh0RnJvbVRhcmdldChwb3NpdGlvbkRldGFpbHMuY29udGV4dCksIHBvc2l0aW9uRGV0YWlscy5wYXJlbnQsXG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy50ZW1wbGF0ZSk7XG4gIH1cblxuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCk6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9ucyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZW50cnlOYW1lKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcG9uZW50TG9jYXRpb25zRm9yVGVtcGxhdGUoZmlsZU5hbWU6IHN0cmluZyk6IEdldENvbXBvbmVudExvY2F0aW9uc0ZvclRlbXBsYXRlUmVzcG9uc2Uge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcjxHZXRDb21wb25lbnRMb2NhdGlvbnNGb3JUZW1wbGF0ZVJlc3BvbnNlPigoY29tcGlsZXIpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICBjb25zdCBjb21wb25lbnREZWNsYXJhdGlvbkxvY2F0aW9uczogdHMuRG9jdW1lbnRTcGFuW10gPVxuICAgICAgICAgIEFycmF5LmZyb20oY29tcG9uZW50cy52YWx1ZXMoKSkubWFwKGMgPT4ge1xuICAgICAgICAgICAgbGV0IGNvbnRleHRTcGFuOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgdGV4dFNwYW46IHRzLlRleHRTcGFuO1xuICAgICAgICAgICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGMpKSB7XG4gICAgICAgICAgICAgIHRleHRTcGFuID0gdHMuY3JlYXRlVGV4dFNwYW5Gcm9tQm91bmRzKGMubmFtZS5nZXRTdGFydCgpLCBjLm5hbWUuZ2V0RW5kKCkpO1xuICAgICAgICAgICAgICBjb250ZXh0U3BhbiA9IHRzLmNyZWF0ZVRleHRTcGFuRnJvbUJvdW5kcyhjLmdldFN0YXJ0KCksIGMuZ2V0RW5kKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGV4dFNwYW4gPSB0cy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoYy5nZXRTdGFydCgpLCBjLmdldEVuZCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGZpbGVOYW1lOiBjLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICAgICAgICAgICAgdGV4dFNwYW4sXG4gICAgICAgICAgICAgIGNvbnRleHRTcGFuLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgIHJldHVybiBjb21wb25lbnREZWNsYXJhdGlvbkxvY2F0aW9ucztcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRjYihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogR2V0VGNiUmVzcG9uc2Uge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcjxHZXRUY2JSZXNwb25zZT4oY29tcGlsZXIgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgdGNiID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFR5cGVDaGVja0Jsb2NrKHRlbXBsYXRlSW5mby5jb21wb25lbnQpO1xuICAgICAgaWYgKHRjYiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2YgPSB0Y2IuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgICBsZXQgc2VsZWN0aW9uczogdHMuVGV4dFNwYW5bXSA9IFtdO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICAgIGlmICh0YXJnZXQgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IHNlbGVjdGlvblNwYW5zOiBBcnJheTxQYXJzZVNvdXJjZVNwYW58QWJzb2x1dGVTb3VyY2VTcGFuPjtcbiAgICAgICAgaWYgKCdub2RlcycgaW4gdGFyZ2V0LmNvbnRleHQpIHtcbiAgICAgICAgICBzZWxlY3Rpb25TcGFucyA9IHRhcmdldC5jb250ZXh0Lm5vZGVzLm1hcChuID0+IG4uc291cmNlU3Bhbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZWN0aW9uU3BhbnMgPSBbdGFyZ2V0LmNvbnRleHQubm9kZS5zb3VyY2VTcGFuXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzZWxlY3Rpb25Ob2RlczogdHMuTm9kZVtdID1cbiAgICAgICAgICAgIHNlbGVjdGlvblNwYW5zXG4gICAgICAgICAgICAgICAgLm1hcChzID0+IGZpbmRGaXJzdE1hdGNoaW5nTm9kZSh0Y2IsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgd2l0aFNwYW46IHMsXG4gICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLk5vZGUgPT4gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG4pOiBuIGlzIHRzLk5vZGUgPT4gbiAhPT0gbnVsbCk7XG5cbiAgICAgICAgc2VsZWN0aW9ucyA9IHNlbGVjdGlvbk5vZGVzLm1hcChuID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnQ6IG4uZ2V0U3RhcnQoc2YpLFxuICAgICAgICAgICAgbGVuZ3RoOiBuLmdldEVuZCgpIC0gbi5nZXRTdGFydChzZiksXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGVOYW1lOiBzZi5maWxlTmFtZSxcbiAgICAgICAgY29udGVudDogc2YuZ2V0RnVsbFRleHQoKSxcbiAgICAgICAgc2VsZWN0aW9ucyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHdpdGhDb21waWxlcjxUPihwOiAoY29tcGlsZXI6IE5nQ29tcGlsZXIpID0+IFQpOiBUIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gcChjb21waWxlcik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMucHJvamVjdDtcbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBjb25maWdTb3VyY2VGaWxlID0gdHMucmVhZEpzb25Db25maWdGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChwYXRoOiBzdHJpbmcpID0+IHByb2plY3QucmVhZEZpbGUocGF0aCkpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzICYmICF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgbWVzc2FnZVRleHQ6ICdTb21lIGxhbmd1YWdlIGZlYXR1cmVzIGFyZSBub3QgYXZhaWxhYmxlLiAnICtcbiAgICAgICAgICAgICdUbyBhY2Nlc3MgYWxsIGZlYXR1cmVzLCBlbmFibGUgYHN0cmljdFRlbXBsYXRlc2AgaW4gYGFuZ3VsYXJDb21waWxlck9wdGlvbnNgLicsXG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuU3VnZ2VzdGlvbixcbiAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLlNVR0dFU1RfU1RSSUNUX1RFTVBMQVRFUyksXG4gICAgICAgIGZpbGU6IGNvbmZpZ1NvdXJjZUZpbGUsXG4gICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKSk7XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgICAgICAgICBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IHtsb2dnZXJ9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0LmdldFByb2plY3ROYW1lKCk7XG4gIGxvZ2dlci5pbmZvKGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgZm9yICR7cHJvamVjdE5hbWV9OiBgICsgSlNPTi5zdHJpbmdpZnkob3B0aW9ucywgbnVsbCwgMikpO1xufVxuXG5mdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IHtvcHRpb25zLCBlcnJvcnN9ID1cbiAgICAgIHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgLyogZXhpc3RpbmdPcHRpb25zICovIHVuZGVmaW5lZCwgaG9zdCk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHByb2plY3Quc2V0UHJvamVjdEVycm9ycyhlcnJvcnMpO1xuICB9XG5cbiAgLy8gUHJvamVjdHMgbG9hZGVkIGludG8gdGhlIExhbmd1YWdlIFNlcnZpY2Ugb2Z0ZW4gaW5jbHVkZSB0ZXN0IGZpbGVzIHdoaWNoIGFyZSBub3QgcGFydCBvZiB0aGVcbiAgLy8gYXBwJ3MgbWFpbiBjb21waWxhdGlvbiB1bml0LCBhbmQgdGhlc2UgdGVzdCBmaWxlcyBvZnRlbiBpbmNsdWRlIGlubGluZSBOZ01vZHVsZXMgdGhhdCBkZWNsYXJlXG4gIC8vIGNvbXBvbmVudHMgZnJvbSB0aGUgYXBwLiBUaGVzZSBkZWNsYXJhdGlvbnMgY29uZmxpY3Qgd2l0aCB0aGUgbWFpbiBkZWNsYXJhdGlvbnMgb2Ygc3VjaFxuICAvLyBjb21wb25lbnRzIGluIHRoZSBhcHAncyBOZ01vZHVsZXMuIFRoaXMgY29uZmxpY3QgaXMgbm90IG5vcm1hbGx5IHByZXNlbnQgZHVyaW5nIHJlZ3VsYXJcbiAgLy8gY29tcGlsYXRpb24gYmVjYXVzZSB0aGUgYXBwIGFuZCB0aGUgdGVzdHMgYXJlIHBhcnQgb2Ygc2VwYXJhdGUgY29tcGlsYXRpb24gdW5pdHMuXG4gIC8vXG4gIC8vIEFzIGEgdGVtcG9yYXJ5IG1pdGlnYXRpb24gb2YgdGhpcyBwcm9ibGVtLCB3ZSBpbnN0cnVjdCB0aGUgY29tcGlsZXIgdG8gaWdub3JlIGNsYXNzZXMgd2hpY2hcbiAgLy8gYXJlIG5vdCBleHBvcnRlZC4gSW4gbWFueSBjYXNlcywgdGhpcyBlbnN1cmVzIHRoZSB0ZXN0IE5nTW9kdWxlcyBhcmUgaWdub3JlZCBieSB0aGUgY29tcGlsZXJcbiAgLy8gYW5kIG9ubHkgdGhlIHJlYWwgY29tcG9uZW50IGRlY2xhcmF0aW9uIGlzIHVzZWQuXG4gIG9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyA9IGZhbHNlO1xuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOlxuICAgIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSB7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zOiBmYWxzZSxcbiAgICBzaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgICByZXR1cm4gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIH0sXG4gICAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBwcm9qZWN0LmdldExhbmd1YWdlU2VydmljZSgpLmdldFByb2dyYW0oKTtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZG9lcyBub3QgaGF2ZSBhIHByb2dyYW0hJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4pIHtcbiAgICAgIGZvciAoY29uc3QgW2ZpbGVOYW1lLCBuZXdUZXh0XSBvZiBjb250ZW50cykge1xuICAgICAgICBjb25zdCBzY3JpcHRJbmZvID0gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKHByb2plY3QsIGZpbGVOYW1lKTtcbiAgICAgICAgY29uc3Qgc25hcHNob3QgPSBzY3JpcHRJbmZvLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHNuYXBzaG90LmdldExlbmd0aCgpO1xuICAgICAgICBzY3JpcHRJbmZvLmVkaXRDb250ZW50KDAsIGxlbmd0aCwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCB0Y2Y6IHN0cmluZyk6IHRzLnNlcnZlci5TY3JpcHRJbmZvIHtcbiAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIFNjcmlwdEluZm8gZm9yIHRoZSB0Y2ZcbiAgY29uc3Qge3Byb2plY3RTZXJ2aWNlfSA9IHByb2plY3Q7XG4gIGxldCBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0U2NyaXB0SW5mbyh0Y2YpO1xuICBpZiAoIXNjcmlwdEluZm8pIHtcbiAgICAvLyBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIG9wZW5lZCBieSBjbGllbnQgdG8gYmUgYWJsZSB0byBzZXQgaXRzIHVzZXItZGVmaW5lZFxuICAgIC8vIGNvbnRlbnQuIFdlIG11c3QgYWxzbyBwcm92aWRlIGZpbGUgY29udGVudCwgb3RoZXJ3aXNlIHRoZSBzZXJ2aWNlIHdpbGxcbiAgICAvLyBhdHRlbXB0IHRvIGZldGNoIHRoZSBjb250ZW50IGZyb20gZGlzayBhbmQgZmFpbC5cbiAgICBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0T3JDcmVhdGVTY3JpcHRJbmZvRm9yTm9ybWFsaXplZFBhdGgoXG4gICAgICAgIHRzLnNlcnZlci50b05vcm1hbGl6ZWRQYXRoKHRjZiksXG4gICAgICAgIHRydWUsICAvLyBvcGVuZWRCeUNsaWVudFxuICAgICAgICAnJywgICAgLy8gZmlsZUNvbnRlbnRcbiAgICAgICAgLy8gc2NyaXB0IGluZm8gYWRkZWQgYnkgcGx1Z2lucyBzaG91bGQgYmUgbWFya2VkIGFzIGV4dGVybmFsLCBzZWVcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvYjIxN2YyMmU3OThjNzgxZjU1ZDE3ZGE3MmVkMDk5YTlkZWU1YzY1MC9zcmMvY29tcGlsZXIvcHJvZ3JhbS50cyNMMTg5Ny1MMTg5OVxuICAgICAgICB0cy5TY3JpcHRLaW5kLkV4dGVybmFsLCAgLy8gc2NyaXB0S2luZFxuICAgICk7XG4gICAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgc2NyaXB0IGluZm8gZm9yICR7dGNmfWApO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgU2NyaXB0SW5mbyB0byBwcm9qZWN0IGlmIGl0J3MgbWlzc2luZy4gQSBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIHBhcnQgb2ZcbiAgLy8gdGhlIHByb2plY3Qgc28gdGhhdCBpdCBiZWNvbWVzIHBhcnQgb2YgdGhlIHByb2dyYW0uXG4gIGlmICghcHJvamVjdC5jb250YWluc1NjcmlwdEluZm8oc2NyaXB0SW5mbykpIHtcbiAgICBwcm9qZWN0LmFkZFJvb3Qoc2NyaXB0SW5mbyk7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdEluZm87XG59XG5cbmZ1bmN0aW9uIG5vZGVDb250ZXh0RnJvbVRhcmdldCh0YXJnZXQ6IFRhcmdldENvbnRleHQpOiBDb21wbGV0aW9uTm9kZUNvbnRleHQge1xuICBzd2l0Y2ggKHRhcmdldC5raW5kKSB7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50VGFnO1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluQm9keUNvbnRleHQ6XG4gICAgICAvLyBDb21wbGV0aW9ucyBpbiBlbGVtZW50IGJvZGllcyBhcmUgZm9yIG5ldyBhdHRyaWJ1dGVzLlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5O1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LlR3b1dheUJpbmRpbmc7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJbktleUNvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXk7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dDpcbiAgICAgIGlmICh0YXJnZXQubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRXZlbnRWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gTm8gc3BlY2lhbCBjb250ZXh0IGlzIGF2YWlsYWJsZS5cbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgfVxufVxuIl19