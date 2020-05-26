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
        define("@angular/language-service/src/binding_utils", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getBindingDescriptor = exports.ATTR = void 0;
    /**
     * Matches an Angular attribute to a binding type. See `ATTR` for more details.
     *
     * This is adapted from packages/compiler/src/render3/r3_template_transform.ts
     * to allow empty binding names and match template attributes.
     */
    var BIND_NAME_REGEXP = /^(?:(?:(?:(bind-)|(let-)|(ref-|#)|(on-)|(bindon-)|(@)|(\*))(.*))|\[\(([^\)]*)\)\]|\[([^\]]*)\]|\(([^\)]*)\))$/;
    /**
     * Represents possible Angular attribute bindings, as indices on a match of `BIND_NAME_REGEXP`.
     */
    var ATTR;
    (function (ATTR) {
        /** "bind-" */
        ATTR[ATTR["KW_BIND"] = 1] = "KW_BIND";
        /** "let-" */
        ATTR[ATTR["KW_LET"] = 2] = "KW_LET";
        /** "ref-/#" */
        ATTR[ATTR["KW_REF"] = 3] = "KW_REF";
        /** "on-" */
        ATTR[ATTR["KW_ON"] = 4] = "KW_ON";
        /** "bindon-" */
        ATTR[ATTR["KW_BINDON"] = 5] = "KW_BINDON";
        /** "@" */
        ATTR[ATTR["KW_AT"] = 6] = "KW_AT";
        /**
         * "*"
         * Microsyntax template starts with '*'. See https://angular.io/api/core/TemplateRef
         */
        ATTR[ATTR["KW_MICROSYNTAX"] = 7] = "KW_MICROSYNTAX";
        /** The identifier after "bind-", "let-", "ref-/#", "on-", "bindon-", "@", or "*" */
        ATTR[ATTR["IDENT_KW"] = 8] = "IDENT_KW";
        /** Identifier inside [()] */
        ATTR[ATTR["IDENT_BANANA_BOX"] = 9] = "IDENT_BANANA_BOX";
        /** Identifier inside [] */
        ATTR[ATTR["IDENT_PROPERTY"] = 10] = "IDENT_PROPERTY";
        /** Identifier inside () */
        ATTR[ATTR["IDENT_EVENT"] = 11] = "IDENT_EVENT";
    })(ATTR = exports.ATTR || (exports.ATTR = {}));
    /**
     * Returns a descriptor for a given Angular attribute, or undefined if the attribute is
     * not an Angular attribute.
     */
    function getBindingDescriptor(attribute) {
        var bindParts = attribute.match(BIND_NAME_REGEXP);
        if (!bindParts)
            return;
        // The first match element is skipped because it matches the entire attribute text, including the
        // binding part.
        var kind = bindParts.findIndex(function (val, i) { return i > 0 && val !== undefined; });
        if (!(kind in ATTR)) {
            throw TypeError("\"" + kind + "\" is not a valid Angular binding kind for \"" + attribute + "\"");
        }
        return {
            kind: kind,
            name: bindParts[ATTR.IDENT_KW],
        };
    }
    exports.getBindingDescriptor = getBindingDescriptor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluZGluZ191dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2JpbmRpbmdfdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUg7Ozs7O09BS0c7SUFDSCxJQUFNLGdCQUFnQixHQUNsQiwrR0FBK0csQ0FBQztJQUNwSDs7T0FFRztJQUNILElBQVksSUEwQlg7SUExQkQsV0FBWSxJQUFJO1FBQ2QsY0FBYztRQUNkLHFDQUFXLENBQUE7UUFDWCxhQUFhO1FBQ2IsbUNBQVUsQ0FBQTtRQUNWLGVBQWU7UUFDZixtQ0FBVSxDQUFBO1FBQ1YsWUFBWTtRQUNaLGlDQUFTLENBQUE7UUFDVCxnQkFBZ0I7UUFDaEIseUNBQWEsQ0FBQTtRQUNiLFVBQVU7UUFDVixpQ0FBUyxDQUFBO1FBQ1Q7OztXQUdHO1FBQ0gsbURBQWtCLENBQUE7UUFDbEIsb0ZBQW9GO1FBQ3BGLHVDQUFZLENBQUE7UUFDWiw2QkFBNkI7UUFDN0IsdURBQW9CLENBQUE7UUFDcEIsMkJBQTJCO1FBQzNCLG9EQUFtQixDQUFBO1FBQ25CLDJCQUEyQjtRQUMzQiw4Q0FBZ0IsQ0FBQTtJQUNsQixDQUFDLEVBMUJXLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQTBCZjtJQU1EOzs7T0FHRztJQUNILFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCO1FBQ3BELElBQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU87UUFDdkIsaUdBQWlHO1FBQ2pHLGdCQUFnQjtRQUNoQixJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLFVBQUMsR0FBRyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBMUIsQ0FBMEIsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNuQixNQUFNLFNBQVMsQ0FBQyxPQUFJLElBQUkscURBQThDLFNBQVMsT0FBRyxDQUFDLENBQUM7U0FDckY7UUFDRCxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBYkQsb0RBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogTWF0Y2hlcyBhbiBBbmd1bGFyIGF0dHJpYnV0ZSB0byBhIGJpbmRpbmcgdHlwZS4gU2VlIGBBVFRSYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFRoaXMgaXMgYWRhcHRlZCBmcm9tIHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX3RlbXBsYXRlX3RyYW5zZm9ybS50c1xuICogdG8gYWxsb3cgZW1wdHkgYmluZGluZyBuYW1lcyBhbmQgbWF0Y2ggdGVtcGxhdGUgYXR0cmlidXRlcy5cbiAqL1xuY29uc3QgQklORF9OQU1FX1JFR0VYUCA9XG4gICAgL14oPzooPzooPzooYmluZC0pfChsZXQtKXwocmVmLXwjKXwob24tKXwoYmluZG9uLSl8KEApfChcXCopKSguKikpfFxcW1xcKChbXlxcKV0qKVxcKVxcXXxcXFsoW15cXF1dKilcXF18XFwoKFteXFwpXSopXFwpKSQvO1xuLyoqXG4gKiBSZXByZXNlbnRzIHBvc3NpYmxlIEFuZ3VsYXIgYXR0cmlidXRlIGJpbmRpbmdzLCBhcyBpbmRpY2VzIG9uIGEgbWF0Y2ggb2YgYEJJTkRfTkFNRV9SRUdFWFBgLlxuICovXG5leHBvcnQgZW51bSBBVFRSIHtcbiAgLyoqIFwiYmluZC1cIiAqL1xuICBLV19CSU5EID0gMSxcbiAgLyoqIFwibGV0LVwiICovXG4gIEtXX0xFVCA9IDIsXG4gIC8qKiBcInJlZi0vI1wiICovXG4gIEtXX1JFRiA9IDMsXG4gIC8qKiBcIm9uLVwiICovXG4gIEtXX09OID0gNCxcbiAgLyoqIFwiYmluZG9uLVwiICovXG4gIEtXX0JJTkRPTiA9IDUsXG4gIC8qKiBcIkBcIiAqL1xuICBLV19BVCA9IDYsXG4gIC8qKlxuICAgKiBcIipcIlxuICAgKiBNaWNyb3N5bnRheCB0ZW1wbGF0ZSBzdGFydHMgd2l0aCAnKicuIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvVGVtcGxhdGVSZWZcbiAgICovXG4gIEtXX01JQ1JPU1lOVEFYID0gNyxcbiAgLyoqIFRoZSBpZGVudGlmaWVyIGFmdGVyIFwiYmluZC1cIiwgXCJsZXQtXCIsIFwicmVmLS8jXCIsIFwib24tXCIsIFwiYmluZG9uLVwiLCBcIkBcIiwgb3IgXCIqXCIgKi9cbiAgSURFTlRfS1cgPSA4LFxuICAvKiogSWRlbnRpZmllciBpbnNpZGUgWygpXSAqL1xuICBJREVOVF9CQU5BTkFfQk9YID0gOSxcbiAgLyoqIElkZW50aWZpZXIgaW5zaWRlIFtdICovXG4gIElERU5UX1BST1BFUlRZID0gMTAsXG4gIC8qKiBJZGVudGlmaWVyIGluc2lkZSAoKSAqL1xuICBJREVOVF9FVkVOVCA9IDExLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJpbmRpbmdEZXNjcmlwdG9yIHtcbiAga2luZDogQVRUUjtcbiAgbmFtZTogc3RyaW5nO1xufVxuLyoqXG4gKiBSZXR1cm5zIGEgZGVzY3JpcHRvciBmb3IgYSBnaXZlbiBBbmd1bGFyIGF0dHJpYnV0ZSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBhdHRyaWJ1dGUgaXNcbiAqIG5vdCBhbiBBbmd1bGFyIGF0dHJpYnV0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJpbmRpbmdEZXNjcmlwdG9yKGF0dHJpYnV0ZTogc3RyaW5nKTogQmluZGluZ0Rlc2NyaXB0b3J8dW5kZWZpbmVkIHtcbiAgY29uc3QgYmluZFBhcnRzID0gYXR0cmlidXRlLm1hdGNoKEJJTkRfTkFNRV9SRUdFWFApO1xuICBpZiAoIWJpbmRQYXJ0cykgcmV0dXJuO1xuICAvLyBUaGUgZmlyc3QgbWF0Y2ggZWxlbWVudCBpcyBza2lwcGVkIGJlY2F1c2UgaXQgbWF0Y2hlcyB0aGUgZW50aXJlIGF0dHJpYnV0ZSB0ZXh0LCBpbmNsdWRpbmcgdGhlXG4gIC8vIGJpbmRpbmcgcGFydC5cbiAgY29uc3Qga2luZCA9IGJpbmRQYXJ0cy5maW5kSW5kZXgoKHZhbCwgaSkgPT4gaSA+IDAgJiYgdmFsICE9PSB1bmRlZmluZWQpO1xuICBpZiAoIShraW5kIGluIEFUVFIpKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKGBcIiR7a2luZH1cIiBpcyBub3QgYSB2YWxpZCBBbmd1bGFyIGJpbmRpbmcga2luZCBmb3IgXCIke2F0dHJpYnV0ZX1cImApO1xuICB9XG4gIHJldHVybiB7XG4gICAga2luZCxcbiAgICBuYW1lOiBiaW5kUGFydHNbQVRUUi5JREVOVF9LV10sXG4gIH07XG59XG4iXX0=