import { existsSync } from 'node:fs';

/** PNG を可逆（劣化なし）の WebP に変換する。透過も保たれる。成功したら true。 */
export function convertToWebp(pngPath: string, outPath: string): boolean {
    const result = Bun.spawnSync(['cwebp', '-quiet', '-lossless', '-z', '9', pngPath, '-o', outPath]);

    return result.exitCode === 0 && existsSync(outPath);
}
