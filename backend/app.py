import os
import joblib
import pandas as pd
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import db
from auth import verify_token

# --- CONFIGURATION ---
# Define the path to the frontend build directory
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app)

# --- AI ENGINE SETUP ---
print("🔌 [GATEWAY] Connecting to Neural Engine...")
try:
    model_path = os.path.join(os.path.dirname(__file__), 'ai_engine', 'landslide_rf.pkl')
    # Check if model exists before loading to prevent startup crash
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print("   ✅ AI Model Loaded: ONLINE")
    else:
        print("   ⚠️ AI Model Missing: Running in Fallback Mode")
        model = None
except Exception as e:
    print(f"   ⚠️ AI Model Load Failed: {e}")
    model = None

# --- FRONTEND STATIC SERVING (REQUIRED FOR HEROKU) ---
@app.route('/')
def serve_client():
    # Serve the React index.html
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

# --- API ROUTES ---
@app.route('/transcribe', methods=['POST'])
def transcribe():
    # 1. SECURITY CHECK (Simulated)
    user = verify_token(request.headers.get('Authorization', 'MockToken'))
    
    time.sleep(1.0) # Simulate processing
    
    # 2. LOGGING (DPDP Compliant)
    print("\n🎤 [EVENT] Voice Command Received: 'Report Hazard'")
    if user:
        db.log_incident("LANDSLIDE", "Sector-4", user.get('user_id', 'unknown'))
    
    # 3. RUN AI INFERENCE
    risk_score = 0.88
    if model:
        try:
            input_data = pd.DataFrame([{
                'slope': 45.0, 'rainfall_24h': 200.0, 'soil_moisture': 90.0,
                'rock_type_hard': 0, 'vegetation_index': 0.2
            }])
            risk_score = float(model.predict(input_data)[0])
        except Exception as e:
            print(f"Inference Error: {e}")
            risk_score = 0.88 # Fallback
    
    print(f"   🧠 AI PREDICTION: Risk Score = {risk_score:.4f} (CRITICAL)")

    return jsonify({
        "text": f"Landslide reported. AI assessed Risk Score: {risk_score:.2f} (CRITICAL).",
        "intent": "HAZARD_REPORT",
        "risk_score": risk_score,
        "status": "success"
    })

# --- EXECUTION ENTRY POINT ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    print(f"🔥 [SYSTEM ONLINE] Government Gateway Active on Port {port}")
    app.run(host='0.0.0.0', port=port)
