from celery import Celery
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import structlog

logger = structlog.get_logger(__name__)

app = Celery('cte-worker')

@app.task(bind=True)
def send_email(self, to_email: str, subject: str, body: str, html_body: str = None):
    """
    Send an email notification
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    """
    try:
        smtp_host = os.getenv('SMTP_HOST')
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        
        if not all([smtp_host, smtp_user, smtp_pass]):
            logger.warning("SMTP not configured, skipping email")
            return {'status': 'skipped', 'reason': 'SMTP not configured'}
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to_email
        
        # Add plain text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, 587) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        logger.info("Email sent successfully", 
                   to_email=to_email, 
                   subject=subject)
        
        return {'status': 'sent'}
        
    except Exception as e:
        logger.error("Email send failed", 
                    error=str(e),
                    to_email=to_email,
                    subject=subject)
        return {
            'status': 'failed',
            'error': str(e)
        }

@app.task(bind=True)
def send_challenge_notification(self, user_emails: list, challenge_title: str, week_info: dict):
    """
    Send notification about new challenge availability
    
    Args:
        user_emails: List of user email addresses
        challenge_title: Title of the new challenge
        week_info: Information about the week/season
    """
    subject = f"New Challenge Available: {challenge_title}"
    
    body = f"""
    A new challenge is now available!
    
    Challenge: {challenge_title}
    Week: {week_info.get('index', 'N/A')}
    Season: {week_info.get('season_name', 'Current Season')}
    
    Log in to the CTE Platform to start solving!
    """
    
    # Send to all users
    results = []
    for email in user_emails:
        result = send_email.delay(email, subject, body)
        results.append(result.id)
    
    return {'notification_tasks': results}

@app.task(bind=True) 
def send_leaderboard_update(self, top_users: list, season_info: dict):
    """
    Send weekly leaderboard update to participants
    
    Args:
        top_users: List of top users with scores
        season_info: Season information
    """
    # TODO: Implement leaderboard email template
    logger.info("Leaderboard update notification", 
               season=season_info.get('name'),
               top_users_count=len(top_users))
    
    return {'status': 'placeholder'}
