import zipfile
import io
from typing import Dict, Any, List, Tuple

from .base import ArtifactGenerator, GENERATORS

class PackZipGenerator(ArtifactGenerator):
    """Pack multiple files into a ZIP archive"""
    
    def generate(self, params: Dict[str, Any]) -> bytes:
        files = params.get('files', [])
        
        if not files:
            raise ValueError("No files specified for ZIP archive")
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_info in files:
                if isinstance(file_info, str):
                    # Simple filename - generate dummy content
                    filename = file_info
                    content = f"Dummy content for {filename}".encode('utf-8')
                elif isinstance(file_info, dict):
                    # File with content
                    filename = file_info['name']
                    content = file_info.get('content', '').encode('utf-8')
                else:
                    continue
                
                zip_file.writestr(filename, content)
        
        zip_buffer.seek(0)
        return zip_buffer.read()

# Generator registry loader
def load_all_generators():
    """Load all generators from modules"""
    from . import forensics, network, cloud, edr
    
    # Generators are automatically registered via GENERATORS dict
    return GENERATORS

def get_generator(operation: str, seed: int) -> ArtifactGenerator:
    """Get generator instance for operation"""
    generators = load_all_generators()
    
    if operation not in generators:
        raise ValueError(f"Unknown generator operation: {operation}")
    
    generator_class = generators[operation]
    return generator_class(seed)

def generate_artifact(operation: str, params: Dict[str, Any], seed: int) -> bytes:
    """Generate artifact using specified operation"""
    generator = get_generator(operation, seed)
    return generator.generate(params)

# Register utility generators
GENERATORS['pack_zip'] = PackZipGenerator
