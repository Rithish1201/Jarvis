"""
Reports API for Jarvis Smart Factory
Provides PDF and CSV download endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.services.reports import (
    generate_summary_pdf,
    generate_machine_history_csv,
    generate_all_machines_csv,
    generate_maintenance_pdf
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary/pdf")
def download_summary_pdf(db: Session = Depends(get_db)):
    """Download PDF summary report of all machines"""
    try:
        pdf_buffer = generate_summary_pdf(db)
        filename = f"jarvis_report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/maintenance/pdf")
def download_maintenance_pdf(db: Session = Depends(get_db)):
    """Download PDF maintenance report"""
    try:
        pdf_buffer = generate_maintenance_pdf(db)
        filename = f"maintenance_report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/history/{machine_id}/csv")
def download_machine_history_csv(machine_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Download CSV history for a specific machine"""
    try:
        csv_buffer = generate_machine_history_csv(db, machine_id, hours)
        filename = f"{machine_id}_history_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            iter([csv_buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")


@router.get("/history/csv")
def download_all_history_csv(hours: int = 24, db: Session = Depends(get_db)):
    """Download CSV history for all machines"""
    try:
        csv_buffer = generate_all_machines_csv(db, hours)
        filename = f"all_machines_history_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            iter([csv_buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")


@router.post("/email/test")
def send_test_email():
    """Send a test email to verify configuration"""
    from app.services.notifications import send_email, is_email_configured, ADMIN_EMAILS
    
    if not is_email_configured():
        return {
            "success": False,
            "message": "Email not configured. Set SMTP_USERNAME and SMTP_PASSWORD."
        }
    
    html = f"""
    <h1>🤖 Jarvis Test Email</h1>
    <p>This is a test email from Jarvis Smart Factory Monitoring System.</p>
    <p>Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <p>If you received this, email notifications are working!</p>
    """
    
    success = send_email(ADMIN_EMAILS, "🧪 Jarvis Test Email", html)
    
    return {
        "success": success,
        "recipients": ADMIN_EMAILS,
        "message": "Test email sent!" if success else "Failed to send email"
    }


@router.post("/email/summary")
def send_summary_email(db: Session = Depends(get_db)):
    """Send a summary email with current status"""
    from app.services.notifications import send_daily_summary, is_email_configured, ADMIN_EMAILS
    from app.services.data_reader import read_latest_data
    from app.services.anomaly_detector import get_anomaly_summary
    
    if not is_email_configured():
        return {"success": False, "message": "Email not configured"}
    
    machines = read_latest_data()
    anomalies = get_anomaly_summary(db, machines)
    
    success = send_daily_summary(machines, anomalies)
    
    return {
        "success": success,
        "recipients": ADMIN_EMAILS,
        "message": "Summary email sent!" if success else "Failed to send"
    }

