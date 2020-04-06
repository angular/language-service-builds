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
    // This is adapted from packages/compiler/src/render3/r3_template_transform.ts
    // to allow empty binding names.
    var BIND_NAME_REGEXP = /^(?:(?:(?:(bind-)|(let-)|(ref-|#)|(on-)|(bindon-)|(@))(.*))|\[\(([^\)]*)\)\]|\[([^\]]*)\]|\(([^\)]*)\))$/;
    var ATTR;
    (function (ATTR) {
        // Group 1 = "bind-"
        ATTR[ATTR["KW_BIND_IDX"] = 1] = "KW_BIND_IDX";
        // Group 2 = "let-"
        ATTR[ATTR["KW_LET_IDX"] = 2] = "KW_LET_IDX";
        // Group 3 = "ref-/#"
        ATTR[ATTR["KW_REF_IDX"] = 3] = "KW_REF_IDX";
        // Group 4 = "on-"
        ATTR[ATTR["KW_ON_IDX"] = 4] = "KW_ON_IDX";
        // Group 5 = "bindon-"
        ATTR[ATTR["KW_BINDON_IDX"] = 5] = "KW_BINDON_IDX";
        // Group 6 = "@"
        ATTR[ATTR["KW_AT_IDX"] = 6] = "KW_AT_IDX";
        // Group 7 = the identifier after "bind-", "let-", "ref-/#", "on-", "bindon-" or "@"
        ATTR[ATTR["IDENT_KW_IDX"] = 7] = "IDENT_KW_IDX";
        // Group 8 = identifier inside [()]
        ATTR[ATTR["IDENT_BANANA_BOX_IDX"] = 8] = "IDENT_BANANA_BOX_IDX";
        // Group 9 = identifier inside []
        ATTR[ATTR["IDENT_PROPERTY_IDX"] = 9] = "IDENT_PROPERTY_IDX";
        // Group 10 = identifier inside ()
        ATTR[ATTR["IDENT_EVENT_IDX"] = 10] = "IDENT_EVENT_IDX";
    })(ATTR || (ATTR = {}));
    // Microsyntax template starts with '*'. See https://angular.io/api/core/TemplateRef
    var TEMPLATE_ATTR_PREFIX = '*';
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
        var replacementSpan = getBoundedWordSpan(templateInfo, position);
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
        var bindParts = attr.name.match(BIND_NAME_REGEXP);
        var isTemplateRef = attr.name.startsWith(TEMPLATE_ATTR_PREFIX);
        var isBinding = bindParts !== null || isTemplateRef;
        if (!isBinding) {
            return attributeCompletionsForElement(info, elem.name);
        }
        var results = [];
        var ngAttrs = angularAttributes(info, elem.name);
        if (!bindParts) {
            // If bindParts is null then this must be a TemplateRef.
            results.push.apply(results, tslib_1.__spread(ngAttrs.templateRefs));
        }
        else if (bindParts[ATTR.KW_BIND_IDX] !== undefined ||
            bindParts[ATTR.IDENT_PROPERTY_IDX] !== undefined) {
            // property binding via bind- or []
            results.push.apply(results, tslib_1.__spread(html_info_1.propertyNames(elem.name), ngAttrs.inputs));
        }
        else if (bindParts[ATTR.KW_ON_IDX] !== undefined || bindParts[ATTR.IDENT_EVENT_IDX] !== undefined) {
            // event binding via on- or ()
            results.push.apply(results, tslib_1.__spread(html_info_1.eventNames(elem.name), ngAttrs.outputs));
        }
        else if (bindParts[ATTR.KW_BINDON_IDX] !== undefined ||
            bindParts[ATTR.IDENT_BANANA_BOX_IDX] !== undefined) {
            // banana-in-a-box binding via bindon- or [()]
            results.push.apply(results, tslib_1.__spread(ngAttrs.bananas));
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
        var bindParts = htmlAttr.name.match(BIND_NAME_REGEXP);
        if (bindParts && bindParts[ATTR.KW_REF_IDX] !== undefined) {
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
        var visitor = new ExpressionVisitor(info, position, function () { return expression_diagnostics_1.getExpressionScope(utils_1.diagnosticInfoFromTemplateInfo(info), templatePath); });
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
            if (ast.name.startsWith(TEMPLATE_ATTR_PREFIX)) {
                // This a template binding given by micro syntax expression.
                // First, verify the attribute consists of some binding we can give completions for.
                // The sourceSpan of AttrAst points to the RHS of the attribute
                var templateKey = ast.name.substring(TEMPLATE_ATTR_PREFIX.length);
                var templateValue = ast.sourceSpan.toString();
                var templateUrl = ast.sourceSpan.start.file.url;
                // TODO(kyliau): We are unable to determine the absolute offset of the key
                // but it is okay here, because we are only looking at the RHS of the attr
                var absKeyOffset = 0;
                var absValueOffset = ast.sourceSpan.start.offset;
                var templateBindings = this.info.expressionParser.parseTemplateBindings(templateKey, templateValue, templateUrl, absKeyOffset, absValueOffset).templateBindings;
                // Find the template binding that contains the position.
                var binding = templateBindings.find(function (b) { return utils_1.inSpan(_this.position, b.sourceSpan); });
                if (!binding) {
                    return;
                }
                this.microSyntaxInAttributeValue(ast, binding);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclkscURBQTJFO0lBRzNFLCtGQUE0RDtJQUM1RCx5RUFBdUQ7SUFDdkQscUVBQW9GO0lBQ3BGLG1FQUEwQztJQUMxQyx3REFBOEI7SUFDOUIsNkRBQXdKO0lBRXhKLElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckYsSUFBTSxhQUFhLEdBQ2Ysd0JBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtRQUNyRSxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWTtZQUNwQyxRQUFRLEVBQUUsSUFBSTtTQUNmLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNQLElBQU0sZ0JBQWdCLEdBQXNDO1FBQzFEO1lBQ0UsSUFBSSxFQUFFLGNBQWM7WUFDcEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsY0FBYztTQUN6QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsWUFBWTtTQUN2QjtRQUNEO1lBQ0Us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Z2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBYnNvbHV0ZVNvdXJjZVNwYW4sIEFzdFBhdGgsIEF0dHJBc3QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgRWxlbWVudCwgRWxlbWVudEFzdCwgRW1wdHlFeHByLCBFeHByZXNzaW9uQmluZGluZywgSHRtbEFzdFBhdGgsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFBhcnNlU3BhbiwgUmVmZXJlbmNlQXN0LCBUYWdDb250ZW50VHlwZSwgVGVtcGxhdGVCaW5kaW5nLCBUZXh0LCBWYXJpYWJsZUJpbmRpbmcsIGdldEh0bWxUYWdEZWZpbml0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgeyQkLCAkXywgaXNBc2NpaUxldHRlciwgaXNEaWdpdH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NoYXJzJztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvblNjb3BlfSBmcm9tICcuL2V4cHJlc3Npb25fZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uQ29tcGxldGlvbnN9IGZyb20gJy4vZXhwcmVzc2lvbnMnO1xuaW1wb3J0IHthdHRyaWJ1dGVOYW1lcywgZWxlbWVudE5hbWVzLCBldmVudE5hbWVzLCBwcm9wZXJ0eU5hbWVzfSBmcm9tICcuL2h0bWxfaW5mbyc7XG5pbXBvcnQge0lubGluZVRlbXBsYXRlfSBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8sIGZpbmRUZW1wbGF0ZUFzdEF0LCBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbiwgZ2V0U2VsZWN0b3JzLCBpblNwYW4sIGlzU3RydWN0dXJhbERpcmVjdGl2ZSwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgSElEREVOX0hUTUxfRUxFTUVOVFM6IFJlYWRvbmx5U2V0PHN0cmluZz4gPVxuICAgIG5ldyBTZXQoWydodG1sJywgJ3NjcmlwdCcsICdub3NjcmlwdCcsICdiYXNlJywgJ2JvZHknLCAndGl0bGUnLCAnaGVhZCcsICdsaW5rJ10pO1xuY29uc3QgSFRNTF9FTEVNRU5UUzogUmVhZG9ubHlBcnJheTxuZy5Db21wbGV0aW9uRW50cnk+ID1cbiAgICBlbGVtZW50TmFtZXMoKS5maWx0ZXIobmFtZSA9PiAhSElEREVOX0hUTUxfRUxFTUVOVFMuaGFzKG5hbWUpKS5tYXAobmFtZSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0VMRU1FTlQsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfTtcbiAgICB9KTtcbmNvbnN0IEFOR1VMQVJfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9IFtcbiAge1xuICAgIG5hbWU6ICduZy1jb250YWluZXInLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRhaW5lcicsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGVudCcsXG4gICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQU5HVUxBUl9FTEVNRU5ULFxuICAgIHNvcnRUZXh0OiAnbmctY29udGVudCcsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctdGVtcGxhdGUnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLXRlbXBsYXRlJyxcbiAgfSxcbl07XG5cbi8vIFRoaXMgaXMgYWRhcHRlZCBmcm9tIHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX3RlbXBsYXRlX3RyYW5zZm9ybS50c1xuLy8gdG8gYWxsb3cgZW1wdHkgYmluZGluZyBuYW1lcy5cbmNvbnN0IEJJTkRfTkFNRV9SRUdFWFAgPVxuICAgIC9eKD86KD86KD86KGJpbmQtKXwobGV0LSl8KHJlZi18Iyl8KG9uLSl8KGJpbmRvbi0pfChAKSkoLiopKXxcXFtcXCgoW15cXCldKilcXClcXF18XFxbKFteXFxdXSopXFxdfFxcKChbXlxcKV0qKVxcKSkkLztcbmVudW0gQVRUUiB7XG4gIC8vIEdyb3VwIDEgPSBcImJpbmQtXCJcbiAgS1dfQklORF9JRFggPSAxLFxuICAvLyBHcm91cCAyID0gXCJsZXQtXCJcbiAgS1dfTEVUX0lEWCA9IDIsXG4gIC8vIEdyb3VwIDMgPSBcInJlZi0vI1wiXG4gIEtXX1JFRl9JRFggPSAzLFxuICAvLyBHcm91cCA0ID0gXCJvbi1cIlxuICBLV19PTl9JRFggPSA0LFxuICAvLyBHcm91cCA1ID0gXCJiaW5kb24tXCJcbiAgS1dfQklORE9OX0lEWCA9IDUsXG4gIC8vIEdyb3VwIDYgPSBcIkBcIlxuICBLV19BVF9JRFggPSA2LFxuICAvLyBHcm91cCA3ID0gdGhlIGlkZW50aWZpZXIgYWZ0ZXIgXCJiaW5kLVwiLCBcImxldC1cIiwgXCJyZWYtLyNcIiwgXCJvbi1cIiwgXCJiaW5kb24tXCIgb3IgXCJAXCJcbiAgSURFTlRfS1dfSURYID0gNyxcbiAgLy8gR3JvdXAgOCA9IGlkZW50aWZpZXIgaW5zaWRlIFsoKV1cbiAgSURFTlRfQkFOQU5BX0JPWF9JRFggPSA4LFxuICAvLyBHcm91cCA5ID0gaWRlbnRpZmllciBpbnNpZGUgW11cbiAgSURFTlRfUFJPUEVSVFlfSURYID0gOSxcbiAgLy8gR3JvdXAgMTAgPSBpZGVudGlmaWVyIGluc2lkZSAoKVxuICBJREVOVF9FVkVOVF9JRFggPSAxMCxcbn1cbi8vIE1pY3Jvc3ludGF4IHRlbXBsYXRlIHN0YXJ0cyB3aXRoICcqJy4gU2VlIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29yZS9UZW1wbGF0ZVJlZlxuY29uc3QgVEVNUExBVEVfQVRUUl9QUkVGSVggPSAnKic7XG5cbmZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY29kZTogbnVtYmVyKSB7XG4gIC8vIElkZW50aWZpZXJzIGNvbnNpc3Qgb2YgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMsICdfJywgb3IgJyQnLlxuICByZXR1cm4gaXNBc2NpaUxldHRlcihjb2RlKSB8fCBpc0RpZ2l0KGNvZGUpIHx8IGNvZGUgPT0gJCQgfHwgY29kZSA9PSAkXztcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBzcGFuIG9mIHdvcmQgaW4gYSB0ZW1wbGF0ZSB0aGF0IHN1cnJvdW5kcyBgcG9zaXRpb25gLiBJZiB0aGVyZSBpcyBubyB3b3JkIGFyb3VuZFxuICogYHBvc2l0aW9uYCwgbm90aGluZyBpcyByZXR1cm5lZC5cbiAqL1xuZnVuY3Rpb24gZ2V0Qm91bmRlZFdvcmRTcGFuKHRlbXBsYXRlSW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogdHMuVGV4dFNwYW58dW5kZWZpbmVkIHtcbiAgY29uc3Qge3RlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgY29uc3QgdGVtcGxhdGVTcmMgPSB0ZW1wbGF0ZS5zb3VyY2U7XG5cbiAgaWYgKCF0ZW1wbGF0ZVNyYykgcmV0dXJuO1xuXG4gIC8vIFRPRE8oYXlhemhhZml6KTogQSBzb2x1dGlvbiBiYXNlZCBvbiB3b3JkIGV4cGFuc2lvbiB3aWxsIGFsd2F5cyBiZSBleHBlbnNpdmUgY29tcGFyZWQgdG8gb25lXG4gIC8vIGJhc2VkIG9uIEFTVHMuIFdoYXRldmVyIHBlbmFsdHkgd2UgaW5jdXIgaXMgcHJvYmFibHkgbWFuYWdlYWJsZSBmb3Igc21hbGwtbGVuZ3RoIChpLmUuIHRoZVxuICAvLyBtYWpvcml0eSBvZikgaWRlbnRpZmllcnMsIGJ1dCB0aGUgY3VycmVudCBzb2x1dGlvbiBpbnZvbGVzIGEgbnVtYmVyIG9mIGJyYW5jaGluZ3MgYW5kIHdlIGNhbid0XG4gIC8vIGNvbnRyb2wgcG90ZW50aWFsbHkgdmVyeSBsb25nIGlkZW50aWZpZXJzLiBDb25zaWRlciBtb3ZpbmcgdG8gYW4gQVNULWJhc2VkIHNvbHV0aW9uIG9uY2VcbiAgLy8gZXhpc3RpbmcgZGlmZmljdWx0aWVzIHdpdGggQVNUIHNwYW5zIGFyZSBtb3JlIGNsZWFybHkgcmVzb2x2ZWQgKHNlZSAjMzE4OTggZm9yIGRpc2N1c3Npb24gb2ZcbiAgLy8ga25vd24gcHJvYmxlbXMsIGFuZCAjMzMwOTEgZm9yIGhvdyB0aGV5IGFmZmVjdCB0ZXh0IHJlcGxhY2VtZW50KS5cbiAgLy9cbiAgLy8gYHRlbXBsYXRlUG9zaXRpb25gIHJlcHJlc2VudHMgdGhlIHJpZ2h0LWJvdW5kIGxvY2F0aW9uIG9mIGEgY3Vyc29yIGluIHRoZSB0ZW1wbGF0ZS5cbiAgLy8gICAga2V5LmVudHxyeVxuICAvLyAgICAgICAgICAgXi0tLS0gY3Vyc29yLCBhdCBwb3NpdGlvbiBgcmAgaXMgYXQuXG4gIC8vIEEgY3Vyc29yIGlzIG5vdCBpdHNlbGYgYSBjaGFyYWN0ZXIgaW4gdGhlIHRlbXBsYXRlOyBpdCBoYXMgYSBsZWZ0IChsb3dlcikgYW5kIHJpZ2h0ICh1cHBlcilcbiAgLy8gaW5kZXggYm91bmQgdGhhdCBodWdzIHRoZSBjdXJzb3IgaXRzZWxmLlxuICBsZXQgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgLy8gVG8gcGVyZm9ybSB3b3JkIGV4cGFuc2lvbiwgd2Ugd2FudCB0byBkZXRlcm1pbmUgdGhlIGxlZnQgYW5kIHJpZ2h0IGluZGljZXMgdGhhdCBodWcgdGhlIGN1cnNvci5cbiAgLy8gVGhlcmUgYXJlIHRocmVlIGNhc2VzIGhlcmUuXG4gIGxldCBsZWZ0LCByaWdodDtcbiAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPT09IDApIHtcbiAgICAvLyAxLiBDYXNlIGxpa2VcbiAgICAvLyAgICAgIHxyZXN0IG9mIHRlbXBsYXRlXG4gICAgLy8gICAgdGhlIGN1cnNvciBpcyBhdCB0aGUgc3RhcnQgb2YgdGhlIHRlbXBsYXRlLCBodWdnZWQgb25seSBieSB0aGUgcmlnaHQgc2lkZSAoMC1pbmRleCkuXG4gICAgbGVmdCA9IHJpZ2h0ID0gMDtcbiAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBvc2l0aW9uID09PSB0ZW1wbGF0ZVNyYy5sZW5ndGgpIHtcbiAgICAvLyAyLiBDYXNlIGxpa2VcbiAgICAvLyAgICAgIHJlc3Qgb2YgdGVtcGxhdGV8XG4gICAgLy8gICAgdGhlIGN1cnNvciBpcyBhdCB0aGUgZW5kIG9mIHRoZSB0ZW1wbGF0ZSwgaHVnZ2VkIG9ubHkgYnkgdGhlIGxlZnQgc2lkZSAobGFzdC1pbmRleCkuXG4gICAgbGVmdCA9IHJpZ2h0ID0gdGVtcGxhdGVTcmMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIHtcbiAgICAvLyAzLiBDYXNlIGxpa2VcbiAgICAvLyAgICAgIHdvfHJkXG4gICAgLy8gICAgdGhlcmUgaXMgYSBjbGVhciBsZWZ0IGFuZCByaWdodCBpbmRleC5cbiAgICBsZWZ0ID0gdGVtcGxhdGVQb3NpdGlvbiAtIDE7XG4gICAgcmlnaHQgPSB0ZW1wbGF0ZVBvc2l0aW9uO1xuICB9XG5cbiAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQobGVmdCkpICYmXG4gICAgICAhaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KHJpZ2h0KSkpIHtcbiAgICAvLyBDYXNlIGxpa2VcbiAgICAvLyAgICAgICAgIC58LlxuICAgIC8vIGxlZnQgLS0tXiBeLS0tIHJpZ2h0XG4gICAgLy8gVGhlcmUgaXMgbm8gd29yZCBoZXJlLlxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEV4cGFuZCBvbiB0aGUgbGVmdCBhbmQgcmlnaHQgc2lkZSB1bnRpbCBhIHdvcmQgYm91bmRhcnkgaXMgaGl0LiBCYWNrIHVwIG9uZSBleHBhbnNpb24gb24gYm90aFxuICAvLyBzaWRlIHRvIHN0YXkgaW5zaWRlIHRoZSB3b3JkLlxuICB3aGlsZSAobGVmdCA+PSAwICYmIGlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChsZWZ0KSkpIC0tbGVmdDtcbiAgKytsZWZ0O1xuICB3aGlsZSAocmlnaHQgPCB0ZW1wbGF0ZVNyYy5sZW5ndGggJiYgaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KHJpZ2h0KSkpICsrcmlnaHQ7XG4gIC0tcmlnaHQ7XG5cbiAgY29uc3QgYWJzb2x1dGVTdGFydFBvc2l0aW9uID0gcG9zaXRpb24gLSAodGVtcGxhdGVQb3NpdGlvbiAtIGxlZnQpO1xuICBjb25zdCBsZW5ndGggPSByaWdodCAtIGxlZnQgKyAxO1xuICByZXR1cm4ge3N0YXJ0OiBhYnNvbHV0ZVN0YXJ0UG9zaXRpb24sIGxlbmd0aH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZUNvbXBsZXRpb25zKFxuICAgIHRlbXBsYXRlSW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBsZXQgcmVzdWx0OiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICBjb25zdCB7aHRtbEFzdCwgdGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICAvLyBUaGUgdGVtcGxhdGVOb2RlIHN0YXJ0cyBhdCB0aGUgZGVsaW1pdGVyIGNoYXJhY3RlciBzbyB3ZSBhZGQgMSB0byBza2lwIGl0LlxuICBjb25zdCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICBjb25zdCBwYXRoID0gZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24oaHRtbEFzdCwgdGVtcGxhdGVQb3NpdGlvbik7XG4gIGNvbnN0IG1vc3RTcGVjaWZpYyA9IHBhdGgudGFpbDtcbiAgaWYgKHBhdGguZW1wdHkgfHwgIW1vc3RTcGVjaWZpYykge1xuICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFzdFBvc2l0aW9uID0gdGVtcGxhdGVQb3NpdGlvbiAtIG1vc3RTcGVjaWZpYy5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBtb3N0U3BlY2lmaWMudmlzaXQoXG4gICAgICAgIHtcbiAgICAgICAgICB2aXNpdEVsZW1lbnQoYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydFRhZ1NwYW4gPSBzcGFuT2YoYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgY29uc3QgdGFnTGVuID0gYXN0Lm5hbWUubGVuZ3RoO1xuICAgICAgICAgICAgLy8gKyAxIGZvciB0aGUgb3BlbmluZyBhbmdsZSBicmFja2V0XG4gICAgICAgICAgICBpZiAodGVtcGxhdGVQb3NpdGlvbiA8PSBzdGFydFRhZ1NwYW4uc3RhcnQgKyB0YWdMZW4gKyAxKSB7XG4gICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBpbiB0aGUgdGFnIHRoZW4gcmV0dXJuIHRoZSBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA8IHN0YXJ0VGFnU3Bhbi5lbmQpIHtcbiAgICAgICAgICAgICAgLy8gV2UgYXJlIGluIHRoZSBhdHRyaWJ1dGUgc2VjdGlvbiBvZiB0aGUgZWxlbWVudCAoYnV0IG5vdCBpbiBhbiBhdHRyaWJ1dGUpLlxuICAgICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGF0dHJpYnV0ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KHRlbXBsYXRlSW5mbywgYXN0Lm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRBdHRyaWJ1dGUoYXN0OiBBdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIC8vIEFuIGF0dHJpYnV0ZSBjb25zaXN0cyBvZiB0d28gcGFydHMsIExIUz1cIlJIU1wiLlxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIGNvbXBsZXRpb25zIGFyZSByZXF1ZXN0ZWQgZm9yIExIUyBvciBSSFNcbiAgICAgICAgICAgIGlmIChhc3QudmFsdWVTcGFuICYmIGluU3Bhbih0ZW1wbGF0ZVBvc2l0aW9uLCBzcGFuT2YoYXN0LnZhbHVlU3BhbikpKSB7XG4gICAgICAgICAgICAgIC8vIFJIUyBjb21wbGV0aW9uXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIExIUyBjb21wbGV0aW9uXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdFRleHQoYXN0KSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgaW4gYSBlbnRpdHkuXG4gICAgICAgICAgICByZXN1bHQgPSBlbnRpdHlDb21wbGV0aW9ucyhnZXRTb3VyY2VUZXh0KHRlbXBsYXRlLCBzcGFuT2YoYXN0KSksIGFzdFBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgcmVzdWx0ID0gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgdGVtcGxhdGVQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXRoLmZpcnN0KEVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IGdldEh0bWxUYWdEZWZpbml0aW9uKGVsZW1lbnQubmFtZSk7XG4gICAgICAgICAgICAgIGlmIChkZWZpbml0aW9uLmNvbnRlbnRUeXBlID09PSBUYWdDb250ZW50VHlwZS5QQVJTQUJMRV9EQVRBKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgY2FuIGhvbGQgY29udGVudCwgc2hvdyBlbGVtZW50IGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBJZiBubyBlbGVtZW50IGNvbnRhaW5lciwgaW1wbGllcyBwYXJzYWJsZSBkYXRhIHNvIHNob3cgZWxlbWVudHMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0Q29tbWVudCgpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uKCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb25DYXNlKCkge31cbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCk7XG4gIH1cblxuICBjb25zdCByZXBsYWNlbWVudFNwYW4gPSBnZXRCb3VuZGVkV29yZFNwYW4odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gIHJldHVybiByZXN1bHQubWFwKGVudHJ5ID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICAuLi5lbnRyeSwgcmVwbGFjZW1lbnRTcGFuLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IGF0dHIgPSBwYXRoLnRhaWw7XG4gIGNvbnN0IGVsZW0gPSBwYXRoLnBhcmVudE9mKGF0dHIpO1xuICBpZiAoIShhdHRyIGluc3RhbmNlb2YgQXR0cmlidXRlKSB8fCAhKGVsZW0gaW5zdGFuY2VvZiBFbGVtZW50KSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8vIFRPRE86IENvbnNpZGVyIHBhcnNpbmcgdGhlIGF0dHJpbnV0ZSBuYW1lIHRvIGEgcHJvcGVyIEFTVCBpbnN0ZWFkIG9mXG4gIC8vIG1hdGNoaW5nIHVzaW5nIHJlZ2V4LiBUaGlzIGlzIGJlY2F1c2UgdGhlIHJlZ2V4cCB3b3VsZCBpbmNvcnJlY3RseSBpZGVudGlmeVxuICAvLyBiaW5kIHBhcnRzIGZvciBjYXNlcyBsaWtlIFsoKXxdXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXiBjdXJzb3IgaXMgaGVyZVxuICBjb25zdCBiaW5kUGFydHMgPSBhdHRyLm5hbWUubWF0Y2goQklORF9OQU1FX1JFR0VYUCk7XG4gIGNvbnN0IGlzVGVtcGxhdGVSZWYgPSBhdHRyLm5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCk7XG4gIGNvbnN0IGlzQmluZGluZyA9IGJpbmRQYXJ0cyAhPT0gbnVsbCB8fCBpc1RlbXBsYXRlUmVmO1xuXG4gIGlmICghaXNCaW5kaW5nKSB7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChpbmZvLCBlbGVtLm5hbWUpO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgbmdBdHRycyA9IGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW0ubmFtZSk7XG4gIGlmICghYmluZFBhcnRzKSB7XG4gICAgLy8gSWYgYmluZFBhcnRzIGlzIG51bGwgdGhlbiB0aGlzIG11c3QgYmUgYSBUZW1wbGF0ZVJlZi5cbiAgICByZXN1bHRzLnB1c2goLi4ubmdBdHRycy50ZW1wbGF0ZVJlZnMpO1xuICB9IGVsc2UgaWYgKFxuICAgICAgYmluZFBhcnRzW0FUVFIuS1dfQklORF9JRFhdICE9PSB1bmRlZmluZWQgfHxcbiAgICAgIGJpbmRQYXJ0c1tBVFRSLklERU5UX1BST1BFUlRZX0lEWF0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIHByb3BlcnR5IGJpbmRpbmcgdmlhIGJpbmQtIG9yIFtdXG4gICAgcmVzdWx0cy5wdXNoKC4uLnByb3BlcnR5TmFtZXMoZWxlbS5uYW1lKSwgLi4ubmdBdHRycy5pbnB1dHMpO1xuICB9IGVsc2UgaWYgKFxuICAgICAgYmluZFBhcnRzW0FUVFIuS1dfT05fSURYXSAhPT0gdW5kZWZpbmVkIHx8IGJpbmRQYXJ0c1tBVFRSLklERU5UX0VWRU5UX0lEWF0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIGV2ZW50IGJpbmRpbmcgdmlhIG9uLSBvciAoKVxuICAgIHJlc3VsdHMucHVzaCguLi5ldmVudE5hbWVzKGVsZW0ubmFtZSksIC4uLm5nQXR0cnMub3V0cHV0cyk7XG4gIH0gZWxzZSBpZiAoXG4gICAgICBiaW5kUGFydHNbQVRUUi5LV19CSU5ET05fSURYXSAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICBiaW5kUGFydHNbQVRUUi5JREVOVF9CQU5BTkFfQk9YX0lEWF0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIGJhbmFuYS1pbi1hLWJveCBiaW5kaW5nIHZpYSBiaW5kb24tIG9yIFsoKV1cbiAgICByZXN1bHRzLnB1c2goLi4ubmdBdHRycy5iYW5hbmFzKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cy5tYXAobmFtZSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KFxuICAgIGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcblxuICBpZiAoaW5mby50ZW1wbGF0ZSBpbnN0YW5jZW9mIElubGluZVRlbXBsYXRlKSB7XG4gICAgLy8gUHJvdmlkZSBIVE1MIGF0dHJpYnV0ZXMgY29tcGxldGlvbiBvbmx5IGZvciBpbmxpbmUgdGVtcGxhdGVzXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGF0dHJpYnV0ZU5hbWVzKGVsZW1lbnROYW1lKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9BVFRSSUJVVEUsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIEFuZ3VsYXIgYXR0cmlidXRlc1xuICBjb25zdCBuZ0F0dHJzID0gYW5ndWxhckF0dHJpYnV0ZXMoaW5mbywgZWxlbWVudE5hbWUpO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgbmdBdHRycy5vdGhlcnMpIHtcbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFUVFJJQlVURSxcbiAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogUHJvdmlkZSBjb21wbGV0aW9ucyB0byB0aGUgUkhTIG9mIGFuIGF0dHJpYnV0ZSwgd2hpY2ggaXMgb2YgdGhlIGZvcm1cbiAqIExIUz1cIlJIU1wiLiBUaGUgdGVtcGxhdGUgcGF0aCBpcyBjb21wdXRlZCBmcm9tIHRoZSBzcGVjaWZpZWQgYGluZm9gIHdoZXJlYXNcbiAqIHRoZSBjb250ZXh0IGlzIGRldGVybWluZWQgZnJvbSB0aGUgc3BlY2lmaWVkIGBodG1sUGF0aGAuXG4gKiBAcGFyYW0gaW5mbyBPYmplY3QgdGhhdCBjb250YWlucyB0aGUgdGVtcGxhdGUgQVNUXG4gKiBAcGFyYW0gaHRtbFBhdGggUGF0aCB0byB0aGUgSFRNTCBub2RlXG4gKi9cbmZ1bmN0aW9uIGF0dHJpYnV0ZVZhbHVlQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBodG1sUGF0aDogSHRtbEFzdFBhdGgpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgVGVtcGxhdGUgQVNUIHBhdGguXG4gIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIGh0bWxQYXRoLnBvc2l0aW9uKTtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihpbmZvLCBodG1sUGF0aC5wb3NpdGlvbiwgKCkgPT4ge1xuICAgIGNvbnN0IGRpbmZvID0gZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pO1xuICAgIHJldHVybiBnZXRFeHByZXNzaW9uU2NvcGUoZGluZm8sIHRlbXBsYXRlUGF0aCk7XG4gIH0pO1xuICBpZiAodGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBBdHRyQXN0IHx8XG4gICAgICB0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEJvdW5kRWxlbWVudFByb3BlcnR5QXN0IHx8XG4gICAgICB0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEJvdW5kRXZlbnRBc3QpIHtcbiAgICB0ZW1wbGF0ZVBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgICByZXR1cm4gdmlzaXRvci5yZXN1bHRzO1xuICB9XG4gIC8vIEluIG9yZGVyIHRvIHByb3ZpZGUgYWNjdXJhdGUgYXR0cmlidXRlIHZhbHVlIGNvbXBsZXRpb24sIHdlIG5lZWQgdG8ga25vd1xuICAvLyB3aGF0IHRoZSBMSFMgaXMsIGFuZCBjb25zdHJ1Y3QgdGhlIHByb3BlciBBU1QgaWYgaXQgaXMgbWlzc2luZy5cbiAgY29uc3QgaHRtbEF0dHIgPSBodG1sUGF0aC50YWlsIGFzIEF0dHJpYnV0ZTtcbiAgY29uc3QgYmluZFBhcnRzID0gaHRtbEF0dHIubmFtZS5tYXRjaChCSU5EX05BTUVfUkVHRVhQKTtcbiAgaWYgKGJpbmRQYXJ0cyAmJiBiaW5kUGFydHNbQVRUUi5LV19SRUZfSURYXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IHJlZkFzdDogUmVmZXJlbmNlQXN0fHVuZGVmaW5lZDtcbiAgICBsZXQgZWxlbUFzdDogRWxlbWVudEFzdHx1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgUmVmZXJlbmNlQXN0KSB7XG4gICAgICByZWZBc3QgPSB0ZW1wbGF0ZVBhdGgudGFpbDtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHRlbXBsYXRlUGF0aC5wYXJlbnRPZihyZWZBc3QpO1xuICAgICAgaWYgKHBhcmVudCBpbnN0YW5jZW9mIEVsZW1lbnRBc3QpIHtcbiAgICAgICAgZWxlbUFzdCA9IHBhcmVudDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgRWxlbWVudEFzdCkge1xuICAgICAgcmVmQXN0ID0gbmV3IFJlZmVyZW5jZUFzdChodG1sQXR0ci5uYW1lLCBudWxsICEsIGh0bWxBdHRyLnZhbHVlLCBodG1sQXR0ci52YWx1ZVNwYW4gISk7XG4gICAgICBlbGVtQXN0ID0gdGVtcGxhdGVQYXRoLnRhaWw7XG4gICAgfVxuICAgIGlmIChyZWZBc3QgJiYgZWxlbUFzdCkge1xuICAgICAgcmVmQXN0LnZpc2l0KHZpc2l0b3IsIGVsZW1Bc3QpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBIdG1sQXN0IGNvbnRhaW5zIHRoZSBgQXR0cmlidXRlYCBub2RlLCBob3dldmVyIHRoZSBjb3JyZXNwb25kaW5nIGBBdHRyQXN0YFxuICAgIC8vIG5vZGUgaXMgbWlzc2luZyBmcm9tIHRoZSBUZW1wbGF0ZUFzdC5cbiAgICBjb25zdCBhdHRyQXN0ID0gbmV3IEF0dHJBc3QoaHRtbEF0dHIubmFtZSwgaHRtbEF0dHIudmFsdWUsIGh0bWxBdHRyLnZhbHVlU3BhbiAhKTtcbiAgICBhdHRyQXN0LnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICB9XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRDb21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gWy4uLkFOR1VMQVJfRUxFTUVOVFNdO1xuXG4gIGlmIChpbmZvLnRlbXBsYXRlIGluc3RhbmNlb2YgSW5saW5lVGVtcGxhdGUpIHtcbiAgICAvLyBQcm92aWRlIEhUTUwgZWxlbWVudHMgY29tcGxldGlvbiBvbmx5IGZvciBpbmxpbmUgdGVtcGxhdGVzXG4gICAgcmVzdWx0cy5wdXNoKC4uLkhUTUxfRUxFTUVOVFMpO1xuICB9XG5cbiAgLy8gQ29sbGVjdCB0aGUgZWxlbWVudHMgcmVmZXJlbmNlZCBieSB0aGUgc2VsZWN0b3JzXG4gIGNvbnN0IGNvbXBvbmVudHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBnZXRTZWxlY3RvcnMoaW5mbykuc2VsZWN0b3JzKSB7XG4gICAgY29uc3QgbmFtZSA9IHNlbGVjdG9yLmVsZW1lbnQ7XG4gICAgaWYgKG5hbWUgJiYgIWNvbXBvbmVudHMuaGFzKG5hbWUpKSB7XG4gICAgICBjb21wb25lbnRzLmFkZChuYW1lKTtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkNPTVBPTkVOVCxcbiAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZW50aXR5Q29tcGxldGlvbnModmFsdWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgZW50aXR5IGNvbXBsZXRpb25zXG4gIGNvbnN0IHJlID0gLyZbQS1aYS16XSo7Pyg/IVxcZCkvZztcbiAgbGV0IGZvdW5kOiBSZWdFeHBFeGVjQXJyYXl8bnVsbDtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgd2hpbGUgKGZvdW5kID0gcmUuZXhlYyh2YWx1ZSkpIHtcbiAgICBsZXQgbGVuID0gZm91bmRbMF0ubGVuZ3RoO1xuICAgIGlmIChwb3NpdGlvbiA+PSBmb3VuZC5pbmRleCAmJiBwb3NpdGlvbiA8IChmb3VuZC5pbmRleCArIGxlbikpIHtcbiAgICAgIHJlc3VsdCA9IE9iamVjdC5rZXlzKE5BTUVEX0VOVElUSUVTKS5tYXAobmFtZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbmFtZTogYCYke25hbWV9O2AsXG4gICAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuRU5USVRZLFxuICAgICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW50ZXJwb2xhdGlvbkNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgLy8gTG9vayBmb3IgYW4gaW50ZXJwb2xhdGlvbiBpbiBhdCB0aGUgcG9zaXRpb24uXG4gIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGZpbmRUZW1wbGF0ZUFzdEF0KGluZm8udGVtcGxhdGVBc3QsIHBvc2l0aW9uKTtcbiAgaWYgKCF0ZW1wbGF0ZVBhdGgudGFpbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCB2aXNpdG9yID0gbmV3IEV4cHJlc3Npb25WaXNpdG9yKFxuICAgICAgaW5mbywgcG9zaXRpb24sICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyksIHRlbXBsYXRlUGF0aCkpO1xuICB0ZW1wbGF0ZVBhdGgudGFpbC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgcmV0dXJuIHZpc2l0b3IucmVzdWx0cztcbn1cblxuLy8gVGhlcmUgaXMgYSBzcGVjaWFsIGNhc2Ugb2YgSFRNTCB3aGVyZSB0ZXh0IHRoYXQgY29udGFpbnMgYSB1bmNsb3NlZCB0YWcgaXMgdHJlYXRlZCBhc1xuLy8gdGV4dC4gRm9yIGV4YXBsZSAnPGgxPiBTb21lIDxhIHRleHQgPC9oMT4nIHByb2R1Y2VzIGEgdGV4dCBub2RlcyBpbnNpZGUgb2YgdGhlIEgxXG4vLyBlbGVtZW50IFwiU29tZSA8YSB0ZXh0XCIuIFdlLCBob3dldmVyLCB3YW50IHRvIHRyZWF0IHRoaXMgYXMgaWYgdGhlIHVzZXIgd2FzIHJlcXVlc3Rpbmdcbi8vIHRoZSBhdHRyaWJ1dGVzIG9mIGFuIFwiYVwiIGVsZW1lbnQsIG5vdCByZXF1ZXN0aW5nIGNvbXBsZXRpb24gaW4gdGhlIGEgdGV4dCBlbGVtZW50LiBUaGlzXG4vLyBjb2RlIGNoZWNrcyBmb3IgdGhpcyBjYXNlIGFuZCByZXR1cm5zIGVsZW1lbnQgY29tcGxldGlvbnMgaWYgaXQgaXMgZGV0ZWN0ZWQgb3IgdW5kZWZpbmVkXG4vLyBpZiBpdCBpcyBub3QuXG5mdW5jdGlvbiB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKFxuICAgIGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgdGFpbCA9IHBhdGgudGFpbDtcbiAgaWYgKHRhaWwgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgY29uc3QgbWF0Y2ggPSB0YWlsLnZhbHVlLm1hdGNoKC88KFxcdyhcXHd8XFxkfC0pKjopPyhcXHcoXFx3fFxcZHwtKSopXFxzLyk7XG4gICAgLy8gVGhlIHBvc2l0aW9uIG11c3QgYmUgYWZ0ZXIgdGhlIG1hdGNoLCBvdGhlcndpc2Ugd2UgYXJlIHN0aWxsIGluIGEgcGxhY2Ugd2hlcmUgZWxlbWVudHNcbiAgICAvLyBhcmUgZXhwZWN0ZWQgKHN1Y2ggYXMgYDx8YWAgb3IgYDxhfGA7IHdlIG9ubHkgd2FudCBhdHRyaWJ1dGVzIGZvciBgPGEgfGAgb3IgYWZ0ZXIpLlxuICAgIGlmIChtYXRjaCAmJlxuICAgICAgICBwYXRoLnBvc2l0aW9uID49IChtYXRjaC5pbmRleCB8fCAwKSArIG1hdGNoWzBdLmxlbmd0aCArIHRhaWwuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpIHtcbiAgICAgIHJldHVybiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoaW5mbywgbWF0Y2hbM10pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbmNsYXNzIEV4cHJlc3Npb25WaXNpdG9yIGV4dGVuZHMgTnVsbFRlbXBsYXRlVmlzaXRvciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tcGxldGlvbnMgPSBuZXcgTWFwPHN0cmluZywgbmcuQ29tcGxldGlvbkVudHJ5PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBpbmZvOiBBc3RSZXN1bHQsIHByaXZhdGUgcmVhZG9ubHkgcG9zaXRpb246IG51bWJlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZ2V0RXhwcmVzc2lvblNjb3BlOiAoKSA9PiBuZy5TeW1ib2xUYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgcmVzdWx0cygpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMuY29tcGxldGlvbnMudmFsdWVzKCkpOyB9XG5cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QpOiB2b2lkIHtcbiAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0KTogdm9pZCB7IHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhhc3QuaGFuZGxlcik7IH1cblxuICB2aXNpdEVsZW1lbnQoKTogdm9pZCB7XG4gICAgLy8gbm8tb3AgZm9yIG5vd1xuICB9XG5cbiAgdmlzaXRBdHRyKGFzdDogQXR0ckFzdCkge1xuICAgIGlmIChhc3QubmFtZS5zdGFydHNXaXRoKFRFTVBMQVRFX0FUVFJfUFJFRklYKSkge1xuICAgICAgLy8gVGhpcyBhIHRlbXBsYXRlIGJpbmRpbmcgZ2l2ZW4gYnkgbWljcm8gc3ludGF4IGV4cHJlc3Npb24uXG4gICAgICAvLyBGaXJzdCwgdmVyaWZ5IHRoZSBhdHRyaWJ1dGUgY29uc2lzdHMgb2Ygc29tZSBiaW5kaW5nIHdlIGNhbiBnaXZlIGNvbXBsZXRpb25zIGZvci5cbiAgICAgIC8vIFRoZSBzb3VyY2VTcGFuIG9mIEF0dHJBc3QgcG9pbnRzIHRvIHRoZSBSSFMgb2YgdGhlIGF0dHJpYnV0ZVxuICAgICAgY29uc3QgdGVtcGxhdGVLZXkgPSBhc3QubmFtZS5zdWJzdHJpbmcoVEVNUExBVEVfQVRUUl9QUkVGSVgubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVmFsdWUgPSBhc3Quc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSBhc3Quc291cmNlU3Bhbi5zdGFydC5maWxlLnVybDtcbiAgICAgIC8vIFRPRE8oa3lsaWF1KTogV2UgYXJlIHVuYWJsZSB0byBkZXRlcm1pbmUgdGhlIGFic29sdXRlIG9mZnNldCBvZiB0aGUga2V5XG4gICAgICAvLyBidXQgaXQgaXMgb2theSBoZXJlLCBiZWNhdXNlIHdlIGFyZSBvbmx5IGxvb2tpbmcgYXQgdGhlIFJIUyBvZiB0aGUgYXR0clxuICAgICAgY29uc3QgYWJzS2V5T2Zmc2V0ID0gMDtcbiAgICAgIGNvbnN0IGFic1ZhbHVlT2Zmc2V0ID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgY29uc3Qge3RlbXBsYXRlQmluZGluZ3N9ID0gdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKFxuICAgICAgICAgIHRlbXBsYXRlS2V5LCB0ZW1wbGF0ZVZhbHVlLCB0ZW1wbGF0ZVVybCwgYWJzS2V5T2Zmc2V0LCBhYnNWYWx1ZU9mZnNldCk7XG4gICAgICAvLyBGaW5kIHRoZSB0ZW1wbGF0ZSBiaW5kaW5nIHRoYXQgY29udGFpbnMgdGhlIHBvc2l0aW9uLlxuICAgICAgY29uc3QgYmluZGluZyA9IHRlbXBsYXRlQmluZGluZ3MuZmluZChiID0+IGluU3Bhbih0aGlzLnBvc2l0aW9uLCBiLnNvdXJjZVNwYW4pKTtcblxuICAgICAgaWYgKCFiaW5kaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5taWNyb1N5bnRheEluQXR0cmlidXRlVmFsdWUoYXN0LCBiaW5kaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXhwcmVzc2lvbkFzdCA9IHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlQmluZGluZyhcbiAgICAgICAgICBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLnRvU3RyaW5nKCksIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoZXhwcmVzc2lvbkFzdCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRSZWZlcmVuY2UoX2FzdDogUmVmZXJlbmNlQXN0LCBjb250ZXh0OiBFbGVtZW50QXN0KSB7XG4gICAgY29udGV4dC5kaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IHtleHBvcnRBc30gPSBkaXIuZGlyZWN0aXZlO1xuICAgICAgaWYgKGV4cG9ydEFzKSB7XG4gICAgICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KFxuICAgICAgICAgICAgZXhwb3J0QXMsIHtuYW1lOiBleHBvcnRBcywga2luZDogbmcuQ29tcGxldGlvbktpbmQuUkVGRVJFTkNFLCBzb3J0VGV4dDogZXhwb3J0QXN9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KSB7XG4gICAgaWYgKGluU3Bhbih0aGlzLnBvc2l0aW9uLCBhc3QudmFsdWUuc291cmNlU3BhbikpIHtcbiAgICAgIGNvbnN0IGNvbXBsZXRpb25zID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIGFzdC52YWx1ZSwgdGhpcy5wb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlKTtcbiAgICAgIGlmIChjb21wbGV0aW9ucykge1xuICAgICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbXBsZXRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnModmFsdWU6IEFTVCkge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLCB0aGlzLnBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUpO1xuICAgIGlmIChzeW1ib2xzKSB7XG4gICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogbmcuU3ltYm9sW10pIHtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc3ltYm9scykge1xuICAgICAgaWYgKHMubmFtZS5zdGFydHNXaXRoKCdfXycpIHx8ICFzLnB1YmxpYyB8fCB0aGlzLmNvbXBsZXRpb25zLmhhcyhzLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcGlwZSBtZXRob2Qgc2hvdWxkIG5vdCBpbmNsdWRlIHBhcmVudGhlc2VzLlxuICAgICAgLy8gZS5nLiB7eyB2YWx1ZV9leHByZXNzaW9uIHwgc2xpY2UgOiBzdGFydCBbIDogZW5kIF0gfX1cbiAgICAgIGNvbnN0IHNob3VsZEluc2VydFBhcmVudGhlc2VzID0gcy5jYWxsYWJsZSAmJiBzLmtpbmQgIT09IG5nLkNvbXBsZXRpb25LaW5kLlBJUEU7XG4gICAgICB0aGlzLmNvbXBsZXRpb25zLnNldChzLm5hbWUsIHtcbiAgICAgICAgbmFtZTogcy5uYW1lLFxuICAgICAgICBraW5kOiBzLmtpbmQgYXMgbmcuQ29tcGxldGlvbktpbmQsXG4gICAgICAgIHNvcnRUZXh0OiBzLm5hbWUsXG4gICAgICAgIGluc2VydFRleHQ6IHNob3VsZEluc2VydFBhcmVudGhlc2VzID8gYCR7cy5uYW1lfSgpYCA6IHMubmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBoYW5kbGVzIHRoZSBjb21wbGV0aW9ucyBvZiBhdHRyaWJ1dGUgdmFsdWVzIGZvciBkaXJlY3RpdmVzIHRoYXRcbiAgICogc3VwcG9ydCB0aGUgbWljcm9zeW50YXggZm9ybWF0LiBFeGFtcGxlcyBhcmUgKm5nRm9yIGFuZCAqbmdJZi5cbiAgICogVGhlc2UgZGlyZWN0aXZlcyBhbGxvd3MgZGVjbGFyYXRpb24gb2YgXCJsZXRcIiB2YXJpYWJsZXMsIGFkZHMgY29udGV4dC1zcGVjaWZpY1xuICAgKiBzeW1ib2xzIGxpa2UgJGltcGxpY2l0LCBpbmRleCwgY291bnQsIGFtb25nIG90aGVyIGJlaGF2aW9ycy5cbiAgICogRm9yIGEgY29tcGxldGUgZGVzY3JpcHRpb24gb2Ygc3VjaCBmb3JtYXQsIHNlZVxuICAgKiBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvc3RydWN0dXJhbC1kaXJlY3RpdmVzI3RoZS1hc3Rlcmlzay0tcHJlZml4XG4gICAqXG4gICAqIEBwYXJhbSBhdHRyIGRlc2NyaXB0b3IgZm9yIGF0dHJpYnV0ZSBuYW1lIGFuZCB2YWx1ZSBwYWlyXG4gICAqIEBwYXJhbSBiaW5kaW5nIHRlbXBsYXRlIGJpbmRpbmcgZm9yIHRoZSBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGVcbiAgICovXG4gIHByaXZhdGUgbWljcm9TeW50YXhJbkF0dHJpYnV0ZVZhbHVlKGF0dHI6IEF0dHJBc3QsIGJpbmRpbmc6IFRlbXBsYXRlQmluZGluZykge1xuICAgIGNvbnN0IGtleSA9IGF0dHIubmFtZS5zdWJzdHJpbmcoMSk7ICAvLyByZW1vdmUgbGVhZGluZyBhc3Rlcmlza1xuXG4gICAgLy8gRmluZCB0aGUgc2VsZWN0b3IgLSBlZyBuZ0ZvciwgbmdJZiwgZXRjXG4gICAgY29uc3Qgc2VsZWN0b3JJbmZvID0gZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbyk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBzZWxlY3RvckluZm8uc2VsZWN0b3JzLmZpbmQocyA9PiB7XG4gICAgICAvLyBhdHRyaWJ1dGVzIGFyZSBsaXN0ZWQgaW4gKGF0dHJpYnV0ZSwgdmFsdWUpIHBhaXJzXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMuYXR0cnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgaWYgKHMuYXR0cnNbaV0gPT09IGtleSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIGF0dHIuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG5cbiAgICBpZiAoYmluZGluZyBpbnN0YW5jZW9mIFZhcmlhYmxlQmluZGluZykge1xuICAgICAgLy8gVE9ETyhreWxpYXUpOiBXaXRoIGV4cHJlc3Npb24gc291cmNlU3BhbiB3ZSBzaG91bGRuJ3QgaGF2ZSB0byBzZWFyY2hcbiAgICAgIC8vIHRoZSBhdHRyaWJ1dGUgdmFsdWUgc3RyaW5nIGFueW1vcmUuIEp1c3QgY2hlY2sgaWYgcG9zaXRpb24gaXMgaW4gdGhlXG4gICAgICAvLyBleHByZXNzaW9uIHNvdXJjZSBzcGFuLlxuICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IGF0dHIudmFsdWUuaW5kZXhPZignPScpO1xuICAgICAgaWYgKGVxdWFsTG9jYXRpb24gPiAwICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgLy8gV2UgYXJlIGFmdGVyIHRoZSAnPScgaW4gYSBsZXQgY2xhdXNlLiBUaGUgdmFsaWQgdmFsdWVzIGhlcmUgYXJlIHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgICAgICAvLyB0ZW1wbGF0ZSByZWZlcmVuY2UncyB0eXBlIHBhcmFtZXRlci5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChkaXJlY3RpdmVNZXRhZGF0YSkge1xuICAgICAgICAgIGNvbnN0IGNvbnRleHRUYWJsZSA9XG4gICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgIGlmIChjb250ZXh0VGFibGUpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgYWRkcyBzeW1ib2xzIGxpa2UgJGltcGxpY2l0LCBpbmRleCwgY291bnQsIGV0Yy5cbiAgICAgICAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoY29udGV4dFRhYmxlLnZhbHVlcygpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBFeHByZXNzaW9uQmluZGluZykge1xuICAgICAgaWYgKGluU3Bhbih0aGlzLnBvc2l0aW9uLCBiaW5kaW5nLnZhbHVlPy5hc3Quc291cmNlU3BhbikpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGJpbmRpbmcudmFsdWUgIS5hc3QpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKCFiaW5kaW5nLnZhbHVlICYmIHRoaXMucG9zaXRpb24gPiBiaW5kaW5nLmtleS5zcGFuLmVuZCkge1xuICAgICAgICAvLyBObyBleHByZXNzaW9uIGlzIGRlZmluZWQgZm9yIHRoZSB2YWx1ZSBvZiB0aGUga2V5IGV4cHJlc3Npb24gYmluZGluZywgYnV0IHRoZSBjdXJzb3IgaXNcbiAgICAgICAgLy8gaW4gYSBsb2NhdGlvbiB3aGVyZSB0aGUgZXhwcmVzc2lvbiB3b3VsZCBiZSBkZWZpbmVkLiBUaGlzIGNhbiBoYXBwZW4gaW4gYSBjYXNlIGxpa2VcbiAgICAgICAgLy8gICBsZXQgaSBvZiB8XG4gICAgICAgIC8vICAgICAgICAgICAgXi0tIGN1cnNvclxuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIGJhY2tmaWxsIHRoZSB2YWx1ZSB0byBiZSBhbiBlbXB0eSBleHByZXNzaW9uIGFuZCByZXRyaWV2ZSBjb21wbGV0aW9ucy5cbiAgICAgICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKG5ldyBFbXB0eUV4cHIoXG4gICAgICAgICAgICBuZXcgUGFyc2VTcGFuKHZhbHVlUmVsYXRpdmVQb3NpdGlvbiwgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uKSxcbiAgICAgICAgICAgIG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4odGhpcy5wb3NpdGlvbiwgdGhpcy5wb3NpdGlvbikpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VUZXh0KHRlbXBsYXRlOiBuZy5UZW1wbGF0ZVNvdXJjZSwgc3BhbjogbmcuU3Bhbik6IHN0cmluZyB7XG4gIHJldHVybiB0ZW1wbGF0ZS5zb3VyY2Uuc3Vic3RyaW5nKHNwYW4uc3RhcnQsIHNwYW4uZW5kKTtcbn1cblxuaW50ZXJmYWNlIEFuZ3VsYXJBdHRyaWJ1dGVzIHtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgdGhhdCBzdXBwb3J0IHRoZSAqIHN5bnRheC4gU2VlIGh0dHBzOi8vYW5ndWxhci5pby9hcGkvY29yZS9UZW1wbGF0ZVJlZlxuICAgKi9cbiAgdGVtcGxhdGVSZWZzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgd2l0aCB0aGUgQElucHV0IGFubm90YXRpb24uXG4gICAqL1xuICBpbnB1dHM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogQXR0cmlidXRlcyB3aXRoIHRoZSBAT3V0cHV0IGFubm90YXRpb24uXG4gICAqL1xuICBvdXRwdXRzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgdGhhdCBzdXBwb3J0IHRoZSBbKCldIG9yIGJpbmRvbi0gc3ludGF4LlxuICAgKi9cbiAgYmFuYW5hczogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBHZW5lcmFsIGF0dHJpYnV0ZXMgdGhhdCBtYXRjaCB0aGUgc3BlY2lmaWVkIGVsZW1lbnQuXG4gICAqL1xuICBvdGhlcnM6IFNldDxzdHJpbmc+O1xufVxuXG4vKipcbiAqIFJldHVybiBhbGwgQW5ndWxhci1zcGVjaWZpYyBhdHRyaWJ1dGVzIGZvciB0aGUgZWxlbWVudCB3aXRoIGBlbGVtZW50TmFtZWAuXG4gKiBAcGFyYW0gaW5mb1xuICogQHBhcmFtIGVsZW1lbnROYW1lXG4gKi9cbmZ1bmN0aW9uIGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm86IEFzdFJlc3VsdCwgZWxlbWVudE5hbWU6IHN0cmluZyk6IEFuZ3VsYXJBdHRyaWJ1dGVzIHtcbiAgY29uc3Qge3NlbGVjdG9ycywgbWFwOiBzZWxlY3Rvck1hcH0gPSBnZXRTZWxlY3RvcnMoaW5mbyk7XG4gIGNvbnN0IHRlbXBsYXRlUmVmcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBpbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3V0cHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBiYW5hbmFzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG90aGVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgIGlmIChzZWxlY3Rvci5lbGVtZW50ICYmIHNlbGVjdG9yLmVsZW1lbnQgIT09IGVsZW1lbnROYW1lKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3Qgc3VtbWFyeSA9IHNlbGVjdG9yTWFwLmdldChzZWxlY3RvcikgITtcbiAgICBjb25zdCBoYXNUZW1wbGF0ZVJlZiA9IGlzU3RydWN0dXJhbERpcmVjdGl2ZShzdW1tYXJ5LnR5cGUpO1xuICAgIC8vIGF0dHJpYnV0ZXMgYXJlIGxpc3RlZCBpbiAoYXR0cmlidXRlLCB2YWx1ZSkgcGFpcnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9yLmF0dHJzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBjb25zdCBhdHRyID0gc2VsZWN0b3IuYXR0cnNbaV07XG4gICAgICBpZiAoaGFzVGVtcGxhdGVSZWYpIHtcbiAgICAgICAgdGVtcGxhdGVSZWZzLmFkZChhdHRyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG90aGVycy5hZGQoYXR0cik7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5LmlucHV0cykpIHtcbiAgICAgIGlucHV0cy5hZGQoaW5wdXQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkub3V0cHV0cykpIHtcbiAgICAgIG91dHB1dHMuYWRkKG91dHB1dCk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgbmFtZSBvZiBpbnB1dHMpIHtcbiAgICAvLyBBZGQgYmFuYW5hLWluLWEtYm94IHN5bnRheFxuICAgIC8vIGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS1zeW50YXgjdHdvLXdheS1iaW5kaW5nLVxuICAgIGlmIChvdXRwdXRzLmhhcyhgJHtuYW1lfUNoYW5nZWApKSB7XG4gICAgICBiYW5hbmFzLmFkZChuYW1lKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHt0ZW1wbGF0ZVJlZnMsIGlucHV0cywgb3V0cHV0cywgYmFuYW5hcywgb3RoZXJzfTtcbn1cbiJdfQ==