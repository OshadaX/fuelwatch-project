const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Employee = require('./src/models/member3-oshada/EmployeeModel');

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Clear existing (optional - commenting out for safety)
        // await Employee.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const testEmployees = [
            {
                employeeId: 'EMP001',
                name: 'Oshada Navindra',
                email: 'oshada@fuelwatch.com',
                password: hashedPassword,
                role: 'admin',
                shift: 'Morning',
                joinDate: '2024-01-01',
                avatar: 'ON',
                color: '#3b82f6'
            },
            {
                employeeId: 'EMP002',
                name: 'Employee One',
                email: 'employee@fuelwatch.com',
                password: hashedPassword,
                role: 'employee',
                shift: 'Morning',
                joinDate: '2024-01-02',
                avatar: 'E1',
                color: '#10b981'
            }
        ];

        for (const emp of testEmployees) {
            await Employee.findOneAndUpdate(
                { email: emp.email },
                emp,
                { upsert: true, new: true }
            );
        }

        console.log('Seeding completed! Use password123 to login.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
