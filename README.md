# MCP WordPress Server

Ein vollständiger Model Context Protocol (MCP) Server für WordPress-Management durch die WordPress REST API v2. Komplett in TypeScript geschrieben für maximale Typsicherheit und bessere Developer Experience.

## 🚀 Features

- **54 WordPress Management Tools** über 8 Kategorien
- **100% TypeScript** - Vollständige Typsicherheit und IntelliSense
- **Moderne ES Modules** - Optimiert für Performance
- **Interaktiver Setup-Wizard** - Einfache Einrichtung
- **Umfassende Tests** - Vollständige Test-Suite
- **Flexible Authentifizierung** - Unterstützt App Passwords, JWT, Basic Auth
- **Debug & Monitoring** - Strukturiertes Logging und Fehlerverfolgung

## ⚡ Schnellstart

### 1. Installation

```bash
git clone <repository-url>
cd mcp-wordpress
npm install
```

### 2. Setup Wizard

```bash
npm run setup
```

Der Setup-Wizard führt Sie durch:
- WordPress-Site-Konfiguration
- Authentifizierungsmethode-Auswahl
- Verbindungstest
- Claude Desktop Konfiguration

### 3. Server starten

```bash
npm start
```

## 🔧 Konfiguration

### Environment Variables (.env)

```env
WORDPRESS_SITE_URL=https://ihre-wordpress-site.com
WORDPRESS_USERNAME=ihr-benutzername
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_AUTH_METHOD=app-password
DEBUG=false
```

### Claude Desktop Integration

Nach dem Setup-Wizard wird automatisch eine MCP-Konfiguration erstellt. Fügen Sie diese in Ihre Claude Desktop `mcp.json` ein:

#### Automatische Konfiguration
```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/pfad/zu/mcp-wordpress/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://ihre-site.com",
        "WORDPRESS_USERNAME": "ihr-username",
        "WORDPRESS_APP_PASSWORD": "ihr-app-password",
        "WORDPRESS_AUTH_METHOD": "app-password"
      }
    }
  }
}
```

#### Alternative: Mit .env-Datei
```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/pfad/zu/mcp-wordpress/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Claude Desktop Konfigurationsdatei Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## 🛠 Build System

### TypeScript Build

```bash
# Kompilieren
npm run build

# Watch-Modus
npm run build:watch

# Typprüfung
npm run typecheck
```

### Entwicklung

```bash
# Development-Modus mit Debug-Ausgabe
npm run dev

# Status prüfen
npm run status

# Setup erneut ausführen
npm run setup
```

## 🔐 Authentifizierung

### WordPress Application Passwords (Empfohlen)

1. **WordPress Admin** → **Benutzer** → **Profil**
2. Scrollen Sie zu **Application Passwords**
3. Name eingeben (z.B. "MCP WordPress Server")
4. **Add New Application Password** klicken
5. Generiertes Passwort kopieren (Format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

### Alternative Authentifizierungsmethoden

```env
# JWT Authentication (erfordert JWT Plugin)
WORDPRESS_AUTH_METHOD=jwt
WORDPRESS_JWT_SECRET=ihr-jwt-secret

# Basic Authentication (nicht für Produktion empfohlen)
WORDPRESS_AUTH_METHOD=basic
WORDPRESS_PASSWORD=ihr-echtes-passwort

