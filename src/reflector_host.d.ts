import { CompilerHost, CompilerOptions } from '@angular/compiler-cli/src/language_services';
import * as ts from 'typescript';
export declare class ReflectorHost extends CompilerHost {
    private getProgram;
    constructor(getProgram: () => ts.Program, serviceHost: ts.LanguageServiceHost, options: CompilerOptions);
    protected program: ts.Program;
}
