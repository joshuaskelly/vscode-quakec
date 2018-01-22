/**
 * @file Common classes for working with language source documents
 * @author Joshua Skelton
 */

import * as fs from "fs";
import * as path from "path";
import * as parser from "quakec-parser";

import {
    Location,
    Position,
    TextDocument,
    TextDocumentPositionParams
} from 'vscode-languageserver';

import { 
    Program, Scope, ParseInfo 
} from "quakec-parser";
import { relative } from "path";

class DocumentCacheItem {
    version: number;
    document: TextDocument;
};

class ProgramCacheItem {
    uri: string;
    isValid: boolean;
    program: Program;
};

/* Class for working with source documents. */
export class SourceDocumentManager {
    private workspaceRoot: string;
    private documents: {[uri: string]: DocumentCacheItem};
    private programs: {[uri: string]: ProgramCacheItem};
    private sourceOrder: string[];

    /**
     * Create a SourceDocumentManager
     * @param {string} workspaceRoot - A path to the workspace root directory.
     */
    constructor(root: string) {
        this.workspaceRoot = root;
        this.documents = {};
        this.programs = {};
        this.sourceOrder = [];
        this.loadDocuments();
    }

    /**
     * Gets the source document for a given uri
     * @param uri - Document uri
     */
    public getDocument(uri: string): TextDocument {
        let documentCacheItem: DocumentCacheItem = this.documents[uri];

        if (!documentCacheItem) {
            return null;
        };

        return documentCacheItem.document;
    }

    /**
     * Update document
     * @param document - Text document to update
     */
    public updateDocument(document: TextDocument) {
        let documentCacheItem: DocumentCacheItem = this.documents[document.uri];

        // Update if not currently tracked or newer version
        if (!documentCacheItem || documentCacheItem.version < document.version) {
            
            documentCacheItem = {
                version: document.version,
                document: document
            };
            
            this.documents[document.uri] = documentCacheItem;
            this.invalidateProgram(document.uri);
            this.validateProgramCache();
        }
    }

    public getDefinition(request: TextDocumentPositionParams): Location {
        let position: Position = request.position;
        let uri: string = request.textDocument.uri;
        
        let programCacheItem: ProgramCacheItem = this.programs[uri];

        if (!programCacheItem) {
            return null;
        }

        if (!programCacheItem.isValid) {
            this.validateProgram(uri);
        }

        let program: Program = programCacheItem.program;
        
        return program.getDefinition(position);
    }

    /**
     * Load documents from workspace.
     */
    private loadDocuments(): void {
        this.documents = {};
        let files = fs.readdirSync(this.workspaceRoot);

        for (let file of files) {
            if (!this.isSourceDocument(file) && !this.isProjectDocument(file)) {
                continue;
            }

            let uri: string = path.join(this.workspaceRoot, file);
            let document: TextDocument = this.loadDocument(uri);

            if (this.isProjectDocument(uri)) {
                this.buildSourceOrder(document);
            }
        }

        this.validateProgramCache();
    }

    private loadDocument(uri: string): TextDocument {
        let document = this.readDocument(uri);
        let documentCacheItem = {
            version: document.version,
            document: document
        };
        this.documents["file://" + uri] = documentCacheItem;

        if (this.isSourceDocument(uri)) {
            let programCacheItem: ProgramCacheItem = {
                uri: uri,
                isValid: false,
                program: null
            };

            this.programs["file://" + uri] = programCacheItem;
        }

        return document;
    }

    private isSourceDocument(uri: string) {
        return path.extname(uri) === ".qc";
    }

    private isProjectDocument(uri: string) {
        return path.win32.basename(uri) === "progs.src";
    }

    private readDocument(uri: string): TextDocument {
        uri = uri.replace("file://", "");

        if (!fs.existsSync(uri)) {
            return null;
        }

        let content: string = fs.readFileSync(uri, "utf8");

        let langId: string = "quakec";
        if (!this.isSourceDocument(uri)) {
            langId = "plaintext";
        }

        return TextDocument.create(uri, langId, 1, content);
    }

    private validateProgramCache() {
        if (this.sourceOrder) {
            let scope: Scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                
                var program: Program = this.validateProgram(uri, scope);

                if (program) {
                    scope = program.scope;
                }
            }
        }

        for (let uri in this.programs) {
            this.validateProgram(uri);
        }
    };

    private validateProgram(uri: string, scope?: Scope): Program {
        let programCacheItem: ProgramCacheItem = this.programs[uri];

        if (!programCacheItem) {
            return null;
        }

        if (programCacheItem.isValid) {
            return programCacheItem.program;
        }

        let document: TextDocument = this.getDocument(uri);
        let parseInfo: ParseInfo = {
            program: document.getText(),
            uri: uri,
            parentScope: scope
        };
        let program: Program = parser.parse(parseInfo);
        programCacheItem = {
            uri: uri,
            isValid: true,
            program: program
        };
        this.programs[uri] = programCacheItem;

        return program;
    };

    private invalidateProgramCache(): void {
        for (let uri in this.programs) {
            this.invalidateProgram(uri, false);
        }
    };

    private invalidateProgram(uri: string, invalidateDownstream = true): void {
        let programCacheItem: ProgramCacheItem = this.programs[uri];
        let program: Program = programCacheItem.program;
        
        if (!program) {
            return;
        }

        programCacheItem.isValid = false;
        this.programs[uri] = programCacheItem;

        if (invalidateDownstream && this.sourceOrder.includes(uri)) {
            for (var i = this.sourceOrder.indexOf(uri); i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                this.invalidateProgram(uri, false);
            }
        }
    }

    private buildSourceOrder(progsSrcDocument: TextDocument): void {
        let text: string = progsSrcDocument.getText();
		text = text.replace(/\/\/.*/g, "");
		this.sourceOrder = text.split(/\s+/).filter(sourceDoc => sourceDoc);
        this.sourceOrder.shift();

        let self = this;
        this.sourceOrder = this.sourceOrder.map(
            function(sourceDoc: string) {
                return "file://" + self.workspacePath(sourceDoc);
            });
    }

    private workspacePath(relativePath: string) {
        return path.join(this.workspaceRoot, relativePath);
    }
}
