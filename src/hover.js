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
        define("@angular/language-service/src/hover", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var utils_1 = require("@angular/language-service/src/utils");
    // Reverse mappings of enum would generate strings
    var SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    var SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    var SYMBOL_CLASS = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.className];
    var SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
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
    /**
     * Get quick info for Angular semantic entities in TypeScript files, like Directives.
     * @param sf TypeScript source file an Angular symbol is in
     * @param position location of the symbol in the source file
     * @param host Language Service host to query
     */
    function getTsHover(sf, position, host) {
        var node = utils_1.findTightestNode(sf, position);
        if (!node)
            return;
        switch (node.kind) {
            case ts.SyntaxKind.Identifier:
                return getDirectiveModule(node, host);
            default:
                break;
        }
        return undefined;
    }
    exports.getTsHover = getTsHover;
    /**
     * Attempts to get quick info for the NgModule a Directive is declared in.
     * @param directive identifier on a potential Directive class declaration
     * @param host Language Service host to query
     */
    function getDirectiveModule(directive, host) {
        if (!ts.isClassDeclaration(directive.parent))
            return;
        var directiveName = directive.text;
        var directiveSymbol = host.getStaticSymbol(directive.getSourceFile().fileName, directiveName);
        if (!directiveSymbol)
            return;
        var analyzedModules = host.getAnalyzedModules(false);
        var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(directiveSymbol);
        if (!ngModule)
            return;
        var moduleName = ngModule.type.reference.name;
        return {
            kind: ts.ScriptElementKind.classElement,
            kindModifiers: ts.ScriptElementKindModifier.none,
            textSpan: {
                start: directive.getStart(),
                length: directive.end - directive.getStart(),
            },
            // This generates a string like '(directive) NgModule.Directive: class'
            // 'kind' in displayParts does not really matter because it's dropped when
            // displayParts get converted to string.
            displayParts: [
                { text: '(', kind: SYMBOL_PUNC },
                { text: 'directive', kind: SYMBOL_TEXT },
                { text: ')', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: moduleName, kind: SYMBOL_CLASS },
                { text: '.', kind: SYMBOL_PUNC },
                { text: directiveName, kind: SYMBOL_CLASS },
                { text: ':', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: ts.ScriptElementKind.classElement, kind: SYMBOL_TEXT },
            ],
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNkVBQTZDO0lBRTdDLDZEQUF5QztJQUV6QyxrREFBa0Q7SUFDbEQsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5RSxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25GLElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEYsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUU1RTs7Ozs7T0FLRztJQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0I7UUFDeEQsSUFBTSxVQUFVLEdBQUcsNEJBQVksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE9BQU87U0FDUjtRQUNNLElBQUEsMEJBQU0sRUFBRSxzQkFBSSxDQUFlO1FBQ2xDLElBQU0scUJBQXFCLEdBQTJCLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwRTtnQkFDRSxFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUM7Z0JBQzFELEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJ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LEVBQUUsV0FBVyxFQUFDO2dCQUN0QyxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQy9CLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFDO2dCQUN0QyxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQ3pDLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2FBQzdEO1NBQ0YsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7bG9jYXRlU3ltYm9sfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZX0gZnJvbSAnLi91dGlscyc7XG5cbi8vIFJldmVyc2UgbWFwcGluZ3Mgb2YgZW51bSB3b3VsZCBnZW5lcmF0ZSBzdHJpbmdzXG5jb25zdCBTWU1CT0xfU1BBQ0UgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnNwYWNlXTtcbmNvbnN0IFNZTUJPTF9QVU5DID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5wdW5jdHVhdGlvbl07XG5jb25zdCBTWU1CT0xfQ0xBU1MgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLmNsYXNzTmFtZV07XG5jb25zdCBTWU1CT0xfVEVYVCA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQudGV4dF07XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiB0aGUgY29ycmVzcG9uZGluZyBxdWljayBpbmZvLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SG92ZXIoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2woaW5mbywgcG9zaXRpb24pO1xuICBpZiAoIXN5bWJvbEluZm8pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge3N5bWJvbCwgc3Bhbn0gPSBzeW1ib2xJbmZvO1xuICBjb25zdCBjb250YWluZXJEaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10gPSBzeW1ib2wuY29udGFpbmVyID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6IHN5bWJvbC5jb250YWluZXIubmFtZSwga2luZDogc3ltYm9sLmNvbnRhaW5lci5raW5kfSxcbiAgICAgICAge3RleHQ6ICcuJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgXSA6XG4gICAgICBbXTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBzeW1ib2wua2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICBraW5kTW9kaWZpZXJzOiAnJywgIC8vIGtpbmRNb2RpZmllciBpbmZvIG5vdCBhdmFpbGFibGUgb24gJ25nLlN5bWJvbCdcbiAgICB0ZXh0U3Bhbjoge1xuICAgICAgc3RhcnQ6IHNwYW4uc3RhcnQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kIC0gc3Bhbi5zdGFydCxcbiAgICB9LFxuICAgIC8vIHRoaXMgd291bGQgZ2VuZXJhdGUgYSBzdHJpbmcgbGlrZSAnKHByb3BlcnR5KSBDbGFzc1gucHJvcFknXG4gICAgLy8gJ2tpbmQnIGluIGRpc3BsYXlQYXJ0cyBkb2VzIG5vdCByZWFsbHkgbWF0dGVyIGJlY2F1c2UgaXQncyBkcm9wcGVkIHdoZW5cbiAgICAvLyBkaXNwbGF5UGFydHMgZ2V0IGNvbnZlcnRlZCB0byBzdHJpbmcuXG4gICAgZGlzcGxheVBhcnRzOiBbXG4gICAgICB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30sIHt0ZXh0OiBzeW1ib2wua2luZCwga2luZDogc3ltYm9sLmtpbmR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LCB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LCAuLi5jb250YWluZXJEaXNwbGF5UGFydHMsXG4gICAgICB7dGV4dDogc3ltYm9sLm5hbWUsIGtpbmQ6IHN5bWJvbC5raW5kfSxcbiAgICAgIC8vIFRPRE86IEFwcGVuZCB0eXBlIGluZm8gYXMgd2VsbCwgYnV0IFN5bWJvbCBkb2Vzbid0IGV4cG9zZSB0aGF0IVxuICAgICAgLy8gSWRlYWxseSBob3ZlciB0ZXh0IHNob3VsZCBiZSBsaWtlICcocHJvcGVydHkpIENsYXNzWC5wcm9wWTogc3RyaW5nJ1xuICAgIF0sXG4gIH07XG59XG5cbi8qKlxuICogR2V0IHF1aWNrIGluZm8gZm9yIEFuZ3VsYXIgc2VtYW50aWMgZW50aXRpZXMgaW4gVHlwZVNjcmlwdCBmaWxlcywgbGlrZSBEaXJlY3RpdmVzLlxuICogQHBhcmFtIHNmIFR5cGVTY3JpcHQgc291cmNlIGZpbGUgYW4gQW5ndWxhciBzeW1ib2wgaXMgaW5cbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiBvZiB0aGUgc3ltYm9sIGluIHRoZSBzb3VyY2UgZmlsZVxuICogQHBhcmFtIGhvc3QgTGFuZ3VhZ2UgU2VydmljZSBob3N0IHRvIHF1ZXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hvdmVyKFxuICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyLCBob3N0OiBSZWFkb25seTxUeXBlU2NyaXB0U2VydmljZUhvc3Q+KTogdHMuUXVpY2tJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmICghbm9kZSkgcmV0dXJuO1xuICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgcmV0dXJuIGdldERpcmVjdGl2ZU1vZHVsZShub2RlIGFzIHRzLklkZW50aWZpZXIsIGhvc3QpO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGdldCBxdWljayBpbmZvIGZvciB0aGUgTmdNb2R1bGUgYSBEaXJlY3RpdmUgaXMgZGVjbGFyZWQgaW4uXG4gKiBAcGFyYW0gZGlyZWN0aXZlIGlkZW50aWZpZXIgb24gYSBwb3RlbnRpYWwgRGlyZWN0aXZlIGNsYXNzIGRlY2xhcmF0aW9uXG4gKiBAcGFyYW0gaG9zdCBMYW5ndWFnZSBTZXJ2aWNlIGhvc3QgdG8gcXVlcnlcbiAqL1xuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTW9kdWxlKFxuICAgIGRpcmVjdGl2ZTogdHMuSWRlbnRpZmllciwgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkaXJlY3RpdmUucGFyZW50KSkgcmV0dXJuO1xuICBjb25zdCBkaXJlY3RpdmVOYW1lID0gZGlyZWN0aXZlLnRleHQ7XG4gIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbCA9IGhvc3QuZ2V0U3RhdGljU3ltYm9sKGRpcmVjdGl2ZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsIGRpcmVjdGl2ZU5hbWUpO1xuICBpZiAoIWRpcmVjdGl2ZVN5bWJvbCkgcmV0dXJuO1xuXG4gIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IGhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKGZhbHNlKTtcbiAgY29uc3QgbmdNb2R1bGUgPSBhbmFseXplZE1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5nZXQoZGlyZWN0aXZlU3ltYm9sKTtcbiAgaWYgKCFuZ01vZHVsZSkgcmV0dXJuO1xuXG4gIGNvbnN0IG1vZHVsZU5hbWUgPSBuZ01vZHVsZS50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmNsYXNzRWxlbWVudCxcbiAgICBraW5kTW9kaWZpZXJzOlxuICAgICAgICB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsICAvLyBraW5kTW9kaWZpZXIgaW5mbyBub3QgYXZhaWxhYmxlIG9uICduZy5TeW1ib2wnXG4gICAgdGV4dFNwYW46IHtcbiAgICAgIHN0YXJ0OiBkaXJlY3RpdmUuZ2V0U3RhcnQoKSxcbiAgICAgIGxlbmd0aDogZGlyZWN0aXZlLmVuZCAtIGRpcmVjdGl2ZS5nZXRTdGFydCgpLFxuICAgIH0sXG4gICAgLy8gVGhpcyBnZW5lcmF0ZXMgYSBzdHJpbmcgbGlrZSAnKGRpcmVjdGl2ZSkgTmdNb2R1bGUuRGlyZWN0aXZlOiBjbGFzcydcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnZGlyZWN0aXZlJywga2luZDogU1lNQk9MX1RFWFR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIHt0ZXh0OiBtb2R1bGVOYW1lLCBraW5kOiBTWU1CT0xfQ0xBU1N9LFxuICAgICAge3RleHQ6ICcuJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IGRpcmVjdGl2ZU5hbWUsIGtpbmQ6IFNZTUJPTF9DTEFTU30sXG4gICAgICB7dGV4dDogJzonLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAge3RleHQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmNsYXNzRWxlbWVudCwga2luZDogU1lNQk9MX1RFWFR9LFxuICAgIF0sXG4gIH07XG59XG4iXX0=