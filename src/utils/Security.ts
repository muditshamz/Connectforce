/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validate and sanitize HTTP method
 */
export function sanitizeHttpMethod(method: string): string {
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const upperMethod = (method || 'GET').toUpperCase().trim();
    
    if (!allowedMethods.includes(upperMethod)) {
        throw new Error(`Invalid HTTP method: ${method}`);
    }
    
    return upperMethod;
}

/**
 * Validate and sanitize API endpoint path
 * Prevents path traversal and command injection
 */
export function sanitizeEndpoint(endpoint: string): string {
    if (!endpoint || typeof endpoint !== 'string') {
        throw new Error('Endpoint is required');
    }

    // Remove any null bytes
    let sanitized = endpoint.replace(/\0/g, '');
    
    // Prevent path traversal
    if (sanitized.includes('..')) {
        throw new Error('Path traversal detected in endpoint');
    }
    
    // Prevent command injection characters
    const dangerousChars = /[;&|`$(){}[\]<>\\!#]/g;
    if (dangerousChars.test(sanitized)) {
        throw new Error('Invalid characters in endpoint');
    }
    
    // Ensure it starts with /
    if (!sanitized.startsWith('/')) {
        sanitized = '/' + sanitized;
    }
    
    // URL encode special characters but preserve path structure
    // Split by path separator and query string
    const [path, query] = sanitized.split('?');
    const encodedPath = path
        .split('/')
        .map(segment => encodeURIComponent(decodeURIComponent(segment)))
        .join('/');
    
    if (query) {
        // Validate query string - should be key=value pairs
        const queryParts = query.split('&');
        const validatedQuery = queryParts
            .map(part => {
                const [key, ...valueParts] = part.split('=');
                const value = valueParts.join('=');
                if (key) {
                    return `${encodeURIComponent(decodeURIComponent(key))}=${encodeURIComponent(decodeURIComponent(value || ''))}`;
                }
                return '';
            })
            .filter(Boolean)
            .join('&');
        return encodedPath + '?' + validatedQuery;
    }
    
    return encodedPath;
}

/**
 * Validate and sanitize JSON body
 */
export function sanitizeJsonBody(body: string | undefined): string | undefined {
    if (!body || body.trim() === '') {
        return undefined;
    }
    
    try {
        // Parse and re-stringify to ensure valid JSON and remove any issues
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed);
    } catch (error) {
        throw new Error('Invalid JSON in request body');
    }
}

/**
 * Escape string for shell command (prevents command injection)
 */
export function escapeShellArg(arg: string): string {
    // Replace single quotes with escaped version
    // Wrap in single quotes for shell safety
    return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Validate Salesforce instance URL
 */
export function isValidSalesforceUrl(url: string): boolean {
    if (!isValidUrl(url)) {
        return false;
    }
    
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        
        // Valid Salesforce domains
        const validDomains = [
            '.salesforce.com',
            '.force.com',
            '.my.salesforce.com',
            '.lightning.force.com',
            '.scratch.my.salesforce.com',
            '.sandbox.my.salesforce.com',
            '.develop.my.salesforce.com',
            '.cloudforce.com',
            '.database.com'
        ];
        
        return validDomains.some(domain => hostname.endsWith(domain)) || 
               hostname === 'localhost' ||
               hostname.endsWith('.localhost');
    } catch {
        return false;
    }
}

/**
 * Sanitize connection name (for file/class names)
 */
export function sanitizeConnectionName(name: string): string {
    if (!name || typeof name !== 'string') {
        throw new Error('Connection name is required');
    }
    
    // Remove any dangerous characters, keep only alphanumeric, spaces, hyphens, underscores
    let sanitized = name.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    
    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 100);
    
    if (sanitized.length === 0) {
        throw new Error('Invalid connection name');
    }
    
    return sanitized;
}

/**
 * Sanitize for use as Apex class name
 */
export function sanitizeApexClassName(name: string): string {
    // Remove non-alphanumeric characters
    let sanitized = name.replace(/[^a-zA-Z0-9]/g, '');
    
    // Ensure it starts with a letter
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'C' + sanitized;
    }
    
    // Limit length (Apex class names max 40 chars)
    sanitized = sanitized.substring(0, 40);
    
    if (sanitized.length === 0) {
        throw new Error('Invalid class name');
    }
    
    return sanitized;
}

/**
 * Validate API key header name
 */
export function sanitizeHeaderName(header: string): string {
    if (!header || typeof header !== 'string') {
        throw new Error('Header name is required');
    }
    
    // HTTP header names should only contain valid characters
    const validHeaderRegex = /^[a-zA-Z0-9\-_]+$/;
    const sanitized = header.trim();
    
    if (!validHeaderRegex.test(sanitized)) {
        throw new Error('Invalid header name');
    }
    
    return sanitized;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 100, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    isAllowed(key: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(key) || [];
        
        // Remove old timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
        
        if (validTimestamps.length >= this.maxRequests) {
            return false;
        }
        
        validTimestamps.push(now);
        this.requests.set(key, validTimestamps);
        return true;
    }

    reset(key: string): void {
        this.requests.delete(key);
    }
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: any): string {
    if (!error) {
        return 'An unknown error occurred';
    }
    
    const message = error.message || String(error);
    
    // Remove potential sensitive information
    let sanitized = message
        .replace(/password[=:]\s*\S+/gi, 'password=***')
        .replace(/token[=:]\s*\S+/gi, 'token=***')
        .replace(/key[=:]\s*\S+/gi, 'key=***')
        .replace(/secret[=:]\s*\S+/gi, 'secret=***')
        .replace(/Bearer\s+\S+/gi, 'Bearer ***')
        .replace(/Basic\s+\S+/gi, 'Basic ***');
    
    // Limit length
    if (sanitized.length > 500) {
        sanitized = sanitized.substring(0, 500) + '...';
    }
    
    return sanitized;
}
