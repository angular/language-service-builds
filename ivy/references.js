(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/references", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "typescript", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/ts_utils", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReferencesAndRenameBuilder = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    var ts = require("typescript");
    var template_target_1 = require("@angular/language-service/ivy/template_target");
    var ts_utils_1 = require("@angular/language-service/ivy/ts_utils");
    var utils_1 = require("@angular/language-service/ivy/utils");
    function toFilePosition(shimLocation) {
        return { fileName: shimLocation.shimPath, position: shimLocation.positionInShimFile };
    }
    var RequestKind;
    (function (RequestKind) {
        RequestKind[RequestKind["Template"] = 0] = "Template";
        RequestKind[RequestKind["TypeScript"] = 1] = "TypeScript";
    })(RequestKind || (RequestKind = {}));
    var ReferencesAndRenameBuilder = /** @class */ (function () {
        function ReferencesAndRenameBuilder(strategy, tsLS, compiler) {
            this.strategy = strategy;
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.ttc = this.compiler.getTemplateTypeChecker();
        }
        ReferencesAndRenameBuilder.prototype.getRenameInfo = function (filePath, position) {
            var templateInfo = utils_1.getTemplateInfoAtPosition(filePath, position, this.compiler);
            // We could not get a template at position so we assume the request came from outside the
            // template.
            if (templateInfo === undefined) {
                return this.tsLS.getRenameInfo(filePath, position);
            }
            var allTargetDetails = this.getTargetDetailsAtTemplatePosition(templateInfo, position);
            if (allTargetDetails === null) {
                return { canRename: false, localizedErrorMessage: 'Could not find template node at position.' };
            }
            var templateTarget = allTargetDetails[0].templateTarget;
            var templateTextAndSpan = getRenameTextAndSpanAtPosition(templateTarget, position);
            if (templateTextAndSpan === null) {
                return { canRename: false, localizedErrorMessage: 'Could not determine template node text.' };
            }
            var text = templateTextAndSpan.text, span = templateTextAndSpan.span;
            return {
                canRename: true,
                displayName: text,
                fullDisplayName: text,
                triggerSpan: utils_1.toTextSpan(span),
            };
        };
        ReferencesAndRenameBuilder.prototype.findRenameLocations = function (filePath, position) {
            this.ttc.generateAllTypeCheckBlocks();
            var templateInfo = utils_1.getTemplateInfoAtPosition(filePath, position, this.compiler);
            // We could not get a template at position so we assume the request came from outside the
            // template.
            if (templateInfo === undefined) {
                var requestNode = this.getTsNodeAtPosition(filePath, position);
                if (requestNode === null) {
                    return undefined;
                }
                var requestOrigin = { kind: RequestKind.TypeScript, requestNode: requestNode };
                return this.findRenameLocationsAtTypescriptPosition(filePath, position, requestOrigin);
            }
            return this.findRenameLocationsAtTemplatePosition(templateInfo, position);
        };
        ReferencesAndRenameBuilder.prototype.findRenameLocationsAtTemplatePosition = function (templateInfo, position) {
            var e_1, _a, e_2, _b;
            var allTargetDetails = this.getTargetDetailsAtTemplatePosition(templateInfo, position);
            if (allTargetDetails === null) {
                return undefined;
            }
            var allRenameLocations = [];
            try {
                for (var allTargetDetails_1 = tslib_1.__values(allTargetDetails), allTargetDetails_1_1 = allTargetDetails_1.next(); !allTargetDetails_1_1.done; allTargetDetails_1_1 = allTargetDetails_1.next()) {
                    var targetDetails = allTargetDetails_1_1.value;
                    var requestOrigin = {
                        kind: RequestKind.Template,
                        requestNode: targetDetails.templateTarget,
                        position: position,
                    };
                    try {
                        for (var _c = (e_2 = void 0, tslib_1.__values(targetDetails.typescriptLocations)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var location_1 = _d.value;
                            var locations = this.findRenameLocationsAtTypescriptPosition(location_1.fileName, location_1.position, requestOrigin);
                            // If we couldn't find rename locations for _any_ result, we should not allow renaming to
                            // proceed instead of having a partially complete rename.
                            if (locations === undefined) {
                                return undefined;
                            }
                            allRenameLocations.push.apply(allRenameLocations, tslib_1.__spread(locations));
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (allTargetDetails_1_1 && !allTargetDetails_1_1.done && (_a = allTargetDetails_1.return)) _a.call(allTargetDetails_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return allRenameLocations.length > 0 ? allRenameLocations : undefined;
        };
        ReferencesAndRenameBuilder.prototype.getTsNodeAtPosition = function (filePath, position) {
            var _a;
            var sf = this.strategy.getProgram().getSourceFile(filePath);
            if (!sf) {
                return null;
            }
            return (_a = ts_utils_1.findTightestNode(sf, position)) !== null && _a !== void 0 ? _a : null;
        };
        ReferencesAndRenameBuilder.prototype.findRenameLocationsAtTypescriptPosition = function (filePath, position, requestOrigin) {
            var e_3, _a;
            var originalNodeText;
            if (requestOrigin.kind === RequestKind.TypeScript) {
                originalNodeText = requestOrigin.requestNode.getText();
            }
            else {
                var templateNodeText = getRenameTextAndSpanAtPosition(requestOrigin.requestNode, requestOrigin.position);
                if (templateNodeText === null) {
                    return undefined;
                }
                originalNodeText = templateNodeText.text;
            }
            var locations = this.tsLS.findRenameLocations(filePath, position, /*findInStrings*/ false, /*findInComments*/ false);
            if (locations === undefined) {
                return undefined;
            }
            var entries = [];
            try {
                for (var locations_1 = tslib_1.__values(locations), locations_1_1 = locations_1.next(); !locations_1_1.done; locations_1_1 = locations_1.next()) {
                    var location_2 = locations_1_1.value;
                    // TODO(atscott): Determine if a file is a shim file in a more robust way and make the API
                    // available in an appropriate location.
                    if (this.ttc.isTrackedTypeCheckFile(file_system_1.absoluteFrom(location_2.fileName))) {
                        var entry = this.convertToTemplateDocumentSpan(location_2, this.ttc, originalNodeText);
                        // There is no template node whose text matches the original rename request. Bail on
                        // renaming completely rather than providing incomplete results.
                        if (entry === null) {
                            return undefined;
                        }
                        entries.push(entry);
                    }
                    else {
                        // Ensure we only allow renaming a TS result with matching text
                        var refNode = this.getTsNodeAtPosition(location_2.fileName, location_2.textSpan.start);
                        if (refNode === null || refNode.getText() !== originalNodeText) {
                            return undefined;
                        }
                        entries.push(location_2);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (locations_1_1 && !locations_1_1.done && (_a = locations_1.return)) _a.call(locations_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return entries;
        };
        ReferencesAndRenameBuilder.prototype.getReferencesAtPosition = function (filePath, position) {
            this.ttc.generateAllTypeCheckBlocks();
            var templateInfo = utils_1.getTemplateInfoAtPosition(filePath, position, this.compiler);
            if (templateInfo === undefined) {
                return this.getReferencesAtTypescriptPosition(filePath, position);
            }
            return this.getReferencesAtTemplatePosition(templateInfo, position);
        };
        ReferencesAndRenameBuilder.prototype.getReferencesAtTemplatePosition = function (templateInfo, position) {
            var e_4, _a, e_5, _b;
            var allTargetDetails = this.getTargetDetailsAtTemplatePosition(templateInfo, position);
            if (allTargetDetails === null) {
                return undefined;
            }
            var allReferences = [];
            try {
                for (var allTargetDetails_2 = tslib_1.__values(allTargetDetails), allTargetDetails_2_1 = allTargetDetails_2.next(); !allTargetDetails_2_1.done; allTargetDetails_2_1 = allTargetDetails_2.next()) {
                    var targetDetails = allTargetDetails_2_1.value;
                    try {
                        for (var _c = (e_5 = void 0, tslib_1.__values(targetDetails.typescriptLocations)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var location_3 = _d.value;
                            var refs = this.getReferencesAtTypescriptPosition(location_3.fileName, location_3.position);
                            if (refs !== undefined) {
                                allReferences.push.apply(allReferences, tslib_1.__spread(refs));
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (allTargetDetails_2_1 && !allTargetDetails_2_1.done && (_a = allTargetDetails_2.return)) _a.call(allTargetDetails_2);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return allReferences.length > 0 ? allReferences : undefined;
        };
        ReferencesAndRenameBuilder.prototype.getTargetDetailsAtTemplatePosition = function (_a, position) {
            var e_6, _b;
            var template = _a.template, component = _a.component;
            // Find the AST node in the template at the position.
            var positionDetails = template_target_1.getTargetAtPosition(template, position);
            if (positionDetails === null) {
                return null;
            }
            var nodes = positionDetails.context.kind === template_target_1.TargetNodeKind.TwoWayBindingContext ?
                positionDetails.context.nodes :
                [positionDetails.context.node];
            var details = [];
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    // Get the information about the TCB at the template position.
                    var symbol = this.ttc.getSymbolOfNode(node, component);
                    if (symbol === null) {
                        continue;
                    }
                    var templateTarget = node;
                    switch (symbol.kind) {
                        case api_1.SymbolKind.Directive:
                        case api_1.SymbolKind.Template:
                            // References to elements, templates, and directives will be through template references
                            // (#ref). They shouldn't be used directly for a Language Service reference request.
                            break;
                        case api_1.SymbolKind.Element: {
                            var matches = utils_1.getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
                            details.push({ typescriptLocations: this.getPositionsForDirectives(matches), templateTarget: templateTarget });
                            break;
                        }
                        case api_1.SymbolKind.DomBinding: {
                            // Dom bindings aren't currently type-checked (see `checkTypeOfDomBindings`) so they don't
                            // have a shim location. This means we can't match dom bindings to their lib.dom
                            // reference, but we can still see if they match to a directive.
                            if (!(node instanceof compiler_1.TmplAstTextAttribute) && !(node instanceof compiler_1.TmplAstBoundAttribute)) {
                                return null;
                            }
                            var directives = utils_1.getDirectiveMatchesForAttribute(node.name, symbol.host.templateNode, symbol.host.directives);
                            details.push({
                                typescriptLocations: this.getPositionsForDirectives(directives),
                                templateTarget: templateTarget,
                            });
                            break;
                        }
                        case api_1.SymbolKind.Reference: {
                            details.push({
                                typescriptLocations: [toFilePosition(symbol.referenceVarLocation)],
                                templateTarget: templateTarget,
                            });
                            break;
                        }
                        case api_1.SymbolKind.Variable: {
                            if ((templateTarget instanceof compiler_1.TmplAstVariable)) {
                                if (templateTarget.valueSpan !== undefined &&
                                    utils_1.isWithin(position, templateTarget.valueSpan)) {
                                    // In the valueSpan of the variable, we want to get the reference of the initializer.
                                    details.push({
                                        typescriptLocations: [toFilePosition(symbol.initializerLocation)],
                                        templateTarget: templateTarget,
                                    });
                                }
                                else if (utils_1.isWithin(position, templateTarget.keySpan)) {
                                    // In the keySpan of the variable, we want to get the reference of the local variable.
                                    details.push({
                                        typescriptLocations: [toFilePosition(symbol.localVarLocation)],
                                        templateTarget: templateTarget,
                                    });
                                }
                            }
                            else {
                                // If the templateNode is not the `TmplAstVariable`, it must be a usage of the
                                // variable somewhere in the template.
                                details.push({
                                    typescriptLocations: [toFilePosition(symbol.localVarLocation)],
                                    templateTarget: templateTarget,
                                });
                            }
                            break;
                        }
                        case api_1.SymbolKind.Input:
                        case api_1.SymbolKind.Output: {
                            details.push({
                                typescriptLocations: symbol.bindings.map(function (binding) { return toFilePosition(binding.shimLocation); }),
                                templateTarget: templateTarget,
                            });
                            break;
                        }
                        case api_1.SymbolKind.Pipe:
                        case api_1.SymbolKind.Expression: {
                            details.push({ typescriptLocations: [toFilePosition(symbol.shimLocation)], templateTarget: templateTarget });
                            break;
                        }
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_b = nodes_1.return)) _b.call(nodes_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return details.length > 0 ? details : null;
        };
        ReferencesAndRenameBuilder.prototype.getPositionsForDirectives = function (directives) {
            var e_7, _a;
            var allDirectives = [];
            try {
                for (var _b = tslib_1.__values(directives.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirClass = dir.tsSymbol.valueDeclaration;
                    if (dirClass === undefined || !ts.isClassDeclaration(dirClass) ||
                        dirClass.name === undefined) {
                        continue;
                    }
                    var fileName = dirClass.getSourceFile().fileName;
                    var position = dirClass.name.getStart();
                    allDirectives.push({ fileName: fileName, position: position });
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return allDirectives;
        };
        ReferencesAndRenameBuilder.prototype.getReferencesAtTypescriptPosition = function (fileName, position) {
            var e_8, _a;
            var refs = this.tsLS.getReferencesAtPosition(fileName, position);
            if (refs === undefined) {
                return undefined;
            }
            var entries = [];
            try {
                for (var refs_1 = tslib_1.__values(refs), refs_1_1 = refs_1.next(); !refs_1_1.done; refs_1_1 = refs_1.next()) {
                    var ref = refs_1_1.value;
                    if (this.ttc.isTrackedTypeCheckFile(file_system_1.absoluteFrom(ref.fileName))) {
                        var entry = this.convertToTemplateDocumentSpan(ref, this.ttc);
                        if (entry !== null) {
                            entries.push(entry);
                        }
                    }
                    else {
                        entries.push(ref);
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (refs_1_1 && !refs_1_1.done && (_a = refs_1.return)) _a.call(refs_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return entries;
        };
        ReferencesAndRenameBuilder.prototype.convertToTemplateDocumentSpan = function (shimDocumentSpan, templateTypeChecker, requiredNodeText) {
            var sf = this.strategy.getProgram().getSourceFile(shimDocumentSpan.fileName);
            if (sf === undefined) {
                return null;
            }
            var tcbNode = ts_utils_1.findTightestNode(sf, shimDocumentSpan.textSpan.start);
            if (tcbNode === undefined ||
                comments_1.hasExpressionIdentifier(sf, tcbNode, comments_1.ExpressionIdentifier.EVENT_PARAMETER)) {
                // If the reference result is the $event parameter in the subscribe/addEventListener
                // function in the TCB, we want to filter this result out of the references. We really only
                // want to return references to the parameter in the template itself.
                return null;
            }
            // TODO(atscott): Determine how to consistently resolve paths. i.e. with the project
            // serverHost or LSParseConfigHost in the adapter. We should have a better defined way to
            // normalize paths.
            var mapping = templateTypeChecker.getTemplateMappingAtShimLocation({
                shimPath: file_system_1.absoluteFrom(shimDocumentSpan.fileName),
                positionInShimFile: shimDocumentSpan.textSpan.start,
            });
            if (mapping === null) {
                return null;
            }
            var templateSourceMapping = mapping.templateSourceMapping, span = mapping.span;
            var templateUrl;
            if (templateSourceMapping.type === 'direct') {
                templateUrl = file_system_1.absoluteFromSourceFile(templateSourceMapping.node.getSourceFile());
            }
            else if (templateSourceMapping.type === 'external') {
                templateUrl = file_system_1.absoluteFrom(templateSourceMapping.templateUrl);
            }
            else {
                // This includes indirect mappings, which are difficult to map directly to the code
                // location. Diagnostics similarly return a synthetic template string for this case rather
                // than a real location.
                return null;
            }
            if (requiredNodeText !== undefined && span.toString() !== requiredNodeText) {
                return null;
            }
            return tslib_1.__assign(tslib_1.__assign({}, shimDocumentSpan), { fileName: templateUrl, textSpan: utils_1.toTextSpan(span) });
        };
        return ReferencesAndRenameBuilder;
    }());
    exports.ReferencesAndRenameBuilder = ReferencesAndRenameBuilder;
    function getRenameTextAndSpanAtPosition(node, position) {
        if (node instanceof compiler_1.TmplAstBoundAttribute || node instanceof compiler_1.TmplAstTextAttribute ||
            node instanceof compiler_1.TmplAstBoundEvent) {
            if (node.keySpan === undefined) {
                return null;
            }
            return { text: node.name, span: node.keySpan };
        }
        else if (node instanceof compiler_1.TmplAstVariable || node instanceof compiler_1.TmplAstReference) {
            if (utils_1.isWithin(position, node.keySpan)) {
                return { text: node.keySpan.toString(), span: node.keySpan };
            }
            else if (node.valueSpan && utils_1.isWithin(position, node.valueSpan)) {
                return { text: node.valueSpan.toString(), span: node.valueSpan };
            }
        }
        if (node instanceof compiler_1.BindingPipe) {
            // TODO(atscott): Add support for renaming pipes
            return null;
        }
        if (node instanceof compiler_1.PropertyRead || node instanceof compiler_1.MethodCall || node instanceof compiler_1.PropertyWrite ||
            node instanceof compiler_1.SafePropertyRead || node instanceof compiler_1.SafeMethodCall) {
            return { text: node.name, span: node.nameSpan };
        }
        else if (node instanceof compiler_1.LiteralPrimitive) {
            var span = node.span;
            var text = node.value;
            if (typeof text === 'string') {
                // The span of a string literal includes the quotes but they should be removed for renaming.
                span.start += 1;
                span.end -= 1;
            }
            return { text: text, span: span };
        }
        return null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFxUztJQUVyUywyRUFBaUg7SUFDakgscUVBQTBKO0lBQzFKLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNFO0lBQ3RFLG1FQUE0QztJQUM1Qyw2REFBeUo7SUFPekosU0FBUyxjQUFjLENBQUMsWUFBMEI7UUFDaEQsT0FBTyxFQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsa0JBQWtCLEVBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsSUFBSyxXQUdKO0lBSEQsV0FBSyxXQUFXO1FBQ2QscURBQVEsQ0FBQTtRQUNSLHlEQUFVLENBQUE7SUFDWixDQUFDLEVBSEksV0FBVyxLQUFYLFdBQVcsUUFHZjtJQTZCRDtRQUdFLG9DQUNxQixRQUFxQyxFQUNyQyxJQUF3QixFQUFtQixRQUFvQjtZQUQvRCxhQUFRLEdBQVIsUUFBUSxDQUE2QjtZQUNyQyxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBSm5FLFFBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFJeUIsQ0FBQztRQUV4RixrREFBYSxHQUFiLFVBQWMsUUFBZ0IsRUFBRSxRQUFnQjtZQUU5QyxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRix5RkFBeUY7WUFDekYsWUFBWTtZQUNaLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEs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WUFBWSxxQkFBVSxJQUFJLElBQUksWUFBWSx3QkFBYTtZQUMzRixJQUFJLFlBQVksMkJBQWdCLElBQUksSUFBSSxZQUFZLHlCQUFjLEVBQUU7WUFDdEUsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFDLENBQUM7U0FDL0M7YUFBTSxJQUFJLElBQUksWUFBWSwyQkFBZ0IsRUFBRTtZQUMzQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDeEIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7Z0JBQzVCLDRGQUE0RjtnQkFDNUYsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQ2Y7WUFDRCxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztTQUNyQjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEFTVCwgQmluZGluZ1BpcGUsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgU2hpbUxvY2F0aW9uLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0V4cHJlc3Npb25JZGVudGlmaWVyLCBoYXNFeHByZXNzaW9uSWRlbnRpZmllcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2NvbW1lbnRzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dldFRhcmdldEF0UG9zaXRpb24sIFRhcmdldE5vZGVLaW5kfSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdHNfdXRpbHMnO1xuaW1wb3J0IHtnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZywgZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmludGVyZmFjZSBGaWxlUG9zaXRpb24ge1xuICBmaWxlTmFtZTogc3RyaW5nO1xuICBwb3NpdGlvbjogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiB0b0ZpbGVQb3NpdGlvbihzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbik6IEZpbGVQb3NpdGlvbiB7XG4gIHJldHVybiB7ZmlsZU5hbWU6IHNoaW1Mb2NhdGlvbi5zaGltUGF0aCwgcG9zaXRpb246IHNoaW1Mb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGV9O1xufVxuXG5lbnVtIFJlcXVlc3RLaW5kIHtcbiAgVGVtcGxhdGUsXG4gIFR5cGVTY3JpcHQsXG59XG5cbmludGVyZmFjZSBUZW1wbGF0ZVJlcXVlc3Qge1xuICBraW5kOiBSZXF1ZXN0S2luZC5UZW1wbGF0ZTtcbiAgcmVxdWVzdE5vZGU6IFRtcGxBc3ROb2RlfEFTVDtcbiAgcG9zaXRpb246IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFR5cGVTY3JpcHRSZXF1ZXN0IHtcbiAga2luZDogUmVxdWVzdEtpbmQuVHlwZVNjcmlwdDtcbiAgcmVxdWVzdE5vZGU6IHRzLk5vZGU7XG59XG5cbnR5cGUgUmVxdWVzdE9yaWdpbiA9IFRlbXBsYXRlUmVxdWVzdHxUeXBlU2NyaXB0UmVxdWVzdDtcblxuaW50ZXJmYWNlIFRlbXBsYXRlTG9jYXRpb25EZXRhaWxzIHtcbiAgLyoqXG4gICAqIEEgdGFyZ2V0IG5vZGUgaW4gYSB0ZW1wbGF0ZS5cbiAgICovXG4gIHRlbXBsYXRlVGFyZ2V0OiBUbXBsQXN0Tm9kZXxBU1Q7XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgbG9jYXRpb25zIHdoaWNoIHRoZSB0ZW1wbGF0ZSBub2RlIG1hcHMgdG8uIEEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSBtaWdodCBtYXAgdG9cbiAgICogc2V2ZXJhbCBUUyBub2Rlcy4gRm9yIGV4YW1wbGUsIGEgdGVtcGxhdGUgbm9kZSBmb3IgYW4gYXR0cmlidXRlIG1pZ2h0IHJlc29sdmUgdG8gc2V2ZXJhbFxuICAgKiBkaXJlY3RpdmVzIG9yIGEgZGlyZWN0aXZlIGFuZCBvbmUgb2YgaXRzIGlucHV0cy5cbiAgICovXG4gIHR5cGVzY3JpcHRMb2NhdGlvbnM6IEZpbGVQb3NpdGlvbltdO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHR0YyA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0UmVuYW1lSW5mbyhmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIE9taXQ8dHMuUmVuYW1lSW5mb1N1Y2Nlc3MsICdraW5kJ3wna2luZE1vZGlmaWVycyc+fHRzLlJlbmFtZUluZm9GYWlsdXJlIHtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgLy8gV2UgY291bGQgbm90IGdldCBhIHRlbXBsYXRlIGF0IHBvc2l0aW9uIHNvIHdlIGFzc3VtZSB0aGUgcmVxdWVzdCBjYW1lIGZyb20gb3V0c2lkZSB0aGVcbiAgICAvLyB0ZW1wbGF0ZS5cbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0UmVuYW1lSW5mbyhmaWxlUGF0aCwgcG9zaXRpb24pO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFRhcmdldERldGFpbHMgPSB0aGlzLmdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGFsbFRhcmdldERldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2FuUmVuYW1lOiBmYWxzZSwgbG9jYWxpemVkRXJyb3JNZXNzYWdlOiAnQ291bGQgbm90IGZpbmQgdGVtcGxhdGUgbm9kZSBhdCBwb3NpdGlvbi4nfTtcbiAgICB9XG4gICAgY29uc3Qge3RlbXBsYXRlVGFyZ2V0fSA9IGFsbFRhcmdldERldGFpbHNbMF07XG4gICAgY29uc3QgdGVtcGxhdGVUZXh0QW5kU3BhbiA9IGdldFJlbmFtZVRleHRBbmRTcGFuQXRQb3NpdGlvbih0ZW1wbGF0ZVRhcmdldCwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZVRleHRBbmRTcGFuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge2NhblJlbmFtZTogZmFsc2UsIGxvY2FsaXplZEVycm9yTWVzc2FnZTogJ0NvdWxkIG5vdCBkZXRlcm1pbmUgdGVtcGxhdGUgbm9kZSB0ZXh0Lid9O1xuICAgIH1cbiAgICBjb25zdCB7dGV4dCwgc3Bhbn0gPSB0ZW1wbGF0ZVRleHRBbmRTcGFuO1xuICAgIHJldHVybiB7XG4gICAgICBjYW5SZW5hbWU6IHRydWUsXG4gICAgICBkaXNwbGF5TmFtZTogdGV4dCxcbiAgICAgIGZ1bGxEaXNwbGF5TmFtZTogdGV4dCxcbiAgICAgIHRyaWdnZXJTcGFuOiB0b1RleHRTcGFuKHNwYW4pLFxuICAgIH07XG4gIH1cblxuICBmaW5kUmVuYW1lTG9jYXRpb25zKGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgdGhpcy50dGMuZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgLy8gV2UgY291bGQgbm90IGdldCBhIHRlbXBsYXRlIGF0IHBvc2l0aW9uIHNvIHdlIGFzc3VtZSB0aGUgcmVxdWVzdCBjYW1lIGZyb20gb3V0c2lkZSB0aGVcbiAgICAvLyB0ZW1wbGF0ZS5cbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3ROb2RlID0gdGhpcy5nZXRUc05vZGVBdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVxdWVzdE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlcXVlc3RPcmlnaW46IFR5cGVTY3JpcHRSZXF1ZXN0ID0ge2tpbmQ6IFJlcXVlc3RLaW5kLlR5cGVTY3JpcHQsIHJlcXVlc3ROb2RlfTtcbiAgICAgIHJldHVybiB0aGlzLmZpbmRSZW5hbWVMb2NhdGlvbnNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHJlcXVlc3RPcmlnaW4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZpbmRSZW5hbWVMb2NhdGlvbnNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGZpbmRSZW5hbWVMb2NhdGlvbnNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvOiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGFsbFRhcmdldERldGFpbHMgPSB0aGlzLmdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGFsbFRhcmdldERldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgYWxsUmVuYW1lTG9jYXRpb25zOiB0cy5SZW5hbWVMb2NhdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCB0YXJnZXREZXRhaWxzIG9mIGFsbFRhcmdldERldGFpbHMpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3RPcmlnaW46IFRlbXBsYXRlUmVxdWVzdCA9IHtcbiAgICAgICAga2luZDogUmVxdWVzdEtpbmQuVGVtcGxhdGUsXG4gICAgICAgIHJlcXVlc3ROb2RlOiB0YXJnZXREZXRhaWxzLnRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICBwb3NpdGlvbixcbiAgICAgIH07XG5cbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGFyZ2V0RGV0YWlscy50eXBlc2NyaXB0TG9jYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9ucyA9IHRoaXMuZmluZFJlbmFtZUxvY2F0aW9uc0F0VHlwZXNjcmlwdFBvc2l0aW9uKFxuICAgICAgICAgICAgbG9jYXRpb24uZmlsZU5hbWUsIGxvY2F0aW9uLnBvc2l0aW9uLCByZXF1ZXN0T3JpZ2luKTtcbiAgICAgICAgLy8gSWYgd2UgY291bGRuJ3QgZmluZCByZW5hbWUgbG9jYXRpb25zIGZvciBfYW55XyByZXN1bHQsIHdlIHNob3VsZCBub3QgYWxsb3cgcmVuYW1pbmcgdG9cbiAgICAgICAgLy8gcHJvY2VlZCBpbnN0ZWFkIG9mIGhhdmluZyBhIHBhcnRpYWxseSBjb21wbGV0ZSByZW5hbWUuXG4gICAgICAgIGlmIChsb2NhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgYWxsUmVuYW1lTG9jYXRpb25zLnB1c2goLi4ubG9jYXRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFsbFJlbmFtZUxvY2F0aW9ucy5sZW5ndGggPiAwID8gYWxsUmVuYW1lTG9jYXRpb25zIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUc05vZGVBdFBvc2l0aW9uKGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfG51bGwge1xuICAgIGNvbnN0IHNmID0gdGhpcy5zdHJhdGVneS5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlUGF0aCk7XG4gICAgaWYgKCFzZikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbikgPz8gbnVsbDtcbiAgfVxuXG4gIGZpbmRSZW5hbWVMb2NhdGlvbnNBdFR5cGVzY3JpcHRQb3NpdGlvbihcbiAgICAgIGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICByZXF1ZXN0T3JpZ2luOiBSZXF1ZXN0T3JpZ2luKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGxldCBvcmlnaW5hbE5vZGVUZXh0OiBzdHJpbmc7XG4gICAgaWYgKHJlcXVlc3RPcmlnaW4ua2luZCA9PT0gUmVxdWVzdEtpbmQuVHlwZVNjcmlwdCkge1xuICAgICAgb3JpZ2luYWxOb2RlVGV4dCA9IHJlcXVlc3RPcmlnaW4ucmVxdWVzdE5vZGUuZ2V0VGV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU5vZGVUZXh0ID1cbiAgICAgICAgICBnZXRSZW5hbWVUZXh0QW5kU3BhbkF0UG9zaXRpb24ocmVxdWVzdE9yaWdpbi5yZXF1ZXN0Tm9kZSwgcmVxdWVzdE9yaWdpbi5wb3NpdGlvbik7XG4gICAgICBpZiAodGVtcGxhdGVOb2RlVGV4dCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgb3JpZ2luYWxOb2RlVGV4dCA9IHRlbXBsYXRlTm9kZVRleHQudGV4dDtcbiAgICB9XG5cbiAgICBjb25zdCBsb2NhdGlvbnMgPSB0aGlzLnRzTFMuZmluZFJlbmFtZUxvY2F0aW9ucyhcbiAgICAgICAgZmlsZVBhdGgsIHBvc2l0aW9uLCAvKmZpbmRJblN0cmluZ3MqLyBmYWxzZSwgLypmaW5kSW5Db21tZW50cyovIGZhbHNlKTtcbiAgICBpZiAobG9jYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cmllczogdHMuUmVuYW1lTG9jYXRpb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaWYgYSBmaWxlIGlzIGEgc2hpbSBmaWxlIGluIGEgbW9yZSByb2J1c3Qgd2F5IGFuZCBtYWtlIHRoZSBBUElcbiAgICAgIC8vIGF2YWlsYWJsZSBpbiBhbiBhcHByb3ByaWF0ZSBsb2NhdGlvbi5cbiAgICAgIGlmICh0aGlzLnR0Yy5pc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGFic29sdXRlRnJvbShsb2NhdGlvbi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5jb252ZXJ0VG9UZW1wbGF0ZURvY3VtZW50U3Bhbihsb2NhdGlvbiwgdGhpcy50dGMsIG9yaWdpbmFsTm9kZVRleHQpO1xuICAgICAgICAvLyBUaGVyZSBpcyBubyB0ZW1wbGF0ZSBub2RlIHdob3NlIHRleHQgbWF0Y2hlcyB0aGUgb3JpZ2luYWwgcmVuYW1lIHJlcXVlc3QuIEJhaWwgb25cbiAgICAgICAgLy8gcmVuYW1pbmcgY29tcGxldGVseSByYXRoZXIgdGhhbiBwcm92aWRpbmcgaW5jb21wbGV0ZSByZXN1bHRzLlxuICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBhbGxvdyByZW5hbWluZyBhIFRTIHJlc3VsdCB3aXRoIG1hdGNoaW5nIHRleHRcbiAgICAgICAgY29uc3QgcmVmTm9kZSA9IHRoaXMuZ2V0VHNOb2RlQXRQb3NpdGlvbihsb2NhdGlvbi5maWxlTmFtZSwgbG9jYXRpb24udGV4dFNwYW4uc3RhcnQpO1xuICAgICAgICBpZiAocmVmTm9kZSA9PT0gbnVsbCB8fCByZWZOb2RlLmdldFRleHQoKSAhPT0gb3JpZ2luYWxOb2RlVGV4dCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmllcy5wdXNoKGxvY2F0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVudHJpZXM7XG4gIH1cblxuICBnZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIHRoaXMudHRjLmdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIGlmICh0ZW1wbGF0ZUluZm8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvOiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGFsbFRhcmdldERldGFpbHMgPSB0aGlzLmdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGFsbFRhcmdldERldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGFsbFJlZmVyZW5jZXM6IHRzLlJlZmVyZW5jZUVudHJ5W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRhcmdldERldGFpbHMgb2YgYWxsVGFyZ2V0RGV0YWlscykge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0YXJnZXREZXRhaWxzLnR5cGVzY3JpcHRMb2NhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgcmVmcyA9IHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGxvY2F0aW9uLmZpbGVOYW1lLCBsb2NhdGlvbi5wb3NpdGlvbik7XG4gICAgICAgIGlmIChyZWZzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBhbGxSZWZlcmVuY2VzLnB1c2goLi4ucmVmcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFsbFJlZmVyZW5jZXMubGVuZ3RoID4gMCA/IGFsbFJlZmVyZW5jZXMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24oe3RlbXBsYXRlLCBjb21wb25lbnR9OiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgVGVtcGxhdGVMb2NhdGlvbkRldGFpbHNbXXxudWxsIHtcbiAgICAvLyBGaW5kIHRoZSBBU1Qgbm9kZSBpbiB0aGUgdGVtcGxhdGUgYXQgdGhlIHBvc2l0aW9uLlxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXMgOlxuICAgICAgICBbcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZV07XG5cbiAgICBjb25zdCBkZXRhaWxzOiBUZW1wbGF0ZUxvY2F0aW9uRGV0YWlsc1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgIC8vIEdldCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIFRDQiBhdCB0aGUgdGVtcGxhdGUgcG9zaXRpb24uXG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnR0Yy5nZXRTeW1ib2xPZk5vZGUobm9kZSwgY29tcG9uZW50KTtcbiAgICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlVGFyZ2V0ID0gbm9kZTtcbiAgICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgICAgIC8vIFJlZmVyZW5jZXMgdG8gZWxlbWVudHMsIHRlbXBsYXRlcywgYW5kIGRpcmVjdGl2ZXMgd2lsbCBiZSB0aHJvdWdoIHRlbXBsYXRlIHJlZmVyZW5jZXNcbiAgICAgICAgICAvLyAoI3JlZikuIFRoZXkgc2hvdWxkbid0IGJlIHVzZWQgZGlyZWN0bHkgZm9yIGEgTGFuZ3VhZ2UgU2VydmljZSByZWZlcmVuY2UgcmVxdWVzdC5cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6IHtcbiAgICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICAgIGRldGFpbHMucHVzaChcbiAgICAgICAgICAgICAge3R5cGVzY3JpcHRMb2NhdGlvbnM6IHRoaXMuZ2V0UG9zaXRpb25zRm9yRGlyZWN0aXZlcyhtYXRjaGVzKSwgdGVtcGxhdGVUYXJnZXR9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzoge1xuICAgICAgICAgIC8vIERvbSBiaW5kaW5ncyBhcmVuJ3QgY3VycmVudGx5IHR5cGUtY2hlY2tlZCAoc2VlIGBjaGVja1R5cGVPZkRvbUJpbmRpbmdzYCkgc28gdGhleSBkb24ndFxuICAgICAgICAgIC8vIGhhdmUgYSBzaGltIGxvY2F0aW9uLiBUaGlzIG1lYW5zIHdlIGNhbid0IG1hdGNoIGRvbSBiaW5kaW5ncyB0byB0aGVpciBsaWIuZG9tXG4gICAgICAgICAgLy8gcmVmZXJlbmNlLCBidXQgd2UgY2FuIHN0aWxsIHNlZSBpZiB0aGV5IG1hdGNoIHRvIGEgZGlyZWN0aXZlLlxuICAgICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgICAgICAgICAgICBub2RlLm5hbWUsIHN5bWJvbC5ob3N0LnRlbXBsYXRlTm9kZSwgc3ltYm9sLmhvc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGVzY3JpcHRMb2NhdGlvbnM6IHRoaXMuZ2V0UG9zaXRpb25zRm9yRGlyZWN0aXZlcyhkaXJlY3RpdmVzKSxcbiAgICAgICAgICAgIHRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5SZWZlcmVuY2U6IHtcbiAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5yZWZlcmVuY2VWYXJMb2NhdGlvbildLFxuICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOiB7XG4gICAgICAgICAgaWYgKCh0ZW1wbGF0ZVRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkpIHtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVRhcmdldC52YWx1ZVNwYW4gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgIGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZVRhcmdldC52YWx1ZVNwYW4pKSB7XG4gICAgICAgICAgICAgIC8vIEluIHRoZSB2YWx1ZVNwYW4gb2YgdGhlIHZhcmlhYmxlLCB3ZSB3YW50IHRvIGdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBpbml0aWFsaXplci5cbiAgICAgICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlc2NyaXB0TG9jYXRpb25zOiBbdG9GaWxlUG9zaXRpb24oc3ltYm9sLmluaXRpYWxpemVyTG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVRhcmdldCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZVRhcmdldC5rZXlTcGFuKSkge1xuICAgICAgICAgICAgICAvLyBJbiB0aGUga2V5U3BhbiBvZiB0aGUgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGxvY2FsIHZhcmlhYmxlLlxuICAgICAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGVzY3JpcHRMb2NhdGlvbnM6IFt0b0ZpbGVQb3NpdGlvbihzeW1ib2wubG9jYWxWYXJMb2NhdGlvbildLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgdGhlIHRlbXBsYXRlTm9kZSBpcyBub3QgdGhlIGBUbXBsQXN0VmFyaWFibGVgLCBpdCBtdXN0IGJlIGEgdXNhZ2Ugb2YgdGhlXG4gICAgICAgICAgICAvLyB2YXJpYWJsZSBzb21ld2hlcmUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5sb2NhbFZhckxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgIHRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDoge1xuICAgICAgICAgIGRldGFpbHMucHVzaCh7XG4gICAgICAgICAgICB0eXBlc2NyaXB0TG9jYXRpb25zOlxuICAgICAgICAgICAgICAgIHN5bWJvbC5iaW5kaW5ncy5tYXAoYmluZGluZyA9PiB0b0ZpbGVQb3NpdGlvbihiaW5kaW5nLnNoaW1Mb2NhdGlvbikpLFxuICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlBpcGU6XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgICAgZGV0YWlscy5wdXNoKFxuICAgICAgICAgICAgICB7dHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5zaGltTG9jYXRpb24pXSwgdGVtcGxhdGVUYXJnZXR9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZXRhaWxzLmxlbmd0aCA+IDAgPyBkZXRhaWxzIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UG9zaXRpb25zRm9yRGlyZWN0aXZlcyhkaXJlY3RpdmVzOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPik6IEZpbGVQb3NpdGlvbltdIHtcbiAgICBjb25zdCBhbGxEaXJlY3RpdmVzOiBGaWxlUG9zaXRpb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGRpckNsYXNzID0gZGlyLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICBpZiAoZGlyQ2xhc3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRpckNsYXNzKSB8fFxuICAgICAgICAgIGRpckNsYXNzLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge2ZpbGVOYW1lfSA9IGRpckNsYXNzLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gZGlyQ2xhc3MubmFtZS5nZXRTdGFydCgpO1xuICAgICAgYWxsRGlyZWN0aXZlcy5wdXNoKHtmaWxlTmFtZSwgcG9zaXRpb259KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWxsRGlyZWN0aXZlcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHJlZnMgPSB0aGlzLnRzTFMuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAocmVmcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGVudHJpZXM6IHRzLlJlZmVyZW5jZUVudHJ5W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiByZWZzKSB7XG4gICAgICBpZiAodGhpcy50dGMuaXNUcmFja2VkVHlwZUNoZWNrRmlsZShhYnNvbHV0ZUZyb20ocmVmLmZpbGVOYW1lKSkpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLmNvbnZlcnRUb1RlbXBsYXRlRG9jdW1lbnRTcGFuKHJlZiwgdGhpcy50dGMpO1xuICAgICAgICBpZiAoZW50cnkgIT09IG51bGwpIHtcbiAgICAgICAgICBlbnRyaWVzLnB1c2goZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnRyaWVzLnB1c2gocmVmKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVudHJpZXM7XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRUb1RlbXBsYXRlRG9jdW1lbnRTcGFuPFQgZXh0ZW5kcyB0cy5Eb2N1bWVudFNwYW4+KFxuICAgICAgc2hpbURvY3VtZW50U3BhbjogVCwgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlciwgcmVxdWlyZWROb2RlVGV4dD86IHN0cmluZyk6IFRcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBzZiA9IHRoaXMuc3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoc2hpbURvY3VtZW50U3Bhbi5maWxlTmFtZSk7XG4gICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0Y2JOb2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzZiwgc2hpbURvY3VtZW50U3Bhbi50ZXh0U3Bhbi5zdGFydCk7XG4gICAgaWYgKHRjYk5vZGUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcihzZiwgdGNiTm9kZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRVZFTlRfUEFSQU1FVEVSKSkge1xuICAgICAgLy8gSWYgdGhlIHJlZmVyZW5jZSByZXN1bHQgaXMgdGhlICRldmVudCBwYXJhbWV0ZXIgaW4gdGhlIHN1YnNjcmliZS9hZGRFdmVudExpc3RlbmVyXG4gICAgICAvLyBmdW5jdGlvbiBpbiB0aGUgVENCLCB3ZSB3YW50IHRvIGZpbHRlciB0aGlzIHJlc3VsdCBvdXQgb2YgdGhlIHJlZmVyZW5jZXMuIFdlIHJlYWxseSBvbmx5XG4gICAgICAvLyB3YW50IHRvIHJldHVybiByZWZlcmVuY2VzIHRvIHRoZSBwYXJhbWV0ZXIgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaG93IHRvIGNvbnNpc3RlbnRseSByZXNvbHZlIHBhdGhzLiBpLmUuIHdpdGggdGhlIHByb2plY3RcbiAgICAvLyBzZXJ2ZXJIb3N0IG9yIExTUGFyc2VDb25maWdIb3N0IGluIHRoZSBhZGFwdGVyLiBXZSBzaG91bGQgaGF2ZSBhIGJldHRlciBkZWZpbmVkIHdheSB0b1xuICAgIC8vIG5vcm1hbGl6ZSBwYXRocy5cbiAgICBjb25zdCBtYXBwaW5nID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbih7XG4gICAgICBzaGltUGF0aDogYWJzb2x1dGVGcm9tKHNoaW1Eb2N1bWVudFNwYW4uZmlsZU5hbWUpLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiBzaGltRG9jdW1lbnRTcGFuLnRleHRTcGFuLnN0YXJ0LFxuICAgIH0pO1xuICAgIGlmIChtYXBwaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge3RlbXBsYXRlU291cmNlTWFwcGluZywgc3Bhbn0gPSBtYXBwaW5nO1xuXG4gICAgbGV0IHRlbXBsYXRlVXJsOiBBYnNvbHV0ZUZzUGF0aDtcbiAgICBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUodGVtcGxhdGVTb3VyY2VNYXBwaW5nLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICB9IGVsc2UgaWYgKHRlbXBsYXRlU291cmNlTWFwcGluZy50eXBlID09PSAnZXh0ZXJuYWwnKSB7XG4gICAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudGVtcGxhdGVVcmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGluY2x1ZGVzIGluZGlyZWN0IG1hcHBpbmdzLCB3aGljaCBhcmUgZGlmZmljdWx0IHRvIG1hcCBkaXJlY3RseSB0byB0aGUgY29kZVxuICAgICAgLy8gbG9jYXRpb24uIERpYWdub3N0aWNzIHNpbWlsYXJseSByZXR1cm4gYSBzeW50aGV0aWMgdGVtcGxhdGUgc3RyaW5nIGZvciB0aGlzIGNhc2UgcmF0aGVyXG4gICAgICAvLyB0aGFuIGEgcmVhbCBsb2NhdGlvbi5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChyZXF1aXJlZE5vZGVUZXh0ICE9PSB1bmRlZmluZWQgJiYgc3Bhbi50b1N0cmluZygpICE9PSByZXF1aXJlZE5vZGVUZXh0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uc2hpbURvY3VtZW50U3BhbixcbiAgICAgIGZpbGVOYW1lOiB0ZW1wbGF0ZVVybCxcbiAgICAgIHRleHRTcGFuOiB0b1RleHRTcGFuKHNwYW4pLFxuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVuYW1lVGV4dEFuZFNwYW5BdFBvc2l0aW9uKG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcG9zaXRpb246IG51bWJlcik6XG4gICAge3RleHQ6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFufEFic29sdXRlU291cmNlU3Bhbn18bnVsbCB7XG4gIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgaWYgKG5vZGUua2V5U3BhbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHt0ZXh0OiBub2RlLm5hbWUsIHNwYW46IG5vZGUua2V5U3Bhbn07XG4gIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSB8fCBub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgIGlmIChpc1dpdGhpbihwb3NpdGlvbiwgbm9kZS5rZXlTcGFuKSkge1xuICAgICAgcmV0dXJuIHt0ZXh0OiBub2RlLmtleVNwYW4udG9TdHJpbmcoKSwgc3Bhbjogbm9kZS5rZXlTcGFufTtcbiAgICB9IGVsc2UgaWYgKG5vZGUudmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCBub2RlLnZhbHVlU3BhbikpIHtcbiAgICAgIHJldHVybiB7dGV4dDogbm9kZS52YWx1ZVNwYW4udG9TdHJpbmcoKSwgc3Bhbjogbm9kZS52YWx1ZVNwYW59O1xuICAgIH1cbiAgfVxuXG4gIGlmIChub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBBZGQgc3VwcG9ydCBmb3IgcmVuYW1pbmcgcGlwZXNcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAobm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCBub2RlIGluc3RhbmNlb2YgTWV0aG9kQ2FsbCB8fCBub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgbm9kZSBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsKSB7XG4gICAgcmV0dXJuIHt0ZXh0OiBub2RlLm5hbWUsIHNwYW46IG5vZGUubmFtZVNwYW59O1xuICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBMaXRlcmFsUHJpbWl0aXZlKSB7XG4gICAgY29uc3Qgc3BhbiA9IG5vZGUuc3BhbjtcbiAgICBjb25zdCB0ZXh0ID0gbm9kZS52YWx1ZTtcbiAgICBpZiAodHlwZW9mIHRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBUaGUgc3BhbiBvZiBhIHN0cmluZyBsaXRlcmFsIGluY2x1ZGVzIHRoZSBxdW90ZXMgYnV0IHRoZXkgc2hvdWxkIGJlIHJlbW92ZWQgZm9yIHJlbmFtaW5nLlxuICAgICAgc3Bhbi5zdGFydCArPSAxO1xuICAgICAgc3Bhbi5lbmQgLT0gMTtcbiAgICB9XG4gICAgcmV0dXJuIHt0ZXh0LCBzcGFufTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19