export type Painter = {
    bold: (text: string) => string;
    dim: (text: string) => string;
    green: (text: string) => string;
    yellow: (text: string) => string;
    red: (text: string) => string;
    cyan: (text: string) => string;
};

const RESET: string = '\u001B[0m';

const wrap =
    (code: string, enabled: boolean) =>
    (text: string): string =>
        enabled ? `\u001B[${code}m${text}${RESET}` : text;

/** enabled が false なら、文字を一切装飾しない。 */
export function createPainter(enabled: boolean): Painter {
    return {
        bold: wrap('1', enabled),
        dim: wrap('2', enabled),
        green: wrap('32', enabled),
        yellow: wrap('33', enabled),
        red: wrap('31', enabled),
        cyan: wrap('36', enabled),
    };
}
