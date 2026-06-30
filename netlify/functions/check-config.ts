import { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

export const handler: Handler = async (event, context) => {
  const brand = event.queryStringParameters?.brand;
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
        status: "error",
        missing: missingVars
      }),
    };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_PORT === '465';
  
  const user = isCasio ? process.env.CASIO_SMTP_USER : process.env.SMTP_USER;
  const pass = isCasio ? process.env.CASIO_SMTP_PASS : process.env.SMTP_PASS;

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      auth: {
        user: user,
        pass: pass,
      },
    });

    // Verify the connection and credentials
    await transporter.verify();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ok" }),
    };
  } catch (error) {
    console.error("SMTP Configuration Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: "Las credenciales (usuario/contraseña) son incorrectas o no se pudo conectar al servidor SMTP."
      }),
    };
  }
};
