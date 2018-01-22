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

class ProgramCacheItem {
    uri: string;
    isValid: boolean;
    program: Program;
};

/* Class for working with source documents. */
export class SourceDocumentManager {
    private workspaceRoot: string;
    private documents: {[uri: string]: TextDocument};
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
        return this.documents[uri];
    }

    /**
     * Update document
     * @param document - Text document to update
     */
    public updateDocument(document: TextDocument) {
        let d = this.getDocument(document.uri);

        // Update if not currently tracked or newer version
        if (!d || d.version < document.version) {
            this.documents[document.uri] = document;
        }

        this.invalidateAst(document.uri);
        this.validateAstCache();
    }

    public getDefinition(request: TextDocumentPositionParams): Location {
        let position: Position = request.position;
        let uri: string = request.textDocument.uri;
        
        let programCacheItem: ProgramCacheItem = this.programs[uri];

        if (!programCacheItem) {
            return null;
        }

        if (!programCacheItem.isValid) {
            this.validateAst(uri);
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
    }

    private loadDocument(uri: string): TextDocument {
        let document = this.readDocument(uri);
        this.documents["file://" + uri] = document;

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

    private validateAstCache() {
        if (this.sourceOrder) {
            let scope: Scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                
                var program: Program = this.validateAst(uri, scope);

                if (program) {
                    scope = program.scope;
                }
            }
        }

        for (let uri in this.programs) {
            this.validateAst(uri);
        }
    };

    private validateAst(uri: string, scope?: Scope): Program {
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

    private invalidateAstCache(): void {
        for (let uri in this.programs) {
            this.invalidateAst(uri, false);
        }
    };

    private invalidateAst(uri: string, invalidateDownstream = true): void {
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
                this.invalidateAst(uri, false);
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

class AstCacheItem {
    isValid: boolean;
    ast: Program;
    document: TextDocument;
}

class AstManager {
    progsSrc: TextDocument;
    sourceOrder: string[];
    astCache: {[uri: string]: AstCacheItem};

    constructor(progsSrc?: TextDocument) {
        this.progsSrc = progsSrc;
        this.sourceOrder = [];
        this.astCache = {}

        if (this.progsSrc) {
            //this.buildSourceOrder();
        }

        //this.validateAstCache();
    }

    public addDocument(document: TextDocument): void {
        let astCacheItem: AstCacheItem = {
            isValid: false,
            ast: null,
            document: document
        };

        this.astCache[document.uri] = astCacheItem;
    };

    public addDocuments(documents: TextDocument[]): void {
        for (let document of documents) {
            this.addDocument(document);
        }
    }

    public validateAstCache() {
        if (this.progsSrc) {
            let scope: Scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                
                var ast: Program = this.validateAst(uri, scope);

                if (ast) {
                    scope = ast.scope;
                }
            }
        }

        for (let uri in this.astCache) {
            let ast: AstCacheItem = this.astCache[uri];
            this.validateAst(uri);
        }
    };

    private validateAst(uri: string, scope?: Scope): Program {
        let astCacheItem: AstCacheItem = this.astCache[uri];

        if (!astCacheItem) {
            return null;
        }

        if (astCacheItem.isValid) {
            return astCacheItem.ast;
        }

        let document: TextDocument = astCacheItem.document;
        let parseInfo: ParseInfo = {
            program: document.getText(),
            uri: uri,
            parentScope: scope
        };
        let ast: Program = parser.parse(parseInfo);
        astCacheItem = {
            isValid: true,
            ast: ast,
            document: document
        };
        this.astCache[uri] = astCacheItem;

        return ast;
    };

    public invalidateAstCache(): void {
        for (let uri in this.astCache) {
            let ast: AstCacheItem = this.astCache[uri];
            this.invalidateAst(uri, false);
        }
    };

    public invalidateAst(uri: string, invalidateDownstream = true): void {
        let astCacheItem: AstCacheItem = this.astCache[uri];

        if (!astCacheItem) {
            return;
        }

        astCacheItem.isValid = false;
        this.astCache[uri] = astCacheItem;

        if (invalidateDownstream && this.sourceOrder.includes(uri)) {
            for (var i = this.sourceOrder.indexOf(uri); i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                this.invalidateAst(uri, false);
            }
        }
    };

    
}