// FAA Oral Practice configuration
// Paste your deployed Cloudflare Worker endpoint below.
window.ORAL_APP_CONFIG = {
  aiGraderEndpoint: "", // Example: https://faa-oral-ai-grader.YOUR-NAME.workers.dev/grade
  aiReviewMode: "fallback", // "off", "fallback", or "all"
  aiTimeoutMs: 15000
};
