# MCP WordPress Server - Blueprint

## Overview

This MCP (Model Context Protocol) server enables complete management of a WordPress CMS system through structured tools and functions. The server utilizes the WordPress REST API v2 for all operations.

## WordPress REST API Foundation

**Yes, WordPress has a very powerful REST API!** The WordPress REST API v2 provides complete access to:

- **Posts** (`/wp/v2/posts`) - Create, edit, delete blog posts
- **Pages** (`/wp/v2/pages`) - Manage static pages  
- **Media** (`/wp/v2/media`) - Upload and manage images, files
- **Users** (`/wp/v2/users`) - User management
- **Categories/Tags** (`/wp/v2/categories`, `/wp/v2/tags`) - Taxonomies
- **Comments** (`/wp/v2/comments`) - Comment moderation
- **Settings** (`/wp/v2/settings`) - Site settings
- **Themes** (`/wp/v2/themes`) - Theme management
- **Plugins** (`/wp/v2/plugins`) - Plugin management
- **Menus** - Navigation management
- **Widgets** - Sidebar widgets
- **Custom Post Types** - Custom content types

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  MCP-WordPress   │───▶│  WordPress Site │
│   (Claude/LLM)  │    │     Server       │    │   (REST API)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

1. **MCP Server** (Node.js/JavaScript)
   - Implements MCP protocol
   - Provides tools for WordPress operations
   - Handles authentication
   - Validates and formats data

2. **WordPress REST API Client**
   - HTTP client for WordPress API
   - Authentication (Application Passwords, JWT, OAuth)
   - Error handling and retry logic

3. **Tool Definitions**
   - Structured MCP tools for each WordPress operation
   - Schema validation for parameters
   - Typed responses

## Hauptfunktionalitäten

### 1. Content Management

#### Blog Posts
- `create_post` - Neuen Blogbeitrag erstellen
  - Titel, Inhalt, Excerpt, Autor
  - Kategorien und Tags zuweisen
  - Featured Image setzen
  - Publikationsstatus (draft, publish, private)
  - Publikationsdatum planen

- `update_post` - Bestehenden Post bearbeiten
- `delete_post` - Post löschen
- `list_posts` - Posts auflisten (mit Filtering)
- `get_post` - Einzelnen Post abrufen

#### Pages (Statische Seiten)
- `create_page` - Neue Seite erstellen
- `update_page` - Seite bearbeiten
- `delete_page` - Seite löschen
- `list_pages` - Seiten auflisten
- `get_page` - Einzelne Seite abrufen

#### Media Management
- `upload_media` - Dateien hochladen (Bilder, Videos, PDFs)
- `list_media` - Media Library durchsuchen
- `delete_media` - Medien löschen
- `update_media` - Metadaten bearbeiten

### 2. User Management
- `create_user` - Neuen Benutzer anlegen
- `update_user` - Benutzerdaten ändern
- `delete_user` - Benutzer löschen
- `list_users` - Benutzer auflisten
- `get_user` - Benutzerprofil abrufen

### 3. Taxonomies (Kategorien & Tags)
- `create_category` - Neue Kategorie
- `update_category` - Kategorie bearbeiten
- `delete_category` - Kategorie löschen
- `list_categories` - Kategorien auflisten
- `create_tag` / `update_tag` / `delete_tag` / `list_tags` - Tag-Management

### 4. Comments
- `approve_comment` - Kommentar freigeben
- `reject_comment` - Kommentar ablehnen
- `delete_comment` - Kommentar löschen
- `list_comments` - Kommentare auflisten (auch pending)
- `reply_comment` - Auf Kommentar antworten

### 5. Site Management
- `get_site_settings` - WordPress-Einstellungen abrufen
- `update_site_settings` - Einstellungen ändern
- `list_themes` - Verfügbare Themes
- `activate_theme` - Theme aktivieren
- `list_plugins` - Installierte Plugins
- `activate_plugin` / `deactivate_plugin` - Plugins verwalten

### 6. Navigation & Menus
- `create_menu` - Neues Menü erstellen
- `update_menu` - Menü bearbeiten
- `add_menu_item` - Menüpunkt hinzufügen
- `remove_menu_item` - Menüpunkt entfernen
- `list_menus` - Alle Menüs auflisten

### 7. Advanced Features
- `bulk_operations` - Mehrere Posts/Pages gleichzeitig bearbeiten
- `search_content` - Site-weite Suche
- `get_analytics` - Grundlegende Analytics (wenn verfügbar)
- `backup_content` - Content exportieren
- `import_content` - Content importieren

## Technische Implementierung

### Projektstruktur
```
src/
├── index.ts              # MCP Server Entry Point
├── tools/                # MCP Tool Definitions
│   ├── posts.ts         # Post-Management Tools
│   ├── pages.ts         # Page-Management Tools
│   ├── media.ts         # Media-Management Tools
│   ├── users.ts         # User-Management Tools
│   ├── comments.ts      # Comment-Management Tools
│   ├── taxonomies.ts    # Categories/Tags Tools
│   ├── site.ts          # Site Settings Tools
│   └── navigation.ts    # Menu-Management Tools
├── client/               # WordPress API Client
│   ├── api.ts           # HTTP Client
│   ├── auth.ts          # Authentication
│   └── types.ts         # TypeScript Interfaces
├── utils/                # Utilities
│   ├── validation.ts    # Schema Validation
│   ├── formatting.ts    # Data Formatting
│   └── errors.ts        # Error Handling
└── config/
    └── schema.ts         # MCP Tool Schemas
```

