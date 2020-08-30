const Lexer = require("./quakec-lexer").Lexer;
const Range = require("./quakec-common").Range;

let lexer;

/**
 * Global parsing context object.
 */
let Context = {
    /**
     * The current token.
     *
     * @type {Symbol} token
     */
    token: null,

    /**
     * A table of defined and reserved Symbols.
     *
     * @type {{[id: string]: Symbol}} symbol_table
     */
    symbol_table: {},

    /**
     * The current scope.
     *
     * @type {Scope} scope
     */
    scope: null,

    /**
     * An array of parsed symbols.
     *
     * @type {Symbol[]} symbols
     */
    symbols: [],

    /**
     * An array of Errors.
     *
     * @type {import("typescript").Diagnostic[]} errors
     */
    errors: [],

    /**
     * A string that defines the parser's behavior for handling various language constructs.
     *
     * @type {string} language
     */
    language: "qcc"
};

class Symbol {
    constructor() {
        this.std = null;
        this.ded = null;
        this.tyd = null;
    }
    /**
     * Null denotation parser. Does not care about symbols to the left. Used for parsing literals
     * variables and prefix operators.
     *
     * @returns {Symbol}
     */
    nud () {
        this.error("Undefined.");
    }

    /**
     * Left denotation parser. Used for parsing infix and suffix operators.
     *
     * @param {Symbol} left
     *
     * @returns {Symbol}
     */
    led(left) {
        this.error("Missing operator.");
    }

    /**
     * Statement denotation parser.
     *
     * @returns {Symbol}
     */
    std() {}

    /**
     * Definition statement denotation parser.
     *
     * @returns {Symbol}
     */
    ded() {}

    /**
     * Type denotation parser.
     *
     * @returns {Symbol}
     */
    tyd() {}

    error(message, range) {
        this.diagnostic(message, 1, range);
    }

    warn(message, range) {
        this.diagnostic(message, 2, range);
    }

    diagnostic(message, severity, range) {
        range = range || this.range;
        severity = severity || 4;

        Context.errors.push(
            {
                range: range,
                severity: severity,
                message: `[${Context.language}] ${message}`
            }
        );
    }
}

class Scope {
    /**
     * Create a new Scope as the child of the current Context.scope. Then Context.scope will be set to
     * the newly created Scope.
     *
     * @param {string} uri An optional string identifer. Typically the source document.
     * @param {Scope} parentScope
     */
    constructor(uri, parentScope) {
        if (!uri) {
            if (parentScope && parentScope.uri) {
                uri = parentScope.uri;
            }
            else if (Context.scope && Context.scope.uri) {
                uri = Context.scope.uri;
            }
        }

        /**
         * The associated URI for this Scope. Optional.
         *
         * @type {string} uri
         */
        this.uri = uri;

        /**
         * A associative array of definitions.
         *
         * @type {{[value: string]: Symbol}}} def
         */
        this.def = {};

        /**
         * The parent Scope.
         *
         * @type {Scope} parent
         */
        this.parent = Context.scope || parentScope;

        Context.scope = this;
    }

    /**
     * Transforms a name token into a variable token.
     *
     * @param {Symbol} symbol The Symbol to define.
     * @param {Symbol} type The type of the Symbol.
     */
    define(symbol, type) {
        const t = this.def[symbol.value];
        let alreadyDefined = false;

        if (typeof t === "object" && t && (t.constant || !symbol.type.params)) {
            if (t.reserved) {
                symbol.error("Already reserved: '" + symbol.value + "'.");
            }
            else {
                alreadyDefined = true;
                symbol.warn("Already defined: '" + symbol.value + "'.");
            }
        }

        if (!alreadyDefined) {
            this.def[symbol.value] = symbol;
        }

        symbol.reserved = false;
        symbol.nud = itself;
        symbol.led = null;
        symbol.std = null;
        symbol.lbp = 0;
        symbol.scope = Context.scope;
        symbol.type = Object.create(type);

        return symbol;
    }

    /**
     * Finds the definition of a name.
     *
     * @param {Symbol} symbol
     *
     * @returns {Symbol}
     */
    find(symbol) {
        let currentScope = this;
        let prototypeObject;

        while (true) {
            prototypeObject = currentScope.def[symbol];

            if (prototypeObject && typeof prototypeObject !== "function") {
                return currentScope.def[symbol];
            }

            currentScope = currentScope.parent;

            if (!currentScope) {
                prototypeObject = Context.symbol_table[symbol];

                if (prototypeObject && typeof prototypeObject != "function") {
                    return prototypeObject;
                }

                return Context.symbol_table["(name)"];
            }
        }
    }

