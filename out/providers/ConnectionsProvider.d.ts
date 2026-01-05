import * as vscode from 'vscode';
import { ConnectionService } from '../services/ConnectionService';
import { Endpoint, ConnectionStatus } from '../types';
export declare class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
    private connectionService;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | undefined | null | void>;
    constructor(connectionService: ConnectionService);
    refresh(): void;
    getTreeItem(element: ConnectionTreeItem): vscode.TreeItem;
    getChildren(element?: ConnectionTreeItem): Promise<ConnectionTreeItem[]>;
}
export declare class ConnectionTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: 'connection' | 'endpoint' | 'parameter' | 'schema' | 'folder' | 'info';
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly connectionId?: string | undefined;
    readonly status?: ConnectionStatus | undefined;
    readonly description?: string | undefined;
    readonly endpoint?: Endpoint | undefined;
    readonly parameters?: any[] | undefined;
    constructor(label: string, type: 'connection' | 'endpoint' | 'parameter' | 'schema' | 'folder' | 'info', collapsibleState: vscode.TreeItemCollapsibleState, connectionId?: string | undefined, status?: ConnectionStatus | undefined, description?: string | undefined, endpoint?: Endpoint | undefined, parameters?: any[] | undefined);
    private buildTooltip;
    private getIcon;
    private getStatusIcon;
}
//# sourceMappingURL=ConnectionsProvider.d.ts.map