import nodemailer from "nodemailer";

// Configuração do transporter de email
// Suporta Gmail, SendGrid, AWS SES, etc.
const createTransporter = () => {
  // Se usar Gmail (desenvolvimento/teste)
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use "App Password" do Gmail
      },
    });
  }

  // Se usar SendGrid ou outro SMTP genérico
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.sendgrid.net",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER || "apikey",
      pass: process.env.SMTP_PASSWORD || process.env.SENDGRID_API_KEY,
    },
  });
};

/**
 * Envia email de verificação de conta
 */
export async function enviarEmailVerificacao(email, nome, tokenVerificacao) {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const linkVerificacao = `${frontendUrl}/verificar-email?token=${tokenVerificacao}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@rpvistapro.com.br",
      to: email,
      subject: "Verifique seu email - RP Vista Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1117; color: #e6edf3;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #58a6ff;">RP Vista Pro</h1>
          </div>
          
          <div style="background-color: #161b22; padding: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #e6edf3; margin-top: 0;">Olá, ${nome}!</h2>
            
            <p style="color: #c9d1d9; line-height: 1.6;">
              Obrigado por se cadastrar no RP Vista Pro. Para ativar sua conta, 
              clique no botão abaixo para verificar seu endereço de email:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkVerificacao}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #238636; 
                        color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verificar Email
              </a>
            </div>
            
            <p style="color: #8b949e; font-size: 14px; margin-top: 30px;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${linkVerificacao}" style="color: #58a6ff; word-break: break-all;">${linkVerificacao}</a>
            </p>
            
            <p style="color: #8b949e; font-size: 12px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              Este link expira em 24 horas. Se você não criou esta conta, ignore este email.
            </p>
          </div>
        </div>
      `,
      text: `
        Olá, ${nome}!
        
        Obrigado por se cadastrar no RP Vista Pro. Para ativar sua conta, 
        acesse o link abaixo para verificar seu endereço de email:
        
        ${linkVerificacao}
        
        Este link expira em 24 horas. Se você não criou esta conta, ignore este email.
      `,
    });

    console.log(`✅ Email de verificação enviado para ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar email de verificação para ${email}:`, error);
    return false;
  }
}

/**
 * Envia notificação quando um novo pedido é criado (para o fornecedor)
 */
export async function enviarNotificacaoNovoPedido(emailFornecedor, nomeFornecedor, pedido) {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const linkPedido = `${frontendUrl}/pedidos/${pedido._id}`;

    const totalItens = pedido.itens?.length || 0;
    const totalPedido = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(pedido.total || 0);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@rpvistapro.com.br",
      to: emailFornecedor,
      subject: `Novo pedido recebido - ${pedido.empresa || "Cliente"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1117; color: #e6edf3;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #58a6ff;">RP Vista Pro</h1>
          </div>
          
          <div style="background-color: #161b22; padding: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #e6edf3; margin-top: 0;">Novo Pedido Recebido!</h2>
            
            <p style="color: #c9d1d9; line-height: 1.6;">
              Olá, <strong>${nomeFornecedor}</strong>!<br><br>
              Você recebeu um novo pedido de <strong>${pedido.empresa || "Cliente"}</strong>.
            </p>
            
            <div style="background-color: #0d1117; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Cliente:</strong> ${pedido.empresa || "—"}</p>
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Total de itens:</strong> ${totalItens}</p>
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Valor total:</strong> ${totalPedido}</p>
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Status:</strong> ${pedido.status || "Enviado"}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkPedido}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #238636; 
                        color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Ver Pedido
              </a>
            </div>
            
            <p style="color: #8b949e; font-size: 12px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              Acesse o sistema para visualizar os detalhes completos do pedido e aprová-lo.
            </p>
          </div>
        </div>
      `,
      text: `
        Novo Pedido Recebido!
        
        Olá, ${nomeFornecedor}!
        
        Você recebeu um novo pedido de ${pedido.empresa || "Cliente"}.
        
        Cliente: ${pedido.empresa || "—"}
        Total de itens: ${totalItens}
        Valor total: ${totalPedido}
        Status: ${pedido.status || "Enviado"}
        
        Acesse o sistema para visualizar os detalhes completos do pedido:
        ${linkPedido}
      `,
    });

    console.log(`✅ Notificação de novo pedido enviada para ${emailFornecedor}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar notificação de novo pedido:`, error);
    return false;
  }
}

/**
 * Envia notificação quando um pedido é aprovado (para o comprador)
 */
export async function enviarNotificacaoPedidoAprovado(emailComprador, nomeComprador, pedido) {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const linkPedido = `${frontendUrl}/pedidos/${pedido._id}`;

    const totalItens = pedido.itens?.length || 0;
    const totalPedido = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(pedido.total || 0);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@rpvistapro.com.br",
      to: emailComprador,
      subject: `Pedido aprovado - ${pedido.fornecedor || "Fornecedor"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1117; color: #e6edf3;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #58a6ff;">RP Vista Pro</h1>
          </div>
          
          <div style="background-color: #161b22; padding: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #e6edf3; margin-top: 0;">Pedido Aprovado! ✅</h2>
            
            <p style="color: #c9d1d9; line-height: 1.6;">
              Olá, <strong>${nomeComprador}</strong>!<br><br>
              Seu pedido para <strong>${pedido.fornecedor || "Fornecedor"}</strong> foi aprovado e está em trânsito.
            </p>
            
            <div style="background-color: #0d1117; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Fornecedor:</strong> ${pedido.fornecedor || "—"}</p>
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Total de itens:</strong> ${totalItens}</p>
              <p style="color: #e6edf3; margin: 5px 0;"><strong>Valor total:</strong> ${totalPedido}</p>
              <p style="color: #238636; margin: 5px 0;"><strong>Status:</strong> Aprovado</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkPedido}" 
                 style="display: inline-block; padding: 12px 30px; background-color: #238636; 
                        color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Ver Pedido
              </a>
            </div>
            
            <p style="color: #8b949e; font-size: 12px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              Os itens estão em trânsito. Quando receber, marque o pedido como recebido no sistema.
            </p>
          </div>
        </div>
      `,
      text: `
        Pedido Aprovado!
        
        Olá, ${nomeComprador}!
        
        Seu pedido para ${pedido.fornecedor || "Fornecedor"} foi aprovado e está em trânsito.
        
        Fornecedor: ${pedido.fornecedor || "—"}
        Total de itens: ${totalItens}
        Valor total: ${totalPedido}
        Status: Aprovado
        
        Acesse o sistema para acompanhar o pedido:
        ${linkPedido}
      `,
    });

    console.log(`✅ Notificação de pedido aprovado enviada para ${emailComprador}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar notificação de pedido aprovado:`, error);
    return false;
  }
}
