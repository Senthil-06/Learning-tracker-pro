"""datatype of column 'difficulty' of Learning_item changes fro integer to Eunum type (Easy, Medium, Difficult) 

Revision ID: a01c1076f110
Revises: c024028c21d4
Create Date: 2026-03-15 12:59:00.744523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a01c1076f110'
down_revision: Union[str, Sequence[str], None] = 'c024028c21d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    difficulty_enum = sa.Enum('Easy', 'Medium', 'Hard', name='difficultylevel')
    difficulty_enum.create(op.get_bind())
    op.drop_column('learning_items', 'difficulty')
    op.add_column('learning_items', sa.Column('difficulty', sa.Enum('Easy', 'Medium', 'Hard', name='difficultylevel'), nullable=False, server_default='Easy'))

def downgrade() -> None:
    op.alter_column('learning_items', 'difficulty',
               existing_type=sa.Enum('Easy', 'Medium', 'Hard', name='difficultylevel'),
               type_=sa.INTEGER(),
               existing_nullable=False,
               postgresql_using="difficulty::text::integer")
    sa.Enum(name='difficultylevel').drop(op.get_bind())
