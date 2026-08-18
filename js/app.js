/**
 * Mathematical Nexus Collection - Main Application Logic
 * Inspired by Gabriel Peyré's Academic Nexus (gpeyre.com/mathematical-nexus)
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    projects: [],
    filteredProjects: [],
    currentProject: null,
    currentCitationStyle: 'apa',
    animFrameId: null,
    filters: {
      query: '',
      category: 'all',
      type: 'all',
      sort: 'recent'
    }
  };

  const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    brandLink: document.getElementById('brand-link'),
    nexusSearchInput: document.getElementById('nexus-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categorySelect: document.getElementById('category-select'),
    typeSelect: document.getElementById('type-select'),
    sortSelect: document.getElementById('sort-select'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    resultsCount: document.getElementById('results-count'),
    totalCount: document.getElementById('total-count'),
    nexusGrid: document.getElementById('nexus-grid'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    // Project Modal
    projectModal: document.getElementById('project-modal'),
    closeProjectModal: document.getElementById('close-project-modal'),
    modalChip: document.getElementById('modal-chip'),
    modalTitle: document.getElementById('modal-title'),
    modalSubtitle: document.getElementById('modal-subtitle'),
    modalAuthors: document.getElementById('modal-authors'),
    modalUni: document.getElementById('modal-uni'),
    modalYear: document.getElementById('modal-year'),
    modalDoi: document.getElementById('modal-doi'),
    modalMediaBox: document.getElementById('modal-media-box'),
    modalMathBox: document.getElementById('modal-math-box'),
    modalAbstractText: document.getElementById('modal-abstract-text'),
    modalTagsRow: document.getElementById('modal-tags-row'),
    modalPdfBtn: document.getElementById('modal-pdf-btn'),
    modalCodeBtn: document.getElementById('modal-code-btn'),
    modalCiteBtn: document.getElementById('modal-cite-btn'),

    // Cite Modal
    citeModal: document.getElementById('cite-modal'),
    closeCiteModal: document.getElementById('close-cite-modal'),
    citeTabs: document.querySelectorAll('.cite-tab'),
    citeTextarea: document.getElementById('cite-textarea'),
    copyCiteBtn: document.getElementById('copy-cite-btn'),

    // Toast
    toastMsg: document.getElementById('toast-msg')
  };

  init();

  async function init() {
    setupTheme();
    setupEventListeners();
    await loadData();
    populateCategoryDropdown();
    applyFilters();
  }

  // Load Dataset
  async function loadData() {
    let localData = [];
    try {
      localData = JSON.parse(localStorage.getItem('nexus_custom_projects') || '[]');
    } catch (e) {}

    try {
      const res = await fetch('data/publicaciones.json');
      const data = await res.json();
      const existingIds = new Set(data.map(p => p.id));
      const customFiltered = localData.filter(p => !existingIds.has(p.id));
      state.projects = [...customFiltered, ...data];
    } catch (err) {
      state.projects = localData;
    }

    elements.totalCount.textContent = state.projects.length;
  }

  // Theme Setup
  function setupTheme() {
    const saved = localStorage.getItem('nexus_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nexus_theme', next);
  }

  // Event Listeners
  function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);

    elements.nexusSearchInput.addEventListener('input', (e) => {
      state.filters.query = e.target.value.trim();
      elements.clearSearchBtn.hidden = !state.filters.query;
      applyFilters();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.nexusSearchInput.value = '';
      state.filters.query = '';
      elements.clearSearchBtn.hidden = true;
      applyFilters();
    });

    elements.categorySelect.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      applyFilters();
    });

    elements.typeSelect.addEventListener('change', (e) => {
      state.filters.type = e.target.value;
      applyFilters();
    });

    elements.sortSelect.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      applyFilters();
    });

    elements.shuffleBtn.addEventListener('click', () => {
      state.filteredProjects.sort(() => Math.random() - 0.5);
      renderGrid();
      showToast('🎲 Orden de investigación aleatorio');
    });

    elements.resetFiltersBtn.addEventListener('click', resetFilters);

    // Modals Close
    elements.closeProjectModal.addEventListener('click', () => closeModal(elements.projectModal));
    elements.closeCiteModal.addEventListener('click', () => closeModal(elements.citeModal));

    // Citation Tabs
    elements.citeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        elements.citeTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.currentCitationStyle = e.currentTarget.getAttribute('data-style');
        updateCitationText();
      });
    });

    elements.copyCiteBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.citeTextarea.value);
      showToast('¡Cita bibliográfica copiada!');
    });

    elements.modalCiteBtn.addEventListener('click', () => {
      closeModal(elements.projectModal);
      openModal(elements.citeModal);
      updateCitationText();
    });
  }

  // Populate Dropdown
  function populateCategoryDropdown() {
    const categories = [...new Set(state.projects.map(p => p.category))].sort();
    elements.categorySelect.innerHTML = '<option value="all">Todas las Áreas</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      elements.categorySelect.appendChild(opt);
    });
  }

  // Filter Logic
  function applyFilters() {
    let list = [...state.projects];

    if (state.filters.query) {
      const q = state.filters.query.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.authors.some(a => a.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.mathSnippet && p.mathSnippet.toLowerCase().includes(q))
      );
    }

    if (state.filters.category !== 'all') {
      list = list.filter(p => p.category === state.filters.category);
    }

    if (state.filters.type === 'pdf') {
      list = list.filter(p => !!p.pdfUrl);
    } else if (state.filters.type === 'code') {
      list = list.filter(p => !!p.codeUrl);
    } else if (state.filters.type === 'simulation') {
      list = list.filter(p => p.mediaType && p.mediaType.startsWith('canvas'));
    }

    if (state.filters.sort === 'recent') {
      list.sort((a, b) => b.year - a.year);
    } else if (state.filters.sort === 'citations') {
      list.sort((a, b) => (b.citations || 0) - (a.citations || 0));
    } else if (state.filters.sort === 'views') {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (state.filters.sort === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    state.filteredProjects = list;
    renderGrid();
  }

  function resetFilters() {
    state.filters.query = '';
    state.filters.category = 'all';
    state.filters.type = 'all';
    state.filters.sort = 'recent';

    elements.nexusSearchInput.value = '';
    elements.clearSearchBtn.hidden = true;
    elements.categorySelect.value = 'all';
    elements.typeSelect.value = 'all';
    elements.sortSelect.value = 'recent';

    applyFilters();
  }

  // Render Card Grid
  function renderGrid() {
    elements.resultsCount.textContent = state.filteredProjects.length;

    if (state.filteredProjects.length === 0) {
      elements.nexusGrid.innerHTML = '';
      elements.emptyState.classList.remove('hidden');
      return;
    }

    elements.emptyState.classList.add('hidden');
    elements.nexusGrid.innerHTML = '';

    state.filteredProjects.forEach(proj => {
      const card = createCardNode(proj);
      elements.nexusGrid.appendChild(card);
    });

    // Render LaTeX MathJax / KaTeX snippets
    renderKaTeX();
  }

  // Create Peyré Style Card Node
  function createCardNode(proj) {
    const card = document.createElement('article');
    card.className = 'card';

    const authorsStr = Array.isArray(proj.authors) ? proj.authors.join(', ') : proj.authors;
    const mediaBadgeText = proj.mediaType && proj.mediaType.startsWith('canvas') ? 'Interactive' : 'Paper / Tesis';

    card.innerHTML = `
      <div class="media">
        <span class="media-badge">${mediaBadgeText}</span>
        ${renderMediaContainer(proj)}
      </div>

      <div class="content">
        <span class="chip">${proj.category}</span>
        <h3 class="card-title">${proj.title}</h3>
        <p class="card-authors">👤 ${authorsStr} (${proj.year})</p>
        
        ${proj.mathSnippet ? `<div class="math-snippet" data-katex="${escapeHtml(proj.mathSnippet)}"></div>` : ''}

        <p class="desc">${proj.subtitle || proj.abstract}</p>

        <div class="card-actions">
          ${proj.pdfUrl ? `<a href="${proj.pdfUrl}" target="_blank" class="btn btn-sm btn-primary">📄 Tesis PDF</a>` : ''}
          ${proj.codeUrl ? `<a href="${proj.codeUrl}" target="_blank" class="btn btn-sm btn-outline">💻 Código</a>` : ''}
          <button class="btn btn-sm btn-outline open-detail-btn">👁️ Ver Nexus</button>
        </div>
      </div>
    `;

    // Event listener for opening detail modal
    card.querySelector('.open-detail-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectModal(proj);
    });

    card.querySelector('.card-title').addEventListener('click', () => openProjectModal(proj));

    // Initialize Card Canvas if needed
    const canvas = card.querySelector('canvas');
    if (canvas) {
      setTimeout(() => initCanvasAnimation(canvas, proj.mediaType), 50);
    }

    return card;
  }

  // Render Media Container Inside Cards
  function renderMediaContainer(proj) {
    if (proj.mediaType && proj.mediaType.startsWith('canvas')) {
      return `<canvas data-type="${proj.mediaType}"></canvas>`;
    }
    return `<img src="${proj.mediaImage || 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80'}" alt="${proj.title}" loading="lazy" />`;
  }

  // Canvas Interactive Simulations (Peyré Style Visual Animations)
  function initCanvasAnimation(canvas, type) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 320;
    canvas.height = canvas.parentElement.clientHeight || 200;

    let t = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      if (type === 'canvas-nn') {
        // Neural network node graph
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const layers = [3, 5, 4, 2];
        const layerX = [w * 0.15, w * 0.38, w * 0.62, w * 0.85];

        // Draw connections
        ctx.lineWidth = 1;
        for (let l = 0; l < layers.length - 1; l++) {
          const n1 = layers[l];
          const n2 = layers[l + 1];
          const x1 = layerX[l];
          const x2 = layerX[l + 1];

          for (let i = 0; i < n1; i++) {
            const y1 = (h / (n1 + 1)) * (i + 1);
            for (let j = 0; j < n2; j++) {
              const y2 = (h / (n2 + 1)) * (j + 1);
              const alpha = (Math.sin(t * 0.05 + i + j) + 1) * 0.25 + 0.1;
              ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        for (let l = 0; l < layers.length; l++) {
          const n = layers[l];
          const x = layerX[l];
          for (let i = 0; i < n; i++) {
            const y = (h / (n + 1)) * (i + 1);
            ctx.fillStyle = l === layers.length - 1 ? '#f59e0b' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === 'canvas-wave') {
        // Photovoltaic sine wave
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, w, h);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.03 + t * 0.05) * 35 + Math.cos(x * 0.01 - t * 0.02) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Secondary supercapacitor peak wave
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.cos(x * 0.05 + t * 0.08) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (type === 'canvas-quantum') {
        // Quantum Bloch sphere / orbital
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = 55;

        // Orbit ring
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating state vector
        const angle = t * 0.03;
        const vx = cx + Math.cos(angle) * r;
        const vy = cy + Math.sin(angle) * (r * 0.4);

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(vx, vy);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(vx, vy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'canvas-bacteria') {
        // Bacteria growth simulation
        ctx.fillStyle = '#061612';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#10b981';
        for (let i = 0; i < 18; i++) {
          const bx = (Math.sin(i * 9 + t * 0.02) * 0.4 + 0.5) * w;
          const by = (Math.cos(i * 7 + t * 0.03) * 0.4 + 0.5) * h;
          ctx.beginPath();
          ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      t++;
      state.animFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  // KaTeX LaTeX Math Renderer
  function renderKaTeX() {
    if (typeof katex === 'undefined') return;
    document.querySelectorAll('[data-katex]').forEach(el => {
      const tex = el.getAttribute('data-katex');
      try {
        katex.render(tex, el, { throwOnError: false });
      } catch (e) {
        el.textContent = tex;
      }
    });
  }

  // Open Project Detail Modal
  function openProjectModal(proj) {
    state.currentProject = proj;
    proj.views = (proj.views || 0) + 1;

    elements.modalChip.textContent = proj.category;
    elements.modalTitle.textContent = proj.title;
    elements.modalSubtitle.textContent = proj.subtitle || proj.abstract;
    elements.modalAuthors.textContent = Array.isArray(proj.authors) ? proj.authors.join(', ') : proj.authors;
    elements.modalUni.textContent = proj.university;
    elements.modalYear.textContent = `${proj.year} — ${proj.degree || 'Tesis de Grado'}`;
    elements.modalDoi.textContent = proj.doi || '10.5281/zenodo.8492011';
    elements.modalAbstractText.textContent = proj.abstract;

    // Render Math in Modal
    if (proj.mathSnippet && typeof katex !== 'undefined') {
      elements.modalMathBox.classList.remove('hidden');
      try {
        katex.render(proj.mathSnippet, elements.modalMathBox, { displayMode: true, throwOnError: false });
      } catch (e) {
        elements.modalMathBox.textContent = proj.mathSnippet;
      }
    } else {
      elements.modalMathBox.classList.add('hidden');
    }

    // Media Box Canvas/Image
    elements.modalMediaBox.innerHTML = '';
    if (proj.mediaType && proj.mediaType.startsWith('canvas')) {
      const canvas = document.createElement('canvas');
      elements.modalMediaBox.appendChild(canvas);
      setTimeout(() => initCanvasAnimation(canvas, proj.mediaType), 50);
    } else {
      const img = document.createElement('img');
      img.src = proj.mediaImage || 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80';
      elements.modalMediaBox.appendChild(img);
    }

    // Tags
    elements.modalTagsRow.innerHTML = (proj.tags || []).map(t => `
      <span class="chip">#${t}</span>
    `).join('');

    // Buttons
    elements.modalPdfBtn.href = proj.pdfUrl || '#';
    elements.modalCodeBtn.href = proj.codeUrl || '#';
    elements.modalCodeBtn.style.display = proj.codeUrl ? 'inline-flex' : 'none';

    openModal(elements.projectModal);
  }

  // Citation Text Formatter
  function updateCitationText() {
    if (!state.currentProject) return;
    const p = state.currentProject;
    const authorsStr = Array.isArray(p.authors) ? p.authors.join(', ') : p.authors;
    
    let cite = '';
    if (state.currentCitationStyle === 'apa') {
      cite = `${authorsStr}. (${p.year}). ${p.title} [Tesis de ${p.degree || 'Grado'}, ${p.university}]. Mathematical Nexus Collection. ${p.doi ? 'https://doi.org/' + p.doi : ''}`;
    } else if (state.currentCitationStyle === 'ieee') {
      cite = `${authorsStr}, "${p.title}," ${p.degree || 'Tesis'}, ${p.university}, ${p.year}.`;
    } else if (state.currentCitationStyle === 'bibtex') {
      const key = (p.id || 'nexus').replace(/-/g, '_');
      cite = `@phdthesis{${key},\n  author = {${authorsStr}},\n  title = {${p.title}},\n  school = {${p.university}},\n  year = {${p.year}}\n}`;
    }

    elements.citeTextarea.value = cite;
  }

  // Helpers
  function openModal(el) {
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(el) {
    el.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function showToast(msg) {
    elements.toastMsg.textContent = msg;
    elements.toastMsg.classList.remove('hidden');
    setTimeout(() => elements.toastMsg.classList.add('hidden'), 3200);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
