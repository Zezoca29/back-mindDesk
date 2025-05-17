import fs from 'fs';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // você precisa instalar: npm i node-fetch

// Carrega as variáveis de ambiente atuais
dotenv.config();

// Função para iniciar o ngrok e obter a URL
function startNgrok() {
  console.log('Iniciando ngrok...');

  const ngrokProcess = exec('.\\tools\\ngrok.exe http 5000 --log=stdout', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao executar ngrok: ${error}`);
      return;
    }
  });

  // Espera o ngrok iniciar e buscar a URL
  setTimeout(() => {
    fetch('http://localhost:4040/api/tunnels')
      .then(response => response.json())
      .then(data => {
        const publicUrl = data.tunnels[0].public_url;
        console.log(`URL pública do ngrok: ${publicUrl}`);

        // Atualizar o arquivo .env com a nova URL
        updateEnvFile(publicUrl);
      })
      .catch(error => {
        console.error('Erro ao obter URL do ngrok:', error);
      });
  }, 3000);

  // Encerrar ngrok ao sair
  process.on('SIGINT', () => {
    console.log('Encerrando ngrok...');
    ngrokProcess.kill();
    process.exit();
  });
}

// Função para atualizar o arquivo .env
function updateEnvFile(ngrokUrl) {
  try {
    let envContent = '';

    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    let lines = envContent.split('\n');

    const updatedLines = [];

    const setOrUpdate = (key, value) => {
      const index = lines.findIndex(line => line.startsWith(`${key}=`));
      if (index !== -1) {
        lines[index] = `${key}=${value}`;
      } else {
        lines.push(`${key}=${value}`);
      }
    };

    setOrUpdate('BACKEND_URL', ngrokUrl);
    setOrUpdate('MERCADO_PAGO_WEBHOOK_URL', `${ngrokUrl}/api/payments/webhook`);

    fs.writeFileSync('.env', lines.join('\n'), 'utf8');

    console.log('✅ Arquivo .env atualizado com a URL do ngrok:');
    console.log(`➡ BACKEND_URL=${ngrokUrl}`);
    console.log(`➡ MERCADO_PAGO_WEBHOOK_URL=${ngrokUrl}/api/payments/webhook`);

    console.log('🚀 Iniciando o servidor...');
    exec('npm run dev');
  } catch (error) {
    console.error(`Erro ao atualizar arquivo .env: ${error}`);
  }
}

// Iniciar o processo
startNgrok();
