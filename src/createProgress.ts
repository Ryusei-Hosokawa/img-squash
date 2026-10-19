import { formatProgressLine } from './formatProgressLine';

export type Progress = {
    /** 完了数と、いま処理しているファイルの表示名を更新する。 */
    update: (done: number, current: string) => void;
    /** 表示を消して、タイマーを止める。 */
    stop: () => void;
};

const FRAME_INTERVAL_MS: number = 80;
const DEFAULT_COLUMNS: number = 80;
const CLEAR_LINE: string = '\r\u001B[2K';

const NOOP: Progress = { update: () => {}, stop: () => {} };

/**
 * 端末の1行を上書きして、スピナー・進捗バー・経過時間を出す。標準エラー出力に書くので、結果の出力は汚れない。
 * enabled が false なら何も表示しない（出力をパイプやファイルに渡すときなど）。
 */
export function createProgress(enabled: boolean, total: number): Progress {
    if (!enabled) {
        return NOOP;
    }

    const startedAt: number = Date.now();
    let frame: number = 0;
    let done: number = 0;
    let current: string = '';

    const render = (): void => {
        const line: string = formatProgressLine({
            frame,
            done,
            total,
            elapsedMs: Date.now() - startedAt,
            current,
            columns: process.stderr.columns ?? DEFAULT_COLUMNS,
        });
        process.stderr.write(`${CLEAR_LINE}${line}`);
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
            process.stderr.write(CLEAR_LINE);
        },
    };
}