    /**
     * Opens a Scope and sets the given scope as the Context.scope. This will not change
     * the parent of the given scope.
     *
     * @param {Scope} scope
     */
    push(scope) {
        if (scope.parent !== Context.scope) {
            console.error("Bad scope pushed.");
        }

        Context.scope = scope;
    }

    /**
     * Closes a Scope and sets Context.scope to Context.scope.parent.
     */
    pop() {
        Context.scope = this.parent;
    }

    /**
     * Indicate that the given symbol is a reserved word.
     *
     * @param {Symbol} symbol
     */
    reserve(symbol) {
        if (symbol.arity !== "name" || symbol.reserved) {
            return;
        }

        const definition = this.def[symbol.value];

        if (definition) {
            if (definition.reserved) {
                return;
            }
            if (definition.arity === "name") {
                symbol.error("Already defined.");
            }
        }

        this.def[symbol.value] = symbol;
        symbol.reserved = true;
    }

    constant(symbol) {
        if (symbol.arity === "name") {
            const def = Context.scope.find(symbol.value);
            def.constant = true;
        }
    }
}

/**
 * Namespace for defining language constructs.
 */
class Define {
    /**
     * Defines a symbol with the given id and left binding power.
     *
     * @param {string} id Token id.
     * @param {number} bp Left binding power.
     *
     * @returns {Symbol}
     */
    static symbol(id, bp) {
        let s = Context.symbol_table[id];
        bp = bp || 0;

        if (s) {
            if (bp >= s.lbp) {
                s.lbp = bp;
            }
        }
        else {
            s = new Symbol();
            s.id = s.value = id;
            s.lbp = bp;
            Context.symbol_table[id] = s;
        }

        return s;
    }

    /**
     * Defines an infix operator.
     *
     * @param {string} id
     * @param {number} bp
     * @param {(left: Symbol) => Symbol} led
     *
     * @returns {Symbol}
     */
    static infix(id, bp, led) {
        const symbol = Define.symbol(id, bp);

        symbol.led = led || function(left) {
            this.first = left;
            this.second = Parse.expression(bp);
            this.arity = "binary";

            return this;
        };

        return symbol;
    }

    /**
     * Defines a right-associative infix operator.
     *
     * @param {string} id
     * @param {number} bp
     * @param {(left: Symbol) => Symbol} led
     *
     * @returns {Symbol}
     */
    static infixr(id, bp, led) {
        const symbol = Define.symbol(id, bp);

        symbol.led = led || function(left) {
            this.first = left;
            this.second = Parse.expression(bp - 1);
            this.arity = "binary";

            return this;
        };

        return symbol;
    }

    /**
     * Defines a prefix operator.
     *
     * @param {string} id
     * @param {(left: Symbol) => Symbol} nud
     *
     * @returns {Symbol}
     */
    static prefix(id, nud) {
        const symbol = Define.symbol(id);
        symbol.nud = nud || function() {
            Context.scope.reserve(this);
            this.first = Parse.expression(70);
            this.arity = "unary";

            return this;
        };

        return symbol;
    }

    /**
     * Defines an assignment expression.
     *
     * @param {string} id
     *
     * @returns {Symbol}
     */
    static assignment(id) {
        return Define.infixr(id, 10, function(left) {
            if (left.id !== "." && left.arity !== "name" && left.id !== "[") {
                left.error("Bad lvalue.");
            }

            this.first = left;
            this.second = Parse.expression(9);
            this.assignment = true;
            this.arity = "binary";

            return this;
        });
    }

    /**
     * Defines a statement.
     *
     * @param {string} id
     * @param {() => Symbol} std
     */
    static statement(id, std) {
        const symbol = Define.symbol(id);
        symbol.std = std;

        return symbol;
    }

    /**
     * Defines an immediate.
     *
     * @param {string} id
     * @param {() => Symbol} imd
     */
    static immediate(id, imd) {
        const symbol = Define.symbol(id);
        symbol.imd = imd || function() {
            return Parse.expression(0);
        };

        return symbol;
    }

