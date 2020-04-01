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
        define("@angular/language-service/src/typescript_symbols", ["require", "exports", "tslib", "path", "typescript", "@angular/language-service/src/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var symbols_1 = require("@angular/language-service/src/symbols");
    // In TypeScript 2.1 these flags moved
    // These helpers work for both 2.0 and 2.1.
    var isPrivate = ts.ModifierFlags ?
        (function (node) {
            return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private);
        }) :
        (function (node) { return !!(node.flags & ts.NodeFlags.Private); });
    var isReferenceType = ts.ObjectFlags ?
        (function (type) {
            return !!(type.flags & ts.TypeFlags.Object &&
                type.objectFlags & ts.ObjectFlags.Reference);
        }) :
        (function (type) { return !!(type.flags & ts.TypeFlags.Reference); });
    function getSymbolQuery(program, checker, source, fetchPipes) {
        return new TypeScriptSymbolQuery(program, checker, source, fetchPipes);
    }
    exports.getSymbolQuery = getSymbolQuery;
    function getClassMembers(program, checker, staticSymbol) {
        var declaration = getClassFromStaticSymbol(program, staticSymbol);
        if (declaration) {
            var type = checker.getTypeAtLocation(declaration);
            var node = program.getSourceFile(staticSymbol.filePath);
            if (node) {
                return new TypeWrapper(type, { node: node, program: program, checker: checker }).members();
            }
        }
    }
    exports.getClassMembers = getClassMembers;
    function getClassMembersFromDeclaration(program, checker, source, declaration) {
        var type = checker.getTypeAtLocation(declaration);
        return new TypeWrapper(type, { node: source, program: program, checker: checker }).members();
    }
    exports.getClassMembersFromDeclaration = getClassMembersFromDeclaration;
    function getClassFromStaticSymbol(program, type) {
        var source = program.getSourceFile(type.filePath);
        if (source) {
            return ts.forEachChild(source, function (child) {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    var classDeclaration = child;
                    if (classDeclaration.name != null && classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
        }
        return undefined;
    }
    exports.getClassFromStaticSymbol = getClassFromStaticSymbol;
    function getPipesTable(source, program, checker, pipes) {
        return new PipesTable(pipes, { program: program, checker: checker, node: source });
    }
    exports.getPipesTable = getPipesTable;
    var TypeScriptSymbolQuery = /** @class */ (function () {
        function TypeScriptSymbolQuery(program, checker, source, fetchPipes) {
            this.program = program;
            this.checker = checker;
            this.source = source;
            this.fetchPipes = fetchPipes;
            this.typeCache = new Map();
        }
        TypeScriptSymbolQuery.prototype.getTypeKind = function (symbol) {
            var type = symbol instanceof TypeWrapper ? symbol.tsType : undefined;
            return typeKindOf(type);
        };
        TypeScriptSymbolQuery.prototype.getBuiltinType = function (kind) {
            var result = this.typeCache.get(kind);
            if (!result) {
                var type = getTsTypeFromBuiltinType(kind, {
                    checker: this.checker,
                    node: this.source,
                    program: this.program,
                });
                result =
                    new TypeWrapper(type, { program: this.program, checker: this.checker, node: this.source });
                this.typeCache.set(kind, result);
            }
            return result;
        };
        TypeScriptSymbolQuery.prototype.getTypeUnion = function () {
            var types = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                types[_i] = arguments[_i];
            }
            // No API exists so return any if the types are not all the same type.
            var result = undefined;
            if (types.length) {
                result = types[0];
                for (var i = 1; i < types.length; i++) {
                    if (types[i] != result) {
                        result = undefined;
                        break;
                    }
                }
            }
            return result || this.getBuiltinType(symbols_1.BuiltinType.Any);
        };
        TypeScriptSymbolQuery.prototype.getArrayType = function (type) { return this.getBuiltinType(symbols_1.BuiltinType.Any); };
        TypeScriptSymbolQuery.prototype.getElementType = function (type) {
            if (type instanceof TypeWrapper) {
                var ty = type.tsType;
                var tyArgs = type.typeArguments();
                // TODO(ayazhafiz): Track https://github.com/microsoft/TypeScript/issues/37711 to expose
                // `isArrayLikeType` as a public method.
                if (!this.checker.isArrayLikeType(ty) || (tyArgs === null || tyArgs === void 0 ? void 0 : tyArgs.length) !== 1)
                    return;
                return tyArgs[0];
            }
        };
        TypeScriptSymbolQuery.prototype.getNonNullableType = function (symbol) {
            if (symbol instanceof TypeWrapper && (typeof this.checker.getNonNullableType == 'function')) {
                var tsType = symbol.tsType;
                var nonNullableType = this.checker.getNonNullableType(tsType);
                if (nonNullableType != tsType) {
                    return new TypeWrapper(nonNullableType, symbol.context);
                }
                else if (nonNullableType == tsType) {
                    return symbol;
                }
            }
            return this.getBuiltinType(symbols_1.BuiltinType.Any);
        };
        TypeScriptSymbolQuery.prototype.getPipes = function () {
            var result = this.pipesCache;
            if (!result) {
                result = this.pipesCache = this.fetchPipes();
            }
            return result;
        };
        TypeScriptSymbolQuery.prototype.getTemplateContext = function (type) {
            var context = { node: this.source, program: this.program, checker: this.checker };
            var typeSymbol = findClassSymbolInContext(type, context);
            if (typeSymbol) {
                var contextType = this.getTemplateRefContextType(typeSymbol, context);
                if (contextType)
                    return contextType.members();
            }
        };
        TypeScriptSymbolQuery.prototype.getTypeSymbol = function (type) {
            var context = { node: this.source, program: this.program, checker: this.checker };
            var typeSymbol = findClassSymbolInContext(type, context);
            return typeSymbol && new SymbolWrapper(typeSymbol, context);
        };
        TypeScriptSymbolQuery.prototype.createSymbolTable = function (symbols) {
            var result = new MapSymbolTable();
            result.addAll(symbols.map(function (s) { return new DeclaredSymbol(s); }));
            return result;
        };
        TypeScriptSymbolQuery.prototype.mergeSymbolTable = function (symbolTables) {
            var e_1, _a;
            var result = new MapSymbolTable();
            try {
                for (var symbolTables_1 = tslib_1.__values(symbolTables), symbolTables_1_1 = symbolTables_1.next(); !symbolTables_1_1.done; symbolTables_1_1 = symbolTables_1.next()) {
                    var symbolTable = symbolTables_1_1.value;
                    result.addAll(symbolTable.values());
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (symbolTables_1_1 && !symbolTables_1_1.done && (_a = symbolTables_1.return)) _a.call(symbolTables_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        };
        TypeScriptSymbolQuery.prototype.getSpanAt = function (line, column) {
            return spanAt(this.source, line, column);
        };
        TypeScriptSymbolQuery.prototype.getTemplateRefContextType = function (typeSymbol, context) {
            var e_2, _a;
            var type = this.checker.getTypeOfSymbolAtLocation(typeSymbol, this.source);
            var constructor = type.symbol && type.symbol.members &&
                getFromSymbolTable(type.symbol.members, '__constructor');
            if (constructor) {
                var constructorDeclaration = constructor.declarations[0];
                try {
                    for (var _b = tslib_1.__values(constructorDeclaration.parameters), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var parameter = _c.value;
                        var type_1 = this.checker.getTypeAtLocation(parameter.type);
                        if (type_1.symbol.name == 'TemplateRef' && isReferenceType(type_1)) {
                            var typeWrapper = new TypeWrapper(type_1, context);
                            var typeArguments = typeWrapper.typeArguments();
                            if (typeArguments && typeArguments.length === 1) {
                                return typeArguments[0];
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        };
        return TypeScriptSymbolQuery;
    }());
    function typeCallable(type) {
        var signatures = type.getCallSignatures();
        return signatures && signatures.length != 0;
    }
    function signaturesOf(type, context) {
        return type.getCallSignatures().map(function (s) { return new SignatureWrapper(s, context); });
    }
    function selectSignature(type, context, types) {
        // TODO: Do a better job of selecting the right signature. TypeScript does not currently support a
        // Type Relationship API (see https://github.com/angular/vscode-ng-language-service/issues/143).
        // Consider creating a TypeCheckBlock host in the language service that may also act as a
        // scratchpad for type comparisons.
        var signatures = type.getCallSignatures();
        return signatures.length ? new SignatureWrapper(signatures[0], context) : undefined;
    }
    var TypeWrapper = /** @class */ (function () {
        function TypeWrapper(tsType, context) {
            this.tsType = tsType;
            this.context = context;
            this.kind = 'type';
            this.language = 'typescript';
            this.type = undefined;
            this.container = undefined;
            this.public = true;
            if (!tsType) {
                throw Error('Internal: null type');
            }
        }
        Object.defineProperty(TypeWrapper.prototype, "name", {
            get: function () { return this.context.checker.typeToString(this.tsType); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeWrapper.prototype, "callable", {
            get: function () { return typeCallable(this.tsType); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeWrapper.prototype, "nullable", {
            get: function () {
                return this.context.checker.getNonNullableType(this.tsType) != this.tsType;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeWrapper.prototype, "documentation", {
            get: function () {
                var symbol = this.tsType.getSymbol();
                if (!symbol) {
                    return [];
                }
                return symbol.getDocumentationComment(this.context.checker);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeWrapper.prototype, "definition", {
            get: function () {
                var symbol = this.tsType.getSymbol();
                return symbol ? definitionFromTsSymbol(symbol) : undefined;
            },
            enumerable: true,
            configurable: true
        });
        TypeWrapper.prototype.members = function () {
            // Should call getApparentProperties() instead of getProperties() because
            // the former includes properties on the base class whereas the latter does
            // not. This provides properties like .bind(), .call(), .apply(), etc for
            // functions.
            return new SymbolTableWrapper(this.tsType.getApparentProperties(), this.context, this.tsType);
        };
        TypeWrapper.prototype.signatures = function () { return signaturesOf(this.tsType, this.context); };
        TypeWrapper.prototype.selectSignature = function (types) {
            return selectSignature(this.tsType, this.context, types);
        };
        TypeWrapper.prototype.indexed = function (type, value) {
            if (!(type instanceof TypeWrapper))
                return;
            var typeKind = typeKindOf(type.tsType);
            switch (typeKind) {
                case symbols_1.BuiltinType.Number:
                    var nType = this.tsType.getNumberIndexType();
                    if (nType) {
                        // get the right tuple type by value, like 'var t: [number, string];'
                        if (nType.isUnion()) {
                            // return undefined if array index out of bound.
                            return nType.types[value] && new TypeWrapper(nType.types[value], this.context);
                        }
                        return new TypeWrapper(nType, this.context);
                    }
                    return undefined;
                case symbols_1.BuiltinType.String:
                    var sType = this.tsType.getStringIndexType();
                    return sType && new TypeWrapper(sType, this.context);
            }
        };
        TypeWrapper.prototype.typeArguments = function () {
            var _this = this;
            if (!isReferenceType(this.tsType))
                return;
            var typeReference = this.tsType;
            var typeArguments;
            typeArguments = this.context.checker.getTypeArguments(typeReference);
            if (!typeArguments)
                return undefined;
            return typeArguments.map(function (ta) { return new TypeWrapper(ta, _this.context); });
        };
        return TypeWrapper;
    }());
    // If stringIndexType a primitive type(e.g. 'string'), the Symbol is undefined;
    // and in AstType.resolvePropertyRead method, the Symbol.type should get the right type.
    var StringIndexTypeWrapper = /** @class */ (function (_super) {
        tslib_1.__extends(StringIndexTypeWrapper, _super);
        function StringIndexTypeWrapper() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.type = new TypeWrapper(_this.tsType, _this.context);
            return _this;
        }
        return StringIndexTypeWrapper;
    }(TypeWrapper));
    var SymbolWrapper = /** @class */ (function () {
        function SymbolWrapper(symbol, 
        /** TypeScript type context of the symbol. */
        context, 
        /** Type of the TypeScript symbol, if known. If not provided, the type of the symbol
        * will be determined dynamically; see `SymbolWrapper#tsType`. */
        _tsType) {
            this.context = context;
            this._tsType = _tsType;
            this.nullable = false;
            this.language = 'typescript';
            this.symbol = symbol && context && (symbol.flags & ts.SymbolFlags.Alias) ?
                context.checker.getAliasedSymbol(symbol) :
                symbol;
        }
        Object.defineProperty(SymbolWrapper.prototype, "name", {
            get: function () { return this.symbol.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "kind", {
            get: function () { return this.callable ? 'method' : 'property'; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "type", {
            get: function () { return new TypeWrapper(this.tsType, this.context); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "container", {
            get: function () { return getContainerOf(this.symbol, this.context); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "public", {
            get: function () {
                // Symbols that are not explicitly made private are public.
                return !isSymbolPrivate(this.symbol);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "callable", {
            get: function () { return typeCallable(this.tsType); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "definition", {
            get: function () { return definitionFromTsSymbol(this.symbol); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "documentation", {
            get: function () {
                return this.symbol.getDocumentationComment(this.context.checker);
            },
            enumerable: true,
            configurable: true
        });
        SymbolWrapper.prototype.members = function () {
            if (!this._members) {
                if ((this.symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) != 0) {
                    var declaredType = this.context.checker.getDeclaredTypeOfSymbol(this.symbol);
                    var typeWrapper = new TypeWrapper(declaredType, this.context);
                    this._members = typeWrapper.members();
                }
                else {
                    this._members = new SymbolTableWrapper(this.symbol.members, this.context, this.tsType);
                }
            }
            return this._members;
        };
        SymbolWrapper.prototype.signatures = function () { return signaturesOf(this.tsType, this.context); };
        SymbolWrapper.prototype.selectSignature = function (types) {
            return selectSignature(this.tsType, this.context, types);
        };
        SymbolWrapper.prototype.indexed = function (argument) { return undefined; };
        SymbolWrapper.prototype.typeArguments = function () { return this.type.typeArguments(); };
        Object.defineProperty(SymbolWrapper.prototype, "tsType", {
            get: function () {
                var type = this._tsType;
                if (!type) {
                    type = this._tsType =
                        this.context.checker.getTypeOfSymbolAtLocation(this.symbol, this.context.node);
                }
                return type;
            },
            enumerable: true,
            configurable: true
        });
        return SymbolWrapper;
    }());
    var DeclaredSymbol = /** @class */ (function () {
        function DeclaredSymbol(declaration) {
            this.declaration = declaration;
            this.language = 'ng-template';
            this.nullable = false;
            this.public = true;
        }
        Object.defineProperty(DeclaredSymbol.prototype, "name", {
            get: function () { return this.declaration.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "kind", {
            get: function () { return this.declaration.kind; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "container", {
            get: function () { return undefined; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "type", {
            get: function () { return this.declaration.type; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "callable", {
            get: function () { return this.type.callable; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "definition", {
            get: function () { return this.declaration.definition; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "documentation", {
            get: function () { return this.declaration.type.documentation; },
            enumerable: true,
            configurable: true
        });
        DeclaredSymbol.prototype.members = function () { return this.type.members(); };
        DeclaredSymbol.prototype.signatures = function () { return this.type.signatures(); };
        DeclaredSymbol.prototype.selectSignature = function (types) { return this.type.selectSignature(types); };
        DeclaredSymbol.prototype.typeArguments = function () { return this.type.typeArguments(); };
        DeclaredSymbol.prototype.indexed = function (argument) { return undefined; };
        return DeclaredSymbol;
    }());
    var SignatureWrapper = /** @class */ (function () {
        function SignatureWrapper(signature, context) {
            this.signature = signature;
            this.context = context;
        }
        Object.defineProperty(SignatureWrapper.prototype, "arguments", {
            get: function () {
                return new SymbolTableWrapper(this.signature.getParameters(), this.context);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SignatureWrapper.prototype, "result", {
            get: function () { return new TypeWrapper(this.signature.getReturnType(), this.context); },
            enumerable: true,
            configurable: true
        });
        return SignatureWrapper;
    }());
    var SignatureResultOverride = /** @class */ (function () {
        function SignatureResultOverride(signature, resultType) {
            this.signature = signature;
            this.resultType = resultType;
        }
        Object.defineProperty(SignatureResultOverride.prototype, "arguments", {
            get: function () { return this.signature.arguments; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SignatureResultOverride.prototype, "result", {
            get: function () { return this.resultType; },
            enumerable: true,
            configurable: true
        });
        return SignatureResultOverride;
    }());
    function toSymbolTableFactory(symbols) {
        var e_3, _a;
        // ∀ Typescript version >= 2.2, `SymbolTable` is implemented as an ES6 `Map`
        var result = new Map();
        try {
            for (var symbols_2 = tslib_1.__values(symbols), symbols_2_1 = symbols_2.next(); !symbols_2_1.done; symbols_2_1 = symbols_2.next()) {
                var symbol = symbols_2_1.value;
                result.set(symbol.name, symbol);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (symbols_2_1 && !symbols_2_1.done && (_a = symbols_2.return)) _a.call(symbols_2);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return result;
    }
    exports.toSymbolTableFactory = toSymbolTableFactory;
    function toSymbols(symbolTable) {
        if (!symbolTable)
            return [];
        var table = symbolTable;
        if (typeof table.values === 'function') {
            return Array.from(table.values());
        }
        var result = [];
        var own = typeof table.hasOwnProperty === 'function' ?
            function (name) { return table.hasOwnProperty(name); } :
            function (name) { return !!table[name]; };
        for (var name_1 in table) {
            if (own(name_1)) {
                result.push(table[name_1]);
            }
        }
        return result;
    }
    var SymbolTableWrapper = /** @class */ (function () {
        /**
         * Creates a queryable table of symbols belonging to a TypeScript entity.
         * @param symbols symbols to query belonging to the entity
         * @param context program context
         * @param type original TypeScript type of entity owning the symbols, if known
         */
        function SymbolTableWrapper(symbols, context, type) {
            this.context = context;
            this.type = type;
            symbols = symbols || [];
            if (Array.isArray(symbols)) {
                this.symbols = symbols;
                this.symbolTable = toSymbolTableFactory(symbols);
            }
            else {
                this.symbols = toSymbols(symbols);
                this.symbolTable = symbols;
            }
            if (type) {
                this.stringIndexType = type.getStringIndexType();
            }
        }
        Object.defineProperty(SymbolTableWrapper.prototype, "size", {
            get: function () { return this.symbols.length; },
            enumerable: true,
            configurable: true
        });
        SymbolTableWrapper.prototype.get = function (key) {
            var symbol = getFromSymbolTable(this.symbolTable, key);
            if (symbol) {
                return new SymbolWrapper(symbol, this.context);
            }
            if (this.stringIndexType) {
                // If the key does not exist as an explicit symbol on the type, it may be accessing a string
                // index signature using dot notation:
                //
                //   const obj<T>: { [key: string]: T };
                //   obj.stringIndex // equivalent to obj['stringIndex'];
                //
                // In this case, return the type indexed by an arbitrary string key.
                return new StringIndexTypeWrapper(this.stringIndexType, this.context);
            }
            return undefined;
        };
        SymbolTableWrapper.prototype.has = function (key) {
            var table = this.symbolTable;
            return ((typeof table.has === 'function') ? table.has(key) : table[key] != null) ||
                this.stringIndexType !== undefined;
        };
        SymbolTableWrapper.prototype.values = function () {
            var _this = this;
            return this.symbols.map(function (s) { return new SymbolWrapper(s, _this.context); });
        };
        return SymbolTableWrapper;
    }());
    var MapSymbolTable = /** @class */ (function () {
        function MapSymbolTable() {
            this.map = new Map();
            this._values = [];
        }
        Object.defineProperty(MapSymbolTable.prototype, "size", {
            get: function () { return this.map.size; },
            enumerable: true,
            configurable: true
        });
        MapSymbolTable.prototype.get = function (key) { return this.map.get(key); };
        MapSymbolTable.prototype.add = function (symbol) {
            if (this.map.has(symbol.name)) {
                var previous = this.map.get(symbol.name);
                this._values[this._values.indexOf(previous)] = symbol;
            }
            this.map.set(symbol.name, symbol);
            this._values.push(symbol);
        };
        MapSymbolTable.prototype.addAll = function (symbols) {
            var e_4, _a;
            try {
                for (var symbols_3 = tslib_1.__values(symbols), symbols_3_1 = symbols_3.next(); !symbols_3_1.done; symbols_3_1 = symbols_3.next()) {
                    var symbol = symbols_3_1.value;
                    this.add(symbol);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (symbols_3_1 && !symbols_3_1.done && (_a = symbols_3.return)) _a.call(symbols_3);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        MapSymbolTable.prototype.has = function (key) { return this.map.has(key); };
        MapSymbolTable.prototype.values = function () {
            // Switch to this.map.values once iterables are supported by the target language.
            return this._values;
        };
        return MapSymbolTable;
    }());
    var PipesTable = /** @class */ (function () {
        function PipesTable(pipes, context) {
            this.pipes = pipes;
            this.context = context;
        }
        Object.defineProperty(PipesTable.prototype, "size", {
            get: function () { return this.pipes.length; },
            enumerable: true,
            configurable: true
        });
        PipesTable.prototype.get = function (key) {
            var pipe = this.pipes.find(function (pipe) { return pipe.name == key; });
            if (pipe) {
                return new PipeSymbol(pipe, this.context);
            }
        };
        PipesTable.prototype.has = function (key) { return this.pipes.find(function (pipe) { return pipe.name == key; }) != null; };
        PipesTable.prototype.values = function () {
            var _this = this;
            return this.pipes.map(function (pipe) { return new PipeSymbol(pipe, _this.context); });
        };
        return PipesTable;
    }());
    // This matches .d.ts files that look like ".../<package-name>/<package-name>.d.ts",
    var INDEX_PATTERN = /[\\/]([^\\/]+)[\\/]\1\.d\.ts$/;
    var PipeSymbol = /** @class */ (function () {
        function PipeSymbol(pipe, context) {
            this.pipe = pipe;
            this.context = context;
            this.kind = 'pipe';
            this.language = 'typescript';
            this.container = undefined;
            this.callable = true;
            this.nullable = false;
            this.public = true;
        }
        Object.defineProperty(PipeSymbol.prototype, "name", {
            get: function () { return this.pipe.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PipeSymbol.prototype, "type", {
            get: function () { return new TypeWrapper(this.tsType, this.context); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PipeSymbol.prototype, "definition", {
            get: function () {
                var symbol = this.tsType.getSymbol();
                return symbol ? definitionFromTsSymbol(symbol) : undefined;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PipeSymbol.prototype, "documentation", {
            get: function () {
                var symbol = this.tsType.getSymbol();
                if (!symbol) {
                    return [];
                }
                return symbol.getDocumentationComment(this.context.checker);
            },
            enumerable: true,
            configurable: true
        });
        PipeSymbol.prototype.members = function () { return EmptyTable.instance; };
        PipeSymbol.prototype.signatures = function () { return signaturesOf(this.tsType, this.context); };
        PipeSymbol.prototype.selectSignature = function (types) {
            var signature = selectSignature(this.tsType, this.context, types);
            if (types.length > 0) {
                var parameterType = types[0];
                var resultType = undefined;
                switch (this.name) {
                    case 'async':
                        // Get type argument of 'Observable', 'Promise', or 'EventEmitter'.
                        var tArgs = parameterType.typeArguments();
                        if (tArgs && tArgs.length === 1) {
                            resultType = tArgs[0];
                        }
                        break;
                    case 'slice':
                        resultType = parameterType;
                        break;
                }
                if (resultType) {
                    signature = new SignatureResultOverride(signature, resultType);
                }
            }
            return signature;
        };
        PipeSymbol.prototype.indexed = function (argument) { return undefined; };
        PipeSymbol.prototype.typeArguments = function () { return this.type.typeArguments(); };
        Object.defineProperty(PipeSymbol.prototype, "tsType", {
            get: function () {
                var type = this._tsType;
                if (!type) {
                    var classSymbol = this.findClassSymbol(this.pipe.type.reference);
                    if (classSymbol) {
                        type = this._tsType = this.findTransformMethodType(classSymbol);
                    }
                    if (!type) {
                        type = this._tsType = getTsTypeFromBuiltinType(symbols_1.BuiltinType.Any, this.context);
                    }
                }
                return type;
            },
            enumerable: true,
            configurable: true
        });
        PipeSymbol.prototype.findClassSymbol = function (type) {
            return findClassSymbolInContext(type, this.context);
        };
        PipeSymbol.prototype.findTransformMethodType = function (classSymbol) {
            var classType = this.context.checker.getDeclaredTypeOfSymbol(classSymbol);
            if (classType) {
                var transform = classType.getProperty('transform');
                if (transform) {
                    return this.context.checker.getTypeOfSymbolAtLocation(transform, this.context.node);
                }
            }
        };
        return PipeSymbol;
    }());
    function findClassSymbolInContext(type, context) {
        var sourceFile = context.program.getSourceFile(type.filePath);
        if (!sourceFile) {
            // This handles a case where an <packageName>/index.d.ts and a <packageName>/<packageName>.d.ts
            // are in the same directory. If we are looking for <packageName>/<packageName> and didn't
            // find it, look for <packageName>/index.d.ts as the program might have found that instead.
            var p = type.filePath;
            var m = p.match(INDEX_PATTERN);
            if (m) {
                var indexVersion = path.join(path.dirname(p), 'index.d.ts');
                sourceFile = context.program.getSourceFile(indexVersion);
            }
        }
        if (sourceFile) {
            var moduleSymbol = sourceFile.module || sourceFile.symbol;
            var exports_1 = context.checker.getExportsOfModule(moduleSymbol);
            return (exports_1 || []).find(function (symbol) { return symbol.name == type.name; });
        }
    }
    var EmptyTable = /** @class */ (function () {
        function EmptyTable() {
            this.size = 0;
        }
        EmptyTable.prototype.get = function (key) { return undefined; };
        EmptyTable.prototype.has = function (key) { return false; };
        EmptyTable.prototype.values = function () { return []; };
        EmptyTable.instance = new EmptyTable();
        return EmptyTable;
    }());
    function isSymbolPrivate(s) {
        return !!s.valueDeclaration && isPrivate(s.valueDeclaration);
    }
    function getTsTypeFromBuiltinType(builtinType, ctx) {
        var syntaxKind;
        switch (builtinType) {
            case symbols_1.BuiltinType.Any:
                syntaxKind = ts.SyntaxKind.AnyKeyword;
                break;
            case symbols_1.BuiltinType.Boolean:
                syntaxKind = ts.SyntaxKind.BooleanKeyword;
                break;
            case symbols_1.BuiltinType.Null:
                syntaxKind = ts.SyntaxKind.NullKeyword;
                break;
            case symbols_1.BuiltinType.Number:
                syntaxKind = ts.SyntaxKind.NumberKeyword;
                break;
            case symbols_1.BuiltinType.String:
                syntaxKind = ts.SyntaxKind.StringKeyword;
                break;
            case symbols_1.BuiltinType.Undefined:
                syntaxKind = ts.SyntaxKind.UndefinedKeyword;
                break;
            default:
                throw new Error("Internal error, unhandled literal kind " + builtinType + ":" + symbols_1.BuiltinType[builtinType]);
        }
        var node = ts.createNode(syntaxKind);
        node.parent = ctx.node;
        return ctx.checker.getTypeAtLocation(node);
    }
    function spanAt(sourceFile, line, column) {
        if (line != null && column != null) {
            var position_1 = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
            var findChild = function findChild(node) {
                if (node.kind > ts.SyntaxKind.LastToken && node.pos <= position_1 && node.end > position_1) {
                    var betterNode = ts.forEachChild(node, findChild);
                    return betterNode || node;
                }
            };
            var node = ts.forEachChild(sourceFile, findChild);
            if (node) {
                return { start: node.getStart(), end: node.getEnd() };
            }
        }
    }
    function definitionFromTsSymbol(symbol) {
        var declarations = symbol.declarations;
        if (declarations) {
            return declarations.map(function (declaration) {
                var sourceFile = declaration.getSourceFile();
                return {
                    fileName: sourceFile.fileName,
                    span: { start: declaration.getStart(), end: declaration.getEnd() }
                };
            });
        }
    }
    function parentDeclarationOf(node) {
        while (node) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                    return node;
                case ts.SyntaxKind.SourceFile:
                    return undefined;
            }
            node = node.parent;
        }
    }
    function getContainerOf(symbol, context) {
        var e_5, _a;
        if (symbol.getFlags() & ts.SymbolFlags.ClassMember && symbol.declarations) {
            try {
                for (var _b = tslib_1.__values(symbol.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var declaration = _c.value;
                    var parent_1 = parentDeclarationOf(declaration);
                    if (parent_1) {
                        var type = context.checker.getTypeAtLocation(parent_1);
                        if (type) {
                            return new TypeWrapper(type, context);
                        }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    function typeKindOf(type) {
        var e_6, _a;
        if (type) {
            if (type.flags & ts.TypeFlags.Any) {
                return symbols_1.BuiltinType.Any;
            }
            else if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral)) {
                return symbols_1.BuiltinType.String;
            }
            else if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike)) {
                return symbols_1.BuiltinType.Number;
            }
            else if (type.flags & (ts.TypeFlags.Undefined)) {
                return symbols_1.BuiltinType.Undefined;
            }
            else if (type.flags & (ts.TypeFlags.Null)) {
                return symbols_1.BuiltinType.Null;
            }
            else if (type.flags & ts.TypeFlags.Union) {
                // If all the constituent types of a union are the same kind, it is also that kind.
                var candidate = null;
                var unionType = type;
                if (unionType.types.length > 0) {
                    candidate = typeKindOf(unionType.types[0]);
                    try {
                        for (var _b = tslib_1.__values(unionType.types), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var subType = _c.value;
                            if (candidate != typeKindOf(subType)) {
                                return symbols_1.BuiltinType.Other;
                            }
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
                if (candidate != null) {
                    return candidate;
                }
            }
            else if (type.flags & ts.TypeFlags.TypeParameter) {
                return symbols_1.BuiltinType.Unbound;
            }
        }
        return symbols_1.BuiltinType.Other;
    }
    function getFromSymbolTable(symbolTable, key) {
        var table = symbolTable;
        var symbol;
        if (typeof table.get === 'function') {
            // TS 2.2 uses a Map
            symbol = table.get(key);
        }
        else {
            // TS pre-2.2 uses an object
            symbol = table[key];
        }
        return symbol;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zeW1ib2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsaUVBQXlJO0lBRXpJLHNDQUFzQztJQUN0QywyQ0FBMkM7SUFDM0MsSUFBTSxTQUFTLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsVUFBQyxJQUFhO1lBQ1YsT0FBQSxDQUFDLENBQUMsQ0FBRSxFQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFBbEYsQ0FBa0YsQ0FBQyxDQUFDLENBQUM7UUFDMUYsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBOUMsQ0FBOEMsQ0FBQyxDQUFDO0lBRXhFLElBQU0sZUFBZSxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxDQUFDLFVBQUMsSUFBYTtZQUNWLE9BQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBSSxFQUFVLENBQUMsU0FBUyxDQUFDLE1BQU07Z0JBQ3hDLElBQVksQ0FBQyxXQUFXLEdBQUksRUFBVSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFEakUsQ0FDaUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBQyxDQUFD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QUE7NEJBQ2hCLElBQUksU0FBUyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQ0FDcEMsT0FBTyxxQkFBVyxDQUFDLEtBQUssQ0FBQzs2QkFDMUI7eUJBQ0Y7Ozs7Ozs7OztpQkFDRjtnQkFDRCxJQUFJLFNBQVMsSUFBSSxJQUFJLEVBQUU7b0JBQ3JCLE9BQU8sU0FBUyxDQUFDO2lCQUNsQjthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtnQkFDbEQsT0FBTyxxQkFBVyxDQUFDLE9BQU8sQ0FBQzthQUM1QjtTQUNGO1FBQ0QsT0FBTyxxQkFBVyxDQUFDLEtBQUssQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxXQUEyQixFQUFFLEdBQVc7UUFDbEUsSUFBTSxLQUFLLEdBQUcsV0FBa0IsQ0FBQztRQUNqQyxJQUFJLE1BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssQ0FBQyxHQUFHLEtBQUssVUFBVSxFQUFFO1lBQ25DLG9CQUFvQjtZQUNwQixNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QjthQUFNO1lBQ0wsNEJBQTRCO1lBQzVCLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckI7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVQaXBlU3VtbWFyeSwgU3RhdGljU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QnVpbHRpblR5cGUsIERlY2xhcmF0aW9uS2luZCwgRGVmaW5pdGlvbiwgU2lnbmF0dXJlLCBTcGFuLCBTeW1ib2wsIFN5bWJvbERlY2xhcmF0aW9uLCBTeW1ib2xRdWVyeSwgU3ltYm9sVGFibGV9IGZyb20gJy4vc3ltYm9scyc7XG5cbi8vIEluIFR5cGVTY3JpcHQgMi4xIHRoZXNlIGZsYWdzIG1vdmVkXG4vLyBUaGVzZSBoZWxwZXJzIHdvcmsgZm9yIGJvdGggMi4wIGFuZCAyLjEuXG5jb25zdCBpc1ByaXZhdGUgPSAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzID9cbiAgICAoKG5vZGU6IHRzLk5vZGUpID0+XG4gICAgICAgICAhISgodHMgYXMgYW55KS5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSkgJiAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzLlByaXZhdGUpKSA6XG4gICAgKChub2RlOiB0cy5Ob2RlKSA9PiAhIShub2RlLmZsYWdzICYgKHRzIGFzIGFueSkuTm9kZUZsYWdzLlByaXZhdGUpKTtcblxuY29uc3QgaXNSZWZlcmVuY2VUeXBlID0gKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MgP1xuICAgICgodHlwZTogdHMuVHlwZSkgPT5cbiAgICAgICAgICEhKHR5cGUuZmxhZ3MgJiAodHMgYXMgYW55KS5UeXBlRmxhZ3MuT2JqZWN0ICYmXG4gICAgICAgICAgICAodHlwZSBhcyBhbnkpLm9iamVjdEZsYWdzICYgKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MuUmVmZXJlbmNlKSkgOlxuICAgICgodHlwZTogdHMuVHlwZSkgPT4gISEodHlwZS5mbGFncyAmICh0cyBhcyBhbnkpLlR5cGVGbGFncy5SZWZlcmVuY2UpKTtcblxuaW50ZXJmYWNlIFR5cGVDb250ZXh0IHtcbiAgbm9kZTogdHMuTm9kZTtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTeW1ib2xRdWVyeShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGZldGNoUGlwZXM6ICgpID0+IFN5bWJvbFRhYmxlKTogU3ltYm9sUXVlcnkge1xuICByZXR1cm4gbmV3IFR5cGVTY3JpcHRTeW1ib2xRdWVyeShwcm9ncmFtLCBjaGVja2VyLCBzb3VyY2UsIGZldGNoUGlwZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NNZW1iZXJzKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzdGF0aWNTeW1ib2w6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbFRhYmxlfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRlY2xhcmF0aW9uID0gZ2V0Q2xhc3NGcm9tU3RhdGljU3ltYm9sKHByb2dyYW0sIHN0YXRpY1N5bWJvbCk7XG4gIGlmIChkZWNsYXJhdGlvbikge1xuICAgIGNvbnN0IHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCBub2RlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHN0YXRpY1N5bWJvbC5maWxlUGF0aCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGUsIHByb2dyYW0sIGNoZWNrZXJ9KS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc01lbWJlcnNGcm9tRGVjbGFyYXRpb24oXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICBkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbikge1xuICBjb25zdCB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihkZWNsYXJhdGlvbik7XG4gIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGU6IHNvdXJjZSwgcHJvZ3JhbSwgY2hlY2tlcn0pLm1lbWJlcnMoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzRnJvbVN0YXRpY1N5bWJvbChcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCB0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5DbGFzc0RlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHNvdXJjZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgaWYgKHNvdXJjZSkge1xuICAgIHJldHVybiB0cy5mb3JFYWNoQ2hpbGQoc291cmNlLCBjaGlsZCA9PiB7XG4gICAgICBpZiAoY2hpbGQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjaGlsZCBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lICE9IG51bGwgJiYgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQgPT09IHR5cGUubmFtZSkge1xuICAgICAgICAgIHJldHVybiBjbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkgYXModHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZCk7XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGlwZXNUYWJsZShcbiAgICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgIHBpcGVzOiBDb21waWxlUGlwZVN1bW1hcnlbXSk6IFN5bWJvbFRhYmxlIHtcbiAgcmV0dXJuIG5ldyBQaXBlc1RhYmxlKHBpcGVzLCB7cHJvZ3JhbSwgY2hlY2tlciwgbm9kZTogc291cmNlfSk7XG59XG5cbmNsYXNzIFR5cGVTY3JpcHRTeW1ib2xRdWVyeSBpbXBsZW1lbnRzIFN5bWJvbFF1ZXJ5IHtcbiAgcHJpdmF0ZSB0eXBlQ2FjaGUgPSBuZXcgTWFwPEJ1aWx0aW5UeXBlLCBTeW1ib2w+KCk7XG4gIHByaXZhdGUgcGlwZXNDYWNoZTogU3ltYm9sVGFibGV8dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICAgIHByaXZhdGUgZmV0Y2hQaXBlczogKCkgPT4gU3ltYm9sVGFibGUpIHt9XG5cbiAgZ2V0VHlwZUtpbmQoc3ltYm9sOiBTeW1ib2wpOiBCdWlsdGluVHlwZSB7XG4gICAgY29uc3QgdHlwZSA9IHN5bWJvbCBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyID8gc3ltYm9sLnRzVHlwZSA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdHlwZUtpbmRPZih0eXBlKTtcbiAgfVxuXG4gIGdldEJ1aWx0aW5UeXBlKGtpbmQ6IEJ1aWx0aW5UeXBlKTogU3ltYm9sIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy50eXBlQ2FjaGUuZ2V0KGtpbmQpO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICBjb25zdCB0eXBlID0gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKGtpbmQsIHtcbiAgICAgICAgY2hlY2tlcjogdGhpcy5jaGVja2VyLFxuICAgICAgICBub2RlOiB0aGlzLnNvdXJjZSxcbiAgICAgICAgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLFxuICAgICAgfSk7XG4gICAgICByZXN1bHQgPVxuICAgICAgICAgIG5ldyBUeXBlV3JhcHBlcih0eXBlLCB7cHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXIsIG5vZGU6IHRoaXMuc291cmNlfSk7XG4gICAgICB0aGlzLnR5cGVDYWNoZS5zZXQoa2luZCwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFR5cGVVbmlvbiguLi50eXBlczogU3ltYm9sW10pOiBTeW1ib2wge1xuICAgIC8vIE5vIEFQSSBleGlzdHMgc28gcmV0dXJuIGFueSBpZiB0aGUgdHlwZXMgYXJlIG5vdCBhbGwgdGhlIHNhbWUgdHlwZS5cbiAgICBsZXQgcmVzdWx0OiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlcy5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCA9IHR5cGVzWzBdO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0eXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodHlwZXNbaV0gIT0gcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgfHwgdGhpcy5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xuICB9XG5cbiAgZ2V0QXJyYXlUeXBlKHR5cGU6IFN5bWJvbCk6IFN5bWJvbCB7IHJldHVybiB0aGlzLmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7IH1cblxuICBnZXRFbGVtZW50VHlwZSh0eXBlOiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodHlwZSBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSB7XG4gICAgICBjb25zdCB0eSA9IHR5cGUudHNUeXBlO1xuICAgICAgY29uc3QgdHlBcmdzID0gdHlwZS50eXBlQXJndW1lbnRzKCk7XG4gICAgICAvLyBUT0RPKGF5YXpoYWZpeik6IFRyYWNrIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc3MTEgdG8gZXhwb3NlXG4gICAgICAvLyBgaXNBcnJheUxpa2VUeXBlYCBhcyBhIHB1YmxpYyBtZXRob2QuXG4gICAgICBpZiAoISh0aGlzLmNoZWNrZXIgYXMgYW55KS5pc0FycmF5TGlrZVR5cGUodHkpIHx8IHR5QXJncz8ubGVuZ3RoICE9PSAxKSByZXR1cm47XG4gICAgICByZXR1cm4gdHlBcmdzWzBdO1xuICAgIH1cbiAgfVxuXG4gIGdldE5vbk51bGxhYmxlVHlwZShzeW1ib2w6IFN5bWJvbCk6IFN5bWJvbCB7XG4gICAgaWYgKHN5bWJvbCBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyICYmICh0eXBlb2YgdGhpcy5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSA9PSAnZnVuY3Rpb24nKSkge1xuICAgICAgY29uc3QgdHNUeXBlID0gc3ltYm9sLnRzVHlwZTtcbiAgICAgIGNvbnN0IG5vbk51bGxhYmxlVHlwZSA9IHRoaXMuY2hlY2tlci5nZXROb25OdWxsYWJsZVR5cGUodHNUeXBlKTtcbiAgICAgIGlmIChub25OdWxsYWJsZVR5cGUgIT0gdHNUeXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIobm9uTnVsbGFibGVUeXBlLCBzeW1ib2wuY29udGV4dCk7XG4gICAgICB9IGVsc2UgaWYgKG5vbk51bGxhYmxlVHlwZSA9PSB0c1R5cGUpIHtcbiAgICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIGdldFBpcGVzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5waXBlc0NhY2hlO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnBpcGVzQ2FjaGUgPSB0aGlzLmZldGNoUGlwZXMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFRlbXBsYXRlQ29udGV4dCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2xUYWJsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVDb250ZXh0ID0ge25vZGU6IHRoaXMuc291cmNlLCBwcm9ncmFtOiB0aGlzLnByb2dyYW0sIGNoZWNrZXI6IHRoaXMuY2hlY2tlcn07XG4gICAgY29uc3QgdHlwZVN5bWJvbCA9IGZpbmRDbGFzc1N5bWJvbEluQ29udGV4dCh0eXBlLCBjb250ZXh0KTtcbiAgICBpZiAodHlwZVN5bWJvbCkge1xuICAgICAgY29uc3QgY29udGV4dFR5cGUgPSB0aGlzLmdldFRlbXBsYXRlUmVmQ29udGV4dFR5cGUodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gICAgICBpZiAoY29udGV4dFR5cGUpIHJldHVybiBjb250ZXh0VHlwZS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHlwZVN5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlQ29udGV4dCA9IHtub2RlOiB0aGlzLnNvdXJjZSwgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXJ9O1xuICAgIGNvbnN0IHR5cGVTeW1ib2wgPSBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIHR5cGVTeW1ib2wgJiYgbmV3IFN5bWJvbFdyYXBwZXIodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gIH1cblxuICBjcmVhdGVTeW1ib2xUYWJsZShzeW1ib2xzOiBTeW1ib2xEZWNsYXJhdGlvbltdKTogU3ltYm9sVGFibGUge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXBTeW1ib2xUYWJsZSgpO1xuICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9scy5tYXAocyA9PiBuZXcgRGVjbGFyZWRTeW1ib2wocykpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgbWVyZ2VTeW1ib2xUYWJsZShzeW1ib2xUYWJsZXM6IFN5bWJvbFRhYmxlW10pOiBTeW1ib2xUYWJsZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcFN5bWJvbFRhYmxlKCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2xUYWJsZSBvZiBzeW1ib2xUYWJsZXMpIHtcbiAgICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9sVGFibGUudmFsdWVzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0U3BhbkF0KGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNwYW5BdCh0aGlzLnNvdXJjZSwgbGluZSwgY29sdW1uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sOiB0cy5TeW1ib2wsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHR5cGVTeW1ib2wsIHRoaXMuc291cmNlKTtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IHR5cGUuc3ltYm9sICYmIHR5cGUuc3ltYm9sLm1lbWJlcnMgJiZcbiAgICAgICAgZ2V0RnJvbVN5bWJvbFRhYmxlKHR5cGUuc3ltYm9sLm1lbWJlcnMgISwgJ19fY29uc3RydWN0b3InKTtcblxuICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JEZWNsYXJhdGlvbiA9IGNvbnN0cnVjdG9yLmRlY2xhcmF0aW9ucyAhWzBdIGFzIHRzLkNvbnN0cnVjdG9yVHlwZU5vZGU7XG4gICAgICBmb3IgKGNvbnN0IHBhcmFtZXRlciBvZiBjb25zdHJ1Y3RvckRlY2xhcmF0aW9uLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRoaXMuY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihwYXJhbWV0ZXIudHlwZSAhKTtcbiAgICAgICAgaWYgKHR5cGUuc3ltYm9sICEubmFtZSA9PSAnVGVtcGxhdGVSZWYnICYmIGlzUmVmZXJlbmNlVHlwZSh0eXBlKSkge1xuICAgICAgICAgIGNvbnN0IHR5cGVXcmFwcGVyID0gbmV3IFR5cGVXcmFwcGVyKHR5cGUsIGNvbnRleHQpO1xuICAgICAgICAgIGNvbnN0IHR5cGVBcmd1bWVudHMgPSB0eXBlV3JhcHBlci50eXBlQXJndW1lbnRzKCk7XG4gICAgICAgICAgaWYgKHR5cGVBcmd1bWVudHMgJiYgdHlwZUFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlQXJndW1lbnRzWzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlQ2FsbGFibGUodHlwZTogdHMuVHlwZSk6IGJvb2xlYW4ge1xuICBjb25zdCBzaWduYXR1cmVzID0gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpO1xuICByZXR1cm4gc2lnbmF0dXJlcyAmJiBzaWduYXR1cmVzLmxlbmd0aCAhPSAwO1xufVxuXG5mdW5jdGlvbiBzaWduYXR1cmVzT2YodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQpOiBTaWduYXR1cmVbXSB7XG4gIHJldHVybiB0eXBlLmdldENhbGxTaWduYXR1cmVzKCkubWFwKHMgPT4gbmV3IFNpZ25hdHVyZVdyYXBwZXIocywgY29udGV4dCkpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RTaWduYXR1cmUodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQsIHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXxcbiAgICB1bmRlZmluZWQge1xuICAvLyBUT0RPOiBEbyBhIGJldHRlciBqb2Igb2Ygc2VsZWN0aW5nIHRoZSByaWdodCBzaWduYXR1cmUuIFR5cGVTY3JpcHQgZG9lcyBub3QgY3VycmVudGx5IHN1cHBvcnQgYVxuICAvLyBUeXBlIFJlbGF0aW9uc2hpcCBBUEkgKHNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci92c2NvZGUtbmctbGFuZ3VhZ2Utc2VydmljZS9pc3N1ZXMvMTQzKS5cbiAgLy8gQ29uc2lkZXIgY3JlYXRpbmcgYSBUeXBlQ2hlY2tCbG9jayBob3N0IGluIHRoZSBsYW5ndWFnZSBzZXJ2aWNlIHRoYXQgbWF5IGFsc28gYWN0IGFzIGFcbiAgLy8gc2NyYXRjaHBhZCBmb3IgdHlwZSBjb21wYXJpc29ucy5cbiAgY29uc3Qgc2lnbmF0dXJlcyA9IHR5cGUuZ2V0Q2FsbFNpZ25hdHVyZXMoKTtcbiAgcmV0dXJuIHNpZ25hdHVyZXMubGVuZ3RoID8gbmV3IFNpZ25hdHVyZVdyYXBwZXIoc2lnbmF0dXJlc1swXSwgY29udGV4dCkgOiB1bmRlZmluZWQ7XG59XG5cbmNsYXNzIFR5cGVXcmFwcGVyIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgY29uc3RydWN0b3IocHVibGljIHRzVHlwZTogdHMuVHlwZSwgcHVibGljIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7XG4gICAgaWYgKCF0c1R5cGUpIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnRlcm5hbDogbnVsbCB0eXBlJyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuY29udGV4dC5jaGVja2VyLnR5cGVUb1N0cmluZyh0aGlzLnRzVHlwZSk7IH1cblxuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGVjbGFyYXRpb25LaW5kID0gJ3R5cGUnO1xuXG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ3R5cGVzY3JpcHQnO1xuXG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyByZWFkb25seSBjb250YWluZXI6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpYzogYm9vbGVhbiA9IHRydWU7XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdHlwZUNhbGxhYmxlKHRoaXMudHNUeXBlKTsgfVxuXG4gIGdldCBudWxsYWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMudHNUeXBlKSAhPSB0aGlzLnRzVHlwZTtcbiAgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10ge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBzeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQodGhpcy5jb250ZXh0LmNoZWNrZXIpO1xuICB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIHJldHVybiBzeW1ib2wgPyBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHN5bWJvbCkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICAvLyBTaG91bGQgY2FsbCBnZXRBcHBhcmVudFByb3BlcnRpZXMoKSBpbnN0ZWFkIG9mIGdldFByb3BlcnRpZXMoKSBiZWNhdXNlXG4gICAgLy8gdGhlIGZvcm1lciBpbmNsdWRlcyBwcm9wZXJ0aWVzIG9uIHRoZSBiYXNlIGNsYXNzIHdoZXJlYXMgdGhlIGxhdHRlciBkb2VzXG4gICAgLy8gbm90LiBUaGlzIHByb3ZpZGVzIHByb3BlcnRpZXMgbGlrZSAuYmluZCgpLCAuY2FsbCgpLCAuYXBwbHkoKSwgZXRjIGZvclxuICAgIC8vIGZ1bmN0aW9ucy5cbiAgICByZXR1cm4gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnRzVHlwZS5nZXRBcHBhcmVudFByb3BlcnRpZXMoKSwgdGhpcy5jb250ZXh0LCB0aGlzLnRzVHlwZSk7XG4gIH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHNpZ25hdHVyZXNPZih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc2VsZWN0U2lnbmF0dXJlKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQsIHR5cGVzKTtcbiAgfVxuXG4gIGluZGV4ZWQodHlwZTogU3ltYm9sLCB2YWx1ZTogYW55KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgaWYgKCEodHlwZSBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSkgcmV0dXJuO1xuXG4gICAgY29uc3QgdHlwZUtpbmQgPSB0eXBlS2luZE9mKHR5cGUudHNUeXBlKTtcbiAgICBzd2l0Y2ggKHR5cGVLaW5kKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgY29uc3QgblR5cGUgPSB0aGlzLnRzVHlwZS5nZXROdW1iZXJJbmRleFR5cGUoKTtcbiAgICAgICAgaWYgKG5UeXBlKSB7XG4gICAgICAgICAgLy8gZ2V0IHRoZSByaWdodCB0dXBsZSB0eXBlIGJ5IHZhbHVlLCBsaWtlICd2YXIgdDogW251bWJlciwgc3RyaW5nXTsnXG4gICAgICAgICAgaWYgKG5UeXBlLmlzVW5pb24oKSkge1xuICAgICAgICAgICAgLy8gcmV0dXJuIHVuZGVmaW5lZCBpZiBhcnJheSBpbmRleCBvdXQgb2YgYm91bmQuXG4gICAgICAgICAgICByZXR1cm4gblR5cGUudHlwZXNbdmFsdWVdICYmIG5ldyBUeXBlV3JhcHBlcihuVHlwZS50eXBlc1t2YWx1ZV0sIHRoaXMuY29udGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIoblR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICBjb25zdCBzVHlwZSA9IHRoaXMudHNUeXBlLmdldFN0cmluZ0luZGV4VHlwZSgpO1xuICAgICAgICByZXR1cm4gc1R5cGUgJiYgbmV3IFR5cGVXcmFwcGVyKHNUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW118dW5kZWZpbmVkIHtcbiAgICBpZiAoIWlzUmVmZXJlbmNlVHlwZSh0aGlzLnRzVHlwZSkpIHJldHVybjtcblxuICAgIGNvbnN0IHR5cGVSZWZlcmVuY2UgPSAodGhpcy50c1R5cGUgYXMgdHMuVHlwZVJlZmVyZW5jZSk7XG4gICAgbGV0IHR5cGVBcmd1bWVudHM6IFJlYWRvbmx5QXJyYXk8dHMuVHlwZT58dW5kZWZpbmVkO1xuICAgIHR5cGVBcmd1bWVudHMgPSB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlQXJndW1lbnRzKHR5cGVSZWZlcmVuY2UpO1xuICAgIGlmICghdHlwZUFyZ3VtZW50cykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdHlwZUFyZ3VtZW50cy5tYXAodGEgPT4gbmV3IFR5cGVXcmFwcGVyKHRhLCB0aGlzLmNvbnRleHQpKTtcbiAgfVxufVxuXG4vLyBJZiBzdHJpbmdJbmRleFR5cGUgYSBwcmltaXRpdmUgdHlwZShlLmcuICdzdHJpbmcnKSwgdGhlIFN5bWJvbCBpcyB1bmRlZmluZWQ7XG4vLyBhbmQgaW4gQXN0VHlwZS5yZXNvbHZlUHJvcGVydHlSZWFkIG1ldGhvZCwgdGhlIFN5bWJvbC50eXBlIHNob3VsZCBnZXQgdGhlIHJpZ2h0IHR5cGUuXG5jbGFzcyBTdHJpbmdJbmRleFR5cGVXcmFwcGVyIGV4dGVuZHMgVHlwZVdyYXBwZXIge1xuICBwdWJsaWMgcmVhZG9ubHkgdHlwZSA9IG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTtcbn1cblxuY2xhc3MgU3ltYm9sV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHByaXZhdGUgc3ltYm9sOiB0cy5TeW1ib2w7XG4gIHByaXZhdGUgX21lbWJlcnM/OiBTeW1ib2xUYWJsZTtcblxuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAndHlwZXNjcmlwdCc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBzeW1ib2w6IHRzLlN5bWJvbCxcbiAgICAgIC8qKiBUeXBlU2NyaXB0IHR5cGUgY29udGV4dCBvZiB0aGUgc3ltYm9sLiAqL1xuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBUeXBlQ29udGV4dCxcbiAgICAgIC8qKiBUeXBlIG9mIHRoZSBUeXBlU2NyaXB0IHN5bWJvbCwgaWYga25vd24uIElmIG5vdCBwcm92aWRlZCwgdGhlIHR5cGUgb2YgdGhlIHN5bWJvbFxuICAgICAgKiB3aWxsIGJlIGRldGVybWluZWQgZHluYW1pY2FsbHk7IHNlZSBgU3ltYm9sV3JhcHBlciN0c1R5cGVgLiAqL1xuICAgICAgcHJpdmF0ZSBfdHNUeXBlPzogdHMuVHlwZSkge1xuICAgIHRoaXMuc3ltYm9sID0gc3ltYm9sICYmIGNvbnRleHQgJiYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSA/XG4gICAgICAgIGNvbnRleHQuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOlxuICAgICAgICBzeW1ib2w7XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW1ib2wubmFtZTsgfVxuXG4gIGdldCBraW5kKCk6IERlY2xhcmF0aW9uS2luZCB7IHJldHVybiB0aGlzLmNhbGxhYmxlID8gJ21ldGhvZCcgOiAncHJvcGVydHknOyB9XG5cbiAgZ2V0IHR5cGUoKTogVHlwZVdyYXBwZXIgeyByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIGdldENvbnRhaW5lck9mKHRoaXMuc3ltYm9sLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgZ2V0IHB1YmxpYygpOiBib29sZWFuIHtcbiAgICAvLyBTeW1ib2xzIHRoYXQgYXJlIG5vdCBleHBsaWNpdGx5IG1hZGUgcHJpdmF0ZSBhcmUgcHVibGljLlxuICAgIHJldHVybiAhaXNTeW1ib2xQcml2YXRlKHRoaXMuc3ltYm9sKTtcbiAgfVxuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHR5cGVDYWxsYWJsZSh0aGlzLnRzVHlwZSk7IH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHsgcmV0dXJuIGRlZmluaXRpb25Gcm9tVHNTeW1ib2wodGhpcy5zeW1ib2wpOyB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KHRoaXMuY29udGV4dC5jaGVja2VyKTtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIGlmICghdGhpcy5fbWVtYmVycykge1xuICAgICAgaWYgKCh0aGlzLnN5bWJvbC5mbGFncyAmICh0cy5TeW1ib2xGbGFncy5DbGFzcyB8IHRzLlN5bWJvbEZsYWdzLkludGVyZmFjZSkpICE9IDApIHtcbiAgICAgICAgY29uc3QgZGVjbGFyZWRUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2wodGhpcy5zeW1ib2wpO1xuICAgICAgICBjb25zdCB0eXBlV3JhcHBlciA9IG5ldyBUeXBlV3JhcHBlcihkZWNsYXJlZFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuX21lbWJlcnMgPSB0eXBlV3JhcHBlci5tZW1iZXJzKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9tZW1iZXJzID0gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnN5bWJvbC5tZW1iZXJzICEsIHRoaXMuY29udGV4dCwgdGhpcy50c1R5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbWVtYmVycztcbiAgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB1bmRlZmluZWQ7IH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnR5cGUudHlwZUFyZ3VtZW50cygpOyB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNUeXBlKCk6IHRzLlR5cGUge1xuICAgIGxldCB0eXBlID0gdGhpcy5fdHNUeXBlO1xuICAgIGlmICghdHlwZSkge1xuICAgICAgdHlwZSA9IHRoaXMuX3RzVHlwZSA9XG4gICAgICAgICAgdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0VHlwZU9mU3ltYm9sQXRMb2NhdGlvbih0aGlzLnN5bWJvbCwgdGhpcy5jb250ZXh0Lm5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxufVxuXG5jbGFzcyBEZWNsYXJlZFN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ25nLXRlbXBsYXRlJztcblxuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRlY2xhcmF0aW9uOiBTeW1ib2xEZWNsYXJhdGlvbikge31cblxuICBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24ubmFtZTsgfVxuXG4gIGdldCBraW5kKCkgeyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5raW5kOyB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIGdldCB0eXBlKCk6IFN5bWJvbCB7IHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLnR5cGU7IH1cblxuICBnZXQgY2FsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnR5cGUuY2FsbGFibGU7IH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24uZGVmaW5pdGlvbjsgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10geyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlLmRvY3VtZW50YXRpb247IH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHsgcmV0dXJuIHRoaXMudHlwZS5tZW1iZXJzKCk7IH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHRoaXMudHlwZS5zaWduYXR1cmVzKCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnR5cGUuc2VsZWN0U2lnbmF0dXJlKHR5cGVzKTsgfVxuXG4gIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW118dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMudHlwZS50eXBlQXJndW1lbnRzKCk7IH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxufVxuXG5jbGFzcyBTaWduYXR1cmVXcmFwcGVyIGltcGxlbWVudHMgU2lnbmF0dXJlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzaWduYXR1cmU6IHRzLlNpZ25hdHVyZSwgcHJpdmF0ZSBjb250ZXh0OiBUeXBlQ29udGV4dCkge31cblxuICBnZXQgYXJndW1lbnRzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICByZXR1cm4gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnNpZ25hdHVyZS5nZXRQYXJhbWV0ZXJzKCksIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBnZXQgcmVzdWx0KCk6IFN5bWJvbCB7IHJldHVybiBuZXcgVHlwZVdyYXBwZXIodGhpcy5zaWduYXR1cmUuZ2V0UmV0dXJuVHlwZSgpLCB0aGlzLmNvbnRleHQpOyB9XG59XG5cbmNsYXNzIFNpZ25hdHVyZVJlc3VsdE92ZXJyaWRlIGltcGxlbWVudHMgU2lnbmF0dXJlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzaWduYXR1cmU6IFNpZ25hdHVyZSwgcHJpdmF0ZSByZXN1bHRUeXBlOiBTeW1ib2wpIHt9XG5cbiAgZ2V0IGFyZ3VtZW50cygpOiBTeW1ib2xUYWJsZSB7IHJldHVybiB0aGlzLnNpZ25hdHVyZS5hcmd1bWVudHM7IH1cblxuICBnZXQgcmVzdWx0KCk6IFN5bWJvbCB7IHJldHVybiB0aGlzLnJlc3VsdFR5cGU7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvU3ltYm9sVGFibGVGYWN0b3J5KHN5bWJvbHM6IHRzLlN5bWJvbFtdKTogdHMuU3ltYm9sVGFibGUge1xuICAvLyDiiIAgVHlwZXNjcmlwdCB2ZXJzaW9uID49IDIuMiwgYFN5bWJvbFRhYmxlYCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBFUzYgYE1hcGBcbiAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIHRzLlN5bWJvbD4oKTtcbiAgZm9yIChjb25zdCBzeW1ib2wgb2Ygc3ltYm9scykge1xuICAgIHJlc3VsdC5zZXQoc3ltYm9sLm5hbWUsIHN5bWJvbCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0IGFzIHRzLlN5bWJvbFRhYmxlO1xufVxuXG5mdW5jdGlvbiB0b1N5bWJvbHMoc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlIHwgdW5kZWZpbmVkKTogdHMuU3ltYm9sW10ge1xuICBpZiAoIXN5bWJvbFRhYmxlKSByZXR1cm4gW107XG5cbiAgY29uc3QgdGFibGUgPSBzeW1ib2xUYWJsZSBhcyBhbnk7XG5cbiAgaWYgKHR5cGVvZiB0YWJsZS52YWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWJsZS52YWx1ZXMoKSkgYXMgdHMuU3ltYm9sW107XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IHRzLlN5bWJvbFtdID0gW107XG5cbiAgY29uc3Qgb3duID0gdHlwZW9mIHRhYmxlLmhhc093blByb3BlcnR5ID09PSAnZnVuY3Rpb24nID9cbiAgICAgIChuYW1lOiBzdHJpbmcpID0+IHRhYmxlLmhhc093blByb3BlcnR5KG5hbWUpIDpcbiAgICAgIChuYW1lOiBzdHJpbmcpID0+ICEhdGFibGVbbmFtZV07XG5cbiAgZm9yIChjb25zdCBuYW1lIGluIHRhYmxlKSB7XG4gICAgaWYgKG93bihuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2godGFibGVbbmFtZV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jbGFzcyBTeW1ib2xUYWJsZVdyYXBwZXIgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHByaXZhdGUgc3ltYm9sczogdHMuU3ltYm9sW107XG4gIHByaXZhdGUgc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlO1xuICBwcml2YXRlIHN0cmluZ0luZGV4VHlwZT86IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBxdWVyeWFibGUgdGFibGUgb2Ygc3ltYm9scyBiZWxvbmdpbmcgdG8gYSBUeXBlU2NyaXB0IGVudGl0eS5cbiAgICogQHBhcmFtIHN5bWJvbHMgc3ltYm9scyB0byBxdWVyeSBiZWxvbmdpbmcgdG8gdGhlIGVudGl0eVxuICAgKiBAcGFyYW0gY29udGV4dCBwcm9ncmFtIGNvbnRleHRcbiAgICogQHBhcmFtIHR5cGUgb3JpZ2luYWwgVHlwZVNjcmlwdCB0eXBlIG9mIGVudGl0eSBvd25pbmcgdGhlIHN5bWJvbHMsIGlmIGtub3duXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHN5bWJvbHM6IHRzLlN5bWJvbFRhYmxlfHRzLlN5bWJvbFtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0LCBwcml2YXRlIHR5cGU/OiB0cy5UeXBlKSB7XG4gICAgc3ltYm9scyA9IHN5bWJvbHMgfHwgW107XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzeW1ib2xzKSkge1xuICAgICAgdGhpcy5zeW1ib2xzID0gc3ltYm9scztcbiAgICAgIHRoaXMuc3ltYm9sVGFibGUgPSB0b1N5bWJvbFRhYmxlRmFjdG9yeShzeW1ib2xzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zeW1ib2xzID0gdG9TeW1ib2xzKHN5bWJvbHMpO1xuICAgICAgdGhpcy5zeW1ib2xUYWJsZSA9IHN5bWJvbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRoaXMuc3RyaW5nSW5kZXhUeXBlID0gdHlwZS5nZXRTdHJpbmdJbmRleFR5cGUoKTtcbiAgICB9XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5zeW1ib2xzLmxlbmd0aDsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IGdldEZyb21TeW1ib2xUYWJsZSh0aGlzLnN5bWJvbFRhYmxlLCBrZXkpO1xuICAgIGlmIChzeW1ib2wpIHtcbiAgICAgIHJldHVybiBuZXcgU3ltYm9sV3JhcHBlcihzeW1ib2wsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RyaW5nSW5kZXhUeXBlKSB7XG4gICAgICAvLyBJZiB0aGUga2V5IGRvZXMgbm90IGV4aXN0IGFzIGFuIGV4cGxpY2l0IHN5bWJvbCBvbiB0aGUgdHlwZSwgaXQgbWF5IGJlIGFjY2Vzc2luZyBhIHN0cmluZ1xuICAgICAgLy8gaW5kZXggc2lnbmF0dXJlIHVzaW5nIGRvdCBub3RhdGlvbjpcbiAgICAgIC8vXG4gICAgICAvLyAgIGNvbnN0IG9iajxUPjogeyBba2V5OiBzdHJpbmddOiBUIH07XG4gICAgICAvLyAgIG9iai5zdHJpbmdJbmRleCAvLyBlcXVpdmFsZW50IHRvIG9ialsnc3RyaW5nSW5kZXgnXTtcbiAgICAgIC8vXG4gICAgICAvLyBJbiB0aGlzIGNhc2UsIHJldHVybiB0aGUgdHlwZSBpbmRleGVkIGJ5IGFuIGFyYml0cmFyeSBzdHJpbmcga2V5LlxuICAgICAgcmV0dXJuIG5ldyBTdHJpbmdJbmRleFR5cGVXcmFwcGVyKHRoaXMuc3RyaW5nSW5kZXhUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0YWJsZTogYW55ID0gdGhpcy5zeW1ib2xUYWJsZTtcbiAgICByZXR1cm4gKCh0eXBlb2YgdGFibGUuaGFzID09PSAnZnVuY3Rpb24nKSA/IHRhYmxlLmhhcyhrZXkpIDogdGFibGVba2V5XSAhPSBudWxsKSB8fFxuICAgICAgICB0aGlzLnN0cmluZ0luZGV4VHlwZSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHsgcmV0dXJuIHRoaXMuc3ltYm9scy5tYXAocyA9PiBuZXcgU3ltYm9sV3JhcHBlcihzLCB0aGlzLmNvbnRleHQpKTsgfVxufVxuXG5jbGFzcyBNYXBTeW1ib2xUYWJsZSBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPHN0cmluZywgU3ltYm9sPigpO1xuICBwcml2YXRlIF92YWx1ZXM6IFN5bWJvbFtdID0gW107XG5cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubWFwLnNpemU7IH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMubWFwLmdldChrZXkpOyB9XG5cbiAgYWRkKHN5bWJvbDogU3ltYm9sKSB7XG4gICAgaWYgKHRoaXMubWFwLmhhcyhzeW1ib2wubmFtZSkpIHtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5tYXAuZ2V0KHN5bWJvbC5uYW1lKSAhO1xuICAgICAgdGhpcy5fdmFsdWVzW3RoaXMuX3ZhbHVlcy5pbmRleE9mKHByZXZpb3VzKV0gPSBzeW1ib2w7XG4gICAgfVxuICAgIHRoaXMubWFwLnNldChzeW1ib2wubmFtZSwgc3ltYm9sKTtcbiAgICB0aGlzLl92YWx1ZXMucHVzaChzeW1ib2wpO1xuICB9XG5cbiAgYWRkQWxsKHN5bWJvbHM6IFN5bWJvbFtdKSB7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2Ygc3ltYm9scykge1xuICAgICAgdGhpcy5hZGQoc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMubWFwLmhhcyhrZXkpOyB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHtcbiAgICAvLyBTd2l0Y2ggdG8gdGhpcy5tYXAudmFsdWVzIG9uY2UgaXRlcmFibGVzIGFyZSBzdXBwb3J0ZWQgYnkgdGhlIHRhcmdldCBsYW5ndWFnZS5cbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xuICB9XG59XG5cbmNsYXNzIFBpcGVzVGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGlwZXM6IENvbXBpbGVQaXBlU3VtbWFyeVtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBzaXplKCkgeyByZXR1cm4gdGhpcy5waXBlcy5sZW5ndGg7IH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwaXBlID0gdGhpcy5waXBlcy5maW5kKHBpcGUgPT4gcGlwZS5uYW1lID09IGtleSk7XG4gICAgaWYgKHBpcGUpIHtcbiAgICAgIHJldHVybiBuZXcgUGlwZVN5bWJvbChwaXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5waXBlcy5maW5kKHBpcGUgPT4gcGlwZS5uYW1lID09IGtleSkgIT0gbnVsbDsgfVxuXG4gIHZhbHVlcygpOiBTeW1ib2xbXSB7IHJldHVybiB0aGlzLnBpcGVzLm1hcChwaXBlID0+IG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCkpOyB9XG59XG5cbi8vIFRoaXMgbWF0Y2hlcyAuZC50cyBmaWxlcyB0aGF0IGxvb2sgbGlrZSBcIi4uLi88cGFja2FnZS1uYW1lPi88cGFja2FnZS1uYW1lPi5kLnRzXCIsXG5jb25zdCBJTkRFWF9QQVRURVJOID0gL1tcXFxcL10oW15cXFxcL10rKVtcXFxcL11cXDFcXC5kXFwudHMkLztcblxuY2xhc3MgUGlwZVN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHByaXZhdGUgX3RzVHlwZTogdHMuVHlwZXx1bmRlZmluZWQ7XG4gIHB1YmxpYyByZWFkb25seSBraW5kOiBEZWNsYXJhdGlvbktpbmQgPSAncGlwZSc7XG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ3R5cGVzY3JpcHQnO1xuICBwdWJsaWMgcmVhZG9ubHkgY29udGFpbmVyOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwdWJsaWMgcmVhZG9ubHkgY2FsbGFibGU6IGJvb2xlYW4gPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpYzogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwaXBlOiBDb21waWxlUGlwZVN1bW1hcnksIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQpIHt9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMucGlwZS5uYW1lOyB9XG5cbiAgZ2V0IHR5cGUoKTogVHlwZVdyYXBwZXIgeyByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIHJldHVybiBzeW1ib2wgPyBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHN5bWJvbCkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgZG9jdW1lbnRhdGlvbigpOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRzVHlwZS5nZXRTeW1ib2woKTtcbiAgICBpZiAoIXN5bWJvbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KHRoaXMuY29udGV4dC5jaGVja2VyKTtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUgeyByZXR1cm4gRW1wdHlUYWJsZS5pbnN0YW5jZTsgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIGxldCBzaWduYXR1cmUgPSBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpICE7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHBhcmFtZXRlclR5cGUgPSB0eXBlc1swXTtcbiAgICAgIGxldCByZXN1bHRUeXBlOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgc3dpdGNoICh0aGlzLm5hbWUpIHtcbiAgICAgICAgY2FzZSAnYXN5bmMnOlxuICAgICAgICAgIC8vIEdldCB0eXBlIGFyZ3VtZW50IG9mICdPYnNlcnZhYmxlJywgJ1Byb21pc2UnLCBvciAnRXZlbnRFbWl0dGVyJy5cbiAgICAgICAgICBjb25zdCB0QXJncyA9IHBhcmFtZXRlclR5cGUudHlwZUFyZ3VtZW50cygpO1xuICAgICAgICAgIGlmICh0QXJncyAmJiB0QXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdFR5cGUgPSB0QXJnc1swXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NsaWNlJzpcbiAgICAgICAgICByZXN1bHRUeXBlID0gcGFyYW1ldGVyVHlwZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChyZXN1bHRUeXBlKSB7XG4gICAgICAgIHNpZ25hdHVyZSA9IG5ldyBTaWduYXR1cmVSZXN1bHRPdmVycmlkZShzaWduYXR1cmUsIHJlc3VsdFR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2lnbmF0dXJlO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB1bmRlZmluZWQ7IH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLnR5cGUudHlwZUFyZ3VtZW50cygpOyB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNUeXBlKCk6IHRzLlR5cGUge1xuICAgIGxldCB0eXBlID0gdGhpcy5fdHNUeXBlO1xuICAgIGlmICghdHlwZSkge1xuICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmZpbmRDbGFzc1N5bWJvbCh0aGlzLnBpcGUudHlwZS5yZWZlcmVuY2UpO1xuICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgIHR5cGUgPSB0aGlzLl90c1R5cGUgPSB0aGlzLmZpbmRUcmFuc2Zvcm1NZXRob2RUeXBlKGNsYXNzU3ltYm9sKSAhO1xuICAgICAgfVxuICAgICAgaWYgKCF0eXBlKSB7XG4gICAgICAgIHR5cGUgPSB0aGlzLl90c1R5cGUgPSBnZXRUc1R5cGVGcm9tQnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55LCB0aGlzLmNvbnRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZENsYXNzU3ltYm9sKHR5cGU6IFN0YXRpY1N5bWJvbCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFRyYW5zZm9ybU1ldGhvZFR5cGUoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLlR5cGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjbGFzc1R5cGUgPSB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXREZWNsYXJlZFR5cGVPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gICAgaWYgKGNsYXNzVHlwZSkge1xuICAgICAgY29uc3QgdHJhbnNmb3JtID0gY2xhc3NUeXBlLmdldFByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbiAgICAgIGlmICh0cmFuc2Zvcm0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5jaGVja2VyLmdldFR5cGVPZlN5bWJvbEF0TG9jYXRpb24odHJhbnNmb3JtLCB0aGlzLmNvbnRleHQubm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRDbGFzc1N5bWJvbEluQ29udGV4dCh0eXBlOiBTdGF0aWNTeW1ib2wsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGxldCBzb3VyY2VGaWxlID0gY29udGV4dC5wcm9ncmFtLmdldFNvdXJjZUZpbGUodHlwZS5maWxlUGF0aCk7XG4gIGlmICghc291cmNlRmlsZSkge1xuICAgIC8vIFRoaXMgaGFuZGxlcyBhIGNhc2Ugd2hlcmUgYW4gPHBhY2thZ2VOYW1lPi9pbmRleC5kLnRzIGFuZCBhIDxwYWNrYWdlTmFtZT4vPHBhY2thZ2VOYW1lPi5kLnRzXG4gICAgLy8gYXJlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS4gSWYgd2UgYXJlIGxvb2tpbmcgZm9yIDxwYWNrYWdlTmFtZT4vPHBhY2thZ2VOYW1lPiBhbmQgZGlkbid0XG4gICAgLy8gZmluZCBpdCwgbG9vayBmb3IgPHBhY2thZ2VOYW1lPi9pbmRleC5kLnRzIGFzIHRoZSBwcm9ncmFtIG1pZ2h0IGhhdmUgZm91bmQgdGhhdCBpbnN0ZWFkLlxuICAgIGNvbnN0IHAgPSB0eXBlLmZpbGVQYXRoO1xuICAgIGNvbnN0IG0gPSBwLm1hdGNoKElOREVYX1BBVFRFUk4pO1xuICAgIGlmIChtKSB7XG4gICAgICBjb25zdCBpbmRleFZlcnNpb24gPSBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHApLCAnaW5kZXguZC50cycpO1xuICAgICAgc291cmNlRmlsZSA9IGNvbnRleHQucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGluZGV4VmVyc2lvbik7XG4gICAgfVxuICB9XG4gIGlmIChzb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgbW9kdWxlU3ltYm9sID0gKHNvdXJjZUZpbGUgYXMgYW55KS5tb2R1bGUgfHwgKHNvdXJjZUZpbGUgYXMgYW55KS5zeW1ib2w7XG4gICAgY29uc3QgZXhwb3J0cyA9IGNvbnRleHQuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKTtcbiAgICByZXR1cm4gKGV4cG9ydHMgfHwgW10pLmZpbmQoc3ltYm9sID0+IHN5bWJvbC5uYW1lID09IHR5cGUubmFtZSk7XG4gIH1cbn1cblxuY2xhc3MgRW1wdHlUYWJsZSBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgcHVibGljIHJlYWRvbmx5IHNpemU6IG51bWJlciA9IDA7XG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gZmFsc2U7IH1cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHsgcmV0dXJuIFtdOyB9XG4gIHN0YXRpYyBpbnN0YW5jZSA9IG5ldyBFbXB0eVRhYmxlKCk7XG59XG5cbmZ1bmN0aW9uIGlzU3ltYm9sUHJpdmF0ZShzOiB0cy5TeW1ib2wpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhcy52YWx1ZURlY2xhcmF0aW9uICYmIGlzUHJpdmF0ZShzLnZhbHVlRGVjbGFyYXRpb24pO1xufVxuXG5mdW5jdGlvbiBnZXRUc1R5cGVGcm9tQnVpbHRpblR5cGUoYnVpbHRpblR5cGU6IEJ1aWx0aW5UeXBlLCBjdHg6IFR5cGVDb250ZXh0KTogdHMuVHlwZSB7XG4gIGxldCBzeW50YXhLaW5kOiB0cy5TeW50YXhLaW5kO1xuICBzd2l0Y2ggKGJ1aWx0aW5UeXBlKSB7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICBzeW50YXhLaW5kID0gdHMuU3ludGF4S2luZC5BbnlLZXl3b3JkO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5Cb29sZWFuOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuQm9vbGVhbktleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bGw6XG4gICAgICBzeW50YXhLaW5kID0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuTnVtYmVyS2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuVW5kZWZpbmVkOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuVW5kZWZpbmVkS2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludGVybmFsIGVycm9yLCB1bmhhbmRsZWQgbGl0ZXJhbCBraW5kICR7YnVpbHRpblR5cGV9OiR7QnVpbHRpblR5cGVbYnVpbHRpblR5cGVdfWApO1xuICB9XG4gIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVOb2RlKHN5bnRheEtpbmQpO1xuICBub2RlLnBhcmVudCA9IGN0eC5ub2RlO1xuICByZXR1cm4gY3R4LmNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG59XG5cbmZ1bmN0aW9uIHNwYW5BdChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTogU3Bhbnx1bmRlZmluZWQge1xuICBpZiAobGluZSAhPSBudWxsICYmIGNvbHVtbiAhPSBudWxsKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0cy5nZXRQb3NpdGlvbk9mTGluZUFuZENoYXJhY3Rlcihzb3VyY2VGaWxlLCBsaW5lLCBjb2x1bW4pO1xuICAgIGNvbnN0IGZpbmRDaGlsZCA9IGZ1bmN0aW9uIGZpbmRDaGlsZChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB8IHVuZGVmaW5lZCB7XG4gICAgICBpZiAobm9kZS5raW5kID4gdHMuU3ludGF4S2luZC5MYXN0VG9rZW4gJiYgbm9kZS5wb3MgPD0gcG9zaXRpb24gJiYgbm9kZS5lbmQgPiBwb3NpdGlvbikge1xuICAgICAgICBjb25zdCBiZXR0ZXJOb2RlID0gdHMuZm9yRWFjaENoaWxkKG5vZGUsIGZpbmRDaGlsZCk7XG4gICAgICAgIHJldHVybiBiZXR0ZXJOb2RlIHx8IG5vZGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgZmluZENoaWxkKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIHtzdGFydDogbm9kZS5nZXRTdGFydCgpLCBlbmQ6IG5vZGUuZ2V0RW5kKCl9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sKTogRGVmaW5pdGlvbiB7XG4gIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHN5bWJvbC5kZWNsYXJhdGlvbnM7XG4gIGlmIChkZWNsYXJhdGlvbnMpIHtcbiAgICByZXR1cm4gZGVjbGFyYXRpb25zLm1hcChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmlsZU5hbWU6IHNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICAgIHNwYW46IHtzdGFydDogZGVjbGFyYXRpb24uZ2V0U3RhcnQoKSwgZW5kOiBkZWNsYXJhdGlvbi5nZXRFbmQoKX1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyZW50RGVjbGFyYXRpb25PZihub2RlOiB0cy5Ob2RlKTogdHMuTm9kZXx1bmRlZmluZWQge1xuICB3aGlsZSAobm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JbnRlcmZhY2VEZWNsYXJhdGlvbjpcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU291cmNlRmlsZTpcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50ICE7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyT2Yoc3ltYm9sOiB0cy5TeW1ib2wsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGlmIChzeW1ib2wuZ2V0RmxhZ3MoKSAmIHRzLlN5bWJvbEZsYWdzLkNsYXNzTWVtYmVyICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IGRlY2xhcmF0aW9uIG9mIHN5bWJvbC5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHBhcmVudERlY2xhcmF0aW9uT2YoZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBjb25zdCB0eXBlID0gY29udGV4dC5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHBhcmVudCk7XG4gICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0eXBlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlS2luZE9mKHR5cGU6IHRzLlR5cGUgfCB1bmRlZmluZWQpOiBCdWlsdGluVHlwZSB7XG4gIGlmICh0eXBlKSB7XG4gICAgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuQW55KSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuQW55O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLlN0cmluZyB8IHRzLlR5cGVGbGFncy5TdHJpbmdMaWtlIHwgdHMuVHlwZUZsYWdzLlN0cmluZ0xpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuU3RyaW5nO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuTnVtYmVyIHwgdHMuVHlwZUZsYWdzLk51bWJlckxpa2UpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVtYmVyO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuVW5kZWZpbmVkKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLk51bGwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVsbDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuVW5pb24pIHtcbiAgICAgIC8vIElmIGFsbCB0aGUgY29uc3RpdHVlbnQgdHlwZXMgb2YgYSB1bmlvbiBhcmUgdGhlIHNhbWUga2luZCwgaXQgaXMgYWxzbyB0aGF0IGtpbmQuXG4gICAgICBsZXQgY2FuZGlkYXRlOiBCdWlsdGluVHlwZXxudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IHVuaW9uVHlwZSA9IHR5cGUgYXMgdHMuVW5pb25UeXBlO1xuICAgICAgaWYgKHVuaW9uVHlwZS50eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNhbmRpZGF0ZSA9IHR5cGVLaW5kT2YodW5pb25UeXBlLnR5cGVzWzBdKTtcbiAgICAgICAgZm9yIChjb25zdCBzdWJUeXBlIG9mIHVuaW9uVHlwZS50eXBlcykge1xuICAgICAgICAgIGlmIChjYW5kaWRhdGUgIT0gdHlwZUtpbmRPZihzdWJUeXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLk90aGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNhbmRpZGF0ZSAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgdHMuVHlwZUZsYWdzLlR5cGVQYXJhbWV0ZXIpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5VbmJvdW5kO1xuICAgIH1cbiAgfVxuICByZXR1cm4gQnVpbHRpblR5cGUuT3RoZXI7XG59XG5cbmZ1bmN0aW9uIGdldEZyb21TeW1ib2xUYWJsZShzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGUsIGtleTogc3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRhYmxlID0gc3ltYm9sVGFibGUgYXMgYW55O1xuICBsZXQgc3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuXG4gIGlmICh0eXBlb2YgdGFibGUuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVFMgMi4yIHVzZXMgYSBNYXBcbiAgICBzeW1ib2wgPSB0YWJsZS5nZXQoa2V5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUUyBwcmUtMi4yIHVzZXMgYW4gb2JqZWN0XG4gICAgc3ltYm9sID0gdGFibGVba2V5XTtcbiAgfVxuXG4gIHJldHVybiBzeW1ib2w7XG59XG4iXX0=