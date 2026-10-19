import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isUnder } from './isUnder';

const IGNORED_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules']);

/** dir 配下のファイルを再帰的に集める。skipDirs 配下と .git・node_modules は辿らない。 */
export function walkFiles(dir: string, accept: (path: string) => boolean, skipDirs: readonly string[]): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry): string[] => {
        const path: string = join(dir, entry.name);

        if (entry.isDirectory()) {
            const skipped: boolean = IGNORED_DIRS.has(entry.name) || skipDirs.some((skip) => isUnder(path, skip));

            return skipped ? [] : walkFiles(path, accept, skipDirs);
        }

        return entry.isFile() && accept(path) ? [path] : [];
    });
}
