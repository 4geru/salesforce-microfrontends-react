@isTest
private class TodoControllerTest {

    private static Opportunity createOpportunity() {
        Opportunity opp = new Opportunity(Name = 'テスト商談', StageName = 'Prospecting', CloseDate = Date.today().addDays(30));
        insert opp;
        return opp;
    }

    @isTest
    static void getTasksByWhatIdReturnsRelatedOpenTasks() {
        Opportunity opp = createOpportunity();
        insert new List<Task>{
            new Task(Subject = '商談のタスク', Status = 'Not Started', WhatId = opp.Id),
            new Task(Subject = '完了済み', Status = 'Completed', WhatId = opp.Id),
            new Task(Subject = '関連なし', Status = 'Not Started')
        };

        List<Task> tasks = TodoController.getTasksByWhatId(opp.Id);

        System.assertEquals(1, tasks.size(), '商談に関連する未完了の ToDo だけが返るはず');
        System.assertEquals('商談のタスク', tasks[0].Subject);
    }

    @isTest
    static void updateTaskStatusCompletesTask() {
        Task t = new Task(Subject = '更新対象', Status = 'Not Started');
        insert t;

        TodoController.updateTaskStatus(t.Id, 'Completed');

        System.assertEquals('Completed', [SELECT Status FROM Task WHERE Id = :t.Id].Status);
    }

    @isTest
    static void updateTaskStatusThrowsOnInvalidId() {
        try {
            TodoController.updateTaskStatus(UserInfo.getUserId(), 'Completed');
            System.assert(false, '不正な ID なら例外が飛ぶはず');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
    }

    @isTest
    static void createTaskForLinksToRecord() {
        Opportunity opp = createOpportunity();

        Id taskId = TodoController.createTaskFor('見積書を送る', 'High', Date.today().addDays(3), opp.Id);

        Task t = [SELECT Subject, Priority, ActivityDate, WhatId, Status FROM Task WHERE Id = :taskId];
        System.assertEquals('見積書を送る', t.Subject);
        System.assertEquals('High', t.Priority);
        System.assertEquals(opp.Id, t.WhatId);
        System.assertEquals('Not Started', t.Status);
    }

    @isTest
    static void createTaskForRejectsBlankSubject() {
        try {
            TodoController.createTaskFor('  ', null, null, null);
            System.assert(false, '件名が空なら例外が飛ぶはず');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
    }
}
