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
        var symbolInfo = locate_symbol_1.locateSymbol(info, position);
        if (!symbolInfo) {
            return;
        }
        var symbol = symbolInfo.symbol, span = symbolInfo.span, compileTypeSummary = symbolInfo.compileTypeSummary;
        var textSpan = { start: span.start, length: span.end - span.start };
        if (compileTypeSummary && compileTypeSummary.summaryKind === compiler_1.CompileSummaryKind.Directive) {
            return getDirectiveModule(compileTypeSummary.type.reference, textSpan, host);
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
     * @param host Language Service host to query
     */
    function getDirectiveModule(directive, textSpan, host) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUU7SUFDbkUsK0JBQWlDO0lBRWpDLDZFQUE2QztJQUU3Qyw2REFBeUM7SUFFekMsa0RBQWtEO0lBQ2xELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xGLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUUsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRTFGOzs7Ozs7T0FNRztJQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0IsRUFBRSxJQUFxQztRQUUvRixJQUFNLFVBQVUsR0FBRyw0QkFBWSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTztTQUNSO1FBQ00sSUFBQSwwQkFBTSxFQUFFLHNCQUFJLEVBQUUsa0RBQWtCLENBQWU7UUFDdEQsSUFBTSxRQUFRLEdBQUcsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFN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RUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQy9CLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFDO2dCQUN0QyxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFDO2dCQUMxQyxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQy9CLEVBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQzthQUM3RDtTQUNGLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVTdW1tYXJ5S2luZCwgU3RhdGljU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbH0gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG4vLyBSZXZlcnNlIG1hcHBpbmdzIG9mIGVudW0gd291bGQgZ2VuZXJhdGUgc3RyaW5nc1xuY29uc3QgU1lNQk9MX1NQQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5zcGFjZV07XG5jb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuY29uc3QgU1lNQk9MX0NMQVNTID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5jbGFzc05hbWVdO1xuY29uc3QgU1lNQk9MX1RFWFQgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnRleHRdO1xuY29uc3QgU1lNQk9MX0lOVEVSRkFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuaW50ZXJmYWNlTmFtZV07XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiB0aGUgY29ycmVzcG9uZGluZyBxdWljayBpbmZvLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbFxuICogQHBhcmFtIGhvc3QgTGFuZ3VhZ2UgU2VydmljZSBob3N0IHRvIHF1ZXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIb3ZlcihpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGhvc3Q6IFJlYWRvbmx5PFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4pOlxuICAgIHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCBzeW1ib2xJbmZvID0gbG9jYXRlU3ltYm9sKGluZm8sIHBvc2l0aW9uKTtcbiAgaWYgKCFzeW1ib2xJbmZvKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtzeW1ib2wsIHNwYW4sIGNvbXBpbGVUeXBlU3VtbWFyeX0gPSBzeW1ib2xJbmZvO1xuICBjb25zdCB0ZXh0U3BhbiA9IHtzdGFydDogc3Bhbi5zdGFydCwgbGVuZ3RoOiBzcGFuLmVuZCAtIHNwYW4uc3RhcnR9O1xuXG4gIGlmIChjb21waWxlVHlwZVN1bW1hcnkgJiYgY29tcGlsZVR5cGVTdW1tYXJ5LnN1bW1hcnlLaW5kID09PSBDb21waWxlU3VtbWFyeUtpbmQuRGlyZWN0aXZlKSB7XG4gICAgcmV0dXJuIGdldERpcmVjdGl2ZU1vZHVsZShjb21waWxlVHlwZVN1bW1hcnkudHlwZS5yZWZlcmVuY2UsIHRleHRTcGFuLCBob3N0KTtcbiAgfVxuXG4gIGNvbnN0IGNvbnRhaW5lckRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSA9IHN5bWJvbC5jb250YWluZXIgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogc3ltYm9sLmNvbnRhaW5lci5uYW1lLCBraW5kOiBzeW1ib2wuY29udGFpbmVyLmtpbmR9LFxuICAgICAgICB7dGV4dDogJy4nLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuICBjb25zdCB0eXBlRGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdID0gc3ltYm9sLnR5cGUgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogJzonLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICAgIHt0ZXh0OiBzeW1ib2wudHlwZS5uYW1lLCBraW5kOiBTWU1CT0xfSU5URVJGQUNFfSxcbiAgICAgIF0gOlxuICAgICAgW107XG4gIHJldHVybiB7XG4gICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAga2luZE1vZGlmaWVyczogJycsICAvLyBraW5kTW9kaWZpZXIgaW5mbyBub3QgYXZhaWxhYmxlIG9uICduZy5TeW1ib2wnXG4gICAgdGV4dFNwYW4sXG4gICAgLy8gdGhpcyB3b3VsZCBnZW5lcmF0ZSBhIHN0cmluZyBsaWtlICcocHJvcGVydHkpIENsYXNzWC5wcm9wWTogdHlwZSdcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBzeW1ib2wua2luZCwga2luZDogc3ltYm9sLmtpbmR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIC4uLmNvbnRhaW5lckRpc3BsYXlQYXJ0cyxcbiAgICAgIHt0ZXh0OiBzeW1ib2wubmFtZSwga2luZDogc3ltYm9sLmtpbmR9LFxuICAgICAgLi4udHlwZURpc3BsYXlQYXJ0cyxcbiAgICBdLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCBxdWljayBpbmZvIGZvciBBbmd1bGFyIHNlbWFudGljIGVudGl0aWVzIGluIFR5cGVTY3JpcHQgZmlsZXMsIGxpa2UgRGlyZWN0aXZlcy5cbiAqIEBwYXJhbSBzZiBUeXBlU2NyaXB0IHNvdXJjZSBmaWxlIGFuIEFuZ3VsYXIgc3ltYm9sIGlzIGluXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbCBpbiB0aGUgc291cmNlIGZpbGVcbiAqIEBwYXJhbSBob3N0IExhbmd1YWdlIFNlcnZpY2UgaG9zdCB0byBxdWVyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNIb3ZlcihcbiAgICBzZjogdHMuU291cmNlRmlsZSwgcG9zaXRpb246IG51bWJlciwgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6IHRzLlF1aWNrSW5mb3xcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBub2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzZiwgcG9zaXRpb24pO1xuICBpZiAoIW5vZGUpIHJldHVybjtcbiAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcjpcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZUlkID0gbm9kZSBhcyB0cy5JZGVudGlmaWVyO1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkaXJlY3RpdmVJZC5wYXJlbnQpKSB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPSBkaXJlY3RpdmVJZC50ZXh0O1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVTeW1ib2wgPSBob3N0LmdldFN0YXRpY1N5bWJvbChub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSwgZGlyZWN0aXZlTmFtZSk7XG4gICAgICAgIGlmICghZGlyZWN0aXZlU3ltYm9sKSByZXR1cm47XG4gICAgICAgIHJldHVybiBnZXREaXJlY3RpdmVNb2R1bGUoXG4gICAgICAgICAgICBkaXJlY3RpdmVTeW1ib2wsXG4gICAgICAgICAgICB7c3RhcnQ6IGRpcmVjdGl2ZUlkLmdldFN0YXJ0KCksIGxlbmd0aDogZGlyZWN0aXZlSWQuZW5kIC0gZGlyZWN0aXZlSWQuZ2V0U3RhcnQoKX0sXG4gICAgICAgICAgICBob3N0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGdldCBxdWljayBpbmZvIGZvciB0aGUgTmdNb2R1bGUgYSBEaXJlY3RpdmUgaXMgZGVjbGFyZWQgaW4uXG4gKiBAcGFyYW0gZGlyZWN0aXZlIGlkZW50aWZpZXIgb24gYSBwb3RlbnRpYWwgRGlyZWN0aXZlIGNsYXNzIGRlY2xhcmF0aW9uXG4gKiBAcGFyYW0gaG9zdCBMYW5ndWFnZSBTZXJ2aWNlIGhvc3QgdG8gcXVlcnlcbiAqL1xuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTW9kdWxlKFxuICAgIGRpcmVjdGl2ZTogU3RhdGljU3ltYm9sLCB0ZXh0U3BhbjogdHMuVGV4dFNwYW4sXG4gICAgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCBhbmFseXplZE1vZHVsZXMgPSBob3N0LmdldEFuYWx5emVkTW9kdWxlcyhmYWxzZSk7XG4gIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KGRpcmVjdGl2ZSk7XG4gIGlmICghbmdNb2R1bGUpIHJldHVybjtcblxuICBjb25zdCBpc0NvbXBvbmVudCA9XG4gICAgICBob3N0LmdldERlY2xhcmF0aW9ucyhkaXJlY3RpdmUuZmlsZVBhdGgpXG4gICAgICAgICAgLmZpbmQoZGVjbCA9PiBkZWNsLnR5cGUgPT09IGRpcmVjdGl2ZSAmJiBkZWNsLm1ldGFkYXRhICYmIGRlY2wubWV0YWRhdGEuaXNDb21wb25lbnQpO1xuXG4gIGNvbnN0IG1vZHVsZU5hbWUgPSBuZ01vZHVsZS50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLmNsYXNzRWxlbWVudCxcbiAgICBraW5kTW9kaWZpZXJzOlxuICAgICAgICB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsICAvLyBraW5kTW9kaWZpZXIgaW5mbyBub3QgYXZhaWxhYmxlIG9uICduZy5TeW1ib2wnXG4gICAgdGV4dFNwYW4sXG4gICAgLy8gVGhpcyBnZW5lcmF0ZXMgYSBzdHJpbmcgbGlrZSAnKGRpcmVjdGl2ZSkgTmdNb2R1bGUuRGlyZWN0aXZlOiBjbGFzcydcbiAgICAvLyAna2luZCcgaW4gZGlzcGxheVBhcnRzIGRvZXMgbm90IHJlYWxseSBtYXR0ZXIgYmVjYXVzZSBpdCdzIGRyb3BwZWQgd2hlblxuICAgIC8vIGRpc3BsYXlQYXJ0cyBnZXQgY29udmVydGVkIHRvIHN0cmluZy5cbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBpc0NvbXBvbmVudCA/ICdjb21wb25lbnQnIDogJ2RpcmVjdGl2ZScsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICAgIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICB7dGV4dDogbW9kdWxlTmFtZSwga2luZDogU1lNQk9MX0NMQVNTfSxcbiAgICAgIHt0ZXh0OiAnLicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBkaXJlY3RpdmUubmFtZSwga2luZDogU1lNQk9MX0NMQVNTfSxcbiAgICAgIHt0ZXh0OiAnOicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICB7dGV4dDogdHMuU2NyaXB0RWxlbWVudEtpbmQuY2xhc3NFbGVtZW50LCBraW5kOiBTWU1CT0xfVEVYVH0sXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==