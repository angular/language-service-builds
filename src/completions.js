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
        define("@angular/language-service/src/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/expressions", "@angular/language-service/src/html_info", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var html_info_1 = require("@angular/language-service/src/html_info");
    var types_1 = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    var TEMPLATE_ATTR_PREFIX = '*';
    var hiddenHtmlElements = {
        html: true,
        script: true,
        noscript: true,
        base: true,
        body: true,
        title: true,
        head: true,
        link: true,
    };
    var ANGULAR_ELEMENTS = ['ng-container', 'ng-content', 'ng-template'];
    function getTemplateCompletions(templateInfo, position) {
        var result = [];
        var htmlAst = templateInfo.htmlAst, template = templateInfo.template;
        // The templateNode starts at the delimiter character so we add 1 to skip it.
        var templatePosition = position - template.span.start;
        var path = compiler_1.findNode(htmlAst, templatePosition);
        var mostSpecific = path.tail;
        if (path.empty || !mostSpecific) {
            result = elementCompletions(templateInfo, path);
        }
        else {
            var astPosition_1 = templatePosition - mostSpecific.sourceSpan.start.offset;
            mostSpecific.visit({
                visitElement: function (ast) {
                    var startTagSpan = utils_1.spanOf(ast.sourceSpan);
                    var tagLen = ast.name.length;
                    // + 1 for the opening angle bracket
                    if (templatePosition <= startTagSpan.start + tagLen + 1) {
                        // If we are in the tag then return the element completions.
                        result = elementCompletions(templateInfo, path);
                    }
                    else if (templatePosition < startTagSpan.end) {
                        // We are in the attribute section of the element (but not in an attribute).
                        // Return the attribute completions.
                        result = attributeCompletions(templateInfo, path);
                    }
                },
                visitAttribute: function (ast) {
                    if (!ast.valueSpan || !utils_1.inSpan(templatePosition, utils_1.spanOf(ast.valueSpan))) {
                        // We are in the name of an attribute. Show attribute completions.
                        result = attributeCompletions(templateInfo, path);
                    }
                    else if (ast.valueSpan && utils_1.inSpan(templatePosition, utils_1.spanOf(ast.valueSpan))) {
                        result = attributeValueCompletions(templateInfo, templatePosition, ast);
                    }
                },
                visitText: function (ast) {
                    // Check if we are in a entity.
                    result = entityCompletions(getSourceText(template, utils_1.spanOf(ast)), astPosition_1);
                    if (result.length)
                        return result;
                    result = interpolationCompletions(templateInfo, templatePosition);
                    if (result.length)
                        return result;
                    var element = path.first(compiler_1.Element);
                    if (element) {
                        var definition = compiler_1.getHtmlTagDefinition(element.name);
                        if (definition.contentType === compiler_1.TagContentType.PARSABLE_DATA) {
                            result = voidElementAttributeCompletions(templateInfo, path);
                            if (!result.length) {
                                // If the element can hold content, show element completions.
                                result = elementCompletions(templateInfo, path);
                            }
                        }
                    }
                    else {
                        // If no element container, implies parsable data so show elements.
                        result = voidElementAttributeCompletions(templateInfo, path);
                        if (!result.length) {
                            result = elementCompletions(templateInfo, path);
                        }
                    }
                },
                visitComment: function (ast) { },
                visitExpansion: function (ast) { },
                visitExpansionCase: function (ast) { }
            }, null);
        }
        return result;
    }
    exports.getTemplateCompletions = getTemplateCompletions;
    function attributeCompletions(info, path) {
        var item = path.tail instanceof compiler_1.Element ? path.tail : path.parentOf(path.tail);
        if (item instanceof compiler_1.Element) {
            return attributeCompletionsForElement(info, item.name);
        }
        return [];
    }
    function attributeCompletionsForElement(info, elementName) {
        var e_1, _a, e_2, _b, e_3, _c;
        var results = [];
        try {
            // Add html attributes
            for (var _d = tslib_1.__values(html_info_1.attributeNames(elementName)), _e = _d.next(); !_e.done; _e = _d.next()) {
                var name_1 = _e.value;
                results.push({
                    name: name_1,
                    kind: types_1.CompletionKind.HTML_ATTRIBUTE,
                    sortText: name_1,
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            // Add html properties
            for (var _f = tslib_1.__values(html_info_1.propertyNames(elementName)), _g = _f.next(); !_g.done; _g = _f.next()) {
                var name_2 = _g.value;
                results.push({
                    name: "[" + name_2 + "]",
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_2,
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
        try {
            // Add html events
            for (var _h = tslib_1.__values(html_info_1.eventNames(elementName)), _j = _h.next(); !_j.done; _j = _h.next()) {
                var name_3 = _j.value;
                results.push({
                    name: "(" + name_3 + ")",
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_3,
                });
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_3) throw e_3.error; }
        }
        // Add Angular attributes
        results.push.apply(results, tslib_1.__spread(angularAttributes(info, elementName)));
        return results;
    }
    function attributeValueCompletions(info, position, attr) {
        var path = utils_1.findTemplateAstAt(info.templateAst, position);
        if (!path.tail) {
            return [];
        }
        var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
        var visitor = new ExpressionVisitor(info, position, attr, function () { return language_services_1.getExpressionScope(dinfo, path, false); });
        path.tail.visit(visitor, null);
        if (!visitor.result || !visitor.result.length) {
            // Try allwoing widening the path
            var widerPath_1 = utils_1.findTemplateAstAt(info.templateAst, position, /* allowWidening */ true);
            if (widerPath_1.tail) {
                var widerVisitor = new ExpressionVisitor(info, position, attr, function () { return language_services_1.getExpressionScope(dinfo, widerPath_1, false); });
                widerPath_1.tail.visit(widerVisitor, null);
                return widerVisitor.result || [];
            }
        }
        return visitor.result || [];
    }
    function elementCompletions(info, path) {
        var htmlNames = html_info_1.elementNames().filter(function (name) { return !(name in hiddenHtmlElements); });
        // Collect the elements referenced by the selectors
        var directiveElements = utils_1.getSelectors(info)
            .selectors.map(function (selector) { return selector.element; })
            .filter(function (name) { return !!name; });
        var components = directiveElements.map(function (name) {
            return {
                name: name,
                // Need to cast to unknown because Angular's CompletionKind includes HTML
                // entites.
                kind: types_1.CompletionKind.COMPONENT,
                sortText: name,
            };
        });
        var htmlElements = htmlNames.map(function (name) {
            return {
                name: name,
                // Need to cast to unknown because Angular's CompletionKind includes HTML
                // entites.
                kind: types_1.CompletionKind.ELEMENT,
                sortText: name,
            };
        });
        var angularElements = ANGULAR_ELEMENTS.map(function (name) {
            return {
                name: name,
                // Need to cast to unknown because Angular's CompletionKind includes HTML
                // entites.
                kind: types_1.CompletionKind.ANGULAR_ELEMENT,
                sortText: name,
            };
        });
        // Return components and html elements
        return uniqueByName(tslib_1.__spread(htmlElements, components, angularElements));
    }
    /**
     * Filter the specified `entries` by unique name.
     * @param entries Completion Entries
     */
    function uniqueByName(entries) {
        var e_4, _a;
        var results = [];
        var set = new Set();
        try {
            for (var entries_1 = tslib_1.__values(entries), entries_1_1 = entries_1.next(); !entries_1_1.done; entries_1_1 = entries_1.next()) {
                var entry = entries_1_1.value;
                if (!set.has(entry.name)) {
                    set.add(entry.name);
                    results.push(entry);
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) _a.call(entries_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return results;
    }
    function entityCompletions(value, position) {
        // Look for entity completions
        var re = /&[A-Za-z]*;?(?!\d)/g;
        var found;
        var result = [];
        while (found = re.exec(value)) {
            var len = found[0].length;
            if (position >= found.index && position < (found.index + len)) {
                result = Object.keys(compiler_1.NAMED_ENTITIES).map(function (name) {
                    return {
                        name: "&" + name + ";",
                        // Need to cast to unknown because Angular's CompletionKind includes
                        // HTML entites.
                        kind: types_1.CompletionKind.ENTITY,
                        sortText: name,
                    };
                });
                break;
            }
        }
        return result;
    }
    function interpolationCompletions(info, position) {
        // Look for an interpolation in at the position.
        var templatePath = utils_1.findTemplateAstAt(info.templateAst, position);
        if (!templatePath.tail) {
            return [];
        }
        var visitor = new ExpressionVisitor(info, position, undefined, function () { return language_services_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(info), templatePath, false); });
        templatePath.tail.visit(visitor, null);
        return uniqueByName(visitor.result || []);
    }
    // There is a special case of HTML where text that contains a unclosed tag is treated as
    // text. For exaple '<h1> Some <a text </h1>' produces a text nodes inside of the H1
    // element "Some <a text". We, however, want to treat this as if the user was requesting
    // the attributes of an "a" element, not requesting completion in the a text element. This
    // code checks for this case and returns element completions if it is detected or undefined
    // if it is not.
    function voidElementAttributeCompletions(info, path) {
        var tail = path.tail;
        if (tail instanceof compiler_1.Text) {
            var match = tail.value.match(/<(\w(\w|\d|-)*:)?(\w(\w|\d|-)*)\s/);
            // The position must be after the match, otherwise we are still in a place where elements
            // are expected (such as `<|a` or `<a|`; we only want attributes for `<a |` or after).
            if (match &&
                path.position >= (match.index || 0) + match[0].length + tail.sourceSpan.start.offset) {
                return attributeCompletionsForElement(info, match[3]);
            }
        }
        return [];
    }
    var ExpressionVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionVisitor, _super);
        function ExpressionVisitor(info, position, attr, getExpressionScope) {
            var _this = _super.call(this) || this;
            _this.info = info;
            _this.position = position;
            _this.attr = attr;
            _this.getExpressionScope = getExpressionScope || (function () { return info.template.members; });
            return _this;
        }
        ExpressionVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.attributeValueCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitElementProperty = function (ast) {
            this.attributeValueCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitEvent = function (ast) { this.attributeValueCompletions(ast.handler); };
        ExpressionVisitor.prototype.visitElement = function (ast) {
            var _this = this;
            if (this.attr && utils_1.getSelectors(this.info) && this.attr.name.startsWith(TEMPLATE_ATTR_PREFIX)) {
                // The value is a template expression but the expression AST was not produced when the
                // TemplateAst was produce so
                // do that now.
                var key_1 = this.attr.name.substr(TEMPLATE_ATTR_PREFIX.length);
                // Find the selector
                var selectorInfo = utils_1.getSelectors(this.info);
                var selectors = selectorInfo.selectors;
                var selector_1 = selectors.filter(function (s) { return s.attrs.some(function (attr, i) { return i % 2 === 0 && attr === key_1; }); })[0];
                var templateBindingResult = this.info.expressionParser.parseTemplateBindings(key_1, this.attr.value, null, 0);
                // find the template binding that contains the position
                if (!this.attr.valueSpan)
                    return;
                var valueRelativePosition_1 = this.position - this.attr.valueSpan.start.offset;
                var bindings = templateBindingResult.templateBindings;
                var binding = bindings.find(function (binding) { return utils_1.inSpan(valueRelativePosition_1, binding.span, /* exclusive */ true); }) ||
                    bindings.find(function (binding) { return utils_1.inSpan(valueRelativePosition_1, binding.span); });
                var keyCompletions = function () {
                    var keys = [];
                    if (selector_1) {
                        var attrNames = selector_1.attrs.filter(function (_, i) { return i % 2 === 0; });
                        keys = attrNames.filter(function (name) { return name.startsWith(key_1) && name != key_1; })
                            .map(function (name) { return lowerName(name.substr(key_1.length)); });
                    }
                    keys.push('let');
                    _this.result = keys.map(function (key) {
                        return {
                            name: key,
                            // Need to cast to unknown because Angular's CompletionKind includes
                            // HTML entites.
                            kind: types_1.CompletionKind.KEY,
                            sortText: key,
                        };
                    });
                };
                if (!binding || (binding.key === key_1 && !binding.expression)) {
                    // We are in the root binding. We should return `let` and keys that are left in the
                    // selector.
                    keyCompletions();
                }
                else if (binding.keyIsVar) {
                    var equalLocation = this.attr.value.indexOf('=');
                    this.result = [];
                    if (equalLocation >= 0 && valueRelativePosition_1 >= equalLocation) {
                        // We are after the '=' in a let clause. The valid values here are the members of the
                        // template reference's type parameter.
                        var directiveMetadata = selectorInfo.map.get(selector_1);
                        if (directiveMetadata) {
                            var contextTable = this.info.template.query.getTemplateContext(directiveMetadata.type.reference);
                            if (contextTable) {
                                this.result = this.symbolsToCompletions(contextTable.values());
                            }
                        }
                    }
                    else if (binding.key && valueRelativePosition_1 <= (binding.key.length - key_1.length)) {
                        keyCompletions();
                    }
                }
                else {
                    // If the position is in the expression or after the key or there is no key, return the
                    // expression completions
                    if ((binding.expression && utils_1.inSpan(valueRelativePosition_1, binding.expression.ast.span)) ||
                        (binding.key &&
                            valueRelativePosition_1 > binding.span.start + (binding.key.length - key_1.length)) ||
                        !binding.key) {
                        var span = new compiler_1.ParseSpan(0, this.attr.value.length);
                        var offset = ast.sourceSpan.start.offset;
                        this.attributeValueCompletions(binding.expression ? binding.expression.ast :
                            new compiler_1.PropertyRead(span, span.toAbsolute(offset), new compiler_1.ImplicitReceiver(span, span.toAbsolute(offset)), ''), valueRelativePosition_1);
                    }
                    else {
                        keyCompletions();
                    }
                }
            }
        };
        ExpressionVisitor.prototype.visitBoundText = function (ast) {
            var expressionPosition = this.position - ast.sourceSpan.start.offset;
            if (utils_1.inSpan(expressionPosition, ast.value.span)) {
                var completions = expressions_1.getExpressionCompletions(this.getExpressionScope(), ast.value, expressionPosition, this.info.template.query);
                if (completions) {
                    this.result = this.symbolsToCompletions(completions);
                }
            }
        };
        ExpressionVisitor.prototype.attributeValueCompletions = function (value, position) {
            var symbols = expressions_1.getExpressionCompletions(this.getExpressionScope(), value, position === undefined ? this.attributeValuePosition : position, this.info.template.query);
            if (symbols) {
                this.result = this.symbolsToCompletions(symbols);
            }
        };
        ExpressionVisitor.prototype.symbolsToCompletions = function (symbols) {
            return symbols.filter(function (s) { return !s.name.startsWith('__') && s.public; }).map(function (symbol) {
                return {
                    name: symbol.name,
                    kind: symbol.kind,
                    sortText: symbol.name,
                };
            });
        };
        Object.defineProperty(ExpressionVisitor.prototype, "attributeValuePosition", {
            get: function () {
                if (this.attr && this.attr.valueSpan) {
                    return this.position - this.attr.valueSpan.start.offset;
                }
                return 0;
            },
            enumerable: true,
            configurable: true
        });
        return ExpressionVisitor;
    }(compiler_1.NullTemplateVisitor));
    function getSourceText(template, span) {
        return template.source.substring(span.start, span.end);
    }
    var templateAttr = /^(\w+:)?(template$|^\*)/;
    function createElementCssSelector(element) {
        var e_5, _a;
        var cssSelector = new compiler_1.CssSelector();
        var elNameNoNs = compiler_1.splitNsName(element.name)[1];
        cssSelector.setElement(elNameNoNs);
        try {
            for (var _b = tslib_1.__values(element.attrs), _c = _b.next(); !_c.done; _c = _b.next()) {
                var attr = _c.value;
                if (!attr.name.match(templateAttr)) {
                    var _d = tslib_1.__read(compiler_1.splitNsName(attr.name), 2), _ = _d[0], attrNameNoNs = _d[1];
                    cssSelector.addAttribute(attrNameNoNs, attr.value);
                    if (attr.name.toLowerCase() === 'class') {
                        var classes = attr.value.split(/s+/g);
                        classes.forEach(function (className) { return cssSelector.addClassName(className); });
                    }
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return cssSelector;
    }
    function lowerName(name) {
        return name && (name[0].toLowerCase() + name.substr(1));
    }
    function angularAttributes(info, elementName) {
        var e_6, _a, e_7, _b, e_8, _c, e_9, _d, e_10, _e, e_11, _f, e_12, _g, e_13, _h;
        var _j = utils_1.getSelectors(info), selectors = _j.selectors, selectorMap = _j.map;
        var templateRefs = new Set();
        var inputs = new Set();
        var outputs = new Set();
        var others = new Set();
        try {
            for (var selectors_1 = tslib_1.__values(selectors), selectors_1_1 = selectors_1.next(); !selectors_1_1.done; selectors_1_1 = selectors_1.next()) {
                var selector = selectors_1_1.value;
                if (selector.element && selector.element !== elementName) {
                    continue;
                }
                var summary = selectorMap.get(selector);
                try {
                    for (var _k = (e_7 = void 0, tslib_1.__values(selector.attrs)), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var attr = _l.value;
                        if (attr) {
                            if (utils_1.hasTemplateReference(summary.type)) {
                                templateRefs.add(attr);
                            }
                            else {
                                others.add(attr);
                            }
                        }
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_b = _k.return)) _b.call(_k);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                try {
                    for (var _m = (e_8 = void 0, tslib_1.__values(Object.values(summary.inputs))), _o = _m.next(); !_o.done; _o = _m.next()) {
                        var input = _o.value;
                        inputs.add(input);
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
                try {
                    for (var _p = (e_9 = void 0, tslib_1.__values(Object.values(summary.outputs))), _q = _p.next(); !_q.done; _q = _p.next()) {
                        var output = _q.value;
                        outputs.add(output);
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (selectors_1_1 && !selectors_1_1.done && (_a = selectors_1.return)) _a.call(selectors_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var results = [];
        try {
            for (var templateRefs_1 = tslib_1.__values(templateRefs), templateRefs_1_1 = templateRefs_1.next(); !templateRefs_1_1.done; templateRefs_1_1 = templateRefs_1.next()) {
                var name_4 = templateRefs_1_1.value;
                results.push({
                    name: "*" + name_4,
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_4,
                });
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (templateRefs_1_1 && !templateRefs_1_1.done && (_e = templateRefs_1.return)) _e.call(templateRefs_1);
            }
            finally { if (e_10) throw e_10.error; }
        }
        try {
            for (var inputs_1 = tslib_1.__values(inputs), inputs_1_1 = inputs_1.next(); !inputs_1_1.done; inputs_1_1 = inputs_1.next()) {
                var name_5 = inputs_1_1.value;
                results.push({
                    name: "[" + name_5 + "]",
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_5,
                });
                // Add banana-in-a-box syntax
                // https://angular.io/guide/template-syntax#two-way-binding-
                if (outputs.has(name_5 + "Change")) {
                    results.push({
                        name: "[(" + name_5 + ")]",
                        kind: types_1.CompletionKind.ATTRIBUTE,
                        sortText: name_5,
                    });
                }
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (inputs_1_1 && !inputs_1_1.done && (_f = inputs_1.return)) _f.call(inputs_1);
            }
            finally { if (e_11) throw e_11.error; }
        }
        try {
            for (var outputs_1 = tslib_1.__values(outputs), outputs_1_1 = outputs_1.next(); !outputs_1_1.done; outputs_1_1 = outputs_1.next()) {
                var name_6 = outputs_1_1.value;
                results.push({
                    name: "(" + name_6 + ")",
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_6,
                });
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (outputs_1_1 && !outputs_1_1.done && (_g = outputs_1.return)) _g.call(outputs_1);
            }
            finally { if (e_12) throw e_12.error; }
        }
        try {
            for (var others_1 = tslib_1.__values(others), others_1_1 = others_1.next(); !others_1_1.done; others_1_1 = others_1.next()) {
                var name_7 = others_1_1.value;
                results.push({
                    name: name_7,
                    kind: types_1.CompletionKind.ATTRIBUTE,
                    sortText: name_7,
                });
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (others_1_1 && !others_1_1.done && (_h = others_1.return)) _h.call(others_1);
            }
            finally { if (e_13) throw e_13.error; }
        }
        return results;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1c7SUFDbFcsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsNkRBQWtGO0lBQ2xGLDZEQUE4SDtJQUU5SCxJQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUVqQyxJQUFNLGtCQUFrQixHQUFHO1FBQ3pCLElBQUksRUFBRSxJQUFJO1FBQ1YsTUFBTSxFQUFFLElBQUk7UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7UUFDVixLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDO0lBRUYsSUFBTSxnQkFBZ0IsR0FBMEIsQ0FBQyxjQUFjLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRTlGLFNBQWdCLHNCQUFzQixDQUNsQyxZQUF1QixFQUFFLFFBQWdCO1FBQzNDLElBQUksTUFBTSxHQUF5QixFQUFFLENBQUM7UUFDL0IsSUFBQSw4QkFBTyxFQUFFLGdDQUFRLENBQWlCO1FBQ3pDLDZFQUE2RTtRQUM3RSxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN4RCxJQUFNLElBQUksR0FBRyxtQkFBUSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxrQkFBa0Is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Q25CLElBQUksRUFBRSxzQkFBYyxDQUFDLFNBQTRDO3dCQUNqRSxRQUFRLEVBQUUsTUFBSTtxQkFDZixDQUFDLENBQUM7aUJBQ0o7YUFDRjs7Ozs7Ozs7OztZQUNELEtBQW1CLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7Z0JBQXZCLElBQU0sTUFBSSxvQkFBQTtnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxNQUFJLE1BQUksTUFBRztvQkFDakIsSUFBSSxFQUFFLHNCQUFjLENBQUMsU0FBNEM7b0JBQ2pFLFFBQVEsRUFBRSxNQUFJO2lCQUNmLENBQUMsQ0FBQzthQUNKOzs7Ozs7Ozs7O1lBQ0QsS0FBbUIsSUFBQSxXQUFBLGlCQUFBLE1BQU0sQ0FBQSw4QkFBQSxrREFBRTtnQkFBdEIsSUFBTSxNQUFJLG1CQUFBO2dCQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxRQUFBO29CQUNKLElBQUksRUFBRSxzQkFBYyxDQUFDLFNBQTRDO29CQUNqRSxRQUFRLEVBQUUsTUFBSTtpQkFDZixDQUFDLENBQUM7YUFDSjs7Ozs7Ozs7O1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ3NzU2VsZWN0b3IsIEVsZW1lbnQsIEVsZW1lbnRBc3QsIEltcGxpY2l0UmVjZWl2ZXIsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUHJvcGVydHlSZWFkLCBTZWxlY3Rvck1hdGNoZXIsIFRhZ0NvbnRlbnRUeXBlLCBUZXh0LCBmaW5kTm9kZSwgZ2V0SHRtbFRhZ0RlZmluaXRpb24sIHNwbGl0TnNOYW1lfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBBdHRySW5mb30gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uQ29tcGxldGlvbnN9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHthdHRyaWJ1dGVOYW1lcywgZWxlbWVudE5hbWVzLCBldmVudE5hbWVzLCBwcm9wZXJ0eU5hbWVzfSBmcm9tICcuL2h0bWxfaW5mbyc7XG5pbXBvcnQge0NvbXBsZXRpb25LaW5kLCBTcGFuLCBTeW1ib2wsIFN5bWJvbFRhYmxlLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGdldFNlbGVjdG9ycywgaGFzVGVtcGxhdGVSZWZlcmVuY2UsIGluU3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgVEVNUExBVEVfQVRUUl9QUkVGSVggPSAnKic7XG5cbmNvbnN0IGhpZGRlbkh0bWxFbGVtZW50cyA9IHtcbiAgaHRtbDogdHJ1ZSxcbiAgc2NyaXB0OiB0cnVlLFxuICBub3NjcmlwdDogdHJ1ZSxcbiAgYmFzZTogdHJ1ZSxcbiAgYm9keTogdHJ1ZSxcbiAgdGl0bGU6IHRydWUsXG4gIGhlYWQ6IHRydWUsXG4gIGxpbms6IHRydWUsXG59O1xuXG5jb25zdCBBTkdVTEFSX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PHN0cmluZz4gPSBbJ25nLWNvbnRhaW5lcicsICduZy1jb250ZW50JywgJ25nLXRlbXBsYXRlJ107XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKFxuICAgIHRlbXBsYXRlSW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBsZXQgcmVzdWx0OiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBjb25zdCB7aHRtbEFzdCwgdGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICAvLyBUaGUgdGVtcGxhdGVOb2RlIHN0YXJ0cyBhdCB0aGUgZGVsaW1pdGVyIGNoYXJhY3RlciBzbyB3ZSBhZGQgMSB0byBza2lwIGl0LlxuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZmluZE5vZGUoaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IG1vc3RTcGVjaWZpYyA9IHBhdGgudGFpbDtcbiAgaWYgKHBhdGguZW1wdHkgfHwgIW1vc3RTcGVjaWZpYykge1xuICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFzdFBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIG1vc3RTcGVjaWZpYy5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBtb3N0U3BlY2lmaWMudmlzaXQoXG4gICAgICAgIHtcbiAgICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydFRhZ1NwYW4gPSBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgY29uc3QgdGFnTGVuID0gYXN0Lm5hbWUubGVuZ3RoO1xuICAgICAgICAgICAgLy8gKyAxIGZvciB0aGUgb3BlbmluZyBhbmdsZSBicmFja2V0XG4gICAgICAgICAgICBpZiAodGVtcGxhdGVQb3NpdGlvbiA8PSBzdGFydFRhZ1NwYW4uc3RhcnQgKyB0YWdMZW4gKyAxKSB7XG4gICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBpbiB0aGUgdGFnIHRoZW4gcmV0dXJuIHRoZSBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA8IHN0YXJ0VGFnU3Bhbi5lbmQpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0QXR0cmlidXRlKGFzdCkge1xuICAgICAgICAgICAgaWYgKCFhc3QudmFsdWVTcGFuIHx8ICFpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIG5hbWUgb2YgYW4gYXR0cmlidXRlLiBTaG93IGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlU3BhbiAmJiBpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbiwgYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0VGV4dChhc3QpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBpbiBhIGVudGl0eS5cbiAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29udGVudFR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlBBUlNBQkxFX0RBVEEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBjYW4gaG9sZCBjb250ZW50LCBzaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIElmIG5vIGVsZW1lbnQgY29udGFpbmVyLCBpbXBsaWVzIHBhcnNhYmxlIGRhdGEgc28gc2hvdyBlbGVtZW50cy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRDb21tZW50KGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb24oYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0KSB7fVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGl0ZW0gPSBwYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50ID8gcGF0aC50YWlsIDogcGF0aC5wYXJlbnRPZihwYXRoLnRhaWwpO1xuICBpZiAoaXRlbSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIGl0ZW0ubmFtZSk7XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gIC8vIEFkZCBodG1sIGF0dHJpYnV0ZXNcbiAgZm9yIChjb25zdCBuYW1lIG9mIGF0dHJpYnV0ZU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogQ29tcGxldGlvbktpbmQuSFRNTF9BVFRSSUJVVEUgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIGh0bWwgcHJvcGVydGllc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcHJvcGVydHlOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYFske25hbWV9XWAsXG4gICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5BVFRSSUJVVEUgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIGh0bWwgZXZlbnRzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBldmVudE5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkFUVFJJQlVURSBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cblxuICAvLyBBZGQgQW5ndWxhciBhdHRyaWJ1dGVzXG4gIHJlc3VsdHMucHVzaCguLi5hbmd1bGFyQXR0cmlidXRlcyhpbmZvLCBlbGVtZW50TmFtZSkpO1xuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlciwgYXR0cjogQXR0cmlidXRlKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBwYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgY29uc3QgdmlzaXRvciA9XG4gICAgICBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCwgZmFsc2UpKTtcbiAgcGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICBpZiAoIXZpc2l0b3IucmVzdWx0IHx8ICF2aXNpdG9yLnJlc3VsdC5sZW5ndGgpIHtcbiAgICAvLyBUcnkgYWxsd29pbmcgd2lkZW5pbmcgdGhlIHBhdGhcbiAgICBjb25zdCB3aWRlclBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbiwgLyogYWxsb3dXaWRlbmluZyAqLyB0cnVlKTtcbiAgICBpZiAod2lkZXJQYXRoLnRhaWwpIHtcbiAgICAgIGNvbnN0IHdpZGVyVmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgICAgICBpbmZvLCBwb3NpdGlvbiwgYXR0ciwgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB3aWRlclBhdGgsIGZhbHNlKSk7XG4gICAgICB3aWRlclBhdGgudGFpbC52aXNpdCh3aWRlclZpc2l0b3IsIG51bGwpO1xuICAgICAgcmV0dXJuIHdpZGVyVmlzaXRvci5yZXN1bHQgfHwgW107XG4gICAgfVxuICB9XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdCB8fCBbXTtcbn1cblxuZnVuY3Rpb24gZWxlbWVudENvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgaHRtbE5hbWVzID0gZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIShuYW1lIGluIGhpZGRlbkh0bWxFbGVtZW50cykpO1xuXG4gIC8vIENvbGxlY3QgdGhlIGVsZW1lbnRzIHJlZmVyZW5jZWQgYnkgdGhlIHNlbGVjdG9yc1xuICBjb25zdCBkaXJlY3RpdmVFbGVtZW50cyA9IGdldFNlbGVjdG9ycyhpbmZvKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0b3JzLm1hcChzZWxlY3RvciA9PiBzZWxlY3Rvci5lbGVtZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKG5hbWUgPT4gISFuYW1lKSBhcyBzdHJpbmdbXTtcblxuICBjb25zdCBjb21wb25lbnRzID0gZGlyZWN0aXZlRWxlbWVudHMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXMgSFRNTFxuICAgICAgLy8gZW50aXRlcy5cbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGh0bWxFbGVtZW50cyA9IGh0bWxOYW1lcy5tYXAobmFtZSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICAvLyBOZWVkIHRvIGNhc3QgdG8gdW5rbm93biBiZWNhdXNlIEFuZ3VsYXIncyBDb21wbGV0aW9uS2luZCBpbmNsdWRlcyBIVE1MXG4gICAgICAvLyBlbnRpdGVzLlxuICAgICAga2luZDogQ29tcGxldGlvbktpbmQuRUxFTUVOVCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGFuZ3VsYXJFbGVtZW50cyA9IEFOR1VMQVJfRUxFTUVOVFMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXMgSFRNTFxuICAgICAgLy8gZW50aXRlcy5cbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gUmV0dXJuIGNvbXBvbmVudHMgYW5kIGh0bWwgZWxlbWVudHNcbiAgcmV0dXJuIHVuaXF1ZUJ5TmFtZShbLi4uaHRtbEVsZW1lbnRzLCAuLi5jb21wb25lbnRzLCAuLi5hbmd1bGFyRWxlbWVudHNdKTtcbn1cblxuLyoqXG4gKiBGaWx0ZXIgdGhlIHNwZWNpZmllZCBgZW50cmllc2AgYnkgdW5pcXVlIG5hbWUuXG4gKiBAcGFyYW0gZW50cmllcyBDb21wbGV0aW9uIEVudHJpZXNcbiAqL1xuZnVuY3Rpb24gdW5pcXVlQnlOYW1lKGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdKSB7XG4gIGNvbnN0IHJlc3VsdHMgPSBbXTtcbiAgY29uc3Qgc2V0ID0gbmV3IFNldCgpO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoIXNldC5oYXMoZW50cnkubmFtZSkpIHtcbiAgICAgIHNldC5hZGQoZW50cnkubmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goZW50cnkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZW50aXR5Q29tcGxldGlvbnModmFsdWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgd2hpbGUgKGZvdW5kID0gcmUuZXhlYyh2YWx1ZSkpIHtcbiAgICBsZXQgbGVuID0gZm91bmRbMF0ubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+PSBmb3VuZC5pbmRleCAmJiBwb3NpdGlvbiA8IChmb3VuZC5pbmRleCArIGxlbikpIHtcbiAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKE5BTUVEX0VOVElUSUVTKS5tYXAobmFtZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogYCYke25hbWV9O2AsXG4gICAgICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXNcbiAgICAgICAgICAvLyBIVE1MIGVudGl0ZXMuXG4gICAgICAgICAga2luZDogQ29tcGxldGlvbktpbmQuRU5USVRZIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBhbiBpbnRlcnBvbGF0aW9uIGluIGF0IHRoZSBwb3NpdGlvbi5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXRlbXBsYXRlUGF0aC50YWlsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICBpbmZvLCBwb3NpdGlvbiwgdW5kZWZpbmVkLFxuICAgICAgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKSwgdGVtcGxhdGVQYXRoLCBmYWxzZSkpO1xuICB0ZW1wbGF0ZVBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgcmV0dXJuIHVuaXF1ZUJ5TmFtZSh2aXNpdG9yLnJlc3VsdCB8fCBbXSk7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gU3ltYm9sVGFibGU7XG4gIHJlc3VsdDogdHMuQ29tcGxldGlvbkVudHJ5W118dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmZvOiBBc3RSZXN1bHQsIHByaXZhdGUgcG9zaXRpb246IG51bWJlciwgcHJpdmF0ZSBhdHRyPzogQXR0cmlidXRlLFxuICAgICAgZ2V0RXhwcmVzc2lvblNjb3BlPzogKCkgPT4gU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlIHx8ICgoKSA9PiBpbmZvLnRlbXBsYXRlLm1lbWJlcnMpO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0KTogdm9pZCB7IHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhhc3QuaGFuZGxlcik7IH1cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiBnZXRTZWxlY3RvcnModGhpcy5pbmZvKSAmJiB0aGlzLmF0dHIubmFtZS5zdGFydHNXaXRoKFRFTVBMQVRFX0FUVFJfUFJFRklYKSkge1xuICAgICAgLy8gVGhlIHZhbHVlIGlzIGEgdGVtcGxhdGUgZXhwcmVzc2lvbiBidXQgdGhlIGV4cHJlc3Npb24gQVNUIHdhcyBub3QgcHJvZHVjZWQgd2hlbiB0aGVcbiAgICAgIC8vIFRlbXBsYXRlQXN0IHdhcyBwcm9kdWNlIHNvXG4gICAgICAvLyBkbyB0aGF0IG5vdy5cblxuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hdHRyLm5hbWUuc3Vic3RyKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yXG4gICAgICBjb25zdCBzZWxlY3RvckluZm8gPSBnZXRTZWxlY3RvcnModGhpcy5pbmZvKTtcbiAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IHNlbGVjdG9ySW5mby5zZWxlY3RvcnM7XG4gICAgICBjb25zdCBzZWxlY3RvciA9XG4gICAgICAgICAgc2VsZWN0b3JzLmZpbHRlcihzID0+IHMuYXR0cnMuc29tZSgoYXR0ciwgaSkgPT4gaSAlIDIgPT09IDAgJiYgYXR0ciA9PT0ga2V5KSlbMF07XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQmluZGluZ1Jlc3VsdCA9XG4gICAgICAgICAgdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKGtleSwgdGhpcy5hdHRyLnZhbHVlLCBudWxsLCAwKTtcblxuICAgICAgLy8gZmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvblxuICAgICAgaWYgKCF0aGlzLmF0dHIudmFsdWVTcGFuKSByZXR1cm47XG4gICAgICBjb25zdCB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gdGhpcy5hdHRyLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICBjb25zdCBiaW5kaW5ncyA9IHRlbXBsYXRlQmluZGluZ1Jlc3VsdC50ZW1wbGF0ZUJpbmRpbmdzO1xuICAgICAgY29uc3QgYmluZGluZyA9XG4gICAgICAgICAgYmluZGluZ3MuZmluZChcbiAgICAgICAgICAgICAgYmluZGluZyA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLnNwYW4sIC8qIGV4Y2x1c2l2ZSAqLyB0cnVlKSkgfHxcbiAgICAgICAgICBiaW5kaW5ncy5maW5kKGJpbmRpbmcgPT4gaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5zcGFuKSk7XG5cbiAgICAgIGNvbnN0IGtleUNvbXBsZXRpb25zID0gKCkgPT4ge1xuICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgY29uc3QgYXR0ck5hbWVzID0gc2VsZWN0b3IuYXR0cnMuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMCk7XG4gICAgICAgICAga2V5cyA9IGF0dHJOYW1lcy5maWx0ZXIobmFtZSA9PiBuYW1lLnN0YXJ0c1dpdGgoa2V5KSAmJiBuYW1lICE9IGtleSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAobmFtZSA9PiBsb3dlck5hbWUobmFtZS5zdWJzdHIoa2V5Lmxlbmd0aCkpKTtcbiAgICAgICAgfVxuICAgICAgICBrZXlzLnB1c2goJ2xldCcpO1xuICAgICAgICB0aGlzLnJlc3VsdCA9IGtleXMubWFwKGtleSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCB0byB1bmtub3duIGJlY2F1c2UgQW5ndWxhcidzIENvbXBsZXRpb25LaW5kIGluY2x1ZGVzXG4gICAgICAgICAgICAvLyBIVE1MIGVudGl0ZXMuXG4gICAgICAgICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5LRVkgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgICAgICAgIHNvcnRUZXh0OiBrZXksXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoIWJpbmRpbmcgfHwgKGJpbmRpbmcua2V5ID09PSBrZXkgJiYgIWJpbmRpbmcuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgLy8gV2UgYXJlIGluIHRoZSByb290IGJpbmRpbmcuIFdlIHNob3VsZCByZXR1cm4gYGxldGAgYW5kIGtleXMgdGhhdCBhcmUgbGVmdCBpbiB0aGVcbiAgICAgICAgLy8gc2VsZWN0b3IuXG4gICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICB9IGVsc2UgaWYgKGJpbmRpbmcua2V5SXNWYXIpIHtcbiAgICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IHRoaXMuYXR0ci52YWx1ZS5pbmRleE9mKCc9Jyk7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gW107XG4gICAgICAgIGlmIChlcXVhbExvY2F0aW9uID49IDAgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID49IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgICAvLyBXZSBhcmUgYWZ0ZXIgdGhlICc9JyBpbiBhIGxldCBjbGF1c2UuIFRoZSB2YWxpZCB2YWx1ZXMgaGVyZSBhcmUgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRUYWJsZSkge1xuICAgICAgICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29udGV4dFRhYmxlLnZhbHVlcygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYmluZGluZy5rZXkgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uIDw9IChiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSkge1xuICAgICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBwb3NpdGlvbiBpcyBpbiB0aGUgZXhwcmVzc2lvbiBvciBhZnRlciB0aGUga2V5IG9yIHRoZXJlIGlzIG5vIGtleSwgcmV0dXJuIHRoZVxuICAgICAgICAvLyBleHByZXNzaW9uIGNvbXBsZXRpb25zXG4gICAgICAgIGlmICgoYmluZGluZy5leHByZXNzaW9uICYmIGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuZXhwcmVzc2lvbi5hc3Quc3BhbikpIHx8XG4gICAgICAgICAgICAoYmluZGluZy5rZXkgJiZcbiAgICAgICAgICAgICB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBiaW5kaW5nLnNwYW4uc3RhcnQgKyAoYmluZGluZy5rZXkubGVuZ3RoIC0ga2V5Lmxlbmd0aCkpIHx8XG4gICAgICAgICAgICAhYmluZGluZy5rZXkpIHtcbiAgICAgICAgICBjb25zdCBzcGFuID0gbmV3IFBhcnNlU3BhbigwLCB0aGlzLmF0dHIudmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKFxuICAgICAgICAgICAgICBiaW5kaW5nLmV4cHJlc3Npb24gPyBiaW5kaW5nLmV4cHJlc3Npb24uYXN0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFByb3BlcnR5UmVhZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4sIHNwYW4udG9BYnNvbHV0ZShvZmZzZXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEltcGxpY2l0UmVjZWl2ZXIoc3Bhbiwgc3Bhbi50b0Fic29sdXRlKG9mZnNldCkpLCAnJyksXG4gICAgICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KSB7XG4gICAgY29uc3QgZXhwcmVzc2lvblBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIGV4cHJlc3Npb25Qb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgIGlmIChjb21wbGV0aW9ucykge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29tcGxldGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh2YWx1ZTogQVNULCBwb3NpdGlvbj86IG51bWJlcikge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLFxuICAgICAgICBwb3NpdGlvbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5hdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uIDogcG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgaWYgKHN5bWJvbHMpIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IFN5bWJvbFtdKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBzeW1ib2xzLmZpbHRlcihzID0+ICFzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSAmJiBzLnB1YmxpYykubWFwKHN5bWJvbCA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgIHNvcnRUZXh0OiBzeW1ib2wubmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldCBhdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uKCkge1xuICAgIGlmICh0aGlzLmF0dHIgJiYgdGhpcy5hdHRyLnZhbHVlU3Bhbikge1xuICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UsIHNwYW46IFNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmNvbnN0IHRlbXBsYXRlQXR0ciA9IC9eKFxcdys6KT8odGVtcGxhdGUkfF5cXCopLztcbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRDc3NTZWxlY3RvcihlbGVtZW50OiBFbGVtZW50KTogQ3NzU2VsZWN0b3Ige1xuICBjb25zdCBjc3NTZWxlY3RvciA9IG5ldyBDc3NTZWxlY3RvcigpO1xuICBjb25zdCBlbE5hbWVOb05zID0gc3BsaXROc05hbWUoZWxlbWVudC5uYW1lKVsxXTtcblxuICBjc3NTZWxlY3Rvci5zZXRFbGVtZW50KGVsTmFtZU5vTnMpO1xuXG4gIGZvciAoY29uc3QgYXR0ciBvZiBlbGVtZW50LmF0dHJzKSB7XG4gICAgaWYgKCFhdHRyLm5hbWUubWF0Y2godGVtcGxhdGVBdHRyKSkge1xuICAgICAgY29uc3QgW18sIGF0dHJOYW1lTm9Oc10gPSBzcGxpdE5zTmFtZShhdHRyLm5hbWUpO1xuICAgICAgY3NzU2VsZWN0b3IuYWRkQXR0cmlidXRlKGF0dHJOYW1lTm9OcywgYXR0ci52YWx1ZSk7XG4gICAgICBpZiAoYXR0ci5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdjbGFzcycpIHtcbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGF0dHIudmFsdWUuc3BsaXQoL3MrL2cpO1xuICAgICAgICBjbGFzc2VzLmZvckVhY2goY2xhc3NOYW1lID0+IGNzc1NlbGVjdG9yLmFkZENsYXNzTmFtZShjbGFzc05hbWUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNzc1NlbGVjdG9yO1xufVxuXG5mdW5jdGlvbiBsb3dlck5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5hbWUgJiYgKG5hbWVbMF0udG9Mb3dlckNhc2UoKSArIG5hbWUuc3Vic3RyKDEpKTtcbn1cblxuZnVuY3Rpb24gYW5ndWxhckF0dHJpYnV0ZXMoaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB7c2VsZWN0b3JzLCBtYXA6IHNlbGVjdG9yTWFwfSA9IGdldFNlbGVjdG9ycyhpbmZvKTtcbiAgY29uc3QgdGVtcGxhdGVSZWZzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG90aGVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgIGlmIChzZWxlY3Rvci5lbGVtZW50ICYmIHNlbGVjdG9yLmVsZW1lbnQgIT09IGVsZW1lbnROYW1lKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3Qgc3VtbWFyeSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvcikgITtcbiAgICBmb3IgKGNvbnN0IGF0dHIgb2Ygc2VsZWN0b3IuYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyKSB7XG4gICAgICAgIGlmIChoYXNUZW1wbGF0ZVJlZmVyZW5jZShzdW1tYXJ5LnR5cGUpKSB7XG4gICAgICAgICAgdGVtcGxhdGVSZWZzLmFkZChhdHRyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdGhlcnMuYWRkKGF0dHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5LmlucHV0cykpIHtcbiAgICAgIGlucHV0cy5hZGQoaW5wdXQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkub3V0cHV0cykpIHtcbiAgICAgIG91dHB1dHMuYWRkKG91dHB1dCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0czogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHRlbXBsYXRlUmVmcykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKiR7bmFtZX1gLFxuICAgICAga2luZDogQ29tcGxldGlvbktpbmQuQVRUUklCVVRFIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5wdXRzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGBbJHtuYW1lfV1gLFxuICAgICAga2luZDogQ29tcGxldGlvbktpbmQuQVRUUklCVVRFIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgICAvLyBBZGQgYmFuYW5hLWluLWEtYm94IHN5bnRheFxuICAgIC8vIGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS1zeW50YXgjdHdvLXdheS1iaW5kaW5nLVxuICAgIGlmIChvdXRwdXRzLmhhcyhgJHtuYW1lfUNoYW5nZWApKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lOiBgWygke25hbWV9KV1gLFxuICAgICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5BVFRSSUJVVEUgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIG91dHB1dHMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYCgke25hbWV9KWAsXG4gICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5BVFRSSUJVVEUgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBvdGhlcnMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkFUVFJJQlVURSBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iXX0=