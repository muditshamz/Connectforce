import * as vscode from 'vscode';
import { ExternalConnection, FieldMapping, SyncStatus } from '../types';

const CONNECTIONS_KEY = 'connectforce.connections';
const MAPPINGS_KEY = 'connectforce.fieldMappings';
const SYNC_STATUS_KEY = 'connectforce.syncStatus';

export class StorageService {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    // Connections
    async getConnections(): Promise<ExternalConnection[]> {
        return this.context.workspaceState.get<ExternalConnection[]>(CONNECTIONS_KEY, []);
    }

    async saveConnection(connection: ExternalConnection): Promise<void> {
        const connections = await this.getConnections();
        const index = connections.findIndex(c => c.id === connection.id);
        
        if (index >= 0) {
            connections[index] = connection;
        } else {
            connections.push(connection);
        }

        await this.context.workspaceState.update(CONNECTIONS_KEY, connections);
    }

    async deleteConnection(connectionId: string): Promise<void> {
        const connections = await this.getConnections();
        const filtered = connections.filter(c => c.id !== connectionId);
        await this.context.workspaceState.update(CONNECTIONS_KEY, filtered);
    }

    async getConnection(connectionId: string): Promise<ExternalConnection | undefined> {
        const connections = await this.getConnections();
        return connections.find(c => c.id === connectionId);
    }

    // Field Mappings
    async getMappings(): Promise<FieldMapping[]> {
        return this.context.workspaceState.get<FieldMapping[]>(MAPPINGS_KEY, []);
    }

    async saveMapping(mapping: FieldMapping): Promise<void> {
        const mappings = await this.getMappings();
        const index = mappings.findIndex(m => m.id === mapping.id);
        
        if (index >= 0) {
            mappings[index] = mapping;
        } else {
            mappings.push(mapping);
        }

        await this.context.workspaceState.update(MAPPINGS_KEY, mappings);
    }

    async deleteMapping(mappingId: string): Promise<void> {
        const mappings = await this.getMappings();
        const filtered = mappings.filter(m => m.id !== mappingId);
        await this.context.workspaceState.update(MAPPINGS_KEY, filtered);
    }

    async getMapping(mappingId: string): Promise<FieldMapping | undefined> {
        const mappings = await this.getMappings();
        return mappings.find(m => m.id === mappingId);
    }

    async getMappingsByConnection(connectionId: string): Promise<FieldMapping[]> {
        const mappings = await this.getMappings();
        return mappings.filter(m => m.connectionId === connectionId);
    }

    // Sync Status
    async getSyncStatuses(): Promise<SyncStatus[]> {
        return this.context.workspaceState.get<SyncStatus[]>(SYNC_STATUS_KEY, []);
    }

    async saveSyncStatus(status: SyncStatus): Promise<void> {
        const statuses = await this.getSyncStatuses();
        const index = statuses.findIndex(s => s.connectionId === status.connectionId);
        
        if (index >= 0) {
            statuses[index] = status;
        } else {
            statuses.push(status);
        }

        await this.context.workspaceState.update(SYNC_STATUS_KEY, statuses);
    }

    async getSyncStatus(connectionId: string): Promise<SyncStatus | undefined> {
        const statuses = await this.getSyncStatuses();
        return statuses.find(s => s.connectionId === connectionId);
    }

    // Bulk operations
    async clearAll(): Promise<void> {
        await this.context.workspaceState.update(CONNECTIONS_KEY, []);
        await this.context.workspaceState.update(MAPPINGS_KEY, []);
        await this.context.workspaceState.update(SYNC_STATUS_KEY, []);
    }

    async exportData(): Promise<{
        connections: ExternalConnection[];
        mappings: FieldMapping[];
        syncStatuses: SyncStatus[];
    }> {
        return {
            connections: await this.getConnections(),
            mappings: await this.getMappings(),
            syncStatuses: await this.getSyncStatuses()
        };
    }

    async importData(data: {
        connections?: ExternalConnection[];
        mappings?: FieldMapping[];
        syncStatuses?: SyncStatus[];
    }): Promise<void> {
        if (data.connections) {
            await this.context.workspaceState.update(CONNECTIONS_KEY, data.connections);
        }
        if (data.mappings) {
            await this.context.workspaceState.update(MAPPINGS_KEY, data.mappings);
        }
        if (data.syncStatuses) {
            await this.context.workspaceState.update(SYNC_STATUS_KEY, data.syncStatuses);
        }
    }
}
