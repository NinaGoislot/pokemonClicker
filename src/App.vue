<template>
  <Nav />
  <main>
    <router-view />
  </main>
  <Footer />
</template>

<script setup>
import Nav from './components/PageTag/Nav.vue'
import Footer from './components/PageTag/Footer.vue'
</script>