# notebook/03_Linear_vs_Polynomial.py
# Entrenamiento: Regresion Lineal vs Polinomial
# Extrae datos de MySQL, crea features, entrena y guarda modelos
# Uso: python notebook/03_Linear_vs_Polynomial.py

import os, sys
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# --- RUTA ---
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, BACKEND_DIR)

try:
    from config import DB_CONFIG, ESTADO_POR_ID
except ImportError:
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'proyecto_integrador'
    }
    ESTADO_POR_ID = {}

# -----------------------------------------------------------
# 1. Extraer datos de MySQL
# -----------------------------------------------------------
print("=" * 60)
print("Entrenamiento: Regresion Lineal vs Polinomial")
print("=" * 60)

import mysql.connector

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT d.id_region, d.casos_confirmados, d.tasa_incidencia,
               WEEK(d.fecha_fin_semana, 3) as semana_epidemiologica,
               d.fecha_fin_semana,
               r.nombre as estado
        FROM dato_epidemiologico d
        JOIN region r ON d.id_region = r.id_region
        ORDER BY d.id_region, d.fecha_fin_semana
    """)
    rows = cursor.fetchall()
    conn.close()
    
    df = pd.DataFrame(rows)
    print(f"\n[OK] Datos cargados: {len(df)} registros, "
          f"{df['id_region'].nunique()} regiones")
    print(f"    Rango: {df['fecha_fin_semana'].min()} a {df['fecha_fin_semana'].max()}")
    
except Exception as e:
    print(f"[ERROR] Conexion MySQL: {e}")
    print("[INFO] Intentando cargar desde CSV local...")
    
    csv_path = os.path.join(BACKEND_DIR, '..', 'modelo', 'datos_dengue.csv')
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        print(f"[OK] CSV cargado: {len(df)} registros")
    else:
        print("[FATAL] No hay datos disponibles")
        sys.exit(1)

# -----------------------------------------------------------
# 2. Feature Engineering
# -----------------------------------------------------------
print("\n--- Feature Engineering ---")

# Label encode estado
le = LabelEncoder()
if 'estado' in df.columns:
    df['estado_coded'] = le.fit_transform(df['estado'])
elif 'ENTIDAD_FED' in df.columns:
    df['estado_coded'] = le.fit_transform(df['ENTIDAD_FED'])
else:
    df['estado_coded'] = 0
    le.fit(['Desconocido'])

print(f"  Estados codificados: {len(le.classes_)}")

# Crear lag features por estado
group_col = 'id_region' if 'id_region' in df.columns else None
col_casos = next((c for c in ['casos_confirmados', 'CASOS_CONFIRMADOS'] if c in df.columns), None)
col_ti = next((c for c in ['tasa_incidencia', 'TASA_INCIDENCIA'] if c in df.columns), None)

if col_casos is None:
    print("[FATAL] No se encuentra columna de casos")
    sys.exit(1)

if group_col:
    for lag in [1, 2, 3, 4]:
        df[f'casos_lag_{lag}w'] = df.groupby(group_col)[col_casos].shift(lag)
    if col_ti:
        for lag in [1, 2]:
            df[f'ti_lag_{lag}w'] = df.groupby(group_col)[col_ti].shift(lag)
    else:
        df['ti_lag_1w'] = 0
        df['ti_lag_2w'] = 0
    df['casos_promedio_4w'] = df.groupby(group_col)[col_casos].transform(
        lambda x: x.rolling(4, min_periods=1).mean().shift(1))
else:
    for lag in [1, 2, 3, 4]:
        df[f'casos_lag_{lag}w'] = df[col_casos].shift(lag)
    if col_ti:
        for lag in [1, 2]:
            df[f'ti_lag_{lag}w'] = df[col_ti].shift(lag)
    else:
        df['ti_lag_1w'] = 0
        df['ti_lag_2w'] = 0
    df['casos_promedio_4w'] = df[col_casos].rolling(4, min_periods=1).mean().shift(1)

df['tendencia_4w'] = df['casos_lag_1w'] - df['casos_lag_4w']

# Semana y mes
if 'semana_epidemiologica' in df.columns:
    df['semana_anio'] = df['semana_epidemiologica']
elif 'fecha_fin_semana' in df.columns:
    df['fecha_fin_semana'] = pd.to_datetime(df['fecha_fin_semana'])
    df['semana_anio'] = df['fecha_fin_semana'].dt.isocalendar().week.astype(int)
else:
    df['semana_anio'] = 1

if 'fecha_fin_semana' in df.columns:
    df['fecha_fin_semana'] = pd.to_datetime(df['fecha_fin_semana'])
    df['mes'] = df['fecha_fin_semana'].dt.month
else:
    df['mes'] = 1

# Features finales
feature_cols = [
    'casos_lag_1w', 'casos_lag_2w', 'casos_lag_3w', 'casos_lag_4w',
    'ti_lag_1w', 'ti_lag_2w',
    'casos_promedio_4w', 'tendencia_4w',
    'semana_anio', 'mes', 'estado_coded'
]

# Limpiar NaNs
df = df.dropna(subset=feature_cols + [col_casos])
print(f"  Registros con features completas: {len(df)}")

X = df[feature_cols]
y = df[col_casos]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

# -----------------------------------------------------------
# 3. Regresion Lineal
# -----------------------------------------------------------
print("\n--- Regresion Lineal ---")
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

print(f"  R2 (test):  {r2_lin:.4f}")
print(f"  R2 (CV-5):  {cv_lin.mean():.4f} (+/- {cv_lin.std():.4f})")
print(f"  MAE:        {mae_lin:.2f}")
print(f"  RMSE:       {rmse_lin:.2f}")

metricas_lineal = {
    'r2': round(float(r2_lin), 4),
    'r2_cv': round(float(cv_lin.mean()), 4),
    'mae': round(float(mae_lin), 2),
    'rmse': round(rmse_lin, 2)
}

# -----------------------------------------------------------
# 4. Regresion Polinomial (grados 2-5)
# -----------------------------------------------------------
print("\n--- Regresion Polinomial (grados 2-5) ---")
mejor_grado = 2
mejor_r2_cv = -np.inf
resultados_grados = {}

for grado in range(2, 6):
    try:
        pipe = Pipeline([
            ('poly', PolynomialFeatures(degree=grado, include_bias=False)),
            ('scaler', StandardScaler()),
            ('regressor', LinearRegression())
        ])
        
        cv_scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring='r2')
        r2_cv = float(cv_scores.mean())
        
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        r2_t = float(r2_score(y_test, y_pred))
        mae_t = float(mean_absolute_error(y_test, y_pred))
        n_feat = pipe.named_steps['poly'].n_output_features_
        
        resultados_grados[grado] = {
            'r2_test': round(r2_t, 4),
            'r2_cv': round(r2_cv, 4),
            'mae': round(mae_t, 2),
            'n_features': n_feat
        }
        
        marcador = " <-- MEJOR" if r2_cv > mejor_r2_cv else ""
        print(f"  Grado {grado}: R2_test={r2_t:.4f}, R2_CV={r2_cv:.4f}, "
              f"MAE={mae_t:.2f}, features={n_feat}{marcador}")
        
        if r2_cv > mejor_r2_cv:
            mejor_r2_cv = r2_cv
            mejor_grado = grado
    except Exception as e:
        print(f"  Grado {grado}: ERROR - {e}")

print(f"\n  [OK] Mejor grado: {mejor_grado} (R2_CV={mejor_r2_cv:.4f})")

# Entrenar modelo final
pipe_poly = Pipeline([
    ('poly', PolynomialFeatures(degree=mejor_grado, include_bias=False)),
    ('scaler', StandardScaler()),
    ('regressor', LinearRegression())
])
pipe_poly.fit(X_train, y_train)

y_pred_poly = pipe_poly.predict(X_test)
r2_poly = float(r2_score(y_test, y_pred_poly))
mae_poly = float(mean_absolute_error(y_test, y_pred_poly))
rmse_poly = float(np.sqrt(mean_squared_error(y_test, y_pred_poly)))
cv_poly = cross_val_score(pipe_poly, X, y, cv=5, scoring='r2')

print(f"\n  R2 (test):  {r2_poly:.4f}")
print(f"  R2 (CV-5):  {cv_poly.mean():.4f} (+/- {cv_poly.std():.4f})")
print(f"  MAE:        {mae_poly:.2f}")
print(f"  RMSE:       {rmse_poly:.2f}")

metricas_polinomial = {
    'r2': round(r2_poly, 4),
    'r2_cv': round(float(cv_poly.mean()), 4),
    'mae': round(mae_poly, 2),
    'rmse': round(rmse_poly, 2),
    'grado': mejor_grado
}

# -----------------------------------------------------------
# 5. Comparativa Final
# -----------------------------------------------------------
print("\n" + "=" * 60)
print("COMPARATIVA FINAL")
print("=" * 60)
print(f"{'Metrica':<20} {'Lineal':>10} {'Polinomial':>12}")
print("-" * 42)
print(f"{'R2 (test)':<20} {r2_lin:>10.4f} {r2_poly:>12.4f}")
print(f"{'R2 (CV-5)':<20} {cv_lin.mean():>10.4f} {cv_poly.mean():>12.4f}")
print(f"{'MAE':<20} {mae_lin:>10.2f} {mae_poly:>12.2f}")
print(f"{'RMSE':<20} {rmse_lin:>10.2f} {rmse_poly:>12.2f}")
print("-" * 42)

mejor = 'polinomial' if cv_poly.mean() >= cv_lin.mean() else 'lineal'
mejor_r2 = max(r2_lin, r2_poly)
print(f"\nMejor modelo: {mejor.upper()} (R2={mejor_r2:.4f})")

if mejor_r2 >= 0.85:
    print(f"[OK] Objetivo R2 >= 0.85 ALCANZADO ({mejor_r2:.4f})")
else:
    print(f"[WARN] R2={mejor_r2:.4f} < 0.85 - considere mas datos o features")

# -----------------------------------------------------------
# 6. Guardar modelos
# -----------------------------------------------------------
print("\n--- Guardando modelos ---")

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

metricas_all = {
    'lineal': metricas_lineal,
    'polinomial': metricas_polinomial,
    'poly_degree': mejor_grado
}

for name, obj in [
    ('model_lineal.pkl', pipe_lineal),
    ('model_polinomial.pkl', pipe_poly),
    ('label_encoder.pkl', le),
    ('model_features.pkl', feature_cols),
    ('model_metricas.pkl', metricas_all),
    ('model_umbrales.pkl', umbrales)
]:
    path = os.path.join(BACKEND_DIR, name)
    joblib.dump(obj, path)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [OK] {name} ({size_kb:.1f} KB)")

print(f"\nModelos guardados en: {BACKEND_DIR}")
print("Reinicie el servidor Flask para cargarlos.\n")
