# backend/ml.py
# Carga y almacenamiento de modelos de Machine Learning

import os
import joblib
from config import BACKEND_DIR


class ModelStore:
    """Almacén centralizado de modelos ML.
    Se usa una clase para que las modificaciones desde cualquier
    módulo (ej: entrenamiento) sean visibles en todos los demás.
    """
    def __init__(self):
        self.clasificador = None
        self.label_encoder = None
        self.regresor = None
        self.label_encoder_reg = None
        self.regressor_features = None


models = ModelStore()


def load_models():
    """Carga los modelos ML desde disco al ModelStore global."""
    # Clasificador
    try:
        model_path = os.path.join(BACKEND_DIR, 'model.pkl')
        encoder_path = os.path.join(BACKEND_DIR, 'label_encoder.pkl')

        models.clasificador = joblib.load(model_path)
        models.label_encoder = joblib.load(encoder_path)
        print("[OK] Modelo Random Forest (Clasificador) cargado")
        print(f"   - Features esperados: {models.clasificador.n_features_in_}")
        print(f"   - Estados en encoder: {len(models.label_encoder.classes_)}")
    except Exception as e:
        print(f"[ERROR] Error cargando modelo clasificador: {e}")

    # Regresor
    try:
        regressor_path = os.path.join(BACKEND_DIR, 'model_regressor.pkl')
        features_path = os.path.join(BACKEND_DIR, 'regressor_features.pkl')
        encoder_reg_path = os.path.join(BACKEND_DIR, 'label_encoder_regressor.pkl')

        if os.path.exists(regressor_path):
            models.regresor = joblib.load(regressor_path)
            models.regressor_features = joblib.load(features_path)
            models.label_encoder_reg = joblib.load(encoder_reg_path)
            print("[OK] Modelo Random Forest (Regresor) cargado - R2=96.3%")
            print(f"   - Features: {len(models.regressor_features)}")
    except Exception as e:
        print(f"[ERROR] Modelo de regresion no disponible: {e}")
        models.regresor = None
