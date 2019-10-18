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
            var applicableSelectors = selectors.filter(function (selector) { return !selector.element || selector.element === elementName; });
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
                    if (attr.name.toLowerCase() === 'class') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa1c7SUFDbFcsaUZBQStFO0lBRy9FLHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsNkRBQWtGO0lBQ2xGLDZEQUFxSjtJQUVySixJQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUVqQyxJQUFNLGtCQUFrQixHQUFHO1FBQ3pCLElBQUksRUFBRSxJQUFJO1FBQ1YsTUFBTSxFQUFFLElBQUk7UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7UUFDVixLQUFLLEVBQUUsSUFBSTtRQUNYLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDO0lBRUYsU0FBZ0Isc0JBQXNCLENBQ2xDLFlBQXVCLEVBQUUsUUFBZ0I7UUFDM0MsSUFBSSxNQUFNLEdBQXlCLEVBQUUsQ0FBQztRQUMvQixJQUFBLDhCQUFPLEVBQUUsZ0NBQVEsQ0FBaUI7UUFDekMsNkVBQTZFO1FBQzdFLElBQU0sZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hELElBQU0sSUFBSSxHQUFHLG1CQUFRLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDL0IsTUFBTSxHQUFHLGtCQUFrQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqRDthQUFNO1lBQ0wsSUFBTSxhQUFXLEdBQUcsZ0JB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SUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFBhdGgsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgQ3NzU2VsZWN0b3IsIEVsZW1lbnQsIEVsZW1lbnRBc3QsIEltcGxpY2l0UmVjZWl2ZXIsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUHJvcGVydHlSZWFkLCBTZWxlY3Rvck1hdGNoZXIsIFRhZ0NvbnRlbnRUeXBlLCBUZXh0LCBmaW5kTm9kZSwgZ2V0SHRtbFRhZ0RlZmluaXRpb24sIHNwbGl0TnNOYW1lfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9sYW5ndWFnZV9zZXJ2aWNlcyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0LCBBdHRySW5mb30gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uQ29tcGxldGlvbnN9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHthdHRyaWJ1dGVOYW1lcywgZWxlbWVudE5hbWVzLCBldmVudE5hbWVzLCBwcm9wZXJ0eU5hbWVzfSBmcm9tICcuL2h0bWxfaW5mbyc7XG5pbXBvcnQge0NvbXBsZXRpb25LaW5kLCBTcGFuLCBTeW1ib2wsIFN5bWJvbFRhYmxlLCBUZW1wbGF0ZVNvdXJjZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGZsYXR0ZW4sIGdldFNlbGVjdG9ycywgaGFzVGVtcGxhdGVSZWZlcmVuY2UsIGluU3BhbiwgcmVtb3ZlU3VmZml4LCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBURU1QTEFURV9BVFRSX1BSRUZJWCA9ICcqJztcblxuY29uc3QgaGlkZGVuSHRtbEVsZW1lbnRzID0ge1xuICBodG1sOiB0cnVlLFxuICBzY3JpcHQ6IHRydWUsXG4gIG5vc2NyaXB0OiB0cnVlLFxuICBiYXNlOiB0cnVlLFxuICBib2R5OiB0cnVlLFxuICB0aXRsZTogdHJ1ZSxcbiAgaGVhZDogdHJ1ZSxcbiAgbGluazogdHJ1ZSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKFxuICAgIHRlbXBsYXRlSW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBsZXQgcmVzdWx0OiB0cy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBjb25zdCB7aHRtbEFzdCwgdGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICAvLyBUaGUgdGVtcGxhdGVOb2RlIHN0YXJ0cyBhdCB0aGUgZGVsaW1pdGVyIGNoYXJhY3RlciBzbyB3ZSBhZGQgMSB0byBza2lwIGl0LlxuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZmluZE5vZGUoaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IG1vc3RTcGVjaWZpYyA9IHBhdGgudGFpbDtcbiAgaWYgKHBhdGguZW1wdHkgfHwgIW1vc3RTcGVjaWZpYykge1xuICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFzdFBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIG1vc3RTcGVjaWZpYy5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBtb3N0U3BlY2lmaWMudmlzaXQoXG4gICAgICAgIHtcbiAgICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydFRhZ1NwYW4gPSBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgY29uc3QgdGFnTGVuID0gYXN0Lm5hbWUubGVuZ3RoO1xuICAgICAgICAgICAgLy8gKyAxIGZvciB0aGUgb3BlbmluZyBhbmdsZSBicmFja2V0XG4gICAgICAgICAgICBpZiAodGVtcGxhdGVQb3NpdGlvbiA8PSBzdGFydFRhZ1NwYW4uc3RhcnQgKyB0YWdMZW4gKyAxKSB7XG4gICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBpbiB0aGUgdGFnIHRoZW4gcmV0dXJuIHRoZSBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA8IHN0YXJ0VGFnU3Bhbi5lbmQpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0QXR0cmlidXRlKGFzdCkge1xuICAgICAgICAgICAgaWYgKCFhc3QudmFsdWVTcGFuIHx8ICFpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIG5hbWUgb2YgYW4gYXR0cmlidXRlLiBTaG93IGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlU3BhbiAmJiBpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbiwgYXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0VGV4dChhc3QpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBpbiBhIGVudGl0eS5cbiAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29udGVudFR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlBBUlNBQkxFX0RBVEEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBjYW4gaG9sZCBjb250ZW50LCBzaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIElmIG5vIGVsZW1lbnQgY29udGFpbmVyLCBpbXBsaWVzIHBhcnNhYmxlIGRhdGEgc28gc2hvdyBlbGVtZW50cy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRDb21tZW50KGFzdCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb24oYXN0KSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0KSB7fVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGl0ZW0gPSBwYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50ID8gcGF0aC50YWlsIDogcGF0aC5wYXJlbnRPZihwYXRoLnRhaWwpO1xuICBpZiAoaXRlbSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIGl0ZW0ubmFtZSwgaXRlbSk7XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nLCBlbGVtZW50PzogRWxlbWVudCk6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZUluZm9zRm9yRWxlbWVudChpbmZvLCBlbGVtZW50TmFtZSwgZWxlbWVudCk7XG5cbiAgLy8gTWFwIGFsbCB0aGUgYXR0cmlidXRlcyB0byBhIGNvbXBsZXRpb25cbiAgcmV0dXJuIGF0dHJpYnV0ZXMubWFwKGF0dHIgPT4ge1xuICAgIGNvbnN0IGtpbmQgPSBhdHRyLmZyb21IdG1sID8gQ29tcGxldGlvbktpbmQuSFRNTF9BVFRSSUJVVEUgOiBDb21wbGV0aW9uS2luZC5BVFRSSUJVVEU7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IG5hbWVPZkF0dHIoYXR0ciksXG4gICAgICAvLyBOZWVkIHRvIGNhc3QgdG8gdW5rbm93biBiZWNhdXNlIEFuZ3VsYXIncyBDb21wbGV0aW9uS2luZCBpbmNsdWRlcyBIVE1MXG4gICAgICAvLyBlbnRpdGVzLlxuICAgICAga2luZDoga2luZCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IGF0dHIubmFtZSxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0QXR0cmlidXRlSW5mb3NGb3JFbGVtZW50KFxuICAgIGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZywgZWxlbWVudD86IEVsZW1lbnQpOiBBdHRySW5mb1tdIHtcbiAgY29uc3QgYXR0cmlidXRlczogQXR0ckluZm9bXSA9IFtdO1xuXG4gIC8vIEFkZCBodG1sIGF0dHJpYnV0ZXNcbiAgY29uc3QgaHRtbEF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVOYW1lcyhlbGVtZW50TmFtZSkgfHwgW107XG4gIGlmIChodG1sQXR0cmlidXRlcykge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5odG1sQXR0cmlidXRlcy5tYXA8QXR0ckluZm8+KG5hbWUgPT4gKHtuYW1lLCBmcm9tSHRtbDogdHJ1ZX0pKSk7XG4gIH1cblxuICAvLyBBZGQgaHRtbCBwcm9wZXJ0aWVzXG4gIGNvbnN0IGh0bWxQcm9wZXJ0aWVzID0gcHJvcGVydHlOYW1lcyhlbGVtZW50TmFtZSk7XG4gIGlmIChodG1sUHJvcGVydGllcykge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5odG1sUHJvcGVydGllcy5tYXA8QXR0ckluZm8+KG5hbWUgPT4gKHtuYW1lLCBpbnB1dDogdHJ1ZX0pKSk7XG4gIH1cblxuICAvLyBBZGQgaHRtbCBldmVudHNcbiAgY29uc3QgaHRtbEV2ZW50cyA9IGV2ZW50TmFtZXMoZWxlbWVudE5hbWUpO1xuICBpZiAoaHRtbEV2ZW50cykge1xuICAgIGF0dHJpYnV0ZXMucHVzaCguLi5odG1sRXZlbnRzLm1hcDxBdHRySW5mbz4obmFtZSA9PiAoe25hbWUsIG91dHB1dDogdHJ1ZX0pKSk7XG4gIH1cblxuICBjb25zdCB7c2VsZWN0b3JzLCBtYXA6IHNlbGVjdG9yTWFwfSA9IGdldFNlbGVjdG9ycyhpbmZvKTtcbiAgaWYgKHNlbGVjdG9ycyAmJiBzZWxlY3RvcnMubGVuZ3RoKSB7XG4gICAgLy8gQWxsIHRoZSBhdHRyaWJ1dGVzIHRoYXQgYXJlIHNlbGVjdGFibGUgc2hvdWxkIGJlIHNob3duLlxuICAgIGNvbnN0IGFwcGxpY2FibGVTZWxlY3RvcnMgPVxuICAgICAgICBzZWxlY3RvcnMuZmlsdGVyKHNlbGVjdG9yID0+ICFzZWxlY3Rvci5lbGVtZW50IHx8IHNlbGVjdG9yLmVsZW1lbnQgPT09IGVsZW1lbnROYW1lKTtcbiAgICBjb25zdCBzZWxlY3RvckFuZEF0dHJpYnV0ZU5hbWVzID1cbiAgICAgICAgYXBwbGljYWJsZVNlbGVjdG9ycy5tYXAoc2VsZWN0b3IgPT4gKHtzZWxlY3RvciwgYXR0cnM6IHNlbGVjdG9yLmF0dHJzLmZpbHRlcihhID0+ICEhYSl9KSk7XG4gICAgbGV0IGF0dHJzID0gZmxhdHRlbihzZWxlY3RvckFuZEF0dHJpYnV0ZU5hbWVzLm1hcDxBdHRySW5mb1tdPihzZWxlY3RvckFuZEF0dHIgPT4ge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yQW5kQXR0ci5zZWxlY3RvcikgITtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHNlbGVjdG9yQW5kQXR0ci5hdHRycy5tYXA8QXR0ckluZm8+KFxuICAgICAgICAgIG5hbWUgPT4gKHtuYW1lLCBpbnB1dDogbmFtZSBpbiBkaXJlY3RpdmUuaW5wdXRzLCBvdXRwdXQ6IG5hbWUgaW4gZGlyZWN0aXZlLm91dHB1dHN9KSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pKTtcblxuICAgIC8vIEFkZCB0ZW1wbGF0ZSBhdHRyaWJ1dGUgaWYgYSBkaXJlY3RpdmUgY29udGFpbnMgYSB0ZW1wbGF0ZSByZWZlcmVuY2VcbiAgICBzZWxlY3RvckFuZEF0dHJpYnV0ZU5hbWVzLmZvckVhY2goc2VsZWN0b3JBbmRBdHRyID0+IHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VsZWN0b3JBbmRBdHRyLnNlbGVjdG9yO1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgIGlmIChkaXJlY3RpdmUgJiYgaGFzVGVtcGxhdGVSZWZlcmVuY2UoZGlyZWN0aXZlLnR5cGUpICYmIHNlbGVjdG9yLmF0dHJzLmxlbmd0aCAmJlxuICAgICAgICAgIHNlbGVjdG9yLmF0dHJzWzBdKSB7XG4gICAgICAgIGF0dHJzLnB1c2goe25hbWU6IHNlbGVjdG9yLmF0dHJzWzBdLCB0ZW1wbGF0ZTogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWxsIGlucHV0IGFuZCBvdXRwdXQgcHJvcGVydGllcyBvZiB0aGUgbWF0Y2hpbmcgZGlyZWN0aXZlcyBzaG91bGQgYmUgYWRkZWQuXG4gICAgY29uc3QgZWxlbWVudFNlbGVjdG9yID0gZWxlbWVudCA/XG4gICAgICAgIGNyZWF0ZUVsZW1lbnRDc3NTZWxlY3RvcihlbGVtZW50KSA6XG4gICAgICAgIGNyZWF0ZUVsZW1lbnRDc3NTZWxlY3RvcihuZXcgRWxlbWVudChlbGVtZW50TmFtZSwgW10sIFtdLCBudWxsICEsIG51bGwsIG51bGwpKTtcblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyKCk7XG4gICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhzZWxlY3RvcnMpO1xuICAgIG1hdGNoZXIubWF0Y2goZWxlbWVudFNlbGVjdG9yLCBzZWxlY3RvciA9PiB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSBzZWxlY3Rvck1hcC5nZXQoc2VsZWN0b3IpO1xuICAgICAgaWYgKGRpcmVjdGl2ZSkge1xuICAgICAgICBjb25zdCB7aW5wdXRzLCBvdXRwdXRzfSA9IGRpcmVjdGl2ZTtcbiAgICAgICAgYXR0cnMucHVzaCguLi5PYmplY3Qua2V5cyhpbnB1dHMpLm1hcChuYW1lID0+ICh7bmFtZTogaW5wdXRzW25hbWVdLCBpbnB1dDogdHJ1ZX0pKSk7XG4gICAgICAgIGF0dHJzLnB1c2goLi4uT2JqZWN0LmtleXMob3V0cHV0cykubWFwKG5hbWUgPT4gKHtuYW1lOiBvdXRwdXRzW25hbWVdLCBvdXRwdXQ6IHRydWV9KSkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gSWYgYSBuYW1lIHNob3dzIHVwIHR3aWNlLCBmb2xkIGl0IGludG8gYSBzaW5nbGUgdmFsdWUuXG4gICAgYXR0cnMgPSBmb2xkQXR0cnMoYXR0cnMpO1xuXG4gICAgLy8gTm93IGV4cGFuZCB0aGVtIGJhY2sgb3V0IHRvIGVuc3VyZSB0aGF0IGlucHV0L291dHB1dCBzaG93cyB1cCBhcyB3ZWxsIGFzIGlucHV0IGFuZFxuICAgIC8vIG91dHB1dC5cbiAgICBhdHRyaWJ1dGVzLnB1c2goLi4uZmxhdHRlbihhdHRycy5tYXAoZXhwYW5kZWRBdHRyKSkpO1xuICB9XG4gIHJldHVybiBhdHRyaWJ1dGVzO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlciwgYXR0cjogQXR0cmlidXRlKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBwYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgY29uc3QgdmlzaXRvciA9XG4gICAgICBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgcG9zaXRpb24sIGF0dHIsICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgcGF0aCwgZmFsc2UpKTtcbiAgcGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICBpZiAoIXZpc2l0b3IucmVzdWx0IHx8ICF2aXNpdG9yLnJlc3VsdC5sZW5ndGgpIHtcbiAgICAvLyBUcnkgYWxsd29pbmcgd2lkZW5pbmcgdGhlIHBhdGhcbiAgICBjb25zdCB3aWRlclBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbiwgLyogYWxsb3dXaWRlbmluZyAqLyB0cnVlKTtcbiAgICBpZiAod2lkZXJQYXRoLnRhaWwpIHtcbiAgICAgIGNvbnN0IHdpZGVyVmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgICAgICBpbmZvLCBwb3NpdGlvbiwgYXR0ciwgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB3aWRlclBhdGgsIGZhbHNlKSk7XG4gICAgICB3aWRlclBhdGgudGFpbC52aXNpdCh3aWRlclZpc2l0b3IsIG51bGwpO1xuICAgICAgcmV0dXJuIHdpZGVyVmlzaXRvci5yZXN1bHQgfHwgW107XG4gICAgfVxuICB9XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdCB8fCBbXTtcbn1cblxuZnVuY3Rpb24gZWxlbWVudENvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgaHRtbE5hbWVzID0gZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIShuYW1lIGluIGhpZGRlbkh0bWxFbGVtZW50cykpO1xuXG4gIC8vIENvbGxlY3QgdGhlIGVsZW1lbnRzIHJlZmVyZW5jZWQgYnkgdGhlIHNlbGVjdG9yc1xuICBjb25zdCBkaXJlY3RpdmVFbGVtZW50cyA9IGdldFNlbGVjdG9ycyhpbmZvKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0b3JzLm1hcChzZWxlY3RvciA9PiBzZWxlY3Rvci5lbGVtZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKG5hbWUgPT4gISFuYW1lKSBhcyBzdHJpbmdbXTtcblxuICBjb25zdCBjb21wb25lbnRzID0gZGlyZWN0aXZlRWxlbWVudHMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXMgSFRNTFxuICAgICAgLy8gZW50aXRlcy5cbiAgICAgIGtpbmQ6IENvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGh0bWxFbGVtZW50cyA9IGh0bWxOYW1lcy5tYXAobmFtZSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICAvLyBOZWVkIHRvIGNhc3QgdG8gdW5rbm93biBiZWNhdXNlIEFuZ3VsYXIncyBDb21wbGV0aW9uS2luZCBpbmNsdWRlcyBIVE1MXG4gICAgICAvLyBlbnRpdGVzLlxuICAgICAga2luZDogQ29tcGxldGlvbktpbmQuRUxFTUVOVCBhcyB1bmtub3duIGFzIHRzLlNjcmlwdEVsZW1lbnRLaW5kLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gUmV0dXJuIGNvbXBvbmVudHMgYW5kIGh0bWwgZWxlbWVudHNcbiAgcmV0dXJuIHVuaXF1ZUJ5TmFtZShodG1sRWxlbWVudHMuY29uY2F0KGNvbXBvbmVudHMpKTtcbn1cblxuLyoqXG4gKiBGaWx0ZXIgdGhlIHNwZWNpZmllZCBgZW50cmllc2AgYnkgdW5pcXVlIG5hbWUuXG4gKiBAcGFyYW0gZW50cmllcyBDb21wbGV0aW9uIEVudHJpZXNcbiAqL1xuZnVuY3Rpb24gdW5pcXVlQnlOYW1lKGVudHJpZXM6IHRzLkNvbXBsZXRpb25FbnRyeVtdKSB7XG4gIGNvbnN0IHJlc3VsdHMgPSBbXTtcbiAgY29uc3Qgc2V0ID0gbmV3IFNldCgpO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoIXNldC5oYXMoZW50cnkubmFtZSkpIHtcbiAgICAgIHNldC5hZGQoZW50cnkubmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goZW50cnkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZW50aXR5Q29tcGxldGlvbnModmFsdWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogdHMuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgd2hpbGUgKGZvdW5kID0gcmUuZXhlYyh2YWx1ZSkpIHtcbiAgICBsZXQgbGVuID0gZm91bmRbMF0ubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+PSBmb3VuZC5pbmRleCAmJiBwb3NpdGlvbiA8IChmb3VuZC5pbmRleCArIGxlbikpIHtcbiAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKE5BTUVEX0VOVElUSUVTKS5tYXAobmFtZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogYCYke25hbWV9O2AsXG4gICAgICAgICAgLy8gTmVlZCB0byBjYXN0IHRvIHVua25vd24gYmVjYXVzZSBBbmd1bGFyJ3MgQ29tcGxldGlvbktpbmQgaW5jbHVkZXNcbiAgICAgICAgICAvLyBIVE1MIGVudGl0ZXMuXG4gICAgICAgICAga2luZDogQ29tcGxldGlvbktpbmQuRU5USVRZIGFzIHVua25vd24gYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBhbiBpbnRlcnBvbGF0aW9uIGluIGF0IHRoZSBwb3NpdGlvbi5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXRlbXBsYXRlUGF0aC50YWlsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICBpbmZvLCBwb3NpdGlvbiwgdW5kZWZpbmVkLFxuICAgICAgKCkgPT4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKSwgdGVtcGxhdGVQYXRoLCBmYWxzZSkpO1xuICB0ZW1wbGF0ZVBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgcmV0dXJuIHVuaXF1ZUJ5TmFtZSh2aXNpdG9yLnJlc3VsdCB8fCBbXSk7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiB0cy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gU3ltYm9sVGFibGU7XG4gIHJlc3VsdDogdHMuQ29tcGxldGlvbkVudHJ5W118dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmZvOiBBc3RSZXN1bHQsIHByaXZhdGUgcG9zaXRpb246IG51bWJlciwgcHJpdmF0ZSBhdHRyPzogQXR0cmlidXRlLFxuICAgICAgZ2V0RXhwcmVzc2lvblNjb3BlPzogKCkgPT4gU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlID0gZ2V0RXhwcmVzc2lvblNjb3BlIHx8ICgoKSA9PiBpbmZvLnRlbXBsYXRlLm1lbWJlcnMpO1xuICB9XG5cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0KTogdm9pZCB7IHRoaXMuYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhhc3QuaGFuZGxlcik7IH1cblxuICB2aXNpdEVsZW1lbnQoYXN0OiBFbGVtZW50QXN0KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYXR0ciAmJiBnZXRTZWxlY3RvcnModGhpcy5pbmZvKSAmJiB0aGlzLmF0dHIubmFtZS5zdGFydHNXaXRoKFRFTVBMQVRFX0FUVFJfUFJFRklYKSkge1xuICAgICAgLy8gVGhlIHZhbHVlIGlzIGEgdGVtcGxhdGUgZXhwcmVzc2lvbiBidXQgdGhlIGV4cHJlc3Npb24gQVNUIHdhcyBub3QgcHJvZHVjZWQgd2hlbiB0aGVcbiAgICAgIC8vIFRlbXBsYXRlQXN0IHdhcyBwcm9kdWNlIHNvXG4gICAgICAvLyBkbyB0aGF0IG5vdy5cblxuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hdHRyLm5hbWUuc3Vic3RyKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yXG4gICAgICBjb25zdCBzZWxlY3RvckluZm8gPSBnZXRTZWxlY3RvcnModGhpcy5pbmZvKTtcbiAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IHNlbGVjdG9ySW5mby5zZWxlY3RvcnM7XG4gICAgICBjb25zdCBzZWxlY3RvciA9XG4gICAgICAgICAgc2VsZWN0b3JzLmZpbHRlcihzID0+IHMuYXR0cnMuc29tZSgoYXR0ciwgaSkgPT4gaSAlIDIgPT09IDAgJiYgYXR0ciA9PT0ga2V5KSlbMF07XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQmluZGluZ1Jlc3VsdCA9XG4gICAgICAgICAgdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKGtleSwgdGhpcy5hdHRyLnZhbHVlLCBudWxsLCAwKTtcblxuICAgICAgLy8gZmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvblxuICAgICAgaWYgKCF0aGlzLmF0dHIudmFsdWVTcGFuKSByZXR1cm47XG4gICAgICBjb25zdCB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gdGhpcy5hdHRyLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICBjb25zdCBiaW5kaW5ncyA9IHRlbXBsYXRlQmluZGluZ1Jlc3VsdC50ZW1wbGF0ZUJpbmRpbmdzO1xuICAgICAgY29uc3QgYmluZGluZyA9XG4gICAgICAgICAgYmluZGluZ3MuZmluZChcbiAgICAgICAgICAgICAgYmluZGluZyA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiaW5kaW5nLnNwYW4sIC8qIGV4Y2x1c2l2ZSAqLyB0cnVlKSkgfHxcbiAgICAgICAgICBiaW5kaW5ncy5maW5kKGJpbmRpbmcgPT4gaW5TcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgYmluZGluZy5zcGFuKSk7XG5cbiAgICAgIGNvbnN0IGtleUNvbXBsZXRpb25zID0gKCkgPT4ge1xuICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgY29uc3QgYXR0ck5hbWVzID0gc2VsZWN0b3IuYXR0cnMuZmlsdGVyKChfLCBpKSA9PiBpICUgMiA9PT0gMCk7XG4gICAgICAgICAga2V5cyA9IGF0dHJOYW1lcy5maWx0ZXIobmFtZSA9PiBuYW1lLnN0YXJ0c1dpdGgoa2V5KSAmJiBuYW1lICE9IGtleSlcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAobmFtZSA9PiBsb3dlck5hbWUobmFtZS5zdWJzdHIoa2V5Lmxlbmd0aCkpKTtcbiAgICAgICAgfVxuICAgICAgICBrZXlzLnB1c2goJ2xldCcpO1xuICAgICAgICB0aGlzLnJlc3VsdCA9IGtleXMubWFwKGtleSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FzdCB0byB1bmtub3duIGJlY2F1c2UgQW5ndWxhcidzIENvbXBsZXRpb25LaW5kIGluY2x1ZGVzXG4gICAgICAgICAgICAvLyBIVE1MIGVudGl0ZXMuXG4gICAgICAgICAgICBraW5kOiBDb21wbGV0aW9uS2luZC5LRVkgYXMgdW5rbm93biBhcyB0cy5TY3JpcHRFbGVtZW50S2luZCxcbiAgICAgICAgICAgIHNvcnRUZXh0OiBrZXksXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoIWJpbmRpbmcgfHwgKGJpbmRpbmcua2V5ID09PSBrZXkgJiYgIWJpbmRpbmcuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgLy8gV2UgYXJlIGluIHRoZSByb290IGJpbmRpbmcuIFdlIHNob3VsZCByZXR1cm4gYGxldGAgYW5kIGtleXMgdGhhdCBhcmUgbGVmdCBpbiB0aGVcbiAgICAgICAgLy8gc2VsZWN0b3IuXG4gICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICB9IGVsc2UgaWYgKGJpbmRpbmcua2V5SXNWYXIpIHtcbiAgICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IHRoaXMuYXR0ci52YWx1ZS5pbmRleE9mKCc9Jyk7XG4gICAgICAgIHRoaXMucmVzdWx0ID0gW107XG4gICAgICAgIGlmIChlcXVhbExvY2F0aW9uID49IDAgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID49IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgICAvLyBXZSBhcmUgYWZ0ZXIgdGhlICc9JyBpbiBhIGxldCBjbGF1c2UuIFRoZSB2YWxpZCB2YWx1ZXMgaGVyZSBhcmUgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRUYWJsZSkge1xuICAgICAgICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29udGV4dFRhYmxlLnZhbHVlcygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYmluZGluZy5rZXkgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uIDw9IChiaW5kaW5nLmtleS5sZW5ndGggLSBrZXkubGVuZ3RoKSkge1xuICAgICAgICAgIGtleUNvbXBsZXRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBwb3NpdGlvbiBpcyBpbiB0aGUgZXhwcmVzc2lvbiBvciBhZnRlciB0aGUga2V5IG9yIHRoZXJlIGlzIG5vIGtleSwgcmV0dXJuIHRoZVxuICAgICAgICAvLyBleHByZXNzaW9uIGNvbXBsZXRpb25zXG4gICAgICAgIGlmICgoYmluZGluZy5leHByZXNzaW9uICYmIGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuZXhwcmVzc2lvbi5hc3Quc3BhbikpIHx8XG4gICAgICAgICAgICAoYmluZGluZy5rZXkgJiZcbiAgICAgICAgICAgICB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBiaW5kaW5nLnNwYW4uc3RhcnQgKyAoYmluZGluZy5rZXkubGVuZ3RoIC0ga2V5Lmxlbmd0aCkpIHx8XG4gICAgICAgICAgICAhYmluZGluZy5rZXkpIHtcbiAgICAgICAgICBjb25zdCBzcGFuID0gbmV3IFBhcnNlU3BhbigwLCB0aGlzLmF0dHIudmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICBjb25zdCBvZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgICAgICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKFxuICAgICAgICAgICAgICBiaW5kaW5nLmV4cHJlc3Npb24gPyBiaW5kaW5nLmV4cHJlc3Npb24uYXN0IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFByb3BlcnR5UmVhZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4sIHNwYW4udG9BYnNvbHV0ZShvZmZzZXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEltcGxpY2l0UmVjZWl2ZXIoc3Bhbiwgc3Bhbi50b0Fic29sdXRlKG9mZnNldCkpLCAnJyksXG4gICAgICAgICAgICAgIHZhbHVlUmVsYXRpdmVQb3NpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAga2V5Q29tcGxldGlvbnMoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KSB7XG4gICAgY29uc3QgZXhwcmVzc2lvblBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBpZiAoaW5TcGFuKGV4cHJlc3Npb25Qb3NpdGlvbiwgYXN0LnZhbHVlLnNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIGV4cHJlc3Npb25Qb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgIGlmIChjb21wbGV0aW9ucykge1xuICAgICAgICB0aGlzLnJlc3VsdCA9IHRoaXMuc3ltYm9sc1RvQ29tcGxldGlvbnMoY29tcGxldGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh2YWx1ZTogQVNULCBwb3NpdGlvbj86IG51bWJlcikge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLFxuICAgICAgICBwb3NpdGlvbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5hdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uIDogcG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgaWYgKHN5bWJvbHMpIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5zeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IFN5bWJvbFtdKTogdHMuQ29tcGxldGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBzeW1ib2xzLmZpbHRlcihzID0+ICFzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSAmJiBzLnB1YmxpYykubWFwKHN5bWJvbCA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAga2luZDogc3ltYm9sLmtpbmQgYXMgdHMuU2NyaXB0RWxlbWVudEtpbmQsXG4gICAgICAgIHNvcnRUZXh0OiBzeW1ib2wubmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldCBhdHRyaWJ1dGVWYWx1ZVBvc2l0aW9uKCkge1xuICAgIGlmICh0aGlzLmF0dHIgJiYgdGhpcy5hdHRyLnZhbHVlU3Bhbikge1xuICAgICAgcmV0dXJuIHRoaXMucG9zaXRpb24gLSB0aGlzLmF0dHIudmFsdWVTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogVGVtcGxhdGVTb3VyY2UsIHNwYW46IFNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmZ1bmN0aW9uIG5hbWVPZkF0dHIoYXR0cjogQXR0ckluZm8pOiBzdHJpbmcge1xuICBsZXQgbmFtZSA9IGF0dHIubmFtZTtcbiAgaWYgKGF0dHIub3V0cHV0KSB7XG4gICAgbmFtZSA9IHJlbW92ZVN1ZmZpeChuYW1lLCAnRXZlbnRzJyk7XG4gICAgbmFtZSA9IHJlbW92ZVN1ZmZpeChuYW1lLCAnQ2hhbmdlZCcpO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IFtuYW1lXTtcbiAgaWYgKGF0dHIuaW5wdXQpIHtcbiAgICByZXN1bHQudW5zaGlmdCgnWycpO1xuICAgIHJlc3VsdC5wdXNoKCddJyk7XG4gIH1cbiAgaWYgKGF0dHIub3V0cHV0KSB7XG4gICAgcmVzdWx0LnVuc2hpZnQoJygnKTtcbiAgICByZXN1bHQucHVzaCgnKScpO1xuICB9XG4gIGlmIChhdHRyLnRlbXBsYXRlKSB7XG4gICAgcmVzdWx0LnVuc2hpZnQoJyonKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xufVxuXG5jb25zdCB0ZW1wbGF0ZUF0dHIgPSAvXihcXHcrOik/KHRlbXBsYXRlJHxeXFwqKS87XG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50Q3NzU2VsZWN0b3IoZWxlbWVudDogRWxlbWVudCk6IENzc1NlbGVjdG9yIHtcbiAgY29uc3QgY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3IoKTtcbiAgY29uc3QgZWxOYW1lTm9OcyA9IHNwbGl0TnNOYW1lKGVsZW1lbnQubmFtZSlbMV07XG5cbiAgY3NzU2VsZWN0b3Iuc2V0RWxlbWVudChlbE5hbWVOb05zKTtcblxuICBmb3IgKGNvbnN0IGF0dHIgb2YgZWxlbWVudC5hdHRycykge1xuICAgIGlmICghYXR0ci5uYW1lLm1hdGNoKHRlbXBsYXRlQXR0cikpIHtcbiAgICAgIGNvbnN0IFtfLCBhdHRyTmFtZU5vTnNdID0gc3BsaXROc05hbWUoYXR0ci5uYW1lKTtcbiAgICAgIGNzc1NlbGVjdG9yLmFkZEF0dHJpYnV0ZShhdHRyTmFtZU5vTnMsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKGF0dHIubmFtZS50b0xvd2VyQ2FzZSgpID09PSAnY2xhc3MnKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBhdHRyLnZhbHVlLnNwbGl0KC9zKy9nKTtcbiAgICAgICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXNzTmFtZSA9PiBjc3NTZWxlY3Rvci5hZGRDbGFzc05hbWUoY2xhc3NOYW1lKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjc3NTZWxlY3Rvcjtcbn1cblxuZnVuY3Rpb24gZm9sZEF0dHJzKGF0dHJzOiBBdHRySW5mb1tdKTogQXR0ckluZm9bXSB7XG4gIGNvbnN0IGlucHV0T3V0cHV0ID0gbmV3IE1hcDxzdHJpbmcsIEF0dHJJbmZvPigpO1xuICBjb25zdCB0ZW1wbGF0ZXMgPSBuZXcgTWFwPHN0cmluZywgQXR0ckluZm8+KCk7XG4gIGNvbnN0IHJlc3VsdDogQXR0ckluZm9bXSA9IFtdO1xuICBhdHRycy5mb3JFYWNoKGF0dHIgPT4ge1xuICAgIGlmIChhdHRyLmZyb21IdG1sKSB7XG4gICAgICByZXR1cm4gYXR0cjtcbiAgICB9XG4gICAgaWYgKGF0dHIudGVtcGxhdGUpIHtcbiAgICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHRlbXBsYXRlcy5nZXQoYXR0ci5uYW1lKTtcbiAgICAgIGlmICghZHVwbGljYXRlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtuYW1lOiBhdHRyLm5hbWUsIHRlbXBsYXRlOiB0cnVlfSk7XG4gICAgICAgIHRlbXBsYXRlcy5zZXQoYXR0ci5uYW1lLCBhdHRyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGF0dHIuaW5wdXQgfHwgYXR0ci5vdXRwdXQpIHtcbiAgICAgIGNvbnN0IGR1cGxpY2F0ZSA9IGlucHV0T3V0cHV0LmdldChhdHRyLm5hbWUpO1xuICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICBkdXBsaWNhdGUuaW5wdXQgPSBkdXBsaWNhdGUuaW5wdXQgfHwgYXR0ci5pbnB1dDtcbiAgICAgICAgZHVwbGljYXRlLm91dHB1dCA9IGR1cGxpY2F0ZS5vdXRwdXQgfHwgYXR0ci5vdXRwdXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjbG9uZUF0dHI6IEF0dHJJbmZvID0ge25hbWU6IGF0dHIubmFtZX07XG4gICAgICAgIGlmIChhdHRyLmlucHV0KSBjbG9uZUF0dHIuaW5wdXQgPSB0cnVlO1xuICAgICAgICBpZiAoYXR0ci5vdXRwdXQpIGNsb25lQXR0ci5vdXRwdXQgPSB0cnVlO1xuICAgICAgICByZXN1bHQucHVzaChjbG9uZUF0dHIpO1xuICAgICAgICBpbnB1dE91dHB1dC5zZXQoYXR0ci5uYW1lLCBjbG9uZUF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZGVkQXR0cihhdHRyOiBBdHRySW5mbyk6IEF0dHJJbmZvW10ge1xuICBpZiAoYXR0ci5pbnB1dCAmJiBhdHRyLm91dHB1dCkge1xuICAgIHJldHVybiBbXG4gICAgICBhdHRyLCB7bmFtZTogYXR0ci5uYW1lLCBpbnB1dDogdHJ1ZSwgb3V0cHV0OiBmYWxzZX0sXG4gICAgICB7bmFtZTogYXR0ci5uYW1lLCBpbnB1dDogZmFsc2UsIG91dHB1dDogdHJ1ZX1cbiAgICBdO1xuICB9XG4gIHJldHVybiBbYXR0cl07XG59XG5cbmZ1bmN0aW9uIGxvd2VyTmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gbmFtZSAmJiAobmFtZVswXS50b0xvd2VyQ2FzZSgpICsgbmFtZS5zdWJzdHIoMSkpO1xufVxuIl19