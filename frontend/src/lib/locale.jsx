import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const LocaleContext = createContext(null);

const english = {
  'Головна': 'Home', 'Про нас': 'About', 'Події': 'Events', 'Публічна інформація': 'Public information',
  'Дистанційне навчання': 'Distance learning', 'Матеріали дистанційного навчання': 'Distance learning materials',
  'Матеріали, теми та завдання для учнів за класами й предметами.': 'Materials, topics and assignments for students by grade and subject.',
  'Усі класи': 'All grades', 'Пошук за темою або завданням': 'Search by topic or assignment',
  'Завантаження матеріалів…': 'Loading materials…', 'Не вдалося завантажити матеріали з CMS.': 'Could not load materials from the CMS.', 'Показати більше': 'Show more',
  'Матеріалів за цими умовами не знайдено.': 'No materials match these filters.', 'Відкрити відео': 'Open video',
  'Мова': 'Language', 'Відкрити меню': 'Open menu', 'Закрити меню': 'Close menu',
  'Всі права захищені.': 'All rights reserved.',
  'Новобілоуський ліцей': 'Novobilouskyi Lyceum',
  'Відкрити нашу програму': 'Explore our curriculum', 'Віртуальний тур': 'Virtual tour',
  'Останні новини': 'Latest news', 'Завантаження подій…': 'Loading events…',
  'Не вдалося завантажити події з CMS.': 'Could not load events from the CMS.',
  'Подій поки немає.': 'No events yet.', 'Всі події': 'All events',
  'Навчання': 'Learning', 'Розклад уроків': 'Class schedule',
  'Клас': 'Class', 'Оберіть клас': 'Choose a class', 'Предмет': 'Subject',
  'Всі предмети': 'All subjects', 'Вчитель': 'Teacher', 'Всі вчителі': 'All teachers',
  'Математика': 'Mathematics', 'Фізика': 'Physics', 'Українська мова': 'Ukrainian language',
  'Історія': 'History', 'Англійська': 'English', 'Фізкультура': 'Physical education',
  'Біологія': 'Biology',
  '1 Клас': 'Grade 1', '5 Клас': 'Grade 5', '9 Клас': 'Grade 9', '11 Клас': 'Grade 11',
  'Понеділок': 'Monday', 'Вівторок': 'Tuesday', 'Середа': 'Wednesday',
  'Четвер': 'Thursday', "П'ятниця": 'Friday',
  'Немає уроків': 'No lessons', 'Контакти': 'Contacts',
  'Завантаження контактів…': 'Loading contacts…',
  'Не вдалося завантажити контакти з CMS.': 'Could not load contacts from the CMS.',
  'Контакти ще не додано.': 'Contact details have not been added yet.',
  'Адреса': 'Address', 'Номер телефону': 'Phone number', 'Електронна пошта': 'Email',
  'Графік роботи': 'Opening hours',
  'Завантаження сторінки «Про нас»…': 'Loading the About page…',
  'Не вдалося завантажити сторінку «Про нас» із CMS.': 'Could not load the About page from the CMS.',
  'Про Наш Ліцей': 'About our lyceum', 'Наша історія': 'Our history',
  'Історію закладу ще не додано.': 'The school history has not been added yet.',
  'Наші цінності': 'Our values', 'Цінності ще не додано.': 'Values have not been added yet.',
  'Адміністрація': 'Administration',
  'Вчителі та адміністрація': 'Teachers and administration',
  'Інформацію про працівників ще не додано.': 'Staff information has not been added yet.',
  'Категорії': 'Categories', 'Усі події': 'All events', 'Академічні': 'Academic',
  'Спорт': 'Sports', 'Мистецтво': 'Arts', 'Вступ': 'Admissions',
  'Громада': 'Community', 'Подія': 'Event', 'Читати далі': 'Read more',
  'Попередній місяць': 'Previous month', 'Наступний місяць': 'Next month',
  'Скинути місяць': 'Clear month', 'Показати цей місяць': 'Show this month',
  'Скинути вибраний місяць': 'Clear selected month', 'Наші події': 'Our events',
  'Дізнайтеся про майбутні заходи, академічні конкурси, спортивні змагання та культурне життя нашого ліцею.': 'Discover upcoming activities, academic competitions, sports events, and cultural life at our lyceum.',
  'Не вдалося завантажити події з CMS. Перевірте, чи запущена адмінка, і оновіть сторінку.': 'Could not load events from the CMS. Check that the CMS is running and refresh the page.',
  'Подій не знайдено': 'No events found', 'Завантаження події…': 'Loading event…',
  'Не вдалося завантажити подію. Спробуйте оновити сторінку.': 'Could not load the event. Try refreshing the page.',
  'Подію не знайдено.': 'Event not found.', 'Попереднє фото': 'Previous photo',
  'Наступне фото': 'Next photo', 'Відео': 'Video', 'фото': 'photo',
  'Прозорість та звітність': 'Transparency and accountability',
  'Пошук': 'Search', 'Пошук у публічній інформації': 'Search public information',
  'Категорія': 'Category', 'Усі категорії': 'All categories',
  'За цими умовами документів не знайдено.': 'No documents match these filters.',
  'Відповідно до законодавства України, ми забезпечуємо відкритий доступ до офіційної документації та звітності нашого ліцею.': 'In accordance with Ukrainian law, we provide open access to official documents and reports of our lyceum.',
  'Залишилися питання?': 'Have questions?',
  'Якщо ви не знайшли потрібну інформацію, ви можете надіслати офіційний запит до адміністрації.': 'If you cannot find the information you need, you can send an official request to the administration.',
  'Надіслати запит': 'Send a request', 'Завантажити PDF': 'Download PDF',
  'Переглянути': 'View', 'Переклад ще не додано': 'English translation is not available yet',
  'Завантажити оригінал': 'Download original', 'Файл ще не додано.': 'File has not been added yet.',
  'PDF-копія для перегляду ще не готова.': 'The PDF preview is not ready yet.',
  'Завантаження документів…': 'Loading documents…', 'Не вдалося завантажити документи з CMS.': 'Could not load documents from the CMS.',
  'Документів поки немає.': 'No documents yet.', 'Перегляд документа': 'Document preview',
  'Закрити перегляд': 'Close preview',
  'Показано українською': 'Shown in Ukrainian',
};

export function LocaleProvider({ children }) {
  const location = useLocation();
  const [locale, updateLocale] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'uk' || fromUrl === 'en') return fromUrl;
    try { return localStorage.getItem('school-locale') === 'en' ? 'en' : 'uk'; }
    catch { return 'uk'; }
  });

  function setLocale(next) {
    updateLocale(next === 'en' ? 'en' : 'uk');
  }

  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('school-locale', locale); } catch { /* storage may be disabled */ }
    const url = new URL(window.location.href);
    if (url.searchParams.get('lang') !== locale) {
      url.searchParams.set('lang', locale);
      window.history.replaceState(window.history.state, '', url);
    }
  }, [locale, location.pathname, location.search]);

  useEffect(() => {
    const onBack = () => {
      const fromUrl = new URLSearchParams(window.location.search).get('lang');
      if (fromUrl === 'uk' || fromUrl === 'en') updateLocale(fromUrl);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (text) => locale === 'en' ? english[text] || text : text,
    dateLocale: locale === 'en' ? 'en-GB' : 'uk-UA',
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('LocaleProvider is missing');
  return context;
}
