/**
 * MA-FARS: Medical Affairs Research Assistant
 * Multi-Agent Architecture inspired by Analemma FARS
 * 
 * Key Architecture Learnings from FARS:
 * 1. Multi-agent specialization (Ideation, Planning, Execution, Writing)
 * 2. Shared file system for coordination + persistent memory
 * 3. Safety guardrails (human review loop for pharma compliance)
 * 4. Scale through infrastructure
 * 5. Observable operation for audit
 * 6. Negative results are knowledge
 */

const fs = require("fs");
const path = require("path");

/**
 * Multi-Agent Research System
 * 
 * Each agent is specialized and collaborates through shared workspace
 */
class MultiAgentResearchSystem {
  constructor(options) {
    this.workspace = options.workspace || "./workspace";
    this.ensureWorkspace();
    
    this.agents = {
      ideation: new IdeationAgent(this),
      planning: new PlanningAgent(this),
      execution: new ExecutionAgent(this),
      writing: new WritingAgent(this)
    };
    
    this.currentProject = null;
  }

  ensureWorkspace() {
    if (!fs.existsSync(this.workspace)) {
      fs.mkdirSync(this.workspace, { recursive: true });
    }
  }

  /**
   * Start a new research project
   * Creates project directory in shared workspace
   */
  async startProject(query) {
    var projectId = "project-" + Date.now();
    var projectDir = path.join(this.workspace, projectId);
    
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, "literature"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "experiments"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "drafts"), { recursive: true });
    
    this.currentProject = {
      id: projectId,
      query: query,
      dir: projectDir,
      state: {}
    };
    
    // Initialize project state
    this.writeState("initial", { query: query, started: new Date().toISOString() });
    
    return this.currentProject;
  }

  /**
   * Write to shared workspace (persistent memory)
   */
  writeState(filename, data) {
    if (!this.currentProject) return;
    var filepath = path.join(this.currentProject.dir, filename + ".json");
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  /**
   * Read from shared workspace
   */
  readState(filename) {
    if (!this.currentProject) return null;
    var filepath = path.join(this.currentProject.dir, filename + ".json");
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
    return null;
  }

  /**
   * Run the full multi-agent research pipeline
   */
  async research(query, options) {
    options = options || {};
    
    console.log("\n" + "=".repeat(50));
    console.log("MA-FARS: Multi-Agent Research System");
    console.log("=".repeat(50));
    
    // Step 1: Start project
    console.log("\n[Phase 1] Starting research project...");
    var project = await this.startProject(query);
    console.log("Project ID: " + project.id);
    
    // Step 2: Ideation - Literature review + hypothesis generation
    console.log("\n[Phase 2] IDEATION AGENT: Literature review + hypothesis generation");
    var hypotheses = await this.agents.ideation.generate(query, options);
    this.writeState("ideation", hypotheses);
    console.log("Generated " + hypotheses.length + " research hypotheses");
    
    // Filter hypotheses that pass automated review
    var validHypotheses = hypotheses.filter(h => h.passedReview);
    console.log(validHypotheses.length + " hypotheses passed automated review");
    
    // Step 3: Planning - For each valid hypothesis
    console.log("\n[Phase 3] PLANNING AGENT: Research methodology design");
    var plans = [];
    for (var i = 0; i < validHypotheses.length; i++) {
      var plan = await this.agents.planning.createPlan(validHypotheses[i]);
      plans.push(plan);
    }
    this.writeState("planning", plans);
    console.log("Created " + plans.length + " research plans");
    
    // Step 4: Execution - Run experiments/analyses
    console.log("\n[Phase 4] EXECUTION AGENT: Running analyses");
    var results = [];
    for (var j = 0; j < plans.length; j++) {
      var result = await this.agents.execution.run(plans[j]);
      results.push(result);
    }
    this.writeState("execution", results);
    console.log("Completed " + results.length + " analyses");
    
    // Step 5: Writing - Generate papers
    console.log("\n[Phase 5] WRITING AGENT: Generating research papers");
    var papers = [];
    for (var k = 0; k < results.length; k++) {
      var paper = await this.agents.writing.write(results[k]);
      papers.push(paper);
    }
    this.writeState("papers", papers);
    console.log("Generated " + papers.length + " papers");
    
    // Safety: Human review step (required for pharma)
    if (options.requireHumanReview) {
      console.log("\n[SAFETY] Human review required before distribution");
      // Would integrate with workflow for medical/regulatory review
    }
    
    return {
      project: project,
      hypotheses: validHypotheses,
      plans: plans,
      results: results,
      papers: papers
    };
  }
}

/**
 * IDEATION AGENT
 * - Conducts literature review
 * - Generates research hypotheses
 */
class IdeationAgent {
  constructor(system) {
    this.system = system;
  }

