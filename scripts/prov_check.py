#!/usr/bin/env python3
"""Fail when a physics literal has no provenance tag nearby.

Scans src/core for numeric literals that look like physical constants
(a decimal number, or an integer >= 10) and requires a `prov:` comment on the
same line or one of the previous two lines. Trivial numbers (0, 1, 2, 100,
array indices, loop bounds) are ignored. Run: python3 scripts/prov_check.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LITERAL = re.compile(r"(?<![\w.])(?:\d+\.\d+|\d{2,})(?:e-?\d+)?(?![\w.])")
SKIP_LINE = re.compile(
    r"^\s*(?://|\*|/\*)|prov:|ponytail:|import |export (?:type|interface)|"
    r"toFixed|toBe|expect\(|\[\d+\]|Table \d|§\d|eq\.? \(|\bTWS\b|"
    r"'\d+(?:\.\d+)?'(?:\s*\|\s*'\d+(?:\.\d+)?')+"  # pure type union of quoted table ids, e.g. '5.1' | '5.4'
)
TRIVIAL = {"10", "100", "180", "360", "1000", "3600", "0.5", "1.0", "2.0", "0.0", "1e-6", "1e-9"}


def check(path: Path) -> list[str]:
    lines = path.read_text().splitlines()
    problems = []
    for i, line in enumerate(lines):
        if SKIP_LINE.search(line):
            continue
        nums = [n for n in LITERAL.findall(line) if n not in TRIVIAL]
        if not nums:
            continue
        window = "\n".join(lines[max(0, i - 2) : i + 1])
        if "prov:" in window or "knob(" in window:
            continue
        problems.append(f"{path.relative_to(ROOT)}:{i + 1}: literal {nums[0]} without prov: tag")
    return problems


def main() -> int:
    files = [p for p in (ROOT / "src" / "core").rglob("*.ts") if not p.name.endswith(".test.ts")]
    problems = [p for f in sorted(files) for p in check(f)]
    for p in problems:
        print("error:", p)
    print(f"prov-check: {len(files)} files, {len(problems)} untagged literals")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
