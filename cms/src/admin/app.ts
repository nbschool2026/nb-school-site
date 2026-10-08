import { Calendar } from '@strapi/icons';

export default {
  register(app) {
    app.addMenuLink({
      to: '/schedule-import',
      icon: Calendar,
      intlLabel: { id: 'schedule-import.menu', defaultMessage: 'Імпорт розкладу' },
      Component: async () => import('./pages/ScheduleImport'),
    });
  },
  config: {
    locales: ['uk', 'en'],
    translations: {
      uk: {
        'HomePage.header.title': 'Вітаємо, {name}',
        'HomePage.header.subtitle': 'Ласкаво просимо до панелі керування',
        'HomePage.widget.loading': 'Завантаження вмісту віджета',
        'HomePage.widget.error': 'Не вдалося завантажити вміст віджета.',
        'HomePage.widget.no-data': 'Вміст не знайдено.',
        'HomePage.widget.no-permissions': 'У вас немає доступу до цього віджета',
        'HomePage.addWidget.title': 'Додати віджет',
        'HomePage.addWidget.noWidgetsAvailable': 'Немає доступних віджетів',
        'HomePage.addWidget.button': 'Додати віджет',
        'HomePage.widget.delete': 'Видалити',
        'HomePage.widget.drag': 'Перетягніть, щоб перемістити',
        'HomePage.widget.deploy-now.title': 'Готові опублікувати сайт?',
        'HomePage.widget.deploy-now.description': 'Розгорніть сайт через Strapi Cloud',
        'HomePage.widget.deploy-now.button': 'Розгорнути',
      },
    },
  },
  bootstrap() {
    // Strapi 5.56 reads this browser preference before rendering the admin UI.
    const key = 'strapi-admin-language';
    const browser = globalThis as typeof globalThis & {
      localStorage?: { getItem(name: string): string | null; setItem(name: string, value: string): void };
    };
    if (browser.localStorage && !browser.localStorage.getItem(key)) {
      browser.localStorage.setItem(key, 'uk');
    }
  },
};
