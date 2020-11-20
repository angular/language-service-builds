(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/quick_info", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript", "@angular/language-service/common/quick_info", "@angular/language-service/ivy/hybrid_visitor", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.QuickInfoBuilder = exports.QuickInfoKind = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var ts = require("typescript");
    var quick_info_1 = require("@angular/language-service/common/quick_info");
    var hybrid_visitor_1 = require("@angular/language-service/ivy/hybrid_visitor");
    var utils_1 = require("@angular/language-service/ivy/utils");
    /**
     * The type of Angular directive. Used for QuickInfo in template.
     */
    var QuickInfoKind;
    (function (QuickInfoKind) {
        QuickInfoKind["COMPONENT"] = "component";
        QuickInfoKind["DIRECTIVE"] = "directive";
        QuickInfoKind["EVENT"] = "event";
        QuickInfoKind["REFERENCE"] = "reference";
        QuickInfoKind["ELEMENT"] = "element";
        QuickInfoKind["VARIABLE"] = "variable";
        QuickInfoKind["PIPE"] = "pipe";
        QuickInfoKind["PROPERTY"] = "property";
        QuickInfoKind["METHOD"] = "method";
        QuickInfoKind["TEMPLATE"] = "template";
    })(QuickInfoKind = exports.QuickInfoKind || (exports.QuickInfoKind = {}));
    var QuickInfoBuilder = /** @class */ (function () {
        function QuickInfoBuilder(tsLS, compiler) {
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.typeChecker = this.compiler.getNextProgram().getTypeChecker();
        }
        QuickInfoBuilder.prototype.get = function (fileName, position) {
            var templateInfo = utils_1.getTemplateInfoAtPosition(fileName, position, this.compiler);
            if (templateInfo === undefined) {
                return undefined;
            }
            var template = templateInfo.template, component = templateInfo.component;
            var node = hybrid_visitor_1.findNodeAtPosition(template, position);
            if (node === undefined) {
                return undefined;
            }
            var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(node, component);
            if (symbol === null) {
                return isDollarAny(node) ? createDollarAnyQuickInfo(node) : undefined;
            }
            return this.getQuickInfoForSymbol(symbol, node);
        };
        QuickInfoBuilder.prototype.getQuickInfoForSymbol = function (symbol, node) {
            switch (symbol.kind) {
                case api_1.SymbolKind.Input:
                case api_1.SymbolKind.Output:
                    return this.getQuickInfoForBindingSymbol(symbol, node);
                case api_1.SymbolKind.Template:
                    return createNgTemplateQuickInfo(node);
                case api_1.SymbolKind.Element:
                    return this.getQuickInfoForElementSymbol(symbol);
                case api_1.SymbolKind.Variable:
                    return this.getQuickInfoForVariableSymbol(symbol, node);
                case api_1.SymbolKind.Reference:
                    return this.getQuickInfoForReferenceSymbol(symbol, node);
                case api_1.SymbolKind.DomBinding:
                    return this.getQuickInfoForDomBinding(node, symbol);
                case api_1.SymbolKind.Directive:
                    return this.getQuickInfoAtShimLocation(symbol.shimLocation, node);
                case api_1.SymbolKind.Expression:
                    return node instanceof compiler_1.BindingPipe ?
                        this.getQuickInfoForPipeSymbol(symbol, node) :
                        this.getQuickInfoAtShimLocation(symbol.shimLocation, node);
            }
        };
        QuickInfoBuilder.prototype.getQuickInfoForBindingSymbol = function (symbol, node) {
            if (symbol.bindings.length === 0) {
                return undefined;
            }
            var kind = symbol.kind === api_1.SymbolKind.Input ? QuickInfoKind.PROPERTY : QuickInfoKind.EVENT;
            var quickInfo = this.getQuickInfoAtShimLocation(symbol.bindings[0].shimLocation, node);
            return quickInfo === undefined ? undefined : updateQuickInfoKind(quickInfo, kind);
        };
        QuickInfoBuilder.prototype.getQuickInfoForElementSymbol = function (symbol) {
            var templateNode = symbol.templateNode;
            var matches = utils_1.getDirectiveMatchesForElementTag(templateNode, symbol.directives);
            if (matches.size > 0) {
                return this.getQuickInfoForDirectiveSymbol(matches.values().next().value, templateNode);
            }
            return quick_info_1.createQuickInfo(templateNode.name, QuickInfoKind.ELEMENT, utils_1.getTextSpanOfNode(templateNode), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType));
        };
        QuickInfoBuilder.prototype.getQuickInfoForVariableSymbol = function (symbol, node) {
            var documentation = this.getDocumentationFromTypeDefAtLocation(symbol.shimLocation);
            return quick_info_1.createQuickInfo(symbol.declaration.name, QuickInfoKind.VARIABLE, utils_1.getTextSpanOfNode(node), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType), documentation);
        };
        QuickInfoBuilder.prototype.getQuickInfoForReferenceSymbol = function (symbol, node) {
            var documentation = this.getDocumentationFromTypeDefAtLocation(symbol.shimLocation);
            return quick_info_1.createQuickInfo(symbol.declaration.name, QuickInfoKind.REFERENCE, utils_1.getTextSpanOfNode(node), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType), documentation);
        };
        QuickInfoBuilder.prototype.getQuickInfoForPipeSymbol = function (symbol, node) {
            var quickInfo = this.getQuickInfoAtShimLocation(symbol.shimLocation, node);
            return quickInfo === undefined ? undefined : updateQuickInfoKind(quickInfo, QuickInfoKind.PIPE);
        };
        QuickInfoBuilder.prototype.getQuickInfoForDomBinding = function (node, symbol) {
            if (!(node instanceof compiler_1.TmplAstTextAttribute) && !(node instanceof compiler_1.TmplAstBoundAttribute)) {
                return undefined;
            }
            var directives = utils_1.getDirectiveMatchesForAttribute(node.name, symbol.host.templateNode, symbol.host.directives);
            if (directives.size === 0) {
                return undefined;
            }
            return this.getQuickInfoForDirectiveSymbol(directives.values().next().value, node);
        };
        QuickInfoBuilder.prototype.getQuickInfoForDirectiveSymbol = function (dir, node) {
            var kind = dir.isComponent ? QuickInfoKind.COMPONENT : QuickInfoKind.DIRECTIVE;
            var documentation = this.getDocumentationFromTypeDefAtLocation(dir.shimLocation);
            var containerName;
            if (ts.isClassDeclaration(dir.tsSymbol.valueDeclaration) && dir.ngModule !== null) {
                containerName = dir.ngModule.name.getText();
            }
            return quick_info_1.createQuickInfo(this.typeChecker.typeToString(dir.tsType), kind, utils_1.getTextSpanOfNode(node), containerName, undefined, documentation);
        };
        QuickInfoBuilder.prototype.getDocumentationFromTypeDefAtLocation = function (shimLocation) {
            var _a;
            var typeDefs = this.tsLS.getTypeDefinitionAtPosition(shimLocation.shimPath, shimLocation.positionInShimFile);
            if (typeDefs === undefined || typeDefs.length === 0) {
                return undefined;
            }
            return (_a = this.tsLS.getQuickInfoAtPosition(typeDefs[0].fileName, typeDefs[0].textSpan.start)) === null || _a === void 0 ? void 0 : _a.documentation;
        };
        QuickInfoBuilder.prototype.getQuickInfoAtShimLocation = function (location, node) {
            var quickInfo = this.tsLS.getQuickInfoAtPosition(location.shimPath, location.positionInShimFile);
            if (quickInfo === undefined || quickInfo.displayParts === undefined) {
                return quickInfo;
            }
            quickInfo.displayParts = utils_1.filterAliasImports(quickInfo.displayParts);
            var textSpan = utils_1.getTextSpanOfNode(node);
            return tslib_1.__assign(tslib_1.__assign({}, quickInfo), { textSpan: textSpan });
        };
        return QuickInfoBuilder;
    }());
    exports.QuickInfoBuilder = QuickInfoBuilder;
    function updateQuickInfoKind(quickInfo, kind) {
        if (quickInfo.displayParts === undefined) {
            return quickInfo;
        }
        var startsWithKind = quickInfo.displayParts.length >= 3 &&
            displayPartsEqual(quickInfo.displayParts[0], { text: '(', kind: quick_info_1.SYMBOL_PUNC }) &&
            quickInfo.displayParts[1].kind === quick_info_1.SYMBOL_TEXT &&
            displayPartsEqual(quickInfo.displayParts[2], { text: ')', kind: quick_info_1.SYMBOL_PUNC });
        if (startsWithKind) {
            quickInfo.displayParts[1].text = kind;
        }
        else {
            quickInfo.displayParts = tslib_1.__spread([
                { text: '(', kind: quick_info_1.SYMBOL_PUNC },
                { text: kind, kind: quick_info_1.SYMBOL_TEXT },
                { text: ')', kind: quick_info_1.SYMBOL_PUNC },
                { text: ' ', kind: quick_info_1.SYMBOL_SPACE }
            ], quickInfo.displayParts);
        }
        return quickInfo;
    }
    function displayPartsEqual(a, b) {
        return a.text === b.text && a.kind === b.kind;
    }
    function isDollarAny(node) {
        return node instanceof compiler_1.MethodCall && node.receiver instanceof compiler_1.ImplicitReceiver &&
            !(node.receiver instanceof compiler_1.ThisReceiver) && node.name === '$any' && node.args.length === 1;
    }
    function createDollarAnyQuickInfo(node) {
        return quick_info_1.createQuickInfo('$any', QuickInfoKind.METHOD, utils_1.getTextSpanOfNode(node), 
        /** containerName */ undefined, 'any', [{
                kind: quick_info_1.SYMBOL_TEXT,
                text: 'function to cast an expression to the `any` type',
            }]);
    }
    // TODO(atscott): Create special `ts.QuickInfo` for `ng-template` and `ng-container` as well.
    function createNgTemplateQuickInfo(node) {
        return quick_info_1.createQuickInfo('ng-template', QuickInfoKind.TEMPLATE, utils_1.getTextSpanOfNode(node), 
        /** containerName */ undefined, 
        /** type */ undefined, [{
                kind: quick_info_1.SYMBOL_TEXT,
                text: 'The `<ng-template>` is an Angular element for rendering HTML. It is never displayed directly.',
            }]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tfaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3F1aWNrX2luZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUF5SjtJQUV6SixxRUFBNk87SUFDN08sK0JBQWlDO0lBRWpDLDBFQUE2RjtJQUU3RiwrRUFBb0Q7SUFDcEQsNkRBQTRKO0lBRTVKOztPQUVHO0lBQ0gsSUFBWSxhQVdYO0lBWEQsV0FBWSxhQUFhO1FBQ3ZCLHdDQUF1QixDQUFBO1FBQ3ZCLHdDQUF1QixDQUFBO1FBQ3ZCLGdDQUFlLENBQUE7UUFDZix3Q0FBdUIsQ0FBQTtRQUN2QixvQ0FBbUIsQ0FBQTtRQUNuQixzQ0FBcUIsQ0FBQTtRQUNyQiw4QkFBYSxDQUFBO1FBQ2Isc0NBQXFCLENBQUE7UUFDckIsa0NBQWlCLENBQUE7UUFDakIsc0NBQXFCLENBQUE7SUFDdkIsQ0FBQyxFQVhXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBV3hCO0lBRUQ7UUFFRSwwQkFBNkIsSUFBd0IsRUFBbUIsUUFBb0I7WUFBL0QsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBWTtZQUQzRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDZ0IsQ0FBQztRQUVoRyw4QkFBRyxHQUFILFVBQUksUUFBZ0IsRUFBRSxRQUFnQjtZQUNwQyxJQUFNLFlBQVksR0FBRyxpQ0FBeUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ00sSUFBQSxRQUFRLEdBQWUsWUFBWSxTQUEzQixFQUFF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LGtEQUFrRDthQUN6RCxDQUFDLENBQ0wsQ0FBQztJQUNKLENBQUM7SUFFRCw2RkFBNkY7SUFDN0YsU0FBUyx5QkFBeUIsQ0FBQyxJQUFxQjtRQUN0RCxPQUFPLDRCQUFlLENBQ2xCLGFBQWEsRUFDYixhQUFhLENBQUMsUUFBUSxFQUN0Qix5QkFBaUIsQ0FBQyxJQUFJLENBQUM7UUFDdkIsb0JBQW9CLENBQUMsU0FBUztRQUM5QixXQUFXLENBQUMsU0FBUyxFQUNyQixDQUFDO2dCQUNDLElBQUksRUFBRSx3QkFBVztnQkFDakIsSUFBSSxFQUNBLCtGQUErRjthQUNwRyxDQUFDLENBQ0wsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgVGhpc1JlY2VpdmVyLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3ROb2RlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIERvbUJpbmRpbmdTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIEV4cHJlc3Npb25TeW1ib2wsIElucHV0QmluZGluZ1N5bWJvbCwgT3V0cHV0QmluZGluZ1N5bWJvbCwgUmVmZXJlbmNlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVmFyaWFibGVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtjcmVhdGVRdWlja0luZm8sIFNZTUJPTF9QVU5DLCBTWU1CT0xfU1BBQ0UsIFNZTUJPTF9URVhUfSBmcm9tICcuLi9jb21tb24vcXVpY2tfaW5mbyc7XG5cbmltcG9ydCB7ZmluZE5vZGVBdFBvc2l0aW9ufSBmcm9tICcuL2h5YnJpZF92aXNpdG9yJztcbmltcG9ydCB7ZmlsdGVyQWxpYXNJbXBvcnRzLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yQXR0cmlidXRlLCBnZXREaXJlY3RpdmVNYXRjaGVzRm9yRWxlbWVudFRhZywgZ2V0VGVtcGxhdGVJbmZvQXRQb3NpdGlvbiwgZ2V0VGV4dFNwYW5PZk5vZGV9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIEFuZ3VsYXIgZGlyZWN0aXZlLiBVc2VkIGZvciBRdWlja0luZm8gaW4gdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBlbnVtIFF1aWNrSW5mb0tpbmQge1xuICBDT01QT05FTlQgPSAnY29tcG9uZW50JyxcbiAgRElSRUNUSVZFID0gJ2RpcmVjdGl2ZScsXG4gIEVWRU5UID0gJ2V2ZW50JyxcbiAgUkVGRVJFTkNFID0gJ3JlZmVyZW5jZScsXG4gIEVMRU1FTlQgPSAnZWxlbWVudCcsXG4gIFZBUklBQkxFID0gJ3ZhcmlhYmxlJyxcbiAgUElQRSA9ICdwaXBlJyxcbiAgUFJPUEVSVFkgPSAncHJvcGVydHknLFxuICBNRVRIT0QgPSAnbWV0aG9kJyxcbiAgVEVNUExBVEUgPSAndGVtcGxhdGUnLFxufVxuXG5leHBvcnQgY2xhc3MgUXVpY2tJbmZvQnVpbGRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrZXIgPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIpIHt9XG5cbiAgZ2V0KGZpbGVOYW1lOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uKGZpbGVOYW1lLCBwb3NpdGlvbiwgdGhpcy5jb21waWxlcik7XG4gICAgaWYgKHRlbXBsYXRlSW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCB7dGVtcGxhdGUsIGNvbXBvbmVudH0gPSB0ZW1wbGF0ZUluZm87XG5cbiAgICBjb25zdCBub2RlID0gZmluZE5vZGVBdFBvc2l0aW9uKHRlbXBsYXRlLCBwb3NpdGlvbik7XG4gICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNvbXBpbGVyLmdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xPZk5vZGUobm9kZSwgY29tcG9uZW50KTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gaXNEb2xsYXJBbnkobm9kZSkgPyBjcmVhdGVEb2xsYXJBbnlRdWlja0luZm8obm9kZSkgOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yU3ltYm9sKHN5bWJvbCwgbm9kZSk7XG4gIH1cblxuICBwcml2YXRlIGdldFF1aWNrSW5mb0ZvclN5bWJvbChzeW1ib2w6IFN5bWJvbCwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgc3dpdGNoIChzeW1ib2wua2luZCkge1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLklucHV0OlxuICAgICAgY2FzZSBTeW1ib2xLaW5kLk91dHB1dDpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yQmluZGluZ1N5bWJvbChzeW1ib2wsIG5vZGUpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlRlbXBsYXRlOlxuICAgICAgICByZXR1cm4gY3JlYXRlTmdUZW1wbGF0ZVF1aWNrSW5mbyhub2RlKTtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbGVtZW50OlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JFbGVtZW50U3ltYm9sKHN5bWJvbCk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVmFyaWFibGU6XG4gICAgICAgIHJldHVybiB0aGlzLmdldFF1aWNrSW5mb0ZvclZhcmlhYmxlU3ltYm9sKHN5bWJvbCwgbm9kZSk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuUmVmZXJlbmNlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JSZWZlcmVuY2VTeW1ib2woc3ltYm9sLCBub2RlKTtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Eb21CaW5kaW5nOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JEb21CaW5kaW5nKG5vZGUsIHN5bWJvbCk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRGlyZWN0aXZlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9BdFNoaW1Mb2NhdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uLCBub2RlKTtcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FeHByZXNzaW9uOlxuICAgICAgICByZXR1cm4gbm9kZSBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlID9cbiAgICAgICAgICAgIHRoaXMuZ2V0UXVpY2tJbmZvRm9yUGlwZVN5bWJvbChzeW1ib2wsIG5vZGUpIDpcbiAgICAgICAgICAgIHRoaXMuZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24oc3ltYm9sLnNoaW1Mb2NhdGlvbiwgbm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JCaW5kaW5nU3ltYm9sKFxuICAgICAgc3ltYm9sOiBJbnB1dEJpbmRpbmdTeW1ib2x8T3V0cHV0QmluZGluZ1N5bWJvbCwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTogdHMuUXVpY2tJbmZvXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAoc3ltYm9sLmJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBraW5kID0gc3ltYm9sLmtpbmQgPT09IFN5bWJvbEtpbmQuSW5wdXQgPyBRdWlja0luZm9LaW5kLlBST1BFUlRZIDogUXVpY2tJbmZvS2luZC5FVkVOVDtcblxuICAgIGNvbnN0IHF1aWNrSW5mbyA9IHRoaXMuZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24oc3ltYm9sLmJpbmRpbmdzWzBdLnNoaW1Mb2NhdGlvbiwgbm9kZSk7XG4gICAgcmV0dXJuIHF1aWNrSW5mbyA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogdXBkYXRlUXVpY2tJbmZvS2luZChxdWlja0luZm8sIGtpbmQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JFbGVtZW50U3ltYm9sKHN5bWJvbDogRWxlbWVudFN5bWJvbCk6IHRzLlF1aWNrSW5mbyB7XG4gICAgY29uc3Qge3RlbXBsYXRlTm9kZX0gPSBzeW1ib2w7XG4gICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgIGlmIChtYXRjaGVzLnNpemUgPiAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JEaXJlY3RpdmVTeW1ib2wobWF0Y2hlcy52YWx1ZXMoKS5uZXh0KCkudmFsdWUsIHRlbXBsYXRlTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICAgdGVtcGxhdGVOb2RlLm5hbWUsIFF1aWNrSW5mb0tpbmQuRUxFTUVOVCwgZ2V0VGV4dFNwYW5PZk5vZGUodGVtcGxhdGVOb2RlKSxcbiAgICAgICAgdW5kZWZpbmVkIC8qIGNvbnRhaW5lck5hbWUgKi8sIHRoaXMudHlwZUNoZWNrZXIudHlwZVRvU3RyaW5nKHN5bWJvbC50c1R5cGUpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UXVpY2tJbmZvRm9yVmFyaWFibGVTeW1ib2woc3ltYm9sOiBWYXJpYWJsZVN5bWJvbCwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTpcbiAgICAgIHRzLlF1aWNrSW5mbyB7XG4gICAgY29uc3QgZG9jdW1lbnRhdGlvbiA9IHRoaXMuZ2V0RG9jdW1lbnRhdGlvbkZyb21UeXBlRGVmQXRMb2NhdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uKTtcbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSwgUXVpY2tJbmZvS2luZC5WQVJJQUJMRSwgZ2V0VGV4dFNwYW5PZk5vZGUobm9kZSksXG4gICAgICAgIHVuZGVmaW5lZCAvKiBjb250YWluZXJOYW1lICovLCB0aGlzLnR5cGVDaGVja2VyLnR5cGVUb1N0cmluZyhzeW1ib2wudHNUeXBlKSwgZG9jdW1lbnRhdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldFF1aWNrSW5mb0ZvclJlZmVyZW5jZVN5bWJvbChzeW1ib2w6IFJlZmVyZW5jZVN5bWJvbCwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTpcbiAgICAgIHRzLlF1aWNrSW5mbyB7XG4gICAgY29uc3QgZG9jdW1lbnRhdGlvbiA9IHRoaXMuZ2V0RG9jdW1lbnRhdGlvbkZyb21UeXBlRGVmQXRMb2NhdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uKTtcbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSwgUXVpY2tJbmZvS2luZC5SRUZFUkVOQ0UsIGdldFRleHRTcGFuT2ZOb2RlKG5vZGUpLFxuICAgICAgICB1bmRlZmluZWQgLyogY29udGFpbmVyTmFtZSAqLywgdGhpcy50eXBlQ2hlY2tlci50eXBlVG9TdHJpbmcoc3ltYm9sLnRzVHlwZSksIGRvY3VtZW50YXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JQaXBlU3ltYm9sKHN5bWJvbDogRXhwcmVzc2lvblN5bWJvbCwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTogdHMuUXVpY2tJbmZvXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBxdWlja0luZm8gPSB0aGlzLmdldFF1aWNrSW5mb0F0U2hpbUxvY2F0aW9uKHN5bWJvbC5zaGltTG9jYXRpb24sIG5vZGUpO1xuICAgIHJldHVybiBxdWlja0luZm8gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IHVwZGF0ZVF1aWNrSW5mb0tpbmQocXVpY2tJbmZvLCBRdWlja0luZm9LaW5kLlBJUEUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JEb21CaW5kaW5nKG5vZGU6IFRtcGxBc3ROb2RlfEFTVCwgc3ltYm9sOiBEb21CaW5kaW5nU3ltYm9sKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSAmJiAhKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZShcbiAgICAgICAgbm9kZS5uYW1lLCBzeW1ib2wuaG9zdC50ZW1wbGF0ZU5vZGUsIHN5bWJvbC5ob3N0LmRpcmVjdGl2ZXMpO1xuICAgIGlmIChkaXJlY3RpdmVzLnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yRGlyZWN0aXZlU3ltYm9sKGRpcmVjdGl2ZXMudmFsdWVzKCkubmV4dCgpLnZhbHVlLCBub2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UXVpY2tJbmZvRm9yRGlyZWN0aXZlU3ltYm9sKGRpcjogRGlyZWN0aXZlU3ltYm9sLCBub2RlOiBUbXBsQXN0Tm9kZXxBU1QpOlxuICAgICAgdHMuUXVpY2tJbmZvIHtcbiAgICBjb25zdCBraW5kID0gZGlyLmlzQ29tcG9uZW50ID8gUXVpY2tJbmZvS2luZC5DT01QT05FTlQgOiBRdWlja0luZm9LaW5kLkRJUkVDVElWRTtcbiAgICBjb25zdCBkb2N1bWVudGF0aW9uID0gdGhpcy5nZXREb2N1bWVudGF0aW9uRnJvbVR5cGVEZWZBdExvY2F0aW9uKGRpci5zaGltTG9jYXRpb24pO1xuICAgIGxldCBjb250YWluZXJOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pICYmIGRpci5uZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgY29udGFpbmVyTmFtZSA9IGRpci5uZ01vZHVsZS5uYW1lLmdldFRleHQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICB0aGlzLnR5cGVDaGVja2VyLnR5cGVUb1N0cmluZyhkaXIudHNUeXBlKSwga2luZCwgZ2V0VGV4dFNwYW5PZk5vZGUobm9kZSksIGNvbnRhaW5lck5hbWUsXG4gICAgICAgIHVuZGVmaW5lZCwgZG9jdW1lbnRhdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldERvY3VtZW50YXRpb25Gcm9tVHlwZURlZkF0TG9jYXRpb24oc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb24pOlxuICAgICAgdHMuU3ltYm9sRGlzcGxheVBhcnRbXXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHR5cGVEZWZzID0gdGhpcy50c0xTLmdldFR5cGVEZWZpbml0aW9uQXRQb3NpdGlvbihcbiAgICAgICAgc2hpbUxvY2F0aW9uLnNoaW1QYXRoLCBzaGltTG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICBpZiAodHlwZURlZnMgPT09IHVuZGVmaW5lZCB8fCB0eXBlRGVmcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbih0eXBlRGVmc1swXS5maWxlTmFtZSwgdHlwZURlZnNbMF0udGV4dFNwYW4uc3RhcnQpXG4gICAgICAgID8uZG9jdW1lbnRhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24obG9jYXRpb246IFNoaW1Mb2NhdGlvbiwgbm9kZTogVG1wbEFzdE5vZGV8QVNUKTogdHMuUXVpY2tJbmZvXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBxdWlja0luZm8gPVxuICAgICAgICB0aGlzLnRzTFMuZ2V0UXVpY2tJbmZvQXRQb3NpdGlvbihsb2NhdGlvbi5zaGltUGF0aCwgbG9jYXRpb24ucG9zaXRpb25JblNoaW1GaWxlKTtcbiAgICBpZiAocXVpY2tJbmZvID09PSB1bmRlZmluZWQgfHwgcXVpY2tJbmZvLmRpc3BsYXlQYXJ0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gcXVpY2tJbmZvO1xuICAgIH1cblxuICAgIHF1aWNrSW5mby5kaXNwbGF5UGFydHMgPSBmaWx0ZXJBbGlhc0ltcG9ydHMocXVpY2tJbmZvLmRpc3BsYXlQYXJ0cyk7XG5cbiAgICBjb25zdCB0ZXh0U3BhbiA9IGdldFRleHRTcGFuT2ZOb2RlKG5vZGUpO1xuICAgIHJldHVybiB7Li4ucXVpY2tJbmZvLCB0ZXh0U3Bhbn07XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlUXVpY2tJbmZvS2luZChxdWlja0luZm86IHRzLlF1aWNrSW5mbywga2luZDogUXVpY2tJbmZvS2luZCk6IHRzLlF1aWNrSW5mbyB7XG4gIGlmIChxdWlja0luZm8uZGlzcGxheVBhcnRzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gcXVpY2tJbmZvO1xuICB9XG5cbiAgY29uc3Qgc3RhcnRzV2l0aEtpbmQgPSBxdWlja0luZm8uZGlzcGxheVBhcnRzLmxlbmd0aCA+PSAzICYmXG4gICAgICBkaXNwbGF5UGFydHNFcXVhbChxdWlja0luZm8uZGlzcGxheVBhcnRzWzBdLCB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30pICYmXG4gICAgICBxdWlja0luZm8uZGlzcGxheVBhcnRzWzFdLmtpbmQgPT09IFNZTUJPTF9URVhUICYmXG4gICAgICBkaXNwbGF5UGFydHNFcXVhbChxdWlja0luZm8uZGlzcGxheVBhcnRzWzJdLCB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30pO1xuICBpZiAoc3RhcnRzV2l0aEtpbmQpIHtcbiAgICBxdWlja0luZm8uZGlzcGxheVBhcnRzWzFdLnRleHQgPSBraW5kO1xuICB9IGVsc2Uge1xuICAgIHF1aWNrSW5mby5kaXNwbGF5UGFydHMgPSBbXG4gICAgICB7dGV4dDogJygnLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDoga2luZCwga2luZDogU1lNQk9MX1RFWFR9LFxuICAgICAge3RleHQ6ICcpJywga2luZDogU1lNQk9MX1BVTkN9LFxuICAgICAge3RleHQ6ICcgJywga2luZDogU1lNQk9MX1NQQUNFfSxcbiAgICAgIC4uLnF1aWNrSW5mby5kaXNwbGF5UGFydHMsXG4gICAgXTtcbiAgfVxuICByZXR1cm4gcXVpY2tJbmZvO1xufVxuXG5mdW5jdGlvbiBkaXNwbGF5UGFydHNFcXVhbChhOiB7dGV4dDogc3RyaW5nLCBraW5kOiBzdHJpbmd9LCBiOiB7dGV4dDogc3RyaW5nLCBraW5kOiBzdHJpbmd9KSB7XG4gIHJldHVybiBhLnRleHQgPT09IGIudGV4dCAmJiBhLmtpbmQgPT09IGIua2luZDtcbn1cblxuZnVuY3Rpb24gaXNEb2xsYXJBbnkobm9kZTogVG1wbEFzdE5vZGV8QVNUKTogbm9kZSBpcyBNZXRob2RDYWxsIHtcbiAgcmV0dXJuIG5vZGUgaW5zdGFuY2VvZiBNZXRob2RDYWxsICYmIG5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyICYmXG4gICAgICAhKG5vZGUucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpICYmIG5vZGUubmFtZSA9PT0gJyRhbnknICYmIG5vZGUuYXJncy5sZW5ndGggPT09IDE7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZURvbGxhckFueVF1aWNrSW5mbyhub2RlOiBNZXRob2RDYWxsKTogdHMuUXVpY2tJbmZvIHtcbiAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICckYW55JyxcbiAgICAgIFF1aWNrSW5mb0tpbmQuTUVUSE9ELFxuICAgICAgZ2V0VGV4dFNwYW5PZk5vZGUobm9kZSksXG4gICAgICAvKiogY29udGFpbmVyTmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAnYW55JyxcbiAgICAgIFt7XG4gICAgICAgIGtpbmQ6IFNZTUJPTF9URVhULFxuICAgICAgICB0ZXh0OiAnZnVuY3Rpb24gdG8gY2FzdCBhbiBleHByZXNzaW9uIHRvIHRoZSBgYW55YCB0eXBlJyxcbiAgICAgIH1dLFxuICApO1xufVxuXG4vLyBUT0RPKGF0c2NvdHQpOiBDcmVhdGUgc3BlY2lhbCBgdHMuUXVpY2tJbmZvYCBmb3IgYG5nLXRlbXBsYXRlYCBhbmQgYG5nLWNvbnRhaW5lcmAgYXMgd2VsbC5cbmZ1bmN0aW9uIGNyZWF0ZU5nVGVtcGxhdGVRdWlja0luZm8obm9kZTogVG1wbEFzdE5vZGV8QVNUKTogdHMuUXVpY2tJbmZvIHtcbiAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICduZy10ZW1wbGF0ZScsXG4gICAgICBRdWlja0luZm9LaW5kLlRFTVBMQVRFLFxuICAgICAgZ2V0VGV4dFNwYW5PZk5vZGUobm9kZSksXG4gICAgICAvKiogY29udGFpbmVyTmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICBbe1xuICAgICAgICBraW5kOiBTWU1CT0xfVEVYVCxcbiAgICAgICAgdGV4dDpcbiAgICAgICAgICAgICdUaGUgYDxuZy10ZW1wbGF0ZT5gIGlzIGFuIEFuZ3VsYXIgZWxlbWVudCBmb3IgcmVuZGVyaW5nIEhUTUwuIEl0IGlzIG5ldmVyIGRpc3BsYXllZCBkaXJlY3RseS4nLFxuICAgICAgfV0sXG4gICk7XG59XG4iXX0=