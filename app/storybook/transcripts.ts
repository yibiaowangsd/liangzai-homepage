import { pages } from "./storyData";
export const transcripts = pages.map(page => [page.title, page.body, page.quote].join("\n\n"));
