
import sys
import os
from pathlib import Path

# Add the member directory to sys.path
base_dir = Path("/Users/oshadanavindra/Desktop/fuelwatch-project/ml-services/member1-kumara")
sys.path.append(str(base_dir))

try:
    from utils.predictor import FuelDemandPredictor
    print("Attempting to initialize FuelDemandPredictor...")
    predictor = FuelDemandPredictor()
    print("Success!")
except Exception as e:
    print(f"Failed with error: {e}")
    import traceback
    traceback.print_exc()
