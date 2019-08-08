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
        define("@angular/language-service/src/definitions", ["require", "exports", "typescript", "@angular/language-service/src/locate_symbol"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript"); // used as value and is provided at runtime
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
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
    function getDefinitionAndBoundSpan(info) {
        var symbolInfo = locate_symbol_1.locateSymbol(info);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQyxDQUFDLDJDQUEyQztJQUU3RSw2RUFBNkM7SUFHN0M7Ozs7T0FJRztJQUNILFNBQVMsa0JBQWtCLENBQUMsSUFBVTtRQUNwQyxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBZ0IseUJBQXlCLENBQUMsSUFBa0I7UUFFMUQsSUFBTSxVQUFVLEdBQUcsNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTztTQUNSO1FBQ0QsSUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUEsMEJBQU0sQ0FBZTtRQUNyQixJQUFBLDRCQUFTLEVBQUUsNkJBQXFCLENBQVc7UUFDbEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7WUFDbkMsMEVBQTBFO1lBQzFFLDRFQUE0RTtZQUM1RSxPQUFPLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQztTQUNuQjtRQUNELElBQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUNoRixJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxJQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQUMsUUFBUTtZQUN6QyxPQUFPO2dCQUNMLElBQUksRUFBRSxNQUFNLENBQUMsSUFBNEI7Z0JBQ3pDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtnQkFDakIsYUFBYSxFQUFFLGFBQXFDO2dCQUNwRCxhQUFhLEVBQUUsYUFBYTtnQkFDNUIsUUFBUSxFQUFFLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQzNDLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUTthQUM1QixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPO1lBQ0gsV0FBVyxhQUFBLEVBQUUsUUFBUSxVQUFBO1NBQ3hCLENBQUM7SUFDSixDQUFDO0lBN0JELDhEQTZCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7IC8vIHVzZWQgYXMgdmFsdWUgYW5kIGlzIHByb3ZpZGVkIGF0IHJ1bnRpbWVcbmltcG9ydCB7VGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbH0gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7U3Bhbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQ29udmVydCBBbmd1bGFyIFNwYW4gdG8gVHlwZVNjcmlwdCBUZXh0U3Bhbi4gQW5ndWxhciBTcGFuIGhhcyAnc3RhcnQnIGFuZFxuICogJ2VuZCcgd2hlcmVhcyBUUyBUZXh0U3BhbiBoYXMgJ3N0YXJ0JyBhbmQgJ2xlbmd0aCcuXG4gKiBAcGFyYW0gc3BhbiBBbmd1bGFyIFNwYW5cbiAqL1xuZnVuY3Rpb24gbmdTcGFuVG9Uc1RleHRTcGFuKHNwYW46IFNwYW4pOiB0cy5UZXh0U3BhbiB7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IHNwYW4uc3RhcnQsXG4gICAgbGVuZ3RoOiBzcGFuLmVuZCAtIHNwYW4uc3RhcnQsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKGluZm86IFRlbXBsYXRlSW5mbyk6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2woaW5mbyk7XG4gIGlmICghc3ltYm9sSW5mbykge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB0ZXh0U3BhbiA9IG5nU3BhblRvVHNUZXh0U3BhbihzeW1ib2xJbmZvLnNwYW4pO1xuICBjb25zdCB7c3ltYm9sfSA9IHN5bWJvbEluZm87XG4gIGNvbnN0IHtjb250YWluZXIsIGRlZmluaXRpb246IGxvY2F0aW9uc30gPSBzeW1ib2w7XG4gIGlmICghbG9jYXRpb25zIHx8ICFsb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgLy8gc3ltYm9sLmRlZmluaXRpb24gaXMgcmVhbGx5IHRoZSBsb2NhdGlvbnMgb2YgdGhlIHN5bWJvbC4gVGhlcmUgY291bGQgYmVcbiAgICAvLyBtb3JlIHRoYW4gb25lLiBObyBtZWFuaW5nZnVsIGluZm8gY291bGQgYmUgcHJvdmlkZWQgd2l0aG91dCBhbnkgbG9jYXRpb24uXG4gICAgcmV0dXJuIHt0ZXh0U3Bhbn07XG4gIH1cbiAgY29uc3QgY29udGFpbmVyS2luZCA9IGNvbnRhaW5lciA/IGNvbnRhaW5lci5raW5kIDogdHMuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bjtcbiAgY29uc3QgY29udGFpbmVyTmFtZSA9IGNvbnRhaW5lciA/IGNvbnRhaW5lci5uYW1lIDogJyc7XG4gIGNvbnN0IGRlZmluaXRpb25zID0gbG9jYXRpb25zLm1hcCgobG9jYXRpb24pID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgIGNvbnRhaW5lcktpbmQ6IGNvbnRhaW5lcktpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBjb250YWluZXJOYW1lOiBjb250YWluZXJOYW1lLFxuICAgICAgdGV4dFNwYW46IG5nU3BhblRvVHNUZXh0U3Bhbihsb2NhdGlvbi5zcGFuKSxcbiAgICAgIGZpbGVOYW1lOiBsb2NhdGlvbi5maWxlTmFtZSxcbiAgICB9O1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICAgIGRlZmluaXRpb25zLCB0ZXh0U3BhbixcbiAgfTtcbn1cbiJdfQ==