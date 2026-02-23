/**
 * Medical Affairs Research Assistant - Main Agent
 * Orchestrates PubMed research + Venice AI synthesis
 */

const VeniceClient = require("./venice-client");
const PubMedClient = require("./pubmed-client");
const OutputGenerator = require("./output-generator");

class MAResearchAgent {
  constructor(options) {
    this.venice = new VeniceClient(options.veniceApiKey);
    this.pubmed = new PubMedClient();
    this.output = new OutputGenerator(options.outputDir || "./output");
    this.options = options || {};
  }

  /**
   * Main research workflow
   */
  async research(query, taskType, options) {
    options = options || {};
    var startTime = Date.now();
    
    console.log("\n===========================================");
    console.log("Medical Affairs Research Assistant");
    console.log("===========================================");
    console.log("Query: " + query);
    console.log("Task: " + taskType);
    console.log("===========================================\n");

    try {
      // Step 1: Search PubMed
      console.log("[1/4] Searching PubMed...");
      var articles;
      if (options.clinicalOnly) {
        articles = await this.pubmed.searchClinicalTrials(query, options.phase);
      } else if (options.recentYears) {
        articles = await this.pubmed.searchRecent(query, options.recentYears);
      } else {
        articles = await this.pubmed.searchFull(query, options.maxResults || 15);
      }
      console.log("Found " + articles.length + " articles\n");

      if (articles.length === 0) {
        throw new Error("No articles found for query");
      }

      // Step 2: Synthesize with Venice AI
      console.log("[2/4] Analyzing with Venice AI...");
      var summary;
      if (taskType === "summary") {
        summary = await this.venice.summarizeFindings(articles, options.focusAreas);
      } else if (taskType === "abstract") {
        summary = await this.venice.generateAbstract(articles, query);
      } else if (taskType === "kol-briefing") {
        summary = await this.venice.generateKOLBriefing(query, articles);
      } else if (taskType === "competitive") {
        summary = await this.venice.generateCompetitiveAnalysis(options.drugs || [], articles);
      } else if (taskType === "medical-info") {
        summary = await this.venice.generateMedicalInfoResponse(query, articles.slice(0, 5));
      } else {
        summary = await this.venice.summarizeFindings(articles);
      }
      console.log("Analysis complete\n");

      // Step 3: Generate output
      console.log("[3/4] Generating output...");
      var outputPath;
      if (taskType === "paper") {
        outputPath = await this.output.generatePaper(query, articles, summary);
      } else if (taskType === "slides") {
        outputPath = await this.output.generateSlides(query, articles, summary);
      } else {
        outputPath = await this.output.generateReport(query, articles, summary, taskType);
      }
      console.log("Output saved to: " + outputPath + "\n");

      // Step 4: Summary
      var duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log("[4/4] Complete!");
      console.log("===========================================");
      console.log("Total time: " + duration + " seconds");
      console.log("Articles analyzed: " + articles.length);
      console.log("Output: " + outputPath);
      console.log("===========================================\n");

      return {
        success: true,
        query: query,
        taskType: taskType,
        articles: articles,
        summary: summary,
        outputPath: outputPath,
        duration: duration
      };

    } catch (error) {
      console.error("Error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Quick search - just PubMed
   */
  async quickSearch(query, maxResults) {
    return this.pubmed.searchFull(query, maxResults || 10);
  }

  /**
   * Get abstract
   */
  async getAbstract(pmid) {
    return this.pubmed.getAbstract(pmid);
  }

  /**
   * Interactive mode
   */
  async interactive() {
    var readline = require("readline");
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("\nMedical Affairs Research Assistant - Interactive Mode");
    console.log("Commands: search, abstract, paper, slides, summary, kol, competitive, quit\n");

    var self = this;

    function ask() {
      rl.question("MA-Research> ", async function(input) {
        input = input.trim();
        
        if (input === "quit" || input === "exit") {
          rl.close();
          return;
        }

        if (input.length === 0) {
          ask();
          return;
        }

        // Check for common commands
        if (input.startsWith("search ")) {
          var query = input.substring(7);
          var results = await self.quickSearch(query);
          console.log("\n--- Results ---");
          results.forEach(function(r, i) {
            console.log((i+1) + ". " + r.title);
            console.log("   PMID: " + r.pmid + " | " + r.pubDate);
          });
          console.log("");
        } else if (input.startsWith("abstract ")) {
          var pmid = input.substring(9);
          var abstract = await self.getAbstract(pmid);
          console.log("\n--- Abstract ---");
          console.log(abstract.abstract || "No abstract found");
          console.log("");
        } else {
          // Treat as research query
          console.log("\nRunning research...");
          await self.research(input, "summary", { maxResults: 10 });
        }

        ask();
      });
    }

    ask();
  }
}

// Export
module.exports = MAResearchAgent;

// CLI if run directly
if (require.main === module) {
  var args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    var agent = new MAResearchAgent();
    agent.interactive();
  } else {
    // Command line mode
    var query = args.join(" ");
    var taskType = "summary";
    var options = {};
    
    // Parse options
    if (args.includes("--paper")) {
      taskType = "paper";
    } else if (args.includes("--slides")) {
      taskType = "slides";
    } else if (args.includes("--abstract")) {
      taskType = "abstract";
    } else if (args.includes("--kol")) {
      taskType = "kol-briefing";
    } else if (args.includes("--competitive")) {
      taskType = "competitive";
    }

    var agent = new MAResearchAgent();
    agent.research(query, taskType, options);
  }
}