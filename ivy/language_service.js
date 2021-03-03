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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/ts_utils", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LanguageService = void 0;
    var tslib_1 = require("tslib");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
        function LanguageService(project, tsLS, config) {
            this.project = project;
            this.tsLS = tsLS;
            this.config = config;
            this.parseConfigHost = new adapters_1.LSParseConfigHost(project.projectService.host);
            this.options = parseNgCompilerOptions(project, this.parseConfigHost, config);
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
            var _this = this;
            return this.withCompiler(function (compiler) {
                if (!isTemplateContext(compiler.getNextProgram(), fileName, position)) {
                    return undefined;
                }
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
                return new quick_info_1.QuickInfoBuilder(_this.tsLS, compiler, templateInfo.component, node).get();
            });
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
            return new completions_1.CompletionBuilder(this.tsLS, compiler, templateInfo.component, node, positionDetails);
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
                    _this.options = parseNgCompilerOptions(project, _this.parseConfigHost, _this.config);
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
    function parseNgCompilerOptions(project, host, config) {
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
        // If `forceStrictTemplates` is true, always enable `strictTemplates`
        // regardless of its value in tsconfig.json.
        if (config.forceStrictTemplates === true) {
            options.strictTemplates = true;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILHNEQUE0RjtJQUU1RiwyRUFBbUY7SUFDbkYsMkVBQWlIO0lBQ2pILHVFQUFpRjtJQUNqRixxRUFBdUc7SUFDdkcsbUZBQTZGO0lBQzdGLG1EQUFxRDtJQUdyRCxtRUFBcUU7SUFDckUsbUZBQW1EO0lBQ25ELHlFQUF1RTtJQUN2RSx5RUFBZ0Q7SUFDaEQsdUVBQThDO0lBQzlDLHVFQUF3RDtJQUN4RCxpRkFBcUY7SUFDckYsbUVBQTJHO0lBQzNHLDZEQUFvRTtJQVVwRTtRQU9FLHlCQUNxQixPQUEwQixFQUMxQixJQUF3QixFQUN4QixNQUE2QjtZQUY3QixZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUMxQixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUN4QixXQUFNLEdBQU4sTUFBTSxDQUF1QjtZQUVoRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksNEJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksaUNBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGtDQUFlLENBQUMsSUFBSSxD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LElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxJQUFJLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDdEIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELElBQU0sSUFBSSxlQUFHLHlDQUE4QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsbUNBQ3pELHlDQUE4QixDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsbUNBQ25ELHlDQUE4QixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDN0QsT0FBTyxJQUFJLEtBQUssSUFBSSxJQUFJLHdDQUE2QixDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQztJQUN2RSxDQUFDO0lBRUQsU0FBUywwQkFBMEIsQ0FBQyxPQUFtQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0I7UUFDekYsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7WUFDNUIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxPQUFPLDJCQUFnQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBBU1QsIFBhcnNlU291cmNlU3BhbiwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgQ29uZmlndXJhdGlvbkhvc3QsIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7ZmluZEZpcnN0TWF0Y2hpbmdOb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7R2V0VGNiUmVzcG9uc2V9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlciwgTFNQYXJzZUNvbmZpZ0hvc3R9IGZyb20gJy4vYWRhcHRlcnMnO1xuaW1wb3J0IHtDb21waWxlckZhY3Rvcnl9IGZyb20gJy4vY29tcGlsZXJfZmFjdG9yeSc7XG5pbXBvcnQge0NvbXBsZXRpb25CdWlsZGVyLCBDb21wbGV0aW9uTm9kZUNvbnRleHR9IGZyb20gJy4vY29tcGxldGlvbnMnO1xuaW1wb3J0IHtEZWZpbml0aW9uQnVpbGRlcn0gZnJvbSAnLi9kZWZpbml0aW9ucyc7XG5pbXBvcnQge1F1aWNrSW5mb0J1aWxkZXJ9IGZyb20gJy4vcXVpY2tfaW5mbyc7XG5pbXBvcnQge1JlZmVyZW5jZXNBbmRSZW5hbWVCdWlsZGVyfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9uLCBUYXJnZXRDb250ZXh0LCBUYXJnZXROb2RlS2luZH0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3RzX3V0aWxzJztcbmltcG9ydCB7Z2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgaXNUeXBlU2NyaXB0RmlsZX0gZnJvbSAnLi91dGlscyc7XG5cbmludGVyZmFjZSBMYW5ndWFnZVNlcnZpY2VDb25maWcge1xuICAvKipcbiAgICogSWYgdHJ1ZSwgZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgIGluIEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucyByZWdhcmRsZXNzXG4gICAqIG9mIGl0cyB2YWx1ZSBpbiB0c2NvbmZpZy5qc29uLlxuICAgKi9cbiAgZm9yY2VTdHJpY3RUZW1wbGF0ZXM/OiB0cnVlO1xufVxuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJzZUNvbmZpZ0hvc3Q6IExTUGFyc2VDb25maWdIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb25maWc6IExhbmd1YWdlU2VydmljZUNvbmZpZyxcbiAgKSB7XG4gICAgdGhpcy5wYXJzZUNvbmZpZ0hvc3QgPSBuZXcgTFNQYXJzZUNvbmZpZ0hvc3QocHJvamVjdC5wcm9qZWN0U2VydmljZS5ob3N0KTtcbiAgICB0aGlzLm9wdGlvbnMgPSBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMucGFyc2VDb25maWdIb3N0LCBjb25maWcpO1xuICAgIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuc3RyYXRlZ3kgPSBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdCk7XG4gICAgdGhpcy5hZGFwdGVyID0gbmV3IExhbmd1YWdlU2VydmljZUFkYXB0ZXIocHJvamVjdCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkgPSBuZXcgQ29tcGlsZXJGYWN0b3J5KHRoaXMuYWRhcHRlciwgdGhpcy5zdHJhdGVneSwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLndhdGNoQ29uZmlnRmlsZShwcm9qZWN0KTtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9ucygpOiBDb21waWxlck9wdGlvbnMge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnM7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmIChpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNvdXJjZUZpbGUsIE9wdGltaXplRm9yLlNpbmdsZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcigoY29tcGlsZXIpID0+IHtcbiAgICAgIGlmICghaXNJbkFuZ3VsYXJDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcigoY29tcGlsZXIpID0+IHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZUNvbnRleHQoY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKSwgZmlsZU5hbWUsIHBvc2l0aW9uKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBEZWZpbml0aW9uQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyKVxuICAgICAgICAgIC5nZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgLy8gQmVjYXVzZSB3ZSBjYW4gb25seSBzaG93IDEgcXVpY2sgaW5mbywganVzdCB1c2UgdGhlIGJvdW5kIGF0dHJpYnV0ZSBpZiB0aGUgdGFyZ2V0IGlzIGEgdHdvXG4gICAgICAvLyB3YXkgYmluZGluZy4gV2UgbWF5IGNvbnNpZGVyIGNvbmNhdGVuYXRpbmcgYWRkaXRpb25hbCBkaXNwbGF5IHBhcnRzIGZyb20gdGhlIG90aGVyIHRhcmdldFxuICAgICAgLy8gbm9kZXMgb3IgcmVwcmVzZW50aW5nIHRoZSB0d28gd2F5IGJpbmRpbmcgaW4gc29tZSBvdGhlciBtYW5uZXIgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGU7XG4gICAgICByZXR1cm4gbmV3IFF1aWNrSW5mb0J1aWxkZXIodGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgbm9kZSkuZ2V0KCk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHRzID0gbmV3IFJlZmVyZW5jZXNBbmRSZW5hbWVCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFJlbmFtZUluZm8oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlbmFtZUluZm8ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZW5hbWVJbmZvID0gbmV3IFJlZmVyZW5jZXNBbmRSZW5hbWVCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZ2V0UmVuYW1lSW5mbyhhYnNvbHV0ZUZyb20oZmlsZU5hbWUpLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZW5hbWVJbmZvLmNhblJlbmFtZSkge1xuICAgICAgcmV0dXJuIHJlbmFtZUluZm87XG4gICAgfVxuXG4gICAgY29uc3QgcXVpY2tJbmZvID0gdGhpcy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbikgPz9cbiAgICAgICAgdGhpcy50c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBjb25zdCBraW5kID0gcXVpY2tJbmZvPy5raW5kID8/IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gICAgY29uc3Qga2luZE1vZGlmaWVycyA9IHF1aWNrSW5mbz8ua2luZE1vZGlmaWVycyA/PyB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duO1xuICAgIHJldHVybiB7Li4ucmVuYW1lSW5mbywga2luZCwga2luZE1vZGlmaWVyc307XG4gIH1cblxuICBmaW5kUmVuYW1lTG9jYXRpb25zKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kUmVuYW1lTG9jYXRpb25zKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdE5vZGV8QVNUPnxudWxsIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZvciB0d28td2F5IGJpbmRpbmdzLCB3ZSBhY3R1YWxseSBvbmx5IG5lZWQgdG8gYmUgY29uY2VybmVkIHdpdGggdGhlIGJvdW5kIGF0dHJpYnV0ZSBiZWNhdXNlXG4gICAgLy8gdGhlIGJpbmRpbmdzIGluIHRoZSB0ZW1wbGF0ZSBhcmUgd3JpdHRlbiB3aXRoIHRoZSBhdHRyaWJ1dGUgbmFtZSwgbm90IHRoZSBldmVudCBuYW1lLlxuICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzWzBdIDpcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZTtcbiAgICByZXR1cm4gbmV3IENvbXBsZXRpb25CdWlsZGVyKFxuICAgICAgICB0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlLCBwb3NpdGlvbkRldGFpbHMpO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcigoY29tcGlsZXIpID0+IHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZUNvbnRleHQoY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKSwgZmlsZU5hbWUsIHBvc2l0aW9uKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBidWlsZGVyLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53aXRoQ29tcGlsZXIoKGNvbXBpbGVyKSA9PiB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVDb250ZXh0KGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCksIGZpbGVOYW1lLCBwb3NpdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChlbnRyeU5hbWUpO1xuICAgICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VGNiKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBHZXRUY2JSZXNwb25zZXx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLndpdGhDb21waWxlcjxHZXRUY2JSZXNwb25zZXx1bmRlZmluZWQ+KGNvbXBpbGVyID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gICAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRjYiA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRUeXBlQ2hlY2tCbG9jayh0ZW1wbGF0ZUluZm8uY29tcG9uZW50KTtcbiAgICAgIGlmICh0Y2IgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNmID0gdGNiLmdldFNvdXJjZUZpbGUoKTtcblxuICAgICAgbGV0IHNlbGVjdGlvbnM6IHRzLlRleHRTcGFuW10gPSBbXTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgICBpZiAodGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICAgIGxldCBzZWxlY3Rpb25TcGFuczogQXJyYXk8UGFyc2VTb3VyY2VTcGFufEFic29sdXRlU291cmNlU3Bhbj47XG4gICAgICAgIGlmICgnbm9kZXMnIGluIHRhcmdldC5jb250ZXh0KSB7XG4gICAgICAgICAgc2VsZWN0aW9uU3BhbnMgPSB0YXJnZXQuY29udGV4dC5ub2Rlcy5tYXAobiA9PiBuLnNvdXJjZVNwYW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGVjdGlvblNwYW5zID0gW3RhcmdldC5jb250ZXh0Lm5vZGUuc291cmNlU3Bhbl07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VsZWN0aW9uTm9kZXM6IHRzLk5vZGVbXSA9XG4gICAgICAgICAgICBzZWxlY3Rpb25TcGFuc1xuICAgICAgICAgICAgICAgIC5tYXAocyA9PiBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGNiLCB7XG4gICAgICAgICAgICAgICAgICAgICAgIHdpdGhTcGFuOiBzLFxuICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Ob2RlID0+IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChuKTogbiBpcyB0cy5Ob2RlID0+IG4gIT09IG51bGwpO1xuXG4gICAgICAgIHNlbGVjdGlvbnMgPSBzZWxlY3Rpb25Ob2Rlcy5tYXAobiA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0OiBuLmdldFN0YXJ0KHNmKSxcbiAgICAgICAgICAgIGxlbmd0aDogbi5nZXRFbmQoKSAtIG4uZ2V0U3RhcnQoc2YpLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBmaWxlTmFtZTogc2YuZmlsZU5hbWUsXG4gICAgICAgIGNvbnRlbnQ6IHNmLmdldEZ1bGxUZXh0KCksXG4gICAgICAgIHNlbGVjdGlvbnMsXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB3aXRoQ29tcGlsZXI8VD4ocDogKGNvbXBpbGVyOiBOZ0NvbXBpbGVyKSA9PiBUKTogVCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHAoY29tcGlsZXIpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLnByb2plY3Q7XG4gICAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgY29uZmlnU291cmNlRmlsZSA9IHRzLnJlYWRKc29uQ29uZmlnRmlsZShcbiAgICAgICAgcHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAocGF0aDogc3RyaW5nKSA9PiBwcm9qZWN0LnJlYWRGaWxlKHBhdGgpKTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcyAmJiAhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiAnU29tZSBsYW5ndWFnZSBmZWF0dXJlcyBhcmUgbm90IGF2YWlsYWJsZS4gJyArXG4gICAgICAgICAgICAnVG8gYWNjZXNzIGFsbCBmZWF0dXJlcywgZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgIGluIGBhbmd1bGFyQ29tcGlsZXJPcHRpb25zYC4nLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LlN1Z2dlc3Rpb24sXG4gICAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5TVUdHRVNUX1NUUklDVF9URU1QTEFURVMpLFxuICAgICAgICBmaWxlOiBjb25maWdTb3VyY2VGaWxlLFxuICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCkpO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSB3YXRjaENvbmZpZ0ZpbGUocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpIHtcbiAgICAvLyBUT0RPOiBDaGVjayB0aGUgY2FzZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGRpc3Bvc2VkLiBBbiBJbmZlcnJlZFByb2plY3RcbiAgICAvLyBjb3VsZCBiZSBkaXNwb3NlZCB3aGVuIGEgdHNjb25maWcuanNvbiBpcyBhZGRlZCB0byB0aGUgd29ya3NwYWNlLFxuICAgIC8vIGluIHdoaWNoIGNhc2UgaXQgYmVjb21lcyBhIENvbmZpZ3VyZWRQcm9qZWN0IChvciB2aWNlLXZlcnNhKS5cbiAgICAvLyBXZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBGaWxlV2F0Y2hlciBpcyBjbG9zZWQuXG4gICAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2hvc3R9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgICBob3N0LndhdGNoRmlsZShcbiAgICAgICAgcHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAoZmlsZU5hbWU6IHN0cmluZywgZXZlbnRLaW5kOiB0cy5GaWxlV2F0Y2hlckV2ZW50S2luZCkgPT4ge1xuICAgICAgICAgIHByb2plY3QubG9nKGBDb25maWcgZmlsZSBjaGFuZ2VkOiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgIGlmIChldmVudEtpbmQgPT09IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kLkNoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QsIHRoaXMuY29uZmlnKTtcbiAgICAgICAgICAgIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMpIHtcbiAgY29uc3Qge2xvZ2dlcn0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICBjb25zdCBwcm9qZWN0TmFtZSA9IHByb2plY3QuZ2V0UHJvamVjdE5hbWUoKTtcbiAgbG9nZ2VyLmluZm8oYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucyBmb3IgJHtwcm9qZWN0TmFtZX06IGAgKyBKU09OLnN0cmluZ2lmeShvcHRpb25zLCBudWxsLCAyKSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTmdDb21waWxlck9wdGlvbnMoXG4gICAgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIGhvc3Q6IENvbmZpZ3VyYXRpb25Ib3N0LFxuICAgIGNvbmZpZzogTGFuZ3VhZ2VTZXJ2aWNlQ29uZmlnKTogQ29tcGlsZXJPcHRpb25zIHtcbiAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgY29uc3Qge29wdGlvbnMsIGVycm9yc30gPVxuICAgICAgcmVhZENvbmZpZ3VyYXRpb24ocHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAvKiBleGlzdGluZ09wdGlvbnMgKi8gdW5kZWZpbmVkLCBob3N0KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgcHJvamVjdC5zZXRQcm9qZWN0RXJyb3JzKGVycm9ycyk7XG4gIH1cblxuICAvLyBQcm9qZWN0cyBsb2FkZWQgaW50byB0aGUgTGFuZ3VhZ2UgU2VydmljZSBvZnRlbiBpbmNsdWRlIHRlc3QgZmlsZXMgd2hpY2ggYXJlIG5vdCBwYXJ0IG9mIHRoZVxuICAvLyBhcHAncyBtYWluIGNvbXBpbGF0aW9uIHVuaXQsIGFuZCB0aGVzZSB0ZXN0IGZpbGVzIG9mdGVuIGluY2x1ZGUgaW5saW5lIE5nTW9kdWxlcyB0aGF0IGRlY2xhcmVcbiAgLy8gY29tcG9uZW50cyBmcm9tIHRoZSBhcHAuIFRoZXNlIGRlY2xhcmF0aW9ucyBjb25mbGljdCB3aXRoIHRoZSBtYWluIGRlY2xhcmF0aW9ucyBvZiBzdWNoXG4gIC8vIGNvbXBvbmVudHMgaW4gdGhlIGFwcCdzIE5nTW9kdWxlcy4gVGhpcyBjb25mbGljdCBpcyBub3Qgbm9ybWFsbHkgcHJlc2VudCBkdXJpbmcgcmVndWxhclxuICAvLyBjb21waWxhdGlvbiBiZWNhdXNlIHRoZSBhcHAgYW5kIHRoZSB0ZXN0cyBhcmUgcGFydCBvZiBzZXBhcmF0ZSBjb21waWxhdGlvbiB1bml0cy5cbiAgLy9cbiAgLy8gQXMgYSB0ZW1wb3JhcnkgbWl0aWdhdGlvbiBvZiB0aGlzIHByb2JsZW0sIHdlIGluc3RydWN0IHRoZSBjb21waWxlciB0byBpZ25vcmUgY2xhc3NlcyB3aGljaFxuICAvLyBhcmUgbm90IGV4cG9ydGVkLiBJbiBtYW55IGNhc2VzLCB0aGlzIGVuc3VyZXMgdGhlIHRlc3QgTmdNb2R1bGVzIGFyZSBpZ25vcmVkIGJ5IHRoZSBjb21waWxlclxuICAvLyBhbmQgb25seSB0aGUgcmVhbCBjb21wb25lbnQgZGVjbGFyYXRpb24gaXMgdXNlZC5cbiAgb3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzID0gZmFsc2U7XG5cbiAgLy8gSWYgYGZvcmNlU3RyaWN0VGVtcGxhdGVzYCBpcyB0cnVlLCBhbHdheXMgZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgXG4gIC8vIHJlZ2FyZGxlc3Mgb2YgaXRzIHZhbHVlIGluIHRzY29uZmlnLmpzb24uXG4gIGlmIChjb25maWcuZm9yY2VTdHJpY3RUZW1wbGF0ZXMgPT09IHRydWUpIHtcbiAgICBvcHRpb25zLnN0cmljdFRlbXBsYXRlcyA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5KHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTpcbiAgICBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kge1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRzSW5saW5lT3BlcmF0aW9uczogZmFsc2UsXG4gICAgc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQWJzb2x1dGVGc1BhdGgge1xuICAgICAgcmV0dXJuIFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCkpKTtcbiAgICB9LFxuICAgIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gcHJvamVjdC5nZXRMYW5ndWFnZVNlcnZpY2UoKS5nZXRQcm9ncmFtKCk7XG4gICAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYW5ndWFnZSBzZXJ2aWNlIGRvZXMgbm90IGhhdmUgYSBwcm9ncmFtIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgfSxcbiAgICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KSB7XG4gICAgICBmb3IgKGNvbnN0IFtmaWxlTmFtZSwgbmV3VGV4dF0gb2YgY29udGVudHMpIHtcbiAgICAgICAgY29uc3Qgc2NyaXB0SW5mbyA9IGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhwcm9qZWN0LCBmaWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IHNuYXBzaG90ID0gc2NyaXB0SW5mby5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBzbmFwc2hvdC5nZXRMZW5ndGgoKTtcbiAgICAgICAgc2NyaXB0SW5mby5lZGl0Q29udGVudCgwLCBsZW5ndGgsIG5ld1RleHQpO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhcbiAgICBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgdGNmOiBzdHJpbmcpOiB0cy5zZXJ2ZXIuU2NyaXB0SW5mbyB7XG4gIC8vIEZpcnN0IGNoZWNrIGlmIHRoZXJlIGlzIGFscmVhZHkgYSBTY3JpcHRJbmZvIGZvciB0aGUgdGNmXG4gIGNvbnN0IHtwcm9qZWN0U2VydmljZX0gPSBwcm9qZWN0O1xuICBsZXQgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldFNjcmlwdEluZm8odGNmKTtcbiAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgLy8gU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBvcGVuZWQgYnkgY2xpZW50IHRvIGJlIGFibGUgdG8gc2V0IGl0cyB1c2VyLWRlZmluZWRcbiAgICAvLyBjb250ZW50LiBXZSBtdXN0IGFsc28gcHJvdmlkZSBmaWxlIGNvbnRlbnQsIG90aGVyd2lzZSB0aGUgc2VydmljZSB3aWxsXG4gICAgLy8gYXR0ZW1wdCB0byBmZXRjaCB0aGUgY29udGVudCBmcm9tIGRpc2sgYW5kIGZhaWwuXG4gICAgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldE9yQ3JlYXRlU2NyaXB0SW5mb0Zvck5vcm1hbGl6ZWRQYXRoKFxuICAgICAgICB0cy5zZXJ2ZXIudG9Ob3JtYWxpemVkUGF0aCh0Y2YpLFxuICAgICAgICB0cnVlLCAgLy8gb3BlbmVkQnlDbGllbnRcbiAgICAgICAgJycsICAgIC8vIGZpbGVDb250ZW50XG4gICAgICAgIC8vIHNjcmlwdCBpbmZvIGFkZGVkIGJ5IHBsdWdpbnMgc2hvdWxkIGJlIG1hcmtlZCBhcyBleHRlcm5hbCwgc2VlXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL2IyMTdmMjJlNzk4Yzc4MWY1NWQxN2RhNzJlZDA5OWE5ZGVlNWM2NTAvc3JjL2NvbXBpbGVyL3Byb2dyYW0udHMjTDE4OTctTDE4OTlcbiAgICAgICAgdHMuU2NyaXB0S2luZC5FeHRlcm5hbCwgIC8vIHNjcmlwdEtpbmRcbiAgICApO1xuICAgIGlmICghc2NyaXB0SW5mbykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHNjcmlwdCBpbmZvIGZvciAke3RjZn1gKTtcbiAgICB9XG4gIH1cbiAgLy8gQWRkIFNjcmlwdEluZm8gdG8gcHJvamVjdCBpZiBpdCdzIG1pc3NpbmcuIEEgU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBwYXJ0IG9mXG4gIC8vIHRoZSBwcm9qZWN0IHNvIHRoYXQgaXQgYmVjb21lcyBwYXJ0IG9mIHRoZSBwcm9ncmFtLlxuICBpZiAoIXByb2plY3QuY29udGFpbnNTY3JpcHRJbmZvKHNjcmlwdEluZm8pKSB7XG4gICAgcHJvamVjdC5hZGRSb290KHNjcmlwdEluZm8pO1xuICB9XG4gIHJldHVybiBzY3JpcHRJbmZvO1xufVxuXG5mdW5jdGlvbiBpc1RlbXBsYXRlQ29udGV4dChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmICghaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAvLyBJZiB3ZSBhcmVuJ3QgaW4gYSBUUyBmaWxlLCB3ZSBtdXN0IGJlIGluIGFuIEhUTUwgZmlsZSwgd2hpY2ggd2UgdHJlYXQgYXMgdGVtcGxhdGUgY29udGV4dFxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGVBdFBvc2l0aW9uKHByb2dyYW0sIGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gIGlmIChub2RlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgYXNnbiA9IGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZShub2RlLCAndGVtcGxhdGUnKTtcbiAgaWYgKGFzZ24gPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKGFzZ24pICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0luQW5ndWxhckNvbnRleHQocHJvZ3JhbTogdHMuUHJvZ3JhbSwgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcikge1xuICBpZiAoIWlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZUF0UG9zaXRpb24ocHJvZ3JhbSwgZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUobm9kZSwgJ3RlbXBsYXRlJykgPz9cbiAgICAgIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZShub2RlLCAndGVtcGxhdGVVcmwnKSA/P1xuICAgICAgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKG5vZGUucGFyZW50LCAnc3R5bGVVcmxzJyk7XG4gIHJldHVybiBhc2duICE9PSBudWxsICYmIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKGFzZ24pICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBmaW5kVGlnaHRlc3ROb2RlQXRQb3NpdGlvbihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKSB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmaW5kVGlnaHRlc3ROb2RlKHNvdXJjZUZpbGUsIHBvc2l0aW9uKTtcbn1cbiJdfQ==