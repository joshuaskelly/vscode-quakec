var Lexer = require("./quakec-lexer").Lexer;

var common = require("./quakec-common");
var Range = common.Range;

var lexer;
var symbols;

var Context = {
    token: null,
    symbol_table: {},
    scope: null
};

var parse = function(programInfo) {
    lexer = Lexer();
    symbols = [];

    Context = {
        token: null,
        symbol_table: {},
        scope: null
    };

    var original_symbol = {
        nud: function() {
            this.error("Undefined.");
        },
        led: function(left) {
            this.error("Missing operator.");
        },
        error: function(message) {
            let loc = "";
            if (Context.scope) {
                loc =  " " + Context.scope.uri;
            }
            console.error("ParseError" + loc +"(" + this.range.start.line + "," + this.range.start.character + "): " + message);
        }
    };

    var symbol = function(id, bp) {
        var s = Context.symbol_table[id];
        bp = bp || 0;

        if (s) {
            if (bp >= s.lbp) {
                s.lbp = bp;
            }
        }
        else {
            s = Object.create(original_symbol);
            s.id = s.value = id;
            s.lbp = bp;
            Context.symbol_table[id] = s;
        }

        return s;
    }

    symbol(";");
    symbol(",");
    symbol(")");
    symbol("}");
    symbol("[");
    symbol("]");
    symbol("$");
    symbol("else");

    var advance = function(id) {
        var a;
        var o;
        var t;
        var v;

        if (id && Context.token.id !== id) {
            Context.token.error("Expected: '" + id + "' Actual: '" + Context.token.id + "'");
        }

        t = lexer.lex();

        if (t === undefined) {
            Context.token = Context.symbol_table['(end)'];
            Context.token.range = new Range(
                {line: -1, character: -1},
                {line: -1, character: -1}
            );
            return;
        }

        v = t.value;
        a = t.type;

        if (a === "name") {
            o = Context.scope.find(v);
        }
        else if (a === "operator") {
            o = Context.symbol_table[v];

            if (!o) {
                t.error("Unknown operator");
            }
        }
        else if (a === "string" || a === "float" || a === "vector" || a === "builtin") {
            var ff = Context.symbol_table[a];

            a = "literal";
            o = Context.symbol_table["(literal)"];

            if (ff) {
                o.type = ff;
            }
        }
        else if (a === "type") {
            a = "type";
            o = Context.scope.find(v);
        }
        else {
            t.error("Unexpected token");
        }

        Context.token = Object.create(o);
        Context.token.value = v;
        Context.token.arity = a;
        Context.token.range = t.range;

        if (!Context.token.scope && Context.token.arity === "name") {
            Context.token.scope = Context.scope;
        }

        if (Context.token.scope && Context.token.scope !== Context.scope) {
            Context.token.scope = Context.scope;
        }

        symbols.push(Context.token);

        if (o.refs) {
            Context.scope.reference(Context.token);
        }

        return Context.token;
    };

    var itself = function() {
        return this;
    };

    var original_scope = {
        uri: programInfo.uri,
        define: function(n, y) {
            var t = this.def[n.value];

            if (typeof t === "object") {
                n.error(
                    t.reserved ?
                    "Already reserved: '" + n.value + "'." :
                    "Already defined: '" + n.value + "'."
                );
            }

            this.def[n.value] = n;
            n.reserved = false;
            n.nud = itself;
            n.led = null;
            n.std = null;
            n.lbp = 0;
            n.scope = Context.scope;
            n.type = y;

            Context.scope.reference(n);

            return n;
        },
        find: function(n) {
            var e = this, o;

            while (true) {
                o = e.def[n];
                
                if (o && typeof o !== "function") {
                    return e.def[n];
                }

                e = e.parent;

                if (!e) {
                    o = Context.symbol_table[n];

                    if (o && typeof o != "function") {
                        return o;
                    }

                    return Context.symbol_table["(name)"];
                }
            }
        },
        push: function(s) {
            if (s.parent !== Context.scope) {
                console.error("Bad scope pushed.")
            }

            Context.scope = s;
        },
        pop: function() {
            Context.scope = this.parent;
        },
        reserve: function(n) {
            if (n.arity !== "name" || n.reserved) {
                return;
            }

            var t = this.def[n.value];

            if (t) {
                if (t.reserved) {
                    return;
                }
                if (t.arity === "name") {
                    n.error("Already defined.");
                }
            }

            this.def[n.value] = n;
            n.reserved = true;
        },
        reference: function(n) {
            if (n.arity === "name") {
                let def = Context.scope.find(n.value);
                if (!def.refs) {
                    def.refs = [];
                }
    
                def.refs.push(n);
            }
        }
    };

    var new_scope = function() {
        var s = Context.scope || programInfo.parentScope;
        Context.scope = Object.create(original_scope);
        Context.scope.def = {};
        Context.scope.parent = s;

        return Context.scope;
    };

    var expression = function(rbp) {
        var left;
        var t = Context.token;
        advance();
        left = t.nud();

        while (rbp < Context.token.lbp) {
            t = Context.token;
            advance();
            left = t.led(left);
        }

        return left;
    };

    var infix = function(id, bp, led) {
        var s = symbol(id, bp);

        s.led = led || function(left) {
            this.first = left;
            this.second = expression(bp);
            this.arity = "binary";

            return this;
        };

        return s;
    };

    infix("+", 50);
    infix("-", 50);
    infix("*", 60);
    infix("/", 60);
    infix("==", 40);
    infix("!=", 40);
    infix("<", 40);
    infix("<=", 40);
    infix(">", 40);
    infix(">=", 40);

    infix(".", 80, function (left) {
        this.first = left;

        if (Context.token.arity !== "name") {
            Context.token.error("Expected a property name.");
        }

        Context.token.arity = "literal";
        this.second = Context.token;
        this.arity = "binary";
        advance();

        return this;
    });

    var infixr = function(id, bp, led) {
        var s = symbol(id, bp);

        s.led = led || function(left) {
            this.first = left;
            this.second = expression(bp - 1);
            this.arity = "binary";

            return this;
        };

        return s;
    };

    infixr("&", 40);
    infixr("|", 40);
    infixr("&&", 30);
    infixr("||", 30);

    var prefix = function(id, nud) {
        var s = symbol(id);
        s.nud = nud || function() {
            Context.scope.reserve(this);
            this.first = expression(70);
            this.arity = "unary";

            return this;
        };

        return s;
    };

    prefix("!");
    prefix("-");
    prefix("$");

    prefix("(", function() {
        var e = expression(0);
        advance(")");

        return e;
    });

    var assignment = function(id) {
        return infixr(id, 10, function(left) {
            if (left.id !== "." && left.arity !== "name") {
                left.error("Bad lvalue.");
            }

            this.first = left;
            this.second = expression(9);
            this.assignment = true;
            this.arity = "binary";

            return this;
        });
    };

    assignment("=");

    symbol("(end)");
    symbol("(literal)").nud = itself;
    symbol("(type)").nud = itself;
    symbol("(name)").nud = itself;
    symbol("(declaration)");

    // Parses a single statement
    var statement = function() {
        var n = Context.token;
        var v;

        if (n.std) {
            advance();
            Context.scope.reserve(n);

            return n.std();
        }

        v = expression(0);

        if (!v) {
            n.error("Bad expression statement.");
        }
        else if (!v.assignment && v.id !== "(") {
            //v.error("Bad expression statement.");
        }

        advance(";");

        return v;
    };

    // Parses statements
    var statements = function() {
        var a = [];
        var s;

        while(true) {
            if (Context.token.id === "}" || Context.token.id === "(end)") {
                break;
            }

            s = statement();

            if (s) {
                a.push(s);
            }
        }

        if (a.length === 0) {
            return null;
        }

        if (a.length === 1) {
            return a[0];
        }

        return a;
    };

    // Builds statements
    var stmt = function(s, f) {
        var x = symbol(s);
        x.std = f;

        return x;
    };

    stmt("{", function() {
        new_scope();
        var a = statements();
        advance("}");
        Context.scope.pop();

        return a;
    });

    var block = function() {
        var t = Context.token;
        advance("{");
        
        return t.std();
    };

    // Parses immediates
    var immediate = function() {
        var n = Context.token;

        if (Context.token.imd) {
            return Context.token.imd();
        }

        n.error("Bad immediate.");

        return n;
    };

    // Builds immediates
    var immd = function(s, f) {
        var x = symbol(s);
        x.imd = f || function() {
            return expression(0);
        };

        return x;
    };

    immd("(literal)");

    immd("{", function() {
        advance("{");
        var a = statements();
        advance("}")

        return a;
    });

    /**
     * Process parameters for definitions
     * 
     * @param {string} s - The symbol id as a string
     * @param {function} f - The statement denotation callback function
     * @param {function} t - The type denotation callback function
     * @param {function} d - The definition denotation callback function
     */
    var defn = function(i, f, t, d) {
        // Default statement denotation parser
        f = f || function() {
            var a = [];
            var n;
            var t;

            this.tyd();

            n = Context.token;

            while (true) {
                if (n.arity !== "name") {
                    n.error("Expected a new variable name.");
                }

                Context.scope.define(n, this);
                expandVectorDefinition(n);
                advance();

                if (Context.token.id === "=") {
                    t = Context.token;
                    advance("=");
                    t.first = n;
                    t.second = expression(0);
                    t.arity = "binary";
                    a.push(t);
                }
                
                if (Context.token.id !== ",") {
                    break;
                }

                advance(",");
            }

            advance(";");

            if (a.length === 0) {
                return null;
            }

            if (a.length === 1) {
                return a[0];
            }

            return a;
        };

        // Default type denotation parser
        t = t || function () {
            var n = Context.token;
            var p = [];
            var parameter_type, parameter_name;

            // For function types process the parameter list
            if (n.value === "(") {
                advance("(");

                if (Context.token.id !== ")") {
                    new_scope();

                    while (true) {
                        parameter_type = Context.token;

                        if (parameter_type.arity !== "type") {
                            parameter_type.error("Expected a parameter type.")
                        }

                        advance();
                        parameter_type.tyd();
                        parameter_name = Context.token;

                        if (parameter_name.arity !== "name") {
                            parameter_name.error("Expected a parameter name.")
                        }

                        advance();
                        // TODO: Only define these in a function body? Maybe process the type parameters.
                        Context.scope.define(parameter_name, parameter_type);
                        p.push(parameter_name);

                        if (Context.token.id !== ",") {
                            break;
                        }

                        advance(",");
                    }

                    Context.scope.pop();
                }
                advance(")");
                n = Context.token;
                
                if (p) {
                    this.params = p;
                }
            }
        };

        // Default definition denotation parser
        d = d || function() {
            var a = [];
            var n;
            var t;

            this.tyd();
            
            while (true) {
                n = Context.token;

                if (n.arity !== "name") {
                    n.error("Expected a new variable name.");
                }

                Context.scope.define(n, this);
                expandVectorDefinition(n);
                advance();

                if (Context.token.id === "=") {
                    t = Context.token;
                    advance("=");
                    t.first = n;

                    if (this.params) {
                        if (this.params.length > 0) {
                            Context.scope.push(this.params[0].scope);
                        }
                        else {
                            new_scope();
                        }
                    }

                    if (this.params && Context.token.id === "[") {
                        advance("[");
                        expression(0);
                        advance(",");
                        expression(0);
                        advance("]");
                    }

                    t.second = immediate();

                    if (this.params) {
                        Context.scope.pop();
                    }

                    t.arity = "binary";
                    a.push(t);
                }
                
                if (Context.token.id !== ",") {
                    break;
                }

                advance(",");
            }

            advance(";");

            if (a.length === 0) {
                return null;
            }
            else if (a.length === 1) {
                return a[0];
            }

            return a;
        };

        var x = stmt(i, f);
        x.tyd = t;
        x.ded = d; 

        return x;
    };

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
     * @param {symbol} n - The symbol to add component definitions for
     */
    var expandVectorDefinition = function(n) {
        if (n.type && (n.type.value === "vector" || n.type.value === ".vector")) {
            let value = n.type.value === "vector" ? "float" : ".float";
            
            // Define x-component
            let nx = Object.create(n);
            nx.value = n.value + "_x";
            nx.type = {
                value: value,
                arity: "type",
                range: n.type.range
            };
            Context.scope.define(nx, nx.type);
            
            // Define y-component
            let ny = Object.create(n);
            ny.value = n.value + "_y";
            ny.type = {
                value: value,
                arity: "type",
                range: n.type.range
            };
            Context.scope.define(ny, ny.type);
            
            // Define z-component
            let nz = Object.create(n);
            nz.value = n.value + "_z";
            nz.type = {
                value: value,
                arity: "type",
                range: n.type.range
            };
            Context.scope.define(nz, nz.type);
        }
    };

    var definition = function() {
        var n = Context.token;
        var v;

        if (n.ded) {
            advance();
            Context.scope.reserve(n);

            return n.ded();
        }

        n.error("Bad definition.");
        advance();

        return n;
    };

    var definitions = function() {
        var a = [];
        var d;

        while (true) {
            if (Context.token.id === "(end)") {
                break;
            }

            d = definition();

            if (d) {
                a.push(d);
            }
        }

        if (a.length === 0) {
            return null;
        }

        if (a.length === 1) {
            return a[0];
        }

        return a;
    };

    defn("void");
    defn("float");
    defn("vector");
    defn("string");
    defn("entity");
    defn(".void");
    defn(".float");
    defn(".vector");
    defn(".string");
    defn(".entity");

    defn(
        "$frame", 
        function() {
            Context.token.error("$frame is not a valid statement.");
        },
        function() {
            Context.token.error("$frame is not a valid type");
        },
        function() {
            while (true) {
                n = Context.token;

                if (n.arity !== "name") {
                    break;
                }

                Context.scope.define(n, this);
                advance();
            }
        }
    );

    stmt("while", function() {
        advance("(");
        this.first = expression(0);
        advance(")");
        if (Context.token.id === "{") {
            this.second = block();
        }
        else {
            this.second = statement();
        }
        this.arity = "statement";

        return this;
    });

    stmt("do", function() {
        if (Context.token.id === "{") {
            this.first = block();
        }
        else {
            this.first = statement();
        }
        advance("while");
        advance("(");
        this.second = expression(0);
        this.arity = "statement";
        advance(")");
        advance(";");

        return this;
    });

    stmt("if", function() {
        advance("(");
        this.test = expression(0);
        advance(")");
        this.body = statement();//block();

        if (Context.token.id === "else") {
            Context.scope.reserve(Context.token);
            advance("else");

            if (Context.token.id === "if") {
                this.else = statement();
            }
            else {
                this.else = statement();//block();
            }
        }
        else {
            this.else = null;
        }

        this.arity = "statement";

        return this;
    });

    stmt("return", function() {
        if (Context.token.id !== ";") {
            this.first = expression(0);
        }

        advance(";");

        if (Context.token.id !== "}") {
            // TODO: Make the below smarter
            //token.error("Unreachable statement.");
        }

        this.arity = "statement";

        return this;
    });

    infix("(", 80, function(left) {
        var a = [];
        if (left.id === ".") {
            this.arity = "ternary";
            this.first = left.first;
            this.second = left.second;
            this.third = a;
        }
        else {
            this.arity = "binary";
            this.first = left;
            this.second = a;

            if (left.arity !== "unary" && left.arity !== "name" && left.id !== "(" && left.id !== "&&" && left.id !== "||") {
                left.error("Expected a variable name.");
            }
        }
        
        if (Context.token.id !== ")") {
            while (true) {
                a.push(expression(0));

                if (Context.token.id !== ",") {
                    break;
                }

                advance(",");
            }
        }

        advance(")");

        return this;
    });

    stmt("local", function() {
        if (Context.token.ded) {
            this.first = definition();
        }
        this.arity = "statement";

        return this;
    });

    lexer.setInput(programInfo.program);
    new_scope();
    advance();
    var ast = definitions();
    var s = Context.scope;
    Context.scope.pop()

    return new Program(ast, s, symbols);
};

