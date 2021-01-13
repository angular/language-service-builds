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
    exports.isWithin = exports.isExternalTemplate = exports.isTypeScriptFile = exports.flatMap = exports.isDollarEvent = exports.filterAliasImports = exports.getDirectiveMatchesForAttribute = exports.makeElementSelector = exports.getDirectiveMatchesForElementTag = exports.getTemplateInfoAtPosition = exports.isExpressionNode = exports.isTemplateNode = exports.isWithinKeyValue = exports.isWithinKey = exports.isTemplateNodeWithKeyAndValue = exports.toTextSpan = exports.getTextSpanOfNode = void 0;
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
    function isWithinKey(position, node) {
        var keySpan = node.keySpan, valueSpan = node.valueSpan;
        if (valueSpan === undefined && node instanceof compiler_1.TmplAstBoundEvent) {
            valueSpan = node.handlerSpan;
        }
        var isWithinKeyValue = isWithin(position, keySpan) || !!(valueSpan && isWithin(position, valueSpan));
        return isWithinKeyValue;
    }
    exports.isWithinKey = isWithinKey;
    function isWithinKeyValue(position, node) {
        var keySpan = node.keySpan, valueSpan = node.valueSpan;
        if (valueSpan === undefined && node instanceof compiler_1.TmplAstBoundEvent) {
            valueSpan = node.handlerSpan;
        }
        var isWithinKeyValue = isWithin(position, keySpan) || !!(valueSpan && isWithin(position, valueSpan));
        return isWithinKeyValue;
    }
    exports.isWithinKeyValue = isWithinKeyValue;
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
    function makeElementSelector(element) {
        var attributes = getAttributes(element);
        var allAttrs = attributes.map(toAttributeString);
        return getNodeName(element) + allAttrs.join('');
    }
    exports.makeElementSelector = makeElementSelector;
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
    function isWithin(position, span) {
        var start, end;
        if (span instanceof compiler_1.ParseSourceSpan) {
            start = span.start.offset;
            end = span.end.offset;
        }
        else {
            start = span.start;
            end = span.end;
        }
        // Note both start and end are inclusive because we want to match conditions
        // like ¦start and end¦ where ¦ is the cursor.
        return start <= position && position <= end;
    }
    exports.isWithin = isWithin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQXVIO0lBRXZILHFFQUE0RTtJQUk1RSwrREFBaUUsQ0FBRSx1QkFBdUI7SUFDMUYsd0RBQTBELENBQVMscUJBQXFCO0lBQ3hGLCtCQUFpQztJQUVqQyw2RUFBd0Q7SUFDeEQsbUVBQXVFO0lBRXZFLFNBQWdCLGlCQUFpQixDQUFDLElBQWtCO1FBQ2xELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pDO2FBQU0sSUFDSCxJQUFJLFlBQVksQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLFlBQVksQ0FBQyxDQUFDLFVBQVU7WUFDL0QsSUFBSSxZQUFZLENBQUMsQ0FBQyxXQUFXLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUU7WUFDbkUsaUZBQWlGO1lBQ2pGLGdHQUFnRztZQUNoRyxRQUFRO1lBQ1IsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEM7SUFDSCxDQUFDO0lBYkQsOENBYUM7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBd0M7UUFDakUsSUFBSSxLQUFhLEVBQUUsR0FBVyxDQUFDO1FBQy9CLElBQUksSUFBSSxZQUFZLDZCQUFrQixFQUFFO1lBQ3RDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ2hCO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtB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Ozs7O1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQU5ELDBCQU1DO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDL0MsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQWdCLGtCQUFrQixDQUFDLFFBQWdCO1FBQ2pELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRkQsZ0RBRUM7SUFFRCxTQUFnQixRQUFRLENBQUMsUUFBZ0IsRUFBRSxJQUF3QztRQUNqRixJQUFJLEtBQWEsRUFBRSxHQUFXLENBQUM7UUFDL0IsSUFBSSxJQUFJLFlBQVksMEJBQWUsRUFBRTtZQUNuQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDMUIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO1NBQ3ZCO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNuQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNoQjtRQUNELDRFQUE0RTtRQUM1RSw4Q0FBOEM7UUFDOUMsT0FBTyxLQUFLLElBQUksUUFBUSxJQUFJLFFBQVEsSUFBSSxHQUFHLENBQUM7SUFDOUMsQ0FBQztJQVpELDRCQVlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQ3NzU2VsZWN0b3IsIFBhcnNlU291cmNlU3BhbiwgU2VsZWN0b3JNYXRjaGVyLCBUbXBsQXN0Qm91bmRFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtpc0V4dGVybmFsUmVzb3VyY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbWV0YWRhdGEnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RGlhZ25vc3RpYyBhcyBuZ0RpYWdub3N0aWMsIGlzTmdEaWFnbm9zdGljfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0ICogYXMgZSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvZXhwcmVzc2lvbl9wYXJzZXIvYXN0JzsgIC8vIGUgZm9yIGV4cHJlc3Npb24gQVNUXG5pbXBvcnQgKiBhcyB0IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7ICAgICAgICAgLy8gdCBmb3IgdGVtcGxhdGUgQVNUXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBTElBU19OQU1FLCBTWU1CT0xfUFVOQ30gZnJvbSAnLi9kaXNwbGF5X3BhcnRzJztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZSwgZ2V0UGFyZW50Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi90c191dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZXh0U3Bhbk9mTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiB0cy5UZXh0U3BhbiB7XG4gIGlmIChpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShub2RlKSkge1xuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUua2V5U3Bhbik7XG4gIH0gZWxzZSBpZiAoXG4gICAgICBub2RlIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVdyaXRlIHx8IG5vZGUgaW5zdGFuY2VvZiBlLk1ldGhvZENhbGwgfHxcbiAgICAgIG5vZGUgaW5zdGFuY2VvZiBlLkJpbmRpbmdQaXBlIHx8IG5vZGUgaW5zdGFuY2VvZiBlLlByb3BlcnR5UmVhZCkge1xuICAgIC8vIFRoZSBgbmFtZWAgcGFydCBvZiBhIGBQcm9wZXJ0eVdyaXRlYCwgYE1ldGhvZENhbGxgLCBhbmQgYEJpbmRpbmdQaXBlYCBkb2VzIG5vdFxuICAgIC8vIGhhdmUgaXRzIG93biBBU1Qgc28gdGhlcmUgaXMgbm8gd2F5IHRvIHJldHJpZXZlIGEgYFN5bWJvbGAgZm9yIGp1c3QgdGhlIGBuYW1lYCB2aWEgYSBzcGVjaWZpY1xuICAgIC8vIG5vZGUuXG4gICAgcmV0dXJuIHRvVGV4dFNwYW4obm9kZS5uYW1lU3Bhbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRvVGV4dFNwYW4obm9kZS5zb3VyY2VTcGFuKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9UZXh0U3BhbihzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW58UGFyc2VTb3VyY2VTcGFuKTogdHMuVGV4dFNwYW4ge1xuICBsZXQgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXI7XG4gIGlmIChzcGFuIGluc3RhbmNlb2YgQWJzb2x1dGVTb3VyY2VTcGFuKSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0O1xuICAgIGVuZCA9IHNwYW4uZW5kO1xuICB9IGVsc2Uge1xuICAgIHN0YXJ0ID0gc3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgZW5kID0gc3Bhbi5lbmQub2Zmc2V0O1xuICB9XG4gIHJldHVybiB7c3RhcnQsIGxlbmd0aDogZW5kIC0gc3RhcnR9O1xufVxuXG5pbnRlcmZhY2UgTm9kZVdpdGhLZXlBbmRWYWx1ZSBleHRlbmRzIHQuTm9kZSB7XG4gIGtleVNwYW46IFBhcnNlU291cmNlU3BhbjtcbiAgdmFsdWVTcGFuPzogUGFyc2VTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUobm9kZTogdC5Ob2RlfGUuQVNUKTogbm9kZSBpcyBOb2RlV2l0aEtleUFuZFZhbHVlIHtcbiAgcmV0dXJuIGlzVGVtcGxhdGVOb2RlKG5vZGUpICYmIG5vZGUuaGFzT3duUHJvcGVydHkoJ2tleVNwYW4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2l0aGluS2V5KHBvc2l0aW9uOiBudW1iZXIsIG5vZGU6IE5vZGVXaXRoS2V5QW5kVmFsdWUpOiBib29sZWFuIHtcbiAgbGV0IHtrZXlTcGFuLCB2YWx1ZVNwYW59ID0gbm9kZTtcbiAgaWYgKHZhbHVlU3BhbiA9PT0gdW5kZWZpbmVkICYmIG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgIHZhbHVlU3BhbiA9IG5vZGUuaGFuZGxlclNwYW47XG4gIH1cbiAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICBpc1dpdGhpbihwb3NpdGlvbiwga2V5U3BhbikgfHwgISEodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgcmV0dXJuIGlzV2l0aGluS2V5VmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpbktleVZhbHVlKHBvc2l0aW9uOiBudW1iZXIsIG5vZGU6IE5vZGVXaXRoS2V5QW5kVmFsdWUpOiBib29sZWFuIHtcbiAgbGV0IHtrZXlTcGFuLCB2YWx1ZVNwYW59ID0gbm9kZTtcbiAgaWYgKHZhbHVlU3BhbiA9PT0gdW5kZWZpbmVkICYmIG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgIHZhbHVlU3BhbiA9IG5vZGUuaGFuZGxlclNwYW47XG4gIH1cbiAgY29uc3QgaXNXaXRoaW5LZXlWYWx1ZSA9XG4gICAgICBpc1dpdGhpbihwb3NpdGlvbiwga2V5U3BhbikgfHwgISEodmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCB2YWx1ZVNwYW4pKTtcbiAgcmV0dXJuIGlzV2l0aGluS2V5VmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RlbXBsYXRlTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIHQuTm9kZSB7XG4gIC8vIFRlbXBsYXRlIG5vZGUgaW1wbGVtZW50cyB0aGUgTm9kZSBpbnRlcmZhY2Ugc28gd2UgY2Fubm90IHVzZSBpbnN0YW5jZW9mLlxuICByZXR1cm4gbm9kZS5zb3VyY2VTcGFuIGluc3RhbmNlb2YgUGFyc2VTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIGUuQVNUIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiBlLkFTVDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluZm8ge1xuICB0ZW1wbGF0ZTogdC5Ob2RlW107XG4gIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuZnVuY3Rpb24gZ2V0SW5saW5lVGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBzZjogdHMuU291cmNlRmlsZSwgcG9zaXRpb246IG51bWJlciwgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgY29uc3QgZXhwcmVzc2lvbiA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHBvc2l0aW9uKTtcbiAgaWYgKGV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsID0gZ2V0UGFyZW50Q2xhc3NEZWNsYXJhdGlvbihleHByZXNzaW9uKTtcbiAgaWYgKGNsYXNzRGVjbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcG9zaXRpb24gaXMgbm90IG9uIHRoZSB0ZW1wbGF0ZSBleHByZXNzaW9uIG9yIHRoZSB0ZW1wbGF0ZSByZXNvdXJjZVxuICAvLyBpcyBub3QgaW5saW5lLlxuICBjb25zdCByZXNvdXJjZXMgPSBjb21waWxlci5nZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsKTtcbiAgaWYgKHJlc291cmNlcyA9PT0gbnVsbCB8fCBpc0V4dGVybmFsUmVzb3VyY2UocmVzb3VyY2VzLnRlbXBsYXRlKSB8fFxuICAgICAgZXhwcmVzc2lvbiAhPT0gcmVzb3VyY2VzLnRlbXBsYXRlLmV4cHJlc3Npb24pIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgdGVtcGxhdGUgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCkuZ2V0VGVtcGxhdGUoY2xhc3NEZWNsKTtcbiAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB7dGVtcGxhdGUsIGNvbXBvbmVudDogY2xhc3NEZWNsfTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBhdCBhIGxvY2F0aW9uIGFsb25nIHdpdGggaXRzIHRlbXBsYXRlIG5vZGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBjb21waWxlcjogTmdDb21waWxlcik6IFRlbXBsYXRlSW5mb3x1bmRlZmluZWQge1xuICBpZiAoaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSkpIHtcbiAgICBjb25zdCBzZiA9IGNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGdldElubGluZVRlbXBsYXRlSW5mb0F0UG9zaXRpb24oc2YsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldEZpcnN0Q29tcG9uZW50Rm9yVGVtcGxhdGVGaWxlKGZpbGVOYW1lLCBjb21waWxlcik7XG4gIH1cbn1cblxuLyoqXG4gKiBGaXJzdCwgYXR0ZW1wdCB0byBzb3J0IGNvbXBvbmVudCBkZWNsYXJhdGlvbnMgYnkgZmlsZSBuYW1lLlxuICogSWYgdGhlIGZpbGVzIGFyZSB0aGUgc2FtZSwgc29ydCBieSBzdGFydCBsb2NhdGlvbiBvZiB0aGUgZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHRzRGVjbGFyYXRpb25Tb3J0Q29tcGFyYXRvcihhOiBEZWNsYXJhdGlvbk5vZGUsIGI6IERlY2xhcmF0aW9uTm9kZSk6IG51bWJlciB7XG4gIGNvbnN0IGFGaWxlID0gYS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gIGNvbnN0IGJGaWxlID0gYi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gIGlmIChhRmlsZSA8IGJGaWxlKSB7XG4gICAgcmV0dXJuIC0xO1xuICB9IGVsc2UgaWYgKGFGaWxlID4gYkZpbGUpIHtcbiAgICByZXR1cm4gMTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYi5nZXRGdWxsU3RhcnQoKSAtIGEuZ2V0RnVsbFN0YXJ0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Rmlyc3RDb21wb25lbnRGb3JUZW1wbGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IGNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IGNvbXBpbGVyLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKGZpbGVOYW1lKTtcbiAgY29uc3Qgc29ydGVkQ29tcG9uZW50cyA9IEFycmF5LmZyb20oY29tcG9uZW50cykuc29ydCh0c0RlY2xhcmF0aW9uU29ydENvbXBhcmF0b3IpO1xuICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBzb3J0ZWRDb21wb25lbnRzKSB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHJldHVybiB7dGVtcGxhdGUsIGNvbXBvbmVudH07XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGF0dHJpYnV0ZSBub2RlLCBjb252ZXJ0cyBpdCB0byBzdHJpbmcgZm9ybS5cbiAqL1xuZnVuY3Rpb24gdG9BdHRyaWJ1dGVTdHJpbmcoYXR0cmlidXRlOiB0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQpOiBzdHJpbmcge1xuICBpZiAoYXR0cmlidXRlIGluc3RhbmNlb2YgdC5Cb3VuZEV2ZW50KSB7XG4gICAgcmV0dXJuIGBbJHthdHRyaWJ1dGUubmFtZX1dYDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYFske2F0dHJpYnV0ZS5uYW1lfT0ke2F0dHJpYnV0ZS52YWx1ZVNwYW4/LnRvU3RyaW5nKCkgPz8gJyd9XWA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZU5hbWUobm9kZTogdC5UZW1wbGF0ZXx0LkVsZW1lbnQpOiBzdHJpbmcge1xuICByZXR1cm4gbm9kZSBpbnN0YW5jZW9mIHQuVGVtcGxhdGUgPyBub2RlLnRhZ05hbWUgOiBub2RlLm5hbWU7XG59XG5cbi8qKlxuICogR2l2ZW4gYSB0ZW1wbGF0ZSBvciBlbGVtZW50IG5vZGUsIHJldHVybnMgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIG5vZGUuXG4gKi9cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZXMobm9kZTogdC5UZW1wbGF0ZXxcbiAgICAgICAgICAgICAgICAgICAgICAgdC5FbGVtZW50KTogQXJyYXk8dC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50PiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXM6IEFycmF5PHQuVGV4dEF0dHJpYnV0ZXx0LkJvdW5kQXR0cmlidXRlfHQuQm91bmRFdmVudD4gPVxuICAgICAgWy4uLm5vZGUuYXR0cmlidXRlcywgLi4ubm9kZS5pbnB1dHMsIC4uLm5vZGUub3V0cHV0c107XG4gIGlmIChub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSkge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5ub2RlLnRlbXBsYXRlQXR0cnMpO1xuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBgU2V0YHMsIHJldHVybnMgYWxsIGl0ZW1zIGluIHRoZSBgbGVmdGAgd2hpY2ggZG8gbm90IGFwcGVhciBpbiB0aGUgYHJpZ2h0YC5cbiAqL1xuZnVuY3Rpb24gZGlmZmVyZW5jZTxUPihsZWZ0OiBTZXQ8VD4sIHJpZ2h0OiBTZXQ8VD4pOiBTZXQ8VD4ge1xuICBjb25zdCByZXN1bHQgPSBuZXcgU2V0PFQ+KCk7XG4gIGZvciAoY29uc3QgZGlyIG9mIGxlZnQpIHtcbiAgICBpZiAoIXJpZ2h0LmhhcyhkaXIpKSB7XG4gICAgICByZXN1bHQuYWRkKGRpcik7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYW4gZWxlbWVudCBvciB0ZW1wbGF0ZSwgZGV0ZXJtaW5lcyB3aGljaCBkaXJlY3RpdmVzIG1hdGNoIGJlY2F1c2UgdGhlIHRhZyBpcyBwcmVzZW50LiBGb3JcbiAqIGV4YW1wbGUsIGlmIGEgZGlyZWN0aXZlIHNlbGVjdG9yIGlzIGBkaXZbbXlBdHRyXWAsIHRoaXMgd291bGQgbWF0Y2ggZGl2IGVsZW1lbnRzIGJ1dCB3b3VsZCBub3QgaWZcbiAqIHRoZSBzZWxlY3RvciB3ZXJlIGp1c3QgYFtteUF0dHJdYC4gV2UgZmluZCB3aGljaCBkaXJlY3RpdmVzIGFyZSBhcHBsaWVkIGJlY2F1c2Ugb2YgdGhpcyB0YWcgYnlcbiAqIGVsaW1pbmF0aW9uOiBjb21wYXJlIHRoZSBkaXJlY3RpdmUgbWF0Y2hlcyB3aXRoIHRoZSB0YWcgcHJlc2VudCBhZ2FpbnN0IHRoZSBkaXJlY3RpdmUgbWF0Y2hlc1xuICogd2l0aG91dCBpdC4gVGhlIGRpZmZlcmVuY2Ugd291bGQgYmUgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2ggYmVjYXVzZSB0aGUgdGFnIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIGVsZW1lbnQgVGhlIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZSB0aGF0IHRoZSBhdHRyaWJ1dGUvdGFnIGlzIHBhcnQgb2YuXG4gKiBAcGFyYW0gZGlyZWN0aXZlcyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIHRvIG1hdGNoIGFnYWluc3QuXG4gKiBAcmV0dXJucyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIG1hdGNoaW5nIHRoZSB0YWcgbmFtZSB2aWEgdGhlIHN0cmF0ZWd5IGRlc2NyaWJlZCBhYm92ZS5cbiAqL1xuLy8gVE9ETyhhdHNjb3R0KTogQWRkIHVuaXQgdGVzdHMgZm9yIHRoaXMgYW5kIHRoZSBvbmUgZm9yIGF0dHJpYnV0ZXNcbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhcbiAgICBlbGVtZW50OiB0LlRlbXBsYXRlfHQuRWxlbWVudCwgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW10pOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXMgPSBnZXRBdHRyaWJ1dGVzKGVsZW1lbnQpO1xuICBjb25zdCBhbGxBdHRycyA9IGF0dHJpYnV0ZXMubWFwKHRvQXR0cmlidXRlU3RyaW5nKTtcbiAgY29uc3QgYWxsRGlyZWN0aXZlTWF0Y2hlcyA9XG4gICAgICBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoZGlyZWN0aXZlcywgZ2V0Tm9kZU5hbWUoZWxlbWVudCkgKyBhbGxBdHRycy5qb2luKCcnKSk7XG4gIGNvbnN0IG1hdGNoZXNXaXRob3V0RWxlbWVudCA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihkaXJlY3RpdmVzLCBhbGxBdHRycy5qb2luKCcnKSk7XG4gIHJldHVybiBkaWZmZXJlbmNlKGFsbERpcmVjdGl2ZU1hdGNoZXMsIG1hdGNoZXNXaXRob3V0RWxlbWVudCk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VFbGVtZW50U2VsZWN0b3IoZWxlbWVudDogdC5FbGVtZW50fHQuVGVtcGxhdGUpOiBzdHJpbmcge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlcyhlbGVtZW50KTtcbiAgY29uc3QgYWxsQXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIHJldHVybiBnZXROb2RlTmFtZShlbGVtZW50KSArIGFsbEF0dHJzLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGF0dHJpYnV0ZSBuYW1lLCBkZXRlcm1pbmVzIHdoaWNoIGRpcmVjdGl2ZXMgbWF0Y2ggYmVjYXVzZSB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQuIFdlXG4gKiBmaW5kIHdoaWNoIGRpcmVjdGl2ZXMgYXJlIGFwcGxpZWQgYmVjYXVzZSBvZiB0aGlzIGF0dHJpYnV0ZSBieSBlbGltaW5hdGlvbjogY29tcGFyZSB0aGUgZGlyZWN0aXZlXG4gKiBtYXRjaGVzIHdpdGggdGhlIGF0dHJpYnV0ZSBwcmVzZW50IGFnYWluc3QgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIHdpdGhvdXQgaXQuIFRoZSBkaWZmZXJlbmNlIHdvdWxkXG4gKiBiZSB0aGUgZGlyZWN0aXZlcyB3aGljaCBtYXRjaCBiZWNhdXNlIHRoZSBhdHRyaWJ1dGUgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gKiBAcGFyYW0gaG9zdE5vZGUgVGhlIG5vZGUgd2hpY2ggdGhlIGF0dHJpYnV0ZSBhcHBlYXJzIG9uXG4gKiBAcGFyYW0gZGlyZWN0aXZlcyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIHRvIG1hdGNoIGFnYWluc3QuXG4gKiBAcmV0dXJucyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIG1hdGNoaW5nIHRoZSB0YWcgbmFtZSB2aWEgdGhlIHN0cmF0ZWd5IGRlc2NyaWJlZCBhYm92ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgbmFtZTogc3RyaW5nLCBob3N0Tm9kZTogdC5UZW1wbGF0ZXx0LkVsZW1lbnQsXG4gICAgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW10pOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXMgPSBnZXRBdHRyaWJ1dGVzKGhvc3ROb2RlKTtcbiAgY29uc3QgYWxsQXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IGFsbERpcmVjdGl2ZU1hdGNoZXMgPVxuICAgICAgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGhvc3ROb2RlKSArIGFsbEF0dHJzLmpvaW4oJycpKTtcbiAgY29uc3QgYXR0cnNFeGNsdWRpbmdOYW1lID0gYXR0cmlidXRlcy5maWx0ZXIoYSA9PiBhLm5hbWUgIT09IG5hbWUpLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IG1hdGNoZXNXaXRob3V0QXR0ciA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihcbiAgICAgIGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGhvc3ROb2RlKSArIGF0dHJzRXhjbHVkaW5nTmFtZS5qb2luKCcnKSk7XG4gIHJldHVybiBkaWZmZXJlbmNlKGFsbERpcmVjdGl2ZU1hdGNoZXMsIG1hdGNoZXNXaXRob3V0QXR0cik7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBsaXN0IG9mIGRpcmVjdGl2ZXMgYW5kIGEgdGV4dCB0byB1c2UgYXMgYSBzZWxlY3RvciwgcmV0dXJucyB0aGUgZGlyZWN0aXZlcyB3aGljaCBtYXRjaFxuICogZm9yIHRoZSBzZWxlY3Rvci5cbiAqL1xuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKFxuICAgIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdLCBzZWxlY3Rvcjogc3RyaW5nKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBzZWxlY3RvcnMgPSBDc3NTZWxlY3Rvci5wYXJzZShzZWxlY3Rvcik7XG4gIGlmIChzZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgfVxuICByZXR1cm4gbmV3IFNldChkaXJlY3RpdmVzLmZpbHRlcigoZGlyOiBEaXJlY3RpdmVTeW1ib2wpID0+IHtcbiAgICBpZiAoZGlyLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIoKTtcbiAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpci5zZWxlY3RvcikpO1xuXG4gICAgcmV0dXJuIHNlbGVjdG9ycy5zb21lKHNlbGVjdG9yID0+IG1hdGNoZXIubWF0Y2goc2VsZWN0b3IsIG51bGwpKTtcbiAgfSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgYHRzLlN5bWJvbERpc3BsYXlQYXJ0YCBhcnJheSB3aGljaCBoYXMgdGhlIGFsaWFzIGltcG9ydHMgZnJvbSB0aGUgdGNiIGZpbHRlcmVkXG4gKiBvdXQsIGkuZS4gYGkwLk5nRm9yT2ZgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQWxpYXNJbXBvcnRzKGRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10ge1xuICBjb25zdCB0Y2JBbGlhc0ltcG9ydFJlZ2V4ID0gL2lcXGQrLztcbiAgZnVuY3Rpb24gaXNJbXBvcnRBbGlhcyhwYXJ0OiB7a2luZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmd9KSB7XG4gICAgcmV0dXJuIHBhcnQua2luZCA9PT0gQUxJQVNfTkFNRSAmJiB0Y2JBbGlhc0ltcG9ydFJlZ2V4LnRlc3QocGFydC50ZXh0KTtcbiAgfVxuICBmdW5jdGlvbiBpc0RvdFB1bmN0dWF0aW9uKHBhcnQ6IHtraW5kOiBzdHJpbmcsIHRleHQ6IHN0cmluZ30pIHtcbiAgICByZXR1cm4gcGFydC5raW5kID09PSBTWU1CT0xfUFVOQyAmJiBwYXJ0LnRleHQgPT09ICcuJztcbiAgfVxuXG4gIHJldHVybiBkaXNwbGF5UGFydHMuZmlsdGVyKChwYXJ0LCBpKSA9PiB7XG4gICAgY29uc3QgcHJldmlvdXNQYXJ0ID0gZGlzcGxheVBhcnRzW2kgLSAxXTtcbiAgICBjb25zdCBuZXh0UGFydCA9IGRpc3BsYXlQYXJ0c1tpICsgMV07XG5cbiAgICBjb25zdCBhbGlhc05hbWVGb2xsb3dlZEJ5RG90ID1cbiAgICAgICAgaXNJbXBvcnRBbGlhcyhwYXJ0KSAmJiBuZXh0UGFydCAhPT0gdW5kZWZpbmVkICYmIGlzRG90UHVuY3R1YXRpb24obmV4dFBhcnQpO1xuICAgIGNvbnN0IGRvdFByZWNlZGVkQnlBbGlhcyA9XG4gICAgICAgIGlzRG90UHVuY3R1YXRpb24ocGFydCkgJiYgcHJldmlvdXNQYXJ0ICE9PSB1bmRlZmluZWQgJiYgaXNJbXBvcnRBbGlhcyhwcmV2aW91c1BhcnQpO1xuXG4gICAgcmV0dXJuICFhbGlhc05hbWVGb2xsb3dlZEJ5RG90ICYmICFkb3RQcmVjZWRlZEJ5QWxpYXM7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEb2xsYXJFdmVudChuOiB0Lk5vZGV8ZS5BU1QpOiBuIGlzIGUuUHJvcGVydHlSZWFkIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBlLlByb3BlcnR5UmVhZCAmJiBuLm5hbWUgPT09ICckZXZlbnQnICYmXG4gICAgICBuLnJlY2VpdmVyIGluc3RhbmNlb2YgZS5JbXBsaWNpdFJlY2VpdmVyICYmICEobi5yZWNlaXZlciBpbnN0YW5jZW9mIGUuVGhpc1JlY2VpdmVyKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZvcm1lZCBieSBhcHBseWluZyBhIGdpdmVuIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgYXJyYXksXG4gKiBhbmQgdGhlbiBmbGF0dGVuaW5nIHRoZSByZXN1bHQgYnkgb25lIGxldmVsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdE1hcDxULCBSPihpdGVtczogVFtdfHJlYWRvbmx5IFRbXSwgZjogKGl0ZW06IFQpID0+IFJbXSB8IHJlYWRvbmx5IFJbXSk6IFJbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IFJbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHggb2YgaXRlbXMpIHtcbiAgICByZXN1bHRzLnB1c2goLi4uZih4KSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpbihwb3NpdGlvbjogbnVtYmVyLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW58UGFyc2VTb3VyY2VTcGFuKTogYm9vbGVhbiB7XG4gIGxldCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcjtcbiAgaWYgKHNwYW4gaW5zdGFuY2VvZiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQ7XG4gICAgZW5kID0gc3Bhbi5lbmQ7XG4gIH1cbiAgLy8gTm90ZSBib3RoIHN0YXJ0IGFuZCBlbmQgYXJlIGluY2x1c2l2ZSBiZWNhdXNlIHdlIHdhbnQgdG8gbWF0Y2ggY29uZGl0aW9uc1xuICAvLyBsaWtlIMKmc3RhcnQgYW5kIGVuZMKmIHdoZXJlIMKmIGlzIHRoZSBjdXJzb3IuXG4gIHJldHVybiBzdGFydCA8PSBwb3NpdGlvbiAmJiBwb3NpdGlvbiA8PSBlbmQ7XG59XG4iXX0=