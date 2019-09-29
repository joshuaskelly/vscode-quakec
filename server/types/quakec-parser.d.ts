declare module "quakec-parser" {
    export type ParseInfo = {
        program: string,
        uri: string,
        parentScope?: any,
        language: string
    };

    export type Position = {
        line: number,
        character: number
    };

    export type Range = {
        start: Position,
        end: Position
    };

    export type Location = {
        uri: string,
        range: Range
    };

    export type Symbol = {
        value: string,
        range: Range
    };

    export type Scope = {
        uri: string,
        find: (input: string) => Symbol,
        parent: Scope
    };

    export type Error = {
        range: Range,
        severity: number,
        message: string
    };

    export type Program = {
        uri: string,
        ast: any,
        scope: Scope,
        getDefinition: (position: Position) => Location,
        getTypeString: (position: Position) => string,
        getReferences: (position: Position, includeDeclaration: boolean) => Location[],
        getErrors: () => Error[],
        invalidate: () => null
    };

    export function parse(input:ParseInfo): Program;
}