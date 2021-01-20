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
        define("@angular/language-service/ivy/display_parts", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.unsafeCastDisplayInfoKindToScriptElementKind = exports.createDisplayParts = exports.getDisplayInfo = exports.DisplayInfoKind = exports.SYMBOL_TEXT = exports.SYMBOL_SPACE = exports.SYMBOL_PUNC = exports.SYMBOL_INTERFACE = exports.ALIAS_NAME = void 0;
    var tslib_1 = require("tslib");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var ts = require("typescript");
    // Reverse mappings of enum would generate strings
    exports.ALIAS_NAME = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.aliasName];
    exports.SYMBOL_INTERFACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.interfaceName];
    exports.SYMBOL_PUNC = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.punctuation];
    exports.SYMBOL_SPACE = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.space];
    exports.SYMBOL_TEXT = ts.SymbolDisplayPartKind[ts.SymbolDisplayPartKind.text];
    /**
     * Label for various kinds of Angular entities for TS display info.
     */
    var DisplayInfoKind;
    (function (DisplayInfoKind) {
        DisplayInfoKind["COMPONENT"] = "component";
        DisplayInfoKind["DIRECTIVE"] = "directive";
        DisplayInfoKind["EVENT"] = "event";
        DisplayInfoKind["REFERENCE"] = "reference";
        DisplayInfoKind["ELEMENT"] = "element";
        DisplayInfoKind["VARIABLE"] = "variable";
        DisplayInfoKind["PIPE"] = "pipe";
        DisplayInfoKind["PROPERTY"] = "property";
        DisplayInfoKind["METHOD"] = "method";
        DisplayInfoKind["TEMPLATE"] = "template";
    })(DisplayInfoKind = exports.DisplayInfoKind || (exports.DisplayInfoKind = {}));
    function getDisplayInfo(tsLS, typeChecker, symbol) {
        var kind;
        if (symbol.kind === api_1.SymbolKind.Reference) {
            kind = DisplayInfoKind.REFERENCE;
        }
        else if (symbol.kind === api_1.SymbolKind.Variable) {
            kind = DisplayInfoKind.VARIABLE;
        }
        else {
            throw new Error("AssertionError: unexpected symbol kind " + api_1.SymbolKind[symbol.kind]);
        }
        var displayParts = createDisplayParts(symbol.declaration.name, kind, /* containerName */ undefined, typeChecker.typeToString(symbol.tsType));
        var documentation = symbol.kind === api_1.SymbolKind.Reference ?
            getDocumentationFromTypeDefAtLocation(tsLS, symbol.targetLocation) :
            getDocumentationFromTypeDefAtLocation(tsLS, symbol.initializerLocation);
        return {
            kind: kind,
            displayParts: displayParts,
            documentation: documentation,
        };
    }
    exports.getDisplayInfo = getDisplayInfo;
    /**
     * Construct a compound `ts.SymbolDisplayPart[]` which incorporates the container and type of a
     * target declaration.
     * @param name Name of the target
     * @param kind component, directive, pipe, etc.
     * @param containerName either the Symbol's container or the NgModule that contains the directive
     * @param type user-friendly name of the type
     * @param documentation docstring or comment
     */
    function createDisplayParts(name, kind, containerName, type) {
        var containerDisplayParts = containerName !== undefined ?
            [
                { text: containerName, kind: exports.SYMBOL_INTERFACE },
                { text: '.', kind: exports.SYMBOL_PUNC },
            ] :
            [];
        var typeDisplayParts = type !== undefined ?
            [
                { text: ':', kind: exports.SYMBOL_PUNC },
                { text: ' ', kind: exports.SYMBOL_SPACE },
                { text: type, kind: exports.SYMBOL_INTERFACE },
            ] :
            [];
        return tslib_1.__spread([
            { text: '(', kind: exports.SYMBOL_PUNC },
            { text: kind, kind: exports.SYMBOL_TEXT },
            { text: ')', kind: exports.SYMBOL_PUNC },
            { text: ' ', kind: exports.SYMBOL_SPACE }
        ], containerDisplayParts, [
            { text: name, kind: exports.SYMBOL_INTERFACE }
        ], typeDisplayParts);
    }
    exports.createDisplayParts = createDisplayParts;
    /**
     * Convert a `SymbolDisplayInfoKind` to a `ts.ScriptElementKind` type, allowing it to pass through
     * TypeScript APIs.
     *
     * In practice, this is an "illegal" type cast. Since `ts.ScriptElementKind` is a string, this is
     * safe to do if TypeScript only uses the value in a string context. Consumers of this conversion
     * function are responsible for ensuring this is the case.
     */
    function unsafeCastDisplayInfoKindToScriptElementKind(kind) {
        return kind;
    }
    exports.unsafeCastDisplayInfoKindToScriptElementKind = unsafeCastDisplayInfoKindToScriptElementKind;
    function getDocumentationFromTypeDefAtLocation(tsLS, shimLocation) {
        var _a;
        var typeDefs = tsLS.getTypeDefinitionAtPosition(shimLocation.shimPath, shimLocation.positionInShimFile);
        if (typeDefs === undefined || typeDefs.length === 0) {
            return undefined;
        }
        return (_a = tsLS.getQuickInfoAtPosition(typeDefs[0].fileName, typeDefs[0].textSpan.start)) === null || _a === void 0 ? void 0 : _a.documentation;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzcGxheV9wYXJ0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L2Rpc3BsYXlfcGFydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILHFFQUFnSTtJQUNoSSwrQkFBaUM7SUFHakMsa0RBQWtEO0lBQ3JDLFFBQUEsVUFBVSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUUsUUFBQSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3BGLFFBQUEsV0FBVyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDN0UsUUFBQSxZQUFZLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4RSxRQUFBLFdBQVcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBR25GOztPQUVHO0lBQ0gsSUFBWSxlQVdYO0lBWEQsV0FBWSxlQUFlO1FBQ3pCLDBDQUF1QixDQUFBO1FBQ3ZCLDBDQUF1QixDQUFBO1FBQ3ZCLGtDQUFlLENBQUE7UUFDZiwwQ0FBdUIsQ0FBQTtRQUN2QixzQ0FBbUIsQ0FBQTtRQUNuQix3Q0FBcUIsQ0FBQTtRQUNyQixnQ0FBYSxDQUFBO1FBQ2Isd0NBQXFCLENBQUE7UUFDckIsb0NBQWlCLENBQUE7UUFDakIsd0NBQXFCLENBQUE7SUFDdkIsQ0FBQyxFQVhXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBVzFCO0lBUUQsU0FB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LENBQUM7UUFDN0YsSUFBSSxRQUFRLEtBQUssU0FBUyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ25ELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsYUFBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQywwQ0FDOUUsYUFBYSxDQUFDO0lBQ3RCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSZWZlcmVuY2VTeW1ib2wsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBTeW1ib2xLaW5kLCBWYXJpYWJsZVN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5cbi8vIFJldmVyc2UgbWFwcGluZ3Mgb2YgZW51bSB3b3VsZCBnZW5lcmF0ZSBzdHJpbmdzXG5leHBvcnQgY29uc3QgQUxJQVNfTkFNRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuYWxpYXNOYW1lXTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfSU5URVJGQUNFID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC5pbnRlcmZhY2VOYW1lXTtcbmV4cG9ydCBjb25zdCBTWU1CT0xfUFVOQyA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQucHVuY3R1YXRpb25dO1xuZXhwb3J0IGNvbnN0IFNZTUJPTF9TUEFDRSA9IHRzLlN5bWJvbERpc3BsYXlQYXJ0S2luZFt0cy5TeW1ib2xEaXNwbGF5UGFydEtpbmQuc3BhY2VdO1xuZXhwb3J0IGNvbnN0IFNZTUJPTF9URVhUID0gdHMuU3ltYm9sRGlzcGxheVBhcnRLaW5kW3RzLlN5bWJvbERpc3BsYXlQYXJ0S2luZC50ZXh0XTtcblxuXG4vKipcbiAqIExhYmVsIGZvciB2YXJpb3VzIGtpbmRzIG9mIEFuZ3VsYXIgZW50aXRpZXMgZm9yIFRTIGRpc3BsYXkgaW5mby5cbiAqL1xuZXhwb3J0IGVudW0gRGlzcGxheUluZm9LaW5kIHtcbiAgQ09NUE9ORU5UID0gJ2NvbXBvbmVudCcsXG4gIERJUkVDVElWRSA9ICdkaXJlY3RpdmUnLFxuICBFVkVOVCA9ICdldmVudCcsXG4gIFJFRkVSRU5DRSA9ICdyZWZlcmVuY2UnLFxuICBFTEVNRU5UID0gJ2VsZW1lbnQnLFxuICBWQVJJQUJMRSA9ICd2YXJpYWJsZScsXG4gIFBJUEUgPSAncGlwZScsXG4gIFBST1BFUlRZID0gJ3Byb3BlcnR5JyxcbiAgTUVUSE9EID0gJ21ldGhvZCcsXG4gIFRFTVBMQVRFID0gJ3RlbXBsYXRlJyxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXNwbGF5SW5mbyB7XG4gIGtpbmQ6IERpc3BsYXlJbmZvS2luZDtcbiAgZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdO1xuICBkb2N1bWVudGF0aW9uOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERpc3BsYXlJbmZvKFxuICAgIHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgIHN5bWJvbDogUmVmZXJlbmNlU3ltYm9sfFZhcmlhYmxlU3ltYm9sKTogRGlzcGxheUluZm8ge1xuICBsZXQga2luZDogRGlzcGxheUluZm9LaW5kO1xuICBpZiAoc3ltYm9sLmtpbmQgPT09IFN5bWJvbEtpbmQuUmVmZXJlbmNlKSB7XG4gICAga2luZCA9IERpc3BsYXlJbmZvS2luZC5SRUZFUkVOQ0U7XG4gIH0gZWxzZSBpZiAoc3ltYm9sLmtpbmQgPT09IFN5bWJvbEtpbmQuVmFyaWFibGUpIHtcbiAgICBraW5kID0gRGlzcGxheUluZm9LaW5kLlZBUklBQkxFO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEFzc2VydGlvbkVycm9yOiB1bmV4cGVjdGVkIHN5bWJvbCBraW5kICR7U3ltYm9sS2luZFsoc3ltYm9sIGFzIFN5bWJvbCkua2luZF19YCk7XG4gIH1cblxuICBjb25zdCBkaXNwbGF5UGFydHMgPSBjcmVhdGVEaXNwbGF5UGFydHMoXG4gICAgICBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSwga2luZCwgLyogY29udGFpbmVyTmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICB0eXBlQ2hlY2tlci50eXBlVG9TdHJpbmcoc3ltYm9sLnRzVHlwZSkpO1xuICBjb25zdCBkb2N1bWVudGF0aW9uID0gc3ltYm9sLmtpbmQgPT09IFN5bWJvbEtpbmQuUmVmZXJlbmNlID9cbiAgICAgIGdldERvY3VtZW50YXRpb25Gcm9tVHlwZURlZkF0TG9jYXRpb24odHNMUywgc3ltYm9sLnRhcmdldExvY2F0aW9uKSA6XG4gICAgICBnZXREb2N1bWVudGF0aW9uRnJvbVR5cGVEZWZBdExvY2F0aW9uKHRzTFMsIHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9uKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kLFxuICAgIGRpc3BsYXlQYXJ0cyxcbiAgICBkb2N1bWVudGF0aW9uLFxuICB9O1xufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGNvbXBvdW5kIGB0cy5TeW1ib2xEaXNwbGF5UGFydFtdYCB3aGljaCBpbmNvcnBvcmF0ZXMgdGhlIGNvbnRhaW5lciBhbmQgdHlwZSBvZiBhXG4gKiB0YXJnZXQgZGVjbGFyYXRpb24uXG4gKiBAcGFyYW0gbmFtZSBOYW1lIG9mIHRoZSB0YXJnZXRcbiAqIEBwYXJhbSBraW5kIGNvbXBvbmVudCwgZGlyZWN0aXZlLCBwaXBlLCBldGMuXG4gKiBAcGFyYW0gY29udGFpbmVyTmFtZSBlaXRoZXIgdGhlIFN5bWJvbCdzIGNvbnRhaW5lciBvciB0aGUgTmdNb2R1bGUgdGhhdCBjb250YWlucyB0aGUgZGlyZWN0aXZlXG4gKiBAcGFyYW0gdHlwZSB1c2VyLWZyaWVuZGx5IG5hbWUgb2YgdGhlIHR5cGVcbiAqIEBwYXJhbSBkb2N1bWVudGF0aW9uIGRvY3N0cmluZyBvciBjb21tZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXNwbGF5UGFydHMoXG4gICAgbmFtZTogc3RyaW5nLCBraW5kOiBEaXNwbGF5SW5mb0tpbmQsIGNvbnRhaW5lck5hbWU6IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgdHlwZTogc3RyaW5nfHVuZGVmaW5lZCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10ge1xuICBjb25zdCBjb250YWluZXJEaXNwbGF5UGFydHMgPSBjb250YWluZXJOYW1lICE9PSB1bmRlZmluZWQgP1xuICAgICAgW1xuICAgICAgICB7dGV4dDogY29udGFpbmVyTmFtZSwga2luZDogU1lNQk9MX0lOVEVSRkFDRX0sXG4gICAgICAgIHt0ZXh0OiAnLicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIF0gOlxuICAgICAgW107XG5cbiAgY29uc3QgdHlwZURpc3BsYXlQYXJ0cyA9IHR5cGUgIT09IHVuZGVmaW5lZCA/XG4gICAgICBbXG4gICAgICAgIHt0ZXh0OiAnOicsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgICAge3RleHQ6IHR5cGUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgICAgXSA6XG4gICAgICBbXTtcbiAgcmV0dXJuIFtcbiAgICB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAge3RleHQ6IGtpbmQsIGtpbmQ6IFNZTUJPTF9URVhUfSxcbiAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAuLi5jb250YWluZXJEaXNwbGF5UGFydHMsXG4gICAge3RleHQ6IG5hbWUsIGtpbmQ6IFNZTUJPTF9JTlRFUkZBQ0V9LFxuICAgIC4uLnR5cGVEaXNwbGF5UGFydHMsXG4gIF07XG59XG5cbi8qKlxuICogQ29udmVydCBhIGBTeW1ib2xEaXNwbGF5SW5mb0tpbmRgIHRvIGEgYHRzLlNjcmlwdEVsZW1lbnRLaW5kYCB0eXBlLCBhbGxvd2luZyBpdCB0byBwYXNzIHRocm91Z2hcbiAqIFR5cGVTY3JpcHQgQVBJcy5cbiAqXG4gKiBJbiBwcmFjdGljZSwgdGhpcyBpcyBhbiBcImlsbGVnYWxcIiB0eXBlIGNhc3QuIFNpbmNlIGB0cy5TY3JpcHRFbGVtZW50S2luZGAgaXMgYSBzdHJpbmcsIHRoaXMgaXNcbiAqIHNhZmUgdG8gZG8gaWYgVHlwZVNjcmlwdCBvbmx5IHVzZXMgdGhlIHZhbHVlIGluIGEgc3RyaW5nIGNvbnRleHQuIENvbnN1bWVycyBvZiB0aGlzIGNvbnZlcnNpb25cbiAqIGZ1bmN0aW9uIGFyZSByZXNwb25zaWJsZSBmb3IgZW5zdXJpbmcgdGhpcyBpcyB0aGUgY2FzZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKGtpbmQ6IERpc3BsYXlJbmZvS2luZCk6XG4gICAgdHMuU2NyaXB0RWxlbWVudEtpbmQge1xuICByZXR1cm4ga2luZCBhcyBzdHJpbmcgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQ7XG59XG5cbmZ1bmN0aW9uIGdldERvY3VtZW50YXRpb25Gcm9tVHlwZURlZkF0TG9jYXRpb24oXG4gICAgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbik6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W118dW5kZWZpbmVkIHtcbiAgY29uc3QgdHlwZURlZnMgPVxuICAgICAgdHNMUy5nZXRUeXBlRGVmaW5pdGlvbkF0UG9zaXRpb24oc2hpbUxvY2F0aW9uLnNoaW1QYXRoLCBzaGltTG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlKTtcbiAgaWYgKHR5cGVEZWZzID09PSB1bmRlZmluZWQgfHwgdHlwZURlZnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKHR5cGVEZWZzWzBdLmZpbGVOYW1lLCB0eXBlRGVmc1swXS50ZXh0U3Bhbi5zdGFydClcbiAgICAgID8uZG9jdW1lbnRhdGlvbjtcbn1cbiJdfQ==