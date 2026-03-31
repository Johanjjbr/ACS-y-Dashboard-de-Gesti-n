#!/bin/bash

# Script de despliegue para funciones de Supabase
# Uso: ./scripts/deploy-supabase.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Desplegando Funciones Supabase ===${NC}"

# Variables de configuración
PROJECT_ID="faaqjsizafrszffotike"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYXFqc2l6YWZyc3pmZm90aWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTQ5MzEsImV4cCI6MjA4OTAzMDkzMX0.FD_lnK2qJt6KuDFVLeLaq6QbTyN5APZkrK4452WGZG8"

echo -e "${YELLOW}Verificando que los archivos estén listos...${NC}"

# Verificar que existen los archivos de función
if [ ! -f "supabase/functions/server/index.tsx" ]; then
    echo -e "${RED}Error: No se encontró supabase/functions/server/index.tsx${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Archivos encontrados${NC}"

echo -e "${YELLOW}Configuración del Proyecto:${NC}"
echo "  - Project ID: $PROJECT_ID"
echo "  - URL: https://${PROJECT_ID}.supabase.co"
echo ""
echo -e "${YELLOW}Para completar el despliegue, necesitas:${NC}"
echo ""
echo "1. ${YELLOW}Opción A: Usar la CLI de Supabase (Recomendado)${NC}"
echo "   a) Instala Supabase CLI desde: https://github.com/supabase/cli#install-the-cli"
echo "   b) Autentica: npx supabase login"
echo "   c) Vincula el proyecto: npx supabase link --project-ref ${PROJECT_ID}"
echo "   d) Despliega funciones: npx supabase functions deploy"
echo ""
echo "2. ${YELLOW}Opción B: Desplegar directamente en el Dashboard${NC}"
echo "   a) Ve a: https://app.supabase.com/project/${PROJECT_ID}/functions"
echo "   b) Crea una nueva función"
echo "   c) Copia el contenido de supabase/functions/server/index.tsx"
echo ""
echo "3. ${YELLOW}Verificar funciones desplegadas${NC}"
echo "   npx supabase functions list"
echo ""
