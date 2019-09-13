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
            return attributeCompletionsForElement(info, item.name, item);
        }
        return [];
    }
    function attributeCompletionsForElement(info, elementName, element) {
        var attributes = getAttributeInfosForElement(info, elementName, element);
        // Map all the attributes to a completion
        return attributes.map(function (attr) {
            var kind = attr.fromHtml ? types_1.CompletionKind.HTML_ATTRIBUTE : types_1.CompletionKind.ATTRIBUTE;
            return {
                name: nameOfAttr(attr),
                // Need to cast to unknown because Angular's CompletionKind includes HTML
                // entites.
                kind: kind,
                sortText: attr.name,
            };
        });
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
                    var inputs_1 = directive.inputs, outputs_1 = directive.outputs;
                    attrs_1.push.apply(attrs_1, tslib_1.__spread(Object.keys(inputs_1).map(function (name) { return ({ name: inputs_1[name], input: true }); })));
                    attrs_1.push.apply(attrs_1, tslib_1.__spread(Object.keys(outputs_1).map(function (name) { return ({ name: outputs_1[name], output: true }); })));
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
        // Return components and html elements
        return uniqueByName(htmlElements.concat(components));
    }
    /**
     * Filter the specified `entries` by unique name.
     * @param entries Completion Entries
     */
    function uniqueByName(entries) {
        var e_1, _a;
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
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) _a.call(entries_1);
            }
            finally { if (e_1) throw e_1.error; }
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
                var selector_1 = selectors.filter(function (s) { return s.attrs.some(function (attr, i) { return i % 2 == 0 && attr == key_1; }); })[0];
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
                        var attrNames = selector_1.attrs.filter(function (_, i) { return i % 2 == 0; });
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
        var e_2, _a;
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1c7SUFDbFcsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsNkRBQWtGO0lBQ2xGLDZEQUFxSjtJQUVySixJQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUVqQyxJQUFNLGtCQUFrQixHQUFHO1FBQ3pCLElBQUksRUFBRSxJQUFJO1FBQ1YsTUFBTSxFQUFFLElBQUk7UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7UUFDVixLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDO0lBRUYsU0FBZ0Isc0JBQXNCLENBQ2xDLFlBQXVCLEVBQUUsUUFBZ0I7UUFDM0MsSUFBSSxNQUFNLEdBQXlCLEVBQUUsQ0FBQztRQUMvQixJQUFBLDhCQUFPLEVBQUUsZ0NBQVEsQ0FBaUI7UUFDekMsNkVBQTZFO1FBQzdFLElBQU0sZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hELElBQU0sSUFBSSxHQUFHLG1CQUFRLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDL0IsTUFBTSxHQUFHLGtCQUFrQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqRDthQUFNO1lBQ0wsSUFBTSxhQUFXLEdBQUcsZ0JB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ZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0UGF0aCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQm91bmRUZXh0QXN0LCBDc3NTZWxlY3RvciwgRWxlbWVudCwgRWxlbWVudEFzdCwgSW1wbGljaXRSZWNlaXZlciwgTkFNRURfRU5USVRJRVMsIE5vZGUgYXMgSHRtbEFzdCwgTnVsbFRlbXBsYXRlVmlzaXRvciwgUGFyc2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFNlbGVjdG9yTWF0Y2hlciwgVGFnQ29udGVudFR5cGUsIFRleHQsIGZpbmROb2RlLCBnZXRIdG1sVGFnRGVmaW5pdGlvbiwgc3BsaXROc05hbWV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcblxuaW1wb3J0IHtBc3RSZXN1bHQsIEF0dHJJbmZvfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25Db21wbGV0aW9uc30gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge2F0dHJpYnV0ZU5hbWVzLCBlbGVtZW50TmFtZXMsIGV2ZW50TmFtZXMsIHByb3BlcnR5TmFtZXN9IGZyb20gJy4vaHRtbF9pbmZvJztcbmltcG9ydCB7Q29tcGxldGlvbktpbmQsIFNwYW4sIFN5bWJvbCwgU3ltYm9sVGFibGUsIFRlbXBsYXRlU291cmNlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZmxhdHRlbiwgZ2V0U2VsZWN0b3JzLCBoYXNUZW1wbGF0ZVJlZmVyZW5jZSwgaW5TcGFuLCByZW1vdmVTdWZmaXgsIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IFRFTVBMQVRFX0FUVFJfUFJFRklYID0gJyonO1xuXG5jb25zdCBoaWRkZW5IdG1sRWxlbWVudHMgPSB7XG4gIGh0bWw6IHRydWUsXG4gIHNjcmlwdDogdHJ1ZSxcbiAgbm9zY3JpcHQ6IHRydWUsXG4gIGJhc2U6IHRydWUsXG4gIGJvZHk6IHRydWUsXG4gIHRpdGxlOiB0cnVlLFxuICBoZWFkOiB0cnVlLFxuICBsaW5rOiB0cnVlLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlQ29tcGxldGlvbnMoXG4gICAgdGVtcGxhdGVJbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGxldCByZXN1bHQ6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIGNvbnN0IHtodG1sQXN0LCB0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIC8vIFRoZSB0ZW1wbGF0ZU5vZGUgc3RhcnRzIGF0IHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyIHNvIHdlIGFkZCAxIHRvIHNraXAgaXQuXG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBmaW5kTm9kZShodG1sQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgY29uc3QgbW9zdFNwZWNpZmljID0gcGF0aC50YWlsO1xuICBpZiAocGF0aC5lbXB0eSB8fCAhbW9zdFNwZWNpZmljKSB7XG4gICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYXN0UG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gbW9zdFNwZWNpZmljLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIG1vc3RTcGVjaWZpYy52aXNpdChcbiAgICAgICAge1xuICAgICAgICAgIHZpc2l0RWxlbWVudChhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGFnU3BhbiA9IHNwYW5PZihhc3Quc291cmNlU3Bhbik7XG4gICAgICAgICAgICBjb25zdCB0YWdMZW4gPSBhc3QubmFtZS5sZW5ndGg7XG4gICAgICAgICAgICAvLyArIDEgZm9yIHRoZSBvcGVuaW5nIGFuZ2xlIGJyYWNrZXRcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDw9IHN0YXJ0VGFnU3Bhbi5zdGFydCArIHRhZ0xlbiArIDEpIHtcbiAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGluIHRoZSB0YWcgdGhlbiByZXR1cm4gdGhlIGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDwgc3RhcnRUYWdTcGFuLmVuZCkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIGF0dHJpYnV0ZSBzZWN0aW9uIG9mIHRoZSBlbGVtZW50IChidXQgbm90IGluIGFuIGF0dHJpYnV0ZSkuXG4gICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRBdHRyaWJ1dGUoYXN0KSB7XG4gICAgICAgICAgICBpZiAoIWFzdC52YWx1ZVNwYW4gfHwgIWluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXN0LnZhbHVlU3BhbikpKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUuIFNob3cgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QudmFsdWVTcGFuICYmIGluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXN0LnZhbHVlU3BhbikpKSB7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uLCBhc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRUZXh0KGFzdCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgYXJlIGluIGEgZW50aXR5LlxuICAgICAgICAgICAgcmVzdWx0ID0gZW50aXR5Q29tcGxldGlvbnMoZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZSwgc3Bhbk9mKGFzdCkpLCBhc3RQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIHJlc3VsdCA9IGludGVycG9sYXRpb25Db21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHRlbXBsYXRlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcGF0aC5maXJzdChFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBnZXRIdG1sVGFnRGVmaW5pdGlvbihlbGVtZW50Lm5hbWUpO1xuICAgICAgICAgICAgICBpZiAoZGVmaW5pdGlvbi5jb250ZW50VHlwZSA9PT0gVGFnQ29udGVudFR5cGUuUEFSU0FCTEVfREFUQSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBlbGVtZW50IGNhbiBob2xkIGNvbnRlbnQsIHNob3cgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gSWYgbm8gZWxlbWVudCBjb250YWluZXIsIGltcGxpZXMgcGFyc2FibGUgZGF0YSBzbyBzaG93IGVsZW1lbnRzLlxuICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdENvbW1lbnQoYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbihhc3QpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uQ2FzZShhc3QpIHt9XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgaXRlbSA9IHBhdGgudGFpbCBpbnN0YW5jZW9mIEVsZW1lbnQgPyBwYXRoLnRhaWwgOiBwYXRoLnBhcmVudE9mKHBhdGgudGFpbCk7XG4gIGlmIChpdGVtIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgIHJldHVybiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoaW5mbywgaXRlbS5uYW1lLCBpdGVtKTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChcbiAgICBpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcsIGVsZW1lbnQ/OiBFbGVtZW50KTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBhdHRyaWJ1dGVzID0gZ2V0QXR0cmlidXRlSW5mb3NGb3JFbGVtZW50KGluZm8sIGVsZW1lbnROYW1lLCBlbGVtZW50KTtcblxuICAvLyBNYXAgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIGEgY29tcGxldGlvblxuICByZXR1cm4gYXR0cmlidXRlcy5tYXAoYXR0ciA9PiB7XG4gICAgY29uc3Qga2luZCA9IGF0dHIuZnJvbUh0bWwgPyBDb21wbGV0aW9uS2luZC5IVE1MX0FUVFJJQlVURSA6IENvbXBsZXRpb25LaW5kLkFUVFJJQlVURTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmFtZU9mQXR0cihhdHRyKSxcbiAgICAgIC8vIE5lZWQgdG8gY2FzdCB0byB1bmtub3duIGJlY2F1c2UgQW5ndWxhcidzIENvbXBsZXRpb25LaW5kIGluY2x1ZGVzIEhUTUxcbiAgICAgIC8vIGVudGl0ZXMuXG4gICAgICBraW5kOiBraW5kIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICBzb3J0VGV4dDogYXR0ci5uYW1lLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRBdHRyaWJ1dGVJbmZvc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nLCBlbGVtZW50PzogRWxlbWVudCk6IEF0dHJJbmZvW10ge1xuICBjb25zdCBhdHRyaWJ1dGVzOiBBdHRySW5mb1tdID0gW107XG5cbiAgLy8gQWRkIGh0bWwgYXR0cmlidXRlc1xuICBjb25zdCBodG1sQXR0cmlidXRlcyA9IGF0dHJpYnV0ZU5hbWVzKGVsZW1lbnROYW1lKSB8fCBbXTtcbiAgaWYgKGh0bWxBdHRyaWJ1dGVzKSB7XG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLmh0bWxBdHRyaWJ1dGVzLm1hcDxBdHRySW5mbz4obmFtZSA9PiAoe25hbWUsIGZyb21IdG1sOiB0cnVlfSkpKTtcbiAgfVxuXG4gIC8vIEFkZCBodG1sIHByb3BlcnRpZXNcbiAgY29uc3QgaHRtbFByb3BlcnRpZXMgPSBwcm9wZXJ0eU5hbWVzKGVsZW1lbnROYW1lKTtcbiAgaWYgKGh0bWxQcm9wZXJ0aWVzKSB7XG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLmh0bWxQcm9wZXJ0aWVzLm1hcDxBdHRySW5mbz4obmFtZSA9PiAoe25hbWUsIGlucHV0OiB0cnVlfSkpKTtcbiAgfVxuXG4gIC8vIEFkZCBodG1sIGV2ZW50c1xuICBjb25zdCBodG1sRXZlbnRzID0gZXZlbnROYW1lcyhlbGVtZW50TmFtZSk7XG4gIGlmIChodG1sRXZlbnRzKSB7XG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLmh0bWxFdmVudHMubWFwPEF0dHJJbmZvPihuYW1lID0+ICh7bmFtZSwgb3V0cHV0OiB0cnVlfSkpKTtcbiAgfVxuXG4gIGNvbnN0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBpZiAoc2VsZWN0b3JzICYmIHNlbGVjdG9ycy5sZW5ndGgpIHtcbiAgICAvLyBBbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBhcmUgc2VsZWN0YWJsZSBzaG91bGQgYmUgc2hvd24uXG4gICAgY29uc3QgYXBwbGljYWJsZVNlbGVjdG9ycyA9XG4gICAgICAgIHNlbGVjdG9ycy5maWx0ZXIoc2VsZWN0b3IgPT4gIXNlbGVjdG9yLmVsZW1lbnQgfHwgc2VsZWN0b3IuZWxlbWVudCA9PSBlbGVtZW50TmFtZSk7XG4gICAgY29uc3Qgc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcyA9XG4gICAgICAgIGFwcGxpY2FibGVTZWxlY3RvcnMubWFwKHNlbGVjdG9yID0+ICh7c2VsZWN0b3IsIGF0dHJzOiBzZWxlY3Rvci5hdHRycy5maWx0ZXIoYSA9PiAhIWEpfSkpO1xuICAgIGxldCBhdHRycyA9IGZsYXR0ZW4oc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcy5tYXA8QXR0ckluZm9bXT4oc2VsZWN0b3JBbmRBdHRyID0+IHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvckFuZEF0dHIuc2VsZWN0b3IpICE7XG4gICAgICBjb25zdCByZXN1bHQgPSBzZWxlY3RvckFuZEF0dHIuYXR0cnMubWFwPEF0dHJJbmZvPihcbiAgICAgICAgICBuYW1lID0+ICh7bmFtZSwgaW5wdXQ6IG5hbWUgaW4gZGlyZWN0aXZlLmlucHV0cywgb3V0cHV0OiBuYW1lIGluIGRpcmVjdGl2ZS5vdXRwdXRzfSkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KSk7XG5cbiAgICAvLyBBZGQgdGVtcGxhdGUgYXR0cmlidXRlIGlmIGEgZGlyZWN0aXZlIGNvbnRhaW5zIGEgdGVtcGxhdGUgcmVmZXJlbmNlXG4gICAgc2VsZWN0b3JBbmRBdHRyaWJ1dGVOYW1lcy5mb3JFYWNoKHNlbGVjdG9yQW5kQXR0ciA9PiB7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IHNlbGVjdG9yQW5kQXR0ci5zZWxlY3RvcjtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3Rvcik7XG4gICAgICBpZiAoZGlyZWN0aXZlICYmIGhhc1RlbXBsYXRlUmVmZXJlbmNlKGRpcmVjdGl2ZS50eXBlKSAmJiBzZWxlY3Rvci5hdHRycy5sZW5ndGggJiZcbiAgICAgICAgICBzZWxlY3Rvci5hdHRyc1swXSkge1xuICAgICAgICBhdHRycy5wdXNoKHtuYW1lOiBzZWxlY3Rvci5hdHRyc1swXSwgdGVtcGxhdGU6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFsbCBpbnB1dCBhbmQgb3V0cHV0IHByb3BlcnRpZXMgb2YgdGhlIG1hdGNoaW5nIGRpcmVjdGl2ZXMgc2hvdWxkIGJlIGFkZGVkLlxuICAgIGNvbnN0IGVsZW1lbnRTZWxlY3RvciA9IGVsZW1lbnQgP1xuICAgICAgICBjcmVhdGVFbGVtZW50Q3NzU2VsZWN0b3IoZWxlbWVudCkgOlxuICAgICAgICBjcmVhdGVFbGVtZW50Q3NzU2VsZWN0b3IobmV3IEVsZW1lbnQoZWxlbWVudE5hbWUsIFtdLCBbXSwgbnVsbCAhLCBudWxsLCBudWxsKSk7XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcigpO1xuICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoc2VsZWN0b3JzKTtcbiAgICBtYXRjaGVyLm1hdGNoKGVsZW1lbnRTZWxlY3Rvciwgc2VsZWN0b3IgPT4ge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgIGlmIChkaXJlY3RpdmUpIHtcbiAgICAgICAgY29uc3Qge2lucHV0cywgb3V0cHV0c30gPSBkaXJlY3RpdmU7XG4gICAgICAgIGF0dHJzLnB1c2goLi4uT2JqZWN0LmtleXMoaW5wdXRzKS5tYXAobmFtZSA9PiAoe25hbWU6IGlucHV0c1tuYW1lXSwgaW5wdXQ6IHRydWV9KSkpO1xuICAgICAgICBhdHRycy5wdXNoKC4uLk9iamVjdC5rZXlzKG91dHB1dHMpLm1hcChuYW1lID0+ICh7bmFtZTogb3V0cHV0c1tuYW1lXSwgb3V0cHV0OiB0cnVlfSkpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIElmIGEgbmFtZSBzaG93cyB1cCB0d2ljZSwgZm9sZCBpdCBpbnRvIGEgc2luZ2xlIHZhbHVlLlxuICAgIGF0dHJzID0gZm9sZEF0dHJzKGF0dHJzKTtcblxuICAgIC8vIE5vdyBleHBhbmQgdGhlbSBiYWNrIG91dCB0byBlbnN1cmUgdGhhdCBpbnB1dC9vdXRwdXQgc2hvd3MgdXAgYXMgd2VsbCBhcyBpbnB1dCBhbmRcbiAgICAvLyBvdXRwdXQuXG4gICAgYXR0cmlidXRlcy5wdXNoKC4uLmZsYXR0ZW4oYXR0cnMubWFwKGV4cGFuZGVkQXR0cikpKTtcbiAgfVxuICByZXR1cm4gYXR0cmlidXRlcztcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGF0dHI6IEF0dHJpYnV0ZSk6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCFwYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gIGNvbnN0IHZpc2l0b3IgPVxuICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKGluZm8sIHBvc2l0aW9uLCBhdHRyLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHBhdGgsIGZhbHNlKSk7XG4gIHBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgaWYgKCF2aXNpdG9yLnJlc3VsdCB8fCAhdmlzaXRvci5yZXN1bHQubGVuZ3RoKSB7XG4gICAgLy8gVHJ5IGFsbHdvaW5nIHdpZGVuaW5nIHRoZSBwYXRoXG4gICAgY29uc3Qgd2lkZXJQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24sIC8qIGFsbG93V2lkZW5pbmcgKi8gdHJ1ZSk7XG4gICAgaWYgKHdpZGVyUGF0aC50YWlsKSB7XG4gICAgICBjb25zdCB3aWRlclZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICAgICAgaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgd2lkZXJQYXRoLCBmYWxzZSkpO1xuICAgICAgd2lkZXJQYXRoLnRhaWwudmlzaXQod2lkZXJWaXNpdG9yLCBudWxsKTtcbiAgICAgIHJldHVybiB3aWRlclZpc2l0b3IucmVzdWx0IHx8IFtdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaXRvci5yZXN1bHQgfHwgW107XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGh0bWxOYW1lcyA9IGVsZW1lbnROYW1lcygpLmZpbHRlcihuYW1lID0+ICEobmFtZSBpbiBoaWRkZW5IdG1sRWxlbWVudHMpKTtcblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgY29uc3QgZGlyZWN0aXZlRWxlbWVudHMgPSBnZXRTZWxlY3RvcnMoaW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdG9ycy5tYXAoc2VsZWN0b3IgPT4gc2VsZWN0b3IuZWxlbWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihuYW1lID0+ICEhbmFtZSkgYXMgc3RyaW5nW107XG5cbiAgY29uc3QgY29tcG9uZW50cyA9IGRpcmVjdGl2ZUVsZW1lbnRzLm1hcChuYW1lID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIC8vIE5lZWQgdG8gY2FzdCB0byB1bmtub3duIGJlY2F1c2UgQW5ndWxhcidzIENvbXBsZXRpb25LaW5kIGluY2x1ZGVzIEhUTUxcbiAgICAgIC8vIGVudGl0ZXMuXG4gICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5DT01QT05FTlQgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xuICBjb25zdCBodG1sRWxlbWVudHMgPSBodG1sTmFtZXMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXMgSFRNTFxuICAgICAgLy8gZW50aXRlcy5cbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkVMRU1FTlQgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xuXG4gIC8vIFJldHVybiBjb21wb25lbnRzIGFuZCBodG1sIGVsZW1lbnRzXG4gIHJldHVybiB1bmlxdWVCeU5hbWUoaHRtbEVsZW1lbnRzLmNvbmNhdChjb21wb25lbnRzKSk7XG59XG5cbi8qKlxuICogRmlsdGVyIHRoZSBzcGVjaWZpZWQgYGVudHJpZXNgIGJ5IHVuaXF1ZSBuYW1lLlxuICogQHBhcmFtIGVudHJpZXMgQ29tcGxldGlvbiBFbnRyaWVzXG4gKi9cbmZ1bmN0aW9uIHVuaXF1ZUJ5TmFtZShlbnRyaWVzOiB0cy5Db21wbGV0aW9uRW50cnlbXSkge1xuICBjb25zdCByZXN1bHRzID0gW107XG4gIGNvbnN0IHNldCA9IG5ldyBTZXQoKTtcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKCFzZXQuaGFzKGVudHJ5Lm5hbWUpKSB7XG4gICAgICBzZXQuYWRkKGVudHJ5Lm5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKGVudHJ5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVudGl0eUNvbXBsZXRpb25zKHZhbHVlOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGVudGl0eSBjb21wbGV0aW9uc1xuICBjb25zdCByZSA9IC8mW0EtWmEtel0qOz8oPyFcXGQpL2c7XG4gIGxldCBmb3VuZDogUmVnRXhwRXhlY0FycmF5fG51bGw7XG4gIGxldCByZXN1bHQ6IHRzLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIHdoaWxlIChmb3VuZCA9IHJlLmV4ZWModmFsdWUpKSB7XG4gICAgbGV0IGxlbiA9IGZvdW5kWzBdLmxlbmd0aDtcbiAgICBpZiAocG9zaXRpb24gPj0gZm91bmQuaW5kZXggJiYgcG9zaXRpb24gPCAoZm91bmQuaW5kZXggKyBsZW4pKSB7XG4gICAgICByZXN1bHQgPSBPYmplY3Qua2V5cyhOQU1FRF9FTlRJVElFUykubWFwKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5hbWU6IGAmJHtuYW1lfTtgLFxuICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCB0byB1bmtub3duIGJlY2F1c2UgQW5ndWxhcidzIENvbXBsZXRpb25LaW5kIGluY2x1ZGVzXG4gICAgICAgICAgLy8gSFRNTCBlbnRpdGVzLlxuICAgICAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkVOVElUWSBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgYW4gaW50ZXJwb2xhdGlvbiBpbiBhdCB0aGUgcG9zaXRpb24uXG4gIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCF0ZW1wbGF0ZVBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgaW5mbywgcG9zaXRpb24sIHVuZGVmaW5lZCxcbiAgICAgICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyksIHRlbXBsYXRlUGF0aCwgZmFsc2UpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB1bmlxdWVCeU5hbWUodmlzaXRvci5yZXN1bHQgfHwgW10pO1xufVxuXG4vLyBUaGVyZSBpcyBhIHNwZWNpYWwgY2FzZSBvZiBIVE1MIHdoZXJlIHRleHQgdGhhdCBjb250YWlucyBhIHVuY2xvc2VkIHRhZyBpcyB0cmVhdGVkIGFzXG4vLyB0ZXh0LiBGb3IgZXhhcGxlICc8aDE+IFNvbWUgPGEgdGV4dCA8L2gxPicgcHJvZHVjZXMgYSB0ZXh0IG5vZGVzIGluc2lkZSBvZiB0aGUgSDFcbi8vIGVsZW1lbnQgXCJTb21lIDxhIHRleHRcIi4gV2UsIGhvd2V2ZXIsIHdhbnQgdG8gdHJlYXQgdGhpcyBhcyBpZiB0aGUgdXNlciB3YXMgcmVxdWVzdGluZ1xuLy8gdGhlIGF0dHJpYnV0ZXMgb2YgYW4gXCJhXCIgZWxlbWVudCwgbm90IHJlcXVlc3RpbmcgY29tcGxldGlvbiBpbiB0aGUgYSB0ZXh0IGVsZW1lbnQuIFRoaXNcbi8vIGNvZGUgY2hlY2tzIGZvciB0aGlzIGNhc2UgYW5kIHJldHVybnMgZWxlbWVudCBjb21wbGV0aW9ucyBpZiBpdCBpcyBkZXRlY3RlZCBvciB1bmRlZmluZWRcbi8vIGlmIGl0IGlzIG5vdC5cbmZ1bmN0aW9uIHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnMoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsO1xuICBpZiAodGFpbCBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRhaWwudmFsdWUubWF0Y2goLzwoXFx3KFxcd3xcXGR8LSkqOik/KFxcdyhcXHd8XFxkfC0pKilcXHMvKTtcbiAgICAvLyBUaGUgcG9zaXRpb24gbXVzdCBiZSBhZnRlciB0aGUgbWF0Y2gsIG90aGVyd2lzZSB3ZSBhcmUgc3RpbGwgaW4gYSBwbGFjZSB3aGVyZSBlbGVtZW50c1xuICAgIC8vIGFyZSBleHBlY3RlZCAoc3VjaCBhcyBgPHxhYCBvciBgPGF8YDsgd2Ugb25seSB3YW50IGF0dHJpYnV0ZXMgZm9yIGA8YSB8YCBvciBhZnRlcikuXG4gICAgaWYgKG1hdGNoICYmXG4gICAgICAgIHBhdGgucG9zaXRpb24gPj0gKG1hdGNoLmluZGV4IHx8IDApICsgbWF0Y2hbMF0ubGVuZ3RoICsgdGFpbC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBtYXRjaFszXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBOdWxsVGVtcGxhdGVWaXNpdG9yIHtcbiAgcHJpdmF0ZSBnZXRFeHByZXNzaW9uU2NvcGU6ICgpID0+IFN5bWJvbFRhYmxlO1xuICByZXN1bHQ6IHRzLkNvbXBsZXRpb25FbnRyeVtdfHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHBvc2l0aW9uOiBudW1iZXIsIHByaXZhdGUgYXR0cj86IEF0dHJpYnV0ZSxcbiAgICAgIGdldEV4cHJlc3Npb25TY29wZT86ICgpID0+IFN5bWJvbFRhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSA9IGdldEV4cHJlc3Npb25TY29wZSB8fCAoKCkgPT4gaW5mby50ZW1wbGF0ZS5tZW1iZXJzKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogRWxlbWVudEFzdCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmF0dHIgJiYgZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbykgJiYgdGhpcy5hdHRyLm5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCkpIHtcbiAgICAgIC8vIFRoZSB2YWx1ZSBpcyBhIHRlbXBsYXRlIGV4cHJlc3Npb24gYnV0IHRoZSBleHByZXNzaW9uIEFTVCB3YXMgbm90IHByb2R1Y2VkIHdoZW4gdGhlXG4gICAgICAvLyBUZW1wbGF0ZUFzdCB3YXMgcHJvZHVjZSBzb1xuICAgICAgLy8gZG8gdGhhdCBub3cuXG5cbiAgICAgIGNvbnN0IGtleSA9IHRoaXMuYXR0ci5uYW1lLnN1YnN0cihURU1QTEFURV9BVFRSX1BSRUZJWC5sZW5ndGgpO1xuXG4gICAgICAvLyBGaW5kIHRoZSBzZWxlY3RvclxuICAgICAgY29uc3Qgc2VsZWN0b3JJbmZvID0gZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbyk7XG4gICAgICBjb25zdCBzZWxlY3RvcnMgPSBzZWxlY3RvckluZm8uc2VsZWN0b3JzO1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPVxuICAgICAgICAgIHNlbGVjdG9ycy5maWx0ZXIocyA9PiBzLmF0dHJzLnNvbWUoKGF0dHIsIGkpID0+IGkgJSAyID09IDAgJiYgYXR0ciA9PSBrZXkpKVswXTtcblxuICAgICAgY29uc3QgdGVtcGxhdGVCaW5kaW5nUmVzdWx0ID1cbiAgICAgICAgICB0aGlzLmluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZVRlbXBsYXRlQmluZGluZ3Moa2V5LCB0aGlzLmF0dHIudmFsdWUsIG51bGwsIDApO1xuXG4gICAgICAvLyBmaW5kIHRoZSB0ZW1wbGF0ZSBiaW5kaW5nIHRoYXQgY29udGFpbnMgdGhlIHBvc2l0aW9uXG4gICAgICBpZiAoIXRoaXMuYXR0ci52YWx1ZVNwYW4pIHJldHVybjtcbiAgICAgIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IGJpbmRpbmdzID0gdGVtcGxhdGVCaW5kaW5nUmVzdWx0LnRlbXBsYXRlQmluZGluZ3M7XG4gICAgICBjb25zdCBiaW5kaW5nID1cbiAgICAgICAgICBiaW5kaW5ncy5maW5kKFxuICAgICAgICAgICAgICBiaW5kaW5nID0+IGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuc3BhbiwgLyogZXhjbHVzaXZlICovIHRydWUpKSB8fFxuICAgICAgICAgIGJpbmRpbmdzLmZpbmQoYmluZGluZyA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLnNwYW4pKTtcblxuICAgICAgY29uc3Qga2V5Q29tcGxldGlvbnMgPSAoKSA9PiB7XG4gICAgICAgIGxldCBrZXlzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBjb25zdCBhdHRyTmFtZXMgPSBzZWxlY3Rvci5hdHRycy5maWx0ZXIoKF8sIGkpID0+IGkgJSAyID09IDApO1xuICAgICAgICAgIGtleXMgPSBhdHRyTmFtZXMuZmlsdGVyKG5hbWUgPT4gbmFtZS5zdGFydHNXaXRoKGtleSkgJiYgbmFtZSAhPSBrZXkpXG4gICAgICAgICAgICAgICAgICAgICAubWFwKG5hbWUgPT4gbG93ZXJOYW1lKG5hbWUuc3Vic3RyKGtleS5sZW5ndGgpKSk7XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKCdsZXQnKTtcbiAgICAgICAgdGhpcy5yZXN1bHQgPSBrZXlzLm1hcChrZXkgPT4ge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgICAvLyBOZWVkIHRvIGNhc3QgdG8gdW5rbm93biBiZWNhdXNlIEFuZ3VsYXIncyBDb21wbGV0aW9uS2luZCBpbmNsdWRlc1xuICAgICAgICAgICAgLy8gSFRNTCBlbnRpdGVzLlxuICAgICAgICAgICAga2luZDogQ29tcGxldGlvbktpbmQuS0VZIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgICAgICBzb3J0VGV4dDoga2V5LFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCFiaW5kaW5nIHx8IChiaW5kaW5nLmtleSA9PSBrZXkgJiYgIWJpbmRpbmcuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgLy8gV2UgYXJlIGluIHRoZSByb290IGJpbmRpbmcuIFdlIHNob3VsZCByZXR1cm4gYGxldGAgYW5kIGtleXMgdGhhdCBhcmUgbGVmdCBpbiB0aGVcbiAgICAgICAgLy8gc2VsZWN0b3IuXG4gICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICB9IGVsc2UgaWYgKGJpbmRpbmcua2V5SXNWYXIpIHtcbiAgICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IHRoaXMuYXR0ci52YWx1ZS5pbmRleE9mKCc9Jyk7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gW107XG4gICAgICAgIGlmIChlcXVhbExvY2F0aW9uID49IDAgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID49IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgICAvLyBXZSBhcmUgYWZ0ZXIgdGhlICc9JyBpbiBhIGxldCBjbGF1c2UuIFRoZSB2YWxpZCB2YWx1ZXMgaGVyZSBhcmUgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRUYWJsZSkge1xuICAgICAgICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29udGV4dFRhYmxlLnZhbHVlcygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYmluZGluZy5rZXkgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uIDw9IChiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSkge1xuICAgICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBwb3NpdGlvbiBpcyBpbiB0aGUgZXhwcmVzc2lvbiBvciBhZnRlciB0aGUga2V5IG9yIHRoZXJlIGlzIG5vIGtleSwgcmV0dXJuIHRoZVxuICAgICAgICAvLyBleHByZXNzaW9uIGNvbXBsZXRpb25zXG4gICAgICAgIGlmICgoYmluZGluZy5leHByZXNzaW9uICYmIGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuZXhwcmVzc2lvbi5hc3Quc3BhbikpIHx8XG4gICAgICAgICAgICAoYmluZGluZy5rZXkgJiZcbiAgICAgICAgICAgICB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBiaW5kaW5nLnNwYW4uc3RhcnQgKyAoYmluZGluZy5rZXkubGVuZ3RoIC0ga2V5Lmxlbmd0aCkpIHx8XG4gICAgICAgICAgICAhYmluZGluZy5rZXkpIHtcbiAgICAgICAgICBjb25zdCBzcGFuID0gbmV3IFBhcnNlU3BhbigwLCB0aGlzLmF0dHIudmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoXG4gICAgICAgICAgICAgIGJpbmRpbmcuZXhwcmVzc2lvbiA/IGJpbmRpbmcuZXhwcmVzc2lvbi5hc3QgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUHJvcGVydHlSZWFkKHNwYW4sIG5ldyBJbXBsaWNpdFJlY2VpdmVyKHNwYW4pLCAnJyksXG4gICAgICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KSB7XG4gICAgY29uc3QgZXhwcmVzc2lvblBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIGV4cHJlc3Npb25Qb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgIGlmIChjb21wbGV0aW9ucykge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29tcGxldGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh2YWx1ZTogQVNULCBwb3NpdGlvbj86IG51bWJlcikge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLCBwb3NpdGlvbiA9PSBudWxsID8gdGhpcy5hdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uIDogcG9zaXRpb24sXG4gICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgaWYgKHN5bWJvbHMpIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IFN5bWJvbFtdKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBzeW1ib2xzLmZpbHRlcihzID0+ICFzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSAmJiBzLnB1YmxpYykubWFwKHN5bWJvbCA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgIHNvcnRUZXh0OiBzeW1ib2wubmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldCBhdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uKCkge1xuICAgIGlmICh0aGlzLmF0dHIgJiYgdGhpcy5hdHRyLnZhbHVlU3Bhbikge1xuICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UsIHNwYW46IFNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmZ1bmN0aW9uIG5hbWVPZkF0dHIoYXR0cjogQXR0ckluZm8pOiBzdHJpbmcge1xuICBsZXQgbmFtZSA9IGF0dHIubmFtZTtcbiAgaWYgKGF0dHIub3V0cHV0KSB7XG4gICAgbmFtZSA9IHJlbW92ZVN1ZmZpeChuYW1lLCAnRXZlbnRzJyk7XG4gICAgbmFtZSA9IHJlbW92ZVN1ZmZpeChuYW1lLCAnQ2hhbmdlZCcpO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IFtuYW1lXTtcbiAgaWYgKGF0dHIuaW5wdXQpIHtcbiAgICByZXN1bHQudW5zaGlmdCgnWycpO1xuICAgIHJlc3VsdC5wdXNoKCddJyk7XG4gIH1cbiAgaWYgKGF0dHIub3V0cHV0KSB7XG4gICAgcmVzdWx0LnVuc2hpZnQoJygnKTtcbiAgICByZXN1bHQucHVzaCgnKScpO1xuICB9XG4gIGlmIChhdHRyLnRlbXBsYXRlKSB7XG4gICAgcmVzdWx0LnVuc2hpZnQoJyonKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xufVxuXG5jb25zdCB0ZW1wbGF0ZUF0dHIgPSAvXihcXHcrOik/KHRlbXBsYXRlJHxeXFwqKS87XG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50Q3NzU2VsZWN0b3IoZWxlbWVudDogRWxlbWVudCk6IENzc1NlbGVjdG9yIHtcbiAgY29uc3QgY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgY29uc3QgZWxOYW1lTm9OcyA9IHNwbGl0TnNOYW1lKGVsZW1lbnQubmFtZSlbMV07XG5cbiAgY3NzU2VsZWN0b3Iuc2V0RWxlbWVudChlbE5hbWVOb05zKTtcblxuICBmb3IgKGNvbnN0IGF0dHIgb2YgZWxlbWVudC5hdHRycykge1xuICAgIGlmICghYXR0ci5uYW1lLm1hdGNoKHRlbXBsYXRlQXR0cikpIHtcbiAgICAgIGNvbnN0IFtfLCBhdHRyTmFtZU5vTnNdID0gc3BsaXROc05hbWUoYXR0ci5uYW1lKTtcbiAgICAgIGNzc1NlbGVjdG9yLmFkZEF0dHJpYnV0ZShhdHRyTmFtZU5vTnMsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKGF0dHIubmFtZS50b0xvd2VyQ2FzZSgpID09ICdjbGFzcycpIHtcbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGF0dHIudmFsdWUuc3BsaXQoL3MrL2cpO1xuICAgICAgICBjbGFzc2VzLmZvckVhY2goY2xhc3NOYW1lID0+IGNzc1NlbGVjdG9yLmFkZENsYXNzTmFtZShjbGFzc05hbWUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNzc1NlbGVjdG9yO1xufVxuXG5mdW5jdGlvbiBmb2xkQXR0cnMoYXR0cnM6IEF0dHJJbmZvW10pOiBBdHRySW5mb1tdIHtcbiAgY29uc3QgaW5wdXRPdXRwdXQgPSBuZXcgTWFwPHN0cmluZywgQXR0ckluZm8+KCk7XG4gIGNvbnN0IHRlbXBsYXRlcyA9IG5ldyBNYXA8c3RyaW5nLCBBdHRySW5mbz4oKTtcbiAgY29uc3QgcmVzdWx0OiBBdHRySW5mb1tdID0gW107XG4gIGF0dHJzLmZvckVhY2goYXR0ciA9PiB7XG4gICAgaWYgKGF0dHIuZnJvbUh0bWwpIHtcbiAgICAgIHJldHVybiBhdHRyO1xuICAgIH1cbiAgICBpZiAoYXR0ci50ZW1wbGF0ZSkge1xuICAgICAgY29uc3QgZHVwbGljYXRlID0gdGVtcGxhdGVzLmdldChhdHRyLm5hbWUpO1xuICAgICAgaWYgKCFkdXBsaWNhdGUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe25hbWU6IGF0dHIubmFtZSwgdGVtcGxhdGU6IHRydWV9KTtcbiAgICAgICAgdGVtcGxhdGVzLnNldChhdHRyLm5hbWUsIGF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYXR0ci5pbnB1dCB8fCBhdHRyLm91dHB1dCkge1xuICAgICAgY29uc3QgZHVwbGljYXRlID0gaW5wdXRPdXRwdXQuZ2V0KGF0dHIubmFtZSk7XG4gICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgIGR1cGxpY2F0ZS5pbnB1dCA9IGR1cGxpY2F0ZS5pbnB1dCB8fCBhdHRyLmlucHV0O1xuICAgICAgICBkdXBsaWNhdGUub3V0cHV0ID0gZHVwbGljYXRlLm91dHB1dCB8fCBhdHRyLm91dHB1dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGNsb25lQXR0cjogQXR0ckluZm8gPSB7bmFtZTogYXR0ci5uYW1lfTtcbiAgICAgICAgaWYgKGF0dHIuaW5wdXQpIGNsb25lQXR0ci5pbnB1dCA9IHRydWU7XG4gICAgICAgIGlmIChhdHRyLm91dHB1dCkgY2xvbmVBdHRyLm91dHB1dCA9IHRydWU7XG4gICAgICAgIHJlc3VsdC5wdXNoKGNsb25lQXR0cik7XG4gICAgICAgIGlucHV0T3V0cHV0LnNldChhdHRyLm5hbWUsIGNsb25lQXR0cik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZXhwYW5kZWRBdHRyKGF0dHI6IEF0dHJJbmZvKTogQXR0ckluZm9bXSB7XG4gIGlmIChhdHRyLmlucHV0ICYmIGF0dHIub3V0cHV0KSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIGF0dHIsIHtuYW1lOiBhdHRyLm5hbWUsIGlucHV0OiB0cnVlLCBvdXRwdXQ6IGZhbHNlfSxcbiAgICAgIHtuYW1lOiBhdHRyLm5hbWUsIGlucHV0OiBmYWxzZSwgb3V0cHV0OiB0cnVlfVxuICAgIF07XG4gIH1cbiAgcmV0dXJuIFthdHRyXTtcbn1cblxuZnVuY3Rpb24gbG93ZXJOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBuYW1lICYmIChuYW1lWzBdLnRvTG93ZXJDYXNlKCkgKyBuYW1lLnN1YnN0cigxKSk7XG59XG4iXX0=