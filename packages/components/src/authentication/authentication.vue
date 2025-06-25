<script setup lang="ts">
import type { ToolbarType } from './types'

interface Props {
  appName?: string
  logo?: string
  pageTitle?: string
  pageDescription?: string
  sloganImage?: string
  toolbar?: boolean
  copyright?: boolean
  toolbarList?: ToolbarType[]
  clickLogo?: () => void
}

withDefaults(defineProps<Props>(), {
  appName: '',
  copyright: true,
  logo: '',
  pageDescription: '',
  pageTitle: '',
  sloganImage: '',
  toolbar: true,
  toolbarList: () => ['color', 'language', 'layout', 'theme'],
  clickLogo: () => {}
})
</script>

<template>
  <div class="flex min-h-full flex-1 select-none overflow-x-hidden">
    <RouterView v-slot="{ Component, route }">
      <Transition appear mode="out-in" name="slide-right">
        <KeepAlive :include="['Login']">
          <component
            :is="Component"
            :key="route.fullPath"
            class="enter-x mt-6 w-full sm:mx-auto md:max-w-md"
          />
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>
