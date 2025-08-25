from celery import Celery
import docker
import json
import os
import tempfile
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)

app = Celery('cte-worker')

@app.task(bind=True)
def run_validator_container(self, validator_config: dict, submission_data: dict):
    """
    Run a validator container to check a submission
    
    Args:
        validator_config: ValidatorConfig model data
        submission_data: Contains flag, user_id, challenge_id, dynamic_seed
    """
    try:
        client = docker.from_env()
        
        # Create temporary directory for input/output
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Write submission data to input file
            input_file = temp_path / "submission.json"
            with open(input_file, 'w') as f:
                json.dump(submission_data, f)
            
            # Prepare container command
            cmd = validator_config.get('command', [])
            # Replace placeholders
            cmd = [
                arg.replace('{FLAG}', submission_data['flag'])
                   .replace('{SEED}', submission_data['dynamic_seed'])
                   .replace('{USER_ID}', submission_data['user_id'])
                for arg in cmd
            ]
            
            # Network configuration
            network_mode = 'none' if validator_config.get('network_policy') == 'none' else 'bridge'
            
            # Run container
            container = client.containers.run(
                validator_config['image'],
                command=cmd if cmd else None,
                volumes={str(temp_path): {'bind': '/in', 'mode': 'ro'}},
                working_dir='/app',
                network_mode=network_mode,
                mem_limit='256m',
                cpu_quota=50000,  # 0.5 CPU
                detach=True,
                remove=False,
                stdout=True,
                stderr=True
            )
            
            # Wait for completion with timeout
            timeout = validator_config.get('timeout_sec', 30)
            try:
                exit_code = container.wait(timeout=timeout)['StatusCode']
                
                # Get output
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                
                # Parse result
                if exit_code == 0:
                    try:
                        result = json.loads(stdout.strip())
                        if not isinstance(result, dict) or 'ok' not in result:
                            raise ValueError("Invalid validator response format")
                    except (json.JSONDecodeError, ValueError):
                        result = {
                            'ok': False,
                            'details': f"Invalid validator output: {stdout[:200]}"
                        }
                else:
                    result = {
                        'ok': False,
                        'details': f"Validator failed with exit code {exit_code}: {stderr[:200]}"
                    }
                
            except docker.errors.ContainerError as e:
                result = {
                    'ok': False,
                    'details': f"Container error: {str(e)}"
                }
            finally:
                # Clean up container
                try:
                    container.remove(force=True)
                except:
                    pass
        
        logger.info("Validator completed", 
                   challenge_id=submission_data.get('challenge_id'),
                   result=result)
        
        return result
        
    except Exception as e:
        logger.error("Validator execution failed", 
                    error=str(e),
                    challenge_id=submission_data.get('challenge_id'))
        return {
            'ok': False,
            'details': f"Validator execution failed: {str(e)}"
        }
