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
            var entries = new Map();
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
                        entries.set(createLocationKey(entry), entry);
                    }
                    else {
                        // Ensure we only allow renaming a TS result with matching text
                        var refNode = this.getTsNodeAtPosition(location_2.fileName, location_2.textSpan.start);
                        if (refNode === null || refNode.getText() !== originalNodeText) {
                            return undefined;
                        }
                        entries.set(createLocationKey(location_2), location_2);
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
            return Array.from(entries.values());
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
            var entries = new Map();
            try {
                for (var refs_1 = tslib_1.__values(refs), refs_1_1 = refs_1.next(); !refs_1_1.done; refs_1_1 = refs_1.next()) {
                    var ref = refs_1_1.value;
                    if (this.ttc.isTrackedTypeCheckFile(file_system_1.absoluteFrom(ref.fileName))) {
                        var entry = this.convertToTemplateDocumentSpan(ref, this.ttc);
                        if (entry !== null) {
                            entries.set(createLocationKey(entry), entry);
                        }
                    }
                    else {
                        entries.set(createLocationKey(ref), ref);
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
            return Array.from(entries.values());
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
            var mapping = utils_1.getTemplateLocationFromShimLocation(templateTypeChecker, file_system_1.absoluteFrom(shimDocumentSpan.fileName), shimDocumentSpan.textSpan.start);
            if (mapping === null) {
                return null;
            }
            var span = mapping.span, templateUrl = mapping.templateUrl;
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
    /**
     * Creates a "key" for a rename/reference location by concatenating file name, span start, and span
     * length. This allows us to de-duplicate template results when an item may appear several times
     * in the TCB but map back to the same template location.
     */
    function createLocationKey(ds) {
        return ds.fileName + ds.textSpan.start + ds.textSpan.length;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFxUztJQUVyUywyRUFBaUg7SUFDakgscUVBQTBKO0lBQzFKLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNFO0lBQ3RFLG1FQUE0QztJQUM1Qyw2REFBOEw7SUFPOUwsU0FBUyxjQUFjLENBQUMsWUFBMEI7UUFDaEQsT0FBTyxFQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsa0JBQWtCLEVBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsSUFBSyxXQUdKO0lBSEQsV0FBSyxXQUFXO1FBQ2QscURBQVEsQ0FBQTtRQUNSLHlEQUFVLENBQUE7SUFDWixDQUFDLEVBSEksV0FBVyxLQUFYLFdBQVcsUUFHZjtJQTZCRDtRQUdFLG9DQUNxQixRQUFxQyxFQUNyQyxJQUF3QixFQUFtQixRQUFvQjtZQUQvRCxhQUFRLEdBQVIsUUFBUSxDQUE2QjtZQUNyQyxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBSm5FLFFBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFJeUIsQ0FBQztRQUV4RixrREFBYSxHQUFiLFVBQWMsUUFBZ0IsRUFBRSxRQUFnQjtZQUU5QyxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRix5RkFBeUY7WUFDekYsWUFBWTtZQUNaLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEs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UUFBUSxFQUFDLENBQUM7U0FDL0M7YUFBTSxJQUFJLElBQUksWUFBWSwyQkFBZ0IsRUFBRTtZQUMzQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDeEIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7Z0JBQzVCLDRGQUE0RjtnQkFDNUYsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQ2Y7WUFDRCxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztTQUNyQjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUdEOzs7O09BSUc7SUFDSCxTQUFTLGlCQUFpQixDQUFDLEVBQW1CO1FBQzVDLE9BQU8sRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUM5RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQVNULCBCaW5kaW5nUGlwZSwgTGl0ZXJhbFByaW1pdGl2ZSwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbEtpbmQsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbiwgVGFyZ2V0Tm9kZUtpbmR9IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZX0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge2dldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBnZXRUZW1wbGF0ZUxvY2F0aW9uRnJvbVNoaW1Mb2NhdGlvbiwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmludGVyZmFjZSBGaWxlUG9zaXRpb24ge1xuICBmaWxlTmFtZTogc3RyaW5nO1xuICBwb3NpdGlvbjogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiB0b0ZpbGVQb3NpdGlvbihzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbik6IEZpbGVQb3NpdGlvbiB7XG4gIHJldHVybiB7ZmlsZU5hbWU6IHNoaW1Mb2NhdGlvbi5zaGltUGF0aCwgcG9zaXRpb246IHNoaW1Mb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGV9O1xufVxuXG5lbnVtIFJlcXVlc3RLaW5kIHtcbiAgVGVtcGxhdGUsXG4gIFR5cGVTY3JpcHQsXG59XG5cbmludGVyZmFjZSBUZW1wbGF0ZVJlcXVlc3Qge1xuICBraW5kOiBSZXF1ZXN0S2luZC5UZW1wbGF0ZTtcbiAgcmVxdWVzdE5vZGU6IFRtcGxBc3ROb2RlfEFTVDtcbiAgcG9zaXRpb246IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFR5cGVTY3JpcHRSZXF1ZXN0IHtcbiAga2luZDogUmVxdWVzdEtpbmQuVHlwZVNjcmlwdDtcbiAgcmVxdWVzdE5vZGU6IHRzLk5vZGU7XG59XG5cbnR5cGUgUmVxdWVzdE9yaWdpbiA9IFRlbXBsYXRlUmVxdWVzdHxUeXBlU2NyaXB0UmVxdWVzdDtcblxuaW50ZXJmYWNlIFRlbXBsYXRlTG9jYXRpb25EZXRhaWxzIHtcbiAgLyoqXG4gICAqIEEgdGFyZ2V0IG5vZGUgaW4gYSB0ZW1wbGF0ZS5cbiAgICovXG4gIHRlbXBsYXRlVGFyZ2V0OiBUbXBsQXN0Tm9kZXxBU1Q7XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgbG9jYXRpb25zIHdoaWNoIHRoZSB0ZW1wbGF0ZSBub2RlIG1hcHMgdG8uIEEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSBtaWdodCBtYXAgdG9cbiAgICogc2V2ZXJhbCBUUyBub2Rlcy4gRm9yIGV4YW1wbGUsIGEgdGVtcGxhdGUgbm9kZSBmb3IgYW4gYXR0cmlidXRlIG1pZ2h0IHJlc29sdmUgdG8gc2V2ZXJhbFxuICAgKiBkaXJlY3RpdmVzIG9yIGEgZGlyZWN0aXZlIGFuZCBvbmUgb2YgaXRzIGlucHV0cy5cbiAgICovXG4gIHR5cGVzY3JpcHRMb2NhdGlvbnM6IEZpbGVQb3NpdGlvbltdO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHR0YyA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0UmVuYW1lSW5mbyhmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIE9taXQ8dHMuUmVuYW1lSW5mb1N1Y2Nlc3MsICdraW5kJ3wna2luZE1vZGlmaWVycyc+fHRzLlJlbmFtZUluZm9GYWlsdXJlIHtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgLy8gV2UgY291bGQgbm90IGdldCBhIHRlbXBsYXRlIGF0IHBvc2l0aW9uIHNvIHdlIGFzc3VtZSB0aGUgcmVxdWVzdCBjYW1lIGZyb20gb3V0c2lkZSB0aGVcbiAgICAvLyB0ZW1wbGF0ZS5cbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0UmVuYW1lSW5mbyhmaWxlUGF0aCwgcG9zaXRpb24pO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFRhcmdldERldGFpbHMgPSB0aGlzLmdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGFsbFRhcmdldERldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7Y2FuUmVuYW1lOiBmYWxzZSwgbG9jYWxpemVkRXJyb3JNZXNzYWdlOiAnQ291bGQgbm90IGZpbmQgdGVtcGxhdGUgbm9kZSBhdCBwb3NpdGlvbi4nfTtcbiAgICB9XG4gICAgY29uc3Qge3RlbXBsYXRlVGFyZ2V0fSA9IGFsbFRhcmdldERldGFpbHNbMF07XG4gICAgY29uc3QgdGVtcGxhdGVUZXh0QW5kU3BhbiA9IGdldFJlbmFtZVRleHRBbmRTcGFuQXRQb3NpdGlvbih0ZW1wbGF0ZVRhcmdldCwgcG9zaXRpb24pO1xuICAgIGlmICh0ZW1wbGF0ZVRleHRBbmRTcGFuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge2NhblJlbmFtZTogZmFsc2UsIGxvY2FsaXplZEVycm9yTWVzc2FnZTogJ0NvdWxkIG5vdCBkZXRlcm1pbmUgdGVtcGxhdGUgbm9kZSB0ZXh0Lid9O1xuICAgIH1cbiAgICBjb25zdCB7dGV4dCwgc3Bhbn0gPSB0ZW1wbGF0ZVRleHRBbmRTcGFuO1xuICAgIHJldHVybiB7XG4gICAgICBjYW5SZW5hbWU6IHRydWUsXG4gICAgICBkaXNwbGF5TmFtZTogdGV4dCxcbiAgICAgIGZ1bGxEaXNwbGF5TmFtZTogdGV4dCxcbiAgICAgIHRyaWdnZXJTcGFuOiB0b1RleHRTcGFuKHNwYW4pLFxuICAgIH07XG4gIH1cblxuICBmaW5kUmVuYW1lTG9jYXRpb25zKGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiByZWFkb25seSB0cy5SZW5hbWVMb2NhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgdGhpcy50dGMuZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgLy8gV2UgY291bGQgbm90IGdldCBhIHRlbXBsYXRlIGF0IHBvc2l0aW9uIHNvIHdlIGFzc3VtZSB0aGUgcmVxdWVzdCBjYW1lIGZyb20gb3V0c2lkZSB0aGVcbiAgICAvLyB0ZW1wbGF0ZS5cbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3ROb2RlID0gdGhpcy5nZXRUc05vZGVBdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gICAgICBpZiAocmVxdWVzdE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlcXVlc3RPcmlnaW46IFR5cGVTY3JpcHRSZXF1ZXN0ID0ge2tpbmQ6IFJlcXVlc3RLaW5kLlR5cGVTY3JpcHQsIHJlcXVlc3ROb2RlfTtcbiAgICAgIHJldHVybiB0aGlzLmZpbmRSZW5hbWVMb2NhdGlvbnNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHJlcXVlc3RPcmlnaW4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZpbmRSZW5hbWVMb2NhdGlvbnNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGZpbmRSZW5hbWVMb2NhdGlvbnNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvOiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGFsbFRhcmdldERldGFpbHMgPSB0aGlzLmdldFRhcmdldERldGFpbHNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbik7XG4gICAgaWYgKGFsbFRhcmdldERldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgYWxsUmVuYW1lTG9jYXRpb25zOiB0cy5SZW5hbWVMb2NhdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCB0YXJnZXREZXRhaWxzIG9mIGFsbFRhcmdldERldGFpbHMpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3RPcmlnaW46IFRlbXBsYXRlUmVxdWVzdCA9IHtcbiAgICAgICAga2luZDogUmVxdWVzdEtpbmQuVGVtcGxhdGUsXG4gICAgICAgIHJlcXVlc3ROb2RlOiB0YXJnZXREZXRhaWxzLnRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICBwb3NpdGlvbixcbiAgICAgIH07XG5cbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGFyZ2V0RGV0YWlscy50eXBlc2NyaXB0TG9jYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9ucyA9IHRoaXMuZmluZFJlbmFtZUxvY2F0aW9uc0F0VHlwZXNjcmlwdFBvc2l0aW9uKFxuICAgICAgICAgICAgbG9jYXRpb24uZmlsZU5hbWUsIGxvY2F0aW9uLnBvc2l0aW9uLCByZXF1ZXN0T3JpZ2luKTtcbiAgICAgICAgLy8gSWYgd2UgY291bGRuJ3QgZmluZCByZW5hbWUgbG9jYXRpb25zIGZvciBfYW55XyByZXN1bHQsIHdlIHNob3VsZCBub3QgYWxsb3cgcmVuYW1pbmcgdG9cbiAgICAgICAgLy8gcHJvY2VlZCBpbnN0ZWFkIG9mIGhhdmluZyBhIHBhcnRpYWxseSBjb21wbGV0ZSByZW5hbWUuXG4gICAgICAgIGlmIChsb2NhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgYWxsUmVuYW1lTG9jYXRpb25zLnB1c2goLi4ubG9jYXRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFsbFJlbmFtZUxvY2F0aW9ucy5sZW5ndGggPiAwID8gYWxsUmVuYW1lTG9jYXRpb25zIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUc05vZGVBdFBvc2l0aW9uKGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5Ob2RlfG51bGwge1xuICAgIGNvbnN0IHNmID0gdGhpcy5zdHJhdGVneS5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShmaWxlUGF0aCk7XG4gICAgaWYgKCFzZikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbikgPz8gbnVsbDtcbiAgfVxuXG4gIGZpbmRSZW5hbWVMb2NhdGlvbnNBdFR5cGVzY3JpcHRQb3NpdGlvbihcbiAgICAgIGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICByZXF1ZXN0T3JpZ2luOiBSZXF1ZXN0T3JpZ2luKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGxldCBvcmlnaW5hbE5vZGVUZXh0OiBzdHJpbmc7XG4gICAgaWYgKHJlcXVlc3RPcmlnaW4ua2luZCA9PT0gUmVxdWVzdEtpbmQuVHlwZVNjcmlwdCkge1xuICAgICAgb3JpZ2luYWxOb2RlVGV4dCA9IHJlcXVlc3RPcmlnaW4ucmVxdWVzdE5vZGUuZ2V0VGV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU5vZGVUZXh0ID1cbiAgICAgICAgICBnZXRSZW5hbWVUZXh0QW5kU3BhbkF0UG9zaXRpb24ocmVxdWVzdE9yaWdpbi5yZXF1ZXN0Tm9kZSwgcmVxdWVzdE9yaWdpbi5wb3NpdGlvbik7XG4gICAgICBpZiAodGVtcGxhdGVOb2RlVGV4dCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgb3JpZ2luYWxOb2RlVGV4dCA9IHRlbXBsYXRlTm9kZVRleHQudGV4dDtcbiAgICB9XG5cbiAgICBjb25zdCBsb2NhdGlvbnMgPSB0aGlzLnRzTFMuZmluZFJlbmFtZUxvY2F0aW9ucyhcbiAgICAgICAgZmlsZVBhdGgsIHBvc2l0aW9uLCAvKmZpbmRJblN0cmluZ3MqLyBmYWxzZSwgLypmaW5kSW5Db21tZW50cyovIGZhbHNlKTtcbiAgICBpZiAobG9jYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cmllczogTWFwPHN0cmluZywgdHMuUmVuYW1lTG9jYXRpb24+ID0gbmV3IE1hcCgpO1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaWYgYSBmaWxlIGlzIGEgc2hpbSBmaWxlIGluIGEgbW9yZSByb2J1c3Qgd2F5IGFuZCBtYWtlIHRoZSBBUElcbiAgICAgIC8vIGF2YWlsYWJsZSBpbiBhbiBhcHByb3ByaWF0ZSBsb2NhdGlvbi5cbiAgICAgIGlmICh0aGlzLnR0Yy5pc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGFic29sdXRlRnJvbShsb2NhdGlvbi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5jb252ZXJ0VG9UZW1wbGF0ZURvY3VtZW50U3Bhbihsb2NhdGlvbiwgdGhpcy50dGMsIG9yaWdpbmFsTm9kZVRleHQpO1xuICAgICAgICAvLyBUaGVyZSBpcyBubyB0ZW1wbGF0ZSBub2RlIHdob3NlIHRleHQgbWF0Y2hlcyB0aGUgb3JpZ2luYWwgcmVuYW1lIHJlcXVlc3QuIEJhaWwgb25cbiAgICAgICAgLy8gcmVuYW1pbmcgY29tcGxldGVseSByYXRoZXIgdGhhbiBwcm92aWRpbmcgaW5jb21wbGV0ZSByZXN1bHRzLlxuICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMuc2V0KGNyZWF0ZUxvY2F0aW9uS2V5KGVudHJ5KSwgZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgYWxsb3cgcmVuYW1pbmcgYSBUUyByZXN1bHQgd2l0aCBtYXRjaGluZyB0ZXh0XG4gICAgICAgIGNvbnN0IHJlZk5vZGUgPSB0aGlzLmdldFRzTm9kZUF0UG9zaXRpb24obG9jYXRpb24uZmlsZU5hbWUsIGxvY2F0aW9uLnRleHRTcGFuLnN0YXJ0KTtcbiAgICAgICAgaWYgKHJlZk5vZGUgPT09IG51bGwgfHwgcmVmTm9kZS5nZXRUZXh0KCkgIT09IG9yaWdpbmFsTm9kZVRleHQpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMuc2V0KGNyZWF0ZUxvY2F0aW9uS2V5KGxvY2F0aW9uKSwgbG9jYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQXJyYXkuZnJvbShlbnRyaWVzLnZhbHVlcygpKTtcbiAgfVxuXG4gIGdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgdGhpcy50dGMuZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm86IFRlbXBsYXRlSW5mbywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWxsVGFyZ2V0RGV0YWlscyA9IHRoaXMuZ2V0VGFyZ2V0RGV0YWlsc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKTtcbiAgICBpZiAoYWxsVGFyZ2V0RGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgYWxsUmVmZXJlbmNlczogdHMuUmVmZXJlbmNlRW50cnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgdGFyZ2V0RGV0YWlscyBvZiBhbGxUYXJnZXREZXRhaWxzKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRhcmdldERldGFpbHMudHlwZXNjcmlwdExvY2F0aW9ucykge1xuICAgICAgICBjb25zdCByZWZzID0gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24obG9jYXRpb24uZmlsZU5hbWUsIGxvY2F0aW9uLnBvc2l0aW9uKTtcbiAgICAgICAgaWYgKHJlZnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGFsbFJlZmVyZW5jZXMucHVzaCguLi5yZWZzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYWxsUmVmZXJlbmNlcy5sZW5ndGggPiAwID8gYWxsUmVmZXJlbmNlcyA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGFyZ2V0RGV0YWlsc0F0VGVtcGxhdGVQb3NpdGlvbih7dGVtcGxhdGUsIGNvbXBvbmVudH06IFRlbXBsYXRlSW5mbywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICBUZW1wbGF0ZUxvY2F0aW9uRGV0YWlsc1tdfG51bGwge1xuICAgIC8vIEZpbmQgdGhlIEFTVCBub2RlIGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgcG9zaXRpb24uXG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGVzID0gcG9zaXRpb25EZXRhaWxzLmNvbnRleHQua2luZCA9PT0gVGFyZ2V0Tm9kZUtpbmQuVHdvV2F5QmluZGluZ0NvbnRleHQgP1xuICAgICAgICBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlcyA6XG4gICAgICAgIFtwb3NpdGlvbkRldGFpbHMuY29udGV4dC5ub2RlXTtcblxuICAgIGNvbnN0IGRldGFpbHM6IFRlbXBsYXRlTG9jYXRpb25EZXRhaWxzW10gPSBbXTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgLy8gR2V0IHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgVENCIGF0IHRoZSB0ZW1wbGF0ZSBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHRjLmdldFN5bWJvbE9mTm9kZShub2RlLCBjb21wb25lbnQpO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGVtcGxhdGVUYXJnZXQgPSBub2RlO1xuICAgICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byBlbGVtZW50cywgdGVtcGxhdGVzLCBhbmQgZGlyZWN0aXZlcyB3aWxsIGJlIHRocm91Z2ggdGVtcGxhdGUgcmVmZXJlbmNlc1xuICAgICAgICAgIC8vICgjcmVmKS4gVGhleSBzaG91bGRuJ3QgYmUgdXNlZCBkaXJlY3RseSBmb3IgYSBMYW5ndWFnZSBTZXJ2aWNlIHJlZmVyZW5jZSByZXF1ZXN0LlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgZGV0YWlscy5wdXNoKFxuICAgICAgICAgICAgICB7dHlwZXNjcmlwdExvY2F0aW9uczogdGhpcy5nZXRQb3NpdGlvbnNGb3JEaXJlY3RpdmVzKG1hdGNoZXMpLCB0ZW1wbGF0ZVRhcmdldH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOiB7XG4gICAgICAgICAgLy8gRG9tIGJpbmRpbmdzIGFyZW4ndCBjdXJyZW50bHkgdHlwZS1jaGVja2VkIChzZWUgYGNoZWNrVHlwZU9mRG9tQmluZGluZ3NgKSBzbyB0aGV5IGRvbid0XG4gICAgICAgICAgLy8gaGF2ZSBhIHNoaW0gbG9jYXRpb24uIFRoaXMgbWVhbnMgd2UgY2FuJ3QgbWF0Y2ggZG9tIGJpbmRpbmdzIHRvIHRoZWlyIGxpYi5kb21cbiAgICAgICAgICAvLyByZWZlcmVuY2UsIGJ1dCB3ZSBjYW4gc3RpbGwgc2VlIGlmIHRoZXkgbWF0Y2ggdG8gYSBkaXJlY3RpdmUuXG4gICAgICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSAmJiAhKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgIG5vZGUubmFtZSwgc3ltYm9sLmhvc3QudGVtcGxhdGVOb2RlLCBzeW1ib2wuaG9zdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczogdGhpcy5nZXRQb3NpdGlvbnNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXMpLFxuICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICAgIGRldGFpbHMucHVzaCh7XG4gICAgICAgICAgICB0eXBlc2NyaXB0TG9jYXRpb25zOiBbdG9GaWxlUG9zaXRpb24oc3ltYm9sLnJlZmVyZW5jZVZhckxvY2F0aW9uKV0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVRhcmdldCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6IHtcbiAgICAgICAgICBpZiAoKHRlbXBsYXRlVGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSkge1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlVGFyZ2V0LnZhbHVlU3BhbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgaXNXaXRoaW4ocG9zaXRpb24sIHRlbXBsYXRlVGFyZ2V0LnZhbHVlU3BhbikpIHtcbiAgICAgICAgICAgICAgLy8gSW4gdGhlIHZhbHVlU3BhbiBvZiB0aGUgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGluaXRpYWxpemVyLlxuICAgICAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGVzY3JpcHRMb2NhdGlvbnM6IFt0b0ZpbGVQb3NpdGlvbihzeW1ib2wuaW5pdGlhbGl6ZXJMb2NhdGlvbildLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaXRoaW4ocG9zaXRpb24sIHRlbXBsYXRlVGFyZ2V0LmtleVNwYW4pKSB7XG4gICAgICAgICAgICAgIC8vIEluIHRoZSBrZXlTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbG9jYWwgdmFyaWFibGUuXG4gICAgICAgICAgICAgIGRldGFpbHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5sb2NhbFZhckxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgdGVtcGxhdGVOb2RlIGlzIG5vdCB0aGUgYFRtcGxBc3RWYXJpYWJsZWAsIGl0IG11c3QgYmUgYSB1c2FnZSBvZiB0aGVcbiAgICAgICAgICAgIC8vIHZhcmlhYmxlIHNvbWV3aGVyZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgICB0eXBlc2NyaXB0TG9jYXRpb25zOiBbdG9GaWxlUG9zaXRpb24oc3ltYm9sLmxvY2FsVmFyTG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OiB7XG4gICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGVzY3JpcHRMb2NhdGlvbnM6XG4gICAgICAgICAgICAgICAgc3ltYm9sLmJpbmRpbmdzLm1hcChiaW5kaW5nID0+IHRvRmlsZVBvc2l0aW9uKGJpbmRpbmcuc2hpbUxvY2F0aW9uKSksXG4gICAgICAgICAgICB0ZW1wbGF0ZVRhcmdldCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZTpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkV4cHJlc3Npb246IHtcbiAgICAgICAgICBkZXRhaWxzLnB1c2goXG4gICAgICAgICAgICAgIHt0eXBlc2NyaXB0TG9jYXRpb25zOiBbdG9GaWxlUG9zaXRpb24oc3ltYm9sLnNoaW1Mb2NhdGlvbildLCB0ZW1wbGF0ZVRhcmdldH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRldGFpbHMubGVuZ3RoID4gMCA/IGRldGFpbHMgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRQb3NpdGlvbnNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXM6IFNldDxEaXJlY3RpdmVTeW1ib2w+KTogRmlsZVBvc2l0aW9uW10ge1xuICAgIGNvbnN0IGFsbERpcmVjdGl2ZXM6IEZpbGVQb3NpdGlvbltdID0gW107XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgZGlyQ2xhc3MgPSBkaXIudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChkaXJDbGFzcyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyQ2xhc3MpIHx8XG4gICAgICAgICAgZGlyQ2xhc3MubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7ZmlsZU5hbWV9ID0gZGlyQ2xhc3MuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3QgcG9zaXRpb24gPSBkaXJDbGFzcy5uYW1lLmdldFN0YXJ0KCk7XG4gICAgICBhbGxEaXJlY3RpdmVzLnB1c2goe2ZpbGVOYW1lLCBwb3NpdGlvbn0pO1xuICAgIH1cblxuICAgIHJldHVybiBhbGxEaXJlY3RpdmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcmVmcyA9IHRoaXMudHNMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChyZWZzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cmllczogTWFwPHN0cmluZywgdHMuUmVmZXJlbmNlRW50cnk+ID0gbmV3IE1hcCgpO1xuICAgIGZvciAoY29uc3QgcmVmIG9mIHJlZnMpIHtcbiAgICAgIGlmICh0aGlzLnR0Yy5pc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGFic29sdXRlRnJvbShyZWYuZmlsZU5hbWUpKSkge1xuICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMuY29udmVydFRvVGVtcGxhdGVEb2N1bWVudFNwYW4ocmVmLCB0aGlzLnR0Yyk7XG4gICAgICAgIGlmIChlbnRyeSAhPT0gbnVsbCkge1xuICAgICAgICAgIGVudHJpZXMuc2V0KGNyZWF0ZUxvY2F0aW9uS2V5KGVudHJ5KSwgZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnRyaWVzLnNldChjcmVhdGVMb2NhdGlvbktleShyZWYpLCByZWYpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gQXJyYXkuZnJvbShlbnRyaWVzLnZhbHVlcygpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydFRvVGVtcGxhdGVEb2N1bWVudFNwYW48VCBleHRlbmRzIHRzLkRvY3VtZW50U3Bhbj4oXG4gICAgICBzaGltRG9jdW1lbnRTcGFuOiBULCB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyLCByZXF1aXJlZE5vZGVUZXh0Pzogc3RyaW5nKTogVFxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IHNmID0gdGhpcy5zdHJhdGVneS5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShzaGltRG9jdW1lbnRTcGFuLmZpbGVOYW1lKTtcbiAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHRjYk5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBzaGltRG9jdW1lbnRTcGFuLnRleHRTcGFuLnN0YXJ0KTtcbiAgICBpZiAodGNiTm9kZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHNmLCB0Y2JOb2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5FVkVOVF9QQVJBTUVURVIpKSB7XG4gICAgICAvLyBJZiB0aGUgcmVmZXJlbmNlIHJlc3VsdCBpcyB0aGUgJGV2ZW50IHBhcmFtZXRlciBpbiB0aGUgc3Vic2NyaWJlL2FkZEV2ZW50TGlzdGVuZXJcbiAgICAgIC8vIGZ1bmN0aW9uIGluIHRoZSBUQ0IsIHdlIHdhbnQgdG8gZmlsdGVyIHRoaXMgcmVzdWx0IG91dCBvZiB0aGUgcmVmZXJlbmNlcy4gV2UgcmVhbGx5IG9ubHlcbiAgICAgIC8vIHdhbnQgdG8gcmV0dXJuIHJlZmVyZW5jZXMgdG8gdGhlIHBhcmFtZXRlciBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdFxuICAgIC8vIHNlcnZlckhvc3Qgb3IgTFNQYXJzZUNvbmZpZ0hvc3QgaW4gdGhlIGFkYXB0ZXIuIFdlIHNob3VsZCBoYXZlIGEgYmV0dGVyIGRlZmluZWQgd2F5IHRvXG4gICAgLy8gbm9ybWFsaXplIHBhdGhzLlxuICAgIGNvbnN0IG1hcHBpbmcgPSBnZXRUZW1wbGF0ZUxvY2F0aW9uRnJvbVNoaW1Mb2NhdGlvbihcbiAgICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlciwgYWJzb2x1dGVGcm9tKHNoaW1Eb2N1bWVudFNwYW4uZmlsZU5hbWUpLFxuICAgICAgICBzaGltRG9jdW1lbnRTcGFuLnRleHRTcGFuLnN0YXJ0KTtcbiAgICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qge3NwYW4sIHRlbXBsYXRlVXJsfSA9IG1hcHBpbmc7XG4gICAgaWYgKHJlcXVpcmVkTm9kZVRleHQgIT09IHVuZGVmaW5lZCAmJiBzcGFuLnRvU3RyaW5nKCkgIT09IHJlcXVpcmVkTm9kZVRleHQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAuLi5zaGltRG9jdW1lbnRTcGFuLFxuICAgICAgZmlsZU5hbWU6IHRlbXBsYXRlVXJsLFxuICAgICAgdGV4dFNwYW46IHRvVGV4dFNwYW4oc3BhbiksXG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZW5hbWVUZXh0QW5kU3BhbkF0UG9zaXRpb24obm9kZTogVG1wbEFzdE5vZGV8QVNULCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICB7dGV4dDogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW58QWJzb2x1dGVTb3VyY2VTcGFufXxudWxsIHtcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICBpZiAobm9kZS5rZXlTcGFuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge3RleHQ6IG5vZGUubmFtZSwgc3Bhbjogbm9kZS5rZXlTcGFufTtcbiAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlIHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCBub2RlLmtleVNwYW4pKSB7XG4gICAgICByZXR1cm4ge3RleHQ6IG5vZGUua2V5U3Bhbi50b1N0cmluZygpLCBzcGFuOiBub2RlLmtleVNwYW59O1xuICAgIH0gZWxzZSBpZiAobm9kZS52YWx1ZVNwYW4gJiYgaXNXaXRoaW4ocG9zaXRpb24sIG5vZGUudmFsdWVTcGFuKSkge1xuICAgICAgcmV0dXJuIHt0ZXh0OiBub2RlLnZhbHVlU3Bhbi50b1N0cmluZygpLCBzcGFuOiBub2RlLnZhbHVlU3Bhbn07XG4gICAgfVxuICB9XG5cbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IEFkZCBzdXBwb3J0IGZvciByZW5hbWluZyBwaXBlc1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChub2RlIGluc3RhbmNlb2YgUHJvcGVydHlSZWFkIHx8IG5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsIHx8IG5vZGUgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCBub2RlIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwpIHtcbiAgICByZXR1cm4ge3RleHQ6IG5vZGUubmFtZSwgc3Bhbjogbm9kZS5uYW1lU3Bhbn07XG4gIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIExpdGVyYWxQcmltaXRpdmUpIHtcbiAgICBjb25zdCBzcGFuID0gbm9kZS5zcGFuO1xuICAgIGNvbnN0IHRleHQgPSBub2RlLnZhbHVlO1xuICAgIGlmICh0eXBlb2YgdGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIFRoZSBzcGFuIG9mIGEgc3RyaW5nIGxpdGVyYWwgaW5jbHVkZXMgdGhlIHF1b3RlcyBidXQgdGhleSBzaG91bGQgYmUgcmVtb3ZlZCBmb3IgcmVuYW1pbmcuXG4gICAgICBzcGFuLnN0YXJ0ICs9IDE7XG4gICAgICBzcGFuLmVuZCAtPSAxO1xuICAgIH1cbiAgICByZXR1cm4ge3RleHQsIHNwYW59O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgXCJrZXlcIiBmb3IgYSByZW5hbWUvcmVmZXJlbmNlIGxvY2F0aW9uIGJ5IGNvbmNhdGVuYXRpbmcgZmlsZSBuYW1lLCBzcGFuIHN0YXJ0LCBhbmQgc3BhblxuICogbGVuZ3RoLiBUaGlzIGFsbG93cyB1cyB0byBkZS1kdXBsaWNhdGUgdGVtcGxhdGUgcmVzdWx0cyB3aGVuIGFuIGl0ZW0gbWF5IGFwcGVhciBzZXZlcmFsIHRpbWVzXG4gKiBpbiB0aGUgVENCIGJ1dCBtYXAgYmFjayB0byB0aGUgc2FtZSB0ZW1wbGF0ZSBsb2NhdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25LZXkoZHM6IHRzLkRvY3VtZW50U3Bhbikge1xuICByZXR1cm4gZHMuZmlsZU5hbWUgKyBkcy50ZXh0U3Bhbi5zdGFydCArIGRzLnRleHRTcGFuLmxlbmd0aDtcbn0iXX0=