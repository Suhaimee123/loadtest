const { spawn } = require('child_process');
const fs = require('fs');

const logFile = 'new_pids.txt';
// เคลียร์ไฟล์เก่าทิ้งก่อนเริ่มใหม่
fs.writeFileSync(logFile, '');

const k6 = spawn('k6', ['run', 'create_tables.js']);

console.log('🚀 Starting Table Creation & PID Extraction (Regex Mode)...');

k6.stdout.on('data', (data) => {
  processLine(data.toString());
});

k6.stderr.on('data', (data) => {
  processLine(data.toString());
});

function processLine(text) {
  const lines = text.split('\n');
  lines.forEach(line => {
    // ใช้ Regex เพื่อจับรหัส PID ที่อยู่หลัง [RESULT_PID]: อย่างแม่นยำ
    const match = line.match(/\[RESULT_PID\]:\s*([^\s"]+)/);
    if (match) {
      const pid = match[1];
      fs.appendFileSync(logFile, pid + '\n');
      console.log(`✅ Saved PID: ${pid}`);
    } else if (line.includes('level=error')) {
      console.error(`❌ Error from k6: ${line.trim()}`);
    }
  });
}

k6.on('close', (code) => {
  console.log(`\n🏁 k6 process finished with code ${code}`);
  const content = fs.readFileSync(logFile, 'utf8').trim();
  const count = content ? content.split('\n').filter(Boolean).length : 0;
  console.log(`📋 Total PIDs collected: ${count}`);
});
