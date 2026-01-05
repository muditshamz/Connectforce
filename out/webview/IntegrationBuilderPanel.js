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
exports.IntegrationBuilderPanel = void 0;
const vscode = __importStar(require("vscode"));
class IntegrationBuilderPanel {
    static createOrShow(extensionUri, connectionService, salesforceService, logger, template) {
        const column = vscode.window.activeTextEditor?.viewColumn;
        if (IntegrationBuilderPanel.currentPanel) {
            IntegrationBuilderPanel.currentPanel._panel.reveal(column);
            if (template) {
                IntegrationBuilderPanel.currentPanel.loadTemplate(template);
            }
            return;
        }
        const panel = vscode.window.createWebviewPanel('integrationBuilder', 'Integration Builder', column || vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        IntegrationBuilderPanel.currentPanel = new IntegrationBuilderPanel(panel, extensionUri, connectionService, salesforceService, logger, template);
    }
    constructor(panel, extensionUri, connectionService, salesforceService, logger, template) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.connectionService = connectionService;
        this.salesforceService = salesforceService;
        this.logger = logger;
        this.template = template;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(m => this._handleMessage(m), null, this._disposables);
    }
    loadTemplate(template) {
        this.template = template;
        this._panel.webview.postMessage({ command: 'loadTemplate', template });
    }
    async _handleMessage(message) {
        switch (message.command) {
            case 'saveConnection':
                await this._saveConnection(message.data);
                break;
            case 'testConnection':
                await this._testConnection(message.data);
                break;
            case 'addEndpoint':
                await this._addEndpoint(message.data);
                break;
            case 'generateCode':
                if (this.currentConnection) {
                    vscode.commands.executeCommand('connectforce.generateApex', { connectionId: this.currentConnection.id });
                }
                break;
        }
    }
    async _saveConnection(data) {
        try {
            if (this.currentConnection) {
                Object.assign(this.currentConnection, data);
                await this.connectionService.saveConnection(this.currentConnection);
            }
            else {
                this.currentConnection = await this.connectionService.createConnection(data);
            }
            this._panel.webview.postMessage({ command: 'connectionSaved', connection: this.currentConnection });
            vscode.window.showInformationMessage(`Connection "${data.name}" saved!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save: ${error.message}`);
        }
    }
    async _testConnection(data) {
        try {
            const testConn = {
                id: 'test', name: data.name || 'Test', baseUrl: data.baseUrl,
                authenticationType: data.authenticationType, authConfig: data.authConfig,
                headers: {}, endpoints: [], createdAt: '', updatedAt: '', status: 'testing'
            };
            this._panel.webview.postMessage({ command: 'testingStarted' });
            const result = await this.connectionService.testConnection(testConn);
            this._panel.webview.postMessage({ command: 'testResult', result });
        }
        catch (error) {
            this._panel.webview.postMessage({ command: 'testResult', result: { success: false, error: error.message } });
        }
    }
    async _addEndpoint(data) {
        if (!this.currentConnection) {
            vscode.window.showWarningMessage('Save connection first');
            return;
        }
        const endpoint = await this.connectionService.addEndpoint(this.currentConnection.id, data);
        this._panel.webview.postMessage({ command: 'endpointAdded', endpoint });
    }
    _update() {
        this._panel.webview.html = this._getHtml();
        if (this.template) {
            setTimeout(() => this._panel.webview.postMessage({ command: 'loadTemplate', template: this.template }), 500);
        }
    }
    _getHtml() {
        const nonce = [...Array(32)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
        return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
:root { --bg: var(--vscode-editor-background); --fg: var(--vscode-foreground); --border: var(--vscode-widget-border); --input-bg: var(--vscode-input-background); --btn: var(--vscode-button-background); --btn-fg: var(--vscode-button-foreground); }
* { box-sizing: border-box; }
body { font-family: var(--vscode-font-family); padding: 20px; color: var(--fg); background: var(--bg); }
h1 { font-size: 24px; margin-bottom: 20px; }
h2 { font-size: 18px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
.tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.tab { padding: 10px 20px; cursor: pointer; border: none; background: none; color: var(--fg); opacity: 0.7; border-bottom: 2px solid transparent; }
.tab:hover { opacity: 1; }
.tab.active { opacity: 1; border-bottom-color: var(--vscode-focusBorder); }
.tab-content { display: none; }
.tab-content.active { display: block; }
.form-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px; }
input, select, textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); background: var(--input-bg); color: var(--fg); border-radius: 4px; }
textarea { min-height: 80px; }
button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; }
.btn-primary { background: var(--btn); color: var(--btn-fg); }
.btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
.btn-group { display: flex; gap: 10px; margin-top: 20px; }
.card { border: 1px solid var(--border); border-radius: 4px; padding: 16px; margin-bottom: 16px; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.endpoint-item { display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; }
.endpoint-method { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 12px; min-width: 60px; text-align: center; color: white; }
.method-get { background: #61affe; } .method-post { background: #49cc90; } .method-put { background: #fca130; } .method-delete { background: #f93e3e; }
.endpoint-info { flex: 1; }
.endpoint-name { font-weight: 500; }
.endpoint-path { font-size: 12px; opacity: 0.7; font-family: monospace; }
.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.status-success { background: rgba(73,204,144,0.2); color: #49cc90; }
.status-error { background: rgba(249,62,62,0.2); color: #f93e3e; }
.auth-config { padding: 16px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; margin-top: 12px; }
.hidden { display: none !important; }
.spinner { width: 16px; height: 16px; border: 2px solid var(--fg); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 40px; opacity: 0.7; }
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<h1>⚡ Connectforce</h1>
<div id="status"></div>
</div>

<div class="tabs">
<button class="tab active" data-tab="connection">Connection</button>
<button class="tab" data-tab="endpoints">Endpoints</button>
<button class="tab" data-tab="auth">Authentication</button>
<button class="tab" data-tab="generate">Generate</button>
</div>

<div id="connection-tab" class="tab-content active">
<div class="card">
<h2>Connection Details</h2>
<div class="grid grid-2">
<div class="form-group"><label>Name *</label><input type="text" id="name" placeholder="e.g., NetSuite Production"></div>
<div class="form-group"><label>System Type</label><select id="erpType"><option value="Custom">Custom API</option><option value="NetSuite">NetSuite</option><option value="SAP">SAP</option><option value="Dynamics365">Dynamics 365</option><option value="QuickBooks">QuickBooks</option><option value="Xero">Xero</option></select></div>
</div>
<div class="form-group"><label>Base URL *</label><input type="url" id="baseUrl" placeholder="https://api.example.com"></div>
<div class="form-group"><label>Description</label><textarea id="description" placeholder="Describe this integration..."></textarea></div>
<div class="grid grid-2">
<div class="form-group"><label>Timeout (ms)</label><input type="number" id="timeout" value="30000"></div>
<div class="form-group"><label>Max Retries</label><input type="number" id="maxRetries" value="3"></div>
</div>
<div class="btn-group">
<button class="btn-primary" id="testBtn"><span id="testText">Test Connection</span><span id="testSpinner" class="spinner hidden"></span></button>
<button class="btn-primary" id="saveBtn">Save Connection</button>
</div>
</div>
</div>

<div id="endpoints-tab" class="tab-content">
<div class="card">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<h2 style="margin:0;border:0;padding:0">Endpoints</h2>
<button class="btn-primary" id="addEndpointBtn">+ Add Endpoint</button>
</div>
<div id="endpointsList"><div class="empty-state">📡 No endpoints yet</div></div>
</div>
<div id="endpointModal" class="card hidden">
<h2>Add Endpoint</h2>
<div class="grid grid-2">
<div class="form-group"><label>Name *</label><input type="text" id="epName"></div>
<div class="form-group"><label>Method *</label><select id="epMethod"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select></div>
</div>
<div class="form-group"><label>Path *</label><input type="text" id="epPath" placeholder="/customers/{id}"></div>
<div class="form-group"><label>Description</label><textarea id="epDesc"></textarea></div>
<div class="btn-group">
<button class="btn-primary" id="saveEpBtn">Save</button>
<button class="btn-secondary" id="cancelEpBtn">Cancel</button>
</div>
</div>
</div>

<div id="auth-tab" class="tab-content">
<div class="card">
<h2>Authentication</h2>
<div class="form-group"><label>Type</label><select id="authType"><option value="None">None</option><option value="Basic">Basic Auth</option><option value="API_Key">API Key</option><option value="OAuth2">OAuth 2.0</option></select></div>
<div id="basicAuth" class="auth-config hidden">
<div class="grid grid-2">
<div class="form-group"><label>Username</label><input type="text" id="basicUser"></div>
<div class="form-group"><label>Password</label><input type="password" id="basicPass"></div>
</div>
</div>
<div id="apiKeyAuth" class="auth-config hidden">
<div class="grid grid-2">
<div class="form-group"><label>Header Name</label><input type="text" id="apiKeyHeader" value="X-API-Key"></div>
<div class="form-group"><label>API Key</label><input type="password" id="apiKeyValue"></div>
</div>
</div>
<div id="oauth2Auth" class="auth-config hidden">
<div class="form-group"><label>Token URL</label><input type="url" id="oauth2Token"></div>
<div class="grid grid-2">
<div class="form-group"><label>Client ID</label><input type="text" id="oauth2Client"></div>
<div class="form-group"><label>Client Secret</label><input type="password" id="oauth2Secret"></div>
</div>
</div>
</div>
</div>

<div id="generate-tab" class="tab-content">
<div class="card">
<h2>Generate Salesforce Code</h2>
<p>Generate Apex classes, Named Credentials, and External Services.</p>
<div class="form-group"><label><input type="checkbox" id="genApex" checked> Apex Service Class</label></div>
<div class="form-group"><label><input type="checkbox" id="genTest" checked> Test Class</label></div>
<div class="form-group"><label><input type="checkbox" id="genMock" checked> Mock Service</label></div>
<div class="form-group"><label><input type="checkbox" id="genCred" checked> Named Credential</label></div>
<div class="btn-group"><button class="btn-primary" id="generateBtn">🚀 Generate Code</button></div>
</div>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let endpoints = [];

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab + '-tab').classList.add('active');
});

document.getElementById('authType').onchange = e => {
    document.querySelectorAll('.auth-config').forEach(x => x.classList.add('hidden'));
    const m = {Basic:'basicAuth',API_Key:'apiKeyAuth',OAuth2:'oauth2Auth'};
    if(m[e.target.value]) document.getElementById(m[e.target.value]).classList.remove('hidden');
};

document.getElementById('testBtn').onclick = () => {
    const data = getData();
    if(!data.baseUrl) return alert('Enter Base URL');
    vscode.postMessage({command:'testConnection',data});
};

document.getElementById('saveBtn').onclick = () => {
    const data = getData();
    if(!data.name||!data.baseUrl) return alert('Fill required fields');
    vscode.postMessage({command:'saveConnection',data});
};

document.getElementById('addEndpointBtn').onclick = () => document.getElementById('endpointModal').classList.remove('hidden');
document.getElementById('cancelEpBtn').onclick = () => document.getElementById('endpointModal').classList.add('hidden');
document.getElementById('saveEpBtn').onclick = () => {
    const data = {name:document.getElementById('epName').value,method:document.getElementById('epMethod').value,path:document.getElementById('epPath').value,description:document.getElementById('epDesc').value};
    if(!data.name||!data.path) return alert('Fill required fields');
    vscode.postMessage({command:'addEndpoint',data});
    document.getElementById('endpointModal').classList.add('hidden');
    document.getElementById('epName').value='';document.getElementById('epPath').value='';document.getElementById('epDesc').value='';
};

document.getElementById('generateBtn').onclick = () => vscode.postMessage({command:'generateCode'});

function getData() {
    const authType = document.getElementById('authType').value;
    let authConfig = null;
    if(authType==='Basic') authConfig={username:document.getElementById('basicUser').value,password:document.getElementById('basicPass').value};
    else if(authType==='API_Key') authConfig={headerName:document.getElementById('apiKeyHeader').value,apiKey:document.getElementById('apiKeyValue').value,location:'header'};
    else if(authType==='OAuth2') authConfig={tokenEndpoint:document.getElementById('oauth2Token').value,clientId:document.getElementById('oauth2Client').value,clientSecret:document.getElementById('oauth2Secret').value};
    return {name:document.getElementById('name').value,baseUrl:document.getElementById('baseUrl').value,description:document.getElementById('description').value,erpType:document.getElementById('erpType').value,timeout:+document.getElementById('timeout').value,authenticationType:authType,authConfig,endpoints};
}

// HTML escape function to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderEndpoints() {
    const el = document.getElementById('endpointsList');
    if(!endpoints.length) { el.innerHTML='<div class="empty-state">📡 No endpoints yet</div>'; return; }
    el.innerHTML = endpoints.map(e => '<div class="endpoint-item"><span class="endpoint-method method-'+escapeHtml(e.method.toLowerCase())+'">'+escapeHtml(e.method)+'</span><div class="endpoint-info"><div class="endpoint-name">'+escapeHtml(e.name)+'</div><div class="endpoint-path">'+escapeHtml(e.path)+'</div></div></div>').join('');
}

