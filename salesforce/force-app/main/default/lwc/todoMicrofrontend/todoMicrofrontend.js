import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getTasksByWhatId from '@salesforce/apex/TodoController.getTasksByWhatId';
import updateTaskStatus from '@salesforce/apex/TodoController.updateTaskStatus';
import createTaskFor from '@salesforce/apex/TodoController.createTaskFor';

const PRIORITY = { High: 'high', Normal: 'normal', Low: 'low' };
const TO_SF_PRIORITY = { high: 'High', normal: 'Normal', low: 'Low' };

// ホスト: Salesforce の Task を取得して props でゲストに渡し、ゲストからのイベントで Task を更新する
//   置き場所は商談のレコードページ: その商談に関連する Task
export default class TodoMicrofrontend extends LightningElement {
    @api recordId;
    @api appUrl = 'https://todo-list-eta-puce-62.vercel.app/embed/';
    @api cardTitle = 'ToDo（Microfrontend）';

    errorMessage;
    relatedTasksResult;
    listenersAttached = false;

    @wire(getTasksByWhatId, { whatId: '$recordId' })
    wiredRelatedTasks(result) {
        this.relatedTasksResult = result;
        this.pushProps();
    }

    // ゲストはホストに依存しない Todo の形だけを知っている。Task からの変換はここで行う
    get todos() {
        return (this.relatedTasksResult?.data ?? []).map((t) => ({
            id: t.Id,
            title: t.Subject,
            done: t.Status === 'Completed',
            priority: PRIORITY[t.Priority],
            dueDate: t.ActivityDate
        }));
    }

    // props に配列やネストしたオブジェクトを入れると、ホストが ui-state を返さなくなり
    // ゲストの SDK 初期化が止まる（2026-10 時点、lightning-ui-embedding 2.2.5-rc.3 で確認）。
    // 文字列などのプリミティブは届くので、ToDo の配列は JSON 文字列にして渡す
    pushProps() {
        const embedding = this.refs?.embedding;
        if (!embedding) return;
        embedding.props = {
            title: 'この商談の ToDo',
            todosJson: JSON.stringify(this.todos)
        };
    }

    get displayError() {
        return this.errorMessage ?? (this.relatedTasksResult?.error ? 'ToDo の取得に失敗しました' : undefined);
    }

    // ライフサイクルイベントは名前にドットを含むため、テンプレートではなく JS で登録する
    renderedCallback() {
        this.pushProps();
        if (this.listenersAttached) return;
        const embedding = this.refs.embedding;
        if (!embedding) return;
        this.listenersAttached = true;
        embedding.addEventListener('sf-embedding.component.error', (event) => {
            const { code, message } = event.detail ?? {};
            this.errorMessage = `埋め込みに失敗しました（${code}）: ${message}`;
        });
    }

    async handleAdd(event) {
        const { title, priority, dueDate } = event.detail ?? {};
        // ゲストから届いた値は検証してから使う
        if (typeof title !== 'string' || !title.trim()) return;
        const due = typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null;
        try {
            await createTaskFor({
                subject: title.trim().slice(0, 255),
                priority: TO_SF_PRIORITY[priority] ?? 'Normal',
                dueDate: due,
                whatId: this.recordId
            });
            await refreshApex(this.relatedTasksResult);
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'ToDo を追加できませんでした',
                    message: e?.body?.message ?? String(e),
                    variant: 'error'
                })
            );
        }
    }

    async handleComplete(event) {
        const id = event.detail?.id;
        // ゲストから届いた ID は信用しない。いま表示している ToDo の ID だけを受け付ける
        if (!this.todos.some((t) => t.id === id)) return;
        try {
            await updateTaskStatus({ taskId: id, newStatus: 'Completed' });
            await refreshApex(this.relatedTasksResult);
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'ToDo を完了にできませんでした',
                    message: e?.body?.message ?? String(e),
                    variant: 'error'
                })
            );
        }
    }
}
