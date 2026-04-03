"""
WellKOC Platform — Core Configuration
Centralized settings using Pydantic Settings v2
"""
import hashlib
import hmac
from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────
    APP_NAME: str = "WellKOC"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = Field(..., min_length=32)
    ALLOWED_HOSTS: list[str] = ["*"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://wellkoc.com",
        "https://www.wellkoc.com",
        "https://app.wellkoc.com",
        "https://wellkoc.netlify.app",
        "https://wellkoc-api.onrender.com",
    ]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://wellkoc:wellkoc_dev@localhost:5432/wellkoc"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # ── Redis ───────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    # ── Elasticsearch ───────────────────────────
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # ── Blockchain / Polygon ────────────────────
    POLYGON_RPC_URL: str = "https://polygon-rpc.com"
    POLYGON_TESTNET_RPC: str = "https://rpc-amoy.polygon.technology"
    WALLET_PRIVATE_KEY: str = ""
    COMMISSION_CONTRACT_ADDRESS: str = ""
    DPP_FACTORY_ADDRESS: str = ""
    WK_TOKEN_ADDRESS: str = ""
    CHAIN_ID: int = 137  # Polygon Mainnet (80002 = Amoy testnet)
    GAS_PRICE_GWEI: int = 200

    # ── Payments ────────────────────────────────
    VNPAY_TMN_CODE: str = ""
    VNPAY_HASH_SECRET: str = ""
    VNPAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = "http://localhost:5173/payment/vnpay/return"

    MOMO_PARTNER_CODE: str = ""
    MOMO_ACCESS_KEY: str = ""
    MOMO_SECRET_KEY: str = ""
    MOMO_ENDPOINT: str = "https://test-payment.momo.vn/v2/gateway/api/create"

    PAYOS_CLIENT_ID: str = ""
    PAYOS_API_KEY: str = ""
    PAYOS_CHECKSUM_KEY: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── AI / Anthropic ──────────────────────────
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"
    AI_RATE_LIMIT_PER_MIN: int = 60

    # ── AI / Google Gemini ───────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"          # Flash = cost-efficient
    GEMINI_FALLBACK_MODEL: str = "gemini-2.0-flash"  # Hard fallback

    # ── Storage ─────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "wellkoc-media"
    AWS_REGION: str = "ap-southeast-1"
    CDN_BASE_URL: str = "https://cdn.wellkoc.com"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ── IPFS ────────────────────────────────────
    PINATA_API_KEY: str = ""
    PINATA_SECRET: str = ""
    PINATA_GATEWAY: str = "https://gateway.pinata.cloud/ipfs/"

    # ── Notifications ───────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE: str = ""
    FCM_SERVER_KEY: str = ""

    # ── VNeID (Dinh danh dien tu) ───────────────
    VNEID_CLIENT_ID: str = ""
    VNEID_CLIENT_SECRET: str = ""
    VNEID_REDIRECT_URI: str = "https://wellkoc.com/verify/vneid/callback"

    # ── Shipping ────────────────────────────────
    GHN_TOKEN: str = ""
    GHN_SHOP_ID: int = 0
    GHTK_TOKEN: str = ""

    # ── Supabase ─────────────────────────────────
    # JWT Secret from Supabase Dashboard → Project Settings → API → JWT Secret
    # Required so backend can validate Supabase-issued access tokens.
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # ── Domain Security Token ────────────────────
    # Optional override — set WK_ACCESS_TOKEN in Render + VITE_WK_ACCESS_TOKEN
    # in frontend build env so both sides share the same literal token.
    # Leave blank to use HMAC auto-derivation from SECRET_KEY.
    WK_ACCESS_TOKEN: str = ""

    # ── Monitoring ──────────────────────────────
    SENTRY_DSN: str = ""
    PROMETHEUS_METRICS_PATH: str = "/metrics"

    # ── Commission Rates (%) ────────────────────
    COMMISSION_T1_RATE: float = 0.40   # 40%
    COMMISSION_T2_RATE: float = 0.13   # 13%
    COMMISSION_POOL_A: float = 0.09    # 9%
    COMMISSION_POOL_B: float = 0.05    # 5%
    COMMISSION_POOL_C: float = 0.03    # 3%
    COMMISSION_PLATFORM: float = 0.30  # 30%

    # ── Pagination ──────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @field_validator("DATABASE_URL")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        """Render provides postgres:// but asyncpg needs postgresql+asyncpg://"""
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def wk_api_token(self) -> str:
        """Return the domain-bound access token.
        Uses WK_ACCESS_TOKEN env var if set (recommended for production so the
        frontend can share the same literal value via VITE_WK_ACCESS_TOKEN).
        Falls back to an HMAC-SHA256 derivation from SECRET_KEY — competitors
        cannot reproduce the token without the private key."""
        if self.WK_ACCESS_TOKEN:
            return self.WK_ACCESS_TOKEN
        return hmac.new(
            self.SECRET_KEY.encode("utf-8"),
            b"wk-api-access-2026@wellkoc.com",
            hashlib.sha256,
        ).hexdigest()[:24]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
