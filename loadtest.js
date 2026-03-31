import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 50 },  // 5 นาทีแรก: ค่อยๆ เพิ่มคนเป็น 50 คน
    { duration: '10m', target: 50 }, // 10 นาทีต่อมา: ยิงแช่ไว้ที่ 50 คน ดูความเสถียร
    { duration: '5m', target: 200 }, // 5 นาทีต่อมา: อัดเพิ่มเป็น 200 คน (น่าจะเริ่มแตะ Max 3 Instances)
    { duration: '1h', target: 200 },  // ยิงยาว 1 ชม. ที่ 200 คน เพื่อดู Load ระยะยาว
    { duration: '10m', target: 0 },  // 10 นาทีสุดท้าย: ค่อยๆ ลดคนลงจนเหลือ 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // ตั้งเป้าว่า Error ต้องน้อยกว่า 1%
    http_req_duration: ['p(95)<500'], // 95% ของ Request ต้องตอบกลับภายใน 500ms
  },
};

export default function () {
  // เปลี่ยน URL เป็นของ Cloud Run Backend ของคุณ
  const url = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api/health'; 
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer YOUR_TOKEN', // ถ้าต้องใส่ Token
    },
  };

  const res = http.get(url, params);

  // เช็กว่าตอบกลับเป็น 200 OK ไหม
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1); // พัก 1 วินาทีระหว่างแต่ละ Request เพื่อไม่ให้ยิงรัวจนเกินไปในระดับ Network
}