# 1. Bibliotecas Padrão do Python
import re
import json
from base64 import b64decode
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List,Optional
from dateutil.relativedelta import relativedelta
from zoneinfo import ZoneInfo
import unicodedata
# 2. Bibliotecas de Terceiros (Instaladas via pip)
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks,WebSocket,WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.future import select
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi.responses import StreamingResponse
from io import BytesIO
from PIL import Image
from urllib.parse import quote
# 3. Módulos locais
from db.models import AcoesEtapa
from api.funcoes.demandas import criar_demanda, enviar_notificacao,ler_notificacao, atualizar_status_demanda,verificar_status_demanda, marcar_notificacoes_como_lidas,adicionar_acao
from api.models.demandasM import Demanda, DemandaCreate,EtapaResponsavel,Etapa, Documento, Notificacao, StatusEtapa, Empresa, Setores, Area, ModeloEtapa, User,Gestao,StatusDemandaCreate,AcoesEtapaCreate
from api.funcoes.websocket import manager
from api.models.user_models import  UserUpdate,EmpresaConfigUpdatePayload
from api.funcoes.loginf import get_current_user,get_current_user_from_ws
from api.funcoes.user import _criar_empresa_com_personalizacao,_atualizar_empresa_e_relacionados_service
from db.session import SessionLocal
from api.funcoes.logs import log_action, get_logs_by_empresa,get_logs_by_user,service_relatorio_demandas
from api.models.log_models import Log
fuso_horario_brasil = ZoneInfo("America/Sao_Paulo")
fuso_utc = timezone.utc
router = APIRouter(
    prefix="/api",
    tags=["Gerenciamento de Demandas e Empresa"]
)
def get_db():
    """
    Cria e fornece uma sessão de banco de dados por requisição.

    Garante que a sessão seja sempre fechada ao final.

    Yields:
        Session: A sessão do banco de dados.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# --------------------------------------------------------
# 1. ROTAS DE GERENCIAMENTO DE DEMANDAS
# --------------------------------------------------------
@router.post("/demandas", status_code=201)
async def criar_nova_demanda_endpoint(
    demanda_data: DemandaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova demanda e suas etapas iniciais.

    Args:
        demanda_data (DemandaCreate): Os dados da nova demanda a ser criada.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado que está criando a demanda.

    Returns:
        dict: Uma mensagem de sucesso com o ID da nova demanda e da primeira etapa.
    """
    nova_demanda, etapa_id = await criar_demanda(db, demanda_data, usuario_id=current_user.id)
    db.commit()
    log_action(db, current_user.id, "Criação de Demanda", f"Demanda ID: {nova_demanda.id}",current_user.empresa_id)
    return {"message": "Demanda criada com sucesso", "id_demanda": nova_demanda.id, "etapa_id": etapa_id}

