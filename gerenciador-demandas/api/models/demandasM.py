# 1. Importações da Biblioteca Padrão
from datetime import datetime
from enum import Enum as PyEnum
from typing import Any, Dict, List

# 2. Importações de Bibliotecas de Terceiros
from pydantic import BaseModel
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer,
    LargeBinary, String, Text
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
# 3. Importações locais
from api.models.log_models import Log


# --- Base do Banco de Dados ---
Base = declarative_base()
# --- Enumerações (Enums) ---
# Define os status possíveis para uma Etapa.
class StatusEtapa(PyEnum):
    """Define os status possíveis para uma Etapa."""
    AGUARDANDO = "Aguardando"
    INICIADO = "Iniciado"
    PENDENTE = "Pendente"
    FINALIZADO = "Finalizado"
    NEGADO = "Negado"
    AGUARDANDO_PENDENCIA = "Aguardando Pendência"
# --- Modelos do Banco de Dados (SQLAlchemy ORM) --
# Modelos relacionados à Empresa e sua estrutura

#Modelo Pydantic de usuario
class User(Base):
    """
    Representa um usuário no sistema.

    Attributes:
        id (int): O ID único do usuário.
        nome (str): O nome do usuário.
        email (str): O e-mail do usuário (deve ser único).
        registro (str): O CPF ou CNPJ do usuário.
        senha (str): A senha com hash do usuário.
        telefone (str): O telefone de contato do usuário.
        whatsapp (str): O número de WhatsApp do usuário.
        permissao_adm (bool): Indica se o usuário é um administrador.
        plano (str): O plano de assinatura do usuário.
        criado_em (datetime): A data e hora de criação do usuário.
        primeiro_acesso (bool): Indica se é o primeiro acesso do usuário.
        codigo_verificacao (str): O código para verificação de e-mail ou redefinição de senha.
        codigo_verificacao_criado_em (datetime): A data e hora de criação do código de verificação.
        empresa_id (int): O ID da empresa à qual o usuário pertence.
    """
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    registro = Column(String, nullable=False) # CPF ou CNPJ
    senha = Column(String, nullable=False)
    telefone = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    permissao_adm = Column(Boolean, default=False)
    plano = Column(String)
    criado_em = Column(DateTime, default=datetime.now)
    primeiro_acesso = Column(Boolean, nullable=False, default=True)
    codigo_verificacao = Column(String, nullable=True)
    codigo_verificacao_criado_em = Column(DateTime, nullable=True)
    
    empresa_id = Column(Integer, ForeignKey('empresa.id'))
    # --- RELACIONAMENTOS ---
    # Adicione esta seção inteira à sua classe User.

    # Relacionamento com Empresa (Um usuário pertence a uma empresa)
    empresa = relationship("Empresa", back_populates="usuarios")

    # Relacionamento com Demandas (Um usuário pode criar muitas demandas)
    demandas_criadas = relationship("Demanda", back_populates="criado_por")

    # Relacionamento com Gestao (Um usuário pode ser gestor de vários setores)
    gestao_setores = relationship("Gestao", back_populates="usuario")

    # Relacionamento com EtapaResponsavel (Um usuário pode ser responsável por várias etapas)
    etapa_responsavel = relationship("EtapaResponsavel", back_populates="usuario")

    # Relacionamento com Notificacao (Um usuário pode ter muitas notificações)
    notificacoes = relationship("Notificacao", back_populates="usuario")
    
    



# Modelo Pydantic de Criação de demanda
class Empresa(Base):
    """
    Representa uma empresa no sistema.

    Attributes:
        id (int): O ID único da empresa.
        nome (str): O nome da empresa.
        logo (bytes): A logo da empresa em formato binário.
        cod_cor (int): O código da cor principal da empresa.
        plano (str): O plano de assinatura da empresa.
        fim_contrato (datetime): A data de término do contrato.
        acessos (int): O número de acessos disponíveis para a empresa.
    """
    __tablename__ = "empresa"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    logo = Column(LargeBinary, nullable=True)
    cod_cor = Column(Integer, nullable=True)
    plano = Column(String, nullable=False)
    fim_contrato = Column(DateTime, nullable=False)
    acessos = Column(Integer, nullable=False)
    # Relacionamentos
    usuarios = relationship("User", back_populates="empresa")
    setores = relationship("Setores", back_populates="empresa", cascade="all, delete-orphan")
    areas = relationship("Area", back_populates="empresa", cascade="all, delete-orphan")
    
