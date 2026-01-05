"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionService = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const Security_1 = require("../utils/Security");
class ConnectionService {
    constructor(storageService, logger) {
        this.storageService = storageService;
        this.logger = logger;
    }
    async getAllConnections() {
        return this.storageService.getConnections();
    }
    async getConnection(connectionId) {
        // Validate connection ID format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(connectionId)) {
            this.logger.warn(`Invalid connection ID format: ${connectionId}`);
            return undefined;
        }
        return this.storageService.getConnection(connectionId);
    }
    async createConnection(data) {
        // Validate required fields
        if (!data.name) {
            throw new Error('Connection name is required');
        }
        if (!data.baseUrl) {
            throw new Error('Base URL is required');
        }
        // Validate and sanitize inputs
        const sanitizedName = (0, Security_1.sanitizeConnectionName)(data.name);
        if (!(0, Security_1.isValidUrl)(data.baseUrl)) {
            throw new Error('Invalid base URL format');
        }
        const now = new Date().toISOString();
        const connection = {
            id: (0, uuid_1.v4)(),
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
    async saveConnection(connection) {
        connection.updatedAt = new Date().toISOString();
        await this.storageService.saveConnection(connection);
        this.logger.info(`Saved connection: ${connection.name}`, { id: connection.id });
    }
    async deleteConnection(connectionId) {
        await this.storageService.deleteConnection(connectionId);
        this.logger.info(`Deleted connection: ${connectionId}`);
    }
    async testConnection(connection) {
        this.logger.info(`Testing connection: ${connection.name}`);
        const startTime = Date.now();
        try {
            const config = {
                method: 'GET',
                url: connection.baseUrl,
                timeout: connection.timeout || 30000,
                headers: { ...connection.headers },
                validateStatus: () => true // Accept any status code
            };
            // Add authentication headers
            this.addAuthHeaders(config, connection);
            const response = await (0, axios_1.default)(config);
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
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            // Update connection status
            connection.status = 'error';
            await this.saveConnection(connection);
            this.logger.error(`Connection test failed: ${connection.name}`, error);
            return {
                success: false,
                responseTime,
                error: (0, Security_1.sanitizeErrorMessage)(error)
            };
        }
    }
    async testEndpoint(connection, endpoint) {
        this.logger.info(`Testing endpoint: ${endpoint.name} on ${connection.name}`);
        const startTime = Date.now();
        try {
            const url = `${connection.baseUrl}${endpoint.path}`;
            const config = {
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
            const response = await (0, axios_1.default)(config);
            const responseTime = Date.now() - startTime;
            const success = response.status >= 200 && response.status < 400;
            return {
                success,
                responseTime,
                statusCode: response.status,
                responseData: response.data,
                error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                responseTime,
                error: error.message || 'Unknown error occurred'
            };
        }
    }
    addAuthHeaders(config, connection) {
        if (!config.headers) {
            config.headers = {};
        }
        switch (connection.authenticationType) {
            case 'Basic':
                const basicConfig = connection.authConfig;
                if (basicConfig?.username) {
                    const credentials = Buffer.from(`${basicConfig.username}:${basicConfig.password || ''}`).toString('base64');
                    config.headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'API_Key':
                const apiKeyConfig = connection.authConfig;
                if (apiKeyConfig?.apiKey) {
                    if (apiKeyConfig.location === 'header') {
                        config.headers[apiKeyConfig.headerName] = apiKeyConfig.apiKey;
                    }
                    else {
                        config.params = config.params || {};
                        config.params[apiKeyConfig.headerName] = apiKeyConfig.apiKey;
                    }
                }
                break;
            case 'OAuth2':
                // OAuth2 requires token exchange - for testing, we'd need a stored token
                const oauth2Config = connection.authConfig;
                // This would need actual token from a stored session
                this.logger.warn('OAuth2 connection testing requires manual token configuration');
                break;
            // JWT and Certificate auth would need more complex handling
            default:
                break;
        }
    }
    async addEndpoint(connectionId, endpoint) {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }
        const newEndpoint = {
            id: (0, uuid_1.v4)(),
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
    async updateEndpoint(connectionId, endpoint) {
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
    async deleteEndpoint(connectionId, endpointId) {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }
        connection.endpoints = connection.endpoints.filter(e => e.id !== endpointId);
        await this.saveConnection(connection);
    }
    async duplicateConnection(connectionId) {
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
    async importConnection(data) {
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
    exportConnection(connection) {
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
    sanitizeHeaders(headers) {
        const sanitized = {};
        for (const [key, value] of Object.entries(headers)) {
            try {
                const sanitizedKey = (0, Security_1.sanitizeHeaderName)(key);
                // Sanitize value - remove control characters
                const sanitizedValue = String(value)
                    .replace(/[\x00-\x1f\x7f]/g, '')
                    .substring(0, 8192); // Limit header value length
                sanitized[sanitizedKey] = sanitizedValue;
            }
            catch {
                // Skip invalid headers
                this.logger.warn(`Skipping invalid header: ${key}`);
            }
        }
        return sanitized;
    }
}
exports.ConnectionService = ConnectionService;
//# sourceMappingURL=ConnectionService.js.map