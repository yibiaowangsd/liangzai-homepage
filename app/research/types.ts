export type ResearchSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  code?: string;
};
export type ResearchEntry = {
  slug: string;
  date: string;
  updated: string;
  title: string;
  subtitle: string;
  question: string;
  status: string;
  tags: string[];
  summary: string[];
  scope: string;
  process: { title: string; detail: string }[];
  sections: ResearchSection[];
  sources: { id: string; title: string; url: string; version: string; note: string }[];
  revisions: { date: string; detail: string }[];
};
