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
        define("@angular/language-service/ivy/language_service", ["require", "exports", "tslib", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/language-service/ivy/references", "typescript/lib/tsserverlibrary", "@angular/language-service/ivy/adapters", "@angular/language-service/ivy/compiler_factory", "@angular/language-service/ivy/definitions", "@angular/language-service/ivy/quick_info", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
    var references_1 = require("@angular/language-service/ivy/references");
    var ts = require("typescript/lib/tsserverlibrary");
    var adapters_1 = require("@angular/language-service/ivy/adapters");
    var compiler_factory_1 = require("@angular/language-service/ivy/compiler_factory");
    var definitions_1 = require("@angular/language-service/ivy/definitions");
    var quick_info_1 = require("@angular/language-service/ivy/quick_info");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2Vfc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2xhbmd1YWdlX3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILHNEQUE0RjtJQUM1RiwyRUFBbUc7SUFDbkcsdUVBQWlGO0lBQ2pGLHFFQUF1RztJQUN2Ryx1RUFBMEU7SUFDMUUsbURBQXFEO0lBRXJELG1FQUFxRTtJQUNyRSxtRkFBbUQ7SUFDbkQseUVBQWdEO0lBQ2hELHVFQUE4QztJQUM5QyxpRkFBc0Q7SUFDdEQsNkRBQW9FO0lBRXBFO1FBT0UseUJBQVksT0FBMEIsRUFBbUIsSUFBd0I7WUFBeEIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDL0UsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLDRCQUFpQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxRQUFRLEdBQUcsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlDQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBRUQsNENBQWtCLEdBQWxCO1lBQ0UsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3RCLENBQUM7UUFFRCxnREFBc0Is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Q0FBQyxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDN0I7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBDb25maWd1cmF0aW9uSG9zdCwgcmVhZENvbmZpZ3VyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2snO1xuaW1wb3J0IHtPcHRpbWl6ZUZvciwgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtSZWZlcmVuY2VCdWlsZGVyfSBmcm9tICdAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlL2l2eS9yZWZlcmVuY2VzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7TGFuZ3VhZ2VTZXJ2aWNlQWRhcHRlciwgTFNQYXJzZUNvbmZpZ0hvc3R9IGZyb20gJy4vYWRhcHRlcnMnO1xuaW1wb3J0IHtDb21waWxlckZhY3Rvcnl9IGZyb20gJy4vY29tcGlsZXJfZmFjdG9yeSc7XG5pbXBvcnQge0RlZmluaXRpb25CdWlsZGVyfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7UXVpY2tJbmZvQnVpbGRlcn0gZnJvbSAnLi9xdWlja19pbmZvJztcbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbn0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1R5cGVTY3JpcHRGaWxlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIExhbmd1YWdlU2VydmljZSB7XG4gIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICByZWFkb25seSBjb21waWxlckZhY3Rvcnk6IENvbXBpbGVyRmFjdG9yeTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5O1xuICBwcml2YXRlIHJlYWRvbmx5IGFkYXB0ZXI6IExhbmd1YWdlU2VydmljZUFkYXB0ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFyc2VDb25maWdIb3N0OiBMU1BhcnNlQ29uZmlnSG9zdDtcblxuICBjb25zdHJ1Y3Rvcihwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCwgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UpIHtcbiAgICB0aGlzLnBhcnNlQ29uZmlnSG9zdCA9IG5ldyBMU1BhcnNlQ29uZmlnSG9zdChwcm9qZWN0LnByb2plY3RTZXJ2aWNlLmhvc3QpO1xuICAgIHRoaXMub3B0aW9ucyA9IHBhcnNlTmdDb21waWxlck9wdGlvbnMocHJvamVjdCwgdGhpcy5wYXJzZUNvbmZpZ0hvc3QpO1xuICAgIHRoaXMuc3RyYXRlZ3kgPSBjcmVhdGVUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kocHJvamVjdCk7XG4gICAgdGhpcy5hZGFwdGVyID0gbmV3IExhbmd1YWdlU2VydmljZUFkYXB0ZXIocHJvamVjdCk7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkgPSBuZXcgQ29tcGlsZXJGYWN0b3J5KHRoaXMuYWRhcHRlciwgdGhpcy5zdHJhdGVneSwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLndhdGNoQ29uZmlnRmlsZShwcm9qZWN0KTtcbiAgfVxuXG4gIGdldENvbXBpbGVyT3B0aW9ucygpOiBDb21waWxlck9wdGlvbnMge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnM7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHR0YyA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKTtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUpIHtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNvdXJjZUZpbGUsIE9wdGltaXplRm9yLlNpbmdsZUZpbGUpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGZvciAoY29uc3QgY29tcG9uZW50IG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50dGMuZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW5cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuRGVmaW5pdGlvbkluZm9bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlckZhY3RvcnkuZ2V0T3JDcmVhdGVXaXRoQ2hhbmdlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdHMgPVxuICAgICAgICBuZXcgRGVmaW5pdGlvbkJ1aWxkZXIodGhpcy50c0xTLCBjb21waWxlcikuZ2V0VHlwZURlZmluaXRpb25zQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyRmFjdG9yeS5nZXRPckNyZWF0ZVdpdGhDaGFuZ2VkRmlsZShmaWxlTmFtZSk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24sIGNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGVJbmZvLnRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0cyA9XG4gICAgICAgIG5ldyBRdWlja0luZm9CdWlsZGVyKHRoaXMudHNMUywgY29tcGlsZXIsIHRlbXBsYXRlSW5mby5jb21wb25lbnQsIHBvc2l0aW9uRGV0YWlscy5ub2RlKVxuICAgICAgICAgICAgLmdldCgpO1xuICAgIHRoaXMuY29tcGlsZXJGYWN0b3J5LnJlZ2lzdGVyTGFzdEtub3duUHJvZ3JhbSgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJGYWN0b3J5LmdldE9yQ3JlYXRlV2l0aENoYW5nZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBjb25zdCByZXN1bHRzID1cbiAgICAgICAgbmV3IFJlZmVyZW5jZUJ1aWxkZXIodGhpcy5zdHJhdGVneSwgdGhpcy50c0xTLCBjb21waWxlcikuZ2V0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgdGhpcy5jb21waWxlckZhY3RvcnkucmVnaXN0ZXJMYXN0S25vd25Qcm9ncmFtKCk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICBwcml2YXRlIHdhdGNoQ29uZmlnRmlsZShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCkge1xuICAgIC8vIFRPRE86IENoZWNrIHRoZSBjYXNlIHdoZW4gdGhlIHByb2plY3QgaXMgZGlzcG9zZWQuIEFuIEluZmVycmVkUHJvamVjdFxuICAgIC8vIGNvdWxkIGJlIGRpc3Bvc2VkIHdoZW4gYSB0c2NvbmZpZy5qc29uIGlzIGFkZGVkIHRvIHRoZSB3b3Jrc3BhY2UsXG4gICAgLy8gaW4gd2hpY2ggY2FzZSBpdCBiZWNvbWVzIGEgQ29uZmlndXJlZFByb2plY3QgKG9yIHZpY2UtdmVyc2EpLlxuICAgIC8vIFdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIEZpbGVXYXRjaGVyIGlzIGNsb3NlZC5cbiAgICBpZiAoIShwcm9qZWN0IGluc3RhbmNlb2YgdHMuc2VydmVyLkNvbmZpZ3VyZWRQcm9qZWN0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7aG9zdH0gPSBwcm9qZWN0LnByb2plY3RTZXJ2aWNlO1xuICAgIGhvc3Qud2F0Y2hGaWxlKFxuICAgICAgICBwcm9qZWN0LmdldENvbmZpZ0ZpbGVQYXRoKCksIChmaWxlTmFtZTogc3RyaW5nLCBldmVudEtpbmQ6IHRzLkZpbGVXYXRjaGVyRXZlbnRLaW5kKSA9PiB7XG4gICAgICAgICAgcHJvamVjdC5sb2coYENvbmZpZyBmaWxlIGNoYW5nZWQ6ICR7ZmlsZU5hbWV9YCk7XG4gICAgICAgICAgaWYgKGV2ZW50S2luZCA9PT0gdHMuRmlsZVdhdGNoZXJFdmVudEtpbmQuQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gcGFyc2VOZ0NvbXBpbGVyT3B0aW9ucyhwcm9qZWN0LCB0aGlzLnBhcnNlQ29uZmlnSG9zdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0LCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCk6IENvbXBpbGVyT3B0aW9ucyB7XG4gIGlmICghKHByb2plY3QgaW5zdGFuY2VvZiB0cy5zZXJ2ZXIuQ29uZmlndXJlZFByb2plY3QpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IHtvcHRpb25zLCBlcnJvcnN9ID1cbiAgICAgIHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QuZ2V0Q29uZmlnRmlsZVBhdGgoKSwgLyogZXhpc3RpbmdPcHRpb25zICovIHVuZGVmaW5lZCwgaG9zdCk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHByb2plY3Quc2V0UHJvamVjdEVycm9ycyhlcnJvcnMpO1xuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneShwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6XG4gICAgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5IHtcbiAgcmV0dXJuIHtcbiAgICBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnM6IGZhbHNlLFxuICAgIHNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IEFic29sdXRlRnNQYXRoIHtcbiAgICAgIHJldHVybiBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IoYWJzb2x1dGVGcm9tU291cmNlRmlsZShjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpKSk7XG4gICAgfSxcbiAgICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IHByb2plY3QuZ2V0TGFuZ3VhZ2VTZXJ2aWNlKCkuZ2V0UHJvZ3JhbSgpO1xuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2Ugc2VydmljZSBkb2VzIG5vdCBoYXZlIGEgcHJvZ3JhbSEnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH0sXG4gICAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPikge1xuICAgICAgZm9yIChjb25zdCBbZmlsZU5hbWUsIG5ld1RleHRdIG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNjcmlwdEluZm8gPSBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8ocHJvamVjdCwgZmlsZU5hbWUpO1xuICAgICAgICBjb25zdCBzbmFwc2hvdCA9IHNjcmlwdEluZm8uZ2V0U25hcHNob3QoKTtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gc25hcHNob3QuZ2V0TGVuZ3RoKCk7XG4gICAgICAgIHNjcmlwdEluZm8uZWRpdENvbnRlbnQoMCwgbGVuZ3RoLCBuZXdUZXh0KTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZVR5cGVDaGVja1NjcmlwdEluZm8oXG4gICAgcHJvamVjdDogdHMuc2VydmVyLlByb2plY3QsIHRjZjogc3RyaW5nKTogdHMuc2VydmVyLlNjcmlwdEluZm8ge1xuICAvLyBGaXJzdCBjaGVjayBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgU2NyaXB0SW5mbyBmb3IgdGhlIHRjZlxuICBjb25zdCB7cHJvamVjdFNlcnZpY2V9ID0gcHJvamVjdDtcbiAgbGV0IHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRTY3JpcHRJbmZvKHRjZik7XG4gIGlmICghc2NyaXB0SW5mbykge1xuICAgIC8vIFNjcmlwdEluZm8gbmVlZHMgdG8gYmUgb3BlbmVkIGJ5IGNsaWVudCB0byBiZSBhYmxlIHRvIHNldCBpdHMgdXNlci1kZWZpbmVkXG4gICAgLy8gY29udGVudC4gV2UgbXVzdCBhbHNvIHByb3ZpZGUgZmlsZSBjb250ZW50LCBvdGhlcndpc2UgdGhlIHNlcnZpY2Ugd2lsbFxuICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggdGhlIGNvbnRlbnQgZnJvbSBkaXNrIGFuZCBmYWlsLlxuICAgIHNjcmlwdEluZm8gPSBwcm9qZWN0U2VydmljZS5nZXRPckNyZWF0ZVNjcmlwdEluZm9Gb3JOb3JtYWxpemVkUGF0aChcbiAgICAgICAgdHMuc2VydmVyLnRvTm9ybWFsaXplZFBhdGgodGNmKSxcbiAgICAgICAgdHJ1ZSwgICAgICAgICAgICAgIC8vIG9wZW5lZEJ5Q2xpZW50XG4gICAgICAgICcnLCAgICAgICAgICAgICAgICAvLyBmaWxlQ29udGVudFxuICAgICAgICB0cy5TY3JpcHRLaW5kLlRTLCAgLy8gc2NyaXB0S2luZFxuICAgICk7XG4gICAgaWYgKCFzY3JpcHRJbmZvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgc2NyaXB0IGluZm8gZm9yICR7dGNmfWApO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgU2NyaXB0SW5mbyB0byBwcm9qZWN0IGlmIGl0J3MgbWlzc2luZy4gQSBTY3JpcHRJbmZvIG5lZWRzIHRvIGJlIHBhcnQgb2ZcbiAgLy8gdGhlIHByb2plY3Qgc28gdGhhdCBpdCBiZWNvbWVzIHBhcnQgb2YgdGhlIHByb2dyYW0uXG4gIGlmICghcHJvamVjdC5jb250YWluc1NjcmlwdEluZm8oc2NyaXB0SW5mbykpIHtcbiAgICBwcm9qZWN0LmFkZFJvb3Qoc2NyaXB0SW5mbyk7XG4gIH1cbiAgcmV0dXJuIHNjcmlwdEluZm87XG59XG4iXX0=