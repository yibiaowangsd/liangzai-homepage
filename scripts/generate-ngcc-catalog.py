"""Snapshot NGCC Round 1 candidate and parameter metadata from ngcc-harness.

Usage: python3 scripts/generate-ngcc-catalog.py /path/to/ngcc-harness
The source repository provides data/parameters.csv and downloads.csv.
"""

import csv
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path


def rows(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source, delimiter=";"))


def main():
    source = Path(sys.argv[1]).resolve()
    output = Path(__file__).resolve().parents[1] / "public/pqc-practice/ngcc-catalog.json"
    parameters = rows(source / "data/parameters.csv")
    downloads = rows(source / "downloads.csv")
    if len(downloads) != 119 or len(parameters) != 586:
        raise ValueError("NGCC candidate count changed; review the catalog before publishing")

    candidates = {}
    for item in downloads:
        key = item["ID"]
        candidates[key] = {
            "id": key,
            "type": "sig" if item["Category"] == "sign" else item["Category"],
            "name": item["Algorithm"],
            "page": item["PageURL"],
            "archive": item["DownloadURL"],
            "parameters": [],
        }
    size_fields = (
        "PublicKeyBytes", "SecretKeyBytes", "CiphertextBytes", "SharedSecretBytes",
        "SignatureBytes", "Passes", "InitiatorStateBytes", "ResponderStateBytes",
        "TotalMessageBytes", "DigestBits", "DigestBytes",
    )
    for item in parameters:
        candidate = candidates[item["ID"]]
        if item["Type"] != candidate["type"]:
            raise ValueError(f"Mismatched category for {item['ID']}")
        candidate["parameters"].append({
            "name": item["Instance"],
            "source": item["SourceDirectory"],
            "sizes": {field: int(item[field]) for field in size_fields if item[field]},
        })

    for candidate in candidates.values():
        counts = Counter(p["name"] for p in candidate["parameters"])
        for parameter in candidate["parameters"]:
            parameter["label"] = parameter["name"]
            if counts[parameter["name"]] > 1:
                parameter["label"] += " · " + "/".join(parameter["source"].split("/")[-2:])
        if not candidate["parameters"]:
            raise ValueError(f"Missing parameters for {candidate['id']}")

    revision = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    catalog = {
        "source": "https://github.com/ngcc-dev/ngcc-harness",
        "revision": revision,
        "candidates": list(candidates.values()),
    }
    output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(candidates)} candidates, {len(parameters)} parameters to {output}")


if __name__ == "__main__":
    main()
