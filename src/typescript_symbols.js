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
                var tSymbol = type.tsType.symbol;
                var tArgs = type.typeArguments();
                if (!tSymbol || tSymbol.name !== 'Array' || !tArgs || tArgs.length != 1)
                    return;
                return tArgs[0];
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
            var type = getTypeWrapper(symbol);
            return type && type.tsType;
        };
        return TypeScriptSymbolQuery;
    }());
    function getTypeWrapper(symbol) {
        var type = undefined;
        if (symbol instanceof TypeWrapper) {
            type = symbol;
        }
        else if (symbol.type instanceof TypeWrapper) {
            type = symbol.type;
        }
        return type;
    }
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
        TypeWrapper.prototype.indexed = function (argument, value) {
            var type = getTypeWrapper(argument);
            if (!type)
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
            // TODO: use checker.getTypeArguments when TS 3.7 lands in the monorepo.
            var typeArguments = this.tsType.typeArguments;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zeW1ib2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbGFuZ3VhZ2Utc2VydmljZS9zcmMvdHlwZXNjcmlwdF9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsaUVBQXlJO0lBRXpJLHNDQUFzQztJQUN0QywyQ0FBMkM7SUFDM0MsSUFBTSxTQUFTLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsVUFBQyxJQUFhO1lBQ1YsT0FBQSxDQUFDLENBQUMsQ0FBRSxFQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEdBQUksRUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFBbEYsQ0FBa0YsQ0FBQyxDQUFDLENBQUM7UUFDMUYsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBOUMsQ0FBOEMsQ0FBQyxDQUFDO0lBRXhFLElBQU0sZUFBZSxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxDQUFDLFVBQUMsSUFBYTtZQUNWLE9BQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBSSxFQUFVLENBQUMsU0FBUyxDQUFDLE1BQU07Z0JBQ3hDLElBQVksQ0FBQyxXQUFXLEdBQUksRUFBVSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFEakUsQ0FDaUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsQ0FBQyxVQUFDLElBQWEsSUFBSyxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBQyxDQUFD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QUMsQ0FBQzs7d0JBQzNDLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxXQUFTLENBQUMsS0FBSyxDQUFBLGdCQUFBLDRCQUFFOzRCQUFsQyxJQUFNLE9BQU8sV0FBQTs0QkFDaEIsSUFBSSxTQUFTLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dDQUNwQyxPQUFPLHFCQUFXLENBQUMsS0FBSyxDQUFDOzZCQUMxQjt5QkFDRjs7Ozs7Ozs7O2lCQUNGO2dCQUNELElBQUksU0FBUyxJQUFJLElBQUksRUFBRTtvQkFDckIsT0FBTyxTQUFTLENBQUM7aUJBQ2xCO2FBQ0Y7aUJBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFO2dCQUNsRCxPQUFPLHFCQUFXLENBQUMsT0FBTyxDQUFDO2FBQzVCO1NBQ0Y7UUFDRCxPQUFPLHFCQUFXLENBQUMsS0FBSyxDQUFDO0lBQzNCLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFDLFdBQTJCLEVBQUUsR0FBVztRQUNsRSxJQUFNLEtBQUssR0FBRyxXQUFrQixDQUFDO1FBQ2pDLElBQUksTUFBMkIsQ0FBQztRQUVoQyxJQUFJLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxVQUFVLEVBQUU7WUFDbkMsb0JBQW9CO1lBQ3BCLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pCO2FBQU07WUFDTCw0QkFBNEI7WUFDNUIsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyQjtRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZVBpcGVTdW1tYXJ5LCBTdGF0aWNTeW1ib2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCdWlsdGluVHlwZSwgRGVjbGFyYXRpb25LaW5kLCBEZWZpbml0aW9uLCBTaWduYXR1cmUsIFNwYW4sIFN5bWJvbCwgU3ltYm9sRGVjbGFyYXRpb24sIFN5bWJvbFF1ZXJ5LCBTeW1ib2xUYWJsZX0gZnJvbSAnLi9zeW1ib2xzJztcblxuLy8gSW4gVHlwZVNjcmlwdCAyLjEgdGhlc2UgZmxhZ3MgbW92ZWRcbi8vIFRoZXNlIGhlbHBlcnMgd29yayBmb3IgYm90aCAyLjAgYW5kIDIuMS5cbmNvbnN0IGlzUHJpdmF0ZSA9ICh0cyBhcyBhbnkpLk1vZGlmaWVyRmxhZ3MgP1xuICAgICgobm9kZTogdHMuTm9kZSkgPT5cbiAgICAgICAgICEhKCh0cyBhcyBhbnkpLmdldENvbWJpbmVkTW9kaWZpZXJGbGFncyhub2RlKSAmICh0cyBhcyBhbnkpLk1vZGlmaWVyRmxhZ3MuUHJpdmF0ZSkpIDpcbiAgICAoKG5vZGU6IHRzLk5vZGUpID0+ICEhKG5vZGUuZmxhZ3MgJiAodHMgYXMgYW55KS5Ob2RlRmxhZ3MuUHJpdmF0ZSkpO1xuXG5jb25zdCBpc1JlZmVyZW5jZVR5cGUgPSAodHMgYXMgYW55KS5PYmplY3RGbGFncyA/XG4gICAgKCh0eXBlOiB0cy5UeXBlKSA9PlxuICAgICAgICAgISEodHlwZS5mbGFncyAmICh0cyBhcyBhbnkpLlR5cGVGbGFncy5PYmplY3QgJiZcbiAgICAgICAgICAgICh0eXBlIGFzIGFueSkub2JqZWN0RmxhZ3MgJiAodHMgYXMgYW55KS5PYmplY3RGbGFncy5SZWZlcmVuY2UpKSA6XG4gICAgKCh0eXBlOiB0cy5UeXBlKSA9PiAhISh0eXBlLmZsYWdzICYgKHRzIGFzIGFueSkuVHlwZUZsYWdzLlJlZmVyZW5jZSkpO1xuXG5pbnRlcmZhY2UgVHlwZUNvbnRleHQge1xuICBub2RlOiB0cy5Ob2RlO1xuICBwcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN5bWJvbFF1ZXJ5KFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gICAgZmV0Y2hQaXBlczogKCkgPT4gU3ltYm9sVGFibGUpOiBTeW1ib2xRdWVyeSB7XG4gIHJldHVybiBuZXcgVHlwZVNjcmlwdFN5bWJvbFF1ZXJ5KHByb2dyYW0sIGNoZWNrZXIsIHNvdXJjZSwgZmV0Y2hQaXBlcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc01lbWJlcnMoXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHN0YXRpY1N5bWJvbDogU3RhdGljU3ltYm9sKTogU3ltYm9sVGFibGV8XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGVjbGFyYXRpb24gPSBnZXRDbGFzc0Zyb21TdGF0aWNTeW1ib2wocHJvZ3JhbSwgc3RhdGljU3ltYm9sKTtcbiAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgY29uc3QgdHlwZSA9IGNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGNvbnN0IG5vZGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoc3RhdGljU3ltYm9sLmZpbGVQYXRoKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0eXBlLCB7bm9kZSwgcHJvZ3JhbSwgY2hlY2tlcn0pLm1lbWJlcnMoKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbihcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGRlY2xhcmF0aW9uOiB0cy5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gIGNvbnN0IHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKGRlY2xhcmF0aW9uKTtcbiAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0eXBlLCB7bm9kZTogc291cmNlLCBwcm9ncmFtLCBjaGVja2VyfSkubWVtYmVycygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NGcm9tU3RhdGljU3ltYm9sKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIHR5cGU6IFN0YXRpY1N5bWJvbCk6IHRzLkNsYXNzRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgY29uc3Qgc291cmNlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHR5cGUuZmlsZVBhdGgpO1xuICBpZiAoc291cmNlKSB7XG4gICAgcmV0dXJuIHRzLmZvckVhY2hDaGlsZChzb3VyY2UsIGNoaWxkID0+IHtcbiAgICAgIGlmIChjaGlsZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IGNoaWxkIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLm5hbWUgIT0gbnVsbCAmJiBjbGFzc0RlY2xhcmF0aW9uLm5hbWUudGV4dCA9PT0gdHlwZS5uYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIGNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSBhcyh0cy5DbGFzc0RlY2xhcmF0aW9uIHwgdW5kZWZpbmVkKTtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQaXBlc1RhYmxlKFxuICAgIHNvdXJjZTogdHMuU291cmNlRmlsZSwgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgcGlwZXM6IENvbXBpbGVQaXBlU3VtbWFyeVtdKTogU3ltYm9sVGFibGUge1xuICByZXR1cm4gbmV3IFBpcGVzVGFibGUocGlwZXMsIHtwcm9ncmFtLCBjaGVja2VyLCBub2RlOiBzb3VyY2V9KTtcbn1cblxuY2xhc3MgVHlwZVNjcmlwdFN5bWJvbFF1ZXJ5IGltcGxlbWVudHMgU3ltYm9sUXVlcnkge1xuICBwcml2YXRlIHR5cGVDYWNoZSA9IG5ldyBNYXA8QnVpbHRpblR5cGUsIFN5bWJvbD4oKTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgcGlwZXNDYWNoZSAhOiBTeW1ib2xUYWJsZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBwcml2YXRlIGZldGNoUGlwZXM6ICgpID0+IFN5bWJvbFRhYmxlKSB7fVxuXG4gIGdldFR5cGVLaW5kKHN5bWJvbDogU3ltYm9sKTogQnVpbHRpblR5cGUgeyByZXR1cm4gdHlwZUtpbmRPZih0aGlzLmdldFRzVHlwZU9mKHN5bWJvbCkpOyB9XG5cbiAgZ2V0QnVpbHRpblR5cGUoa2luZDogQnVpbHRpblR5cGUpOiBTeW1ib2wge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLnR5cGVDYWNoZS5nZXQoa2luZCk7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBnZXRUc1R5cGVGcm9tQnVpbHRpblR5cGUoa2luZCwge1xuICAgICAgICBjaGVja2VyOiB0aGlzLmNoZWNrZXIsXG4gICAgICAgIG5vZGU6IHRoaXMuc291cmNlLFxuICAgICAgICBwcm9ncmFtOiB0aGlzLnByb2dyYW0sXG4gICAgICB9KTtcbiAgICAgIHJlc3VsdCA9XG4gICAgICAgICAgbmV3IFR5cGVXcmFwcGVyKHR5cGUsIHtwcm9ncmFtOiB0aGlzLnByb2dyYW0sIGNoZWNrZXI6IHRoaXMuY2hlY2tlciwgbm9kZTogdGhpcy5zb3VyY2V9KTtcbiAgICAgIHRoaXMudHlwZUNhY2hlLnNldChraW5kLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0VHlwZVVuaW9uKC4uLnR5cGVzOiBTeW1ib2xbXSk6IFN5bWJvbCB7XG4gICAgLy8gTm8gQVBJIGV4aXN0cyBzbyByZXR1cm4gYW55IGlmIHRoZSB0eXBlcyBhcmUgbm90IGFsbCB0aGUgc2FtZSB0eXBlLlxuICAgIGxldCByZXN1bHQ6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHR5cGVzLmxlbmd0aCkge1xuICAgICAgcmVzdWx0ID0gdHlwZXNbMF07XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHR5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlc1tpXSAhPSByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCB8fCB0aGlzLmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG4gIH1cblxuICBnZXRBcnJheVR5cGUodHlwZTogU3ltYm9sKTogU3ltYm9sIHsgcmV0dXJuIHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTsgfVxuXG4gIGdldEVsZW1lbnRUeXBlKHR5cGU6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICh0eXBlIGluc3RhbmNlb2YgVHlwZVdyYXBwZXIpIHtcbiAgICAgIGNvbnN0IHRTeW1ib2wgPSB0eXBlLnRzVHlwZS5zeW1ib2w7XG4gICAgICBjb25zdCB0QXJncyA9IHR5cGUudHlwZUFyZ3VtZW50cygpO1xuICAgICAgaWYgKCF0U3ltYm9sIHx8IHRTeW1ib2wubmFtZSAhPT0gJ0FycmF5JyB8fCAhdEFyZ3MgfHwgdEFyZ3MubGVuZ3RoICE9IDEpIHJldHVybjtcbiAgICAgIHJldHVybiB0QXJnc1swXTtcbiAgICB9XG4gIH1cblxuICBnZXROb25OdWxsYWJsZVR5cGUoc3ltYm9sOiBTeW1ib2wpOiBTeW1ib2wge1xuICAgIGlmIChzeW1ib2wgaW5zdGFuY2VvZiBUeXBlV3JhcHBlciAmJiAodHlwZW9mIHRoaXMuY2hlY2tlci5nZXROb25OdWxsYWJsZVR5cGUgPT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgIGNvbnN0IHRzVHlwZSA9IHN5bWJvbC50c1R5cGU7XG4gICAgICBjb25zdCBub25OdWxsYWJsZVR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0Tm9uTnVsbGFibGVUeXBlKHRzVHlwZSk7XG4gICAgICBpZiAobm9uTnVsbGFibGVUeXBlICE9IHRzVHlwZSkge1xuICAgICAgICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKG5vbk51bGxhYmxlVHlwZSwgc3ltYm9sLmNvbnRleHQpO1xuICAgICAgfSBlbHNlIGlmIChub25OdWxsYWJsZVR5cGUgPT0gdHNUeXBlKSB7XG4gICAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG4gIH1cblxuICBnZXRQaXBlcygpOiBTeW1ib2xUYWJsZSB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMucGlwZXNDYWNoZTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5waXBlc0NhY2hlID0gdGhpcy5mZXRjaFBpcGVzKCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUZW1wbGF0ZUNvbnRleHQodHlwZTogU3RhdGljU3ltYm9sKTogU3ltYm9sVGFibGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlQ29udGV4dCA9IHtub2RlOiB0aGlzLnNvdXJjZSwgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXJ9O1xuICAgIGNvbnN0IHR5cGVTeW1ib2wgPSBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgY29udGV4dCk7XG4gICAgaWYgKHR5cGVTeW1ib2wpIHtcbiAgICAgIGNvbnN0IGNvbnRleHRUeXBlID0gdGhpcy5nZXRUZW1wbGF0ZVJlZkNvbnRleHRUeXBlKHR5cGVTeW1ib2wpO1xuICAgICAgaWYgKGNvbnRleHRUeXBlKSByZXR1cm4gbmV3IFN5bWJvbFdyYXBwZXIoY29udGV4dFR5cGUsIGNvbnRleHQpLm1lbWJlcnMoKTtcbiAgICB9XG4gIH1cblxuICBnZXRUeXBlU3ltYm9sKHR5cGU6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVDb250ZXh0ID0ge25vZGU6IHRoaXMuc291cmNlLCBwcm9ncmFtOiB0aGlzLnByb2dyYW0sIGNoZWNrZXI6IHRoaXMuY2hlY2tlcn07XG4gICAgY29uc3QgdHlwZVN5bWJvbCA9IGZpbmRDbGFzc1N5bWJvbEluQ29udGV4dCh0eXBlLCBjb250ZXh0KTtcbiAgICByZXR1cm4gdHlwZVN5bWJvbCAmJiBuZXcgU3ltYm9sV3JhcHBlcih0eXBlU3ltYm9sLCBjb250ZXh0KTtcbiAgfVxuXG4gIGNyZWF0ZVN5bWJvbFRhYmxlKHN5bWJvbHM6IFN5bWJvbERlY2xhcmF0aW9uW10pOiBTeW1ib2xUYWJsZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcFN5bWJvbFRhYmxlKCk7XG4gICAgcmVzdWx0LmFkZEFsbChzeW1ib2xzLm1hcChzID0+IG5ldyBEZWNsYXJlZFN5bWJvbChzKSkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBtZXJnZVN5bWJvbFRhYmxlKHN5bWJvbFRhYmxlczogU3ltYm9sVGFibGVbXSk6IFN5bWJvbFRhYmxlIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwU3ltYm9sVGFibGUoKTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbFRhYmxlIG9mIHN5bWJvbFRhYmxlcykge1xuICAgICAgcmVzdWx0LmFkZEFsbChzeW1ib2xUYWJsZS52YWx1ZXMoKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRTcGFuQXQobGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3BhbkF0KHRoaXMuc291cmNlLCBsaW5lLCBjb2x1bW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZVJlZkNvbnRleHRUeXBlKHR5cGVTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0VHlwZU9mU3ltYm9sQXRMb2NhdGlvbih0eXBlU3ltYm9sLCB0aGlzLnNvdXJjZSk7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSB0eXBlLnN5bWJvbCAmJiB0eXBlLnN5bWJvbC5tZW1iZXJzICYmXG4gICAgICAgIGdldEZyb21TeW1ib2xUYWJsZSh0eXBlLnN5bWJvbC5tZW1iZXJzICEsICdfX2NvbnN0cnVjdG9yJyk7XG5cbiAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yRGVjbGFyYXRpb24gPSBjb25zdHJ1Y3Rvci5kZWNsYXJhdGlvbnMgIVswXSBhcyB0cy5Db25zdHJ1Y3RvclR5cGVOb2RlO1xuICAgICAgZm9yIChjb25zdCBwYXJhbWV0ZXIgb2YgY29uc3RydWN0b3JEZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24ocGFyYW1ldGVyLnR5cGUgISk7XG4gICAgICAgIGlmICh0eXBlLnN5bWJvbCAhLm5hbWUgPT0gJ1RlbXBsYXRlUmVmJyAmJiBpc1JlZmVyZW5jZVR5cGUodHlwZSkpIHtcbiAgICAgICAgICBjb25zdCB0eXBlUmVmZXJlbmNlID0gdHlwZSBhcyB0cy5UeXBlUmVmZXJlbmNlO1xuICAgICAgICAgIGlmICh0eXBlUmVmZXJlbmNlLnR5cGVBcmd1bWVudHMgJiYgdHlwZVJlZmVyZW5jZS50eXBlQXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVSZWZlcmVuY2UudHlwZUFyZ3VtZW50c1swXS5zeW1ib2w7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRUc1R5cGVPZihzeW1ib2w6IFN5bWJvbCk6IHRzLlR5cGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0eXBlID0gZ2V0VHlwZVdyYXBwZXIoc3ltYm9sKTtcbiAgICByZXR1cm4gdHlwZSAmJiB0eXBlLnRzVHlwZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUeXBlV3JhcHBlcihzeW1ib2w6IFN5bWJvbCk6IFR5cGVXcmFwcGVyfHVuZGVmaW5lZCB7XG4gIGxldCB0eXBlOiBUeXBlV3JhcHBlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmIChzeW1ib2wgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgIHR5cGUgPSBzeW1ib2w7XG4gIH0gZWxzZSBpZiAoc3ltYm9sLnR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgIHR5cGUgPSBzeW1ib2wudHlwZTtcbiAgfVxuICByZXR1cm4gdHlwZTtcbn1cblxuZnVuY3Rpb24gdHlwZUNhbGxhYmxlKHR5cGU6IHRzLlR5cGUpOiBib29sZWFuIHtcbiAgY29uc3Qgc2lnbmF0dXJlcyA9IHR5cGUuZ2V0Q2FsbFNpZ25hdHVyZXMoKTtcbiAgcmV0dXJuIHNpZ25hdHVyZXMgJiYgc2lnbmF0dXJlcy5sZW5ndGggIT0gMDtcbn1cblxuZnVuY3Rpb24gc2lnbmF0dXJlc09mKHR5cGU6IHRzLlR5cGUsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogU2lnbmF0dXJlW10ge1xuICByZXR1cm4gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpLm1hcChzID0+IG5ldyBTaWduYXR1cmVXcmFwcGVyKHMsIGNvbnRleHQpKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0U2lnbmF0dXJlKHR5cGU6IHRzLlR5cGUsIGNvbnRleHQ6IFR5cGVDb250ZXh0LCB0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8XG4gICAgdW5kZWZpbmVkIHtcbiAgLy8gVE9ETzogRG8gYSBiZXR0ZXIgam9iIG9mIHNlbGVjdGluZyB0aGUgcmlnaHQgc2lnbmF0dXJlLlxuICBjb25zdCBzaWduYXR1cmVzID0gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpO1xuICByZXR1cm4gc2lnbmF0dXJlcy5sZW5ndGggPyBuZXcgU2lnbmF0dXJlV3JhcHBlcihzaWduYXR1cmVzWzBdLCBjb250ZXh0KSA6IHVuZGVmaW5lZDtcbn1cblxuY2xhc3MgVHlwZVdyYXBwZXIgaW1wbGVtZW50cyBTeW1ib2wge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgdHNUeXBlOiB0cy5UeXBlLCBwdWJsaWMgY29udGV4dDogVHlwZUNvbnRleHQpIHtcbiAgICBpZiAoIXRzVHlwZSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0ludGVybmFsOiBudWxsIHR5cGUnKTtcbiAgICB9XG4gIH1cblxuICBnZXQgbmFtZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5jb250ZXh0LmNoZWNrZXIudHlwZVRvU3RyaW5nKHRoaXMudHNUeXBlKTsgfVxuXG4gIHB1YmxpYyByZWFkb25seSBraW5kOiBEZWNsYXJhdGlvbktpbmQgPSAndHlwZSc7XG5cbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAndHlwZXNjcmlwdCc7XG5cbiAgcHVibGljIHJlYWRvbmx5IHR5cGU6IFN5bWJvbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHVibGljIHJlYWRvbmx5IGNvbnRhaW5lcjogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljOiBib29sZWFuID0gdHJ1ZTtcblxuICBnZXQgY2FsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0eXBlQ2FsbGFibGUodGhpcy50c1R5cGUpOyB9XG5cbiAgZ2V0IG51bGxhYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXROb25OdWxsYWJsZVR5cGUodGhpcy50c1R5cGUpICE9IHRoaXMudHNUeXBlO1xuICB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCh0aGlzLmNvbnRleHQuY2hlY2tlcik7XG4gIH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgcmV0dXJuIHN5bWJvbCA/IGRlZmluaXRpb25Gcm9tVHNTeW1ib2woc3ltYm9sKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIC8vIFNob3VsZCBjYWxsIGdldEFwcGFyZW50UHJvcGVydGllcygpIGluc3RlYWQgb2YgZ2V0UHJvcGVydGllcygpIGJlY2F1c2VcbiAgICAvLyB0aGUgZm9ybWVyIGluY2x1ZGVzIHByb3BlcnRpZXMgb24gdGhlIGJhc2UgY2xhc3Mgd2hlcmVhcyB0aGUgbGF0dGVyIGRvZXNcbiAgICAvLyBub3QuIFRoaXMgcHJvdmlkZXMgcHJvcGVydGllcyBsaWtlIC5iaW5kKCksIC5jYWxsKCksIC5hcHBseSgpLCBldGMgZm9yXG4gICAgLy8gZnVuY3Rpb25zLlxuICAgIHJldHVybiBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMudHNUeXBlLmdldEFwcGFyZW50UHJvcGVydGllcygpLCB0aGlzLmNvbnRleHQsIHRoaXMudHNUeXBlKTtcbiAgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sLCB2YWx1ZTogYW55KTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IGdldFR5cGVXcmFwcGVyKGFyZ3VtZW50KTtcbiAgICBpZiAoIXR5cGUpIHJldHVybjtcblxuICAgIGNvbnN0IHR5cGVLaW5kID0gdHlwZUtpbmRPZih0eXBlLnRzVHlwZSk7XG4gICAgc3dpdGNoICh0eXBlS2luZCkge1xuICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgIGNvbnN0IG5UeXBlID0gdGhpcy50c1R5cGUuZ2V0TnVtYmVySW5kZXhUeXBlKCk7XG4gICAgICAgIGlmIChuVHlwZSkge1xuICAgICAgICAgIC8vIGdldCB0aGUgcmlnaHQgdHVwbGUgdHlwZSBieSB2YWx1ZSwgbGlrZSAndmFyIHQ6IFtudW1iZXIsIHN0cmluZ107J1xuICAgICAgICAgIGlmIChuVHlwZS5pc1VuaW9uKCkpIHtcbiAgICAgICAgICAgIC8vIHJldHVybiB1bmRlZmluZWQgaWYgYXJyYXkgaW5kZXggb3V0IG9mIGJvdW5kLlxuICAgICAgICAgICAgcmV0dXJuIG5UeXBlLnR5cGVzW3ZhbHVlXSAmJiBuZXcgVHlwZVdyYXBwZXIoblR5cGUudHlwZXNbdmFsdWVdLCB0aGlzLmNvbnRleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKG5UeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgY29uc3Qgc1R5cGUgPSB0aGlzLnRzVHlwZS5nZXRTdHJpbmdJbmRleFR5cGUoKTtcbiAgICAgICAgcmV0dXJuIHNUeXBlICYmIG5ldyBUeXBlV3JhcHBlcihzVHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICB0eXBlQXJndW1lbnRzKCk6IFN5bWJvbFtdfHVuZGVmaW5lZCB7XG4gICAgLy8gVE9ETzogdXNlIGNoZWNrZXIuZ2V0VHlwZUFyZ3VtZW50cyB3aGVuIFRTIDMuNyBsYW5kcyBpbiB0aGUgbW9ub3JlcG8uXG4gICAgY29uc3QgdHlwZUFyZ3VtZW50czogUmVhZG9ubHlBcnJheTx0cy5UeXBlPiA9ICh0aGlzLnRzVHlwZSBhcyBhbnkpLnR5cGVBcmd1bWVudHM7XG4gICAgaWYgKCF0eXBlQXJndW1lbnRzKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0eXBlQXJndW1lbnRzLm1hcCh0YSA9PiBuZXcgVHlwZVdyYXBwZXIodGEsIHRoaXMuY29udGV4dCkpO1xuICB9XG59XG5cbi8vIElmIHN0cmluZ0luZGV4VHlwZSBhIHByaW1pdGl2ZSB0eXBlKGUuZy4gJ3N0cmluZycpLCB0aGUgU3ltYm9sIGlzIHVuZGVmaW5lZDtcbi8vIGFuZCBpbiBBc3RUeXBlLnJlc29sdmVQcm9wZXJ0eVJlYWQgbWV0aG9kLCB0aGUgU3ltYm9sLnR5cGUgc2hvdWxkIGdldCB0aGUgcmlnaHQgdHlwZS5cbmNsYXNzIFN0cmluZ0luZGV4VHlwZVdyYXBwZXIgZXh0ZW5kcyBUeXBlV3JhcHBlciB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlID0gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpO1xufVxuXG5jbGFzcyBTeW1ib2xXcmFwcGVyIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHJpdmF0ZSBzeW1ib2w6IHRzLlN5bWJvbDtcbiAgcHJpdmF0ZSBfbWVtYmVycz86IFN5bWJvbFRhYmxlO1xuXG4gIHB1YmxpYyByZWFkb25seSBudWxsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHN5bWJvbDogdHMuU3ltYm9sLFxuICAgICAgLyoqIFR5cGVTY3JpcHQgdHlwZSBjb250ZXh0IG9mIHRoZSBzeW1ib2wuICovXG4gICAgICBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0LFxuICAgICAgLyoqIFR5cGUgb2YgdGhlIFR5cGVTY3JpcHQgc3ltYm9sLCBpZiBrbm93bi4gSWYgbm90IHByb3ZpZGVkLCB0aGUgdHlwZSBvZiB0aGUgc3ltYm9sXG4gICAgICAqIHdpbGwgYmUgZGV0ZXJtaW5lZCBkeW5hbWljYWxseTsgc2VlIGBTeW1ib2xXcmFwcGVyI3RzVHlwZWAuICovXG4gICAgICBwcml2YXRlIF90c1R5cGU/OiB0cy5UeXBlKSB7XG4gICAgdGhpcy5zeW1ib2wgPSBzeW1ib2wgJiYgY29udGV4dCAmJiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpID9cbiAgICAgICAgY29udGV4dC5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKSA6XG4gICAgICAgIHN5bWJvbDtcbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bWJvbC5uYW1lOyB9XG5cbiAgZ2V0IGtpbmQoKTogRGVjbGFyYXRpb25LaW5kIHsgcmV0dXJuIHRoaXMuY2FsbGFibGUgPyAnbWV0aG9kJyA6ICdwcm9wZXJ0eSc7IH1cblxuICBnZXQgdHlwZSgpOiBUeXBlV3JhcHBlciB7IHJldHVybiBuZXcgVHlwZVdyYXBwZXIodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7IH1cblxuICBnZXQgY29udGFpbmVyKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gZ2V0Q29udGFpbmVyT2YodGhpcy5zeW1ib2wsIHRoaXMuY29udGV4dCk7IH1cblxuICBnZXQgcHVibGljKCk6IGJvb2xlYW4ge1xuICAgIC8vIFN5bWJvbHMgdGhhdCBhcmUgbm90IGV4cGxpY2l0bHkgbWFkZSBwcml2YXRlIGFyZSBwdWJsaWMuXG4gICAgcmV0dXJuICFpc1N5bWJvbFByaXZhdGUodGhpcy5zeW1ib2wpO1xuICB9XG5cbiAgZ2V0IGNhbGxhYmxlKCk6IGJvb2xlYW4geyByZXR1cm4gdHlwZUNhbGxhYmxlKHRoaXMudHNUeXBlKTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbCh0aGlzLnN5bWJvbCk7IH1cblxuICBnZXQgZG9jdW1lbnRhdGlvbigpOiB0cy5TeW1ib2xEaXNwbGF5UGFydFtdIHtcbiAgICByZXR1cm4gdGhpcy5zeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQodGhpcy5jb250ZXh0LmNoZWNrZXIpO1xuICB9XG5cbiAgbWVtYmVycygpOiBTeW1ib2xUYWJsZSB7XG4gICAgaWYgKCF0aGlzLl9tZW1iZXJzKSB7XG4gICAgICBpZiAoKHRoaXMuc3ltYm9sLmZsYWdzICYgKHRzLlN5bWJvbEZsYWdzLkNsYXNzIHwgdHMuU3ltYm9sRmxhZ3MuSW50ZXJmYWNlKSkgIT0gMCkge1xuICAgICAgICBjb25zdCBkZWNsYXJlZFR5cGUgPSB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXREZWNsYXJlZFR5cGVPZlN5bWJvbCh0aGlzLnN5bWJvbCk7XG4gICAgICAgIGNvbnN0IHR5cGVXcmFwcGVyID0gbmV3IFR5cGVXcmFwcGVyKGRlY2xhcmVkVHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5fbWVtYmVycyA9IHR5cGVXcmFwcGVyLm1lbWJlcnMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX21lbWJlcnMgPSBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMuc3ltYm9sLm1lbWJlcnMgISwgdGhpcy5jb250ZXh0LCB0aGlzLnRzVHlwZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9tZW1iZXJzO1xuICB9XG5cbiAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXSB7IHJldHVybiBzaWduYXR1cmVzT2YodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNlbGVjdFNpZ25hdHVyZSh0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0LCB0eXBlcyk7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIHR5cGVBcmd1bWVudHMoKTogU3ltYm9sW118dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMudHlwZS50eXBlQXJndW1lbnRzKCk7IH1cblxuICBwcml2YXRlIGdldCB0c1R5cGUoKTogdHMuVHlwZSB7XG4gICAgbGV0IHR5cGUgPSB0aGlzLl90c1R5cGU7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID1cbiAgICAgICAgICB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHRoaXMuc3ltYm9sLCB0aGlzLmNvbnRleHQubm9kZSk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlO1xuICB9XG59XG5cbmNsYXNzIERlY2xhcmVkU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgcHVibGljIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmcgPSAnbmctdGVtcGxhdGUnO1xuXG4gIHB1YmxpYyByZWFkb25seSBudWxsYWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVjbGFyYXRpb246IFN5bWJvbERlY2xhcmF0aW9uKSB7fVxuXG4gIGdldCBuYW1lKCkgeyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5uYW1lOyB9XG5cbiAgZ2V0IGtpbmQoKSB7IHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLmtpbmQ7IH1cblxuICBnZXQgY29udGFpbmVyKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG5cbiAgZ2V0IHR5cGUoKTogU3ltYm9sIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZTsgfVxuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZS5jYWxsYWJsZTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb24geyByZXR1cm4gdGhpcy5kZWNsYXJhdGlvbi5kZWZpbml0aW9uOyB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7IHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLnR5cGUuZG9jdW1lbnRhdGlvbjsgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUgeyByZXR1cm4gdGhpcy50eXBlLm1lbWJlcnMoKTsgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gdGhpcy50eXBlLnNpZ25hdHVyZXMoKTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMudHlwZS5zZWxlY3RTaWduYXR1cmUodHlwZXMpOyB9XG5cbiAgdHlwZUFyZ3VtZW50cygpOiBTeW1ib2xbXXx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy50eXBlLnR5cGVBcmd1bWVudHMoKTsgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG59XG5cbmNsYXNzIFNpZ25hdHVyZVdyYXBwZXIgaW1wbGVtZW50cyBTaWduYXR1cmUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNpZ25hdHVyZTogdHMuU2lnbmF0dXJlLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBhcmd1bWVudHMoKTogU3ltYm9sVGFibGUge1xuICAgIHJldHVybiBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMuc2lnbmF0dXJlLmdldFBhcmFtZXRlcnMoKSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIGdldCByZXN1bHQoKTogU3ltYm9sIHsgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0aGlzLnNpZ25hdHVyZS5nZXRSZXR1cm5UeXBlKCksIHRoaXMuY29udGV4dCk7IH1cbn1cblxuY2xhc3MgU2lnbmF0dXJlUmVzdWx0T3ZlcnJpZGUgaW1wbGVtZW50cyBTaWduYXR1cmUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNpZ25hdHVyZTogU2lnbmF0dXJlLCBwcml2YXRlIHJlc3VsdFR5cGU6IFN5bWJvbCkge31cblxuICBnZXQgYXJndW1lbnRzKCk6IFN5bWJvbFRhYmxlIHsgcmV0dXJuIHRoaXMuc2lnbmF0dXJlLmFyZ3VtZW50czsgfVxuXG4gIGdldCByZXN1bHQoKTogU3ltYm9sIHsgcmV0dXJuIHRoaXMucmVzdWx0VHlwZTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9TeW1ib2xUYWJsZUZhY3Rvcnkoc3ltYm9sczogdHMuU3ltYm9sW10pOiB0cy5TeW1ib2xUYWJsZSB7XG4gIC8vIOKIgCBUeXBlc2NyaXB0IHZlcnNpb24gPj0gMi4yLCBgU3ltYm9sVGFibGVgIGlzIGltcGxlbWVudGVkIGFzIGFuIEVTNiBgTWFwYFxuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgdHMuU3ltYm9sPigpO1xuICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBzeW1ib2xzKSB7XG4gICAgcmVzdWx0LnNldChzeW1ib2wubmFtZSwgc3ltYm9sKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQgYXMgdHMuU3ltYm9sVGFibGU7XG59XG5cbmZ1bmN0aW9uIHRvU3ltYm9scyhzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGUgfCB1bmRlZmluZWQpOiB0cy5TeW1ib2xbXSB7XG4gIGlmICghc3ltYm9sVGFibGUpIHJldHVybiBbXTtcblxuICBjb25zdCB0YWJsZSA9IHN5bWJvbFRhYmxlIGFzIGFueTtcblxuICBpZiAodHlwZW9mIHRhYmxlLnZhbHVlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRhYmxlLnZhbHVlcygpKSBhcyB0cy5TeW1ib2xbXTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogdHMuU3ltYm9sW10gPSBbXTtcblxuICBjb25zdCBvd24gPSB0eXBlb2YgdGFibGUuaGFzT3duUHJvcGVydHkgPT09ICdmdW5jdGlvbicgP1xuICAgICAgKG5hbWU6IHN0cmluZykgPT4gdGFibGUuaGFzT3duUHJvcGVydHkobmFtZSkgOlxuICAgICAgKG5hbWU6IHN0cmluZykgPT4gISF0YWJsZVtuYW1lXTtcblxuICBmb3IgKGNvbnN0IG5hbWUgaW4gdGFibGUpIHtcbiAgICBpZiAob3duKG5hbWUpKSB7XG4gICAgICByZXN1bHQucHVzaCh0YWJsZVtuYW1lXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmNsYXNzIFN5bWJvbFRhYmxlV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgcHJpdmF0ZSBzeW1ib2xzOiB0cy5TeW1ib2xbXTtcbiAgcHJpdmF0ZSBzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGU7XG4gIHByaXZhdGUgc3RyaW5nSW5kZXhUeXBlPzogdHMuVHlwZTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHF1ZXJ5YWJsZSB0YWJsZSBvZiBzeW1ib2xzIGJlbG9uZ2luZyB0byBhIFR5cGVTY3JpcHQgZW50aXR5LlxuICAgKiBAcGFyYW0gc3ltYm9scyBzeW1ib2xzIHRvIHF1ZXJ5IGJlbG9uZ2luZyB0byB0aGUgZW50aXR5XG4gICAqIEBwYXJhbSBjb250ZXh0IHByb2dyYW0gY29udGV4dFxuICAgKiBAcGFyYW0gdHlwZSBvcmlnaW5hbCBUeXBlU2NyaXB0IHR5cGUgb2YgZW50aXR5IG93bmluZyB0aGUgc3ltYm9scywgaWYga25vd25cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgc3ltYm9sczogdHMuU3ltYm9sVGFibGV8dHMuU3ltYm9sW10sIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQsIHByaXZhdGUgdHlwZT86IHRzLlR5cGUpIHtcbiAgICBzeW1ib2xzID0gc3ltYm9scyB8fCBbXTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHN5bWJvbHMpKSB7XG4gICAgICB0aGlzLnN5bWJvbHMgPSBzeW1ib2xzO1xuICAgICAgdGhpcy5zeW1ib2xUYWJsZSA9IHRvU3ltYm9sVGFibGVGYWN0b3J5KHN5bWJvbHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN5bWJvbHMgPSB0b1N5bWJvbHMoc3ltYm9scyk7XG4gICAgICB0aGlzLnN5bWJvbFRhYmxlID0gc3ltYm9scztcbiAgICB9XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgdGhpcy5zdHJpbmdJbmRleFR5cGUgPSB0eXBlLmdldFN0cmluZ0luZGV4VHlwZSgpO1xuICAgIH1cbiAgfVxuXG4gIGdldCBzaXplKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnN5bWJvbHMubGVuZ3RoOyB9XG5cbiAgZ2V0KGtleTogc3RyaW5nKTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gZ2V0RnJvbVN5bWJvbFRhYmxlKHRoaXMuc3ltYm9sVGFibGUsIGtleSk7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgcmV0dXJuIG5ldyBTeW1ib2xXcmFwcGVyKHN5bWJvbCwgdGhpcy5jb250ZXh0KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdHJpbmdJbmRleFR5cGUpIHtcbiAgICAgIC8vIElmIHRoZSBrZXkgZG9lcyBub3QgZXhpc3QgYXMgYW4gZXhwbGljaXQgc3ltYm9sIG9uIHRoZSB0eXBlLCBpdCBtYXkgYmUgYWNjZXNzaW5nIGEgc3RyaW5nXG4gICAgICAvLyBpbmRleCBzaWduYXR1cmUgdXNpbmcgZG90IG5vdGF0aW9uOlxuICAgICAgLy9cbiAgICAgIC8vICAgY29uc3Qgb2JqPFQ+OiB7IFtrZXk6IHN0cmluZ106IFQgfTtcbiAgICAgIC8vICAgb2JqLnN0cmluZ0luZGV4IC8vIGVxdWl2YWxlbnQgdG8gb2JqWydzdHJpbmdJbmRleCddO1xuICAgICAgLy9cbiAgICAgIC8vIEluIHRoaXMgY2FzZSwgcmV0dXJuIHRoZSB0eXBlIGluZGV4ZWQgYnkgYW4gYXJiaXRyYXJ5IHN0cmluZyBrZXkuXG4gICAgICByZXR1cm4gbmV3IFN0cmluZ0luZGV4VHlwZVdyYXBwZXIodGhpcy5zdHJpbmdJbmRleFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRhYmxlOiBhbnkgPSB0aGlzLnN5bWJvbFRhYmxlO1xuICAgIHJldHVybiAoKHR5cGVvZiB0YWJsZS5oYXMgPT09ICdmdW5jdGlvbicpID8gdGFibGUuaGFzKGtleSkgOiB0YWJsZVtrZXldICE9IG51bGwpIHx8XG4gICAgICAgIHRoaXMuc3RyaW5nSW5kZXhUeXBlICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10geyByZXR1cm4gdGhpcy5zeW1ib2xzLm1hcChzID0+IG5ldyBTeW1ib2xXcmFwcGVyKHMsIHRoaXMuY29udGV4dCkpOyB9XG59XG5cbmNsYXNzIE1hcFN5bWJvbFRhYmxlIGltcGxlbWVudHMgU3ltYm9sVGFibGUge1xuICBwcml2YXRlIG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBTeW1ib2w+KCk7XG4gIHByaXZhdGUgX3ZhbHVlczogU3ltYm9sW10gPSBbXTtcblxuICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5tYXAuc2l6ZTsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5tYXAuZ2V0KGtleSk7IH1cblxuICBhZGQoc3ltYm9sOiBTeW1ib2wpIHtcbiAgICBpZiAodGhpcy5tYXAuaGFzKHN5bWJvbC5uYW1lKSkge1xuICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLm1hcC5nZXQoc3ltYm9sLm5hbWUpICE7XG4gICAgICB0aGlzLl92YWx1ZXNbdGhpcy5fdmFsdWVzLmluZGV4T2YocHJldmlvdXMpXSA9IHN5bWJvbDtcbiAgICB9XG4gICAgdGhpcy5tYXAuc2V0KHN5bWJvbC5uYW1lLCBzeW1ib2wpO1xuICAgIHRoaXMuX3ZhbHVlcy5wdXNoKHN5bWJvbCk7XG4gIH1cblxuICBhZGRBbGwoc3ltYm9sczogU3ltYm9sW10pIHtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBzeW1ib2xzKSB7XG4gICAgICB0aGlzLmFkZChzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5tYXAuaGFzKGtleSk7IH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10ge1xuICAgIC8vIFN3aXRjaCB0byB0aGlzLm1hcC52YWx1ZXMgb25jZSBpdGVyYWJsZXMgYXJlIHN1cHBvcnRlZCBieSB0aGUgdGFyZ2V0IGxhbmd1YWdlLlxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XG4gIH1cbn1cblxuY2xhc3MgUGlwZXNUYWJsZSBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10sIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQpIHt9XG5cbiAgZ2V0IHNpemUoKSB7IHJldHVybiB0aGlzLnBpcGVzLmxlbmd0aDsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHBpcGUgPSB0aGlzLnBpcGVzLmZpbmQocGlwZSA9PiBwaXBlLm5hbWUgPT0ga2V5KTtcbiAgICBpZiAocGlwZSkge1xuICAgICAgcmV0dXJuIG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgaGFzKGtleTogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnBpcGVzLmZpbmQocGlwZSA9PiBwaXBlLm5hbWUgPT0ga2V5KSAhPSBudWxsOyB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHsgcmV0dXJuIHRoaXMucGlwZXMubWFwKHBpcGUgPT4gbmV3IFBpcGVTeW1ib2wocGlwZSwgdGhpcy5jb250ZXh0KSk7IH1cbn1cblxuLy8gVGhpcyBtYXRjaGVzIC5kLnRzIGZpbGVzIHRoYXQgbG9vayBsaWtlIFwiLi4uLzxwYWNrYWdlLW5hbWU+LzxwYWNrYWdlLW5hbWU+LmQudHNcIixcbmNvbnN0IElOREVYX1BBVFRFUk4gPSAvW1xcXFwvXShbXlxcXFwvXSspW1xcXFwvXVxcMVxcLmRcXC50cyQvO1xuXG5jbGFzcyBQaXBlU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3RzVHlwZSAhOiB0cy5UeXBlO1xuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGVjbGFyYXRpb25LaW5kID0gJ3BpcGUnO1xuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcbiAgcHVibGljIHJlYWRvbmx5IGNvbnRhaW5lcjogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHVibGljIHJlYWRvbmx5IGNhbGxhYmxlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHVibGljIHJlYWRvbmx5IG51bGxhYmxlOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGlwZTogQ29tcGlsZVBpcGVTdW1tYXJ5LCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnBpcGUubmFtZTsgfVxuXG4gIGdldCB0eXBlKCk6IFR5cGVXcmFwcGVyIHsgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIGdldCBkZWZpbml0aW9uKCk6IERlZmluaXRpb258dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnRzVHlwZS5nZXRTeW1ib2woKTtcbiAgICByZXR1cm4gc3ltYm9sID8gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2wpIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0IGRvY3VtZW50YXRpb24oKTogdHMuU3ltYm9sRGlzcGxheVBhcnRbXSB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCh0aGlzLmNvbnRleHQuY2hlY2tlcik7XG4gIH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHsgcmV0dXJuIEVtcHR5VGFibGUuaW5zdGFuY2U7IH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHNpZ25hdHVyZXNPZih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICBsZXQgc2lnbmF0dXJlID0gc2VsZWN0U2lnbmF0dXJlKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQsIHR5cGVzKSAhO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXJhbWV0ZXJUeXBlID0gdHlwZXNbMF07XG4gICAgICBsZXQgcmVzdWx0VHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICAgIGNhc2UgJ2FzeW5jJzpcbiAgICAgICAgICAvLyBHZXQgdHlwZSBhcmd1bWVudCBvZiAnT2JzZXJ2YWJsZScsICdQcm9taXNlJywgb3IgJ0V2ZW50RW1pdHRlcicuXG4gICAgICAgICAgY29uc3QgdEFyZ3MgPSBwYXJhbWV0ZXJUeXBlLnR5cGVBcmd1bWVudHMoKTtcbiAgICAgICAgICBpZiAodEFyZ3MgJiYgdEFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXN1bHRUeXBlID0gdEFyZ3NbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzbGljZSc6XG4gICAgICAgICAgcmVzdWx0VHlwZSA9IHBhcmFtZXRlclR5cGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0VHlwZSkge1xuICAgICAgICBzaWduYXR1cmUgPSBuZXcgU2lnbmF0dXJlUmVzdWx0T3ZlcnJpZGUoc2lnbmF0dXJlLCByZXN1bHRUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNpZ25hdHVyZTtcbiAgfVxuXG4gIGluZGV4ZWQoYXJndW1lbnQ6IFN5bWJvbCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG5cbiAgdHlwZUFyZ3VtZW50cygpOiBTeW1ib2xbXXx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy50eXBlLnR5cGVBcmd1bWVudHMoKTsgfVxuXG4gIHByaXZhdGUgZ2V0IHRzVHlwZSgpOiB0cy5UeXBlIHtcbiAgICBsZXQgdHlwZSA9IHRoaXMuX3RzVHlwZTtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maW5kQ2xhc3NTeW1ib2wodGhpcy5waXBlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gdGhpcy5maW5kVHJhbnNmb3JtTWV0aG9kVHlwZShjbGFzc1N5bWJvbCkgITtcbiAgICAgIH1cbiAgICAgIGlmICghdHlwZSkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSwgdGhpcy5jb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDbGFzc1N5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gZmluZENsYXNzU3ltYm9sSW5Db250ZXh0KHR5cGUsIHRoaXMuY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRUcmFuc2Zvcm1NZXRob2RUeXBlKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5UeXBlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICAgIGlmIChjbGFzc1R5cGUpIHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IGNsYXNzVHlwZS5nZXRQcm9wZXJ0eSgndHJhbnNmb3JtJyk7XG4gICAgICBpZiAodHJhbnNmb3JtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXRUeXBlT2ZTeW1ib2xBdExvY2F0aW9uKHRyYW5zZm9ybSwgdGhpcy5jb250ZXh0Lm5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZTogU3RhdGljU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICBsZXQgc291cmNlRmlsZSA9IGNvbnRleHQucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHR5cGUuZmlsZVBhdGgpO1xuICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAvLyBUaGlzIGhhbmRsZXMgYSBjYXNlIHdoZXJlIGFuIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhbmQgYSA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4uZC50c1xuICAgIC8vIGFyZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuIElmIHdlIGFyZSBsb29raW5nIGZvciA8cGFja2FnZU5hbWU+LzxwYWNrYWdlTmFtZT4gYW5kIGRpZG4ndFxuICAgIC8vIGZpbmQgaXQsIGxvb2sgZm9yIDxwYWNrYWdlTmFtZT4vaW5kZXguZC50cyBhcyB0aGUgcHJvZ3JhbSBtaWdodCBoYXZlIGZvdW5kIHRoYXQgaW5zdGVhZC5cbiAgICBjb25zdCBwID0gdHlwZS5maWxlUGF0aDtcbiAgICBjb25zdCBtID0gcC5tYXRjaChJTkRFWF9QQVRURVJOKTtcbiAgICBpZiAobSkge1xuICAgICAgY29uc3QgaW5kZXhWZXJzaW9uID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShwKSwgJ2luZGV4LmQudHMnKTtcbiAgICAgIHNvdXJjZUZpbGUgPSBjb250ZXh0LnByb2dyYW0uZ2V0U291cmNlRmlsZShpbmRleFZlcnNpb24pO1xuICAgIH1cbiAgfVxuICBpZiAoc291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IChzb3VyY2VGaWxlIGFzIGFueSkubW9kdWxlIHx8IChzb3VyY2VGaWxlIGFzIGFueSkuc3ltYm9sO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBjb250ZXh0LmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCk7XG4gICAgcmV0dXJuIChleHBvcnRzIHx8IFtdKS5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PSB0eXBlLm5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEVtcHR5VGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHB1YmxpYyByZWFkb25seSBzaXplOiBudW1iZXIgPSAwO1xuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIGZhbHNlOyB9XG4gIHZhbHVlcygpOiBTeW1ib2xbXSB7IHJldHVybiBbXTsgfVxuICBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgRW1wdHlUYWJsZSgpO1xufVxuXG5mdW5jdGlvbiBpc1N5bWJvbFByaXZhdGUoczogdHMuU3ltYm9sKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXMudmFsdWVEZWNsYXJhdGlvbiAmJiBpc1ByaXZhdGUocy52YWx1ZURlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gZ2V0VHNUeXBlRnJvbUJ1aWx0aW5UeXBlKGJ1aWx0aW5UeXBlOiBCdWlsdGluVHlwZSwgY3R4OiBUeXBlQ29udGV4dCk6IHRzLlR5cGUge1xuICBsZXQgc3ludGF4S2luZDogdHMuU3ludGF4S2luZDtcbiAgc3dpdGNoIChidWlsdGluVHlwZSkge1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQW55OlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5OdWxsOlxuICAgICAgc3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDpcbiAgICAgIHN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQ7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnRlcm5hbCBlcnJvciwgdW5oYW5kbGVkIGxpdGVyYWwga2luZCAke2J1aWx0aW5UeXBlfToke0J1aWx0aW5UeXBlW2J1aWx0aW5UeXBlXX1gKTtcbiAgfVxuICBjb25zdCBub2RlID0gdHMuY3JlYXRlTm9kZShzeW50YXhLaW5kKTtcbiAgbm9kZS5wYXJlbnQgPSBjdHgubm9kZTtcbiAgcmV0dXJuIGN0eC5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgICAgaWYgKG5vZGUua2luZCA+IHRzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kQ2hpbGQpO1xuICAgICAgICByZXR1cm4gYmV0dGVyTm9kZSB8fCBub2RlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBub2RlID0gdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZpbmRDaGlsZCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCk6IERlZmluaXRpb24ge1xuICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzeW1ib2wuZGVjbGFyYXRpb25zO1xuICBpZiAoZGVjbGFyYXRpb25zKSB7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9ucy5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGVOYW1lOiBzb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgICBzcGFuOiB7c3RhcnQ6IGRlY2xhcmF0aW9uLmdldFN0YXJ0KCksIGVuZDogZGVjbGFyYXRpb24uZ2V0RW5kKCl9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcmVudERlY2xhcmF0aW9uT2Yobm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8dW5kZWZpbmVkIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW50ZXJmYWNlRGVjbGFyYXRpb246XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGU6XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudCAhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lck9mKHN5bWJvbDogdHMuU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBpZiAoc3ltYm9sLmdldEZsYWdzKCkgJiB0cy5TeW1ib2xGbGFncy5DbGFzc01lbWJlciAmJiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnREZWNsYXJhdGlvbk9mKGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQuY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihwYXJlbnQpO1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdHlwZUtpbmRPZih0eXBlOiB0cy5UeXBlIHwgdW5kZWZpbmVkKTogQnVpbHRpblR5cGUge1xuICBpZiAodHlwZSkge1xuICAgIGlmICh0eXBlLmZsYWdzICYgdHMuVHlwZUZsYWdzLkFueSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLkFueTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0eXBlLmZsYWdzICYgKHRzLlR5cGVGbGFncy5TdHJpbmcgfCB0cy5UeXBlRmxhZ3MuU3RyaW5nTGlrZSB8IHRzLlR5cGVGbGFncy5TdHJpbmdMaXRlcmFsKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLlN0cmluZztcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLk51bWJlciB8IHRzLlR5cGVGbGFncy5OdW1iZXJMaWtlKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLk51bWJlcjtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLlVuZGVmaW5lZCkpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5VbmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgKHRzLlR5cGVGbGFncy5OdWxsKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLk51bGw7XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgdHMuVHlwZUZsYWdzLlVuaW9uKSB7XG4gICAgICAvLyBJZiBhbGwgdGhlIGNvbnN0aXR1ZW50IHR5cGVzIG9mIGEgdW5pb24gYXJlIHRoZSBzYW1lIGtpbmQsIGl0IGlzIGFsc28gdGhhdCBraW5kLlxuICAgICAgbGV0IGNhbmRpZGF0ZTogQnVpbHRpblR5cGV8bnVsbCA9IG51bGw7XG4gICAgICBjb25zdCB1bmlvblR5cGUgPSB0eXBlIGFzIHRzLlVuaW9uVHlwZTtcbiAgICAgIGlmICh1bmlvblR5cGUudHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjYW5kaWRhdGUgPSB0eXBlS2luZE9mKHVuaW9uVHlwZS50eXBlc1swXSk7XG4gICAgICAgIGZvciAoY29uc3Qgc3ViVHlwZSBvZiB1bmlvblR5cGUudHlwZXMpIHtcbiAgICAgICAgICBpZiAoY2FuZGlkYXRlICE9IHR5cGVLaW5kT2Yoc3ViVHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBCdWlsdGluVHlwZS5PdGhlcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChjYW5kaWRhdGUgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmIHRzLlR5cGVGbGFncy5UeXBlUGFyYW1ldGVyKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuVW5ib3VuZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEJ1aWx0aW5UeXBlLk90aGVyO1xufVxuXG5mdW5jdGlvbiBnZXRGcm9tU3ltYm9sVGFibGUoc3ltYm9sVGFibGU6IHRzLlN5bWJvbFRhYmxlLCBrZXk6IHN0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICBjb25zdCB0YWJsZSA9IHN5bWJvbFRhYmxlIGFzIGFueTtcbiAgbGV0IHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcblxuICBpZiAodHlwZW9mIHRhYmxlLmdldCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFRTIDIuMiB1c2VzIGEgTWFwXG4gICAgc3ltYm9sID0gdGFibGUuZ2V0KGtleSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVFMgcHJlLTIuMiB1c2VzIGFuIG9iamVjdFxuICAgIHN5bWJvbCA9IHRhYmxlW2tleV07XG4gIH1cblxuICByZXR1cm4gc3ltYm9sO1xufVxuIl19