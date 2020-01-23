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
        define("@angular/language-service/src/definitions", ["require", "exports", "tslib", "path", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/template", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript"); // used as value and is provided at runtime
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var template_1 = require("@angular/language-service/src/template");
    var utils_1 = require("@angular/language-service/src/utils");
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
        var e_1, _a;
        var symbols = locate_symbol_1.locateSymbols(info, position);
        if (!symbols.length) {
            return;
        }
        var textSpan = ngSpanToTsTextSpan(symbols[0].span);
        var definitions = [];
        var _loop_1 = function (symbolInfo) {
            var symbol = symbolInfo.symbol;
            // symbol.definition is really the locations of the symbol. There could be
            // more than one. No meaningful info could be provided without any location.
            var kind = symbol.kind, name_1 = symbol.name, container = symbol.container, locations = symbol.definition;
            if (!locations || !locations.length) {
                return "continue";
            }
            var containerKind = container ? container.kind : ts.ScriptElementKind.unknown;
            var containerName = container ? container.name : '';
            definitions.push.apply(definitions, tslib_1.__spread(locations.map(function (location) {
                return {
                    kind: kind,
                    name: name_1,
                    containerKind: containerKind,
                    containerName: containerName,
                    textSpan: ngSpanToTsTextSpan(location.span),
                    fileName: location.fileName,
                };
            })));
        };
        try {
            for (var symbols_1 = tslib_1.__values(symbols), symbols_1_1 = symbols_1.next(); !symbols_1_1.done; symbols_1_1 = symbols_1.next()) {
                var symbolInfo = symbols_1_1.value;
                _loop_1(symbolInfo);
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
            definitions: definitions, textSpan: textSpan,
        };
    }
    exports.getDefinitionAndBoundSpan = getDefinitionAndBoundSpan;
    /**
     * Gets an Angular-specific definition in a TypeScript source file.
     */
    function getTsDefinitionAndBoundSpan(sf, position, tsLsHost) {
        var node = utils_1.findTightestNode(sf, position);
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
        var asgn = template_1.getPropertyAssignmentFromValue(urlNode);
        if (!asgn || asgn.name.getText() !== 'templateUrl') {
            // `templateUrl` assignment not found; search for `styleUrls` array assignment.
            asgn = template_1.getPropertyAssignmentFromValue(urlNode.parent);
            if (!asgn || asgn.name.getText() !== 'styleUrls') {
                // Nothing found, bail.
                return;
            }
        }
        // If the property assignment is not a property of a class decorator, don't generate definitions
        // for it.
        if (!template_1.isClassDecoratorProperty(asgn))
            return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwyQkFBNkI7SUFDN0IsK0JBQWlDLENBQUMsMkNBQTJDO0lBRTdFLDZFQUE4QztJQUM5QyxtRUFBb0Y7SUFFcEYsNkRBQXlDO0lBRXpDOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLElBQVU7UUFDcEMsT0FBTztZQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IseUJBQXlCLENBQ3JDLElBQWUsRUFBRSxRQUFnQjs7UUFDbkMsSUFBTSxPQUFPLEdBQUcsNkJBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbkIsT0FBTztTQUNSO1FBRUQsSUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELElBQU0sV0FBVyxHQUF3QixFQUFFLENBQUM7Z0NBQ2pDLFVBQVU7WUFDWixJQUFBLDBCQUFNLENBQWU7WUFFNUIsMEVBQTBFO1lBQzFFLDRFQUE0RTtZQUNyRSxJQUFBLGtCQUFJLEVBQUUsb0JBQUksRUFBRSw0QkFBUyxFQUFFLDZCQUFxQixDQUFXO1lBQzlELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFOzthQUVwQztZQUVELElBQU0sYUFBYSxHQUNmLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFD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LEdBQXdCLENBQUM7Z0JBQ2hELElBQUksRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCO2dCQUM3QyxJQUFJLEVBQUUsR0FBRztnQkFDVCxhQUFhLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU87Z0JBQzNDLGFBQWEsRUFBRSxFQUFFO2dCQUNqQixpRUFBaUU7Z0JBQ2pFLFFBQVEsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBQztnQkFDL0IsUUFBUSxFQUFFLEdBQUc7YUFDZCxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxRQUFRLEVBQUU7Z0JBQ1Isc0RBQXNEO2dCQUN0RCxLQUFLLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQzthQUMvQjtTQUNGLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHVzZWQgYXMgdmFsdWUgYW5kIGlzIHByb3ZpZGVkIGF0IHJ1bnRpbWVcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbHN9IGZyb20gJy4vbG9jYXRlX3N5bWJvbCc7XG5pbXBvcnQge2dldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZSwgaXNDbGFzc0RlY29yYXRvclByb3BlcnR5fSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCB7U3Bhbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIENvbnZlcnQgQW5ndWxhciBTcGFuIHRvIFR5cGVTY3JpcHQgVGV4dFNwYW4uIEFuZ3VsYXIgU3BhbiBoYXMgJ3N0YXJ0JyBhbmRcbiAqICdlbmQnIHdoZXJlYXMgVFMgVGV4dFNwYW4gaGFzICdzdGFydCcgYW5kICdsZW5ndGgnLlxuICogQHBhcmFtIHNwYW4gQW5ndWxhciBTcGFuXG4gKi9cbmZ1bmN0aW9uIG5nU3BhblRvVHNUZXh0U3BhbihzcGFuOiBTcGFuKTogdHMuVGV4dFNwYW4ge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBzcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogc3Bhbi5lbmQgLSBzcGFuLnN0YXJ0LFxuICB9O1xufVxuXG4vKipcbiAqIFRyYXZlcnNlIHRoZSB0ZW1wbGF0ZSBBU1QgYW5kIGxvb2sgZm9yIHRoZSBzeW1ib2wgbG9jYXRlZCBhdCBgcG9zaXRpb25gLCB0aGVuXG4gKiByZXR1cm4gaXRzIGRlZmluaXRpb24gYW5kIHNwYW4gb2YgYm91bmQgdGV4dC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gcG9zaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9scyA9IGxvY2F0ZVN5bWJvbHMoaW5mbywgcG9zaXRpb24pO1xuICBpZiAoIXN5bWJvbHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdGV4dFNwYW4gPSBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3ltYm9sc1swXS5zcGFuKTtcbiAgY29uc3QgZGVmaW5pdGlvbnM6IHRzLkRlZmluaXRpb25JbmZvW10gPSBbXTtcbiAgZm9yIChjb25zdCBzeW1ib2xJbmZvIG9mIHN5bWJvbHMpIHtcbiAgICBjb25zdCB7c3ltYm9sfSA9IHN5bWJvbEluZm87XG5cbiAgICAvLyBzeW1ib2wuZGVmaW5pdGlvbiBpcyByZWFsbHkgdGhlIGxvY2F0aW9ucyBvZiB0aGUgc3ltYm9sLiBUaGVyZSBjb3VsZCBiZVxuICAgIC8vIG1vcmUgdGhhbiBvbmUuIE5vIG1lYW5pbmdmdWwgaW5mbyBjb3VsZCBiZSBwcm92aWRlZCB3aXRob3V0IGFueSBsb2NhdGlvbi5cbiAgICBjb25zdCB7a2luZCwgbmFtZSwgY29udGFpbmVyLCBkZWZpbml0aW9uOiBsb2NhdGlvbnN9ID0gc3ltYm9sO1xuICAgIGlmICghbG9jYXRpb25zIHx8ICFsb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBjb250YWluZXJLaW5kID1cbiAgICAgICAgY29udGFpbmVyID8gY29udGFpbmVyLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQgOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duO1xuICAgIGNvbnN0IGNvbnRhaW5lck5hbWUgPSBjb250YWluZXIgPyBjb250YWluZXIubmFtZSA6ICcnO1xuICAgIGRlZmluaXRpb25zLnB1c2goLi4ubG9jYXRpb25zLm1hcCgobG9jYXRpb24pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IGtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGNvbnRhaW5lcktpbmQsXG4gICAgICAgIGNvbnRhaW5lck5hbWUsXG4gICAgICAgIHRleHRTcGFuOiBuZ1NwYW5Ub1RzVGV4dFNwYW4obG9jYXRpb24uc3BhbiksXG4gICAgICAgIGZpbGVOYW1lOiBsb2NhdGlvbi5maWxlTmFtZSxcbiAgICAgIH07XG4gICAgfSkpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAgIGRlZmluaXRpb25zLCB0ZXh0U3BhbixcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXRzIGFuIEFuZ3VsYXItc3BlY2lmaWMgZGVmaW5pdGlvbiBpbiBhIFR5cGVTY3JpcHQgc291cmNlIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgdHNMc0hvc3Q6IFJlYWRvbmx5PHRzLkxhbmd1YWdlU2VydmljZUhvc3Q+KTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKCFub2RlKSByZXR1cm47XG4gIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsOlxuICAgICAgLy8gQXR0ZW1wdCB0byBleHRyYWN0IGRlZmluaXRpb24gb2YgYSBVUkwgaW4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50LlxuICAgICAgcmV0dXJuIGdldFVybEZyb21Qcm9wZXJ0eShub2RlIGFzIHRzLlN0cmluZ0xpdGVyYWxMaWtlLCB0c0xzSG9zdCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBnZXQgdGhlIGRlZmluaXRpb24gb2YgYSBmaWxlIHdob3NlIFVSTCBpcyBzcGVjaWZpZWQgaW4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50IGluIGFcbiAqIGRpcmVjdGl2ZSBkZWNvcmF0b3IuXG4gKiBDdXJyZW50bHkgYXBwbGllcyB0byBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBnZXRVcmxGcm9tUHJvcGVydHkoXG4gICAgdXJsTm9kZTogdHMuU3RyaW5nTGl0ZXJhbExpa2UsXG4gICAgdHNMc0hvc3Q6IFJlYWRvbmx5PHRzLkxhbmd1YWdlU2VydmljZUhvc3Q+KTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgLy8gR2V0IHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IG5vZGUgY29ycmVzcG9uZGluZyB0byB0aGUgYHRlbXBsYXRlVXJsYCBvciBgc3R5bGVVcmxzYCBhc3NpZ25tZW50LlxuICAvLyBUaGVzZSBhc3NpZ25tZW50cyBhcmUgc3BlY2lmaWVkIGRpZmZlcmVudGx5OyBgdGVtcGxhdGVVcmxgIGlzIGEgc3RyaW5nLCBhbmQgYHN0eWxlVXJsc2AgaXNcbiAgLy8gYW4gYXJyYXkgb2Ygc3RyaW5nczpcbiAgLy8gICB7XG4gIC8vICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdGVtcGxhdGUubmcuaHRtbCcsXG4gIC8vICAgICAgICBzdHlsZVVybHM6IFsnLi9zdHlsZS5jc3MnLCAnLi9vdGhlci1zdHlsZS5jc3MnXVxuICAvLyAgIH1cbiAgLy8gYHRlbXBsYXRlVXJsYCdzIHByb3BlcnR5IGFzc2lnbm1lbnQgY2FuIGJlIGZvdW5kIGZyb20gdGhlIHN0cmluZyBsaXRlcmFsIG5vZGU7XG4gIC8vIGBzdHlsZVVybHNgJ3MgcHJvcGVydHkgYXNzaWdubWVudCBjYW4gYmUgZm91bmQgZnJvbSB0aGUgYXJyYXkgKHBhcmVudCkgbm9kZS5cbiAgLy9cbiAgLy8gRmlyc3Qgc2VhcmNoIGZvciBgdGVtcGxhdGVVcmxgLlxuICBsZXQgYXNnbiA9IGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZSh1cmxOb2RlKTtcbiAgaWYgKCFhc2duIHx8IGFzZ24ubmFtZS5nZXRUZXh0KCkgIT09ICd0ZW1wbGF0ZVVybCcpIHtcbiAgICAvLyBgdGVtcGxhdGVVcmxgIGFzc2lnbm1lbnQgbm90IGZvdW5kOyBzZWFyY2ggZm9yIGBzdHlsZVVybHNgIGFycmF5IGFzc2lnbm1lbnQuXG4gICAgYXNnbiA9IGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZSh1cmxOb2RlLnBhcmVudCk7XG4gICAgaWYgKCFhc2duIHx8IGFzZ24ubmFtZS5nZXRUZXh0KCkgIT09ICdzdHlsZVVybHMnKSB7XG4gICAgICAvLyBOb3RoaW5nIGZvdW5kLCBiYWlsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG5vdCBhIHByb3BlcnR5IG9mIGEgY2xhc3MgZGVjb3JhdG9yLCBkb24ndCBnZW5lcmF0ZSBkZWZpbml0aW9uc1xuICAvLyBmb3IgaXQuXG4gIGlmICghaXNDbGFzc0RlY29yYXRvclByb3BlcnR5KGFzZ24pKSByZXR1cm47XG5cbiAgY29uc3Qgc2YgPSB1cmxOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgLy8gRXh0cmFjdCB1cmwgcGF0aCBzcGVjaWZpZWQgYnkgdGhlIHVybCBub2RlLCB3aGljaCBpcyByZWxhdGl2ZSB0byB0aGUgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZVxuICAvLyB0aGUgdXJsIG5vZGUgaXMgZGVmaW5lZCBpbi5cbiAgY29uc3QgdXJsID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShzZi5maWxlTmFtZSksIHVybE5vZGUudGV4dCk7XG5cbiAgLy8gSWYgdGhlIGZpbGUgZG9lcyBub3QgZXhpc3QsIGJhaWwuIEl0IGlzIHBvc3NpYmxlIHRoYXQgdGhlIFR5cGVTY3JpcHQgbGFuZ3VhZ2Ugc2VydmljZSBob3N0XG4gIC8vIGRvZXMgbm90IGhhdmUgYSBgZmlsZUV4aXN0c2AgbWV0aG9kLCBpbiB3aGljaCBjYXNlIG9wdGltaXN0aWNhbGx5IGFzc3VtZSB0aGUgZmlsZSBleGlzdHMuXG4gIGlmICh0c0xzSG9zdC5maWxlRXhpc3RzICYmICF0c0xzSG9zdC5maWxlRXhpc3RzKHVybCkpIHJldHVybjtcblxuICBjb25zdCB0ZW1wbGF0ZURlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW3tcbiAgICBraW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC5leHRlcm5hbE1vZHVsZU5hbWUsXG4gICAgbmFtZTogdXJsLFxuICAgIGNvbnRhaW5lcktpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd24sXG4gICAgY29udGFpbmVyTmFtZTogJycsXG4gICAgLy8gUmVhZGluZyB0aGUgdGVtcGxhdGUgaXMgZXhwZW5zaXZlLCBzbyBkb24ndCBwcm92aWRlIGEgcHJldmlldy5cbiAgICB0ZXh0U3Bhbjoge3N0YXJ0OiAwLCBsZW5ndGg6IDB9LFxuICAgIGZpbGVOYW1lOiB1cmwsXG4gIH1dO1xuXG4gIHJldHVybiB7XG4gICAgZGVmaW5pdGlvbnM6IHRlbXBsYXRlRGVmaW5pdGlvbnMsXG4gICAgdGV4dFNwYW46IHtcbiAgICAgIC8vIEV4Y2x1ZGUgb3BlbmluZyBhbmQgY2xvc2luZyBxdW90ZXMgaW4gdGhlIHVybCBzcGFuLlxuICAgICAgc3RhcnQ6IHVybE5vZGUuZ2V0U3RhcnQoKSArIDEsXG4gICAgICBsZW5ndGg6IHVybE5vZGUuZ2V0V2lkdGgoKSAtIDIsXG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==