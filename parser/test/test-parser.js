var assert = require("assert");
var qparse = require("../quakec-parser").parse;
var parse = function(program) {
    return qparse({ program: program });
};

describe("Parser", function() {
    assert.noErrors = function(program) {
        assert.equal(0, program.errors.length, "Parse errors occurred");
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
            it("Should be able to define a vector", function() {
                let program = `vector position;`;
                let actual = parse(program);
                assert.noErrors(actual);
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
        });
        describe("Frames", function() {
            it("Should be able to define frames", function() {
                let program = `$frame frame1 frame2 frame3`;
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
        });
        it("Should create an error for array definitions", function() {
            let program = `
            float() times[4];`;
            let actual = parse(program);
            actual.getTypeString({line: 1, character: 33});
        });
    });
});