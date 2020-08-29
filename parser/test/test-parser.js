const assert = require("assert");
const qparse = require("../quakec-parser").parse;

const parse = function(program) {
    return qparse({ program: program });
};

describe("Parser", function() {
    assert.noErrors = function(program) {
        assert.equal(0, program.errors.length, "Parse errors occurred.");
    };

    assert.rangesEqual = function(actual, expected) {
        assert.equal(actual.start.line, expected.start.line, "Starting line numbers should be equal.");
        assert.equal(actual.start.character, expected.start.character, "Starting character numbers should be equal.");
        assert.equal(actual.end.line, expected.end.line, "Ending line numbers should be equal.");
        assert.equal(actual.start.character, expected.start.character, "Ending line numbers should be equal.");
    };

    assert.errorsEqual = function(actual, expected) {
        assert.equal(actual.severity, expected.severity, "Error severities should be equal.");
        assert.equal(actual.message, expected.message, "Error messages should be equal.");
        assert.rangesEqual(actual.range, expected.range, "Error ranges should be equal.");
    };

    describe("Definitions", function() {
        describe("Simple Types", function() {
            it("Should be able to define a float", function() {
                const program = `float time;`;
                const actual = parse(program);
                assert.noErrors(actual);

                const definition = actual.scope.def["time"];
                assert.equal(definition.value, "time");
            });
            it("Should be able to init a float", function() {
                const program = `float time = 0.0;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a negative float", function() {
                const program = `float NEGATIVE = -1.0;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a vector", function() {
                const program = `vector position;`;
                const actual = parse(program);
                assert.noErrors(actual);
                const scope = actual.scope;
                const xComponent = scope.find("position_x");
                const yComponent = scope.find("position_y");
                const zComponent = scope.find("position_z");
                assert.equal(!!xComponent, true, "Accessor for x-component should be defined.");
                assert.equal(!!yComponent, true, "Accessor for y-component should be defined.");
                assert.equal(!!zComponent, true, "Accessor for z-component should be defined.");
                assert.equal(xComponent.type.value, "float", "Accessor should be of type float.");
                assert.equal(yComponent.type.value, "float", "Accessor should be of type float.");
                assert.equal(zComponent.type.value, "float", "Accessor should be of type float.");
            });
            it("Should be able to init a vector", function() {
                const program = `vector position ='1.0 0 -2.0';`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a string", function() {
                const program = `string message;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a string", function() {
                const program = `string message = "hello world!\n";`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define an entity", function() {
                const program = `entity target;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define multiple variables", function() {
                const program = `float parm1, parm2, parm3;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to initialize multiple variables", function() {
                const program = `float parm1, parm2, parm3 = 0;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Field Types", function() {
            it("Should be able to define a .float", function() {
                const program = `.float time;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .float", function() {
                const program = `.float time = 0.0;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a .vector", function() {
                const program = `.vector position;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .vector", function() {
                const program = `.vector position ='1.0 0 -2.0';`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a .string", function() {
                const program = `.string message;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .string", function() {
                const program = `.string message = "hello world!\n";`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define an .entity", function() {
                const program = `.entity target;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Function Types", function() {
            it("Should be able to forward declare a function", function() {
                const program = `void() update;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to forward declare a function that takes simple args", function() {
                const program = `void(entity target) update;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to forward declare a function that takes function args", function() {
                const program = `void(entity target, void() callback) update;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a function", function() {
                const program = `void() update = {float time = 0.0;};`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a function via a builtin", function() {
                const program = `void(vector ang)	makevectors = #1;`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should not define accessors for functions of type vector", function() {
                const program = `vector(entity target) lookAt;`;
                const actual = parse(program);
                assert.noErrors(actual);
                const scope = actual.scope;
                const xComponent = scope.find("lookAt_x");
                const yComponent = scope.find("lookAt_y");
                const zComponent = scope.find("lookAt_z");
                assert.equal(xComponent.value, "(name)", "Accessor should not be defined.");
                assert.equal(yComponent.value, "(name)", "Accessor should not be defined.");
                assert.equal(zComponent.value, "(name)", "Accessor should not be defined.");
            });
        });
        describe("Frames", function() {
            it("Should be able to define frames", function() {
                const program = `$frame frame1 frame2 frame3`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame with optional value", function() {
                const program = `$frame frame1 1.0`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame function", function() {
                const program = `void() framename = [$frame1, nextthink] {};`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame function with float literal", function() {
                const program = `void() framename = [0, nextthink] {};`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to start frame groups", function() {
                const program = `$framegroupstart`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to end frame groups", function() {
                const program = `$framegroupend`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Statements", function() {
        describe("Conditional", function() {
            it("Should handle if statements", function() {
                const program = `
                void() test = {
                    float i = 10;
                    if (i > 0)
                        i = 0;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block if statements", function() {
                const program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle if else statements", function() {
                const program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                    else {
                        i = i + 1;
                    }
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle nested if else statements", function() {
                const program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        if (i < 100) {
                            i = 0;
                        }
                    }
                    else {
                        i = i + 1;
                    }
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Control", function() {
            it("Should handle do loops", function() {
                const program = `
                float i = 0;
                void() test = {
                    do
                        i = i - 1;
                    while (i < 10);
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block do loops", function() {
                const program = `
                float i = 0;
                void() test = {
                    do {
                        i = i - 1;
                    }
                    while (i < 10);
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle while loops", function() {
                const program = `
                float i = 0;
                void() func = {
                    while (i < 10)
                        i = i - 1;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block while loops", function() {
                const program = `
                float i = 0;
                void() func = {
                    while (i < 10) {
                        i = i - 1;
                    }
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Function Invocation", function() {
            it("Should handle invocation with no parameters", function() {
                const program = `
                void() test = {
                    test();
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle invocation with parameters", function() {
                const program = `
                void(float time) test = {
                    float a = 0;
                    test(a - 1);
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should have function parameters defined in local scope", function() {
                const program = `
                float(float time) test = {
                    return time + 1;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle invocation on fields", function() {
                const program = `
                void() test = {
                    self.th_walk();
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Return", function() {
            it("Should handle return statements", function() {
                const program = `
                void() test = {
                    return;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle return statements with value", function() {
                const program = `
                float() test = {
                    return 42;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Local Variables", function() {
            it("Should handle defining local variables", function() {
                const program = `
                void() test = {
                    local float time;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle defining multiple local variables", function() {
                const program = `
                void() test = {
                    local float time, counter;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle initializing local variables", function() {
                const program = `
                void() test = {
                    local float time = 0.0;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle local variable assignment", function() {
                const program = `
                float(float v) test = {
                    v = v - 360;
                    return v;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Expressions", function() {
        describe("Infix", function() {
            it("Should handle the && operator", function() {
                const program = `
                void() test = {
                    1 && 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the || operator", function() {
                const program = `
                void() test = {
                    1 || 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the <= operator", function() {
                const program = `
                void() test = {
                    1 <= 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the >= operator", function() {
                const program = `
                void() test = {
                    1 >= 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the == operator", function() {
                const program = `
                void() test = {
                    1 == 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the != operator", function() {
                const program = `
                void() test = {
                    1 != 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the * operator", function() {
                const program = `
                void() test = {
                    1 * 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the / operator", function() {
                const program = `
                void() test = {
                    1 / 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the - operator", function() {
                const program = `
                void() test = {
                    1 - 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the + operator", function() {
                const program = `
                void() test = {
                    1 + 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the = operator", function() {
                const program = `
                void() test = {
                    local float t;
                    t = 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle = on fields", function() {
                const program = `
                void() test = {
                    self.solid = 0;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the < operator", function() {
                const program = `
                void() test = {
                    1 < 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the > operator", function() {
                const program = `
                void() test = {
                    1 > 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the & operator", function() {
                const program = `
                void() test = {
                    1 & 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the | operator", function() {
                const program = `
                void() test = {
                    1 | 2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Prefix", function() {
            it("Should handle the ! operator", function() {
                const program = `
                void() test = {
                    !1;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the - operator", function() {
                const program = `
                void() test = {
                    -2;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the ( operator", function() {
                const program = `
                void() test = {
                    (0);
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the $ operator", function() {
                const program = `
                $frame frame1
                void() test = {
                    float a = $frame1;
                };`;
                const actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Errors", function() {
        it("Should handle undefined names", function() {
            const program = `
            void() test = {
                onerror();
            };`;
            const actual = parse(program);
            assert.noErrors(actual);
        });
        it("Should create an error for array access", function() {
            const program = `
            void() test = {
                onerror[0];
            };`;
            const actual = parse(program);
            assert.equal(actual.errors.length, 1);

            const expectedError = {
                message: "[qcc] Bracket operator not supported.",
                range: {
                    start: {
                        line: 2,
                        character: 23
                    },
                    end: {
                        line: 2,
                        character: 26
                    }
                },
                severity: 1
            };

            assert.errorsEqual(actual.errors[0], expectedError);
        });
        it("Should create an error for array definitions", function() {
            const program = `
            float() times[4];`;
            const actual = parse(program);
            assert.equal(actual.errors.length, 1);

            const expectedError = {
                message: "[qcc] Array definition not supported.",
                range: {
                    start: {
                        line: 1,
                        character: 25
                    },
                    end: {
                        line: 1,
                        character: 28
                    }
                },
                severity: 1
            };

            assert.errorsEqual(actual.errors[0], expectedError);
        });
        it("Should create an error subtraction without whitespace.", function() {
            const program = `
            void() test = {
                local float zero = 1-1;
            };`;
            const actual = parse(program);
            assert.equal(actual.errors.length, 1);

            const expectedError = {
                message: "[qcc] Missing whitespace for '-' operator.",
                range: {
                    start: {
                        line: 2,
                        character: 36
                    },
                    end: {
                        line: 2,
                        character: 37
                    }
                },
                severity: 1
            };

            assert.errorsEqual(actual.errors[0], expectedError);
        });
    });
});
