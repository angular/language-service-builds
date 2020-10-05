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
        define("@angular/language-service/src/hover", ["require", "exports", "tslib", "typescript", "@angular/language-service/common/quick_info", "@angular/language-service/src/locate_symbol", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTsHover = exports.getTemplateHover = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var quick_info_1 = require("@angular/language-service/common/quick_info");
    var locate_symbol_1 = require("@angular/language-service/src/locate_symbol");
    var utils_1 = require("@angular/language-service/src/utils");
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
        return quick_info_1.createQuickInfo(symbol.name, symbol.kind, span, containerName, (_b = symbol.type) === null || _b === void 0 ? void 0 : _b.name, symbol.documentation);
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
                    return quick_info_1.createQuickInfo(directiveName, kind, textSpan, moduleName, ts.ScriptElementKind.classElement);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9ob3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDBFQUFxRDtJQUVyRCw2RUFBOEM7SUFFOUMsNkRBQStCO0lBRS9COzs7Ozs7T0FNRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixJQUFrQixFQUFFLFFBQWdCLEVBQUUsZUFBa0M7O1FBRTFFLElBQU0sVUFBVSxHQUFHLDZCQUFhLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPO1NBQ1I7UUFDTSxJQUFBLE1BQU0sR0FBd0IsVUFBVSxPQUFsQyxFQUFFLElBQUksR0FBa0IsVUFBVSxLQUE1QixFQUFFLFlBQVksR0FBSSxVQUFVLGFBQWQsQ0FBZTtRQUVoRCw4RUFBOEU7UUFDOUUsMEVBQTBFO1FBQzFFLDhFQUE4RTtRQUM5RSxJQUFJLGFBQWEsU0FBcUIsTUFBTSxDQUFDLFNBQVMsMENBQUUsSUFBSSxDQUFDO1FBQzdELElBQUksQ0FBQyxhQUFhLElBQUksWUFBWSxFQUFFO1lBQ2xDLDhEQUE4RDtZQUM5RCxJQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdFLGFBQWEsR0FBRyxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7U0FDL0M7UUFFRCxPQUFPLDRCQUFlLENBQ2xCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsYUFBYSxRQUFFLE1BQU0sQ0FBQyxJQUFJLDBDQUFFLElBQUksRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQXJCRCw0Q0FxQkM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLFVBQVUsQ0FDdEIsUUFBZ0IsRUFBRSxZQUE4QixFQUNoRCxlQUFrQzs7O1lBQ3BDLEtBQTBDLElBQUEsaUJBQUEsaUJBQUEsWUFBWSxDQUFBLDBDQUFBLG9FQUFFO2dCQUE3QyxJQUFBLDJCQUEyQixFQUExQixlQUFlLHFCQUFBLEVBQUUsUUFBUSxjQUFBO2dCQUNuQyxJQUFJLGNBQU0sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLEVBQUU7b0JBQ3JDLElBQU0sWUFBWSxHQUFvQixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDOUQsSUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztvQkFDeEMsSUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7b0JBQzlELElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDekYsSUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDN0UsSUFBTSxVQUFVLEdBQUcsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO29CQUNqRCxPQUFPLDRCQUFlLENBQ2xCLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7aUJBQ25GO2FBQ0Y7Ozs7Ozs7OztJQUNILENBQUM7SUFmRCxnQ0FlQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQW5hbHl6ZWRNb2R1bGVzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtjcmVhdGVRdWlja0luZm99IGZyb20gJy4uL2NvbW1vbi9xdWlja19pbmZvJztcblxuaW1wb3J0IHtsb2NhdGVTeW1ib2xzfSBmcm9tICcuL2xvY2F0ZV9zeW1ib2wnO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2luU3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogVHJhdmVyc2UgdGhlIHRlbXBsYXRlIEFTVCBhbmQgbG9vayBmb3IgdGhlIHN5bWJvbCBsb2NhdGVkIGF0IGBwb3NpdGlvbmAsIHRoZW5cbiAqIHJldHVybiB0aGUgY29ycmVzcG9uZGluZyBxdWljayBpbmZvLlxuICogQHBhcmFtIGluZm8gdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbFxuICogQHBhcmFtIGFuYWx5emVkTW9kdWxlcyBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVIb3ZlcihcbiAgICBpbmZvOiBuZy5Bc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGFuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMpOiB0cy5RdWlja0luZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3Qgc3ltYm9sSW5mbyA9IGxvY2F0ZVN5bWJvbHMoaW5mbywgcG9zaXRpb24pWzBdO1xuICBpZiAoIXN5bWJvbEluZm8pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qge3N5bWJvbCwgc3Bhbiwgc3RhdGljU3ltYm9sfSA9IHN5bWJvbEluZm87XG5cbiAgLy8gVGhlIGNvbnRhaW5lciBpcyBlaXRoZXIgdGhlIHN5bWJvbCdzIGNvbnRhaW5lciAoZm9yIGV4YW1wbGUsICdBcHBDb21wb25lbnQnXG4gIC8vIGlzIHRoZSBjb250YWluZXIgb2YgdGhlIHN5bWJvbCAndGl0bGUnIGluIGl0cyB0ZW1wbGF0ZSkgb3IgdGhlIE5nTW9kdWxlXG4gIC8vIHRoYXQgdGhlIGRpcmVjdGl2ZSBiZWxvbmdzIHRvICh0aGUgY29udGFpbmVyIG9mIEFwcENvbXBvbmVudCBpcyBBcHBNb2R1bGUpLlxuICBsZXQgY29udGFpbmVyTmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHN5bWJvbC5jb250YWluZXI/Lm5hbWU7XG4gIGlmICghY29udGFpbmVyTmFtZSAmJiBzdGF0aWNTeW1ib2wpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhIHN0YXRpYyBzeW1ib2wgdGhlbiB0aGUgdGFyZ2V0IGlzIGEgZGlyZWN0aXZlLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHN0YXRpY1N5bWJvbCk7XG4gICAgY29udGFpbmVyTmFtZSA9IG5nTW9kdWxlPy50eXBlLnJlZmVyZW5jZS5uYW1lO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgIHN5bWJvbC5uYW1lLCBzeW1ib2wua2luZCwgc3BhbiwgY29udGFpbmVyTmFtZSwgc3ltYm9sLnR5cGU/Lm5hbWUsIHN5bWJvbC5kb2N1bWVudGF0aW9uKTtcbn1cblxuLyoqXG4gKiBHZXQgcXVpY2sgaW5mbyBmb3IgQW5ndWxhciBzZW1hbnRpYyBlbnRpdGllcyBpbiBUeXBlU2NyaXB0IGZpbGVzLCBsaWtlIERpcmVjdGl2ZXMuXG4gKiBAcGFyYW0gcG9zaXRpb24gbG9jYXRpb24gb2YgdGhlIHN5bWJvbCBpbiB0aGUgc291cmNlIGZpbGVcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbnMgQWxsIERpcmVjdGl2ZS1saWtlIGRlY2xhcmF0aW9ucyBpbiB0aGUgc291cmNlIGZpbGUuXG4gKiBAcGFyYW0gYW5hbHl6ZWRNb2R1bGVzIGFsbCBOZ01vZHVsZXMgaW4gdGhlIHByb2dyYW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0hvdmVyKFxuICAgIHBvc2l0aW9uOiBudW1iZXIsIGRlY2xhcmF0aW9uczogbmcuRGVjbGFyYXRpb25bXSxcbiAgICBhbmFseXplZE1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gIGZvciAoY29uc3Qge2RlY2xhcmF0aW9uU3BhbiwgbWV0YWRhdGF9IG9mIGRlY2xhcmF0aW9ucykge1xuICAgIGlmIChpblNwYW4ocG9zaXRpb24sIGRlY2xhcmF0aW9uU3BhbikpIHtcbiAgICAgIGNvbnN0IHN0YXRpY1N5bWJvbDogbmcuU3RhdGljU3ltYm9sID0gbWV0YWRhdGEudHlwZS5yZWZlcmVuY2U7XG4gICAgICBjb25zdCBkaXJlY3RpdmVOYW1lID0gc3RhdGljU3ltYm9sLm5hbWU7XG4gICAgICBjb25zdCBraW5kID0gbWV0YWRhdGEuaXNDb21wb25lbnQgPyAnY29tcG9uZW50JyA6ICdkaXJlY3RpdmUnO1xuICAgICAgY29uc3QgdGV4dFNwYW4gPSB0cy5jcmVhdGVUZXh0U3BhbkZyb21Cb3VuZHMoZGVjbGFyYXRpb25TcGFuLnN0YXJ0LCBkZWNsYXJhdGlvblNwYW4uZW5kKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlID0gYW5hbHl6ZWRNb2R1bGVzLm5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmUuZ2V0KHN0YXRpY1N5bWJvbCk7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gbmdNb2R1bGU/LnR5cGUucmVmZXJlbmNlLm5hbWU7XG4gICAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICAgIGRpcmVjdGl2ZU5hbWUsIGtpbmQsIHRleHRTcGFuLCBtb2R1bGVOYW1lLCB0cy5TY3JpcHRFbGVtZW50S2luZC5jbGFzc0VsZW1lbnQpO1xuICAgIH1cbiAgfVxufVxuIl19