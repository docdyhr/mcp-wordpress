/**
 * Security Monitoring and Alerting System
 * Provides real-time security monitoring, threat detection, and incident response
 */

import { EventEmitter } from "events";
import { SecurityUtils } from "./SecurityConfig.js";
import { LoggerFactory } from "../utils/logger.js";

const logger = LoggerFactory.security();

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: "authentication" | "authorization" | "input-validation" | "data-access" | "system" | "anomaly";
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  details: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    payload?: unknown;
    error?: string;
    metadata?: Record<string, unknown>;
  };
  description: string;
  riskScore: number;
  handled: boolean;
  actions: SecurityAction[];
}

interface SecurityAction {
  id: string;
  type: "block" | "throttle" | "alert" | "log" | "investigate" | "escalate";
  timestamp: Date;
  automated: boolean;
  result: "success" | "failure" | "pending";
  details: string;
}

interface SecurityAlert {
  id: string;
  eventId: string;
  timestamp: Date;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  category: string;
  affectedSystems: string[];
  indicators: {
    type: string;
    value: string;
    confidence: number;
  }[];
  recommendations: string[];
  status: "new" | "investigating" | "resolved" | "false-positive";
  assignee?: string;
  resolution?: {
    timestamp: Date;
    action: string;
    details: string;
  };
}

interface ThreatIntelligence {
  id: string;
  type: "ip" | "domain" | "hash" | "pattern" | "signature";
  value: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  description: string;
  indicators: string[];
  lastSeen: Date;
  expiry?: Date;
}

interface SecurityMetrics {
  timestamp: Date;
  events: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  threats: {
    blocked: number;
    detected: number;
    investigated: number;
  };
  alerts: {
    new: number;
    resolved: number;
    falsePositives: number;
  };
  performance: {
    responseTime: number;
    detectionRate: number;
    falsePositiveRate: number;
  };
}

interface AnomalyPattern {
  id: string;
  type: "traffic" | "authentication" | "access" | "behavior";
  pattern: string;
  threshold: number;
  timeWindow: number;
  description: string;
  enabled: boolean;
}

/**
 * Real-time Security Monitor
 */
