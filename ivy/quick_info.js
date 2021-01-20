(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/quick_info", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/api", "typescript", "@angular/language-service/ivy/display_parts", "@angular/language-service/ivy/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createQuickInfo = exports.QuickInfoBuilder = void 0;
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
    var display_parts_1 = require("@angular/language-service/ivy/display_parts");
    var utils_1 = require("@angular/language-service/ivy/utils");
    var QuickInfoBuilder = /** @class */ (function () {
        function QuickInfoBuilder(tsLS, compiler, component, node) {
            this.tsLS = tsLS;
            this.compiler = compiler;
            this.component = component;
            this.node = node;
            this.typeChecker = this.compiler.getNextProgram().getTypeChecker();
        }
        QuickInfoBuilder.prototype.get = function () {
            var symbol = this.compiler.getTemplateTypeChecker().getSymbolOfNode(this.node, this.component);
            if (symbol === null) {
                return isDollarAny(this.node) ? createDollarAnyQuickInfo(this.node) : undefined;
            }
            return this.getQuickInfoForSymbol(symbol);
        };
        QuickInfoBuilder.prototype.getQuickInfoForSymbol = function (symbol) {
            switch (symbol.kind) {
                case api_1.SymbolKind.Input:
                case api_1.SymbolKind.Output:
                    return this.getQuickInfoForBindingSymbol(symbol);
                case api_1.SymbolKind.Template:
                    return createNgTemplateQuickInfo(this.node);
                case api_1.SymbolKind.Element:
                    return this.getQuickInfoForElementSymbol(symbol);
                case api_1.SymbolKind.Variable:
                    return this.getQuickInfoForVariableSymbol(symbol);
                case api_1.SymbolKind.Reference:
                    return this.getQuickInfoForReferenceSymbol(symbol);
                case api_1.SymbolKind.DomBinding:
                    return this.getQuickInfoForDomBinding(symbol);
                case api_1.SymbolKind.Directive:
                    return this.getQuickInfoAtShimLocation(symbol.shimLocation);
                case api_1.SymbolKind.Expression:
                    return this.node instanceof compiler_1.BindingPipe ?
                        this.getQuickInfoForPipeSymbol(symbol) :
                        this.getQuickInfoAtShimLocation(symbol.shimLocation);
            }
        };
        QuickInfoBuilder.prototype.getQuickInfoForBindingSymbol = function (symbol) {
            if (symbol.bindings.length === 0) {
                return undefined;
            }
            var kind = symbol.kind === api_1.SymbolKind.Input ? display_parts_1.DisplayInfoKind.PROPERTY : display_parts_1.DisplayInfoKind.EVENT;
            var quickInfo = this.getQuickInfoAtShimLocation(symbol.bindings[0].shimLocation);
            return quickInfo === undefined ? undefined : updateQuickInfoKind(quickInfo, kind);
        };
        QuickInfoBuilder.prototype.getQuickInfoForElementSymbol = function (symbol) {
            var templateNode = symbol.templateNode;
            var matches = utils_1.getDirectiveMatchesForElementTag(templateNode, symbol.directives);
            if (matches.size > 0) {
                return this.getQuickInfoForDirectiveSymbol(matches.values().next().value, templateNode);
            }
            return createQuickInfo(templateNode.name, display_parts_1.DisplayInfoKind.ELEMENT, utils_1.getTextSpanOfNode(templateNode), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType));
        };
        QuickInfoBuilder.prototype.getQuickInfoForVariableSymbol = function (symbol) {
            var documentation = this.getDocumentationFromTypeDefAtLocation(symbol.initializerLocation);
            return createQuickInfo(symbol.declaration.name, display_parts_1.DisplayInfoKind.VARIABLE, utils_1.getTextSpanOfNode(this.node), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType), documentation);
        };
        QuickInfoBuilder.prototype.getQuickInfoForReferenceSymbol = function (symbol) {
            var documentation = this.getDocumentationFromTypeDefAtLocation(symbol.targetLocation);
            return createQuickInfo(symbol.declaration.name, display_parts_1.DisplayInfoKind.REFERENCE, utils_1.getTextSpanOfNode(this.node), undefined /* containerName */, this.typeChecker.typeToString(symbol.tsType), documentation);
        };
        QuickInfoBuilder.prototype.getQuickInfoForPipeSymbol = function (symbol) {
            var quickInfo = this.getQuickInfoAtShimLocation(symbol.shimLocation);
            return quickInfo === undefined ? undefined :
                updateQuickInfoKind(quickInfo, display_parts_1.DisplayInfoKind.PIPE);
        };
        QuickInfoBuilder.prototype.getQuickInfoForDomBinding = function (symbol) {
            if (!(this.node instanceof compiler_1.TmplAstTextAttribute) &&
                !(this.node instanceof compiler_1.TmplAstBoundAttribute)) {
                return undefined;
            }
            var directives = utils_1.getDirectiveMatchesForAttribute(this.node.name, symbol.host.templateNode, symbol.host.directives);
            if (directives.size === 0) {
                return undefined;
            }
            return this.getQuickInfoForDirectiveSymbol(directives.values().next().value);
        };
        QuickInfoBuilder.prototype.getQuickInfoForDirectiveSymbol = function (dir, node) {
            if (node === void 0) { node = this.node; }
            var kind = dir.isComponent ? display_parts_1.DisplayInfoKind.COMPONENT : display_parts_1.DisplayInfoKind.DIRECTIVE;
            var documentation = this.getDocumentationFromTypeDefAtLocation(dir.shimLocation);
            var containerName;
            if (ts.isClassDeclaration(dir.tsSymbol.valueDeclaration) && dir.ngModule !== null) {
                containerName = dir.ngModule.name.getText();
            }
            return createQuickInfo(this.typeChecker.typeToString(dir.tsType), kind, utils_1.getTextSpanOfNode(this.node), containerName, undefined, documentation);
        };
        QuickInfoBuilder.prototype.getDocumentationFromTypeDefAtLocation = function (shimLocation) {
            var _a;
            var typeDefs = this.tsLS.getTypeDefinitionAtPosition(shimLocation.shimPath, shimLocation.positionInShimFile);
            if (typeDefs === undefined || typeDefs.length === 0) {
                return undefined;
            }
            return (_a = this.tsLS.getQuickInfoAtPosition(typeDefs[0].fileName, typeDefs[0].textSpan.start)) === null || _a === void 0 ? void 0 : _a.documentation;
        };
        QuickInfoBuilder.prototype.getQuickInfoAtShimLocation = function (location) {
            var quickInfo = this.tsLS.getQuickInfoAtPosition(location.shimPath, location.positionInShimFile);
            if (quickInfo === undefined || quickInfo.displayParts === undefined) {
                return quickInfo;
            }
            quickInfo.displayParts = utils_1.filterAliasImports(quickInfo.displayParts);
            var textSpan = utils_1.getTextSpanOfNode(this.node);
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
            displayPartsEqual(quickInfo.displayParts[0], { text: '(', kind: display_parts_1.SYMBOL_PUNC }) &&
            quickInfo.displayParts[1].kind === display_parts_1.SYMBOL_TEXT &&
            displayPartsEqual(quickInfo.displayParts[2], { text: ')', kind: display_parts_1.SYMBOL_PUNC });
        if (startsWithKind) {
            quickInfo.displayParts[1].text = kind;
        }
        else {
            quickInfo.displayParts = tslib_1.__spread([
                { text: '(', kind: display_parts_1.SYMBOL_PUNC },
                { text: kind, kind: display_parts_1.SYMBOL_TEXT },
                { text: ')', kind: display_parts_1.SYMBOL_PUNC },
                { text: ' ', kind: display_parts_1.SYMBOL_SPACE }
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
        return createQuickInfo('$any', display_parts_1.DisplayInfoKind.METHOD, utils_1.getTextSpanOfNode(node), 
        /** containerName */ undefined, 'any', [{
                kind: display_parts_1.SYMBOL_TEXT,
                text: 'function to cast an expression to the `any` type',
            }]);
    }
    // TODO(atscott): Create special `ts.QuickInfo` for `ng-template` and `ng-container` as well.
    function createNgTemplateQuickInfo(node) {
        return createQuickInfo('ng-template', display_parts_1.DisplayInfoKind.TEMPLATE, utils_1.getTextSpanOfNode(node), 
        /** containerName */ undefined, 
        /** type */ undefined, [{
                kind: display_parts_1.SYMBOL_TEXT,
                text: 'The `<ng-template>` is an Angular element for rendering HTML. It is never displayed directly.',
            }]);
    }
    /**
     * Construct a QuickInfo object taking into account its container and type.
     * @param name Name of the QuickInfo target
     * @param kind component, directive, pipe, etc.
     * @param textSpan span of the target
     * @param containerName either the Symbol's container or the NgModule that contains the directive
     * @param type user-friendly name of the type
     * @param documentation docstring or comment
     */
    function createQuickInfo(name, kind, textSpan, containerName, type, documentation) {
        var displayParts = display_parts_1.createDisplayParts(name, kind, containerName, type);
        return {
            kind: display_parts_1.unsafeCastDisplayInfoKindToScriptElementKind(kind),
            kindModifiers: ts.ScriptElementKindModifier.none,
            textSpan: textSpan,
            displayParts: displayParts,
            documentation: documentation,
        };
    }
    exports.createQuickInfo = createQuickInfo;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tfaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvaXZ5L3F1aWNrX2luZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUF5SjtJQUV6SixxRUFBNk87SUFDN08sK0JBQWlDO0lBRWpDLDZFQUEwSjtJQUMxSiw2REFBNEo7SUFFNUo7UUFHRSwwQkFDcUIsSUFBd0IsRUFBbUIsUUFBb0IsRUFDL0QsU0FBOEIsRUFBVSxJQUFxQjtZQUQ3RCxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFZO1lBQy9ELGNBQVMsR0FBVCxTQUFTLENBQXFCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBaUI7WUFKakUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBSU0sQ0FBQztRQUV0Riw4QkFBRyxHQUFIO1lBQ0UsSUFBTSxNQUFNLEdBQ1IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQ25CLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7YUFDakY7WUFFRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRU8sZ0RBQXFCLEdBQTdCLFVBQThCLE1BQWM7WUFDMUMsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNuQixLQUFLLGdCQUFV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QUFJO1lBQ2hELFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFlBQVksY0FBQTtZQUNaLGFBQWEsZUFBQTtTQUNkLENBQUM7SUFDSixDQUFDO0lBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgVGhpc1JlY2VpdmVyLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3ROb2RlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIERvbUJpbmRpbmdTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIEV4cHJlc3Npb25TeW1ib2wsIElucHV0QmluZGluZ1N5bWJvbCwgT3V0cHV0QmluZGluZ1N5bWJvbCwgUmVmZXJlbmNlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVmFyaWFibGVTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtjcmVhdGVEaXNwbGF5UGFydHMsIERpc3BsYXlJbmZvS2luZCwgU1lNQk9MX1BVTkMsIFNZTUJPTF9TUEFDRSwgU1lNQk9MX1RFWFQsIHVuc2FmZUNhc3REaXNwbGF5SW5mb0tpbmRUb1NjcmlwdEVsZW1lbnRLaW5kfSBmcm9tICcuL2Rpc3BsYXlfcGFydHMnO1xuaW1wb3J0IHtmaWx0ZXJBbGlhc0ltcG9ydHMsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JBdHRyaWJ1dGUsIGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnLCBnZXRUZW1wbGF0ZUluZm9BdFBvc2l0aW9uLCBnZXRUZXh0U3Bhbk9mTm9kZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBRdWlja0luZm9CdWlsZGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tlciA9IHRoaXMuY29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0c0xTOiB0cy5MYW5ndWFnZVNlcnZpY2UsIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0Tm9kZXxBU1QpIHt9XG5cbiAgZ2V0KCk6IHRzLlF1aWNrSW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpLmdldFN5bWJvbE9mTm9kZSh0aGlzLm5vZGUsIHRoaXMuY29tcG9uZW50KTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gaXNEb2xsYXJBbnkodGhpcy5ub2RlKSA/IGNyZWF0ZURvbGxhckFueVF1aWNrSW5mbyh0aGlzLm5vZGUpIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldFF1aWNrSW5mb0ZvclN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JTeW1ib2woc3ltYm9sOiBTeW1ib2wpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKHN5bWJvbC5raW5kKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuSW5wdXQ6XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuT3V0cHV0OlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JCaW5kaW5nU3ltYm9sKHN5bWJvbCk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuVGVtcGxhdGU6XG4gICAgICAgIHJldHVybiBjcmVhdGVOZ1RlbXBsYXRlUXVpY2tJbmZvKHRoaXMubm9kZSk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRWxlbWVudDpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yRWxlbWVudFN5bWJvbChzeW1ib2wpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JWYXJpYWJsZVN5bWJvbChzeW1ib2wpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlJlZmVyZW5jZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yUmVmZXJlbmNlU3ltYm9sKHN5bWJvbCk7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRG9tQmluZGluZzpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvRm9yRG9tQmluZGluZyhzeW1ib2wpO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkRpcmVjdGl2ZTpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24oc3ltYm9sLnNoaW1Mb2NhdGlvbik7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRXhwcmVzc2lvbjpcbiAgICAgICAgcmV0dXJuIHRoaXMubm9kZSBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlID9cbiAgICAgICAgICAgIHRoaXMuZ2V0UXVpY2tJbmZvRm9yUGlwZVN5bWJvbChzeW1ib2wpIDpcbiAgICAgICAgICAgIHRoaXMuZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24oc3ltYm9sLnNoaW1Mb2NhdGlvbik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JCaW5kaW5nU3ltYm9sKHN5bWJvbDogSW5wdXRCaW5kaW5nU3ltYm9sfE91dHB1dEJpbmRpbmdTeW1ib2wpOiB0cy5RdWlja0luZm9cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmIChzeW1ib2wuYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGtpbmQgPVxuICAgICAgICBzeW1ib2wua2luZCA9PT0gU3ltYm9sS2luZC5JbnB1dCA/IERpc3BsYXlJbmZvS2luZC5QUk9QRVJUWSA6IERpc3BsYXlJbmZvS2luZC5FVkVOVDtcblxuICAgIGNvbnN0IHF1aWNrSW5mbyA9IHRoaXMuZ2V0UXVpY2tJbmZvQXRTaGltTG9jYXRpb24oc3ltYm9sLmJpbmRpbmdzWzBdLnNoaW1Mb2NhdGlvbik7XG4gICAgcmV0dXJuIHF1aWNrSW5mbyA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogdXBkYXRlUXVpY2tJbmZvS2luZChxdWlja0luZm8sIGtpbmQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JFbGVtZW50U3ltYm9sKHN5bWJvbDogRWxlbWVudFN5bWJvbCk6IHRzLlF1aWNrSW5mbyB7XG4gICAgY29uc3Qge3RlbXBsYXRlTm9kZX0gPSBzeW1ib2w7XG4gICAgY29uc3QgbWF0Y2hlcyA9IGdldERpcmVjdGl2ZU1hdGNoZXNGb3JFbGVtZW50VGFnKHRlbXBsYXRlTm9kZSwgc3ltYm9sLmRpcmVjdGl2ZXMpO1xuICAgIGlmIChtYXRjaGVzLnNpemUgPiAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JEaXJlY3RpdmVTeW1ib2wobWF0Y2hlcy52YWx1ZXMoKS5uZXh0KCkudmFsdWUsIHRlbXBsYXRlTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZVF1aWNrSW5mbyhcbiAgICAgICAgdGVtcGxhdGVOb2RlLm5hbWUsIERpc3BsYXlJbmZvS2luZC5FTEVNRU5ULCBnZXRUZXh0U3Bhbk9mTm9kZSh0ZW1wbGF0ZU5vZGUpLFxuICAgICAgICB1bmRlZmluZWQgLyogY29udGFpbmVyTmFtZSAqLywgdGhpcy50eXBlQ2hlY2tlci50eXBlVG9TdHJpbmcoc3ltYm9sLnRzVHlwZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JWYXJpYWJsZVN5bWJvbChzeW1ib2w6IFZhcmlhYmxlU3ltYm9sKTogdHMuUXVpY2tJbmZvIHtcbiAgICBjb25zdCBkb2N1bWVudGF0aW9uID0gdGhpcy5nZXREb2N1bWVudGF0aW9uRnJvbVR5cGVEZWZBdExvY2F0aW9uKHN5bWJvbC5pbml0aWFsaXplckxvY2F0aW9uKTtcbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSwgRGlzcGxheUluZm9LaW5kLlZBUklBQkxFLCBnZXRUZXh0U3Bhbk9mTm9kZSh0aGlzLm5vZGUpLFxuICAgICAgICB1bmRlZmluZWQgLyogY29udGFpbmVyTmFtZSAqLywgdGhpcy50eXBlQ2hlY2tlci50eXBlVG9TdHJpbmcoc3ltYm9sLnRzVHlwZSksIGRvY3VtZW50YXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JSZWZlcmVuY2VTeW1ib2woc3ltYm9sOiBSZWZlcmVuY2VTeW1ib2wpOiB0cy5RdWlja0luZm8ge1xuICAgIGNvbnN0IGRvY3VtZW50YXRpb24gPSB0aGlzLmdldERvY3VtZW50YXRpb25Gcm9tVHlwZURlZkF0TG9jYXRpb24oc3ltYm9sLnRhcmdldExvY2F0aW9uKTtcbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24ubmFtZSwgRGlzcGxheUluZm9LaW5kLlJFRkVSRU5DRSwgZ2V0VGV4dFNwYW5PZk5vZGUodGhpcy5ub2RlKSxcbiAgICAgICAgdW5kZWZpbmVkIC8qIGNvbnRhaW5lck5hbWUgKi8sIHRoaXMudHlwZUNoZWNrZXIudHlwZVRvU3RyaW5nKHN5bWJvbC50c1R5cGUpLCBkb2N1bWVudGF0aW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UXVpY2tJbmZvRm9yUGlwZVN5bWJvbChzeW1ib2w6IEV4cHJlc3Npb25TeW1ib2wpOiB0cy5RdWlja0luZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBxdWlja0luZm8gPSB0aGlzLmdldFF1aWNrSW5mb0F0U2hpbUxvY2F0aW9uKHN5bWJvbC5zaGltTG9jYXRpb24pO1xuICAgIHJldHVybiBxdWlja0luZm8gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUXVpY2tJbmZvS2luZChxdWlja0luZm8sIERpc3BsYXlJbmZvS2luZC5QSVBFKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UXVpY2tJbmZvRm9yRG9tQmluZGluZyhzeW1ib2w6IERvbUJpbmRpbmdTeW1ib2wpIHtcbiAgICBpZiAoISh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgJiZcbiAgICAgICAgISh0aGlzLm5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gZ2V0RGlyZWN0aXZlTWF0Y2hlc0ZvckF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5ub2RlLm5hbWUsIHN5bWJvbC5ob3N0LnRlbXBsYXRlTm9kZSwgc3ltYm9sLmhvc3QuZGlyZWN0aXZlcyk7XG4gICAgaWYgKGRpcmVjdGl2ZXMuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRRdWlja0luZm9Gb3JEaXJlY3RpdmVTeW1ib2woZGlyZWN0aXZlcy52YWx1ZXMoKS5uZXh0KCkudmFsdWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9Gb3JEaXJlY3RpdmVTeW1ib2woZGlyOiBEaXJlY3RpdmVTeW1ib2wsIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCA9IHRoaXMubm9kZSk6XG4gICAgICB0cy5RdWlja0luZm8ge1xuICAgIGNvbnN0IGtpbmQgPSBkaXIuaXNDb21wb25lbnQgPyBEaXNwbGF5SW5mb0tpbmQuQ09NUE9ORU5UIDogRGlzcGxheUluZm9LaW5kLkRJUkVDVElWRTtcbiAgICBjb25zdCBkb2N1bWVudGF0aW9uID0gdGhpcy5nZXREb2N1bWVudGF0aW9uRnJvbVR5cGVEZWZBdExvY2F0aW9uKGRpci5zaGltTG9jYXRpb24pO1xuICAgIGxldCBjb250YWluZXJOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGlyLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pICYmIGRpci5uZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgY29udGFpbmVyTmFtZSA9IGRpci5uZ01vZHVsZS5uYW1lLmdldFRleHQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgICB0aGlzLnR5cGVDaGVja2VyLnR5cGVUb1N0cmluZyhkaXIudHNUeXBlKSwga2luZCwgZ2V0VGV4dFNwYW5PZk5vZGUodGhpcy5ub2RlKSxcbiAgICAgICAgY29udGFpbmVyTmFtZSwgdW5kZWZpbmVkLCBkb2N1bWVudGF0aW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RG9jdW1lbnRhdGlvbkZyb21UeXBlRGVmQXRMb2NhdGlvbihzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbik6XG4gICAgICB0cy5TeW1ib2xEaXNwbGF5UGFydFtdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZURlZnMgPSB0aGlzLnRzTFMuZ2V0VHlwZURlZmluaXRpb25BdFBvc2l0aW9uKFxuICAgICAgICBzaGltTG9jYXRpb24uc2hpbVBhdGgsIHNoaW1Mb2NhdGlvbi5wb3NpdGlvbkluU2hpbUZpbGUpO1xuICAgIGlmICh0eXBlRGVmcyA9PT0gdW5kZWZpbmVkIHx8IHR5cGVEZWZzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudHNMUy5nZXRRdWlja0luZm9BdFBvc2l0aW9uKHR5cGVEZWZzWzBdLmZpbGVOYW1lLCB0eXBlRGVmc1swXS50ZXh0U3Bhbi5zdGFydClcbiAgICAgICAgPy5kb2N1bWVudGF0aW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRRdWlja0luZm9BdFNoaW1Mb2NhdGlvbihsb2NhdGlvbjogU2hpbUxvY2F0aW9uKTogdHMuUXVpY2tJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcXVpY2tJbmZvID1cbiAgICAgICAgdGhpcy50c0xTLmdldFF1aWNrSW5mb0F0UG9zaXRpb24obG9jYXRpb24uc2hpbVBhdGgsIGxvY2F0aW9uLnBvc2l0aW9uSW5TaGltRmlsZSk7XG4gICAgaWYgKHF1aWNrSW5mbyA9PT0gdW5kZWZpbmVkIHx8IHF1aWNrSW5mby5kaXNwbGF5UGFydHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHF1aWNrSW5mbztcbiAgICB9XG5cbiAgICBxdWlja0luZm8uZGlzcGxheVBhcnRzID0gZmlsdGVyQWxpYXNJbXBvcnRzKHF1aWNrSW5mby5kaXNwbGF5UGFydHMpO1xuXG4gICAgY29uc3QgdGV4dFNwYW4gPSBnZXRUZXh0U3Bhbk9mTm9kZSh0aGlzLm5vZGUpO1xuICAgIHJldHVybiB7Li4ucXVpY2tJbmZvLCB0ZXh0U3Bhbn07XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlUXVpY2tJbmZvS2luZChxdWlja0luZm86IHRzLlF1aWNrSW5mbywga2luZDogRGlzcGxheUluZm9LaW5kKTogdHMuUXVpY2tJbmZvIHtcbiAgaWYgKHF1aWNrSW5mby5kaXNwbGF5UGFydHMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBxdWlja0luZm87XG4gIH1cblxuICBjb25zdCBzdGFydHNXaXRoS2luZCA9IHF1aWNrSW5mby5kaXNwbGF5UGFydHMubGVuZ3RoID49IDMgJiZcbiAgICAgIGRpc3BsYXlQYXJ0c0VxdWFsKHF1aWNrSW5mby5kaXNwbGF5UGFydHNbMF0sIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSkgJiZcbiAgICAgIHF1aWNrSW5mby5kaXNwbGF5UGFydHNbMV0ua2luZCA9PT0gU1lNQk9MX1RFWFQgJiZcbiAgICAgIGRpc3BsYXlQYXJ0c0VxdWFsKHF1aWNrSW5mby5kaXNwbGF5UGFydHNbMl0sIHt0ZXh0OiAnKScsIGtpbmQ6IFNZTUJPTF9QVU5DfSk7XG4gIGlmIChzdGFydHNXaXRoS2luZCkge1xuICAgIHF1aWNrSW5mby5kaXNwbGF5UGFydHNbMV0udGV4dCA9IGtpbmQ7XG4gIH0gZWxzZSB7XG4gICAgcXVpY2tJbmZvLmRpc3BsYXlQYXJ0cyA9IFtcbiAgICAgIHt0ZXh0OiAnKCcsIGtpbmQ6IFNZTUJPTF9QVU5DfSxcbiAgICAgIHt0ZXh0OiBraW5kLCBraW5kOiBTWU1CT0xfVEVYVH0sXG4gICAgICB7dGV4dDogJyknLCBraW5kOiBTWU1CT0xfUFVOQ30sXG4gICAgICB7dGV4dDogJyAnLCBraW5kOiBTWU1CT0xfU1BBQ0V9LFxuICAgICAgLi4ucXVpY2tJbmZvLmRpc3BsYXlQYXJ0cyxcbiAgICBdO1xuICB9XG4gIHJldHVybiBxdWlja0luZm87XG59XG5cbmZ1bmN0aW9uIGRpc3BsYXlQYXJ0c0VxdWFsKGE6IHt0ZXh0OiBzdHJpbmcsIGtpbmQ6IHN0cmluZ30sIGI6IHt0ZXh0OiBzdHJpbmcsIGtpbmQ6IHN0cmluZ30pIHtcbiAgcmV0dXJuIGEudGV4dCA9PT0gYi50ZXh0ICYmIGEua2luZCA9PT0gYi5raW5kO1xufVxuXG5mdW5jdGlvbiBpc0RvbGxhckFueShub2RlOiBUbXBsQXN0Tm9kZXxBU1QpOiBub2RlIGlzIE1ldGhvZENhbGwge1xuICByZXR1cm4gbm9kZSBpbnN0YW5jZW9mIE1ldGhvZENhbGwgJiYgbm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICEobm9kZS5yZWNlaXZlciBpbnN0YW5jZW9mIFRoaXNSZWNlaXZlcikgJiYgbm9kZS5uYW1lID09PSAnJGFueScgJiYgbm9kZS5hcmdzLmxlbmd0aCA9PT0gMTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRG9sbGFyQW55UXVpY2tJbmZvKG5vZGU6IE1ldGhvZENhbGwpOiB0cy5RdWlja0luZm8ge1xuICByZXR1cm4gY3JlYXRlUXVpY2tJbmZvKFxuICAgICAgJyRhbnknLFxuICAgICAgRGlzcGxheUluZm9LaW5kLk1FVEhPRCxcbiAgICAgIGdldFRleHRTcGFuT2ZOb2RlKG5vZGUpLFxuICAgICAgLyoqIGNvbnRhaW5lck5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgJ2FueScsXG4gICAgICBbe1xuICAgICAgICBraW5kOiBTWU1CT0xfVEVYVCxcbiAgICAgICAgdGV4dDogJ2Z1bmN0aW9uIHRvIGNhc3QgYW4gZXhwcmVzc2lvbiB0byB0aGUgYGFueWAgdHlwZScsXG4gICAgICB9XSxcbiAgKTtcbn1cblxuLy8gVE9ETyhhdHNjb3R0KTogQ3JlYXRlIHNwZWNpYWwgYHRzLlF1aWNrSW5mb2AgZm9yIGBuZy10ZW1wbGF0ZWAgYW5kIGBuZy1jb250YWluZXJgIGFzIHdlbGwuXG5mdW5jdGlvbiBjcmVhdGVOZ1RlbXBsYXRlUXVpY2tJbmZvKG5vZGU6IFRtcGxBc3ROb2RlfEFTVCk6IHRzLlF1aWNrSW5mbyB7XG4gIHJldHVybiBjcmVhdGVRdWlja0luZm8oXG4gICAgICAnbmctdGVtcGxhdGUnLFxuICAgICAgRGlzcGxheUluZm9LaW5kLlRFTVBMQVRFLFxuICAgICAgZ2V0VGV4dFNwYW5PZk5vZGUobm9kZSksXG4gICAgICAvKiogY29udGFpbmVyTmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICBbe1xuICAgICAgICBraW5kOiBTWU1CT0xfVEVYVCxcbiAgICAgICAgdGV4dDpcbiAgICAgICAgICAgICdUaGUgYDxuZy10ZW1wbGF0ZT5gIGlzIGFuIEFuZ3VsYXIgZWxlbWVudCBmb3IgcmVuZGVyaW5nIEhUTUwuIEl0IGlzIG5ldmVyIGRpc3BsYXllZCBkaXJlY3RseS4nLFxuICAgICAgfV0sXG4gICk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0IGEgUXVpY2tJbmZvIG9iamVjdCB0YWtpbmcgaW50byBhY2NvdW50IGl0cyBjb250YWluZXIgYW5kIHR5cGUuXG4gKiBAcGFyYW0gbmFtZSBOYW1lIG9mIHRoZSBRdWlja0luZm8gdGFyZ2V0XG4gKiBAcGFyYW0ga2luZCBjb21wb25lbnQsIGRpcmVjdGl2ZSwgcGlwZSwgZXRjLlxuICogQHBhcmFtIHRleHRTcGFuIHNwYW4gb2YgdGhlIHRhcmdldFxuICogQHBhcmFtIGNvbnRhaW5lck5hbWUgZWl0aGVyIHRoZSBTeW1ib2wncyBjb250YWluZXIgb3IgdGhlIE5nTW9kdWxlIHRoYXQgY29udGFpbnMgdGhlIGRpcmVjdGl2ZVxuICogQHBhcmFtIHR5cGUgdXNlci1mcmllbmRseSBuYW1lIG9mIHRoZSB0eXBlXG4gKiBAcGFyYW0gZG9jdW1lbnRhdGlvbiBkb2NzdHJpbmcgb3IgY29tbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUXVpY2tJbmZvKFxuICAgIG5hbWU6IHN0cmluZywga2luZDogRGlzcGxheUluZm9LaW5kLCB0ZXh0U3BhbjogdHMuVGV4dFNwYW4sIGNvbnRhaW5lck5hbWU/OiBzdHJpbmcsXG4gICAgdHlwZT86IHN0cmluZywgZG9jdW1lbnRhdGlvbj86IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10pOiB0cy5RdWlja0luZm8ge1xuICBjb25zdCBkaXNwbGF5UGFydHMgPSBjcmVhdGVEaXNwbGF5UGFydHMobmFtZSwga2luZCwgY29udGFpbmVyTmFtZSwgdHlwZSk7XG5cbiAgcmV0dXJuIHtcbiAgICBraW5kOiB1bnNhZmVDYXN0RGlzcGxheUluZm9LaW5kVG9TY3JpcHRFbGVtZW50S2luZChraW5kKSxcbiAgICBraW5kTW9kaWZpZXJzOiB0cy5TY3JpcHRFbGVtZW50S2luZE1vZGlmaWVyLm5vbmUsXG4gICAgdGV4dFNwYW46IHRleHRTcGFuLFxuICAgIGRpc3BsYXlQYXJ0cyxcbiAgICBkb2N1bWVudGF0aW9uLFxuICB9O1xufVxuIl19