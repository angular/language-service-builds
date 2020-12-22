(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/references", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReferenceBuilder = void 0;
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
    var ts = require("typescript");
    var template_target_1 = require("@angular/language-service/ivy/template_target");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var ReferenceBuilder = /** @class */ (function () {
        function ReferenceBuilder(strategy, tsLS, compiler) {
            this.strategy = strategy;
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.ttc = this.compiler.getTemplateTypeChecker();
        }
        ReferenceBuilder.prototype.get = function (filePath, position) {
            this.ttc.generateAllTypeCheckBlocks();
            var templateInfo = utils_1.getTemplateInfoAtPosition(filePath, position, this.compiler);
            return templateInfo !== undefined ?
                this.getReferencesAtTemplatePosition(templateInfo, position) :
                this.getReferencesAtTypescriptPosition(filePath, position);
        };
        ReferenceBuilder.prototype.getReferencesAtTemplatePosition = function (_a, position) {
            var template = _a.template, component = _a.component;
            // Find the AST node in the template at the position.
            var positionDetails = template_target_1.getTargetAtPosition(template, position);
            if (positionDetails === null) {
                return undefined;
            }
            var node = positionDetails.nodeInContext.node;
            // Get the information about the TCB at the template position.
            var symbol = this.ttc.getSymbolOfNode(node, component);
            if (symbol === null) {
                return undefined;
            }
            switch (symbol.kind) {
                case api_1.SymbolKind.Directive:
                case api_1.SymbolKind.Template:
                    // References to elements, templates, and directives will be through template references
                    // (#ref). They shouldn't be used directly for a Language Service reference request.
                    return undefined;
                case api_1.SymbolKind.Element: {
                    var matches = utils_1.getDirectiveMatchesForElementTag(symbol.templateNode, symbol.directives);
                    return this.getReferencesForDirectives(matches);
                }
                case api_1.SymbolKind.DomBinding: {
                    // Dom bindings aren't currently type-checked (see `checkTypeOfDomBindings`) so they don't
                    // have a shim location. This means we can't match dom bindings to their lib.dom reference,
                    // but we can still see if they match to a directive.
                    if (!(node instanceof compiler_1.TmplAstTextAttribute) && !(node instanceof compiler_1.TmplAstBoundAttribute)) {
                        return undefined;
                    }
                    var directives = utils_1.getDirectiveMatchesForAttribute(node.name, symbol.host.templateNode, symbol.host.directives);
                    return this.getReferencesForDirectives(directives);
                }
                case api_1.SymbolKind.Reference: {
                    var _b = symbol.referenceVarLocation, shimPath = _b.shimPath, positionInShimFile = _b.positionInShimFile;
                    return this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile);
                }
                case api_1.SymbolKind.Variable: {
                    var _c = symbol.initializerLocation, initializerPosition = _c.positionInShimFile, shimPath = _c.shimPath;
                    var localVarPosition = symbol.localVarLocation.positionInShimFile;
                    var templateNode = positionDetails.nodeInContext.node;
                    if ((templateNode instanceof compiler_1.TmplAstVariable)) {
                        if (templateNode.valueSpan !== undefined && utils_1.isWithin(position, templateNode.valueSpan)) {
                            // In the valueSpan of the variable, we want to get the reference of the initializer.
                            return this.getReferencesAtTypescriptPosition(shimPath, initializerPosition);
                        }
                        else if (utils_1.isWithin(position, templateNode.keySpan)) {
                            // In the keySpan of the variable, we want to get the reference of the local variable.
                            return this.getReferencesAtTypescriptPosition(shimPath, localVarPosition);
                        }
                        else {
                            return undefined;
                        }
                    }
                    // If the templateNode is not the `TmplAstVariable`, it must be a usage of the variable
                    // somewhere in the template.
                    return this.getReferencesAtTypescriptPosition(shimPath, localVarPosition);
                }
                case api_1.SymbolKind.Input:
                case api_1.SymbolKind.Output: {
                    // TODO(atscott): Determine how to handle when the binding maps to several inputs/outputs
                    var _d = symbol.bindings[0].shimLocation, shimPath = _d.shimPath, positionInShimFile = _d.positionInShimFile;
                    return this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile);
                }
                case api_1.SymbolKind.Pipe:
                case api_1.SymbolKind.Expression: {
                    var _e = symbol.shimLocation, shimPath = _e.shimPath, positionInShimFile = _e.positionInShimFile;
                    return this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile);
                }
            }
        };
        ReferenceBuilder.prototype.getReferencesForDirectives = function (directives) {
            var e_1, _a;
            var allDirectiveRefs = [];
            try {
                for (var _b = tslib_1.__values(directives.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirClass = dir.tsSymbol.valueDeclaration;
                    if (dirClass === undefined || !ts.isClassDeclaration(dirClass) ||
                        dirClass.name === undefined) {
                        continue;
                    }
                    var dirFile = dirClass.getSourceFile().fileName;
                    var dirPosition = dirClass.name.getStart();
                    var directiveRefs = this.getReferencesAtTypescriptPosition(dirFile, dirPosition);
                    if (directiveRefs !== undefined) {
                        allDirectiveRefs.push.apply(allDirectiveRefs, tslib_1.__spread(directiveRefs));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return allDirectiveRefs.length > 0 ? allDirectiveRefs : undefined;
        };
        ReferenceBuilder.prototype.getReferencesAtTypescriptPosition = function (fileName, position) {
            var e_2, _a;
            var refs = this.tsLS.getReferencesAtPosition(fileName, position);
            if (refs === undefined) {
                return undefined;
            }
            var entries = [];
            try {
                for (var refs_1 = tslib_1.__values(refs), refs_1_1 = refs_1.next(); !refs_1_1.done; refs_1_1 = refs_1.next()) {
                    var ref = refs_1_1.value;
                    if (this.ttc.isTrackedTypeCheckFile(file_system_1.absoluteFrom(ref.fileName))) {
                        var entry = convertToTemplateReferenceEntry(ref, this.ttc);
                        if (entry !== null) {
                            entries.push(entry);
                        }
                    }
                    else {
                        entries.push(ref);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (refs_1_1 && !refs_1_1.done && (_a = refs_1.return)) _a.call(refs_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return entries;
        };
        return ReferenceBuilder;
    }());
    exports.ReferenceBuilder = ReferenceBuilder;
    function convertToTemplateReferenceEntry(shimReferenceEntry, templateTypeChecker) {
        // TODO(atscott): Determine how to consistently resolve paths. i.e. with the project serverHost or
        // LSParseConfigHost in the adapter. We should have a better defined way to normalize paths.
        var mapping = templateTypeChecker.getTemplateMappingAtShimLocation({
            shimPath: file_system_1.absoluteFrom(shimReferenceEntry.fileName),
            positionInShimFile: shimReferenceEntry.textSpan.start,
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
            // This includes indirect mappings, which are difficult to map directly to the code location.
            // Diagnostics similarly return a synthetic template string for this case rather than a real
            // location.
            return null;
        }
        return tslib_1.__assign(tslib_1.__assign({}, shimReferenceEntry), { fileName: templateUrl, textSpan: utils_1.toTextSpan(span) });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErRjtJQUUvRiwyRUFBaUg7SUFDakgscUVBQTRJO0lBQzVJLCtCQUFpQztJQUVqQyxpRkFBc0Q7SUFDdEQsNkRBQXlKO0lBRXpKO1FBR0UsMEJBQ3FCLFFBQXFDLEVBQ3JDLElBQXdCLEVBQW1CLFFBQW9CO1lBRC9ELGFBQVEsR0FBUixRQUFRLENBQTZCO1lBQ3JDLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7WUFKbkUsUUFBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUl5QixDQUFDO1FBRXhGLDhCQUFHLEdBQUgsVUFBSSxRQUFnQixFQUFFLFFBQWdCO1lBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN0QyxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixPQUFPLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLCtCQUErQixDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsaUNBQWlDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFFTywwREFBK0IsR0FBdkMsVUFBd0MsRUFBbUMsRUFBRSxRQUFnQjtnQkFBcEQsUUFBUSxjQUFBLEVBQUUsU0FBUyxlQUFBO1lBRTFELHFEQUFxRDtZQUNyRCxJQUFNLGVBQWUsR0FBRyxxQ0FBbUIsQ0FBQyxRQUFRLEVBQUUsUUFB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b29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbn0gZnJvbSAnLi90ZW1wbGF0ZV90YXJnZXQnO1xuaW1wb3J0IHtnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZywgZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VCdWlsZGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSB0dGMgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyKSB7fVxuXG4gIGdldChmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIHRoaXMudHRjLmdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIHJldHVybiB0ZW1wbGF0ZUluZm8gIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKSA6XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24oe3RlbXBsYXRlLCBjb21wb25lbnR9OiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIC8vIEZpbmQgdGhlIEFTVCBub2RlIGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgcG9zaXRpb24uXG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5ub2RlSW5Db250ZXh0Lm5vZGU7XG5cbiAgICAvLyBHZXQgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBUQ0IgYXQgdGhlIHRlbXBsYXRlIHBvc2l0aW9uLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHRjLmdldFN5bWJvbE9mTm9kZShub2RlLCBjb21wb25lbnQpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICAgIC8vIFJlZmVyZW5jZXMgdG8gZWxlbWVudHMsIHRlbXBsYXRlcywgYW5kIGRpcmVjdGl2ZXMgd2lsbCBiZSB0aHJvdWdoIHRlbXBsYXRlIHJlZmVyZW5jZXNcbiAgICAgICAgLy8gKCNyZWYpLiBUaGV5IHNob3VsZG4ndCBiZSB1c2VkIGRpcmVjdGx5IGZvciBhIExhbmd1YWdlIFNlcnZpY2UgcmVmZXJlbmNlIHJlcXVlc3QuXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzRm9yRGlyZWN0aXZlcyhtYXRjaGVzKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOiB7XG4gICAgICAgIC8vIERvbSBiaW5kaW5ncyBhcmVuJ3QgY3VycmVudGx5IHR5cGUtY2hlY2tlZCAoc2VlIGBjaGVja1R5cGVPZkRvbUJpbmRpbmdzYCkgc28gdGhleSBkb24ndFxuICAgICAgICAvLyBoYXZlIGEgc2hpbSBsb2NhdGlvbi4gVGhpcyBtZWFucyB3ZSBjYW4ndCBtYXRjaCBkb20gYmluZGluZ3MgdG8gdGhlaXIgbGliLmRvbSByZWZlcmVuY2UsXG4gICAgICAgIC8vIGJ1dCB3ZSBjYW4gc3RpbGwgc2VlIGlmIHRoZXkgbWF0Y2ggdG8gYSBkaXJlY3RpdmUuXG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgICAgICAgICBub2RlLm5hbWUsIHN5bWJvbC5ob3N0LnRlbXBsYXRlTm9kZSwgc3ltYm9sLmhvc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXMpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wucmVmZXJlbmNlVmFyTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5WYXJpYWJsZToge1xuICAgICAgICBjb25zdCB7cG9zaXRpb25JblNoaW1GaWxlOiBpbml0aWFsaXplclBvc2l0aW9uLCBzaGltUGF0aH0gPSBzeW1ib2wuaW5pdGlhbGl6ZXJMb2NhdGlvbjtcbiAgICAgICAgY29uc3QgbG9jYWxWYXJQb3NpdGlvbiA9IHN5bWJvbC5sb2NhbFZhckxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVOb2RlID0gcG9zaXRpb25EZXRhaWxzLm5vZGVJbkNvbnRleHQubm9kZTtcblxuICAgICAgICBpZiAoKHRlbXBsYXRlTm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkpIHtcbiAgICAgICAgICBpZiAodGVtcGxhdGVOb2RlLnZhbHVlU3BhbiAhPT0gdW5kZWZpbmVkICYmIGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUudmFsdWVTcGFuKSkge1xuICAgICAgICAgICAgLy8gSW4gdGhlIHZhbHVlU3BhbiBvZiB0aGUgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGluaXRpYWxpemVyLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBpbml0aWFsaXplclBvc2l0aW9uKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUua2V5U3BhbikpIHtcbiAgICAgICAgICAgIC8vIEluIHRoZSBrZXlTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbG9jYWwgdmFyaWFibGUuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSB0ZW1wbGF0ZU5vZGUgaXMgbm90IHRoZSBgVG1wbEFzdFZhcmlhYmxlYCwgaXQgbXVzdCBiZSBhIHVzYWdlIG9mIHRoZSB2YXJpYWJsZVxuICAgICAgICAvLyBzb21ld2hlcmUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDoge1xuICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaG93IHRvIGhhbmRsZSB3aGVuIHRoZSBiaW5kaW5nIG1hcHMgdG8gc2V2ZXJhbCBpbnB1dHMvb3V0cHV0c1xuICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wuYmluZGluZ3NbMF0uc2hpbUxvY2F0aW9uO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5zaGltTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXM6IFNldDxEaXJlY3RpdmVTeW1ib2w+KTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbGxEaXJlY3RpdmVSZWZzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgZGlyQ2xhc3MgPSBkaXIudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChkaXJDbGFzcyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyQ2xhc3MpIHx8XG4gICAgICAgICAgZGlyQ2xhc3MubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaXJGaWxlID0gZGlyQ2xhc3MuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgZGlyUG9zaXRpb24gPSBkaXJDbGFzcy5uYW1lLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBkaXJlY3RpdmVSZWZzID0gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZGlyRmlsZSwgZGlyUG9zaXRpb24pO1xuICAgICAgaWYgKGRpcmVjdGl2ZVJlZnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGxEaXJlY3RpdmVSZWZzLnB1c2goLi4uZGlyZWN0aXZlUmVmcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbERpcmVjdGl2ZVJlZnMubGVuZ3RoID4gMCA/IGFsbERpcmVjdGl2ZVJlZnMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZWZzID0gdGhpcy50c0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHJlZnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgaWYgKHRoaXMudHRjLmlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoYWJzb2x1dGVGcm9tKHJlZi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gY29udmVydFRvVGVtcGxhdGVSZWZlcmVuY2VFbnRyeShyZWYsIHRoaXMudHRjKTtcbiAgICAgICAgaWYgKGVudHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHJlZik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb1RlbXBsYXRlUmVmZXJlbmNlRW50cnkoXG4gICAgc2hpbVJlZmVyZW5jZUVudHJ5OiB0cy5SZWZlcmVuY2VFbnRyeSxcbiAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyKTogdHMuUmVmZXJlbmNlRW50cnl8bnVsbCB7XG4gIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdCBzZXJ2ZXJIb3N0IG9yXG4gIC8vIExTUGFyc2VDb25maWdIb3N0IGluIHRoZSBhZGFwdGVyLiBXZSBzaG91bGQgaGF2ZSBhIGJldHRlciBkZWZpbmVkIHdheSB0byBub3JtYWxpemUgcGF0aHMuXG4gIGNvbnN0IG1hcHBpbmcgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFRlbXBsYXRlTWFwcGluZ0F0U2hpbUxvY2F0aW9uKHtcbiAgICBzaGltUGF0aDogYWJzb2x1dGVGcm9tKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSksXG4gICAgcG9zaXRpb25JblNoaW1GaWxlOiBzaGltUmVmZXJlbmNlRW50cnkudGV4dFNwYW4uc3RhcnQsXG4gIH0pO1xuICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICBsZXQgdGVtcGxhdGVVcmw6IEFic29sdXRlRnNQYXRoO1xuICBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudGVtcGxhdGVVcmwpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaW5jbHVkZXMgaW5kaXJlY3QgbWFwcGluZ3MsIHdoaWNoIGFyZSBkaWZmaWN1bHQgdG8gbWFwIGRpcmVjdGx5IHRvIHRoZSBjb2RlIGxvY2F0aW9uLlxuICAgIC8vIERpYWdub3N0aWNzIHNpbWlsYXJseSByZXR1cm4gYSBzeW50aGV0aWMgdGVtcGxhdGUgc3RyaW5nIGZvciB0aGlzIGNhc2UgcmF0aGVyIHRoYW4gYSByZWFsXG4gICAgLy8gbG9jYXRpb24uXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnNoaW1SZWZlcmVuY2VFbnRyeSxcbiAgICBmaWxlTmFtZTogdGVtcGxhdGVVcmwsXG4gICAgdGV4dFNwYW46IHRvVGV4dFNwYW4oc3BhbiksXG4gIH07XG59XG4iXX0=