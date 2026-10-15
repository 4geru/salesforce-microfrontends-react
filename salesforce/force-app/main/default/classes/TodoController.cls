/**
 * ToDo（Microfrontend）用のコントローラー
 * 商談に関連する ToDo の取得と、ゲスト（React）からのイベントを受けた更新・作成を行う
 */
public with sharing class TodoController {

    /**
     * 指定レコード（商談など）に関連する未完了の ToDo を返す
     */
    @AuraEnabled(cacheable=true)
    public static List<Task> getTasksByWhatId(Id whatId) {
        try {
            return [
                SELECT Id, Subject, Status, Priority, ActivityDate
                FROM Task
                WHERE WhatId = :whatId
                  AND IsClosed = false
                ORDER BY ActivityDate ASC NULLS LAST, CreatedDate DESC
                LIMIT 100
            ];
        } catch (Exception e) {
            throw new AuraHandledException('ToDo の取得に失敗しました: ' + e.getMessage());
        }
    }

    /**
     * ToDo の状態を更新する（「完了」イベント用）
     */
    @AuraEnabled
    public static void updateTaskStatus(Id taskId, String newStatus) {
        try {
            update new Task(Id = taskId, Status = newStatus);
        } catch (Exception e) {
            throw new AuraHandledException('ToDo の更新に失敗しました: ' + e.getMessage());
        }
    }

    /**
     * 関連先・期日付きで ToDo を作る（「追加」イベント用）
     */
    @AuraEnabled
    public static Id createTaskFor(String subject, String priority, Date dueDate, Id whatId) {
        if (String.isBlank(subject)) {
            throw new AuraHandledException('件名を入力してください');
        }
        try {
            Task newTask = new Task(
                Subject = subject.left(255),
                Status = 'Not Started',
                Priority = String.isBlank(priority) ? 'Normal' : priority,
                ActivityDate = dueDate,
                WhatId = whatId,
                OwnerId = UserInfo.getUserId()
            );
            insert newTask;
            return newTask.Id;
        } catch (Exception e) {
            throw new AuraHandledException('ToDo の作成に失敗しました: ' + e.getMessage());
        }
    }
}
