import asyncio
import os
import json
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from .logging import get_logger
try:
    import redis  # type: ignore
except Exception:
    redis = None


logger = get_logger(__name__)


class GenerationStreamManager:
    """Manages websocket subscribers and event broadcasting for AI generation."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._incoming: Dict[str, asyncio.Queue] = {}
        self._control: Dict[str, asyncio.Queue] = {}
        self._meta: Dict[str, Dict[str, Any]] = {}
        # Optional Redis backend for cross-process streaming
        self._redis = None
        url = os.getenv('REDIS_URL')
        if url and redis is not None:
            try:
                self._redis = redis.from_url(url)
                # quick ping
                self._redis.ping()
                logger.info("Streaming will use Redis backend for cross-worker delivery")
            except Exception as e:
                logger.warning("Failed to init Redis for streaming", error=str(e))
                self._redis = None

    def _get_lock(self, stream_id: str) -> asyncio.Lock:
        if stream_id not in self._locks:
            self._locks[stream_id] = asyncio.Lock()
        return self._locks[stream_id]

    async def connect(self, stream_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._get_lock(stream_id):
            self._connections.setdefault(stream_id, set()).add(websocket)
        logger.info("Websocket connected", stream_id=stream_id)

    async def disconnect(self, stream_id: str, websocket: WebSocket) -> None:
        async with self._get_lock(stream_id):
            conns = self._connections.get(stream_id)
            if conns and websocket in conns:
                conns.remove(websocket)
                if not conns:
                    self._connections.pop(stream_id, None)
        logger.info("Websocket disconnected", stream_id=stream_id)

    async def publish(self, stream_id: str, event: Dict[str, Any]) -> None:
        # Ensure event has type
        event = {"type": event.get("type", "event"), **event}
        
        # Send to WebSocket connections if any exist
        conns = self._connections.get(stream_id, set())
        if conns:
            message = None
            try:
                message = json.dumps(event)
            except Exception:
                # Best effort stringify
                message = str(event)
            to_remove: Set[WebSocket] = set()
            for ws in list(conns):
                try:
                    await ws.send_text(message)
                except Exception:
                    to_remove.add(ws)
            if to_remove:
                async with self._get_lock(stream_id):
                    for ws in to_remove:
                        conns.discard(ws)
        
        # Also queue the event for SSE consumption
        await self.submit_incoming(stream_id, event)
        logger.info(f"Published event to stream {stream_id}: {event.get('type', 'unknown')}")

    def set_meta(self, stream_id: str, key: str, value: Any) -> None:
        self._meta.setdefault(stream_id, {})[key] = value

    def get_meta(self, stream_id: str, key: str, default: Any = None) -> Any:
        return self._meta.get(stream_id, {}).get(key, default)

    async def submit_incoming(self, stream_id: str, data: Dict[str, Any]) -> None:
        # Prefer Redis list if available
        if self._redis is not None:
            try:
                self._redis.rpush(f"ai:stream:{stream_id}", json.dumps(data))
                return
            except Exception as e:
                logger.warning("Redis rpush failed for stream", stream_id=stream_id, error=str(e))
        # Fallback to in-process queue
        async with self._get_lock(stream_id):
            if stream_id not in self._incoming:
                self._incoming[stream_id] = asyncio.Queue()
            await self._incoming[stream_id].put(data)

    async def get_next_incoming(self, stream_id: str, timeout_sec: float = 0.0) -> Optional[Dict[str, Any]]:
        # Prefer Redis list if available
        if self._redis is not None:
            try:
                # BLPOP returns (key, value) from the LEFT (FIFO). Use small blocking timeout.
                timeout = max(1, int(timeout_sec)) if timeout_sec else 1
                result = await asyncio.to_thread(self._redis.blpop, f"ai:stream:{stream_id}", timeout)
                if result is None:
                    return None
                _, value = result
                try:
                    return json.loads(value)
                except Exception:
                    return {"type": "event", "data": value.decode() if isinstance(value, (bytes, bytearray)) else str(value)}
            except Exception as e:
                logger.warning("Redis brpop failed for stream", stream_id=stream_id, error=str(e))
                # fall through to in-process
        # Fallback to in-process queue
        q = self._incoming.get(stream_id)
        if not q:
            return None
        if timeout_sec and timeout_sec > 0:
            try:
                return await asyncio.wait_for(q.get(), timeout=timeout_sec)
            except asyncio.TimeoutError:
                return None
        try:
            return q.get_nowait()
        except asyncio.QueueEmpty:
            return None

    async def submit_control(self, stream_id: str, data: Dict[str, Any]) -> None:
        # Prefer Redis list if available
        if self._redis is not None:
            try:
                self._redis.rpush(f"ai:control:{stream_id}", json.dumps(data))
                return
            except Exception as e:
                logger.warning("Redis rpush failed for control stream", stream_id=stream_id, error=str(e))
        # Fallback to in-process queue
        async with self._get_lock(stream_id):
            if stream_id not in self._control:
                self._control[stream_id] = asyncio.Queue()
            await self._control[stream_id].put(data)

    async def get_next_control(self, stream_id: str, timeout_sec: float = 0.0) -> Optional[Dict[str, Any]]:
        # Prefer Redis list if available
        if self._redis is not None:
            try:
                timeout = max(1, int(timeout_sec)) if timeout_sec else 1
                result = await asyncio.to_thread(self._redis.blpop, f"ai:control:{stream_id}", timeout)
                if result is None:
                    return None
                _, value = result
                try:
                    return json.loads(value)
                except Exception:
                    return {"type": "control", "data": value.decode() if isinstance(value, (bytes, bytearray)) else str(value)}
            except Exception as e:
                logger.warning("Redis blpop failed for control stream", stream_id=stream_id, error=str(e))
        # Fallback to in-process queue
        q = self._control.get(stream_id)
        if not q:
            return None
        if timeout_sec and timeout_sec > 0:
            try:
                return await asyncio.wait_for(q.get(), timeout=timeout_sec)
            except asyncio.TimeoutError:
                return None
        try:
            return q.get_nowait()
        except asyncio.QueueEmpty:
            return None



stream_manager = GenerationStreamManager()


