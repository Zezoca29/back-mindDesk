# Guia de Deploy - MindDesk Backend

## Variáveis de Ambiente Necessárias

Configure estas variáveis no seu provedor de deploy:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/minddesk?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
NODE_ENV=production
PORT=5000
```

## Opções de Deploy

### 1. Render (Recomendado)

1. Acesse [render.com](https://render.com)
2. Faça login com GitHub
3. Clique em "New +" → "Web Service"
4. Conecte seu repositório
5. Configure:
   - **Name**: `minddesk-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2. Railway

1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub
3. Clique em "New Project" → "Deploy from GitHub repo"
4. Selecione seu repositório

### 3. Heroku

```bash
heroku login
heroku create minddesk-backend
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## Configuração do MongoDB

1. Crie uma conta no [MongoDB Atlas](https://mongodb.com/atlas)
2. Crie um cluster gratuito
3. Configure Network Access (0.0.0.0/0 para permitir todas as IPs)
4. Crie um usuário de banco de dados
5. Copie a URI de conexão

## URLs das APIs

Após o deploy, suas APIs estarão disponíveis em:

- **Base URL**: `https://seu-backend.onrender.com/api`
- **Auth**: `https://seu-backend.onrender.com/api/auth`
- **Habits**: `https://seu-backend.onrender.com/api/habits`
- **User**: `https://seu-backend.onrender.com/api/user`
- **Meditation**: `https://seu-backend.onrender.com/api/meditations`
- **Diary**: `https://seu-backend.onrender.com/api/diary`

## Teste do Deploy

Após o deploy, teste a API:

```bash
curl https://seu-backend.onrender.com/api/user/me
```

## Troubleshooting

- **Erro de CORS**: Verifique se `FRONTEND_URL` está configurado corretamente
- **Erro de MongoDB**: Verifique se `MONGO_URI` está correto e o IP está liberado
- **Erro de JWT**: Verifique se `JWT_SECRET` está configurado 