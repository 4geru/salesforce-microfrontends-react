# セキュリティのまとめ

Salesforce Microfrontends（UI Embedding）で、Vercel の React を Salesforce の画面に埋め込んだときに、セキュリティ面で何が守られていて、何を自分たちでやったか、何をやっていないかをまとめる。

2026 年 10 月時点、Developer Edition で確かめた範囲。`lightning-ui-embedding` 2.2.5-rc.3、`@salesforce/platform-sdk` 12.9.0。

## 先に結論: CORS は関係しない（今の作りでは）

**ホスト（LWC）とゲスト（React）のやり取りは HTTP ではないので、CORS の設定は要らない。**

| やり取り | 仕組み | CORS |
|---|---|---|
| ホスト ⇄ ゲスト（props・イベント） | ブラウザの中のメッセージ（`postMessage` と `MessagePort`）。HTTP のリクエストではない | **関係しない** |
| ホスト（LWC）→ Salesforce（Apex） | Salesforce の中の通信 | 関係しない |
| ゲスト（React）→ Web アプリのサーバー（メモ） | ゲストのオリジンから、ゲスト側のサーバーへの HTTP | ゲスト側のサーバーの設定次第（Salesforce は関わらない） |
| ゲスト（React）→ Salesforce の API | **今回はやっていない** | やるなら、Salesforce 側で CORS の許可リスト（［設定］→［CORS］）にゲストのオリジンを登録し、さらに API の認証も必要 |

CORS が問題になるのは、**ゲストが Salesforce の REST API などを直接呼ぶ作りにしたとき**。今回は、Salesforce のデータの読み書きをすべてホストの LWC に任せたので、その必要が無かった。

## 境界の全体像

```
[ブラウザ]
  Salesforce のページ（lightning.force.com）
   └ ホスト（LWC）……………… Salesforce のユーザーとして Apex を呼ぶ
       └ iframe（sandbox 付き）
           └ ゲスト（vercel.app）… Salesforce の認証情報は持たない
                 └ メモだけ、ゲスト自身のログインで Web アプリのサーバーへ
```

