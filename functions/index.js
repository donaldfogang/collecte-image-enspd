const { Storage } = require('@google-cloud/storage');
const express = require('express');
const cors = require('cors')({ origin: true });
const multer = require('multer')({ storage: multer.memoryStorage() });
const nodemailer = require('nodemailer');

// Configuration Nodemailer avec Gmail (ATTENTION AUX LIMITES)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'clubiaenspd@gmail.com', // Votre adresse Gmail
        pass: 'clubia2025' // Remplacez par votre mot de passe Gmail ou un "App Password"
    }
});

const app = express();
app.use(cors);

const storage = new Storage();
const bucketName = process.env.CLOUD_STORAGE_BUCKET_GRATUIT; // Configurez cette variable d'environnement

app.post('/upload', multer.single('image-file'), async (req, res) => {
    try {
        if (!req.file || !req.body['nature-image'] || !req.body['nom-image']) {
            return res.status(400).send({ error: 'Veuillez fournir tous les champs et un fichier image.' });
        }

        const { nature_image, nom_image } = req.body;
        const file = req.file;
        const timestamp = Date.now();
        const filename = `temp_images/${timestamp}-${file.originalname}`; // Dossier temporaire (pensez aux limites du Free Tier)
        const fileBuffer = file.buffer;

        const bucket = storage.bucket(bucketName);
        const fileRef = bucket.file(filename);

        await fileRef.save(fileBuffer, {
            metadata: {
                contentType: file.mimetype,
            },
            public: true, // Rendre temporairement public pour le lien dans l'e-mail
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

        const mailOptions = {
            from: 'iutdouala24@gmail.com', // Votre adresse Gmail
            to: 'iutdouala24@gmail.com', // Votre adresse e-mail de réception (la même pour cet exemple)
            subject: 'Nouvelle image soumise via le formulaire',
            html: `
                <p>Nature de l'image: ${nature_image}</p>
                <p>Nom de l'image: ${nom_image}</p>
                <p>URL de l'image (temporaire): <a href="${publicUrl}">${publicUrl}</a></p>
                <p><strong>Attention:</strong> Ce lien peut expirer en fonction de la politique de stockage gratuit.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log('E-mail envoyé');

        // Optionnel: Supprimer le fichier du bucket après l'envoi de l'e-mail pour économiser de l'espace (attention aux délais)
        // await fileRef.delete();

        return res.status(200).send({ success: true, message: 'Informations envoyées par e-mail !' });

    } catch (error) {
        console.error('Erreur lors du traitement de la requête:', error);
        return res.status(500).send({ error: 'Une erreur serveur s\'est produite.' });
    }
});

exports.uploadImage = app;