/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { identifierName } from '@angular/compiler';
import { CssSelector } from '@angular/compiler/src/selector';
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
    return span && exclusive ? position >= span.start && position < span.end :
        position >= span.start && position <= span.end;
}
export function offsetSpan(span, amount) {
    return { start: span.start + amount, end: span.end + amount };
}
export function isNarrower(spanA, spanB) {
    return spanA.start >= spanB.start && spanA.end <= spanB.end;
}
export function hasTemplateReference(type) {
    if (type.diDeps) {
        for (let diDep of type.diDeps) {
            if (diDep.token.identifier && identifierName(diDep.token.identifier) == 'TemplateRef')
                return true;
        }
    }
    return false;
}
export function getSelectors(info) {
    const map = new Map();
    const selectors = flatten(info.directives.map(directive => {
        const selectors = CssSelector.parse(directive.selector);
        selectors.forEach(selector => map.set(selector, directive));
        return selectors;
    }));
    return { selectors, map };
}
export function flatten(a) {
    return [].concat(...a);
}
export function removeSuffix(value, suffix) {
    if (value.endsWith(suffix))
        return value.substring(0, value.length - suffix.length);
    return value;
}
export function uniqueByName(elements) {
    if (elements) {
        const result = [];
        const set = new Set();
        for (const element of elements) {
            if (!set.has(element.name)) {
                set.add(element.name);
                result.push(element);
            }
        }
        return result;
    }
}
//# sourceMappingURL=utils.js.map