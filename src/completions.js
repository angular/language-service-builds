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
                var completions = expressions_1.getExpressionCompletions(this.getExpressionScope(), ast.value, this.position, this.info.template.query);
                if (completions) {
                    this.addSymbolsToCompletions(completions);
                }
            }
        };
        ExpressionVisitor.prototype.processExpressionCompletions = function (value) {
            var symbols = expressions_1.getExpressionCompletions(this.getExpressionScope(), value, this.position, this.info.template.query);
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
            else if (utils_1.inSpan(valueRelativePosition, (_a = binding.value) === null || _a === void 0 ? void 0 : _a.ast.span)) {
                this.processExpressionCompletions(binding.value.ast);
                return;
            }
            // If the expression is incomplete, for example *ngFor="let x of |"
            // binding.expression is null. We could still try to provide suggestions
            // by looking for symbols that are in scope.
            var KW_OF = ' of ';
            var ofLocation = attr.value.indexOf(KW_OF);
            if (ofLocation > 0 && valueRelativePosition >= ofLocation + KW_OF.length) {
                var expressionAst = this.info.expressionParser.parseBinding(attr.value, attr.sourceSpan.toString(), attr.sourceSpan.start.offset);
                this.processExpressionCompletions(expressionAst);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdVY7SUFDdlYscURBQTJFO0lBRzNFLCtGQUE0RDtJQUM1RCx5RUFBdUQ7SUFDdkQscUVBQW9GO0lBQ3BGLG1FQUEwQztJQUMxQyx3REFBOEI7SUFDOUIsNkRBQXdKO0lBRXhKLElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckYsSUFBTSxhQUFhLEdBQ2Ysd0JBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtRQUNyRSxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWTtZQUNwQyxRQUFRLEVBQUUsSUFBSTtTQUNmLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNQLElBQU0sZ0JBQWdCLEdBQXNDO1FBQzFEO1lBQ0UsSUFBSSxFQUFFLGNBQWM7WUFDcEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsY0FBYztTQUN6QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsWUFBWTtTQUN2QjtRQUNEO1lBQ0Us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dXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEFzdFBhdGgsIEF0dHJBc3QsIEF0dHJpYnV0ZSwgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCwgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIEJvdW5kRXZlbnRBc3QsIEJvdW5kVGV4dEFzdCwgRWxlbWVudCwgRWxlbWVudEFzdCwgSHRtbEFzdFBhdGgsIE5BTUVEX0VOVElUSUVTLCBOb2RlIGFzIEh0bWxBc3QsIE51bGxUZW1wbGF0ZVZpc2l0b3IsIFJlZmVyZW5jZUFzdCwgVGFnQ29udGVudFR5cGUsIFRlbXBsYXRlQmluZGluZywgVGV4dCwgVmFyaWFibGVCaW5kaW5nLCBnZXRIdG1sVGFnRGVmaW5pdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHskJCwgJF8sIGlzQXNjaWlMZXR0ZXIsIGlzRGlnaXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jaGFycyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7YXR0cmlidXRlTmFtZXMsIGVsZW1lbnROYW1lcywgZXZlbnROYW1lcywgcHJvcGVydHlOYW1lc30gZnJvbSAnLi9odG1sX2luZm8nO1xuaW1wb3J0IHtJbmxpbmVUZW1wbGF0ZX0gZnJvbSAnLi90ZW1wbGF0ZSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGdldFNlbGVjdG9ycywgaW5TcGFuLCBpc1N0cnVjdHVyYWxEaXJlY3RpdmUsIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IEhJRERFTl9IVE1MX0VMRU1FTlRTOiBSZWFkb25seVNldDxzdHJpbmc+ID1cbiAgICBuZXcgU2V0KFsnaHRtbCcsICdzY3JpcHQnLCAnbm9zY3JpcHQnLCAnYmFzZScsICdib2R5JywgJ3RpdGxlJywgJ2hlYWQnLCAnbGluayddKTtcbmNvbnN0IEhUTUxfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9XG4gICAgZWxlbWVudE5hbWVzKCkuZmlsdGVyKG5hbWUgPT4gIUhJRERFTl9IVE1MX0VMRU1FTlRTLmhhcyhuYW1lKSkubWFwKG5hbWUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuSFRNTF9FTEVNRU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH07XG4gICAgfSk7XG5jb25zdCBBTkdVTEFSX0VMRU1FTlRTOiBSZWFkb25seUFycmF5PG5nLkNvbXBsZXRpb25FbnRyeT4gPSBbXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGFpbmVyJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy1jb250YWluZXInLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLWNvbnRlbnQnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRlbnQnLFxuICB9LFxuICB7XG4gICAgbmFtZTogJ25nLXRlbXBsYXRlJyxcbiAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BTkdVTEFSX0VMRU1FTlQsXG4gICAgc29ydFRleHQ6ICduZy10ZW1wbGF0ZScsXG4gIH0sXG5dO1xuXG4vLyBUaGlzIGlzIGFkYXB0ZWQgZnJvbSBwYWNrYWdlcy9jb21waWxlci9zcmMvcmVuZGVyMy9yM190ZW1wbGF0ZV90cmFuc2Zvcm0udHNcbi8vIHRvIGFsbG93IGVtcHR5IGJpbmRpbmcgbmFtZXMuXG5jb25zdCBCSU5EX05BTUVfUkVHRVhQID1cbiAgICAvXig/Oig/Oig/OihiaW5kLSl8KGxldC0pfChyZWYtfCMpfChvbi0pfChiaW5kb24tKXwoQCkpKC4qKSl8XFxbXFwoKFteXFwpXSopXFwpXFxdfFxcWyhbXlxcXV0qKVxcXXxcXCgoW15cXCldKilcXCkpJC87XG5lbnVtIEFUVFIge1xuICAvLyBHcm91cCAxID0gXCJiaW5kLVwiXG4gIEtXX0JJTkRfSURYID0gMSxcbiAgLy8gR3JvdXAgMiA9IFwibGV0LVwiXG4gIEtXX0xFVF9JRFggPSAyLFxuICAvLyBHcm91cCAzID0gXCJyZWYtLyNcIlxuICBLV19SRUZfSURYID0gMyxcbiAgLy8gR3JvdXAgNCA9IFwib24tXCJcbiAgS1dfT05fSURYID0gNCxcbiAgLy8gR3JvdXAgNSA9IFwiYmluZG9uLVwiXG4gIEtXX0JJTkRPTl9JRFggPSA1LFxuICAvLyBHcm91cCA2ID0gXCJAXCJcbiAgS1dfQVRfSURYID0gNixcbiAgLy8gR3JvdXAgNyA9IHRoZSBpZGVudGlmaWVyIGFmdGVyIFwiYmluZC1cIiwgXCJsZXQtXCIsIFwicmVmLS8jXCIsIFwib24tXCIsIFwiYmluZG9uLVwiIG9yIFwiQFwiXG4gIElERU5UX0tXX0lEWCA9IDcsXG4gIC8vIEdyb3VwIDggPSBpZGVudGlmaWVyIGluc2lkZSBbKCldXG4gIElERU5UX0JBTkFOQV9CT1hfSURYID0gOCxcbiAgLy8gR3JvdXAgOSA9IGlkZW50aWZpZXIgaW5zaWRlIFtdXG4gIElERU5UX1BST1BFUlRZX0lEWCA9IDksXG4gIC8vIEdyb3VwIDEwID0gaWRlbnRpZmllciBpbnNpZGUgKClcbiAgSURFTlRfRVZFTlRfSURYID0gMTAsXG59XG4vLyBNaWNyb3N5bnRheCB0ZW1wbGF0ZSBzdGFydHMgd2l0aCAnKicuIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvVGVtcGxhdGVSZWZcbmNvbnN0IFRFTVBMQVRFX0FUVFJfUFJFRklYID0gJyonO1xuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJQYXJ0KGNvZGU6IG51bWJlcikge1xuICAvLyBJZGVudGlmaWVycyBjb25zaXN0IG9mIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzLCAnXycsIG9yICckJy5cbiAgcmV0dXJuIGlzQXNjaWlMZXR0ZXIoY29kZSkgfHwgaXNEaWdpdChjb2RlKSB8fCBjb2RlID09ICQkIHx8IGNvZGUgPT0gJF87XG59XG5cbi8qKlxuICogR2V0cyB0aGUgc3BhbiBvZiB3b3JkIGluIGEgdGVtcGxhdGUgdGhhdCBzdXJyb3VuZHMgYHBvc2l0aW9uYC4gSWYgdGhlcmUgaXMgbm8gd29yZCBhcm91bmRcbiAqIGBwb3NpdGlvbmAsIG5vdGhpbmcgaXMgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kZWRXb3JkU3Bhbih0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IHRzLlRleHRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHt0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIGNvbnN0IHRlbXBsYXRlU3JjID0gdGVtcGxhdGUuc291cmNlO1xuXG4gIGlmICghdGVtcGxhdGVTcmMpIHJldHVybjtcblxuICAvLyBUT0RPKGF5YXpoYWZpeik6IEEgc29sdXRpb24gYmFzZWQgb24gd29yZCBleHBhbnNpb24gd2lsbCBhbHdheXMgYmUgZXhwZW5zaXZlIGNvbXBhcmVkIHRvIG9uZVxuICAvLyBiYXNlZCBvbiBBU1RzLiBXaGF0ZXZlciBwZW5hbHR5IHdlIGluY3VyIGlzIHByb2JhYmx5IG1hbmFnZWFibGUgZm9yIHNtYWxsLWxlbmd0aCAoaS5lLiB0aGVcbiAgLy8gbWFqb3JpdHkgb2YpIGlkZW50aWZpZXJzLCBidXQgdGhlIGN1cnJlbnQgc29sdXRpb24gaW52b2xlcyBhIG51bWJlciBvZiBicmFuY2hpbmdzIGFuZCB3ZSBjYW4ndFxuICAvLyBjb250cm9sIHBvdGVudGlhbGx5IHZlcnkgbG9uZyBpZGVudGlmaWVycy4gQ29uc2lkZXIgbW92aW5nIHRvIGFuIEFTVC1iYXNlZCBzb2x1dGlvbiBvbmNlXG4gIC8vIGV4aXN0aW5nIGRpZmZpY3VsdGllcyB3aXRoIEFTVCBzcGFucyBhcmUgbW9yZSBjbGVhcmx5IHJlc29sdmVkIChzZWUgIzMxODk4IGZvciBkaXNjdXNzaW9uIG9mXG4gIC8vIGtub3duIHByb2JsZW1zLCBhbmQgIzMzMDkxIGZvciBob3cgdGhleSBhZmZlY3QgdGV4dCByZXBsYWNlbWVudCkuXG4gIC8vXG4gIC8vIGB0ZW1wbGF0ZVBvc2l0aW9uYCByZXByZXNlbnRzIHRoZSByaWdodC1ib3VuZCBsb2NhdGlvbiBvZiBhIGN1cnNvciBpbiB0aGUgdGVtcGxhdGUuXG4gIC8vICAgIGtleS5lbnR8cnlcbiAgLy8gICAgICAgICAgIF4tLS0tIGN1cnNvciwgYXQgcG9zaXRpb24gYHJgIGlzIGF0LlxuICAvLyBBIGN1cnNvciBpcyBub3QgaXRzZWxmIGEgY2hhcmFjdGVyIGluIHRoZSB0ZW1wbGF0ZTsgaXQgaGFzIGEgbGVmdCAobG93ZXIpIGFuZCByaWdodCAodXBwZXIpXG4gIC8vIGluZGV4IGJvdW5kIHRoYXQgaHVncyB0aGUgY3Vyc29yIGl0c2VsZi5cbiAgbGV0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIC8vIFRvIHBlcmZvcm0gd29yZCBleHBhbnNpb24sIHdlIHdhbnQgdG8gZGV0ZXJtaW5lIHRoZSBsZWZ0IGFuZCByaWdodCBpbmRpY2VzIHRoYXQgaHVnIHRoZSBjdXJzb3IuXG4gIC8vIFRoZXJlIGFyZSB0aHJlZSBjYXNlcyBoZXJlLlxuICBsZXQgbGVmdCwgcmlnaHQ7XG4gIGlmICh0ZW1wbGF0ZVBvc2l0aW9uID09PSAwKSB7XG4gICAgLy8gMS4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICB8cmVzdCBvZiB0ZW1wbGF0ZVxuICAgIC8vICAgIHRoZSBjdXJzb3IgaXMgYXQgdGhlIHN0YXJ0IG9mIHRoZSB0ZW1wbGF0ZSwgaHVnZ2VkIG9ubHkgYnkgdGhlIHJpZ2h0IHNpZGUgKDAtaW5kZXgpLlxuICAgIGxlZnQgPSByaWdodCA9IDA7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVQb3NpdGlvbiA9PT0gdGVtcGxhdGVTcmMubGVuZ3RoKSB7XG4gICAgLy8gMi4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICByZXN0IG9mIHRlbXBsYXRlfFxuICAgIC8vICAgIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGVuZCBvZiB0aGUgdGVtcGxhdGUsIGh1Z2dlZCBvbmx5IGJ5IHRoZSBsZWZ0IHNpZGUgKGxhc3QtaW5kZXgpLlxuICAgIGxlZnQgPSByaWdodCA9IHRlbXBsYXRlU3JjLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSB7XG4gICAgLy8gMy4gQ2FzZSBsaWtlXG4gICAgLy8gICAgICB3b3xyZFxuICAgIC8vICAgIHRoZXJlIGlzIGEgY2xlYXIgbGVmdCBhbmQgcmlnaHQgaW5kZXguXG4gICAgbGVmdCA9IHRlbXBsYXRlUG9zaXRpb24gLSAxO1xuICAgIHJpZ2h0ID0gdGVtcGxhdGVQb3NpdGlvbjtcbiAgfVxuXG4gIGlmICghaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KGxlZnQpKSAmJlxuICAgICAgIWlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChyaWdodCkpKSB7XG4gICAgLy8gQ2FzZSBsaWtlXG4gICAgLy8gICAgICAgICAufC5cbiAgICAvLyBsZWZ0IC0tLV4gXi0tLSByaWdodFxuICAgIC8vIFRoZXJlIGlzIG5vIHdvcmQgaGVyZS5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBFeHBhbmQgb24gdGhlIGxlZnQgYW5kIHJpZ2h0IHNpZGUgdW50aWwgYSB3b3JkIGJvdW5kYXJ5IGlzIGhpdC4gQmFjayB1cCBvbmUgZXhwYW5zaW9uIG9uIGJvdGhcbiAgLy8gc2lkZSB0byBzdGF5IGluc2lkZSB0aGUgd29yZC5cbiAgd2hpbGUgKGxlZnQgPj0gMCAmJiBpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQobGVmdCkpKSAtLWxlZnQ7XG4gICsrbGVmdDtcbiAgd2hpbGUgKHJpZ2h0IDwgdGVtcGxhdGVTcmMubGVuZ3RoICYmIGlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChyaWdodCkpKSArK3JpZ2h0O1xuICAtLXJpZ2h0O1xuXG4gIGNvbnN0IGFic29sdXRlU3RhcnRQb3NpdGlvbiA9IHBvc2l0aW9uIC0gKHRlbXBsYXRlUG9zaXRpb24gLSBsZWZ0KTtcbiAgY29uc3QgbGVuZ3RoID0gcmlnaHQgLSBsZWZ0ICsgMTtcbiAgcmV0dXJuIHtzdGFydDogYWJzb2x1dGVTdGFydFBvc2l0aW9uLCBsZW5ndGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVDb21wbGV0aW9ucyhcbiAgICB0ZW1wbGF0ZUluZm86IEFzdFJlc3VsdCwgcG9zaXRpb246IG51bWJlcik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgbGV0IHJlc3VsdDogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbXTtcbiAgY29uc3Qge2h0bWxBc3QsIHRlbXBsYXRlfSA9IHRlbXBsYXRlSW5mbztcbiAgLy8gVGhlIHRlbXBsYXRlTm9kZSBzdGFydHMgYXQgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIgc28gd2UgYWRkIDEgdG8gc2tpcCBpdC5cbiAgY29uc3QgdGVtcGxhdGVQb3NpdGlvbiA9IHBvc2l0aW9uIC0gdGVtcGxhdGUuc3Bhbi5zdGFydDtcbiAgY29uc3QgcGF0aCA9IGdldFBhdGhUb05vZGVBdFBvc2l0aW9uKGh0bWxBc3QsIHRlbXBsYXRlUG9zaXRpb24pO1xuICBjb25zdCBtb3N0U3BlY2lmaWMgPSBwYXRoLnRhaWw7XG4gIGlmIChwYXRoLmVtcHR5IHx8ICFtb3N0U3BlY2lmaWMpIHtcbiAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhc3RQb3NpdGlvbiA9IHRlbXBsYXRlUG9zaXRpb24gLSBtb3N0U3BlY2lmaWMuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG4gICAgbW9zdFNwZWNpZmljLnZpc2l0KFxuICAgICAgICB7XG4gICAgICAgICAgdmlzaXRFbGVtZW50KGFzdCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRUYWdTcGFuID0gc3Bhbk9mKGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0xlbiA9IGFzdC5uYW1lLmxlbmd0aDtcbiAgICAgICAgICAgIC8vICsgMSBmb3IgdGhlIG9wZW5pbmcgYW5nbGUgYnJhY2tldFxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlUG9zaXRpb24gPD0gc3RhcnRUYWdTcGFuLnN0YXJ0ICsgdGFnTGVuICsgMSkge1xuICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgaW4gdGhlIHRhZyB0aGVuIHJldHVybiB0aGUgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPCBzdGFydFRhZ1NwYW4uZW5kKSB7XG4gICAgICAgICAgICAgIC8vIFdlIGFyZSBpbiB0aGUgYXR0cmlidXRlIHNlY3Rpb24gb2YgdGhlIGVsZW1lbnQgKGJ1dCBub3QgaW4gYW4gYXR0cmlidXRlKS5cbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBhdHRyaWJ1dGUgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudCh0ZW1wbGF0ZUluZm8sIGFzdC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0QXR0cmlidXRlKGFzdDogQXR0cmlidXRlKSB7XG4gICAgICAgICAgICAvLyBBbiBhdHRyaWJ1dGUgY29uc2lzdHMgb2YgdHdvIHBhcnRzLCBMSFM9XCJSSFNcIi5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBpZiBjb21wbGV0aW9ucyBhcmUgcmVxdWVzdGVkIGZvciBMSFMgb3IgUkhTXG4gICAgICAgICAgICBpZiAoYXN0LnZhbHVlU3BhbiAmJiBpblNwYW4odGVtcGxhdGVQb3NpdGlvbiwgc3Bhbk9mKGFzdC52YWx1ZVNwYW4pKSkge1xuICAgICAgICAgICAgICAvLyBSSFMgY29tcGxldGlvblxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBMSFMgY29tcGxldGlvblxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRUZXh0KGFzdCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgYXJlIGluIGEgZW50aXR5LlxuICAgICAgICAgICAgcmVzdWx0ID0gZW50aXR5Q29tcGxldGlvbnMoZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZSwgc3Bhbk9mKGFzdCkpLCBhc3RQb3NpdGlvbik7XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIHJlc3VsdCA9IGludGVycG9sYXRpb25Db21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHRlbXBsYXRlUG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcGF0aC5maXJzdChFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBnZXRIdG1sVGFnRGVmaW5pdGlvbihlbGVtZW50Lm5hbWUpO1xuICAgICAgICAgICAgICBpZiAoZGVmaW5pdGlvbi5jb250ZW50VHlwZSA9PT0gVGFnQ29udGVudFR5cGUuUEFSU0FCTEVfREFUQSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHZvaWRFbGVtZW50QXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBlbGVtZW50IGNhbiBob2xkIGNvbnRlbnQsIHNob3cgZWxlbWVudCBjb21wbGV0aW9ucy5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gSWYgbm8gZWxlbWVudCBjb250YWluZXIsIGltcGxpZXMgcGFyc2FibGUgZGF0YSBzbyBzaG93IGVsZW1lbnRzLlxuICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdENvbW1lbnQoKSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbigpIHt9LFxuICAgICAgICAgIHZpc2l0RXhwYW5zaW9uQ2FzZSgpIHt9XG4gICAgICAgIH0sXG4gICAgICAgIG51bGwpO1xuICB9XG5cbiAgY29uc3QgcmVwbGFjZW1lbnRTcGFuID0gZ2V0Qm91bmRlZFdvcmRTcGFuKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICByZXR1cm4gcmVzdWx0Lm1hcChlbnRyeSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZW50cnksIHJlcGxhY2VtZW50U3BhbixcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwYXRoOiBBc3RQYXRoPEh0bWxBc3Q+KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCBhdHRyID0gcGF0aC50YWlsO1xuICBjb25zdCBlbGVtID0gcGF0aC5wYXJlbnRPZihhdHRyKTtcbiAgaWYgKCEoYXR0ciBpbnN0YW5jZW9mIEF0dHJpYnV0ZSkgfHwgIShlbGVtIGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvLyBUT0RPOiBDb25zaWRlciBwYXJzaW5nIHRoZSBhdHRyaW51dGUgbmFtZSB0byBhIHByb3BlciBBU1QgaW5zdGVhZCBvZlxuICAvLyBtYXRjaGluZyB1c2luZyByZWdleC4gVGhpcyBpcyBiZWNhdXNlIHRoZSByZWdleHAgd291bGQgaW5jb3JyZWN0bHkgaWRlbnRpZnlcbiAgLy8gYmluZCBwYXJ0cyBmb3IgY2FzZXMgbGlrZSBbKCl8XVxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF4gY3Vyc29yIGlzIGhlcmVcbiAgY29uc3QgYmluZFBhcnRzID0gYXR0ci5uYW1lLm1hdGNoKEJJTkRfTkFNRV9SRUdFWFApO1xuICBjb25zdCBpc1RlbXBsYXRlUmVmID0gYXR0ci5uYW1lLnN0YXJ0c1dpdGgoVEVNUExBVEVfQVRUUl9QUkVGSVgpO1xuICBjb25zdCBpc0JpbmRpbmcgPSBiaW5kUGFydHMgIT09IG51bGwgfHwgaXNUZW1wbGF0ZVJlZjtcblxuICBpZiAoIWlzQmluZGluZykge1xuICAgIHJldHVybiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoaW5mbywgZWxlbS5uYW1lKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IG5nQXR0cnMgPSBhbmd1bGFyQXR0cmlidXRlcyhpbmZvLCBlbGVtLm5hbWUpO1xuICBpZiAoIWJpbmRQYXJ0cykge1xuICAgIC8vIElmIGJpbmRQYXJ0cyBpcyBudWxsIHRoZW4gdGhpcyBtdXN0IGJlIGEgVGVtcGxhdGVSZWYuXG4gICAgcmVzdWx0cy5wdXNoKC4uLm5nQXR0cnMudGVtcGxhdGVSZWZzKTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGJpbmRQYXJ0c1tBVFRSLktXX0JJTkRfSURYXSAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICBiaW5kUGFydHNbQVRUUi5JREVOVF9QUk9QRVJUWV9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBwcm9wZXJ0eSBiaW5kaW5nIHZpYSBiaW5kLSBvciBbXVxuICAgIHJlc3VsdHMucHVzaCguLi5wcm9wZXJ0eU5hbWVzKGVsZW0ubmFtZSksIC4uLm5nQXR0cnMuaW5wdXRzKTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGJpbmRQYXJ0c1tBVFRSLktXX09OX0lEWF0gIT09IHVuZGVmaW5lZCB8fCBiaW5kUGFydHNbQVRUUi5JREVOVF9FVkVOVF9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBldmVudCBiaW5kaW5nIHZpYSBvbi0gb3IgKClcbiAgICByZXN1bHRzLnB1c2goLi4uZXZlbnROYW1lcyhlbGVtLm5hbWUpLCAuLi5uZ0F0dHJzLm91dHB1dHMpO1xuICB9IGVsc2UgaWYgKFxuICAgICAgYmluZFBhcnRzW0FUVFIuS1dfQklORE9OX0lEWF0gIT09IHVuZGVmaW5lZCB8fFxuICAgICAgYmluZFBhcnRzW0FUVFIuSURFTlRfQkFOQU5BX0JPWF9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBiYW5hbmEtaW4tYS1ib3ggYmluZGluZyB2aWEgYmluZG9uLSBvciBbKCldXG4gICAgcmVzdWx0cy5wdXNoKC4uLm5nQXR0cnMuYmFuYW5hcyk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChcbiAgICBpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBhdHRyaWJ1dGVzIGNvbXBsZXRpb24gb25seSBmb3IgaW5saW5lIHRlbXBsYXRlc1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyaWJ1dGVOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkhUTUxfQVRUUklCVVRFLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCBBbmd1bGFyIGF0dHJpYnV0ZXNcbiAgY29uc3QgbmdBdHRycyA9IGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW1lbnROYW1lKTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIG5nQXR0cnMub3RoZXJzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFByb3ZpZGUgY29tcGxldGlvbnMgdG8gdGhlIFJIUyBvZiBhbiBhdHRyaWJ1dGUsIHdoaWNoIGlzIG9mIHRoZSBmb3JtXG4gKiBMSFM9XCJSSFNcIi4gVGhlIHRlbXBsYXRlIHBhdGggaXMgY29tcHV0ZWQgZnJvbSB0aGUgc3BlY2lmaWVkIGBpbmZvYCB3aGVyZWFzXG4gKiB0aGUgY29udGV4dCBpcyBkZXRlcm1pbmVkIGZyb20gdGhlIHNwZWNpZmllZCBgaHRtbFBhdGhgLlxuICogQHBhcmFtIGluZm8gT2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIGh0bWxQYXRoIFBhdGggdG8gdGhlIEhUTUwgbm9kZVxuICovXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgaHRtbFBhdGg6IEh0bWxBc3RQYXRoKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIFRlbXBsYXRlIEFTVCBwYXRoLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBodG1sUGF0aC5wb3NpdGlvbik7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgaHRtbFBhdGgucG9zaXRpb24sICgpID0+IHtcbiAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICByZXR1cm4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB0ZW1wbGF0ZVBhdGgpO1xuICB9KTtcbiAgaWYgKHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQXR0ckFzdCB8fFxuICAgICAgdGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCB8fFxuICAgICAgdGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBCb3VuZEV2ZW50QXN0KSB7XG4gICAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gICAgcmV0dXJuIHZpc2l0b3IucmVzdWx0cztcbiAgfVxuICAvLyBJbiBvcmRlciB0byBwcm92aWRlIGFjY3VyYXRlIGF0dHJpYnV0ZSB2YWx1ZSBjb21wbGV0aW9uLCB3ZSBuZWVkIHRvIGtub3dcbiAgLy8gd2hhdCB0aGUgTEhTIGlzLCBhbmQgY29uc3RydWN0IHRoZSBwcm9wZXIgQVNUIGlmIGl0IGlzIG1pc3NpbmcuXG4gIGNvbnN0IGh0bWxBdHRyID0gaHRtbFBhdGgudGFpbCBhcyBBdHRyaWJ1dGU7XG4gIGNvbnN0IGJpbmRQYXJ0cyA9IGh0bWxBdHRyLm5hbWUubWF0Y2goQklORF9OQU1FX1JFR0VYUCk7XG4gIGlmIChiaW5kUGFydHMgJiYgYmluZFBhcnRzW0FUVFIuS1dfUkVGX0lEWF0gIT09IHVuZGVmaW5lZCkge1xuICAgIGxldCByZWZBc3Q6IFJlZmVyZW5jZUFzdHx1bmRlZmluZWQ7XG4gICAgbGV0IGVsZW1Bc3Q6IEVsZW1lbnRBc3R8dW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIFJlZmVyZW5jZUFzdCkge1xuICAgICAgcmVmQXN0ID0gdGVtcGxhdGVQYXRoLnRhaWw7XG4gICAgICBjb25zdCBwYXJlbnQgPSB0ZW1wbGF0ZVBhdGgucGFyZW50T2YocmVmQXN0KTtcbiAgICAgIGlmIChwYXJlbnQgaW5zdGFuY2VvZiBFbGVtZW50QXN0KSB7XG4gICAgICAgIGVsZW1Bc3QgPSBwYXJlbnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEVsZW1lbnRBc3QpIHtcbiAgICAgIHJlZkFzdCA9IG5ldyBSZWZlcmVuY2VBc3QoaHRtbEF0dHIubmFtZSwgbnVsbCAhLCBodG1sQXR0ci52YWx1ZSwgaHRtbEF0dHIudmFsdWVTcGFuICEpO1xuICAgICAgZWxlbUFzdCA9IHRlbXBsYXRlUGF0aC50YWlsO1xuICAgIH1cbiAgICBpZiAocmVmQXN0ICYmIGVsZW1Bc3QpIHtcbiAgICAgIHJlZkFzdC52aXNpdCh2aXNpdG9yLCBlbGVtQXN0KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSHRtbEFzdCBjb250YWlucyB0aGUgYEF0dHJpYnV0ZWAgbm9kZSwgaG93ZXZlciB0aGUgY29ycmVzcG9uZGluZyBgQXR0ckFzdGBcbiAgICAvLyBub2RlIGlzIG1pc3NpbmcgZnJvbSB0aGUgVGVtcGxhdGVBc3QuXG4gICAgY29uc3QgYXR0ckFzdCA9IG5ldyBBdHRyQXN0KGh0bWxBdHRyLm5hbWUsIGh0bWxBdHRyLnZhbHVlLCBodG1sQXR0ci52YWx1ZVNwYW4gISk7XG4gICAgYXR0ckFzdC52aXNpdCh2aXNpdG9yLCBudWxsKTtcbiAgfVxuICByZXR1cm4gdmlzaXRvci5yZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBlbGVtZW50Q29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0KTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICBjb25zdCByZXN1bHRzOiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFsuLi5BTkdVTEFSX0VMRU1FTlRTXTtcblxuICBpZiAoaW5mby50ZW1wbGF0ZSBpbnN0YW5jZW9mIElubGluZVRlbXBsYXRlKSB7XG4gICAgLy8gUHJvdmlkZSBIVE1MIGVsZW1lbnRzIGNvbXBsZXRpb24gb25seSBmb3IgaW5saW5lIHRlbXBsYXRlc1xuICAgIHJlc3VsdHMucHVzaCguLi5IVE1MX0VMRU1FTlRTKTtcbiAgfVxuXG4gIC8vIENvbGxlY3QgdGhlIGVsZW1lbnRzIHJlZmVyZW5jZWQgYnkgdGhlIHNlbGVjdG9yc1xuICBjb25zdCBjb21wb25lbnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2YgZ2V0U2VsZWN0b3JzKGluZm8pLnNlbGVjdG9ycykge1xuICAgIGNvbnN0IG5hbWUgPSBzZWxlY3Rvci5lbGVtZW50O1xuICAgIGlmIChuYW1lICYmICFjb21wb25lbnRzLmhhcyhuYW1lKSkge1xuICAgICAgY29tcG9uZW50cy5hZGQobmFtZSk7XG4gICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5DT01QT05FTlQsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGVudGl0eUNvbXBsZXRpb25zKHZhbHVlOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGVudGl0eSBjb21wbGV0aW9uc1xuICBjb25zdCByZSA9IC8mW0EtWmEtel0qOz8oPyFcXGQpL2c7XG4gIGxldCBmb3VuZDogUmVnRXhwRXhlY0FycmF5fG51bGw7XG4gIGxldCByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIHdoaWxlIChmb3VuZCA9IHJlLmV4ZWModmFsdWUpKSB7XG4gICAgbGV0IGxlbiA9IGZvdW5kWzBdLmxlbmd0aDtcbiAgICBpZiAocG9zaXRpb24gPj0gZm91bmQuaW5kZXggJiYgcG9zaXRpb24gPCAoZm91bmQuaW5kZXggKyBsZW4pKSB7XG4gICAgICByZXN1bHQgPSBPYmplY3Qua2V5cyhOQU1FRF9FTlRJVElFUykubWFwKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5hbWU6IGAmJHtuYW1lfTtgLFxuICAgICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkVOVElUWSxcbiAgICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGludGVycG9sYXRpb25Db21wbGV0aW9ucyhpbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIC8vIExvb2sgZm9yIGFuIGludGVycG9sYXRpb24gaW4gYXQgdGhlIHBvc2l0aW9uLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBwb3NpdGlvbik7XG4gIGlmICghdGVtcGxhdGVQYXRoLnRhaWwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBFeHByZXNzaW9uVmlzaXRvcihcbiAgICAgIGluZm8sIHBvc2l0aW9uLCAoKSA9PiBnZXRFeHByZXNzaW9uU2NvcGUoZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvKGluZm8pLCB0ZW1wbGF0ZVBhdGgpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBsZXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIG5nLkNvbXBsZXRpb25FbnRyeT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gbmcuU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IHJlc3VsdHMoKTogbmcuQ29tcGxldGlvbkVudHJ5W10geyByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbXBsZXRpb25zLnZhbHVlcygpKTsgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KCk6IHZvaWQge1xuICAgIC8vIG5vLW9wIGZvciBub3dcbiAgfVxuXG4gIHZpc2l0QXR0cihhc3Q6IEF0dHJBc3QpIHtcbiAgICBpZiAoYXN0Lm5hbWUuc3RhcnRzV2l0aChURU1QTEFURV9BVFRSX1BSRUZJWCkpIHtcbiAgICAgIC8vIFRoaXMgYSB0ZW1wbGF0ZSBiaW5kaW5nIGdpdmVuIGJ5IG1pY3JvIHN5bnRheCBleHByZXNzaW9uLlxuICAgICAgLy8gRmlyc3QsIHZlcmlmeSB0aGUgYXR0cmlidXRlIGNvbnNpc3RzIG9mIHNvbWUgYmluZGluZyB3ZSBjYW4gZ2l2ZSBjb21wbGV0aW9ucyBmb3IuXG4gICAgICAvLyBUaGUgc291cmNlU3BhbiBvZiBBdHRyQXN0IHBvaW50cyB0byB0aGUgUkhTIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAgIGNvbnN0IHRlbXBsYXRlS2V5ID0gYXN0Lm5hbWUuc3Vic3RyaW5nKFRFTVBMQVRFX0FUVFJfUFJFRklYLmxlbmd0aCk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVZhbHVlID0gYXN0LnNvdXJjZVNwYW4udG9TdHJpbmcoKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQuZmlsZS51cmw7XG4gICAgICAvLyBUT0RPKGt5bGlhdSk6IFdlIGFyZSB1bmFibGUgdG8gZGV0ZXJtaW5lIHRoZSBhYnNvbHV0ZSBvZmZzZXQgb2YgdGhlIGtleVxuICAgICAgLy8gYnV0IGl0IGlzIG9rYXkgaGVyZSwgYmVjYXVzZSB3ZSBhcmUgb25seSBsb29raW5nIGF0IHRoZSBSSFMgb2YgdGhlIGF0dHJcbiAgICAgIGNvbnN0IGFic0tleU9mZnNldCA9IDA7XG4gICAgICBjb25zdCBhYnNWYWx1ZU9mZnNldCA9IGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IHt0ZW1wbGF0ZUJpbmRpbmdzfSA9IHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlVGVtcGxhdGVCaW5kaW5ncyhcbiAgICAgICAgICB0ZW1wbGF0ZUtleSwgdGVtcGxhdGVWYWx1ZSwgdGVtcGxhdGVVcmwsIGFic0tleU9mZnNldCwgYWJzVmFsdWVPZmZzZXQpO1xuICAgICAgLy8gRmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IGJpbmRpbmcgPSB0ZW1wbGF0ZUJpbmRpbmdzLmZpbmQoYiA9PiBpblNwYW4odGhpcy5wb3NpdGlvbiwgYi5zb3VyY2VTcGFuKSk7XG5cbiAgICAgIGlmICghYmluZGluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMubWljcm9TeW50YXhJbkF0dHJpYnV0ZVZhbHVlKGFzdCwgYmluZGluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25Bc3QgPSB0aGlzLmluZm8uZXhwcmVzc2lvblBhcnNlci5wYXJzZUJpbmRpbmcoXG4gICAgICAgICAgYXN0LnZhbHVlLCBhc3Quc291cmNlU3Bhbi50b1N0cmluZygpLCBhc3Quc291cmNlU3Bhbi5zdGFydC5vZmZzZXQpO1xuICAgICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGV4cHJlc3Npb25Bc3QpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0UmVmZXJlbmNlKF9hc3Q6IFJlZmVyZW5jZUFzdCwgY29udGV4dDogRWxlbWVudEFzdCkge1xuICAgIGNvbnRleHQuZGlyZWN0aXZlcy5mb3JFYWNoKGRpciA9PiB7XG4gICAgICBjb25zdCB7ZXhwb3J0QXN9ID0gZGlyLmRpcmVjdGl2ZTtcbiAgICAgIGlmIChleHBvcnRBcykge1xuICAgICAgICB0aGlzLmNvbXBsZXRpb25zLnNldChcbiAgICAgICAgICAgIGV4cG9ydEFzLCB7bmFtZTogZXhwb3J0QXMsIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLlJFRkVSRU5DRSwgc29ydFRleHQ6IGV4cG9ydEFzfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2aXNpdEJvdW5kVGV4dChhc3Q6IEJvdW5kVGV4dEFzdCkge1xuICAgIGlmIChpblNwYW4odGhpcy5wb3NpdGlvbiwgYXN0LnZhbHVlLnNvdXJjZVNwYW4pKSB7XG4gICAgICBjb25zdCBjb21wbGV0aW9ucyA9IGdldEV4cHJlc3Npb25Db21wbGV0aW9ucyhcbiAgICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCBhc3QudmFsdWUsIHRoaXMucG9zaXRpb24sIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeSk7XG4gICAgICBpZiAoY29tcGxldGlvbnMpIHtcbiAgICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhjb21wbGV0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKHZhbHVlOiBBU1QpIHtcbiAgICBjb25zdCBzeW1ib2xzID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICB0aGlzLmdldEV4cHJlc3Npb25TY29wZSgpLCB2YWx1ZSwgdGhpcy5wb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICBpZiAoc3ltYm9scykge1xuICAgICAgdGhpcy5hZGRTeW1ib2xzVG9Db21wbGV0aW9ucyhzeW1ib2xzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHM6IG5nLlN5bWJvbFtdKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIHN5bWJvbHMpIHtcbiAgICAgIGlmIChzLm5hbWUuc3RhcnRzV2l0aCgnX18nKSB8fCAhcy5wdWJsaWMgfHwgdGhpcy5jb21wbGV0aW9ucy5oYXMocy5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHBpcGUgbWV0aG9kIHNob3VsZCBub3QgaW5jbHVkZSBwYXJlbnRoZXNlcy5cbiAgICAgIC8vIGUuZy4ge3sgdmFsdWVfZXhwcmVzc2lvbiB8IHNsaWNlIDogc3RhcnQgWyA6IGVuZCBdIH19XG4gICAgICBjb25zdCBzaG91bGRJbnNlcnRQYXJlbnRoZXNlcyA9IHMuY2FsbGFibGUgJiYgcy5raW5kICE9PSBuZy5Db21wbGV0aW9uS2luZC5QSVBFO1xuICAgICAgdGhpcy5jb21wbGV0aW9ucy5zZXQocy5uYW1lLCB7XG4gICAgICAgIG5hbWU6IHMubmFtZSxcbiAgICAgICAga2luZDogcy5raW5kIGFzIG5nLkNvbXBsZXRpb25LaW5kLFxuICAgICAgICBzb3J0VGV4dDogcy5uYW1lLFxuICAgICAgICBpbnNlcnRUZXh0OiBzaG91bGRJbnNlcnRQYXJlbnRoZXNlcyA/IGAke3MubmFtZX0oKWAgOiBzLm5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaGFuZGxlcyB0aGUgY29tcGxldGlvbnMgb2YgYXR0cmlidXRlIHZhbHVlcyBmb3IgZGlyZWN0aXZlcyB0aGF0XG4gICAqIHN1cHBvcnQgdGhlIG1pY3Jvc3ludGF4IGZvcm1hdC4gRXhhbXBsZXMgYXJlICpuZ0ZvciBhbmQgKm5nSWYuXG4gICAqIFRoZXNlIGRpcmVjdGl2ZXMgYWxsb3dzIGRlY2xhcmF0aW9uIG9mIFwibGV0XCIgdmFyaWFibGVzLCBhZGRzIGNvbnRleHQtc3BlY2lmaWNcbiAgICogc3ltYm9scyBsaWtlICRpbXBsaWNpdCwgaW5kZXgsIGNvdW50LCBhbW9uZyBvdGhlciBiZWhhdmlvcnMuXG4gICAqIEZvciBhIGNvbXBsZXRlIGRlc2NyaXB0aW9uIG9mIHN1Y2ggZm9ybWF0LCBzZWVcbiAgICogaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3N0cnVjdHVyYWwtZGlyZWN0aXZlcyN0aGUtYXN0ZXJpc2stLXByZWZpeFxuICAgKlxuICAgKiBAcGFyYW0gYXR0ciBkZXNjcmlwdG9yIGZvciBhdHRyaWJ1dGUgbmFtZSBhbmQgdmFsdWUgcGFpclxuICAgKiBAcGFyYW0gYmluZGluZyB0ZW1wbGF0ZSBiaW5kaW5nIGZvciB0aGUgZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlXG4gICAqL1xuICBwcml2YXRlIG1pY3JvU3ludGF4SW5BdHRyaWJ1dGVWYWx1ZShhdHRyOiBBdHRyQXN0LCBiaW5kaW5nOiBUZW1wbGF0ZUJpbmRpbmcpIHtcbiAgICBjb25zdCBrZXkgPSBhdHRyLm5hbWUuc3Vic3RyaW5nKDEpOyAgLy8gcmVtb3ZlIGxlYWRpbmcgYXN0ZXJpc2tcblxuICAgIC8vIEZpbmQgdGhlIHNlbGVjdG9yIC0gZWcgbmdGb3IsIG5nSWYsIGV0Y1xuICAgIGNvbnN0IHNlbGVjdG9ySW5mbyA9IGdldFNlbGVjdG9ycyh0aGlzLmluZm8pO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gc2VsZWN0b3JJbmZvLnNlbGVjdG9ycy5maW5kKHMgPT4ge1xuICAgICAgLy8gYXR0cmlidXRlcyBhcmUgbGlzdGVkIGluIChhdHRyaWJ1dGUsIHZhbHVlKSBwYWlyc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzLmF0dHJzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIGlmIChzLmF0dHJzW2ldID09PSBrZXkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gLSBhdHRyLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuXG4gICAgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBWYXJpYWJsZUJpbmRpbmcpIHtcbiAgICAgIC8vIFRPRE8oa3lsaWF1KTogV2l0aCBleHByZXNzaW9uIHNvdXJjZVNwYW4gd2Ugc2hvdWxkbid0IGhhdmUgdG8gc2VhcmNoXG4gICAgICAvLyB0aGUgYXR0cmlidXRlIHZhbHVlIHN0cmluZyBhbnltb3JlLiBKdXN0IGNoZWNrIGlmIHBvc2l0aW9uIGlzIGluIHRoZVxuICAgICAgLy8gZXhwcmVzc2lvbiBzb3VyY2Ugc3Bhbi5cbiAgICAgIGNvbnN0IGVxdWFsTG9jYXRpb24gPSBhdHRyLnZhbHVlLmluZGV4T2YoJz0nKTtcbiAgICAgIGlmIChlcXVhbExvY2F0aW9uID4gMCAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPiBlcXVhbExvY2F0aW9uKSB7XG4gICAgICAgIC8vIFdlIGFyZSBhZnRlciB0aGUgJz0nIGluIGEgbGV0IGNsYXVzZS4gVGhlIHZhbGlkIHZhbHVlcyBoZXJlIGFyZSB0aGUgbWVtYmVycyBvZiB0aGVcbiAgICAgICAgLy8gdGVtcGxhdGUgcmVmZXJlbmNlJ3MgdHlwZSBwYXJhbWV0ZXIuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZU1ldGFkYXRhID0gc2VsZWN0b3JJbmZvLm1hcC5nZXQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEpIHtcbiAgICAgICAgICBjb25zdCBjb250ZXh0VGFibGUgPVxuICAgICAgICAgICAgICB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkuZ2V0VGVtcGxhdGVDb250ZXh0KGRpcmVjdGl2ZU1ldGFkYXRhLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgICAgICBpZiAoY29udGV4dFRhYmxlKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGFkZHMgc3ltYm9scyBsaWtlICRpbXBsaWNpdCwgaW5kZXgsIGNvdW50LCBldGMuXG4gICAgICAgICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbnRleHRUYWJsZS52YWx1ZXMoKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcudmFsdWU/LmFzdC5zcGFuKSkge1xuICAgICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGJpbmRpbmcudmFsdWUgIS5hc3QpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBleHByZXNzaW9uIGlzIGluY29tcGxldGUsIGZvciBleGFtcGxlICpuZ0Zvcj1cImxldCB4IG9mIHxcIlxuICAgIC8vIGJpbmRpbmcuZXhwcmVzc2lvbiBpcyBudWxsLiBXZSBjb3VsZCBzdGlsbCB0cnkgdG8gcHJvdmlkZSBzdWdnZXN0aW9uc1xuICAgIC8vIGJ5IGxvb2tpbmcgZm9yIHN5bWJvbHMgdGhhdCBhcmUgaW4gc2NvcGUuXG4gICAgY29uc3QgS1dfT0YgPSAnIG9mICc7XG4gICAgY29uc3Qgb2ZMb2NhdGlvbiA9IGF0dHIudmFsdWUuaW5kZXhPZihLV19PRik7XG4gICAgaWYgKG9mTG9jYXRpb24gPiAwICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+PSBvZkxvY2F0aW9uICsgS1dfT0YubGVuZ3RoKSB7XG4gICAgICBjb25zdCBleHByZXNzaW9uQXN0ID0gdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VCaW5kaW5nKFxuICAgICAgICAgIGF0dHIudmFsdWUsIGF0dHIuc291cmNlU3Bhbi50b1N0cmluZygpLCBhdHRyLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KTtcbiAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhleHByZXNzaW9uQXN0KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U291cmNlVGV4dCh0ZW1wbGF0ZTogbmcuVGVtcGxhdGVTb3VyY2UsIHNwYW46IG5nLlNwYW4pOiBzdHJpbmcge1xuICByZXR1cm4gdGVtcGxhdGUuc291cmNlLnN1YnN0cmluZyhzcGFuLnN0YXJ0LCBzcGFuLmVuZCk7XG59XG5cbmludGVyZmFjZSBBbmd1bGFyQXR0cmlidXRlcyB7XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHRoYXQgc3VwcG9ydCB0aGUgKiBzeW50YXguIFNlZSBodHRwczovL2FuZ3VsYXIuaW8vYXBpL2NvcmUvVGVtcGxhdGVSZWZcbiAgICovXG4gIHRlbXBsYXRlUmVmczogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHdpdGggdGhlIEBJbnB1dCBhbm5vdGF0aW9uLlxuICAgKi9cbiAgaW5wdXRzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEF0dHJpYnV0ZXMgd2l0aCB0aGUgQE91dHB1dCBhbm5vdGF0aW9uLlxuICAgKi9cbiAgb3V0cHV0czogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHRoYXQgc3VwcG9ydCB0aGUgWygpXSBvciBiaW5kb24tIHN5bnRheC5cbiAgICovXG4gIGJhbmFuYXM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogR2VuZXJhbCBhdHRyaWJ1dGVzIHRoYXQgbWF0Y2ggdGhlIHNwZWNpZmllZCBlbGVtZW50LlxuICAgKi9cbiAgb3RoZXJzOiBTZXQ8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYWxsIEFuZ3VsYXItc3BlY2lmaWMgYXR0cmlidXRlcyBmb3IgdGhlIGVsZW1lbnQgd2l0aCBgZWxlbWVudE5hbWVgLlxuICogQHBhcmFtIGluZm9cbiAqIEBwYXJhbSBlbGVtZW50TmFtZVxuICovXG5mdW5jdGlvbiBhbmd1bGFyQXR0cmlidXRlcyhpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBBbmd1bGFyQXR0cmlidXRlcyB7XG4gIGNvbnN0IHtzZWxlY3RvcnMsIG1hcDogc2VsZWN0b3JNYXB9ID0gZ2V0U2VsZWN0b3JzKGluZm8pO1xuICBjb25zdCB0ZW1wbGF0ZVJlZnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgaW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IG91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgYmFuYW5hcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdGhlcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBzZWxlY3RvcnMpIHtcbiAgICBpZiAoc2VsZWN0b3IuZWxlbWVudCAmJiBzZWxlY3Rvci5lbGVtZW50ICE9PSBlbGVtZW50TmFtZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHN1bW1hcnkgPSBzZWxlY3Rvck1hcC5nZXQoc2VsZWN0b3IpICE7XG4gICAgY29uc3QgaGFzVGVtcGxhdGVSZWYgPSBpc1N0cnVjdHVyYWxEaXJlY3RpdmUoc3VtbWFyeS50eXBlKTtcbiAgICAvLyBhdHRyaWJ1dGVzIGFyZSBsaXN0ZWQgaW4gKGF0dHJpYnV0ZSwgdmFsdWUpIHBhaXJzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Rvci5hdHRycy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgY29uc3QgYXR0ciA9IHNlbGVjdG9yLmF0dHJzW2ldO1xuICAgICAgaWYgKGhhc1RlbXBsYXRlUmVmKSB7XG4gICAgICAgIHRlbXBsYXRlUmVmcy5hZGQoYXR0cik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdGhlcnMuYWRkKGF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5pbnB1dHMpKSB7XG4gICAgICBpbnB1dHMuYWRkKGlucHV0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgT2JqZWN0LnZhbHVlcyhzdW1tYXJ5Lm91dHB1dHMpKSB7XG4gICAgICBvdXRwdXRzLmFkZChvdXRwdXQpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5wdXRzKSB7XG4gICAgLy8gQWRkIGJhbmFuYS1pbi1hLWJveCBzeW50YXhcbiAgICAvLyBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtc3ludGF4I3R3by13YXktYmluZGluZy1cbiAgICBpZiAob3V0cHV0cy5oYXMoYCR7bmFtZX1DaGFuZ2VgKSkge1xuICAgICAgYmFuYW5hcy5hZGQobmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7dGVtcGxhdGVSZWZzLCBpbnB1dHMsIG91dHB1dHMsIGJhbmFuYXMsIG90aGVyc307XG59XG4iXX0=