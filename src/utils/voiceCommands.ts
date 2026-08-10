export type ReaderVoiceCommand = "play" | "pause" | "stop" | "next" | "previous" | "faster" | "slower";

export type VoiceCommandAction =
  | { type: "none" }
  | { type: "cancelListening" }
  | { type: "help"; open: boolean }
  | { type: "continuous"; enabled: boolean }
  | { type: "readFocused" }
  | { type: "readPage" }
  | { type: "stopFeedback" }
  | { type: "closeTopLayer" }
  | { type: "openMenu"; target: string }
  | { type: "focusRow"; step: 1 | -1 }
  | { type: "readCurrentRow" }
  | { type: "rowAction"; actionName: string }
  | { type: "readSelectOptions" }
  | { type: "selectOption"; value: string }
  | { type: "moveFocus"; step: 1 | -1 }
  | { type: "scroll"; direction: "down" | "up" | "top" | "bottom" }
  | { type: "routerBack" }
  | { type: "submitForm" }
  | { type: "clearField" }
  | { type: "focusElement"; target: string }
  | { type: "clickElement"; target: string }
  | { type: "fillNamedField"; fieldName: string; value: string }
  | { type: "fillActiveField"; value: string }
  | { type: "navigate"; routeName: string; query?: Record<string, string> }
  | { type: "openAccessibility" }
  | { type: "openCategory"; category: string }
  | { type: "openBook"; title: string }
  | { type: "search"; keyword: string; contentType: "all" | "serial" }
  | { type: "reader"; command: ReaderVoiceCommand };

export const voiceHelpSections = [
  {
    title: "พื้นฐาน",
    items: [
      "พูดคำสั่ง หรือพิมพ์คำสั่งเดียวกันในช่องคำสั่ง",
      "ช่วยเหลือ / ปิดช่วยเหลือ",
      "เปิดโหมดสั่งงานต่อเนื่อง / ปิดโหมดสั่งงานต่อเนื่อง",
      "หยุดฟัง / ยกเลิก",
      "อ่านตรงนี้ / อ่านทั้งหน้า / หยุดอ่านออกเสียง",
    ],
  },
  {
    title: "นำทาง",
    items: [
      "หน้าแรก / ร้านหนังสือ / นิยายรายตอน / อ่านฟรี / โปรโมชัน / หนังสือใหม่ / ขายดี",
      "ชั้นหนังสือ / กระเป๋าคอยน์ / รถเข็น / โปรไฟล์ / รายการโปรด",
      "แดชบอร์ดนักเขียน / อัปโหลดหนังสือ / แดชบอร์ดแอดมิน / ตั้งค่าระบบ",
      "ค้นหา นิยายรัก / เปิดหมวด แฟนตาซี / เปิดหนังสือ ชื่อเรื่อง",
      "เลื่อนลง / เลื่อนขึ้น / ไปบนสุด / ไปล่างสุด / ย้อนกลับ",
    ],
  },
  {
    title: "หน้าอ่าน",
    items: [
      "อ่านให้ฟัง / เริ่มฟัง / เล่นเสียง",
      "หยุดอ่าน / พักก่อน / หยุดเสียง",
      "ถัดไป / ประโยคถัดไป / ก่อนหน้า",
      "เร่งสปีด / เพิ่มความเร็ว / ลดสปีด / ช้าลง",
    ],
  },
  {
    title: "ฟอร์มและรายการ",
    items: [
      "ไปที่ช่อง อีเมล / กรอกว่า สมชาย / กรอก อีเมล ว่า test@example.com",
      "ส่งฟอร์ม / บันทึก / กดปุ่ม เข้าสู่ระบบ",
      "แถวถัดไป / อ่านแถวนี้ / แก้ไขรายการนี้ / ลบรายการนี้",
      "อันที่หนึ่ง / อันที่สอง เมื่อระบบพบหลายรายการ",
    ],
  },
];

export const voiceHelpItems = voiceHelpSections.flatMap((section) => section.items);

