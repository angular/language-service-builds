/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/language-service/src/diagnostic_messages", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDiagnostic = exports.Diagnostic = void 0;
    var ts = require("typescript");
    exports.Diagnostic = {
        directive_not_in_module: {
            message: "%1 '%2' is not included in a module and will not be available inside a template. Consider adding it to a NgModule declaration.",
            kind: 'Suggestion',
        },
        missing_template_and_templateurl: {
            message: "Component '%1' must have a template or templateUrl",
            kind: 'Error',
        },
        both_template_and_templateurl: {
            message: "Component '%1' must not have both template and templateUrl",
            kind: 'Error',
        },
        invalid_templateurl: {
            message: "URL does not point to a valid file",
            kind: 'Error',
        },
        template_context_missing_member: {
            message: "The template context of '%1' does not define %2.\n" +
                "If the context type is a base type or 'any', consider refining it to a more specific type.",
            kind: 'Suggestion',
        },
        callable_expression_expected_method_call: {
            message: 'Unexpected callable expression. Expected a method call',
            kind: 'Warning',
        },
        call_target_not_callable: {
            message: "Call target '%1' has non-callable type '%2'.",
            kind: 'Error',
        },
        expression_might_be_null: {
            message: 'The expression might be null',
            kind: 'Error',
        },
        expected_a_number_type: {
            message: 'Expected a number type',
            kind: 'Error',
        },
        expected_a_string_or_number_type: {
            message: 'Expected operands to be a string or number type',
            kind: 'Error',
        },
        expected_operands_of_comparable_types_or_any: {
            message: 'Expected operands to be of comparable types or any',
            kind: 'Error',
        },
        unrecognized_operator: {
            message: 'Unrecognized operator %1',
            kind: 'Error',
        },
        unrecognized_primitive: {
            message: 'Unrecognized primitive %1',
            kind: 'Error',
        },
        no_pipe_found: {
            message: 'No pipe of name %1 found',
            kind: 'Error',
        },
        // TODO: Consider a better error message here.
        unable_to_resolve_compatible_call_signature: {
            message: 'Unable to resolve compatible call signature',
            kind: 'Error',
        },
        unable_to_resolve_signature: {
            message: 'Unable to resolve signature for call of %1',
            kind: 'Error',
        },
        could_not_resolve_type: {
            message: "Could not resolve the type of '%1'",
            kind: 'Error',
        },
        identifier_not_callable: {
            message: "'%1' is not callable",
            kind: 'Error',
        },
        identifier_possibly_undefined: {
            message: "'%1' is possibly undefined. Consider using the safe navigation operator (%2) or non-null assertion operator (%3).",
            kind: 'Suggestion',
        },
        identifier_not_defined_in_app_context: {
            message: "Identifier '%1' is not defined. The component declaration, template variable declarations, and element references do not contain such a member",
            kind: 'Error',
        },
        identifier_not_defined_on_receiver: {
            message: "Identifier '%1' is not defined. '%2' does not contain such a member",
            kind: 'Error',
        },
        identifier_is_private: {
            message: "Identifier '%1' refers to a private member of %2",
            kind: 'Warning',
        },
    };
    /**
     * Creates a language service diagnostic.
     * @param span location the diagnostic for
     * @param dm diagnostic message
     * @param formatArgs run-time arguments to format the diagnostic message with (see the messages in
     *        the `Diagnostic` object for an example).
     * @returns a created diagnostic
     */
    function createDiagnostic(span, dm) {
        var formatArgs = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            formatArgs[_i - 2] = arguments[_i];
        }
        // Formats "%1 %2" with formatArgs ['a', 'b'] as "a b"
        var formattedMessage = dm.message.replace(/%(\d+)/g, function (_, index) { return formatArgs[+index - 1]; });
        return {
            kind: ts.DiagnosticCategory[dm.kind],
            message: formattedMessage,
            span: span,
        };
    }
    exports.createDiagnostic = createDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY19tZXNzYWdlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2xhbmd1YWdlLXNlcnZpY2Uvc3JjL2RpYWdub3N0aWNfbWVzc2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBa0JwQixRQUFBLFVBQVUsR0FBOEM7UUFDbkUsdUJBQXVCLEVBQUU7WUFDdkIsT0FBTyxFQUNILGdJQUFnSTtZQUNwSSxJQUFJLEVBQUUsWUFBWTtTQUNuQjtRQUVELGdDQUFnQyxFQUFFO1lBQ2hDLE9BQU8sRUFBRSxvREFBb0Q7WUFDN0QsSUFBSSxFQUFFLE9BQU87U0FDZDtRQUVELDZCQUE2QixFQUFFO1lBQzdCLE9BQU8sRUFBRSw0REFBNEQ7WUFDckUsSUFBSSxFQUFFLE9BQU87U0FDZDtRQUVELG1CQUFtQixFQUFFO1lBQ25CLE9BQU8sRUFBRSxvQ0FBb0M7WUFDN0MsSUFBSSxFQUFFLE9BQU87U0FDZDtRQUVELCtCQUErQixFQUFFO1lBQy9CLE9BQU8sRUFBRSxvREFBb0Q7Z0JBQ3pELDRGQUE0RjtZQUNoRyxJQUFJLEVBQUUsWUFBWTtTQUNuQjtRQUVELHdDQUF3QyxFQUFFO1lBQ3hDLE9BQU8sRUFBRSx3REFBd0Q7WUFDakUsSUFBSSxFQUFFLFNBQVM7U0FDaEI7UUFFRCx3QkFBd0IsRUFBRTtZQUN4QixPQUFPLEVBQUUsOENBQThDO1lBQ3ZELElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCx3QkFBd0IsRUFBRTtZQUN4QixPQUFPLEVBQUUsOEJBQThCO1lBQ3ZDLElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCxzQkFBc0IsRUFBRTtZQUN0QixPQUFPLEVBQUUsd0JBQXdCO1lBQ2pDLElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCxnQ0FBZ0MsRUFBRTtZQUNoQyxPQUFPLEVBQUUsaURBQWlEO1lBQzFELElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCw0Q0FBNEMsRUFBRTtZQUM1QyxPQUFPLEVBQUUsb0RBQW9EO1lBQzdELElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCxxQkFBcUIsRUFBRTtZQUNyQixPQUFPLEVBQUUsMEJBQTBCO1lBQ25DLElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCxzQkFBc0IsRUFBRTtZQUN0QixPQUFPLEVBQUUsMkJBQTJCO1lBQ3BDLElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCxhQUFhLEVBQUU7WUFDYixPQUFPLEVBQUUsMEJBQTBCO1lBQ25DLElBQUksRUFBRSxPQUFPO1NBQ2Q7UUFFRCw4Q0FBOEM7UUFDOUMsMkNBQTJDLEVBQUU7WUFDM0MsT0FBTyxFQUFFLDZDQUE2QztZQUN0RCxJQUFJLEVBQUUsT0FBTztTQUNkO1FBRUQsMkJBQTJCLEVBQUU7WUFDM0IsT0FBTyxFQUFFLDRDQUE0QztZQUNyRCxJQUFJLEVBQUUsT0FBTztTQUNkO1FBRUQsc0JBQXNCLEVBQUU7WUFDdEIsT0FBTyxFQUFFLG9DQUFvQztZQUM3QyxJQUFJLEVBQUUsT0FBTztTQUNkO1FBRUQsdUJBQXVCLEVBQUU7WUFDdkIsT0FBTyxFQUFFLHNCQUFzQjtZQUMvQixJQUFJLEVBQUUsT0FBTztTQUNkO1FBRUQsNkJBQTZCLEVBQUU7WUFDN0IsT0FBTyxFQUNILG1IQUFtSDtZQUN2SCxJQUFJLEVBQUUsWUFBWTtTQUNuQjtRQUVELHFDQUFxQyxFQUFFO1lBQ3JDLE9BQU8sRUFDSCxnSkFBZ0o7WUFDcEosSUFBSSxFQUFFLE9BQU87U0FDZDtRQUVELGtDQUFrQyxFQUFFO1lBQ2xDLE9BQU8sRUFBRSxxRUFBcUU7WUFDOUUsSUFBSSxFQUFFLE9BQU87U0FDZDtRQUVELHFCQUFxQixFQUFFO1lBQ3JCLE9BQU8sRUFBRSxrREFBa0Q7WUFDM0QsSUFBSSxFQUFFLFNBQVM7U0FDaEI7S0FDRixDQUFDO0lBRUY7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixJQUFhLEVBQUUsRUFBcUI7UUFBRSxvQkFBdUI7YUFBdkIsVUFBdUIsRUFBdkIscUJBQXVCLEVBQXZCLElBQXVCO1lBQXZCLG1DQUF1Qjs7UUFDL0Qsc0RBQXNEO1FBQ3RELElBQU0sZ0JBQWdCLEdBQ2xCLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFDLENBQUMsRUFBRSxLQUFhLElBQUssT0FBQSxVQUFVLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQXRCLENBQXNCLENBQUMsQ0FBQztRQUNoRixPQUFPO1lBQ0wsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsSUFBSSxNQUFBO1NBQ0wsQ0FBQztJQUNKLENBQUM7SUFWRCw0Q0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljTWVzc2FnZSB7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAga2luZDoga2V5b2YgdHlwZW9mIHRzLkRpYWdub3N0aWNDYXRlZ29yeTtcbn1cblxudHlwZSBEaWFnbm9zdGljTmFtZSA9ICdkaXJlY3RpdmVfbm90X2luX21vZHVsZSd8J21pc3NpbmdfdGVtcGxhdGVfYW5kX3RlbXBsYXRldXJsJ3xcbiAgICAnYm90aF90ZW1wbGF0ZV9hbmRfdGVtcGxhdGV1cmwnfCdpbnZhbGlkX3RlbXBsYXRldXJsJ3wndGVtcGxhdGVfY29udGV4dF9taXNzaW5nX21lbWJlcid8XG4gICAgJ2NhbGxhYmxlX2V4cHJlc3Npb25fZXhwZWN0ZWRfbWV0aG9kX2NhbGwnfCdjYWxsX3RhcmdldF9ub3RfY2FsbGFibGUnfFxuICAgICdleHByZXNzaW9uX21pZ2h0X2JlX251bGwnfCdleHBlY3RlZF9hX251bWJlcl90eXBlJ3wnZXhwZWN0ZWRfYV9zdHJpbmdfb3JfbnVtYmVyX3R5cGUnfFxuICAgICdleHBlY3RlZF9vcGVyYW5kc19vZl9jb21wYXJhYmxlX3R5cGVzX29yX2FueSd8J3VucmVjb2duaXplZF9vcGVyYXRvcid8J3VucmVjb2duaXplZF9wcmltaXRpdmUnfFxuICAgICdub19waXBlX2ZvdW5kJ3wndW5hYmxlX3RvX3Jlc29sdmVfY29tcGF0aWJsZV9jYWxsX3NpZ25hdHVyZSd8J3VuYWJsZV90b19yZXNvbHZlX3NpZ25hdHVyZSd8XG4gICAgJ2NvdWxkX25vdF9yZXNvbHZlX3R5cGUnfCdpZGVudGlmaWVyX25vdF9jYWxsYWJsZSd8J2lkZW50aWZpZXJfcG9zc2libHlfdW5kZWZpbmVkJ3xcbiAgICAnaWRlbnRpZmllcl9ub3RfZGVmaW5lZF9pbl9hcHBfY29udGV4dCd8J2lkZW50aWZpZXJfbm90X2RlZmluZWRfb25fcmVjZWl2ZXInfFxuICAgICdpZGVudGlmaWVyX2lzX3ByaXZhdGUnO1xuXG5leHBvcnQgY29uc3QgRGlhZ25vc3RpYzogUmVjb3JkPERpYWdub3N0aWNOYW1lLCBEaWFnbm9zdGljTWVzc2FnZT4gPSB7XG4gIGRpcmVjdGl2ZV9ub3RfaW5fbW9kdWxlOiB7XG4gICAgbWVzc2FnZTpcbiAgICAgICAgYCUxICclMicgaXMgbm90IGluY2x1ZGVkIGluIGEgbW9kdWxlIGFuZCB3aWxsIG5vdCBiZSBhdmFpbGFibGUgaW5zaWRlIGEgdGVtcGxhdGUuIENvbnNpZGVyIGFkZGluZyBpdCB0byBhIE5nTW9kdWxlIGRlY2xhcmF0aW9uLmAsXG4gICAga2luZDogJ1N1Z2dlc3Rpb24nLFxuICB9LFxuXG4gIG1pc3NpbmdfdGVtcGxhdGVfYW5kX3RlbXBsYXRldXJsOiB7XG4gICAgbWVzc2FnZTogYENvbXBvbmVudCAnJTEnIG11c3QgaGF2ZSBhIHRlbXBsYXRlIG9yIHRlbXBsYXRlVXJsYCxcbiAgICBraW5kOiAnRXJyb3InLFxuICB9LFxuXG4gIGJvdGhfdGVtcGxhdGVfYW5kX3RlbXBsYXRldXJsOiB7XG4gICAgbWVzc2FnZTogYENvbXBvbmVudCAnJTEnIG11c3Qgbm90IGhhdmUgYm90aCB0ZW1wbGF0ZSBhbmQgdGVtcGxhdGVVcmxgLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgaW52YWxpZF90ZW1wbGF0ZXVybDoge1xuICAgIG1lc3NhZ2U6IGBVUkwgZG9lcyBub3QgcG9pbnQgdG8gYSB2YWxpZCBmaWxlYCxcbiAgICBraW5kOiAnRXJyb3InLFxuICB9LFxuXG4gIHRlbXBsYXRlX2NvbnRleHRfbWlzc2luZ19tZW1iZXI6IHtcbiAgICBtZXNzYWdlOiBgVGhlIHRlbXBsYXRlIGNvbnRleHQgb2YgJyUxJyBkb2VzIG5vdCBkZWZpbmUgJTIuXFxuYCArXG4gICAgICAgIGBJZiB0aGUgY29udGV4dCB0eXBlIGlzIGEgYmFzZSB0eXBlIG9yICdhbnknLCBjb25zaWRlciByZWZpbmluZyBpdCB0byBhIG1vcmUgc3BlY2lmaWMgdHlwZS5gLFxuICAgIGtpbmQ6ICdTdWdnZXN0aW9uJyxcbiAgfSxcblxuICBjYWxsYWJsZV9leHByZXNzaW9uX2V4cGVjdGVkX21ldGhvZF9jYWxsOiB7XG4gICAgbWVzc2FnZTogJ1VuZXhwZWN0ZWQgY2FsbGFibGUgZXhwcmVzc2lvbi4gRXhwZWN0ZWQgYSBtZXRob2QgY2FsbCcsXG4gICAga2luZDogJ1dhcm5pbmcnLFxuICB9LFxuXG4gIGNhbGxfdGFyZ2V0X25vdF9jYWxsYWJsZToge1xuICAgIG1lc3NhZ2U6IGBDYWxsIHRhcmdldCAnJTEnIGhhcyBub24tY2FsbGFibGUgdHlwZSAnJTInLmAsXG4gICAga2luZDogJ0Vycm9yJyxcbiAgfSxcblxuICBleHByZXNzaW9uX21pZ2h0X2JlX251bGw6IHtcbiAgICBtZXNzYWdlOiAnVGhlIGV4cHJlc3Npb24gbWlnaHQgYmUgbnVsbCcsXG4gICAga2luZDogJ0Vycm9yJyxcbiAgfSxcblxuICBleHBlY3RlZF9hX251bWJlcl90eXBlOiB7XG4gICAgbWVzc2FnZTogJ0V4cGVjdGVkIGEgbnVtYmVyIHR5cGUnLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgZXhwZWN0ZWRfYV9zdHJpbmdfb3JfbnVtYmVyX3R5cGU6IHtcbiAgICBtZXNzYWdlOiAnRXhwZWN0ZWQgb3BlcmFuZHMgdG8gYmUgYSBzdHJpbmcgb3IgbnVtYmVyIHR5cGUnLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgZXhwZWN0ZWRfb3BlcmFuZHNfb2ZfY29tcGFyYWJsZV90eXBlc19vcl9hbnk6IHtcbiAgICBtZXNzYWdlOiAnRXhwZWN0ZWQgb3BlcmFuZHMgdG8gYmUgb2YgY29tcGFyYWJsZSB0eXBlcyBvciBhbnknLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgdW5yZWNvZ25pemVkX29wZXJhdG9yOiB7XG4gICAgbWVzc2FnZTogJ1VucmVjb2duaXplZCBvcGVyYXRvciAlMScsXG4gICAga2luZDogJ0Vycm9yJyxcbiAgfSxcblxuICB1bnJlY29nbml6ZWRfcHJpbWl0aXZlOiB7XG4gICAgbWVzc2FnZTogJ1VucmVjb2duaXplZCBwcmltaXRpdmUgJTEnLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgbm9fcGlwZV9mb3VuZDoge1xuICAgIG1lc3NhZ2U6ICdObyBwaXBlIG9mIG5hbWUgJTEgZm91bmQnLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgLy8gVE9ETzogQ29uc2lkZXIgYSBiZXR0ZXIgZXJyb3IgbWVzc2FnZSBoZXJlLlxuICB1bmFibGVfdG9fcmVzb2x2ZV9jb21wYXRpYmxlX2NhbGxfc2lnbmF0dXJlOiB7XG4gICAgbWVzc2FnZTogJ1VuYWJsZSB0byByZXNvbHZlIGNvbXBhdGlibGUgY2FsbCBzaWduYXR1cmUnLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgdW5hYmxlX3RvX3Jlc29sdmVfc2lnbmF0dXJlOiB7XG4gICAgbWVzc2FnZTogJ1VuYWJsZSB0byByZXNvbHZlIHNpZ25hdHVyZSBmb3IgY2FsbCBvZiAlMScsXG4gICAga2luZDogJ0Vycm9yJyxcbiAgfSxcblxuICBjb3VsZF9ub3RfcmVzb2x2ZV90eXBlOiB7XG4gICAgbWVzc2FnZTogYENvdWxkIG5vdCByZXNvbHZlIHRoZSB0eXBlIG9mICclMSdgLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgaWRlbnRpZmllcl9ub3RfY2FsbGFibGU6IHtcbiAgICBtZXNzYWdlOiBgJyUxJyBpcyBub3QgY2FsbGFibGVgLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgaWRlbnRpZmllcl9wb3NzaWJseV91bmRlZmluZWQ6IHtcbiAgICBtZXNzYWdlOlxuICAgICAgICBgJyUxJyBpcyBwb3NzaWJseSB1bmRlZmluZWQuIENvbnNpZGVyIHVzaW5nIHRoZSBzYWZlIG5hdmlnYXRpb24gb3BlcmF0b3IgKCUyKSBvciBub24tbnVsbCBhc3NlcnRpb24gb3BlcmF0b3IgKCUzKS5gLFxuICAgIGtpbmQ6ICdTdWdnZXN0aW9uJyxcbiAgfSxcblxuICBpZGVudGlmaWVyX25vdF9kZWZpbmVkX2luX2FwcF9jb250ZXh0OiB7XG4gICAgbWVzc2FnZTpcbiAgICAgICAgYElkZW50aWZpZXIgJyUxJyBpcyBub3QgZGVmaW5lZC4gVGhlIGNvbXBvbmVudCBkZWNsYXJhdGlvbiwgdGVtcGxhdGUgdmFyaWFibGUgZGVjbGFyYXRpb25zLCBhbmQgZWxlbWVudCByZWZlcmVuY2VzIGRvIG5vdCBjb250YWluIHN1Y2ggYSBtZW1iZXJgLFxuICAgIGtpbmQ6ICdFcnJvcicsXG4gIH0sXG5cbiAgaWRlbnRpZmllcl9ub3RfZGVmaW5lZF9vbl9yZWNlaXZlcjoge1xuICAgIG1lc3NhZ2U6IGBJZGVudGlmaWVyICclMScgaXMgbm90IGRlZmluZWQuICclMicgZG9lcyBub3QgY29udGFpbiBzdWNoIGEgbWVtYmVyYCxcbiAgICBraW5kOiAnRXJyb3InLFxuICB9LFxuXG4gIGlkZW50aWZpZXJfaXNfcHJpdmF0ZToge1xuICAgIG1lc3NhZ2U6IGBJZGVudGlmaWVyICclMScgcmVmZXJzIHRvIGEgcHJpdmF0ZSBtZW1iZXIgb2YgJTJgLFxuICAgIGtpbmQ6ICdXYXJuaW5nJyxcbiAgfSxcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGxhbmd1YWdlIHNlcnZpY2UgZGlhZ25vc3RpYy5cbiAqIEBwYXJhbSBzcGFuIGxvY2F0aW9uIHRoZSBkaWFnbm9zdGljIGZvclxuICogQHBhcmFtIGRtIGRpYWdub3N0aWMgbWVzc2FnZVxuICogQHBhcmFtIGZvcm1hdEFyZ3MgcnVuLXRpbWUgYXJndW1lbnRzIHRvIGZvcm1hdCB0aGUgZGlhZ25vc3RpYyBtZXNzYWdlIHdpdGggKHNlZSB0aGUgbWVzc2FnZXMgaW5cbiAqICAgICAgICB0aGUgYERpYWdub3N0aWNgIG9iamVjdCBmb3IgYW4gZXhhbXBsZSkuXG4gKiBAcmV0dXJucyBhIGNyZWF0ZWQgZGlhZ25vc3RpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGlhZ25vc3RpYyhcbiAgICBzcGFuOiBuZy5TcGFuLCBkbTogRGlhZ25vc3RpY01lc3NhZ2UsIC4uLmZvcm1hdEFyZ3M6IHN0cmluZ1tdKTogbmcuRGlhZ25vc3RpYyB7XG4gIC8vIEZvcm1hdHMgXCIlMSAlMlwiIHdpdGggZm9ybWF0QXJncyBbJ2EnLCAnYiddIGFzIFwiYSBiXCJcbiAgY29uc3QgZm9ybWF0dGVkTWVzc2FnZSA9XG4gICAgICBkbS5tZXNzYWdlLnJlcGxhY2UoLyUoXFxkKykvZywgKF8sIGluZGV4OiBzdHJpbmcpID0+IGZvcm1hdEFyZ3NbK2luZGV4IC0gMV0pO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHRzLkRpYWdub3N0aWNDYXRlZ29yeVtkbS5raW5kXSxcbiAgICBtZXNzYWdlOiBmb3JtYXR0ZWRNZXNzYWdlLFxuICAgIHNwYW4sXG4gIH07XG59XG4iXX0=