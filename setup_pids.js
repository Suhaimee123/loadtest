const https = require('https');
const fs = require('fs/promises');

// ================= CONFIGURATION =================
const TOKEN = ''; // ระบุ Token ของคุณที่นี่
const ITERATIONS = 100; // จำนวนโต๊ะที่ต้องการสร้าง
const OUTPUT_FILE = 'pids.json';
const BASE_URL = 'us-central1-warungpos-9e429.cloudfunctions.net';
// ===============================================

async function post(path, payload) {
    const data = JSON.stringify(payload);
    const options = {
        hostname: BASE_URL,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject(new Error(`Status: ${res.statusCode}, Body: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function run() {
    if (!TOKEN) {
        console.error('❌ Error: กรุณาระบุ Token ในไฟล์ setup_pids.js ก่อนรัน');
        process.exit(1);
    }

    console.log(`🚀 Starting Setup for ${ITERATIONS} tables...`);
    const pids = [];

    for (let i = 1; i <= ITERATIONS; i++) {
        const tableName = `TEST${i}`;
        try {
            // Step 1: Create Table
            process.stdout.write(`[${i}/${ITERATIONS}] Creating ${tableName}... `);
            const createRes = await post('/api/tables', {
                nameTH: tableName,
                code: tableName,
                zone: "Auto-Created",
                capacity: 9,
                isActive: true
            });
            
            const tableId = createRes.data.id;

            // Step 2: Print QR
            const qrRes = await post('/api/publicTables/printQR', {
                tableId: tableId,
                addressId: null
            });

            const pid = qrRes.pid;
            pids.push(pid);
            console.log(`✅ Success (PID: ${pid})`);

            // Small delay to avoid hammering the API too hard
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.log(`\n❌ Failed at iteration ${i}: ${err.message}`);
            // Choose to continue or stop
            const proceed = true; 
            if (!proceed) break;
        }
    }

    if (pids.length > 0) {
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(pids, null, 2));
        console.log(`\n🏁 Finished!`);
        console.log(`📋 Total PIDs collected: ${pids.length}`);
        console.log(`💾 Saved to: ${OUTPUT_FILE}`);
    } else {
        console.log('\n⚠️ No PIDs collected.');
    }
}

run().catch(err => console.error('Fatal Error:', err));
