/**
 * Test script for MA Research Assistant
 */

const MAResearchAgent = require("./agent");

async function runTests() {
  console.log("===========================================");
  console.log("MA Research Assistant - Test Suite");
  console.log("===========================================\n");

  var passed = 0;
  var failed = 0;

  // Test 1: Module loading
  try {
    console.log("[Test 1] Loading modules...");
    if (MAResearchAgent) {
      console.log("✓ PASS: Modules loaded\n");
      passed++;
    }
  } catch (e) {
    console.log("✗ FAIL: " + e.message + "\n");
    failed++;
  }

  // Test 2: Agent instantiation
  try {
    console.log("[Test 2] Instantiating agent...");
    var agent = new MAResearchAgent();
    if (agent.venice && agent.pubmed && agent.output) {
      console.log("✓ PASS: Agent instantiated\n");
      passed++;
    }
  } catch (e) {
    console.log("✗ FAIL: " + e.message + "\n");
    failed++;
  }

  // Test 3: PubMed search (if API available)
  try {
    console.log("[Test 3] Testing PubMed search...");
    var results = await agent.quickSearch("COVID-19 vaccine efficacy", 5);
    if (results && results.length > 0) {
      console.log("✓ PASS: PubMed search returned " + results.length + " results");
      console.log("  First result: " + results[0].title.substring(0, 60) + "...\n");
      passed++;
    } else {
      console.log("⚠ WARN: No results returned\n");
    }
  } catch (e) {
    console.log("✗ FAIL: " + e.message + "\n");
    failed++;
  }

  // Test 4: Venice API (if key available)
  try {
    console.log("[Test 4] Testing Venice API...");
    if (agent.venice.apiKey) {
      var response = await agent.venice.generate("Say 'Venice API test successful' in exactly those words");
      if (response && response.includes("Venice API test successful")) {
        console.log("✓ PASS: Venice API responding\n");
        passed++;
      } else {
        console.log("⚠ WARN: Venice API responded but text unexpected\n");
      }
    } else {
      console.log("⚠ SKIP: No Venice API key configured\n");
    }
  } catch (e) {
    console.log("✗ FAIL: " + e.message + "\n");
    failed++;
  }

  // Summary
  console.log("===========================================");
  console.log("Test Results: " + passed + " passed, " + failed + " failed");
  console.log("===========================================\n");

  return { passed, failed };
}

// Run tests
runTests().then(function(results) {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(function(err) {
  console.error("Test error:", err);
  process.exit(1);
});