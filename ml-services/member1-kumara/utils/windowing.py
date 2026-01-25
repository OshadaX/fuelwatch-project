# utils/windowing.py
import numpy as np

def make_supervised_windows(X: np.ndarray, y: np.ndarray, lookback: int):
    """
    X: (T, n_features)
    y: (T, n_targets)
    returns:
      Xw: (N, lookback, n_features)
      yw: (N, n_targets)  # next-step target
    """
    Xw, yw = [], []
    for i in range(lookback, len(X)):
        Xw.append(X[i - lookback:i])
        yw.append(y[i])  # predict current day from past lookback
    return np.array(Xw, dtype=np.float32), np.array(yw, dtype=np.float32)
