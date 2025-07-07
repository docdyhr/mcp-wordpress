# wp_performance_optimize

![performance](https://img.shields.io/badge/category-performance-brightgreen)

Get optimization recommendations and insights

## Parameters

| Parameter | Type | Required | Description | Default | Examples |
|-----------|------|----------|-------------|---------|----------|
| `site` | `string` | ❌ | Specific site ID for multi-site setups (optional for single site) | - | `site1`, `production` |
| `focus` | `string` | ❌ | Optimization focus area (speed, reliability, efficiency, scaling) | - | `example` |
| `priority` | `string` | ❌ | Implementation timeline (quick_wins, medium_term, long_term, all) | - | `example` |
| `includeROI` | `boolean` | ❌ | Include ROI estimates (default: true) | - | `example` |
| `includePredictions` | `boolean` | ❌ | Include performance predictions (default: true) | - | `example` |

## Examples

### Basic performance Usage

Simple example of using wp_performance_optimize

**Command:**

```bash
wp_performance_optimize 
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "overallHealth": "Good",
      "performanceScore": 85,
      "averageResponseTime": "245ms",
      "cacheHitRate": "87.5%"
    }
  }
}
```

**Error Example (Authentication failure):**

```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials or insufficient permissions"
}
```

### Multi-Site performance Usage

Using wp_performance_optimize with specific site targeting

**Command:**

```bash
wp_performance_optimize --site="site1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "overallHealth": "Good",
      "performanceScore": 85,
      "averageResponseTime": "245ms",
      "cacheHitRate": "87.5%"
    }
  }
}
```

### Advanced performance Configuration

Comprehensive example using all available parameters

**Command:**

```bash
wp_performance_optimize --site="site1" --focus="example_value" --priority="example_value" --includeROI="example_value" --includePredictions="example_value"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "overallHealth": "Good",
      "performanceScore": 85,
      "averageResponseTime": "245ms",
      "cacheHitRate": "87.5%"
    }
  }
}
```

## Response Format

**Return Type:** `PerformanceMetrics`

```json
{
  "success": true,
  "data": {
    // PerformanceMetrics response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "wp_performance_optimize",
    "site": "site1"
  }
}
```

## Error Handling

### AUTHENTICATION_FAILED

**Message:** Authentication failed  
**Description:** Invalid credentials or insufficient permissions  
**Resolution:** Check your authentication credentials and user permissions

### VALIDATION_ERROR

**Message:** Parameter validation failed  
**Description:** One or more required parameters are missing or invalid  
**Resolution:** Review the required parameters and their formats

### NOT_FOUND

**Message:** Resource not found  
**Description:** The requested resource does not exist  
**Resolution:** Verify the resource ID and ensure it exists

### PERMISSION_DENIED

**Message:** Insufficient permissions  
**Description:** The user does not have permission to perform this action  
**Resolution:** Contact an administrator to grant the necessary permissions

---

*Generated automatically from tool definitions - Do not edit manually*
