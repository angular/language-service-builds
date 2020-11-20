(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/utils", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/common/quick_info"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.flatMap = exports.isDollarEvent = exports.filterAliasImports = exports.getDirectiveMatchesForAttribute = exports.getDirectiveMatchesForElementTag = exports.getTemplateInfoAtPosition = exports.isExpressionNode = exports.isTemplateNode = exports.isTemplateNodeWithKeyAndValue = exports.toTextSpan = exports.getTextSpanOfNode = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var e = require("@angular/compiler/src/expression_parser/ast"); // e for expression AST
    var t = require("@angular/compiler/src/render3/r3_ast"); // t for template AST
    var ts = require("typescript");
    var quick_info_1 = require("@angular/language-service/common/quick_info");
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
    /**
     * Retrieves the `ts.ClassDeclaration` at a location along with its template nodes.
     */
    function getTemplateInfoAtPosition(fileName, position, compiler) {
        if (fileName.endsWith('.ts')) {
            return getInlineTemplateInfoAtPosition(fileName, position, compiler);
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
     * Retrieves the `ts.ClassDeclaration` at a location along with its template nodes.
     */
    function getInlineTemplateInfoAtPosition(fileName, position, compiler) {
        var e_2, _a;
        var sourceFile = compiler.getNextProgram().getSourceFile(fileName);
        if (!sourceFile) {
            return undefined;
        }
        try {
            // We only support top level statements / class declarations
            for (var _b = tslib_1.__values(sourceFile.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                var statement = _c.value;
                if (!ts.isClassDeclaration(statement) || position < statement.pos || position > statement.end) {
                    continue;
                }
                var template = compiler.getTemplateTypeChecker().getTemplate(statement);
                if (template === null) {
                    return undefined;
                }
                return { template: template, component: statement };
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
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
        var e_3, _a;
        var result = new Set();
        try {
            for (var left_1 = tslib_1.__values(left), left_1_1 = left_1.next(); !left_1_1.done; left_1_1 = left_1.next()) {
                var dir = left_1_1.value;
                if (!right.has(dir)) {
                    result.add(dir);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (left_1_1 && !left_1_1.done && (_a = left_1.return)) _a.call(left_1);
            }
            finally { if (e_3) throw e_3.error; }
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
            return part.kind === quick_info_1.ALIAS_NAME && tcbAliasImportRegex.test(part.text);
        }
        function isDotPunctuation(part) {
            return part.kind === quick_info_1.SYMBOL_PUNC && part.text === '.';
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
        var e_4, _a;
        var results = [];
        try {
            for (var items_1 = tslib_1.__values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
                var x = items_1_1.value;
                results.push.apply(results, tslib_1.__spread(f(x)));
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return results;
    }
    exports.flatMap = flatMap;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQW9HO0lBSXBHLCtEQUFpRSxDQUFFLHVCQUF1QjtJQUMxRix3REFBMEQsQ0FBUyxxQkFBcUI7SUFDeEYsK0JBQWlDO0lBRWpDLDBFQUE2RDtJQUU3RCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFrQjtRQUNsRCxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNqQzthQUFNLElBQ0gsSUFBSSxZQUFZLENBQUMsQ0FBQyxhQUFhLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxVQUFVO1lBQy9ELElBQUksWUFBWSxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksWUFBWSxDQUFDLENBQUMsWUFBWSxFQUFFO1lBQ25FLGlGQUFpRjtZQUNqRixnR0FBZ0c7WUFDaEcsUUFBUTtZQUNSLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztJQWJELDhDQWFDO0lBRUQsU0FBZ0IsVUFBVSxDQUFDLElBQXdDO1FBQ2pFLElBQUksS0FBYSxFQUFFLEdBQVcsQ0FBQztRQUMvQixJQUFJLElBQUksWUFBWSw2QkFBa0IsRUFBRTtZQUN0QyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNuQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNoQjthQUFNO1lBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzFCLEdB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QUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEYsSUFBTSxrQkFBa0IsR0FDcEIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxLQUFLLFNBQVMsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFeEYsT0FBTyxDQUFDLHNCQUFzQixJQUFJLENBQUMsa0JBQWtCLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBcEJELGdEQW9CQztJQUVELFNBQWdCLGFBQWEsQ0FBQyxDQUFlO1FBQzNDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO1lBQ3JELENBQUMsQ0FBQyxRQUFRLFlBQVksQ0FBQyxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxZQUFZLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBSEQsc0NBR0M7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixPQUFPLENBQU8sS0FBdUIsRUFBRSxDQUFrQzs7UUFDdkYsSUFBTSxPQUFPLEdBQVEsRUFBRSxDQUFDOztZQUN4QixLQUFnQixJQUFBLFVBQUEsaUJBQUEsS0FBSyxDQUFBLDRCQUFBLCtDQUFFO2dCQUFsQixJQUFNLENBQUMsa0JBQUE7Z0JBQ1YsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRTthQUN2Qjs7Ozs7Ozs7O1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQU5ELDBCQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQ3NzU2VsZWN0b3IsIFBhcnNlU291cmNlU3BhbiwgU2VsZWN0b3JNYXRjaGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0ICogYXMgZSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvZXhwcmVzc2lvbl9wYXJzZXIvYXN0JzsgIC8vIGUgZm9yIGV4cHJlc3Npb24gQVNUXG5pbXBvcnQgKiBhcyB0IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX2FzdCc7ICAgICAgICAgLy8gdCBmb3IgdGVtcGxhdGUgQVNUXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBTElBU19OQU1FLCBTWU1CT0xfUFVOQ30gZnJvbSAnLi4vY29tbW9uL3F1aWNrX2luZm8nO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4dFNwYW5PZk5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogdHMuVGV4dFNwYW4ge1xuICBpZiAoaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUobm9kZSkpIHtcbiAgICByZXR1cm4gdG9UZXh0U3Bhbihub2RlLmtleVNwYW4pO1xuICB9IGVsc2UgaWYgKFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIGUuUHJvcGVydHlXcml0ZSB8fCBub2RlIGluc3RhbmNlb2YgZS5NZXRob2RDYWxsIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgZS5CaW5kaW5nUGlwZSB8fCBub2RlIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVJlYWQpIHtcbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAsIGBNZXRob2RDYWxsYCwgYW5kIGBCaW5kaW5nUGlwZWAgZG9lcyBub3RcbiAgICAvLyBoYXZlIGl0cyBvd24gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWNcbiAgICAvLyBub2RlLlxuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUubmFtZVNwYW4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUuc291cmNlU3Bhbik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvVGV4dFNwYW4oc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgbGV0IHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyO1xuICBpZiAoc3BhbiBpbnN0YW5jZW9mIEFic29sdXRlU291cmNlU3Bhbikge1xuICAgIHN0YXJ0ID0gc3Bhbi5zdGFydDtcbiAgICBlbmQgPSBzcGFuLmVuZDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4ge3N0YXJ0LCBsZW5ndGg6IGVuZCAtIHN0YXJ0fTtcbn1cblxuaW50ZXJmYWNlIE5vZGVXaXRoS2V5QW5kVmFsdWUgZXh0ZW5kcyB0Lk5vZGUge1xuICBrZXlTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG4gIHZhbHVlU3Bhbj86IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKG5vZGU6IHQuTm9kZXxlLkFTVCk6IG5vZGUgaXMgTm9kZVdpdGhLZXlBbmRWYWx1ZSB7XG4gIHJldHVybiBpc1RlbXBsYXRlTm9kZShub2RlKSAmJiBub2RlLmhhc093blByb3BlcnR5KCdrZXlTcGFuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RlbXBsYXRlTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIHQuTm9kZSB7XG4gIC8vIFRlbXBsYXRlIG5vZGUgaW1wbGVtZW50cyB0aGUgTm9kZSBpbnRlcmZhY2Ugc28gd2UgY2Fubm90IHVzZSBpbnN0YW5jZW9mLlxuICByZXR1cm4gbm9kZS5zb3VyY2VTcGFuIGluc3RhbmNlb2YgUGFyc2VTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uTm9kZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIGUuQVNUIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiBlLkFTVDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluZm8ge1xuICB0ZW1wbGF0ZTogdC5Ob2RlW107XG4gIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBhdCBhIGxvY2F0aW9uIGFsb25nIHdpdGggaXRzIHRlbXBsYXRlIG5vZGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBjb21waWxlcjogTmdDb21waWxlcik6IFRlbXBsYXRlSW5mb3x1bmRlZmluZWQge1xuICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgcmV0dXJuIGdldElubGluZVRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uLCBjb21waWxlcik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdldEZpcnN0Q29tcG9uZW50Rm9yVGVtcGxhdGVGaWxlKGZpbGVOYW1lLCBjb21waWxlcik7XG4gIH1cbn1cblxuXG4vKipcbiAqIEZpcnN0LCBhdHRlbXB0IHRvIHNvcnQgY29tcG9uZW50IGRlY2xhcmF0aW9ucyBieSBmaWxlIG5hbWUuXG4gKiBJZiB0aGUgZmlsZXMgYXJlIHRoZSBzYW1lLCBzb3J0IGJ5IHN0YXJ0IGxvY2F0aW9uIG9mIHRoZSBkZWNsYXJhdGlvbi5cbiAqL1xuZnVuY3Rpb24gdHNEZWNsYXJhdGlvblNvcnRDb21wYXJhdG9yKGE6IERlY2xhcmF0aW9uTm9kZSwgYjogRGVjbGFyYXRpb25Ob2RlKTogbnVtYmVyIHtcbiAgY29uc3QgYUZpbGUgPSBhLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgY29uc3QgYkZpbGUgPSBiLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgaWYgKGFGaWxlIDwgYkZpbGUpIHtcbiAgICByZXR1cm4gLTE7XG4gIH0gZWxzZSBpZiAoYUZpbGUgPiBiRmlsZSkge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBiLmdldEZ1bGxTdGFydCgpIC0gYS5nZXRGdWxsU3RhcnQoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGaXJzdENvbXBvbmVudEZvclRlbXBsYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBjb21waWxlcjogTmdDb21waWxlcik6IFRlbXBsYXRlSW5mb3xcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuICBjb25zdCBjb21wb25lbnRzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUoZmlsZU5hbWUpO1xuICBjb25zdCBzb3J0ZWRDb21wb25lbnRzID0gQXJyYXkuZnJvbShjb21wb25lbnRzKS5zb3J0KHRzRGVjbGFyYXRpb25Tb3J0Q29tcGFyYXRvcik7XG4gIGZvciAoY29uc3QgY29tcG9uZW50IG9mIHNvcnRlZENvbXBvbmVudHMpIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGUgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFRlbXBsYXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmV0dXJuIHt0ZW1wbGF0ZSwgY29tcG9uZW50fTtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgYXQgYSBsb2NhdGlvbiBhbG9uZyB3aXRoIGl0cyB0ZW1wbGF0ZSBub2Rlcy5cbiAqL1xuZnVuY3Rpb24gZ2V0SW5saW5lVGVtcGxhdGVJbmZvQXRQb3NpdGlvbihcbiAgICBmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLCBjb21waWxlcjogTmdDb21waWxlcik6IFRlbXBsYXRlSW5mb3x1bmRlZmluZWQge1xuICBjb25zdCBzb3VyY2VGaWxlID0gY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIFdlIG9ubHkgc3VwcG9ydCB0b3AgbGV2ZWwgc3RhdGVtZW50cyAvIGNsYXNzIGRlY2xhcmF0aW9uc1xuICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBzb3VyY2VGaWxlLnN0YXRlbWVudHMpIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpIHx8IHBvc2l0aW9uIDwgc3RhdGVtZW50LnBvcyB8fCBwb3NpdGlvbiA+IHN0YXRlbWVudC5lbmQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFRlbXBsYXRlKHN0YXRlbWVudCk7XG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7dGVtcGxhdGUsIGNvbXBvbmVudDogc3RhdGVtZW50fTtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYW4gYXR0cmlidXRlIG5vZGUsIGNvbnZlcnRzIGl0IHRvIHN0cmluZyBmb3JtLlxuICovXG5mdW5jdGlvbiB0b0F0dHJpYnV0ZVN0cmluZyhhdHRyaWJ1dGU6IHQuVGV4dEF0dHJpYnV0ZXx0LkJvdW5kQXR0cmlidXRlfHQuQm91bmRFdmVudCk6IHN0cmluZyB7XG4gIGlmIChhdHRyaWJ1dGUgaW5zdGFuY2VvZiB0LkJvdW5kRXZlbnQpIHtcbiAgICByZXR1cm4gYFske2F0dHJpYnV0ZS5uYW1lfV1gO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBgWyR7YXR0cmlidXRlLm5hbWV9PSR7YXR0cmlidXRlLnZhbHVlU3Bhbj8udG9TdHJpbmcoKSA/PyAnJ31dYDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXROb2RlTmFtZShub2RlOiB0LlRlbXBsYXRlfHQuRWxlbWVudCk6IHN0cmluZyB7XG4gIHJldHVybiBub2RlIGluc3RhbmNlb2YgdC5UZW1wbGF0ZSA/IG5vZGUudGFnTmFtZSA6IG5vZGUubmFtZTtcbn1cblxuLyoqXG4gKiBHaXZlbiBhIHRlbXBsYXRlIG9yIGVsZW1lbnQgbm9kZSwgcmV0dXJucyBhbGwgYXR0cmlidXRlcyBvbiB0aGUgbm9kZS5cbiAqL1xuZnVuY3Rpb24gZ2V0QXR0cmlidXRlcyhub2RlOiB0LlRlbXBsYXRlfFxuICAgICAgICAgICAgICAgICAgICAgICB0LkVsZW1lbnQpOiBBcnJheTx0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQ+IHtcbiAgY29uc3QgYXR0cmlidXRlczogQXJyYXk8dC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50PiA9XG4gICAgICBbLi4ubm9kZS5hdHRyaWJ1dGVzLCAuLi5ub2RlLmlucHV0cywgLi4ubm9kZS5vdXRwdXRzXTtcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiB0LlRlbXBsYXRlKSB7XG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLm5vZGUudGVtcGxhdGVBdHRycyk7XG4gIH1cbiAgcmV0dXJuIGF0dHJpYnV0ZXM7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIGBTZXRgcywgcmV0dXJucyBhbGwgaXRlbXMgaW4gdGhlIGBsZWZ0YCB3aGljaCBkbyBub3QgYXBwZWFyIGluIHRoZSBgcmlnaHRgLlxuICovXG5mdW5jdGlvbiBkaWZmZXJlbmNlPFQ+KGxlZnQ6IFNldDxUPiwgcmlnaHQ6IFNldDxUPik6IFNldDxUPiB7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBTZXQ8VD4oKTtcbiAgZm9yIChjb25zdCBkaXIgb2YgbGVmdCkge1xuICAgIGlmICghcmlnaHQuaGFzKGRpcikpIHtcbiAgICAgIHJlc3VsdC5hZGQoZGlyKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBlbGVtZW50IG9yIHRlbXBsYXRlLCBkZXRlcm1pbmVzIHdoaWNoIGRpcmVjdGl2ZXMgbWF0Y2ggYmVjYXVzZSB0aGUgdGFnIGlzIHByZXNlbnQuIEZvclxuICogZXhhbXBsZSwgaWYgYSBkaXJlY3RpdmUgc2VsZWN0b3IgaXMgYGRpdltteUF0dHJdYCwgdGhpcyB3b3VsZCBtYXRjaCBkaXYgZWxlbWVudHMgYnV0IHdvdWxkIG5vdCBpZlxuICogdGhlIHNlbGVjdG9yIHdlcmUganVzdCBgW215QXR0cl1gLiBXZSBmaW5kIHdoaWNoIGRpcmVjdGl2ZXMgYXJlIGFwcGxpZWQgYmVjYXVzZSBvZiB0aGlzIHRhZyBieVxuICogZWxpbWluYXRpb246IGNvbXBhcmUgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIHdpdGggdGhlIHRhZyBwcmVzZW50IGFnYWluc3QgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzXG4gKiB3aXRob3V0IGl0LiBUaGUgZGlmZmVyZW5jZSB3b3VsZCBiZSB0aGUgZGlyZWN0aXZlcyB3aGljaCBtYXRjaCBiZWNhdXNlIHRoZSB0YWcgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gZWxlbWVudCBUaGUgZWxlbWVudCBvciB0ZW1wbGF0ZSBub2RlIHRoYXQgdGhlIGF0dHJpYnV0ZS90YWcgaXMgcGFydCBvZi5cbiAqIEBwYXJhbSBkaXJlY3RpdmVzIFRoZSBsaXN0IG9mIGRpcmVjdGl2ZXMgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqIEByZXR1cm5zIFRoZSBsaXN0IG9mIGRpcmVjdGl2ZXMgbWF0Y2hpbmcgdGhlIHRhZyBuYW1lIHZpYSB0aGUgc3RyYXRlZ3kgZGVzY3JpYmVkIGFib3ZlLlxuICovXG4vLyBUT0RPKGF0c2NvdHQpOiBBZGQgdW5pdCB0ZXN0cyBmb3IgdGhpcyBhbmQgdGhlIG9uZSBmb3IgYXR0cmlidXRlc1xuZXhwb3J0IGZ1bmN0aW9uIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKFxuICAgIGVsZW1lbnQ6IHQuVGVtcGxhdGV8dC5FbGVtZW50LCBkaXJlY3RpdmVzOiBEaXJlY3RpdmVTeW1ib2xbXSk6IFNldDxEaXJlY3RpdmVTeW1ib2w+IHtcbiAgY29uc3QgYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXMoZWxlbWVudCk7XG4gIGNvbnN0IGFsbEF0dHJzID0gYXR0cmlidXRlcy5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICBjb25zdCBhbGxEaXJlY3RpdmVNYXRjaGVzID1cbiAgICAgIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihkaXJlY3RpdmVzLCBnZXROb2RlTmFtZShlbGVtZW50KSArIGFsbEF0dHJzLmpvaW4oJycpKTtcbiAgY29uc3QgbWF0Y2hlc1dpdGhvdXRFbGVtZW50ID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKGRpcmVjdGl2ZXMsIGFsbEF0dHJzLmpvaW4oJycpKTtcbiAgcmV0dXJuIGRpZmZlcmVuY2UoYWxsRGlyZWN0aXZlTWF0Y2hlcywgbWF0Y2hlc1dpdGhvdXRFbGVtZW50KTtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBhdHRyaWJ1dGUgbmFtZSwgZGV0ZXJtaW5lcyB3aGljaCBkaXJlY3RpdmVzIG1hdGNoIGJlY2F1c2UgdGhlIGF0dHJpYnV0ZSBpcyBwcmVzZW50LiBXZVxuICogZmluZCB3aGljaCBkaXJlY3RpdmVzIGFyZSBhcHBsaWVkIGJlY2F1c2Ugb2YgdGhpcyBhdHRyaWJ1dGUgYnkgZWxpbWluYXRpb246IGNvbXBhcmUgdGhlIGRpcmVjdGl2ZVxuICogbWF0Y2hlcyB3aXRoIHRoZSBhdHRyaWJ1dGUgcHJlc2VudCBhZ2FpbnN0IHRoZSBkaXJlY3RpdmUgbWF0Y2hlcyB3aXRob3V0IGl0LiBUaGUgZGlmZmVyZW5jZSB3b3VsZFxuICogYmUgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2ggYmVjYXVzZSB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZVxuICogQHBhcmFtIGhvc3ROb2RlIFRoZSBub2RlIHdoaWNoIHRoZSBhdHRyaWJ1dGUgYXBwZWFycyBvblxuICogQHBhcmFtIGRpcmVjdGl2ZXMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyBtYXRjaGluZyB0aGUgdGFnIG5hbWUgdmlhIHRoZSBzdHJhdGVneSBkZXNjcmliZWQgYWJvdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgIG5hbWU6IHN0cmluZywgaG9zdE5vZGU6IHQuVGVtcGxhdGV8dC5FbGVtZW50LFxuICAgIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlcyhob3N0Tm9kZSk7XG4gIGNvbnN0IGFsbEF0dHJzID0gYXR0cmlidXRlcy5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICBjb25zdCBhbGxEaXJlY3RpdmVNYXRjaGVzID1cbiAgICAgIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihkaXJlY3RpdmVzLCBnZXROb2RlTmFtZShob3N0Tm9kZSkgKyBhbGxBdHRycy5qb2luKCcnKSk7XG4gIGNvbnN0IGF0dHJzRXhjbHVkaW5nTmFtZSA9IGF0dHJpYnV0ZXMuZmlsdGVyKGEgPT4gYS5uYW1lICE9PSBuYW1lKS5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICBjb25zdCBtYXRjaGVzV2l0aG91dEF0dHIgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoXG4gICAgICBkaXJlY3RpdmVzLCBnZXROb2RlTmFtZShob3N0Tm9kZSkgKyBhdHRyc0V4Y2x1ZGluZ05hbWUuam9pbignJykpO1xuICByZXR1cm4gZGlmZmVyZW5jZShhbGxEaXJlY3RpdmVNYXRjaGVzLCBtYXRjaGVzV2l0aG91dEF0dHIpO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgbGlzdCBvZiBkaXJlY3RpdmVzIGFuZCBhIHRleHQgdG8gdXNlIGFzIGEgc2VsZWN0b3IsIHJldHVybnMgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2hcbiAqIGZvciB0aGUgc2VsZWN0b3IuXG4gKi9cbmZ1bmN0aW9uIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihcbiAgICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVTeW1ib2xbXSwgc2VsZWN0b3I6IHN0cmluZyk6IFNldDxEaXJlY3RpdmVTeW1ib2w+IHtcbiAgY29uc3Qgc2VsZWN0b3JzID0gQ3NzU2VsZWN0b3IucGFyc2Uoc2VsZWN0b3IpO1xuICBpZiAoc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgU2V0KCk7XG4gIH1cbiAgcmV0dXJuIG5ldyBTZXQoZGlyZWN0aXZlcy5maWx0ZXIoKGRpcjogRGlyZWN0aXZlU3ltYm9sKSA9PiB7XG4gICAgaWYgKGRpci5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpKTtcblxuICAgIHJldHVybiBzZWxlY3RvcnMuc29tZShzZWxlY3RvciA9PiBtYXRjaGVyLm1hdGNoKHNlbGVjdG9yLCBudWxsKSk7XG4gIH0pKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IGB0cy5TeW1ib2xEaXNwbGF5UGFydGAgYXJyYXkgd2hpY2ggaGFzIHRoZSBhbGlhcyBpbXBvcnRzIGZyb20gdGhlIHRjYiBmaWx0ZXJlZFxuICogb3V0LCBpLmUuIGBpMC5OZ0Zvck9mYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFsaWFzSW1wb3J0cyhkaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10pOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdIHtcbiAgY29uc3QgdGNiQWxpYXNJbXBvcnRSZWdleCA9IC9pXFxkKy87XG4gIGZ1bmN0aW9uIGlzSW1wb3J0QWxpYXMocGFydDoge2tpbmQ6IHN0cmluZywgdGV4dDogc3RyaW5nfSkge1xuICAgIHJldHVybiBwYXJ0LmtpbmQgPT09IEFMSUFTX05BTUUgJiYgdGNiQWxpYXNJbXBvcnRSZWdleC50ZXN0KHBhcnQudGV4dCk7XG4gIH1cbiAgZnVuY3Rpb24gaXNEb3RQdW5jdHVhdGlvbihwYXJ0OiB7a2luZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmd9KSB7XG4gICAgcmV0dXJuIHBhcnQua2luZCA9PT0gU1lNQk9MX1BVTkMgJiYgcGFydC50ZXh0ID09PSAnLic7XG4gIH1cblxuICByZXR1cm4gZGlzcGxheVBhcnRzLmZpbHRlcigocGFydCwgaSkgPT4ge1xuICAgIGNvbnN0IHByZXZpb3VzUGFydCA9IGRpc3BsYXlQYXJ0c1tpIC0gMV07XG4gICAgY29uc3QgbmV4dFBhcnQgPSBkaXNwbGF5UGFydHNbaSArIDFdO1xuXG4gICAgY29uc3QgYWxpYXNOYW1lRm9sbG93ZWRCeURvdCA9XG4gICAgICAgIGlzSW1wb3J0QWxpYXMocGFydCkgJiYgbmV4dFBhcnQgIT09IHVuZGVmaW5lZCAmJiBpc0RvdFB1bmN0dWF0aW9uKG5leHRQYXJ0KTtcbiAgICBjb25zdCBkb3RQcmVjZWRlZEJ5QWxpYXMgPVxuICAgICAgICBpc0RvdFB1bmN0dWF0aW9uKHBhcnQpICYmIHByZXZpb3VzUGFydCAhPT0gdW5kZWZpbmVkICYmIGlzSW1wb3J0QWxpYXMocHJldmlvdXNQYXJ0KTtcblxuICAgIHJldHVybiAhYWxpYXNOYW1lRm9sbG93ZWRCeURvdCAmJiAhZG90UHJlY2VkZWRCeUFsaWFzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRG9sbGFyRXZlbnQobjogdC5Ob2RlfGUuQVNUKTogbiBpcyBlLlByb3BlcnR5UmVhZCB7XG4gIHJldHVybiBuIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVJlYWQgJiYgbi5uYW1lID09PSAnJGV2ZW50JyAmJlxuICAgICAgbi5yZWNlaXZlciBpbnN0YW5jZW9mIGUuSW1wbGljaXRSZWNlaXZlciAmJiAhKG4ucmVjZWl2ZXIgaW5zdGFuY2VvZiBlLlRoaXNSZWNlaXZlcik7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBhcnJheSBmb3JtZWQgYnkgYXBwbHlpbmcgYSBnaXZlbiBjYWxsYmFjayBmdW5jdGlvbiB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIGFycmF5LFxuICogYW5kIHRoZW4gZmxhdHRlbmluZyB0aGUgcmVzdWx0IGJ5IG9uZSBsZXZlbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZsYXRNYXA8VCwgUj4oaXRlbXM6IFRbXXxyZWFkb25seSBUW10sIGY6IChpdGVtOiBUKSA9PiBSW10gfCByZWFkb25seSBSW10pOiBSW10ge1xuICBjb25zdCByZXN1bHRzOiBSW10gPSBbXTtcbiAgZm9yIChjb25zdCB4IG9mIGl0ZW1zKSB7XG4gICAgcmVzdWx0cy5wdXNoKC4uLmYoeCkpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuIl19