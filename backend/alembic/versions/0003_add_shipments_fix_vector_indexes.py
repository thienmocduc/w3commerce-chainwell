"""Add shipments table, fix embedding vector type, add missing indexes

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-05

Changes:
- Create `shipments` table (was missing from initial migration)
- Fix products.embedding column: ARRAY(Float) → vector(384) via pgvector
- Add index on users.kyc_reviewer_id for admin KYC queries
- Add index on users.stripe_customer_id for webhook lookups
- Add ondelete=SET NULL cascade for users.kyc_reviewer_id FK
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1) Create shipments table (was absent from 0001) ──────────────────────
    op.create_table(
        'shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'order_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('orders.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('carrier', sa.String(50), nullable=False, server_default=''),
        sa.Column('tracking_number', sa.String(100), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='pending'),
        sa.Column('shipped_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('events', postgresql.JSONB(), nullable=True, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_shipments_order_id', 'shipments', ['order_id'], unique=False)
    op.create_index('ix_shipments_status', 'shipments', ['status'], unique=False)

    # ── 2) Fix products.embedding: ARRAY(Float) → vector(384) ────────────────
    # Requires pgvector extension (created in 0001 via CREATE EXTENSION IF NOT EXISTS vector)
    op.execute(
        "ALTER TABLE products "
        "ALTER COLUMN embedding TYPE vector(384) "
        "USING embedding::vector"
    )

    # ── 3) Add missing indexes on users table ─────────────────────────────────
    op.create_index(
        'ix_users_kyc_reviewer_id', 'users', ['kyc_reviewer_id'], unique=False
    )
    op.create_index(
        'ix_users_stripe_customer_id', 'users', ['stripe_customer_id'], unique=False
    )

    # ── 4) Fix users.kyc_reviewer_id FK — add SET NULL on delete ─────────────
    # Drop the existing FK if it exists, re-create with ondelete=SET NULL
    op.execute(
        "DO $$ BEGIN "
        "  IF EXISTS (SELECT 1 FROM information_schema.table_constraints "
        "    WHERE constraint_type='FOREIGN KEY' AND table_name='users' "
        "    AND constraint_name LIKE '%kyc_reviewer%') THEN "
        "    EXECUTE (SELECT 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name "
        "      FROM information_schema.table_constraints "
        "      WHERE constraint_type='FOREIGN KEY' AND table_name='users' "
        "      AND constraint_name LIKE '%kyc_reviewer%' LIMIT 1); "
        "  END IF; "
        "END $$;"
    )
    op.create_foreign_key(
        'fk_users_kyc_reviewer_id_users',
        'users', 'users',
        ['kyc_reviewer_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_users_kyc_reviewer_id_users', 'users', type_='foreignkey')

    op.drop_index('ix_users_stripe_customer_id', table_name='users')
    op.drop_index('ix_users_kyc_reviewer_id', table_name='users')

    # Revert embedding back to ARRAY(Float)
    op.execute(
        "ALTER TABLE products "
        "ALTER COLUMN embedding TYPE float[] "
        "USING embedding::float[]"
    )

    op.drop_index('ix_shipments_status', table_name='shipments')
    op.drop_index('ix_shipments_order_id', table_name='shipments')
    op.drop_table('shipments')
