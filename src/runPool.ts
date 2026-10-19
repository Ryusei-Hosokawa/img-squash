/** items を最大 limit 個まで同時に worker で処理する。全部が終わるまで待つ。 */
export async function runPool<T>(
    items: readonly T[],
    limit: number,
    worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
    let next: number = 0;

    const lane = async (): Promise<void> => {
        while (next < items.length) {
            const index: number = next;
            next++;
            await worker(items[index] as T, index);
        }
    };

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}
