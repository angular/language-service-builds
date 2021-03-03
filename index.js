/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service", ["require", "exports", "tslib", "@angular/language-service/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/language-service/api"), exports);
    var factory = function (tsModule) {
        var plugin;
        return {
            create: function (info) {
                var config = info.config;
                var bundleName = config.ivy ? 'ivy.js' : 'language-service.js';
                plugin = require("./bundles/" + bundleName)(tsModule);
                return plugin.create(info);
            },
            getExternalFiles: function (project) {
                var _a, _b;
                return (_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.getExternalFiles) === null || _a === void 0 ? void 0 : _a.call(plugin, project)) !== null && _b !== void 0 ? _b : [];
            },
            onConfigurationChanged: function (config) {
                var _a;
                (_a = plugin === null || plugin === void 0 ? void 0 : plugin.onConfigurationChanged) === null || _a === void 0 ? void 0 : _a.call(plugin, config);
            },
        };
    };
    module.exports = factory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHdFQUFzQjtJQU90QixJQUFNLE9BQU8sR0FBa0MsVUFBQyxRQUFRO1FBQ3RELElBQUksTUFBb0IsQ0FBQztRQUV6QixPQUFPO1lBQ0wsTUFBTSxFQUFOLFVBQU8sSUFBZ0M7Z0JBQ3JDLElBQU0sTUFBTSxHQUFpQixJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO2dCQUNqRSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWEsVUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDO1lBQ0QsZ0JBQWdCLEVBQWhCLFVBQWlCLE9BQTBCOztnQkFDekMsbUJBQU8sTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLGdCQUFnQiwrQ0FBeEIsTUFBTSxFQUFxQixPQUFPLG9DQUFLLEVBQUUsQ0FBQztZQUNuRCxDQUFDO1lBQ0Qsc0JBQXNCLEVBQXRCLFVBQXVCLE1BQW9COztnQkFDekMsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsc0JBQXNCLCtDQUE5QixNQUFNLEVBQTJCLE1BQU0sRUFBRTtZQUMzQyxDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5pbXBvcnQge05nTGFuZ3VhZ2VTZXJ2aWNlLCBQbHVnaW5Db25maWd9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0ICogZnJvbSAnLi9hcGknO1xuXG5pbnRlcmZhY2UgUGx1Z2luTW9kdWxlIGV4dGVuZHMgdHMuc2VydmVyLlBsdWdpbk1vZHVsZSB7XG4gIGNyZWF0ZShjcmVhdGVJbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlO1xuICBvbkNvbmZpZ3VyYXRpb25DaGFuZ2VkPyhjb25maWc6IFBsdWdpbkNvbmZpZyk6IHZvaWQ7XG59XG5cbmNvbnN0IGZhY3Rvcnk6IHRzLnNlcnZlci5QbHVnaW5Nb2R1bGVGYWN0b3J5ID0gKHRzTW9kdWxlKTogUGx1Z2luTW9kdWxlID0+IHtcbiAgbGV0IHBsdWdpbjogUGx1Z2luTW9kdWxlO1xuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlKGluZm86IHRzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogTmdMYW5ndWFnZVNlcnZpY2Uge1xuICAgICAgY29uc3QgY29uZmlnOiBQbHVnaW5Db25maWcgPSBpbmZvLmNvbmZpZztcbiAgICAgIGNvbnN0IGJ1bmRsZU5hbWUgPSBjb25maWcuaXZ5ID8gJ2l2eS5qcycgOiAnbGFuZ3VhZ2Utc2VydmljZS5qcyc7XG4gICAgICBwbHVnaW4gPSByZXF1aXJlKGAuL2J1bmRsZXMvJHtidW5kbGVOYW1lfWApKHRzTW9kdWxlKTtcbiAgICAgIHJldHVybiBwbHVnaW4uY3JlYXRlKGluZm8pO1xuICAgIH0sXG4gICAgZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6IHN0cmluZ1tdIHtcbiAgICAgIHJldHVybiBwbHVnaW4/LmdldEV4dGVybmFsRmlsZXM/Lihwcm9qZWN0KSA/PyBbXTtcbiAgICB9LFxuICAgIG9uQ29uZmlndXJhdGlvbkNoYW5nZWQoY29uZmlnOiBQbHVnaW5Db25maWcpOiB2b2lkIHtcbiAgICAgIHBsdWdpbj8ub25Db25maWd1cmF0aW9uQ2hhbmdlZD8uKGNvbmZpZyk7XG4gICAgfSxcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeTtcbiJdfQ==