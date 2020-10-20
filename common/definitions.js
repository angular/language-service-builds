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
        define("@angular/language-service/common/definitions", ["require", "exports", "typescript", "@angular/language-service/common/ts_utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTsDefinitionAndBoundSpan = void 0;
    var ts = require("typescript");
    var ts_utils_1 = require("@angular/language-service/common/ts_utils");
    /**
     * Gets an Angular-specific definition in a TypeScript source file.
     */
    function getTsDefinitionAndBoundSpan(sf, position, resourceResolver) {
        var node = ts_utils_1.findTightestNode(sf, position);
        if (!node)
            return;
        switch (node.kind) {
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                // Attempt to extract definition of a URL in a property assignment.
                return getUrlFromProperty(node, resourceResolver);
            default:
                return undefined;
        }
    }
    exports.getTsDefinitionAndBoundSpan = getTsDefinitionAndBoundSpan;
    /**
     * Attempts to get the definition of a file whose URL is specified in a property assignment in a
     * directive decorator.
     * Currently applies to `templateUrl` and `styleUrls` properties.
     */
    function getUrlFromProperty(urlNode, resourceResolver) {
        // Get the property assignment node corresponding to the `templateUrl` or `styleUrls` assignment.
        // These assignments are specified differently; `templateUrl` is a string, and `styleUrls` is
        // an array of strings:
        //   {
        //        templateUrl: './template.ng.html',
        //        styleUrls: ['./style.css', './other-style.css']
        //   }
        // `templateUrl`'s property assignment can be found from the string literal node;
        // `styleUrls`'s property assignment can be found from the array (parent) node.
        //
        // First search for `templateUrl`.
        var asgn = ts_utils_1.getPropertyAssignmentFromValue(urlNode, 'templateUrl');
        if (!asgn) {
            // `templateUrl` assignment not found; search for `styleUrls` array assignment.
            asgn = ts_utils_1.getPropertyAssignmentFromValue(urlNode.parent, 'styleUrls');
            if (!asgn) {
                // Nothing found, bail.
                return;
            }
        }
        // If the property assignment is not a property of a class decorator, don't generate definitions
        // for it.
        if (!ts_utils_1.getClassDeclFromDecoratorProp(asgn)) {
            return;
        }
        var sf = urlNode.getSourceFile();
        var url;
        try {
            url = resourceResolver.resolve(urlNode.text, sf.fileName);
        }
        catch (_a) {
            // If the file does not exist, bail.
            return;
        }
        var templateDefinitions = [{
                kind: ts.ScriptElementKind.externalModuleName,
                name: url,
                containerKind: ts.ScriptElementKind.unknown,
                containerName: '',
                // Reading the template is expensive, so don't provide a preview.
                // TODO(ayazhafiz): Consider providing an actual span:
                //  1. We're likely to read the template anyway
                //  2. We could show just the first 100 chars or so
                textSpan: { start: 0, length: 0 },
                fileName: url,
            }];
        return {
            definitions: templateDefinitions,
            textSpan: {
                // Exclude opening and closing quotes in the url span.
                start: urlNode.getStart() + 1,
                length: urlNode.getWidth() - 2,
            },
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9sYW5ndWFnZS1zZXJ2aWNlL2NvbW1vbi9kZWZpbml0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsc0VBQTJHO0lBYzNHOztPQUVHO0lBQ0gsU0FBZ0IsMkJBQTJCLENBQ3ZDLEVBQWlCLEVBQUUsUUFBZ0IsRUFDbkMsZ0JBQWtDO1FBQ3BDLElBQU0sSUFBSSxHQUFHLDJCQUFnQixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU87UUFDbEIsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLDZCQUE2QjtnQkFDOUMsbUVBQW1FO2dCQUNuRSxPQUFPLGtCQUFrQixDQUFDLElBQTRCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUM1RTtnQkFDRSxPQUFPLFNBQVMsQ0FBQztTQUNwQjtJQUNILENBQUM7SUFiRCxrRUFhQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLE9BQTZCLEVBQUUsZ0JBQWtDO1FBRTNGLGlHQUFpRztRQUNqRyw2RkFBNkY7UUFDN0YsdUJBQXVCO1FBQ3ZCLE1BQU07UUFDTiw0Q0FBNEM7UUFDNUMseURBQXlEO1FBQ3pELE1BQU07UUFDTixpRkFBaUY7UUFDakYsK0VBQStFO1FBQy9FLEVBQUU7UUFDRixrQ0FBa0M7UUFDbEMsSUFBSSxJQUFJLEdBQUcseUNBQThCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCwrRUFBK0U7WUFDL0UsSUFBSSxHQUFHLHlDQUE4QixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDVCx1QkFBdUI7Z0JBQ3ZCLE9BQU87YUFDUjtTQUNGO1FBRUQsZ0dBQWdHO1FBQ2hHLFVBQVU7UUFDVixJQUFJLENBQUMsd0NBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEMsT0FBTztTQUNSO1FBRUQsSUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLElBQUksR0FBVyxDQUFDO1FBQ2hCLElBQUk7WUFDRixHQUFHLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzNEO1FBQUMsV0FBTTtZQUNOLG9DQUFvQztZQUNwQyxPQUFPO1NBQ1I7UUFFRCxJQUFNLG1CQUFtQixHQUF3QixDQUFDO2dCQUNoRCxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQjtnQkFDN0MsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsYUFBYSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPO2dCQUMzQyxhQUFhLEVBQUUsRUFBRTtnQkFDakIsaUVBQWlFO2dCQUNqRSxzREFBc0Q7Z0JBQ3RELCtDQUErQztnQkFDL0MsbURBQW1EO2dCQUNuRCxRQUFRLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUM7Z0JBQy9CLFFBQVEsRUFBRSxHQUFHO2FBQ2QsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNMLFdBQVcsRUFBRSxtQkFBbUI7WUFDaEMsUUFBUSxFQUFFO2dCQUNSLHNEQUFzRDtnQkFDdEQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO2dCQUM3QixNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUM7YUFDL0I7U0FDRixDQUFDO0lBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtmaW5kVGlnaHRlc3ROb2RlLCBnZXRDbGFzc0RlY2xGcm9tRGVjb3JhdG9yUHJvcCwgZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlfSBmcm9tICcuL3RzX3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZVJlc29sdmVyIHtcbiAgLyoqXG4gICAqIFJlc29sdmUgdGhlIHVybCBvZiBhIHJlc291cmNlIHJlbGF0aXZlIHRvIHRoZSBmaWxlIHRoYXQgY29udGFpbnMgdGhlIHJlZmVyZW5jZSB0byBpdC5cbiAgICpcbiAgICogQHBhcmFtIGZpbGUgVGhlLCBwb3NzaWJseSByZWxhdGl2ZSwgdXJsIG9mIHRoZSByZXNvdXJjZS5cbiAgICogQHBhcmFtIGJhc2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBmaWxlIHRoYXQgY29udGFpbnMgdGhlIFVSTCBvZiB0aGUgcmVzb3VyY2UuXG4gICAqIEByZXR1cm5zIEEgcmVzb2x2ZWQgdXJsIG9mIHJlc291cmNlLlxuICAgKiBAdGhyb3dzIEFuIGVycm9yIGlmIHRoZSByZXNvdXJjZSBjYW5ub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICByZXNvbHZlKGZpbGU6IHN0cmluZywgYmFzZVBhdGg6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBHZXRzIGFuIEFuZ3VsYXItc3BlY2lmaWMgZGVmaW5pdGlvbiBpbiBhIFR5cGVTY3JpcHQgc291cmNlIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUc0RlZmluaXRpb25BbmRCb3VuZFNwYW4oXG4gICAgc2Y6IHRzLlNvdXJjZUZpbGUsIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgcmVzb3VyY2VSZXNvbHZlcjogUmVzb3VyY2VSZXNvbHZlcik6IHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIGNvbnN0IG5vZGUgPSBmaW5kVGlnaHRlc3ROb2RlKHNmLCBwb3NpdGlvbik7XG4gIGlmICghbm9kZSkgcmV0dXJuO1xuICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbDpcbiAgICAgIC8vIEF0dGVtcHQgdG8gZXh0cmFjdCBkZWZpbml0aW9uIG9mIGEgVVJMIGluIGEgcHJvcGVydHkgYXNzaWdubWVudC5cbiAgICAgIHJldHVybiBnZXRVcmxGcm9tUHJvcGVydHkobm9kZSBhcyB0cy5TdHJpbmdMaXRlcmFsTGlrZSwgcmVzb3VyY2VSZXNvbHZlcik7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBnZXQgdGhlIGRlZmluaXRpb24gb2YgYSBmaWxlIHdob3NlIFVSTCBpcyBzcGVjaWZpZWQgaW4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50IGluIGFcbiAqIGRpcmVjdGl2ZSBkZWNvcmF0b3IuXG4gKiBDdXJyZW50bHkgYXBwbGllcyB0byBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBwcm9wZXJ0aWVzLlxuICovXG5mdW5jdGlvbiBnZXRVcmxGcm9tUHJvcGVydHkodXJsTm9kZTogdHMuU3RyaW5nTGl0ZXJhbExpa2UsIHJlc291cmNlUmVzb2x2ZXI6IFJlc291cmNlUmVzb2x2ZXIpOlxuICAgIHRzLkRlZmluaXRpb25JbmZvQW5kQm91bmRTcGFufHVuZGVmaW5lZCB7XG4gIC8vIEdldCB0aGUgcHJvcGVydHkgYXNzaWdubWVudCBub2RlIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGB0ZW1wbGF0ZVVybGAgb3IgYHN0eWxlVXJsc2AgYXNzaWdubWVudC5cbiAgLy8gVGhlc2UgYXNzaWdubWVudHMgYXJlIHNwZWNpZmllZCBkaWZmZXJlbnRseTsgYHRlbXBsYXRlVXJsYCBpcyBhIHN0cmluZywgYW5kIGBzdHlsZVVybHNgIGlzXG4gIC8vIGFuIGFycmF5IG9mIHN0cmluZ3M6XG4gIC8vICAge1xuICAvLyAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3RlbXBsYXRlLm5nLmh0bWwnLFxuICAvLyAgICAgICAgc3R5bGVVcmxzOiBbJy4vc3R5bGUuY3NzJywgJy4vb3RoZXItc3R5bGUuY3NzJ11cbiAgLy8gICB9XG4gIC8vIGB0ZW1wbGF0ZVVybGAncyBwcm9wZXJ0eSBhc3NpZ25tZW50IGNhbiBiZSBmb3VuZCBmcm9tIHRoZSBzdHJpbmcgbGl0ZXJhbCBub2RlO1xuICAvLyBgc3R5bGVVcmxzYCdzIHByb3BlcnR5IGFzc2lnbm1lbnQgY2FuIGJlIGZvdW5kIGZyb20gdGhlIGFycmF5IChwYXJlbnQpIG5vZGUuXG4gIC8vXG4gIC8vIEZpcnN0IHNlYXJjaCBmb3IgYHRlbXBsYXRlVXJsYC5cbiAgbGV0IGFzZ24gPSBnZXRQcm9wZXJ0eUFzc2lnbm1lbnRGcm9tVmFsdWUodXJsTm9kZSwgJ3RlbXBsYXRlVXJsJyk7XG4gIGlmICghYXNnbikge1xuICAgIC8vIGB0ZW1wbGF0ZVVybGAgYXNzaWdubWVudCBub3QgZm91bmQ7IHNlYXJjaCBmb3IgYHN0eWxlVXJsc2AgYXJyYXkgYXNzaWdubWVudC5cbiAgICBhc2duID0gZ2V0UHJvcGVydHlBc3NpZ25tZW50RnJvbVZhbHVlKHVybE5vZGUucGFyZW50LCAnc3R5bGVVcmxzJyk7XG4gICAgaWYgKCFhc2duKSB7XG4gICAgICAvLyBOb3RoaW5nIGZvdW5kLCBiYWlsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIC8vIElmIHRoZSBwcm9wZXJ0eSBhc3NpZ25tZW50IGlzIG5vdCBhIHByb3BlcnR5IG9mIGEgY2xhc3MgZGVjb3JhdG9yLCBkb24ndCBnZW5lcmF0ZSBkZWZpbml0aW9uc1xuICAvLyBmb3IgaXQuXG4gIGlmICghZ2V0Q2xhc3NEZWNsRnJvbURlY29yYXRvclByb3AoYXNnbikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzZiA9IHVybE5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICBsZXQgdXJsOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgdXJsID0gcmVzb3VyY2VSZXNvbHZlci5yZXNvbHZlKHVybE5vZGUudGV4dCwgc2YuZmlsZU5hbWUpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBJZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCwgYmFpbC5cbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0ZW1wbGF0ZURlZmluaXRpb25zOiB0cy5EZWZpbml0aW9uSW5mb1tdID0gW3tcbiAgICBraW5kOiB0cy5TY3JpcHRFbGVtZW50S2luZC5leHRlcm5hbE1vZHVsZU5hbWUsXG4gICAgbmFtZTogdXJsLFxuICAgIGNvbnRhaW5lcktpbmQ6IHRzLlNjcmlwdEVsZW1lbnRLaW5kLnVua25vd24sXG4gICAgY29udGFpbmVyTmFtZTogJycsXG4gICAgLy8gUmVhZGluZyB0aGUgdGVtcGxhdGUgaXMgZXhwZW5zaXZlLCBzbyBkb24ndCBwcm92aWRlIGEgcHJldmlldy5cbiAgICAvLyBUT0RPKGF5YXpoYWZpeik6IENvbnNpZGVyIHByb3ZpZGluZyBhbiBhY3R1YWwgc3BhbjpcbiAgICAvLyAgMS4gV2UncmUgbGlrZWx5IHRvIHJlYWQgdGhlIHRlbXBsYXRlIGFueXdheVxuICAgIC8vICAyLiBXZSBjb3VsZCBzaG93IGp1c3QgdGhlIGZpcnN0IDEwMCBjaGFycyBvciBzb1xuICAgIHRleHRTcGFuOiB7c3RhcnQ6IDAsIGxlbmd0aDogMH0sXG4gICAgZmlsZU5hbWU6IHVybCxcbiAgfV07XG5cbiAgcmV0dXJuIHtcbiAgICBkZWZpbml0aW9uczogdGVtcGxhdGVEZWZpbml0aW9ucyxcbiAgICB0ZXh0U3Bhbjoge1xuICAgICAgLy8gRXhjbHVkZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHF1b3RlcyBpbiB0aGUgdXJsIHNwYW4uXG4gICAgICBzdGFydDogdXJsTm9kZS5nZXRTdGFydCgpICsgMSxcbiAgICAgIGxlbmd0aDogdXJsTm9kZS5nZXRXaWR0aCgpIC0gMixcbiAgICB9LFxuICB9O1xufVxuIl19