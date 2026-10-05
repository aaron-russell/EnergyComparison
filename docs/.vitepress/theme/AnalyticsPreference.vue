<script setup lang="ts">
import { onMounted, ref } from 'vue';

const key = 'energy-replay-analytics-opt-out';
const optedOut = ref(false);
const message = ref('');

function readPreference() {
  try {
    optedOut.value = document.cookie.split(';').some((cookie) => cookie.trim() === `${key}=true`);
  } catch {
    message.value = 'Your browser could not read the analytics preference.';
  }
}

function togglePreference() {
  try {
    const next = !optedOut.value;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = next
      ? `${key}=true; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
      : `${key}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    const saved = document.cookie.split(';').some((cookie) => cookie.trim() === `${key}=true`);
    if (saved !== next) throw new Error('Preference cookie was not saved');
    optedOut.value = next;
    message.value = next
      ? 'Cloudflare Web Analytics is off until you change this preference or it expires in one year.'
      : 'Cloudflare Web Analytics is on.';
  } catch {
    message.value = 'Your browser could not save this preference. Check its cookie settings.';
  }
}

onMounted(readPreference);
</script>

<template>
  <section class="analytics-preference" aria-labelledby="analytics-preference-title">
    <div>
      <h2 id="analytics-preference-title">Analytics preference</h2>
      <p>
        Cloudflare Web Analytics is used for aggregate site usage and performance. You can turn it
        off here. Your choice is saved for one year or until you change it.
      </p>
      <p v-if="message" class="analytics-preference__status" role="status" aria-live="polite">
        {{ message }}
      </p>
    </div>
    <button type="button" @click="togglePreference">
      {{ optedOut ? 'Allow analytics' : 'Turn off analytics' }}
    </button>
  </section>
</template>
