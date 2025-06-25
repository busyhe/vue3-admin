<script lang="ts" setup>
import { computed } from 'vue'

import { AuthPageLayout } from '@admin/components'

const appName = computed(() => 'admin')
const logo = computed(() => '')
const clickLogo = () => {}
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    :page-description="''"
    :page-title="''"
    :click-logo="clickLogo"
  >
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