### Authentifizierung

WordPress REST API unterstützt mehrere Authentifizierungsmethoden:

1. **Application Passwords** (Empfohlen)
   - WordPress 5.6+ Native Unterstützung
   - User-spezifische App-Passwörter
   - HTTP Basic Auth über HTTPS

2. **JWT Authentication** (Plugin erforderlich)
   - JSON Web Tokens
   - Stateless Authentication

3. **OAuth 2.0** (Plugin erforderlich)
   - Für externe Anwendungen

### Konfiguration

```typescript
interface WordPressConfig {
  baseUrl: string;          // https://example.com
  username: string;         // WordPress Username
  password: string;         // Application Password
  authMethod: 'app-password' | 'jwt' | 'oauth';
  timeout: number;          // Request Timeout
  retryAttempts: number;    // Retry Logic
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}
```

### Error Handling

- **401 Unauthorized** - Authentifizierung prüfen
- **403 Forbidden** - Benutzerrechte unzureichend  
- **404 Not Found** - Resource existiert nicht
- **429 Too Many Requests** - Rate Limiting
- **500 Server Error** - WordPress-seitiger Fehler

### Rate Limiting

WordPress API hat standardmäßig keine Rate Limits, aber:
- Höfliche Implementierung mit konfigurierbaren Limits
- Exponential Backoff bei Fehlern
- Queue-System für Bulk-Operationen

## Sicherheit

### Best Practices
1. **HTTPS Only** - Alle API-Calls über verschlüsselte Verbindung
2. **Application Passwords** - Keine echten Benutzerpasswörter
3. **Least Privilege** - Minimale erforderliche Benutzerrechte
4. **Input Validation** - Alle Parameter validieren
5. **Output Sanitization** - Responses säubern
6. **Audit Logging** - Alle Operationen protokollieren

### WordPress-Benutzerrechte
- **Administrator** - Vollzugriff auf alle Funktionen
- **Editor** - Posts, Pages, Comments, Media
- **Author** - Eigene Posts und Media
- **Contributor** - Eigene Posts (nur Draft)
- **Subscriber** - Nur Lesen

## Installation & Setup

### Voraussetzungen
- WordPress 5.0+ mit aktivierter REST API
- Node.js 18+
- TypeScript
- MCP SDK

### WordPress-seitige Vorbereitung
1. REST API aktivieren (standardmäßig aktiv)
2. Application Password für Benutzer erstellen
3. Benutzerrechte entsprechend konfigurieren
4. Optional: CORS-Headers konfigurieren

### MCP Server Installation
```bash
npm install
npm run build
npm start
```

### Konfiguration
```json
{
  "wordpress": {
    "baseUrl": "https://your-wordpress-site.com",
    "username": "api-user",
    "password": "xxxx xxxx xxxx xxxx xxxx xxxx",
    "authMethod": "app-password"
  }
}
```

## Testing

### Unit Tests
- Tool-Definitionen
- API Client
- Authentication
- Data Validation

### Integration Tests
- Echte WordPress-Installation
- Vollständige CRUD-Operationen
- Error Scenarios

### E2E Tests
- MCP Client Integration
- Komplette Workflows

## Monitoring & Logging

### Metriken
- API Response Times
- Error Rates
- Usage Statistics
- Rate Limiting Events

### Logging
- Structured JSON Logs
- Request/Response Logging
- Error Stack Traces
- User Action Audit Trail

## Roadmap

### Phase 1: Core Functionality
- [x] Bauplan erstellen
- [ ] Basic MCP Server Setup
- [ ] Posts/Pages CRUD
- [ ] Media Upload
- [ ] Authentication

### Phase 2: Advanced Features
- [ ] Comments Management
- [ ] User Management
- [ ] Taxonomies
- [ ] Bulk Operations

### Phase 3: Pro Features
- [ ] Menu Management
- [ ] Plugin/Theme Management  
- [ ] SEO Integration
- [ ] Analytics Integration
- [ ] Backup/Restore

### Phase 4: Extensions
- [ ] WooCommerce Integration
- [ ] Custom Post Types
- [ ] Advanced Custom Fields
- [ ] Multisite Support

## Fazit

Die WordPress REST API bietet alles, was für einen vollständigen MCP WordPress Server benötigt wird. Mit über 30 verschiedenen Endpoints können praktisch alle WordPress-Funktionen remote gesteuert werden. Die API ist stabil, gut dokumentiert und seit WordPress 4.7 (2016) integraler Bestandteil von WordPress.

Der MCP Server wird eine benutzerfreundliche Schnittstelle bieten, um WordPress-Sites vollständig über natürliche Sprache zu verwalten - von der Content-Erstellung bis hin zur kompletten Site-Administration.
