/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Lexer } from '@angular/compiler/src/expression_parser/lexer';
import { Parser } from '@angular/compiler/src/expression_parser/parser';
import { I18NHtmlParser } from '@angular/compiler/src/i18n/i18n_html_parser';
import { HtmlParser } from '@angular/compiler/src/ml_parser/html_parser';
import { DomElementSchemaRegistry } from '@angular/compiler/src/schema/dom_element_schema_registry';
import { TemplateParser } from '@angular/compiler/src/template_parser/template_parser';
import { getTemplateCompletions } from './completions';
import { getDefinition } from './definitions';
import { getDeclarationDiagnostics, getTemplateDiagnostics } from './diagnostics';
import { getHover } from './hover';
import { DiagnosticKind } from './types';
/**
 * Create an instance of an Angular `LanguageService`.
 *
 * @experimental
 */
export function createLanguageService(host) {
    return new LanguageServiceImpl(host);
}
class LanguageServiceImpl {
    constructor(host) {
        this.host = host;
    }
    get metadataResolver() { return this.host.resolver; }
    getTemplateReferences() { return this.host.getTemplateReferences(); }
    getDiagnostics(fileName) {
        let results = [];
        let templates = this.host.getTemplates(fileName);
        if (templates && templates.length) {
            results.push(...getTemplateDiagnostics(fileName, this, templates));
        }
        let declarations = this.host.getDeclarations(fileName);
        if (declarations && declarations.length) {
            const summary = this.host.getAnalyzedModules();
            results.push(...getDeclarationDiagnostics(declarations, summary));
        }
        return uniqueBySpan(results);
    }
    getPipesAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return templateInfo.pipes.map(pipeInfo => ({ name: pipeInfo.name, symbol: pipeInfo.type.reference }));
        }
    }
    getCompletionsAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getTemplateCompletions(templateInfo);
        }
    }
    getDefinitionAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getDefinition(templateInfo);
        }
    }
    getHoverAt(fileName, position) {
        let templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getHover(templateInfo);
        }
    }
    getTemplateAstAtPosition(fileName, position) {
        let template = this.host.getTemplateAt(fileName, position);
        if (template) {
            let astResult = this.getTemplateAst(template, fileName);
            if (astResult && astResult.htmlAst && astResult.templateAst)
                return {
                    position,
                    fileName,
                    template,
                    htmlAst: astResult.htmlAst,
                    directive: astResult.directive,
                    directives: astResult.directives,
                    pipes: astResult.pipes,
                    templateAst: astResult.templateAst,
                    expressionParser: astResult.expressionParser
                };
        }
        return undefined;
    }
    getTemplateAst(template, contextFile) {
        let result;
        try {
            const resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(template.type);
            const metadata = resolvedMetadata && resolvedMetadata.metadata;
            if (metadata) {
                const rawHtmlParser = new HtmlParser();
                const htmlParser = new I18NHtmlParser(rawHtmlParser);
                const expressionParser = new Parser(new Lexer());
                const parser = new TemplateParser(expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
                const htmlResult = htmlParser.parse(template.source, '');
                const analyzedModules = this.host.getAnalyzedModules();
                let errors = undefined;
                let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
                if (!ngModule) {
                    // Reported by the the declaration diagnostics.
                    ngModule = findSuitableDefaultModule(analyzedModules);
                }
                if (ngModule) {
                    const resolvedDirectives = ngModule.transitiveModule.directives.map(d => this.host.resolver.getNonNormalizedDirectiveMetadata(d.reference));
                    const directives = resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
                    const pipes = ngModule.transitiveModule.pipes.map(p => this.host.resolver.getOrLoadPipeMetadata(p.reference).toSummary());
                    const schemas = ngModule.schemas;
                    const parseResult = parser.tryParseHtml(htmlResult, metadata, template.source, directives, pipes, schemas, '');
                    result = {
                        htmlAst: htmlResult.rootNodes,
                        templateAst: parseResult.templateAst,
                        directive: metadata, directives, pipes,
                        parseErrors: parseResult.errors, expressionParser, errors
                    };
                }
            }
        }
        catch (e) {
            let span = template.span;
            if (e.fileName == contextFile) {
                span = template.query.getSpanAt(e.line, e.column) || span;
            }
            result = { errors: [{ kind: DiagnosticKind.Error, message: e.message, span }] };
        }
        return result;
    }
}
function uniqueBySpan(elements) {
    if (elements) {
        const result = [];
        const map = new Map();
        for (const element of elements) {
            let span = element.span;
            let set = map.get(span.start);
            if (!set) {
                set = new Set();
                map.set(span.start, set);
            }
            if (!set.has(span.end)) {
                set.add(span.end);
                result.push(element);
            }
        }
        return result;
    }
}
function findSuitableDefaultModule(modules) {
    let result;
    let resultSize = 0;
    for (const module of modules.ngModules) {
        const moduleSize = module.transitiveModule.directives.length;
        if (moduleSize > resultSize) {
            result = module;
            resultSize = moduleSize;
        }
    }
    return result;
}
//# sourceMappingURL=language_service.js.map