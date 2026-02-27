# backend/routes/entrenamiento.py
# Endpoints de entrenamiento: Regresion Lineal vs Polinomial

import os
import numpy as np
import pandas as pd
import joblib
from flask import Blueprint, request, jsonify

from config import BACKEND_DIR
from ml import models

modelos_bp = Blueprint('modelos', __name__, url_prefix='/api/modelos')


@modelos_bp.route('/entrenar', methods=['POST'])
def entrenar_modelo():
    """Entrena Regresion Lineal y Polinomial, devuelve comparativa."""
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import PolynomialFeatures, StandardScaler, LabelEncoder
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

    try:
        data = request.get_json() or {}
        archivo_csv = data.get('archivo_csv')

        if not archivo_csv:
            return jsonify({'success': False, 'error': 'archivo_csv es requerido'}), 400

        # Buscar CSV
        csv_path = None
        for ruta in [
            os.path.join(BACKEND_DIR, '..', 'data', archivo_csv),
            os.path.join(BACKEND_DIR, '..', 'modelo', archivo_csv),
            os.path.join(BACKEND_DIR, archivo_csv),
            archivo_csv
        ]:
            if os.path.exists(ruta):
                csv_path = ruta
                break

        if not csv_path:
            return jsonify({'success': False, 'error': f'CSV no encontrado: {archivo_csv}'}), 404

        df = pd.read_csv(csv_path)
        print(f"[INFO] Datos cargados: {len(df)} registros, {len(df.columns)} columnas")

        # -----------------------------------------------------------
        # Preparar features: si el CSV tiene datos crudos, crearlas
        # -----------------------------------------------------------
        feature_cols = [
            'casos_lag_1w', 'casos_lag_2w', 'casos_lag_3w', 'casos_lag_4w',
            'ti_lag_1w', 'ti_lag_2w',
            'casos_promedio_4w', 'tendencia_4w',
            'semana_anio', 'mes', 'estado_coded'
        ]

        has_features = all(c in df.columns for c in feature_cols)

        if not has_features:
            # Crear features desde datos crudos
            print("[INFO] Creando features desde datos crudos...")

            # Detectar columnas
            col_casos = next((c for c in ['casos_confirmados', 'CASOS_CONFIRMADOS'] if c in df.columns), None)
            col_ti = next((c for c in ['tasa_incidencia', 'TASA_INCIDENCIA'] if c in df.columns), None)
            col_estado = next((c for c in ['ENTIDAD_FED', 'NOMBRE_ESTADO', 'estado'] if c in df.columns), None)
            col_fecha = next((c for c in ['fecha_fin_semana', 'FECHA', 'fecha'] if c in df.columns), None)

            if not col_casos:
                return jsonify({'success': False, 'error': 'CSV debe tener columna casos_confirmados'}), 400

            if col_fecha:
                df[col_fecha] = pd.to_datetime(df[col_fecha])
                df = df.sort_values([col_estado, col_fecha] if col_estado else [col_fecha]).reset_index(drop=True)

            # Label encode estado
            if col_estado:
                le = LabelEncoder()
                df['estado_coded'] = le.fit_transform(df[col_estado])
                models.label_encoder = le
            elif 'ENTIDAD_CODED' in df.columns:
                df['estado_coded'] = df['ENTIDAD_CODED']
            else:
                df['estado_coded'] = 0

            # Crear lags
            group_col = col_estado if col_estado else None
            if group_col:
                for lag in [1, 2, 3, 4]:
                    df[f'casos_lag_{lag}w'] = df.groupby(group_col)[col_casos].shift(lag)
                if col_ti:
                    for lag in [1, 2]:
                        df[f'ti_lag_{lag}w'] = df.groupby(group_col)[col_ti].shift(lag)
                df['casos_promedio_4w'] = df.groupby(group_col)[col_casos].transform(
                    lambda x: x.rolling(4, min_periods=1).mean().shift(1))
            else:
                for lag in [1, 2, 3, 4]:
                    df[f'casos_lag_{lag}w'] = df[col_casos].shift(lag)
                if col_ti:
                    for lag in [1, 2]:
                        df[f'ti_lag_{lag}w'] = df[col_ti].shift(lag)
                df['casos_promedio_4w'] = df[col_casos].rolling(4, min_periods=1).mean().shift(1)

            df['tendencia_4w'] = df.get('casos_lag_1w', 0) - df.get('casos_lag_4w', 0)

            if col_fecha:
                df['semana_anio'] = df[col_fecha].dt.isocalendar().week.astype(int)
                df['mes'] = df[col_fecha].dt.month
            else:
                if 'SEMANA_DEL_ANIO' in df.columns:
                    df['semana_anio'] = df['SEMANA_DEL_ANIO']
                else:
                    df['semana_anio'] = 1
                if 'MES' in df.columns:
                    df['mes'] = df['MES']
                else:
                    df['mes'] = 1

            # Rellenar TI si no existe
            if 'ti_lag_1w' not in df.columns:
                df['ti_lag_1w'] = 0
                df['ti_lag_2w'] = 0

            df = df.dropna(subset=[c for c in feature_cols if c in df.columns])
            print(f"[INFO] Registros despues de feature engineering: {len(df)}")
        else:
            col_casos = 'casos_confirmados' if 'casos_confirmados' in df.columns else 'CASOS_CONFIRMADOS'
            # Asegurar label encoder si no existe
            col_estado = next((c for c in ['ENTIDAD_FED', 'NOMBRE_ESTADO', 'estado'] if c in df.columns), None)
            if col_estado and models.label_encoder is None:
                le = LabelEncoder()
                le.fit(df[col_estado].unique())
                models.label_encoder = le

        # Target
        col_target = next((c for c in ['casos_confirmados', 'CASOS_CONFIRMADOS'] if c in df.columns), None)
        if not col_target:
            return jsonify({'success': False, 'error': 'No se encontro columna target (casos_confirmados)'}), 400

        # Filtrar features existentes
        available_features = [c for c in feature_cols if c in df.columns]
        X = df[available_features].copy()
        y = df[col_target].copy()

        # Limpiar NaN
        mask = X.notna().all(axis=1) & y.notna()
        X = X[mask]
        y = y[mask]

        if len(X) < 20:
            return jsonify({'success': False, 'error': f'Datos insuficientes: {len(X)} registros'}), 400

        # Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        print(f"[INFO] Train: {len(X_train)}, Test: {len(X_test)}, Features: {len(available_features)}")

        # -----------------------------------------------------------
        # 1) Regresion Lineal
        # -----------------------------------------------------------
        print("[ML] Entrenando Regresion Lineal...")
        pipe_lineal = Pipeline([
            ('scaler', StandardScaler()),
            ('regressor', LinearRegression())
        ])
        pipe_lineal.fit(X_train, y_train)

        y_pred_lin = pipe_lineal.predict(X_test)
        r2_lin = r2_score(y_test, y_pred_lin)
        mae_lin = mean_absolute_error(y_test, y_pred_lin)
        rmse_lin = float(np.sqrt(mean_squared_error(y_test, y_pred_lin)))

        cv_lin = cross_val_score(pipe_lineal, X, y, cv=5, scoring='r2')
        r2_cv_lin = float(cv_lin.mean())

        metricas_lineal = {
            'r2': round(float(r2_lin), 4),
            'r2_cv': round(r2_cv_lin, 4),
            'mae': round(float(mae_lin), 2),
            'rmse': round(rmse_lin, 2)
        }
        print(f"[OK] Lineal: R2={r2_lin:.4f}, R2_CV={r2_cv_lin:.4f}, MAE={mae_lin:.2f}")

        # -----------------------------------------------------------
        # 2) Regresion Polinomial (grados 2-5, elegir mejor)
        # -----------------------------------------------------------
        print("[ML] Entrenando Regresion Polinomial (grados 2-5)...")
        mejor_grado = 2
        mejor_r2_cv = -np.inf
        resultados_grados = {}

        for grado in range(2, 6):
            try:
                pipe_poly = Pipeline([
                    ('poly', PolynomialFeatures(degree=grado, include_bias=False, interaction_only=False)),
                    ('scaler', StandardScaler()),
                    ('regressor', LinearRegression())
                ])

                # Cross-validation para evitar overfitting
                cv_scores = cross_val_score(pipe_poly, X_train, y_train, cv=5, scoring='r2')
                r2_cv = float(cv_scores.mean())

                pipe_poly.fit(X_train, y_train)
                y_pred_poly = pipe_poly.predict(X_test)
                r2_test = float(r2_score(y_test, y_pred_poly))
                mae_test = float(mean_absolute_error(y_test, y_pred_poly))

                n_features_poly = pipe_poly.named_steps['poly'].n_output_features_

                resultados_grados[grado] = {
                    'r2_test': round(r2_test, 4),
                    'r2_cv': round(r2_cv, 4),
                    'mae': round(mae_test, 2),
                    'n_features': n_features_poly
                }

                print(f"   Grado {grado}: R2_test={r2_test:.4f}, R2_CV={r2_cv:.4f}, "
                      f"MAE={mae_test:.2f}, features={n_features_poly}")

                # Seleccionar por R2 de CV (evita overfitting)
                if r2_cv > mejor_r2_cv:
                    mejor_r2_cv = r2_cv
                    mejor_grado = grado

            except Exception as e:
                print(f"   Grado {grado}: ERROR - {e}")
                resultados_grados[grado] = {'error': str(e)}

        # Entrenar modelo final con mejor grado
        print(f"[ML] Mejor grado polinomial: {mejor_grado} (R2_CV={mejor_r2_cv:.4f})")

        pipe_mejor_poly = Pipeline([
            ('poly', PolynomialFeatures(degree=mejor_grado, include_bias=False)),
            ('scaler', StandardScaler()),
            ('regressor', LinearRegression())
        ])
        pipe_mejor_poly.fit(X_train, y_train)

        y_pred_poly_final = pipe_mejor_poly.predict(X_test)
        r2_poly = float(r2_score(y_test, y_pred_poly_final))
        mae_poly = float(mean_absolute_error(y_test, y_pred_poly_final))
        rmse_poly = float(np.sqrt(mean_squared_error(y_test, y_pred_poly_final)))

        cv_poly_final = cross_val_score(pipe_mejor_poly, X, y, cv=5, scoring='r2')
        r2_cv_poly = float(cv_poly_final.mean())

        metricas_polinomial = {
            'r2': round(r2_poly, 4),
            'r2_cv': round(r2_cv_poly, 4),
            'mae': round(mae_poly, 2),
            'rmse': round(rmse_poly, 2),
            'grado': mejor_grado
        }
        print(f"[OK] Polinomial(grado {mejor_grado}): R2={r2_poly:.4f}, "
              f"R2_CV={r2_cv_poly:.4f}, MAE={mae_poly:.2f}")

        # -----------------------------------------------------------
        # 3) Calcular umbrales de riesgo
        # -----------------------------------------------------------
        umbrales = {
            'p25': float(np.percentile(y, 25)),
            'p50': float(np.percentile(y, 50)),
            'p75': float(np.percentile(y, 75)),
            'p90': float(np.percentile(y, 90)),
            'media': float(np.mean(y)),
            'std': float(np.std(y)),
            'max': float(np.max(y)),
            'min': float(np.min(y))
        }

        # -----------------------------------------------------------
        # 4) Guardar modelos
        # -----------------------------------------------------------
        joblib.dump(pipe_lineal, os.path.join(BACKEND_DIR, 'model_lineal.pkl'))
        joblib.dump(pipe_mejor_poly, os.path.join(BACKEND_DIR, 'model_polinomial.pkl'))
        joblib.dump(available_features, os.path.join(BACKEND_DIR, 'model_features.pkl'))
        joblib.dump(umbrales, os.path.join(BACKEND_DIR, 'model_umbrales.pkl'))

        if models.label_encoder is not None:
            joblib.dump(models.label_encoder, os.path.join(BACKEND_DIR, 'label_encoder.pkl'))

        metricas_all = {
            'lineal': metricas_lineal,
            'polinomial': metricas_polinomial,
            'poly_degree': mejor_grado
        }
        joblib.dump(metricas_all, os.path.join(BACKEND_DIR, 'model_metricas.pkl'))

        # Actualizar ModelStore en memoria
        models.modelo_lineal = pipe_lineal
        models.modelo_polinomial = pipe_mejor_poly
        models.poly_degree = mejor_grado
        models.feature_cols = available_features
        models.metricas_lineal = metricas_lineal
        models.metricas_polinomial = metricas_polinomial
        models.umbrales_riesgo = umbrales

        # -----------------------------------------------------------
        # 5) Determinar mejor modelo
        # -----------------------------------------------------------
        mejor = 'polinomial' if r2_cv_poly >= r2_cv_lin else 'lineal'
        mejor_r2 = max(r2_poly, r2_lin)
        mejor_mae = metricas_polinomial['mae'] if mejor == 'polinomial' else metricas_lineal['mae']

        print(f"[OK] Mejor modelo: {mejor} (R2={mejor_r2:.4f})")

        return jsonify({
            'success': True,
            'tipo_modelo': 'regresor',
            'mensaje': (f'Modelos entrenados - Mejor: '
                        f'{"Polinomial grado " + str(mejor_grado) if mejor == "polinomial" else "Lineal"} '
                        f'(R2={mejor_r2:.4f})'),
            'metricas': {
                'r2_score': round(mejor_r2, 4),
                'mae': round(mejor_mae, 2)
            },
            'datos': {
                'total_registros': len(df),
                'registros_entrenamiento': len(X_train),
                'registros_prueba': len(X_test),
                'features': available_features
            },
            'archivo_guardado': 'model_lineal.pkl + model_polinomial.pkl',
            'comparativa': {
                'lineal': metricas_lineal,
                'polinomial': metricas_polinomial,
                'grados_evaluados': resultados_grados,
                'mejor_modelo': mejor,
                'mejor_grado': mejor_grado
            },
            'umbrales_riesgo': umbrales
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e), 'detalles': traceback.format_exc()}), 500


