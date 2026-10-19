import { resolve } from 'node:path';

export type Options = {
    root: string;
    apply: boolean;
    excludes: string[];
};

const EXCLUDE_FLAG: string = '--exclude';
const EXCLUDE_PREFIX: string = `${EXCLUDE_FLAG}=`;

/** 対象ディレクトリが無ければ null を返す。 */
export function parseArgs(argv: readonly string[]): Options | null {
    const excludes: string[] = [];
    const positionals: string[] = [];
    let apply: boolean = false;

    for (let i: number = 0; i < argv.length; i++) {
        const arg: string = argv[i] ?? '';

        if (arg === '--apply') {
            apply = true;
        } else if (arg === EXCLUDE_FLAG) {
            const value: string | undefined = argv[i + 1];
            if (value === undefined) {
                return null;
            }
            excludes.push(resolve(value));
            i++;
        } else if (arg.startsWith(EXCLUDE_PREFIX)) {
            excludes.push(resolve(arg.slice(EXCLUDE_PREFIX.length)));
        } else if (!arg.startsWith('--')) {
            positionals.push(arg);
        }
    }

    const root: string | undefined = positionals[0];
    if (root === undefined) {
        return null;
    }

    return { root: resolve(root), apply, excludes };
}
