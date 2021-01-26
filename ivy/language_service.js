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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
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
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getDefinitionAndBoundSpan(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getTypeDefinitionsAtPosition(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getQuickInfoAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
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
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
            var results = new references_1.ReferenceBuilder(this.strategy, this.tsLS, compiler).get(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getCompletionBuilder = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzRTtJQUN0RSxzREFBNEY7SUFDNUYsMkVBQW1GO0lBQ25GLDJFQUFtRztJQUNuRyx1RUFBaUY7SUFDakYscUVBQXVHO0lBQ3ZHLG1EQUFxRDtJQUVyRCxtRUFBcUU7SUFDckUsbUZBQW1EO0lBQ25ELHlFQUF1RTtJQUN2RSx5RUFBZ0Q7SUFDaEQsdUVBQThDO0lBQzlDLHVFQUE4QztJQUM5QyxpRkFBcUY7SUFDckYsNkRBQW9FO0lBRXBFO1FBT0UseUJBQ3FCLE9BQTBCLEVBQW1CLElBQXdCO1lBQXJFLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBQW1CLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQ3hGLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSw0QkFBaUIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlDQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFD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bUNBQXFCLENBQUMsbUJBQW1CLENBQUM7WUFDbkQsS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQjtnQkFDdEMsT0FBTyxtQ0FBcUIsQ0FBQyxhQUFhLENBQUM7WUFDN0MsS0FBSyxnQ0FBYyxDQUFDLHFCQUFxQjtnQkFDdkMsT0FBTyxtQ0FBcUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNuRCxLQUFLLGdDQUFjLENBQUMsdUJBQXVCO2dCQUN6QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFlBQVksNEJBQWlCLEVBQUU7b0JBQzVDLE9BQU8sbUNBQXFCLENBQUMsVUFBVSxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxPQUFPLG1DQUFxQixDQUFDLElBQUksQ0FBQztpQkFDbkM7WUFDSDtnQkFDRSxtQ0FBbUM7Z0JBQ25DLE9BQU8sbUNBQXFCLENBQUMsSUFBSSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgQ29uZmlndXJhdGlvbkhvc3QsIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5pbXBvcnQge0xhbmd1YWdlU2VydmljZUFkYXB0ZXIsIExTUGFyc2VDb25maWdIb3N0fSBmcm9tICcuL2FkYXB0ZXJzJztcbmltcG9ydCB7Q29tcGlsZXJGYWN0b3J5fSBmcm9tICcuL2NvbXBpbGVyX2ZhY3RvcnknO1xuaW1wb3J0IHtDb21wbGV0aW9uQnVpbGRlciwgQ29tcGxldGlvbk5vZGVDb250ZXh0fSBmcm9tICcuL2NvbXBsZXRpb25zJztcbmltcG9ydCB7RGVmaW5pdGlvbkJ1aWxkZXJ9IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtRdWlja0luZm9CdWlsZGVyfSBmcm9tICcuL3F1aWNrX2luZm8nO1xuaW1wb3J0IHtSZWZlcmVuY2VCdWlsZGVyfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9uLCBUYXJnZXRDb250ZXh0LCBUYXJnZXROb2RlS2luZH0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1R5cGVTY3JpcHRGaWxlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIExhbmd1YWdlU2VydmljZSB7XG4gIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICByZWFkb25seSBjb21waWxlckZhY3Rvcnk6IENvbXBpbGVyRmFjdG9yeTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5O1xuICBwcml2YXRlIHJlYWRvbmx5IGFkYXB0ZXI6IExhbmd1YWdlU2VydmljZUFkYXB0ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFyc2VDb25maWdIb3N0OiBMU1BhcnNlQ29uZmlnSG9zdDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlKSB7XG4gICAgdGhpcy5wYXJzZUNvbmZpZ0hvc3QgPSBuZXcgTFNQYXJzZUNvbmZpZ0hvc3QocHJvamVjdC5wcm9qZWN0U2VydmljZS5ob3N0KTtcbiAgICB0aGlzLm9wdGlvbnMgPSBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMucGFyc2VDb25maWdIb3N0KTtcbiAgICBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLnN0cmF0ZWd5ID0gY3JlYXRlVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5KHByb2plY3QpO1xuICAgIHRoaXMuYWRhcHRlciA9IG5ldyBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyKHByb2plY3QpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5ID0gbmV3IENvbXBpbGVyRmFjdG9yeSh0aGlzLmFkYXB0ZXIsIHRoaXMuc3RyYXRlZ3ksIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy53YXRjaENvbmZpZ0ZpbGUocHJvamVjdCk7XG4gIH1cblxuICBnZXRDb21waWxlck9wdGlvbnMoKTogQ29tcGlsZXJPcHRpb25zIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zO1xuICB9XG5cbiAgZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmIChpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKSkge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNvdXJjZUZpbGUsIE9wdGltaXplRm9yLlNpbmdsZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0VHlwZURlZmluaXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIHdlIGNhbiBvbmx5IHNob3cgMSBxdWljayBpbmZvLCBqdXN0IHVzZSB0aGUgYm91bmQgYXR0cmlidXRlIGlmIHRoZSB0YXJnZXQgaXMgYSB0d29cbiAgICAvLyB3YXkgYmluZGluZy4gV2UgbWF5IGNvbnNpZGVyIGNvbmNhdGVuYXRpbmcgYWRkaXRpb25hbCBkaXNwbGF5IHBhcnRzIGZyb20gdGhlIG90aGVyIHRhcmdldFxuICAgIC8vIG5vZGVzIG9yIHJlcHJlc2VudGluZyB0aGUgdHdvIHdheSBiaW5kaW5nIGluIHNvbWUgb3RoZXIgbWFubmVyIGluIHRoZSBmdXR1cmUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUXVpY2tJbmZvQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlKS5nZXQoKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBSZWZlcmVuY2VCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpLmdldChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD58bnVsbCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZvciB0d28td2F5IGJpbmRpbmdzLCB3ZSBhY3R1YWxseSBvbmx5IG5lZWQgdG8gYmUgY29uY2VybmVkIHdpdGggdGhlIGJvdW5kIGF0dHJpYnV0ZSBiZWNhdXNlXG4gICAgLy8gdGhlIGJpbmRpbmdzIGluIHRoZSB0ZW1wbGF0ZSBhcmUgd3JpdHRlbiB3aXRoIHRoZSBhdHRyaWJ1dGUgbmFtZSwgbm90IHRoZSBldmVudCBuYW1lLlxuICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzWzBdIDpcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZTtcbiAgICByZXR1cm4gbmV3IENvbXBsZXRpb25CdWlsZGVyKFxuICAgICAgICB0aGlzLnRzTFMsIGNvbXBpbGVyLCB0ZW1wbGF0ZUluZm8uY29tcG9uZW50LCBub2RlLFxuICAgICAgICBub2RlQ29udGV4dEZyb21UYXJnZXQocG9zaXRpb25EZXRhaWxzLmNvbnRleHQpLCBwb3NpdGlvbkRldGFpbHMucGFyZW50LFxuICAgICAgICBwb3NpdGlvbkRldGFpbHMudGVtcGxhdGUpO1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgb3B0aW9uczogdHMuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpOlxuICAgICAgdHMuV2l0aE1ldGFkYXRhPHRzLkNvbXBsZXRpb25JbmZvPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ1aWxkZXIuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKG9wdGlvbnMpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZW50cnlOYW1lOiBzdHJpbmcsXG4gICAgICBmb3JtYXRPcHRpb25zOiB0cy5Gb3JtYXRDb2RlT3B0aW9uc3x0cy5Gb3JtYXRDb2RlU2V0dGluZ3N8dW5kZWZpbmVkLFxuICAgICAgcHJlZmVyZW5jZXM6IHRzLlVzZXJQcmVmZXJlbmNlc3x1bmRlZmluZWQpOiB0cy5Db21wbGV0aW9uRW50cnlEZXRhaWxzfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlEZXRhaWxzKGVudHJ5TmFtZSwgZm9ybWF0T3B0aW9ucywgcHJlZmVyZW5jZXMpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgZW50cnlOYW1lOiBzdHJpbmcpOiB0cy5TeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ1aWxkZXIuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGVudHJ5TmFtZSk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHRoaXMucHJvamVjdDtcbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBjb25maWdTb3VyY2VGaWxlID0gdHMucmVhZEpzb25Db25maWdGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChwYXRoOiBzdHJpbmcpID0+IHByb2plY3QucmVhZEZpbGUocGF0aCkpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzICYmICF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgbWVzc2FnZVRleHQ6ICdTb21lIGxhbmd1YWdlIGZlYXR1cmVzIGFyZSBub3QgYXZhaWxhYmxlLiAnICtcbiAgICAgICAgICAgICdUbyBhY2Nlc3MgYWxsIGZlYXR1cmVzLCBlbmFibGUgYHN0cmljdFRlbXBsYXRlc2AgaW4gYGFuZ3VsYXJDb21waWxlck9wdGlvbnNgLicsXG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuU3VnZ2VzdGlvbixcbiAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLlNVR0dFU1RfU1RSSUNUX1RFTVBMQVRFUyksXG4gICAgICAgIGZpbGU6IGNvbmZpZ1NvdXJjZUZpbGUsXG4gICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKSk7XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgICAgICAgICBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKSB7XG4gIGNvbnN0IHtsb2dnZXJ9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgY29uc3QgcHJvamVjdE5hbWUgPSBwcm9qZWN0LmdldFByb2plY3ROYW1lKCk7XG4gIGxvZ2dlci5pbmZvKGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgZm9yICR7cHJvamVjdE5hbWV9OiBgICsgSlNPTi5zdHJpbmdpZnkob3B0aW9ucywgbnVsbCwgMikpO1xufVxuXG5mdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IHtvcHRpb25zLCBlcnJvcnN9ID1cbiAgICAgIHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgLyogZXhpc3RpbmdPcHRpb25zICovIHVuZGVmaW5lZCwgaG9zdCk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHByb2plY3Quc2V0UHJvamVjdEVycm9ycyhlcnJvcnMpO1xuICB9XG5cbiAgLy8gUHJvamVjdHMgbG9hZGVkIGludG8gdGhlIExhbmd1YWdlIFNlcnZpY2Ugb2Z0ZW4gaW5jbHVkZSB0ZXN0IGZpbGVzIHdoaWNoIGFyZSBub3QgcGFydCBvZiB0aGVcbiAgLy8gYXBwJ3MgbWFpbiBjb21waWxhdGlvbiB1bml0LCBhbmQgdGhlc2UgdGVzdCBmaWxlcyBvZnRlbiBpbmNsdWRlIGlubGluZSBOZ01vZHVsZXMgdGhhdCBkZWNsYXJlXG4gIC8vIGNvbXBvbmVudHMgZnJvbSB0aGUgYXBwLiBUaGVzZSBkZWNsYXJhdGlvbnMgY29uZmxpY3Qgd2l0aCB0aGUgbWFpbiBkZWNsYXJhdGlvbnMgb2Ygc3VjaFxuICAvLyBjb21wb25lbnRzIGluIHRoZSBhcHAncyBOZ01vZHVsZXMuIFRoaXMgY29uZmxpY3QgaXMgbm90IG5vcm1hbGx5IHByZXNlbnQgZHVyaW5nIHJlZ3VsYXJcbiAgLy8gY29tcGlsYXRpb24gYmVjYXVzZSB0aGUgYXBwIGFuZCB0aGUgdGVzdHMgYXJlIHBhcnQgb2Ygc2VwYXJhdGUgY29tcGlsYXRpb24gdW5pdHMuXG4gIC8vXG4gIC8vIEFzIGEgdGVtcG9yYXJ5IG1pdGlnYXRpb24gb2YgdGhpcyBwcm9ibGVtLCB3ZSBpbnN0cnVjdCB0aGUgY29tcGlsZXIgdG8gaWdub3JlIGNsYXNzZXMgd2hpY2hcbiAgLy8gYXJlIG5vdCBleHBvcnRlZC4gSW4gbWFueSBjYXNlcywgdGhpcyBlbnN1cmVzIHRoZSB0ZXN0IE5nTW9kdWxlcyBhcmUgaWdub3JlZCBieSB0aGUgY29tcGlsZXJcbiAgLy8gYW5kIG9ubHkgdGhlIHJlYWwgY29tcG9uZW50IGRlY2xhcmF0aW9uIGlzIHVzZWQuXG4gIG9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyA9IGZhbHNlO1xuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOlxuICAgIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSB7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zOiBmYWxzZSxcbiAgICBzaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgICByZXR1cm4gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIH0sXG4gICAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBwcm9qZWN0LmdldExhbmd1YWdlU2VydmljZSgpLmdldFByb2dyYW0oKTtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZG9lcyBub3QgaGF2ZSBhIHByb2dyYW0hJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4pIHtcbiAgICAgIGZvciAoY29uc3QgW2ZpbGVOYW1lLCBuZXdUZXh0XSBvZiBjb250ZW50cykge1xuICAgICAgICBjb25zdCBzY3JpcHRJbmZvID0gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKHByb2plY3QsIGZpbGVOYW1lKTtcbiAgICAgICAgY29uc3Qgc25hcHNob3QgPSBzY3JpcHRJbmZvLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHNuYXBzaG90LmdldExlbmd0aCgpO1xuICAgICAgICBzY3JpcHRJbmZvLmVkaXRDb250ZW50KDAsIGxlbmd0aCwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCB0Y2Y6IHN0cmluZyk6IHRzLnNlcnZlci5TY3JpcHRJbmZvIHtcbiAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIFNjcmlwdEluZm8gZm9yIHRoZSB0Y2ZcbiAgY29uc3Qge3Byb2plY3RTZXJ2aWNlfSA9IHByb2plY3Q7XG4gIGxldCBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0U2NyaXB0SW5mbyh0Y2YpO1xuICBpZiAoIXNjcmlwdEluZm8pIHtcbiAgICAvLyBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIG9wZW5lZCBieSBjbGllbnQgdG8gYmUgYWJsZSB0byBzZXQgaXRzIHVzZXItZGVmaW5lZFxuICAgIC8vIGNvbnRlbnQuIFdlIG11c3QgYWxzbyBwcm92aWRlIGZpbGUgY29udGVudCwgb3RoZXJ3aXNlIHRoZSBzZXJ2aWNlIHdpbGxcbiAgICAvLyBhdHRlbXB0IHRvIGZldGNoIHRoZSBjb250ZW50IGZyb20gZGlzayBhbmQgZmFpbC5cbiAgICBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0T3JDcmVhdGVTY3JpcHRJbmZvRm9yTm9ybWFsaXplZFBhdGgoXG4gICAgICAgIHRzLnNlcnZlci50b05vcm1hbGl6ZWRQYXRoKHRjZiksXG4gICAgICAgIHRydWUsICAvLyBvcGVuZWRCeUNsaWVudFxuICAgICAgICAnJywgICAgLy8gZmlsZUNvbnRlbnRcbiAgICAgICAgLy8gc2NyaXB0IGluZm8gYWRkZWQgYnkgcGx1Z2lucyBzaG91bGQgYmUgbWFya2VkIGFzIGV4dGVybmFsLCBzZWVcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvYjIxN2YyMmU3OThjNzgxZjU1ZDE3ZGE3MmVkMDk5YTlkZWU1YzY1MC9zcmMvY29tcGlsZXIvcHJvZ3JhbS50cyNMMTg5Ny1MMTg5OVxuICAgICAgICB0cy5TY3JpcHRLaW5kLkV4dGVybmFsLCAgLy8gc2NyaXB0S2luZFxuICAgICk7XG4gICAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgc2NyaXB0IGluZm8gZm9yICR7dGNmfWApO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgU2NyaXB0SW5mbyB0byBwcm9qZWN0IGlmIGl0J3MgbWlzc2luZy4gQSBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIHBhcnQgb2ZcbiAgLy8gdGhlIHByb2plY3Qgc28gdGhhdCBpdCBiZWNvbWVzIHBhcnQgb2YgdGhlIHByb2dyYW0uXG4gIGlmICghcHJvamVjdC5jb250YWluc1NjcmlwdEluZm8oc2NyaXB0SW5mbykpIHtcbiAgICBwcm9qZWN0LmFkZFJvb3Qoc2NyaXB0SW5mbyk7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdEluZm87XG59XG5cbmZ1bmN0aW9uIG5vZGVDb250ZXh0RnJvbVRhcmdldCh0YXJnZXQ6IFRhcmdldENvbnRleHQpOiBDb21wbGV0aW9uTm9kZUNvbnRleHQge1xuICBzd2l0Y2ggKHRhcmdldC5raW5kKSB7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5FbGVtZW50SW5UYWdDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50VGFnO1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluQm9keUNvbnRleHQ6XG4gICAgICAvLyBDb21wbGV0aW9ucyBpbiBlbGVtZW50IGJvZGllcyBhcmUgZm9yIG5ldyBhdHRyaWJ1dGVzLlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5O1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LlR3b1dheUJpbmRpbmc7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJbktleUNvbnRleHQ6XG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkVsZW1lbnRBdHRyaWJ1dGVLZXk7XG4gICAgY2FzZSBUYXJnZXROb2RlS2luZC5BdHRyaWJ1dGVJblZhbHVlQ29udGV4dDpcbiAgICAgIGlmICh0YXJnZXQubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRXZlbnRWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gTm8gc3BlY2lhbCBjb250ZXh0IGlzIGF2YWlsYWJsZS5cbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuTm9uZTtcbiAgfVxufVxuIl19