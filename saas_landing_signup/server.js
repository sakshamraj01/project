const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');

const app = express();
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  verified: { type: Boolean, default: false },
  token: String
});

const Lead = mongoose.model('Lead', LeadSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/signup', async (req, res) => {
  const { name, email } = req.body;
  const token = crypto.randomBytes(16).toString('hex');
  await Lead.create({ name, email, token });

  const verifyURL = `${req.protocol}://${req.get('host')}/verify/${token}`;

  await transporter.sendMail({
    to: email,
    subject: 'Verify your email',
    html: `<p>Hi ${name},</p><p>Please verify your email: <a href="${verifyURL}">Click here</a></p>`
  });

  res.sendFile(path.join(__dirname, 'public/thankyou.html'));
});

app.get('/verify/:token', async (req, res) => {
  const lead = await Lead.findOne({ token: req.params.token });
  if (lead) {
    lead.verified = true;
    lead.token = '';
    await lead.save();
    res.send('<h2>Email verified! 🎉</h2>');
  } else {
    res.status(404).send('<h2>Invalid or expired token.</h2>');
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
