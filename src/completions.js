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
        define("@angular/language-service/src/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/language_services", "@angular/language-service/src/expressions", "@angular/language-service/src/html_info", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var html_info_1 = require("@angular/language-service/src/html_info");
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
    function getTemplateCompletions(templateInfo) {
        var result = undefined;
        var htmlAst = templateInfo.htmlAst, templateAst = templateInfo.templateAst, template = templateInfo.template;
        // The templateNode starts at the delimiter character so we add 1 to skip it.
        if (templateInfo.position != null) {
            var templatePosition_1 = templateInfo.position - template.span.start;
            var path_1 = compiler_1.findNode(htmlAst, templatePosition_1);
            var mostSpecific = path_1.tail;
            if (path_1.empty || !mostSpecific) {
                result = elementCompletions(templateInfo, path_1);
            }
            else {
                var astPosition_1 = templatePosition_1 - mostSpecific.sourceSpan.start.offset;
                mostSpecific.visit({
                    visitElement: function (ast) {
                        var startTagSpan = utils_1.spanOf(ast.sourceSpan);
                        var tagLen = ast.name.length;
                        if (templatePosition_1 <=
                            startTagSpan.start + tagLen + 1 /* 1 for the opening angle bracked */) {
                            // If we are in the tag then return the element completions.
                            result = elementCompletions(templateInfo, path_1);
                        }
                        else if (templatePosition_1 < startTagSpan.end) {
                            // We are in the attribute section of the element (but not in an attribute).
                            // Return the attribute completions.
                            result = attributeCompletions(templateInfo, path_1);
                        }
                    },
                    visitAttribute: function (ast) {
                        if (!ast.valueSpan || !utils_1.inSpan(templatePosition_1, utils_1.spanOf(ast.valueSpan))) {
                            // We are in the name of an attribute. Show attribute completions.
                            result = attributeCompletions(templateInfo, path_1);
                        }
                        else if (ast.valueSpan && utils_1.inSpan(templatePosition_1, utils_1.spanOf(ast.valueSpan))) {
                            result = attributeValueCompletions(templateInfo, templatePosition_1, ast);
                        }
                    },
                    visitText: function (ast) {
                        // Check if we are in a entity.
                        result = entityCompletions(getSourceText(template, utils_1.spanOf(ast)), astPosition_1);
                        if (result)
                            return result;
                        result = interpolationCompletions(templateInfo, templatePosition_1);
                        if (result)
                            return result;
                        var element = path_1.first(compiler_1.Element);
                        if (element) {
                            var definition = compiler_1.getHtmlTagDefinition(element.name);
                            if (definition.contentType === compiler_1.TagContentType.PARSABLE_DATA) {
                                result = voidElementAttributeCompletions(templateInfo, path_1);
                                if (!result) {
                                    // If the element can hold content Show element completions.
                                    result = elementCompletions(templateInfo, path_1);
                                }
                            }
                        }
                        else {
                            // If no element container, implies parsable data so show elements.
                            result = voidElementAttributeCompletions(templateInfo, path_1);
                            if (!result) {
                                result = elementCompletions(templateInfo, path_1);
                            }
                        }
                    },
                    visitComment: function (ast) { },
                    visitExpansion: function (ast) { },
                    visitExpansionCase: function (ast) { }
                }, null);
            }
        }
        return result;
    }
    exports.getTemplateCompletions = getTemplateCompletions;
    function attributeCompletions(info, path) {
        var item = path.tail instanceof compiler_1.Element ? path.tail : path.parentOf(path.tail);
        if (item instanceof compiler_1.Element) {
            return attributeCompletionsForElement(info, item.name, item);
        }
        return undefined;
    }
    function attributeCompletionsForElement(info, elementName, element) {
        var attributes = getAttributeInfosForElement(info, elementName, element);
        // Map all the attributes to a completion
        return attributes.map(function (attr) { return ({
            kind: attr.fromHtml ? 'html attribute' : 'attribute',
            name: nameOfAttr(attr),
            sort: attr.name
        }); });
    }
    function getAttributeInfosForElement(info, elementName, element) {
        var attributes = [];
        // Add html attributes
        var htmlAttributes = html_info_1.attributeNames(elementName) || [];
        if (htmlAttributes) {
            attributes.push.apply(attributes, tslib_1.__spread(htmlAttributes.map(function (name) { return ({ name: name, fromHtml: true }); })));
        }
        // Add html properties
        var htmlProperties = html_info_1.propertyNames(elementName);
        if (htmlProperties) {
            attributes.push.apply(attributes, tslib_1.__spread(htmlProperties.map(function (name) { return ({ name: name, input: true }); })));
        }
        // Add html events
        var htmlEvents = html_info_1.eventNames(elementName);
        if (htmlEvents) {
            attributes.push.apply(attributes, tslib_1.__spread(htmlEvents.map(function (name) { return ({ name: name, output: true }); })));
        }
        var _a = utils_1.getSelectors(info), selectors = _a.selectors, selectorMap = _a.map;
        if (selectors && selectors.length) {
            // All the attributes that are selectable should be shown.
            var applicableSelectors = selectors.filter(function (selector) { return !selector.element || selector.element == elementName; });
            var selectorAndAttributeNames = applicableSelectors.map(function (selector) { return ({ selector: selector, attrs: selector.attrs.filter(function (a) { return !!a; }) }); });
            var attrs_1 = utils_1.flatten(selectorAndAttributeNames.map(function (selectorAndAttr) {
                var directive = selectorMap.get(selectorAndAttr.selector);
                var result = selectorAndAttr.attrs.map(function (name) { return ({ name: name, input: name in directive.inputs, output: name in directive.outputs }); });
                return result;
            }));
            // Add template attribute if a directive contains a template reference
            selectorAndAttributeNames.forEach(function (selectorAndAttr) {
                var selector = selectorAndAttr.selector;
                var directive = selectorMap.get(selector);
                if (directive && utils_1.hasTemplateReference(directive.type) && selector.attrs.length &&
                    selector.attrs[0]) {
                    attrs_1.push({ name: selector.attrs[0], template: true });
                }
            });
            // All input and output properties of the matching directives should be added.
            var elementSelector = element ?
                createElementCssSelector(element) :
                createElementCssSelector(new compiler_1.Element(elementName, [], [], null, null, null));
            var matcher = new compiler_1.SelectorMatcher();
            matcher.addSelectables(selectors);
            matcher.match(elementSelector, function (selector) {
                var directive = selectorMap.get(selector);
                if (directive) {
                    attrs_1.push.apply(attrs_1, tslib_1.__spread(Object.keys(directive.inputs).map(function (name) { return ({ name: name, input: true }); })));
                    attrs_1.push.apply(attrs_1, tslib_1.__spread(Object.keys(directive.outputs).map(function (name) { return ({ name: name, output: true }); })));
                }
            });
            // If a name shows up twice, fold it into a single value.
            attrs_1 = foldAttrs(attrs_1);
            // Now expand them back out to ensure that input/output shows up as well as input and
            // output.
            attributes.push.apply(attributes, tslib_1.__spread(utils_1.flatten(attrs_1.map(expandedAttr))));
        }
        return attributes;
    }
    function attributeValueCompletions(info, position, attr) {
        var path = utils_1.findTemplateAstAt(info.templateAst, position);
        var mostSpecific = path.tail;
        var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
        if (mostSpecific) {
            var visitor = new ExpressionVisitor(info, position, attr, function () { return language_services_1.getExpressionScope(dinfo, path, false); });
            mostSpecific.visit(visitor, null);
            if (!visitor.result || !visitor.result.length) {
                // Try allwoing widening the path
                var widerPath_1 = utils_1.findTemplateAstAt(info.templateAst, position, /* allowWidening */ true);
                if (widerPath_1.tail) {
                    var widerVisitor = new ExpressionVisitor(info, position, attr, function () { return language_services_1.getExpressionScope(dinfo, widerPath_1, false); });
                    widerPath_1.tail.visit(widerVisitor, null);
                    return widerVisitor.result;
                }
            }
            return visitor.result;
        }
    }
    function elementCompletions(info, path) {
        var htmlNames = html_info_1.elementNames().filter(function (name) { return !(name in hiddenHtmlElements); });
        // Collect the elements referenced by the selectors
        var directiveElements = utils_1.getSelectors(info)
            .selectors.map(function (selector) { return selector.element; })
            .filter(function (name) { return !!name; });
        var components = directiveElements.map(function (name) { return ({ kind: 'component', name: name, sort: name }); });
        var htmlElements = htmlNames.map(function (name) { return ({ kind: 'element', name: name, sort: name }); });
        // Return components and html elements
        return utils_1.uniqueByName(htmlElements.concat(components));
    }
    function entityCompletions(value, position) {
        // Look for entity completions
        var re = /&[A-Za-z]*;?(?!\d)/g;
        var found;
        var result = undefined;
        while (found = re.exec(value)) {
            var len = found[0].length;
            if (position >= found.index && position < (found.index + len)) {
                result = Object.keys(compiler_1.NAMED_ENTITIES)
                    .map(function (name) { return ({ kind: 'entity', name: "&" + name + ";", sort: name }); });
                break;
            }
        }
        return result;
    }
    function interpolationCompletions(info, position) {
        // Look for an interpolation in at the position.
        var templatePath = utils_1.findTemplateAstAt(info.templateAst, position);
        var mostSpecific = templatePath.tail;
        if (mostSpecific) {
            var visitor = new ExpressionVisitor(info, position, undefined, function () { return language_services_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(info), templatePath, false); });
            mostSpecific.visit(visitor, null);
            return utils_1.uniqueByName(visitor.result);
        }
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
                var selector_1 = selectors.filter(function (s) { return s.attrs.some(function (attr, i) { return i % 2 == 0 && attr == key_1; }); })[0];
                var templateBindingResult = this.info.expressionParser.parseTemplateBindings(key_1, this.attr.value, null);
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
                        var attrNames = selector_1.attrs.filter(function (_, i) { return i % 2 == 0; });
                        keys = attrNames.filter(function (name) { return name.startsWith(key_1) && name != key_1; })
                            .map(function (name) { return lowerName(name.substr(key_1.length)); });
                    }
                    keys.push('let');
                    _this.result = keys.map(function (key) { return ({ kind: 'key', name: key, sort: key }); });
                };
                if (!binding || (binding.key == key_1 && !binding.expression)) {
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
                        this.attributeValueCompletions(binding.expression ? binding.expression.ast :
                            new compiler_1.PropertyRead(span, new compiler_1.ImplicitReceiver(span), ''), valueRelativePosition_1);
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
            var symbols = expressions_1.getExpressionCompletions(this.getExpressionScope(), value, position == null ? this.attributeValuePosition : position, this.info.template.query);
            if (symbols) {
                this.result = this.symbolsToCompletions(symbols);
            }
        };
        ExpressionVisitor.prototype.symbolsToCompletions = function (symbols) {
            return symbols.filter(function (s) { return !s.name.startsWith('__') && s.public; })
                .map(function (symbol) { return ({ kind: symbol.kind, name: symbol.name, sort: symbol.name }); });
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
    function nameOfAttr(attr) {
        var name = attr.name;
        if (attr.output) {
            name = utils_1.removeSuffix(name, 'Events');
            name = utils_1.removeSuffix(name, 'Changed');
        }
        var result = [name];
        if (attr.input) {
            result.unshift('[');
            result.push(']');
        }
        if (attr.output) {
            result.unshift('(');
            result.push(')');
        }
        if (attr.template) {
            result.unshift('*');
        }
        return result.join('');
    }
    var templateAttr = /^(\w+:)?(template$|^\*)/;
    function createElementCssSelector(element) {
        var e_1, _a;
        var cssSelector = new compiler_1.CssSelector();
        var elNameNoNs = compiler_1.splitNsName(element.name)[1];
        cssSelector.setElement(elNameNoNs);
        try {
            for (var _b = tslib_1.__values(element.attrs), _c = _b.next(); !_c.done; _c = _b.next()) {
                var attr = _c.value;
                if (!attr.name.match(templateAttr)) {
                    var _d = tslib_1.__read(compiler_1.splitNsName(attr.name), 2), _ = _d[0], attrNameNoNs = _d[1];
                    cssSelector.addAttribute(attrNameNoNs, attr.value);
                    if (attr.name.toLowerCase() == 'class') {
                        var classes = attr.value.split(/s+/g);
                        classes.forEach(function (className) { return cssSelector.addClassName(className); });
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return cssSelector;
    }
    function foldAttrs(attrs) {
        var inputOutput = new Map();
        var templates = new Map();
        var result = [];
        attrs.forEach(function (attr) {
            if (attr.fromHtml) {
                return attr;
            }
            if (attr.template) {
                var duplicate = templates.get(attr.name);
                if (!duplicate) {
                    result.push({ name: attr.name, template: true });
                    templates.set(attr.name, attr);
                }
            }
            if (attr.input || attr.output) {
                var duplicate = inputOutput.get(attr.name);
                if (duplicate) {
                    duplicate.input = duplicate.input || attr.input;
                    duplicate.output = duplicate.output || attr.output;
                }
                else {
                    var cloneAttr = { name: attr.name };
                    if (attr.input)
                        cloneAttr.input = true;
                    if (attr.output)
                        cloneAttr.output = true;
                    result.push(cloneAttr);
                    inputOutput.set(attr.name, cloneAttr);
                }
            }
        });
        return result;
    }
    function expandedAttr(attr) {
        if (attr.input && attr.output) {
            return [
                attr, { name: attr.name, input: true, output: false },
                { name: attr.name, input: false, output: true }
            ];
        }
        return [attr];
    }
    function lowerName(name) {
        return name && (name[0].toLowerCase() + name.substr(1));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbWY7SUFDbmYsaUZBQXVHO0lBR3ZHLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFFcEYsNkRBQW1LO0lBRW5LLElBQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0lBRWpDLElBQU0sa0JBQWtCLEdBQUc7UUFDekIsSUFBSSxFQUFFLElBQUk7UUFDVixNQUFNLEVBQUUsSUFBSTtRQUNaLFFBQVEsRUFBRSxJQUFJO1FBQ2QsSUFBSSxFQUFFLElBQUk7UUFDVixJQUFJLEVBQUUsSUFBSTtRQUNWLEtBQUssRUFBRSxJQUFJO1FBQ1gsSUFBSSxFQUFFLElBQUk7UUFDVixJQUFJLEVBQUUsSUFBSTtLQUNYLENBQUM7SUFFRixTQUFnQixzQkFBc0IsQ0FBQyxZQUEwQjtRQUMvRCxJQUFJLE1BQU0sR0FBMEIsU0FBUyxDQUFDO1FBQ3pDLElBQUEsOEJBQU8sRUFBRSxzQ0FBVyxFQUFFLGdDQUFRLENBQWlCO1FBQ3BELDZFQUE2RTtRQUM3RSxJQUFJLFlBQVksQ0FBQyxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ2pDLElBQUksa0JBQWdCLEdBQUcsWUFBWSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNuRSxJQUFJLE1BQUksR0FBRyxtQkFBUSxDQUFDLE9BQU8sRUFBRSxrQkFBZ0IsQ0FBQyxDQUFDO1lBQy9DLElBQUksWUFBWSxHQUFHLE1BQUksQ0FBQyxJQUFJLENBQUM7WUFDN0IsSUFBSSxNQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUMvQixNQUFNLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxFQUFFLE1BQUksQ0FBQyxD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Q0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsSUFBWTtRQUM3QixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJBc3QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ3NzU2VsZWN0b3IsIERpcmVjdGl2ZUFzdCwgRWxlbWVudCwgRWxlbWVudEFzdCwgRW1iZWRkZWRUZW1wbGF0ZUFzdCwgSW1wbGljaXRSZWNlaXZlciwgTkFNRURfRU5USVRJRVMsIE5nQ29udGVudEFzdCwgTm9kZSBhcyBIdG1sQXN0LCBOdWxsVGVtcGxhdGVWaXNpdG9yLCBQYXJzZVNwYW4sIFByb3BlcnR5UmVhZCwgUmVmZXJlbmNlQXN0LCBTZWxlY3Rvck1hdGNoZXIsIFRhZ0NvbnRlbnRUeXBlLCBUZW1wbGF0ZUFzdCwgVGVtcGxhdGVBc3RWaXNpdG9yLCBUZXh0LCBUZXh0QXN0LCBWYXJpYWJsZUFzdCwgZmluZE5vZGUsIGdldEh0bWxUYWdEZWZpbml0aW9uLCBzcGxpdE5zTmFtZSwgdGVtcGxhdGVWaXNpdEFsbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRFeHByZXNzaW9uU2NvcGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuXG5pbXBvcnQge0FzdFJlc3VsdCwgQXR0ckluZm8sIFNlbGVjdG9ySW5mbywgVGVtcGxhdGVJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25Db21wbGV0aW9uc30gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge2F0dHJpYnV0ZU5hbWVzLCBlbGVtZW50TmFtZXMsIGV2ZW50TmFtZXMsIHByb3BlcnR5TmFtZXN9IGZyb20gJy4vaHRtbF9pbmZvJztcbmltcG9ydCB7QnVpbHRpblR5cGUsIENvbXBsZXRpb24sIENvbXBsZXRpb25zLCBTcGFuLCBTeW1ib2wsIFN5bWJvbERlY2xhcmF0aW9uLCBTeW1ib2xUYWJsZSwgVGVtcGxhdGVTb3VyY2V9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRUZW1wbGF0ZUFzdEF0LCBmbGF0dGVuLCBnZXRTZWxlY3RvcnMsIGhhc1RlbXBsYXRlUmVmZXJlbmNlLCBpblNwYW4sIHJlbW92ZVN1ZmZpeCwgc3Bhbk9mLCB1bmlxdWVCeU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBURU1QTEFURV9BVFRSX1BSRUZJWCA9ICcqJztcblxuY29uc3QgaGlkZGVuSHRtbEVsZW1lbnRzID0ge1xuICBodG1sOiB0cnVlLFxuICBzY3JpcHQ6IHRydWUsXG4gIG5vc2NyaXB0OiB0cnVlLFxuICBiYXNlOiB0cnVlLFxuICBib2R5OiB0cnVlLFxuICB0aXRsZTogdHJ1ZSxcbiAgaGVhZDogdHJ1ZSxcbiAgbGluazogdHJ1ZSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbzogVGVtcGxhdGVJbmZvKTogQ29tcGxldGlvbnN8dW5kZWZpbmVkIHtcbiAgbGV0IHJlc3VsdDogQ29tcGxldGlvbnN8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQge2h0bWxBc3QsIHRlbXBsYXRlQXN0LCB0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIC8vIFRoZSB0ZW1wbGF0ZU5vZGUgc3RhcnRzIGF0IHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyIHNvIHdlIGFkZCAxIHRvIHNraXAgaXQuXG4gIGlmICh0ZW1wbGF0ZUluZm8ucG9zaXRpb24gIT0gbnVsbCkge1xuICAgIGxldCB0ZW1wbGF0ZVBvc2l0aW9uID0gdGVtcGxhdGVJbmZvLnBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgICBsZXQgcGF0aCA9IGZpbmROb2RlKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICAgIGxldCBtb3N0U3BlY2lmaWMgPSBwYXRoLnRhaWw7XG4gICAgaWYgKHBhdGguZW1wdHkgfHwgIW1vc3RTcGVjaWZpYykge1xuICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBhc3RQb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBtb3N0U3BlY2lmaWMuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICBtb3N0U3BlY2lmaWMudmlzaXQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgICBsZXQgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgbGV0IHRhZ0xlbiA9IGFzdC5uYW1lLmxlbmd0aDtcbiAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPD1cbiAgICAgICAgICAgICAgICAgIHN0YXJ0VGFnU3Bhbi5zdGFydCArIHRhZ0xlbiArIDEgLyogMSBmb3IgdGhlIG9wZW5pbmcgYW5nbGUgYnJhY2tlZCAqLykge1xuICAgICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBpbiB0aGUgdGFnIHRoZW4gcmV0dXJuIHRoZSBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPCBzdGFydFRhZ1NwYW4uZW5kKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3QpIHtcbiAgICAgICAgICAgICAgaWYgKCFhc3QudmFsdWVTcGFuIHx8ICFpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUuIFNob3cgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlU3BhbiAmJiBpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uLCBhc3QpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmlzaXRUZXh0KGFzdCkge1xuICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgaW4gYSBlbnRpdHkuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgICBpZiAocmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnQpO1xuICAgICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGxldCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVmaW5pdGlvbi5jb250ZW50VHlwZSA9PT0gVGFnQ29udGVudFR5cGUuUEFSU0FCTEVfREFUQSkge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgY2FuIGhvbGQgY29udGVudCBTaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBubyBlbGVtZW50IGNvbnRhaW5lciwgaW1wbGllcyBwYXJzYWJsZSBkYXRhIHNvIHNob3cgZWxlbWVudHMuXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2aXNpdENvbW1lbnQoYXN0KSB7fSxcbiAgICAgICAgICAgIHZpc2l0RXhwYW5zaW9uKGFzdCkge30sXG4gICAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0KSB7fVxuICAgICAgICAgIH0sXG4gICAgICAgICAgbnVsbCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zKGluZm86IFRlbXBsYXRlSW5mbywgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IENvbXBsZXRpb25zfHVuZGVmaW5lZCB7XG4gIGxldCBpdGVtID0gcGF0aC50YWlsIGluc3RhbmNlb2YgRWxlbWVudCA/IHBhdGgudGFpbCA6IHBhdGgucGFyZW50T2YocGF0aC50YWlsKTtcbiAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBpdGVtLm5hbWUsIGl0ZW0pO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChcbiAgICBpbmZvOiBUZW1wbGF0ZUluZm8sIGVsZW1lbnROYW1lOiBzdHJpbmcsIGVsZW1lbnQ/OiBFbGVtZW50KTogQ29tcGxldGlvbnMge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlSW5mb3NGb3JFbGVtZW50KGluZm8sIGVsZW1lbnROYW1lLCBlbGVtZW50KTtcblxuICAvLyBNYXAgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIGEgY29tcGxldGlvblxuICByZXR1cm4gYXR0cmlidXRlcy5tYXA8Q29tcGxldGlvbj4oYXR0ciA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBhdHRyLmZyb21IdG1sID8gJ2h0bWwgYXR0cmlidXRlJyA6ICdhdHRyaWJ1dGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lT2ZBdHRyKGF0dHIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3J0OiBhdHRyLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbn1cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlSW5mb3NGb3JFbGVtZW50KFxuICAgIGluZm86IFRlbXBsYXRlSW5mbywgZWxlbWVudE5hbWU6IHN0cmluZywgZWxlbWVudD86IEVsZW1lbnQpOiBBdHRySW5mb1tdIHtcbiAgbGV0IGF0dHJpYnV0ZXM6IEF0dHJJbmZvW10gPSBbXTtcblxuICAvLyBBZGQgaHRtbCBhdHRyaWJ1dGVzXG4gIGxldCBodG1sQXR0cmlidXRlcyA9IGF0dHJpYnV0ZU5hbWVzKGVsZW1lbnROYW1lKSB8fCBbXTtcbiAgaWYgKGh0bWxBdHRyaWJ1dGVzKSB7XG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLmh0bWxBdHRyaWJ1dGVzLm1hcDxBdHRySW5mbz4obmFtZSA9PiAoe25hbWUsIGZyb21IdG1sOiB0cnVlfSkpKTtcbiAgfVxuXG4gIC8vIEFkZCBodG1sIHByb3BlcnRpZXNcbiAgbGV0IGh0bWxQcm9wZXJ0aWVzID0gcHJvcGVydHlOYW1lcyhlbGVtZW50TmFtZSk7XG4gIGlmIChodG1sUHJvcGVydGllcykge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5odG1sUHJvcGVydGllcy5tYXA8QXR0ckluZm8+KG5hbWUgPT4gKHtuYW1lLCBpbnB1dDogdHJ1ZX0pKSk7XG4gIH1cblxuICAvLyBBZGQgaHRtbCBldmVudHNcbiAgbGV0IGh0bWxFdmVudHMgPSBldmVudE5hbWVzKGVsZW1lbnROYW1lKTtcbiAgaWYgKGh0bWxFdmVudHMpIHtcbiAgICBhdHRyaWJ1dGVzLnB1c2goLi4uaHRtbEV2ZW50cy5tYXA8QXR0ckluZm8+KG5hbWUgPT4gKHtuYW1lLCBvdXRwdXQ6IHRydWV9KSkpO1xuICB9XG5cbiAgbGV0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBpZiAoc2VsZWN0b3JzICYmIHNlbGVjdG9ycy5sZW5ndGgpIHtcbiAgICAvLyBBbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBhcmUgc2VsZWN0YWJsZSBzaG91bGQgYmUgc2hvd24uXG4gICAgY29uc3QgYXBwbGljYWJsZVNlbGVjdG9ycyA9XG4gICAgICAgIHNlbGVjdG9ycy5maWx0ZXIoc2VsZWN0b3IgPT4gIXNlbGVjdG9yLmVsZW1lbnQgfHwgc2VsZWN0b3IuZWxlbWVudCA9PSBlbGVtZW50TmFtZSk7XG4gICAgY29uc3Qgc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcyA9XG4gICAgICAgIGFwcGxpY2FibGVTZWxlY3RvcnMubWFwKHNlbGVjdG9yID0+ICh7c2VsZWN0b3IsIGF0dHJzOiBzZWxlY3Rvci5hdHRycy5maWx0ZXIoYSA9PiAhIWEpfSkpO1xuICAgIGxldCBhdHRycyA9IGZsYXR0ZW4oc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcy5tYXA8QXR0ckluZm9bXT4oc2VsZWN0b3JBbmRBdHRyID0+IHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvckFuZEF0dHIuc2VsZWN0b3IpICE7XG4gICAgICBjb25zdCByZXN1bHQgPSBzZWxlY3RvckFuZEF0dHIuYXR0cnMubWFwPEF0dHJJbmZvPihcbiAgICAgICAgICBuYW1lID0+ICh7bmFtZSwgaW5wdXQ6IG5hbWUgaW4gZGlyZWN0aXZlLmlucHV0cywgb3V0cHV0OiBuYW1lIGluIGRpcmVjdGl2ZS5vdXRwdXRzfSkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KSk7XG5cbiAgICAvLyBBZGQgdGVtcGxhdGUgYXR0cmlidXRlIGlmIGEgZGlyZWN0aXZlIGNvbnRhaW5zIGEgdGVtcGxhdGUgcmVmZXJlbmNlXG4gICAgc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcy5mb3JFYWNoKHNlbGVjdG9yQW5kQXR0ciA9PiB7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IHNlbGVjdG9yQW5kQXR0ci5zZWxlY3RvcjtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3Rvcik7XG4gICAgICBpZiAoZGlyZWN0aXZlICYmIGhhc1RlbXBsYXRlUmVmZXJlbmNlKGRpcmVjdGl2ZS50eXBlKSAmJiBzZWxlY3Rvci5hdHRycy5sZW5ndGggJiZcbiAgICAgICAgICBzZWxlY3Rvci5hdHRyc1swXSkge1xuICAgICAgICBhdHRycy5wdXNoKHtuYW1lOiBzZWxlY3Rvci5hdHRyc1swXSwgdGVtcGxhdGU6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFsbCBpbnB1dCBhbmQgb3V0cHV0IHByb3BlcnRpZXMgb2YgdGhlIG1hdGNoaW5nIGRpcmVjdGl2ZXMgc2hvdWxkIGJlIGFkZGVkLlxuICAgIGxldCBlbGVtZW50U2VsZWN0b3IgPSBlbGVtZW50ID9cbiAgICAgICAgY3JlYXRlRWxlbWVudENzc1NlbGVjdG9yKGVsZW1lbnQpIDpcbiAgICAgICAgY3JlYXRlRWxlbWVudENzc1NlbGVjdG9yKG5ldyBFbGVtZW50KGVsZW1lbnROYW1lLCBbXSwgW10sIG51bGwgISwgbnVsbCwgbnVsbCkpO1xuXG4gICAgbGV0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhzZWxlY3RvcnMpO1xuICAgIG1hdGNoZXIubWF0Y2goZWxlbWVudFNlbGVjdG9yLCBzZWxlY3RvciA9PiB7XG4gICAgICBsZXQgZGlyZWN0aXZlID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgIGlmIChkaXJlY3RpdmUpIHtcbiAgICAgICAgYXR0cnMucHVzaCguLi5PYmplY3Qua2V5cyhkaXJlY3RpdmUuaW5wdXRzKS5tYXAobmFtZSA9PiAoe25hbWUsIGlucHV0OiB0cnVlfSkpKTtcbiAgICAgICAgYXR0cnMucHVzaCguLi5PYmplY3Qua2V5cyhkaXJlY3RpdmUub3V0cHV0cykubWFwKG5hbWUgPT4gKHtuYW1lLCBvdXRwdXQ6IHRydWV9KSkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gSWYgYSBuYW1lIHNob3dzIHVwIHR3aWNlLCBmb2xkIGl0IGludG8gYSBzaW5nbGUgdmFsdWUuXG4gICAgYXR0cnMgPSBmb2xkQXR0cnMoYXR0cnMpO1xuXG4gICAgLy8gTm93IGV4cGFuZCB0aGVtIGJhY2sgb3V0IHRvIGVuc3VyZSB0aGF0IGlucHV0L291dHB1dCBzaG93cyB1cCBhcyB3ZWxsIGFzIGlucHV0IGFuZFxuICAgIC8vIG91dHB1dC5cbiAgICBhdHRyaWJ1dGVzLnB1c2goLi4uZmxhdHRlbihhdHRycy5tYXAoZXhwYW5kZWRBdHRyKSkpO1xuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKFxuICAgIGluZm86IFRlbXBsYXRlSW5mbywgcG9zaXRpb246IG51bWJlciwgYXR0cjogQXR0cmlidXRlKTogQ29tcGxldGlvbnN8dW5kZWZpbmVkIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgY29uc3QgbW9zdFNwZWNpZmljID0gcGF0aC50YWlsO1xuICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgaWYgKG1vc3RTcGVjaWZpYykge1xuICAgIGNvbnN0IHZpc2l0b3IgPVxuICAgICAgICBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCwgZmFsc2UpKTtcbiAgICBtb3N0U3BlY2lmaWMudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gICAgaWYgKCF2aXNpdG9yLnJlc3VsdCB8fCAhdmlzaXRvci5yZXN1bHQubGVuZ3RoKSB7XG4gICAgICAvLyBUcnkgYWxsd29pbmcgd2lkZW5pbmcgdGhlIHBhdGhcbiAgICAgIGNvbnN0IHdpZGVyUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uLCAvKiBhbGxvd1dpZGVuaW5nICovIHRydWUpO1xuICAgICAgaWYgKHdpZGVyUGF0aC50YWlsKSB7XG4gICAgICAgIGNvbnN0IHdpZGVyVmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgICAgICAgIGluZm8sIHBvc2l0aW9uLCBhdHRyLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHdpZGVyUGF0aCwgZmFsc2UpKTtcbiAgICAgICAgd2lkZXJQYXRoLnRhaWwudmlzaXQod2lkZXJWaXNpdG9yLCBudWxsKTtcbiAgICAgICAgcmV0dXJuIHdpZGVyVmlzaXRvci5yZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2aXNpdG9yLnJlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbGVtZW50Q29tcGxldGlvbnMoaW5mbzogVGVtcGxhdGVJbmZvLCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogQ29tcGxldGlvbnN8dW5kZWZpbmVkIHtcbiAgbGV0IGh0bWxOYW1lcyA9IGVsZW1lbnROYW1lcygpLmZpbHRlcihuYW1lID0+ICEobmFtZSBpbiBoaWRkZW5IdG1sRWxlbWVudHMpKTtcblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgbGV0IGRpcmVjdGl2ZUVsZW1lbnRzID0gZ2V0U2VsZWN0b3JzKGluZm8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0b3JzLm1hcChzZWxlY3RvciA9PiBzZWxlY3Rvci5lbGVtZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihuYW1lID0+ICEhbmFtZSkgYXMgc3RyaW5nW107XG5cbiAgbGV0IGNvbXBvbmVudHMgPVxuICAgICAgZGlyZWN0aXZlRWxlbWVudHMubWFwPENvbXBsZXRpb24+KG5hbWUgPT4gKHtraW5kOiAnY29tcG9uZW50JywgbmFtZSwgc29ydDogbmFtZX0pKTtcbiAgbGV0IGh0bWxFbGVtZW50cyA9IGh0bWxOYW1lcy5tYXA8Q29tcGxldGlvbj4obmFtZSA9PiAoe2tpbmQ6ICdlbGVtZW50JywgbmFtZTogbmFtZSwgc29ydDogbmFtZX0pKTtcblxuICAvLyBSZXR1cm4gY29tcG9uZW50cyBhbmQgaHRtbCBlbGVtZW50c1xuICByZXR1cm4gdW5pcXVlQnlOYW1lKGh0bWxFbGVtZW50cy5jb25jYXQoY29tcG9uZW50cykpO1xufVxuXG5mdW5jdGlvbiBlbnRpdHlDb21wbGV0aW9ucyh2YWx1ZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogQ29tcGxldGlvbnN8dW5kZWZpbmVkIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogQ29tcGxldGlvbnN8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICB3aGlsZSAoZm91bmQgPSByZS5leGVjKHZhbHVlKSkge1xuICAgIGxldCBsZW4gPSBmb3VuZFswXS5sZW5ndGg7XG4gICAgaWYgKHBvc2l0aW9uID49IGZvdW5kLmluZGV4ICYmIHBvc2l0aW9uIDwgKGZvdW5kLmluZGV4ICsgbGVuKSkge1xuICAgICAgcmVzdWx0ID0gT2JqZWN0LmtleXMoTkFNRURfRU5USVRJRVMpXG4gICAgICAgICAgICAgICAgICAgLm1hcDxDb21wbGV0aW9uPihuYW1lID0+ICh7a2luZDogJ2VudGl0eScsIG5hbWU6IGAmJHtuYW1lfTtgLCBzb3J0OiBuYW1lfSkpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGludGVycG9sYXRpb25Db21wbGV0aW9ucyhpbmZvOiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOiBDb21wbGV0aW9uc3x1bmRlZmluZWQge1xuICAvLyBMb29rIGZvciBhbiBpbnRlcnBvbGF0aW9uIGluIGF0IHRoZSBwb3NpdGlvbi5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSB0ZW1wbGF0ZVBhdGgudGFpbDtcbiAgaWYgKG1vc3RTcGVjaWZpYykge1xuICAgIGxldCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgICBpbmZvLCBwb3NpdGlvbiwgdW5kZWZpbmVkLFxuICAgICAgICAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pLCB0ZW1wbGF0ZVBhdGgsIGZhbHNlKSk7XG4gICAgbW9zdFNwZWNpZmljLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICAgIHJldHVybiB1bmlxdWVCeU5hbWUodmlzaXRvci5yZXN1bHQpO1xuICB9XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBUZW1wbGF0ZUluZm8sIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBDb21wbGV0aW9uc3xcbiAgICB1bmRlZmluZWQge1xuICBsZXQgdGFpbCA9IHBhdGgudGFpbDtcbiAgaWYgKHRhaWwgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgbGV0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBOdWxsVGVtcGxhdGVWaXNpdG9yIHtcbiAgcHJpdmF0ZSBnZXRFeHByZXNzaW9uU2NvcGU6ICgpID0+IFN5bWJvbFRhYmxlO1xuICByZXN1bHQ6IENvbXBsZXRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmZvOiBUZW1wbGF0ZUluZm8sIHByaXZhdGUgcG9zaXRpb246IG51bWJlciwgcHJpdmF0ZSBhdHRyPzogQXR0cmlidXRlLFxuICAgICAgZ2V0RXhwcmVzc2lvblNjb3BlPzogKCkgPT4gU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlIHx8ICgoKSA9PiBpbmZvLnRlbXBsYXRlLm1lbWJlcnMpO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0KTogdm9pZCB7IHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhhc3QuaGFuZGxlcik7IH1cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiBnZXRTZWxlY3RvcnModGhpcy5pbmZvKSAmJiB0aGlzLmF0dHIubmFtZS5zdGFydHNXaXRoKFRFTVBMQVRFX0FUVFJfUFJFRklYKSkge1xuICAgICAgLy8gVGhlIHZhbHVlIGlzIGEgdGVtcGxhdGUgZXhwcmVzc2lvbiBidXQgdGhlIGV4cHJlc3Npb24gQVNUIHdhcyBub3QgcHJvZHVjZWQgd2hlbiB0aGVcbiAgICAgIC8vIFRlbXBsYXRlQXN0IHdhcyBwcm9kdWNlIHNvXG4gICAgICAvLyBkbyB0aGF0IG5vdy5cblxuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hdHRyLm5hbWUuc3Vic3RyKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yXG4gICAgICBjb25zdCBzZWxlY3RvckluZm8gPSBnZXRTZWxlY3RvcnModGhpcy5pbmZvKTtcbiAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IHNlbGVjdG9ySW5mby5zZWxlY3RvcnM7XG4gICAgICBjb25zdCBzZWxlY3RvciA9XG4gICAgICAgICAgc2VsZWN0b3JzLmZpbHRlcihzID0+IHMuYXR0cnMuc29tZSgoYXR0ciwgaSkgPT4gaSAlIDIgPT0gMCAmJiBhdHRyID09IGtleSkpWzBdO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUJpbmRpbmdSZXN1bHQgPVxuICAgICAgICAgIHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhrZXksIHRoaXMuYXR0ci52YWx1ZSwgbnVsbCk7XG5cbiAgICAgIC8vIGZpbmQgdGhlIHRlbXBsYXRlIGJpbmRpbmcgdGhhdCBjb250YWlucyB0aGUgcG9zaXRpb25cbiAgICAgIGlmICghdGhpcy5hdHRyLnZhbHVlU3BhbikgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIHRoaXMuYXR0ci52YWx1ZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgY29uc3QgYmluZGluZ3MgPSB0ZW1wbGF0ZUJpbmRpbmdSZXN1bHQudGVtcGxhdGVCaW5kaW5ncztcbiAgICAgIGNvbnN0IGJpbmRpbmcgPVxuICAgICAgICAgIGJpbmRpbmdzLmZpbmQoXG4gICAgICAgICAgICAgIGJpbmRpbmcgPT4gaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5zcGFuLCAvKiBleGNsdXNpdmUgKi8gdHJ1ZSkpIHx8XG4gICAgICAgICAgYmluZGluZ3MuZmluZChiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbikpO1xuXG4gICAgICBjb25zdCBrZXlDb21wbGV0aW9ucyA9ICgpID0+IHtcbiAgICAgICAgbGV0IGtleXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgIGNvbnN0IGF0dHJOYW1lcyA9IHNlbGVjdG9yLmF0dHJzLmZpbHRlcigoXywgaSkgPT4gaSAlIDIgPT0gMCk7XG4gICAgICAgICAga2V5cyA9IGF0dHJOYW1lcy5maWx0ZXIobmFtZSA9PiBuYW1lLnN0YXJ0c1dpdGgoa2V5KSAmJiBuYW1lICE9IGtleSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAobmFtZSA9PiBsb3dlck5hbWUobmFtZS5zdWJzdHIoa2V5Lmxlbmd0aCkpKTtcbiAgICAgICAgfVxuICAgICAgICBrZXlzLnB1c2goJ2xldCcpO1xuICAgICAgICB0aGlzLnJlc3VsdCA9IGtleXMubWFwKGtleSA9PiA8Q29tcGxldGlvbj57a2luZDogJ2tleScsIG5hbWU6IGtleSwgc29ydDoga2V5fSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoIWJpbmRpbmcgfHwgKGJpbmRpbmcua2V5ID09IGtleSAmJiAhYmluZGluZy5leHByZXNzaW9uKSkge1xuICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIHJvb3QgYmluZGluZy4gV2Ugc2hvdWxkIHJldHVybiBgbGV0YCBhbmQga2V5cyB0aGF0IGFyZSBsZWZ0IGluIHRoZVxuICAgICAgICAvLyBzZWxlY3Rvci5cbiAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgIH0gZWxzZSBpZiAoYmluZGluZy5rZXlJc1Zhcikge1xuICAgICAgICBjb25zdCBlcXVhbExvY2F0aW9uID0gdGhpcy5hdHRyLnZhbHVlLmluZGV4T2YoJz0nKTtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBbXTtcbiAgICAgICAgaWYgKGVxdWFsTG9jYXRpb24gPj0gMCAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPj0gZXF1YWxMb2NhdGlvbikge1xuICAgICAgICAgIC8vIFdlIGFyZSBhZnRlciB0aGUgJz0nIGluIGEgbGV0IGNsYXVzZS4gVGhlIHZhbGlkIHZhbHVlcyBoZXJlIGFyZSB0aGUgbWVtYmVycyBvZiB0aGVcbiAgICAgICAgICAvLyB0ZW1wbGF0ZSByZWZlcmVuY2UncyB0eXBlIHBhcmFtZXRlci5cbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVNZXRhZGF0YSA9IHNlbGVjdG9ySW5mby5tYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRleHRUYWJsZSA9XG4gICAgICAgICAgICAgICAgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFRlbXBsYXRlQ29udGV4dChkaXJlY3RpdmVNZXRhZGF0YS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dFRhYmxlKSB7XG4gICAgICAgICAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhjb250ZXh0VGFibGUudmFsdWVzKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChiaW5kaW5nLmtleSAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPD0gKGJpbmRpbmcua2V5Lmxlbmd0aCAtIGtleS5sZW5ndGgpKSB7XG4gICAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlIHBvc2l0aW9uIGlzIGluIHRoZSBleHByZXNzaW9uIG9yIGFmdGVyIHRoZSBrZXkgb3IgdGhlcmUgaXMgbm8ga2V5LCByZXR1cm4gdGhlXG4gICAgICAgIC8vIGV4cHJlc3Npb24gY29tcGxldGlvbnNcbiAgICAgICAgaWYgKChiaW5kaW5nLmV4cHJlc3Npb24gJiYgaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5leHByZXNzaW9uLmFzdC5zcGFuKSkgfHxcbiAgICAgICAgICAgIChiaW5kaW5nLmtleSAmJlxuICAgICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+IGJpbmRpbmcuc3Bhbi5zdGFydCArIChiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSkgfHxcbiAgICAgICAgICAgICFiaW5kaW5nLmtleSkge1xuICAgICAgICAgIGNvbnN0IHNwYW4gPSBuZXcgUGFyc2VTcGFuKDAsIHRoaXMuYXR0ci52YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgIHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICAgICAgICAgICAgYmluZGluZy5leHByZXNzaW9uID8gYmluZGluZy5leHByZXNzaW9uLmFzdCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQcm9wZXJ0eVJlYWQoc3BhbiwgbmV3IEltcGxpY2l0UmVjZWl2ZXIoc3BhbiksICcnKSxcbiAgICAgICAgICAgICAgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBrZXlDb21wbGV0aW9ucygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpIHtcbiAgICBjb25zdCBleHByZXNzaW9uUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGlmIChpblNwYW4oZXhwcmVzc2lvblBvc2l0aW9uLCBhc3QudmFsdWUuc3BhbikpIHtcbiAgICAgIGNvbnN0IGNvbXBsZXRpb25zID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIGFzdC52YWx1ZSwgZXhwcmVzc2lvblBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgICAgaWYgKGNvbXBsZXRpb25zKSB7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHZhbHVlOiBBU1QsIHBvc2l0aW9uPzogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgdmFsdWUsIHBvc2l0aW9uID09IG51bGwgPyB0aGlzLmF0dHJpYnV0ZVZhbHVlUG9zaXRpb24gOiBwb3NpdGlvbixcbiAgICAgICAgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLnN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogU3ltYm9sW10pOiBDb21wbGV0aW9ucyB7XG4gICAgcmV0dXJuIHN5bWJvbHMuZmlsdGVyKHMgPT4gIXMubmFtZS5zdGFydHNXaXRoKCdfXycpICYmIHMucHVibGljKVxuICAgICAgICAubWFwKHN5bWJvbCA9PiA8Q29tcGxldGlvbj57a2luZDogc3ltYm9sLmtpbmQsIG5hbWU6IHN5bWJvbC5uYW1lLCBzb3J0OiBzeW1ib2wubmFtZX0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgYXR0cmlidXRlVmFsdWVQb3NpdGlvbigpIHtcbiAgICBpZiAodGhpcy5hdHRyICYmIHRoaXMuYXR0ci52YWx1ZVNwYW4pIHtcbiAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uIC0gdGhpcy5hdHRyLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZVRleHQodGVtcGxhdGU6IFRlbXBsYXRlU291cmNlLCBzcGFuOiBTcGFuKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRlbXBsYXRlLnNvdXJjZS5zdWJzdHJpbmcoc3Bhbi5zdGFydCwgc3Bhbi5lbmQpO1xufVxuXG5mdW5jdGlvbiBuYW1lT2ZBdHRyKGF0dHI6IEF0dHJJbmZvKTogc3RyaW5nIHtcbiAgbGV0IG5hbWUgPSBhdHRyLm5hbWU7XG4gIGlmIChhdHRyLm91dHB1dCkge1xuICAgIG5hbWUgPSByZW1vdmVTdWZmaXgobmFtZSwgJ0V2ZW50cycpO1xuICAgIG5hbWUgPSByZW1vdmVTdWZmaXgobmFtZSwgJ0NoYW5nZWQnKTtcbiAgfVxuICBsZXQgcmVzdWx0ID0gW25hbWVdO1xuICBpZiAoYXR0ci5pbnB1dCkge1xuICAgIHJlc3VsdC51bnNoaWZ0KCdbJyk7XG4gICAgcmVzdWx0LnB1c2goJ10nKTtcbiAgfVxuICBpZiAoYXR0ci5vdXRwdXQpIHtcbiAgICByZXN1bHQudW5zaGlmdCgnKCcpO1xuICAgIHJlc3VsdC5wdXNoKCcpJyk7XG4gIH1cbiAgaWYgKGF0dHIudGVtcGxhdGUpIHtcbiAgICByZXN1bHQudW5zaGlmdCgnKicpO1xuICB9XG4gIHJldHVybiByZXN1bHQuam9pbignJyk7XG59XG5cbmNvbnN0IHRlbXBsYXRlQXR0ciA9IC9eKFxcdys6KT8odGVtcGxhdGUkfF5cXCopLztcbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRDc3NTZWxlY3RvcihlbGVtZW50OiBFbGVtZW50KTogQ3NzU2VsZWN0b3Ige1xuICBjb25zdCBjc3NTZWxlY3RvciA9IG5ldyBDc3NTZWxlY3RvcigpO1xuICBsZXQgZWxOYW1lTm9OcyA9IHNwbGl0TnNOYW1lKGVsZW1lbnQubmFtZSlbMV07XG5cbiAgY3NzU2VsZWN0b3Iuc2V0RWxlbWVudChlbE5hbWVOb05zKTtcblxuICBmb3IgKGxldCBhdHRyIG9mIGVsZW1lbnQuYXR0cnMpIHtcbiAgICBpZiAoIWF0dHIubmFtZS5tYXRjaCh0ZW1wbGF0ZUF0dHIpKSB7XG4gICAgICBsZXQgW18sIGF0dHJOYW1lTm9Oc10gPSBzcGxpdE5zTmFtZShhdHRyLm5hbWUpO1xuICAgICAgY3NzU2VsZWN0b3IuYWRkQXR0cmlidXRlKGF0dHJOYW1lTm9OcywgYXR0ci52YWx1ZSk7XG4gICAgICBpZiAoYXR0ci5uYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ2NsYXNzJykge1xuICAgICAgICBjb25zdCBjbGFzc2VzID0gYXR0ci52YWx1ZS5zcGxpdCgvcysvZyk7XG4gICAgICAgIGNsYXNzZXMuZm9yRWFjaChjbGFzc05hbWUgPT4gY3NzU2VsZWN0b3IuYWRkQ2xhc3NOYW1lKGNsYXNzTmFtZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gY3NzU2VsZWN0b3I7XG59XG5cbmZ1bmN0aW9uIGZvbGRBdHRycyhhdHRyczogQXR0ckluZm9bXSk6IEF0dHJJbmZvW10ge1xuICBsZXQgaW5wdXRPdXRwdXQgPSBuZXcgTWFwPHN0cmluZywgQXR0ckluZm8+KCk7XG4gIGxldCB0ZW1wbGF0ZXMgPSBuZXcgTWFwPHN0cmluZywgQXR0ckluZm8+KCk7XG4gIGxldCByZXN1bHQ6IEF0dHJJbmZvW10gPSBbXTtcbiAgYXR0cnMuZm9yRWFjaChhdHRyID0+IHtcbiAgICBpZiAoYXR0ci5mcm9tSHRtbCkge1xuICAgICAgcmV0dXJuIGF0dHI7XG4gICAgfVxuICAgIGlmIChhdHRyLnRlbXBsYXRlKSB7XG4gICAgICBsZXQgZHVwbGljYXRlID0gdGVtcGxhdGVzLmdldChhdHRyLm5hbWUpO1xuICAgICAgaWYgKCFkdXBsaWNhdGUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe25hbWU6IGF0dHIubmFtZSwgdGVtcGxhdGU6IHRydWV9KTtcbiAgICAgICAgdGVtcGxhdGVzLnNldChhdHRyLm5hbWUsIGF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYXR0ci5pbnB1dCB8fCBhdHRyLm91dHB1dCkge1xuICAgICAgbGV0IGR1cGxpY2F0ZSA9IGlucHV0T3V0cHV0LmdldChhdHRyLm5hbWUpO1xuICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICBkdXBsaWNhdGUuaW5wdXQgPSBkdXBsaWNhdGUuaW5wdXQgfHwgYXR0ci5pbnB1dDtcbiAgICAgICAgZHVwbGljYXRlLm91dHB1dCA9IGR1cGxpY2F0ZS5vdXRwdXQgfHwgYXR0ci5vdXRwdXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgY2xvbmVBdHRyOiBBdHRySW5mbyA9IHtuYW1lOiBhdHRyLm5hbWV9O1xuICAgICAgICBpZiAoYXR0ci5pbnB1dCkgY2xvbmVBdHRyLmlucHV0ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGF0dHIub3V0cHV0KSBjbG9uZUF0dHIub3V0cHV0ID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0LnB1c2goY2xvbmVBdHRyKTtcbiAgICAgICAgaW5wdXRPdXRwdXQuc2V0KGF0dHIubmFtZSwgY2xvbmVBdHRyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBleHBhbmRlZEF0dHIoYXR0cjogQXR0ckluZm8pOiBBdHRySW5mb1tdIHtcbiAgaWYgKGF0dHIuaW5wdXQgJiYgYXR0ci5vdXRwdXQpIHtcbiAgICByZXR1cm4gW1xuICAgICAgYXR0ciwge25hbWU6IGF0dHIubmFtZSwgaW5wdXQ6IHRydWUsIG91dHB1dDogZmFsc2V9LFxuICAgICAge25hbWU6IGF0dHIubmFtZSwgaW5wdXQ6IGZhbHNlLCBvdXRwdXQ6IHRydWV9XG4gICAgXTtcbiAgfVxuICByZXR1cm4gW2F0dHJdO1xufVxuXG5mdW5jdGlvbiBsb3dlck5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5hbWUgJiYgKG5hbWVbMF0udG9Mb3dlckNhc2UoKSArIG5hbWUuc3Vic3RyKDEpKTtcbn1cbiJdfQ==