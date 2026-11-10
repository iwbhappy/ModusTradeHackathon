"""Persistent generation cache and daily budget."""

from alembic import op
import sqlalchemy as sa

revision = "a412c7e8d901"
down_revision = "e787d72a09e3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "llm_cache",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("function", sa.String(30), nullable=False),
        sa.Column("model", sa.String(200), nullable=False),
        sa.Column("response", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "llm_usage",
        sa.Column("day", sa.String(10), primary_key=True),
        sa.Column("calls", sa.Integer(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table("llm_usage")
    op.drop_table("llm_cache")
