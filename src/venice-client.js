/**
 * Venice API Client for Medical Affairs Research Assistant
 * Uses Venice AI for GenAI capabilities (summarization, synthesis, writing)
 */

const axios = require("axios");

class VeniceClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.VENICE_INFERENCE_KEY;
    this.baseUrl = "https://api.venice.ai/api/v1";
    this.defaultModel = "venice/llama-3.3-70b";
  }

  /**
   * Generate text using Venice AI
   */
  async generate(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4000;
    const temperature = options.temperature || 0.7;

    try {
      const response = await axios.post(
        this.baseUrl + "/chat/completions",
        {
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature
        },
        {
          headers: {
            Authorization: "Bearer " + this.apiKey,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Venice API Error:", error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Summarize medical literature findings
   */
  async summarizeFindings(findings, focusAreas) {
    var focusText = "";
    if (focusAreas && focusAreas.length > 0) {
      focusText = "\n\nFocus areas to emphasize: " + focusAreas.join(", ");
    }

    var prompt = "You are a Medical Affairs expert specializing in synthesizing clinical research. " +
      "Summarize the following PubMed search findings into a coherent scientific summary suitable for " +
      "medical affairs purposes (KOL engagement, medical information, HEOR)." +
      focusText + "\n\nFINDINGS:\n" + JSON.stringify(findings, null, 2) +
      "\n\nProvide a structured summary with:\n1. Key findings overview\n2. Clinical implications\n3. Evidence gaps\n4. Potential stakeholder relevance";

    return this.generate(prompt, { temperature: 0.5, maxTokens: 2000 });
  }

  /**
   * Generate a literature review abstract
   */
  async generateAbstract(searchResults, topic) {
    var prompt = "Write a professional medical abstract for a literature review on: \"" + topic + "\"\n\nBased on the following research papers:\n";
    prompt += searchResults.map(function(r, i) {
      return (i+1) + ". " + r.title + " (PMID: " + r.pmid + ") - " + (r.authors ? r.authors.join(", ") : "Unknown");
    }).join("\n");
    prompt += "\n\nInclude: Background, Methods, Results summary, Conclusions. Use standard medical writing style.";

    return this.generate(prompt, { temperature: 0.3, maxTokens: 1500 });
  }

  /**
   * Generate full research paper/section
   */
  async generatePaperSection(topic, findings, sectionType) {
    sectionType = sectionType || "introduction";
    
    var prompt;
    if (sectionType === "introduction") {
      prompt = "Write an Introduction section for a medical literature review on: \"" + topic + "\". Based on: " + 
        findings.map(function(f) { return f.title; }).join(", ") + 
        ". Include background, rationale, and what this review addresses.";
    } else if (sectionType === "methods") {
      prompt = "Write a Methods section describing how a systematic literature review was conducted. Search terms: " + topic +
        ". Databases: PubMed, EMBASE, Cochrane. Include search strategy, inclusion/exclusion criteria.";
    } else if (sectionType === "results") {
      prompt = "Write a Results section summarizing these findings:\n" + 
        findings.map(function(f) { return "- " + f.title + ": " + (f.abstract ? f.abstract.substring(0, 500) : "N/A"); }).join("\n") +
        "\nPresent key findings, study characteristics, outcomes.";
    } else if (sectionType === "discussion") {
      prompt = "Write a Discussion section for: \"" + topic + "\". Synthesize the findings, compare with existing literature, discuss clinical implications, limitations, and conclusions.";
    }

    return this.generate(prompt, { temperature: 0.5, maxTokens: 2500 });
  }

  /**
   * Generate KOL (Key Opinion Leader) briefing
   */
  async generateKOLBriefing(topic, findings) {
    var prompt = "Create a Key Opinion Leader (KOL) briefing document on: \"" + topic + "\"\n\nFor each key finding:\n";
    prompt += findings.map(function(f) { return "- " + f.title; }).join("\n");
    prompt += "\n\nInclude:\n1. Executive summary (2-3 sentences)\n2. Key insights for HCPs\n3. Clinical practice implications\n4. Unmet needs / gaps\n5. Suggested discussion points\n\nWrite in a professional, concise manner suitable for medical affairs use.";

    return this.generate(prompt, { temperature: 0.5, maxTokens: 1500 });
  }

  /**
   * Generate competitive intelligence analysis
   */
  async generateCompetitiveAnalysis(drugs, findings) {
    var prompt = "Create a competitive intelligence analysis comparing: " + drugs.join(", ") + "\n\nEvidence from literature:\n";
    prompt += findings.map(function(f) { 
      return "- " + f.title + ": " + (f.abstract ? f.abstract.substring(0, 300) : "N/A"); 
    }).join("\n");
    prompt += "\n\nInclude:\n1. Efficacy comparison\n2. Safety profile comparison\n3. Market positioning\n4. Research gaps by competitor\n5. Strategic implications";

    return this.generate(prompt, { temperature: 0.5, maxTokens: 2000 });
  }

  /**
   * Generate medical information response draft
   */
  async generateMedicalInfoResponse(query, relevantPapers) {
    var prompt = "Draft a medical information response to this inquiry: \"" + query + "\"\n\nRelevant published evidence:\n";
    prompt += relevantPapers.map(function(p) { 
      return "PMID " + p.pmid + ": " + p.title + ". " + (p.abstract || ""); 
    }).join("\n\n");
    prompt += "\n\nInclude:\n1. Brief response statement\n2. Summary of evidence\n3. Citations (PMID)\n4. Disclaimer\n\nWrite in compliant medical information style.";

    return this.generate(prompt, { temperature: 0.3, maxTokens: 1000 });
  }
}

module.exports = VeniceClient;