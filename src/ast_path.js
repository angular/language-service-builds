/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export class AstPath {
    constructor(path) {
        this.path = path;
    }
    get empty() { return !this.path || !this.path.length; }
    get head() { return this.path[0]; }
    get tail() { return this.path[this.path.length - 1]; }
    parentOf(node) { return this.path[this.path.indexOf(node) - 1]; }
    childOf(node) { return this.path[this.path.indexOf(node) + 1]; }
    first(ctor) {
        for (let i = this.path.length - 1; i >= 0; i--) {
            let item = this.path[i];
            if (item instanceof ctor)
                return item;
        }
    }
    push(node) { this.path.push(node); }
    pop() { return this.path.pop(); }
}
//# sourceMappingURL=ast_path.js.map