// 한 터미널에서 서버(코드 바뀌면 자동 재시작) + 빌드 감시(파일 바뀌면 자동 재빌드)를 함께 돌린다.
// 사용:  npm run live   →  http://localhost:8787  (고치고 새로고침만 하면 반영)
import { spawn } from 'node:child_process'
const run = (cmd, args) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  p.on('exit', (c) => { if (c) process.exit(c) })
  return p
}
const kids = [run('npx', ['vite', 'build', '--watch']), run(process.execPath, ['--watch', 'server/index.js'])]
const bye = () => kids.forEach((k) => k.kill())
process.on('SIGINT', bye); process.on('SIGTERM', bye)
