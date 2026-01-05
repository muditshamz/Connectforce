import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import { 
    ExternalConnection, 
    Endpoint, 
    Parameter, 
    SchemaDefinition,
    PropertyDefinition,
    DataType,
    HttpMethod,
    OpenAPISpec,
    AuthenticationType
} from '../types';
import { Logger } from '../utils/Logger';
import { isValidUrl, sanitizeConnectionName } from '../utils/Security';

const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB max
const MAX_ENDPOINTS = 500;

export class OpenAPIImportService {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async importFromSpec(content: string): Promise<ExternalConnection> {
        this.logger.info('Importing OpenAPI specification');

        // Validate input size
        if (!content || content.length === 0) {
            throw new Error('Empty specification provided');
        }
        
        if (content.length > MAX_SPEC_SIZE) {
            throw new Error('Specification too large (max 10MB)');
        }

        let spec: OpenAPISpec;
        
        try {
            // Try parsing as JSON first
            spec = JSON.parse(content);
        } catch {
            // Try parsing as YAML
            try {
                spec = yaml.load(content, { 
                    schema: yaml.JSON_SCHEMA // Use safe schema to prevent code execution
                }) as OpenAPISpec;
            } catch (e) {
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
            if (baseUrl && !baseUrl.startsWith('{') && !isValidUrl(baseUrl)) {
                this.logger.warn('Invalid base URL in spec, using empty');
                baseUrl = '';
            }
        }

        // Extract authentication type
        const authType = this.extractAuthenticationType(spec);

        // Convert paths to endpoints
        const endpoints = this.convertPathsToEndpoints(spec);

        const now = new Date().toISOString();

        const connection: ExternalConnection = {
            id: uuidv4(),
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

    private extractAuthenticationType(spec: OpenAPISpec): AuthenticationType {
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

    private convertPathsToEndpoints(spec: OpenAPISpec): Endpoint[] {
        const endpoints: Endpoint[] = [];
        const schemas = spec.components?.schemas || {};

        for (const [path, pathItem] of Object.entries(spec.paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
                    const endpoint = this.createEndpoint(
                        path,
                        method.toUpperCase() as HttpMethod,
                        operation,
                        schemas
                    );
                    endpoints.push(endpoint);
                }
            }
        }

        return endpoints;
    }

    private createEndpoint(
        path: string,
        method: HttpMethod,
        operation: any,
        schemas: Record<string, any>
    ): Endpoint {
        const endpoint: Endpoint = {
            id: uuidv4(),
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

    private extractParameters(parameters: any[]): Parameter[] {
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

    private extractRequestBody(requestBody: any, schemas: Record<string, any>): SchemaDefinition | undefined {
        if (!requestBody?.content) {
            return undefined;
        }

        const jsonContent = requestBody.content['application/json'];
        if (!jsonContent?.schema) {
            return undefined;
        }

        return this.convertSchemaToDefinition(jsonContent.schema, schemas);
    }

    private extractResponseSchema(responses: Record<string, any>, schemas: Record<string, any>): SchemaDefinition | undefined {
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

    private convertSchemaToDefinition(schema: any, schemas: Record<string, any>): SchemaDefinition {
        // Handle $ref
        if (schema.$ref) {
            const refName = schema.$ref.replace('#/components/schemas/', '');
            const refSchema = schemas[refName];
            if (refSchema) {
                return this.convertSchemaToDefinition(refSchema, schemas);
            }
        }

        const definition: SchemaDefinition = {
            type: this.convertOpenAPITypeToDataType(schema.type || 'object'),
            description: schema.description,
            example: schema.example,
            required: schema.required
        };

        if (schema.type === 'object' && schema.properties) {
            definition.properties = {};
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                definition.properties[propName] = this.convertPropertyToDefinition(
                    propSchema as any,
                    schemas,
                    schema.required?.includes(propName)
                );
            }
        }

        if (schema.type === 'array' && schema.items) {
            definition.items = this.convertSchemaToDefinition(schema.items, schemas);
        }

        return definition;
    }

    private convertPropertyToDefinition(
        schema: any,
        schemas: Record<string, any>,
        required?: boolean
    ): PropertyDefinition {
        // Handle $ref
        if (schema.$ref) {
            const refName = schema.$ref.replace('#/components/schemas/', '');
            const refSchema = schemas[refName];
            if (refSchema) {
                return this.convertPropertyToDefinition(refSchema, schemas, required);
            }
        }

        const property: PropertyDefinition = {
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
                property.properties[propName] = this.convertPropertyToDefinition(
                    propSchema as any,
                    schemas,
                    schema.required?.includes(propName)
                );
            }
        }

        if (schema.type === 'array' && schema.items) {
            property.items = this.convertPropertyToDefinition(schema.items, schemas);
        }

        return property;
    }

    private convertOpenAPITypeToDataType(openAPIType: string): DataType {
        const typeMap: Record<string, DataType> = {
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
    generateOpenAPISpec(connection: ExternalConnection): string {
        const spec: any = {
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

    private generateSecuritySchemes(connection: ExternalConnection): any {
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

    private convertDefinitionToOpenAPI(definition: SchemaDefinition): any {
        const schema: any = {
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

    private convertPropertyToOpenAPI(property: PropertyDefinition): any {
        const schema: any = {
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
