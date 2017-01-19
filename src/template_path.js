/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { templateVisitAll } from '@angular/compiler/src/template_parser/template_ast';
import { AstPath } from './ast_path';
import { inSpan, isNarrower, spanOf } from './utils';
export class TemplateAstPath extends AstPath {
    constructor(ast, position, allowWidening = false) {
        super(buildTemplatePath(ast, position, allowWidening));
        this.position = position;
    }
}
function buildTemplatePath(ast, position, allowWidening = false) {
    const visitor = new TemplateAstPathBuilder(position, allowWidening);
    templateVisitAll(visitor, ast);
    return visitor.getPath();
}
export class NullTemplateVisitor {
    visitNgContent(ast) { }
    visitEmbeddedTemplate(ast) { }
    visitElement(ast) { }
    visitReference(ast) { }
    visitVariable(ast) { }
    visitEvent(ast) { }
    visitElementProperty(ast) { }
    visitAttr(ast) { }
    visitBoundText(ast) { }
    visitText(ast) { }
    visitDirective(ast) { }
    visitDirectiveProperty(ast) { }
}
export class TemplateAstChildVisitor {
    constructor(visitor) {
        this.visitor = visitor;
    }
    // Nodes with children
    visitEmbeddedTemplate(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.references);
            visit(ast.variables);
            visit(ast.directives);
            visit(ast.providers);
            visit(ast.children);
        });
    }
    visitElement(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.attrs);
            visit(ast.inputs);
            visit(ast.outputs);
            visit(ast.references);
            visit(ast.directives);
            visit(ast.providers);
            visit(ast.children);
        });
    }
    visitDirective(ast, context) {
        return this.visitChildren(context, visit => {
            visit(ast.inputs);
            visit(ast.hostProperties);
            visit(ast.hostEvents);
        });
    }
    // Terminal nodes
    visitNgContent(ast, context) { }
    visitReference(ast, context) { }
    visitVariable(ast, context) { }
    visitEvent(ast, context) { }
    visitElementProperty(ast, context) { }
    visitAttr(ast, context) { }
    visitBoundText(ast, context) { }
    visitText(ast, context) { }
    visitDirectiveProperty(ast, context) { }
    visitChildren(context, cb) {
        const visitor = this.visitor || this;
        let results = [];
        function visit(children) {
            if (children && children.length)
                results.push(templateVisitAll(visitor, children, context));
        }
        cb(visit);
        return [].concat.apply([], results);
    }
}
class TemplateAstPathBuilder extends TemplateAstChildVisitor {
    constructor(position, allowWidening) {
        super();
        this.position = position;
        this.allowWidening = allowWidening;
        this.path = [];
    }
    visit(ast, context) {
        let span = spanOf(ast);
        if (inSpan(this.position, span)) {
            const len = this.path.length;
            if (!len || this.allowWidening || isNarrower(span, spanOf(this.path[len - 1]))) {
                this.path.push(ast);
            }
        }
        else {
            // Returning a value here will result in the children being skipped.
            return true;
        }
    }
    visitEmbeddedTemplate(ast, context) {
        return this.visitChildren(context, visit => {
            // Ignore reference, variable and providers
            visit(ast.attrs);
            visit(ast.directives);
            visit(ast.children);
        });
    }
    visitElement(ast, context) {
        return this.visitChildren(context, visit => {
            // Ingnore providers
            visit(ast.attrs);
            visit(ast.inputs);
            visit(ast.outputs);
            visit(ast.references);
            visit(ast.directives);
            visit(ast.children);
        });
    }
    visitDirective(ast, context) {
        // Ignore the host properties of a directive
        const result = this.visitChildren(context, visit => { visit(ast.inputs); });
        // We never care about the diretive itself, just its inputs.
        if (this.path[this.path.length - 1] == ast) {
            this.path.pop();
        }
        return result;
    }
    getPath() { return this.path; }
}
//# sourceMappingURL=template_path.js.map