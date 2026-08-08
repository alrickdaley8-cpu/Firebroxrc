#!/usr/bin/env python3
"""Dev server for FIREBROX·RC — same as `python -m http.server` but sends
no-cache headers, so browsers never serve you a stale JS module again."""
import http.server
import functools

PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(
        ("0.0.0.0", PORT),
        functools.partial(Handler),
    ).serve_forever()
