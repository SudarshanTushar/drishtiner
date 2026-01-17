import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

print("🌋 Initializing Government-Grade Risk Engine...")

# 1. GENERATE SYNTHETIC DATA
# We need 5000 points to make the Random Forest robust.
np.random.seed(42)
n_samples = 5000

data = {
    'slope': np.random.uniform(0, 90, n_samples),          # Degrees
    'rainfall_24h': np.random.uniform(0, 400, n_samples),  # mm
    'soil_moisture': np.random.uniform(0, 100, n_samples), # %
    'rock_type_hard': np.random.randint(0, 2, n_samples),  # 0=Soft, 1=Hard
    'vegetation_index': np.random.uniform(0, 1, n_samples) # 0.0 to 1.0
}
df = pd.DataFrame(data)

# 2. CREATE THE GROUND TRUTH
# Logic: High Slope + High Rain = High Risk. Hard Rock = Safety buffer.
df['risk_score'] = (
    (df['slope'] / 90) * 0.5 + 
    (df['rainfall_24h'] / 400) * 0.4 + 
    (df['soil_moisture'] / 100) * 0.1 - 
    (df['rock_type_hard'] * 0.2)
)
df['risk_score'] += np.random.normal(0, 0.05, n_samples)
df['risk_score'] = df['risk_score'].clip(0, 1)

# 3. TRAIN THE BRAIN
print(f"   🧠 Training on {n_samples} geospatial points...")
model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
X = df[['slope', 'rainfall_24h', 'soil_moisture', 'rock_type_hard', 'vegetation_index']]
y = df['risk_score']
model.fit(X, y)

# 4. EXPLAINABILITY CHECK
importances = dict(zip(X.columns, model.feature_importances_))
print(f"   ✅ Feature Impact (XAI): {importances}")

# 5. SAVE THE FILE
# This ensures it saves in the correct folder even if run from elsewhere
current_dir = os.path.dirname(os.path.abspath(__file__))
save_path = os.path.join(current_dir, 'landslide_rf.pkl')

joblib.dump(model, save_path) 
print(f"SUCCESS: Model saved as '{save_path}'")