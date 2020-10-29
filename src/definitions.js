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
        define("@angular/language-service/src/definitions", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/locate_symbol"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getDefinitionAndBoundSpan = void 0;
    var tslib_1 = require("tslib");
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDLENBQUUsMkNBQTJDO0lBRTlFLDZFQUE4QztJQUc5Qzs7OztPQUlHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxJQUFVO1FBQ3BDLE9BQU87WUFDTCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUs7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLHlCQUF5QixDQUNyQyxJQUFlLEVBQUUsUUFBZ0I7O1FBQ25DLElBQU0sT0FBTyxHQUFHLDZCQUFhLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO1lBQ25CLE9BQU87U0FDUjtRQUVELElBQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDL0IsSUFBTSxXQUFXLEdBQXdCLEVBQUUsQ0FBQzs7WUFDNUMsS0FBeUIsSUFBQSxZQUFBLGlCQUFBLE9BQU8sQ0FBQSxnQ0FBQSxxREFBRTtnQkFBN0IsSUFBTSxVQUFVLG9CQUFBO2dCQUNaLElBQUEsTUFBTSxHQUFJLFVBQVUsT0FBZCxDQUFlO2dCQUU1QiwwRUFBMEU7Z0JBQzFFLDRFQUE0RTtnQkFDckUsSUFBQSxJQUFJLEdBQTRDLE1BQU0sS0FBbEQsRUFBRSxNQUFJLEdBQXNDLE1BQU0sS0FBNUMsRUFBRSxTQUFTLEdBQTJCLE1BQU0sVUFBakMsRUFBYyxTQUFTLEdBQUksTUFBTSxXQUFWLENBQVc7Z0JBQzlELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO29CQUNuQyxTQUFTO2lCQUNWO2dCQUVELElBQU0sYUFBYSxHQUNmLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7Z0JBQ3RGLElBQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOztvQkFFdEQsS0FBK0IsSUFBQSw2QkFBQSxpQkFBQSxTQUFTLENBQUEsQ0FBQSxvQ0FBQSwyREFBRTt3QkFBL0IsSUFBQSx3QkFBZ0IsRUFBZixRQUFRLGNBQUEsRUFBRSxJQUFJLFVBQUE7d0JBQ3hCLElBQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUMxQyw0RkFBNEY7d0JBQzVGLDhCQUE4Qjt3QkFDOUIsd0JBQXdCO3dCQUN4Qiw4RkFBOEY7d0JBQzlGLDZGQUE2Rjt3QkFDN0Ysc0RBQXNEO3dCQUN0RCxJQUFNLFNBQVMsR0FBTSxRQUFRLENBQUMsS0FBSyxTQUFJLFFBQVEsQ0FBQyxNQUFNLFNBQUksUUFBVSxDQUFDO3dCQUNyRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDOzRCQUFFLFNBQVM7d0JBRWxDLFdBQVcsQ0FBQyxJQUFJLENBQUM7NEJBQ2YsSUFBSSxFQUFFLElBQTRCOzRCQUNsQyxJQUFJLFFBQUE7NEJBQ0osYUFBYSxlQUFBOzRCQUNiLGFBQWEsZUFBQTs0QkFDYixRQUFRLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFDOzRCQUNsQyxRQUFRLEVBQUUsUUFBUTt5QkFDbkIsQ0FBQyxDQUFDO3dCQUNILElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7cUJBQ3JCOzs7Ozs7Ozs7YUFDRjs7Ozs7Ozs7O1FBRUQsT0FBTztZQUNMLFdBQVcsYUFBQTtZQUNYLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtTQUMxQixDQUFDO0lBQ0osQ0FBQztJQWxERCw4REFrREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7ICAvLyB1c2VkIGFzIHZhbHVlIGFuZCBpcyBwcm92aWRlZCBhdCBydW50aW1lXG5cbmltcG9ydCB7bG9jYXRlU3ltYm9sc30gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7QXN0UmVzdWx0LCBTcGFufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDb252ZXJ0IEFuZ3VsYXIgU3BhbiB0byBUeXBlU2NyaXB0IFRleHRTcGFuLiBBbmd1bGFyIFNwYW4gaGFzICdzdGFydCcgYW5kXG4gKiAnZW5kJyB3aGVyZWFzIFRTIFRleHRTcGFuIGhhcyAnc3RhcnQnIGFuZCAnbGVuZ3RoJy5cbiAqIEBwYXJhbSBzcGFuIEFuZ3VsYXIgU3BhblxuICovXG5mdW5jdGlvbiBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3BhbjogU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IHNwYW4uZW5kIC0gc3Bhbi5zdGFydCxcbiAgfTtcbn1cblxuLyoqXG4gKiBUcmF2ZXJzZSB0aGUgdGVtcGxhdGUgQVNUIGFuZCBsb29rIGZvciB0aGUgc3ltYm9sIGxvY2F0ZWQgYXQgYHBvc2l0aW9uYCwgdGhlblxuICogcmV0dXJuIGl0cyBkZWZpbml0aW9uIGFuZCBzcGFuIG9mIGJvdW5kIHRleHQuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbHMgPSBsb2NhdGVTeW1ib2xzKGluZm8sIHBvc2l0aW9uKTtcbiAgaWYgKCFzeW1ib2xzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZGVmaW5pdGlvbnM6IHRzLkRlZmluaXRpb25JbmZvW10gPSBbXTtcbiAgZm9yIChjb25zdCBzeW1ib2xJbmZvIG9mIHN5bWJvbHMpIHtcbiAgICBjb25zdCB7c3ltYm9sfSA9IHN5bWJvbEluZm87XG5cbiAgICAvLyBzeW1ib2wuZGVmaW5pdGlvbiBpcyByZWFsbHkgdGhlIGxvY2F0aW9ucyBvZiB0aGUgc3ltYm9sLiBUaGVyZSBjb3VsZCBiZVxuICAgIC8vIG1vcmUgdGhhbiBvbmUuIE5vIG1lYW5pbmdmdWwgaW5mbyBjb3VsZCBiZSBwcm92aWRlZCB3aXRob3V0IGFueSBsb2NhdGlvbi5cbiAgICBjb25zdCB7a2luZCwgbmFtZSwgY29udGFpbmVyLCBkZWZpbml0aW9uOiBsb2NhdGlvbnN9ID0gc3ltYm9sO1xuICAgIGlmICghbG9jYXRpb25zIHx8ICFsb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBjb250YWluZXJLaW5kID1cbiAgICAgICAgY29udGFpbmVyID8gY29udGFpbmVyLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQgOiB0cy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duO1xuICAgIGNvbnN0IGNvbnRhaW5lck5hbWUgPSBjb250YWluZXIgPyBjb250YWluZXIubmFtZSA6ICcnO1xuXG4gICAgZm9yIChjb25zdCB7ZmlsZU5hbWUsIHNwYW59IG9mIGxvY2F0aW9ucykge1xuICAgICAgY29uc3QgdGV4dFNwYW4gPSBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3Bhbik7XG4gICAgICAvLyBJbiBjYXNlcyBsaWtlIHR3by13YXkgYmluZGluZ3MsIGEgcmVxdWVzdCBmb3IgdGhlIGRlZmluaXRpb25zIG9mIGFuIGV4cHJlc3Npb24gbWF5IHJldHVyblxuICAgICAgLy8gdHdvIG9mIHRoZSBzYW1lIGRlZmluaXRpb246XG4gICAgICAvLyAgICBbKG5nTW9kZWwpXT1cInByb3BcIlxuICAgICAgLy8gICAgICAgICAgICAgICAgIF5eXl4gIC0tIG9uZSBkZWZpbml0aW9uIGZvciB0aGUgcHJvcGVydHkgYmluZGluZywgb25lIGZvciB0aGUgZXZlbnQgYmluZGluZ1xuICAgICAgLy8gVG8gcHJ1bmUgZHVwbGljYXRlIGRlZmluaXRpb25zLCB0YWcgZGVmaW5pdGlvbnMgd2l0aCB1bmlxdWUgbG9jYXRpb24gc2lnbmF0dXJlcyBhbmQgaWdub3JlXG4gICAgICAvLyBkZWZpbml0aW9ucyB3aG9zZSBsb2NhdGlvbnMgaGF2ZSBhbHJlYWR5IGJlZW4gc2Vlbi5cbiAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGAke3RleHRTcGFuLnN0YXJ0fToke3RleHRTcGFuLmxlbmd0aH1AJHtmaWxlTmFtZX1gO1xuICAgICAgaWYgKHNlZW4uaGFzKHNpZ25hdHVyZSkpIGNvbnRpbnVlO1xuXG4gICAgICBkZWZpbml0aW9ucy5wdXNoKHtcbiAgICAgICAga2luZDoga2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgY29udGFpbmVyS2luZCxcbiAgICAgICAgY29udGFpbmVyTmFtZSxcbiAgICAgICAgdGV4dFNwYW46IG5nU3BhblRvVHNUZXh0U3BhbihzcGFuKSxcbiAgICAgICAgZmlsZU5hbWU6IGZpbGVOYW1lLFxuICAgICAgfSk7XG4gICAgICBzZWVuLmFkZChzaWduYXR1cmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZGVmaW5pdGlvbnMsXG4gICAgdGV4dFNwYW46IHN5bWJvbHNbMF0uc3BhbixcbiAgfTtcbn1cbiJdfQ==