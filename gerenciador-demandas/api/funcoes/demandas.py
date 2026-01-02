# 1. Importações da Biblioteca Padrão
from datetime import datetime,timezone
from typing import Tuple, Optional
import json
from zoneinfo import ZoneInfo
# 2. Importações de Bibliotecas de Terceiros
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
# 3. Importações da Aplicação Local
from db.session import SessionLocal
from db.models import AcoesEtapa
from api.models.demandasM import Demanda,DemandaCreate,Etapa,Notificacao,EtapaResponsavel, ModeloEtapa,StatusDemandaCreate, Gestao, StatusEtapa,AcoesEtapaCreate
from api.funcoes.websocket import manager
fuso_horario_brasil = ZoneInfo("America/Sao_Paulo")
fuso_utc = timezone.utc
# --- Funções de Serviço para Demandas ---
async def criar_demanda(db: Session, demanda_data: DemandaCreate, usuario_id: int) -> Tuple[Demanda, int]:
    """
    Cria uma nova demanda e suas etapas iniciais.

    Args:
        db (Session): A sessão do banco de dados.
        demanda_data (DemandaCreate): Os dados da nova demanda.
        usuario_id (int): O ID do usuário que está criando a demanda.

    Returns:
        Tuple[Demanda, int]: Uma tupla contendo o objeto da nova demanda e o ID da primeira etapa.
    """
    # 1. Cria o objeto Demanda
    nova_demanda = Demanda(
        nome_cliente=demanda_data.cliente_nome,
        representante_cliente=demanda_data.cliente_representante,
        email_cliente=demanda_data.cliente_email,
        telefone_cliente=demanda_data.cliente_telefone,
        whatsapp_cliente=demanda_data.cliente_whatsapp,
        registro_cliente=demanda_data.cliente_cnpj,
        criado_por_id=usuario_id,
        descricao=demanda_data.descricao,
        status=demanda_data.status if demanda_data.status else "Em espera",
        id_area=demanda_data.id_area,
        criado_em=datetime.now()
    )
    db.add(nova_demanda)
    
    # db.flush() envia as instruções para o BD e atribui um ID a 'nova_demanda'
    # sem finalizar a transação. Essencial para usar o ID na criação das etapas.
    db.flush()

    # 2. Cria as etapas baseadas no ModeloEtapa da área correspondente
    modelos_de_etapa = db.query(ModeloEtapa).filter(ModeloEtapa.id_area == demanda_data.id_area).all()

    primeira_etapa_id = None
    for modelo in modelos_de_etapa:
        if modelo.numero_etapa == 1:
            primeiro_id_setor_usuario = db.query(Gestao).filter(Gestao.id_usuario == usuario_id).first().id_setor
            etapa_id = primeiro_id_setor_usuario
        else:
            etapa_id = modelo.id_setor
        nova_etapa = Etapa(
            nome_etapa=modelo.nome_etapa,
            demanda_id=nova_demanda.id,
            numero_etapa=modelo.numero_etapa,
            setor=modelo.setor,
            status=StatusEtapa.INICIADO if modelo.numero_etapa == 1 else StatusEtapa.AGUARDANDO,
            validacao=modelo.validacao,
            id_setor = etapa_id,
            responsavel_id = usuario_id if modelo.numero_etapa == 1 else None,
            prazo = None if modelo.numero_etapa == 1 else None
        )
        db.add(nova_etapa)
        db.flush() # Atribui um ID para a nova_etapa

        # 3. Associa o criador da demanda como responsável pela primeira etapa
        if modelo.numero_etapa == 1:
            primeira_etapa_id = nova_etapa.id
            id_responsavel = usuario_id
        else: 
            id_responsavel = None
            
        responsavel_etapa = EtapaResponsavel(
            etapa_id=nova_etapa.id,
            responsavel_id=id_responsavel
        )
        db.add(responsavel_etapa)
        
    await atualizar_status_demanda(db, usuario_id, nova_demanda.id, primeira_etapa_id)
    return nova_demanda, primeira_etapa_id

