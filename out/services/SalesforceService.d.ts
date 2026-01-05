import { SalesforceObject, SalesforceField } from '../types';
import { Logger } from '../utils/Logger';
export interface OrgInfo {
    username: string;
    orgId: string;
    instanceUrl: string;
    accessToken?: string;
    alias?: string;
}
export declare class SalesforceService {
    private logger;
    private cachedObjects;
    private cacheExpiry;
    private readonly CACHE_DURATION;
    constructor(logger: Logger);
    /**
     * Get the default org info
     */
    getDefaultOrg(): Promise<OrgInfo | null>;
    /**
     * Get list of authorized orgs
     */
    getAuthorizedOrgs(): Promise<OrgInfo[]>;
    /**
     * Get all Salesforce objects
     */
    getObjects(forceRefresh?: boolean): Promise<SalesforceObject[]>;
    /**
     * Get fields for a specific object
     */
    getObjectFields(objectName: string, forceRefresh?: boolean): Promise<SalesforceField[]>;
    /**
     * Execute SOQL query
     */
    executeQuery(query: string): Promise<any[]>;
    /**
     * Get record count for an object
     */
    getRecordCount(objectName: string): Promise<number>;
    /**
     * Deploy metadata to org
     */
    deployMetadata(sourcePath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Retrieve metadata from org
     */
    retrieveMetadata(metadataType: string, memberNames: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get existing Named Credentials
     */
    getNamedCredentials(): Promise<string[]>;
    /**
     * Get existing External Services
     */
    getExternalServices(): Promise<string[]>;
    /**
     * Open org in browser
     */
    openOrg(path?: string): Promise<void>;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Check if cache is valid
     */
    private isCacheValid;
    /**
     * Get standard objects list
     */
    getStandardObjects(): string[];
    /**
     * Suggest field mappings based on name similarity
     */
    suggestFieldMappings(salesforceFields: SalesforceField[], externalFields: Array<{
        name: string;
        type: string;
    }>): Array<{
        salesforceField: string;
        externalField: string;
        confidence: number;
    }>;
    /**
     * Calculate name similarity using Levenshtein distance
     */
    private calculateNameSimilarity;
    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance;
}
//# sourceMappingURL=SalesforceService.d.ts.map