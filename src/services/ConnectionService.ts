import * as vscode from 'vscode';
import axios, { AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
    ExternalConnection, 
    AuthenticationType,
    Endpoint,
    ConnectionStatus,
    OAuth2Config,
    BasicAuthConfig,
    ApiKeyConfig
} from '../types';
import { StorageService } from './StorageService';
import { Logger } from '../utils/Logger';
import { 
    sanitizeConnectionName, 
    isValidUrl, 
    sanitizeHeaderName,
    sanitizeErrorMessage 
} from '../utils/Security';

export interface TestConnectionResult {
    success: boolean;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    responseData?: any;
}

export class ConnectionService {
    private storageService: StorageService;
    private logger: Logger;

    constructor(storageService: StorageService, logger: Logger) {
        this.storageService = storageService;
        this.logger = logger;
    }

    async getAllConnections(): Promise<ExternalConnection[]> {
        return this.storageService.getConnections();
    }

    async getConnection(connectionId: string): Promise<ExternalConnection | undefined> {
        // Validate connection ID format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(connectionId)) {
            this.logger.warn(`Invalid connection ID format: ${connectionId}`);
            return undefined;
        }
        return this.storageService.getConnection(connectionId);
    }

    async createConnection(data: Partial<ExternalConnection>): Promise<ExternalConnection> {
        // Validate required fields
        if (!data.name) {
            throw new Error('Connection name is required');
        }
        if (!data.baseUrl) {
            throw new Error('Base URL is required');
        }

        // Validate and sanitize inputs
        const sanitizedName = sanitizeConnectionName(data.name);
        
        if (!isValidUrl(data.baseUrl)) {
            throw new Error('Invalid base URL format');
        }

        const now = new Date().toISOString();
        const connection: ExternalConnection = {
            id: uuidv4(),
            name: sanitizedName,
            description: data.description?.substring(0, 500), // Limit description length
            baseUrl: data.baseUrl.trim(),
            authenticationType: data.authenticationType || 'None',
            authConfig: data.authConfig,
            headers: this.sanitizeHeaders(data.headers || {}),
            timeout: Math.min(Math.max(data.timeout || 30000, 1000), 120000), // Between 1s and 120s
            retryConfig: data.retryConfig || {
                maxRetries: 3,
                retryDelay: 1000,
                retryOn: [500, 502, 503, 504]
            },
            endpoints: data.endpoints || [],
            createdAt: now,
            updatedAt: now,
            status: 'inactive',
            tags: data.tags || [],
            erpType: data.erpType
        };

        await this.storageService.saveConnection(connection);
        this.logger.info(`Created connection: ${connection.name}`, { id: connection.id });
        
        return connection;
    }

    async saveConnection(connection: ExternalConnection): Promise<void> {
        connection.updatedAt = new Date().toISOString();
        await this.storageService.saveConnection(connection);
        this.logger.info(`Saved connection: ${connection.name}`, { id: connection.id });
    }

    async deleteConnection(connectionId: string): Promise<void> {
        await this.storageService.deleteConnection(connectionId);
        this.logger.info(`Deleted connection: ${connectionId}`);
    }

    async testConnection(connection: ExternalConnection): Promise<TestConnectionResult> {
        this.logger.info(`Testing connection: ${connection.name}`);
        
        const startTime = Date.now();
        
        try {
            const config: AxiosRequestConfig = {
                method: 'GET',
                url: connection.baseUrl,
                timeout: connection.timeout || 30000,
                headers: { ...connection.headers },
                validateStatus: () => true // Accept any status code
            };

            // Add authentication headers
            this.addAuthHeaders(config, connection);

            const response = await axios(config);
            const responseTime = Date.now() - startTime;

            const success = response.status >= 200 && response.status < 400;

            // Update connection status
            connection.status = success ? 'active' : 'error';
            await this.saveConnection(connection);

            this.logger.info(`Connection test ${success ? 'succeeded' : 'failed'}: ${connection.name}`, {
                statusCode: response.status,
                responseTime
            });

            return {
                success,
                responseTime,
                statusCode: response.status,
                responseData: response.data,
                error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`
            };

        } catch (error: any) {
            const responseTime = Date.now() - startTime;
            
            // Update connection status
            connection.status = 'error';
            await this.saveConnection(connection);

            this.logger.error(`Connection test failed: ${connection.name}`, error);

            return {
                success: false,
                responseTime,
                error: sanitizeErrorMessage(error)
            };
        }
    }

    async testEndpoint(connection: ExternalConnection, endpoint: Endpoint): Promise<TestConnectionResult> {
        this.logger.info(`Testing endpoint: ${endpoint.name} on ${connection.name}`);
        
        const startTime = Date.now();
        
        try {
            const url = `${connection.baseUrl}${endpoint.path}`;
            
            const config: AxiosRequestConfig = {
                method: endpoint.method,
                url,
                timeout: connection.timeout || 30000,
                headers: { 
                    ...connection.headers,
                    ...endpoint.headers
                },
                validateStatus: () => true
            };

            // Add authentication headers
            this.addAuthHeaders(config, connection);

            const response = await axios(config);
            const responseTime = Date.now() - startTime;

            const success = response.status >= 200 && response.status < 400;

            return {
                success,
                responseTime,
                statusCode: response.status,
                responseData: response.data,
                error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`
            };

        } catch (error: any) {
            const responseTime = Date.now() - startTime;
            
            return {
                success: false,
                responseTime,
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    private addAuthHeaders(config: AxiosRequestConfig, connection: ExternalConnection): void {
        if (!config.headers) {
            config.headers = {};
        }

        switch (connection.authenticationType) {
            case 'Basic':
                const basicConfig = connection.authConfig as BasicAuthConfig;
                if (basicConfig?.username) {
                    const credentials = Buffer.from(
                        `${basicConfig.username}:${basicConfig.password || ''}`
                    ).toString('base64');
                    config.headers['Authorization'] = `Basic ${credentials}`;
                }
                break;

            case 'API_Key':
                const apiKeyConfig = connection.authConfig as ApiKeyConfig;
                if (apiKeyConfig?.apiKey) {
                    if (apiKeyConfig.location === 'header') {
                        config.headers[apiKeyConfig.headerName] = apiKeyConfig.apiKey;
                    } else {
                        config.params = config.params || {};
                        config.params[apiKeyConfig.headerName] = apiKeyConfig.apiKey;
                    }
                }
                break;

            case 'OAuth2':
                // OAuth2 requires token exchange - for testing, we'd need a stored token
                const oauth2Config = connection.authConfig as OAuth2Config;
                // This would need actual token from a stored session
                this.logger.warn('OAuth2 connection testing requires manual token configuration');
                break;

            // JWT and Certificate auth would need more complex handling
            default:
                break;
        }
    }

    async addEndpoint(connectionId: string, endpoint: Partial<Endpoint>): Promise<Endpoint> {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const newEndpoint: Endpoint = {
            id: uuidv4(),
            name: endpoint.name || 'New Endpoint',
            description: endpoint.description,
            path: endpoint.path || '/',
            method: endpoint.method || 'GET',
            parameters: endpoint.parameters || [],
            requestBody: endpoint.requestBody,
            responseSchema: endpoint.responseSchema,
            headers: endpoint.headers || {},
            tags: endpoint.tags || []
        };

        connection.endpoints.push(newEndpoint);
        await this.saveConnection(connection);

        return newEndpoint;
    }

    async updateEndpoint(connectionId: string, endpoint: Endpoint): Promise<void> {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const index = connection.endpoints.findIndex(e => e.id === endpoint.id);
        if (index >= 0) {
            connection.endpoints[index] = endpoint;
            await this.saveConnection(connection);
        }
    }

    async deleteEndpoint(connectionId: string, endpointId: string): Promise<void> {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        connection.endpoints = connection.endpoints.filter(e => e.id !== endpointId);
        await this.saveConnection(connection);
    }

    async duplicateConnection(connectionId: string): Promise<ExternalConnection> {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const duplicate = await this.createConnection({
            ...connection,
            name: `${connection.name} (Copy)`,
            status: 'inactive'
        });

        return duplicate;
    }

    async importConnection(data: any): Promise<ExternalConnection> {
        // Validate and sanitize imported data
        const connection = await this.createConnection({
            name: data.name,
            description: data.description,
            baseUrl: data.baseUrl,
            authenticationType: data.authenticationType || 'None',
            authConfig: data.authConfig,
            headers: data.headers,
            endpoints: data.endpoints || [],
            erpType: data.erpType
        });

        return connection;
    }

    exportConnection(connection: ExternalConnection): any {
        // Export connection without sensitive data
        return {
            name: connection.name,
            description: connection.description,
            baseUrl: connection.baseUrl,
            authenticationType: connection.authenticationType,
            headers: connection.headers,
            endpoints: connection.endpoints,
            erpType: connection.erpType
        };
    }

    /**
     * Sanitize headers to prevent injection
     */
    private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
        const sanitized: Record<string, string> = {};
        
        for (const [key, value] of Object.entries(headers)) {
            try {
                const sanitizedKey = sanitizeHeaderName(key);
                // Sanitize value - remove control characters
                const sanitizedValue = String(value)
                    .replace(/[\x00-\x1f\x7f]/g, '')
                    .substring(0, 8192); // Limit header value length
                sanitized[sanitizedKey] = sanitizedValue;
            } catch {
                // Skip invalid headers
                this.logger.warn(`Skipping invalid header: ${key}`);
            }
        }
        
        return sanitized;
    }
}
