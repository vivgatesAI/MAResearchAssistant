/**
 * PubMed Client for Medical Affairs Research Assistant
 * Integrates with existing pubmed-research skill
 */

const axios = require("axios");

class PubMedClient {
  constructor() {
    this.baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    this.email = "vivek@live.de"; // For polite pool
  }

  /**
   * Search PubMed for articles
   */
  async search(query, maxResults = 20) {
    try {
      // Search for PMIDs
      const searchUrl = this.baseUrl + "/esearch.fcgi";
      const searchParams = new URLSearchParams({
        db: "pubmed",
        term: query,
        retmax: maxResults,
        retmode: "json",
        sort: "relevance",
        email: this.email
      });

      const searchResponse = await axios.get(searchUrl + "?" + searchParams);
      const idList = searchResponse.data.esearchresult.idlist;

      if (!idList || idList.length === 0) {
        return [];
      }

      // Fetch summaries for IDs
      const summaryUrl = this.baseUrl + "/esummary.fcgi";
      const summaryParams = new URLSearchParams({
        db: "pubmed",
        id: idList.join(","),
        retmode: "json",
        email: this.email
      });

      const summaryResponse = await axios.get(summaryUrl + "?" + summaryParams);
      const results = summaryResponse.data.result;

      // Parse results
      var articles = [];
      for (var i = 0; i < idList.length; i++) {
        var id = idList[i];
        var item = results[id];
        if (item && item.uid) {
          articles.push({
            pmid: item.uid,
            title: item.title || "No title",
            authors: item.authors ? item.authors.map(function(a) { return a.name; }) : [],
            journal: item.fulljournalname || "",
            pubDate: item.pubdate || "",
            source: item.source || "",
            doi: item.elocationid || "",
            abstract: "", // Need separate fetch for abstract
            meshTerms: item.mesh headings || []
          });
        }
      }

      return articles;
    } catch (error) {
      console.error("PubMed Search Error:", error.message);
      throw error;
    }
  }

  /**
   * Get abstract for a specific PMID
   */
  async getAbstract(pmid) {
    try {
      const efetchUrl = this.baseUrl + "/efetch.fcgi";
      const params = new URLSearchParams({
        db: "pubmed",
        id: pmid,
        retmode: "xml",
        rettype: "abstract",
        email: this.email
      });

      const response = await axios.get(efetchUrl + "?" + params);
      
      // Parse XML response
      var abstractText = "";
      var articleData = {};
      
      // Simple regex parsing for the abstract
      var abstractMatch = response.data.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/i);
      if (abstractMatch) {
        abstractText = abstractMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      // Extract other fields
      var titleMatch = response.data.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/i);
      if (titleMatch) {
        articleData.title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      var pubDateMatch = response.data.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>[\s\S]*?<\/PubDate>/i);
      if (pubDateMatch) {
        articleData.pubYear = pubDateMatch[1];
      }

      return {
        pmid: pmid,
        abstract: abstractText,
        ...articleData
      };
    } catch (error) {
      console.error("PubMed Abstract Error:", error.message);
      return { pmid: pmid, abstract: "", error: error.message };
    }
  }

  /**
   * Get abstracts for multiple PMIDs
   */
  async getAbstracts(pmids) {
    var results = [];
    for (var i = 0; i < pmids.length; i++) {
      var abstract = await this.getAbstract(pmids[i]);
      results.push(abstract);
      // Rate limiting
      await this.sleep(200);
    }
    return results;
  }

  /**
   * Search and get full details (search + abstracts)
   */
  async searchFull(query, maxResults) {
    maxResults = maxResults || 15;
    console.log("Searching PubMed for: " + query);
    
    var articles = await this.search(query, maxResults);
    console.log("Found " + articles.length + " articles");
    
    // Get abstracts for top results
    var pmids = articles.slice(0, 10).map(function(a) { return a.pmid; });
    var abstracts = await this.getAbstracts(pmids);
    
    // Merge abstracts with articles
    for (var i = 0; i < articles.length; i++) {
      for (var j = 0; j < abstracts.length; j++) {
        if (articles[i].pmid === abstracts[j].pmid) {
          articles[i].abstract = abstracts[j].abstract;
          break;
        }
      }
    }
    
    return articles;
  }

  /**
   * Search by clinical trial phase or study type
   */
  async searchClinicalTrials(query, phase) {
    var clinicalQuery = query;
    if (phase) {
      clinicalQuery += " AND " + phase + "[pt]"; // Publication type
    }
    clinicalQuery += " AND (clinical trial[pt] OR randomized controlled trial[pt])";
    
    return this.searchFull(clinicalQuery, 20);
  }

  /**
   * Search for recent publications (last N years)
   */
  async searchRecent(query, yearsBack) {
    yearsBack = yearsBack || 2;
    var currentYear = new Date().getFullYear();
    var startYear = currentYear - yearsBack;
    var datedQuery = query + " AND " + startYear + "[dp] : " + currentYear + "[dp]";
    
    return this.searchFull(datedQuery, 20);
  }

  /**
   * Format citation in APA style
   */
  formatCitationAPA(article) {
    var authors = article.authors || [];
    var authorStr = authors.length > 0 ? authors.join(", ") : "Unknown";
    var year = article.pubDate ? article.pubDate.substring(0, 4) : "n.d.";
    
    return authorStr + " (" + year + "). " + article.title + ". " + 
           article.journal + ". PMID: " + article.pmid;
  }

  /**
   * Helper: sleep for rate limiting
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = PubMedClient;