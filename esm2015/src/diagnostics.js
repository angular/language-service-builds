/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getTemplateExpressionDiagnostics } from '@angular/compiler-cli/src/language_services';
import { DiagnosticKind } from './types';
import { offsetSpan, spanOf } from './utils';
export function getTemplateDiagnostics(fileName, astProvider, templates) {
    const results = [];
    for (const template of templates) {
        const ast = astProvider.getTemplateAst(template, fileName);
        if (ast) {
            if (ast.parseErrors && ast.parseErrors.length) {
                results.push(...ast.parseErrors.map(e => ({
                    kind: DiagnosticKind.Error,
                    span: offsetSpan(spanOf(e.span), template.span.start),
                    message: e.msg
                })));
            }
            else if (ast.templateAst && ast.htmlAst) {
                const info = {
                    templateAst: ast.templateAst,
                    htmlAst: ast.htmlAst,
                    offset: template.span.start,
                    query: template.query,
                    members: template.members
                };
                const expressionDiagnostics = getTemplateExpressionDiagnostics(info);
                results.push(...expressionDiagnostics);
            }
            if (ast.errors) {
                results.push(...ast.errors.map(e => ({ kind: e.kind, span: e.span || template.span, message: e.message })));
            }
        }
    }
    return results;
}
export function getDeclarationDiagnostics(declarations, modules) {
    const results = [];
    let directives = undefined;
    for (const declaration of declarations) {
        const report = (message, span) => {
            results.push({
                kind: DiagnosticKind.Error,
                span: span || declaration.declarationSpan, message
            });
        };
        for (const error of declaration.errors) {
            report(error.message, error.span);
        }
        if (declaration.metadata) {
            if (declaration.metadata.isComponent) {
                if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                    report(`Component '${declaration.type.name}' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration`);
                }
                const { template, templateUrl } = declaration.metadata.template;
                if (template === null && !templateUrl) {
                    report(`Component '${declaration.type.name}' must have a template or templateUrl`);
                }
                else if (template && templateUrl) {
                    report(`Component '${declaration.type.name}' must not have both template and templateUrl`);
                }
            }
            else {
                if (!directives) {
                    directives = new Set();
                    modules.ngModules.forEach(module => {
                        module.declaredDirectives.forEach(directive => { directives.add(directive.reference); });
                    });
                }
                if (!directives.has(declaration.type)) {
                    report(`Directive '${declaration.type.name}' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration`);
                }
            }
        }
    }
    return results;
}
//# sourceMappingURL=diagnostics.js.map