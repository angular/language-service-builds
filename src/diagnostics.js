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
        var parseErrors = ast.parseErrors, templateAst = ast.templateAst, htmlAst = ast.htmlAst, template = ast.template;
        if (parseErrors && parseErrors.length) {
            return parseErrors.map(function (e) {
                return {
                    kind: ng.DiagnosticKind.Error,
                    span: utils_1.offsetSpan(utils_1.spanOf(e.span), template.span.start),
                    message: e.msg,
                };
            });
        }
        return language_services_1.getTemplateExpressionDiagnostics({
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
                        var error = errors_1_1.value;
                        results.push({
                            kind: ng.DiagnosticKind.Error,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL3NyYy9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCxpRkFBNkY7SUFDN0YsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUdqQyx3REFBOEI7SUFFOUIsNkRBQXNGO0lBRXRGOzs7T0FHRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLEdBQWM7UUFDNUMsSUFBQSw2QkFBVyxFQUFFLDZCQUFXLEVBQUUscUJBQU8sRUFBRSx1QkFBUSxDQUFRO1FBQzFELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDckMsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztnQkFDdEIsT0FBTztvQkFDTCxJQUFJLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLO29CQUM3QixJQUFJLEVBQUUsa0JBQVUsQ0FBQyxjQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUNyRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUc7aUJBQ2YsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLG9EQUFnQyxDQUFDO1lBQ3RDLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBbEJELHdEQWtCQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsV0FBb0I7UUFDMUQs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RCxvQ0FnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdBbmFseXplZE1vZHVsZXN9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Z2V0VGVtcGxhdGVFeHByZXNzaW9uRGlhZ25vc3RpY3N9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbGFuZ3VhZ2Vfc2VydmljZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdFJlc3VsdH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1R5cGVTY3JpcHRTZXJ2aWNlSG9zdH0gZnJvbSAnLi90eXBlc2NyaXB0X2hvc3QnO1xuaW1wb3J0IHtmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZSwgZmluZFRpZ2h0ZXN0Tm9kZSwgb2Zmc2V0U3Bhbiwgc3Bhbk9mfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXR1cm4gZGlhZ25vc3RpYyBpbmZvcm1hdGlvbiBmb3IgdGhlIHBhcnNlZCBBU1Qgb2YgdGhlIHRlbXBsYXRlLlxuICogQHBhcmFtIGFzdCBjb250YWlucyBIVE1MIGFuZCB0ZW1wbGF0ZSBBU1RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoYXN0OiBBc3RSZXN1bHQpOiBuZy5EaWFnbm9zdGljW10ge1xuICBjb25zdCB7cGFyc2VFcnJvcnMsIHRlbXBsYXRlQXN0LCBodG1sQXN0LCB0ZW1wbGF0ZX0gPSBhc3Q7XG4gIGlmIChwYXJzZUVycm9ycyAmJiBwYXJzZUVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcGFyc2VFcnJvcnMubWFwKGUgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIHNwYW46IG9mZnNldFNwYW4oc3Bhbk9mKGUuc3BhbiksIHRlbXBsYXRlLnNwYW4uc3RhcnQpLFxuICAgICAgICBtZXNzYWdlOiBlLm1zZyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzKHtcbiAgICB0ZW1wbGF0ZUFzdDogdGVtcGxhdGVBc3QsXG4gICAgaHRtbEFzdDogaHRtbEFzdCxcbiAgICBvZmZzZXQ6IHRlbXBsYXRlLnNwYW4uc3RhcnQsXG4gICAgcXVlcnk6IHRlbXBsYXRlLnF1ZXJ5LFxuICAgIG1lbWJlcnM6IHRlbXBsYXRlLm1lbWJlcnMsXG4gIH0pO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGVycm9yIG1lc3NhZ2UgdGhhdCBpbmRpY2F0ZXMgYSBkaXJlY3RpdmUgaXMgbm90IHBhcnQgb2YgYW55XG4gKiBOZ01vZHVsZS5cbiAqIEBwYXJhbSBuYW1lIGNsYXNzIG5hbWVcbiAqIEBwYXJhbSBpc0NvbXBvbmVudCB0cnVlIGlmIGRpcmVjdGl2ZSBpcyBhbiBBbmd1bGFyIENvbXBvbmVudFxuICovXG5mdW5jdGlvbiBtaXNzaW5nRGlyZWN0aXZlKG5hbWU6IHN0cmluZywgaXNDb21wb25lbnQ6IGJvb2xlYW4pIHtcbiAgY29uc3QgdHlwZSA9IGlzQ29tcG9uZW50ID8gJ0NvbXBvbmVudCcgOiAnRGlyZWN0aXZlJztcbiAgcmV0dXJuIGAke3R5cGV9ICcke25hbWV9JyBpcyBub3QgaW5jbHVkZWQgaW4gYSBtb2R1bGUgYW5kIHdpbGwgbm90IGJlIGAgK1xuICAgICAgJ2F2YWlsYWJsZSBpbnNpZGUgYSB0ZW1wbGF0ZS4gQ29uc2lkZXIgYWRkaW5nIGl0IHRvIGEgTmdNb2R1bGUgZGVjbGFyYXRpb24uJztcbn1cblxuLyoqXG4gKiBMb2dzIGFuIGVycm9yIGZvciBhbiBpbXBvc3NpYmxlIHN0YXRlIHdpdGggYSBjZXJ0YWluIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIGxvZ0ltcG9zc2libGVTdGF0ZShtZXNzYWdlOiBzdHJpbmcpIHtcbiAgY29uc29sZS5lcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogJHttZXNzYWdlfWApO1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIGEgdmFyaWV0eSBkaWFnbm9zdGljcyBvbiBkaXJlY3RpdmUgZGVjbGFyYXRpb25zLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbnMgQW5ndWxhciBkaXJlY3RpdmUgZGVjbGFyYXRpb25zXG4gKiBAcGFyYW0gbW9kdWxlcyBOZ01vZHVsZXMgaW4gdGhlIHByb2plY3RcbiAqIEBwYXJhbSBob3N0IFR5cGVTY3JpcHQgc2VydmljZSBob3N0IHVzZWQgdG8gcGVyZm9ybSBUeXBlU2NyaXB0IHF1ZXJpZXNcbiAqIEByZXR1cm4gZGlhZ25vc2VkIGVycm9ycywgaWYgYW55XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNsYXJhdGlvbkRpYWdub3N0aWNzKFxuICAgIGRlY2xhcmF0aW9uczogbmcuRGVjbGFyYXRpb25bXSwgbW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMsXG4gICAgaG9zdDogUmVhZG9ubHk8VHlwZVNjcmlwdFNlcnZpY2VIb3N0Pik6IG5nLkRpYWdub3N0aWNbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgU2V0PG5nLlN0YXRpY1N5bWJvbD4oKTtcbiAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiBtb2R1bGVzLm5nTW9kdWxlcykge1xuICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIG5nTW9kdWxlLmRlY2xhcmVkRGlyZWN0aXZlcykge1xuICAgICAgZGlyZWN0aXZlcy5hZGQoZGlyZWN0aXZlLnJlZmVyZW5jZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0czogbmcuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICBjb25zdCB7ZXJyb3JzLCBtZXRhZGF0YSwgdHlwZSwgZGVjbGFyYXRpb25TcGFufSA9IGRlY2xhcmF0aW9uO1xuXG4gICAgY29uc3Qgc2YgPSBob3N0LmdldFNvdXJjZUZpbGUodHlwZS5maWxlUGF0aCk7XG4gICAgaWYgKCFzZikge1xuICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBkaXJlY3RpdmUgJHt0eXBlLm5hbWV9IGV4aXN0cyBidXQgaGFzIG5vIHNvdXJjZSBmaWxlYCk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIC8vIFR5cGVTY3JpcHQgaWRlbnRpZmllciBvZiB0aGUgZGlyZWN0aXZlIGRlY2xhcmF0aW9uIGFubm90YXRpb24gKGUuZy4gXCJDb21wb25lbnRcIiBvclxuICAgIC8vIFwiRGlyZWN0aXZlXCIpIG9uIGEgZGlyZWN0aXZlIGNsYXNzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUlkZW50aWZpZXIgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBkZWNsYXJhdGlvblNwYW4uc3RhcnQpO1xuICAgIGlmICghZGlyZWN0aXZlSWRlbnRpZmllcikge1xuICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBkaXJlY3RpdmUgJHt0eXBlLm5hbWV9IGV4aXN0cyBidXQgaGFzIG5vIGlkZW50aWZpZXJgKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xuICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHNwYW46IGVycm9yLnNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKCFtZXRhZGF0YSkge1xuICAgICAgY29udGludWU7ICAvLyBkZWNsYXJhdGlvbiBpcyBub3QgYW4gQW5ndWxhciBkaXJlY3RpdmVcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICBpZiAoIW1vZHVsZXMubmdNb2R1bGVCeVBpcGVPckRpcmVjdGl2ZS5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICAgIHNwYW46IGRlY2xhcmF0aW9uU3BhbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7dGVtcGxhdGUsIHRlbXBsYXRlVXJsLCBzdHlsZVVybHN9ID0gbWV0YWRhdGEudGVtcGxhdGUgITtcbiAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCAmJiAhdGVtcGxhdGVVcmwpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCxcbiAgICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVVybCkge1xuICAgICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAga2luZDogbmcuRGlhZ25vc3RpY0tpbmQuRXJyb3IsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke3R5cGUubmFtZX0nIG11c3Qgbm90IGhhdmUgYm90aCB0ZW1wbGF0ZSBhbmQgdGVtcGxhdGVVcmxgLFxuICAgICAgICAgICAgc3BhbjogZGVjbGFyYXRpb25TcGFuLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluZCB0ZW1wbGF0ZVVybCB2YWx1ZSBmcm9tIHRoZSBkaXJlY3RpdmUgY2FsbCBleHByZXNzaW9uLCB3aGljaCBpcyB0aGUgcGFyZW50IG9mIHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaWRlbnRpZmllci5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETzogV2Ugc2hvdWxkIGNyZWF0ZSBhbiBlbnVtIG9mIHRoZSB2YXJpb3VzIHByb3BlcnRpZXMgYSBkaXJlY3RpdmUgY2FuIGhhdmUgdG8gdXNlXG4gICAgICAgIC8vIGluc3RlYWQgb2Ygc3RyaW5nIGxpdGVyYWxzLiBXZSBjYW4gdGhlbiBwZXJmb3JtIGEgbWFzcyBtaWdyYXRpb24gb2YgYWxsIGxpdGVyYWwgdXNhZ2VzLlxuICAgICAgICBjb25zdCB0ZW1wbGF0ZVVybE5vZGUgPSBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShcbiAgICAgICAgICAgIGRpcmVjdGl2ZUlkZW50aWZpZXIucGFyZW50LCAndGVtcGxhdGVVcmwnLCB0cy5pc0xpdGVyYWxFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZVVybE5vZGUpIHtcbiAgICAgICAgICBsb2dJbXBvc3NpYmxlU3RhdGUoYHRlbXBsYXRlVXJsICR7dGVtcGxhdGVVcmx9IGV4aXN0cyBidXQgaXRzIFR5cGVTY3JpcHQgbm9kZSBkb2Vzbid0YCk7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnZhbGlkYXRlVXJscyhbdGVtcGxhdGVVcmxOb2RlXSwgaG9zdC50c0xzSG9zdCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3R5bGVVcmxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gRmluZCBzdHlsZVVybHMgdmFsdWUgZnJvbSB0aGUgZGlyZWN0aXZlIGNhbGwgZXhwcmVzc2lvbiwgd2hpY2ggaXMgdGhlIHBhcmVudCBvZiB0aGVcbiAgICAgICAgLy8gZGlyZWN0aXZlIGlkZW50aWZpZXIuXG4gICAgICAgIGNvbnN0IHN0eWxlVXJsc05vZGUgPSBmaW5kUHJvcGVydHlWYWx1ZU9mVHlwZShcbiAgICAgICAgICAgIGRpcmVjdGl2ZUlkZW50aWZpZXIucGFyZW50LCAnc3R5bGVVcmxzJywgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKCFzdHlsZVVybHNOb2RlKSB7XG4gICAgICAgICAgbG9nSW1wb3NzaWJsZVN0YXRlKGBzdHlsZVVybHMgcHJvcGVydHkgZXhpc3RzIGJ1dCBpdHMgVHlwZVNjcmlwdCBub2RlIGRvZXNuJ3QnYCk7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnZhbGlkYXRlVXJscyhzdHlsZVVybHNOb2RlLmVsZW1lbnRzLCBob3N0LnRzTHNIb3N0KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghZGlyZWN0aXZlcy5oYXMoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGtpbmQ6IG5nLkRpYWdub3N0aWNLaW5kLkVycm9yLFxuICAgICAgICBtZXNzYWdlOiBtaXNzaW5nRGlyZWN0aXZlKHR5cGUubmFtZSwgbWV0YWRhdGEuaXNDb21wb25lbnQpLFxuICAgICAgICBzcGFuOiBkZWNsYXJhdGlvblNwYW4sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cblxuLyoqXG4gKiBDaGVja3MgdGhhdCBVUkxzIG9uIGEgZGlyZWN0aXZlIHBvaW50IHRvIGEgdmFsaWQgZmlsZS5cbiAqIE5vdGUgdGhhdCB0aGlzIGRpYWdub3N0aWMgY2hlY2sgbWF5IHJlcXVpcmUgYSBmaWxlc3lzdGVtIGhpdCwgYW5kIHRodXMgbWF5IGJlIHNsb3dlciB0aGFuIG90aGVyXG4gKiBjaGVja3MuXG4gKlxuICogQHBhcmFtIHVybHMgdXJscyB0byBjaGVjayBmb3IgdmFsaWRpdHlcbiAqIEBwYXJhbSB0c0xzSG9zdCBUUyBMUyBob3N0IHVzZWQgZm9yIHF1ZXJ5aW5nIGZpbGVzeXN0ZW0gaW5mb3JtYXRpb25cbiAqIEByZXR1cm4gZGlhZ25vc2VkIHVybCBlcnJvcnMsIGlmIGFueVxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVVybHMoXG4gICAgdXJsczogQXJyYXlMaWtlPHRzLkV4cHJlc3Npb24+LCB0c0xzSG9zdDogUmVhZG9ubHk8dHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdD4pOiBuZy5EaWFnbm9zdGljW10ge1xuICBpZiAoIXRzTHNIb3N0LmZpbGVFeGlzdHMpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBhbGxFcnJvcnM6IG5nLkRpYWdub3N0aWNbXSA9IFtdO1xuICAvLyBUT0RPKGF5YXpoYWZpeik6IG1vc3Qgb2YgdGhpcyBsb2dpYyBjYW4gYmUgdW5pZmllZCB3aXRoIHRoZSBsb2dpYyBpblxuICAvLyBkZWZpbml0aW9ucy50cyNnZXRVcmxGcm9tUHJvcGVydHkuIENyZWF0ZSBhIHV0aWxpdHkgZnVuY3Rpb24gdG8gYmUgdXNlZCBieSBib3RoLlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHVybHMubGVuZ3RoOyArK2kpIHtcbiAgICBjb25zdCB1cmxOb2RlID0gdXJsc1tpXTtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2UodXJsTm9kZSkpIHtcbiAgICAgIC8vIElmIGEgbm9uLXN0cmluZyB2YWx1ZSBpcyBhc3NpZ25lZCB0byBhIFVSTCBub2RlIChsaWtlIGB0ZW1wbGF0ZVVybGApLCBhIHR5cGUgZXJyb3Igd2lsbCBiZVxuICAgICAgLy8gcGlja2VkIHVwIGJ5IHRoZSBUUyBMYW5ndWFnZSBTZXJ2ZXIuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgY3VyUGF0aCA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IHVybCA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUoY3VyUGF0aCksIHVybE5vZGUudGV4dCk7XG4gICAgaWYgKHRzTHNIb3N0LmZpbGVFeGlzdHModXJsKSkgY29udGludWU7XG5cbiAgICBhbGxFcnJvcnMucHVzaCh7XG4gICAgICBraW5kOiBuZy5EaWFnbm9zdGljS2luZC5FcnJvcixcbiAgICAgIG1lc3NhZ2U6IGBVUkwgZG9lcyBub3QgcG9pbnQgdG8gYSB2YWxpZCBmaWxlYCxcbiAgICAgIC8vIEV4Y2x1ZGUgb3BlbmluZyBhbmQgY2xvc2luZyBxdW90ZXMgaW4gdGhlIHVybCBzcGFuLlxuICAgICAgc3Bhbjoge3N0YXJ0OiB1cmxOb2RlLmdldFN0YXJ0KCkgKyAxLCBlbmQ6IHVybE5vZGUuZW5kIC0gMX0sXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGFsbEVycm9ycztcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSByZWN1cnNpdmUgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBjaGFpbnMgZGlhZ25vc3RpYyBtZXNzYWdlcy5cbiAqIEBwYXJhbSBjaGFpblxuICovXG5mdW5jdGlvbiBjaGFpbkRpYWdub3N0aWNzKGNoYWluOiBuZy5EaWFnbm9zdGljTWVzc2FnZUNoYWluKTogdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIG5leHQ6IGNoYWluLm5leHQgPyBjaGFpbi5uZXh0Lm1hcChjaGFpbkRpYWdub3N0aWNzKSA6IHVuZGVmaW5lZFxuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgbmcuRGlhZ25vc3RpYyB0byB0cy5EaWFnbm9zdGljLlxuICogQHBhcmFtIGQgZGlhZ25vc3RpY1xuICogQHBhcmFtIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5nRGlhZ25vc3RpY1RvVHNEaWFnbm9zdGljKFxuICAgIGQ6IG5nLkRpYWdub3N0aWMsIGZpbGU6IHRzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQpOiB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIHtcbiAgICBmaWxlLFxuICAgIHN0YXJ0OiBkLnNwYW4uc3RhcnQsXG4gICAgbGVuZ3RoOiBkLnNwYW4uZW5kIC0gZC5zcGFuLnN0YXJ0LFxuICAgIG1lc3NhZ2VUZXh0OiB0eXBlb2YgZC5tZXNzYWdlID09PSAnc3RyaW5nJyA/IGQubWVzc2FnZSA6IGNoYWluRGlhZ25vc3RpY3MoZC5tZXNzYWdlKSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgc291cmNlOiAnbmcnLFxuICB9O1xufVxuXG4vKipcbiAqIFJldHVybiBlbGVtZW50cyBmaWx0ZXJlZCBieSB1bmlxdWUgc3Bhbi5cbiAqIEBwYXJhbSBlbGVtZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pcXVlQnlTcGFuPFQgZXh0ZW5kc3tzcGFuOiBuZy5TcGFufT4oZWxlbWVudHM6IFRbXSk6IFRbXSB7XG4gIGNvbnN0IHJlc3VsdDogVFtdID0gW107XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBTZXQ8bnVtYmVyPj4oKTtcbiAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgY29uc3Qge3NwYW59ID0gZWxlbWVudDtcbiAgICBsZXQgc2V0ID0gbWFwLmdldChzcGFuLnN0YXJ0KTtcbiAgICBpZiAoIXNldCkge1xuICAgICAgc2V0ID0gbmV3IFNldCgpO1xuICAgICAgbWFwLnNldChzcGFuLnN0YXJ0LCBzZXQpO1xuICAgIH1cbiAgICBpZiAoIXNldC5oYXMoc3Bhbi5lbmQpKSB7XG4gICAgICBzZXQuYWRkKHNwYW4uZW5kKTtcbiAgICAgIHJlc3VsdC5wdXNoKGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19