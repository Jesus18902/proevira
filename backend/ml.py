# backend/ml.py
# Carga y almacenamiento de modelos de Machine Learning
# Modelos: Regresion Lineal y Regresion Polinomial (comparativa)

import os
import numpy as np
import pandas as pd
import joblib
from config import BACKEND_DIR, ESTADO_POR_ID


class ModelStore:
    """Almacen centralizado de modelos ML.
    Almacena Regresion Lineal y Regresion Polinomial para comparativa.
    """
    def __init__(self):
        self.modelo_lineal = None
        self.modelo_polinomial = None
        self.poly_degree = None
        self.label_encoder = None
        self.feature_cols = None
        self.metricas_lineal = {}
        self.metricas_polinomial = {}
        self.umbrales_riesgo = {}


models = ModelStore()


def load_models():
    """Carga los modelos ML desde disco."""
    for name, attr, msg in [
        ('model_lineal.pkl', 'modelo_lineal', 'Regresion Lineal'),
        ('model_polinomial.pkl', 'modelo_polinomial', 'Regresion Polinomial'),
    ]:
        try:
            path = os.path.join(BACKEND_DIR, name)
            if os.path.exists(path):
                setattr(models, attr, joblib.load(path))
                print(f"[OK] Modelo {msg} cargado")
        except Exception as e:
            print(f"[ERROR] Error cargando {msg}: {e}")

    try:
        path = os.path.join(BACKEND_DIR, 'label_encoder.pkl')
        if os.path.exists(path):
            models.label_encoder = joblib.load(path)
            print(f"[OK] LabelEncoder cargado ({len(models.label_encoder.classes_)} estados)")
    except Exception as e:
        print(f"[ERROR] Error cargando label encoder: {e}")

    try:
        path = os.path.join(BACKEND_DIR, 'model_features.pkl')
        if os.path.exists(path):
            models.feature_cols = joblib.load(path)
    except Exception as e:
        print(f"[ERROR] Error cargando features: {e}")

    try:
        path = os.path.join(BACKEND_DIR, 'model_metricas.pkl')
        if os.path.exists(path):
            metricas = joblib.load(path)
            models.metricas_lineal = metricas.get('lineal', {})
            models.metricas_polinomial = metricas.get('polinomial', {})
            models.poly_degree = metricas.get('poly_degree', 3)
            r2l = models.metricas_lineal.get('r2', 0)
            r2p = models.metricas_polinomial.get('r2', 0)
            print(f"[OK] Metricas: Lineal R2={r2l:.4f}, "
                  f"Polinomial(grado {models.poly_degree}) R2={r2p:.4f}")
    except Exception as e:
        print(f"[ERROR] Error cargando metricas: {e}")

    try:
        path = os.path.join(BACKEND_DIR, 'model_umbrales.pkl')
        if os.path.exists(path):
            models.umbrales_riesgo = joblib.load(path)
            print("[OK] Umbrales de riesgo cargados")
    except Exception as e:
        print(f"[ERROR] Error cargando umbrales: {e}")

    if models.modelo_lineal and models.modelo_polinomial:
        print(f"[OK] Ambos modelos disponibles - Mejor: {mejor_modelo()}")
    elif models.modelo_lineal or models.modelo_polinomial:
        print("[WARN] Solo un modelo disponible")
    else:
        print("[WARN] No hay modelos ML - entrene via /api/modelos/entrenar")


def mejor_modelo():
    """Retorna cual modelo tiene mejor R2."""
    r2l = models.metricas_lineal.get('r2', 0)
    r2p = models.metricas_polinomial.get('r2', 0)
    return 'polinomial' if r2p >= r2l else 'lineal'


def hay_modelos():
    """Retorna True si al menos un modelo esta disponible."""
    return models.modelo_lineal is not None or models.modelo_polinomial is not None


def predecir_casos(X_df):
    """Predice casos con ambos modelos.

    Args:
        X_df: DataFrame con las 11 features.

    Returns:
        dict con predicciones de ambos modelos y el mejor.
    """
    resultados = {}

    if models.modelo_lineal is not None:
        try:
            pred = float(models.modelo_lineal.predict(X_df)[0])
            resultados['lineal'] = {
                'casos_predichos': int(round(max(0, pred))),
                'valor_crudo': round(pred, 2),
                'modelo': 'Regresion Lineal',
                'r2': round(models.metricas_lineal.get('r2', 0), 4),
                'mae': round(models.metricas_lineal.get('mae', 0), 2)
            }
        except Exception as e:
            resultados['lineal'] = {'error': str(e), 'casos_predichos': 0}

    if models.modelo_polinomial is not None:
        try:
            pred = float(models.modelo_polinomial.predict(X_df)[0])
            resultados['polinomial'] = {
                'casos_predichos': int(round(max(0, pred))),
                'valor_crudo': round(pred, 2),
                'modelo': f'Regresion Polinomial (grado {models.poly_degree})',
                'r2': round(models.metricas_polinomial.get('r2', 0), 4),
                'mae': round(models.metricas_polinomial.get('mae', 0), 2)
            }
        except Exception as e:
            resultados['polinomial'] = {'error': str(e), 'casos_predichos': 0}

    best = mejor_modelo()
    if best in resultados and 'error' not in resultados[best]:
        resultados['mejor'] = best
        resultados['casos_mejor_modelo'] = resultados[best]['casos_predichos']
    elif 'lineal' in resultados and 'error' not in resultados.get('lineal', {}):
        resultados['mejor'] = 'lineal'
        resultados['casos_mejor_modelo'] = resultados['lineal']['casos_predichos']
    elif 'polinomial' in resultados and 'error' not in resultados.get('polinomial', {}):
        resultados['mejor'] = 'polinomial'
        resultados['casos_mejor_modelo'] = resultados['polinomial']['casos_predichos']
    else:
        resultados['mejor'] = None
        resultados['casos_mejor_modelo'] = 0

    return resultados


