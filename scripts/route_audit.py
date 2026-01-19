#!/usr/bin/env python3
"""Route audit for the SPA.

Finds:
- All routed paths from src/router.tsx (including nested children)
- All string-literal route usages in src/ (Link/NavLink `to=`, `navigate('...')`, `href=`)

Reports any usages that don't match router paths.

Usage:
  python scripts/route_audit.py
  python scripts/route_audit.py --json route_audit.json

Notes:
- Only string-literal routes are analyzed. Dynamic expressions are skipped.
- External links (http/mailto/tel/sms/#) are ignored.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ROUTER_FILE = PROJECT_ROOT / "src" / "router.tsx"

SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "android",
    "ios",
    "public",
    ".local",
}

EXTERNAL_PREFIXES = ("http:", "https:", "mailto:", "tel:", "sms:", "#")


def _tokenize_js(src: str) -> List[Tuple[str, str]]:
    i = 0
    n = len(src)
    tokens: List[Tuple[str, str]] = []
    while i < n:
        c = src[i]
        if c in " \t\r\n":
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i + 2)
            i = n if j == -1 else j + 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            i = n if j == -1 else j + 2
            continue
        if c in "{}[]:,()":
            tokens.append((c, c))
            i += 1
            continue
        if c in ('"', "'", "`"):
            quote = c
            j = i + 1
            val: List[str] = []
            while j < n:
                ch = src[j]
                if ch == "\\":
                    if j + 1 < n:
                        val.append(src[j + 1])
                        j += 2
                        continue
                if ch == quote:
                    break
                val.append(ch)
                j += 1
            tokens.append(("string", "".join(val)))
            i = j + 1
            continue
        if re.match(r"[A-Za-z_$]", c):
            j = i + 1
            while j < n and re.match(r"[A-Za-z0-9_$]", src[j]):
                j += 1
            tokens.append(("ident", src[i:j]))
            i = j
            continue
        i += 1
    return tokens


def _compute_full(parent: str, path: Optional[str], index: bool = False) -> str:
    if index:
        return parent or "/"
    if path is None:
        return parent or "/"
    if path == "*":
        return "*"
    if path.startswith("/"):
        return path
    if parent in ("", "/"):
        return "/" + path
    return parent.rstrip("/") + "/" + path


def extract_routes_from_router(router_src: str) -> List[str]:
    tokens = _tokenize_js(router_src)

    start: Optional[int] = None
    for idx, t in enumerate(tokens):
        if t == ("ident", "createBrowserRouter"):
            j = idx
            while j < len(tokens) and tokens[j][0] != "[":
                j += 1
            if j < len(tokens) and tokens[j][0] == "[":
                start = j
                break
    if start is None:
        raise RuntimeError("Could not locate createBrowserRouter([...]) in router.tsx")

    routes: List[str] = []
    stack: List[str] = []
    obj_stack: List[dict] = []
    arr_stack: List[dict] = []

    i = start
    while i < len(tokens):
        typ, val = tokens[i]

        if typ == "[":
            if i >= 2 and tokens[i - 1][0] == ":" and tokens[i - 2] == ("ident", "children"):
                parent_path = ""
                if obj_stack:
                    cur = obj_stack[-1]
                    parent_path = _compute_full(cur.get("parent") or "", cur.get("path"), cur.get("index", False))
                elif stack:
                    parent_path = stack[-1]
                arr_stack.append({"kind": "children", "parent": parent_path})
                stack.append(parent_path)
            else:
                arr_stack.append({"kind": "array", "parent": None})
            i += 1
            continue

        if typ == "]":
            ctx = arr_stack.pop() if arr_stack else None
            if ctx and ctx.get("kind") == "children":
                stack.pop()
            i += 1
            continue

        if typ == "{":
            parent = stack[-1] if stack else ""
            obj_stack.append({"path": None, "index": False, "parent": parent})
            i += 1
            continue

        if typ == "}":
            obj = obj_stack.pop() if obj_stack else None
            if obj and (obj.get("path") is not None or obj.get("index")):
                full = _compute_full(obj.get("parent") or "", obj.get("path"), obj.get("index", False))
                routes.append(full)
            i += 1
            continue

        if typ == "ident" and val in ("path", "index") and i + 2 < len(tokens) and tokens[i + 1][0] == ":":
            if val == "path" and tokens[i + 2][0] == "string" and obj_stack:
                obj_stack[-1]["path"] = tokens[i + 2][1]
            if val == "index" and tokens[i + 2] == ("ident", "true") and obj_stack:
                obj_stack[-1]["index"] = True
            i += 1
            continue

        i += 1

    out: List[str] = []
    for r in routes:
        if r not in out:
            out.append(r)
    return out


def _iter_src_files() -> Iterable[Path]:
    for dirpath, dirnames, filenames in os.walk(PROJECT_ROOT / "src"):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if fn.endswith((".ts", ".tsx", ".js", ".jsx")) and not fn.endswith(".d.ts"):
                yield Path(dirpath) / fn


@dataclass(frozen=True)
class RouteUsage:
    route: str
    file: str
    line: int
    kind: str


def _find_route_usages(text: str, file_path: str) -> List[RouteUsage]:
    patterns = [
        ("to", re.compile(r"\bto\s*=\s*(?P<q>[\"'])(?P<val>[^\"']+)(?P=q)")),
        ("navigate", re.compile(r"\bnavigate\s*\(\s*(?P<q>[\"'])(?P<val>[^\"']+)(?P=q)")),
        ("href", re.compile(r"\bhref\s*=\s*(?P<q>[\"'])(?P<val>[^\"']+)(?P=q)")),
    ]

    out: List[RouteUsage] = []
    for kind, pat in patterns:
        for m in pat.finditer(text):
            val = m.group("val")
            if not val or val.startswith(EXTERNAL_PREFIXES):
                continue
            if not val.startswith("/"):
                continue
            if val.startswith('/api/'):
                continue
            line = text.count("\n", 0, m.start()) + 1
            out.append(RouteUsage(route=val, file=file_path, line=line, kind=kind))
    return out


def _route_to_regex(route: str) -> Optional[re.Pattern]:
    if route == "*":
        return None
    if route == "/":
        return re.compile(r"^/$")
    parts = [p for p in route.split("/") if p]
    rx_parts = []
    for part in parts:
        if part.startswith(":"):
            rx_parts.append(r"[^/]+")
        else:
            rx_parts.append(re.escape(part))
    return re.compile(r"^/" + "/".join(rx_parts) + r"/?$")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", dest="json_out", help="Write JSON report to path")
    args = ap.parse_args()

    router_src = ROUTER_FILE.read_text(encoding="utf-8")
    routes = extract_routes_from_router(router_src)
    route_regexes = [(r, _route_to_regex(r)) for r in routes if r != "*"]

    usages: List[RouteUsage] = []
    for fp in _iter_src_files():
        text = fp.read_text(encoding="utf-8", errors="ignore")
        usages.extend(_find_route_usages(text, str(fp.relative_to(PROJECT_ROOT))))

    def match_route(p: str) -> Optional[str]:
        for pat, rx in route_regexes:
            if rx and rx.match(p):
                return pat
        return None

    unknown: List[dict] = []
    for u in usages:
        m = match_route(u.route)
        if m is None:
            unknown.append({**u.__dict__})

    report = {
        "router_file": str(ROUTER_FILE.relative_to(PROJECT_ROOT)),
        "route_count": len(routes),
        "usage_count": len(usages),
        "unknown_count": len(unknown),
        "unknown": unknown,
        "notes": [
            "Only string-literal routes are analyzed.",
            "If a route is missing from router.tsx, it will appear as unknown here.",
        ],
    }

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Routes found: {len(routes)}")
    print(f"Usages found: {len(usages)}")
    print(f"Unknown usages: {len(unknown)}")
    if unknown:
        print("\nUnknown route usages:")
        for item in unknown:
            print(f"- {item['route']}  ({item['file']}:{item['line']} via {item['kind']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
