import enum
from sqlalchemy import(
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    Text,
    Enum,
    LargeBinary,
    ForeignKey,
    Table,
    MetaData
)
from sqlalchemy.orm import relationship,declarative_base
from sqlalchemy.sql import func

#  --- Base Declarative ---
# Esta é a base da qual todos os nosso modelos ORM herdarão
Base = declarative_base()
metadata = MetaData()
# --- Enumeração Python ---
#  Definimos as opções de status que serão usadas nas tabelas
class StatusDemanda(enum.Enum):
    AGUARDANDO = "Em espera"
    EM_ANDAMENTO = "Ativo"
    ENCERRADA = "Finalizada"

class StatusEtapa(enum.Enum):
    AGUARDANDO = "Aguardando"
    INICIADO = "Iniciado"
    PENDENTE = "Pendente"
    FINALIZADO = "Finalizado"
    NEGADO = "Negado"
    AGUARDANDO_PENDENCIA = "Aguardando Pendência"
#  --- Tabela de associação ---
# Tabela que liga Etapas a múltiplos Usuários responsáveis
etapa_responsavel_association = Table(
    'etapa_responsavel',
    Base.metadata,
    Column('id', Integer, primary_key=True,index=True),
    Column('etapa_id', Integer, ForeignKey('etapas.id')),
    Column('responsavel_id', Integer, ForeignKey('usuarios.id'))
)

#  --- Modelos ORM ---

class Empresa(Base):
    """ Representa uma empresa no sistema """
    __tablename__ = "empresa"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    logo = Column(LargeBinary)
    cod_cor = Column(Integer)
    plano = Column(String, nullable=False)  # Exemplo: "Gratuito", "Premium", etc.
    fim_contrato = Column(DateTime)
    acessos = Column(Integer, default=15)  # Número de acessos permitidos
    
    usuarios = relationship("Usuario", back_populates="empresa")
    setores = relationship("Setor", back_populates="empresa")
    areas = relationship("Area", back_populates="empresa")
    
class Usuario(Base):
    """ Representa um usuário do sistema """
    __tablename__ = 'usuarios'
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    senha = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    registro = Column(String, nullable=False) # CPF ou CNPJ
    telefone = Column(String)
    whatsapp = Column(String)
    plano = Column(String, nullable=False)
    permissao_adm = Column(Boolean, default=False, nullable=False)
    primeiro_acesso = Column(Boolean, default=True, nullable=False)
    codigo_verificacao = Column(String)
    codigo_verificacao_criado_em = Column(DateTime)
    criado_em = Column(DateTime, default=func.now())
    
    # Chave Estrangeira para a tabela 'empresa'
    empresa_id = Column(Integer, ForeignKey('empresa.id'))
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="usuarios")
    demandas_criadas = relationship("Demanda", back_populates="criado_por")
    gestao_setores = relationship("Gestao", back_populates="usuario")
    
    
class Setor(Base):
    """Representa um setor dentro de uma empresa."""
    __tablename__ = 'setores'

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    
    # Chave Estrangeira para a tabela 'empresa'
    empresa_id = Column(Integer, ForeignKey('empresa.id'))

    # Relacionamentos
    empresa = relationship("Empresa", back_populates="setores")
    gestores = relationship("Gestao", back_populates="setor")
    
    
class Gestao(Base):
    """Tabela de associação que define se um usuário é gestor de um setor."""
    __tablename__ = 'gestao'

    id = Column(Integer, primary_key=True)
    gestor = Column(Boolean, default=False)

    # Chaves Estrangeiras
    id_usuario = Column(Integer, ForeignKey('usuarios.id'))
    id_setor = Column(Integer, ForeignKey('setores.id'))

    # Relacionamentos
    usuario = relationship("Usuario", back_populates="gestao_setores")
    setor = relationship("Setor", back_populates="gestores")

class Area(Base):
    """Representa uma área de negócio ou serviço oferecido."""
    __tablename__ = 'area'

    id = Column(Integer, primary_key=True)
    nome_area = Column(String, nullable=False)
    
    # Chave Estrangeira
    empresa_id = Column(Integer, ForeignKey('empresa.id'))

    # Relacionamentos
    empresa = relationship("Empresa", back_populates="areas")
    demandas = relationship("Demanda", back_populates="area")
    modelos_etapa = relationship("ModeloEtapa", back_populates="area")
    
    
class Demanda(Base):
    """Representa uma demanda ou processo de um cliente."""
    __tablename__ = 'demandas'

    id = Column(Integer, primary_key=True)
    nome_cliente = Column(String, nullable=False)
    representante_cliente = Column(String)
    email_cliente = Column(String)
    telefone_cliente = Column(String)
    whatsapp_cliente = Column(String)
    registro_cliente = Column(String) # CPF/CNPJ do cliente
    descricao = Column(Text, nullable=False)
    status = Column(Enum(StatusDemanda), nullable=False, default=StatusDemanda.AGUARDANDO)
    criado_em = Column(DateTime, default=func.now(), nullable=False)
    
    # Chaves Estrangeiras
    criado_por_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    id_area = Column(Integer, ForeignKey('area.id'), nullable=False)

    # Relacionamentos
    criado_por = relationship("Usuario", back_populates="demandas_criadas")
    area = relationship("Area", back_populates="demandas")
    etapas = relationship("Etapa", back_populates="demanda", cascade="all, delete-orphan")
    documentos = relationship("Documento", back_populates="demanda")



