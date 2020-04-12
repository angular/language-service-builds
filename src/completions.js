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
        define("@angular/language-service/src/completions", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/chars", "@angular/language-service/src/binding_utils", "@angular/language-service/src/expression_diagnostics", "@angular/language-service/src/expressions", "@angular/language-service/src/html_info", "@angular/language-service/src/template", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var chars_1 = require("@angular/compiler/src/chars");
    var binding_utils_1 = require("@angular/language-service/src/binding_utils");
    var expression_diagnostics_1 = require("@angular/language-service/src/expression_diagnostics");
    var expressions_1 = require("@angular/language-service/src/expressions");
    var html_info_1 = require("@angular/language-service/src/html_info");
    var template_1 = require("@angular/language-service/src/template");
    var ng = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
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
    function getBoundedWordSpan(templateInfo, position, ast) {
        var template = templateInfo.template;
        var templateSrc = template.source;
        if (!templateSrc)
            return;
        if (ast instanceof compiler_1.Element) {
            // The HTML tag may include `-` (e.g. `app-root`),
            // so use the HtmlAst to get the span before ayazhafiz refactor the code.
            return {
                start: templateInfo.template.span.start + ast.startSourceSpan.start.offset + 1,
                length: ast.name.length
            };
        }
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
        var path = utils_1.getPathToNodeAtPosition(htmlAst, templatePosition);
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
                        result = attributeCompletionsForElement(templateInfo, ast.name);
                    }
                },
                visitAttribute: function (ast) {
                    // An attribute consists of two parts, LHS="RHS".
                    // Determine if completions are requested for LHS or RHS
                    if (ast.valueSpan && utils_1.inSpan(templatePosition, utils_1.spanOf(ast.valueSpan))) {
                        // RHS completion
                        result = attributeValueCompletions(templateInfo, path);
                    }
                    else {
                        // LHS completion
                        result = attributeCompletions(templateInfo, path);
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
                visitComment: function () { },
                visitExpansion: function () { },
                visitExpansionCase: function () { }
            }, null);
        }
        var replacementSpan = getBoundedWordSpan(templateInfo, position, mostSpecific);
        return result.map(function (entry) {
            return tslib_1.__assign(tslib_1.__assign({}, entry), { replacementSpan: replacementSpan });
        });
    }
    exports.getTemplateCompletions = getTemplateCompletions;
    function attributeCompletions(info, path) {
        var attr = path.tail;
        var elem = path.parentOf(attr);
        if (!(attr instanceof compiler_1.Attribute) || !(elem instanceof compiler_1.Element)) {
            return [];
        }
        // TODO: Consider parsing the attrinute name to a proper AST instead of
        // matching using regex. This is because the regexp would incorrectly identify
        // bind parts for cases like [()|]
        //                              ^ cursor is here
        var binding = binding_utils_1.getBindingDescriptor(attr.name);
        if (!binding) {
            // This is a normal HTML attribute, not an Angular attribute.
            return attributeCompletionsForElement(info, elem.name);
        }
        var results = [];
        var ngAttrs = angularAttributes(info, elem.name);
        switch (binding.kind) {
            case binding_utils_1.ATTR.KW_MICROSYNTAX:
                // template reference attribute: *attrName
                results.push.apply(results, tslib_1.__spread(ngAttrs.templateRefs));
                break;
            case binding_utils_1.ATTR.KW_BIND:
            case binding_utils_1.ATTR.IDENT_PROPERTY:
                // property binding via bind- or []
                results.push.apply(results, tslib_1.__spread(html_info_1.propertyNames(elem.name), ngAttrs.inputs));
                break;
            case binding_utils_1.ATTR.KW_ON:
            case binding_utils_1.ATTR.IDENT_EVENT:
                // event binding via on- or ()
                results.push.apply(results, tslib_1.__spread(html_info_1.eventNames(elem.name), ngAttrs.outputs));
                break;
            case binding_utils_1.ATTR.KW_BINDON:
            case binding_utils_1.ATTR.IDENT_BANANA_BOX:
                // banana-in-a-box binding via bindon- or [()]
                results.push.apply(results, tslib_1.__spread(ngAttrs.bananas));
                break;
        }
        return results.map(function (name) {
            return {
                name: name,
                kind: ng.CompletionKind.ATTRIBUTE,
                sortText: name,
            };
        });
    }
    function attributeCompletionsForElement(info, elementName) {
        var e_1, _a, e_2, _b;
        var results = [];
        if (info.template instanceof template_1.InlineTemplate) {
            try {
                // Provide HTML attributes completion only for inline templates
                for (var _c = tslib_1.__values(html_info_1.attributeNames(elementName)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var name_1 = _d.value;
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
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        // Add Angular attributes
        var ngAttrs = angularAttributes(info, elementName);
        try {
            for (var _e = tslib_1.__values(ngAttrs.others), _f = _e.next(); !_f.done; _f = _e.next()) {
                var name_2 = _f.value;
                results.push({
                    name: name_2,
                    kind: ng.CompletionKind.ATTRIBUTE,
                    sortText: name_2,
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return results;
    }
    /**
     * Provide completions to the RHS of an attribute, which is of the form
     * LHS="RHS". The template path is computed from the specified `info` whereas
     * the context is determined from the specified `htmlPath`.
     * @param info Object that contains the template AST
     * @param htmlPath Path to the HTML node
     */
    function attributeValueCompletions(info, htmlPath) {
        // Find the corresponding Template AST path.
        var templatePath = utils_1.findTemplateAstAt(info.templateAst, htmlPath.position);
        var visitor = new ExpressionVisitor(info, htmlPath.position, function () {
            var dinfo = expression_diagnostics_1.diagnosticInfoFromTemplateInfo(info);
            return expression_diagnostics_1.getExpressionScope(dinfo, templatePath);
        });
        if (templatePath.tail instanceof compiler_1.AttrAst ||
            templatePath.tail instanceof compiler_1.BoundElementPropertyAst ||
            templatePath.tail instanceof compiler_1.BoundEventAst) {
            templatePath.tail.visit(visitor, null);
            return visitor.results;
        }
        // In order to provide accurate attribute value completion, we need to know
        // what the LHS is, and construct the proper AST if it is missing.
        var htmlAttr = htmlPath.tail;
        var binding = binding_utils_1.getBindingDescriptor(htmlAttr.name);
        if (binding && binding.kind === binding_utils_1.ATTR.KW_REF) {
            var refAst = void 0;
            var elemAst = void 0;
            if (templatePath.tail instanceof compiler_1.ReferenceAst) {
                refAst = templatePath.tail;
                var parent_1 = templatePath.parentOf(refAst);
                if (parent_1 instanceof compiler_1.ElementAst) {
                    elemAst = parent_1;
                }
            }
            else if (templatePath.tail instanceof compiler_1.ElementAst) {
                refAst = new compiler_1.ReferenceAst(htmlAttr.name, null, htmlAttr.value, htmlAttr.valueSpan);
                elemAst = templatePath.tail;
            }
            if (refAst && elemAst) {
                refAst.visit(visitor, elemAst);
            }
        }
        else {
            // HtmlAst contains the `Attribute` node, however the corresponding `AttrAst`
            // node is missing from the TemplateAst.
            var attrAst = new compiler_1.AttrAst(htmlAttr.name, htmlAttr.value, htmlAttr.valueSpan);
            attrAst.visit(visitor, null);
        }
        return visitor.results;
    }
    function elementCompletions(info) {
        var e_3, _a;
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
                var name_3 = selector.element;
                if (name_3 && !components.has(name_3)) {
                    components.add(name_3);
                    results.push({
                        name: name_3,
                        kind: ng.CompletionKind.COMPONENT,
                        sortText: name_3,
                    });
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
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
        var visitor = new ExpressionVisitor(info, position, function () { return expression_diagnostics_1.getExpressionScope(expression_diagnostics_1.diagnosticInfoFromTemplateInfo(info), templatePath); });
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
        function ExpressionVisitor(info, position, getExpressionScope) {
            var _this = _super.call(this) || this;
            _this.info = info;
            _this.position = position;
            _this.getExpressionScope = getExpressionScope;
            _this.completions = new Map();
            return _this;
        }
        Object.defineProperty(ExpressionVisitor.prototype, "results", {
            get: function () { return Array.from(this.completions.values()); },
            enumerable: true,
            configurable: true
        });
        ExpressionVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.processExpressionCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitElementProperty = function (ast) {
            this.processExpressionCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitEvent = function (ast) { this.processExpressionCompletions(ast.handler); };
        ExpressionVisitor.prototype.visitElement = function () {
            // no-op for now
        };
        ExpressionVisitor.prototype.visitAttr = function (ast) {
            var _this = this;
            var binding = binding_utils_1.getBindingDescriptor(ast.name);
            if (binding && binding.kind === binding_utils_1.ATTR.KW_MICROSYNTAX) {
                // This a template binding given by micro syntax expression.
                // First, verify the attribute consists of some binding we can give completions for.
                // The sourceSpan of AttrAst points to the RHS of the attribute
                var templateKey = binding.name;
                var templateValue = ast.sourceSpan.toString();
                var templateUrl = ast.sourceSpan.start.file.url;
                // TODO(kyliau): We are unable to determine the absolute offset of the key
                // but it is okay here, because we are only looking at the RHS of the attr
                var absKeyOffset = 0;
                var absValueOffset = ast.sourceSpan.start.offset;
                var templateBindings = this.info.expressionParser.parseTemplateBindings(templateKey, templateValue, templateUrl, absKeyOffset, absValueOffset).templateBindings;
                // Find the template binding that contains the position.
                var templateBinding = templateBindings.find(function (b) { return utils_1.inSpan(_this.position, b.sourceSpan); });
                if (!templateBinding) {
                    return;
                }
                this.microSyntaxInAttributeValue(ast, templateBinding);
            }
            else {
                var expressionAst = this.info.expressionParser.parseBinding(ast.value, ast.sourceSpan.toString(), ast.sourceSpan.start.offset);
                this.processExpressionCompletions(expressionAst);
            }
        };
        ExpressionVisitor.prototype.visitReference = function (_ast, context) {
            var _this = this;
            context.directives.forEach(function (dir) {
                var exportAs = dir.directive.exportAs;
                if (exportAs) {
                    _this.completions.set(exportAs, { name: exportAs, kind: ng.CompletionKind.REFERENCE, sortText: exportAs });
                }
            });
        };
        ExpressionVisitor.prototype.visitBoundText = function (ast) {
            if (utils_1.inSpan(this.position, ast.value.sourceSpan)) {
                var completions = expressions_1.getExpressionCompletions(this.getExpressionScope(), ast.value, this.position, this.info.template);
                if (completions) {
                    this.addSymbolsToCompletions(completions);
                }
            }
        };
        ExpressionVisitor.prototype.processExpressionCompletions = function (value) {
            var symbols = expressions_1.getExpressionCompletions(this.getExpressionScope(), value, this.position, this.info.template);
            if (symbols) {
                this.addSymbolsToCompletions(symbols);
            }
        };
        ExpressionVisitor.prototype.addSymbolsToCompletions = function (symbols) {
            var e_4, _a;
            try {
                for (var symbols_1 = tslib_1.__values(symbols), symbols_1_1 = symbols_1.next(); !symbols_1_1.done; symbols_1_1 = symbols_1.next()) {
                    var s = symbols_1_1.value;
                    if (s.name.startsWith('__') || !s.public || this.completions.has(s.name)) {
                        continue;
                    }
                    // The pipe method should not include parentheses.
                    // e.g. {{ value_expression | slice : start [ : end ] }}
                    var shouldInsertParentheses = s.callable && s.kind !== ng.CompletionKind.PIPE;
                    this.completions.set(s.name, {
                        name: s.name,
                        kind: s.kind,
                        sortText: s.name,
                        insertText: shouldInsertParentheses ? s.name + "()" : s.name,
                    });
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (symbols_1_1 && !symbols_1_1.done && (_a = symbols_1.return)) _a.call(symbols_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        /**
         * This method handles the completions of attribute values for directives that
         * support the microsyntax format. Examples are *ngFor and *ngIf.
         * These directives allows declaration of "let" variables, adds context-specific
         * symbols like $implicit, index, count, among other behaviors.
         * For a complete description of such format, see
         * https://angular.io/guide/structural-directives#the-asterisk--prefix
         *
         * @param attr descriptor for attribute name and value pair
         * @param binding template binding for the expression in the attribute
         */
        ExpressionVisitor.prototype.microSyntaxInAttributeValue = function (attr, binding) {
            var _a;
            var key = attr.name.substring(1); // remove leading asterisk
            // Find the selector - eg ngFor, ngIf, etc
            var selectorInfo = utils_1.getSelectors(this.info);
            var selector = selectorInfo.selectors.find(function (s) {
                // attributes are listed in (attribute, value) pairs
                for (var i = 0; i < s.attrs.length; i += 2) {
                    if (s.attrs[i] === key) {
                        return true;
                    }
                }
            });
            if (!selector) {
                return;
            }
            var valueRelativePosition = this.position - attr.sourceSpan.start.offset;
            if (binding instanceof compiler_1.VariableBinding) {
                // TODO(kyliau): With expression sourceSpan we shouldn't have to search
                // the attribute value string anymore. Just check if position is in the
                // expression source span.
                var equalLocation = attr.value.indexOf('=');
                if (equalLocation > 0 && valueRelativePosition > equalLocation) {
                    // We are after the '=' in a let clause. The valid values here are the members of the
                    // template reference's type parameter.
                    var directiveMetadata = selectorInfo.map.get(selector);
                    if (directiveMetadata) {
                        var contextTable = this.info.template.query.getTemplateContext(directiveMetadata.type.reference);
                        if (contextTable) {
                            // This adds symbols like $implicit, index, count, etc.
                            this.addSymbolsToCompletions(contextTable.values());
                            return;
                        }
                    }
                }
            }
            else if (binding instanceof compiler_1.ExpressionBinding) {
                if (utils_1.inSpan(this.position, (_a = binding.value) === null || _a === void 0 ? void 0 : _a.ast.sourceSpan)) {
                    this.processExpressionCompletions(binding.value.ast);
                    return;
                }
                else if (!binding.value && this.position > binding.key.span.end) {
                    // No expression is defined for the value of the key expression binding, but the cursor is
                    // in a location where the expression would be defined. This can happen in a case like
                    //   let i of |
                    //            ^-- cursor
                    // In this case, backfill the value to be an empty expression and retrieve completions.
                    this.processExpressionCompletions(new compiler_1.EmptyExpr(new compiler_1.ParseSpan(valueRelativePosition, valueRelativePosition), new compiler_1.AbsoluteSourceSpan(this.position, this.position)));
                    return;
                }
            }
        };
        return ExpressionVisitor;
    }(compiler_1.NullTemplateVisitor));
    function getSourceText(template, span) {
        return template.source.substring(span.start, span.end);
    }
    /**
     * Return all Angular-specific attributes for the element with `elementName`.
     * @param info
     * @param elementName
     */
    function angularAttributes(info, elementName) {
        var e_5, _a, e_6, _b, e_7, _c, e_8, _d;
        var _e = utils_1.getSelectors(info), selectors = _e.selectors, selectorMap = _e.map;
        var templateRefs = new Set();
        var inputs = new Set();
        var outputs = new Set();
        var bananas = new Set();
        var others = new Set();
        try {
            for (var selectors_1 = tslib_1.__values(selectors), selectors_1_1 = selectors_1.next(); !selectors_1_1.done; selectors_1_1 = selectors_1.next()) {
                var selector = selectors_1_1.value;
                if (selector.element && selector.element !== elementName) {
                    continue;
                }
                var summary = selectorMap.get(selector);
                var hasTemplateRef = utils_1.isStructuralDirective(summary.type);
                // attributes are listed in (attribute, value) pairs
                for (var i = 0; i < selector.attrs.length; i += 2) {
                    var attr = selector.attrs[i];
                    if (hasTemplateRef) {
                        templateRefs.add(attr);
                    }
                    else {
                        others.add(attr);
                    }
                }
                try {
                    for (var _f = (e_6 = void 0, tslib_1.__values(Object.values(summary.inputs))), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var input = _g.value;
                        inputs.add(input);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                try {
                    for (var _h = (e_7 = void 0, tslib_1.__values(Object.values(summary.outputs))), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var output = _j.value;
                        outputs.add(output);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (selectors_1_1 && !selectors_1_1.done && (_a = selectors_1.return)) _a.call(selectors_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        try {
            for (var inputs_1 = tslib_1.__values(inputs), inputs_1_1 = inputs_1.next(); !inputs_1_1.done; inputs_1_1 = inputs_1.next()) {
                var name_4 = inputs_1_1.value;
                // Add banana-in-a-box syntax
                // https://angular.io/guide/template-syntax#two-way-binding-
                if (outputs.has(name_4 + "Change")) {
                    bananas.add(name_4);
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (inputs_1_1 && !inputs_1_1.done && (_d = inputs_1.return)) _d.call(inputs_1);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return { templateRefs: templateRefs, inputs: inputs, outputs: outputs, bananas: bananas, others: others };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclkscURBQTJFO0lBRTNFLDZFQUEyRDtJQUUzRCwrRkFBNEY7SUFDNUYseUVBQXVEO0lBQ3ZELHFFQUFvRjtJQUNwRixtRUFBMEM7SUFDMUMsd0RBQThCO0lBQzlCLDZEQUF3SDtJQUV4SCxJQUFNLG9CQUFvQixHQUN0QixJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLElBQU0sYUFBYSxHQUNmLHdCQUFZLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBL0IsQ0FBK0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUk7UUFDckUsT0FBTztZQUNMLElBQUksTUFBQTtZQUNKLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVk7WUFDcEMsUUFBUSxFQUFFLElBQUk7U0FDZixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDUCxJQUFNLGdCQUFnQixHQUFzQztRQUMxRDtZQUNFLElBQUksRUFBRSxjQUFjO1lBQ3BCLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWU7WUFDdkMsUUFBUSxFQUFFLGNBQWM7U0FDekI7UUFDRDtZQUNFLElBQUksRUFBRSxZQUFZO1lBQ2xCLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWU7WUFDdkMsUUFBUSxFQUFFLFlBQVk7U0FD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Q0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBLENBQUEsZ0JBQUEsNEJBQUU7d0JBQWhELElBQU0sTUFBTSxXQUFBO3dCQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3JCOzs7Ozs7Ozs7YUFDRjs7Ozs7Ozs7OztZQUNELEtBQW1CLElBQUEsV0FBQSxpQkFBQSxNQUFNLENBQUEsOEJBQUEsa0RBQUU7Z0JBQXRCLElBQU0sTUFBSSxtQkFBQTtnQkFDYiw2QkFBNkI7Z0JBQzdCLDREQUE0RDtnQkFDNUQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFJLE1BQUksV0FBUSxDQUFDLEVBQUU7b0JBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBSSxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxNQUFNLFFBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxNQUFNLFFBQUEsRUFBQyxDQUFDO0lBQzFELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBYnNvbHV0ZVNvdXJjZVNwYW4sIEFzdFBhdGgsIEF0dHJBc3QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgRWxlbWVudCwgRWxlbWVudEFzdCwgRW1wdHlFeHByLCBFeHByZXNzaW9uQmluZGluZywgSHRtbEFzdFBhdGgsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUmVmZXJlbmNlQXN0LCBUYWdDb250ZW50VHlwZSwgVGVtcGxhdGVCaW5kaW5nLCBUZXh0LCBWYXJpYWJsZUJpbmRpbmcsIGdldEh0bWxUYWdEZWZpbml0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgeyQkLCAkXywgaXNBc2NpaUxldHRlciwgaXNEaWdpdH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NoYXJzJztcblxuaW1wb3J0IHtBVFRSLCBnZXRCaW5kaW5nRGVzY3JpcHRvcn0gZnJvbSAnLi9iaW5kaW5nX3V0aWxzJztcbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZ2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uQ29tcGxldGlvbnN9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHthdHRyaWJ1dGVOYW1lcywgZWxlbWVudE5hbWVzLCBldmVudE5hbWVzLCBwcm9wZXJ0eU5hbWVzfSBmcm9tICcuL2h0bWxfaW5mbyc7XG5pbXBvcnQge0lubGluZVRlbXBsYXRlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGdldFNlbGVjdG9ycywgaW5TcGFuLCBpc1N0cnVjdHVyYWxEaXJlY3RpdmUsIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IEhJRERFTl9IVE1MX0VMRU1FTlRTOiBSZWFkb25seVNldDxzdHJpbmc+ID1cbiAgICBuZXcgU2V0KFsnaHRtbCcsICdzY3JpcHQnLCAnbm9zY3JpcHQnLCAnYmFzZScsICdib2R5JywgJ3RpdGxlJywgJ2hlYWQnLCAnbGluayddKTtcbmNvbnN0IEhUTUxfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9XG4gICAgZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIUhJRERFTl9IVE1MX0VMRU1FTlRTLmhhcyhuYW1lKSkubWFwKG5hbWUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9FTEVNRU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG5jb25zdCBBTkdVTEFSX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PG5nLkNvbXBsZXRpb25FbnRyeT4gPSBbXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGFpbmVyJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy1jb250YWluZXInLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLWNvbnRlbnQnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRlbnQnLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLXRlbXBsYXRlJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy10ZW1wbGF0ZScsXG4gIH0sXG5dO1xuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJQYXJ0KGNvZGU6IG51bWJlcikge1xuICAvLyBJZGVudGlmaWVycyBjb25zaXN0IG9mIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzLCAnXycsIG9yICckJy5cbiAgcmV0dXJuIGlzQXNjaWlMZXR0ZXIoY29kZSkgfHwgaXNEaWdpdChjb2RlKSB8fCBjb2RlID09ICQkIHx8IGNvZGUgPT0gJF87XG59XG5cbi8qKlxuICogR2V0cyB0aGUgc3BhbiBvZiB3b3JkIGluIGEgdGVtcGxhdGUgdGhhdCBzdXJyb3VuZHMgYHBvc2l0aW9uYC4gSWYgdGhlcmUgaXMgbm8gd29yZCBhcm91bmRcbiAqIGBwb3NpdGlvbmAsIG5vdGhpbmcgaXMgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kZWRXb3JkU3BhbihcbiAgICB0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlciwgYXN0OiBIdG1sQXN0IHwgdW5kZWZpbmVkKTogdHMuVGV4dFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qge3RlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgY29uc3QgdGVtcGxhdGVTcmMgPSB0ZW1wbGF0ZS5zb3VyY2U7XG5cbiAgaWYgKCF0ZW1wbGF0ZVNyYykgcmV0dXJuO1xuXG4gIGlmIChhc3QgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgLy8gVGhlIEhUTUwgdGFnIG1heSBpbmNsdWRlIGAtYCAoZS5nLiBgYXBwLXJvb3RgKSxcbiAgICAvLyBzbyB1c2UgdGhlIEh0bWxBc3QgdG8gZ2V0IHRoZSBzcGFuIGJlZm9yZSBheWF6aGFmaXogcmVmYWN0b3IgdGhlIGNvZGUuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXJ0OiB0ZW1wbGF0ZUluZm8udGVtcGxhdGUuc3Bhbi5zdGFydCArIGFzdC5zdGFydFNvdXJjZVNwYW4gIS5zdGFydC5vZmZzZXQgKyAxLFxuICAgICAgbGVuZ3RoOiBhc3QubmFtZS5sZW5ndGhcbiAgICB9O1xuICB9XG5cbiAgLy8gVE9ETyhheWF6aGFmaXopOiBBIHNvbHV0aW9uIGJhc2VkIG9uIHdvcmQgZXhwYW5zaW9uIHdpbGwgYWx3YXlzIGJlIGV4cGVuc2l2ZSBjb21wYXJlZCB0byBvbmVcbiAgLy8gYmFzZWQgb24gQVNUcy4gV2hhdGV2ZXIgcGVuYWx0eSB3ZSBpbmN1ciBpcyBwcm9iYWJseSBtYW5hZ2VhYmxlIGZvciBzbWFsbC1sZW5ndGggKGkuZS4gdGhlXG4gIC8vIG1ham9yaXR5IG9mKSBpZGVudGlmaWVycywgYnV0IHRoZSBjdXJyZW50IHNvbHV0aW9uIGludm9sZXMgYSBudW1iZXIgb2YgYnJhbmNoaW5ncyBhbmQgd2UgY2FuJ3RcbiAgLy8gY29udHJvbCBwb3RlbnRpYWxseSB2ZXJ5IGxvbmcgaWRlbnRpZmllcnMuIENvbnNpZGVyIG1vdmluZyB0byBhbiBBU1QtYmFzZWQgc29sdXRpb24gb25jZVxuICAvLyBleGlzdGluZyBkaWZmaWN1bHRpZXMgd2l0aCBBU1Qgc3BhbnMgYXJlIG1vcmUgY2xlYXJseSByZXNvbHZlZCAoc2VlICMzMTg5OCBmb3IgZGlzY3Vzc2lvbiBvZlxuICAvLyBrbm93biBwcm9ibGVtcywgYW5kICMzMzA5MSBmb3IgaG93IHRoZXkgYWZmZWN0IHRleHQgcmVwbGFjZW1lbnQpLlxuICAvL1xuICAvLyBgdGVtcGxhdGVQb3NpdGlvbmAgcmVwcmVzZW50cyB0aGUgcmlnaHQtYm91bmQgbG9jYXRpb24gb2YgYSBjdXJzb3IgaW4gdGhlIHRlbXBsYXRlLlxuICAvLyAgICBrZXkuZW50fHJ5XG4gIC8vICAgICAgICAgICBeLS0tLSBjdXJzb3IsIGF0IHBvc2l0aW9uIGByYCBpcyBhdC5cbiAgLy8gQSBjdXJzb3IgaXMgbm90IGl0c2VsZiBhIGNoYXJhY3RlciBpbiB0aGUgdGVtcGxhdGU7IGl0IGhhcyBhIGxlZnQgKGxvd2VyKSBhbmQgcmlnaHQgKHVwcGVyKVxuICAvLyBpbmRleCBib3VuZCB0aGF0IGh1Z3MgdGhlIGN1cnNvciBpdHNlbGYuXG4gIGxldCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICAvLyBUbyBwZXJmb3JtIHdvcmQgZXhwYW5zaW9uLCB3ZSB3YW50IHRvIGRldGVybWluZSB0aGUgbGVmdCBhbmQgcmlnaHQgaW5kaWNlcyB0aGF0IGh1ZyB0aGUgY3Vyc29yLlxuICAvLyBUaGVyZSBhcmUgdGhyZWUgY2FzZXMgaGVyZS5cbiAgbGV0IGxlZnQsIHJpZ2h0O1xuICBpZiAodGVtcGxhdGVQb3NpdGlvbiA9PT0gMCkge1xuICAgIC8vIDEuIENhc2UgbGlrZVxuICAgIC8vICAgICAgfHJlc3Qgb2YgdGVtcGxhdGVcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBzdGFydCBvZiB0aGUgdGVtcGxhdGUsIGh1Z2dlZCBvbmx5IGJ5IHRoZSByaWdodCBzaWRlICgwLWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSAwO1xuICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPT09IHRlbXBsYXRlU3JjLmxlbmd0aCkge1xuICAgIC8vIDIuIENhc2UgbGlrZVxuICAgIC8vICAgICAgcmVzdCBvZiB0ZW1wbGF0ZXxcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBlbmQgb2YgdGhlIHRlbXBsYXRlLCBodWdnZWQgb25seSBieSB0aGUgbGVmdCBzaWRlIChsYXN0LWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSB0ZW1wbGF0ZVNyYy5sZW5ndGggLSAxO1xuICB9IGVsc2Uge1xuICAgIC8vIDMuIENhc2UgbGlrZVxuICAgIC8vICAgICAgd298cmRcbiAgICAvLyAgICB0aGVyZSBpcyBhIGNsZWFyIGxlZnQgYW5kIHJpZ2h0IGluZGV4LlxuICAgIGxlZnQgPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gMTtcbiAgICByaWdodCA9IHRlbXBsYXRlUG9zaXRpb247XG4gIH1cblxuICBpZiAoIWlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChsZWZ0KSkgJiZcbiAgICAgICFpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkge1xuICAgIC8vIENhc2UgbGlrZVxuICAgIC8vICAgICAgICAgLnwuXG4gICAgLy8gbGVmdCAtLS1eIF4tLS0gcmlnaHRcbiAgICAvLyBUaGVyZSBpcyBubyB3b3JkIGhlcmUuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXhwYW5kIG9uIHRoZSBsZWZ0IGFuZCByaWdodCBzaWRlIHVudGlsIGEgd29yZCBib3VuZGFyeSBpcyBoaXQuIEJhY2sgdXAgb25lIGV4cGFuc2lvbiBvbiBib3RoXG4gIC8vIHNpZGUgdG8gc3RheSBpbnNpZGUgdGhlIHdvcmQuXG4gIHdoaWxlIChsZWZ0ID49IDAgJiYgaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KGxlZnQpKSkgLS1sZWZ0O1xuICArK2xlZnQ7XG4gIHdoaWxlIChyaWdodCA8IHRlbXBsYXRlU3JjLmxlbmd0aCAmJiBpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkgKytyaWdodDtcbiAgLS1yaWdodDtcblxuICBjb25zdCBhYnNvbHV0ZVN0YXJ0UG9zaXRpb24gPSBwb3NpdGlvbiAtICh0ZW1wbGF0ZVBvc2l0aW9uIC0gbGVmdCk7XG4gIGNvbnN0IGxlbmd0aCA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gIHJldHVybiB7c3RhcnQ6IGFic29sdXRlU3RhcnRQb3NpdGlvbiwgbGVuZ3RofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlQ29tcGxldGlvbnMoXG4gICAgdGVtcGxhdGVJbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGxldCByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIGNvbnN0IHtodG1sQXN0LCB0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIC8vIFRoZSB0ZW1wbGF0ZU5vZGUgc3RhcnRzIGF0IHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyIHNvIHdlIGFkZCAxIHRvIHNraXAgaXQuXG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbihodG1sQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgY29uc3QgbW9zdFNwZWNpZmljID0gcGF0aC50YWlsO1xuICBpZiAocGF0aC5lbXB0eSB8fCAhbW9zdFNwZWNpZmljKSB7XG4gICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYXN0UG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gbW9zdFNwZWNpZmljLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIG1vc3RTcGVjaWZpYy52aXNpdChcbiAgICAgICAge1xuICAgICAgICAgIHZpc2l0RWxlbWVudChhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGFnU3BhbiA9IHNwYW5PZihhc3Quc291cmNlU3Bhbik7XG4gICAgICAgICAgICBjb25zdCB0YWdMZW4gPSBhc3QubmFtZS5sZW5ndGg7XG4gICAgICAgICAgICAvLyArIDEgZm9yIHRoZSBvcGVuaW5nIGFuZ2xlIGJyYWNrZXRcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDw9IHN0YXJ0VGFnU3Bhbi5zdGFydCArIHRhZ0xlbiArIDEpIHtcbiAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGluIHRoZSB0YWcgdGhlbiByZXR1cm4gdGhlIGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDwgc3RhcnRUYWdTcGFuLmVuZCkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIGF0dHJpYnV0ZSBzZWN0aW9uIG9mIHRoZSBlbGVtZW50IChidXQgbm90IGluIGFuIGF0dHJpYnV0ZSkuXG4gICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQodGVtcGxhdGVJbmZvLCBhc3QubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3Q6IEF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgLy8gQW4gYXR0cmlidXRlIGNvbnNpc3RzIG9mIHR3byBwYXJ0cywgTEhTPVwiUkhTXCIuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgY29tcGxldGlvbnMgYXJlIHJlcXVlc3RlZCBmb3IgTEhTIG9yIFJIU1xuICAgICAgICAgICAgaWYgKGFzdC52YWx1ZVNwYW4gJiYgaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgLy8gUkhTIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTEhTIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0VGV4dChhc3QpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBpbiBhIGVudGl0eS5cbiAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29udGVudFR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlBBUlNBQkxFX0RBVEEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBjYW4gaG9sZCBjb250ZW50LCBzaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIElmIG5vIGVsZW1lbnQgY29udGFpbmVyLCBpbXBsaWVzIHBhcnNhYmxlIGRhdGEgc28gc2hvdyBlbGVtZW50cy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRDb21tZW50KCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb24oKSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoKSB7fVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgfVxuXG4gIGNvbnN0IHJlcGxhY2VtZW50U3BhbiA9IGdldEJvdW5kZWRXb3JkU3Bhbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uLCBtb3N0U3BlY2lmaWMpO1xuICByZXR1cm4gcmVzdWx0Lm1hcChlbnRyeSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZW50cnksIHJlcGxhY2VtZW50U3BhbixcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBhdHRyID0gcGF0aC50YWlsO1xuICBjb25zdCBlbGVtID0gcGF0aC5wYXJlbnRPZihhdHRyKTtcbiAgaWYgKCEoYXR0ciBpbnN0YW5jZW9mIEF0dHJpYnV0ZSkgfHwgIShlbGVtIGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvLyBUT0RPOiBDb25zaWRlciBwYXJzaW5nIHRoZSBhdHRyaW51dGUgbmFtZSB0byBhIHByb3BlciBBU1QgaW5zdGVhZCBvZlxuICAvLyBtYXRjaGluZyB1c2luZyByZWdleC4gVGhpcyBpcyBiZWNhdXNlIHRoZSByZWdleHAgd291bGQgaW5jb3JyZWN0bHkgaWRlbnRpZnlcbiAgLy8gYmluZCBwYXJ0cyBmb3IgY2FzZXMgbGlrZSBbKCl8XVxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF4gY3Vyc29yIGlzIGhlcmVcbiAgY29uc3QgYmluZGluZyA9IGdldEJpbmRpbmdEZXNjcmlwdG9yKGF0dHIubmFtZSk7XG4gIGlmICghYmluZGluZykge1xuICAgIC8vIFRoaXMgaXMgYSBub3JtYWwgSFRNTCBhdHRyaWJ1dGUsIG5vdCBhbiBBbmd1bGFyIGF0dHJpYnV0ZS5cbiAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIGVsZW0ubmFtZSk7XG4gIH1cblxuICBjb25zdCByZXN1bHRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBuZ0F0dHJzID0gYW5ndWxhckF0dHJpYnV0ZXMoaW5mbywgZWxlbS5uYW1lKTtcbiAgc3dpdGNoIChiaW5kaW5nLmtpbmQpIHtcbiAgICBjYXNlIEFUVFIuS1dfTUlDUk9TWU5UQVg6XG4gICAgICAvLyB0ZW1wbGF0ZSByZWZlcmVuY2UgYXR0cmlidXRlOiAqYXR0ck5hbWVcbiAgICAgIHJlc3VsdHMucHVzaCguLi5uZ0F0dHJzLnRlbXBsYXRlUmVmcyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgQVRUUi5LV19CSU5EOlxuICAgIGNhc2UgQVRUUi5JREVOVF9QUk9QRVJUWTpcbiAgICAgIC8vIHByb3BlcnR5IGJpbmRpbmcgdmlhIGJpbmQtIG9yIFtdXG4gICAgICByZXN1bHRzLnB1c2goLi4ucHJvcGVydHlOYW1lcyhlbGVtLm5hbWUpLCAuLi5uZ0F0dHJzLmlucHV0cyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgQVRUUi5LV19PTjpcbiAgICBjYXNlIEFUVFIuSURFTlRfRVZFTlQ6XG4gICAgICAvLyBldmVudCBiaW5kaW5nIHZpYSBvbi0gb3IgKClcbiAgICAgIHJlc3VsdHMucHVzaCguLi5ldmVudE5hbWVzKGVsZW0ubmFtZSksIC4uLm5nQXR0cnMub3V0cHV0cyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgQVRUUi5LV19CSU5ET046XG4gICAgY2FzZSBBVFRSLklERU5UX0JBTkFOQV9CT1g6XG4gICAgICAvLyBiYW5hbmEtaW4tYS1ib3ggYmluZGluZyB2aWEgYmluZG9uLSBvciBbKCldXG4gICAgICByZXN1bHRzLnB1c2goLi4ubmdBdHRycy5iYW5hbmFzKTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChcbiAgICBpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBhdHRyaWJ1dGVzIGNvbXBsZXRpb24gb25seSBmb3IgaW5saW5lIHRlbXBsYXRlc1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyaWJ1dGVOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkhUTUxfQVRUUklCVVRFLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCBBbmd1bGFyIGF0dHJpYnV0ZXNcbiAgY29uc3QgbmdBdHRycyA9IGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW1lbnROYW1lKTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIG5nQXR0cnMub3RoZXJzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFByb3ZpZGUgY29tcGxldGlvbnMgdG8gdGhlIFJIUyBvZiBhbiBhdHRyaWJ1dGUsIHdoaWNoIGlzIG9mIHRoZSBmb3JtXG4gKiBMSFM9XCJSSFNcIi4gVGhlIHRlbXBsYXRlIHBhdGggaXMgY29tcHV0ZWQgZnJvbSB0aGUgc3BlY2lmaWVkIGBpbmZvYCB3aGVyZWFzXG4gKiB0aGUgY29udGV4dCBpcyBkZXRlcm1pbmVkIGZyb20gdGhlIHNwZWNpZmllZCBgaHRtbFBhdGhgLlxuICogQHBhcmFtIGluZm8gT2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIGh0bWxQYXRoIFBhdGggdG8gdGhlIEhUTUwgbm9kZVxuICovXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgaHRtbFBhdGg6IEh0bWxBc3RQYXRoKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIFRlbXBsYXRlIEFTVCBwYXRoLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBodG1sUGF0aC5wb3NpdGlvbik7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgaHRtbFBhdGgucG9zaXRpb24sICgpID0+IHtcbiAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICByZXR1cm4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB0ZW1wbGF0ZVBhdGgpO1xuICB9KTtcbiAgaWYgKHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQXR0ckFzdCB8fFxuICAgICAgdGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCB8fFxuICAgICAgdGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBCb3VuZEV2ZW50QXN0KSB7XG4gICAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gICAgcmV0dXJuIHZpc2l0b3IucmVzdWx0cztcbiAgfVxuICAvLyBJbiBvcmRlciB0byBwcm92aWRlIGFjY3VyYXRlIGF0dHJpYnV0ZSB2YWx1ZSBjb21wbGV0aW9uLCB3ZSBuZWVkIHRvIGtub3dcbiAgLy8gd2hhdCB0aGUgTEhTIGlzLCBhbmQgY29uc3RydWN0IHRoZSBwcm9wZXIgQVNUIGlmIGl0IGlzIG1pc3NpbmcuXG4gIGNvbnN0IGh0bWxBdHRyID0gaHRtbFBhdGgudGFpbCBhcyBBdHRyaWJ1dGU7XG4gIGNvbnN0IGJpbmRpbmcgPSBnZXRCaW5kaW5nRGVzY3JpcHRvcihodG1sQXR0ci5uYW1lKTtcbiAgaWYgKGJpbmRpbmcgJiYgYmluZGluZy5raW5kID09PSBBVFRSLktXX1JFRikge1xuICAgIGxldCByZWZBc3Q6IFJlZmVyZW5jZUFzdHx1bmRlZmluZWQ7XG4gICAgbGV0IGVsZW1Bc3Q6IEVsZW1lbnRBc3R8dW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIFJlZmVyZW5jZUFzdCkge1xuICAgICAgcmVmQXN0ID0gdGVtcGxhdGVQYXRoLnRhaWw7XG4gICAgICBjb25zdCBwYXJlbnQgPSB0ZW1wbGF0ZVBhdGgucGFyZW50T2YocmVmQXN0KTtcbiAgICAgIGlmIChwYXJlbnQgaW5zdGFuY2VvZiBFbGVtZW50QXN0KSB7XG4gICAgICAgIGVsZW1Bc3QgPSBwYXJlbnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEVsZW1lbnRBc3QpIHtcbiAgICAgIHJlZkFzdCA9IG5ldyBSZWZlcmVuY2VBc3QoaHRtbEF0dHIubmFtZSwgbnVsbCAhLCBodG1sQXR0ci52YWx1ZSwgaHRtbEF0dHIudmFsdWVTcGFuICEpO1xuICAgICAgZWxlbUFzdCA9IHRlbXBsYXRlUGF0aC50YWlsO1xuICAgIH1cbiAgICBpZiAocmVmQXN0ICYmIGVsZW1Bc3QpIHtcbiAgICAgIHJlZkFzdC52aXNpdCh2aXNpdG9yLCBlbGVtQXN0KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSHRtbEFzdCBjb250YWlucyB0aGUgYEF0dHJpYnV0ZWAgbm9kZSwgaG93ZXZlciB0aGUgY29ycmVzcG9uZGluZyBgQXR0ckFzdGBcbiAgICAvLyBub2RlIGlzIG1pc3NpbmcgZnJvbSB0aGUgVGVtcGxhdGVBc3QuXG4gICAgY29uc3QgYXR0ckFzdCA9IG5ldyBBdHRyQXN0KGh0bWxBdHRyLm5hbWUsIGh0bWxBdHRyLnZhbHVlLCBodG1sQXR0ci52YWx1ZVNwYW4gISk7XG4gICAgYXR0ckFzdC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgfVxuICByZXR1cm4gdmlzaXRvci5yZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBlbGVtZW50Q29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFsuLi5BTkdVTEFSX0VMRU1FTlRTXTtcblxuICBpZiAoaW5mby50ZW1wbGF0ZSBpbnN0YW5jZW9mIElubGluZVRlbXBsYXRlKSB7XG4gICAgLy8gUHJvdmlkZSBIVE1MIGVsZW1lbnRzIGNvbXBsZXRpb24gb25seSBmb3IgaW5saW5lIHRlbXBsYXRlc1xuICAgIHJlc3VsdHMucHVzaCguLi5IVE1MX0VMRU1FTlRTKTtcbiAgfVxuXG4gIC8vIENvbGxlY3QgdGhlIGVsZW1lbnRzIHJlZmVyZW5jZWQgYnkgdGhlIHNlbGVjdG9yc1xuICBjb25zdCBjb21wb25lbnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2YgZ2V0U2VsZWN0b3JzKGluZm8pLnNlbGVjdG9ycykge1xuICAgIGNvbnN0IG5hbWUgPSBzZWxlY3Rvci5lbGVtZW50O1xuICAgIGlmIChuYW1lICYmICFjb21wb25lbnRzLmhhcyhuYW1lKSkge1xuICAgICAgY29tcG9uZW50cy5hZGQobmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5DT01QT05FTlQsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVudGl0eUNvbXBsZXRpb25zKHZhbHVlOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGVudGl0eSBjb21wbGV0aW9uc1xuICBjb25zdCByZSA9IC8mW0EtWmEtel0qOz8oPyFcXGQpL2c7XG4gIGxldCBmb3VuZDogUmVnRXhwRXhlY0FycmF5fG51bGw7XG4gIGxldCByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIHdoaWxlIChmb3VuZCA9IHJlLmV4ZWModmFsdWUpKSB7XG4gICAgbGV0IGxlbiA9IGZvdW5kWzBdLmxlbmd0aDtcbiAgICBpZiAocG9zaXRpb24gPj0gZm91bmQuaW5kZXggJiYgcG9zaXRpb24gPCAoZm91bmQuaW5kZXggKyBsZW4pKSB7XG4gICAgICByZXN1bHQgPSBPYmplY3Qua2V5cyhOQU1FRF9FTlRJVElFUykubWFwKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5hbWU6IGAmJHtuYW1lfTtgLFxuICAgICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkVOVElUWSxcbiAgICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGludGVycG9sYXRpb25Db21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGFuIGludGVycG9sYXRpb24gaW4gYXQgdGhlIHBvc2l0aW9uLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbik7XG4gIGlmICghdGVtcGxhdGVQYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgIGluZm8sIHBvc2l0aW9uLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pLCB0ZW1wbGF0ZVBhdGgpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBsZXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIG5nLkNvbXBsZXRpb25FbnRyeT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gbmcuU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IHJlc3VsdHMoKTogbmcuQ29tcGxldGlvbkVudHJ5W10geyByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbXBsZXRpb25zLnZhbHVlcygpKTsgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KCk6IHZvaWQge1xuICAgIC8vIG5vLW9wIGZvciBub3dcbiAgfVxuXG4gIHZpc2l0QXR0cihhc3Q6IEF0dHJBc3QpIHtcbiAgICBjb25zdCBiaW5kaW5nID0gZ2V0QmluZGluZ0Rlc2NyaXB0b3IoYXN0Lm5hbWUpO1xuICAgIGlmIChiaW5kaW5nICYmIGJpbmRpbmcua2luZCA9PT0gQVRUUi5LV19NSUNST1NZTlRBWCkge1xuICAgICAgLy8gVGhpcyBhIHRlbXBsYXRlIGJpbmRpbmcgZ2l2ZW4gYnkgbWljcm8gc3ludGF4IGV4cHJlc3Npb24uXG4gICAgICAvLyBGaXJzdCwgdmVyaWZ5IHRoZSBhdHRyaWJ1dGUgY29uc2lzdHMgb2Ygc29tZSBiaW5kaW5nIHdlIGNhbiBnaXZlIGNvbXBsZXRpb25zIGZvci5cbiAgICAgIC8vIFRoZSBzb3VyY2VTcGFuIG9mIEF0dHJBc3QgcG9pbnRzIHRvIHRoZSBSSFMgb2YgdGhlIGF0dHJpYnV0ZVxuICAgICAgY29uc3QgdGVtcGxhdGVLZXkgPSBiaW5kaW5nLm5hbWU7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVZhbHVlID0gYXN0LnNvdXJjZVNwYW4udG9TdHJpbmcoKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQuZmlsZS51cmw7XG4gICAgICAvLyBUT0RPKGt5bGlhdSk6IFdlIGFyZSB1bmFibGUgdG8gZGV0ZXJtaW5lIHRoZSBhYnNvbHV0ZSBvZmZzZXQgb2YgdGhlIGtleVxuICAgICAgLy8gYnV0IGl0IGlzIG9rYXkgaGVyZSwgYmVjYXVzZSB3ZSBhcmUgb25seSBsb29raW5nIGF0IHRoZSBSSFMgb2YgdGhlIGF0dHJcbiAgICAgIGNvbnN0IGFic0tleU9mZnNldCA9IDA7XG4gICAgICBjb25zdCBhYnNWYWx1ZU9mZnNldCA9IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IHt0ZW1wbGF0ZUJpbmRpbmdzfSA9IHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhcbiAgICAgICAgICB0ZW1wbGF0ZUtleSwgdGVtcGxhdGVWYWx1ZSwgdGVtcGxhdGVVcmwsIGFic0tleU9mZnNldCwgYWJzVmFsdWVPZmZzZXQpO1xuICAgICAgLy8gRmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IHRlbXBsYXRlQmluZGluZyA9IHRlbXBsYXRlQmluZGluZ3MuZmluZChiID0+IGluU3Bhbih0aGlzLnBvc2l0aW9uLCBiLnNvdXJjZVNwYW4pKTtcblxuICAgICAgaWYgKCF0ZW1wbGF0ZUJpbmRpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm1pY3JvU3ludGF4SW5BdHRyaWJ1dGVWYWx1ZShhc3QsIHRlbXBsYXRlQmluZGluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25Bc3QgPSB0aGlzLmluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZUJpbmRpbmcoXG4gICAgICAgICAgYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbi50b1N0cmluZygpLCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAgICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGV4cHJlc3Npb25Bc3QpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0UmVmZXJlbmNlKF9hc3Q6IFJlZmVyZW5jZUFzdCwgY29udGV4dDogRWxlbWVudEFzdCkge1xuICAgIGNvbnRleHQuZGlyZWN0aXZlcy5mb3JFYWNoKGRpciA9PiB7XG4gICAgICBjb25zdCB7ZXhwb3J0QXN9ID0gZGlyLmRpcmVjdGl2ZTtcbiAgICAgIGlmIChleHBvcnRBcykge1xuICAgICAgICB0aGlzLmNvbXBsZXRpb25zLnNldChcbiAgICAgICAgICAgIGV4cG9ydEFzLCB7bmFtZTogZXhwb3J0QXMsIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLlJFRkVSRU5DRSwgc29ydFRleHQ6IGV4cG9ydEFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2aXNpdEJvdW5kVGV4dChhc3Q6IEJvdW5kVGV4dEFzdCkge1xuICAgIGlmIChpblNwYW4odGhpcy5wb3NpdGlvbiwgYXN0LnZhbHVlLnNvdXJjZVNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIHRoaXMucG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZSk7XG4gICAgICBpZiAoY29tcGxldGlvbnMpIHtcbiAgICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKHZhbHVlOiBBU1QpIHtcbiAgICBjb25zdCBzeW1ib2xzID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCB2YWx1ZSwgdGhpcy5wb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlKTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IG5nLlN5bWJvbFtdKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIHN5bWJvbHMpIHtcbiAgICAgIGlmIChzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSB8fCAhcy5wdWJsaWMgfHwgdGhpcy5jb21wbGV0aW9ucy5oYXMocy5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHBpcGUgbWV0aG9kIHNob3VsZCBub3QgaW5jbHVkZSBwYXJlbnRoZXNlcy5cbiAgICAgIC8vIGUuZy4ge3sgdmFsdWVfZXhwcmVzc2lvbiB8IHNsaWNlIDogc3RhcnQgWyA6IGVuZCBdIH19XG4gICAgICBjb25zdCBzaG91bGRJbnNlcnRQYXJlbnRoZXNlcyA9IHMuY2FsbGFibGUgJiYgcy5raW5kICE9PSBuZy5Db21wbGV0aW9uS2luZC5QSVBFO1xuICAgICAgdGhpcy5jb21wbGV0aW9ucy5zZXQocy5uYW1lLCB7XG4gICAgICAgIG5hbWU6IHMubmFtZSxcbiAgICAgICAga2luZDogcy5raW5kIGFzIG5nLkNvbXBsZXRpb25LaW5kLFxuICAgICAgICBzb3J0VGV4dDogcy5uYW1lLFxuICAgICAgICBpbnNlcnRUZXh0OiBzaG91bGRJbnNlcnRQYXJlbnRoZXNlcyA/IGAke3MubmFtZX0oKWAgOiBzLm5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaGFuZGxlcyB0aGUgY29tcGxldGlvbnMgb2YgYXR0cmlidXRlIHZhbHVlcyBmb3IgZGlyZWN0aXZlcyB0aGF0XG4gICAqIHN1cHBvcnQgdGhlIG1pY3Jvc3ludGF4IGZvcm1hdC4gRXhhbXBsZXMgYXJlICpuZ0ZvciBhbmQgKm5nSWYuXG4gICAqIFRoZXNlIGRpcmVjdGl2ZXMgYWxsb3dzIGRlY2xhcmF0aW9uIG9mIFwibGV0XCIgdmFyaWFibGVzLCBhZGRzIGNvbnRleHQtc3BlY2lmaWNcbiAgICogc3ltYm9scyBsaWtlICRpbXBsaWNpdCwgaW5kZXgsIGNvdW50LCBhbW9uZyBvdGhlciBiZWhhdmlvcnMuXG4gICAqIEZvciBhIGNvbXBsZXRlIGRlc2NyaXB0aW9uIG9mIHN1Y2ggZm9ybWF0LCBzZWVcbiAgICogaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3N0cnVjdHVyYWwtZGlyZWN0aXZlcyN0aGUtYXN0ZXJpc2stLXByZWZpeFxuICAgKlxuICAgKiBAcGFyYW0gYXR0ciBkZXNjcmlwdG9yIGZvciBhdHRyaWJ1dGUgbmFtZSBhbmQgdmFsdWUgcGFpclxuICAgKiBAcGFyYW0gYmluZGluZyB0ZW1wbGF0ZSBiaW5kaW5nIGZvciB0aGUgZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlXG4gICAqL1xuICBwcml2YXRlIG1pY3JvU3ludGF4SW5BdHRyaWJ1dGVWYWx1ZShhdHRyOiBBdHRyQXN0LCBiaW5kaW5nOiBUZW1wbGF0ZUJpbmRpbmcpIHtcbiAgICBjb25zdCBrZXkgPSBhdHRyLm5hbWUuc3Vic3RyaW5nKDEpOyAgLy8gcmVtb3ZlIGxlYWRpbmcgYXN0ZXJpc2tcblxuICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yIC0gZWcgbmdGb3IsIG5nSWYsIGV0Y1xuICAgIGNvbnN0IHNlbGVjdG9ySW5mbyA9IGdldFNlbGVjdG9ycyh0aGlzLmluZm8pO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gc2VsZWN0b3JJbmZvLnNlbGVjdG9ycy5maW5kKHMgPT4ge1xuICAgICAgLy8gYXR0cmlidXRlcyBhcmUgbGlzdGVkIGluIChhdHRyaWJ1dGUsIHZhbHVlKSBwYWlyc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzLmF0dHJzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIGlmIChzLmF0dHJzW2ldID09PSBrZXkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSBhdHRyLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuXG4gICAgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBWYXJpYWJsZUJpbmRpbmcpIHtcbiAgICAgIC8vIFRPRE8oa3lsaWF1KTogV2l0aCBleHByZXNzaW9uIHNvdXJjZVNwYW4gd2Ugc2hvdWxkbid0IGhhdmUgdG8gc2VhcmNoXG4gICAgICAvLyB0aGUgYXR0cmlidXRlIHZhbHVlIHN0cmluZyBhbnltb3JlLiBKdXN0IGNoZWNrIGlmIHBvc2l0aW9uIGlzIGluIHRoZVxuICAgICAgLy8gZXhwcmVzc2lvbiBzb3VyY2Ugc3Bhbi5cbiAgICAgIGNvbnN0IGVxdWFsTG9jYXRpb24gPSBhdHRyLnZhbHVlLmluZGV4T2YoJz0nKTtcbiAgICAgIGlmIChlcXVhbExvY2F0aW9uID4gMCAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBlcXVhbExvY2F0aW9uKSB7XG4gICAgICAgIC8vIFdlIGFyZSBhZnRlciB0aGUgJz0nIGluIGEgbGV0IGNsYXVzZS4gVGhlIHZhbGlkIHZhbHVlcyBoZXJlIGFyZSB0aGUgbWVtYmVycyBvZiB0aGVcbiAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZU1ldGFkYXRhID0gc2VsZWN0b3JJbmZvLm1hcC5nZXQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEpIHtcbiAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZU1ldGFkYXRhLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICBpZiAoY29udGV4dFRhYmxlKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGFkZHMgc3ltYm9scyBsaWtlICRpbXBsaWNpdCwgaW5kZXgsIGNvdW50LCBldGMuXG4gICAgICAgICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbnRleHRUYWJsZS52YWx1ZXMoKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChiaW5kaW5nIGluc3RhbmNlb2YgRXhwcmVzc2lvbkJpbmRpbmcpIHtcbiAgICAgIGlmIChpblNwYW4odGhpcy5wb3NpdGlvbiwgYmluZGluZy52YWx1ZT8uYXN0LnNvdXJjZVNwYW4pKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhiaW5kaW5nLnZhbHVlICEuYXN0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmICghYmluZGluZy52YWx1ZSAmJiB0aGlzLnBvc2l0aW9uID4gYmluZGluZy5rZXkuc3Bhbi5lbmQpIHtcbiAgICAgICAgLy8gTm8gZXhwcmVzc2lvbiBpcyBkZWZpbmVkIGZvciB0aGUgdmFsdWUgb2YgdGhlIGtleSBleHByZXNzaW9uIGJpbmRpbmcsIGJ1dCB0aGUgY3Vyc29yIGlzXG4gICAgICAgIC8vIGluIGEgbG9jYXRpb24gd2hlcmUgdGhlIGV4cHJlc3Npb24gd291bGQgYmUgZGVmaW5lZC4gVGhpcyBjYW4gaGFwcGVuIGluIGEgY2FzZSBsaWtlXG4gICAgICAgIC8vICAgbGV0IGkgb2YgfFxuICAgICAgICAvLyAgICAgICAgICAgIF4tLSBjdXJzb3JcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBiYWNrZmlsbCB0aGUgdmFsdWUgdG8gYmUgYW4gZW1wdHkgZXhwcmVzc2lvbiBhbmQgcmV0cmlldmUgY29tcGxldGlvbnMuXG4gICAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhuZXcgRW1wdHlFeHByKFxuICAgICAgICAgICAgbmV3IFBhcnNlU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiksXG4gICAgICAgICAgICBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHRoaXMucG9zaXRpb24sIHRoaXMucG9zaXRpb24pKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogbmcuVGVtcGxhdGVTb3VyY2UsIHNwYW46IG5nLlNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmludGVyZmFjZSBBbmd1bGFyQXR0cmlidXRlcyB7XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHRoYXQgc3VwcG9ydCB0aGUgKiBzeW50YXguIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvVGVtcGxhdGVSZWZcbiAgICovXG4gIHRlbXBsYXRlUmVmczogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHdpdGggdGhlIEBJbnB1dCBhbm5vdGF0aW9uLlxuICAgKi9cbiAgaW5wdXRzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgd2l0aCB0aGUgQE91dHB1dCBhbm5vdGF0aW9uLlxuICAgKi9cbiAgb3V0cHV0czogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHRoYXQgc3VwcG9ydCB0aGUgWygpXSBvciBiaW5kb24tIHN5bnRheC5cbiAgICovXG4gIGJhbmFuYXM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogR2VuZXJhbCBhdHRyaWJ1dGVzIHRoYXQgbWF0Y2ggdGhlIHNwZWNpZmllZCBlbGVtZW50LlxuICAgKi9cbiAgb3RoZXJzOiBTZXQ8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYWxsIEFuZ3VsYXItc3BlY2lmaWMgYXR0cmlidXRlcyBmb3IgdGhlIGVsZW1lbnQgd2l0aCBgZWxlbWVudE5hbWVgLlxuICogQHBhcmFtIGluZm9cbiAqIEBwYXJhbSBlbGVtZW50TmFtZVxuICovXG5mdW5jdGlvbiBhbmd1bGFyQXR0cmlidXRlcyhpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBBbmd1bGFyQXR0cmlidXRlcyB7XG4gIGNvbnN0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBjb25zdCB0ZW1wbGF0ZVJlZnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgYmFuYW5hcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdGhlcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBzZWxlY3RvcnMpIHtcbiAgICBpZiAoc2VsZWN0b3IuZWxlbWVudCAmJiBzZWxlY3Rvci5lbGVtZW50ICE9PSBlbGVtZW50TmFtZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHN1bW1hcnkgPSBzZWxlY3Rvck1hcC5nZXQoc2VsZWN0b3IpICE7XG4gICAgY29uc3QgaGFzVGVtcGxhdGVSZWYgPSBpc1N0cnVjdHVyYWxEaXJlY3RpdmUoc3VtbWFyeS50eXBlKTtcbiAgICAvLyBhdHRyaWJ1dGVzIGFyZSBsaXN0ZWQgaW4gKGF0dHJpYnV0ZSwgdmFsdWUpIHBhaXJzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Rvci5hdHRycy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgY29uc3QgYXR0ciA9IHNlbGVjdG9yLmF0dHJzW2ldO1xuICAgICAgaWYgKGhhc1RlbXBsYXRlUmVmKSB7XG4gICAgICAgIHRlbXBsYXRlUmVmcy5hZGQoYXR0cik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdGhlcnMuYWRkKGF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5pbnB1dHMpKSB7XG4gICAgICBpbnB1dHMuYWRkKGlucHV0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5Lm91dHB1dHMpKSB7XG4gICAgICBvdXRwdXRzLmFkZChvdXRwdXQpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5wdXRzKSB7XG4gICAgLy8gQWRkIGJhbmFuYS1pbi1hLWJveCBzeW50YXhcbiAgICAvLyBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtc3ludGF4I3R3by13YXktYmluZGluZy1cbiAgICBpZiAob3V0cHV0cy5oYXMoYCR7bmFtZX1DaGFuZ2VgKSkge1xuICAgICAgYmFuYW5hcy5hZGQobmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7dGVtcGxhdGVSZWZzLCBpbnB1dHMsIG91dHB1dHMsIGJhbmFuYXMsIG90aGVyc307XG59XG4iXX0=