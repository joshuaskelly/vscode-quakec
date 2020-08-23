'use strict';

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection,
	TextDocuments, InitializeResult, TextDocumentPositionParams,
	Location, Hover, ReferenceParams, PublishDiagnosticsParams
} from 'vscode-languageserver';

import { SourceDocumentManager } from "./language";

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let documentManager: SourceDocumentManager;

let workspaceRoot: string | null;
connection.onInitialize((params): InitializeResult => {
	// Use this to build a listing of project directory.
	workspaceRoot = params.rootUri;
	documentManager = new SourceDocumentManager(workspaceRoot);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
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

interface Settings {
	quakec: QuakeCSettings;
}

interface QuakeCSettings {
	maxNumberOfProblems: number;
	language: string;
}

let language: string;

let sendDiagnostics = function(): void {
	let diagnostics: PublishDiagnosticsParams[] = documentManager.getDiagnosticsAll();

	for (let d of diagnostics) {
		connection.sendDiagnostics(d);
	}
};

connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	language = settings.quakec.language || "qcc";
	documentManager.setLanguage(language);
	sendDiagnostics();
});

connection.onDefinition((request:TextDocumentPositionParams):Location => {
	return documentManager.getDefinition(request);
});

connection.onHover((request:TextDocumentPositionParams):Hover => {
	return documentManager.getHover(request);
});

connection.onReferences((request: ReferenceParams): Location[] => {
	return documentManager.getReferences(request);
});

connection.listen();
