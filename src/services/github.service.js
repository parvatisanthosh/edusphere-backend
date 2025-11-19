const axios = require('axios');

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
  }

  getOAuthURL() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    const scope = 'read:user,user:email,repo';
    
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }

  async getAccessToken(code) {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code
        },
        {
          headers: { Accept: 'application/json' }
        }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error('Failed to get GitHub access token');
    }
  }

  async getUserData(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch GitHub user data');
    }
  }

  async getUserRepos(accessToken, username) {
    try {
      const response = await axios.get(
        `${this.baseURL}/users/${username}/repos?sort=updated&per_page=100`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch repositories');
    }
  }

  extractSkillsFromRepos(repos) {
    const skillsMap = new Map();
    
    repos.forEach(repo => {
      if (repo.language) {
        const count = skillsMap.get(repo.language) || 0;
        skillsMap.set(repo.language, count + 1);
      }
    });

    return Array.from(skillsMap.entries()).map(([name, count]) => ({
      name,
      proficiencyLevel: Math.min(5, Math.ceil(count / 2)),
      source: 'github'
    }));
  }
}

module.exports = new GitHubService();