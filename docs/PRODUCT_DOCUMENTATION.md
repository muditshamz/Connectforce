# Connectforce - Product Documentation

**Version:** 1.0.0  
**Last Updated:** January 4, 2026  
**Platform:** VS Code Extension for Salesforce Development

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Features](#features)
   - [REST Explorer](#rest-explorer)
   - [SOQL Query Builder](#soql-query-builder)
   - [Connection Builder](#connection-builder)
   - [Field Mapper](#field-mapper)
   - [Code Generation](#code-generation)
   - [ERP Templates](#erp-templates)
4. [Commands Reference](#commands-reference)
5. [Configuration](#configuration)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [UI Components](#ui-components)
8. [Technical Architecture](#technical-architecture)
9. [Changelog](#changelog)
10. [Roadmap](#roadmap)

---

## Overview

Connectforce is a powerful VS Code extension designed to streamline Salesforce integration development. It provides visual tools for building API connections, exploring REST endpoints, writing SOQL queries, and generating production-ready Apex code.

### Key Value Propositions

| Benefit | Description |
|---------|-------------|
| **Visual Development** | Build integrations visually without writing boilerplate code |
| **REST Explorer** | Test Salesforce APIs directly from VS Code |
| **SOQL Builder** | Write queries with auto-complete and field suggestions |
| **Code Generation** | Generate Apex classes, Named Credentials, and External Services |
| **ERP Templates** | Pre-built templates for NetSuite, SAP, Dynamics 365, and more |

### Target Users

- Salesforce Developers
- Salesforce Architects
- Integration Specialists
- Technical Consultants

---

## Installation

### Prerequisites

- VS Code 1.74.0 or higher
- Salesforce CLI (sf) installed and configured
- Active Salesforce org authentication

### Install from VSIX

1. Download `connectforce-1.0.0.vsix`
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Install from VSIX"
5. Select the downloaded file
6. Reload VS Code

### Verify Installation

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Connectforce"
3. You should see all Connectforce commands listed

---

## Features

### REST Explorer

A powerful tool for exploring and testing Salesforce REST APIs directly from VS Code.

#### Opening REST Explorer

- **Command Palette:** `Connectforce: Open REST Explorer`
- **Sidebar:** Click the REST Explorer icon in Connectforce panel
- **Keyboard:** Use assigned shortcut (if configured)

#### Interface Components

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔌 Connectforce REST Explorer                    [user@org.com] 🔄 │
├─────────────────────────────────────────────────────────────────────┤
│ [GET ▼] [/sobjects/Account/describe__________________] [☆] [Send]  │
├─────────────────────────────────────────────────────────────────────┤
│ ★ GET /limits ✕   ★ POST /composite ✕                              │  
├─────────────────────────────────────────────────────────────────────┤
│ [Objects] [Account Describe] [📝 SOQL Query] [Limits] [Tooling]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Response Body                                                      │
│  ─────────────                                                      │
│  {                                                                  │
│    "totalSize": 10,                                                 │
│    "done": true,                                                    │
│    "records": [...]                                                 │
│  }                                                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ [200 OK]  Time: 245ms   Size: 2.3 KB      [Clear] [Copy] [Download] │
└─────────────────────────────────────────────────────────────────────┘
```

#### Features

| Feature | Description |
|---------|-------------|
| **HTTP Methods** | GET, POST, PUT, PATCH, DELETE |
| **Quick Actions** | Pre-configured buttons for common endpoints |
| **Save Endpoints** | Star (☆/★) button to save frequently used endpoints |
| **Saved Endpoints** | Click to load, ✕ to remove, persists across sessions |
| **Request Body** | JSON editor for POST/PUT/PATCH requests |
| **Response Viewer** | Syntax-highlighted JSON with copy/download options |
| **Org Info** | Shows connected org username, click 🔄 to refresh |

#### Quick Action Buttons

| Button | Endpoint | Description |
|--------|----------|-------------|
| Objects | `/sobjects` | List all sObjects |
| Account Describe | `/sobjects/Account/describe` | Account metadata |
| 📝 SOQL Query | Opens query builder | Write SOQL queries |
| Limits | `/limits` | API limits and usage |
| Tooling Objects | `/tooling/sobjects` | Tooling API objects |
| User Describe | `/sobjects/User/describe` | User object metadata |

#### Save Endpoint Feature

1. Enter an endpoint in the input field
2. Click the **☆** button to save (becomes **★**)
3. Saved endpoints appear below the input
4. Click any saved endpoint to load it
5. Click **✕** to remove from saved
6. Maximum 10 endpoints saved
7. Persisted in browser localStorage

---

### SOQL Query Builder

An intelligent SOQL query editor with auto-complete and field suggestions.

#### Opening SOQL Query Builder

1. Open REST Explorer
2. Click **📝 SOQL Query** button
3. Query panel expands below

#### Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ SOQL Query                        [Accounts] [Contacts] [Cases]... │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ SELECT Id, Name, Email                                          │ │
│ │ FROM Contact                                                    │ │
│ │ WHERE AccountId != null                                         │ │
│ │ LIMIT 100                                                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Name                                              string        │ │
│ │ Email                                             email         │ │
│ │ Phone                                             phone         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ✓ Contact fields loaded (68 fields)                                 │
├─────────────────────────────────────────────────────────────────────┤
│ [▶ Run Query] [📋 Load Fields] [Clear]                              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Features

| Feature | Description |
|---------|-------------|
| **Auto-encoding** | Automatically URL-encodes queries |
| **Field Suggestions** | Auto-complete for object fields |
| **Quick Templates** | One-click templates for common objects |
| **Keyboard Navigation** | Arrow keys to navigate, Tab/Enter to select |
| **Manual Load** | "Load Fields" button to fetch object metadata |

#### How to Use Field Suggestions

1. Write your query starting with `FROM ObjectName`:
   ```sql
   SELECT  FROM Account
   ```
2. Click **📋 Load Fields** or wait for auto-load
3. Status shows: `✓ Account fields loaded (68 fields)`
4. Position cursor after SELECT
5. Press **Ctrl+Space** to show all fields, or start typing to filter
6. Use **↑/↓** to navigate, **Tab/Enter** to insert

#### Quick Templates

| Template | Query Generated |
|----------|-----------------|
| Accounts | `SELECT Id, Name FROM Account LIMIT 10` |
| Contacts | `SELECT Id, Name FROM Contact LIMIT 10` |
| Cases | `SELECT Id, CaseNumber, Subject FROM Case LIMIT 10` |
| Opportunities | `SELECT Id, Name FROM Opportunity LIMIT 10` |
| Leads | `SELECT Id, Name FROM Lead LIMIT 10` |

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Space` | Show field suggestions |
| `↓` / `↑` | Navigate suggestions |
| `Tab` / `Enter` | Insert selected field |
| `Esc` | Close suggestions |
| `Ctrl+Enter` | Run query |

---

### Connection Builder

Visual interface for creating and managing external API connections.

#### Opening Connection Builder

- **Command Palette:** `Connectforce: Open Integration Builder`
- **Sidebar:** Click connection in Connectforce panel

#### Supported Authentication Types

| Type | Description | Use Case |
|------|-------------|----------|
| **No Auth** | No authentication | Public APIs |
| **Basic Auth** | Username/Password | Simple APIs |
| **API Key** | Header or Query parameter | Most REST APIs |
| **OAuth 2.0** | Client Credentials, Auth Code | Enterprise APIs |
| **JWT Bearer** | JWT token authentication | Service accounts |

#### Connection Configuration

```json
{
  "name": "NetSuite API",
  "baseUrl": "https://account.suitetalk.api.netsuite.com",
  "authType": "OAuth2",
  "authConfig": {
    "tokenUrl": "https://account.suitetalk.api.netsuite.com/oauth2/token",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "scope": "rest_webservices"
  }
}
```

---

### Field Mapper

Visual drag-and-drop interface for mapping fields between systems.

#### Opening Field Mapper

- **Command Palette:** `Connectforce: Open Field Mapper`
- **Context Menu:** Right-click connection → "Open Field Mapper"

#### Features

- Drag-and-drop field mapping
- Data type validation
- Transformation functions
- Bidirectional sync support
- AI-powered field suggestions

---

### Code Generation

Generate production-ready Apex code from your connections.

#### Generated Artifacts

| Artifact | Description |
|----------|-------------|
| **Apex Service Class** | Callout methods for each endpoint |
| **Test Class** | Unit tests with mock implementations |
| **Mock Service** | Mock class for testing |
| **Named Credential** | XML metadata for authentication |
| **External Service** | Registration for External Services |

#### Example Generated Code

```apex
/**
 * Auto-generated by Connectforce
 * Connection: NetSuite API
 * Generated: 2026-01-04
 */
public class NetSuiteApiService {
    
    private static final String NAMED_CREDENTIAL = 'NetSuite_API';
    
    public static HttpResponse getCustomers() {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + NAMED_CREDENTIAL + '/customers');
        req.setMethod('GET');
        req.setHeader('Content-Type', 'application/json');
        
        Http http = new Http();
        return http.send(req);
    }
    
    // ... more methods
}
```

---

### ERP Templates

Pre-built connection templates for popular ERP systems.

#### Available Templates

| ERP System | API Type | Features |
|------------|----------|----------|
| **NetSuite** | REST/SuiteTalk | OAuth 2.0, RESTlets |
| **SAP S/4HANA** | OData | OAuth, Batch operations |
| **Microsoft Dynamics 365** | REST/OData | Azure AD auth |
| **Acumatica** | REST | Token auth |
| **QuickBooks Online** | REST | OAuth 2.0 |
| **Xero** | REST | OAuth 2.0 |

#### Using Templates

1. Open Command Palette
2. Run `Connectforce: Create from ERP Template`
3. Select ERP system
4. Enter your credentials
5. Template creates connection with pre-configured endpoints

---

## Commands Reference

### All Commands

| Command | Title | Description |
|---------|-------|-------------|
| `connectforce.openBuilder` | Open Integration Builder | Opens the visual connection builder |
| `connectforce.openRestExplorer` | Open REST Explorer | Opens the REST API explorer |
| `connectforce.newConnection` | New External Connection | Create a new API connection |
| `connectforce.importOpenAPI` | Import OpenAPI/Swagger Spec | Import from OpenAPI file |
| `connectforce.generateApex` | Generate Apex Callout Class | Generate Apex from connection |
| `connectforce.createNamedCredential` | Create Named Credential | Generate Named Credential XML |
| `connectforce.createExternalService` | Create External Service | Generate External Service registration |
| `connectforce.testConnection` | Test Connection | Test API connectivity |
| `connectforce.openFieldMapper` | Open Field Mapper | Open visual field mapper |
| `connectforce.refreshConnections` | Refresh Connections | Reload connections list |
| `connectforce.deployToOrg` | Deploy Integration to Org | Deploy generated code to org |
| `connectforce.viewIntegrationLogs` | View Integration Logs | Open integration logs |
| `connectforce.createERPTemplate` | Create from ERP Template | Create connection from template |

---

## Configuration

### Settings

Access via: `File → Preferences → Settings → Extensions → Connectforce`

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `connectforce.defaultAuthType` | string | `"OAuth2"` | Default authentication type |
| `connectforce.apexOutputPath` | string | `"force-app/main/default/classes"` | Output path for Apex classes |
| `connectforce.namedCredentialPath` | string | `"force-app/main/default/namedCredentials"` | Output path for Named Credentials |
| `connectforce.externalServicePath` | string | `"force-app/main/default/externalServices"` | Output path for External Services |
| `connectforce.generateTestClasses` | boolean | `true` | Auto-generate test classes |
| `connectforce.enableMockServices` | boolean | `true` | Generate mock service classes |
| `connectforce.autoSyncFieldMappings` | boolean | `false` | Auto-sync field mappings |
| `connectforce.logLevel` | string | `"info"` | Log level (debug/info/warn/error) |

### Example settings.json

```json
{
  "connectforce.defaultAuthType": "OAuth2",
  "connectforce.apexOutputPath": "force-app/main/default/classes",
  "connectforce.generateTestClasses": true,
  "connectforce.enableMockServices": true,
  "connectforce.logLevel": "info"
}
```

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| (Configurable) | `connectforce.openRestExplorer` | Open REST Explorer |
| (Configurable) | `connectforce.openBuilder` | Open Integration Builder |

### REST Explorer Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send request / Run query |

### SOQL Query Builder Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Show field suggestions |
| `↓` / `↑` | Navigate suggestions |
| `Tab` / `Enter` | Insert selected field |
| `Esc` | Close suggestions dropdown |
| `Ctrl+Enter` | Run query |

---

## UI Components

### Sidebar Views

Connectforce adds a sidebar panel with the following tree views:

| View | Icon | Description |
|------|------|-------------|
| **Connections** | 🔌 | List of configured connections |
| **Field Mappings** | 🔀 | Configured field mappings |
| **Templates** | 📦 | Available ERP templates |
| **Sync Status** | 🔄 | Integration sync status |
| **REST Explorer** | 🔍 | Quick access to REST Explorer |

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Connected / Success |
| 🟡 Yellow | Warning / Pending |
| 🔴 Red | Error / Disconnected |
| ⏳ Loading | Operation in progress |

---

## Technical Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Language** | TypeScript |
| **Bundler** | esbuild |
| **UI Framework** | VS Code Webview API |
| **Salesforce Integration** | Salesforce CLI (sf) |
| **Storage** | VS Code ExtensionContext, localStorage |

### File Structure

```
connectforce/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── providers/             # Tree view providers
│   │   ├── ConnectionsProvider.ts
│   │   ├── FieldMappingsProvider.ts
│   │   ├── TemplatesProvider.ts
│   │   └── SyncStatusProvider.ts
│   ├── services/              # Business logic
│   │   ├── CodeGeneratorService.ts
│   │   ├── OpenAPIService.ts
│   │   ├── SalesforceService.ts
│   │   └── StorageService.ts
│   ├── webview/               # Webview panels
│   │   ├── IntegrationBuilderPanel.ts
│   │   ├── FieldMapperPanel.ts
│   │   └── RestExplorerPanel.ts
│   ├── types/                 # TypeScript interfaces
│   │   └── index.ts
│   └── utils/                 # Utilities
│       └── Logger.ts
├── snippets/
│   └── apex-integration.json  # Apex code snippets
├── resources/
│   └── icons/
│       └── icon.svg
├── docs/
│   └── PRODUCT_DOCUMENTATION.md
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### Data Storage

| Data | Storage Location | Persistence |
|------|------------------|-------------|
| Connections | VS Code globalState | Per workspace |
| Field Mappings | VS Code globalState | Per workspace |
| Saved Endpoints | Browser localStorage | Per webview session |
| Field Cache | In-memory | Session only |

---

## Changelog

### Version 1.0.0 (January 4, 2026)

#### Features
- ✅ REST Explorer with full HTTP method support
- ✅ SOQL Query Builder with field auto-complete
- ✅ Save/favorite endpoints feature
- ✅ Visual Connection Builder
- ✅ Field Mapper with drag-and-drop
- ✅ Apex code generation
- ✅ Named Credential generation
- ✅ External Service registration
- ✅ ERP Templates (NetSuite, SAP, Dynamics 365, etc.)
- ✅ OpenAPI/Swagger import
- ✅ Connection testing
- ✅ Apex code snippets

#### Technical
- Built with TypeScript and esbuild
- VS Code Webview API for UI
- Salesforce CLI integration
- Comprehensive error handling

---

## Roadmap

### Planned Features

#### Phase 1 - Core Developer Tools (Q1 2026)
- [ ] Anonymous Apex Runner
- [ ] Object & Field Explorer (tree view)
- [ ] Enhanced query history with favorites

#### Phase 2 - Data & Debugging (Q2 2026)
- [ ] Debug Log Analyzer with flamegraph visualization
- [ ] Data Export to CSV/JSON/Excel
- [ ] Tooling API integration

#### Phase 3 - Advanced Features (Q3 2026)
- [ ] Data Import tool
- [ ] Test Runner with coverage visualization
- [ ] Flow Analyzer

#### Phase 4 - Enterprise Features (Q4 2026)
- [ ] Metadata Diff between orgs
- [ ] Permission Set Analyzer
- [ ] API Limit Monitor dashboard

---

## Support

### Reporting Issues

1. Open VS Code
2. Go to Help → Report Issue
3. Select "Connectforce" extension
4. Describe the issue with steps to reproduce

### Feedback

We welcome feature requests and feedback! Please submit through:
- GitHub Issues
- VS Code Extension Marketplace reviews

---

## License

MIT License - See LICENSE file for details.

---

*Documentation Version: 1.0.0*  
*Last Updated: January 4, 2026*
