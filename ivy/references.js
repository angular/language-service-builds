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
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    var ts = require("typescript");
    var template_target_1 = require("@angular/language-service/ivy/template_target");
    var ts_utils_1 = require("@angular/language-service/ivy/ts_utils");
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
                        var entry = this.convertToTemplateReferenceEntry(ref, this.ttc);
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
        ReferenceBuilder.prototype.convertToTemplateReferenceEntry = function (shimReferenceEntry, templateTypeChecker) {
            var sf = this.strategy.getProgram().getSourceFile(shimReferenceEntry.fileName);
            if (sf === undefined) {
                return null;
            }
            var tcbNode = ts_utils_1.findTightestNode(sf, shimReferenceEntry.textSpan.start);
            if (tcbNode === undefined ||
                comments_1.hasExpressionIdentifier(sf, tcbNode, comments_1.ExpressionIdentifier.EVENT_PARAMETER)) {
                // If the reference result is the $event parameter in the subscribe/addEventListener function
                // in the TCB, we want to filter this result out of the references. We really only want to
                // return references to the parameter in the template itself.
                return null;
            }
            // TODO(atscott): Determine how to consistently resolve paths. i.e. with the project serverHost
            // or LSParseConfigHost in the adapter. We should have a better defined way to normalize paths.
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
        };
        return ReferenceBuilder;
    }());
    exports.ReferenceBuilder = ReferenceBuilder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErRjtJQUUvRiwyRUFBaUg7SUFDakgscUVBQTRJO0lBQzVJLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNEO0lBQ3RELG1FQUE0QztJQUM1Qyw2REFBeUo7SUFFeko7UUFHRSwwQkFDcUIsUUFBcUMsRUFDckMsSUFBd0IsRUFBbUIsUUFBb0I7WUFEL0QsYUFBUSxHQUFSLFFBQVEsQ0FBNkI7WUFDckMsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUpuRSxRQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBSXlCLENBQUM7UUFFeEYsOEJBQUcsR0FBSCxVQUFJLFFBQWdCLEVBQUUsUUFBZ0I7WUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVPLDBEQUErQixHQUF2QyxVQUF3QyxFQUFtQyxFQUFFLFFBQWdCO2dCQUFwRCxRQUFRLGNBQUEsRUFBRSxTQUFTLGVBQUE7WUFFMUQscURBQXFEO1lBQ3JELElBQU0sZUFBZSxHQUFH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V0FBVyxHQUFHLG9DQUFzQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO2FBQ2xGO2lCQUFNLElBQUkscUJBQXFCLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTtnQkFDcEQsV0FBVyxHQUFHLDBCQUFZLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDL0Q7aUJBQU07Z0JBQ0wsNkZBQTZGO2dCQUM3Riw0RkFBNEY7Z0JBQzVGLFlBQVk7Z0JBQ1osT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDZDQUNLLGtCQUFrQixLQUNyQixRQUFRLEVBQUUsV0FBVyxFQUNyQixRQUFRLEVBQUUsa0JBQVUsQ0FBQyxJQUFJLENBQUMsSUFDMUI7UUFDSixDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBakxELElBaUxDO0lBakxZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TmdDb21waWxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9jb3JlJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtFeHByZXNzaW9uSWRlbnRpZmllciwgaGFzRXhwcmVzc2lvbklkZW50aWZpZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb21tZW50cyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9ufSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2ZpbmRUaWdodGVzdE5vZGV9IGZyb20gJy4vdHNfdXRpbHMnO1xuaW1wb3J0IHtnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZywgZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VCdWlsZGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSB0dGMgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyKSB7fVxuXG4gIGdldChmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIHRoaXMudHRjLmdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIHJldHVybiB0ZW1wbGF0ZUluZm8gIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKSA6XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24oe3RlbXBsYXRlLCBjb21wb25lbnR9OiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIC8vIEZpbmQgdGhlIEFTVCBub2RlIGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgcG9zaXRpb24uXG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IHBvc2l0aW9uRGV0YWlscy5ub2RlSW5Db250ZXh0Lm5vZGU7XG5cbiAgICAvLyBHZXQgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBUQ0IgYXQgdGhlIHRlbXBsYXRlIHBvc2l0aW9uLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHRjLmdldFN5bWJvbE9mTm9kZShub2RlLCBjb21wb25lbnQpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICAgIC8vIFJlZmVyZW5jZXMgdG8gZWxlbWVudHMsIHRlbXBsYXRlcywgYW5kIGRpcmVjdGl2ZXMgd2lsbCBiZSB0aHJvdWdoIHRlbXBsYXRlIHJlZmVyZW5jZXNcbiAgICAgICAgLy8gKCNyZWYpLiBUaGV5IHNob3VsZG4ndCBiZSB1c2VkIGRpcmVjdGx5IGZvciBhIExhbmd1YWdlIFNlcnZpY2UgcmVmZXJlbmNlIHJlcXVlc3QuXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckVsZW1lbnRUYWcoc3ltYm9sLnRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzRm9yRGlyZWN0aXZlcyhtYXRjaGVzKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOiB7XG4gICAgICAgIC8vIERvbSBiaW5kaW5ncyBhcmVuJ3QgY3VycmVudGx5IHR5cGUtY2hlY2tlZCAoc2VlIGBjaGVja1R5cGVPZkRvbUJpbmRpbmdzYCkgc28gdGhleSBkb24ndFxuICAgICAgICAvLyBoYXZlIGEgc2hpbSBsb2NhdGlvbi4gVGhpcyBtZWFucyB3ZSBjYW4ndCBtYXRjaCBkb20gYmluZGluZ3MgdG8gdGhlaXIgbGliLmRvbSByZWZlcmVuY2UsXG4gICAgICAgIC8vIGJ1dCB3ZSBjYW4gc3RpbGwgc2VlIGlmIHRoZXkgbWF0Y2ggdG8gYSBkaXJlY3RpdmUuXG4gICAgICAgIGlmICghKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiYgIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgICAgICAgICBub2RlLm5hbWUsIHN5bWJvbC5ob3N0LnRlbXBsYXRlTm9kZSwgc3ltYm9sLmhvc3QuZGlyZWN0aXZlcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXMpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wucmVmZXJlbmNlVmFyTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5WYXJpYWJsZToge1xuICAgICAgICBjb25zdCB7cG9zaXRpb25JblNoaW1GaWxlOiBpbml0aWFsaXplclBvc2l0aW9uLCBzaGltUGF0aH0gPSBzeW1ib2wuaW5pdGlhbGl6ZXJMb2NhdGlvbjtcbiAgICAgICAgY29uc3QgbG9jYWxWYXJQb3NpdGlvbiA9IHN5bWJvbC5sb2NhbFZhckxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVOb2RlID0gcG9zaXRpb25EZXRhaWxzLm5vZGVJbkNvbnRleHQubm9kZTtcblxuICAgICAgICBpZiAoKHRlbXBsYXRlTm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkpIHtcbiAgICAgICAgICBpZiAodGVtcGxhdGVOb2RlLnZhbHVlU3BhbiAhPT0gdW5kZWZpbmVkICYmIGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUudmFsdWVTcGFuKSkge1xuICAgICAgICAgICAgLy8gSW4gdGhlIHZhbHVlU3BhbiBvZiB0aGUgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGluaXRpYWxpemVyLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBpbml0aWFsaXplclBvc2l0aW9uKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUua2V5U3BhbikpIHtcbiAgICAgICAgICAgIC8vIEluIHRoZSBrZXlTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbG9jYWwgdmFyaWFibGUuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSB0ZW1wbGF0ZU5vZGUgaXMgbm90IHRoZSBgVG1wbEFzdFZhcmlhYmxlYCwgaXQgbXVzdCBiZSBhIHVzYWdlIG9mIHRoZSB2YXJpYWJsZVxuICAgICAgICAvLyBzb21ld2hlcmUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDoge1xuICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaG93IHRvIGhhbmRsZSB3aGVuIHRoZSBiaW5kaW5nIG1hcHMgdG8gc2V2ZXJhbCBpbnB1dHMvb3V0cHV0c1xuICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wuYmluZGluZ3NbMF0uc2hpbUxvY2F0aW9uO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5zaGltTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXM6IFNldDxEaXJlY3RpdmVTeW1ib2w+KTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbGxEaXJlY3RpdmVSZWZzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgZGlyQ2xhc3MgPSBkaXIudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChkaXJDbGFzcyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyQ2xhc3MpIHx8XG4gICAgICAgICAgZGlyQ2xhc3MubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaXJGaWxlID0gZGlyQ2xhc3MuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgZGlyUG9zaXRpb24gPSBkaXJDbGFzcy5uYW1lLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBkaXJlY3RpdmVSZWZzID0gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZGlyRmlsZSwgZGlyUG9zaXRpb24pO1xuICAgICAgaWYgKGRpcmVjdGl2ZVJlZnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGxEaXJlY3RpdmVSZWZzLnB1c2goLi4uZGlyZWN0aXZlUmVmcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbERpcmVjdGl2ZVJlZnMubGVuZ3RoID4gMCA/IGFsbERpcmVjdGl2ZVJlZnMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZWZzID0gdGhpcy50c0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHJlZnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgaWYgKHRoaXMudHRjLmlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoYWJzb2x1dGVGcm9tKHJlZi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5jb252ZXJ0VG9UZW1wbGF0ZVJlZmVyZW5jZUVudHJ5KHJlZiwgdGhpcy50dGMpO1xuICAgICAgICBpZiAoZW50cnkgIT09IG51bGwpIHtcbiAgICAgICAgICBlbnRyaWVzLnB1c2goZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnRyaWVzLnB1c2gocmVmKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVudHJpZXM7XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRUb1RlbXBsYXRlUmVmZXJlbmNlRW50cnkoXG4gICAgICBzaGltUmVmZXJlbmNlRW50cnk6IHRzLlJlZmVyZW5jZUVudHJ5LFxuICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcik6IHRzLlJlZmVyZW5jZUVudHJ5fG51bGwge1xuICAgIGNvbnN0IHNmID0gdGhpcy5zdHJhdGVneS5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShzaGltUmVmZXJlbmNlRW50cnkuZmlsZU5hbWUpO1xuICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGNiTm9kZSA9IGZpbmRUaWdodGVzdE5vZGUoc2YsIHNoaW1SZWZlcmVuY2VFbnRyeS50ZXh0U3Bhbi5zdGFydCk7XG4gICAgaWYgKHRjYk5vZGUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcihzZiwgdGNiTm9kZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRVZFTlRfUEFSQU1FVEVSKSkge1xuICAgICAgLy8gSWYgdGhlIHJlZmVyZW5jZSByZXN1bHQgaXMgdGhlICRldmVudCBwYXJhbWV0ZXIgaW4gdGhlIHN1YnNjcmliZS9hZGRFdmVudExpc3RlbmVyIGZ1bmN0aW9uXG4gICAgICAvLyBpbiB0aGUgVENCLCB3ZSB3YW50IHRvIGZpbHRlciB0aGlzIHJlc3VsdCBvdXQgb2YgdGhlIHJlZmVyZW5jZXMuIFdlIHJlYWxseSBvbmx5IHdhbnQgdG9cbiAgICAgIC8vIHJldHVybiByZWZlcmVuY2VzIHRvIHRoZSBwYXJhbWV0ZXIgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdCBzZXJ2ZXJIb3N0XG4gICAgLy8gb3IgTFNQYXJzZUNvbmZpZ0hvc3QgaW4gdGhlIGFkYXB0ZXIuIFdlIHNob3VsZCBoYXZlIGEgYmV0dGVyIGRlZmluZWQgd2F5IHRvIG5vcm1hbGl6ZSBwYXRocy5cbiAgICBjb25zdCBtYXBwaW5nID0gdGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbih7XG4gICAgICBzaGltUGF0aDogYWJzb2x1dGVGcm9tKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSksXG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHNoaW1SZWZlcmVuY2VFbnRyeS50ZXh0U3Bhbi5zdGFydCxcbiAgICB9KTtcbiAgICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICAgIGxldCB0ZW1wbGF0ZVVybDogQWJzb2x1dGVGc1BhdGg7XG4gICAgaWYgKHRlbXBsYXRlU291cmNlTWFwcGluZy50eXBlID09PSAnZGlyZWN0Jykge1xuICAgICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb20odGVtcGxhdGVTb3VyY2VNYXBwaW5nLnRlbXBsYXRlVXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpbmNsdWRlcyBpbmRpcmVjdCBtYXBwaW5ncywgd2hpY2ggYXJlIGRpZmZpY3VsdCB0byBtYXAgZGlyZWN0bHkgdG8gdGhlIGNvZGUgbG9jYXRpb24uXG4gICAgICAvLyBEaWFnbm9zdGljcyBzaW1pbGFybHkgcmV0dXJuIGEgc3ludGhldGljIHRlbXBsYXRlIHN0cmluZyBmb3IgdGhpcyBjYXNlIHJhdGhlciB0aGFuIGEgcmVhbFxuICAgICAgLy8gbG9jYXRpb24uXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uc2hpbVJlZmVyZW5jZUVudHJ5LFxuICAgICAgZmlsZU5hbWU6IHRlbXBsYXRlVXJsLFxuICAgICAgdGV4dFNwYW46IHRvVGV4dFNwYW4oc3BhbiksXG4gICAgfTtcbiAgfVxufVxuIl19