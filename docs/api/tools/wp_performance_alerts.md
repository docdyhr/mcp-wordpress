# wp_performance_alerts

![performance](https://img.shields.io/badge/category-performance-brightgreen)

Get performance alerts and anomaly detection results

## Parameters

| Parameter          | Type      | Required | Description                                                       | Default | Examples              |
| ------------------ | --------- | -------- | ----------------------------------------------------------------- | ------- | --------------------- |
| `site`             | `string`  | ❌       | Specific site ID for multi-site setups (optional for single site) | -       | `site1`, `production` |
| `severity`         | `string`  | ❌       | Filter alerts by severity level (info, warning, error, critical)  | -       | `example`             |
| `category`         | `string`  | ❌       | Filter alerts by category (performance, cache, system, wordpress) | `all`   | `example`             |
| `limit`            | `number`  | ❌       | Maximum number of alerts to return (default: 20)                  | -       | `10`, `20`            |
| `includeAnomalies` | `boolean` | ❌       | Include detected anomalies (default: true)                        | -       | `example`             |

## Examples

### Basic performance Usage

Simple example of using wp_performance_alerts

**Command:**

```bash
wp_performance_alerts
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

Using wp_performance_alerts with specific site targeting

**Command:**

```bash
wp_performance_alerts --site="site1"
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
wp_performance_alerts --site="site1" --severity="example_value" --category="overview" --limit="20" --includeAnomalies="example_value"
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
    "tool": "wp_performance_alerts",
    "site": "site1"
  }
}
```

## Error Handling

### AUTHENTICATION_FAILED

**Message:** Authentication failed **Description:** Invalid credentials or insufficient permissions **Resolution:**
Check your authentication credentials and user permissions

### VALIDATION_ERROR

**Message:** Parameter validation failed **Description:** One or more required parameters are missing or invalid
**Resolution:** Review the required parameters and their formats

### NOT_FOUND

**Message:** Resource not found **Description:** The requested resource does not exist **Resolution:** Verify the
resource ID and ensure it exists

### PERMISSION_DENIED

**Message:** Insufficient permissions **Description:** The user does not have permission to perform this action
**Resolution:** Contact an administrator to grant the necessary permissions

---

_Generated automatically from tool definitions - Do not edit manually_