公式の線引き（[Salesforce Microfrontends: Embed Web Apps in Lightning](https://developer.salesforce.com/blogs/2026/10/salesforce-microfrontends-embed-web-apps-in-lightning)）:

> The embedded application remains responsible for its own application architecture and any authentication or data access required outside the information explicitly provided by its Lightning host.

ホストが渡した情報以外の認証・データアクセスは、ゲストの責任。

## 仕組み（Salesforce）が守ってくれること

公式ドキュメント（[UI Embedding Error Codes](https://developer.salesforce.com/docs/platform/microfrontend/references/microfrontend-error-codes/error-codes.html)、[Build the Embedding Bridge Without a Salesforce Package](https://developer.salesforce.com/docs/platform/microfrontend/guide/package-free-bridge.html)）に書かれているもの。

| 守られること | 内容 | 違反したとき |
|---|---|---|
| 許可したオリジンしか表示しない | 信頼済み URL（CSP Trusted Site）に frame-src で登録したオリジンだけを iframe に表示する | 表示されない（ブラウザの CSP で止まる） |
| ゲストは別のオリジンに置く | Salesforce と同じオリジンの `src` は拒否 | `SAME_ORIGIN_SRC` |
| 危ない sandbox の許可は付けられない | `allow-top-navigation`（画面全体の書き換え）と `allow-popups-to-escape-sandbox` は禁止 | `BLOCKED_SANDBOX_TOKEN` |
| iframe の権限は最小限 | 商談ページで実際に読んだ sandbox は `allow-scripts allow-same-origin` だけ。フォーム送信（`allow-forms`）やポップアップは許されていない | フォーム送信はブラウザが止める（`submit` イベントも発火しない） |
| 通信相手の確認 | 最初のやり取りで、送信元のオリジン・送信元のウィンドウ・埋め込みごとの ID（instanceId）を確かめる | `WRONG_ORIGIN`、`INSTANCE_ID_MISMATCH` など |
| なりすましの検知 | 同じ通信路の受け渡しが 2 回来たら、乗っ取りを疑って接続を止める | `DUPLICATE_PORT_TRANSFER` |
| 表示先の固定 | 埋め込んだ後に `src` や sandbox を変えられない | `SESSION_BINDING_MUTATED` |

## 自分たちでやったこと

### Salesforce 側（ホスト）

- **ゲストから届いた値は信用しない**: 「完了」のイベントで届いた ID が、いま表示している ToDo のものかを確かめてから更新する。「追加」は件名が文字列か、空でないかを確かめる。ゲストが乗っ取られても、関係のないレコードを書き換えさせないため
- **ゲストに Salesforce の認証情報を渡さない**: 書き込みはホストが Apex で行う。ゲストは「押された」と知らせるだけ
- **Apex は `with sharing`**: 共有ルールを守ってレコードを読む。ただし項目レベルセキュリティ（FLS）を確かめる書き方（`WITH USER_MODE` など）にはしていない（下の「やっていないこと」）
- **信頼済み URL は本番用のオリジン 1 つだけ**: ワイルドカードは使っていない

### ゲスト側（React）

- **iframe の外から直接開かれたら、データを出さない**: SDK で埋め込まれているかを確かめ、埋め込まれていなければ「Salesforce の中で表示するための入口です」とだけ出す
- **共同編集メモはログイン必須**: ホストが渡すのは取引先 ID だけなので、誰に読ませるかはゲストが決める。メールアドレスとパスワードで、iframe の中だけで完結するログインにした
- **新規登録はさせない**: 管理者が登録したメンバーだけが読める。ログインできても、メンバーでなければ何も読めない（サーバー側のデータベースの行単位のアクセス制御で強制）
- **自分の付箋だけ編集・削除できる**: 画面のボタンだけでなく、サーバー側でも強制。編集できるのは本文だけ
- **書いた人の名前は付箋に持たせない**: 表示のたびにメンバー表から引く。書き込み時に名前を偽れないようにするため
- **公開してよい鍵だけをブラウザに置く**: ブラウザのコードに入れるのは、公開前提の鍵（アクセス制御はサーバー側）だけ。管理者用の鍵は置かない
- **秘密の値は git に入れない**: 接続先の鍵は Vercel の環境変数とローカルの `.env.local`（gitignore 済み）だけに置く

### 公開の手順

- **アクセス保護のある URL は使わない**: Vercel のデプロイごとの URL はアクセス保護がかかっていて、iframe での表示も拒否される（`X-Frame-Options: DENY`）。本番用の URL を使う
- **記事のスクリーンショットはマスクした**: 組織の URL、取引先 ID、レコード所有者名をぼかした

## やっていないこと・残っているリスク

| 項目 | 現状 | 本番でやるなら |
|---|---|---|
| **ゲストのページを、誰でも iframe に入れられる** | ゲスト（vercel.app）は、どのサイトからの埋め込みも拒否していない。ToDo の Web 版はデモデータだけ、メモはログイン必須なので実害は小さいが、他人のサイトに埋め込まれて操作を誘導される（クリックジャッキング）余地はある | ゲストの応答に `Content-Security-Policy: frame-ancestors` を付け、Salesforce のドメイン（`*.lightning.force.com` など）からの埋め込みだけ許す |
| **Salesforce の権限と、メモの読み取り権限が連動しない** | メンバーなら、取引先 ID を知っていればどの取引先のメモも読める。Salesforce でその取引先を見られるかは確かめない | ホストが「このユーザーはこの取引先を見られる」ことを署名付きで渡し、サーバー側で確かめる |
| **Salesforce のユーザーとメモのユーザーが別** | Salesforce にログインしていても、メモには別途ログインが必要 | ホストがユーザーの身元に署名して渡す、または Salesforce をログイン先（OAuth / OpenID Connect）にする |
| **ログイン状態が Salesforce の中と外で別々** | ブラウザが、iframe の中の保存領域を外側のサイトごとに分けるため | 上の 2 つのどちらかで解消できる |
| **Apex で FLS を確かめていない** | `with sharing` で共有ルールは守るが、項目単位の権限は確かめていない | SOQL に `WITH USER_MODE`、DML に `AccessLevel.USER_MODE` を付ける |
| **ログイン画面の総当たり対策** | ゲスト側のサーバーの標準の制限に頼っている | 試行回数の制限、多要素認証 |
| **AppExchange での配布** | 試していない | パッケージに含められるもの、利用者の組織の条件、ゲスト側の認証の設計を確かめる |

## 参考

- [Salesforce Microfrontends: Embed Web Apps in Lightning](https://developer.salesforce.com/blogs/2026/10/salesforce-microfrontends-embed-web-apps-in-lightning)
- [Get Started with UI Embedding](https://developer.salesforce.com/docs/platform/microfrontend/guide/get-started.html)
- [UI Embedding Error Codes](https://developer.salesforce.com/docs/platform/microfrontend/references/microfrontend-error-codes/error-codes.html)
- [Build the Embedding Bridge Without a Salesforce Package](https://developer.salesforce.com/docs/platform/microfrontend/guide/package-free-bridge.html)
- [Salesforce Microfrontend (UI Embedding) で React アプリの埋め込みを試す](https://developer.salesforce.com/jpblogs/2026/09/salesforce-microfrontend-ui-embedding-jp)
