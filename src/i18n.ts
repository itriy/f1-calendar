import { createI18n } from 'vue-i18n'

const messages = {
  uk: {
    common: {
      unknownDate: 'Дата уточнюється',
      retry: 'Повторити',
      points: 'очок',
      season: 'СЕЗОН',
      winner: 'ПЕРЕМОЖЕЦЬ',
      loading: 'Завантажуємо…'
    },
    app: {
      calendar: 'Календар',
      formulaOne: 'ФОРМУЛА 1',
      headlineStart: 'Тримай руку',
      headlineMiddle: 'на',
      headlineEmphasis: 'пульсі',
      headlineEnd: 'гонки.',
      intro: 'Актуальний розклад і лідери чемпіонату Формули 1 — в одному місці.',
      nextRound: 'НАСТУПНИЙ ЕТАП',
      nextRace: 'НАСТУПНА ГОНКА',
      loading: 'Завантажуємо актуальні дані Jolpica-F1…',
      nextRaceTime: 'до старту за місцевим часом',
      nextRaceTimeUnknown: 'час старту ще не оголошено',
      seasonFinished: 'Сезон {season} завершено — майбутніх етапів у календарі немає.',
      liveDataTitle: 'Живі дані Jolpica-F1.',
      liveDataDescription: 'Календар і таблиці завантажуються у браузері з відкритого API під час кожного відкриття сторінки. Дані можуть оновлюватися із затримкою.',
      footer: 'Незалежний неофіційний трекер Формули 1',
      roundsRemaining: 'Залишилось: {rounds} {label}',
      round: 'етап',
      rounds: 'етапів',
      seasonComplete: 'Сезон завершено',
      startUnknown: 'Час старту уточнюється',
      startPassed: 'Старт уже відбувся',
      countdownDays: 'Через {days} дн. {hours} год.',
      countdownHours: 'Через {hours} год. {minutes} хв.'
    },
    calendar: { eyebrow: 'КАЛЕНДАР · JOLPICA-F1', title: 'Наступні гонки', updated: 'Оновлено {time}', round: 'етап', nextRace: 'НАСТУПНА ГОНКА', empty: 'Наступних гонок у календарі немає.' },
    standings: { eyebrow: 'ЧЕМПІОНАТ · JOLPICA-F1', title: 'Лідери', drivers: 'Пілоти', constructors: 'Команди', position: 'ПОЗ.', participant: 'УЧАСНИК', points: 'ОЧКИ', empty: 'Таблиця ще недоступна.' },
    chances: { eyebrow: 'МОДЕЛЬ · JOLPICA-F1', title: 'Шанси на титул', description: 'Детермінована оцінка застосунку: поточний відрив, {rounds} {roundLabel} та максимум {points} очок за гонку. Це не офіційний прогноз і не букмекерські коефіцієнти.', gap: '−{points} очок', finished: 'Сезон завершено — модель шансів більше не розраховується.', empty: 'Недостатньо даних для розрахунку моделі.', round: 'етап', rounds: 'етапів' },
    lastRace: { eyebrow: 'РЕЗУЛЬТАТИ · JOLPICA-F1', title: 'Останній етап', loading: 'Завантажуємо результати останньої гонки…', time: 'Час: {time}', allScorers: 'УСІ ПІЛОТИ З ОЧКАМИ', gap: 'ВІДСТАВАННЯ', empty: 'У Jolpica немає пілотів з нарахованими очками для цього етапу.' },
    history: { eyebrow: 'АРХІВ · JOLPICA-F1', title: 'Історія етапів', currentDescription: 'Усі вже завершені гонки сезону. Останній етап деталізовано окремою карткою вище.', description: 'Усі завершені гонки сезону {season} та їхні переможці.', driverLeader: 'ЛІДЕР ПІЛОТІВ', driverChampion: 'ЧЕМПІОН ПІЛОТІВ', constructorLeader: 'ЛІДЕР КОМАНД', constructorChampion: 'ЧЕМПІОН КОМАНД', summaryLoading: 'Завантажуємо підсумок…', summaryUnavailable: 'Підсумок недоступний.', loading: 'Завантажуємо історію завершених етапів…', winnerMissing: 'Переможця не вказано', podium: 'ПОДІУМ · ВІДСТАВАННЯ ВІД ПЕРЕМОЖЦЯ', detailsLoading: 'Завантажуємо класифікацію етапу…', detailsUnavailable: 'Класифікація етапу недоступна.', collapse: 'ЗГОРНУТИ АРХІВ', showMore: 'ПОКАЗАТИ ЩЕ {count}', currentEmpty: 'Завершених етапів у поточному сезоні поки немає.', empty: 'Для сезону {season} завершених етапів не знайдено.' },
    aiSearch: { eyebrow: 'AI-ПОШУК · GEMINI', title: 'Запитай про автоспорт', description: 'Короткі відповіді про F1, F2, F3, WEC та автоспорт із веб-джерелами й Wikipedia.', label: 'Запит про автоспорт', placeholder: 'Наприклад: хто виграв Гран-прі Монако 2025?', submit: 'Шукати', loading: 'Шукаємо…', validation: 'Введіть щонайменше 3 символи.', error: 'Не вдалося виконати AI-пошук.', answer: 'ВІДПОВІДЬ', sources: 'ДЖЕРЕЛА З ІНТЕРНЕТУ', wikipedia: 'WIKIPEDIA' },
    teamBadge: { unknown: 'невідома', unknownTitle: 'Невідома команда', label: 'Команда: {team}' },
    wikiLink: { ariaLabel: '{label}: відкрити сторінку Вікіпедії в новій вкладці', title: 'Відкрити сторінку Вікіпедії: {label}' }
  }
}

export const i18n = createI18n({ legacy: false, locale: 'uk', fallbackLocale: 'uk', messages })
