import gzip
import hashlib
from http.client import HTTPConnection
import os
from pathlib import Path
import tempfile
from threading import Thread
import unittest
from unittest.mock import patch

from serve import AssetHandler, create_server, load_asset


class StaticDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "site"
        self.root.mkdir()
        self.script = b"const message = 'compression and validation';\n" * 40
        (self.root / "app.js").write_bytes(self.script)
        (self.root / "index.html").write_bytes(b"<h1>Static site</h1>" * 40)
        (self.root / "font.woff2").write_bytes(bytes(range(256)) * 4)
        self.quiet = patch.object(AssetHandler, "log_message")
        self.quiet.start()
        self.addCleanup(self.quiet.stop)
        self.server = create_server(0, self.root)
        self.thread = Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        load_asset.cache_clear()

    def request(self, path="/app.js", method="GET", headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port)
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_gzip_round_trip_and_head_representation(self):
        status, headers, body = self.request(headers={"Accept-Encoding": "gzip"})
        self.assertEqual(status, 200)
        self.assertEqual(gzip.decompress(body), self.script)
        self.assertEqual(headers["Content-Encoding"], "gzip")
        self.assertEqual(headers["Vary"], "Accept-Encoding")
        status, head, body = self.request(method="HEAD", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        for name in ["Content-Encoding", "Content-Length", "Content-Type", "ETag", "Last-Modified", "Vary"]:
            self.assertEqual(head[name], headers[name])
        _, plain, body = self.request()
        self.assertEqual(body, self.script)
        self.assertNotIn("Content-Encoding", plain)
        self.assertNotEqual(plain["ETag"], headers["ETag"])

    def test_encoding_preferences_and_explicit_rejection(self):
        for value in ["gzip;q=0", "gzip;q=0, *;q=1", "gzip;q=0.5, identity;q=1"]:
            with self.subTest(value=value):
                status, headers, body = self.request(headers={"Accept-Encoding": value})
                self.assertEqual(status, 200)
                self.assertNotIn("Content-Encoding", headers)
                self.assertEqual(body, self.script)
        status, _, body = self.request(headers={"Accept-Encoding": "gzip;q=1, identity;q=0"})
        self.assertEqual(status, 200)
        self.assertEqual(gzip.decompress(body), self.script)
        self.assertEqual(self.request(headers={"Accept-Encoding": "*;q=0"})[0], 406)

    def test_conditional_requests_preserve_representation_and_validator_precedence(self):
        _, headers, _ = self.request()
        tag = headers["ETag"]
        for method, validator in [("GET", tag), ("HEAD", "W/" + tag), ("GET", "*")]:
            with self.subTest(method=method, validator=validator):
                status, cached, body = self.request(method=method, headers={"If-None-Match": validator})
                self.assertEqual((status, body), (304, b""))
                self.assertEqual(cached["ETag"], tag)
        status, _, _ = self.request(headers={"If-Modified-Since": headers["Last-Modified"]})
        self.assertEqual(status, 304)
        status, _, body = self.request(headers={"If-None-Match": '"different"', "If-Modified-Since": headers["Last-Modified"]})
        self.assertEqual((status, body), (200, self.script))
        status, encoded, body = self.request(headers={"Accept-Encoding": "gzip", "If-None-Match": tag})
        self.assertEqual(status, 200)
        self.assertEqual(gzip.decompress(body), self.script)
        self.assertNotEqual(encoded["ETag"], tag)

    def test_immutable_cache_requires_one_current_lowercase_fingerprint(self):
        digest = hashlib.sha256(self.script).hexdigest()
        status, headers, _ = self.request(f"/app.js?v={digest[:10]}")
        self.assertEqual(status, 200)
        self.assertIn("immutable", headers["Cache-Control"])
        for query in ["", "?v=123", "?v=" + "0" * 10, "?v=" + digest[:10].upper(), f"?v={digest[:10]}&v={digest[:10]}", f"?v={digest[:10]}&other=1"]:
            with self.subTest(query=query):
                self.assertEqual(self.request("/app.js" + query)[1]["Cache-Control"], "no-cache")
        html = (self.root / "index.html").read_bytes()
        fingerprint = hashlib.sha256(html).hexdigest()[:10]
        self.assertEqual(self.request(f"/?v={fingerprint}")[1]["Cache-Control"], "no-cache")

    def test_same_size_edits_invalidate_cached_bytes_and_old_fingerprint(self):
        digest = hashlib.sha256(self.script).hexdigest()[:10]
        _, old, _ = self.request(f"/app.js?v={digest}")
        path = self.root / "app.js"
        stat = path.stat()
        changed = self.script.replace(b"message", b"updated")
        path.write_bytes(changed)
        os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        status, headers, body = self.request(f"/app.js?v={digest}", headers={"If-None-Match": old["ETag"]})
        self.assertEqual((status, body), (200, changed))
        self.assertNotEqual(headers["ETag"], old["ETag"])
        self.assertEqual(headers["Cache-Control"], "no-cache")

    def test_site_boundary_and_disabled_directory_listings(self):
        outside = self.root.parent / "outside.txt"
        outside.write_text("outside the served site")
        (self.root / "leak.txt").symlink_to(outside)
        (self.root / "empty").mkdir()
        for path in ["/../outside.txt", "/%2e%2e/outside.txt", "/leak.txt"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 403)
        self.assertEqual(self.request("/empty/")[0], 404)
        self.assertEqual(self.request("/%00", method="HEAD")[0::2], (400, b""))
        status, headers, body = self.request("/font.woff2", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "font/woff2")
        self.assertNotIn("Content-Encoding", headers)
        self.assertEqual(body, bytes(range(256)) * 4)


if __name__ == "__main__":
    unittest.main()
