declare module "quakec-parser" {
    export type ParseInfo = {
        program: string,
        uri: string,
        parentScope?: any
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
        find: (input: string) => Symbol;
    };

    export type Program = {
        uri: string,
        ast: any,
        scope: Scope,
        getDefinition: (position: Position) => Location
    };

    export function parse(input:ParseInfo): Program;
}