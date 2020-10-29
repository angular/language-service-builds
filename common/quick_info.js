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
        define("@angular/language-service/common/quick_info", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createQuickInfo = exports.SYMBOL_TEXT = exports.SYMBOL_SPACE = exports.SYMBOL_PUNC = exports.SYMBOL_INTERFACE = exports.ALIAS_NAME = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    // Reverse mappings of enum would generate strings
    exports.ALIAS_NAME = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.aliasName];
    exports.SYMBOL_INTERFACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.interfaceName];
    exports.SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    exports.SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    exports.SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tfaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvY29tbW9uL3F1aWNrX2luZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxrREFBa0Q7SUFDckMsUUFBQSxVQUFVLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxRSxRQUFBLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDcEYsUUFBQSxXQUFXLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RSxRQUFBLFlBQVksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hFLFFBQUEsV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbkY7Ozs7Ozs7O09BUUc7SUFDSCxTQUFnQixlQUFlLENBQzNCLElBQVksRUFBRSxJQUFZLEVBQUUsUUFBcUIsRUFBRSxhQUFzQixFQUFFLElBQWEsRUFDeEYsYUFBc0M7UUFDeEMsSUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsQ0FBQztZQUN6QztnQkFDRSxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLHdCQUFnQixFQUFDO2dCQUM3QyxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFXLEVBQUM7YUFDL0IsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDO1FBRVAsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUMzQjtnQkFDRSxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFXLEVBQUM7Z0JBQzlCLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsb0JBQVksRUFBQztnQkFDL0IsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSx3QkFBZ0IsRUFBQzthQUNyQyxDQUFDLENBQUM7WUFDSCxFQUFFLENBQUM7UUFFUCxPQUFPO1lBQ0wsSUFBSSxFQUFFLElBQTRCO1lBQ2xDLGFBQWEsRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSTtZQUNoRCxRQUFRLEVBQUUsUUFBUTtZQUNsQixZQUFZO2dCQUNWLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQVcsRUFBQztnQkFDOUIsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxtQkFBVyxFQUFDO2dCQUMvQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG1CQUFXLEVBQUM7Z0JBQzlCLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsb0JBQVksRUFBQztlQUM1QixxQkFBcUI7Z0JBQ3hCLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsd0JBQWdCLEVBQUM7ZUFDakMsZ0JBQWdCLENBQ3BCO1lBQ0QsYUFBYSxlQUFBO1NBQ2QsQ0FBQztJQUNKLENBQUM7SUFqQ0QsMENBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vLyBSZXZlcnNlIG1hcHBpbmdzIG9mIGVudW0gd291bGQgZ2VuZXJhdGUgc3RyaW5nc1xuZXhwb3J0IGNvbnN0IEFMSUFTX05BTUUgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLmFsaWFzTmFtZV07XG5leHBvcnQgY29uc3QgU1lNQk9MX0lOVEVSRkFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuaW50ZXJmYWNlTmFtZV07XG5leHBvcnQgY29uc3QgU1lNQk9MX1BVTkMgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnB1bmN0dWF0aW9uXTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfU1BBQ0UgPSB0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmRbdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kLnNwYWNlXTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfVEVYVCA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQudGV4dF07XG5cbi8qKlxuICogQ29uc3RydWN0IGEgUXVpY2tJbmZvIG9iamVjdCB0YWtpbmcgaW50byBhY2NvdW50IGl0cyBjb250YWluZXIgYW5kIHR5cGUuXG4gKiBAcGFyYW0gbmFtZSBOYW1lIG9mIHRoZSBRdWlja0luZm8gdGFyZ2V0XG4gKiBAcGFyYW0ga2luZCBjb21wb25lbnQsIGRpcmVjdGl2ZSwgcGlwZSwgZXRjLlxuICogQHBhcmFtIHRleHRTcGFuIHNwYW4gb2YgdGhlIHRhcmdldFxuICogQHBhcmFtIGNvbnRhaW5lck5hbWUgZWl0aGVyIHRoZSBTeW1ib2wncyBjb250YWluZXIgb3IgdGhlIE5nTW9kdWxlIHRoYXQgY29udGFpbnMgdGhlIGRpcmVjdGl2ZVxuICogQHBhcmFtIHR5cGUgdXNlci1mcmllbmRseSBuYW1lIG9mIHRoZSB0eXBlXG4gKiBAcGFyYW0gZG9jdW1lbnRhdGlvbiBkb2NzdHJpbmcgb3IgY29tbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUXVpY2tJbmZvKFxuICAgIG5hbWU6IHN0cmluZywga2luZDogc3RyaW5nLCB0ZXh0U3BhbjogdHMuVGV4dFNwYW4sIGNvbnRhaW5lck5hbWU/OiBzdHJpbmcsIHR5cGU/OiBzdHJpbmcsXG4gICAgZG9jdW1lbnRhdGlvbj86IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10pOiB0cy5RdWlja0luZm8ge1xuICBjb25zdCBjb250YWluZXJEaXNwbGF5UGFydHMgPSBjb250YWluZXJOYW1lID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6IGNvbnRhaW5lck5hbWUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgICB7dGV4dDogJy4nLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuXG4gIGNvbnN0IHR5cGVEaXNwbGF5UGFydHMgPSB0eXBlID9cbiAgICAgIFtcbiAgICAgICAge3RleHQ6ICc6Jywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgICB7dGV4dDogdHlwZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICBdIDpcbiAgICAgIFtdO1xuXG4gIHJldHVybiB7XG4gICAga2luZDoga2luZCBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgdGV4dFNwYW46IHRleHRTcGFuLFxuICAgIGRpc3BsYXlQYXJ0czogW1xuICAgICAge3RleHQ6ICcoJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6IGtpbmQsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICAgIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiAnICcsIGtpbmQ6IFNZTUJPTF9TUEFDRX0sXG4gICAgICAuLi5jb250YWluZXJEaXNwbGF5UGFydHMsXG4gICAgICB7dGV4dDogbmFtZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICAuLi50eXBlRGlzcGxheVBhcnRzLFxuICAgIF0sXG4gICAgZG9jdW1lbnRhdGlvbixcbiAgfTtcbn1cbiJdfQ==