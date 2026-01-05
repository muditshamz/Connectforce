import * as vscode from 'vscode';
import { ConnectionService } from '../services/ConnectionService';
import { ExternalConnection, Endpoint, ConnectionStatus } from '../types';

export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<ConnectionTreeItem | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private connectionService: ConnectionService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConnectionTreeItem): Promise<ConnectionTreeItem[]> {
        if (!element) {
            // Root level - show connections
            const connections = await this.connectionService.getAllConnections();
            
            if (connections.length === 0) {
                return [new ConnectionTreeItem(
                    'No connections configured',
                    'info',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    undefined,
                    'Click + to add a new connection'
                )];
            }

            return connections.map(conn => new ConnectionTreeItem(
                conn.name,
                'connection',
                vscode.TreeItemCollapsibleState.Collapsed,
                conn.id,
                conn.status,
                conn.baseUrl
            ));
        }

        if (element.type === 'connection' && element.connectionId) {
            // Connection level - show endpoints
            const connection = await this.connectionService.getConnection(element.connectionId);
            
            if (!connection || connection.endpoints.length === 0) {
                return [new ConnectionTreeItem(
                    'No endpoints defined',
                    'info',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            return connection.endpoints.map(endpoint => new ConnectionTreeItem(
                endpoint.name,
                'endpoint',
                vscode.TreeItemCollapsibleState.Collapsed,
                element.connectionId,
                undefined,
                `${endpoint.method} ${endpoint.path}`,
                endpoint
            ));
        }

        if (element.type === 'endpoint' && element.endpoint) {
            // Endpoint level - show parameters and schemas
            const items: ConnectionTreeItem[] = [];
            const endpoint = element.endpoint;

            // Add parameters
            if (endpoint.parameters && endpoint.parameters.length > 0) {
                items.push(new ConnectionTreeItem(
                    `Parameters (${endpoint.parameters.length})`,
                    'folder',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    element.connectionId,
                    undefined,
                    undefined,
                    undefined,
                    endpoint.parameters.map(p => ({
                        name: p.name,
                        type: p.type,
                        required: p.required,
                        in: p.in
                    }))
                ));
            }

            // Add request body info
            if (endpoint.requestBody) {
                items.push(new ConnectionTreeItem(
                    'Request Body',
                    'schema',
                    vscode.TreeItemCollapsibleState.None,
                    element.connectionId,
                    undefined,
                    `Type: ${endpoint.requestBody.type}`
                ));
            }

            // Add response schema info
            if (endpoint.responseSchema) {
                items.push(new ConnectionTreeItem(
                    'Response Schema',
                    'schema',
                    vscode.TreeItemCollapsibleState.None,
                    element.connectionId,
                    undefined,
                    `Type: ${endpoint.responseSchema.type}`
                ));
            }

            return items;
        }

        if (element.type === 'folder' && element.parameters) {
            // Parameters folder - show individual parameters
            return element.parameters.map((param: any) => new ConnectionTreeItem(
                param.name,
                'parameter',
                vscode.TreeItemCollapsibleState.None,
                element.connectionId,
                undefined,
                `${param.type} (${param.in})${param.required ? ' *' : ''}`
            ));
        }

        return [];
    }
}

export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: 'connection' | 'endpoint' | 'parameter' | 'schema' | 'folder' | 'info',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly connectionId?: string,
        public readonly status?: ConnectionStatus,
        public readonly description?: string,
        public readonly endpoint?: Endpoint,
        public readonly parameters?: any[]
    ) {
        super(label, collapsibleState);

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

    private buildTooltip(): string {
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

    private getIcon(): vscode.ThemeIcon {
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

    private getStatusIcon(): vscode.ThemeIcon {
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
