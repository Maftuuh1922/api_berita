const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Buat transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE_HOST,
    port: process.env.EMAIL_SERVICE_PORT,
    secure: process.env.EMAIL_SERVICE_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_AUTH_USER,
      pass: process.env.EMAIL_AUTH_PASS,
    },
    tls: {
      rejectUnauthorized: false // Hanya untuk dev, di produksi harus true
    }
  });

  // Opsi email
  const mailOptions = {
    from: `"Aplikasi Berita" <${process.env.EMAIL_AUTH_USER}>`, // Ganti dengan email pengirim Anda
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;