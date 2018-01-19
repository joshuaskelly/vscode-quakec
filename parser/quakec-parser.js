var Lexer = require("./quakec-lexer").Lexer;

var common = require("./quakec-common");
var Range = common.Range;

var lexer;
var token;
var symbol_table;
var symbols;

var parse = function(programInfo) {
    lexer = Lexer();
    symbol_table = {};
    symbols = [];

    var original_symbol = {
        nud: function() {
            this.error("Undefined.");
        },
        led: function(left) {
            this.error("Missing operator.");
        },
        error: function(message) {
            let loc = "";
            if (scope) {
                loc =  " " + scope.uri;
            }
            console.error("ParseError" + loc +"(" + this.range.start.line + "," + this.range.start.character + "): " + message);
        }
    };

    var symbol = function(id, bp) {
        var s = symbol_table[id];
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
            symbol_table[id] = s;
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

        if (id && token.id !== id) {
            token.error("Expected: '" + id + "' Actual: '" + token.id + "'");
        }

        t = lexer.lex();

        if (t === undefined) {
            token = symbol_table['(end)'];
            token.range = new Range(
                {line: -1, character: -1},
                {line: -1, character: -1}
            );
            return;
        }

        v = t.value;
        a = t.type;

        if (a === "name") {
            o = scope.find(v);
        }
        else if (a === "operator") {
            o = symbol_table[v];

            if (!o) {
                t.error("Unknown operator");
            }
        }
        else if (a === "string" || a === "float" || a === "vector" || a === "builtin") {
            var ff = symbol_table[a];

            a = "literal";
            o = symbol_table["(literal)"];

            if (ff) {
                o.type = ff;
            }
        }
        else if (a === "type") {
            a = "type";
            o = scope.find(v);
        }
        else {
            t.error("Unexpected token");
        }

        token = Object.create(o);
        token.value = v;
        token.arity = a;
        token.range = t.range;

        if (!token.scope) {
            token.scope = scope;
        }

        symbols.push(token);

        return token;
    };

    var scope;

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
            n.scope = scope;
            n.type = y;

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
                    o = symbol_table[n];

                    if (o && typeof o != "function") {
                        return o;
                    }

                    return symbol_table["(name)"];
                }
            }
        },
        push: function(s) {
            if (s.parent !== scope) {
                console.error("Bad scope pushed.")
            }

            scope = s;
        },
        pop: function() {
            scope = this.parent;
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
        }
    };

    var new_scope = function() {
        var s = scope || programInfo.parentScope;
        scope = Object.create(original_scope);
        scope.def = {};
        scope.parent = s;

        return scope;
    };

    var expression = function(rbp) {
        var left;
        var t = token;
        advance();
        left = t.nud();

        while (rbp < token.lbp) {
            t = token;
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

        if (token.arity !== "name") {
            token.error("Expected a property name.");
        }

        token.arity = "literal";
        this.second = token;
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
            scope.reserve(this);
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
        var n = token;
        var v;

        if (n.std) {
            advance();
            scope.reserve(n);

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
            if (token.id === "}" || token.id === "(end)") {
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
        scope.pop();

        return a;
    });

    var block = function() {
        var t = token;
        advance("{");
        
        return t.std();
    };

    // Parses immediates
    var immediate = function() {
        var n = token;

        if (token.imd) {
            return token.imd();
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

            n = token;

            while (true) {
                if (n.arity !== "name") {
                    n.error("Expected a new variable name.");
                }

                scope.define(n, this);
                advance();

                if (token.id === "=") {
                    t = token;
                    advance("=");
                    t.first = n;
                    t.second = expression(0);
                    t.arity = "binary";
                    a.push(t);
                }
                
                if (token.id !== ",") {
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
            var n = token;
            var p = [];
            var parameter_type, parameter_name;

            // For function types process the parameter list
            if (n.value === "(") {
                advance("(");

                if (token.id !== ")") {
                    new_scope();

                    while (true) {
                        parameter_type = token;

                        if (parameter_type.arity !== "type") {
                            parameter_type.error("Expected a parameter type.")
                        }

                        advance();
                        parameter_type.tyd();
                        parameter_name = token;

                        if (parameter_name.arity !== "name") {
                            parameter_name.error("Expected a parameter name.")
                        }

                        advance();
                        // TODO: Only define these in a function body? Maybe process the type parameters.
                        scope.define(parameter_name, parameter_type);
                        p.push(parameter_name);

                        if (token.id !== ",") {
                            break;
                        }

                        advance(",");
                    }

                    scope.pop();
                }
                advance(")");
                n = token;
                
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
                n = token;

                if (n.arity !== "name") {
                    n.error("Expected a new variable name.");
                }

                scope.define(n, this);
                advance();

                if (token.id === "=") {
                    t = token;
                    advance("=");
                    t.first = n;

                    if (this.params && this.params.length > 0) {
                        scope.push(this.params[0].scope);
                    }

                    if (this.params && token.id === "[") {
                        advance("[");
                        expression(0);
                        advance(",");
                        expression(0);
                        advance("]");
                    }

                    t.second = immediate();

                    if (this.params && this.params.length > 0) {
                        scope.pop();
                    }

                    t.arity = "binary";
                    a.push(t);
                }
                
                if (token.id !== ",") {
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

    var definition = function() {
        var n = token;
        var v;

        if (n.ded) {
            advance();
            scope.reserve(n);

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
            if (token.id === "(end)") {
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
            token.error("$frame is not a valid statement.");
        },
        function() {
            token.error("$frame is not a valid type");
        },
        function() {
            while (true) {
                n = token;

                if (n.arity !== "name") {
                    break;
                }

                scope.define(n, this);
                advance();
            }
        }
    );

    stmt("while", function() {
        advance("(");
        this.first = expression(0);
        advance(")");
        if (token.id === "{") {
            this.second = block();
        }
        else {
            this.second = statement();
        }
        this.arity = "statement";

        return this;
    });

    stmt("do", function() {
        if (token.id === "{") {
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

        if (token.id === "else") {
            scope.reserve(token);
            advance("else");

            if (token.id === "if") {
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
        if (token.id !== ";") {
            this.first = expression(0);
        }

        advance(";");

        if (token.id !== "}") {
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
        
        if (token.id !== ")") {
            while (true) {
                a.push(expression(0));

                if (token.id !== ",") {
                    break;
                }

                advance(",");
            }
        }

        advance(")");

        return this;
    });

    stmt("local", function() {
        if (token.ded) {
            this.first = definition();
        }
        this.arity = "statement";

        return this;
    });

    lexer.setInput(programInfo.program);
    new_scope();
    advance();
    var ast = definitions();
    var s = scope;
    scope.pop();

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

    if (definition) {
        return {
            uri: definition.scope.uri,
            range: definition.range
        };
    }

    return null;
};

Program.prototype.getReferences = function(position, includeDefinition) {
    let reference = this.getSymbol(position);
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.parse = parse;
}
