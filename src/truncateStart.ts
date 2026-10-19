import { displayWidth } from './displayWidth';

/** 表示幅が max に収まるよう、前を「…」に置き換えて短くする（ファイル名は後ろのほうが大事なため）。純粋関数。 */
export function truncateStart(text: string, max: number): string {
    if (displayWidth(text) <= max) {
        return text;
    }

    let kept: string = '';
    let width: number = displayWidth('…');
    for (const char of [...text].reverse()) {
        const charWidth: number = displayWidth(char);
        if (width + charWidth > max) {
            break;
        }
        kept = char + kept;
        width += charWidth;
    }

    return `…${kept}`;
}
