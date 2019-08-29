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
        define("@angular/language-service/src/definitions", ["require", "exports", "path", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/template", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        var symbolInfo = locate_symbol_1.locateSymbol(info, position);
        if (!symbolInfo) {
            return;
        }
        var textSpan = ngSpanToTsTextSpan(symbolInfo.span);
        var symbol = symbolInfo.symbol;
        var container = symbol.container, locations = symbol.definition;
        if (!locations || !locations.length) {
            // symbol.definition is really the locations of the symbol. There could be
            // more than one. No meaningful info could be provided without any location.
            return { textSpan: textSpan };
        }
        var containerKind = container ? container.kind : ts.ScriptElementKind.unknown;
        var containerName = container ? container.name : '';
        var definitions = locations.map(function (location) {
            return {
                kind: symbol.kind,
                name: symbol.name,
                containerKind: containerKind,
                containerName: containerName,
                textSpan: ngSpanToTsTextSpan(location.span),
                fileName: location.fileName,
            };
        });
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
     * Currently applies to `templateUrl` properties.
     */
    function getUrlFromProperty(urlNode, tsLsHost) {
        var asgn = template_1.getPropertyAssignmentFromValue(urlNode);
        if (!asgn)
            return;
        // If the URL is not a property of a class decorator, don't generate definitions for it.
        if (!template_1.isClassDecoratorProperty(asgn))
            return;
        var sf = urlNode.getSourceFile();
        switch (asgn.name.getText()) {
            case 'templateUrl':
                // Extract definition of the template file specified by this `templateUrl` property.
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
            default:
                return undefined;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDJCQUE2QjtJQUM3QiwrQkFBaUMsQ0FBQywyQ0FBMkM7SUFFN0UsNkVBQTZDO0lBQzdDLG1FQUFvRjtJQUVwRiw2REFBeUM7SUFFekM7Ozs7T0FJRztJQUNILFNBQVMsa0JBQWtCLENBQUMsSUFBVTtRQUNwQyxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQix5QkFBeUIsQ0FDckMsSUFBZSxFQUFFLFFBQWdCO1FBQ25DLElBQU0sVUFBVSxHQUFHLDRCQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFDRCxJQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBQSwwQkFBTSxDQUFlO1FBQ3JCLElBQUEsNEJBQVMsRUFBRSw2QkFBcUIsQ0FBVztRQUNsRCxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtZQUNuQywwRUFBMEU7WUFDMUUsNEVBQTRFO1lBQzVFLE9BQU8sRUFBQyxRQUFRLFVBQUEsRUFBQyxDQUFDO1NBQ25CO1FBQ0QsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQ2hG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O1lBQ0o7Z0JBQ0UsT0FBTyxTQUFTLENBQUM7U0FDcEI7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHVzZWQgYXMgdmFsdWUgYW5kIGlzIHByb3ZpZGVkIGF0IHJ1bnRpbWVcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbH0gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7Z2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlLCBpc0NsYXNzRGVjb3JhdG9yUHJvcGVydHl9IGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0IHtTcGFuLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIENvbnZlcnQgQW5ndWxhciBTcGFuIHRvIFR5cGVTY3JpcHQgVGV4dFNwYW4uIEFuZ3VsYXIgU3BhbiBoYXMgJ3N0YXJ0JyBhbmRcbiAqICdlbmQnIHdoZXJlYXMgVFMgVGV4dFNwYW4gaGFzICdzdGFydCcgYW5kICdsZW5ndGgnLlxuICogQHBhcmFtIHNwYW4gQW5ndWxhciBTcGFuXG4gKi9cbmZ1bmN0aW9uIG5nU3BhblRvVHNUZXh0U3BhbihzcGFuOiBTcGFuKTogdHMuVGV4dFNwYW4ge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBzcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogc3Bhbi5lbmQgLSBzcGFuLnN0YXJ0LFxuICB9O1xufVxuXG4vKipcbiAqIFRyYXZlcnNlIHRoZSB0ZW1wbGF0ZSBBU1QgYW5kIGxvb2sgZm9yIHRoZSBzeW1ib2wgbG9jYXRlZCBhdCBgcG9zaXRpb25gLCB0aGVuXG4gKiByZXR1cm4gaXRzIGRlZmluaXRpb24gYW5kIHNwYW4gb2YgYm91bmQgdGV4dC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gcG9zaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9sSW5mbyA9IGxvY2F0ZVN5bWJvbChpbmZvLCBwb3NpdGlvbik7XG4gIGlmICghc3ltYm9sSW5mbykge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0ZXh0U3BhbiA9IG5nU3BhblRvVHNUZXh0U3BhbihzeW1ib2xJbmZvLnNwYW4pO1xuICBjb25zdCB7c3ltYm9sfSA9IHN5bWJvbEluZm87XG4gIGNvbnN0IHtjb250YWluZXIsIGRlZmluaXRpb246IGxvY2F0aW9uc30gPSBzeW1ib2w7XG4gIGlmICghbG9jYXRpb25zIHx8ICFsb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgLy8gc3ltYm9sLmRlZmluaXRpb24gaXMgcmVhbGx5IHRoZSBsb2NhdGlvbnMgb2YgdGhlIHN5bWJvbC4gVGhlcmUgY291bGQgYmVcbiAgICAvLyBtb3JlIHRoYW4gb25lLiBObyBtZWFuaW5nZnVsIGluZm8gY291bGQgYmUgcHJvdmlkZWQgd2l0aG91dCBhbnkgbG9jYXRpb24uXG4gICAgcmV0dXJuIHt0ZXh0U3Bhbn07XG4gIH1cbiAgY29uc3QgY29udGFpbmVyS2luZCA9IGNvbnRhaW5lciA/IGNvbnRhaW5lci5raW5kIDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgY29uc3QgY29udGFpbmVyTmFtZSA9IGNvbnRhaW5lciA/IGNvbnRhaW5lci5uYW1lIDogJyc7XG4gIGNvbnN0IGRlZmluaXRpb25zID0gbG9jYXRpb25zLm1hcCgobG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgIGNvbnRhaW5lcktpbmQ6IGNvbnRhaW5lcktpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBjb250YWluZXJOYW1lOiBjb250YWluZXJOYW1lLFxuICAgICAgdGV4dFNwYW46IG5nU3BhblRvVHNUZXh0U3Bhbihsb2NhdGlvbi5zcGFuKSxcbiAgICAgIGZpbGVOYW1lOiBsb2NhdGlvbi5maWxlTmFtZSxcbiAgICB9O1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICAgIGRlZmluaXRpb25zLCB0ZXh0U3BhbixcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXRzIGFuIEFuZ3VsYXItc3BlY2lmaWMgZGVmaW5pdGlvbiBpbiBhIFR5cGVTY3JpcHQgc291cmNlIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgdHNMc0hvc3Q6IFJlYWRvbmx5PHRzLkxhbmd1YWdlU2VydmljZUhvc3Q+KTogdHMuRGVmaW5pdGlvbkluZm9BbmRCb3VuZFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKCFub2RlKSByZXR1cm47XG4gIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsOlxuICAgICAgLy8gQXR0ZW1wdCB0byBleHRyYWN0IGRlZmluaXRpb24gb2YgYSBVUkwgaW4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50LlxuICAgICAgcmV0dXJuIGdldFVybEZyb21Qcm9wZXJ0eShub2RlIGFzIHRzLlN0cmluZ0xpdGVyYWxMaWtlLCB0c0xzSG9zdCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBnZXQgdGhlIGRlZmluaXRpb24gb2YgYSBmaWxlIHdob3NlIFVSTCBpcyBzcGVjaWZpZWQgaW4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50IGluIGFcbiAqIGRpcmVjdGl2ZSBkZWNvcmF0b3IuXG4gKiBDdXJyZW50bHkgYXBwbGllcyB0byBgdGVtcGxhdGVVcmxgIHByb3BlcnRpZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFVybEZyb21Qcm9wZXJ0eShcbiAgICB1cmxOb2RlOiB0cy5TdHJpbmdMaXRlcmFsTGlrZSxcbiAgICB0c0xzSG9zdDogUmVhZG9ubHk8dHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdD4pOiB0cy5EZWZpbml0aW9uSW5mb0FuZEJvdW5kU3Bhbnx1bmRlZmluZWQge1xuICBjb25zdCBhc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKHVybE5vZGUpO1xuICBpZiAoIWFzZ24pIHJldHVybjtcbiAgLy8gSWYgdGhlIFVSTCBpcyBub3QgYSBwcm9wZXJ0eSBvZiBhIGNsYXNzIGRlY29yYXRvciwgZG9uJ3QgZ2VuZXJhdGUgZGVmaW5pdGlvbnMgZm9yIGl0LlxuICBpZiAoIWlzQ2xhc3NEZWNvcmF0b3JQcm9wZXJ0eShhc2duKSkgcmV0dXJuO1xuXG4gIGNvbnN0IHNmID0gdXJsTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gIHN3aXRjaCAoYXNnbi5uYW1lLmdldFRleHQoKSkge1xuICAgIGNhc2UgJ3RlbXBsYXRlVXJsJzpcbiAgICAgIC8vIEV4dHJhY3QgZGVmaW5pdGlvbiBvZiB0aGUgdGVtcGxhdGUgZmlsZSBzcGVjaWZpZWQgYnkgdGhpcyBgdGVtcGxhdGVVcmxgIHByb3BlcnR5LlxuICAgICAgY29uc3QgdXJsID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShzZi5maWxlTmFtZSksIHVybE5vZGUudGV4dCk7XG5cbiAgICAgIC8vIElmIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0LCBiYWlsLiBJdCBpcyBwb3NzaWJsZSB0aGF0IHRoZSBUeXBlU2NyaXB0IGxhbmd1YWdlIHNlcnZpY2UgaG9zdFxuICAgICAgLy8gZG9lcyBub3QgaGF2ZSBhIGBmaWxlRXhpc3RzYCBtZXRob2QsIGluIHdoaWNoIGNhc2Ugb3B0aW1pc3RpY2FsbHkgYXNzdW1lIHRoZSBmaWxlIGV4aXN0cy5cbiAgICAgIGlmICh0c0xzSG9zdC5maWxlRXhpc3RzICYmICF0c0xzSG9zdC5maWxlRXhpc3RzKHVybCkpIHJldHVybjtcblxuICAgICAgY29uc3QgdGVtcGxhdGVEZWZpbml0aW9uczogdHMuRGVmaW5pdGlvbkluZm9bXSA9IFt7XG4gICAgICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmV4dGVybmFsTW9kdWxlTmFtZSxcbiAgICAgICAgbmFtZTogdXJsLFxuICAgICAgICBjb250YWluZXJLaW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgICAgICBjb250YWluZXJOYW1lOiAnJyxcbiAgICAgICAgLy8gUmVhZGluZyB0aGUgdGVtcGxhdGUgaXMgZXhwZW5zaXZlLCBzbyBkb24ndCBwcm92aWRlIGEgcHJldmlldy5cbiAgICAgICAgdGV4dFNwYW46IHtzdGFydDogMCwgbGVuZ3RoOiAwfSxcbiAgICAgICAgZmlsZU5hbWU6IHVybCxcbiAgICAgIH1dO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZWZpbml0aW9uczogdGVtcGxhdGVEZWZpbml0aW9ucyxcbiAgICAgICAgdGV4dFNwYW46IHtcbiAgICAgICAgICAvLyBFeGNsdWRlIG9wZW5pbmcgYW5kIGNsb3NpbmcgcXVvdGVzIGluIHRoZSB1cmwgc3Bhbi5cbiAgICAgICAgICBzdGFydDogdXJsTm9kZS5nZXRTdGFydCgpICsgMSxcbiAgICAgICAgICBsZW5ndGg6IHVybE5vZGUuZ2V0V2lkdGgoKSAtIDIsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG4iXX0=