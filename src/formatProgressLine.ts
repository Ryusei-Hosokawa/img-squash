import type { Painter } from './createPainter';
import { displayWidth } from './displayWidth';
import { truncateStart } from './truncateStart';

export type ProgressState = {
    frame: number;
    done: number;
    total: number;
    elapsedMs: number;
    current: string;
    columns: number;
};

/** 進捗の表示。status は1行目（スピナー・バー・枚数・経過時間）、name は2行目（処理中のファイル名）。 */
export type ProgressLines = { status: string; name: string };

const SPINNER_FRAMES: readonly string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BAR_WIDTH: number = 20;
const FILLED: string = '━';
const HEAD: string = '╸';
const EMPTY: string = '╌';
const MS_PER_SECOND: number = 1000;
const NAME_INDENT: string = '  ';
const MIN_NAME_WIDTH: number = 10;

/** 進捗バーの塗り・先頭・空きの3つに分けた文字。完了したら先頭はなく、全部が塗りになる。純粋関数。 */
const renderBar = (done: number, total: number): { filled: string; empty: string } => {
    if (total === 0) {
        return { filled: '', empty: EMPTY.repeat(BAR_WIDTH) };
    }
    if (done >= total) {
        return { filled: FILLED.repeat(BAR_WIDTH), empty: '' };
    }

    const filledCount: number = Math.floor((done / total) * BAR_WIDTH);

    return {
        filled: FILLED.repeat(filledCount) + HEAD,
        empty: EMPTY.repeat(BAR_WIDTH - filledCount - 1),
    };
};

/**
 * 進捗の2行。色は paint で付ける（付けない設定なら素の文字）。
 *   ⠹ 変換中  ━━━━━━━━━━╸╌╌╌╌╌╌╌╌╌╌  23/51  経過 4.2 秒
 *     ログイン/image.png
 * 純粋関数。
 */
export function formatProgressLines(state: ProgressState, paint: Painter): ProgressLines {
    const spinner: string = SPINNER_FRAMES[state.frame % SPINNER_FRAMES.length] ?? '';
    const seconds: string = (state.elapsedMs / MS_PER_SECOND).toFixed(1);
    const bar = renderBar(state.done, state.total);

    const status: string = `${paint.cyan(spinner)} 変換中  ${paint.green(bar.filled)}${paint.dim(bar.empty)}  ${state.done}/${state.total}  経過 ${seconds} 秒`;
    const nameWidth: number = Math.max(MIN_NAME_WIDTH, state.columns - displayWidth(NAME_INDENT) - 1);
    const name: string = `${NAME_INDENT}${paint.dim(truncateStart(state.current, nameWidth))}`;

    return { status, name };
}
