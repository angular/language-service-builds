(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/language-service/ivy/ts_utils", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getParentClassDeclaration = exports.findTightestNode = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    /**
     * Return the node that most tightly encompasses the specified `position`.
     * @param node The starting node to start the top-down search.
     * @param position The target position within the `node`.
     */
    function findTightestNode(node, position) {
        var _a;
        if (node.getStart() <= position && position < node.getEnd()) {
            return (_a = node.forEachChild(function (c) { return findTightestNode(c, position); })) !== null && _a !== void 0 ? _a : node;
        }
        return undefined;
    }
    exports.findTightestNode = findTightestNode;
    function getParentClassDeclaration(startNode) {
        while (startNode) {
            if (ts.isClassDeclaration(startNode)) {
                return startNode;
            }
            startNode = startNode.parent;
        }
        return undefined;
    }
    exports.getParentClassDeclaration = getParentClassDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2l2eS90c191dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakM7Ozs7T0FJRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxRQUFnQjs7UUFDOUQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksUUFBUSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDM0QsYUFBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUE3QixDQUE2QixDQUFDLG1DQUFJLElBQUksQ0FBQztTQUN0RTtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFMRCw0Q0FLQztJQUVELFNBQWdCLHlCQUF5QixDQUFDLFNBQWtCO1FBQzFELE9BQU8sU0FBUyxFQUFFO1lBQ2hCLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQzlCO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQVJELDhEQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5vZGUgdGhhdCBtb3N0IHRpZ2h0bHkgZW5jb21wYXNzZXMgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICogQHBhcmFtIG5vZGUgVGhlIHN0YXJ0aW5nIG5vZGUgdG8gc3RhcnQgdGhlIHRvcC1kb3duIHNlYXJjaC5cbiAqIEBwYXJhbSBwb3NpdGlvbiBUaGUgdGFyZ2V0IHBvc2l0aW9uIHdpdGhpbiB0aGUgYG5vZGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFRpZ2h0ZXN0Tm9kZShub2RlOiB0cy5Ob2RlLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICBpZiAobm9kZS5nZXRTdGFydCgpIDw9IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgbm9kZS5nZXRFbmQoKSkge1xuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRUaWdodGVzdE5vZGUoYywgcG9zaXRpb24pKSA/PyBub2RlO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXJlbnRDbGFzc0RlY2xhcmF0aW9uKHN0YXJ0Tm9kZTogdHMuTm9kZSk6IHRzLkNsYXNzRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgd2hpbGUgKHN0YXJ0Tm9kZSkge1xuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RhcnROb2RlKSkge1xuICAgICAgcmV0dXJuIHN0YXJ0Tm9kZTtcbiAgICB9XG4gICAgc3RhcnROb2RlID0gc3RhcnROb2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufSJdfQ==