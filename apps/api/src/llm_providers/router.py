import os
from typing import Dict, Any, Optional, Literal
import structlog

from .base import LLMProvider, LLMResponse, LLMProviderError, LLMRateLimitError, LLMQuotaError
from .openai_gpt5 import OpenAIGPT5Provider
from .anthropic_claude import AnthropicClaudeProvider

logger = structlog.get_logger(__name__)

ProviderType = Literal["gpt5", "claude", "auto"]

class LLMRouter:
    """Load-balanced LLM router with fallback"""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available providers from environment"""
        
        # OpenAI GPT-5
        if openai_key := os.getenv("OPENAI_API_KEY"):
            try:
                self.providers["gpt5"] = OpenAIGPT5Provider(
                    api_key=openai_key,
                    base_url=os.getenv("OPENAI_BASE_URL")
                )
                logger.info("GPT-5 provider initialized")
            except Exception as e:
                logger.error("Failed to initialize GPT-5 provider", error=str(e))
        
        # Anthropic Claude
        if anthropic_key := os.getenv("ANTHROPIC_API_KEY"):
            try:
                self.providers["claude"] = AnthropicClaudeProvider(api_key=anthropic_key)
                logger.info("Claude provider initialized")
            except Exception as e:
                logger.error("Failed to initialize Claude provider", error=str(e))
        
        if not self.providers:
            logger.warning("No LLM providers configured")
    
    async def generate_json(
        self, 
        prompt: str, 
        schema: Dict[str, Any], 
        provider: ProviderType = "auto",
        temperature: float = 0.1, 
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Generate JSON with provider fallback"""
        
        if not self.providers:
            raise LLMProviderError("No LLM providers configured")
        
        # Determine provider order
        if provider == "auto":
            # Prefer GPT-5, fallback to Claude
            provider_order = ["gpt5", "claude"]
        elif provider in self.providers:
            provider_order = [provider]
        else:
            raise LLMProviderError(f"Provider {provider} not available")
        
        # Filter to available providers
        provider_order = [p for p in provider_order if p in self.providers]
        
        last_error = None
        
        for provider_name in provider_order:
            provider_instance = self.providers[provider_name]
            
            try:
                logger.info("Attempting generation", provider=provider_name)
                
                response = await provider_instance.generate_json(
                    prompt=prompt,
                    schema=schema,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                logger.info("Generation successful", 
                           provider=provider_name,
                           tokens=response.usage.total_tokens if response.usage else None)
                
                return response
                
            except (LLMRateLimitError, LLMQuotaError) as e:
                logger.warning("Provider unavailable, trying fallback", 
                              provider=provider_name, 
                              error=str(e))
                last_error = e
                continue
                
            except Exception as e:
                logger.error("Provider failed, trying fallback", 
                            provider=provider_name, 
                            error=str(e))
                last_error = e
                continue
        
        # All providers failed
        raise LLMProviderError(f"All providers failed. Last error: {last_error}")
    
    def get_available_providers(self) -> list[str]:
        """Get list of available providers"""
        return list(self.providers.keys())
    
    def is_configured(self) -> bool:
        """Check if any providers are configured"""
        return len(self.providers) > 0

# Global router instance
llm_router = LLMRouter()
