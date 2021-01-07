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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErRjtJQUUvRiwyRUFBaUg7SUFDakgscUVBQTRJO0lBQzVJLG1GQUFxSDtJQUNySCwrQkFBaUM7SUFFakMsaUZBQXNFO0lBQ3RFLG1FQUE0QztJQUM1Qyw2REFBeUo7SUFFeko7UUFHRSwwQkFDcUIsUUFBcUMsRUFDckMsSUFBd0IsRUFBbUIsUUFBb0I7WUFEL0QsYUFBUSxHQUFSLFFBQVEsQ0FBNkI7WUFDckMsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUpuRSxRQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBSXlCLENBQUM7UUFFeEYsOEJBQUcsR0FBSCxVQUFJLFFBQWdCLEVBQUUsUUFBZ0I7WUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVPLDBEQUErQixHQUF2QyxVQUF3QyxFQUFtQyxFQUFFLFFBQWdCOzs7Z0JBQXBELFFBQVEsY0FBQSxFQUFFLFNBQVMsZUFBQTtZQUUxRCxxREFBcUQ7WUFDckQsSUFBTSxlQUFlLEdB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SUFBSSxDQUFDLElBQzFCO1FBQ0osQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXRNRCxJQXNNQztJQXRNWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7VG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvY29tbWVudHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2V0VGFyZ2V0QXRQb3NpdGlvbiwgVGFyZ2V0Tm9kZUtpbmR9IGZyb20gJy4vdGVtcGxhdGVfdGFyZ2V0JztcbmltcG9ydCB7ZmluZFRpZ2h0ZXN0Tm9kZX0gZnJvbSAnLi90c191dGlscyc7XG5pbXBvcnQge2dldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1dpdGhpbiwgVGVtcGxhdGVJbmZvLCB0b1RleHRTcGFufSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUJ1aWxkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHR0YyA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0KGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgdGhpcy50dGMuZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgcmV0dXJuIHRlbXBsYXRlSW5mbyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgdGhpcy5nZXRSZWZlcmVuY2VzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pIDpcbiAgICAgICAgdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih7dGVtcGxhdGUsIGNvbXBvbmVudH06IFRlbXBsYXRlSW5mbywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgLy8gRmluZCB0aGUgQVNUIG5vZGUgaW4gdGhlIHRlbXBsYXRlIGF0IHRoZSBwb3NpdGlvbi5cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IHBvc2l0aW9uRGV0YWlscy5jb250ZXh0LmtpbmQgPT09IFRhcmdldE5vZGVLaW5kLlR3b1dheUJpbmRpbmdDb250ZXh0ID9cbiAgICAgICAgcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZXMgOlxuICAgICAgICBbcG9zaXRpb25EZXRhaWxzLmNvbnRleHQubm9kZV07XG5cbiAgICBjb25zdCByZWZlcmVuY2VzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAvLyBHZXQgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBUQ0IgYXQgdGhlIHRlbXBsYXRlIHBvc2l0aW9uLlxuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy50dGMuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCk7XG4gICAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5EaXJlY3RpdmU6XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5UZW1wbGF0ZTpcbiAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIGVsZW1lbnRzLCB0ZW1wbGF0ZXMsIGFuZCBkaXJlY3RpdmVzIHdpbGwgYmUgdGhyb3VnaCB0ZW1wbGF0ZSByZWZlcmVuY2VzXG4gICAgICAgICAgLy8gKCNyZWYpLiBUaGV5IHNob3VsZG4ndCBiZSB1c2VkIGRpcmVjdGx5IGZvciBhIExhbmd1YWdlIFNlcnZpY2UgcmVmZXJlbmNlIHJlcXVlc3QuXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OiB7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHN5bWJvbC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICAgICAgICByZWZlcmVuY2VzLnB1c2goLi4udGhpcy5nZXRSZWZlcmVuY2VzRm9yRGlyZWN0aXZlcyhtYXRjaGVzKSA/PyBbXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLkRvbUJpbmRpbmc6IHtcbiAgICAgICAgICAvLyBEb20gYmluZGluZ3MgYXJlbid0IGN1cnJlbnRseSB0eXBlLWNoZWNrZWQgKHNlZSBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2ApIHNvIHRoZXkgZG9uJ3RcbiAgICAgICAgICAvLyBoYXZlIGEgc2hpbSBsb2NhdGlvbi4gVGhpcyBtZWFucyB3ZSBjYW4ndCBtYXRjaCBkb20gYmluZGluZ3MgdG8gdGhlaXIgbGliLmRvbVxuICAgICAgICAgIC8vIHJlZmVyZW5jZSwgYnV0IHdlIGNhbiBzdGlsbCBzZWUgaWYgdGhleSBtYXRjaCB0byBhIGRpcmVjdGl2ZS5cbiAgICAgICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpICYmICEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgICAgICAgIHJlZmVyZW5jZXMucHVzaCguLi50aGlzLmdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXMpID8/IFtdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOiB7XG4gICAgICAgICAgY29uc3Qge3NoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9ID0gc3ltYm9sLnJlZmVyZW5jZVZhckxvY2F0aW9uO1xuICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW10pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5WYXJpYWJsZToge1xuICAgICAgICAgIGNvbnN0IHtwb3NpdGlvbkluU2hpbUZpbGU6IGluaXRpYWxpemVyUG9zaXRpb24sIHNoaW1QYXRofSA9IHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9uO1xuICAgICAgICAgIGNvbnN0IGxvY2FsVmFyUG9zaXRpb24gPSBzeW1ib2wubG9jYWxWYXJMb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGU7XG5cbiAgICAgICAgICBpZiAoKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS52YWx1ZVNwYW4gIT09IHVuZGVmaW5lZCAmJiBpc1dpdGhpbihwb3NpdGlvbiwgbm9kZS52YWx1ZVNwYW4pKSB7XG4gICAgICAgICAgICAgIC8vIEluIHRoZSB2YWx1ZVNwYW4gb2YgdGhlIHZhcmlhYmxlLCB3ZSB3YW50IHRvIGdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBpbml0aWFsaXplci5cbiAgICAgICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgLi4udGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGluaXRpYWxpemVyUG9zaXRpb24pID8/IFtdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaXRoaW4ocG9zaXRpb24sIG5vZGUua2V5U3BhbikpIHtcbiAgICAgICAgICAgICAgLy8gSW4gdGhlIGtleVNwYW4gb2YgdGhlIHZhcmlhYmxlLCB3ZSB3YW50IHRvIGdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBsb2NhbCB2YXJpYWJsZS5cbiAgICAgICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgLi4udGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pID8/IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgdGhlIHRlbXBsYXRlTm9kZSBpcyBub3QgdGhlIGBUbXBsQXN0VmFyaWFibGVgLCBpdCBtdXN0IGJlIGEgdXNhZ2Ugb2YgdGhlIHZhcmlhYmxlXG4gICAgICAgICAgICAvLyBzb21ld2hlcmUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKFxuICAgICAgICAgICAgICAgIC4uLnRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBsb2NhbFZhclBvc2l0aW9uKSA/PyBbXSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OiB7XG4gICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogRGV0ZXJtaW5lIGhvdyB0byBoYW5kbGUgd2hlbiB0aGUgYmluZGluZyBtYXBzIHRvIHNldmVyYWwgaW5wdXRzL291dHB1dHNcbiAgICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wuYmluZGluZ3NbMF0uc2hpbUxvY2F0aW9uO1xuICAgICAgICAgIHJlZmVyZW5jZXMucHVzaChcbiAgICAgICAgICAgICAgLi4udGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSkgPz8gW10pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgU3ltYm9sS2luZC5QaXBlOlxuICAgICAgICBjYXNlIFN5bWJvbEtpbmQuRXhwcmVzc2lvbjoge1xuICAgICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5zaGltTG9jYXRpb247XG4gICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKFxuICAgICAgICAgICAgICAuLi50aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKSA/PyBbXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJlZmVyZW5jZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiByZWZlcmVuY2VzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2VzRm9yRGlyZWN0aXZlcyhkaXJlY3RpdmVzOiBTZXQ8RGlyZWN0aXZlU3ltYm9sPik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWxsRGlyZWN0aXZlUmVmczogdHMuUmVmZXJlbmNlRW50cnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGRpckNsYXNzID0gZGlyLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICBpZiAoZGlyQ2xhc3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRpckNsYXNzKSB8fFxuICAgICAgICAgIGRpckNsYXNzLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlyRmlsZSA9IGRpckNsYXNzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IGRpclBvc2l0aW9uID0gZGlyQ2xhc3MubmFtZS5nZXRTdGFydCgpO1xuICAgICAgY29uc3QgZGlyZWN0aXZlUmVmcyA9IHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKGRpckZpbGUsIGRpclBvc2l0aW9uKTtcbiAgICAgIGlmIChkaXJlY3RpdmVSZWZzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxsRGlyZWN0aXZlUmVmcy5wdXNoKC4uLmRpcmVjdGl2ZVJlZnMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhbGxEaXJlY3RpdmVSZWZzLmxlbmd0aCA+IDAgPyBhbGxEaXJlY3RpdmVSZWZzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZU5hbWU6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcmVmcyA9IHRoaXMudHNMUy5nZXRSZWZlcmVuY2VzQXRQb3NpdGlvbihmaWxlTmFtZSwgcG9zaXRpb24pO1xuICAgIGlmIChyZWZzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cmllczogdHMuUmVmZXJlbmNlRW50cnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcmVmIG9mIHJlZnMpIHtcbiAgICAgIGlmICh0aGlzLnR0Yy5pc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGFic29sdXRlRnJvbShyZWYuZmlsZU5hbWUpKSkge1xuICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMuY29udmVydFRvVGVtcGxhdGVSZWZlcmVuY2VFbnRyeShyZWYsIHRoaXMudHRjKTtcbiAgICAgICAgaWYgKGVudHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHJlZik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0VG9UZW1wbGF0ZVJlZmVyZW5jZUVudHJ5KFxuICAgICAgc2hpbVJlZmVyZW5jZUVudHJ5OiB0cy5SZWZlcmVuY2VFbnRyeSxcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXIpOiB0cy5SZWZlcmVuY2VFbnRyeXxudWxsIHtcbiAgICBjb25zdCBzZiA9IHRoaXMuc3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoc2hpbVJlZmVyZW5jZUVudHJ5LmZpbGVOYW1lKTtcbiAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHRjYk5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBzaGltUmVmZXJlbmNlRW50cnkudGV4dFNwYW4uc3RhcnQpO1xuICAgIGlmICh0Y2JOb2RlID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgaGFzRXhwcmVzc2lvbklkZW50aWZpZXIoc2YsIHRjYk5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkVWRU5UX1BBUkFNRVRFUikpIHtcbiAgICAgIC8vIElmIHRoZSByZWZlcmVuY2UgcmVzdWx0IGlzIHRoZSAkZXZlbnQgcGFyYW1ldGVyIGluIHRoZSBzdWJzY3JpYmUvYWRkRXZlbnRMaXN0ZW5lciBmdW5jdGlvblxuICAgICAgLy8gaW4gdGhlIFRDQiwgd2Ugd2FudCB0byBmaWx0ZXIgdGhpcyByZXN1bHQgb3V0IG9mIHRoZSByZWZlcmVuY2VzLiBXZSByZWFsbHkgb25seSB3YW50IHRvXG4gICAgICAvLyByZXR1cm4gcmVmZXJlbmNlcyB0byB0aGUgcGFyYW1ldGVyIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGYuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaG93IHRvIGNvbnNpc3RlbnRseSByZXNvbHZlIHBhdGhzLiBpLmUuIHdpdGggdGhlIHByb2plY3Qgc2VydmVySG9zdFxuICAgIC8vIG9yIExTUGFyc2VDb25maWdIb3N0IGluIHRoZSBhZGFwdGVyLiBXZSBzaG91bGQgaGF2ZSBhIGJldHRlciBkZWZpbmVkIHdheSB0byBub3JtYWxpemUgcGF0aHMuXG4gICAgY29uc3QgbWFwcGluZyA9IHRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0VGVtcGxhdGVNYXBwaW5nQXRTaGltTG9jYXRpb24oe1xuICAgICAgc2hpbVBhdGg6IGFic29sdXRlRnJvbShzaGltUmVmZXJlbmNlRW50cnkuZmlsZU5hbWUpLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiBzaGltUmVmZXJlbmNlRW50cnkudGV4dFNwYW4uc3RhcnQsXG4gICAgfSk7XG4gICAgaWYgKG1hcHBpbmcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7dGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBzcGFufSA9IG1hcHBpbmc7XG5cbiAgICBsZXQgdGVtcGxhdGVVcmw6IEFic29sdXRlRnNQYXRoO1xuICAgIGlmICh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcpIHtcbiAgICAgIHRlbXBsYXRlVXJsID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH0gZWxzZSBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICAgIHRlbXBsYXRlVXJsID0gYWJzb2x1dGVGcm9tKHRlbXBsYXRlU291cmNlTWFwcGluZy50ZW1wbGF0ZVVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgaW5jbHVkZXMgaW5kaXJlY3QgbWFwcGluZ3MsIHdoaWNoIGFyZSBkaWZmaWN1bHQgdG8gbWFwIGRpcmVjdGx5IHRvIHRoZSBjb2RlIGxvY2F0aW9uLlxuICAgICAgLy8gRGlhZ25vc3RpY3Mgc2ltaWxhcmx5IHJldHVybiBhIHN5bnRoZXRpYyB0ZW1wbGF0ZSBzdHJpbmcgZm9yIHRoaXMgY2FzZSByYXRoZXIgdGhhbiBhIHJlYWxcbiAgICAgIC8vIGxvY2F0aW9uLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnNoaW1SZWZlcmVuY2VFbnRyeSxcbiAgICAgIGZpbGVOYW1lOiB0ZW1wbGF0ZVVybCxcbiAgICAgIHRleHRTcGFuOiB0b1RleHRTcGFuKHNwYW4pLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==