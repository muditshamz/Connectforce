import * as vscode from 'vscode';
import { StorageService } from '../services/StorageService';
import { SyncStatus } from '../types';

export class SyncStatusProvider implements vscode.TreeDataProvider<SyncStatusTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SyncStatusTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<SyncStatusTreeItem | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<SyncStatusTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private storageService: StorageService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SyncStatusTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SyncStatusTreeItem): Promise<SyncStatusTreeItem[]> {
        if (!element) {
            // Root level - show sync statuses
            const statuses = await this.storageService.getSyncStatuses();
            const connections = await this.storageService.getConnections();
            
            if (statuses.length === 0 && connections.length === 0) {
                return [new SyncStatusTreeItem(
                    'No sync history',
                    'info',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            // Create status items for each connection
            const items: SyncStatusTreeItem[] = [];
            
            for (const connection of connections) {
                const status = statuses.find(s => s.connectionId === connection.id);
                items.push(new SyncStatusTreeItem(
                    connection.name,
                    'connection',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    status,
                    connection.id
                ));
            }

            return items;
        }

        if (element.type === 'connection' && element.status) {
            // Connection level - show sync details
            const status = element.status;
            const items: SyncStatusTreeItem[] = [];

            items.push(new SyncStatusTreeItem(
                `Last Sync: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : 'Never'}`,
                'detail',
                vscode.TreeItemCollapsibleState.None
            ));

            if (status.recordsProcessed !== undefined) {
                items.push(new SyncStatusTreeItem(
                    `Records Processed: ${status.recordsProcessed}`,
                    'detail',
                    vscode.TreeItemCollapsibleState.None
                ));
            }

            if (status.recordsFailed !== undefined && status.recordsFailed > 0) {
                items.push(new SyncStatusTreeItem(
                    `Records Failed: ${status.recordsFailed}`,
                    'error',
                    vscode.TreeItemCollapsibleState.None
                ));
            }

            if (status.duration !== undefined) {
                items.push(new SyncStatusTreeItem(
                    `Duration: ${this.formatDuration(status.duration)}`,
                    'detail',
                    vscode.TreeItemCollapsibleState.None
                ));
            }

            if (status.errorMessage) {
                items.push(new SyncStatusTreeItem(
                    `Error: ${status.errorMessage}`,
                    'error',
                    vscode.TreeItemCollapsibleState.None
                ));
            }

            return items;
        }

        return [];
    }

    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        return `${(ms / 60000).toFixed(1)}m`;
    }
}

export class SyncStatusTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: 'connection' | 'detail' | 'error' | 'info',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly status?: SyncStatus,
        public readonly connectionId?: string
    ) {
        super(label, collapsibleState);

        this.tooltip = this.buildTooltip();
        this.contextValue = type;
        this.iconPath = this.getIcon();

        if (status) {
            this.description = this.getStatusLabel(status.status);
        }
    }

    private buildTooltip(): string {
        if (this.status) {
            return `Status: ${this.status.status}\nLast Sync: ${this.status.lastSyncTime || 'Never'}\nRecords: ${this.status.recordsProcessed || 0}`;
        }
        return this.label;
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.type === 'connection' && this.status) {
            switch (this.status.status) {
                case 'success':
                    return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
                case 'error':
                    return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
                case 'running':
                    return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
                case 'pending':
                    return new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.yellow'));
                default:
                    return new vscode.ThemeIcon('circle-outline');
            }
        }

        switch (this.type) {
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            case 'detail':
                return new vscode.ThemeIcon('info');
            case 'info':
                return new vscode.ThemeIcon('info');
            default:
                return new vscode.ThemeIcon('sync');
        }
    }

    private getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'success': '✓ Success',
            'error': '✗ Error',
            'running': '⟳ Running',
            'pending': '○ Pending'
        };
        return labels[status] || status;
    }
}
