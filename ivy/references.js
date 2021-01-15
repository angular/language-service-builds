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
        ReferencesAndRenameBuilder.prototype.findRenameLocations = function (filePath, position) {
            this.ttc.generateAllTypeCheckBlocks();
            var templateInfo = utils_1.getTemplateInfoAtPosition(filePath, position, this.compiler);
            // We could not get a template at position so we assume the request is came from outside the
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
                var templateNodeText = getTemplateNodeRenameTextAtPosition(requestOrigin.requestNode, requestOrigin.position);
                if (templateNodeText === null) {
                    return undefined;
                }
                originalNodeText = templateNodeText;
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
                    var templateTarget = node;
                    if (symbol === null) {
                        continue;
                    }
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
                            details.push({ typescriptLocations: this.getPositionsForDirectives(directives), templateTarget: templateTarget });
                            break;
                        }
                        case api_1.SymbolKind.Reference: {
                            details.push({ typescriptLocations: [toFilePosition(symbol.referenceVarLocation)], templateTarget: templateTarget });
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
                                    details.push({ typescriptLocations: [toFilePosition(symbol.localVarLocation)], templateTarget: templateTarget });
                                }
                            }
                            else {
                                // If the templateNode is not the `TmplAstVariable`, it must be a usage of the
                                // variable somewhere in the template.
                                details.push({ typescriptLocations: [toFilePosition(symbol.localVarLocation)], templateTarget: templateTarget });
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
    function getTemplateNodeRenameTextAtPosition(node, position) {
        if (node instanceof compiler_1.TmplAstBoundAttribute || node instanceof compiler_1.TmplAstTextAttribute ||
            node instanceof compiler_1.TmplAstBoundEvent) {
            return node.name;
        }
        else if (node instanceof compiler_1.TmplAstVariable || node instanceof compiler_1.TmplAstReference) {
            if (utils_1.isWithin(position, node.keySpan)) {
                return node.keySpan.toString();
            }
            else if (node.valueSpan && utils_1.isWithin(position, node.valueSpan)) {
                return node.valueSpan.toString();
            }
        }
        if (node instanceof compiler_1.BindingPipe) {
            // TODO(atscott): Add support for renaming pipes
            return null;
        }
        if (node instanceof compiler_1.PropertyRead || node instanceof compiler_1.MethodCall || node instanceof compiler_1.PropertyWrite ||
            node instanceof compiler_1.SafePropertyRead || node instanceof compiler_1.SafeMethodCall) {
            return node.name;
        }
        else if (node instanceof compiler_1.LiteralPrimitive) {
            return node.value;
        }
        return null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFnUTtJQUVoUSwyRUFBaUg7SUFDakgscUVBQTBKO0lBQzFKLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNFO0lBQ3RFLG1FQUE0QztJQUM1Qyw2REFBeUs7SUFPekssU0FBUyxjQUFjLENBQUMsWUFBMEI7UUFDaEQsT0FBTyxFQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsa0JBQWtCLEVBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsSUFBSyxXQUdKO0lBSEQsV0FBSyxXQUFXO1FBQ2QscURBQVEsQ0FBQTtRQUNSLHlEQUFVLENBQUE7SUFDWixDQUFDLEVBSEksV0FBVyxLQUFYLFdBQVcsUUFHZjtJQTZCRDtRQUdFLG9DQUNxQixRQUFxQyxFQUNyQyxJQUF3QixFQUFtQixRQUFvQjtZQUQvRCxhQUFRLEdBQVIsUUFBUSxDQUE2QjtZQUNyQyxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBSm5FLFFBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFJeUIsQ0FBQztRQUV4Rix3REFBbUIsR0FBbkIsVUFBb0IsUUFBZ0IsRUFBRSxRQUFnQjtZQUNwRCxJQUFJLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDdEMsSUFBTSxZQUFZLEdBQUcsaUNBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEYsNEZBQTRGO1lBQzVGLFlBQVk7WUFDWixJQUFJLFlBQVksS0FBSyxT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Q0FBQztTQUNuQjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBU1QsIEJpbmRpbmdQaXBlLCBMaXRlcmFsUHJpbWl0aXZlLCBNZXRob2RDYWxsLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbEtpbmQsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbiwgVGFyZ2V0Tm9kZUtpbmR9IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZX0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge2dldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1RlbXBsYXRlTm9kZSwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmludGVyZmFjZSBGaWxlUG9zaXRpb24ge1xuICBmaWxlTmFtZTogc3RyaW5nO1xuICBwb3NpdGlvbjogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiB0b0ZpbGVQb3NpdGlvbihzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbik6IEZpbGVQb3NpdGlvbiB7XG4gIHJldHVybiB7ZmlsZU5hbWU6IHNoaW1Mb2NhdGlvbi5zaGltUGF0aCwgcG9zaXRpb246IHNoaW1Mb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGV9O1xufVxuXG5lbnVtIFJlcXVlc3RLaW5kIHtcbiAgVGVtcGxhdGUsXG4gIFR5cGVTY3JpcHQsXG59XG5cbmludGVyZmFjZSBUZW1wbGF0ZVJlcXVlc3Qge1xuICBraW5kOiBSZXF1ZXN0S2luZC5UZW1wbGF0ZTtcbiAgcmVxdWVzdE5vZGU6IFRtcGxBc3ROb2RlfEFTVDtcbiAgcG9zaXRpb246IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFR5cGVTY3JpcHRSZXF1ZXN0IHtcbiAga2luZDogUmVxdWVzdEtpbmQuVHlwZVNjcmlwdDtcbiAgcmVxdWVzdE5vZGU6IHRzLk5vZGU7XG59XG5cbnR5cGUgUmVxdWVzdE9yaWdpbiA9IFRlbXBsYXRlUmVxdWVzdHxUeXBlU2NyaXB0UmVxdWVzdDtcblxuaW50ZXJmYWNlIFRlbXBsYXRlTG9jYXRpb25EZXRhaWxzIHtcbiAgLyoqXG4gICAqIEEgdGFyZ2V0IG5vZGUgaW4gYSB0ZW1wbGF0ZS5cbiAgICovXG4gIHRlbXBsYXRlVGFyZ2V0OiBUbXBsQXN0Tm9kZXxBU1Q7XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgbG9jYXRpb25zIHdoaWNoIHRoZSB0ZW1wbGF0ZSBub2RlIG1hcHMgdG8uIEEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSBtaWdodCBtYXAgdG9cbiAgICogc2V2ZXJhbCBUUyBub2Rlcy4gRm9yIGV4YW1wbGUsIGEgdGVtcGxhdGUgbm9kZSBmb3IgYW4gYXR0cmlidXRlIG1pZ2h0IHJlc29sdmUgdG8gc2V2ZXJhbFxuICAgKiBkaXJlY3RpdmVzIG9yIGEgZGlyZWN0aXZlIGFuZCBvbmUgb2YgaXRzIGlucHV0cy5cbiAgICovXG4gIHR5cGVzY3JpcHRMb2NhdGlvbnM6IEZpbGVQb3NpdGlvbltdO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlc0FuZFJlbmFtZUJ1aWxkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHR0YyA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZmluZFJlbmFtZUxvY2F0aW9ucyhmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogcmVhZG9ubHkgdHMuUmVuYW1lTG9jYXRpb25bXXx1bmRlZmluZWQge1xuICAgIHRoaXMudHRjLmdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIC8vIFdlIGNvdWxkIG5vdCBnZXQgYSB0ZW1wbGF0ZSBhdCBwb3NpdGlvbiBzbyB3ZSBhc3N1bWUgdGhlIHJlcXVlc3QgaXMgY2FtZSBmcm9tIG91dHNpZGUgdGhlXG4gICAgLy8gdGVtcGxhdGUuXG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCByZXF1ZXN0Tm9kZSA9IHRoaXMuZ2V0VHNOb2RlQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24pO1xuICAgICAgaWYgKHJlcXVlc3ROb2RlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBjb25zdCByZXF1ZXN0T3JpZ2luOiBUeXBlU2NyaXB0UmVxdWVzdCA9IHtraW5kOiBSZXF1ZXN0S2luZC5UeXBlU2NyaXB0LCByZXF1ZXN0Tm9kZX07XG4gICAgICByZXR1cm4gdGhpcy5maW5kUmVuYW1lTG9jYXRpb25zQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uLCByZXF1ZXN0T3JpZ2luKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5maW5kUmVuYW1lTG9jYXRpb25zQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kUmVuYW1lTG9jYXRpb25zQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbzogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHJlYWRvbmx5IHRzLlJlbmFtZUxvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbGxUYXJnZXREZXRhaWxzID0gdGhpcy5nZXRUYXJnZXREZXRhaWxzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIGlmIChhbGxUYXJnZXREZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFJlbmFtZUxvY2F0aW9uczogdHMuUmVuYW1lTG9jYXRpb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgdGFyZ2V0RGV0YWlscyBvZiBhbGxUYXJnZXREZXRhaWxzKSB7XG4gICAgICBjb25zdCByZXF1ZXN0T3JpZ2luOiBUZW1wbGF0ZVJlcXVlc3QgPSB7XG4gICAgICAgIGtpbmQ6IFJlcXVlc3RLaW5kLlRlbXBsYXRlLFxuICAgICAgICByZXF1ZXN0Tm9kZTogdGFyZ2V0RGV0YWlscy50ZW1wbGF0ZVRhcmdldCxcbiAgICAgICAgcG9zaXRpb24sXG4gICAgICB9O1xuXG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRhcmdldERldGFpbHMudHlwZXNjcmlwdExvY2F0aW9ucykge1xuICAgICAgICBjb25zdCBsb2NhdGlvbnMgPSB0aGlzLmZpbmRSZW5hbWVMb2NhdGlvbnNBdFR5cGVzY3JpcHRQb3NpdGlvbihcbiAgICAgICAgICAgIGxvY2F0aW9uLmZpbGVOYW1lLCBsb2NhdGlvbi5wb3NpdGlvbiwgcmVxdWVzdE9yaWdpbik7XG4gICAgICAgIC8vIElmIHdlIGNvdWxkbid0IGZpbmQgcmVuYW1lIGxvY2F0aW9ucyBmb3IgX2FueV8gcmVzdWx0LCB3ZSBzaG91bGQgbm90IGFsbG93IHJlbmFtaW5nIHRvXG4gICAgICAgIC8vIHByb2NlZWQgaW5zdGVhZCBvZiBoYXZpbmcgYSBwYXJ0aWFsbHkgY29tcGxldGUgcmVuYW1lLlxuICAgICAgICBpZiAobG9jYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGFsbFJlbmFtZUxvY2F0aW9ucy5wdXNoKC4uLmxvY2F0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhbGxSZW5hbWVMb2NhdGlvbnMubGVuZ3RoID4gMCA/IGFsbFJlbmFtZUxvY2F0aW9ucyA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHNOb2RlQXRQb3NpdGlvbihmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXxudWxsIHtcbiAgICBjb25zdCBzZiA9IHRoaXMuc3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoZmlsZVBhdGgpO1xuICAgIGlmICghc2YpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmluZFRpZ2h0ZXN0Tm9kZShzZiwgcG9zaXRpb24pID8/IG51bGw7XG4gIH1cblxuICBmaW5kUmVuYW1lTG9jYXRpb25zQXRUeXBlc2NyaXB0UG9zaXRpb24oXG4gICAgICBmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgcmVxdWVzdE9yaWdpbjogUmVxdWVzdE9yaWdpbik6IHJlYWRvbmx5IHRzLlJlbmFtZUxvY2F0aW9uW118dW5kZWZpbmVkIHtcbiAgICBsZXQgb3JpZ2luYWxOb2RlVGV4dDogc3RyaW5nO1xuICAgIGlmIChyZXF1ZXN0T3JpZ2luLmtpbmQgPT09IFJlcXVlc3RLaW5kLlR5cGVTY3JpcHQpIHtcbiAgICAgIG9yaWdpbmFsTm9kZVRleHQgPSByZXF1ZXN0T3JpZ2luLnJlcXVlc3ROb2RlLmdldFRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVOb2RlVGV4dCA9XG4gICAgICAgICAgZ2V0VGVtcGxhdGVOb2RlUmVuYW1lVGV4dEF0UG9zaXRpb24ocmVxdWVzdE9yaWdpbi5yZXF1ZXN0Tm9kZSwgcmVxdWVzdE9yaWdpbi5wb3NpdGlvbik7XG4gICAgICBpZiAodGVtcGxhdGVOb2RlVGV4dCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgb3JpZ2luYWxOb2RlVGV4dCA9IHRlbXBsYXRlTm9kZVRleHQ7XG4gICAgfVxuXG4gICAgY29uc3QgbG9jYXRpb25zID0gdGhpcy50c0xTLmZpbmRSZW5hbWVMb2NhdGlvbnMoXG4gICAgICAgIGZpbGVQYXRoLCBwb3NpdGlvbiwgLypmaW5kSW5TdHJpbmdzKi8gZmFsc2UsIC8qZmluZEluQ29tbWVudHMqLyBmYWxzZSk7XG4gICAgaWYgKGxvY2F0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGVudHJpZXM6IHRzLlJlbmFtZUxvY2F0aW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogRGV0ZXJtaW5lIGlmIGEgZmlsZSBpcyBhIHNoaW0gZmlsZSBpbiBhIG1vcmUgcm9idXN0IHdheSBhbmQgbWFrZSB0aGUgQVBJXG4gICAgICAvLyBhdmFpbGFibGUgaW4gYW4gYXBwcm9wcmlhdGUgbG9jYXRpb24uXG4gICAgICBpZiAodGhpcy50dGMuaXNUcmFja2VkVHlwZUNoZWNrRmlsZShhYnNvbHV0ZUZyb20obG9jYXRpb24uZmlsZU5hbWUpKSkge1xuICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMuY29udmVydFRvVGVtcGxhdGVEb2N1bWVudFNwYW4obG9jYXRpb24sIHRoaXMudHRjLCBvcmlnaW5hbE5vZGVUZXh0KTtcbiAgICAgICAgLy8gVGhlcmUgaXMgbm8gdGVtcGxhdGUgbm9kZSB3aG9zZSB0ZXh0IG1hdGNoZXMgdGhlIG9yaWdpbmFsIHJlbmFtZSByZXF1ZXN0LiBCYWlsIG9uXG4gICAgICAgIC8vIHJlbmFtaW5nIGNvbXBsZXRlbHkgcmF0aGVyIHRoYW4gcHJvdmlkaW5nIGluY29tcGxldGUgcmVzdWx0cy5cbiAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBlbnRyaWVzLnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgYWxsb3cgcmVuYW1pbmcgYSBUUyByZXN1bHQgd2l0aCBtYXRjaGluZyB0ZXh0XG4gICAgICAgIGNvbnN0IHJlZk5vZGUgPSB0aGlzLmdldFRzTm9kZUF0UG9zaXRpb24obG9jYXRpb24uZmlsZU5hbWUsIGxvY2F0aW9uLnRleHRTcGFuLnN0YXJ0KTtcbiAgICAgICAgaWYgKHJlZk5vZGUgPT09IG51bGwgfHwgcmVmTm9kZS5nZXRUZXh0KCkgIT09IG9yaWdpbmFsTm9kZVRleHQpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMucHVzaChsb2NhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZVBhdGg6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICB0aGlzLnR0Yy5nZW5lcmF0ZUFsbFR5cGVDaGVja0Jsb2NrcygpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICBpZiAodGVtcGxhdGVJbmZvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2VzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbzogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbGxUYXJnZXREZXRhaWxzID0gdGhpcy5nZXRUYXJnZXREZXRhaWxzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pO1xuICAgIGlmIChhbGxUYXJnZXREZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBhbGxSZWZlcmVuY2VzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCB0YXJnZXREZXRhaWxzIG9mIGFsbFRhcmdldERldGFpbHMpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGFyZ2V0RGV0YWlscy50eXBlc2NyaXB0TG9jYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IHJlZnMgPSB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihsb2NhdGlvbi5maWxlTmFtZSwgbG9jYXRpb24ucG9zaXRpb24pO1xuICAgICAgICBpZiAocmVmcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgYWxsUmVmZXJlbmNlcy5wdXNoKC4uLnJlZnMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhbGxSZWZlcmVuY2VzLmxlbmd0aCA+IDAgPyBhbGxSZWZlcmVuY2VzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUYXJnZXREZXRhaWxzQXRUZW1wbGF0ZVBvc2l0aW9uKHt0ZW1wbGF0ZSwgY29tcG9uZW50fTogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIFRlbXBsYXRlTG9jYXRpb25EZXRhaWxzW118bnVsbCB7XG4gICAgLy8gRmluZCB0aGUgQVNUIG5vZGUgaW4gdGhlIHRlbXBsYXRlIGF0IHRoZSBwb3NpdGlvbi5cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZXMgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzIDpcbiAgICAgICAgW3Bvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVdO1xuXG4gICAgY29uc3QgZGV0YWlsczogVGVtcGxhdGVMb2NhdGlvbkRldGFpbHNbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAvLyBHZXQgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBUQ0IgYXQgdGhlIHRlbXBsYXRlIHBvc2l0aW9uLlxuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy50dGMuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVRhcmdldCA9IG5vZGU7XG5cbiAgICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5UZW1wbGF0ZTpcbiAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIGVsZW1lbnRzLCB0ZW1wbGF0ZXMsIGFuZCBkaXJlY3RpdmVzIHdpbGwgYmUgdGhyb3VnaCB0ZW1wbGF0ZSByZWZlcmVuY2VzXG4gICAgICAgICAgLy8gKCNyZWYpLiBUaGV5IHNob3VsZG4ndCBiZSB1c2VkIGRpcmVjdGx5IGZvciBhIExhbmd1YWdlIFNlcnZpY2UgcmVmZXJlbmNlIHJlcXVlc3QuXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OiB7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHN5bWJvbC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICAgICAgICBkZXRhaWxzLnB1c2goXG4gICAgICAgICAgICAgIHt0eXBlc2NyaXB0TG9jYXRpb25zOiB0aGlzLmdldFBvc2l0aW9uc0ZvckRpcmVjdGl2ZXMobWF0Y2hlcyksIHRlbXBsYXRlVGFyZ2V0fSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkRvbUJpbmRpbmc6IHtcbiAgICAgICAgICAvLyBEb20gYmluZGluZ3MgYXJlbid0IGN1cnJlbnRseSB0eXBlLWNoZWNrZWQgKHNlZSBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2ApIHNvIHRoZXkgZG9uJ3RcbiAgICAgICAgICAvLyBoYXZlIGEgc2hpbSBsb2NhdGlvbi4gVGhpcyBtZWFucyB3ZSBjYW4ndCBtYXRjaCBkb20gYmluZGluZ3MgdG8gdGhlaXIgbGliLmRvbVxuICAgICAgICAgIC8vIHJlZmVyZW5jZSwgYnV0IHdlIGNhbiBzdGlsbCBzZWUgaWYgdGhleSBtYXRjaCB0byBhIGRpcmVjdGl2ZS5cbiAgICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmICEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgICAgICAgIGRldGFpbHMucHVzaChcbiAgICAgICAgICAgICAge3R5cGVzY3JpcHRMb2NhdGlvbnM6IHRoaXMuZ2V0UG9zaXRpb25zRm9yRGlyZWN0aXZlcyhkaXJlY3RpdmVzKSwgdGVtcGxhdGVUYXJnZXR9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOiB7XG4gICAgICAgICAgZGV0YWlscy5wdXNoKFxuICAgICAgICAgICAgICB7dHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5yZWZlcmVuY2VWYXJMb2NhdGlvbildLCB0ZW1wbGF0ZVRhcmdldH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5WYXJpYWJsZToge1xuICAgICAgICAgIGlmICgodGVtcGxhdGVUYXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpKSB7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGVUYXJnZXQudmFsdWVTcGFuICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICBpc1dpdGhpbihwb3NpdGlvbiwgdGVtcGxhdGVUYXJnZXQudmFsdWVTcGFuKSkge1xuICAgICAgICAgICAgICAvLyBJbiB0aGUgdmFsdWVTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgaW5pdGlhbGl6ZXIuXG4gICAgICAgICAgICAgIGRldGFpbHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczogW3RvRmlsZVBvc2l0aW9uKHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVUYXJnZXQsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1dpdGhpbihwb3NpdGlvbiwgdGVtcGxhdGVUYXJnZXQua2V5U3BhbikpIHtcbiAgICAgICAgICAgICAgLy8gSW4gdGhlIGtleVNwYW4gb2YgdGhlIHZhcmlhYmxlLCB3ZSB3YW50IHRvIGdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBsb2NhbCB2YXJpYWJsZS5cbiAgICAgICAgICAgICAgZGV0YWlscy5wdXNoKFxuICAgICAgICAgICAgICAgICAge3R5cGVzY3JpcHRMb2NhdGlvbnM6IFt0b0ZpbGVQb3NpdGlvbihzeW1ib2wubG9jYWxWYXJMb2NhdGlvbildLCB0ZW1wbGF0ZVRhcmdldH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgdGVtcGxhdGVOb2RlIGlzIG5vdCB0aGUgYFRtcGxBc3RWYXJpYWJsZWAsIGl0IG11c3QgYmUgYSB1c2FnZSBvZiB0aGVcbiAgICAgICAgICAgIC8vIHZhcmlhYmxlIHNvbWV3aGVyZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goXG4gICAgICAgICAgICAgICAge3R5cGVzY3JpcHRMb2NhdGlvbnM6IFt0b0ZpbGVQb3NpdGlvbihzeW1ib2wubG9jYWxWYXJMb2NhdGlvbildLCB0ZW1wbGF0ZVRhcmdldH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuSW5wdXQ6XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5PdXRwdXQ6IHtcbiAgICAgICAgICBkZXRhaWxzLnB1c2goe1xuICAgICAgICAgICAgdHlwZXNjcmlwdExvY2F0aW9uczpcbiAgICAgICAgICAgICAgICBzeW1ib2wuYmluZGluZ3MubWFwKGJpbmRpbmcgPT4gdG9GaWxlUG9zaXRpb24oYmluZGluZy5zaGltTG9jYXRpb24pKSxcbiAgICAgICAgICAgIHRlbXBsYXRlVGFyZ2V0LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5QaXBlOlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRXhwcmVzc2lvbjoge1xuICAgICAgICAgIGRldGFpbHMucHVzaChcbiAgICAgICAgICAgICAge3R5cGVzY3JpcHRMb2NhdGlvbnM6IFt0b0ZpbGVQb3NpdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uKV0sIHRlbXBsYXRlVGFyZ2V0fSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGV0YWlscy5sZW5ndGggPiAwID8gZGV0YWlscyA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldFBvc2l0aW9uc0ZvckRpcmVjdGl2ZXMoZGlyZWN0aXZlczogU2V0PERpcmVjdGl2ZVN5bWJvbD4pOiBGaWxlUG9zaXRpb25bXSB7XG4gICAgY29uc3QgYWxsRGlyZWN0aXZlczogRmlsZVBvc2l0aW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBkaXJDbGFzcyA9IGRpci50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgaWYgKGRpckNsYXNzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkaXJDbGFzcykgfHxcbiAgICAgICAgICBkaXJDbGFzcy5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtmaWxlTmFtZX0gPSBkaXJDbGFzcy5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBjb25zdCBwb3NpdGlvbiA9IGRpckNsYXNzLm5hbWUuZ2V0U3RhcnQoKTtcbiAgICAgIGFsbERpcmVjdGl2ZXMucHVzaCh7ZmlsZU5hbWUsIHBvc2l0aW9ufSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbERpcmVjdGl2ZXM7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZWZzID0gdGhpcy50c0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHJlZnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgaWYgKHRoaXMudHRjLmlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoYWJzb2x1dGVGcm9tKHJlZi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5jb252ZXJ0VG9UZW1wbGF0ZURvY3VtZW50U3BhbihyZWYsIHRoaXMudHRjKTtcbiAgICAgICAgaWYgKGVudHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHJlZik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0VG9UZW1wbGF0ZURvY3VtZW50U3BhbjxUIGV4dGVuZHMgdHMuRG9jdW1lbnRTcGFuPihcbiAgICAgIHNoaW1Eb2N1bWVudFNwYW46IFQsIHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXIsIHJlcXVpcmVkTm9kZVRleHQ/OiBzdHJpbmcpOiBUXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3Qgc2YgPSB0aGlzLnN0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKHNoaW1Eb2N1bWVudFNwYW4uZmlsZU5hbWUpO1xuICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGNiTm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHNoaW1Eb2N1bWVudFNwYW4udGV4dFNwYW4uc3RhcnQpO1xuICAgIGlmICh0Y2JOb2RlID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgaGFzRXhwcmVzc2lvbklkZW50aWZpZXIoc2YsIHRjYk5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkVWRU5UX1BBUkFNRVRFUikpIHtcbiAgICAgIC8vIElmIHRoZSByZWZlcmVuY2UgcmVzdWx0IGlzIHRoZSAkZXZlbnQgcGFyYW1ldGVyIGluIHRoZSBzdWJzY3JpYmUvYWRkRXZlbnRMaXN0ZW5lclxuICAgICAgLy8gZnVuY3Rpb24gaW4gdGhlIFRDQiwgd2Ugd2FudCB0byBmaWx0ZXIgdGhpcyByZXN1bHQgb3V0IG9mIHRoZSByZWZlcmVuY2VzLiBXZSByZWFsbHkgb25seVxuICAgICAgLy8gd2FudCB0byByZXR1cm4gcmVmZXJlbmNlcyB0byB0aGUgcGFyYW1ldGVyIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGYuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogRGV0ZXJtaW5lIGhvdyB0byBjb25zaXN0ZW50bHkgcmVzb2x2ZSBwYXRocy4gaS5lLiB3aXRoIHRoZSBwcm9qZWN0XG4gICAgLy8gc2VydmVySG9zdCBvciBMU1BhcnNlQ29uZmlnSG9zdCBpbiB0aGUgYWRhcHRlci4gV2Ugc2hvdWxkIGhhdmUgYSBiZXR0ZXIgZGVmaW5lZCB3YXkgdG9cbiAgICAvLyBub3JtYWxpemUgcGF0aHMuXG4gICAgY29uc3QgbWFwcGluZyA9IHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0VGVtcGxhdGVNYXBwaW5nQXRTaGltTG9jYXRpb24oe1xuICAgICAgc2hpbVBhdGg6IGFic29sdXRlRnJvbShzaGltRG9jdW1lbnRTcGFuLmZpbGVOYW1lKSxcbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogc2hpbURvY3VtZW50U3Bhbi50ZXh0U3Bhbi5zdGFydCxcbiAgICB9KTtcbiAgICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICAgIGxldCB0ZW1wbGF0ZVVybDogQWJzb2x1dGVGc1BhdGg7XG4gICAgaWYgKHRlbXBsYXRlU291cmNlTWFwcGluZy50eXBlID09PSAnZGlyZWN0Jykge1xuICAgICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb20odGVtcGxhdGVTb3VyY2VNYXBwaW5nLnRlbXBsYXRlVXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpbmNsdWRlcyBpbmRpcmVjdCBtYXBwaW5ncywgd2hpY2ggYXJlIGRpZmZpY3VsdCB0byBtYXAgZGlyZWN0bHkgdG8gdGhlIGNvZGVcbiAgICAgIC8vIGxvY2F0aW9uLiBEaWFnbm9zdGljcyBzaW1pbGFybHkgcmV0dXJuIGEgc3ludGhldGljIHRlbXBsYXRlIHN0cmluZyBmb3IgdGhpcyBjYXNlIHJhdGhlclxuICAgICAgLy8gdGhhbiBhIHJlYWwgbG9jYXRpb24uXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAocmVxdWlyZWROb2RlVGV4dCAhPT0gdW5kZWZpbmVkICYmIHNwYW4udG9TdHJpbmcoKSAhPT0gcmVxdWlyZWROb2RlVGV4dCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnNoaW1Eb2N1bWVudFNwYW4sXG4gICAgICBmaWxlTmFtZTogdGVtcGxhdGVVcmwsXG4gICAgICB0ZXh0U3BhbjogdG9UZXh0U3BhbihzcGFuKSxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlTm9kZVJlbmFtZVRleHRBdFBvc2l0aW9uKG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgcG9zaXRpb246IG51bWJlcik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlIHx8XG4gICAgICBub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICByZXR1cm4gbm9kZS5uYW1lO1xuICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RSZWZlcmVuY2UpIHtcbiAgICBpZiAoaXNXaXRoaW4ocG9zaXRpb24sIG5vZGUua2V5U3BhbikpIHtcbiAgICAgIHJldHVybiBub2RlLmtleVNwYW4udG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUudmFsdWVTcGFuICYmIGlzV2l0aGluKHBvc2l0aW9uLCBub2RlLnZhbHVlU3BhbikpIHtcbiAgICAgIHJldHVybiBub2RlLnZhbHVlU3Bhbi50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBBZGQgc3VwcG9ydCBmb3IgcmVuYW1pbmcgcGlwZXNcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAobm9kZSBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCB8fCBub2RlIGluc3RhbmNlb2YgTWV0aG9kQ2FsbCB8fCBub2RlIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fFxuICAgICAgbm9kZSBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgbm9kZSBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZTtcbiAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgTGl0ZXJhbFByaW1pdGl2ZSkge1xuICAgIHJldHVybiBub2RlLnZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=