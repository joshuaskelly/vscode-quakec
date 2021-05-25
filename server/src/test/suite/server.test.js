const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('Language Server Test Suite', () => {
    test('Hover Provider Test', (done) => {
        const doc = path.resolve(__dirname, '../../test-fixtures/fixture1/defs.qc');
        let textDocument;
        vscode.workspace
            .openTextDocument(doc)
            .then((document) => {
                // Open test document
                textDocument = document;
                return vscode.window.showTextDocument(textDocument);
            })
            .then(() => {
                // Give extension a chance to load.
                return new Promise((resolve) => setTimeout(resolve, 1000));
            })
            .then(() => {
                // Verify extension is intalled and loaded.
                return new Promise((resolve) => {
                    const extension = vscode.extensions.getExtension('joshuaskelly.quakec');
                    assert(extension, 'Extension is not installed!');
                    assert(extension.isActive, 'Extension is not active!');
                    resolve();
                });
            })
            .then(() => {
                assert(vscode.window.activeTextEditor, 'No active editor!');
                const position = new vscode.Position(2, 9);

                return vscode.commands.executeCommand(
                    'vscode.executeHoverProvider',
                    textDocument.uri,
                    position
                );
            })
            .then((hoverResults) => {
                assert.strictEqual(hoverResults.length, 1, 'Unexpected hover results');

                const firstResult = hoverResults[0];
                const contents = firstResult.contents;

                assert.strictEqual(contents.length, 1, 'Unexpected contents');
                const content = contents[0];

                assert(content, 'Bad content');

                const actual = content.value;
                const expected = '\n```quakec\nvoid() bar\n```\n';
                assert.strictEqual(
                    actual,
                    expected,
                    'Invalid hover contents'
                );
            })
            .then(done, done);
    });//.timeout(600000);
});