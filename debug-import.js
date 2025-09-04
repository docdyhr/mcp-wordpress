// Debug import resolution
import { ConfigHelpers } from "./dist/config/Config.js";

console.log("ConfigHelpers:", ConfigHelpers);
console.log("ConfigHelpers keys:", Object.keys(ConfigHelpers));
console.log("ConfigHelpers.isTest:", ConfigHelpers.isTest);
console.log("ConfigHelpers.isTest type:", typeof ConfigHelpers.isTest);

// Try direct call
try {
  const result = ConfigHelpers.isTest();
  console.log("ConfigHelpers.isTest() result:", result);
} catch (error) {
  console.log("ConfigHelpers.isTest() error:", error.message);
}