import random
import hashlib
from typing import Dict, Any, Callable
from abc import ABC, abstractmethod

class ArtifactGenerator(ABC):
    """Base class for deterministic artifact generators"""
    
    def __init__(self, seed: int):
        self.seed = seed
        self.rng = random.Random(seed)
    
    @abstractmethod
    def generate(self, params: Dict[str, Any]) -> bytes:
        """Generate artifact content"""
        pass
    
    def _deterministic_string(self, length: int, charset: str = "abcdefghijklmnopqrstuvwxyz0123456789") -> str:
        """Generate deterministic string of given length"""
        return ''.join(self.rng.choices(charset, k=length))
    
    def _deterministic_ip(self) -> str:
        """Generate deterministic IP address"""
        octets = [self.rng.randint(1, 254) for _ in range(4)]
        return '.'.join(map(str, octets))
    
    def _deterministic_timestamp(self, base_year: int = 2024) -> str:
        """Generate deterministic timestamp"""
        year = base_year
        month = self.rng.randint(1, 12)
        day = self.rng.randint(1, 28)
        hour = self.rng.randint(0, 23)
        minute = self.rng.randint(0, 59)
        second = self.rng.randint(0, 59)
        
        return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}Z"

# Registry of available generators
GENERATORS: Dict[str, Callable[[int], ArtifactGenerator]] = {}
