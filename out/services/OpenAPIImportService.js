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
exports.OpenAPIImportService = void 0;
const uuid_1 = require("uuid");
const yaml = __importStar(require("js-yaml"));
const Security_1 = require("../utils/Security");
const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB max
const MAX_ENDPOINTS = 500;
class OpenAPIImportService {
    constructor(logger) {
        this.logger = logger;
    }
    async importFromSpec(content) {
        this.logger.info('Importing OpenAPI specification');
        // Validate input size
        if (!content || content.length === 0) {
            throw new Error('Empty specification provided');
        }
        if (content.length > MAX_SPEC_SIZE) {
            throw new Error('Specification too large (max 10MB)');
        }
        let spec;
        try {
            // Try parsing as JSON first
            spec = JSON.parse(content);
        }
        catch {
            // Try parsing as YAML
            try {
                spec = yaml.load(content, {
                    schema: yaml.JSON_SCHEMA // Use safe schema to prevent code execution
                });
            }
            catch (e) {
                throw new Error('Invalid OpenAPI specification: Unable to parse as JSON or YAML');
            }
        }
        // Validate spec structure
        if (!spec || typeof spec !== 'object') {
            throw new Error('Invalid OpenAPI specification: Not a valid object');
        }
        // Validate spec
        if (!spec.openapi && !spec.swagger) {
            throw new Error('Invalid OpenAPI specification: Missing openapi or swagger version');
        }
        if (!spec.info || typeof spec.info !== 'object') {
            throw new Error('Invalid OpenAPI specification: Missing info section');
        }
        if (!spec.paths || typeof spec.paths !== 'object') {
            throw new Error('Invalid OpenAPI specification: Missing paths section');
        }
        // Check endpoint count
        const pathCount = Object.keys(spec.paths).length;
        if (pathCount > MAX_ENDPOINTS) {
            throw new Error(`Too many endpoints (${pathCount}). Maximum allowed: ${MAX_ENDPOINTS}`);
        }
        // Extract base URL
        let baseUrl = '';
        if (spec.servers && Array.isArray(spec.servers) && spec.servers.length > 0) {
            baseUrl = String(spec.servers[0].url || '');
            // Validate URL if provided
            if (baseUrl && !baseUrl.startsWith('{') && !(0, Security_1.isValidUrl)(baseUrl)) {
                this.logger.warn('Invalid base URL in spec, using empty');
                baseUrl = '';
            }
        }
        // Extract authentication type
        const authType = this.extractAuthenticationType(spec);
        // Convert paths to endpoints
        const endpoints = this.convertPathsToEndpoints(spec);
        const now = new Date().toISOString();
        const connection = {
            id: (0, uuid_1.v4)(),
            name: spec.info.title,
            description: spec.info.description,
            baseUrl,
            authenticationType: authType,
            endpoints,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryDelay: 1000,
                retryOn: [500, 502, 503, 504]
            },
            createdAt: now,
            updatedAt: now,
            status: 'inactive',
            tags: []
        };
        this.logger.info(`Successfully imported: ${connection.name}`, {
            endpoints: endpoints.length,
            baseUrl
        });
        return connection;
    }
    extractAuthenticationType(spec) {
        if (!spec.components?.securitySchemes) {
            return 'None';
        }
        const schemes = spec.components.securitySchemes;
        const schemeTypes = Object.values(schemes);
        for (const scheme of schemeTypes) {
            if (scheme.type === 'oauth2') {
                return 'OAuth2';
            }
            if (scheme.type === 'http' && scheme.scheme === 'basic') {
                return 'Basic';
            }
            if (scheme.type === 'apiKey') {
                return 'API_Key';
            }
            if (scheme.type === 'http' && scheme.scheme === 'bearer') {
                return 'JWT';
            }
        }
        return 'None';
    }
    convertPathsToEndpoints(spec) {
        const endpoints = [];
        const schemas = spec.components?.schemas || {};
        for (const [path, pathItem] of Object.entries(spec.paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
                    const endpoint = this.createEndpoint(path, method.toUpperCase(), operation, schemas);
                    endpoints.push(endpoint);
                }
            }
        }
        return endpoints;
    }
    createEndpoint(path, method, operation, schemas) {
        const endpoint = {
            id: (0, uuid_1.v4)(),
            name: operation.operationId || `${method} ${path}`,
            description: operation.summary || operation.description,
            path,
            method,
            parameters: this.extractParameters(operation.parameters || []),
            requestBody: this.extractRequestBody(operation.requestBody, schemas),
            responseSchema: this.extractResponseSchema(operation.responses, schemas),
            headers: {},
            tags: operation.tags || []
        };
        return endpoint;
    }
    extractParameters(parameters) {
        return parameters.map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            type: this.convertOpenAPITypeToDataType(param.schema?.type || 'string'),
            description: param.description,
            defaultValue: param.schema?.default,
            enum: param.schema?.enum
        }));
    }
    extractRequestBody(requestBody, schemas) {
        if (!requestBody?.content) {
            return undefined;
        }
        const jsonContent = requestBody.content['application/json'];
        if (!jsonContent?.schema) {
            return undefined;
        }
        return this.convertSchemaToDefinition(jsonContent.schema, schemas);
    }
    extractResponseSchema(responses, schemas) {
        if (!responses) {
            return undefined;
        }
        // Get the 200 or 201 response
        const successResponse = responses['200'] || responses['201'] || responses['default'];
        if (!successResponse?.content) {
            return undefined;
        }
        const jsonContent = successResponse.content['application/json'];
        if (!jsonContent?.schema) {
            return undefined;
        }
        return this.convertSchemaToDefinition(jsonContent.schema, schemas);
    }
    convertSchemaToDefinition(schema, schemas) {
        // Handle $ref
        if (schema.$ref) {
            const refName = schema.$ref.replace('#/components/schemas/', '');
            const refSchema = schemas[refName];
            if (refSchema) {
                return this.convertSchemaToDefinition(refSchema, schemas);
            }
        }
        const definition = {
            type: this.convertOpenAPITypeToDataType(schema.type || 'object'),
            description: schema.description,
            example: schema.example,
            required: schema.required
        };
        if (schema.type === 'object' && schema.properties) {
            definition.properties = {};
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                definition.properties[propName] = this.convertPropertyToDefinition(propSchema, schemas, schema.required?.includes(propName));
            }
        }
        if (schema.type === 'array' && schema.items) {
            definition.items = this.convertSchemaToDefinition(schema.items, schemas);
        }
        return definition;
    }
    convertPropertyToDefinition(schema, schemas, required) {
        // Handle $ref
        if (schema.$ref) {
            const refName = schema.$ref.replace('#/components/schemas/', '');
            const refSchema = schemas[refName];
            if (refSchema) {
                return this.convertPropertyToDefinition(refSchema, schemas, required);
            }
        }
        const property = {
            type: this.convertOpenAPITypeToDataType(schema.type || 'string'),
            description: schema.description,
            format: schema.format,
            enum: schema.enum,
            required: required,
            nullable: schema.nullable,
            example: schema.example,
            maxLength: schema.maxLength,
            minLength: schema.minLength,
            pattern: schema.pattern
        };
        if (schema.type === 'object' && schema.properties) {
            property.properties = {};
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                property.properties[propName] = this.convertPropertyToDefinition(propSchema, schemas, schema.required?.includes(propName));
            }
        }
        if (schema.type === 'array' && schema.items) {
            property.items = this.convertPropertyToDefinition(schema.items, schemas);
        }
        return property;
    }
    convertOpenAPITypeToDataType(openAPIType) {
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'integer': 'integer',
            'boolean': 'boolean',
            'array': 'array',
            'object': 'object'
        };
        return typeMap[openAPIType] || 'string';
    }
    // Generate OpenAPI spec from connection
    generateOpenAPISpec(connection) {
        const spec = {
            openapi: '3.0.3',
            info: {
                title: connection.name,
                description: connection.description,
                version: '1.0.0'
            },
            servers: [
                {
                    url: connection.baseUrl,
                    description: 'API Server'
                }
            ],
            paths: {},
            components: {
                schemas: {},
                securitySchemes: {}
            }
        };
        // Add security schemes
        if (connection.authenticationType !== 'None') {
            spec.components.securitySchemes = this.generateSecuritySchemes(connection);
        }
        // Add paths
        for (const endpoint of connection.endpoints) {
            if (!spec.paths[endpoint.path]) {
                spec.paths[endpoint.path] = {};
            }
            spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
                operationId: endpoint.name.replace(/\s+/g, '_'),
                summary: endpoint.name,
                description: endpoint.description,
                tags: endpoint.tags,
                parameters: endpoint.parameters?.map(p => ({
                    name: p.name,
                    in: p.in,
                    required: p.required,
                    schema: {
                        type: p.type,
                        enum: p.enum,
                        default: p.defaultValue
                    },
                    description: p.description
                })),
                requestBody: endpoint.requestBody ? {
                    content: {
                        'application/json': {
                            schema: this.convertDefinitionToOpenAPI(endpoint.requestBody)
                        }
                    }
                } : undefined,
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: endpoint.responseSchema ? {
                            'application/json': {
                                schema: this.convertDefinitionToOpenAPI(endpoint.responseSchema)
                            }
                        } : undefined
                    }
                }
            };
        }
        return JSON.stringify(spec, null, 2);
    }
    generateSecuritySchemes(connection) {
        switch (connection.authenticationType) {
            case 'OAuth2':
                return {
                    oauth2: {
                        type: 'oauth2',
                        flows: {
                            clientCredentials: {
                                tokenUrl: '/oauth/token',
                                scopes: {}
                            }
                        }
                    }
                };
            case 'Basic':
                return {
                    basicAuth: {
                        type: 'http',
                        scheme: 'basic'
                    }
                };
            case 'API_Key':
                return {
                    apiKey: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key'
                    }
                };
            case 'JWT':
                return {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                };
            default:
                return {};
        }
    }
    convertDefinitionToOpenAPI(definition) {
        const schema = {
            type: definition.type,
            description: definition.description
        };
        if (definition.properties) {
            schema.properties = {};
            schema.required = definition.required || [];
            for (const [name, prop] of Object.entries(definition.properties)) {
                schema.properties[name] = this.convertPropertyToOpenAPI(prop);
                if (prop.required) {
                    schema.required.push(name);
                }
            }
        }
        if (definition.items) {
            schema.items = this.convertDefinitionToOpenAPI(definition.items);
        }
        return schema;
    }
    convertPropertyToOpenAPI(property) {
        const schema = {
            type: property.type,
            description: property.description,
            format: property.format,
            enum: property.enum,
            nullable: property.nullable,
            maxLength: property.maxLength,
            minLength: property.minLength,
            pattern: property.pattern
        };
        if (property.properties) {
            schema.properties = {};
            for (const [name, prop] of Object.entries(property.properties)) {
                schema.properties[name] = this.convertPropertyToOpenAPI(prop);
            }
        }
        if (property.items) {
            schema.items = this.convertPropertyToOpenAPI(property.items);
        }
        // Remove undefined properties
        Object.keys(schema).forEach(key => {
            if (schema[key] === undefined) {
                delete schema[key];
            }
        });
        return schema;
    }
}
exports.OpenAPIImportService = OpenAPIImportService;
//# sourceMappingURL=OpenAPIImportService.js.map