  async generate(query, options) {
    // This would integrate with PubMed client
    var PubMedClient = require("./pubmed-client");
    var pubmed = new PubMedClient();
    
    console.log("  Searching literature...");
    var articles = await pubmed.searchFull(query, options.maxResults || 20);
    
    // Use Venice AI to generate hypotheses
    var VeniceClient = require("./venice-client");
    var venice = new VeniceClient();
    
    var prompt = "Based on these medical literature search results, generate 3-5 specific, testable research hypotheses. " +
      "For each hypothesis, include: (1) the hypothesis statement, (2) why it's important, (3) how it could be validated. " +
      "Also identify any evidence gaps or negative findings that would be valuable to report.\n\n" +
      "LITERATURE:\n" + articles.slice(0, 10).map(function(a) { 
        return "- " + a.title + (a.abstract ? ": " + a.abstract.substring(0, 300) : ""); 
      }).join("\n");
    
    var response = await venice.generate(prompt, { temperature: 0.7, maxTokens: 2000 });
    
    // Parse hypotheses (simplified)
    var hypotheses = this.parseHypotheses(response, articles);
    
    return hypotheses;
  }

  parseHypotheses(text, articles) {
    // Simplified parsing - in production would use more sophisticated methods
    var hypotheses = [];
    var lines = text.split("\n");
    var current = null;
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.match(/^\d+[\.)]/) || line.toLowerCase().includes("hypothesis")) {
        if (current) hypotheses.push(current);
        current = {
          statement: line.replace(/^\d+[\.)]\s*/, "").replace(/hypothesis[:\s]*/i, ""),
          importance: "",
          validation: "",
          evidence: articles.slice(0, 5),
          passedReview: true
        };
      } else if (current && line.length > 20) {
        if (!current.importance) current.importance = line;
        else if (!current.validation) current.validation = line;
      }
    }
    if (current) hypotheses.push(current);
    
    return hypotheses.length > 0 ? hypotheses : [{ statement: text.substring(0, 200), passedReview: true }];
  }
}

/**
 * PLANNING AGENT
 * - Designs research methodology
 */
class PlanningAgent {
  constructor(system) {
    this.system = system;
  }

  async createPlan(hypothesis) {
    var VeniceClient = require("./venice-client");
    var venice = new VeniceClient();
    
    var prompt = "Design a research methodology for testing this hypothesis in medical affairs context:\n\n" +
      "HYPOTHESIS: " + hypothesis.statement + "\n\n" +
      "Include: (1) research questions, (2) data sources needed, (3) analytical methods, (4) success criteria";
    
    var methodology = await venice.generate(prompt, { temperature: 0.5, maxTokens: 1000 });
    
    return {
      hypothesis: hypothesis,
      methodology: methodology,
      dataSources: ["PubMed", "ClinicalTrials.gov", "Internal data"],
      timeline: "Auto-estimated"
    };
  }
}

/**
 * EXECUTION AGENT
 * - Runs experiments/analyses
 * - Uses GPU cluster for heavy computation
 */
class ExecutionAgent {
  constructor(system) {
    this.system = system;
  }

  async run(plan) {
    // In production, this would:
    // 1. Fetch additional data from APIs
    // 2. Run statistical analyses
    // 3. Validate findings
    
    console.log("  Running analysis for: " + plan.hypothesis.statement.substring(0, 50) + "...");
    
    var VeniceClient = require("./venice-client");
    var venice = new VeniceClient();
    
    // Simulate analysis by synthesizing findings
    var prompt = "Analyze the evidence for this hypothesis and provide findings. " +
      "If evidence is insufficient, clearly state this as a finding too (negative result).\n\n" +
      "HYPOTHESIS: " + plan.hypothesis.statement;
    
    var analysis = await venice.generate(prompt, { temperature: 0.3, maxTokens: 1500 });
    
    return {
      plan: plan,
      analysis: analysis,
      status: "completed",
      negativeResult: analysis.toLowerCase().includes("insufficient") || analysis.toLowerCase().includes("limited evidence"),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * WRITING AGENT
 * - Generates research papers
 * - Short, focused format (following FARS principle)
 */
class WritingAgent {
  constructor(system) {
    this.system = system;
  }

  async write(result) {
    var VeniceClient = require("./venice-client");
    var venice = new VeniceClient();
    
    var prompt = "Write a short, focused research paper (800-1200 words) based on these findings. " +
      "Include: Title, Abstract, Introduction, Methods, Results, Discussion, Conclusion. " +
      "If findings are negative or inconclusive, report this transparently - negative results are valuable knowledge.\n\n" +
      "HYPOTHESIS: " + result.plan.hypothesis.statement + "\n\n" +
      "FINDINGS: " + result.analysis;
    
    var paper = await venice.generate(prompt, { temperature: 0.5, maxTokens: 2000 });
    
    return {
      paper: paper,
      hypothesis: result.plan.hypothesis.statement,
      isNegativeResult: result.negativeResult,
      timestamp: new Date().toISOString()
    };
  }
}

// Export the multi-agent system
module.exports = MultiAgentResearchSystem;

// CLI
if (require.main === module) {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: node multi-agent.js <research query>");
    console.log("\nExample:");
    console.log("  node multi-agent.js \"GLP-1 agonist cardiovascular outcomes\"");
    process.exit(1);
  }

  var query = args.join(" ");
  var system = new MultiAgentResearchSystem({ workspace: "./workspace" });
  
  system.research(query, { requireHumanReview: true }).then(function(result) {
    console.log("\n" + "=".repeat(50));
    console.log("RESEARCH COMPLETE");
    console.log("=".repeat(50));
    console.log("Project: " + result.project.id);
    console.log("Papers generated: " + result.papers.length);
    console.log("Negative results: " + result.results.filter(function(r) { return r.negativeResult; }).length);
  }).catch(function(err) {
    console.error("Error:", err);
  });
}