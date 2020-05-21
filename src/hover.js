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
    exports.getTsHover = exports.getTemplateHover = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBQ2pDLDZFQUE4QztJQUU5Qyw2REFBK0I7SUFFL0Isa0RBQWtEO0lBQ2xELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRixJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVFLElBQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUUxRjs7Ozs7O09BTUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsSUFBa0IsRUFBRSxRQUFnQixFQUFFLGVBQWtDOztRQUUxRSxJQUFNLFVBQVUsR0FBRyw2QkFBYSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTztTQUNSO1FBQ00sSUFBQSxNQUFNLEdBQXdCLFVBQVUsT0FBbEMsRUFBRSxJQUFJLEdBQWtCLFVBQVUsS0FBNUIsRUFBRSxZQUFZLEdBQUksVUFBVSxhQUFkLENBQWU7UUFFaEQsOEVBQThFO1FBQzlFLDBFQUEwRTtRQUMxRSw4RUFBOEU7UUFDOUUsSUFBSSxhQUFhLFNBQXFCLE1BQU0sQ0FBQyxTQUFTLDBDQUFFLElBQUks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LEVBQUM7Z0JBQzlCLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDO2dCQUMvQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUM7ZUFDNUIscUJBQXFCO2dCQUN4QixFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFDO2VBQ2pDLGdCQUFnQixDQUNwQjtZQUNELGFBQWEsZUFBQTtTQUNkLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQW5hbHl6ZWRNb2R1bGVzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7bG9jYXRlU3ltYm9sc30gZnJvbSAnLi9sb2NhdGVfc3ltYm9sJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtpblNwYW59IGZyb20gJy4vdXRpbHMnO1xuXG4vLyBSZXZlcnNlIG1hcHBpbmdzIG9mIGVudW0gd291bGQgZ2VuZXJhdGUgc3RyaW5nc1xuY29uc3QgU1lNQk9MX1NQQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5zcGFjZV07XG5jb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuY29uc3QgU1lNQk9MX1RFWFQgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnRleHRdO1xuY29uc3QgU1lNQk9MX0lOVEVSRkFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuaW50ZXJmYWNlTmFtZV07XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiB0aGUgY29ycmVzcG9uZGluZyBxdWljayBpbmZvLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbFxuICogQHBhcmFtIGFuYWx5emVkTW9kdWxlcyBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVIb3ZlcihcbiAgICBpbmZvOiBuZy5Bc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiB0cy5RdWlja0luZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9sSW5mbyA9IGxvY2F0ZVN5bWJvbHMoaW5mbywgcG9zaXRpb24pWzBdO1xuICBpZiAoIXN5bWJvbEluZm8pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge3N5bWJvbCwgc3Bhbiwgc3RhdGljU3ltYm9sfSA9IHN5bWJvbEluZm87XG5cbiAgLy8gVGhlIGNvbnRhaW5lciBpcyBlaXRoZXIgdGhlIHN5bWJvbCdzIGNvbnRhaW5lciAoZm9yIGV4YW1wbGUsICdBcHBDb21wb25lbnQnXG4gIC8vIGlzIHRoZSBjb250YWluZXIgb2YgdGhlIHN5bWJvbCAndGl0bGUnIGluIGl0cyB0ZW1wbGF0ZSkgb3IgdGhlIE5nTW9kdWxlXG4gIC8vIHRoYXQgdGhlIGRpcmVjdGl2ZSBiZWxvbmdzIHRvICh0aGUgY29udGFpbmVyIG9mIEFwcENvbXBvbmVudCBpcyBBcHBNb2R1bGUpLlxuICBsZXQgY29udGFpbmVyTmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHN5bWJvbC5jb250YWluZXI/Lm5hbWU7XG4gIGlmICghY29udGFpbmVyTmFtZSAmJiBzdGF0aWNTeW1ib2wpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhIHN0YXRpYyBzeW1ib2wgdGhlbiB0aGUgdGFyZ2V0IGlzIGEgZGlyZWN0aXZlLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHN0YXRpY1N5bWJvbCk7XG4gICAgY29udGFpbmVyTmFtZSA9IG5nTW9kdWxlPy50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgIHN5bWJvbC5uYW1lLCBzeW1ib2wua2luZCwgc3BhbiwgY29udGFpbmVyTmFtZSwgc3ltYm9sLnR5cGU/Lm5hbWUsIHN5bWJvbC5kb2N1bWVudGF0aW9uKTtcbn1cblxuLyoqXG4gKiBHZXQgcXVpY2sgaW5mbyBmb3IgQW5ndWxhciBzZW1hbnRpYyBlbnRpdGllcyBpbiBUeXBlU2NyaXB0IGZpbGVzLCBsaWtlIERpcmVjdGl2ZXMuXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbCBpbiB0aGUgc291cmNlIGZpbGVcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbnMgQWxsIERpcmVjdGl2ZS1saWtlIGRlY2xhcmF0aW9ucyBpbiB0aGUgc291cmNlIGZpbGUuXG4gKiBAcGFyYW0gYW5hbHl6ZWRNb2R1bGVzIGFsbCBOZ01vZHVsZXMgaW4gdGhlIHByb2dyYW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hvdmVyKFxuICAgIHBvc2l0aW9uOiBudW1iZXIsIGRlY2xhcmF0aW9uczogbmcuRGVjbGFyYXRpb25bXSxcbiAgICBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGZvciAoY29uc3Qge2RlY2xhcmF0aW9uU3BhbiwgbWV0YWRhdGF9IG9mIGRlY2xhcmF0aW9ucykge1xuICAgIGlmIChpblNwYW4ocG9zaXRpb24sIGRlY2xhcmF0aW9uU3BhbikpIHtcbiAgICAgIGNvbnN0IHN0YXRpY1N5bWJvbDogbmcuU3RhdGljU3ltYm9sID0gbWV0YWRhdGEudHlwZS5yZWZlcmVuY2U7XG4gICAgICBjb25zdCBkaXJlY3RpdmVOYW1lID0gc3RhdGljU3ltYm9sLm5hbWU7XG4gICAgICBjb25zdCBraW5kID0gbWV0YWRhdGEuaXNDb21wb25lbnQgPyAnY29tcG9uZW50JyA6ICdkaXJlY3RpdmUnO1xuICAgICAgY29uc3QgdGV4dFNwYW4gPSB0cy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoZGVjbGFyYXRpb25TcGFuLnN0YXJ0LCBkZWNsYXJhdGlvblNwYW4uZW5kKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHN0YXRpY1N5bWJvbCk7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gbmdNb2R1bGU/LnR5cGUucmVmZXJlbmNlLm5hbWU7XG4gICAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICAgIGRpcmVjdGl2ZU5hbWUsIGtpbmQsIHRleHRTcGFuLCBtb2R1bGVOYW1lLCB0cy5TY3JpcHRFbGVtZW50S2luZC5jbGFzc0VsZW1lbnQpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIFF1aWNrSW5mbyBvYmplY3QgdGFraW5nIGludG8gYWNjb3VudCBpdHMgY29udGFpbmVyIGFuZCB0eXBlLlxuICogQHBhcmFtIG5hbWUgTmFtZSBvZiB0aGUgUXVpY2tJbmZvIHRhcmdldFxuICogQHBhcmFtIGtpbmQgY29tcG9uZW50LCBkaXJlY3RpdmUsIHBpcGUsIGV0Yy5cbiAqIEBwYXJhbSB0ZXh0U3BhbiBzcGFuIG9mIHRoZSB0YXJnZXRcbiAqIEBwYXJhbSBjb250YWluZXJOYW1lIGVpdGhlciB0aGUgU3ltYm9sJ3MgY29udGFpbmVyIG9yIHRoZSBOZ01vZHVsZSB0aGF0IGNvbnRhaW5zIHRoZSBkaXJlY3RpdmVcbiAqIEBwYXJhbSB0eXBlIHVzZXItZnJpZW5kbHkgbmFtZSBvZiB0aGUgdHlwZVxuICogQHBhcmFtIGRvY3VtZW50YXRpb24gZG9jc3RyaW5nIG9yIGNvbW1lbnRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlUXVpY2tJbmZvKFxuICAgIG5hbWU6IHN0cmluZywga2luZDogc3RyaW5nLCB0ZXh0U3BhbjogdHMuVGV4dFNwYW4sIGNvbnRhaW5lck5hbWU/OiBzdHJpbmcsIHR5cGU/OiBzdHJpbmcsXG4gICAgZG9jdW1lbnRhdGlvbj86IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10pOiB0cy5RdWlja0luZm8ge1xuICBjb25zdCBjb250YWluZXJEaXNwbGF5UGFydHMgPSBjb250YWluZXJOYW1lID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6IGNvbnRhaW5lck5hbWUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgICB7dGV4dDogJy4nLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuXG4gIGNvbnN0IHR5cGVEaXNwbGF5UGFydHMgPSB0eXBlID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6ICc6Jywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgICB7dGV4dDogdHlwZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuXG4gIHJldHVybiB7XG4gICAga2luZDoga2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgdGV4dFNwYW46IHRleHRTcGFuLFxuICAgIGRpc3BsYXlQYXJ0czogW1xuICAgICAge3RleHQ6ICcoJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IGtpbmQsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICAgIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICAuLi5jb250YWluZXJEaXNwbGF5UGFydHMsXG4gICAgICB7dGV4dDogbmFtZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICAuLi50eXBlRGlzcGxheVBhcnRzLFxuICAgIF0sXG4gICAgZG9jdW1lbnRhdGlvbixcbiAgfTtcbn1cbiJdfQ==