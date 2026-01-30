"""
DC Federal Court Document Drafter - Flask Web Application

A local web application for:
1. Generating court documents with proper DC Federal District Court formatting
2. Researching cases via CourtListener API
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, render_template, jsonify
from flask_cors import CORS

from config import Config, OUTPUT_DIR
from api.documents import documents_bp
from api.research import research_bp
from api.upload import upload_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for API endpoints
    CORS(app)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Register blueprints
    app.register_blueprint(documents_bp)
    app.register_blueprint(research_bp)
    app.register_blueprint(upload_bp)

    # Main routes
    @app.route('/')
    def index():
        """Redirect to generator page."""
        return render_template('generator.html')

    @app.route('/generator')
    def generator():
        """Document generator page."""
        return render_template('generator.html')

    @app.route('/research')
    def research():
        """Court research page."""
        return render_template('research.html')

    @app.route('/upload')
    def upload():
        """Document upload and reformat page."""
        return render_template('upload.html')

    @app.route('/health')
    def health():
        """Health check endpoint."""
        return jsonify({"status": "ok", "app": "DC Federal Court Document Drafter"})

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


# Create app instance for gunicorn
app = create_app()

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("DC FEDERAL COURT DOCUMENT DRAFTER")
    print("Powered by DC Federal Litigation")
    print("=" * 60)
    print("\nStarting web application...")
    print("\nOpen your browser to: http://localhost:5000")
    print("\nModes:")
    print("  - Document Generator:  http://localhost:5000/generator")
    print("  - Upload & Reformat:   http://localhost:5000/upload")
    print("  - Court Research:      http://localhost:5000/research")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
