import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import PaymentModel from '../models/Payment.js';
import User from '../models/User.js';

dotenv.config();

// Configurando o SDK do Mercado Pago v2
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Criar uma preferência de pagamento (método original)
export const createPayment = async (req, res) => {
  try {
    const { planType = 'premium' } = req.body;
    const userId = req.user.id;

    // Verificar se as variáveis de ambiente necessárias estão definidas
    if (!process.env.FRONTEND_URL || !process.env.BACKEND_URL) {
      console.error('URLs de ambiente não configuradas:', { 
        FRONTEND_URL: process.env.FRONTEND_URL,
        BACKEND_URL: process.env.BACKEND_URL
      });
      return res.status(500).json({ 
        message: 'Erro na configuração do servidor', 
        error: 'URLs de ambiente não configuradas corretamente'
      });
    }

    let amount = 29.90;
    if (planType === 'premium_plus') {
      amount = 49.90;
    }

    // Definir as URLs de retorno com valores absolutos
    const successUrl = `${process.env.FRONTEND_URL}/payment/success`;
    const failureUrl = `${process.env.FRONTEND_URL}/payment/failure`;
    const pendingUrl = `${process.env.FRONTEND_URL}/payment/pending`;
    
    // Usar a URL do webhook do ngrok se disponível, senão usar BACKEND_URL
    const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || `${process.env.BACKEND_URL}/api/payments/webhook`;

    // Log para debug das URLs
    console.log('URLs de retorno:', {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
      webhook: webhookUrl
    });

    const preferenceData = {
      items: [
        {
          title: `MindDesk ${planType.charAt(0).toUpperCase() + planType.slice(1)} - Assinatura Mensal`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'BRL',
        }
      ],
      payer: {
        email: req.user.email
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: 'approved',
      notification_url: webhookUrl,
      external_reference: userId.toString(),
      statement_descriptor: 'MindDesk App'
    };

    // Log da preferência para debug
    console.log('Criando preferência de pagamento:', JSON.stringify(preferenceData, null, 2));

    // Criar a preferência usando o client do SDK v2
    const preference = new Preference(client);
    const response = await preference.create({ body: preferenceData });
    
    console.log('Resposta da API do Mercado Pago:', JSON.stringify(response, null, 2));

    const payment = await PaymentModel.create({
      user: userId,
      mercadoPagoId: response.id,
      amount,
      status: 'pending',
      subscriptionType: planType
    });

    res.json({
      id: payment._id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      preferenceId: response.id
    });
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ message: 'Erro ao processar pagamento', error: error.message });
  }
};

