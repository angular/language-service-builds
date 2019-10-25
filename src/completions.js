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
        define("@angular/language-service/src/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/expressions", "@angular/language-service/src/html_info", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var html_info_1 = require("@angular/language-service/src/html_info");
    var template_1 = require("@angular/language-service/src/template");
    var ng = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    var TEMPLATE_ATTR_PREFIX = '*';
    var HIDDEN_HTML_ELEMENTS = new Set(['html', 'script', 'noscript', 'base', 'body', 'title', 'head', 'link']);
    var HTML_ELEMENTS = html_info_1.elementNames().filter(function (name) { return !HIDDEN_HTML_ELEMENTS.has(name); }).map(function (name) {
        return {
            name: name,
            kind: ng.CompletionKind.HTML_ELEMENT,
            sortText: name,
        };
    });
    var ANGULAR_ELEMENTS = [
        {
            name: 'ng-container',
            kind: ng.CompletionKind.ANGULAR_ELEMENT,
            sortText: 'ng-container',
        },
        {
            name: 'ng-content',
            kind: ng.CompletionKind.ANGULAR_ELEMENT,
            sortText: 'ng-content',
        },
        {
            name: 'ng-template',
            kind: ng.CompletionKind.ANGULAR_ELEMENT,
            sortText: 'ng-template',
        },
    ];
    function getTemplateCompletions(templateInfo, position) {
        var result = [];
        var htmlAst = templateInfo.htmlAst, template = templateInfo.template;
        // The templateNode starts at the delimiter character so we add 1 to skip it.
        var templatePosition = position - template.span.start;
        var path = compiler_1.findNode(htmlAst, templatePosition);
        var mostSpecific = path.tail;
        if (path.empty || !mostSpecific) {
            result = elementCompletions(templateInfo);
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
                        result = elementCompletions(templateInfo);
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
                                result = elementCompletions(templateInfo);
                            }
                        }
                    }
                    else {
                        // If no element container, implies parsable data so show elements.
                        result = voidElementAttributeCompletions(templateInfo, path);
                        if (!result.length) {
                            result = elementCompletions(templateInfo);
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
        if (info.template instanceof template_1.InlineTemplate) {
            try {
                // Provide HTML attributes completion only for inline templates
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
    function elementCompletions(info) {
        var e_4, _a;
        var results = tslib_1.__spread(ANGULAR_ELEMENTS);
        if (info.template instanceof template_1.InlineTemplate) {
            // Provide HTML elements completion only for inline templates
            results.push.apply(results, tslib_1.__spread(HTML_ELEMENTS));
        }
        // Collect the elements referenced by the selectors
        var components = new Set();
        try {
            for (var _b = tslib_1.__values(utils_1.getSelectors(info).selectors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var selector = _c.value;
                var name_4 = selector.element;
                if (name_4 && !components.has(name_4)) {
                    components.add(name_4);
                    results.push({
                        name: name_4,
                        kind: ng.CompletionKind.COMPONENT,
                        sortText: name_4,
                    });
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return results;
    }
    /**
     * Filter the specified `entries` by unique name.
     * @param entries Completion Entries
     */
    function uniqueByName(entries) {
        var e_5, _a;
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
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) _a.call(entries_1);
            }
            finally { if (e_5) throw e_5.error; }
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
                            new compiler_1.PropertyRead(span, span.toAbsolute(offset), new compiler_1.ImplicitReceiver(span, span.toAbsolute(offset)), ''), this.position);
                    }
                    else {
                        keyCompletions();
                    }
                }
            }
        };
        ExpressionVisitor.prototype.visitBoundText = function (ast) {
            if (utils_1.inSpan(this.position, ast.value.sourceSpan)) {
                var completions = expressions_1.getExpressionCompletions(this.getExpressionScope(), ast.value, this.position, this.info.template.query);
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
                    return this.position;
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
                var name_5 = templateRefs_1_1.value;
                results.push({
                    name: "*" + name_5,
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_5,
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
                var name_6 = inputs_1_1.value;
                results.push({
                    name: "[" + name_6 + "]",
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_6,
                });
                // Add banana-in-a-box syntax
                // https://angular.io/guide/template-syntax#two-way-binding-
                if (outputs.has(name_6 + "Change")) {
                    results.push({
                        name: "[(" + name_6 + ")]",
                        kind: ng.CompletionKind.ATTRIBUTE,
                        sortText: name_6,
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
                var name_7 = outputs_1_1.value;
                results.push({
                    name: "(" + name_7 + ")",
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_7,
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
                var name_8 = others_1_1.value;
                results.push({
                    name: name_8,
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_8,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdVQ7SUFDdlQsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsbUVBQTBDO0lBQzFDLHdEQUE4QjtJQUM5Qiw2REFBOEg7SUFFOUgsSUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FDdEIsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNyRixJQUFNLGFBQWEsR0FDZix3QkFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO1FBQ3JFLE9BQU87WUFDTCxJQUFJLE1BQUE7WUFDSixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZO1lBQ3BDLFFBQVEsRUFBRSxJQUFJO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ1AsSUFBTSxnQkFBZ0IsR0FBc0M7UUFDMUQ7WUFDRSxJQUFJLEVBQUUsY0FBYztZQUNwQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxjQUFjO1NBQ3pCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsWUFBWTtZQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxZ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ZixDQUFDLENBQUM7Z0JBQ0gsNkJBQTZCO2dCQUM3Qiw0REFBNEQ7Z0JBQzVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBSSxNQUFJLFdBQVEsQ0FBQyxFQUFFO29CQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNYLElBQUksRUFBRSxPQUFLLE1BQUksT0FBSTt3QkFDbkIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUzt3QkFDakMsUUFBUSxFQUFFLE1BQUk7cUJBQ2YsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7Ozs7Ozs7Ozs7WUFDRCxLQUFtQixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO2dCQUF2QixJQUFNLE1BQUksb0JBQUE7Z0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLEVBQUUsTUFBSSxNQUFJLE1BQUc7b0JBQ2pCLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVM7b0JBQ2pDLFFBQVEsRUFBRSxNQUFJO2lCQUNmLENBQUMsQ0FBQzthQUNKOzs7Ozs7Ozs7O1lBQ0QsS0FBbUIsSUFBQSxXQUFBLGlCQUFBLE1BQU0sQ0FBQSw4QkFBQSxrREFBRTtnQkFBdEIsSUFBTSxNQUFJLG1CQUFBO2dCQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxRQUFBO29CQUNKLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVM7b0JBQ2pDLFFBQVEsRUFBRSxNQUFJO2lCQUNmLENBQUMsQ0FBQzthQUNKOzs7Ozs7Ozs7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0UGF0aCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQm91bmRUZXh0QXN0LCBFbGVtZW50LCBFbGVtZW50QXN0LCBJbXBsaWNpdFJlY2VpdmVyLCBOQU1FRF9FTlRJVElFUywgTm9kZSBhcyBIdG1sQXN0LCBOdWxsVGVtcGxhdGVWaXNpdG9yLCBQYXJzZVNwYW4sIFByb3BlcnR5UmVhZCwgVGFnQ29udGVudFR5cGUsIFRleHQsIGZpbmROb2RlLCBnZXRIdG1sVGFnRGVmaW5pdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU2NvcGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uQ29tcGxldGlvbnN9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHthdHRyaWJ1dGVOYW1lcywgZWxlbWVudE5hbWVzLCBldmVudE5hbWVzLCBwcm9wZXJ0eU5hbWVzfSBmcm9tICcuL2h0bWxfaW5mbyc7XG5pbXBvcnQge0lubGluZVRlbXBsYXRlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRUZW1wbGF0ZUFzdEF0LCBnZXRTZWxlY3RvcnMsIGhhc1RlbXBsYXRlUmVmZXJlbmNlLCBpblNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IFRFTVBMQVRFX0FUVFJfUFJFRklYID0gJyonO1xuY29uc3QgSElEREVOX0hUTUxfRUxFTUVOVFM6IFJlYWRvbmx5U2V0PHN0cmluZz4gPVxuICAgIG5ldyBTZXQoWydodG1sJywgJ3NjcmlwdCcsICdub3NjcmlwdCcsICdiYXNlJywgJ2JvZHknLCAndGl0bGUnLCAnaGVhZCcsICdsaW5rJ10pO1xuY29uc3QgSFRNTF9FTEVNRU5UUzogUmVhZG9ubHlBcnJheTxuZy5Db21wbGV0aW9uRW50cnk+ID1cbiAgICBlbGVtZW50TmFtZXMoKS5maWx0ZXIobmFtZSA9PiAhSElEREVOX0hUTUxfRUxFTUVOVFMuaGFzKG5hbWUpKS5tYXAobmFtZSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0VMRU1FTlQsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfTtcbiAgICB9KTtcbmNvbnN0IEFOR1VMQVJfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9IFtcbiAge1xuICAgIG5hbWU6ICduZy1jb250YWluZXInLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRhaW5lcicsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGVudCcsXG4gICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQU5HVUxBUl9FTEVNRU5ULFxuICAgIHNvcnRUZXh0OiAnbmctY29udGVudCcsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctdGVtcGxhdGUnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLXRlbXBsYXRlJyxcbiAgfSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKFxuICAgIHRlbXBsYXRlSW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBsZXQgcmVzdWx0OiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBjb25zdCB7aHRtbEFzdCwgdGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICAvLyBUaGUgdGVtcGxhdGVOb2RlIHN0YXJ0cyBhdCB0aGUgZGVsaW1pdGVyIGNoYXJhY3RlciBzbyB3ZSBhZGQgMSB0byBza2lwIGl0LlxuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZmluZE5vZGUoaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IG1vc3RTcGVjaWZpYyA9IHBhdGgudGFpbDtcbiAgaWYgKHBhdGguZW1wdHkgfHwgIW1vc3RTcGVjaWZpYykge1xuICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFzdFBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIG1vc3RTcGVjaWZpYy5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBtb3N0U3BlY2lmaWMudmlzaXQoXG4gICAgICAgIHtcbiAgICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydFRhZ1NwYW4gPSBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgY29uc3QgdGFnTGVuID0gYXN0Lm5hbWUubGVuZ3RoO1xuICAgICAgICAgICAgLy8gKyAxIGZvciB0aGUgb3BlbmluZyBhbmdsZSBicmFja2V0XG4gICAgICAgICAgICBpZiAodGVtcGxhdGVQb3NpdGlvbiA8PSBzdGFydFRhZ1NwYW4uc3RhcnQgKyB0YWdMZW4gKyAxKSB7XG4gICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBpbiB0aGUgdGFnIHRoZW4gcmV0dXJuIHRoZSBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA8IHN0YXJ0VGFnU3Bhbi5lbmQpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0QXR0cmlidXRlKGFzdCkge1xuICAgICAgICAgICAgaWYgKCFhc3QudmFsdWVTcGFuIHx8ICFpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIG5hbWUgb2YgYW4gYXR0cmlidXRlLiBTaG93IGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlU3BhbiAmJiBpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbiwgYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0VGV4dChhc3QpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBpbiBhIGVudGl0eS5cbiAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29udGVudFR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlBBUlNBQkxFX0RBVEEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBjYW4gaG9sZCBjb250ZW50LCBzaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIElmIG5vIGVsZW1lbnQgY29udGFpbmVyLCBpbXBsaWVzIHBhcnNhYmxlIGRhdGEgc28gc2hvdyBlbGVtZW50cy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRDb21tZW50KGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb24oYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0KSB7fVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGl0ZW0gPSBwYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50ID8gcGF0aC50YWlsIDogcGF0aC5wYXJlbnRPZihwYXRoLnRhaWwpO1xuICBpZiAoaXRlbSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIGl0ZW0ubmFtZSk7XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgYXR0cmlidXRlcyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgYXR0cmlidXRlTmFtZXMoZWxlbWVudE5hbWUpKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0FUVFJJQlVURSxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgaHRtbCBwcm9wZXJ0aWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBwcm9wZXJ0eU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgWyR7bmFtZX1dYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIGh0bWwgZXZlbnRzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBldmVudE5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIEFuZ3VsYXIgYXR0cmlidXRlc1xuICByZXN1bHRzLnB1c2goLi4uYW5ndWxhckF0dHJpYnV0ZXMoaW5mbywgZWxlbWVudE5hbWUpKTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGF0dHI6IEF0dHJpYnV0ZSk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCFwYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gIGNvbnN0IHZpc2l0b3IgPVxuICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKGluZm8sIHBvc2l0aW9uLCBhdHRyLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgsIGZhbHNlKSk7XG4gIHBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgaWYgKCF2aXNpdG9yLnJlc3VsdCB8fCAhdmlzaXRvci5yZXN1bHQubGVuZ3RoKSB7XG4gICAgLy8gVHJ5IGFsbHdvaW5nIHdpZGVuaW5nIHRoZSBwYXRoXG4gICAgY29uc3Qgd2lkZXJQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24sIC8qIGFsbG93V2lkZW5pbmcgKi8gdHJ1ZSk7XG4gICAgaWYgKHdpZGVyUGF0aC50YWlsKSB7XG4gICAgICBjb25zdCB3aWRlclZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICAgICAgaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgd2lkZXJQYXRoLCBmYWxzZSkpO1xuICAgICAgd2lkZXJQYXRoLnRhaWwudmlzaXQod2lkZXJWaXNpdG9yLCBudWxsKTtcbiAgICAgIHJldHVybiB3aWRlclZpc2l0b3IucmVzdWx0IHx8IFtdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaXRvci5yZXN1bHQgfHwgW107XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gWy4uLkFOR1VMQVJfRUxFTUVOVFNdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgZWxlbWVudHMgY29tcGxldGlvbiBvbmx5IGZvciBpbmxpbmUgdGVtcGxhdGVzXG4gICAgcmVzdWx0cy5wdXNoKC4uLkhUTUxfRUxFTUVOVFMpO1xuICB9XG5cbiAgLy8gQ29sbGVjdCB0aGUgZWxlbWVudHMgcmVmZXJlbmNlZCBieSB0aGUgc2VsZWN0b3JzXG4gIGNvbnN0IGNvbXBvbmVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBnZXRTZWxlY3RvcnMoaW5mbykuc2VsZWN0b3JzKSB7XG4gICAgY29uc3QgbmFtZSA9IHNlbGVjdG9yLmVsZW1lbnQ7XG4gICAgaWYgKG5hbWUgJiYgIWNvbXBvbmVudHMuaGFzKG5hbWUpKSB7XG4gICAgICBjb21wb25lbnRzLmFkZChuYW1lKTtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBGaWx0ZXIgdGhlIHNwZWNpZmllZCBgZW50cmllc2AgYnkgdW5pcXVlIG5hbWUuXG4gKiBAcGFyYW0gZW50cmllcyBDb21wbGV0aW9uIEVudHJpZXNcbiAqL1xuZnVuY3Rpb24gdW5pcXVlQnlOYW1lKGVudHJpZXM6IG5nLkNvbXBsZXRpb25FbnRyeVtdKSB7XG4gIGNvbnN0IHJlc3VsdHMgPSBbXTtcbiAgY29uc3Qgc2V0ID0gbmV3IFNldCgpO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoIXNldC5oYXMoZW50cnkubmFtZSkpIHtcbiAgICAgIHNldC5hZGQoZW50cnkubmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goZW50cnkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZW50aXR5Q29tcGxldGlvbnModmFsdWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgd2hpbGUgKGZvdW5kID0gcmUuZXhlYyh2YWx1ZSkpIHtcbiAgICBsZXQgbGVuID0gZm91bmRbMF0ubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+PSBmb3VuZC5pbmRleCAmJiBwb3NpdGlvbiA8IChmb3VuZC5pbmRleCArIGxlbikpIHtcbiAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKE5BTUVEX0VOVElUSUVTKS5tYXAobmFtZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogYCYke25hbWV9O2AsXG4gICAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuRU5USVRZLFxuICAgICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgYW4gaW50ZXJwb2xhdGlvbiBpbiBhdCB0aGUgcG9zaXRpb24uXG4gIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCF0ZW1wbGF0ZVBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgaW5mbywgcG9zaXRpb24sIHVuZGVmaW5lZCxcbiAgICAgICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyksIHRlbXBsYXRlUGF0aCwgZmFsc2UpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB1bmlxdWVCeU5hbWUodmlzaXRvci5yZXN1bHQgfHwgW10pO1xufVxuXG4vLyBUaGVyZSBpcyBhIHNwZWNpYWwgY2FzZSBvZiBIVE1MIHdoZXJlIHRleHQgdGhhdCBjb250YWlucyBhIHVuY2xvc2VkIHRhZyBpcyB0cmVhdGVkIGFzXG4vLyB0ZXh0LiBGb3IgZXhhcGxlICc8aDE+IFNvbWUgPGEgdGV4dCA8L2gxPicgcHJvZHVjZXMgYSB0ZXh0IG5vZGVzIGluc2lkZSBvZiB0aGUgSDFcbi8vIGVsZW1lbnQgXCJTb21lIDxhIHRleHRcIi4gV2UsIGhvd2V2ZXIsIHdhbnQgdG8gdHJlYXQgdGhpcyBhcyBpZiB0aGUgdXNlciB3YXMgcmVxdWVzdGluZ1xuLy8gdGhlIGF0dHJpYnV0ZXMgb2YgYW4gXCJhXCIgZWxlbWVudCwgbm90IHJlcXVlc3RpbmcgY29tcGxldGlvbiBpbiB0aGUgYSB0ZXh0IGVsZW1lbnQuIFRoaXNcbi8vIGNvZGUgY2hlY2tzIGZvciB0aGlzIGNhc2UgYW5kIHJldHVybnMgZWxlbWVudCBjb21wbGV0aW9ucyBpZiBpdCBpcyBkZXRlY3RlZCBvciB1bmRlZmluZWRcbi8vIGlmIGl0IGlzIG5vdC5cbmZ1bmN0aW9uIHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnMoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsO1xuICBpZiAodGFpbCBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRhaWwudmFsdWUubWF0Y2goLzwoXFx3KFxcd3xcXGR8LSkqOik/KFxcdyhcXHd8XFxkfC0pKilcXHMvKTtcbiAgICAvLyBUaGUgcG9zaXRpb24gbXVzdCBiZSBhZnRlciB0aGUgbWF0Y2gsIG90aGVyd2lzZSB3ZSBhcmUgc3RpbGwgaW4gYSBwbGFjZSB3aGVyZSBlbGVtZW50c1xuICAgIC8vIGFyZSBleHBlY3RlZCAoc3VjaCBhcyBgPHxhYCBvciBgPGF8YDsgd2Ugb25seSB3YW50IGF0dHJpYnV0ZXMgZm9yIGA8YSB8YCBvciBhZnRlcikuXG4gICAgaWYgKG1hdGNoICYmXG4gICAgICAgIHBhdGgucG9zaXRpb24gPj0gKG1hdGNoLmluZGV4IHx8IDApICsgbWF0Y2hbMF0ubGVuZ3RoICsgdGFpbC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBtYXRjaFszXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBOdWxsVGVtcGxhdGVWaXNpdG9yIHtcbiAgcHJpdmF0ZSBnZXRFeHByZXNzaW9uU2NvcGU6ICgpID0+IG5nLlN5bWJvbFRhYmxlO1xuICByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdfHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHBvc2l0aW9uOiBudW1iZXIsIHByaXZhdGUgYXR0cj86IEF0dHJpYnV0ZSxcbiAgICAgIGdldEV4cHJlc3Npb25TY29wZT86ICgpID0+IG5nLlN5bWJvbFRhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSA9IGdldEV4cHJlc3Npb25TY29wZSB8fCAoKCkgPT4gaW5mby50ZW1wbGF0ZS5tZW1iZXJzKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmF0dHIgJiYgZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbykgJiYgdGhpcy5hdHRyLm5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCkpIHtcbiAgICAgIC8vIFRoZSB2YWx1ZSBpcyBhIHRlbXBsYXRlIGV4cHJlc3Npb24gYnV0IHRoZSBleHByZXNzaW9uIEFTVCB3YXMgbm90IHByb2R1Y2VkIHdoZW4gdGhlXG4gICAgICAvLyBUZW1wbGF0ZUFzdCB3YXMgcHJvZHVjZSBzb1xuICAgICAgLy8gZG8gdGhhdCBub3cuXG5cbiAgICAgIGNvbnN0IGtleSA9IHRoaXMuYXR0ci5uYW1lLnN1YnN0cihURU1QTEFURV9BVFRSX1BSRUZJWC5sZW5ndGgpO1xuXG4gICAgICAvLyBGaW5kIHRoZSBzZWxlY3RvclxuICAgICAgY29uc3Qgc2VsZWN0b3JJbmZvID0gZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbyk7XG4gICAgICBjb25zdCBzZWxlY3RvcnMgPSBzZWxlY3RvckluZm8uc2VsZWN0b3JzO1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPVxuICAgICAgICAgIHNlbGVjdG9ycy5maWx0ZXIocyA9PiBzLmF0dHJzLnNvbWUoKGF0dHIsIGkpID0+IGkgJSAyID09PSAwICYmIGF0dHIgPT09IGtleSkpWzBdO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUJpbmRpbmdSZXN1bHQgPVxuICAgICAgICAgIHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhrZXksIHRoaXMuYXR0ci52YWx1ZSwgbnVsbCwgMCk7XG5cbiAgICAgIC8vIGZpbmQgdGhlIHRlbXBsYXRlIGJpbmRpbmcgdGhhdCBjb250YWlucyB0aGUgcG9zaXRpb25cbiAgICAgIGlmICghdGhpcy5hdHRyLnZhbHVlU3BhbikgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIHRoaXMuYXR0ci52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgY29uc3QgYmluZGluZ3MgPSB0ZW1wbGF0ZUJpbmRpbmdSZXN1bHQudGVtcGxhdGVCaW5kaW5ncztcbiAgICAgIGNvbnN0IGJpbmRpbmcgPVxuICAgICAgICAgIGJpbmRpbmdzLmZpbmQoXG4gICAgICAgICAgICAgIGJpbmRpbmcgPT4gaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5zcGFuLCAvKiBleGNsdXNpdmUgKi8gdHJ1ZSkpIHx8XG4gICAgICAgICAgYmluZGluZ3MuZmluZChiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbikpO1xuXG4gICAgICBjb25zdCBrZXlDb21wbGV0aW9ucyA9ICgpID0+IHtcbiAgICAgICAgbGV0IGtleXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgIGNvbnN0IGF0dHJOYW1lcyA9IHNlbGVjdG9yLmF0dHJzLmZpbHRlcigoXywgaSkgPT4gaSAlIDIgPT09IDApO1xuICAgICAgICAgIGtleXMgPSBhdHRyTmFtZXMuZmlsdGVyKG5hbWUgPT4gbmFtZS5zdGFydHNXaXRoKGtleSkgJiYgbmFtZSAhPSBrZXkpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKG5hbWUgPT4gbG93ZXJOYW1lKG5hbWUuc3Vic3RyKGtleS5sZW5ndGgpKSk7XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKCdsZXQnKTtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBrZXlzLm1hcChrZXkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5LRVksXG4gICAgICAgICAgICBzb3J0VGV4dDoga2V5LFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCFiaW5kaW5nIHx8IChiaW5kaW5nLmtleSA9PT0ga2V5ICYmICFiaW5kaW5nLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgcm9vdCBiaW5kaW5nLiBXZSBzaG91bGQgcmV0dXJuIGBsZXRgIGFuZCBrZXlzIHRoYXQgYXJlIGxlZnQgaW4gdGhlXG4gICAgICAgIC8vIHNlbGVjdG9yLlxuICAgICAgICBrZXlDb21wbGV0aW9ucygpO1xuICAgICAgfSBlbHNlIGlmIChiaW5kaW5nLmtleUlzVmFyKSB7XG4gICAgICAgIGNvbnN0IGVxdWFsTG9jYXRpb24gPSB0aGlzLmF0dHIudmFsdWUuaW5kZXhPZignPScpO1xuICAgICAgICB0aGlzLnJlc3VsdCA9IFtdO1xuICAgICAgICBpZiAoZXF1YWxMb2NhdGlvbiA+PSAwICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+PSBlcXVhbExvY2F0aW9uKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIGFmdGVyIHRoZSAnPScgaW4gYSBsZXQgY2xhdXNlLiBUaGUgdmFsaWQgdmFsdWVzIGhlcmUgYXJlIHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgICAgICAgIC8vIHRlbXBsYXRlIHJlZmVyZW5jZSdzIHR5cGUgcGFyYW1ldGVyLlxuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZU1ldGFkYXRhID0gc2VsZWN0b3JJbmZvLm1hcC5nZXQoc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChkaXJlY3RpdmVNZXRhZGF0YSkge1xuICAgICAgICAgICAgY29uc3QgY29udGV4dFRhYmxlID1cbiAgICAgICAgICAgICAgICB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZU1ldGFkYXRhLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0VGFibGUpIHtcbiAgICAgICAgICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLnN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbnRleHRUYWJsZS52YWx1ZXMoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJpbmRpbmcua2V5ICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA8PSAoYmluZGluZy5rZXkubGVuZ3RoIC0ga2V5Lmxlbmd0aCkpIHtcbiAgICAgICAgICBrZXlDb21wbGV0aW9ucygpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB0aGUgcG9zaXRpb24gaXMgaW4gdGhlIGV4cHJlc3Npb24gb3IgYWZ0ZXIgdGhlIGtleSBvciB0aGVyZSBpcyBubyBrZXksIHJldHVybiB0aGVcbiAgICAgICAgLy8gZXhwcmVzc2lvbiBjb21wbGV0aW9uc1xuICAgICAgICBpZiAoKGJpbmRpbmcuZXhwcmVzc2lvbiAmJiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLmV4cHJlc3Npb24uYXN0LnNwYW4pKSB8fFxuICAgICAgICAgICAgKGJpbmRpbmcua2V5ICYmXG4gICAgICAgICAgICAgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID4gYmluZGluZy5zcGFuLnN0YXJ0ICsgKGJpbmRpbmcua2V5Lmxlbmd0aCAtIGtleS5sZW5ndGgpKSB8fFxuICAgICAgICAgICAgIWJpbmRpbmcua2V5KSB7XG4gICAgICAgICAgY29uc3Qgc3BhbiA9IG5ldyBQYXJzZVNwYW4oMCwgdGhpcy5hdHRyLnZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgICAgIHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICAgICAgICAgICAgYmluZGluZy5leHByZXNzaW9uID8gYmluZGluZy5leHByZXNzaW9uLmFzdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQcm9wZXJ0eVJlYWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuLCBzcGFuLnRvQWJzb2x1dGUob2Zmc2V0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJbXBsaWNpdFJlY2VpdmVyKHNwYW4sIHNwYW4udG9BYnNvbHV0ZShvZmZzZXQpKSwgJycpLFxuICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlDb21wbGV0aW9ucygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpIHtcbiAgICBpZiAoaW5TcGFuKHRoaXMucG9zaXRpb24sIGFzdC52YWx1ZS5zb3VyY2VTcGFuKSkge1xuICAgICAgY29uc3QgY29tcGxldGlvbnMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgYXN0LnZhbHVlLCB0aGlzLnBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgaWYgKGNvbXBsZXRpb25zKSB7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHZhbHVlOiBBU1QsIHBvc2l0aW9uPzogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgdmFsdWUsXG4gICAgICAgIHBvc2l0aW9uID09PSB1bmRlZmluZWQgPyB0aGlzLmF0dHJpYnV0ZVZhbHVlUG9zaXRpb24gOiBwb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLnN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogbmcuU3ltYm9sW10pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gICAgcmV0dXJuIHN5bWJvbHMuZmlsdGVyKHMgPT4gIXMubmFtZS5zdGFydHNXaXRoKCdfXycpICYmIHMucHVibGljKS5tYXAoc3ltYm9sID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICBraW5kOiBzeW1ib2wua2luZCBhcyBuZy5Db21wbGV0aW9uS2luZCxcbiAgICAgICAgc29ydFRleHQ6IHN5bWJvbC5uYW1lLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGF0dHJpYnV0ZVZhbHVlUG9zaXRpb24oKSB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiB0aGlzLmF0dHIudmFsdWVTcGFuKSB7XG4gICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogbmcuVGVtcGxhdGVTb3VyY2UsIHNwYW46IG5nLlNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGxvd2VyTmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gbmFtZSAmJiAobmFtZVswXS50b0xvd2VyQ2FzZSgpICsgbmFtZS5zdWJzdHIoMSkpO1xufVxuXG5mdW5jdGlvbiBhbmd1bGFyQXR0cmlidXRlcyhpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBjb25zdCB0ZW1wbGF0ZVJlZnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3RoZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgJiYgc2VsZWN0b3IuZWxlbWVudCAhPT0gZWxlbWVudE5hbWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBzdW1tYXJ5ID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKSAhO1xuICAgIGZvciAoY29uc3QgYXR0ciBvZiBzZWxlY3Rvci5hdHRycykge1xuICAgICAgaWYgKGF0dHIpIHtcbiAgICAgICAgaWYgKGhhc1RlbXBsYXRlUmVmZXJlbmNlKHN1bW1hcnkudHlwZSkpIHtcbiAgICAgICAgICB0ZW1wbGF0ZVJlZnMuYWRkKGF0dHIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG90aGVycy5hZGQoYXR0cik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkuaW5wdXRzKSkge1xuICAgICAgaW5wdXRzLmFkZChpbnB1dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5vdXRwdXRzKSkge1xuICAgICAgb3V0cHV0cy5hZGQob3V0cHV0KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgdGVtcGxhdGVSZWZzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGAqJHtuYW1lfWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5wdXRzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGBbJHtuYW1lfV1gLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gICAgLy8gQWRkIGJhbmFuYS1pbi1hLWJveCBzeW50YXhcbiAgICAvLyBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtc3ludGF4I3R3by13YXktYmluZGluZy1cbiAgICBpZiAob3V0cHV0cy5oYXMoYCR7bmFtZX1DaGFuZ2VgKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZTogYFsoJHtuYW1lfSldYCxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3V0cHV0cykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBvdGhlcnMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufVxuIl19