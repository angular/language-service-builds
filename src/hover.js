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
    var SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
    var SYMBOL_INTERFACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.interfaceName];
    /**
     * Traverse the template AST and look for the symbol located at `position`, then
     * return the corresponding quick info.
     * @param info template AST
     * @param position location of the symbol
     * @param analyzedModules all NgModules in the program.
     */
    function getTemplateHover(info, position, analyzedModules) {
        var _a, _b;
        var symbolInfo = locate_symbol_1.locateSymbols(info, position)[0];
        if (!symbolInfo) {
            return;
        }
        var symbol = symbolInfo.symbol, span = symbolInfo.span, staticSymbol = symbolInfo.staticSymbol;
        // The container is either the symbol's container (for example, 'AppComponent'
        // is the container of the symbol 'title' in its template) or the NgModule
        // that the directive belongs to (the container of AppComponent is AppModule).
        var containerName = (_a = symbol.container) === null || _a === void 0 ? void 0 : _a.name;
        if (!containerName && staticSymbol) {
            // If there is a static symbol then the target is a directive.
            var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(staticSymbol);
            containerName = ngModule === null || ngModule === void 0 ? void 0 : ngModule.type.reference.name;
        }
        return createQuickInfo(symbol.name, symbol.kind, span, containerName, (_b = symbol.type) === null || _b === void 0 ? void 0 : _b.name, symbol.documentation);
    }
    exports.getTemplateHover = getTemplateHover;
    /**
     * Get quick info for Angular semantic entities in TypeScript files, like Directives.
     * @param position location of the symbol in the source file
     * @param declarations All Directive-like declarations in the source file.
     * @param analyzedModules all NgModules in the program.
     */
    function getTsHover(position, declarations, analyzedModules) {
        var e_1, _a;
        try {
            for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var _b = declarations_1_1.value, declarationSpan = _b.declarationSpan, metadata = _b.metadata;
                if (utils_1.inSpan(position, declarationSpan)) {
                    var staticSymbol = metadata.type.reference;
                    var directiveName = staticSymbol.name;
                    var kind = metadata.isComponent ? 'component' : 'directive';
                    var textSpan = ts.createTextSpanFromBounds(declarationSpan.start, declarationSpan.end);
                    var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(staticSymbol);
                    var moduleName = ngModule === null || ngModule === void 0 ? void 0 : ngModule.type.reference.name;
                    return createQuickInfo(directiveName, kind, textSpan, moduleName, ts.ScriptElementKind.classElement);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_a = declarations_1.return)) _a.call(declarations_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    exports.getTsHover = getTsHover;
    /**
     * Construct a QuickInfo object taking into account its container and type.
     * @param name Name of the QuickInfo target
     * @param kind component, directive, pipe, etc.
     * @param textSpan span of the target
     * @param containerName either the Symbol's container or the NgModule that contains the directive
     * @param type user-friendly name of the type
     * @param documentation docstring or comment
     */
    function createQuickInfo(name, kind, textSpan, containerName, type, documentation) {
        var containerDisplayParts = containerName ?
            [
                { text: containerName, kind: SYMBOL_INTERFACE },
                { text: '.', kind: SYMBOL_PUNC },
            ] :
            [];
        var typeDisplayParts = type ?
            [
                { text: ':', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE },
                { text: type, kind: SYMBOL_INTERFACE },
            ] :
            [];
        return {
            kind: kind,
            kindModifiers: ts.ScriptElementKindModifier.none,
            textSpan: textSpan,
            displayParts: tslib_1.__spread([
                { text: '(', kind: SYMBOL_PUNC },
                { text: kind, kind: SYMBOL_TEXT },
                { text: ')', kind: SYMBOL_PUNC },
                { text: ' ', kind: SYMBOL_SPACE }
            ], containerDisplayParts, [
                { text: name, kind: SYMBOL_INTERFACE }
            ], typeDisplayParts),
            documentation: documentation,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsNkVBQThDO0lBRTlDLDZEQUErQjtJQUUvQixrREFBa0Q7SUFDbEQsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5RSxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25GLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUUsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRTFGOzs7Ozs7T0FNRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixJQUFlLEVBQUUsUUFBZ0IsRUFBRSxlQUFrQzs7UUFDdkUsSUFBTSxVQUFVLEdBQUcsNkJBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE9BQU87U0FDUjtRQUNNLElBQUEsMEJBQU0sRUFBRSxzQkFBSSxFQUFFLHNDQUFZLENBQWU7UUFFaEQsOEVBQThFO1FBQzlFLDBFQUEwRTtRQUMxRSw4RUFBOEU7UUFDOUUsSUFBSSxhQUFhLFNBQXFCLE1BQU0sQ0FBQyxTQUFTLDBDQUFFLElBQUksQ0FBQztRQUM3RCxJQUFJLENBQUMsYUFBYSxJQUFJLFlBQVksRUFBRTtZQUNsQyw4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O2dCQUMvQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7ZUFDNUIscUJBQXFCO2dCQUN4QixFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFDO2VBQ2pDLGdCQUFnQixDQUNwQjtZQUNELGFBQWEsZUFBQTtTQUNkLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQW5hbHl6ZWRNb2R1bGVzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbHN9IGZyb20gJy4vbG9jYXRlX3N5bWJvbCc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7aW5TcGFufSBmcm9tICcuL3V0aWxzJztcblxuLy8gUmV2ZXJzZSBtYXBwaW5ncyBvZiBlbnVtIHdvdWxkIGdlbmVyYXRlIHN0cmluZ3NcbmNvbnN0IFNZTUJPTF9TUEFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuc3BhY2VdO1xuY29uc3QgU1lNQk9MX1BVTkMgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnB1bmN0dWF0aW9uXTtcbmNvbnN0IFNZTUJPTF9URVhUID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC50ZXh0XTtcbmNvbnN0IFNZTUJPTF9JTlRFUkZBQ0UgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLmludGVyZmFjZU5hbWVdO1xuXG4vKipcbiAqIFRyYXZlcnNlIHRoZSB0ZW1wbGF0ZSBBU1QgYW5kIGxvb2sgZm9yIHRoZSBzeW1ib2wgbG9jYXRlZCBhdCBgcG9zaXRpb25gLCB0aGVuXG4gKiByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcXVpY2sgaW5mby5cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIG9mIHRoZSBzeW1ib2xcbiAqIEBwYXJhbSBhbmFseXplZE1vZHVsZXMgYWxsIE5nTW9kdWxlcyBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSG92ZXIoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyLCBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2xzKGluZm8sIHBvc2l0aW9uKVswXTtcbiAgaWYgKCFzeW1ib2xJbmZvKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtzeW1ib2wsIHNwYW4sIHN0YXRpY1N5bWJvbH0gPSBzeW1ib2xJbmZvO1xuXG4gIC8vIFRoZSBjb250YWluZXIgaXMgZWl0aGVyIHRoZSBzeW1ib2wncyBjb250YWluZXIgKGZvciBleGFtcGxlLCAnQXBwQ29tcG9uZW50J1xuICAvLyBpcyB0aGUgY29udGFpbmVyIG9mIHRoZSBzeW1ib2wgJ3RpdGxlJyBpbiBpdHMgdGVtcGxhdGUpIG9yIHRoZSBOZ01vZHVsZVxuICAvLyB0aGF0IHRoZSBkaXJlY3RpdmUgYmVsb25ncyB0byAodGhlIGNvbnRhaW5lciBvZiBBcHBDb21wb25lbnQgaXMgQXBwTW9kdWxlKS5cbiAgbGV0IGNvbnRhaW5lck5hbWU6IHN0cmluZ3x1bmRlZmluZWQgPSBzeW1ib2wuY29udGFpbmVyPy5uYW1lO1xuICBpZiAoIWNvbnRhaW5lck5hbWUgJiYgc3RhdGljU3ltYm9sKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYSBzdGF0aWMgc3ltYm9sIHRoZW4gdGhlIHRhcmdldCBpcyBhIGRpcmVjdGl2ZS5cbiAgICBjb25zdCBuZ01vZHVsZSA9IGFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChzdGF0aWNTeW1ib2wpO1xuICAgIGNvbnRhaW5lck5hbWUgPSBuZ01vZHVsZT8udHlwZS5yZWZlcmVuY2UubmFtZTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVRdWlja0luZm8oXG4gICAgICBzeW1ib2wubmFtZSwgc3ltYm9sLmtpbmQsIHNwYW4sIGNvbnRhaW5lck5hbWUsIHN5bWJvbC50eXBlPy5uYW1lLCBzeW1ib2wuZG9jdW1lbnRhdGlvbik7XG59XG5cbi8qKlxuICogR2V0IHF1aWNrIGluZm8gZm9yIEFuZ3VsYXIgc2VtYW50aWMgZW50aXRpZXMgaW4gVHlwZVNjcmlwdCBmaWxlcywgbGlrZSBEaXJlY3RpdmVzLlxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIG9mIHRoZSBzeW1ib2wgaW4gdGhlIHNvdXJjZSBmaWxlXG4gKiBAcGFyYW0gZGVjbGFyYXRpb25zIEFsbCBEaXJlY3RpdmUtbGlrZSBkZWNsYXJhdGlvbnMgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICogQHBhcmFtIGFuYWx5emVkTW9kdWxlcyBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNIb3ZlcihcbiAgICBwb3NpdGlvbjogbnVtYmVyLCBkZWNsYXJhdGlvbnM6IG5nLkRlY2xhcmF0aW9uW10sXG4gICAgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBmb3IgKGNvbnN0IHtkZWNsYXJhdGlvblNwYW4sIG1ldGFkYXRhfSBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICBpZiAoaW5TcGFuKHBvc2l0aW9uLCBkZWNsYXJhdGlvblNwYW4pKSB7XG4gICAgICBjb25zdCBzdGF0aWNTeW1ib2w6IG5nLlN0YXRpY1N5bWJvbCA9IG1ldGFkYXRhLnR5cGUucmVmZXJlbmNlO1xuICAgICAgY29uc3QgZGlyZWN0aXZlTmFtZSA9IHN0YXRpY1N5bWJvbC5uYW1lO1xuICAgICAgY29uc3Qga2luZCA9IG1ldGFkYXRhLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJztcbiAgICAgIGNvbnN0IHRleHRTcGFuID0gdHMuY3JlYXRlVGV4dFNwYW5Gcm9tQm91bmRzKGRlY2xhcmF0aW9uU3Bhbi5zdGFydCwgZGVjbGFyYXRpb25TcGFuLmVuZCk7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IGFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChzdGF0aWNTeW1ib2wpO1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IG5nTW9kdWxlPy50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICAgICAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICAgICBkaXJlY3RpdmVOYW1lLCBraW5kLCB0ZXh0U3BhbiwgbW9kdWxlTmFtZSwgdHMuU2NyaXB0RWxlbWVudEtpbmQuY2xhc3NFbGVtZW50KTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBRdWlja0luZm8gb2JqZWN0IHRha2luZyBpbnRvIGFjY291bnQgaXRzIGNvbnRhaW5lciBhbmQgdHlwZS5cbiAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgdGhlIFF1aWNrSW5mbyB0YXJnZXRcbiAqIEBwYXJhbSBraW5kIGNvbXBvbmVudCwgZGlyZWN0aXZlLCBwaXBlLCBldGMuXG4gKiBAcGFyYW0gdGV4dFNwYW4gc3BhbiBvZiB0aGUgdGFyZ2V0XG4gKiBAcGFyYW0gY29udGFpbmVyTmFtZSBlaXRoZXIgdGhlIFN5bWJvbCdzIGNvbnRhaW5lciBvciB0aGUgTmdNb2R1bGUgdGhhdCBjb250YWlucyB0aGUgZGlyZWN0aXZlXG4gKiBAcGFyYW0gdHlwZSB1c2VyLWZyaWVuZGx5IG5hbWUgb2YgdGhlIHR5cGVcbiAqIEBwYXJhbSBkb2N1bWVudGF0aW9uIGRvY3N0cmluZyBvciBjb21tZW50XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICBuYW1lOiBzdHJpbmcsIGtpbmQ6IHN0cmluZywgdGV4dFNwYW46IHRzLlRleHRTcGFuLCBjb250YWluZXJOYW1lPzogc3RyaW5nLCB0eXBlPzogc3RyaW5nLFxuICAgIGRvY3VtZW50YXRpb24/OiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdKTogdHMuUXVpY2tJbmZvIHtcbiAgY29uc3QgY29udGFpbmVyRGlzcGxheVBhcnRzID0gY29udGFpbmVyTmFtZSA/XG4gICAgICBbXG4gICAgICAgIHt0ZXh0OiBjb250YWluZXJOYW1lLCBraW5kOiBTWU1CT0xfSU5URVJGQUNFfSxcbiAgICAgICAge3RleHQ6ICcuJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgXSA6XG4gICAgICBbXTtcblxuICBjb25zdCB0eXBlRGlzcGxheVBhcnRzID0gdHlwZSA/XG4gICAgICBbXG4gICAgICAgIHt0ZXh0OiAnOicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgICAge3RleHQ6IHR5cGUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgXSA6XG4gICAgICBbXTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IGtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAga2luZE1vZGlmaWVyczogdHMuU2NyaXB0RWxlbWVudEtpbmRNb2RpZmllci5ub25lLFxuICAgIHRleHRTcGFuOiB0ZXh0U3BhbixcbiAgICBkaXNwbGF5UGFydHM6IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBraW5kLCBraW5kOiBTWU1CT0xfVEVYVH0sXG4gICAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgLi4uY29udGFpbmVyRGlzcGxheVBhcnRzLFxuICAgICAge3RleHQ6IG5hbWUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgLi4udHlwZURpc3BsYXlQYXJ0cyxcbiAgICBdLFxuICAgIGRvY3VtZW50YXRpb24sXG4gIH07XG59XG4iXX0=