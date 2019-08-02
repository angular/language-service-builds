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
        define("@angular/language-service/src/definitions", ["require", "exports", "typescript/lib/tsserverlibrary", "@angular/language-service/src/locate_symbol"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tss = require("typescript/lib/tsserverlibrary");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    function getDefinition(info) {
        var result = locate_symbol_1.locateSymbol(info);
        return result && result.symbol.definition;
    }
    exports.getDefinition = getDefinition;
    function ngLocationToTsDefinitionInfo(loc) {
        return {
            fileName: loc.fileName,
            textSpan: {
                start: loc.span.start,
                length: loc.span.end - loc.span.start,
            },
            // TODO(kyliau): Provide more useful info for name, kind and containerKind
            name: '',
            kind: tss.ScriptElementKind.unknown,
            containerName: loc.fileName,
            containerKind: tss.ScriptElementKind.unknown,
        };
    }
    exports.ngLocationToTsDefinitionInfo = ngLocationToTsDefinitionInfo;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILG9EQUFzRDtJQUd0RCw2RUFBNkM7SUFHN0MsU0FBZ0IsYUFBYSxDQUFDLElBQWtCO1FBQzlDLElBQU0sTUFBTSxHQUFHLDRCQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7SUFDNUMsQ0FBQztJQUhELHNDQUdDO0lBRUQsU0FBZ0IsNEJBQTRCLENBQUMsR0FBYTtRQUN4RCxPQUFPO1lBQ0wsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO1lBQ3RCLFFBQVEsRUFBRTtnQkFDUixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO2dCQUNyQixNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO2FBQ3RDO1lBQ0QsMEVBQTBFO1lBQzFFLElBQUksRUFBRSxFQUFFO1lBQ1IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPO1lBQ25DLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUTtZQUMzQixhQUFhLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLE9BQU87U0FDN0MsQ0FBQztJQUNKLENBQUM7SUFiRCxvRUFhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHNzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmltcG9ydCB7VGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbH0gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmaW5pdGlvbihpbmZvOiBUZW1wbGF0ZUluZm8pOiBMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJlc3VsdCA9IGxvY2F0ZVN5bWJvbChpbmZvKTtcbiAgcmV0dXJuIHJlc3VsdCAmJiByZXN1bHQuc3ltYm9sLmRlZmluaXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuZ0xvY2F0aW9uVG9Uc0RlZmluaXRpb25JbmZvKGxvYzogTG9jYXRpb24pOiB0c3MuRGVmaW5pdGlvbkluZm8ge1xuICByZXR1cm4ge1xuICAgIGZpbGVOYW1lOiBsb2MuZmlsZU5hbWUsXG4gICAgdGV4dFNwYW46IHtcbiAgICAgIHN0YXJ0OiBsb2Muc3Bhbi5zdGFydCxcbiAgICAgIGxlbmd0aDogbG9jLnNwYW4uZW5kIC0gbG9jLnNwYW4uc3RhcnQsXG4gICAgfSxcbiAgICAvLyBUT0RPKGt5bGlhdSk6IFByb3ZpZGUgbW9yZSB1c2VmdWwgaW5mbyBmb3IgbmFtZSwga2luZCBhbmQgY29udGFpbmVyS2luZFxuICAgIG5hbWU6ICcnLCAgLy8gc2hvdWxkIGJlIG5hbWUgb2Ygc3ltYm9sIGJ1dCB3ZSBkb24ndCBoYXZlIGVub3VnaCBpbmZvcm1hdGlvbiBoZXJlLlxuICAgIGtpbmQ6IHRzcy5TY3JpcHRFbGVtZW50S2luZC51bmtub3duLFxuICAgIGNvbnRhaW5lck5hbWU6IGxvYy5maWxlTmFtZSxcbiAgICBjb250YWluZXJLaW5kOiB0c3MuU2NyaXB0RWxlbWVudEtpbmQudW5rbm93bixcbiAgfTtcbn1cbiJdfQ==