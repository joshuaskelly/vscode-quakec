'use strict';

const path = require("path");

const {
	ExtensionContext,
	workspace
} = require('vscode');

const {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} = require('vscode-languageclient');

let client;

module.exports.activate = function(context) {
	let serverModule = context.asAbsolutePath(
		path.join('server', 'src', 'server.js')
	);

	//let debugOptions = { execArgv: ["--nolazy", "--inspect-brk=6009"] };
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	let serverOptions = {
		run : { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}

	let clientOptions = {
		documentSelector: [{scheme: 'file', language: 'quakec'}],
		synchronize: {
			configurationSection: 'quakec',
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}

	client = new LanguageClient('quakec', 'QuakeC Language Server', serverOptions, clientOptions);
	client.start();
}

module.exports.deactivate = function() {
	if (!client) {
		return undefined;
	}
	return client.stop();
}