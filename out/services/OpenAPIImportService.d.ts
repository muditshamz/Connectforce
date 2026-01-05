import { ExternalConnection } from '../types';
import { Logger } from '../utils/Logger';
export declare class OpenAPIImportService {
    private logger;
    constructor(logger: Logger);
    importFromSpec(content: string): Promise<ExternalConnection>;
    private extractAuthenticationType;
    private convertPathsToEndpoints;
    private createEndpoint;
    private extractParameters;
    private extractRequestBody;
    private extractResponseSchema;
    private convertSchemaToDefinition;
    private convertPropertyToDefinition;
    private convertOpenAPITypeToDataType;
    generateOpenAPISpec(connection: ExternalConnection): string;
    private generateSecuritySchemes;
    private convertDefinitionToOpenAPI;
    private convertPropertyToOpenAPI;
}
//# sourceMappingURL=OpenAPIImportService.d.ts.map