window.addEventListener('message', e => {
    const m = e.data;
    if(m.command==='loadTemplate') {
        document.getElementById('name').value = m.template.name + ' Connection';
        document.getElementById('erpType').value = m.template.erpType;
        document.getElementById('authType').value = m.template.authType;
        document.getElementById('authType').dispatchEvent(new Event('change'));
        if(m.template.defaultEndpoints) { endpoints = [...m.template.defaultEndpoints]; renderEndpoints(); }
    }
    if(m.command==='testingStarted') { document.getElementById('testText').classList.add('hidden'); document.getElementById('testSpinner').classList.remove('hidden'); }
    if(m.command==='testResult') { document.getElementById('testText').classList.remove('hidden'); document.getElementById('testSpinner').classList.add('hidden'); document.getElementById('status').innerHTML='<span class="status-badge status-'+(m.result.success?'success':'error')+'">'+(m.result.success?'✓ Connected':'✗ Failed')+'</span>'; }
    if(m.command==='connectionSaved') document.getElementById('status').innerHTML='<span class="status-badge status-success">✓ Saved</span>';
    if(m.command==='endpointAdded') { endpoints.push(m.endpoint); renderEndpoints(); }
});
</script>
</body></html>`;
    }
    dispose() {
        IntegrationBuilderPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
exports.IntegrationBuilderPanel = IntegrationBuilderPanel;
//# sourceMappingURL=IntegrationBuilderPanel.js.map