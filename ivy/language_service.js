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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LanguageService = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_cli_1 = require("@angular/compiler-cli");
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
            var results = new references_1.ReferencesAndRenameBuilder(this.strategy, this.tsLS, compiler)
                .getReferencesAtPosition(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getRenameInfo = function (fileName, position) {
            var _a, _b, _c;
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
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
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName);
            var results = new references_1.ReferencesAndRenameBuilder(this.strategy, this.tsLS, compiler)
                .findRenameLocations(fileName, position);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzRTtJQUN0RSxzREFBNEY7SUFDNUYsMkVBQWlIO0lBQ2pILHVFQUFpRjtJQUNqRixxRUFBdUc7SUFDdkcsbURBQXFEO0lBRXJELG1FQUFxRTtJQUNyRSxtRkFBbUQ7SUFDbkQseUVBQXVFO0lBQ3ZFLHlFQUFnRDtJQUNoRCx1RUFBOEM7SUFDOUMsdUVBQXdEO0lBQ3hELGlGQUFxRjtJQUNyRiw2REFBb0U7SUFFcEU7UUFPRSx5QkFBWSxPQUEwQixFQUFtQixJQUF3QjtZQUF4QixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUMvRSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksNEJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDckUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQ0FBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFD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QixDQUFDLE1BQXFCO1FBQ2xELFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNuQixLQUFLLGdDQUFjLENBQUMsbUJBQW1CO2dCQUNyQyxPQUFPLG1DQUFxQixDQUFDLFVBQVUsQ0FBQztZQUMxQyxLQUFLLGdDQUFjLENBQUMsb0JBQW9CO2dCQUN0Qyx3REFBd0Q7Z0JBQ3hELE9BQU8sbUNBQXFCLENBQUMsbUJBQW1CLENBQUM7WUFDbkQsS0FBSyxnQ0FBYyxDQUFDLG9CQUFvQjtnQkFDdEMsT0FBTyxtQ0FBcUIsQ0FBQyxhQUFhLENBQUM7WUFDN0MsS0FBSyxnQ0FBYyxDQUFDLHFCQUFxQjtnQkFDdkMsT0FBTyxtQ0FBcUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUNuRCxLQUFLLGdDQUFjLENBQUMsdUJBQXVCO2dCQUN6QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLFlBQVksNEJBQWlCLEVBQUU7b0JBQzVDLE9BQU8sbUNBQXFCLENBQUMsVUFBVSxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxPQUFPLG1DQUFxQixDQUFDLElBQUksQ0FBQztpQkFDbkM7WUFDSDtnQkFDRSxtQ0FBbUM7Z0JBQ25DLE9BQU8sbUNBQXFCLENBQUMsSUFBSSxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgQ29uZmlndXJhdGlvbkhvc3QsIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2snO1xuaW1wb3J0IHtPcHRpbWl6ZUZvciwgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcblxuaW1wb3J0IHtMYW5ndWFnZVNlcnZpY2VBZGFwdGVyLCBMU1BhcnNlQ29uZmlnSG9zdH0gZnJvbSAnLi9hZGFwdGVycyc7XG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7Q29tcGxldGlvbkJ1aWxkZXIsIENvbXBsZXRpb25Ob2RlQ29udGV4dH0gZnJvbSAnLi9jb21wbGV0aW9ucyc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7UmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXJ9IGZyb20gJy4vcmVmZXJlbmNlcyc7XG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb24sIFRhcmdldENvbnRleHQsIFRhcmdldE5vZGVLaW5kfSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGlzVHlwZVNjcmlwdEZpbGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJzZUNvbmZpZ0hvc3Q6IExTUGFyc2VDb25maWdIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSkge1xuICAgIHRoaXMucGFyc2VDb25maWdIb3N0ID0gbmV3IExTUGFyc2VDb25maWdIb3N0KHByb2plY3QucHJvamVjdFNlcnZpY2UuaG9zdCk7XG4gICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5zdHJhdGVneSA9IGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0KTtcbiAgICB0aGlzLmFkYXB0ZXIgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcihwcm9qZWN0KTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeSA9IG5ldyBDb21waWxlckZhY3RvcnkodGhpcy5hZGFwdGVyLCB0aGlzLnN0cmF0ZWd5LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMud2F0Y2hDb25maWdGaWxlKHByb2plY3QpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXJPcHRpb25zKCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucztcbiAgfVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGVyLmdldERpYWdub3N0aWNzRm9yRmlsZShzb3VyY2VGaWxlLCBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBjb21wb25lbnRzKSB7XG4gICAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHRjLmdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldFR5cGVEZWZpbml0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlSW5mby50ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQmVjYXVzZSB3ZSBjYW4gb25seSBzaG93IDEgcXVpY2sgaW5mbywganVzdCB1c2UgdGhlIGJvdW5kIGF0dHJpYnV0ZSBpZiB0aGUgdGFyZ2V0IGlzIGEgdHdvXG4gICAgLy8gd2F5IGJpbmRpbmcuIFdlIG1heSBjb25zaWRlciBjb25jYXRlbmF0aW5nIGFkZGl0aW9uYWwgZGlzcGxheSBwYXJ0cyBmcm9tIHRoZSBvdGhlciB0YXJnZXRcbiAgICAvLyBub2RlcyBvciByZXByZXNlbnRpbmcgdGhlIHR3byB3YXkgYmluZGluZyBpbiBzb21lIG90aGVyIG1hbm5lciBpbiB0aGUgZnV0dXJlLlxuICAgIGNvbnN0IG5vZGUgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzWzBdIDpcbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZTtcbiAgICBjb25zdCByZXN1bHRzID0gbmV3IFF1aWNrSW5mb0J1aWxkZXIodGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgbm9kZSkuZ2V0KCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UmVuYW1lSW5mbyhmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVuYW1lSW5mbyB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgcmVuYW1lSW5mbyA9IG5ldyBSZWZlcmVuY2VzQW5kUmVuYW1lQnVpbGRlcih0aGlzLnN0cmF0ZWd5LCB0aGlzLnRzTFMsIGNvbXBpbGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmdldFJlbmFtZUluZm8oYWJzb2x1dGVGcm9tKGZpbGVOYW1lKSwgcG9zaXRpb24pO1xuICAgIGlmICghcmVuYW1lSW5mby5jYW5SZW5hbWUpIHtcbiAgICAgIHJldHVybiByZW5hbWVJbmZvO1xuICAgIH1cblxuICAgIGNvbnN0IHF1aWNrSW5mbyA9IHRoaXMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pID8/XG4gICAgICAgIHRoaXMudHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgY29uc3Qga2luZCA9IHF1aWNrSW5mbz8ua2luZCA/PyB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duO1xuICAgIGNvbnN0IGtpbmRNb2RpZmllcnMgPSBxdWlja0luZm8/LmtpbmRNb2RpZmllcnMgPz8gdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgICByZXR1cm4gey4uLnJlbmFtZUluZm8sIGtpbmQsIGtpbmRNb2RpZmllcnN9O1xuICB9XG5cbiAgZmluZFJlbmFtZUxvY2F0aW9ucyhmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kUmVuYW1lTG9jYXRpb25zKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBwcml2YXRlIGdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgQ29tcGxldGlvbkJ1aWxkZXI8VG1wbEFzdE5vZGV8QVNUPnxudWxsIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRm9yIHR3by13YXkgYmluZGluZ3MsIHdlIGFjdHVhbGx5IG9ubHkgbmVlZCB0byBiZSBjb25jZXJuZWQgd2l0aCB0aGUgYm91bmQgYXR0cmlidXRlIGJlY2F1c2VcbiAgICAvLyB0aGUgYmluZGluZ3MgaW4gdGhlIHRlbXBsYXRlIGFyZSB3cml0dGVuIHdpdGggdGhlIGF0dHJpYnV0ZSBuYW1lLCBub3QgdGhlIGV2ZW50IG5hbWUuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXNbMF0gOlxuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlO1xuICAgIHJldHVybiBuZXcgQ29tcGxldGlvbkJ1aWxkZXIoXG4gICAgICAgIHRoaXMudHNMUywgY29tcGlsZXIsIHRlbXBsYXRlSW5mby5jb21wb25lbnQsIG5vZGUsXG4gICAgICAgIG5vZGVDb250ZXh0RnJvbVRhcmdldChwb3NpdGlvbkRldGFpbHMuY29udGV4dCksIHBvc2l0aW9uRGV0YWlscy5wYXJlbnQsXG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy50ZW1wbGF0ZSk7XG4gIH1cblxuICBnZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCk6XG4gICAgICB0cy5XaXRoTWV0YWRhdGE8dHMuQ29tcGxldGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24ob3B0aW9ucyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeURldGFpbHMoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyxcbiAgICAgIGZvcm1hdE9wdGlvbnM6IHRzLkZvcm1hdENvZGVPcHRpb25zfHRzLkZvcm1hdENvZGVTZXR0aW5nc3x1bmRlZmluZWQsXG4gICAgICBwcmVmZXJlbmNlczogdHMuVXNlclByZWZlcmVuY2VzfHVuZGVmaW5lZCk6IHRzLkNvbXBsZXRpb25FbnRyeURldGFpbHN8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25FbnRyeURldGFpbHMoZW50cnlOYW1lLCBmb3JtYXRPcHRpb25zLCBwcmVmZXJlbmNlcyk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25FbnRyeVN5bWJvbChmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBlbnRyeU5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRDb21wbGV0aW9uRW50cnlTeW1ib2woZW50cnlOYW1lKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSB3YXRjaENvbmZpZ0ZpbGUocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpIHtcbiAgICAvLyBUT0RPOiBDaGVjayB0aGUgY2FzZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGRpc3Bvc2VkLiBBbiBJbmZlcnJlZFByb2plY3RcbiAgICAvLyBjb3VsZCBiZSBkaXNwb3NlZCB3aGVuIGEgdHNjb25maWcuanNvbiBpcyBhZGRlZCB0byB0aGUgd29ya3NwYWNlLFxuICAgIC8vIGluIHdoaWNoIGNhc2UgaXQgYmVjb21lcyBhIENvbmZpZ3VyZWRQcm9qZWN0IChvciB2aWNlLXZlcnNhKS5cbiAgICAvLyBXZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBGaWxlV2F0Y2hlciBpcyBjbG9zZWQuXG4gICAgaWYgKCEocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qge2hvc3R9ID0gcHJvamVjdC5wcm9qZWN0U2VydmljZTtcbiAgICBob3N0LndhdGNoRmlsZShcbiAgICAgICAgcHJvamVjdC5nZXRDb25maWdGaWxlUGF0aCgpLCAoZmlsZU5hbWU6IHN0cmluZywgZXZlbnRLaW5kOiB0cy5GaWxlV2F0Y2hlckV2ZW50S2luZCkgPT4ge1xuICAgICAgICAgIHByb2plY3QubG9nKGBDb25maWcgZmlsZSBjaGFuZ2VkOiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgIGlmIChldmVudEtpbmQgPT09IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kLkNoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QpO1xuICAgICAgICAgICAgbG9nQ29tcGlsZXJPcHRpb25zKHByb2plY3QsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dDb21waWxlck9wdGlvbnMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCB7bG9nZ2VyfSA9IHByb2plY3QucHJvamVjdFNlcnZpY2U7XG4gIGNvbnN0IHByb2plY3ROYW1lID0gcHJvamVjdC5nZXRQcm9qZWN0TmFtZSgpO1xuICBsb2dnZXIuaW5mbyhgQW5ndWxhciBjb21waWxlciBvcHRpb25zIGZvciAke3Byb2plY3ROYW1lfTogYCArIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMsIG51bGwsIDIpKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhcbiAgICBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgaG9zdDogQ29uZmlndXJhdGlvbkhvc3QpOiBDb21waWxlck9wdGlvbnMge1xuICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICBjb25zdCB7b3B0aW9ucywgZXJyb3JzfSA9XG4gICAgICByZWFkQ29uZmlndXJhdGlvbihwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIC8qIGV4aXN0aW5nT3B0aW9ucyAqLyB1bmRlZmluZWQsIGhvc3QpO1xuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBwcm9qZWN0LnNldFByb2plY3RFcnJvcnMoZXJyb3JzKTtcbiAgfVxuXG4gIC8vIFByb2plY3RzIGxvYWRlZCBpbnRvIHRoZSBMYW5ndWFnZSBTZXJ2aWNlIG9mdGVuIGluY2x1ZGUgdGVzdCBmaWxlcyB3aGljaCBhcmUgbm90IHBhcnQgb2YgdGhlXG4gIC8vIGFwcCdzIG1haW4gY29tcGlsYXRpb24gdW5pdCwgYW5kIHRoZXNlIHRlc3QgZmlsZXMgb2Z0ZW4gaW5jbHVkZSBpbmxpbmUgTmdNb2R1bGVzIHRoYXQgZGVjbGFyZVxuICAvLyBjb21wb25lbnRzIGZyb20gdGhlIGFwcC4gVGhlc2UgZGVjbGFyYXRpb25zIGNvbmZsaWN0IHdpdGggdGhlIG1haW4gZGVjbGFyYXRpb25zIG9mIHN1Y2hcbiAgLy8gY29tcG9uZW50cyBpbiB0aGUgYXBwJ3MgTmdNb2R1bGVzLiBUaGlzIGNvbmZsaWN0IGlzIG5vdCBub3JtYWxseSBwcmVzZW50IGR1cmluZyByZWd1bGFyXG4gIC8vIGNvbXBpbGF0aW9uIGJlY2F1c2UgdGhlIGFwcCBhbmQgdGhlIHRlc3RzIGFyZSBwYXJ0IG9mIHNlcGFyYXRlIGNvbXBpbGF0aW9uIHVuaXRzLlxuICAvL1xuICAvLyBBcyBhIHRlbXBvcmFyeSBtaXRpZ2F0aW9uIG9mIHRoaXMgcHJvYmxlbSwgd2UgaW5zdHJ1Y3QgdGhlIGNvbXBpbGVyIHRvIGlnbm9yZSBjbGFzc2VzIHdoaWNoXG4gIC8vIGFyZSBub3QgZXhwb3J0ZWQuIEluIG1hbnkgY2FzZXMsIHRoaXMgZW5zdXJlcyB0aGUgdGVzdCBOZ01vZHVsZXMgYXJlIGlnbm9yZWQgYnkgdGhlIGNvbXBpbGVyXG4gIC8vIGFuZCBvbmx5IHRoZSByZWFsIGNvbXBvbmVudCBkZWNsYXJhdGlvbiBpcyB1c2VkLlxuICBvcHRpb25zLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgPSBmYWxzZTtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5KHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTpcbiAgICBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kge1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRzSW5saW5lT3BlcmF0aW9uczogZmFsc2UsXG4gICAgc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQWJzb2x1dGVGc1BhdGgge1xuICAgICAgcmV0dXJuIFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCkpKTtcbiAgICB9LFxuICAgIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gcHJvamVjdC5nZXRMYW5ndWFnZVNlcnZpY2UoKS5nZXRQcm9ncmFtKCk7XG4gICAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYW5ndWFnZSBzZXJ2aWNlIGRvZXMgbm90IGhhdmUgYSBwcm9ncmFtIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgfSxcbiAgICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KSB7XG4gICAgICBmb3IgKGNvbnN0IFtmaWxlTmFtZSwgbmV3VGV4dF0gb2YgY29udGVudHMpIHtcbiAgICAgICAgY29uc3Qgc2NyaXB0SW5mbyA9IGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhwcm9qZWN0LCBmaWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IHNuYXBzaG90ID0gc2NyaXB0SW5mby5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBjb25zdCBsZW5ndGggPSBzbmFwc2hvdC5nZXRMZW5ndGgoKTtcbiAgICAgICAgc2NyaXB0SW5mby5lZGl0Q29udGVudCgwLCBsZW5ndGgsIG5ld1RleHQpO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlVHlwZUNoZWNrU2NyaXB0SW5mbyhcbiAgICBwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgdGNmOiBzdHJpbmcpOiB0cy5zZXJ2ZXIuU2NyaXB0SW5mbyB7XG4gIC8vIEZpcnN0IGNoZWNrIGlmIHRoZXJlIGlzIGFscmVhZHkgYSBTY3JpcHRJbmZvIGZvciB0aGUgdGNmXG4gIGNvbnN0IHtwcm9qZWN0U2VydmljZX0gPSBwcm9qZWN0O1xuICBsZXQgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldFNjcmlwdEluZm8odGNmKTtcbiAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgLy8gU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBvcGVuZWQgYnkgY2xpZW50IHRvIGJlIGFibGUgdG8gc2V0IGl0cyB1c2VyLWRlZmluZWRcbiAgICAvLyBjb250ZW50LiBXZSBtdXN0IGFsc28gcHJvdmlkZSBmaWxlIGNvbnRlbnQsIG90aGVyd2lzZSB0aGUgc2VydmljZSB3aWxsXG4gICAgLy8gYXR0ZW1wdCB0byBmZXRjaCB0aGUgY29udGVudCBmcm9tIGRpc2sgYW5kIGZhaWwuXG4gICAgc2NyaXB0SW5mbyA9IHByb2plY3RTZXJ2aWNlLmdldE9yQ3JlYXRlU2NyaXB0SW5mb0Zvck5vcm1hbGl6ZWRQYXRoKFxuICAgICAgICB0cy5zZXJ2ZXIudG9Ob3JtYWxpemVkUGF0aCh0Y2YpLFxuICAgICAgICB0cnVlLCAgLy8gb3BlbmVkQnlDbGllbnRcbiAgICAgICAgJycsICAgIC8vIGZpbGVDb250ZW50XG4gICAgICAgIC8vIHNjcmlwdCBpbmZvIGFkZGVkIGJ5IHBsdWdpbnMgc2hvdWxkIGJlIG1hcmtlZCBhcyBleHRlcm5hbCwgc2VlXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL2IyMTdmMjJlNzk4Yzc4MWY1NWQxN2RhNzJlZDA5OWE5ZGVlNWM2NTAvc3JjL2NvbXBpbGVyL3Byb2dyYW0udHMjTDE4OTctTDE4OTlcbiAgICAgICAgdHMuU2NyaXB0S2luZC5FeHRlcm5hbCwgIC8vIHNjcmlwdEtpbmRcbiAgICApO1xuICAgIGlmICghc2NyaXB0SW5mbykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHNjcmlwdCBpbmZvIGZvciAke3RjZn1gKTtcbiAgICB9XG4gIH1cbiAgLy8gQWRkIFNjcmlwdEluZm8gdG8gcHJvamVjdCBpZiBpdCdzIG1pc3NpbmcuIEEgU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBwYXJ0IG9mXG4gIC8vIHRoZSBwcm9qZWN0IHNvIHRoYXQgaXQgYmVjb21lcyBwYXJ0IG9mIHRoZSBwcm9ncmFtLlxuICBpZiAoIXByb2plY3QuY29udGFpbnNTY3JpcHRJbmZvKHNjcmlwdEluZm8pKSB7XG4gICAgcHJvamVjdC5hZGRSb290KHNjcmlwdEluZm8pO1xuICB9XG4gIHJldHVybiBzY3JpcHRJbmZvO1xufVxuXG5mdW5jdGlvbiBub2RlQ29udGV4dEZyb21UYXJnZXQodGFyZ2V0OiBUYXJnZXRDb250ZXh0KTogQ29tcGxldGlvbk5vZGVDb250ZXh0IHtcbiAgc3dpdGNoICh0YXJnZXQua2luZCkge1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuRWxlbWVudEluVGFnQ29udGV4dDpcbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudFRhZztcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLkVsZW1lbnRJbkJvZHlDb250ZXh0OlxuICAgICAgLy8gQ29tcGxldGlvbnMgaW4gZWxlbWVudCBib2RpZXMgYXJlIGZvciBuZXcgYXR0cmlidXRlcy5cbiAgICAgIHJldHVybiBDb21wbGV0aW9uTm9kZUNvbnRleHQuRWxlbWVudEF0dHJpYnV0ZUtleTtcbiAgICBjYXNlIFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5Ud29XYXlCaW5kaW5nO1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5LZXlDb250ZXh0OlxuICAgICAgcmV0dXJuIENvbXBsZXRpb25Ob2RlQ29udGV4dC5FbGVtZW50QXR0cmlidXRlS2V5O1xuICAgIGNhc2UgVGFyZ2V0Tm9kZUtpbmQuQXR0cmlidXRlSW5WYWx1ZUNvbnRleHQ6XG4gICAgICBpZiAodGFyZ2V0Lm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0LkV2ZW50VmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0Lk5vbmU7XG4gICAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIE5vIHNwZWNpYWwgY29udGV4dCBpcyBhdmFpbGFibGUuXG4gICAgICByZXR1cm4gQ29tcGxldGlvbk5vZGVDb250ZXh0Lk5vbmU7XG4gIH1cbn1cbiJdfQ==