    /**
     * Defines a definition statement.
     *
     * @param {string} id
     * @param {() => Symbol} std
     * @param {() => Symbol} tyd
     * @param {() => Symbol} ded
     *
     * @returns {Symbol}
     */
    static definition(id, std, tyd, ded) {
        // Default statement denotation parser
        std = std || function() {
            const a = [];
            let name;
            let assignment;

            if (!this.tyd) {
                Error.Recovery.advanceToNextSemicolon();
                Parse.advance();

                return null;
            }

            this.tyd();

            while (true) {
                name = Context.token;
                if (name.arity !== "name") {
                    name.error("Expected a new variable name.");
                }

                Context.scope.define(name, this);
                expandVectorDefinition(name);
                Parse.advance();

                if (Context.token.id === "=") {
                    assignment = Context.token;
                    Parse.advance("=");
                    assignment.first = name;
                    assignment.second = Parse.expression(0);
                    assignment.arity = "binary";
                    a.push(assignment);
                }

                if (Context.token.id !== ",") {
                    break;
                }

                Parse.advance(",");
            }

            Error.Strategy.missingSemicolon();

            if (a.length === 0) {
                return null;
            }

            if (a.length === 1) {
                return a[0];
            }

            return a;
        };

        // Default type denotation parser
        tyd = tyd || function () {
            let n = Context.token;
            const p = [];
            let parameter_type, parameter_name;

            // For function types process the parameter list
            if (n.value === "(") {
                Parse.advance("(");

                if (Context.token.id !== ")") {
                    new Scope();

                    while (true) {
                        parameter_type = Context.token;

                        if (parameter_type.arity !== "type") {
                            parameter_type.error("Expected a parameter type.");
                        }

                        Parse.advance();

                        if (parameter_type.tyd) {
                            parameter_type.tyd();
                            parameter_name = Context.token;

                            if (parameter_name.arity !== "name") {
                                parameter_name.error("Expected a parameter name.");
                            }

                            Parse.advance();
                            Context.scope.define(parameter_name, parameter_type);
                            p.push(parameter_name);
                        }
                        else {
                            Error.Recovery.advanceToNextTypeParameter();
                        }

                        if (Context.token.id !== ",") {
                            break;
                        }

                        Parse.advance(",");
                    }

                    Context.scope.pop();
                }
                Parse.advance(")");
                n = Context.token;

                if (p) {
                    this.params = p;
                }
            }
        };

        // Default definition denotation parser
        ded = ded || function() {
            const a = [];
            let name;
            let t;

            if (!this.tyd) {
                Error.Recovery.advanceToNextSemicolon();
                Parse.advance();

                return null;
            }

            this.tyd();

            while (true) {
                name = Context.token;

                if (name.arity !== "name") {
                    name.error("Expected a new variable name.");
                    return;
                }

                Context.scope.define(name, this);
                expandVectorDefinition(name);
                Parse.advance();

                if (Context.token.id === "[") {
                    name.type.array = true;
                    const openBracket = Context.token;
                    Parse.advance("[");
                    Parse.expression(0);
                    const closeBracket = Context.token;
                    if (Context.token.id !=="]") {
                        Error.Recovery.advanceWhile(function(token) {
                            return token.id !== "," && token.id !== ";";
                        });
                    }
                    else {
                        Parse.advance("]");
                    }

                    const range = new Range(openBracket.range.start, closeBracket.range.end);
                    this.error("Array definition not supported.", range);
                }

                if (Context.token.id === "=") {
                    Context.scope.constant(name);
                    t = Context.token;
                    Parse.advance("=");
                    t.first = name;

                    if (this.params) {
                        if (this.params.length > 0) {
                            Context.scope.push(this.params[0].scope);
                        }
                        else {
                            new Scope();
                        }
                    }

                    if (this.params && Context.token.id === "[") {
                        Parse.advance("[");
                        Parse.expression(0);
                        Parse.advance(",");
                        Parse.expression(0);
                        Parse.advance("]");
                    }

                    t.second = Parse.immediate();

                    if (this.params) {
                        Context.scope.pop();
                    }

                    t.arity = "binary";
                    a.push(t);
                }

                if (Context.token.id !== ",") {
                    break;
                }

                Parse.advance(",");
            }

            Error.Strategy.missingSemicolon();

            if (a.length === 0) {
                return null;
            }
            else if (a.length === 1) {
                return a[0];
            }

            return a;
        };

        const symbol = Define.statement(id, std);
        symbol.tyd = tyd;
        symbol.ded = ded;

        return symbol;
    }
}

