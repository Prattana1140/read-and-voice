<script setup lang="ts">
import PaymentApprovalList from "../../components/admin/PaymentApprovalList.vue";
</script>

<template>
  <PaymentApprovalList
    type-filter="order"
    title="อนุมัติคำสั่งซื้อหนังสือและรายตอน"
    description="ใช้ตรวจคำสั่งซื้อที่ชำระผ่าน gateway หรือรายการที่ยังรอการยืนยัน เมื่ออนุมัติแล้วระบบจะเปิดสิทธิ์อ่านและเพิ่มหนังสือเข้าชั้นให้ผู้ใช้"
    empty-text="ยังไม่มีคำสั่งซื้อที่ต้องอนุมัติในสถานะนี้"
  />
</template>
