import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_squared_error, r2_score
from datetime import datetime
import warnings
import json
import base64
import io
import sys
import os
warnings.filterwarnings('ignore')

class PredictorDengue:
    def __init__(self):
        self.modelo_lineal = LinearRegression()
        self.modelo_polinomial = LinearRegression()
        self.caracteristicas_poli = PolynomialFeatures(degree=2)
        
    def cargar_y_preprocesar_datos(self, ruta_archivo):
        """
        Carga y preprocesa los datos del CSV - TU CÓDIGO ORIGINAL
        """
        # Cargar datos
        df = pd.read_csv(ruta_archivo)
        
        # Convertir fecha a datetime
        df['FECHA'] = pd.to_datetime(df['FECHA'], format='%d/%m/%Y')
        
        # Agrupar por fecha y contar casos
        casos_diarios = df.groupby('FECHA').size().reset_index(name='casos_confirmados')
        
        # Ordenar por fecha
        casos_diarios = casos_diarios.sort_values('FECHA').reset_index(drop=True)
        
        # Crear indice temporal (variable X)
        casos_diarios['X'] = range(1, len(casos_diarios) + 1)
        
        print(f"Casos diarios procesados: {len(casos_diarios)}")
        return casos_diarios
    
    def entrenar_modelos(self, df):
        """TU CÓDIGO ORIGINAL (igual)"""
        X = df[['X']].values
        y = df['casos_confirmados'].values
        
        self.modelo_lineal.fit(X, y)
        X_poli = self.caracteristicas_poli.fit_transform(X)
        self.modelo_polinomial.fit(X_poli, y)
        
        df['Prediccion_Lineal'] = self.modelo_lineal.predict(X)
        df['Prediccion_Polinomica'] = self.modelo_polinomial.predict(X_poli)
        
        return df
    
    def evaluar_modelos(self, df):
        """TU CÓDIGO ORIGINAL (adaptado para JSON)"""
        y_real = df['casos_confirmados']
        y_pred_lineal = df['Prediccion_Lineal']
        y_pred_poli = df['Prediccion_Polinomica']
        
        mse_lineal = mean_squared_error(y_real, y_pred_lineal)
        r2_lineal = r2_score(y_real, y_pred_lineal)
        mse_poli = mean_squared_error(y_real, y_pred_poli)
        r2_poli = r2_score(y_real, y_pred_poli)
        
        # Calcular errores absolutos
        df['Error_Lineal'] = abs(y_real - y_pred_lineal)
        df['Error_Polinomica'] = abs(y_real - y_pred_poli)
        
        return {
            'lineal': {
                'mse': float(mse_lineal), 
                'r2': float(r2_lineal),
                'error_promedio': float(df['Error_Lineal'].mean()),
                'error_maximo': float(df['Error_Lineal'].max())
            },
            'polinomial': {
                'mse': float(mse_poli), 
                'r2': float(r2_poli),
                'error_promedio': float(df['Error_Polinomica'].mean()),
                'error_maximo': float(df['Error_Polinomica'].max())
            }
        }
    
    def predecir_futuro(self, ultima_fecha, periodos=90):
        """TU CÓDIGO ORIGINAL (igual)"""
        ultimo_indice = self.datos_entrenamiento['X'].max()
        fechas_futuras = pd.date_range(start=ultima_fecha + pd.Timedelta(days=1), periods=periodos)
        
        df_futuro = pd.DataFrame({
            'FECHA': fechas_futuras,
            'X': range(ultimo_indice + 1, ultimo_indice + periodos + 1)
        })
        
        X_futuro = df_futuro[['X']].values
        df_futuro['Prediccion_Lineal'] = self.modelo_lineal.predict(X_futuro)
        
        X_futuro_poli = self.caracteristicas_poli.transform(X_futuro)
        df_futuro['Prediccion_Polinomica'] = self.modelo_polinomial.predict(X_futuro_poli)
        
        return df_futuro
    
    def graficar_resultados_base64(self, datos_entrenamiento, predicciones_futuras=None):
        """
        TU CÓDIGO ORIGINAL adaptado para generar base64
        """
        plt.figure(figsize=(14, 8))
        
        # Configurar estilo profesional
        plt.style.use('seaborn-v0_8')
        
        # Gráfico de datos reales
        plt.plot(datos_entrenamiento['FECHA'], datos_entrenamiento['casos_confirmados'], 
                'bo-', label='Casos Reales', alpha=0.8, markersize=4, linewidth=1.5)
        
        # Gráfico de predicciones de entrenamiento
        plt.plot(datos_entrenamiento['FECHA'], datos_entrenamiento['Prediccion_Lineal'], 
                'r--', label='Predicción Lineal', alpha=0.8, linewidth=2)
        plt.plot(datos_entrenamiento['FECHA'], datos_entrenamiento['Prediccion_Polinomica'], 
                'g--', label='Predicción Polinomial', alpha=0.8, linewidth=2)
        
        # Gráfico de predicciones futuras
        if predicciones_futuras is not None:
            plt.plot(predicciones_futuras['FECHA'], predicciones_futuras['Prediccion_Lineal'], 
                    'r-', label='Pred. Lineal (Futuro)', alpha=0.6, linewidth=2)
            plt.plot(predicciones_futuras['FECHA'], predicciones_futuras['Prediccion_Polinomica'], 
                    'g-', label='Pred. Polinomial (Futuro)', alpha=0.6, linewidth=2)
            
            # Línea vertical separadora
            max_fecha_entrenamiento = datos_entrenamiento['FECHA'].max()
            plt.axvline(x=max_fecha_entrenamiento, color='gray', linestyle=':', alpha=0.7, linewidth=2)
            plt.text(max_fecha_entrenamiento, plt.ylim()[1]*0.9, 'Inicio Predicción', 
                    rotation=90, ha='right', va='top', fontsize=10, backgroundcolor='white')
        
        # Mejorar el formato
        plt.xlabel('Fecha', fontsize=12, fontweight='bold')
        plt.ylabel('Número de Casos', fontsize=12, fontweight='bold')
        plt.title('Predicción de Casos de Dengue - Regresión Lineal vs Polinomial', 
                 fontsize=14, fontweight='bold', pad=20)
        plt.legend(fontsize=10, framealpha=0.9)
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        # Convertir a base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"
    
    def ejecutar_analisis_completo(self, ruta_archivo, periodos_prediccion=90):
        """
        Ejecuta análisis completo y retorna resultados para el frontend
        """
        try:
            print(f"Iniciando análisis con archivo: {ruta_archivo}")
            
            # 1. Cargar y preprocesar datos
            datos = self.cargar_y_preprocesar_datos(ruta_archivo)
            
            if len(datos) < 10:
                return {
                    'success': False,
                    'error': 'Insuficientes datos para entrenar el modelo (mínimo 10 registros)'
                }
            
            # 2. Entrenar modelos
            self.datos_entrenamiento = self.entrenar_modelos(datos)
            
            # 3. Evaluar modelos
            metricas = self.evaluar_modelos(self.datos_entrenamiento)
            
            # 4. Generar predicciones futuras
            ultima_fecha = self.datos_entrenamiento['FECHA'].max()
            predicciones_futuras = self.predecir_futuro(ultima_fecha, periodos_prediccion)
            
            # 5. Generar gráfica
            grafica_base64 = self.graficar_resultados_base64(self.datos_entrenamiento, predicciones_futuras)
            
            # 6. Preparar respuesta para frontend
            respuesta = {
                'success': True,
                'metricas': metricas,
                'grafica': grafica_base64,
                'tabla_comparativa': self.datos_entrenamiento.head(15).to_dict('records'),
                'predicciones_futuras': predicciones_futuras.head(30).to_dict('records'),
                'resumen': {
                    'total_dias_entrenamiento': len(self.datos_entrenamiento),
                    'total_dias_prediccion': len(predicciones_futuras),
                    'mejor_modelo': 'polinomial' if metricas['polinomial']['r2'] > metricas['lineal']['r2'] else 'lineal',
                    'precision_mejor_modelo': max(metricas['lineal']['r2'], metricas['polinomial']['r2'])
                }
            }
            
            print("Análisis completado exitosamente")
            return respuesta
            
        except Exception as e:
            print(f"Error en análisis: {str(e)}")
            return {
                'success': False,
                'error': f"Error procesando el archivo: {str(e)}"
            }

def ejecutar_prediccion_desde_csv(ruta_archivo, periodos=90):
    predictor = PredictorDengue()
    resultado = predictor.ejecutar_analisis_completo(ruta_archivo, periodos)
    return resultado

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Modo API: recibir parámetros desde Node.js
        ruta_archivo = sys.argv[1]
        periodos = int(sys.argv[2]) if len(sys.argv) > 2 else 90
        
        resultado = ejecutar_prediccion_desde_csv(ruta_archivo, periodos)
        print(json.dumps(resultado, default=str))
    else:
        # Modo standalone (para pruebas)
        print("Modo API - Esperando parámetros...")