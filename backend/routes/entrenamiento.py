# backend/routes/entrenamiento.py
# Endpoints de entrenamiento de modelos ML

import os
import pandas as pd
import joblib
from flask import Blueprint, request, jsonify

from config import BACKEND_DIR
from ml import models

modelos_bp = Blueprint('modelos', __name__, url_prefix='/api/modelos')


@modelos_bp.route('/entrenar', methods=['POST'])
def entrenar_modelo():
    """Entrenar un modelo de Machine Learning con datos CSV"""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                                 f1_score, r2_score, mean_absolute_error)

    try:
        data = request.get_json()
        tipo_modelo = data.get('tipo_modelo')
        archivo_csv = data.get('archivo_csv')

        if not tipo_modelo or not archivo_csv:
            return jsonify({
                'success': False,
                'error': 'Faltan parámetros: tipo_modelo y archivo_csv son requeridos'
            }), 400

        # Buscar el archivo CSV
        csv_path = None
        posibles_rutas = [
            os.path.join(BACKEND_DIR, '..', 'data', archivo_csv),
            os.path.join(BACKEND_DIR, '..', 'modelo', archivo_csv),
            os.path.join(BACKEND_DIR, archivo_csv),
            archivo_csv
        ]

        for ruta in posibles_rutas:
            if os.path.exists(ruta):
                csv_path = ruta
                break

        if not csv_path:
            return jsonify({
                'success': False,
                'error': f'Archivo CSV no encontrado: {archivo_csv}'
            }), 404

        # Cargar datos
        df = pd.read_csv(csv_path)
        print(f"[INFO] Datos cargados: {len(df)} registros, {len(df.columns)} columnas")

        if tipo_modelo == 'clasificador':
            # Verificar si necesitamos codificar la entidad
            if 'ENTIDAD_FED' in df.columns and 'ENTIDAD_CODED' not in df.columns:
                le_entidad = LabelEncoder()
                df['ENTIDAD_CODED'] = le_entidad.fit_transform(df['ENTIDAD_FED'])
                models.label_encoder = le_entidad
                print(f"[OK] LabelEncoder creado con {len(le_entidad.classes_)} estados")

            # Verificar target
            if 'NIVEL_RIESGO' in df.columns:
                riesgo_map = {'bajo': 0, 'medio': 1, 'alto': 2, 'critico': 3, 'crítico': 3}
                df['NIVEL_RIESGO_ENCODED'] = df['NIVEL_RIESGO'].str.lower().map(riesgo_map)

            # Preparar datos
            feature_cols = ['TI_LAG_1W', 'TI_LAG_4W', 'SEMANA_DEL_ANIO', 'MES', 'ENTIDAD_CODED']
            feature_cols = [col for col in feature_cols if col in df.columns]

            X = df[feature_cols]
            y = df['NIVEL_RIESGO_ENCODED']

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            print("[ML] Entrenando Random Forest Clasificador...")
            modelo = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42,
                n_jobs=-1
            )
            modelo.fit(X_train, y_train)

            y_pred = modelo.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

            # Guardar modelo
            model_path = os.path.join(BACKEND_DIR, 'model.pkl')
            encoder_path = os.path.join(BACKEND_DIR, 'label_encoder.pkl')
            joblib.dump(modelo, model_path)
            joblib.dump(models.label_encoder, encoder_path)

            # Actualizar modelo en memoria
            models.clasificador = modelo

            print(f"[OK] Modelo clasificador entrenado y guardado")
            print(f"   - Accuracy: {accuracy:.4f}")
            print(f"   - Precision: {precision:.4f}")
            print(f"   - Recall: {recall:.4f}")
            print(f"   - F1-Score: {f1:.4f}")

            return jsonify({
                'success': True,
                'tipo_modelo': 'clasificador',
                'metricas': {
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1)
                },
                'datos': {
                    'total_registros': len(df),
                    'registros_entrenamiento': len(X_train),
                    'registros_prueba': len(X_test),
                    'features': feature_cols
                },
                'archivo_guardado': 'model.pkl',
                'mensaje': 'Modelo clasificador entrenado exitosamente'
            }), 200

        elif tipo_modelo == 'regresor':
            # Verificar si necesitamos codificar la entidad
            if 'ENTIDAD_FED' in df.columns and 'ENTIDAD_CODED' not in df.columns:
                le_entidad = LabelEncoder()
                df['ENTIDAD_CODED'] = le_entidad.fit_transform(df['ENTIDAD_FED'])
                models.label_encoder_reg = le_entidad

            # Preparar datos
            feature_cols = ['TI_LAG_1W', 'TI_LAG_4W', 'SEMANA_DEL_ANIO', 'MES', 'ENTIDAD_CODED']
            feature_cols = [col for col in feature_cols if col in df.columns]

            target_col = 'casos_confirmados' if 'casos_confirmados' in df.columns else 'CASOS_CONFIRMADOS'

            X = df[feature_cols]
            y = df[target_col]

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )

            print("[ML] Entrenando Random Forest Regresor...")
            modelo = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=10,
                random_state=42,
                n_jobs=-1
            )
            modelo.fit(X_train, y_train)

            y_pred = modelo.predict(X_test)
            r2 = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)

            # Guardar modelo
            regressor_path = os.path.join(BACKEND_DIR, 'model_regressor.pkl')
            features_path = os.path.join(BACKEND_DIR, 'regressor_features.pkl')
            encoder_reg_path = os.path.join(BACKEND_DIR, 'label_encoder_regressor.pkl')

            joblib.dump(modelo, regressor_path)
            joblib.dump(feature_cols, features_path)
            if models.label_encoder_reg is not None:
                joblib.dump(models.label_encoder_reg, encoder_reg_path)

            # Actualizar modelos en memoria
            models.regresor = modelo
            models.regressor_features = feature_cols

            print(f"[OK] Modelo regresor entrenado y guardado")
            print(f"   - R2: {r2:.4f}")
            print(f"   - MAE: {mae:.2f}")

            return jsonify({
                'success': True,
                'tipo_modelo': 'regresor',
                'metricas': {
                    'r2_score': float(r2),
                    'mae': float(mae)
                },
                'datos': {
                    'total_registros': len(df),
                    'registros_entrenamiento': len(X_train),
                    'registros_prueba': len(X_test),
                    'features': feature_cols
                },
                'archivo_guardado': 'model_regressor.pkl',
                'mensaje': 'Modelo regresor entrenado exitosamente'
            }), 200

        else:
            return jsonify({
                'success': False,
                'error': 'tipo_modelo debe ser "clasificador" o "regresor"'
            }), 400

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'detalles': traceback.format_exc()
        }), 500