class Etapa(Base):
    """Representa uma etapa específica de uma demanda."""
    __tablename__ = 'etapas'

    id = Column(Integer, primary_key=True)
    nome_etapa = Column(String, nullable=False)
    numero_etapa = Column(Integer, nullable=False)
    setor = Column(String, nullable=False)
    status = Column(Enum(StatusEtapa), nullable=False, default=StatusEtapa.AGUARDANDO)
    comentario = Column(Text)
    validacao = Column(Boolean, default=False)
    aceite = Column(Boolean) # Pode ser nulo até ser definido
    atualizada_em = Column(DateTime, default=func.now())
    prazo = Column(DateTime)
    vencido = Column(String)
    # Chaves Estrangeiras
    demanda_id = Column(Integer, ForeignKey('demandas.id'), nullable=False)
    id_setor = Column(Integer, ForeignKey("setores.id"))
    responsavel_id = Column(Integer, ForeignKey('usuarios.id', ondelete="SET NULL")) # Responsável principal

    # Relacionamentos
    demanda = relationship("Demanda", back_populates="etapas")
    # Relacionamento Muitos-para-Muitos com Usuários (responsáveis)
    responsaveis = relationship(
        "Usuario",
        secondary=etapa_responsavel_association
    )
    
    
class Documento(Base):
    """Armazena informações sobre um documento anexado a uma demanda."""
    __tablename__ = 'documentos'

    id = Column(Integer, primary_key=True)
    nome_arquivo = Column(String, nullable=False)
    caminho_arquivo = Column(LargeBinary, nullable=False) # Ou String, se for salvar só o caminho
    tipo_arquivo = Column(String)
    enviado_em = Column(DateTime, default=func.now(), nullable=False)
    
    # Chaves Estrangeiras
    demanda_id = Column(Integer, ForeignKey('demandas.id'), nullable=False)
    etapa_id = Column(Integer, ForeignKey('etapas.id'))
    responsavel_id = Column(Integer, ForeignKey('usuarios.id')) # Quem enviou

    # Relacionamentos
    demanda = relationship("Demanda", back_populates="documentos")
    etapa = relationship("Etapa")
    responsavel = relationship("Usuario")
    


class ModeloEtapa(Base):
    """Um modelo ou template para a criação de etapas de uma área."""
    __tablename__ = 'modelo_etapa'
    
    id = Column(Integer, primary_key=True)
    nome_etapa = Column(String, nullable=False)
    setor = Column(String, nullable=False)
    validacao = Column(Boolean, default=False)
    numero_etapa = Column(Integer, nullable=False)

    # Chave Estrangeira
    id_setor = Column(Integer, ForeignKey("setores.id"))
    id_area = Column(Integer, ForeignKey('area.id'), nullable=False)

    # Relacionamento
    area = relationship("Area", back_populates="modelos_etapa")
    
    
class Notificacao(Base):
    """Representa uma notificação para um usuário sobre um evento."""
    __tablename__ = 'notificacoes'

    id = Column(Integer, primary_key=True)
    mensagem = Column(String, nullable=False)
    lida = Column(Boolean, default=False, nullable=False)
    criada_em = Column(DateTime, default=func.now(), nullable=False)
    
    # Chaves Estrangeiras
    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    setor_id = Column(Integer, ForeignKey('setores.id'))
    etapa_id = Column(Integer, ForeignKey('etapas.id'))
    demanda_id = Column(Integer, ForeignKey('demandas.id'))

    # Relacionamentos
    usuario = relationship("Usuario")
    demanda = relationship("Demanda")
    etapa = relationship("Etapa")



class StatusDemandaCreate(Base):
    """ Representa o status da demanda para o usuario """
    __tablename__ = 'status_demanda'
    
    
    id = Column(Integer, primary_key=True)
    status = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('usuarios.id', ondelete="CASCADE"))
    demanda_id = Column(Integer, ForeignKey('demandas.id'))
    etapa_id = Column(Integer, ForeignKey('etapas.id'))
    # Relacionamentos
    user = relationship("Usuario")
    demanda = relationship("Demanda")
class AcoesEtapa(Base):
    """ Salva as ações feitas em uma etapa """
    __tablename__ = 'acoes_etapa'
    
    id = Column(Integer, primary_key=True)
    etapa_id = Column(Integer, ForeignKey('etapas.id', ondelete="CASCADE"))
    acao = Column(String, nullable=False)
    
    user_id = Column(Integer, ForeignKey('usuarios.id')) 
    data_hora = Column(DateTime(timezone=True), nullable=False)
    
    # Relacionamentos (agora funcionarão corretamente)
    user = relationship("Usuario")
    etapa = relationship("Etapa")