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
    const { to, name, guide, pdfBase64, brand } = JSON.parse(event.body || "{}");
    const isCasio = brand === 'casio';

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
      text: `Estimado/a ${name},\n\nNos complace informarle que su pedido ha sido despachado exitosamente.\n\nNúmero de guía: ${guide}\n\nAgradecemos sinceramente su confianza en ${brandName}.\nTrabajamos cada día para ofrecerle la mejor experiencia posible.\n\nQuedamos atentos a cualquier consulta.\n\nCordialmente,\nEquipo ${brandName}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <p>Estimado/a ${name},</p>
          <p>Nos complace informarle que su pedido ha sido despachado exitosamente.</p>
          <p><strong>Número de guía:</strong> ${guide}</p>
          <p>Agradecemos sinceramente su confianza en ${brandName}.<br>
          Trabajamos cada día para ofrecerle la mejor experiencia posible.</p>
          <p>Quedamos atentos a cualquier consulta.</p>
          <br>
          <p>Cordialmente,<br>
          Equipo ${brandName}</p>
        </div>
      `,
      attachments: [
        {
          filename: `Guia_${isCasio ? 'Casio' : 'Cubitt'}_${guide}.pdf`,
          content: pdfBase64.split('base64,')[1],
          encoding: 'base64',
        },
      ],
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
