<script setup lang="ts">
import { ref } from 'vue'

const msg = ref('Hello World')
</script>

<template>
  <div class="mx-auto max-w-md text-3xl font-bold">{{ msg }}</div>
</template>
