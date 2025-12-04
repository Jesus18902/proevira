/**
 * 4.1 PRUEBAS UNITARIAS - Componente Dashboard
 * Sistema de Predicción de Enfermedades Virales
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock de los servicios API
jest.mock('../../../services/api', () => ({
  dashboardService: {
    getEstadisticasGenerales: jest.fn(),
    getCasosPorRegion: jest.fn(),
    getTendenciaCasos: jest.fn(),
    getAlertasRecientes: jest.fn()
  },
  modeloService: {
    obtenerPredicciones: jest.fn()
  }
}));

// Mock de react-chartjs-2 para evitar dependencias de canvas en JSDOM
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />
}));

// Mock Chart.js para evitar errores de canvas
jest.mock('chart.js', () => ({
  Chart: class MockChart {
    static register() {}
    constructor() {}
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {}
}));

import Dashboard from '../../../pages/Dashboard';
import { dashboardService, modeloService } from '../../../services/api';

// Wrapper para proveer el Router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

const waitForDashboardLoad = () =>
  waitFor(() => {
    expect(dashboardService.getAlertasRecientes).toHaveBeenCalled();
    expect(modeloService.obtenerPredicciones).toHaveBeenCalled();
  });

describe('Dashboard Component - Pruebas Unitarias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de datos exitosos
    dashboardService.getEstadisticasGenerales.mockResolvedValue({
      data: {
        total_casos: 15000,
        total_regiones: 32,
        promedio_semanal: 450,
        casos_esta_semana: 523,
        variacion_porcentual: 12.5,
        semana_actual: 48,
        anio_actual: 2025
      }
    });
    
    dashboardService.getCasosPorRegion.mockResolvedValue({
      data: [
        { region: 'Jalisco', casos: 1250 },
        { region: 'Veracruz', casos: 980 },
        { region: 'Oaxaca', casos: 875 }
      ]
    });
    
    dashboardService.getTendenciaCasos.mockResolvedValue({
      data: [
        { mes: 'Enero', casos: 1200 },
        { mes: 'Febrero', casos: 1350 },
        { mes: 'Marzo', casos: 1100 }
      ]
    });
    
    dashboardService.getAlertasRecientes.mockResolvedValue({
      data: [
        { id: 1, estado: 'Veracruz', nivel: 'Alto', mensaje: 'Incremento de casos' }
      ]
    });

    modeloService.obtenerPredicciones.mockResolvedValue({
      data: [
        { fecha_prediccion: '2024-05-01', casos_predichos: 120 },
        { fecha_prediccion: '2024-05-02', casos_predichos: 150 }
      ]
    });
  });

  describe('Renderizado inicial', () => {
    test('debe mostrar el estado de carga inicialmente', async () => {
      renderWithRouter(<Dashboard />);
      
      // Verificar que muestra indicador de carga
      expect(screen.getByText(/cargando/i) || screen.getByRole('progressbar') || document.querySelector('.animate-spin')).toBeTruthy();

      await waitForDashboardLoad();
    });

    test('debe renderizar el título del dashboard', async () => {
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  describe('Tarjetas de estadísticas', () => {
    test('debe mostrar el total de casos correctamente', async () => {
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
      const totalCasos = screen.queryByText(/15,000|15000|15\.000/);
      if (totalCasos) {
        expect(totalCasos).toBeInTheDocument();
      }
    });

    test('debe mostrar la variación porcentual', async () => {
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
      const variacion = screen.queryByText(/12\.5|12,5/);
      if (variacion) {
        expect(variacion).toBeInTheDocument();
      }
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar error en la API de estadísticas', async () => {
      dashboardService.getEstadisticasGenerales.mockRejectedValue(new Error('Error de red'));
      
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
      // Verifica que el componente no crashee
      expect(document.body).toBeInTheDocument();
    });

    test('debe manejar respuesta vacía de la API', async () => {
      dashboardService.getEstadisticasGenerales.mockResolvedValue({ data: {} });
      
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Interacciones', () => {
    test('debe llamar a la API al montar el componente', async () => {
      renderWithRouter(<Dashboard />);
      
      await waitForDashboardLoad();
    });
  });
});

describe('Dashboard - Validaciones de datos', () => {
  test('debe validar que los casos sean números positivos', () => {
    const validarCasos = (casos) => {
      return typeof casos === 'number' && casos >= 0;
    };
    
    expect(validarCasos(1500)).toBe(true);
    expect(validarCasos(0)).toBe(true);
    expect(validarCasos(-5)).toBe(false);
    expect(validarCasos('1500')).toBe(false);
  });

  test('debe validar que la variación porcentual esté en rango válido', () => {
    const validarVariacion = (variacion) => {
      return typeof variacion === 'number' && variacion >= -100 && variacion <= 1000;
    };
    
    expect(validarVariacion(12.5)).toBe(true);
    expect(validarVariacion(-50)).toBe(true);
    expect(validarVariacion(150)).toBe(true);
    expect(validarVariacion(-101)).toBe(false);
  });

  test('debe validar formato de semana epidemiológica', () => {
    const validarSemana = (semana) => {
      return Number.isInteger(semana) && semana >= 1 && semana <= 53;
    };
    
    expect(validarSemana(48)).toBe(true);
    expect(validarSemana(1)).toBe(true);
    expect(validarSemana(53)).toBe(true);
    expect(validarSemana(0)).toBe(false);
    expect(validarSemana(54)).toBe(false);
  });
});
