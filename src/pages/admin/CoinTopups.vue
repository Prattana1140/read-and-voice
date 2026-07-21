<script setup lang="ts">
import PaymentApprovalList from "../../components/admin/PaymentApprovalList.vue";
</script>

<template>
  <PaymentApprovalList
    type-filter="coin_topup"
    title="อนุมัติรายการเติมเหรียญ"
    description="ตรวจสอบรายการโอน PromptPay หรือการเติมเหรียญที่รอแอดมินยืนยัน เมื่ออนุมัติแล้วระบบจะเติมเหรียญเข้ากระเป๋าผู้ใช้ทันที"
    empty-text="ไม่มีรายการเติมเหรียญในสถานะนี้"
  />
</template>
