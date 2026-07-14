const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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
router.post('/request-otp', (req, res) => {
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

  // ⚠️ POUR L'INSTANT : On l'affiche dans ta console de terminal backend.
  // Plus tard, on pourra brancher un service pour l'envoyer réellement par mail.
  console.log(`\n[OTP SECURITY] Code pour ${cleanEmail} ---> ${generatedOtp}\n`);

  res.json({ message: "Un code de vérification vous a été réservé." });
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