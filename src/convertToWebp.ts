import { existsSync } from 'node:fs';

/**
 * PNG を可逆（劣化なし）の WebP に変換する。透過も保たれる。成功したら true。
 * 非同期で動かすので、待っている間に進捗の表示を更新したり、複数を並列に変換したりできる。
 */
export async function convertToWebp(pngPath: string, outPath: string, level: number): Promise<boolean> {
    const process = Bun.spawn(['cwebp', '-quiet', '-lossless', '-z', String(level), pngPath, '-o', outPath], {
        stdout: 'ignore',
        stderr: 'ignore',
    });
    const exitCode: number = await process.exited;

    return exitCode === 0 && existsSync(outPath);
}
