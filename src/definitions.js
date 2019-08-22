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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQyxDQUFDLDJDQUEyQztJQUU3RSw2RUFBNkM7SUFHN0M7Ozs7T0FJRztJQUNILFNBQVMsa0JBQWtCLENBQUMsSUFBVTtRQUNwQyxPQUFPO1lBQ0wsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQix5QkFBeUIsQ0FDckMsSUFBZSxFQUFFLFFBQWdCO1FBQ25DLElBQU0sVUFBVSxHQUFHLDRCQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFDRCxJQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBQSwwQkFBTSxDQUFlO1FBQ3JCLElBQUEsNEJBQVMsRUFBRSw2QkFBcUIsQ0FBVztRQUNsRCxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtZQUNuQywwRUFBMEU7WUFDMUUsNEVBQTRFO1lBQzVFLE9BQU8sRUFBQyxRQUFRLFVBQUEsRUFBQyxDQUFDO1NBQ25CO1FBQ0QsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQ2hGLElBQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RELElBQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBQyxRQUFRO1lBQ3pDLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUE0QjtnQkFDekMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2dCQUNqQixhQUFhLEVBQUUsYUFBcUM7Z0JBQ3BELGFBQWEsRUFBRSxhQUFhO2dCQUM1QixRQUFRLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDM0MsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO2FBQzVCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU87WUFDSCxXQUFXLGFBQUEsRUFBRSxRQUFRLFVBQUE7U0FDeEIsQ0FBQztJQUNKLENBQUM7SUE3QkQsOERBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JzsgLy8gdXNlZCBhcyB2YWx1ZSBhbmQgaXMgcHJvdmlkZWQgYXQgcnVudGltZVxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7bG9jYXRlU3ltYm9sfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuaW1wb3J0IHtTcGFufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBDb252ZXJ0IEFuZ3VsYXIgU3BhbiB0byBUeXBlU2NyaXB0IFRleHRTcGFuLiBBbmd1bGFyIFNwYW4gaGFzICdzdGFydCcgYW5kXG4gKiAnZW5kJyB3aGVyZWFzIFRTIFRleHRTcGFuIGhhcyAnc3RhcnQnIGFuZCAnbGVuZ3RoJy5cbiAqIEBwYXJhbSBzcGFuIEFuZ3VsYXIgU3BhblxuICovXG5mdW5jdGlvbiBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3BhbjogU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgcmV0dXJuIHtcbiAgICBzdGFydDogc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IHNwYW4uZW5kIC0gc3Bhbi5zdGFydCxcbiAgfTtcbn1cblxuLyoqXG4gKiBUcmF2ZXJzZSB0aGUgdGVtcGxhdGUgQVNUIGFuZCBsb29rIGZvciB0aGUgc3ltYm9sIGxvY2F0ZWQgYXQgYHBvc2l0aW9uYCwgdGhlblxuICogcmV0dXJuIGl0cyBkZWZpbml0aW9uIGFuZCBzcGFuIG9mIGJvdW5kIHRleHQuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIHBvc2l0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZpbml0aW9uQW5kQm91bmRTcGFuKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2woaW5mbywgcG9zaXRpb24pO1xuICBpZiAoIXN5bWJvbEluZm8pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgdGV4dFNwYW4gPSBuZ1NwYW5Ub1RzVGV4dFNwYW4oc3ltYm9sSW5mby5zcGFuKTtcbiAgY29uc3Qge3N5bWJvbH0gPSBzeW1ib2xJbmZvO1xuICBjb25zdCB7Y29udGFpbmVyLCBkZWZpbml0aW9uOiBsb2NhdGlvbnN9ID0gc3ltYm9sO1xuICBpZiAoIWxvY2F0aW9ucyB8fCAhbG9jYXRpb25zLmxlbmd0aCkge1xuICAgIC8vIHN5bWJvbC5kZWZpbml0aW9uIGlzIHJlYWxseSB0aGUgbG9jYXRpb25zIG9mIHRoZSBzeW1ib2wuIFRoZXJlIGNvdWxkIGJlXG4gICAgLy8gbW9yZSB0aGFuIG9uZS4gTm8gbWVhbmluZ2Z1bCBpbmZvIGNvdWxkIGJlIHByb3ZpZGVkIHdpdGhvdXQgYW55IGxvY2F0aW9uLlxuICAgIHJldHVybiB7dGV4dFNwYW59O1xuICB9XG4gIGNvbnN0IGNvbnRhaW5lcktpbmQgPSBjb250YWluZXIgPyBjb250YWluZXIua2luZCA6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd247XG4gIGNvbnN0IGNvbnRhaW5lck5hbWUgPSBjb250YWluZXIgPyBjb250YWluZXIubmFtZSA6ICcnO1xuICBjb25zdCBkZWZpbml0aW9ucyA9IGxvY2F0aW9ucy5tYXAoKGxvY2F0aW9uKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IHN5bWJvbC5raW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICBjb250YWluZXJLaW5kOiBjb250YWluZXJLaW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgY29udGFpbmVyTmFtZTogY29udGFpbmVyTmFtZSxcbiAgICAgIHRleHRTcGFuOiBuZ1NwYW5Ub1RzVGV4dFNwYW4obG9jYXRpb24uc3BhbiksXG4gICAgICBmaWxlTmFtZTogbG9jYXRpb24uZmlsZU5hbWUsXG4gICAgfTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgICBkZWZpbml0aW9ucywgdGV4dFNwYW4sXG4gIH07XG59XG4iXX0=