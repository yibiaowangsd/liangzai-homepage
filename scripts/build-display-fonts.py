#!/usr/bin/env python3
"""Subset the display fonts used by the personal pages (app/milk/milk.css).

Usage: python scripts/build-display-fonts.py <dir with source fonts>
The directory must contain SourceHanSerifCN-Heavy.otf and Fraunces-Italic.ttf
(both SIL OFL 1.1; see public/assets/fonts/OFL.txt). Re-run after changing
copy on those pages: only glyphs found in the scanned sources are kept, and
anything missing falls back to the system serif.
Requires: pip install fonttools brotli
"""
import io, sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
out = root / "public/assets/fonts"
out.mkdir(parents=True, exist_ok=True)

scanned = [root / "app/QuantumHome.tsx", root / "app/experience/SiteChrome.tsx", root / "app/experience/destinations.ts"]
for folder in ("milk", "about", "archive", "models", "storybook", "studio"):
    scanned += sorted((root / "app" / folder).rglob("*.ts*"))
text = "".join(path.read_text(encoding="utf8") for path in scanned)
chars = {c for c in text if ord(c) > 0x2000 and not c.isspace()}
chars |= {chr(c) for c in range(0x20, 0x7F)}
chars |= set("，。、；：？！“”‘’（）《》〈〉—…·×∞0123456789")

def save(font, name, unicodes, features):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = features
    options.name_IDs = [1, 2, 4, 6]
    options.notdef_outline = True
    options.desubroutinize = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    target = out / name
    font.flavor = "woff2"
    font.save(target)
    print(f"{name}: {target.stat().st_size / 1024:.0f} KiB, {len(unicodes)} code points")

save(TTFont(source / "SourceHanSerifCN-Heavy.otf"), "milk-song-heavy.woff2", sorted(map(ord, chars)), ["kern", "palt", "locl"])

italic = TTFont(source / "Fraunces-Italic.ttf")
italic = instancer.instantiateVariableFont(italic, {"SOFT": 100, "WONK": 1, "opsz": 72, "wght": (300, 700)})
buffer = io.BytesIO()  # reload so the subsetter sees fully compiled variation tables
italic.save(buffer)
buffer.seek(0)
italic = TTFont(buffer)
latin = list(range(0x20, 0x7F)) + [0xA0, 0xB7, 0xD7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2192]
save(italic, "milk-latin-italic.woff2", latin, ["kern", "liga", "calt"])