def excluir_demanda(db: Session, demanda_id: int) -> bool:
    """
    Exclui uma demanda e todos os seus dados relacionados.

    Args:
        db (Session): A sessão do banco de dados.
        demanda_id (int): O ID da demanda a ser excluída.

    Returns:
        bool: True se a demanda foi excluída com sucesso, False caso contrário.
    """
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not demanda:
        return False

    # Excluir entidades relacionadas 
    db.query(Notificacao).filter(Notificacao.demanda_id == demanda_id).delete(synchronize_session=False)
    
    etapas_ids = db.query(Etapa.id).filter(Etapa.demanda_id == demanda_id).subquery()
    db.query(EtapaResponsavel).filter(EtapaResponsavel.etapa_id.in_(etapas_ids)).delete(synchronize_session=False)
    
    db.query(Etapa).filter(Etapa.demanda_id == demanda_id).delete(synchronize_session=False)
    
    # Finalmente, exclui a demanda principal
    db.delete(demanda)
    
    return True

def atualizar_demanda(db: Session, demanda_id: int, demanda_data: DemandaCreate) -> Optional[Demanda]:
    """
    Atualiza os dados de uma demanda.

    Args:
        db (Session): A sessão do banco de dados.
        demanda_id (int): O ID da demanda a ser atualizada.
        demanda_data (DemandaCreate): Os novos dados da demanda.

    Returns:
        Optional[Demanda]: O objeto da demanda atualizada, ou None se não for encontrada.
    """
    demanda_db = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not demanda_db:
        return None

    # Atualiza os campos com os dados do payload
    demanda_db.nome_cliente = demanda_data.cliente_nome
    demanda_db.representante_cliente = demanda_data.cliente_representante
    demanda_db.email_cliente = demanda_data.cliente_email
    demanda_db.telefone_cliente = demanda_data.cliente_telefone
    demanda_db.whatsapp_cliente = demanda_data.cliente_whatsapp
    demanda_db.registro_cliente = demanda_data.cliente_cnpj
    demanda_db.descricao = demanda_data.descricao
    demanda_db.status = demanda_data.status if demanda_data.status else demanda_db.status
    
    # Adicionar um campo de data de atualização no modelo Demanda
    # demanda_db.atualizada_em = datetime.now()
    
    return demanda_db


# Função para envio e atualização de notificações
async def enviar_notificacao(db: Session, demanda_id: Optional[int], etapa_id: Optional[int], usuario_id: int,setor_id: Optional[int],lida:bool,mensagem: str) -> Notificacao:
    """
    Cria e salva uma notificação, enviando-a em tempo real via WebSocket.

    Args:
        db (Session): A sessão do banco de dados.
        demanda_id (Optional[int]): O ID da demanda associada.
        etapa_id (Optional[int]): O ID da etapa associada.
        usuario_id (int): O ID do usuário a ser notificado.
        setor_id (Optional[int]): O ID do setor associado.
        lida (bool): O estado de leitura da notificação.
        mensagem (str): O conteúdo da mensagem de notificação.

    Returns:
        Notificacao: O objeto da notificação criada.
    """
    try:
        
        nova_notificacao = Notificacao(
            mensagem=mensagem,
            lida=lida,
            criada_em=datetime.now(),
            usuario_id=usuario_id,
            setor_id=setor_id,
            etapa_id=etapa_id,
            demanda_id=demanda_id,
        )
        
        db.add(nova_notificacao)
        db.commit()
        data_notificacao = nova_notificacao.criada_em.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil)
        nova_notificacao.criada_em = data_notificacao
        # Enviar notificação em tempo real
        notificacao_dict = {
            "id": nova_notificacao.id,
            "mensagem": nova_notificacao.mensagem,
            "lida": nova_notificacao.lida,
            "criada_em": nova_notificacao.criada_em.strftime("%d/%m/%Y %H:%M"),
            "demanda_id": nova_notificacao.demanda_id,
        }
        await manager.send_personal_message(json.dumps(notificacao_dict), usuario_id)
        
    except Exception as e:
        print(f"Ocorreu um erro ao criar a notificação: {e}")
        db.rollback()
    finally:
        db.close()
        
        
        
