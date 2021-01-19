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
            var e_1, _b;
            var _c, _d, _e, _f, _g, _h, _j, _k;
            var template = _a.template, component = _a.component;
            // Find the AST node in the template at the position.
            var positionDetails = template_target_1.getTargetAtPosition(template, position);
            if (positionDetails === null) {
                return undefined;
            }
            var nodes = positionDetails.context.kind === template_target_1.TargetNodeKind.TwoWayBindingContext ?
                positionDetails.context.nodes :
                [positionDetails.context.node];
            var references = [];
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    // Get the information about the TCB at the template position.
                    var symbol = this.ttc.getSymbolOfNode(node, component);
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
                            references.push.apply(references, tslib_1.__spread((_c = this.getReferencesForDirectives(matches)) !== null && _c !== void 0 ? _c : []));
                            break;
                        }
                        case api_1.SymbolKind.DomBinding: {
                            // Dom bindings aren't currently type-checked (see `checkTypeOfDomBindings`) so they don't
                            // have a shim location. This means we can't match dom bindings to their lib.dom
                            // reference, but we can still see if they match to a directive.
                            if (!(node instanceof compiler_1.TmplAstTextAttribute) && !(node instanceof compiler_1.TmplAstBoundAttribute)) {
                                break;
                            }
                            var directives = utils_1.getDirectiveMatchesForAttribute(node.name, symbol.host.templateNode, symbol.host.directives);
                            references.push.apply(references, tslib_1.__spread((_d = this.getReferencesForDirectives(directives)) !== null && _d !== void 0 ? _d : []));
                            break;
                        }
                        case api_1.SymbolKind.Reference: {
                            var _l = symbol.referenceVarLocation, shimPath = _l.shimPath, positionInShimFile = _l.positionInShimFile;
                            references.push.apply(references, tslib_1.__spread((_e = this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile)) !== null && _e !== void 0 ? _e : []));
                            break;
                        }
                        case api_1.SymbolKind.Variable: {
                            var _m = symbol.initializerLocation, initializerPosition = _m.positionInShimFile, shimPath = _m.shimPath;
                            var localVarPosition = symbol.localVarLocation.positionInShimFile;
                            if ((node instanceof compiler_1.TmplAstVariable)) {
                                if (node.valueSpan !== undefined && utils_1.isWithin(position, node.valueSpan)) {
                                    // In the valueSpan of the variable, we want to get the reference of the initializer.
                                    references.push.apply(references, tslib_1.__spread((_f = this.getReferencesAtTypescriptPosition(shimPath, initializerPosition)) !== null && _f !== void 0 ? _f : []));
                                }
                                else if (utils_1.isWithin(position, node.keySpan)) {
                                    // In the keySpan of the variable, we want to get the reference of the local variable.
                                    references.push.apply(references, tslib_1.__spread((_g = this.getReferencesAtTypescriptPosition(shimPath, localVarPosition)) !== null && _g !== void 0 ? _g : []));
                                }
                            }
                            else {
                                // If the templateNode is not the `TmplAstVariable`, it must be a usage of the variable
                                // somewhere in the template.
                                references.push.apply(references, tslib_1.__spread((_h = this.getReferencesAtTypescriptPosition(shimPath, localVarPosition)) !== null && _h !== void 0 ? _h : []));
                            }
                            break;
                        }
                        case api_1.SymbolKind.Input:
                        case api_1.SymbolKind.Output: {
                            // TODO(atscott): Determine how to handle when the binding maps to several inputs/outputs
                            var _o = symbol.bindings[0].shimLocation, shimPath = _o.shimPath, positionInShimFile = _o.positionInShimFile;
                            references.push.apply(references, tslib_1.__spread((_j = this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile)) !== null && _j !== void 0 ? _j : []));
                            break;
                        }
                        case api_1.SymbolKind.Pipe:
                        case api_1.SymbolKind.Expression: {
                            var _p = symbol.shimLocation, shimPath = _p.shimPath, positionInShimFile = _p.positionInShimFile;
                            references.push.apply(references, tslib_1.__spread((_k = this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile)) !== null && _k !== void 0 ? _k : []));
                            break;
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_b = nodes_1.return)) _b.call(nodes_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (references.length === 0) {
                return undefined;
            }
            return references;
        };
        ReferenceBuilder.prototype.getReferencesForDirectives = function (directives) {
            var e_2, _a;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return allDirectiveRefs.length > 0 ? allDirectiveRefs : undefined;
        };
        ReferenceBuilder.prototype.getReferencesAtTypescriptPosition = function (fileName, position) {
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (refs_1_1 && !refs_1_1.done && (_a = refs_1.return)) _a.call(refs_1);
                }
                finally { if (e_3) throw e_3.error; }
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
            // TODO(atscott): Determine how to consistently resolve paths. i.e. with the project
            // serverHost or LSParseConfigHost in the adapter. We should have a better defined way to
            // normalize paths.
            var mapping = utils_1.getTemplateLocationFromShimLocation(templateTypeChecker, file_system_1.absoluteFrom(shimReferenceEntry.fileName), shimReferenceEntry.textSpan.start);
            if (mapping === null) {
                return null;
            }
            var span = mapping.span, templateUrl = mapping.templateUrl;
            return tslib_1.__assign(tslib_1.__assign({}, shimReferenceEntry), { fileName: templateUrl, textSpan: utils_1.toTextSpan(span) });
        };
        return ReferenceBuilder;
    }());
    exports.ReferenceBuilder = ReferenceBuilder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErRjtJQUUvRiwyRUFBaUg7SUFDakgscUVBQTRJO0lBQzVJLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNFO0lBQ3RFLG1FQUE0QztJQUM1Qyw2REFBOEw7SUFFOUw7UUFHRSwwQkFDcUIsUUFBcUMsRUFDckMsSUFBd0IsRUFBbUIsUUFBb0I7WUFEL0QsYUFBUSxHQUFSLFFBQVEsQ0FBNkI7WUFDckMsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUpuRSxRQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBSXlCLENBQUM7UUFFeEYsOEJBQUcsR0FBSCxVQUFJLFFBQWdCLEVBQUUsUUFBZ0I7WUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVPLDBEQUErQixHQUF2QyxVQUF3QyxFQUFtQyxFQUFFLFFBQWdCOzs7Z0JBQXBELFFBQVEsY0FBQSxFQUFFLFNBQVMsZUFBQTtZQUUxRCxxREFBcUQ7WUFDckQsSUFBTSxlQUFlLEdB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LENBQUMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RSxJQUFJLE9BQU8sS0FBSyxTQUFTO2dCQUNyQixrQ0FBdUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLCtCQUFvQixDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUM5RSw2RkFBNkY7Z0JBQzdGLDBGQUEwRjtnQkFDMUYsNkRBQTZEO2dCQUM3RCxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0Qsb0ZBQW9GO1lBQ3BGLHlGQUF5RjtZQUN6RixtQkFBbUI7WUFDbkIsSUFBTSxPQUFPLEdBQUcsMkNBQW1DLENBQy9DLG1CQUFtQixFQUFFLDBCQUFZLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQzlELGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7Z0JBQ3BCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFTSxJQUFBLElBQUksR0FBaUIsT0FBTyxLQUF4QixFQUFFLFdBQVcsR0FBSSxPQUFPLFlBQVgsQ0FBWTtZQUNwQyw2Q0FDSyxrQkFBa0IsS0FDckIsUUFBUSxFQUFFLFdBQVcsRUFDckIsUUFBUSxFQUFFLGtCQUFVLENBQUMsSUFBSSxDQUFDLElBQzFCO1FBQ0osQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXpMRCxJQXlMQztJQXpMWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7VG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbiwgVGFyZ2V0Tm9kZUtpbmR9IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZX0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge2dldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBnZXRUZW1wbGF0ZUxvY2F0aW9uRnJvbVNoaW1Mb2NhdGlvbiwgaXNXaXRoaW4sIFRlbXBsYXRlSW5mbywgdG9UZXh0U3Bhbn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VCdWlsZGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSB0dGMgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHNMUzogdHMuTGFuZ3VhZ2VTZXJ2aWNlLCBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyKSB7fVxuXG4gIGdldChmaWxlUGF0aDogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIHRoaXMudHRjLmdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCk7XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvID0gZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24sIHRoaXMuY29tcGlsZXIpO1xuICAgIHJldHVybiB0ZW1wbGF0ZUluZm8gIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih0ZW1wbGF0ZUluZm8sIHBvc2l0aW9uKSA6XG4gICAgICAgIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24oe3RlbXBsYXRlLCBjb21wb25lbnR9OiBUZW1wbGF0ZUluZm8sIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIC8vIEZpbmQgdGhlIEFTVCBub2RlIGluIHRoZSB0ZW1wbGF0ZSBhdCB0aGUgcG9zaXRpb24uXG4gICAgY29uc3QgcG9zaXRpb25EZXRhaWxzID0gZ2V0VGFyZ2V0QXRQb3NpdGlvbih0ZW1wbGF0ZSwgcG9zaXRpb24pO1xuICAgIGlmIChwb3NpdGlvbkRldGFpbHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZXMgPSBwb3NpdGlvbkRldGFpbHMuY29udGV4dC5raW5kID09PSBUYXJnZXROb2RlS2luZC5Ud29XYXlCaW5kaW5nQ29udGV4dCA/XG4gICAgICAgIHBvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVzIDpcbiAgICAgICAgW3Bvc2l0aW9uRGV0YWlscy5jb250ZXh0Lm5vZGVdO1xuXG4gICAgY29uc3QgcmVmZXJlbmNlczogdHMuUmVmZXJlbmNlRW50cnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgLy8gR2V0IHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgVENCIGF0IHRoZSB0ZW1wbGF0ZSBwb3NpdGlvbi5cbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHRjLmdldFN5bWJvbE9mTm9kZShub2RlLCBjb21wb25lbnQpO1xuICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byBlbGVtZW50cywgdGVtcGxhdGVzLCBhbmQgZGlyZWN0aXZlcyB3aWxsIGJlIHRocm91Z2ggdGVtcGxhdGUgcmVmZXJlbmNlc1xuICAgICAgICAgIC8vICgjcmVmKS4gVGhleSBzaG91bGRuJ3QgYmUgdXNlZCBkaXJlY3RseSBmb3IgYSBMYW5ndWFnZSBTZXJ2aWNlIHJlZmVyZW5jZSByZXF1ZXN0LlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDoge1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZyhzeW1ib2wudGVtcGxhdGVOb2RlLCBzeW1ib2wuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0ZvckRpcmVjdGl2ZXMobWF0Y2hlcykgPz8gW10pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOiB7XG4gICAgICAgICAgLy8gRG9tIGJpbmRpbmdzIGFyZW4ndCBjdXJyZW50bHkgdHlwZS1jaGVja2VkIChzZWUgYGNoZWNrVHlwZU9mRG9tQmluZGluZ3NgKSBzbyB0aGV5IGRvbid0XG4gICAgICAgICAgLy8gaGF2ZSBhIHNoaW0gbG9jYXRpb24uIFRoaXMgbWVhbnMgd2UgY2FuJ3QgbWF0Y2ggZG9tIGJpbmRpbmdzIHRvIHRoZWlyIGxpYi5kb21cbiAgICAgICAgICAvLyByZWZlcmVuY2UsIGJ1dCB3ZSBjYW4gc3RpbGwgc2VlIGlmIHRoZXkgbWF0Y2ggdG8gYSBkaXJlY3RpdmUuXG4gICAgICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSAmJiAhKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgIG5vZGUubmFtZSwgc3ltYm9sLmhvc3QudGVtcGxhdGVOb2RlLCBzeW1ib2wuaG9zdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgICByZWZlcmVuY2VzLnB1c2goLi4udGhpcy5nZXRSZWZlcmVuY2VzRm9yRGlyZWN0aXZlcyhkaXJlY3RpdmVzKSA/PyBbXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZToge1xuICAgICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5yZWZlcmVuY2VWYXJMb2NhdGlvbjtcbiAgICAgICAgICByZWZlcmVuY2VzLnB1c2goXG4gICAgICAgICAgICAgIC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGUpID8/IFtdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6IHtcbiAgICAgICAgICBjb25zdCB7cG9zaXRpb25JblNoaW1GaWxlOiBpbml0aWFsaXplclBvc2l0aW9uLCBzaGltUGF0aH0gPSBzeW1ib2wuaW5pdGlhbGl6ZXJMb2NhdGlvbjtcbiAgICAgICAgICBjb25zdCBsb2NhbFZhclBvc2l0aW9uID0gc3ltYm9sLmxvY2FsVmFyTG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlO1xuXG4gICAgICAgICAgaWYgKChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSkge1xuICAgICAgICAgICAgaWYgKG5vZGUudmFsdWVTcGFuICE9PSB1bmRlZmluZWQgJiYgaXNXaXRoaW4ocG9zaXRpb24sIG5vZGUudmFsdWVTcGFuKSkge1xuICAgICAgICAgICAgICAvLyBJbiB0aGUgdmFsdWVTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgaW5pdGlhbGl6ZXIuXG4gICAgICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgICAgIC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBpbml0aWFsaXplclBvc2l0aW9uKSA/PyBbXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCBub2RlLmtleVNwYW4pKSB7XG4gICAgICAgICAgICAgIC8vIEluIHRoZSBrZXlTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbG9jYWwgdmFyaWFibGUuXG4gICAgICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgICAgIC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBsb2NhbFZhclBvc2l0aW9uKSA/PyBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSB0ZW1wbGF0ZU5vZGUgaXMgbm90IHRoZSBgVG1wbEFzdFZhcmlhYmxlYCwgaXQgbXVzdCBiZSBhIHVzYWdlIG9mIHRoZSB2YXJpYWJsZVxuICAgICAgICAgICAgLy8gc29tZXdoZXJlIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgICAuLi50aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgbG9jYWxWYXJQb3NpdGlvbikgPz8gW10pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5JbnB1dDpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDoge1xuICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gaGFuZGxlIHdoZW4gdGhlIGJpbmRpbmcgbWFwcyB0byBzZXZlcmFsIGlucHV0cy9vdXRwdXRzXG4gICAgICAgICAgY29uc3Qge3NoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9ID0gc3ltYm9sLmJpbmRpbmdzWzBdLnNoaW1Mb2NhdGlvbjtcbiAgICAgICAgICByZWZlcmVuY2VzLnB1c2goXG4gICAgICAgICAgICAgIC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGUpID8/IFtdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZTpcbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkV4cHJlc3Npb246IHtcbiAgICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wuc2hpbUxvY2F0aW9uO1xuICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW10pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVmZXJlbmNlcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0ZvckRpcmVjdGl2ZXMoZGlyZWN0aXZlczogU2V0PERpcmVjdGl2ZVN5bWJvbD4pOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGFsbERpcmVjdGl2ZVJlZnM6IHRzLlJlZmVyZW5jZUVudHJ5W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBkaXJDbGFzcyA9IGRpci50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgaWYgKGRpckNsYXNzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkaXJDbGFzcykgfHxcbiAgICAgICAgICBkaXJDbGFzcy5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpckZpbGUgPSBkaXJDbGFzcy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICBjb25zdCBkaXJQb3NpdGlvbiA9IGRpckNsYXNzLm5hbWUuZ2V0U3RhcnQoKTtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZVJlZnMgPSB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihkaXJGaWxlLCBkaXJQb3NpdGlvbik7XG4gICAgICBpZiAoZGlyZWN0aXZlUmVmcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsbERpcmVjdGl2ZVJlZnMucHVzaCguLi5kaXJlY3RpdmVSZWZzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWxsRGlyZWN0aXZlUmVmcy5sZW5ndGggPiAwID8gYWxsRGlyZWN0aXZlUmVmcyA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOlxuICAgICAgdHMuUmVmZXJlbmNlRW50cnlbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHJlZnMgPSB0aGlzLnRzTFMuZ2V0UmVmZXJlbmNlc0F0UG9zaXRpb24oZmlsZU5hbWUsIHBvc2l0aW9uKTtcbiAgICBpZiAocmVmcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGVudHJpZXM6IHRzLlJlZmVyZW5jZUVudHJ5W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiByZWZzKSB7XG4gICAgICBpZiAodGhpcy50dGMuaXNUcmFja2VkVHlwZUNoZWNrRmlsZShhYnNvbHV0ZUZyb20ocmVmLmZpbGVOYW1lKSkpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLmNvbnZlcnRUb1RlbXBsYXRlUmVmZXJlbmNlRW50cnkocmVmLCB0aGlzLnR0Yyk7XG4gICAgICAgIGlmIChlbnRyeSAhPT0gbnVsbCkge1xuICAgICAgICAgIGVudHJpZXMucHVzaChlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVudHJpZXMucHVzaChyZWYpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZW50cmllcztcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydFRvVGVtcGxhdGVSZWZlcmVuY2VFbnRyeShcbiAgICAgIHNoaW1SZWZlcmVuY2VFbnRyeTogdHMuUmVmZXJlbmNlRW50cnksXG4gICAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyKTogdHMuUmVmZXJlbmNlRW50cnl8bnVsbCB7XG4gICAgY29uc3Qgc2YgPSB0aGlzLnN0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSk7XG4gICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0Y2JOb2RlID0gZmluZFRpZ2h0ZXN0Tm9kZShzZiwgc2hpbVJlZmVyZW5jZUVudHJ5LnRleHRTcGFuLnN0YXJ0KTtcbiAgICBpZiAodGNiTm9kZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHNmLCB0Y2JOb2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5FVkVOVF9QQVJBTUVURVIpKSB7XG4gICAgICAvLyBJZiB0aGUgcmVmZXJlbmNlIHJlc3VsdCBpcyB0aGUgJGV2ZW50IHBhcmFtZXRlciBpbiB0aGUgc3Vic2NyaWJlL2FkZEV2ZW50TGlzdGVuZXIgZnVuY3Rpb25cbiAgICAgIC8vIGluIHRoZSBUQ0IsIHdlIHdhbnQgdG8gZmlsdGVyIHRoaXMgcmVzdWx0IG91dCBvZiB0aGUgcmVmZXJlbmNlcy4gV2UgcmVhbGx5IG9ubHkgd2FudCB0b1xuICAgICAgLy8gcmV0dXJuIHJlZmVyZW5jZXMgdG8gdGhlIHBhcmFtZXRlciBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdFxuICAgIC8vIHNlcnZlckhvc3Qgb3IgTFNQYXJzZUNvbmZpZ0hvc3QgaW4gdGhlIGFkYXB0ZXIuIFdlIHNob3VsZCBoYXZlIGEgYmV0dGVyIGRlZmluZWQgd2F5IHRvXG4gICAgLy8gbm9ybWFsaXplIHBhdGhzLlxuICAgIGNvbnN0IG1hcHBpbmcgPSBnZXRUZW1wbGF0ZUxvY2F0aW9uRnJvbVNoaW1Mb2NhdGlvbihcbiAgICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlciwgYWJzb2x1dGVGcm9tKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSksXG4gICAgICAgIHNoaW1SZWZlcmVuY2VFbnRyeS50ZXh0U3Bhbi5zdGFydCk7XG4gICAgaWYgKG1hcHBpbmcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHtzcGFuLCB0ZW1wbGF0ZVVybH0gPSBtYXBwaW5nO1xuICAgIHJldHVybiB7XG4gICAgICAuLi5zaGltUmVmZXJlbmNlRW50cnksXG4gICAgICBmaWxlTmFtZTogdGVtcGxhdGVVcmwsXG4gICAgICB0ZXh0U3BhbjogdG9UZXh0U3BhbihzcGFuKSxcbiAgICB9O1xuICB9XG59XG4iXX0=