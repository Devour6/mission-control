import { NextResponse } from 'next/server';

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

async function fetchGitHubFile(path: string): Promise<{ lastModified: string | null; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Devour6/openclaw'; // Assuming this from context
  
  if (!token) {
    return { lastModified: null, error: 'GitHub token not configured' };
  }

  try {
    // Get commits for the file to find last modified date
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Mission-Control-Health-Dashboard'
        }
      }
    );

    if (!commitsResponse.ok) {
      if (commitsResponse.status === 404) {
        return { lastModified: null, error: 'File not found' };
      }
      if (commitsResponse.status === 403) {
        return { lastModified: null, error: 'Rate limited or access denied' };
      }
      return { lastModified: null, error: `GitHub API error: ${commitsResponse.status}` };
    }

    const commits: GitHubCommit[] = await commitsResponse.json();
    
    if (commits.length === 0) {
      return { lastModified: null, error: 'No commits found for file' };
    }

    return { lastModified: commits[0].commit.committer.date };
  } catch (error) {
    console.error(`Error fetching GitHub file ${path}:`, error);
    return { lastModified: null, error: 'Failed to fetch from GitHub' };
  }
}

async function getLatestFileInDirectory(dirPath: string, pattern?: string): Promise<{ lastModified: string | null; error?: string; fileName?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = 'Devour6/openclaw';
  
  if (!token) {
    return { lastModified: null, error: 'GitHub token not configured' };
  }

  try {
    // Get directory contents
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(dirPath)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Mission-Control-Health-Dashboard'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { lastModified: null, error: 'Directory not found' };
      }
      return { lastModified: null, error: `GitHub API error: ${response.status}` };
    }

    const files: GitHubFile[] = await response.json();
    
    // Filter files by pattern if provided
    let filteredFiles = files.filter(f => f.type === 'file');
    if (pattern) {
      filteredFiles = filteredFiles.filter(f => f.name.includes(pattern));
    }

    if (filteredFiles.length === 0) {
      return { lastModified: null, error: 'No matching files found' };
    }

    // Get the latest file by checking commits for each
    let latestFile = null;
    let latestDate = null;

    for (const file of filteredFiles) {
      const fileResult = await fetchGitHubFile(`${dirPath}/${file.name}`);
      if (fileResult.lastModified && (!latestDate || new Date(fileResult.lastModified) > new Date(latestDate))) {
        latestDate = fileResult.lastModified;
        latestFile = file.name;
      }
    }

    return { 
      lastModified: latestDate, 
      error: latestDate ? undefined : 'No recent files found',
      fileName: latestFile || undefined 
    };
  } catch (error) {
    console.error(`Error fetching directory ${dirPath}:`, error);
    return { lastModified: null, error: 'Failed to fetch directory from GitHub' };
  }
}

function getHealthStatus(lastModified: string | null): 'green' | 'yellow' | 'red' {
  if (!lastModified) return 'red';
  
  const now = new Date();
  const lastUpdate = new Date(lastModified);
  const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 4) return 'green';
  if (diffHours < 12) return 'yellow';
  return 'red';
}

export async function GET() {
  try {
    // Define agents and their file paths
    const agentConfigs = [
      {
        name: 'Dwight',
        file: 'intel/DAILY-INTEL.md',
        isDirectory: false
      },
      {
        name: 'Kelly',
        file: 'drafts/x',
        isDirectory: true,
        pattern: '.md'
      },
      {
        name: 'Rachel',
        file: 'drafts/linkedin',
        isDirectory: true,
        pattern: '.md'
      },
      {
        name: 'John',
        file: 'agents/john/trades/proposals',
        isDirectory: true,
        pattern: '.md'
      },
      {
        name: 'Pam',
        file: 'crm/contacts.json',
        isDirectory: false
      }
    ];

    const agentStatuses = await Promise.all(
      agentConfigs.map(async (config) => {
        let result;
        
        if (config.isDirectory) {
          result = await getLatestFileInDirectory(config.file, config.pattern);
        } else {
          result = await fetchGitHubFile(config.file);
        }

        const displayFile = config.isDirectory && 'fileName' in result && result.fileName 
          ? `${config.file}/${result.fileName}` 
          : config.file;

        return {
          name: config.name,
          file: displayFile,
          lastUpdated: result.lastModified,
          status: getHealthStatus(result.lastModified),
          error: result.error
        };
      })
    );

    return NextResponse.json({ 
      agents: agentStatuses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent health API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent health data' },
      { status: 500 }
    );
  }
}