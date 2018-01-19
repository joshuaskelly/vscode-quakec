var assert = require("assert");
var qparse = require("../quakec-parser").parse;
var parse = function(program) {
    return qparse({ program: program });
};

describe("Parser", function() {
    describe("Definitions", function() {
        describe("Simple Types", function() {
            it("Should be able to define a float", function() {
                var program = `float time;`;
                var actual = parse(program);

                var definition = actual.scope.def["time"];
                assert.equal(definition.value, "time")
            });
            it("Should be able to init a float", function() {
                var program = `float time = 0.0;`;
                var actual = parse(program);
            });
            it("Should be able to define a vector", function() {
                var program = `vector position;`;
                var actual = parse(program);
            });
            it("Should be able to init a vector", function() {
                var program = `vector position ='1.0 0 -2.0';`;
                var actual = parse(program);
            });
            it("Should be able to define a string", function() {
                var program = `string message;`;
                var actual = parse(program);
            });
            it("Should be able to init a string", function() {
                var program = `string message = "hello world!\n";`;
                var actual = parse(program);
            });
            it("Should be able to define an entity", function() {
                var program = `entity target;`;
                var actual = parse(program);
            });
            it("Should be able to define multiple variables", function() {
                var program = `float parm1, parm2, parm3;`;
                var actual = parse(program);
            });
            it("Should be able to initialize multiple variables", function() {
                var program = `float parm1, parm2, parm3 = 0;`;
                var actual = parse(program);
            });
        });
        describe("Field Types", function() {
            it("Should be able to define a .float", function() {
                var program = `.float time;`;
                var actual = parse(program);
            });
            it("Should be able to init a .float", function() {
                var program = `.float time = 0.0;`;
                var actual = parse(program);
            });
            it("Should be able to define a .vector", function() {
                var program = `.vector position;`;
                var actual = parse(program);
            });
            it("Should be able to init a .vector", function() {
                var program = `.vector position ='1.0 0 -2.0';`;
                var actual = parse(program);
            });
            it("Should be able to define a .string", function() {
                var program = `.string message;`;
                var actual = parse(program);
            });
            it("Should be able to init a .string", function() {
                var program = `.string message = "hello world!\n";`;
                var actual = parse(program);
            });
            it("Should be able to define an .entity", function() {
                var program = `.entity target;`;
                var actual = parse(program);
            });
        });
        describe("Function Types", function() {
            it("Should be able to forward declare a function", function() {
                var program = `void() update;`;
                var actual = parse(program);
            });
            it("Should be able to forward declare a function that takes simple args", function() {
                var program = `void(entity target) update;`;
                var actual = parse(program);
            });
            it("Should be able to forward declare a function that takes function args", function() {
                var program = `void(entity target, void() callback) update;`;
                var actual = parse(program);
            });
            it("Should be able to define a function", function() {
                var program = `void() update = {float time = 0.0;};`;
                var actual = parse(program);
            });
            it("Should be able to define a function via a builtin", function() {
                var program = `void(vector ang)	makevectors = #1;`;
                var actual = parse(program);
            });
        });
        describe("Frames", function() {
            it("Should be able to define frames", function() {
                var program = `$frame frame1 frame2 frame3`;
                var actual = parse(program);
            });
            it("Should be able to define a frame function", function() {
                var program = `void() framename = [$frame1, nextthink] {};`;
                var actual = parse(program);
            });
            it("Should be able to define a frame function with float literal", function() {
                var program = `void() framename = [0, nextthink] {};`;
                var actual = parse(program);
            });
        });
    });
    describe("Statements", function() {
        describe("Conditional", function() {
            it("Should handle if statements", function() {
                var program = `
                void() test = {
                    float i = 10;
                    if (i > 0)
                        i = 0;
                };`;
                var actual = parse(program);
            });
            it("Should handle block if statements", function() {
                var program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                };`;
                var actual = parse(program);
            });
            it("Should handle if else statements", function() {
                var program = `
                void() test = {
                    float i = 10;
                    if (i > 0) {
                        i = 0;
                    }
                    else {
                        i = i + 1;
                    }
                };`;
                var actual = parse(program);
            });
            it("Should handle nested if else statements", function() {
                var program = `
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
                var actual = parse(program);
            });
        });
        describe("Control", function() {
            it("Should handle do loops", function() {
                var program = `
                float i = 0;
                void() test = {
                    do
                        i = i - 1;
                    while (i < 10);
                };`;
                var actual = parse(program);
            });
            it("Should handle block do loops", function() {
                var program = `
                float i = 0;
                void() test = {
                    do {
                        i = i - 1;
                    }
                    while (i < 10);
                };`;
                var actual = parse(program);
            });
            it("Should handle while loops", function() {
                var program = `
                float i = 0;
                void() func = {
                    while (i < 10)
                        i = i - 1;
                };`;
                var actual = parse(program);
            });
            it("Should handle block while loops", function() {
                var program = `
                float i = 0;
                void() func = {
                    while (i < 10) {
                        i = i - 1;
                    }
                };`;
                var actual = parse(program);
            });
        });
        describe("Function Invocation", function() {
            it("Should handle invocation with no parameters", function() {
                var program = `
                void() test = {
                    test();
                };`;
                var actual = parse(program);
            });
            it("Should handle invocation with parameters", function() {
                var program = `
                void(float time) test = {
                    float a = 0;
                    test(a - 1);
                };`;
                var actual = parse(program);
            });
            it("Should have function parameters defined in local scope", function() {
                var program = `
                float(float time) test = {
                    return time + 1;
                };`;
                var actual = parse(program);
            });
            it("Should handle invocation on fields", function() {
                var program = `
                void() test = {
                    self.th_walk();
                };`;
                var actual = parse(program);
            });
        });
        describe("Return", function() {
            it("Should handle return statements", function() {
                var program = `
                void() test = {
                    return;
                };`;
                var actual = parse(program);
            });
            it("Should handle return statements with value", function() {
                var program = `
                float() test = {
                    return 42;
                };`;
                var actual = parse(program);
            });
        });
        describe("Local Variables", function() {
            it("Should handle defining local variables", function() {
                var program = `
                void() test = {
                    local float time;
                };`;
                var actual = parse(program);
            });
            it("Should handle initializing local variables", function() {
                var program = `
                void() test = {
                    local float time = 0.0;
                };`;
                var actual = parse(program);
            });
            it("Should handle local variable assignment", function() {
                program = `
                float(float v) test = {
                    v = v - 360;
                    return v;
                };`;
                var actual = parse(program);
            });
        });
    });
    describe("Expressions", function() {
        describe("Infix", function() {
            it("Should handle the && operator", function() {
                var program = `
                void() test = {
                    1 && 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the || operator", function() {
                var program = `
                void() test = {
                    1 || 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the <= operator", function() {
                var program = `
                void() test = {
                    1 <= 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the >= operator", function() {
                var program = `
                void() test = {
                    1 >= 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the == operator", function() {
                var program = `
                void() test = {
                    1 == 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the != operator", function() {
                var program = `
                void() test = {
                    1 != 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the * operator", function() {
                var program = `
                void() test = {
                    1 * 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the / operator", function() {
                var program = `
                void() test = {
                    1 / 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the - operator", function() {
                var program = `
                void() test = {
                    1 - 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the + operator", function() {
                var program = `
                void() test = {
                    1 + 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the = operator", function() {
                var program = `
                void() test = {
                    local float t;
                    t = 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle = on fields", function() {
                var program = `
                void() test = {
                    self.solid = 0;
                };`;
                var actual = parse(program);
            });
            it("Should handle the < operator", function() {
                var program = `
                void() test = {
                    1 < 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the > operator", function() {
                var program = `
                void() test = {
                    1 > 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the & operator", function() {
                var program = `
                void() test = {
                    1 & 2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the | operator", function() {
                var program = `
                void() test = {
                    1 | 2;
                };`;
                var actual = parse(program);
            });
        });
        describe("Prefix", function() {
            it("Should handle the ! operator", function() {
                var program = `
                void() test = {
                    !1;
                };`;
                var actual = parse(program);
            });
            it("Should handle the - operator", function() {
                var program = `
                void() test = {
                    -2;
                };`;
                var actual = parse(program);
            });
            it("Should handle the ( operator", function() {
                var program = `
                void() test = {
                    (0);
                };`;
                var actual = parse(program);
            });
            it("Should handle the $ operator", function() {
                var program = `
                void() test = {
                    float a = $frame1;
                };`;
                var actual = parse(program);
            });
        });
    });
    describe("Errors", function() {
        it("Should handle undefined names", function() {
            var program = `
            void() test = {
                onerror();
            };`;
            var actual = parse(program);
        });
    });
});