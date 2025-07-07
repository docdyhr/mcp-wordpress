# API Reference

Complete technical reference for the MCP WordPress Server API, tools, and interfaces.

## 🔧 Core API Classes

### WordPressClient

Primary interface for WordPress REST API communication.

```typescript
class WordPressClient {
  constructor(config: ClientConfig);
  
  // Core managers
  auth: AuthenticationManager;
  request: RequestManager;
  cache: CacheManager;
  
  // Content APIs
  posts: PostsAPI;
  pages: PagesAPI;
  media: MediaAPI;
  users: UsersAPI;
  comments: CommentsAPI;
  taxonomies: TaxonomiesAPI;
  
  // Site management
  settings: SettingsAPI;
  plugins: PluginsAPI;
  themes: ThemesAPI;
}
```

**Configuration Interface**:

```typescript
interface ClientConfig {
  siteUrl: string;
  username: string;
  password?: string;
  appPassword?: string;
  authMethod?: 'app-password' | 'jwt' | 'basic' | 'api-key';
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  debug?: boolean;
}
```

### AuthenticationManager

Handles multiple WordPress authentication methods.

```typescript
class AuthenticationManager {
  // Authentication methods
  async authenticateWithAppPassword(username: string, password: string): Promise<AuthResult>;
  async authenticateWithJWT(username: string, password: string): Promise<AuthResult>;
  async authenticateWithBasic(username: string, password: string): Promise<AuthResult>;
  async authenticateWithApiKey(apiKey: string): Promise<AuthResult>;
  
  // Token management
  async refreshToken(): Promise<string>;
  async validateToken(token: string): Promise<boolean>;
  async revokeToken(token: string): Promise<void>;
  
  // Headers
  getAuthHeaders(): Record<string, string>;
  isAuthenticated(): boolean;
}
```

### RequestManager

HTTP request handling with retry logic and rate limiting.

```typescript
class RequestManager {
  // HTTP methods
  async get<T>(endpoint: string, params?: QueryParams): Promise<T>;
  async post<T>(endpoint: string, data?: any): Promise<T>;
  async put<T>(endpoint: string, data?: any): Promise<T>;
  async patch<T>(endpoint: string, data?: any): Promise<T>;
  async delete<T>(endpoint: string): Promise<T>;
  
  // Batch operations
  async batchRequest<T>(requests: BatchRequest[]): Promise<T[]>;
  
  // File uploads
  async uploadFile(file: File, options?: UploadOptions): Promise<MediaItem>;
  
  // Rate limiting
  async waitForRateLimit(): Promise<void>;
  getRateLimitStatus(): RateLimitStatus;
}
```

## 📝 MCP Tools API

### Tool Categories

#### Posts Tools (PostTools)

```typescript
class PostTools {
  // Content management
  async createPost(params: CreatePostParams): Promise<PostResult>;
  async updatePost(params: UpdatePostParams): Promise<PostResult>;
  async deletePost(params: DeletePostParams): Promise<DeleteResult>;
  async getPost(params: GetPostParams): Promise<PostResult>;
  async listPosts(params: ListPostsParams): Promise<PostListResult>;
  async getPostRevisions(params: GetPostRevisionsParams): Promise<PostRevisionsResult>;
}
```

**Parameter Interfaces**:

```typescript
interface CreatePostParams {
  title: string;
  content?: string;
  excerpt?: string;
  status?: 'draft' | 'publish' | 'private' | 'pending';
  author?: number;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: Record<string, any>;
  site?: string; // Multi-site support
}

interface PostResult {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  author: number;
  date: string;
  modified: string;
  link: string;
  slug: string;
  categories: number[];
  tags: number[];
  featured_media: number;
  meta: Record<string, any>;
}
```

#### Pages Tools (PageTools)

```typescript
class PageTools {
  async createPage(params: CreatePageParams): Promise<PageResult>;
  async updatePage(params: UpdatePageParams): Promise<PageResult>;
  async deletePage(params: DeletePageParams): Promise<DeleteResult>;
  async getPage(params: GetPageParams): Promise<PageResult>;
  async listPages(params: ListPagesParams): Promise<PageListResult>;
  async getPageRevisions(params: GetPageRevisionsParams): Promise<PageRevisionsResult>;
}
```

#### Media Tools (MediaTools)

```typescript
class MediaTools {
  async uploadMedia(params: UploadMediaParams): Promise<MediaResult>;
  async updateMedia(params: UpdateMediaParams): Promise<MediaResult>;
  async deleteMedia(params: DeleteMediaParams): Promise<DeleteResult>;
  async getMedia(params: GetMediaParams): Promise<MediaResult>;
  async listMedia(params: ListMediaParams): Promise<MediaListResult>;
}
```

**Upload Parameters**:

```typescript
interface UploadMediaParams {
  file: string | Buffer; // File path or buffer
  filename?: string;
  title?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  post?: number; // Attach to specific post
  site?: string;
}
```

#### Users Tools (UserTools)

