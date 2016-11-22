import { LanguageServicePlugin } from './src/ts_plugin';
export { createLanguageService } from './src/language_service';
export { Completion, Completions, Declaration, Declarations, Definition, Diagnostic, Diagnostics, Hover, HoverTextSection, LanguageService, LanguageServiceHost, Location, Span, TemplateSource, TemplateSources } from './src/types';
export { TypeScriptServiceHost, createLanguageServiceFromTypescript } from './src/typescript_host';
export default LanguageServicePlugin;
