import pytest
from unittest.mock import Mock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from ..src.models.challenge import Challenge, ChallengeStatus
from ..src.models.user import User, UserRole
from ..src.routes.admin_ai import router
from ..src.services.ai_validator import AIValidator

app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_db():
    return Mock(spec=Session)

@pytest.fixture
def mock_user():
    return User(
        id='test-user',
        email='test@example.com',
        role=UserRole.ADMIN
    )

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
        status=ChallengeStatus.VALIDATION_FAILED,
        author_id='test-user',
        description='Test description'
    )

def test_retry_validation_not_found(client, mock_db, mock_user):
    with patch('..src.database.get_db', return_value=mock_db), \
         patch('..src.utils.auth.require_author', return_value=mock_user):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        response = client.post(
            '/challenges/test-id/validate',
            json={'validation_type': 'initial'}
        )
        
        assert response.status_code == 404
        assert response.json()['detail'] == 'Challenge not found'

def test_retry_validation_invalid_state(client, mock_db, mock_user, mock_challenge):
    mock_challenge.status = ChallengeStatus.PUBLISHED
    
    with patch('..src.database.get_db', return_value=mock_db), \
         patch('..src.utils.auth.require_author', return_value=mock_user):
        mock_db.query.return_value.filter.return_value.first.return_value = mock_challenge
        
        response = client.post(
            '/challenges/test-id/validate',
            json={'validation_type': 'initial'}
        )
        
        assert response.status_code == 400
        assert 'Challenge cannot be validated in status' in response.json()['detail']

@pytest.mark.asyncio
async def test_retry_validation_success(client, mock_db, mock_user, mock_challenge):
    mock_validation = Mock(
        id='test-validation',
        status='passed',
        score=85
    )
    
    with patch('..src.database.get_db', return_value=mock_db), \
         patch('..src.utils.auth.require_author', return_value=mock_user), \
         patch.object(AIValidator, 'validate_challenge', return_value=mock_validation):
        mock_db.query.return_value.filter.return_value.first.return_value = mock_challenge
        
        response = client.post(
            '/challenges/test-id/validate',
            json={'validation_type': 'initial'}
        )
        
        assert response.status_code == 200
        assert response.json()['validation_id'] == 'test-validation'
        assert response.json()['status'] == 'passed'
        assert response.json()['score'] == 85
        assert mock_challenge.status == ChallengeStatus.VALIDATION_PENDING
        mock_db.commit.assert_called()

@pytest.mark.asyncio
async def test_retry_validation_error(client, mock_db, mock_user, mock_challenge):
    with patch('..src.database.get_db', return_value=mock_db), \
         patch('..src.utils.auth.require_author', return_value=mock_user), \
         patch.object(AIValidator, 'validate_challenge', side_effect=Exception('Validation error')):
        mock_db.query.return_value.filter.return_value.first.return_value = mock_challenge
        
        response = client.post(
            '/challenges/test-id/validate',
            json={'validation_type': 'initial'}
        )
        
        assert response.status_code == 500
        assert 'Validation failed' in response.json()['detail']
        mock_db.rollback.assert_called_once()
