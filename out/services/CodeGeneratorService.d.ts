import { ExternalConnection, GenerationOptions, GeneratedFile } from '../types';
import { Logger } from '../utils/Logger';
export declare class CodeGeneratorService {
    private logger;
    constructor(logger: Logger);
    generateApexClasses(connection: ExternalConnection, options: GenerationOptions): Promise<GeneratedFile[]>;
    private generateServiceClass;
    private generateEndpointMethod;
    private generateAsyncMethods;
    private generateWrapperClasses;
    private generateWrapperClass;
    private generateTestClass;
    private generateMockClass;
    generateNamedCredential(connection: ExternalConnection): Promise<GeneratedFile>;
    generateExternalService(connection: ExternalConnection): Promise<GeneratedFile[]>;
    private generateMetaXml;
    writeGeneratedFile(file: GeneratedFile): Promise<void>;
    private sanitizeClassName;
    private sanitizeMethodName;
    private sanitizeVariableName;
    private capitalizeFirst;
    private convertToApexType;
}
//# sourceMappingURL=CodeGeneratorService.d.ts.map