/**
 * Namespace for parsing language constructs.
 */
class Parse {
    /**
     * Create a new Symbol from the token stream. This new symbol will also be set as Context.token.
     *
     * An optional token id can be provided to verify the id of the current token.
     *
     * @param {string} id Expected id of current token. Will report an error on mismatch.
     *
     * @returns {Symbol}
     */
    static advance(id) {
        let arity;
        let prototypeObject;

        if (id && Context.token.id !== id) {
            Context.token.error("Expected: '" + id + "' Actual: '" + Context.token.id + "'");
        }

        const nextToken = lexer.lex();

        if (nextToken === undefined) {
            Context.token = Context.symbol_table['(end)'];
            Context.token.range = new Range(
                {line: -1, character: -1},
                {line: -1, character: -1}
            );

            Context.symbols.push(Context.token);
            return Context.token;
        }

        const value = nextToken.value;
        arity = nextToken.type;

        if (arity === "name") {
            prototypeObject = Context.scope.find(value);
        }
        else if (arity === "operator") {
            prototypeObject = Context.symbol_table[value];

            if (!prototypeObject) {
                nextToken.error("Unknown operator");
            }
        }
        else if (arity === "string" || arity === "float" || arity === "vector" || arity === "builtin") {
            const ff = Context.symbol_table[arity];

            arity = "literal";
            prototypeObject = Context.symbol_table["(literal)"];

            if (ff) {
                prototypeObject.type = ff;
            }
        }
        else if (arity === "type") {
            arity = "type";
            prototypeObject = Context.scope.find(value);
        }
        else {
            nextToken.error(`Unexpected token: '${nextToken.id}'`);
        }

        Context.token = Object.create(prototypeObject);
        Context.token.value = value;
        Context.token.arity = arity;
        Context.token.range = nextToken.range;

        if (!Context.token.scope && Context.token.arity === "name") {
            Context.token.scope = Context.scope;
        }

        if (Context.token.scope && Context.token.scope !== Context.scope) {
            Context.token.scope = Context.scope;
        }

        Context.symbols.push(Context.token);

        return Context.token;
    }

    /**
     * Parses an expression.
     *
     * @param {number} rbp The right binding power.
     *
     * @returns {Symbol}
     */
    static expression(rbp) {
        let left;
        let currentToken = Context.token;
        Parse.advance();
        left = currentToken.nud();

        while (rbp < Context.token.lbp) {
            currentToken = Context.token;
            Parse.advance();
            left = currentToken.led(left);
        }

        return left;
    }

    /**
     * Parses a single statement.
     *
     * @returns {Symbol}
     */
    static statement() {
        const currentToken = Context.token;

        if (currentToken.std) {
            Parse.advance();
            Context.scope.reserve(currentToken);

            return currentToken.std();
        }

        const expression = Parse.expression(0);

        if (!expression) {
            currentToken.error("Bad expression statement.");
        }
        else if (!expression.assignment && expression.id !== "(") {
            //v.error("Bad expression statement.");
        }

        Error.Strategy.missingSemicolon();

        return expression;
    }

    /**
     * Parses a sequence of statements.
     *
     * @returns {Symbol | Symbol[]}
     */
    static statements() {
        const parsedStatements = [];
        let statement;

        while(true) {
            if (Context.token.id === "}" || Context.token.id === "(end)") {
                break;
            }

            statement = Parse.statement();

            if (statement) {
                parsedStatements.push(statement);
            }
        }

        if (parsedStatements.length === 0) {
            return null;
        }

        if (parsedStatements.length === 1) {
            return parsedStatements[0];
        }

        return parsedStatements;
    }

    /**
     * Parses a block of statements.
     *
     * @returns {Symbol}
     */
    static block() {
        const currentToken = Context.token;
        Parse.advance("{");

        return currentToken.std();
    }

    /**
     * Parses an immediate.
     *
     * @returns {Symbols}
     */
    static immediate() {
        const n = Context.token;

        if (Context.token.imd) {
            return Context.token.imd();
        }

        n.error("Bad immediate.");

        return n;
    }