// Nova implementação para pagamento direto via API
export const createDirectPayment = async (req, res) => {
  try {
    const { userData, paymentData } = req.body;
    const userId = req.user.id;

    // Verificar se os dados necessários foram enviados
    if (!paymentData || !paymentData.token || !paymentData.payment_method_id) {
      return res.status(400).json({ 
        message: 'Dados de pagamento incompletos',
        requiredFields: ['token', 'payment_method_id', 'transaction_amount']
      });
    }

    // Log para debug
    console.log('Processando pagamento direto:', JSON.stringify({
      userId,
      email: req.user.email,
      paymentAmount: paymentData.transaction_amount
    }, null, 2));

    // Determinar o tipo de assinatura com base no valor
    let subscriptionType = 'premium';
    if (paymentData.transaction_amount >= 49.90) {
      subscriptionType = 'premium_plus';
    }

    // Montar o objeto de pagamento para o Mercado Pago
    const paymentRequest = {
      body: {
        additional_info: {
          items: [
            {
              id: `minddesk-${subscriptionType}`,
              title: `MindDesk ${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)} - Assinatura Mensal`,
              description: `Assinatura mensal do MindDesk ${subscriptionType}`,
              category_id: 'services',
              quantity: 1,
              unit_price: paymentData.transaction_amount
            }
          ],
          payer: {
            first_name: userData?.nome?.split(' ')[0] || 'Usuário',
            last_name: userData?.nome?.split(' ').slice(1).join(' ') || 'MindDesk',
            email: paymentData.payer?.email || req.user.email,
          }
        },
        binary_mode: false,
        description: paymentData.description || `Assinatura Mind Desk ${subscriptionType}`,
        external_reference: userId.toString(),
        installments: paymentData.installments || 1,
        metadata: {
          user_id: userId,
          subscription_type: subscriptionType
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

    // Log do objeto de pagamento
    console.log('Enviando requisição para o Mercado Pago:', JSON.stringify(paymentRequest, null, 2));

    // Criar o pagamento no Mercado Pago
    const payments = new Payment(client);
    const mpResponse = await payments.create(paymentRequest);

    console.log('Resposta do Mercado Pago (Pagamento):', JSON.stringify(mpResponse, null, 2));

    // Salvar o pagamento no banco de dados
    const paymentRecord = await PaymentModel.create({
      user: userId,
      mercadoPagoId: mpResponse.id,
      amount: paymentData.transaction_amount,
      status: mpResponse.status,
      subscriptionType: subscriptionType,
      paymentMethod: paymentData.payment_method_id,
      paymentDetails: {
        payment_id: mpResponse.id,
        status_detail: mpResponse.status_detail,
        payment_type_id: mpResponse.payment_type_id,
        installments: mpResponse.installments
      }
    });

    // Se o pagamento for aprovado, atualizar o status da assinatura do usuário
    if (mpResponse.status === 'approved') {
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: subscriptionType,
        $inc: { points: 500 }
      });

      return res.status(200).json({
        success: true,
        message: 'Pagamento aprovado com sucesso',
        payment_id: mpResponse.id,
        status: mpResponse.status,
        subscription: {
          type: subscriptionType,
          activated: true,
          points_added: 500
        }
      });
    }

    // Resposta para outros status
    res.status(200).json({
      success: true,
      message: `Pagamento processado com status: ${mpResponse.status}`,
      payment_id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      paymentRecordId: paymentRecord._id
    });

  } catch (error) {
    console.error('Erro ao processar pagamento direto:', error);
    
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

// Webhook de notificação
export const webhookHandler = async (req, res) => {
  try {
    console.log('Webhook recebido do Mercado Pago:', req.body);
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      console.log(`Processando notificação de pagamento ID: ${paymentId}`);

      // Usando a API v2 do Mercado Pago para buscar informações de pagamento
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: paymentId });
      
      console.log('Informações do pagamento:', JSON.stringify(paymentInfo, null, 2));
      
      const { status, external_reference: userId, transaction_amount, payment_method_id, payment_type_id } = paymentInfo;

      const payment = await PaymentModel.findOne({
        user: userId,
        amount: transaction_amount
      }).sort({ createdAt: -1 });

      if (payment) {
        console.log(`Atualizando status do pagamento no banco de dados para: ${status}`);
        
        payment.status = status === 'approved' ? 'approved' :
                         status === 'rejected' ? 'rejected' :
                         status === 'refunded' ? 'refunded' : 'pending';

        payment.paymentMethod = payment_method_id;
        payment.paymentDetails = {
          payment_type_id,
          payment_id: paymentId,
          status_detail: paymentInfo.status_detail
        };

        await payment.save();

        if (status === 'approved') {
          console.log(`Atualizando status da assinatura do usuário ${userId} para ${payment.subscriptionType}`);
          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: payment.subscriptionType,
            $inc: { points: 500 }
          });
        }
      } else {
        console.log('Pagamento não encontrado no banco de dados');
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

// Atualizar status manualmente (admin/teste)
export const updatePaymentStatus = async (req, res) => {
  const { paymentId } = req.params;
  const { status } = req.body;

  try {
    const payment = await PaymentModel.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    payment.status = status;
    await payment.save();

    if (status === 'approved') {
      await User.findByIdAndUpdate(payment.user, {
        subscriptionStatus: payment.subscriptionType,
        $inc: { points: 500 }
      });
    }

    res.json({ message: 'Status atualizado com sucesso', payment });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do pagamento' });
  }
};