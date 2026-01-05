/**
 * Connectforce - Core Types
 */
export type AuthenticationType = 'OAuth2' | 'Basic' | 'API_Key' | 'JWT' | 'Certificate' | 'None';
export interface OAuth2Config {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    clientId: string;
    clientSecret?: string;
    scope?: string;
    callbackUrl?: string;
}
export interface BasicAuthConfig {
    username: string;
    password?: string;
}
export interface ApiKeyConfig {
    headerName: string;
    apiKey?: string;
    location: 'header' | 'query';
}
export interface JWTConfig {
    issuer: string;
    subject: string;
    audience: string;
    privateKey?: string;
    algorithm: 'RS256' | 'RS384' | 'RS512';
    expirationTime: number;
}
export interface CertificateConfig {
    certificateName: string;
    certificateData?: string;
}
export type AuthenticationConfig = OAuth2Config | BasicAuthConfig | ApiKeyConfig | JWTConfig | CertificateConfig;
export interface ExternalConnection {
    id: string;
    name: string;
    description?: string;
    baseUrl: string;
    authenticationType: AuthenticationType;
    authConfig?: AuthenticationConfig;
    headers?: Record<string, string>;
    timeout?: number;
    retryConfig?: RetryConfig;
    endpoints: Endpoint[];
    createdAt: string;
    updatedAt: string;
    status: ConnectionStatus;
    tags?: string[];
    erpType?: ERPType;
}
export interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[];
}
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'testing';
export type ERPType = 'NetSuite' | 'SAP' | 'Dynamics365' | 'Acumatica' | 'QuickBooks' | 'Xero' | 'Custom';
export interface Endpoint {
    id: string;
    name: string;
    description?: string;
    path: string;
    method: HttpMethod;
    parameters?: Parameter[];
    requestBody?: SchemaDefinition;
    responseSchema?: SchemaDefinition;
    headers?: Record<string, string>;
    tags?: string[];
}
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface Parameter {
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
    type: DataType;
    description?: string;
    defaultValue?: string;
    enum?: string[];
}
export interface SchemaDefinition {
    type: DataType;
    properties?: Record<string, PropertyDefinition>;
    items?: SchemaDefinition;
    required?: string[];
    description?: string;
    example?: any;
}
export interface PropertyDefinition {
    type: DataType;
    description?: string;
    format?: string;
    enum?: string[];
    items?: PropertyDefinition;
    properties?: Record<string, PropertyDefinition>;
    required?: boolean;
    nullable?: boolean;
    example?: any;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
}
export type DataType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'date' | 'datetime';
export interface FieldMapping {
    id: string;
    name: string;
    description?: string;
    connectionId: string;
    salesforceObject: string;
    externalEntity: string;
    mappings: FieldMap[];
    syncDirection: SyncDirection;
    syncMode: SyncMode;
    filterCondition?: string;
    transformations?: Transformation[];
    createdAt: string;
    updatedAt: string;
}
export interface FieldMap {
    id: string;
    salesforceField: string;
    salesforceFieldType: string;
    externalField: string;
    externalFieldType: string;
    direction: SyncDirection;
    transformation?: Transformation;
    defaultValue?: string;
    required: boolean;
    isKey: boolean;
}
export type SyncDirection = 'salesforce_to_external' | 'external_to_salesforce' | 'bidirectional';
export type SyncMode = 'create' | 'update' | 'upsert' | 'delete' | 'full_sync';
export interface Transformation {
    type: TransformationType;
    config: Record<string, any>;
}
export type TransformationType = 'uppercase' | 'lowercase' | 'trim' | 'format_date' | 'format_number' | 'concat' | 'split' | 'lookup' | 'formula' | 'custom';
export interface SalesforceObject {
    name: string;
    label: string;
    apiName: string;
    fields: SalesforceField[];
    isCustom: boolean;
    keyPrefix?: string;
}
export interface SalesforceField {
    name: string;
    label: string;
    type: string;
    length?: number;
    precision?: number;
    scale?: number;
    required: boolean;
    unique: boolean;
    externalId: boolean;
    referenceTo?: string[];
    picklistValues?: PicklistValue[];
    defaultValue?: any;
    formula?: string;
    calculated: boolean;
    createable: boolean;
    updateable: boolean;
}
export interface PicklistValue {
    value: string;
    label: string;
    active: boolean;
    defaultValue: boolean;
}
export interface OpenAPISpec {
    openapi?: string;
    swagger?: string;
    info: {
        title: string;
        description?: string;
        version: string;
    };
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    paths: Record<string, Record<string, OpenAPIOperation>>;
    components?: {
        schemas?: Record<string, any>;
        securitySchemes?: Record<string, any>;
    };
}
export interface OpenAPIOperation {
    operationId?: string;
    summary?: string;
    description?: string;
    parameters?: any[];
    requestBody?: any;
    responses?: Record<string, any>;
    tags?: string[];
    security?: any[];
}
export interface GenerationOptions {
    generateTestClass: boolean;
    generateMockService: boolean;
    includeComments: boolean;
    useBulkAPI: boolean;
    asyncProcessing: boolean;
    errorHandling: 'basic' | 'advanced';
    namingConvention: 'camelCase' | 'PascalCase';
    outputPath: string;
}
export interface GeneratedFile {
    fileName: string;
    content: string;
    type: 'apex' | 'meta-xml' | 'namedCredential' | 'externalService' | 'flow';
    path: string;
}
export interface NamedCredential {
    fullName: string;
    label: string;
    endpoint: string;
    principalType: 'NamedUser' | 'PerUser' | 'Anonymous';
    protocol: 'NoAuthentication' | 'Password' | 'OAuth' | 'Jwt' | 'JwtExchange' | 'Certificate';
    authProvider?: string;
    certificate?: string;
    generateAuthorizationHeader: boolean;
    allowMergeFieldsInBody: boolean;
    allowMergeFieldsInHeader: boolean;
}
export interface ExternalServiceRegistration {
    fullName: string;
    label: string;
    description?: string;
    namedCredential: string;
    schema: string;
    schemaType: 'OpenApi' | 'OpenApi3';
    status: 'Active' | 'Inactive';
    operations?: ExternalServiceOperation[];
}
export interface ExternalServiceOperation {
    name: string;
    active: boolean;
}
export interface SyncStatus {
    connectionId: string;
    lastSyncTime?: string;
    status: 'success' | 'error' | 'running' | 'pending';
    recordsProcessed?: number;
    recordsFailed?: number;
    errorMessage?: string;
    duration?: number;
}
export interface ERPTemplate {
    id: string;
    name: string;
    erpType: ERPType;
    description: string;
    icon: string;
    defaultEndpoints: Endpoint[];
    defaultMappings: Partial<FieldMapping>[];
    authType: AuthenticationType;
    documentationUrl?: string;
}
export interface ExtensionConfig {
    defaultAuthType: AuthenticationType;
    apexOutputPath: string;
    namedCredentialPath: string;
    externalServicePath: string;
    generateTestClasses: boolean;
    enableMockServices: boolean;
    autoSyncFieldMappings: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export interface IntegrationEvent {
    type: 'connection_created' | 'connection_updated' | 'connection_deleted' | 'mapping_created' | 'mapping_updated' | 'mapping_deleted' | 'sync_started' | 'sync_completed' | 'sync_failed' | 'code_generated' | 'deployed';
    timestamp: string;
    data: any;
}
export interface ConnectionTreeItem {
    id: string;
    name: string;
    type: 'connection' | 'endpoint' | 'field';
    status?: ConnectionStatus;
    children?: ConnectionTreeItem[];
    metadata?: any;
}
export interface MappingTreeItem {
    id: string;
    name: string;
    type: 'mapping' | 'field';
    direction?: SyncDirection;
    children?: MappingTreeItem[];
}
export interface WebviewMessage {
    command: string;
    data?: any;
}
export interface WebviewResponse {
    success: boolean;
    data?: any;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map