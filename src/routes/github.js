const express = require('express');
const { PrismaClient } = require('@prisma/client');
const githubService = require('../services/github.service');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get GitHub OAuth URL
router.get('/auth-url', authenticateToken, (req, res) => {
  const url = githubService.getOAuthURL();
  res.json({ url });
});

// GitHub OAuth Callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Code required' });
  }

  try {
    const accessToken = await githubService.getAccessToken(code);
    const githubUser = await githubService.getUserData(accessToken);
    
    res.json({
      success: true,
      githubUsername: githubUser.login,
      token: accessToken,
      message: 'Use this token with /connect endpoint'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect GitHub to user account
router.post('/connect', authenticateToken, async (req, res) => {
  const { githubToken } = req.body;
  const userId = req.user.userId;

  try {
    const githubUser = await githubService.getUserData(githubToken);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        githubUsername: githubUser.login,
        githubToken: githubToken,
        githubConnectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'GitHub account connected',
      username: githubUser.login
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync GitHub repositories
router.post('/sync-repos', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.githubToken || !user.githubUsername) {
      return res.status(400).json({ error: 'GitHub not connected. Use /connect first' });
    }

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile not found' });
    }

    // Fetch repositories
    const repos = await githubService.getUserRepos(
      user.githubToken,
      user.githubUsername
    );

    // Store top 10 repos as portfolio projects
    const topRepos = repos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);

    const projectPromises = topRepos.map(repo => {
      return prisma.portfolioProject.upsert({
        where: {
          githubRepoId: repo.id.toString()
        },
        update: {
          title: repo.name,
          description: repo.description || 'No description',
          githubUrl: repo.html_url,
          liveUrl: repo.homepage,
          tags: JSON.stringify(repo.topics || []),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          lastSyncedAt: new Date()
        },
        create: {
          studentId: user.student.id,
          title: repo.name,
          description: repo.description || 'No description',
          githubUrl: repo.html_url,
          liveUrl: repo.homepage,
          tags: JSON.stringify(repo.topics || []),
          source: 'github',
          githubRepoId: repo.id.toString(),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          lastSyncedAt: new Date()
        }
      });
    });

    await Promise.all(projectPromises);

    // Update last sync time
    await prisma.user.update({
      where: { id: userId },
      data: { lastGithubSync: new Date() }
    });

    res.json({
      success: true,
      message: 'Repositories synced successfully',
      projectsCount: topRepos.length,
      repos: topRepos.map(r => ({ name: r.name, stars: r.stargazers_count, language: r.language }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get synced projects
router.get('/projects', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const projects = await prisma.portfolioProject.findMany({
      where: { studentId: user.student.id },
      orderBy: { stars: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect GitHub
router.post('/disconnect', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        githubUsername: null,
        githubToken: null,
        githubConnectedAt: null,
        lastGithubSync: null
      }
    });

    res.json({
      success: true,
      message: 'GitHub account disconnected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
