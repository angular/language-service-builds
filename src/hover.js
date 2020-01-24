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
        define("@angular/language-service/src/hover", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var utils_1 = require("@angular/language-service/src/utils");
    // Reverse mappings of enum would generate strings
    var SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    var SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    var SYMBOL_CLASS = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.className];
    var SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
    var SYMBOL_INTERFACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.interfaceName];
    /**
     * Traverse the template AST and look for the symbol located at `position`, then
     * return the corresponding quick info.
     * @param info template AST
     * @param position location of the symbol
     * @param host Language Service host to query
     */
    function getHover(info, position, host) {
        var symbolInfo = locate_symbol_1.locateSymbols(info, position)[0];
        if (!symbolInfo) {
            return;
        }
        var symbol = symbolInfo.symbol, span = symbolInfo.span, compileTypeSummary = symbolInfo.compileTypeSummary;
        var textSpan = { start: span.start, length: span.end - span.start };
        if (compileTypeSummary && compileTypeSummary.summaryKind === compiler_1.CompileSummaryKind.Directive) {
            return getDirectiveModule(compileTypeSummary.type.reference, textSpan, host, symbol);
        }
        var containerDisplayParts = symbol.container ?
            [
                { text: symbol.container.name, kind: symbol.container.kind },
                { text: '.', kind: SYMBOL_PUNC },
            ] :
            [];
        var typeDisplayParts = symbol.type ?
            [
                { text: ':', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: symbol.type.name, kind: SYMBOL_INTERFACE },
            ] :
            [];
        return {
            kind: symbol.kind,
            kindModifiers: '',
            textSpan: textSpan,
            documentation: symbol.documentation,
            // this would generate a string like '(property) ClassX.propY: type'
            // 'kind' in displayParts does not really matter because it's dropped when
            // displayParts get converted to string.
            displayParts: tslib_1.__spread([
                { text: '(', kind: SYMBOL_PUNC },
                { text: symbol.kind, kind: symbol.kind },
                { text: ')', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE }
            ], containerDisplayParts, [
                { text: symbol.name, kind: symbol.kind }
            ], typeDisplayParts),
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
                var directiveId = node;
                if (ts.isClassDeclaration(directiveId.parent)) {
                    var directiveName = directiveId.text;
                    var directiveSymbol = host.getStaticSymbol(node.getSourceFile().fileName, directiveName);
                    if (!directiveSymbol)
                        return;
                    return getDirectiveModule(directiveSymbol, { start: directiveId.getStart(), length: directiveId.end - directiveId.getStart() }, host);
                }
                break;
            default:
                break;
        }
        return undefined;
    }
    exports.getTsHover = getTsHover;
    /**
     * Attempts to get quick info for the NgModule a Directive is declared in.
     * @param directive identifier on a potential Directive class declaration
     * @param textSpan span of the symbol
     * @param host Language Service host to query
     * @param symbol the internal symbol that represents the directive
     */
    function getDirectiveModule(directive, textSpan, host, symbol) {
        var analyzedModules = host.getAnalyzedModules(false);
        var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(directive);
        if (!ngModule)
            return;
        var isComponent = host.getDeclarations(directive.filePath)
            .find(function (decl) { return decl.type === directive && decl.metadata && decl.metadata.isComponent; });
        var moduleName = ngModule.type.reference.name;
        return {
            kind: ts.ScriptElementKind.classElement,
            kindModifiers: ts.ScriptElementKindModifier.none,
            textSpan: textSpan,
            documentation: symbol ? symbol.documentation : undefined,
            // This generates a string like '(directive) NgModule.Directive: class'
            // 'kind' in displayParts does not really matter because it's dropped when
            // displayParts get converted to string.
            displayParts: [
                { text: '(', kind: SYMBOL_PUNC },
                { text: isComponent ? 'component' : 'directive', kind: SYMBOL_TEXT },
                { text: ')', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: moduleName, kind: SYMBOL_CLASS },
                { text: '.', kind: SYMBOL_PUNC },
                { text: directive.name, kind: SYMBOL_CLASS },
                { text: ':', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: ts.ScriptElementKind.classElement, kind: SYMBOL_TEXT },
            ],
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUU7SUFDbkUsK0JBQWlDO0lBR2pDLDZFQUE4QztJQUc5Qyw2REFBeUM7SUFHekMsa0RBQWtEO0lBQ2xELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xGLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUUsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRTFGOzs7Ozs7T0FNRztJQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0IsRUFBRSxJQUFxQztRQUUvRixJQUFNLFVBQVUsR0FBRyw2QkFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTztTQUNSO1FBRU0sSUFBQSwwQkFBTSxFQUFFLHNCQUFJLEVBQUUsa0RBQWtCLENBQWU7UUFDdEQsSUFBTSxRQUFRLEdBQUcsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFD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LEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUM7Z0JBQ2xFLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQ3RDLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQzFDLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2FBQzdEO1NBQ0YsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZVN1bW1hcnlLaW5kLCBTdGF0aWNTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtsb2NhdGVTeW1ib2xzfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlfSBmcm9tICcuL3V0aWxzJztcblxuXG4vLyBSZXZlcnNlIG1hcHBpbmdzIG9mIGVudW0gd291bGQgZ2VuZXJhdGUgc3RyaW5nc1xuY29uc3QgU1lNQk9MX1NQQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5zcGFjZV07XG5jb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuY29uc3QgU1lNQk9MX0NMQVNTID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5jbGFzc05hbWVdO1xuY29uc3QgU1lNQk9MX1RFWFQgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnRleHRdO1xuY29uc3QgU1lNQk9MX0lOVEVSRkFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuaW50ZXJmYWNlTmFtZV07XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiB0aGUgY29ycmVzcG9uZGluZyBxdWljayBpbmZvLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbFxuICogQHBhcmFtIGhvc3QgTGFuZ3VhZ2UgU2VydmljZSBob3N0IHRvIHF1ZXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIb3ZlcihpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGhvc3Q6IFJlYWRvbmx5PFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4pOlxuICAgIHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCBzeW1ib2xJbmZvID0gbG9jYXRlU3ltYm9scyhpbmZvLCBwb3NpdGlvbilbMF07XG4gIGlmICghc3ltYm9sSW5mbykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHtzeW1ib2wsIHNwYW4sIGNvbXBpbGVUeXBlU3VtbWFyeX0gPSBzeW1ib2xJbmZvO1xuICBjb25zdCB0ZXh0U3BhbiA9IHtzdGFydDogc3Bhbi5zdGFydCwgbGVuZ3RoOiBzcGFuLmVuZCAtIHNwYW4uc3RhcnR9O1xuXG4gIGlmIChjb21waWxlVHlwZVN1bW1hcnkgJiYgY29tcGlsZVR5cGVTdW1tYXJ5LnN1bW1hcnlLaW5kID09PSBDb21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKSB7XG4gICAgcmV0dXJuIGdldERpcmVjdGl2ZU1vZHVsZShjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UsIHRleHRTcGFuLCBob3N0LCBzeW1ib2wpO1xuICB9XG5cbiAgY29uc3QgY29udGFpbmVyRGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdID0gc3ltYm9sLmNvbnRhaW5lciA/XG4gICAgICBbXG4gICAgICAgIHt0ZXh0OiBzeW1ib2wuY29udGFpbmVyLm5hbWUsIGtpbmQ6IHN5bWJvbC5jb250YWluZXIua2luZH0sXG4gICAgICAgIHt0ZXh0OiAnLicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIF0gOlxuICAgICAgW107XG4gIGNvbnN0IHR5cGVEaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10gPSBzeW1ib2wudHlwZSA/XG4gICAgICBbXG4gICAgICAgIHt0ZXh0OiAnOicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgICAge3RleHQ6IHN5bWJvbC50eXBlLm5hbWUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgXSA6XG4gICAgICBbXTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBzeW1ib2wua2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICBraW5kTW9kaWZpZXJzOiAnJywgIC8vIGtpbmRNb2RpZmllciBpbmZvIG5vdCBhdmFpbGFibGUgb24gJ25nLlN5bWJvbCdcbiAgICB0ZXh0U3BhbixcbiAgICBkb2N1bWVudGF0aW9uOiBzeW1ib2wuZG9jdW1lbnRhdGlvbixcbiAgICAvLyB0aGlzIHdvdWxkIGdlbmVyYXRlIGEgc3RyaW5nIGxpa2UgJyhwcm9wZXJ0eSkgQ2xhc3NYLnByb3BZOiB0eXBlJ1xuICAgIC8vICdraW5kJyBpbiBkaXNwbGF5UGFydHMgZG9lcyBub3QgcmVhbGx5IG1hdHRlciBiZWNhdXNlIGl0J3MgZHJvcHBlZCB3aGVuXG4gICAgLy8gZGlzcGxheVBhcnRzIGdldCBjb252ZXJ0ZWQgdG8gc3RyaW5nLlxuICAgIGRpc3BsYXlQYXJ0czogW1xuICAgICAge3RleHQ6ICcoJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IHN5bWJvbC5raW5kLCBraW5kOiBzeW1ib2wua2luZH0sXG4gICAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgLi4uY29udGFpbmVyRGlzcGxheVBhcnRzLFxuICAgICAge3RleHQ6IHN5bWJvbC5uYW1lLCBraW5kOiBzeW1ib2wua2luZH0sXG4gICAgICAuLi50eXBlRGlzcGxheVBhcnRzLFxuICAgIF0sXG4gIH07XG59XG5cbi8qKlxuICogR2V0IHF1aWNrIGluZm8gZm9yIEFuZ3VsYXIgc2VtYW50aWMgZW50aXRpZXMgaW4gVHlwZVNjcmlwdCBmaWxlcywgbGlrZSBEaXJlY3RpdmVzLlxuICogQHBhcmFtIHNmIFR5cGVTY3JpcHQgc291cmNlIGZpbGUgYW4gQW5ndWxhciBzeW1ib2wgaXMgaW5cbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiBvZiB0aGUgc3ltYm9sIGluIHRoZSBzb3VyY2UgZmlsZVxuICogQHBhcmFtIGhvc3QgTGFuZ3VhZ2UgU2VydmljZSBob3N0IHRvIHF1ZXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hvdmVyKFxuICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBwb3NpdGlvbjogbnVtYmVyLCBob3N0OiBSZWFkb25seTxUeXBlU2NyaXB0U2VydmljZUhvc3Q+KTogdHMuUXVpY2tJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmICghbm9kZSkgcmV0dXJuO1xuICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgY29uc3QgZGlyZWN0aXZlSWQgPSBub2RlIGFzIHRzLklkZW50aWZpZXI7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRpcmVjdGl2ZUlkLnBhcmVudCkpIHtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlTmFtZSA9IGRpcmVjdGl2ZUlkLnRleHQ7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbCA9IGhvc3QuZ2V0U3RhdGljU3ltYm9sKG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLCBkaXJlY3RpdmVOYW1lKTtcbiAgICAgICAgaWYgKCFkaXJlY3RpdmVTeW1ib2wpIHJldHVybjtcbiAgICAgICAgcmV0dXJuIGdldERpcmVjdGl2ZU1vZHVsZShcbiAgICAgICAgICAgIGRpcmVjdGl2ZVN5bWJvbCxcbiAgICAgICAgICAgIHtzdGFydDogZGlyZWN0aXZlSWQuZ2V0U3RhcnQoKSwgbGVuZ3RoOiBkaXJlY3RpdmVJZC5lbmQgLSBkaXJlY3RpdmVJZC5nZXRTdGFydCgpfSxcbiAgICAgICAgICAgIGhvc3QpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gZ2V0IHF1aWNrIGluZm8gZm9yIHRoZSBOZ01vZHVsZSBhIERpcmVjdGl2ZSBpcyBkZWNsYXJlZCBpbi5cbiAqIEBwYXJhbSBkaXJlY3RpdmUgaWRlbnRpZmllciBvbiBhIHBvdGVudGlhbCBEaXJlY3RpdmUgY2xhc3MgZGVjbGFyYXRpb25cbiAqIEBwYXJhbSB0ZXh0U3BhbiBzcGFuIG9mIHRoZSBzeW1ib2xcbiAqIEBwYXJhbSBob3N0IExhbmd1YWdlIFNlcnZpY2UgaG9zdCB0byBxdWVyeVxuICogQHBhcmFtIHN5bWJvbCB0aGUgaW50ZXJuYWwgc3ltYm9sIHRoYXQgcmVwcmVzZW50cyB0aGUgZGlyZWN0aXZlXG4gKi9cbmZ1bmN0aW9uIGdldERpcmVjdGl2ZU1vZHVsZShcbiAgICBkaXJlY3RpdmU6IFN0YXRpY1N5bWJvbCwgdGV4dFNwYW46IHRzLlRleHRTcGFuLCBob3N0OiBSZWFkb25seTxUeXBlU2NyaXB0U2VydmljZUhvc3Q+LFxuICAgIHN5bWJvbD86IG5nLlN5bWJvbCk6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSBob3N0LmdldEFuYWx5emVkTW9kdWxlcyhmYWxzZSk7XG4gIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KGRpcmVjdGl2ZSk7XG4gIGlmICghbmdNb2R1bGUpIHJldHVybjtcblxuICBjb25zdCBpc0NvbXBvbmVudCA9XG4gICAgICBob3N0LmdldERlY2xhcmF0aW9ucyhkaXJlY3RpdmUuZmlsZVBhdGgpXG4gICAgICAgICAgLmZpbmQoZGVjbCA9PiBkZWNsLnR5cGUgPT09IGRpcmVjdGl2ZSAmJiBkZWNsLm1ldGFkYXRhICYmIGRlY2wubWV0YWRhdGEuaXNDb21wb25lbnQpO1xuXG4gIGNvbnN0IG1vZHVsZU5hbWUgPSBuZ01vZHVsZS50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmNsYXNzRWxlbWVudCxcbiAgICBraW5kTW9kaWZpZXJzOlxuICAgICAgICB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsICAvLyBraW5kTW9kaWZpZXIgaW5mbyBub3QgYXZhaWxhYmxlIG9uICduZy5TeW1ib2wnXG4gICAgdGV4dFNwYW4sXG4gICAgZG9jdW1lbnRhdGlvbjogc3ltYm9sID8gc3ltYm9sLmRvY3VtZW50YXRpb24gOiB1bmRlZmluZWQsXG4gICAgLy8gVGhpcyBnZW5lcmF0ZXMgYSBzdHJpbmcgbGlrZSAnKGRpcmVjdGl2ZSkgTmdNb2R1bGUuRGlyZWN0aXZlOiBjbGFzcydcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBpc0NvbXBvbmVudCA/ICdjb21wb25lbnQnIDogJ2RpcmVjdGl2ZScsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICAgIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICB7dGV4dDogbW9kdWxlTmFtZSwga2luZDogU1lNQk9MX0NMQVNTfSxcbiAgICAgIHt0ZXh0OiAnLicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBkaXJlY3RpdmUubmFtZSwga2luZDogU1lNQk9MX0NMQVNTfSxcbiAgICAgIHt0ZXh0OiAnOicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICB7dGV4dDogdHMuU2NyaXB0RWxlbWVudEtpbmQuY2xhc3NFbGVtZW50LCBraW5kOiBTWU1CT0xfVEVYVH0sXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==