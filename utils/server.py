#!/usr/bin/env python3
from __future__ import print_function
import os
import http.server
import socketserver
import sys

if len(sys.argv) > 1:
    PORT = int(sys.argv[1])
else:
    PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        if self.compression:
            self.send_header('Content-Encoding', 'gzip')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

    def guess_type(self,path):
        return http.server.SimpleHTTPRequestHandler.guess_type(self,self.orig_path)

    def translate_path(self,path):
        path = http.server.SimpleHTTPRequestHandler.translate_path(self,path)
        self.orig_path = path
        if os.path.exists(path+".gz"):
            self.compression = True
            return path + ".gz"
        else:
            self.compression = False
            return path

httpd = socketserver.TCPServer(("", PORT), Handler)

print("serving at port", PORT)
httpd.serve_forever()

