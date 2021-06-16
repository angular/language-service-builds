"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const factory = (tsModule) => {
    let plugin;
    return {
        create(info) {
            const config = info.config;
            const bundleName = config.ivy ? 'ivy.js' : 'language-service.js';
            plugin = require(`./bundles/${bundleName}`)(tsModule);
            return plugin.create(info);
        },
        getExternalFiles(project) {
            var _a, _b;
            return (_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.getExternalFiles) === null || _a === void 0 ? void 0 : _a.call(plugin, project)) !== null && _b !== void 0 ? _b : [];
        },
        onConfigurationChanged(config) {
            var _a;
            (_a = plugin === null || plugin === void 0 ? void 0 : plugin.onConfigurationChanged) === null || _a === void 0 ? void 0 : _a.call(plugin, config);
        },
    };
};
module.exports = factory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7QUFVSCxNQUFNLE9BQU8sR0FBa0MsQ0FBQyxRQUFRLEVBQWdCLEVBQUU7SUFDeEUsSUFBSSxNQUFvQixDQUFDO0lBRXpCLE9BQU87UUFDTCxNQUFNLENBQUMsSUFBZ0M7WUFDckMsTUFBTSxNQUFNLEdBQWlCLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDekMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztZQUNqRSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0RCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUNELGdCQUFnQixDQUFDLE9BQTBCOztZQUN6QyxPQUFPLE1BQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsZ0JBQWdCLCtDQUF4QixNQUFNLEVBQXFCLE9BQU8sQ0FBQyxtQ0FBSSxFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUNELHNCQUFzQixDQUFDLE1BQW9COztZQUN6QyxNQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxzQkFBc0IsK0NBQTlCLE1BQU0sRUFBMkIsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDLENBQUM7QUFPRixpQkFBUyxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdC9saWIvdHNzZXJ2ZXJsaWJyYXJ5JztcbmltcG9ydCB7TmdMYW5ndWFnZVNlcnZpY2UsIFBsdWdpbkNvbmZpZ30gZnJvbSAnLi9hcGknO1xuXG5pbnRlcmZhY2UgUGx1Z2luTW9kdWxlIGV4dGVuZHMgdHMuc2VydmVyLlBsdWdpbk1vZHVsZSB7XG4gIGNyZWF0ZShjcmVhdGVJbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IE5nTGFuZ3VhZ2VTZXJ2aWNlO1xuICBvbkNvbmZpZ3VyYXRpb25DaGFuZ2VkPyhjb25maWc6IFBsdWdpbkNvbmZpZyk6IHZvaWQ7XG59XG5cbmNvbnN0IGZhY3Rvcnk6IHRzLnNlcnZlci5QbHVnaW5Nb2R1bGVGYWN0b3J5ID0gKHRzTW9kdWxlKTogUGx1Z2luTW9kdWxlID0+IHtcbiAgbGV0IHBsdWdpbjogUGx1Z2luTW9kdWxlO1xuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlKGluZm86IHRzLnNlcnZlci5QbHVnaW5DcmVhdGVJbmZvKTogTmdMYW5ndWFnZVNlcnZpY2Uge1xuICAgICAgY29uc3QgY29uZmlnOiBQbHVnaW5Db25maWcgPSBpbmZvLmNvbmZpZztcbiAgICAgIGNvbnN0IGJ1bmRsZU5hbWUgPSBjb25maWcuaXZ5ID8gJ2l2eS5qcycgOiAnbGFuZ3VhZ2Utc2VydmljZS5qcyc7XG4gICAgICBwbHVnaW4gPSByZXF1aXJlKGAuL2J1bmRsZXMvJHtidW5kbGVOYW1lfWApKHRzTW9kdWxlKTtcbiAgICAgIHJldHVybiBwbHVnaW4uY3JlYXRlKGluZm8pO1xuICAgIH0sXG4gICAgZ2V0RXh0ZXJuYWxGaWxlcyhwcm9qZWN0OiB0cy5zZXJ2ZXIuUHJvamVjdCk6IHN0cmluZ1tdIHtcbiAgICAgIHJldHVybiBwbHVnaW4/LmdldEV4dGVybmFsRmlsZXM/Lihwcm9qZWN0KSA/PyBbXTtcbiAgICB9LFxuICAgIG9uQ29uZmlndXJhdGlvbkNoYW5nZWQoY29uZmlnOiBQbHVnaW5Db25maWcpOiB2b2lkIHtcbiAgICAgIHBsdWdpbj8ub25Db25maWd1cmF0aW9uQ2hhbmdlZD8uKGNvbmZpZyk7XG4gICAgfSxcbiAgfTtcbn07XG5cbi8qKlxuICogVHNzZXJ2ZXIgZXhwZWN0cyBgQGFuZ3VsYXIvbGFuZ3VhZ2Utc2VydmljZWAgdG8gcHJvdmlkZSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIGFzIHRoZSBkZWZhdWx0IGV4cG9ydCBvZiB0aGUgcGFja2FnZS4gU2VlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi9mNGQwZWE2NTM5ZWRiNmQ4ZjcwYjYyNjEzMmQ2ZjlhYzFhYzQyODFhL3NyYy9zZXJ2ZXIvcHJvamVjdC50cyNMMTYxMVxuICovXG5leHBvcnQgPSBmYWN0b3J5O1xuIl19