import * as vscode from 'vscode';
import { ExternalConnection, FieldMapping, SyncStatus } from '../types';
export declare class StorageService {
    private context;
    constructor(context: vscode.ExtensionContext);
    getConnections(): Promise<ExternalConnection[]>;
    saveConnection(connection: ExternalConnection): Promise<void>;
    deleteConnection(connectionId: string): Promise<void>;
    getConnection(connectionId: string): Promise<ExternalConnection | undefined>;
    getMappings(): Promise<FieldMapping[]>;
    saveMapping(mapping: FieldMapping): Promise<void>;
    deleteMapping(mappingId: string): Promise<void>;
    getMapping(mappingId: string): Promise<FieldMapping | undefined>;
    getMappingsByConnection(connectionId: string): Promise<FieldMapping[]>;
    getSyncStatuses(): Promise<SyncStatus[]>;
    saveSyncStatus(status: SyncStatus): Promise<void>;
    getSyncStatus(connectionId: string): Promise<SyncStatus | undefined>;
    clearAll(): Promise<void>;
    exportData(): Promise<{
        connections: ExternalConnection[];
        mappings: FieldMapping[];
        syncStatuses: SyncStatus[];
    }>;
    importData(data: {
        connections?: ExternalConnection[];
        mappings?: FieldMapping[];
        syncStatuses?: SyncStatus[];
    }): Promise<void>;
}
//# sourceMappingURL=StorageService.d.ts.map