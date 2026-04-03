"""
Seed the WellKOC database with test data:
- 1 admin account
- 1 vendor account + vendor profile
- 1 KOC account + KOC profile
- 1 buyer account
- 5 sample products
"""
import asyncio
import uuid
from datetime import datetime
import asyncpg
import bcrypt

DB_URL = "postgresql://postgres:WKPlatform2026PgSecure@db.gltdkplfukjfpajwftzd.supabase.co:5432/postgres"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def seed():
    conn = await asyncpg.connect(DB_URL)
    print("Connected to Supabase")

    # Check if already seeded
    existing_products = await conn.fetchval("SELECT COUNT(*) FROM products")
    if existing_products > 0:
        print(f"Database already has {existing_products} products, skipping seed")
        await conn.close()
        return

    hashed = hash_password("WellKOC2026!")

    # Insert users (upsert by email)
    seed_users = [
        ("admin@wellkoc.com",   "Admin WellKOC",   "super_admin"),
        ("vendor@wellkoc.com",  "Vendor Test",     "vendor"),
        ("koc@wellkoc.com",     "KOC Test",        "koc"),
        ("buyer@wellkoc.com",   "Buyer Test",      "buyer"),
    ]
    for email, name, role in seed_users:
        await conn.execute("""
            INSERT INTO users (id, email, display_name, role, hashed_password, is_active, is_verified, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, true, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        """, str(uuid.uuid4()), email, name, role, hashed)
    print("Upserted 4 users")

    # Fetch the actual IDs
    vendor_id = await conn.fetchval("SELECT id FROM users WHERE email='vendor@wellkoc.com'")
    koc_id    = await conn.fetchval("SELECT id FROM users WHERE email='koc@wellkoc.com'")

    # Vendor profile
    existing_vp = await conn.fetchval("SELECT COUNT(*) FROM vendor_profiles WHERE user_id=$1", vendor_id)
    if existing_vp == 0:
        await conn.execute("""
            INSERT INTO vendor_profiles (id, user_id, company_name, created_at)
            VALUES ($1, $2, $3, NOW())
        """, str(uuid.uuid4()), str(vendor_id), "WellKOC Test Store")
        print("Inserted vendor profile")

    # KOC profile
    existing_kp = await conn.fetchval("SELECT COUNT(*) FROM koc_profiles WHERE user_id=$1", koc_id)
    if existing_kp == 0:
        await conn.execute("""
            INSERT INTO koc_profiles (id, user_id, niche, follower_count, avg_cvr, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        """, str(uuid.uuid4()), str(koc_id), "beauty", 50000, 3.5)
        print("Inserted KOC profile")

    # Products
    products = [
        (str(uuid.uuid4()), str(vendor_id), "Serum Vitamin C WellKOC", "beauty", 350000, 450000, "active",
         "Serum duong sang da voi Vitamin C nong do cao 20%, giup mo tham, deu mau da hieu qua."),
        (str(uuid.uuid4()), str(vendor_id), "Kem Duong Am Collagen", "beauty", 280000, 380000, "active",
         "Kem duong am voi Collagen tu nhien, giup lan da cang bong va min mang suot 24 gio."),
        (str(uuid.uuid4()), str(vendor_id), "Tra Hoa Cuc Organic", "food", 120000, 160000, "active",
         "Tra hoa cuc huu co 100%, khong chat bao quan, giup thu gian va cai thien giac ngu."),
        (str(uuid.uuid4()), str(vendor_id), "Vien Uong Collagen Marine", "health", 450000, 550000, "active",
         "Collagen ca bien sau Nhat Ban, ham luong 10000mg/goi, ho tro lam dep da tu ben trong."),
        (str(uuid.uuid4()), str(vendor_id), "Son Duong Moi SPF30", "beauty", 95000, 130000, "active",
         "Son duong moi chong nang SPF30, duong am suot 8 tieng, mau nude tu nhien."),
    ]
    await conn.executemany("""
        INSERT INTO products (id, vendor_id, name, category, price, compare_at_price, status, description,
                              stock_quantity, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 100, NOW(), NOW())
        ON CONFLICT DO NOTHING
    """, products)
    print("Inserted 5 products")

    print("\nSeed complete!")
    print("Accounts (all password: WellKOC2026!):")
    print("  Admin:  admin@wellkoc.com")
    print("  Vendor: vendor@wellkoc.com")
    print("  KOC:    koc@wellkoc.com")
    print("  Buyer:  buyer@wellkoc.com")

    await conn.close()


asyncio.run(seed())
