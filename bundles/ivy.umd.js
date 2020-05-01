/**
 * @license Angular v10.0.0-next.4+30.sha-95a407d
 * Copyright Google Inc. All Rights Reserved.
 * License: MIT
 */

let $deferred;
function define(modules, callback) {
  $deferred = {modules, callback};
}
module.exports = function(provided) {
  const ts = provided['typescript'];
  if (!ts) {
    throw new Error('Caller does not provide typescript module');
  }
  const results = {};
  const resolvedModules = $deferred.modules.map(m => {
    if (m === 'exports') {
      return results;
    }
    if (m === 'typescript' || m === 'typescript/lib/tsserverlibrary') {
      return ts;
    }
    return require(m);
  });
  $deferred.callback(...resolvedModules);
  return results;
};

define(['exports'], function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var LanguageService = /** @class */ (function () {
        function LanguageService(tsLS) {
            this.tsLS = tsLS;
        }
        LanguageService.prototype.getSemanticDiagnostics = function (fileName) {
            return [];
        };
        return LanguageService;
    }());

    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    function create(info) {
        var tsLS = info.languageService, config = info.config;
        var angularOnly = (config === null || config === void 0 ? void 0 : config.angularOnly) === true;
        var ngLS = new LanguageService(tsLS);
        function getSemanticDiagnostics(fileName) {
            var diagnostics = [];
            if (!angularOnly) {
                diagnostics.push.apply(diagnostics, __spread(tsLS.getSemanticDiagnostics(fileName)));
            }
            diagnostics.push.apply(diagnostics, __spread(ngLS.getSemanticDiagnostics(fileName)));
            return diagnostics;
        }
        return __assign(__assign({}, tsLS), { getSemanticDiagnostics: getSemanticDiagnostics });
    }

    exports.create = create;

    Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=ivy.umd.js.map
