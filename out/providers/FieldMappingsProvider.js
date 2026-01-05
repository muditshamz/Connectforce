"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingTreeItem = exports.FieldMappingsProvider = void 0;
const vscode = __importStar(require("vscode"));
class FieldMappingsProvider {
    constructor(storageService) {
        this.storageService = storageService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show mappings
            const mappings = await this.storageService.getMappings();
            if (mappings.length === 0) {
                return [new MappingTreeItem('No field mappings configured', 'info', vscode.TreeItemCollapsibleState.None)];
            }
            return mappings.map(mapping => new MappingTreeItem(mapping.name, 'mapping', vscode.TreeItemCollapsibleState.Collapsed, mapping.id, mapping.syncDirection, `${mapping.salesforceObject} ↔ ${mapping.externalEntity}`, mapping));
        }
        if (element.type === 'mapping' && element.mapping) {
            // Mapping level - show field maps
            const fieldMaps = element.mapping.mappings;
            if (fieldMaps.length === 0) {
                return [new MappingTreeItem('No fields mapped', 'info', vscode.TreeItemCollapsibleState.None)];
            }
            return fieldMaps.map(fm => new MappingTreeItem(`${fm.salesforceField} ↔ ${fm.externalField}`, 'field', vscode.TreeItemCollapsibleState.None, element.mappingId, fm.direction, this.getDirectionLabel(fm.direction), undefined, fm));
        }
        return [];
    }
    getDirectionLabel(direction) {
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
exports.FieldMappingsProvider = FieldMappingsProvider;
class MappingTreeItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, mappingId, direction, description, mapping, fieldMap) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.mappingId = mappingId;
        this.direction = direction;
        this.description = description;
        this.mapping = mapping;
        this.fieldMap = fieldMap;
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
    buildTooltip() {
        if (this.type === 'mapping' && this.mapping) {
            return `${this.label}\nSalesforce: ${this.mapping.salesforceObject}\nExternal: ${this.mapping.externalEntity}\nDirection: ${this.mapping.syncDirection}\nFields: ${this.mapping.mappings.length}`;
        }
        if (this.type === 'field' && this.fieldMap) {
            return `${this.fieldMap.salesforceField} (${this.fieldMap.salesforceFieldType})\n↔\n${this.fieldMap.externalField} (${this.fieldMap.externalFieldType})\n${this.fieldMap.required ? 'Required' : 'Optional'}${this.fieldMap.isKey ? ' • Key Field' : ''}`;
        }
        return this.label;
    }
    getIcon() {
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
    getDirectionIcon() {
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
    getFieldIcon() {
        if (this.fieldMap?.isKey) {
            return new vscode.ThemeIcon('key');
        }
        if (this.fieldMap?.required) {
            return new vscode.ThemeIcon('star-full');
        }
        return new vscode.ThemeIcon('symbol-field');
    }
}
exports.MappingTreeItem = MappingTreeItem;
//# sourceMappingURL=FieldMappingsProvider.js.map