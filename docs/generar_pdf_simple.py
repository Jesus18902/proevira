# generar_pdf_simple.py
# Script simple para generar el PDF del manual usando reportlab

import os
import sys

def main():
    # Instalar reportlab si no está
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        print("Instalando reportlab...")
        os.system(f"{sys.executable} -m pip install reportlab")
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

    # Rutas
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(script_dir, "MANUAL_INSTALACION_ProeVira.pdf")

    print("=" * 50)
    print("   GENERADOR DE PDF - Manual de Instalación")
    print("   ProeVira v2.0")
    print("=" * 50)
    print()

    # Crear documento
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    # Estilos
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    styles.add(ParagraphStyle(
        name='TituloPortada',
        parent=styles['Title'],
        fontSize=36,
        textColor=colors.HexColor('#1e40af'),
        alignment=TA_CENTER,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='SubtituloPortada',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#3b82f6'),
        alignment=TA_CENTER,
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='H1',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=20,
        spaceAfter=10,
        borderPadding=5
    ))
    
    styles.add(ParagraphStyle(
        name='H2',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=15,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='H3',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=colors.HexColor('#1d4ed8'),
        spaceBefore=12,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='Codigo',
        parent=styles['Code'],
        fontSize=9,
        backColor=colors.HexColor('#1e293b'),
        textColor=colors.white,
        leftIndent=10,
        rightIndent=10,
        spaceBefore=5,
        spaceAfter=5
    ))
    
    styles.add(ParagraphStyle(
        name='Normal2',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6
    ))

    # Contenido del documento
    story = []

    # === PORTADA ===
    story.append(Spacer(1, 5*cm))
    story.append(Paragraph("ProeVira", styles['TituloPortada']))
    story.append(Paragraph("Manual de Instalación", styles['SubtituloPortada']))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("Sistema de Predicción de Enfermedades Virales", styles['Normal']))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("Versión 2.0 - Diciembre 2025", styles['Normal']))
    story.append(PageBreak())

    # === ÍNDICE ===
    story.append(Paragraph("Índice", styles['H1']))
    indice = [
        "1. Requisitos del Sistema",
        "2. Instalación de Prerrequisitos",
        "3. Configuración de Base de Datos",
        "4. Instalación del Backend (Flask/Python)",
        "5. Instalación del Frontend (React)",
        "6. Carga de Datos Epidemiológicos",
        "7. Ejecución del Sistema",
        "8. Verificación de la Instalación",
        "9. Solución de Problemas Comunes"
    ]
    for item in indice:
        story.append(Paragraph(f"• {item}", styles['Normal2']))
    story.append(PageBreak())

    # === SECCIÓN 1: REQUISITOS ===
    story.append(Paragraph("1. Requisitos del Sistema", styles['H1']))
    
    story.append(Paragraph("1.1 Hardware Mínimo", styles['H2']))
    data_hw = [
        ['Componente', 'Requisito Mínimo', 'Recomendado'],
        ['Procesador', 'Intel Core i3 / AMD Ryzen 3', 'Intel Core i5 / AMD Ryzen 5'],
        ['Memoria RAM', '4 GB', '8 GB'],
        ['Espacio en Disco', '2 GB', '5 GB'],
        ['Conexión a Internet', 'Requerida', 'Requerida']
    ]
    t = Table(data_hw, colWidths=[5*cm, 5*cm, 5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0'))
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("1.2 Software Requerido", styles['H2']))
    data_sw = [
        ['Software', 'Versión Mínima', 'Descarga'],
        ['Node.js', '18.x o superior', 'https://nodejs.org/'],
        ['Python', '3.10 o superior', 'https://python.org/'],
        ['MySQL Server', '8.0 o superior', 'https://dev.mysql.com/downloads/'],
        ['Git', '2.40 o superior', 'https://git-scm.com/']
    ]
    t2 = Table(data_sw, colWidths=[4*cm, 4*cm, 7*cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0'))
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("1.3 Sistema Operativo Compatible", styles['H2']))
    story.append(Paragraph("• Windows 10/11", styles['Normal2']))
    story.append(Paragraph("• macOS 12 o superior", styles['Normal2']))
    story.append(Paragraph("• Linux (Ubuntu 20.04+, Debian 11+)", styles['Normal2']))

    # === SECCIÓN 2: PRERREQUISITOS ===
    story.append(Paragraph("2. Instalación de Prerrequisitos", styles['H1']))
    
    story.append(Paragraph("2.1 Instalación de Node.js (Windows)", styles['H2']))
    story.append(Paragraph("1. Descargar el instalador desde: https://nodejs.org/", styles['Normal2']))
    story.append(Paragraph("2. Ejecutar el instalador y seguir el asistente", styles['Normal2']))
    story.append(Paragraph("3. Verificar la instalación:", styles['Normal2']))
    story.append(Paragraph("node --version", styles['Codigo']))
    story.append(Paragraph("npm --version", styles['Codigo']))

    story.append(Paragraph("2.2 Instalación de Python (Windows)", styles['H2']))
    story.append(Paragraph("1. Descargar Python desde: https://python.org/downloads/", styles['Normal2']))
    story.append(Paragraph("2. IMPORTANTE: Marcar la opción 'Add Python to PATH' durante la instalación", styles['Normal2']))
    story.append(Paragraph("3. Verificar la instalación:", styles['Normal2']))
    story.append(Paragraph("python --version", styles['Codigo']))
    story.append(Paragraph("pip --version", styles['Codigo']))

    story.append(Paragraph("2.3 Instalación de MySQL Server", styles['H2']))
    story.append(Paragraph("1. Descargar MySQL Community Server desde: https://dev.mysql.com/downloads/mysql/", styles['Normal2']))
    story.append(Paragraph("2. Durante la instalación:", styles['Normal2']))
    story.append(Paragraph("   - Seleccionar 'Server only' o 'Full'", styles['Normal2']))
    story.append(Paragraph("   - Configurar la contraseña del usuario root", styles['Normal2']))
    story.append(Paragraph("   - ANOTAR la contraseña configurada (la necesitará después)", styles['Normal2']))

    # === SECCIÓN 3: BASE DE DATOS ===
    story.append(Paragraph("3. Configuración de Base de Datos", styles['H1']))
    
    story.append(Paragraph("3.1 Clonar el Repositorio", styles['H2']))
    story.append(Paragraph("git clone https://github.com/SergioPorrasA/ProeVira.git", styles['Codigo']))
    story.append(Paragraph("cd ProeVira", styles['Codigo']))

    story.append(Paragraph("3.2 Crear la Base de Datos", styles['H2']))
    story.append(Paragraph("Opción A: Usando MySQL Workbench", styles['H3']))
    story.append(Paragraph("1. Abrir MySQL Workbench", styles['Normal2']))
    story.append(Paragraph("2. Conectarse al servidor local", styles['Normal2']))
    story.append(Paragraph("3. Abrir el archivo database_schema.sql", styles['Normal2']))
    story.append(Paragraph("4. Ejecutar el script completo (Ctrl+Shift+Enter)", styles['Normal2']))
    
    story.append(Paragraph("Opción B: Usando línea de comandos", styles['H3']))
    story.append(Paragraph("mysql -u root -p", styles['Codigo']))
    story.append(Paragraph("source C:/ruta/al/proyecto/ProeVira/database_schema.sql", styles['Codigo']))

    # === SECCIÓN 4: BACKEND ===
    story.append(Paragraph("4. Instalación del Backend (Flask/Python)", styles['H1']))
    
    story.append(Paragraph("4.1 Navegar al Directorio del Backend", styles['H2']))
    story.append(Paragraph("cd backend", styles['Codigo']))

    story.append(Paragraph("4.2 Crear Entorno Virtual (Recomendado)", styles['H2']))
    story.append(Paragraph("python -m venv venv", styles['Codigo']))
    story.append(Paragraph("venv\\Scripts\\activate  # Windows", styles['Codigo']))

    story.append(Paragraph("4.3 Instalar Dependencias de Python", styles['H2']))
    story.append(Paragraph("pip install -r requirements.txt", styles['Codigo']))

    story.append(Paragraph("4.4 Configurar Variables de Entorno", styles['H2']))
    story.append(Paragraph("1. Copiar el archivo de ejemplo:", styles['Normal2']))
    story.append(Paragraph("copy .env.example .env", styles['Codigo']))
    story.append(Paragraph("2. Editar el archivo .env con sus credenciales de MySQL:", styles['Normal2']))
    story.append(Paragraph("DB_HOST=127.0.0.1", styles['Codigo']))
    story.append(Paragraph("DB_USER=root", styles['Codigo']))
    story.append(Paragraph("DB_PASSWORD=TU_CONTRASEÑA_MYSQL", styles['Codigo']))
    story.append(Paragraph("DB_NAME=proyecto_integrador", styles['Codigo']))

    # === SECCIÓN 5: FRONTEND ===
    story.append(Paragraph("5. Instalación del Frontend (React)", styles['H1']))
    
    story.append(Paragraph("5.1 Navegar al Directorio del Frontend", styles['H2']))
    story.append(Paragraph("cd sistema-prediccion-enfermedades", styles['Codigo']))

    story.append(Paragraph("5.2 Instalar Dependencias de Node.js", styles['H2']))
    story.append(Paragraph("npm install", styles['Codigo']))
    story.append(Paragraph("Tiempo estimado: 2-5 minutos dependiendo de la conexión.", styles['Normal2']))

    # === SECCIÓN 6: DATOS ===
    story.append(Paragraph("6. Carga de Datos Epidemiológicos", styles['H1']))
    
    story.append(Paragraph("6.1 Datos Incluidos", styles['H2']))
    story.append(Paragraph("El proyecto incluye datos históricos de dengue (2020-2025) en la carpeta data/:", styles['Normal2']))
    story.append(Paragraph("• dengue_2020.csv", styles['Normal2']))
    story.append(Paragraph("• dengue_2021.csv", styles['Normal2']))
    story.append(Paragraph("• dengue_2022.csv", styles['Normal2']))
    story.append(Paragraph("• dengue_2023.csv", styles['Normal2']))
    story.append(Paragraph("• dengue_2024.csv", styles['Normal2']))
    story.append(Paragraph("• dengue_2025.csv", styles['Normal2']))

    story.append(Paragraph("6.2 Cargar Datos usando ETL_LOADER", styles['H2']))
    story.append(Paragraph("cd backend", styles['Codigo']))
    story.append(Paragraph("python ETL_LOADER.py", styles['Codigo']))

    # === SECCIÓN 7: EJECUCIÓN ===
    story.append(Paragraph("7. Ejecución del Sistema", styles['H1']))
    
    story.append(Paragraph("7.1 Iniciar el Backend (Terminal 1)", styles['H2']))
    story.append(Paragraph("cd backend", styles['Codigo']))
    story.append(Paragraph("venv\\Scripts\\activate", styles['Codigo']))
    story.append(Paragraph("python app.py", styles['Codigo']))
    story.append(Paragraph("El servidor inicia en: http://localhost:5001", styles['Normal2']))

    story.append(Paragraph("7.2 Iniciar el Frontend (Terminal 2)", styles['H2']))
    story.append(Paragraph("cd sistema-prediccion-enfermedades", styles['Codigo']))
    story.append(Paragraph("npm start", styles['Codigo']))
    story.append(Paragraph("La aplicación abre en: http://localhost:3000", styles['Normal2']))

    # === SECCIÓN 8: VERIFICACIÓN ===
    story.append(Paragraph("8. Verificación de la Instalación", styles['H1']))
    
    story.append(Paragraph("8.1 Verificar Backend API", styles['H2']))
    story.append(Paragraph("Abrir en navegador: http://localhost:5001/api/health", styles['Normal2']))
    story.append(Paragraph("Debe mostrar: status: healthy, database: connected", styles['Normal2']))

    story.append(Paragraph("8.2 Verificar Frontend", styles['H2']))
    story.append(Paragraph("1. Abrir http://localhost:3000", styles['Normal2']))
    story.append(Paragraph("2. Debe mostrar la pantalla de Login", styles['Normal2']))
    story.append(Paragraph("3. Navegar por las diferentes secciones", styles['Normal2']))

    # === SECCIÓN 9: PROBLEMAS ===
    story.append(Paragraph("9. Solución de Problemas Comunes", styles['H1']))
    
    story.append(Paragraph("9.1 Error: 'Pool exhausted'", styles['H2']))
    story.append(Paragraph("Solución: Editar backend/.env y aumentar DB_POOL_SIZE=20", styles['Normal2']))

    story.append(Paragraph("9.2 Error: 'ECONNREFUSED' en Frontend", styles['H2']))
    story.append(Paragraph("Solución: Verificar que el backend esté corriendo en puerto 5001", styles['Normal2']))

    story.append(Paragraph("9.3 Error: 'Module not found'", styles['H2']))
    story.append(Paragraph("Solución: Activar entorno virtual y reinstalar dependencias:", styles['Normal2']))
    story.append(Paragraph("pip install -r requirements.txt", styles['Codigo']))

    story.append(Paragraph("9.4 Error: 'Access denied' en MySQL", styles['H2']))
    story.append(Paragraph("Solución: Verificar credenciales en .env", styles['Normal2']))

    # === RESUMEN DE COMANDOS ===
    story.append(PageBreak())
    story.append(Paragraph("Resumen de Comandos", styles['H1']))
    story.append(Paragraph("# 1. Clonar repositorio", styles['Codigo']))
    story.append(Paragraph("git clone https://github.com/SergioPorrasA/ProeVira.git", styles['Codigo']))
    story.append(Paragraph("cd ProeVira", styles['Codigo']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("# 2. Crear base de datos (en MySQL)", styles['Codigo']))
    story.append(Paragraph("mysql -u root -p < database_schema.sql", styles['Codigo']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("# 3. Configurar Backend", styles['Codigo']))
    story.append(Paragraph("cd backend", styles['Codigo']))
    story.append(Paragraph("python -m venv venv", styles['Codigo']))
    story.append(Paragraph("venv\\Scripts\\activate", styles['Codigo']))
    story.append(Paragraph("pip install -r requirements.txt", styles['Codigo']))
    story.append(Paragraph("copy .env.example .env", styles['Codigo']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("# 4. Cargar datos", styles['Codigo']))
    story.append(Paragraph("python ETL_LOADER.py", styles['Codigo']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("# 5. Configurar Frontend", styles['Codigo']))
    story.append(Paragraph("cd ../sistema-prediccion-enfermedades", styles['Codigo']))
    story.append(Paragraph("npm install", styles['Codigo']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("# 6. Ejecutar (2 terminales)", styles['Codigo']))
    story.append(Paragraph("# Terminal 1: python app.py", styles['Codigo']))
    story.append(Paragraph("# Terminal 2: npm start", styles['Codigo']))

    # === PIE DE PÁGINA ===
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("© 2025 ProeVira - Sistema de Predicción de Enfermedades Virales", 
                          ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.gray)))

    # Generar PDF
    print("Generando PDF...")
    doc.build(story)
    
    print(f"\n✅ PDF generado exitosamente!")
    print(f"📁 Ubicación: {pdf_path}")
    
    # Tamaño del archivo
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"📊 Tamaño: {size_kb:.1f} KB")
    
    return pdf_path


if __name__ == "__main__":
    main()
