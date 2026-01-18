#!/bin/bash

echo "🚀 Creating FUELWATCH Project Structure..."

# Frontend Structure
echo "📁 Creating Frontend structure..."
mkdir -p frontend/public/assets
mkdir -p frontend/src/components/member1-kumara
mkdir -p frontend/src/components/member2-aluthge
mkdir -p frontend/src/components/member3-oshada
mkdir -p frontend/src/components/member4-vithanage
mkdir -p frontend/src/components/shared
mkdir -p frontend/src/pages
mkdir -p frontend/src/services
mkdir -p frontend/src/utils
mkdir -p frontend/src/context
mkdir -p frontend/src/hooks

# Backend Structure
echo "📁 Creating Backend structure..."
mkdir -p backend/src/controllers/member1-kumara
mkdir -p backend/src/controllers/member2-aluthge
mkdir -p backend/src/controllers/member3-oshada
mkdir -p backend/src/controllers/member4-vithanage

mkdir -p backend/src/routes/member1-kumara
mkdir -p backend/src/routes/member2-aluthge
mkdir -p backend/src/routes/member3-oshada
mkdir -p backend/src/routes/member4-vithanage

mkdir -p backend/src/models/member1-kumara
mkdir -p backend/src/models/member2-aluthge
mkdir -p backend/src/models/member3-oshada
mkdir -p backend/src/models/member4-vithanage
mkdir -p backend/src/models/shared

mkdir -p backend/src/middleware
mkdir -p backend/src/config
mkdir -p backend/src/utils
mkdir -p backend/tests/member1-kumara
mkdir -p backend/tests/member2-aluthge
mkdir -p backend/tests/member3-oshada
mkdir -p backend/tests/member4-vithanage

# ML Services Structure
echo "📁 Creating ML Services structure..."
mkdir -p ml-services/member1-kumara/{models/saved_models,scripts,data/{raw,processed},api,utils}
mkdir -p ml-services/member2-aluthge/{models/saved_models,scripts,data/{raw,processed},api,utils}
mkdir -p ml-services/member3-oshada/{models/saved_models,scripts,data/{raw,processed},api,utils}
mkdir -p ml-services/member4-vithanage/{models/saved_models,scripts,data/{raw,processed},api,utils}
mkdir -p ml-services/shared

# IoT Services
echo "📁 Creating IoT Services structure..."
mkdir -p iot-services/member1-kumara/{arduino,python}
mkdir -p iot-services/config

# Database
echo "📁 Creating Database structure..."
mkdir -p database/seeds/{member1-kumara,member2-aluthge,member3-oshada,member4-vithanage}
mkdir -p database/schemas
mkdir -p database/indexes

# Documentation
echo "📁 Creating Documentation structure..."
mkdir -p docs/{api,architecture/diagrams,deployment,user-guides}

# Docker
echo "📁 Creating Docker structure..."
mkdir -p docker/{frontend,backend,ml-services}

# Scripts
echo "📁 Creating Scripts folder..."
mkdir -p scripts

# Add .gitkeep to preserve empty folders
echo "📝 Adding .gitkeep files..."
find . -type d -empty -not -path "*/.git/*" -not -path "*/node_modules/*" -exec touch {}/.gitkeep \;

echo "✅ Project structure created successfully!"
echo "📍 Location: $(pwd)"
