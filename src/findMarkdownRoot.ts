/** md のリンクを書き換える範囲。対象が git 管理下ならそのルート、そうでなければ対象ディレクトリ自身。 */
export function findMarkdownRoot(dir: string): string {
    const result = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], { cwd: dir });

    return result.exitCode === 0 ? result.stdout.toString().trim() : dir;
}
