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

const SPINNER_FRAMES: readonly string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BAR_WIDTH: number = 20;
const MS_PER_SECOND: number = 1000;
const MIN_NAME_WIDTH: number = 10;

/** 進捗バー。例: "██████░░░░░░░░░░░░░░"。純粋関数。 */
const renderBar = (done: number, total: number): string => {
    const filled: number = total === 0 ? 0 : Math.round((done / total) * BAR_WIDTH);

    return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
};

/** 進捗の1行。例: "⠹ 変換中  [██████░░░░░░░░░░░░░░]  23/51  経過 4.2 秒  ログイン/image.png"。純粋関数。 */
export function formatProgressLine(state: ProgressState): string {
    const spinner: string = SPINNER_FRAMES[state.frame % SPINNER_FRAMES.length] ?? '';
    const seconds: string = (state.elapsedMs / MS_PER_SECOND).toFixed(1);
    const head: string = `${spinner} 変換中  [${renderBar(state.done, state.total)}]  ${state.done}/${state.total}  経過 ${seconds} 秒  `;
    const nameWidth: number = Math.max(MIN_NAME_WIDTH, state.columns - displayWidth(head) - 1);

    return head + truncateStart(state.current, nameWidth);
}
