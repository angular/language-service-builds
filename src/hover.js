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
    function getHover(info) {
        var symbolInfo = locate_symbol_1.locateSymbol(info);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNkVBQTZDO0lBRTdDLGtEQUFrRDtJQUNsRCxJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlFLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFbkYsU0FBZ0IsUUFBUSxDQUFDLElBQWtCO1FBQ3pDLElBQU0sVUFBVSxHQUFHLDRCQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE9BQU87U0FDUjtRQUNNLElBQUEsMEJBQU0sRUFBRSxzQkFBSSxDQUFlO1FBQ2xDLElBQU0scUJBQXFCLEdBQTJCLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwRTtnQkFDRSxFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUM7Z0JBQzFELEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2FBQy9CLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQztRQUNQLE9BQU87WUFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQTRCO1lBQ3pDLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLFFBQVEsRUFBRTtnQkFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLO2FBQzlCO1lBQ0QsOERBQThEO1lBQzlELDBFQUEwRTtZQUMxRSx3Q0FBd0M7WUFDeEMsWUFBWTtnQkFDVixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUM7Z0JBQ3RFLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7ZUFBSyxxQkFBcUI7Z0JBQ3pGLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUM7Y0FHdkM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQTlCRCw0QkE4QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtUZW1wbGF0ZUluZm99IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7bG9jYXRlU3ltYm9sfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuXG4vLyBSZXZlcnNlIG1hcHBpbmdzIG9mIGVudW0gd291bGQgZ2VuZXJhdGUgc3RyaW5nc1xuY29uc3QgU1lNQk9MX1NQQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5zcGFjZV07XG5jb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SG92ZXIoaW5mbzogVGVtcGxhdGVJbmZvKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2woaW5mbyk7XG4gIGlmICghc3ltYm9sSW5mbykge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7c3ltYm9sLCBzcGFufSA9IHN5bWJvbEluZm87XG4gIGNvbnN0IGNvbnRhaW5lckRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSA9IHN5bWJvbC5jb250YWluZXIgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogc3ltYm9sLmNvbnRhaW5lci5uYW1lLCBraW5kOiBzeW1ib2wuY29udGFpbmVyLmtpbmR9LFxuICAgICAgICB7dGV4dDogJy4nLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHN5bWJvbC5raW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgIGtpbmRNb2RpZmllcnM6ICcnLCAgLy8ga2luZE1vZGlmaWVyIGluZm8gbm90IGF2YWlsYWJsZSBvbiAnbmcuU3ltYm9sJ1xuICAgIHRleHRTcGFuOiB7XG4gICAgICBzdGFydDogc3Bhbi5zdGFydCxcbiAgICAgIGxlbmd0aDogc3Bhbi5lbmQgLSBzcGFuLnN0YXJ0LFxuICAgIH0sXG4gICAgLy8gdGhpcyB3b3VsZCBnZW5lcmF0ZSBhIHN0cmluZyBsaWtlICcocHJvcGVydHkpIENsYXNzWC5wcm9wWSdcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSwge3RleHQ6IHN5bWJvbC5raW5kLCBraW5kOiBzeW1ib2wua2luZH0sXG4gICAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sIC4uLmNvbnRhaW5lckRpc3BsYXlQYXJ0cyxcbiAgICAgIHt0ZXh0OiBzeW1ib2wubmFtZSwga2luZDogc3ltYm9sLmtpbmR9LFxuICAgICAgLy8gVE9ETzogQXBwZW5kIHR5cGUgaW5mbyBhcyB3ZWxsLCBidXQgU3ltYm9sIGRvZXNuJ3QgZXhwb3NlIHRoYXQhXG4gICAgICAvLyBJZGVhbGx5IGhvdmVyIHRleHQgc2hvdWxkIGJlIGxpa2UgJyhwcm9wZXJ0eSkgQ2xhc3NYLnByb3BZOiBzdHJpbmcnXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==