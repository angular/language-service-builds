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
        define("@angular/language-service/src/definitions", ["require", "exports", "tslib", "path", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/ts_utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTsDefinitionAndBoundSpan = exports.getDefinitionAndBoundSpan = void 0;
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript"); // used as value and is provided at runtime
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var ts_utils_1 = require("@angular/language-service/src/ts_utils");
    /**
     * Convert Angular Span to TypeScript TextSpan. Angular Span has 'start' and
     * 'end' whereas TS TextSpan has 'start' and 'length'.
     * @param span Angular Span
     */
    function ngSpanToTsTextSpan(span) {
        return {
            start: span.start,
            length: span.end - span.start,
        };
    }
    /**
     * Traverse the template AST and look for the symbol located at `position`, then
     * return its definition and span of bound text.
     * @param info
     * @param position
     */
    function getDefinitionAndBoundSpan(info, position) {
        var e_1, _a, e_2, _b;
        var symbols = locate_symbol_1.locateSymbols(info, position);
        if (!symbols.length) {
            return;
        }
        var seen = new Set();
        var definitions = [];
        try {
            for (var symbols_1 = tslib_1.__values(symbols), symbols_1_1 = symbols_1.next(); !symbols_1_1.done; symbols_1_1 = symbols_1.next()) {
                var symbolInfo = symbols_1_1.value;
                var symbol = symbolInfo.symbol;
                // symbol.definition is really the locations of the symbol. There could be
                // more than one. No meaningful info could be provided without any location.
                var kind = symbol.kind, name_1 = symbol.name, container = symbol.container, locations = symbol.definition;
                if (!locations || !locations.length) {
                    continue;
                }
                var containerKind = container ? container.kind : ts.ScriptElementKind.unknown;
                var containerName = container ? container.name : '';
                try {
                    for (var locations_1 = (e_2 = void 0, tslib_1.__values(locations)), locations_1_1 = locations_1.next(); !locations_1_1.done; locations_1_1 = locations_1.next()) {
                        var _c = locations_1_1.value, fileName = _c.fileName, span = _c.span;
                        var textSpan = ngSpanToTsTextSpan(span);
                        // In cases like two-way bindings, a request for the definitions of an expression may return
                        // two of the same definition:
                        //    [(ngModel)]="prop"
                        //                 ^^^^  -- one definition for the property binding, one for the event binding
                        // To prune duplicate definitions, tag definitions with unique location signatures and ignore
                        // definitions whose locations have already been seen.
                        var signature = textSpan.start + ":" + textSpan.length + "@" + fileName;
                        if (seen.has(signature))
                            continue;
                        definitions.push({
                            kind: kind,
                            name: name_1,
                            containerKind: containerKind,
                            containerName: containerName,
                            textSpan: ngSpanToTsTextSpan(span),
                            fileName: fileName,
                        });
                        seen.add(signature);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (locations_1_1 && !locations_1_1.done && (_b = locations_1.return)) _b.call(locations_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (symbols_1_1 && !symbols_1_1.done && (_a = symbols_1.return)) _a.call(symbols_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return {
            definitions: definitions,
            textSpan: symbols[0].span,
        };
    }
    exports.getDefinitionAndBoundSpan = getDefinitionAndBoundSpan;
    /**
     * Gets an Angular-specific definition in a TypeScript source file.
     */
    function getTsDefinitionAndBoundSpan(sf, position, tsLsHost) {
        var node = ts_utils_1.findTightestNode(sf, position);
        if (!node)
            return;
        switch (node.kind) {
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                // Attempt to extract definition of a URL in a property assignment.
                return getUrlFromProperty(node, tsLsHost);
            default:
                return undefined;
        }
    }
    exports.getTsDefinitionAndBoundSpan = getTsDefinitionAndBoundSpan;
    /**
     * Attempts to get the definition of a file whose URL is specified in a property assignment in a
     * directive decorator.
     * Currently applies to `templateUrl` and `styleUrls` properties.
     */
    function getUrlFromProperty(urlNode, tsLsHost) {
        // Get the property assignment node corresponding to the `templateUrl` or `styleUrls` assignment.
        // These assignments are specified differently; `templateUrl` is a string, and `styleUrls` is
        // an array of strings:
        //   {
        //        templateUrl: './template.ng.html',
        //        styleUrls: ['./style.css', './other-style.css']
        //   }
        // `templateUrl`'s property assignment can be found from the string literal node;
        // `styleUrls`'s property assignment can be found from the array (parent) node.
        //
        // First search for `templateUrl`.
        var asgn = ts_utils_1.getPropertyAssignmentFromValue(urlNode, 'templateUrl');
        if (!asgn) {
            // `templateUrl` assignment not found; search for `styleUrls` array assignment.
            asgn = ts_utils_1.getPropertyAssignmentFromValue(urlNode.parent, 'styleUrls');
            if (!asgn) {
                // Nothing found, bail.
                return;
            }
        }
        // If the property assignment is not a property of a class decorator, don't generate definitions
        // for it.
        if (!ts_utils_1.getClassDeclFromDecoratorProp(asgn)) {
            return;
        }
        var sf = urlNode.getSourceFile();
        // Extract url path specified by the url node, which is relative to the TypeScript source file
        // the url node is defined in.
        var url = path.join(path.dirname(sf.fileName), urlNode.text);
        // If the file does not exist, bail. It is possible that the TypeScript language service host
        // does not have a `fileExists` method, in which case optimistically assume the file exists.
        if (tsLsHost.fileExists && !tsLsHost.fileExists(url))
            return;
        var templateDefinitions = [{
                kind: ts.ScriptElementKind.externalModuleName,
                name: url,
                containerKind: ts.ScriptElementKind.unknown,
                containerName: '',
                // Reading the template is expensive, so don't provide a preview.
                textSpan: { start: 0, length: 0 },
                fileName: url,
            }];
        return {
            definitions: templateDefinitions,
            textSpan: {
                // Exclude opening and closing quotes in the url span.
                start: urlNode.getStart() + 1,
                length: urlNode.getWidth() - 2,
            },
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsMkJBQTZCO0lBQzdCLCtCQUFpQyxDQUFFLDJDQUEyQztJQUU5RSw2RUFBOEM7SUFDOUMsbUVBQTJHO0lBRzNHOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLElBQVU7UUFDcEMsT0FBTztZQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IseUJBQXlCLENBQ3JDLElBQWUsRUFBRSxRQUFnQjs7UUFDbkMsSUFBTSxPQUFPLEdBQUcsNkJBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbkIsT0FBTztTQUNSO1FBRUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUMvQixJQUFNLFdBQVcsR0FBd0IsRUFBRSxDQUFDOztZQUM1QyxLQUF5QixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO2dCQUE3QixJQUFNLFVBQVUsb0JBQUE7Z0JBQ1osSUFBQSxNQUFNLEdBQUksVUFBVSxPQUFkLENBQWU7Z0JBRTVCLDBFQUEwRTtnQkFDMUUsNEVBQTRFO2dCQUNyRSxJQUFBLElBQUksR0FBNEMsTUFBTSxLQUFsRCxFQUFFLE1BQUksR0FBc0MsTUFBTSxLQUE1QyxFQUFFLFNBQVMsR0FBMkIsTUFBTSxVQUFqQyxFQUFjLFNBQVMsR0FBSSxNQUFNLFdBQVYsQ0FBVztnQkFDOUQsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLFNBQVM7aUJBQ1Y7Z0JBRUQsSUFBTSxhQUFhLEdBQ2YsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztnQkFDdEYsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7O29CQUV0RCxLQUErQixJQUFBLDZCQUFBLGlCQUFBLFNBQVMsQ0FBQSxDQUFBLG9DQUFBLDJEQUFFO3dCQUEvQixJQUFBLHdCQUFnQixFQUFmLFFBQVEsY0FBQSxFQUFFLElBQUksVUFBQTt3QkFDeEIsSUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzFDLDRGQUE0Rjt3QkFDNUYsOEJBQThCO3dCQUM5Qix3QkFBd0I7d0JBQ3hCLDhGQUE4Rjt3QkFDOUYsNkZBQTZGO3dCQUM3RixzREFBc0Q7d0JBQ3RELElBQU0sU0FBUyxHQUFNLFFBQVEsQ0FBQyxLQUFLLFNBQUksUUFBUSxDQUFDLE1BQU0sU0FBSSxRQUFVLENBQUM7d0JBQ3JFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7NEJBQUUsU0FBUzt3QkFFbEMsV0FBVyxDQUFDLElBQUksQ0FBQzs0QkFDZixJQUFJLEVBQUUsSUFBNEI7NEJBQ2xDLElBQUksUUFBQTs0QkFDSixhQUFhLGVBQUE7NEJBQ2IsYUFBYSxlQUFBOzRCQUNiLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7NEJBQ2xDLFFBQVEsRUFBRSxRQUFRO3lCQUNuQixDQUFDLENBQUM7d0JBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDckI7Ozs7Ozs7OzthQUNGOzs7Ozs7Ozs7UUFFRCxPQUFPO1lBQ0wsV0FBVyxhQUFBO1lBQ1gsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1NBQzFCLENBQUM7SUFDSixDQUFDO0lBbERELDhEQWtEQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsMkJBQTJCLENBQ3ZDLEVBQWlCLEVBQUUsUUFBZ0IsRUFDbkMsUUFBMEM7UUFDNUMsSUFBTSxJQUFJLEdBQUcsMkJBQWdCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTztRQUNsQixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDakIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsNkJBQTZCO2dCQUM5QyxtRUFBbUU7Z0JBQ25FLE9BQU8sa0JBQWtCLENBQUMsSUFBNEIsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNwRTtnQkFDRSxPQUFPLFNBQVMsQ0FBQztTQUNwQjtJQUNILENBQUM7SUFiRCxrRUFhQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUN2QixPQUE2QixFQUM3QixRQUEwQztRQUM1QyxpR0FBaUc7UUFDakcsNkZBQTZGO1FBQzdGLHVCQUF1QjtRQUN2QixNQUFNO1FBQ04sNENBQTRDO1FBQzVDLHlEQUF5RDtRQUN6RCxNQUFNO1FBQ04saUZBQWlGO1FBQ2pGLCtFQUErRTtRQUMvRSxFQUFFO1FBQ0Ysa0NBQWtDO1FBQ2xDLElBQUksSUFBSSxHQUFHLHlDQUE4QixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsK0VBQStFO1lBQy9FLElBQUksR0FBRyx5Q0FBOEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ1QsdUJBQXVCO2dCQUN2QixPQUFPO2FBQ1I7U0FDRjtRQUVELGdHQUFnRztRQUNoRyxVQUFVO1FBQ1YsSUFBSSxDQUFDLHdDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hDLE9BQU87U0FDUjtRQUVELElBQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyw4RkFBOEY7UUFDOUYsOEJBQThCO1FBQzlCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9ELDZGQUE2RjtRQUM3Riw0RkFBNEY7UUFDNUYsSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBRTdELElBQU0sbUJBQW1CLEdBQXdCLENBQUM7Z0JBQ2hELElBQUksRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCO2dCQUM3QyxJQUFJLEVBQUUsR0FBRztnQkFDVCxhQUFhLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU87Z0JBQzNDLGFBQWEsRUFBRSxFQUFFO2dCQUNqQixpRUFBaUU7Z0JBQ2pFLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBQztnQkFDL0IsUUFBUSxFQUFFLEdBQUc7YUFDZCxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxRQUFRLEVBQUU7Z0JBQ1Isc0RBQXNEO2dCQUN0RCxLQUFLLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUMvQjtTQUNGLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7ICAvLyB1c2VkIGFzIHZhbHVlIGFuZCBpcyBwcm92aWRlZCBhdCBydW50aW1lXG5cbmltcG9ydCB7bG9jYXRlU3ltYm9sc30gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AsIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZX0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge0FzdFJlc3VsdCwgU3Bhbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQ29udmVydCBBbmd1bGFyIFNwYW4gdG8gVHlwZVNjcmlwdCBUZXh0U3Bhbi4gQW5ndWxhciBTcGFuIGhhcyAnc3RhcnQnIGFuZFxuICogJ2VuZCcgd2hlcmVhcyBUUyBUZXh0U3BhbiBoYXMgJ3N0YXJ0JyBhbmQgJ2xlbmd0aCcuXG4gKiBAcGFyYW0gc3BhbiBBbmd1bGFyIFNwYW5cbiAqL1xuZnVuY3Rpb24gbmdTcGFuVG9Uc1RleHRTcGFuKHNwYW46IFNwYW4pOiB0cy5UZXh0U3BhbiB7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IHNwYW4uc3RhcnQsXG4gICAgbGVuZ3RoOiBzcGFuLmVuZCAtIHNwYW4uc3RhcnQsXG4gIH07XG59XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiBpdHMgZGVmaW5pdGlvbiBhbmQgc3BhbiBvZiBib3VuZCB0ZXh0LlxuICogQHBhcmFtIGluZm9cbiAqIEBwYXJhbSBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICBjb25zdCBzeW1ib2xzID0gbG9jYXRlU3ltYm9scyhpbmZvLCBwb3NpdGlvbik7XG4gIGlmICghc3ltYm9scy5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGRlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW107XG4gIGZvciAoY29uc3Qgc3ltYm9sSW5mbyBvZiBzeW1ib2xzKSB7XG4gICAgY29uc3Qge3N5bWJvbH0gPSBzeW1ib2xJbmZvO1xuXG4gICAgLy8gc3ltYm9sLmRlZmluaXRpb24gaXMgcmVhbGx5IHRoZSBsb2NhdGlvbnMgb2YgdGhlIHN5bWJvbC4gVGhlcmUgY291bGQgYmVcbiAgICAvLyBtb3JlIHRoYW4gb25lLiBObyBtZWFuaW5nZnVsIGluZm8gY291bGQgYmUgcHJvdmlkZWQgd2l0aG91dCBhbnkgbG9jYXRpb24uXG4gICAgY29uc3Qge2tpbmQsIG5hbWUsIGNvbnRhaW5lciwgZGVmaW5pdGlvbjogbG9jYXRpb25zfSA9IHN5bWJvbDtcbiAgICBpZiAoIWxvY2F0aW9ucyB8fCAhbG9jYXRpb25zLmxlbmd0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY29udGFpbmVyS2luZCA9XG4gICAgICAgIGNvbnRhaW5lciA/IGNvbnRhaW5lci5raW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kIDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgICBjb25zdCBjb250YWluZXJOYW1lID0gY29udGFpbmVyID8gY29udGFpbmVyLm5hbWUgOiAnJztcblxuICAgIGZvciAoY29uc3Qge2ZpbGVOYW1lLCBzcGFufSBvZiBsb2NhdGlvbnMpIHtcbiAgICAgIGNvbnN0IHRleHRTcGFuID0gbmdTcGFuVG9Uc1RleHRTcGFuKHNwYW4pO1xuICAgICAgLy8gSW4gY2FzZXMgbGlrZSB0d28td2F5IGJpbmRpbmdzLCBhIHJlcXVlc3QgZm9yIHRoZSBkZWZpbml0aW9ucyBvZiBhbiBleHByZXNzaW9uIG1heSByZXR1cm5cbiAgICAgIC8vIHR3byBvZiB0aGUgc2FtZSBkZWZpbml0aW9uOlxuICAgICAgLy8gICAgWyhuZ01vZGVsKV09XCJwcm9wXCJcbiAgICAgIC8vICAgICAgICAgICAgICAgICBeXl5eICAtLSBvbmUgZGVmaW5pdGlvbiBmb3IgdGhlIHByb3BlcnR5IGJpbmRpbmcsIG9uZSBmb3IgdGhlIGV2ZW50IGJpbmRpbmdcbiAgICAgIC8vIFRvIHBydW5lIGR1cGxpY2F0ZSBkZWZpbml0aW9ucywgdGFnIGRlZmluaXRpb25zIHdpdGggdW5pcXVlIGxvY2F0aW9uIHNpZ25hdHVyZXMgYW5kIGlnbm9yZVxuICAgICAgLy8gZGVmaW5pdGlvbnMgd2hvc2UgbG9jYXRpb25zIGhhdmUgYWxyZWFkeSBiZWVuIHNlZW4uXG4gICAgICBjb25zdCBzaWduYXR1cmUgPSBgJHt0ZXh0U3Bhbi5zdGFydH06JHt0ZXh0U3Bhbi5sZW5ndGh9QCR7ZmlsZU5hbWV9YDtcbiAgICAgIGlmIChzZWVuLmhhcyhzaWduYXR1cmUpKSBjb250aW51ZTtcblxuICAgICAgZGVmaW5pdGlvbnMucHVzaCh7XG4gICAgICAgIGtpbmQ6IGtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGNvbnRhaW5lcktpbmQsXG4gICAgICAgIGNvbnRhaW5lck5hbWUsXG4gICAgICAgIHRleHRTcGFuOiBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3BhbiksXG4gICAgICAgIGZpbGVOYW1lOiBmaWxlTmFtZSxcbiAgICAgIH0pO1xuICAgICAgc2Vlbi5hZGQoc2lnbmF0dXJlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGRlZmluaXRpb25zLFxuICAgIHRleHRTcGFuOiBzeW1ib2xzWzBdLnNwYW4sXG4gIH07XG59XG5cbi8qKlxuICogR2V0cyBhbiBBbmd1bGFyLXNwZWNpZmljIGRlZmluaXRpb24gaW4gYSBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNEZWZpbml0aW9uQW5kQm91bmRTcGFuKFxuICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyLFxuICAgIHRzTHNIb3N0OiBSZWFkb25seTx0cy5MYW5ndWFnZVNlcnZpY2VIb3N0Pik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmICghbm9kZSkgcmV0dXJuO1xuICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbDpcbiAgICAgIC8vIEF0dGVtcHQgdG8gZXh0cmFjdCBkZWZpbml0aW9uIG9mIGEgVVJMIGluIGEgcHJvcGVydHkgYXNzaWdubWVudC5cbiAgICAgIHJldHVybiBnZXRVcmxGcm9tUHJvcGVydHkobm9kZSBhcyB0cy5TdHJpbmdMaXRlcmFsTGlrZSwgdHNMc0hvc3QpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gZ2V0IHRoZSBkZWZpbml0aW9uIG9mIGEgZmlsZSB3aG9zZSBVUkwgaXMgc3BlY2lmaWVkIGluIGEgcHJvcGVydHkgYXNzaWdubWVudCBpbiBhXG4gKiBkaXJlY3RpdmUgZGVjb3JhdG9yLlxuICogQ3VycmVudGx5IGFwcGxpZXMgdG8gYHRlbXBsYXRlVXJsYCBhbmQgYHN0eWxlVXJsc2AgcHJvcGVydGllcy5cbiAqL1xuZnVuY3Rpb24gZ2V0VXJsRnJvbVByb3BlcnR5KFxuICAgIHVybE5vZGU6IHRzLlN0cmluZ0xpdGVyYWxMaWtlLFxuICAgIHRzTHNIb3N0OiBSZWFkb25seTx0cy5MYW5ndWFnZVNlcnZpY2VIb3N0Pik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIC8vIEdldCB0aGUgcHJvcGVydHkgYXNzaWdubWVudCBub2RlIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGB0ZW1wbGF0ZVVybGAgb3IgYHN0eWxlVXJsc2AgYXNzaWdubWVudC5cbiAgLy8gVGhlc2UgYXNzaWdubWVudHMgYXJlIHNwZWNpZmllZCBkaWZmZXJlbnRseTsgYHRlbXBsYXRlVXJsYCBpcyBhIHN0cmluZywgYW5kIGBzdHlsZVVybHNgIGlzXG4gIC8vIGFuIGFycmF5IG9mIHN0cmluZ3M6XG4gIC8vICAge1xuICAvLyAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3RlbXBsYXRlLm5nLmh0bWwnLFxuICAvLyAgICAgICAgc3R5bGVVcmxzOiBbJy4vc3R5bGUuY3NzJywgJy4vb3RoZXItc3R5bGUuY3NzJ11cbiAgLy8gICB9XG4gIC8vIGB0ZW1wbGF0ZVVybGAncyBwcm9wZXJ0eSBhc3NpZ25tZW50IGNhbiBiZSBmb3VuZCBmcm9tIHRoZSBzdHJpbmcgbGl0ZXJhbCBub2RlO1xuICAvLyBgc3R5bGVVcmxzYCdzIHByb3BlcnR5IGFzc2lnbm1lbnQgY2FuIGJlIGZvdW5kIGZyb20gdGhlIGFycmF5IChwYXJlbnQpIG5vZGUuXG4gIC8vXG4gIC8vIEZpcnN0IHNlYXJjaCBmb3IgYHRlbXBsYXRlVXJsYC5cbiAgbGV0IGFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUodXJsTm9kZSwgJ3RlbXBsYXRlVXJsJyk7XG4gIGlmICghYXNnbikge1xuICAgIC8vIGB0ZW1wbGF0ZVVybGAgYXNzaWdubWVudCBub3QgZm91bmQ7IHNlYXJjaCBmb3IgYHN0eWxlVXJsc2AgYXJyYXkgYXNzaWdubWVudC5cbiAgICBhc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKHVybE5vZGUucGFyZW50LCAnc3R5bGVVcmxzJyk7XG4gICAgaWYgKCFhc2duKSB7XG4gICAgICAvLyBOb3RoaW5nIGZvdW5kLCBiYWlsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG5vdCBhIHByb3BlcnR5IG9mIGEgY2xhc3MgZGVjb3JhdG9yLCBkb24ndCBnZW5lcmF0ZSBkZWZpbml0aW9uc1xuICAvLyBmb3IgaXQuXG4gIGlmICghZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AoYXNnbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzZiA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAvLyBFeHRyYWN0IHVybCBwYXRoIHNwZWNpZmllZCBieSB0aGUgdXJsIG5vZGUsIHdoaWNoIGlzIHJlbGF0aXZlIHRvIHRoZSBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlXG4gIC8vIHRoZSB1cmwgbm9kZSBpcyBkZWZpbmVkIGluLlxuICBjb25zdCB1cmwgPSBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHNmLmZpbGVOYW1lKSwgdXJsTm9kZS50ZXh0KTtcblxuICAvLyBJZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCwgYmFpbC4gSXQgaXMgcG9zc2libGUgdGhhdCB0aGUgVHlwZVNjcmlwdCBsYW5ndWFnZSBzZXJ2aWNlIGhvc3RcbiAgLy8gZG9lcyBub3QgaGF2ZSBhIGBmaWxlRXhpc3RzYCBtZXRob2QsIGluIHdoaWNoIGNhc2Ugb3B0aW1pc3RpY2FsbHkgYXNzdW1lIHRoZSBmaWxlIGV4aXN0cy5cbiAgaWYgKHRzTHNIb3N0LmZpbGVFeGlzdHMgJiYgIXRzTHNIb3N0LmZpbGVFeGlzdHModXJsKSkgcmV0dXJuO1xuXG4gIGNvbnN0IHRlbXBsYXRlRGVmaW5pdGlvbnM6IHRzLkRlZmluaXRpb25JbmZvW10gPSBbe1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmV4dGVybmFsTW9kdWxlTmFtZSxcbiAgICBuYW1lOiB1cmwsXG4gICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICBjb250YWluZXJOYW1lOiAnJyxcbiAgICAvLyBSZWFkaW5nIHRoZSB0ZW1wbGF0ZSBpcyBleHBlbnNpdmUsIHNvIGRvbid0IHByb3ZpZGUgYSBwcmV2aWV3LlxuICAgIHRleHRTcGFuOiB7c3RhcnQ6IDAsIGxlbmd0aDogMH0sXG4gICAgZmlsZU5hbWU6IHVybCxcbiAgfV07XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9uczogdGVtcGxhdGVEZWZpbml0aW9ucyxcbiAgICB0ZXh0U3Bhbjoge1xuICAgICAgLy8gRXhjbHVkZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHF1b3RlcyBpbiB0aGUgdXJsIHNwYW4uXG4gICAgICBzdGFydDogdXJsTm9kZS5nZXRTdGFydCgpICsgMSxcbiAgICAgIGxlbmd0aDogdXJsTm9kZS5nZXRXaWR0aCgpIC0gMixcbiAgICB9LFxuICB9O1xufVxuIl19