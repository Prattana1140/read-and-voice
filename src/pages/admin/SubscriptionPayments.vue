<script setup lang="ts">
import PaymentApprovalList from "../../components/admin/PaymentApprovalList.vue";
</script>

<template>
  <PaymentApprovalList
    type-filter="subscription"
    title="อนุมัติแพ็กเกจสมาชิก"
    description="ตรวจรายการสมัครหรือชำระแพ็กเกจสมาชิกที่รอการยืนยัน เมื่ออนุมัติแล้วระบบจะเปิดสถานะสมาชิกให้บัญชีนั้น"
    empty-text="ไม่มีรายการแพ็กเกจสมาชิกที่ต้องอนุมัติในสถานะนี้"
  />
</template>
