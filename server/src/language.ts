/**
 * @file Common classes for working with language source documents
 * @author Joshua Skelton
 */

import * as fs from "fs";
import * as path from "path";

import {
	TextDocument
} from 'vscode-languageserver';

/* Class for working with source documents. */
export class SourceDocumentManager {
    private workspaceRoot: string;
    private documents: {[uri: string]: TextDocument};

    /**
     * Create a SourceDocumentManager
     * @param {string} workspaceRoot - A path to the workspace root directory.
     */
    constructor(root: string) {
        this.workspaceRoot = root;
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
    }

    /**
     * Load documents in workspace.
     */
    private loadDocuments(): void {
        this.documents = {};
        let files = fs.readdirSync(this.workspaceRoot);
        let self = this;

        files.forEach(function(file) {
            let uri: string = path.join(self.workspaceRoot, file);
            let content: string = fs.readFileSync(uri, "utf8");
    
            let d: TextDocument = TextDocument.create(uri, "quakec", 1, content);
            self.documents["file://" + uri] = d;
        });
    }
}

class AstCache {

}