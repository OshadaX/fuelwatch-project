
import sys
import os
from pathlib import Path
import tensorflow as tf
from joblib import load
import json

# Add the member directory to sys.path
base_dir = Path("/Users/oshadanavindra/Desktop/fuelwatch-project/ml-services/member1-kumara")
sys.path.append(str(base_dir))

try:
    models_dir = base_dir / "models"
    model_path = models_dir / "fuel_lstm.keras"
    
    print("Attempting to load model with compile=False...")
    model = tf.keras.models.load_model(model_path, compile=False)
    print("Success with compile=False!")
    
    # Try a prediction to ensure it works
    print("Testing prediction...")
    # Mock data
    import numpy as np
    x = np.random.rand(1, 14, 9).astype(np.float32)
    y = model.predict(x)
    print("Prediction test success!")
    
except Exception as e:
    print(f"Failed even with compile=False: {e}")
    import traceback
    traceback.print_exc()