```typescript
class UserTools {
  async createUser(params: CreateUserParams): Promise<UserResult>;
  async updateUser(params: UpdateUserParams): Promise<UserResult>;
  async deleteUser(params: DeleteUserParams): Promise<DeleteResult>;
  async getUser(params: GetUserParams): Promise<UserResult>;
  async listUsers(params: ListUsersParams): Promise<UserListResult>;
  async getCurrentUser(params: GetCurrentUserParams): Promise<UserResult>;
}
```

#### Comments Tools (CommentTools)

```typescript
class CommentTools {
  async createComment(params: CreateCommentParams): Promise<CommentResult>;
  async updateComment(params: UpdateCommentParams): Promise<CommentResult>;
  async deleteComment(params: DeleteCommentParams): Promise<DeleteResult>;
  async getComment(params: GetCommentParams): Promise<CommentResult>;
  async listComments(params: ListCommentsParams): Promise<CommentListResult>;
  async moderateComment(params: ModerateCommentParams): Promise<CommentResult>;
  async bulkModerateComments(params: BulkModerateCommentsParams): Promise<BulkResult>;
}
```

#### Taxonomies Tools (TaxonomyTools)

```typescript
class TaxonomyTools {
  // Categories
  async createCategory(params: CreateCategoryParams): Promise<CategoryResult>;
  async updateCategory(params: UpdateCategoryParams): Promise<CategoryResult>;
  async deleteCategory(params: DeleteCategoryParams): Promise<DeleteResult>;
  async getCategory(params: GetCategoryParams): Promise<CategoryResult>;
  async listCategories(params: ListCategoriesParams): Promise<CategoryListResult>;
  
  // Tags
  async createTag(params: CreateTagParams): Promise<TagResult>;
  async updateTag(params: UpdateTagParams): Promise<TagResult>;
  async deleteTag(params: DeleteTagParams): Promise<DeleteResult>;
  async getTag(params: GetTagParams): Promise<TagResult>;
  async listTags(params: ListTagsParams): Promise<TagListResult>;
}
```

#### Site Tools (SiteTools)

```typescript
class SiteTools {
  async getSiteInfo(params: GetSiteInfoParams): Promise<SiteInfoResult>;
  async updateSiteSettings(params: UpdateSiteSettingsParams): Promise<SiteSettingsResult>;
  async getSiteStats(params: GetSiteStatsParams): Promise<SiteStatsResult>;
  async getPlugins(params: GetPluginsParams): Promise<PluginsResult>;
  async getThemes(params: GetThemesParams): Promise<ThemesResult>;
  async searchContent(params: SearchContentParams): Promise<SearchResult>;
}
```

#### Authentication Tools (AuthTools)

```typescript
class AuthTools {
  async testAuth(params: TestAuthParams): Promise<AuthTestResult>;
  async refreshToken(params: RefreshTokenParams): Promise<TokenResult>;
  async validatePermissions(params: ValidatePermissionsParams): Promise<PermissionsResult>;
}
```

#### Cache Tools (CacheTools)

```typescript
class CacheTools {
  async getCacheStats(params: GetCacheStatsParams): Promise<CacheStatsResult>;
  async clearCache(params: ClearCacheParams): Promise<ClearCacheResult>;
  async warmCache(params: WarmCacheParams): Promise<WarmCacheResult>;
  async setCacheConfig(params: SetCacheConfigParams): Promise<CacheConfigResult>;
}
```

#### Performance Tools (PerformanceTools)

```typescript
class PerformanceTools {
  async getPerformanceMetrics(params: GetPerformanceMetricsParams): Promise<PerformanceMetricsResult>;
  async runPerformanceTest(params: RunPerformanceTestParams): Promise<PerformanceTestResult>;
  async getSystemHealth(params: GetSystemHealthParams): Promise<SystemHealthResult>;
  async benchmarkOperations(params: BenchmarkOperationsParams): Promise<BenchmarkResult>;
  async getOptimizationSuggestions(params: GetOptimizationSuggestionsParams): Promise<OptimizationResult>;
  async monitorRealTimeMetrics(params: MonitorRealTimeMetricsParams): Promise<RealTimeMetricsResult>;
}
```

## 🔒 Security API

### Input Validation

All tools use Zod schemas for parameter validation:

```typescript
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  status: z.enum(['draft', 'publish', 'private', 'pending']).optional(),
  author: z.number().positive().optional(),
  categories: z.array(z.number().positive()).optional(),
  tags: z.array(z.number().positive()).optional(),
  site: z.string().optional()
});
```

### Error Handling

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

class WordPressAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'WordPressAPIError';
  }
}
```

### Rate Limiting

```typescript
interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

class RateLimitManager {
  async checkRateLimit(endpoint: string): Promise<RateLimitStatus>;
  async waitForRateLimit(endpoint: string): Promise<void>;
  isRateLimited(endpoint: string): boolean;
}
```

## 📊 Performance API

### Metrics Collection

```typescript
interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  endpoint: string;
  success: boolean;
  cacheHit?: boolean;
  error?: string;
}

class MetricsCollector {
  collect(metric: PerformanceMetric): void;
  getMetrics(filter?: MetricFilter): PerformanceMetric[];
  getAggregatedMetrics(period: TimePeriod): AggregatedMetrics;
}
```

### Cache Management

```typescript
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number;
  size: number;
}

