import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CATEGORIES = [
  { id: "360000109457", slug: "General-Brand-Question", name: "General Brand Questions" },
  { id: "360000116277", slug: "Q-Collection", name: "Q² Collection" },
  { id: "360000121818", slug: "Q-M-Collection", name: "Q²M Collection" },
  { id: "360000121858", slug: "Q-M-Accessories-Collection", name: "Q²M Accessories Collection" },
  { id: "360000121838", slug: "Q-R-Collection", name: "Q²R Collection" },
];

const BASE = "https://gyeon.zendesk.com/api/v2/help_center/en-us";

type ZendeskSection = { id: number; name: string; description: string; html_url: string };
type ZendeskArticle = {
  id: number;
  section_id: number | null;
  title: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  label_names?: string[];
};

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "gyeon-faq-scraper/1.0" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

async function fetchAllArticles(categoryId: string): Promise<ZendeskArticle[]> {
  const all: ZendeskArticle[] = [];
  let url: string | null = `${BASE}/categories/${categoryId}/articles.json?per_page=100`;
  while (url) {
    const page: { articles: ZendeskArticle[]; next_page: string | null } = await fetchJson(url);
    all.push(...page.articles);
    url = page.next_page;
  }
  return all;
}

async function fetchSections(categoryId: string): Promise<ZendeskSection[]> {
  const all: ZendeskSection[] = [];
  let url: string | null = `${BASE}/categories/${categoryId}/sections.json?per_page=100`;
  while (url) {
    const page: { sections: ZendeskSection[]; next_page: string | null } = await fetchJson(url);
    all.push(...page.sections);
    url = page.next_page;
  }
  return all;
}

async function main() {
  const output = {
    source: "https://gyeon.zendesk.com/hc/en-us",
    scraped_at: new Date().toISOString(),
    categories: [] as Array<{
      id: string;
      name: string;
      slug: string;
      url: string;
      sections: Array<{ id: number; name: string; description: string; url: string }>;
      articles: Array<{
        id: number;
        section_id: number | null;
        section_name: string | null;
        question: string;
        answer_text: string;
        answer_html: string;
        url: string;
        created_at: string;
        updated_at: string;
        labels: string[];
      }>;
    }>,
    total_articles: 0,
  };

  for (const cat of CATEGORIES) {
    console.log(`\n[${cat.name}] fetching sections + articles...`);
    const [sections, articles] = await Promise.all([
      fetchSections(cat.id),
      fetchAllArticles(cat.id),
    ]);
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
    console.log(`  sections: ${sections.length}, articles: ${articles.length}`);

    output.categories.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      url: `https://gyeon.zendesk.com/hc/en-us/categories/${cat.id}-${cat.slug}`,
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        url: s.html_url,
      })),
      articles: articles.map((a) => ({
        id: a.id,
        section_id: a.section_id,
        section_name: a.section_id ? sectionMap.get(a.section_id) ?? null : null,
        question: a.title,
        answer_text: stripHtml(a.body),
        answer_html: a.body ?? "",
        url: a.html_url,
        created_at: a.created_at,
        updated_at: a.updated_at,
        labels: a.label_names ?? [],
      })),
    });
    output.total_articles += articles.length;
  }

  const outPath = resolve(process.cwd(), "docs/gyeon-faqs.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n✅ wrote ${output.total_articles} articles across ${output.categories.length} categories`);
  console.log(`   → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
