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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyRztJQUMzRyxzREFBNEY7SUFFNUYsMkVBQW1GO0lBQ25GLDJFQUFpSDtJQUNqSCx1RUFBaUY7SUFDakYscUVBQXVHO0lBQ3ZHLG1GQUE2RjtJQUM3RixtREFBcUQ7SUFHckQsbUVBQXFFO0lBQ3JFLG1GQUFtRDtJQUNuRCx5RUFBdUU7SUFDdkUseUVBQWdEO0lBQ2hELHVFQUE4QztJQUM5Qyx1RUFBd0Q7SUFDeEQsaUZBQXFGO0lBQ3JGLDZEQUFvRTtJQUVwRTtRQU9FLHlCQUNxQixPQUEwQixFQUFtQixJQUF3QjtZQUFyRSxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUFtQixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUN4RixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksNEJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDckUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQ0FBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8s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LENBQUM7WUFDbkQsS0FBSyxnQ0FBYyxDQUFDLHVCQUF1QjtnQkFDekMsSUFBSSxNQUFNLENBQUMsSUFBSSxZQUFZLDRCQUFpQixFQUFFO29CQUM1QyxPQUFPLG1DQUFxQixDQUFDLFVBQVUsQ0FBQztpQkFDekM7cUJBQU07b0JBQ0wsT0FBTyxtQ0FBcUIsQ0FBQyxJQUFJLENBQUM7aUJBQ25DO1lBQ0g7Z0JBQ0UsbUNBQW1DO2dCQUNuQyxPQUFPLG1DQUFxQixDQUFDLElBQUksQ0FBQztTQUNyQztJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEFTVCwgUGFyc2VTb3VyY2VTcGFuLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBDb25maWd1cmF0aW9uSG9zdCwgcmVhZENvbmZpZ3VyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2snO1xuaW1wb3J0IHtPcHRpbWl6ZUZvciwgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtmaW5kRmlyc3RNYXRjaGluZ05vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb21tZW50cyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtHZXRUY2JSZXNwb25zZX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLCBMU1BhcnNlQ29uZmlnSG9zdH0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7Q29tcGxldGlvbkJ1aWxkZXIsIENvbXBsZXRpb25Ob2RlQ29udGV4dH0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7UmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXJ9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb24sIFRhcmdldENvbnRleHQsIFRhcmdldE5vZGVLaW5kfSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGlzVHlwZVNjcmlwdEZpbGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJzZUNvbmZpZ0hvc3Q6IExTUGFyc2VDb25maWdIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnBhcnNlQ29uZmlnSG9zdCA9IG5ldyBMU1BhcnNlQ29uZmlnSG9zdChwcm9qZWN0LnByb2plY3RTZXJ2aWNlLmhvc3QpO1xuICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QpO1xuICAgIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuc3RyYXRlZ3kgPSBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdCk7XG4gICAgdGhpcy5hZGFwdGVyID0gbmV3IExhbmd1YWdlU2VydmljZUFkYXB0ZXIocHJvamVjdCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkgPSBuZXcgQ29tcGlsZXJGYWN0b3J5KHRoaXMuYWRhcHRlciwgdGhpcy5zdHJhdGVneSwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLndhdGNoQ29uZmlnRmlsZShwcm9qZWN0KTtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9ucygpOiBDb21waWxlck9wdGlvbnMge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnM7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmIChpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNvdXJjZUZpbGUsIE9wdGltaXplRm9yLlNpbmdsZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBEZWZpbml0aW9uQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyKS5nZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIHdlIGNhbiBvbmx5IHNob3cgMSBxdWljayBpbmZvLCBqdXN0IHVzZSB0aGUgYm91bmQgYXR0cmlidXRlIGlmIHRoZSB0YXJnZXQgaXMgYSB0d29cbiAgICAvLyB3YXkgYmluZGluZy4gV2UgbWF5IGNvbnNpZGVyIGNvbmNhdGVuYXRpbmcgYWRkaXRpb25hbCBkaXNwbGF5IHBhcnRzIGZyb20gdGhlIG90aGVyIHRhcmdldFxuICAgIC8vIG5vZGVzIG9yIHJlcHJlc2VudGluZyB0aGUgdHdvIHdheSBiaW5kaW5nIGluIHNvbWUgb3RoZXIgbWFubmVyIGluIHRoZSBmdXR1cmUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUXVpY2tJbmZvQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlKS5nZXQoKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UmVuYW1lSW5mbyhmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVuYW1lSW5mbyB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlbmFtZUluZm8gPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRSZW5hbWVJbmZvKGFic29sdXRlRnJvbShmaWxlTmFtZSksIHBvc2l0aW9uKTtcbiAgICBpZiAoIXJlbmFtZUluZm8uY2FuUmVuYW1lKSB7XG4gICAgICByZXR1cm4gcmVuYW1lSW5mbztcbiAgICB9XG5cbiAgICBjb25zdCBxdWlja0luZm8gPSB0aGlzLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKSA/P1xuICAgICAgICB0aGlzLnRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGNvbnN0IGtpbmQgPSBxdWlja0luZm8/LmtpbmQgPz8gdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgICBjb25zdCBraW5kTW9kaWZpZXJzID0gcXVpY2tJbmZvPy5raW5kTW9kaWZpZXJzID8/IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gICAgcmV0dXJuIHsuLi5yZW5hbWVJbmZvLCBraW5kLCBraW5kTW9kaWZpZXJzfTtcbiAgfVxuXG4gIGZpbmRSZW5hbWVMb2NhdGlvbnMoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHJlYWRvbmx5IHRzLlJlbmFtZUxvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0cyA9IG5ldyBSZWZlcmVuY2VzQW5kUmVuYW1lQnVpbGRlcih0aGlzLnN0cmF0ZWd5LCB0aGlzLnRzTFMsIGNvbXBpbGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmRSZW5hbWVMb2NhdGlvbnMoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0Tm9kZXxBU1Q+fG51bGwge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRm9yIHR3by13YXkgYmluZGluZ3MsIHdlIGFjdHVhbGx5IG9ubHkgbmVlZCB0byBiZSBjb25jZXJuZWQgd2l0aCB0aGUgYm91bmQgYXR0cmlidXRlIGJlY2F1c2VcbiAgICAvLyB0aGUgYmluZGluZ3MgaW4gdGhlIHRlbXBsYXRlIGFyZSB3cml0dGVuIHdpdGggdGhlIGF0dHJpYnV0ZSBuYW1lLCBub3QgdGhlIGV2ZW50IG5hbWUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIHJldHVybiBuZXcgQ29tcGxldGlvbkJ1aWxkZXIoXG4gICAgICAgIHRoaXMudHNMUywgY29tcGlsZXIsIHRlbXBsYXRlSW5mby5jb21wb25lbnQsIG5vZGUsXG4gICAgICAgIG5vZGVDb250ZXh0RnJvbVRhcmdldChwb3NpdGlvbkRldGFpbHMuY29udGV4dCksIHBvc2l0aW9uRGV0YWlscy5wYXJlbnQsXG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy50ZW1wbGF0ZSk7XG4gIH1cblxuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCk6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9ucyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZW50cnlOYW1lKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0VGNiKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBHZXRUY2JSZXNwb25zZSB7XG4gICAgcmV0dXJuIHRoaXMud2l0aENvbXBpbGVyPEdldFRjYlJlc3BvbnNlPihjb21waWxlciA9PiB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCB0Y2IgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0VHlwZUNoZWNrQmxvY2sodGVtcGxhdGVJbmZvLmNvbXBvbmVudCk7XG4gICAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCBzZiA9IHRjYi5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICAgIGxldCBzZWxlY3Rpb25zOiB0cy5UZXh0U3BhbltdID0gW107XG4gICAgICBjb25zdCB0YXJnZXQgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHRhcmdldCAhPT0gbnVsbCkge1xuICAgICAgICBsZXQgc2VsZWN0aW9uU3BhbnM6IEFycmF5PFBhcnNlU291cmNlU3BhbnxBYnNvbHV0ZVNvdXJjZVNwYW4+O1xuICAgICAgICBpZiAoJ25vZGVzJyBpbiB0YXJnZXQuY29udGV4dCkge1xuICAgICAgICAgIHNlbGVjdGlvblNwYW5zID0gdGFyZ2V0LmNvbnRleHQubm9kZXMubWFwKG4gPT4gbi5zb3VyY2VTcGFuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxlY3Rpb25TcGFucyA9IFt0YXJnZXQuY29udGV4dC5ub2RlLnNvdXJjZVNwYW5dO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdGlvbk5vZGVzOiB0cy5Ob2RlW10gPVxuICAgICAgICAgICAgc2VsZWN0aW9uU3BhbnNcbiAgICAgICAgICAgICAgICAubWFwKHMgPT4gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKHRjYiwge1xuICAgICAgICAgICAgICAgICAgICAgICB3aXRoU3BhbjogcyxcbiAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuTm9kZSA9PiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobik6IG4gaXMgdHMuTm9kZSA9PiBuICE9PSBudWxsKTtcblxuICAgICAgICBzZWxlY3Rpb25zID0gc2VsZWN0aW9uTm9kZXMubWFwKG4gPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGFydDogbi5nZXRTdGFydChzZiksXG4gICAgICAgICAgICBsZW5ndGg6IG4uZ2V0RW5kKCkgLSBuLmdldFN0YXJ0KHNmKSxcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmlsZU5hbWU6IHNmLmZpbGVOYW1lLFxuICAgICAgICBjb250ZW50OiBzZi5nZXRGdWxsVGV4dCgpLFxuICAgICAgICBzZWxlY3Rpb25zLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgd2l0aENvbXBpbGVyPFQ+KHA6IChjb21waWxlcjogTmdDb21waWxlcikgPT4gVCk6IFQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHQgPSBwKGNvbXBpbGVyKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBwcm9qZWN0ID0gdGhpcy5wcm9qZWN0O1xuICAgIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGNvbmZpZ1NvdXJjZUZpbGUgPSB0cy5yZWFkSnNvbkNvbmZpZ0ZpbGUoXG4gICAgICAgIHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgKHBhdGg6IHN0cmluZykgPT4gcHJvamVjdC5yZWFkRmlsZShwYXRoKSk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgJiYgIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBtZXNzYWdlVGV4dDogJ1NvbWUgbGFuZ3VhZ2UgZmVhdHVyZXMgYXJlIG5vdCBhdmFpbGFibGUuICcgK1xuICAgICAgICAgICAgJ1RvIGFjY2VzcyBhbGwgZmVhdHVyZXMsIGVuYWJsZSBgc3RyaWN0VGVtcGxhdGVzYCBpbiBgYW5ndWxhckNvbXBpbGVyT3B0aW9uc2AuJyxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5TdWdnZXN0aW9uLFxuICAgICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU1VHR0VTVF9TVFJJQ1RfVEVNUExBVEVTKSxcbiAgICAgICAgZmlsZTogY29uZmlnU291cmNlRmlsZSxcbiAgICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpKTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgd2F0Y2hDb25maWdGaWxlKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KSB7XG4gICAgLy8gVE9ETzogQ2hlY2sgdGhlIGNhc2Ugd2hlbiB0aGUgcHJvamVjdCBpcyBkaXNwb3NlZC4gQW4gSW5mZXJyZWRQcm9qZWN0XG4gICAgLy8gY291bGQgYmUgZGlzcG9zZWQgd2hlbiBhIHRzY29uZmlnLmpzb24gaXMgYWRkZWQgdG8gdGhlIHdvcmtzcGFjZSxcbiAgICAvLyBpbiB3aGljaCBjYXNlIGl0IGJlY29tZXMgYSBDb25maWd1cmVkUHJvamVjdCAob3IgdmljZS12ZXJzYSkuXG4gICAgLy8gV2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgRmlsZVdhdGNoZXIgaXMgY2xvc2VkLlxuICAgIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHtob3N0fSA9IHByb2plY3QucHJvamVjdFNlcnZpY2U7XG4gICAgaG9zdC53YXRjaEZpbGUoXG4gICAgICAgIHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgKGZpbGVOYW1lOiBzdHJpbmcsIGV2ZW50S2luZDogdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQpID0+IHtcbiAgICAgICAgICBwcm9qZWN0LmxvZyhgQ29uZmlnIGZpbGUgY2hhbmdlZDogJHtmaWxlTmFtZX1gKTtcbiAgICAgICAgICBpZiAoZXZlbnRLaW5kID09PSB0cy5GaWxlV2F0Y2hlckV2ZW50S2luZC5DaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMucGFyc2VDb25maWdIb3N0KTtcbiAgICAgICAgICAgIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMpIHtcbiAgY29uc3Qge2xvZ2dlcn0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICBjb25zdCBwcm9qZWN0TmFtZSA9IHByb2plY3QuZ2V0UHJvamVjdE5hbWUoKTtcbiAgbG9nZ2VyLmluZm8oYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucyBmb3IgJHtwcm9qZWN0TmFtZX06IGAgKyBKU09OLnN0cmluZ2lmeShvcHRpb25zLCBudWxsLCAyKSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTmdDb21waWxlck9wdGlvbnMoXG4gICAgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIGhvc3Q6IENvbmZpZ3VyYXRpb25Ib3N0KTogQ29tcGlsZXJPcHRpb25zIHtcbiAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgY29uc3Qge29wdGlvbnMsIGVycm9yc30gPVxuICAgICAgcmVhZENvbmZpZ3VyYXRpb24ocHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAvKiBleGlzdGluZ09wdGlvbnMgKi8gdW5kZWZpbmVkLCBob3N0KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgcHJvamVjdC5zZXRQcm9qZWN0RXJyb3JzKGVycm9ycyk7XG4gIH1cblxuICAvLyBQcm9qZWN0cyBsb2FkZWQgaW50byB0aGUgTGFuZ3VhZ2UgU2VydmljZSBvZnRlbiBpbmNsdWRlIHRlc3QgZmlsZXMgd2hpY2ggYXJlIG5vdCBwYXJ0IG9mIHRoZVxuICAvLyBhcHAncyBtYWluIGNvbXBpbGF0aW9uIHVuaXQsIGFuZCB0aGVzZSB0ZXN0IGZpbGVzIG9mdGVuIGluY2x1ZGUgaW5saW5lIE5nTW9kdWxlcyB0aGF0IGRlY2xhcmVcbiAgLy8gY29tcG9uZW50cyBmcm9tIHRoZSBhcHAuIFRoZXNlIGRlY2xhcmF0aW9ucyBjb25mbGljdCB3aXRoIHRoZSBtYWluIGRlY2xhcmF0aW9ucyBvZiBzdWNoXG4gIC8vIGNvbXBvbmVudHMgaW4gdGhlIGFwcCdzIE5nTW9kdWxlcy4gVGhpcyBjb25mbGljdCBpcyBub3Qgbm9ybWFsbHkgcHJlc2VudCBkdXJpbmcgcmVndWxhclxuICAvLyBjb21waWxhdGlvbiBiZWNhdXNlIHRoZSBhcHAgYW5kIHRoZSB0ZXN0cyBhcmUgcGFydCBvZiBzZXBhcmF0ZSBjb21waWxhdGlvbiB1bml0cy5cbiAgLy9cbiAgLy8gQXMgYSB0ZW1wb3JhcnkgbWl0aWdhdGlvbiBvZiB0aGlzIHByb2JsZW0sIHdlIGluc3RydWN0IHRoZSBjb21waWxlciB0byBpZ25vcmUgY2xhc3NlcyB3aGljaFxuICAvLyBhcmUgbm90IGV4cG9ydGVkLiBJbiBtYW55IGNhc2VzLCB0aGlzIGVuc3VyZXMgdGhlIHRlc3QgTmdNb2R1bGVzIGFyZSBpZ25vcmVkIGJ5IHRoZSBjb21waWxlclxuICAvLyBhbmQgb25seSB0aGUgcmVhbCBjb21wb25lbnQgZGVjbGFyYXRpb24gaXMgdXNlZC5cbiAgb3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzID0gZmFsc2U7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6XG4gICAgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5IHtcbiAgcmV0dXJuIHtcbiAgICBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnM6IGZhbHNlLFxuICAgIHNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IEFic29sdXRlRnNQYXRoIHtcbiAgICAgIHJldHVybiBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IoYWJzb2x1dGVGcm9tU291cmNlRmlsZShjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpKSk7XG4gICAgfSxcbiAgICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IHByb2plY3QuZ2V0TGFuZ3VhZ2VTZXJ2aWNlKCkuZ2V0UHJvZ3JhbSgpO1xuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2Ugc2VydmljZSBkb2VzIG5vdCBoYXZlIGEgcHJvZ3JhbSEnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH0sXG4gICAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPikge1xuICAgICAgZm9yIChjb25zdCBbZmlsZU5hbWUsIG5ld1RleHRdIG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNjcmlwdEluZm8gPSBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8ocHJvamVjdCwgZmlsZU5hbWUpO1xuICAgICAgICBjb25zdCBzbmFwc2hvdCA9IHNjcmlwdEluZm8uZ2V0U25hcHNob3QoKTtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gc25hcHNob3QuZ2V0TGVuZ3RoKCk7XG4gICAgICAgIHNjcmlwdEluZm8uZWRpdENvbnRlbnQoMCwgbGVuZ3RoLCBuZXdUZXh0KTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8oXG4gICAgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIHRjZjogc3RyaW5nKTogdHMuc2VydmVyLlNjcmlwdEluZm8ge1xuICAvLyBGaXJzdCBjaGVjayBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgU2NyaXB0SW5mbyBmb3IgdGhlIHRjZlxuICBjb25zdCB7cHJvamVjdFNlcnZpY2V9ID0gcHJvamVjdDtcbiAgbGV0IHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRTY3JpcHRJbmZvKHRjZik7XG4gIGlmICghc2NyaXB0SW5mbykge1xuICAgIC8vIFNjcmlwdEluZm8gbmVlZHMgdG8gYmUgb3BlbmVkIGJ5IGNsaWVudCB0byBiZSBhYmxlIHRvIHNldCBpdHMgdXNlci1kZWZpbmVkXG4gICAgLy8gY29udGVudC4gV2UgbXVzdCBhbHNvIHByb3ZpZGUgZmlsZSBjb250ZW50LCBvdGhlcndpc2UgdGhlIHNlcnZpY2Ugd2lsbFxuICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggdGhlIGNvbnRlbnQgZnJvbSBkaXNrIGFuZCBmYWlsLlxuICAgIHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRPckNyZWF0ZVNjcmlwdEluZm9Gb3JOb3JtYWxpemVkUGF0aChcbiAgICAgICAgdHMuc2VydmVyLnRvTm9ybWFsaXplZFBhdGgodGNmKSxcbiAgICAgICAgdHJ1ZSwgIC8vIG9wZW5lZEJ5Q2xpZW50XG4gICAgICAgICcnLCAgICAvLyBmaWxlQ29udGVudFxuICAgICAgICAvLyBzY3JpcHQgaW5mbyBhZGRlZCBieSBwbHVnaW5zIHNob3VsZCBiZSBtYXJrZWQgYXMgZXh0ZXJuYWwsIHNlZVxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi9iMjE3ZjIyZTc5OGM3ODFmNTVkMTdkYTcyZWQwOTlhOWRlZTVjNjUwL3NyYy9jb21waWxlci9wcm9ncmFtLnRzI0wxODk3LUwxODk5XG4gICAgICAgIHRzLlNjcmlwdEtpbmQuRXh0ZXJuYWwsICAvLyBzY3JpcHRLaW5kXG4gICAgKTtcbiAgICBpZiAoIXNjcmlwdEluZm8pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBzY3JpcHQgaW5mbyBmb3IgJHt0Y2Z9YCk7XG4gICAgfVxuICB9XG4gIC8vIEFkZCBTY3JpcHRJbmZvIHRvIHByb2plY3QgaWYgaXQncyBtaXNzaW5nLiBBIFNjcmlwdEluZm8gbmVlZHMgdG8gYmUgcGFydCBvZlxuICAvLyB0aGUgcHJvamVjdCBzbyB0aGF0IGl0IGJlY29tZXMgcGFydCBvZiB0aGUgcHJvZ3JhbS5cbiAgaWYgKCFwcm9qZWN0LmNvbnRhaW5zU2NyaXB0SW5mbyhzY3JpcHRJbmZvKSkge1xuICAgIHByb2plY3QuYWRkUm9vdChzY3JpcHRJbmZvKTtcbiAgfVxuICByZXR1cm4gc2NyaXB0SW5mbztcbn1cblxuZnVuY3Rpb24gbm9kZUNvbnRleHRGcm9tVGFyZ2V0KHRhcmdldDogVGFyZ2V0Q29udGV4dCk6IENvbXBsZXRpb25Ob2RlQ29udGV4dCB7XG4gIHN3aXRjaCAodGFyZ2V0LmtpbmQpIHtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJblRhZ0NvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRUYWc7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5Cb2R5Q29udGV4dDpcbiAgICAgIC8vIENvbXBsZXRpb25zIGluIGVsZW1lbnQgYm9kaWVzIGFyZSBmb3IgbmV3IGF0dHJpYnV0ZXMuXG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXk7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuVHdvV2F5QmluZGluZztcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkF0dHJpYnV0ZUluS2V5Q29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudEF0dHJpYnV0ZUtleTtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkF0dHJpYnV0ZUluVmFsdWVDb250ZXh0OlxuICAgICAgaWYgKHRhcmdldC5ub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FdmVudFZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ob25lO1xuICAgICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBObyBzcGVjaWFsIGNvbnRleHQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ob25lO1xuICB9XG59XG4iXX0=