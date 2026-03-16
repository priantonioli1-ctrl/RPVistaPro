#!/bin/bash
# Deploy do build no S3 (rpvistapro.com.br)
# Uso: ./deploy-s3.sh

set -e
BUCKET="rpvistapro.com.br"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "▶ Gerando build..."
npm run build

echo "▶ Limpando bucket..."
aws s3 rm "s3://${BUCKET}/" --recursive

echo "▶ Enviando novos arquivos..."
aws s3 sync build/ "s3://${BUCKET}/" --delete

echo "✓ Deploy concluído: https://${BUCKET}"