class CacheManager {
  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, value: T, ttl?: number): Promise<void>;
  async del(key: string): Promise<void>;
  async clear(pattern?: string): Promise<void>;
  
  // Cache statistics
  getStats(): CacheStats;
  getSize(): number;
  getHitRate(): number;
}
```

## 🛠️ Configuration API

### Multi-Site Configuration

```typescript
interface MultiSiteConfig {
  sites: SiteConfig[];
}

interface SiteConfig {
  id: string;
  name: string;
  config: {
    WORDPRESS_SITE_URL: string;
    WORDPRESS_USERNAME: string;
    WORDPRESS_APP_PASSWORD: string;
    WORDPRESS_AUTH_METHOD?: AuthMethod;
  };
}
```

### Environment Configuration

```typescript
interface EnvironmentConfig {
  WORDPRESS_SITE_URL: string;
  WORDPRESS_USERNAME: string;
  WORDPRESS_APP_PASSWORD?: string;
  WORDPRESS_AUTH_METHOD?: AuthMethod;
  DEBUG?: boolean;
  CACHE_ENABLED?: boolean;
  CACHE_TTL?: number;
  REQUEST_TIMEOUT?: number;
  RETRY_ATTEMPTS?: number;
}
```

## 🧪 Testing API

### Test Utilities

```typescript
class TestUtils {
  static createMockClient(config?: Partial<ClientConfig>): WordPressClient;
  static createMockPost(overrides?: Partial<Post>): Post;
  static createMockUser(overrides?: Partial<User>): User;
  static generateTestData<T>(schema: ZodSchema<T>): T;
}
```

### Test Fixtures

```typescript
interface TestFixtures {
  posts: Post[];
  users: User[];
  comments: Comment[];
  categories: Category[];
  tags: Tag[];
  media: MediaItem[];
}

class FixtureManager {
  static loadFixtures(): TestFixtures;
  static createTestSite(): Promise<TestSite>;
  static cleanupTestSite(site: TestSite): Promise<void>;
}
```

## 📚 Type Definitions

### WordPress Types

```typescript
interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: PostStatus;
  author: number;
  date: string;
  modified: string;
  link: string;
  slug: string;
  categories: number[];
  tags: number[];
  featured_media: number;
  meta: Record<string, any>;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  description: string;
  link: string;
  avatar_urls: Record<string, string>;
  roles: string[];
  capabilities: Record<string, boolean>;
  meta: Record<string, any>;
}

interface Comment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_email: string;
  author_url: string;
  content: string;
  date: string;
  status: CommentStatus;
  meta: Record<string, any>;
}
```

### MCP Types

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: ToolHandler;
}

interface ToolHandler {
  (params: any): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
```

## 🔍 Debugging API

### Debug Utilities

```typescript
class DebugLogger {
  static log(level: LogLevel, message: string, context?: any): void;
  static error(error: Error, context?: any): void;
  static performance(operation: string, duration: number): void;
  static http(method: string, url: string, status: number, duration: number): void;
}
```

### Health Check API

```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    authentication: HealthStatus;
    performance: HealthStatus;
  };
  timestamp: Date;
}

class HealthChecker {
  async checkHealth(): Promise<HealthCheck>;
  async checkDatabase(): Promise<HealthStatus>;
  async checkCache(): Promise<HealthStatus>;
  async checkAuthentication(): Promise<HealthStatus>;
}
```

## 📖 Usage Examples

### Basic Client Usage

```typescript
import { WordPressClient } from 'mcp-wordpress';

const client = new WordPressClient({
  siteUrl: 'https://your-site.com',
  username: 'admin',
  appPassword: 'xxxx xxxx xxxx xxxx xxxx xxxx',
  authMethod: 'app-password'
});

// Create a post
const post = await client.posts.create({
  title: 'My New Post',
  content: 'This is the post content',
  status: 'publish'
});
```

### Multi-Site Usage

```typescript
import { MCPWordPressServer } from 'mcp-wordpress';

const server = new MCPWordPressServer({
  sites: [
    {
      id: 'site1',
      name: 'Main Site',
      config: {
        WORDPRESS_SITE_URL: 'https://site1.com',
        WORDPRESS_USERNAME: 'admin',
        WORDPRESS_APP_PASSWORD: 'password1'
      }
    },
    {
      id: 'site2',
      name: 'Blog Site',
      config: {
        WORDPRESS_SITE_URL: 'https://site2.com',
        WORDPRESS_USERNAME: 'editor',
        WORDPRESS_APP_PASSWORD: 'password2'
      }
    }
  ]
});
```

## 📚 Further Reading

- **[Architecture Guide](ARCHITECTURE.md)** - System design and patterns
- **[Testing Guide](TESTING.md)** - Test suite and best practices
- **[Security Guidelines](SECURITY_DEVELOPMENT.md)** - Security best practices
- **[Performance Guide](PERFORMANCE_DEVELOPMENT.md)** - Performance optimization

---

**Need more details?** This API reference covers the complete technical interface. For implementation
examples, see the source code in `src/` directory.
