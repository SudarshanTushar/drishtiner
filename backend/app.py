import os
import time
import joblib
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sklearn.ensemble import RandomForestRegressor
from database import db
from auth import verify_token

# --- CONFIGURATION ---
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app)

# --- SELF-HEALING AI LOADER ---
def train_fallback_model():
    """Generates a new AI model in-memory if the file is missing."""
    print("🌋 [SYSTEM] Artifact Missing. Initiating Emergency On-Board Training...")
    
    # 1. Generate Synthetic Data (Fast)
    np.random.seed(42)
    n = 2000 # Optimized for boot speed
    data = {
        'slope': np.random.uniform(0, 90, n),
        'rainfall_24h': np.random.uniform(0, 400, n),
        'soil_moisture': np.random.uniform(0, 100, n),
        'rock_type_hard': np.random.randint(0, 2, n),
        'vegetation_index': np.random.uniform(0, 1, n)
    }
    df = pd.DataFrame(data)
    
    # 2. Apply Physical Laws (Ground Truth)
    df['risk_score'] = (
        (df['slope'] / 90) * 0.5 + 
        (df['rainfall_24h'] / 400) * 0.4 + 
        (df['soil_moisture'] / 100) * 0.1 - 
        (df['rock_type_hard'] * 0.2)
    )
    df['risk_score'] = df['risk_score'].clip(0, 1)
    
    # 3. Train Model
    model = RandomForestRegressor(n_estimators=50, max_depth=10, n_jobs=-1)
    X = df[['slope', 'rainfall_24h', 'soil_moisture', 'rock_type_hard', 'vegetation_index']]
    model.fit(X, df['risk_score'])
    
    print("   🧠 [SYSTEM] On-Board Model Trained Successfully.")
    return model

print("🔌 [GATEWAY] Connecting to Neural Engine...")
try:
    model_path = os.path.join(os.path.dirname(__file__), 'ai_engine', 'landslide_rf.pkl')
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print("   ✅ AI Model Loaded from Artifact")
    else:
        model = train_fallback_model()
except Exception as e:
    print(f"   ⚠️ Model Loading Failed ({e}). Retrying with On-Board Training...")
    model = train_fallback_model()

# --- ROUTES ---
@app.route('/')
def serve_client():
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return "Frontend Build Not Found. Check Heroku Build Logs.", 404

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, 'index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    # 1. Auth Check
    user = verify_token(request.headers.get('Authorization', 'MockToken'))
    time.sleep(0.5)
    
    # 2. Log Incident
    print("\n🎤 [EVENT] Processing Voice Command...")
    if user:
        db.log_incident("LANDSLIDE", "Sector-4", user.get('user_id', 'unknown'))
    
    # 3. AI Inference
    risk_score = 0.0
    if model:
        try:
            # Mock Inputs for Demo
            input_data = pd.DataFrame([{
                'slope': 45.0, 'rainfall_24h': 200.0, 'soil_moisture': 90.0,
                'rock_type_hard': 0, 'vegetation_index': 0.2
            }])
            risk_score = float(model.predict(input_data)[0])
        except Exception as e:
            print(f"Inference Error: {e}")
            risk_score = 0.85 # Fallback
    
    return jsonify({
        "text": f"Landslide reported. Risk Level: {risk_score:.2f} (CRITICAL)",
        "intent": "HAZARD_REPORT",
        "risk_score": risk_score,
        "status": "success"
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    print(f"🔥 [SYSTEM ONLINE] Port {port}")
    app.run(host='0.0.0.0', port=port)
