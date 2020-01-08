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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUU7SUFDbkUsK0JBQWlDO0lBR2pDLDZFQUE2QztJQUc3Qyw2REFBeUM7SUFHekMsa0RBQWtEO0lBQ2xELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xGLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUUsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRTFGOzs7Ozs7T0FNRztJQUNILFNBQWdCLFFBQVEsQ0FBQyxJQUFlLEVBQUUsUUFBZ0IsRUFBRSxJQUFxQztRQUUvRixJQUFNLFVBQVUsR0FBRyw0QkFBWSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTztTQUNSO1FBQ00sSUFBQSwwQkFBTSxFQUFFLHNCQUFJLEVBQUUsa0RBQWtCLENBQWU7UUFDdEQsSUFBTSxRQUFRLEdBQUcsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFN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LEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUM7Z0JBQ2xFLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQ3RDLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7Z0JBQzFDLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2FBQzdEO1NBQ0YsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZVN1bW1hcnlLaW5kLCBTdGF0aWNTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtsb2NhdGVTeW1ib2x9IGZyb20gJy4vbG9jYXRlX3N5bWJvbCc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7VHlwZVNjcmlwdFNlcnZpY2VIb3N0fSBmcm9tICcuL3R5cGVzY3JpcHRfaG9zdCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG5cbi8vIFJldmVyc2UgbWFwcGluZ3Mgb2YgZW51bSB3b3VsZCBnZW5lcmF0ZSBzdHJpbmdzXG5jb25zdCBTWU1CT0xfU1BBQ0UgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnNwYWNlXTtcbmNvbnN0IFNZTUJPTF9QVU5DID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5wdW5jdHVhdGlvbl07XG5jb25zdCBTWU1CT0xfQ0xBU1MgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLmNsYXNzTmFtZV07XG5jb25zdCBTWU1CT0xfVEVYVCA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQudGV4dF07XG5jb25zdCBTWU1CT0xfSU5URVJGQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5pbnRlcmZhY2VOYW1lXTtcblxuLyoqXG4gKiBUcmF2ZXJzZSB0aGUgdGVtcGxhdGUgQVNUIGFuZCBsb29rIGZvciB0aGUgc3ltYm9sIGxvY2F0ZWQgYXQgYHBvc2l0aW9uYCwgdGhlblxuICogcmV0dXJuIHRoZSBjb3JyZXNwb25kaW5nIHF1aWNrIGluZm8uXG4gKiBAcGFyYW0gaW5mbyB0ZW1wbGF0ZSBBU1RcbiAqIEBwYXJhbSBwb3NpdGlvbiBsb2NhdGlvbiBvZiB0aGUgc3ltYm9sXG4gKiBAcGFyYW0gaG9zdCBMYW5ndWFnZSBTZXJ2aWNlIGhvc3QgdG8gcXVlcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEhvdmVyKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlciwgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6XG4gICAgdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2woaW5mbywgcG9zaXRpb24pO1xuICBpZiAoIXN5bWJvbEluZm8pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge3N5bWJvbCwgc3BhbiwgY29tcGlsZVR5cGVTdW1tYXJ5fSA9IHN5bWJvbEluZm87XG4gIGNvbnN0IHRleHRTcGFuID0ge3N0YXJ0OiBzcGFuLnN0YXJ0LCBsZW5ndGg6IHNwYW4uZW5kIC0gc3Bhbi5zdGFydH07XG5cbiAgaWYgKGNvbXBpbGVUeXBlU3VtbWFyeSAmJiBjb21waWxlVHlwZVN1bW1hcnkuc3VtbWFyeUtpbmQgPT09IENvbXBpbGVTdW1tYXJ5S2luZC5EaXJlY3RpdmUpIHtcbiAgICByZXR1cm4gZ2V0RGlyZWN0aXZlTW9kdWxlKGNvbXBpbGVUeXBlU3VtbWFyeS50eXBlLnJlZmVyZW5jZSwgdGV4dFNwYW4sIGhvc3QsIHN5bWJvbCk7XG4gIH1cblxuICBjb25zdCBjb250YWluZXJEaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10gPSBzeW1ib2wuY29udGFpbmVyID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6IHN5bWJvbC5jb250YWluZXIubmFtZSwga2luZDogc3ltYm9sLmNvbnRhaW5lci5raW5kfSxcbiAgICAgICAge3RleHQ6ICcuJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgXSA6XG4gICAgICBbXTtcbiAgY29uc3QgdHlwZURpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSA9IHN5bWJvbC50eXBlID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6ICc6Jywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgICB7dGV4dDogc3ltYm9sLnR5cGUubmFtZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHN5bWJvbC5raW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgIGtpbmRNb2RpZmllcnM6ICcnLCAgLy8ga2luZE1vZGlmaWVyIGluZm8gbm90IGF2YWlsYWJsZSBvbiAnbmcuU3ltYm9sJ1xuICAgIHRleHRTcGFuLFxuICAgIGRvY3VtZW50YXRpb246IHN5bWJvbC5kb2N1bWVudGF0aW9uLFxuICAgIC8vIHRoaXMgd291bGQgZ2VuZXJhdGUgYSBzdHJpbmcgbGlrZSAnKHByb3BlcnR5KSBDbGFzc1gucHJvcFk6IHR5cGUnXG4gICAgLy8gJ2tpbmQnIGluIGRpc3BsYXlQYXJ0cyBkb2VzIG5vdCByZWFsbHkgbWF0dGVyIGJlY2F1c2UgaXQncyBkcm9wcGVkIHdoZW5cbiAgICAvLyBkaXNwbGF5UGFydHMgZ2V0IGNvbnZlcnRlZCB0byBzdHJpbmcuXG4gICAgZGlzcGxheVBhcnRzOiBbXG4gICAgICB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDogc3ltYm9sLmtpbmQsIGtpbmQ6IHN5bWJvbC5raW5kfSxcbiAgICAgIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICAuLi5jb250YWluZXJEaXNwbGF5UGFydHMsXG4gICAgICB7dGV4dDogc3ltYm9sLm5hbWUsIGtpbmQ6IHN5bWJvbC5raW5kfSxcbiAgICAgIC4uLnR5cGVEaXNwbGF5UGFydHMsXG4gICAgXSxcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXQgcXVpY2sgaW5mbyBmb3IgQW5ndWxhciBzZW1hbnRpYyBlbnRpdGllcyBpbiBUeXBlU2NyaXB0IGZpbGVzLCBsaWtlIERpcmVjdGl2ZXMuXG4gKiBAcGFyYW0gc2YgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZSBhbiBBbmd1bGFyIHN5bWJvbCBpcyBpblxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIG9mIHRoZSBzeW1ib2wgaW4gdGhlIHNvdXJjZSBmaWxlXG4gKiBAcGFyYW0gaG9zdCBMYW5ndWFnZSBTZXJ2aWNlIGhvc3QgdG8gcXVlcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRzSG92ZXIoXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsIGhvc3Q6IFJlYWRvbmx5PFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4pOiB0cy5RdWlja0luZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3Qgbm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKCFub2RlKSByZXR1cm47XG4gIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICBjb25zdCBkaXJlY3RpdmVJZCA9IG5vZGUgYXMgdHMuSWRlbnRpZmllcjtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyZWN0aXZlSWQucGFyZW50KSkge1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVOYW1lID0gZGlyZWN0aXZlSWQudGV4dDtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlU3ltYm9sID0gaG9zdC5nZXRTdGF0aWNTeW1ib2wobm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsIGRpcmVjdGl2ZU5hbWUpO1xuICAgICAgICBpZiAoIWRpcmVjdGl2ZVN5bWJvbCkgcmV0dXJuO1xuICAgICAgICByZXR1cm4gZ2V0RGlyZWN0aXZlTW9kdWxlKFxuICAgICAgICAgICAgZGlyZWN0aXZlU3ltYm9sLFxuICAgICAgICAgICAge3N0YXJ0OiBkaXJlY3RpdmVJZC5nZXRTdGFydCgpLCBsZW5ndGg6IGRpcmVjdGl2ZUlkLmVuZCAtIGRpcmVjdGl2ZUlkLmdldFN0YXJ0KCl9LFxuICAgICAgICAgICAgaG9zdCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBnZXQgcXVpY2sgaW5mbyBmb3IgdGhlIE5nTW9kdWxlIGEgRGlyZWN0aXZlIGlzIGRlY2xhcmVkIGluLlxuICogQHBhcmFtIGRpcmVjdGl2ZSBpZGVudGlmaWVyIG9uIGEgcG90ZW50aWFsIERpcmVjdGl2ZSBjbGFzcyBkZWNsYXJhdGlvblxuICogQHBhcmFtIHRleHRTcGFuIHNwYW4gb2YgdGhlIHN5bWJvbFxuICogQHBhcmFtIGhvc3QgTGFuZ3VhZ2UgU2VydmljZSBob3N0IHRvIHF1ZXJ5XG4gKiBAcGFyYW0gc3ltYm9sIHRoZSBpbnRlcm5hbCBzeW1ib2wgdGhhdCByZXByZXNlbnRzIHRoZSBkaXJlY3RpdmVcbiAqL1xuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTW9kdWxlKFxuICAgIGRpcmVjdGl2ZTogU3RhdGljU3ltYm9sLCB0ZXh0U3BhbjogdHMuVGV4dFNwYW4sIGhvc3Q6IFJlYWRvbmx5PFR5cGVTY3JpcHRTZXJ2aWNlSG9zdD4sXG4gICAgc3ltYm9sPzogbmcuU3ltYm9sKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGFuYWx5emVkTW9kdWxlcyA9IGhvc3QuZ2V0QW5hbHl6ZWRNb2R1bGVzKGZhbHNlKTtcbiAgY29uc3QgbmdNb2R1bGUgPSBhbmFseXplZE1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5nZXQoZGlyZWN0aXZlKTtcbiAgaWYgKCFuZ01vZHVsZSkgcmV0dXJuO1xuXG4gIGNvbnN0IGlzQ29tcG9uZW50ID1cbiAgICAgIGhvc3QuZ2V0RGVjbGFyYXRpb25zKGRpcmVjdGl2ZS5maWxlUGF0aClcbiAgICAgICAgICAuZmluZChkZWNsID0+IGRlY2wudHlwZSA9PT0gZGlyZWN0aXZlICYmIGRlY2wubWV0YWRhdGEgJiYgZGVjbC5tZXRhZGF0YS5pc0NvbXBvbmVudCk7XG5cbiAgY29uc3QgbW9kdWxlTmFtZSA9IG5nTW9kdWxlLnR5cGUucmVmZXJlbmNlLm5hbWU7XG4gIHJldHVybiB7XG4gICAga2luZDogdHMuU2NyaXB0RWxlbWVudEtpbmQuY2xhc3NFbGVtZW50LFxuICAgIGtpbmRNb2RpZmllcnM6XG4gICAgICAgIHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSwgIC8vIGtpbmRNb2RpZmllciBpbmZvIG5vdCBhdmFpbGFibGUgb24gJ25nLlN5bWJvbCdcbiAgICB0ZXh0U3BhbixcbiAgICBkb2N1bWVudGF0aW9uOiBzeW1ib2wgPyBzeW1ib2wuZG9jdW1lbnRhdGlvbiA6IHVuZGVmaW5lZCxcbiAgICAvLyBUaGlzIGdlbmVyYXRlcyBhIHN0cmluZyBsaWtlICcoZGlyZWN0aXZlKSBOZ01vZHVsZS5EaXJlY3RpdmU6IGNsYXNzJ1xuICAgIC8vICdraW5kJyBpbiBkaXNwbGF5UGFydHMgZG9lcyBub3QgcmVhbGx5IG1hdHRlciBiZWNhdXNlIGl0J3MgZHJvcHBlZCB3aGVuXG4gICAgLy8gZGlzcGxheVBhcnRzIGdldCBjb252ZXJ0ZWQgdG8gc3RyaW5nLlxuICAgIGRpc3BsYXlQYXJ0czogW1xuICAgICAge3RleHQ6ICcoJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IGlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJywga2luZDogU1lNQk9MX1RFWFR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIHt0ZXh0OiBtb2R1bGVOYW1lLCBraW5kOiBTWU1CT0xfQ0xBU1N9LFxuICAgICAge3RleHQ6ICcuJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IGRpcmVjdGl2ZS5uYW1lLCBraW5kOiBTWU1CT0xfQ0xBU1N9LFxuICAgICAge3RleHQ6ICc6Jywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIHt0ZXh0OiB0cy5TY3JpcHRFbGVtZW50S2luZC5jbGFzc0VsZW1lbnQsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICBdLFxuICB9O1xufVxuIl19