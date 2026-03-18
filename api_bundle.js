var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/language-service/api.ts
var api_exports = {};
__export(api_exports, {
  AngularSymbolKind: () => AngularSymbolKind,
  isNgLanguageService: () => isNgLanguageService
});
module.exports = __toCommonJS(api_exports);
var AngularSymbolKind = /* @__PURE__ */ ((AngularSymbolKind2) => {
  AngularSymbolKind2[AngularSymbolKind2["Namespace"] = 3] = "Namespace";
  AngularSymbolKind2[AngularSymbolKind2["Class"] = 5] = "Class";
  AngularSymbolKind2[AngularSymbolKind2["Array"] = 18] = "Array";
  AngularSymbolKind2[AngularSymbolKind2["Object"] = 19] = "Object";
  AngularSymbolKind2[AngularSymbolKind2["Struct"] = 23] = "Struct";
  AngularSymbolKind2[AngularSymbolKind2["Event"] = 24] = "Event";
  return AngularSymbolKind2;
})(AngularSymbolKind || {});
function isNgLanguageService(ls) {
  return "getTcb" in ls;
}
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=api_bundle.js.map
