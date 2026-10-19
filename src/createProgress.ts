import type { Painter } from './createPainter';
import { formatProgressLines, type ProgressLines } from './formatProgressLine';

export type Progress = {
    /** 完了数と、いま処理しているファイルの表示名を更新する。 */
    update: (done: number, current: string) => void;
    /** 表示を消して、タイマーを止める。 */
    stop: () => void;
};

const FRAME_INTERVAL_MS: number = 80;
const DEFAULT_COLUMNS: number = 80;
const CLEAR_LINE: string = '\r\u001B[2K';
const CURSOR_UP: string = '\u001B[1A';

const NOOP: Progress = { update: () => {}, stop: () => {} };

/** 端末の幅。取れない場合や 0 のとき（一部の疑似端末）は既定の幅にする。 */
const terminalColumns = (): number => {
    const columns: number = process.stderr.columns ?? 0;

    return columns > 0 ? columns : DEFAULT_COLUMNS;
};

/**
 * 端末の2行を上書きして、スピナー・進捗バー・枚数・経過時間（1行目）と、処理中のファイル名（2行目）を出す。
 * 標準エラー出力に書くので、結果の出力は汚れない。
 * enabled が false なら何も表示しない（出力をパイプやファイルに渡すときなど）。
 */
export function createProgress(enabled: boolean, total: number, paint: Painter): Progress {
    if (!enabled) {
        return NOOP;
    }

    const startedAt: number = Date.now();
    let frame: number = 0;
    let done: number = 0;
    let current: string = '';
    let drawn: boolean = false;

    const render = (): void => {
        const lines: ProgressLines = formatProgressLines(
            {
                frame,
                done,
                total,
                elapsedMs: Date.now() - startedAt,
                current,
                columns: terminalColumns(),
            },
            paint,
        );
        // 2回目以降は、カーソルを1行目まで戻して上書きする（2行目の末尾にカーソルがある）
        const back: string = drawn ? CURSOR_UP : '';
        process.stderr.write(`${back}${CLEAR_LINE}${lines.status}\n${CLEAR_LINE}${lines.name}`);
        drawn = true;
        frame++;
    };

    render();
    const timer = setInterval(render, FRAME_INTERVAL_MS);

    return {
        update: (nextDone: number, nextCurrent: string): void => {
            done = nextDone;
            current = nextCurrent;
        },
        stop: (): void => {
            clearInterval(timer);
            // 2行目を消し、1行目に戻って消す。カーソルは1行目の先頭に残る
            process.stderr.write(`${CLEAR_LINE}${CURSOR_UP}${CLEAR_LINE}`);
        },
    };
}
