#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
ASSET_URL = re.compile(r"assets/[\w@./-]+\.(?:png|svg|woff2)(?:\?v=[a-f0-9]+)?")
HELPER_URL = re.compile(r"pack-material-data\.js(?:\?v=[a-f0-9]+)?")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fingerprint(url):
    name = url.split("?", 1)[0]
    path = (DIST / name).resolve()
    if not path.is_relative_to(DIST) or not path.is_file():
        raise ValueError(f"Missing local asset: {url}")
    return f"{name}?v={sha(path)[:10]}"


def update(path, text):
    if path.read_text() != text:
        path.write_text(text)


def prepare(parser=None):
    scripts = sorted(path for path in DIST.glob("*.js") if not path.name.endswith(".compact.js"))
    css_path = DIST / "styles.css"
    for path in [css_path, *scripts]:
        update(path, ASSET_URL.sub(lambda match: fingerprint(match[0]), path.read_text()))
    for path in scripts:
        if path.name != "pack-material-data.js":
            update(path, HELPER_URL.sub(lambda match: fingerprint(match[0]), path.read_text()))

    if parser:
        result = subprocess.run(
            ["node", str(ROOT / "tools/compact-scripts.mjs"), "--parser", str(Path(parser).resolve())],
            check=True, capture_output=True, text=True,
        )
        artifacts = json.loads(result.stdout)
        print(json.dumps({"compactedBytes": sum(item["bytesBefore"] - item["bytesAfter"] for item in artifacts)}))

    manifest_path = ROOT / "tools/compact-manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"artifacts": []}
    compact = {}
    for artifact in manifest["artifacts"]:
        source, output = DIST / artifact["source"], DIST / artifact["output"]
        if source.is_file() and output.is_file() and sha(source) == artifact["sourceSha256"] and sha(output) == artifact["outputSha256"]:
            compact[artifact["source"]] = artifact["output"]

    page_path = DIST / "index.html"
    page = page_path.read_text()
    header = next(tag for tag in re.findall(r"<img\b[^>]*>", page) if 'fetchpriority="high"' in tag and 'alt="BP27"' in tag)
    page = page.replace(header, '''<img
          class="bp27-header"
          src="assets/bp27-header@2x.png"
          srcset="assets/bp27-header@2x.png 2x, assets/bp27-header@3x.png 3x"
          alt="BP27"
          width="209"
          height="40"
          fetchpriority="high"
        />''', 1)
    page = ASSET_URL.sub(lambda match: fingerprint(match[0]), page)

    css = css_path.read_text()
    if "</style" in css.lower():
        raise ValueError("Inline stylesheet contains an HTML closing-style sequence")
    style_block = f'<!-- bp27:styles:start -->\n    <style id="site-styles">\n{css}</style>\n    <!-- bp27:styles:end -->'
    style_pattern = re.compile(r'<!-- bp27:styles:start -->.*?<!-- bp27:styles:end -->|<link rel="stylesheet" href="styles\.css(?:\?v=[a-f0-9]+)?"\s*/>', re.S)
    page, count = style_pattern.subn(lambda _: style_block, page, count=1)
    if count != 1:
        raise ValueError("Could not locate the stylesheet boundary in index.html")

    def script_url(match):
        source = match["name"].replace(".compact.js", ".js")
        return match["prefix"] + fingerprint(compact.get(source, source)) + match["quote"]

    page = re.sub(r'(?P<prefix>(?:src|href)=\")(?P<name>[\w-]+(?:\.compact)?\.js)(?:\?v=[a-f0-9]+)?(?P<quote>\")', script_url, page)
    update(page_path, page)
    print(json.dumps({"inlineCssBytes": len(css.encode()), "compactEntriesAvailable": len(compact), "header2xBytes": (DIST / "assets/bp27-header@2x.png").stat().st_size, "header3xBytes": (DIST / "assets/bp27-header@3x.png").stat().st_size}))


if __name__ == "__main__":
    args = argparse.ArgumentParser(description="Synchronize inline CSS, fingerprinted local URLs, and optional validated compact scripts.")
    args.add_argument("--parser", help="Path to an already-installed Acorn module; omit to use fresh compact artifacts or original scripts.")
    prepare(args.parse_args().parser)
