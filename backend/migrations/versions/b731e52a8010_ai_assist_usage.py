"""Function breakdown in the existing daily usage ledger; no new tables."""

from alembic import op
import sqlalchemy as sa

revision = "b731e52a8010"
down_revision = "a412c7e8d901"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "llm_usage",
        sa.Column("function_usage", sa.Text(), nullable=False, server_default="{}"),
    )


def downgrade():
    op.drop_column("llm_usage", "function_usage")
