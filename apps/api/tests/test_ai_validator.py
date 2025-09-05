import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from datetime import datetime

from ..src.models.challenge import Challenge, ValidationResult, ChallengeStatus
from ..src.services.ai_validator import AIValidator
from ..src.llm_providers.router import LLMResponse, LLMUsage

@pytest.fixture
def mock_db():
    return Mock(spec=Session)

@pytest.fixture
def mock_challenge():
    return Challenge(
        id='test-id',
        slug='test-challenge',
        title='Test Challenge',
        track='INTEL_RECON',
        difficulty='MEDIUM',
        points_base=100,
        time_cap_minutes=60,
        mode='solo',
        status=ChallengeStatus.VALIDATION_PENDING,
        author_id='test-author',
        description='Test description'
    )

@pytest.fixture
def mock_llm_response():
    return LLMResponse(
        content='',
        parsed_json={
            'score': 85,
            'status': 'passed',
            'feedback': 'Good challenge overall',
            'details': {
                'description_clarity': 90,
                'solution_completeness': 85,
                'difficulty_appropriateness': 80,
                'points_fairness': 85,
                'artifacts_quality': 85,
                'improvement_suggestions': [
                    'Add more context to the description',
                    'Consider adding a hint'
                ]
            }
        },
        usage=LLMUsage(
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            cost_usd=0.01
        ),
        provider='test',
        model='test-model'
    )

@pytest.mark.asyncio
async def test_validate_challenge_initial_success(mock_db, mock_challenge, mock_llm_response):
    with patch('..src.llm_providers.router.llm_router.generate_json', return_value=mock_llm_response):
        validator = AIValidator(mock_db)
        result = await validator.validate_challenge(mock_challenge, 'initial')
        
        assert result.status == 'passed'
        assert result.score == 85
        assert mock_challenge.status == ChallengeStatus.READY_FOR_MATERIALIZATION
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_validate_challenge_initial_failure(mock_db, mock_challenge, mock_llm_response):
    failed_response = mock_llm_response
    failed_response.parsed_json['status'] = 'failed'
    failed_response.parsed_json['score'] = 45
    
    with patch('..src.llm_providers.router.llm_router.generate_json', return_value=failed_response):
        validator = AIValidator(mock_db)
        result = await validator.validate_challenge(mock_challenge, 'initial')
        
        assert result.status == 'failed'
        assert result.score == 45
        assert mock_challenge.status == ChallengeStatus.VALIDATION_FAILED
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_validate_challenge_post_materialization_success(mock_db, mock_challenge, mock_llm_response):
    mock_challenge.status = ChallengeStatus.MATERIALIZATION_PENDING
    
    with patch('..src.llm_providers.router.llm_router.generate_json', return_value=mock_llm_response):
        validator = AIValidator(mock_db)
        result = await validator.validate_challenge(mock_challenge, 'post_materialization')
        
        assert result.status == 'passed'
        assert result.score == 85
        assert mock_challenge.status == ChallengeStatus.READY_FOR_PUBLISHING
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_validate_challenge_post_materialization_failure(mock_db, mock_challenge, mock_llm_response):
    mock_challenge.status = ChallengeStatus.MATERIALIZATION_PENDING
    failed_response = mock_llm_response
    failed_response.parsed_json['status'] = 'failed'
    failed_response.parsed_json['score'] = 45
    
    with patch('..src.llm_providers.router.llm_router.generate_json', return_value=failed_response):
        validator = AIValidator(mock_db)
        result = await validator.validate_challenge(mock_challenge, 'post_materialization')
        
        assert result.status == 'failed'
        assert result.score == 45
        assert mock_challenge.status == ChallengeStatus.VALIDATION_FAILED
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_validate_challenge_llm_error(mock_db, mock_challenge):
    with patch('..src.llm_providers.router.llm_router.generate_json', side_effect=Exception('LLM error')):
        validator = AIValidator(mock_db)
        with pytest.raises(Exception) as exc:
            await validator.validate_challenge(mock_challenge, 'initial')
        assert str(exc.value) == 'LLM error'
        mock_db.rollback.assert_called_once()
