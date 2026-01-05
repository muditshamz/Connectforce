import { ExternalConnection, Endpoint } from '../types';
import { StorageService } from './StorageService';
import { Logger } from '../utils/Logger';
export interface TestConnectionResult {
    success: boolean;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    responseData?: any;
}
export declare class ConnectionService {
    private storageService;
    private logger;
    constructor(storageService: StorageService, logger: Logger);
    getAllConnections(): Promise<ExternalConnection[]>;
    getConnection(connectionId: string): Promise<ExternalConnection | undefined>;
    createConnection(data: Partial<ExternalConnection>): Promise<ExternalConnection>;
    saveConnection(connection: ExternalConnection): Promise<void>;
    deleteConnection(connectionId: string): Promise<void>;
    testConnection(connection: ExternalConnection): Promise<TestConnectionResult>;
    testEndpoint(connection: ExternalConnection, endpoint: Endpoint): Promise<TestConnectionResult>;
    private addAuthHeaders;
    addEndpoint(connectionId: string, endpoint: Partial<Endpoint>): Promise<Endpoint>;
    updateEndpoint(connectionId: string, endpoint: Endpoint): Promise<void>;
    deleteEndpoint(connectionId: string, endpointId: string): Promise<void>;
    duplicateConnection(connectionId: string): Promise<ExternalConnection>;
    importConnection(data: any): Promise<ExternalConnection>;
    exportConnection(connection: ExternalConnection): any;
    /**
     * Sanitize headers to prevent injection
     */
    private sanitizeHeaders;
}
//# sourceMappingURL=ConnectionService.d.ts.map