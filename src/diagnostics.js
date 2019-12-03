/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/src/diagnostics", ["require", "exports", "tslib", "path", "typescript", "@angular/language-service/src/expression_diagnostics", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var expression_diagnostics_1 = require("@angular/language-service/src/expression_diagnostics");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Return diagnostic information for the parsed AST of the template.
     * @param ast contains HTML and template AST
     */
    function getTemplateDiagnostics(ast) {
        var parseErrors = ast.parseErrors, templateAst = ast.templateAst, htmlAst = ast.htmlAst, template = ast.template;
        if (parseErrors && parseErrors.length) {
            return parseErrors.map(function (e) {
                return {
                    kind: ts.DiagnosticCategory.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            });
        }
        return expression_diagnostics_1.getTemplateExpressionDiagnostics({
            templateAst: templateAst,
            htmlAst: htmlAst,
            offset: template.span.start,
            query: template.query,
            members: template.members,
        });
    }
    exports.getTemplateDiagnostics = getTemplateDiagnostics;
    /**
     * Generate an error message that indicates a directive is not part of any
     * NgModule.
     * @param name class name
     * @param isComponent true if directive is an Angular Component
     */
    function missingDirective(name, isComponent) {
        var type = isComponent ? 'Component' : 'Directive';
        return type + " '" + name + "' is not included in a module and will not be " +
            'available inside a template. Consider adding it to a NgModule declaration.';
    }
    /**
     * Performs a variety diagnostics on directive declarations.
     *
     * @param declarations Angular directive declarations
     * @param modules NgModules in the project
     * @param host TypeScript service host used to perform TypeScript queries
     * @return diagnosed errors, if any
     */
    function getDeclarationDiagnostics(declarations, modules, host) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        var directives = new Set();
        try {
            for (var _e = tslib_1.__values(modules.ngModules), _f = _e.next(); !_f.done; _f = _e.next()) {
                var ngModule = _f.value;
                try {
                    for (var _g = (e_2 = void 0, tslib_1.__values(ngModule.declaredDirectives)), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var directive = _h.value;
                        directives.add(directive.reference);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var results = [];
        try {
            for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var declaration = declarations_1_1.value;
                var errors = declaration.errors, metadata = declaration.metadata, type = declaration.type, declarationSpan = declaration.declarationSpan;
                var sf = host.getSourceFile(type.filePath);
                if (!sf) {
                    host.error("directive " + type.name + " exists but has no source file");
                    return [];
                }
                // TypeScript identifier of the directive declaration annotation (e.g. "Component" or
                // "Directive") on a directive class.
                var directiveIdentifier = utils_1.findTightestNode(sf, declarationSpan.start);
                if (!directiveIdentifier) {
                    host.error("directive " + type.name + " exists but has no identifier");
                    return [];
                }
                try {
                    for (var errors_1 = (e_4 = void 0, tslib_1.__values(errors)), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
                        var error = errors_1_1.value;
                        results.push({
                            kind: ts.DiagnosticCategory.Error,
                            message: error.message,
                            span: error.span,
                        });
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (errors_1_1 && !errors_1_1.done && (_d = errors_1.return)) _d.call(errors_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                if (!metadata) {
                    continue; // declaration is not an Angular directive
                }
                if (metadata.isComponent) {
                    if (!modules.ngModuleByPipeOrDirective.has(declaration.type)) {
                        results.push({
                            kind: ts.DiagnosticCategory.Suggestion,
                            message: missingDirective(type.name, metadata.isComponent),
                            span: declarationSpan,
                        });
                    }
                    var _j = metadata.template, template = _j.template, templateUrl = _j.templateUrl, styleUrls = _j.styleUrls;
                    if (template === null && !templateUrl) {
                        results.push({
                            kind: ts.DiagnosticCategory.Error,
                            message: "Component '" + type.name + "' must have a template or templateUrl",
                            span: declarationSpan,
                        });
                    }
                    else if (templateUrl) {
                        if (template) {
                            results.push({
                                kind: ts.DiagnosticCategory.Error,
                                message: "Component '" + type.name + "' must not have both template and templateUrl",
                                span: declarationSpan,
                            });
                        }
                        // Find templateUrl value from the directive call expression, which is the parent of the
                        // directive identifier.
                        //
                        // TODO: We should create an enum of the various properties a directive can have to use
                        // instead of string literals. We can then perform a mass migration of all literal usages.
                        var templateUrlNode = utils_1.findPropertyValueOfType(directiveIdentifier.parent, 'templateUrl', ts.isLiteralExpression);
                        if (!templateUrlNode) {
                            host.error("templateUrl " + templateUrl + " exists but its TypeScript node doesn't");
                            return [];
                        }
                        results.push.apply(results, tslib_1.__spread(validateUrls([templateUrlNode], host.tsLsHost)));
                    }
                    if (styleUrls.length > 0) {
                        // Find styleUrls value from the directive call expression, which is the parent of the
                        // directive identifier.
                        var styleUrlsNode = utils_1.findPropertyValueOfType(directiveIdentifier.parent, 'styleUrls', ts.isArrayLiteralExpression);
                        if (!styleUrlsNode) {
                            host.error("styleUrls property exists but its TypeScript node doesn't'");
                            return [];
                        }
                        results.push.apply(results, tslib_1.__spread(validateUrls(styleUrlsNode.elements, host.tsLsHost)));
                    }
                }
                else if (!directives.has(declaration.type)) {
                    results.push({
                        kind: ts.DiagnosticCategory.Suggestion,
                        message: missingDirective(type.name, metadata.isComponent),
                        span: declarationSpan,
                    });
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_c = declarations_1.return)) _c.call(declarations_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return results;
    }
    exports.getDeclarationDiagnostics = getDeclarationDiagnostics;
    /**
     * Checks that URLs on a directive point to a valid file.
     * Note that this diagnostic check may require a filesystem hit, and thus may be slower than other
     * checks.
     *
     * @param urls urls to check for validity
     * @param tsLsHost TS LS host used for querying filesystem information
     * @return diagnosed url errors, if any
     */
    function validateUrls(urls, tsLsHost) {
        if (!tsLsHost.fileExists) {
            return [];
        }
        var allErrors = [];
        // TODO(ayazhafiz): most of this logic can be unified with the logic in
        // definitions.ts#getUrlFromProperty. Create a utility function to be used by both.
        for (var i = 0; i < urls.length; ++i) {
            var urlNode = urls[i];
            if (!ts.isStringLiteralLike(urlNode)) {
                // If a non-string value is assigned to a URL node (like `templateUrl`), a type error will be
                // picked up by the TS Language Server.
                continue;
            }
            var curPath = urlNode.getSourceFile().fileName;
            var url = path.join(path.dirname(curPath), urlNode.text);
            if (tsLsHost.fileExists(url))
                continue;
            allErrors.push({
                kind: ts.DiagnosticCategory.Error,
                message: "URL does not point to a valid file",
                // Exclude opening and closing quotes in the url span.
                span: { start: urlNode.getStart() + 1, end: urlNode.end - 1 },
            });
        }
        return allErrors;
    }
    /**
     * Return a recursive data structure that chains diagnostic messages.
     * @param chain
     */
    function chainDiagnostics(chain) {
        return {
            messageText: chain.message,
            category: ts.DiagnosticCategory.Error,
            code: 0,
            next: chain.next ? chain.next.map(chainDiagnostics) : undefined
        };
    }
    /**
     * Convert ng.Diagnostic to ts.Diagnostic.
     * @param d diagnostic
     * @param file
     */
    function ngDiagnosticToTsDiagnostic(d, file) {
        return {
            file: file,
            start: d.span.start,
            length: d.span.end - d.span.start,
            messageText: typeof d.message === 'string' ? d.message : chainDiagnostics(d.message),
            category: d.kind,
            code: 0,
            source: 'ng',
        };
    }
    exports.ngDiagnosticToTsDiagnostic = ngDiagnosticToTsDiagnostic;
    /**
     * Return elements filtered by unique span.
     * @param elements
     */
    function uniqueBySpan(elements) {
        var e_5, _a;
        var result = [];
        var map = new Map();
        try {
            for (var elements_1 = tslib_1.__values(elements), elements_1_1 = elements_1.next(); !elements_1_1.done; elements_1_1 = elements_1.next()) {
                var element = elements_1_1.value;
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
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (elements_1_1 && !elements_1_1.done && (_a = elements_1.return)) _a.call(elements_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return result;
    }
    exports.uniqueBySpan = uniqueBySpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBR2pDLCtGQUEwRTtJQUcxRSw2REFBc0Y7SUFHdEY7OztPQUdHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsR0FBYztRQUM1QyxJQUFBLDZCQUFXLEVBQUUsNkJBQVcsRUFBRSxxQkFBTyxFQUFFLHVCQUFRLENBQVE7UUFDMUQsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRTtZQUNyQyxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2dCQUN0QixPQUFPO29CQUNMLElBQUksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztvQkFDakMsSUFBSSxFQUFFLGtCQUFVLENBQUMsY0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDckQsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHO2lCQUNmLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyx5REFBZ0MsQ0FBQztZQUN0QyxXQUFXLEVBQUUsV0FBVztZQUN4QixPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87U0FDMUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQWxCRCx3REFrQkM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLFdBQW9CO1FBQzFELElBQU0sSUFBSSxH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UmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ0FuYWx5emVkTW9kdWxlc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljc30gZnJvbSAnLi9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcbmltcG9ydCB7ZmluZFByb3BlcnR5VmFsdWVPZlR5cGUsIGZpbmRUaWdodGVzdE5vZGUsIG9mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBSZXR1cm4gZGlhZ25vc3RpYyBpbmZvcm1hdGlvbiBmb3IgdGhlIHBhcnNlZCBBU1Qgb2YgdGhlIHRlbXBsYXRlLlxuICogQHBhcmFtIGFzdCBjb250YWlucyBIVE1MIGFuZCB0ZW1wbGF0ZSBBU1RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoYXN0OiBBc3RSZXN1bHQpOiBuZy5EaWFnbm9zdGljW10ge1xuICBjb25zdCB7cGFyc2VFcnJvcnMsIHRlbXBsYXRlQXN0LCBodG1sQXN0LCB0ZW1wbGF0ZX0gPSBhc3Q7XG4gIGlmIChwYXJzZUVycm9ycyAmJiBwYXJzZUVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcGFyc2VFcnJvcnMubWFwKGUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzcGFuOiBvZmZzZXRTcGFuKHNwYW5PZihlLnNwYW4pLCB0ZW1wbGF0ZS5zcGFuLnN0YXJ0KSxcbiAgICAgICAgbWVzc2FnZTogZS5tc2csXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljcyh7XG4gICAgdGVtcGxhdGVBc3Q6IHRlbXBsYXRlQXN0LFxuICAgIGh0bWxBc3Q6IGh0bWxBc3QsXG4gICAgb2Zmc2V0OiB0ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgIHF1ZXJ5OiB0ZW1wbGF0ZS5xdWVyeSxcbiAgICBtZW1iZXJzOiB0ZW1wbGF0ZS5tZW1iZXJzLFxuICB9KTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBlcnJvciBtZXNzYWdlIHRoYXQgaW5kaWNhdGVzIGEgZGlyZWN0aXZlIGlzIG5vdCBwYXJ0IG9mIGFueVxuICogTmdNb2R1bGUuXG4gKiBAcGFyYW0gbmFtZSBjbGFzcyBuYW1lXG4gKiBAcGFyYW0gaXNDb21wb25lbnQgdHJ1ZSBpZiBkaXJlY3RpdmUgaXMgYW4gQW5ndWxhciBDb21wb25lbnRcbiAqL1xuZnVuY3Rpb24gbWlzc2luZ0RpcmVjdGl2ZShuYW1lOiBzdHJpbmcsIGlzQ29tcG9uZW50OiBib29sZWFuKSB7XG4gIGNvbnN0IHR5cGUgPSBpc0NvbXBvbmVudCA/ICdDb21wb25lbnQnIDogJ0RpcmVjdGl2ZSc7XG4gIHJldHVybiBgJHt0eXBlfSAnJHtuYW1lfScgaXMgbm90IGluY2x1ZGVkIGluIGEgbW9kdWxlIGFuZCB3aWxsIG5vdCBiZSBgICtcbiAgICAgICdhdmFpbGFibGUgaW5zaWRlIGEgdGVtcGxhdGUuIENvbnNpZGVyIGFkZGluZyBpdCB0byBhIE5nTW9kdWxlIGRlY2xhcmF0aW9uLic7XG59XG5cbi8qKlxuICogUGVyZm9ybXMgYSB2YXJpZXR5IGRpYWdub3N0aWNzIG9uIGRpcmVjdGl2ZSBkZWNsYXJhdGlvbnMuXG4gKlxuICogQHBhcmFtIGRlY2xhcmF0aW9ucyBBbmd1bGFyIGRpcmVjdGl2ZSBkZWNsYXJhdGlvbnNcbiAqIEBwYXJhbSBtb2R1bGVzIE5nTW9kdWxlcyBpbiB0aGUgcHJvamVjdFxuICogQHBhcmFtIGhvc3QgVHlwZVNjcmlwdCBzZXJ2aWNlIGhvc3QgdXNlZCB0byBwZXJmb3JtIFR5cGVTY3JpcHQgcXVlcmllc1xuICogQHJldHVybiBkaWFnbm9zZWQgZXJyb3JzLCBpZiBhbnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlY2xhcmF0aW9uRGlhZ25vc3RpY3MoXG4gICAgZGVjbGFyYXRpb25zOiBuZy5EZWNsYXJhdGlvbltdLCBtb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyxcbiAgICBob3N0OiBSZWFkb25seTxUeXBlU2NyaXB0U2VydmljZUhvc3Q+KTogbmcuRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgZGlyZWN0aXZlcyA9IG5ldyBTZXQ8bmcuU3RhdGljU3ltYm9sPigpO1xuICBmb3IgKGNvbnN0IG5nTW9kdWxlIG9mIG1vZHVsZXMubmdNb2R1bGVzKSB7XG4gICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgbmdNb2R1bGUuZGVjbGFyZWREaXJlY3RpdmVzKSB7XG4gICAgICBkaXJlY3RpdmVzLmFkZChkaXJlY3RpdmUucmVmZXJlbmNlKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCByZXN1bHRzOiBuZy5EaWFnbm9zdGljW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGRlY2xhcmF0aW9uIG9mIGRlY2xhcmF0aW9ucykge1xuICAgIGNvbnN0IHtlcnJvcnMsIG1ldGFkYXRhLCB0eXBlLCBkZWNsYXJhdGlvblNwYW59ID0gZGVjbGFyYXRpb247XG5cbiAgICBjb25zdCBzZiA9IGhvc3QuZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgICBpZiAoIXNmKSB7XG4gICAgICBob3N0LmVycm9yKGBkaXJlY3RpdmUgJHt0eXBlLm5hbWV9IGV4aXN0cyBidXQgaGFzIG5vIHNvdXJjZSBmaWxlYCk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIC8vIFR5cGVTY3JpcHQgaWRlbnRpZmllciBvZiB0aGUgZGlyZWN0aXZlIGRlY2xhcmF0aW9uIGFubm90YXRpb24gKGUuZy4gXCJDb21wb25lbnRcIiBvclxuICAgIC8vIFwiRGlyZWN0aXZlXCIpIG9uIGEgZGlyZWN0aXZlIGNsYXNzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUlkZW50aWZpZXIgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBkZWNsYXJhdGlvblNwYW4uc3RhcnQpO1xuICAgIGlmICghZGlyZWN0aXZlSWRlbnRpZmllcikge1xuICAgICAgaG9zdC5lcnJvcihgZGlyZWN0aXZlICR7dHlwZS5uYW1lfSBleGlzdHMgYnV0IGhhcyBubyBpZGVudGlmaWVyYCk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBlcnJvciBvZiBlcnJvcnMpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3BhbjogZXJyb3Iuc3BhbixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoIW1ldGFkYXRhKSB7XG4gICAgICBjb250aW51ZTsgIC8vIGRlY2xhcmF0aW9uIGlzIG5vdCBhbiBBbmd1bGFyIGRpcmVjdGl2ZVxuICAgIH1cbiAgICBpZiAobWV0YWRhdGEuaXNDb21wb25lbnQpIHtcbiAgICAgIGlmICghbW9kdWxlcy5uZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlLmhhcyhkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5TdWdnZXN0aW9uLFxuICAgICAgICAgIG1lc3NhZ2U6IG1pc3NpbmdEaXJlY3RpdmUodHlwZS5uYW1lLCBtZXRhZGF0YS5pc0NvbXBvbmVudCksXG4gICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHt0ZW1wbGF0ZSwgdGVtcGxhdGVVcmwsIHN0eWxlVXJsc30gPSBtZXRhZGF0YS50ZW1wbGF0ZSAhO1xuICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsICYmICF0ZW1wbGF0ZVVybCkge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCxcbiAgICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVVybCkge1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAga2luZDogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHt0eXBlLm5hbWV9JyBtdXN0IG5vdCBoYXZlIGJvdGggdGVtcGxhdGUgYW5kIHRlbXBsYXRlVXJsYCxcbiAgICAgICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmQgdGVtcGxhdGVVcmwgdmFsdWUgZnJvbSB0aGUgZGlyZWN0aXZlIGNhbGwgZXhwcmVzc2lvbiwgd2hpY2ggaXMgdGhlIHBhcmVudCBvZiB0aGVcbiAgICAgICAgLy8gZGlyZWN0aXZlIGlkZW50aWZpZXIuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE86IFdlIHNob3VsZCBjcmVhdGUgYW4gZW51bSBvZiB0aGUgdmFyaW91cyBwcm9wZXJ0aWVzIGEgZGlyZWN0aXZlIGNhbiBoYXZlIHRvIHVzZVxuICAgICAgICAvLyBpbnN0ZWFkIG9mIHN0cmluZyBsaXRlcmFscy4gV2UgY2FuIHRoZW4gcGVyZm9ybSBhIG1hc3MgbWlncmF0aW9uIG9mIGFsbCBsaXRlcmFsIHVzYWdlcy5cbiAgICAgICAgY29uc3QgdGVtcGxhdGVVcmxOb2RlID0gZmluZFByb3BlcnR5VmFsdWVPZlR5cGUoXG4gICAgICAgICAgICBkaXJlY3RpdmVJZGVudGlmaWVyLnBhcmVudCwgJ3RlbXBsYXRlVXJsJywgdHMuaXNMaXRlcmFsRXhwcmVzc2lvbik7XG4gICAgICAgIGlmICghdGVtcGxhdGVVcmxOb2RlKSB7XG4gICAgICAgICAgaG9zdC5lcnJvcihgdGVtcGxhdGVVcmwgJHt0ZW1wbGF0ZVVybH0gZXhpc3RzIGJ1dCBpdHMgVHlwZVNjcmlwdCBub2RlIGRvZXNuJ3RgKTtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHRzLnB1c2goLi4udmFsaWRhdGVVcmxzKFt0ZW1wbGF0ZVVybE5vZGVdLCBob3N0LnRzTHNIb3N0KSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdHlsZVVybHMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBGaW5kIHN0eWxlVXJscyB2YWx1ZSBmcm9tIHRoZSBkaXJlY3RpdmUgY2FsbCBleHByZXNzaW9uLCB3aGljaCBpcyB0aGUgcGFyZW50IG9mIHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaWRlbnRpZmllci5cbiAgICAgICAgY29uc3Qgc3R5bGVVcmxzTm9kZSA9IGZpbmRQcm9wZXJ0eVZhbHVlT2ZUeXBlKFxuICAgICAgICAgICAgZGlyZWN0aXZlSWRlbnRpZmllci5wYXJlbnQsICdzdHlsZVVybHMnLCB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24pO1xuICAgICAgICBpZiAoIXN0eWxlVXJsc05vZGUpIHtcbiAgICAgICAgICBob3N0LmVycm9yKGBzdHlsZVVybHMgcHJvcGVydHkgZXhpc3RzIGJ1dCBpdHMgVHlwZVNjcmlwdCBub2RlIGRvZXNuJ3QnYCk7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnZhbGlkYXRlVXJscyhzdHlsZVVybHNOb2RlLmVsZW1lbnRzLCBob3N0LnRzTHNIb3N0KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghZGlyZWN0aXZlcy5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5TdWdnZXN0aW9uLFxuICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBDaGVja3MgdGhhdCBVUkxzIG9uIGEgZGlyZWN0aXZlIHBvaW50IHRvIGEgdmFsaWQgZmlsZS5cbiAqIE5vdGUgdGhhdCB0aGlzIGRpYWdub3N0aWMgY2hlY2sgbWF5IHJlcXVpcmUgYSBmaWxlc3lzdGVtIGhpdCwgYW5kIHRodXMgbWF5IGJlIHNsb3dlciB0aGFuIG90aGVyXG4gKiBjaGVja3MuXG4gKlxuICogQHBhcmFtIHVybHMgdXJscyB0byBjaGVjayBmb3IgdmFsaWRpdHlcbiAqIEBwYXJhbSB0c0xzSG9zdCBUUyBMUyBob3N0IHVzZWQgZm9yIHF1ZXJ5aW5nIGZpbGVzeXN0ZW0gaW5mb3JtYXRpb25cbiAqIEByZXR1cm4gZGlhZ25vc2VkIHVybCBlcnJvcnMsIGlmIGFueVxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVVybHMoXG4gICAgdXJsczogQXJyYXlMaWtlPHRzLkV4cHJlc3Npb24+LCB0c0xzSG9zdDogUmVhZG9ubHk8dHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdD4pOiBuZy5EaWFnbm9zdGljW10ge1xuICBpZiAoIXRzTHNIb3N0LmZpbGVFeGlzdHMpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBhbGxFcnJvcnM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuICAvLyBUT0RPKGF5YXpoYWZpeik6IG1vc3Qgb2YgdGhpcyBsb2dpYyBjYW4gYmUgdW5pZmllZCB3aXRoIHRoZSBsb2dpYyBpblxuICAvLyBkZWZpbml0aW9ucy50cyNnZXRVcmxGcm9tUHJvcGVydHkuIENyZWF0ZSBhIHV0aWxpdHkgZnVuY3Rpb24gdG8gYmUgdXNlZCBieSBib3RoLlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyArK2kpIHtcbiAgICBjb25zdCB1cmxOb2RlID0gdXJsc1tpXTtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2UodXJsTm9kZSkpIHtcbiAgICAgIC8vIElmIGEgbm9uLXN0cmluZyB2YWx1ZSBpcyBhc3NpZ25lZCB0byBhIFVSTCBub2RlIChsaWtlIGB0ZW1wbGF0ZVVybGApLCBhIHR5cGUgZXJyb3Igd2lsbCBiZVxuICAgICAgLy8gcGlja2VkIHVwIGJ5IHRoZSBUUyBMYW5ndWFnZSBTZXJ2ZXIuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgY3VyUGF0aCA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IHVybCA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY3VyUGF0aCksIHVybE5vZGUudGV4dCk7XG4gICAgaWYgKHRzTHNIb3N0LmZpbGVFeGlzdHModXJsKSkgY29udGludWU7XG5cbiAgICBhbGxFcnJvcnMucHVzaCh7XG4gICAgICBraW5kOiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBtZXNzYWdlOiBgVVJMIGRvZXMgbm90IHBvaW50IHRvIGEgdmFsaWQgZmlsZWAsXG4gICAgICAvLyBFeGNsdWRlIG9wZW5pbmcgYW5kIGNsb3NpbmcgcXVvdGVzIGluIHRoZSB1cmwgc3Bhbi5cbiAgICAgIHNwYW46IHtzdGFydDogdXJsTm9kZS5nZXRTdGFydCgpICsgMSwgZW5kOiB1cmxOb2RlLmVuZCAtIDF9LFxuICAgIH0pO1xuICB9XG4gIHJldHVybiBhbGxFcnJvcnM7XG59XG5cbi8qKlxuICogUmV0dXJuIGEgcmVjdXJzaXZlIGRhdGEgc3RydWN0dXJlIHRoYXQgY2hhaW5zIGRpYWdub3N0aWMgbWVzc2FnZXMuXG4gKiBAcGFyYW0gY2hhaW5cbiAqL1xuZnVuY3Rpb24gY2hhaW5EaWFnbm9zdGljcyhjaGFpbjogbmcuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbik6IHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICByZXR1cm4ge1xuICAgIG1lc3NhZ2VUZXh0OiBjaGFpbi5tZXNzYWdlLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBuZXh0OiBjaGFpbi5uZXh0ID8gY2hhaW4ubmV4dC5tYXAoY2hhaW5EaWFnbm9zdGljcykgOiB1bmRlZmluZWRcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IG5nLkRpYWdub3N0aWMgdG8gdHMuRGlhZ25vc3RpYy5cbiAqIEBwYXJhbSBkIGRpYWdub3N0aWNcbiAqIEBwYXJhbSBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuZ0RpYWdub3N0aWNUb1RzRGlhZ25vc3RpYyhcbiAgICBkOiBuZy5EaWFnbm9zdGljLCBmaWxlOiB0cy5Tb3VyY2VGaWxlIHwgdW5kZWZpbmVkKTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiB7XG4gICAgZmlsZSxcbiAgICBzdGFydDogZC5zcGFuLnN0YXJ0LFxuICAgIGxlbmd0aDogZC5zcGFuLmVuZCAtIGQuc3Bhbi5zdGFydCxcbiAgICBtZXNzYWdlVGV4dDogdHlwZW9mIGQubWVzc2FnZSA9PT0gJ3N0cmluZycgPyBkLm1lc3NhZ2UgOiBjaGFpbkRpYWdub3N0aWNzKGQubWVzc2FnZSksXG4gICAgY2F0ZWdvcnk6IGQua2luZCxcbiAgICBjb2RlOiAwLFxuICAgIHNvdXJjZTogJ25nJyxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gZWxlbWVudHMgZmlsdGVyZWQgYnkgdW5pcXVlIHNwYW4uXG4gKiBAcGFyYW0gZWxlbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZUJ5U3BhbjxUIGV4dGVuZHN7c3BhbjogbmcuU3Bhbn0+KGVsZW1lbnRzOiBUW10pOiBUW10ge1xuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPG51bWJlciwgU2V0PG51bWJlcj4+KCk7XG4gIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgIGNvbnN0IHtzcGFufSA9IGVsZW1lbnQ7XG4gICAgbGV0IHNldCA9IG1hcC5nZXQoc3Bhbi5zdGFydCk7XG4gICAgaWYgKCFzZXQpIHtcbiAgICAgIHNldCA9IG5ldyBTZXQoKTtcbiAgICAgIG1hcC5zZXQoc3Bhbi5zdGFydCwgc2V0KTtcbiAgICB9XG4gICAgaWYgKCFzZXQuaGFzKHNwYW4uZW5kKSkge1xuICAgICAgc2V0LmFkZChzcGFuLmVuZCk7XG4gICAgICByZXN1bHQucHVzaChlbGVtZW50KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==