import { dirname, resolve } from 'node:path';
import { nfc } from './nfc';

export type RewriteResult = {
    text: string;
    count: number;
};

const LINK_PATTERN: RegExp = /(!?\[[^\]]*\]\()([^)\s]+)(\))/g;
const REMOTE_OR_ANCHOR: RegExp = /^([a-z]+:|#)/i;
const PNG_EXTENSION: RegExp = /\.png(?=$|#)/i;

/**
 * md 内のリンクのうち、変換した PNG を指すものの拡張子だけを .webp に書き換える。
 * リンクの残りの文字列（エンコード済みの %20 や日本語）には触れない。
 */
export function rewriteMarkdownLinks(text: string, mdPath: string, convertedPngs: ReadonlySet<string>): RewriteResult {
    let count: number = 0;

    const rewritten: string = text.replace(LINK_PATTERN, (whole: string, pre: string, url: string, post: string) => {
        if (REMOTE_OR_ANCHOR.test(url)) {
            return whole;
        }

        const hashAt: number = url.indexOf('#');
        const path: string = hashAt < 0 ? url : url.slice(0, hashAt);

        let decoded: string;
        try {
            decoded = decodeURIComponent(path);
        } catch {
            return whole;
        }

        if (!convertedPngs.has(nfc(resolve(dirname(mdPath), decoded)))) {
            return whole;
        }

        count++;

        return `${pre}${url.replace(PNG_EXTENSION, '.webp')}${post}`;
    });

    return { text: rewritten, count };
}
