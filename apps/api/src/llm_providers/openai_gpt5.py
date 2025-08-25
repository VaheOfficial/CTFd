import openai
from typing import Optional
import structlog

from .base import LLMProvider, LLMResponse, LLMUsage, LLMProviderError, LLMRateLimitError, LLMQuotaError

logger = structlog.get_logger(__name__)

class OpenAIGPT5Provider(LLMProvider):
    """OpenAI GPT-5 provider"""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, "gpt-5", base_url)
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1"
        )
    
    async def generate_text(
        self, 
        prompt: str, 
        temperature: float = 0.1, 
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Generate text using GPT-5"""
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert cybersecurity challenge designer focused on defensive operations."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"} if "JSON" in prompt else {"type": "text"}
            )
            
            content = response.choices[0].message.content
            
            # Parse usage stats
            usage = None
            if response.usage:
                usage = LLMUsage(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    total_tokens=response.usage.total_tokens,
                    cost_usd=self._calculate_cost(response.usage)
                )
            
            logger.info("GPT-5 generation successful", 
                       tokens=usage.total_tokens if usage else None,
                       cost_usd=usage.cost_usd if usage else None)
            
            return LLMResponse(
                content=content,
                parsed_json=None,
                usage=usage,
                provider="openai",
                model=self.model
            )
            
        except openai.RateLimitError as e:
            logger.error("GPT-5 rate limit exceeded", error=str(e))
            raise LLMRateLimitError(f"GPT-5 rate limit: {e}")
        
        except openai.APIError as e:
            if "quota" in str(e).lower():
                logger.error("GPT-5 quota exceeded", error=str(e))
                raise LLMQuotaError(f"GPT-5 quota exceeded: {e}")
            else:
                logger.error("GPT-5 API error", error=str(e))
                raise LLMProviderError(f"GPT-5 error: {e}")
        
        except Exception as e:
            logger.error("GPT-5 unexpected error", error=str(e))
            raise LLMProviderError(f"GPT-5 unexpected error: {e}")
    
    def _calculate_cost(self, usage) -> float:
        """Calculate approximate cost in USD"""
        # GPT-5 pricing (estimated - update with actual pricing)
        input_cost_per_1k = 0.03  # $0.03 per 1K input tokens
        output_cost_per_1k = 0.06  # $0.06 per 1K output tokens
        
        input_cost = (usage.prompt_tokens / 1000) * input_cost_per_1k
        output_cost = (usage.completion_tokens / 1000) * output_cost_per_1k
        
        return round(input_cost + output_cost, 6)
