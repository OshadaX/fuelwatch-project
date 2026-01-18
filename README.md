# 🚀 FUELWATCH: AI-Powered Smart Surveillance & Predictive Analysis Platform

[![Research ID](https://img.shields.io/badge/Research%20ID-25--26J--394-blue)](https://github.com/your-username/fuelwatch-project)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)

## 📋 Project Overview

FUELWATCH is an AI-powered platform for fuel station management that provides:
- Real-time fuel availability monitoring
- Anomaly detection in fuel dispensing
- Smart station recommendations
- Employee management & staff prediction
- Gas demand forecasting & auto-refill suggestions

## 👥 Team Members

| Member | ID | Component |
|--------|-----|-----------|
| **Kumara J.K.S.U** | IT22179180 | Real-Time Fuel Monitoring & Anomaly Detection |
| **Aluthge T.D** | IT22131638 | Smart Station Recommendation Engine |
| **Oshada Navindra** | IT22079022 | Admin Dashboard & Staff Prediction |
| **Vithanage C.V.K** | IT22081834 | Gas Demand Predictor & Auto-refill |

## 🛠️ Tech Stack

### Frontend
- React 18.2
- Material-UI (MUI)
- Recharts
- React Router
- Axios

### Backend
- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- RESTful API

### ML Services
- Python & Flask
- Scikit-learn
- TensorFlow/Keras
- Prophet
- ARIMA, LSTM

### IoT
- Arduino ESP32
- JSN-SR04T Ultrasonic Sensor
- MQTT Protocol

## 📁 Project Structure
```
fuelwatch-project/
├── frontend/          # React Frontend
├── backend/           # Node.js Backend
├── ml-services/       # Python ML Services
├── iot-services/      # IoT & Arduino
├── database/          # MongoDB Scripts
├── docker/            # Docker Configuration
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MongoDB 7.0 or higher
- Python 3.10 or higher
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/fuelwatch-project.git
cd fuelwatch-project
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

4. **Setup Environment Variables**
```bash
# Copy .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

5. **Start MongoDB**
```bash
# Using Docker
docker-compose -f docker/docker-compose.dev.yml up -d mongodb

# OR install MongoDB locally
```

6. **Run Development Servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🐳 Docker Setup
```bash
# Start all services with Docker
docker-compose -f docker/docker-compose.dev.yml up

# Stop all services
docker-compose -f docker/docker-compose.dev.yml down
```

## 📊 API Endpoints

### Member 1 - Kumara (Fuel Monitoring)
- `GET /api/member1/fuel-stocks` - Get all fuel stocks
- `POST /api/member1/anomalies/detect` - Detect anomalies
- `GET /api/member1/predictions/demand` - Get demand predictions

### Member 2 - Aluthge (Station Recommendations)
- `POST /api/member2/recommendations` - Get station recommendations
- `GET /api/member2/stations` - Get all stations

### Member 3 - Oshada (Admin & Staff)
- `GET /api/member3/employees` - Get employees
- `POST /api/member3/staff/predict` - Predict staff requirements

### Member 4 - Vithanage (Gas Demand)
- `POST /api/member4/gas/predict` - Predict gas depletion
- `GET /api/member4/refill/suggestions` - Get refill suggestions

## 📚 Documentation

- [API Documentation](docs/api/)
- [Architecture](docs/architecture/)
- [Deployment Guide](docs/deployment/)
- [User Guides](docs/user-guides/)

## 🧪 Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## �� License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Lanka IOC
- CEYPETCO
- Lanka Filling Station, Biyagama

## 📧 Contact

For questions or support, please contact:
- Kumara J.K.S.U - IT22179180
- Project ID: 25-26J-394

---
Made with ❤️ by FUELWATCH Team
