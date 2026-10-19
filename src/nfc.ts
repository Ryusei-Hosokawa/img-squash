/** macOS のファイル名は NFD、md 内のリンク文字列は NFC で保存されるため、照合は必ず NFC に揃えて行う。 */
export function nfc(text: string): string {
    return text.normalize('NFC');
}
