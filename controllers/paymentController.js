import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import PaymentModel from '../models/Payment.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

// Configurando client do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

/**
 * Cria um pagamento diretamente no Mercado Pago com cadastro de novo usuário
 * Esta versão cria um novo usuário ao invés de atualizar um existente
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

    // Criar o usuário somente se o pagamento for aprovado
    let newUser;
    if (mpResponse.status === 'approved') {
      // Criar novo usuário com senha criptografada
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.senha, salt);
      
      newUser = await User.create({
        email: userData.email,
        password: hashedPassword,
        subscriptionStatus: mpResponse.transaction_amount >= 49.90 ? 'premium_plus' : 'premium',
        points: 500
      });

      // Salvar registro de pagamento
      await PaymentModel.create({
        user: newUser._id,
        mercadoPagoId: mpResponse.id,
        amount: mpResponse.transaction_amount,
        status: mpResponse.status,
        subscriptionType: mpResponse.transaction_amount >= 49.90 ? 'premium_plus' : 'premium',
        paymentMethod: mpResponse.payment_method_id,
        paymentDetails: {
          payment_id: mpResponse.id,
          status_detail: mpResponse.status_detail,
          payment_type_id: mpResponse.payment_type_id,
          installments: mpResponse.installments
        }
      });
    } else {
      // Para pagamentos pendentes ou rejeitados, ainda criar o usuário mas com status free
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.senha, salt);
      
      newUser = await User.create({
        email: userData.email,
        password: hashedPassword,
        subscriptionStatus: 'free'
      });
    }

    // Retornar resposta 
    res.status(200).json({
      success: true,
      payment_id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      user_id: newUser._id
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