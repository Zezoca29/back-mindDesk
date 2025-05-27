// controllers/paymentController.js
import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import PaymentModel from '../models/Payment.js';
import User from '../models/User.js';

dotenv.config();

// Configurando client do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Map para armazenar timeouts de verificação de pagamento
const paymentVerificationTimeouts = new Map();

/**
 * Verifica o status de um pagamento no Mercado Pago
 */
const checkPaymentStatus = async (paymentId) => {
  try {
    const payments = new Payment(client);
    const payment = await payments.get({ id: paymentId });
    return payment;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return null;
  }
};

/**
 * Atualiza o usuário para premium quando o pagamento é aprovado
 */
const upgradeToPremium = async (userId, paymentData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('Usuário não encontrado:', userId);
      return false;
    }

    // Atualizar usuário para premium
    user.subscriptionStatus = paymentData.transaction_amount >= 49.90 ? 'premium_plus' : 'premium';
    user.points = (user.points || 0) + 500; // Adicionar pontos de bônus
    await user.save();

    // Atualizar registro de pagamento
    await PaymentModel.updateOne(
      { mercadoPagoId: paymentData.id },
      {
        status: paymentData.status,
        subscriptionType: paymentData.transaction_amount >= 49.90 ? 'premium_plus' : 'premium',
        paymentDetails: {
          payment_id: paymentData.id,
          status_detail: paymentData.status_detail,
          payment_type_id: paymentData.payment_type_id,
          installments: paymentData.installments
        }
      }
    );

    console.log(`Usuário ${userId} atualizado para premium com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar usuário para premium:', error);
    return false;
  }
};

/**
 * Monitora o status de um pagamento em análise
 */
const monitorPaymentStatus = async (paymentId, userId, maxAttempts = 20, intervalMs = 30000) => {
  let attempts = 0;
  
  const checkStatus = async () => {
    attempts++;
    console.log(`Verificando status do pagamento ${paymentId} - Tentativa ${attempts}/${maxAttempts}`);
    
    const paymentData = await checkPaymentStatus(paymentId);
    
    if (!paymentData) {
      console.error(`Erro ao verificar pagamento ${paymentId}`);
      if (attempts < maxAttempts) {
        // Reagendar verificação
        const timeoutId = setTimeout(checkStatus, intervalMs);
        paymentVerificationTimeouts.set(paymentId, timeoutId);
      } else {
        console.error(`Limite de tentativas atingido para pagamento ${paymentId}`);
        paymentVerificationTimeouts.delete(paymentId);
      }
      return;
    }

    if (paymentData.status === 'approved') {
      console.log(`Pagamento ${paymentId} aprovado! Atualizando usuário...`);
      await upgradeToPremium(userId, paymentData);
      paymentVerificationTimeouts.delete(paymentId);
    } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      console.log(`Pagamento ${paymentId} rejeitado/cancelado. Status: ${paymentData.status}`);
      
      // Atualizar registro de pagamento com status final
      await PaymentModel.updateOne(
        { mercadoPagoId: paymentId },
        {
          status: paymentData.status,
          paymentDetails: {
            payment_id: paymentData.id,
            status_detail: paymentData.status_detail,
            payment_type_id: paymentData.payment_type_id,
            installments: paymentData.installments
          }
        }
      );
      
      paymentVerificationTimeouts.delete(paymentId);
    } else if (paymentData.status === 'in_process' || paymentData.status === 'pending') {
      console.log(`Pagamento ${paymentId} ainda em análise. Status: ${paymentData.status}`);
      
      if (attempts < maxAttempts) {
        // Reagendar verificação
        const timeoutId = setTimeout(checkStatus, intervalMs);
        paymentVerificationTimeouts.set(paymentId, timeoutId);
      } else {
        console.error(`Limite de tentativas atingido para pagamento ${paymentId}. Parando monitoramento.`);
        paymentVerificationTimeouts.delete(paymentId);
      }
    } else {
      console.log(`Status desconhecido para pagamento ${paymentId}: ${paymentData.status}`);
      paymentVerificationTimeouts.delete(paymentId);
    }
  };

  // Iniciar verificação
  const timeoutId = setTimeout(checkStatus, intervalMs);
  paymentVerificationTimeouts.set(paymentId, timeoutId);
};

/**
 * Cria um pagamento diretamente no Mercado Pago com cadastro de novo usuário
 */
export const createPaymentWithSignup = async (req, res) => {
  try {
    const { userData, paymentData } = req.body;

    // Validar dados obrigatórios do usuário
    if (!userData || !userData.nome || !userData.email || !userData.senha) {
      return res.status(400).json({
        success: false,
        message: 'Dados do usuário incompletos',
        requiredFields: ['nome', 'email', 'senha']
      });
    }

    // Validar dados obrigatórios do pagamento
    if (!paymentData || !paymentData.token || !paymentData.payment_method_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Dados de pagamento incompletos',
        requiredFields: ['token', 'payment_method_id', 'transaction_amount']
      });
    }

    // Verificar se o email já existe
    const emailExists = await User.findOne({ email: userData.email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está em uso. Por favor, use outro email ou faça login.'
      });
    }

    // Log para debug
    console.log('Enviando requisição para o Mercado Pago:', {
      email: userData.email,
      payment_method: paymentData.payment_method_id,
      amount: paymentData.transaction_amount
    });

    // Montando objeto de pagamento
    const paymentRequest = {
      body: {
        additional_info: {
          items: [
            {
              id: 'minddesk-subscription',
              title: 'MindDesk - Assinatura',
              description: 'Assinatura mensal do MindDesk',
              category_id: 'services',
              quantity: 1,
              unit_price: paymentData.transaction_amount
            }
          ],
          payer: {
            first_name: userData.nome.split(' ')[0] || 'Usuário',
            last_name: userData.nome.split(' ').slice(1).join(' ') || 'MindDesk',
          }
        },
        binary_mode: false,
        description: 'Assinatura Mind Desk',
        external_reference: `new_user_${Date.now()}`,
        installments: paymentData.installments || 1,
        metadata: {
          new_user: true,
          email: userData.email,
          nombre: userData.nome
        },
        payer: {
          entity_type: 'individual',
          type: 'customer',
          email: paymentData.payer?.email || userData.email,
          identification: paymentData.payer?.identification || {
            type: 'CPF',
            number: '00000000000'
          }
        },
        payment_method_id: paymentData.payment_method_id,
        token: paymentData.token,
        transaction_amount: paymentData.transaction_amount
      },
      requestOptions: { idempotencyKey: `minddesk-payment-new-${userData.email}-${Date.now()}` }
    };

    // Criar o pagamento no Mercado Pago
    const payments = new Payment(client);
    const mpResponse = await payments.create(paymentRequest);

    console.log('Resposta do Mercado Pago:', JSON.stringify(mpResponse, null, 2));

    // SEMPRE criar o usuário com status 'free' inicialmente
    const newUser = await User.create({
      email: userData.email,
      password: userData.senha, // Senha armazenada diretamente sem criptografia
      nome: userData.nome,
      subscriptionStatus: 'free', // Sempre inicia como free
      points: 0 // Sem pontos iniciais
    });

    // Sempre salvar o registro de pagamento
    await PaymentModel.create({
      user: newUser._id,
      mercadoPagoId: mpResponse.id,
      amount: mpResponse.transaction_amount,
      status: mpResponse.status,
      subscriptionType: 'pending', // Status inicial
      paymentMethod: mpResponse.payment_method_id,
      paymentDetails: {
        payment_id: mpResponse.id,
        status_detail: mpResponse.status_detail,
        payment_type_id: mpResponse.payment_type_id,
        installments: mpResponse.installments
      }
    });

    // Decidir o que fazer baseado no status do pagamento
    if (mpResponse.status === 'approved') {
      // Pagamento aprovado imediatamente - atualizar para premium
      console.log('Pagamento aprovado imediatamente, atualizando usuário...');
      await upgradeToPremium(newUser._id, mpResponse);
    } else if (mpResponse.status === 'in_process' || mpResponse.status === 'pending') {
      // Pagamento em análise - iniciar monitoramento
      console.log('Pagamento em análise, iniciando monitoramento...');
      monitorPaymentStatus(mpResponse.id, newUser._id);
    } else {
      // Pagamento rejeitado ou outro status - usuário permanece free
      console.log('Pagamento não aprovado, usuário permanece com conta gratuita');
    }

    // Retornar resposta sempre positiva (usuário foi criado)
    res.status(200).json({
      success: true,
      payment_id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      user_id: newUser._id,
      message: mpResponse.status === 'in_process' || mpResponse.status === 'pending' 
        ? 'Usuário criado. Pagamento em análise - conta será atualizada automaticamente quando aprovado.'
        : mpResponse.status === 'approved' 
        ? 'Usuário criado e conta premium ativada!'
        : 'Usuário criado com conta gratuita.'
    });

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    
    // Verificar se é um erro específico do Mercado Pago
    if (error.response && error.response.data) {
      return res.status(error.response.status || 400).json({
        success: false,
        message: 'Erro ao processar pagamento no Mercado Pago',
        error: error.response.data
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar pagamento', 
      error: error.message 
    });
  }
};

/**
 * Webhook para receber notificações do Mercado Pago
 */
export const mercadoPagoWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Webhook recebido:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Buscar o pagamento no banco
      const paymentRecord = await PaymentModel.findOne({ mercadoPagoId: paymentId });
      
      if (!paymentRecord) {
        console.log(`Pagamento ${paymentId} não encontrado no banco`);
        return res.status(200).json({ received: true });
      }

      // Verificar status atual no Mercado Pago
      const paymentData = await checkPaymentStatus(paymentId);
      
      if (!paymentData) {
        console.error(`Erro ao verificar pagamento ${paymentId} via webhook`);
        return res.status(200).json({ received: true });
      }

      // Se o pagamento foi aprovado e ainda não foi processado
      if (paymentData.status === 'approved' && paymentRecord.status !== 'approved') {
        console.log(`Webhook: Pagamento ${paymentId} aprovado! Atualizando usuário...`);
        
        // Cancelar monitoramento se existir
        if (paymentVerificationTimeouts.has(paymentId)) {
          clearTimeout(paymentVerificationTimeouts.get(paymentId));
          paymentVerificationTimeouts.delete(paymentId);
        }
        
        // Atualizar usuário para premium
        await upgradeToPremium(paymentRecord.user, paymentData);
      } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
        console.log(`Webhook: Pagamento ${paymentId} rejeitado/cancelado`);
        
        // Cancelar monitoramento se existir
        if (paymentVerificationTimeouts.has(paymentId)) {
          clearTimeout(paymentVerificationTimeouts.get(paymentId));
          paymentVerificationTimeouts.delete(paymentId);
        }
        
        // Atualizar registro de pagamento
        await PaymentModel.updateOne(
          { mercadoPagoId: paymentId },
          {
            status: paymentData.status,
            paymentDetails: {
              payment_id: paymentData.id,
              status_detail: paymentData.status_detail,
              payment_type_id: paymentData.payment_type_id,
              installments: paymentData.installments
            }
          }
        );
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Endpoint para verificar status de um pagamento específico (para debug)
 */
export const checkPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const paymentData = await checkPaymentStatus(paymentId);
    
    if (!paymentData) {
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado'
      });
    }

    const paymentRecord = await PaymentModel.findOne({ mercadoPagoId: paymentId })
      .populate('user', 'email nome subscriptionStatus');

    res.json({
      success: true,
      mercadoPago: {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        amount: paymentData.transaction_amount
      },
      database: paymentRecord || null
    });
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar pagamento',
      error: error.message
    });
  }
};

/**
 * Limpa timeouts quando o servidor é encerrado
 */
process.on('SIGTERM', () => {
  console.log('Limpando timeouts de verificação de pagamento...');
  paymentVerificationTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  paymentVerificationTimeouts.clear();
});

process.on('SIGINT', () => {
  console.log('Limpando timeouts de verificação de pagamento...');
  paymentVerificationTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  paymentVerificationTimeouts.clear();
  process.exit(0);
});