# API Key Authentication (erfordert API Key Plugin)
WORDPRESS_AUTH_METHOD=api-key
WORDPRESS_API_KEY=ihr-api-key
```

## 📋 Verfügbare Tools (54 Tools)

### 📝 Posts (6 Tools)
- `wp_list_posts` - Blog-Posts auflisten und filtern
- `wp_get_post` - Spezifischen Post abrufen
- `wp_create_post` - Neue Posts erstellen
- `wp_update_post` - Posts bearbeiten
- `wp_delete_post` - Posts löschen
- `wp_get_post_revisions` - Post-Revisionen abrufen

### 📄 Pages (6 Tools)
- `wp_list_pages` - Seiten auflisten
- `wp_get_page` - Spezifische Seite abrufen
- `wp_create_page` - Neue Seiten erstellen
- `wp_update_page` - Seiten bearbeiten
- `wp_delete_page` - Seiten löschen
- `wp_get_page_revisions` - Seiten-Revisionen abrufen

### 🖼️ Media (6 Tools)
- `wp_list_media` - Medienbibliothek durchsuchen
- `wp_get_media` - Mediendetails abrufen
- `wp_upload_media` - Dateien hochladen
- `wp_update_media` - Medien-Metadaten bearbeiten
- `wp_delete_media` - Medien löschen
- `wp_get_media_sizes` - Verfügbare Bildgrößen abrufen

### 👥 Users (6 Tools)
- `wp_list_users` - Benutzer auflisten
- `wp_get_user` - Benutzerdetails abrufen
- `wp_create_user` - Neue Benutzer erstellen
- `wp_update_user` - Benutzerprofile bearbeiten
- `wp_delete_user` - Benutzer löschen
- `wp_get_current_user` - Aktuellen Benutzer abrufen

### 💬 Comments (7 Tools)
- `wp_list_comments` - Kommentare auflisten
- `wp_get_comment` - Kommentardetails abrufen
- `wp_create_comment` - Neue Kommentare erstellen
- `wp_update_comment` - Kommentare bearbeiten
- `wp_delete_comment` - Kommentare löschen
- `wp_approve_comment` - Kommentare genehmigen
- `wp_spam_comment` - Kommentare als Spam markieren

### 🏷️ Taxonomies (10 Tools)
- `wp_list_categories` - Kategorien auflisten
- `wp_get_category` - Kategoriedetails abrufen
- `wp_create_category` - Neue Kategorien erstellen
- `wp_update_category` - Kategorien bearbeiten
- `wp_delete_category` - Kategorien löschen
- `wp_list_tags` - Tags auflisten
- `wp_get_tag` - Tag-Details abrufen
- `wp_create_tag` - Neue Tags erstellen
- `wp_update_tag` - Tags bearbeiten
- `wp_delete_tag` - Tags löschen

### ⚙️ Site Management (7 Tools)
- `wp_get_site_settings` - Site-Einstellungen abrufen
- `wp_update_site_settings` - Site-Einstellungen aktualisieren
- `wp_get_site_stats` - Site-Statistiken abrufen
- `wp_search_site` - Site-weite Suche
- `wp_get_application_passwords` - App-Passwörter auflisten
- `wp_create_application_password` - Neue App-Passwörter erstellen
- `wp_delete_application_password` - App-Passwörter löschen

### 🔐 Authentication (6 Tools)
- `wp_test_auth` - Authentifizierung testen
- `wp_get_auth_status` - Authentifizierungsstatus abrufen
- `wp_start_oauth_flow` - OAuth-Flow starten
- `wp_complete_oauth_flow` - OAuth-Flow abschließen
- `wp_refresh_oauth_token` - OAuth-Token erneuern
- `wp_switch_auth_method` - Authentifizierungsmethode wechseln

## 🧪 Testing

```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Schnelle Tests
npm run test:fast

# MCP Integration Tests
npm run test:mcp

# Tests im Watch-Modus
npm run test:watch
```

## 📊 Status & Monitoring

```bash
# Verbindungsstatus prüfen
npm run status

# Debug-Modus
DEBUG=true npm run dev

# Lint Code
npm run lint

