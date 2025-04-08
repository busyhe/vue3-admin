<script lang="ts" setup>
interface LoadingProps {
  class?: string
  minLoadingTime?: number
  spinning?: boolean
  text?: string
}

defineOptions({ name: 'Loading' })

const props = defineProps<LoadingProps>()
</script>
<template>
  <div>
    loading
    <slot></slot>
  </div>
</template>
