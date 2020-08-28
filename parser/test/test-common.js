const assert = require('assert');
const Position = require('../quakec-common').Position;
const Range = require('../quakec-common').Range;

describe("Common", function() {
    describe("Range", function() {
        it("Should contain position inside of range.", function() {
            const range = new Range(
                new Position(0, 0),
                new Position(0, 4)
            );

            const position = new Position(0, 2);

            assert.ok(range.contains(position), "Range should contain position.");
        });
        it("Should not contain position outside of range.", function() {
            const range = new Range(
                new Position(0, 0),
                new Position(0, 4)
            );

            const position = new Position(0, 10);

            assert.ok(!range.contains(position), "Range should not contain position.");
        });
        it("Should contain position at start of range.", function() {
            const range = new Range(
                new Position(0, 0),
                new Position(0, 4)
            );

            const position = new Position(0, 0);

            assert.ok(range.contains(position), "Range should contain position.");
        });
        it("Should not contain position at end of range.", function() {
            const range = new Range(
                new Position(0, 0),
                new Position(0, 4)
            );

            const position = new Position(0, 4);

            assert.ok(!range.contains(position), "Range should contain position.");
        });
    });
});
