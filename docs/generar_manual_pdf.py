# generar_manual_pdf.py
# Script para convertir el manual de instalación de Markdown a PDF

import os
import sys
from datetime import datetime

def instalar_dependencias():
    """Instala las dependencias necesarias"""
    try:
        import markdown
        from weasyprint import HTML
    except ImportError:
        print("Instalando dependencias necesarias...")
        os.system(f"{sys.executable} -m pip install markdown weasyprint")
        print("Dependencias instaladas. Ejecute el script nuevamente.")
        sys.exit(0)

def generar_pdf():
    """Genera el PDF del manual de instalación"""
    import markdown
    from weasyprint import HTML, CSS

    # Rutas
    script_dir = os.path.dirname(os.path.abspath(__file__))
    md_path = os.path.join(script_dir, "MANUAL_INSTALACION.md")
    pdf_path = os.path.join(script_dir, "MANUAL_INSTALACION_ProeVira.pdf")

    # Verificar que existe el archivo MD
    if not os.path.exists(md_path):
        print(f"❌ Error: No se encontró {md_path}")
        return False

    # Leer el contenido Markdown
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convertir Markdown a HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc', 'codehilite']
    )

    # CSS para el PDF
    css_styles = """
    @page {
        size: A4;
        margin: 2cm;
        @top-center {
            content: "Manual de Instalación - ProeVira";
            font-size: 10px;
            color: #666;
        }
        @bottom-center {
            content: "Página " counter(page) " de " counter(pages);
            font-size: 10px;
            color: #666;
        }
    }

    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
    }

    h1 {
        color: #1e40af;
        font-size: 24pt;
        border-bottom: 3px solid #1e40af;
        padding-bottom: 10px;
        margin-top: 30px;
        page-break-after: avoid;
    }

    h2 {
        color: #1e3a8a;
        font-size: 18pt;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 5px;
        margin-top: 25px;
        page-break-after: avoid;
    }

    h3 {
        color: #1d4ed8;
        font-size: 14pt;
        margin-top: 20px;
        page-break-after: avoid;
    }

    h4 {
        color: #2563eb;
        font-size: 12pt;
        margin-top: 15px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 10pt;
    }

    th {
        background-color: #1e40af;
        color: white;
        padding: 10px;
        text-align: left;
        font-weight: bold;
    }

    td {
        padding: 8px 10px;
        border: 1px solid #ddd;
    }

    tr:nth-child(even) {
        background-color: #f8fafc;
    }

    tr:hover {
        background-color: #e0f2fe;
    }

    code {
        background-color: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 10pt;
        color: #0f172a;
    }

    pre {
        background-color: #1e293b;
        color: #e2e8f0;
        padding: 15px;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 9pt;
        line-height: 1.4;
        margin: 15px 0;
    }

    pre code {
        background-color: transparent;
        color: inherit;
        padding: 0;
    }

    blockquote {
        border-left: 4px solid #3b82f6;
        margin: 15px 0;
        padding: 10px 20px;
        background-color: #eff6ff;
        color: #1e40af;
    }

    ul, ol {
        margin: 10px 0;
        padding-left: 25px;
    }

    li {
        margin: 5px 0;
    }

    a {
        color: #2563eb;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    hr {
        border: none;
        border-top: 2px solid #e2e8f0;
        margin: 30px 0;
    }

    .warning {
        background-color: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 10px 15px;
        margin: 15px 0;
    }

    .info {
        background-color: #dbeafe;
        border-left: 4px solid #3b82f6;
        padding: 10px 15px;
        margin: 15px 0;
    }

    .success {
        background-color: #d1fae5;
        border-left: 4px solid #10b981;
        padding: 10px 15px;
        margin: 15px 0;
    }

    /* Portada */
    .cover {
        text-align: center;
        padding: 100px 0;
    }

    /* Evitar cortes de página en medio de secciones */
    h1, h2, h3, h4 {
        page-break-after: avoid;
    }

    pre, table, blockquote {
        page-break-inside: avoid;
    }
    """

    # HTML completo con portada
    full_html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Manual de Instalación - ProeVira</title>
    </head>
    <body>
        <div class="cover">
            <h1 style="font-size: 36pt; border: none;">📘 ProeVira</h1>
            <h2 style="font-size: 24pt; border: none; color: #3b82f6;">Manual de Instalación</h2>
            <p style="font-size: 14pt; color: #64748b;">Sistema de Predicción de Enfermedades Virales</p>
            <p style="font-size: 12pt; color: #64748b; margin-top: 50px;">Versión 2.0</p>
            <p style="font-size: 12pt; color: #64748b;">Diciembre 2025</p>
        </div>

        <div style="page-break-before: always;"></div>

        {html_content}

        <div style="page-break-before: always;"></div>

        <div style="text-align: center; padding: 50px; color: #64748b;">
            <p><strong>© 2025 ProeVira</strong></p>
            <p>Sistema de Predicción de Enfermedades Virales</p>
            <p style="margin-top: 30px; font-size: 10pt;">
                Generado automáticamente el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}
            </p>
        </div>
    </body>
    </html>
    """

    print("📄 Generando PDF del Manual de Instalación...")
    print(f"   Origen: {md_path}")
    print(f"   Destino: {pdf_path}")

    try:
        # Generar PDF
        HTML(string=full_html).write_pdf(
            pdf_path,
            stylesheets=[CSS(string=css_styles)]
        )

        print(f"\n✅ PDF generado exitosamente!")
        print(f"   📁 Ubicación: {pdf_path}")

        # Obtener tamaño del archivo
        size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
        print(f"   📊 Tamaño: {size_mb:.2f} MB")

        return True

    except Exception as e:
        print(f"\n❌ Error generando PDF: {e}")
        return False


def generar_pdf_alternativo():
    """Método alternativo usando fpdf2 (más simple, sin dependencias GTK)"""
    try:
        from fpdf import FPDF
    except ImportError:
        print("Instalando fpdf2...")
        os.system(f"{sys.executable} -m pip install fpdf2")
        from fpdf import FPDF

    script_dir = os.path.dirname(os.path.abspath(__file__))
    md_path = os.path.join(script_dir, "MANUAL_INSTALACION.md")
    pdf_path = os.path.join(script_dir, "MANUAL_INSTALACION_ProeVira.pdf")

    # Leer el contenido Markdown
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Crear PDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Agregar fuente que soporte Unicode
    pdf.add_page()
    pdf.set_font('Helvetica', '', 12)

    # Portada
    pdf.set_font('Helvetica', 'B', 36)
    pdf.set_text_color(30, 64, 175)
    pdf.cell(0, 60, '', ln=True)
    pdf.cell(0, 20, 'ProeVira', ln=True, align='C')

    pdf.set_font('Helvetica', 'B', 24)
    pdf.set_text_color(59, 130, 246)
    pdf.cell(0, 15, 'Manual de Instalacion', ln=True, align='C')

    pdf.set_font('Helvetica', '', 14)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 10, 'Sistema de Prediccion de Enfermedades Virales', ln=True, align='C')

    pdf.cell(0, 30, '', ln=True)
    pdf.set_font('Helvetica', '', 12)
    pdf.cell(0, 10, 'Version 2.0 - Diciembre 2025', ln=True, align='C')

    # Nueva página para contenido
    pdf.add_page()

    # Procesar el contenido línea por línea
    lines = md_content.split('\n')

    for line in lines:
        line = line.strip()

        # Ignorar líneas vacías consecutivas
        if not line:
            pdf.cell(0, 5, '', ln=True)
            continue

        # Títulos
        if line.startswith('# '):
            pdf.set_font('Helvetica', 'B', 20)
            pdf.set_text_color(30, 64, 175)
            text = line[2:].replace('📘 ', '').replace('📑 ', '')
            pdf.cell(0, 15, text.encode('latin-1', 'replace').decode('latin-1'), ln=True)
            pdf.set_draw_color(30, 64, 175)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.cell(0, 5, '', ln=True)

        elif line.startswith('## '):
            pdf.set_font('Helvetica', 'B', 16)
            pdf.set_text_color(30, 58, 138)
            text = line[3:]
            # Remover emojis
            for emoji in ['📑', '📞', '📋', '📘']:
                text = text.replace(emoji, '')
            pdf.cell(0, 12, text.encode('latin-1', 'replace').decode('latin-1'), ln=True)

        elif line.startswith('### '):
            pdf.set_font('Helvetica', 'B', 14)
            pdf.set_text_color(29, 78, 216)
            text = line[4:]
            pdf.cell(0, 10, text.encode('latin-1', 'replace').decode('latin-1'), ln=True)

        elif line.startswith('#### '):
            pdf.set_font('Helvetica', 'B', 12)
            pdf.set_text_color(37, 99, 235)
            text = line[5:]
            pdf.cell(0, 8, text.encode('latin-1', 'replace').decode('latin-1'), ln=True)

        elif line.startswith('```'):
            # Bloque de código - omitir marcadores
            continue

        elif line.startswith('|'):
            # Tabla - simplificar
            pdf.set_font('Helvetica', '', 10)
            pdf.set_text_color(51, 51, 51)
            text = line.replace('|', ' | ')
            pdf.cell(0, 6, text.encode('latin-1', 'replace').decode('latin-1'), ln=True)

        elif line.startswith('- ') or line.startswith('* '):
            pdf.set_font('Helvetica', '', 11)
            pdf.set_text_color(51, 51, 51)
            text = '  * ' + line[2:]
            pdf.multi_cell(0, 6, text.encode('latin-1', 'replace').decode('latin-1'))

        elif line.startswith('---'):
            pdf.cell(0, 5, '', ln=True)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.cell(0, 5, '', ln=True)

        else:
            # Texto normal
            pdf.set_font('Helvetica', '', 11)
            pdf.set_text_color(51, 51, 51)
            # Limpiar caracteres especiales
            text = line.replace('✅', '[OK]').replace('❌', '[X]').replace('⚠️', '[!]')
            text = text.replace('**', '').replace('`', "'")
            try:
                pdf.multi_cell(0, 6, text.encode('latin-1', 'replace').decode('latin-1'))
            except:
                continue

    # Guardar
    pdf.output(pdf_path)

    print(f"\n✅ PDF generado exitosamente!")
    print(f"   📁 Ubicación: {pdf_path}")

    size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
    print(f"   📊 Tamaño: {size_mb:.2f} MB")

    return True


if __name__ == "__main__":
    print("=" * 50)
    print("   GENERADOR DE PDF - Manual de Instalación")
    print("   ProeVira v2.0")
    print("=" * 50)
    print()

    # Intentar con el método simple primero (fpdf2)
    try:
        generar_pdf_alternativo()
    except Exception as e:
        print(f"Método principal falló: {e}")
        print("Intentando método alternativo con WeasyPrint...")
        try:
            instalar_dependencias()
            generar_pdf()
        except Exception as e2:
            print(f"❌ Error: {e2}")
            print("\nPuede generar el PDF manualmente:")
            print("1. Abra el archivo MANUAL_INSTALACION.md")
            print("2. Use un conversor online como: https://md2pdf.netlify.app/")
