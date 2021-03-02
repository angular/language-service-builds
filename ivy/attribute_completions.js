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
        define("@angular/language-service/ivy/attribute_completions", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAttributeCompletionSymbol = exports.addAttributeCompletionEntries = exports.buildAttributeCompletionTable = exports.AttributeCompletionKind = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var display_parts_1 = require("@angular/language-service/ivy/display_parts");
    var utils_1 = require("@angular/language-service/ivy/utils");
    /**
     * Differentiates different kinds of `AttributeCompletion`s.
     */
    var AttributeCompletionKind;
    (function (AttributeCompletionKind) {
        /**
         * Completion of an attribute from the HTML schema.
         *
         * Attributes often have a corresponding DOM property of the same name.
         */
        AttributeCompletionKind[AttributeCompletionKind["DomAttribute"] = 0] = "DomAttribute";
        /**
         * Completion of a property from the DOM schema.
         *
         * `DomProperty` completions are generated only for properties which don't share their name with
         * an HTML attribute.
         */
        AttributeCompletionKind[AttributeCompletionKind["DomProperty"] = 1] = "DomProperty";
        /**
         * Completion of an attribute that results in a new directive being matched on an element.
         */
        AttributeCompletionKind[AttributeCompletionKind["DirectiveAttribute"] = 2] = "DirectiveAttribute";
        /**
         * Completion of an attribute that results in a new structural directive being matched on an
         * element.
         */
        AttributeCompletionKind[AttributeCompletionKind["StructuralDirectiveAttribute"] = 3] = "StructuralDirectiveAttribute";
        /**
         * Completion of an input from a directive which is either present on the element, or becomes
         * present after the addition of this attribute.
         */
        AttributeCompletionKind[AttributeCompletionKind["DirectiveInput"] = 4] = "DirectiveInput";
        /**
         * Completion of an output from a directive which is either present on the element, or becomes
         * present after the addition of this attribute.
         */
        AttributeCompletionKind[AttributeCompletionKind["DirectiveOutput"] = 5] = "DirectiveOutput";
    })(AttributeCompletionKind = exports.AttributeCompletionKind || (exports.AttributeCompletionKind = {}));
    /**
     * Given an element and its context, produce a `Map` of all possible attribute completions.
     *
     * 3 kinds of attributes are considered for completion, from highest to lowest priority:
     *
     * 1. Inputs/outputs of directives present on the element already.
     * 2. Inputs/outputs of directives that are not present on the element, but which would become
     *    present if such a binding is added.
     * 3. Attributes from the DOM schema for the element.
     *
     * The priority of these options determines which completions are added to the `Map`. If a directive
     * input shares the same name as a DOM attribute, the `Map` will reflect the directive input
     * completion, not the DOM completion for that name.
     */
    function buildAttributeCompletionTable(component, element, checker) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g, e_8, _h;
        var table = new Map();
        // Use the `ElementSymbol` or `TemplateSymbol` to iterate over directives present on the node, and
        // their inputs/outputs. These have the highest priority of completion results.
        var symbol = checker.getSymbolOfNode(element, component);
        var presentDirectives = new Set();
        if (symbol !== null) {
            try {
                // An `ElementSymbol` was available. This means inputs and outputs for directives on the
                // element can be added to the completion table.
                for (var _j = tslib_1.__values(symbol.directives), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var dirSymbol = _k.value;
                    var directive = dirSymbol.tsSymbol.valueDeclaration;
                    if (!ts.isClassDeclaration(directive)) {
                        continue;
                    }
                    presentDirectives.add(directive);
                    var meta = checker.getDirectiveMetadata(directive);
                    if (meta === null) {
                        continue;
                    }
                    try {
                        for (var _l = (e_2 = void 0, tslib_1.__values(meta.inputs)), _m = _l.next(); !_m.done; _m = _l.next()) {
                            var _o = tslib_1.__read(_m.value, 2), classPropertyName = _o[0], propertyName = _o[1];
                            if (table.has(propertyName)) {
                                continue;
                            }
                            table.set(propertyName, {
                                kind: AttributeCompletionKind.DirectiveInput,
                                propertyName: propertyName,
                                directive: dirSymbol,
                                classPropertyName: classPropertyName,
                                twoWayBindingSupported: meta.outputs.hasBindingPropertyName(propertyName + 'Change'),
                            });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_b = _l.return)) _b.call(_l);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (var _p = (e_3 = void 0, tslib_1.__values(meta.outputs)), _q = _p.next(); !_q.done; _q = _p.next()) {
                            var _r = tslib_1.__read(_q.value, 2), classPropertyName = _r[0], propertyName = _r[1];
                            if (table.has(propertyName)) {
                                continue;
                            }
                            table.set(propertyName, {
                                kind: AttributeCompletionKind.DirectiveOutput,
                                eventName: propertyName,
                                directive: dirSymbol,
                                classPropertyName: classPropertyName,
                            });
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_q && !_q.done && (_c = _p.return)) _c.call(_p);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_a = _j.return)) _a.call(_j);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        // Next, explore hypothetical directives and determine if the addition of any single attributes
        // can cause the directive to match the element.
        var directivesInScope = checker.getDirectivesInScope(component);
        if (directivesInScope !== null) {
            var elementSelector = utils_1.makeElementSelector(element);
            try {
                for (var directivesInScope_1 = tslib_1.__values(directivesInScope), directivesInScope_1_1 = directivesInScope_1.next(); !directivesInScope_1_1.done; directivesInScope_1_1 = directivesInScope_1.next()) {
                    var dirInScope = directivesInScope_1_1.value;
                    var directive = dirInScope.tsSymbol.valueDeclaration;
                    // Skip directives that are present on the element.
                    if (!ts.isClassDeclaration(directive) || presentDirectives.has(directive)) {
                        continue;
                    }
                    var meta = checker.getDirectiveMetadata(directive);
                    if (meta === null || meta.selector === null) {
                        continue;
                    }
                    if (!meta.isStructural) {
                        // For non-structural directives, the directive's attribute selector(s) are matched against
                        // a hypothetical version of the element with those attributes. A match indicates that
                        // adding that attribute/input/output binding would cause the directive to become present,
                        // meaning that such a binding is a valid completion.
                        var selectors = compiler_1.CssSelector.parse(meta.selector);
                        var matcher = new compiler_1.SelectorMatcher();
                        matcher.addSelectables(selectors);
                        try {
                            for (var selectors_1 = (e_5 = void 0, tslib_1.__values(selectors)), selectors_1_1 = selectors_1.next(); !selectors_1_1.done; selectors_1_1 = selectors_1.next()) {
                                var selector = selectors_1_1.value;
                                try {
                                    for (var _s = (e_6 = void 0, tslib_1.__values(selectorAttributes(selector))), _t = _s.next(); !_t.done; _t = _s.next()) {
                                        var _u = tslib_1.__read(_t.value, 2), attrName = _u[0], attrValue = _u[1];
                                        if (attrValue !== '') {
                                            // This attribute selector requires a value, which is not supported in completion.
                                            continue;
                                        }
                                        if (table.has(attrName)) {
                                            // Skip this attribute as there's already a binding for it.
                                            continue;
                                        }
                                        // Check whether adding this attribute would cause the directive to start matching.
                                        var newElementSelector = elementSelector + ("[" + attrName + "]");
                                        if (!matcher.match(compiler_1.CssSelector.parse(newElementSelector)[0], null)) {
                                            // Nope, move on with our lives.
                                            continue;
                                        }
                                        // Adding this attribute causes a new directive to be matched. Decide how to categorize
                                        // it based on the directive's inputs and outputs.
                                        if (meta.inputs.hasBindingPropertyName(attrName)) {
                                            // This attribute corresponds to an input binding.
                                            table.set(attrName, {
                                                kind: AttributeCompletionKind.DirectiveInput,
                                                directive: dirInScope,
                                                propertyName: attrName,
                                                classPropertyName: meta.inputs.getByBindingPropertyName(attrName)[0].classPropertyName,
                                                twoWayBindingSupported: meta.outputs.hasBindingPropertyName(attrName + 'Change'),
                                            });
                                        }
                                        else if (meta.outputs.hasBindingPropertyName(attrName)) {
                                            // This attribute corresponds to an output binding.
                                            table.set(attrName, {
                                                kind: AttributeCompletionKind.DirectiveOutput,
                                                directive: dirInScope,
                                                eventName: attrName,
                                                classPropertyName: meta.outputs.getByBindingPropertyName(attrName)[0].classPropertyName,
                                            });
                                        }
                                        else {
                                            // This attribute causes a new directive to be matched, but does not also correspond
                                            // to an input or output binding.
                                            table.set(attrName, {
                                                kind: AttributeCompletionKind.DirectiveAttribute,
                                                attribute: attrName,
                                                directive: dirInScope,
                                            });
                                        }
                                    }
                                }
                                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                finally {
                                    try {
                                        if (_t && !_t.done && (_f = _s.return)) _f.call(_s);
                                    }
                                    finally { if (e_6) throw e_6.error; }
                                }
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (selectors_1_1 && !selectors_1_1.done && (_e = selectors_1.return)) _e.call(selectors_1);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    else {
                        // Hypothetically matching a structural directive is a litle different than a plain
                        // directive. Use of the '*' structural directive syntactic sugar means that the actual
                        // directive is applied to a plain <ng-template> node, not the existing element with any
                        // other attributes it might already have.
                        // Additionally, more than one attribute/input might need to be present in order for the
                        // directive to match (e.g. `ngFor` has a selector of `[ngFor][ngForOf]`). This gets a
                        // little tricky.
                        var structuralAttributes = getStructuralAttributes(meta);
                        try {
                            for (var structuralAttributes_1 = (e_7 = void 0, tslib_1.__values(structuralAttributes)), structuralAttributes_1_1 = structuralAttributes_1.next(); !structuralAttributes_1_1.done; structuralAttributes_1_1 = structuralAttributes_1.next()) {
                                var attrName = structuralAttributes_1_1.value;
                                table.set(attrName, {
                                    kind: AttributeCompletionKind.StructuralDirectiveAttribute,
                                    attribute: attrName,
                                    directive: dirInScope,
                                });
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (structuralAttributes_1_1 && !structuralAttributes_1_1.done && (_g = structuralAttributes_1.return)) _g.call(structuralAttributes_1);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (directivesInScope_1_1 && !directivesInScope_1_1.done && (_d = directivesInScope_1.return)) _d.call(directivesInScope_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        // Finally, add any DOM attributes not already covered by inputs.
        if (element instanceof compiler_1.TmplAstElement) {
            try {
                for (var _v = tslib_1.__values(checker.getPotentialDomBindings(element.name)), _w = _v.next(); !_w.done; _w = _v.next()) {
                    var _x = _w.value, attribute = _x.attribute, property = _x.property;
                    var isAlsoProperty = attribute === property;
                    if (!table.has(attribute)) {
                        table.set(attribute, {
                            kind: AttributeCompletionKind.DomAttribute,
                            attribute: attribute,
                            isAlsoProperty: isAlsoProperty,
                        });
                    }
                    if (!isAlsoProperty && !table.has(property)) {
                        table.set(property, {
                            kind: AttributeCompletionKind.DomProperty,
                            property: property,
                        });
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_w && !_w.done && (_h = _v.return)) _h.call(_v);
                }
                finally { if (e_8) throw e_8.error; }
            }
        }
        return table;
    }
    exports.buildAttributeCompletionTable = buildAttributeCompletionTable;
    /**
     * Given an `AttributeCompletion`, add any available completions to a `ts.CompletionEntry` array of
     * results.
     *
     * The kind of completions generated depends on whether the current context is an attribute context
     * or not. For example, completing on `<element attr|>` will generate two results: `attribute` and
     * `[attribute]` - either a static attribute can be generated, or a property binding. However,
     * `<element [attr|]>` is not an attribute context, and so only the property completion `attribute`
     * is generated. Note that this completion does not have the `[]` property binding sugar as its
     * implicitly present in a property binding context (we're already completing within an `[attr|]`
     * expression).
     */
    function addAttributeCompletionEntries(entries, completion, isAttributeContext, isElementContext, replacementSpan) {
        switch (completion.kind) {
            case AttributeCompletionKind.DirectiveAttribute: {
                entries.push({
                    kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.DIRECTIVE),
                    name: completion.attribute,
                    sortText: completion.attribute,
                    replacementSpan: replacementSpan,
                });
                break;
            }
            case AttributeCompletionKind.StructuralDirectiveAttribute: {
                // In an element, the completion is offered with a leading '*' to activate the structural
                // directive. Once present, the structural attribute will be parsed as a template and not an
                // element, and the prefix is no longer necessary.
                var prefix = isElementContext ? '*' : '';
                entries.push({
                    kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.DIRECTIVE),
                    name: prefix + completion.attribute,
                    sortText: prefix + completion.attribute,
                    replacementSpan: replacementSpan,
                });
                break;
            }
            case AttributeCompletionKind.DirectiveInput: {
                if (isAttributeContext) {
                    // Offer a completion of a property binding.
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                        name: "[" + completion.propertyName + "]",
                        sortText: completion.propertyName,
                        replacementSpan: replacementSpan,
                    });
                    // If the directive supports banana-in-a-box for this input, offer that as well.
                    if (completion.twoWayBindingSupported) {
                        entries.push({
                            kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                            name: "[(" + completion.propertyName + ")]",
                            // This completion should sort after the property binding.
                            sortText: completion.propertyName + '_1',
                            replacementSpan: replacementSpan,
                        });
                    }
                    // Offer a completion of the input binding as an attribute.
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.ATTRIBUTE),
                        name: completion.propertyName,
                        // This completion should sort after both property binding options (one-way and two-way).
                        sortText: completion.propertyName + '_2',
                        replacementSpan: replacementSpan,
                    });
                }
                else {
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                        name: completion.propertyName,
                        sortText: completion.propertyName,
                        replacementSpan: replacementSpan,
                    });
                }
                break;
            }
            case AttributeCompletionKind.DirectiveOutput: {
                if (isAttributeContext) {
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.EVENT),
                        name: "(" + completion.eventName + ")",
                        sortText: completion.eventName,
                        replacementSpan: replacementSpan,
                    });
                }
                else {
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.EVENT),
                        name: completion.eventName,
                        sortText: completion.eventName,
                        replacementSpan: replacementSpan,
                    });
                }
                break;
            }
            case AttributeCompletionKind.DomAttribute: {
                if (isAttributeContext) {
                    // Offer a completion of an attribute binding.
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.ATTRIBUTE),
                        name: completion.attribute,
                        sortText: completion.attribute,
                        replacementSpan: replacementSpan,
                    });
                    if (completion.isAlsoProperty) {
                        // Offer a completion of a property binding to the DOM property.
                        entries.push({
                            kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                            name: "[" + completion.attribute + "]",
                            // In the case of DOM attributes, the property binding should sort after the attribute
                            // binding.
                            sortText: completion.attribute + '_1',
                            replacementSpan: replacementSpan,
                        });
                    }
                }
                else if (completion.isAlsoProperty) {
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                        name: completion.attribute,
                        sortText: completion.attribute,
                        replacementSpan: replacementSpan,
                    });
                }
                break;
            }
            case AttributeCompletionKind.DomProperty: {
                if (!isAttributeContext) {
                    entries.push({
                        kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(display_parts_1.DisplayInfoKind.PROPERTY),
                        name: completion.property,
                        sortText: completion.property,
                        replacementSpan: replacementSpan,
                    });
                }
            }
        }
    }
    exports.addAttributeCompletionEntries = addAttributeCompletionEntries;
    function getAttributeCompletionSymbol(completion, checker) {
        var _a;
        switch (completion.kind) {
            case AttributeCompletionKind.DomAttribute:
            case AttributeCompletionKind.DomProperty:
                return null;
            case AttributeCompletionKind.DirectiveAttribute:
            case AttributeCompletionKind.StructuralDirectiveAttribute:
                return completion.directive.tsSymbol;
            case AttributeCompletionKind.DirectiveInput:
            case AttributeCompletionKind.DirectiveOutput:
                return (_a = checker.getDeclaredTypeOfSymbol(completion.directive.tsSymbol)
                    .getProperty(completion.classPropertyName)) !== null && _a !== void 0 ? _a : null;
        }
    }
    exports.getAttributeCompletionSymbol = getAttributeCompletionSymbol;
    /**
     * Iterates over `CssSelector` attributes, which are internally represented in a zipped array style
     * which is not conducive to straightforward iteration.
     */
    function selectorAttributes(selector) {
        var i;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < selector.attrs.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, [selector.attrs[0], selector.attrs[1]]];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i += 2;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    }
    function getStructuralAttributes(meta) {
        var e_9, _a;
        if (meta.selector === null) {
            return [];
        }
        var structuralAttributes = [];
        var selectors = compiler_1.CssSelector.parse(meta.selector);
        var _loop_1 = function (selector) {
            if (selector.element !== null && selector.element !== 'ng-template') {
                return "continue";
            }
            // Every attribute of this selector must be name-only - no required values.
            var attributeSelectors = Array.from(selectorAttributes(selector));
            if (!attributeSelectors.every(function (_a) {
                var _b = tslib_1.__read(_a, 2), _ = _b[0], attrValue = _b[1];
                return attrValue === '';
            })) {
                return "continue";
            }
            // Get every named selector.
            var attributes = attributeSelectors.map(function (_a) {
                var _b = tslib_1.__read(_a, 2), attrName = _b[0], _ = _b[1];
                return attrName;
            });
            // Find the shortest attribute. This is the structural directive "base", and all potential
            // input bindings must begin with the base. E.g. in `*ngFor="let a of b"`, `ngFor` is the
            // base attribute, and the `of` binding key corresponds to an input of `ngForOf`.
            var baseAttr = attributes.reduce(function (prev, curr) { return prev === null || curr.length < prev.length ? curr : prev; }, null);
            if (baseAttr === null) {
                return "continue";
            }
            // Validate that the attributes are compatible with use as a structural directive.
            var isValid = function (attr) {
                // The base attribute is valid by default.
                if (attr === baseAttr) {
                    return true;
                }
                // Non-base attributes must all be prefixed with the base attribute.
                if (!attr.startsWith(baseAttr)) {
                    return false;
                }
                // Non-base attributes must also correspond to directive inputs.
                if (!meta.inputs.hasBindingPropertyName(attr)) {
                    return false;
                }
                // This attribute is compatible.
                return true;
            };
            if (!attributes.every(isValid)) {
                return "continue";
            }
            // This attribute is valid as a structural attribute for this directive.
            structuralAttributes.push(baseAttr);
        };
        try {
            for (var selectors_2 = tslib_1.__values(selectors), selectors_2_1 = selectors_2.next(); !selectors_2_1.done; selectors_2_1 = selectors_2.next()) {
                var selector = selectors_2_1.value;
                _loop_1(selector);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (selectors_2_1 && !selectors_2_1.done && (_a = selectors_2.return)) _a.call(selectors_2);
            }
            finally { if (e_9) throw e_9.error; }
        }
        return structuralAttributes;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0cmlidXRlX2NvbXBsZXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9pdnkvYXR0cmlidXRlX2NvbXBsZXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0c7SUFFaEcsK0JBQWlDO0lBRWpDLDZFQUE4RjtJQUM5Riw2REFBNEM7SUFFNUM7O09BRUc7SUFDSCxJQUFZLHVCQXNDWDtJQXRDRCxXQUFZLHVCQUF1QjtRQUNqQzs7OztXQUlHO1FBQ0gscUZBQVksQ0FBQTtRQUVaOzs7OztXQUtHO1FBQ0gsbUZBQVcsQ0FBQTtRQUVYOztXQUVHO1FBQ0gsaUdBQWtCLENBQUE7UUFFbEI7OztXQUdHO1FBQ0gscUhBQTRCLENBQUE7UUFFNUI7OztXQUdHO1FBQ0gseUZBQWMsQ0FBQTtRQUVkOzs7V0FHRztRQUNILDJGQUFlLENBQUE7SUFDakIsQ0FBQyxFQXRDVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQXNDbEM7SUE4R0Q7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQWdCLDZCQUE2QixDQUN6QyxTQUE4QixFQUFFLE9BQXVDLEVBQ3ZFLE9BQTRCOztRQUM5QixJQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQUVyRCxrR0FBa0c7UUFDbEcsK0VBQStFO1FBQy9FLElBQU0sTUFBTSxHQUNSLE9BQU8sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBbUMsQ0FBQztRQUNsRixJQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ3pELElBQUksTUFBTSxLQUFLLElBQUksRUFBRTs7Z0JBQ25CLHdGQUF3RjtnQkFDeEYsZ0RBQWdEO2dCQUNoRCxLQUF3QixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLFVBQVUsQ0FBQSxnQkFB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bnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDc3NTZWxlY3RvciwgU2VsZWN0b3JNYXRjaGVyLCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0RpcmVjdGl2ZUluU2NvcGUsIEVsZW1lbnRTeW1ib2wsIFRlbXBsYXRlU3ltYm9sLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Rpc3BsYXlJbmZvS2luZCwgdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmR9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge21ha2VFbGVtZW50U2VsZWN0b3J9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIERpZmZlcmVudGlhdGVzIGRpZmZlcmVudCBraW5kcyBvZiBgQXR0cmlidXRlQ29tcGxldGlvbmBzLlxuICovXG5leHBvcnQgZW51bSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZCB7XG4gIC8qKlxuICAgKiBDb21wbGV0aW9uIG9mIGFuIGF0dHJpYnV0ZSBmcm9tIHRoZSBIVE1MIHNjaGVtYS5cbiAgICpcbiAgICogQXR0cmlidXRlcyBvZnRlbiBoYXZlIGEgY29ycmVzcG9uZGluZyBET00gcHJvcGVydHkgb2YgdGhlIHNhbWUgbmFtZS5cbiAgICovXG4gIERvbUF0dHJpYnV0ZSxcblxuICAvKipcbiAgICogQ29tcGxldGlvbiBvZiBhIHByb3BlcnR5IGZyb20gdGhlIERPTSBzY2hlbWEuXG4gICAqXG4gICAqIGBEb21Qcm9wZXJ0eWAgY29tcGxldGlvbnMgYXJlIGdlbmVyYXRlZCBvbmx5IGZvciBwcm9wZXJ0aWVzIHdoaWNoIGRvbid0IHNoYXJlIHRoZWlyIG5hbWUgd2l0aFxuICAgKiBhbiBIVE1MIGF0dHJpYnV0ZS5cbiAgICovXG4gIERvbVByb3BlcnR5LFxuXG4gIC8qKlxuICAgKiBDb21wbGV0aW9uIG9mIGFuIGF0dHJpYnV0ZSB0aGF0IHJlc3VsdHMgaW4gYSBuZXcgZGlyZWN0aXZlIGJlaW5nIG1hdGNoZWQgb24gYW4gZWxlbWVudC5cbiAgICovXG4gIERpcmVjdGl2ZUF0dHJpYnV0ZSxcblxuICAvKipcbiAgICogQ29tcGxldGlvbiBvZiBhbiBhdHRyaWJ1dGUgdGhhdCByZXN1bHRzIGluIGEgbmV3IHN0cnVjdHVyYWwgZGlyZWN0aXZlIGJlaW5nIG1hdGNoZWQgb24gYW5cbiAgICogZWxlbWVudC5cbiAgICovXG4gIFN0cnVjdHVyYWxEaXJlY3RpdmVBdHRyaWJ1dGUsXG5cbiAgLyoqXG4gICAqIENvbXBsZXRpb24gb2YgYW4gaW5wdXQgZnJvbSBhIGRpcmVjdGl2ZSB3aGljaCBpcyBlaXRoZXIgcHJlc2VudCBvbiB0aGUgZWxlbWVudCwgb3IgYmVjb21lc1xuICAgKiBwcmVzZW50IGFmdGVyIHRoZSBhZGRpdGlvbiBvZiB0aGlzIGF0dHJpYnV0ZS5cbiAgICovXG4gIERpcmVjdGl2ZUlucHV0LFxuXG4gIC8qKlxuICAgKiBDb21wbGV0aW9uIG9mIGFuIG91dHB1dCBmcm9tIGEgZGlyZWN0aXZlIHdoaWNoIGlzIGVpdGhlciBwcmVzZW50IG9uIHRoZSBlbGVtZW50LCBvciBiZWNvbWVzXG4gICAqIHByZXNlbnQgYWZ0ZXIgdGhlIGFkZGl0aW9uIG9mIHRoaXMgYXR0cmlidXRlLlxuICAgKi9cbiAgRGlyZWN0aXZlT3V0cHV0LFxufVxuXG4vKipcbiAqIENvbXBsZXRpb24gb2YgYW4gYXR0cmlidXRlIGZyb20gdGhlIERPTSBzY2hlbWEuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9tQXR0cmlidXRlQ29tcGxldGlvbiB7XG4gIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbUF0dHJpYnV0ZTtcblxuICAvKipcbiAgICogTmFtZSBvZiB0aGUgSFRNTCBhdHRyaWJ1dGUgKG5vdCB0byBiZSBjb25mdXNlZCB3aXRoIHRoZSBjb3JyZXNwb25kaW5nIERPTSBwcm9wZXJ0eSBuYW1lKS5cbiAgICovXG4gIGF0dHJpYnV0ZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgYXR0cmlidXRlIGlzIGFsc28gYSBET00gcHJvcGVydHkuXG4gICAqL1xuICBpc0Fsc29Qcm9wZXJ0eTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb21wbGV0aW9uIG9mIGEgRE9NIHByb3BlcnR5IG9mIGFuIGVsZW1lbnQgdGhhdCdzIGRpc3RpbmN0IGZyb20gYW4gSFRNTCBhdHRyaWJ1dGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9tUHJvcGVydHlDb21wbGV0aW9uIHtcbiAga2luZDogQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tUHJvcGVydHk7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIERPTSBwcm9wZXJ0eVxuICAgKi9cbiAgcHJvcGVydHk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDb21wbGV0aW9uIG9mIGFuIGF0dHJpYnV0ZSB3aGljaCByZXN1bHRzIGluIGEgbmV3IGRpcmVjdGl2ZSBiZWluZyBtYXRjaGVkIG9uIGFuIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlQXR0cmlidXRlQ29tcGxldGlvbiB7XG4gIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUF0dHJpYnV0ZXxcbiAgICAgIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLlN0cnVjdHVyYWxEaXJlY3RpdmVBdHRyaWJ1dGU7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIGF0dHJpYnV0ZSB3aG9zZSBhZGRpdGlvbiBjYXVzZXMgdGhpcyBkaXJlY3RpdmUgdG8gbWF0Y2ggdGhlIGVsZW1lbnQuXG4gICAqL1xuICBhdHRyaWJ1dGU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGRpcmVjdGl2ZSB3aG9zZSBzZWxlY3RvciBnYXZlIHJpc2UgdG8gdGhpcyBjb21wbGV0aW9uLlxuICAgKi9cbiAgZGlyZWN0aXZlOiBEaXJlY3RpdmVJblNjb3BlO1xufVxuXG4vKipcbiAqIENvbXBsZXRpb24gb2YgYW4gaW5wdXQgb2YgYSBkaXJlY3RpdmUgd2hpY2ggbWF5IGVpdGhlciBiZSBwcmVzZW50IG9uIHRoZSBlbGVtZW50LCBvciBiZWNvbWVcbiAqIHByZXNlbnQgd2hlbiBhIGJpbmRpbmcgdG8gdGhpcyBpbnB1dCBpcyBhZGRlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVJbnB1dENvbXBsZXRpb24ge1xuICBraW5kOiBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dDtcblxuICAvKipcbiAgICogVGhlIHB1YmxpYyBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBpbnB1dCAodGhlIG5hbWUgd2hpY2ggd291bGQgYmUgdXNlZCBpbiBhbnkgYmluZGluZyB0byB0aGF0XG4gICAqIGlucHV0KS5cbiAgICovXG4gIHByb3BlcnR5TmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgZGlyZWN0aXZlIHdoaWNoIGhhcyB0aGlzIGlucHV0LlxuICAgKi9cbiAgZGlyZWN0aXZlOiBEaXJlY3RpdmVJblNjb3BlO1xuXG4gIC8qKlxuICAgKiBUaGUgZmllbGQgbmFtZSBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoaXMgaW5wdXQuXG4gICAqXG4gICAqIEN1cnJlbnRseSwgaW4gdGhlIGNhc2Ugd2hlcmUgYSBzaW5nbGUgcHJvcGVydHkgbmFtZSBjb3JyZXNwb25kcyB0byBtdWx0aXBsZSBpbnB1dCBmaWVsZHMsIG9ubHlcbiAgICogdGhlIGZpcnN0IHN1Y2ggZmllbGQgaXMgcmVwcmVzZW50ZWQgaGVyZS4gSW4gdGhlIGZ1dHVyZSBtdWx0aXBsZSByZXN1bHRzIG1heSBiZSB3YXJyYW50ZWQuXG4gICAqL1xuICBjbGFzc1Byb3BlcnR5TmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgaW5wdXQgY2FuIGJlIHVzZWQgd2l0aCB0d28td2F5IGJpbmRpbmcgKHRoYXQgaXMsIHdoZXRoZXIgYSBjb3JyZXNwb25kaW5nIGNoYW5nZVxuICAgKiBvdXRwdXQgZXhpc3RzIG9uIHRoZSBkaXJlY3RpdmUpLlxuICAgKi9cbiAgdHdvV2F5QmluZGluZ1N1cHBvcnRlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVPdXRwdXRDb21wbGV0aW9uIHtcbiAga2luZDogQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0O1xuXG4gIC8qKlxuICAgKiBUaGUgcHVibGljIGV2ZW50IG5hbWUgb2YgdGhlIG91dHB1dCAodGhlIG5hbWUgd2hpY2ggd291bGQgYmUgdXNlZCBpbiBhbnkgYmluZGluZyB0byB0aGF0XG4gICAqIG91dHB1dCkuXG4gICAqL1xuICBldmVudE5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICpUaGUgZGlyZWN0aXZlIHdoaWNoIGhhcyB0aGlzIG91dHB1dC5cbiAgICovXG4gIGRpcmVjdGl2ZTogRGlyZWN0aXZlSW5TY29wZTtcblxuICAvKipcbiAgICogVGhlIGZpZWxkIG5hbWUgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGlzIG91dHB1dC5cbiAgICovXG4gIGNsYXNzUHJvcGVydHlOYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQW55IG5hbWVkIGF0dHJpYnV0ZSB3aGljaCBpcyBhdmFpbGFibGUgZm9yIGNvbXBsZXRpb24gb24gYSBnaXZlbiBlbGVtZW50LlxuICpcbiAqIERpc2FtYmlndWF0ZWQgYnkgdGhlIGBraW5kYCBwcm9wZXJ0eSBpbnRvIHZhcmlvdXMgdHlwZXMgb2YgY29tcGxldGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIEF0dHJpYnV0ZUNvbXBsZXRpb24gPSBEb21BdHRyaWJ1dGVDb21wbGV0aW9ufERvbVByb3BlcnR5Q29tcGxldGlvbnxcbiAgICBEaXJlY3RpdmVBdHRyaWJ1dGVDb21wbGV0aW9ufERpcmVjdGl2ZUlucHV0Q29tcGxldGlvbnxEaXJlY3RpdmVPdXRwdXRDb21wbGV0aW9uO1xuXG4vKipcbiAqIEdpdmVuIGFuIGVsZW1lbnQgYW5kIGl0cyBjb250ZXh0LCBwcm9kdWNlIGEgYE1hcGAgb2YgYWxsIHBvc3NpYmxlIGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAqXG4gKiAzIGtpbmRzIG9mIGF0dHJpYnV0ZXMgYXJlIGNvbnNpZGVyZWQgZm9yIGNvbXBsZXRpb24sIGZyb20gaGlnaGVzdCB0byBsb3dlc3QgcHJpb3JpdHk6XG4gKlxuICogMS4gSW5wdXRzL291dHB1dHMgb2YgZGlyZWN0aXZlcyBwcmVzZW50IG9uIHRoZSBlbGVtZW50IGFscmVhZHkuXG4gKiAyLiBJbnB1dHMvb3V0cHV0cyBvZiBkaXJlY3RpdmVzIHRoYXQgYXJlIG5vdCBwcmVzZW50IG9uIHRoZSBlbGVtZW50LCBidXQgd2hpY2ggd291bGQgYmVjb21lXG4gKiAgICBwcmVzZW50IGlmIHN1Y2ggYSBiaW5kaW5nIGlzIGFkZGVkLlxuICogMy4gQXR0cmlidXRlcyBmcm9tIHRoZSBET00gc2NoZW1hIGZvciB0aGUgZWxlbWVudC5cbiAqXG4gKiBUaGUgcHJpb3JpdHkgb2YgdGhlc2Ugb3B0aW9ucyBkZXRlcm1pbmVzIHdoaWNoIGNvbXBsZXRpb25zIGFyZSBhZGRlZCB0byB0aGUgYE1hcGAuIElmIGEgZGlyZWN0aXZlXG4gKiBpbnB1dCBzaGFyZXMgdGhlIHNhbWUgbmFtZSBhcyBhIERPTSBhdHRyaWJ1dGUsIHRoZSBgTWFwYCB3aWxsIHJlZmxlY3QgdGhlIGRpcmVjdGl2ZSBpbnB1dFxuICogY29tcGxldGlvbiwgbm90IHRoZSBET00gY29tcGxldGlvbiBmb3IgdGhhdCBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBdHRyaWJ1dGVDb21wbGV0aW9uVGFibGUoXG4gICAgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsXG4gICAgY2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcik6IE1hcDxzdHJpbmcsIEF0dHJpYnV0ZUNvbXBsZXRpb24+IHtcbiAgY29uc3QgdGFibGUgPSBuZXcgTWFwPHN0cmluZywgQXR0cmlidXRlQ29tcGxldGlvbj4oKTtcblxuICAvLyBVc2UgdGhlIGBFbGVtZW50U3ltYm9sYCBvciBgVGVtcGxhdGVTeW1ib2xgIHRvIGl0ZXJhdGUgb3ZlciBkaXJlY3RpdmVzIHByZXNlbnQgb24gdGhlIG5vZGUsIGFuZFxuICAvLyB0aGVpciBpbnB1dHMvb3V0cHV0cy4gVGhlc2UgaGF2ZSB0aGUgaGlnaGVzdCBwcmlvcml0eSBvZiBjb21wbGV0aW9uIHJlc3VsdHMuXG4gIGNvbnN0IHN5bWJvbDogRWxlbWVudFN5bWJvbHxUZW1wbGF0ZVN5bWJvbCA9XG4gICAgICBjaGVja2VyLmdldFN5bWJvbE9mTm9kZShlbGVtZW50LCBjb21wb25lbnQpIGFzIEVsZW1lbnRTeW1ib2wgfCBUZW1wbGF0ZVN5bWJvbDtcbiAgY29uc3QgcHJlc2VudERpcmVjdGl2ZXMgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG4gIGlmIChzeW1ib2wgIT09IG51bGwpIHtcbiAgICAvLyBBbiBgRWxlbWVudFN5bWJvbGAgd2FzIGF2YWlsYWJsZS4gVGhpcyBtZWFucyBpbnB1dHMgYW5kIG91dHB1dHMgZm9yIGRpcmVjdGl2ZXMgb24gdGhlXG4gICAgLy8gZWxlbWVudCBjYW4gYmUgYWRkZWQgdG8gdGhlIGNvbXBsZXRpb24gdGFibGUuXG4gICAgZm9yIChjb25zdCBkaXJTeW1ib2wgb2Ygc3ltYm9sLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGRpclN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyZWN0aXZlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHByZXNlbnREaXJlY3RpdmVzLmFkZChkaXJlY3RpdmUpO1xuXG4gICAgICBjb25zdCBtZXRhID0gY2hlY2tlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmUpO1xuICAgICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW2NsYXNzUHJvcGVydHlOYW1lLCBwcm9wZXJ0eU5hbWVdIG9mIG1ldGEuaW5wdXRzKSB7XG4gICAgICAgIGlmICh0YWJsZS5oYXMocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFibGUuc2V0KHByb3BlcnR5TmFtZSwge1xuICAgICAgICAgIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0LFxuICAgICAgICAgIHByb3BlcnR5TmFtZSxcbiAgICAgICAgICBkaXJlY3RpdmU6IGRpclN5bWJvbCxcbiAgICAgICAgICBjbGFzc1Byb3BlcnR5TmFtZSxcbiAgICAgICAgICB0d29XYXlCaW5kaW5nU3VwcG9ydGVkOiBtZXRhLm91dHB1dHMuaGFzQmluZGluZ1Byb3BlcnR5TmFtZShwcm9wZXJ0eU5hbWUgKyAnQ2hhbmdlJyksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtjbGFzc1Byb3BlcnR5TmFtZSwgcHJvcGVydHlOYW1lXSBvZiBtZXRhLm91dHB1dHMpIHtcbiAgICAgICAgaWYgKHRhYmxlLmhhcyhwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0YWJsZS5zZXQocHJvcGVydHlOYW1lLCB7XG4gICAgICAgICAga2luZDogQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0LFxuICAgICAgICAgIGV2ZW50TmFtZTogcHJvcGVydHlOYW1lLFxuICAgICAgICAgIGRpcmVjdGl2ZTogZGlyU3ltYm9sLFxuICAgICAgICAgIGNsYXNzUHJvcGVydHlOYW1lLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBOZXh0LCBleHBsb3JlIGh5cG90aGV0aWNhbCBkaXJlY3RpdmVzIGFuZCBkZXRlcm1pbmUgaWYgdGhlIGFkZGl0aW9uIG9mIGFueSBzaW5nbGUgYXR0cmlidXRlc1xuICAvLyBjYW4gY2F1c2UgdGhlIGRpcmVjdGl2ZSB0byBtYXRjaCB0aGUgZWxlbWVudC5cbiAgY29uc3QgZGlyZWN0aXZlc0luU2NvcGUgPSBjaGVja2VyLmdldERpcmVjdGl2ZXNJblNjb3BlKGNvbXBvbmVudCk7XG4gIGlmIChkaXJlY3RpdmVzSW5TY29wZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGVsZW1lbnRTZWxlY3RvciA9IG1ha2VFbGVtZW50U2VsZWN0b3IoZWxlbWVudCk7XG5cbiAgICBmb3IgKGNvbnN0IGRpckluU2NvcGUgb2YgZGlyZWN0aXZlc0luU2NvcGUpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGRpckluU2NvcGUudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIC8vIFNraXAgZGlyZWN0aXZlcyB0aGF0IGFyZSBwcmVzZW50IG9uIHRoZSBlbGVtZW50LlxuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyZWN0aXZlKSB8fCBwcmVzZW50RGlyZWN0aXZlcy5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YSA9IGNoZWNrZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlKTtcbiAgICAgIGlmIChtZXRhID09PSBudWxsIHx8IG1ldGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghbWV0YS5pc1N0cnVjdHVyYWwpIHtcbiAgICAgICAgLy8gRm9yIG5vbi1zdHJ1Y3R1cmFsIGRpcmVjdGl2ZXMsIHRoZSBkaXJlY3RpdmUncyBhdHRyaWJ1dGUgc2VsZWN0b3IocykgYXJlIG1hdGNoZWQgYWdhaW5zdFxuICAgICAgICAvLyBhIGh5cG90aGV0aWNhbCB2ZXJzaW9uIG9mIHRoZSBlbGVtZW50IHdpdGggdGhvc2UgYXR0cmlidXRlcy4gQSBtYXRjaCBpbmRpY2F0ZXMgdGhhdFxuICAgICAgICAvLyBhZGRpbmcgdGhhdCBhdHRyaWJ1dGUvaW5wdXQvb3V0cHV0IGJpbmRpbmcgd291bGQgY2F1c2UgdGhlIGRpcmVjdGl2ZSB0byBiZWNvbWUgcHJlc2VudCxcbiAgICAgICAgLy8gbWVhbmluZyB0aGF0IHN1Y2ggYSBiaW5kaW5nIGlzIGEgdmFsaWQgY29tcGxldGlvbi5cbiAgICAgICAgY29uc3Qgc2VsZWN0b3JzID0gQ3NzU2VsZWN0b3IucGFyc2UobWV0YS5zZWxlY3Rvcik7XG4gICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoc2VsZWN0b3JzKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgICAgICAgIGZvciAoY29uc3QgW2F0dHJOYW1lLCBhdHRyVmFsdWVdIG9mIHNlbGVjdG9yQXR0cmlidXRlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChhdHRyVmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgYXR0cmlidXRlIHNlbGVjdG9yIHJlcXVpcmVzIGEgdmFsdWUsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gY29tcGxldGlvbi5cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0YWJsZS5oYXMoYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgIC8vIFNraXAgdGhpcyBhdHRyaWJ1dGUgYXMgdGhlcmUncyBhbHJlYWR5IGEgYmluZGluZyBmb3IgaXQuXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayB3aGV0aGVyIGFkZGluZyB0aGlzIGF0dHJpYnV0ZSB3b3VsZCBjYXVzZSB0aGUgZGlyZWN0aXZlIHRvIHN0YXJ0IG1hdGNoaW5nLlxuICAgICAgICAgICAgY29uc3QgbmV3RWxlbWVudFNlbGVjdG9yID0gZWxlbWVudFNlbGVjdG9yICsgYFske2F0dHJOYW1lfV1gO1xuICAgICAgICAgICAgaWYgKCFtYXRjaGVyLm1hdGNoKENzc1NlbGVjdG9yLnBhcnNlKG5ld0VsZW1lbnRTZWxlY3RvcilbMF0sIG51bGwpKSB7XG4gICAgICAgICAgICAgIC8vIE5vcGUsIG1vdmUgb24gd2l0aCBvdXIgbGl2ZXMuXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGRpbmcgdGhpcyBhdHRyaWJ1dGUgY2F1c2VzIGEgbmV3IGRpcmVjdGl2ZSB0byBiZSBtYXRjaGVkLiBEZWNpZGUgaG93IHRvIGNhdGVnb3JpemVcbiAgICAgICAgICAgIC8vIGl0IGJhc2VkIG9uIHRoZSBkaXJlY3RpdmUncyBpbnB1dHMgYW5kIG91dHB1dHMuXG4gICAgICAgICAgICBpZiAobWV0YS5pbnB1dHMuaGFzQmluZGluZ1Byb3BlcnR5TmFtZShhdHRyTmFtZSkpIHtcbiAgICAgICAgICAgICAgLy8gVGhpcyBhdHRyaWJ1dGUgY29ycmVzcG9uZHMgdG8gYW4gaW5wdXQgYmluZGluZy5cbiAgICAgICAgICAgICAgdGFibGUuc2V0KGF0dHJOYW1lLCB7XG4gICAgICAgICAgICAgICAga2luZDogQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlSW5wdXQsXG4gICAgICAgICAgICAgICAgZGlyZWN0aXZlOiBkaXJJblNjb3BlLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZTogYXR0ck5hbWUsXG4gICAgICAgICAgICAgICAgY2xhc3NQcm9wZXJ0eU5hbWU6XG4gICAgICAgICAgICAgICAgICAgIG1ldGEuaW5wdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShhdHRyTmFtZSkhWzBdLmNsYXNzUHJvcGVydHlOYW1lLFxuICAgICAgICAgICAgICAgIHR3b1dheUJpbmRpbmdTdXBwb3J0ZWQ6IG1ldGEub3V0cHV0cy5oYXNCaW5kaW5nUHJvcGVydHlOYW1lKGF0dHJOYW1lICsgJ0NoYW5nZScpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0YS5vdXRwdXRzLmhhc0JpbmRpbmdQcm9wZXJ0eU5hbWUoYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgYXR0cmlidXRlIGNvcnJlc3BvbmRzIHRvIGFuIG91dHB1dCBiaW5kaW5nLlxuICAgICAgICAgICAgICB0YWJsZS5zZXQoYXR0ck5hbWUsIHtcbiAgICAgICAgICAgICAgICBraW5kOiBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVPdXRwdXQsXG4gICAgICAgICAgICAgICAgZGlyZWN0aXZlOiBkaXJJblNjb3BlLFxuICAgICAgICAgICAgICAgIGV2ZW50TmFtZTogYXR0ck5hbWUsXG4gICAgICAgICAgICAgICAgY2xhc3NQcm9wZXJ0eU5hbWU6XG4gICAgICAgICAgICAgICAgICAgIG1ldGEub3V0cHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUoYXR0ck5hbWUpIVswXS5jbGFzc1Byb3BlcnR5TmFtZSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBUaGlzIGF0dHJpYnV0ZSBjYXVzZXMgYSBuZXcgZGlyZWN0aXZlIHRvIGJlIG1hdGNoZWQsIGJ1dCBkb2VzIG5vdCBhbHNvIGNvcnJlc3BvbmRcbiAgICAgICAgICAgICAgLy8gdG8gYW4gaW5wdXQgb3Igb3V0cHV0IGJpbmRpbmcuXG4gICAgICAgICAgICAgIHRhYmxlLnNldChhdHRyTmFtZSwge1xuICAgICAgICAgICAgICAgIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUF0dHJpYnV0ZSxcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGU6IGF0dHJOYW1lLFxuICAgICAgICAgICAgICAgIGRpcmVjdGl2ZTogZGlySW5TY29wZSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBIeXBvdGhldGljYWxseSBtYXRjaGluZyBhIHN0cnVjdHVyYWwgZGlyZWN0aXZlIGlzIGEgbGl0bGUgZGlmZmVyZW50IHRoYW4gYSBwbGFpblxuICAgICAgICAvLyBkaXJlY3RpdmUuIFVzZSBvZiB0aGUgJyonIHN0cnVjdHVyYWwgZGlyZWN0aXZlIHN5bnRhY3RpYyBzdWdhciBtZWFucyB0aGF0IHRoZSBhY3R1YWxcbiAgICAgICAgLy8gZGlyZWN0aXZlIGlzIGFwcGxpZWQgdG8gYSBwbGFpbiA8bmctdGVtcGxhdGU+IG5vZGUsIG5vdCB0aGUgZXhpc3RpbmcgZWxlbWVudCB3aXRoIGFueVxuICAgICAgICAvLyBvdGhlciBhdHRyaWJ1dGVzIGl0IG1pZ2h0IGFscmVhZHkgaGF2ZS5cbiAgICAgICAgLy8gQWRkaXRpb25hbGx5LCBtb3JlIHRoYW4gb25lIGF0dHJpYnV0ZS9pbnB1dCBtaWdodCBuZWVkIHRvIGJlIHByZXNlbnQgaW4gb3JkZXIgZm9yIHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgdG8gbWF0Y2ggKGUuZy4gYG5nRm9yYCBoYXMgYSBzZWxlY3RvciBvZiBgW25nRm9yXVtuZ0Zvck9mXWApLiBUaGlzIGdldHMgYVxuICAgICAgICAvLyBsaXR0bGUgdHJpY2t5LlxuXG4gICAgICAgIGNvbnN0IHN0cnVjdHVyYWxBdHRyaWJ1dGVzID0gZ2V0U3RydWN0dXJhbEF0dHJpYnV0ZXMobWV0YSk7XG4gICAgICAgIGZvciAoY29uc3QgYXR0ck5hbWUgb2Ygc3RydWN0dXJhbEF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICB0YWJsZS5zZXQoYXR0ck5hbWUsIHtcbiAgICAgICAgICAgIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLlN0cnVjdHVyYWxEaXJlY3RpdmVBdHRyaWJ1dGUsXG4gICAgICAgICAgICBhdHRyaWJ1dGU6IGF0dHJOYW1lLFxuICAgICAgICAgICAgZGlyZWN0aXZlOiBkaXJJblNjb3BlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRmluYWxseSwgYWRkIGFueSBET00gYXR0cmlidXRlcyBub3QgYWxyZWFkeSBjb3ZlcmVkIGJ5IGlucHV0cy5cbiAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgIGZvciAoY29uc3Qge2F0dHJpYnV0ZSwgcHJvcGVydHl9IG9mIGNoZWNrZXIuZ2V0UG90ZW50aWFsRG9tQmluZGluZ3MoZWxlbWVudC5uYW1lKSkge1xuICAgICAgY29uc3QgaXNBbHNvUHJvcGVydHkgPSBhdHRyaWJ1dGUgPT09IHByb3BlcnR5O1xuICAgICAgaWYgKCF0YWJsZS5oYXMoYXR0cmlidXRlKSkge1xuICAgICAgICB0YWJsZS5zZXQoYXR0cmlidXRlLCB7XG4gICAgICAgICAga2luZDogQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tQXR0cmlidXRlLFxuICAgICAgICAgIGF0dHJpYnV0ZSxcbiAgICAgICAgICBpc0Fsc29Qcm9wZXJ0eSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoIWlzQWxzb1Byb3BlcnR5ICYmICF0YWJsZS5oYXMocHJvcGVydHkpKSB7XG4gICAgICAgIHRhYmxlLnNldChwcm9wZXJ0eSwge1xuICAgICAgICAgIGtpbmQ6IEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRvbVByb3BlcnR5LFxuICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFibGU7XG59XG5cbi8qKlxuICogR2l2ZW4gYW4gYEF0dHJpYnV0ZUNvbXBsZXRpb25gLCBhZGQgYW55IGF2YWlsYWJsZSBjb21wbGV0aW9ucyB0byBhIGB0cy5Db21wbGV0aW9uRW50cnlgIGFycmF5IG9mXG4gKiByZXN1bHRzLlxuICpcbiAqIFRoZSBraW5kIG9mIGNvbXBsZXRpb25zIGdlbmVyYXRlZCBkZXBlbmRzIG9uIHdoZXRoZXIgdGhlIGN1cnJlbnQgY29udGV4dCBpcyBhbiBhdHRyaWJ1dGUgY29udGV4dFxuICogb3Igbm90LiBGb3IgZXhhbXBsZSwgY29tcGxldGluZyBvbiBgPGVsZW1lbnQgYXR0cnw+YCB3aWxsIGdlbmVyYXRlIHR3byByZXN1bHRzOiBgYXR0cmlidXRlYCBhbmRcbiAqIGBbYXR0cmlidXRlXWAgLSBlaXRoZXIgYSBzdGF0aWMgYXR0cmlidXRlIGNhbiBiZSBnZW5lcmF0ZWQsIG9yIGEgcHJvcGVydHkgYmluZGluZy4gSG93ZXZlcixcbiAqIGA8ZWxlbWVudCBbYXR0cnxdPmAgaXMgbm90IGFuIGF0dHJpYnV0ZSBjb250ZXh0LCBhbmQgc28gb25seSB0aGUgcHJvcGVydHkgY29tcGxldGlvbiBgYXR0cmlidXRlYFxuICogaXMgZ2VuZXJhdGVkLiBOb3RlIHRoYXQgdGhpcyBjb21wbGV0aW9uIGRvZXMgbm90IGhhdmUgdGhlIGBbXWAgcHJvcGVydHkgYmluZGluZyBzdWdhciBhcyBpdHNcbiAqIGltcGxpY2l0bHkgcHJlc2VudCBpbiBhIHByb3BlcnR5IGJpbmRpbmcgY29udGV4dCAod2UncmUgYWxyZWFkeSBjb21wbGV0aW5nIHdpdGhpbiBhbiBgW2F0dHJ8XWBcbiAqIGV4cHJlc3Npb24pLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkQXR0cmlidXRlQ29tcGxldGlvbkVudHJpZXMoXG4gICAgZW50cmllczogdHMuQ29tcGxldGlvbkVudHJ5W10sIGNvbXBsZXRpb246IEF0dHJpYnV0ZUNvbXBsZXRpb24sIGlzQXR0cmlidXRlQ29udGV4dDogYm9vbGVhbixcbiAgICBpc0VsZW1lbnRDb250ZXh0OiBib29sZWFuLCByZXBsYWNlbWVudFNwYW46IHRzLlRleHRTcGFufHVuZGVmaW5lZCk6IHZvaWQge1xuICBzd2l0Y2ggKGNvbXBsZXRpb24ua2luZCkge1xuICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlQXR0cmlidXRlOiB7XG4gICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuRElSRUNUSVZFKSxcbiAgICAgICAgbmFtZTogY29tcGxldGlvbi5hdHRyaWJ1dGUsXG4gICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLmF0dHJpYnV0ZSxcbiAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5TdHJ1Y3R1cmFsRGlyZWN0aXZlQXR0cmlidXRlOiB7XG4gICAgICAvLyBJbiBhbiBlbGVtZW50LCB0aGUgY29tcGxldGlvbiBpcyBvZmZlcmVkIHdpdGggYSBsZWFkaW5nICcqJyB0byBhY3RpdmF0ZSB0aGUgc3RydWN0dXJhbFxuICAgICAgLy8gZGlyZWN0aXZlLiBPbmNlIHByZXNlbnQsIHRoZSBzdHJ1Y3R1cmFsIGF0dHJpYnV0ZSB3aWxsIGJlIHBhcnNlZCBhcyBhIHRlbXBsYXRlIGFuZCBub3QgYW5cbiAgICAgIC8vIGVsZW1lbnQsIGFuZCB0aGUgcHJlZml4IGlzIG5vIGxvbmdlciBuZWNlc3NhcnkuXG4gICAgICBjb25zdCBwcmVmaXggPSBpc0VsZW1lbnRDb250ZXh0ID8gJyonIDogJyc7XG4gICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuRElSRUNUSVZFKSxcbiAgICAgICAgbmFtZTogcHJlZml4ICsgY29tcGxldGlvbi5hdHRyaWJ1dGUsXG4gICAgICAgIHNvcnRUZXh0OiBwcmVmaXggKyBjb21wbGV0aW9uLmF0dHJpYnV0ZSxcbiAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5EaXJlY3RpdmVJbnB1dDoge1xuICAgICAgaWYgKGlzQXR0cmlidXRlQ29udGV4dCkge1xuICAgICAgICAvLyBPZmZlciBhIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBiaW5kaW5nLlxuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSksXG4gICAgICAgICAgbmFtZTogYFske2NvbXBsZXRpb24ucHJvcGVydHlOYW1lfV1gLFxuICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLnByb3BlcnR5TmFtZSxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBJZiB0aGUgZGlyZWN0aXZlIHN1cHBvcnRzIGJhbmFuYS1pbi1hLWJveCBmb3IgdGhpcyBpbnB1dCwgb2ZmZXIgdGhhdCBhcyB3ZWxsLlxuICAgICAgICBpZiAoY29tcGxldGlvbi50d29XYXlCaW5kaW5nU3VwcG9ydGVkKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSksXG4gICAgICAgICAgICBuYW1lOiBgWygke2NvbXBsZXRpb24ucHJvcGVydHlOYW1lfSldYCxcbiAgICAgICAgICAgIC8vIFRoaXMgY29tcGxldGlvbiBzaG91bGQgc29ydCBhZnRlciB0aGUgcHJvcGVydHkgYmluZGluZy5cbiAgICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLnByb3BlcnR5TmFtZSArICdfMScsXG4gICAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT2ZmZXIgYSBjb21wbGV0aW9uIG9mIHRoZSBpbnB1dCBiaW5kaW5nIGFzIGFuIGF0dHJpYnV0ZS5cbiAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuQVRUUklCVVRFKSxcbiAgICAgICAgICBuYW1lOiBjb21wbGV0aW9uLnByb3BlcnR5TmFtZSxcbiAgICAgICAgICAvLyBUaGlzIGNvbXBsZXRpb24gc2hvdWxkIHNvcnQgYWZ0ZXIgYm90aCBwcm9wZXJ0eSBiaW5kaW5nIG9wdGlvbnMgKG9uZS13YXkgYW5kIHR3by13YXkpLlxuICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLnByb3BlcnR5TmFtZSArICdfMicsXG4gICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVudHJpZXMucHVzaCh7XG4gICAgICAgICAga2luZDogdW5zYWZlQ2FzdERpc3BsYXlJbmZvS2luZFRvU2NyaXB0RWxlbWVudEtpbmQoRGlzcGxheUluZm9LaW5kLlBST1BFUlRZKSxcbiAgICAgICAgICBuYW1lOiBjb21wbGV0aW9uLnByb3BlcnR5TmFtZSxcbiAgICAgICAgICBzb3J0VGV4dDogY29tcGxldGlvbi5wcm9wZXJ0eU5hbWUsXG4gICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZU91dHB1dDoge1xuICAgICAgaWYgKGlzQXR0cmlidXRlQ29udGV4dCkge1xuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5FVkVOVCksXG4gICAgICAgICAgbmFtZTogYCgke2NvbXBsZXRpb24uZXZlbnROYW1lfSlgLFxuICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLmV2ZW50TmFtZSxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuRVZFTlQpLFxuICAgICAgICAgIG5hbWU6IGNvbXBsZXRpb24uZXZlbnROYW1lLFxuICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLmV2ZW50TmFtZSxcbiAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRG9tQXR0cmlidXRlOiB7XG4gICAgICBpZiAoaXNBdHRyaWJ1dGVDb250ZXh0KSB7XG4gICAgICAgIC8vIE9mZmVyIGEgY29tcGxldGlvbiBvZiBhbiBhdHRyaWJ1dGUgYmluZGluZy5cbiAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuQVRUUklCVVRFKSxcbiAgICAgICAgICBuYW1lOiBjb21wbGV0aW9uLmF0dHJpYnV0ZSxcbiAgICAgICAgICBzb3J0VGV4dDogY29tcGxldGlvbi5hdHRyaWJ1dGUsXG4gICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGNvbXBsZXRpb24uaXNBbHNvUHJvcGVydHkpIHtcbiAgICAgICAgICAvLyBPZmZlciBhIGNvbXBsZXRpb24gb2YgYSBwcm9wZXJ0eSBiaW5kaW5nIHRvIHRoZSBET00gcHJvcGVydHkuXG4gICAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSksXG4gICAgICAgICAgICBuYW1lOiBgWyR7Y29tcGxldGlvbi5hdHRyaWJ1dGV9XWAsXG4gICAgICAgICAgICAvLyBJbiB0aGUgY2FzZSBvZiBET00gYXR0cmlidXRlcywgdGhlIHByb3BlcnR5IGJpbmRpbmcgc2hvdWxkIHNvcnQgYWZ0ZXIgdGhlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy8gYmluZGluZy5cbiAgICAgICAgICAgIHNvcnRUZXh0OiBjb21wbGV0aW9uLmF0dHJpYnV0ZSArICdfMScsXG4gICAgICAgICAgICByZXBsYWNlbWVudFNwYW4sXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcGxldGlvbi5pc0Fsc29Qcm9wZXJ0eSkge1xuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kKERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSksXG4gICAgICAgICAgbmFtZTogY29tcGxldGlvbi5hdHRyaWJ1dGUsXG4gICAgICAgICAgc29ydFRleHQ6IGNvbXBsZXRpb24uYXR0cmlidXRlLFxuICAgICAgICAgIHJlcGxhY2VtZW50U3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21Qcm9wZXJ0eToge1xuICAgICAgaWYgKCFpc0F0dHJpYnV0ZUNvbnRleHQpIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHtcbiAgICAgICAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChEaXNwbGF5SW5mb0tpbmQuUFJPUEVSVFkpLFxuICAgICAgICAgIG5hbWU6IGNvbXBsZXRpb24ucHJvcGVydHksXG4gICAgICAgICAgc29ydFRleHQ6IGNvbXBsZXRpb24ucHJvcGVydHksXG4gICAgICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEF0dHJpYnV0ZUNvbXBsZXRpb25TeW1ib2woXG4gICAgY29tcGxldGlvbjogQXR0cmlidXRlQ29tcGxldGlvbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB0cy5TeW1ib2x8bnVsbCB7XG4gIHN3aXRjaCAoY29tcGxldGlvbi5raW5kKSB7XG4gICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21BdHRyaWJ1dGU6XG4gICAgY2FzZSBBdHRyaWJ1dGVDb21wbGV0aW9uS2luZC5Eb21Qcm9wZXJ0eTpcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlQXR0cmlidXRlOlxuICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuU3RydWN0dXJhbERpcmVjdGl2ZUF0dHJpYnV0ZTpcbiAgICAgIHJldHVybiBjb21wbGV0aW9uLmRpcmVjdGl2ZS50c1N5bWJvbDtcbiAgICBjYXNlIEF0dHJpYnV0ZUNvbXBsZXRpb25LaW5kLkRpcmVjdGl2ZUlucHV0OlxuICAgIGNhc2UgQXR0cmlidXRlQ29tcGxldGlvbktpbmQuRGlyZWN0aXZlT3V0cHV0OlxuICAgICAgcmV0dXJuIGNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2woY29tcGxldGlvbi5kaXJlY3RpdmUudHNTeW1ib2wpXG4gICAgICAgICAgICAgICAgIC5nZXRQcm9wZXJ0eShjb21wbGV0aW9uLmNsYXNzUHJvcGVydHlOYW1lKSA/P1xuICAgICAgICAgIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIGBDc3NTZWxlY3RvcmAgYXR0cmlidXRlcywgd2hpY2ggYXJlIGludGVybmFsbHkgcmVwcmVzZW50ZWQgaW4gYSB6aXBwZWQgYXJyYXkgc3R5bGVcbiAqIHdoaWNoIGlzIG5vdCBjb25kdWNpdmUgdG8gc3RyYWlnaHRmb3J3YXJkIGl0ZXJhdGlvbi5cbiAqL1xuZnVuY3Rpb24qIHNlbGVjdG9yQXR0cmlidXRlcyhzZWxlY3RvcjogQ3NzU2VsZWN0b3IpOiBJdGVyYWJsZTxbc3RyaW5nLCBzdHJpbmddPiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0b3IuYXR0cnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICB5aWVsZCBbc2VsZWN0b3IuYXR0cnNbMF0sIHNlbGVjdG9yLmF0dHJzWzFdXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTdHJ1Y3R1cmFsQXR0cmlidXRlcyhtZXRhOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHN0cmluZ1tdIHtcbiAgaWYgKG1ldGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBzdHJ1Y3R1cmFsQXR0cmlidXRlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2VsZWN0b3JzID0gQ3NzU2VsZWN0b3IucGFyc2UobWV0YS5zZWxlY3Rvcik7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgIT09IG51bGwgJiYgc2VsZWN0b3IuZWxlbWVudCAhPT0gJ25nLXRlbXBsYXRlJykge1xuICAgICAgLy8gVGhpcyBwYXJ0aWN1bGFyIHNlbGVjdG9yIGRvZXMgbm90IGFwcGx5IHVuZGVyIHN0cnVjdHVyYWwgZGlyZWN0aXZlIHN5bnRheC5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEV2ZXJ5IGF0dHJpYnV0ZSBvZiB0aGlzIHNlbGVjdG9yIG11c3QgYmUgbmFtZS1vbmx5IC0gbm8gcmVxdWlyZWQgdmFsdWVzLlxuICAgIGNvbnN0IGF0dHJpYnV0ZVNlbGVjdG9ycyA9IEFycmF5LmZyb20oc2VsZWN0b3JBdHRyaWJ1dGVzKHNlbGVjdG9yKSk7XG4gICAgaWYgKCFhdHRyaWJ1dGVTZWxlY3RvcnMuZXZlcnkoKFtfLCBhdHRyVmFsdWVdKSA9PiBhdHRyVmFsdWUgPT09ICcnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gR2V0IGV2ZXJ5IG5hbWVkIHNlbGVjdG9yLlxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVTZWxlY3RvcnMubWFwKChbYXR0ck5hbWUsIF9dKSA9PiBhdHRyTmFtZSk7XG5cbiAgICAvLyBGaW5kIHRoZSBzaG9ydGVzdCBhdHRyaWJ1dGUuIFRoaXMgaXMgdGhlIHN0cnVjdHVyYWwgZGlyZWN0aXZlIFwiYmFzZVwiLCBhbmQgYWxsIHBvdGVudGlhbFxuICAgIC8vIGlucHV0IGJpbmRpbmdzIG11c3QgYmVnaW4gd2l0aCB0aGUgYmFzZS4gRS5nLiBpbiBgKm5nRm9yPVwibGV0IGEgb2YgYlwiYCwgYG5nRm9yYCBpcyB0aGVcbiAgICAvLyBiYXNlIGF0dHJpYnV0ZSwgYW5kIHRoZSBgb2ZgIGJpbmRpbmcga2V5IGNvcnJlc3BvbmRzIHRvIGFuIGlucHV0IG9mIGBuZ0Zvck9mYC5cbiAgICBjb25zdCBiYXNlQXR0ciA9IGF0dHJpYnV0ZXMucmVkdWNlKFxuICAgICAgICAocHJldiwgY3VycikgPT4gcHJldiA9PT0gbnVsbCB8fCBjdXJyLmxlbmd0aCA8IHByZXYubGVuZ3RoID8gY3VyciA6IHByZXYsXG4gICAgICAgIG51bGwgYXMgc3RyaW5nIHwgbnVsbCk7XG4gICAgaWYgKGJhc2VBdHRyID09PSBudWxsKSB7XG4gICAgICAvLyBObyBhdHRyaWJ1dGVzIGluIHRoaXMgc2VsZWN0b3I/XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBhdHRyaWJ1dGVzIGFyZSBjb21wYXRpYmxlIHdpdGggdXNlIGFzIGEgc3RydWN0dXJhbCBkaXJlY3RpdmUuXG4gICAgY29uc3QgaXNWYWxpZCA9IChhdHRyOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIC8vIFRoZSBiYXNlIGF0dHJpYnV0ZSBpcyB2YWxpZCBieSBkZWZhdWx0LlxuICAgICAgaWYgKGF0dHIgPT09IGJhc2VBdHRyKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tYmFzZSBhdHRyaWJ1dGVzIG11c3QgYWxsIGJlIHByZWZpeGVkIHdpdGggdGhlIGJhc2UgYXR0cmlidXRlLlxuICAgICAgaWYgKCFhdHRyLnN0YXJ0c1dpdGgoYmFzZUF0dHIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gTm9uLWJhc2UgYXR0cmlidXRlcyBtdXN0IGFsc28gY29ycmVzcG9uZCB0byBkaXJlY3RpdmUgaW5wdXRzLlxuICAgICAgaWYgKCFtZXRhLmlucHV0cy5oYXNCaW5kaW5nUHJvcGVydHlOYW1lKGF0dHIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBhdHRyaWJ1dGUgaXMgY29tcGF0aWJsZS5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBpZiAoIWF0dHJpYnV0ZXMuZXZlcnkoaXNWYWxpZCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIFRoaXMgYXR0cmlidXRlIGlzIHZhbGlkIGFzIGEgc3RydWN0dXJhbCBhdHRyaWJ1dGUgZm9yIHRoaXMgZGlyZWN0aXZlLlxuICAgIHN0cnVjdHVyYWxBdHRyaWJ1dGVzLnB1c2goYmFzZUF0dHIpO1xuICB9XG5cbiAgcmV0dXJuIHN0cnVjdHVyYWxBdHRyaWJ1dGVzO1xufVxuIl19