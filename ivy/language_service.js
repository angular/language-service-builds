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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/language_service_adapter", "@angular/language-service/ivy/quick_info"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseNgCompilerOptions = exports.LanguageService = void 0;
    var tslib_1 = require("tslib");
    var compiler_cli_1 = require("@angular/compiler-cli");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var ts = require("typescript/lib/tsserverlibrary");
    var compiler_factory_1 = require("@angular/language-service/ivy/compiler_factory");
    var definitions_1 = require("@angular/language-service/ivy/definitions");
    var language_service_adapter_1 = require("@angular/language-service/ivy/language_service_adapter");
    var quick_info_1 = require("@angular/language-service/ivy/quick_info");
    var LanguageService = /** @class */ (function () {
        function LanguageService(project, tsLS) {
            this.tsLS = tsLS;
            this.options = parseNgCompilerOptions(project);
            this.strategy = createTypeCheckingProgramStrategy(project);
            this.adapter = new language_service_adapter_1.LanguageServiceAdapter(project);
            this.compilerFactory = new compiler_factory_1.CompilerFactory(this.adapter, this.strategy);
            this.watchConfigFile(project);
        }
        LanguageService.prototype.getSemanticDiagnostics = function (fileName) {
            var e_1, _a;
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName, this.options);
            var ttc = compiler.getTemplateTypeChecker();
            var diagnostics = [];
            if (language_service_adapter_1.isTypeScriptFile(fileName)) {
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
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName, this.options);
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getDefinitionAndBoundSpan(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getTypeDefinitionAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName, this.options);
            var results = new definitions_1.DefinitionBuilder(this.tsLS, compiler).getTypeDefinitionsAtPosition(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
        };
        LanguageService.prototype.getQuickInfoAtPosition = function (fileName, position) {
            var compiler = this.compilerFactory.getOrCreateWithChangedFile(fileName, this.options);
            var results = new quick_info_1.QuickInfoBuilder(this.tsLS, compiler).get(fileName, position);
            this.compilerFactory.registerLastKnownProgram();
            return results;
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
                    _this.options = parseNgCompilerOptions(project);
                }
            });
        };
        return LanguageService;
    }());
    exports.LanguageService = LanguageService;
    function parseNgCompilerOptions(project) {
        var config = {};
        if (project instanceof ts.server.ConfiguredProject) {
            var configPath = project.getConfigFilePath();
            var result = ts.readConfigFile(configPath, function (path) { return project.readFile(path); });
            if (result.error) {
                project.error(ts.flattenDiagnosticMessageText(result.error.messageText, '\n'));
            }
            config = result.config || config;
        }
        var basePath = project.getCurrentDirectory();
        return compiler_cli_1.createNgCompilerOptions(basePath, config, project.getCompilationSettings());
    }
    exports.parseNgCompilerOptions = parseNgCompilerOptions;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILHNEQUErRTtJQUUvRSwyRUFBbUc7SUFDbkcsdUVBQWlGO0lBQ2pGLHFFQUF1RztJQUN2RyxtREFBcUQ7SUFFckQsbUZBQW1EO0lBQ25ELHlFQUFnRDtJQUNoRCxtR0FBd0c7SUFDeEcsdUVBQThDO0lBRTlDO1FBTUUseUJBQVksT0FBMEIsRUFBbUIsSUFBd0I7WUFBeEIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDL0UsSUFBSSxDQUFDLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxHQUFHLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpREFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxnREFBc0IsR0FBdEIsVUFBdUIsUUFBZ0I7O1lBQ3JDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6RixJQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM5QyxJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksMkNBQWdCLENBQUMsUUFBUSxD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RyxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLDZFQUE2RTtZQUM3RSx5RUFBeUU7WUFDekUsbURBQW1EO1lBQ25ELFVBQVUsR0FBRyxjQUFjLENBQUMsc0NBQXNDLENBQzlELEVBQUUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQy9CLElBQUksRUFBZSxpQkFBaUI7WUFDcEMsRUFBRSxFQUFpQixjQUFjO1lBQ2pDLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUNuQixDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFvQyxHQUFLLENBQUMsQ0FBQzthQUM1RDtTQUNGO1FBQ0QsOEVBQThFO1FBQzlFLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDN0I7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBjcmVhdGVOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknO1xuXG5pbXBvcnQge0NvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcbmltcG9ydCB7RGVmaW5pdGlvbkJ1aWxkZXJ9IGZyb20gJy4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHtpc0V4dGVybmFsVGVtcGxhdGUsIGlzVHlwZVNjcmlwdEZpbGUsIExhbmd1YWdlU2VydmljZUFkYXB0ZXJ9IGZyb20gJy4vbGFuZ3VhZ2Vfc2VydmljZV9hZGFwdGVyJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcblxuZXhwb3J0IGNsYXNzIExhbmd1YWdlU2VydmljZSB7XG4gIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyRmFjdG9yeTogQ29tcGlsZXJGYWN0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIHByaXZhdGUgcmVhZG9ubHkgYWRhcHRlcjogTGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlcjtcblxuICBjb25zdHJ1Y3Rvcihwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3QpO1xuICAgIHRoaXMuc3RyYXRlZ3kgPSBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdCk7XG4gICAgdGhpcy5hZGFwdGVyID0gbmV3IExhbmd1YWdlU2VydmljZUFkYXB0ZXIocHJvamVjdCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkgPSBuZXcgQ29tcGlsZXJGYWN0b3J5KHRoaXMuYWRhcHRlciwgdGhpcy5zdHJhdGVneSk7XG4gICAgdGhpcy53YXRjaENvbmZpZ0ZpbGUocHJvamVjdCk7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUsIHRoaXMub3B0aW9ucyk7XG4gICAgY29uc3QgdHRjID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpO1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckZpbGUoc291cmNlRmlsZSwgT3B0aW1pemVGb3IuU2luZ2xlRmlsZSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgZm9yIChjb25zdCBjb21wb25lbnQgb2YgY29tcG9uZW50cykge1xuICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3BhblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IERlZmluaXRpb25CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIpLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICB0aGlzLmNvbXBpbGVyRmFjdG9yeS5yZWdpc3Rlckxhc3RLbm93blByb2dyYW0oKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIGdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLkRlZmluaXRpb25JbmZvW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lLCB0aGlzLm9wdGlvbnMpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0VHlwZURlZmluaXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgICBjb25zdCByZXN1bHRzID0gbmV3IFF1aWNrSW5mb0J1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTogQ29tcGlsZXJPcHRpb25zIHtcbiAgbGV0IGNvbmZpZyA9IHt9O1xuICBpZiAocHJvamVjdCBpbnN0YW5jZW9mIHRzLnNlcnZlci5Db25maWd1cmVkUHJvamVjdCkge1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gdHMucmVhZENvbmZpZ0ZpbGUoY29uZmlnUGF0aCwgcGF0aCA9PiBwcm9qZWN0LnJlYWRGaWxlKHBhdGgpKTtcbiAgICBpZiAocmVzdWx0LmVycm9yKSB7XG4gICAgICBwcm9qZWN0LmVycm9yKHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQocmVzdWx0LmVycm9yLm1lc3NhZ2VUZXh0LCAnXFxuJykpO1xuICAgIH1cbiAgICBjb25maWcgPSByZXN1bHQuY29uZmlnIHx8IGNvbmZpZztcbiAgfVxuICBjb25zdCBiYXNlUGF0aCA9IHByb2plY3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICByZXR1cm4gY3JlYXRlTmdDb21waWxlck9wdGlvbnMoYmFzZVBhdGgsIGNvbmZpZywgcHJvamVjdC5nZXRDb21waWxhdGlvblNldHRpbmdzKCkpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOlxuICAgIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSB7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zOiBmYWxzZSxcbiAgICBzaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgICByZXR1cm4gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIH0sXG4gICAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBwcm9qZWN0LmdldExhbmd1YWdlU2VydmljZSgpLmdldFByb2dyYW0oKTtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZG9lcyBub3QgaGF2ZSBhIHByb2dyYW0hJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4pIHtcbiAgICAgIGZvciAoY29uc3QgW2ZpbGVOYW1lLCBuZXdUZXh0XSBvZiBjb250ZW50cykge1xuICAgICAgICBjb25zdCBzY3JpcHRJbmZvID0gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKHByb2plY3QsIGZpbGVOYW1lKTtcbiAgICAgICAgY29uc3Qgc25hcHNob3QgPSBzY3JpcHRJbmZvLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IHNuYXBzaG90LmdldExlbmd0aCgpO1xuICAgICAgICBzY3JpcHRJbmZvLmVkaXRDb250ZW50KDAsIGxlbmd0aCwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVUeXBlQ2hlY2tTY3JpcHRJbmZvKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCB0Y2Y6IHN0cmluZyk6IHRzLnNlcnZlci5TY3JpcHRJbmZvIHtcbiAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIFNjcmlwdEluZm8gZm9yIHRoZSB0Y2ZcbiAgY29uc3Qge3Byb2plY3RTZXJ2aWNlfSA9IHByb2plY3Q7XG4gIGxldCBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0U2NyaXB0SW5mbyh0Y2YpO1xuICBpZiAoIXNjcmlwdEluZm8pIHtcbiAgICAvLyBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIG9wZW5lZCBieSBjbGllbnQgdG8gYmUgYWJsZSB0byBzZXQgaXRzIHVzZXItZGVmaW5lZFxuICAgIC8vIGNvbnRlbnQuIFdlIG11c3QgYWxzbyBwcm92aWRlIGZpbGUgY29udGVudCwgb3RoZXJ3aXNlIHRoZSBzZXJ2aWNlIHdpbGxcbiAgICAvLyBhdHRlbXB0IHRvIGZldGNoIHRoZSBjb250ZW50IGZyb20gZGlzayBhbmQgZmFpbC5cbiAgICBzY3JpcHRJbmZvID0gcHJvamVjdFNlcnZpY2UuZ2V0T3JDcmVhdGVTY3JpcHRJbmZvRm9yTm9ybWFsaXplZFBhdGgoXG4gICAgICAgIHRzLnNlcnZlci50b05vcm1hbGl6ZWRQYXRoKHRjZiksXG4gICAgICAgIHRydWUsICAgICAgICAgICAgICAvLyBvcGVuZWRCeUNsaWVudFxuICAgICAgICAnJywgICAgICAgICAgICAgICAgLy8gZmlsZUNvbnRlbnRcbiAgICAgICAgdHMuU2NyaXB0S2luZC5UUywgIC8vIHNjcmlwdEtpbmRcbiAgICApO1xuICAgIGlmICghc2NyaXB0SW5mbykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIHNjcmlwdCBpbmZvIGZvciAke3RjZn1gKTtcbiAgICB9XG4gIH1cbiAgLy8gQWRkIFNjcmlwdEluZm8gdG8gcHJvamVjdCBpZiBpdCdzIG1pc3NpbmcuIEEgU2NyaXB0SW5mbyBuZWVkcyB0byBiZSBwYXJ0IG9mXG4gIC8vIHRoZSBwcm9qZWN0IHNvIHRoYXQgaXQgYmVjb21lcyBwYXJ0IG9mIHRoZSBwcm9ncmFtLlxuICBpZiAoIXByb2plY3QuY29udGFpbnNTY3JpcHRJbmZvKHNjcmlwdEluZm8pKSB7XG4gICAgcHJvamVjdC5hZGRSb290KHNjcmlwdEluZm8pO1xuICB9XG4gIHJldHVybiBzY3JpcHRJbmZvO1xufVxuIl19