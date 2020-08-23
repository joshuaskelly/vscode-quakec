'use strict';

import * as path from 'path';

import {
	ExtensionContext,
	workspace
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	let debugOptions = { execArgv: ["--nolazy", "--inspect-brk=6009"] };
	//let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}

	let clientOptions: LanguageClientOptions = {
		documentSelector: [{scheme: 'file', language: 'quakec'}],
		synchronize: {
			configurationSection: 'quakec',
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}

	client = new LanguageClient('quakec', 'QuakeC Language Server', serverOptions, clientOptions);
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}