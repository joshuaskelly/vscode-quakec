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

/** @typedef {import('../../parser/quakec-parser.js').FeatureInfo} FeatureInfo */

const connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
const documents = new TextDocuments(TextDocument);
documents.listen(connection);

/** @type {SourceDocumentManager} */
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

/** @type {string} */
let language;
/** @type {FeatureInfo} */
let features;

const sendDiagnostics = function() {
	const diagnostics = documentManager.getDiagnosticsAll();

	for (const d of diagnostics) {
		connection.sendDiagnostics(d);
	}
};

/** @return {FeatureInfo} */
const createFeatures = function(language) {
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
	const settings = change.settings;
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
