const doken = require("doken");
const common = require("./quakec-common");
const Position = common.Position;
const Range = common.Range;

class QCToken
{
    constructor(token)
    {
        /** @type {string} */
        this.type = token.type;
        /** @type {string} */
        this.value = token.value;
        this.position = new Position(token.row, token.col);

        const end = new Position(this.position.line, this.position.character);

        for (let i = 0; i < token.length; i++) {
            if (token.value[i] === '\n') {
                end.character = 0;
                end.line++;
            } else {
                end.character++;
            }
        }

        this.range = new Range(this.position, end);
    }
}

class QCLexer
{
    constructor()
    {
        this._tokenizer = doken.createTokenizer({
            rules: [
                doken.regexRule("_comment", /\/\*[\s\S]*?\*\//y, { lineBreaks: true }),
                doken.regexRule("_comment", /\/\/(?:\\\r?\n|[^\r\n])*(?:\r?\n|$)/y, { lineBreaks: true }),
                doken.regexRule("_whitespace", /\s+/y, { lineBreaks: true }),
                doken.regexRule("float", /[0-9]+(\.[0-9]+)?/y),
                doken.regexRule("string", /"([^"]|\\\S)*"/y),
                doken.regexRule("vector", /'\s*-?[0-9]+(\.[0-9]+)?\s+-?[0-9]+(\.[0-9]+)?\s+-?[0-9]+(\.[0-9]+)?\s*'/y),
                doken.regexRule("builtin", /#[0-9]+/y),
                doken.regexRule("type", /\.?(void|float|vector|string|entity)\b/y),
                doken.regexRule("name", /\$?[A-Za-z_]+[A-Za-z0-9_]*/y),
                doken.regexRule("operator", /(&&|\|\||<=|>=|==|!=|!|\*|\/|-|\+|=|\.|,|<|>|&|\||;|\(|\)|\[|\]|\{|\})/y)
            ],
            strategy: "longest"
        });

        this._lexer = null;
    }

    /** @type {string} input */
    setInput(input)
    {
        this._lexer = this._tokenizer(input);
    }

    lex()
    {
        const token = this._lexer.next();
        return !token.done ? new QCToken(token.value) : null;
    }
}

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.QCLexer = QCLexer;
    exports.Lexer = () => new QCLexer();
}
