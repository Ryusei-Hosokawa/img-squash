import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { convertToWebp } from './convertToWebp';
import { createPainter, type Painter } from './createPainter';
import { findMarkdownRoot } from './findMarkdownRoot';
import { formatApplied, formatReport } from './formatReport';
import { formatBytes } from './formatBytes';
import { nfc } from './nfc';
import { parseArgs, type Options } from './parseArgs';
import { rewriteMarkdownLinks } from './rewriteMarkdownLinks';
import { walkFiles } from './walkFiles';

type Converted = { png: string; webp: string; before: number; after: number };
type Skipped = { png: string; reason: string };
type MarkdownRewrite = { md: string; text: string; count: number };

const EXIT_USAGE: number = 2;

const toWebpPath = (png: string): string => png.replace(/\.png$/i, '.webp');

function commandExists(command: string): boolean {
    return Bun.spawnSync(['which', command]).exitCode === 0;
}

function fail(message: string): never {
    console.error(message);
    process.exit(EXIT_USAGE);
}

/** PNG を可逆 WebP に変換し、変換後のほうが小さいものだけを採用する。apply なら WebP を書き出す。 */
function convertAll(pngs: readonly string[], apply: boolean): { converted: Converted[]; skipped: Skipped[] } {
    const work: string = mkdtempSync(join(tmpdir(), 'img-squash-'));
    const converted: Converted[] = [];
    const skipped: Skipped[] = [];
    const taken: Set<string> = new Set();

    try {
        pngs.forEach((png: string, index: number) => {
            const webp: string = toWebpPath(png);
            if (existsSync(webp) || taken.has(nfc(webp))) {
                skipped.push({ png, reason: '同名の .webp が既にある' });
                return;
            }

            const tmp: string = join(work, `${index}.webp`);
            if (!convertToWebp(png, tmp)) {
                skipped.push({ png, reason: 'cwebp での変換に失敗' });
                return;
            }

            const before: number = statSync(png).size;
            const after: number = statSync(tmp).size;
            if (after >= before) {
                skipped.push({ png, reason: `WebP のほうが大きい(${formatBytes(before)} → ${formatBytes(after)})` });
                return;
            }

            taken.add(nfc(webp));
            converted.push({ png, webp, before, after });
            if (apply) {
                copyFileSync(tmp, webp);
            }
        });
    } finally {
        rmSync(work, { recursive: true, force: true });
    }

    return { converted, skipped };
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

export function main(): void {
    const options: Options | null = parseArgs(process.argv.slice(2));
    if (options === null) {
        return fail(
            '使い方: isq [ディレクトリ] [--apply] [--verbose] [--exclude <ディレクトリ>]...（ディレクトリを省略するとカレントディレクトリ）',
        );
    }
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

    const { converted, skipped } = convertAll(pngs, options.apply);
    const rewrites: MarkdownRewrite[] = collectRewrites(findMarkdownRoot(options.root), converted);

    const shortPath = (path: string): string => nfc(relative(options.root, path));
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
    console.log(`${report.join('\n')}`);

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

main();
