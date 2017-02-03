/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CompilerHost, ModuleResolutionHostAdapter } from '@angular/compiler-cli';
class ReflectorModuleModuleResolutionHost {
    constructor(host) {
        this.host = host;
        if (host.directoryExists)
            this.directoryExists = directoryName => this.host.directoryExists(directoryName);
    }
    fileExists(fileName) { return !!this.host.getScriptSnapshot(fileName); }
    readFile(fileName) {
        let snapshot = this.host.getScriptSnapshot(fileName);
        if (snapshot) {
            return snapshot.getText(0, snapshot.getLength());
        }
    }
}
export class ReflectorHost extends CompilerHost {
    constructor(getProgram, serviceHost, options) {
        super(null, options, new ModuleResolutionHostAdapter(new ReflectorModuleModuleResolutionHost(serviceHost)));
        this.getProgram = getProgram;
    }
    get program() { return this.getProgram(); }
    set program(value) {
        // Discard the result set by ancestor constructor
    }
}
//# sourceMappingURL=reflector_host.js.map