(function () {
  const apiBase = ((window.SCHOOL_CMS_CONFIG || {}).apiBase || 'http://localhost:1337/api').replace(/\/$/, '');
  const mediaBase = apiBase.replace(/\/api$/, '');
  const target = document.querySelector('[data-school-image]');
  const principal = document.querySelector('[data-principal-image]');
  const staffImages = document.querySelectorAll('[data-staff-image]');
  const gallery = document.querySelector('[data-gallery-images]');
  if (!target && !principal && !staffImages.length && !gallery) return;

  function url(file) {
    if (!file?.url) return '';
    return file.url.startsWith('http') ? file.url : mediaBase + file.url;
  }

  if (target) {
    fetch(`${apiBase}/school-profile?populate[0]=heroImage&populate[1]=aboutImage`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        const file = result?.data?.[target.dataset.schoolImage];
        const image = url(file);
        if (image) target.style.backgroundImage = `${target.dataset.overlay}, url("${image}")`;
      }).catch(() => {});
  }

  if (principal || staffImages.length) {
    fetch(`${apiBase}/staff-members?populate[0]=photo&populate[1]=homepagePhoto&sort=order:asc&pagination[pageSize]=100`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        const staff = result?.data || [];
        if (principal) {
          const image = url(staff[0]?.homepagePhoto || staff[0]?.photo);
          if (image) principal.src = image;
        }
        staffImages.forEach((element) => {
          const member = staff[Number(element.dataset.staffImage)];
          const image = url(member?.photo);
          if (image) {
            element.src = image;
            element.alt = member.name || 'Працівник ліцею';
            element.hidden = false;
          }
        });
      }).catch(() => {});
  }

  if (gallery) {
    fetch(`${apiBase}/gallery-items?populate=image&sort=order:asc&pagination[pageSize]=100`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        for (const item of result?.data || []) {
          const image = url(item.image);
          if (!image) continue;
          const frame = document.createElement('div');
          frame.className = 'aspect-square rounded-lg overflow-hidden bg-slate-200';
          const picture = document.createElement('img');
          picture.className = 'w-full h-full object-cover';
          picture.src = image;
          picture.alt = item.alt || item.title || 'Шкільне життя';
          frame.appendChild(picture);
          gallery.appendChild(frame);
        }
      }).catch(() => {});
  }
})();
