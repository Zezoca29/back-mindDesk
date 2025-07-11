#!/bin/bash

echo "🚀 Preparando deploy do MindDesk Backend..."

# Verificar se está no branch main
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Você deve estar no branch main para fazer deploy"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Há mudanças não commitadas. Faça commit antes do deploy."
    exit 1
fi

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$MONGO_URI" ]; then
    echo "⚠️  MONGO_URI não está configurada"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET não está configurada"
fi

echo "✅ Tudo pronto para deploy!"
echo ""
echo "📋 Próximos passos:"
echo "1. Faça push para o GitHub: git push origin main"
echo "2. Configure as variáveis de ambiente no seu provedor de deploy"
echo "3. Acesse o painel do seu provedor para verificar o status"
echo ""
echo "🔗 URLs das APIs após deploy:"
echo "- Base: https://seu-backend.onrender.com/api"
echo "- Auth: https://seu-backend.onrender.com/api/auth"
echo "- Habits: https://seu-backend.onrender.com/api/habits"
echo "- User: https://seu-backend.onrender.com/api/user" 