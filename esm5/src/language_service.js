/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompilerConfig, DomElementSchemaRegistry, HtmlParser, I18NHtmlParser, Lexer, Parser, TemplateParser } from '@angular/compiler';
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
var LanguageServiceImpl = /** @class */ (function () {
    function LanguageServiceImpl(host) {
        this.host = host;
    }
    Object.defineProperty(LanguageServiceImpl.prototype, "metadataResolver", {
        get: function () { return this.host.resolver; },
        enumerable: true,
        configurable: true
    });
    LanguageServiceImpl.prototype.getTemplateReferences = function () { return this.host.getTemplateReferences(); };
    LanguageServiceImpl.prototype.getDiagnostics = function (fileName) {
        var results = [];
        var templates = this.host.getTemplates(fileName);
        if (templates && templates.length) {
            results.push.apply(results, getTemplateDiagnostics(fileName, this, templates));
        }
        var declarations = this.host.getDeclarations(fileName);
        if (declarations && declarations.length) {
            var summary = this.host.getAnalyzedModules();
            results.push.apply(results, getDeclarationDiagnostics(declarations, summary));
        }
        return uniqueBySpan(results);
    };
    LanguageServiceImpl.prototype.getPipesAt = function (fileName, position) {
        var templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return templateInfo.pipes;
        }
        return [];
    };
    LanguageServiceImpl.prototype.getCompletionsAt = function (fileName, position) {
        var templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getTemplateCompletions(templateInfo);
        }
    };
    LanguageServiceImpl.prototype.getDefinitionAt = function (fileName, position) {
        var templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getDefinition(templateInfo);
        }
    };
    LanguageServiceImpl.prototype.getHoverAt = function (fileName, position) {
        var templateInfo = this.getTemplateAstAtPosition(fileName, position);
        if (templateInfo) {
            return getHover(templateInfo);
        }
    };
    LanguageServiceImpl.prototype.getTemplateAstAtPosition = function (fileName, position) {
        var template = this.host.getTemplateAt(fileName, position);
        if (template) {
            var astResult = this.getTemplateAst(template, fileName);
            if (astResult && astResult.htmlAst && astResult.templateAst && astResult.directive &&
                astResult.directives && astResult.pipes && astResult.expressionParser)
                return {
                    position: position,
                    fileName: fileName,
                    template: template,
                    htmlAst: astResult.htmlAst,
                    directive: astResult.directive,
                    directives: astResult.directives,
                    pipes: astResult.pipes,
                    templateAst: astResult.templateAst,
                    expressionParser: astResult.expressionParser
                };
        }
        return undefined;
    };
    LanguageServiceImpl.prototype.getTemplateAst = function (template, contextFile) {
        var _this = this;
        var result = undefined;
        try {
            var resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(template.type);
            var metadata = resolvedMetadata && resolvedMetadata.metadata;
            if (metadata) {
                var rawHtmlParser = new HtmlParser();
                var htmlParser = new I18NHtmlParser(rawHtmlParser);
                var expressionParser = new Parser(new Lexer());
                var config = new CompilerConfig();
                var parser = new TemplateParser(config, this.host.resolver.getReflector(), expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
                var htmlResult = htmlParser.parse(template.source, '', true);
                var analyzedModules = this.host.getAnalyzedModules();
                var errors = undefined;
                var ngModule = analyzedModules.ngModuleByPipeOrDirective.get(template.type);
                if (!ngModule) {
                    // Reported by the the declaration diagnostics.
                    ngModule = findSuitableDefaultModule(analyzedModules);
                }
                if (ngModule) {
                    var resolvedDirectives = ngModule.transitiveModule.directives.map(function (d) { return _this.host.resolver.getNonNormalizedDirectiveMetadata(d.reference); });
                    var directives = removeMissing(resolvedDirectives).map(function (d) { return d.metadata.toSummary(); });
                    var pipes = ngModule.transitiveModule.pipes.map(function (p) { return _this.host.resolver.getOrLoadPipeMetadata(p.reference).toSummary(); });
                    var schemas = ngModule.schemas;
                    var parseResult = parser.tryParseHtml(htmlResult, metadata, directives, pipes, schemas);
                    result = {
                        htmlAst: htmlResult.rootNodes,
                        templateAst: parseResult.templateAst,
                        directive: metadata, directives: directives, pipes: pipes,
                        parseErrors: parseResult.errors, expressionParser: expressionParser, errors: errors
                    };
                }
            }
        }
        catch (e) {
            var span = template.span;
            if (e.fileName == contextFile) {
                span = template.query.getSpanAt(e.line, e.column) || span;
            }
            result = { errors: [{ kind: DiagnosticKind.Error, message: e.message, span: span }] };
        }
        return result || {};
    };
    return LanguageServiceImpl;
}());
function removeMissing(values) {
    return values.filter(function (e) { return !!e; });
}
function uniqueBySpan(elements) {
    if (elements) {
        var result = [];
        var map = new Map();
        for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
            var element = elements_1[_i];
            var span = element.span;
            var set = map.get(span.start);
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
    var result = undefined;
    var resultSize = 0;
    for (var _i = 0, _a = modules.ngModules; _i < _a.length; _i++) {
        var module_1 = _a[_i];
        var moduleSize = module_1.transitiveModule.directives.length;
        if (moduleSize > resultSize) {
            result = module_1;
            resultSize = moduleSize;
        }
    }
    return result;
}
//# sourceMappingURL=language_service.js.map