@modelos_bp.route('/info', methods=['GET'])
def get_modelos_info():
    """Informacion de modelos cargados y CSVs disponibles."""

    lineal_existe = os.path.exists(os.path.join(BACKEND_DIR, 'model_lineal.pkl'))
    poli_existe = os.path.exists(os.path.join(BACKEND_DIR, 'model_polinomial.pkl'))

    modelos_info = {
        'lineal': {
            'cargado': models.modelo_lineal is not None,
            'archivo': 'model_lineal.pkl',
            'existe': lineal_existe,
            'metricas': models.metricas_lineal,
            'features': models.feature_cols or []
        },
        'polinomial': {
            'cargado': models.modelo_polinomial is not None,
            'archivo': 'model_polinomial.pkl',
            'existe': poli_existe,
            'grado': models.poly_degree,
            'metricas': models.metricas_polinomial,
            'features': models.feature_cols or []
        },
        # Backward compat aliases for frontend
        'clasificador': {
            'cargado': models.modelo_lineal is not None,
            'existe': lineal_existe,
            'archivo': 'model_lineal.pkl',
            'n_features': len(models.feature_cols) if models.feature_cols else 0,
            'n_classes': 4,
            'label_encoder': models.label_encoder is not None
        },
        'regresor': {
            'cargado': models.modelo_polinomial is not None,
            'existe': poli_existe,
            'archivo': 'model_polinomial.pkl',
            'features': models.feature_cols or []
        }
    }

    # Buscar CSVs disponibles
    archivos_csv = []
    for directorio, nombre_dir in [
        (os.path.join(BACKEND_DIR, '..', 'data'), 'data'),
        (os.path.join(BACKEND_DIR, '..', 'modelo'), 'modelo')
    ]:
        if os.path.exists(directorio):
            for archivo in os.listdir(directorio):
                if archivo.endswith('.csv'):
                    ruta_completa = os.path.join(directorio, archivo)
                    try:
                        df_sample = pd.read_csv(ruta_completa, nrows=5)
                        archivos_csv.append({
                            'nombre': archivo,
                            'ruta': os.path.join(nombre_dir, archivo),
                            'columnas': list(df_sample.columns),
                            'n_columnas': len(df_sample.columns),
                            'tamano_mb': round(os.path.getsize(ruta_completa) / (1024 * 1024), 2)
                        })
                    except Exception:
                        archivos_csv.append({
                            'nombre': archivo,
                            'ruta': os.path.join(nombre_dir, archivo),
                            'columnas': [], 'n_columnas': 0,
                            'tamano_mb': round(os.path.getsize(ruta_completa) / (1024 * 1024), 2)
                        })

    from ml import mejor_modelo, hay_modelos
    return jsonify({
        'success': True,
        'modelos': modelos_info,
        'mejor_modelo': mejor_modelo() if hay_modelos() else None,
        'archivos_csv': archivos_csv
    }), 200
