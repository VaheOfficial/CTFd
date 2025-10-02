"""
Docker client helper that properly initializes Unix socket support
"""
import docker
import os
import requests
import requests_unixsocket

# Register Unix socket adapter with requests
requests_unixsocket.monkeypatch()

def get_docker_client():
    """
    Get a properly configured Docker client that can connect via Unix socket.
    
    Returns:
        docker.DockerClient: Configured Docker client instance
    """
    # Ensure DOCKER_HOST is set for Unix socket
    if not os.getenv('DOCKER_HOST'):
        os.environ['DOCKER_HOST'] = 'unix:///var/run/docker.sock'
    
    # Create client from environment
    client = docker.from_env()
    return client

