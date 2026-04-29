"""Thin OpenRouter chat-completions client. Handles JSON-mode + retry/backoff."""
import asyncio
import os
import json
import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_RETRIES = 4
BASE_BACKOFF = 4.0  # seconds


class OpenRouterError(RuntimeError):
    pass


async def chat_json(model: str, system: str, user: str, temperature: float = 0.2, timeout: float = 90.0) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise OpenRouterError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mumzworld.com",
        "X-Title": "MomVoice",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    last_err: str = ""
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            except httpx.HTTPError as e:
                last_err = f"network: {e}"
                await asyncio.sleep(BASE_BACKOFF * (2 ** attempt))
                continue

            if resp.status_code == 200:
                data = resp.json()
                break

            last_err = f"{resp.status_code}: {resp.text[:300]}"
            # 429 (rate limit) and 5xx (provider hiccup) are retryable
            if resp.status_code == 429 or resp.status_code >= 500:
                # Honor Retry-After if present, else exponential backoff
                retry_after = resp.headers.get("retry-after")
                delay = float(retry_after) if retry_after else BASE_BACKOFF * (2 ** attempt)
                await asyncio.sleep(min(delay, 60))
                continue
            raise OpenRouterError(f"OpenRouter {last_err}")
        else:
            raise OpenRouterError(f"OpenRouter retries exhausted ({last_err})")

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise OpenRouterError(f"Malformed OpenRouter response: {e}")

    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.lower().startswith("json"):
            content = content[4:].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            return json.loads(content[start:end + 1])
        raise OpenRouterError(f"Model did not return JSON: {e}: {content[:300]}")
