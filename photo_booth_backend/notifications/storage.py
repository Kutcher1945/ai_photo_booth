import base64
import io
import os
import uuid
from datetime import timedelta
from typing import List

import requests
from minio import Minio
from minio.error import S3Error


def get_minio_client() -> Minio:
    endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", os.getenv("MINIO_ROOT_USER", "minioadmin"))
    secret_key = os.getenv("MINIO_SECRET_KEY", os.getenv("MINIO_ROOT_PASSWORD", "minioadmin"))
    use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
    return Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=use_ssl)


def ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def _decode_data_url(data_url: str) -> bytes:
    # format: data:<mime>;base64,<data>
    if ";base64," not in data_url:
        raise ValueError("Invalid data URL")
    encoded = data_url.split(";base64,", 1)[1]
    return base64.b64decode(encoded)


def _fetch_binary(url: str) -> bytes:
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.content


def upload_photos_and_presign(photo_sources: List[str]) -> List[str]:
    """
    Accepts a list of photo sources (data URLs or http(s) URLs),
    uploads them to MinIO, and returns presigned URLs.
    """
    bucket = os.getenv("MINIO_BUCKET", "photobooth")
    client = get_minio_client()
    ensure_bucket(client, bucket)

    presigned_urls: List[str] = []

    for source in photo_sources:
        try:
            if source.startswith("data:"):
                content = _decode_data_url(source)
                content_type = source.split(";")[0].split("data:")[1] or "application/octet-stream"
            else:
                content = _fetch_binary(source)
                content_type = "image/jpeg"

            object_name = f"photos/{uuid.uuid4()}.jpg"
            content_stream = io.BytesIO(content)
            client.put_object(
                bucket_name=bucket,
                object_name=object_name,
                data=content_stream,
                length=len(content),
                content_type=content_type,
            )

            presigned = client.get_presigned_url(
                "GET",
                bucket_name=bucket,
                object_name=object_name,
                expires=timedelta(hours=24),  # 24 hours
            )

            # Replace internal Docker hostname with public endpoint
            public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", "localhost:9000")
            internal_endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
            presigned = presigned.replace(f"http://{internal_endpoint}", f"http://{public_endpoint}")
            presigned = presigned.replace(f"https://{internal_endpoint}", f"https://{public_endpoint}")

            presigned_urls.append(presigned)
        except (S3Error, requests.RequestException, ValueError) as exc:
            raise RuntimeError(f"Failed to upload photo: {exc}") from exc

    return presigned_urls
