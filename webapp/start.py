"""
DC Federal Court Document Drafter - Launcher
Double-click this file to start the application.
"""
import webbrowser
import threading
import time
import sys
import os

# Set up path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def open_browser():
    """Open browser after a short delay to let server start."""
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    from app import create_app

    print("\n" + "=" * 50)
    print("DC FEDERAL COURT DOCUMENT DRAFTER")
    print("=" * 50)
    print("\nStarting... Browser will open automatically.")
    print("Press Ctrl+C to stop.\n")

    # Open browser in background thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Start Flask (disable reloader to avoid double browser open)
    app = create_app()
    app.run(host='127.0.0.1', port=5000, debug=False)
