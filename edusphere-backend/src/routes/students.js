// src/routes/students.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// CREATE STUDENT PROFILE
router.post('/', async (req, res) => {
  try {
    const { 
      userId, 
      rollNumber, 
      department, 
      semester, 
      cgpa, 
      dateOfBirth, 
      phone 
    } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if student profile already exists
    const existingStudent = await prisma.student.findUnique({
      where: { userId }
    });

    if (existingStudent) {
      return res.status(400).json({ error: 'Student profile already exists' });
    }

    // Create student
    const student = await prisma.student.create({
      data: {
        userId,
        rollNumber,
        department,
        semester,
        cgpa,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone,
        approved: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Student profile created',
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create student profile' });
  }
});

// GET ALL STUDENTS
router.get('/', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        profile: true
      }
    });

    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET STUDENT BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        profile: true,
        applications: {
          include: {
            internship: true
          }
        },
        projects: true,
        enrollments: {
          include: {
            course: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// UPDATE STUDENT PROFILE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert dateOfBirth if provided
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        profile: true
      }
    });

    res.json({
      message: 'Student updated',
      student
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// CREATE/UPDATE STUDENT DETAILED PROFILE
router.post('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bio,
      gender,
      dob,
      avatarUrl,
      github,
      linkedin,
      skills,
      interests,
      resumeUrl,
      department
    } = req.body;

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { studentId: id }
    });

    let profile;

    if (existingProfile) {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { studentId: id },
        data: {
          bio,
          gender,
          dob: dob ? new Date(dob) : null,
          avatarUrl,
          github,
          linkedin,
          skills: skills ? JSON.stringify(skills) : null,
          interests: interests ? JSON.stringify(interests) : null,
          resumeUrl,
          department
        }
      });
    } else {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          studentId: id,
          bio,
          gender,
          dob: dob ? new Date(dob) : null,
          avatarUrl,
          github,
          linkedin,
          skills: skills ? JSON.stringify(skills) : null,
          interests: interests ? JSON.stringify(interests) : null,
          resumeUrl,
          department
        }
      });
    }

    res.json({
      message: 'Profile saved',
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

module.exports = router;