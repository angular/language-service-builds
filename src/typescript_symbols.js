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
        TypeScriptSymbolQuery.prototype.getTypeKind = function (symbol) { return typeKindOf(this.getTsTypeOf(symbol)); };
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
                var elementType = getTypeParameterOf(type.tsType, 'Array');
                if (elementType) {
                    return new TypeWrapper(elementType, type.context);
                }
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
                var contextType = this.getTemplateRefContextType(typeSymbol);
                if (contextType)
                    return new SymbolWrapper(contextType, context).members();
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
        TypeScriptSymbolQuery.prototype.getTemplateRefContextType = function (typeSymbol) {
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
                            var typeReference = type_1;
                            if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                                return typeReference.typeArguments[0].symbol;
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
        TypeScriptSymbolQuery.prototype.getTsTypeOf = function (symbol) {
            var type = this.getTypeWrapper(symbol);
            return type && type.tsType;
        };
        TypeScriptSymbolQuery.prototype.getTypeWrapper = function (symbol) {
            var type = undefined;
            if (symbol instanceof TypeWrapper) {
                type = symbol;
            }
            else if (symbol.type instanceof TypeWrapper) {
                type = symbol.type;
            }
            return type;
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
        // TODO: Do a better job of selecting the right signature.
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
        TypeWrapper.prototype.indexed = function (argument, value) {
            var type = argument instanceof TypeWrapper ? argument : argument.type;
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
            get: function () { return this.declaration.type.callable; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeclaredSymbol.prototype, "definition", {
            get: function () { return this.declaration.definition; },
            enumerable: true,
            configurable: true
        });
        DeclaredSymbol.prototype.members = function () { return this.declaration.type.members(); };
        DeclaredSymbol.prototype.signatures = function () { return this.declaration.type.signatures(); };
        DeclaredSymbol.prototype.selectSignature = function (types) {
            return this.declaration.type.selectSignature(types);
        };
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
        // First, tell the compiler that `result` is of type `any`. Then, use a second type assertion
        // to `ts.SymbolTable`.
        // Otherwise, `Map<string, ts.Symbol>` and `ts.SymbolTable` will be considered as incompatible
        // types by the compiler
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
        PipeSymbol.prototype.members = function () { return EmptyTable.instance; };
        PipeSymbol.prototype.signatures = function () { return signaturesOf(this.tsType, this.context); };
        PipeSymbol.prototype.selectSignature = function (types) {
            var signature = selectSignature(this.tsType, this.context, types);
            if (types.length > 0) {
                var parameterType = types[0];
                if (parameterType instanceof TypeWrapper) {
                    var resultType = undefined;
                    switch (this.name) {
                        case 'async':
                            // Get symbol of 'Observable', 'Promise', or 'EventEmitter' type.
                            var symbol = parameterType.tsType.symbol;
                            if (symbol) {
                                resultType = getTypeParameterOf(parameterType.tsType, symbol.name);
                            }
                            break;
                        case 'slice':
                            resultType = parameterType.tsType;
                            break;
                    }
                    if (resultType) {
                        signature = new SignatureResultOverride(signature, new TypeWrapper(resultType, parameterType.context));
                    }
                }
            }
            return signature;
        };
        PipeSymbol.prototype.indexed = function (argument) { return undefined; };
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
    function getTypeParameterOf(type, name) {
        if (type && type.symbol && type.symbol.name == name) {
            var typeArguments = type.typeArguments;
            if (typeArguments && typeArguments.length <= 1) {
                return typeArguments[0];
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
                var unionType_1 = type;
                if (unionType_1.types.length > 0) {
                    candidate = typeKindOf(unionType_1.types[0]);
                    try {
                        for (var _b = tslib_1.__values(unionType_1.types), _c = _b.next(); !_c.done; _c = _b.next()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zeW1ib2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsaUVBQXlJO0lBRXpJLHNDQUFzQztJQUN0QywyQ0FBMkM7SUFDM0MsSUFBTSxTQUFTLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsVUFBQyxJQUFhO1lBQ1YsT0FBQSxDQUFDLENBQUMsQ0FBRSxFQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFBbEYsQ0FBa0YsQ0FBQyxDQUFDLENBQUM7UUFDMUYsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBOUMsQ0FBOEMsQ0FBQyxDQUFDO0lBRXhFLElBQU0sZUFBZSxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxDQUFDLFVBQUMsSUFBYTtZQUNWLE9BQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBSSxFQUFVLENBQUMsU0FBUyxDQUFDLE1BQU07Z0JBQ3hDLElBQVksQ0FBQyxXQUFXLEdBQUksRUFBVSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFEakUsQ0FDaUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBQyxDQUFDO0lBUTFFLFNBQWdCLGNBQWMsQ0FDMUIsT0FBbUIsRUFBRSxPQUF1QixFQUFFLE1BQXFCLEVBQ25FLFVBQTZCO1FBQy9CLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBSkQsd0NBSUM7SUFFRCxTQUFnQixlQUFlLENBQzNCLE9BQW1CLEVBQUUsT0FBdUIsRUFBRSxZQUEwQjtRQUUxRSxJQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEUsSUFBSSxXQUFXLEVBQUU7WUFDZixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsT0FBTyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLE1BQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDbEU7U0FDRjtJQUNILENBQUM7SUFYRCwwQ0FXQztJQUVELFNBQWdCLDhCQUE4QixDQUMxQyxPQUFtQixFQUFFLE9BQXVCLEVBQUUsTUFBcUIsRUFDbkUsV0FBZ0M7UUFDbEMsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLFNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0UsQ0FBQztJQUxELHdFQUtDO0lBRUQsU0FBZ0Isd0JBQXdCLENBQ3BDLE9BQW1CLEVBQUUsSUFBa0I7UUFDekMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxNQUFNLEVBQUU7WUFDVixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFVBQUEsS0FBSztnQkFDbEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ2pELElBQU0sZ0JBQWdCLEdBQUcsS0FBNEIsQ0FBQztvQkFDdEQsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDN0UsT0FBTyxnQkFBZ0IsQ0FBQztxQkFDekI7aUJBQ0Y7WUFDSCxDQUFDLENBQXFDLENBQUM7U0FDeEM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBZkQsNERBZUM7SUFFRCxTQUFnQixhQUFhLENBQ3pCLE1BQXFCLEVBQUUsT0FBbUIsRUFBRSxPQUF1QixFQUNuRSxLQUEyQjtRQUM3QixPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sU0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFKRCxzQ0FJQztJQUVEO1FBS0UsK0JBQ1ksT0FBbUIsRUFBVSxPQUF1QixFQUFVLE1BQXFCLEVBQ25GLFVBQTZCO1lBRDdCLFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQWU7WUFDbkYsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7WUFOakMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBTVAsQ0FBQztRQUU3QywyQ0FBVyxHQUFYLFVBQVksTUFBYyxJQUFpQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpGLDhDQUFjLEdBQWQsVUFBZSxJQUFpQjtZQUM5QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNYLElBQU0sSUFBSSxHQUFHLHdCQUF3QixDQUFDLElBQUksRUFBRTtvQkFDMUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO29CQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU07b0JBQ2pCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztpQkFDdEIsQ0FBQyxDQUFDO2dCQUNILE1BQU07b0JBQ0YsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDbEM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBRUQsNENBQVksR0FBWjtZQUFhLGVBQWtCO2lCQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7Z0JBQWxCLDBCQUFrQjs7WUFDN0Isc0VBQXNFO1lBQ3RFLElBQUksTUFBTSxHQUFxQixTQUFTLENBQUM7WUFDekMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO2dCQUNoQixNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDckMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFO3dCQUN0QixNQUFNLEdBQUcsU0FBUyxDQUFDO3dCQUNuQixNQUFNO3FCQUNQO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLE1BQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELDRDQUFZLEdBQVosVUFBYSxJQUFZLElBQVksT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5GLDhDQUFjLEdBQWQsVUFBZSxJQUFZO1lBQ3pCLElBQUksSUFBSSxZQUFZLFdBQVcsRUFBRTtnQkFDL0IsSUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxXQUFXLEVBQUU7b0JBQ2YsT0FBTyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNuRDthQUNGO1FBQ0gsQ0FBQztRQUVELGtEQUFrQixHQUFsQixVQUFtQixNQUFjO1lBQy9CLElBQUksTUFBTSxZQUFZLFdBQVcsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsSUFBSSxVQUFVLENBQUMsRUFBRTtnQkFDM0YsSUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztnQkFDN0IsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxlQUFlLElBQUksTUFBTSxFQUFFO29CQUM3QixPQUFPLElBQUksV0FBVyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3pEO3FCQUFNLElBQUksZUFBZSxJQUFJLE1BQU0sRUFBRTtvQkFDcEMsT0FBTyxNQUFNLENBQUM7aUJBQ2Y7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCx3Q0FBUSxHQUFSO1lBQ0UsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QixJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNYLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUM5QztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxrREFBa0IsR0FBbEIsVUFBbUIsSUFBa0I7WUFDbkMsSUFBTSxPQUFPLEdBQWdCLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQztZQUMvRixJQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLFdBQVc7b0JBQUUsT0FBTyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDM0U7UUFDSCxDQUFDO1FBRUQsNkNBQWEsR0FBYixVQUFjLElBQWtCO1lBQzlCLElBQU0sT0FBTyxHQUFnQixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUM7WUFDL0YsSUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzNELE9BQU8sVUFBVSxJQUFJLElBQUksYUFBYSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsaURBQWlCLEdBQWpCLFVBQWtCLE9BQTRCO1lBQzVDLElBQU0sTUFBTSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxnREFBZ0IsR0FBaEIsVUFBaUIsWUFBMkI7O1lBQzFDLElBQU0sTUFBTSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7O2dCQUNwQyxLQUEwQixJQUFBLGlCQUFBLGlCQUFBLFlBQVksQ0FBQSwwQ0FBQSxvRUFBRTtvQkFBbkMsSUFBTSxXQUFXLHlCQUFBO29CQUNwQixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2lCQUNyQzs7Ozs7Ozs7O1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELHlDQUFTLEdBQVQsVUFBVSxJQUFZLEVBQUUsTUFBYztZQUNwQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRU8seURBQXlCLEdBQWpDLFVBQWtDLFVBQXFCOztZQUNyRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0UsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU87Z0JBQ2xELGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRS9ELElBQUksV0FBVyxFQUFFO2dCQUNmLElBQU0sc0JBQXNCLEdBQUcsV0FBVyxDQUFDLFlBQWMsQ0FBQyxDQUFDLENBQTJCLENBQUM7O29CQUN2RixLQUF3QixJQUFBLEtBQUEsaUJBQUEsc0JBQXNCLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO3dCQUF0RCxJQUFNLFNBQVMsV0FBQTt3QkFDbEIsSUFBTSxNQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBTSxDQUFDLENBQUM7d0JBQzlELElBQUksTUFBSSxDQUFDLE1BQVEsQ0FBQyxJQUFJLElBQUksYUFBYSxJQUFJLGVBQWUsQ0FBQyxNQUFJLENBQUMsRUFBRTs0QkFDaEUsSUFBTSxhQUFhLEdBQUcsTUFBd0IsQ0FBQzs0QkFDL0MsSUFBSSxhQUFhLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQ0FDM0UsT0FBTyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzs2QkFDOUM7eUJBQ0Y7cUJBQ0Y7Ozs7Ozs7OzthQUNGO1FBQ0gsQ0FBQztRQUVPLDJDQUFXLEdBQW5CLFVBQW9CLE1BQWM7WUFDaEMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxPQUFPLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzdCLENBQUM7UUFFTyw4Q0FBYyxHQUF0QixVQUF1QixNQUFjO1lBQ25DLElBQUksSUFBSSxHQUEwQixTQUFTLENBQUM7WUFDNUMsSUFBSSxNQUFNLFlBQVksV0FBVyxFQUFFO2dCQUNqQyxJQUFJLEdBQUcsTUFBTSxDQUFDO2FBQ2Y7aUJBQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxZQUFZLFdBQVcsRUFBRTtnQkFDN0MsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7YUFDcEI7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUEzSUQsSUEySUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxJQUFhO1FBQ2pDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzVDLE9BQU8sVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxJQUFhLEVBQUUsT0FBb0I7UUFDdkQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxJQUFJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBaEMsQ0FBZ0MsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxJQUFhLEVBQUUsT0FBb0IsRUFBRSxLQUFlO1FBRTNFLDBEQUEwRDtRQUMxRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUM1QyxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDdEYsQ0FBQztJQUVEO1FBQ0UscUJBQW1CLE1BQWUsRUFBUyxPQUFvQjtZQUE1QyxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtZQVEvQyxTQUFJLEdBQW9CLE1BQU0sQ0FBQztZQUUvQixhQUFRLEdBQVcsWUFBWSxDQUFDO1lBRWhDLFNBQUksR0FBcUIsU0FBUyxDQUFDO1lBRW5DLGNBQVMsR0FBcUIsU0FBUyxDQUFDO1lBRXhDLFdBQU0sR0FBWSxJQUFJLENBQUM7WUFmckMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDWCxNQUFNLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2FBQ3BDO1FBQ0gsQ0FBQztRQUVELHNCQUFJLDZCQUFJO2lCQUFSLGNBQXFCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBWTdFLHNCQUFJLGlDQUFRO2lCQUFaLGNBQTBCLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTdELHNCQUFJLGlDQUFRO2lCQUFaO2dCQUNFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDN0UsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBSSxtQ0FBVTtpQkFBZDtnQkFDRSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUM3RCxDQUFDOzs7V0FBQTtRQUVELDZCQUFPLEdBQVA7WUFDRSx5RUFBeUU7WUFDekUsMkVBQTJFO1lBQzNFLHlFQUF5RTtZQUN6RSxhQUFhO1lBQ2IsT0FBTyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBRUQsZ0NBQVUsR0FBVixjQUE0QixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0UscUNBQWUsR0FBZixVQUFnQixLQUFlO1lBQzdCLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsNkJBQU8sR0FBUCxVQUFRLFFBQWdCLEVBQUUsS0FBVTtZQUNsQyxJQUFNLElBQUksR0FBRyxRQUFRLFlBQVksV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDeEUsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFdBQVcsQ0FBQztnQkFBRSxPQUFPO1lBRTNDLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsUUFBUSxRQUFRLEVBQUU7Z0JBQ2hCLEtBQUsscUJBQVcsQ0FBQyxNQUFNO29CQUNyQixJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQy9DLElBQUksS0FBSyxFQUFFO3dCQUNULHFFQUFxRTt3QkFDckUsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7NEJBQ25CLGdEQUFnRDs0QkFDaEQsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3lCQUNoRjt3QkFDRCxPQUFPLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQzdDO29CQUNELE9BQU8sU0FBUyxDQUFDO2dCQUNuQixLQUFLLHFCQUFXLENBQUMsTUFBTTtvQkFDckIsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUMvQyxPQUFPLEtBQUssSUFBSSxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3hEO1FBQ0gsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQWxFRCxJQWtFQztJQUVELCtFQUErRTtJQUMvRSx3RkFBd0Y7SUFDeEY7UUFBcUMsa0RBQVc7UUFBaEQ7WUFBQSxxRUFFQztZQURpQixVQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSSxDQUFDLE1BQU0sRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7O1FBQ3BFLENBQUM7UUFBRCw2QkFBQztJQUFELENBQUMsQUFGRCxDQUFxQyxXQUFXLEdBRS9DO0lBRUQ7UUFPRSx1QkFDSSxNQUFpQjtRQUNqQiw2Q0FBNkM7UUFDckMsT0FBb0I7UUFDNUI7d0VBQ2dFO1FBQ3hELE9BQWlCO1lBSGpCLFlBQU8sR0FBUCxPQUFPLENBQWE7WUFHcEIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtZQVRiLGFBQVEsR0FBWSxLQUFLLENBQUM7WUFDMUIsYUFBUSxHQUFXLFlBQVksQ0FBQztZQVM5QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDdEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLENBQUM7UUFDYixDQUFDO1FBRUQsc0JBQUksK0JBQUk7aUJBQVIsY0FBcUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRS9DLHNCQUFJLCtCQUFJO2lCQUFSLGNBQThCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU3RSxzQkFBSSwrQkFBSTtpQkFBUixjQUErQixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFbkYsc0JBQUksb0NBQVM7aUJBQWIsY0FBb0MsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUV2RixzQkFBSSxpQ0FBTTtpQkFBVjtnQkFDRSwyREFBMkQ7Z0JBQzNELE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7OztXQUFBO1FBRUQsc0JBQUksbUNBQVE7aUJBQVosY0FBMEIsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFN0Qsc0JBQUkscUNBQVU7aUJBQWQsY0FBK0IsT0FBTyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU1RSwrQkFBTyxHQUFQO1lBQ0UsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2hGLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDL0UsSUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7aUJBQ3ZDO3FCQUFNO29CQUNMLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDMUY7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2QixDQUFDO1FBRUQsa0NBQVUsR0FBVixjQUE0QixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0UsdUNBQWUsR0FBZixVQUFnQixLQUFlO1lBQzdCLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsK0JBQU8sR0FBUCxVQUFRLFFBQWdCLElBQXNCLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVqRSxzQkFBWSxpQ0FBTTtpQkFBbEI7Z0JBQ0UsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDeEIsSUFBSSxDQUFDLElBQUksRUFBRTtvQkFDVCxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU87d0JBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNwRjtnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7OztXQUFBO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBakVELElBaUVDO0lBRUQ7UUFPRSx3QkFBb0IsV0FBOEI7WUFBOUIsZ0JBQVcsR0FBWCxXQUFXLENBQW1CO1lBTmxDLGFBQVEsR0FBVyxhQUFhLENBQUM7WUFFakMsYUFBUSxHQUFZLEtBQUssQ0FBQztZQUUxQixXQUFNLEdBQVksSUFBSSxDQUFDO1FBRWMsQ0FBQztRQUV0RCxzQkFBSSxnQ0FBSTtpQkFBUixjQUFhLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU1QyxzQkFBSSxnQ0FBSTtpQkFBUixjQUFhLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU1QyxzQkFBSSxxQ0FBUztpQkFBYixjQUFvQyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXZELHNCQUFJLGdDQUFJO2lCQUFSLGNBQWEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTVDLHNCQUFJLG9DQUFRO2lCQUFaLGNBQTBCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFHbEUsc0JBQUksc0NBQVU7aUJBQWQsY0FBK0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXBFLGdDQUFPLEdBQVAsY0FBeUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEUsbUNBQVUsR0FBVixjQUE0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RSx3Q0FBZSxHQUFmLFVBQWdCLEtBQWU7WUFDN0IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELGdDQUFPLEdBQVAsVUFBUSxRQUFnQixJQUFzQixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkUscUJBQUM7SUFBRCxDQUFDLEFBL0JELElBK0JDO0lBRUQ7UUFDRSwwQkFBb0IsU0FBdUIsRUFBVSxPQUFvQjtZQUFyRCxjQUFTLEdBQVQsU0FBUyxDQUFjO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUFHLENBQUM7UUFFN0Usc0JBQUksdUNBQVM7aUJBQWI7Z0JBQ0UsT0FBTyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlFLENBQUM7OztXQUFBO1FBRUQsc0JBQUksb0NBQU07aUJBQVYsY0FBdUIsT0FBTyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBQ2hHLHVCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDtRQUNFLGlDQUFvQixTQUFvQixFQUFVLFVBQWtCO1lBQWhELGNBQVMsR0FBVCxTQUFTLENBQVc7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQUcsQ0FBQztRQUV4RSxzQkFBSSw4Q0FBUztpQkFBYixjQUErQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFakUsc0JBQUksMkNBQU07aUJBQVYsY0FBdUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFDbEQsOEJBQUM7SUFBRCxDQUFDLEFBTkQsSUFNQztJQUVELFNBQWdCLG9CQUFvQixDQUFDLE9BQW9COztRQUN2RCw0RUFBNEU7UUFDNUUsSUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7O1lBQzVDLEtBQXFCLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7Z0JBQXpCLElBQU0sTUFBTSxvQkFBQTtnQkFDZixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDakM7Ozs7Ozs7OztRQUNELDZGQUE2RjtRQUM3Rix1QkFBdUI7UUFDdkIsOEZBQThGO1FBQzlGLHdCQUF3QjtRQUN4QixPQUE2QixNQUFPLENBQUM7SUFDdkMsQ0FBQztJQVhELG9EQVdDO0lBRUQsU0FBUyxTQUFTLENBQUMsV0FBdUM7UUFDeEQsSUFBSSxDQUFDLFdBQVc7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUU1QixJQUFNLEtBQUssR0FBRyxXQUFrQixDQUFDO1FBRWpDLElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtZQUN0QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFnQixDQUFDO1NBQ2xEO1FBRUQsSUFBTSxNQUFNLEdBQWdCLEVBQUUsQ0FBQztRQUUvQixJQUFNLEdBQUcsR0FBRyxPQUFPLEtBQUssQ0FBQyxjQUFjLEtBQUssVUFBVSxDQUFDLENBQUM7WUFDcEQsVUFBQyxJQUFZLElBQUssT0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7WUFDOUMsVUFBQyxJQUFZLElBQUssT0FBQSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFiLENBQWEsQ0FBQztRQUVwQyxLQUFLLElBQU0sTUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixJQUFJLEdBQUcsQ0FBQyxNQUFJLENBQUMsRUFBRTtnQkFDYixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7UUFLRTs7Ozs7V0FLRztRQUNILDRCQUNJLE9BQW1DLEVBQVUsT0FBb0IsRUFBVSxJQUFjO1lBQTVDLFlBQU8sR0FBUCxPQUFPLENBQWE7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFVO1lBQzNGLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1lBRXhCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbEQ7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO2FBQzVCO1lBRUQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzthQUNsRDtRQUNILENBQUM7UUFFRCxzQkFBSSxvQ0FBSTtpQkFBUixjQUFxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFbEQsZ0NBQUcsR0FBSCxVQUFJLEdBQVc7WUFDYixJQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxFQUFFO2dCQUNWLE9BQU8sSUFBSSxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoRDtZQUVELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDeEIsNEZBQTRGO2dCQUM1RixzQ0FBc0M7Z0JBQ3RDLEVBQUU7Z0JBQ0Ysd0NBQXdDO2dCQUN4Qyx5REFBeUQ7Z0JBQ3pELEVBQUU7Z0JBQ0Ysb0VBQW9FO2dCQUNwRSxPQUFPLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkU7WUFFRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsZ0NBQUcsR0FBSCxVQUFJLEdBQVc7WUFDYixJQUFNLEtBQUssR0FBUSxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQztnQkFDNUUsSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUM7UUFDekMsQ0FBQztRQUVELG1DQUFNLEdBQU47WUFBQSxpQkFBd0Y7WUFBbkUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFDMUYseUJBQUM7SUFBRCxDQUFDLEFBekRELElBeURDO0lBRUQ7UUFBQTtZQUNVLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUNoQyxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBMkJqQyxDQUFDO1FBekJDLHNCQUFJLGdDQUFJO2lCQUFSLGNBQXFCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU1Qyw0QkFBRyxHQUFILFVBQUksR0FBVyxJQUFzQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVoRSw0QkFBRyxHQUFILFVBQUksTUFBYztZQUNoQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0IsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBRyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO2FBQ3ZEO1lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBRUQsK0JBQU0sR0FBTixVQUFPLE9BQWlCOzs7Z0JBQ3RCLEtBQXFCLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7b0JBQXpCLElBQU0sTUFBTSxvQkFBQTtvQkFDZixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNsQjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELDRCQUFHLEdBQUgsVUFBSSxHQUFXLElBQWEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkQsK0JBQU0sR0FBTjtZQUNFLGlGQUFpRjtZQUNqRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEIsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQTdCRCxJQTZCQztJQUVEO1FBQ0Usb0JBQW9CLEtBQTJCLEVBQVUsT0FBb0I7WUFBekQsVUFBSyxHQUFMLEtBQUssQ0FBc0I7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQUcsQ0FBQztRQUVqRixzQkFBSSw0QkFBSTtpQkFBUixjQUFhLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUV4Qyx3QkFBRyxHQUFILFVBQUksR0FBVztZQUNiLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQWhCLENBQWdCLENBQUMsQ0FBQztZQUN2RCxJQUFJLElBQUksRUFBRTtnQkFDUixPQUFPLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDM0M7UUFDSCxDQUFDO1FBRUQsd0JBQUcsR0FBSCxVQUFJLEdBQVcsSUFBYSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQWhCLENBQWdCLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXZGLDJCQUFNLEdBQU47WUFBQSxpQkFBeUY7WUFBcEUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFDM0YsaUJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQUVELG9GQUFvRjtJQUNwRixJQUFNLGFBQWEsR0FBRywrQkFBK0IsQ0FBQztJQUV0RDtRQVVFLG9CQUFvQixJQUF3QixFQUFVLE9BQW9CO1lBQXRELFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtZQVAxRCxTQUFJLEdBQW9CLE1BQU0sQ0FBQztZQUMvQixhQUFRLEdBQVcsWUFBWSxDQUFDO1lBQ2hDLGNBQVMsR0FBcUIsU0FBUyxDQUFDO1lBQ3hDLGFBQVEsR0FBWSxJQUFJLENBQUM7WUFDekIsYUFBUSxHQUFZLEtBQUssQ0FBQztZQUMxQixXQUFNLEdBQVksSUFBSSxDQUFDO1FBRXNDLENBQUM7UUFFOUUsc0JBQUksNEJBQUk7aUJBQVIsY0FBcUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTdDLHNCQUFJLDRCQUFJO2lCQUFSLGNBQStCLE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVuRixzQkFBSSxrQ0FBVTtpQkFBZDtnQkFDRSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUM3RCxDQUFDOzs7V0FBQTtRQUVELDRCQUFPLEdBQVAsY0FBeUIsT0FBTyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV0RCwrQkFBVSxHQUFWLGNBQTRCLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU3RSxvQ0FBZSxHQUFmLFVBQWdCLEtBQWU7WUFDN0IsSUFBSSxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUcsQ0FBQztZQUNwRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQixJQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLElBQUksYUFBYSxZQUFZLFdBQVcsRUFBRTtvQkFDeEMsSUFBSSxVQUFVLEdBQXNCLFNBQVMsQ0FBQztvQkFDOUMsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUNqQixLQUFLLE9BQU87NEJBQ1YsaUVBQWlFOzRCQUNqRSxJQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzs0QkFDM0MsSUFBSSxNQUFNLEVBQUU7Z0NBQ1YsVUFBVSxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzZCQUNwRTs0QkFDRCxNQUFNO3dCQUNSLEtBQUssT0FBTzs0QkFDVixVQUFVLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQzs0QkFDbEMsTUFBTTtxQkFDVDtvQkFDRCxJQUFJLFVBQVUsRUFBRTt3QkFDZCxTQUFTLEdBQUcsSUFBSSx1QkFBdUIsQ0FDbkMsU0FBUyxFQUFFLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDcEU7aUJBQ0Y7YUFDRjtZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFRCw0QkFBTyxHQUFQLFVBQVEsUUFBZ0IsSUFBc0IsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRWpFLHNCQUFZLDhCQUFNO2lCQUFsQjtnQkFDRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUN4QixJQUFJLENBQUMsSUFBSSxFQUFFO29CQUNULElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ25FLElBQUksV0FBVyxFQUFFO3dCQUNmLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUcsQ0FBQztxQkFDbkU7b0JBQ0QsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDVCxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyx3QkFBd0IsQ0FBQyxxQkFBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQy9FO2lCQUNGO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQzs7O1dBQUE7UUFFTyxvQ0FBZSxHQUF2QixVQUF3QixJQUFrQjtZQUN4QyxPQUFPLHdCQUF3QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVPLDRDQUF1QixHQUEvQixVQUFnQyxXQUFzQjtZQUNwRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1RSxJQUFJLFNBQVMsRUFBRTtnQkFDYixJQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLFNBQVMsRUFBRTtvQkFDYixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNyRjthQUNGO1FBQ0gsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQWpGRCxJQWlGQztJQUVELFNBQVMsd0JBQXdCLENBQUMsSUFBa0IsRUFBRSxPQUFvQjtRQUN4RSxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLCtGQUErRjtZQUMvRiwwRkFBMEY7WUFDMUYsMkZBQTJGO1lBQzNGLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDeEIsSUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsRUFBRTtnQkFDTCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQzlELFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUMxRDtTQUNGO1FBQ0QsSUFBSSxVQUFVLEVBQUU7WUFDZCxJQUFNLFlBQVksR0FBSSxVQUFrQixDQUFDLE1BQU0sSUFBSyxVQUFrQixDQUFDLE1BQU0sQ0FBQztZQUM5RSxJQUFNLFNBQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2pFLE9BQU8sQ0FBQyxTQUFPLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxFQUF4QixDQUF3QixDQUFDLENBQUM7U0FDakU7SUFDSCxDQUFDO0lBRUQ7UUFBQTtZQUNrQixTQUFJLEdBQVcsQ0FBQyxDQUFDO1FBS25DLENBQUM7UUFKQyx3QkFBRyxHQUFILFVBQUksR0FBVyxJQUFzQixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEQsd0JBQUcsR0FBSCxVQUFJLEdBQVcsSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0MsMkJBQU0sR0FBTixjQUFxQixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsbUJBQVEsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ3JDLGlCQUFDO0tBQUEsQUFORCxJQU1DO0lBRUQsU0FBUyxlQUFlLENBQUMsQ0FBWTtRQUNuQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxTQUFTLHdCQUF3QixDQUFDLFdBQXdCLEVBQUUsR0FBZ0I7UUFDMUUsSUFBSSxVQUF5QixDQUFDO1FBQzlCLFFBQVEsV0FBVyxFQUFFO1lBQ25CLEtBQUsscUJBQVcsQ0FBQyxHQUFHO2dCQUNsQixVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7Z0JBQ3RDLE1BQU07WUFDUixLQUFLLHFCQUFXLENBQUMsT0FBTztnQkFDdEIsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO2dCQUMxQyxNQUFNO1lBQ1IsS0FBSyxxQkFBVyxDQUFDLElBQUk7Z0JBQ25CLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztnQkFDdkMsTUFBTTtZQUNSLEtBQUsscUJBQVcsQ0FBQyxNQUFNO2dCQUNyQixVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7Z0JBQ3pDLE1BQU07WUFDUixLQUFLLHFCQUFXLENBQUMsTUFBTTtnQkFDckIsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO2dCQUN6QyxNQUFNO1lBQ1IsS0FBSyxxQkFBVyxDQUFDLFNBQVM7Z0JBQ3hCLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO2dCQUM1QyxNQUFNO1lBQ1I7Z0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FDWCw0Q0FBMEMsV0FBVyxTQUFJLHFCQUFXLENBQUMsV0FBVyxDQUFHLENBQUMsQ0FBQztTQUM1RjtRQUNELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxNQUFNLENBQUMsVUFBeUIsRUFBRSxJQUFZLEVBQUUsTUFBYztRQUNyRSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQyxJQUFNLFVBQVEsR0FBRyxFQUFFLENBQUMsNkJBQTZCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM1RSxJQUFNLFNBQVMsR0FBRyxTQUFTLFNBQVMsQ0FBQyxJQUFhO2dCQUNoRCxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxVQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFRLEVBQUU7b0JBQ3RGLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNwRCxPQUFPLFVBQVUsSUFBSSxJQUFJLENBQUM7aUJBQzNCO1lBQ0gsQ0FBQyxDQUFDO1lBRUYsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBQyxDQUFDO2FBQ3JEO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxNQUFpQjtRQUMvQyxJQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1FBQ3pDLElBQUksWUFBWSxFQUFFO1lBQ2hCLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFdBQVc7Z0JBQ2pDLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDL0MsT0FBTztvQkFDTCxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7b0JBQzdCLElBQUksRUFBRSxFQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBQztpQkFDakUsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBQyxJQUFhO1FBQ3hDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3BDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0I7b0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2dCQUNkLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO29CQUMzQixPQUFPLFNBQVMsQ0FBQzthQUNwQjtZQUNELElBQUksR0FBRyxJQUFJLENBQUMsTUFBUSxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLE1BQWlCLEVBQUUsT0FBb0I7O1FBQzdELElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUU7O2dCQUN6RSxLQUEwQixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLFlBQVksQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUMsSUFBTSxXQUFXLFdBQUE7b0JBQ3BCLElBQU0sUUFBTSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNoRCxJQUFJLFFBQU0sRUFBRTt3QkFDVixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFFBQU0sQ0FBQyxDQUFDO3dCQUN2RCxJQUFJLElBQUksRUFBRTs0QkFDUixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQzt5QkFDdkM7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztTQUNGO0lBQ0gsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsSUFBYSxFQUFFLElBQVk7UUFDckQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDbkQsSUFBTSxhQUFhLEdBQWUsSUFBWSxDQUFDLGFBQWEsQ0FBQztZQUM3RCxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDOUMsT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDekI7U0FDRjtJQUNILENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUF5Qjs7UUFDM0MsSUFBSSxJQUFJLEVBQUU7WUFDUixJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pDLE9BQU8scUJBQVcsQ0FBQyxHQUFHLENBQUM7YUFDeEI7aUJBQU0sSUFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDN0YsT0FBTyxxQkFBVyxDQUFDLE1BQU0sQ0FBQzthQUMzQjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN2RSxPQUFPLHFCQUFXLENBQUMsTUFBTSxDQUFDO2FBQzNCO2lCQUFNLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ2hELE9BQU8scUJBQVcsQ0FBQyxTQUFTLENBQUM7YUFDOUI7aUJBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0MsT0FBTyxxQkFBVyxDQUFDLElBQUksQ0FBQzthQUN6QjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7Z0JBQzFDLG1GQUFtRjtnQkFDbkYsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztnQkFDdkMsSUFBTSxXQUFTLEdBQUcsSUFBb0IsQ0FBQztnQkFDdkMsSUFBSSxXQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQzlCLFNBQVMsR0FBRyxVQUFVLENBQUMsV0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzt3QkFDM0MsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLFdBQVMsQ0FBQyxLQUFLLENBQUEsZ0JBQUEsNEJBQUU7NEJBQWxDLElBQU0sT0FBTyxXQUFBOzRCQUNoQixJQUFJLFNBQVMsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0NBQ3BDLE9BQU8scUJBQVcsQ0FBQyxLQUFLLENBQUM7NkJBQzFCO3lCQUNGOzs7Ozs7Ozs7aUJBQ0Y7Z0JBQ0QsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFO29CQUNyQixPQUFPLFNBQVMsQ0FBQztpQkFDbEI7YUFDRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ2xELE9BQU8scUJBQVcsQ0FBQyxPQUFPLENBQUM7YUFDNUI7U0FDRjtRQUNELE9BQU8scUJBQVcsQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsV0FBMkIsRUFBRSxHQUFXO1FBQ2xFLElBQU0sS0FBSyxHQUFHLFdBQWtCLENBQUM7UUFDakMsSUFBSSxNQUEyQixDQUFDO1FBRWhDLElBQUksT0FBTyxLQUFLLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRTtZQUNuQyxvQkFBb0I7WUFDcEIsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekI7YUFBTTtZQUNMLDRCQUE0QjtZQUM1QixNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlUGlwZVN1bW1hcnksIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0J1aWx0aW5UeXBlLCBEZWNsYXJhdGlvbktpbmQsIERlZmluaXRpb24sIFNpZ25hdHVyZSwgU3BhbiwgU3ltYm9sLCBTeW1ib2xEZWNsYXJhdGlvbiwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vLyBJbiBUeXBlU2NyaXB0IDIuMSB0aGVzZSBmbGFncyBtb3ZlZFxuLy8gVGhlc2UgaGVscGVycyB3b3JrIGZvciBib3RoIDIuMCBhbmQgMi4xLlxuY29uc3QgaXNQcml2YXRlID0gKHRzIGFzIGFueSkuTW9kaWZpZXJGbGFncyA/XG4gICAgKChub2RlOiB0cy5Ob2RlKSA9PlxuICAgICAgICAgISEoKHRzIGFzIGFueSkuZ2V0Q29tYmluZWRNb2RpZmllckZsYWdzKG5vZGUpICYgKHRzIGFzIGFueSkuTW9kaWZpZXJGbGFncy5Qcml2YXRlKSkgOlxuICAgICgobm9kZTogdHMuTm9kZSkgPT4gISEobm9kZS5mbGFncyAmICh0cyBhcyBhbnkpLk5vZGVGbGFncy5Qcml2YXRlKSk7XG5cbmNvbnN0IGlzUmVmZXJlbmNlVHlwZSA9ICh0cyBhcyBhbnkpLk9iamVjdEZsYWdzID9cbiAgICAoKHR5cGU6IHRzLlR5cGUpID0+XG4gICAgICAgICAhISh0eXBlLmZsYWdzICYgKHRzIGFzIGFueSkuVHlwZUZsYWdzLk9iamVjdCAmJlxuICAgICAgICAgICAgKHR5cGUgYXMgYW55KS5vYmplY3RGbGFncyAmICh0cyBhcyBhbnkpLk9iamVjdEZsYWdzLlJlZmVyZW5jZSkpIDpcbiAgICAoKHR5cGU6IHRzLlR5cGUpID0+ICEhKHR5cGUuZmxhZ3MgJiAodHMgYXMgYW55KS5UeXBlRmxhZ3MuUmVmZXJlbmNlKSk7XG5cbmludGVyZmFjZSBUeXBlQ29udGV4dCB7XG4gIG5vZGU6IHRzLk5vZGU7XG4gIHByb2dyYW06IHRzLlByb2dyYW07XG4gIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3ltYm9sUXVlcnkoXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICBmZXRjaFBpcGVzOiAoKSA9PiBTeW1ib2xUYWJsZSk6IFN5bWJvbFF1ZXJ5IHtcbiAgcmV0dXJuIG5ldyBUeXBlU2NyaXB0U3ltYm9sUXVlcnkocHJvZ3JhbSwgY2hlY2tlciwgc291cmNlLCBmZXRjaFBpcGVzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzTWVtYmVycyhcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgc3RhdGljU3ltYm9sOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2xUYWJsZXxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCBkZWNsYXJhdGlvbiA9IGdldENsYXNzRnJvbVN0YXRpY1N5bWJvbChwcm9ncmFtLCBzdGF0aWNTeW1ib2wpO1xuICBpZiAoZGVjbGFyYXRpb24pIHtcbiAgICBjb25zdCB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgY29uc3Qgbm9kZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShzdGF0aWNTeW1ib2wuZmlsZVBhdGgpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHR5cGUsIHtub2RlLCBwcm9ncmFtLCBjaGVja2VyfSkubWVtYmVycygpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NNZW1iZXJzRnJvbURlY2xhcmF0aW9uKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gICAgZGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgY29uc3QgdHlwZSA9IGNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24oZGVjbGFyYXRpb24pO1xuICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHR5cGUsIHtub2RlOiBzb3VyY2UsIHByb2dyYW0sIGNoZWNrZXJ9KS5tZW1iZXJzKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc0Zyb21TdGF0aWNTeW1ib2woXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgdHlwZTogU3RhdGljU3ltYm9sKTogdHMuQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICBjb25zdCBzb3VyY2UgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUodHlwZS5maWxlUGF0aCk7XG4gIGlmIChzb3VyY2UpIHtcbiAgICByZXR1cm4gdHMuZm9yRWFjaENoaWxkKHNvdXJjZSwgY2hpbGQgPT4ge1xuICAgICAgaWYgKGNoaWxkLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gY2hpbGQgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24ubmFtZSAhPSBudWxsICYmIGNsYXNzRGVjbGFyYXRpb24ubmFtZS50ZXh0ID09PSB0eXBlLm5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gY2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pIGFzKHRzLkNsYXNzRGVjbGFyYXRpb24gfCB1bmRlZmluZWQpO1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBpcGVzVGFibGUoXG4gICAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10pOiBTeW1ib2xUYWJsZSB7XG4gIHJldHVybiBuZXcgUGlwZXNUYWJsZShwaXBlcywge3Byb2dyYW0sIGNoZWNrZXIsIG5vZGU6IHNvdXJjZX0pO1xufVxuXG5jbGFzcyBUeXBlU2NyaXB0U3ltYm9sUXVlcnkgaW1wbGVtZW50cyBTeW1ib2xRdWVyeSB7XG4gIHByaXZhdGUgdHlwZUNhY2hlID0gbmV3IE1hcDxCdWlsdGluVHlwZSwgU3ltYm9sPigpO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBwaXBlc0NhY2hlICE6IFN5bWJvbFRhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICAgIHByaXZhdGUgZmV0Y2hQaXBlczogKCkgPT4gU3ltYm9sVGFibGUpIHt9XG5cbiAgZ2V0VHlwZUtpbmQoc3ltYm9sOiBTeW1ib2wpOiBCdWlsdGluVHlwZSB7IHJldHVybiB0eXBlS2luZE9mKHRoaXMuZ2V0VHNUeXBlT2Yoc3ltYm9sKSk7IH1cblxuICBnZXRCdWlsdGluVHlwZShraW5kOiBCdWlsdGluVHlwZSk6IFN5bWJvbCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMudHlwZUNhY2hlLmdldChraW5kKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgY29uc3QgdHlwZSA9IGdldFRzVHlwZUZyb21CdWlsdGluVHlwZShraW5kLCB7XG4gICAgICAgIGNoZWNrZXI6IHRoaXMuY2hlY2tlcixcbiAgICAgICAgbm9kZTogdGhpcy5zb3VyY2UsXG4gICAgICAgIHByb2dyYW06IHRoaXMucHJvZ3JhbSxcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0ID1cbiAgICAgICAgICBuZXcgVHlwZVdyYXBwZXIodHlwZSwge3Byb2dyYW06IHRoaXMucHJvZ3JhbSwgY2hlY2tlcjogdGhpcy5jaGVja2VyLCBub2RlOiB0aGlzLnNvdXJjZX0pO1xuICAgICAgdGhpcy50eXBlQ2FjaGUuc2V0KGtpbmQsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUeXBlVW5pb24oLi4udHlwZXM6IFN5bWJvbFtdKTogU3ltYm9sIHtcbiAgICAvLyBObyBBUEkgZXhpc3RzIHNvIHJldHVybiBhbnkgaWYgdGhlIHR5cGVzIGFyZSBub3QgYWxsIHRoZSBzYW1lIHR5cGUuXG4gICAgbGV0IHJlc3VsdDogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZXMubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSB0eXBlc1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVzW2ldICE9IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIGdldEFycmF5VHlwZSh0eXBlOiBTeW1ib2wpOiBTeW1ib2wgeyByZXR1cm4gdGhpcy5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpOyB9XG5cbiAgZ2V0RWxlbWVudFR5cGUodHlwZTogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgY29uc3QgZWxlbWVudFR5cGUgPSBnZXRUeXBlUGFyYW1ldGVyT2YodHlwZS50c1R5cGUsICdBcnJheScpO1xuICAgICAgaWYgKGVsZW1lbnRUeXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIoZWxlbWVudFR5cGUsIHR5cGUuY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Tm9uTnVsbGFibGVUeXBlKHN5bWJvbDogU3ltYm9sKTogU3ltYm9sIHtcbiAgICBpZiAoc3ltYm9sIGluc3RhbmNlb2YgVHlwZVdyYXBwZXIgJiYgKHR5cGVvZiB0aGlzLmNoZWNrZXIuZ2V0Tm9uTnVsbGFibGVUeXBlID09ICdmdW5jdGlvbicpKSB7XG4gICAgICBjb25zdCB0c1R5cGUgPSBzeW1ib2wudHNUeXBlO1xuICAgICAgY29uc3Qgbm9uTnVsbGFibGVUeXBlID0gdGhpcy5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSh0c1R5cGUpO1xuICAgICAgaWYgKG5vbk51bGxhYmxlVHlwZSAhPSB0c1R5cGUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcihub25OdWxsYWJsZVR5cGUsIHN5bWJvbC5jb250ZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAobm9uTnVsbGFibGVUeXBlID09IHRzVHlwZSkge1xuICAgICAgICByZXR1cm4gc3ltYm9sO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xuICB9XG5cbiAgZ2V0UGlwZXMoKTogU3ltYm9sVGFibGUge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLnBpcGVzQ2FjaGU7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMucGlwZXNDYWNoZSA9IHRoaXMuZmV0Y2hQaXBlcygpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVDb250ZXh0KHR5cGU6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbFRhYmxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29udGV4dDogVHlwZUNvbnRleHQgPSB7bm9kZTogdGhpcy5zb3VyY2UsIHByb2dyYW06IHRoaXMucHJvZ3JhbSwgY2hlY2tlcjogdGhpcy5jaGVja2VyfTtcbiAgICBjb25zdCB0eXBlU3ltYm9sID0gZmluZENsYXNzU3ltYm9sSW5Db250ZXh0KHR5cGUsIGNvbnRleHQpO1xuICAgIGlmICh0eXBlU3ltYm9sKSB7XG4gICAgICBjb25zdCBjb250ZXh0VHlwZSA9IHRoaXMuZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sKTtcbiAgICAgIGlmIChjb250ZXh0VHlwZSkgcmV0dXJuIG5ldyBTeW1ib2xXcmFwcGVyKGNvbnRleHRUeXBlLCBjb250ZXh0KS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHlwZVN5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlQ29udGV4dCA9IHtub2RlOiB0aGlzLnNvdXJjZSwgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXJ9O1xuICAgIGNvbnN0IHR5cGVTeW1ib2wgPSBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIHR5cGVTeW1ib2wgJiYgbmV3IFN5bWJvbFdyYXBwZXIodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gIH1cblxuICBjcmVhdGVTeW1ib2xUYWJsZShzeW1ib2xzOiBTeW1ib2xEZWNsYXJhdGlvbltdKTogU3ltYm9sVGFibGUge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXBTeW1ib2xUYWJsZSgpO1xuICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9scy5tYXAocyA9PiBuZXcgRGVjbGFyZWRTeW1ib2wocykpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgbWVyZ2VTeW1ib2xUYWJsZShzeW1ib2xUYWJsZXM6IFN5bWJvbFRhYmxlW10pOiBTeW1ib2xUYWJsZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcFN5bWJvbFRhYmxlKCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2xUYWJsZSBvZiBzeW1ib2xUYWJsZXMpIHtcbiAgICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9sVGFibGUudmFsdWVzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0U3BhbkF0KGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNwYW5BdCh0aGlzLnNvdXJjZSwgbGluZSwgY29sdW1uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5jaGVja2VyLmdldFR5cGVPZlN5bWJvbEF0TG9jYXRpb24odHlwZVN5bWJvbCwgdGhpcy5zb3VyY2UpO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gdHlwZS5zeW1ib2wgJiYgdHlwZS5zeW1ib2wubWVtYmVycyAmJlxuICAgICAgICBnZXRGcm9tU3ltYm9sVGFibGUodHlwZS5zeW1ib2wubWVtYmVycyAhLCAnX19jb25zdHJ1Y3RvcicpO1xuXG4gICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvckRlY2xhcmF0aW9uID0gY29uc3RydWN0b3IuZGVjbGFyYXRpb25zICFbMF0gYXMgdHMuQ29uc3RydWN0b3JUeXBlTm9kZTtcbiAgICAgIGZvciAoY29uc3QgcGFyYW1ldGVyIG9mIGNvbnN0cnVjdG9yRGVjbGFyYXRpb24ucGFyYW1ldGVycykge1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHBhcmFtZXRlci50eXBlICEpO1xuICAgICAgICBpZiAodHlwZS5zeW1ib2wgIS5uYW1lID09ICdUZW1wbGF0ZVJlZicgJiYgaXNSZWZlcmVuY2VUeXBlKHR5cGUpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZVJlZmVyZW5jZSA9IHR5cGUgYXMgdHMuVHlwZVJlZmVyZW5jZTtcbiAgICAgICAgICBpZiAodHlwZVJlZmVyZW5jZS50eXBlQXJndW1lbnRzICYmIHR5cGVSZWZlcmVuY2UudHlwZUFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlUmVmZXJlbmNlLnR5cGVBcmd1bWVudHNbMF0uc3ltYm9sO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHNUeXBlT2Yoc3ltYm9sOiBTeW1ib2wpOiB0cy5UeXBlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZVdyYXBwZXIoc3ltYm9sKTtcbiAgICByZXR1cm4gdHlwZSAmJiB0eXBlLnRzVHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwZVdyYXBwZXIoc3ltYm9sOiBTeW1ib2wpOiBUeXBlV3JhcHBlcnx1bmRlZmluZWQge1xuICAgIGxldCB0eXBlOiBUeXBlV3JhcHBlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHN5bWJvbCBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSB7XG4gICAgICB0eXBlID0gc3ltYm9sO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLnR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgdHlwZSA9IHN5bWJvbC50eXBlO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlQ2FsbGFibGUodHlwZTogdHMuVHlwZSk6IGJvb2xlYW4ge1xuICBjb25zdCBzaWduYXR1cmVzID0gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpO1xuICByZXR1cm4gc2lnbmF0dXJlcyAmJiBzaWduYXR1cmVzLmxlbmd0aCAhPSAwO1xufVxuXG5mdW5jdGlvbiBzaWduYXR1cmVzT2YodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQpOiBTaWduYXR1cmVbXSB7XG4gIHJldHVybiB0eXBlLmdldENhbGxTaWduYXR1cmVzKCkubWFwKHMgPT4gbmV3IFNpZ25hdHVyZVdyYXBwZXIocywgY29udGV4dCkpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RTaWduYXR1cmUodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQsIHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXxcbiAgICB1bmRlZmluZWQge1xuICAvLyBUT0RPOiBEbyBhIGJldHRlciBqb2Igb2Ygc2VsZWN0aW5nIHRoZSByaWdodCBzaWduYXR1cmUuXG4gIGNvbnN0IHNpZ25hdHVyZXMgPSB0eXBlLmdldENhbGxTaWduYXR1cmVzKCk7XG4gIHJldHVybiBzaWduYXR1cmVzLmxlbmd0aCA/IG5ldyBTaWduYXR1cmVXcmFwcGVyKHNpZ25hdHVyZXNbMF0sIGNvbnRleHQpIDogdW5kZWZpbmVkO1xufVxuXG5jbGFzcyBUeXBlV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0c1R5cGU6IHRzLlR5cGUsIHB1YmxpYyBjb250ZXh0OiBUeXBlQ29udGV4dCkge1xuICAgIGlmICghdHNUeXBlKSB7XG4gICAgICB0aHJvdyBFcnJvcignSW50ZXJuYWw6IG51bGwgdHlwZScpO1xuICAgIH1cbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci50eXBlVG9TdHJpbmcodGhpcy50c1R5cGUpOyB9XG5cbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERlY2xhcmF0aW9uS2luZCA9ICd0eXBlJztcblxuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcblxuICBwdWJsaWMgcmVhZG9ubHkgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgcmVhZG9ubHkgY29udGFpbmVyOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHR5cGVDYWxsYWJsZSh0aGlzLnRzVHlwZSk7IH1cblxuICBnZXQgbnVsbGFibGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSh0aGlzLnRzVHlwZSkgIT0gdGhpcy50c1R5cGU7XG4gIH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgcmV0dXJuIHN5bWJvbCA/IGRlZmluaXRpb25Gcm9tVHNTeW1ib2woc3ltYm9sKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIC8vIFNob3VsZCBjYWxsIGdldEFwcGFyZW50UHJvcGVydGllcygpIGluc3RlYWQgb2YgZ2V0UHJvcGVydGllcygpIGJlY2F1c2VcbiAgICAvLyB0aGUgZm9ybWVyIGluY2x1ZGVzIHByb3BlcnRpZXMgb24gdGhlIGJhc2UgY2xhc3Mgd2hlcmVhcyB0aGUgbGF0dGVyIGRvZXNcbiAgICAvLyBub3QuIFRoaXMgcHJvdmlkZXMgcHJvcGVydGllcyBsaWtlIC5iaW5kKCksIC5jYWxsKCksIC5hcHBseSgpLCBldGMgZm9yXG4gICAgLy8gZnVuY3Rpb25zLlxuICAgIHJldHVybiBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMudHNUeXBlLmdldEFwcGFyZW50UHJvcGVydGllcygpLCB0aGlzLmNvbnRleHQsIHRoaXMudHNUeXBlKTtcbiAgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sLCB2YWx1ZTogYW55KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IGFyZ3VtZW50IGluc3RhbmNlb2YgVHlwZVdyYXBwZXIgPyBhcmd1bWVudCA6IGFyZ3VtZW50LnR5cGU7XG4gICAgaWYgKCEodHlwZSBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSkgcmV0dXJuO1xuXG4gICAgY29uc3QgdHlwZUtpbmQgPSB0eXBlS2luZE9mKHR5cGUudHNUeXBlKTtcbiAgICBzd2l0Y2ggKHR5cGVLaW5kKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgY29uc3QgblR5cGUgPSB0aGlzLnRzVHlwZS5nZXROdW1iZXJJbmRleFR5cGUoKTtcbiAgICAgICAgaWYgKG5UeXBlKSB7XG4gICAgICAgICAgLy8gZ2V0IHRoZSByaWdodCB0dXBsZSB0eXBlIGJ5IHZhbHVlLCBsaWtlICd2YXIgdDogW251bWJlciwgc3RyaW5nXTsnXG4gICAgICAgICAgaWYgKG5UeXBlLmlzVW5pb24oKSkge1xuICAgICAgICAgICAgLy8gcmV0dXJuIHVuZGVmaW5lZCBpZiBhcnJheSBpbmRleCBvdXQgb2YgYm91bmQuXG4gICAgICAgICAgICByZXR1cm4gblR5cGUudHlwZXNbdmFsdWVdICYmIG5ldyBUeXBlV3JhcHBlcihuVHlwZS50eXBlc1t2YWx1ZV0sIHRoaXMuY29udGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIoblR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICBjb25zdCBzVHlwZSA9IHRoaXMudHNUeXBlLmdldFN0cmluZ0luZGV4VHlwZSgpO1xuICAgICAgICByZXR1cm4gc1R5cGUgJiYgbmV3IFR5cGVXcmFwcGVyKHNUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBJZiBzdHJpbmdJbmRleFR5cGUgYSBwcmltaXRpdmUgdHlwZShlLmcuICdzdHJpbmcnKSwgdGhlIFN5bWJvbCBpcyB1bmRlZmluZWQ7XG4vLyBhbmQgaW4gQXN0VHlwZS5yZXNvbHZlUHJvcGVydHlSZWFkIG1ldGhvZCwgdGhlIFN5bWJvbC50eXBlIHNob3VsZCBnZXQgdGhlIHJpZ2h0IHR5cGUuXG5jbGFzcyBTdHJpbmdJbmRleFR5cGVXcmFwcGVyIGV4dGVuZHMgVHlwZVdyYXBwZXIge1xuICBwdWJsaWMgcmVhZG9ubHkgdHlwZSA9IG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTtcbn1cblxuY2xhc3MgU3ltYm9sV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHByaXZhdGUgc3ltYm9sOiB0cy5TeW1ib2w7XG4gIHByaXZhdGUgX21lbWJlcnM/OiBTeW1ib2xUYWJsZTtcblxuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAndHlwZXNjcmlwdCc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBzeW1ib2w6IHRzLlN5bWJvbCxcbiAgICAgIC8qKiBUeXBlU2NyaXB0IHR5cGUgY29udGV4dCBvZiB0aGUgc3ltYm9sLiAqL1xuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBUeXBlQ29udGV4dCxcbiAgICAgIC8qKiBUeXBlIG9mIHRoZSBUeXBlU2NyaXB0IHN5bWJvbCwgaWYga25vd24uIElmIG5vdCBwcm92aWRlZCwgdGhlIHR5cGUgb2YgdGhlIHN5bWJvbFxuICAgICAgKiB3aWxsIGJlIGRldGVybWluZWQgZHluYW1pY2FsbHk7IHNlZSBgU3ltYm9sV3JhcHBlciN0c1R5cGVgLiAqL1xuICAgICAgcHJpdmF0ZSBfdHNUeXBlPzogdHMuVHlwZSkge1xuICAgIHRoaXMuc3ltYm9sID0gc3ltYm9sICYmIGNvbnRleHQgJiYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSA/XG4gICAgICAgIGNvbnRleHQuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOlxuICAgICAgICBzeW1ib2w7XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zeW1ib2wubmFtZTsgfVxuXG4gIGdldCBraW5kKCk6IERlY2xhcmF0aW9uS2luZCB7IHJldHVybiB0aGlzLmNhbGxhYmxlID8gJ21ldGhvZCcgOiAncHJvcGVydHknOyB9XG5cbiAgZ2V0IHR5cGUoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiBuZXcgVHlwZVdyYXBwZXIodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7IH1cblxuICBnZXQgY29udGFpbmVyKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gZ2V0Q29udGFpbmVyT2YodGhpcy5zeW1ib2wsIHRoaXMuY29udGV4dCk7IH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4ge1xuICAgIC8vIFN5bWJvbHMgdGhhdCBhcmUgbm90IGV4cGxpY2l0bHkgbWFkZSBwcml2YXRlIGFyZSBwdWJsaWMuXG4gICAgcmV0dXJuICFpc1N5bWJvbFByaXZhdGUodGhpcy5zeW1ib2wpO1xuICB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdHlwZUNhbGxhYmxlKHRoaXMudHNUeXBlKTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbCh0aGlzLnN5bWJvbCk7IH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICBpZiAoIXRoaXMuX21lbWJlcnMpIHtcbiAgICAgIGlmICgodGhpcy5zeW1ib2wuZmxhZ3MgJiAodHMuU3ltYm9sRmxhZ3MuQ2xhc3MgfCB0cy5TeW1ib2xGbGFncy5JbnRlcmZhY2UpKSAhPSAwKSB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmVkVHlwZSA9IHRoaXMuY29udGV4dC5jaGVja2VyLmdldERlY2xhcmVkVHlwZU9mU3ltYm9sKHRoaXMuc3ltYm9sKTtcbiAgICAgICAgY29uc3QgdHlwZVdyYXBwZXIgPSBuZXcgVHlwZVdyYXBwZXIoZGVjbGFyZWRUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLl9tZW1iZXJzID0gdHlwZVdyYXBwZXIubWVtYmVycygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbWVtYmVycyA9IG5ldyBTeW1ib2xUYWJsZVdyYXBwZXIodGhpcy5zeW1ib2wubWVtYmVycyAhLCB0aGlzLmNvbnRleHQsIHRoaXMudHNUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX21lbWJlcnM7XG4gIH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHNpZ25hdHVyZXNPZih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc2VsZWN0U2lnbmF0dXJlKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQsIHR5cGVzKTtcbiAgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG5cbiAgcHJpdmF0ZSBnZXQgdHNUeXBlKCk6IHRzLlR5cGUge1xuICAgIGxldCB0eXBlID0gdGhpcy5fdHNUeXBlO1xuICAgIGlmICghdHlwZSkge1xuICAgICAgdHlwZSA9IHRoaXMuX3RzVHlwZSA9XG4gICAgICAgICAgdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0VHlwZU9mU3ltYm9sQXRMb2NhdGlvbih0aGlzLnN5bWJvbCwgdGhpcy5jb250ZXh0Lm5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxufVxuXG5jbGFzcyBEZWNsYXJlZFN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ25nLXRlbXBsYXRlJztcblxuICBwdWJsaWMgcmVhZG9ubHkgbnVsbGFibGU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRlY2xhcmF0aW9uOiBTeW1ib2xEZWNsYXJhdGlvbikge31cblxuICBnZXQgbmFtZSgpIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24ubmFtZTsgfVxuXG4gIGdldCBraW5kKCkgeyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5raW5kOyB9XG5cbiAgZ2V0IGNvbnRhaW5lcigpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIGdldCB0eXBlKCkgeyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlOyB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlLmNhbGxhYmxlOyB9XG5cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9uIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24uZGVmaW5pdGlvbjsgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUgeyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlLm1lbWJlcnMoKTsgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlLnNpZ25hdHVyZXMoKTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi50eXBlLnNlbGVjdFNpZ25hdHVyZSh0eXBlcyk7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxufVxuXG5jbGFzcyBTaWduYXR1cmVXcmFwcGVyIGltcGxlbWVudHMgU2lnbmF0dXJlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzaWduYXR1cmU6IHRzLlNpZ25hdHVyZSwgcHJpdmF0ZSBjb250ZXh0OiBUeXBlQ29udGV4dCkge31cblxuICBnZXQgYXJndW1lbnRzKCk6IFN5bWJvbFRhYmxlIHtcbiAgICByZXR1cm4gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnNpZ25hdHVyZS5nZXRQYXJhbWV0ZXJzKCksIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBnZXQgcmVzdWx0KCk6IFN5bWJvbCB7IHJldHVybiBuZXcgVHlwZVdyYXBwZXIodGhpcy5zaWduYXR1cmUuZ2V0UmV0dXJuVHlwZSgpLCB0aGlzLmNvbnRleHQpOyB9XG59XG5cbmNsYXNzIFNpZ25hdHVyZVJlc3VsdE92ZXJyaWRlIGltcGxlbWVudHMgU2lnbmF0dXJlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzaWduYXR1cmU6IFNpZ25hdHVyZSwgcHJpdmF0ZSByZXN1bHRUeXBlOiBTeW1ib2wpIHt9XG5cbiAgZ2V0IGFyZ3VtZW50cygpOiBTeW1ib2xUYWJsZSB7IHJldHVybiB0aGlzLnNpZ25hdHVyZS5hcmd1bWVudHM7IH1cblxuICBnZXQgcmVzdWx0KCk6IFN5bWJvbCB7IHJldHVybiB0aGlzLnJlc3VsdFR5cGU7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvU3ltYm9sVGFibGVGYWN0b3J5KHN5bWJvbHM6IHRzLlN5bWJvbFtdKSB7XG4gIC8vIOKIgCBUeXBlc2NyaXB0IHZlcnNpb24gPj0gMi4yLCBgU3ltYm9sVGFibGVgIGlzIGltcGxlbWVudGVkIGFzIGFuIEVTNiBgTWFwYFxuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgdHMuU3ltYm9sPigpO1xuICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBzeW1ib2xzKSB7XG4gICAgcmVzdWx0LnNldChzeW1ib2wubmFtZSwgc3ltYm9sKTtcbiAgfVxuICAvLyBGaXJzdCwgdGVsbCB0aGUgY29tcGlsZXIgdGhhdCBgcmVzdWx0YCBpcyBvZiB0eXBlIGBhbnlgLiBUaGVuLCB1c2UgYSBzZWNvbmQgdHlwZSBhc3NlcnRpb25cbiAgLy8gdG8gYHRzLlN5bWJvbFRhYmxlYC5cbiAgLy8gT3RoZXJ3aXNlLCBgTWFwPHN0cmluZywgdHMuU3ltYm9sPmAgYW5kIGB0cy5TeW1ib2xUYWJsZWAgd2lsbCBiZSBjb25zaWRlcmVkIGFzIGluY29tcGF0aWJsZVxuICAvLyB0eXBlcyBieSB0aGUgY29tcGlsZXJcbiAgcmV0dXJuIDx0cy5TeW1ib2xUYWJsZT4oPGFueT5yZXN1bHQpO1xufVxuXG5mdW5jdGlvbiB0b1N5bWJvbHMoc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlIHwgdW5kZWZpbmVkKTogdHMuU3ltYm9sW10ge1xuICBpZiAoIXN5bWJvbFRhYmxlKSByZXR1cm4gW107XG5cbiAgY29uc3QgdGFibGUgPSBzeW1ib2xUYWJsZSBhcyBhbnk7XG5cbiAgaWYgKHR5cGVvZiB0YWJsZS52YWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWJsZS52YWx1ZXMoKSkgYXMgdHMuU3ltYm9sW107XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IHRzLlN5bWJvbFtdID0gW107XG5cbiAgY29uc3Qgb3duID0gdHlwZW9mIHRhYmxlLmhhc093blByb3BlcnR5ID09PSAnZnVuY3Rpb24nID9cbiAgICAgIChuYW1lOiBzdHJpbmcpID0+IHRhYmxlLmhhc093blByb3BlcnR5KG5hbWUpIDpcbiAgICAgIChuYW1lOiBzdHJpbmcpID0+ICEhdGFibGVbbmFtZV07XG5cbiAgZm9yIChjb25zdCBuYW1lIGluIHRhYmxlKSB7XG4gICAgaWYgKG93bihuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2godGFibGVbbmFtZV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jbGFzcyBTeW1ib2xUYWJsZVdyYXBwZXIgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHByaXZhdGUgc3ltYm9sczogdHMuU3ltYm9sW107XG4gIHByaXZhdGUgc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlO1xuICBwcml2YXRlIHN0cmluZ0luZGV4VHlwZT86IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBxdWVyeWFibGUgdGFibGUgb2Ygc3ltYm9scyBiZWxvbmdpbmcgdG8gYSBUeXBlU2NyaXB0IGVudGl0eS5cbiAgICogQHBhcmFtIHN5bWJvbHMgc3ltYm9scyB0byBxdWVyeSBiZWxvbmdpbmcgdG8gdGhlIGVudGl0eVxuICAgKiBAcGFyYW0gY29udGV4dCBwcm9ncmFtIGNvbnRleHRcbiAgICogQHBhcmFtIHR5cGUgb3JpZ2luYWwgVHlwZVNjcmlwdCB0eXBlIG9mIGVudGl0eSBvd25pbmcgdGhlIHN5bWJvbHMsIGlmIGtub3duXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHN5bWJvbHM6IHRzLlN5bWJvbFRhYmxlfHRzLlN5bWJvbFtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0LCBwcml2YXRlIHR5cGU/OiB0cy5UeXBlKSB7XG4gICAgc3ltYm9scyA9IHN5bWJvbHMgfHwgW107XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzeW1ib2xzKSkge1xuICAgICAgdGhpcy5zeW1ib2xzID0gc3ltYm9scztcbiAgICAgIHRoaXMuc3ltYm9sVGFibGUgPSB0b1N5bWJvbFRhYmxlRmFjdG9yeShzeW1ib2xzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zeW1ib2xzID0gdG9TeW1ib2xzKHN5bWJvbHMpO1xuICAgICAgdGhpcy5zeW1ib2xUYWJsZSA9IHN5bWJvbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRoaXMuc3RyaW5nSW5kZXhUeXBlID0gdHlwZS5nZXRTdHJpbmdJbmRleFR5cGUoKTtcbiAgICB9XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5zeW1ib2xzLmxlbmd0aDsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IGdldEZyb21TeW1ib2xUYWJsZSh0aGlzLnN5bWJvbFRhYmxlLCBrZXkpO1xuICAgIGlmIChzeW1ib2wpIHtcbiAgICAgIHJldHVybiBuZXcgU3ltYm9sV3JhcHBlcihzeW1ib2wsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RyaW5nSW5kZXhUeXBlKSB7XG4gICAgICAvLyBJZiB0aGUga2V5IGRvZXMgbm90IGV4aXN0IGFzIGFuIGV4cGxpY2l0IHN5bWJvbCBvbiB0aGUgdHlwZSwgaXQgbWF5IGJlIGFjY2Vzc2luZyBhIHN0cmluZ1xuICAgICAgLy8gaW5kZXggc2lnbmF0dXJlIHVzaW5nIGRvdCBub3RhdGlvbjpcbiAgICAgIC8vXG4gICAgICAvLyAgIGNvbnN0IG9iajxUPjogeyBba2V5OiBzdHJpbmddOiBUIH07XG4gICAgICAvLyAgIG9iai5zdHJpbmdJbmRleCAvLyBlcXVpdmFsZW50IHRvIG9ialsnc3RyaW5nSW5kZXgnXTtcbiAgICAgIC8vXG4gICAgICAvLyBJbiB0aGlzIGNhc2UsIHJldHVybiB0aGUgdHlwZSBpbmRleGVkIGJ5IGFuIGFyYml0cmFyeSBzdHJpbmcga2V5LlxuICAgICAgcmV0dXJuIG5ldyBTdHJpbmdJbmRleFR5cGVXcmFwcGVyKHRoaXMuc3RyaW5nSW5kZXhUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0YWJsZTogYW55ID0gdGhpcy5zeW1ib2xUYWJsZTtcbiAgICByZXR1cm4gKCh0eXBlb2YgdGFibGUuaGFzID09PSAnZnVuY3Rpb24nKSA/IHRhYmxlLmhhcyhrZXkpIDogdGFibGVba2V5XSAhPSBudWxsKSB8fFxuICAgICAgICB0aGlzLnN0cmluZ0luZGV4VHlwZSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHsgcmV0dXJuIHRoaXMuc3ltYm9scy5tYXAocyA9PiBuZXcgU3ltYm9sV3JhcHBlcihzLCB0aGlzLmNvbnRleHQpKTsgfVxufVxuXG5jbGFzcyBNYXBTeW1ib2xUYWJsZSBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPHN0cmluZywgU3ltYm9sPigpO1xuICBwcml2YXRlIF92YWx1ZXM6IFN5bWJvbFtdID0gW107XG5cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubWFwLnNpemU7IH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMubWFwLmdldChrZXkpOyB9XG5cbiAgYWRkKHN5bWJvbDogU3ltYm9sKSB7XG4gICAgaWYgKHRoaXMubWFwLmhhcyhzeW1ib2wubmFtZSkpIHtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5tYXAuZ2V0KHN5bWJvbC5uYW1lKSAhO1xuICAgICAgdGhpcy5fdmFsdWVzW3RoaXMuX3ZhbHVlcy5pbmRleE9mKHByZXZpb3VzKV0gPSBzeW1ib2w7XG4gICAgfVxuICAgIHRoaXMubWFwLnNldChzeW1ib2wubmFtZSwgc3ltYm9sKTtcbiAgICB0aGlzLl92YWx1ZXMucHVzaChzeW1ib2wpO1xuICB9XG5cbiAgYWRkQWxsKHN5bWJvbHM6IFN5bWJvbFtdKSB7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2Ygc3ltYm9scykge1xuICAgICAgdGhpcy5hZGQoc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMubWFwLmhhcyhrZXkpOyB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHtcbiAgICAvLyBTd2l0Y2ggdG8gdGhpcy5tYXAudmFsdWVzIG9uY2UgaXRlcmFibGVzIGFyZSBzdXBwb3J0ZWQgYnkgdGhlIHRhcmdldCBsYW5ndWFnZS5cbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzO1xuICB9XG59XG5cbmNsYXNzIFBpcGVzVGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGlwZXM6IENvbXBpbGVQaXBlU3VtbWFyeVtdLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBzaXplKCkgeyByZXR1cm4gdGhpcy5waXBlcy5sZW5ndGg7IH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwaXBlID0gdGhpcy5waXBlcy5maW5kKHBpcGUgPT4gcGlwZS5uYW1lID09IGtleSk7XG4gICAgaWYgKHBpcGUpIHtcbiAgICAgIHJldHVybiBuZXcgUGlwZVN5bWJvbChwaXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5waXBlcy5maW5kKHBpcGUgPT4gcGlwZS5uYW1lID09IGtleSkgIT0gbnVsbDsgfVxuXG4gIHZhbHVlcygpOiBTeW1ib2xbXSB7IHJldHVybiB0aGlzLnBpcGVzLm1hcChwaXBlID0+IG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCkpOyB9XG59XG5cbi8vIFRoaXMgbWF0Y2hlcyAuZC50cyBmaWxlcyB0aGF0IGxvb2sgbGlrZSBcIi4uLi88cGFja2FnZS1uYW1lPi88cGFja2FnZS1uYW1lPi5kLnRzXCIsXG5jb25zdCBJTkRFWF9QQVRURVJOID0gL1tcXFxcL10oW15cXFxcL10rKVtcXFxcL11cXDFcXC5kXFwudHMkLztcblxuY2xhc3MgUGlwZVN5bWJvbCBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF90c1R5cGUgITogdHMuVHlwZTtcbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERlY2xhcmF0aW9uS2luZCA9ICdwaXBlJztcbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAndHlwZXNjcmlwdCc7XG4gIHB1YmxpYyByZWFkb25seSBjb250YWluZXI6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHB1YmxpYyByZWFkb25seSBjYWxsYWJsZTogYm9vbGVhbiA9IHRydWU7XG4gIHB1YmxpYyByZWFkb25seSBudWxsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBpcGU6IENvbXBpbGVQaXBlU3VtbWFyeSwgcHJpdmF0ZSBjb250ZXh0OiBUeXBlQ29udGV4dCkge31cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5waXBlLm5hbWU7IH1cblxuICBnZXQgdHlwZSgpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb258dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRzVHlwZS5nZXRTeW1ib2woKTtcbiAgICByZXR1cm4gc3ltYm9sID8gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2wpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgbWVtYmVycygpOiBTeW1ib2xUYWJsZSB7IHJldHVybiBFbXB0eVRhYmxlLmluc3RhbmNlOyB9XG5cbiAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXSB7IHJldHVybiBzaWduYXR1cmVzT2YodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7XG4gICAgbGV0IHNpZ25hdHVyZSA9IHNlbGVjdFNpZ25hdHVyZSh0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0LCB0eXBlcykgITtcbiAgICBpZiAodHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcGFyYW1ldGVyVHlwZSA9IHR5cGVzWzBdO1xuICAgICAgaWYgKHBhcmFtZXRlclR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgICBsZXQgcmVzdWx0VHlwZTogdHMuVHlwZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICAgICAgY2FzZSAnYXN5bmMnOlxuICAgICAgICAgICAgLy8gR2V0IHN5bWJvbCBvZiAnT2JzZXJ2YWJsZScsICdQcm9taXNlJywgb3IgJ0V2ZW50RW1pdHRlcicgdHlwZS5cbiAgICAgICAgICAgIGNvbnN0IHN5bWJvbCA9IHBhcmFtZXRlclR5cGUudHNUeXBlLnN5bWJvbDtcbiAgICAgICAgICAgIGlmIChzeW1ib2wpIHtcbiAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IGdldFR5cGVQYXJhbWV0ZXJPZihwYXJhbWV0ZXJUeXBlLnRzVHlwZSwgc3ltYm9sLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnc2xpY2UnOlxuICAgICAgICAgICAgcmVzdWx0VHlwZSA9IHBhcmFtZXRlclR5cGUudHNUeXBlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdFR5cGUpIHtcbiAgICAgICAgICBzaWduYXR1cmUgPSBuZXcgU2lnbmF0dXJlUmVzdWx0T3ZlcnJpZGUoXG4gICAgICAgICAgICAgIHNpZ25hdHVyZSwgbmV3IFR5cGVXcmFwcGVyKHJlc3VsdFR5cGUsIHBhcmFtZXRlclR5cGUuY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaWduYXR1cmU7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIHByaXZhdGUgZ2V0IHRzVHlwZSgpOiB0cy5UeXBlIHtcbiAgICBsZXQgdHlwZSA9IHRoaXMuX3RzVHlwZTtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maW5kQ2xhc3NTeW1ib2wodGhpcy5waXBlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gdGhpcy5maW5kVHJhbnNmb3JtTWV0aG9kVHlwZShjbGFzc1N5bWJvbCkgITtcbiAgICAgIH1cbiAgICAgIGlmICghdHlwZSkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSwgdGhpcy5jb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDbGFzc1N5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gZmluZENsYXNzU3ltYm9sSW5Db250ZXh0KHR5cGUsIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRUcmFuc2Zvcm1NZXRob2RUeXBlKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5UeXBlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICAgIGlmIChjbGFzc1R5cGUpIHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IGNsYXNzVHlwZS5nZXRQcm9wZXJ0eSgndHJhbnNmb3JtJyk7XG4gICAgICBpZiAodHJhbnNmb3JtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHRyYW5zZm9ybSwgdGhpcy5jb250ZXh0Lm5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZTogU3RhdGljU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICBsZXQgc291cmNlRmlsZSA9IGNvbnRleHQucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHR5cGUuZmlsZVBhdGgpO1xuICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAvLyBUaGlzIGhhbmRsZXMgYSBjYXNlIHdoZXJlIGFuIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhbmQgYSA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4uZC50c1xuICAgIC8vIGFyZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuIElmIHdlIGFyZSBsb29raW5nIGZvciA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4gYW5kIGRpZG4ndFxuICAgIC8vIGZpbmQgaXQsIGxvb2sgZm9yIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhcyB0aGUgcHJvZ3JhbSBtaWdodCBoYXZlIGZvdW5kIHRoYXQgaW5zdGVhZC5cbiAgICBjb25zdCBwID0gdHlwZS5maWxlUGF0aDtcbiAgICBjb25zdCBtID0gcC5tYXRjaChJTkRFWF9QQVRURVJOKTtcbiAgICBpZiAobSkge1xuICAgICAgY29uc3QgaW5kZXhWZXJzaW9uID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShwKSwgJ2luZGV4LmQudHMnKTtcbiAgICAgIHNvdXJjZUZpbGUgPSBjb250ZXh0LnByb2dyYW0uZ2V0U291cmNlRmlsZShpbmRleFZlcnNpb24pO1xuICAgIH1cbiAgfVxuICBpZiAoc291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IChzb3VyY2VGaWxlIGFzIGFueSkubW9kdWxlIHx8IChzb3VyY2VGaWxlIGFzIGFueSkuc3ltYm9sO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBjb250ZXh0LmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCk7XG4gICAgcmV0dXJuIChleHBvcnRzIHx8IFtdKS5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PSB0eXBlLm5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEVtcHR5VGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHB1YmxpYyByZWFkb25seSBzaXplOiBudW1iZXIgPSAwO1xuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIGZhbHNlOyB9XG4gIHZhbHVlcygpOiBTeW1ib2xbXSB7IHJldHVybiBbXTsgfVxuICBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgRW1wdHlUYWJsZSgpO1xufVxuXG5mdW5jdGlvbiBpc1N5bWJvbFByaXZhdGUoczogdHMuU3ltYm9sKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXMudmFsdWVEZWNsYXJhdGlvbiAmJiBpc1ByaXZhdGUocy52YWx1ZURlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKGJ1aWx0aW5UeXBlOiBCdWlsdGluVHlwZSwgY3R4OiBUeXBlQ29udGV4dCk6IHRzLlR5cGUge1xuICBsZXQgc3ludGF4S2luZDogdHMuU3ludGF4S2luZDtcbiAgc3dpdGNoIChidWlsdGluVHlwZSkge1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQW55OlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5OdWxsOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnRlcm5hbCBlcnJvciwgdW5oYW5kbGVkIGxpdGVyYWwga2luZCAke2J1aWx0aW5UeXBlfToke0J1aWx0aW5UeXBlW2J1aWx0aW5UeXBlXX1gKTtcbiAgfVxuICBjb25zdCBub2RlID0gdHMuY3JlYXRlTm9kZShzeW50YXhLaW5kKTtcbiAgbm9kZS5wYXJlbnQgPSBjdHgubm9kZTtcbiAgcmV0dXJuIGN0eC5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgICAgaWYgKG5vZGUua2luZCA+IHRzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kQ2hpbGQpO1xuICAgICAgICByZXR1cm4gYmV0dGVyTm9kZSB8fCBub2RlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBub2RlID0gdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZpbmRDaGlsZCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCk6IERlZmluaXRpb24ge1xuICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzeW1ib2wuZGVjbGFyYXRpb25zO1xuICBpZiAoZGVjbGFyYXRpb25zKSB7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9ucy5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGVOYW1lOiBzb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgICBzcGFuOiB7c3RhcnQ6IGRlY2xhcmF0aW9uLmdldFN0YXJ0KCksIGVuZDogZGVjbGFyYXRpb24uZ2V0RW5kKCl9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcmVudERlY2xhcmF0aW9uT2Yobm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8dW5kZWZpbmVkIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW50ZXJmYWNlRGVjbGFyYXRpb246XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGU6XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudCAhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lck9mKHN5bWJvbDogdHMuU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBpZiAoc3ltYm9sLmdldEZsYWdzKCkgJiB0cy5TeW1ib2xGbGFncy5DbGFzc01lbWJlciAmJiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnREZWNsYXJhdGlvbk9mKGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQuY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihwYXJlbnQpO1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VHlwZVBhcmFtZXRlck9mKHR5cGU6IHRzLlR5cGUsIG5hbWU6IHN0cmluZyk6IHRzLlR5cGV8dW5kZWZpbmVkIHtcbiAgaWYgKHR5cGUgJiYgdHlwZS5zeW1ib2wgJiYgdHlwZS5zeW1ib2wubmFtZSA9PSBuYW1lKSB7XG4gICAgY29uc3QgdHlwZUFyZ3VtZW50czogdHMuVHlwZVtdID0gKHR5cGUgYXMgYW55KS50eXBlQXJndW1lbnRzO1xuICAgIGlmICh0eXBlQXJndW1lbnRzICYmIHR5cGVBcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHJldHVybiB0eXBlQXJndW1lbnRzWzBdO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlS2luZE9mKHR5cGU6IHRzLlR5cGUgfCB1bmRlZmluZWQpOiBCdWlsdGluVHlwZSB7XG4gIGlmICh0eXBlKSB7XG4gICAgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuQW55KSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuQW55O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLlN0cmluZyB8IHRzLlR5cGVGbGFncy5TdHJpbmdMaWtlIHwgdHMuVHlwZUZsYWdzLlN0cmluZ0xpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuU3RyaW5nO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuTnVtYmVyIHwgdHMuVHlwZUZsYWdzLk51bWJlckxpa2UpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVtYmVyO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuVW5kZWZpbmVkKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLk51bGwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVsbDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuVW5pb24pIHtcbiAgICAgIC8vIElmIGFsbCB0aGUgY29uc3RpdHVlbnQgdHlwZXMgb2YgYSB1bmlvbiBhcmUgdGhlIHNhbWUga2luZCwgaXQgaXMgYWxzbyB0aGF0IGtpbmQuXG4gICAgICBsZXQgY2FuZGlkYXRlOiBCdWlsdGluVHlwZXxudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IHVuaW9uVHlwZSA9IHR5cGUgYXMgdHMuVW5pb25UeXBlO1xuICAgICAgaWYgKHVuaW9uVHlwZS50eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNhbmRpZGF0ZSA9IHR5cGVLaW5kT2YodW5pb25UeXBlLnR5cGVzWzBdKTtcbiAgICAgICAgZm9yIChjb25zdCBzdWJUeXBlIG9mIHVuaW9uVHlwZS50eXBlcykge1xuICAgICAgICAgIGlmIChjYW5kaWRhdGUgIT0gdHlwZUtpbmRPZihzdWJUeXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLk90aGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNhbmRpZGF0ZSAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgdHMuVHlwZUZsYWdzLlR5cGVQYXJhbWV0ZXIpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5VbmJvdW5kO1xuICAgIH1cbiAgfVxuICByZXR1cm4gQnVpbHRpblR5cGUuT3RoZXI7XG59XG5cbmZ1bmN0aW9uIGdldEZyb21TeW1ib2xUYWJsZShzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGUsIGtleTogc3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRhYmxlID0gc3ltYm9sVGFibGUgYXMgYW55O1xuICBsZXQgc3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuXG4gIGlmICh0eXBlb2YgdGFibGUuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVFMgMi4yIHVzZXMgYSBNYXBcbiAgICBzeW1ib2wgPSB0YWJsZS5nZXQoa2V5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUUyBwcmUtMi4yIHVzZXMgYW4gb2JqZWN0XG4gICAgc3ltYm9sID0gdGFibGVba2V5XTtcbiAgfVxuXG4gIHJldHVybiBzeW1ib2w7XG59XG4iXX0=