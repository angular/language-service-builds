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
        TypeScriptSymbolQuery.prototype.getArrayType = function (type) {
            return this.getBuiltinType(symbols_1.BuiltinType.Any);
        };
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
            get: function () {
                return this.context.checker.typeToString(this.tsType);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TypeWrapper.prototype, "callable", {
            get: function () {
                return typeCallable(this.tsType);
            },
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
        TypeWrapper.prototype.signatures = function () {
            return signaturesOf(this.tsType, this.context);
        };
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
        /**
         * Type of the TypeScript symbol, if known. If not provided, the type of the symbol
         * will be determined dynamically; see `SymbolWrapper#tsType`.
         */
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
            get: function () {
                return this.symbol.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "kind", {
            get: function () {
                return this.callable ? 'method' : 'property';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "type", {
            get: function () {
                return new TypeWrapper(this.tsType, this.context);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "container", {
            get: function () {
                return getContainerOf(this.symbol, this.context);
            },
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
            get: function () {
                return typeCallable(this.tsType);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SymbolWrapper.prototype, "definition", {
            get: function () {
                return definitionFromTsSymbol(this.symbol);
            },
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
        SymbolWrapper.prototype.signatures = function () {
            return signaturesOf(this.tsType, this.context);
        };
        SymbolWrapper.prototype.selectSignature = function (types) {
            return selectSignature(this.tsType, this.context, types);
        };
        SymbolWrapper.prototype.indexed = function (argument) {
            return undefined;
        };
        SymbolWrapper.prototype.typeArguments = function () {
            return this.type.typeArguments();
        };
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
            get: function () {
                return this.declaration.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "kind", {
            get: function () {
                return this.declaration.kind;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "container", {
            get: function () {
                return undefined;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "type", {
            get: function () {
                return this.declaration.type;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "callable", {
            get: function () {
                return this.type.callable;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "definition", {
            get: function () {
                return this.declaration.definition;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "documentation", {
            get: function () {
                return this.declaration.type.documentation;
            },
            enumerable: true,
            configurable: true
        });
        DeclaredSymbol.prototype.members = function () {
            return this.type.members();
        };
        DeclaredSymbol.prototype.signatures = function () {
            return this.type.signatures();
        };
        DeclaredSymbol.prototype.selectSignature = function (types) {
            return this.type.selectSignature(types);
        };
        DeclaredSymbol.prototype.typeArguments = function () {
            return this.type.typeArguments();
        };
        DeclaredSymbol.prototype.indexed = function (argument) {
            return undefined;
        };
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
            get: function () {
                return new TypeWrapper(this.signature.getReturnType(), this.context);
            },
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
            get: function () {
                return this.signature.arguments;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SignatureResultOverride.prototype, "result", {
            get: function () {
                return this.resultType;
            },
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
            get: function () {
                return this.symbols.length;
            },
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
            get: function () {
                return this.map.size;
            },
            enumerable: true,
            configurable: true
        });
        MapSymbolTable.prototype.get = function (key) {
            return this.map.get(key);
        };
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
        MapSymbolTable.prototype.has = function (key) {
            return this.map.has(key);
        };
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
            get: function () {
                return this.pipes.length;
            },
            enumerable: true,
            configurable: true
        });
        PipesTable.prototype.get = function (key) {
            var pipe = this.pipes.find(function (pipe) { return pipe.name == key; });
            if (pipe) {
                return new PipeSymbol(pipe, this.context);
            }
        };
        PipesTable.prototype.has = function (key) {
            return this.pipes.find(function (pipe) { return pipe.name == key; }) != null;
        };
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
            get: function () {
                return this.pipe.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PipeSymbol.prototype, "type", {
            get: function () {
                return new TypeWrapper(this.tsType, this.context);
            },
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
        PipeSymbol.prototype.members = function () {
            return EmptyTable.instance;
        };
        PipeSymbol.prototype.signatures = function () {
            return signaturesOf(this.tsType, this.context);
        };
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
        PipeSymbol.prototype.indexed = function (argument) {
            return undefined;
        };
        PipeSymbol.prototype.typeArguments = function () {
            return this.type.typeArguments();
        };
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
        EmptyTable.prototype.get = function (key) {
            return undefined;
        };
        EmptyTable.prototype.has = function (key) {
            return false;
        };
        EmptyTable.prototype.values = function () {
            return [];
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zeW1ib2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsaUVBQXlJO0lBRXpJLHNDQUFzQztJQUN0QywyQ0FBMkM7SUFDM0MsSUFBTSxTQUFTLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsVUFBQyxJQUFhO1lBQ1YsT0FBQSxDQUFDLENBQUMsQ0FBRSxFQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFBbEYsQ0FBa0YsQ0FBQyxDQUFDLENBQUM7UUFDMUYsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBOUMsQ0FBOEMsQ0FBQyxDQUFDO0lBRXhFLElBQU0sZUFBZSxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxDQUFDLFVBQUMsSUFBYTtZQUNWLE9BQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBSSxFQUFVLENBQUMsU0FBUyxDQUFDLE1BQU07Z0JBQ3hDLElBQVksQ0FBQyxXQUFXLEdBQUksRUFBVSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFEakUsQ0FDaUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBQyxDQUFD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QUksU0FBUyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQ0FDcEMsT0FBTyxxQkFBVyxDQUFDLEtBQUssQ0FBQzs2QkFDMUI7eUJBQ0Y7Ozs7Ozs7OztpQkFDRjtnQkFDRCxJQUFJLFNBQVMsSUFBSSxJQUFJLEVBQUU7b0JBQ3JCLE9BQU8sU0FBUyxDQUFDO2lCQUNsQjthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtnQkFDbEQsT0FBTyxxQkFBVyxDQUFDLE9BQU8sQ0FBQzthQUM1QjtTQUNGO1FBQ0QsT0FBTyxxQkFBVyxDQUFDLEtBQUssQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxXQUEyQixFQUFFLEdBQVc7UUFDbEUsSUFBTSxLQUFLLEdBQUcsV0FBa0IsQ0FBQztRQUNqQyxJQUFJLE1BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssQ0FBQyxHQUFHLEtBQUssVUFBVSxFQUFFO1lBQ25DLG9CQUFvQjtZQUNwQixNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QjthQUFNO1lBQ0wsNEJBQTRCO1lBQzVCLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckI7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVQaXBlU3VtbWFyeSwgU3RhdGljU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QnVpbHRpblR5cGUsIERlY2xhcmF0aW9uS2luZCwgRGVmaW5pdGlvbiwgU2lnbmF0dXJlLCBTcGFuLCBTeW1ib2wsIFN5bWJvbERlY2xhcmF0aW9uLCBTeW1ib2xRdWVyeSwgU3ltYm9sVGFibGV9IGZyb20gJy4vc3ltYm9scyc7XG5cbi8vIEluIFR5cGVTY3JpcHQgMi4xIHRoZXNlIGZsYWdzIG1vdmVkXG4vLyBUaGVzZSBoZWxwZXJzIHdvcmsgZm9yIGJvdGggMi4wIGFuZCAyLjEuXG5jb25zdCBpc1ByaXZhdGUgPSAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzID9cbiAgICAoKG5vZGU6IHRzLk5vZGUpID0+XG4gICAgICAgICAhISgodHMgYXMgYW55KS5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSkgJiAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzLlByaXZhdGUpKSA6XG4gICAgKChub2RlOiB0cy5Ob2RlKSA9PiAhIShub2RlLmZsYWdzICYgKHRzIGFzIGFueSkuTm9kZUZsYWdzLlByaXZhdGUpKTtcblxuY29uc3QgaXNSZWZlcmVuY2VUeXBlID0gKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MgP1xuICAgICgodHlwZTogdHMuVHlwZSkgPT5cbiAgICAgICAgICEhKHR5cGUuZmxhZ3MgJiAodHMgYXMgYW55KS5UeXBlRmxhZ3MuT2JqZWN0ICYmXG4gICAgICAgICAgICAodHlwZSBhcyBhbnkpLm9iamVjdEZsYWdzICYgKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MuUmVmZXJlbmNlKSkgOlxuICAgICgodHlwZTogdHMuVHlwZSkgPT4gISEodHlwZS5mbGFncyAmICh0cyBhcyBhbnkpLlR5cGVGbGFncy5SZWZlcmVuY2UpKTtcblxuaW50ZXJmYWNlIFR5cGVDb250ZXh0IHtcbiAgbm9kZTogdHMuTm9kZTtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTeW1ib2xRdWVyeShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGZldGNoUGlwZXM6ICgpID0+IFN5bWJvbFRhYmxlKTogU3ltYm9sUXVlcnkge1xuICByZXR1cm4gbmV3IFR5cGVTY3JpcHRTeW1ib2xRdWVyeShwcm9ncmFtLCBjaGVja2VyLCBzb3VyY2UsIGZldGNoUGlwZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NNZW1iZXJzKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzdGF0aWNTeW1ib2w6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbFRhYmxlfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRlY2xhcmF0aW9uID0gZ2V0Q2xhc3NGcm9tU3RhdGljU3ltYm9sKHByb2dyYW0sIHN0YXRpY1N5bWJvbCk7XG4gIGlmIChkZWNsYXJhdGlvbikge1xuICAgIGNvbnN0IHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCBub2RlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHN0YXRpY1N5bWJvbC5maWxlUGF0aCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGUsIHByb2dyYW0sIGNoZWNrZXJ9KS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc01lbWJlcnNGcm9tRGVjbGFyYXRpb24oXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICBkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbikge1xuICBjb25zdCB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihkZWNsYXJhdGlvbik7XG4gIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGU6IHNvdXJjZSwgcHJvZ3JhbSwgY2hlY2tlcn0pLm1lbWJlcnMoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzRnJvbVN0YXRpY1N5bWJvbChcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCB0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5DbGFzc0RlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHNvdXJjZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgaWYgKHNvdXJjZSkge1xuICAgIHJldHVybiB0cy5mb3JFYWNoQ2hpbGQoc291cmNlLCBjaGlsZCA9PiB7XG4gICAgICBpZiAoY2hpbGQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjaGlsZCBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lICE9IG51bGwgJiYgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQgPT09IHR5cGUubmFtZSkge1xuICAgICAgICAgIHJldHVybiBjbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkgYXMgKHRzLkNsYXNzRGVjbGFyYXRpb24gfCB1bmRlZmluZWQpO1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBpcGVzVGFibGUoXG4gICAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10pOiBTeW1ib2xUYWJsZSB7XG4gIHJldHVybiBuZXcgUGlwZXNUYWJsZShwaXBlcywge3Byb2dyYW0sIGNoZWNrZXIsIG5vZGU6IHNvdXJjZX0pO1xufVxuXG5jbGFzcyBUeXBlU2NyaXB0U3ltYm9sUXVlcnkgaW1wbGVtZW50cyBTeW1ib2xRdWVyeSB7XG4gIHByaXZhdGUgdHlwZUNhY2hlID0gbmV3IE1hcDxCdWlsdGluVHlwZSwgU3ltYm9sPigpO1xuICBwcml2YXRlIHBpcGVzQ2FjaGU6IFN5bWJvbFRhYmxlfHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBwcml2YXRlIGZldGNoUGlwZXM6ICgpID0+IFN5bWJvbFRhYmxlKSB7fVxuXG4gIGdldFR5cGVLaW5kKHN5bWJvbDogU3ltYm9sKTogQnVpbHRpblR5cGUge1xuICAgIGNvbnN0IHR5cGUgPSBzeW1ib2wgaW5zdGFuY2VvZiBUeXBlV3JhcHBlciA/IHN5bWJvbC50c1R5cGUgOiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHR5cGVLaW5kT2YodHlwZSk7XG4gIH1cblxuICBnZXRCdWlsdGluVHlwZShraW5kOiBCdWlsdGluVHlwZSk6IFN5bWJvbCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMudHlwZUNhY2hlLmdldChraW5kKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgY29uc3QgdHlwZSA9IGdldFRzVHlwZUZyb21CdWlsdGluVHlwZShraW5kLCB7XG4gICAgICAgIGNoZWNrZXI6IHRoaXMuY2hlY2tlcixcbiAgICAgICAgbm9kZTogdGhpcy5zb3VyY2UsXG4gICAgICAgIHByb2dyYW06IHRoaXMucHJvZ3JhbSxcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0ID1cbiAgICAgICAgICBuZXcgVHlwZVdyYXBwZXIodHlwZSwge3Byb2dyYW06IHRoaXMucHJvZ3JhbSwgY2hlY2tlcjogdGhpcy5jaGVja2VyLCBub2RlOiB0aGlzLnNvdXJjZX0pO1xuICAgICAgdGhpcy50eXBlQ2FjaGUuc2V0KGtpbmQsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUeXBlVW5pb24oLi4udHlwZXM6IFN5bWJvbFtdKTogU3ltYm9sIHtcbiAgICAvLyBObyBBUEkgZXhpc3RzIHNvIHJldHVybiBhbnkgaWYgdGhlIHR5cGVzIGFyZSBub3QgYWxsIHRoZSBzYW1lIHR5cGUuXG4gICAgbGV0IHJlc3VsdDogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZXMubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSB0eXBlc1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVzW2ldICE9IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIGdldEFycmF5VHlwZSh0eXBlOiBTeW1ib2wpOiBTeW1ib2wge1xuICAgIHJldHVybiB0aGlzLmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG4gIH1cblxuICBnZXRFbGVtZW50VHlwZSh0eXBlOiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAodHlwZSBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSB7XG4gICAgICBjb25zdCB0eSA9IHR5cGUudHNUeXBlO1xuICAgICAgY29uc3QgdHlBcmdzID0gdHlwZS50eXBlQXJndW1lbnRzKCk7XG4gICAgICAvLyBUT0RPKGF5YXpoYWZpeik6IFRyYWNrIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc3MTEgdG8gZXhwb3NlXG4gICAgICAvLyBgaXNBcnJheUxpa2VUeXBlYCBhcyBhIHB1YmxpYyBtZXRob2QuXG4gICAgICBpZiAoISh0aGlzLmNoZWNrZXIgYXMgYW55KS5pc0FycmF5TGlrZVR5cGUodHkpIHx8IHR5QXJncz8ubGVuZ3RoICE9PSAxKSByZXR1cm47XG4gICAgICByZXR1cm4gdHlBcmdzWzBdO1xuICAgIH1cbiAgfVxuXG4gIGdldE5vbk51bGxhYmxlVHlwZShzeW1ib2w6IFN5bWJvbCk6IFN5bWJvbCB7XG4gICAgaWYgKHN5bWJvbCBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyICYmICh0eXBlb2YgdGhpcy5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSA9PSAnZnVuY3Rpb24nKSkge1xuICAgICAgY29uc3QgdHNUeXBlID0gc3ltYm9sLnRzVHlwZTtcbiAgICAgIGNvbnN0IG5vbk51bGxhYmxlVHlwZSA9IHRoaXMuY2hlY2tlci5nZXROb25OdWxsYWJsZVR5cGUodHNUeXBlKTtcbiAgICAgIGlmIChub25OdWxsYWJsZVR5cGUgIT0gdHNUeXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIobm9uTnVsbGFibGVUeXBlLCBzeW1ib2wuY29udGV4dCk7XG4gICAgICB9IGVsc2UgaWYgKG5vbk51bGxhYmxlVHlwZSA9PSB0c1R5cGUpIHtcbiAgICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIGdldFBpcGVzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5waXBlc0NhY2hlO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnBpcGVzQ2FjaGUgPSB0aGlzLmZldGNoUGlwZXMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFRlbXBsYXRlQ29udGV4dCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2xUYWJsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVDb250ZXh0ID0ge25vZGU6IHRoaXMuc291cmNlLCBwcm9ncmFtOiB0aGlzLnByb2dyYW0sIGNoZWNrZXI6IHRoaXMuY2hlY2tlcn07XG4gICAgY29uc3QgdHlwZVN5bWJvbCA9IGZpbmRDbGFzc1N5bWJvbEluQ29udGV4dCh0eXBlLCBjb250ZXh0KTtcbiAgICBpZiAodHlwZVN5bWJvbCkge1xuICAgICAgY29uc3QgY29udGV4dFR5cGUgPSB0aGlzLmdldFRlbXBsYXRlUmVmQ29udGV4dFR5cGUodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gICAgICBpZiAoY29udGV4dFR5cGUpIHJldHVybiBjb250ZXh0VHlwZS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHlwZVN5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlQ29udGV4dCA9IHtub2RlOiB0aGlzLnNvdXJjZSwgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXJ9O1xuICAgIGNvbnN0IHR5cGVTeW1ib2wgPSBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIHR5cGVTeW1ib2wgJiYgbmV3IFN5bWJvbFdyYXBwZXIodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gIH1cblxuICBjcmVhdGVTeW1ib2xUYWJsZShzeW1ib2xzOiBTeW1ib2xEZWNsYXJhdGlvbltdKTogU3ltYm9sVGFibGUge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXBTeW1ib2xUYWJsZSgpO1xuICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9scy5tYXAocyA9PiBuZXcgRGVjbGFyZWRTeW1ib2wocykpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgbWVyZ2VTeW1ib2xUYWJsZShzeW1ib2xUYWJsZXM6IFN5bWJvbFRhYmxlW10pOiBTeW1ib2xUYWJsZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcFN5bWJvbFRhYmxlKCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2xUYWJsZSBvZiBzeW1ib2xUYWJsZXMpIHtcbiAgICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9sVGFibGUudmFsdWVzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0U3BhbkF0KGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNwYW5BdCh0aGlzLnNvdXJjZSwgbGluZSwgY29sdW1uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sOiB0cy5TeW1ib2wsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHR5cGVTeW1ib2wsIHRoaXMuc291cmNlKTtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IHR5cGUuc3ltYm9sICYmIHR5cGUuc3ltYm9sLm1lbWJlcnMgJiZcbiAgICAgICAgZ2V0RnJvbVN5bWJvbFRhYmxlKHR5cGUuc3ltYm9sLm1lbWJlcnMhLCAnX19jb25zdHJ1Y3RvcicpO1xuXG4gICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvckRlY2xhcmF0aW9uID0gY29uc3RydWN0b3IuZGVjbGFyYXRpb25zIVswXSBhcyB0cy5Db25zdHJ1Y3RvclR5cGVOb2RlO1xuICAgICAgZm9yIChjb25zdCBwYXJhbWV0ZXIgb2YgY29uc3RydWN0b3JEZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24ocGFyYW1ldGVyLnR5cGUhKTtcbiAgICAgICAgaWYgKHR5cGUuc3ltYm9sIS5uYW1lID09ICdUZW1wbGF0ZVJlZicgJiYgaXNSZWZlcmVuY2VUeXBlKHR5cGUpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZVdyYXBwZXIgPSBuZXcgVHlwZVdyYXBwZXIodHlwZSwgY29udGV4dCk7XG4gICAgICAgICAgY29uc3QgdHlwZUFyZ3VtZW50cyA9IHR5cGVXcmFwcGVyLnR5cGVBcmd1bWVudHMoKTtcbiAgICAgICAgICBpZiAodHlwZUFyZ3VtZW50cyAmJiB0eXBlQXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVBcmd1bWVudHNbMF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHR5cGVDYWxsYWJsZSh0eXBlOiB0cy5UeXBlKTogYm9vbGVhbiB7XG4gIGNvbnN0IHNpZ25hdHVyZXMgPSB0eXBlLmdldENhbGxTaWduYXR1cmVzKCk7XG4gIHJldHVybiBzaWduYXR1cmVzICYmIHNpZ25hdHVyZXMubGVuZ3RoICE9IDA7XG59XG5cbmZ1bmN0aW9uIHNpZ25hdHVyZXNPZih0eXBlOiB0cy5UeXBlLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IFNpZ25hdHVyZVtdIHtcbiAgcmV0dXJuIHR5cGUuZ2V0Q2FsbFNpZ25hdHVyZXMoKS5tYXAocyA9PiBuZXcgU2lnbmF0dXJlV3JhcHBlcihzLCBjb250ZXh0KSk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdFNpZ25hdHVyZSh0eXBlOiB0cy5UeXBlLCBjb250ZXh0OiBUeXBlQ29udGV4dCwgdHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfFxuICAgIHVuZGVmaW5lZCB7XG4gIC8vIFRPRE86IERvIGEgYmV0dGVyIGpvYiBvZiBzZWxlY3RpbmcgdGhlIHJpZ2h0IHNpZ25hdHVyZS4gVHlwZVNjcmlwdCBkb2VzIG5vdCBjdXJyZW50bHkgc3VwcG9ydCBhXG4gIC8vIFR5cGUgUmVsYXRpb25zaGlwIEFQSSAoc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3ZzY29kZS1uZy1sYW5ndWFnZS1zZXJ2aWNlL2lzc3Vlcy8xNDMpLlxuICAvLyBDb25zaWRlciBjcmVhdGluZyBhIFR5cGVDaGVja0Jsb2NrIGhvc3QgaW4gdGhlIGxhbmd1YWdlIHNlcnZpY2UgdGhhdCBtYXkgYWxzbyBhY3QgYXMgYVxuICAvLyBzY3JhdGNocGFkIGZvciB0eXBlIGNvbXBhcmlzb25zLlxuICBjb25zdCBzaWduYXR1cmVzID0gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpO1xuICByZXR1cm4gc2lnbmF0dXJlcy5sZW5ndGggPyBuZXcgU2lnbmF0dXJlV3JhcHBlcihzaWduYXR1cmVzWzBdLCBjb250ZXh0KSA6IHVuZGVmaW5lZDtcbn1cblxuY2xhc3MgVHlwZVdyYXBwZXIgaW1wbGVtZW50cyBTeW1ib2wge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgdHNUeXBlOiB0cy5UeXBlLCBwdWJsaWMgY29udGV4dDogVHlwZUNvbnRleHQpIHtcbiAgICBpZiAoIXRzVHlwZSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0ludGVybmFsOiBudWxsIHR5cGUnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci50eXBlVG9TdHJpbmcodGhpcy50c1R5cGUpO1xuICB9XG5cbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERlY2xhcmF0aW9uS2luZCA9ICd0eXBlJztcblxuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcblxuICBwdWJsaWMgcmVhZG9ubHkgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgcmVhZG9ubHkgY29udGFpbmVyOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZUNhbGxhYmxlKHRoaXMudHNUeXBlKTtcbiAgfVxuXG4gIGdldCBudWxsYWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0Tm9uTnVsbGFibGVUeXBlKHRoaXMudHNUeXBlKSAhPSB0aGlzLnRzVHlwZTtcbiAgfVxuXG4gIGdldCBkb2N1bWVudGF0aW9uKCk6IHRzLlN5bWJvbERpc3BsYXlQYXJ0W10ge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBzeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQodGhpcy5jb250ZXh0LmNoZWNrZXIpO1xuICB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIHJldHVybiBzeW1ib2wgPyBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHN5bWJvbCkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICAvLyBTaG91bGQgY2FsbCBnZXRBcHBhcmVudFByb3BlcnRpZXMoKSBpbnN0ZWFkIG9mIGdldFByb3BlcnRpZXMoKSBiZWNhdXNlXG4gICAgLy8gdGhlIGZvcm1lciBpbmNsdWRlcyBwcm9wZXJ0aWVzIG9uIHRoZSBiYXNlIGNsYXNzIHdoZXJlYXMgdGhlIGxhdHRlciBkb2VzXG4gICAgLy8gbm90LiBUaGlzIHByb3ZpZGVzIHByb3BlcnRpZXMgbGlrZSAuYmluZCgpLCAuY2FsbCgpLCAuYXBwbHkoKSwgZXRjIGZvclxuICAgIC8vIGZ1bmN0aW9ucy5cbiAgICByZXR1cm4gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnRzVHlwZS5nZXRBcHBhcmVudFByb3BlcnRpZXMoKSwgdGhpcy5jb250ZXh0LCB0aGlzLnRzVHlwZSk7XG4gIH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHtcbiAgICByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpO1xuICB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZCh0eXBlOiBTeW1ib2wsIHZhbHVlOiBhbnkpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAoISh0eXBlIGluc3RhbmNlb2YgVHlwZVdyYXBwZXIpKSByZXR1cm47XG5cbiAgICBjb25zdCB0eXBlS2luZCA9IHR5cGVLaW5kT2YodHlwZS50c1R5cGUpO1xuICAgIHN3aXRjaCAodHlwZUtpbmQpIHtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICBjb25zdCBuVHlwZSA9IHRoaXMudHNUeXBlLmdldE51bWJlckluZGV4VHlwZSgpO1xuICAgICAgICBpZiAoblR5cGUpIHtcbiAgICAgICAgICAvLyBnZXQgdGhlIHJpZ2h0IHR1cGxlIHR5cGUgYnkgdmFsdWUsIGxpa2UgJ3ZhciB0OiBbbnVtYmVyLCBzdHJpbmddOydcbiAgICAgICAgICBpZiAoblR5cGUuaXNVbmlvbigpKSB7XG4gICAgICAgICAgICAvLyByZXR1cm4gdW5kZWZpbmVkIGlmIGFycmF5IGluZGV4IG91dCBvZiBib3VuZC5cbiAgICAgICAgICAgIHJldHVybiBuVHlwZS50eXBlc1t2YWx1ZV0gJiYgbmV3IFR5cGVXcmFwcGVyKG5UeXBlLnR5cGVzW3ZhbHVlXSwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcihuVHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgIGNvbnN0IHNUeXBlID0gdGhpcy50c1R5cGUuZ2V0U3RyaW5nSW5kZXhUeXBlKCk7XG4gICAgICAgIHJldHVybiBzVHlwZSAmJiBuZXcgVHlwZVdyYXBwZXIoc1R5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgdHlwZUFyZ3VtZW50cygpOiBTeW1ib2xbXXx1bmRlZmluZWQge1xuICAgIGlmICghaXNSZWZlcmVuY2VUeXBlKHRoaXMudHNUeXBlKSkgcmV0dXJuO1xuXG4gICAgY29uc3QgdHlwZVJlZmVyZW5jZSA9ICh0aGlzLnRzVHlwZSBhcyB0cy5UeXBlUmVmZXJlbmNlKTtcbiAgICBsZXQgdHlwZUFyZ3VtZW50czogUmVhZG9ubHlBcnJheTx0cy5UeXBlPnx1bmRlZmluZWQ7XG4gICAgdHlwZUFyZ3VtZW50cyA9IHRoaXMuY29udGV4dC5jaGVja2VyLmdldFR5cGVBcmd1bWVudHModHlwZVJlZmVyZW5jZSk7XG4gICAgaWYgKCF0eXBlQXJndW1lbnRzKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0eXBlQXJndW1lbnRzLm1hcCh0YSA9PiBuZXcgVHlwZVdyYXBwZXIodGEsIHRoaXMuY29udGV4dCkpO1xuICB9XG59XG5cbi8vIElmIHN0cmluZ0luZGV4VHlwZSBhIHByaW1pdGl2ZSB0eXBlKGUuZy4gJ3N0cmluZycpLCB0aGUgU3ltYm9sIGlzIHVuZGVmaW5lZDtcbi8vIGFuZCBpbiBBc3RUeXBlLnJlc29sdmVQcm9wZXJ0eVJlYWQgbWV0aG9kLCB0aGUgU3ltYm9sLnR5cGUgc2hvdWxkIGdldCB0aGUgcmlnaHQgdHlwZS5cbmNsYXNzIFN0cmluZ0luZGV4VHlwZVdyYXBwZXIgZXh0ZW5kcyBUeXBlV3JhcHBlciB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlID0gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpO1xufVxuXG5jbGFzcyBTeW1ib2xXcmFwcGVyIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHJpdmF0ZSBzeW1ib2w6IHRzLlN5bWJvbDtcbiAgcHJpdmF0ZSBfbWVtYmVycz86IFN5bWJvbFRhYmxlO1xuXG4gIHB1YmxpYyByZWFkb25seSBudWxsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHN5bWJvbDogdHMuU3ltYm9sLFxuICAgICAgLyoqIFR5cGVTY3JpcHQgdHlwZSBjb250ZXh0IG9mIHRoZSBzeW1ib2wuICovXG4gICAgICBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0LFxuICAgICAgLyoqXG4gICAgICAgKiBUeXBlIG9mIHRoZSBUeXBlU2NyaXB0IHN5bWJvbCwgaWYga25vd24uIElmIG5vdCBwcm92aWRlZCwgdGhlIHR5cGUgb2YgdGhlIHN5bWJvbFxuICAgICAgICogd2lsbCBiZSBkZXRlcm1pbmVkIGR5bmFtaWNhbGx5OyBzZWUgYFN5bWJvbFdyYXBwZXIjdHNUeXBlYC5cbiAgICAgICAqL1xuICAgICAgcHJpdmF0ZSBfdHNUeXBlPzogdHMuVHlwZSkge1xuICAgIHRoaXMuc3ltYm9sID0gc3ltYm9sICYmIGNvbnRleHQgJiYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSA/XG4gICAgICAgIGNvbnRleHQuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOlxuICAgICAgICBzeW1ib2w7XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnN5bWJvbC5uYW1lO1xuICB9XG5cbiAgZ2V0IGtpbmQoKTogRGVjbGFyYXRpb25LaW5kIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsYWJsZSA/ICdtZXRob2QnIDogJ3Byb3BlcnR5JztcbiAgfVxuXG4gIGdldCB0eXBlKCk6IFR5cGVXcmFwcGVyIHtcbiAgICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpO1xuICB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gZ2V0Q29udGFpbmVyT2YodGhpcy5zeW1ib2wsIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4ge1xuICAgIC8vIFN5bWJvbHMgdGhhdCBhcmUgbm90IGV4cGxpY2l0bHkgbWFkZSBwcml2YXRlIGFyZSBwdWJsaWMuXG4gICAgcmV0dXJuICFpc1N5bWJvbFByaXZhdGUodGhpcy5zeW1ib2wpO1xuICB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlQ2FsbGFibGUodGhpcy50c1R5cGUpO1xuICB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbiB7XG4gICAgcmV0dXJuIGRlZmluaXRpb25Gcm9tVHNTeW1ib2wodGhpcy5zeW1ib2wpO1xuICB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KHRoaXMuY29udGV4dC5jaGVja2VyKTtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIGlmICghdGhpcy5fbWVtYmVycykge1xuICAgICAgaWYgKCh0aGlzLnN5bWJvbC5mbGFncyAmICh0cy5TeW1ib2xGbGFncy5DbGFzcyB8IHRzLlN5bWJvbEZsYWdzLkludGVyZmFjZSkpICE9IDApIHtcbiAgICAgICAgY29uc3QgZGVjbGFyZWRUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2wodGhpcy5zeW1ib2wpO1xuICAgICAgICBjb25zdCB0eXBlV3JhcHBlciA9IG5ldyBUeXBlV3JhcHBlcihkZWNsYXJlZFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuX21lbWJlcnMgPSB0eXBlV3JhcHBlci5tZW1iZXJzKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9tZW1iZXJzID0gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnN5bWJvbC5tZW1iZXJzISwgdGhpcy5jb250ZXh0LCB0aGlzLnRzVHlwZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9tZW1iZXJzO1xuICB9XG5cbiAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXSB7XG4gICAgcmV0dXJuIHNpZ25hdHVyZXNPZih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc2VsZWN0U2lnbmF0dXJlKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQsIHR5cGVzKTtcbiAgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudHlwZS50eXBlQXJndW1lbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGdldCB0c1R5cGUoKTogdHMuVHlwZSB7XG4gICAgbGV0IHR5cGUgPSB0aGlzLl90c1R5cGU7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID1cbiAgICAgICAgICB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHRoaXMuc3ltYm9sLCB0aGlzLmNvbnRleHQubm9kZSk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlO1xuICB9XG59XG5cbmNsYXNzIERlY2xhcmVkU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAnbmctdGVtcGxhdGUnO1xuXG4gIHB1YmxpYyByZWFkb25seSBudWxsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVjbGFyYXRpb246IFN5bWJvbERlY2xhcmF0aW9uKSB7fVxuXG4gIGdldCBuYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLm5hbWU7XG4gIH1cblxuICBnZXQga2luZCgpIHtcbiAgICByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5raW5kO1xuICB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IHR5cGUoKTogU3ltYm9sIHtcbiAgICByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlO1xuICB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnR5cGUuY2FsbGFibGU7XG4gIH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5kZWZpbml0aW9uO1xuICB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZS5kb2N1bWVudGF0aW9uO1xuICB9XG5cbiAgbWVtYmVycygpOiBTeW1ib2xUYWJsZSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZS5tZW1iZXJzKCk7XG4gIH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHtcbiAgICByZXR1cm4gdGhpcy50eXBlLnNpZ25hdHVyZXMoKTtcbiAgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy50eXBlLnNlbGVjdFNpZ25hdHVyZSh0eXBlcyk7XG4gIH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudHlwZS50eXBlQXJndW1lbnRzKCk7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmNsYXNzIFNpZ25hdHVyZVdyYXBwZXIgaW1wbGVtZW50cyBTaWduYXR1cmUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNpZ25hdHVyZTogdHMuU2lnbmF0dXJlLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBhcmd1bWVudHMoKTogU3ltYm9sVGFibGUge1xuICAgIHJldHVybiBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMuc2lnbmF0dXJlLmdldFBhcmFtZXRlcnMoKSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIGdldCByZXN1bHQoKTogU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMuc2lnbmF0dXJlLmdldFJldHVyblR5cGUoKSwgdGhpcy5jb250ZXh0KTtcbiAgfVxufVxuXG5jbGFzcyBTaWduYXR1cmVSZXN1bHRPdmVycmlkZSBpbXBsZW1lbnRzIFNpZ25hdHVyZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2lnbmF0dXJlOiBTaWduYXR1cmUsIHByaXZhdGUgcmVzdWx0VHlwZTogU3ltYm9sKSB7fVxuXG4gIGdldCBhcmd1bWVudHMoKTogU3ltYm9sVGFibGUge1xuICAgIHJldHVybiB0aGlzLnNpZ25hdHVyZS5hcmd1bWVudHM7XG4gIH1cblxuICBnZXQgcmVzdWx0KCk6IFN5bWJvbCB7XG4gICAgcmV0dXJuIHRoaXMucmVzdWx0VHlwZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9TeW1ib2xUYWJsZUZhY3Rvcnkoc3ltYm9sczogdHMuU3ltYm9sW10pOiB0cy5TeW1ib2xUYWJsZSB7XG4gIC8vIOKIgCBUeXBlc2NyaXB0IHZlcnNpb24gPj0gMi4yLCBgU3ltYm9sVGFibGVgIGlzIGltcGxlbWVudGVkIGFzIGFuIEVTNiBgTWFwYFxuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgdHMuU3ltYm9sPigpO1xuICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBzeW1ib2xzKSB7XG4gICAgcmVzdWx0LnNldChzeW1ib2wubmFtZSwgc3ltYm9sKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQgYXMgdHMuU3ltYm9sVGFibGU7XG59XG5cbmZ1bmN0aW9uIHRvU3ltYm9scyhzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGV8dW5kZWZpbmVkKTogdHMuU3ltYm9sW10ge1xuICBpZiAoIXN5bWJvbFRhYmxlKSByZXR1cm4gW107XG5cbiAgY29uc3QgdGFibGUgPSBzeW1ib2xUYWJsZSBhcyBhbnk7XG5cbiAgaWYgKHR5cGVvZiB0YWJsZS52YWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWJsZS52YWx1ZXMoKSkgYXMgdHMuU3ltYm9sW107XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IHRzLlN5bWJvbFtdID0gW107XG5cbiAgY29uc3Qgb3duID0gdHlwZW9mIHRhYmxlLmhhc093blByb3BlcnR5ID09PSAnZnVuY3Rpb24nID9cbiAgICAgIChuYW1lOiBzdHJpbmcpID0+IHRhYmxlLmhhc093blByb3BlcnR5KG5hbWUpIDpcbiAgICAgIChuYW1lOiBzdHJpbmcpID0+ICEhdGFibGVbbmFtZV07XG5cbiAgZm9yIChjb25zdCBuYW1lIGluIHRhYmxlKSB7XG4gICAgaWYgKG93bihuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2godGFibGVbbmFtZV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jbGFzcyBTeW1ib2xUYWJsZVdyYXBwZXIgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHByaXZhdGUgc3ltYm9sczogdHMuU3ltYm9sW107XG4gIHByaXZhdGUgc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlO1xuICBwcml2YXRlIHN0cmluZ0luZGV4VHlwZT86IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBxdWVyeWFibGUgdGFibGUgb2Ygc3ltYm9scyBiZWxvbmdpbmcgdG8gYSBUeXBlU2NyaXB0IGVudGl0eS5cbiAgICogQHBhcmFtIHN5bWJvbHMgc3ltYm9scyB0byBxdWVyeSBiZWxvbmdpbmcgdG8gdGhlIGVudGl0eVxuICAgKiBAcGFyYW0gY29udGV4dCBwcm9ncmFtIGNvbnRleHRcbiAgICogQHBhcmFtIHR5cGUgb3JpZ2luYWwgVHlwZVNjcmlwdCB0eXBlIG9mIGVudGl0eSBvd25pbmcgdGhlIHN5bWJvbHMsIGlmIGtub3duXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHN5bWJvbHM6IHRzLlN5bWJvbFRhYmxlfHRzLlN5bWJvbFtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0LCBwcml2YXRlIHR5cGU/OiB0cy5UeXBlKSB7XG4gICAgc3ltYm9scyA9IHN5bWJvbHMgfHwgW107XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzeW1ib2xzKSkge1xuICAgICAgdGhpcy5zeW1ib2xzID0gc3ltYm9scztcbiAgICAgIHRoaXMuc3ltYm9sVGFibGUgPSB0b1N5bWJvbFRhYmxlRmFjdG9yeShzeW1ib2xzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zeW1ib2xzID0gdG9TeW1ib2xzKHN5bWJvbHMpO1xuICAgICAgdGhpcy5zeW1ib2xUYWJsZSA9IHN5bWJvbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRoaXMuc3RyaW5nSW5kZXhUeXBlID0gdHlwZS5nZXRTdHJpbmdJbmRleFR5cGUoKTtcbiAgICB9XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICB9XG5cbiAgZ2V0KGtleTogc3RyaW5nKTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gZ2V0RnJvbVN5bWJvbFRhYmxlKHRoaXMuc3ltYm9sVGFibGUsIGtleSk7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgcmV0dXJuIG5ldyBTeW1ib2xXcmFwcGVyKHN5bWJvbCwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdHJpbmdJbmRleFR5cGUpIHtcbiAgICAgIC8vIElmIHRoZSBrZXkgZG9lcyBub3QgZXhpc3QgYXMgYW4gZXhwbGljaXQgc3ltYm9sIG9uIHRoZSB0eXBlLCBpdCBtYXkgYmUgYWNjZXNzaW5nIGEgc3RyaW5nXG4gICAgICAvLyBpbmRleCBzaWduYXR1cmUgdXNpbmcgZG90IG5vdGF0aW9uOlxuICAgICAgLy9cbiAgICAgIC8vICAgY29uc3Qgb2JqPFQ+OiB7IFtrZXk6IHN0cmluZ106IFQgfTtcbiAgICAgIC8vICAgb2JqLnN0cmluZ0luZGV4IC8vIGVxdWl2YWxlbnQgdG8gb2JqWydzdHJpbmdJbmRleCddO1xuICAgICAgLy9cbiAgICAgIC8vIEluIHRoaXMgY2FzZSwgcmV0dXJuIHRoZSB0eXBlIGluZGV4ZWQgYnkgYW4gYXJiaXRyYXJ5IHN0cmluZyBrZXkuXG4gICAgICByZXR1cm4gbmV3IFN0cmluZ0luZGV4VHlwZVdyYXBwZXIodGhpcy5zdHJpbmdJbmRleFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRhYmxlOiBhbnkgPSB0aGlzLnN5bWJvbFRhYmxlO1xuICAgIHJldHVybiAoKHR5cGVvZiB0YWJsZS5oYXMgPT09ICdmdW5jdGlvbicpID8gdGFibGUuaGFzKGtleSkgOiB0YWJsZVtrZXldICE9IG51bGwpIHx8XG4gICAgICAgIHRoaXMuc3RyaW5nSW5kZXhUeXBlICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10ge1xuICAgIHJldHVybiB0aGlzLnN5bWJvbHMubWFwKHMgPT4gbmV3IFN5bWJvbFdyYXBwZXIocywgdGhpcy5jb250ZXh0KSk7XG4gIH1cbn1cblxuY2xhc3MgTWFwU3ltYm9sVGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFN5bWJvbD4oKTtcbiAgcHJpdmF0ZSBfdmFsdWVzOiBTeW1ib2xbXSA9IFtdO1xuXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMubWFwLnNpemU7XG4gIH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGtleSk7XG4gIH1cblxuICBhZGQoc3ltYm9sOiBTeW1ib2wpIHtcbiAgICBpZiAodGhpcy5tYXAuaGFzKHN5bWJvbC5uYW1lKSkge1xuICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLm1hcC5nZXQoc3ltYm9sLm5hbWUpITtcbiAgICAgIHRoaXMuX3ZhbHVlc1t0aGlzLl92YWx1ZXMuaW5kZXhPZihwcmV2aW91cyldID0gc3ltYm9sO1xuICAgIH1cbiAgICB0aGlzLm1hcC5zZXQoc3ltYm9sLm5hbWUsIHN5bWJvbCk7XG4gICAgdGhpcy5fdmFsdWVzLnB1c2goc3ltYm9sKTtcbiAgfVxuXG4gIGFkZEFsbChzeW1ib2xzOiBTeW1ib2xbXSkge1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHN5bWJvbHMpIHtcbiAgICAgIHRoaXMuYWRkKHN5bWJvbCk7XG4gICAgfVxuICB9XG5cbiAgaGFzKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhcyhrZXkpO1xuICB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHtcbiAgICAvLyBTd2l0Y2ggdG8gdGhpcy5tYXAudmFsdWVzIG9uY2UgaXRlcmFibGVzIGFyZSBzdXBwb3J0ZWQgYnkgdGhlIHRhcmdldCBsYW5ndWFnZS5cbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xuICB9XG59XG5cbmNsYXNzIFBpcGVzVGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGlwZXM6IENvbXBpbGVQaXBlU3VtbWFyeVtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLnBpcGVzLmxlbmd0aDtcbiAgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHBpcGUgPSB0aGlzLnBpcGVzLmZpbmQocGlwZSA9PiBwaXBlLm5hbWUgPT0ga2V5KTtcbiAgICBpZiAocGlwZSkge1xuICAgICAgcmV0dXJuIG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgaGFzKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucGlwZXMuZmluZChwaXBlID0+IHBpcGUubmFtZSA9PSBrZXkpICE9IG51bGw7XG4gIH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10ge1xuICAgIHJldHVybiB0aGlzLnBpcGVzLm1hcChwaXBlID0+IG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCkpO1xuICB9XG59XG5cbi8vIFRoaXMgbWF0Y2hlcyAuZC50cyBmaWxlcyB0aGF0IGxvb2sgbGlrZSBcIi4uLi88cGFja2FnZS1uYW1lPi88cGFja2FnZS1uYW1lPi5kLnRzXCIsXG5jb25zdCBJTkRFWF9QQVRURVJOID0gL1tcXFxcL10oW15cXFxcL10rKVtcXFxcL11cXDFcXC5kXFwudHMkLztcblxuY2xhc3MgUGlwZVN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHByaXZhdGUgX3RzVHlwZTogdHMuVHlwZXx1bmRlZmluZWQ7XG4gIHB1YmxpYyByZWFkb25seSBraW5kOiBEZWNsYXJhdGlvbktpbmQgPSAncGlwZSc7XG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ3R5cGVzY3JpcHQnO1xuICBwdWJsaWMgcmVhZG9ubHkgY29udGFpbmVyOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwdWJsaWMgcmVhZG9ubHkgY2FsbGFibGU6IGJvb2xlYW4gPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpYzogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwaXBlOiBDb21waWxlUGlwZVN1bW1hcnksIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQpIHt9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5waXBlLm5hbWU7XG4gIH1cblxuICBnZXQgdHlwZSgpOiBUeXBlV3JhcHBlciB7XG4gICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb258dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRzVHlwZS5nZXRTeW1ib2woKTtcbiAgICByZXR1cm4gc3ltYm9sID8gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2wpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCh0aGlzLmNvbnRleHQuY2hlY2tlcik7XG4gIH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICByZXR1cm4gRW1wdHlUYWJsZS5pbnN0YW5jZTtcbiAgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10ge1xuICAgIHJldHVybiBzaWduYXR1cmVzT2YodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7XG4gICAgbGV0IHNpZ25hdHVyZSA9IHNlbGVjdFNpZ25hdHVyZSh0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0LCB0eXBlcykhO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXJhbWV0ZXJUeXBlID0gdHlwZXNbMF07XG4gICAgICBsZXQgcmVzdWx0VHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICAgIGNhc2UgJ2FzeW5jJzpcbiAgICAgICAgICAvLyBHZXQgdHlwZSBhcmd1bWVudCBvZiAnT2JzZXJ2YWJsZScsICdQcm9taXNlJywgb3IgJ0V2ZW50RW1pdHRlcicuXG4gICAgICAgICAgY29uc3QgdEFyZ3MgPSBwYXJhbWV0ZXJUeXBlLnR5cGVBcmd1bWVudHMoKTtcbiAgICAgICAgICBpZiAodEFyZ3MgJiYgdEFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXN1bHRUeXBlID0gdEFyZ3NbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzbGljZSc6XG4gICAgICAgICAgcmVzdWx0VHlwZSA9IHBhcmFtZXRlclR5cGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0VHlwZSkge1xuICAgICAgICBzaWduYXR1cmUgPSBuZXcgU2lnbmF0dXJlUmVzdWx0T3ZlcnJpZGUoc2lnbmF0dXJlLCByZXN1bHRUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNpZ25hdHVyZTtcbiAgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudHlwZS50eXBlQXJndW1lbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGdldCB0c1R5cGUoKTogdHMuVHlwZSB7XG4gICAgbGV0IHR5cGUgPSB0aGlzLl90c1R5cGU7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZmluZENsYXNzU3ltYm9sKHRoaXMucGlwZS50eXBlLnJlZmVyZW5jZSk7XG4gICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgdHlwZSA9IHRoaXMuX3RzVHlwZSA9IHRoaXMuZmluZFRyYW5zZm9ybU1ldGhvZFR5cGUoY2xhc3NTeW1ib2wpITtcbiAgICAgIH1cbiAgICAgIGlmICghdHlwZSkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSwgdGhpcy5jb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDbGFzc1N5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gZmluZENsYXNzU3ltYm9sSW5Db250ZXh0KHR5cGUsIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRUcmFuc2Zvcm1NZXRob2RUeXBlKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5UeXBlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICAgIGlmIChjbGFzc1R5cGUpIHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IGNsYXNzVHlwZS5nZXRQcm9wZXJ0eSgndHJhbnNmb3JtJyk7XG4gICAgICBpZiAodHJhbnNmb3JtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHRyYW5zZm9ybSwgdGhpcy5jb250ZXh0Lm5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZTogU3RhdGljU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICBsZXQgc291cmNlRmlsZSA9IGNvbnRleHQucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHR5cGUuZmlsZVBhdGgpO1xuICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAvLyBUaGlzIGhhbmRsZXMgYSBjYXNlIHdoZXJlIGFuIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhbmQgYSA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4uZC50c1xuICAgIC8vIGFyZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuIElmIHdlIGFyZSBsb29raW5nIGZvciA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4gYW5kIGRpZG4ndFxuICAgIC8vIGZpbmQgaXQsIGxvb2sgZm9yIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhcyB0aGUgcHJvZ3JhbSBtaWdodCBoYXZlIGZvdW5kIHRoYXQgaW5zdGVhZC5cbiAgICBjb25zdCBwID0gdHlwZS5maWxlUGF0aDtcbiAgICBjb25zdCBtID0gcC5tYXRjaChJTkRFWF9QQVRURVJOKTtcbiAgICBpZiAobSkge1xuICAgICAgY29uc3QgaW5kZXhWZXJzaW9uID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShwKSwgJ2luZGV4LmQudHMnKTtcbiAgICAgIHNvdXJjZUZpbGUgPSBjb250ZXh0LnByb2dyYW0uZ2V0U291cmNlRmlsZShpbmRleFZlcnNpb24pO1xuICAgIH1cbiAgfVxuICBpZiAoc291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IChzb3VyY2VGaWxlIGFzIGFueSkubW9kdWxlIHx8IChzb3VyY2VGaWxlIGFzIGFueSkuc3ltYm9sO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBjb250ZXh0LmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCk7XG4gICAgcmV0dXJuIChleHBvcnRzIHx8IFtdKS5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PSB0eXBlLm5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEVtcHR5VGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHB1YmxpYyByZWFkb25seSBzaXplOiBudW1iZXIgPSAwO1xuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YWx1ZXMoKTogU3ltYm9sW10ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgRW1wdHlUYWJsZSgpO1xufVxuXG5mdW5jdGlvbiBpc1N5bWJvbFByaXZhdGUoczogdHMuU3ltYm9sKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXMudmFsdWVEZWNsYXJhdGlvbiAmJiBpc1ByaXZhdGUocy52YWx1ZURlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKGJ1aWx0aW5UeXBlOiBCdWlsdGluVHlwZSwgY3R4OiBUeXBlQ29udGV4dCk6IHRzLlR5cGUge1xuICBsZXQgc3ludGF4S2luZDogdHMuU3ludGF4S2luZDtcbiAgc3dpdGNoIChidWlsdGluVHlwZSkge1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQW55OlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5OdWxsOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnRlcm5hbCBlcnJvciwgdW5oYW5kbGVkIGxpdGVyYWwga2luZCAke2J1aWx0aW5UeXBlfToke0J1aWx0aW5UeXBlW2J1aWx0aW5UeXBlXX1gKTtcbiAgfVxuICBjb25zdCBub2RlID0gdHMuY3JlYXRlTm9kZShzeW50YXhLaW5kKTtcbiAgbm9kZS5wYXJlbnQgPSBjdHgubm9kZTtcbiAgcmV0dXJuIGN0eC5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8dW5kZWZpbmVkIHtcbiAgICAgIGlmIChub2RlLmtpbmQgPiB0cy5TeW50YXhLaW5kLkxhc3RUb2tlbiAmJiBub2RlLnBvcyA8PSBwb3NpdGlvbiAmJiBub2RlLmVuZCA+IHBvc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IGJldHRlck5vZGUgPSB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgZmluZENoaWxkKTtcbiAgICAgICAgcmV0dXJuIGJldHRlck5vZGUgfHwgbm9kZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgbm9kZSA9IHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBmaW5kQ2hpbGQpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICByZXR1cm4ge3N0YXJ0OiBub2RlLmdldFN0YXJ0KCksIGVuZDogbm9kZS5nZXRFbmQoKX07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGRlZmluaXRpb25Gcm9tVHNTeW1ib2woc3ltYm9sOiB0cy5TeW1ib2wpOiBEZWZpbml0aW9uIHtcbiAgY29uc3QgZGVjbGFyYXRpb25zID0gc3ltYm9sLmRlY2xhcmF0aW9ucztcbiAgaWYgKGRlY2xhcmF0aW9ucykge1xuICAgIHJldHVybiBkZWNsYXJhdGlvbnMubWFwKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmaWxlTmFtZTogc291cmNlRmlsZS5maWxlTmFtZSxcbiAgICAgICAgc3Bhbjoge3N0YXJ0OiBkZWNsYXJhdGlvbi5nZXRTdGFydCgpLCBlbmQ6IGRlY2xhcmF0aW9uLmdldEVuZCgpfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJlbnREZWNsYXJhdGlvbk9mKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlfHVuZGVmaW5lZCB7XG4gIHdoaWxlIChub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Tb3VyY2VGaWxlOlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnQhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lck9mKHN5bWJvbDogdHMuU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBpZiAoc3ltYm9sLmdldEZsYWdzKCkgJiB0cy5TeW1ib2xGbGFncy5DbGFzc01lbWJlciAmJiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnREZWNsYXJhdGlvbk9mKGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQuY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihwYXJlbnQpO1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdHlwZUtpbmRPZih0eXBlOiB0cy5UeXBlfHVuZGVmaW5lZCk6IEJ1aWx0aW5UeXBlIHtcbiAgaWYgKHR5cGUpIHtcbiAgICBpZiAodHlwZS5mbGFncyAmIHRzLlR5cGVGbGFncy5BbnkpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5Bbnk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuU3RyaW5nIHwgdHMuVHlwZUZsYWdzLlN0cmluZ0xpa2UgfCB0cy5UeXBlRmxhZ3MuU3RyaW5nTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5TdHJpbmc7XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgKHRzLlR5cGVGbGFncy5OdW1iZXIgfCB0cy5UeXBlRmxhZ3MuTnVtYmVyTGlrZSkpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5OdW1iZXI7XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgKHRzLlR5cGVGbGFncy5VbmRlZmluZWQpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuVW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuTnVsbCkpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5OdWxsO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmIHRzLlR5cGVGbGFncy5Vbmlvbikge1xuICAgICAgLy8gSWYgYWxsIHRoZSBjb25zdGl0dWVudCB0eXBlcyBvZiBhIHVuaW9uIGFyZSB0aGUgc2FtZSBraW5kLCBpdCBpcyBhbHNvIHRoYXQga2luZC5cbiAgICAgIGxldCBjYW5kaWRhdGU6IEJ1aWx0aW5UeXBlfG51bGwgPSBudWxsO1xuICAgICAgY29uc3QgdW5pb25UeXBlID0gdHlwZSBhcyB0cy5VbmlvblR5cGU7XG4gICAgICBpZiAodW5pb25UeXBlLnR5cGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2FuZGlkYXRlID0gdHlwZUtpbmRPZih1bmlvblR5cGUudHlwZXNbMF0pO1xuICAgICAgICBmb3IgKGNvbnN0IHN1YlR5cGUgb2YgdW5pb25UeXBlLnR5cGVzKSB7XG4gICAgICAgICAgaWYgKGNhbmRpZGF0ZSAhPSB0eXBlS2luZE9mKHN1YlR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gQnVpbHRpblR5cGUuT3RoZXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2FuZGlkYXRlICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuVHlwZVBhcmFtZXRlcikge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLlVuYm91bmQ7XG4gICAgfVxuICB9XG4gIHJldHVybiBCdWlsdGluVHlwZS5PdGhlcjtcbn1cblxuZnVuY3Rpb24gZ2V0RnJvbVN5bWJvbFRhYmxlKHN5bWJvbFRhYmxlOiB0cy5TeW1ib2xUYWJsZSwga2V5OiBzdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgY29uc3QgdGFibGUgPSBzeW1ib2xUYWJsZSBhcyBhbnk7XG4gIGxldCBzeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQ7XG5cbiAgaWYgKHR5cGVvZiB0YWJsZS5nZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBUUyAyLjIgdXNlcyBhIE1hcFxuICAgIHN5bWJvbCA9IHRhYmxlLmdldChrZXkpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRTIHByZS0yLjIgdXNlcyBhbiBvYmplY3RcbiAgICBzeW1ib2wgPSB0YWJsZVtrZXldO1xuICB9XG5cbiAgcmV0dXJuIHN5bWJvbDtcbn1cbiJdfQ==