"""template editor: body, variables_schema, is_builtin

Revision ID: d14e6f08faa0
Revises: 1d0d2a47167d
Create Date: 2026-08-04 00:34:35.287914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd14e6f08faa0'
down_revision: Union[str, None] = '1d0d2a47167d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_CREATED_BY = "fk_contract_templates_created_by_id_users"


def upgrade() -> None:
    # server_default obligatoire sur les colonnes NOT NULL : la table contient
    # déjà des lignes en production, un ajout sans valeur par défaut échouerait.
    op.add_column(
        'contract_templates',
        sa.Column('is_builtin', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'contract_templates',
        sa.Column('variables_schema', sa.JSON(), nullable=False, server_default='[]'),
    )
    op.add_column('contract_templates', sa.Column('body', sa.JSON(), nullable=True))
    op.add_column('contract_templates', sa.Column('created_by_id', sa.Integer(), nullable=True))

    # `filename` devient optionnel : un modèle composé dans l'interface n'a pas de fichier.
    op.alter_column(
        'contract_templates', 'filename',
        existing_type=sa.VARCHAR(length=255),
        nullable=True,
    )

    op.create_foreign_key(
        FK_CREATED_BY, 'contract_templates', 'users', ['created_by_id'], ['id']
    )

    # Les modèles existants pointent vers un fichier du dépôt : ils ne sont pas
    # modifiables depuis l'interface, on les marque comme intégrés.
    op.execute(
        "UPDATE contract_templates SET is_builtin = true "
        "WHERE filename IS NOT NULL AND body IS NULL"
    )


def downgrade() -> None:
    op.drop_constraint(FK_CREATED_BY, 'contract_templates', type_='foreignkey')
    op.drop_column('contract_templates', 'created_by_id')
    op.drop_column('contract_templates', 'body')
    op.drop_column('contract_templates', 'variables_schema')
    op.drop_column('contract_templates', 'is_builtin')

    # Restaure la contrainte NOT NULL : les lignes sans fichier doivent partir d'abord.
    op.execute("DELETE FROM contract_templates WHERE filename IS NULL")
    op.alter_column(
        'contract_templates', 'filename',
        existing_type=sa.VARCHAR(length=255),
        nullable=False,
    )