var Program = function(ast, scope, symbols) {
    this.ast = ast;
    this.scope = scope;
    this.symbols = symbols;
};

Program.prototype.getSymbol = function(position) {
    for (let i = 0; i < this.symbols.length; i++) {
        let s = this.symbols[i];
        if (s.range.contains(position)) {
            return s;
        }
    }

    return null;
};

Program.prototype.getTypeString = function(position) {
    let reference = this.getSymbol(position);

    if (!reference) {
        return null;
    }

    let scope = reference.scope;

    if (!scope) {
        return null;
    }

    let definition = scope.find(reference.value);

    
    if (!definition) {
        return null;
    }

    if (!definition.scope) {
        return null;
    }
    
    let resolveType = function(type) {
        let result = type.value;

        if (!type.params) {
            return result;
        }

        let ps = type.params.map(function(c) {
            return `${resolveType(c.type)} ${c.value}`;
        });
        
        return `${result}(${ps.join(", ")})`;
    };

    let symbolName = definition.value;
    let symbolType = resolveType(definition.type);

    return `${symbolType} ${symbolName}`;
};

Program.prototype.getDefinition = function(position) {
    let reference = this.getSymbol(position);

    if (!reference) {
        return null;
    }

    let scope = reference.scope;

    if (!scope) {
        return null;
    }

    let definition = scope.find(reference.value);

    if (!definition.scope) {
        return null;
    }

    if (definition) {
        return {
            uri: definition.scope.uri,
            range: definition.range
        };
    }

    return null;
};

Program.prototype.getReferences = function(position, includeDeclaration) {
    let reference = this.getSymbol(position);

    if (!reference) {
        return null;
    }

    let scope = reference.scope;

    if (!scope) {
        return null;
    }

    let definition = scope.find(reference.value);

    if (!definition.scope) {
        return null;
    }

    let result = [];

    if (!definition.refs) {
        return result;
    }

    for (let symbol of definition.refs) {
        if (!includeDeclaration && symbol === definition) {
            continue;
        }
        
        result.push(
            {
                uri: symbol.scope.uri,
                range: symbol.range
            }
        );
    }

    return result;
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.parse = parse;
}
