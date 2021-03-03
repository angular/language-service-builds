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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHdFQUFzQjtJQU90QixJQUFNLE9BQU8sR0FBa0MsVUFBQyxRQUFRO1FBQ3RELElBQUksTUFBb0IsQ0FBQztRQUV6QixPQUFPO1lBQ0wsTUFBTSxFQUFOLFVBQU8sSUFBZ0M7Z0JBQ3JDLElBQU0sTUFBTSxHQUE0QixJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNwRCxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO2dCQUNqRSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWEsVUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDO1lBQ0QsZ0JBQWdCLEVBQWhCLFVBQWlCLE9BQTBCOztnQkFDekMsbUJBQU8sTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLGdCQUFnQiwrQ0FBeEIsTUFBTSxFQUFxQixPQUFPLG9DQUFLLEVBQUUsQ0FBQztZQUNuRCxDQUFDO1lBQ0Qsc0JBQXNCLEVBQXRCLFVBQXVCLE1BQStCOztnQkFDcEQsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsc0JBQXNCLCtDQUE5QixNQUFNLEVBQTJCLE1BQU0sRUFBRTtZQUMzQyxDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5pbXBvcnQge05nTGFuZ3VhZ2VTZXJ2aWNlLCBOZ0xhbmd1YWdlU2VydmljZUNvbmZpZ30gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgKiBmcm9tICcuL2FwaSc7XG5cbmludGVyZmFjZSBQbHVnaW5Nb2R1bGUgZXh0ZW5kcyB0cy5zZXJ2ZXIuUGx1Z2luTW9kdWxlIHtcbiAgY3JlYXRlKGNyZWF0ZUluZm86IHRzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogTmdMYW5ndWFnZVNlcnZpY2U7XG4gIG9uQ29uZmlndXJhdGlvbkNoYW5nZWQ/KGNvbmZpZzogTmdMYW5ndWFnZVNlcnZpY2VDb25maWcpOiB2b2lkO1xufVxuXG5jb25zdCBmYWN0b3J5OiB0cy5zZXJ2ZXIuUGx1Z2luTW9kdWxlRmFjdG9yeSA9ICh0c01vZHVsZSk6IFBsdWdpbk1vZHVsZSA9PiB7XG4gIGxldCBwbHVnaW46IFBsdWdpbk1vZHVsZTtcblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgICAgIGNvbnN0IGNvbmZpZzogTmdMYW5ndWFnZVNlcnZpY2VDb25maWcgPSBpbmZvLmNvbmZpZztcbiAgICAgIGNvbnN0IGJ1bmRsZU5hbWUgPSBjb25maWcuaXZ5ID8gJ2l2eS5qcycgOiAnbGFuZ3VhZ2Utc2VydmljZS5qcyc7XG4gICAgICBwbHVnaW4gPSByZXF1aXJlKGAuL2J1bmRsZXMvJHtidW5kbGVOYW1lfWApKHRzTW9kdWxlKTtcbiAgICAgIHJldHVybiBwbHVnaW4uY3JlYXRlKGluZm8pO1xuICAgIH0sXG4gICAgZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6IHN0cmluZ1tdIHtcbiAgICAgIHJldHVybiBwbHVnaW4/LmdldEV4dGVybmFsRmlsZXM/Lihwcm9qZWN0KSA/PyBbXTtcbiAgICB9LFxuICAgIG9uQ29uZmlndXJhdGlvbkNoYW5nZWQoY29uZmlnOiBOZ0xhbmd1YWdlU2VydmljZUNvbmZpZyk6IHZvaWQge1xuICAgICAgcGx1Z2luPy5vbkNvbmZpZ3VyYXRpb25DaGFuZ2VkPy4oY29uZmlnKTtcbiAgICB9LFxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5O1xuIl19