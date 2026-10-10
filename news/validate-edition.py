"""Validate a complete edition before it can replace published D1 records."""

import collections
import json
import pathlib
import re
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse

POLICY = json.loads(pathlib.Path(__file__).with_name("edition-policy.json").read_text(encoding="utf-8"))


def validate(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    edition_date = date.fromisoformat(path.stem)
    if not isinstance(data, dict) or data.get("date") != path.stem:
        raise ValueError("date must match filename")
    items = data.get("items")
    version = data.get("schema_version", 1)
    if type(version) is not int or version not in (1, 2):
        raise ValueError("unsupported schema_version")
    if version == 1 and data["date"] >= POLICY["effective_date"]:
        raise ValueError("new editions require schema_version 2")
    categories = set(POLICY["categories"] if version == 2 else POLICY["legacy_categories"])
    if not isinstance(items, list) or not 1 <= len(items) <= len(categories) * POLICY["max_per_category"]:
        raise ValueError("edition must contain 1–35 stories (legacy: exactly 25)")
    counts = collections.Counter()
    slugs = set()
    sources = set()
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
        if version == 2:
            if not 100 <= len(item["summary"].strip()) <= 180:
                raise ValueError(f"{slug}: summary must contain 100–180 characters")
            if len([p for p in paragraphs if len(p.strip()) >= 50]) < 5:
                raise ValueError(f"{slug}: needs at least five substantive paragraphs")
            if len(set(p.strip() for p in paragraphs)) != len(paragraphs):
                raise ValueError(f"{slug}: repeated paragraphs are not allowed")
            original_date = re.search(r"20\d{2}-\d{2}-\d{2}", content.split("\n\n", 1)[0])
            if not original_date or date.fromisoformat(original_date.group()) > edition_date:
                raise ValueError(f"{slug}: opening must give a non-future ISO original source date")
            if len(content.split("\n## 量仔观察\n", 1)[1].strip()) < 80:
                raise ValueError(f"{slug}: editorial analysis is too short")
            if not isinstance(item.get("tags"), list) or not item["tags"] or any(not isinstance(tag, str) or not tag.strip() for tag in item["tags"]):
                raise ValueError(f"{slug}: needs non-empty string tags")
            if item["source_url"] in sources:
                raise ValueError(f"{slug}: duplicate primary source; combine the same event")
            sources.add(item["source_url"])
        source = urlparse(item["source_url"])
        if source.scheme != "https" or not source.hostname or source.hostname in {"example.com", "example.org"}:
            raise ValueError(f"{slug}: needs a real HTTPS source URL")
        published = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
        if published.tzinfo is None or published.astimezone(timezone(timedelta(hours=8))).date() != edition_date:
            raise ValueError(f"{slug}: publication must belong to the Beijing edition date")
    if version == 1 and any(counts[category] != 5 for category in categories):
        raise ValueError("each of the five categories must contain exactly five stories")
    if version == 2:
        coverage = data.get("coverage")
        if not isinstance(coverage, dict) or set(coverage) != categories:
            raise ValueError("coverage must describe all seven categories")
        for category in categories:
            entry = coverage[category]
            if not isinstance(entry, dict) or type(entry.get("count")) is not int or entry["count"] != counts[category] or entry["count"] > POLICY["max_per_category"]:
                raise ValueError(f"coverage.{category}: count must match items and be <=5")
            note = entry.get("note")
            if not isinstance(note, str) or len(note.strip()) > 600 or (entry["count"] < POLICY["min_per_category"] and len(note.strip()) < 12):
                raise ValueError(f"coverage.{category}: explain shortfalls below three in note")
    return items


if __name__ == "__main__":
    for filename in sys.argv[1:]:
        path = pathlib.Path(filename)
        try:
            validate(path)
        except (ValueError, KeyError, TypeError) as exc:
            raise SystemExit(f"{path}: {exc}") from exc
        counts = dict(collections.Counter(item["category"] for item in json.loads(path.read_text(encoding="utf-8"))["items"]))
        print(f"Validated {path}: {sum(counts.values())} long articles; {counts}")