class Setores(Base):
    """
    Representa um setor dentro de uma empresa.

    Attributes:
        id (int): O ID único do setor.
        nome (str): O nome do setor.
        empresa_id (int): O ID da empresa à qual o setor pertence.
    """
    __tablename__ = "setores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresa.id"), nullable=False)

    # Relacionamentos
    empresa = relationship("Empresa", back_populates="setores")
    gestoes = relationship("Gestao", back_populates="setor")
    
class Area(Base):
    """
    Representa uma área de negócio ou serviço dentro de uma empresa.

    Attributes:
        id (int): O ID único da área.
        nome_area (str): O nome da área.
        empresa_id (int): O ID da empresa à qual a área pertence.
    """
    __tablename__ = "area"

    id = Column(Integer, primary_key=True, index=True)
    nome_area = Column(String, nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="areas")
    modelos_etapa = relationship("ModeloEtapa", back_populates="area", cascade="all, delete-orphan")
    demandas = relationship("Demanda", back_populates="area")
    
class ModeloEtapa(Base):
    """
    Define um modelo (template) para as etapas de uma área.

    Attributes:
        id (int): O ID único do modelo de etapa.
        nome_etapa (str): O nome da etapa.
        setor (str): O nome do setor responsável pela etapa.
        validacao (bool): Indica se a etapa requer validação.
        numero_etapa (int): A ordem da etapa no fluxo da demanda.
        id_area (int): O ID da área à qual o modelo de etapa pertence.
        id_setor (int): O ID do setor responsável pela etapa.
    """
    __tablename__ = "modelo_etapa"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_etapa = Column(String, nullable=False)
    setor = Column(String, nullable=False)
    validacao = Column(Boolean, nullable=False)
    numero_etapa = Column(Integer, nullable=False)
    id_area = Column(Integer, ForeignKey("area.id"), nullable=False)
    id_setor = Column(Integer, ForeignKey("setores.id"))

    # Relacionamentos
    area = relationship("Area", back_populates="modelos_etapa")
    
# Modelos relacionados a Demandas e seu fluxo
class Demanda(Base):
    """
    Representa uma demanda ou processo de um cliente.

    Attributes:
        id (int): O ID único da demanda.
        nome_cliente (str): O nome do cliente.
        representante_cliente (str): O nome do representante do cliente.
        email_cliente (str): O e-mail do cliente.
        telefone_cliente (str): O telefone do cliente.
        whatsapp_cliente (str): O WhatsApp do cliente.
        registro_cliente (str): O CNPJ ou CPF do cliente.
        descricao (str): A descrição da demanda.
        status (str): O status geral da demanda.
        criado_em (datetime): A data e hora de criação da demanda.
        criado_por_id (int): O ID do usuário que criou a demanda.
        id_area (int): O ID da área à qual a demanda pertence.
    """
    __tablename__ = "demandas"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_cliente = Column(String, nullable=False)
    representante_cliente = Column(String)
    email_cliente = Column(String)
    telefone_cliente = Column(String)
    whatsapp_cliente = Column(String)
    registro_cliente = Column(String)
    descricao = Column(Text, nullable=False)
    status = Column(String, default="Em espera")
    criado_em = Column(DateTime, default=func.now())
    
    criado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_area = Column(Integer, ForeignKey("area.id"), nullable=False)
    criado_por = relationship("User", back_populates="demandas_criadas")

    # Relacionamentos
    criado_por = relationship("User", back_populates="demandas_criadas")
    etapas = relationship("Etapa", back_populates="demanda", cascade="all, delete-orphan")
    documentos = relationship("Documento", back_populates="demanda", cascade="all, delete-orphan")
    notificacoes = relationship("Notificacao", back_populates="demanda", cascade="all, delete-orphan")
    area = relationship("Area", back_populates="demandas")

