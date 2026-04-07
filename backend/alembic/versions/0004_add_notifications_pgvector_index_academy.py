"""Add notifications table, pgvector IVFFlat index, academy tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-07

Changes:
- Create `notifications` table (persistent backup for Redis notifications)
- Add IVFFlat index on products.embedding for fast semantic search
- Create `courses` table for Academy feature
- Create `course_lessons` table
- Create `course_enrollments` table
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1) Notifications table ────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False, server_default='system'),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('data', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_user_unread',
                    'notifications', ['user_id', 'is_read'],
                    postgresql_where=sa.text('is_read = false'))
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])

    # ── 2) pgvector IVFFlat index on products.embedding ──────────────────────
    # lists=100 is suitable for ~100k products. Increase for larger catalogs.
    # Requires at minimum 100*10=1000 rows before the index helps.
    op.execute(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_embedding_ivfflat "
        "ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

    # ── 3) Academy: courses table ─────────────────────────────────────────────
    op.create_table(
        'courses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('slug', sa.String(300), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.String(500), nullable=True),
        sa.Column('category', sa.String(100), nullable=False, server_default='general'),
        sa.Column('level', sa.String(20), nullable=False, server_default='beginner'),
        sa.Column('target_role', sa.String(20), nullable=True),  # buyer|koc|vendor|all
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_free', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('price', sa.Numeric(12, 0), nullable=False, server_default='0'),
        sa.Column('xp_reward', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('lesson_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('enrollment_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rating_avg', sa.Numeric(3, 2), nullable=False, server_default='0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_courses_slug', 'courses', ['slug'], unique=True)
    op.create_index('ix_courses_category', 'courses', ['category'])
    op.create_index('ix_courses_published', 'courses', ['is_published'],
                    postgresql_where=sa.text('is_published = true'))

    # ── 4) Academy: course_lessons table ─────────────────────────────────────
    op.create_table(
        'course_lessons',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('course_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('type', sa.String(20), nullable=False, server_default='video'),  # video|article|quiz
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_free_preview', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_course_lessons_course_id', 'course_lessons', ['course_id'])
    op.create_index('ix_course_lessons_order', 'course_lessons', ['course_id', 'order_index'])

    # ── 5) Academy: course_enrollments table ──────────────────────────────────
    op.create_table(
        'course_enrollments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('course_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('progress_pct', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_lesson_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('xp_awarded', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('enrolled_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_enrollments_user_id', 'course_enrollments', ['user_id'])
    op.create_index('ix_enrollments_course_id', 'course_enrollments', ['course_id'])
    op.create_unique_constraint(
        'uq_enrollment_user_course', 'course_enrollments', ['user_id', 'course_id']
    )


def downgrade() -> None:
    op.drop_table('course_enrollments')
    op.drop_table('course_lessons')
    op.drop_table('courses')
    op.execute(
        "DROP INDEX CONCURRENTLY IF EXISTS ix_products_embedding_ivfflat"
    )
    op.drop_table('notifications')