    /**
     * Parses a definition statement.
     *
     * @returns {Symbol}
     */
    static definition() {
        const currentSymbol = Context.token;

        if (currentSymbol.ded) {
            Parse.advance();
            Context.scope.reserve(currentSymbol);

            return currentSymbol.ded();
        }

        Error.Recovery.advanceToNextDefinition();

        return null;
    }

    /**
     * Parses a sequence of definition statments.
     *
     * @returns {Symbol | Symbol[]}
     */
    static definitions () {
        const parsedDefinitions = [];
        let definition;

        while (true) {
            if (Context.token.id === "(end)") {
                break;
            }

            definition = Parse.definition();

            if (definition) {
                parsedDefinitions.push(definition);
            }
        }

        if (parsedDefinitions.length === 0) {
            return null;
        }

        if (parsedDefinitions.length === 1) {
            return parsedDefinitions[0];
        }

        return parsedDefinitions;
    }
}

/**
 * Namespace for handling parse errors.
 */
class Error {}

/**
 * Namespace for handling known error conditions
 */
Error.Strategy = class Strategy {
    /**
     * Expects the current token to be a semicolon. Will raise error if expectation is not met.
     */
    static missingSemicolon() {
        if (Context.token.id !== ";") {
            const previousToken = Context.symbols.slice(-2, -1);

            if (previousToken && previousToken.length == 1) {
                previousToken[0].error("Missing semicolon.");
            }
        }
        else {
            Parse.advance(";");
        }
    }
};

/**
 * Namespace for handling unknown error conditions.
 */
Error.Recovery = class Recovery {
    /**
     * Ignore symbols until a semicolon is found.
     */
    static advanceToNextSemicolon() {
        Error.Recovery.advanceWhile(function(token) {
            return token.id !== ";";
        });
    }

    /**
     * Ignore symbols until a definition is found.
     */
    static advanceToNextDefinition() {
        Error.Recovery.advanceWhile(function(token) {
            return !token.ded;
        });
    }

    /**
     *  Ignore symbols until a comma or closing parenthesis is found.
     */
    static advanceToNextTypeParameter() {
        Error.Recovery.advanceWhile(function(token) {
            return token.id !== "," && token.id !== ")";
        });
    }

    /**
     * Ignores symbols until condition is true.
     *
     * @param {(token: Symbol) => boolean} condition
    */
    static advanceWhile(condition) {
        condition = condition || function(token) {
            return currentToken.id;
        };

        let currentToken = Context.token;
        let id = currentToken.id;

        if (id === "(name)")  {
            id = currentToken.value;
        }

        currentToken.error(`Unexpected token: '${id}'`);

        while(condition(currentToken) && currentToken.id !== "(end)") {
            currentToken = Parse.advance();
        }
    }
};

const itself = function() {
    return this;
};

Define.symbol(";");
Define.symbol(",");
Define.symbol(")");
Define.symbol("}");
Define.symbol("[");
Define.symbol("]");
Define.symbol("$");
Define.symbol("else");

Define.infix("+", 50);
Define.infix("*", 60);
Define.infix("/", 60);
Define.infix("==", 40);
Define.infix("!=", 40);
Define.infix("<", 40);
Define.infix("<=", 40);
Define.infix(">", 40);
Define.infix(">=", 40);
Define.infix("-", 50, function(left) {
    this.first = left;
    this.second = Parse.expression(50);
    this.arity = "binary";

    if (Context.language === "qcc") {
        if (this.second.arity === "literal") {
            const s = this.range.end;
            const e = this.second.range.start;
            if (s.line === e.line && e.character === s.character) {
                this.error("Missing whitespace for '-' operator.");
            }
        }
    }

    return this;
});

Define.infix(".", 80, function (left) {
    this.first = left;

    if (Context.token.arity !== "name") {
        Context.token.error("Expected a property name.");
    }

    Context.token.arity = "literal";
    this.second = Context.token;
    this.arity = "binary";
    Parse.advance();

    return this;
});

Define.infix("[", 80, function (left) {
    this.first = left;
    this.second = Parse.expression(0);
    this.arity = "binary";
    const currentToken = Context.token;
    Parse.advance("]");

    const range = new Range(this.range.start, currentToken.range.end);
    this.error("Bracket operator not supported.", range);

    return this;
});

