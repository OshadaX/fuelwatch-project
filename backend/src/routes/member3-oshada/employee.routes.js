const express = require('express');
const router = express.Router();
const {
    getEmployees,
    loginEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
} = require('../../controllers/member3-oshada/employeeController');

router.get('/', getEmployees);
router.post('/login', loginEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
