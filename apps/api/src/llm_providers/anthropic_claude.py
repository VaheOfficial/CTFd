import anthropic
from typing import Optional
import structlog

from .base import LLMProvider, LLMResponse, LLMUsage, LLMProviderError, LLMRateLimitError, LLMQuotaError

logger = structlog.get_logger(__name__)

class AnthropicClaudeProvider(LLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, "claude-3-5-sonnet-latest", base_url)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
    
    async def generate_text(
        self, 
        prompt: str, 
        temperature: float = 0.1, 
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Generate text using Claude"""
        
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system="You are an expert cybersecurity challenge designer focused on defensive operations.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text
            
            # Parse usage stats
            usage = None
            if response.usage:
                usage = LLMUsage(
                    prompt_tokens=response.usage.input_tokens,
                    completion_tokens=response.usage.output_tokens,
                    total_tokens=response.usage.input_tokens + response.usage.output_tokens,
                    cost_usd=self._calculate_cost(response.usage)
                )
            
            logger.info("Claude generation successful", 
                       tokens=usage.total_tokens if usage else None,
                       cost_usd=usage.cost_usd if usage else None)
            
            return LLMResponse(
                content=content,
                parsed_json=None,
                usage=usage,
                provider="anthropic",
                model=self.model
            )
            
        except anthropic.RateLimitError as e:
            logger.error("Claude rate limit exceeded", error=str(e))
            raise LLMRateLimitError(f"Claude rate limit: {e}")
        
        except anthropic.APIError as e:
            if "quota" in str(e).lower() or "credit" in str(e).lower():
                logger.error("Claude quota exceeded", error=str(e))
                raise LLMQuotaError(f"Claude quota exceeded: {e}")
            else:
                logger.error("Claude API error", error=str(e))
                raise LLMProviderError(f"Claude error: {e}")
        
        except Exception as e:
            logger.error("Claude unexpected error", error=str(e))
            raise LLMProviderError(f"Claude unexpected error: {e}")
    
    def _calculate_cost(self, usage) -> float:
        """Calculate approximate cost in USD"""
        # Claude 3.5 Sonnet pricing
        input_cost_per_1k = 0.003  # $0.003 per 1K input tokens
        output_cost_per_1k = 0.015  # $0.015 per 1K output tokens
        
        input_cost = (usage.input_tokens / 1000) * input_cost_per_1k
        output_cost = (usage.output_tokens / 1000) * output_cost_per_1k
        
        return round(input_cost + output_cost, 6)
