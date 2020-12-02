(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/references", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/language-service/ivy/template_target", "@angular/language-service/ivy/utils"], factory);
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
                case api_1.SymbolKind.Element:
                case api_1.SymbolKind.Directive:
                case api_1.SymbolKind.Template:
                case api_1.SymbolKind.DomBinding:
                    // References to elements, templates, and directives will be through template references
                    // (#ref). They shouldn't be used directly for a Language Service reference request.
                    //
                    // Dom bindings aren't currently type-checked (see `checkTypeOfDomBindings`) so they don't
                    // have a shim location and so we cannot find references for them.
                    //
                    // TODO(atscott): Consider finding references for elements that are components as well as
                    // when the position is on an element attribute that directly maps to a directive.
                    return undefined;
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
                case api_1.SymbolKind.Expression: {
                    var _e = symbol.shimLocation, shimPath = _e.shimPath, positionInShimFile = _e.positionInShimFile;
                    return this.getReferencesAtTypescriptPosition(shimPath, positionInShimFile);
                }
            }
        };
        ReferenceBuilder.prototype.getReferencesAtTypescriptPosition = function (fileName, position) {
            var e_1, _a;
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
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (refs_1_1 && !refs_1_1.done && (_a = refs_1.return)) _a.call(refs_1);
                }
                finally { if (e_1) throw e_1.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3JlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFrRDtJQUVsRCwyRUFBaUg7SUFDakgscUVBQTJIO0lBRzNILGlGQUFzRDtJQUN0RCw2REFBc0Y7SUFFdEY7UUFHRSwwQkFDcUIsUUFBcUMsRUFDckMsSUFBd0IsRUFBbUIsUUFBb0I7WUFEL0QsYUFBUSxHQUFSLFFBQVEsQ0FBNkI7WUFDckMsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUpuRSxRQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBSXlCLENBQUM7UUFFeEYsOEJBQUcsR0FBSCxVQUFJLFFBQWdCLEVBQUUsUUFBZ0I7WUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQU0sWUFBWSxHQUFHLGlDQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVPLDBEQUErQixHQUF2QyxVQUF3QyxFQUFtQyxFQUFFLFFBQWdCO2dCQUFwRCxRQUFRLGNBQUEsRUFBRSxTQUFTLGVBQUE7WUFFMUQscURBQXFEO1lBQ3JELElBQU0sZUFBZSxHQUFHLHFDQUFtQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZ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QUs7U0FDdEQsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDTSxJQUFBLHFCQUFxQixHQUFVLE9BQU8sc0JBQWpCLEVBQUUsSUFBSSxHQUFJLE9BQU8sS0FBWCxDQUFZO1FBRTlDLElBQUksV0FBMkIsQ0FBQztRQUNoQyxJQUFJLHFCQUFxQixDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDM0MsV0FBVyxHQUFHLG9DQUFzQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1NBQ2xGO2FBQU0sSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQ3BELFdBQVcsR0FBRywwQkFBWSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQy9EO2FBQU07WUFDTCw2RkFBNkY7WUFDN0YsNEZBQTRGO1lBQzVGLFlBQVk7WUFDWixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsNkNBQ0ssa0JBQWtCLEtBQ3JCLFFBQVEsRUFBRSxXQUFXLEVBQ3JCLFFBQVEsRUFBRSxrQkFBVSxDQUFDLElBQUksQ0FBQyxJQUMxQjtJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7VG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge05nQ29tcGlsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZSc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtTeW1ib2xLaW5kLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZXRUYXJnZXRBdFBvc2l0aW9ufSBmcm9tICcuL3RlbXBsYXRlX3RhcmdldCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24sIGlzV2l0aGluLCBUZW1wbGF0ZUluZm8sIHRvVGV4dFNwYW59IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlQnVpbGRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHRjID0gdGhpcy5jb21waWxlci5nZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRzTFM6IHRzLkxhbmd1YWdlU2VydmljZSwgcHJpdmF0ZSByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcikge31cblxuICBnZXQoZmlsZVBhdGg6IHN0cmluZywgcG9zaXRpb246IG51bWJlcik6IHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICB0aGlzLnR0Yy5nZW5lcmF0ZUFsbFR5cGVDaGVja0Jsb2NrcygpO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IGdldFRlbXBsYXRlSW5mb0F0UG9zaXRpb24oZmlsZVBhdGgsIHBvc2l0aW9uLCB0aGlzLmNvbXBpbGVyKTtcbiAgICByZXR1cm4gdGVtcGxhdGVJbmZvICE9PSB1bmRlZmluZWQgP1xuICAgICAgICB0aGlzLmdldFJlZmVyZW5jZXNBdFRlbXBsYXRlUG9zaXRpb24odGVtcGxhdGVJbmZvLCBwb3NpdGlvbikgOlxuICAgICAgICB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlUGF0aCwgcG9zaXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2VzQXRUZW1wbGF0ZVBvc2l0aW9uKHt0ZW1wbGF0ZSwgY29tcG9uZW50fTogVGVtcGxhdGVJbmZvLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICAvLyBGaW5kIHRoZSBBU1Qgbm9kZSBpbiB0aGUgdGVtcGxhdGUgYXQgdGhlIHBvc2l0aW9uLlxuICAgIGNvbnN0IHBvc2l0aW9uRGV0YWlscyA9IGdldFRhcmdldEF0UG9zaXRpb24odGVtcGxhdGUsIHBvc2l0aW9uKTtcbiAgICBpZiAocG9zaXRpb25EZXRhaWxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIFRDQiBhdCB0aGUgdGVtcGxhdGUgcG9zaXRpb24uXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50dGMuZ2V0U3ltYm9sT2ZOb2RlKHBvc2l0aW9uRGV0YWlscy5ub2RlLCBjb21wb25lbnQpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHN3aXRjaCAoc3ltYm9sLmtpbmQpIHtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5UZW1wbGF0ZTpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOlxuICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIGVsZW1lbnRzLCB0ZW1wbGF0ZXMsIGFuZCBkaXJlY3RpdmVzIHdpbGwgYmUgdGhyb3VnaCB0ZW1wbGF0ZSByZWZlcmVuY2VzXG4gICAgICAgIC8vICgjcmVmKS4gVGhleSBzaG91bGRuJ3QgYmUgdXNlZCBkaXJlY3RseSBmb3IgYSBMYW5ndWFnZSBTZXJ2aWNlIHJlZmVyZW5jZSByZXF1ZXN0LlxuICAgICAgICAvL1xuICAgICAgICAvLyBEb20gYmluZGluZ3MgYXJlbid0IGN1cnJlbnRseSB0eXBlLWNoZWNrZWQgKHNlZSBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2ApIHNvIHRoZXkgZG9uJ3RcbiAgICAgICAgLy8gaGF2ZSBhIHNoaW0gbG9jYXRpb24gYW5kIHNvIHdlIGNhbm5vdCBmaW5kIHJlZmVyZW5jZXMgZm9yIHRoZW0uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE8oYXRzY290dCk6IENvbnNpZGVyIGZpbmRpbmcgcmVmZXJlbmNlcyBmb3IgZWxlbWVudHMgdGhhdCBhcmUgY29tcG9uZW50cyBhcyB3ZWxsIGFzXG4gICAgICAgIC8vIHdoZW4gdGhlIHBvc2l0aW9uIGlzIG9uIGFuIGVsZW1lbnQgYXR0cmlidXRlIHRoYXQgZGlyZWN0bHkgbWFwcyB0byBhIGRpcmVjdGl2ZS5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5SZWZlcmVuY2U6IHtcbiAgICAgICAgY29uc3Qge3NoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9ID0gc3ltYm9sLnJlZmVyZW5jZVZhckxvY2F0aW9uO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZSk7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6IHtcbiAgICAgICAgY29uc3Qge3Bvc2l0aW9uSW5TaGltRmlsZTogaW5pdGlhbGl6ZXJQb3NpdGlvbiwgc2hpbVBhdGh9ID0gc3ltYm9sLmluaXRpYWxpemVyTG9jYXRpb247XG4gICAgICAgIGNvbnN0IGxvY2FsVmFyUG9zaXRpb24gPSBzeW1ib2wubG9jYWxWYXJMb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGU7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlTm9kZSA9IHBvc2l0aW9uRGV0YWlscy5ub2RlO1xuXG4gICAgICAgIGlmICgodGVtcGxhdGVOb2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSkge1xuICAgICAgICAgIGlmICh0ZW1wbGF0ZU5vZGUudmFsdWVTcGFuICE9PSB1bmRlZmluZWQgJiYgaXNXaXRoaW4ocG9zaXRpb24sIHRlbXBsYXRlTm9kZS52YWx1ZVNwYW4pKSB7XG4gICAgICAgICAgICAvLyBJbiB0aGUgdmFsdWVTcGFuIG9mIHRoZSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIHJlZmVyZW5jZSBvZiB0aGUgaW5pdGlhbGl6ZXIuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2VzQXRUeXBlc2NyaXB0UG9zaXRpb24oc2hpbVBhdGgsIGluaXRpYWxpemVyUG9zaXRpb24pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaXRoaW4ocG9zaXRpb24sIHRlbXBsYXRlTm9kZS5rZXlTcGFuKSkge1xuICAgICAgICAgICAgLy8gSW4gdGhlIGtleVNwYW4gb2YgdGhlIHZhcmlhYmxlLCB3ZSB3YW50IHRvIGdldCB0aGUgcmVmZXJlbmNlIG9mIHRoZSBsb2NhbCB2YXJpYWJsZS5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgbG9jYWxWYXJQb3NpdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIHRlbXBsYXRlTm9kZSBpcyBub3QgdGhlIGBUbXBsQXN0VmFyaWFibGVgLCBpdCBtdXN0IGJlIGEgdXNhZ2Ugb2YgdGhlIHZhcmlhYmxlXG4gICAgICAgIC8vIHNvbWV3aGVyZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgbG9jYWxWYXJQb3NpdGlvbik7XG4gICAgICB9XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuSW5wdXQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OiB7XG4gICAgICAgIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gaGFuZGxlIHdoZW4gdGhlIGJpbmRpbmcgbWFwcyB0byBzZXZlcmFsIGlucHV0cy9vdXRwdXRzXG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5iaW5kaW5nc1swXS5zaGltTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOiB7XG4gICAgICAgIGNvbnN0IHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSA9IHN5bWJvbC5zaGltTG9jYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZXNBdFR5cGVzY3JpcHRQb3NpdGlvbihmaWxlTmFtZTogc3RyaW5nLCBwb3NpdGlvbjogbnVtYmVyKTpcbiAgICAgIHRzLlJlZmVyZW5jZUVudHJ5W118dW5kZWZpbmVkIHtcbiAgICBjb25zdCByZWZzID0gdGhpcy50c0xTLmdldFJlZmVyZW5jZXNBdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgaWYgKHJlZnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyaWVzOiB0cy5SZWZlcmVuY2VFbnRyeVtdID0gW107XG4gICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgaWYgKHRoaXMudHRjLmlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoYWJzb2x1dGVGcm9tKHJlZi5maWxlTmFtZSkpKSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gY29udmVydFRvVGVtcGxhdGVSZWZlcmVuY2VFbnRyeShyZWYsIHRoaXMudHRjKTtcbiAgICAgICAgaWYgKGVudHJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZW50cmllcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cmllcy5wdXNoKHJlZik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbnRyaWVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb1RlbXBsYXRlUmVmZXJlbmNlRW50cnkoXG4gICAgc2hpbVJlZmVyZW5jZUVudHJ5OiB0cy5SZWZlcmVuY2VFbnRyeSxcbiAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyKTogdHMuUmVmZXJlbmNlRW50cnl8bnVsbCB7XG4gIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cgdG8gY29uc2lzdGVudGx5IHJlc29sdmUgcGF0aHMuIGkuZS4gd2l0aCB0aGUgcHJvamVjdCBzZXJ2ZXJIb3N0IG9yXG4gIC8vIExTUGFyc2VDb25maWdIb3N0IGluIHRoZSBhZGFwdGVyLiBXZSBzaG91bGQgaGF2ZSBhIGJldHRlciBkZWZpbmVkIHdheSB0byBub3JtYWxpemUgcGF0aHMuXG4gIGNvbnN0IG1hcHBpbmcgPSB0ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFRlbXBsYXRlTWFwcGluZ0F0U2hpbUxvY2F0aW9uKHtcbiAgICBzaGltUGF0aDogYWJzb2x1dGVGcm9tKHNoaW1SZWZlcmVuY2VFbnRyeS5maWxlTmFtZSksXG4gICAgcG9zaXRpb25JblNoaW1GaWxlOiBzaGltUmVmZXJlbmNlRW50cnkudGV4dFNwYW4uc3RhcnQsXG4gIH0pO1xuICBpZiAobWFwcGluZyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHt0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIHNwYW59ID0gbWFwcGluZztcblxuICBsZXQgdGVtcGxhdGVVcmw6IEFic29sdXRlRnNQYXRoO1xuICBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnKSB7XG4gICAgdGVtcGxhdGVVcmwgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHRlbXBsYXRlU291cmNlTWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH0gZWxzZSBpZiAodGVtcGxhdGVTb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdleHRlcm5hbCcpIHtcbiAgICB0ZW1wbGF0ZVVybCA9IGFic29sdXRlRnJvbSh0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcudGVtcGxhdGVVcmwpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaW5jbHVkZXMgaW5kaXJlY3QgbWFwcGluZ3MsIHdoaWNoIGFyZSBkaWZmaWN1bHQgdG8gbWFwIGRpcmVjdGx5IHRvIHRoZSBjb2RlIGxvY2F0aW9uLlxuICAgIC8vIERpYWdub3N0aWNzIHNpbWlsYXJseSByZXR1cm4gYSBzeW50aGV0aWMgdGVtcGxhdGUgc3RyaW5nIGZvciB0aGlzIGNhc2UgcmF0aGVyIHRoYW4gYSByZWFsXG4gICAgLy8gbG9jYXRpb24uXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnNoaW1SZWZlcmVuY2VFbnRyeSxcbiAgICBmaWxlTmFtZTogdGVtcGxhdGVVcmwsXG4gICAgdGV4dFNwYW46IHRvVGV4dFNwYW4oc3BhbiksXG4gIH07XG59XG4iXX0=