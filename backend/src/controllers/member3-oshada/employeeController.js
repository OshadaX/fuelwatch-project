const Employee = require('../../models/member3-oshada/EmployeeModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get all employees
const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login an employee
const loginEmployee = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find employee by email
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: employee._id, role: employee.role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1d' }
        );

        // Remove password from response
        const employeeObj = employee.toObject();
        delete employeeObj.password;

        res.status(200).json({
            token,
            user: employeeObj
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create an employee
const createEmployee = async (req, res) => {
    try {
        const { password, ...rest } = req.body;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const employee = new Employee({
            ...rest,
            password: hashedPassword
        });

        const savedEmployee = await employee.save();

        // Remove password from response
        const employeeObj = savedEmployee.toObject();
        delete employeeObj.password;

        res.status(201).json(employeeObj);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update an employee
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(updatedEmployee);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete an employee
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEmployee = await Employee.findByIdAndDelete(id);
        if (!deletedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getEmployees,
    loginEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
