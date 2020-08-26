/**
 * @file Common classes for working with language source documents
 * @author Joshua Skelton
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const parser = require("../../parser/quakec-parser");
const { TextDocument } = require('vscode-languageserver-textdocument');

/** @typedef {import('vscode-languageserver').Diagnostic} Diagnostic*/
/** @typedef {import('vscode-languageserver').Hover} Hover*/
/** @typedef {import('vscode-languageserver').Location} Location*/
/** @typedef {import('vscode-languageserver').PublishDiagnosticsParams} PublishDiagnosticsParams*/
/** @typedef {import('vscode-languageserver').ReferenceParams} ReferenceParams*/
/** @typedef {import('vscode-languageserver').TextDocumentPositionParams} TextDocumentPositionParams*/
/** @typedef {import('../../parser/quakec-parser').Program} Program */
/** @typedef {import('../../parser/quakec-parser').Scope} Scope */

class DocumentCacheItem {
    /**
     * @param {number} version Document version.
     * @param {TextDocument} document TextDocument
     */
    constructor(version, document) {
        /** @type {number} */
        this.version = version || -1;

        /** @type {TextDocument} */
        this.document = document || null;
    }
}

class ProgramCacheItem {
    /**
     * @param {string} uri Document uri string.
     * @param {boolean} isValid Is given Program object valid?
     * @param {Program} program A Program object.
     */
    constructor(uri, isValid, program) {
        /** @type {string} */
        this.uri = uri || "";

        /** @type {boolean} */
        this.isValid = isValid || false;

        /** @type {Program | null} */
        this.program = program || null;
    }
}

 /** @class SourceDocumentManager */
 module.exports.SourceDocumentManager = class SourceDocumentManager {
    constructor(root) {
        /**
         * Path to the workspace root directory.
         * @type {string}
         *  */
        this.workspaceRoot = root;

        /**
         * Document cache.
         *
         * @type Object.<string, DocumentCacheItem>
         */
        this.documents = {};

        /**
         * Program cache.
         *
         * @type {Object.<string, ProgramCacheItem>}
         */
        this.programs = {};

        /**
         * The order to process source documents.
         *
         * @type {string[]}
         */
        this.sourceOrder = [];
        this.documentsParsed = 0;
        this.language = "qcc";
        this.loadDocuments();
    }

    /**
     * Gets the source document for a given uri
     *
     * @param {string} uri Document uri string.
     * @return {TextDocument} TextDocument object.
     */
    getDocument(uri) {
        const documentCacheItem = this.getDocumentCacheItem(uri);

        if (!documentCacheItem) {
            return null;
        }

        return documentCacheItem.document;
    }

    /**
     * Update document
     *
     * @param {TextDocument} document TextDocument to update.
     */
    updateDocument(document) {
        const uri = this.fromVSCodeUri(document.uri);
        let documentCacheItem = this.getDocumentCacheItem(uri);

        // Update if not currently tracked or newer version
        if (!documentCacheItem || documentCacheItem.version < document.version) {
            documentCacheItem = new DocumentCacheItem(document.version, document);

            this.setDocumentCacheItem(uri, documentCacheItem);
            this.invalidateProgram(uri);
            this.validateProgramCache();
        }
    }

    /**
     * Hover request handler.
     *
     * @param {TextDocumentPositionParams} request A Hover request.
     * @return {Hover} A Hover object
     */
    getHover(request) {
        const program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return { contents: "" };
        }

        const type = program.getTypeString(request.position);

        if (!type) {
            return { contents: "" };
        }

        return {
            contents: {
                language: "quakec",
                value: type
            }
        };
    }

    /**
     * Definition request handler.
     *
     * @param {TextDocumentPositionParams} request A definition request.
     * @return {Location} A Location object.
     */
    getDefinition(request) {
        const program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return null;
        }

        const location = program.getDefinition(request.position);

        if (!location) {
            return null;
        }

        if (!location) {
            return null;
        }

        location.uri = this.toVSCodeUri(location.uri);

        return location;
    }

    /**
     * Reference request hander.
     *
     * @param {ReferenceParams} request A reference request.
     * @return {Location} A Location object.
     */
    getReferences(request) {
        this.validateProgramCache();
        const program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return [];
        }

        const locations = program.getReferences(request.position, request.context.includeDeclaration);

        for (const location of locations) {
            location.uri = this.toVSCodeUri(location.uri);
        }

        return locations;
    }

    /**
     * Get diagnostics for the given document.
     *
     * @param {TextDocument} document TextDocument to get diagnostics for.
     * @return {Diagnostic[]} A Diagnostic object.
     */
    getDiagnostics(document) {
        const program = this.getProgram(document.uri);

        if (!program) {
            return [];
        }

        const diagnostics = [];
        const errors = program.getErrors();

        for (const error of errors) {
            const diagnostic = {
                range: error.range,
                severity: error.severity,
                message: error.message
            };

            diagnostics.push(diagnostic);
        }

        return diagnostics;
    }

    /**
     * Get diagnostics for all documents in the workspace.
     *
     * @return {PublishDiagnosticsParams[]} An array of PublishDiagnosticsParams objects.
     */
    getDiagnosticsAll() {
        /** @type {PublishDiagnosticsParams[]} */
        const publishDiagnosticsParams = [];
        for (const uri in this.documents) {
            const document = this.getDocument(uri);

            if (document == null) {
                continue;
            }

            const diagnostics = this.getDiagnostics(document);
            publishDiagnosticsParams.push(
                {
                    uri: this.toVSCodeUri(uri),
                    diagnostics: diagnostics
                }
            );
        }

        return publishDiagnosticsParams;
    }

    /**
     * Set language.
     *
     * @param {string} language
     */
    setLanguage(language) {
        if (this.language !== language) {
            this.language = language;
            this.invalidateProgramCache();
            this.validateProgramCache();
        }
    }

    /**
     * Get a Program for the given uri.
     *
     * @param {string} uri Document uri string.
     * @return {Program} A Program object.
     */
    getProgram(uri) {
        uri = this.fromVSCodeUri(uri);
        const programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return null;
        }

        if (!programCacheItem.isValid) {
            this.validateProgram(uri, null);
        }

        return programCacheItem.program;
    }

    /**
     * Load all source documents in workspace.
     */
    loadDocuments() {
        this.documents = {};

        /**
         * Helper function to walk a given directory.
         *
         * @param {string} dir
         * @return {string[]} An array of uri strings.
         */
        const walk = function(dir) {
            let results = [];
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const uri = path.join(dir, file);
                const stat = fs.statSync(uri);

                if (stat.isDirectory()) {
                    results = results.concat(walk(uri));
                }
                else {
                    results.push(uri);
                }
            }

            return results;
        };

        /** @type {string[]} */
        let uris = [];

        if (this.workspaceRoot) {
            uris = walk(this.fromVSCodeUri(this.workspaceRoot));
        }

        for (const uri of uris) {
            if (!this.isSourceDocument(uri) && !this.isProjectDocument(uri)) {
                continue;
            }

            const document = this.loadDocument(uri);

            if (!document) {
                return;
            }

            if (this.isProjectDocument(uri)) {
                this.buildSourceOrder(document);
            }
        }

        this.validateProgramCache();
    }

    /**
     * Create a TextDocument object from the given uri and update the document
     * cache.
     *
     * @param {string} uri Document uri string.
     * @return {TextDocument} A TextDocument object.
     */
    loadDocument(uri) {
        const document = this.readDocument(uri);

        if (!document) {
            return null;
        }

        const documentCacheItem = new DocumentCacheItem(document.version, document);
        this.setDocumentCacheItem(uri, documentCacheItem);

        if (this.isSourceDocument(uri)) {
            const programCacheItem = new ProgramCacheItem(uri, false, null);
            this.setProgramCacheItem(uri, programCacheItem);
        }

        return document;
    }

    /**
     * Is the given uri is a Quake C source document?
     *
     * @param {string} uri Document uri string.
     * @return {boolean} True if given uri a Quake C source document.
     */
    isSourceDocument(uri) {
        return path.extname(uri) === ".qc";
    }

    /**
     * Is the given uri a Quake C source ordering?
     *
     * @param {string} uri Document uri string.
     * @return {boolean} True if the given uri a Quake C source ordering.
     */
    isProjectDocument(uri) {
        return path.win32.basename(uri) === "progs.src";
    }

    /**
     * Create a TextDocument object from a given uri.
     *
     * @param {string} uri Document uri string.
     * @return {TextDocument} A TextDocument object.
     */
    readDocument(uri) {
        if (!fs.existsSync(uri)) {
            return null;
        }

        const content = fs.readFileSync(uri, "utf8");

        let langId = "quakec";
        if (!this.isSourceDocument(uri)) {
            langId = "plaintext";
        }

        return TextDocument.create(uri, langId, 1, content);
    }

    /**
     * Validate all Programs.
     *
     * @param {string?} stopAtUri An optional uri to stop validating programs.
     */
    validateProgramCache(stopAtUri) {
        console.log("Validating AST Cache...");
        const start = new Date().getTime();
        this.documentsParsed = 0;
        let done = false;

        if (this.sourceOrder) {
            let scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                const uri = this.sourceOrder[i];

                console.log(`   Validating ${path.win32.basename(uri)}`);
                const program = this.validateProgram(uri, scope);

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
            for (const uri in this.programs) {
                this.validateProgram(uri, null);

                if (uri === stopAtUri) {
                    return;
                }
            }
        }

        const elapsed = new Date().getTime() - start;
        console.log(`Parsed ${this.documentsParsed} documents in ${elapsed} milliseconds`);
    }

    /**
     * Validate the given document and return a Program object.
     * @param {string} uri Document uri string.
     * @param {Scope} parentScope Parent Scope object.
     * @return {Program} A Program object.
     */
    validateProgram(uri, parentScope) {
        let programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return null;
        }

        if (programCacheItem.isValid) {
            return programCacheItem.program;
        }

        if (programCacheItem && programCacheItem.program && programCacheItem.program.scope) {
            parentScope = parentScope || programCacheItem.program.scope.parent;
        }

        const document = this.getDocument(uri);

        if (!document) {
            return null;
        }

        // Parse the document
        const parseInfo = {
            program: document.getText(),
            uri: uri,
            parentScope: parentScope,
            language: this.language
        };
        const program = parser.parse(parseInfo);

        programCacheItem = new ProgramCacheItem(uri, true, program);
        this.setProgramCacheItem(uri, programCacheItem);

        this.documentsParsed += 1;

        return program;
    }

    /**
     * Invalidate all Program objects.
     */
    invalidateProgramCache() {
        for (const uri in this.programs) {
            this.invalidateProgram(uri, false);
        }
    }

    /**
     * Invalidate a given document.
     *
     * @param {string} uri Document uri string.
     * @param {boolean} invalidateDownstream Invalidate all downstream programs?
     */
    invalidateProgram(uri, invalidateDownstream = true) {
        const programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return;
        }

        const program = programCacheItem.program;

        if (!program) {
            return;
        }

        programCacheItem.isValid = false;
        this.setProgramCacheItem(uri, programCacheItem);

        // Remove references
        program.invalidate();

        if (invalidateDownstream && this.sourceOrder.includes(uri)) {
            for (let i = this.sourceOrder.indexOf(uri); i < this.sourceOrder.length; i++) {
                const uri = this.sourceOrder[i];
                this.invalidateProgram(uri, false);
            }
        }
    }

    /**
     * Create a source ordering for the given progs.src document.
     *
     * @param {TextDocument} progsSrcDocument
     */
    buildSourceOrder(progsSrcDocument) {
        if (!this.isProjectDocument(progsSrcDocument.uri)) {
            return;
        }

        let text = progsSrcDocument.getText();
        text = text.replace(/\/\/.*/g, "");
        this.sourceOrder = text.split(/\s+/).filter(sourceDoc => sourceDoc);
        this.sourceOrder.shift();

        this.sourceOrder = this.sourceOrder.map(
            function(sourceDoc) {
                return path.join(path.dirname(progsSrcDocument.uri), sourceDoc);
            });
    }

    /**
     * Get a ProgramCacheItem for the given document uri.
     *
     * @param {string} uri Document uri string.
     * @return {ProgramCacheItem} A ProgramCacheItem object.
     */
    getProgramCacheItem(uri) {
        return this.programs[uri.toLowerCase()];
    }

    /**
     * Set ProgramCacheItem for given uri string.
     *
     * @param {string} uri Document uri string.
     * @param {ProgramCacheItem} cacheItem ProgramCacheItem to set.
     */
    setProgramCacheItem(uri, cacheItem) {
        this.programs[uri.toLowerCase()] = cacheItem;
    }

    /**
     * Get DocumentCacheItem for given document uri.
     *
     * @param {string} uri Document uri string.
     * @return {DocumentCacheItem} DocumentCacheItem for given uri.
     */
    getDocumentCacheItem(uri) {
        return this.documents[uri.toLowerCase()];
    }

    /**
     * Set the DocumentCacheItem for given document uri.
     *
     * @param {string} uri Document uri string.
     * @param {DocumentCacheItem} cacheItem DocumentCacheItem to set for given uri.
     */
    setDocumentCacheItem(uri, cacheItem) {
        this.documents[uri.toLowerCase()] = cacheItem;
    }

    /**
     * Normalize VS Code uri strings.
     *
     * @param {string} uri Document uri string.
     * @return {string} Normalized uri string.
     */
    fromVSCodeUri(uri) {
        uri = uri.replace(/file:[\\/]+/, "");
        const osType = os.type();

        if (osType === "Windows_NT") {
            uri = uri.replace("%3A", ":");
        }
        else {
            uri = path.posix.sep + uri;
        }

        return path.normalize(uri);
    }

    /**
     * Convert normalized string to the format VS Code expects.
     * @param {string} uri Document string uri.
     * @return {string} VS Code specific uri string.
     */
    toVSCodeUri(uri) {
        uri = uri.replace(/\\/g, path.posix.sep);
        const osType = os.type();

        if (osType === "Windows_NT") {
            return "file:" + path.posix.sep + uri;
        }

        return "file:" + path.posix.sep + path.posix.sep + uri;
    }
};
