import * as vscode from 'vscode';
import { StorageService } from '../services/StorageService';
import { FieldMapping, FieldMap, SyncDirection } from '../types';

export class FieldMappingsProvider implements vscode.TreeDataProvider<MappingTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MappingTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<MappingTreeItem | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<MappingTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private storageService: StorageService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MappingTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MappingTreeItem): Promise<MappingTreeItem[]> {
        if (!element) {
            // Root level - show mappings
            const mappings = await this.storageService.getMappings();
            
            if (mappings.length === 0) {
                return [new MappingTreeItem(
                    'No field mappings configured',
                    'info',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            return mappings.map(mapping => new MappingTreeItem(
                mapping.name,
                'mapping',
                vscode.TreeItemCollapsibleState.Collapsed,
                mapping.id,
                mapping.syncDirection,
                `${mapping.salesforceObject} ↔ ${mapping.externalEntity}`,
                mapping
            ));
        }

        if (element.type === 'mapping' && element.mapping) {
            // Mapping level - show field maps
            const fieldMaps = element.mapping.mappings;

            if (fieldMaps.length === 0) {
                return [new MappingTreeItem(
                    'No fields mapped',
                    'info',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            return fieldMaps.map(fm => new MappingTreeItem(
                `${fm.salesforceField} ↔ ${fm.externalField}`,
                'field',
                vscode.TreeItemCollapsibleState.None,
                element.mappingId,
                fm.direction,
                this.getDirectionLabel(fm.direction),
                undefined,
                fm
            ));
        }

        return [];
    }

    private getDirectionLabel(direction: SyncDirection): string {
        switch (direction) {
            case 'salesforce_to_external':
                return '→ External';
            case 'external_to_salesforce':
                return '← Salesforce';
            case 'bidirectional':
                return '↔ Both';
            default:
                return '';
        }
    }
}

export class MappingTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: 'mapping' | 'field' | 'info',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly mappingId?: string,
        public readonly direction?: SyncDirection,
        public readonly description?: string,
        public readonly mapping?: FieldMapping,
        public readonly fieldMap?: FieldMap
    ) {
        super(label, collapsibleState);

        this.tooltip = this.buildTooltip();
        this.description = description;
        this.contextValue = type;
        this.iconPath = this.getIcon();

        if (type === 'mapping' && mappingId) {
            this.command = {
                command: 'connectforce.openFieldMapper',
                title: 'Edit Mapping',
                arguments: [{ mappingId }]
            };
        }
    }

    private buildTooltip(): string {
        if (this.type === 'mapping' && this.mapping) {
            return `${this.label}\nSalesforce: ${this.mapping.salesforceObject}\nExternal: ${this.mapping.externalEntity}\nDirection: ${this.mapping.syncDirection}\nFields: ${this.mapping.mappings.length}`;
        }
        if (this.type === 'field' && this.fieldMap) {
            return `${this.fieldMap.salesforceField} (${this.fieldMap.salesforceFieldType})\n↔\n${this.fieldMap.externalField} (${this.fieldMap.externalFieldType})\n${this.fieldMap.required ? 'Required' : 'Optional'}${this.fieldMap.isKey ? ' • Key Field' : ''}`;
        }
        return this.label;
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case 'mapping':
                return this.getDirectionIcon();
            case 'field':
                return this.getFieldIcon();
            case 'info':
                return new vscode.ThemeIcon('info');
            default:
                return new vscode.ThemeIcon('symbol-field');
        }
    }

    private getDirectionIcon(): vscode.ThemeIcon {
        switch (this.direction) {
            case 'salesforce_to_external':
                return new vscode.ThemeIcon('arrow-right');
            case 'external_to_salesforce':
                return new vscode.ThemeIcon('arrow-left');
            case 'bidirectional':
                return new vscode.ThemeIcon('arrow-both');
            default:
                return new vscode.ThemeIcon('symbol-field');
        }
    }

    private getFieldIcon(): vscode.ThemeIcon {
        if (this.fieldMap?.isKey) {
            return new vscode.ThemeIcon('key');
        }
        if (this.fieldMap?.required) {
            return new vscode.ThemeIcon('star-full');
        }
        return new vscode.ThemeIcon('symbol-field');
    }
}
