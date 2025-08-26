from celery import Celery
import os

# Create Celery app
app = Celery( 
    'cte-worker',
    broker_connection_retry_on_startup=True,
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379'),
    include=['tasks.validators', 'tasks.labs', 'tasks.notifications']
)

# Configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True
)

if __name__ == '__main__':
    app.start()
