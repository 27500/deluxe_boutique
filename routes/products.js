const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importation de notre pool de connexion MySQL créé juste au-dessus

// ========================================================
// 1. RECUPERER TOUS LES PRODUITS (Pour afficher la vitrine)
// ========================================================
router.get('/', async (req, res) => {
  try {
    // On récupère tous les vêtements du catalogue classés du plus récent au plus ancien
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error("Erreur SQL lors de la récupération des vêtements :", error.message);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des produits." });
  }
});

// ========================================================
// 2. AJOUTER UN NOUVEAU PRODUIT (Pour l'interface Admin)
// ========================================================
router.post('/', async (req, res) => {
  const { name, price_fc, description, category, image_url } = req.body;

  // Validation de sécurité minimale
  if (!name || !price_fc) {
    return res.status(400).json({ message: "Le nom et le prix en Francs Congolais sont obligatoires." });
  }

  try {
    const query = `
      INSERT INTO products (name, price_fc, description, category, image_url) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    // Insertion sécurisée avec des points d'interrogation pour éviter les injections SQL
    const [result] = await db.query(query, [name, price_fc, description, category, image_url]);
    
    res.status(201).json({ 
      message: "Vêtement ajouté avec succès au catalogue !", 
      productId: result.insertId 
    });
  } catch (error) {
    console.error("Erreur SQL lors de l'ajout du vêtement :", error.message);
    res.status(500).json({ message: "Erreur serveur lors de l'ajout du produit." });
  }
});

// ========================================================
// 3. SUPPRIMER UN PRODUIT (Pour l'interface Admin)
// ========================================================
router.delete('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const query = "DELETE FROM products WHERE id = ?";
    
    // Exécution de la suppression
    const [result] = await db.query(query, [productId]);

    // On vérifie si la ligne existait bien dans MySQL
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vêtement introuvable ou déjà supprimé." });
    }

    res.json({ message: "Vêtement supprimé du catalogue avec succès !" });
  } catch (error) {
    console.error("Erreur SQL lors de la suppression du vêtement :", error.message);
    res.status(500).json({ message: "Erreur serveur lors de la suppression du produit." });
  }
});

module.exports = router;