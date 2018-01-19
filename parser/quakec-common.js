var Position = function(line, character) {
    this.line = line;
    this.character = character;
};

var Range = function(start, end) {
    this.start = new Position(start.line, start.character);
    this.end = new Position(end.line, end.character);
};

Range.prototype.contains = function(position) {
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

    return true;
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    exports.Position = Position;
    exports.Range = Range;
}