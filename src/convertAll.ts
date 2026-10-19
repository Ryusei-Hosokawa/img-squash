import { copyFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertToWebp } from './convertToWebp';
import type { Progress } from './createProgress';
import { formatBytes } from './formatBytes';
import { nfc } from './nfc';
import { runPool } from './runPool';

export type Converted = { png: string; webp: string; before: number; after: number };
export type Skipped = { png: string; reason: string };

type Outcome = { kind: 'converted'; item: Converted } | { kind: 'skipped'; item: Skipped };
type Job = { png: string; webp: string; index: number };

export type ConvertOptions = {
    apply: boolean;
    level: number;
    jobs: number;
    /** 進捗に出すファイルの表示名。 */
    label: (png: string) => string;
    progress: Progress;
};

const toWebpPath = (png: string): string => png.replace(/\.png$/i, '.webp');

/**
 * PNG を可逆 WebP に変換し、変換後のほうが小さいものだけを採用する。apply なら WebP を書き出す。
 * 変換は jobs 個まで並列に行う。結果は、並列に終わった順ではなく、入力の並び順で返す。
 */
export async function convertAll(
    pngs: readonly string[],
    options: ConvertOptions,
): Promise<{ converted: Converted[]; skipped: Skipped[] }> {
    const work: string = mkdtempSync(join(tmpdir(), 'img-squash-'));
    const outcomes: (Outcome | undefined)[] = Array.from<Outcome | undefined>({ length: pngs.length });
    const taken: Set<string> = new Set();
    const jobs: Job[] = [];

    // 同名の .webp が先にあるかどうかは、並列に変換する前に、並び順どおりに決める
    pngs.forEach((png: string, index: number) => {
        const webp: string = toWebpPath(png);
        if (existsSync(webp) || taken.has(nfc(webp))) {
            outcomes[index] = { kind: 'skipped', item: { png, reason: '同名の .webp が既にある' } };

            return;
        }
        taken.add(nfc(webp));
        jobs.push({ png, webp, index });
    });

    let done: number = pngs.length - jobs.length;
    options.progress.update(done, '');

    try {
        await runPool(jobs, options.jobs, async (job: Job): Promise<void> => {
            const label: string = options.label(job.png);
            options.progress.update(done, label);

            outcomes[job.index] = await convertOne(job, work, options);

            done++;
            options.progress.update(done, label);
        });
    } finally {
        rmSync(work, { recursive: true, force: true });
    }

    const converted: Converted[] = [];
    const skipped: Skipped[] = [];
    for (const outcome of outcomes) {
        if (outcome?.kind === 'converted') {
            converted.push(outcome.item);
        } else if (outcome?.kind === 'skipped') {
            skipped.push(outcome.item);
        }
    }

    return { converted, skipped };
}

async function convertOne(job: Job, work: string, options: ConvertOptions): Promise<Outcome> {
    const tmp: string = join(work, `${job.index}.webp`);
    if (!(await convertToWebp(job.png, tmp, options.level))) {
        return { kind: 'skipped', item: { png: job.png, reason: 'cwebp での変換に失敗' } };
    }

    const before: number = statSync(job.png).size;
    const after: number = statSync(tmp).size;
    if (after >= before) {
        const reason: string = `WebP のほうが大きい(${formatBytes(before)} → ${formatBytes(after)})`;

        return { kind: 'skipped', item: { png: job.png, reason } };
    }

    if (options.apply) {
        copyFileSync(tmp, job.webp);
    }

    return { kind: 'converted', item: { png: job.png, webp: job.webp, before, after } };
}
