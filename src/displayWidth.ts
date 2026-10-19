/** 全角（日本語など）として2桁で表示される文字。 */
const WIDE_CHARACTER: RegExp = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦\u{20000}-\u{3FFFD}]/u;
const WIDE_WIDTH: number = 2;

/** 端末での表示幅。全角は2桁、半角は1桁として数える。濃点などの結合文字は NFC に直してから渡すこと。 */
export function displayWidth(text: string): number {
    return [...text].reduce((sum: number, char: string) => sum + (WIDE_CHARACTER.test(char) ? WIDE_WIDTH : 1), 0);
}

/** 表示幅が width になるまで右に空白を足す。 */
export function padEndDisplay(text: string, width: number): string {
    return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}

/** 表示幅が width になるまで左に空白を足す。 */
export function padStartDisplay(text: string, width: number): string {
    return ' '.repeat(Math.max(0, width - displayWidth(text))) + text;
}
