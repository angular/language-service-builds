/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { visitAll } from '@angular/compiler/src/ml_parser/ast';
import { AstPath } from './ast_path';
import { inSpan, spanOf } from './utils';
export class HtmlAstPath extends AstPath {
    constructor(ast, position) {
        super(buildPath(ast, position));
        this.position = position;
    }
}
function buildPath(ast, position) {
    let visitor = new HtmlAstPathBuilder(position);
    visitAll(visitor, ast);
    return visitor.getPath();
}
export class ChildVisitor {
    constructor(visitor) {
        this.visitor = visitor;
    }
    visitElement(ast, context) {
        this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.children);
        });
    }
    visitAttribute(ast, context) { }
    visitText(ast, context) { }
    visitComment(ast, context) { }
    visitExpansion(ast, context) {
        return this.visitChildren(context, visit => { visit(ast.cases); });
    }
    visitExpansionCase(ast, context) { }
    visitChildren(context, cb) {
        const visitor = this.visitor || this;
        let results = [];
        function visit(children) {
            if (children)
                results.push(visitAll(visitor, children, context));
        }
        cb(visit);
        return [].concat.apply([], results);
    }
}
class HtmlAstPathBuilder extends ChildVisitor {
    constructor(position) {
        super();
        this.position = position;
        this.path = [];
    }
    visit(ast, context) {
        let span = spanOf(ast);
        if (inSpan(this.position, span)) {
            this.path.push(ast);
        }
        else {
            // Returning a value here will result in the children being skipped.
            return true;
        }
    }
    getPath() { return this.path; }
}
//# sourceMappingURL=html_path.js.map