const BYTES_PER_KB: number = 1024;
const BYTES_PER_MB: number = BYTES_PER_KB * BYTES_PER_KB;

export function formatBytes(bytes: number): string {
    if (bytes >= BYTES_PER_MB) {
        return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
    }

    return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
}
