(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/utils", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/ts_utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isExternalTemplate = exports.isTypeScriptFile = exports.flatMap = exports.isDollarEvent = exports.filterAliasImports = exports.getDirectiveMatchesForAttribute = exports.getDirectiveMatchesForElementTag = exports.getTemplateInfoAtPosition = exports.isExpressionNode = exports.isTemplateNode = exports.isTemplateNodeWithKeyAndValue = exports.toTextSpan = exports.getTextSpanOfNode = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var e = require("@angular/compiler/src/expression_parser/ast"); // e for expression AST
    var t = require("@angular/compiler/src/render3/r3_ast"); // t for template AST
    var ts = require("typescript");
    var display_parts_1 = require("@angular/language-service/ivy/display_parts");
    var ts_utils_1 = require("@angular/language-service/ivy/ts_utils");
    function getTextSpanOfNode(node) {
        if (isTemplateNodeWithKeyAndValue(node)) {
            return toTextSpan(node.keySpan);
        }
        else if (node instanceof e.PropertyWrite || node instanceof e.MethodCall ||
            node instanceof e.BindingPipe || node instanceof e.PropertyRead) {
            // The `name` part of a `PropertyWrite`, `MethodCall`, and `BindingPipe` does not
            // have its own AST so there is no way to retrieve a `Symbol` for just the `name` via a specific
            // node.
            return toTextSpan(node.nameSpan);
        }
        else {
            return toTextSpan(node.sourceSpan);
        }
    }
    exports.getTextSpanOfNode = getTextSpanOfNode;
    function toTextSpan(span) {
        var start, end;
        if (span instanceof compiler_1.AbsoluteSourceSpan) {
            start = span.start;
            end = span.end;
        }
        else {
            start = span.start.offset;
            end = span.end.offset;
        }
        return { start: start, length: end - start };
    }
    exports.toTextSpan = toTextSpan;
    function isTemplateNodeWithKeyAndValue(node) {
        return isTemplateNode(node) && node.hasOwnProperty('keySpan');
    }
    exports.isTemplateNodeWithKeyAndValue = isTemplateNodeWithKeyAndValue;
    function isTemplateNode(node) {
        // Template node implements the Node interface so we cannot use instanceof.
        return node.sourceSpan instanceof compiler_1.ParseSourceSpan;
    }
    exports.isTemplateNode = isTemplateNode;
    function isExpressionNode(node) {
        return node instanceof e.AST;
    }
    exports.isExpressionNode = isExpressionNode;
    function getInlineTemplateInfoAtPosition(sf, position, compiler) {
        var expression = ts_utils_1.findTightestNode(sf, position);
        if (expression === undefined) {
            return undefined;
        }
        var classDecl = ts_utils_1.getParentClassDeclaration(expression);
        if (classDecl === undefined) {
            return undefined;
        }
        // Return `undefined` if the position is not on the template expression or the template resource
        // is not inline.
        var resources = compiler.getComponentResources(classDecl);
        if (resources === null || metadata_1.isExternalResource(resources.template) ||
            expression !== resources.template.expression) {
            return undefined;
        }
        var template = compiler.getTemplateTypeChecker().getTemplate(classDecl);
        if (template === null) {
            return undefined;
        }
        return { template: template, component: classDecl };
    }
    /**
     * Retrieves the `ts.ClassDeclaration` at a location along with its template nodes.
     */
    function getTemplateInfoAtPosition(fileName, position, compiler) {
        if (isTypeScriptFile(fileName)) {
            var sf = compiler.getNextProgram().getSourceFile(fileName);
            if (sf === undefined) {
                return undefined;
            }
            return getInlineTemplateInfoAtPosition(sf, position, compiler);
        }
        else {
            return getFirstComponentForTemplateFile(fileName, compiler);
        }
    }
    exports.getTemplateInfoAtPosition = getTemplateInfoAtPosition;
    /**
     * First, attempt to sort component declarations by file name.
     * If the files are the same, sort by start location of the declaration.
     */
    function tsDeclarationSortComparator(a, b) {
        var aFile = a.getSourceFile().fileName;
        var bFile = b.getSourceFile().fileName;
        if (aFile < bFile) {
            return -1;
        }
        else if (aFile > bFile) {
            return 1;
        }
        else {
            return b.getFullStart() - a.getFullStart();
        }
    }
    function getFirstComponentForTemplateFile(fileName, compiler) {
        var e_1, _a;
        var templateTypeChecker = compiler.getTemplateTypeChecker();
        var components = compiler.getComponentsWithTemplateFile(fileName);
        var sortedComponents = Array.from(components).sort(tsDeclarationSortComparator);
        try {
            for (var sortedComponents_1 = tslib_1.__values(sortedComponents), sortedComponents_1_1 = sortedComponents_1.next(); !sortedComponents_1_1.done; sortedComponents_1_1 = sortedComponents_1.next()) {
                var component = sortedComponents_1_1.value;
                if (!ts.isClassDeclaration(component)) {
                    continue;
                }
                var template = templateTypeChecker.getTemplate(component);
                if (template === null) {
                    continue;
                }
                return { template: template, component: component };
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (sortedComponents_1_1 && !sortedComponents_1_1.done && (_a = sortedComponents_1.return)) _a.call(sortedComponents_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return undefined;
    }
    /**
     * Given an attribute node, converts it to string form.
     */
    function toAttributeString(attribute) {
        var _a, _b;
        if (attribute instanceof t.BoundEvent) {
            return "[" + attribute.name + "]";
        }
        else {
            return "[" + attribute.name + "=" + ((_b = (_a = attribute.valueSpan) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '') + "]";
        }
    }
    function getNodeName(node) {
        return node instanceof t.Template ? node.tagName : node.name;
    }
    /**
     * Given a template or element node, returns all attributes on the node.
     */
    function getAttributes(node) {
        var attributes = tslib_1.__spread(node.attributes, node.inputs, node.outputs);
        if (node instanceof t.Template) {
            attributes.push.apply(attributes, tslib_1.__spread(node.templateAttrs));
        }
        return attributes;
    }
    /**
     * Given two `Set`s, returns all items in the `left` which do not appear in the `right`.
     */
    function difference(left, right) {
        var e_2, _a;
        var result = new Set();
        try {
            for (var left_1 = tslib_1.__values(left), left_1_1 = left_1.next(); !left_1_1.done; left_1_1 = left_1.next()) {
                var dir = left_1_1.value;
                if (!right.has(dir)) {
                    result.add(dir);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (left_1_1 && !left_1_1.done && (_a = left_1.return)) _a.call(left_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    }
    /**
     * Given an element or template, determines which directives match because the tag is present. For
     * example, if a directive selector is `div[myAttr]`, this would match div elements but would not if
     * the selector were just `[myAttr]`. We find which directives are applied because of this tag by
     * elimination: compare the directive matches with the tag present against the directive matches
     * without it. The difference would be the directives which match because the tag is present.
     *
     * @param element The element or template node that the attribute/tag is part of.
     * @param directives The list of directives to match against.
     * @returns The list of directives matching the tag name via the strategy described above.
     */
    // TODO(atscott): Add unit tests for this and the one for attributes
    function getDirectiveMatchesForElementTag(element, directives) {
        var attributes = getAttributes(element);
        var allAttrs = attributes.map(toAttributeString);
        var allDirectiveMatches = getDirectiveMatchesForSelector(directives, getNodeName(element) + allAttrs.join(''));
        var matchesWithoutElement = getDirectiveMatchesForSelector(directives, allAttrs.join(''));
        return difference(allDirectiveMatches, matchesWithoutElement);
    }
    exports.getDirectiveMatchesForElementTag = getDirectiveMatchesForElementTag;
    /**
     * Given an attribute name, determines which directives match because the attribute is present. We
     * find which directives are applied because of this attribute by elimination: compare the directive
     * matches with the attribute present against the directive matches without it. The difference would
     * be the directives which match because the attribute is present.
     *
     * @param name The name of the attribute
     * @param hostNode The node which the attribute appears on
     * @param directives The list of directives to match against.
     * @returns The list of directives matching the tag name via the strategy described above.
     */
    function getDirectiveMatchesForAttribute(name, hostNode, directives) {
        var attributes = getAttributes(hostNode);
        var allAttrs = attributes.map(toAttributeString);
        var allDirectiveMatches = getDirectiveMatchesForSelector(directives, getNodeName(hostNode) + allAttrs.join(''));
        var attrsExcludingName = attributes.filter(function (a) { return a.name !== name; }).map(toAttributeString);
        var matchesWithoutAttr = getDirectiveMatchesForSelector(directives, getNodeName(hostNode) + attrsExcludingName.join(''));
        return difference(allDirectiveMatches, matchesWithoutAttr);
    }
    exports.getDirectiveMatchesForAttribute = getDirectiveMatchesForAttribute;
    /**
     * Given a list of directives and a text to use as a selector, returns the directives which match
     * for the selector.
     */
    function getDirectiveMatchesForSelector(directives, selector) {
        var selectors = compiler_1.CssSelector.parse(selector);
        if (selectors.length === 0) {
            return new Set();
        }
        return new Set(directives.filter(function (dir) {
            if (dir.selector === null) {
                return false;
            }
            var matcher = new compiler_1.SelectorMatcher();
            matcher.addSelectables(compiler_1.CssSelector.parse(dir.selector));
            return selectors.some(function (selector) { return matcher.match(selector, null); });
        }));
    }
    /**
     * Returns a new `ts.SymbolDisplayPart` array which has the alias imports from the tcb filtered
     * out, i.e. `i0.NgForOf`.
     */
    function filterAliasImports(displayParts) {
        var tcbAliasImportRegex = /i\d+/;
        function isImportAlias(part) {
            return part.kind === display_parts_1.ALIAS_NAME && tcbAliasImportRegex.test(part.text);
        }
        function isDotPunctuation(part) {
            return part.kind === display_parts_1.SYMBOL_PUNC && part.text === '.';
        }
        return displayParts.filter(function (part, i) {
            var previousPart = displayParts[i - 1];
            var nextPart = displayParts[i + 1];
            var aliasNameFollowedByDot = isImportAlias(part) && nextPart !== undefined && isDotPunctuation(nextPart);
            var dotPrecededByAlias = isDotPunctuation(part) && previousPart !== undefined && isImportAlias(previousPart);
            return !aliasNameFollowedByDot && !dotPrecededByAlias;
        });
    }
    exports.filterAliasImports = filterAliasImports;
    function isDollarEvent(n) {
        return n instanceof e.PropertyRead && n.name === '$event' &&
            n.receiver instanceof e.ImplicitReceiver && !(n.receiver instanceof e.ThisReceiver);
    }
    exports.isDollarEvent = isDollarEvent;
    /**
     * Returns a new array formed by applying a given callback function to each element of the array,
     * and then flattening the result by one level.
     */
    function flatMap(items, f) {
        var e_3, _a;
        var results = [];
        try {
            for (var items_1 = tslib_1.__values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
                var x = items_1_1.value;
                results.push.apply(results, tslib_1.__spread(f(x)));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return results;
    }
    exports.flatMap = flatMap;
    function isTypeScriptFile(fileName) {
        return fileName.endsWith('.ts');
    }
    exports.isTypeScriptFile = isTypeScriptFile;
    function isExternalTemplate(fileName) {
        return !isTypeScriptFile(fileName);
    }
    exports.isExternalTemplate = isExternalTemplate;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQW9HO0lBRXBHLHFFQUE0RTtJQUk1RSwrREFBaUUsQ0FBRSx1QkFBdUI7SUFDMUYsd0RBQTBELENBQVMscUJBQXFCO0lBQ3hGLCtCQUFpQztJQUVqQyw2RUFBd0Q7SUFDeEQsbUVBQXVFO0lBRXZFLFNBQWdCLGlCQUFpQixDQUFDLElBQWtCO1FBQ2xELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pDO2FBQU0sSUFDSCxJQUFJLFlBQVksQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLFlBQVksQ0FBQyxDQUFDLFVBQVU7WUFDL0QsSUFBSSxZQUFZLENBQUMsQ0FBQyxXQUFXLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUU7WUFDbkUsaUZBQWlGO1lBQ2pGLGdHQUFnRztZQUNoRyxRQUFRO1lBQ1IsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEM7SUFDSCxDQUFDO0lBYkQsOENBYUM7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBd0M7UUFDakUsSUFBSSxLQUFhLEVBQUUsR0FBVyxDQUFDO1FBQy9CLElBQUksSUFBSSxZQUFZLDZCQUFrQixFQUFFO1lBQ3RDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ2hCO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtB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Z0IsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDL0MsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQWdCLGtCQUFrQixDQUFDLFFBQWdCO1FBQ2pELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRkQsZ0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBDc3NTZWxlY3RvciwgUGFyc2VTb3VyY2VTcGFuLCBTZWxlY3Rvck1hdGNoZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7aXNFeHRlcm5hbFJlc291cmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0RpYWdub3N0aWMgYXMgbmdEaWFnbm9zdGljLCBpc05nRGlhZ25vc3RpY30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCAqIGFzIGUgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2V4cHJlc3Npb25fcGFyc2VyL2FzdCc7ICAvLyBlIGZvciBleHByZXNzaW9uIEFTVFxuaW1wb3J0ICogYXMgdCBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnOyAgICAgICAgIC8vIHQgZm9yIHRlbXBsYXRlIEFTVFxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QUxJQVNfTkFNRSwgU1lNQk9MX1BVTkN9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldFBhcmVudENsYXNzRGVjbGFyYXRpb259IGZyb20gJy4vdHNfdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4dFNwYW5PZk5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogdHMuVGV4dFNwYW4ge1xuICBpZiAoaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUobm9kZSkpIHtcbiAgICByZXR1cm4gdG9UZXh0U3Bhbihub2RlLmtleVNwYW4pO1xuICB9IGVsc2UgaWYgKFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIGUuUHJvcGVydHlXcml0ZSB8fCBub2RlIGluc3RhbmNlb2YgZS5NZXRob2RDYWxsIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgZS5CaW5kaW5nUGlwZSB8fCBub2RlIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVJlYWQpIHtcbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAsIGBNZXRob2RDYWxsYCwgYW5kIGBCaW5kaW5nUGlwZWAgZG9lcyBub3RcbiAgICAvLyBoYXZlIGl0cyBvd24gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWNcbiAgICAvLyBub2RlLlxuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUubmFtZVNwYW4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUuc291cmNlU3Bhbik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvVGV4dFNwYW4oc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgbGV0IHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyO1xuICBpZiAoc3BhbiBpbnN0YW5jZW9mIEFic29sdXRlU291cmNlU3Bhbikge1xuICAgIHN0YXJ0ID0gc3Bhbi5zdGFydDtcbiAgICBlbmQgPSBzcGFuLmVuZDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4ge3N0YXJ0LCBsZW5ndGg6IGVuZCAtIHN0YXJ0fTtcbn1cblxuaW50ZXJmYWNlIE5vZGVXaXRoS2V5QW5kVmFsdWUgZXh0ZW5kcyB0Lk5vZGUge1xuICBrZXlTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG4gIHZhbHVlU3Bhbj86IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKG5vZGU6IHQuTm9kZXxlLkFTVCk6IG5vZGUgaXMgTm9kZVdpdGhLZXlBbmRWYWx1ZSB7XG4gIHJldHVybiBpc1RlbXBsYXRlTm9kZShub2RlKSAmJiBub2RlLmhhc093blByb3BlcnR5KCdrZXlTcGFuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RlbXBsYXRlTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIHQuTm9kZSB7XG4gIC8vIFRlbXBsYXRlIG5vZGUgaW1wbGVtZW50cyB0aGUgTm9kZSBpbnRlcmZhY2Ugc28gd2UgY2Fubm90IHVzZSBpbnN0YW5jZW9mLlxuICByZXR1cm4gbm9kZS5zb3VyY2VTcGFuIGluc3RhbmNlb2YgUGFyc2VTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIGUuQVNUIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiBlLkFTVDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluZm8ge1xuICB0ZW1wbGF0ZTogdC5Ob2RlW107XG4gIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuZnVuY3Rpb24gZ2V0SW5saW5lVGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBzZjogdHMuU291cmNlRmlsZSwgcG9zaXRpb246IG51bWJlciwgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgY29uc3QgZXhwcmVzc2lvbiA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKGV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsID0gZ2V0UGFyZW50Q2xhc3NEZWNsYXJhdGlvbihleHByZXNzaW9uKTtcbiAgaWYgKGNsYXNzRGVjbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcG9zaXRpb24gaXMgbm90IG9uIHRoZSB0ZW1wbGF0ZSBleHByZXNzaW9uIG9yIHRoZSB0ZW1wbGF0ZSByZXNvdXJjZVxuICAvLyBpcyBub3QgaW5saW5lLlxuICBjb25zdCByZXNvdXJjZXMgPSBjb21waWxlci5nZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsKTtcbiAgaWYgKHJlc291cmNlcyA9PT0gbnVsbCB8fCBpc0V4dGVybmFsUmVzb3VyY2UocmVzb3VyY2VzLnRlbXBsYXRlKSB8fFxuICAgICAgZXhwcmVzc2lvbiAhPT0gcmVzb3VyY2VzLnRlbXBsYXRlLmV4cHJlc3Npb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgdGVtcGxhdGUgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0VGVtcGxhdGUoY2xhc3NEZWNsKTtcbiAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB7dGVtcGxhdGUsIGNvbXBvbmVudDogY2xhc3NEZWNsfTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBhdCBhIGxvY2F0aW9uIGFsb25nIHdpdGggaXRzIHRlbXBsYXRlIG5vZGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBjb21waWxlcjogTmdDb21waWxlcik6IFRlbXBsYXRlSW5mb3x1bmRlZmluZWQge1xuICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICBjb25zdCBzZiA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGdldElubGluZVRlbXBsYXRlSW5mb0F0UG9zaXRpb24oc2YsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldEZpcnN0Q29tcG9uZW50Rm9yVGVtcGxhdGVGaWxlKGZpbGVOYW1lLCBjb21waWxlcik7XG4gIH1cbn1cblxuLyoqXG4gKiBGaXJzdCwgYXR0ZW1wdCB0byBzb3J0IGNvbXBvbmVudCBkZWNsYXJhdGlvbnMgYnkgZmlsZSBuYW1lLlxuICogSWYgdGhlIGZpbGVzIGFyZSB0aGUgc2FtZSwgc29ydCBieSBzdGFydCBsb2NhdGlvbiBvZiB0aGUgZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHRzRGVjbGFyYXRpb25Tb3J0Q29tcGFyYXRvcihhOiBEZWNsYXJhdGlvbk5vZGUsIGI6IERlY2xhcmF0aW9uTm9kZSk6IG51bWJlciB7XG4gIGNvbnN0IGFGaWxlID0gYS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gIGNvbnN0IGJGaWxlID0gYi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gIGlmIChhRmlsZSA8IGJGaWxlKSB7XG4gICAgcmV0dXJuIC0xO1xuICB9IGVsc2UgaWYgKGFGaWxlID4gYkZpbGUpIHtcbiAgICByZXR1cm4gMTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYi5nZXRGdWxsU3RhcnQoKSAtIGEuZ2V0RnVsbFN0YXJ0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Rmlyc3RDb21wb25lbnRGb3JUZW1wbGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgY29uc3Qgc29ydGVkQ29tcG9uZW50cyA9IEFycmF5LmZyb20oY29tcG9uZW50cykuc29ydCh0c0RlY2xhcmF0aW9uU29ydENvbXBhcmF0b3IpO1xuICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBzb3J0ZWRDb21wb25lbnRzKSB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHJldHVybiB7dGVtcGxhdGUsIGNvbXBvbmVudH07XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGF0dHJpYnV0ZSBub2RlLCBjb252ZXJ0cyBpdCB0byBzdHJpbmcgZm9ybS5cbiAqL1xuZnVuY3Rpb24gdG9BdHRyaWJ1dGVTdHJpbmcoYXR0cmlidXRlOiB0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQpOiBzdHJpbmcge1xuICBpZiAoYXR0cmlidXRlIGluc3RhbmNlb2YgdC5Cb3VuZEV2ZW50KSB7XG4gICAgcmV0dXJuIGBbJHthdHRyaWJ1dGUubmFtZX1dYDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYFske2F0dHJpYnV0ZS5uYW1lfT0ke2F0dHJpYnV0ZS52YWx1ZVNwYW4/LnRvU3RyaW5nKCkgPz8gJyd9XWA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZU5hbWUobm9kZTogdC5UZW1wbGF0ZXx0LkVsZW1lbnQpOiBzdHJpbmcge1xuICByZXR1cm4gbm9kZSBpbnN0YW5jZW9mIHQuVGVtcGxhdGUgPyBub2RlLnRhZ05hbWUgOiBub2RlLm5hbWU7XG59XG5cbi8qKlxuICogR2l2ZW4gYSB0ZW1wbGF0ZSBvciBlbGVtZW50IG5vZGUsIHJldHVybnMgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIG5vZGUuXG4gKi9cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZXMobm9kZTogdC5UZW1wbGF0ZXxcbiAgICAgICAgICAgICAgICAgICAgICAgdC5FbGVtZW50KTogQXJyYXk8dC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50PiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXM6IEFycmF5PHQuVGV4dEF0dHJpYnV0ZXx0LkJvdW5kQXR0cmlidXRlfHQuQm91bmRFdmVudD4gPVxuICAgICAgWy4uLm5vZGUuYXR0cmlidXRlcywgLi4ubm9kZS5pbnB1dHMsIC4uLm5vZGUub3V0cHV0c107XG4gIGlmIChub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5ub2RlLnRlbXBsYXRlQXR0cnMpO1xuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBgU2V0YHMsIHJldHVybnMgYWxsIGl0ZW1zIGluIHRoZSBgbGVmdGAgd2hpY2ggZG8gbm90IGFwcGVhciBpbiB0aGUgYHJpZ2h0YC5cbiAqL1xuZnVuY3Rpb24gZGlmZmVyZW5jZTxUPihsZWZ0OiBTZXQ8VD4sIHJpZ2h0OiBTZXQ8VD4pOiBTZXQ8VD4ge1xuICBjb25zdCByZXN1bHQgPSBuZXcgU2V0PFQ+KCk7XG4gIGZvciAoY29uc3QgZGlyIG9mIGxlZnQpIHtcbiAgICBpZiAoIXJpZ2h0LmhhcyhkaXIpKSB7XG4gICAgICByZXN1bHQuYWRkKGRpcik7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYW4gZWxlbWVudCBvciB0ZW1wbGF0ZSwgZGV0ZXJtaW5lcyB3aGljaCBkaXJlY3RpdmVzIG1hdGNoIGJlY2F1c2UgdGhlIHRhZyBpcyBwcmVzZW50LiBGb3JcbiAqIGV4YW1wbGUsIGlmIGEgZGlyZWN0aXZlIHNlbGVjdG9yIGlzIGBkaXZbbXlBdHRyXWAsIHRoaXMgd291bGQgbWF0Y2ggZGl2IGVsZW1lbnRzIGJ1dCB3b3VsZCBub3QgaWZcbiAqIHRoZSBzZWxlY3RvciB3ZXJlIGp1c3QgYFtteUF0dHJdYC4gV2UgZmluZCB3aGljaCBkaXJlY3RpdmVzIGFyZSBhcHBsaWVkIGJlY2F1c2Ugb2YgdGhpcyB0YWcgYnlcbiAqIGVsaW1pbmF0aW9uOiBjb21wYXJlIHRoZSBkaXJlY3RpdmUgbWF0Y2hlcyB3aXRoIHRoZSB0YWcgcHJlc2VudCBhZ2FpbnN0IHRoZSBkaXJlY3RpdmUgbWF0Y2hlc1xuICogd2l0aG91dCBpdC4gVGhlIGRpZmZlcmVuY2Ugd291bGQgYmUgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2ggYmVjYXVzZSB0aGUgdGFnIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIGVsZW1lbnQgVGhlIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZSB0aGF0IHRoZSBhdHRyaWJ1dGUvdGFnIGlzIHBhcnQgb2YuXG4gKiBAcGFyYW0gZGlyZWN0aXZlcyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIHRvIG1hdGNoIGFnYWluc3QuXG4gKiBAcmV0dXJucyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIG1hdGNoaW5nIHRoZSB0YWcgbmFtZSB2aWEgdGhlIHN0cmF0ZWd5IGRlc2NyaWJlZCBhYm92ZS5cbiAqL1xuLy8gVE9ETyhhdHNjb3R0KTogQWRkIHVuaXQgdGVzdHMgZm9yIHRoaXMgYW5kIHRoZSBvbmUgZm9yIGF0dHJpYnV0ZXNcbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhcbiAgICBlbGVtZW50OiB0LlRlbXBsYXRlfHQuRWxlbWVudCwgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW10pOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXMgPSBnZXRBdHRyaWJ1dGVzKGVsZW1lbnQpO1xuICBjb25zdCBhbGxBdHRycyA9IGF0dHJpYnV0ZXMubWFwKHRvQXR0cmlidXRlU3RyaW5nKTtcbiAgY29uc3QgYWxsRGlyZWN0aXZlTWF0Y2hlcyA9XG4gICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoZGlyZWN0aXZlcywgZ2V0Tm9kZU5hbWUoZWxlbWVudCkgKyBhbGxBdHRycy5qb2luKCcnKSk7XG4gIGNvbnN0IG1hdGNoZXNXaXRob3V0RWxlbWVudCA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihkaXJlY3RpdmVzLCBhbGxBdHRycy5qb2luKCcnKSk7XG4gIHJldHVybiBkaWZmZXJlbmNlKGFsbERpcmVjdGl2ZU1hdGNoZXMsIG1hdGNoZXNXaXRob3V0RWxlbWVudCk7XG59XG5cbi8qKlxuICogR2l2ZW4gYW4gYXR0cmlidXRlIG5hbWUsIGRldGVybWluZXMgd2hpY2ggZGlyZWN0aXZlcyBtYXRjaCBiZWNhdXNlIHRoZSBhdHRyaWJ1dGUgaXMgcHJlc2VudC4gV2VcbiAqIGZpbmQgd2hpY2ggZGlyZWN0aXZlcyBhcmUgYXBwbGllZCBiZWNhdXNlIG9mIHRoaXMgYXR0cmlidXRlIGJ5IGVsaW1pbmF0aW9uOiBjb21wYXJlIHRoZSBkaXJlY3RpdmVcbiAqIG1hdGNoZXMgd2l0aCB0aGUgYXR0cmlidXRlIHByZXNlbnQgYWdhaW5zdCB0aGUgZGlyZWN0aXZlIG1hdGNoZXMgd2l0aG91dCBpdC4gVGhlIGRpZmZlcmVuY2Ugd291bGRcbiAqIGJlIHRoZSBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIGJlY2F1c2UgdGhlIGF0dHJpYnV0ZSBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGVcbiAqIEBwYXJhbSBob3N0Tm9kZSBUaGUgbm9kZSB3aGljaCB0aGUgYXR0cmlidXRlIGFwcGVhcnMgb25cbiAqIEBwYXJhbSBkaXJlY3RpdmVzIFRoZSBsaXN0IG9mIGRpcmVjdGl2ZXMgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqIEByZXR1cm5zIFRoZSBsaXN0IG9mIGRpcmVjdGl2ZXMgbWF0Y2hpbmcgdGhlIHRhZyBuYW1lIHZpYSB0aGUgc3RyYXRlZ3kgZGVzY3JpYmVkIGFib3ZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZShcbiAgICBuYW1lOiBzdHJpbmcsIGhvc3ROb2RlOiB0LlRlbXBsYXRlfHQuRWxlbWVudCxcbiAgICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVTeW1ib2xbXSk6IFNldDxEaXJlY3RpdmVTeW1ib2w+IHtcbiAgY29uc3QgYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXMoaG9zdE5vZGUpO1xuICBjb25zdCBhbGxBdHRycyA9IGF0dHJpYnV0ZXMubWFwKHRvQXR0cmlidXRlU3RyaW5nKTtcbiAgY29uc3QgYWxsRGlyZWN0aXZlTWF0Y2hlcyA9XG4gICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoZGlyZWN0aXZlcywgZ2V0Tm9kZU5hbWUoaG9zdE5vZGUpICsgYWxsQXR0cnMuam9pbignJykpO1xuICBjb25zdCBhdHRyc0V4Y2x1ZGluZ05hbWUgPSBhdHRyaWJ1dGVzLmZpbHRlcihhID0+IGEubmFtZSAhPT0gbmFtZSkubWFwKHRvQXR0cmlidXRlU3RyaW5nKTtcbiAgY29uc3QgbWF0Y2hlc1dpdGhvdXRBdHRyID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKFxuICAgICAgZGlyZWN0aXZlcywgZ2V0Tm9kZU5hbWUoaG9zdE5vZGUpICsgYXR0cnNFeGNsdWRpbmdOYW1lLmpvaW4oJycpKTtcbiAgcmV0dXJuIGRpZmZlcmVuY2UoYWxsRGlyZWN0aXZlTWF0Y2hlcywgbWF0Y2hlc1dpdGhvdXRBdHRyKTtcbn1cblxuLyoqXG4gKiBHaXZlbiBhIGxpc3Qgb2YgZGlyZWN0aXZlcyBhbmQgYSB0ZXh0IHRvIHVzZSBhcyBhIHNlbGVjdG9yLCByZXR1cm5zIHRoZSBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoXG4gKiBmb3IgdGhlIHNlbGVjdG9yLlxuICovXG5mdW5jdGlvbiBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoXG4gICAgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW10sIHNlbGVjdG9yOiBzdHJpbmcpOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPiB7XG4gIGNvbnN0IHNlbGVjdG9ycyA9IENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKTtcbiAgaWYgKHNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG4gIHJldHVybiBuZXcgU2V0KGRpcmVjdGl2ZXMuZmlsdGVyKChkaXI6IERpcmVjdGl2ZVN5bWJvbCkgPT4ge1xuICAgIGlmIChkaXIuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcigpO1xuICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLnNlbGVjdG9yKSk7XG5cbiAgICByZXR1cm4gc2VsZWN0b3JzLnNvbWUoc2VsZWN0b3IgPT4gbWF0Y2hlci5tYXRjaChzZWxlY3RvciwgbnVsbCkpO1xuICB9KSk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBgdHMuU3ltYm9sRGlzcGxheVBhcnRgIGFycmF5IHdoaWNoIGhhcyB0aGUgYWxpYXMgaW1wb3J0cyBmcm9tIHRoZSB0Y2IgZmlsdGVyZWRcbiAqIG91dCwgaS5lLiBgaTAuTmdGb3JPZmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJBbGlhc0ltcG9ydHMoZGlzcGxheVBhcnRzOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gIGNvbnN0IHRjYkFsaWFzSW1wb3J0UmVnZXggPSAvaVxcZCsvO1xuICBmdW5jdGlvbiBpc0ltcG9ydEFsaWFzKHBhcnQ6IHtraW5kOiBzdHJpbmcsIHRleHQ6IHN0cmluZ30pIHtcbiAgICByZXR1cm4gcGFydC5raW5kID09PSBBTElBU19OQU1FICYmIHRjYkFsaWFzSW1wb3J0UmVnZXgudGVzdChwYXJ0LnRleHQpO1xuICB9XG4gIGZ1bmN0aW9uIGlzRG90UHVuY3R1YXRpb24ocGFydDoge2tpbmQ6IHN0cmluZywgdGV4dDogc3RyaW5nfSkge1xuICAgIHJldHVybiBwYXJ0LmtpbmQgPT09IFNZTUJPTF9QVU5DICYmIHBhcnQudGV4dCA9PT0gJy4nO1xuICB9XG5cbiAgcmV0dXJuIGRpc3BsYXlQYXJ0cy5maWx0ZXIoKHBhcnQsIGkpID0+IHtcbiAgICBjb25zdCBwcmV2aW91c1BhcnQgPSBkaXNwbGF5UGFydHNbaSAtIDFdO1xuICAgIGNvbnN0IG5leHRQYXJ0ID0gZGlzcGxheVBhcnRzW2kgKyAxXTtcblxuICAgIGNvbnN0IGFsaWFzTmFtZUZvbGxvd2VkQnlEb3QgPVxuICAgICAgICBpc0ltcG9ydEFsaWFzKHBhcnQpICYmIG5leHRQYXJ0ICE9PSB1bmRlZmluZWQgJiYgaXNEb3RQdW5jdHVhdGlvbihuZXh0UGFydCk7XG4gICAgY29uc3QgZG90UHJlY2VkZWRCeUFsaWFzID1cbiAgICAgICAgaXNEb3RQdW5jdHVhdGlvbihwYXJ0KSAmJiBwcmV2aW91c1BhcnQgIT09IHVuZGVmaW5lZCAmJiBpc0ltcG9ydEFsaWFzKHByZXZpb3VzUGFydCk7XG5cbiAgICByZXR1cm4gIWFsaWFzTmFtZUZvbGxvd2VkQnlEb3QgJiYgIWRvdFByZWNlZGVkQnlBbGlhcztcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RvbGxhckV2ZW50KG46IHQuTm9kZXxlLkFTVCk6IG4gaXMgZS5Qcm9wZXJ0eVJlYWQge1xuICByZXR1cm4gbiBpbnN0YW5jZW9mIGUuUHJvcGVydHlSZWFkICYmIG4ubmFtZSA9PT0gJyRldmVudCcgJiZcbiAgICAgIG4ucmVjZWl2ZXIgaW5zdGFuY2VvZiBlLkltcGxpY2l0UmVjZWl2ZXIgJiYgIShuLnJlY2VpdmVyIGluc3RhbmNlb2YgZS5UaGlzUmVjZWl2ZXIpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgYXJyYXkgZm9ybWVkIGJ5IGFwcGx5aW5nIGEgZ2l2ZW4gY2FsbGJhY2sgZnVuY3Rpb24gdG8gZWFjaCBlbGVtZW50IG9mIHRoZSBhcnJheSxcbiAqIGFuZCB0aGVuIGZsYXR0ZW5pbmcgdGhlIHJlc3VsdCBieSBvbmUgbGV2ZWwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbGF0TWFwPFQsIFI+KGl0ZW1zOiBUW118cmVhZG9ubHkgVFtdLCBmOiAoaXRlbTogVCkgPT4gUltdIHwgcmVhZG9ubHkgUltdKTogUltdIHtcbiAgY29uc3QgcmVzdWx0czogUltdID0gW107XG4gIGZvciAoY29uc3QgeCBvZiBpdGVtcykge1xuICAgIHJlc3VsdHMucHVzaCguLi5mKHgpKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbFRlbXBsYXRlKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICFpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lKTtcbn1cbiJdfQ==