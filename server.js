const express = require('express');
const cors = require('cors');
const { Resend } = require('resend'); // Remplacement de nodemailer par Resend
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialisation de Resend avec la clé API d'environnement
const resend = new Resend(process.env.RESEND_API_KEY);

// Chemins des fichiers de stockage
const productsPath = path.join(__dirname, 'products.json');
const messagesPath = path.join(__dirname, 'messages.json');

// Configuration CORS pour autoriser ton localhost ET ton site Vercel en production
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://deluxe-business.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  try {
    await resend.emails.send({
      from: 'Boutique Contact <onboarding@resend.dev>',
      to: 'blessingmingenge@gmail.com',
      subject: `💬 Nouveau message : ${finalSubject}`,
      html: `<p><strong>De:</strong> ${email}</p><p>${message}</p>`
    });
    res.status(201).json({ success: true, message: "Enregistré et envoyé." });
  } catch (error) {
    console.error("Erreur Resend message:", error);
    res.status(201).json({ success: true, message: "Enregistré, échec mail." });
  }
});

// Auth OTP avec Resend
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    await resend.emails.send({
      from: 'Deluxe Boutique <onboarding@resend.dev>',
      to: email,
      subject: '🔒 Votre code d\'accès',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Sécurité Deluxe Boutique</h2>
          <p>Voici votre code de validation :</p>
          <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
          <p>Ce code est strictement confidentiel.</p>
        </div>
      `
    });
    res.status(200).json({ success: true });
  } catch (e) {
    console.error("Erreur Resend OTP:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));