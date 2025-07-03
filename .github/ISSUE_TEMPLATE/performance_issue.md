---
name: ⚡ Performance Issue
about: Report performance problems, slowness, or optimization suggestions
title: '[PERFORMANCE] '
labels: 'performance'
assignees: ''
---

## ⚡ Performance Issue Description

**What performance issue are you experiencing?**
- [ ] Slow response times
- [ ] High memory usage
- [ ] CPU usage spikes
- [ ] Cache inefficiency
- [ ] Network timeouts
- [ ] Large file handling issues

**Detailed description:**
[Describe the specific performance problem you're encountering]

## 📊 Performance Metrics

**Current performance:**
- **Response time**: [e.g., 2-5 seconds average]
- **Memory usage**: [e.g., 500MB+ during operation]
- **CPU usage**: [e.g., 80%+ consistently]
- **Cache hit rate**: [e.g., 30% from cache stats]

**Expected performance:**
- **Target response time**: [e.g., <500ms]
- **Acceptable memory**: [e.g., <200MB]
- **Expected CPU**: [e.g., <50%]

**Performance test results:**
```bash
# Run performance tests and share results
npm run test:performance
npm run health
```

## 🌍 Environment Details

**System Configuration:**
- **OS**: [e.g., macOS 14.0, Ubuntu 22.04]
- **Hardware**: [CPU, RAM, disk type]
- **Node.js version**: [e.g., v20.10.0]
- **MCP WordPress version**: [e.g., v1.3.0]
- **Installation**: [NPM, Docker, source]

**WordPress Environment:**
- **WordPress version**: [e.g., 6.4.2]
- **Site size**: [posts, pages, media count]
- **Active plugins**: [especially cache/performance plugins]
- **Hosting environment**: [shared, VPS, dedicated, cloud]
- **Database size**: [approximate size if known]

**MCP Usage Pattern:**
- **Concurrent users/clients**: [number of simultaneous connections]
- **Request volume**: [requests per minute/hour]
- **Operation types**: [which tools are used most frequently]
- **Data volume**: [size of typical requests/responses]

## 🔄 Reproduction Steps

**To reproduce the performance issue:**
1. Configure MCP with [specific settings]
2. Execute [specific commands or operations]
3. Monitor [specific metrics]
4. Observe [performance degradation]

**Workload characteristics:**
- **Peak usage times**: [when does the issue occur]
- **Specific operations**: [which commands are slow]
- **Data patterns**: [large files, many posts, etc.]

## 📈 Monitoring Data

**Performance monitoring output:**
```bash
# Share output from performance monitoring
npm run test:performance
```

**Cache statistics:**
```bash
# Share cache efficiency data
wp_cache_stats --site=your-site
```

**System resource usage:**
```bash
# Monitor during issue occurrence
top -p $(pgrep node)
# Or on Windows: Task Manager screenshot
```

## 🔧 Optimization Attempts

**What have you tried?**
- [ ] Adjusted cache settings
- [ ] Modified rate limiting
- [ ] Changed authentication method
- [ ] Optimized WordPress configuration
- [ ] Updated system resources
- [ ] Disabled plugins

**Configuration changes tested:**
```json
{
  "caching": {
    "maxSize": "value tested",
    "defaultTTL": "value tested"
  }
}
```

**Results of optimization attempts:**
[Describe what worked, what didn't, and measured improvements]

## 💡 Suggested Solutions

**Potential optimizations:**
- [ ] Cache configuration tuning
- [ ] Request batching/pagination
- [ ] Connection pooling
- [ ] Rate limiting adjustment
- [ ] Memory management improvements
- [ ] Database query optimization

**Specific suggestions:**
[If you have ideas for performance improvements]

## 📊 Impact Assessment

**Business impact:**
- [ ] Blocks normal usage
- [ ] Significantly slows workflow
- [ ] Causes user frustration
- [ ] Increases infrastructure costs
- [ ] Minor inconvenience

**Affected operations:**
- [ ] All operations affected
- [ ] Specific tools: [list which ones]
- [ ] Only during peak usage
- [ ] Only with large datasets

## 🎯 Performance Goals

**Target metrics:**
- **Response time**: [specific goal, e.g., <500ms for 95% of requests]
- **Memory usage**: [target limit]
- **Throughput**: [requests per second goal]
- **Cache efficiency**: [target hit rate %]

**Acceptable degradation:**
[What performance levels would be acceptable]

## 📝 Additional Context

**Performance comparisons:**
[Compare with other tools, previous versions, or different environments]

**Logs and diagnostics:**
```
[Share relevant performance logs, slow query logs, etc.]
```

**Profiling data:**
[If you have profiling information, share it here]

---

**Checklist for submitters:**
- [ ] I've measured actual performance metrics
- [ ] I've tested with latest version
- [ ] I've tried basic optimization steps
- [ ] I've provided system specifications
- [ ] I've described the performance goal clearly