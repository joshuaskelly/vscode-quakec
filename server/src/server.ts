'use strict';

import * as fs from "fs";
import * as path from "path";
import * as parser from "quakec-parser";

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument, 
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem, 
	CompletionItemKind, Position, Location, Hover
} from 'vscode-languageserver';

import { 
	ParseInfo, 
	Program 
} from "quakec-parser";

import {
	SourceDocumentManager
} from "./language";

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
			hoverProvider: true
		}
	}
});

documents.onDidChangeContent((change) => {
	//documentManager = new SourceDocumentManager(workspaceRoot);
	documentManager.updateDocument(change.document);
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

connection.listen();
