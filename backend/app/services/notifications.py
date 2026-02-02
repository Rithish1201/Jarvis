"""
Email Notification Service for Jarvis Smart Factory
Sends email alerts for critical machine conditions
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()


# Email configuration (set via environment variables)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "jarvis@smartfactory.com")
ADMIN_EMAILS = os.getenv("ADMIN_EMAILS", "rithish1201@gmail.com").split(",") if os.getenv("ADMIN_EMAILS") else ["rithish1201@gmail.com"]


def is_email_configured() -> bool:
    """Check if email is properly configured"""
    return bool(SMTP_USERNAME and SMTP_PASSWORD)


def create_alert_email(machine_id: str, alerts: List[Dict]) -> str:
    """Create HTML email content for alerts"""
    alert_rows = ""
    for alert in alerts:
        severity = alert.get('severity', 'info')
        color = '#ef4444' if severity == 'critical' else '#f59e0b' if severity == 'warning' else '#3b82f6'
        alert_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <span style="color: {color}; font-weight: bold;">{severity.upper()}</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                {alert.get('message', 'Unknown issue')}
            </td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f8fafc; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }}
            .header {{ background: #1e40af; color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }}
            .alert-box {{ background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin: 15px 0; }}
            table {{ width: 100%; border-collapse: collapse; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">🚨 Jarvis Alert</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Smart Factory Monitoring System</p>
            </div>
            
            <div class="alert-box">
                <h2 style="margin: 0 0 10px 0; color: #ef4444;">Machine Alert: {machine_id}</h2>
                <p style="margin: 0; color: #6b7280;">Detected at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <table>
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="padding: 10px; text-align: left;">Severity</th>
                        <th style="padding: 10px; text-align: left;">Issue</th>
                    </tr>
                </thead>
                <tbody>
                    {alert_rows}
                </tbody>
            </table>
            
            <p style="margin-top: 20px;">
                <strong>Recommended Action:</strong> Please check the machine immediately and take 
                appropriate maintenance action.
            </p>
            
            <p>
                <a href="http://localhost:5173" style="display: inline-block; background: #3b82f6; color: white; 
                   padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    View Dashboard
                </a>
            </p>
            
            <div class="footer">
                <p>This is an automated alert from Jarvis Smart Factory Monitoring System.</p>
                <p>Do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html


def send_email(to_emails: List[str], subject: str, html_content: str) -> bool:
    """Send an email using SMTP"""
    if not is_email_configured():
        print("[Email] Not configured - skipping email send")
        return False
    
    if not to_emails:
        print("[Email] No recipients specified")
        return False
    
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = FROM_EMAIL
        message["To"] = ", ".join(to_emails)
        
        # Attach HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Create secure connection
        context = ssl.create_default_context()
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_emails, message.as_string())
        
        print(f"[Email] Sent to {to_emails}")
        return True
        
    except Exception as e:
        print(f"[Email] Failed to send: {e}")
        return False


def send_alert_email(machine_id: str, alerts: List[Dict], recipients: Optional[List[str]] = None) -> bool:
    """Send an alert email for machine issues"""
    if recipients is None:
        recipients = ADMIN_EMAILS
    
    if not recipients:
        print("[Email] No recipients configured")
        return False
    
    subject = f"🚨 Jarvis Alert: {machine_id} requires attention"
    html = create_alert_email(machine_id, alerts)
    
    return send_email(recipients, subject, html)


def send_daily_summary(machines_data: List[Dict], anomaly_summary: Dict, recipients: Optional[List[str]] = None) -> bool:
    """Send daily summary email"""
    if recipients is None:
        recipients = ADMIN_EMAILS
    
    if not recipients:
        return False
    
    # Build summary stats
    total = len(machines_data)
    healthy = sum(1 for m in machines_data if m.get('status') == 'Healthy')
    warning = sum(1 for m in machines_data if m.get('status') == 'Warning')
    critical = sum(1 for m in machines_data if m.get('status') == 'Critical')
    
    machine_rows = ""
    for m in machines_data:
        status = m.get('status', 'Unknown')
        color = '#22c55e' if status == 'Healthy' else '#f59e0b' if status == 'Warning' else '#ef4444'
        machine_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{m.get('machine_id')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><span style="color: {color};">{status}</span></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{m.get('temperature')}°C</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{m.get('health_score')}%</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #1e40af;">📊 Daily Factory Summary</h1>
            <p style="color: #6b7280;">{datetime.now().strftime('%A, %B %d, %Y')}</p>
            
            <div style="display: flex; gap: 10px; margin: 20px 0;">
                <div style="flex: 1; background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #22c55e;">{healthy}</div>
                    <div style="color: #166534;">Healthy</div>
                </div>
                <div style="flex: 1; background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #eab308;">{warning}</div>
                    <div style="color: #854d0e;">Warning</div>
                </div>
                <div style="flex: 1; background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">{critical}</div>
                    <div style="color: #991b1b;">Critical</div>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="padding: 10px; text-align: left;">Machine</th>
                        <th style="padding: 10px; text-align: left;">Status</th>
                        <th style="padding: 10px; text-align: left;">Temp</th>
                        <th style="padding: 10px; text-align: left;">Health</th>
                    </tr>
                </thead>
                <tbody>
                    {machine_rows}
                </tbody>
            </table>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:5173" style="background: #3b82f6; color: white; 
                   padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                    Open Dashboard
                </a>
            </p>
        </div>
    </body>
    </html>
    """
    
    subject = f"📊 Jarvis Daily Summary - {healthy}/{total} Healthy"
    return send_email(recipients, subject, html)
