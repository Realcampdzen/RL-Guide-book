# -*- coding: utf-8 -*-
"""
Image generation providers for POST /api/images/generate and gerb-generate.
Interface: generate(prompt, size?, **kwargs) -> Optional[str], process(image_base64, prompt, **kwargs) -> Optional[str].

Providers:
  - openai    : OpenAI DALL-E / GPT Image (requires OPENAI_API_KEY)
  - fusionbrain: Kandinsky via FusionBrain API (requires FUSIONBRAIN_API_KEY + FUSIONBRAIN_SECRET_KEY)
  - stub      : returns a 1x1 transparent PNG placeholder (no external calls)
  - auto      : fallback chain: openai -> fusionbrain -> stub
"""
from typing import Optional, Callable, Tuple
import os
import time
import base64


# ---------------------------------------------------------------------------
# Stub placeholder: 1x1 transparent PNG (valid image, always succeeds)
# ---------------------------------------------------------------------------
# Smallest valid PNG: 1x1 pixel, RGBA transparent
_STUB_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB"
    "Nl7BcQAAAABJRU5ErkJggg=="
)


def _extract_b64_from_response(response) -> Optional[str]:
    """Extract base64 payload from OpenAI Images response (b64_json or fallback URL)."""
    data = getattr(response, "data", None) or []
    if not data:
        return None
    item = data[0]
    b64 = getattr(item, "b64_json", None)
    if isinstance(b64, str) and b64.strip():
        return b64
    url = getattr(item, "url", None)
    if isinstance(url, str) and url.strip():
        try:
            import urllib.request
            with urllib.request.urlopen(url, timeout=30) as r:
                raw = r.read()
            if raw:
                return base64.b64encode(raw).decode("ascii")
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------

def _openai_generate(
    prompt: str,
    size: str = "1024x1536",
    api_key: Optional[str] = None,
    **kwargs,
) -> Optional[str]:
    """OpenAI text-to-image. Returns base64 image or None."""
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=key)
        last_error = None
        for model in ("gpt-image-1.5", "gpt-image-1"):
            try:
                response = client.images.generate(
                    model=model,
                    prompt=prompt,
                    size=size,
                    quality="medium",
                )
                result = _extract_b64_from_response(response)
                if result:
                    return result
            except Exception as e:
                last_error = e
        if last_error is not None:
            print(f"[image_providers] OpenAI generate failed: {last_error}")
    except Exception as e:
        print(f"[image_providers] OpenAI client init/generate failed: {e}")
        return None
    return None


def _openai_process(
    image_base64: str,
    prompt: str,
    api_key: Optional[str] = None,
    **kwargs,
) -> Optional[str]:
    """OpenAI image edit (image + prompt). Returns base64 image or None."""
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key or not image_base64:
        return None
    try:
        from openai import OpenAI
        import tempfile
        client = OpenAI(api_key=key)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(base64.b64decode(image_base64))
            path = f.name
        try:
            last_error = None
            for model in ("gpt-image-1.5", "gpt-image-1", "dall-e-2"):
                try:
                    with open(path, "rb") as img_file:
                        response = client.images.edit(
                            image=img_file,
                            prompt=prompt,
                            model=model,
                            size="1024x1024",
                        )
                    result = _extract_b64_from_response(response)
                    if result:
                        return result
                except Exception as e:
                    last_error = e
            if last_error is not None:
                print(f"[image_providers] OpenAI edit failed: {last_error}")
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception as e:
        print(f"[image_providers] OpenAI edit init failed: {e}")
        return None
    return None


# ---------------------------------------------------------------------------
# FusionBrain (Kandinsky) provider
# ---------------------------------------------------------------------------