async def ler_notificacao(db: Session, user_id:int) -> Optional[Notificacao]:
    """
    Lê todas as notificações de um usuário.

    Args:
        db (Session): A sessão do banco de dados.
        user_id (int): O ID do usuário.

    Returns:
        Optional[List[dict]]: Uma lista de dicionários com os dados das notificações,
                              ou None se não houver notificações.
    """
    notificacoes = db.query(Notificacao)\
        .filter(Notificacao.usuario_id == user_id)\
        .order_by(Notificacao.criada_em.desc())\
        .all()
    if not notificacoes:
        return None # Retorna None se a lista de notificacoes estiver vazia
    lista_notificacoes = []
    for notificacao in notificacoes:
        data_notificacao = notificacao.criada_em.replace(tzinfo=fuso_utc)
        data_notificacao = data_notificacao.astimezone(fuso_horario_brasil)
        notificacao.criada_em = data_notificacao
        tratamento_notificacoes = {
            "id": notificacao.id,
            "mensagem": notificacao.mensagem,
            "lida": notificacao.lida,
            "criada_em": notificacao.criada_em.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M"),
            "setor_id": notificacao.setor_id,
            "etapa_id": notificacao.etapa_id,
            "demanda_id": notificacao.demanda_id,
            "usuario_id": notificacao.usuario_id
        }
        lista_notificacoes.append(tratamento_notificacoes)
    if lista_notificacoes:
        return lista_notificacoes
    else:
        return None

# Função que recebe uma lista de id de demandas e muda os status delas para "Lidas" no banco de dados
async def marcar_notificacoes_como_lidas(db: Session, notificacoes_ids: list[int], user_id: int):
    """
    Marca uma lista de notificações como lidas.

    Args:
        db (Session): A sessão do banco de dados.
        notificacoes_ids (list[int]): Uma lista de IDs de notificações.
        user_id (int): O ID do usuário proprietário das notificações.
    """
    if not notificacoes_ids:
        return None
    notificacoes = db.query(Notificacao).filter(Notificacao.id.in_(notificacoes_ids), Notificacao.usuario_id == user_id).all()
    if not notificacoes:
        return None
    try:
        for notificacao in notificacoes:
            notificacao.lida = True
        db.commit()
    except Exception as e:
        print(f"Ocorreu um erro ao marcar as notificação como lidas: {e}")
        db.rollback()
    finally:
        db.close()



