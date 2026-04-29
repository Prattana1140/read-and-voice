export type BookAccessType = "free" | "paid" | "subscription";
export type BookHeroDecision = "read" | "purchase" | "subscribe";

type BookAccessOptions = {
  accessType?: string | null;
  price?: number | null;
  hasActiveSubscription?: boolean;
};

export function normalizeBookAccessType(accessType?: string | null): BookAccessType {
  if (accessType === "paid" || accessType === "subscription") {
    return accessType;
  }

  return "free";
}

export function canOpenBookNow(options: BookAccessOptions): boolean {
  const accessType = normalizeBookAccessType(options.accessType);
  return accessType === "free" || (accessType === "subscription" && Boolean(options.hasActiveSubscription));
}

export function getBookHeroDecision(options: BookAccessOptions): BookHeroDecision {
  const accessType = normalizeBookAccessType(options.accessType);

  if (accessType === "subscription" && !options.hasActiveSubscription) {
    return "subscribe";
  }

  if (accessType === "paid") {
    return "purchase";
  }

  return "read";
}

export function getBookAccessPresentation(options: BookAccessOptions) {
  const accessType = normalizeBookAccessType(options.accessType);
  const price = Number(options.price || 0);
  const hasActiveSubscription = Boolean(options.hasActiveSubscription);

  if (accessType === "subscription") {
    return {
      label: "อ่านด้วยรายเดือน",
      priceLabel: hasActiveSubscription ? "แพ็กเกจกำลังใช้งาน" : "ต้องมีแพ็กเกจ",
      hint: hasActiveSubscription
        ? "บัญชีนี้มีแพ็กเกจรายเดือน สามารถเปิดอ่านได้"
        : "สมัครแพ็กเกจรายเดือนก่อนเพื่ออ่านเนื้อหานี้",
    };
  }

  if (accessType === "paid") {
    return {
      label: "ใช้คอยน์",
      priceLabel: `${price} คอยน์`,
      hint: "เติมคอยน์ให้พอ แล้วซื้อเพื่อปลดล็อกเนื้อหา",
    };
  }

  return {
    label: "อ่านฟรี",
    priceLabel: "0 คอยน์",
    hint: "เปิดอ่านและฟังเสียงได้ทันที",
  };
}
