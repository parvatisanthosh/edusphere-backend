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
      companyName,
      location,
      type,
      duration,
      stipend,
      requiredSkills,
      startDate,
      endDate,
      applicationDeadline,
      postedBy
    } = req.body;

    const internship = await prisma.internship.create({
      data: {
        title,
        description,
        companyName,
        location,
        type,
        duration,
        stipend,
        requiredSkills: JSON.stringify(requiredSkills),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        postedBy,
        isActive: true
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
    const { location, type, isActive } = req.query;

    const where = {};
    
    if (location) where.location = { contains: location };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const internships = await prisma.internship.findMany({
      where,
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse requiredSkills JSON
    const formattedInternships = internships.map(internship => ({
      ...internship,
      requiredSkills: JSON.parse(internship.requiredSkills),
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

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
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

    // Parse requiredSkills
    internship.requiredSkills = JSON.parse(internship.requiredSkills);

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

    // Convert dates
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.applicationDeadline) updateData.applicationDeadline = new Date(updateData.applicationDeadline);

    // Convert skills array to JSON string
    if (updateData.requiredSkills) {
      updateData.requiredSkills = JSON.stringify(updateData.requiredSkills);
    }

    const internship = await prisma.internship.update({
      where: { id },
      data: updateData
    });

    internship.requiredSkills = JSON.parse(internship.requiredSkills);

    res.json({
      message: 'Internship updated',
      internship
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update internship' });
  }
});

// DELETE INTERNSHIP (soft delete - set isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.internship.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Internship deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete internship' });
  }
});

module.exports = router;