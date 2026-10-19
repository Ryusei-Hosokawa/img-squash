import type { Painter } from './createPainter';
import { displayWidth, padEndDisplay, padStartDisplay } from './displayWidth';
import { formatBytes } from './formatBytes';

export type ConvertedItem = { path: string; before: number; after: number };
export type SkippedItem = { path: string; reason: string };
export type RewriteItem = { path: string; count: number };

export type Report = {
    apply: boolean;
    verbose: boolean;
    totalPngs: number;
    converted: readonly ConvertedItem[];
    skipped: readonly SkippedItem[];
    rewrites: readonly RewriteItem[];
};

export type Applied = {
    created: number;
    rewrittenMarkdown: number;
    trashed: number;
    trashFailed: number;
};

const INDENT: string = '  ';
const COLUMN_GAP: string = '  ';
const LIST_LIMIT: number = 10;
const PATH_PAD_LIMIT: number = 50;
const RULE_LENGTH: number = 36;
const PERCENT: number = 100;
const RULE: string = '─'.repeat(RULE_LENGTH);

const savedOf = (item: ConvertedItem): number => item.before - item.after;

/** 削減率。例: "-75.5%"。元の容量が 0 のときは "0.0%"。 */
const formatReduction = (before: number, after: number): string =>
    before === 0 ? '0.0%' : `-${(((before - after) / before) * PERCENT).toFixed(1)}%`;

const widest = (texts: readonly string[]): number =>
    texts.reduce((max: number, t: string) => Math.max(max, displayWidth(t)), 0);

/** 一覧を LIST_LIMIT 件までに絞る。verbose なら全件。省いた件数も返す。 */
function limitList<T>(items: readonly T[], verbose: boolean): { shown: readonly T[]; hidden: number } {
    const shown: readonly T[] = verbose ? items : items.slice(0, LIST_LIMIT);

    return { shown, hidden: items.length - shown.length };
}

const hiddenNote = (hidden: number, unit: string): string[] =>
    hidden > 0 ? [`${INDENT}…ほか ${hidden} ${unit}(--verbose で全件表示)`] : [];

type Column = {
    /** 列の手前に置く区切り。 */
    prefix: string;
    paint: (text: string) => string;
};

type Row = {
    path: string;
    /** 色を付ける前の文字。列ごとに、右揃えで表示幅をそろえる。 */
    cells: readonly string[];
};

/**
 * 1行ずつの表にする。パスが PATH_PAD_LIMIT 以内なら「パス → 各列」の順で桁をそろえ、
 * 長いパスが混ざるときは桁が崩れないよう「各列 → パス」の順にする。
 */
function renderRows(rows: readonly Row[], columns: readonly Column[]): string[] {
    const pathWidth: number = widest(rows.map((row: Row) => row.path));
    const pathFirst: boolean = pathWidth <= PATH_PAD_LIMIT;
    const cellWidths: number[] = columns.map((_column: Column, index: number) =>
        widest(rows.map((row: Row) => row.cells[index] ?? '')),
    );

    return rows.map((row: Row) => {
        const cells: string = columns
            .map((column: Column, index: number) => {
                const padded: string = padStartDisplay(row.cells[index] ?? '', cellWidths[index] ?? 0);

                return `${column.prefix}${column.paint(padded)}`;
            })
            .join('');

        return pathFirst
            ? `${INDENT}${padEndDisplay(row.path, pathWidth)}${COLUMN_GAP}${cells}`
            : `${INDENT}${cells}${COLUMN_GAP}${row.path}`;
    });
}

