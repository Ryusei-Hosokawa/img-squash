import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';

export type Options = {
    root: string;
    apply: boolean;
    excludes: string[];
    verbose: boolean;
    /** cwebp の圧縮レベル（0〜9）。大きいほど小さくなるが、遅くなる。 */
    level: number;
    /** 同時に変換する数。 */
    jobs: number;
};

export type ParseResult = { ok: true; options: Options } | { ok: false; message: string };

const EXCLUDE_FLAGS: readonly string[] = ['--exclude'];
const LEVEL_FLAGS: readonly string[] = ['--level'];
const JOBS_FLAGS: readonly string[] = ['--jobs', '-j'];

/** 対象ディレクトリを省略したときは、カレントディレクトリ配下を対象にする。 */
const DEFAULT_ROOT: string = '.';
/** 既定の圧縮レベル。7 は 6 より約2%小さく、時間はほぼ同じ。9 は最も小さいが約15倍遅く、7 との容量の差は約7%。 */
const DEFAULT_LEVEL: number = 7;
const MIN_LEVEL: number = 0;
const MAX_LEVEL: number = 9;
const MAX_DEFAULT_JOBS: number = 8;

/** 0 以上の整数だけを受け付ける。 */
const parseInteger = (text: string): number | null => (/^\d+$/.test(text) ? Number(text) : null);

type OptionValue = { value: string | undefined; skip: number };

/** `--name value` と `--name=value`（短い名前は `-j 4` のみ）の両方を読む。該当しなければ null。 */
function readOption(argv: readonly string[], index: number, names: readonly string[]): OptionValue | null {
    const arg: string = argv[index] ?? '';

    for (const name of names) {
        if (arg === name) {
            return { value: argv[index + 1], skip: 1 };
        }
        if (name.startsWith('--') && arg.startsWith(`${name}=`)) {
            return { value: arg.slice(name.length + 1), skip: 0 };
        }
    }

    return null;
}

/** 読み取れない引数があるときは、理由を添えて ok: false を返す。 */
export function parseArgs(argv: readonly string[]): ParseResult {
    const excludes: string[] = [];
    const positionals: string[] = [];
    let apply: boolean = false;
    let verbose: boolean = false;
    let level: number = DEFAULT_LEVEL;
    let jobs: number = Math.min(availableParallelism(), MAX_DEFAULT_JOBS);

    for (let i: number = 0; i < argv.length; i++) {
        const arg: string = argv[i] ?? '';

        const exclude: OptionValue | null = readOption(argv, i, EXCLUDE_FLAGS);
        const levelOption: OptionValue | null = readOption(argv, i, LEVEL_FLAGS);
        const jobsOption: OptionValue | null = readOption(argv, i, JOBS_FLAGS);

        if (arg === '--apply') {
            apply = true;
        } else if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        } else if (exclude !== null) {
            if (exclude.value === undefined) {
                return { ok: false, message: '--exclude にはディレクトリを指定してください' };
            }
            excludes.push(resolve(exclude.value));
            i += exclude.skip;
        } else if (levelOption !== null) {
            const parsed: number | null = parseInteger(levelOption.value ?? '');
            if (parsed === null || parsed < MIN_LEVEL || parsed > MAX_LEVEL) {
                return { ok: false, message: `--level には ${MIN_LEVEL}〜${MAX_LEVEL} の整数を指定してください` };
            }
            level = parsed;
            i += levelOption.skip;
        } else if (jobsOption !== null) {
            const parsed: number | null = parseInteger(jobsOption.value ?? '');
            if (parsed === null || parsed < 1) {
                return { ok: false, message: '--jobs には 1 以上の整数を指定してください' };
            }
            jobs = parsed;
            i += jobsOption.skip;
        } else if (!arg.startsWith('-')) {
            positionals.push(arg);
        }
    }

    return {
        ok: true,
        options: { root: resolve(positionals[0] ?? DEFAULT_ROOT), apply, excludes, verbose, level, jobs },
    };
}