def derivar_riesgo(casos_predichos, poblacion=100000):
    """Deriva nivel de riesgo y probabilidad a partir de casos predichos."""
    umbrales = models.umbrales_riesgo

    if not umbrales or not umbrales.get('p75'):
        tasa = (casos_predichos / max(poblacion, 1)) * 100000
        probabilidad = round(min(100, max(0, tasa * 2)), 1)
    else:
        p25 = umbrales.get('p25', 1)
        p50 = umbrales.get('p50', 3)
        p75 = umbrales.get('p75', 8)
        p90 = umbrales.get('p90', 15)

        if casos_predichos <= 0:
            probabilidad = 0.0
        elif casos_predichos <= p25:
            probabilidad = (casos_predichos / max(p25, 0.01)) * 25
        elif casos_predichos <= p50:
            probabilidad = 25 + ((casos_predichos - p25) / max(p50 - p25, 0.01)) * 25
        elif casos_predichos <= p75:
            probabilidad = 50 + ((casos_predichos - p50) / max(p75 - p50, 0.01)) * 25
        else:
            extra = ((casos_predichos - p75) / max(p90 - p75, 0.01)) * 25
            probabilidad = 75 + min(25, extra)

        probabilidad = round(min(100, max(0, probabilidad)), 1)

    if probabilidad >= 75:
        nivel = 'Critico'
        mensaje = 'ALERTA CRITICA: Riesgo muy alto de brote. Activar protocolos de emergencia.'
    elif probabilidad >= 50:
        nivel = 'Alto'
        mensaje = 'ADVERTENCIA: Riesgo elevado de brote. Intensificar vigilancia epidemiologica.'
    elif probabilidad >= 25:
        nivel = 'Moderado'
        mensaje = 'PRECAUCION: Riesgo moderado. Mantener vigilancia activa.'
    else:
        nivel = 'Bajo'
        mensaje = 'Riesgo bajo. Mantener vigilancia estandar y control vectorial.'

    riesgo_clase = 1 if probabilidad >= 50 else 0

    recomendaciones_map = {
        'Critico': 'Activar protocolos de emergencia, reforzar fumigacion y comunicacion inmediata.',
        'Alto': 'Intensificar vigilancia, aumentar fumigacion y campanas de descacharrizacion.',
        'Moderado': 'Mantener vigilancia activa y reforzar educacion preventiva.',
        'Bajo': 'Continuar con las acciones preventivas habituales.'
    }

    return {
        'probabilidad': probabilidad,
        'nivel': nivel,
        'clase': riesgo_clase,
        'mensaje': mensaje,
        'recomendaciones': recomendaciones_map.get(nivel, 'Mantener vigilancia.')
    }


def construir_features(datos_hist, id_region, semana=None, mes=None):
    """Construye DataFrame de features a partir de ultimos 4 registros de BD.

    Args:
        datos_hist: lista de dicts con casos_confirmados y tasa_incidencia (DESC)
        id_region: int
        semana: int (auto si None)
        mes: int (auto si None)

    Returns:
        (X_df, info_dict)
    """
    from datetime import datetime

    casos_hist = [int(d['casos_confirmados']) for d in datos_hist]
    ti_hist = [float(d['tasa_incidencia']) for d in datos_hist]

    c1 = casos_hist[0] if len(casos_hist) > 0 else 0
    c2 = casos_hist[1] if len(casos_hist) > 1 else c1
    c3 = casos_hist[2] if len(casos_hist) > 2 else c1
    c4 = casos_hist[3] if len(casos_hist) > 3 else c1
    t1 = ti_hist[0] if len(ti_hist) > 0 else 0
    t2 = ti_hist[1] if len(ti_hist) > 1 else t1

    n = min(4, len(casos_hist))
    promedio = sum(casos_hist[:n]) / n if n > 0 else 0
    tendencia = c1 - c4

    if semana is None:
        semana = datetime.now().isocalendar()[1]
    if mes is None:
        mes = datetime.now().month

    nombre = ESTADO_POR_ID.get(id_region, '')
    try:
        coded = models.label_encoder.transform([nombre])[0]
    except Exception:
        coded = id_region - 1

    X_df = pd.DataFrame({
        'casos_lag_1w': [c1], 'casos_lag_2w': [c2],
        'casos_lag_3w': [c3], 'casos_lag_4w': [c4],
        'ti_lag_1w': [t1], 'ti_lag_2w': [t2],
        'casos_promedio_4w': [promedio], 'tendencia_4w': [tendencia],
        'semana_anio': [semana], 'mes': [mes],
        'estado_coded': [coded]
    })

    info = {
        'casos_ultima_semana': c1, 'casos_hace_4_semanas': c4,
        'tasa_incidencia_actual': round(t1, 4),
        'tasa_incidencia_anterior': round(t2, 4),
        'casos_promedio_4w': round(promedio, 2),
        'tendencia_4w': tendencia,
        'semana_epidemiologica': semana, 'mes': mes
    }

    return X_df, info