Define.infixr("&", 40);
Define.infixr("|", 40);
Define.infixr("&&", 30);
Define.infixr("||", 30);

Define.prefix("!");
Define.prefix("-");
Define.prefix("$");

Define.prefix("(", function() {
    const expression = Parse.expression(0);
    Parse.advance(")");

    return expression;
});

Define.assignment("=");

Define.symbol("(end)");
Define.symbol("(literal)").nud = itself;
Define.symbol("(type)").nud = itself;
Define.symbol("(name)").nud = itself;

Define.statement("{", function() {
    new Scope();
    const statements = Parse.statements();
    Parse.advance("}");
    Context.scope.pop();

    return statements;
});

Define.immediate("-");
Define.immediate("(literal)");

Define.immediate("{", function() {
    Parse.advance("{");
    const statements = Parse.statements();
    Parse.advance("}");

    return statements;
});

/**
 * Vector types need to also define three additional names for each component.
 *
 * For example:
 *    vector origin;
 *
 * Should also define:
 *    vector origin_x;
 *    vector origin_y;
 *    vector origin_z;
 *
 * @param {Symbol} n - The symbol to add component definitions for
 */
const expandVectorDefinition = function(n) {
    if (n.type && !n.type.params && (n.type.value === "vector" || n.type.value === ".vector")) {
        const value = n.type.value === "vector" ? "float" : ".float";

        // Define x-component
        const nx = Object.create(n);
        nx.value = n.value + "_x";
        nx.type = {
            value: value,
            arity: "type",
            range: n.type.range
        };
        Context.scope.define(nx, nx.type);

        // Define y-component
        const ny = Object.create(n);
        ny.value = n.value + "_y";
        ny.type = {
            value: value,
            arity: "type",
            range: n.type.range
        };
        Context.scope.define(ny, ny.type);

        // Define z-component
        const nz = Object.create(n);
        nz.value = n.value + "_z";
        nz.type = {
            value: value,
            arity: "type",
            range: n.type.range
        };
        Context.scope.define(nz, nz.type);
    }
};

Define.definition("void");
Define.definition("float");
Define.definition("vector");
Define.definition("string");
Define.definition("entity");
Define.definition(".void");
Define.definition(".float");
Define.definition(".vector");
Define.definition(".string");
Define.definition(".entity");

Define.definition("$frame",
    function() {
        Context.token.error("$frame is not a valid statement.");
    },
    function() {
        Context.token.error("$frame is not a valid type");
    },
    function() {
        while (true) {
            const n = Context.token;

            if (n.arity !== "name") {
                break;
            }

            Context.scope.define(n, this);
            Parse.advance();

            if (Context.token.arity === "literal" && Context.token.type.value === "float") {
                Parse.advance();
            }
        }
    }
);


Define.statement("while", function() {
    Parse.advance("(");
    this.first = Parse.expression(0);
    Parse.advance(")");
    if (Context.token.id === "{") {
        this.second = Parse.block();
    }
    else {
        this.second = Parse.statement();
    }
    this.arity = "statement";

    return this;
});

Define.statement("do", function() {
    if (Context.token.id === "{") {
        this.first = Parse.block();
    }
    else {
        this.first = Parse.statement();
    }
    Parse.advance("while");
    Parse.advance("(");
    this.second = Parse.expression(0);
    this.arity = "statement";
    Parse.advance(")");
    Error.Strategy.missingSemicolon();

    return this;
});

Define.statement("if", function() {
    Parse.advance("(");
    this.test = Parse.expression(0);
    Parse.advance(")");
    this.body = Parse.statement();

    if (Context.token.id === "else") {
        Context.scope.reserve(Context.token);
        Parse.advance("else");

        if (Context.token.id === "if") {
            this.else = Parse.statement();
        }
        else {
            this.else = Parse.statement();
        }
    }
    else {
        this.else = null;
    }

    this.arity = "statement";

    return this;
});

Define.statement("return", function() {
    if (Context.token.id !== ";") {
        this.first = Parse.expression(0);
    }

    Error.Strategy.missingSemicolon();

    if (Context.token.id !== "}") {
        // TODO: Make the below smarter
        //token.error("Unreachable statement.");
    }

    this.arity = "statement";

    return this;
});

