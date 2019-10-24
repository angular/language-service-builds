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
    var ng = require("@angular/language-service/src/types");
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
                    kind: ng.CompletionKind.HTML_ATTRIBUTE,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
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
                kind: ng.CompletionKind.COMPONENT,
                sortText: name,
            };
        });
        var htmlElements = htmlNames.map(function (name) {
            return {
                name: name,
                kind: ng.CompletionKind.ELEMENT,
                sortText: name,
            };
        });
        var angularElements = ANGULAR_ELEMENTS.map(function (name) {
            return {
                name: name,
                kind: ng.CompletionKind.ANGULAR_ELEMENT,
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
                        kind: ng.CompletionKind.ENTITY,
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
                            kind: ng.CompletionKind.KEY,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_5,
                });
                // Add banana-in-a-box syntax
                // https://angular.io/guide/template-syntax#two-way-binding-
                if (outputs.has(name_5 + "Change")) {
                    results.push({
                        name: "[(" + name_5 + ")]",
                        kind: ng.CompletionKind.ATTRIBUTE,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
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
                    kind: ng.CompletionKind.ATTRIBUTE,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1c7SUFDbFcsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsd0RBQThCO0lBQzlCLDZEQUE4SDtJQUU5SCxJQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUVqQyxJQUFNLGtCQUFrQixHQUFHO1FBQ3pCLElBQUksRUFBRSxJQUFJO1FBQ1YsTUFBTSxFQUFFLElBQUk7UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7UUFDVixLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDO0lBRUYsSUFBTSxnQkFBZ0IsR0FBMEIsQ0FBQyxjQUFjLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBRTlGLFNBQWdCLHNCQUFzQixDQUNsQyxZQUF1QixFQUFFLFFBQWdCO1FBQzNDLElBQUksTUFBTSxHQUF5QixFQUFFLENBQUM7UUFDL0IsSUFBQSw4QkFBTyxFQUFFLGdDQUFRLENBQWlCO1FBQ3pDLDZFQUE2RTtRQUM3RSxJQUFNLGdCQUFnQixHQUFHLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN4RCxJQUFNLElBQUksR0FBRyxtQkFBUSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxrQkFBa0Is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RUFBRSxNQUFJO3FCQUNmLENBQUMsQ0FBQztpQkFDSjthQUNGOzs7Ozs7Ozs7O1lBQ0QsS0FBbUIsSUFBQSxZQUFBLGlCQUFBLE9BQU8sQ0FBQSxnQ0FBQSxxREFBRTtnQkFBdkIsSUFBTSxNQUFJLG9CQUFBO2dCQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxFQUFFLE1BQUksTUFBSSxNQUFHO29CQUNqQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTO29CQUNqQyxRQUFRLEVBQUUsTUFBSTtpQkFDZixDQUFDLENBQUM7YUFDSjs7Ozs7Ozs7OztZQUNELEtBQW1CLElBQUEsV0FBQSxpQkFBQSxNQUFNLENBQUEsOEJBQUEsa0RBQUU7Z0JBQXRCLElBQU0sTUFBSSxtQkFBQTtnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksUUFBQTtvQkFDSixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTO29CQUNqQyxRQUFRLEVBQUUsTUFBSTtpQkFDZixDQUFDLENBQUM7YUFDSjs7Ozs7Ozs7O1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ3NzU2VsZWN0b3IsIEVsZW1lbnQsIEVsZW1lbnRBc3QsIEltcGxpY2l0UmVjZWl2ZXIsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUHJvcGVydHlSZWFkLCBTZWxlY3Rvck1hdGNoZXIsIFRhZ0NvbnRlbnRUeXBlLCBUZXh0LCBmaW5kTm9kZSwgZ2V0SHRtbFRhZ0RlZmluaXRpb24sIHNwbGl0TnNOYW1lfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25Db21wbGV0aW9uc30gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge2F0dHJpYnV0ZU5hbWVzLCBlbGVtZW50TmFtZXMsIGV2ZW50TmFtZXMsIHByb3BlcnR5TmFtZXN9IGZyb20gJy4vaHRtbF9pbmZvJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRUZW1wbGF0ZUFzdEF0LCBnZXRTZWxlY3RvcnMsIGhhc1RlbXBsYXRlUmVmZXJlbmNlLCBpblNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IFRFTVBMQVRFX0FUVFJfUFJFRklYID0gJyonO1xuXG5jb25zdCBoaWRkZW5IdG1sRWxlbWVudHMgPSB7XG4gIGh0bWw6IHRydWUsXG4gIHNjcmlwdDogdHJ1ZSxcbiAgbm9zY3JpcHQ6IHRydWUsXG4gIGJhc2U6IHRydWUsXG4gIGJvZHk6IHRydWUsXG4gIHRpdGxlOiB0cnVlLFxuICBoZWFkOiB0cnVlLFxuICBsaW5rOiB0cnVlLFxufTtcblxuY29uc3QgQU5HVUxBUl9FTEVNRU5UUzogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gWyduZy1jb250YWluZXInLCAnbmctY29udGVudCcsICduZy10ZW1wbGF0ZSddO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyhcbiAgICB0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgY29uc3Qge2h0bWxBc3QsIHRlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgLy8gVGhlIHRlbXBsYXRlTm9kZSBzdGFydHMgYXQgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIgc28gd2UgYWRkIDEgdG8gc2tpcCBpdC5cbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGZpbmROb2RlKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSBwYXRoLnRhaWw7XG4gIGlmIChwYXRoLmVtcHR5IHx8ICFtb3N0U3BlY2lmaWMpIHtcbiAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhc3RQb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBtb3N0U3BlY2lmaWMuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgbW9zdFNwZWNpZmljLnZpc2l0KFxuICAgICAgICB7XG4gICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0xlbiA9IGFzdC5uYW1lLmxlbmd0aDtcbiAgICAgICAgICAgIC8vICsgMSBmb3IgdGhlIG9wZW5pbmcgYW5nbGUgYnJhY2tldFxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPD0gc3RhcnRUYWdTcGFuLnN0YXJ0ICsgdGFnTGVuICsgMSkge1xuICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgaW4gdGhlIHRhZyB0aGVuIHJldHVybiB0aGUgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPCBzdGFydFRhZ1NwYW4uZW5kKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgYXR0cmlidXRlIHNlY3Rpb24gb2YgdGhlIGVsZW1lbnQgKGJ1dCBub3QgaW4gYW4gYXR0cmlidXRlKS5cbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3QpIHtcbiAgICAgICAgICAgIGlmICghYXN0LnZhbHVlU3BhbiB8fCAhaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZS4gU2hvdyBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZVNwYW4gJiYgaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHRlbXBsYXRlUG9zaXRpb24sIGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFRleHQoYXN0KSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgaW4gYSBlbnRpdHkuXG4gICAgICAgICAgICByZXN1bHQgPSBlbnRpdHlDb21wbGV0aW9ucyhnZXRTb3VyY2VUZXh0KHRlbXBsYXRlLCBzcGFuT2YoYXN0KSksIGFzdFBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgcmVzdWx0ID0gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IGdldEh0bWxUYWdEZWZpbml0aW9uKGVsZW1lbnQubmFtZSk7XG4gICAgICAgICAgICAgIGlmIChkZWZpbml0aW9uLmNvbnRlbnRUeXBlID09PSBUYWdDb250ZW50VHlwZS5QQVJTQUJMRV9EQVRBKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgY2FuIGhvbGQgY29udGVudCwgc2hvdyBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBJZiBubyBlbGVtZW50IGNvbnRhaW5lciwgaW1wbGllcyBwYXJzYWJsZSBkYXRhIHNvIHNob3cgZWxlbWVudHMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0Q29tbWVudChhc3QpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uKGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb25DYXNlKGFzdCkge31cbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBpdGVtID0gcGF0aC50YWlsIGluc3RhbmNlb2YgRWxlbWVudCA/IHBhdGgudGFpbCA6IHBhdGgucGFyZW50T2YocGF0aC50YWlsKTtcbiAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBpdGVtLm5hbWUpO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KFxuICAgIGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcblxuICAvLyBBZGQgaHRtbCBhdHRyaWJ1dGVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyaWJ1dGVOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkhUTUxfQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cblxuICAvLyBBZGQgaHRtbCBwcm9wZXJ0aWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBwcm9wZXJ0eU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgWyR7bmFtZX1dYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIGh0bWwgZXZlbnRzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBldmVudE5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIEFuZ3VsYXIgYXR0cmlidXRlc1xuICByZXN1bHRzLnB1c2goLi4uYW5ndWxhckF0dHJpYnV0ZXMoaW5mbywgZWxlbWVudE5hbWUpKTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGF0dHI6IEF0dHJpYnV0ZSk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCFwYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gIGNvbnN0IHZpc2l0b3IgPVxuICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKGluZm8sIHBvc2l0aW9uLCBhdHRyLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgsIGZhbHNlKSk7XG4gIHBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgaWYgKCF2aXNpdG9yLnJlc3VsdCB8fCAhdmlzaXRvci5yZXN1bHQubGVuZ3RoKSB7XG4gICAgLy8gVHJ5IGFsbHdvaW5nIHdpZGVuaW5nIHRoZSBwYXRoXG4gICAgY29uc3Qgd2lkZXJQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24sIC8qIGFsbG93V2lkZW5pbmcgKi8gdHJ1ZSk7XG4gICAgaWYgKHdpZGVyUGF0aC50YWlsKSB7XG4gICAgICBjb25zdCB3aWRlclZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICAgICAgaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgd2lkZXJQYXRoLCBmYWxzZSkpO1xuICAgICAgd2lkZXJQYXRoLnRhaWwudmlzaXQod2lkZXJWaXNpdG9yLCBudWxsKTtcbiAgICAgIHJldHVybiB3aWRlclZpc2l0b3IucmVzdWx0IHx8IFtdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaXRvci5yZXN1bHQgfHwgW107XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGh0bWxOYW1lcyA9IGVsZW1lbnROYW1lcygpLmZpbHRlcihuYW1lID0+ICEobmFtZSBpbiBoaWRkZW5IdG1sRWxlbWVudHMpKTtcblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgY29uc3QgZGlyZWN0aXZlRWxlbWVudHMgPSBnZXRTZWxlY3RvcnMoaW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdG9ycy5tYXAoc2VsZWN0b3IgPT4gc2VsZWN0b3IuZWxlbWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihuYW1lID0+ICEhbmFtZSkgYXMgc3RyaW5nW107XG5cbiAgY29uc3QgY29tcG9uZW50cyA9IGRpcmVjdGl2ZUVsZW1lbnRzLm1hcChuYW1lID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xuICBjb25zdCBodG1sRWxlbWVudHMgPSBodG1sTmFtZXMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuRUxFTUVOVCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xuICBjb25zdCBhbmd1bGFyRWxlbWVudHMgPSBBTkdVTEFSX0VMRU1FTlRTLm1hcChuYW1lID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xuXG4gIC8vIFJldHVybiBjb21wb25lbnRzIGFuZCBodG1sIGVsZW1lbnRzXG4gIHJldHVybiB1bmlxdWVCeU5hbWUoWy4uLmh0bWxFbGVtZW50cywgLi4uY29tcG9uZW50cywgLi4uYW5ndWxhckVsZW1lbnRzXSk7XG59XG5cbi8qKlxuICogRmlsdGVyIHRoZSBzcGVjaWZpZWQgYGVudHJpZXNgIGJ5IHVuaXF1ZSBuYW1lLlxuICogQHBhcmFtIGVudHJpZXMgQ29tcGxldGlvbiBFbnRyaWVzXG4gKi9cbmZ1bmN0aW9uIHVuaXF1ZUJ5TmFtZShlbnRyaWVzOiBuZy5Db21wbGV0aW9uRW50cnlbXSkge1xuICBjb25zdCByZXN1bHRzID0gW107XG4gIGNvbnN0IHNldCA9IG5ldyBTZXQoKTtcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKCFzZXQuaGFzKGVudHJ5Lm5hbWUpKSB7XG4gICAgICBzZXQuYWRkKGVudHJ5Lm5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKGVudHJ5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVudGl0eUNvbXBsZXRpb25zKHZhbHVlOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGVudGl0eSBjb21wbGV0aW9uc1xuICBjb25zdCByZSA9IC8mW0EtWmEtel0qOz8oPyFcXGQpL2c7XG4gIGxldCBmb3VuZDogUmVnRXhwRXhlY0FycmF5fG51bGw7XG4gIGxldCByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIHdoaWxlIChmb3VuZCA9IHJlLmV4ZWModmFsdWUpKSB7XG4gICAgbGV0IGxlbiA9IGZvdW5kWzBdLmxlbmd0aDtcbiAgICBpZiAocG9zaXRpb24gPj0gZm91bmQuaW5kZXggJiYgcG9zaXRpb24gPCAoZm91bmQuaW5kZXggKyBsZW4pKSB7XG4gICAgICByZXN1bHQgPSBPYmplY3Qua2V5cyhOQU1FRF9FTlRJVElFUykubWFwKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5hbWU6IGAmJHtuYW1lfTtgLFxuICAgICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkVOVElUWSxcbiAgICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGludGVycG9sYXRpb25Db21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGFuIGludGVycG9sYXRpb24gaW4gYXQgdGhlIHBvc2l0aW9uLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbik7XG4gIGlmICghdGVtcGxhdGVQYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgIGluZm8sIHBvc2l0aW9uLCB1bmRlZmluZWQsXG4gICAgICAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pLCB0ZW1wbGF0ZVBhdGgsIGZhbHNlKSk7XG4gIHRlbXBsYXRlUGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICByZXR1cm4gdW5pcXVlQnlOYW1lKHZpc2l0b3IucmVzdWx0IHx8IFtdKTtcbn1cblxuLy8gVGhlcmUgaXMgYSBzcGVjaWFsIGNhc2Ugb2YgSFRNTCB3aGVyZSB0ZXh0IHRoYXQgY29udGFpbnMgYSB1bmNsb3NlZCB0YWcgaXMgdHJlYXRlZCBhc1xuLy8gdGV4dC4gRm9yIGV4YXBsZSAnPGgxPiBTb21lIDxhIHRleHQgPC9oMT4nIHByb2R1Y2VzIGEgdGV4dCBub2RlcyBpbnNpZGUgb2YgdGhlIEgxXG4vLyBlbGVtZW50IFwiU29tZSA8YSB0ZXh0XCIuIFdlLCBob3dldmVyLCB3YW50IHRvIHRyZWF0IHRoaXMgYXMgaWYgdGhlIHVzZXIgd2FzIHJlcXVlc3Rpbmdcbi8vIHRoZSBhdHRyaWJ1dGVzIG9mIGFuIFwiYVwiIGVsZW1lbnQsIG5vdCByZXF1ZXN0aW5nIGNvbXBsZXRpb24gaW4gdGhlIGEgdGV4dCBlbGVtZW50LiBUaGlzXG4vLyBjb2RlIGNoZWNrcyBmb3IgdGhpcyBjYXNlIGFuZCByZXR1cm5zIGVsZW1lbnQgY29tcGxldGlvbnMgaWYgaXQgaXMgZGV0ZWN0ZWQgb3IgdW5kZWZpbmVkXG4vLyBpZiBpdCBpcyBub3QuXG5mdW5jdGlvbiB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgdGFpbCA9IHBhdGgudGFpbDtcbiAgaWYgKHRhaWwgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgY29uc3QgbWF0Y2ggPSB0YWlsLnZhbHVlLm1hdGNoKC88KFxcdyhcXHd8XFxkfC0pKjopPyhcXHcoXFx3fFxcZHwtKSopXFxzLyk7XG4gICAgLy8gVGhlIHBvc2l0aW9uIG11c3QgYmUgYWZ0ZXIgdGhlIG1hdGNoLCBvdGhlcndpc2Ugd2UgYXJlIHN0aWxsIGluIGEgcGxhY2Ugd2hlcmUgZWxlbWVudHNcbiAgICAvLyBhcmUgZXhwZWN0ZWQgKHN1Y2ggYXMgYDx8YWAgb3IgYDxhfGA7IHdlIG9ubHkgd2FudCBhdHRyaWJ1dGVzIGZvciBgPGEgfGAgb3IgYWZ0ZXIpLlxuICAgIGlmIChtYXRjaCAmJlxuICAgICAgICBwYXRoLnBvc2l0aW9uID49IChtYXRjaC5pbmRleCB8fCAwKSArIG1hdGNoWzBdLmxlbmd0aCArIHRhaWwuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpIHtcbiAgICAgIHJldHVybiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoaW5mbywgbWF0Y2hbM10pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbmNsYXNzIEV4cHJlc3Npb25WaXNpdG9yIGV4dGVuZHMgTnVsbFRlbXBsYXRlVmlzaXRvciB7XG4gIHByaXZhdGUgZ2V0RXhwcmVzc2lvblNjb3BlOiAoKSA9PiBuZy5TeW1ib2xUYWJsZTtcbiAgcmVzdWx0OiBuZy5Db21wbGV0aW9uRW50cnlbXXx1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluZm86IEFzdFJlc3VsdCwgcHJpdmF0ZSBwb3NpdGlvbjogbnVtYmVyLCBwcml2YXRlIGF0dHI/OiBBdHRyaWJ1dGUsXG4gICAgICBnZXRFeHByZXNzaW9uU2NvcGU/OiAoKSA9PiBuZy5TeW1ib2xUYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUgPSBnZXRFeHByZXNzaW9uU2NvcGUgfHwgKCgpID0+IGluZm8udGVtcGxhdGUubWVtYmVycyk7XG4gIH1cblxuICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0OiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRFdmVudChhc3Q6IEJvdW5kRXZlbnRBc3QpOiB2b2lkIHsgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGFzdC5oYW5kbGVyKTsgfVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hdHRyICYmIGdldFNlbGVjdG9ycyh0aGlzLmluZm8pICYmIHRoaXMuYXR0ci5uYW1lLnN0YXJ0c1dpdGgoVEVNUExBVEVfQVRUUl9QUkVGSVgpKSB7XG4gICAgICAvLyBUaGUgdmFsdWUgaXMgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGJ1dCB0aGUgZXhwcmVzc2lvbiBBU1Qgd2FzIG5vdCBwcm9kdWNlZCB3aGVuIHRoZVxuICAgICAgLy8gVGVtcGxhdGVBc3Qgd2FzIHByb2R1Y2Ugc29cbiAgICAgIC8vIGRvIHRoYXQgbm93LlxuXG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmF0dHIubmFtZS5zdWJzdHIoVEVNUExBVEVfQVRUUl9QUkVGSVgubGVuZ3RoKTtcblxuICAgICAgLy8gRmluZCB0aGUgc2VsZWN0b3JcbiAgICAgIGNvbnN0IHNlbGVjdG9ySW5mbyA9IGdldFNlbGVjdG9ycyh0aGlzLmluZm8pO1xuICAgICAgY29uc3Qgc2VsZWN0b3JzID0gc2VsZWN0b3JJbmZvLnNlbGVjdG9ycztcbiAgICAgIGNvbnN0IHNlbGVjdG9yID1cbiAgICAgICAgICBzZWxlY3RvcnMuZmlsdGVyKHMgPT4gcy5hdHRycy5zb21lKChhdHRyLCBpKSA9PiBpICUgMiA9PT0gMCAmJiBhdHRyID09PSBrZXkpKVswXTtcblxuICAgICAgY29uc3QgdGVtcGxhdGVCaW5kaW5nUmVzdWx0ID1cbiAgICAgICAgICB0aGlzLmluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZVRlbXBsYXRlQmluZGluZ3Moa2V5LCB0aGlzLmF0dHIudmFsdWUsIG51bGwsIDApO1xuXG4gICAgICAvLyBmaW5kIHRoZSB0ZW1wbGF0ZSBiaW5kaW5nIHRoYXQgY29udGFpbnMgdGhlIHBvc2l0aW9uXG4gICAgICBpZiAoIXRoaXMuYXR0ci52YWx1ZVNwYW4pIHJldHVybjtcbiAgICAgIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IGJpbmRpbmdzID0gdGVtcGxhdGVCaW5kaW5nUmVzdWx0LnRlbXBsYXRlQmluZGluZ3M7XG4gICAgICBjb25zdCBiaW5kaW5nID1cbiAgICAgICAgICBiaW5kaW5ncy5maW5kKFxuICAgICAgICAgICAgICBiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB8fFxuICAgICAgICAgIGJpbmRpbmdzLmZpbmQoYmluZGluZyA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLnNwYW4pKTtcblxuICAgICAgY29uc3Qga2V5Q29tcGxldGlvbnMgPSAoKSA9PiB7XG4gICAgICAgIGxldCBrZXlzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBjb25zdCBhdHRyTmFtZXMgPSBzZWxlY3Rvci5hdHRycy5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09PSAwKTtcbiAgICAgICAgICBrZXlzID0gYXR0ck5hbWVzLmZpbHRlcihuYW1lID0+IG5hbWUuc3RhcnRzV2l0aChrZXkpICYmIG5hbWUgIT0ga2V5KVxuICAgICAgICAgICAgICAgICAgICAgLm1hcChuYW1lID0+IGxvd2VyTmFtZShuYW1lLnN1YnN0cihrZXkubGVuZ3RoKSkpO1xuICAgICAgICB9XG4gICAgICAgIGtleXMucHVzaCgnbGV0Jyk7XG4gICAgICAgIHRoaXMucmVzdWx0ID0ga2V5cy5tYXAoa2V5ID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuS0VZLFxuICAgICAgICAgICAgc29ydFRleHQ6IGtleSxcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghYmluZGluZyB8fCAoYmluZGluZy5rZXkgPT09IGtleSAmJiAhYmluZGluZy5leHByZXNzaW9uKSkge1xuICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIHJvb3QgYmluZGluZy4gV2Ugc2hvdWxkIHJldHVybiBgbGV0YCBhbmQga2V5cyB0aGF0IGFyZSBsZWZ0IGluIHRoZVxuICAgICAgICAvLyBzZWxlY3Rvci5cbiAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgIH0gZWxzZSBpZiAoYmluZGluZy5rZXlJc1Zhcikge1xuICAgICAgICBjb25zdCBlcXVhbExvY2F0aW9uID0gdGhpcy5hdHRyLnZhbHVlLmluZGV4T2YoJz0nKTtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBbXTtcbiAgICAgICAgaWYgKGVxdWFsTG9jYXRpb24gPj0gMCAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPj0gZXF1YWxMb2NhdGlvbikge1xuICAgICAgICAgIC8vIFdlIGFyZSBhZnRlciB0aGUgJz0nIGluIGEgbGV0IGNsYXVzZS4gVGhlIHZhbGlkIHZhbHVlcyBoZXJlIGFyZSB0aGUgbWVtYmVycyBvZiB0aGVcbiAgICAgICAgICAvLyB0ZW1wbGF0ZSByZWZlcmVuY2UncyB0eXBlIHBhcmFtZXRlci5cbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVNZXRhZGF0YSA9IHNlbGVjdG9ySW5mby5tYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRleHRUYWJsZSA9XG4gICAgICAgICAgICAgICAgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFRlbXBsYXRlQ29udGV4dChkaXJlY3RpdmVNZXRhZGF0YS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dFRhYmxlKSB7XG4gICAgICAgICAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhjb250ZXh0VGFibGUudmFsdWVzKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChiaW5kaW5nLmtleSAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPD0gKGJpbmRpbmcua2V5Lmxlbmd0aCAtIGtleS5sZW5ndGgpKSB7XG4gICAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlIHBvc2l0aW9uIGlzIGluIHRoZSBleHByZXNzaW9uIG9yIGFmdGVyIHRoZSBrZXkgb3IgdGhlcmUgaXMgbm8ga2V5LCByZXR1cm4gdGhlXG4gICAgICAgIC8vIGV4cHJlc3Npb24gY29tcGxldGlvbnNcbiAgICAgICAgaWYgKChiaW5kaW5nLmV4cHJlc3Npb24gJiYgaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5leHByZXNzaW9uLmFzdC5zcGFuKSkgfHxcbiAgICAgICAgICAgIChiaW5kaW5nLmtleSAmJlxuICAgICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+IGJpbmRpbmcuc3Bhbi5zdGFydCArIChiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSkgfHxcbiAgICAgICAgICAgICFiaW5kaW5nLmtleSkge1xuICAgICAgICAgIGNvbnN0IHNwYW4gPSBuZXcgUGFyc2VTcGFuKDAsIHRoaXMuYXR0ci52YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoXG4gICAgICAgICAgICAgIGJpbmRpbmcuZXhwcmVzc2lvbiA/IGJpbmRpbmcuZXhwcmVzc2lvbi5hc3QgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUHJvcGVydHlSZWFkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Bhbiwgc3Bhbi50b0Fic29sdXRlKG9mZnNldCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSW1wbGljaXRSZWNlaXZlcihzcGFuLCBzcGFuLnRvQWJzb2x1dGUob2Zmc2V0KSksICcnKSxcbiAgICAgICAgICAgICAgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlDb21wbGV0aW9ucygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpIHtcbiAgICBjb25zdCBleHByZXNzaW9uUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGlmIChpblNwYW4oZXhwcmVzc2lvblBvc2l0aW9uLCBhc3QudmFsdWUuc3BhbikpIHtcbiAgICAgIGNvbnN0IGNvbXBsZXRpb25zID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIGFzdC52YWx1ZSwgZXhwcmVzc2lvblBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgaWYgKGNvbXBsZXRpb25zKSB7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHZhbHVlOiBBU1QsIHBvc2l0aW9uPzogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgdmFsdWUsXG4gICAgICAgIHBvc2l0aW9uID09PSB1bmRlZmluZWQgPyB0aGlzLmF0dHJpYnV0ZVZhbHVlUG9zaXRpb24gOiBwb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLnN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogbmcuU3ltYm9sW10pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gICAgcmV0dXJuIHN5bWJvbHMuZmlsdGVyKHMgPT4gIXMubmFtZS5zdGFydHNXaXRoKCdfXycpICYmIHMucHVibGljKS5tYXAoc3ltYm9sID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICBraW5kOiBzeW1ib2wua2luZCBhcyBuZy5Db21wbGV0aW9uS2luZCxcbiAgICAgICAgc29ydFRleHQ6IHN5bWJvbC5uYW1lLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGF0dHJpYnV0ZVZhbHVlUG9zaXRpb24oKSB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiB0aGlzLmF0dHIudmFsdWVTcGFuKSB7XG4gICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbiAtIHRoaXMuYXR0ci52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VUZXh0KHRlbXBsYXRlOiBuZy5UZW1wbGF0ZVNvdXJjZSwgc3BhbjogbmcuU3Bhbik6IHN0cmluZyB7XG4gIHJldHVybiB0ZW1wbGF0ZS5zb3VyY2Uuc3Vic3RyaW5nKHNwYW4uc3RhcnQsIHNwYW4uZW5kKTtcbn1cblxuY29uc3QgdGVtcGxhdGVBdHRyID0gL14oXFx3KzopPyh0ZW1wbGF0ZSR8XlxcKikvO1xuZnVuY3Rpb24gY3JlYXRlRWxlbWVudENzc1NlbGVjdG9yKGVsZW1lbnQ6IEVsZW1lbnQpOiBDc3NTZWxlY3RvciB7XG4gIGNvbnN0IGNzc1NlbGVjdG9yID0gbmV3IENzc1NlbGVjdG9yKCk7XG4gIGNvbnN0IGVsTmFtZU5vTnMgPSBzcGxpdE5zTmFtZShlbGVtZW50Lm5hbWUpWzFdO1xuXG4gIGNzc1NlbGVjdG9yLnNldEVsZW1lbnQoZWxOYW1lTm9Ocyk7XG5cbiAgZm9yIChjb25zdCBhdHRyIG9mIGVsZW1lbnQuYXR0cnMpIHtcbiAgICBpZiAoIWF0dHIubmFtZS5tYXRjaCh0ZW1wbGF0ZUF0dHIpKSB7XG4gICAgICBjb25zdCBbXywgYXR0ck5hbWVOb05zXSA9IHNwbGl0TnNOYW1lKGF0dHIubmFtZSk7XG4gICAgICBjc3NTZWxlY3Rvci5hZGRBdHRyaWJ1dGUoYXR0ck5hbWVOb05zLCBhdHRyLnZhbHVlKTtcbiAgICAgIGlmIChhdHRyLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2NsYXNzJykge1xuICAgICAgICBjb25zdCBjbGFzc2VzID0gYXR0ci52YWx1ZS5zcGxpdCgvcysvZyk7XG4gICAgICAgIGNsYXNzZXMuZm9yRWFjaChjbGFzc05hbWUgPT4gY3NzU2VsZWN0b3IuYWRkQ2xhc3NOYW1lKGNsYXNzTmFtZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gY3NzU2VsZWN0b3I7XG59XG5cbmZ1bmN0aW9uIGxvd2VyTmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gbmFtZSAmJiAobmFtZVswXS50b0xvd2VyQ2FzZSgpICsgbmFtZS5zdWJzdHIoMSkpO1xufVxuXG5mdW5jdGlvbiBhbmd1bGFyQXR0cmlidXRlcyhpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBjb25zdCB0ZW1wbGF0ZVJlZnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3RoZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgJiYgc2VsZWN0b3IuZWxlbWVudCAhPT0gZWxlbWVudE5hbWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBzdW1tYXJ5ID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKSAhO1xuICAgIGZvciAoY29uc3QgYXR0ciBvZiBzZWxlY3Rvci5hdHRycykge1xuICAgICAgaWYgKGF0dHIpIHtcbiAgICAgICAgaWYgKGhhc1RlbXBsYXRlUmVmZXJlbmNlKHN1bW1hcnkudHlwZSkpIHtcbiAgICAgICAgICB0ZW1wbGF0ZVJlZnMuYWRkKGF0dHIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG90aGVycy5hZGQoYXR0cik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkuaW5wdXRzKSkge1xuICAgICAgaW5wdXRzLmFkZChpbnB1dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5vdXRwdXRzKSkge1xuICAgICAgb3V0cHV0cy5hZGQob3V0cHV0KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgdGVtcGxhdGVSZWZzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGAqJHtuYW1lfWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5wdXRzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGBbJHtuYW1lfV1gLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gICAgLy8gQWRkIGJhbmFuYS1pbi1hLWJveCBzeW50YXhcbiAgICAvLyBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtc3ludGF4I3R3by13YXktYmluZGluZy1cbiAgICBpZiAob3V0cHV0cy5oYXMoYCR7bmFtZX1DaGFuZ2VgKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZTogYFsoJHtuYW1lfSldYCxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3V0cHV0cykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBvdGhlcnMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuIl19