import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/Logger';

const execAsync = promisify(exec);

interface OrgInfo {
    username: string;
    instanceUrl: string;
    accessToken: string;
    apiVersion: string;
}

interface ApiResponse {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    duration: number;
    size: number;
}

export class RestExplorerPanel {
    public static currentPanel: RestExplorerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private logger: Logger;
    private currentOrg: OrgInfo | null = null;
    private requestCount: number = 0;
    private lastRequestTime: number = 0;

    public static createOrShow(extensionUri: vscode.Uri, logger: Logger) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (RestExplorerPanel.currentPanel) {
            RestExplorerPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'restExplorer',
            'Connectforce REST Explorer',
            column || vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        RestExplorerPanel.currentPanel = new RestExplorerPanel(panel, logger);
    }

    private constructor(panel: vscode.WebviewPanel, logger: Logger) {
        this._panel = panel;
        this.logger = logger;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(m => this._handleMessage(m), null, this._disposables);
        
        // Get org info on startup
        this._getOrgInfo();
    }

    private async _getOrgInfo() {
        try {
            this.logger.info('Getting org info...');
            const { stdout } = await execAsync('sf org display --json', { timeout: 30000 });
            const result = JSON.parse(stdout);
            
            if (result.status === 0 && result.result) {
                this.currentOrg = {
                    username: result.result.username,
                    instanceUrl: result.result.instanceUrl,
                    accessToken: result.result.accessToken,
                    apiVersion: result.result.apiVersion || 'v60.0'
                };
                
                this.logger.info(`Connected to org: ${this.currentOrg.username}`);
                
                this._panel.webview.postMessage({ 
                    command: 'orgInfo', 
                    org: {
                        username: this.currentOrg.username,
                        instanceUrl: this.currentOrg.instanceUrl,
                        apiVersion: this.currentOrg.apiVersion
                    }
                });
            } else {
                throw new Error('No org found');
            }
        } catch (error: any) {
            this.logger.error('Failed to get org info', error);
            this._panel.webview.postMessage({ 
                command: 'orgError', 
                error: 'No default org found. Run "sf org login web" to authenticate.' 
            });
        }
    }

    private async _handleMessage(message: any) {
        this.logger.info(`Received message: ${message.command}`);
        
        switch (message.command) {
            case 'refreshOrg':
                await this._getOrgInfo();
                break;
            case 'executeRequest':
                await this._executeRequest(message.data);
                break;
            case 'getObjectFields':
                await this._getObjectFields(message.objectName);
                break;
        }
    }

    private async _getObjectFields(objectName: string) {
        if (!objectName || !this.currentOrg) {
            return;
        }

        try {
            this.logger.info(`Fetching fields for: ${objectName}`);
            
            const endpoint = `/services/data/v60.0/sobjects/${objectName}/describe`;
            const command = `sf api request rest "${endpoint}" --method GET`;
            
            const { stdout } = await execAsync(command, { timeout: 30000 });
            
            let result;
            try {
                result = JSON.parse(stdout);
            } catch {
                throw new Error('Invalid response');
            }

            if (result && result.fields && Array.isArray(result.fields)) {
                const fields = result.fields.map((f: any) => ({
                    name: f.name,
                    label: f.label,
                    type: f.type,
                    required: !f.nillable && !f.defaultedOnCreate
                })).sort((a: any, b: any) => a.name.localeCompare(b.name));

                this._panel.webview.postMessage({
                    command: 'objectFields',
                    objectName: objectName,
                    fields: fields
                });
            } else {
                throw new Error('No fields found');
            }
        } catch (error: any) {
            this.logger.error(`Failed to get fields for ${objectName}`, error);
            this._panel.webview.postMessage({
                command: 'objectFieldsError',
                objectName: objectName,
                error: error.message || 'Failed to load fields'
            });
        }
    }

    private async _executeRequest(data: {
        method: string;
        endpoint: string;
        body?: string;
    }) {
        this.logger.info(`Execute request: ${data.method} ${data.endpoint}`);
        
        if (!this.currentOrg) {
            this._panel.webview.postMessage({ 
                command: 'requestError', 
                error: 'No org connected. Please connect to a Salesforce org first.' 
            });
            return;
        }

        // Simple rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < 1000) {
            this.requestCount++;
            if (this.requestCount > 30) {
                this._panel.webview.postMessage({ 
                    command: 'requestError', 
                    error: 'Rate limit exceeded. Please wait a moment.' 
                });
                return;
            }
        } else {
            this.requestCount = 1;
            this.lastRequestTime = now;
        }

        this._panel.webview.postMessage({ command: 'requestStarted' });

        const startTime = Date.now();

        try {
            // Validate method
            const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
            const method = (data.method || 'GET').toUpperCase();
            if (!allowedMethods.includes(method)) {
                throw new Error(`Invalid HTTP method: ${method}`);
            }

            // Build endpoint
            let endpoint = data.endpoint || '';
            if (!endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
            if (!endpoint.startsWith('/services')) {
                endpoint = '/services/data/v60.0' + endpoint;
            }

            this.logger.info(`Final endpoint: ${endpoint}`);

            // Build the sf command - NO --json flag as it's not supported
            let command = `sf api request rest "${endpoint}" --method ${method}`;
            
            if (data.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
                // Validate JSON
                try {
                    JSON.parse(data.body);
                } catch {
                    throw new Error('Invalid JSON in request body');
                }
                const escapedBody = data.body.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                command += ` --body "${escapedBody}"`;
            }

            this.logger.info(`Executing: ${command}`);

            const { stdout, stderr } = await execAsync(command, { 
                timeout: 120000,
                maxBuffer: 10 * 1024 * 1024 
            });
            
            const duration = Date.now() - startTime;
            
            this.logger.info(`Completed in ${duration}ms`);
            
            let responseBody: any;
            let statusCode = 200;
            let statusText = 'OK';
            
            // The response is direct JSON from Salesforce API
            try {
                responseBody = JSON.parse(stdout);
            } catch {
                // If not JSON, return as text
                responseBody = stdout || stderr;
            }

            // Check for error responses
            if (responseBody && Array.isArray(responseBody) && responseBody[0]?.errorCode) {
                statusCode = 400;
                statusText = 'Bad Request';
            }

            const response: ApiResponse = {
                statusCode,
                statusText,
                headers: { 'Content-Type': 'application/json' },
                body: responseBody,
                duration,
                size: stdout.length
            };

            this._panel.webview.postMessage({ command: 'requestComplete', response });

        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            this.logger.error('Request failed', error);
            
            let errorBody: any;
            let statusCode = 500;
            let statusText = 'Error';

            // Try to parse the error response
            const output = error.stdout || error.stderr || error.message || 'Unknown error';
            
            try {
                errorBody = JSON.parse(output);
                // Salesforce API error format
                if (Array.isArray(errorBody) && errorBody[0]?.errorCode) {
                    statusCode = 400;
                    statusText = errorBody[0].errorCode;
                }
            } catch {
                // Not JSON, check for common error patterns
                if (output.includes('INVALID_SESSION_ID') || output.includes('Session expired')) {
                    errorBody = { error: 'Session expired. Please re-authenticate with: sf org login web' };
                    statusCode = 401;
                    statusText = 'Unauthorized';
                } else if (output.includes('NOT_FOUND')) {
                    errorBody = { error: 'Resource not found' };
                    statusCode = 404;
                    statusText = 'Not Found';
                } else {
                    errorBody = { error: output.replace(/Warning:.*?\n/g, '').trim() };
                }
            }

            const response: ApiResponse = {
                statusCode,
                statusText,
                headers: {},
                body: errorBody,
                duration,
                size: JSON.stringify(errorBody).length
            };

            this._panel.webview.postMessage({ command: 'requestComplete', response });
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtml();
    }

    private _getHtml(): string {
        const nonce = [...Array(32)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');

        return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
:root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-foreground);
    --border: var(--vscode-widget-border);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --success: #49cc90;
    --error: #f93e3e;
    --warning: #fca130;
    --info: #61affe;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--vscode-font-family); padding: 0; color: var(--fg); background: var(--bg); height: 100vh; display: flex; flex-direction: column; }

.header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 20px; display: flex; align-items: center; gap: 10px; }
.org-info { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.org-badge { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.org-error { color: var(--error); background: rgba(249,62,62,0.2); }
.refresh-btn { background: none; border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; cursor: pointer; color: var(--fg); }

.request-builder { padding: 16px 20px; border-bottom: 1px solid var(--border); }
.request-row { display: flex; gap: 10px; margin-bottom: 12px; }
.method-select { width: 120px; padding: 10px; border: 1px solid var(--border); background: var(--input-bg); color: var(--input-fg); border-radius: 4px; font-size: 14px; font-weight: 600; }
.endpoint-input { flex: 1; padding: 10px 14px; border: 1px solid var(--border); background: var(--input-bg); color: var(--input-fg); border-radius: 4px; font-size: 14px; font-family: monospace; }
.endpoint-input:focus { outline: none; border-color: var(--vscode-focusBorder); }
.save-endpoint-btn { padding: 10px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
.save-endpoint-btn:hover { background: var(--info); color: white; }
.save-endpoint-btn.saved { color: #f5c518; }
.saved-endpoints { display: none; padding: 8px 0; gap: 6px; flex-wrap: wrap; }
.saved-endpoints.visible { display: flex; }
.saved-endpoint-item { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; font-size: 11px; cursor: pointer; max-width: 250px; overflow: hidden; }
.saved-endpoint-item:hover { opacity: 0.9; }
.saved-endpoint-item .method { font-weight: 600; color: var(--info); flex-shrink: 0; }
.saved-endpoint-item .endpoint-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-endpoint-item .remove-btn { margin-left: 4px; opacity: 0.6; cursor: pointer; font-size: 10px; flex-shrink: 0; }
.saved-endpoint-item .remove-btn:hover { opacity: 1; color: var(--error); }
.send-btn { padding: 10px 24px; background: var(--info); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.send-btn:hover { opacity: 0.9; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner { width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.quick-btn { padding: 6px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.quick-btn:hover { opacity: 0.8; }
.quick-btn.active { background: var(--info); color: white; }

.body-section { padding: 16px 20px; border-bottom: 1px solid var(--border); display: none; }
.body-section.visible { display: block; }
.body-editor { width: 100%; min-height: 100px; padding: 12px; border: 1px solid var(--border); background: var(--input-bg); color: var(--input-fg); border-radius: 4px; font-family: monospace; font-size: 13px; resize: vertical; }

.query-section { padding: 16px 20px; border-bottom: 1px solid var(--border); display: none; }
.query-section.visible { display: block; }
.query-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.query-header h3 { font-size: 14px; font-weight: 600; }
.query-templates { display: flex; gap: 6px; flex-wrap: wrap; }
.query-template-btn { padding: 4px 10px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 11px; }
.query-template-btn:hover { opacity: 0.8; }
.query-editor { width: 100%; min-height: 80px; padding: 12px; border: 1px solid var(--border); background: var(--input-bg); color: var(--input-fg); border-radius: 4px; font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 13px; resize: vertical; line-height: 1.5; }
.query-editor:focus { outline: none; border-color: var(--info); }
.query-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.btn-primary { padding: 8px 16px; background: var(--info); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { padding: 8px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.query-hint { font-size: 11px; opacity: 0.6; margin-left: auto; }

.query-input-wrapper { position: relative; }
.autocomplete-dropdown { position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--vscode-dropdown-background, var(--input-bg)); border: 1px solid var(--border); border-top: none; border-radius: 0 0 4px 4px; display: none; z-index: 100; }
.autocomplete-dropdown.visible { display: block; }
.autocomplete-item { padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.autocomplete-item:hover, .autocomplete-item.selected { background: var(--vscode-list-hoverBackground); }
.autocomplete-item .field-name { font-family: monospace; color: var(--info); }
.autocomplete-item .field-type { font-size: 11px; opacity: 0.6; }
.query-status { font-size: 12px; padding: 8px 0; min-height: 28px; }
.query-status.loading { color: var(--info); }
.query-status.success { color: var(--success); }
.query-status.error { color: var(--error); }

.response-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.response-header { padding: 12px 20px; border-bottom: 1px solid var(--border); display: none; justify-content: space-between; align-items: center; }
.response-header.visible { display: flex; }
.response-meta { display: flex; gap: 16px; align-items: center; }
.status-badge { padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px; }
.status-2xx { background: rgba(73, 204, 144, 0.2); color: var(--success); }
.status-4xx { background: rgba(252, 161, 48, 0.2); color: var(--warning); }
.status-5xx { background: rgba(249, 62, 62, 0.2); color: var(--error); }
.response-stat { font-size: 12px; opacity: 0.7; }
.action-btn { padding: 4px 10px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px; }

.response-body { flex: 1; overflow: auto; padding: 16px 20px; }
.response-body pre { font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.response-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; opacity: 0.5; }
.response-empty-icon { font-size: 48px; margin-bottom: 16px; }

.json-key { color: #9cdcfe; }
.json-string { color: #ce9178; }
.json-number { color: #b5cea8; }
.json-boolean { color: #569cd6; }
.json-null { color: #569cd6; }

.error-message { color: var(--error); padding: 20px; text-align: center; }
</style>
</head>
<body>

<div class="header">
    <h1>🔌 Connectforce REST Explorer</h1>
    <div class="org-info">
        <span class="org-badge" id="orgBadge">Connecting...</span>
        <button class="refresh-btn" id="refreshBtn">🔄</button>
    </div>
</div>

<div class="request-builder">
    <div class="request-row">
        <select class="method-select" id="method">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
        </select>
        <input type="text" class="endpoint-input" id="endpoint" placeholder="/services/data/v60.0/sobjects/Account" value="/sobjects/Account/describe">
        <button class="save-endpoint-btn" id="saveEndpointBtn" title="Save endpoint">⭐</button>
        <button class="send-btn" id="sendBtn">
            <span id="sendText">Send</span>
            <span id="sendSpinner" class="spinner" style="display: none;"></span>
        </button>
    </div>
    <div class="saved-endpoints" id="savedEndpoints"></div>
    <div class="quick-actions" id="quickActions">
        <button class="quick-btn" data-endpoint="/sobjects">Objects</button>
        <button class="quick-btn" data-endpoint="/sobjects/Account/describe">Account Describe</button>
        <button class="quick-btn" id="openQueryBuilder">📝 SOQL Query</button>
        <button class="quick-btn" data-endpoint="/limits">Limits</button>
        <button class="quick-btn" data-endpoint="/tooling/sobjects">Tooling Objects</button>
        <button class="quick-btn" data-endpoint="/sobjects/User/describe">User Describe</button>
    </div>
</div>

<div class="body-section" id="bodySection">
    <textarea class="body-editor" id="requestBody" placeholder='{"Name": "Test Account"}'></textarea>
</div>

<div class="query-section" id="querySection">
    <div class="query-header">
        <h3>SOQL Query</h3>
        <div class="query-templates">
            <button class="query-template-btn" data-query="SELECT Id, Name FROM Account LIMIT 10">Accounts</button>
            <button class="query-template-btn" data-query="SELECT Id, Name FROM Contact LIMIT 10">Contacts</button>
            <button class="query-template-btn" data-query="SELECT Id, CaseNumber, Subject FROM Case LIMIT 10">Cases</button>
            <button class="query-template-btn" data-query="SELECT Id, Name FROM Opportunity LIMIT 10">Opportunities</button>
            <button class="query-template-btn" data-query="SELECT Id, Name FROM Lead LIMIT 10">Leads</button>
        </div>
    </div>
    <div class="query-input-wrapper">
        <textarea class="query-editor" id="soqlQuery" placeholder="SELECT Id, Name FROM Account WHERE CreatedDate = TODAY LIMIT 10" spellcheck="false"></textarea>
        <div class="autocomplete-dropdown" id="autocompleteDropdown"></div>
    </div>
    <div class="query-status" id="queryStatus"></div>
    <div class="query-actions">
        <button class="btn-primary" id="runQueryBtn">▶ Run Query</button>
        <button class="btn-secondary" id="loadFieldsBtn">📋 Load Fields</button>
        <button class="btn-secondary" id="clearQueryBtn">Clear</button>
        <span class="query-hint">💡 Click "Load Fields" after typing FROM ObjectName</span>
    </div>
</div>

<div class="response-section">
    <div class="response-header" id="responseHeader">
        <div class="response-meta">
            <span class="status-badge" id="statusBadge">200 OK</span>
            <span class="response-stat" id="timeStat">Time: 0ms</span>
            <span class="response-stat" id="sizeStat">Size: 0 B</span>
        </div>
        <div>
            <button class="action-btn" id="clearBtn">🗑️ Clear</button>
            <button class="action-btn" id="copyBtn">📋 Copy</button>
            <button class="action-btn" id="downloadBtn">⬇️ Download</button>
        </div>
    </div>
    <div class="response-body" id="responseBody">
        <div class="response-empty">
            <div class="response-empty-icon">📡</div>
            <p>Enter an endpoint and click Send</p>
            <p style="font-size: 12px; margin-top: 8px;">Use quick actions above to get started</p>
        </div>
    </div>
</div>

<script nonce="${nonce}">
(function() {
    const vscode = acquireVsCodeApi();
    let currentResponse = null;

    // Get DOM elements
    const elements = {
        method: document.getElementById('method'),
        endpoint: document.getElementById('endpoint'),
        sendBtn: document.getElementById('sendBtn'),
        sendText: document.getElementById('sendText'),
        sendSpinner: document.getElementById('sendSpinner'),
        bodySection: document.getElementById('bodySection'),
        requestBody: document.getElementById('requestBody'),
        querySection: document.getElementById('querySection'),
        soqlQuery: document.getElementById('soqlQuery'),
        runQueryBtn: document.getElementById('runQueryBtn'),
        loadFieldsBtn: document.getElementById('loadFieldsBtn'),
        clearQueryBtn: document.getElementById('clearQueryBtn'),
        openQueryBuilder: document.getElementById('openQueryBuilder'),
        autocompleteDropdown: document.getElementById('autocompleteDropdown'),
        queryStatus: document.getElementById('queryStatus'),
        responseHeader: document.getElementById('responseHeader'),
        responseBody: document.getElementById('responseBody'),
        statusBadge: document.getElementById('statusBadge'),
        timeStat: document.getElementById('timeStat'),
        sizeStat: document.getElementById('sizeStat'),
        orgBadge: document.getElementById('orgBadge'),
        refreshBtn: document.getElementById('refreshBtn'),
        clearBtn: document.getElementById('clearBtn'),
        copyBtn: document.getElementById('copyBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        quickActions: document.getElementById('quickActions'),
        saveEndpointBtn: document.getElementById('saveEndpointBtn'),
        savedEndpoints: document.getElementById('savedEndpoints')
    };

    // Field cache for autocomplete
    let fieldCache = {};
    let currentFields = [];
    let selectedIndex = -1;
    let lastObjectName = '';
    
    // Saved endpoints
    let savedEndpoints = JSON.parse(localStorage.getItem('connectforce_saved_endpoints') || '[]');
    renderSavedEndpoints();

    // Method change handler
    elements.method.addEventListener('change', function() {
        if (['POST', 'PUT', 'PATCH'].includes(this.value)) {
            elements.bodySection.classList.add('visible');
            elements.querySection.classList.remove('visible');
        } else {
            elements.bodySection.classList.remove('visible');
        }
        updateSaveButtonState();
    });
    
    // Update save button state when endpoint changes
    elements.endpoint.addEventListener('input', updateSaveButtonState);

    // Send button
    elements.sendBtn.addEventListener('click', sendRequest);
    
    // Save endpoint button
    elements.saveEndpointBtn.addEventListener('click', function() {
        const method = elements.method.value;
        const endpoint = elements.endpoint.value.trim();
        
        if (!endpoint) return;
        
        const key = method + ':' + endpoint;
        const existingIndex = savedEndpoints.findIndex(function(e) { return e.method + ':' + e.endpoint === key; });
        
        if (existingIndex >= 0) {
            // Remove if already saved
            savedEndpoints.splice(existingIndex, 1);
        } else {
            // Add new
            savedEndpoints.unshift({ method: method, endpoint: endpoint });
            if (savedEndpoints.length > 10) savedEndpoints.pop(); // Keep max 10
        }
        
        localStorage.setItem('connectforce_saved_endpoints', JSON.stringify(savedEndpoints));
        renderSavedEndpoints();
        updateSaveButtonState();
    });
    
    function updateSaveButtonState() {
        const method = elements.method.value;
        const endpoint = elements.endpoint.value.trim();
        const key = method + ':' + endpoint;
        const isSaved = savedEndpoints.some(function(e) { return e.method + ':' + e.endpoint === key; });
        
        elements.saveEndpointBtn.classList.toggle('saved', isSaved);
        elements.saveEndpointBtn.textContent = isSaved ? '★' : '☆';
        elements.saveEndpointBtn.title = isSaved ? 'Remove from saved' : 'Save endpoint';
    }
    
    function renderSavedEndpoints() {
        if (savedEndpoints.length === 0) {
            elements.savedEndpoints.classList.remove('visible');
            return;
        }
        
        elements.savedEndpoints.classList.add('visible');
        elements.savedEndpoints.innerHTML = savedEndpoints.map(function(e, i) {
            return '<div class="saved-endpoint-item" data-index="' + i + '">' +
                '<span class="method">' + e.method + '</span>' +
                '<span class="endpoint-text">' + escapeHtml(e.endpoint) + '</span>' +
                '<span class="remove-btn" data-index="' + i + '">✕</span>' +
            '</div>';
        }).join('');
        
        // Click to load endpoint
        elements.savedEndpoints.querySelectorAll('.saved-endpoint-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove-btn')) return;
                const index = parseInt(this.getAttribute('data-index'));
                const saved = savedEndpoints[index];
                elements.method.value = saved.method;
                elements.endpoint.value = saved.endpoint;
                updateSaveButtonState();
                
                // Show/hide body section based on method
                if (['POST', 'PUT', 'PATCH'].includes(saved.method)) {
                    elements.bodySection.classList.add('visible');
                } else {
                    elements.bodySection.classList.remove('visible');
                }
            });
        });
        
        // Click to remove
        elements.savedEndpoints.querySelectorAll('.remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                savedEndpoints.splice(index, 1);
                localStorage.setItem('connectforce_saved_endpoints', JSON.stringify(savedEndpoints));
                renderSavedEndpoints();
                updateSaveButtonState();
            });
        });
        
        updateSaveButtonState();
    }

    // Refresh org
    elements.refreshBtn.addEventListener('click', function() {
        elements.orgBadge.textContent = 'Refreshing...';
        vscode.postMessage({ command: 'refreshOrg' });
    });

    // Clear button
    elements.clearBtn.addEventListener('click', function() {
        currentResponse = null;
        elements.responseHeader.classList.remove('visible');
        elements.responseBody.innerHTML = '<div class="response-empty"><div class="response-empty-icon">📡</div><p>Enter an endpoint and click Send</p><p style="font-size: 12px; margin-top: 8px;">Use quick actions above to get started</p></div>';
    });

    // Open SOQL Query Builder
    elements.openQueryBuilder.addEventListener('click', function() {
        const isVisible = elements.querySection.classList.contains('visible');
        
        // Hide query section if already visible (toggle off)
        if (isVisible) {
            elements.querySection.classList.remove('visible');
            this.classList.remove('active');
        } else {
            // Show query section
            elements.querySection.classList.add('visible');
            elements.bodySection.classList.remove('visible');
            this.classList.add('active');
            elements.soqlQuery.focus();
        }
    });

    // Run Query button
    elements.runQueryBtn.addEventListener('click', runSOQLQuery);

    // Load Fields button
    elements.loadFieldsBtn.addEventListener('click', function() {
        const query = elements.soqlQuery.value;
        
        // Try regex first
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        
        if (fromMatch && fromMatch[1]) {
            lastObjectName = fromMatch[1];
            delete fieldCache[lastObjectName];
            fetchObjectFields(lastObjectName);
        } else {
            // Fallback: split by FROM
            const parts = query.toUpperCase().split('FROM');
            if (parts.length > 1) {
                const afterFrom = query.substring(query.toUpperCase().indexOf('FROM') + 4).trim().split(/\s+/)[0];
                if (afterFrom && afterFrom.length >= 2) {
                    lastObjectName = afterFrom;
                    delete fieldCache[lastObjectName];
                    fetchObjectFields(lastObjectName);
                    return;
                }
            }
            elements.queryStatus.textContent = '⚠ Please type FROM ObjectName first (e.g., SELECT Id FROM Account)';
            elements.queryStatus.className = 'query-status error';
        }
    });

    // Clear Query button
    elements.clearQueryBtn.addEventListener('click', function() {
        elements.soqlQuery.value = '';
        elements.soqlQuery.focus();
        hideAutocomplete();
        elements.queryStatus.textContent = '';
    });

    // Query template buttons
    document.querySelectorAll('.query-template-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            elements.soqlQuery.value = this.getAttribute('data-query');
            elements.soqlQuery.focus();
            checkForObject();
        });
    });

    // SOQL Query input handler for field suggestions
    elements.soqlQuery.addEventListener('input', function() {
        checkForObject();
        // Small delay to allow typing
        setTimeout(checkForFieldSuggestion, 100);
    });

    // Also check on focus
    elements.soqlQuery.addEventListener('focus', function() {
        checkForObject();
    });

    // Keyboard navigation in query textarea
    elements.soqlQuery.addEventListener('keydown', function(e) {
        if (elements.autocompleteDropdown.classList.contains('visible')) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentFields.length - 1);
                updateAutocompleteSelection();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateAutocompleteSelection();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                insertField(currentFields[selectedIndex].name);
            } else if (e.key === 'Escape') {
                hideAutocomplete();
            } else if (e.key === 'Tab' && selectedIndex >= 0) {
                e.preventDefault();
                insertField(currentFields[selectedIndex].name);
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runSOQLQuery();
        } else if (e.key === ' ' && e.ctrlKey) {
            // Ctrl+Space to trigger suggestions
            e.preventDefault();
            forceShowSuggestions();
        }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!elements.soqlQuery.contains(e.target) && !elements.autocompleteDropdown.contains(e.target)) {
            hideAutocomplete();
        }
    });

    function checkForObject() {
        const query = elements.soqlQuery.value;
        
        // Try regex first
        let objectName = null;
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        
        if (fromMatch && fromMatch[1]) {
            objectName = fromMatch[1];
        } else {
            // Fallback: split by FROM and get next word
            const parts = query.toUpperCase().split('FROM');
            if (parts.length > 1) {
                const afterFrom = query.substring(query.toUpperCase().indexOf('FROM') + 4).trim().split(/\s+/)[0];
                if (afterFrom && afterFrom.length >= 2 && /^\w+$/.test(afterFrom)) {
                    objectName = afterFrom;
                }
            }
        }
        
        if (objectName && objectName.length >= 2) {
            if (objectName.toLowerCase() !== lastObjectName.toLowerCase()) {
                lastObjectName = objectName;
                fetchObjectFields(objectName);
            } else if (!fieldCache[objectName] && !fieldCache[lastObjectName]) {
                fetchObjectFields(objectName);
            }
        }
    }

    function checkForFieldSuggestion() {
        const query = elements.soqlQuery.value;
        const cursorPos = elements.soqlQuery.selectionStart;
        const textBeforeCursor = query.substring(0, cursorPos);
        const upperQuery = query.toUpperCase();
        
        const selectPos = upperQuery.indexOf('SELECT');
        const fromPos = upperQuery.indexOf('FROM');
        
        if (selectPos !== -1 && lastObjectName && fieldCache[lastObjectName]) {
            if (fromPos === -1 || cursorPos <= fromPos + 4) {
                const afterSelect = textBeforeCursor.substring(selectPos + 6);
                const cleanAfterSelect = afterSelect.replace(/FROM.*/i, '');
                const parts = cleanAfterSelect.split(/,/);
                const lastPart = parts[parts.length - 1].trim();
                
                showFieldSuggestions(lastPart);
                return;
            }
        }
        
        hideAutocomplete();
    }

    function forceShowSuggestions() {
        if (lastObjectName && fieldCache[lastObjectName]) {
            showFieldSuggestions('');
        } else {
            const query = elements.soqlQuery.value;
            const parts = query.toUpperCase().split('FROM');
            if (parts.length > 1) {
                const afterFrom = query.substring(query.toUpperCase().indexOf('FROM') + 4).trim().split(/\s+/)[0];
                if (afterFrom && afterFrom.length >= 2) {
                    lastObjectName = afterFrom;
                    fetchObjectFields(lastObjectName);
                    elements.queryStatus.textContent = '⏳ Loading fields... Press Ctrl+Space again after loaded';
                    elements.queryStatus.className = 'query-status loading';
                }
            } else {
                elements.queryStatus.textContent = '⚠ Type FROM ObjectName first, then press Ctrl+Space';
                elements.queryStatus.className = 'query-status error';
            }
        }
    }

    function fetchObjectFields(objectName) {
        if (fieldCache[objectName]) {
            elements.queryStatus.textContent = '✓ ' + objectName + ' fields loaded (' + fieldCache[objectName].length + ' fields)';
            elements.queryStatus.className = 'query-status success';
            return;
        }
        
        elements.queryStatus.textContent = '⏳ Loading ' + objectName + ' fields...';
        elements.queryStatus.className = 'query-status loading';
        
        vscode.postMessage({ command: 'getObjectFields', objectName: objectName });
    }

    function showFieldSuggestions(filter) {
        if (!lastObjectName || !fieldCache[lastObjectName]) {
            return;
        }
        
        const fields = fieldCache[lastObjectName];
        const filterLower = filter.toLowerCase();
        
        currentFields = fields.filter(function(f) {
            return f.name.toLowerCase().startsWith(filterLower) || 
                   f.label.toLowerCase().includes(filterLower);
        }).slice(0, 15);
        
        if (currentFields.length === 0) {
            hideAutocomplete();
            return;
        }
        
        selectedIndex = 0;
        elements.autocompleteDropdown.innerHTML = currentFields.map(function(f, i) {
            return '<div class="autocomplete-item' + (i === 0 ? ' selected' : '') + '" data-field="' + f.name + '">' +
                '<span class="field-name">' + escapeHtml(f.name) + '</span>' +
                '<span class="field-type">' + escapeHtml(f.type) + '</span>' +
            '</div>';
        }).join('');
        
        // Add click handlers
        elements.autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(function(item) {
            item.addEventListener('click', function() {
                insertField(this.getAttribute('data-field'));
            });
        });
        
        elements.autocompleteDropdown.classList.add('visible');
    }

    function hideAutocomplete() {
        elements.autocompleteDropdown.classList.remove('visible');
        selectedIndex = -1;
        currentFields = [];
    }

    function updateAutocompleteSelection() {
        elements.autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(function(item, i) {
            item.classList.toggle('selected', i === selectedIndex);
        });
        // Scroll into view
        const selected = elements.autocompleteDropdown.querySelector('.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    function insertField(fieldName) {
        const query = elements.soqlQuery.value;
        const cursorPos = elements.soqlQuery.selectionStart;
        const textBeforeCursor = query.substring(0, cursorPos);
        const textAfterCursor = query.substring(cursorPos);
        
        // Find where to insert
        const lastCommaOrSelect = Math.max(
            textBeforeCursor.lastIndexOf(','),
            textBeforeCursor.toUpperCase().lastIndexOf('SELECT ')
        );
        
        let insertPos = lastCommaOrSelect + 1;
        if (textBeforeCursor.toUpperCase().lastIndexOf('SELECT ') === lastCommaOrSelect) {
            insertPos = lastCommaOrSelect + 7; // Length of 'SELECT '
        }
        
        // Remove partial text and insert field
        const beforeInsert = query.substring(0, insertPos).trimEnd() + ' ';
        const newQuery = beforeInsert + fieldName + textAfterCursor;
        
        elements.soqlQuery.value = newQuery;
        elements.soqlQuery.selectionStart = elements.soqlQuery.selectionEnd = beforeInsert.length + fieldName.length;
        elements.soqlQuery.focus();
        
        hideAutocomplete();
    }

    function runSOQLQuery() {
        const query = elements.soqlQuery.value.trim();
        if (!query) {
            showError('Please enter a SOQL query');
            return;
        }
        
        // Encode the query properly
        const encodedQuery = encodeURIComponent(query);
        const endpoint = '/query?q=' + encodedQuery;
        
        // Update the endpoint field for visibility
        elements.endpoint.value = '/query?q=' + query.replace(/\s+/g, '+').substring(0, 50) + '...';
        elements.method.value = 'GET';
        
        hideAutocomplete();
        
        // Send the request
        vscode.postMessage({ 
            command: 'executeRequest', 
            data: { method: 'GET', endpoint: endpoint }
        });
    }

    // Quick action buttons - use event delegation
    elements.quickActions.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-btn')) {
            const endpoint = e.target.getAttribute('data-endpoint');
            if (endpoint) {
                elements.endpoint.value = endpoint;
                elements.method.value = 'GET';
                elements.bodySection.classList.remove('visible');
            }
        }
    });

    // Copy button
    elements.copyBtn.addEventListener('click', function() {
        if (currentResponse) {
            navigator.clipboard.writeText(JSON.stringify(currentResponse.body, null, 2)).then(function() {
                elements.copyBtn.textContent = '✓ Copied';
                setTimeout(function() { elements.copyBtn.textContent = '📋 Copy'; }, 2000);
            });
        }
    });

    // Download button
    elements.downloadBtn.addEventListener('click', function() {
        if (currentResponse) {
            const blob = new Blob([JSON.stringify(currentResponse.body, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'response.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    // Ctrl+Enter to send
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            sendRequest();
        }
    });

    function sendRequest() {
        const method = elements.method.value;
        const endpoint = elements.endpoint.value.trim();

        if (!endpoint) {
            showError('Please enter an endpoint');
            return;
        }

        const data = { method: method, endpoint: endpoint };
        
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const body = elements.requestBody.value.trim();
            if (body) {
                try {
                    JSON.parse(body);
                    data.body = body;
                } catch (e) {
                    showError('Invalid JSON in request body');
                    return;
                }
            }
        }

        vscode.postMessage({ command: 'executeRequest', data: data });
    }

    function showError(message) {
        elements.responseHeader.classList.remove('visible');
        elements.responseBody.innerHTML = '<div class="error-message">❌ ' + escapeHtml(message) + '</div>';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function(match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function renderResponse(response) {
        currentResponse = response;
        
        elements.responseHeader.classList.add('visible');
        
        // Status
        elements.statusBadge.textContent = response.statusCode + ' ' + response.statusText;
        elements.statusBadge.className = 'status-badge';
        if (response.statusCode >= 200 && response.statusCode < 300) {
            elements.statusBadge.classList.add('status-2xx');
        } else if (response.statusCode >= 400 && response.statusCode < 500) {
            elements.statusBadge.classList.add('status-4xx');
        } else {
            elements.statusBadge.classList.add('status-5xx');
        }
        
        // Stats
        elements.timeStat.textContent = 'Time: ' + response.duration + 'ms';
        elements.sizeStat.textContent = 'Size: ' + formatBytes(response.size);
        
        // Body
        let formatted;
        if (typeof response.body === 'object') {
            formatted = syntaxHighlight(response.body);
        } else {
            formatted = escapeHtml(response.body);
        }
        elements.responseBody.innerHTML = '<pre>' + formatted + '</pre>';
    }

    // Message handler
    window.addEventListener('message', function(event) {
        const msg = event.data;
        
        switch (msg.command) {
            case 'orgInfo':
                elements.orgBadge.textContent = msg.org.username;
                elements.orgBadge.title = msg.org.instanceUrl;
                elements.orgBadge.classList.remove('org-error');
                break;
                
            case 'orgError':
                elements.orgBadge.textContent = '⚠️ No Org';
                elements.orgBadge.classList.add('org-error');
                elements.orgBadge.title = msg.error;
                break;
                
            case 'requestStarted':
                elements.sendBtn.disabled = true;
                elements.sendText.style.display = 'none';
                elements.sendSpinner.style.display = 'inline-block';
                break;
                
            case 'requestComplete':
                elements.sendBtn.disabled = false;
                elements.sendText.style.display = 'inline';
                elements.sendSpinner.style.display = 'none';
                renderResponse(msg.response);
                break;
                
            case 'requestError':
                elements.sendBtn.disabled = false;
                elements.sendText.style.display = 'inline';
                elements.sendSpinner.style.display = 'none';
                showError(msg.error);
                break;
                
            case 'objectFields':
                if (msg.objectName && msg.fields) {
                    fieldCache[msg.objectName] = msg.fields;
                    if (elements.queryStatus) {
                        elements.queryStatus.textContent = '✓ ' + msg.objectName + ' fields loaded (' + msg.fields.length + ' fields)';
                        elements.queryStatus.className = 'query-status success';
                    }
                }
                break;
                
            case 'objectFieldsError':
                if (elements.queryStatus) {
                    elements.queryStatus.textContent = '⚠ Could not load fields: ' + (msg.error || 'Unknown error');
                    elements.queryStatus.className = 'query-status error';
                }
                break;
        }
    });
})();
</script>
</body></html>`;
    }

    public dispose() {
        RestExplorerPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
