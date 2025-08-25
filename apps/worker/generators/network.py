import csv
import io
import json
import base64
from typing import Dict, Any

from .base import ArtifactGenerator, GENERATORS

class SynthesizeDnsTunnelCsvGenerator(ArtifactGenerator):
    """Generate DNS tunneling traffic in CSV format"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        payload_len = params.get('payload_len', 256)
        domain = params.get('domain', 'evil.com')
        qps = params.get('qps', 10)  # Queries per second (affects frequency)
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # CSV Header for DNS logs
        writer.writerow([
            'timestamp', 'client_ip', 'query_name', 'query_type', 
            'response_code', 'response_size', 'query_length'
        ])
        
        # Generate the payload to tunnel
        payload = self._deterministic_string(payload_len, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")
        
        # Split payload into chunks that fit in DNS labels (max 63 chars)
        chunk_size = 32
        chunks = [payload[i:i+chunk_size] for i in range(0, len(payload), chunk_size)]
        
        # Generate normal DNS traffic first
        normal_domains = ['google.com', 'microsoft.com', 'github.com', 'stackoverflow.com']
        for _ in range(50):
            timestamp = self._deterministic_timestamp()
            client_ip = self._deterministic_ip()
            query_name = self.rng.choice(normal_domains)
            
            writer.writerow([
                timestamp, client_ip, query_name, 'A', 'NOERROR', 
                self.rng.randint(32, 128), len(query_name)
            ])
        
        # Generate tunneling traffic - high frequency, encoded subdomains
        client_ip = self._deterministic_ip()  # Same client for tunneling
        
        for i, chunk in enumerate(chunks):
            # Create multiple queries per chunk to simulate high frequency
            for q in range(qps):
                timestamp = self._deterministic_timestamp()
                # Encode chunk as subdomain
                subdomain = chunk.lower()
                query_name = f"{subdomain}.{i:04d}.{domain}"
                
                writer.writerow([
                    timestamp, client_ip, query_name, 'A', 'NOERROR',
                    32, len(query_name)
                ])
        
        return output.getvalue().encode('utf-8')

class MakePcapBeaconGenerator(ArtifactGenerator):
    """Generate PCAP with beacon traffic (simplified - creates description)"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        period_ms = params.get('period_ms', 60000)  # 60 second beacon
        jitter = params.get('jitter', 5000)  # 5 second jitter
        host = params.get('host', 'malicious.com')
        uri = params.get('uri', '/update')
        
        # For now, generate a textual description of the PCAP
        # In a real implementation, this would generate actual PCAP binary data
        
        flows = []
        client_ip = self._deterministic_ip()
        server_ip = self._deterministic_ip()
        
        # Generate beacon flows
        for i in range(10):
            # Calculate beacon time with jitter
            base_time = i * (period_ms / 1000)
            jitter_offset = self.rng.randint(-jitter//2, jitter//2) / 1000
            timestamp = base_time + jitter_offset
            
            # HTTP GET request
            flows.append({
                'timestamp': timestamp,
                'src_ip': client_ip,
                'dst_ip': server_ip,
                'src_port': self.rng.randint(49152, 65535),
                'dst_port': 80,
                'protocol': 'HTTP',
                'method': 'GET',
                'uri': uri,
                'host': host,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'size': self.rng.randint(200, 400)
            })
            
            # HTTP Response
            flows.append({
                'timestamp': timestamp + 0.1,
                'src_ip': server_ip,
                'dst_ip': client_ip,
                'src_port': 80,
                'dst_port': flows[-1]['src_port'],
                'protocol': 'HTTP',
                'status': 200,
                'content_type': 'text/plain',
                'size': self.rng.randint(50, 150)
            })
        
        # Add some normal traffic to blend in
        for _ in range(20):
            timestamp = self.rng.uniform(0, 600)
            flows.append({
                'timestamp': timestamp,
                'src_ip': self._deterministic_ip(),
                'dst_ip': self._deterministic_ip(),
                'src_port': self.rng.randint(1024, 65535),
                'dst_port': self.rng.choice([80, 443, 53, 22]),
                'protocol': self.rng.choice(['HTTP', 'HTTPS', 'DNS', 'SSH']),
                'size': self.rng.randint(64, 1500)
            })
        
        # Sort by timestamp
        flows.sort(key=lambda x: x['timestamp'])
        
        # Convert to JSON representation (placeholder for real PCAP)
        pcap_data = {
            'format': 'pcap_description',
            'note': 'This is a textual representation. Real implementation would generate binary PCAP.',
            'beacon_period_ms': period_ms,
            'beacon_jitter_ms': jitter,
            'flows': flows
        }
        
        return json.dumps(pcap_data, indent=2).encode('utf-8')

class HttpLogsIdorGenerator(ArtifactGenerator):
    """Generate HTTP access logs with IDOR vulnerability patterns"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        endpoint_base = params.get('endpoint_base', '/api/users')
        bad_rate = params.get('bad_rate', 20)  # Percentage of IDOR attempts
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # CSV Header for HTTP logs
        writer.writerow([
            'timestamp', 'client_ip', 'method', 'uri', 'status_code',
            'response_size', 'user_agent', 'user_id'
        ])
        
        # Generate legitimate user requests
        legitimate_users = [f"user{i:03d}" for i in range(1, 21)]
        
        for _ in range(100):
            timestamp = self._deterministic_timestamp()
            client_ip = self._deterministic_ip()
            user_id = self.rng.choice(legitimate_users)
            
            # Legitimate access - user accessing their own data
            user_num = int(user_id[4:])
            uri = f"{endpoint_base}/{user_num}/profile"
            
            writer.writerow([
                timestamp, client_ip, 'GET', uri, '200',
                self.rng.randint(500, 2000), 
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                user_id
            ])
        
        # Generate IDOR attempts
        attacker_ip = self._deterministic_ip()
        attacker_user = 'user007'
        
        for _ in range(bad_rate):
            timestamp = self._deterministic_timestamp()
            
            # Attempt to access other users' data
            target_user_num = self.rng.randint(1, 50)
            uri = f"{endpoint_base}/{target_user_num}/profile"
            
            # Some succeed (vulnerable), some fail (protected)
            if self.rng.random() < 0.3:  # 30% success rate
                status = '200'
                size = self.rng.randint(500, 2000)
            else:
                status = '403'
                size = self.rng.randint(50, 200)
            
            writer.writerow([
                timestamp, attacker_ip, 'GET', uri, status, size,
                'curl/7.68.0', attacker_user
            ])
        
        return output.getvalue().encode('utf-8')

# Register generators
GENERATORS['synthesize_dns_tunnel_csv'] = SynthesizeDnsTunnelCsvGenerator
GENERATORS['make_pcap_beacon'] = MakePcapBeaconGenerator
GENERATORS['http_logs_idor'] = HttpLogsIdorGenerator
