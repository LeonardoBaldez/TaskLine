from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.models import Base
from pydantic import BaseModel
from datetime import datetime
class Log(Base):
    """
    Modelo para registrar as ações dos usuários no sistema.

    Attributes:
        id (int): O ID único do log.
        timestamp (datetime): A data and hora em que a ação ocorreu.
        user_id (int): O ID do usuário que realizou a ação.
        empresa_id (int): O ID da empresa associada à ação.
        action (str): A descrição da ação.
        details (str): Detalhes adicionais sobre a ação.
    """
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=func.now())
    user_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    empresa_id = Column(Integer, ForeignKey('empresa.id'), nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)


class LogResponse(BaseModel):
    """
    Schema para a resposta da API de logs.

    Attributes:
        id (int): O ID único do log.
        timestamp (datetime): A data e hora em que a ação ocorreu.
        user_id (int): O ID do usuário que realizou a ação.
        action (str): A descrição da ação.
        details (str): Detalhes adicionais sobre a ação.
    """
    id: int
    timestamp: datetime
    user_id: int
    action: str
    details: str | None

    class Config:
        from_attributes = True