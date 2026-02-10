import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Configura o AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configura o multer (para lidar com upload de arquivos temporários)
const upload = multer({ storage: multer.memoryStorage() });

// Rota para upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const result = await s3.upload(params).promise();
    res.json({ url: result.Location });
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: "Falha no upload" });
  }
});

export default router;