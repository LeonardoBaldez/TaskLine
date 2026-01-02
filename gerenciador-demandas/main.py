from fastapi import FastAPI,Cookie,Request, HTTPException
from fastapi.responses import RedirectResponse,JSONResponse
from api.routes import login, pages,gerenciamento
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(login.router)
app.include_router(pages.router)
app.include_router(gerenciamento.router)

@app.get("/" , tags=["login"])
async def login(request: Request,message: str = Cookie(None)):
    """
    Exibe a página de login.

    Args:
        request (Request): A requisição HTTP.
        message (str, optional): Uma mensagem para exibir na página de login. Defaults to Cookie(None).

    Returns:
        Response: A página de login renderizada.
    """
    response = templates.TemplateResponse("login.html",{"request":request,"message":message})
    if message:
        response.delete_cookie("message")
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handler inteligente de exceções HTTP.

    - Se a requisição for de uma API (espera JSON), retorna uma JSONResponse.
    - Se for de navegação (espera HTML), redireciona para a página de erro.

    Args:
        request (Request): A requisição HTTP que causou a exceção.
        exc (HTTPException): A exceção HTTP que foi levantada.

    Returns:
        JSONResponse or RedirectResponse: Uma resposta JSON para requisições de API
                                          ou um redirecionamento para a página de erro
                                          para requisições de navegação.
    """
    # Verifica se o cliente (fetch) aceita uma resposta JSON
    if "application/json" in request.headers.get("accept", ""):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}  # FastAPI usa 'detail' por padrão
        )
    
    # Caso contrário, mantém o comportamento de redirecionamento para o navegador
    response = RedirectResponse("/app/telaerro")
    response.set_cookie("codigo_error", str(exc.status_code))
    return response