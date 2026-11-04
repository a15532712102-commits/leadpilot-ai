#!/usr/bin/env python3
"""Serve only the static application, never repository credentials or source tests."""
import argparse
import functools
import http.server
import pathlib
import threading
import webbrowser
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = {'/', '/index.html', '/app.js', '/core.js', '/app.css', '/sw.js',
         '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png',
         '/icons/apple-touch-icon.png'}

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'application/javascript',
                      '.webmanifest': 'application/manifest+json'}

    def do_GET(self):
        if unquote(urlsplit(self.path).path) not in FILES:
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if unquote(urlsplit(self.path).path) not in FILES:
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    address = 'http://127.0.0.1:%d/' % args.port
    try:
        server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', args.port), functools.partial(Handler, directory=str(ROOT)))
    except OSError as error:
        print('无法启动：%s\n若已启动LeadPilot，请打开 %s' % (error, address))
        return 1
    print('LeadPilot 免费版本已启动：%s\n关闭此窗口或按 Control+C 停止。' % address, flush=True)
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
