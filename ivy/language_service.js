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
            var results = new references_1.ReferenceBuilder(this.strategy, this.tsLS, compiler).get(fileName, position);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzRTtJQUN0RSxzREFBNEY7SUFDNUYsMkVBQW1GO0lBQ25GLDJFQUFtRztJQUNuRyx1RUFBaUY7SUFDakYscUVBQXVHO0lBQ3ZHLG1EQUFxRDtJQUdyRCxtRUFBcUU7SUFDckUsbUZBQW1EO0lBQ25ELHlFQUF1RTtJQUN2RSx5RUFBZ0Q7SUFDaEQsdUVBQThDO0lBQzlDLHVFQUE4QztJQUM5QyxpRkFBcUY7SUFDckYsNkRBQW9FO0lBRXBFO1FBT0UseUJBQ3FCLE9BQTBCLEVBQW1CLElBQXdCO1lBQXJFLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBQW1CLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQ3hGLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSw0QkFBaUIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlDQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFD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Q0FBQyxhQUFhLENBQUM7WUFDN0MsS0FBSyxnQ0FBYyxDQUFDLHFCQUFxQjtnQkFDdkMsT0FBTyxtQ0FBcUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNuRCxLQUFLLGdDQUFjLENBQUMsdUJBQXVCO2dCQUN6QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFlBQVksNEJBQWlCLEVBQUU7b0JBQzVDLE9BQU8sbUNBQXFCLENBQUMsVUFBVSxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxPQUFPLG1DQUFxQixDQUFDLElBQUksQ0FBQztpQkFDbkM7WUFDSDtnQkFDRSxtQ0FBbUM7Z0JBQ25DLE9BQU8sbUNBQXFCLENBQUMsSUFBSSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgQ29uZmlndXJhdGlvbkhvc3QsIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuaW1wb3J0IHtHZXRUY2JSZXNwb25zZX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLCBMU1BhcnNlQ29uZmlnSG9zdH0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7Q29tcGxldGlvbkJ1aWxkZXIsIENvbXBsZXRpb25Ob2RlQ29udGV4dH0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7UmVmZXJlbmNlQnVpbGRlcn0gZnJvbSAnLi9yZWZlcmVuY2VzJztcbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbiwgVGFyZ2V0Q29udGV4dCwgVGFyZ2V0Tm9kZUtpbmR9IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7Z2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgaXNUeXBlU2NyaXB0RmlsZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBMYW5ndWFnZVNlcnZpY2Uge1xuICBwcml2YXRlIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucztcbiAgcmVhZG9ubHkgY29tcGlsZXJGYWN0b3J5OiBDb21waWxlckZhY3Rvcnk7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneTtcbiAgcHJpdmF0ZSByZWFkb25seSBhZGFwdGVyOiBMYW5ndWFnZVNlcnZpY2VBZGFwdGVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHBhcnNlQ29uZmlnSG9zdDogTFNQYXJzZUNvbmZpZ0hvc3Q7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSkge1xuICAgIHRoaXMucGFyc2VDb25maWdIb3N0ID0gbmV3IExTUGFyc2VDb25maWdIb3N0KHByb2plY3QucHJvamVjdFNlcnZpY2UuaG9zdCk7XG4gICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5zdHJhdGVneSA9IGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0KTtcbiAgICB0aGlzLmFkYXB0ZXIgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcihwcm9qZWN0KTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeSA9IG5ldyBDb21waWxlckZhY3RvcnkodGhpcy5hZGFwdGVyLCB0aGlzLnN0cmF0ZWd5LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMud2F0Y2hDb25maWdGaWxlKHByb2plY3QpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXJPcHRpb25zKCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucztcbiAgfVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHR0YyA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc291cmNlRmlsZSwgT3B0aW1pemVGb3IuU2luZ2xlRmlsZSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgZm9yIChjb25zdCBjb21wb25lbnQgb2YgY29tcG9uZW50cykge1xuICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldFR5cGVEZWZpbml0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIEJlY2F1c2Ugd2UgY2FuIG9ubHkgc2hvdyAxIHF1aWNrIGluZm8sIGp1c3QgdXNlIHRoZSBib3VuZCBhdHRyaWJ1dGUgaWYgdGhlIHRhcmdldCBpcyBhIHR3b1xuICAgIC8vIHdheSBiaW5kaW5nLiBXZSBtYXkgY29uc2lkZXIgY29uY2F0ZW5hdGluZyBhZGRpdGlvbmFsIGRpc3BsYXkgcGFydHMgZnJvbSB0aGUgb3RoZXIgdGFyZ2V0XG4gICAgLy8gbm9kZXMgb3IgcmVwcmVzZW50aW5nIHRoZSB0d28gd2F5IGJpbmRpbmcgaW4gc29tZSBvdGhlciBtYW5uZXIgaW4gdGhlIGZ1dHVyZS5cbiAgICBjb25zdCBub2RlID0gcG9zaXRpb25EZXRhaWxzLmNvbnRleHQua2luZCA9PT0gVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQgP1xuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2Rlc1swXSA6XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGU7XG4gICAgY29uc3QgcmVzdWx0cyA9IG5ldyBRdWlja0luZm9CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIsIHRlbXBsYXRlSW5mby5jb21wb25lbnQsIG5vZGUpLmdldCgpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlKCk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBSZWZlcmVuY2VCdWlsZGVyKHRoaXMuc3RyYXRlZ3ksIHRoaXMudHNMUywgY29tcGlsZXIpLmdldChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIENvbXBsZXRpb25CdWlsZGVyPFRtcGxBc3ROb2RlfEFTVD58bnVsbCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZSgpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGb3IgdHdvLXdheSBiaW5kaW5ncywgd2UgYWN0dWFsbHkgb25seSBuZWVkIHRvIGJlIGNvbmNlcm5lZCB3aXRoIHRoZSBib3VuZCBhdHRyaWJ1dGUgYmVjYXVzZVxuICAgIC8vIHRoZSBiaW5kaW5ncyBpbiB0aGUgdGVtcGxhdGUgYXJlIHdyaXR0ZW4gd2l0aCB0aGUgYXR0cmlidXRlIG5hbWUsIG5vdCB0aGUgZXZlbnQgbmFtZS5cbiAgICBjb25zdCBub2RlID0gcG9zaXRpb25EZXRhaWxzLmNvbnRleHQua2luZCA9PT0gVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQgP1xuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2Rlc1swXSA6XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGU7XG4gICAgcmV0dXJuIG5ldyBDb21wbGV0aW9uQnVpbGRlcihcbiAgICAgICAgdGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgbm9kZSxcbiAgICAgICAgbm9kZUNvbnRleHRGcm9tVGFyZ2V0KHBvc2l0aW9uRGV0YWlscy5jb250ZXh0KSwgcG9zaXRpb25EZXRhaWxzLnBhcmVudCxcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLnRlbXBsYXRlKTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8dW5kZWZpbmVkKTpcbiAgICAgIHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ1aWxkZXIuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeVN5bWJvbChlbnRyeU5hbWUpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHByb2plY3QgPSB0aGlzLnByb2plY3Q7XG4gICAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgY29uZmlnU291cmNlRmlsZSA9IHRzLnJlYWRKc29uQ29uZmlnRmlsZShcbiAgICAgICAgcHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAocGF0aDogc3RyaW5nKSA9PiBwcm9qZWN0LnJlYWRGaWxlKHBhdGgpKTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcyAmJiAhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiAnU29tZSBsYW5ndWFnZSBmZWF0dXJlcyBhcmUgbm90IGF2YWlsYWJsZS4gJyArXG4gICAgICAgICAgICAnVG8gYWNjZXNzIGFsbCBmZWF0dXJlcywgZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgIGluIGBhbmd1bGFyQ29tcGlsZXJPcHRpb25zYC4nLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LlN1Z2dlc3Rpb24sXG4gICAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5TVUdHRVNUX1NUUklDVF9URU1QTEFURVMpLFxuICAgICAgICBmaWxlOiBjb25maWdTb3VyY2VGaWxlLFxuICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGUoKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCkpO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSB3YXRjaENvbmZpZ0ZpbGUocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpIHtcbiAgICAvLyBUT0RPOiBDaGVjayB0aGUgY2FzZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGRpc3Bvc2VkLiBBbiBJbmZlcnJlZFByb2plY3RcbiAgICAvLyBjb3VsZCBiZSBkaXNwb3NlZCB3aGVuIGEgdHNjb25maWcuanNvbiBpcyBhZGRlZCB0byB0aGUgd29ya3NwYWNlLFxuICAgIC8vIGluIHdoaWNoIGNhc2UgaXQgYmVjb21lcyBhIENvbmZpZ3VyZWRQcm9qZWN0IChvciB2aWNlLXZlcnNhKS5cbiAgICAvLyBXZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBGaWxlV2F0Y2hlciBpcyBjbG9zZWQuXG4gICAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2hvc3R9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgICBob3N0LndhdGNoRmlsZShcbiAgICAgICAgcHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAoZmlsZU5hbWU6IHN0cmluZywgZXZlbnRLaW5kOiB0cy5GaWxlV2F0Y2hlckV2ZW50S2luZCkgPT4ge1xuICAgICAgICAgIHByb2plY3QubG9nKGBDb25maWcgZmlsZSBjaGFuZ2VkOiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgIGlmIChldmVudEtpbmQgPT09IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kLkNoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QpO1xuICAgICAgICAgICAgbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCB7bG9nZ2VyfSA9IHByb2plY3QucHJvamVjdFNlcnZpY2U7XG4gIGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdC5nZXRQcm9qZWN0TmFtZSgpO1xuICBsb2dnZXIuaW5mbyhgQW5ndWxhciBjb21waWxlciBvcHRpb25zIGZvciAke3Byb2plY3ROYW1lfTogYCArIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMsIG51bGwsIDIpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhcbiAgICBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgaG9zdDogQ29uZmlndXJhdGlvbkhvc3QpOiBDb21waWxlck9wdGlvbnMge1xuICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICBjb25zdCB7b3B0aW9ucywgZXJyb3JzfSA9XG4gICAgICByZWFkQ29uZmlndXJhdGlvbihwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIC8qIGV4aXN0aW5nT3B0aW9ucyAqLyB1bmRlZmluZWQsIGhvc3QpO1xuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBwcm9qZWN0LnNldFByb2plY3RFcnJvcnMoZXJyb3JzKTtcbiAgfVxuXG4gIC8vIFByb2plY3RzIGxvYWRlZCBpbnRvIHRoZSBMYW5ndWFnZSBTZXJ2aWNlIG9mdGVuIGluY2x1ZGUgdGVzdCBmaWxlcyB3aGljaCBhcmUgbm90IHBhcnQgb2YgdGhlXG4gIC8vIGFwcCdzIG1haW4gY29tcGlsYXRpb24gdW5pdCwgYW5kIHRoZXNlIHRlc3QgZmlsZXMgb2Z0ZW4gaW5jbHVkZSBpbmxpbmUgTmdNb2R1bGVzIHRoYXQgZGVjbGFyZVxuICAvLyBjb21wb25lbnRzIGZyb20gdGhlIGFwcC4gVGhlc2UgZGVjbGFyYXRpb25zIGNvbmZsaWN0IHdpdGggdGhlIG1haW4gZGVjbGFyYXRpb25zIG9mIHN1Y2hcbiAgLy8gY29tcG9uZW50cyBpbiB0aGUgYXBwJ3MgTmdNb2R1bGVzLiBUaGlzIGNvbmZsaWN0IGlzIG5vdCBub3JtYWxseSBwcmVzZW50IGR1cmluZyByZWd1bGFyXG4gIC8vIGNvbXBpbGF0aW9uIGJlY2F1c2UgdGhlIGFwcCBhbmQgdGhlIHRlc3RzIGFyZSBwYXJ0IG9mIHNlcGFyYXRlIGNvbXBpbGF0aW9uIHVuaXRzLlxuICAvL1xuICAvLyBBcyBhIHRlbXBvcmFyeSBtaXRpZ2F0aW9uIG9mIHRoaXMgcHJvYmxlbSwgd2UgaW5zdHJ1Y3QgdGhlIGNvbXBpbGVyIHRvIGlnbm9yZSBjbGFzc2VzIHdoaWNoXG4gIC8vIGFyZSBub3QgZXhwb3J0ZWQuIEluIG1hbnkgY2FzZXMsIHRoaXMgZW5zdXJlcyB0aGUgdGVzdCBOZ01vZHVsZXMgYXJlIGlnbm9yZWQgYnkgdGhlIGNvbXBpbGVyXG4gIC8vIGFuZCBvbmx5IHRoZSByZWFsIGNvbXBvbmVudCBkZWNsYXJhdGlvbiBpcyB1c2VkLlxuICBvcHRpb25zLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgPSBmYWxzZTtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5KHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTpcbiAgICBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kge1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRzSW5saW5lT3BlcmF0aW9uczogZmFsc2UsXG4gICAgc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQWJzb2x1dGVGc1BhdGgge1xuICAgICAgcmV0dXJuIFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCkpKTtcbiAgICB9LFxuICAgIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gcHJvamVjdC5nZXRMYW5ndWFnZVNlcnZpY2UoKS5nZXRQcm9ncmFtKCk7XG4gICAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYW5ndWFnZSBzZXJ2aWNlIGRvZXMgbm90IGhhdmUgYSBwcm9ncmFtIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgfSxcbiAgICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KSB7XG4gICAgICBmb3IgKGNvbnN0IFtmaWxlTmFtZSwgbmV3VGV4dF0gb2YgY29udGVudHMpIHtcbiAgICAgICAgY29uc3Qgc2NyaXB0SW5mbyA9IGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhwcm9qZWN0LCBmaWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IHNuYXBzaG90ID0gc2NyaXB0SW5mby5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBzbmFwc2hvdC5nZXRMZW5ndGgoKTtcbiAgICAgICAgc2NyaXB0SW5mby5lZGl0Q29udGVudCgwLCBsZW5ndGgsIG5ld1RleHQpO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhcbiAgICBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgdGNmOiBzdHJpbmcpOiB0cy5zZXJ2ZXIuU2NyaXB0SW5mbyB7XG4gIC8vIEZpcnN0IGNoZWNrIGlmIHRoZXJlIGlzIGFscmVhZHkgYSBTY3JpcHRJbmZvIGZvciB0aGUgdGNmXG4gIGNvbnN0IHtwcm9qZWN0U2VydmljZX0gPSBwcm9qZWN0O1xuICBsZXQgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldFNjcmlwdEluZm8odGNmKTtcbiAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgLy8gU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBvcGVuZWQgYnkgY2xpZW50IHRvIGJlIGFibGUgdG8gc2V0IGl0cyB1c2VyLWRlZmluZWRcbiAgICAvLyBjb250ZW50LiBXZSBtdXN0IGFsc28gcHJvdmlkZSBmaWxlIGNvbnRlbnQsIG90aGVyd2lzZSB0aGUgc2VydmljZSB3aWxsXG4gICAgLy8gYXR0ZW1wdCB0byBmZXRjaCB0aGUgY29udGVudCBmcm9tIGRpc2sgYW5kIGZhaWwuXG4gICAgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldE9yQ3JlYXRlU2NyaXB0SW5mb0Zvck5vcm1hbGl6ZWRQYXRoKFxuICAgICAgICB0cy5zZXJ2ZXIudG9Ob3JtYWxpemVkUGF0aCh0Y2YpLFxuICAgICAgICB0cnVlLCAgLy8gb3BlbmVkQnlDbGllbnRcbiAgICAgICAgJycsICAgIC8vIGZpbGVDb250ZW50XG4gICAgICAgIC8vIHNjcmlwdCBpbmZvIGFkZGVkIGJ5IHBsdWdpbnMgc2hvdWxkIGJlIG1hcmtlZCBhcyBleHRlcm5hbCwgc2VlXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL2IyMTdmMjJlNzk4Yzc4MWY1NWQxN2RhNzJlZDA5OWE5ZGVlNWM2NTAvc3JjL2NvbXBpbGVyL3Byb2dyYW0udHMjTDE4OTctTDE4OTlcbiAgICAgICAgdHMuU2NyaXB0S2luZC5FeHRlcm5hbCwgIC8vIHNjcmlwdEtpbmRcbiAgICApO1xuICAgIGlmICghc2NyaXB0SW5mbykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHNjcmlwdCBpbmZvIGZvciAke3RjZn1gKTtcbiAgICB9XG4gIH1cbiAgLy8gQWRkIFNjcmlwdEluZm8gdG8gcHJvamVjdCBpZiBpdCdzIG1pc3NpbmcuIEEgU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBwYXJ0IG9mXG4gIC8vIHRoZSBwcm9qZWN0IHNvIHRoYXQgaXQgYmVjb21lcyBwYXJ0IG9mIHRoZSBwcm9ncmFtLlxuICBpZiAoIXByb2plY3QuY29udGFpbnNTY3JpcHRJbmZvKHNjcmlwdEluZm8pKSB7XG4gICAgcHJvamVjdC5hZGRSb290KHNjcmlwdEluZm8pO1xuICB9XG4gIHJldHVybiBzY3JpcHRJbmZvO1xufVxuXG5mdW5jdGlvbiBub2RlQ29udGV4dEZyb21UYXJnZXQodGFyZ2V0OiBUYXJnZXRDb250ZXh0KTogQ29tcGxldGlvbk5vZGVDb250ZXh0IHtcbiAgc3dpdGNoICh0YXJnZXQua2luZCkge1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluVGFnQ29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudFRhZztcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJbkJvZHlDb250ZXh0OlxuICAgICAgLy8gQ29tcGxldGlvbnMgaW4gZWxlbWVudCBib2RpZXMgYXJlIGZvciBuZXcgYXR0cmlidXRlcy5cbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudEF0dHJpYnV0ZUtleTtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ud29XYXlCaW5kaW5nO1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5LZXlDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5O1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5WYWx1ZUNvbnRleHQ6XG4gICAgICBpZiAodGFyZ2V0Lm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkV2ZW50VmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0Lk5vbmU7XG4gICAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIE5vIHNwZWNpYWwgY29udGV4dCBpcyBhdmFpbGFibGUuXG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0Lk5vbmU7XG4gIH1cbn1cbiJdfQ==