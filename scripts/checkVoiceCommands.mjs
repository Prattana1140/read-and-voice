import assert from "node:assert/strict";
import { parseVoiceCommand } from "../src/utils/voiceCommands.ts";

const cases = [
  ["ช่วยเหลือ", { type: "help", open: true }],
  ["เปิดโหมดสั่งงานต่อเนื่อง", { type: "continuous", enabled: true }],
  ["ค้นหา นิยายรัก", { type: "search", keyword: "นิยายรัก", contentType: "all" }],
  ["ค้นหา นิยายรายตอน แฟนตาซี", { type: "search", keyword: "นิยายรายตอน แฟนตาซี", contentType: "serial" }],
  ["เปิดหมวด แฟนตาซี", { type: "openCategory", category: "แฟนตาซี" }],
  ["เปิดหนังสือ เมืองที่อ่านด้วยเสียง", { type: "openBook", title: "เมืองที่อ่านด้วยเสียง" }],
  ["ฟังหนังสือ เสียงสุดท้ายจากสถานีเก่า", { type: "openBook", title: "เสียงสุดท้ายจากสถานีเก่า" }],
  ["อ่านให้ฟัง", { type: "reader", command: "play" }],
  ["เปิดอ่าน", { type: "reader", command: "play" }],
  ["พักก่อน", { type: "reader", command: "pause" }],
  ["หยุดเสียง", { type: "reader", command: "stop" }],
  ["ประโยคถัดไป", { type: "reader", command: "next" }],
  ["ก่อนหน้า", { type: "reader", command: "previous" }],
  ["ไปที่ช่อง อีเมล", { type: "focusElement", target: "อีเมล" }],
  ["กรอก อีเมล ว่า test@example.com", { type: "fillNamedField", fieldName: "อีเมล", value: "test@example.com" }],
  ["กดปุ่ม เข้าสู่ระบบ", { type: "clickElement", target: "เข้าสู่ระบบ" }],
  ["เปิดรถเข็น", { type: "navigate", routeName: "Cart" }],
  ["ประวัติคำสั่งซื้อ", { type: "navigate", routeName: "OrderHistory" }],
  ["เลื่อนลง", { type: "scroll", direction: "down" }],
  ["คำสั่งที่ไม่มี", { type: "none" }],
];

for (const [spoken, expected] of cases) {
  assert.deepEqual(parseVoiceCommand(spoken), expected, spoken);
}

console.log(`OK voice command parser: ${cases.length} cases`);