@router.get("/demandas")
async def listar_demandas_usuario(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as demandas associadas ao usuário logado.
    Args:
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.
    Returns:
        dict: Um dicionário contendo a lista de demandas formatadas em JSON.
    """
    # 1.CONSULTA 
    # Primeiro, pega TODOS os IDs dos setores que o usuário gerencia
    setores_gestor_query = db.query(Gestao.id_setor).filter(
        Gestao.id_usuario == current_user.id,
        Gestao.gestor == True
        ).all()
    # Cria uma lista simples de IDs
    setores_gestor_ids = [s[0] for s in setores_gestor_query]

    query_base = (
        db.query(Demanda)
        .join(Area, Demanda.id_area == Area.id) # <-- JOIN COM AREA
        .filter(Area.empresa_id == current_user.empresa_id) # <-- FILTRO DA EMPRESA
    )

    if current_user.permissao_adm == True:
        #Adm vê todas as demandas
        demandas = (
        query_base
        .options(joinedload(Demanda.area))
        .distinct()
        .all()
    )
    elif setores_gestor_ids: # Se for gestor e não for adm
        # Busca demandas que tenham etapas NOS SETORES que ele gerencia
        demandas = (
            query_base
            .join(Etapa, Etapa.demanda_id == Demanda.id)
            .filter(Etapa.id_setor.in_(setores_gestor_ids))
            .options(joinedload(Demanda.area))
            .distinct()
            .all()
        )
    else: # Usuário comum: busca demandas onde ele é o responsável
        demandas = (
            query_base
            .join(Etapa, Etapa.demanda_id == Demanda.id)
            .filter(Etapa.responsavel_id == current_user.id)
            .options(joinedload(Demanda.area))
            .distinct()
            .all()
        )

    if not demandas:
        # É melhor retornar uma lista vazia do que um erro 404.
        # Um erro 404 indica que o recurso (/demandas) não foi encontrado, mas ele existe.
        # A ausência de itens é um estado válido.
        return {"demandas": []}

    # Busca os setores e se é gestor do usuário logado
    setores_user = db.query(Gestao).filter(Gestao.id_usuario == current_user.id).all()
    setores_ids = [(setor.id_setor,setor.gestor) for setor in setores_user]

    # Pesquisa dos usuários do(s) setor(es) do usuário logado
    # Pega todos os IDs de setor do usuário (seja ele gestor ou não)
    todos_setores_usuarios_ids = [s[0] for s in setores_ids]
    # Pesquisa usuários que estão nesses mesmos setores
    setor_usuarios = db.query(Gestao.id_usuario).filter(
        Gestao.id_setor.in_(todos_setores_usuarios_ids)
        ).distinct().all()
    
    setor_usuarios_ids = [user[0] for user in setor_usuarios]

    #Montagem de lista com nome dos usuários de acordo com id da lista setores_usuarios_ids
    users_do_setor = db.query(User).filter(User.id.in_(setor_usuarios_ids)).all()
    # 2. Formata a lista usando uma "List Comprehension" (mais rápido e "Pythônico")
    users_do_setor_formatado = [
        {
            "id": user.id,
            "nome": user.nome,
            "email": user.email,
            "registro": user.registro,
            "telefone": user.telefone,
            "whatsapp": user.whatsapp
        }
        for user in users_do_setor
    ]    
    
    # 2. FORMATAÇÃO DA LISTA 
    # Criamos uma nova lista de dicionários.
    demandas_formatadas = [
        {
            "id": demanda.id,
            "cliente_nome": demanda.nome_cliente,
            "cliente_representante": demanda.representante_cliente,
            "cliente_email": demanda.email_cliente,
            "cliente_telefone": demanda.telefone_cliente,
            "cliente_whatsapp": demanda.whatsapp_cliente,
            "cliente_cnpj": demanda.registro_cliente,
            "criado_por_id": demanda.criado_por_id,
            "criado_em": demanda.criado_em.astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M"),
            "descricao": demanda.descricao,
            "status": demanda.status, # Usando .value para pegar o texto do Enum
            "area": demanda.area.nome_area if demanda.area else None, # Pegando o nome da área
            "status_individual":  await verificar_status_demanda(db,demanda.id,current_user.id),
            "etapa_atual": await determinar_etapa_atual(demanda.id,1,db,demanda.status),
            "responsavel_etapa": await determinar_etapa_atual(demanda.id,2,db,demanda.status),
            "prazo_etapa": await determinar_etapa_atual(demanda.id,3,db,demanda.status),
            "setores_ids": setores_ids,
            "setor_id_etapa_atual": await determinar_etapa_atual(demanda.id, 4, db, demanda.status)
        }
        for demanda in demandas
    ]
    # 3. RETORNA A LISTA FORMATADA
    return {
        "demandas": demandas_formatadas,
        "usuarios_setor": users_do_setor_formatado
    }

async def determinar_etapa_atual(demanda_id: int,tipo: int,db: Session = Depends(get_db),status_demanda: str = None):
    # 1. Caso especial: Se a demanda inteira está "Finalizada"
    if status_demanda == "Finalizado":
        if tipo == 1: return "-"
        if tipo == 2: return "-"
        if tipo == 3: return "-"
        if tipo == 4: return None  # Não há etapa atual, então não há setor
    # 2. Definir quais status consideramos como "etapa atual"
    status_ativos = [
        StatusEtapa.INICIADO,
        StatusEtapa.PENDENTE,
        StatusEtapa.NEGADO
    ]
    # 3. Buscar a *primeira* etapa que esteja ativa
    etapa_atual = db.query(Etapa).filter(
        Etapa.demanda_id == demanda_id,
        Etapa.status.in_(status_ativos)
    ).order_by(Etapa.numero_etapa).first()
    # 4. Se encontrou a etapa atual, retorna as informações pedidads
    if etapa_atual:
        if tipo == 1:
            return etapa_atual.nome_etapa
        elif tipo == 2:
            if etapa_atual.responsavel_id:
                responsavel = db.query(User.nome).filter(User.id == etapa_atual.responsavel_id).first()
                return responsavel.nome if responsavel else "N/A"
            else:
                return "N/A"
        elif tipo == 3:
            prazo = etapa_atual.prazo
            return prazo.strftime("%d/%m/%Y") if prazo else "-"
        elif tipo == 4:
            return etapa_atual.id_setor

    # 5. Se não encontrou nenhuma etapa ativa (ex: todas aprovadas, mas demanda não finalizada)
    #    ou se a demanda não tem etapas.
    if tipo == 1: return "N/A"
    if tipo == 2: return "N/A"
    if tipo == 3: return "-"
    if tipo == 4: return None
    # Segurança para um tipo inválido
    return None

@router.get("/demandas/{demanda_id}")
def visualizar_demanda_detalhada(
    demanda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Visualiza os detalhes completos de uma demanda.

    Args:
        demanda_id (int): O ID da demanda a ser visualizada.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se a demanda não for encontrada.

    Returns:
        dict: Um dicionário contendo os detalhes formatados da demanda.
    """
    # 1. CONSULTA PRINCIPAL OTIMIZADA
    # Buscamos a demanda e já carregamos o criador, as etapas, os documentos de cada etapa
    # e os responsáveis de cada etapa em poucas queries.
    """
    Visualiza os detalhes completos de uma demanda com um formato de saída JSON customizado.
    Esta rota utiliza consultas otimizadas para carregar dados relacionados de forma eficiente.
    """
    demanda = (
        db.query(Demanda)
        .options(
            joinedload(Demanda.criado_por),
            selectinload(Demanda.etapas).selectinload(Etapa.documentos),
            selectinload(Demanda.etapas).selectinload(Etapa.responsaveis)
        )
        .filter(Demanda.id == demanda_id)
        .first()
    )

    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada.")

    # Busca os setores e se é gestor do usuário logado
    setores_user = db.query(Gestao).filter(Gestao.id_usuario == current_user.id).all()
    setores_ids = [(setor.id_setor,setor.gestor) for setor in setores_user]
    # A verificação de permissão deve ser mais robusta aqui (ex: o usuário faz parte da demanda?)
    # 2. CONSTRUÇÃO MANUAL DO DICIONÁRIO DE RESPOSTA
    # Em vez de retornar o objeto 'demanda' diretamente, vamos construir o JSON.
    nome_area = db.query(Area).filter(Area.id == demanda.id_area).first().nome_area
    # Monta a lista de etapas no formato desejado
    lista_etapas_formatada = []
    lista_documentos_demanda = []
    for etapa in demanda.etapas:
        # NOTA: Esta consulta busca TODOS os usuários que pertencem ao setor da etapa.
        usuarios_do_setor = db.query(User).join(Gestao,User.id == Gestao.id_usuario).filter(Gestao.id_setor == etapa.id_setor).all()
        acoes_etapa = db.query(AcoesEtapa).filter(AcoesEtapa.etapa_id == etapa.id).order_by(AcoesEtapa.id).all()
        # Montar uma lista com o nome do usuário de cada acao, a acao e a hora formatada, temos só o id do usuario, então temos que pegar da tabela do user
        acoes_formatadas = []
        for acao in acoes_etapa:
            acoes_formatadas.append({
                "user_id": acao.user_id,
                "user_name": db.query(User).filter(User.id == acao.user_id).first().nome if acao.user_id is not None else None,
                "acao": acao.acao,
                "data_hora": acao.data_hora.astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M")
                # "data_hora": acao.data_hora.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M")
            })
        # Os usuários também foram pré-carregados.
        lista_usuarios = [
            {"id": usuario.id, "nome": usuario.nome}
            for usuario in usuarios_do_setor
        ]
        
        # Os documentos já foram pré-carregados pela nossa consulta otimizada.
        lista_documentos = [
            {
                "id": doc.id,
                "nome_arquivo": doc.nome_arquivo,
                "tipo_arquivo": doc.tipo_arquivo
            }
            for doc in etapa.documentos
        ]
        lista_documentos_demanda.append({
            "id":doc.id,
            "nome_arquivo":doc.nome_arquivo,
            "tipo_arquivo":doc.tipo_arquivo
        }
            for doc in etapa.documentos
        )
        consulta_teste = db.query(EtapaResponsavel).filter(EtapaResponsavel.etapa_id == etapa.id).first()
        responsavel = None
        if consulta_teste.responsavel_id is not None:
            nome_responsavel = db.query(User).filter(User.id == consulta_teste.responsavel_id).first()
            responsavel = nome_responsavel.nome
        # Os responsáveis também já foram pré-carregados.
        # Aqui, estamos pegando o ID do primeiro responsável para manter a estrutura original.
        responsavel_principal_nome = responsavel 

        lista_etapas_formatada.append({
            "id": etapa.id,
            "nome_etapa": etapa.nome_etapa,
            "DemandaId": etapa.demanda_id,
            "numeroEtapa": etapa.numero_etapa,
            "setor": etapa.setor,
            "status": etapa.status,  # Usar .value para obter o texto do Enum
            "comentario": etapa.comentario,
            "aceite": etapa.aceite,
            "dataCriacao": demanda.criado_em.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M") if demanda.criado_em else None,
            "dataAtualizacao": etapa.atualizada_em.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M") if etapa.atualizada_em else None,
            "responsavel": responsavel_principal_nome,
            "prazo": etapa.prazo,
            "vencido": etapa.vencido,
            "usuarios": lista_usuarios,
            "documentos": lista_documentos,
            "id_setor": etapa.id_setor,
            "validacao": etapa.validacao,
            "acoes": acoes_formatadas
        })
    # Ordenar lista_etapas_formatada pelo numeroEtapa
    lista_etapas_formatada.sort(key=lambda x: x['numeroEtapa'])
    # Monta o objeto final da demanda com todos os dados formatados
    demanda_formatada = {
        "id": demanda.id,
        "cliente_nome": demanda.nome_cliente,
        "cliente_representante": demanda.representante_cliente,
        "cliente_email": demanda.email_cliente,
        "cliente_telefone": demanda.telefone_cliente,
        "cliente_whatsapp": demanda.whatsapp_cliente,
        "registro_cliente": demanda.registro_cliente,
        "criado_por_id": demanda.criado_por_id,
        # O nome do criador já foi pré-carregado, sem query extra!
        "criado_por": demanda.criado_por.nome if demanda.criado_por else None,
        "criado_em": demanda.criado_em.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M"),
        "descricao": demanda.descricao,
        "status": demanda.status, # Usar .value para obter o texto do Enum
        "id_area": demanda.id_area, # Supondo que você precise do ID da área
        "nome_area": nome_area,
        "etapas": lista_etapas_formatada,
        "setores_current_user":setores_ids,
        "documentos_demanda": lista_documentos_demanda
    }
    return {"demanda": demanda_formatada}

@router.delete("/demandas/{demanda_id}", status_code=204)
def excluir_demanda_e_relacionados(
    demanda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exclui uma demanda e todos os seus dados relacionados.

    Args:
        demanda_id (int): O ID da demanda a ser excluída.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se a demanda não for encontrada ou se o usuário não tiver permissão para excluí-la.

    Returns:
        Response: Uma resposta com status 204 (No Content) em caso de sucesso.
    """
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada.")

    # Lógica de autorização (ex: só o criador ou um admin pode excluir)
    if demanda.criado_por_id != current_user.id and not current_user.permissao_adm:
        raise HTTPException(status_code=403, detail="Ação não permitida.")

    db.query(Notificacao).filter(Notificacao.demanda_id == demanda_id).delete(synchronize_session=False)
    db.query(Documento).filter(Documento.demanda_id == demanda_id).delete(synchronize_session=False)
    
    # Excluir associações de EtapaResponsavel antes de excluir Etapas
    etapas_ids = db.query(Etapa.id).filter(Etapa.demanda_id == demanda_id).subquery()
    db.query(EtapaResponsavel).filter(EtapaResponsavel.etapa_id.in_(etapas_ids)).delete(synchronize_session=False)
    
    db.query(StatusDemandaCreate).filter(StatusDemandaCreate.demanda_id == demanda_id).delete(synchronize_session=False)
    
    db.query(Etapa).filter(Etapa.demanda_id == demanda_id).delete(synchronize_session=False)

    db.delete(demanda)
    db.commit()
    log_action(db, current_user.id, "Exclusão de Demanda", f"Demanda ID: {demanda_id}",current_user.empresa_id)
    return Response(status_code=204)

# Rota para editar descricao,telefone_cliente,whatsapp_cliente,email_cliente, onde só quem permissão de administrador e o criador da demanda pode editar
class DemandaUpdateRequest(BaseModel):
    descricao: Optional[str] = None
    telefone_cliente: Optional[str] = None
    whatsapp_cliente: Optional[str] = None
    email_cliente: Optional[str] = None
    registro_cliente: Optional[str] = None
@router.patch("/demandas/{demanda_id}", status_code=200)
async def editar_demanda(
    demanda_id: int,
    payload: DemandaUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Edita os detalhes de uma demanda específica.

    Args:
        demanda_id (int): O ID da demanda a ser editada.
        payload (DemandaUpdateRequest): Os dados da demanda a serem atualizados.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Returns:
        HTTPException: Se a demanda não for encontrada ou se o usuário não tiver permissão.
        dict: Uma mensagem de sucesso informando que a demanda foi atualizada.
    """
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not demanda:
        return HTTPException(status_code=403, detail="Ação não permitida.")
    # Lógica de autorização (ex: só o criador ou um admin pode editar)
    if demanda.criado_por_id != current_user.id and not current_user.permissao_adm:
        return HTTPException(status_code=403, detail="Ação não permitida.")

    # Atualiza apenas os campos fornecidos
    if payload.descricao is not None:
        demanda.descricao = payload.descricao
    if payload.telefone_cliente is not None:
        demanda.telefone_cliente = payload.telefone_cliente
    if payload.whatsapp_cliente is not None:
        demanda.whatsapp_cliente = payload.whatsapp_cliente
    if payload.email_cliente is not None:
        demanda.email_cliente = payload.email_cliente
    if payload.registro_cliente is not None:
        demanda.registro_cliente = payload.registro_cliente

    db.commit()
    log_action(db, current_user.id, "Edição de Demanda", f"Demanda ID: {demanda_id}",current_user.empresa_id)
    return {"message": "Demanda atualizada com sucesso."}

# --------------------------------------------------------
# 2. ROTAS DE GERENCIAMENTO DE ARQUIVOS
# --------------------------------------------------------
@router.post("/arquivos", status_code=201)
async def salvar_arquivos_da_demanda(
    id_demanda: int = Form(...),
    etapa_id: int = Form(...),
    arquivos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Salva múltiplos arquivos associados a uma etapa de uma demanda.

    Args:
        id_demanda (int): O ID da demanda.
        etapa_id (int): O ID da etapa.
        arquivos (List[UploadFile]): A lista de arquivos a serem salvos.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Returns:
        dict: Uma mensagem de sucesso informando quantos arquivos foram enviados.
    """
    for arquivo in arquivos:
        conteudo = await arquivo.read()
        nome_normalizado = unicodedata.normalize("NFC", arquivo.filename)
        novo_documento = Documento(
            demanda_id=id_demanda,
            etapa_id=etapa_id,
            nome_arquivo=nome_normalizado,
            caminho_arquivo=conteudo,
            tipo_arquivo=arquivo.content_type,
            responsavel_id=current_user.id
        )
        db.add(novo_documento)
    log_action(db, current_user.id, "Upload de Documentos", f"Demanda ID: {id_demanda}",current_user.empresa_id)
    db.commit() # Commit único após adicionar todos os documentos.
    
    return {"message": f"{len(arquivos)} arquivo(s) enviado(s) com sucesso."}

@router.get("/arquivos/{documento_id}")
async def baixar_arquivo_da_demanda(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fornece o download de um documento específico.

    Args:
        documento_id (int): O ID do documento a ser baixado.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o documento ou seu conteúdo não forem encontrados.

    Returns:
        Response: A resposta com o conteúdo do arquivo para download.
    """
    documento = db.query(Documento).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    # Verificação se o arquivo realmente existe no caminho armazenado
    if not documento.caminho_arquivo:
        raise HTTPException(status_code=404, detail="Conteúdo do arquivo não encontrado no banco de dados.")
    log_action(db, current_user.id, "Download de Documento", f"Documento ID: {documento_id}",current_user.empresa_id)
    nome_arquivo = unicodedata.normalize("NFC", documento.nome_arquivo)
    return Response(
        content=documento.caminho_arquivo,  # O conteúdo binário (bytes) vai aqui
        media_type=documento.tipo_arquivo, # O MIME type para o navegador saber o que fazer
        headers={
            # Este header é crucial para forçar o download com o nome correto
            "Content-Disposition": f"attachment; filename={quote(nome_arquivo)}; filename*=UTF-8''{quote(nome_arquivo)}"
        }
    )
@router.delete("/arquivos/{documento_id}", status_code=204)
def excluir_arquivo_da_demanda(
    documento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exclui um documento específico.

    Args:
        documento_id (int): O ID do documento a ser excluído.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o arquivo não for encontrado.

    Returns:
        Response: Uma resposta com status 204 (No Content) em caso de sucesso.
    """
    arquivo = db.query(Documento).filter(Documento.id == documento_id).first()
    if not arquivo:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    
    db.delete(arquivo)
    db.commit()
    log_action(db, current_user.id, "Exclusão de Documento", f"Documento ID: {documento_id}",current_user.empresa_id)
    return Response(status_code=204)

# --------------------------------------------------------
# 3. ROTAS DE GERENCIAMENTO DE ETAPAS
# --------------------------------------------------------
#rota de verificação de prazo da etapa
# Strings Possíveis para "vencido" da etapa:
# "Cumprido"
# "Em aberto"
# "Vencido"
@router.get("/verificaco/prazo", tags=["Gerenciamento de Etapas"])
async def verificar_prazo(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
    ):
    """
    Verifica o prazo de todas as etapas em aberto e notifica os responsáveis em caso de vencimento.

    Args:
        background_tasks (BackgroundTasks): O gerenciador de tarefas em segundo plano do FastAPI.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se ocorrer um erro ao processar a requisição.
    """
    try:
        etapas = db.query(Etapa).filter(Etapa.vencido == "Em aberto").all()
        
        #Lógica para envio de notificação e mudança de status caso a etapa esteja vencida
        data_atual = datetime.now()
        for etapa in etapas:
            administradores = (db.query(User)
            .join(Gestao,etapa.id_setor == Gestao.id_setor)
            .filter(User.permissao_adm == True, Gestao.gestor == True)
            .all()
            )
            responsavel_etapa = db.query(User).filter(User.id == etapa.responsavel_id).first()
            nome_responsavel = responsavel_etapa.nome
            prazo = etapa.prazo
            prazo_formatado = prazo.strftime("%d/%m/%Y")
            if prazo < data_atual:  
                etapa.vencido = "Vencido"
                #Envio de notificação pros gestores
                for adm in administradores:
                    #PENDENTE VERIFICAR O ID QUE SERÁ ENVIADA A NOTIFICAÇÃO
                    background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, adm.id, etapa.id_setor, False, f"O prazo da etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} que foi atribuído ao usuário {nome_responsavel} venceu no dia {prazo_formatado}.")

                background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, etapa.responsavel_id, etapa.id_setor, False, f"A etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} venceu no dia {prazo_formatado}.")
                log_action(db, 989890796, "Vencimento de etapa", f"Etapa ID: {etapa.id}", responsavel_etapa.empresa_id)
                # Lança a ação de negado
                mensagem = f"Etapa venceu no dia {prazo_formatado}"
                acao = AcoesEtapaCreate(etapa_id=etapa.id, acao=mensagem, user_id=989890796)
                await adicionar_acao(db,acao)
    except ValueError:
        db.rollback()
        db.close()
        raise HTTPException(status_code=400, detail="Erro ao efetuar a requisição")








class EtapaUpdatePayload(BaseModel):
    """Payload para atualizar uma etapa."""
    descricao: Optional[str] = None
    finalizada: bool = False
    negado: Optional[bool] = False
    pendencia: Optional[bool] = False
    id_etapa_pendencia: Optional[int] = None

@router.patch("/etapas/{etapa_id}", tags=["Gerenciamento de Etapas"])
async def atualizar_etapa(
    etapa_id: int,
    background_tasks: BackgroundTasks,
    payload: EtapaUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza o comentário ou o status de uma etapa específica.

    Args:
        etapa_id (int): O ID da etapa a ser atualizada.
        background_tasks (BackgroundTasks): O gerenciador de tarefas em segundo plano do FastAPI.
        payload (EtapaUpdatePayload): Os dados da etapa a serem atualizados.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se a etapa não for encontrada ou se o usuário não tiver permissão.

    Returns:
        dict: Uma mensagem de sucesso informando que a etapa foi atualizada.
    """
    # 1. Busca de dados Iniciais
    # Busca todos os setores aos quais o usuário atual está associado e se ele é gestor
    setores_user = db.query(Gestao).filter(Gestao.id_usuario == current_user.id).all()
    # Formata os dados em uma lista de tuplas (id_setor,gestor(boolean)) para facilitar a verificação de permissões.
    setores_usuario = [(setor.id_setor, setor.gestor) for setor in setores_user]
    # Busca a etapa específica que será atualizada pelo seu ID
    etapa = db.query(Etapa).filter(Etapa.id == etapa_id).first()
    # Busca a demanda à qual a etapa pertence
    demanda = db.query(Demanda).filter(Demanda.id == etapa.demanda_id).first()
    # Armazena o ID do setor da etapa atual para verificações de permissão.
    etapa_setor = etapa.id_setor
    # 2. VALIDAÇÃO DE EXISTÊNCIA
    # Se a etapa não for encontrada no banco de dados, lança uma exceção HTTP 404
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    
    # 4. LÓGICA DE TRANSIÇÃO DE ETAPAS
    # Determina o número da próxima etapa para poder atualizar
    numero_proxima_etapa = etapa.numero_etapa + 1
    # Busca a próxima etapa na mesma demanda.
    etapa2 = db.query(Etapa).filter(Etapa.demanda_id == etapa.demanda_id, Etapa.numero_etapa == numero_proxima_etapa).first()
    # Busca os usuários associados aos setores da próxima etapa e da etapa atual (para enviar notificações).
    if etapa2:
        usuarios_por_setor_etapa2 = db.query(Gestao).filter(Gestao.id_setor == etapa2.id_setor).all()
    usuarios_por_setor_etapa_atual = db.query(Gestao).filter(Gestao.id_setor == etapa.id_setor).all()
    # 5. LÓGICA PRINCIPAL DE ATUALIZAÇÃO DE STATUS
    # Este bloco é executado se a requisição indicar que a etapa deve ser finalizada ou negada.
    if payload.finalizada or payload.negado:
        # Busca todas as etapas da demanda para achar se existe alguma com status de AGUARDANDO_PENDENCIA
        etapas_com_pendencia = db.query(Etapa).filter(Etapa.demanda_id == etapa.demanda_id, Etapa.status == StatusEtapa.AGUARDANDO_PENDENCIA).first()
        if etapas_com_pendencia:
            if payload.finalizada:
                etapas_com_pendencia.status = StatusEtapa.PENDENTE
                etapa.status = StatusEtapa.FINALIZADO
                background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, etapas_com_pendencia.responsavel_id, etapas_com_pendencia.id_setor, False, f"A pendência da etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} foi finalizada.")
                mensagem = f"A pendência da etapa foi finalizada por {current_user.nome}"
                acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                await adicionar_acao(db,acao)
                # Lançamos o texto do usuário
                acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                await adicionar_acao(db,acao)
                log_action(db, current_user.id, "Resolução de Pendência", f"Etapa ID: {etapa_id}", current_user.empresa_id)
            else:
                etapas_com_pendencia.status = StatusEtapa.AGUARDANDO_PENDENCIA
                etapa.status = StatusEtapa.NEGADO
                background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, etapas_com_pendencia.responsavel_id, etapas_com_pendencia.id_setor, False, f"A etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} foi negada por {current_user.nome}.")
                mensagem = f"A etapa foi negada por {current_user.nome}"
                acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                await adicionar_acao(db,acao)
                # Lançamos o texto do usuário
                acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                await adicionar_acao(db,acao)
                log_action(db, current_user.id, "Etapa negada", f"Etapa ID: {etapa_id}", current_user.empresa_id)
        else:
            setor_etapa_atual = None
            # Itera sobre os setores do usuário para verificar suas permissões na etapa atual.
            for setor in setores_usuario:
                if setor[0] == etapa_setor:
                    setor_etapa_atual = setor[0]
                # Caso 1 -  O usuário é GESTOR do setor da etapa.
                if setor[0] == etapa_setor and setor[1] == True:
                    # Se a etapa requer validação de um gestor.
                    if etapa.validacao == True:
                        # Se a ação foi negar a etapa.
                        if payload.negado == True:
                            etapa.status = StatusEtapa.NEGADO
                            if etapa2: etapa2.status = StatusEtapa.AGUARDANDO # A próxima etapa volta a aguardar.
                            # Envia notificação em segundo plano para o responsável da etapa.
                            background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, etapa.responsavel_id, etapa.id_setor, False, f"A etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} foi negada.")
                            log_action(db, current_user.id, "Negação de Etapa", f"Etapa ID: {etapa_id}", current_user.empresa_id)
                            # Lança a ação de negado
                            # Ainda vamos editar a mensagem de negado
                            mensagem = f"Etapa foi negada por {current_user.nome}"
                            acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                            await adicionar_acao(db,acao)
                            # Lançamos o texto do usuário
                            acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                            await adicionar_acao(db,acao)
                        # Se a ação foi aprovar (finalizar) a etapa.
                        elif payload.finalizada == True:
                            etapa.status = StatusEtapa.FINALIZADO
                            if etapa.vencido != "Vencido":
                                etapa.vencido = "Cumprido"
                            background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, etapa.responsavel_id, etapa.id_setor, False, f"A etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} foi aprovada!")
                            mensagem = f"Etapa foi aprovada e finalizada por {current_user.nome}"
                            acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                            await adicionar_acao(db,acao)
                            # Lançamos o texto do usuário
                            acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                            await adicionar_acao(db,acao)
                            if etapa2 is not None:
                                if etapa2.status != StatusEtapa.FINALIZADO:
                                    etapa2.status = StatusEtapa.PENDENTE
                                    for usuario in usuarios_por_setor_etapa2:
                                        if usuario.gestor == True:
                                            background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa2.id, usuario.id_usuario, etapa2.id_setor, False, f"A etapa {etapa2.nome_etapa} da demanda {etapa2.demanda_id} precisa do seu setor!")
                            log_action(db, current_user.id, "Finalização de Etapa", f"Etapa ID: {etapa_id}", current_user.empresa_id)
                    # Se a etapa NÃO requer validação de gestor, o gestor pode finalizá-la diretamente.
                    else:
                        etapa.status = StatusEtapa.FINALIZADO
                        if etapa.vencido != "Vencido":
                            etapa.vencido = "Cumprido"
                        mensagem = f"Etapa foi finalizada por {current_user.nome}"
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                        await adicionar_acao(db,acao)
                        # Lançamos o texto do usuário
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                        await adicionar_acao(db,acao)
                        if etapa2 is not None:
                            if etapa2.status != StatusEtapa.FINALIZADO:
                                etapa2.status = StatusEtapa.PENDENTE
                                for usuario in usuarios_por_setor_etapa2:
                                    if usuario.gestor == True:
                                        background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa2.id, usuario.id_usuario, etapa2.id_setor, False, f"A etapa {etapa2.nome_etapa} da demanda {etapa2.demanda_id} precisa do seu setor!")
                        log_action(db, current_user.id, "Finalização de Etapa", f"Etapa ID: {etapa_id}", current_user.empresa_id)
                # CASO 2: O usuário pertence ao setor da etapa, mas NÃO é gestor.
                elif setor[0] == etapa_setor and setor[1] == False:
                    # Se a etapa requer validação de gestor, o usuário comum só pode movê-la para "Pendente".
                    if etapa.validacao == True:
                        etapa.status = StatusEtapa.PENDENTE
                        mensagem = f"Etapa foi finalizada por {current_user.nome} e aguarda validação do gestor"
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                        await adicionar_acao(db,acao)
                        # Lançamos o texto do usuário
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                        await adicionar_acao(db,acao)
                        for usuario in usuarios_por_setor_etapa_atual:
                            if usuario.gestor == True:
                                background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa.id, usuario.id_usuario, etapa.id_setor, False, f"A etapa {etapa.nome_etapa} da demanda {etapa.demanda_id} precisa da sua validação!")
                        log_action(db, current_user.id, "Etapa Pendente de Validação", f"Etapa ID: {etapa_id}", current_user.empresa_id)
                    # Se não requer validação, o usuário comum pode finalizar a etapa.
                    else:
                        etapa.status = StatusEtapa.FINALIZADO
                        if etapa.vencido != "Vencido":
                            etapa.vencido = "Cumprido"
                        mensagem = f"Etapa foi finalizada por {current_user.nome}"
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
                        await adicionar_acao(db,acao)
                        # Lançamos o texto do usuário
                        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
                        await adicionar_acao(db,acao)
                        if etapa2:
                            etapa2.status = StatusEtapa.PENDENTE
                            for usuario in usuarios_por_setor_etapa2:
                                if usuario.gestor == True:
                                    background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa2.id, usuario.id_usuario, etapa2.id_setor, False, f"A etapa {etapa2.nome_etapa} da demanda {etapa2.demanda_id} precisa do seu setor!")
                        log_action(db, current_user.id, "Finalização de Etapa", f"Etapa ID: {etapa_id}", current_user.empresa_id)
                else:
                    continue
            # Se após o loop, a variável 'setor_etapa_atual' ainda for None, significa que o usuário não pertence ao setor da etapa.
            if setor_etapa_atual is None:
                raise HTTPException(status_code=403, detail="Acesso negado.")
    # Se foi sinalizada uma pendencia
    elif payload.pendencia:
        #  Caso não for informado a etapa pendente retornar erro
        if payload.id_etapa_pendencia is None:
            raise HTTPException(status_code=400, detail="Etapa pendente não encontrada.")
        etapa_pendente = db.query(Etapa).filter(Etapa.id == payload.id_etapa_pendencia).first()
        # Busca o usuario responsavel da etapa pendente
        etapa.status = StatusEtapa.AGUARDANDO_PENDENCIA
        etapa_pendente.status = StatusEtapa.PENDENTE
        # Texto do sistema
        mensagem = f"{current_user.nome} sinalizou uma pendência na etapa {etapa_pendente.nome_etapa}"
        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
        await adicionar_acao(db,acao)
        # Texto do usuário
        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=payload.descricao, user_id=current_user.id)
        await adicionar_acao(db,acao)
        background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa_pendente.id, etapa_pendente.responsavel_id, etapa_pendente.id_setor, False, f"{current_user.nome} apontou uma pendência na etapa {etapa_pendente.nome_etapa} da demanda {etapa_pendente.demanda_id}!")
        log_action(db, current_user.id, "Sinalização de Pendência", f"Etapa ID: {etapa_id}", current_user.empresa_id)
    # Se a requisição não for para finalizar ou negar, significa que é para salvar o progresso (mudar status para "Iniciado").
    elif not payload.finalizada and not payload.negado and not payload.pendencia:
        etapa.status = StatusEtapa.INICIADO
        mensagem = f"{current_user.nome} iniciou a etapa"
        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
        await adicionar_acao(db,acao)
        log_action(db, current_user.id, "Início de Etapa", f"Etapa ID: {etapa_id}", current_user.empresa_id)
    if etapa.status == StatusEtapa.INICIADO:
        demanda.status = "Ativo"
    elif etapa2 is not None:
        if etapa.status == StatusEtapa.PENDENTE or etapa.status == StatusEtapa.FINALIZADO and etapa2.status == StatusEtapa.PENDENTE or etapa.status == StatusEtapa.AGUARDANDO_PENDENCIA:
            demanda.status = "Em espera"
    else:
        demanda.status = "Finalizada"
    etapa.atualizada_em = datetime.now()
    if etapa.status == StatusEtapa.FINALIZADO:
        await atualizar_status_demanda(db, etapa.responsavel_id, etapa.demanda_id,etapa2.id)
    await atualizar_status_demanda(db, etapa.responsavel_id, etapa.demanda_id,etapa_id)
    db.commit()
    
    return {"message": f"Etapa {etapa_id} atualizada com sucesso."}
