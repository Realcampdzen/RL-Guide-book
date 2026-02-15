# -*- coding: utf-8 -*-
"""
Image generation providers for POST /api/images/generate and gerb-generate.
Interface: generate(prompt, size?, **kwargs) -> Optional[str], process(image_base64, prompt, **kwargs) -> Optional[str].
"""
from typing import Optional, Callable, Tuple
import os


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
            import base64
            import urllib.request
            with urllib.request.urlopen(url, timeout=30) as r:
                raw = r.read()
            if raw:
                return base64.b64encode(raw).decode("ascii")
        except Exception:
            return None
    return None


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
        # Images edit API expects a file path; write base64 to temp file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            import base64
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


def _stub_generate(prompt: str, size: str = "1024x1536", **kwargs) -> Optional[str]:
    """Stub: not implemented. Returns None."""
    return None


def _stub_process(image_base64: str, prompt: str, **kwargs) -> Optional[str]:
    """Stub: not implemented. Returns None."""
    return None


# Provider registry: name -> (generate_fn, process_fn)
_PROVIDERS: dict[str, Tuple[
    Callable[..., Optional[str]],
    Callable[..., Optional[str]],
]] = {
    "openai": (_openai_generate, _openai_process),
    "fusion_brain": (_stub_generate, _stub_process),
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
    Unknown provider falls back to 'openai'. Stubs accept but ignore api_key.
    """
    name = (provider_name or os.getenv("IMAGE_PROVIDER", "openai") or "openai").strip().lower()
    if name not in _PROVIDERS:
        name = "openai"
    gen, proc = _PROVIDERS[name]
    # Bind api_key for OpenAI so callers can pass once
    if name == "openai" and api_key is not None:

        def _gen(prompt: str, size: str = "1024x1536", **kw):
            return _openai_generate(prompt, size, api_key=api_key, **kw)

        def _proc(img_b64: str, prompt: str, **kw):
            return _openai_process(img_b64, prompt, api_key=api_key, **kw)

        return _gen, _proc
    return gen, proc
