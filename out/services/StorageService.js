"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const CONNECTIONS_KEY = 'connectforce.connections';
const MAPPINGS_KEY = 'connectforce.fieldMappings';
const SYNC_STATUS_KEY = 'connectforce.syncStatus';
class StorageService {
    constructor(context) {
        this.context = context;
    }
    // Connections
    async getConnections() {
        return this.context.workspaceState.get(CONNECTIONS_KEY, []);
    }
    async saveConnection(connection) {
        const connections = await this.getConnections();
        const index = connections.findIndex(c => c.id === connection.id);
        if (index >= 0) {
            connections[index] = connection;
        }
        else {
            connections.push(connection);
        }
        await this.context.workspaceState.update(CONNECTIONS_KEY, connections);
    }
    async deleteConnection(connectionId) {
        const connections = await this.getConnections();
        const filtered = connections.filter(c => c.id !== connectionId);
        await this.context.workspaceState.update(CONNECTIONS_KEY, filtered);
    }
    async getConnection(connectionId) {
        const connections = await this.getConnections();
        return connections.find(c => c.id === connectionId);
    }
    // Field Mappings
    async getMappings() {
        return this.context.workspaceState.get(MAPPINGS_KEY, []);
    }
    async saveMapping(mapping) {
        const mappings = await this.getMappings();
        const index = mappings.findIndex(m => m.id === mapping.id);
        if (index >= 0) {
            mappings[index] = mapping;
        }
        else {
            mappings.push(mapping);
        }
        await this.context.workspaceState.update(MAPPINGS_KEY, mappings);
    }
    async deleteMapping(mappingId) {
        const mappings = await this.getMappings();
        const filtered = mappings.filter(m => m.id !== mappingId);
        await this.context.workspaceState.update(MAPPINGS_KEY, filtered);
    }
    async getMapping(mappingId) {
        const mappings = await this.getMappings();
        return mappings.find(m => m.id === mappingId);
    }
    async getMappingsByConnection(connectionId) {
        const mappings = await this.getMappings();
        return mappings.filter(m => m.connectionId === connectionId);
    }
    // Sync Status
    async getSyncStatuses() {
        return this.context.workspaceState.get(SYNC_STATUS_KEY, []);
    }
    async saveSyncStatus(status) {
        const statuses = await this.getSyncStatuses();
        const index = statuses.findIndex(s => s.connectionId === status.connectionId);
        if (index >= 0) {
            statuses[index] = status;
        }
        else {
            statuses.push(status);
        }
        await this.context.workspaceState.update(SYNC_STATUS_KEY, statuses);
    }
    async getSyncStatus(connectionId) {
        const statuses = await this.getSyncStatuses();
        return statuses.find(s => s.connectionId === connectionId);
    }
    // Bulk operations
    async clearAll() {
        await this.context.workspaceState.update(CONNECTIONS_KEY, []);
        await this.context.workspaceState.update(MAPPINGS_KEY, []);
        await this.context.workspaceState.update(SYNC_STATUS_KEY, []);
    }
    async exportData() {
        return {
            connections: await this.getConnections(),
            mappings: await this.getMappings(),
            syncStatuses: await this.getSyncStatuses()
        };
    }
    async importData(data) {
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
exports.StorageService = StorageService;
//# sourceMappingURL=StorageService.js.map