export class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private threatIntel: Map<string, ThreatIntelligence> = new Map();
  private anomalyPatterns: AnomalyPattern[] = [];
  private metrics: SecurityMetrics[] = [];
  private isMonitoring = false;
  private metricsInterval?: NodeJS.Timeout | undefined;

  constructor() {
    super();
    this.initializeAnomalyPatterns();
  }

  /**
   * Start security monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      logger.warn("Already monitoring");
      return;
    }

    this.isMonitoring = true;
    logger.info("Starting security monitoring");

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    this.emit("monitoring-started");
  }

  /**
   * Stop security monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      logger.warn("Not currently monitoring");
      return;
    }

    this.isMonitoring = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    logger.info("Stopped security monitoring");
    this.emit("monitoring-stopped");
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventData: Omit<SecurityEvent, "id" | "timestamp" | "handled" | "actions">,
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      ...eventData,
      id: SecurityUtils.generateSecureToken(16),
      timestamp: new Date(),
      handled: false,
      actions: [],
    };

    this.events.push(event);

    // Process event in real-time
    await this.processSecurityEvent(event);

    // Check for anomalies
    await this.checkForAnomalies(event);

    // Emit event for real-time processing
    this.emit("security-event", event);

    logger.info(`Logged ${event.severity} event: ${event.type} - ${event.description}`);

    return event;
  }

  /**
   * Process security event and take automated actions
   */
  private async processSecurityEvent(event: SecurityEvent): Promise<void> {
    const actions: SecurityAction[] = [];

    // High-severity events get immediate attention
    if (event.severity === "critical" || event.severity === "high") {
      actions.push(await this.createAction("alert", event, true));

      if (event.type === "authentication" && event.details.ipAddress) {
        // Consider blocking suspicious IPs
        const suspiciousActivity = await this.checkSuspiciousActivity(event.details.ipAddress);
        if (suspiciousActivity) {
          actions.push(await this.createAction("block", event, true));
        }
      }
    }

    // Rate limiting for authentication events
    if (event.type === "authentication" && event.details.userId) {
      const failedAttempts = await this.getFailedAuthAttempts(event.details.userId);
      if (failedAttempts > 5) {
        actions.push(await this.createAction("throttle", event, true));
      }
    }

    // Check against threat intelligence
    if (event.details.ipAddress) {
      const threat = this.threatIntel.get(event.details.ipAddress);
      if (threat) {
        actions.push(await this.createAction("block", event, true));
        actions.push(await this.createAction("alert", event, true));
      }
    }

    event.actions = actions;
    event.handled = actions.length > 0;

    // Create alert if necessary
    if (event.severity === "critical" || (event.severity === "high" && event.riskScore > 7)) {
      await this.createAlert(event);
    }
  }

  /**
   * Create security action
   */
  private async createAction(
    type: SecurityAction["type"],
    event: SecurityEvent,
    automated: boolean,
  ): Promise<SecurityAction> {
    const action: SecurityAction = {
      id: SecurityUtils.generateSecureToken(12),
      type,
      timestamp: new Date(),
      automated,
      result: "pending",
      details: `${type} action triggered for ${event.type} event`,
    };

    try {
      // Execute the action
      switch (type) {
        case "block":
          await this.executeBlockAction(event);
          break;
        case "throttle":
          await this.executeThrottleAction(event);
          break;
        case "alert":
          await this.executeAlertAction(event);
          break;
        case "log":
          await this.executeLogAction(event);
          break;
        default:
          logger.info(`Action ${type} queued for manual processing`, { type });
      }

      action.result = "success";
      action.details += " - executed successfully";
    } catch (error) {
      action.result = "failure";
      action.details += ` - failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`Action ${type} failed`, { type, error });
    }

    return action;
  }

  /**
   * Execute block action
   */
  private async executeBlockAction(event: SecurityEvent): Promise<void> {
    if (event.details.ipAddress) {
      logger.info(`Blocking IP: ${event.details.ipAddress}`);
      // In a real implementation, this would interface with firewall/load balancer
      this.emit("ip-blocked", { ip: event.details.ipAddress, reason: event.description });
    }
  }

  /**
   * Execute throttle action
   */
  private async executeThrottleAction(event: SecurityEvent): Promise<void> {
    if (event.details.userId) {
      logger.info(`Throttling user: ${event.details.userId}`);
      // In a real implementation, this would apply rate limiting
      this.emit("user-throttled", { userId: event.details.userId, reason: event.description });
    }
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(event: SecurityEvent): Promise<void> {
    logger.info(`Alert triggered for event: ${event.id}`);
    this.emit("security-alert", event);
  }

  /**
   * Execute log action
   */
  private async executeLogAction(event: SecurityEvent): Promise<void> {
    logger.info(`Enhanced logging for event: ${event.id}`);
    // Additional detailed logging would go here
  }

  /**
   * Create security alert
   */
  private async createAlert(event: SecurityEvent): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: SecurityUtils.generateSecureToken(16),
      eventId: event.id,
      timestamp: new Date(),
      severity: event.severity,
      title: `Security Alert: ${event.type}`,
      description: event.description,
      category: event.type,
      affectedSystems: [event.source],
      indicators: this.extractIndicators(event),
      recommendations: this.generateRecommendations(event),
      status: "new",
    };

    this.alerts.push(alert);

    logger.info(`Created ${alert.severity} alert: ${alert.title}`);
    this.emit("alert-created", alert);

    return alert;
  }

  /**
   * Extract indicators from security event
   */
  private extractIndicators(event: SecurityEvent): SecurityAlert["indicators"] {
    const indicators: SecurityAlert["indicators"] = [];

    if (event.details.ipAddress) {
      indicators.push({
        type: "ip-address",
        value: event.details.ipAddress,
        confidence: 0.8,
      });
    }

    if (event.details.userAgent) {
      indicators.push({
        type: "user-agent",
        value: event.details.userAgent,
        confidence: 0.6,
      });
    }

    if (event.details.endpoint) {
      indicators.push({
        type: "endpoint",
        value: event.details.endpoint,
        confidence: 0.7,
      });
    }

    return indicators;
  }

  /**
   * Generate recommendations for event
   */
  private generateRecommendations(event: SecurityEvent): string[] {
    const recommendations: string[] = [];

    switch (event.type) {
      case "authentication":
        recommendations.push("Review authentication logs for patterns");
        recommendations.push("Consider implementing multi-factor authentication");
        if (event.severity === "high" || event.severity === "critical") {
          recommendations.push("Temporarily block suspicious IP addresses");
        }
        break;

      case "authorization":
        recommendations.push("Review user permissions and access controls");
        recommendations.push("Audit privilege escalation attempts");
        break;

      case "input-validation":
        recommendations.push("Review input validation rules");
        recommendations.push("Update WAF rules if applicable");
        break;

      case "data-access":
        recommendations.push("Review data access patterns");
        recommendations.push("Implement data loss prevention measures");
        break;

      case "system":
        recommendations.push("Check system integrity");
        recommendations.push("Review system logs for correlating events");
        break;

      case "anomaly":
        recommendations.push("Investigate unusual patterns");
        recommendations.push("Tune anomaly detection thresholds");
        break;
    }

    return recommendations;
  }

  /**
   * Check for suspicious activity from IP
   */
  private async checkSuspiciousActivity(ipAddress: string): Promise<boolean> {
    const recentEvents = this.events.filter(
      (event) => event.details.ipAddress === ipAddress && event.timestamp.getTime() > Date.now() - 3600000, // Last hour
    );

    // Multiple failed authentication attempts
    const failedAuth = recentEvents.filter((event) => event.type === "authentication" && event.severity === "high");

    if (failedAuth.length > 5) {
      return true;
    }

    // Multiple different user attempts from same IP
    const userIds = new Set(recentEvents.map((event) => event.details.userId).filter(Boolean));
    if (userIds.size > 10) {
      return true;
    }

    return false;
  }

  /**
   * Get failed authentication attempts for user
   */
  private async getFailedAuthAttempts(userId: string): Promise<number> {
    const recentEvents = this.events.filter(
      (event) =>
        event.type === "authentication" &&
        event.details.userId === userId &&
        event.severity === "high" &&
        event.timestamp.getTime() > Date.now() - 900000, // Last 15 minutes
    );

    return recentEvents.length;
  }

  /**
   * Check for anomalies
   */
  private async checkForAnomalies(event: SecurityEvent): Promise<void> {
    for (const pattern of this.anomalyPatterns) {
      if (!pattern.enabled) continue;

      if (await this.matchesAnomalyPattern(event, pattern)) {
        await this.logSecurityEvent({
          type: "anomaly",
          severity: "medium",
          source: "anomaly-detection",
          description: `Anomaly detected: ${pattern.description}`,
          riskScore: 5,
          details: {
            metadata: { pattern: pattern.pattern, patternId: pattern.id, originalEvent: event.id },
          },
        });
      }
    }
  }

  /**
   * Check if event matches anomaly pattern
   */
  private async matchesAnomalyPattern(event: SecurityEvent, pattern: AnomalyPattern): Promise<boolean> {
    // Simplified pattern matching - in practice this would be more sophisticated
    const timeWindow = Date.now() - pattern.timeWindow;
    const relatedEvents = this.events.filter((e) => e.timestamp.getTime() > timeWindow && e.type === event.type);

    switch (pattern.type) {
      case "traffic":
        return relatedEvents.length > pattern.threshold;

      case "authentication":
        return event.type === "authentication" && relatedEvents.length > pattern.threshold;

      case "access":
        return event.type === "data-access" && relatedEvents.length > pattern.threshold;

      case "behavior":
        // Check for unusual user behavior patterns
        if (event.details.userId) {
          const userEvents = relatedEvents.filter((e) => e.details.userId === event.details.userId);
          return userEvents.length > pattern.threshold;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Initialize default anomaly patterns
   */
  private initializeAnomalyPatterns(): void {
    this.anomalyPatterns = [
      {
        id: "high-auth-failures",
        type: "authentication",
        pattern: "failed-auth-attempts",
        threshold: 10,
        timeWindow: 300000, // 5 minutes
        description: "High number of authentication failures",
        enabled: true,
      },
      {
        id: "unusual-access-pattern",
        type: "access",
        pattern: "data-access-spike",
        threshold: 50,
        timeWindow: 900000, // 15 minutes
        description: "Unusual data access pattern",
        enabled: true,
      },
      {
        id: "traffic-spike",
        type: "traffic",
        pattern: "request-volume",
        threshold: 100,
        timeWindow: 300000, // 5 minutes
        description: "Traffic volume spike",
        enabled: true,
      },
      {
        id: "user-behavior-anomaly",
        type: "behavior",
        pattern: "user-activity",
        threshold: 20,
        timeWindow: 3600000, // 1 hour
        description: "Unusual user behavior pattern",
        enabled: true,
      },
    ];
  }

  /**
   * Collect security metrics
   */
  private collectMetrics(): void {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);

    const recentEvents = this.events.filter((event) => event.timestamp > hourAgo);
    const recentAlerts = this.alerts.filter((alert) => alert.timestamp > hourAgo);

    const metrics: SecurityMetrics = {
      timestamp: now,
      events: {
        total: recentEvents.length,
        byType: this.groupBy(recentEvents, "type"),
        bySeverity: this.groupBy(recentEvents, "severity"),
      },
      threats: {
        blocked: recentEvents.filter((e) => e.actions.some((a) => a.type === "block")).length,
        detected: recentEvents.filter((e) => e.riskScore > 5).length,
        investigated: recentAlerts.filter((a) => a.status === "investigating").length,
      },
      alerts: {
        new: recentAlerts.filter((a) => a.status === "new").length,
        resolved: recentAlerts.filter((a) => a.status === "resolved").length,
        falsePositives: recentAlerts.filter((a) => a.status === "false-positive").length,
      },
      performance: {
        responseTime: this.calculateAverageResponseTime(recentEvents),
        detectionRate: this.calculateDetectionRate(recentEvents),
        falsePositiveRate: this.calculateFalsePositiveRate(recentAlerts),
      },
    };

    this.metrics.push(metrics);

    // Keep only last 24 hours of metrics
    const dayAgo = new Date(now.getTime() - 86400000);
    this.metrics = this.metrics.filter((m) => m.timestamp > dayAgo);

    this.emit("metrics-collected", metrics);
  }

  /**
   * Group array by property
   */
  private groupBy(array: Array<Record<string, any>>, property: string): Record<string, number> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return array.reduce<Record<string, number>>((acc, item) => {
      const key = (item && item[property]) || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculate average response time for security events
   */
  private calculateAverageResponseTime(events: SecurityEvent[]): number {
    const handledEvents = events.filter((e) => e.handled && e.actions.length > 0);
    if (handledEvents.length === 0) return 0;

    const totalTime = handledEvents.reduce((sum, event) => {
      const firstAction = event.actions[0];
      if (firstAction) {
        return sum + (firstAction.timestamp.getTime() - event.timestamp.getTime());
      }
      return sum;
    }, 0);

    return totalTime / handledEvents.length;
  }

  /**
   * Calculate detection rate
   */
  private calculateDetectionRate(events: SecurityEvent[]): number {
    const totalEvents = events.length;
    if (totalEvents === 0) return 1;

    const detectedEvents = events.filter((e) => e.handled || e.riskScore > 3).length;
    return detectedEvents / totalEvents;
  }

  /**
   * Calculate false positive rate
   */
  private calculateFalsePositiveRate(alerts: SecurityAlert[]): number {
    const totalAlerts = alerts.length;
    if (totalAlerts === 0) return 0;

    const falsePositives = alerts.filter((a) => a.status === "false-positive").length;
    return falsePositives / totalAlerts;
  }

  /**
   * Add threat intelligence
   */
  addThreatIntelligence(threat: ThreatIntelligence): void {
    this.threatIntel.set(threat.value, threat);
    logger.info(`Added threat intelligence: ${threat.type} - ${threat.value}`);
  }

  /**
   * Remove threat intelligence
   */
  removeThreatIntelligence(value: string): boolean {
    const removed = this.threatIntel.delete(value);
    if (removed) {
      logger.info(`Removed threat intelligence: ${value}`);
    }
    return removed;
  }

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: SecurityAlert["status"], assignee?: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.status = status;
    if (assignee) {
      alert.assignee = assignee;
    }

    if (status === "resolved") {
      alert.resolution = {
        timestamp: new Date(),
        action: "manual-resolution",
        details: "Alert marked as resolved",
      };
    }

    logger.info(`Updated alert ${alertId} status to ${status}`);
    this.emit("alert-updated", alert);
    return true;
  }

  /**
   * Get security events
   */
  getEvents(
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      type?: string;
      since?: Date;
    } = {},
  ): SecurityEvent[] {
    let events = [...this.events];

    if (options.since) {
      events = events.filter((e) => e.timestamp >= options.since!);
    }

    if (options.severity) {
      events = events.filter((e) => e.severity === options.severity);
    }

    if (options.type) {
      events = events.filter((e) => e.type === options.type);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.offset) {
      events = events.slice(options.offset);
    }

    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get security alerts
   */
  getAlerts(
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      status?: string;
      since?: Date;
    } = {},
  ): SecurityAlert[] {
    let alerts = [...this.alerts];

    if (options.since) {
      alerts = alerts.filter((a) => a.timestamp >= options.since!);
    }

    if (options.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }

    if (options.status) {
      alerts = alerts.filter((a) => a.status === options.status);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.offset) {
      alerts = alerts.slice(options.offset);
    }

    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get security metrics
   */
  getMetrics(
    options: {
      since?: Date;
      until?: Date;
    } = {},
  ): SecurityMetrics[] {
    let metrics = [...this.metrics];

    if (options.since) {
      metrics = metrics.filter((m) => m.timestamp >= options.since!);
    }

    if (options.until) {
      metrics = metrics.filter((m) => m.timestamp <= options.until!);
    }

    return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get system status
   */
  getStatus(): {
    monitoring: boolean;
    eventsToday: number;
    alertsOpen: number;
    threatsBlocked: number;
    systemHealth: "healthy" | "degraded" | "critical";
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventsToday = this.events.filter((e) => e.timestamp >= today).length;
    const alertsOpen = this.alerts.filter((a) => a.status === "new" || a.status === "investigating").length;
    const threatsBlocked = this.events.filter(
      (e) => e.timestamp >= today && e.actions.some((a) => a.type === "block"),
    ).length;

    let systemHealth: "healthy" | "degraded" | "critical" = "healthy";
    if (alertsOpen > 10) systemHealth = "critical";
    else if (alertsOpen > 5 || eventsToday > 100) systemHealth = "degraded";

    return {
      monitoring: this.isMonitoring,
      eventsToday,
      alertsOpen,
      threatsBlocked,
      systemHealth,
    };
  }
}
