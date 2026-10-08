export function xml(value: string) { return value.replace(/[<>&"']/g, char => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"})[char]!); }