class ResponsavelUpdatePayload(BaseModel):
    """Payload para atualizar o responsável da etapa."""
    responsavel_id: int
    prazo: Optional[str] = None

@router.patch("/etapa/responsavel/{etapa_id}", tags=["Gerenciamento de Etapas"])
async def atualizar_responsavel_etapa(
    etapa_id: int,
    ResponsavelUpdatePayload: ResponsavelUpdatePayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza o responsável de uma etapa específica.

    Args:
        etapa_id (int): O ID da etapa a ser atualizada.
        ResponsavelUpdatePayload (ResponsavelUpdatePayload): Os dados do novo responsável e prazo.
        background_tasks (BackgroundTasks): O gerenciador de tarefas em segundo plano do FastAPI.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se a etapa não for encontrada, se o formato da data for inválido ou se o usuário não tiver permissão.

    Returns:
        dict: Uma mensagem de sucesso informando que a etapa foi atualizada.
    """
    responsavel_id = ResponsavelUpdatePayload.responsavel_id
    prazo_str = ResponsavelUpdatePayload.prazo # Recebe "YYYY-MM-DD" ou None
    prazo_obj = None # Objeto de data para salvar no banco
    prazo_formatado_msg = "não definido" # Texto padrão para a mensagem
    try:
        #Lógica para verificar se o usuário pertence a empresa da etapa
        etapa = db.query(Etapa).filter(Etapa.id == etapa_id).first()
        etapa.responsavel_id = responsavel_id
        if prazo_str:
            try:
                # 2. Faz o PARSE da string "YYYY-MM-DD" para um objeto datetime
                # Usamos .date() para pegar apenas a data, se sua coluna for DATE
                prazo_obj = datetime.strptime(prazo_str, "%Y-%m-%d").date() 
                etapa.vencido = "Em aberto"
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Formato de data inválido. Esperado YYYY-MM-DD, recebido {prazo_str}")
            # 3. Formata o objeto datetime para a string da mensagem "DD/MM/YYYY"
            prazo_formatado_msg = prazo_obj.strftime("%d/%m/%Y")
        # 4. ATRIBUI os valores ao objeto da etapa
        etapa.prazo = prazo_obj 

        setor_id = etapa.id_setor
        empresa_id = db.query(Setores).filter(Setores.id == setor_id).first().empresa_id
        
        if current_user.empresa_id != empresa_id:
            raise HTTPException(status_code=403, detail="Ação nao permitida.")

        #Lógica para alterção do responsável na etapa e etapaResponsavel
        etapa_responsavel = db.query(EtapaResponsavel).filter(EtapaResponsavel.etapa_id == etapa_id).first()
        if not etapa or not etapa_responsavel:
            raise HTTPException(status_code=404, detail="Etapa não encontrada.")
        etapa_responsavel.responsavel_id = responsavel_id
        db.commit()    
        await atualizar_status_demanda(db, responsavel_id, etapa.demanda_id,etapa_id)
        nome_responsavel_etapa = db.query(User).filter(User.id == responsavel_id).first().nome 
        mensagem = f"{nome_responsavel_etapa} foi designado como responsável da etapa pelo usuário {current_user.nome}, foi definido o prazo de até {prazo_formatado_msg} para finalização desta etapa!"
        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=mensagem, user_id=989890796)
        await adicionar_acao(db,acao)
        background_tasks.add_task(enviar_notificacao, db, etapa.demanda_id, etapa_id, responsavel_id, etapa.id_setor, False, f"Você foi designado para a etapa {etapa.nome_etapa} da demanda {etapa.demanda_id}, com prazo até {prazo_formatado_msg}.")
        log_action(db, current_user.id, "Alteração de Responsável", f"Etapa ID: {etapa_id}, Novo Responsável ID: {responsavel_id}",current_user.empresa_id)
        return {"message": f"Etapa de {etapa.nome_etapa} atualizada com sucesso."}

    except Exception as e:
        db.rollback() # Desfaz todas as operações em caso de erro.
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar etapa: {str(e)}")

class AcoesEtapaPayload(BaseModel):
    """Payload para criar uma nova ação na etapa."""
    acao: str
@router.post("/etapa/acao/{etapa_id}", tags=["Gerenciamento de Etapas"])
async def create_acao_etapa(
    etapa_id: int,
    acao_data: AcoesEtapaPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova ação (comentário) em uma etapa.

    Args:
        etapa_id (int): O ID da etapa.
        acao_data (AcoesEtapaPayload): O conteúdo da ação.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se a etapa não for encontrada ou se ocorrer um erro ao criar a ação.

    Returns:
        dict: Uma mensagem de sucesso.
    """
    try:
        etapa = db.query(Etapa).filter(Etapa.id == etapa_id).first()
        if not etapa:
            raise HTTPException(status_code=404, detail="Etapa não encontrada.")
        
        acao = AcoesEtapaCreate(etapa_id=etapa_id, acao=acao_data.acao, user_id=current_user.id)
        await adicionar_acao(db,acao)
        return {"message": "Comentário salvo com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar ação: {str(e)}")

@router.patch("/etapa/pendencia/{etapa_id}", tags=["Gerenciamento de Etapas"])
async def pendencia_etapa(
    etapa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Define uma etapa como pendente.

    Args:
        etapa_id (int): O ID da etapa.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.
    """
    pass
# --------------------------------------------------------
# 4. ROTAS DE GERENCIAMENTO DE EMPRESA E PERSONALIZAÇÃO
# --------------------------------------------------------
@router.post("/empresas/personalizadas", tags=["Configuração da Empresa"])
async def criar_personalizacao_empresa(
    dados: str = Form(...),
    imagem: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova empresa e toda a sua configuração inicial.

    Args:
        dados (str): Os dados de personalização da empresa em formato JSON.
        imagem (UploadFile): O arquivo de imagem da logo da empresa.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se ocorrer um erro ao salvar a personalização.

    Returns:
        dict: Uma mensagem de sucesso.
    """
    try:
        conteudo_imagem = await imagem.read()
        usuario_adm = db.query(User).filter(User.id == current_user.id).first()
        # Chama a função de serviço para executar a lógica
        _criar_empresa_com_personalizacao(db, dados, conteudo_imagem, usuario_adm)
        db.commit()
    except Exception as e:
        db.rollback() # Desfaz todas as operações em caso de erro.
        raise HTTPException(status_code=500, detail=f"Erro ao salvar personalização: {str(e)}")
    
    return {"message": "Empresa configurada com sucesso!"}

#Rota para salvar a logo da empresa
@router.get("/empresa/logo", tags=["Configuração da Empresa"])
async def obter_logo_empresa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna a logo da empresa do usuário logado.

    Args:
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não estiver associado a uma empresa ou se a logo não for encontrada.

    Returns:
        StreamingResponse: A resposta com a imagem da logo.
    """
    if not current_user.empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não está associado a uma empresa.")
        
    empresa = db.query(Empresa).filter(Empresa.id == current_user.empresa_id).first()
    if not empresa or not empresa.logo:
        raise HTTPException(status_code=404, detail="Logo não encontrada.")

    return StreamingResponse(BytesIO(empresa.logo), media_type="image/png")


@router.get("/empresa/configuracao", tags=["Configuração da Empresa"])
async def obter_configuracao_empresa(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna todos os dados de configuração da empresa para o frontend.

    Args:
        request (Request): A requisição HTTP.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não estiver associado a uma empresa ou se a empresa não for encontrada.

    Returns:
        dict: Um dicionário com os dados de configuração da empresa, setores e áreas.
    """
    if not current_user.empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não está associado a uma empresa.")

    # Consulta otimizada para evitar N+1
    empresa = (
        db.query(Empresa)
        .options(
            selectinload(Empresa.setores), # Carrega todos os setores de uma vez
            selectinload(Empresa.areas).selectinload(Area.modelos_etapa) # Carrega áreas e seus modelos de etapa
        )
        .filter(Empresa.id == current_user.empresa_id)
        .first()
    )
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    logo_url = str(request.base_url) + f"api/empresa/logo"
    return {
        "empresa": {
            "nomeEmpresa": empresa.nome,
            "cod_cor": empresa.cod_cor,
            "logo_url": logo_url
        },
        "setores": empresa.setores,
        "areas": empresa.areas
    }

@router.get("/empresa/usuarios", tags=["Gerenciamento de Usuários"])
def listar_usuarios_da_empresa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os usuários da empresa.

    Args:
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não estiver associado a uma empresa.

    Returns:
        list: Uma lista de dicionários, cada um representando um usuário formatado.
    """
    if not current_user.empresa_id:
        raise HTTPException(status_code=404, detail="Usuário não está associado a uma empresa.")

    # 1. CONSULTA OTIMIZADA
    # Esta consulta única busca os usuários e, de forma eficiente, já carrega
    # todas as associações de gestão (gestao_setores) e os detalhes de cada setor relacionado.
    usuarios = (
        db.query(User)
        .options(
            selectinload(User.gestao_setores).joinedload(Gestao.setor)
        )
        .filter(User.empresa_id == current_user.empresa_id)
        .all()
    )

    # 2. FORMATAÇÃO MANUAL DA RESPOSTA
    # Agora, vamos iterar sobre os resultados pré-carregados para construir a lista.
    lista_usuarios_formatada = []
    for user in usuarios:
        # Construímos a lista de setores para este usuário específico.
        setores_usuario = [
            {
                "id": gestao_assoc.setor.id,
                "nome": gestao_assoc.setor.nome,
                "gestor": gestao_assoc.gestor
            }
            # 'user.gestao_setores' contém a lista de associações Gestao<->Setor
            for gestao_assoc in user.gestao_setores 
        ]
        
        # Criamos o dicionário final para o usuário
        lista_usuarios_formatada.append({
            "id": user.id,
            "nome": user.nome,
            "email": user.email,
            "telefone": user.telefone,
            "whatsapp": user.whatsapp,
            "registro": user.registro,
            "empresa_id": user.empresa_id,
            "setores": setores_usuario
        })

    # 3. RETORNA A LISTA FORMATADA DIRETAMENTE
    return lista_usuarios_formatada  

#Função responsável pela exclusão do usuário
@router.delete("/empresa/usuarios",status_code=204, tags=["Gerenciamento de Usuários"])
async def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exclui um usuário e suas associações.

    Args:
        usuario_id (int): O ID do usuário a ser excluído.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não tiver permissão, se tentar se autoexcluir
                       ou se o usuário não for encontrado.

    Returns:
        Response: Uma resposta com status 204 (No Content) em caso de sucesso.
    """
    # Apenas um administrador pode excluir outros usuários.
    if not current_user.permissao_adm:
        raise HTTPException(status_code=403, detail="Ação não permitida.")
    if current_user.id == usuario_id:
        raise HTTPException(status_code=400, detail="Não é possível excluir a si mesmo.")

    usuario_a_excluir = db.query(User).filter(User.id == usuario_id).first()
    if not usuario_a_excluir:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Exclui as associações do usuário na tabela 'gestao'
    db.query(Gestao).filter(Gestao.id_usuario == usuario_id).delete(synchronize_session=False)

    # Exclui o usuário
    db.delete(usuario_a_excluir)

    # Executa a transação.
    db.commit()
    log_action(db, current_user.id, "Exclusão de Usuário", f"Usuário ID: {usuario_id}",current_user.empresa_id)
    # Retorna uma resposta vazia com status 204
    return Response(status_code=204)

#Função responsável por aplicar a edição de usuários no banco
@router.put("/empresa/usuarios/{usuario_id}", tags=["Gerenciamento de Usuários"])
async def atualizar_usuario(
    usuario_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza os dados de um usuário e suas associações de setor.

    Args:
        usuario_id (int): O ID do usuário a ser atualizado.
        payload (UserUpdate): Os novos dados do usuário e suas associações de setor.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não tiver permissão ou se o usuário não for encontrado.

    Returns:
        dict: Uma mensagem de sucesso.
    """
    # Um usuário pode atualizar a si mesmo, ou um admin pode atualizar outros.
    if not current_user.permissao_adm and current_user.id != usuario_id:
        raise HTTPException(status_code=403, detail="Ação não permitida.")

    user_a_atualizar = db.query(User).filter(User.id == usuario_id).first()
    if not user_a_atualizar:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    # 1. Remove todas as associações de setor antigas do usuário.
    db.query(Gestao).filter(Gestao.id_usuario == usuario_id).delete(synchronize_session=False)
    
    # 2. Adiciona as novas associações de setor enviadas no payload.
    if payload.setores:
        for setor_info in payload.setores:
            nova_associacao = Gestao(
                id_setor=setor_info["id"],
                id_usuario=usuario_id,
                gestor=setor_info["gestor"]
            )
            db.add(nova_associacao)
    
    # 3. Atualiza os campos do próprio usuário.
    user_a_atualizar.nome = payload.nome
    user_a_atualizar.email = payload.email
    user_a_atualizar.telefone = payload.telefone
    user_a_atualizar.whatsapp = payload.whatsapp
    user_a_atualizar.registro = payload.registro
    
    # 4. Salva todas as alterações de uma só vez.
    db.commit()
    log_action(db, current_user.id, "Atualização de Usuário", f"Usuário ID: {usuario_id}",current_user.empresa_id)
    return {"message": "Usuário atualizado com sucesso."}


@router.put("/empresa/configuracao", tags=["Configuração da Empresa"])
async def atualizar_configuracao_empresa(
    payload: EmpresaConfigUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza a configuração completa da empresa.

    Args:
        payload (EmpresaConfigUpdatePayload): Os novos dados de configuração da empresa.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não estiver associado a uma empresa ou se ocorrer um
                       erro durante a atualização.

    Returns:
        set: Uma mensagem de sucesso.
    """
    if not current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Usuário não possui uma empresa para atualizar.")

    try:
        # 1. CHAMA O SERVIÇO PARA PREPARAR TODAS AS MUDANÇAS

        mensagem = _atualizar_empresa_e_relacionados_service(db, current_user.empresa_id, payload)
        print(payload.areas)
        if mensagem != "Empresa atualizada com sucesso!":
            return mensagem
    except Exception as e:
        # 3. ROLLBACK EM CASO DE FALHA
        # Se qualquer passo falhou, desfaz todas as alterações preparadas.
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao atualizar a empresa: {str(e)}")
    log_action(db, current_user.id, "Atualização de Configuração da Empresa", f"Empresa ID: {current_user.empresa_id}",current_user.empresa_id)
    return {mensagem}

# --------------------------------------------------------
# 5. ROTAS DE NOTIFICAÇÃO
# --------------------------------------------------------
@router.patch("/notificacao/marcar_lida", tags=["Gerenciamento de notificações"])
async def marcar_lida_notificacao(
    lista_notificacoes: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca uma ou mais notificações como lidas.

    Args:
        lista_notificacoes (List[int]): Uma lista de IDs de notificações a serem marcadas como lidas.
        background_tasks (BackgroundTasks): O gerenciador de tarefas em segundo plano do FastAPI.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Raises:
        HTTPException: Se o usuário não estiver autenticado.

    Returns:
        dict: Uma mensagem de sucesso.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuário não autenticado.")
    
    background_tasks.add_task(marcar_notificacoes_como_lidas, db, lista_notificacoes,current_user.id)
    
    return {"message": "Notificação marcada como lida com sucesso."}


# --------------------------------------------------------
# 5. ROTAS DO WEBSOCKET
# --------------------------------------------------------
@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications( 
    websocket: WebSocket,user_id: int,user: User = Depends(get_current_user_from_ws)):
    """
    Endpoint WebSocket para notificações em tempo real.

    Args:
        websocket (WebSocket): A conexão WebSocket.
        user_id (int): O ID do usuário para o qual as notificações são destinadas.
        user (User): O usuário autenticado a partir do token WebSocket.
    """
    if user.id != user_id:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    await manager.connect(websocket,user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Aqui você pode processar a mensagem recebida, se necessário
            print(f"Mensagem recebida: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket,user_id)
        
        
# --------------------------------------------------------
# 6. ROTAS DO LOG
# --------------------------------------------------------
@router.get("/logs", tags=["Gerenciamento de Logs"])
async def obter_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Obtém todos os logs da empresa do usuário autenticado.

    Args:
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado.

    Returns:
        list: Uma lista de dicionários, cada um representando um log formatado.
    """
    logs_com_usuarios = (
        db.query(Log, User.nome)
        .join(User, Log.user_id == User.id)
        .filter(Log.empresa_id == current_user.empresa_id)
        .order_by(Log.timestamp.desc())
        .all()
    )

    list_logs = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M"),
            "nome_user": nome_usuario,
        }
        for log, nome_usuario in logs_com_usuarios
    ]
    return list_logs

# Cria um rota que retorna os logs de acordo com o user_id fornecido, e com o intervalo de tempo fornecido
@router.get("/logs/usuario/{user_id}", tags=["Gerenciamento de Logs"])
async def obter_logs_por_usuario(
    user_id: int, 
    inicio: str = None, 
    fim: str = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém os logs de um usuário específico, com a opção de filtrar por intervalo de datas.

    Args:
        user_id (int): O ID do usuário cujos logs devem ser obtidos.
        inicio (str, optional): A data de início do filtro (formato 'dd/mm/yyyy HH:MM'). Defaults to None.
        fim (str, optional): A data de fim do filtro (formato 'dd/mm/yyyy HH:MM'). Defaults to None.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado (deve ser administrador).

    Raises:
        HTTPException: Se o usuário não tiver permissão ou se o formato da data for inválido.

    Returns:
        list: Uma lista de dicionários, cada um representando um log formatado.
    """
    # 1. Verificação de permissão
    if not current_user.permissao_adm:
        raise HTTPException(status_code=403, detail="Ação não permitida.")

    # 2. Construção da consulta base
    query = db.query(Log,User.nome).join(User,Log.user_id == User.id)
    
    query = query.filter(Log.user_id == user_id)
    
    # 3. Aplicação dos filtros de data (se fornecidos)
    try:
        if inicio:
            data_inicio = datetime.strptime(inicio, "%d/%m/%Y %H:%M")
            query = query.filter(Log.timestamp >= data_inicio)
        if fim:
            data_fim = datetime.strptime(fim, "%d/%m/%Y %H:%M")
            query = query.filter(Log.timestamp <= data_fim)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use 'dd/mm/yyyy HH:MM'.")
    
    # 4. Execução da consulta
    resultados = query.all()
    
    # 5. Formatação da lista de resultados
    list_logs = []
    for log,nome_user in resultados:
        list_logs.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.replace(tzinfo=fuso_utc).astimezone(fuso_horario_brasil).strftime("%d/%m/%Y %H:%M"),
            "nome_user": nome_user # O nome já vem da consulta principal
        })
        
    
    return list_logs


# --------------------------------------------------------
# 6. ROTAS DO RELATÓRIO
# --------------------------------------------------------

# Rota e função que gera um relatório de todas as demandas separando por status, com possibilidade de escolher um filtro pela area, e também por data de criação.
@router.get("/relatorios/demandas", tags=["Relatórios"])
async def gerar_relatorio_demandas(
    user_id: int = None, 
    inicio: str = None, 
    fim: str = None, 
    area: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera um relatório de demandas com filtros opcionais.

    Args:
        user_id (int, optional): O ID do usuário para filtrar as demandas. Defaults to None.
        inicio (str, optional): A data de início do filtro (formato 'dd/mm/yyyy HH:MM'). Defaults to None.
        fim (str, optional): A data de fim do filtro (formato 'dd/mm/yyyy HH:MM'). Defaults to None.
        area (int, optional): O ID da área para filtrar as demandas. Defaults to None.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado (deve ser administrador).

    Raises:
        HTTPException: Se o usuário não tiver permissão ou se ocorrer um erro ao gerar o relatório.

    Returns:
        O resultado do serviço de relatório de demandas.
    """
    
    # 1. Verificação de permissão
    if not current_user.permissao_adm:
        raise HTTPException(status_code=403, detail="Ação não permitida.")

    # 2. Execução do serviço
    try:
        relatorio = service_relatorio_demandas(db, current_user.empresa_id,inicio, fim, area)
        print(relatorio)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao gerar o relatório: {str(e)}")

class RelatorioRequest(BaseModel):
    tipo: str
    id_etapas: str
#Rota para retornar as etapas dentro do popup de relatório
@router.post("/relatorio/etapas", tags=["Relatórios"])
async def etapas_relatorio(
    dados: RelatorioRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        etapas_resultado = []
        id_busca = int(dados.id_etapas)
        # 1. Define qual lista buscar com base no tipo
        if dados.tipo == "user":
            etapas_db = db.query(Etapa).filter(Etapa.responsavel_id == id_busca).all()
        elif dados.tipo == "demanda":
            etapas_db = db.query(Etapa).filter(Etapa.demanda_id == id_busca).all()
        else:
            etapas_db = []
        # 2. Itera sobre a lista encontrada e formata os dados
        for etapa in etapas_db:
            # Busca o nome do responsável (evita erro se for None)
            nome_responsavel = "N/A"
            if etapa.responsavel_id:
                user_resp = db.query(User).filter(User.id == etapa.responsavel_id).first()
                if user_resp:
                    nome_responsavel = user_resp.nome
            # Formata a data para BR (dd/mm/yyyy)
            prazo_formatado = "N/A"
            if etapa.prazo:
                prazo_formatado = etapa.prazo.strftime('%d/%m/%Y')
            etapas_resultado.append({
                "etapa_id": etapa.id,
                "demanda_id": etapa.demanda_id,
                "nome": etapa.nome_etapa,
                "setor": etapa.setor,
                "responsavel": nome_responsavel,
                "prazo": prazo_formatado, # Aqui vai a data formatada
                "status": etapa.status,
                "vencido": etapa.vencido, # Retorna a flag (ex: "Vencido" ou "No Prazo")
            })
        return etapas_resultado

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro ao gerar o relatório: {str(e)}")
