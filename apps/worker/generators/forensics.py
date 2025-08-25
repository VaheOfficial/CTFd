import struct
import csv
import io
from typing import Dict, Any

from .base import ArtifactGenerator, GENERATORS

class CorruptPngMagicGenerator(ArtifactGenerator):
    """Generate PNG file with corrupted magic number"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        width = params.get('width', 800)
        height = params.get('height', 600)
        offset = params.get('offset', 0)
        
        # Create minimal PNG structure but with wrong magic
        # Correct PNG signature: 89 50 4E 47 0D 0A 1A 0A
        # We'll use JPEG signature instead: FF D8 FF E0
        
        if offset == 0:
            # Replace PNG signature with JPEG signature
            header = b'\xFF\xD8\xFF\xE0'  # JPEG signature
            header += b'\x0D\x0A\x1A\x0A'  # Rest of PNG signature
        else:
            # Corrupt at specific offset
            header = b'\x89PNG\r\n\x1a\n'
            header = header[:offset] + b'\xFF' + header[offset+1:]
        
        # Add IHDR chunk
        ihdr = struct.pack('>II', width, height)  # width, height
        ihdr += b'\x08\x02\x00\x00\x00'  # bit depth, color type, compression, filter, interlace
        ihdr_crc = struct.pack('>I', 0x12345678)  # Fake CRC
        
        chunk = struct.pack('>I', len(ihdr)) + b'IHDR' + ihdr + ihdr_crc
        
        # Add minimal IEND chunk
        iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', 0xAE426082)
        
        return header + chunk + iend

class SliceWinSecLogs4769Generator(ArtifactGenerator):
    """Generate Windows Security Event 4769 logs (Kerberos ticket requests)"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        users = params.get('users', 10)
        spike = params.get('spike', 50)  # Spike multiplier for suspicious activity
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # CSV Header
        writer.writerow([
            'TimeGenerated', 'EventID', 'SourceName', 'AccountName', 
            'AccountDomain', 'ServiceName', 'TicketOptions', 'FailureCode',
            'ClientAddress', 'TransmittedServices'
        ])
        
        # Generate normal user activity
        normal_users = [f"user{i:03d}" for i in range(1, users + 1)]
        services = ['cifs', 'host', 'http', 'ldap', 'mssql']
        
        # Normal activity (baseline)
        for _ in range(users * 5):
            user = self.rng.choice(normal_users)
            service = self.rng.choice(services)
            timestamp = self._deterministic_timestamp()
            
            writer.writerow([
                timestamp, '4769', 'Microsoft-Windows-Security-Auditing',
                user, 'CORP', f'{service}/server.corp.com', '0x40810010',
                '0x0', self._deterministic_ip(), '-'
            ])
        
        # Suspicious activity - service account with excessive requests
        suspicious_user = 'svc_backup'
        for _ in range(spike):
            service = self.rng.choice(services + ['cifs', 'cifs', 'cifs'])  # Bias toward CIFS
            timestamp = self._deterministic_timestamp()
            
            writer.writerow([
                timestamp, '4769', 'Microsoft-Windows-Security-Auditing',
                suspicious_user, 'CORP', f'{service}/server{self.rng.randint(1,20):02d}.corp.com',
                '0x40810010', '0x0', self._deterministic_ip(), '-'
            ])
        
        return output.getvalue().encode('utf-8')

class MakeEmlPhishGenerator(ArtifactGenerator):
    """Generate phishing email with configurable authentication bypasses"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        spf_valid = params.get('spf', True)
        dkim_valid = params.get('dkim', True)
        display_name_spoof = params.get('display_name_spoof', False)
        
        # Generate email content
        sender_domain = "legitimate-bank.com" if not display_name_spoof else "evil.com"
        display_name = "First National Bank" if display_name_spoof else "Support Team"
        
        subject = "Urgent: Account Security Alert"
        
        # Email headers
        headers = []
        headers.append(f"From: {display_name} <noreply@{sender_domain}>")
        headers.append("To: victim@corp.com")
        headers.append(f"Subject: {subject}")
        headers.append("Date: Mon, 15 Jan 2024 10:30:00 +0000")
        headers.append("Message-ID: <{}>@{}".format(
            self._deterministic_string(16), sender_domain
        ))
        
        # SPF record simulation
        if not spf_valid:
            headers.append("Received-SPF: fail (google.com: domain of {} does not designate {} as permitted sender)".format(
                f"noreply@{sender_domain}", self._deterministic_ip()
            ))
        else:
            headers.append("Received-SPF: pass")
        
        # DKIM signature simulation  
        if dkim_valid:
            headers.append("DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d={}; s=default".format(sender_domain))
        else:
            headers.append("DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d={}; s=invalid".format(sender_domain))
        
        headers.append("Content-Type: text/html; charset=UTF-8")
        headers.append("")
        
        # Email body
        body = f"""
<html>
<body>
<p>Dear Valued Customer,</p>

<p>We have detected suspicious activity on your account. Please verify your identity immediately to prevent account suspension.</p>

<p><a href="http://phishing-site.{self._deterministic_string(8)}.com/verify">Click here to verify your account</a></p>

<p>This link will expire in 24 hours.</p>

<p>Thank you,<br>
{display_name} Security Team</p>

<p><small>This is an automated message. Please do not reply to this email.</small></p>
</body>
</html>
"""
        
        email_content = '\n'.join(headers) + body
        return email_content.encode('utf-8')

# Register generators
GENERATORS['corrupt_png_magic'] = CorruptPngMagicGenerator
GENERATORS['slice_winsec_logs_4769'] = SliceWinSecLogs4769Generator  
GENERATORS['make_eml_phish'] = MakeEmlPhishGenerator
