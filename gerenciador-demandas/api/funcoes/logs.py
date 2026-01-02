from sqlalchemy.orm import Session
from api.models.log_models import Log
from api.models.demandasM import User,Demanda,Area
from typing import List
def log_action(db: Session, user_id: int, action: str, details: str = None,empresa_id: int = None):
    """
    Registra uma ação do usuário no banco de dados.

    Args:
        db (Session): A sessão do banco de dados.
        user_id (int): O ID do usuário que realizou a ação.
        action (str): A descrição da ação.
        details (str, optional): Detalhes adicionais sobre a ação. Defaults to None.
        empresa_id (int, optional): O ID da empresa associada à ação. Defaults to None.
    """
    log_entry = Log(
        user_id=user_id,
        action=action,
        details=details,
        empresa_id=empresa_id
    )
    db.add(log_entry)
    db.commit()
    
    
def get_logs_by_empresa(db: Session, empresa_id: int) -> List[Log]:
    """
    Retorna todos os logs de uma empresa específica.

    Args:
        db (Session): A sessão do banco de dados.
        empresa_id (int): O ID da empresa.

    Returns:
        List[Log]: Uma lista de objetos de log.
    """
    return db.query(Log).filter(Log.empresa_id == empresa_id).order_by(Log.timestamp.desc()).all()

def get_logs_by_user(db: Session, user_id: int) -> List[Log]:
    """
    Retorna todos os logs de um usuário específico.

    Args:
        db (Session): A sessão do banco de dados.
        user_id (int): O ID do usuário.

    Returns:
        List[Log]: Uma lista de objetos de log.
    """
    return db.query(Log).filter(Log.user_id == user_id).order_by(Log.timestamp.desc()).all()


# Fução para relatório de demandas
def service_relatorio_demandas(db: Session,empresa_id: int = None, inicio: str = None, fim: str = None, area: int = None):
    """
    Gera um relatório de demandas com filtros opcionais.

    Args:
        db (Session): A sessão do banco de dados.
        empresa_id (int, optional): O ID da empresa. Defaults to None.
        inicio (str, optional): A data de início do filtro. Defaults to None.
        fim (str, optional): A data de fim do filtro. Defaults to None.
        area (int, optional): O ID da área para filtrar. Defaults to None.

    Returns:
        list: Uma lista de objetos de demanda que correspondem aos filtros.
    """
    query = (
        db.query(Demanda)
        .join(Area, Demanda.id_area == Area.id)
        .filter(Area.empresa_id == empresa_id)
        .order_by(Demanda.id.desc())
        .all()
    )
    
    if inicio and fim:
        query = [demanda for demanda in query if demanda.criado_em >= inicio]
        query = [demanda for demanda in query if demanda.criado_em <= fim]
    if area:
        query = [demanda for demanda in query if demanda.id_area == area]
    return query