# Auto-Fix Linting-Fehler
npm run lint:fix
```

## 🏗 Projekt-Struktur

```
mcp-wordpress/
├── src/                     # TypeScript-Quellcode
│   ├── index.ts            # Haupt-MCP-Server
│   ├── server.ts           # Server-Kompatibilität
│   ├── types/              # TypeScript-Definitionen
│   │   ├── wordpress.ts    # WordPress API-Typen
│   │   ├── mcp.ts         # MCP-Protokoll-Typen
│   │   ├── client.ts      # Client-Interface-Typen
│   │   └── index.ts       # Typ-Exporte
│   ├── client/             # WordPress API-Client
│   │   ├── api.ts         # HTTP-Client
│   │   └── auth.ts        # Authentifizierung
│   ├── tools/              # MCP-Tool-Implementierungen
│   │   ├── posts.ts       # Post-Management
│   │   ├── pages.ts       # Seiten-Management
│   │   ├── media.ts       # Medien-Management
│   │   ├── users.ts       # Benutzer-Management
│   │   ├── comments.ts    # Kommentar-Management
│   │   ├── taxonomies.ts  # Kategorien/Tags
│   │   ├── site.ts        # Site-Einstellungen
│   │   └── auth.ts        # Authentifizierung
│   └── utils/              # Hilfsfunktionen
│       └── debug.ts       # Debug-Logger
├── dist/                   # Kompilierte JavaScript-Dateien
├── bin/                    # Utility-Skripte
│   ├── setup.js          # Setup-Wizard
│   └── status.js          # Status-Checker
├── tests/                  # Test-Suite
├── tsconfig.json          # TypeScript-Konfiguration
├── jest.config.json       # Jest-Test-Konfiguration
└── package.json           # Node.js-Projekt-Konfiguration
```

## 💡 TypeScript-Features

- **Vollständige Typsicherheit** - Compile-Zeit-Validierung
- **IntelliSense-Support** - Bessere IDE-Integration
- **Type-safe API-Client** - Typisierte HTTP-Methoden
- **Comprehensive WordPress-Typen** - 400+ Zeilen präzise Definitionen
- **MCP-Protokoll-Typen** - Tool-Definitionen und Handler
- **Enhanced Error Handling** - Typisierte Exceptions
- **Source Maps** - Debugging-Unterstützung

## 🔧 WordPress-Requirements

- **WordPress 5.0+** mit aktivierter REST API
- **HTTPS** (empfohlen für Produktion)
- **Benutzer mit entsprechenden Rechten**
- **Application Passwords** aktiviert (WordPress 5.6+)

### WordPress-Benutzerrollen

| Rolle | Zugriff |
|-------|---------|
| **Administrator** | Vollzugriff auf alle Funktionen |
| **Editor** | Posts, Seiten, Kommentare, Medien |
| **Author** | Eigene Posts und Medien |
| **Contributor** | Eigene Posts (nur Entwürfe) |
| **Subscriber** | Nur Lesen |

## 🐛 Troubleshooting

### Häufige Probleme

1. **"Cannot connect to WordPress"**
   - Prüfen Sie WORDPRESS_SITE_URL
   - Stellen Sie sicher, dass die REST API erreichbar ist
   - Testen Sie: `curl https://ihre-site.com/wp-json/wp/v2/`

2. **"Authentication failed"**
   - Überprüfen Sie Username und App-Password
   - Stellen Sie sicher, dass Application Passwords aktiviert sind
   - Versuchen Sie `npm run setup` erneut

3. **"TypeScript compilation errors"**
   - Führen Sie `npm run typecheck` aus
   - Stellen Sie sicher, dass alle Dependencies installiert sind

### Debug-Logs

```bash
DEBUG=true npm run dev
```

## 📚 API-Dokumentationen

- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Repository forken
2. Feature-Branch erstellen: `git checkout -b feature/neue-funktion`
3. Änderungen committen: `git commit -m 'Neue Funktion hinzufügen'`
4. Branch pushen: `git push origin feature/neue-funktion`
5. Pull Request erstellen

## 📄 License

MIT License - siehe LICENSE-Datei für Details

---

**🚀 Powered by TypeScript for better development experience and type safety!**