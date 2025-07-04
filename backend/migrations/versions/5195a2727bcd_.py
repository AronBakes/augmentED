"""empty message

Revision ID: 5195a2727bcd
Revises: 
Create Date: 2025-06-28 08:57:56.365006

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5195a2727bcd'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('course', schema=None) as batch_op:
        batch_op.alter_column('grade',
               existing_type=sa.INTEGER(),
               nullable=True)

    with op.batch_alter_table('study_session', schema=None) as batch_op:
        batch_op.add_column(sa.Column('break_duration', sa.Integer(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('study_session', schema=None) as batch_op:
        batch_op.drop_column('break_duration')

    with op.batch_alter_table('course', schema=None) as batch_op:
        batch_op.alter_column('grade',
               existing_type=sa.INTEGER(),
               nullable=False)

    # ### end Alembic commands ###
