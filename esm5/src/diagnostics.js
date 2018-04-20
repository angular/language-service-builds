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
    var results = [];
    var _loop_1 = function (template) {
        var ast = astProvider.getTemplateAst(template, fileName);
        if (ast) {
            if (ast.parseErrors && ast.parseErrors.length) {
                results.push.apply(results, ast.parseErrors.map(function (e) { return ({
                    kind: DiagnosticKind.Error,
                    span: offsetSpan(spanOf(e.span), template.span.start),
                    message: e.msg
                }); }));
            }
            else if (ast.templateAst && ast.htmlAst) {
                var info = {
                    templateAst: ast.templateAst,
                    htmlAst: ast.htmlAst,
                    offset: template.span.start,
                    query: template.query,
                    members: template.members
                };
                var expressionDiagnostics = getTemplateExpressionDiagnostics(info);
                results.push.apply(results, expressionDiagnostics);
            }
            if (ast.errors) {
                results.push.apply(results, ast.errors.map(function (e) { return ({ kind: e.kind, span: e.span || template.span, message: e.message }); }));
            }
        }
    };
    for (var _i = 0, templates_1 = templates; _i < templates_1.length; _i++) {
        var template = templates_1[_i];
        _loop_1(template);
    }
    return results;
}
export function getDeclarationDiagnostics(declarations, modules) {
    var results = [];
    var directives = undefined;
    var _loop_2 = function (declaration) {
        var report = function (message, span) {
            results.push({
                kind: DiagnosticKind.Error,
                span: span || declaration.declarationSpan, message: message
            });
        };
        for (var _i = 0, _a = declaration.errors; _i < _a.length; _i++) {
            var error = _a[_i];
            report(error.message, error.span);
        }
        if (declaration.metadata) {
            if (declaration.metadata.isComponent) {
                if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                    report("Component '" + declaration.type.name + "' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration");
                }
                var _b = declaration.metadata.template, template = _b.template, templateUrl = _b.templateUrl;
                if (template === null && !templateUrl) {
                    report("Component '" + declaration.type.name + "' must have a template or templateUrl");
                }
                else if (template && templateUrl) {
                    report("Component '" + declaration.type.name + "' must not have both template and templateUrl");
                }
            }
            else {
                if (!directives) {
                    directives = new Set();
                    modules.ngModules.forEach(function (module) {
                        module.declaredDirectives.forEach(function (directive) { directives.add(directive.reference); });
                    });
                }
                if (!directives.has(declaration.type)) {
                    report("Directive '" + declaration.type.name + "' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration");
                }
            }
        }
    };
    for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
        var declaration = declarations_1[_i];
        _loop_2(declaration);
    }
    return results;
}
//# sourceMappingURL=diagnostics.js.map