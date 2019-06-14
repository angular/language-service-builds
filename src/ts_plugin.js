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
    function create(info) {
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
            var ours = ls.getHoverAt(fileName, position);
            if (!ours) {
                return base;
            }
            var result = {
                kind: ts.ScriptElementKind.unknown,
                kindModifiers: ts.ScriptElementKindModifier.none,
                textSpan: {
                    start: ours.span.start,
                    length: ours.span.end - ours.span.start,
                },
                displayParts: ours.text.map(function (part) {
                    return {
                        text: part.text,
                        kind: part.language || 'angular',
                    };
                }),
                documentation: [],
            };
            if (base && base.tags) {
                result.tags = base.tags;
            }
            return result;
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
            var ours = ls.getDefinitionAt(fileName, position);
            if (ours && ours.length) {
                return ours.map(function (loc) {
                    return {
                        fileName: loc.fileName,
                        textSpan: {
                            start: loc.span.start,
                            length: loc.span.end - loc.span.start,
                        },
                        name: '',
                        kind: ts.ScriptElementKind.unknown,
                        containerName: loc.fileName,
                        containerKind: ts.ScriptElementKind.unknown,
                    };
                });
            }
        };
        proxy.getDefinitionAndBoundSpan = function (fileName, position) {
            var base = oldLS.getDefinitionAndBoundSpan(fileName, position);
            if (base && base.definitions && base.definitions.length) {
                return base;
            }
            var ours = ls.getDefinitionAt(fileName, position);
            if (ours && ours.length) {
                return {
                    definitions: ours.map(function (loc) {
                        return {
                            fileName: loc.fileName,
                            textSpan: {
                                start: loc.span.start,
                                length: loc.span.end - loc.span.start,
                            },
                            name: '',
                            kind: ts.ScriptElementKind.unknown,
                            containerName: loc.fileName,
                            containerKind: ts.ScriptElementKind.unknown,
                        };
                    }),
                    textSpan: {
                        start: ours[0].span.start,
                        length: ours[0].span.end - ours[0].span.start,
                    },
                };
            }
        };
        return proxy;
    }
    exports.create = create;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHNfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQyxDQUFDLGtEQUFrRDtJQUdwRixtRkFBeUQ7SUFFekQsaUZBQXdEO0lBRXhELElBQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUE2QyxDQUFDO0lBRWhGLFNBQWdCLGdCQUFnQixDQUFDLE9BQTJCO1FBQzFELElBQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxJQUFJLEVBQUU7WUFDUixJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLGFBQWEsQ0FBQztTQUN0QjtJQUNILENBQUM7SUFORCw0Q0FNQztJQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBYTtRQUN0QyxPQUFPO1lBQ0wsdUNBQXVDO1lBQ3ZDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBVztZQUNuQixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7WUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUk7WUFDaEIsYUFBYSxFQUFFLEVBQUU7U0FDbEIsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLGdDQUFnQyxDQUFDLEtBQTZCO1FBRXJFLE9BQU87WUFDTCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDMUIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO1lBQ3JDLElBQUksRUFBRSxDQUFDO1lBQ1AsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUM1RSxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsd0NBQXdDLENBQUMsT0FBd0M7UUFFeEYsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7WUFDL0IsT0FBTyxPQUFPLENBQUM7U0FDaEI7UUFDRCxPQUFPLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFDLENBQWEsRUFBRSxJQUFtQjtRQUNoRSxJQUFNLE1BQU0sR0FBRztZQUNiLElBQUksTUFBQTtZQUNKLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDbkIsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNqQyxXQUFXLEVBQUUsd0NBQXdDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNoRSxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7WUFDckMsSUFBSSxFQUFFLENBQUM7WUFDUCxNQUFNLEVBQUUsSUFBSTtTQUNiLENBQUM7UUFDRixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBZ0IsTUFBTSxDQUFDLElBQWlDO1FBQ3RELElBQU0sS0FBSyxHQUF1QixJQUFJLENBQUMsZUFBZSxDQUFDO1FBQ3ZELElBQU0sS0FBSyxHQUF1QixNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFFbEQsU0FBUyxZQUFZLENBQUksVUFBa0IsRUFBRSxRQUFpQjtZQUM1RCxJQUFJO2dCQUNGLE9BQU8sUUFBUSxFQUFFLENBQUM7YUFDbkI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWEsVUFBVSxVQUFLLENBQUMsQ0FBQyxRQUFRLEVBQUksQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFnQixDQUFDLENBQUMsS0FBTyxDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDO1FBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0UsSUFBTSxFQUFFLEdBQUcsd0NBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUMsS0FBSyxDQUFDLHdCQUF3QixHQUFHLFVBQzdCLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxPQUFxRDtZQUMzRixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDeEUsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsdUJBQXVCLEVBQUUsS0FBSztnQkFDOUIsT0FBTyxFQUFFLEVBQUU7YUFDWixDQUFDO1lBQ0YsWUFBWSxDQUFDLGlCQUFpQixFQUFFOztnQkFDOUIsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtvQkFDN0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO3dCQUN0QixJQUFJLEdBQUc7NEJBQ0wsa0JBQWtCLEVBQUUsS0FBSzs0QkFDekIsa0JBQWtCLEVBQUUsS0FBSzs0QkFDekIsdUJBQXVCLEVBQUUsS0FBSzs0QkFDOUIsT0FBTyxFQUFFLEVBQUU7eUJBQ1osQ0FBQztxQkFDSDs7d0JBQ0QsS0FBb0IsSUFBQSxZQUFBLGlCQUFBLE9BQU8sQ0FBQSxnQ0FBQSxxREFBRTs0QkFBeEIsSUFBTSxLQUFLLG9CQUFBOzRCQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7eUJBQzdDOzs7Ozs7Ozs7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsS0FBSyxDQUFDLHNCQUFzQixHQUFHLFVBQVMsUUFBZ0IsRUFBRSxRQUFnQjtZQUVwRSxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ1QsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sTUFBTSxHQUFpQjtnQkFDM0IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPO2dCQUNsQyxhQUFhLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUk7Z0JBQ2hELFFBQVEsRUFBRTtvQkFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO29CQUN0QixNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO2lCQUN4QztnQkFDRCxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO29CQUM5QixPQUFPO3dCQUNMLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTt3QkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTO3FCQUNqQyxDQUFDO2dCQUNKLENBQUMsQ0FBQztnQkFDRixhQUFhLEVBQUUsRUFBRTthQUNsQixDQUFDO1lBQ0YsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDckIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ3pCO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDO1FBRU4sS0FBSyxDQUFDLHNCQUFzQixHQUFHLFVBQVMsUUFBZ0I7WUFDdEQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BELElBQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUM7WUFDMUIsWUFBWSxDQUFDLGlCQUFpQixFQUFFO2dCQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7Z0JBQ3pELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ3ZCLElBQU0sTUFBSSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzFELElBQUksTUFBSSxFQUFFO3dCQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLE1BQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsQ0FBQztxQkFDdkU7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFVBQVMsUUFBZ0IsRUFBRSxRQUFnQjtZQUdyRSxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9ELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNwRCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUN2QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBQyxHQUFhO29CQUM1QixPQUFPO3dCQUNMLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTt3QkFDdEIsUUFBUSxFQUFFOzRCQUNSLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUs7NEJBQ3JCLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUs7eUJBQ3RDO3dCQUNELElBQUksRUFBRSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTzt3QkFDbEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRO3dCQUMzQixhQUFhLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU87cUJBQzVDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQztRQUVOLEtBQUssQ0FBQyx5QkFBeUIsR0FBRyxVQUFTLFFBQWdCLEVBQUUsUUFBZ0I7WUFHdkUsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNqRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO2dCQUN2RCxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDcEQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDdkIsT0FBTztvQkFDTCxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFDLEdBQWE7d0JBQ2xDLE9BQU87NEJBQ0wsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFROzRCQUN0QixRQUFRLEVBQUU7Z0NBQ1IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztnQ0FDckIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSzs2QkFDdEM7NEJBQ0QsSUFBSSxFQUFFLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPOzRCQUNsQyxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVE7NEJBQzNCLGFBQWEsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTzt5QkFDNUMsQ0FBQztvQkFDSixDQUFDLENBQUM7b0JBQ0YsUUFBUSxFQUFFO3dCQUNSLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUs7d0JBQ3pCLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUs7cUJBQzlDO2lCQUNGLENBQUM7YUFDSDtRQUNILENBQUMsQ0FBQztRQUVOLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQXJKRCx3QkFxSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnOyAvLyB1c2VkIGFzIHZhbHVlLCBwYXNzZWQgaW4gYnkgdHNzZXJ2ZXIgYXQgcnVudGltZVxuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7IC8vIHVzZWQgYXMgdHlwZSBvbmx5XG5cbmltcG9ydCB7Y3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlfSBmcm9tICcuL2xhbmd1YWdlX3NlcnZpY2UnO1xuaW1wb3J0IHtDb21wbGV0aW9uLCBEaWFnbm9zdGljLCBEaWFnbm9zdGljTWVzc2FnZUNoYWluLCBMb2NhdGlvbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuXG5jb25zdCBwcm9qZWN0SG9zdE1hcCA9IG5ldyBXZWFrTWFwPHRzcy5zZXJ2ZXIuUHJvamVjdCwgVHlwZVNjcmlwdFNlcnZpY2VIb3N0PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0c3Muc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXXx1bmRlZmluZWQge1xuICBjb25zdCBob3N0ID0gcHJvamVjdEhvc3RNYXAuZ2V0KHByb2plY3QpO1xuICBpZiAoaG9zdCkge1xuICAgIGNvbnN0IGV4dGVybmFsRmlsZXMgPSBob3N0LmdldFRlbXBsYXRlUmVmZXJlbmNlcygpO1xuICAgIHJldHVybiBleHRlcm5hbEZpbGVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRpb25Ub0VudHJ5KGM6IENvbXBsZXRpb24pOiB0cy5Db21wbGV0aW9uRW50cnkge1xuICByZXR1cm4ge1xuICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgYW5kIGZpeCB0eXBlIGVycm9yLlxuICAgIGtpbmQ6IGMua2luZCBhcyBhbnksXG4gICAgbmFtZTogYy5uYW1lLFxuICAgIHNvcnRUZXh0OiBjLnNvcnQsXG4gICAga2luZE1vZGlmaWVyczogJydcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4oY2hhaW46IERpYWdub3N0aWNNZXNzYWdlQ2hhaW4pOlxuICAgIHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge1xuICAgIG1lc3NhZ2VUZXh0OiBjaGFpbi5tZXNzYWdlLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBuZXh0OiBjaGFpbi5uZXh0ID8gZGlhZ25vc3RpY0NoYWluVG9EaWFnbm9zdGljQ2hhaW4oY2hhaW4ubmV4dCkgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY01lc3NhZ2VUb0RpYWdub3N0aWNNZXNzYWdlVGV4dChtZXNzYWdlOiBzdHJpbmcgfCBEaWFnbm9zdGljTWVzc2FnZUNoYWluKTogc3RyaW5nfFxuICAgIHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG1lc3NhZ2U7XG4gIH1cbiAgcmV0dXJuIGRpYWdub3N0aWNDaGFpblRvRGlhZ25vc3RpY0NoYWluKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBkaWFnbm9zdGljVG9EaWFnbm9zdGljKGQ6IERpYWdub3N0aWMsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIGZpbGUsXG4gICAgc3RhcnQ6IGQuc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IGQuc3Bhbi5lbmQgLSBkLnNwYW4uc3RhcnQsXG4gICAgbWVzc2FnZVRleHQ6IGRpYWdub3N0aWNNZXNzYWdlVG9EaWFnbm9zdGljTWVzc2FnZVRleHQoZC5tZXNzYWdlKSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgc291cmNlOiAnbmcnXG4gIH07XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGUoaW5mbzogdHNzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogdHMuTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgY29uc3Qgb2xkTFM6IHRzLkxhbmd1YWdlU2VydmljZSA9IGluZm8ubGFuZ3VhZ2VTZXJ2aWNlO1xuICBjb25zdCBwcm94eTogdHMuTGFuZ3VhZ2VTZXJ2aWNlID0gT2JqZWN0LmFzc2lnbih7fSwgb2xkTFMpO1xuICBjb25zdCBsb2dnZXIgPSBpbmZvLnByb2plY3QucHJvamVjdFNlcnZpY2UubG9nZ2VyO1xuXG4gIGZ1bmN0aW9uIHRyeU9wZXJhdGlvbjxUPihhdHRlbXB0aW5nOiBzdHJpbmcsIGNhbGxiYWNrOiAoKSA9PiBUKTogVHxudWxsIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmluZm8oYEZhaWxlZCB0byAke2F0dGVtcHRpbmd9OiAke2UudG9TdHJpbmcoKX1gKTtcbiAgICAgIGxvZ2dlci5pbmZvKGBTdGFjayB0cmFjZTogJHtlLnN0YWNrfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2VydmljZUhvc3QgPSBuZXcgVHlwZVNjcmlwdFNlcnZpY2VIb3N0KGluZm8ubGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgb2xkTFMpO1xuICBjb25zdCBscyA9IGNyZWF0ZUxhbmd1YWdlU2VydmljZShzZXJ2aWNlSG9zdCk7XG4gIHNlcnZpY2VIb3N0LnNldFNpdGUobHMpO1xuICBwcm9qZWN0SG9zdE1hcC5zZXQoaW5mby5wcm9qZWN0LCBzZXJ2aWNlSG9zdCk7XG5cbiAgcHJveHkuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uID0gZnVuY3Rpb24oXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBvcHRpb25zOiB0cy5HZXRDb21wbGV0aW9uc0F0UG9zaXRpb25PcHRpb25zfHVuZGVmaW5lZCkge1xuICAgIGxldCBiYXNlID0gb2xkTFMuZ2V0Q29tcGxldGlvbnNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgb3B0aW9ucykgfHwge1xuICAgICAgaXNHbG9iYWxDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgIGlzTWVtYmVyQ29tcGxldGlvbjogZmFsc2UsXG4gICAgICBpc05ld0lkZW50aWZpZXJMb2NhdGlvbjogZmFsc2UsXG4gICAgICBlbnRyaWVzOiBbXVxuICAgIH07XG4gICAgdHJ5T3BlcmF0aW9uKCdnZXQgY29tcGxldGlvbnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gbHMuZ2V0Q29tcGxldGlvbnNBdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGJhc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGJhc2UgPSB7XG4gICAgICAgICAgICBpc0dsb2JhbENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaXNNZW1iZXJDb21wbGV0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGlzTmV3SWRlbnRpZmllckxvY2F0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGVudHJpZXM6IFtdXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICBiYXNlLmVudHJpZXMucHVzaChjb21wbGV0aW9uVG9FbnRyeShlbnRyeSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH07XG5cbiAgcHJveHkuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbiA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm8gfFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgYmFzZSA9IG9sZExTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgY29uc3Qgb3VycyA9IGxzLmdldEhvdmVyQXQoZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICAgICAgaWYgKCFvdXJzKSB7XG4gICAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0OiB0cy5RdWlja0luZm8gPSB7XG4gICAgICAgICAga2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICAgICAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAgIHN0YXJ0OiBvdXJzLnNwYW4uc3RhcnQsXG4gICAgICAgICAgICBsZW5ndGg6IG91cnMuc3Bhbi5lbmQgLSBvdXJzLnNwYW4uc3RhcnQsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkaXNwbGF5UGFydHM6IG91cnMudGV4dC5tYXAocGFydCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0ZXh0OiBwYXJ0LnRleHQsXG4gICAgICAgICAgICAgIGtpbmQ6IHBhcnQubGFuZ3VhZ2UgfHwgJ2FuZ3VsYXInLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGJhc2UgJiYgYmFzZS50YWdzKSB7XG4gICAgICAgICAgcmVzdWx0LnRhZ3MgPSBiYXNlLnRhZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG5cbiAgcHJveHkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBsZXQgcmVzdWx0ID0gb2xkTFMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgY29uc3QgYmFzZSA9IHJlc3VsdCB8fCBbXTtcbiAgICB0cnlPcGVyYXRpb24oJ2dldCBkaWFnbm9zdGljcycsICgpID0+IHtcbiAgICAgIGxvZ2dlci5pbmZvKGBDb21wdXRpbmcgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljcy4uLmApO1xuICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBvbGRMUy5nZXRQcm9ncmFtKCkgIS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICBiYXNlLnB1c2guYXBwbHkoYmFzZSwgb3Vycy5tYXAoZCA9PiBkaWFnbm9zdGljVG9EaWFnbm9zdGljKGQsIGZpbGUpKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBiYXNlO1xuICB9O1xuXG4gIHByb3h5LmdldERlZmluaXRpb25BdFBvc2l0aW9uID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGVmaW5pdGlvbkluZm8+fFxuICAgICAgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgYmFzZSA9IG9sZExTLmdldERlZmluaXRpb25BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgIGlmIChiYXNlICYmIGJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3VycyA9IGxzLmdldERlZmluaXRpb25BdChmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgICAgICBpZiAob3VycyAmJiBvdXJzLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBvdXJzLm1hcCgobG9jOiBMb2NhdGlvbikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZmlsZU5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICAgICAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAgICAgICBzdGFydDogbG9jLnNwYW4uc3RhcnQsXG4gICAgICAgICAgICAgICAgbGVuZ3RoOiBsb2Muc3Bhbi5lbmQgLSBsb2Muc3Bhbi5zdGFydCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd24sXG4gICAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICAgICAgICAgICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgcHJveHkuZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbiA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFuIHxcbiAgICAgIHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IGJhc2UgPSBvbGRMUy5nZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgIGlmIChiYXNlICYmIGJhc2UuZGVmaW5pdGlvbnMgJiYgYmFzZS5kZWZpbml0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gYmFzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvdXJzID0gbHMuZ2V0RGVmaW5pdGlvbkF0KGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgIGlmIChvdXJzICYmIG91cnMubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlZmluaXRpb25zOiBvdXJzLm1hcCgobG9jOiBMb2NhdGlvbikgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBsb2MuZmlsZU5hbWUsXG4gICAgICAgICAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAgICAgICAgIHN0YXJ0OiBsb2Muc3Bhbi5zdGFydCxcbiAgICAgICAgICAgICAgICAgIGxlbmd0aDogbG9jLnNwYW4uZW5kIC0gbG9jLnNwYW4uc3RhcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICAgICAgICBraW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lck5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICAgICAgICAgICAgICBjb250YWluZXJLaW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB0ZXh0U3Bhbjoge1xuICAgICAgICAgICAgICBzdGFydDogb3Vyc1swXS5zcGFuLnN0YXJ0LFxuICAgICAgICAgICAgICBsZW5ndGg6IG91cnNbMF0uc3Bhbi5lbmQgLSBvdXJzWzBdLnNwYW4uc3RhcnQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgcmV0dXJuIHByb3h5O1xufVxuIl19