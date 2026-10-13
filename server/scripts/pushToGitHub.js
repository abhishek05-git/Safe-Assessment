import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import fs from 'fs'
import path from 'path'

async function push() {
  const dir = path.resolve('.')
  console.log('Staging files...')

  const matrix = await git.statusMatrix({ fs, dir })
  for (const [filepath, head, workdir, stage] of matrix) {
    if (workdir === 0) {
      await git.remove({ fs, dir, filepath })
      console.log('Removed:', filepath)
    } else if (workdir !== stage || head !== workdir) {
      await git.add({ fs, dir, filepath })
      console.log('Staged:', filepath)
    }
  }

  console.log('Creating commit...')
  const sha = await git.commit({
    fs,
    dir,
    message: 'feat: implement SAFE assessment security remediation plan (SEC 01 - SEC 07)\n\n- SEC 01: Server-side OTP generation and peppered hash verification\n- SEC 02: Admin authentication with bcrypt hash and HttpOnly cookie\n- SEC 03: Removed client Apps Script URL and secret token exposure\n- SEC 04: Restrict candidate access query to session owner\n- SEC 05: Remove sensitive PII, OTP state, and results from localStorage\n- SEC 06: Server-side authoritative scoring on assessment submit\n- SEC 07: Express rate limiters, session timeouts, and audit logging',
    author: {
      name: 'abhishek05-git',
      email: 'admin@example.com'
    }
  })
  console.log('Created commit:', sha)

  const token = process.argv[2] || process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GitHub token must be provided via command argument or GITHUB_TOKEN env var')
  }

  console.log('Pushing to GitHub (origin/main)...')
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => ({
      username: 'abhishek05-git',
      password: token
    })
  })
  console.log('Push result:', JSON.stringify(pushResult))
}

push().catch(err => {
  console.error('Push error:', err)
  process.exit(1)
})
