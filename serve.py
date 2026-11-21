#!/usr/bin/env python3
"""Serve the local static site with negotiated compression and revalidation."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import timezone
from email.utils import formatdate, parsedate_to_datetime
from functools import lru_cache, partial
import gzip
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import os
from pathlib import Path
import re
from urllib.parse import parse_qsl, unquote, urlsplit


SITE_ROOT = Path(__file__).resolve().parent / "breakpoint-2027" / "dist"
FINGERPRINT = re.compile(r"[0-9a-f]{10,64}\Z")


@dataclass(frozen=True)
class Asset:
    data: bytes
    digest: str
    modified: float
    compressed: bytes | None


def compressible(content_type: str) -> bool:
    return content_type.startswith("text/") or content_type in {
        "application/json",
        "application/javascript",
        "application/xml",
        "image/svg+xml",
    }


@lru_cache(maxsize=128)
def load_asset(path: str, signature: tuple[int, int, int], content_type: str) -> Asset:
    # The stat signature expires edited files without caching arbitrary URL queries.
    with open(path, "rb") as source:
        data = source.read()
        modified = os.fstat(source.fileno()).st_mtime
    encoded = gzip.compress(data, compresslevel=6, mtime=0) if len(data) >= 256 and compressible(content_type) else None
    return Asset(data, hashlib.sha256(data).hexdigest(), modified, encoded)


def encoding_quality(header: str) -> tuple[float, float]:
    qualities: dict[str, float] = {}
    for item in header.split(","):
        parts = [part.strip().lower() for part in item.split(";")]
        if not parts[0]:
            continue
        quality = 1.0
        for parameter in parts[1:]:
            if parameter.startswith("q="):
                try:
                    quality = float(parameter[2:])
                except ValueError:
                    quality = 0.0
                if not 0 <= quality <= 1:
                    quality = 0.0
        qualities[parts[0]] = quality
    gzip_quality = qualities.get("gzip", qualities.get("*", 0.0))
    identity_quality = qualities.get("identity", 0.0 if qualities.get("*") == 0 else 1.0)
    return gzip_quality, identity_quality


class AssetHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".woff2": "font/woff2",
    }

    def send_head(self):
        try:
            target = urlsplit(self.path)
            decoded = unquote(target.path, errors="strict")
            root = Path(self.directory).resolve()
            if target.scheme or target.netloc or "\x00" in decoded or "\\" in decoded:
                raise ValueError("Invalid request path")
            if any(part in {".", ".."} for part in decoded.split("/")):
                self.send_error(403, "Path outside the site")
                return None
            path = (root / decoded.lstrip("/")).resolve()
            if not path.is_relative_to(root):
                self.send_error(403, "Path outside the site")
                return None
        except (UnicodeError, ValueError, OSError):
            self.send_error(400, "Invalid request path")
            return None

        if path.is_dir():
            if not target.path.endswith("/"):
                location = target.path + "/" + ("?" + target.query if target.query else "")
                self.send_response(301)
                self.send_header("Location", location)
                self.send_header("Content-Length", "0")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                return None
            path = (path / "index.html").resolve()
            if not path.is_relative_to(root):
                self.send_error(403, "Path outside the site")
                return None

        try:
            stat = path.stat()
            if not path.is_file():
                raise FileNotFoundError
            content_type = self.guess_type(str(path))
            asset = load_asset(str(path), (stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size), content_type)
        except (OSError, ValueError):
            self.send_error(404, "File not found")
            return None

        gzip_quality, identity_quality = encoding_quality(self.headers.get("Accept-Encoding", ""))
        encoded = asset.compressed is not None and gzip_quality > 0 and gzip_quality >= identity_quality
        if not encoded and identity_quality <= 0:
            self.send_error(406, "No acceptable content encoding")
            return None
        payload = asset.compressed if encoded else asset.data
        tag = '"' + asset.digest + ("-gzip" if encoded else "") + '"'
        query = parse_qsl(target.query, keep_blank_values=True)
        version = query[0][1] if len(query) == 1 and query[0][0] == "v" else ""
        immutable = path.suffix.lower() != ".html" and bool(FINGERPRINT.fullmatch(version)) and asset.digest.startswith(version)
        cache_control = "public, max-age=31536000, immutable" if immutable else "no-cache"

        not_modified = False
        validator = self.headers.get("If-None-Match")
        if validator is not None:
            not_modified = any(value.strip() == "*" or value.strip().removeprefix("W/") == tag for value in validator.split(","))
        elif self.headers.get("If-Modified-Since"):
            try:
                since = parsedate_to_datetime(self.headers["If-Modified-Since"])
                since = since.replace(tzinfo=timezone.utc) if since.tzinfo is None else since
                not_modified = int(asset.modified) <= since.timestamp()
            except (TypeError, ValueError, OverflowError):
                pass

        self.send_response(304 if not_modified else 200)
        self.send_header("Cache-Control", cache_control)
        self.send_header("ETag", tag)
        self.send_header("Last-Modified", formatdate(asset.modified, usegmt=True))
        if compressible(content_type):
            self.send_header("Vary", "Accept-Encoding")
        if encoded:
            self.send_header("Content-Encoding", "gzip")
        if not not_modified:
            mime = content_type + ("; charset=utf-8" if compressible(content_type) else "")
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        return None if not_modified else BytesIO(payload)


def create_server(port: int = 5173, directory: Path = SITE_ROOT) -> ThreadingHTTPServer:
    return ThreadingHTTPServer(("127.0.0.1", port), partial(AssetHandler, directory=str(directory)))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("port must be between 0 and 65535")
    with create_server(args.port) as server:
        print(f"Serving {SITE_ROOT} at http://127.0.0.1:{server.server_port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
