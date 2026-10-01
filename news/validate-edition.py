"""Validate a complete edition before it can replace published D1 records."""

import collections
import json
import pathlib
import re
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse


def validate(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    edition_date = date.fromisoformat(path.stem)
    if not isinstance(data, dict) or data.get("date") != path.stem:
        raise ValueError("date must match filename")
    items = data.get("items")
    if not isinstance(items, list) or len(items) != 25:
        raise ValueError("edition must contain exactly 25 stories")
    categories = {"pqc", "protocol", "standards", "security", "ai"}
    counts = collections.Counter()
    slugs = set()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("each story must be an object")
        slug = item.get("slug", "")
        if not re.fullmatch(edition_date.strftime("%Y%m%d") + r"-[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError(f"invalid edition slug: {slug}")
        if slug in slugs:
            raise ValueError(f"duplicate slug: {slug}")
        slugs.add(slug)
        if item.get("category") not in categories or item.get("status") != "published":
            raise ValueError(f"{slug}: invalid category or publication status")
        counts[item["category"]] += 1
        for field in ("title", "summary", "content", "source_name", "source_url"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f"{slug}: missing {field}")
        content = item["content"].strip()
        paragraphs = [block for block in re.split(r"\n\s*\n", content)
                      if block.strip() and not block.lstrip().startswith(("#", "- "))]
        if len(content) < 600 or len(paragraphs) < 5:
            raise ValueError(f"{slug}: needs a substantial article, >=600 characters and >=5 paragraphs")
        if "\n## 量仔观察\n" not in content:
            raise ValueError(f"{slug}: missing separate editorial analysis")
        if not re.search(r"20\d{2}年\d{1,2}月|20\d{2}-\d{2}-\d{2}", content):
            raise ValueError(f"{slug}: missing original source date")
        source = urlparse(item["source_url"])
        if source.scheme != "https" or not source.hostname or source.hostname in {"example.com", "example.org"}:
            raise ValueError(f"{slug}: needs a real HTTPS source URL")
        published = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
        if published.tzinfo is None or published.astimezone(timezone(timedelta(hours=8))).date() != edition_date:
            raise ValueError(f"{slug}: publication must belong to the Beijing edition date")
    if any(counts[category] != 5 for category in categories):
        raise ValueError("each of the five categories must contain exactly five stories")
    return items


if __name__ == "__main__":
    for filename in sys.argv[1:]:
        path = pathlib.Path(filename)
        try:
            validate(path)
        except (ValueError, KeyError, TypeError) as exc:
            raise SystemExit(f"{path}: {exc}") from exc
        print(f"Validated {path}: 25 long articles, 5 x 5 desks")