# Função que recebe um user_id e um demanda_id, faz uma busca na tabela de etapas pelas etapas que o usuario está em responsavel_id, verifica os status delas sendo por exemplo se todos tiverem "Finalizado" coloca a demanda em finalizado, se tiver algum com "Iniciado","Pendente" ou "Negado" coloca a demanda em "Ativa" e se todos tiverem em "Aguardando" coloca a demanda em "Em espera". Agora vamos conectar ao banco de dados na tabela de status de demanda por usuario, criar um status ou atualizar o existente 
async def atualizar_status_demanda(db: Session, user_id: int, demanda_id: int, etapa_id: int):
    """
    Atualiza o status de uma demanda para um usuário específico.

    Args:
        db (Session): A sessão do banco de dados.
        user_id (int): O ID do usuário.
        demanda_id (int): O ID da demanda.
        etapa_id (int): O ID da etapa que está influenciando a atualização de status.
    """
    etapas = db.query(Etapa).filter(Etapa.id == etapa_id).first()
    
    if not etapas:
        return None
    
    status_etapas = etapas.status.value
    if status_etapas == "Finalizado" :
        status = "Finalizado"
    elif status_etapas == "Iniciado":
        status = "Ativa"
    elif status_etapas in ["Aguardando", "Pendente", "Negado", "Aguardando Pendência"]:
        status = "Em espera"
    status_demanda = db.query(StatusDemandaCreate).filter(StatusDemandaCreate.demanda_id == demanda_id).filter(StatusDemandaCreate.user_id == user_id).first()
    if status_demanda:
        status_demanda.status = status
        status_demanda.user_id = user_id
        status_demanda.etapa_id = etapa_id
    else:
        try:
            status_demanda = StatusDemandaCreate(user_id=user_id, demanda_id=demanda_id, status=status, etapa_id=etapa_id)
        except Exception as e:
            print(f"Ocorreu um erro ao criar o status da demanda: {e}")
    db.add(status_demanda)
    db.flush()
    #PARTE COMENTADA POR APRESENTAR ERRO NA PROPOSTA PRINCIPAL DA FUNÇÃO
    status_obsoleto = db.query(StatusDemandaCreate).filter(StatusDemandaCreate.etapa_id == etapa_id).filter(StatusDemandaCreate.user_id != user_id).first()
    if status_obsoleto:
        etapas_usuario_obsoleto = db.query(Etapa).filter(Etapa.responsavel_id == status_obsoleto.user_id).filter(Etapa.demanda_id == status_obsoleto.demanda_id).all()
        if not etapas_usuario_obsoleto:
            db.delete(status_obsoleto)
        else:
            if all(etapa_obsoleta.status.value == "Finalizado" for etapa_obsoleta in etapas_usuario_obsoleto): 
                print("if de finalizado status obsoleto")
                status = "Finalizado"
            elif (etapa_obsoleta.status.value == "Iniciado" for etapa_obsoleta in etapas_usuario_obsoleto):
                status = "Ativa"
            elif (etapa_obsoleta.status.value in ["Aguardando", "Pendente", "Negado", "Aguardando Pendência"] for etapa_obsoleta in etapas_usuario_obsoleto):
                status = "Em espera"
            status_obsoleto.status = status
            status_obsoleto.etapa_id = max(etapa.id for etapa in etapas_usuario_obsoleto)
    db.commit()
    

async def verificar_status_demanda(db: Session, demanda_id: int, user_id: int) -> Optional[StatusDemandaCreate]:
    """
    Verifica o status de uma demanda para um usuário específico.

    Args:
        db (Session): A sessão do banco de dados.
        demanda_id (int): O ID da demanda.
        user_id (int): O ID do usuário.

    Returns:
        Optional[str]: O status da demanda, ou None se não for encontrado.
    """
    status_demanda = db.query(StatusDemandaCreate).filter(StatusDemandaCreate.demanda_id == demanda_id).filter(StatusDemandaCreate.user_id == user_id).first()
    if not status_demanda:
        return None
    return status_demanda.status


# Função que adiciona uma ação no banco de dados de acordo com etapa_id e user_id
async def adicionar_acao(db: Session, acao: AcoesEtapaCreate) -> AcoesEtapa:
    """
    Adiciona uma nova ação (comentário) a uma etapa.

    Args:
        db (Session): A sessão do banco de dados.
        acao (AcoesEtapaCreate): Os dados da ação a ser criada.

    Raises:
        e: Uma exceção genérica em caso de erro.

    Returns:
        AcoesEtapa: O objeto da nova ação criada.
    """
    try:
        nova_acao_db = AcoesEtapa(
            etapa_id=acao.etapa_id,
            acao=acao.acao,
            user_id=acao.user_id,
            data_hora=datetime.now(timezone.utc)
        )
        db.add(nova_acao_db)
        db.commit()
        db.refresh(nova_acao_db)
        return nova_acao_db
    except Exception as e:
        db.rollback()
        print(f"Erro ao adicionar ação ao banco de dados: {e}") # Exemplo de log
        raise e