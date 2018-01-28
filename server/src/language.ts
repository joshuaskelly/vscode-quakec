/**
 * @file Common classes for working with language source documents
 * @author Joshua Skelton
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as parser from "quakec-parser";

import {
    Hover,
    Location,
    Position,
    ReferenceParams,
    TextDocument,
    TextDocumentPositionParams,
    Diagnostic,
    DiagnosticSeverity,
    PublishDiagnosticsParams
} from 'vscode-languageserver';

import { 
    Program, Scope, ParseInfo, Error 
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
    private documentsParsed: number;

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
        let documentCacheItem: DocumentCacheItem = this.getDocumentCacheItem(uri);

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
        let uri: string = this.fromVSCodeUri(document.uri);
        let documentCacheItem: DocumentCacheItem = this.getDocumentCacheItem(uri);

        // Update if not currently tracked or newer version
        if (!documentCacheItem || documentCacheItem.version < document.version) {
            
            documentCacheItem = {
                version: document.version,
                document: document
            };
            
            this.setDocumentCacheItem(uri, documentCacheItem);
            this.invalidateProgram(uri);
            this.validateProgramCache(uri);
        }
    }

    public getHover(request: TextDocumentPositionParams) : Hover {
        let program: Program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return null;
        }

        let type: string = program.getTypeString(request.position);

        if (!type) {
            return null;
        }

        return {
            contents: {
                language: "quakec",
                value: type
            }
        };
    }

    public getDefinition(request: TextDocumentPositionParams): Location {
        let program: Program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return null;
        }

        let location: Location = program.getDefinition(request.position);
        location.uri = this.toVSCodeUri(location.uri);
        
        return location;
    }

    public getReferences(request: ReferenceParams): Location[] {
        this.validateProgramCache();
        let program: Program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return [];
        }

        let locations: Location[] = program.getReferences(request.position, request.context.includeDeclaration);

        for (let location of locations) {
            location.uri = this.toVSCodeUri(location.uri);
        }

        return locations;
    }

    public getDiagnostics(request: TextDocument): Diagnostic[] {
        let program: Program = this.getProgram(request.uri);

        if (!program) {
            return [];
        }

        let diagnostics: Diagnostic[] = [];
        let errors: Error[] = program.getErrors();

        for (let error of errors) {
            let severity: DiagnosticSeverity = [
                null,
                DiagnosticSeverity.Error,
                DiagnosticSeverity.Warning,
                DiagnosticSeverity.Information,
                DiagnosticSeverity.Hint
            ][error.severity];

            let diagnostic: Diagnostic = {
                range: error.range,
                severity: severity,
                message: error.message
            };

            diagnostics.push(diagnostic);
        }
        
        return diagnostics;
    }

    public getDiagnosticsAll(): PublishDiagnosticsParams[] {
        let publishDiagnosticsParams: PublishDiagnosticsParams[] = [];
        for (let uri in this.documents) {
            let document: TextDocument = this.getDocument(uri);
            let diagnostics: Diagnostic[] = this.getDiagnostics(document);
            publishDiagnosticsParams.push(
                {
                    uri: this.toVSCodeUri(uri),
                    diagnostics: diagnostics
                }
            );
        }

        return publishDiagnosticsParams;
    }

    private getProgram(uri: string): Program {
        uri = this.fromVSCodeUri(uri);
        let programCacheItem: ProgramCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return null;
        }

        if (!programCacheItem.isValid) {
            this.validateProgram(uri);
        }

        return programCacheItem.program;
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
        this.setDocumentCacheItem(uri, documentCacheItem);

        if (this.isSourceDocument(uri)) {
            let programCacheItem: ProgramCacheItem = {
                uri: uri,
                isValid: false,
                program: null
            };

            this.setProgramCacheItem(uri, programCacheItem);
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

    private validateProgramCache(stopAtUri?: string) {
        console.log("Validating AST Cache...");
        let start: number = new Date().getTime();
        this.documentsParsed = 0;
        let done: boolean = false;

        if (this.sourceOrder) {
            let scope: Scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                let uri: string = this.sourceOrder[i];
                
                console.log(`   Validating ${path.win32.basename(uri)}`);
                var program: Program = this.validateProgram(uri, scope);

                if (program) {
                    scope = program.scope;
                }

                if (uri === stopAtUri) {
                    done = true;
                    break;
                }
            }
        }

        if (!done) {
            for (let uri in this.programs) {
                this.validateProgram(uri);

                if (uri === stopAtUri) {
                    return;
                }
            }
        }

        let elapsed: number = new Date().getTime() - start;
        console.log(`Parsed ${this.documentsParsed} documents in ${elapsed} milliseconds`);
    };

    private validateProgram(uri: string, scope?: Scope): Program {
        let programCacheItem: ProgramCacheItem = this.getProgramCacheItem(uri);

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
        this.setProgramCacheItem(uri, programCacheItem);

        this.documentsParsed += 1;

        return program;
    };

    private invalidateProgramCache(): void {
        for (let uri in this.programs) {
            this.invalidateProgram(uri, false);
        }
    };

    private invalidateProgram(uri: string, invalidateDownstream = true): void {
        let programCacheItem: ProgramCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return;
        }

        let program: Program = programCacheItem.program;
        
        if (!program) {
            return;
        }

        programCacheItem.isValid = false;
        this.setProgramCacheItem(uri, programCacheItem);

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
                return self.workspacePath(sourceDoc);
            });
    }

    private workspacePath(relativePath: string) {
        return path.join(this.workspaceRoot, relativePath);
    }

    private getProgramCacheItem(uri: string): ProgramCacheItem {
        return this.programs[uri.toLowerCase()];
    }

    private setProgramCacheItem(uri: string, cacheItem: ProgramCacheItem): void {
        this.programs[uri.toLowerCase()] = cacheItem;
    }

    private getDocumentCacheItem(uri: string): DocumentCacheItem {
        return this.documents[uri.toLowerCase()];
    }

    private setDocumentCacheItem(uri: string, cacheItem: DocumentCacheItem): void {
        this.documents[uri.toLowerCase()] = cacheItem;
    }

    private fromVSCodeUri(uri: string): string {
        uri = uri.replace(/file:[\\/]+/, "");
        let osType: string = os.type();

        if (osType === "Windows_NT") {
            uri = uri.replace("%3A", ":");
        }
        else {
            uri = path.posix.sep + uri;
        }

        return path.normalize(uri);
    }

    private toVSCodeUri(uri: string): string {
        uri = uri.replace(/\\/g, path.posix.sep);
        let osType = os.type();

        if (osType === "Windows_NT") {
            return "file:" + path.posix.sep + uri;
        }

        return "file:" + path.posix.sep + path.posix.sep + uri;
    }
}
