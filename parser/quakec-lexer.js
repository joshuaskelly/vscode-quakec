const Lexer = require("lex");
const common = require("./quakec-common");
const Position = common.Position;
const Range = common.Range;

const new_lexer = function() {
    const lexer = new Lexer();

    let line = 0;
    let character = 0;
    let last_position = new Position(line, character);
    let current_position = new Position(line, character);

    const new_token = function(type, value) {
        return {
            type: type,
            value: value,
            position: last_position,
            range: new Range(last_position, current_position)
        };
    };

    const update_position = function(str) {
        last_position = new Position(line, character);

        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (c === '\n') {
                line += 1;
                character = 0;
            }
            else {
                character += 1;
            }
        }

        current_position = new Position(line, character);
    };

    const process_lexeme = function(type) {
        return function(lexeme) {
            update_position(lexeme);

            if (type) {
                return new_token(type, lexeme);
            }
        };
    };

    lexer.addRule(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\//, process_lexeme());
    lexer.addRule(/\/\/.*/, process_lexeme());
    lexer.addRule(/[0-9]+(\.[0-9]+)?/, process_lexeme("float"));
    lexer.addRule(/"([^"]|\\\S)*"/, process_lexeme("string"));
    lexer.addRule(/'\s*-?[0-9]+(\.[0-9]+)?\s+-?[0-9]+(\.[0-9]+)?\s+-?[0-9]+(\.[0-9]+)?\s*'/, process_lexeme("vector"));
    lexer.addRule(/#[0-9]+/, process_lexeme("builtin"));
    lexer.addRule(/\.?(void|float|vector|string|entity|\$frame)\b/, process_lexeme("type"));
    lexer.addRule(/[A-Za-z_$]+[A-Za-z0-9_]*/, process_lexeme("name"));
    lexer.addRule(/(&&|\|\||<=|>=|==|!=|!|\*|\/|-|\+|=|\.|,|<|>|&|\||;|\(|\)|\[|\]|\{|\}|\$)/, process_lexeme("operator"));
    lexer.addRule(/\$(cd|origin|base|skin|modelname|name|flags|scale|framegroupstart|framegroupend|spritename|type|load)\b.*/, process_lexeme());
    lexer.addRule(/\$frame\s+[0-9].*/, process_lexeme());
    lexer.addRule(/[\s]+/, process_lexeme());
    lexer.addRule(/./, process_lexeme());

    return lexer;
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.Lexer = function() {
        return new_lexer();
    };
}
