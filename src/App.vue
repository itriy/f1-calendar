<script setup>
import { computed, ref } from 'vue'

const activeTable = ref('drivers')
const races = [
  { round: '14', date: '28–30 серпня', name: 'Гран-прі Нідерландів', place: 'Зандворт', flag: '🇳🇱', status: 'Наступна гонка' },
  { round: '15', date: '4–6 вересня', name: 'Гран-прі Італії', place: 'Монца', flag: '🇮🇹' },
  { round: '16', date: '18–20 вересня', name: 'Гран-прі Азербайджану', place: 'Баку', flag: '🇦🇿' },
  { round: '17', date: '9–11 жовтня', name: 'Гран-прі Сінгапуру', place: 'Марина-Бей', flag: '🇸🇬' }
]
const drivers = [
  { pos: 1, name: 'Оскар Піастрі', team: 'McLaren', points: 284, code: 'PIA', color: '#ff8700' },
  { pos: 2, name: 'Ландо Норріс', team: 'McLaren', points: 275, code: 'NOR', color: '#ff8700' },
  { pos: 3, name: 'Макс Ферстаппен', team: 'Red Bull Racing', points: 187, code: 'VER', color: '#3671c6' },
  { pos: 4, name: 'Джордж Расселл', team: 'Mercedes', points: 172, code: 'RUS', color: '#27f4d2' },
  { pos: 5, name: 'Шарль Леклер', team: 'Ferrari', points: 151, code: 'LEC', color: '#e8002d' }
]
const constructors = [
  { pos: 1, name: 'McLaren', team: 'Піастрі / Норріс', points: 559, code: 'MCL', color: '#ff8700' },
  { pos: 2, name: 'Ferrari', team: 'Леклер / Гамільтон', points: 260, code: 'FER', color: '#e8002d' },
  { pos: 3, name: 'Mercedes', team: 'Расселл / Антонеллі', points: 236, code: 'MER', color: '#27f4d2' },
  { pos: 4, name: 'Red Bull Racing', team: 'Ферстаппен / Цунода', points: 194, code: 'RBR', color: '#3671c6' },
  { pos: 5, name: 'Williams', team: 'Сайнс / Албон', points: 70, code: 'WIL', color: '#64c4ff' }
]
const standings = computed(() => activeTable.value === 'drivers' ? drivers : constructors)
</script>

<template>
  <main>
    <nav class="nav shell">
      <a class="brand" href="#top" aria-label="F1 Calendar"><span>F1</span> CALENDAR</a>
      <div class="season">СЕЗОН <b>2026</b></div>
      <a class="schedule" href="#calendar">Календар <span>↗</span></a>
    </nav>

    <section id="top" class="hero shell">
      <div>
        <p class="eyebrow"><i></i> Формула 1 · 2026</p>
        <h1>Тримай руку<br />на <em>пульсі</em> гонки.</h1>
        <p class="intro">Розклад, лідери чемпіонату та все важливе зі світу Формули 1 — в одному місці.</p>
      </div>
      <div class="hero-stat">
        <span>НАСТУПНИЙ ЕТАП</span>
        <strong>14</strong>
        <small>з 24</small>
        <div></div>
        <b>28 СЕРПНЯ</b>
      </div>
    </section>

    <section class="shell race-banner">
      <div class="flag">🇳🇱</div>
      <div class="race-info"><p>НАСТУПНА ГОНКА</p><h2>Гран-прі Нідерландів</h2><span>Зандворт · 28–30 серпня</span></div>
      <div class="countdown"><b>05</b><span>днів</span><b>18</b><span>годин</span><b>42</b><span>хвилин</span></div>
      <button>Розклад вікенду <span>→</span></button>
    </section>

    <section class="shell content-grid">
      <div id="calendar" class="panel races-panel">
        <div class="section-title"><div><p>КАЛЕНДАР</p><h2>Наступні гонки</h2></div><a href="#calendar">Увесь календар →</a></div>
        <article v-for="race in races" :key="race.round" class="race-row" :class="{next: race.status}">
          <div class="round">{{ race.round }}<small>етап</small></div>
          <div class="race-flag">{{ race.flag }}</div>
          <div class="race-name"><b>{{ race.name }}</b><span>{{ race.place }}</span></div>
          <div class="race-date">{{ race.date }}<small v-if="race.status">{{ race.status }}</small></div>
          <span class="arrow">→</span>
        </article>
      </div>

      <aside class="panel standings-panel">
        <div class="section-title"><div><p>ЧЕМПІОНАТ</p><h2>Лідери</h2></div></div>
        <div class="tabs"><button :class="{active: activeTable === 'drivers'}" @click="activeTable = 'drivers'">Пілоти</button><button :class="{active: activeTable === 'constructors'}" @click="activeTable = 'constructors'">Команди</button></div>
        <div class="table-head"><span>ПОЗ.</span><span>УЧАСНИК</span><span>ОЧКИ</span></div>
        <div v-for="item in standings" :key="item.code" class="standing-row">
          <b class="position">{{ item.pos }}</b><span class="team-dot" :style="{background: item.color}"></span>
          <div><b>{{ item.name }}</b><small>{{ item.team }}</small></div><strong>{{ item.points }}</strong>
        </div>
        <a class="all-link" href="#standings">Повна таблиця →</a>
      </aside>
    </section>

    <section class="shell note"><span>i</span><p><b>Демо-дані.</b> Показники та календар тут наведені для демонстрації інтерфейсу. Для актуальних результатів підключіть API (наприклад, Jolpica F1 API) у <code>src/App.vue</code>.</p></section>
    <footer class="shell"><span><b>F1</b> CALENDAR</span><small>Незалежний неофіційний трекер Формули 1</small><small>© 2026</small></footer>
  </main>
</template>
