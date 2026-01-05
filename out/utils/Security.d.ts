/**
 * Security utilities for input validation and sanitization
 */
/**
 * Validate and sanitize HTTP method
 */
export declare function sanitizeHttpMethod(method: string): string;
/**
 * Validate and sanitize API endpoint path
 * Prevents path traversal and command injection
 */
export declare function sanitizeEndpoint(endpoint: string): string;
/**
 * Validate and sanitize JSON body
 */
export declare function sanitizeJsonBody(body: string | undefined): string | undefined;
/**
 * Escape string for shell command (prevents command injection)
 */
export declare function escapeShellArg(arg: string): string;
/**
 * Validate URL format
 */
export declare function isValidUrl(url: string): boolean;
/**
 * Validate Salesforce instance URL
 */
export declare function isValidSalesforceUrl(url: string): boolean;
/**
 * Sanitize connection name (for file/class names)
 */
export declare function sanitizeConnectionName(name: string): string;
/**
 * Sanitize for use as Apex class name
 */
export declare function sanitizeApexClassName(name: string): string;
/**
 * Validate API key header name
 */
export declare function sanitizeHeaderName(header: string): string;
/**
 * Rate limiting helper
 */
export declare class RateLimiter {
    private requests;
    private maxRequests;
    private windowMs;
    constructor(maxRequests?: number, windowMs?: number);
    isAllowed(key: string): boolean;
    reset(key: string): void;
}
/**
 * Sanitize error messages to prevent information leakage
 */
export declare function sanitizeErrorMessage(error: any): string;
//# sourceMappingURL=Security.d.ts.map