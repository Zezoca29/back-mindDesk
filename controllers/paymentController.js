import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import PaymentModel from '../models/Payment.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs'; // Importando bcrypt para senha

dotenv.config();

// Configurando client do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

/**
 * Cria um pagamento diretamente no Mercado Pago
 * Esta função apenas envia a requisição ao Mercado Pago, sem persistir no banco local
 */
export const createPayment = async (req, res) => {
  try {
    const { paymentData } = req.body;
    const userId = req.user.id;

    // Validar dados obrigatórios
    if (!paymentData || !paymentData.token || !paymentData.payment_method_id) {
      return res.status(400).json({ 
        message: 'Dados de pagamento incompletos',
        requiredFields: ['token', 'payment_method_id', 'transaction_amount']
      });
    }

    // Log para debug
    console.log('Enviando requisição para o Mercado Pago:', {
      userId,
      email: req.user.email,
      payment_method: paymentData.payment_method_id,
      amount: paymentData.transaction_amount
    });

    // Montando objeto de pagamento apenas com o necessário
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
            first_name: paymentData.payer?.firstName || 'Usuário',
            last_name: paymentData.payer?.lastName || 'MindDesk',
          }
        },
        binary_mode: false,
        description: 'Assinatura Mind Desk',
        external_reference: userId.toString(),
        installments: paymentData.installments || 1,
        metadata: {
          user_id: userId,
          password: paymentData.password || null // Armazenar senha do front-end nos metadados
        },
        payer: {
          entity_type: 'individual',
          type: 'customer',
          email: paymentData.payer?.email || req.user.email,
          identification: paymentData.payer?.identification || {
            type: 'CPF',
            number: '00000000000'
          }
        },
        payment_method_id: paymentData.payment_method_id,
        token: paymentData.token,
        transaction_amount: paymentData.transaction_amount
      },
      requestOptions: { idempotencyKey: `minddesk-payment-${userId}-${Date.now()}` }
    };

    // Criar o pagamento no Mercado Pago
    const payments = new Payment(client);
    const mpResponse = await payments.create(paymentRequest);

    console.log('Resposta do Mercado Pago:', JSON.stringify(mpResponse, null, 2));

    // Processar resposta
    await processPaymentResponse(mpResponse, req.user, paymentData.transaction_amount);

    // Retornar resposta do Mercado Pago
    res.status(200).json({
      success: true,
      payment_id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail
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
 * Processa a resposta do Mercado Pago e atualiza o banco de dados
 * Função separada para facilitar reuso e manutenção
 */
async function processPaymentResponse(mpResponse, user, amount) {
  try {
    // Determinar tipo de assinatura baseado no valor
    let subscriptionType = 'premium';
    if (amount >= 49.90) {
      subscriptionType = 'premium_plus';
    }

    // Salvar registro de pagamento independente do status
    const paymentRecord = await PaymentModel.create({
      user: user.id,
      mercadoPagoId: mpResponse.id,
      amount: amount,
      status: mpResponse.status,
      subscriptionType: subscriptionType,
      paymentMethod: mpResponse.payment_method_id,
      paymentDetails: {
        payment_id: mpResponse.id,
        status_detail: mpResponse.status_detail,
        payment_type_id: mpResponse.payment_type_id,
        installments: mpResponse.installments
      }
    });

    // Se o pagamento for aprovado, atualizar o status da assinatura do usuário
    if (mpResponse.status === 'approved') {
      await User.findByIdAndUpdate(user.id, {
        subscriptionStatus: subscriptionType,
        $inc: { points: 500 }
      });
      
      console.log(`Assinatura ${subscriptionType} ativada para usuário ${user.id}`);
    }

    return paymentRecord;
  } catch (error) {
    console.error('Erro ao processar resposta de pagamento:', error);
    throw error;
  }
}

/**
 * Cria um novo usuário a partir dos dados do pagamento
 * Esta função é usada quando um pagamento é aprovado mas o usuário ainda não existe
 */
async function createUserFromPayment(paymentInfo) {
  try {
    const { payer } = paymentInfo;
    
    // Verificar se já existe um usuário com este email
    const existingUser = await User.findOne({ email: payer.email });
    if (existingUser) {
      console.log(`Usuário com email ${payer.email} já existe. ID: ${existingUser._id}`);
      return existingUser;
    }
    
    // Determinar tipo de assinatura baseado no valor
    let subscriptionType = 'premium';
    if (paymentInfo.transaction_amount >= 49.90) {
      subscriptionType = 'premium_plus';
    }
    
    // Verificar se existe senha nos metadados do pagamento
    const password = paymentInfo.metadata?.password || '123456'; // Senha padrão como fallback
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Criar novo usuário
    const newUser = await User.create({
      email: payer.email,
      password: hashedPassword,
      subscriptionStatus: subscriptionType,
      points: 500 // Pontos iniciais
    });
    
    console.log(`Novo usuário criado com ID: ${newUser._id}, email: ${payer.email}`);
    
    return newUser;
  } catch (error) {
    console.error('Erro ao criar usuário a partir do pagamento:', error);
    throw error;
  }
}

// Webhook de notificação
export const webhookHandler = async (req, res) => {
  try {
    console.log('Webhook recebido do Mercado Pago:', req.body);
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      console.log(`Processando notificação de pagamento ID: ${paymentId}`);

      // Buscar informações atualizadas do pagamento
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: paymentId });
      
      console.log('Informações do pagamento:', JSON.stringify(paymentInfo, null, 2));
      
      const { status, external_reference: userId, transaction_amount } = paymentInfo;

      // Buscar pagamento na base de dados
      const payment = await PaymentModel.findOne({
        mercadoPagoId: paymentId
      });

      if (payment) {
        console.log(`Atualizando status do pagamento no banco de dados para: ${status}`);
        
        payment.status = status;
        payment.paymentDetails = {
          ...payment.paymentDetails,
          status_detail: paymentInfo.status_detail
        };

        await payment.save();

        // Se o pagamento for aprovado, atualizar a assinatura
        if (status === 'approved') {
          console.log(`Atualizando status da assinatura do usuário ${userId} para ${payment.subscriptionType}`);
          
          // Verificar se o usuário existe
          let user = await User.findById(userId);
          
          if (!user && paymentInfo.payer && paymentInfo.payer.email) {
            // Se o usuário não existe mas temos email do pagador, criar novo usuário
            user = await createUserFromPayment(paymentInfo);
            
            // Atualizar o registro de pagamento com o novo ID de usuário
            payment.user = user._id;
            await payment.save();
          }
          
          if (user) {
            await User.findByIdAndUpdate(user._id, {
              subscriptionStatus: payment.subscriptionType,
              $inc: { points: 500 }
            });
          }
        }
      } else {
        console.log('Pagamento não encontrado no banco de dados. Criando novo registro.');
        
        // Determinar tipo de assinatura baseado no valor
        let subscriptionType = 'premium';
        if (transaction_amount >= 49.90) {
          subscriptionType = 'premium_plus';
        }
        
        // Verificar se o usuário existe
        let user = null;
        if (userId) {
          user = await User.findById(userId);
        }
        
        // Se o usuário não existe mas temos email do pagador, criar novo usuário
        if (!user && paymentInfo.payer && paymentInfo.payer.email && status === 'approved') {
          user = await createUserFromPayment(paymentInfo);
        }
        
        // Criar novo registro de pagamento
        const newPayment = await PaymentModel.create({
          user: user ? user._id : userId, // Usar ID do novo usuário se foi criado
          mercadoPagoId: paymentId,
          amount: transaction_amount,
          status: status,
          subscriptionType: subscriptionType,
          paymentDetails: {
            payment_id: paymentId,
            status_detail: paymentInfo.status_detail,
            payment_type_id: paymentInfo.payment_type_id
          }
        });
        
        // Se o pagamento for aprovado e temos um usuário, atualizar a assinatura
        if (status === 'approved' && user) {
          await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: subscriptionType,
            $inc: { points: 500 }
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook do Mercado Pago:', error);
    res.status(500).send('Error');
  }
};

// Verificar status do pagamento
export const checkPaymentStatus = async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await PaymentModel.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Verificar segurança - apenas o próprio usuário pode ver seu pagamento
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    res.json({
      status: payment.status,
      subscriptionType: payment.subscriptionType,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ message: 'Erro ao verificar pagamento' });
  }
};