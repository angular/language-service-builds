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
        define("@angular/language-service/common/ts_utils", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getClassDeclOfInlineTemplateNode = exports.getClassDeclFromDecoratorProp = exports.getPropertyAssignmentFromValue = exports.findTightestNode = void 0;
    var ts = require("typescript");
    /**
     * Return the node that most tightly encompass the specified `position`.
     * @param node
     * @param position
     */
    function findTightestNode(node, position) {
        if (node.getStart() <= position && position < node.getEnd()) {
            return node.forEachChild(function (c) { return findTightestNode(c, position); }) || node;
        }
    }
    exports.findTightestNode = findTightestNode;
    /**
     * Returns a property assignment from the assignment value if the property name
     * matches the specified `key`, or `undefined` if there is no match.
     */
    function getPropertyAssignmentFromValue(value, key) {
        var propAssignment = value.parent;
        if (!propAssignment || !ts.isPropertyAssignment(propAssignment) ||
            propAssignment.name.getText() !== key) {
            return;
        }
        return propAssignment;
    }
    exports.getPropertyAssignmentFromValue = getPropertyAssignmentFromValue;
    /**
     * Given a decorator property assignment, return the ClassDeclaration node that corresponds to the
     * directive class the property applies to.
     * If the property assignment is not on a class decorator, no declaration is returned.
     *
     * For example,
     *
     * @Component({
     *   template: '<div></div>'
     *   ^^^^^^^^^^^^^^^^^^^^^^^---- property assignment
     * })
     * class AppComponent {}
     *           ^---- class declaration node
     *
     * @param propAsgnNode property assignment
     */
    function getClassDeclFromDecoratorProp(propAsgnNode) {
        if (!propAsgnNode.parent || !ts.isObjectLiteralExpression(propAsgnNode.parent)) {
            return;
        }
        var objLitExprNode = propAsgnNode.parent;
        if (!objLitExprNode.parent || !ts.isCallExpression(objLitExprNode.parent)) {
            return;
        }
        var callExprNode = objLitExprNode.parent;
        if (!callExprNode.parent || !ts.isDecorator(callExprNode.parent)) {
            return;
        }
        var decorator = callExprNode.parent;
        if (!decorator.parent || !ts.isClassDeclaration(decorator.parent)) {
            return;
        }
        var classDeclNode = decorator.parent;
        return classDeclNode;
    }
    exports.getClassDeclFromDecoratorProp = getClassDeclFromDecoratorProp;
    /**
     * Given the node which is the string of the inline template for a component, returns the
     * `ts.ClassDeclaration` for the component.
     */
    function getClassDeclOfInlineTemplateNode(templateStringNode) {
        if (!ts.isStringLiteralLike(templateStringNode)) {
            return;
        }
        var tmplAsgn = getPropertyAssignmentFromValue(templateStringNode, 'template');
        if (!tmplAsgn) {
            return;
        }
        return getClassDeclFromDecoratorProp(tmplAsgn);
    }
    exports.getClassDeclOfInlineTemplateNode = getClassDeclOfInlineTemplateNode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2NvbW1vbi90c191dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakM7Ozs7T0FJRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWEsRUFBRSxRQUFnQjtRQUM5RCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMzRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEVBQTdCLENBQTZCLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDdEU7SUFDSCxDQUFDO0lBSkQsNENBSUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQiw4QkFBOEIsQ0FBQyxLQUFjLEVBQUUsR0FBVztRQUV4RSxJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3BDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDO1lBQzNELGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssR0FBRyxFQUFFO1lBQ3pDLE9BQU87U0FDUjtRQUNELE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFSRCx3RUFRQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7T0FlRztJQUNILFNBQWdCLDZCQUE2QixDQUFDLFlBQW1DO1FBRS9FLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5RSxPQUFPO1NBQ1I7UUFDRCxJQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6RSxPQUFPO1NBQ1I7UUFDRCxJQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEUsT0FBTztTQUNSO1FBQ0QsSUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakUsT0FBTztTQUNSO1FBQ0QsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUN2QyxPQUFPLGFBQWEsQ0FBQztJQUN2QixDQUFDO0lBbkJELHNFQW1CQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGdDQUFnQyxDQUFDLGtCQUEyQjtRQUUxRSxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDL0MsT0FBTztTQUNSO1FBQ0QsSUFBTSxRQUFRLEdBQUcsOEJBQThCLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNiLE9BQU87U0FDUjtRQUNELE9BQU8sNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQVZELDRFQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIFJldHVybiB0aGUgbm9kZSB0aGF0IG1vc3QgdGlnaHRseSBlbmNvbXBhc3MgdGhlIHNwZWNpZmllZCBgcG9zaXRpb25gLlxuICogQHBhcmFtIG5vZGVcbiAqIEBwYXJhbSBwb3NpdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFRpZ2h0ZXN0Tm9kZShub2RlOiB0cy5Ob2RlLCBwb3NpdGlvbjogbnVtYmVyKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICBpZiAobm9kZS5nZXRTdGFydCgpIDw9IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgbm9kZS5nZXRFbmQoKSkge1xuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChjID0+IGZpbmRUaWdodGVzdE5vZGUoYywgcG9zaXRpb24pKSB8fCBub2RlO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHByb3BlcnR5IGFzc2lnbm1lbnQgZnJvbSB0aGUgYXNzaWdubWVudCB2YWx1ZSBpZiB0aGUgcHJvcGVydHkgbmFtZVxuICogbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIGBrZXlgLCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBpcyBubyBtYXRjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5QXNzaWdubWVudEZyb21WYWx1ZSh2YWx1ZTogdHMuTm9kZSwga2V5OiBzdHJpbmcpOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnR8XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgcHJvcEFzc2lnbm1lbnQgPSB2YWx1ZS5wYXJlbnQ7XG4gIGlmICghcHJvcEFzc2lnbm1lbnQgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BBc3NpZ25tZW50KSB8fFxuICAgICAgcHJvcEFzc2lnbm1lbnQubmFtZS5nZXRUZXh0KCkgIT09IGtleSkge1xuICAgIHJldHVybjtcbiAgfVxuICByZXR1cm4gcHJvcEFzc2lnbm1lbnQ7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBkZWNvcmF0b3IgcHJvcGVydHkgYXNzaWdubWVudCwgcmV0dXJuIHRoZSBDbGFzc0RlY2xhcmF0aW9uIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGVcbiAqIGRpcmVjdGl2ZSBjbGFzcyB0aGUgcHJvcGVydHkgYXBwbGllcyB0by5cbiAqIElmIHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG5vdCBvbiBhIGNsYXNzIGRlY29yYXRvciwgbm8gZGVjbGFyYXRpb24gaXMgcmV0dXJuZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsXG4gKlxuICogQENvbXBvbmVudCh7XG4gKiAgIHRlbXBsYXRlOiAnPGRpdj48L2Rpdj4nXG4gKiAgIF5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eLS0tLSBwcm9wZXJ0eSBhc3NpZ25tZW50XG4gKiB9KVxuICogY2xhc3MgQXBwQ29tcG9uZW50IHt9XG4gKiAgICAgICAgICAgXi0tLS0gY2xhc3MgZGVjbGFyYXRpb24gbm9kZVxuICpcbiAqIEBwYXJhbSBwcm9wQXNnbk5vZGUgcHJvcGVydHkgYXNzaWdubWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AocHJvcEFzZ25Ob2RlOiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpOlxuICAgIHRzLkNsYXNzRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgaWYgKCFwcm9wQXNnbk5vZGUucGFyZW50IHx8ICF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BBc2duTm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG9iakxpdEV4cHJOb2RlID0gcHJvcEFzZ25Ob2RlLnBhcmVudDtcbiAgaWYgKCFvYmpMaXRFeHByTm9kZS5wYXJlbnQgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob2JqTGl0RXhwck5vZGUucGFyZW50KSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjYWxsRXhwck5vZGUgPSBvYmpMaXRFeHByTm9kZS5wYXJlbnQ7XG4gIGlmICghY2FsbEV4cHJOb2RlLnBhcmVudCB8fCAhdHMuaXNEZWNvcmF0b3IoY2FsbEV4cHJOb2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgZGVjb3JhdG9yID0gY2FsbEV4cHJOb2RlLnBhcmVudDtcbiAgaWYgKCFkZWNvcmF0b3IucGFyZW50IHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjb3JhdG9yLnBhcmVudCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2xhc3NEZWNsTm9kZSA9IGRlY29yYXRvci5wYXJlbnQ7XG4gIHJldHVybiBjbGFzc0RlY2xOb2RlO1xufVxuXG4vKipcbiAqIEdpdmVuIHRoZSBub2RlIHdoaWNoIGlzIHRoZSBzdHJpbmcgb2YgdGhlIGlubGluZSB0ZW1wbGF0ZSBmb3IgYSBjb21wb25lbnQsIHJldHVybnMgdGhlXG4gKiBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgZm9yIHRoZSBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc0RlY2xPZklubGluZVRlbXBsYXRlTm9kZSh0ZW1wbGF0ZVN0cmluZ05vZGU6IHRzLk5vZGUpOiB0cy5DbGFzc0RlY2xhcmF0aW9ufFxuICAgIHVuZGVmaW5lZCB7XG4gIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsTGlrZSh0ZW1wbGF0ZVN0cmluZ05vZGUpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRtcGxBc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKHRlbXBsYXRlU3RyaW5nTm9kZSwgJ3RlbXBsYXRlJyk7XG4gIGlmICghdG1wbEFzZ24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIGdldENsYXNzRGVjbEZyb21EZWNvcmF0b3JQcm9wKHRtcGxBc2duKTtcbn1cbiJdfQ==