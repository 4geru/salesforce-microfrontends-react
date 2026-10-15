import { LightningElement, api } from 'lwc';

// ホスト: 取引先 ID だけを props で渡す。メモのデータは Supabase にあり、Salesforce からは何も渡さない
export default class AccountMemoMicrofrontend extends LightningElement {
    @api recordId;
    @api appUrl = 'https://todo-list-eta-puce-62.vercel.app/embed/memo/';
    @api cardTitle = '取引先メモ（Microfrontend）';

    errorMessage;
    listenersAttached = false;

    renderedCallback() {
        const embedding = this.refs?.embedding;
        if (!embedding) return;
        // props の中身は文字列だけにする（配列やオブジェクトを入れるとゲストの初期化が止まるため）
        embedding.props = { accountId: this.recordId ?? '' };
        if (this.listenersAttached) return;
        this.listenersAttached = true;
        embedding.addEventListener('sf-embedding.component.error', (event) => {
            const { code, message } = event.detail ?? {};
            this.errorMessage = `埋め込みに失敗しました（${code}）: ${message}`;
        });
    }
}
