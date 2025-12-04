const express = require('express');
const router = express.Router();
const { ensureAuthenticated, restrictToRole } = require('../middleware/auth');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


router.post("/register", ensureAuthenticated, restrictToRole('admin'), async (req, res) => {
    try{
    const { instituteName, state, adminUserId ,createdAt} = req.body;
    if (!instituteName || !state || !adminUserId) {
        return res.status(400).json({ error: 'instituteName, state, and adminUserId are required fields.' });
    }

    const adminUser = await prisma.users.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found' });
    }
    const institute = await prisma.institutions.create({
        data: {
            instituteName,
            state,
            adminUserId,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
        },
    });
    res.status(201).json({ message: 'Institute created successfully', id: institute.id });

}catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    }
});

// to see all institutes
router.get('/', async (req, res) => {
    try {
        const institutes = await prisma.institutions.findMany();
        res.status(200).json(institutes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

// to see admin of an institute
router.get('/:instituteId/admin', async (req, res) => {
    try {
        const { instituteId } = req.params;
        const institute = await prisma.institutions.findUnique({
            where: { id: instituteId },
            include: {
                adminUser: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        phone: true,
                        role: true,
                    },


                },
            },
        });
        if (!institute) {
            return res.status(404).json({ message: 'Institute not found' });
        }
        res.status(200).json(institute.adminUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}); 

module.exports = router;