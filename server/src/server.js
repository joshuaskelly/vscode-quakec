'use strict';

const {
	IPCMessageReader,
	IPCMessageWriter,
	createConnection,
	TextDocuments,
	TextDocumentSyncKind
} = require('vscode-languageserver');

const { TextDocument } = require('vscode-languageserver-textdocument');
const { SourceDocumentManager } = require('./language');

let connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents = new TextDocuments(TextDocument);
documents.listen(connection);

let documentManager;

let workspaceRoot;
connection.onInitialize((params) => {
	// Use this to build a listing of project directory.
	workspaceRoot = params.rootUri;
	documentManager = new SourceDocumentManager(workspaceRoot);

	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			definitionProvider: true,
			hoverProvider: true,
			referencesProvider: true
		}
	}
});

documents.onDidChangeContent((change) => {
	documentManager.updateDocument(change.document);
	sendDiagnostics();
});

let language;

let sendDiagnostics = function() {
	let diagnostics = documentManager.getDiagnosticsAll();

	for (let d of diagnostics) {
		connection.sendDiagnostics(d);
	}
};

connection.onDidChangeConfiguration((change) => {
	let settings = change.settings;
	language = settings.quakec.language || "qcc";
	documentManager.setLanguage(language);
	sendDiagnostics();
});

connection.onDefinition((request) => {
	return documentManager.getDefinition(request);
});

connection.onHover((request) => {
	return documentManager.getHover(request);
});

connection.onReferences((request) => {
	return documentManager.getReferences(request);
});

connection.listen();
