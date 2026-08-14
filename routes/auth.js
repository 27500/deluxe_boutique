const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Resend } = require('resend'); // Import de Resend

// Initialisation de Resend avec la clé API provenant des variables d'environnement
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Liste stricte et exclusive des deux adresses mails autorisées
const ALLOWED_EMAILS = [
  "blessingmilungu@gmail.com",
  "nathanmilungu@gmail.com"
];

// Stockage temporaire des codes OTP en mémoire (Clé: email, Valeur: { code, expires })
const otpStore = {};

// ==========================================
// ETAPE 1 : DEMANDE DU CODE OTP
// ==========================================
router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = email?.toLowerCase().trim();

  // Vérification stricte de l'adresse email
  if (!ALLOWED_EMAILS.includes(cleanEmail)) {
    return res.status(403).json({ 
      message: "Accès refusé. Cette adresse email n'est pas autorisée à gérer la boutique." 
    });
  }

  // Génération d'un code OTP aléatoire à 6 chiffres
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Sauvegarde du code avec une validité de 5 minutes max
  otpStore[cleanEmail] = {
    code: generatedOtp,
    expires: Date.now() + 5 * 60 * 1000 
  };

  try {
    // Envoi du mail via l'API de Resend
    await resend.emails.send({
      // Remplace par ton domaine vérifié sur Resend, ou utilise 'onboarding@resend.dev' pour les tests
      from: 'Boutique <onboarding@resend.dev>', 
      to: cleanEmail,
      subject: 'Votre code de vérification (Admin)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Sécurité de la Boutique</h2>
          <p>Voici votre code de vérification à usage unique :</p>
          <h1 style="color: #4F46E5; letter-spacing: 2px;">${generatedOtp}</h1>
          <p>Ce code expire dans <strong>5 minutes</strong>.</p>
        </div>
      `
    });

    res.json({ message: "Un code de vérification vous a été envoyé par email." });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail avec Resend :", error);
    res.status(500).json({ message: "Erreur lors de l'envoi du code par e-mail." });
  }
});

// ==========================================
// ETAPE 2 : VERIFICATION ET CONNEXION (Interface existante)
// ==========================================
router.post('/login', (req, res) => {
  const { email, password } = req.body; // 'password' reçoit ici le code OTP tapé par l'utilisateur
  const cleanEmail = email?.toLowerCase().trim();

  // Double vérification de sécurité sur l'email
  if (!ALLOWED_EMAILS.includes(cleanEmail)) {
    return res.status(403).json({ message: "Accès refusé." });
  }

  const activeOtpSession = otpStore[cleanEmail];

  // Vérification si un OTP existe pour cet email
  if (!activeOtpSession) {
    return res.status(400).json({ message: "Veuillez d'abord demander un code de vérification." });
  }

  // Vérification de l'expiration du code
  if (Date.now() > activeOtpSession.expires) {
    delete otpStore[cleanEmail]; // Nettoyage du code expiré
    return res.status(400).json({ message: "Le code OTP a expiré. Veuillez en générer un nouveau." });
  }

  // Vérification de la validité du code tapé
  if (activeOtpSession.code !== password.trim()) {
    return res.status(401).json({ message: "Code de vérification incorrect." });
  }

  // Si le code est correct, on détruit l'OTP pour qu'il ne soit pas réutilisé
  delete otpStore[cleanEmail];

  // Génération du Token JWT d'accès sécurisé
  const token = jwt.sign(
    { email: cleanEmail, role: 'admin' },
    process.env.JWT_SECRET || 'cle_secours_milungu',
    { expiresIn: '24h' }
  );

  res.json({
    message: "Authentification validée avec succès ! Bienvenue.",
    token: token
  });
});

module.exports = router;