class Etapa(Base):
    """
    Representa uma etapa específica de uma demanda.

    Attributes:
        id (int): O ID único da etapa.
        nome_etapa (str): O nome da etapa.
        numero_etapa (int): A ordem da etapa no fluxo da demanda.
        setor (str): O nome do setor responsável pela etapa.
        status (StatusEtapa): O status atual da etapa.
        comentario (str): Um comentário ou observação sobre a etapa.
        validacao (bool): Indica se a etapa requer validação.
        aceite (bool): Indica se a etapa foi aceita.
        atualizada_em (datetime): A data e hora da última atualização da etapa.
        responsavel_id (int): O ID do usuário responsável pela etapa.
        prazo (datetime): O prazo para a conclusão da etapa.
        vencido (str): Indica se o prazo da etapa está vencido.
        demanda_id (int): O ID da demanda à qual a etapa pertence.
        id_setor (int): O ID do setor responsável pela etapa.
    """
    __tablename__ = "etapas"

    id = Column(Integer, primary_key=True, index=True)
    nome_etapa = Column(String, nullable=False)
    numero_etapa = Column(Integer, nullable=False)
    setor = Column(Text, nullable=True)
    status = Column(Enum(StatusEtapa), default=StatusEtapa.AGUARDANDO)
    comentario = Column(Text, nullable=True)
    validacao = Column(Boolean, nullable=False)
    aceite = Column(Boolean, nullable=True)
    atualizada_em = Column(DateTime, default=func.now())
    responsavel_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    prazo = Column(DateTime)
    vencido = Column(String)

    demanda_id = Column(Integer, ForeignKey("demandas.id"), nullable=False)
    id_setor = Column(Integer, ForeignKey("setores.id"))
    
    # Relacionamentos
    demanda = relationship("Demanda", back_populates="etapas")
    responsaveis = relationship("EtapaResponsavel", back_populates="etapa", cascade="all, delete-orphan")
    documentos = relationship("Documento", back_populates="etapa", cascade="all, delete-orphan")

