let allData = null;
let currentCategory = "all";
let currentSearch = "";

// ЗАГРУЗКА JSON
async function loadData() {
  const res = await fetch('skins.json');
  allData = await res.json();
  renderSidebar();
  renderGallery();
}

// САЙДБАР
function renderSidebar() {
  const nav = document.getElementById('categories');
  nav.innerHTML = '';

  const totalSkins = allData.categories.reduce((sum, c) => sum + c.skins.length, 0);

  const allBtn = document.createElement('button');
  allBtn.innerHTML = `<span>📁 Все скины</span><span style="opacity:.6;font-size:.85em">${totalSkins}</span>`;
  allBtn.className = currentCategory === 'all' ? 'active' : '';
  allBtn.onclick = () => {
    currentCategory = 'all';
    document.getElementById('category-title').textContent = 'Все скины';
    renderSidebar();
    renderGallery();
  };
  nav.appendChild(allBtn);

  const icons = {
    police: '📁',
    mass: '📁',
    school: '📁',
    bandits: '📁',
    cooks: '📁',
    other: '📁'
  };

  allData.categories.forEach(cat => {
    const btn = document.createElement('button');
    const icon = icons[cat.id] || '📁';
    btn.innerHTML = `<span>${icon} ${cat.name}</span><span style="opacity:.6;font-size:.85em">${cat.skins.length}</span>`;
    btn.className = currentCategory === cat.id ? 'active' : '';
    btn.onclick = () => {
      currentCategory = cat.id;
      document.getElementById('category-title').textContent = cat.name;
      renderSidebar();
      renderGallery();
    };
    nav.appendChild(btn);
  });
}

// ПОЛУЧИТЬ СПИСОК СКИНОВ
function getSkins() {
  let list = [];
  if (currentCategory === 'all') {
    allData.categories.forEach(cat => {
      cat.skins.forEach(s => list.push({ ...s, category: cat.name }));
    });
  } else {
    const cat = allData.categories.find(c => c.id === currentCategory);
    if (cat) list = cat.skins.map(s => ({ ...s, category: cat.name }));
  }
  if (currentSearch) {
    list = list.filter(s => s.name.toLowerCase().includes(currentSearch.toLowerCase()));
  }
  return list;
}

// ГАЛЕРЕЯ
function renderGallery() {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  const skins = getSkins();

  if (skins.length === 0) {
    gallery.innerHTML = '<p style="color:#888;">Ничего не найдено 😢</p>';
    return;
  }

  skins.forEach(skin => {
    const card = document.createElement('div');
    card.className = 'skin-card';
    card.innerHTML = `
      <div class="skin-view" data-mode="2d"></div>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-actions">
        <a class="btn-download" href="skins/${encodeURIComponent(skin.file)}" download>Скачать PNG</a>
        <button class="btn-toggle">3D</button>
      </div>
    `;

    const view = card.querySelector('.skin-view');
    const toggleBtn = card.querySelector('.btn-toggle');
    const skinUrl = `skins/${encodeURIComponent(skin.file)}`;

    let viewer = null;

    function show2D() {
      if (viewer) { viewer.dispose(); viewer = null; }
      view.innerHTML = `<img src="${skinUrl}" alt="${skin.name}">`;
      view.dataset.mode = '2d';
      toggleBtn.textContent = '3D';
    }

    function show3D() {
      view.innerHTML = '';
      requestAnimationFrame(() => {
        const w = view.clientWidth || 200;
        const h = view.clientHeight || 200;
        viewer = new skinview3d.SkinViewer({
          width: w,
          height: h,
          skin: skinUrl
        });
        viewer.animation = new skinview3d.WalkingAnimation();
        viewer.animation.speed = 0.5;
        view.appendChild(viewer.canvas);
        view.dataset.mode = '3d';
        toggleBtn.textContent = '2D';
      });
    }

    show2D();

    toggleBtn.onclick = () => {
      if (view.dataset.mode === '2d') {
        show3D();
      } else {
        show2D();
      }
    };

    gallery.appendChild(card);
  });
}

// ПОИСК
document.getElementById('search').addEventListener('input', e => {
  currentSearch = e.target.value;
  renderGallery();
});

// СКАЧАТЬ КАТЕГОРИЮ (ZIP)
document.getElementById('download-all').addEventListener('click', async () => {
  const btn = document.getElementById('download-all');
  const skins = getSkins();

  if (skins.length === 0) {
    alert('В этой категории нет скинов');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = `⏳ Пакуем... 0/${skins.length}`;

  const zip = new JSZip();
  let loaded = 0;

  try {
    await Promise.all(skins.map(async skin => {
      const url = `skins/${encodeURIComponent(skin.file)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Не удалось загрузить: ${skin.file}`);
        return;
      }
      const blob = await res.blob();
      zip.file(skin.file, blob);
      loaded++;
      btn.textContent = `⏳ Пакуем... ${loaded}/${skins.length}`;
    }));

    const content = await zip.generateAsync({ type: 'blob' });

    // Имя архива
    let zipName = 'vsp-skins.zip';
    if (currentCategory !== 'all') {
      const cat = allData.categories.find(c => c.id === currentCategory);
      if (cat) zipName = `${cat.name}.zip`;
    }

    // Скачиваем
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = zipName;
    a.click();
    URL.revokeObjectURL(a.href);

    // Показываем модалку
    showInstruction();
  } catch (err) {
    console.error(err);
    alert('Ошибка при создании архива. Открой F12 → Console.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// МОДАЛКА
function showInstruction() {
  document.getElementById('instruction-modal').classList.remove('hidden');
}
function closeInstruction() {
  document.getElementById('instruction-modal').classList.add('hidden');
}

// Закрытие модалки по клику на фон и Esc
document.getElementById('instruction-modal').addEventListener('click', e => {
  if (e.target.id === 'instruction-modal') closeInstruction();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeInstruction();
});

loadData();