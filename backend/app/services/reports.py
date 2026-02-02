"""
Report Generation Service for Jarvis Smart Factory
Generates PDF and CSV reports for machine status, history, and maintenance
"""
from io import BytesIO, StringIO
import csv
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.widgets.markers import makeMarker

from app.models.machine_data import MachineReading
from app.services.data_reader import read_latest_data
from app.services.anomaly_detector import get_anomaly_summary
from app.services.predictor import get_maintenance_recommendations


def generate_summary_pdf(db: Session) -> BytesIO:
    """Generate a PDF summary report of all machines"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=10,
        textColor=colors.HexColor('#374151')
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph("🏭 Jarvis Smart Factory Report", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Get current machine data
    machines = read_latest_data()
    
    if not machines:
        elements.append(Paragraph("No machine data available.", styles['Normal']))
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    # Machine Status Summary
    elements.append(Paragraph("📊 Machine Status Summary", subtitle_style))
    
    # Status table
    table_data = [['Machine ID', 'Status', 'Temperature', 'Vibration', 'Health Score']]
    for m in machines:
        table_data.append([
            m.get('machine_id', 'Unknown'),
            m.get('status', 'Unknown'),
            f"{m.get('temperature', 0)}°C",
            f"{m.get('vibration', 0):.3f}",
            f"{m.get('health_score', 0)}%"
        ])
    
    table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1.2*inch, 1*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    # Color code status cells
    for i, m in enumerate(machines, 1):
        status = m.get('status', '')
        if status == 'Critical':
            table.setStyle(TableStyle([('BACKGROUND', (1, i), (1, i), colors.HexColor('#fee2e2'))]))
        elif status == 'Warning':
            table.setStyle(TableStyle([('BACKGROUND', (1, i), (1, i), colors.HexColor('#fef3c7'))]))
        elif status == 'Healthy':
            table.setStyle(TableStyle([('BACKGROUND', (1, i), (1, i), colors.HexColor('#dcfce7'))]))
    
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    # Anomalies Section
    elements.append(Paragraph("⚠️ Current Anomalies", subtitle_style))
    
    anomaly_summary = get_anomaly_summary(db, machines)
    if anomaly_summary['machines_with_anomalies'] > 0:
        anomaly_data = [['Machine', 'Severity', 'Issue']]
        for a in anomaly_summary['anomalies']:
            for detail in a.get('anomalies', [])[:2]:  # Limit to 2 per machine
                anomaly_data.append([
                    a['machine_id'],
                    detail.get('severity', 'unknown').upper(),
                    detail.get('message', 'Unknown issue')[:50]
                ])
        
        anomaly_table = Table(anomaly_data, colWidths=[1.5*inch, 1*inch, 3.5*inch])
        anomaly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(anomaly_table)
    else:
        elements.append(Paragraph("✓ No anomalies detected", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    
    # Maintenance Recommendations
    elements.append(Paragraph("🔧 Maintenance Recommendations", subtitle_style))
    
    recommendations = get_maintenance_recommendations(db, machines)
    if recommendations:
        for rec in recommendations[:5]:
            priority = rec.get('priority', 'scheduled')
            priority_color = '#ef4444' if priority == 'urgent' else '#f59e0b'
            elements.append(Paragraph(
                f"<font color='{priority_color}'>■</font> <b>{rec['machine_id']}</b>: {rec.get('recommended_action', 'Monitor')}",
                styles['Normal']
            ))
            elements.append(Spacer(1, 5))
    else:
        elements.append(Paragraph("✓ No immediate maintenance required", styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph(
        "Report generated by Jarvis Smart Factory Monitoring System",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray)
    ))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_machine_history_csv(db: Session, machine_id: str, hours: int = 24) -> StringIO:
    """Generate CSV of machine history"""
    buffer = StringIO()
    writer = csv.writer(buffer)
    
    # Header
    writer.writerow(['Timestamp', 'Machine ID', 'Temperature (°C)', 'Vibration', 'RPM', 'Health Score', 'Status'])
    
    # Get historical data
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    readings = db.query(MachineReading).filter(
        MachineReading.machine_id == machine_id,
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()
    
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat(),
            r.machine_id,
            r.temperature,
            r.vibration,
            r.rpm,
            r.health_score,
            r.status
        ])
    
    buffer.seek(0)
    return buffer


def generate_all_machines_csv(db: Session, hours: int = 24) -> StringIO:
    """Generate CSV of all machines history"""
    buffer = StringIO()
    writer = csv.writer(buffer)
    
    # Header
    writer.writerow(['Timestamp', 'Machine ID', 'Temperature (°C)', 'Vibration', 'RPM', 'Health Score', 'Status'])
    
    # Get historical data
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    readings = db.query(MachineReading).filter(
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()
    
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat(),
            r.machine_id,
            r.temperature,
            r.vibration,
            r.rpm,
            r.health_score,
            r.status
        ])
    
    buffer.seek(0)
    return buffer


def generate_maintenance_pdf(db: Session) -> BytesIO:
    """Generate a maintenance-focused PDF report"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
    styles = getSampleStyleSheet()
    
    elements = []
    
    # Title
    elements.append(Paragraph("🔧 Maintenance Report", styles['Title']))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    machines = read_latest_data()
    recommendations = get_maintenance_recommendations(db, machines)
    
    if not recommendations:
        elements.append(Paragraph("✓ All machines operating normally. No maintenance required.", styles['Normal']))
    else:
        # Priority summary
        urgent = sum(1 for r in recommendations if r['priority'] == 'urgent')
        scheduled = len(recommendations) - urgent
        
        elements.append(Paragraph(f"<b>Urgent:</b> {urgent} machines | <b>Scheduled:</b> {scheduled} machines", styles['Normal']))
        elements.append(Spacer(1, 15))
        
        for rec in recommendations:
            priority = rec['priority']
            color = '#ef4444' if priority == 'urgent' else '#f59e0b'
            
            elements.append(Paragraph(
                f"<font color='{color}'>●</font> <b>{rec['machine_id']}</b> [{priority.upper()}]",
                styles['Heading3']
            ))
            elements.append(Paragraph(f"Risk Level: {rec.get('risk_level', 'unknown')}", styles['Normal']))
            elements.append(Paragraph(f"Message: {rec.get('message', '')}", styles['Normal']))
            elements.append(Paragraph(f"<b>Recommended Action:</b> {rec.get('recommended_action', 'Monitor')}", styles['Normal']))
            elements.append(Spacer(1, 15))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
