/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Attribute, ElementAst, findNode, tokenReference } from '@angular/compiler';
import { getExpressionScope } from '@angular/compiler-cli/src/language_services';
import { getExpressionSymbol } from './expressions';
import { diagnosticInfoFromTemplateInfo, findTemplateAstAt, inSpan, offsetSpan, spanOf } from './utils';
export function locateSymbol(info) {
    if (!info.position)
        return undefined;
    const templatePosition = info.position - info.template.span.start;
    const path = findTemplateAstAt(info.templateAst, templatePosition);
    if (path.tail) {
        let symbol = undefined;
        let span = undefined;
        const attributeValueSymbol = (ast, inEvent = false) => {
            const attribute = findAttribute(info);
            if (attribute) {
                if (inSpan(templatePosition, spanOf(attribute.valueSpan))) {
                    const dinfo = diagnosticInfoFromTemplateInfo(info);
                    const scope = getExpressionScope(dinfo, path, inEvent);
                    if (attribute.valueSpan) {
                        const expressionOffset = attribute.valueSpan.start.offset + 1;
                        const result = getExpressionSymbol(scope, ast, templatePosition - expressionOffset, info.template.query);
                        if (result) {
                            symbol = result.symbol;
                            span = offsetSpan(result.span, expressionOffset);
                        }
                    }
                    return true;
                }
            }
            return false;
        };
        path.tail.visit({
            visitNgContent(ast) { },
            visitEmbeddedTemplate(ast) { },
            visitElement(ast) {
                const component = ast.directives.find(d => d.directive.isComponent);
                if (component) {
                    symbol = info.template.query.getTypeSymbol(component.directive.type.reference);
                    symbol = symbol && new OverrideKindSymbol(symbol, 'component');
                    span = spanOf(ast);
                }
                else {
                    // Find a directive that matches the element name
                    const directive = ast.directives.find(d => d.directive.selector != null && d.directive.selector.indexOf(ast.name) >= 0);
                    if (directive) {
                        symbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                        symbol = symbol && new OverrideKindSymbol(symbol, 'directive');
                        span = spanOf(ast);
                    }
                }
            },
            visitReference(ast) {
                symbol = ast.value && info.template.query.getTypeSymbol(tokenReference(ast.value));
                span = spanOf(ast);
            },
            visitVariable(ast) { },
            visitEvent(ast) {
                if (!attributeValueSymbol(ast.handler, /* inEvent */ true)) {
                    symbol = findOutputBinding(info, path, ast);
                    symbol = symbol && new OverrideKindSymbol(symbol, 'event');
                    span = spanOf(ast);
                }
            },
            visitElementProperty(ast) { attributeValueSymbol(ast.value); },
            visitAttr(ast) { },
            visitBoundText(ast) {
                const expressionPosition = templatePosition - ast.sourceSpan.start.offset;
                if (inSpan(expressionPosition, ast.value.span)) {
                    const dinfo = diagnosticInfoFromTemplateInfo(info);
                    const scope = getExpressionScope(dinfo, path, /* includeEvent */ false);
                    const result = getExpressionSymbol(scope, ast.value, expressionPosition, info.template.query);
                    if (result) {
                        symbol = result.symbol;
                        span = offsetSpan(result.span, ast.sourceSpan.start.offset);
                    }
                }
            },
            visitText(ast) { },
            visitDirective(ast) {
                symbol = info.template.query.getTypeSymbol(ast.directive.type.reference);
                span = spanOf(ast);
            },
            visitDirectiveProperty(ast) {
                if (!attributeValueSymbol(ast.value)) {
                    symbol = findInputBinding(info, path, ast);
                    span = spanOf(ast);
                }
            }
        }, null);
        if (symbol && span) {
            return { symbol, span: offsetSpan(span, info.template.span.start) };
        }
    }
}
function findAttribute(info) {
    if (info.position) {
        const templatePosition = info.position - info.template.span.start;
        const path = findNode(info.htmlAst, templatePosition);
        return path.first(Attribute);
    }
}
function findInputBinding(info, path, binding) {
    const element = path.first(ElementAst);
    if (element) {
        for (const directive of element.directives) {
            const invertedInput = invertMap(directive.directive.inputs);
            const fieldName = invertedInput[binding.templateName];
            if (fieldName) {
                const classSymbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                if (classSymbol) {
                    return classSymbol.members().get(fieldName);
                }
            }
        }
    }
}
function findOutputBinding(info, path, binding) {
    const element = path.first(ElementAst);
    if (element) {
        for (const directive of element.directives) {
            const invertedOutputs = invertMap(directive.directive.outputs);
            const fieldName = invertedOutputs[binding.name];
            if (fieldName) {
                const classSymbol = info.template.query.getTypeSymbol(directive.directive.type.reference);
                if (classSymbol) {
                    return classSymbol.members().get(fieldName);
                }
            }
        }
    }
}
function invertMap(obj) {
    const result = {};
    for (const name of Object.keys(obj)) {
        const v = obj[name];
        result[v] = name;
    }
    return result;
}
/**
 * Wrap a symbol and change its kind to component.
 */
class OverrideKindSymbol {
    constructor(sym, kindOverride) {
        this.sym = sym;
        this.kind = kindOverride;
    }
    get name() { return this.sym.name; }
    get language() { return this.sym.language; }
    get type() { return this.sym.type; }
    get container() { return this.sym.container; }
    get public() { return this.sym.public; }
    get callable() { return this.sym.callable; }
    get nullable() { return this.sym.nullable; }
    get definition() { return this.sym.definition; }
    members() { return this.sym.members(); }
    signatures() { return this.sym.signatures(); }
    selectSignature(types) { return this.sym.selectSignature(types); }
    indexed(argument) { return this.sym.indexed(argument); }
}
//# sourceMappingURL=locate_symbol.js.map