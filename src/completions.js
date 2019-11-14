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
        define("@angular/language-service/src/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/chars", "@angular/language-service/src/expression_diagnostics", "@angular/language-service/src/expressions", "@angular/language-service/src/html_info", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var chars_1 = require("@angular/compiler/src/chars");
    var expression_diagnostics_1 = require("@angular/language-service/src/expression_diagnostics");
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
    function isIdentifierPart(code) {
        // Identifiers consist of alphanumeric characters, '_', or '$'.
        return chars_1.isAsciiLetter(code) || chars_1.isDigit(code) || code == chars_1.$$ || code == chars_1.$_;
    }
    /**
     * Gets the span of word in a template that surrounds `position`. If there is no word around
     * `position`, nothing is returned.
     */
    function getBoundedWordSpan(templateInfo, position) {
        var template = templateInfo.template;
        var templateSrc = template.source;
        if (!templateSrc)
            return;
        // TODO(ayazhafiz): A solution based on word expansion will always be expensive compared to one
        // based on ASTs. Whatever penalty we incur is probably manageable for small-length (i.e. the
        // majority of) identifiers, but the current solution involes a number of branchings and we can't
        // control potentially very long identifiers. Consider moving to an AST-based solution once
        // existing difficulties with AST spans are more clearly resolved (see #31898 for discussion of
        // known problems, and #33091 for how they affect text replacement).
        //
        // `templatePosition` represents the right-bound location of a cursor in the template.
        //    key.ent|ry
        //           ^---- cursor, at position `r` is at.
        // A cursor is not itself a character in the template; it has a left (lower) and right (upper)
        // index bound that hugs the cursor itself.
        var templatePosition = position - template.span.start;
        // To perform word expansion, we want to determine the left and right indices that hug the cursor.
        // There are three cases here.
        var left, right;
        if (templatePosition === 0) {
            // 1. Case like
            //      |rest of template
            //    the cursor is at the start of the template, hugged only by the right side (0-index).
            left = right = 0;
        }
        else if (templatePosition === templateSrc.length) {
            // 2. Case like
            //      rest of template|
            //    the cursor is at the end of the template, hugged only by the left side (last-index).
            left = right = templateSrc.length - 1;
        }
        else {
            // 3. Case like
            //      wo|rd
            //    there is a clear left and right index.
            left = templatePosition - 1;
            right = templatePosition;
        }
        if (!isIdentifierPart(templateSrc.charCodeAt(left)) &&
            !isIdentifierPart(templateSrc.charCodeAt(right))) {
            // Case like
            //         .|.
            // left ---^ ^--- right
            // There is no word here.
            return;
        }
        // Expand on the left and right side until a word boundary is hit. Back up one expansion on both
        // side to stay inside the word.
        while (left >= 0 && isIdentifierPart(templateSrc.charCodeAt(left)))
            --left;
        ++left;
        while (right < templateSrc.length && isIdentifierPart(templateSrc.charCodeAt(right)))
            ++right;
        --right;
        var absoluteStartPosition = position - (templatePosition - left);
        var length = right - left + 1;
        return { start: absoluteStartPosition, length: length };
    }
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
        var replacementSpan = getBoundedWordSpan(templateInfo, position);
        return result.map(function (entry) {
            return tslib_1.__assign(tslib_1.__assign({}, entry), { replacementSpan: replacementSpan });
        });
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
        var visitor = new ExpressionVisitor(info, position, function () { return expression_diagnostics_1.getExpressionScope(dinfo, path, false); }, attr);
        path.tail.visit(visitor, null);
        var results = visitor.results;
        if (results.length) {
            return results;
        }
        // Try allowing widening the path
        var widerPath = utils_1.findTemplateAstAt(info.templateAst, position, /* allowWidening */ true);
        if (widerPath.tail) {
            var widerVisitor = new ExpressionVisitor(info, position, function () { return expression_diagnostics_1.getExpressionScope(dinfo, widerPath, false); }, attr);
            widerPath.tail.visit(widerVisitor, null);
            return widerVisitor.results;
        }
        return results;
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
        var visitor = new ExpressionVisitor(info, position, function () { return expression_diagnostics_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(info), templatePath, false); });
        templatePath.tail.visit(visitor, null);
        return visitor.results;
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
        function ExpressionVisitor(info, position, getExpressionScope, attr) {
            var _this = _super.call(this) || this;
            _this.info = info;
            _this.position = position;
            _this.getExpressionScope = getExpressionScope;
            _this.attr = attr;
            _this.completions = new Map();
            return _this;
        }
        Object.defineProperty(ExpressionVisitor.prototype, "results", {
            get: function () { return Array.from(this.completions.values()); },
            enumerable: true,
            configurable: true
        });
        ExpressionVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.addAttributeValuesToCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitElementProperty = function (ast) {
            this.addAttributeValuesToCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitEvent = function (ast) { this.addAttributeValuesToCompletions(ast.handler); };
        ExpressionVisitor.prototype.visitElement = function (ast) {
            if (!this.attr || !this.attr.valueSpan || !this.attr.name.startsWith(TEMPLATE_ATTR_PREFIX)) {
                return;
            }
            // The value is a template expression but the expression AST was not produced when the
            // TemplateAst was produce so do that now.
            var key = this.attr.name.substr(TEMPLATE_ATTR_PREFIX.length);
            // Find the selector
            var selectorInfo = utils_1.getSelectors(this.info);
            var selectors = selectorInfo.selectors;
            var selector = selectors.filter(function (s) { return s.attrs.some(function (attr, i) { return i % 2 === 0 && attr === key; }); })[0];
            if (!selector) {
                return;
            }
            var templateBindingResult = this.info.expressionParser.parseTemplateBindings(key, this.attr.value, null, 0);
            // find the template binding that contains the position
            var valueRelativePosition = this.position - this.attr.valueSpan.start.offset;
            var bindings = templateBindingResult.templateBindings;
            var binding = bindings.find(function (binding) { return utils_1.inSpan(valueRelativePosition, binding.span, /* exclusive */ true); }) ||
                bindings.find(function (binding) { return utils_1.inSpan(valueRelativePosition, binding.span); });
            if (binding) {
                if (binding.keyIsVar) {
                    var equalLocation = this.attr.value.indexOf('=');
                    if (equalLocation >= 0 && valueRelativePosition >= equalLocation) {
                        // We are after the '=' in a let clause. The valid values here are the members of the
                        // template reference's type parameter.
                        var directiveMetadata = selectorInfo.map.get(selector);
                        if (directiveMetadata) {
                            var contextTable = this.info.template.query.getTemplateContext(directiveMetadata.type.reference);
                            if (contextTable) {
                                this.addSymbolsToCompletions(contextTable.values());
                                return;
                            }
                        }
                    }
                }
                if ((binding.expression && utils_1.inSpan(valueRelativePosition, binding.expression.ast.span)) ||
                    // If the position is in the expression or after the key or there is no key, return the
                    // expression completions
                    valueRelativePosition > binding.span.start + binding.key.length - key.length) {
                    var span = new compiler_1.ParseSpan(0, this.attr.value.length);
                    var offset = ast.sourceSpan.start.offset;
                    var expressionAst = void 0;
                    if (binding.expression) {
                        expressionAst = binding.expression.ast;
                    }
                    else {
                        var receiver = new compiler_1.ImplicitReceiver(span, span.toAbsolute(offset));
                        expressionAst = new compiler_1.PropertyRead(span, span.toAbsolute(offset), receiver, '');
                    }
                    this.addAttributeValuesToCompletions(expressionAst, this.position);
                    return;
                }
            }
            this.addKeysToCompletions(selector, key);
        };
        ExpressionVisitor.prototype.visitBoundText = function (ast) {
            if (utils_1.inSpan(this.position, ast.value.sourceSpan)) {
                var completions = expressions_1.getExpressionCompletions(this.getExpressionScope(), ast.value, this.position, this.info.template.query);
                if (completions) {
                    this.addSymbolsToCompletions(completions);
                }
            }
        };
        ExpressionVisitor.prototype.addAttributeValuesToCompletions = function (value, position) {
            var symbols = expressions_1.getExpressionCompletions(this.getExpressionScope(), value, position === undefined ? this.attributeValuePosition : position, this.info.template.query);
            if (symbols) {
                this.addSymbolsToCompletions(symbols);
            }
        };
        ExpressionVisitor.prototype.addKeysToCompletions = function (selector, key) {
            if (key !== 'ngFor') {
                return;
            }
            this.completions.set('let', {
                name: 'let',
                kind: ng.CompletionKind.KEY,
                sortText: 'let',
            });
            if (selector.attrs.some(function (attr) { return attr === 'ngForOf'; })) {
                this.completions.set('of', {
                    name: 'of',
                    kind: ng.CompletionKind.KEY,
                    sortText: 'of',
                });
            }
        };
        ExpressionVisitor.prototype.addSymbolsToCompletions = function (symbols) {
            var e_5, _a;
            try {
                for (var symbols_1 = tslib_1.__values(symbols), symbols_1_1 = symbols_1.next(); !symbols_1_1.done; symbols_1_1 = symbols_1.next()) {
                    var s = symbols_1_1.value;
                    if (s.name.startsWith('__') || !s.public || this.completions.has(s.name)) {
                        continue;
                    }
                    this.completions.set(s.name, {
                        name: s.name,
                        kind: s.kind,
                        sortText: s.name,
                    });
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (symbols_1_1 && !symbols_1_1.done && (_a = symbols_1.return)) _a.call(symbols_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb1U7SUFDcFUscURBQTJFO0lBRzNFLCtGQUE0RDtJQUM1RCx5RUFBdUQ7SUFDdkQscUVBQW9GO0lBQ3BGLG1FQUEwQztJQUMxQyx3REFBOEI7SUFDOUIsNkRBQThIO0lBRTlILElBQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0lBQ2pDLElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckYsSUFBTSxhQUFhLEdBQ2Ysd0JBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtRQUNyRSxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWTtZQUNwQyxRQUFRLEVBQUUsSUFBSTtTQUNmLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNQLElBQU0sZ0JBQWdCLEdBQXNDO1FBQzFEO1lBQ0UsSUFBSSxFQUFFLGNBQWM7WUFDcEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsY0FBYztTQUN6QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2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V0FBUSxDQUFDLEVBQUU7b0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsSUFBSSxFQUFFLE9BQUssTUFBSSxPQUFJO3dCQUNuQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTO3dCQUNqQyxRQUFRLEVBQUUsTUFBSTtxQkFDZixDQUFDLENBQUM7aUJBQ0o7YUFDRjs7Ozs7Ozs7OztZQUNELEtBQW1CLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7Z0JBQXZCLElBQU0sTUFBSSxvQkFBQTtnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxNQUFJLE1BQUksTUFBRztvQkFDakIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUztvQkFDakMsUUFBUSxFQUFFLE1BQUk7aUJBQ2YsQ0FBQyxDQUFDO2FBQ0o7Ozs7Ozs7Ozs7WUFDRCxLQUFtQixJQUFBLFdBQUEsaUJBQUEsTUFBTSxDQUFBLDhCQUFBLGtEQUFFO2dCQUF0QixJQUFNLE1BQUksbUJBQUE7Z0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLFFBQUE7b0JBQ0osSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUztvQkFDakMsUUFBUSxFQUFFLE1BQUk7aUJBQ2YsQ0FBQyxDQUFDO2FBQ0o7Ozs7Ozs7OztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBc3RQYXRoLCBBdHRyaWJ1dGUsIEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIEJvdW5kRWxlbWVudFByb3BlcnR5QXN0LCBCb3VuZEV2ZW50QXN0LCBCb3VuZFRleHRBc3QsIENzc1NlbGVjdG9yLCBFbGVtZW50LCBFbGVtZW50QXN0LCBJbXBsaWNpdFJlY2VpdmVyLCBOQU1FRF9FTlRJVElFUywgTm9kZSBhcyBIdG1sQXN0LCBOdWxsVGVtcGxhdGVWaXNpdG9yLCBQYXJzZVNwYW4sIFByb3BlcnR5UmVhZCwgVGFnQ29udGVudFR5cGUsIFRleHQsIGZpbmROb2RlLCBnZXRIdG1sVGFnRGVmaW5pdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHskJCwgJF8sIGlzQXNjaWlMZXR0ZXIsIGlzRGlnaXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jaGFycyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7YXR0cmlidXRlTmFtZXMsIGVsZW1lbnROYW1lcywgZXZlbnROYW1lcywgcHJvcGVydHlOYW1lc30gZnJvbSAnLi9odG1sX2luZm8nO1xuaW1wb3J0IHtJbmxpbmVUZW1wbGF0ZX0gZnJvbSAnLi90ZW1wbGF0ZSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0U2VsZWN0b3JzLCBoYXNUZW1wbGF0ZVJlZmVyZW5jZSwgaW5TcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBURU1QTEFURV9BVFRSX1BSRUZJWCA9ICcqJztcbmNvbnN0IEhJRERFTl9IVE1MX0VMRU1FTlRTOiBSZWFkb25seVNldDxzdHJpbmc+ID1cbiAgICBuZXcgU2V0KFsnaHRtbCcsICdzY3JpcHQnLCAnbm9zY3JpcHQnLCAnYmFzZScsICdib2R5JywgJ3RpdGxlJywgJ2hlYWQnLCAnbGluayddKTtcbmNvbnN0IEhUTUxfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9XG4gICAgZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIUhJRERFTl9IVE1MX0VMRU1FTlRTLmhhcyhuYW1lKSkubWFwKG5hbWUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9FTEVNRU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG5jb25zdCBBTkdVTEFSX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PG5nLkNvbXBsZXRpb25FbnRyeT4gPSBbXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGFpbmVyJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy1jb250YWluZXInLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLWNvbnRlbnQnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRlbnQnLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLXRlbXBsYXRlJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy10ZW1wbGF0ZScsXG4gIH0sXG5dO1xuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJQYXJ0KGNvZGU6IG51bWJlcikge1xuICAvLyBJZGVudGlmaWVycyBjb25zaXN0IG9mIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzLCAnXycsIG9yICckJy5cbiAgcmV0dXJuIGlzQXNjaWlMZXR0ZXIoY29kZSkgfHwgaXNEaWdpdChjb2RlKSB8fCBjb2RlID09ICQkIHx8IGNvZGUgPT0gJF87XG59XG5cbi8qKlxuICogR2V0cyB0aGUgc3BhbiBvZiB3b3JkIGluIGEgdGVtcGxhdGUgdGhhdCBzdXJyb3VuZHMgYHBvc2l0aW9uYC4gSWYgdGhlcmUgaXMgbm8gd29yZCBhcm91bmRcbiAqIGBwb3NpdGlvbmAsIG5vdGhpbmcgaXMgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kZWRXb3JkU3Bhbih0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IHRzLlRleHRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHt0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIGNvbnN0IHRlbXBsYXRlU3JjID0gdGVtcGxhdGUuc291cmNlO1xuXG4gIGlmICghdGVtcGxhdGVTcmMpIHJldHVybjtcblxuICAvLyBUT0RPKGF5YXpoYWZpeik6IEEgc29sdXRpb24gYmFzZWQgb24gd29yZCBleHBhbnNpb24gd2lsbCBhbHdheXMgYmUgZXhwZW5zaXZlIGNvbXBhcmVkIHRvIG9uZVxuICAvLyBiYXNlZCBvbiBBU1RzLiBXaGF0ZXZlciBwZW5hbHR5IHdlIGluY3VyIGlzIHByb2JhYmx5IG1hbmFnZWFibGUgZm9yIHNtYWxsLWxlbmd0aCAoaS5lLiB0aGVcbiAgLy8gbWFqb3JpdHkgb2YpIGlkZW50aWZpZXJzLCBidXQgdGhlIGN1cnJlbnQgc29sdXRpb24gaW52b2xlcyBhIG51bWJlciBvZiBicmFuY2hpbmdzIGFuZCB3ZSBjYW4ndFxuICAvLyBjb250cm9sIHBvdGVudGlhbGx5IHZlcnkgbG9uZyBpZGVudGlmaWVycy4gQ29uc2lkZXIgbW92aW5nIHRvIGFuIEFTVC1iYXNlZCBzb2x1dGlvbiBvbmNlXG4gIC8vIGV4aXN0aW5nIGRpZmZpY3VsdGllcyB3aXRoIEFTVCBzcGFucyBhcmUgbW9yZSBjbGVhcmx5IHJlc29sdmVkIChzZWUgIzMxODk4IGZvciBkaXNjdXNzaW9uIG9mXG4gIC8vIGtub3duIHByb2JsZW1zLCBhbmQgIzMzMDkxIGZvciBob3cgdGhleSBhZmZlY3QgdGV4dCByZXBsYWNlbWVudCkuXG4gIC8vXG4gIC8vIGB0ZW1wbGF0ZVBvc2l0aW9uYCByZXByZXNlbnRzIHRoZSByaWdodC1ib3VuZCBsb2NhdGlvbiBvZiBhIGN1cnNvciBpbiB0aGUgdGVtcGxhdGUuXG4gIC8vICAgIGtleS5lbnR8cnlcbiAgLy8gICAgICAgICAgIF4tLS0tIGN1cnNvciwgYXQgcG9zaXRpb24gYHJgIGlzIGF0LlxuICAvLyBBIGN1cnNvciBpcyBub3QgaXRzZWxmIGEgY2hhcmFjdGVyIGluIHRoZSB0ZW1wbGF0ZTsgaXQgaGFzIGEgbGVmdCAobG93ZXIpIGFuZCByaWdodCAodXBwZXIpXG4gIC8vIGluZGV4IGJvdW5kIHRoYXQgaHVncyB0aGUgY3Vyc29yIGl0c2VsZi5cbiAgbGV0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIC8vIFRvIHBlcmZvcm0gd29yZCBleHBhbnNpb24sIHdlIHdhbnQgdG8gZGV0ZXJtaW5lIHRoZSBsZWZ0IGFuZCByaWdodCBpbmRpY2VzIHRoYXQgaHVnIHRoZSBjdXJzb3IuXG4gIC8vIFRoZXJlIGFyZSB0aHJlZSBjYXNlcyBoZXJlLlxuICBsZXQgbGVmdCwgcmlnaHQ7XG4gIGlmICh0ZW1wbGF0ZVBvc2l0aW9uID09PSAwKSB7XG4gICAgLy8gMS4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICB8cmVzdCBvZiB0ZW1wbGF0ZVxuICAgIC8vICAgIHRoZSBjdXJzb3IgaXMgYXQgdGhlIHN0YXJ0IG9mIHRoZSB0ZW1wbGF0ZSwgaHVnZ2VkIG9ubHkgYnkgdGhlIHJpZ2h0IHNpZGUgKDAtaW5kZXgpLlxuICAgIGxlZnQgPSByaWdodCA9IDA7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA9PT0gdGVtcGxhdGVTcmMubGVuZ3RoKSB7XG4gICAgLy8gMi4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICByZXN0IG9mIHRlbXBsYXRlfFxuICAgIC8vICAgIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGVuZCBvZiB0aGUgdGVtcGxhdGUsIGh1Z2dlZCBvbmx5IGJ5IHRoZSBsZWZ0IHNpZGUgKGxhc3QtaW5kZXgpLlxuICAgIGxlZnQgPSByaWdodCA9IHRlbXBsYXRlU3JjLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSB7XG4gICAgLy8gMy4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICB3b3xyZFxuICAgIC8vICAgIHRoZXJlIGlzIGEgY2xlYXIgbGVmdCBhbmQgcmlnaHQgaW5kZXguXG4gICAgbGVmdCA9IHRlbXBsYXRlUG9zaXRpb24gLSAxO1xuICAgIHJpZ2h0ID0gdGVtcGxhdGVQb3NpdGlvbjtcbiAgfVxuXG4gIGlmICghaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KGxlZnQpKSAmJlxuICAgICAgIWlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChyaWdodCkpKSB7XG4gICAgLy8gQ2FzZSBsaWtlXG4gICAgLy8gICAgICAgICAufC5cbiAgICAvLyBsZWZ0IC0tLV4gXi0tLSByaWdodFxuICAgIC8vIFRoZXJlIGlzIG5vIHdvcmQgaGVyZS5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBFeHBhbmQgb24gdGhlIGxlZnQgYW5kIHJpZ2h0IHNpZGUgdW50aWwgYSB3b3JkIGJvdW5kYXJ5IGlzIGhpdC4gQmFjayB1cCBvbmUgZXhwYW5zaW9uIG9uIGJvdGhcbiAgLy8gc2lkZSB0byBzdGF5IGluc2lkZSB0aGUgd29yZC5cbiAgd2hpbGUgKGxlZnQgPj0gMCAmJiBpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQobGVmdCkpKSAtLWxlZnQ7XG4gICsrbGVmdDtcbiAgd2hpbGUgKHJpZ2h0IDwgdGVtcGxhdGVTcmMubGVuZ3RoICYmIGlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChyaWdodCkpKSArK3JpZ2h0O1xuICAtLXJpZ2h0O1xuXG4gIGNvbnN0IGFic29sdXRlU3RhcnRQb3NpdGlvbiA9IHBvc2l0aW9uIC0gKHRlbXBsYXRlUG9zaXRpb24gLSBsZWZ0KTtcbiAgY29uc3QgbGVuZ3RoID0gcmlnaHQgLSBsZWZ0ICsgMTtcbiAgcmV0dXJuIHtzdGFydDogYWJzb2x1dGVTdGFydFBvc2l0aW9uLCBsZW5ndGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyhcbiAgICB0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgY29uc3Qge2h0bWxBc3QsIHRlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgLy8gVGhlIHRlbXBsYXRlTm9kZSBzdGFydHMgYXQgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIgc28gd2UgYWRkIDEgdG8gc2tpcCBpdC5cbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGZpbmROb2RlKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSBwYXRoLnRhaWw7XG4gIGlmIChwYXRoLmVtcHR5IHx8ICFtb3N0U3BlY2lmaWMpIHtcbiAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhc3RQb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBtb3N0U3BlY2lmaWMuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgbW9zdFNwZWNpZmljLnZpc2l0KFxuICAgICAgICB7XG4gICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0xlbiA9IGFzdC5uYW1lLmxlbmd0aDtcbiAgICAgICAgICAgIC8vICsgMSBmb3IgdGhlIG9wZW5pbmcgYW5nbGUgYnJhY2tldFxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPD0gc3RhcnRUYWdTcGFuLnN0YXJ0ICsgdGFnTGVuICsgMSkge1xuICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgaW4gdGhlIHRhZyB0aGVuIHJldHVybiB0aGUgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPCBzdGFydFRhZ1NwYW4uZW5kKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgYXR0cmlidXRlIHNlY3Rpb24gb2YgdGhlIGVsZW1lbnQgKGJ1dCBub3QgaW4gYW4gYXR0cmlidXRlKS5cbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3QpIHtcbiAgICAgICAgICAgIGlmICghYXN0LnZhbHVlU3BhbiB8fCAhaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZS4gU2hvdyBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZVNwYW4gJiYgaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHRlbXBsYXRlUG9zaXRpb24sIGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFRleHQoYXN0KSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgaW4gYSBlbnRpdHkuXG4gICAgICAgICAgICByZXN1bHQgPSBlbnRpdHlDb21wbGV0aW9ucyhnZXRTb3VyY2VUZXh0KHRlbXBsYXRlLCBzcGFuT2YoYXN0KSksIGFzdFBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgcmVzdWx0ID0gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IGdldEh0bWxUYWdEZWZpbml0aW9uKGVsZW1lbnQubmFtZSk7XG4gICAgICAgICAgICAgIGlmIChkZWZpbml0aW9uLmNvbnRlbnRUeXBlID09PSBUYWdDb250ZW50VHlwZS5QQVJTQUJMRV9EQVRBKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgY2FuIGhvbGQgY29udGVudCwgc2hvdyBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBJZiBubyBlbGVtZW50IGNvbnRhaW5lciwgaW1wbGllcyBwYXJzYWJsZSBkYXRhIHNvIHNob3cgZWxlbWVudHMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0Q29tbWVudChhc3QpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uKGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb25DYXNlKGFzdCkge31cbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCk7XG4gIH1cblxuICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBnZXRCb3VuZGVkV29yZFNwYW4odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gIHJldHVybiByZXN1bHQubWFwKGVudHJ5ID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICAuLi5lbnRyeSwgcmVwbGFjZW1lbnRTcGFuLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGl0ZW0gPSBwYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50ID8gcGF0aC50YWlsIDogcGF0aC5wYXJlbnRPZihwYXRoLnRhaWwpO1xuICBpZiAoaXRlbSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIGl0ZW0ubmFtZSk7XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgYXR0cmlidXRlcyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgYXR0cmlidXRlTmFtZXMoZWxlbWVudE5hbWUpKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0FUVFJJQlVURSxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgaHRtbCBwcm9wZXJ0aWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBwcm9wZXJ0eU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgWyR7bmFtZX1dYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIGh0bWwgZXZlbnRzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBldmVudE5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKCR7bmFtZX0pYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQWRkIEFuZ3VsYXIgYXR0cmlidXRlc1xuICByZXN1bHRzLnB1c2goLi4uYW5ndWxhckF0dHJpYnV0ZXMoaW5mbywgZWxlbWVudE5hbWUpKTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGF0dHI6IEF0dHJpYnV0ZSk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCFwYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gIGNvbnN0IHZpc2l0b3IgPVxuICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKGluZm8sIHBvc2l0aW9uLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgsIGZhbHNlKSwgYXR0cik7XG4gIHBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgY29uc3Qge3Jlc3VsdHN9ID0gdmlzaXRvcjtcbiAgaWYgKHJlc3VsdHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cbiAgLy8gVHJ5IGFsbG93aW5nIHdpZGVuaW5nIHRoZSBwYXRoXG4gIGNvbnN0IHdpZGVyUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uLCAvKiBhbGxvd1dpZGVuaW5nICovIHRydWUpO1xuICBpZiAod2lkZXJQYXRoLnRhaWwpIHtcbiAgICBjb25zdCB3aWRlclZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICAgIGluZm8sIHBvc2l0aW9uLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHdpZGVyUGF0aCwgZmFsc2UpLCBhdHRyKTtcbiAgICB3aWRlclBhdGgudGFpbC52aXNpdCh3aWRlclZpc2l0b3IsIG51bGwpO1xuICAgIHJldHVybiB3aWRlclZpc2l0b3IucmVzdWx0cztcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZWxlbWVudENvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbLi4uQU5HVUxBUl9FTEVNRU5UU107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBlbGVtZW50cyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICByZXN1bHRzLnB1c2goLi4uSFRNTF9FTEVNRU5UUyk7XG4gIH1cblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgY29uc3QgY29tcG9uZW50cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIGdldFNlbGVjdG9ycyhpbmZvKS5zZWxlY3RvcnMpIHtcbiAgICBjb25zdCBuYW1lID0gc2VsZWN0b3IuZWxlbWVudDtcbiAgICBpZiAobmFtZSAmJiAhY29tcG9uZW50cy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbXBvbmVudHMuYWRkKG5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQ09NUE9ORU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBlbnRpdHlDb21wbGV0aW9ucyh2YWx1ZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBlbnRpdHkgY29tcGxldGlvbnNcbiAgY29uc3QgcmUgPSAvJltBLVphLXpdKjs/KD8hXFxkKS9nO1xuICBsZXQgZm91bmQ6IFJlZ0V4cEV4ZWNBcnJheXxudWxsO1xuICBsZXQgcmVzdWx0OiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICB3aGlsZSAoZm91bmQgPSByZS5leGVjKHZhbHVlKSkge1xuICAgIGxldCBsZW4gPSBmb3VuZFswXS5sZW5ndGg7XG4gICAgaWYgKHBvc2l0aW9uID49IGZvdW5kLmluZGV4ICYmIHBvc2l0aW9uIDwgKGZvdW5kLmluZGV4ICsgbGVuKSkge1xuICAgICAgcmVzdWx0ID0gT2JqZWN0LmtleXMoTkFNRURfRU5USVRJRVMpLm1hcChuYW1lID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lOiBgJiR7bmFtZX07YCxcbiAgICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5FTlRJVFksXG4gICAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBhbiBpbnRlcnBvbGF0aW9uIGluIGF0IHRoZSBwb3NpdGlvbi5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXRlbXBsYXRlUGF0aC50YWlsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICBpbmZvLCBwb3NpdGlvbixcbiAgICAgICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyksIHRlbXBsYXRlUGF0aCwgZmFsc2UpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBsZXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIG5nLkNvbXBsZXRpb25FbnRyeT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gbmcuU3ltYm9sVGFibGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGF0dHI/OiBBdHRyaWJ1dGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IHJlc3VsdHMoKTogbmcuQ29tcGxldGlvbkVudHJ5W10geyByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbXBsZXRpb25zLnZhbHVlcygpKTsgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hZGRBdHRyaWJ1dGVWYWx1ZXNUb0NvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hZGRBdHRyaWJ1dGVWYWx1ZXNUb0NvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLmFkZEF0dHJpYnV0ZVZhbHVlc1RvQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5hdHRyIHx8ICF0aGlzLmF0dHIudmFsdWVTcGFuIHx8ICF0aGlzLmF0dHIubmFtZS5zdGFydHNXaXRoKFRFTVBMQVRFX0FUVFJfUFJFRklYKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZSB2YWx1ZSBpcyBhIHRlbXBsYXRlIGV4cHJlc3Npb24gYnV0IHRoZSBleHByZXNzaW9uIEFTVCB3YXMgbm90IHByb2R1Y2VkIHdoZW4gdGhlXG4gICAgLy8gVGVtcGxhdGVBc3Qgd2FzIHByb2R1Y2Ugc28gZG8gdGhhdCBub3cuXG4gICAgY29uc3Qga2V5ID0gdGhpcy5hdHRyLm5hbWUuc3Vic3RyKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG4gICAgLy8gRmluZCB0aGUgc2VsZWN0b3JcbiAgICBjb25zdCBzZWxlY3RvckluZm8gPSBnZXRTZWxlY3RvcnModGhpcy5pbmZvKTtcbiAgICBjb25zdCBzZWxlY3RvcnMgPSBzZWxlY3RvckluZm8uc2VsZWN0b3JzO1xuICAgIGNvbnN0IHNlbGVjdG9yID1cbiAgICAgICAgc2VsZWN0b3JzLmZpbHRlcihzID0+IHMuYXR0cnMuc29tZSgoYXR0ciwgaSkgPT4gaSAlIDIgPT09IDAgJiYgYXR0ciA9PT0ga2V5KSlbMF07XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlQmluZGluZ1Jlc3VsdCA9XG4gICAgICAgIHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhrZXksIHRoaXMuYXR0ci52YWx1ZSwgbnVsbCwgMCk7XG5cbiAgICAvLyBmaW5kIHRoZSB0ZW1wbGF0ZSBiaW5kaW5nIHRoYXQgY29udGFpbnMgdGhlIHBvc2l0aW9uXG4gICAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIHRoaXMuYXR0ci52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGNvbnN0IGJpbmRpbmdzID0gdGVtcGxhdGVCaW5kaW5nUmVzdWx0LnRlbXBsYXRlQmluZGluZ3M7XG4gICAgY29uc3QgYmluZGluZyA9XG4gICAgICAgIGJpbmRpbmdzLmZpbmQoXG4gICAgICAgICAgICBiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB8fFxuICAgICAgICBiaW5kaW5ncy5maW5kKGJpbmRpbmcgPT4gaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5zcGFuKSk7XG5cbiAgICBpZiAoYmluZGluZykge1xuICAgICAgaWYgKGJpbmRpbmcua2V5SXNWYXIpIHtcbiAgICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IHRoaXMuYXR0ci52YWx1ZS5pbmRleE9mKCc9Jyk7XG4gICAgICAgIGlmIChlcXVhbExvY2F0aW9uID49IDAgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID49IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgICAvLyBXZSBhcmUgYWZ0ZXIgdGhlICc9JyBpbiBhIGxldCBjbGF1c2UuIFRoZSB2YWxpZCB2YWx1ZXMgaGVyZSBhcmUgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRUYWJsZSkge1xuICAgICAgICAgICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbnRleHRUYWJsZS52YWx1ZXMoKSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICgoYmluZGluZy5leHByZXNzaW9uICYmIGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuZXhwcmVzc2lvbi5hc3Quc3BhbikpIHx8XG4gICAgICAgICAgLy8gSWYgdGhlIHBvc2l0aW9uIGlzIGluIHRoZSBleHByZXNzaW9uIG9yIGFmdGVyIHRoZSBrZXkgb3IgdGhlcmUgaXMgbm8ga2V5LCByZXR1cm4gdGhlXG4gICAgICAgICAgLy8gZXhwcmVzc2lvbiBjb21wbGV0aW9uc1xuICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+IGJpbmRpbmcuc3Bhbi5zdGFydCArIGJpbmRpbmcua2V5Lmxlbmd0aCAtIGtleS5sZW5ndGgpIHtcbiAgICAgICAgY29uc3Qgc3BhbiA9IG5ldyBQYXJzZVNwYW4oMCwgdGhpcy5hdHRyLnZhbHVlLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IG9mZnNldCA9IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgICAgbGV0IGV4cHJlc3Npb25Bc3Q6IEFTVDtcbiAgICAgICAgaWYgKGJpbmRpbmcuZXhwcmVzc2lvbikge1xuICAgICAgICAgIGV4cHJlc3Npb25Bc3QgPSBiaW5kaW5nLmV4cHJlc3Npb24uYXN0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHJlY2VpdmVyID0gbmV3IEltcGxpY2l0UmVjZWl2ZXIoc3Bhbiwgc3Bhbi50b0Fic29sdXRlKG9mZnNldCkpO1xuICAgICAgICAgIGV4cHJlc3Npb25Bc3QgPSBuZXcgUHJvcGVydHlSZWFkKHNwYW4sIHNwYW4udG9BYnNvbHV0ZShvZmZzZXQpLCByZWNlaXZlciwgJycpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkQXR0cmlidXRlVmFsdWVzVG9Db21wbGV0aW9ucyhleHByZXNzaW9uQXN0LCB0aGlzLnBvc2l0aW9uKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuYWRkS2V5c1RvQ29tcGxldGlvbnMoc2VsZWN0b3IsIGtleSk7XG4gIH1cblxuICB2aXNpdEJvdW5kVGV4dChhc3Q6IEJvdW5kVGV4dEFzdCkge1xuICAgIGlmIChpblNwYW4odGhpcy5wb3NpdGlvbiwgYXN0LnZhbHVlLnNvdXJjZVNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIHRoaXMucG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICBpZiAoY29tcGxldGlvbnMpIHtcbiAgICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRBdHRyaWJ1dGVWYWx1ZXNUb0NvbXBsZXRpb25zKHZhbHVlOiBBU1QsIHBvc2l0aW9uPzogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgdmFsdWUsXG4gICAgICAgIHBvc2l0aW9uID09PSB1bmRlZmluZWQgPyB0aGlzLmF0dHJpYnV0ZVZhbHVlUG9zaXRpb24gOiBwb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFkZEtleXNUb0NvbXBsZXRpb25zKHNlbGVjdG9yOiBDc3NTZWxlY3Rvciwga2V5OiBzdHJpbmcpIHtcbiAgICBpZiAoa2V5ICE9PSAnbmdGb3InKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KCdsZXQnLCB7XG4gICAgICBuYW1lOiAnbGV0JyxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLktFWSxcbiAgICAgIHNvcnRUZXh0OiAnbGV0JyxcbiAgICB9KTtcbiAgICBpZiAoc2VsZWN0b3IuYXR0cnMuc29tZShhdHRyID0+IGF0dHIgPT09ICduZ0Zvck9mJykpIHtcbiAgICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KCdvZicsIHtcbiAgICAgICAgbmFtZTogJ29mJyxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuS0VZLFxuICAgICAgICBzb3J0VGV4dDogJ29mJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogbmcuU3ltYm9sW10pIHtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc3ltYm9scykge1xuICAgICAgaWYgKHMubmFtZS5zdGFydHNXaXRoKCdfXycpIHx8ICFzLnB1YmxpYyB8fCB0aGlzLmNvbXBsZXRpb25zLmhhcyhzLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5jb21wbGV0aW9ucy5zZXQocy5uYW1lLCB7XG4gICAgICAgIG5hbWU6IHMubmFtZSxcbiAgICAgICAga2luZDogcy5raW5kIGFzIG5nLkNvbXBsZXRpb25LaW5kLFxuICAgICAgICBzb3J0VGV4dDogcy5uYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgYXR0cmlidXRlVmFsdWVQb3NpdGlvbigpIHtcbiAgICBpZiAodGhpcy5hdHRyICYmIHRoaXMuYXR0ci52YWx1ZVNwYW4pIHtcbiAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VUZXh0KHRlbXBsYXRlOiBuZy5UZW1wbGF0ZVNvdXJjZSwgc3BhbjogbmcuU3Bhbik6IHN0cmluZyB7XG4gIHJldHVybiB0ZW1wbGF0ZS5zb3VyY2Uuc3Vic3RyaW5nKHNwYW4uc3RhcnQsIHNwYW4uZW5kKTtcbn1cblxuZnVuY3Rpb24gYW5ndWxhckF0dHJpYnV0ZXMoaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB7c2VsZWN0b3JzLCBtYXA6IHNlbGVjdG9yTWFwfSA9IGdldFNlbGVjdG9ycyhpbmZvKTtcbiAgY29uc3QgdGVtcGxhdGVSZWZzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG90aGVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgIGlmIChzZWxlY3Rvci5lbGVtZW50ICYmIHNlbGVjdG9yLmVsZW1lbnQgIT09IGVsZW1lbnROYW1lKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3Qgc3VtbWFyeSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvcikgITtcbiAgICBmb3IgKGNvbnN0IGF0dHIgb2Ygc2VsZWN0b3IuYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyKSB7XG4gICAgICAgIGlmIChoYXNUZW1wbGF0ZVJlZmVyZW5jZShzdW1tYXJ5LnR5cGUpKSB7XG4gICAgICAgICAgdGVtcGxhdGVSZWZzLmFkZChhdHRyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdGhlcnMuYWRkKGF0dHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5LmlucHV0cykpIHtcbiAgICAgIGlucHV0cy5hZGQoaW5wdXQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkub3V0cHV0cykpIHtcbiAgICAgIG91dHB1dHMuYWRkKG91dHB1dCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHRlbXBsYXRlUmVmcykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgKiR7bmFtZX1gLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIGlucHV0cykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lOiBgWyR7bmFtZX1dYCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICAgIC8vIEFkZCBiYW5hbmEtaW4tYS1ib3ggc3ludGF4XG4gICAgLy8gaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXN5bnRheCN0d28td2F5LWJpbmRpbmctXG4gICAgaWYgKG91dHB1dHMuaGFzKGAke25hbWV9Q2hhbmdlYCkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWU6IGBbKCR7bmFtZX0pXWAsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIG91dHB1dHMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYCgke25hbWV9KWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3RoZXJzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cbiJdfQ==