function convertedSection(report: Report, paint: Painter): string[] {
    const title: string = paint.bold(`■ 変換する画像(${report.converted.length}/${report.totalPngs})`);
    const sorted: ConvertedItem[] = [...report.converted].sort((a, b) => savedOf(b) - savedOf(a));
    const { shown, hidden } = limitList(sorted, report.verbose);

    const rows: Row[] = shown.map((item: ConvertedItem) => ({
        path: item.path,
        cells: [formatBytes(item.before), formatBytes(item.after), formatReduction(item.before, item.after)],
    }));
    const columns: Column[] = [
        { prefix: '', paint: (text: string) => text },
        { prefix: ' → ', paint: (text: string) => text },
        { prefix: COLUMN_GAP, paint: paint.green },
    ];

    return [title, ...renderRows(rows, columns), ...hiddenNote(hidden, '枚')];
}

function rewriteSection(report: Report, paint: Painter): string[] {
    if (report.rewrites.length === 0) {
        return [];
    }

    const title: string = paint.bold(`■ リンクを書き換える md(${report.rewrites.length} ファイル)`);
    const sorted: RewriteItem[] = [...report.rewrites].sort((a, b) => a.path.localeCompare(b.path));
    const { shown, hidden } = limitList(sorted, report.verbose);

    const rows: Row[] = shown.map((item: RewriteItem) => ({ path: item.path, cells: [`${item.count} 件`] }));
    const columns: Column[] = [{ prefix: '', paint: (text: string) => text }];

    return ['', title, ...renderRows(rows, columns), ...hiddenNote(hidden, 'ファイル')];
}

function skippedSection(report: Report, paint: Painter): string[] {
    if (report.skipped.length === 0) {
        return [];
    }

    const title: string = paint.yellow(paint.bold(`■ 残す画像(${report.skipped.length}/${report.totalPngs})`));
    const sorted: SkippedItem[] = [...report.skipped].sort((a, b) => a.path.localeCompare(b.path));
    const { shown, hidden } = limitList(sorted, report.verbose);

    const rows: Row[] = shown.map((item: SkippedItem) => ({ path: item.path, cells: [item.reason] }));
    const columns: Column[] = [{ prefix: '', paint: paint.yellow }];

    return ['', title, ...renderRows(rows, columns), ...hiddenNote(hidden, '枚')];
}

function totalLine(report: Report, paint: Painter): string {
    if (report.converted.length === 0) {
        return '合計 変換する画像はありません';
    }

    const before: number = report.converted.reduce((sum: number, i: ConvertedItem) => sum + i.before, 0);
    const after: number = report.converted.reduce((sum: number, i: ConvertedItem) => sum + i.after, 0);
    const reduction: string = `${formatBytes(before - after)} 減(${formatReduction(before, after)})`;

    return `合計 画像 ${report.converted.length} 枚${COLUMN_GAP}${formatBytes(before)} → ${formatBytes(after)}${COLUMN_GAP}${paint.green(reduction)}`;
}

/** ドライラン・適用に共通の報告。「対象:」の行は含まない（実行の最初に別途表示する）。純粋関数。 */
export function formatReport(report: Report, paint: Painter): string[] {
    const mode: string = report.apply ? 'モード: 適用' : 'モード: ドライラン(ファイルは変更しません)';
    const guide: string[] =
        !report.apply && report.converted.length > 0 ? ['', '適用するには --apply を付けて再実行してください'] : [];

    return [
        mode,
        '',
        ...convertedSection(report, paint),
        ...rewriteSection(report, paint),
        ...skippedSection(report, paint),
        '',
        RULE,
        totalLine(report, paint),
        ...guide,
    ];
}

/** 適用したあとの結果。純粋関数。 */
export function formatApplied(applied: Applied, paint: Painter): string[] {
    const failed: string[] =
        applied.trashFailed > 0 ? [paint.red(`${INDENT}ゴミ箱に送れなかった元の PNG: ${applied.trashFailed} 枚`)] : [];

    return [
        '',
        paint.bold('適用しました'),
        `${INDENT}WebP を作成: ${applied.created} 枚`,
        `${INDENT}md を書き換え: ${applied.rewrittenMarkdown} ファイル`,
        `${INDENT}元の PNG をゴミ箱へ: ${applied.trashed} 枚`,
        ...failed,
        '',
        'md のリンク切れが無いか確認してください',
    ];
}
