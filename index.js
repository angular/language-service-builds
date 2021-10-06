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
                plugin = require("./bundles/language-service.js")(tsModule);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7SUFVSCxJQUFNLE9BQU8sR0FBa0MsVUFBQyxRQUFRO1FBQ3RELElBQUksTUFBb0IsQ0FBQztRQUV6QixPQUFPO1lBQ0wsTUFBTSxFQUFOLFVBQU8sSUFBZ0M7Z0JBQ3JDLE1BQU0sR0FBRyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDNUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLENBQUM7WUFDRCxnQkFBZ0IsRUFBaEIsVUFBaUIsT0FBMEI7O2dCQUN6QyxPQUFPLE1BQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsZ0JBQWdCLCtDQUF4QixNQUFNLEVBQXFCLE9BQU8sQ0FBQyxtQ0FBSSxFQUFFLENBQUM7WUFDbkQsQ0FBQztZQUNELHNCQUFzQixFQUF0QixVQUF1QixNQUFvQjs7Z0JBQ3pDLE1BQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLHNCQUFzQiwrQ0FBOUIsTUFBTSxFQUEyQixNQUFNLENBQUMsQ0FBQztZQUMzQyxDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQztJQU9GLE9BQVMsT0FBTyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5pbXBvcnQge05nTGFuZ3VhZ2VTZXJ2aWNlLCBQbHVnaW5Db25maWd9IGZyb20gJy4vYXBpJztcblxuaW50ZXJmYWNlIFBsdWdpbk1vZHVsZSBleHRlbmRzIHRzLnNlcnZlci5QbHVnaW5Nb2R1bGUge1xuICBjcmVhdGUoY3JlYXRlSW5mbzogdHMuc2VydmVyLlBsdWdpbkNyZWF0ZUluZm8pOiBOZ0xhbmd1YWdlU2VydmljZTtcbiAgb25Db25maWd1cmF0aW9uQ2hhbmdlZD8oY29uZmlnOiBQbHVnaW5Db25maWcpOiB2b2lkO1xufVxuXG5jb25zdCBmYWN0b3J5OiB0cy5zZXJ2ZXIuUGx1Z2luTW9kdWxlRmFjdG9yeSA9ICh0c01vZHVsZSk6IFBsdWdpbk1vZHVsZSA9PiB7XG4gIGxldCBwbHVnaW46IFBsdWdpbk1vZHVsZTtcblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlIHtcbiAgICAgIHBsdWdpbiA9IHJlcXVpcmUoYC4vYnVuZGxlcy9sYW5ndWFnZS1zZXJ2aWNlLmpzYCkodHNNb2R1bGUpO1xuICAgICAgcmV0dXJuIHBsdWdpbi5jcmVhdGUoaW5mbyk7XG4gICAgfSxcbiAgICBnZXRFeHRlcm5hbEZpbGVzKHByb2plY3Q6IHRzLnNlcnZlci5Qcm9qZWN0KTogc3RyaW5nW10ge1xuICAgICAgcmV0dXJuIHBsdWdpbj8uZ2V0RXh0ZXJuYWxGaWxlcz8uKHByb2plY3QpID8/IFtdO1xuICAgIH0sXG4gICAgb25Db25maWd1cmF0aW9uQ2hhbmdlZChjb25maWc6IFBsdWdpbkNvbmZpZyk6IHZvaWQge1xuICAgICAgcGx1Z2luPy5vbkNvbmZpZ3VyYXRpb25DaGFuZ2VkPy4oY29uZmlnKTtcbiAgICB9LFxuICB9O1xufTtcblxuLyoqXG4gKiBUc3NlcnZlciBleHBlY3RzIGBAYW5ndWxhci9sYW5ndWFnZS1zZXJ2aWNlYCB0byBwcm92aWRlIGEgZmFjdG9yeSBmdW5jdGlvblxuICogYXMgdGhlIGRlZmF1bHQgZXhwb3J0IG9mIHRoZSBwYWNrYWdlLiBTZWVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL2Y0ZDBlYTY1MzllZGI2ZDhmNzBiNjI2MTMyZDZmOWFjMWFjNDI4MWEvc3JjL3NlcnZlci9wcm9qZWN0LnRzI0wxNjExXG4gKi9cbmV4cG9ydCA9IGZhY3Rvcnk7XG4iXX0=