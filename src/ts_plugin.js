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
    var ts = require("typescript"); // used as value, passed in by tsserver at runtime
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
        var ngLSHost = new typescript_host_1.TypeScriptServiceHost(tsLSHost, tsLS);
        var ngLS = language_service_1.createLanguageService(ngLSHost);
        projectHostMap.set(project, ngLSHost);
        function getCompletionsAtPosition(fileName, position, options) {
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
        }
        function getQuickInfoAtPosition(fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getQuickInfoAtPosition(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            return ngLS.getHoverAt(fileName, position);
        }
        function getSemanticDiagnostics(fileName) {
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
        }
        function getDefinitionAtPosition(fileName, position) {
            if (!angularOnly) {
                var results = tsLS.getDefinitionAtPosition(fileName, position);
                if (results) {
                    // If TS could answer the query, then return results immediately.
                    return results;
                }
            }
            var result = ngLS.getDefinitionAt(fileName, position);
            if (!result || !result.definitions || !result.definitions.length) {
                return;
            }
            return result.definitions;
        }
        function getDefinitionAndBoundSpan(fileName, position) {
            if (!angularOnly) {
                var result = tsLS.getDefinitionAndBoundSpan(fileName, position);
                if (result) {
                    // If TS could answer the query, then return results immediately.
                    return result;
                }
            }
            return ngLS.getDefinitionAt(fileName, position);
        }
        var proxy = Object.assign(
        // First clone the original TS language service
        {}, tsLS, 
        // Then override the methods supported by Angular language service
        {
            getCompletionsAtPosition: getCompletionsAtPosition, getQuickInfoAtPosition: getQuickInfoAtPosition, getSemanticDiagnostics: getSemanticDiagnostics,
            getDefinitionAtPosition: getDefinitionAtPosition, getDefinitionAndBoundSpan: getDefinitionAndBoundSpan,
        });
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQyxDQUFDLGtEQUFrRDtJQUdwRixtRkFBeUQ7SUFFekQsaUZBQXdEO0lBRXhELElBQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUE2QyxDQUFDO0lBRWhGLFNBQWdCLGdCQUFnQixDQUFDLE9BQTJCO1FBQzFELElBQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxJQUFJLEVBQUU7WUFDUixJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLGFBQWEsQ0FBQztTQUN0QjtJQUNILENBQUM7SUFORCw0Q0FNQztJQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBYTtRQUN0QyxPQUFPO1lBQ0wsdUNBQXVDO1lBQ3ZDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBVztZQUNuQixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7WUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUk7WUFDaEIsYUFBYSxFQUFFLEVBQUU7U0FDbEIsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLGdDQUFnQyxDQUFDLEtBQTZCO1FBRXJFLE9BQU87WUFDTCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDMUIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO1lBQ3JDLElBQUksRUFBRSxDQUFDO1lBQ1AsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUM1RSxDQUFDO0lBQ0os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QUU7Z0JBQ2hFLE9BQU87YUFDUjtZQUNELE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUM1QixDQUFDO1FBRUQsU0FBUyx5QkFBeUIsQ0FDOUIsUUFBZ0IsRUFBRSxRQUFnQjtZQUNwQyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLE1BQU0sRUFBRTtvQkFDVixpRUFBaUU7b0JBQ2pFLE9BQU8sTUFBTSxDQUFDO2lCQUNmO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFNLEtBQUssR0FBd0IsTUFBTSxDQUFDLE1BQU07UUFDNUMsK0NBQStDO1FBQy9DLEVBQUUsRUFBRSxJQUFJO1FBQ1Isa0VBQWtFO1FBQ2xFO1lBQ0ksd0JBQXdCLDBCQUFBLEVBQUUsc0JBQXNCLHdCQUFBLEVBQUUsc0JBQXNCLHdCQUFBO1lBQ3hFLHVCQUF1Qix5QkFBQSxFQUFFLHlCQUF5QiwyQkFBQTtTQUNyRCxDQUFDLENBQUM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUF0R0Qsd0JBc0dDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdXNlZCBhcyB2YWx1ZSwgcGFzc2VkIGluIGJ5IHRzc2VydmVyIGF0IHJ1bnRpbWVcbmltcG9ydCAqIGFzIHRzcyBmcm9tICd0eXBlc2NyaXB0L2xpYi90c3NlcnZlcmxpYnJhcnknOyAvLyB1c2VkIGFzIHR5cGUgb25seVxuXG5pbXBvcnQge2NyZWF0ZUxhbmd1YWdlU2VydmljZX0gZnJvbSAnLi9sYW5ndWFnZV9zZXJ2aWNlJztcbmltcG9ydCB7Q29tcGxldGlvbiwgRGlhZ25vc3RpYywgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG5jb25zdCBwcm9qZWN0SG9zdE1hcCA9IG5ldyBXZWFrTWFwPHRzcy5zZXJ2ZXIuUHJvamVjdCwgVHlwZVNjcmlwdFNlcnZpY2VIb3N0PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0c3Muc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXXx1bmRlZmluZWQge1xuICBjb25zdCBob3N0ID0gcHJvamVjdEhvc3RNYXAuZ2V0KHByb2plY3QpO1xuICBpZiAoaG9zdCkge1xuICAgIGNvbnN0IGV4dGVybmFsRmlsZXMgPSBob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpO1xuICAgIHJldHVybiBleHRlcm5hbEZpbGVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRpb25Ub0VudHJ5KGM6IENvbXBsZXRpb24pOiB0c3MuQ29tcGxldGlvbkVudHJ5IHtcbiAgcmV0dXJuIHtcbiAgICAvLyBUT0RPOiByZW1vdmUgYW55IGFuZCBmaXggdHlwZSBlcnJvci5cbiAgICBraW5kOiBjLmtpbmQgYXMgYW55LFxuICAgIG5hbWU6IGMubmFtZSxcbiAgICBzb3J0VGV4dDogYy5zb3J0LFxuICAgIGtpbmRNb2RpZmllcnM6ICcnXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluOiBEaWFnbm9zdGljTWVzc2FnZUNoYWluKTpcbiAgICB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluIHtcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlVGV4dDogY2hhaW4ubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgbmV4dDogY2hhaW4ubmV4dCA/IGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKGNoYWluLm5leHQpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNNZXNzYWdlVG9EaWFnbm9zdGljTWVzc2FnZVRleHQobWVzc2FnZTogc3RyaW5nIHwgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6IHN0cmluZ3xcbiAgICB0c3MuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbWVzc2FnZTtcbiAgfVxuICByZXR1cm4gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4obWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNUb0RpYWdub3N0aWMoZDogRGlhZ25vc3RpYywgZmlsZTogdHNzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQpOiB0c3MuRGlhZ25vc3RpYyB7XG4gIHJldHVybiB7XG4gICAgZmlsZSxcbiAgICBzdGFydDogZC5zcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICBtZXNzYWdlVGV4dDogZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChkLm1lc3NhZ2UpLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBzb3VyY2U6ICduZydcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShpbmZvOiB0c3Muc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiB0c3MuTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qge3Byb2plY3QsIGxhbmd1YWdlU2VydmljZTogdHNMUywgbGFuZ3VhZ2VTZXJ2aWNlSG9zdDogdHNMU0hvc3QsIGNvbmZpZ30gPSBpbmZvO1xuICAvLyBUaGlzIHBsdWdpbiBjb3VsZCBvcGVyYXRlIHVuZGVyIHR3byBkaWZmZXJlbnQgbW9kZXM6XG4gIC8vIDEuIFRTICsgQW5ndWxhclxuICAvLyAgICBQbHVnaW4gYXVnbWVudHMgVFMgbGFuZ3VhZ2Ugc2VydmljZSB0byBwcm92aWRlIGFkZGl0aW9uYWwgQW5ndWxhclxuICAvLyAgICBpbmZvcm1hdGlvbi4gVGhpcyBvbmx5IHdvcmtzIHdpdGggaW5saW5lIHRlbXBsYXRlcyBhbmQgaXMgbWVhbnQgdG8gYmVcbiAgLy8gICAgdXNlZCBhcyBhIGxvY2FsIHBsdWdpbiAoY29uZmlndXJlZCB2aWEgdHNjb25maWcuanNvbilcbiAgLy8gMi4gQW5ndWxhciBvbmx5XG4gIC8vICAgIFBsdWdpbiBvbmx5IHByb3ZpZGVzIGluZm9ybWF0aW9uIG9uIEFuZ3VsYXIgdGVtcGxhdGVzLCBubyBUUyBpbmZvIGF0IGFsbC5cbiAgLy8gICAgVGhpcyBlZmZlY3RpdmVseSBkaXNhYmxlcyBuYXRpdmUgVFMgZmVhdHVyZXMgYW5kIGlzIG1lYW50IGZvciBpbnRlcm5hbFxuICAvLyAgICB1c2Ugb25seS5cbiAgY29uc3QgYW5ndWxhck9ubHkgPSBjb25maWcgPyBjb25maWcuYW5ndWxhck9ubHkgPT09IHRydWUgOiBmYWxzZTtcbiAgY29uc3QgbmdMU0hvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KHRzTFNIb3N0LCB0c0xTKTtcbiAgY29uc3QgbmdMUyA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShuZ0xTSG9zdCk7XG4gIHByb2plY3RIb3N0TWFwLnNldChwcm9qZWN0LCBuZ0xTSG9zdCk7XG5cbiAgZnVuY3Rpb24gZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcixcbiAgICAgIG9wdGlvbnM6IHRzcy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IHRzTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucyk7XG4gICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzLmVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXN1bHRzID0gbmdMUy5nZXRDb21wbGV0aW9uc0F0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICBlbnRyaWVzOiByZXN1bHRzLm1hcChjb21wbGV0aW9uVG9FbnRyeSksXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzcy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBpZiAoIWFuZ3VsYXJPbmx5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gSWYgVFMgY291bGQgYW5zd2VyIHRoZSBxdWVyeSwgdGhlbiByZXR1cm4gcmVzdWx0cyBpbW1lZGlhdGVseS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5nTFMuZ2V0SG92ZXJBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZTogc3RyaW5nKTogdHNzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcmVzdWx0czogdHNzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghYW5ndWxhck9ubHkpIHtcbiAgICAgIGNvbnN0IHRzUmVzdWx0cyA9IHRzTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goLi4udHNSZXN1bHRzKTtcbiAgICB9XG4gICAgLy8gRm9yIHNlbWFudGljIGRpYWdub3N0aWNzIHdlIG5lZWQgdG8gY29tYmluZSBib3RoIFRTICsgQW5ndWxhciByZXN1bHRzXG4gICAgY29uc3QgbmdSZXN1bHRzID0gbmdMUy5nZXREaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgaWYgKCFuZ1Jlc3VsdHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKSA/IG5nTFNIb3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIDogdW5kZWZpbmVkO1xuICAgIHJlc3VsdHMucHVzaCguLi5uZ1Jlc3VsdHMubWFwKGQgPT4gZGlhZ25vc3RpY1RvRGlhZ25vc3RpYyhkLCBzb3VyY2VGaWxlKSkpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogUmVhZG9ubHlBcnJheTx0c3MuRGVmaW5pdGlvbkluZm8+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IHRzTFMuZ2V0RGVmaW5pdGlvbkF0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBuZ0xTLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuZGVmaW5pdGlvbnMgfHwgIXJlc3VsdC5kZWZpbml0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5kZWZpbml0aW9ucztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHNzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gICAgaWYgKCFhbmd1bGFyT25seSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHNMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIElmIFRTIGNvdWxkIGFuc3dlciB0aGUgcXVlcnksIHRoZW4gcmV0dXJuIHJlc3VsdHMgaW1tZWRpYXRlbHkuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZ0xTLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICB9XG5cbiAgY29uc3QgcHJveHk6IHRzcy5MYW5ndWFnZVNlcnZpY2UgPSBPYmplY3QuYXNzaWduKFxuICAgICAgLy8gRmlyc3QgY2xvbmUgdGhlIG9yaWdpbmFsIFRTIGxhbmd1YWdlIHNlcnZpY2VcbiAgICAgIHt9LCB0c0xTLFxuICAgICAgLy8gVGhlbiBvdmVycmlkZSB0aGUgbWV0aG9kcyBzdXBwb3J0ZWQgYnkgQW5ndWxhciBsYW5ndWFnZSBzZXJ2aWNlXG4gICAgICB7XG4gICAgICAgICAgZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uLCBnZXRRdWlja0luZm9BdFBvc2l0aW9uLCBnZXRTZW1hbnRpY0RpYWdub3N0aWNzLFxuICAgICAgICAgIGdldERlZmluaXRpb25BdFBvc2l0aW9uLCBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuLFxuICAgICAgfSk7XG4gIHJldHVybiBwcm94eTtcbn1cbiJdfQ==