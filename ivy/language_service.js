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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/completions", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/references", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LanguageService = void 0;
    var tslib_1 = require("tslib");
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
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(ttc.getDiagnosticsForFile(sourceFile, api_1.OptimizeFor.SingleFile)));
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
            var results = new quick_info_1.QuickInfoBuilder(this.tsLS, compiler, templateInfo.component, positionDetails.node)
                .get();
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
            return new completions_1.CompletionBuilder(this.tsLS, compiler, templateInfo.component, positionDetails.node, positionDetails.parent, positionDetails.context);
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
        LanguageService.prototype.getCompletionEntrySymbol = function (fileName, position, name) {
            var builder = this.getCompletionBuilder(fileName, position);
            if (builder === null) {
                return undefined;
            }
            var result = builder.getCompletionEntrySymbol(name);
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
                }
            });
        };
        return LanguageService;
    }());
    exports.LanguageService = LanguageService;
    function parseNgCompilerOptions(project, host) {
        if (!(project instanceof ts.server.ConfiguredProject)) {
            return {};
        }
        var _a = compiler_cli_1.readConfiguration(project.getConfigFilePath(), /* existingOptions */ undefined, host), options = _a.options, errors = _a.errors;
        if (errors.length > 0) {
            project.setProjectErrors(errors);
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
            ts.ScriptKind.TS);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILHNEQUE0RjtJQUM1RiwyRUFBbUc7SUFDbkcsdUVBQWlGO0lBQ2pGLHFFQUF1RztJQUN2RyxtREFBcUQ7SUFFckQsbUVBQXFFO0lBQ3JFLG1GQUFtRDtJQUNuRCx5RUFBZ0Q7SUFDaEQseUVBQWdEO0lBQ2hELHVFQUE4QztJQUM5Qyx1RUFBOEM7SUFDOUMsaUZBQXNEO0lBQ3RELDZEQUFvRTtJQUVwRTtRQU9FLHlCQUFZLE9BQTBCLEVBQW1CLElBQXdCO1lBQXhCLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQy9FLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSw0QkFBaUIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsUUFBUSxHQUFHLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQ0FBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELDRDQUFrQixHQUFsQjtZQUNFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFD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QUFFLFFBQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDNUM7Ozs7Ozs7OztZQUNILENBQUM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsOEJBQThCLENBQ25DLE9BQTBCLEVBQUUsR0FBVztRQUN6QywyREFBMkQ7UUFDcEQsSUFBQSxjQUFjLEdBQUksT0FBTyxlQUFYLENBQVk7UUFDakMsSUFBSSxVQUFVLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsNkVBQTZFO1lBQzdFLHlFQUF5RTtZQUN6RSxtREFBbUQ7WUFDbkQsVUFBVSxHQUFHLGNBQWMsQ0FBQyxzQ0FBc0MsQ0FDOUQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFDL0IsSUFBSSxFQUFlLGlCQUFpQjtZQUNwQyxFQUFFLEVBQWlCLGNBQWM7WUFDakMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ25CLENBQUM7WUFDRixJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQW9DLEdBQUssQ0FBQyxDQUFDO2FBQzVEO1NBQ0Y7UUFDRCw4RUFBOEU7UUFDOUUsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUM3QjtRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgQ29uZmlndXJhdGlvbkhvc3QsIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGknO1xuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlciwgTFNQYXJzZUNvbmZpZ0hvc3R9IGZyb20gJy4vYWRhcHRlcnMnO1xuaW1wb3J0IHtDb21waWxlckZhY3Rvcnl9IGZyb20gJy4vY29tcGlsZXJfZmFjdG9yeSc7XG5pbXBvcnQge0NvbXBsZXRpb25CdWlsZGVyfSBmcm9tICcuL2NvbXBsZXRpb25zJztcbmltcG9ydCB7RGVmaW5pdGlvbkJ1aWxkZXJ9IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtRdWlja0luZm9CdWlsZGVyfSBmcm9tICcuL3F1aWNrX2luZm8nO1xuaW1wb3J0IHtSZWZlcmVuY2VCdWlsZGVyfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9ufSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGlzVHlwZVNjcmlwdEZpbGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJzZUNvbmZpZ0hvc3Q6IExTUGFyc2VDb25maWdIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSkge1xuICAgIHRoaXMucGFyc2VDb25maWdIb3N0ID0gbmV3IExTUGFyc2VDb25maWdIb3N0KHByb2plY3QucHJvamVjdFNlcnZpY2UuaG9zdCk7XG4gICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgdGhpcy5zdHJhdGVneSA9IGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0KTtcbiAgICB0aGlzLmFkYXB0ZXIgPSBuZXcgTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcihwcm9qZWN0KTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeSA9IG5ldyBDb21waWxlckZhY3RvcnkodGhpcy5hZGFwdGVyLCB0aGlzLnN0cmF0ZWd5LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMud2F0Y2hDb25maWdGaWxlKHByb2plY3QpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXJPcHRpb25zKCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucztcbiAgfVxuXG4gIGdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU6IHN0cmluZyk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckZpbGUoc291cmNlRmlsZSwgT3B0aW1pemVGb3IuU2luZ2xlRmlsZSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgZm9yIChjb25zdCBjb21wb25lbnQgb2YgY29tcG9uZW50cykge1xuICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBEZWZpbml0aW9uQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyKS5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICByZWFkb25seSB0cy5EZWZpbml0aW9uSW5mb1tdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBEZWZpbml0aW9uQnVpbGRlcih0aGlzLnRzTFMsIGNvbXBpbGVyKS5nZXRUeXBlRGVmaW5pdGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IFF1aWNrSW5mb0J1aWxkZXIodGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgcG9zaXRpb25EZXRhaWxzLm5vZGUpXG4gICAgICAgICAgICAuZ2V0KCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgUmVmZXJlbmNlQnVpbGRlcih0aGlzLnN0cmF0ZWd5LCB0aGlzLnRzTFMsIGNvbXBpbGVyKS5nZXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29tcGxldGlvbkJ1aWxkZXIoZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICBDb21wbGV0aW9uQnVpbGRlcjxUbXBsQXN0Tm9kZXxBU1Q+fG51bGwge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZUluZm8udGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBDb21wbGV0aW9uQnVpbGRlcihcbiAgICAgICAgdGhpcy50c0xTLCBjb21waWxlciwgdGVtcGxhdGVJbmZvLmNvbXBvbmVudCwgcG9zaXRpb25EZXRhaWxzLm5vZGUsIHBvc2l0aW9uRGV0YWlscy5wYXJlbnQsXG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0KTtcbiAgfVxuXG4gIGdldENvbXBsZXRpb25zQXRQb3NpdGlvbihcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIG9wdGlvbnM6IHRzLkdldENvbXBsZXRpb25zQXRQb3NpdGlvbk9wdGlvbnN8dW5kZWZpbmVkKTpcbiAgICAgIHRzLldpdGhNZXRhZGF0YTx0cy5Db21wbGV0aW9uSW5mbz58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRDb21wbGV0aW9uQnVpbGRlcihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZGVyLmdldENvbXBsZXRpb25zQXRQb3NpdGlvbihvcHRpb25zKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIGVudHJ5TmFtZTogc3RyaW5nLFxuICAgICAgZm9ybWF0T3B0aW9uczogdHMuRm9ybWF0Q29kZU9wdGlvbnN8dHMuRm9ybWF0Q29kZVNldHRpbmdzfHVuZGVmaW5lZCxcbiAgICAgIHByZWZlcmVuY2VzOiB0cy5Vc2VyUHJlZmVyZW5jZXN8dW5kZWZpbmVkKTogdHMuQ29tcGxldGlvbkVudHJ5RGV0YWlsc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ1aWxkZXIuZ2V0Q29tcGxldGlvbkVudHJ5RGV0YWlscyhlbnRyeU5hbWUsIGZvcm1hdE9wdGlvbnMsIHByZWZlcmVuY2VzKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsIG5hbWU6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldENvbXBsZXRpb25CdWlsZGVyKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGJ1aWxkZXIuZ2V0Q29tcGxldGlvbkVudHJ5U3ltYm9sKG5hbWUpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IHtvcHRpb25zLCBlcnJvcnN9ID1cbiAgICAgIHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgLyogZXhpc3RpbmdPcHRpb25zICovIHVuZGVmaW5lZCwgaG9zdCk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHByb2plY3Quc2V0UHJvamVjdEVycm9ycyhlcnJvcnMpO1xuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6XG4gICAgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5IHtcbiAgcmV0dXJuIHtcbiAgICBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnM6IGZhbHNlLFxuICAgIHNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IEFic29sdXRlRnNQYXRoIHtcbiAgICAgIHJldHVybiBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IoYWJzb2x1dGVGcm9tU291cmNlRmlsZShjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpKSk7XG4gICAgfSxcbiAgICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IHByb2plY3QuZ2V0TGFuZ3VhZ2VTZXJ2aWNlKCkuZ2V0UHJvZ3JhbSgpO1xuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2Ugc2VydmljZSBkb2VzIG5vdCBoYXZlIGEgcHJvZ3JhbSEnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH0sXG4gICAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPikge1xuICAgICAgZm9yIChjb25zdCBbZmlsZU5hbWUsIG5ld1RleHRdIG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNjcmlwdEluZm8gPSBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8ocHJvamVjdCwgZmlsZU5hbWUpO1xuICAgICAgICBjb25zdCBzbmFwc2hvdCA9IHNjcmlwdEluZm8uZ2V0U25hcHNob3QoKTtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gc25hcHNob3QuZ2V0TGVuZ3RoKCk7XG4gICAgICAgIHNjcmlwdEluZm8uZWRpdENvbnRlbnQoMCwgbGVuZ3RoLCBuZXdUZXh0KTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8oXG4gICAgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIHRjZjogc3RyaW5nKTogdHMuc2VydmVyLlNjcmlwdEluZm8ge1xuICAvLyBGaXJzdCBjaGVjayBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgU2NyaXB0SW5mbyBmb3IgdGhlIHRjZlxuICBjb25zdCB7cHJvamVjdFNlcnZpY2V9ID0gcHJvamVjdDtcbiAgbGV0IHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRTY3JpcHRJbmZvKHRjZik7XG4gIGlmICghc2NyaXB0SW5mbykge1xuICAgIC8vIFNjcmlwdEluZm8gbmVlZHMgdG8gYmUgb3BlbmVkIGJ5IGNsaWVudCB0byBiZSBhYmxlIHRvIHNldCBpdHMgdXNlci1kZWZpbmVkXG4gICAgLy8gY29udGVudC4gV2UgbXVzdCBhbHNvIHByb3ZpZGUgZmlsZSBjb250ZW50LCBvdGhlcndpc2UgdGhlIHNlcnZpY2Ugd2lsbFxuICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggdGhlIGNvbnRlbnQgZnJvbSBkaXNrIGFuZCBmYWlsLlxuICAgIHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRPckNyZWF0ZVNjcmlwdEluZm9Gb3JOb3JtYWxpemVkUGF0aChcbiAgICAgICAgdHMuc2VydmVyLnRvTm9ybWFsaXplZFBhdGgodGNmKSxcbiAgICAgICAgdHJ1ZSwgICAgICAgICAgICAgIC8vIG9wZW5lZEJ5Q2xpZW50XG4gICAgICAgICcnLCAgICAgICAgICAgICAgICAvLyBmaWxlQ29udGVudFxuICAgICAgICB0cy5TY3JpcHRLaW5kLlRTLCAgLy8gc2NyaXB0S2luZFxuICAgICk7XG4gICAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgc2NyaXB0IGluZm8gZm9yICR7dGNmfWApO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgU2NyaXB0SW5mbyB0byBwcm9qZWN0IGlmIGl0J3MgbWlzc2luZy4gQSBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIHBhcnQgb2ZcbiAgLy8gdGhlIHByb2plY3Qgc28gdGhhdCBpdCBiZWNvbWVzIHBhcnQgb2YgdGhlIHByb2dyYW0uXG4gIGlmICghcHJvamVjdC5jb250YWluc1NjcmlwdEluZm8oc2NyaXB0SW5mbykpIHtcbiAgICBwcm9qZWN0LmFkZFJvb3Qoc2NyaXB0SW5mbyk7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdEluZm87XG59XG4iXX0=