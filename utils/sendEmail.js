const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Buat transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Gmail SMTP di port 587 tidak pakai secure
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false // Hanya untuk dev, di produksi harus true
    }
  });

  // Opsi email
  const mailOptions = {
    from: `"Aplikasi Berita" <${process.env.EMAIL_FROM}>`, // Email pengirim dari .env
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;