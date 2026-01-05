import * as vscode from 'vscode';
import { StorageService } from '../services/StorageService';
import { FieldMapping, FieldMap, SyncDirection } from '../types';
export declare class FieldMappingsProvider implements vscode.TreeDataProvider<MappingTreeItem> {
    private storageService;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<MappingTreeItem | undefined | null | void>;
    constructor(storageService: StorageService);
    refresh(): void;
    getTreeItem(element: MappingTreeItem): vscode.TreeItem;
    getChildren(element?: MappingTreeItem): Promise<MappingTreeItem[]>;
    private getDirectionLabel;
}
export declare class MappingTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: 'mapping' | 'field' | 'info';
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly mappingId?: string | undefined;
    readonly direction?: SyncDirection | undefined;
    readonly description?: string | undefined;
    readonly mapping?: FieldMapping | undefined;
    readonly fieldMap?: FieldMap | undefined;
    constructor(label: string, type: 'mapping' | 'field' | 'info', collapsibleState: vscode.TreeItemCollapsibleState, mappingId?: string | undefined, direction?: SyncDirection | undefined, description?: string | undefined, mapping?: FieldMapping | undefined, fieldMap?: FieldMap | undefined);
    private buildTooltip;
    private getIcon;
    private getDirectionIcon;
    private getFieldIcon;
}
//# sourceMappingURL=FieldMappingsProvider.d.ts.map