def _fusionbrain_generate(
    prompt: str,
    size: str = "1024x1536",
    api_key: Optional[str] = None,
    **kwargs,
) -> Optional[str]:
    """
    FusionBrain Kandinsky text-to-image.
    API: https://api-key.fusionbrain.ai/
    Requires FUSIONBRAIN_API_KEY and FUSIONBRAIN_SECRET_KEY env vars.
    Returns base64 image or None.
    """
    fb_api_key = (api_key or os.getenv("FUSIONBRAIN_API_KEY") or "").strip()
    fb_secret = os.getenv("FUSIONBRAIN_SECRET_KEY", "").strip()
    if not fb_api_key or not fb_secret:
        print("[image_providers] FusionBrain: missing API key or secret key")
        return None

    try:
        import json
        import urllib.request
        import urllib.error

        api_base = "https://api-key.fusionbrain.ai/key/api/v1"
        headers_auth = {
            "X-Key": f"Key {fb_api_key}",
            "X-Secret": f"Secret {fb_secret}",
        }

        # Step 1: Get available model ID
        try:
            req_models = urllib.request.Request(
                f"{api_base}/models",
                headers=headers_auth,
                method="GET",
            )
            with urllib.request.urlopen(req_models, timeout=10) as resp:
                models = json.loads(resp.read().decode("utf-8"))
            if not models or not isinstance(models, list):
                print("[image_providers] FusionBrain: no models available")
                return None
            model_id = models[0].get("id")
        except Exception as e:
            print(f"[image_providers] FusionBrain models fetch failed: {e}")
            return None

        # Step 2: Submit generation task
        # Parse size
        try:
            w, h = size.split("x")
            width, height = int(w), int(h)
        except (ValueError, AttributeError):
            width, height = 1024, 1536

        params_json = json.dumps({
            "type": "GENERATE",
            "numImages": 1,
            "width": width,
            "height": height,
            "generateParams": {"query": prompt},
        })

        # Multipart form data for FusionBrain API
        boundary = f"----FusionBrainBoundary{int(time.time() * 1000)}"
        body_parts = []

        # model_id field
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append('Content-Disposition: form-data; name="model_id"\r\n\r\n')
        body_parts.append(f"{model_id}\r\n")

        # params field
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append('Content-Disposition: form-data; name="params"; filename="params.json"\r\n')
        body_parts.append("Content-Type: application/json\r\n\r\n")
        body_parts.append(f"{params_json}\r\n")

        body_parts.append(f"--{boundary}--\r\n")
        body_bytes = "".join(body_parts).encode("utf-8")

        submit_headers = dict(headers_auth)
        submit_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"

        req_submit = urllib.request.Request(
            f"{api_base}/text2image/run",
            data=body_bytes,
            headers=submit_headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req_submit, timeout=15) as resp:
                submit_result = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[image_providers] FusionBrain submit failed: {e}")
            return None

        task_uuid = submit_result.get("uuid")
        if not task_uuid:
            print(f"[image_providers] FusionBrain: no uuid in response: {submit_result}")
            return None

        # Step 3: Poll for result (max 30s, every 2s)
        max_attempts = 15
        for attempt in range(max_attempts):
            time.sleep(2)
            try:
                req_status = urllib.request.Request(
                    f"{api_base}/text2image/status/{task_uuid}",
                    headers=headers_auth,
                    method="GET",
                )
                with urllib.request.urlopen(req_status, timeout=10) as resp:
                    status_result = json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                print(f"[image_providers] FusionBrain poll #{attempt+1} failed: {e}")
                continue

            status = status_result.get("status")
            if status == "DONE":
                images = status_result.get("images") or []
                if images and isinstance(images, list) and images[0]:
                    return images[0]  # base64 string
                print("[image_providers] FusionBrain: DONE but no images")
                return None
            elif status == "FAIL":
                error_desc = status_result.get("errorDescription", "unknown error")
                print(f"[image_providers] FusionBrain task failed: {error_desc}")
                return None
            # INITIAL or PROCESSING — continue polling

        print("[image_providers] FusionBrain: polling timeout (30s)")
        return None

    except Exception as e:
        print(f"[image_providers] FusionBrain generate failed: {e}")
        return None


def _fusionbrain_process(image_base64: str, prompt: str, **kwargs) -> Optional[str]:
    """FusionBrain image edit — not supported, returns None."""
    return None


# ---------------------------------------------------------------------------
# Stub provider (always succeeds with placeholder)
# ---------------------------------------------------------------------------

def _stub_generate(prompt: str, size: str = "1024x1536", **kwargs) -> Optional[str]:
    """Stub: returns 1x1 transparent PNG placeholder. Always succeeds."""
    return _STUB_PNG_B64


def _stub_process(image_base64: str, prompt: str, **kwargs) -> Optional[str]:
    """Stub: returns the input image unchanged (pass-through)."""
    return image_base64 if image_base64 else _STUB_PNG_B64


# ---------------------------------------------------------------------------
# Auto fallback chain: openai -> fusionbrain -> stub
# ---------------------------------------------------------------------------

def _auto_generate(prompt: str, size: str = "1024x1536", api_key: Optional[str] = None, **kwargs) -> Optional[str]:
    """Try OpenAI, then FusionBrain, then Stub."""
    result = _openai_generate(prompt, size, api_key=api_key, **kwargs)
    if result:
        return result
    print("[image_providers] auto: OpenAI failed, trying FusionBrain...")
    result = _fusionbrain_generate(prompt, size, **kwargs)
    if result:
        return result
    print("[image_providers] auto: FusionBrain failed, falling back to stub")
    return _stub_generate(prompt, size, **kwargs)


def _auto_process(image_base64: str, prompt: str, api_key: Optional[str] = None, **kwargs) -> Optional[str]:
    """Try OpenAI, then stub pass-through."""
    result = _openai_process(image_base64, prompt, api_key=api_key, **kwargs)
    if result:
        return result
    return _stub_process(image_base64, prompt, **kwargs)


# ---------------------------------------------------------------------------
# Provider registry: name -> (generate_fn, process_fn)
# ---------------------------------------------------------------------------
_PROVIDERS: dict[str, Tuple[
    Callable[..., Optional[str]],
    Callable[..., Optional[str]],
]] = {
    "openai": (_openai_generate, _openai_process),
    "fusionbrain": (_fusionbrain_generate, _fusionbrain_process),
    "fusion_brain": (_fusionbrain_generate, _fusionbrain_process),  # alias
    "stub": (_stub_generate, _stub_process),
    "auto": (_auto_generate, _auto_process),
    # Legacy stubs (kept for backward compatibility)
    "yandex_art": (_stub_generate, _stub_process),
    "gigachat": (_stub_generate, _stub_process),
    "alice": (_stub_generate, _stub_process),
}


def get_image_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Tuple[
    Callable[..., Optional[str]],
    Callable[..., Optional[str]],
]:
    """
    Returns (generate_fn, process_fn) for the given provider.
    Unknown provider falls back to 'openai'.
    """
    name = (provider_name or os.getenv("IMAGE_PROVIDER", "openai") or "openai").strip().lower()
    if name not in _PROVIDERS:
        name = "openai"
    gen, proc = _PROVIDERS[name]
    # Bind api_key for providers that accept it
    if name in ("openai", "auto") and api_key is not None:

        def _gen(prompt: str, size: str = "1024x1536", **kw):
            return gen(prompt, size, api_key=api_key, **kw)

        def _proc(img_b64: str, prompt: str, **kw):
            return proc(img_b64, prompt, api_key=api_key, **kw)

        return _gen, _proc
    return gen, proc
