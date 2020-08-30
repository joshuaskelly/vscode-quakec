const assert = require("assert");
const Lexer = require("../quakec-lexer").Lexer;

describe("Lexer", function() {
    let lexer;

    beforeEach(function() {
        lexer = Lexer();
    });

    afterEach(function() {
        lexer = null;
    });

    const all = function(program) {
        lexer.setInput(program);

        const result = [];
        let token = lexer.lex();

        while (token) {
            result.push(token);
            token = lexer.lex();
        }

        return result;
    };

    assert.tokensEqual = function(expected, actual) {
        assert.equal(expected.type, actual.type, "Token types should be equal");
        assert.equal(expected.value, actual.value, "Token values should be equal");
        assert.equal(expected.position.line, actual.position.line, "Token line numbers should be equal.");
        assert.equal(expected.position.character, actual.position.character, "Token character numbers should be equal.");
    };

    assert.tokenArraysEqual = function(expected, actual) {
        assert.equal(expected.length, actual.length, "Number of tokens should be equal");

        for (let i = 0; i < expected.length; i++) {
            const e = expected[i];
            const a = actual[i];

            assert.tokensEqual(e, a);
        }
    };

    describe("Literals", function() {
        describe("Floats", function() {
            it("Should handle floats", function() {
                const program = `1.234`;
                const expected = {
                    type: "float",
                    value: "1.234",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle negative floats", function() {
                const program = `-1.234`;
                const expected = [
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
                const actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
            it("Should handle int style floats", function() {
                const program = `1`;
                const expected = {
                    type: "float",
                    value: "1",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle negative int style floats", function() {
                const program = `-10`;
                const expected = [
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
                const actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
        describe("Vectors", function() {
            it("Should handle vectors", function() {
                const program = `'1.234 0 -4'`;
                const expected = {
                    type: "vector",
                    value: "'1.234 0 -4'",
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
        });
        describe("Strings", function() {
            it("Should handle strings", function() {
                const program = `"hello world!"`;
                const expected = {
                    type: "string",
                    value: `"hello world!"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();
                assert.tokensEqual(expected, actual);
            });
            it("Should handle newlines", function() {
                const program = `"\nhello world!\n"`;
                const expected = {
                    type: "string",
                    value: `"\nhello world!\n"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();

                assert.tokensEqual(expected, actual);
            });
            it("Should handle path style strings", function() {
                const program = `"maps/jrwiz1.bsp"`;
                const expected = {
                    type: "string",
                    value: `"maps/jrwiz1.bsp"`,
                    position: {
                        line: 0,
                        character: 0
                    }
                };
                lexer.setInput(program);
                const actual = lexer.lex();
                assert.tokensEqual(expected, actual);
            });
        });
        describe("Builtins", function() {
            it("Should handle builtins", function() {
                const program = `#1 #22`;
                const expected = [
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
                const actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
    });
    describe("Operators", function() {
        it("Should handle all operators", function() {
            const program = `&& || <= >= == != ! * / - + = . < > & | ; ,`;
            const expected = [
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
                }
            ];
            const actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
        it("Should handle grouping operators", function() {
            const program = `( ) { } [ ]`;
            const expected = [
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
            const actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
    });
    describe("Types", function() {
        describe("Simple Types", function() {
            it("Should handle simple types", function() {
                const program = `void float vector string entity`;
                const expected = [
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
                const actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });

        describe("Field Types", function() {
            it("Should handle field types", function() {
                const program = `.void .float .vector .string .entity`;
                const expected = [
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
                const actual = all(program);

                assert.tokenArraysEqual(expected, actual);
            });
        });
    });
    describe("Names", function() {
        it("Should handle names", function() {
            const program = `testname test_name testname0 testName_0`;
            const expected = [
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
            const actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
    });
    describe("Comments", function() {
        it("Should handle single line comments", function() {
            const program = `
            // This is a comment
            const i = 0;
            `;
            const expected = {
                type: "name",
                value: "const",
                position: {
                    line: 2,
                    character: 12
                }
            };
            lexer.setInput(program);
            const actual = lexer.lex();

            assert.tokensEqual(expected, actual);
        });
        it("Should handle block comments", function() {
            const program = `
            /*
             * This is a comment!
             */
            const i = 0;
            /* This is also a comment. */
            `;
            const expected = {
                type: "name",
                value: "const",
                position: {
                    line: 4,
                    character: 12
                }
            };
            lexer.setInput(program);
            const actual = lexer.lex();

            assert.tokensEqual(expected, actual);
        });
        it("Should handle multiline comments", function() {
            const program = "// I am multi line \\\r\nand should be ignored \\ayooo\r\nconst i = 0;";
            const expected = {
                type: "name",
                value: "const",
                position: {
                    line: 2,
                    character: 0
                }
            };
            lexer.setInput(program);
            const actual = lexer.lex();

            assert.tokensEqual(expected, actual);
        });
    });
    describe("ModelGen", function() {
        it("Should handle empty frame definitions", function() {
            const program = `$frame`;
            const expected = {
                type: "name",
                value: "$frame",
                position: {
                    line: 0,
                    character: 0
                }
            };

            lexer.setInput(program);
            const actual = lexer.lex();

            assert.tokensEqual(expected, actual);
        });
        it("Should handle valid frame definitions", function() {
            const program = `$frame frame1 frame2`;
            const expected = [ {
                type: "name",
                value: "$frame",
                position: {
                    line: 0,
                    character: 0
                }
            }, {
                type: "name",
                value: "frame1",
                position: {
                    line: 0,
                    character: 7
                }
            }, {
                type: "name",
                value: "frame2",
                position: {
                    line: 0,
                    character: 14
                }
            } ];

            lexer.setInput(program);
            const actual = all(program);

            assert.tokenArraysEqual(expected, actual);
        });
    });
});
