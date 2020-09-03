/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.getTemplateCompletions = void 0;
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
        var htmlAst = templateInfo.htmlAst, template = templateInfo.template;
        // Calculate the position relative to the start of the template. This is needed
        // because spans in HTML AST are relative. Inline template has non-zero start position.
        var templatePosition = position - template.span.start;
        var htmlPath = utils_1.getPathToNodeAtPosition(htmlAst, templatePosition);
        var mostSpecific = htmlPath.tail;
        var visitor = new HtmlVisitor(templateInfo, htmlPath);
        var results = mostSpecific ?
            mostSpecific.visit(visitor, null /* context */) :
            elementCompletions(templateInfo);
        var replacementSpan = getBoundedWordSpan(templateInfo, position, mostSpecific);
        return results.map(function (entry) {
            return tslib_1.__assign(tslib_1.__assign({}, entry), { replacementSpan: replacementSpan });
        });
    }
    exports.getTemplateCompletions = getTemplateCompletions;
    var HtmlVisitor = /** @class */ (function () {
        function HtmlVisitor(templateInfo, htmlPath) {
            this.templateInfo = templateInfo;
            this.htmlPath = htmlPath;
            this.relativePosition = htmlPath.position;
        }
        // Note that every visitor method must explicitly specify return type because
        // Visitor returns `any` for all methods.
        HtmlVisitor.prototype.visitElement = function (ast) {
            var startTagSpan = utils_1.spanOf(ast.sourceSpan);
            var tagLen = ast.name.length;
            // + 1 for the opening angle bracket
            if (this.relativePosition <= startTagSpan.start + tagLen + 1) {
                // If we are in the tag then return the element completions.
                return elementCompletions(this.templateInfo);
            }
            if (this.relativePosition < startTagSpan.end) {
                // We are in the attribute section of the element (but not in an attribute).
                // Return the attribute completions.
                return attributeCompletionsForElement(this.templateInfo, ast.name);
            }
            return [];
        };
        HtmlVisitor.prototype.visitAttribute = function (ast) {
            // An attribute consists of two parts, LHS="RHS".
            // Determine if completions are requested for LHS or RHS
            if (ast.valueSpan && utils_1.inSpan(this.relativePosition, utils_1.spanOf(ast.valueSpan))) {
                // RHS completion
                return attributeValueCompletions(this.templateInfo, this.htmlPath);
            }
            // LHS completion
            return attributeCompletions(this.templateInfo, this.htmlPath);
        };
        HtmlVisitor.prototype.visitText = function () {
            var _this = this;
            var _a;
            var templatePath = utils_1.findTemplateAstAt(this.templateInfo.templateAst, this.relativePosition);
            if (templatePath.tail instanceof compiler_1.BoundTextAst) {
                // If we know that this is an interpolation then do not try other scenarios.
                var visitor = new ExpressionVisitor(this.templateInfo, this.relativePosition, function () {
                    return expression_diagnostics_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(_this.templateInfo), templatePath);
                });
                (_a = templatePath.tail) === null || _a === void 0 ? void 0 : _a.visit(visitor, null);
                return visitor.results;
            }
            // TODO(kyliau): Not sure if this check is really needed since we don't have
            // any test cases for it.
            var element = this.htmlPath.first(compiler_1.Element);
            if (element &&
                compiler_1.getHtmlTagDefinition(element.name).contentType !== compiler_1.TagContentType.PARSABLE_DATA) {
                return [];
            }
            // This is to account for cases like <h1> <a> text | </h1> where the
            // closest element has no closing tag and thus is considered plain text.
            var results = voidElementAttributeCompletions(this.templateInfo, this.htmlPath);
            if (results.length) {
                return results;
            }
            return elementCompletions(this.templateInfo);
        };
        HtmlVisitor.prototype.visitComment = function () {
            return [];
        };
        HtmlVisitor.prototype.visitExpansion = function () {
            return [];
        };
        HtmlVisitor.prototype.visitExpansionCase = function () {
            return [];
        };
        return HtmlVisitor;
    }());
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
            var dinfo = utils_1.diagnosticInfoFromTemplateInfo(info);
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
            get: function () {
                return Array.from(this.completions.values());
            },
            enumerable: false,
            configurable: true
        });
        ExpressionVisitor.prototype.visitDirectiveProperty = function (ast) {
            this.processExpressionCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitElementProperty = function (ast) {
            this.processExpressionCompletions(ast.value);
        };
        ExpressionVisitor.prototype.visitEvent = function (ast) {
            this.processExpressionCompletions(ast.handler);
        };
        ExpressionVisitor.prototype.visitElement = function () {
            // no-op for now
        };
        ExpressionVisitor.prototype.visitAttr = function (ast) {
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
                // Find the nearest template binding to the position.
                var lastBindingEnd = templateBindings.length > 0 &&
                    templateBindings[templateBindings.length - 1].sourceSpan.end;
                var normalizedPositionToBinding_1 = lastBindingEnd && this.position > lastBindingEnd ? lastBindingEnd : this.position;
                var templateBinding = templateBindings.find(function (b) { return utils_1.inSpan(normalizedPositionToBinding_1, b.sourceSpan); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQThYO0lBQzlYLHFEQUEyRTtJQUUzRSw2RUFBMkQ7SUFDM0QsK0ZBQTREO0lBQzVELHlFQUF1RDtJQUN2RCxxRUFBb0Y7SUFDcEYsbUVBQTBDO0lBQzFDLHdEQUE4QjtJQUM5Qiw2REFBd0o7SUFFeEosSUFBTSxvQkFBb0IsR0FDdEIsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNyRixJQUFNLGFBQWEsR0FDZix3QkFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO1FBQ3JFLE9BQU87WUFDTCxJQUFJLE1BQUE7WUFDSixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZO1lBQ3BDLFFBQVEsRUFBRSxJQUFJO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ1AsSUFBTSxnQkFBZ0IsR0FBc0M7UUFDMUQ7WUFDRSxJQUFJLEVBQUUsY0FBYztZQUNwQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxjQUFjO1NBQ3pCO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsWUFBWTtZQUNsQixJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxZQUFZO1NB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QUFPLEVBQUMsWUFBWSxjQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUMsQ0FBQztJQUMxRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBBU1QsIEFzdFBhdGgsIEF0dHJBc3QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgRWxlbWVudCwgRWxlbWVudEFzdCwgRW1wdHlFeHByLCBFeHByZXNzaW9uQmluZGluZywgZ2V0SHRtbFRhZ0RlZmluaXRpb24sIEh0bWxBc3RQYXRoLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUmVmZXJlbmNlQXN0LCBUYWdDb250ZW50VHlwZSwgVGVtcGxhdGVCaW5kaW5nLCBUZXh0LCBWYXJpYWJsZUJpbmRpbmcsIFZpc2l0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7JCQsICRfLCBpc0FzY2lpTGV0dGVyLCBpc0RpZ2l0fSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvY2hhcnMnO1xuXG5pbXBvcnQge0FUVFIsIGdldEJpbmRpbmdEZXNjcmlwdG9yfSBmcm9tICcuL2JpbmRpbmdfdXRpbHMnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uU2NvcGV9IGZyb20gJy4vZXhwcmVzc2lvbl9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldEV4cHJlc3Npb25Db21wbGV0aW9uc30gZnJvbSAnLi9leHByZXNzaW9ucyc7XG5pbXBvcnQge2F0dHJpYnV0ZU5hbWVzLCBlbGVtZW50TmFtZXMsIGV2ZW50TmFtZXMsIHByb3BlcnR5TmFtZXN9IGZyb20gJy4vaHRtbF9pbmZvJztcbmltcG9ydCB7SW5saW5lVGVtcGxhdGV9IGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2RpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbywgZmluZFRlbXBsYXRlQXN0QXQsIGdldFBhdGhUb05vZGVBdFBvc2l0aW9uLCBnZXRTZWxlY3RvcnMsIGluU3BhbiwgaXNTdHJ1Y3R1cmFsRGlyZWN0aXZlLCBzcGFuT2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBISURERU5fSFRNTF9FTEVNRU5UUzogUmVhZG9ubHlTZXQ8c3RyaW5nPiA9XG4gICAgbmV3IFNldChbJ2h0bWwnLCAnc2NyaXB0JywgJ25vc2NyaXB0JywgJ2Jhc2UnLCAnYm9keScsICd0aXRsZScsICdoZWFkJywgJ2xpbmsnXSk7XG5jb25zdCBIVE1MX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PG5nLkNvbXBsZXRpb25FbnRyeT4gPVxuICAgIGVsZW1lbnROYW1lcygpLmZpbHRlcihuYW1lID0+ICFISURERU5fSFRNTF9FTEVNRU5UUy5oYXMobmFtZSkpLm1hcChuYW1lID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkhUTUxfRUxFTUVOVCxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9O1xuICAgIH0pO1xuY29uc3QgQU5HVUxBUl9FTEVNRU5UUzogUmVhZG9ubHlBcnJheTxuZy5Db21wbGV0aW9uRW50cnk+ID0gW1xuICB7XG4gICAgbmFtZTogJ25nLWNvbnRhaW5lcicsXG4gICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQU5HVUxBUl9FTEVNRU5ULFxuICAgIHNvcnRUZXh0OiAnbmctY29udGFpbmVyJyxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICduZy1jb250ZW50JyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy1jb250ZW50JyxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICduZy10ZW1wbGF0ZScsXG4gICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQU5HVUxBUl9FTEVNRU5ULFxuICAgIHNvcnRUZXh0OiAnbmctdGVtcGxhdGUnLFxuICB9LFxuXTtcblxuZnVuY3Rpb24gaXNJZGVudGlmaWVyUGFydChjb2RlOiBudW1iZXIpIHtcbiAgLy8gSWRlbnRpZmllcnMgY29uc2lzdCBvZiBhbHBoYW51bWVyaWMgY2hhcmFjdGVycywgJ18nLCBvciAnJCcuXG4gIHJldHVybiBpc0FzY2lpTGV0dGVyKGNvZGUpIHx8IGlzRGlnaXQoY29kZSkgfHwgY29kZSA9PSAkJCB8fCBjb2RlID09ICRfO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHNwYW4gb2Ygd29yZCBpbiBhIHRlbXBsYXRlIHRoYXQgc3Vycm91bmRzIGBwb3NpdGlvbmAuIElmIHRoZXJlIGlzIG5vIHdvcmQgYXJvdW5kXG4gKiBgcG9zaXRpb25gLCBub3RoaW5nIGlzIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBnZXRCb3VuZGVkV29yZFNwYW4oXG4gICAgdGVtcGxhdGVJbmZvOiBuZy5Bc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIsIGFzdDogSHRtbEFzdHx1bmRlZmluZWQpOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQge1xuICBjb25zdCB7dGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICBjb25zdCB0ZW1wbGF0ZVNyYyA9IHRlbXBsYXRlLnNvdXJjZTtcblxuICBpZiAoIXRlbXBsYXRlU3JjKSByZXR1cm47XG5cbiAgaWYgKGFzdCBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAvLyBUaGUgSFRNTCB0YWcgbWF5IGluY2x1ZGUgYC1gIChlLmcuIGBhcHAtcm9vdGApLFxuICAgIC8vIHNvIHVzZSB0aGUgSHRtbEFzdCB0byBnZXQgdGhlIHNwYW4gYmVmb3JlIGF5YXpoYWZpeiByZWZhY3RvciB0aGUgY29kZS5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhcnQ6IHRlbXBsYXRlSW5mby50ZW1wbGF0ZS5zcGFuLnN0YXJ0ICsgYXN0LnN0YXJ0U291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyAxLFxuICAgICAgbGVuZ3RoOiBhc3QubmFtZS5sZW5ndGhcbiAgICB9O1xuICB9XG5cbiAgLy8gVE9ETyhheWF6aGFmaXopOiBBIHNvbHV0aW9uIGJhc2VkIG9uIHdvcmQgZXhwYW5zaW9uIHdpbGwgYWx3YXlzIGJlIGV4cGVuc2l2ZSBjb21wYXJlZCB0byBvbmVcbiAgLy8gYmFzZWQgb24gQVNUcy4gV2hhdGV2ZXIgcGVuYWx0eSB3ZSBpbmN1ciBpcyBwcm9iYWJseSBtYW5hZ2VhYmxlIGZvciBzbWFsbC1sZW5ndGggKGkuZS4gdGhlXG4gIC8vIG1ham9yaXR5IG9mKSBpZGVudGlmaWVycywgYnV0IHRoZSBjdXJyZW50IHNvbHV0aW9uIGludm9sZXMgYSBudW1iZXIgb2YgYnJhbmNoaW5ncyBhbmQgd2UgY2FuJ3RcbiAgLy8gY29udHJvbCBwb3RlbnRpYWxseSB2ZXJ5IGxvbmcgaWRlbnRpZmllcnMuIENvbnNpZGVyIG1vdmluZyB0byBhbiBBU1QtYmFzZWQgc29sdXRpb24gb25jZVxuICAvLyBleGlzdGluZyBkaWZmaWN1bHRpZXMgd2l0aCBBU1Qgc3BhbnMgYXJlIG1vcmUgY2xlYXJseSByZXNvbHZlZCAoc2VlICMzMTg5OCBmb3IgZGlzY3Vzc2lvbiBvZlxuICAvLyBrbm93biBwcm9ibGVtcywgYW5kICMzMzA5MSBmb3IgaG93IHRoZXkgYWZmZWN0IHRleHQgcmVwbGFjZW1lbnQpLlxuICAvL1xuICAvLyBgdGVtcGxhdGVQb3NpdGlvbmAgcmVwcmVzZW50cyB0aGUgcmlnaHQtYm91bmQgbG9jYXRpb24gb2YgYSBjdXJzb3IgaW4gdGhlIHRlbXBsYXRlLlxuICAvLyAgICBrZXkuZW50fHJ5XG4gIC8vICAgICAgICAgICBeLS0tLSBjdXJzb3IsIGF0IHBvc2l0aW9uIGByYCBpcyBhdC5cbiAgLy8gQSBjdXJzb3IgaXMgbm90IGl0c2VsZiBhIGNoYXJhY3RlciBpbiB0aGUgdGVtcGxhdGU7IGl0IGhhcyBhIGxlZnQgKGxvd2VyKSBhbmQgcmlnaHQgKHVwcGVyKVxuICAvLyBpbmRleCBib3VuZCB0aGF0IGh1Z3MgdGhlIGN1cnNvciBpdHNlbGYuXG4gIGxldCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICAvLyBUbyBwZXJmb3JtIHdvcmQgZXhwYW5zaW9uLCB3ZSB3YW50IHRvIGRldGVybWluZSB0aGUgbGVmdCBhbmQgcmlnaHQgaW5kaWNlcyB0aGF0IGh1ZyB0aGUgY3Vyc29yLlxuICAvLyBUaGVyZSBhcmUgdGhyZWUgY2FzZXMgaGVyZS5cbiAgbGV0IGxlZnQsIHJpZ2h0O1xuICBpZiAodGVtcGxhdGVQb3NpdGlvbiA9PT0gMCkge1xuICAgIC8vIDEuIENhc2UgbGlrZVxuICAgIC8vICAgICAgfHJlc3Qgb2YgdGVtcGxhdGVcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBzdGFydCBvZiB0aGUgdGVtcGxhdGUsIGh1Z2dlZCBvbmx5IGJ5IHRoZSByaWdodCBzaWRlICgwLWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSAwO1xuICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPT09IHRlbXBsYXRlU3JjLmxlbmd0aCkge1xuICAgIC8vIDIuIENhc2UgbGlrZVxuICAgIC8vICAgICAgcmVzdCBvZiB0ZW1wbGF0ZXxcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBlbmQgb2YgdGhlIHRlbXBsYXRlLCBodWdnZWQgb25seSBieSB0aGUgbGVmdCBzaWRlIChsYXN0LWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSB0ZW1wbGF0ZVNyYy5sZW5ndGggLSAxO1xuICB9IGVsc2Uge1xuICAgIC8vIDMuIENhc2UgbGlrZVxuICAgIC8vICAgICAgd298cmRcbiAgICAvLyAgICB0aGVyZSBpcyBhIGNsZWFyIGxlZnQgYW5kIHJpZ2h0IGluZGV4LlxuICAgIGxlZnQgPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gMTtcbiAgICByaWdodCA9IHRlbXBsYXRlUG9zaXRpb247XG4gIH1cblxuICBpZiAoIWlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChsZWZ0KSkgJiZcbiAgICAgICFpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkge1xuICAgIC8vIENhc2UgbGlrZVxuICAgIC8vICAgICAgICAgLnwuXG4gICAgLy8gbGVmdCAtLS1eIF4tLS0gcmlnaHRcbiAgICAvLyBUaGVyZSBpcyBubyB3b3JkIGhlcmUuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXhwYW5kIG9uIHRoZSBsZWZ0IGFuZCByaWdodCBzaWRlIHVudGlsIGEgd29yZCBib3VuZGFyeSBpcyBoaXQuIEJhY2sgdXAgb25lIGV4cGFuc2lvbiBvbiBib3RoXG4gIC8vIHNpZGUgdG8gc3RheSBpbnNpZGUgdGhlIHdvcmQuXG4gIHdoaWxlIChsZWZ0ID49IDAgJiYgaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KGxlZnQpKSkgLS1sZWZ0O1xuICArK2xlZnQ7XG4gIHdoaWxlIChyaWdodCA8IHRlbXBsYXRlU3JjLmxlbmd0aCAmJiBpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkgKytyaWdodDtcbiAgLS1yaWdodDtcblxuICBjb25zdCBhYnNvbHV0ZVN0YXJ0UG9zaXRpb24gPSBwb3NpdGlvbiAtICh0ZW1wbGF0ZVBvc2l0aW9uIC0gbGVmdCk7XG4gIGNvbnN0IGxlbmd0aCA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gIHJldHVybiB7c3RhcnQ6IGFic29sdXRlU3RhcnRQb3NpdGlvbiwgbGVuZ3RofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlQ29tcGxldGlvbnMoXG4gICAgdGVtcGxhdGVJbmZvOiBuZy5Bc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHtodG1sQXN0LCB0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIC8vIENhbGN1bGF0ZSB0aGUgcG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSB0ZW1wbGF0ZS4gVGhpcyBpcyBuZWVkZWRcbiAgLy8gYmVjYXVzZSBzcGFucyBpbiBIVE1MIEFTVCBhcmUgcmVsYXRpdmUuIElubGluZSB0ZW1wbGF0ZSBoYXMgbm9uLXplcm8gc3RhcnQgcG9zaXRpb24uXG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IGh0bWxQYXRoOiBIdG1sQXN0UGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSBodG1sUGF0aC50YWlsO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IEh0bWxWaXNpdG9yKHRlbXBsYXRlSW5mbywgaHRtbFBhdGgpO1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IG1vc3RTcGVjaWZpYyA/XG4gICAgICBtb3N0U3BlY2lmaWMudmlzaXQodmlzaXRvciwgbnVsbCAvKiBjb250ZXh0ICovKSA6XG4gICAgICBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRTcGFuID0gZ2V0Qm91bmRlZFdvcmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24sIG1vc3RTcGVjaWZpYyk7XG4gIHJldHVybiByZXN1bHRzLm1hcChlbnRyeSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmVudHJ5LFxuICAgICAgcmVwbGFjZW1lbnRTcGFuLFxuICAgIH07XG4gIH0pO1xufVxuXG5jbGFzcyBIdG1sVmlzaXRvciBpbXBsZW1lbnRzIFZpc2l0b3Ige1xuICAvKipcbiAgICogUG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgcmVsYXRpdmVQb3NpdGlvbjogbnVtYmVyO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlSW5mbzogbmcuQXN0UmVzdWx0LCBwcml2YXRlIHJlYWRvbmx5IGh0bWxQYXRoOiBIdG1sQXN0UGF0aCkge1xuICAgIHRoaXMucmVsYXRpdmVQb3NpdGlvbiA9IGh0bWxQYXRoLnBvc2l0aW9uO1xuICB9XG4gIC8vIE5vdGUgdGhhdCBldmVyeSB2aXNpdG9yIG1ldGhvZCBtdXN0IGV4cGxpY2l0bHkgc3BlY2lmeSByZXR1cm4gdHlwZSBiZWNhdXNlXG4gIC8vIFZpc2l0b3IgcmV0dXJucyBgYW55YCBmb3IgYWxsIG1ldGhvZHMuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnQpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gICAgY29uc3Qgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICBjb25zdCB0YWdMZW4gPSBhc3QubmFtZS5sZW5ndGg7XG4gICAgLy8gKyAxIGZvciB0aGUgb3BlbmluZyBhbmdsZSBicmFja2V0XG4gICAgaWYgKHRoaXMucmVsYXRpdmVQb3NpdGlvbiA8PSBzdGFydFRhZ1NwYW4uc3RhcnQgKyB0YWdMZW4gKyAxKSB7XG4gICAgICAvLyBJZiB3ZSBhcmUgaW4gdGhlIHRhZyB0aGVuIHJldHVybiB0aGUgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgIHJldHVybiBlbGVtZW50Q29tcGxldGlvbnModGhpcy50ZW1wbGF0ZUluZm8pO1xuICAgIH1cbiAgICBpZiAodGhpcy5yZWxhdGl2ZVBvc2l0aW9uIDwgc3RhcnRUYWdTcGFuLmVuZCkge1xuICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgLy8gUmV0dXJuIHRoZSBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KHRoaXMudGVtcGxhdGVJbmZvLCBhc3QubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuICB2aXNpdEF0dHJpYnV0ZShhc3Q6IEF0dHJpYnV0ZSk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgICAvLyBBbiBhdHRyaWJ1dGUgY29uc2lzdHMgb2YgdHdvIHBhcnRzLCBMSFM9XCJSSFNcIi5cbiAgICAvLyBEZXRlcm1pbmUgaWYgY29tcGxldGlvbnMgYXJlIHJlcXVlc3RlZCBmb3IgTEhTIG9yIFJIU1xuICAgIGlmIChhc3QudmFsdWVTcGFuICYmIGluU3Bhbih0aGlzLnJlbGF0aXZlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgIC8vIFJIUyBjb21wbGV0aW9uXG4gICAgICByZXR1cm4gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0aGlzLnRlbXBsYXRlSW5mbywgdGhpcy5odG1sUGF0aCk7XG4gICAgfVxuICAgIC8vIExIUyBjb21wbGV0aW9uXG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRoaXMudGVtcGxhdGVJbmZvLCB0aGlzLmh0bWxQYXRoKTtcbiAgfVxuICB2aXNpdFRleHQoKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAgIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KHRoaXMudGVtcGxhdGVJbmZvLnRlbXBsYXRlQXN0LCB0aGlzLnJlbGF0aXZlUG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEJvdW5kVGV4dEFzdCkge1xuICAgICAgLy8gSWYgd2Uga25vdyB0aGF0IHRoaXMgaXMgYW4gaW50ZXJwb2xhdGlvbiB0aGVuIGRvIG5vdCB0cnkgb3RoZXIgc2NlbmFyaW9zLlxuICAgICAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgICAgICB0aGlzLnRlbXBsYXRlSW5mbywgdGhpcy5yZWxhdGl2ZVBvc2l0aW9uLFxuICAgICAgICAgICgpID0+XG4gICAgICAgICAgICAgIGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8odGhpcy50ZW1wbGF0ZUluZm8pLCB0ZW1wbGF0ZVBhdGgpKTtcbiAgICAgIHRlbXBsYXRlUGF0aC50YWlsPy52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgICAgIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG4gICAgfVxuICAgIC8vIFRPRE8oa3lsaWF1KTogTm90IHN1cmUgaWYgdGhpcyBjaGVjayBpcyByZWFsbHkgbmVlZGVkIHNpbmNlIHdlIGRvbid0IGhhdmVcbiAgICAvLyBhbnkgdGVzdCBjYXNlcyBmb3IgaXQuXG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuaHRtbFBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgaWYgKGVsZW1lbnQgJiZcbiAgICAgICAgZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKS5jb250ZW50VHlwZSAhPT0gVGFnQ29udGVudFR5cGUuUEFSU0FCTEVfREFUQSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIHRvIGFjY291bnQgZm9yIGNhc2VzIGxpa2UgPGgxPiA8YT4gdGV4dCB8IDwvaDE+IHdoZXJlIHRoZVxuICAgIC8vIGNsb3Nlc3QgZWxlbWVudCBoYXMgbm8gY2xvc2luZyB0YWcgYW5kIHRodXMgaXMgY29uc2lkZXJlZCBwbGFpbiB0ZXh0LlxuICAgIGNvbnN0IHJlc3VsdHMgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRoaXMudGVtcGxhdGVJbmZvLCB0aGlzLmh0bWxQYXRoKTtcbiAgICBpZiAocmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudENvbXBsZXRpb25zKHRoaXMudGVtcGxhdGVJbmZvKTtcbiAgfVxuICB2aXNpdENvbW1lbnQoKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICB2aXNpdEV4cGFuc2lvbigpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHZpc2l0RXhwYW5zaW9uQ2FzZSgpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zKGluZm86IG5nLkFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgYXR0ciA9IHBhdGgudGFpbDtcbiAgY29uc3QgZWxlbSA9IHBhdGgucGFyZW50T2YoYXR0cik7XG4gIGlmICghKGF0dHIgaW5zdGFuY2VvZiBBdHRyaWJ1dGUpIHx8ICEoZWxlbSBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLy8gVE9ETzogQ29uc2lkZXIgcGFyc2luZyB0aGUgYXR0cmludXRlIG5hbWUgdG8gYSBwcm9wZXIgQVNUIGluc3RlYWQgb2ZcbiAgLy8gbWF0Y2hpbmcgdXNpbmcgcmVnZXguIFRoaXMgaXMgYmVjYXVzZSB0aGUgcmVnZXhwIHdvdWxkIGluY29ycmVjdGx5IGlkZW50aWZ5XG4gIC8vIGJpbmQgcGFydHMgZm9yIGNhc2VzIGxpa2UgWygpfF1cbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBeIGN1cnNvciBpcyBoZXJlXG4gIGNvbnN0IGJpbmRpbmcgPSBnZXRCaW5kaW5nRGVzY3JpcHRvcihhdHRyLm5hbWUpO1xuICBpZiAoIWJpbmRpbmcpIHtcbiAgICAvLyBUaGlzIGlzIGEgbm9ybWFsIEhUTUwgYXR0cmlidXRlLCBub3QgYW4gQW5ndWxhciBhdHRyaWJ1dGUuXG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBlbGVtLm5hbWUpO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgbmdBdHRycyA9IGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW0ubmFtZSk7XG4gIHN3aXRjaCAoYmluZGluZy5raW5kKSB7XG4gICAgY2FzZSBBVFRSLktXX01JQ1JPU1lOVEFYOlxuICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlIGF0dHJpYnV0ZTogKmF0dHJOYW1lXG4gICAgICByZXN1bHRzLnB1c2goLi4ubmdBdHRycy50ZW1wbGF0ZVJlZnMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIEFUVFIuS1dfQklORDpcbiAgICBjYXNlIEFUVFIuSURFTlRfUFJPUEVSVFk6XG4gICAgICAvLyBwcm9wZXJ0eSBiaW5kaW5nIHZpYSBiaW5kLSBvciBbXVxuICAgICAgcmVzdWx0cy5wdXNoKC4uLnByb3BlcnR5TmFtZXMoZWxlbS5uYW1lKSwgLi4ubmdBdHRycy5pbnB1dHMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIEFUVFIuS1dfT046XG4gICAgY2FzZSBBVFRSLklERU5UX0VWRU5UOlxuICAgICAgLy8gZXZlbnQgYmluZGluZyB2aWEgb24tIG9yICgpXG4gICAgICByZXN1bHRzLnB1c2goLi4uZXZlbnROYW1lcyhlbGVtLm5hbWUpLCAuLi5uZ0F0dHJzLm91dHB1dHMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIEFUVFIuS1dfQklORE9OOlxuICAgIGNhc2UgQVRUUi5JREVOVF9CQU5BTkFfQk9YOlxuICAgICAgLy8gYmFuYW5hLWluLWEtYm94IGJpbmRpbmcgdmlhIGJpbmRvbi0gb3IgWygpXVxuICAgICAgcmVzdWx0cy5wdXNoKC4uLm5nQXR0cnMuYmFuYW5hcyk7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzLm1hcChuYW1lID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoXG4gICAgaW5mbzogbmcuQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgYXR0cmlidXRlcyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgYXR0cmlidXRlTmFtZXMoZWxlbWVudE5hbWUpKSB7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0FUVFJJQlVURSxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgQW5ndWxhciBhdHRyaWJ1dGVzXG4gIGNvbnN0IG5nQXR0cnMgPSBhbmd1bGFyQXR0cmlidXRlcyhpbmZvLCBlbGVtZW50TmFtZSk7XG4gIGZvciAoY29uc3QgbmFtZSBvZiBuZ0F0dHJzLm90aGVycykge1xuICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBQcm92aWRlIGNvbXBsZXRpb25zIHRvIHRoZSBSSFMgb2YgYW4gYXR0cmlidXRlLCB3aGljaCBpcyBvZiB0aGUgZm9ybVxuICogTEhTPVwiUkhTXCIuIFRoZSB0ZW1wbGF0ZSBwYXRoIGlzIGNvbXB1dGVkIGZyb20gdGhlIHNwZWNpZmllZCBgaW5mb2Agd2hlcmVhc1xuICogdGhlIGNvbnRleHQgaXMgZGV0ZXJtaW5lZCBmcm9tIHRoZSBzcGVjaWZpZWQgYGh0bWxQYXRoYC5cbiAqIEBwYXJhbSBpbmZvIE9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBBU1RcbiAqIEBwYXJhbSBodG1sUGF0aCBQYXRoIHRvIHRoZSBIVE1MIG5vZGVcbiAqL1xuZnVuY3Rpb24gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBuZy5Bc3RSZXN1bHQsIGh0bWxQYXRoOiBIdG1sQXN0UGF0aCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBUZW1wbGF0ZSBBU1QgcGF0aC5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgaHRtbFBhdGgucG9zaXRpb24pO1xuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKGluZm8sIGh0bWxQYXRoLnBvc2l0aW9uLCAoKSA9PiB7XG4gICAgY29uc3QgZGluZm8gPSBkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyk7XG4gICAgcmV0dXJuIGdldEV4cHJlc3Npb25TY29wZShkaW5mbywgdGVtcGxhdGVQYXRoKTtcbiAgfSk7XG4gIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEF0dHJBc3QgfHxcbiAgICAgIHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQm91bmRFbGVtZW50UHJvcGVydHlBc3QgfHxcbiAgICAgIHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQm91bmRFdmVudEFzdCkge1xuICAgIHRlbXBsYXRlUGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICAgIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG4gIH1cbiAgLy8gSW4gb3JkZXIgdG8gcHJvdmlkZSBhY2N1cmF0ZSBhdHRyaWJ1dGUgdmFsdWUgY29tcGxldGlvbiwgd2UgbmVlZCB0byBrbm93XG4gIC8vIHdoYXQgdGhlIExIUyBpcywgYW5kIGNvbnN0cnVjdCB0aGUgcHJvcGVyIEFTVCBpZiBpdCBpcyBtaXNzaW5nLlxuICBjb25zdCBodG1sQXR0ciA9IGh0bWxQYXRoLnRhaWwgYXMgQXR0cmlidXRlO1xuICBjb25zdCBiaW5kaW5nID0gZ2V0QmluZGluZ0Rlc2NyaXB0b3IoaHRtbEF0dHIubmFtZSk7XG4gIGlmIChiaW5kaW5nICYmIGJpbmRpbmcua2luZCA9PT0gQVRUUi5LV19SRUYpIHtcbiAgICBsZXQgcmVmQXN0OiBSZWZlcmVuY2VBc3R8dW5kZWZpbmVkO1xuICAgIGxldCBlbGVtQXN0OiBFbGVtZW50QXN0fHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBSZWZlcmVuY2VBc3QpIHtcbiAgICAgIHJlZkFzdCA9IHRlbXBsYXRlUGF0aC50YWlsO1xuICAgICAgY29uc3QgcGFyZW50ID0gdGVtcGxhdGVQYXRoLnBhcmVudE9mKHJlZkFzdCk7XG4gICAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgRWxlbWVudEFzdCkge1xuICAgICAgICBlbGVtQXN0ID0gcGFyZW50O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50QXN0KSB7XG4gICAgICByZWZBc3QgPSBuZXcgUmVmZXJlbmNlQXN0KGh0bWxBdHRyLm5hbWUsIG51bGwhLCBodG1sQXR0ci52YWx1ZSwgaHRtbEF0dHIudmFsdWVTcGFuISk7XG4gICAgICBlbGVtQXN0ID0gdGVtcGxhdGVQYXRoLnRhaWw7XG4gICAgfVxuICAgIGlmIChyZWZBc3QgJiYgZWxlbUFzdCkge1xuICAgICAgcmVmQXN0LnZpc2l0KHZpc2l0b3IsIGVsZW1Bc3QpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBIdG1sQXN0IGNvbnRhaW5zIHRoZSBgQXR0cmlidXRlYCBub2RlLCBob3dldmVyIHRoZSBjb3JyZXNwb25kaW5nIGBBdHRyQXN0YFxuICAgIC8vIG5vZGUgaXMgbWlzc2luZyBmcm9tIHRoZSBUZW1wbGF0ZUFzdC5cbiAgICBjb25zdCBhdHRyQXN0ID0gbmV3IEF0dHJBc3QoaHRtbEF0dHIubmFtZSwgaHRtbEF0dHIudmFsdWUsIGh0bWxBdHRyLnZhbHVlU3BhbiEpO1xuICAgIGF0dHJBc3QudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IucmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZWxlbWVudENvbXBsZXRpb25zKGluZm86IG5nLkFzdFJlc3VsdCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbLi4uQU5HVUxBUl9FTEVNRU5UU107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBlbGVtZW50cyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICByZXN1bHRzLnB1c2goLi4uSFRNTF9FTEVNRU5UUyk7XG4gIH1cblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgY29uc3QgY29tcG9uZW50cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIGdldFNlbGVjdG9ycyhpbmZvKS5zZWxlY3RvcnMpIHtcbiAgICBjb25zdCBuYW1lID0gc2VsZWN0b3IuZWxlbWVudDtcbiAgICBpZiAobmFtZSAmJiAhY29tcG9uZW50cy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbXBvbmVudHMuYWRkKG5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQ09NUE9ORU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vLyBUaGVyZSBpcyBhIHNwZWNpYWwgY2FzZSBvZiBIVE1MIHdoZXJlIHRleHQgdGhhdCBjb250YWlucyBhIHVuY2xvc2VkIHRhZyBpcyB0cmVhdGVkIGFzXG4vLyB0ZXh0LiBGb3IgZXhhcGxlICc8aDE+IFNvbWUgPGEgdGV4dCA8L2gxPicgcHJvZHVjZXMgYSB0ZXh0IG5vZGVzIGluc2lkZSBvZiB0aGUgSDFcbi8vIGVsZW1lbnQgXCJTb21lIDxhIHRleHRcIi4gV2UsIGhvd2V2ZXIsIHdhbnQgdG8gdHJlYXQgdGhpcyBhcyBpZiB0aGUgdXNlciB3YXMgcmVxdWVzdGluZ1xuLy8gdGhlIGF0dHJpYnV0ZXMgb2YgYW4gXCJhXCIgZWxlbWVudCwgbm90IHJlcXVlc3RpbmcgY29tcGxldGlvbiBpbiB0aGUgYSB0ZXh0IGVsZW1lbnQuIFRoaXNcbi8vIGNvZGUgY2hlY2tzIGZvciB0aGlzIGNhc2UgYW5kIHJldHVybnMgZWxlbWVudCBjb21wbGV0aW9ucyBpZiBpdCBpcyBkZXRlY3RlZCBvciB1bmRlZmluZWRcbi8vIGlmIGl0IGlzIG5vdC5cbmZ1bmN0aW9uIHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnMoXG4gICAgaW5mbzogbmcuQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCB0YWlsID0gcGF0aC50YWlsO1xuICBpZiAodGFpbCBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRhaWwudmFsdWUubWF0Y2goLzwoXFx3KFxcd3xcXGR8LSkqOik/KFxcdyhcXHd8XFxkfC0pKilcXHMvKTtcbiAgICAvLyBUaGUgcG9zaXRpb24gbXVzdCBiZSBhZnRlciB0aGUgbWF0Y2gsIG90aGVyd2lzZSB3ZSBhcmUgc3RpbGwgaW4gYSBwbGFjZSB3aGVyZSBlbGVtZW50c1xuICAgIC8vIGFyZSBleHBlY3RlZCAoc3VjaCBhcyBgPHxhYCBvciBgPGF8YDsgd2Ugb25seSB3YW50IGF0dHJpYnV0ZXMgZm9yIGA8YSB8YCBvciBhZnRlcikuXG4gICAgaWYgKG1hdGNoICYmXG4gICAgICAgIHBhdGgucG9zaXRpb24gPj0gKG1hdGNoLmluZGV4IHx8IDApICsgbWF0Y2hbMF0ubGVuZ3RoICsgdGFpbC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCkge1xuICAgICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBtYXRjaFszXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBOdWxsVGVtcGxhdGVWaXNpdG9yIHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb21wbGV0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBuZy5Db21wbGV0aW9uRW50cnk+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGluZm86IG5nLkFzdFJlc3VsdCwgcHJpdmF0ZSByZWFkb25seSBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRFeHByZXNzaW9uU2NvcGU6ICgpID0+IG5nLlN5bWJvbFRhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCByZXN1bHRzKCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbXBsZXRpb25zLnZhbHVlcygpKTtcbiAgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQge1xuICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhhc3QuaGFuZGxlcik7XG4gIH1cblxuICB2aXNpdEVsZW1lbnQoKTogdm9pZCB7XG4gICAgLy8gbm8tb3AgZm9yIG5vd1xuICB9XG5cbiAgdmlzaXRBdHRyKGFzdDogQXR0ckFzdCkge1xuICAgIGNvbnN0IGJpbmRpbmcgPSBnZXRCaW5kaW5nRGVzY3JpcHRvcihhc3QubmFtZSk7XG4gICAgaWYgKGJpbmRpbmcgJiYgYmluZGluZy5raW5kID09PSBBVFRSLktXX01JQ1JPU1lOVEFYKSB7XG4gICAgICAvLyBUaGlzIGEgdGVtcGxhdGUgYmluZGluZyBnaXZlbiBieSBtaWNybyBzeW50YXggZXhwcmVzc2lvbi5cbiAgICAgIC8vIEZpcnN0LCB2ZXJpZnkgdGhlIGF0dHJpYnV0ZSBjb25zaXN0cyBvZiBzb21lIGJpbmRpbmcgd2UgY2FuIGdpdmUgY29tcGxldGlvbnMgZm9yLlxuICAgICAgLy8gVGhlIHNvdXJjZVNwYW4gb2YgQXR0ckFzdCBwb2ludHMgdG8gdGhlIFJIUyBvZiB0aGUgYXR0cmlidXRlXG4gICAgICBjb25zdCB0ZW1wbGF0ZUtleSA9IGJpbmRpbmcubmFtZTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVmFsdWUgPSBhc3Quc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5maWxlLnVybDtcbiAgICAgIC8vIFRPRE8oa3lsaWF1KTogV2UgYXJlIHVuYWJsZSB0byBkZXRlcm1pbmUgdGhlIGFic29sdXRlIG9mZnNldCBvZiB0aGUga2V5XG4gICAgICAvLyBidXQgaXQgaXMgb2theSBoZXJlLCBiZWNhdXNlIHdlIGFyZSBvbmx5IGxvb2tpbmcgYXQgdGhlIFJIUyBvZiB0aGUgYXR0clxuICAgICAgY29uc3QgYWJzS2V5T2Zmc2V0ID0gMDtcbiAgICAgIGNvbnN0IGFic1ZhbHVlT2Zmc2V0ID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgY29uc3Qge3RlbXBsYXRlQmluZGluZ3N9ID0gdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKFxuICAgICAgICAgIHRlbXBsYXRlS2V5LCB0ZW1wbGF0ZVZhbHVlLCB0ZW1wbGF0ZVVybCwgYWJzS2V5T2Zmc2V0LCBhYnNWYWx1ZU9mZnNldCk7XG4gICAgICAvLyBGaW5kIHRoZSBuZWFyZXN0IHRlbXBsYXRlIGJpbmRpbmcgdG8gdGhlIHBvc2l0aW9uLlxuICAgICAgY29uc3QgbGFzdEJpbmRpbmdFbmQgPSB0ZW1wbGF0ZUJpbmRpbmdzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICB0ZW1wbGF0ZUJpbmRpbmdzW3RlbXBsYXRlQmluZGluZ3MubGVuZ3RoIC0gMV0uc291cmNlU3Bhbi5lbmQ7XG4gICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb25Ub0JpbmRpbmcgPVxuICAgICAgICAgIGxhc3RCaW5kaW5nRW5kICYmIHRoaXMucG9zaXRpb24gPiBsYXN0QmluZGluZ0VuZCA/IGxhc3RCaW5kaW5nRW5kIDogdGhpcy5wb3NpdGlvbjtcbiAgICAgIGNvbnN0IHRlbXBsYXRlQmluZGluZyA9XG4gICAgICAgICAgdGVtcGxhdGVCaW5kaW5ncy5maW5kKGIgPT4gaW5TcGFuKG5vcm1hbGl6ZWRQb3NpdGlvblRvQmluZGluZywgYi5zb3VyY2VTcGFuKSk7XG5cbiAgICAgIGlmICghdGVtcGxhdGVCaW5kaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5taWNyb1N5bnRheEluQXR0cmlidXRlVmFsdWUoYXN0LCB0ZW1wbGF0ZUJpbmRpbmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBleHByZXNzaW9uQXN0ID0gdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VCaW5kaW5nKFxuICAgICAgICAgIGFzdC52YWx1ZSwgYXN0LnNvdXJjZVNwYW4udG9TdHJpbmcoKSwgYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhleHByZXNzaW9uQXN0KTtcbiAgICB9XG4gIH1cblxuICB2aXNpdFJlZmVyZW5jZShfYXN0OiBSZWZlcmVuY2VBc3QsIGNvbnRleHQ6IEVsZW1lbnRBc3QpIHtcbiAgICBjb250ZXh0LmRpcmVjdGl2ZXMuZm9yRWFjaChkaXIgPT4ge1xuICAgICAgY29uc3Qge2V4cG9ydEFzfSA9IGRpci5kaXJlY3RpdmU7XG4gICAgICBpZiAoZXhwb3J0QXMpIHtcbiAgICAgICAgdGhpcy5jb21wbGV0aW9ucy5zZXQoXG4gICAgICAgICAgICBleHBvcnRBcywge25hbWU6IGV4cG9ydEFzLCBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5SRUZFUkVOQ0UsIHNvcnRUZXh0OiBleHBvcnRBc30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdmlzaXRCb3VuZFRleHQoYXN0OiBCb3VuZFRleHRBc3QpIHtcbiAgICBpZiAoaW5TcGFuKHRoaXMucG9zaXRpb24sIGFzdC52YWx1ZS5zb3VyY2VTcGFuKSkge1xuICAgICAgY29uc3QgY29tcGxldGlvbnMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgYXN0LnZhbHVlLCB0aGlzLnBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUpO1xuICAgICAgaWYgKGNvbXBsZXRpb25zKSB7XG4gICAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoY29tcGxldGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyh2YWx1ZTogQVNUKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgdGhpcy5nZXRFeHByZXNzaW9uU2NvcGUoKSwgdmFsdWUsIHRoaXMucG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZSk7XG4gICAgaWYgKHN5bWJvbHMpIHtcbiAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9scyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzOiBuZy5TeW1ib2xbXSkge1xuICAgIGZvciAoY29uc3QgcyBvZiBzeW1ib2xzKSB7XG4gICAgICBpZiAocy5uYW1lLnN0YXJ0c1dpdGgoJ19fJykgfHwgIXMucHVibGljIHx8IHRoaXMuY29tcGxldGlvbnMuaGFzKHMubmFtZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBwaXBlIG1ldGhvZCBzaG91bGQgbm90IGluY2x1ZGUgcGFyZW50aGVzZXMuXG4gICAgICAvLyBlLmcuIHt7IHZhbHVlX2V4cHJlc3Npb24gfCBzbGljZSA6IHN0YXJ0IFsgOiBlbmQgXSB9fVxuICAgICAgY29uc3Qgc2hvdWxkSW5zZXJ0UGFyZW50aGVzZXMgPSBzLmNhbGxhYmxlICYmIHMua2luZCAhPT0gbmcuQ29tcGxldGlvbktpbmQuUElQRTtcbiAgICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KHMubmFtZSwge1xuICAgICAgICBuYW1lOiBzLm5hbWUsXG4gICAgICAgIGtpbmQ6IHMua2luZCBhcyBuZy5Db21wbGV0aW9uS2luZCxcbiAgICAgICAgc29ydFRleHQ6IHMubmFtZSxcbiAgICAgICAgaW5zZXJ0VGV4dDogc2hvdWxkSW5zZXJ0UGFyZW50aGVzZXMgPyBgJHtzLm5hbWV9KClgIDogcy5uYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGhhbmRsZXMgdGhlIGNvbXBsZXRpb25zIG9mIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIGRpcmVjdGl2ZXMgdGhhdFxuICAgKiBzdXBwb3J0IHRoZSBtaWNyb3N5bnRheCBmb3JtYXQuIEV4YW1wbGVzIGFyZSAqbmdGb3IgYW5kICpuZ0lmLlxuICAgKiBUaGVzZSBkaXJlY3RpdmVzIGFsbG93cyBkZWNsYXJhdGlvbiBvZiBcImxldFwiIHZhcmlhYmxlcywgYWRkcyBjb250ZXh0LXNwZWNpZmljXG4gICAqIHN5bWJvbHMgbGlrZSAkaW1wbGljaXQsIGluZGV4LCBjb3VudCwgYW1vbmcgb3RoZXIgYmVoYXZpb3JzLlxuICAgKiBGb3IgYSBjb21wbGV0ZSBkZXNjcmlwdGlvbiBvZiBzdWNoIGZvcm1hdCwgc2VlXG4gICAqIGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS9zdHJ1Y3R1cmFsLWRpcmVjdGl2ZXMjdGhlLWFzdGVyaXNrLS1wcmVmaXhcbiAgICpcbiAgICogQHBhcmFtIGF0dHIgZGVzY3JpcHRvciBmb3IgYXR0cmlidXRlIG5hbWUgYW5kIHZhbHVlIHBhaXJcbiAgICogQHBhcmFtIGJpbmRpbmcgdGVtcGxhdGUgYmluZGluZyBmb3IgdGhlIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZVxuICAgKi9cbiAgcHJpdmF0ZSBtaWNyb1N5bnRheEluQXR0cmlidXRlVmFsdWUoYXR0cjogQXR0ckFzdCwgYmluZGluZzogVGVtcGxhdGVCaW5kaW5nKSB7XG4gICAgY29uc3Qga2V5ID0gYXR0ci5uYW1lLnN1YnN0cmluZygxKTsgIC8vIHJlbW92ZSBsZWFkaW5nIGFzdGVyaXNrXG5cbiAgICAvLyBGaW5kIHRoZSBzZWxlY3RvciAtIGVnIG5nRm9yLCBuZ0lmLCBldGNcbiAgICBjb25zdCBzZWxlY3RvckluZm8gPSBnZXRTZWxlY3RvcnModGhpcy5pbmZvKTtcbiAgICBjb25zdCBzZWxlY3RvciA9IHNlbGVjdG9ySW5mby5zZWxlY3RvcnMuZmluZChzID0+IHtcbiAgICAgIC8vIGF0dHJpYnV0ZXMgYXJlIGxpc3RlZCBpbiAoYXR0cmlidXRlLCB2YWx1ZSkgcGFpcnNcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcy5hdHRycy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBpZiAocy5hdHRyc1tpXSA9PT0ga2V5KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gYXR0ci5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcblxuICAgIGlmIChiaW5kaW5nIGluc3RhbmNlb2YgVmFyaWFibGVCaW5kaW5nKSB7XG4gICAgICAvLyBUT0RPKGt5bGlhdSk6IFdpdGggZXhwcmVzc2lvbiBzb3VyY2VTcGFuIHdlIHNob3VsZG4ndCBoYXZlIHRvIHNlYXJjaFxuICAgICAgLy8gdGhlIGF0dHJpYnV0ZSB2YWx1ZSBzdHJpbmcgYW55bW9yZS4gSnVzdCBjaGVjayBpZiBwb3NpdGlvbiBpcyBpbiB0aGVcbiAgICAgIC8vIGV4cHJlc3Npb24gc291cmNlIHNwYW4uXG4gICAgICBjb25zdCBlcXVhbExvY2F0aW9uID0gYXR0ci52YWx1ZS5pbmRleE9mKCc9Jyk7XG4gICAgICBpZiAoZXF1YWxMb2NhdGlvbiA+IDAgJiYgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID4gZXF1YWxMb2NhdGlvbikge1xuICAgICAgICAvLyBXZSBhcmUgYWZ0ZXIgdGhlICc9JyBpbiBhIGxldCBjbGF1c2UuIFRoZSB2YWxpZCB2YWx1ZXMgaGVyZSBhcmUgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAgICAgIC8vIHRlbXBsYXRlIHJlZmVyZW5jZSdzIHR5cGUgcGFyYW1ldGVyLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmVNZXRhZGF0YSA9IHNlbGVjdG9ySW5mby5tYXAuZ2V0KHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhKSB7XG4gICAgICAgICAgY29uc3QgY29udGV4dFRhYmxlID1cbiAgICAgICAgICAgICAgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5LmdldFRlbXBsYXRlQ29udGV4dChkaXJlY3RpdmVNZXRhZGF0YS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICAgICAgaWYgKGNvbnRleHRUYWJsZSkge1xuICAgICAgICAgICAgLy8gVGhpcyBhZGRzIHN5bWJvbHMgbGlrZSAkaW1wbGljaXQsIGluZGV4LCBjb3VudCwgZXRjLlxuICAgICAgICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhjb250ZXh0VGFibGUudmFsdWVzKCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYmluZGluZyBpbnN0YW5jZW9mIEV4cHJlc3Npb25CaW5kaW5nKSB7XG4gICAgICBpZiAoaW5TcGFuKHRoaXMucG9zaXRpb24sIGJpbmRpbmcudmFsdWU/LmFzdC5zb3VyY2VTcGFuKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYmluZGluZy52YWx1ZSEuYXN0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmICghYmluZGluZy52YWx1ZSAmJiB0aGlzLnBvc2l0aW9uID4gYmluZGluZy5rZXkuc3Bhbi5lbmQpIHtcbiAgICAgICAgLy8gTm8gZXhwcmVzc2lvbiBpcyBkZWZpbmVkIGZvciB0aGUgdmFsdWUgb2YgdGhlIGtleSBleHByZXNzaW9uIGJpbmRpbmcsIGJ1dCB0aGUgY3Vyc29yIGlzXG4gICAgICAgIC8vIGluIGEgbG9jYXRpb24gd2hlcmUgdGhlIGV4cHJlc3Npb24gd291bGQgYmUgZGVmaW5lZC4gVGhpcyBjYW4gaGFwcGVuIGluIGEgY2FzZSBsaWtlXG4gICAgICAgIC8vICAgbGV0IGkgb2YgfFxuICAgICAgICAvLyAgICAgICAgICAgIF4tLSBjdXJzb3JcbiAgICAgICAgLy8gSW4gdGhpcyBjYXNlLCBiYWNrZmlsbCB0aGUgdmFsdWUgdG8gYmUgYW4gZW1wdHkgZXhwcmVzc2lvbiBhbmQgcmV0cmlldmUgY29tcGxldGlvbnMuXG4gICAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhuZXcgRW1wdHlFeHByKFxuICAgICAgICAgICAgbmV3IFBhcnNlU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiksXG4gICAgICAgICAgICBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHRoaXMucG9zaXRpb24sIHRoaXMucG9zaXRpb24pKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIEFuZ3VsYXJBdHRyaWJ1dGVzIHtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgdGhhdCBzdXBwb3J0IHRoZSAqIHN5bnRheC4gU2VlIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29yZS9UZW1wbGF0ZVJlZlxuICAgKi9cbiAgdGVtcGxhdGVSZWZzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgd2l0aCB0aGUgQElucHV0IGFubm90YXRpb24uXG4gICAqL1xuICBpbnB1dHM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogQXR0cmlidXRlcyB3aXRoIHRoZSBAT3V0cHV0IGFubm90YXRpb24uXG4gICAqL1xuICBvdXRwdXRzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgdGhhdCBzdXBwb3J0IHRoZSBbKCldIG9yIGJpbmRvbi0gc3ludGF4LlxuICAgKi9cbiAgYmFuYW5hczogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBHZW5lcmFsIGF0dHJpYnV0ZXMgdGhhdCBtYXRjaCB0aGUgc3BlY2lmaWVkIGVsZW1lbnQuXG4gICAqL1xuICBvdGhlcnM6IFNldDxzdHJpbmc+O1xufVxuXG4vKipcbiAqIFJldHVybiBhbGwgQW5ndWxhci1zcGVjaWZpYyBhdHRyaWJ1dGVzIGZvciB0aGUgZWxlbWVudCB3aXRoIGBlbGVtZW50TmFtZWAuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIGVsZW1lbnROYW1lXG4gKi9cbmZ1bmN0aW9uIGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm86IG5nLkFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IEFuZ3VsYXJBdHRyaWJ1dGVzIHtcbiAgY29uc3Qge3NlbGVjdG9ycywgbWFwOiBzZWxlY3Rvck1hcH0gPSBnZXRTZWxlY3RvcnMoaW5mbyk7XG4gIGNvbnN0IHRlbXBsYXRlUmVmcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3V0cHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBiYW5hbmFzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG90aGVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgIGlmIChzZWxlY3Rvci5lbGVtZW50ICYmIHNlbGVjdG9yLmVsZW1lbnQgIT09IGVsZW1lbnROYW1lKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3Qgc3VtbWFyeSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvcikhO1xuICAgIGNvbnN0IGhhc1RlbXBsYXRlUmVmID0gaXNTdHJ1Y3R1cmFsRGlyZWN0aXZlKHN1bW1hcnkudHlwZSk7XG4gICAgLy8gYXR0cmlidXRlcyBhcmUgbGlzdGVkIGluIChhdHRyaWJ1dGUsIHZhbHVlKSBwYWlyc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0b3IuYXR0cnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgIGNvbnN0IGF0dHIgPSBzZWxlY3Rvci5hdHRyc1tpXTtcbiAgICAgIGlmIChoYXNUZW1wbGF0ZVJlZikge1xuICAgICAgICB0ZW1wbGF0ZVJlZnMuYWRkKGF0dHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3RoZXJzLmFkZChhdHRyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkuaW5wdXRzKSkge1xuICAgICAgaW5wdXRzLmFkZChpbnB1dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5vdXRwdXRzKSkge1xuICAgICAgb3V0cHV0cy5hZGQob3V0cHV0KTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIGlucHV0cykge1xuICAgIC8vIEFkZCBiYW5hbmEtaW4tYS1ib3ggc3ludGF4XG4gICAgLy8gaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXN5bnRheCN0d28td2F5LWJpbmRpbmctXG4gICAgaWYgKG91dHB1dHMuaGFzKGAke25hbWV9Q2hhbmdlYCkpIHtcbiAgICAgIGJhbmFuYXMuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ge3RlbXBsYXRlUmVmcywgaW5wdXRzLCBvdXRwdXRzLCBiYW5hbmFzLCBvdGhlcnN9O1xufVxuIl19