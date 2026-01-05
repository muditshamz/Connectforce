import * as vscode from 'vscode';
import { StorageService } from '../services/StorageService';
import { SyncStatus } from '../types';
export declare class SyncStatusProvider implements vscode.TreeDataProvider<SyncStatusTreeItem> {
    private storageService;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<SyncStatusTreeItem | undefined | null | void>;
    constructor(storageService: StorageService);
    refresh(): void;
    getTreeItem(element: SyncStatusTreeItem): vscode.TreeItem;
    getChildren(element?: SyncStatusTreeItem): Promise<SyncStatusTreeItem[]>;
    private formatDuration;
}
export declare class SyncStatusTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: 'connection' | 'detail' | 'error' | 'info';
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly status?: SyncStatus | undefined;
    readonly connectionId?: string | undefined;
    constructor(label: string, type: 'connection' | 'detail' | 'error' | 'info', collapsibleState: vscode.TreeItemCollapsibleState, status?: SyncStatus | undefined, connectionId?: string | undefined);
    private buildTooltip;
    private getIcon;
    private getStatusLabel;
}
//# sourceMappingURL=SyncStatusProvider.d.ts.map