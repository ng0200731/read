#!/usr/bin/env python3
"""
Simple HTTP Server for Image Pattern Analysis Tool
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# Configuration
PORT = 3000
HOST = 'localhost'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Simple health check endpoint
        if self.path in ('/healthz', '/health'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            try:
                self.wfile.write(b'ok')
            except BrokenPipeError:
                pass
        else:
            super().do_GET()


def start_server():
    """Start the HTTP server"""

    # Check if we're in the right directory
    if not Path('index.html').exists():
        print("❌ Error: index.html not found in current directory")
        print(f"Current directory: {os.getcwd()}")
        print("Please run this script from the project root directory")
        return False

    # Check required files
    required_files = ['app.js', 'styles.css', 'canvas-tools.js', 'image-processor.js', 'calculator.js']
    missing_files = [f for f in required_files if not Path(f).exists()]

    if missing_files:
        print(f"❌ Error: Missing required files: {', '.join(missing_files)}")
        return False

    print("=" * 50)
    print("🚀 IMAGE PATTERN ANALYSIS TOOL SERVER")
    print("=" * 50)
    print(f"📁 Directory: {os.getcwd()}")
    print(f"🌐 URL: http://{HOST}:{PORT}")
    print(f"🔧 Python: {sys.version.split()[0]}")
    print("=" * 50)
    print("✅ All required files found")
    print("🔄 Starting server...")
    print("💡 Press Ctrl+C to stop the server")
    print("=" * 50)

    try:
        # Create server
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            print(f"✅ Server started successfully on http://{HOST}:{PORT}")
            print("🌐 Opening browser...")

            # Open browser
            webbrowser.open(f'http://{HOST}:{PORT}')

            print("🔄 Server is running... Press Ctrl+C to stop")
            print("=" * 50)

            # Start serving
            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n" + "=" * 50)
        print("🛑 Server stopped by user")
        print("=" * 50)
        return True

    except OSError as e:
        if e.errno == 10048:  # Port already in use
            print(f"❌ Error: Port {PORT} is already in use")
            print("💡 Try closing other applications using this port")
            print("💡 Or change the PORT variable in this script")
        else:
            print(f"❌ Error starting server: {e}")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    start_server()
