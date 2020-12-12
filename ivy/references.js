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
            // Get the information about the TCB at the template position.
            var symbol = this.ttc.getSymbolOfNode(positionDetails.node, component);
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
                    if (!(positionDetails.node instanceof compiler_1.TmplAstTextAttribute) &&
                        !(positionDetails.node instanceof compiler_1.TmplAstBoundAttribute)) {
                        return undefined;
                    }
                    var directives = utils_1.getDirectiveMatchesForAttribute(positionDetails.node.name, symbol.host.templateNode, symbol.host.directives);
                    return this.getReferencesForDirectives(directives);
                }
                case api_1.SymbolKind.Reference: {
                    var _b = symbol.referenceVarLocation, shimPath = _b.shimPath, positionInShimFile = _b.positionInShimFile;
                    return this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile);
                }
                case api_1.SymbolKind.Variable: {
                    var _c = symbol.initializerLocation, initializerPosition = _c.positionInShimFile, shimPath = _c.shimPath;
                    var localVarPosition = symbol.localVarLocation.positionInShimFile;
                    var templateNode = positionDetails.node;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErRjtJQUUvRiwyRUFBaUg7SUFDakgscUVBQTRJO0lBQzVJLCtCQUFpQztJQUVqQyxpRkFBc0Q7SUFDdEQsNkRBQXlKO0lBRXpKO1FBR0UsMEJBQ3FCLFFBQXFDLEVBQ3JDLElBQXdCLEVBQW1CLFFBQW9CO1lBRC9ELGFBQVEsR0FBUixRQUFRLENBQTZCO1lBQ3JDLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQW1CLGFBQVEsR0FBUixRQUFRLENBQVk7WUFKbkUsUUFBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUl5QixDQUFDO1FBRXhGLDhCQUFHLEdBQUgsVUFBSSxRQUFnQixFQUFFLFFBQWdCO1lBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN0QyxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixPQUFPLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLCtCQUErQixDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsaUNBQWlDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFFTywwREFBK0IsR0FBdkMsVUFBd0MsRUFBbUMsRUFBRSxRQUFnQjtnQkFBcEQsUUFBUSxjQUFBLEVBQUUsU0FBUyxlQUFBO1lBRTFELHFEQUFxRDtZQUNyRCxJQUFNLGVBQWUsR0FBRyxxQ0FBbUIsQ0FBQyxRQUFRLEVBQUUsUUFB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Ozs7OztZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFsSUQsSUFrSUM7SUFsSVksNENBQWdCO0lBb0k3QixTQUFTLCtCQUErQixDQUNwQyxrQkFBcUMsRUFDckMsbUJBQXdDO1FBQzFDLGtHQUFrRztRQUNsRyw0RkFBNEY7UUFDNUYsSUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7WUFDbkUsUUFBUSxFQUFFLDBCQUFZLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDO1lBQ25ELGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLO1NBQ3RELENBQUMsQ0FBQztRQUNILElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ00sSUFBQSxxQkFBcUIsR0FBVSxPQUFPLHNCQUFqQixFQUFFLElBQUksR0FBSSxPQUFPLEtBQVgsQ0FBWTtRQUU5QyxJQUFJLFdBQTJCLENBQUM7UUFDaEMsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQzNDLFdBQVcsR0FBRyxvQ0FBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztTQUNsRjthQUFNLElBQUkscUJBQXFCLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTtZQUNwRCxXQUFXLEdBQUcsMEJBQVksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUMvRDthQUFNO1lBQ0wsNkZBQTZGO1lBQzdGLDRGQUE0RjtZQUM1RixZQUFZO1lBQ1osT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELDZDQUNLLGtCQUFrQixLQUNyQixRQUFRLEVBQUUsV0FBVyxFQUNyQixRQUFRLEVBQUUsa0JBQVUsQ0FBQyxJQUFJLENBQUMsSUFDMUI7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1RtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9ufSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBpc1dpdGhpbiwgVGVtcGxhdGVJbmZvLCB0b1RleHRTcGFufSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUJ1aWxkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHR0YyA9IHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0KGZpbGVQYXRoOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgdGhpcy50dGMuZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVQYXRoLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgcmV0dXJuIHRlbXBsYXRlSW5mbyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgdGhpcy5nZXRSZWZlcmVuY2VzQXRUZW1wbGF0ZVBvc2l0aW9uKHRlbXBsYXRlSW5mbywgcG9zaXRpb24pIDpcbiAgICAgICAgdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlc0F0VGVtcGxhdGVQb3NpdGlvbih7dGVtcGxhdGUsIGNvbXBvbmVudH06IFRlbXBsYXRlSW5mbywgcG9zaXRpb246IG51bWJlcik6XG4gICAgICB0cy5SZWZlcmVuY2VFbnRyeVtdfHVuZGVmaW5lZCB7XG4gICAgLy8gRmluZCB0aGUgQVNUIG5vZGUgaW4gdGhlIHRlbXBsYXRlIGF0IHRoZSBwb3NpdGlvbi5cbiAgICBjb25zdCBwb3NpdGlvbkRldGFpbHMgPSBnZXRUYXJnZXRBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKHBvc2l0aW9uRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBUQ0IgYXQgdGhlIHRlbXBsYXRlIHBvc2l0aW9uLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHRjLmdldFN5bWJvbE9mTm9kZShwb3NpdGlvbkRldGFpbHMubm9kZSwgY29tcG9uZW50KTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIGVsZW1lbnRzLCB0ZW1wbGF0ZXMsIGFuZCBkaXJlY3RpdmVzIHdpbGwgYmUgdGhyb3VnaCB0ZW1wbGF0ZSByZWZlcmVuY2VzXG4gICAgICAgIC8vICgjcmVmKS4gVGhleSBzaG91bGRuJ3QgYmUgdXNlZCBkaXJlY3RseSBmb3IgYSBMYW5ndWFnZSBTZXJ2aWNlIHJlZmVyZW5jZSByZXF1ZXN0LlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVsZW1lbnQ6IHtcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHN5bWJvbC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5kaXJlY3RpdmVzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0ZvckRpcmVjdGl2ZXMobWF0Y2hlcyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzoge1xuICAgICAgICAvLyBEb20gYmluZGluZ3MgYXJlbid0IGN1cnJlbnRseSB0eXBlLWNoZWNrZWQgKHNlZSBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2ApIHNvIHRoZXkgZG9uJ3RcbiAgICAgICAgLy8gaGF2ZSBhIHNoaW0gbG9jYXRpb24uIFRoaXMgbWVhbnMgd2UgY2FuJ3QgbWF0Y2ggZG9tIGJpbmRpbmdzIHRvIHRoZWlyIGxpYi5kb20gcmVmZXJlbmNlLFxuICAgICAgICAvLyBidXQgd2UgY2FuIHN0aWxsIHNlZSBpZiB0aGV5IG1hdGNoIHRvIGEgZGlyZWN0aXZlLlxuICAgICAgICBpZiAoIShwb3NpdGlvbkRldGFpbHMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSAmJlxuICAgICAgICAgICAgIShwb3NpdGlvbkRldGFpbHMubm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlKFxuICAgICAgICAgICAgcG9zaXRpb25EZXRhaWxzLm5vZGUubmFtZSwgc3ltYm9sLmhvc3QudGVtcGxhdGVOb2RlLCBzeW1ib2wuaG9zdC5kaXJlY3RpdmVzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0ZvckRpcmVjdGl2ZXMoZGlyZWN0aXZlcyk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOiB7XG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5yZWZlcmVuY2VWYXJMb2NhdGlvbjtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGUpO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOiB7XG4gICAgICAgIGNvbnN0IHtwb3NpdGlvbkluU2hpbUZpbGU6IGluaXRpYWxpemVyUG9zaXRpb24sIHNoaW1QYXRofSA9IHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9uO1xuICAgICAgICBjb25zdCBsb2NhbFZhclBvc2l0aW9uID0gc3ltYm9sLmxvY2FsVmFyTG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZU5vZGUgPSBwb3NpdGlvbkRldGFpbHMubm9kZTtcblxuICAgICAgICBpZiAoKHRlbXBsYXRlTm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkpIHtcbiAgICAgICAgICBpZiAodGVtcGxhdGVOb2RlLnZhbHVlU3BhbiAhPT0gdW5kZWZpbmVkICYmIGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUudmFsdWVTcGFuKSkge1xuICAgICAgICAgICAgLy8gSW4gdGhlIHZhbHVlU3BhbiBvZiB0aGUgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSByZWZlcmVuY2Ugb2YgdGhlIGluaXRpYWxpemVyLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlc0F0VHlwZXNjcmlwdFBvc2l0aW9uKHNoaW1QYXRoLCBpbml0aWFsaXplclBvc2l0aW9uKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzV2l0aGluKHBvc2l0aW9uLCB0ZW1wbGF0ZU5vZGUua2V5U3BhbikpIHtcbiAgICAgICAgICAgIC8vIEluIHRoZSBrZXlTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgbG9jYWwgdmFyaWFibGUuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSB0ZW1wbGF0ZU5vZGUgaXMgbm90IHRoZSBgVG1wbEFzdFZhcmlhYmxlYCwgaXQgbXVzdCBiZSBhIHVzYWdlIG9mIHRoZSB2YXJpYWJsZVxuICAgICAgICAvLyBzb21ld2hlcmUgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGxvY2FsVmFyUG9zaXRpb24pO1xuICAgICAgfVxuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDoge1xuICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBEZXRlcm1pbmUgaG93IHRvIGhhbmRsZSB3aGVuIHRoZSBiaW5kaW5nIG1hcHMgdG8gc2V2ZXJhbCBpbnB1dHMvb3V0cHV0c1xuICAgICAgICBjb25zdCB7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0gPSBzeW1ib2wuYmluZGluZ3NbMF0uc2hpbUxvY2F0aW9uO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUGlwZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5zaGltTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNGb3JEaXJlY3RpdmVzKGRpcmVjdGl2ZXM6IFNldDxEaXJlY3RpdmVTeW1ib2w+KTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhbGxEaXJlY3RpdmVSZWZzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgZGlyQ2xhc3MgPSBkaXIudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChkaXJDbGFzcyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyQ2xhc3MpIHx8XG4gICAgICAgICAgZGlyQ2xhc3MubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaXJGaWxlID0gZGlyQ2xhc3MuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgZGlyUG9zaXRpb24gPSBkaXJDbGFzcy5uYW1lLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBkaXJlY3RpdmVSZWZzID0gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oZGlyRmlsZSwgZGlyUG9zaXRpb24pO1xuICAgICAgaWYgKGRpcmVjdGl2ZVJlZnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGxEaXJlY3RpdmVSZWZzLnB1c2goLi4uZGlyZWN0aXZlUmVmcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbERpcmVjdGl2ZVJlZnMubGVuZ3RoID4gMCA/IGFsbERpcmVjdGl2ZVJlZnMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZWZzID0gdGhpcy50c0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHJlZnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgaWYgKHRoaXMudHRjLmlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoYWJzb2x1dGVGcm9tKHJlZi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gY29udmVydFRvVGVtcGxhdGVSZWZlcmVuY2VFbnRyeShyZWYsIHRoaXMudHRjKTtcbiAgICAgICAgaWYgKGVudHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHJlZik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb1RlbXBsYXRlUmVmZXJlbmNlRW50cnkoXG4gICAgc2hpbVJlZmVyZW5jZUVudHJ5OiB0cy5SZWZlcmVuY2VFbnRyeSxcbiAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyKTogdHMuUmVmZXJlbmNlRW50cnl8bnVsbCB7XG4gIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdCBzZXJ2ZXJIb3N0IG9yXG4gIC8vIExTUGFyc2VDb25maWdIb3N0IGluIHRoZSBhZGFwdGVyLiBXZSBzaG91bGQgaGF2ZSBhIGJldHRlciBkZWZpbmVkIHdheSB0byBub3JtYWxpemUgcGF0aHMuXG4gIGNvbnN0IG1hcHBpbmcgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFRlbXBsYXRlTWFwcGluZ0F0U2hpbUxvY2F0aW9uKHtcbiAgICBzaGltUGF0aDogYWJzb2x1dGVGcm9tKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSksXG4gICAgcG9zaXRpb25JblNoaW1GaWxlOiBzaGltUmVmZXJlbmNlRW50cnkudGV4dFNwYW4uc3RhcnQsXG4gIH0pO1xuICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICBsZXQgdGVtcGxhdGVVcmw6IEFic29sdXRlRnNQYXRoO1xuICBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudGVtcGxhdGVVcmwpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaW5jbHVkZXMgaW5kaXJlY3QgbWFwcGluZ3MsIHdoaWNoIGFyZSBkaWZmaWN1bHQgdG8gbWFwIGRpcmVjdGx5IHRvIHRoZSBjb2RlIGxvY2F0aW9uLlxuICAgIC8vIERpYWdub3N0aWNzIHNpbWlsYXJseSByZXR1cm4gYSBzeW50aGV0aWMgdGVtcGxhdGUgc3RyaW5nIGZvciB0aGlzIGNhc2UgcmF0aGVyIHRoYW4gYSByZWFsXG4gICAgLy8gbG9jYXRpb24uXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnNoaW1SZWZlcmVuY2VFbnRyeSxcbiAgICBmaWxlTmFtZTogdGVtcGxhdGVVcmwsXG4gICAgdGV4dFNwYW46IHRvVGV4dFNwYW4oc3BhbiksXG4gIH07XG59XG4iXX0=