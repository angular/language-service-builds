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
        define("@angular/language-service", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
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
    return factory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7SUFVSCxJQUFNLE9BQU8sR0FBa0MsVUFBQyxRQUFRO1FBQ3RELElBQUksTUFBb0IsQ0FBQztRQUV6QixPQUFPO1lBQ0wsTUFBTSxFQUFOLFVBQU8sSUFBZ0M7Z0JBQ3JDLElBQU0sTUFBTSxHQUFpQixJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO2dCQUNqRSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWEsVUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDO1lBQ0QsZ0JBQWdCLEVBQWhCLFVBQWlCLE9BQTBCOztnQkFDekMsbUJBQU8sTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLGdCQUFnQiwrQ0FBeEIsTUFBTSxFQUFxQixPQUFPLG9DQUFLLEVBQUUsQ0FBQztZQUNuRCxDQUFDO1lBQ0Qsc0JBQXNCLEVBQXRCLFVBQXVCLE1BQW9COztnQkFDekMsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsc0JBQXNCLCtDQUE5QixNQUFNLEVBQTJCLE1BQU0sRUFBRTtZQUMzQyxDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQztJQU9GLE9BQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5pbXBvcnQge05nTGFuZ3VhZ2VTZXJ2aWNlLCBQbHVnaW5Db25maWd9IGZyb20gJy4vYXBpJztcblxuaW50ZXJmYWNlIFBsdWdpbk1vZHVsZSBleHRlbmRzIHRzLnNlcnZlci5QbHVnaW5Nb2R1bGUge1xuICBjcmVhdGUoY3JlYXRlSW5mbzogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiBOZ0xhbmd1YWdlU2VydmljZTtcbiAgb25Db25maWd1cmF0aW9uQ2hhbmdlZD8oY29uZmlnOiBQbHVnaW5Db25maWcpOiB2b2lkO1xufVxuXG5jb25zdCBmYWN0b3J5OiB0cy5zZXJ2ZXIuUGx1Z2luTW9kdWxlRmFjdG9yeSA9ICh0c01vZHVsZSk6IFBsdWdpbk1vZHVsZSA9PiB7XG4gIGxldCBwbHVnaW46IFBsdWdpbk1vZHVsZTtcblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgICAgIGNvbnN0IGNvbmZpZzogUGx1Z2luQ29uZmlnID0gaW5mby5jb25maWc7XG4gICAgICBjb25zdCBidW5kbGVOYW1lID0gY29uZmlnLml2eSA/ICdpdnkuanMnIDogJ2xhbmd1YWdlLXNlcnZpY2UuanMnO1xuICAgICAgcGx1Z2luID0gcmVxdWlyZShgLi9idW5kbGVzLyR7YnVuZGxlTmFtZX1gKSh0c01vZHVsZSk7XG4gICAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZShpbmZvKTtcbiAgICB9LFxuICAgIGdldEV4dGVybmFsRmlsZXMocHJvamVjdDogdHMuc2VydmVyLlByb2plY3QpOiBzdHJpbmdbXSB7XG4gICAgICByZXR1cm4gcGx1Z2luPy5nZXRFeHRlcm5hbEZpbGVzPy4ocHJvamVjdCkgPz8gW107XG4gICAgfSxcbiAgICBvbkNvbmZpZ3VyYXRpb25DaGFuZ2VkKGNvbmZpZzogUGx1Z2luQ29uZmlnKTogdm9pZCB7XG4gICAgICBwbHVnaW4/Lm9uQ29uZmlndXJhdGlvbkNoYW5nZWQ/Lihjb25maWcpO1xuICAgIH0sXG4gIH07XG59O1xuXG4vKipcbiAqIFRzc2VydmVyIGV4cGVjdHMgYEBhbmd1bGFyL2xhbmd1YWdlLXNlcnZpY2VgIHRvIHByb3ZpZGUgYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiBhcyB0aGUgZGVmYXVsdCBleHBvcnQgb2YgdGhlIHBhY2thZ2UuIFNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvZjRkMGVhNjUzOWVkYjZkOGY3MGI2MjYxMzJkNmY5YWMxYWM0MjgxYS9zcmMvc2VydmVyL3Byb2plY3QudHMjTDE2MTFcbiAqL1xuZXhwb3J0ID0gZmFjdG9yeTtcbiJdfQ==