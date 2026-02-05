<template>
    <dl>
        <template
            v-for="(item, key) in data.items"
            :key="key"
        >
            <dt>{{ item.term }}</dt>
            <dd>{{ item.definition }}</dd>
        </template>
    </dl>
</template>

<script setup lang="ts">
    import { defineProps } from 'vue'
    import type { RelationNodeProps } from 'directus-extension-flexible-editor/content'

    defineProps<{
        id: RelationNodeProps['id']
        junction: RelationNodeProps['junction']
        collection: RelationNodeProps['collection']
        data?: RelationNodeProps['data']
    }>()
</script>
