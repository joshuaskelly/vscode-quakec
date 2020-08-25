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
	};
});

documents.onDidChangeContent((change) => {
	documentManager.updateDocument(change.document);
	sendDiagnostics();
});

let language;
let features;

let sendDiagnostics = function() {
	let diagnostics = documentManager.getDiagnosticsAll();

	for (let d of diagnostics) {
		connection.sendDiagnostics(d);
	}
};

let createFeatures = function(language) {
	switch (language) {
		case 'qcc':
			return {
				binarySubtractRequiresLeadingWhitespace: true
			};
		case 'fteqcc':
			return {
				ternaryOperator: true,
				ternaryOperatorShorthand: true
			};
		default:
			return { };
	}
};

connection.onDidChangeConfiguration((change) => {
	let settings = change.settings;
	language = settings.quakec.language || "qcc";
	features = createFeatures(language);

	if (settings.quakec.features) {
		for (const key of Object.keys(settings.quakec.features)) {
			features[key] = settings.quakec.features[key];
		}
	}

	documentManager.setLanguageAndFeatures(language, features);
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
