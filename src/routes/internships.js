// src/routes/internships.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// CREATE INTERNSHIP
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      stipend,
      location,
      required_skills,
      duration_weeks,
      industry_user_id
    } = req.body;

    const internship = await prisma.internships.create({
      data: {
        title,
        description,
        type,
        stipend: stipend ? parseFloat(stipend) : null,
        location,
        required_skills: JSON.stringify(required_skills),
        duration_weeks: parseInt(duration_weeks),
        created_at: new Date(),
        industry_user_id
      }
    });

    res.status(201).json({
      message: 'Internship created',
      internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create internship' });
  }
});

// GET ALL INTERNSHIPS (with filters)
router.get('/', async (req, res) => {
  try {
    const { location, type } = req.query;

    const where = {};
    
    if (location) where.location = { contains: location };
    if (type) where.type = type;

    const internships = await prisma.internships.findMany({
      where,
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Parse required_skills JSON if it's a string
    const formattedInternships = internships.map(internship => ({
      ...internship,
      required_skills: typeof internship.required_skills === 'string' 
        ? JSON.parse(internship.required_skills) 
        : internship.required_skills,
      applicationsCount: internship._count.applications
    }));

    res.json({ internships: formattedInternships });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch internships' });
  }
});

// GET INTERNSHIP BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const internship = await prisma.internships.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    displayName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!internship) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    // Parse required_skills if it's a string
    if (typeof internship.required_skills === 'string') {
      internship.required_skills = JSON.parse(internship.required_skills);
    }

    res.json({ internship });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch internship' });
  }
});

// UPDATE INTERNSHIP
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert skills array to JSON string if it's an array
    if (updateData.required_skills && Array.isArray(updateData.required_skills)) {
      updateData.required_skills = JSON.stringify(updateData.required_skills);
    }

    // Parse duration_weeks to int if it exists
    if (updateData.duration_weeks) {
      updateData.duration_weeks = parseInt(updateData.duration_weeks);
    }

    // Parse stipend to float if it exists
    if (updateData.stipend) {
      updateData.stipend = parseFloat(updateData.stipend);
    }

    const internship = await prisma.internships.update({
      where: { id },
      data: updateData
    });

    // Parse required_skills for response if it's a string
    if (typeof internship.required_skills === 'string') {
      internship.required_skills = JSON.parse(internship.required_skills);
    }

    res.json({
      message: 'Internship updated',
      internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update internship' });
  }
});

// DELETE INTERNSHIP (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.internships.delete({
      where: { id }
    });

    res.json({ message: 'Internship deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete internship' });
  }
});

module.exports = router;