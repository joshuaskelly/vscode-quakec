'use strict';

import * as fs from "fs";
import * as path from "path";
import * as parser from "quakec-parser";

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument, 
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem, 
	CompletionItemKind, Position, Location
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
			definitionProvider: true
		}
	}
});

documents.onDidChangeContent((change) => {
	documentManager.updateDocument(change.document);
	buildAstCache();
});

interface Settings {
	quakecConfig: QuakeCSettings;
}

interface QuakeCSettings {
	maxNumberOfProblems: number;
}

let maxNumberOfProblems: number;

let astCache:{[uri: string]: Program} = {};

function buildAstCache(): void {
	let progs = "file://" + path.join(workspaceRoot, "progs.src");
	let progDoc = documentManager.getDocument(progs);

	if (progDoc) {
		let text = progDoc.getText();
		text = text.replace(/\/\/.*/g, "");
		let fileOrder = text.split(/\s+/);
		fileOrder.shift();
		let scope:any = null;

		fileOrder.forEach(function(file) {
			if (file) {
				let uri = "file://" + path.join(workspaceRoot, file);
				let doc = documentManager.getDocument(uri);

				if (doc) {
					let parseInfo: ParseInfo = {
						program: doc.getText(),
						uri: uri,
						parentScope: scope
					};

					let ast = parser.parse(parseInfo);

					if (ast) {
						astCache[uri] = ast;
						scope = ast.scope;
					}
				}
			}
		});
	}
};

connection.onDefinition((request:TextDocumentPositionParams):Location => {
	let position: Position = request.position;
	let uri: string = request.textDocument.uri;

	let ast = astCache[uri];

	if (!ast) {
		return null;
	}

	let location:Location = ast.getDefinition(position);

	return location;
});

connection.listen();
