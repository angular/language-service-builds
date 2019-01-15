/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/language-service/src/ts_plugin", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/language_service", "@angular/language-service/src/typescript_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    var projectHostMap = new WeakMap();
    function getExternalFiles(project) {
        var host = projectHostMap.get(project);
        if (host) {
            return host.getTemplateReferences();
        }
    }
    exports.getExternalFiles = getExternalFiles;
    function completionToEntry(c) {
        return {
            // TODO: remove any and fix type error.
            kind: c.kind,
            name: c.name,
            sortText: c.sort,
            kindModifiers: ''
        };
    }
    function diagnosticChainToDiagnosticChain(chain) {
        return {
            messageText: chain.message,
            category: ts.DiagnosticCategory.Error,
            code: 0,
            next: chain.next ? diagnosticChainToDiagnosticChain(chain.next) : undefined
        };
    }
    function diagnosticMessageToDiagnosticMessageText(message) {
        if (typeof message === 'string') {
            return message;
        }
        return diagnosticChainToDiagnosticChain(message);
    }
    function diagnosticToDiagnostic(d, file) {
        var result = {
            file: file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: diagnosticMessageToDiagnosticMessageText(d.message),
            category: ts.DiagnosticCategory.Error,
            code: 0,
            source: 'ng'
        };
        return result;
    }
    function create(info /* ts.server.PluginCreateInfo */) {
        var oldLS = info.languageService;
        var proxy = Object.assign({}, oldLS);
        var logger = info.project.projectService.logger;
        function tryOperation(attempting, callback) {
            try {
                return callback();
            }
            catch (e) {
                logger.info("Failed to " + attempting + ": " + e.toString());
                logger.info("Stack trace: " + e.stack);
                return null;
            }
        }
        var serviceHost = new typescript_host_1.TypeScriptServiceHost(info.languageServiceHost, oldLS);
        var ls = language_service_1.createLanguageService(serviceHost);
        serviceHost.setSite(ls);
        projectHostMap.set(info.project, serviceHost);
        proxy.getCompletionsAtPosition = function (fileName, position, options) {
            var base = oldLS.getCompletionsAtPosition(fileName, position, options) || {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: []
            };
            tryOperation('get completions', function () {
                var e_1, _a;
                var results = ls.getCompletionsAt(fileName, position);
                if (results && results.length) {
                    if (base === undefined) {
                        base = {
                            isGlobalCompletion: false,
                            isMemberCompletion: false,
                            isNewIdentifierLocation: false,
                            entries: []
                        };
                    }
                    try {
                        for (var results_1 = tslib_1.__values(results), results_1_1 = results_1.next(); !results_1_1.done; results_1_1 = results_1.next()) {
                            var entry = results_1_1.value;
                            base.entries.push(completionToEntry(entry));
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (results_1_1 && !results_1_1.done && (_a = results_1.return)) _a.call(results_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
            return base;
        };
        proxy.getQuickInfoAtPosition = function (fileName, position) {
            var base = oldLS.getQuickInfoAtPosition(fileName, position);
            // TODO(vicb): the tags property has been removed in TS 2.2
            tryOperation('get quick info', function () {
                var e_2, _a;
                var ours = ls.getHoverAt(fileName, position);
                if (ours) {
                    var displayParts = [];
                    try {
                        for (var _b = tslib_1.__values(ours.text), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var part = _c.value;
                            displayParts.push({ kind: part.language || 'angular', text: part.text });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    var tags = base && base.tags;
                    base = {
                        displayParts: displayParts,
                        documentation: [],
                        kind: 'angular',
                        kindModifiers: 'what does this do?',
                        textSpan: { start: ours.span.start, length: ours.span.end - ours.span.start },
                    };
                    if (tags) {
                        base.tags = tags;
                    }
                }
            });
            return base;
        };
        proxy.getSemanticDiagnostics = function (fileName) {
            var result = oldLS.getSemanticDiagnostics(fileName);
            var base = result || [];
            tryOperation('get diagnostics', function () {
                logger.info("Computing Angular semantic diagnostics...");
                var ours = ls.getDiagnostics(fileName);
                if (ours && ours.length) {
                    var file_1 = oldLS.getProgram().getSourceFile(fileName);
                    if (file_1) {
                        base.push.apply(base, ours.map(function (d) { return diagnosticToDiagnostic(d, file_1); }));
                    }
                }
            });
            return base;
        };
        proxy.getDefinitionAtPosition = function (fileName, position) {
            var base = oldLS.getDefinitionAtPosition(fileName, position);
            if (base && base.length) {
                return base;
            }
            return tryOperation('get definition', function () {
                var e_3, _a;
                var ours = ls.getDefinitionAt(fileName, position);
                var combined;
                if (ours && ours.length) {
                    combined = base && base.concat([]) || [];
                    try {
                        for (var ours_1 = tslib_1.__values(ours), ours_1_1 = ours_1.next(); !ours_1_1.done; ours_1_1 = ours_1.next()) {
                            var loc = ours_1_1.value;
                            combined.push({
                                fileName: loc.fileName,
                                textSpan: { start: loc.span.start, length: loc.span.end - loc.span.start },
                                name: '',
                                // TODO: remove any and fix type error.
                                kind: 'definition',
                                containerName: loc.fileName,
                                containerKind: 'file',
                            });
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (ours_1_1 && !ours_1_1.done && (_a = ours_1.return)) _a.call(ours_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
                else {
                    combined = base;
                }
                return combined;
            }) || [];
        };
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRkFBeUQ7SUFFekQsaUZBQXdEO0lBRXhELElBQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUE4QixDQUFDO0lBRWpFLFNBQWdCLGdCQUFnQixDQUFDLE9BQVk7UUFDM0MsSUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxJQUFJLElBQUksRUFBRTtZQUNSLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7U0FDckM7SUFDSCxDQUFDO0lBTEQsNENBS0M7SUFFRCxTQUFTLGlCQUFpQixDQUFDLENBQWE7UUFDdEMsT0FBTztZQUNMLHVDQUF1QztZQUN2QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQVc7WUFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ1osUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ2hCLGFBQWEsRUFBRSxFQUFFO1NBQ2xCLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxLQUE2QjtRQUVyRSxPQUFPO1lBQ0wsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQzFCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztZQUNyQyxJQUFJLEVBQUUsQ0FBQztZQUNQLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDNUUsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLHdDQUF3QyxDQUFDLE9BQXdDO1FBRXhGLElBQUks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RTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sWUFBWSxDQUFDLGdCQUFnQixFQUFFOztnQkFDN0IsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3BELElBQUksUUFBUSxDQUFDO2dCQUViLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZCLFFBQVEsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7O3dCQUN6QyxLQUFrQixJQUFBLFNBQUEsaUJBQUEsSUFBSSxDQUFBLDBCQUFBLDRDQUFFOzRCQUFuQixJQUFNLEdBQUcsaUJBQUE7NEJBQ1osUUFBUSxDQUFDLElBQUksQ0FBQztnQ0FDWixRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVE7Z0NBQ3RCLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7Z0NBQ3hFLElBQUksRUFBRSxFQUFFO2dDQUNSLHVDQUF1QztnQ0FDdkMsSUFBSSxFQUFFLFlBQW1CO2dDQUN6QixhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVE7Z0NBQzNCLGFBQWEsRUFBRSxNQUFhOzZCQUM3QixDQUFDLENBQUM7eUJBQ0o7Ozs7Ozs7OztpQkFDRjtxQkFBTTtvQkFDTCxRQUFRLEdBQUcsSUFBSSxDQUFDO2lCQUNqQjtnQkFDRCxPQUFPLFFBQVEsQ0FBQztZQUNsQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDO1FBRUYsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBNUhELHdCQTRIQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtDb21wbGV0aW9uLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljTWVzc2FnZUNoYWlufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5cbmNvbnN0IHByb2plY3RIb3N0TWFwID0gbmV3IFdlYWtNYXA8YW55LCBUeXBlU2NyaXB0U2VydmljZUhvc3Q+KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlcm5hbEZpbGVzKHByb2plY3Q6IGFueSk6IHN0cmluZ1tdfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGhvc3QgPSBwcm9qZWN0SG9zdE1hcC5nZXQocHJvamVjdCk7XG4gIGlmIChob3N0KSB7XG4gICAgcmV0dXJuIGhvc3QuZ2V0VGVtcGxhdGVSZWZlcmVuY2VzKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGxldGlvblRvRW50cnkoYzogQ29tcGxldGlvbik6IHRzLkNvbXBsZXRpb25FbnRyeSB7XG4gIHJldHVybiB7XG4gICAgLy8gVE9ETzogcmVtb3ZlIGFueSBhbmQgZml4IHR5cGUgZXJyb3IuXG4gICAga2luZDogYy5raW5kIGFzIGFueSxcbiAgICBuYW1lOiBjLm5hbWUsXG4gICAgc29ydFRleHQ6IGMuc29ydCxcbiAgICBraW5kTW9kaWZpZXJzOiAnJ1xuICB9O1xufVxuXG5mdW5jdGlvbiBkaWFnbm9zdGljQ2hhaW5Ub0RpYWdub3N0aWNDaGFpbihjaGFpbjogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6XG4gICAgdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIG5leHQ6IGNoYWluLm5leHQgPyBkaWFnbm9zdGljQ2hhaW5Ub0RpYWdub3N0aWNDaGFpbihjaGFpbi5uZXh0KSA6IHVuZGVmaW5lZFxuICB9O1xufVxuXG5mdW5jdGlvbiBkaWFnbm9zdGljTWVzc2FnZVRvRGlhZ25vc3RpY01lc3NhZ2VUZXh0KG1lc3NhZ2U6IHN0cmluZyB8IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4pOiBzdHJpbmd8XG4gICAgdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbWVzc2FnZTtcbiAgfVxuICByZXR1cm4gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4obWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNUb0RpYWdub3N0aWMoZDogRGlhZ25vc3RpYywgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgZmlsZSxcbiAgICBzdGFydDogZC5zcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICBtZXNzYWdlVGV4dDogZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChkLm1lc3NhZ2UpLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBzb3VyY2U6ICduZydcbiAgfTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShpbmZvOiBhbnkgLyogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8gKi8pOiB0cy5MYW5ndWFnZVNlcnZpY2Uge1xuICBjb25zdCBvbGRMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlID0gaW5mby5sYW5ndWFnZVNlcnZpY2U7XG4gIGNvbnN0IHByb3h5OiB0cy5MYW5ndWFnZVNlcnZpY2UgPSBPYmplY3QuYXNzaWduKHt9LCBvbGRMUyk7XG4gIGNvbnN0IGxvZ2dlciA9IGluZm8ucHJvamVjdC5wcm9qZWN0U2VydmljZS5sb2dnZXI7XG5cbiAgZnVuY3Rpb24gdHJ5T3BlcmF0aW9uPFQ+KGF0dGVtcHRpbmc6IHN0cmluZywgY2FsbGJhY2s6ICgpID0+IFQpOiBUfG51bGwge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIuaW5mbyhgRmFpbGVkIHRvICR7YXR0ZW1wdGluZ306ICR7ZS50b1N0cmluZygpfWApO1xuICAgICAgbG9nZ2VyLmluZm8oYFN0YWNrIHRyYWNlOiAke2Uuc3RhY2t9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzZXJ2aWNlSG9zdCA9IG5ldyBUeXBlU2NyaXB0U2VydmljZUhvc3QoaW5mby5sYW5ndWFnZVNlcnZpY2VIb3N0LCBvbGRMUyk7XG4gIGNvbnN0IGxzID0gY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKHNlcnZpY2VIb3N0IGFzIGFueSk7XG4gIHNlcnZpY2VIb3N0LnNldFNpdGUobHMpO1xuICBwcm9qZWN0SG9zdE1hcC5zZXQoaW5mby5wcm9qZWN0LCBzZXJ2aWNlSG9zdCk7XG5cbiAgcHJveHkuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uID0gZnVuY3Rpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCkge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucykgfHwge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICBlbnRyaWVzOiBbXVxuICAgIH07XG4gICAgdHJ5T3BlcmF0aW9uKCdnZXQgY29tcGxldGlvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gbHMuZ2V0Q29tcGxldGlvbnNBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGJhc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGJhc2UgPSB7XG4gICAgICAgICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGVudHJpZXM6IFtdXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICBiYXNlLmVudHJpZXMucHVzaChjb21wbGV0aW9uVG9FbnRyeShlbnRyeSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH07XG5cbiAgcHJveHkuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbiA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm8gfFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICAgICAgbGV0IGJhc2UgPSBvbGRMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgIC8vIFRPRE8odmljYik6IHRoZSB0YWdzIHByb3BlcnR5IGhhcyBiZWVuIHJlbW92ZWQgaW4gVFMgMi4yXG4gICAgICAgIHRyeU9wZXJhdGlvbignZ2V0IHF1aWNrIGluZm8nLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3Qgb3VycyA9IGxzLmdldEhvdmVyQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgICBpZiAob3Vycykge1xuICAgICAgICAgICAgY29uc3QgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2Ygb3Vycy50ZXh0KSB7XG4gICAgICAgICAgICAgIGRpc3BsYXlQYXJ0cy5wdXNoKHtraW5kOiBwYXJ0Lmxhbmd1YWdlIHx8ICdhbmd1bGFyJywgdGV4dDogcGFydC50ZXh0fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB0YWdzID0gYmFzZSAmJiAoPGFueT5iYXNlKS50YWdzO1xuICAgICAgICAgICAgYmFzZSA9IDxhbnk+e1xuICAgICAgICAgICAgICBkaXNwbGF5UGFydHMsXG4gICAgICAgICAgICAgIGRvY3VtZW50YXRpb246IFtdLFxuICAgICAgICAgICAgICBraW5kOiAnYW5ndWxhcicsXG4gICAgICAgICAgICAgIGtpbmRNb2RpZmllcnM6ICd3aGF0IGRvZXMgdGhpcyBkbz8nLFxuICAgICAgICAgICAgICB0ZXh0U3Bhbjoge3N0YXJ0OiBvdXJzLnNwYW4uc3RhcnQsIGxlbmd0aDogb3Vycy5zcGFuLmVuZCAtIG91cnMuc3Bhbi5zdGFydH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHRhZ3MpIHtcbiAgICAgICAgICAgICAgKDxhbnk+YmFzZSkudGFncyA9IHRhZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gYmFzZTtcbiAgICAgIH07XG5cbiAgcHJveHkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBsZXQgcmVzdWx0ID0gb2xkTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgY29uc3QgYmFzZSA9IHJlc3VsdCB8fCBbXTtcbiAgICB0cnlPcGVyYXRpb24oJ2dldCBkaWFnbm9zdGljcycsICgpID0+IHtcbiAgICAgIGxvZ2dlci5pbmZvKGBDb21wdXRpbmcgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljcy4uLmApO1xuICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBvbGRMUy5nZXRQcm9ncmFtKCkgIS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICBiYXNlLnB1c2guYXBwbHkoYmFzZSwgb3Vycy5tYXAoZCA9PiBkaWFnbm9zdGljVG9EaWFnbm9zdGljKGQsIGZpbGUpKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBiYXNlO1xuICB9O1xuXG4gIHByb3h5LmdldERlZmluaXRpb25BdFBvc2l0aW9uID0gZnVuY3Rpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogUmVhZG9ubHlBcnJheTx0cy5EZWZpbml0aW9uSW5mbz4ge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoYmFzZSAmJiBiYXNlLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGJhc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyeU9wZXJhdGlvbignZ2V0IGRlZmluaXRpb24nLCAoKSA9PiB7XG4gICAgICAgICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICAgICAgIGxldCBjb21iaW5lZDtcblxuICAgICAgICAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICBjb21iaW5lZCA9IGJhc2UgJiYgYmFzZS5jb25jYXQoW10pIHx8IFtdO1xuICAgICAgICAgICAgICAgZm9yIChjb25zdCBsb2Mgb2Ygb3Vycykge1xuICAgICAgICAgICAgICAgICBjb21iaW5lZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICBmaWxlTmFtZTogbG9jLmZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgIHRleHRTcGFuOiB7c3RhcnQ6IGxvYy5zcGFuLnN0YXJ0LCBsZW5ndGg6IGxvYy5zcGFuLmVuZCAtIGxvYy5zcGFuLnN0YXJ0fSxcbiAgICAgICAgICAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICAgICAgICAgICAgICAgICBraW5kOiAnZGVmaW5pdGlvbicgYXMgYW55LFxuICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICBjb250YWluZXJLaW5kOiAnZmlsZScgYXMgYW55LFxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgY29tYmluZWQgPSBiYXNlO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICByZXR1cm4gY29tYmluZWQ7XG4gICAgICAgICAgIH0pIHx8IFtdO1xuICB9O1xuXG4gIHJldHVybiBwcm94eTtcbn1cbiJdfQ==