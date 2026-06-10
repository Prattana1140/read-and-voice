const serialBookCategories = [
  "นิยายรัก",
  "นิยายรักวัยรุ่น",
  "นิยายรักวัยว้าวุ่น",
  "นิยายโรแมนซ์",
  "นิยายรักผู้ใหญ่",
  "นิยายรักจีนโบราณ",
  "นิยาย Boy Love Lovely Room",
  "นิยาย Boy Love Party Room",
  "นิยาย Boy Love Secret Room",
  "นิยาย Girl Love Lovely Room",
  "นิยาย Girl Love Party Room",
  "นิยาย Girl Love Secret Room",
  "แฟนตาซี เกมออนไลน์ ต่างโลก",
  "Sci-fi",
  "ผจญภัย แอคชั่น กำลังภายใน",
  "สืบสวน",
  "ลึกลับ",
  "สยองขวัญ",
  "สะท้อนสังคม",
  "แนวทางเลือก",
  "สาระความรู้",
  "เรื่องนี้ที่อยากเล่า/ไดอารี่",
  "สัพเพเหระ",
  "วรรณกรรมเยาวชน",
];

const coreBookCategories = [
  "นิยาย",
  "ความรู้",
  "ธุรกิจ",
  "เทคโนโลยี",
  "ภาษา",
  "สุขภาพ",
  "เด็กและเยาวชน",
  "วรรณกรรม",
  "แฟนตาซี",
  "โรแมนซ์",
  "ไซไฟ",
  "พัฒนาตนเอง",
];

const seedCategories = [
  ...serialBookCategories,
  ...coreBookCategories.filter((name) => !serialBookCategories.includes(name)),
];

function getCategoryScope(name) {
  if (serialBookCategories.includes(name)) return "serial";
  return "all";
}

module.exports = {
  coreBookCategories,
  getCategoryScope,
  seedCategories,
  serialBookCategories,
};
