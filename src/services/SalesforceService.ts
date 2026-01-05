import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SalesforceObject, SalesforceField } from '../types';
import { Logger } from '../utils/Logger';

const execAsync = promisify(exec);

export interface OrgInfo {
    username: string;
    orgId: string;
    instanceUrl: string;
    accessToken?: string;
    alias?: string;
}

export class SalesforceService {
    private logger: Logger;
    private cachedObjects: Map<string, SalesforceObject[]> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Get the default org info
     */
    async getDefaultOrg(): Promise<OrgInfo | null> {
        try {
            const { stdout } = await execAsync('sf org display --json');
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                return {
                    username: result.result.username,
                    orgId: result.result.id,
                    instanceUrl: result.result.instanceUrl,
                    accessToken: result.result.accessToken,
                    alias: result.result.alias
                };
            }
            
            return null;
        } catch (error: any) {
            this.logger.warn('No default org found', error.message);
            return null;
        }
    }

    /**
     * Get list of authorized orgs
     */
    async getAuthorizedOrgs(): Promise<OrgInfo[]> {
        try {
            const { stdout } = await execAsync('sf org list --json');
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                const orgs: OrgInfo[] = [];
                
                // Process non-scratch orgs
                if (result.result.nonScratchOrgs) {
                    for (const org of result.result.nonScratchOrgs) {
                        orgs.push({
                            username: org.username,
                            orgId: org.orgId,
                            instanceUrl: org.instanceUrl,
                            alias: org.alias
                        });
                    }
                }
                
                // Process scratch orgs
                if (result.result.scratchOrgs) {
                    for (const org of result.result.scratchOrgs) {
                        orgs.push({
                            username: org.username,
                            orgId: org.orgId,
                            instanceUrl: org.instanceUrl,
                            alias: org.alias
                        });
                    }
                }
                
                return orgs;
            }
            
            return [];
        } catch (error: any) {
            this.logger.error('Failed to get authorized orgs', error);
            return [];
        }
    }

    /**
     * Get all Salesforce objects
     */
    async getObjects(forceRefresh: boolean = false): Promise<SalesforceObject[]> {
        const cacheKey = 'objects';
        
        // Check cache
        if (!forceRefresh && this.isCacheValid(cacheKey)) {
            return this.cachedObjects.get(cacheKey) || [];
        }

        try {
            this.logger.info('Fetching Salesforce objects');
            
            const { stdout } = await execAsync('sf sobject list --json');
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                const objects: SalesforceObject[] = result.result.map((obj: any) => ({
                    name: obj.name,
                    label: obj.label || obj.name,
                    apiName: obj.name,
                    fields: [],
                    isCustom: obj.name.endsWith('__c'),
                    keyPrefix: obj.keyPrefix
                }));

                // Update cache
                this.cachedObjects.set(cacheKey, objects);
                this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

                return objects;
            }
            
            return [];
        } catch (error: any) {
            this.logger.error('Failed to fetch Salesforce objects', error);
            throw new Error('Failed to fetch Salesforce objects. Make sure you are connected to an org.');
        }
    }

    /**
     * Get fields for a specific object
     */
    async getObjectFields(objectName: string, forceRefresh: boolean = false): Promise<SalesforceField[]> {
        const cacheKey = `fields_${objectName}`;
        
        // Check cache
        if (!forceRefresh) {
            const cached = this.cachedObjects.get(cacheKey);
            if (cached && this.isCacheValid(cacheKey)) {
                return cached[0]?.fields || [];
            }
        }

        try {
            this.logger.info(`Fetching fields for: ${objectName}`);
            
            const { stdout } = await execAsync(`sf sobject describe --sobject ${objectName} --json`);
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                const fields: SalesforceField[] = result.result.fields.map((field: any) => ({
                    name: field.name,
                    label: field.label,
                    type: field.type,
                    length: field.length,
                    precision: field.precision,
                    scale: field.scale,
                    required: !field.nillable && !field.defaultedOnCreate,
                    unique: field.unique,
                    externalId: field.externalId,
                    referenceTo: field.referenceTo,
                    picklistValues: field.picklistValues?.map((pv: any) => ({
                        value: pv.value,
                        label: pv.label,
                        active: pv.active,
                        defaultValue: pv.defaultValue
                    })),
                    defaultValue: field.defaultValue,
                    formula: field.calculatedFormula,
                    calculated: field.calculated,
                    createable: field.createable,
                    updateable: field.updateable
                }));

                // Update cache
                const objectData: SalesforceObject = {
                    name: objectName,
                    label: result.result.label,
                    apiName: objectName,
                    fields,
                    isCustom: objectName.endsWith('__c'),
                    keyPrefix: result.result.keyPrefix
                };
                
                this.cachedObjects.set(cacheKey, [objectData]);
                this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

                return fields;
            }
            
            return [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch fields for ${objectName}`, error);
            throw new Error(`Failed to fetch fields for ${objectName}`);
        }
    }

    /**
     * Execute SOQL query
     */
    async executeQuery(query: string): Promise<any[]> {
        try {
            this.logger.info(`Executing SOQL: ${query}`);
            
            const escapedQuery = query.replace(/"/g, '\\"');
            const { stdout } = await execAsync(`sf data query --query "${escapedQuery}" --json`);
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                return result.result.records || [];
            }
            
            return [];
        } catch (error: any) {
            this.logger.error('SOQL query failed', error);
            throw new Error('SOQL query failed: ' + error.message);
        }
    }

    /**
     * Get record count for an object
     */
    async getRecordCount(objectName: string): Promise<number> {
        try {
            const records = await this.executeQuery(`SELECT COUNT() FROM ${objectName}`);
            return records[0]?.expr0 || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Deploy metadata to org
     */
    async deployMetadata(sourcePath: string): Promise<{ success: boolean; message: string }> {
        try {
            this.logger.info(`Deploying metadata from: ${sourcePath}`);
            
            const { stdout, stderr } = await execAsync(
                `sf project deploy start --source-dir ${sourcePath} --json`
            );
            
            const result = JSON.parse(stdout);
            
            if (result.status === 0) {
                return { success: true, message: 'Deployment successful' };
            } else {
                return { 
                    success: false, 
                    message: result.message || stderr || 'Deployment failed' 
                };
            }
        } catch (error: any) {
            this.logger.error('Deployment failed', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Retrieve metadata from org
     */
    async retrieveMetadata(metadataType: string, memberNames: string[]): Promise<{ success: boolean; message: string }> {
        try {
            const members = memberNames.join(',');
            this.logger.info(`Retrieving ${metadataType}: ${members}`);
            
            const { stdout } = await execAsync(
                `sf project retrieve start --metadata "${metadataType}:${members}" --json`
            );
            
            const result = JSON.parse(stdout);
            
            if (result.status === 0) {
                return { success: true, message: 'Retrieve successful' };
            } else {
                return { success: false, message: result.message || 'Retrieve failed' };
            }
        } catch (error: any) {
            this.logger.error('Retrieve failed', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get existing Named Credentials
     */
    async getNamedCredentials(): Promise<string[]> {
        try {
            const { stdout } = await execAsync(
                'sf data query --query "SELECT DeveloperName FROM NamedCredential" --json'
            );
            
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result?.records) {
                return result.result.records.map((r: any) => r.DeveloperName);
            }
            
            return [];
        } catch (error: any) {
            this.logger.warn('Failed to fetch Named Credentials', error.message);
            return [];
        }
    }

    /**
     * Get existing External Services
     */
    async getExternalServices(): Promise<string[]> {
        try {
            const { stdout } = await execAsync(
                'sf data query --query "SELECT DeveloperName FROM ExternalServiceRegistration" --json'
            );
            
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result?.records) {
                return result.result.records.map((r: any) => r.DeveloperName);
            }
            
            return [];
        } catch (error: any) {
            this.logger.warn('Failed to fetch External Services', error.message);
            return [];
        }
    }

    /**
     * Open org in browser
     */
    async openOrg(path?: string): Promise<void> {
        try {
            const command = path 
                ? `sf org open --path "${path}"`
                : 'sf org open';
            
            await execAsync(command);
        } catch (error: any) {
            this.logger.error('Failed to open org', error);
            throw new Error('Failed to open org in browser');
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cachedObjects.clear();
        this.cacheExpiry.clear();
        this.logger.info('Cache cleared');
    }

    /**
     * Check if cache is valid
     */
    private isCacheValid(key: string): boolean {
        const expiry = this.cacheExpiry.get(key);
        return expiry !== undefined && Date.now() < expiry;
    }

    /**
     * Get standard objects list
     */
    getStandardObjects(): string[] {
        return [
            'Account',
            'Contact',
            'Lead',
            'Opportunity',
            'Case',
            'Task',
            'Event',
            'User',
            'Product2',
            'Pricebook2',
            'PricebookEntry',
            'Order',
            'OrderItem',
            'Contract',
            'Asset',
            'Campaign',
            'CampaignMember'
        ];
    }

    /**
     * Suggest field mappings based on name similarity
     */
    suggestFieldMappings(
        salesforceFields: SalesforceField[],
        externalFields: Array<{ name: string; type: string }>
    ): Array<{ salesforceField: string; externalField: string; confidence: number }> {
        const suggestions: Array<{ salesforceField: string; externalField: string; confidence: number }> = [];

        for (const extField of externalFields) {
            let bestMatch = { field: '', confidence: 0 };

            for (const sfField of salesforceFields) {
                const confidence = this.calculateNameSimilarity(
                    sfField.name.toLowerCase(),
                    extField.name.toLowerCase()
                );

                if (confidence > bestMatch.confidence && confidence > 0.5) {
                    bestMatch = { field: sfField.name, confidence };
                }
            }

            if (bestMatch.field) {
                suggestions.push({
                    salesforceField: bestMatch.field,
                    externalField: extField.name,
                    confidence: bestMatch.confidence
                });
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Calculate name similarity using Levenshtein distance
     */
    private calculateNameSimilarity(str1: string, str2: string): number {
        // Remove common prefixes/suffixes
        const clean1 = str1.replace(/^(ext_|external_|sf_|salesforce_)/i, '').replace(/__c$/i, '');
        const clean2 = str2.replace(/^(ext_|external_|sf_|salesforce_)/i, '').replace(/__c$/i, '');

        if (clean1 === clean2) return 1;

        const longer = clean1.length > clean2.length ? clean1 : clean2;
        const shorter = clean1.length > clean2.length ? clean2 : clean1;

        if (longer.length === 0) return 1;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}
