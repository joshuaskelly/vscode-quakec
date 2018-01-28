var assert = require("assert");
var Lexer = require("../quakec-lexer").Lexer;

describe("Lexer", function() {
    var lexer;
    beforeEach(function() {
        lexer = Lexer();
    });

    afterEach(function() {
        lexer = null;
    });

    var all = function(program) {
        lexer.setInput(program);

        var result = [];
        var token = lexer.lex();

        while (token) {
            result.push(token);
            token = lexer.lex();
        }

        return result;
    };

    assert.tokensEqual = function(expected, actual) {
        assert.equal(expected.type, actual.type, "Token types should be equal");
        assert.equal(expected.value, actual.value, "Token values should be equal");
        assert.equal(expected.position.line, actual.position.line, "Token line numbers should be equal.")
        assert.equal(expected.position.character, actual.position.character, "Token character numbers should be equal.")
    };

    assert.tokenArraysEqual = function(expected, actual) {
        assert.equal(expected.length, actual.length, "Number of tokens should be equal");

        for (var i = 0; i < expected.length; i++) {
            var e = expected[i];
            var a = actual[i];

            assert.tokensEqual(e, a);
        };
    };

    describe("Literals", function() {
        describe("Floats", function() {
            it("Should handle floats", function() {
                var program = `1.234`;
                var expected = {
                    type: "float",
                    value: "1.234",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle negative floats", function() {
                var program = `-1.234`;
                var expected = [
                    {
                        type: "operator",
                        value: "-",
                        position: {
                            line: 0,
                            character: 0
                        }
                    },
                    {
                        type: "float",
                        value: "1.234",
                        position: {
                            line: 0,
                            character: 1
                        }
                    }
                ];
                lexer.setInput(program);
                var actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
            it("Should handle int style floats", function() {
                var program = `1`;
                var expected = {
                    type: "float",
                    value: "1",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle negative int style floats", function() {
                var program = `-10`;
                var expected = [
                    {
                        type: "operator",
                        value: "-",
                        position: {
                            line: 0,
                            character: 0
                        }
                    },
                    {
                        type: "float",
                        value: "10",
                        position: {
                            line: 0,
                            character: 1
                        }
                    }
                ];
                lexer.setInput(program);
                var actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
        describe("Vectors", function() {
            it("Should handle vectors", function() {
                var program = `'1.234 0 -4'`;
                var expected = {
                    type: "vector",
                    value: "'1.234 0 -4'",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
        });
        describe("Strings", function() {
            it("Should handle strings", function() {
                var program = `"hello world!"`;
                var expected = {
                    type: "string",
                    value: `"hello world!"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();
                assert.equal();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle newlines", function() {
                var program = `"\nhello world!\n"`;
                var expected = {
                    type: "string",
                    value: `"\nhello world!\n"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle path style strings", function() {
                var program = `"maps/jrwiz1.bsp"`;
                var expected = {
                    type: "string",
                    value: `"maps/jrwiz1.bsp"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                var actual = lexer.lex();
                assert.equal();

                assert.tokensEqual(expected, actual);
            });
        });
        describe("Builtins", function() {
            it("Should handle builtins", function() {
                var program = `#1 #22`;
                var expected = [
                    {
                        type: "builtin",
                        value: "#1",
                        position: {
                            line: 0,
                            character: 0
                        }
                    },
                    {
                        type: "builtin",
                        value: "#22",
                        position: {
                            line: 0,
                            character: 3
                        }
                    }
                ];
                var actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
    });
    describe("Operators", function() {
        it("Should handle all operators", function() {
            var program = `&& || <= >= == != ! * / - + = . < > & | ; , $`;
            var expected = [
                {
                    type: "operator",
                    value: "&&",
                    position: {
                        line: 0,
                        character: 0
                    }
                },
                {
                    type: "operator",
                    value: "||",
                    position: {
                        line: 0,
                        character: 3
                    }
                },
                {
                    type: "operator",
                    value: "<=",
                    position: {
                        line: 0,
                        character: 6
                    }
                },
                {
                    type: "operator",
                    value: ">=",
                    position: {
                        line: 0,
                        character: 9
                    }
                },
                {
                    type: "operator",
                    value: "==",
                    position: {
                        line: 0,
                        character: 12
                    }
                },
                {
                    type: "operator",
                    value: "!=",
                    position: {
                        line: 0,
                        character: 15
                    }
                },
                {
                    type: "operator",
                    value: "!",
                    position: {
                        line: 0,
                        character: 18
                    }
                },
                {
                    type: "operator",
                    value: "*",
                    position: {
                        line: 0,
                        character: 20
                    }
                },
                {
                    type: "operator",
                    value: "/",
                    position: {
                        line: 0,
                        character: 22
                    }
                },
                {
                    type: "operator",
                    value: "-",
                    position: {
                        line: 0,
                        character: 24
                    }
                },
                {
                    type: "operator",
                    value: "+",
                    position: {
                        line: 0,
                        character: 26
                    }
                },
                {
                    type: "operator",
                    value: "=",
                    position: {
                        line: 0,
                        character: 28
                    }
                },
                {
                    type: "operator",
                    value: ".",
                    position: {
                        line: 0,
                        character: 30
                    }
                },
                {
                    type: "operator",
                    value: "<",
                    position: {
                        line: 0,
                        character: 32
                    }
                },
                {
                    type: "operator",
                    value: ">",
                    position: {
                        line: 0,
                        character: 34
                    }
                },
                {
                    type: "operator",
                    value: "&",
                    position: {
                        line: 0,
                        character: 36
                    }
                },
                {
                    type: "operator",
                    value: "|",
                    position: {
                        line: 0,
                        character: 38
                    }
                },
                {
                    type: "operator",
                    value: ";",
                    position: {
                        line: 0,
                        character: 40
                    }
                },
                {
                    type: "operator",
                    value: ",",
                    position: {
                        line: 0,
                        character: 42
                    }
                },
                {
                    type: "operator",
                    value: "$",
                    position: {
                        line: 0,
                        character: 44
                    }
                }
            ];
            var actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
        it("Should handle grouping operators", function() {
            var program = `( ) { } [ ]`;
            var expected = [
                {
                    type: "operator",
                    value: "(",
                    position: {
                        line: 0,
                        character: 0
                    }
                },
                {
                    type: "operator",
                    value: ")",
                    position: {
                        line: 0,
                        character: 2
                    }
                },
                {
                    type: "operator",
                    value: "{",
                    position: {
                        line: 0,
                        character: 4
                    }
                },
                {
                    type: "operator",
                    value: "}",
                    position: {
                        line: 0,
                        character: 6
                    }
                },
                {
                    type: "operator",
                    value: "[",
                    position: {
                        line: 0,
                        character: 8
                    }
                },
                {
                    type: "operator",
                    value: "]",
                    position: {
                        line: 0,
                        character: 10
                    }
                }
            ];
            var actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
    });
    describe("Types", function() {
        describe("Simple Types", function() {
            it("Should handle simple types", function() {
                var program = `void float vector string entity`;
                var expected = [
                    {
                        type: "type",
                        value: "void",
                        position: {
                            line: 0,
                            character: 0
                        }
                    },
                    {
                        type: "type",
                        value: "float",
                        position: {
                            line: 0,
                            character: 5
                        }
                    },
                    {
                        type: "type",
                        value: "vector",
                        position: {
                            line: 0,
                            character: 11
                        }
                    },
                    {
                        type: "type",
                        value: "string",
                        position: {
                            line: 0,
                            character: 18
                        }
                    },
                    {
                        type: "type",
                        value: "entity",
                        position: {
                            line: 0,
                            character: 25
                        }
                    }
                ];
                var actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });

        describe("Field Types", function() {
            it("Should handle field types", function() {
                var program = `.void .float .vector .string .entity`;
                var expected = [
                    {
                        type: "type",
                        value: ".void",
                        position: {
                            line: 0,
                            character: 0
                        }
                    },
                    {
                        type: "type",
                        value: ".float",
                        position: {
                            line: 0,
                            character: 6
                        }
                    },
                    {
                        type: "type",
                        value: ".vector",
                        position: {
                            line: 0,
                            character: 13
                        }
                    },
                    {
                        type: "type",
                        value: ".string",
                        position: {
                            line: 0,
                            character: 21
                        }
                    },
                    {
                        type: "type",
                        value: ".entity",
                        position: {
                            line: 0,
                            character: 29
                        }
                    }
                ];
                var actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
    });
    describe("Names", function() {
        it("Should handle names", function() {
            var program = `testname test_name testname0 testName_0`;
            var expected = [
                {
                    type: "name",
                    value: "testname",
                    position: {
                        line: 0,
                        character: 0
                    }
                },
                {
                    type: "name",
                    value: "test_name",
                    position: {
                        line: 0,
                        character: 9
                    }
                },
                {
                    type: "name",
                    value: "testname0",
                    position: {
                        line: 0,
                        character: 19
                    }
                },
                {
                    type: "name",
                    value: "testName_0",
                    position: {
                        line: 0,
                        character: 29
                    }
                },
            ];
            var actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
    });
    describe("Comments", function() {
        it("Should handle single line comments", function() {
            var program = `
            // This is a comment
            var i = 0;
            `;
            var expected = {
                type: "name",
                value: "var",
                position: {
                    line: 2,
                    character: 12    
                }
            };
            lexer.setInput(program);
            var actual = lexer.lex();
            
            assert.tokensEqual(expected, actual);
        });
        it("Should handle multiline comments", function() {
            var program = `
            /* 
             * This is a comment!
             */
            var i = 0;
            /* This is also a comment. */
            `;
            var expected = {
                type: "name",
                value: "var",
                position: {
                    line: 4,
                    character: 12    
                }
            };
            lexer.setInput(program);
            var actual = lexer.lex();
            
            assert.tokensEqual(expected, actual);
        });
    });
    describe("ModelGen", function() {
        it("Should handle frame definitions", function() {
            var program = `$frame`;
            var expected = {
                type: "type",
                value: "$frame",
                position: {
                    line: 0,
                    character: 0
                }
            };

            lexer.setInput(program);
            var actual = lexer.lex();

            assert.tokensEqual(expected, actual);
        });
        it("Should ignore model name definitions", function() {
            var program = `$modelname name`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore name definitions", function() {
            var program = `$name armor`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore directory definitions", function() {
            var program = `$cd /test/models`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore flag definitions", function() {
            var program = `$flags 8`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore origin definitions", function() {
            var program = `$origin 0 0 0`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore scale definitions", function() {
            var program = `$scale 1 1 1`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore base definitions", function() {
            var program = `$base start`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
        it("Should ignore skin definitions", function() {
            var program = `$skin test`;
            var actual = all(program);

            assert.equal(actual.length, 0);
        });
    });
});
