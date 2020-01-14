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
        // TemplateRef starts with '*'. See https://angular.io/api/core/TemplateRef
        var isTemplateRef = attr.name.startsWith('*');
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
            return expression_diagnostics_1.getExpressionScope(dinfo, templatePath, false);
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
            if (ast.name.startsWith('*')) {
                // This a template binding given by micro syntax expression.
                // First, verify the attribute consists of some binding we can give completions for.
                var templateBindings = this.info.expressionParser.parseTemplateBindings(ast.name, ast.value, ast.sourceSpan.toString(), ast.sourceSpan.start.offset).templateBindings;
                // Find where the cursor is relative to the start of the attribute value.
                var valueRelativePosition_1 = this.position - ast.sourceSpan.start.offset;
                // Find the template binding that contains the position.
                var binding = templateBindings.find(function (b) { return utils_1.inSpan(valueRelativePosition_1, b.span); });
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
            if (binding.keyIsVar) {
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
            if (binding.expression && utils_1.inSpan(valueRelativePosition, binding.expression.ast.span)) {
                this.processExpressionCompletions(binding.expression.ast);
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
                var isTemplateRef = utils_1.hasTemplateReference(summary.type);
                // attributes are listed in (attribute, value) pairs
                for (var i = 0; i < selector.attrs.length; i += 2) {
                    var attr = selector.attrs[i];
                    if (isTemplateRef) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9jb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdVQ7SUFDdlQscURBQTJFO0lBRzNFLCtGQUE0RDtJQUM1RCx5RUFBdUQ7SUFDdkQscUVBQW9GO0lBQ3BGLG1FQUEwQztJQUMxQyx3REFBOEI7SUFDOUIsNkRBQXVKO0lBRXZKLElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckYsSUFBTSxhQUFhLEdBQ2Ysd0JBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtRQUNyRSxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWTtZQUNwQyxRQUFRLEVBQUUsSUFBSTtTQUNmLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUNQLElBQU0sZ0JBQWdCLEdBQXNDO1FBQzFEO1lBQ0UsSUFBSSxFQUFFLGNBQWM7WUFDcEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsY0FBYztTQUN6QjtRQUNEO1lBQ0UsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZTtZQUN2QyxRQUFRLEVBQUUsWUFBWTtTQUN2QjtRQUNEO1lBQ0Us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QkFBRTt3QkFBOUMsSUFBTSxLQUFLLFdBQUE7d0JBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDbkI7Ozs7Ozs7Ozs7b0JBQ0QsS0FBcUIsSUFBQSxvQkFBQSxpQkFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQSxDQUFBLGdCQUFBLDRCQUFFO3dCQUFoRCxJQUFNLE1BQU0sV0FBQTt3QkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUNyQjs7Ozs7Ozs7O2FBQ0Y7Ozs7Ozs7Ozs7WUFDRCxLQUFtQixJQUFBLFdBQUEsaUJBQUEsTUFBTSxDQUFBLDhCQUFBLGtEQUFFO2dCQUF0QixJQUFNLE1BQUksbUJBQUE7Z0JBQ2IsNkJBQTZCO2dCQUM3Qiw0REFBNEQ7Z0JBQzVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBSSxNQUFJLFdBQVEsQ0FBQyxFQUFFO29CQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQUksQ0FBQyxDQUFDO2lCQUNuQjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLEVBQUMsWUFBWSxjQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUMsQ0FBQztJQUMxRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0UGF0aCwgQXR0ckFzdCwgQXR0cmlidXRlLCBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LCBCb3VuZEVsZW1lbnRQcm9wZXJ0eUFzdCwgQm91bmRFdmVudEFzdCwgQm91bmRUZXh0QXN0LCBFbGVtZW50LCBFbGVtZW50QXN0LCBIdG1sQXN0UGF0aCwgTkFNRURfRU5USVRJRVMsIE5vZGUgYXMgSHRtbEFzdCwgTnVsbFRlbXBsYXRlVmlzaXRvciwgUmVmZXJlbmNlQXN0LCBUYWdDb250ZW50VHlwZSwgVGVtcGxhdGVCaW5kaW5nLCBUZXh0LCBnZXRIdG1sVGFnRGVmaW5pdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHskJCwgJF8sIGlzQXNjaWlMZXR0ZXIsIGlzRGlnaXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jaGFycyc7XG5cbmltcG9ydCB7QXN0UmVzdWx0fSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge2dldEV4cHJlc3Npb25TY29wZX0gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zfSBmcm9tICcuL2V4cHJlc3Npb25zJztcbmltcG9ydCB7YXR0cmlidXRlTmFtZXMsIGVsZW1lbnROYW1lcywgZXZlbnROYW1lcywgcHJvcGVydHlOYW1lc30gZnJvbSAnLi9odG1sX2luZm8nO1xuaW1wb3J0IHtJbmxpbmVUZW1wbGF0ZX0gZnJvbSAnLi90ZW1wbGF0ZSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7ZGlhZ25vc3RpY0luZm9Gcm9tVGVtcGxhdGVJbmZvLCBmaW5kVGVtcGxhdGVBc3RBdCwgZ2V0UGF0aFRvTm9kZUF0UG9zaXRpb24sIGdldFNlbGVjdG9ycywgaGFzVGVtcGxhdGVSZWZlcmVuY2UsIGluU3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgSElEREVOX0hUTUxfRUxFTUVOVFM6IFJlYWRvbmx5U2V0PHN0cmluZz4gPVxuICAgIG5ldyBTZXQoWydodG1sJywgJ3NjcmlwdCcsICdub3NjcmlwdCcsICdiYXNlJywgJ2JvZHknLCAndGl0bGUnLCAnaGVhZCcsICdsaW5rJ10pO1xuY29uc3QgSFRNTF9FTEVNRU5UUzogUmVhZG9ubHlBcnJheTxuZy5Db21wbGV0aW9uRW50cnk+ID1cbiAgICBlbGVtZW50TmFtZXMoKS5maWx0ZXIobmFtZSA9PiAhSElEREVOX0hUTUxfRUxFTUVOVFMuaGFzKG5hbWUpKS5tYXAobmFtZSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5IVE1MX0VMRU1FTlQsXG4gICAgICAgIHNvcnRUZXh0OiBuYW1lLFxuICAgICAgfTtcbiAgICB9KTtcbmNvbnN0IEFOR1VMQVJfRUxFTUVOVFM6IFJlYWRvbmx5QXJyYXk8bmcuQ29tcGxldGlvbkVudHJ5PiA9IFtcbiAge1xuICAgIG5hbWU6ICduZy1jb250YWluZXInLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLWNvbnRhaW5lcicsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctY29udGVudCcsXG4gICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQU5HVUxBUl9FTEVNRU5ULFxuICAgIHNvcnRUZXh0OiAnbmctY29udGVudCcsXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnbmctdGVtcGxhdGUnLFxuICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkFOR1VMQVJfRUxFTUVOVCxcbiAgICBzb3J0VGV4dDogJ25nLXRlbXBsYXRlJyxcbiAgfSxcbl07XG5cbi8vIFRoaXMgaXMgYWRhcHRlZCBmcm9tIHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3IzX3RlbXBsYXRlX3RyYW5zZm9ybS50c1xuLy8gdG8gYWxsb3cgZW1wdHkgYmluZGluZyBuYW1lcy5cbmNvbnN0IEJJTkRfTkFNRV9SRUdFWFAgPVxuICAgIC9eKD86KD86KD86KGJpbmQtKXwobGV0LSl8KHJlZi18Iyl8KG9uLSl8KGJpbmRvbi0pfChAKSkoLiopKXxcXFtcXCgoW15cXCldKilcXClcXF18XFxbKFteXFxdXSopXFxdfFxcKChbXlxcKV0qKVxcKSkkLztcbmVudW0gQVRUUiB7XG4gIC8vIEdyb3VwIDEgPSBcImJpbmQtXCJcbiAgS1dfQklORF9JRFggPSAxLFxuICAvLyBHcm91cCAyID0gXCJsZXQtXCJcbiAgS1dfTEVUX0lEWCA9IDIsXG4gIC8vIEdyb3VwIDMgPSBcInJlZi0vI1wiXG4gIEtXX1JFRl9JRFggPSAzLFxuICAvLyBHcm91cCA0ID0gXCJvbi1cIlxuICBLV19PTl9JRFggPSA0LFxuICAvLyBHcm91cCA1ID0gXCJiaW5kb24tXCJcbiAgS1dfQklORE9OX0lEWCA9IDUsXG4gIC8vIEdyb3VwIDYgPSBcIkBcIlxuICBLV19BVF9JRFggPSA2LFxuICAvLyBHcm91cCA3ID0gdGhlIGlkZW50aWZpZXIgYWZ0ZXIgXCJiaW5kLVwiLCBcImxldC1cIiwgXCJyZWYtLyNcIiwgXCJvbi1cIiwgXCJiaW5kb24tXCIgb3IgXCJAXCJcbiAgSURFTlRfS1dfSURYID0gNyxcbiAgLy8gR3JvdXAgOCA9IGlkZW50aWZpZXIgaW5zaWRlIFsoKV1cbiAgSURFTlRfQkFOQU5BX0JPWF9JRFggPSA4LFxuICAvLyBHcm91cCA5ID0gaWRlbnRpZmllciBpbnNpZGUgW11cbiAgSURFTlRfUFJPUEVSVFlfSURYID0gOSxcbiAgLy8gR3JvdXAgMTAgPSBpZGVudGlmaWVyIGluc2lkZSAoKVxuICBJREVOVF9FVkVOVF9JRFggPSAxMCxcbn1cblxuZnVuY3Rpb24gaXNJZGVudGlmaWVyUGFydChjb2RlOiBudW1iZXIpIHtcbiAgLy8gSWRlbnRpZmllcnMgY29uc2lzdCBvZiBhbHBoYW51bWVyaWMgY2hhcmFjdGVycywgJ18nLCBvciAnJCcuXG4gIHJldHVybiBpc0FzY2lpTGV0dGVyKGNvZGUpIHx8IGlzRGlnaXQoY29kZSkgfHwgY29kZSA9PSAkJCB8fCBjb2RlID09ICRfO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHNwYW4gb2Ygd29yZCBpbiBhIHRlbXBsYXRlIHRoYXQgc3Vycm91bmRzIGBwb3NpdGlvbmAuIElmIHRoZXJlIGlzIG5vIHdvcmQgYXJvdW5kXG4gKiBgcG9zaXRpb25gLCBub3RoaW5nIGlzIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBnZXRCb3VuZGVkV29yZFNwYW4odGVtcGxhdGVJbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5UZXh0U3Bhbnx1bmRlZmluZWQge1xuICBjb25zdCB7dGVtcGxhdGV9ID0gdGVtcGxhdGVJbmZvO1xuICBjb25zdCB0ZW1wbGF0ZVNyYyA9IHRlbXBsYXRlLnNvdXJjZTtcblxuICBpZiAoIXRlbXBsYXRlU3JjKSByZXR1cm47XG5cbiAgLy8gVE9ETyhheWF6aGFmaXopOiBBIHNvbHV0aW9uIGJhc2VkIG9uIHdvcmQgZXhwYW5zaW9uIHdpbGwgYWx3YXlzIGJlIGV4cGVuc2l2ZSBjb21wYXJlZCB0byBvbmVcbiAgLy8gYmFzZWQgb24gQVNUcy4gV2hhdGV2ZXIgcGVuYWx0eSB3ZSBpbmN1ciBpcyBwcm9iYWJseSBtYW5hZ2VhYmxlIGZvciBzbWFsbC1sZW5ndGggKGkuZS4gdGhlXG4gIC8vIG1ham9yaXR5IG9mKSBpZGVudGlmaWVycywgYnV0IHRoZSBjdXJyZW50IHNvbHV0aW9uIGludm9sZXMgYSBudW1iZXIgb2YgYnJhbmNoaW5ncyBhbmQgd2UgY2FuJ3RcbiAgLy8gY29udHJvbCBwb3RlbnRpYWxseSB2ZXJ5IGxvbmcgaWRlbnRpZmllcnMuIENvbnNpZGVyIG1vdmluZyB0byBhbiBBU1QtYmFzZWQgc29sdXRpb24gb25jZVxuICAvLyBleGlzdGluZyBkaWZmaWN1bHRpZXMgd2l0aCBBU1Qgc3BhbnMgYXJlIG1vcmUgY2xlYXJseSByZXNvbHZlZCAoc2VlICMzMTg5OCBmb3IgZGlzY3Vzc2lvbiBvZlxuICAvLyBrbm93biBwcm9ibGVtcywgYW5kICMzMzA5MSBmb3IgaG93IHRoZXkgYWZmZWN0IHRleHQgcmVwbGFjZW1lbnQpLlxuICAvL1xuICAvLyBgdGVtcGxhdGVQb3NpdGlvbmAgcmVwcmVzZW50cyB0aGUgcmlnaHQtYm91bmQgbG9jYXRpb24gb2YgYSBjdXJzb3IgaW4gdGhlIHRlbXBsYXRlLlxuICAvLyAgICBrZXkuZW50fHJ5XG4gIC8vICAgICAgICAgICBeLS0tLSBjdXJzb3IsIGF0IHBvc2l0aW9uIGByYCBpcyBhdC5cbiAgLy8gQSBjdXJzb3IgaXMgbm90IGl0c2VsZiBhIGNoYXJhY3RlciBpbiB0aGUgdGVtcGxhdGU7IGl0IGhhcyBhIGxlZnQgKGxvd2VyKSBhbmQgcmlnaHQgKHVwcGVyKVxuICAvLyBpbmRleCBib3VuZCB0aGF0IGh1Z3MgdGhlIGN1cnNvciBpdHNlbGYuXG4gIGxldCB0ZW1wbGF0ZVBvc2l0aW9uID0gcG9zaXRpb24gLSB0ZW1wbGF0ZS5zcGFuLnN0YXJ0O1xuICAvLyBUbyBwZXJmb3JtIHdvcmQgZXhwYW5zaW9uLCB3ZSB3YW50IHRvIGRldGVybWluZSB0aGUgbGVmdCBhbmQgcmlnaHQgaW5kaWNlcyB0aGF0IGh1ZyB0aGUgY3Vyc29yLlxuICAvLyBUaGVyZSBhcmUgdGhyZWUgY2FzZXMgaGVyZS5cbiAgbGV0IGxlZnQsIHJpZ2h0O1xuICBpZiAodGVtcGxhdGVQb3NpdGlvbiA9PT0gMCkge1xuICAgIC8vIDEuIENhc2UgbGlrZVxuICAgIC8vICAgICAgfHJlc3Qgb2YgdGVtcGxhdGVcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBzdGFydCBvZiB0aGUgdGVtcGxhdGUsIGh1Z2dlZCBvbmx5IGJ5IHRoZSByaWdodCBzaWRlICgwLWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSAwO1xuICB9IGVsc2UgaWYgKHRlbXBsYXRlUG9zaXRpb24gPT09IHRlbXBsYXRlU3JjLmxlbmd0aCkge1xuICAgIC8vIDIuIENhc2UgbGlrZVxuICAgIC8vICAgICAgcmVzdCBvZiB0ZW1wbGF0ZXxcbiAgICAvLyAgICB0aGUgY3Vyc29yIGlzIGF0IHRoZSBlbmQgb2YgdGhlIHRlbXBsYXRlLCBodWdnZWQgb25seSBieSB0aGUgbGVmdCBzaWRlIChsYXN0LWluZGV4KS5cbiAgICBsZWZ0ID0gcmlnaHQgPSB0ZW1wbGF0ZVNyYy5sZW5ndGggLSAxO1xuICB9IGVsc2Uge1xuICAgIC8vIDMuIENhc2UgbGlrZVxuICAgIC8vICAgICAgd298cmRcbiAgICAvLyAgICB0aGVyZSBpcyBhIGNsZWFyIGxlZnQgYW5kIHJpZ2h0IGluZGV4LlxuICAgIGxlZnQgPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gMTtcbiAgICByaWdodCA9IHRlbXBsYXRlUG9zaXRpb247XG4gIH1cblxuICBpZiAoIWlzSWRlbnRpZmllclBhcnQodGVtcGxhdGVTcmMuY2hhckNvZGVBdChsZWZ0KSkgJiZcbiAgICAgICFpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkge1xuICAgIC8vIENhc2UgbGlrZVxuICAgIC8vICAgICAgICAgLnwuXG4gICAgLy8gbGVmdCAtLS1eIF4tLS0gcmlnaHRcbiAgICAvLyBUaGVyZSBpcyBubyB3b3JkIGhlcmUuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXhwYW5kIG9uIHRoZSBsZWZ0IGFuZCByaWdodCBzaWRlIHVudGlsIGEgd29yZCBib3VuZGFyeSBpcyBoaXQuIEJhY2sgdXAgb25lIGV4cGFuc2lvbiBvbiBib3RoXG4gIC8vIHNpZGUgdG8gc3RheSBpbnNpZGUgdGhlIHdvcmQuXG4gIHdoaWxlIChsZWZ0ID49IDAgJiYgaXNJZGVudGlmaWVyUGFydCh0ZW1wbGF0ZVNyYy5jaGFyQ29kZUF0KGxlZnQpKSkgLS1sZWZ0O1xuICArK2xlZnQ7XG4gIHdoaWxlIChyaWdodCA8IHRlbXBsYXRlU3JjLmxlbmd0aCAmJiBpc0lkZW50aWZpZXJQYXJ0KHRlbXBsYXRlU3JjLmNoYXJDb2RlQXQocmlnaHQpKSkgKytyaWdodDtcbiAgLS1yaWdodDtcblxuICBjb25zdCBhYnNvbHV0ZVN0YXJ0UG9zaXRpb24gPSBwb3NpdGlvbiAtICh0ZW1wbGF0ZVBvc2l0aW9uIC0gbGVmdCk7XG4gIGNvbnN0IGxlbmd0aCA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gIHJldHVybiB7c3RhcnQ6IGFic29sdXRlU3RhcnRQb3NpdGlvbiwgbGVuZ3RofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlQ29tcGxldGlvbnMoXG4gICAgdGVtcGxhdGVJbmZvOiBBc3RSZXN1bHQsIHBvc2l0aW9uOiBudW1iZXIpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGxldCByZXN1bHQ6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG4gIGNvbnN0IHtodG1sQXN0LCB0ZW1wbGF0ZX0gPSB0ZW1wbGF0ZUluZm87XG4gIC8vIFRoZSB0ZW1wbGF0ZU5vZGUgc3RhcnRzIGF0IHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyIHNvIHdlIGFkZCAxIHRvIHNraXAgaXQuXG4gIGNvbnN0IHRlbXBsYXRlUG9zaXRpb24gPSBwb3NpdGlvbiAtIHRlbXBsYXRlLnNwYW4uc3RhcnQ7XG4gIGNvbnN0IHBhdGggPSBnZXRQYXRoVG9Ob2RlQXRQb3NpdGlvbihodG1sQXN0LCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgY29uc3QgbW9zdFNwZWNpZmljID0gcGF0aC50YWlsO1xuICBpZiAocGF0aC5lbXB0eSB8fCAhbW9zdFNwZWNpZmljKSB7XG4gICAgcmVzdWx0ID0gZWxlbWVudENvbXBsZXRpb25zKHRlbXBsYXRlSW5mbyk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYXN0UG9zaXRpb24gPSB0ZW1wbGF0ZVBvc2l0aW9uIC0gbW9zdFNwZWNpZmljLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIG1vc3RTcGVjaWZpYy52aXNpdChcbiAgICAgICAge1xuICAgICAgICAgIHZpc2l0RWxlbWVudChhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGFnU3BhbiA9IHNwYW5PZihhc3Quc291cmNlU3Bhbik7XG4gICAgICAgICAgICBjb25zdCB0YWdMZW4gPSBhc3QubmFtZS5sZW5ndGg7XG4gICAgICAgICAgICAvLyArIDEgZm9yIHRoZSBvcGVuaW5nIGFuZ2xlIGJyYWNrZXRcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDw9IHN0YXJ0VGFnU3Bhbi5zdGFydCArIHRhZ0xlbiArIDEpIHtcbiAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGluIHRoZSB0YWcgdGhlbiByZXR1cm4gdGhlIGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnRDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBvc2l0aW9uIDwgc3RhcnRUYWdTcGFuLmVuZCkge1xuICAgICAgICAgICAgICAvLyBXZSBhcmUgaW4gdGhlIGF0dHJpYnV0ZSBzZWN0aW9uIG9mIHRoZSBlbGVtZW50IChidXQgbm90IGluIGFuIGF0dHJpYnV0ZSkuXG4gICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgYXR0cmlidXRlIGNvbXBsZXRpb25zLlxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQodGVtcGxhdGVJbmZvLCBhc3QubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpdEF0dHJpYnV0ZShhc3Q6IEF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgLy8gQW4gYXR0cmlidXRlIGNvbnNpc3RzIG9mIHR3byBwYXJ0cywgTEhTPVwiUkhTXCIuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgY29tcGxldGlvbnMgYXJlIHJlcXVlc3RlZCBmb3IgTEhTIG9yIFJIU1xuICAgICAgICAgICAgaWYgKGFzdC52YWx1ZVNwYW4gJiYgaW5TcGFuKHRlbXBsYXRlUG9zaXRpb24sIHNwYW5PZihhc3QudmFsdWVTcGFuKSkpIHtcbiAgICAgICAgICAgICAgLy8gUkhTIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlVmFsdWVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTEhTIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cmlidXRlQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHZpc2l0VGV4dChhc3QpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBpbiBhIGVudGl0eS5cbiAgICAgICAgICAgIHJlc3VsdCA9IGVudGl0eUNvbXBsZXRpb25zKGdldFNvdXJjZVRleHQodGVtcGxhdGUsIHNwYW5PZihhc3QpKSwgYXN0UG9zaXRpb24pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGgpIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICByZXN1bHQgPSBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnModGVtcGxhdGVJbmZvLCB0ZW1wbGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHBhdGguZmlyc3QoRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gZ2V0SHRtbFRhZ0RlZmluaXRpb24oZWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uY29udGVudFR5cGUgPT09IFRhZ0NvbnRlbnRUeXBlLlBBUlNBQkxFX0RBVEEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB2b2lkRWxlbWVudEF0dHJpYnV0ZUNvbXBsZXRpb25zKHRlbXBsYXRlSW5mbywgcGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBjYW4gaG9sZCBjb250ZW50LCBzaG93IGVsZW1lbnQgY29tcGxldGlvbnMuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIElmIG5vIGVsZW1lbnQgY29udGFpbmVyLCBpbXBsaWVzIHBhcnNhYmxlIGRhdGEgc28gc2hvdyBlbGVtZW50cy5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyh0ZW1wbGF0ZUluZm8sIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50Q29tcGxldGlvbnModGVtcGxhdGVJbmZvKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaXRDb21tZW50KCkge30sXG4gICAgICAgICAgdmlzaXRFeHBhbnNpb24oKSB7fSxcbiAgICAgICAgICB2aXNpdEV4cGFuc2lvbkNhc2UoKSB7fVxuICAgICAgICB9LFxuICAgICAgICBudWxsKTtcbiAgfVxuXG4gIGNvbnN0IHJlcGxhY2VtZW50U3BhbiA9IGdldEJvdW5kZWRXb3JkU3Bhbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgcmV0dXJuIHJlc3VsdC5tYXAoZW50cnkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIC4uLmVudHJ5LCByZXBsYWNlbWVudFNwYW4sXG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgcGF0aDogQXN0UGF0aDxIdG1sQXN0Pik6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgYXR0ciA9IHBhdGgudGFpbDtcbiAgY29uc3QgZWxlbSA9IHBhdGgucGFyZW50T2YoYXR0cik7XG4gIGlmICghKGF0dHIgaW5zdGFuY2VvZiBBdHRyaWJ1dGUpIHx8ICEoZWxlbSBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLy8gVE9ETzogQ29uc2lkZXIgcGFyc2luZyB0aGUgYXR0cmludXRlIG5hbWUgdG8gYSBwcm9wZXIgQVNUIGluc3RlYWQgb2ZcbiAgLy8gbWF0Y2hpbmcgdXNpbmcgcmVnZXguIFRoaXMgaXMgYmVjYXVzZSB0aGUgcmVnZXhwIHdvdWxkIGluY29ycmVjdGx5IGlkZW50aWZ5XG4gIC8vIGJpbmQgcGFydHMgZm9yIGNhc2VzIGxpa2UgWygpfF1cbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBeIGN1cnNvciBpcyBoZXJlXG4gIGNvbnN0IGJpbmRQYXJ0cyA9IGF0dHIubmFtZS5tYXRjaChCSU5EX05BTUVfUkVHRVhQKTtcbiAgLy8gVGVtcGxhdGVSZWYgc3RhcnRzIHdpdGggJyonLiBTZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9jb3JlL1RlbXBsYXRlUmVmXG4gIGNvbnN0IGlzVGVtcGxhdGVSZWYgPSBhdHRyLm5hbWUuc3RhcnRzV2l0aCgnKicpO1xuICBjb25zdCBpc0JpbmRpbmcgPSBiaW5kUGFydHMgIT09IG51bGwgfHwgaXNUZW1wbGF0ZVJlZjtcblxuICBpZiAoIWlzQmluZGluZykge1xuICAgIHJldHVybiBhdHRyaWJ1dGVDb21wbGV0aW9uc0ZvckVsZW1lbnQoaW5mbywgZWxlbS5uYW1lKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdHM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IG5nQXR0cnMgPSBhbmd1bGFyQXR0cmlidXRlcyhpbmZvLCBlbGVtLm5hbWUpO1xuICBpZiAoIWJpbmRQYXJ0cykge1xuICAgIC8vIElmIGJpbmRQYXJ0cyBpcyBudWxsIHRoZW4gdGhpcyBtdXN0IGJlIGEgVGVtcGxhdGVSZWYuXG4gICAgcmVzdWx0cy5wdXNoKC4uLm5nQXR0cnMudGVtcGxhdGVSZWZzKTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGJpbmRQYXJ0c1tBVFRSLktXX0JJTkRfSURYXSAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICBiaW5kUGFydHNbQVRUUi5JREVOVF9QUk9QRVJUWV9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBwcm9wZXJ0eSBiaW5kaW5nIHZpYSBiaW5kLSBvciBbXVxuICAgIHJlc3VsdHMucHVzaCguLi5wcm9wZXJ0eU5hbWVzKGVsZW0ubmFtZSksIC4uLm5nQXR0cnMuaW5wdXRzKTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIGJpbmRQYXJ0c1tBVFRSLktXX09OX0lEWF0gIT09IHVuZGVmaW5lZCB8fCBiaW5kUGFydHNbQVRUUi5JREVOVF9FVkVOVF9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBldmVudCBiaW5kaW5nIHZpYSBvbi0gb3IgKClcbiAgICByZXN1bHRzLnB1c2goLi4uZXZlbnROYW1lcyhlbGVtLm5hbWUpLCAuLi5uZ0F0dHJzLm91dHB1dHMpO1xuICB9IGVsc2UgaWYgKFxuICAgICAgYmluZFBhcnRzW0FUVFIuS1dfQklORE9OX0lEWF0gIT09IHVuZGVmaW5lZCB8fFxuICAgICAgYmluZFBhcnRzW0FUVFIuSURFTlRfQkFOQU5BX0JPWF9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBiYW5hbmEtaW4tYS1ib3ggYmluZGluZyB2aWEgYmluZG9uLSBvciBbKCldXG4gICAgcmVzdWx0cy5wdXNoKC4uLm5nQXR0cnMuYmFuYW5hcyk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHMubWFwKG5hbWUgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQVRUUklCVVRFLFxuICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZUNvbXBsZXRpb25zRm9yRWxlbWVudChcbiAgICBpbmZvOiBBc3RSZXN1bHQsIGVsZW1lbnROYW1lOiBzdHJpbmcpOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG5nLkNvbXBsZXRpb25FbnRyeVtdID0gW107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBhdHRyaWJ1dGVzIGNvbXBsZXRpb24gb25seSBmb3IgaW5saW5lIHRlbXBsYXRlc1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyaWJ1dGVOYW1lcyhlbGVtZW50TmFtZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGtpbmQ6IG5nLkNvbXBsZXRpb25LaW5kLkhUTUxfQVRUUklCVVRFLFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCBBbmd1bGFyIGF0dHJpYnV0ZXNcbiAgY29uc3QgbmdBdHRycyA9IGFuZ3VsYXJBdHRyaWJ1dGVzKGluZm8sIGVsZW1lbnROYW1lKTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIG5nQXR0cnMub3RoZXJzKSB7XG4gICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5BVFRSSUJVVEUsXG4gICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIFByb3ZpZGUgY29tcGxldGlvbnMgdG8gdGhlIFJIUyBvZiBhbiBhdHRyaWJ1dGUsIHdoaWNoIGlzIG9mIHRoZSBmb3JtXG4gKiBMSFM9XCJSSFNcIi4gVGhlIHRlbXBsYXRlIHBhdGggaXMgY29tcHV0ZWQgZnJvbSB0aGUgc3BlY2lmaWVkIGBpbmZvYCB3aGVyZWFzXG4gKiB0aGUgY29udGV4dCBpcyBkZXRlcm1pbmVkIGZyb20gdGhlIHNwZWNpZmllZCBgaHRtbFBhdGhgLlxuICogQHBhcmFtIGluZm8gT2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIHRlbXBsYXRlIEFTVFxuICogQHBhcmFtIGh0bWxQYXRoIFBhdGggdG8gdGhlIEhUTUwgbm9kZVxuICovXG5mdW5jdGlvbiBhdHRyaWJ1dGVWYWx1ZUNvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCwgaHRtbFBhdGg6IEh0bWxBc3RQYXRoKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIFRlbXBsYXRlIEFTVCBwYXRoLlxuICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBmaW5kVGVtcGxhdGVBc3RBdChpbmZvLnRlbXBsYXRlQXN0LCBodG1sUGF0aC5wb3NpdGlvbik7XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoaW5mbywgaHRtbFBhdGgucG9zaXRpb24sICgpID0+IHtcbiAgICBjb25zdCBkaW5mbyA9IGRpYWdub3N0aWNJbmZvRnJvbVRlbXBsYXRlSW5mbyhpbmZvKTtcbiAgICByZXR1cm4gZ2V0RXhwcmVzc2lvblNjb3BlKGRpbmZvLCB0ZW1wbGF0ZVBhdGgsIGZhbHNlKTtcbiAgfSk7XG4gIGlmICh0ZW1wbGF0ZVBhdGgudGFpbCBpbnN0YW5jZW9mIEF0dHJBc3QgfHxcbiAgICAgIHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQm91bmRFbGVtZW50UHJvcGVydHlBc3QgfHxcbiAgICAgIHRlbXBsYXRlUGF0aC50YWlsIGluc3RhbmNlb2YgQm91bmRFdmVudEFzdCkge1xuICAgIHRlbXBsYXRlUGF0aC50YWlsLnZpc2l0KHZpc2l0b3IsIG51bGwpO1xuICAgIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG4gIH1cbiAgLy8gSW4gb3JkZXIgdG8gcHJvdmlkZSBhY2N1cmF0ZSBhdHRyaWJ1dGUgdmFsdWUgY29tcGxldGlvbiwgd2UgbmVlZCB0byBrbm93XG4gIC8vIHdoYXQgdGhlIExIUyBpcywgYW5kIGNvbnN0cnVjdCB0aGUgcHJvcGVyIEFTVCBpZiBpdCBpcyBtaXNzaW5nLlxuICBjb25zdCBodG1sQXR0ciA9IGh0bWxQYXRoLnRhaWwgYXMgQXR0cmlidXRlO1xuICBjb25zdCBiaW5kUGFydHMgPSBodG1sQXR0ci5uYW1lLm1hdGNoKEJJTkRfTkFNRV9SRUdFWFApO1xuICBpZiAoYmluZFBhcnRzICYmIGJpbmRQYXJ0c1tBVFRSLktXX1JFRl9JRFhdICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgcmVmQXN0OiBSZWZlcmVuY2VBc3R8dW5kZWZpbmVkO1xuICAgIGxldCBlbGVtQXN0OiBFbGVtZW50QXN0fHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBSZWZlcmVuY2VBc3QpIHtcbiAgICAgIHJlZkFzdCA9IHRlbXBsYXRlUGF0aC50YWlsO1xuICAgICAgY29uc3QgcGFyZW50ID0gdGVtcGxhdGVQYXRoLnBhcmVudE9mKHJlZkFzdCk7XG4gICAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgRWxlbWVudEFzdCkge1xuICAgICAgICBlbGVtQXN0ID0gcGFyZW50O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXRoLnRhaWwgaW5zdGFuY2VvZiBFbGVtZW50QXN0KSB7XG4gICAgICByZWZBc3QgPSBuZXcgUmVmZXJlbmNlQXN0KGh0bWxBdHRyLm5hbWUsIG51bGwgISwgaHRtbEF0dHIudmFsdWUsIGh0bWxBdHRyLnZhbHVlU3BhbiAhKTtcbiAgICAgIGVsZW1Bc3QgPSB0ZW1wbGF0ZVBhdGgudGFpbDtcbiAgICB9XG4gICAgaWYgKHJlZkFzdCAmJiBlbGVtQXN0KSB7XG4gICAgICByZWZBc3QudmlzaXQodmlzaXRvciwgZWxlbUFzdCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEh0bWxBc3QgY29udGFpbnMgdGhlIGBBdHRyaWJ1dGVgIG5vZGUsIGhvd2V2ZXIgdGhlIGNvcnJlc3BvbmRpbmcgYEF0dHJBc3RgXG4gICAgLy8gbm9kZSBpcyBtaXNzaW5nIGZyb20gdGhlIFRlbXBsYXRlQXN0LlxuICAgIGNvbnN0IGF0dHJBc3QgPSBuZXcgQXR0ckFzdChodG1sQXR0ci5uYW1lLCBodG1sQXR0ci52YWx1ZSwgaHRtbEF0dHIudmFsdWVTcGFuICEpO1xuICAgIGF0dHJBc3QudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IucmVzdWx0cztcbn1cblxuZnVuY3Rpb24gZWxlbWVudENvbXBsZXRpb25zKGluZm86IEFzdFJlc3VsdCk6IG5nLkNvbXBsZXRpb25FbnRyeVtdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuQ29tcGxldGlvbkVudHJ5W10gPSBbLi4uQU5HVUxBUl9FTEVNRU5UU107XG5cbiAgaWYgKGluZm8udGVtcGxhdGUgaW5zdGFuY2VvZiBJbmxpbmVUZW1wbGF0ZSkge1xuICAgIC8vIFByb3ZpZGUgSFRNTCBlbGVtZW50cyBjb21wbGV0aW9uIG9ubHkgZm9yIGlubGluZSB0ZW1wbGF0ZXNcbiAgICByZXN1bHRzLnB1c2goLi4uSFRNTF9FTEVNRU5UUyk7XG4gIH1cblxuICAvLyBDb2xsZWN0IHRoZSBlbGVtZW50cyByZWZlcmVuY2VkIGJ5IHRoZSBzZWxlY3RvcnNcbiAgY29uc3QgY29tcG9uZW50cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIGdldFNlbGVjdG9ycyhpbmZvKS5zZWxlY3RvcnMpIHtcbiAgICBjb25zdCBuYW1lID0gc2VsZWN0b3IuZWxlbWVudDtcbiAgICBpZiAobmFtZSAmJiAhY29tcG9uZW50cy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbXBvbmVudHMuYWRkKG5hbWUpO1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAga2luZDogbmcuQ29tcGxldGlvbktpbmQuQ09NUE9ORU5ULFxuICAgICAgICBzb3J0VGV4dDogbmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBlbnRpdHlDb21wbGV0aW9ucyh2YWx1ZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBlbnRpdHkgY29tcGxldGlvbnNcbiAgY29uc3QgcmUgPSAvJltBLVphLXpdKjs/KD8hXFxkKS9nO1xuICBsZXQgZm91bmQ6IFJlZ0V4cEV4ZWNBcnJheXxudWxsO1xuICBsZXQgcmVzdWx0OiBuZy5Db21wbGV0aW9uRW50cnlbXSA9IFtdO1xuICB3aGlsZSAoZm91bmQgPSByZS5leGVjKHZhbHVlKSkge1xuICAgIGxldCBsZW4gPSBmb3VuZFswXS5sZW5ndGg7XG4gICAgaWYgKHBvc2l0aW9uID49IGZvdW5kLmluZGV4ICYmIHBvc2l0aW9uIDwgKGZvdW5kLmluZGV4ICsgbGVuKSkge1xuICAgICAgcmVzdWx0ID0gT2JqZWN0LmtleXMoTkFNRURfRU5USVRJRVMpLm1hcChuYW1lID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lOiBgJiR7bmFtZX07YCxcbiAgICAgICAgICBraW5kOiBuZy5Db21wbGV0aW9uS2luZC5FTlRJVFksXG4gICAgICAgICAgc29ydFRleHQ6IG5hbWUsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlcnBvbGF0aW9uQ29tcGxldGlvbnMoaW5mbzogQXN0UmVzdWx0LCBwb3NpdGlvbjogbnVtYmVyKTogbmcuQ29tcGxldGlvbkVudHJ5W10ge1xuICAvLyBMb29rIGZvciBhbiBpbnRlcnBvbGF0aW9uIGluIGF0IHRoZSBwb3NpdGlvbi5cbiAgY29uc3QgdGVtcGxhdGVQYXRoID0gZmluZFRlbXBsYXRlQXN0QXQoaW5mby50ZW1wbGF0ZUFzdCwgcG9zaXRpb24pO1xuICBpZiAoIXRlbXBsYXRlUGF0aC50YWlsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHZpc2l0b3IgPSBuZXcgRXhwcmVzc2lvblZpc2l0b3IoXG4gICAgICBpbmZvLCBwb3NpdGlvbixcbiAgICAgICgpID0+IGdldEV4cHJlc3Npb25TY29wZShkaWFnbm9zdGljSW5mb0Zyb21UZW1wbGF0ZUluZm8oaW5mbyksIHRlbXBsYXRlUGF0aCwgZmFsc2UpKTtcbiAgdGVtcGxhdGVQYXRoLnRhaWwudmlzaXQodmlzaXRvciwgbnVsbCk7XG4gIHJldHVybiB2aXNpdG9yLnJlc3VsdHM7XG59XG5cbi8vIFRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIG9mIEhUTUwgd2hlcmUgdGV4dCB0aGF0IGNvbnRhaW5zIGEgdW5jbG9zZWQgdGFnIGlzIHRyZWF0ZWQgYXNcbi8vIHRleHQuIEZvciBleGFwbGUgJzxoMT4gU29tZSA8YSB0ZXh0IDwvaDE+JyBwcm9kdWNlcyBhIHRleHQgbm9kZXMgaW5zaWRlIG9mIHRoZSBIMVxuLy8gZWxlbWVudCBcIlNvbWUgPGEgdGV4dFwiLiBXZSwgaG93ZXZlciwgd2FudCB0byB0cmVhdCB0aGlzIGFzIGlmIHRoZSB1c2VyIHdhcyByZXF1ZXN0aW5nXG4vLyB0aGUgYXR0cmlidXRlcyBvZiBhbiBcImFcIiBlbGVtZW50LCBub3QgcmVxdWVzdGluZyBjb21wbGV0aW9uIGluIHRoZSBhIHRleHQgZWxlbWVudC4gVGhpc1xuLy8gY29kZSBjaGVja3MgZm9yIHRoaXMgY2FzZSBhbmQgcmV0dXJucyBlbGVtZW50IGNvbXBsZXRpb25zIGlmIGl0IGlzIGRldGVjdGVkIG9yIHVuZGVmaW5lZFxuLy8gaWYgaXQgaXMgbm90LlxuZnVuY3Rpb24gdm9pZEVsZW1lbnRBdHRyaWJ1dGVDb21wbGV0aW9ucyhcbiAgICBpbmZvOiBBc3RSZXN1bHQsIHBhdGg6IEFzdFBhdGg8SHRtbEFzdD4pOiBuZy5Db21wbGV0aW9uRW50cnlbXSB7XG4gIGNvbnN0IHRhaWwgPSBwYXRoLnRhaWw7XG4gIGlmICh0YWlsIGluc3RhbmNlb2YgVGV4dCkge1xuICAgIGNvbnN0IG1hdGNoID0gdGFpbC52YWx1ZS5tYXRjaCgvPChcXHcoXFx3fFxcZHwtKSo6KT8oXFx3KFxcd3xcXGR8LSkqKVxccy8pO1xuICAgIC8vIFRoZSBwb3NpdGlvbiBtdXN0IGJlIGFmdGVyIHRoZSBtYXRjaCwgb3RoZXJ3aXNlIHdlIGFyZSBzdGlsbCBpbiBhIHBsYWNlIHdoZXJlIGVsZW1lbnRzXG4gICAgLy8gYXJlIGV4cGVjdGVkIChzdWNoIGFzIGA8fGFgIG9yIGA8YXxgOyB3ZSBvbmx5IHdhbnQgYXR0cmlidXRlcyBmb3IgYDxhIHxgIG9yIGFmdGVyKS5cbiAgICBpZiAobWF0Y2ggJiZcbiAgICAgICAgcGF0aC5wb3NpdGlvbiA+PSAobWF0Y2guaW5kZXggfHwgMCkgKyBtYXRjaFswXS5sZW5ndGggKyB0YWlsLnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0KSB7XG4gICAgICByZXR1cm4gYXR0cmlidXRlQ29tcGxldGlvbnNGb3JFbGVtZW50KGluZm8sIG1hdGNoWzNdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVmlzaXRvciBleHRlbmRzIE51bGxUZW1wbGF0ZVZpc2l0b3Ige1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBsZXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIG5nLkNvbXBsZXRpb25FbnRyeT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaW5mbzogQXN0UmVzdWx0LCBwcml2YXRlIHJlYWRvbmx5IHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldEV4cHJlc3Npb25TY29wZTogKCkgPT4gbmcuU3ltYm9sVGFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IHJlc3VsdHMoKTogbmcuQ29tcGxldGlvbkVudHJ5W10geyByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbXBsZXRpb25zLnZhbHVlcygpKTsgfVxuXG4gIHZpc2l0RGlyZWN0aXZlUHJvcGVydHkoYXN0OiBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEVsZW1lbnRQcm9wZXJ0eShhc3Q6IEJvdW5kRWxlbWVudFByb3BlcnR5QXN0KTogdm9pZCB7XG4gICAgdGhpcy5wcm9jZXNzRXhwcmVzc2lvbkNvbXBsZXRpb25zKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdEV2ZW50KGFzdDogQm91bmRFdmVudEFzdCk6IHZvaWQgeyB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoYXN0LmhhbmRsZXIpOyB9XG5cbiAgdmlzaXRFbGVtZW50KCk6IHZvaWQge1xuICAgIC8vIG5vLW9wIGZvciBub3dcbiAgfVxuXG4gIHZpc2l0QXR0cihhc3Q6IEF0dHJBc3QpIHtcbiAgICBpZiAoYXN0Lm5hbWUuc3RhcnRzV2l0aCgnKicpKSB7XG4gICAgICAvLyBUaGlzIGEgdGVtcGxhdGUgYmluZGluZyBnaXZlbiBieSBtaWNybyBzeW50YXggZXhwcmVzc2lvbi5cbiAgICAgIC8vIEZpcnN0LCB2ZXJpZnkgdGhlIGF0dHJpYnV0ZSBjb25zaXN0cyBvZiBzb21lIGJpbmRpbmcgd2UgY2FuIGdpdmUgY29tcGxldGlvbnMgZm9yLlxuICAgICAgY29uc3Qge3RlbXBsYXRlQmluZGluZ3N9ID0gdGhpcy5pbmZvLmV4cHJlc3Npb25QYXJzZXIucGFyc2VUZW1wbGF0ZUJpbmRpbmdzKFxuICAgICAgICAgIGFzdC5uYW1lLCBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLnRvU3RyaW5nKCksIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICAvLyBGaW5kIHdoZXJlIHRoZSBjdXJzb3IgaXMgcmVsYXRpdmUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICBjb25zdCB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uIC0gYXN0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0O1xuICAgICAgLy8gRmluZCB0aGUgdGVtcGxhdGUgYmluZGluZyB0aGF0IGNvbnRhaW5zIHRoZSBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IGJpbmRpbmcgPSB0ZW1wbGF0ZUJpbmRpbmdzLmZpbmQoYiA9PiBpblNwYW4odmFsdWVSZWxhdGl2ZVBvc2l0aW9uLCBiLnNwYW4pKTtcblxuICAgICAgaWYgKCFiaW5kaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5taWNyb1N5bnRheEluQXR0cmlidXRlVmFsdWUoYXN0LCBiaW5kaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXhwcmVzc2lvbkFzdCA9IHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlQmluZGluZyhcbiAgICAgICAgICBhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLnRvU3RyaW5nKCksIGFzdC5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoZXhwcmVzc2lvbkFzdCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRSZWZlcmVuY2UoX2FzdDogUmVmZXJlbmNlQXN0LCBjb250ZXh0OiBFbGVtZW50QXN0KSB7XG4gICAgY29udGV4dC5kaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IHtleHBvcnRBc30gPSBkaXIuZGlyZWN0aXZlO1xuICAgICAgaWYgKGV4cG9ydEFzKSB7XG4gICAgICAgIHRoaXMuY29tcGxldGlvbnMuc2V0KFxuICAgICAgICAgICAgZXhwb3J0QXMsIHtuYW1lOiBleHBvcnRBcywga2luZDogbmcuQ29tcGxldGlvbktpbmQuUkVGRVJFTkNFLCBzb3J0VGV4dDogZXhwb3J0QXN9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0KSB7XG4gICAgaWYgKGluU3Bhbih0aGlzLnBvc2l0aW9uLCBhc3QudmFsdWUuc291cmNlU3BhbikpIHtcbiAgICAgIGNvbnN0IGNvbXBsZXRpb25zID0gZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25zKFxuICAgICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIGFzdC52YWx1ZSwgdGhpcy5wb3NpdGlvbiwgdGhpcy5pbmZvLnRlbXBsYXRlLnF1ZXJ5KTtcbiAgICAgIGlmIChjb21wbGV0aW9ucykge1xuICAgICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKGNvbXBsZXRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnModmFsdWU6IEFTVCkge1xuICAgIGNvbnN0IHN5bWJvbHMgPSBnZXRFeHByZXNzaW9uQ29tcGxldGlvbnMoXG4gICAgICAgIHRoaXMuZ2V0RXhwcmVzc2lvblNjb3BlKCksIHZhbHVlLCB0aGlzLnBvc2l0aW9uLCB0aGlzLmluZm8udGVtcGxhdGUucXVlcnkpO1xuICAgIGlmIChzeW1ib2xzKSB7XG4gICAgICB0aGlzLmFkZFN5bWJvbHNUb0NvbXBsZXRpb25zKHN5bWJvbHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoc3ltYm9sczogbmcuU3ltYm9sW10pIHtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc3ltYm9scykge1xuICAgICAgaWYgKHMubmFtZS5zdGFydHNXaXRoKCdfXycpIHx8ICFzLnB1YmxpYyB8fCB0aGlzLmNvbXBsZXRpb25zLmhhcyhzLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcGlwZSBtZXRob2Qgc2hvdWxkIG5vdCBpbmNsdWRlIHBhcmVudGhlc2VzLlxuICAgICAgLy8gZS5nLiB7eyB2YWx1ZV9leHByZXNzaW9uIHwgc2xpY2UgOiBzdGFydCBbIDogZW5kIF0gfX1cbiAgICAgIGNvbnN0IHNob3VsZEluc2VydFBhcmVudGhlc2VzID0gcy5jYWxsYWJsZSAmJiBzLmtpbmQgIT09IG5nLkNvbXBsZXRpb25LaW5kLlBJUEU7XG4gICAgICB0aGlzLmNvbXBsZXRpb25zLnNldChzLm5hbWUsIHtcbiAgICAgICAgbmFtZTogcy5uYW1lLFxuICAgICAgICBraW5kOiBzLmtpbmQgYXMgbmcuQ29tcGxldGlvbktpbmQsXG4gICAgICAgIHNvcnRUZXh0OiBzLm5hbWUsXG4gICAgICAgIGluc2VydFRleHQ6IHNob3VsZEluc2VydFBhcmVudGhlc2VzID8gYCR7cy5uYW1lfSgpYCA6IHMubmFtZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBoYW5kbGVzIHRoZSBjb21wbGV0aW9ucyBvZiBhdHRyaWJ1dGUgdmFsdWVzIGZvciBkaXJlY3RpdmVzIHRoYXRcbiAgICogc3VwcG9ydCB0aGUgbWljcm9zeW50YXggZm9ybWF0LiBFeGFtcGxlcyBhcmUgKm5nRm9yIGFuZCAqbmdJZi5cbiAgICogVGhlc2UgZGlyZWN0aXZlcyBhbGxvd3MgZGVjbGFyYXRpb24gb2YgXCJsZXRcIiB2YXJpYWJsZXMsIGFkZHMgY29udGV4dC1zcGVjaWZpY1xuICAgKiBzeW1ib2xzIGxpa2UgJGltcGxpY2l0LCBpbmRleCwgY291bnQsIGFtb25nIG90aGVyIGJlaGF2aW9ycy5cbiAgICogRm9yIGEgY29tcGxldGUgZGVzY3JpcHRpb24gb2Ygc3VjaCBmb3JtYXQsIHNlZVxuICAgKiBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvc3RydWN0dXJhbC1kaXJlY3RpdmVzI3RoZS1hc3Rlcmlzay0tcHJlZml4XG4gICAqXG4gICAqIEBwYXJhbSBhdHRyIGRlc2NyaXB0b3IgZm9yIGF0dHJpYnV0ZSBuYW1lIGFuZCB2YWx1ZSBwYWlyXG4gICAqIEBwYXJhbSBiaW5kaW5nIHRlbXBsYXRlIGJpbmRpbmcgZm9yIHRoZSBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGVcbiAgICovXG4gIHByaXZhdGUgbWljcm9TeW50YXhJbkF0dHJpYnV0ZVZhbHVlKGF0dHI6IEF0dHJBc3QsIGJpbmRpbmc6IFRlbXBsYXRlQmluZGluZykge1xuICAgIGNvbnN0IGtleSA9IGF0dHIubmFtZS5zdWJzdHJpbmcoMSk7ICAvLyByZW1vdmUgbGVhZGluZyBhc3Rlcmlza1xuXG4gICAgLy8gRmluZCB0aGUgc2VsZWN0b3IgLSBlZyBuZ0ZvciwgbmdJZiwgZXRjXG4gICAgY29uc3Qgc2VsZWN0b3JJbmZvID0gZ2V0U2VsZWN0b3JzKHRoaXMuaW5mbyk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBzZWxlY3RvckluZm8uc2VsZWN0b3JzLmZpbmQocyA9PiB7XG4gICAgICAvLyBhdHRyaWJ1dGVzIGFyZSBsaXN0ZWQgaW4gKGF0dHJpYnV0ZSwgdmFsdWUpIHBhaXJzXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMuYXR0cnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgaWYgKHMuYXR0cnNbaV0gPT09IGtleSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVSZWxhdGl2ZVBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiAtIGF0dHIuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG5cbiAgICBpZiAoYmluZGluZy5rZXlJc1Zhcikge1xuICAgICAgY29uc3QgZXF1YWxMb2NhdGlvbiA9IGF0dHIudmFsdWUuaW5kZXhPZignPScpO1xuICAgICAgaWYgKGVxdWFsTG9jYXRpb24gPiAwICYmIHZhbHVlUmVsYXRpdmVQb3NpdGlvbiA+IGVxdWFsTG9jYXRpb24pIHtcbiAgICAgICAgLy8gV2UgYXJlIGFmdGVyIHRoZSAnPScgaW4gYSBsZXQgY2xhdXNlLiBUaGUgdmFsaWQgdmFsdWVzIGhlcmUgYXJlIHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgICAgICAvLyB0ZW1wbGF0ZSByZWZlcmVuY2UncyB0eXBlIHBhcmFtZXRlci5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPSBzZWxlY3RvckluZm8ubWFwLmdldChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChkaXJlY3RpdmVNZXRhZGF0YSkge1xuICAgICAgICAgIGNvbnN0IGNvbnRleHRUYWJsZSA9XG4gICAgICAgICAgICAgIHRoaXMuaW5mby50ZW1wbGF0ZS5xdWVyeS5nZXRUZW1wbGF0ZUNvbnRleHQoZGlyZWN0aXZlTWV0YWRhdGEudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgICAgIGlmIChjb250ZXh0VGFibGUpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgYWRkcyBzeW1ib2xzIGxpa2UgJGltcGxpY2l0LCBpbmRleCwgY291bnQsIGV0Yy5cbiAgICAgICAgICAgIHRoaXMuYWRkU3ltYm9sc1RvQ29tcGxldGlvbnMoY29udGV4dFRhYmxlLnZhbHVlcygpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYmluZGluZy5leHByZXNzaW9uICYmIGluU3Bhbih2YWx1ZVJlbGF0aXZlUG9zaXRpb24sIGJpbmRpbmcuZXhwcmVzc2lvbi5hc3Quc3BhbikpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0V4cHJlc3Npb25Db21wbGV0aW9ucyhiaW5kaW5nLmV4cHJlc3Npb24uYXN0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBpbmNvbXBsZXRlLCBmb3IgZXhhbXBsZSAqbmdGb3I9XCJsZXQgeCBvZiB8XCJcbiAgICAvLyBiaW5kaW5nLmV4cHJlc3Npb24gaXMgbnVsbC4gV2UgY291bGQgc3RpbGwgdHJ5IHRvIHByb3ZpZGUgc3VnZ2VzdGlvbnNcbiAgICAvLyBieSBsb29raW5nIGZvciBzeW1ib2xzIHRoYXQgYXJlIGluIHNjb3BlLlxuICAgIGNvbnN0IEtXX09GID0gJyBvZiAnO1xuICAgIGNvbnN0IG9mTG9jYXRpb24gPSBhdHRyLnZhbHVlLmluZGV4T2YoS1dfT0YpO1xuICAgIGlmIChvZkxvY2F0aW9uID4gMCAmJiB2YWx1ZVJlbGF0aXZlUG9zaXRpb24gPj0gb2ZMb2NhdGlvbiArIEtXX09GLmxlbmd0aCkge1xuICAgICAgY29uc3QgZXhwcmVzc2lvbkFzdCA9IHRoaXMuaW5mby5leHByZXNzaW9uUGFyc2VyLnBhcnNlQmluZGluZyhcbiAgICAgICAgICBhdHRyLnZhbHVlLCBhdHRyLnNvdXJjZVNwYW4udG9TdHJpbmcoKSwgYXR0ci5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCk7XG4gICAgICB0aGlzLnByb2Nlc3NFeHByZXNzaW9uQ29tcGxldGlvbnMoZXhwcmVzc2lvbkFzdCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZVRleHQodGVtcGxhdGU6IG5nLlRlbXBsYXRlU291cmNlLCBzcGFuOiBuZy5TcGFuKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRlbXBsYXRlLnNvdXJjZS5zdWJzdHJpbmcoc3Bhbi5zdGFydCwgc3Bhbi5lbmQpO1xufVxuXG5pbnRlcmZhY2UgQW5ndWxhckF0dHJpYnV0ZXMge1xuICAvKipcbiAgICogQXR0cmlidXRlcyB0aGF0IHN1cHBvcnQgdGhlICogc3ludGF4LiBTZWUgaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaS9jb3JlL1RlbXBsYXRlUmVmXG4gICAqL1xuICB0ZW1wbGF0ZVJlZnM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogQXR0cmlidXRlcyB3aXRoIHRoZSBASW5wdXQgYW5ub3RhdGlvbi5cbiAgICovXG4gIGlucHV0czogU2V0PHN0cmluZz47XG4gIC8qKlxuICAgKiBBdHRyaWJ1dGVzIHdpdGggdGhlIEBPdXRwdXQgYW5ub3RhdGlvbi5cbiAgICovXG4gIG91dHB1dHM6IFNldDxzdHJpbmc+O1xuICAvKipcbiAgICogQXR0cmlidXRlcyB0aGF0IHN1cHBvcnQgdGhlIFsoKV0gb3IgYmluZG9uLSBzeW50YXguXG4gICAqL1xuICBiYW5hbmFzOiBTZXQ8c3RyaW5nPjtcbiAgLyoqXG4gICAqIEdlbmVyYWwgYXR0cmlidXRlcyB0aGF0IG1hdGNoIHRoZSBzcGVjaWZpZWQgZWxlbWVudC5cbiAgICovXG4gIG90aGVyczogU2V0PHN0cmluZz47XG59XG5cbi8qKlxuICogUmV0dXJuIGFsbCBBbmd1bGFyLXNwZWNpZmljIGF0dHJpYnV0ZXMgZm9yIHRoZSBlbGVtZW50IHdpdGggYGVsZW1lbnROYW1lYC5cbiAqIEBwYXJhbSBpbmZvXG4gKiBAcGFyYW0gZWxlbWVudE5hbWVcbiAqL1xuZnVuY3Rpb24gYW5ndWxhckF0dHJpYnV0ZXMoaW5mbzogQXN0UmVzdWx0LCBlbGVtZW50TmFtZTogc3RyaW5nKTogQW5ndWxhckF0dHJpYnV0ZXMge1xuICBjb25zdCB7c2VsZWN0b3JzLCBtYXA6IHNlbGVjdG9yTWFwfSA9IGdldFNlbGVjdG9ycyhpbmZvKTtcbiAgY29uc3QgdGVtcGxhdGVSZWZzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBvdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGJhbmFuYXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgb3RoZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgJiYgc2VsZWN0b3IuZWxlbWVudCAhPT0gZWxlbWVudE5hbWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBzdW1tYXJ5ID0gc2VsZWN0b3JNYXAuZ2V0KHNlbGVjdG9yKSAhO1xuICAgIGNvbnN0IGlzVGVtcGxhdGVSZWYgPSBoYXNUZW1wbGF0ZVJlZmVyZW5jZShzdW1tYXJ5LnR5cGUpO1xuICAgIC8vIGF0dHJpYnV0ZXMgYXJlIGxpc3RlZCBpbiAoYXR0cmlidXRlLCB2YWx1ZSkgcGFpcnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9yLmF0dHJzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBjb25zdCBhdHRyID0gc2VsZWN0b3IuYXR0cnNbaV07XG4gICAgICBpZiAoaXNUZW1wbGF0ZVJlZikge1xuICAgICAgICB0ZW1wbGF0ZVJlZnMuYWRkKGF0dHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3RoZXJzLmFkZChhdHRyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBPYmplY3QudmFsdWVzKHN1bW1hcnkuaW5wdXRzKSkge1xuICAgICAgaW5wdXRzLmFkZChpbnB1dCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIE9iamVjdC52YWx1ZXMoc3VtbWFyeS5vdXRwdXRzKSkge1xuICAgICAgb3V0cHV0cy5hZGQob3V0cHV0KTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBuYW1lIG9mIGlucHV0cykge1xuICAgIC8vIEFkZCBiYW5hbmEtaW4tYS1ib3ggc3ludGF4XG4gICAgLy8gaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXN5bnRheCN0d28td2F5LWJpbmRpbmctXG4gICAgaWYgKG91dHB1dHMuaGFzKGAke25hbWV9Q2hhbmdlYCkpIHtcbiAgICAgIGJhbmFuYXMuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ge3RlbXBsYXRlUmVmcywgaW5wdXRzLCBvdXRwdXRzLCBiYW5hbmFzLCBvdGhlcnN9O1xufVxuIl19