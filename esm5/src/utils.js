/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { AstPath, CssSelector, RecursiveTemplateAstVisitor, identifierName, templateVisitAll } from '@angular/compiler';
import * as ts from 'typescript';
export function isParseSourceSpan(value) {
    return value && !!value.start;
}
export function spanOf(span) {
    if (!span)
        return undefined;
    if (isParseSourceSpan(span)) {
        return { start: span.start.offset, end: span.end.offset };
    }
    else {
        if (span.endSourceSpan) {
            return { start: span.sourceSpan.start.offset, end: span.endSourceSpan.end.offset };
        }
        else if (span.children && span.children.length) {
            return {
                start: span.sourceSpan.start.offset,
                end: spanOf(span.children[span.children.length - 1]).end
            };
        }
        return { start: span.sourceSpan.start.offset, end: span.sourceSpan.end.offset };
    }
}
export function inSpan(position, span, exclusive) {
    return span != null && (exclusive ? position >= span.start && position < span.end :
        position >= span.start && position <= span.end);
}
export function offsetSpan(span, amount) {
    return { start: span.start + amount, end: span.end + amount };
}
export function isNarrower(spanA, spanB) {
    return spanA.start >= spanB.start && spanA.end <= spanB.end;
}
export function hasTemplateReference(type) {
    if (type.diDeps) {
        for (var _i = 0, _a = type.diDeps; _i < _a.length; _i++) {
            var diDep = _a[_i];
            if (diDep.token && diDep.token.identifier &&
                identifierName(diDep.token.identifier) == 'TemplateRef')
                return true;
        }
    }
    return false;
}
export function getSelectors(info) {
    var map = new Map();
    var selectors = flatten(info.directives.map(function (directive) {
        var selectors = CssSelector.parse(directive.selector);
        selectors.forEach(function (selector) { return map.set(selector, directive); });
        return selectors;
    }));
    return { selectors: selectors, map: map };
}
export function flatten(a) {
    return (_a = []).concat.apply(_a, a);
    var _a;
}
export function removeSuffix(value, suffix) {
    if (value.endsWith(suffix))
        return value.substring(0, value.length - suffix.length);
    return value;
}
export function uniqueByName(elements) {
    if (elements) {
        var result = [];
        var set = new Set();
        for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
            var element = elements_1[_i];
            if (!set.has(element.name)) {
                set.add(element.name);
                result.push(element);
            }
        }
        return result;
    }
}
export function isTypescriptVersion(low, high) {
    var version = ts.version;
    if (version.substring(0, low.length) < low)
        return false;
    if (high && (version.substring(0, high.length) > high))
        return false;
    return true;
}
export function diagnosticInfoFromTemplateInfo(info) {
    return {
        fileName: info.fileName,
        offset: info.template.span.start,
        query: info.template.query,
        members: info.template.members,
        htmlAst: info.htmlAst,
        templateAst: info.templateAst
    };
}
export function findTemplateAstAt(ast, position, allowWidening) {
    if (allowWidening === void 0) { allowWidening = false; }
    var path = [];
    var visitor = new /** @class */ (function (_super) {
        tslib_1.__extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.visit = function (ast, context) {
            var span = spanOf(ast);
            if (inSpan(position, span)) {
                var len = path.length;
                if (!len || allowWidening || isNarrower(span, spanOf(path[len - 1]))) {
                    path.push(ast);
                }
            }
            else {
                // Returning a value here will result in the children being skipped.
                return true;
            }
        };
        class_1.prototype.visitEmbeddedTemplate = function (ast, context) {
            return this.visitChildren(context, function (visit) {
                // Ignore reference, variable and providers
                visit(ast.attrs);
                visit(ast.directives);
                visit(ast.children);
            });
        };
        class_1.prototype.visitElement = function (ast, context) {
            return this.visitChildren(context, function (visit) {
                // Ingnore providers
                visit(ast.attrs);
                visit(ast.inputs);
                visit(ast.outputs);
                visit(ast.references);
                visit(ast.directives);
                visit(ast.children);
            });
        };
        class_1.prototype.visitDirective = function (ast, context) {
            // Ignore the host properties of a directive
            var result = this.visitChildren(context, function (visit) { visit(ast.inputs); });
            // We never care about the diretive itself, just its inputs.
            if (path[path.length - 1] == ast) {
                path.pop();
            }
            return result;
        };
        return class_1;
    }(RecursiveTemplateAstVisitor));
    templateVisitAll(visitor, ast);
    return new AstPath(path, position);
}
//# sourceMappingURL=utils.js.map