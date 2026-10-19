import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { convertAll, type Converted, type Skipped } from './convertAll';
import { createPainter, type Painter } from './createPainter';
import { createProgress, type Progress } from './createProgress';
import { findMarkdownRoot } from './findMarkdownRoot';
import { formatApplied, formatReport } from './formatReport';
import { nfc } from './nfc';
import { parseArgs, type Options, type ParseResult } from './parseArgs';
import { rewriteMarkdownLinks } from './rewriteMarkdownLinks';
import { walkFiles } from './walkFiles';

type MarkdownRewrite = { md: string; text: string; count: number };

const EXIT_USAGE: number = 2;
const USAGE: string =
    '使い方: isq [ディレクトリ] [--apply] [--verbose] [--level <0〜9>] [--jobs <数>] [--exclude <ディレクトリ>]...（ディレクトリを省略するとカレントディレクトリ）';

function commandExists(command: string): boolean {
    return Bun.spawnSync(['which', command]).exitCode === 0;
}

function fail(message: string): never {
    console.error(message);
    process.exit(EXIT_USAGE);
}

function collectRewrites(markdownRoot: string, converted: readonly Converted[]): MarkdownRewrite[] {
    const convertedPngs: Set<string> = new Set(converted.map((c: Converted) => nfc(c.png)));
    const rewrites: MarkdownRewrite[] = [];

    for (const md of walkFiles(markdownRoot, (path: string) => path.endsWith('.md'), [])) {
        const result = rewriteMarkdownLinks(readFileSync(md, 'utf-8'), md, convertedPngs);
        if (result.count > 0) {
            rewrites.push({ md, text: result.text, count: result.count });
        }
    }

    return rewrites;
}

/** 元の PNG をゴミ箱に送る。送れなかったら理由を標準エラー出力に出して false を返す。 */
function trashFile(path: string): boolean {
    const result = Bun.spawnSync(['trash', path]);
    if (result.exitCode !== 0) {
        console.error(`ゴミ箱に送れなかった: ${path}\n${result.stderr.toString()}`);
    }

    return result.exitCode === 0;
}

/** 色を付けるのは、端末に直接表示していて、NO_COLOR が設定されていないときだけ。 */
const shouldColor = (): boolean => process.stdout.isTTY === true && process.env['NO_COLOR'] === undefined;

/** 進捗を出すのは、標準エラー出力が端末に直接つながっているときだけ。 */
const shouldShowProgress = (): boolean => process.stderr.isTTY === true;

/** 進捗の色は、進捗を出す先（標準エラー出力）が端末のときだけ付くので、NO_COLOR が無ければ付ける。 */
const shouldColorProgress = (): boolean => process.env['NO_COLOR'] === undefined;

export async function main(): Promise<void> {
    const parsed: ParseResult = parseArgs(process.argv.slice(2));
    if (!parsed.ok) {
        return fail(`${parsed.message}\n${USAGE}`);
    }
    const options: Options = parsed.options;

    if (!existsSync(options.root) || !statSync(options.root).isDirectory()) {
        return fail(`ディレクトリが無い: ${options.root}`);
    }
    if (!commandExists('cwebp')) {
        return fail('cwebp が見つからない。`brew install webp` で入れる。');
    }
    if (options.apply && !commandExists('trash')) {
        return fail('trash が見つからない。元の PNG をゴミ箱に送れないため中止する。');
    }

    console.log(`対象: ${options.root}`);

    const pngs: string[] = walkFiles(options.root, (path: string) => /\.png$/i.test(path), options.excludes).sort();
    if (pngs.length === 0) {
        console.log('PNG が見つかりませんでした');
        return;
    }

    const shortPath = (path: string): string => nfc(relative(options.root, path));

    const progress: Progress = createProgress(shouldShowProgress(), pngs.length, createPainter(shouldColorProgress()));
    let result: { converted: Converted[]; skipped: Skipped[] };
    try {
        result = await convertAll(pngs, {
            apply: options.apply,
            level: options.level,
            jobs: options.jobs,
            label: shortPath,
            progress,
        });
    } finally {
        progress.stop();
    }
    const { converted, skipped } = result;

    const rewrites: MarkdownRewrite[] = collectRewrites(findMarkdownRoot(options.root), converted);

    const paint: Painter = createPainter(shouldColor());
    const report: string[] = formatReport(
        {
            apply: options.apply,
            verbose: options.verbose,
            totalPngs: pngs.length,
            converted: converted.map((c: Converted) => ({ path: shortPath(c.png), before: c.before, after: c.after })),
            skipped: skipped.map((s: Skipped) => ({ path: shortPath(s.png), reason: s.reason })),
            rewrites: rewrites.map((r: MarkdownRewrite) => ({ path: shortPath(r.md), count: r.count })),
        },
        paint,
    );
    console.log(report.join('\n'));

    if (!options.apply || converted.length === 0) {
        return;
    }

    for (const rewrite of rewrites) {
        writeFileSync(rewrite.md, rewrite.text);
    }
    const trashed: number = converted.filter((c: Converted) => trashFile(c.png)).length;
    console.log(
        formatApplied(
            {
                created: converted.length,
                rewrittenMarkdown: rewrites.length,
                trashed,
                trashFailed: converted.length - trashed,
            },
            paint,
        ).join('\n'),
    );
}

await main();
