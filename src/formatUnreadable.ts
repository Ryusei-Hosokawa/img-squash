import type { Painter } from './createPainter';

const INDENT: string = '  ';
const VERBOSE_HINT: string = '(--verbose で一覧を表示)';

/**
 * 読めずに飛ばしたディレクトリの案内行を作る。純粋関数で、表示はしない。
 * paths が空なら何も返さない。verbose のときは各パスを列挙し、そうでなければ一覧を出す案内を添える。
 * paths は呼び出し側で対象ディレクトリからの相対にし、NFC に揃えて渡すこと。
 */
export function formatUnreadable(paths: readonly string[], verbose: boolean, paint: Painter): string[] {
    if (paths.length === 0) {
        return [];
    }

    const summary: string = paint.yellow(`読めずに飛ばしたディレクトリ: ${paths.length} 件`);
    const header: string = verbose ? summary : `${summary}${VERBOSE_HINT}`;
    const list: string[] = verbose ? paths.map((path: string): string => `${INDENT}${path}`) : [];

    return ['', header, ...list];
}
