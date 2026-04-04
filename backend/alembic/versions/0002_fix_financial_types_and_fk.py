"""Fix financial Float→Numeric and add FK constraints on orders

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-05

Changes:
- return_requests.refund_amount: FLOAT → NUMERIC(18,2)
- flash_sales.discount_percent: FLOAT → NUMERIC(5,2)
- pool_rankings.cvr: FLOAT → NUMERIC(5,4)
- orders.koc_t1_id: add FK → users.id ON DELETE SET NULL
- orders.koc_t2_id: add FK → users.id ON DELETE SET NULL
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Fix Float → Numeric for financial fields ──────────────────────────────

    # return_requests.refund_amount
    op.alter_column(
        'return_requests', 'refund_amount',
        existing_type=sa.Float(),
        type_=sa.Numeric(18, 2),
        existing_nullable=True,
        postgresql_using='refund_amount::numeric(18,2)',
    )

    # flash_sales.discount_percent
    op.alter_column(
        'flash_sales', 'discount_percent',
        existing_type=sa.Float(),
        type_=sa.Numeric(5, 2),
        existing_nullable=False,
        postgresql_using='discount_percent::numeric(5,2)',
    )

    # pool_rankings.cvr
    op.alter_column(
        'pool_rankings', 'cvr',
        existing_type=sa.Float(),
        type_=sa.Numeric(5, 4),
        existing_nullable=False,
        postgresql_using='cvr::numeric(5,4)',
    )

    # ── Add FK constraints on orders.koc_t1_id / koc_t2_id ───────────────────
    op.create_foreign_key(
        'fk_orders_koc_t1_id_users',
        'orders', 'users',
        ['koc_t1_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_orders_koc_t2_id_users',
        'orders', 'users',
        ['koc_t2_id'], ['id'],
        ondelete='SET NULL',
    )

    # ── Index koc_t1_id / koc_t2_id for faster commission queries ────────────
    op.create_index('ix_orders_koc_t1_id', 'orders', ['koc_t1_id'], unique=False)
    op.create_index('ix_orders_koc_t2_id', 'orders', ['koc_t2_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_orders_koc_t2_id', table_name='orders')
    op.drop_index('ix_orders_koc_t1_id', table_name='orders')

    op.drop_constraint('fk_orders_koc_t2_id_users', 'orders', type_='foreignkey')
    op.drop_constraint('fk_orders_koc_t1_id_users', 'orders', type_='foreignkey')

    op.alter_column(
        'pool_rankings', 'cvr',
        existing_type=sa.Numeric(5, 4),
        type_=sa.Float(),
        existing_nullable=False,
    )
    op.alter_column(
        'flash_sales', 'discount_percent',
        existing_type=sa.Numeric(5, 2),
        type_=sa.Float(),
        existing_nullable=False,
    )
    op.alter_column(
        'return_requests', 'refund_amount',
        existing_type=sa.Numeric(18, 2),
        type_=sa.Float(),
        existing_nullable=True,
    )
