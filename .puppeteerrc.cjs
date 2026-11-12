// Puppeteer is only used locally for screenshots and layout checks.
// Skip downloading Chrome on build servers (Cloudflare, Vercel).
module.exports = { skipDownload: Boolean(process.env.CI || process.env.WORKERS_CI || process.env.VERCEL) };
