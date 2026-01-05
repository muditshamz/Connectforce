import * as vscode from 'vscode';
import { ERPTemplate } from '../types';
export declare class TemplatesProvider implements vscode.TreeDataProvider<TemplateTreeItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TemplateTreeItem | undefined | null | void>;
    private templates;
    constructor();
    refresh(): void;
    getTreeItem(element: TemplateTreeItem): vscode.TreeItem;
    getChildren(element?: TemplateTreeItem): Promise<TemplateTreeItem[]>;
    getAllTemplates(): ERPTemplate[];
    getTemplateByType(type: string): ERPTemplate | undefined;
    private getTemplatesByCategory;
    private initializeTemplates;
}
export declare class TemplateTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: 'category' | 'template';
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly template?: ERPTemplate | undefined;
    readonly description?: string | undefined;
    constructor(label: string, type: 'category' | 'template', collapsibleState: vscode.TreeItemCollapsibleState, template?: ERPTemplate | undefined, description?: string | undefined);
    private buildTooltip;
    private getIcon;
}
//# sourceMappingURL=TemplatesProvider.d.ts.map