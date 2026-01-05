# Changelog

All notable changes to the Connectforce extension.

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Visual Connection Builder with tabbed interface
- Support for multiple authentication types:
  - No Authentication
  - Basic Authentication
  - API Key (Header/Query)
  - OAuth 2.0
  - JWT Bearer Token
- Pre-built ERP templates:
  - NetSuite (REST API)
  - SAP S/4HANA (OData)
  - Microsoft Dynamics 365
  - Acumatica
  - QuickBooks Online
  - Xero
- OpenAPI/Swagger specification import
- Endpoint management with full CRUD operations
- Visual Field Mapper with:
  - Drag-and-drop mapping
  - AI-powered field suggestions
  - Bidirectional sync support
- Apex code generation:
  - Service classes with callout methods
  - Test classes with mock implementations
  - Mock service classes for testing
- Named Credential XML generation
- External Service registration generation
- Tree view providers for:
  - Connections
  - Field Mappings
  - Templates
  - Sync Status
- Connection testing with status indicators
- Apex code snippets for integration patterns
- Comprehensive documentation

### Technical
- Built with TypeScript
- Uses esbuild for fast compilation
- VS Code Webview API for UI
- Salesforce CLI integration
- JSforce for Salesforce connectivity
