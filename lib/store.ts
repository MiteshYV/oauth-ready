import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AnyGuide } from "./types";

// Generated guides are saved as JSON files, so their links survive a restart and the file itself can be shared.
const DIR = path.join(process.cwd(), "data", "generated");
// Slugs come from URLs, so anything that is not a plain slug never reaches the file system.
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const fileFor = (slug: string) => path.join(DIR, `${slug}.json`);

export async function saveGuide(guide: AnyGuide): Promise<void> {
  if (!SLUG.test(guide.slug)) throw new Error(`Not a valid slug: "${guide.slug}"`);
  await mkdir(DIR, { recursive: true });
  await writeFile(fileFor(guide.slug), JSON.stringify(guide, null, 2));
}

export async function loadGuide(slug: string): Promise<AnyGuide | null> {
  if (!SLUG.test(slug)) return null;
  try {
    return JSON.parse(await readFile(fileFor(slug), "utf8")) as AnyGuide;
  } catch {
    return null;
  }
}

export async function listGenerated(limit = 12): Promise<{ slug: string; savedAt: Date }[]> {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const rows = await Promise.all(files.map(async (f) => ({ slug: f.slice(0, -5), savedAt: (await stat(path.join(DIR, f))).mtime })));
  return rows.sort((a, b) => +b.savedAt - +a.savedAt).slice(0, limit);
}
