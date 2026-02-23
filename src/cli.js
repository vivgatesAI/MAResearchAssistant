/**
 * CLI Interface for MA Research Assistant
 */

const MAResearchAgent = require("./agent");

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: node cli.js <command> [options]");
  console.log("\nCommands:");
  console.log("  search <query>        - Quick PubMed search");
  console.log("  abstract <pmid>       - Get article abstract");
  console.log("  research <query>      - Full research workflow");
  console.log("  paper <query>         - Generate research paper");
  console.log("  slides <query>        - Generate PowerPoint slides");
  console.log("  summary <query>       - Generate summary");
  console.log("  kol <query>           - Generate KOL briefing");
  console.log("  competitive <query>   - Competitive analysis");
  console.log("\nOptions:");
  console.log("  --clinical            - Clinical trials only");
  console.log("  --recent N            - Last N years");
  console.log("  --max N               - Max results");
  console.log("  --focus <areas>       - Focus areas (comma-separated)");
  process.exit(1);
}

var command = args[0];

// Simple command parser
if (command === "search" && args[1]) {
  var query = args.slice(1).join(" ");
  var agent = new MAResearchAgent();
  agent.quickSearch(query, 10).then(function(results) {
    console.log("\n--- Search Results ---\n");
    results.forEach(function(r, i) {
      console.log((i+1) + ". " + r.title);
      console.log("   PMID: " + r.pmid + " | " + r.pubDate);
      if (r.journal) console.log("   Journal: " + r.journal);
      console.log("");
    });
  }).catch(function(err) {
    console.error("Error:", err.message);
  });
} 
else if (command === "abstract" && args[1]) {
  var pmid = args[1];
  var agent = new MAResearchAgent();
  agent.getAbstract(pmid).then(function(result) {
    console.log("\n--- Abstract ---\n");
    console.log(result.abstract || "No abstract found");
  }).catch(function(err) {
    console.error("Error:", err.message);
  });
}
else {
  // All other commands use research workflow
  var query = args.slice(1).join(" ").replace(/--\w+/g, "").trim();
  var taskType = "summary";
  var options = {};

  // Parse options
  if (command === "paper") taskType = "paper";
  else if (command === "slides") taskType = "slides";
  else if (command === "summary") taskType = "summary";
  else if (command === "kol") taskType = "kol-briefing";
  else if (command === "competitive") {
    taskType = "competitive";
    options.drugs = ["drug1", "drug2"]; // Would need proper parsing
  }
  else if (command === "research") taskType = "summary";

  // Parse flags
  if (args.includes("--clinical")) options.clinicalOnly = true;
  if (args.includes("--recent")) {
    var idx = args.indexOf("--recent");
    if (args[idx+1]) options.recentYears = parseInt(args[idx+1]);
  }
  if (args.includes("--max")) {
    var idx = args.indexOf("--max");
    if (args[idx+1]) options.maxResults = parseInt(args[idx+1]);
  }

  var agent = new MAResearchAgent();
  agent.research(query, taskType, options).then(function(result) {
    if (result.success) {
      console.log("\n✓ Research complete!");
      console.log("Output: " + result.outputPath);
    } else {
      console.error("\n✗ Error:", result.error);
    }
  }).catch(function(err) {
    console.error("Error:", err.message);
  });
}