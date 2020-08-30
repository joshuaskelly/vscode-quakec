/**
 * Position in a text document.
 */
class Position {
    /**
     * Creates a position.
     *
     * @param {number} line
     * @param {number} character
     */
    constructor(line, character) {
        /**
         * Line position in a document (zero based).
         */
        this.line = line;

        /**
         * Character position in a document (zero based).
         */
        this.character = character;
    }

    /**
     * Checks Position object equality.
     *
     * @param {Position} lhs A Position object.
     * @param {Position} rhs A Position object.
     * @return {boolean} True if given Position objects are equal.
     */
    static isEqual(lhs, rhs) {
        return lhs.line === rhs.line && lhs.character === rhs.character;
    }
}

/**
 * Range in a text document.
 */
class Range {
    /**
     * Creates a range with the given positions.
     *
     * @param {Position} start The range's start position
     * @param {Position} end The range's end position
     */
    constructor(start, end) {
        this.start = new Position(start.line, start.character);
        this.end = new Position(end.line, end.character);
    }

    /**
     * Checks for containment in the range.
     *
     * @param {Position} position
     *
     * @returns {boolean} True if the given position is contained within the range.
     */
    contains(position) {
        if (position.line < this.start.line) {
            return false;
        }
        else if (position.line > this.end.line) {
            return false;
        }
        else if (position.character < this.start.character) {
            return false;
        }
        else if (position.character > this.end.character) {
            return false;
        }

        if (Position.isEqual(position, this.end)) {
            return false;
        }

        return true;
    }
}

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.Position = Position;
    exports.Range = Range;
}
