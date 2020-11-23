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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsMkJBQTZCO0lBQzdCLCtCQUFpQyxDQUFFLDJDQUEyQztJQUU5RSw2RUFBOEM7SUFDOUMsbUVBQTJHO0lBRzNHOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLElBQVU7UUFDcEMsT0FBTztZQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQUNEOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUN2QixPQUE2QixFQUM3QixRQUEwQztRQUM1QyxpR0FBaUc7UUFDakcsNkZBQTZGO1FBQzdGLHVCQUF1QjtRQUN2QixNQUFNO1FBQ04sNENBQTRDO1FBQzVDLHlEQUF5RDtRQUN6RCxNQUFNO1FBQ04saUZBQWlGO1FBQ2pGLCtFQUErRTtRQUMvRSxFQUFFO1FBQ0Ysa0NBQWtDO1FBQ2xDLElBQUksSUFBSSxHQUFHLHlDQUE4QixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsK0VBQStFO1lBQy9FLElBQUksR0FBRyx5Q0FBOEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ1QsdUJBQXVCO2dCQUN2QixPQUFPO2FBQ1I7U0FDRjtRQUVELGdHQUFnRztRQUNoRyxVQUFVO1FBQ1YsSUFBSSxDQUFDLHdDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hDLE9BQU87U0FDUjtRQUVELElBQU0sRUFB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QUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQzs0QkFBRSxTQUFTO3dCQUVsQyxXQUFXLENBQUMsSUFBSSxDQUFDOzRCQUNmLElBQUksRUFBRSxJQUE0Qjs0QkFDbEMsSUFBSSxRQUFBOzRCQUNKLGFBQWEsZUFBQTs0QkFDYixhQUFhLGVBQUE7NEJBQ2IsUUFBUSxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQzs0QkFDbEMsUUFBUSxFQUFFLFFBQVE7eUJBQ25CLENBQUMsQ0FBQzt3QkFDSCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUNyQjs7Ozs7Ozs7O2FBQ0Y7Ozs7Ozs7OztRQUVELE9BQU87WUFDTCxXQUFXLGFBQUE7WUFDWCxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7U0FDMUIsQ0FBQztJQUNKLENBQUM7SUFsREQsOERBa0RDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQiwyQkFBMkIsQ0FDdkMsRUFBaUIsRUFBRSxRQUFnQixFQUNuQyxRQUEwQztRQUM1QyxJQUFNLElBQUksR0FBRywyQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLElBQUk7WUFBRSxPQUFPO1FBQ2xCLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyw2QkFBNkI7Z0JBQzlDLG1FQUFtRTtnQkFDbkUsT0FBTyxrQkFBa0IsQ0FBQyxJQUE0QixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3BFO2dCQUNFLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQztJQWJELGtFQWFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgIC8vIHVzZWQgYXMgdmFsdWUgYW5kIGlzIHByb3ZpZGVkIGF0IHJ1bnRpbWVcblxuaW1wb3J0IHtsb2NhdGVTeW1ib2xzfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3RzX3V0aWxzJztcbmltcG9ydCB7QXN0UmVzdWx0LCBTcGFufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDb252ZXJ0IEFuZ3VsYXIgU3BhbiB0byBUeXBlU2NyaXB0IFRleHRTcGFuLiBBbmd1bGFyIFNwYW4gaGFzICdzdGFydCcgYW5kXG4gKiAnZW5kJyB3aGVyZWFzIFRTIFRleHRTcGFuIGhhcyAnc3RhcnQnIGFuZCAnbGVuZ3RoJy5cbiAqIEBwYXJhbSBzcGFuIEFuZ3VsYXIgU3BhblxuICovXG5mdW5jdGlvbiBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3BhbjogU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IHNwYW4uZW5kIC0gc3Bhbi5zdGFydCxcbiAgfTtcbn1cbi8qKlxuICogQXR0ZW1wdHMgdG8gZ2V0IHRoZSBkZWZpbml0aW9uIG9mIGEgZmlsZSB3aG9zZSBVUkwgaXMgc3BlY2lmaWVkIGluIGEgcHJvcGVydHkgYXNzaWdubWVudCBpbiBhXG4gKiBkaXJlY3RpdmUgZGVjb3JhdG9yLlxuICogQ3VycmVudGx5IGFwcGxpZXMgdG8gYHRlbXBsYXRlVXJsYCBhbmQgYHN0eWxlVXJsc2AgcHJvcGVydGllcy5cbiAqL1xuZnVuY3Rpb24gZ2V0VXJsRnJvbVByb3BlcnR5KFxuICAgIHVybE5vZGU6IHRzLlN0cmluZ0xpdGVyYWxMaWtlLFxuICAgIHRzTHNIb3N0OiBSZWFkb25seTx0cy5MYW5ndWFnZVNlcnZpY2VIb3N0Pik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIC8vIEdldCB0aGUgcHJvcGVydHkgYXNzaWdubWVudCBub2RlIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGB0ZW1wbGF0ZVVybGAgb3IgYHN0eWxlVXJsc2AgYXNzaWdubWVudC5cbiAgLy8gVGhlc2UgYXNzaWdubWVudHMgYXJlIHNwZWNpZmllZCBkaWZmZXJlbnRseTsgYHRlbXBsYXRlVXJsYCBpcyBhIHN0cmluZywgYW5kIGBzdHlsZVVybHNgIGlzXG4gIC8vIGFuIGFycmF5IG9mIHN0cmluZ3M6XG4gIC8vICAge1xuICAvLyAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3RlbXBsYXRlLm5nLmh0bWwnLFxuICAvLyAgICAgICAgc3R5bGVVcmxzOiBbJy4vc3R5bGUuY3NzJywgJy4vb3RoZXItc3R5bGUuY3NzJ11cbiAgLy8gICB9XG4gIC8vIGB0ZW1wbGF0ZVVybGAncyBwcm9wZXJ0eSBhc3NpZ25tZW50IGNhbiBiZSBmb3VuZCBmcm9tIHRoZSBzdHJpbmcgbGl0ZXJhbCBub2RlO1xuICAvLyBgc3R5bGVVcmxzYCdzIHByb3BlcnR5IGFzc2lnbm1lbnQgY2FuIGJlIGZvdW5kIGZyb20gdGhlIGFycmF5IChwYXJlbnQpIG5vZGUuXG4gIC8vXG4gIC8vIEZpcnN0IHNlYXJjaCBmb3IgYHRlbXBsYXRlVXJsYC5cbiAgbGV0IGFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUodXJsTm9kZSwgJ3RlbXBsYXRlVXJsJyk7XG4gIGlmICghYXNnbikge1xuICAgIC8vIGB0ZW1wbGF0ZVVybGAgYXNzaWdubWVudCBub3QgZm91bmQ7IHNlYXJjaCBmb3IgYHN0eWxlVXJsc2AgYXJyYXkgYXNzaWdubWVudC5cbiAgICBhc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKHVybE5vZGUucGFyZW50LCAnc3R5bGVVcmxzJyk7XG4gICAgaWYgKCFhc2duKSB7XG4gICAgICAvLyBOb3RoaW5nIGZvdW5kLCBiYWlsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG5vdCBhIHByb3BlcnR5IG9mIGEgY2xhc3MgZGVjb3JhdG9yLCBkb24ndCBnZW5lcmF0ZSBkZWZpbml0aW9uc1xuICAvLyBmb3IgaXQuXG4gIGlmICghZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AoYXNnbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzZiA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAvLyBFeHRyYWN0IHVybCBwYXRoIHNwZWNpZmllZCBieSB0aGUgdXJsIG5vZGUsIHdoaWNoIGlzIHJlbGF0aXZlIHRvIHRoZSBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlXG4gIC8vIHRoZSB1cmwgbm9kZSBpcyBkZWZpbmVkIGluLlxuICBjb25zdCB1cmwgPSBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHNmLmZpbGVOYW1lKSwgdXJsTm9kZS50ZXh0KTtcblxuICAvLyBJZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCwgYmFpbC4gSXQgaXMgcG9zc2libGUgdGhhdCB0aGUgVHlwZVNjcmlwdCBsYW5ndWFnZSBzZXJ2aWNlIGhvc3RcbiAgLy8gZG9lcyBub3QgaGF2ZSBhIGBmaWxlRXhpc3RzYCBtZXRob2QsIGluIHdoaWNoIGNhc2Ugb3B0aW1pc3RpY2FsbHkgYXNzdW1lIHRoZSBmaWxlIGV4aXN0cy5cbiAgaWYgKHRzTHNIb3N0LmZpbGVFeGlzdHMgJiYgIXRzTHNIb3N0LmZpbGVFeGlzdHModXJsKSkgcmV0dXJuO1xuXG4gIGNvbnN0IHRlbXBsYXRlRGVmaW5pdGlvbnM6IHRzLkRlZmluaXRpb25JbmZvW10gPSBbe1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmV4dGVybmFsTW9kdWxlTmFtZSxcbiAgICBuYW1lOiB1cmwsXG4gICAgY29udGFpbmVyS2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgICBjb250YWluZXJOYW1lOiAnJyxcbiAgICAvLyBSZWFkaW5nIHRoZSB0ZW1wbGF0ZSBpcyBleHBlbnNpdmUsIHNvIGRvbid0IHByb3ZpZGUgYSBwcmV2aWV3LlxuICAgIHRleHRTcGFuOiB7c3RhcnQ6IDAsIGxlbmd0aDogMH0sXG4gICAgZmlsZU5hbWU6IHVybCxcbiAgfV07XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9uczogdGVtcGxhdGVEZWZpbml0aW9ucyxcbiAgICB0ZXh0U3Bhbjoge1xuICAgICAgLy8gRXhjbHVkZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHF1b3RlcyBpbiB0aGUgdXJsIHNwYW4uXG4gICAgICBzdGFydDogdXJsTm9kZS5nZXRTdGFydCgpICsgMSxcbiAgICAgIGxlbmd0aDogdXJsTm9kZS5nZXRXaWR0aCgpIC0gMixcbiAgICB9LFxuICB9O1xufVxuXG4vKipcbiAqIFRyYXZlcnNlIHRoZSB0ZW1wbGF0ZSBBU1QgYW5kIGxvb2sgZm9yIHRoZSBzeW1ib2wgbG9jYXRlZCBhdCBgcG9zaXRpb25gLCB0aGVuXG4gKiByZXR1cm4gaXRzIGRlZmluaXRpb24gYW5kIHNwYW4gb2YgYm91bmQgdGV4dC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gcG9zaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9scyA9IGxvY2F0ZVN5bWJvbHMoaW5mbywgcG9zaXRpb24pO1xuICBpZiAoIXN5bWJvbHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBkZWZpbml0aW9uczogdHMuRGVmaW5pdGlvbkluZm9bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHN5bWJvbEluZm8gb2Ygc3ltYm9scykge1xuICAgIGNvbnN0IHtzeW1ib2x9ID0gc3ltYm9sSW5mbztcblxuICAgIC8vIHN5bWJvbC5kZWZpbml0aW9uIGlzIHJlYWxseSB0aGUgbG9jYXRpb25zIG9mIHRoZSBzeW1ib2wuIFRoZXJlIGNvdWxkIGJlXG4gICAgLy8gbW9yZSB0aGFuIG9uZS4gTm8gbWVhbmluZ2Z1bCBpbmZvIGNvdWxkIGJlIHByb3ZpZGVkIHdpdGhvdXQgYW55IGxvY2F0aW9uLlxuICAgIGNvbnN0IHtraW5kLCBuYW1lLCBjb250YWluZXIsIGRlZmluaXRpb246IGxvY2F0aW9uc30gPSBzeW1ib2w7XG4gICAgaWYgKCFsb2NhdGlvbnMgfHwgIWxvY2F0aW9ucy5sZW5ndGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRhaW5lcktpbmQgPVxuICAgICAgICBjb250YWluZXIgPyBjb250YWluZXIua2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCA6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gICAgY29uc3QgY29udGFpbmVyTmFtZSA9IGNvbnRhaW5lciA/IGNvbnRhaW5lci5uYW1lIDogJyc7XG5cbiAgICBmb3IgKGNvbnN0IHtmaWxlTmFtZSwgc3Bhbn0gb2YgbG9jYXRpb25zKSB7XG4gICAgICBjb25zdCB0ZXh0U3BhbiA9IG5nU3BhblRvVHNUZXh0U3BhbihzcGFuKTtcbiAgICAgIC8vIEluIGNhc2VzIGxpa2UgdHdvLXdheSBiaW5kaW5ncywgYSByZXF1ZXN0IGZvciB0aGUgZGVmaW5pdGlvbnMgb2YgYW4gZXhwcmVzc2lvbiBtYXkgcmV0dXJuXG4gICAgICAvLyB0d28gb2YgdGhlIHNhbWUgZGVmaW5pdGlvbjpcbiAgICAgIC8vICAgIFsobmdNb2RlbCldPVwicHJvcFwiXG4gICAgICAvLyAgICAgICAgICAgICAgICAgXl5eXiAgLS0gb25lIGRlZmluaXRpb24gZm9yIHRoZSBwcm9wZXJ0eSBiaW5kaW5nLCBvbmUgZm9yIHRoZSBldmVudCBiaW5kaW5nXG4gICAgICAvLyBUbyBwcnVuZSBkdXBsaWNhdGUgZGVmaW5pdGlvbnMsIHRhZyBkZWZpbml0aW9ucyB3aXRoIHVuaXF1ZSBsb2NhdGlvbiBzaWduYXR1cmVzIGFuZCBpZ25vcmVcbiAgICAgIC8vIGRlZmluaXRpb25zIHdob3NlIGxvY2F0aW9ucyBoYXZlIGFscmVhZHkgYmVlbiBzZWVuLlxuICAgICAgY29uc3Qgc2lnbmF0dXJlID0gYCR7dGV4dFNwYW4uc3RhcnR9OiR7dGV4dFNwYW4ubGVuZ3RofUAke2ZpbGVOYW1lfWA7XG4gICAgICBpZiAoc2Vlbi5oYXMoc2lnbmF0dXJlKSkgY29udGludWU7XG5cbiAgICAgIGRlZmluaXRpb25zLnB1c2goe1xuICAgICAgICBraW5kOiBraW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgICBuYW1lLFxuICAgICAgICBjb250YWluZXJLaW5kLFxuICAgICAgICBjb250YWluZXJOYW1lLFxuICAgICAgICB0ZXh0U3BhbjogbmdTcGFuVG9Uc1RleHRTcGFuKHNwYW4pLFxuICAgICAgICBmaWxlTmFtZTogZmlsZU5hbWUsXG4gICAgICB9KTtcbiAgICAgIHNlZW4uYWRkKHNpZ25hdHVyZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9ucyxcbiAgICB0ZXh0U3Bhbjogc3ltYm9sc1swXS5zcGFuLFxuICB9O1xufVxuXG4vKipcbiAqIEdldHMgYW4gQW5ndWxhci1zcGVjaWZpYyBkZWZpbml0aW9uIGluIGEgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRzRGVmaW5pdGlvbkFuZEJvdW5kU3BhbihcbiAgICBzZjogdHMuU291cmNlRmlsZSwgcG9zaXRpb246IG51bWJlcixcbiAgICB0c0xzSG9zdDogUmVhZG9ubHk8dHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdD4pOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzZiwgcG9zaXRpb24pO1xuICBpZiAoIW5vZGUpIHJldHVybjtcbiAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWw6XG4gICAgICAvLyBBdHRlbXB0IHRvIGV4dHJhY3QgZGVmaW5pdGlvbiBvZiBhIFVSTCBpbiBhIHByb3BlcnR5IGFzc2lnbm1lbnQuXG4gICAgICByZXR1cm4gZ2V0VXJsRnJvbVByb3BlcnR5KG5vZGUgYXMgdHMuU3RyaW5nTGl0ZXJhbExpa2UsIHRzTHNIb3N0KTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuIl19