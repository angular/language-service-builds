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
        define("@angular/language-service/src/ts_plugin", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/definitions", "@angular/language-service/src/language_service", "@angular/language-service/src/typescript_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript"); // used as value, passed in by tsserver at runtime
    var definitions_1 = require("@angular/language-service/src/definitions");
    var language_service_1 = require("@angular/language-service/src/language_service");
    var typescript_host_1 = require("@angular/language-service/src/typescript_host");
    var projectHostMap = new WeakMap();
    function getExternalFiles(project) {
        var host = projectHostMap.get(project);
        if (host) {
            var externalFiles = host.getTemplateReferences();
            return externalFiles;
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
        return {
            file: file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: diagnosticMessageToDiagnosticMessageText(d.message),
            category: ts.DiagnosticCategory.Error,
            code: 0,
            source: 'ng'
        };
    }
    function create(info) {
        var project = info.project, tsLS = info.languageService, tsLSHost = info.languageServiceHost, config = info.config;
        // This plugin could operate under two different modes:
        // 1. TS + Angular
        //    Plugin augments TS language service to provide additional Angular
        //    information. This only works with inline templates and is meant to be
        //    used as a local plugin (configured via tsconfig.json)
        // 2. Angular only
        //    Plugin only provides information on Angular templates, no TS info at all.
        //    This effectively disables native TS features and is meant for internal
        //    use only.
        var angularOnly = config ? config.angularOnly === true : false;
        var proxy = Object.assign({}, tsLS);
        var ngLSHost = new typescript_host_1.TypeScriptServiceHost(tsLSHost, tsLS);
        var ngLS = language_service_1.createLanguageService(ngLSHost);
        projectHostMap.set(project, ngLSHost);
        proxy.getCompletionsAtPosition = function (fileName, position, options) {
            if (!angularOnly) {
                var results_1 = tsLS.getCompletionsAtPosition(fileName, position, options);
                if (results_1 && results_1.entries.length) {
                    // If TS could answer the query, then return results immediately.
                    return results_1;
                }
            }
            var results = ngLS.getCompletionsAt(fileName, position);
            if (!results || !results.length) {
                return;
            }
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: results.map(completionToEntry),
            };
        };
        proxy.getQuickInfoAtPosition = function (fileName, position) {
            if (!angularOnly) {
                var result_1 = tsLS.getQuickInfoAtPosition(fileName, position);
                if (result_1) {
                    // If TS could answer the query, then return results immediately.
                    return result_1;
                }
            }
            var result = ngLS.getHoverAt(fileName, position);
            if (!result) {
                return;
            }
            return {
                // TODO(kyliau): Provide more useful info for kind and kindModifiers
                kind: ts.ScriptElementKind.unknown,
                kindModifiers: ts.ScriptElementKindModifier.none,
                textSpan: {
                    start: result.span.start,
                    length: result.span.end - result.span.start,
                },
                displayParts: result.text.map(function (part) {
                    return {
                        text: part.text,
                        kind: part.language || 'angular',
                    };
                }),
            };
        };
        proxy.getSemanticDiagnostics = function (fileName) {
            var results = [];
            if (!angularOnly) {
                var tsResults = tsLS.getSemanticDiagnostics(fileName);
                results.push.apply(results, tslib_1.__spread(tsResults));
            }
            // For semantic diagnostics we need to combine both TS + Angular results
            var ngResults = ngLS.getDiagnostics(fileName);
            if (!ngResults.length) {
                return results;
            }
            var sourceFile = fileName.endsWith('.ts') ? ngLSHost.getSourceFile(fileName) : undefined;
            results.push.apply(results, tslib_1.__spread(ngResults.map(function (d) { return diagnosticToDiagnostic(d, sourceFile); })));
            return results;
        };
        proxy.getDefinitionAtPosition = function (fileName, position) {
            if (!angularOnly) {
                var results_2 = tsLS.getDefinitionAtPosition(fileName, position);
                if (results_2) {
                    // If TS could answer the query, then return results immediately.
                    return results_2;
                }
            }
            var results = ngLS.getDefinitionAt(fileName, position);
            if (!results) {
                return;
            }
            return results.map(definitions_1.ngLocationToTsDefinitionInfo);
        };
        proxy.getDefinitionAndBoundSpan = function (fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getDefinitionAndBoundSpan(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            var results = ngLS.getDefinitionAt(fileName, position);
            if (!results || !results.length) {
                return;
            }
            var span = results[0].span;
            return {
                definitions: results.map(definitions_1.ngLocationToTsDefinitionInfo),
                textSpan: {
                    start: span.start,
                    length: span.end - span.start,
                },
            };
        };
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQyxDQUFDLGtEQUFrRDtJQUdwRix5RUFBMkQ7SUFDM0QsbUZBQXlEO0lBRXpELGlGQUF3RDtJQUV4RCxJQUFNLGNBQWMsR0FBRyxJQUFJLE9BQU8sRUFBNkMsQ0FBQztJQUVoRixTQUFnQixnQkFBZ0IsQ0FBQyxPQUEyQjtRQUMxRCxJQUFNLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLElBQUksSUFBSSxFQUFFO1lBQ1IsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDbkQsT0FBTyxhQUFhLENBQUM7U0FDdEI7SUFDSCxDQUFDO0lBTkQsNENBTUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLENBQWE7UUFDdEMsT0FBTztZQUNMLHVDQUF1QztZQUN2QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQVc7WUFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ1osUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJO1lBQ2hCLGFBQWEsRUFBRSxFQUFFO1NBQ2xCLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxLQUE2QjtRQUVyRSxPQUFPO1lBQ0wsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQzFCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztZQUNyQyxJQUFJLEVBQUUsQ0FBQztZQUNQLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FD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QUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLE9BQU87YUFDUjtZQUNNLElBQUEsc0JBQUksQ0FBZTtZQUMxQixPQUFPO2dCQUNMLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUE0QixDQUFDO2dCQUN0RCxRQUFRLEVBQUU7b0JBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSztpQkFDOUI7YUFDRixDQUFDO1FBQ0osQ0FBQyxDQUFDO1FBRU4sT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBOUhELHdCQThIQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHVzZWQgYXMgdmFsdWUsIHBhc3NlZCBpbiBieSB0c3NlcnZlciBhdCBydW50aW1lXG5pbXBvcnQgKiBhcyB0c3MgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JzsgLy8gdXNlZCBhcyB0eXBlIG9ubHlcblxuaW1wb3J0IHtuZ0xvY2F0aW9uVG9Uc0RlZmluaXRpb25JbmZvfSBmcm9tICcuL2RlZmluaXRpb25zJztcbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtDb21wbGV0aW9uLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMb2NhdGlvbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG5jb25zdCBwcm9qZWN0SG9zdE1hcCA9IG5ldyBXZWFrTWFwPHRzcy5zZXJ2ZXIuUHJvamVjdCwgVHlwZVNjcmlwdFNlcnZpY2VIb3N0PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0c3Muc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXXx1bmRlZmluZWQge1xuICBjb25zdCBob3N0ID0gcHJvamVjdEhvc3RNYXAuZ2V0KHByb2plY3QpO1xuICBpZiAoaG9zdCkge1xuICAgIGNvbnN0IGV4dGVybmFsRmlsZXMgPSBob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpO1xuICAgIHJldHVybiBleHRlcm5hbEZpbGVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRpb25Ub0VudHJ5KGM6IENvbXBsZXRpb24pOiB0c3MuQ29tcGxldGlvbkVudHJ5IHtcbiAgcmV0dXJuIHtcbiAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICBraW5kOiBjLmtpbmQgYXMgYW55LFxuICAgIG5hbWU6IGMubmFtZSxcbiAgICBzb3J0VGV4dDogYy5zb3J0LFxuICAgIGtpbmRNb2RpZmllcnM6ICcnXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluOiBEaWFnbm9zdGljTWVzc2FnZUNoYWluKTpcbiAgICB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlVGV4dDogY2hhaW4ubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgbmV4dDogY2hhaW4ubmV4dCA/IGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluLm5leHQpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNNZXNzYWdlVG9EaWFnbm9zdGljTWVzc2FnZVRleHQobWVzc2FnZTogc3RyaW5nIHwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6IHN0cmluZ3xcbiAgICB0c3MuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbWVzc2FnZTtcbiAgfVxuICByZXR1cm4gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4obWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNUb0RpYWdub3N0aWMoZDogRGlhZ25vc3RpYywgZmlsZTogdHNzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQpOiB0c3MuRGlhZ25vc3RpYyB7XG4gIHJldHVybiB7XG4gICAgZmlsZSxcbiAgICBzdGFydDogZC5zcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICBtZXNzYWdlVGV4dDogZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChkLm1lc3NhZ2UpLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBzb3VyY2U6ICduZydcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShpbmZvOiB0c3Muc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiB0c3MuTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qge3Byb2plY3QsIGxhbmd1YWdlU2VydmljZTogdHNMUywgbGFuZ3VhZ2VTZXJ2aWNlSG9zdDogdHNMU0hvc3QsIGNvbmZpZ30gPSBpbmZvO1xuICAvLyBUaGlzIHBsdWdpbiBjb3VsZCBvcGVyYXRlIHVuZGVyIHR3byBkaWZmZXJlbnQgbW9kZXM6XG4gIC8vIDEuIFRTICsgQW5ndWxhclxuICAvLyAgICBQbHVnaW4gYXVnbWVudHMgVFMgbGFuZ3VhZ2Ugc2VydmljZSB0byBwcm92aWRlIGFkZGl0aW9uYWwgQW5ndWxhclxuICAvLyAgICBpbmZvcm1hdGlvbi4gVGhpcyBvbmx5IHdvcmtzIHdpdGggaW5saW5lIHRlbXBsYXRlcyBhbmQgaXMgbWVhbnQgdG8gYmVcbiAgLy8gICAgdXNlZCBhcyBhIGxvY2FsIHBsdWdpbiAoY29uZmlndXJlZCB2aWEgdHNjb25maWcuanNvbilcbiAgLy8gMi4gQW5ndWxhciBvbmx5XG4gIC8vICAgIFBsdWdpbiBvbmx5IHByb3ZpZGVzIGluZm9ybWF0aW9uIG9uIEFuZ3VsYXIgdGVtcGxhdGVzLCBubyBUUyBpbmZvIGF0IGFsbC5cbiAgLy8gICAgVGhpcyBlZmZlY3RpdmVseSBkaXNhYmxlcyBuYXRpdmUgVFMgZmVhdHVyZXMgYW5kIGlzIG1lYW50IGZvciBpbnRlcm5hbFxuICAvLyAgICB1c2Ugb25seS5cbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWcgPyBjb25maWcuYW5ndWxhck9ubHkgPT09IHRydWUgOiBmYWxzZTtcbiAgY29uc3QgcHJveHk6IHRzcy5MYW5ndWFnZVNlcnZpY2UgPSBPYmplY3QuYXNzaWduKHt9LCB0c0xTKTtcbiAgY29uc3QgbmdMU0hvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KHRzTFNIb3N0LCB0c0xTKTtcbiAgY29uc3QgbmdMUyA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShuZ0xTSG9zdCk7XG4gIHByb2plY3RIb3N0TWFwLnNldChwcm9qZWN0LCBuZ0xTSG9zdCk7XG5cbiAgcHJveHkuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uID0gZnVuY3Rpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0c3MuR2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uT3B0aW9uc3x1bmRlZmluZWQpIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gdHNMUy5nZXRDb21wbGV0aW9uc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBvcHRpb25zKTtcbiAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHMuZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdHMgPSBuZ0xTLmdldENvbXBsZXRpb25zQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAoIXJlc3VsdHMgfHwgIXJlc3VsdHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICAgIGVudHJpZXM6IHJlc3VsdHMubWFwKGNvbXBsZXRpb25Ub0VudHJ5KSxcbiAgICB9O1xuICB9O1xuXG4gIHByb3h5LmdldFF1aWNrSW5mb0F0UG9zaXRpb24gPSBmdW5jdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLlF1aWNrSW5mbyB8XG4gICAgICB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5nTFMuZ2V0SG92ZXJBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC8vIFRPRE8oa3lsaWF1KTogUHJvdmlkZSBtb3JlIHVzZWZ1bCBpbmZvIGZvciBraW5kIGFuZCBraW5kTW9kaWZpZXJzXG4gICAgICAgICAga2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICAgICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAgIHN0YXJ0OiByZXN1bHQuc3Bhbi5zdGFydCxcbiAgICAgICAgICAgIGxlbmd0aDogcmVzdWx0LnNwYW4uZW5kIC0gcmVzdWx0LnNwYW4uc3RhcnQsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkaXNwbGF5UGFydHM6IHJlc3VsdC50ZXh0Lm1hcCgocGFydCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdGV4dDogcGFydC50ZXh0LFxuICAgICAgICAgICAgICBraW5kOiBwYXJ0Lmxhbmd1YWdlIHx8ICdhbmd1bGFyJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSksXG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSBmdW5jdGlvbihmaWxlTmFtZTogc3RyaW5nKTogdHNzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcmVzdWx0czogdHNzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHRzUmVzdWx0cyA9IHRzTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goLi4udHNSZXN1bHRzKTtcbiAgICB9XG4gICAgLy8gRm9yIHNlbWFudGljIGRpYWdub3N0aWNzIHdlIG5lZWQgdG8gY29tYmluZSBib3RoIFRTICsgQW5ndWxhciByZXN1bHRzXG4gICAgY29uc3QgbmdSZXN1bHRzID0gbmdMUy5nZXREaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgaWYgKCFuZ1Jlc3VsdHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IG5nTFNIb3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIDogdW5kZWZpbmVkO1xuICAgIHJlc3VsdHMucHVzaCguLi5uZ1Jlc3VsdHMubWFwKGQgPT4gZGlhZ25vc3RpY1RvRGlhZ25vc3RpYyhkLCBzb3VyY2VGaWxlKSkpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHByb3h5LmdldERlZmluaXRpb25BdFBvc2l0aW9uID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJlYWRvbmx5QXJyYXk8dHNzLkRlZmluaXRpb25JbmZvPnxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHRzID0gdHNMUy5nZXREZWZpbml0aW9uQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBuZ0xTLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICBpZiAoIXJlc3VsdHMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdHMubWFwKG5nTG9jYXRpb25Ub1RzRGVmaW5pdGlvbkluZm8pO1xuICAgICAgfTtcblxuICBwcm94eS5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuIHxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSB0c0xTLmdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBJZiBUUyBjb3VsZCBhbnN3ZXIgdGhlIHF1ZXJ5LCB0aGVuIHJldHVybiByZXN1bHRzIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IG5nTFMuZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgIGlmICghcmVzdWx0cyB8fCAhcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qge3NwYW59ID0gcmVzdWx0c1swXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkZWZpbml0aW9uczogcmVzdWx0cy5tYXAobmdMb2NhdGlvblRvVHNEZWZpbml0aW9uSW5mbyksXG4gICAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAgIHN0YXJ0OiBzcGFuLnN0YXJ0LFxuICAgICAgICAgICAgbGVuZ3RoOiBzcGFuLmVuZCAtIHNwYW4uc3RhcnQsXG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgcmV0dXJuIHByb3h5O1xufVxuIl19