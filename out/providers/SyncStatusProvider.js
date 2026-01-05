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
exports.SyncStatusTreeItem = exports.SyncStatusProvider = void 0;
const vscode = __importStar(require("vscode"));
class SyncStatusProvider {
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
            // Root level - show sync statuses
            const statuses = await this.storageService.getSyncStatuses();
            const connections = await this.storageService.getConnections();
            if (statuses.length === 0 && connections.length === 0) {
                return [new SyncStatusTreeItem('No sync history', 'info', vscode.TreeItemCollapsibleState.None)];
            }
            // Create status items for each connection
            const items = [];
            for (const connection of connections) {
                const status = statuses.find(s => s.connectionId === connection.id);
                items.push(new SyncStatusTreeItem(connection.name, 'connection', vscode.TreeItemCollapsibleState.Collapsed, status, connection.id));
            }
            return items;
        }
        if (element.type === 'connection' && element.status) {
            // Connection level - show sync details
            const status = element.status;
            const items = [];
            items.push(new SyncStatusTreeItem(`Last Sync: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : 'Never'}`, 'detail', vscode.TreeItemCollapsibleState.None));
            if (status.recordsProcessed !== undefined) {
                items.push(new SyncStatusTreeItem(`Records Processed: ${status.recordsProcessed}`, 'detail', vscode.TreeItemCollapsibleState.None));
            }
            if (status.recordsFailed !== undefined && status.recordsFailed > 0) {
                items.push(new SyncStatusTreeItem(`Records Failed: ${status.recordsFailed}`, 'error', vscode.TreeItemCollapsibleState.None));
            }
            if (status.duration !== undefined) {
                items.push(new SyncStatusTreeItem(`Duration: ${this.formatDuration(status.duration)}`, 'detail', vscode.TreeItemCollapsibleState.None));
            }
            if (status.errorMessage) {
                items.push(new SyncStatusTreeItem(`Error: ${status.errorMessage}`, 'error', vscode.TreeItemCollapsibleState.None));
            }
            return items;
        }
        return [];
    }
    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        return `${(ms / 60000).toFixed(1)}m`;
    }
}
exports.SyncStatusProvider = SyncStatusProvider;
class SyncStatusTreeItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, status, connectionId) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.status = status;
        this.connectionId = connectionId;
        this.tooltip = this.buildTooltip();
        this.contextValue = type;
        this.iconPath = this.getIcon();
        if (status) {
            this.description = this.getStatusLabel(status.status);
        }
    }
    buildTooltip() {
        if (this.status) {
            return `Status: ${this.status.status}\nLast Sync: ${this.status.lastSyncTime || 'Never'}\nRecords: ${this.status.recordsProcessed || 0}`;
        }
        return this.label;
    }
    getIcon() {
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
    getStatusLabel(status) {
        const labels = {
            'success': '✓ Success',
            'error': '✗ Error',
            'running': '⟳ Running',
            'pending': '○ Pending'
        };
        return labels[status] || status;
    }
}
exports.SyncStatusTreeItem = SyncStatusTreeItem;
//# sourceMappingURL=SyncStatusProvider.js.map