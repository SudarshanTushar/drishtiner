import os
from flask import Flask, request, jsonify, send_from_directory # Added send_from_directory
# ... (Keep your imports: joblib, pandas, etc.)

# DEFINE PATHS (CRITICAL FOR DEPLOYMENT)
# This points to the frontend build directory relative to this backend file
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app)

# ... (Keep your existing Model Loading code) ...

# ... (Keep your existing /transcribe route) ...

# --- NEW: STATIC FILE SERVING FOR REACT ---
@app.route('/')
def serve_client():
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return "Frontend Build Not Found. Run 'npm run build' in frontend directory.", 404

@app.route('/<path:path>')
def serve_static(path):
    # Check if file exists in dist (e.g., assets/js)
    if os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    # Fallback to index.html for React Router (SPA Support)
    return send_from_directory(FRONTEND_DIST, 'index.html')

if __name__ == '__main__':
    # ... (Keep your existing main block)
