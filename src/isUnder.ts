import { nfc } from './nfc';

export function isUnder(path: string, dir: string): boolean {
    const normalizedPath: string = nfc(path);
    const normalizedDir: string = nfc(dir);

    return normalizedPath === normalizedDir || normalizedPath.startsWith(`${normalizedDir}/`);
}
