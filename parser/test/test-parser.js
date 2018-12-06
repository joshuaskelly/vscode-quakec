var assert = require("assert");
var qparse = require("../quakec-parser").parse;

var parse = function(program) {
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
                let program = `float time;`;
                let actual = parse(program);
                assert.noErrors(actual);

                let definition = actual.scope.def["time"];
                assert.equal(definition.value, "time")
            });
            it("Should be able to init a float", function() {
                let program = `float time = 0.0;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a negative float", function() {
                let program = `float NEGATIVE = -1.0;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a vector", function() {
                let program = `vector position;`;
                let actual = parse(program);
                assert.noErrors(actual);
                let scope = actual.scope;
                let xComponent = scope.find("position_x");
                let yComponent = scope.find("position_y");
                let zComponent = scope.find("position_z");
                assert.equal(!!xComponent, true, "Accessor for x-component should be defined.");
                assert.equal(!!yComponent, true, "Accessor for y-component should be defined.");
                assert.equal(!!zComponent, true, "Accessor for z-component should be defined.");
                assert.equal(xComponent.type.value, "float", "Accessor should be of type float.");
                assert.equal(yComponent.type.value, "float", "Accessor should be of type float.");
                assert.equal(zComponent.type.value, "float", "Accessor should be of type float.");
            });
            it("Should be able to init a vector", function() {
                let program = `vector position ='1.0 0 -2.0';`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a string", function() {
                let program = `string message;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a string", function() {
                let program = `string message = "hello world!\n";`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define an entity", function() {
                let program = `entity target;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define multiple variables", function() {
                let program = `float parm1, parm2, parm3;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to initialize multiple variables", function() {
                let program = `float parm1, parm2, parm3 = 0;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Field Types", function() {
            it("Should be able to define a .float", function() {
                let program = `.float time;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .float", function() {
                let program = `.float time = 0.0;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a .vector", function() {
                let program = `.vector position;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .vector", function() {
                let program = `.vector position ='1.0 0 -2.0';`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a .string", function() {
                let program = `.string message;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to init a .string", function() {
                let program = `.string message = "hello world!\n";`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define an .entity", function() {
                let program = `.entity target;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Function Types", function() {
            it("Should be able to forward declare a function", function() {
                let program = `void() update;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to forward declare a function that takes simple args", function() {
                let program = `void(entity target) update;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to forward declare a function that takes function args", function() {
                let program = `void(entity target, void() callback) update;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a function", function() {
                let program = `void() update = {float time = 0.0;};`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a function via a builtin", function() {
                let program = `void(vector ang)	makevectors = #1;`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should not define accessors for functions of type vector", function() {
                let program = `vector(entity target) lookAt;`;
                let actual = parse(program);
                assert.noErrors(actual);
                let scope = actual.scope;
                let xComponent = scope.find("lookAt_x");
                let yComponent = scope.find("lookAt_y");
                let zComponent = scope.find("lookAt_z");
                assert.equal(xComponent.value, "(name)", "Accessor should not be defined.");
                assert.equal(yComponent.value, "(name)", "Accessor should not be defined.");
                assert.equal(zComponent.value, "(name)", "Accessor should not be defined.");
            });
        });
        describe("Frames", function() {
            it("Should be able to define frames", function() {
                let program = `$frame frame1 frame2 frame3`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame with optional value", function() {
                let program = `$frame frame1 1.0`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame function", function() {
                let program = `void() framename = [$frame1, nextthink] {};`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to define a frame function with float literal", function() {
                let program = `void() framename = [0, nextthink] {};`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to start frame groups", function() {
                let program = `$framegroupstart`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should be able to end frame groups", function() {
                let program = `$framegroupend`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Statements", function() {
        describe("Conditional", function() {
            it("Should handle if statements", function() {
                let program = `
                void() test = {
                    float i = 10;
                    if (i > 0)
                        i = 0;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block if statements", function() {
                let program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle if else statements", function() {
                let program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                    else {
                        i = i + 1;
                    }
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle nested if else statements", function() {
                let program = `
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
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Control", function() {
            it("Should handle do loops", function() {
                let program = `
                float i = 0;
                void() test = {
                    do
                        i = i - 1;
                    while (i < 10);
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block do loops", function() {
                let program = `
                float i = 0;
                void() test = {
                    do {
                        i = i - 1;
                    }
                    while (i < 10);
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle while loops", function() {
                let program = `
                float i = 0;
                void() func = {
                    while (i < 10)
                        i = i - 1;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle block while loops", function() {
                let program = `
                float i = 0;
                void() func = {
                    while (i < 10) {
                        i = i - 1;
                    }
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Function Invocation", function() {
            it("Should handle invocation with no parameters", function() {
                let program = `
                void() test = {
                    test();
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle invocation with parameters", function() {
                let program = `
                void(float time) test = {
                    float a = 0;
                    test(a - 1);
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should have function parameters defined in local scope", function() {
                let program = `
                float(float time) test = {
                    return time + 1;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle invocation on fields", function() {
                let program = `
                void() test = {
                    self.th_walk();
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Return", function() {
            it("Should handle return statements", function() {
                let program = `
                void() test = {
                    return;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle return statements with value", function() {
                let program = `
                float() test = {
                    return 42;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Local Variables", function() {
            it("Should handle defining local variables", function() {
                let program = `
                void() test = {
                    local float time;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle defining multiple local variables", function() {
                let program = `
                void() test = {
                    local float time, counter;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle initializing local variables", function() {
                let program = `
                void() test = {
                    local float time = 0.0;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle local variable assignment", function() {
                program = `
                float(float v) test = {
                    v = v - 360;
                    return v;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Expressions", function() {
        describe("Infix", function() {
            it("Should handle the && operator", function() {
                let program = `
                void() test = {
                    1 && 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the || operator", function() {
                let program = `
                void() test = {
                    1 || 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the <= operator", function() {
                let program = `
                void() test = {
                    1 <= 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the >= operator", function() {
                let program = `
                void() test = {
                    1 >= 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the == operator", function() {
                let program = `
                void() test = {
                    1 == 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the != operator", function() {
                let program = `
                void() test = {
                    1 != 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the * operator", function() {
                let program = `
                void() test = {
                    1 * 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the / operator", function() {
                let program = `
                void() test = {
                    1 / 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the - operator", function() {
                let program = `
                void() test = {
                    1 - 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the + operator", function() {
                let program = `
                void() test = {
                    1 + 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the = operator", function() {
                let program = `
                void() test = {
                    local float t;
                    t = 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle = on fields", function() {
                let program = `
                void() test = {
                    self.solid = 0;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the < operator", function() {
                let program = `
                void() test = {
                    1 < 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the > operator", function() {
                let program = `
                void() test = {
                    1 > 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the & operator", function() {
                let program = `
                void() test = {
                    1 & 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the | operator", function() {
                let program = `
                void() test = {
                    1 | 2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
        describe("Prefix", function() {
            it("Should handle the ! operator", function() {
                let program = `
                void() test = {
                    !1;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the - operator", function() {
                let program = `
                void() test = {
                    -2;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the ( operator", function() {
                let program = `
                void() test = {
                    (0);
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
            it("Should handle the $ operator", function() {
                let program = `
                void() test = {
                    float a = $frame1;
                };`;
                let actual = parse(program);
                assert.noErrors(actual);
            });
        });
    });
    describe("Errors", function() {
        it("Should handle undefined names", function() {
            let program = `
            void() test = {
                onerror();
            };`;
            let actual = parse(program);
            assert.noErrors(actual);
        });
        it("Should create an error for array access", function() {
            let program = `
            void() test = {
                onerror[0];
            };`;
            let actual = parse(program);
            assert.equal(actual.errors.length, 1);

            let expectedError = {
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
            let program = `
            float() times[4];`;
            let actual = parse(program);
            assert.equal(actual.errors.length, 1);

            let expectedError = {
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
            let program = `
            void() test = {
                local float zero = 1-1;
            };`;
            let actual = parse(program);
            assert.equal(actual.errors.length, 1);

            let expectedError = {
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
