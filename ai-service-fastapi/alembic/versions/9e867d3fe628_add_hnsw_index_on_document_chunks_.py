"""add hnsw index on document_chunks embedding

Revision ID: 9e867d3fe628
Revises: e9facb4d73d9
Create Date: 2026-09-14 12:43:57.047397

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e867d3fe628'
down_revision: Union[str, Sequence[str], None] = 'e9facb4d73d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # HNSW + cosine ops, matching the .cosine_distance() operator retriever.py
    # already queries with. Not added during the Week 5 performance pass (the
    # table only had 3 rows then, so a sequential scan was already sub-10ms —
    # adding it now, ahead of real production volume, is cheap on an empty
    # table and avoids a costly index build on a populated one later.
    op.create_index(
        "ix_document_chunks_embedding_hnsw",
        "document_chunks",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_document_chunks_embedding_hnsw", table_name="document_chunks")
