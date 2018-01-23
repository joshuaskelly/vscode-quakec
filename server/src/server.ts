'use strict';

import * as fs from "fs";
import * as path from "path";
import * as parser from "quakec-parser";

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument, 
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem, 
	CompletionItemKind, Position, Location, Hover, ReferenceParams, PublishDiagnosticsParams
} from 'vscode-languageserver';

import { 
	ParseInfo, 
	Program 
} from "quakec-parser";

import {
	SourceDocumentManager
} from "./language";
import { connect } from "tls";
import { request } from "http";

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let documentManager: SourceDocumentManager;

let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	// Use this to build a listing of project directory.
	workspaceRoot = params.rootPath;
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
	let diagnostics: Diagnostic[] = documentManager.getDiagnostics(change.document);

	let d: PublishDiagnosticsParams = {
		uri: change.document.uri,
		diagnostics: diagnostics
	};

	connection.sendDiagnostics(d);
});

interface Settings {
	quakecConfig: QuakeCSettings;
}

interface QuakeCSettings {
	maxNumberOfProblems: number;
}

let maxNumberOfProblems: number;

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
