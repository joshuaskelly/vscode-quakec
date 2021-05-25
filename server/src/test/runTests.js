const path = require('path');
const { runTests } = require('vscode-test');

async function run() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
        console.log(`Dirname: ${__dirname}`);
        console.log(`ExtensionDevelopmentPath: ${extensionDevelopmentPath}`);
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        const testWorkspace = path.resolve(__dirname, '../test-fixtures/fixture1');

        console.log(`Extension Development Path ${extensionDevelopmentPath}`);

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspace,
                '--disable-extensions'
            ]
        });
    }
    catch (err) {
        console.error(err);
        console.error('Failed to run tests');
        process.exit(1);
    }
}

run();
