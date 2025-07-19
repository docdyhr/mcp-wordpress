#!/usr/bin/env node
/**
 * Security System Demonstration Script
 * Shows how to use the AI-powered security suite
 */

import { security } from "../dist/security/index.js";

async function demonstrateSecurity() {
  console.log("🔒 AI-Powered Security Suite Demonstration\n");

  try {
    // Initialize the security system
    console.log("📊 Initializing security system...");
    await security.init();
    console.log("✅ Security system initialized\n");

    // Show system status
    console.log("📈 Security System Status:");
    const status = security.status();
    console.log(`- System: ${status.system ? "✅ Active" : "❌ Inactive"}`);
    console.log(`- Monitoring: ${status.monitoring.monitoring ? "✅ Running" : "❌ Stopped"}`);
    console.log(`- Events Today: ${status.monitoring.eventsToday}`);
    console.log(`- Open Alerts: ${status.monitoring.alertsOpen}`);
    console.log(`- System Health: ${status.monitoring.systemHealth}\n`);

    // Demonstrate security scanning
    console.log("🔍 Running AI-powered security scan...");
    const scanResult = await security.scan({
      targets: ["src/security/"],
      depth: "shallow",
      includeFileSystem: false,
      includeRuntime: false,
    });

    console.log(`📊 Scan Results:`);
    console.log(`- Total Vulnerabilities: ${scanResult.summary.total}`);
    console.log(`- Critical: ${scanResult.summary.critical}`);
    console.log(`- High: ${scanResult.summary.high}`);
    console.log(`- Medium: ${scanResult.summary.medium}`);
    console.log(`- Low: ${scanResult.summary.low}`);
    console.log(`- Remediations Available: ${scanResult.remediationAvailable}\n`);

    // Demonstrate code review
    if (scanResult.vulnerabilities.length > 0) {
      const firstVuln = scanResult.vulnerabilities[0];
      if (firstVuln.location.file) {
        console.log("📝 Running security code review...");
        const reviewResult = await security.review(firstVuln.location.file, {
          rules: ["auth-001", "input-001", "crypto-001"],
          aiAnalysis: false,
        });

        console.log(`📊 Review Results for ${reviewResult.file}:`);
        console.log(`- Findings: ${reviewResult.findings.length}`);
        console.log(`- Overall Rating: ${reviewResult.overallRating}`);
        console.log(`- Security Score: ${reviewResult.summary.totalFindings > 0 ? "Issues Found" : "Clean"}\n`);
      }
    }

    // Demonstrate remediation (dry run)
    if (scanResult.vulnerabilities.length > 0) {
      console.log("🔧 Testing automated remediation (dry run)...");
      const remediationResults = await security.remediate(scanResult, true);

      console.log(`📊 Remediation Results:`);
      console.log(`- Actions Simulated: ${remediationResults.length}`);
      console.log(`- Successful: ${remediationResults.filter((r) => r.success).length}`);
      console.log(`- Failed: ${remediationResults.filter((r) => !r.success).length}\n`);
    }

    // Log a demo security event
    console.log("📡 Logging security event...");
    await security.logEvent({
      type: "authentication",
      severity: "medium",
      source: "demo-script",
      description: "Demonstration authentication event",
      riskScore: 3,
      details: {
        userId: "demo-user",
        ipAddress: "192.168.1.100",
        userAgent: "Demo-Script/1.0",
        endpoint: "/wp-json/wp/v2/users",
        method: "POST",
      },
    });
    console.log("✅ Security event logged\n");

    // Show final status
    console.log("📊 Final Security Status:");
    const finalStatus = security.status();
    console.log(`- Events Today: ${finalStatus.monitoring.eventsToday}`);
    console.log(`- System Health: ${finalStatus.monitoring.systemHealth}`);

    console.log("\n🎉 Security demonstration completed successfully!");
    console.log("\n📚 Available Security Commands:");
    console.log("- npm run security:scan       # Full vulnerability scan");
    console.log("- npm run security:review     # Code security review");
    console.log("- npm run security:remediate  # Automated remediation");
    console.log("- npm run security:monitor    # Start monitoring");
    console.log("- npm run security:config     # Configuration management");
    console.log("- npm run security:pipeline   # CI/CD integration");
    console.log("- npm run security:full       # Complete security suite");
  } catch (error) {
    console.error("❌ Security demonstration failed:", error);
    process.exit(1);
  } finally {
    // Shutdown security system
    security.shutdown();
    console.log("\n🔒 Security system shutdown complete");
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️  Received SIGINT, shutting down gracefully...");
  security.shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⚠️  Received SIGTERM, shutting down gracefully...");
  security.shutdown();
  process.exit(0);
});

// Run the demonstration
demonstrateSecurity().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
