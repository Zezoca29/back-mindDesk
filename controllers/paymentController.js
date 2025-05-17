import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

dotenv.config();

// Configurando o SDK do Mercado Pago v2
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Criar uma preferência de pagamento
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
      back_url: {
        success: `${process.env.FRONTEND_URL}/payment/success`,
        failure: `${process.env.FRONTEND_URL}/payment/failure`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      external_reference: userId.toString(),
      statement_descriptor: 'MindDesk App'
    };

    // Log da preferência para debug
    console.log('Criando preferência de pagamento:', JSON.stringify(preferenceData, null, 2));

    // Criar a preferência usando o client do SDK v2
    const preference = new Preference(client);
    const response = await preference.create({ body: preferenceData });
    
    console.log('Resposta da API do Mercado Pago:', JSON.stringify(response, null, 2));

    const payment = await Payment.create({
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

// Webhook de notificação
export const webhookHandler = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;

      // Usando a API v2 do Mercado Pago para buscar informações de pagamento
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: paymentId });
      
      const { status, external_reference: userId, transaction_amount, payment_method_id, payment_type_id } = paymentInfo;

      const payment = await Payment.findOne({
        user: userId,
        amount: transaction_amount
      }).sort({ createdAt: -1 });

      if (payment) {
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
          await User.findByIdAndUpdate(userId, {
            subscriptionStatus: payment.subscriptionType,
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
    const payment = await Payment.findById(paymentId);

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
    const payment = await Payment.findById(paymentId);

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