export function normalizeVoiceCommand(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[“”"!?]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeVoiceMatchText(value: string) {
  return normalizeVoiceCommand(value).replace(/\s+/g, "");
}

export function extractAfter(command: string, markers: string[]) {
  for (const marker of markers) {
    const index = command.indexOf(marker);
    if (index >= 0) return command.slice(index + marker.length).trim();
  }

  return "";
}

export function parseVoiceCommand(rawCommand: string): VoiceCommandAction {
  const command = normalizeVoiceCommand(rawCommand);

  if (!command) return { type: "none" };
  if (/^(หยุดฟัง|ยกเลิก|พอ|พอก่อน)$/.test(command)) return { type: "cancelListening" };
  if (/^(ช่วยเหลือ|คำสั่งเสียง|ดูคำสั่ง|มีคำสั่งอะไรบ้าง)$/.test(command)) return { type: "help", open: true };
  if (/^(ปิดช่วยเหลือ|ปิดรายการคำสั่ง|ปิดคำสั่งเสียง)$/.test(command)) return { type: "help", open: false };
  if (/^(เปิดโหมดสั่งงานต่อเนื่อง|ฟังต่อเนื่อง|เปิดฟังต่อเนื่อง|สั่งต่อเนื่อง)$/.test(command)) return { type: "continuous", enabled: true };
  if (/^(ปิดโหมดสั่งงานต่อเนื่อง|หยุดฟังต่อเนื่อง|ปิดฟังต่อเนื่อง|หยุดสั่งต่อเนื่อง)$/.test(command)) return { type: "continuous", enabled: false };

  const choiceMap: Record<string, number> = {
    "อันที่หนึ่ง": 0,
    "อันแรก": 0,
    "ตัวเลือกแรก": 0,
    "อันที่สอง": 1,
    "ตัวเลือกสอง": 1,
    "อันที่สาม": 2,
    "ตัวเลือกสาม": 2,
    "อันที่สี่": 3,
    "ตัวเลือกสี่": 3,
    "อันที่ห้า": 4,
    "ตัวเลือกห้า": 4,
  };

  if (command in choiceMap) return { type: "selectOption", value: String(choiceMap[command] + 1) };
  if (/^(อ่านตรงนี้|อ่านรายการนี้|อ่านช่องนี้|อ่านปุ่มนี้|อ่านสิ่งที่เลือก)$/.test(command)) return { type: "readFocused" };
  if (/^(อ่านทั้งหน้า|อ่านหน้านี้|สรุปหน้านี้)$/.test(command)) return { type: "readPage" };
  if (/^(หยุดอ่านออกเสียง|หยุดพูด|หยุดอ่าน feedback|หยุดอ่านฟีดแบ็ก)$/.test(command)) return { type: "stopFeedback" };
  if (/^(ปิดหน้าต่าง|ปิดเมนู|ปิดกล่อง|ปิดป๊อปอัป|ปิด popup)$/.test(command)) return { type: "closeTopLayer" };
  if (/^(เปิดเมนู|เปิดเมนูบัญชี|เปิดแจ้งเตือน)$/.test(command)) return { type: "openMenu", target: command.replace(/^เปิด/, "") };
  if (/^(แถวถัดไป|รายการถัดไป)$/.test(command)) return { type: "focusRow", step: 1 };
  if (/^(แถวก่อนหน้า|รายการก่อนหน้า)$/.test(command)) return { type: "focusRow", step: -1 };
  if (/^(อ่านแถวนี้|อ่านรายการนี้)$/.test(command)) return { type: "readCurrentRow" };
  if (/^(แก้ไขรายการนี้|แก้ไขแถวนี้)$/.test(command)) return { type: "rowAction", actionName: "แก้ไข" };
  if (/^(ลบรายการนี้|ลบแถวนี้)$/.test(command)) return { type: "rowAction", actionName: "ลบ" };
  if (/^(อ่านตัวเลือก|อ่านตัวเลือกทั้งหมด|มีตัวเลือกอะไรบ้าง)$/.test(command)) return { type: "readSelectOptions" };

  const selectedOption = extractAfter(command, ["เลือกตัวเลือก", "เลือกค่า", "เลือกเป็น"]);
  if (selectedOption) return { type: "selectOption", value: selectedOption };

  if (/^(แท็บถัดไป|ช่องถัดไป|ไปช่องถัดไป|โฟกัสถัดไป)$/.test(command)) return { type: "moveFocus", step: 1 };
  if (/^(แท็บก่อนหน้า|ช่องก่อนหน้า|ไปช่องก่อนหน้า|โฟกัสก่อนหน้า)$/.test(command)) return { type: "moveFocus", step: -1 };
  if (/^(เลื่อนลง|ลง)$/.test(command)) return { type: "scroll", direction: "down" };
  if (/^(เลื่อนขึ้น|ขึ้น)$/.test(command)) return { type: "scroll", direction: "up" };
  if (/^(บนสุด|ไปบนสุด)$/.test(command)) return { type: "scroll", direction: "top" };
  if (/^(ล่างสุด|ไปล่างสุด)$/.test(command)) return { type: "scroll", direction: "bottom" };
  if (/^(ย้อนกลับ|กลับ)$/.test(command)) return { type: "routerBack" };
  if (/^(ส่งฟอร์ม|ยืนยัน|ตกลง|บันทึก)$/.test(command)) return { type: "submitForm" };
  if (/^(ล้างช่อง|ล้างข้อความ|ลบข้อความ)$/.test(command)) return { type: "clearField" };

  const focusTarget = extractAfter(command, ["ไปที่ช่อง", "โฟกัสช่อง", "เลือกช่อง", "ไปที่"]);
  if (focusTarget) return { type: "focusElement", target: focusTarget };

  const clickTarget = extractAfter(command, ["กดปุ่ม", "คลิก", "กด", "เลือก"]);
  if (clickTarget) return { type: "clickElement", target: clickTarget };

  const fieldFillMatch = command.match(/^(?:กรอก|พิมพ์|ใส่)\s+(.+?)\s+(?:ว่า|เป็น)\s+(.+)$/);
  if (fieldFillMatch) {
    const [, fieldName, value] = fieldFillMatch;
    return { type: "fillNamedField", fieldName, value: value.trim() };
  }

  const fillValue = extractAfter(command, ["กรอกว่า", "พิมพ์ว่า", "ใส่ว่า", "กรอก", "พิมพ์", "ใส่"]);
  if (fillValue) return { type: "fillActiveField", value: fillValue };

  const searchKeyword = extractAfter(command, ["ค้นหา", "หาเรื่อง", "หา"]);
  if (searchKeyword) {
    return {
      type: "search",
      keyword: searchKeyword,
      contentType: /รายตอน|นิยายรายตอน/.test(command) ? "serial" : "all",
    };
  }

  const category = extractAfter(command, ["เปิดหมวด", "ไปหมวด", "หมวด"]);
  if (category) return { type: "openCategory", category };

  const bookTitle = extractAfter(command, [
    "ช่วยเปิดหนังสือ",
    "เปิดหนังสือ",
    "เปิดเรื่อง",
    "อ่านเรื่อง",
    "อ่านหนังสือ",
    "ฟังหนังสือ",
    "ฟังเรื่อง",
    "ไปที่หนังสือ",
    "ไปที่เรื่อง",
  ]);
  if (bookTitle) return { type: "openBook", title: bookTitle };

  if (/หน้าแรก|กลับหน้าแรก|โฮม|กลับบ้าน|ไปหน้าแรก/.test(command)) return { type: "navigate", routeName: "Home" };
  if (/อ่านต่อ|อ่านค้างไว้|อ่านที่ค้าง|อ่านต่อจากเดิม|อ่านต่อให้หน่อย/.test(command)) {
    return { type: "navigate", routeName: "Serials", query: { view: "continue" } };
  }
  if (/ค้นหา|หน้าค้นหา/.test(command)) return { type: "navigate", routeName: "Search" };
  if (/ขายดี|หนังสือขายดี|เบสเซลเลอร์|best seller|bestseller/.test(command)) return { type: "navigate", routeName: "BestSellers" };
  if (/หนังสือใหม่|ออกใหม่|มาใหม่|new release/.test(command)) return { type: "navigate", routeName: "NewReleases" };
  if (/โปรโมชัน|โปรโมชั่น|ลดราคา|promotion|promo/.test(command)) return { type: "navigate", routeName: "Promotions" };
  if (/อ่านฟรี|หนังสือฟรี|ฟรี|เปิดหน้าอ่านฟรี|ไปหน้าอ่านฟรี|เปิดอ่านฟรี|ไปอ่านฟรี/.test(command)) return { type: "navigate", routeName: "FreeBooks" };
  if (/หอเกียรติยศ|hall of fame/.test(command)) return { type: "navigate", routeName: "HallOfFame" };
  if (/แนะนำ|หนังสือแนะนำ|recommended|recommend/.test(command)) return { type: "navigate", routeName: "Recommended" };
  if (/แพ็กเกจสมาชิก|แพคเกจสมาชิก|แพ็กเกจรายเดือน|แพคเกจรายเดือน|subscription/.test(command)) return { type: "navigate", routeName: "SubscriptionPlans" };
  if (/หมวดหมู่|หน้าหมวดหมู่|category|categories/.test(command)) return { type: "navigate", routeName: "CategoryIndex" };
  if (/แท็ก|tag|tags/.test(command)) return { type: "navigate", routeName: "TagIndex" };
  if (/สำนักพิมพ์|publisher|publishers/.test(command)) return { type: "navigate", routeName: "PublisherIndex" };
  if (/^(นักเขียน|ผู้เขียน|รายชื่อนักเขียน|หน้านักเขียน|author|authors)$/.test(command)) return { type: "navigate", routeName: "AuthorIndex" };
  if (/ช่วยเหลือ|ศูนย์ช่วยเหลือ|support|help/.test(command)) return { type: "navigate", routeName: "Support" };
  if (/ติดต่อ|contact/.test(command)) return { type: "navigate", routeName: "Contact" };
  if (/รายงานปัญหา|แจ้งปัญหา|report/.test(command)) return { type: "navigate", routeName: "ReportIssue" };
  if (/เข้าสู่ระบบ|ล็อกอิน|login/.test(command)) return { type: "navigate", routeName: "Login" };
  if (/สมัครสมาชิก|สมัคร|register/.test(command)) return { type: "navigate", routeName: "Register" };
  if (/หน้าอ่านง่าย|ใช้งานแบบอ่านง่าย|accessible home|accessibility home/.test(command)) return { type: "navigate", routeName: "AccessibleHome" };
  if (/นิยายรายตอน|รายตอน|เปิดนิยายตอน|ไปหน้านิยาย/.test(command)) return { type: "navigate", routeName: "Serials" };
  if (/ชั้นหนังสือ|ห้องสมุดของฉัน|หนังสือของฉัน|คลังหนังสือ|เปิดชั้นหนังสือ/.test(command)) return { type: "navigate", routeName: "MyLibrary" };
  if (/รถเข็น|ตะกร้า|เปิดรถเข็น|เปิดตะกร้า/.test(command)) return { type: "navigate", routeName: "Cart" };
  if (/ประวัติคำสั่งซื้อ|คำสั่งซื้อของฉัน|ออเดอร์/.test(command)) return { type: "navigate", routeName: "OrderHistory" };
  if (/^(โปรไฟล์|ข้อมูลส่วนตัว|profile)$/.test(command)) return { type: "navigate", routeName: "Profile" };
  if (/ตั้งค่าการแจ้งเตือน|notification settings/.test(command)) return { type: "navigate", routeName: "NotificationSettings" };
  if (/การแจ้งเตือน|แจ้งเตือน|notifications/.test(command)) return { type: "navigate", routeName: "AccountNotifications" };
  if (/กำลังติดตาม|ติดตาม|following/.test(command)) return { type: "navigate", routeName: "AccountFollowing" };
  if (/อุปกรณ์ของฉัน|อุปกรณ์|devices/.test(command)) return { type: "navigate", routeName: "AccountDevices" };
  if (/รีวิวของฉัน|รีวิว|reviews/.test(command)) return { type: "navigate", routeName: "AccountReviews" };
  if (/ยืนยันอายุ|age verification/.test(command)) return { type: "navigate", routeName: "Profile" };
  if (/กระเป๋า|คอยน์|เหรียญ|เติมเงิน|เติมคอยน์/.test(command)) return { type: "navigate", routeName: "CoinWallet" };
  if (/แดชบอร์ดนักเขียน|หน้านักเขียน|writer dashboard/.test(command)) return { type: "navigate", routeName: "WriterDashboard" };
  if (/โปรไฟล์นักเขียน|ตั้งค่าโปรไฟล์นักเขียน|writer profile/.test(command)) return { type: "navigate", routeName: "WriterProfileSettings" };
  if (/หนังสือของฉันสำหรับนักเขียน|งานเขียนของฉัน|writer books/.test(command)) return { type: "navigate", routeName: "WriterBooks" };
  if (/อัปโหลดหนังสือ|อัพโหลดหนังสือ|upload book/.test(command)) return { type: "navigate", routeName: "WriterUpload" };
  if (/สถิติหนังสือ|สถิตินักเขียน|writer stats/.test(command)) return { type: "navigate", routeName: "WriterStats" };
  if (/แดชบอร์ดแอดมิน|หน้าแอดมิน|admin dashboard/.test(command)) return { type: "navigate", routeName: "AdminDashboard" };
  if (/จัดการหนังสือ|หนังสือแอดมิน|admin books/.test(command)) return { type: "navigate", routeName: "AdminBooks" };
  if (/อนุมัติรายการ|รายการอนุมัติ|approvals/.test(command)) return { type: "navigate", routeName: "AdminApprovals" };
  if (/จัดการการชำระเงิน|ชำระเงินแอดมิน|payment approvals|payments/.test(command)) return { type: "navigate", routeName: "AdminPayments" };
  if (/เติมคอยน์แอดมิน|coin topups/.test(command)) return { type: "navigate", routeName: "AdminCoinTopups" };
  if (/คำสั่งซื้อแอดมิน|order payments/.test(command)) return { type: "navigate", routeName: "AdminOrderPayments" };
  if (/ชำระแพ็กเกจสมาชิก|subscription payments/.test(command)) return { type: "navigate", routeName: "AdminSubscriptionPayments" };
  if (/จัดการแพ็กเกจสมาชิก|จัดแพ็กเกจสมาชิก|membership plans admin|manage membership plans/.test(command)) return { type: "navigate", routeName: "AdminSubscriptionPlans" };
  if (/รีเซ็ตรหัสผ่าน|password reset/.test(command)) return { type: "navigate", routeName: "AdminPasswordResets" };
  if (/ซัพพอร์ตทิกเก็ต|support ticket|support tickets/.test(command)) return { type: "navigate", routeName: "AdminSupportTickets" };
  if (/ข้อมูลระบบ|system data/.test(command)) return { type: "navigate", routeName: "AdminSystemData" };
  if (/จัดการเนื้อหาหน้าเว็บ|เนื้อหาหน้าเว็บ|page content/.test(command)) return { type: "navigate", routeName: "AdminPageContent" };
  if (/จัดการหมวดหมู่|หมวดหมู่แอดมิน|admin categories/.test(command)) return { type: "navigate", routeName: "AdminCategories" };
  if (/สมาชิกแอดมิน|จัดการสมาชิก|members/.test(command)) return { type: "navigate", routeName: "AdminMembers" };
  if (/แดชบอร์ดซูเปอร์แอดมิน|ซูเปอร์แอดมิน|superadmin dashboard/.test(command)) return { type: "navigate", routeName: "SuperAdminDashboard" };
  if (/จัดการผู้ใช้|ผู้ใช้|user management/.test(command)) return { type: "navigate", routeName: "SuperAdminUsers" };
  if (/จัดการบทบาท|บทบาท|role management/.test(command)) return { type: "navigate", routeName: "SuperAdminRoles" };
  if (/ตั้งค่าระบบ|system settings/.test(command)) return { type: "navigate", routeName: "SuperAdminSettings" };
  if (/ร้านหนังสือ|หน้าหนังสือ|หนังสือ|อีบุ๊ก|ebook|e book|ไปหน้าร้าน|เปิดร้าน|เลือกร้าน/.test(command)) return { type: "navigate", routeName: "Store" };
  if (/ตั้งค่าการเข้าถึง|การเข้าถึง|accessibility/.test(command)) return { type: "openAccessibility" };

  if (/เล่นเสียง|เริ่มอ่าน|เปิดอ่าน|อ่านให้ฟัง|อ่านออกเสียง|เล่น|เริ่มฟัง|เริ่ม|อ่านต่อให้หน่อย|ฟังต่อ|ไปต่อ/.test(command)) return { type: "reader", command: "play" };
  if (/หยุดอ่าน|พักเสียง|พักอ่าน|หยุดชั่วคราว|pause|หยุดก่อน|พักก่อน|เบรก/.test(command)) return { type: "reader", command: "pause" };
  if (/หยุดเสียง|ปิดเสียง|stop|เลิกอ่าน|พอแล้ว|หยุดทั้งหมด/.test(command)) return { type: "reader", command: "stop" };
  if (/ประโยคถัดไป|ย่อหน้าถัดไป|ถัดไป|ต่อไป|ข้ามไปต่อ|อ่านต่อประโยคหน้า/.test(command)) return { type: "reader", command: "next" };
  if (/ก่อนหน้า|ย้อนกลับประโยค|ย้อนกลับย่อหน้า|อ่านก่อนหน้า|กลับประโยคก่อน/.test(command)) return { type: "reader", command: "previous" };
  if (/เร่งสปีด|เพิ่มสปีด|เพิ่มความเร็ว|เร็วขึ้น|อ่านเร็วขึ้น|เร่งเสียง/.test(command)) return { type: "reader", command: "faster" };
  if (/ลดสปีด|ลดความเร็ว|ช้าลง|อ่านช้าลง|เสียงช้าลง/.test(command)) return { type: "reader", command: "slower" };

  return { type: "none" };
}
