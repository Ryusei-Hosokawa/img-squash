# img-squash

ディレクトリ配下の PNG を可逆（劣化なし）の WebP に置き換えて容量を下げ、
Markdown 内の画像リンクも `.webp` に書き換えるTS製CLIツール。

Notion のエクスポートに混ざるスクリーンショットなど、文字や UI が多い画像を想定している。
そうした画像は、可逆 WebP にすると PNG の約 25% の容量になる（JPEG ではほとんど小さくならない）。

## Requirements

- macOS
- Bun
- `cwebp`（`brew install webp`）
- `trash`（`brew install trash`。`--apply` のときだけ必要）

## Setup

bun install

## Usage

```bash
# ドライラン（ファイルは変更しない。容量の変化だけ表示する）
bun src/main.ts <ディレクトリ>

# 適用
bun src/main.ts <ディレクトリ> --apply

# 特定のディレクトリを対象から外す（複数指定できる）
bun src/main.ts <ディレクトリ> --apply --exclude <外すディレクトリ>
```

dotfiles から導入している場合は、`isq` で実行できる。

```bash
isq <ディレクトリ> [--apply] [--exclude <ディレクトリ>]...
```

## Behavior

1. 指定ディレクトリ配下の `.png` を再帰的に探す（`.git` と `node_modules` は辿らない）
2. `cwebp -lossless -z 9` で WebP に変換する。透過も保たれる
3. 変換後のほうが小さい場合だけ置き換える。大きくなる場合・同名の `.webp` が既にある場合はそのまま残す
4. md 内の `![](…)` と `[](…)` のうち、変換した PNG を指すリンクの拡張子を `.webp` に書き換える。
   書き換える範囲は、対象が git 管理下ならそのルート全体、そうでなければ対象ディレクトリ内
5. 元の PNG は `trash` でゴミ箱に送る（いつでも戻せる）

## Notes

- 何度実行しても安全。PNG が残っていなければ何もしない。
- 可逆 WebP は元の画素をそのまま保つので、あとから JPEG が欲しくなっても、
  `dwebp in.webp -o out.png` で PNG に戻してから変換すれば、元の PNG から作るのと同じ品質になる。
- 書き換えるのは Markdown のリンク記法だけ。HTML の `<img src>` は書き換えない。
- macOS のファイル名は NFD、md 内のリンク文字列は NFC で保存される。照合は NFC に揃えて行う。
