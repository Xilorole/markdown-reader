# Markdown Reader

注釈付き読書体験を提供するMarkdownリーダー。

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run storybook    # Storybook
npm run build        # 本番ビルド
```

## デプロイ

`main` ブランチへのpushで GitHub Pages に自動デプロイ。

Settings > Pages > Source を「GitHub Actions」に設定すること。

## AI設定

ヘッダーの歯車アイコンからAIプロバイダーを設定:

- **Anthropic**: claude.ai上で動作する場合はAPIキー不要
- **Azure OpenAI**: endpoint, API key, deployment name を入力
- **無効**: AI注釈機能をオフ

## リポジトリ構成

```
src/
  tokens/         デザイントークン (CSS Custom Properties)
  types/          TypeScript型定義
  services/       AIプロバイダー, Markdownパーサー
  hooks/          React hooks
  components/     UIコンポーネント (Storybook対応)
    Header/
    ContentArea/
    FootnotePane/
    FootnoteTooltip/
    SelectionMenu/
    PaneDivider/
    SettingsDialog/
    ShimmerPlaceholder/
    icons/
.storybook/       Storybook設定
.github/workflows CI・デプロイ
```
