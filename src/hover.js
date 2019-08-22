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
        define("@angular/language-service/src/hover", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/locate_symbol"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    // Reverse mappings of enum would generate strings
    var SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    var SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    /**
     * Traverse the template AST and look for the symbol located at `position`, then
     * return the corresponding quick info.
     * @param info template AST
     * @param position location of the symbol
     */
    function getHover(info, position) {
        var symbolInfo = locate_symbol_1.locateSymbol(info, position);
        if (!symbolInfo) {
            return;
        }
        var symbol = symbolInfo.symbol, span = symbolInfo.span;
        var containerDisplayParts = symbol.container ?
            [
                { text: symbol.container.name, kind: symbol.container.kind },
                { text: '.', kind: SYMBOL_PUNC },
            ] :
            [];
        return {
            kind: symbol.kind,
            kindModifiers: '',
            textSpan: {
                start: span.start,
                length: span.end - span.start,
            },
            // this would generate a string like '(property) ClassX.propY'
            // 'kind' in displayParts does not really matter because it's dropped when
            // displayParts get converted to string.
            displayParts: tslib_1.__spread([
                { text: '(', kind: SYMBOL_PUNC }, { text: symbol.kind, kind: symbol.kind },
                { text: ')', kind: SYMBOL_PUNC }, { text: ' ', kind: SYMBOL_SPACE }
            ], containerDisplayParts, [
                { text: symbol.name, kind: symbol.kind },
            ]),
        };
    }
    exports.getHover = getHover;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNkVBQTZDO0lBRTdDLGtEQUFrRDtJQUNsRCxJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlFLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFbkY7Ozs7O09BS0c7SUFDSCxTQUFnQixRQUFRLENBQUMsSUFBZSxFQUFFLFFBQWdCO1FBQ3hELElBQU0sVUFBVSxHQUFHLDRCQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFDTSxJQUFBLDBCQUFNLEVBQUUsc0JBQUksQ0FBZTtRQUNsQyxJQUFNLHFCQUFxQixHQUEyQixNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEU7Z0JBQ0UsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFDO2dCQUMxRCxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQzthQUMvQixDQUFDLENBQUM7WUFDSCxFQUFFLENBQUM7UUFDUCxPQUFPO1lBQ0wsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUE0QjtZQUN6QyxhQUFhLEVBQUUsRUFBRTtZQUNqQixRQUFRLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSzthQUM5QjtZQUNELDhEQUE4RDtZQUM5RCwwRUFBMEU7WUFDMUUsd0NBQXdDO1lBQ3hDLFlBQVk7Z0JBQ1YsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFDO2dCQUN0RSxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFDO2VBQUsscUJBQXFCO2dCQUN6RixFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFDO2NBR3ZDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUE5QkQsNEJBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbH0gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcblxuLy8gUmV2ZXJzZSBtYXBwaW5ncyBvZiBlbnVtIHdvdWxkIGdlbmVyYXRlIHN0cmluZ3NcbmNvbnN0IFNZTUJPTF9TUEFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuc3BhY2VdO1xuY29uc3QgU1lNQk9MX1BVTkMgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnB1bmN0dWF0aW9uXTtcblxuLyoqXG4gKiBUcmF2ZXJzZSB0aGUgdGVtcGxhdGUgQVNUIGFuZCBsb29rIGZvciB0aGUgc3ltYm9sIGxvY2F0ZWQgYXQgYHBvc2l0aW9uYCwgdGhlblxuICogcmV0dXJuIHRoZSBjb3JyZXNwb25kaW5nIHF1aWNrIGluZm8uXG4gKiBAcGFyYW0gaW5mbyB0ZW1wbGF0ZSBBU1RcbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiBvZiB0aGUgc3ltYm9sXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIb3ZlcihpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9sSW5mbyA9IGxvY2F0ZVN5bWJvbChpbmZvLCBwb3NpdGlvbik7XG4gIGlmICghc3ltYm9sSW5mbykge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7c3ltYm9sLCBzcGFufSA9IHN5bWJvbEluZm87XG4gIGNvbnN0IGNvbnRhaW5lckRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSA9IHN5bWJvbC5jb250YWluZXIgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogc3ltYm9sLmNvbnRhaW5lci5uYW1lLCBraW5kOiBzeW1ib2wuY29udGFpbmVyLmtpbmR9LFxuICAgICAgICB7dGV4dDogJy4nLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHN5bWJvbC5raW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgIGtpbmRNb2RpZmllcnM6ICcnLCAgLy8ga2luZE1vZGlmaWVyIGluZm8gbm90IGF2YWlsYWJsZSBvbiAnbmcuU3ltYm9sJ1xuICAgIHRleHRTcGFuOiB7XG4gICAgICBzdGFydDogc3Bhbi5zdGFydCxcbiAgICAgIGxlbmd0aDogc3Bhbi5lbmQgLSBzcGFuLnN0YXJ0LFxuICAgIH0sXG4gICAgLy8gdGhpcyB3b3VsZCBnZW5lcmF0ZSBhIHN0cmluZyBsaWtlICcocHJvcGVydHkpIENsYXNzWC5wcm9wWSdcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSwge3RleHQ6IHN5bWJvbC5raW5kLCBraW5kOiBzeW1ib2wua2luZH0sXG4gICAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sIC4uLmNvbnRhaW5lckRpc3BsYXlQYXJ0cyxcbiAgICAgIHt0ZXh0OiBzeW1ib2wubmFtZSwga2luZDogc3ltYm9sLmtpbmR9LFxuICAgICAgLy8gVE9ETzogQXBwZW5kIHR5cGUgaW5mbyBhcyB3ZWxsLCBidXQgU3ltYm9sIGRvZXNuJ3QgZXhwb3NlIHRoYXQhXG4gICAgICAvLyBJZGVhbGx5IGhvdmVyIHRleHQgc2hvdWxkIGJlIGxpa2UgJyhwcm9wZXJ0eSkgQ2xhc3NYLnByb3BZOiBzdHJpbmcnXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==