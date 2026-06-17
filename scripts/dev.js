const { spawn } = require('child_process');
const os = require('os');

const port = process.env.PORT || '50';

const lanIp = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(
  process.execPath,
  [nextBin, 'dev', '-H', '0.0.0.0', '-p', port],
  { stdio: ['inherit', 'pipe', 'inherit'] }
);

child.stdout.on('data', (chunk) => {
  let out = chunk.toString();
  if (lanIp) out = out.replace(/0\.0\.0\.0/g, lanIp);
  process.stdout.write(out);
});

child.on('exit', (code) => process.exit(code ?? 0));
