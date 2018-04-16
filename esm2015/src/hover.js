/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { locateSymbol } from './locate_symbol';
export function getHover(info) {
    const result = locateSymbol(info);
    if (result) {
        return { text: hoverTextOf(result.symbol), span: result.span };
    }
}
function hoverTextOf(symbol) {
    const result = [{ text: symbol.kind }, { text: ' ' }, { text: symbol.name, language: symbol.language }];
    const container = symbol.container;
    if (container) {
        result.push({ text: ' of ' }, { text: container.name, language: container.language });
    }
    return result;
}
//# sourceMappingURL=hover.js.map