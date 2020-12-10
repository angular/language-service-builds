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
    exports.isWithin = exports.isExternalTemplate = exports.isTypeScriptFile = exports.flatMap = exports.isDollarEvent = exports.filterAliasImports = exports.getDirectiveMatchesForAttribute = exports.getDirectiveMatchesForElementTag = exports.getTemplateInfoAtPosition = exports.isExpressionNode = exports.isTemplateNode = exports.isTemplateNodeWithKeyAndValue = exports.toTextSpan = exports.getTextSpanOfNode = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQW9HO0lBRXBHLHFFQUE0RTtJQUk1RSwrREFBaUUsQ0FBRSx1QkFBdUI7SUFDMUYsd0RBQTBELENBQVMscUJBQXFCO0lBQ3hGLCtCQUFpQztJQUVqQyw2RUFBd0Q7SUFDeEQsbUVBQXVFO0lBRXZFLFNBQWdCLGlCQUFpQixDQUFDLElBQWtCO1FBQ2xELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pDO2FBQU0sSUFDSCxJQUFJLFlBQVksQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLFlBQVksQ0FBQyxDQUFDLFVBQVU7WUFDL0QsSUFBSSxZQUFZLENBQUMsQ0FBQyxXQUFXLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUU7WUFDbkUsaUZBQWlGO1lBQ2pGLGdHQUFnRztZQUNoRyxRQUFRO1lBQ1IsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDcEM7SUFDSCxDQUFDO0lBYkQsOENBYUM7SUFFRCxTQUFnQixVQUFVLENBQUMsSUFBd0M7UUFDakUsSUFBSSxLQUFhLEVBQUUsR0FBVyxDQUFDO1FBQy9CLElBQUksSUFBSSxZQUFZLDZCQUFrQixFQUFFO1lBQ3RDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQ2hCO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtB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Z0IsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDL0MsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQWdCLGtCQUFrQixDQUFDLFFBQWdCO1FBQ2pELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRkQsZ0RBRUM7SUFFRCxTQUFnQixRQUFRLENBQUMsUUFBZ0IsRUFBRSxJQUF3QztRQUNqRixJQUFJLEtBQWEsRUFBRSxHQUFXLENBQUM7UUFDL0IsSUFBSSxJQUFJLFlBQVksMEJBQWUsRUFBRTtZQUNuQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDMUIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO1NBQ3ZCO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNuQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNoQjtRQUNELDRFQUE0RTtRQUM1RSw4Q0FBOEM7UUFDOUMsT0FBTyxLQUFLLElBQUksUUFBUSxJQUFJLFFBQVEsSUFBSSxHQUFHLENBQUM7SUFDOUMsQ0FBQztJQVpELDRCQVlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQ3NzU2VsZWN0b3IsIFBhcnNlU291cmNlU3BhbiwgU2VsZWN0b3JNYXRjaGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge2lzRXh0ZXJuYWxSZXNvdXJjZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtEaWFnbm9zdGljIGFzIG5nRGlhZ25vc3RpYywgaXNOZ0RpYWdub3N0aWN9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQgKiBhcyBlIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9leHByZXNzaW9uX3BhcnNlci9hc3QnOyAgLy8gZSBmb3IgZXhwcmVzc2lvbiBBU1RcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JzsgICAgICAgICAvLyB0IGZvciB0ZW1wbGF0ZSBBU1RcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FMSUFTX05BTUUsIFNZTUJPTF9QVU5DfSBmcm9tICcuL2Rpc3BsYXlfcGFydHMnO1xuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXRQYXJlbnRDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuL3RzX3V0aWxzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRleHRTcGFuT2ZOb2RlKG5vZGU6IHQuTm9kZXxlLkFTVCk6IHRzLlRleHRTcGFuIHtcbiAgaWYgKGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKG5vZGUpKSB7XG4gICAgcmV0dXJuIHRvVGV4dFNwYW4obm9kZS5rZXlTcGFuKTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIG5vZGUgaW5zdGFuY2VvZiBlLlByb3BlcnR5V3JpdGUgfHwgbm9kZSBpbnN0YW5jZW9mIGUuTWV0aG9kQ2FsbCB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIGUuQmluZGluZ1BpcGUgfHwgbm9kZSBpbnN0YW5jZW9mIGUuUHJvcGVydHlSZWFkKSB7XG4gICAgLy8gVGhlIGBuYW1lYCBwYXJ0IG9mIGEgYFByb3BlcnR5V3JpdGVgLCBgTWV0aG9kQ2FsbGAsIGFuZCBgQmluZGluZ1BpcGVgIGRvZXMgbm90XG4gICAgLy8gaGF2ZSBpdHMgb3duIEFTVCBzbyB0aGVyZSBpcyBubyB3YXkgdG8gcmV0cmlldmUgYSBgU3ltYm9sYCBmb3IganVzdCB0aGUgYG5hbWVgIHZpYSBhIHNwZWNpZmljXG4gICAgLy8gbm9kZS5cbiAgICByZXR1cm4gdG9UZXh0U3Bhbihub2RlLm5hbWVTcGFuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdG9UZXh0U3Bhbihub2RlLnNvdXJjZVNwYW4pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1RleHRTcGFuKHNwYW46IEFic29sdXRlU291cmNlU3BhbnxQYXJzZVNvdXJjZVNwYW4pOiB0cy5UZXh0U3BhbiB7XG4gIGxldCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcjtcbiAgaWYgKHNwYW4gaW5zdGFuY2VvZiBBYnNvbHV0ZVNvdXJjZVNwYW4pIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQ7XG4gICAgZW5kID0gc3Bhbi5lbmQ7XG4gIH0gZWxzZSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBlbmQgPSBzcGFuLmVuZC5vZmZzZXQ7XG4gIH1cbiAgcmV0dXJuIHtzdGFydCwgbGVuZ3RoOiBlbmQgLSBzdGFydH07XG59XG5cbmludGVyZmFjZSBOb2RlV2l0aEtleUFuZFZhbHVlIGV4dGVuZHMgdC5Ob2RlIHtcbiAga2V5U3BhbjogUGFyc2VTb3VyY2VTcGFuO1xuICB2YWx1ZVNwYW4/OiBQYXJzZVNvdXJjZVNwYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RlbXBsYXRlTm9kZVdpdGhLZXlBbmRWYWx1ZShub2RlOiB0Lk5vZGV8ZS5BU1QpOiBub2RlIGlzIE5vZGVXaXRoS2V5QW5kVmFsdWUge1xuICByZXR1cm4gaXNUZW1wbGF0ZU5vZGUobm9kZSkgJiYgbm9kZS5oYXNPd25Qcm9wZXJ0eSgna2V5U3BhbicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUZW1wbGF0ZU5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogbm9kZSBpcyB0Lk5vZGUge1xuICAvLyBUZW1wbGF0ZSBub2RlIGltcGxlbWVudHMgdGhlIE5vZGUgaW50ZXJmYWNlIHNvIHdlIGNhbm5vdCB1c2UgaW5zdGFuY2VvZi5cbiAgcmV0dXJuIG5vZGUuc291cmNlU3BhbiBpbnN0YW5jZW9mIFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXhwcmVzc2lvbk5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogbm9kZSBpcyBlLkFTVCB7XG4gIHJldHVybiBub2RlIGluc3RhbmNlb2YgZS5BU1Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbmZvIHtcbiAgdGVtcGxhdGU6IHQuTm9kZVtdO1xuICBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIGdldElubGluZVRlbXBsYXRlSW5mb0F0UG9zaXRpb24oXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogVGVtcGxhdGVJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGV4cHJlc3Npb24gPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmIChleHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNsYXNzRGVjbCA9IGdldFBhcmVudENsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbik7XG4gIGlmIChjbGFzc0RlY2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBSZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHBvc2l0aW9uIGlzIG5vdCBvbiB0aGUgdGVtcGxhdGUgZXhwcmVzc2lvbiBvciB0aGUgdGVtcGxhdGUgcmVzb3VyY2VcbiAgLy8gaXMgbm90IGlubGluZS5cbiAgY29uc3QgcmVzb3VyY2VzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbCk7XG4gIGlmIChyZXNvdXJjZXMgPT09IG51bGwgfHwgaXNFeHRlcm5hbFJlc291cmNlKHJlc291cmNlcy50ZW1wbGF0ZSkgfHxcbiAgICAgIGV4cHJlc3Npb24gIT09IHJlc291cmNlcy50ZW1wbGF0ZS5leHByZXNzaW9uKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IHRlbXBsYXRlID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFRlbXBsYXRlKGNsYXNzRGVjbCk7XG4gIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge3RlbXBsYXRlLCBjb21wb25lbnQ6IGNsYXNzRGVjbH07XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgYXQgYSBsb2NhdGlvbiBhbG9uZyB3aXRoIGl0cyB0ZW1wbGF0ZSBub2Rlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oXG4gICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgaWYgKGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgY29uc3Qgc2YgPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiBnZXRJbmxpbmVUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKHNmLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBnZXRGaXJzdENvbXBvbmVudEZvclRlbXBsYXRlRmlsZShmaWxlTmFtZSwgY29tcGlsZXIpO1xuICB9XG59XG5cbi8qKlxuICogRmlyc3QsIGF0dGVtcHQgdG8gc29ydCBjb21wb25lbnQgZGVjbGFyYXRpb25zIGJ5IGZpbGUgbmFtZS5cbiAqIElmIHRoZSBmaWxlcyBhcmUgdGhlIHNhbWUsIHNvcnQgYnkgc3RhcnQgbG9jYXRpb24gb2YgdGhlIGRlY2xhcmF0aW9uLlxuICovXG5mdW5jdGlvbiB0c0RlY2xhcmF0aW9uU29ydENvbXBhcmF0b3IoYTogRGVjbGFyYXRpb25Ob2RlLCBiOiBEZWNsYXJhdGlvbk5vZGUpOiBudW1iZXIge1xuICBjb25zdCBhRmlsZSA9IGEuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICBjb25zdCBiRmlsZSA9IGIuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICBpZiAoYUZpbGUgPCBiRmlsZSkge1xuICAgIHJldHVybiAtMTtcbiAgfSBlbHNlIGlmIChhRmlsZSA+IGJGaWxlKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGIuZ2V0RnVsbFN0YXJ0KCkgLSBhLmdldEZ1bGxTdGFydCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpcnN0Q29tcG9uZW50Rm9yVGVtcGxhdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogVGVtcGxhdGVJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gIGNvbnN0IHNvcnRlZENvbXBvbmVudHMgPSBBcnJheS5mcm9tKGNvbXBvbmVudHMpLnNvcnQodHNEZWNsYXJhdGlvblNvcnRDb21wYXJhdG9yKTtcbiAgZm9yIChjb25zdCBjb21wb25lbnQgb2Ygc29ydGVkQ29tcG9uZW50cykge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0VGVtcGxhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICByZXR1cm4ge3RlbXBsYXRlLCBjb21wb25lbnR9O1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBhdHRyaWJ1dGUgbm9kZSwgY29udmVydHMgaXQgdG8gc3RyaW5nIGZvcm0uXG4gKi9cbmZ1bmN0aW9uIHRvQXR0cmlidXRlU3RyaW5nKGF0dHJpYnV0ZTogdC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50KTogc3RyaW5nIHtcbiAgaWYgKGF0dHJpYnV0ZSBpbnN0YW5jZW9mIHQuQm91bmRFdmVudCkge1xuICAgIHJldHVybiBgWyR7YXR0cmlidXRlLm5hbWV9XWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGBbJHthdHRyaWJ1dGUubmFtZX09JHthdHRyaWJ1dGUudmFsdWVTcGFuPy50b1N0cmluZygpID8/ICcnfV1gO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE5vZGVOYW1lKG5vZGU6IHQuVGVtcGxhdGV8dC5FbGVtZW50KTogc3RyaW5nIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiB0LlRlbXBsYXRlID8gbm9kZS50YWdOYW1lIDogbm9kZS5uYW1lO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgdGVtcGxhdGUgb3IgZWxlbWVudCBub2RlLCByZXR1cm5zIGFsbCBhdHRyaWJ1dGVzIG9uIHRoZSBub2RlLlxuICovXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVzKG5vZGU6IHQuVGVtcGxhdGV8XG4gICAgICAgICAgICAgICAgICAgICAgIHQuRWxlbWVudCk6IEFycmF5PHQuVGV4dEF0dHJpYnV0ZXx0LkJvdW5kQXR0cmlidXRlfHQuQm91bmRFdmVudD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzOiBBcnJheTx0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQ+ID1cbiAgICAgIFsuLi5ub2RlLmF0dHJpYnV0ZXMsIC4uLm5vZGUuaW5wdXRzLCAuLi5ub2RlLm91dHB1dHNdO1xuICBpZiAobm9kZSBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpIHtcbiAgICBhdHRyaWJ1dGVzLnB1c2goLi4ubm9kZS50ZW1wbGF0ZUF0dHJzKTtcbiAgfVxuICByZXR1cm4gYXR0cmlidXRlcztcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYFNldGBzLCByZXR1cm5zIGFsbCBpdGVtcyBpbiB0aGUgYGxlZnRgIHdoaWNoIGRvIG5vdCBhcHBlYXIgaW4gdGhlIGByaWdodGAuXG4gKi9cbmZ1bmN0aW9uIGRpZmZlcmVuY2U8VD4obGVmdDogU2V0PFQ+LCByaWdodDogU2V0PFQ+KTogU2V0PFQ+IHtcbiAgY29uc3QgcmVzdWx0ID0gbmV3IFNldDxUPigpO1xuICBmb3IgKGNvbnN0IGRpciBvZiBsZWZ0KSB7XG4gICAgaWYgKCFyaWdodC5oYXMoZGlyKSkge1xuICAgICAgcmVzdWx0LmFkZChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUsIGRldGVybWluZXMgd2hpY2ggZGlyZWN0aXZlcyBtYXRjaCBiZWNhdXNlIHRoZSB0YWcgaXMgcHJlc2VudC4gRm9yXG4gKiBleGFtcGxlLCBpZiBhIGRpcmVjdGl2ZSBzZWxlY3RvciBpcyBgZGl2W215QXR0cl1gLCB0aGlzIHdvdWxkIG1hdGNoIGRpdiBlbGVtZW50cyBidXQgd291bGQgbm90IGlmXG4gKiB0aGUgc2VsZWN0b3Igd2VyZSBqdXN0IGBbbXlBdHRyXWAuIFdlIGZpbmQgd2hpY2ggZGlyZWN0aXZlcyBhcmUgYXBwbGllZCBiZWNhdXNlIG9mIHRoaXMgdGFnIGJ5XG4gKiBlbGltaW5hdGlvbjogY29tcGFyZSB0aGUgZGlyZWN0aXZlIG1hdGNoZXMgd2l0aCB0aGUgdGFnIHByZXNlbnQgYWdhaW5zdCB0aGUgZGlyZWN0aXZlIG1hdGNoZXNcbiAqIHdpdGhvdXQgaXQuIFRoZSBkaWZmZXJlbmNlIHdvdWxkIGJlIHRoZSBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIGJlY2F1c2UgdGhlIHRhZyBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSBlbGVtZW50IFRoZSBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUgdGhhdCB0aGUgYXR0cmlidXRlL3RhZyBpcyBwYXJ0IG9mLlxuICogQHBhcmFtIGRpcmVjdGl2ZXMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyBtYXRjaGluZyB0aGUgdGFnIG5hbWUgdmlhIHRoZSBzdHJhdGVneSBkZXNjcmliZWQgYWJvdmUuXG4gKi9cbi8vIFRPRE8oYXRzY290dCk6IEFkZCB1bml0IHRlc3RzIGZvciB0aGlzIGFuZCB0aGUgb25lIGZvciBhdHRyaWJ1dGVzXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoXG4gICAgZWxlbWVudDogdC5UZW1wbGF0ZXx0LkVsZW1lbnQsIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlcyhlbGVtZW50KTtcbiAgY29uc3QgYWxsQXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IGFsbERpcmVjdGl2ZU1hdGNoZXMgPVxuICAgICAgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGVsZW1lbnQpICsgYWxsQXR0cnMuam9pbignJykpO1xuICBjb25zdCBtYXRjaGVzV2l0aG91dEVsZW1lbnQgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoZGlyZWN0aXZlcywgYWxsQXR0cnMuam9pbignJykpO1xuICByZXR1cm4gZGlmZmVyZW5jZShhbGxEaXJlY3RpdmVNYXRjaGVzLCBtYXRjaGVzV2l0aG91dEVsZW1lbnQpO1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGF0dHJpYnV0ZSBuYW1lLCBkZXRlcm1pbmVzIHdoaWNoIGRpcmVjdGl2ZXMgbWF0Y2ggYmVjYXVzZSB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQuIFdlXG4gKiBmaW5kIHdoaWNoIGRpcmVjdGl2ZXMgYXJlIGFwcGxpZWQgYmVjYXVzZSBvZiB0aGlzIGF0dHJpYnV0ZSBieSBlbGltaW5hdGlvbjogY29tcGFyZSB0aGUgZGlyZWN0aXZlXG4gKiBtYXRjaGVzIHdpdGggdGhlIGF0dHJpYnV0ZSBwcmVzZW50IGFnYWluc3QgdGhlIGRpcmVjdGl2ZSBtYXRjaGVzIHdpdGhvdXQgaXQuIFRoZSBkaWZmZXJlbmNlIHdvdWxkXG4gKiBiZSB0aGUgZGlyZWN0aXZlcyB3aGljaCBtYXRjaCBiZWNhdXNlIHRoZSBhdHRyaWJ1dGUgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gKiBAcGFyYW0gaG9zdE5vZGUgVGhlIG5vZGUgd2hpY2ggdGhlIGF0dHJpYnV0ZSBhcHBlYXJzIG9uXG4gKiBAcGFyYW0gZGlyZWN0aXZlcyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIHRvIG1hdGNoIGFnYWluc3QuXG4gKiBAcmV0dXJucyBUaGUgbGlzdCBvZiBkaXJlY3RpdmVzIG1hdGNoaW5nIHRoZSB0YWcgbmFtZSB2aWEgdGhlIHN0cmF0ZWd5IGRlc2NyaWJlZCBhYm92ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgbmFtZTogc3RyaW5nLCBob3N0Tm9kZTogdC5UZW1wbGF0ZXx0LkVsZW1lbnQsXG4gICAgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW10pOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPiB7XG4gIGNvbnN0IGF0dHJpYnV0ZXMgPSBnZXRBdHRyaWJ1dGVzKGhvc3ROb2RlKTtcbiAgY29uc3QgYWxsQXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IGFsbERpcmVjdGl2ZU1hdGNoZXMgPVxuICAgICAgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGhvc3ROb2RlKSArIGFsbEF0dHJzLmpvaW4oJycpKTtcbiAgY29uc3QgYXR0cnNFeGNsdWRpbmdOYW1lID0gYXR0cmlidXRlcy5maWx0ZXIoYSA9PiBhLm5hbWUgIT09IG5hbWUpLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IG1hdGNoZXNXaXRob3V0QXR0ciA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihcbiAgICAgIGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGhvc3ROb2RlKSArIGF0dHJzRXhjbHVkaW5nTmFtZS5qb2luKCcnKSk7XG4gIHJldHVybiBkaWZmZXJlbmNlKGFsbERpcmVjdGl2ZU1hdGNoZXMsIG1hdGNoZXNXaXRob3V0QXR0cik7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBsaXN0IG9mIGRpcmVjdGl2ZXMgYW5kIGEgdGV4dCB0byB1c2UgYXMgYSBzZWxlY3RvciwgcmV0dXJucyB0aGUgZGlyZWN0aXZlcyB3aGljaCBtYXRjaFxuICogZm9yIHRoZSBzZWxlY3Rvci5cbiAqL1xuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKFxuICAgIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdLCBzZWxlY3Rvcjogc3RyaW5nKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBzZWxlY3RvcnMgPSBDc3NTZWxlY3Rvci5wYXJzZShzZWxlY3Rvcik7XG4gIGlmIChzZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgfVxuICByZXR1cm4gbmV3IFNldChkaXJlY3RpdmVzLmZpbHRlcigoZGlyOiBEaXJlY3RpdmVTeW1ib2wpID0+IHtcbiAgICBpZiAoZGlyLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXIoKTtcbiAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpci5zZWxlY3RvcikpO1xuXG4gICAgcmV0dXJuIHNlbGVjdG9ycy5zb21lKHNlbGVjdG9yID0+IG1hdGNoZXIubWF0Y2goc2VsZWN0b3IsIG51bGwpKTtcbiAgfSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgYHRzLlN5bWJvbERpc3BsYXlQYXJ0YCBhcnJheSB3aGljaCBoYXMgdGhlIGFsaWFzIGltcG9ydHMgZnJvbSB0aGUgdGNiIGZpbHRlcmVkXG4gKiBvdXQsIGkuZS4gYGkwLk5nRm9yT2ZgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQWxpYXNJbXBvcnRzKGRpc3BsYXlQYXJ0czogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10ge1xuICBjb25zdCB0Y2JBbGlhc0ltcG9ydFJlZ2V4ID0gL2lcXGQrLztcbiAgZnVuY3Rpb24gaXNJbXBvcnRBbGlhcyhwYXJ0OiB7a2luZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmd9KSB7XG4gICAgcmV0dXJuIHBhcnQua2luZCA9PT0gQUxJQVNfTkFNRSAmJiB0Y2JBbGlhc0ltcG9ydFJlZ2V4LnRlc3QocGFydC50ZXh0KTtcbiAgfVxuICBmdW5jdGlvbiBpc0RvdFB1bmN0dWF0aW9uKHBhcnQ6IHtraW5kOiBzdHJpbmcsIHRleHQ6IHN0cmluZ30pIHtcbiAgICByZXR1cm4gcGFydC5raW5kID09PSBTWU1CT0xfUFVOQyAmJiBwYXJ0LnRleHQgPT09ICcuJztcbiAgfVxuXG4gIHJldHVybiBkaXNwbGF5UGFydHMuZmlsdGVyKChwYXJ0LCBpKSA9PiB7XG4gICAgY29uc3QgcHJldmlvdXNQYXJ0ID0gZGlzcGxheVBhcnRzW2kgLSAxXTtcbiAgICBjb25zdCBuZXh0UGFydCA9IGRpc3BsYXlQYXJ0c1tpICsgMV07XG5cbiAgICBjb25zdCBhbGlhc05hbWVGb2xsb3dlZEJ5RG90ID1cbiAgICAgICAgaXNJbXBvcnRBbGlhcyhwYXJ0KSAmJiBuZXh0UGFydCAhPT0gdW5kZWZpbmVkICYmIGlzRG90UHVuY3R1YXRpb24obmV4dFBhcnQpO1xuICAgIGNvbnN0IGRvdFByZWNlZGVkQnlBbGlhcyA9XG4gICAgICAgIGlzRG90UHVuY3R1YXRpb24ocGFydCkgJiYgcHJldmlvdXNQYXJ0ICE9PSB1bmRlZmluZWQgJiYgaXNJbXBvcnRBbGlhcyhwcmV2aW91c1BhcnQpO1xuXG4gICAgcmV0dXJuICFhbGlhc05hbWVGb2xsb3dlZEJ5RG90ICYmICFkb3RQcmVjZWRlZEJ5QWxpYXM7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEb2xsYXJFdmVudChuOiB0Lk5vZGV8ZS5BU1QpOiBuIGlzIGUuUHJvcGVydHlSZWFkIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBlLlByb3BlcnR5UmVhZCAmJiBuLm5hbWUgPT09ICckZXZlbnQnICYmXG4gICAgICBuLnJlY2VpdmVyIGluc3RhbmNlb2YgZS5JbXBsaWNpdFJlY2VpdmVyICYmICEobi5yZWNlaXZlciBpbnN0YW5jZW9mIGUuVGhpc1JlY2VpdmVyKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZvcm1lZCBieSBhcHBseWluZyBhIGdpdmVuIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgYXJyYXksXG4gKiBhbmQgdGhlbiBmbGF0dGVuaW5nIHRoZSByZXN1bHQgYnkgb25lIGxldmVsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdE1hcDxULCBSPihpdGVtczogVFtdfHJlYWRvbmx5IFRbXSwgZjogKGl0ZW06IFQpID0+IFJbXSB8IHJlYWRvbmx5IFJbXSk6IFJbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IFJbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHggb2YgaXRlbXMpIHtcbiAgICByZXN1bHRzLnB1c2goLi4uZih4KSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVTY3JpcHRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZpbGVOYW1lLmVuZHNXaXRoKCcudHMnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXh0ZXJuYWxUZW1wbGF0ZShmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpbihwb3NpdGlvbjogbnVtYmVyLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW58UGFyc2VTb3VyY2VTcGFuKTogYm9vbGVhbiB7XG4gIGxldCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcjtcbiAgaWYgKHNwYW4gaW5zdGFuY2VvZiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQ7XG4gICAgZW5kID0gc3Bhbi5lbmQ7XG4gIH1cbiAgLy8gTm90ZSBib3RoIHN0YXJ0IGFuZCBlbmQgYXJlIGluY2x1c2l2ZSBiZWNhdXNlIHdlIHdhbnQgdG8gbWF0Y2ggY29uZGl0aW9uc1xuICAvLyBsaWtlIMKmc3RhcnQgYW5kIGVuZMKmIHdoZXJlIMKmIGlzIHRoZSBjdXJzb3IuXG4gIHJldHVybiBzdGFydCA8PSBwb3NpdGlvbiAmJiBwb3NpdGlvbiA8PSBlbmQ7XG59XG4iXX0=