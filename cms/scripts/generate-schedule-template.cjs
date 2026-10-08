const fs = require('fs');

const teachers = {
  angl: ['Англійська мова', 'Ніколаєць Наталія Олегівна'],
  inf: ['Інформатика', 'Косачев Владислав Петрович'],
  muz: ['Музика', 'Батухно Олександр'],
  fra: ['Фізкультура', 'Осипенко Роман Миколайович'],
  zld: ['Зарубіжна література', 'Дяченко Наталія Костянтинівна'],
  zll: ['Зарубіжна література', 'Лєщенко Світлана Петрівна'],
  uld: ['Українська література', 'Дяченко Наталія Костянтинівна'],
  ull: ['Українська література', 'Лєщенко Світлана Петрівна'],
  umd: ['Українська мова', 'Дяченко Наталія Костянтинівна'],
  uml: ['Українська мова', 'Лєщенко Світлана Петрівна'],
  maty: ['Математика', 'Єрмошина Тетяна Олегівна'],
  matp: ['Математика', 'Прядко Оксана Володимирівна'],
  matr: ['Математика', 'Ракута Вікторія Миколаївна'],
  geo: ['Географія', 'Дегтяр Олександр Леонідович'],
  istl: ['Історія України', 'Луценко Наталія Олександрівна'],
  istd: ['Історія України', 'Дегтяр Олександр Леонідович'],
  vsl: ['Всесвітня історія', 'Луценко Наталія Олександрівна'],
  vsd: ['Всесвітня історія', 'Дегтяр Олександр Леонідович'],
  fiz: ['Фізика', 'Єрмошина Тетяна Олегівна'],
  bio: ['Біологія', 'Нізіна Тамара Миколаївна'],
  him: ['Хімія', 'Нізіна Тамара Миколаївна'],
  priro: ['Природознавство', 'Нізіна Тамара Миколаївна'],
  tehn: ['Технології', 'Кармазін Юрій'],
  oz: ['Охорона здоров’я', 'Кармазін Юрій'],
  myst: ['Мистецтво', 'Шпилевська Олена Іванівна'],
};
const d = {пн:'Понеділок',вт:'Вівторок',ср:'Середа',чт:'Четвер',пт:'П’ятниця'};
const raw = `
пн|5:1 fra,2 zld,3 uld,4 maty,5 angl,6 tehn
пн|6:1 matr,2 geo,3 uml,4 istl
пн|7:1 geo,2 fiz,3 matr,4 tehn,5 uld,6 bio,7 oz
пн|8:1 uml,2 tehn,3 geo,4 istd,5 maty,6 fiz,7 him
пн|9:5 him,6 matp,7 geo,8 istl,9 uml,10 ull
пн|11:1 uld,2 matr,3 fra,4 bio,5 tehn,6 angl,7 fiz
пн|1:3 angl
пн|2:2 angl
пн|3:1 angl
пн|4:4 angl
вт|5:1 priro,2 inf,3 maty,4 angl,5 myst,6 umd
вт|6:1 uml,2 priro,3 matp,4 zll,5 angl,6 uml
вт|7:1 umd,2 uld,3 matr,4 matr,5 inf,6 bio,7 angl
вт|8:7 oz,8 maty,9 angl,10 inf,11 uml,12 zll
вт|9:1 priro,2 matp,3 bio,4 fiz,5 matp,6 angl,7 uml
вт|11:1 inf,2 matr,3 umd,4 uld,5 fiz,6 him
вт|3:3 inf
вт|4:6 inf
ср|5:1 istl,2 umd,3 maty,4 maty,5 angl
ср|6:1 inf,2 uml,3 matp,4 uml,5 fra,6 angl
ср|7:6 matr,7 zld,8 uld,9 angl,10 istl,11 him
ср|8:1 uml,2 maty,3 angl,4 bio,5 zll,6 myst,7 him,8 fra
ср|9:1 matp,2 matp,3 inf,4 fra,5 vsl,6 fiz,7 myst
ср|11:1 uld,2 matr,3 fra,4 vsl,5 him,6 istl,7 fiz
ср|1:2 angl
ср|2:2 inf
ср|3:4 angl
ср|4:6 angl
чт|5:1 priro,2 uld,3 zld,4 maty,5 umd
чт|6:1 geo,2 istl,3 matp,4 matp,5 priro,6 myst,7 zll
чт|7:1 vsl,2 matr,3 geo,4 bio,5 fiz
чт|8:1 uml,2 vsl,3 maty,4 geo,5 istd,6 uml,7 fra
чт|9:1 angl,2 uml,3 bio,4 uml,5 fra,6 geo,7 him
чт|11:6 angl,7 matr,8 umd,9 umd,10 bio,11 geo,12 zld
чт|1:2 angl
чт|2:4 angl
чт|3:5 angl
чт|4:3 angl
пт|5:1 maty,2 umd,3 inf
пт|6:1 uml,2 matp,3 angl
пт|7:1 inf,2 matr,3 fra,4 zld,5 angl,6 umd,7 muz
пт|8:4 angl,5 maty,6 inf,7 maty,8 bio
пт|9:4 matp,5 zll,6 bio,7 angl,8 inf,9 fiz
пт|11:1 umd,2 tehn,3 matr,4 fra,5 umd,6 fiz,7 him
пт|1:1 muz
пт|2:2 muz
пт|3:3 muz
пт|4:4 muz,7 inf`;
const rows = ['className,weekday,lessonNumber,subject,teacher,room'];
for (const line of raw.trim().split(/\n/)) {
  const [day, rest] = line.split('|');
  const [className, lessons] = rest.split(':');
  for (const entry of lessons.split(',')) {
    const [n, code] = entry.trim().split(/\s+/);
    const [subject, teacher] = teachers[code];
    rows.push(`${className} Клас,${d[day]},${n},${subject},${teacher},`);
  }
}
fs.writeFileSync('cms/schedule-template.csv', rows.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length - 1} schedule rows`);
