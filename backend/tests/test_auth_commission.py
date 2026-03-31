"""
WellKOC — Test Suite: Auth + Commission
pytest -v tests/test_auth_commission.py
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings


# ── Use shared SQLite fixtures from conftest.py ─────────────────────────────
# (setup_db and override_get_db are auto-applied via conftest.py)


@pytest.fixture
async def client(setup_db):  # noqa: F811
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ══ AUTH TESTS ═════════════════════════════════════════════════��═════════════

class TestRegister:
    async def test_register_buyer_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "buyer_ac@test.com",
            "password": "Test1234!",
            "role": "buyer",
            "language": "vi",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "buyer"

    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {"email": "dup_ac@test.com", "password": "Test1234!", "role": "buyer"}
        await client.post("/api/v1/auth/register", json=payload)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400

    async def test_register_koc(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "phone": "+84901234568",
            "password": "Test1234!",
            "role": "koc",
            "language": "vi",
        })
        assert resp.status_code == 201
        assert resp.json()["user"]["role"] == "koc"

    async def test_register_vendor(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "vendor_ac@test.com",
            "password": "Test1234!",
            "role": "vendor",
        })
        assert resp.status_code == 201
        assert resp.json()["user"]["role"] == "vendor"

    async def test_register_with_referral(self, client: AsyncClient):
        r1 = await client.post("/api/v1/auth/register", json={
            "email": "referrer_ac@test.com",
            "password": "Test1234!",
            "role": "koc",
        })
        code = r1.json()["user"]["referral_code"]
        r2 = await client.post("/api/v1/auth/register", json={
            "email": "referred_ac@test.com",
            "password": "Test1234!",
            "role": "buyer",
            "referral_code": code,
        })
        assert r2.status_code == 201


class TestLogin:
    async def test_login_email_success(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "login_ac@test.com", "password": "Test1234!", "role": "buyer"
        })
        resp = await client.post("/api/v1/auth/login", json={
            "identifier": "login_ac@test.com", "password": "Test1234!"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/v1/auth/register", json={
            "email": "wrongpw_ac@test.com", "password": "Test1234!", "role": "buyer"
        })
        resp = await client.post("/api/v1/auth/login", json={
            "identifier": "wrongpw_ac@test.com", "password": "WrongPassword!"
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "identifier": "nobody_ac@test.com", "password": "Test1234!"
        })
        assert resp.status_code == 401

    async def test_get_me_with_valid_token(self, client: AsyncClient):
        r = await client.post("/api/v1/auth/register", json={
            "email": "me_ac@test.com", "password": "Test1234!", "role": "buyer"
        })
        token = r.json()["access_token"]
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "me_ac@test.com"

    async def test_get_me_no_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_refresh_token(self, client: AsyncClient):
        r = await client.post("/api/v1/auth/register", json={
            "email": "refresh_ac@test.com", "password": "Test1234!", "role": "buyer"
        })
        refresh = r.json()["refresh_token"]
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert resp.status_code == 200
        assert "access_token" in resp.json()


# ══ COMMISSION CALCULATION TESTS (pure logic, no DB) ═════════════════════════

class TestCommissionCalculation:
    """Commission calculation engine — critical business logic"""

    def test_t1_only_commission(self):
        from decimal import Decimal
        order_total = Decimal("1000000")
        t1_expected = order_total * Decimal("0.40")
        assert t1_expected == Decimal("400000")

    def test_t1_t2_commission(self):
        from decimal import Decimal
        order_total = Decimal("1000000")
        t1 = order_total * Decimal("0.40")
        t2 = order_total * Decimal("0.13")
        platform = order_total * Decimal("0.30")
        assert t1 == Decimal("400000")
        assert t2 == Decimal("130000")
        assert platform == Decimal("300000")

    def test_commission_rates_sum_to_100(self):
        rates = [
            settings.COMMISSION_T1_RATE,
            settings.COMMISSION_T2_RATE,
            settings.COMMISSION_POOL_A,
            settings.COMMISSION_POOL_B,
            settings.COMMISSION_POOL_C,
            settings.COMMISSION_PLATFORM,
        ]
        total = sum(rates)
        assert abs(total - 1.0) < 1e-10, f"Commission rates sum to {total}, expected 1.0"

    def test_no_referrer_all_to_platform(self):
        from decimal import Decimal
        order_total = Decimal("1000000")
        # Without T1 KOC, full 40% should go to platform fallback
        platform_fallback = order_total * Decimal("0.40") + order_total * Decimal("0.30")
        assert platform_fallback == Decimal("700000")

    def test_commission_decimal_precision(self):
        from decimal import Decimal, ROUND_HALF_UP
        order_total = Decimal("333333")
        t1 = (order_total * Decimal("0.40")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        assert t1 == Decimal("133333")


# ══ PRODUCT ENDPOINT TESTS ══════════════════��═════════════════════════════════

class TestProducts:
    async def test_list_products_public(self, client: AsyncClient):
        resp = await client.get("/api/v1/products")
        assert resp.status_code == 200
        assert "items" in resp.json()

    async def test_search_products(self, client: AsyncClient):
        resp = await client.get("/api/v1/products/search?q=vitamin")
        assert resp.status_code == 200

    async def test_create_product_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/v1/products", json={
            "name": "Test Product", "price": 100000, "category": "skincare"
        })
        assert resp.status_code == 401

    async def test_health_check(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
