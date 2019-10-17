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
        define("@angular/language-service/src/diagnostics", ["require", "exports", "tslib", "@angular/compiler-cli/src/language_services", "path", "typescript", "@angular/language-service/src/types", "@angular/language-service/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var language_services_1 = require("@angular/compiler-cli/src/language_services");
    var path = require("path");
    var ts = require("typescript");
    var ng = require("@angular/language-service/src/types");
    var utils_1 = require("@angular/language-service/src/utils");
    /**
     * Return diagnostic information for the parsed AST of the template.
     * @param ast contains HTML and template AST
     */
    function getTemplateDiagnostics(ast) {
        var results = [];
        var parseErrors = ast.parseErrors, templateAst = ast.templateAst, htmlAst = ast.htmlAst, template = ast.template;
        if (parseErrors) {
            results.push.apply(results, tslib_1.__spread(parseErrors.map(function (e) {
                return {
                    kind: ng.DiagnosticKind.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            })));
        }
        var expressionDiagnostics = language_services_1.getTemplateExpressionDiagnostics({
            templateAst: templateAst,
            htmlAst: htmlAst,
            offset: template.span.start,
            query: template.query,
            members: template.members,
        });
        results.push.apply(results, tslib_1.__spread(expressionDiagnostics));
        return results;
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
     * Logs an error for an impossible state with a certain message.
     */
    function logImpossibleState(message) {
        console.error("Impossible state: " + message);
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
                    logImpossibleState("directive " + type.name + " exists but has no source file");
                    return [];
                }
                // TypeScript identifier of the directive declaration annotation (e.g. "Component" or
                // "Directive") on a directive class.
                var directiveIdentifier = utils_1.findTightestNode(sf, declarationSpan.start);
                if (!directiveIdentifier) {
                    logImpossibleState("directive " + type.name + " exists but has no identifier");
                    return [];
                }
                try {
                    for (var errors_1 = (e_4 = void 0, tslib_1.__values(errors)), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
                        var error_1 = errors_1_1.value;
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: error_1.message,
                            span: error_1.span,
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
                            kind: ng.DiagnosticKind.Error,
                            message: missingDirective(type.name, metadata.isComponent),
                            span: declarationSpan,
                        });
                    }
                    var _j = metadata.template, template = _j.template, templateUrl = _j.templateUrl, styleUrls = _j.styleUrls;
                    if (template === null && !templateUrl) {
                        results.push({
                            kind: ng.DiagnosticKind.Error,
                            message: "Component '" + type.name + "' must have a template or templateUrl",
                            span: declarationSpan,
                        });
                    }
                    else if (templateUrl) {
                        if (template) {
                            results.push({
                                kind: ng.DiagnosticKind.Error,
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
                            logImpossibleState("templateUrl " + templateUrl + " exists but its TypeScript node doesn't");
                            return [];
                        }
                        results.push.apply(results, tslib_1.__spread(validateUrls([templateUrlNode], host.tsLsHost)));
                    }
                    if (styleUrls.length > 0) {
                        // Find styleUrls value from the directive call expression, which is the parent of the
                        // directive identifier.
                        var styleUrlsNode = utils_1.findPropertyValueOfType(directiveIdentifier.parent, 'styleUrls', ts.isArrayLiteralExpression);
                        if (!styleUrlsNode) {
                            logImpossibleState("styleUrls property exists but its TypeScript node doesn't'");
                            return [];
                        }
                        results.push.apply(results, tslib_1.__spread(validateUrls(styleUrlsNode.elements, host.tsLsHost)));
                    }
                }
                else if (!directives.has(declaration.type)) {
                    results.push({
                        kind: ng.DiagnosticKind.Error,
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
                kind: ng.DiagnosticKind.Error,
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
            next: chain.next ? chainDiagnostics(chain.next) : undefined
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
            category: ts.DiagnosticCategory.Error,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBNkY7SUFDN0YsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUdqQyx3REFBOEI7SUFFOUIsNkRBQXNGO0lBRXRGOzs7T0FHRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLEdBQWM7UUFDbkQsSUFBTSxPQUFPLEdBQW9CLEVBQUUsQ0FBQztRQUM3QixJQUFBLDZCQUFXLEVBQUUsNkJBQVcsRUFBRSxxQkFBTyxFQUFFLHVCQUFRLENBQVE7UUFDMUQsSUFBSSxXQUFXLEVBQUU7WUFDZixPQUFPLENBQUMsSUFBSSxPQUFaLE9BQU8sbUJBQVMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7Z0JBQy9CLE9BQU87b0JBQ0wsSUFBSSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsS0FBSztvQkFDN0IsSUFBSSxFQUFFLGtCQUFVLENBQUMsY0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDckQsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHO2lCQUNmLENBQUM7WUFDSixDQUFDLENBQUMsR0FBRTtTQUNMO1FBQ0QsSUFBTSxxQkFBcUIsR0FBRyxvREFBZ0MsQ0FBQztZQUM3RCxXQUFXLEVBQUUsV0FBVztZQUN4QixPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87U0FDMUIsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1C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RyxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3RCO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFoQkQsb0NBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nQW5hbHl6ZWRNb2R1bGVzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2dldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL2xhbmd1YWdlX3NlcnZpY2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBc3RSZXN1bHR9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtUeXBlU2NyaXB0U2VydmljZUhvc3R9IGZyb20gJy4vdHlwZXNjcmlwdF9ob3N0JztcbmltcG9ydCB7ZmluZFByb3BlcnR5VmFsdWVPZlR5cGUsIGZpbmRUaWdodGVzdE5vZGUsIG9mZnNldFNwYW4sIHNwYW5PZn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmV0dXJuIGRpYWdub3N0aWMgaW5mb3JtYXRpb24gZm9yIHRoZSBwYXJzZWQgQVNUIG9mIHRoZSB0ZW1wbGF0ZS5cbiAqIEBwYXJhbSBhc3QgY29udGFpbnMgSFRNTCBhbmQgdGVtcGxhdGUgQVNUXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKGFzdDogQXN0UmVzdWx0KTogbmcuRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgcmVzdWx0czogbmcuRGlhZ25vc3RpY1tdID0gW107XG4gIGNvbnN0IHtwYXJzZUVycm9ycywgdGVtcGxhdGVBc3QsIGh0bWxBc3QsIHRlbXBsYXRlfSA9IGFzdDtcbiAgaWYgKHBhcnNlRXJyb3JzKSB7XG4gICAgcmVzdWx0cy5wdXNoKC4uLnBhcnNlRXJyb3JzLm1hcChlID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBzcGFuOiBvZmZzZXRTcGFuKHNwYW5PZihlLnNwYW4pLCB0ZW1wbGF0ZS5zcGFuLnN0YXJ0KSxcbiAgICAgICAgbWVzc2FnZTogZS5tc2csXG4gICAgICB9O1xuICAgIH0pKTtcbiAgfVxuICBjb25zdCBleHByZXNzaW9uRGlhZ25vc3RpY3MgPSBnZXRUZW1wbGF0ZUV4cHJlc3Npb25EaWFnbm9zdGljcyh7XG4gICAgdGVtcGxhdGVBc3Q6IHRlbXBsYXRlQXN0LFxuICAgIGh0bWxBc3Q6IGh0bWxBc3QsXG4gICAgb2Zmc2V0OiB0ZW1wbGF0ZS5zcGFuLnN0YXJ0LFxuICAgIHF1ZXJ5OiB0ZW1wbGF0ZS5xdWVyeSxcbiAgICBtZW1iZXJzOiB0ZW1wbGF0ZS5tZW1iZXJzLFxuICB9KTtcbiAgcmVzdWx0cy5wdXNoKC4uLmV4cHJlc3Npb25EaWFnbm9zdGljcyk7XG4gIHJldHVybiByZXN1bHRzO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGVycm9yIG1lc3NhZ2UgdGhhdCBpbmRpY2F0ZXMgYSBkaXJlY3RpdmUgaXMgbm90IHBhcnQgb2YgYW55XG4gKiBOZ01vZHVsZS5cbiAqIEBwYXJhbSBuYW1lIGNsYXNzIG5hbWVcbiAqIEBwYXJhbSBpc0NvbXBvbmVudCB0cnVlIGlmIGRpcmVjdGl2ZSBpcyBhbiBBbmd1bGFyIENvbXBvbmVudFxuICovXG5mdW5jdGlvbiBtaXNzaW5nRGlyZWN0aXZlKG5hbWU6IHN0cmluZywgaXNDb21wb25lbnQ6IGJvb2xlYW4pIHtcbiAgY29uc3QgdHlwZSA9IGlzQ29tcG9uZW50ID8gJ0NvbXBvbmVudCcgOiAnRGlyZWN0aXZlJztcbiAgcmV0dXJuIGAke3R5cGV9ICcke25hbWV9JyBpcyBub3QgaW5jbHVkZWQgaW4gYSBtb2R1bGUgYW5kIHdpbGwgbm90IGJlIGAgK1xuICAgICAgJ2F2YWlsYWJsZSBpbnNpZGUgYSB0ZW1wbGF0ZS4gQ29uc2lkZXIgYWRkaW5nIGl0IHRvIGEgTmdNb2R1bGUgZGVjbGFyYXRpb24uJztcbn1cblxuLyoqXG4gKiBMb2dzIGFuIGVycm9yIGZvciBhbiBpbXBvc3NpYmxlIHN0YXRlIHdpdGggYSBjZXJ0YWluIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIGxvZ0ltcG9zc2libGVTdGF0ZShtZXNzYWdlOiBzdHJpbmcpIHtcbiAgY29uc29sZS5lcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogJHttZXNzYWdlfWApO1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIGEgdmFyaWV0eSBkaWFnbm9zdGljcyBvbiBkaXJlY3RpdmUgZGVjbGFyYXRpb25zLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbnMgQW5ndWxhciBkaXJlY3RpdmUgZGVjbGFyYXRpb25zXG4gKiBAcGFyYW0gbW9kdWxlcyBOZ01vZHVsZXMgaW4gdGhlIHByb2plY3RcbiAqIEBwYXJhbSBob3N0IFR5cGVTY3JpcHQgc2VydmljZSBob3N0IHVzZWQgdG8gcGVyZm9ybSBUeXBlU2NyaXB0IHF1ZXJpZXNcbiAqIEByZXR1cm4gZGlhZ25vc2VkIGVycm9ycywgaWYgYW55XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKFxuICAgIGRlY2xhcmF0aW9uczogbmcuRGVjbGFyYXRpb25bXSwgbW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMsXG4gICAgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6IG5nLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgU2V0PG5nLlN0YXRpY1N5bWJvbD4oKTtcbiAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgZGlyZWN0aXZlcy5hZGQoZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0czogbmcuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICBjb25zdCB7ZXJyb3JzLCBtZXRhZGF0YSwgdHlwZSwgZGVjbGFyYXRpb25TcGFufSA9IGRlY2xhcmF0aW9uO1xuXG4gICAgY29uc3Qgc2YgPSBob3N0LmdldFNvdXJjZUZpbGUodHlwZS5maWxlUGF0aCk7XG4gICAgaWYgKCFzZikge1xuICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBkaXJlY3RpdmUgJHt0eXBlLm5hbWV9IGV4aXN0cyBidXQgaGFzIG5vIHNvdXJjZSBmaWxlYCk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIC8vIFR5cGVTY3JpcHQgaWRlbnRpZmllciBvZiB0aGUgZGlyZWN0aXZlIGRlY2xhcmF0aW9uIGFubm90YXRpb24gKGUuZy4gXCJDb21wb25lbnRcIiBvclxuICAgIC8vIFwiRGlyZWN0aXZlXCIpIG9uIGEgZGlyZWN0aXZlIGNsYXNzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUlkZW50aWZpZXIgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBkZWNsYXJhdGlvblNwYW4uc3RhcnQpO1xuICAgIGlmICghZGlyZWN0aXZlSWRlbnRpZmllcikge1xuICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBkaXJlY3RpdmUgJHt0eXBlLm5hbWV9IGV4aXN0cyBidXQgaGFzIG5vIGlkZW50aWZpZXJgKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHNwYW46IGVycm9yLnNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKCFtZXRhZGF0YSkge1xuICAgICAgY29udGludWU7ICAvLyBkZWNsYXJhdGlvbiBpcyBub3QgYW4gQW5ndWxhciBkaXJlY3RpdmVcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICBpZiAoIW1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7dGVtcGxhdGUsIHRlbXBsYXRlVXJsLCBzdHlsZVVybHN9ID0gbWV0YWRhdGEudGVtcGxhdGUgITtcbiAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCAmJiAhdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCxcbiAgICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVVybCkge1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3Qgbm90IGhhdmUgYm90aCB0ZW1wbGF0ZSBhbmQgdGVtcGxhdGVVcmxgLFxuICAgICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluZCB0ZW1wbGF0ZVVybCB2YWx1ZSBmcm9tIHRoZSBkaXJlY3RpdmUgY2FsbCBleHByZXNzaW9uLCB3aGljaCBpcyB0aGUgcGFyZW50IG9mIHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaWRlbnRpZmllci5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogV2Ugc2hvdWxkIGNyZWF0ZSBhbiBlbnVtIG9mIHRoZSB2YXJpb3VzIHByb3BlcnRpZXMgYSBkaXJlY3RpdmUgY2FuIGhhdmUgdG8gdXNlXG4gICAgICAgIC8vIGluc3RlYWQgb2Ygc3RyaW5nIGxpdGVyYWxzLiBXZSBjYW4gdGhlbiBwZXJmb3JtIGEgbWFzcyBtaWdyYXRpb24gb2YgYWxsIGxpdGVyYWwgdXNhZ2VzLlxuICAgICAgICBjb25zdCB0ZW1wbGF0ZVVybE5vZGUgPSBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShcbiAgICAgICAgICAgIGRpcmVjdGl2ZUlkZW50aWZpZXIucGFyZW50LCAndGVtcGxhdGVVcmwnLCB0cy5pc0xpdGVyYWxFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZVVybE5vZGUpIHtcbiAgICAgICAgICBsb2dJbXBvc3NpYmxlU3RhdGUoYHRlbXBsYXRlVXJsICR7dGVtcGxhdGVVcmx9IGV4aXN0cyBidXQgaXRzIFR5cGVTY3JpcHQgbm9kZSBkb2Vzbid0YCk7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnZhbGlkYXRlVXJscyhbdGVtcGxhdGVVcmxOb2RlXSwgaG9zdC50c0xzSG9zdCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3R5bGVVcmxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gRmluZCBzdHlsZVVybHMgdmFsdWUgZnJvbSB0aGUgZGlyZWN0aXZlIGNhbGwgZXhwcmVzc2lvbiwgd2hpY2ggaXMgdGhlIHBhcmVudCBvZiB0aGVcbiAgICAgICAgLy8gZGlyZWN0aXZlIGlkZW50aWZpZXIuXG4gICAgICAgIGNvbnN0IHN0eWxlVXJsc05vZGUgPSBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShcbiAgICAgICAgICAgIGRpcmVjdGl2ZUlkZW50aWZpZXIucGFyZW50LCAnc3R5bGVVcmxzJywgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKCFzdHlsZVVybHNOb2RlKSB7XG4gICAgICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBzdHlsZVVybHMgcHJvcGVydHkgZXhpc3RzIGJ1dCBpdHMgVHlwZVNjcmlwdCBub2RlIGRvZXNuJ3QnYCk7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnZhbGlkYXRlVXJscyhzdHlsZVVybHNOb2RlLmVsZW1lbnRzLCBob3N0LnRzTHNIb3N0KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghZGlyZWN0aXZlcy5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBDaGVja3MgdGhhdCBVUkxzIG9uIGEgZGlyZWN0aXZlIHBvaW50IHRvIGEgdmFsaWQgZmlsZS5cbiAqIE5vdGUgdGhhdCB0aGlzIGRpYWdub3N0aWMgY2hlY2sgbWF5IHJlcXVpcmUgYSBmaWxlc3lzdGVtIGhpdCwgYW5kIHRodXMgbWF5IGJlIHNsb3dlciB0aGFuIG90aGVyXG4gKiBjaGVja3MuXG4gKlxuICogQHBhcmFtIHVybHMgdXJscyB0byBjaGVjayBmb3IgdmFsaWRpdHlcbiAqIEBwYXJhbSB0c0xzSG9zdCBUUyBMUyBob3N0IHVzZWQgZm9yIHF1ZXJ5aW5nIGZpbGVzeXN0ZW0gaW5mb3JtYXRpb25cbiAqIEByZXR1cm4gZGlhZ25vc2VkIHVybCBlcnJvcnMsIGlmIGFueVxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVVybHMoXG4gICAgdXJsczogQXJyYXlMaWtlPHRzLkV4cHJlc3Npb24+LCB0c0xzSG9zdDogUmVhZG9ubHk8dHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdD4pOiBuZy5EaWFnbm9zdGljW10ge1xuICBpZiAoIXRzTHNIb3N0LmZpbGVFeGlzdHMpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBhbGxFcnJvcnM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuICAvLyBUT0RPKGF5YXpoYWZpeik6IG1vc3Qgb2YgdGhpcyBsb2dpYyBjYW4gYmUgdW5pZmllZCB3aXRoIHRoZSBsb2dpYyBpblxuICAvLyBkZWZpbml0aW9ucy50cyNnZXRVcmxGcm9tUHJvcGVydHkuIENyZWF0ZSBhIHV0aWxpdHkgZnVuY3Rpb24gdG8gYmUgdXNlZCBieSBib3RoLlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyArK2kpIHtcbiAgICBjb25zdCB1cmxOb2RlID0gdXJsc1tpXTtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2UodXJsTm9kZSkpIHtcbiAgICAgIC8vIElmIGEgbm9uLXN0cmluZyB2YWx1ZSBpcyBhc3NpZ25lZCB0byBhIFVSTCBub2RlIChsaWtlIGB0ZW1wbGF0ZVVybGApLCBhIHR5cGUgZXJyb3Igd2lsbCBiZVxuICAgICAgLy8gcGlja2VkIHVwIGJ5IHRoZSBUUyBMYW5ndWFnZSBTZXJ2ZXIuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgY3VyUGF0aCA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IHVybCA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY3VyUGF0aCksIHVybE5vZGUudGV4dCk7XG4gICAgaWYgKHRzTHNIb3N0LmZpbGVFeGlzdHModXJsKSkgY29udGludWU7XG5cbiAgICBhbGxFcnJvcnMucHVzaCh7XG4gICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgIG1lc3NhZ2U6IGBVUkwgZG9lcyBub3QgcG9pbnQgdG8gYSB2YWxpZCBmaWxlYCxcbiAgICAgIC8vIEV4Y2x1ZGUgb3BlbmluZyBhbmQgY2xvc2luZyBxdW90ZXMgaW4gdGhlIHVybCBzcGFuLlxuICAgICAgc3Bhbjoge3N0YXJ0OiB1cmxOb2RlLmdldFN0YXJ0KCkgKyAxLCBlbmQ6IHVybE5vZGUuZW5kIC0gMX0sXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGFsbEVycm9ycztcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSByZWN1cnNpdmUgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBjaGFpbnMgZGlhZ25vc3RpYyBtZXNzYWdlcy5cbiAqIEBwYXJhbSBjaGFpblxuICovXG5mdW5jdGlvbiBjaGFpbkRpYWdub3N0aWNzKGNoYWluOiBuZy5EaWFnbm9zdGljTWVzc2FnZUNoYWluKTogdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIG5leHQ6IGNoYWluLm5leHQgPyBjaGFpbkRpYWdub3N0aWNzKGNoYWluLm5leHQpIDogdW5kZWZpbmVkXG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBuZy5EaWFnbm9zdGljIHRvIHRzLkRpYWdub3N0aWMuXG4gKiBAcGFyYW0gZCBkaWFnbm9zdGljXG4gKiBAcGFyYW0gZmlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gbmdEaWFnbm9zdGljVG9Uc0RpYWdub3N0aWMoXG4gICAgZDogbmcuRGlhZ25vc3RpYywgZmlsZTogdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZCk6IHRzLkRpYWdub3N0aWMge1xuICByZXR1cm4ge1xuICAgIGZpbGUsXG4gICAgc3RhcnQ6IGQuc3Bhbi5zdGFydCxcbiAgICBsZW5ndGg6IGQuc3Bhbi5lbmQgLSBkLnNwYW4uc3RhcnQsXG4gICAgbWVzc2FnZVRleHQ6IHR5cGVvZiBkLm1lc3NhZ2UgPT09ICdzdHJpbmcnID8gZC5tZXNzYWdlIDogY2hhaW5EaWFnbm9zdGljcyhkLm1lc3NhZ2UpLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogMCxcbiAgICBzb3VyY2U6ICduZycsXG4gIH07XG59XG5cbi8qKlxuICogUmV0dXJuIGVsZW1lbnRzIGZpbHRlcmVkIGJ5IHVuaXF1ZSBzcGFuLlxuICogQHBhcmFtIGVsZW1lbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWVCeVNwYW48VCBleHRlbmRze3NwYW46IG5nLlNwYW59PihlbGVtZW50czogVFtdKTogVFtdIHtcbiAgY29uc3QgcmVzdWx0OiBUW10gPSBbXTtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIFNldDxudW1iZXI+PigpO1xuICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICBjb25zdCB7c3Bhbn0gPSBlbGVtZW50O1xuICAgIGxldCBzZXQgPSBtYXAuZ2V0KHNwYW4uc3RhcnQpO1xuICAgIGlmICghc2V0KSB7XG4gICAgICBzZXQgPSBuZXcgU2V0KCk7XG4gICAgICBtYXAuc2V0KHNwYW4uc3RhcnQsIHNldCk7XG4gICAgfVxuICAgIGlmICghc2V0LmhhcyhzcGFuLmVuZCkpIHtcbiAgICAgIHNldC5hZGQoc3Bhbi5lbmQpO1xuICAgICAgcmVzdWx0LnB1c2goZWxlbWVudCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iXX0=