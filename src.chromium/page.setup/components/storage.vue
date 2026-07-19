<template lang="pug">
.Settings
  section(ref="el")
    h2
      span {{translate('settings.storage_title')}}
      .title-note   (~{{SetupPage.reactive.storageOveral}})
    span.header-shadow
    .storage-section
      .storage-prop(v-for="info in SetupPage.reactive.storageProps" @click="openStoredData(info.name)")
        .name {{info.name}}
        .len(v-if="info.len") ({{info.len}})
        .size ~{{info.sizeStr}}
        .btn.-warn(@click.stop="deleteStoredData(info.name)") {{translate('settings.storage_delete_prop')}}

    .ctrls
      .btn(@click="SetupPage.calcStorageInfo") {{translate('settings.update_storage_info')}}
      .btn.-warn(@click="clearStorage") {{translate('settings.clear_storage_info')}}

    .storage-section(v-if="SetupPage.reactive.faviconsCache.length")
      .sub-title: .text {{translate('settings.favs_title')}}
      .favs
        .fav(v-for="fav in SetupPage.reactive.faviconsCache" :key="fav.tooltip" :title="fav.tooltip")
          img(:src="fav.favicon")

    .ctrls(v-if="SetupPage.reactive.faviconsCache.length")
      .btn(@click="SetupPage.calcStorageInfo") {{translate('settings.update_storage_info')}}
      .btn.-warn(@click="clearFaviconsCache") {{translate('settings.clear_favicons_cache')}}

  FooterSection
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { translate } from 'src/dict'
import type { Stored } from 'src/types'
import * as Store from 'src/services/storage.fg'
import * as Logs from 'src/services/logs'
import * as SetupPage from 'src/services/setup-page.fg'
import FooterSection from './footer-section.vue'

const el = ref<HTMLElement | null>(null)

onMounted(() => {
  SetupPage.registerEl('settings_storage', el.value)
})

async function openStoredData(prop: string): Promise<void> {
  let stored
  try {
    stored = await browser.storage.local.get<Stored>(prop)
  } catch (err) {
    SetupPage.reactive.detailsTitle = 'Error: Cannot get value'
    SetupPage.reactive.detailsText = String(err)
    return
  }
  if (stored && stored[prop as keyof Stored] !== undefined) {
    SetupPage.reactive.detailsMode = 'view'
    SetupPage.reactive.detailsTitle = prop
    SetupPage.reactive.detailsText = JSON.stringify(stored[prop as keyof Stored], null, 2)
    SetupPage.reactive.detailsEdit = (newValue: string) => {
      let json
      try {
        json = JSON.parse(newValue) as unknown
      } catch (err) {
        return Logs.err('Settings.Storage: Cannot parse json', err)
      }

      Store.set({ [prop]: json })
    }
  }
}

async function deleteStoredData(prop: keyof Stored): Promise<void> {
  if (!window.confirm(translate('settings.storage_delete_confirm') + `"${prop}"?`)) return

  try {
    await browser.storage.local.remove(prop)
  } catch (err) {
    return Logs.err('deleteStoredData: Cannot remove value', err)
  }
  SetupPage.updStorageInfo(prop)

  if (prop === 'snapshots') SetupPage.snapshotsViewer.refresh?.([])
}

async function clearStorage(): Promise<void> {
  if (!window.confirm(translate('settings.clear_storage_confirm'))) return

  try {
    await browser.storage.local.clear()
  } catch (err) {
    return Logs.err('clearStorage: Cannot clean storage', err)
  }
  browser.runtime.reload()
}

async function clearFaviconsCache(): Promise<void> {
  if (!window.confirm(translate('settings.clear_favicons_cache_confirm'))) return

  try {
    await browser.storage.local.remove([
      'favDomains',
      'favHashes',
      'favicons_01',
      'favicons_02',
      'favicons_03',
      'favicons_04',
      'favicons_05',
    ])
  } catch (err) {
    return Logs.err('clearStorage: Cannot clean favicons', err)
  }
  browser.runtime.reload()
}
</script>
