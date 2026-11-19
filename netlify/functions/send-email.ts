import { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { to, name, guide, pdfBase64, brand, shippingMethod } = JSON.parse(event.body || "{}");
    const isCasio = brand === 'casio';
    const isServientrega = shippingMethod === 'servientrega';
    const carrierName = isServientrega ? 'Servientrega' : 'Uno Express';
    const trackingUrl = isServientrega
      ? 'https://servientrega.com.pa/'
      : 'https://unoexpresspanama.com/';

    const escapeHtml = (str: string = '') =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const missingVars = [];
    if (!process.env.SMTP_HOST) missingVars.push("SMTP_HOST");
    
    if (isCasio) {
      if (!process.env.CASIO_SMTP_USER) missingVars.push("CASIO_SMTP_USER");
      if (!process.env.CASIO_SMTP_PASS) missingVars.push("CASIO_SMTP_PASS");
    } else {
      if (!process.env.SMTP_USER) missingVars.push("SMTP_USER");
      if (!process.env.SMTP_PASS) missingVars.push("SMTP_PASS");
    }

    if (missingVars.length > 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: `Error de configuración: Faltan las variables ${missingVars.join(", ")}. Configúralas en el panel de Netlify.` 
        }),
      };
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_PORT === '465';
    
    const user = isCasio ? process.env.CASIO_SMTP_USER : process.env.SMTP_USER;
    const pass = isCasio ? process.env.CASIO_SMTP_PASS : process.env.SMTP_PASS;

    const brandName = isCasio ? 'Casio Store' : 'Cubitt';
    const accentColor = isCasio ? '#111111' : '#0071E3';
    const defaultCubittFrom = process.env.SMTP_FROM || `"Cubitt Shipping" <${user}>`;
    const defaultCasioFrom = process.env.CASIO_SMTP_FROM || `"Casio Store" <${user}>`;
    
    const brandFrom = isCasio ? defaultCasioFrom : defaultCubittFrom;

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: brandFrom,
      to: to,
      subject: `Tu envío ya está en camino 🚚 | ${brandName}`,
      text: `Estimado/a ${name},\n\nNos complace informarle que su pedido ha sido despachado exitosamente.\n\nEmpresa de envío: ${carrierName}\nNúmero de guía: ${guide}\n\nRastrear Pedido: ${trackingUrl}\n\nAgradecemos sinceramente su confianza en ${brandName}.\nTrabajamos cada día para ofrecerle la mejor experiencia posible.\n\nQuedamos atentos a cualquier consulta.\n\nCordialmente,\nEquipo ${brandName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; padding: 24px; color: #1d1d1f;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background-color: ${accentColor}; padding: 20px 28px; color: #ffffff;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">Notificación de Envío</p>
              <h2 style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700;">${brandName}</h2>
            </div>
            <div style="padding: 28px;">
              <p style="margin-top: 0; font-size: 15px;">Estimado/a <strong>${escapeHtml(name)}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.5; color: #374151;">Nos complace informarle que su pedido ha sido despachado exitosamente.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
                  <strong>Empresa de envío:</strong> <span style="color: #111827; font-weight: 600;">${carrierName}</span>
                </p>
                <p style="margin: 0; font-size: 14px; color: #475569;">
                  <strong>Número de guía:</strong> <span style="font-family: monospace; font-size: 16px; color: #111827; font-weight: 700;">${escapeHtml(guide)}</span>
                </p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 9999px;">
                  Rastrear Pedido
                </a>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
                  Enlace de seguimiento: <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="color: ${accentColor};">${trackingUrl}</a>
                </p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">
                Agradecemos sinceramente su confianza en ${brandName}.<br>
                Trabajamos cada día para ofrecerle la mejor experiencia posible.
              </p>
              <p style="font-size: 14px; color: #4b5563;">Quedamos atentos a cualquier consulta.</p>
              <p style="margin-bottom: 0; font-size: 14px; color: #1f2937;">
                Cordialmente,<br>
                <strong>Equipo ${brandName}</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: pdfBase64
        ? [
            {
              filename: `Guia_${isCasio ? 'Casio' : 'Cubitt'}_${String(guide || 'Envio').replace(/[^a-zA-Z0-9_-]/g, '') || 'Envio'}.pdf`,
              content: typeof pdfBase64 === 'string' && pdfBase64.includes('base64,')
                ? pdfBase64.split('base64,')[1]
                : pdfBase64,
              encoding: 'base64',
            },
          ]
        : [],
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error("Email error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to send email" }),
    };
  }
};
