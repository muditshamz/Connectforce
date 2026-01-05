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
exports.ConnectionTreeItem = exports.ConnectionsProvider = void 0;
const vscode = __importStar(require("vscode"));
class ConnectionsProvider {
    constructor(connectionService) {
        this.connectionService = connectionService;
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
            // Root level - show connections
            const connections = await this.connectionService.getAllConnections();
            if (connections.length === 0) {
                return [new ConnectionTreeItem('No connections configured', 'info', vscode.TreeItemCollapsibleState.None, undefined, undefined, 'Click + to add a new connection')];
            }
            return connections.map(conn => new ConnectionTreeItem(conn.name, 'connection', vscode.TreeItemCollapsibleState.Collapsed, conn.id, conn.status, conn.baseUrl));
        }
        if (element.type === 'connection' && element.connectionId) {
            // Connection level - show endpoints
            const connection = await this.connectionService.getConnection(element.connectionId);
            if (!connection || connection.endpoints.length === 0) {
                return [new ConnectionTreeItem('No endpoints defined', 'info', vscode.TreeItemCollapsibleState.None)];
            }
            return connection.endpoints.map(endpoint => new ConnectionTreeItem(endpoint.name, 'endpoint', vscode.TreeItemCollapsibleState.Collapsed, element.connectionId, undefined, `${endpoint.method} ${endpoint.path}`, endpoint));
        }
        if (element.type === 'endpoint' && element.endpoint) {
            // Endpoint level - show parameters and schemas
            const items = [];
            const endpoint = element.endpoint;
            // Add parameters
            if (endpoint.parameters && endpoint.parameters.length > 0) {
                items.push(new ConnectionTreeItem(`Parameters (${endpoint.parameters.length})`, 'folder', vscode.TreeItemCollapsibleState.Collapsed, element.connectionId, undefined, undefined, undefined, endpoint.parameters.map(p => ({
                    name: p.name,
                    type: p.type,
                    required: p.required,
                    in: p.in
                }))));
            }
            // Add request body info
            if (endpoint.requestBody) {
                items.push(new ConnectionTreeItem('Request Body', 'schema', vscode.TreeItemCollapsibleState.None, element.connectionId, undefined, `Type: ${endpoint.requestBody.type}`));
            }
            // Add response schema info
            if (endpoint.responseSchema) {
                items.push(new ConnectionTreeItem('Response Schema', 'schema', vscode.TreeItemCollapsibleState.None, element.connectionId, undefined, `Type: ${endpoint.responseSchema.type}`));
            }
            return items;
        }
        if (element.type === 'folder' && element.parameters) {
            // Parameters folder - show individual parameters
            return element.parameters.map((param) => new ConnectionTreeItem(param.name, 'parameter', vscode.TreeItemCollapsibleState.None, element.connectionId, undefined, `${param.type} (${param.in})${param.required ? ' *' : ''}`));
        }
        return [];
    }
}
exports.ConnectionsProvider = ConnectionsProvider;
class ConnectionTreeItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, connectionId, status, description, endpoint, parameters) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.connectionId = connectionId;
        this.status = status;
        this.description = description;
        this.endpoint = endpoint;
        this.parameters = parameters;
        this.tooltip = this.buildTooltip();
        this.description = description;
        this.contextValue = type;
        this.iconPath = this.getIcon();
        // Add command for connection items
        if (type === 'connection' && connectionId) {
            this.command = {
                command: 'connectforce.openBuilder',
                title: 'Open Connection',
                arguments: [{ connectionId }]
            };
        }
    }
    buildTooltip() {
        switch (this.type) {
            case 'connection':
                return `${this.label}\nStatus: ${this.status || 'unknown'}\n${this.description || ''}`;
            case 'endpoint':
                return `${this.label}\n${this.description || ''}`;
            case 'parameter':
                return `Parameter: ${this.label}\n${this.description || ''}`;
            default:
                return this.label;
        }
    }
    getIcon() {
        switch (this.type) {
            case 'connection':
                return this.getStatusIcon();
            case 'endpoint':
                return new vscode.ThemeIcon('symbol-method');
            case 'parameter':
                return new vscode.ThemeIcon('symbol-variable');
            case 'schema':
                return new vscode.ThemeIcon('symbol-class');
            case 'folder':
                return new vscode.ThemeIcon('folder');
            case 'info':
                return new vscode.ThemeIcon('info');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
    getStatusIcon() {
        switch (this.status) {
            case 'active':
                return new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.green'));
            case 'error':
                return new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.red'));
            case 'testing':
                return new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.yellow'));
            default:
                return new vscode.ThemeIcon('plug');
        }
    }
}
exports.ConnectionTreeItem = ConnectionTreeItem;
//# sourceMappingURL=ConnectionsProvider.js.map