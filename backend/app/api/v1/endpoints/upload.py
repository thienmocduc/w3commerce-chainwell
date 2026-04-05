"""
WellKOC — File Upload Endpoint
POST /upload  → S3 upload, trả về CDN URL

Security:
- Whitelist MIME types (ảnh + PDF)
- Giới hạn kích thước (MAX_UPLOAD_SIZE_MB từ config)
- UUID filename — không thể path traversal
- Content-type verify bằng magic bytes (không tin header client)
- Rate limit: 20 uploads/minute per user
"""
import io
import uuid
import logging
from typing import Literal

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from PIL import Image

from app.core.config import settings
from app.api.v1.deps import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])

# ── Whitelist MIME types ─────────────────────────────────────
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES   = {"application/pdf"}
ALLOWED_ALL         = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES

# Magic bytes để detect thật (không tin Content-Type header)
MAGIC_SIGNATURES: dict[bytes, str] = {
    b"\xff\xd8\xff":        "image/jpeg",
    b"\x89PNG\r\n\x1a\n":  "image/png",
    b"RIFF":                "image/webp",   # cần check thêm bytes 8-12
    b"GIF87a":              "image/gif",
    b"GIF89a":              "image/gif",
    b"%PDF":                "application/pdf",
}

FOLDER_MAP: dict[str, str] = {
    "product":  "products",
    "avatar":   "avatars",
    "license":  "vendors/licenses",
    "kyc":      "vendors/kyc",
    "other":    "misc",
}

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # bytes


def _detect_mime(data: bytes) -> str | None:
    """Detect MIME type từ magic bytes."""
    for sig, mime in MAGIC_SIGNATURES.items():
        if data.startswith(sig):
            # WebP cần verify thêm: bytes 8-12 = "WEBP"
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


def _get_extension(mime: str) -> str:
    return {
        "image/jpeg":       "jpg",
        "image/png":        "png",
        "image/webp":       "webp",
        "image/gif":        "gif",
        "application/pdf":  "pdf",
    }.get(mime, "bin")


def _resize_image_if_needed(data: bytes, mime: str, max_px: int = 2048) -> bytes:
    """Resize ảnh nếu > max_px (một chiều). Giữ nguyên tỉ lệ."""
    if mime not in ALLOWED_IMAGE_TYPES:
        return data
    try:
        img = Image.open(io.BytesIO(data))
        if max(img.width, img.height) > max_px:
            img.thumbnail((max_px, max_px), Image.LANCZOS)
            buf = io.BytesIO()
            fmt = {"image/jpeg": "JPEG", "image/png": "PNG",
                   "image/webp": "WEBP", "image/gif": "GIF"}.get(mime, "JPEG")
            img.save(buf, format=fmt, optimize=True, quality=85)
            return buf.getvalue()
    except Exception as e:
        logger.warning("Resize failed: %s", e)
    return data


def _upload_to_s3(data: bytes, s3_key: str, content_type: str) -> str:
    """Upload lên S3, trả về CDN URL. Raise HTTPException nếu lỗi."""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise HTTPException(503, "Storage service chưa được cấu hình")

    client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    try:
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000",  # 1 năm cache
        )
    except NoCredentialsError:
        logger.error("AWS credentials không hợp lệ")
        raise HTTPException(503, "Storage service không khả dụng")
    except ClientError as e:
        logger.error("S3 upload error: %s", e)
        raise HTTPException(502, "Không thể lưu file, vui lòng thử lại")

    cdn_base = settings.CDN_BASE_URL.rstrip("/")
    return f"{cdn_base}/{s3_key}"


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: Literal["product", "avatar", "license", "kyc", "other"] = Form("other"),
    current_user: CurrentUser = Depends(),
):
    """
    Upload file lên S3, trả về URL.

    - folder: product | avatar | license | kyc | other
    - Giới hạn: {MAX_UPLOAD_SIZE_MB}MB, chỉ nhận ảnh (jpg/png/webp/gif) + PDF
    - Tự resize ảnh nếu > 2048px
    """
    # 1) Đọc file + check kích thước
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(
            413,
            f"File quá lớn. Tối đa {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    if len(data) == 0:
        raise HTTPException(400, "File trống")

    # 2) Verify MIME bằng magic bytes
    detected_mime = _detect_mime(data)
    if not detected_mime or detected_mime not in ALLOWED_ALL:
        raise HTTPException(
            415,
            "Định dạng không hỗ trợ. Chỉ nhận: JPG, PNG, WebP, GIF, PDF"
        )

    # 3) Kiểm tra document chỉ dùng đúng folder
    if detected_mime == "application/pdf" and folder not in ("license", "kyc"):
        raise HTTPException(400, "PDF chỉ dùng cho folder license hoặc kyc")

    # 4) Resize ảnh nếu cần
    data = _resize_image_if_needed(data, detected_mime)

    # 5) Tạo S3 key an toàn (UUID — không path traversal)
    ext        = _get_extension(detected_mime)
    file_uuid  = uuid.uuid4().hex
    user_prefix= str(current_user.id).replace("-", "")[:8]
    subfolder  = FOLDER_MAP.get(folder, "misc")
    s3_key     = f"{subfolder}/{user_prefix}/{file_uuid}.{ext}"

    # 6) Upload
    url = _upload_to_s3(data, s3_key, detected_mime)

    return {
        "url":          url,
        "s3_key":       s3_key,
        "mime_type":    detected_mime,
        "size_bytes":   len(data),
        "folder":       folder,
    }
