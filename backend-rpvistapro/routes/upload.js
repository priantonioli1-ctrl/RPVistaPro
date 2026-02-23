import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const UPLOADS_DIR = path.join(path.dirname(__dirname), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${(file.originalname || "arquivo").replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});

const upload = multer({
  storage: storageLocal,
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Arquivo muito grande. Máximo 15 MB." });
      }
      console.error("Erro no upload:", err);
      return res.status(500).json({ error: err.message || "Falha no upload" });
    }
    next();
  });
}, (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4001}`;
    const url = `${baseUrl}/api/upload/arquivo/${path.basename(f.filename)}`;
    res.json({ url, nome: f.originalname || f.filename });
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: "Falha no upload" });
  }
});

router.get("/arquivo/:filename", (req, res) => {
  const filename = path.basename(req.params.filename).replace(/\.\./g, "");
  const filepath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Arquivo não encontrado." });
  res.sendFile(path.resolve(filepath));
});

export default router;