@modelos_bp.route('/info', methods=['GET'])
def get_modelos_info():
    """Obtiene información sobre los modelos cargados y archivos CSV disponibles"""

    modelos_info = {
        'clasificador': {
            'cargado': models.clasificador is not None,
            'archivo': 'model.pkl',
            'existe': os.path.exists(os.path.join(BACKEND_DIR, 'model.pkl')),
            'label_encoder': models.label_encoder is not None,
            'n_features': models.clasificador.n_features_in_ if models.clasificador else 0,
            'n_classes': len(models.label_encoder.classes_) if models.label_encoder else 0
        },
        'regresor': {
            'cargado': models.regresor is not None,
            'archivo': 'model_regressor.pkl',
            'existe': os.path.exists(os.path.join(BACKEND_DIR, 'model_regressor.pkl')),
            'features': models.regressor_features if models.regressor_features else []
        }
    }

    # Buscar archivos CSV disponibles
    archivos_csv = []
    data_dir = os.path.join(BACKEND_DIR, '..', 'data')
    modelo_dir = os.path.join(BACKEND_DIR, '..', 'modelo')

    for directorio, nombre_dir in [(data_dir, 'data'), (modelo_dir, 'modelo')]:
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
                            'columnas': [],
                            'n_columnas': 0,
                            'tamano_mb': round(os.path.getsize(ruta_completa) / (1024 * 1024), 2)
                        })

    return jsonify({
        'success': True,
        'modelos': modelos_info,
        'archivos_csv': archivos_csv
    }), 200
