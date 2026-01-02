import secrets

# Gerar um token aleatório de 32 bytes (256 bits)
secret_token = secrets.token_hex(64)

print(secret_token)  # Exibe o token gerado
