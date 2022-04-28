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
        define("@angular/language-service/override_rename_ts_plugin", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.factory = void 0;
    function isAngularCore(path) {
        return isExternalAngularCore(path) || isInternalAngularCore(path);
    }
    function isExternalAngularCore(path) {
        return path.endsWith('@angular/core/core.d.ts');
    }
    function isInternalAngularCore(path) {
        return path.endsWith('angular2/rc/packages/core/index.d.ts');
    }
    /**
     * This factory is used to disable the built-in rename provider,
     * see `packages/language-service/README.md#override-rename-ts-plugin` for more info.
     */
    const factory = () => {
        return {
            create(info) {
                const { project, languageService } = info;
                /** A map that indicates whether Angular could be found in the file's project. */
                const fileToIsInAngularProjectMap = new Map();
                return Object.assign(Object.assign({}, languageService), { getRenameInfo: (fileName, position) => {
                        let isInAngular;
                        if (fileToIsInAngularProjectMap.has(fileName)) {
                            isInAngular = fileToIsInAngularProjectMap.get(fileName);
                        }
                        else {
                            isInAngular = project.getFileNames().some(isAngularCore);
                            fileToIsInAngularProjectMap.set(fileName, isInAngular);
                        }
                        if (isInAngular) {
                            return {
                                canRename: false,
                                localizedErrorMessage: 'Delegating rename to the Angular Language Service.',
                            };
                        }
                        else {
                            return languageService.getRenameInfo(fileName, position);
                        }
                    } });
            }
        };
    };
    exports.factory = factory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnJpZGVfcmVuYW1lX3RzX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvb3ZlcnJpZGVfcmVuYW1lX3RzX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCxTQUFTLGFBQWEsQ0FBQyxJQUFZO1FBQ2pDLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsSUFBWTtRQUN6QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FBQyxJQUFZO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRDs7O09BR0c7SUFDSCxNQUFNLE9BQU8sR0FBa0MsR0FBMkIsRUFBRTtRQUMxRSxPQUFPO1lBQ0wsTUFBTSxDQUFDLElBQWdDO2dCQUNyQyxNQUFNLEVBQUMsT0FBTyxFQUFFLGVBQWUsRUFBQyxHQUFHLElBQUksQ0FBQztnQkFDeEMsaUZBQWlGO2dCQUNqRixNQUFNLDJCQUEyQixHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO2dCQUUvRCx1Q0FDSyxlQUFlLEtBQ2xCLGFBQWEsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRTt3QkFDcEMsSUFBSSxXQUFvQixDQUFDO3dCQUN6QixJQUFJLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTs0QkFDN0MsV0FBVyxHQUFHLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQzt5QkFDMUQ7NkJBQU07NEJBQ0wsV0FBVyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7NEJBQ3pELDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7eUJBQ3hEO3dCQUNELElBQUksV0FBVyxFQUFFOzRCQUNmLE9BQU87Z0NBQ0wsU0FBUyxFQUFFLEtBQUs7Z0NBQ2hCLHFCQUFxQixFQUFFLG9EQUFvRDs2QkFDNUUsQ0FBQzt5QkFDSDs2QkFBTTs0QkFDTCxPQUFPLGVBQWUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO3lCQUMxRDtvQkFDSCxDQUFDLElBQ0Q7WUFDSixDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVNLDBCQUFPIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQvbGliL3Rzc2VydmVybGlicmFyeSc7XG5cbmZ1bmN0aW9uIGlzQW5ndWxhckNvcmUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0V4dGVybmFsQW5ndWxhckNvcmUocGF0aCkgfHwgaXNJbnRlcm5hbEFuZ3VsYXJDb3JlKHBhdGgpO1xufVxuXG5mdW5jdGlvbiBpc0V4dGVybmFsQW5ndWxhckNvcmUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoLmVuZHNXaXRoKCdAYW5ndWxhci9jb3JlL2NvcmUuZC50cycpO1xufVxuXG5mdW5jdGlvbiBpc0ludGVybmFsQW5ndWxhckNvcmUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoLmVuZHNXaXRoKCdhbmd1bGFyMi9yYy9wYWNrYWdlcy9jb3JlL2luZGV4LmQudHMnKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZhY3RvcnkgaXMgdXNlZCB0byBkaXNhYmxlIHRoZSBidWlsdC1pbiByZW5hbWUgcHJvdmlkZXIsXG4gKiBzZWUgYHBhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2UvUkVBRE1FLm1kI292ZXJyaWRlLXJlbmFtZS10cy1wbHVnaW5gIGZvciBtb3JlIGluZm8uXG4gKi9cbmNvbnN0IGZhY3Rvcnk6IHRzLnNlcnZlci5QbHVnaW5Nb2R1bGVGYWN0b3J5ID0gKCk6IHRzLnNlcnZlci5QbHVnaW5Nb2R1bGUgPT4ge1xuICByZXR1cm4ge1xuICAgIGNyZWF0ZShpbmZvOiB0cy5zZXJ2ZXIuUGx1Z2luQ3JlYXRlSW5mbyk6IHRzLkxhbmd1YWdlU2VydmljZSB7XG4gICAgICBjb25zdCB7cHJvamVjdCwgbGFuZ3VhZ2VTZXJ2aWNlfSA9IGluZm87XG4gICAgICAvKiogQSBtYXAgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciBBbmd1bGFyIGNvdWxkIGJlIGZvdW5kIGluIHRoZSBmaWxlJ3MgcHJvamVjdC4gKi9cbiAgICAgIGNvbnN0IGZpbGVUb0lzSW5Bbmd1bGFyUHJvamVjdE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5sYW5ndWFnZVNlcnZpY2UsXG4gICAgICAgIGdldFJlbmFtZUluZm86IChmaWxlTmFtZSwgcG9zaXRpb24pID0+IHtcbiAgICAgICAgICBsZXQgaXNJbkFuZ3VsYXI6IGJvb2xlYW47XG4gICAgICAgICAgaWYgKGZpbGVUb0lzSW5Bbmd1bGFyUHJvamVjdE1hcC5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICBpc0luQW5ndWxhciA9IGZpbGVUb0lzSW5Bbmd1bGFyUHJvamVjdE1hcC5nZXQoZmlsZU5hbWUpITtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNJbkFuZ3VsYXIgPSBwcm9qZWN0LmdldEZpbGVOYW1lcygpLnNvbWUoaXNBbmd1bGFyQ29yZSk7XG4gICAgICAgICAgICBmaWxlVG9Jc0luQW5ndWxhclByb2plY3RNYXAuc2V0KGZpbGVOYW1lLCBpc0luQW5ndWxhcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc0luQW5ndWxhcikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgY2FuUmVuYW1lOiBmYWxzZSxcbiAgICAgICAgICAgICAgbG9jYWxpemVkRXJyb3JNZXNzYWdlOiAnRGVsZWdhdGluZyByZW5hbWUgdG8gdGhlIEFuZ3VsYXIgTGFuZ3VhZ2UgU2VydmljZS4nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGxhbmd1YWdlU2VydmljZS5nZXRSZW5hbWVJbmZvKGZpbGVOYW1lLCBwb3NpdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnQge2ZhY3Rvcnl9O1xuIl19