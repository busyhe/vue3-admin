<script setup lang="ts">
import { Loading } from '@admin/components'

import { ref } from 'vue'

const msg = ref('Hello World')
</script>

<template>
  <Loading />
  <div class="mx-auto max-w-md text-3xl font-bold">{{ msg }}</div>
</template>
