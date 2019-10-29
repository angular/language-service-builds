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
        var visitor = new ExpressionVisitor(info, position, function () { return language_services_1.getExpressionScope(dinfo, path, false); }, attr);
        path.tail.visit(visitor, null);
        var results = visitor.results;
        if (results.length) {
            return results;
        }
        // Try allowing widening the path
        var widerPath = utils_1.findTemplateAstAt(info.templateAst, position, /* allowWidening */ true);
        if (widerPath.tail) {
            var widerVisitor = new ExpressionVisitor(info, position, function () { return language_services_1.getExpressionScope(dinfo, widerPath, false); }, attr);
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
        var visitor = new ExpressionVisitor(info, position, function () { return language_services_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(info), templatePath, false); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb1U7SUFDcFUsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsbUVBQTBDO0lBQzFDLHdEQUE4QjtJQUM5Qiw2REFBOEg7SUFFOUgsSUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7SUFDakMsSUFBTSxvQkFBb0IsR0FDdEIsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNyRixJQUFNLGFBQWEsR0FDZix3QkFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO1FBQ3JFLE9BQU87WUFDTCxJQUFJLE1BQUE7WUFDSixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZO1lBQ3BDLFFBQVEsRUFBRSxJQUFJO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ1AsSUFBTSxnQkFBZ0IsR0FBc0M7UUFDMUQ7WUFDRSxJQUFJLEVBQUUsY0FBYztZQUNwQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxjQUFjO1NBQ3pCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsWUFBWTtZQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxZ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ZixDQUFDLENBQUM7Z0JBQ0gsNkJBQTZCO2dCQUM3Qiw0REFBNEQ7Z0JBQzVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBSSxNQUFJLFdBQVEsQ0FBQyxFQUFFO29CQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNYLElBQUksRUFBRSxPQUFLLE1BQUksT0FBSTt3QkFDbkIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUzt3QkFDakMsUUFBUSxFQUFFLE1BQUk7cUJBQ2YsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7Ozs7Ozs7Ozs7WUFDRCxLQUFtQixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO2dCQUF2QixJQUFNLE1BQUksb0JBQUE7Z0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLEVBQUUsTUFBSSxNQUFJLE1BQUc7b0JBQ2pCLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVM7b0JBQ2pDLFFBQVEsRUFBRSxNQUFJO2lCQUNmLENBQUMsQ0FBQzthQUNKOzs7Ozs7Ozs7O1lBQ0QsS0FBbUIsSUFBQSxXQUFBLGlCQUFBLE1BQU0sQ0FBQSw4QkFBQSxrREFBRTtnQkFBdEIsSUFBTSxNQUFJLG1CQUFBO2dCQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxRQUFBO29CQUNKLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVM7b0JBQ2pDLFFBQVEsRUFBRSxNQUFJO2lCQUNmLENBQUMsQ0FBQzthQUNKOzs7Ozs7Ozs7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0UGF0aCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQm91bmRUZXh0QXN0LCBDc3NTZWxlY3RvciwgRWxlbWVudCwgRWxlbWVudEFzdCwgSW1wbGljaXRSZWNlaXZlciwgTkFNRURfRU5USVRJRVMsIE5vZGUgYXMgSHRtbEFzdCwgTnVsbFRlbXBsYXRlVmlzaXRvciwgUGFyc2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFRhZ0NvbnRlbnRUeXBlLCBUZXh0LCBmaW5kTm9kZSwgZ2V0SHRtbFRhZ0RlZmluaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7YXR0cmlidXRlTmFtZXMsIGVsZW1lbnROYW1lcywgZXZlbnROYW1lcywgcHJvcGVydHlOYW1lc30gZnJvbSAnLi9odG1sX2luZm8nO1xuaW1wb3J0IHtJbmxpbmVUZW1wbGF0ZX0gZnJvbSAnLi90ZW1wbGF0ZSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0U2VsZWN0b3JzLCBoYXNUZW1wbGF0ZVJlZmVyZW5jZSwgaW5TcGFuLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBURU1QTEFURV9BVFRSX1BSRUZJWCA9ICcqJztcbmNvbnN0IEhJRERFTl9IVE1MX0VMRU1FTlRTOiBSZWFkb25seVNldDxzdHJpbmc+ID1cbiAgICBuZXcgU2V0KFsnaHRtbCcsICdzY3JpcHQnLCAnbm9zY3JpcHQnLCAnYmFzZScsICdib2R5JywgJ3RpdGxlJywgJ2hlYWQnLCAnbGluayddKTtcbmNvbnN0IEhUTUxfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9XG4gICAgZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIUhJRERFTl9IVE1MX0VMRU1FTlRTLmhhcyhuYW1lKSkubWFwKG5hbWUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9FTEVNRU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG5jb25zdCBBTkdVTEFSX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PG5nLkNvbXBsZXRpb25FbnRyeT4gPSBbXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGFpbmVyJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy1jb250YWluZXInLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLWNvbnRlbnQnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRlbnQnLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLXRlbXBsYXRlJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy10ZW1wbGF0ZScsXG4gIH0sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyhcbiAgICB0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgY29uc3Qge2h0bWxBc3QsIHRlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgLy8gVGhlIHRlbXBsYXRlTm9kZSBzdGFydHMgYXQgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIgc28gd2UgYWRkIDEgdG8gc2tpcCBpdC5cbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGZpbmROb2RlKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSBwYXRoLnRhaWw7XG4gIGlmIChwYXRoLmVtcHR5IHx8ICFtb3N0U3BlY2lmaWMpIHtcbiAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhc3RQb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBtb3N0U3BlY2lmaWMuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgbW9zdFNwZWNpZmljLnZpc2l0KFxuICAgICAgICB7XG4gICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0xlbiA9IGFzdC5uYW1lLmxlbmd0aDtcbiAgICAgICAgICAgIC8vICsgMSBmb3IgdGhlIG9wZW5pbmcgYW5nbGUgYnJhY2tldFxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPD0gc3RhcnRUYWdTcGFuLnN0YXJ0ICsgdGFnTGVuICsgMSkge1xuICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgaW4gdGhlIHRhZyB0aGVuIHJldHVybiB0aGUgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPCBzdGFydFRhZ1NwYW4uZW5kKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgYXR0cmlidXRlIHNlY3Rpb24gb2YgdGhlIGVsZW1lbnQgKGJ1dCBub3QgaW4gYW4gYXR0cmlidXRlKS5cbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3QpIHtcbiAgICAgICAgICAgIGlmICghYXN0LnZhbHVlU3BhbiB8fCAhaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZS4gU2hvdyBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZVNwYW4gJiYgaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHRlbXBsYXRlUG9zaXRpb24sIGFzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFRleHQoYXN0KSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgaW4gYSBlbnRpdHkuXG4gICAgICAgICAgICByZXN1bHQgPSBlbnRpdHlDb21wbGV0aW9ucyhnZXRTb3VyY2VUZXh0KHRlbXBsYXRlLCBzcGFuT2YoYXN0KSksIGFzdFBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgcmVzdWx0ID0gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IGdldEh0bWxUYWdEZWZpbml0aW9uKGVsZW1lbnQubmFtZSk7XG4gICAgICAgICAgICAgIGlmIChkZWZpbml0aW9uLmNvbnRlbnRUeXBlID09PSBUYWdDb250ZW50VHlwZS5QQVJTQUJMRV9EQVRBKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgY2FuIGhvbGQgY29udGVudCwgc2hvdyBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBJZiBubyBlbGVtZW50IGNvbnRhaW5lciwgaW1wbGllcyBwYXJzYWJsZSBkYXRhIHNvIHNob3cgZWxlbWVudHMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0Q29tbWVudChhc3QpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uKGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb25DYXNlKGFzdCkge31cbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBpdGVtID0gcGF0aC50YWlsIGluc3RhbmNlb2YgRWxlbWVudCA/IHBhdGgudGFpbCA6IHBhdGgucGFyZW50T2YocGF0aC50YWlsKTtcbiAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBpdGVtLm5hbWUpO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KFxuICAgIGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcblxuICBpZiAoaW5mby50ZW1wbGF0ZSBpbnN0YW5jZW9mIElubGluZVRlbXBsYXRlKSB7XG4gICAgLy8gUHJvdmlkZSBIVE1MIGF0dHJpYnV0ZXMgY29tcGxldGlvbiBvbmx5IGZvciBpbmxpbmUgdGVtcGxhdGVzXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGF0dHJpYnV0ZU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9BVFRSSUJVVEUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIGh0bWwgcHJvcGVydGllc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcHJvcGVydHlOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYFske25hbWV9XWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEFkZCBodG1sIGV2ZW50c1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgZXZlbnROYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYCgke25hbWV9KWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEFkZCBBbmd1bGFyIGF0dHJpYnV0ZXNcbiAgcmVzdWx0cy5wdXNoKC4uLmFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW1lbnROYW1lKSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyLCBhdHRyOiBBdHRyaWJ1dGUpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbik7XG4gIGlmICghcGF0aC50YWlsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICBjb25zdCB2aXNpdG9yID1cbiAgICAgIG5ldyBFeHByZXNzaW9uVmlzaXRvcihpbmZvLCBwb3NpdGlvbiwgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCBwYXRoLCBmYWxzZSksIGF0dHIpO1xuICBwYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIGNvbnN0IHtyZXN1bHRzfSA9IHZpc2l0b3I7XG4gIGlmIChyZXN1bHRzLmxlbmd0aCkge1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG4gIC8vIFRyeSBhbGxvd2luZyB3aWRlbmluZyB0aGUgcGF0aFxuICBjb25zdCB3aWRlclBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbiwgLyogYWxsb3dXaWRlbmluZyAqLyB0cnVlKTtcbiAgaWYgKHdpZGVyUGF0aC50YWlsKSB7XG4gICAgY29uc3Qgd2lkZXJWaXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgICBpbmZvLCBwb3NpdGlvbiwgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB3aWRlclBhdGgsIGZhbHNlKSwgYXR0cik7XG4gICAgd2lkZXJQYXRoLnRhaWwudmlzaXQod2lkZXJWaXNpdG9yLCBudWxsKTtcbiAgICByZXR1cm4gd2lkZXJWaXNpdG9yLnJlc3VsdHM7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gWy4uLkFOR1VMQVJfRUxFTUVOVFNdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgZWxlbWVudHMgY29tcGxldGlvbiBvbmx5IGZvciBpbmxpbmUgdGVtcGxhdGVzXG4gICAgcmVzdWx0cy5wdXNoKC4uLkhUTUxfRUxFTUVOVFMpO1xuICB9XG5cbiAgLy8gQ29sbGVjdCB0aGUgZWxlbWVudHMgcmVmZXJlbmNlZCBieSB0aGUgc2VsZWN0b3JzXG4gIGNvbnN0IGNvbXBvbmVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBnZXRTZWxlY3RvcnMoaW5mbykuc2VsZWN0b3JzKSB7XG4gICAgY29uc3QgbmFtZSA9IHNlbGVjdG9yLmVsZW1lbnQ7XG4gICAgaWYgKG5hbWUgJiYgIWNvbXBvbmVudHMuaGFzKG5hbWUpKSB7XG4gICAgICBjb21wb25lbnRzLmFkZChuYW1lKTtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZW50aXR5Q29tcGxldGlvbnModmFsdWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgd2hpbGUgKGZvdW5kID0gcmUuZXhlYyh2YWx1ZSkpIHtcbiAgICBsZXQgbGVuID0gZm91bmRbMF0ubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+PSBmb3VuZC5pbmRleCAmJiBwb3NpdGlvbiA8IChmb3VuZC5pbmRleCArIGxlbikpIHtcbiAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKE5BTUVEX0VOVElUSUVTKS5tYXAobmFtZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogYCYke25hbWV9O2AsXG4gICAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuRU5USVRZLFxuICAgICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgYW4gaW50ZXJwb2xhdGlvbiBpbiBhdCB0aGUgcG9zaXRpb24uXG4gIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCF0ZW1wbGF0ZVBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgaW5mbywgcG9zaXRpb24sXG4gICAgICAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pLCB0ZW1wbGF0ZVBhdGgsIGZhbHNlKSk7XG4gIHRlbXBsYXRlUGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICByZXR1cm4gdmlzaXRvci5yZXN1bHRzO1xufVxuXG4vLyBUaGVyZSBpcyBhIHNwZWNpYWwgY2FzZSBvZiBIVE1MIHdoZXJlIHRleHQgdGhhdCBjb250YWlucyBhIHVuY2xvc2VkIHRhZyBpcyB0cmVhdGVkIGFzXG4vLyB0ZXh0LiBGb3IgZXhhcGxlICc8aDE+IFNvbWUgPGEgdGV4dCA8L2gxPicgcHJvZHVjZXMgYSB0ZXh0IG5vZGVzIGluc2lkZSBvZiB0aGUgSDFcbi8vIGVsZW1lbnQgXCJTb21lIDxhIHRleHRcIi4gV2UsIGhvd2V2ZXIsIHdhbnQgdG8gdHJlYXQgdGhpcyBhcyBpZiB0aGUgdXNlciB3YXMgcmVxdWVzdGluZ1xuLy8gdGhlIGF0dHJpYnV0ZXMgb2YgYW4gXCJhXCIgZWxlbWVudCwgbm90IHJlcXVlc3RpbmcgY29tcGxldGlvbiBpbiB0aGUgYSB0ZXh0IGVsZW1lbnQuIFRoaXNcbi8vIGNvZGUgY2hlY2tzIGZvciB0aGlzIGNhc2UgYW5kIHJldHVybnMgZWxlbWVudCBjb21wbGV0aW9ucyBpZiBpdCBpcyBkZXRlY3RlZCBvciB1bmRlZmluZWRcbi8vIGlmIGl0IGlzIG5vdC5cbmZ1bmN0aW9uIHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnMoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsO1xuICBpZiAodGFpbCBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRhaWwudmFsdWUubWF0Y2goLzwoXFx3KFxcd3xcXGR8LSkqOik/KFxcdyhcXHd8XFxkfC0pKilcXHMvKTtcbiAgICAvLyBUaGUgcG9zaXRpb24gbXVzdCBiZSBhZnRlciB0aGUgbWF0Y2gsIG90aGVyd2lzZSB3ZSBhcmUgc3RpbGwgaW4gYSBwbGFjZSB3aGVyZSBlbGVtZW50c1xuICAgIC8vIGFyZSBleHBlY3RlZCAoc3VjaCBhcyBgPHxhYCBvciBgPGF8YDsgd2Ugb25seSB3YW50IGF0dHJpYnV0ZXMgZm9yIGA8YSB8YCBvciBhZnRlcikuXG4gICAgaWYgKG1hdGNoICYmXG4gICAgICAgIHBhdGgucG9zaXRpb24gPj0gKG1hdGNoLmluZGV4IHx8IDApICsgbWF0Y2hbMF0ubGVuZ3RoICsgdGFpbC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBtYXRjaFszXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBOdWxsVGVtcGxhdGVWaXNpdG9yIHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb21wbGV0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBuZy5Db21wbGV0aW9uRW50cnk+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGluZm86IEFzdFJlc3VsdCwgcHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRFeHByZXNzaW9uU2NvcGU6ICgpID0+IG5nLlN5bWJvbFRhYmxlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBhdHRyPzogQXR0cmlidXRlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCByZXN1bHRzKCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHsgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb21wbGV0aW9ucy52YWx1ZXMoKSk7IH1cblxuICB2aXNpdERpcmVjdGl2ZVByb3BlcnR5KGFzdDogQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMuYWRkQXR0cmlidXRlVmFsdWVzVG9Db21wbGV0aW9ucyhhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRFbGVtZW50UHJvcGVydHkoYXN0OiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCk6IHZvaWQge1xuICAgIHRoaXMuYWRkQXR0cmlidXRlVmFsdWVzVG9Db21wbGV0aW9ucyhhc3QudmFsdWUpO1xuICB9XG5cbiAgdmlzaXRFdmVudChhc3Q6IEJvdW5kRXZlbnRBc3QpOiB2b2lkIHsgdGhpcy5hZGRBdHRyaWJ1dGVWYWx1ZXNUb0NvbXBsZXRpb25zKGFzdC5oYW5kbGVyKTsgfVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuYXR0ciB8fCAhdGhpcy5hdHRyLnZhbHVlU3BhbiB8fCAhdGhpcy5hdHRyLm5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUaGUgdmFsdWUgaXMgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGJ1dCB0aGUgZXhwcmVzc2lvbiBBU1Qgd2FzIG5vdCBwcm9kdWNlZCB3aGVuIHRoZVxuICAgIC8vIFRlbXBsYXRlQXN0IHdhcyBwcm9kdWNlIHNvIGRvIHRoYXQgbm93LlxuICAgIGNvbnN0IGtleSA9IHRoaXMuYXR0ci5uYW1lLnN1YnN0cihURU1QTEFURV9BVFRSX1BSRUZJWC5sZW5ndGgpO1xuICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yXG4gICAgY29uc3Qgc2VsZWN0b3JJbmZvID0gZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbyk7XG4gICAgY29uc3Qgc2VsZWN0b3JzID0gc2VsZWN0b3JJbmZvLnNlbGVjdG9ycztcbiAgICBjb25zdCBzZWxlY3RvciA9XG4gICAgICAgIHNlbGVjdG9ycy5maWx0ZXIocyA9PiBzLmF0dHJzLnNvbWUoKGF0dHIsIGkpID0+IGkgJSAyID09PSAwICYmIGF0dHIgPT09IGtleSkpWzBdO1xuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUJpbmRpbmdSZXN1bHQgPVxuICAgICAgICB0aGlzLmluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZVRlbXBsYXRlQmluZGluZ3Moa2V5LCB0aGlzLmF0dHIudmFsdWUsIG51bGwsIDApO1xuXG4gICAgLy8gZmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvblxuICAgIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBjb25zdCBiaW5kaW5ncyA9IHRlbXBsYXRlQmluZGluZ1Jlc3VsdC50ZW1wbGF0ZUJpbmRpbmdzO1xuICAgIGNvbnN0IGJpbmRpbmcgPVxuICAgICAgICBiaW5kaW5ncy5maW5kKFxuICAgICAgICAgICAgYmluZGluZyA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLnNwYW4sIC8qIGV4Y2x1c2l2ZSAqLyB0cnVlKSkgfHxcbiAgICAgICAgYmluZGluZ3MuZmluZChiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbikpO1xuXG4gICAgaWYgKGJpbmRpbmcpIHtcbiAgICAgIGlmIChiaW5kaW5nLmtleUlzVmFyKSB7XG4gICAgICAgIGNvbnN0IGVxdWFsTG9jYXRpb24gPSB0aGlzLmF0dHIudmFsdWUuaW5kZXhPZignPScpO1xuICAgICAgICBpZiAoZXF1YWxMb2NhdGlvbiA+PSAwICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+PSBlcXVhbExvY2F0aW9uKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIGFmdGVyIHRoZSAnPScgaW4gYSBsZXQgY2xhdXNlLiBUaGUgdmFsaWQgdmFsdWVzIGhlcmUgYXJlIHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgICAgICAgIC8vIHRlbXBsYXRlIHJlZmVyZW5jZSdzIHR5cGUgcGFyYW1ldGVyLlxuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZU1ldGFkYXRhID0gc2VsZWN0b3JJbmZvLm1hcC5nZXQoc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChkaXJlY3RpdmVNZXRhZGF0YSkge1xuICAgICAgICAgICAgY29uc3QgY29udGV4dFRhYmxlID1cbiAgICAgICAgICAgICAgICB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZU1ldGFkYXRhLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0VGFibGUpIHtcbiAgICAgICAgICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhjb250ZXh0VGFibGUudmFsdWVzKCkpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoKGJpbmRpbmcuZXhwcmVzc2lvbiAmJiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLmV4cHJlc3Npb24uYXN0LnNwYW4pKSB8fFxuICAgICAgICAgIC8vIElmIHRoZSBwb3NpdGlvbiBpcyBpbiB0aGUgZXhwcmVzc2lvbiBvciBhZnRlciB0aGUga2V5IG9yIHRoZXJlIGlzIG5vIGtleSwgcmV0dXJuIHRoZVxuICAgICAgICAgIC8vIGV4cHJlc3Npb24gY29tcGxldGlvbnNcbiAgICAgICAgICB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBiaW5kaW5nLnNwYW4uc3RhcnQgKyBiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHNwYW4gPSBuZXcgUGFyc2VTcGFuKDAsIHRoaXMuYXR0ci52YWx1ZS5sZW5ndGgpO1xuICAgICAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgIGxldCBleHByZXNzaW9uQXN0OiBBU1Q7XG4gICAgICAgIGlmIChiaW5kaW5nLmV4cHJlc3Npb24pIHtcbiAgICAgICAgICBleHByZXNzaW9uQXN0ID0gYmluZGluZy5leHByZXNzaW9uLmFzdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCByZWNlaXZlciA9IG5ldyBJbXBsaWNpdFJlY2VpdmVyKHNwYW4sIHNwYW4udG9BYnNvbHV0ZShvZmZzZXQpKTtcbiAgICAgICAgICBleHByZXNzaW9uQXN0ID0gbmV3IFByb3BlcnR5UmVhZChzcGFuLCBzcGFuLnRvQWJzb2x1dGUob2Zmc2V0KSwgcmVjZWl2ZXIsICcnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZEF0dHJpYnV0ZVZhbHVlc1RvQ29tcGxldGlvbnMoZXhwcmVzc2lvbkFzdCwgdGhpcy5wb3NpdGlvbik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFkZEtleXNUb0NvbXBsZXRpb25zKHNlbGVjdG9yLCBrZXkpO1xuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpIHtcbiAgICBpZiAoaW5TcGFuKHRoaXMucG9zaXRpb24sIGFzdC52YWx1ZS5zb3VyY2VTcGFuKSkge1xuICAgICAgY29uc3QgY29tcGxldGlvbnMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgYXN0LnZhbHVlLCB0aGlzLnBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgaWYgKGNvbXBsZXRpb25zKSB7XG4gICAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoY29tcGxldGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWRkQXR0cmlidXRlVmFsdWVzVG9Db21wbGV0aW9ucyh2YWx1ZTogQVNULCBwb3NpdGlvbj86IG51bWJlcikge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLFxuICAgICAgICBwb3NpdGlvbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5hdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uIDogcG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgaWYgKHN5bWJvbHMpIHtcbiAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9scyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRLZXlzVG9Db21wbGV0aW9ucyhzZWxlY3RvcjogQ3NzU2VsZWN0b3IsIGtleTogc3RyaW5nKSB7XG4gICAgaWYgKGtleSAhPT0gJ25nRm9yJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNvbXBsZXRpb25zLnNldCgnbGV0Jywge1xuICAgICAgbmFtZTogJ2xldCcsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5LRVksXG4gICAgICBzb3J0VGV4dDogJ2xldCcsXG4gICAgfSk7XG4gICAgaWYgKHNlbGVjdG9yLmF0dHJzLnNvbWUoYXR0ciA9PiBhdHRyID09PSAnbmdGb3JPZicpKSB7XG4gICAgICB0aGlzLmNvbXBsZXRpb25zLnNldCgnb2YnLCB7XG4gICAgICAgIG5hbWU6ICdvZicsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLktFWSxcbiAgICAgICAgc29ydFRleHQ6ICdvZicsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IG5nLlN5bWJvbFtdKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIHN5bWJvbHMpIHtcbiAgICAgIGlmIChzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSB8fCAhcy5wdWJsaWMgfHwgdGhpcy5jb21wbGV0aW9ucy5oYXMocy5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KHMubmFtZSwge1xuICAgICAgICBuYW1lOiBzLm5hbWUsXG4gICAgICAgIGtpbmQ6IHMua2luZCBhcyBuZy5Db21wbGV0aW9uS2luZCxcbiAgICAgICAgc29ydFRleHQ6IHMubmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGF0dHJpYnV0ZVZhbHVlUG9zaXRpb24oKSB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiB0aGlzLmF0dHIudmFsdWVTcGFuKSB7XG4gICAgICByZXR1cm4gdGhpcy5wb3NpdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogbmcuVGVtcGxhdGVTb3VyY2UsIHNwYW46IG5nLlNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3Qge3NlbGVjdG9ycywgbWFwOiBzZWxlY3Rvck1hcH0gPSBnZXRTZWxlY3RvcnMoaW5mbyk7XG4gIGNvbnN0IHRlbXBsYXRlUmVmcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3V0cHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdGhlcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBzZWxlY3RvcnMpIHtcbiAgICBpZiAoc2VsZWN0b3IuZWxlbWVudCAmJiBzZWxlY3Rvci5lbGVtZW50ICE9PSBlbGVtZW50TmFtZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHN1bW1hcnkgPSBzZWxlY3Rvck1hcC5nZXQoc2VsZWN0b3IpICE7XG4gICAgZm9yIChjb25zdCBhdHRyIG9mIHNlbGVjdG9yLmF0dHJzKSB7XG4gICAgICBpZiAoYXR0cikge1xuICAgICAgICBpZiAoaGFzVGVtcGxhdGVSZWZlcmVuY2Uoc3VtbWFyeS50eXBlKSkge1xuICAgICAgICAgIHRlbXBsYXRlUmVmcy5hZGQoYXR0cik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3RoZXJzLmFkZChhdHRyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5pbnB1dHMpKSB7XG4gICAgICBpbnB1dHMuYWRkKGlucHV0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5Lm91dHB1dHMpKSB7XG4gICAgICBvdXRwdXRzLmFkZChvdXRwdXQpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIGZvciAoY29uc3QgbmFtZSBvZiB0ZW1wbGF0ZVJlZnMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYCoke25hbWV9YCxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBpbnB1dHMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogYFske25hbWV9XWAsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgICAvLyBBZGQgYmFuYW5hLWluLWEtYm94IHN5bnRheFxuICAgIC8vIGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS1zeW50YXgjdHdvLXdheS1iaW5kaW5nLVxuICAgIGlmIChvdXRwdXRzLmhhcyhgJHtuYW1lfUNoYW5nZWApKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lOiBgWygke25hbWV9KV1gLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBvdXRwdXRzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWU6IGAoJHtuYW1lfSlgLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIG90aGVycykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iXX0=