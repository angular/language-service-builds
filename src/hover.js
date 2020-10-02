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
        define("@angular/language-service/src/hover", ["require", "exports", "tslib", "typescript", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createQuickInfo = exports.getTsHover = exports.getTemplateHover = exports.ALIAS_NAME = exports.SYMBOL_INTERFACE = exports.SYMBOL_TEXT = exports.SYMBOL_PUNC = exports.SYMBOL_SPACE = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var utils_1 = require("@angular/language-service/src/utils");
    // Reverse mappings of enum would generate strings
    exports.SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    exports.SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    exports.SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
    exports.SYMBOL_INTERFACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.interfaceName];
    exports.ALIAS_NAME = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.aliasName];
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
                { text: containerName, kind: exports.SYMBOL_INTERFACE },
                { text: '.', kind: exports.SYMBOL_PUNC },
            ] :
            [];
        var typeDisplayParts = type ?
            [
                { text: ':', kind: exports.SYMBOL_PUNC },
                { text: ' ', kind: exports.SYMBOL_SPACE },
                { text: type, kind: exports.SYMBOL_INTERFACE },
            ] :
            [];
        return {
            kind: kind,
            kindModifiers: ts.ScriptElementKindModifier.none,
            textSpan: textSpan,
            displayParts: tslib_1.__spread([
                { text: '(', kind: exports.SYMBOL_PUNC },
                { text: kind, kind: exports.SYMBOL_TEXT },
                { text: ')', kind: exports.SYMBOL_PUNC },
                { text: ' ', kind: exports.SYMBOL_SPACE }
            ], containerDisplayParts, [
                { text: name, kind: exports.SYMBOL_INTERFACE }
            ], typeDisplayParts),
            documentation: documentation,
        };
    }
    exports.createQuickInfo = createQuickInfo;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBQ2pDLDZFQUE4QztJQUU5Qyw2REFBK0I7SUFFL0Isa0RBQWtEO0lBQ3JDLFFBQUEsWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEUsUUFBQSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RSxRQUFBLFdBQVcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RFLFFBQUEsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNwRixRQUFBLFVBQVUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRXZGOzs7Ozs7T0FNRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixJQUFrQixFQUFFLFFBQWdCLEVBQUUsZUFBa0M7O1FBRTFFLElBQU0sVUFBVSxHQUFHLDZCQUFhLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFDTSxJQUFBLE1BQU0sR0FBd0IsVUFBVSxPQUFsQyxFQUFFLElBQUksR0FBa0IsVUFBVSxLQUE1QixFQUFFLFlBQVksR0FBSSxVQUFVLGFBQWQsQ0FBZTtRQUVoRCw4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QyxJQUFJO1lBQ2hELFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFlBQVk7Z0JBQ1YsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBVyxFQUFDO2dCQUM5QixFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLG1CQUFXLEVBQUM7Z0JBQy9CLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxvQkFBWSxFQUFDO2VBQzVCLHFCQUFxQjtnQkFDeEIsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSx3QkFBZ0IsRUFBQztlQUNqQyxnQkFBZ0IsQ0FDcEI7WUFDRCxhQUFhLGVBQUE7U0FDZCxDQUFDO0lBQ0osQ0FBQztJQWpDRCwwQ0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ0FuYWx5emVkTW9kdWxlc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2xvY2F0ZVN5bWJvbHN9IGZyb20gJy4vbG9jYXRlX3N5bWJvbCc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7aW5TcGFufSBmcm9tICcuL3V0aWxzJztcblxuLy8gUmV2ZXJzZSBtYXBwaW5ncyBvZiBlbnVtIHdvdWxkIGdlbmVyYXRlIHN0cmluZ3NcbmV4cG9ydCBjb25zdCBTWU1CT0xfU1BBQ0UgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnNwYWNlXTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuZXhwb3J0IGNvbnN0IFNZTUJPTF9URVhUID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC50ZXh0XTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfSU5URVJGQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5pbnRlcmZhY2VOYW1lXTtcbmV4cG9ydCBjb25zdCBBTElBU19OQU1FID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5hbGlhc05hbWVdO1xuXG4vKipcbiAqIFRyYXZlcnNlIHRoZSB0ZW1wbGF0ZSBBU1QgYW5kIGxvb2sgZm9yIHRoZSBzeW1ib2wgbG9jYXRlZCBhdCBgcG9zaXRpb25gLCB0aGVuXG4gKiByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcXVpY2sgaW5mby5cbiAqIEBwYXJhbSBpbmZvIHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIG9mIHRoZSBzeW1ib2xcbiAqIEBwYXJhbSBhbmFseXplZE1vZHVsZXMgYWxsIE5nTW9kdWxlcyBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSG92ZXIoXG4gICAgaW5mbzogbmcuQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyLCBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogdHMuUXVpY2tJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN5bWJvbEluZm8gPSBsb2NhdGVTeW1ib2xzKGluZm8sIHBvc2l0aW9uKVswXTtcbiAgaWYgKCFzeW1ib2xJbmZvKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHtzeW1ib2wsIHNwYW4sIHN0YXRpY1N5bWJvbH0gPSBzeW1ib2xJbmZvO1xuXG4gIC8vIFRoZSBjb250YWluZXIgaXMgZWl0aGVyIHRoZSBzeW1ib2wncyBjb250YWluZXIgKGZvciBleGFtcGxlLCAnQXBwQ29tcG9uZW50J1xuICAvLyBpcyB0aGUgY29udGFpbmVyIG9mIHRoZSBzeW1ib2wgJ3RpdGxlJyBpbiBpdHMgdGVtcGxhdGUpIG9yIHRoZSBOZ01vZHVsZVxuICAvLyB0aGF0IHRoZSBkaXJlY3RpdmUgYmVsb25ncyB0byAodGhlIGNvbnRhaW5lciBvZiBBcHBDb21wb25lbnQgaXMgQXBwTW9kdWxlKS5cbiAgbGV0IGNvbnRhaW5lck5hbWU6IHN0cmluZ3x1bmRlZmluZWQgPSBzeW1ib2wuY29udGFpbmVyPy5uYW1lO1xuICBpZiAoIWNvbnRhaW5lck5hbWUgJiYgc3RhdGljU3ltYm9sKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgYSBzdGF0aWMgc3ltYm9sIHRoZW4gdGhlIHRhcmdldCBpcyBhIGRpcmVjdGl2ZS5cbiAgICBjb25zdCBuZ01vZHVsZSA9IGFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChzdGF0aWNTeW1ib2wpO1xuICAgIGNvbnRhaW5lck5hbWUgPSBuZ01vZHVsZT8udHlwZS5yZWZlcmVuY2UubmFtZTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVRdWlja0luZm8oXG4gICAgICBzeW1ib2wubmFtZSwgc3ltYm9sLmtpbmQsIHNwYW4sIGNvbnRhaW5lck5hbWUsIHN5bWJvbC50eXBlPy5uYW1lLCBzeW1ib2wuZG9jdW1lbnRhdGlvbik7XG59XG5cbi8qKlxuICogR2V0IHF1aWNrIGluZm8gZm9yIEFuZ3VsYXIgc2VtYW50aWMgZW50aXRpZXMgaW4gVHlwZVNjcmlwdCBmaWxlcywgbGlrZSBEaXJlY3RpdmVzLlxuICogQHBhcmFtIHBvc2l0aW9uIGxvY2F0aW9uIG9mIHRoZSBzeW1ib2wgaW4gdGhlIHNvdXJjZSBmaWxlXG4gKiBAcGFyYW0gZGVjbGFyYXRpb25zIEFsbCBEaXJlY3RpdmUtbGlrZSBkZWNsYXJhdGlvbnMgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICogQHBhcmFtIGFuYWx5emVkTW9kdWxlcyBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHNIb3ZlcihcbiAgICBwb3NpdGlvbjogbnVtYmVyLCBkZWNsYXJhdGlvbnM6IG5nLkRlY2xhcmF0aW9uW10sXG4gICAgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyk6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICBmb3IgKGNvbnN0IHtkZWNsYXJhdGlvblNwYW4sIG1ldGFkYXRhfSBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICBpZiAoaW5TcGFuKHBvc2l0aW9uLCBkZWNsYXJhdGlvblNwYW4pKSB7XG4gICAgICBjb25zdCBzdGF0aWNTeW1ib2w6IG5nLlN0YXRpY1N5bWJvbCA9IG1ldGFkYXRhLnR5cGUucmVmZXJlbmNlO1xuICAgICAgY29uc3QgZGlyZWN0aXZlTmFtZSA9IHN0YXRpY1N5bWJvbC5uYW1lO1xuICAgICAgY29uc3Qga2luZCA9IG1ldGFkYXRhLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJztcbiAgICAgIGNvbnN0IHRleHRTcGFuID0gdHMuY3JlYXRlVGV4dFNwYW5Gcm9tQm91bmRzKGRlY2xhcmF0aW9uU3Bhbi5zdGFydCwgZGVjbGFyYXRpb25TcGFuLmVuZCk7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IGFuYWx5emVkTW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmdldChzdGF0aWNTeW1ib2wpO1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IG5nTW9kdWxlPy50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICAgICAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICAgICBkaXJlY3RpdmVOYW1lLCBraW5kLCB0ZXh0U3BhbiwgbW9kdWxlTmFtZSwgdHMuU2NyaXB0RWxlbWVudEtpbmQuY2xhc3NFbGVtZW50KTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBRdWlja0luZm8gb2JqZWN0IHRha2luZyBpbnRvIGFjY291bnQgaXRzIGNvbnRhaW5lciBhbmQgdHlwZS5cbiAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgdGhlIFF1aWNrSW5mbyB0YXJnZXRcbiAqIEBwYXJhbSBraW5kIGNvbXBvbmVudCwgZGlyZWN0aXZlLCBwaXBlLCBldGMuXG4gKiBAcGFyYW0gdGV4dFNwYW4gc3BhbiBvZiB0aGUgdGFyZ2V0XG4gKiBAcGFyYW0gY29udGFpbmVyTmFtZSBlaXRoZXIgdGhlIFN5bWJvbCdzIGNvbnRhaW5lciBvciB0aGUgTmdNb2R1bGUgdGhhdCBjb250YWlucyB0aGUgZGlyZWN0aXZlXG4gKiBAcGFyYW0gdHlwZSB1c2VyLWZyaWVuZGx5IG5hbWUgb2YgdGhlIHR5cGVcbiAqIEBwYXJhbSBkb2N1bWVudGF0aW9uIGRvY3N0cmluZyBvciBjb21tZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVRdWlja0luZm8oXG4gICAgbmFtZTogc3RyaW5nLCBraW5kOiBzdHJpbmcsIHRleHRTcGFuOiB0cy5UZXh0U3BhbiwgY29udGFpbmVyTmFtZT86IHN0cmluZywgdHlwZT86IHN0cmluZyxcbiAgICBkb2N1bWVudGF0aW9uPzogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSk6IHRzLlF1aWNrSW5mbyB7XG4gIGNvbnN0IGNvbnRhaW5lckRpc3BsYXlQYXJ0cyA9IGNvbnRhaW5lck5hbWUgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogY29udGFpbmVyTmFtZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICAgIHt0ZXh0OiAnLicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIF0gOlxuICAgICAgW107XG5cbiAgY29uc3QgdHlwZURpc3BsYXlQYXJ0cyA9IHR5cGUgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogJzonLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICAgIHt0ZXh0OiB0eXBlLCBraW5kOiBTWU1CT0xfSU5URVJGQUNFfSxcbiAgICAgIF0gOlxuICAgICAgW107XG5cbiAgcmV0dXJuIHtcbiAgICBraW5kOiBraW5kIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgIGtpbmRNb2RpZmllcnM6IHRzLlNjcmlwdEVsZW1lbnRLaW5kTW9kaWZpZXIubm9uZSxcbiAgICB0ZXh0U3BhbjogdGV4dFNwYW4sXG4gICAgZGlzcGxheVBhcnRzOiBbXG4gICAgICB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDoga2luZCwga2luZDogU1lNQk9MX1RFWFR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIC4uLmNvbnRhaW5lckRpc3BsYXlQYXJ0cyxcbiAgICAgIHt0ZXh0OiBuYW1lLCBraW5kOiBTWU1CT0xfSU5URVJGQUNFfSxcbiAgICAgIC4uLnR5cGVEaXNwbGF5UGFydHMsXG4gICAgXSxcbiAgICBkb2N1bWVudGF0aW9uLFxuICB9O1xufVxuIl19