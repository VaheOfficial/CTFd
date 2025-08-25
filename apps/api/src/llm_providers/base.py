from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
import jsonschema
from dataclasses import dataclass

@dataclass
class LLMUsage:
    """Token usage statistics"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: Optional[float] = None

@dataclass
class LLMResponse:
    """Response from LLM provider"""
    content: str
    parsed_json: Optional[Dict[str, Any]]
    usage: Optional[LLMUsage]
    provider: str
    model: str

class LLMProvider(ABC):
    """Base class for LLM providers"""
    
    def __init__(self, api_key: str, model: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
    
    @abstractmethod
    async def generate_text(
        self, 
        prompt: str, 
        temperature: float = 0.1, 
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Generate text response"""
        pass
    
    async def generate_json(
        self, 
        prompt: str, 
        schema: Dict[str, Any], 
        temperature: float = 0.1, 
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Generate JSON response and validate against schema"""
        
        # Add JSON format instruction to prompt
        json_prompt = f"""{prompt}

IMPORTANT: Respond with valid JSON only. No markdown, no explanations, just the JSON object that matches this schema:

{json.dumps(schema, indent=2)}

Response:"""
        
        response = await self.generate_text(json_prompt, temperature, max_tokens)
        
        try:
            # Parse JSON
            parsed = json.loads(response.content.strip())
            
            # Validate against schema
            jsonschema.validate(parsed, schema)
            
            response.parsed_json = parsed
            return response
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response from {self.model}: {e}")
        except jsonschema.ValidationError as e:
            raise ValueError(f"JSON validation failed for {self.model}: {e}")

class LLMProviderError(Exception):
    """Base exception for LLM provider errors"""
    pass

class LLMRateLimitError(LLMProviderError):
    """Rate limit exceeded"""
    pass

class LLMQuotaError(LLMProviderError):
    """Quota exceeded"""
    pass

class LLMValidationError(LLMProviderError):
    """Response validation failed"""
    pass
