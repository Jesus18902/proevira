import mysql.connector

conn = mysql.connector.connect(host='127.0.0.1', user='root', password='', database='proyecto_integrador')
c = conn.cursor(dictionary=True)

c.execute('SELECT MIN(fecha_fin_semana) as min_fecha, MAX(fecha_fin_semana) as max_fecha FROM dato_epidemiologico')
print('Rango fechas:', c.fetchone())

c.execute("""
    SELECT DATE_FORMAT(fecha_fin_semana, '%%Y-%%m') as mes, SUM(casos_confirmados) as total
    FROM dato_epidemiologico
    WHERE fecha_fin_semana >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
    GROUP BY DATE_FORMAT(fecha_fin_semana, '%%Y-%%m') ORDER BY mes
""")
rows = c.fetchall()
print(f'Total meses con datos: {len(rows)}')
for r in rows:
    print(f'  {r["mes"]}: {r["total"]}')

print('\nCURDATE:', )
c.execute('SELECT CURDATE() as hoy, DATE_SUB(CURDATE(), INTERVAL 24 MONTH) as hace24')
print(c.fetchone())

conn.close()
