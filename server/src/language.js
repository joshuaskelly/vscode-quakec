/**
 * @file Common classes for working with language source documents
 * @author Joshua Skelton
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const parser = require("../../parser/quakec-parser");
const { TextDocument } = require('vscode-languageserver');

/* Class for working with source documents. */
module.exports.SourceDocumentManager = class SourceDocumentManager {
    /**
     * Create a SourceDocumentManager
     * @param {string} workspaceRoot - A path to the workspace root directory.
     */
    constructor(root) {
        this.workspaceRoot = root;
        this.documents = {};
        this.programs = {};
        this.sourceOrder = [];
        this.documentsParsed = 0;
        this.language = "qcc";
        this.loadDocuments();
    }

    /**
     * Gets the source document for a given uri
     * @param uri - Document uri
     */
    getDocument(uri) {
        let documentCacheItem = this.getDocumentCacheItem(uri);

        if (!documentCacheItem) {
            return null;
        };

        return documentCacheItem.document;
    }

    /**
     * Update document
     * @param document - Text document to update
     */
    updateDocument(document) {
        let uri = this.fromVSCodeUri(document.uri);
        let documentCacheItem = this.getDocumentCacheItem(uri);

        // Update if not currently tracked or newer version
        if (!documentCacheItem || documentCacheItem.version < document.version) {

            documentCacheItem = {
                version: document.version,
                document: document
            };

            this.setDocumentCacheItem(uri, documentCacheItem);
            this.invalidateProgram(uri);
            this.validateProgramCache();
        }
    }

    getHover(request) {
        let program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return { contents: "" };
        }

        let type = program.getTypeString(request.position);

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

    getDefinition(request) {
        let program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return null;
        }

        let location = program.getDefinition(request.position);

        if (!location) {
            return null;
        }

        location.uri = this.toVSCodeUri(location.uri);

        return location;
    }

    getReferences(request) {
        this.validateProgramCache();
        let program = this.getProgram(request.textDocument.uri);

        if (!program) {
            return [];
        }

        let locations = program.getReferences(request.position, request.context.includeDeclaration);

        for (let location of locations) {
            location.uri = this.toVSCodeUri(location.uri);
        }

        return locations;
    }

    getDiagnostics(request) {
        let program = this.getProgram(request.uri);

        if (!program) {
            return [];
        }

        let diagnostics = [];
        let errors = program.getErrors();

        for (let error of errors) {
            let diagnostic = {
                range: error.range,
                severity: error.severity,
                message: error.message
            };

            diagnostics.push(diagnostic);
        }

        return diagnostics;
    }

    getDiagnosticsAll() {
        let publishDiagnosticsParams = [];
        for (let uri in this.documents) {
            let document = this.getDocument(uri);

            if (document == null) {
                continue;
            }

            let diagnostics = this.getDiagnostics(document);
            publishDiagnosticsParams.push(
                {
                    uri: this.toVSCodeUri(uri),
                    diagnostics: diagnostics
                }
            );
        }

        return publishDiagnosticsParams;
    }

    setLanguage(language) {
        if (this.language !== language) {
            this.language = language || "qcc";
            this.invalidateProgramCache();
            this.validateProgramCache();
        }
    }

    getProgram(uri) {
        uri = this.fromVSCodeUri(uri);
        let programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return null;
        }

        if (!programCacheItem.isValid) {
            this.validateProgram(uri, null);
        }

        return programCacheItem.program;
    }

    /**
     * Load documents from workspace.
     */
    loadDocuments() {
        this.documents = {};

        let walk = function(dir) {
            let results = [];
            let files = fs.readdirSync(dir);

            for (let file of files) {
                let uri = path.join(dir, file);
                let stat = fs.statSync(uri);

                if (stat.isDirectory()) {
                    results = results.concat(walk(uri));
                }
                else {
                    results.push(uri);
                }
            }

            return results;
        }

        let uris = [];

        if (this.workspaceRoot) {
            uris = walk(this.fromVSCodeUri(this.workspaceRoot));
        }

        for (let uri of uris) {
            if (!this.isSourceDocument(uri) && !this.isProjectDocument(uri)) {
                continue;
            }

            let document = this.loadDocument(uri);

            if (!document) {
                return;
            }

            if (this.isProjectDocument(uri)) {
                this.buildSourceOrder(document);
            }
        }

        this.validateProgramCache();
    }

    loadDocument(uri) {
        let document = this.readDocument(uri);

        if (!document) {
            return null;
        }

        let documentCacheItem = {
            version: document.version,
            document: document
        };
        this.setDocumentCacheItem(uri, documentCacheItem);

        if (this.isSourceDocument(uri)) {
            let programCacheItem = {
                uri: uri,
                isValid: false,
                program: null
            };

            this.setProgramCacheItem(uri, programCacheItem);
        }

        return document;
    }

    isSourceDocument(uri) {
        return path.extname(uri) === ".qc";
    }

    isProjectDocument(uri) {
        return path.win32.basename(uri) === "progs.src";
    }

    readDocument(uri) {
        if (!fs.existsSync(uri)) {
            return null;
        }

        let content = fs.readFileSync(uri, "utf8");

        let langId = "quakec";
        if (!this.isSourceDocument(uri)) {
            langId = "plaintext";
        }

        return TextDocument.create(uri, langId, 1, content);
    }

    validateProgramCache(stopAtUri) {
        console.log("Validating AST Cache...");
        let start = new Date().getTime();
        this.documentsParsed = 0;
        let done = false;

        if (this.sourceOrder) {
            let scope = null;

            for (let i = 0; i < this.sourceOrder.length; i++) {
                let uri = this.sourceOrder[i];

                console.log(`   Validating ${path.win32.basename(uri)}`);
                var program = this.validateProgram(uri, scope);

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
                this.validateProgram(uri, null);

                if (uri === stopAtUri) {
                    return;
                }
            }
        }

        let elapsed = new Date().getTime() - start;
        console.log(`Parsed ${this.documentsParsed} documents in ${elapsed} milliseconds`);
    };

    validateProgram(uri, scope) {
        let programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return null;
        }

        if (programCacheItem.isValid) {
            return programCacheItem.program;
        }

        if (programCacheItem && programCacheItem.program && programCacheItem.program.scope) {
            scope = scope || programCacheItem.program.scope.parent;
        }

        let document = this.getDocument(uri);

        if (!document) {
            return null;
        }

        let parseInfo = {
            program: document.getText(),
            uri: uri,
            parentScope: scope,
            language: this.language
        };
        let program = parser.parse(parseInfo);
        programCacheItem = {
            uri: uri,
            isValid: true,
            program: program
        };
        this.setProgramCacheItem(uri, programCacheItem);

        this.documentsParsed += 1;

        return program;
    };

    invalidateProgramCache() {
        for (let uri in this.programs) {
            this.invalidateProgram(uri, false);
        }
    };

    invalidateProgram(uri, invalidateDownstream = true) {
        let programCacheItem = this.getProgramCacheItem(uri);

        if (!programCacheItem) {
            return;
        }

        let program = programCacheItem.program;

        if (!program) {
            return;
        }

        programCacheItem.isValid = false;
        this.setProgramCacheItem(uri, programCacheItem);

        // Remove references
        program.invalidate();

        if (invalidateDownstream && this.sourceOrder.includes(uri)) {
            for (var i = this.sourceOrder.indexOf(uri); i < this.sourceOrder.length; i++) {
                let uri = this.sourceOrder[i];
                this.invalidateProgram(uri, false);
            }
        }
    }

    buildSourceOrder(progsSrcDocument) {
        let text = progsSrcDocument.getText();
        text = text.replace(/\/\/.*/g, "");
        this.sourceOrder = text.split(/\s+/).filter(sourceDoc => sourceDoc);
        this.sourceOrder.shift();

        this.sourceOrder = this.sourceOrder.map(
            function(sourceDoc) {
                return path.join(path.dirname(progsSrcDocument.uri), sourceDoc);
            });
    }

    getProgramCacheItem(uri) {
        return this.programs[uri.toLowerCase()];
    }

    setProgramCacheItem(uri, cacheItem) {
        this.programs[uri.toLowerCase()] = cacheItem;
    }

    getDocumentCacheItem(uri) {
        return this.documents[uri.toLowerCase()];
    }

    setDocumentCacheItem(uri, cacheItem) {
        this.documents[uri.toLowerCase()] = cacheItem;
    }

    fromVSCodeUri(uri) {
        uri = uri.replace(/file:[\\/]+/, "");
        let osType = os.type();

        if (osType === "Windows_NT") {
            uri = uri.replace("%3A", ":");
        }
        else {
            uri = path.posix.sep + uri;
        }

        return path.normalize(uri);
    }

    toVSCodeUri(uri) {
        uri = uri.replace(/\\/g, path.posix.sep);
        let osType = os.type();

        if (osType === "Windows_NT") {
            return "file:" + path.posix.sep + uri;
        }

        return "file:" + path.posix.sep + path.posix.sep + uri;
    }
}
