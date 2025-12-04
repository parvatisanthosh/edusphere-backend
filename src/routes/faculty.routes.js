const express = require('express');
const router = express.Router();
const { ensureAuthenticated, restrictToRole } = require('../middleware/auth');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post("/register", ensureAuthenticated, restrictToRole('admin'), async (req, res) => {
    try{
    const { instituteId, userId, department } = req.body;
    if (!instituteId || !userId || !department) {
        return res.status(400).json({ error: 'instituteId, userId, name, and department are required fields.' });
    }
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const institute = await prisma.institutions.findUnique({ where: { id: instituteId } });
    if (!institute) {
        return res.status(404).json({ error: 'Institute not found' });
    }
    const faculty = await prisma.faculty.create({
        data: {
            instituteId,
            userId,
            name: user.displayName,
            department,
        },
    });
    res.status(201).json({ message: 'Faculty created successfully', id: faculty.id });
}catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;