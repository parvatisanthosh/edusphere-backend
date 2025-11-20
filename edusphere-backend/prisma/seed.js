// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Student',
      email: 'alice@example.com',
      password: hashedPassword
    }
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Student',
      email: 'bob@example.com',
      password: hashedPassword
    }
  });

  console.log('✅ Created users');

  // Create students
  const student1 = await prisma.student.create({
    data: {
      userId: user1.id,
      rollNumber: 'CS2024001',
      department: 'Computer Science',
      semester: 6,
      cgpa: 8.5,
      phone: '+919876543210',
      approved: true
    }
  });

  const student2 = await prisma.student.create({
    data: {
      userId: user2.id,
      rollNumber: 'CS2024002',
      department: 'Computer Science',
      semester: 5,
      cgpa: 7.8,
      phone: '+919876543211',
      approved: true
    }
  });

  console.log('✅ Created students');

  // Create profiles
  await prisma.profile.create({
    data: {
      studentId: student1.id,
      bio: 'Passionate about web development',
      github: 'https://github.com/alice',
      linkedin: 'https://linkedin.com/in/alice',
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Python']),
      interests: JSON.stringify(['Web Development', 'AI', 'Cloud Computing'])
    }
  });

  console.log('✅ Created profiles');

  // Create internships
  const internship1 = await prisma.internship.create({
    data: {
      title: 'Full Stack Development Intern',
      description: 'Work on MERN stack projects with experienced developers',
      companyName: 'Tech Innovations Pvt Ltd',
      location: 'Mumbai',
      type: 'hybrid',
      duration: 12,
      stipend: 15000,
      requiredSkills: JSON.stringify(['React', 'Node.js', 'MongoDB', 'Express']),
      applicationDeadline: new Date('2025-01-15'),
      postedBy: 'admin',
      isActive: true
    }
  });

  const internship2 = await prisma.internship.create({
    data: {
      title: 'Data Science Intern',
      description: 'Work on ML models and data analysis',
      companyName: 'Analytics Pro',
      location: 'Bangalore',
      type: 'remote',
      duration: 16,
      stipend: 20000,
      requiredSkills: JSON.stringify(['Python', 'Pandas', 'Scikit-learn', 'SQL']),
      applicationDeadline: new Date('2025-01-20'),
      postedBy: 'admin',
      isActive: true
    }
  });

  const internship3 = await prisma.internship.create({
    data: {
      title: 'Mobile App Development Intern',
      description: 'Build Android/iOS apps using React Native',
      companyName: 'Mobile Solutions',
      location: 'Pune',
      type: 'onsite',
      duration: 10,
      stipend: 12000,
      requiredSkills: JSON.stringify(['React Native', 'JavaScript', 'Firebase']),
      applicationDeadline: new Date('2025-01-10'),
      postedBy: 'admin',
      isActive: true
    }
  });

  console.log('✅ Created internships');

  // Create applications
  await prisma.internshipApplication.create({
    data: {
      studentId: student1.id,
      internshipId: internship1.id,
      coverLetter: 'I am very interested in this full stack position...',
      status: 'pending'
    }
  });

  await prisma.internshipApplication.create({
    data: {
      studentId: student2.id,
      internshipId: internship2.id,
      coverLetter: 'I have strong data science skills...',
      status: 'accepted',
      reviewedAt: new Date()
    }
  });

  console.log('✅ Created applications');

  // Create courses
  const course1 = await prisma.course.create({
    data: {
      title: 'Advanced JavaScript',
      description: 'Master modern JavaScript',
      type: 'technical',
      price: 0,
      instructorId: 'system'
    }
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Communication Skills',
      description: 'Improve professional communication',
      type: 'soft_skill',
      price: 0,
      instructorId: 'system'
    }
  });

  console.log('✅ Created courses');

  // Enroll students
  await prisma.courseEnrollment.create({
    data: {
      studentId: student1.id,
      courseId: course1.id,
      progressPercent: 45
    }
  });

  console.log('✅ Created enrollments');

  // Create portfolio projects
  await prisma.portfolioProject.create({
    data: {
      studentId: student1.id,
      title: 'E-commerce Website',
      description: 'Full stack e-commerce platform built with MERN',
      githubUrl: 'https://github.com/alice/ecommerce',
      liveUrl: 'https://myshop.com',
      tags: JSON.stringify(['React', 'Node.js', 'MongoDB'])
    }
  });

  await prisma.portfolioProject.create({
    data: {
      studentId: student1.id,
      title: 'Weather App',
      description: 'React-based weather forecasting app',
      githubUrl: 'https://github.com/alice/weather',
      liveUrl: 'https://myweather.com',
      tags: JSON.stringify(['React', 'API', 'CSS'])
    }
  });

  console.log('✅ Created projects');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });