const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 5000;

// Chemins des fichiers de stockage
const productsPath = path.join(__dirname, 'products.json');
const messagesPath = path.join(__dirname, 'messages.json');

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'blessingmingenge@gmail.com',
    pass: 'mixf zoyt krnd iczk'
  }
});

// Initialisation des données au démarrage
let products = [];
let messages = [];

const initData = async () => {
  if (!(await fs.pathExists(productsPath))) await fs.writeJson(productsPath, []);
  if (!(await fs.pathExists(messagesPath))) await fs.writeJson(messagesPath, []);
  
  products = await fs.readJson(productsPath);
  messages = await fs.readJson(messagesPath);
  console.log("📂 Données chargées avec succès.");
};
initData();

// --- ROUTES ---

app.get('/', (req, res) => res.send('🚀 Serveur Backend Opérationnel'));

// Produits
app.get('/api/products', (req, res) => res.status(200).json(products));

app.post('/api/products', async (req, res) => {
  const newProduct = { id: Date.now(), ...req.body };
  products.push(newProduct);
  await fs.writeJson(productsPath, products, { spaces: 2 });
  res.status(201).json(newProduct);
});

app.delete('/api/products/:id', async (req, res) => {
  const idNumber = parseInt(req.params.id);
  products = products.filter(p => p.id !== idNumber);
  await fs.writeJson(productsPath, products, { spaces: 2 });
  res.status(200).json({ success: true });
});

// Messages
app.get('/api/messages', (req, res) => res.status(200).json(messages));

app.delete('/api/messages/:id', async (req, res) => {
  const idNumber = parseInt(req.params.id);
  messages = messages.filter(m => m.id !== idNumber);
  await fs.writeJson(messagesPath, messages, { spaces: 2 });
  res.status(200).json({ success: true });
});

app.post('/api/messages', async (req, res) => {
  const { email, sujet, subject, message } = req.body;
  const finalSubject = sujet || subject;
  
  const newMessage = { 
    id: Date.now(), 
    email, 
    sujet: finalSubject, 
    message, 
    date: new Date().toLocaleString() 
  };
  
  messages.push(newMessage);
  await fs.writeJson(messagesPath, messages, { spaces: 2 });

  const mailOptions = {
    from: '"Boutique Contact" <blessingmingenge@gmail.com>',
    to: 'blessingmingenge@gmail.com',
    subject: `💬 Nouveau message : ${finalSubject}`,
    html: `<p><strong>De:</strong> ${email}</p><p>${message}</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(201).json({ success: true, message: "Enregistré et envoyé." });
  } catch (error) {
    res.status(201).json({ success: true, message: "Enregistré, échec mail." });
  }
});

// Auth OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    await transporter.sendMail({
      from: '"Deluxe Boutique" <blessingmingenge@gmail.com>',
      to: email,
      subject: '🔒 Votre code d\'accès',
      html: `<h2>Code: ${otp}</h2>`
    });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur : http://localhost:${PORT}`));