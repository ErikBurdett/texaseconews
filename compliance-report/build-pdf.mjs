import { chromium } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Renders compliance-report.html to PDF.
 *
 * The HTML is the source of truth; the PDF is a build artefact that is
 * committed so it can be handed to counsel without anyone running a build.
 * Regenerate with `npm run report:pdf` after editing the HTML.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "compliance-report.html");
const output = resolve(here, "TexasBusinessNews-Compliance-Report.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${source}`, { waitUntil: "networkidle" });
// Give webfonts a moment to settle so the PDF embeds them rather than falling back.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

await page.pdf({
  path: output,
  format: "Letter",
  printBackground: true,
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#7b8a9c;
                padding:0 15mm;display:flex;justify-content:space-between;">
      <span>TexasBusiness.News &mdash; Compliance Remediation Report &mdash; 3 September 2026</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
});

await browser.close();
console.log(`Wrote ${output}`);
