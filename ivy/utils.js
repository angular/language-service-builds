(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/utils", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler/src/expression_parser/ast", "@angular/compiler/src/render3/r3_ast", "typescript", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/ts_utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTemplateLocationFromShimLocation = exports.isWithin = exports.isExternalTemplate = exports.isTypeScriptFile = exports.flatMap = exports.isDollarEvent = exports.filterAliasImports = exports.getDirectiveMatchesForAttribute = exports.makeElementSelector = exports.getDirectiveMatchesForElementTag = exports.getTemplateInfoAtPosition = exports.isExpressionNode = exports.isTemplateNode = exports.isWithinKeyValue = exports.isWithinKey = exports.isTemplateNodeWithKeyAndValue = exports.toTextSpan = exports.getTextSpanOfNode = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
    /**
     * For a given location in a shim file, retrieves the corresponding file url for the template and
     * the span in the template.
     */
    function getTemplateLocationFromShimLocation(templateTypeChecker, shimPath, positionInShimFile) {
        var mapping = templateTypeChecker.getTemplateMappingAtShimLocation({ shimPath: shimPath, positionInShimFile: positionInShimFile });
        if (mapping === null) {
            return null;
        }
        var templateSourceMapping = mapping.templateSourceMapping, span = mapping.span;
        var templateUrl;
        if (templateSourceMapping.type === 'direct') {
            templateUrl = file_system_1.absoluteFromSourceFile(templateSourceMapping.node.getSourceFile());
        }
        else if (templateSourceMapping.type === 'external') {
            templateUrl = file_system_1.absoluteFrom(templateSourceMapping.templateUrl);
        }
        else {
            // This includes indirect mappings, which are difficult to map directly to the code
            // location. Diagnostics similarly return a synthetic template string for this case rather
            // than a real location.
            return null;
        }
        return { templateUrl: templateUrl, span: span };
    }
    exports.getTemplateLocationFromShimLocation = getTemplateLocationFromShimLocation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQXVIO0lBRXZILDJFQUFpSDtJQUNqSCxxRUFBNEU7SUFHNUUsK0RBQWlFLENBQUUsdUJBQXVCO0lBQzFGLHdEQUEwRCxDQUFTLHFCQUFxQjtJQUN4RiwrQkFBaUM7SUFFakMsNkVBQXdEO0lBQ3hELG1FQUF1RTtJQUV2RSxTQUFnQixpQkFBaUIsQ0FBQyxJQUFrQjtRQUNsRCxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNqQzthQUFNLElBQ0gsSUFBSSxZQUFZLENBQUMsQ0FBQyxhQUFhLElBQUksSUFBSSxZQUFZLENBQUMsQ0FBQyxVQUFVO1lBQy9ELElBQUksWUFBWSxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksWUFBWSxDQUFDLENBQUMsWUFBWSxFQUFFO1lBQ25FLGlGQUFpRjtZQUNqRixnR0FBZ0c7WUFDaEcsUUFBUTtZQUNSLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztJQWJELDhDQWFDO0lBRUQsU0FBZ0IsVUFBVSxDQUFDLElBQXdDO1FBQ2pFLElBQUksS0FBYSxFQUFFLEdBQVcsQ0FBQztRQUMvQixJQUFJLElBQUksWUFBWSw2QkFBa0IsRUFBRTtZQUN0QyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNuQixHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNoQjthQUFNO1lBQ0wsS0FBSyxHQUFH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S0FBWCxDQUFZO1FBRTlDLElBQUksV0FBMkIsQ0FBQztRQUNoQyxJQUFJLHFCQUFxQixDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDM0MsV0FBVyxHQUFHLG9DQUFzQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1NBQ2xGO2FBQU0sSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQ3BELFdBQVcsR0FBRywwQkFBWSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQy9EO2FBQU07WUFDTCxtRkFBbUY7WUFDbkYsMEZBQTBGO1lBQzFGLHdCQUF3QjtZQUN4QixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxFQUFDLFdBQVcsYUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7SUFDN0IsQ0FBQztJQXRCRCxrRkFzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBDc3NTZWxlY3RvciwgUGFyc2VTb3VyY2VTcGFuLCBTZWxlY3Rvck1hdGNoZXIsIFRtcGxBc3RCb3VuZEV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc0V4dGVybmFsUmVzb3VyY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbWV0YWRhdGEnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgVGVtcGxhdGVUeXBlQ2hlY2tlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCAqIGFzIGUgZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2V4cHJlc3Npb25fcGFyc2VyL2FzdCc7ICAvLyBlIGZvciBleHByZXNzaW9uIEFTVFxuaW1wb3J0ICogYXMgdCBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnOyAgICAgICAgIC8vIHQgZm9yIHRlbXBsYXRlIEFTVFxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QUxJQVNfTkFNRSwgU1lNQk9MX1BVTkN9IGZyb20gJy4vZGlzcGxheV9wYXJ0cyc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGUsIGdldFBhcmVudENsYXNzRGVjbGFyYXRpb259IGZyb20gJy4vdHNfdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4dFNwYW5PZk5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogdHMuVGV4dFNwYW4ge1xuICBpZiAoaXNUZW1wbGF0ZU5vZGVXaXRoS2V5QW5kVmFsdWUobm9kZSkpIHtcbiAgICByZXR1cm4gdG9UZXh0U3Bhbihub2RlLmtleVNwYW4pO1xuICB9IGVsc2UgaWYgKFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIGUuUHJvcGVydHlXcml0ZSB8fCBub2RlIGluc3RhbmNlb2YgZS5NZXRob2RDYWxsIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgZS5CaW5kaW5nUGlwZSB8fCBub2RlIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVJlYWQpIHtcbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAsIGBNZXRob2RDYWxsYCwgYW5kIGBCaW5kaW5nUGlwZWAgZG9lcyBub3RcbiAgICAvLyBoYXZlIGl0cyBvd24gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWNcbiAgICAvLyBub2RlLlxuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUubmFtZVNwYW4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0b1RleHRTcGFuKG5vZGUuc291cmNlU3Bhbik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvVGV4dFNwYW4oc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IHRzLlRleHRTcGFuIHtcbiAgbGV0IHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyO1xuICBpZiAoc3BhbiBpbnN0YW5jZW9mIEFic29sdXRlU291cmNlU3Bhbikge1xuICAgIHN0YXJ0ID0gc3Bhbi5zdGFydDtcbiAgICBlbmQgPSBzcGFuLmVuZDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IHNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGVuZCA9IHNwYW4uZW5kLm9mZnNldDtcbiAgfVxuICByZXR1cm4ge3N0YXJ0LCBsZW5ndGg6IGVuZCAtIHN0YXJ0fTtcbn1cblxuaW50ZXJmYWNlIE5vZGVXaXRoS2V5QW5kVmFsdWUgZXh0ZW5kcyB0Lk5vZGUge1xuICBrZXlTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG4gIHZhbHVlU3Bhbj86IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVtcGxhdGVOb2RlV2l0aEtleUFuZFZhbHVlKG5vZGU6IHQuTm9kZXxlLkFTVCk6IG5vZGUgaXMgTm9kZVdpdGhLZXlBbmRWYWx1ZSB7XG4gIHJldHVybiBpc1RlbXBsYXRlTm9kZShub2RlKSAmJiBub2RlLmhhc093blByb3BlcnR5KCdrZXlTcGFuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpbktleShwb3NpdGlvbjogbnVtYmVyLCBub2RlOiBOb2RlV2l0aEtleUFuZFZhbHVlKTogYm9vbGVhbiB7XG4gIGxldCB7a2V5U3BhbiwgdmFsdWVTcGFufSA9IG5vZGU7XG4gIGlmICh2YWx1ZVNwYW4gPT09IHVuZGVmaW5lZCAmJiBub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICB2YWx1ZVNwYW4gPSBub2RlLmhhbmRsZXJTcGFuO1xuICB9XG4gIGNvbnN0IGlzV2l0aGluS2V5VmFsdWUgPVxuICAgICAgaXNXaXRoaW4ocG9zaXRpb24sIGtleVNwYW4pIHx8ICEhKHZhbHVlU3BhbiAmJiBpc1dpdGhpbihwb3NpdGlvbiwgdmFsdWVTcGFuKSk7XG4gIHJldHVybiBpc1dpdGhpbktleVZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXaXRoaW5LZXlWYWx1ZShwb3NpdGlvbjogbnVtYmVyLCBub2RlOiBOb2RlV2l0aEtleUFuZFZhbHVlKTogYm9vbGVhbiB7XG4gIGxldCB7a2V5U3BhbiwgdmFsdWVTcGFufSA9IG5vZGU7XG4gIGlmICh2YWx1ZVNwYW4gPT09IHVuZGVmaW5lZCAmJiBub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICB2YWx1ZVNwYW4gPSBub2RlLmhhbmRsZXJTcGFuO1xuICB9XG4gIGNvbnN0IGlzV2l0aGluS2V5VmFsdWUgPVxuICAgICAgaXNXaXRoaW4ocG9zaXRpb24sIGtleVNwYW4pIHx8ICEhKHZhbHVlU3BhbiAmJiBpc1dpdGhpbihwb3NpdGlvbiwgdmFsdWVTcGFuKSk7XG4gIHJldHVybiBpc1dpdGhpbktleVZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUZW1wbGF0ZU5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogbm9kZSBpcyB0Lk5vZGUge1xuICAvLyBUZW1wbGF0ZSBub2RlIGltcGxlbWVudHMgdGhlIE5vZGUgaW50ZXJmYWNlIHNvIHdlIGNhbm5vdCB1c2UgaW5zdGFuY2VvZi5cbiAgcmV0dXJuIG5vZGUuc291cmNlU3BhbiBpbnN0YW5jZW9mIFBhcnNlU291cmNlU3Bhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXhwcmVzc2lvbk5vZGUobm9kZTogdC5Ob2RlfGUuQVNUKTogbm9kZSBpcyBlLkFTVCB7XG4gIHJldHVybiBub2RlIGluc3RhbmNlb2YgZS5BU1Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbmZvIHtcbiAgdGVtcGxhdGU6IHQuTm9kZVtdO1xuICBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIGdldElubGluZVRlbXBsYXRlSW5mb0F0UG9zaXRpb24oXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogVGVtcGxhdGVJbmZvfHVuZGVmaW5lZCB7XG4gIGNvbnN0IGV4cHJlc3Npb24gPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmIChleHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNsYXNzRGVjbCA9IGdldFBhcmVudENsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbik7XG4gIGlmIChjbGFzc0RlY2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBSZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHBvc2l0aW9uIGlzIG5vdCBvbiB0aGUgdGVtcGxhdGUgZXhwcmVzc2lvbiBvciB0aGUgdGVtcGxhdGUgcmVzb3VyY2VcbiAgLy8gaXMgbm90IGlubGluZS5cbiAgY29uc3QgcmVzb3VyY2VzID0gY29tcGlsZXIuZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbCk7XG4gIGlmIChyZXNvdXJjZXMgPT09IG51bGwgfHwgaXNFeHRlcm5hbFJlc291cmNlKHJlc291cmNlcy50ZW1wbGF0ZSkgfHxcbiAgICAgIGV4cHJlc3Npb24gIT09IHJlc291cmNlcy50ZW1wbGF0ZS5leHByZXNzaW9uKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IHRlbXBsYXRlID0gY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFRlbXBsYXRlKGNsYXNzRGVjbCk7XG4gIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge3RlbXBsYXRlLCBjb21wb25lbnQ6IGNsYXNzRGVjbH07XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgYXQgYSBsb2NhdGlvbiBhbG9uZyB3aXRoIGl0cyB0ZW1wbGF0ZSBub2Rlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oXG4gICAgZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlciwgY29tcGlsZXI6IE5nQ29tcGlsZXIpOiBUZW1wbGF0ZUluZm98dW5kZWZpbmVkIHtcbiAgaWYgKGlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpKSB7XG4gICAgY29uc3Qgc2YgPSBjb21waWxlci5nZXROZXh0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiBnZXRJbmxpbmVUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKHNmLCBwb3NpdGlvbiwgY29tcGlsZXIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBnZXRGaXJzdENvbXBvbmVudEZvclRlbXBsYXRlRmlsZShmaWxlTmFtZSwgY29tcGlsZXIpO1xuICB9XG59XG5cbi8qKlxuICogRmlyc3QsIGF0dGVtcHQgdG8gc29ydCBjb21wb25lbnQgZGVjbGFyYXRpb25zIGJ5IGZpbGUgbmFtZS5cbiAqIElmIHRoZSBmaWxlcyBhcmUgdGhlIHNhbWUsIHNvcnQgYnkgc3RhcnQgbG9jYXRpb24gb2YgdGhlIGRlY2xhcmF0aW9uLlxuICovXG5mdW5jdGlvbiB0c0RlY2xhcmF0aW9uU29ydENvbXBhcmF0b3IoYTogRGVjbGFyYXRpb25Ob2RlLCBiOiBEZWNsYXJhdGlvbk5vZGUpOiBudW1iZXIge1xuICBjb25zdCBhRmlsZSA9IGEuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICBjb25zdCBiRmlsZSA9IGIuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICBpZiAoYUZpbGUgPCBiRmlsZSkge1xuICAgIHJldHVybiAtMTtcbiAgfSBlbHNlIGlmIChhRmlsZSA+IGJGaWxlKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGIuZ2V0RnVsbFN0YXJ0KCkgLSBhLmdldEZ1bGxTdGFydCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpcnN0Q29tcG9uZW50Rm9yVGVtcGxhdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGNvbXBpbGVyOiBOZ0NvbXBpbGVyKTogVGVtcGxhdGVJbmZvfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBjb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBjb21waWxlci5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZShmaWxlTmFtZSk7XG4gIGNvbnN0IHNvcnRlZENvbXBvbmVudHMgPSBBcnJheS5mcm9tKGNvbXBvbmVudHMpLnNvcnQodHNEZWNsYXJhdGlvblNvcnRDb21wYXJhdG9yKTtcbiAgZm9yIChjb25zdCBjb21wb25lbnQgb2Ygc29ydGVkQ29tcG9uZW50cykge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0VGVtcGxhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICByZXR1cm4ge3RlbXBsYXRlLCBjb21wb25lbnR9O1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBhdHRyaWJ1dGUgbm9kZSwgY29udmVydHMgaXQgdG8gc3RyaW5nIGZvcm0uXG4gKi9cbmZ1bmN0aW9uIHRvQXR0cmlidXRlU3RyaW5nKGF0dHJpYnV0ZTogdC5UZXh0QXR0cmlidXRlfHQuQm91bmRBdHRyaWJ1dGV8dC5Cb3VuZEV2ZW50KTogc3RyaW5nIHtcbiAgaWYgKGF0dHJpYnV0ZSBpbnN0YW5jZW9mIHQuQm91bmRFdmVudCkge1xuICAgIHJldHVybiBgWyR7YXR0cmlidXRlLm5hbWV9XWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGBbJHthdHRyaWJ1dGUubmFtZX09JHthdHRyaWJ1dGUudmFsdWVTcGFuPy50b1N0cmluZygpID8/ICcnfV1gO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE5vZGVOYW1lKG5vZGU6IHQuVGVtcGxhdGV8dC5FbGVtZW50KTogc3RyaW5nIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiB0LlRlbXBsYXRlID8gbm9kZS50YWdOYW1lIDogbm9kZS5uYW1lO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgdGVtcGxhdGUgb3IgZWxlbWVudCBub2RlLCByZXR1cm5zIGFsbCBhdHRyaWJ1dGVzIG9uIHRoZSBub2RlLlxuICovXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVzKG5vZGU6IHQuVGVtcGxhdGV8XG4gICAgICAgICAgICAgICAgICAgICAgIHQuRWxlbWVudCk6IEFycmF5PHQuVGV4dEF0dHJpYnV0ZXx0LkJvdW5kQXR0cmlidXRlfHQuQm91bmRFdmVudD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzOiBBcnJheTx0LlRleHRBdHRyaWJ1dGV8dC5Cb3VuZEF0dHJpYnV0ZXx0LkJvdW5kRXZlbnQ+ID1cbiAgICAgIFsuLi5ub2RlLmF0dHJpYnV0ZXMsIC4uLm5vZGUuaW5wdXRzLCAuLi5ub2RlLm91dHB1dHNdO1xuICBpZiAobm9kZSBpbnN0YW5jZW9mIHQuVGVtcGxhdGUpIHtcbiAgICBhdHRyaWJ1dGVzLnB1c2goLi4ubm9kZS50ZW1wbGF0ZUF0dHJzKTtcbiAgfVxuICByZXR1cm4gYXR0cmlidXRlcztcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYFNldGBzLCByZXR1cm5zIGFsbCBpdGVtcyBpbiB0aGUgYGxlZnRgIHdoaWNoIGRvIG5vdCBhcHBlYXIgaW4gdGhlIGByaWdodGAuXG4gKi9cbmZ1bmN0aW9uIGRpZmZlcmVuY2U8VD4obGVmdDogU2V0PFQ+LCByaWdodDogU2V0PFQ+KTogU2V0PFQ+IHtcbiAgY29uc3QgcmVzdWx0ID0gbmV3IFNldDxUPigpO1xuICBmb3IgKGNvbnN0IGRpciBvZiBsZWZ0KSB7XG4gICAgaWYgKCFyaWdodC5oYXMoZGlyKSkge1xuICAgICAgcmVzdWx0LmFkZChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEdpdmVuIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUsIGRldGVybWluZXMgd2hpY2ggZGlyZWN0aXZlcyBtYXRjaCBiZWNhdXNlIHRoZSB0YWcgaXMgcHJlc2VudC4gRm9yXG4gKiBleGFtcGxlLCBpZiBhIGRpcmVjdGl2ZSBzZWxlY3RvciBpcyBgZGl2W215QXR0cl1gLCB0aGlzIHdvdWxkIG1hdGNoIGRpdiBlbGVtZW50cyBidXQgd291bGQgbm90IGlmXG4gKiB0aGUgc2VsZWN0b3Igd2VyZSBqdXN0IGBbbXlBdHRyXWAuIFdlIGZpbmQgd2hpY2ggZGlyZWN0aXZlcyBhcmUgYXBwbGllZCBiZWNhdXNlIG9mIHRoaXMgdGFnIGJ5XG4gKiBlbGltaW5hdGlvbjogY29tcGFyZSB0aGUgZGlyZWN0aXZlIG1hdGNoZXMgd2l0aCB0aGUgdGFnIHByZXNlbnQgYWdhaW5zdCB0aGUgZGlyZWN0aXZlIG1hdGNoZXNcbiAqIHdpdGhvdXQgaXQuIFRoZSBkaWZmZXJlbmNlIHdvdWxkIGJlIHRoZSBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIGJlY2F1c2UgdGhlIHRhZyBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSBlbGVtZW50IFRoZSBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUgdGhhdCB0aGUgYXR0cmlidXRlL3RhZyBpcyBwYXJ0IG9mLlxuICogQHBhcmFtIGRpcmVjdGl2ZXMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyBtYXRjaGluZyB0aGUgdGFnIG5hbWUgdmlhIHRoZSBzdHJhdGVneSBkZXNjcmliZWQgYWJvdmUuXG4gKi9cbi8vIFRPRE8oYXRzY290dCk6IEFkZCB1bml0IHRlc3RzIGZvciB0aGlzIGFuZCB0aGUgb25lIGZvciBhdHRyaWJ1dGVzXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoXG4gICAgZWxlbWVudDogdC5UZW1wbGF0ZXx0LkVsZW1lbnQsIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlcyhlbGVtZW50KTtcbiAgY29uc3QgYWxsQXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCh0b0F0dHJpYnV0ZVN0cmluZyk7XG4gIGNvbnN0IGFsbERpcmVjdGl2ZU1hdGNoZXMgPVxuICAgICAgZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvclNlbGVjdG9yKGRpcmVjdGl2ZXMsIGdldE5vZGVOYW1lKGVsZW1lbnQpICsgYWxsQXR0cnMuam9pbignJykpO1xuICBjb25zdCBtYXRjaGVzV2l0aG91dEVsZW1lbnQgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoZGlyZWN0aXZlcywgYWxsQXR0cnMuam9pbignJykpO1xuICByZXR1cm4gZGlmZmVyZW5jZShhbGxEaXJlY3RpdmVNYXRjaGVzLCBtYXRjaGVzV2l0aG91dEVsZW1lbnQpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlRWxlbWVudFNlbGVjdG9yKGVsZW1lbnQ6IHQuRWxlbWVudHx0LlRlbXBsYXRlKTogc3RyaW5nIHtcbiAgY29uc3QgYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXMoZWxlbWVudCk7XG4gIGNvbnN0IGFsbEF0dHJzID0gYXR0cmlidXRlcy5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICByZXR1cm4gZ2V0Tm9kZU5hbWUoZWxlbWVudCkgKyBhbGxBdHRycy5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBhdHRyaWJ1dGUgbmFtZSwgZGV0ZXJtaW5lcyB3aGljaCBkaXJlY3RpdmVzIG1hdGNoIGJlY2F1c2UgdGhlIGF0dHJpYnV0ZSBpcyBwcmVzZW50LiBXZVxuICogZmluZCB3aGljaCBkaXJlY3RpdmVzIGFyZSBhcHBsaWVkIGJlY2F1c2Ugb2YgdGhpcyBhdHRyaWJ1dGUgYnkgZWxpbWluYXRpb246IGNvbXBhcmUgdGhlIGRpcmVjdGl2ZVxuICogbWF0Y2hlcyB3aXRoIHRoZSBhdHRyaWJ1dGUgcHJlc2VudCBhZ2FpbnN0IHRoZSBkaXJlY3RpdmUgbWF0Y2hlcyB3aXRob3V0IGl0LiBUaGUgZGlmZmVyZW5jZSB3b3VsZFxuICogYmUgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2ggYmVjYXVzZSB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZVxuICogQHBhcmFtIGhvc3ROb2RlIFRoZSBub2RlIHdoaWNoIHRoZSBhdHRyaWJ1dGUgYXBwZWFycyBvblxuICogQHBhcmFtIGRpcmVjdGl2ZXMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIGxpc3Qgb2YgZGlyZWN0aXZlcyBtYXRjaGluZyB0aGUgdGFnIG5hbWUgdmlhIHRoZSBzdHJhdGVneSBkZXNjcmliZWQgYWJvdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgIG5hbWU6IHN0cmluZywgaG9zdE5vZGU6IHQuVGVtcGxhdGV8dC5FbGVtZW50LFxuICAgIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdKTogU2V0PERpcmVjdGl2ZVN5bWJvbD4ge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlcyhob3N0Tm9kZSk7XG4gIGNvbnN0IGFsbEF0dHJzID0gYXR0cmlidXRlcy5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICBjb25zdCBhbGxEaXJlY3RpdmVNYXRjaGVzID1cbiAgICAgIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihkaXJlY3RpdmVzLCBnZXROb2RlTmFtZShob3N0Tm9kZSkgKyBhbGxBdHRycy5qb2luKCcnKSk7XG4gIGNvbnN0IGF0dHJzRXhjbHVkaW5nTmFtZSA9IGF0dHJpYnV0ZXMuZmlsdGVyKGEgPT4gYS5uYW1lICE9PSBuYW1lKS5tYXAodG9BdHRyaWJ1dGVTdHJpbmcpO1xuICBjb25zdCBtYXRjaGVzV2l0aG91dEF0dHIgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yU2VsZWN0b3IoXG4gICAgICBkaXJlY3RpdmVzLCBnZXROb2RlTmFtZShob3N0Tm9kZSkgKyBhdHRyc0V4Y2x1ZGluZ05hbWUuam9pbignJykpO1xuICByZXR1cm4gZGlmZmVyZW5jZShhbGxEaXJlY3RpdmVNYXRjaGVzLCBtYXRjaGVzV2l0aG91dEF0dHIpO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgbGlzdCBvZiBkaXJlY3RpdmVzIGFuZCBhIHRleHQgdG8gdXNlIGFzIGEgc2VsZWN0b3IsIHJldHVybnMgdGhlIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2hcbiAqIGZvciB0aGUgc2VsZWN0b3IuXG4gKi9cbmZ1bmN0aW9uIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JTZWxlY3RvcihcbiAgICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVTeW1ib2xbXSwgc2VsZWN0b3I6IHN0cmluZyk6IFNldDxEaXJlY3RpdmVTeW1ib2w+IHtcbiAgY29uc3Qgc2VsZWN0b3JzID0gQ3NzU2VsZWN0b3IucGFyc2Uoc2VsZWN0b3IpO1xuICBpZiAoc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgU2V0KCk7XG4gIH1cbiAgcmV0dXJuIG5ldyBTZXQoZGlyZWN0aXZlcy5maWx0ZXIoKGRpcjogRGlyZWN0aXZlU3ltYm9sKSA9PiB7XG4gICAgaWYgKGRpci5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpKTtcblxuICAgIHJldHVybiBzZWxlY3RvcnMuc29tZShzZWxlY3RvciA9PiBtYXRjaGVyLm1hdGNoKHNlbGVjdG9yLCBudWxsKSk7XG4gIH0pKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IGB0cy5TeW1ib2xEaXNwbGF5UGFydGAgYXJyYXkgd2hpY2ggaGFzIHRoZSBhbGlhcyBpbXBvcnRzIGZyb20gdGhlIHRjYiBmaWx0ZXJlZFxuICogb3V0LCBpLmUuIGBpMC5OZ0Zvck9mYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFsaWFzSW1wb3J0cyhkaXNwbGF5UGFydHM6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10pOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdIHtcbiAgY29uc3QgdGNiQWxpYXNJbXBvcnRSZWdleCA9IC9pXFxkKy87XG4gIGZ1bmN0aW9uIGlzSW1wb3J0QWxpYXMocGFydDoge2tpbmQ6IHN0cmluZywgdGV4dDogc3RyaW5nfSkge1xuICAgIHJldHVybiBwYXJ0LmtpbmQgPT09IEFMSUFTX05BTUUgJiYgdGNiQWxpYXNJbXBvcnRSZWdleC50ZXN0KHBhcnQudGV4dCk7XG4gIH1cbiAgZnVuY3Rpb24gaXNEb3RQdW5jdHVhdGlvbihwYXJ0OiB7a2luZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmd9KSB7XG4gICAgcmV0dXJuIHBhcnQua2luZCA9PT0gU1lNQk9MX1BVTkMgJiYgcGFydC50ZXh0ID09PSAnLic7XG4gIH1cblxuICByZXR1cm4gZGlzcGxheVBhcnRzLmZpbHRlcigocGFydCwgaSkgPT4ge1xuICAgIGNvbnN0IHByZXZpb3VzUGFydCA9IGRpc3BsYXlQYXJ0c1tpIC0gMV07XG4gICAgY29uc3QgbmV4dFBhcnQgPSBkaXNwbGF5UGFydHNbaSArIDFdO1xuXG4gICAgY29uc3QgYWxpYXNOYW1lRm9sbG93ZWRCeURvdCA9XG4gICAgICAgIGlzSW1wb3J0QWxpYXMocGFydCkgJiYgbmV4dFBhcnQgIT09IHVuZGVmaW5lZCAmJiBpc0RvdFB1bmN0dWF0aW9uKG5leHRQYXJ0KTtcbiAgICBjb25zdCBkb3RQcmVjZWRlZEJ5QWxpYXMgPVxuICAgICAgICBpc0RvdFB1bmN0dWF0aW9uKHBhcnQpICYmIHByZXZpb3VzUGFydCAhPT0gdW5kZWZpbmVkICYmIGlzSW1wb3J0QWxpYXMocHJldmlvdXNQYXJ0KTtcblxuICAgIHJldHVybiAhYWxpYXNOYW1lRm9sbG93ZWRCeURvdCAmJiAhZG90UHJlY2VkZWRCeUFsaWFzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRG9sbGFyRXZlbnQobjogdC5Ob2RlfGUuQVNUKTogbiBpcyBlLlByb3BlcnR5UmVhZCB7XG4gIHJldHVybiBuIGluc3RhbmNlb2YgZS5Qcm9wZXJ0eVJlYWQgJiYgbi5uYW1lID09PSAnJGV2ZW50JyAmJlxuICAgICAgbi5yZWNlaXZlciBpbnN0YW5jZW9mIGUuSW1wbGljaXRSZWNlaXZlciAmJiAhKG4ucmVjZWl2ZXIgaW5zdGFuY2VvZiBlLlRoaXNSZWNlaXZlcik7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBhcnJheSBmb3JtZWQgYnkgYXBwbHlpbmcgYSBnaXZlbiBjYWxsYmFjayBmdW5jdGlvbiB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIGFycmF5LFxuICogYW5kIHRoZW4gZmxhdHRlbmluZyB0aGUgcmVzdWx0IGJ5IG9uZSBsZXZlbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZsYXRNYXA8VCwgUj4oaXRlbXM6IFRbXXxyZWFkb25seSBUW10sIGY6IChpdGVtOiBUKSA9PiBSW10gfCByZWFkb25seSBSW10pOiBSW10ge1xuICBjb25zdCByZXN1bHRzOiBSW10gPSBbXTtcbiAgZm9yIChjb25zdCB4IG9mIGl0ZW1zKSB7XG4gICAgcmVzdWx0cy5wdXNoKC4uLmYoeCkpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlU2NyaXB0RmlsZShmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4dGVybmFsVGVtcGxhdGUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gIWlzVHlwZVNjcmlwdEZpbGUoZmlsZU5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXaXRoaW4ocG9zaXRpb246IG51bWJlciwgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFufFBhcnNlU291cmNlU3Bhbik6IGJvb2xlYW4ge1xuICBsZXQgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXI7XG4gIGlmIChzcGFuIGluc3RhbmNlb2YgUGFyc2VTb3VyY2VTcGFuKSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBlbmQgPSBzcGFuLmVuZC5vZmZzZXQ7XG4gIH0gZWxzZSB7XG4gICAgc3RhcnQgPSBzcGFuLnN0YXJ0O1xuICAgIGVuZCA9IHNwYW4uZW5kO1xuICB9XG4gIC8vIE5vdGUgYm90aCBzdGFydCBhbmQgZW5kIGFyZSBpbmNsdXNpdmUgYmVjYXVzZSB3ZSB3YW50IHRvIG1hdGNoIGNvbmRpdGlvbnNcbiAgLy8gbGlrZSDCpnN0YXJ0IGFuZCBlbmTCpiB3aGVyZSDCpiBpcyB0aGUgY3Vyc29yLlxuICByZXR1cm4gc3RhcnQgPD0gcG9zaXRpb24gJiYgcG9zaXRpb24gPD0gZW5kO1xufVxuXG4vKipcbiAqIEZvciBhIGdpdmVuIGxvY2F0aW9uIGluIGEgc2hpbSBmaWxlLCByZXRyaWV2ZXMgdGhlIGNvcnJlc3BvbmRpbmcgZmlsZSB1cmwgZm9yIHRoZSB0ZW1wbGF0ZSBhbmRcbiAqIHRoZSBzcGFuIGluIHRoZSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlTG9jYXRpb25Gcm9tU2hpbUxvY2F0aW9uKFxuICAgIHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXIsIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBwb3NpdGlvbkluU2hpbUZpbGU6IG51bWJlcik6IHt0ZW1wbGF0ZVVybDogQWJzb2x1dGVGc1BhdGgsIHNwYW46IFBhcnNlU291cmNlU3Bhbn18bnVsbCB7XG4gIGNvbnN0IG1hcHBpbmcgPVxuICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbih7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0pO1xuICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICBsZXQgdGVtcGxhdGVVcmw6IEFic29sdXRlRnNQYXRoO1xuICBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudGVtcGxhdGVVcmwpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaW5jbHVkZXMgaW5kaXJlY3QgbWFwcGluZ3MsIHdoaWNoIGFyZSBkaWZmaWN1bHQgdG8gbWFwIGRpcmVjdGx5IHRvIHRoZSBjb2RlXG4gICAgLy8gbG9jYXRpb24uIERpYWdub3N0aWNzIHNpbWlsYXJseSByZXR1cm4gYSBzeW50aGV0aWMgdGVtcGxhdGUgc3RyaW5nIGZvciB0aGlzIGNhc2UgcmF0aGVyXG4gICAgLy8gdGhhbiBhIHJlYWwgbG9jYXRpb24uXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHt0ZW1wbGF0ZVVybCwgc3Bhbn07XG59Il19