Define.infix("(", 80, function(left) {
    const functionParameters = [];
    if (left.id === ".") {
        this.arity = "ternary";
        this.first = left.first;
        this.second = left.second;
        this.third = functionParameters;
    }
    else {
        this.arity = "binary";
        this.first = left;
        this.second = functionParameters;

        if (left.arity !== "unary" && left.arity !== "name" && left.id !== "(" && left.id !== "&&" && left.id !== "||") {
            left.error("Expected a variable name.");
        }
    }

    if (Context.token.id !== ")") {
        while (true) {
            functionParameters.push(Parse.expression(0));

            if (Context.token.id !== ",") {
                break;
            }

            Parse.advance(",");
        }
    }

    Parse.advance(")");

    return this;
});

Define.statement("local", function() {
    if (Context.token.std) {
        this.first = Parse.statement();
    }
    this.arity = "statement";

    return this;
});

const parse = function(programInfo) {
    lexer = Lexer();

    Context = {
        token: null,
        symbol_table: Object.create(Context.symbol_table),
        scope: null,
        symbols: [],
        errors: [],
        language: programInfo.language || "qcc"
    };

    lexer.setInput(programInfo.program);
    new Scope(programInfo.uri, programInfo.parentScope);

    let ast, scope;

    try
    {
        Parse.advance();
        ast = Parse.definitions();
        scope = Context.scope;
        Context.scope.pop();
    }
    catch (e)
    {
        Context.errors.push(
            {
                range: Context.token.range,
                severity: 1,
                message: `[${Context.language}] fatal error: ${e.toString()}`
            }
        );
    }

    return new Program(ast, scope, Context.symbols, Context.errors);
};

class Program {
    /**
     * Creates a Program.
     *
     * @param {Symbol} ast
     * @param {Scope} scope
     * @param {Symbol[]} symbols
     * @param {Diagnostic[]} errors
     */
    constructor(ast, scope, symbols, errors) {
        this.ast = ast;
        this.scope = scope;
        this.symbols = symbols;
        this.errors = errors;
    }

    /**
     * Returns the symbol at the given position.
     *
     * @param {Position} position
     *
     * @returns {Symbol}
     */
    getSymbol(position) {
        for (let i = 0; i < this.symbols.length; i++) {
            const s = this.symbols[i];

            if (s.range.contains(position)) {
                return s;
            }
        }

        return null;
    }

    /**
     * Get a string representing the type of the symbol at a given position.
     *
     * @param {Position} position The position of the symbol
     *
     * @returns {string}
     */
    getTypeString(position) {
        const definition = this.getSymbolDefinition(position);

        if (!definition || !definition.type) {
            return null;
        }

        /**
         * A recursive helper function to resolve the types of function parameters
         *
         * @param {Symbol} type
         *
         * @returns {string}
         */
        const resolveType = function(type) {
            const result = type.value;
            let arrayPart = "";

            if (type.array) {
                arrayPart = "[]";
            }

            if (!type.params) {
                return result + arrayPart;
            }

            const ps = type.params.map(function(c) {
                return `${resolveType(c.type)} ${c.value}`;
            });

            return `${result}(${ps.join(", ")})${arrayPart}`;
        };

        const symbolName = definition.value;
        const symbolType = resolveType(definition.type);

        return `${symbolType} ${symbolName}`;
    }

    /**
     * Gets the location of the defintion for the symbol at the given position.
     *
     * @param {Position} position
     *
     * @returns {Location}
     */
    getDefinition(position) {
        const definition = this.getSymbolDefinition(position);

        if (!definition) {
            return null;
        }

        return {
            uri: definition.scope.uri,
            range: definition.range
        };
    }

    /**
     * Gets the symbol at the given position
     *
     * @param {Position} position
     *
     * @returns {Symbol} A Symbol object.
     */
    getSymbolDefinition(position) {
        const symbol = this.getSymbol(position);

        if (!symbol) {
            return null;
        }

        const scope = symbol.scope;

        if (!scope) {
            return null;
        }

        const definition = scope.find(symbol.value);

        if (!definition.scope) {
            return null;
        }

        return definition;
    }

    /**
     * Get the errors generated during parsing
     *
     * @returns {Diagnostic[]}
     */
    getErrors() {
        return this.errors;
    }
}

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.parse = parse;
    exports.Program = Program;
    exports.Scope = Scope;
}