class Documento(Base):
    """
    Representa um arquivo anexado a uma demanda.

    Attributes:
        id (int): O ID único do documento.
        nome_arquivo (str): O nome do arquivo.
        caminho_arquivo (bytes): O conteúdo do arquivo em formato binário.
        tipo_arquivo (str): O tipo MIME do arquivo.
        enviado_em (datetime): A data e hora de envio do arquivo.
        demanda_id (int): O ID da demanda à qual o documento pertence.
        etapa_id (int): O ID da etapa à qual o documento pertence.
        responsavel_id (int): O ID do usuário que enviou o arquivo.
    """
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    nome_arquivo = Column(String, nullable=False)
    caminho_arquivo = Column(LargeBinary, nullable=False)
    tipo_arquivo = Column(String, nullable=False)
    enviado_em = Column(DateTime, default=func.now())
    
    demanda_id = Column(Integer, ForeignKey("demandas.id"), nullable=False)
    etapa_id = Column(Integer, ForeignKey("etapas.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # Relacionamentos
    demanda = relationship("Demanda", back_populates="documentos")    
    etapa = relationship("Etapa", back_populates="documentos")

class Notificacao(Base):
    """
    Representa uma notificação para um usuário sobre um evento.

    Attributes:
        id (int): O ID único da notificação.
        mensagem (str): O conteúdo da mensagem de notificação.
        lida (bool): Indica se a notificação foi lida.
        criada_em (datetime): A data e hora de criação da notificação.
        setor_id (int): O ID do setor associado à notificação.
        usuario_id (int): O ID do usuário que recebeu a notificação.
        demanda_id (int): O ID da demanda associada à notificação.
        etapa_id (int): O ID da etapa associada à notificação.
    """
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True)
    mensagem = Column(Text, nullable=False)
    lida = Column(Boolean, default=False)
    criada_em = Column(DateTime, default=func.now())
    setor_id = Column(Integer, ForeignKey("setores.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    demanda_id = Column(Integer, ForeignKey("demandas.id"))
    etapa_id = Column(Integer, ForeignKey("etapas.id"))


    # Relacionamentos
    usuario = relationship("User", back_populates="notificacoes")
    demanda = relationship("Demanda", back_populates="notificacoes")
    
    
# Modelos de Associação (Tabelas de ligação)
class Gestao(Base):
    """
    Associa um Usuário a um Setor, definindo se ele é gestor.

    Attributes:
        id (int): O ID único da associação de gestão.
        gestor (bool): Indica se o usuário é gestor do setor.
        id_usuario (int): O ID do usuário.
        id_setor (int): O ID do setor.
    """
    __tablename__ = "gestao"

    id = Column(Integer, primary_key=True, index=True)
    gestor = Column(Boolean, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_setor = Column(Integer, ForeignKey("setores.id"), nullable=False)

    # Relacionamentos
    usuario = relationship("User", back_populates="gestao_setores")
    setor = relationship("Setores", back_populates="gestoes")

class EtapaResponsavel(Base):
    """
    Associa um Usuário como responsável por uma Etapa.

    Attributes:
        id (int): O ID único da associação de responsabilidade.
        etapa_id (int): O ID da etapa.
        responsavel_id (int): O ID do usuário responsável.
    """
    __tablename__ = "etapa_responsavel"

    id = Column(Integer, primary_key=True, index=True)
    etapa_id = Column(Integer, ForeignKey("etapas.id", ondelete="CASCADE"))
    responsavel_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))

    # Relacionamentos
    etapa = relationship("Etapa", back_populates="responsaveis")
    usuario = relationship("User", back_populates="etapa_responsavel")
    
# --- Modelos de Dados (Pydantic Schemas) ---
# Define a estrutura de dados para validação na API.
class DemandaCreate(BaseModel):
    """
    Schema para a criação de uma nova demanda.

    Attributes:
        cliente_nome (str): O nome do cliente.
        cliente_representante (str): O nome do representante do cliente.
        cliente_email (str): O e-mail do cliente.
        cliente_telefone (str): O telefone do cliente.
        cliente_whatsapp (str): O WhatsApp do cliente.
        cliente_cnpj (str): O CNPJ ou CPF do cliente.
        descricao (str): A descrição da demanda.
        status (str): O status inicial da demanda.
        id_area (int): O ID da área à qual a demanda pertence.
    """
    cliente_nome: str
    cliente_representante: str
    cliente_email: str
    cliente_telefone: str
    cliente_whatsapp: str
    cliente_cnpj: str
    descricao: str
    status: str = "Em espera"
    id_area: int
    
    
class StatusDemandaCreate(Base):
    """
    Schema para a criação de um novo status de demanda.

    Attributes:
        id (int): O ID único do status da demanda.
        user_id (int): O ID do usuário associado ao status.
        demanda_id (int): O ID da demanda associada ao status.
        status (str): O status da demanda.
        etapa_id (int): O ID da etapa que influenciou a criação do status.
    """
    __tablename__ = "status_demanda"
    id = Column(Integer, primary_key=True,index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    demanda_id = Column(Integer, ForeignKey("demandas.id", ondelete="CASCADE"))
    status = Column(String, nullable=False)
    etapa_id = Column(Integer, ForeignKey("etapas.id", ondelete="CASCADE"))

class AcoesEtapaCreate(BaseModel):
    """
    Schema para a criação de uma nova ação em uma etapa.

    Attributes:
        etapa_id (int): O ID da etapa à qual a ação pertence.
        acao (str): O conteúdo da ação ou comentário.
        user_id (int): O ID do usuário que realizou a ação.
    """
    etapa_id: int
    acao: str
    user_id: int
    
