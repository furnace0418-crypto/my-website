(() => {
  const desktop = document.querySelector('#desktop');
  const icons = desktop.querySelector('.desktop-icons');
  const storageKey = 'retroDesktopDocumentsV1';
  let documents = [];
  try { documents = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
  if (!Array.isArray(documents)) documents = [];
  documents = documents.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.content === 'string');
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(documents)); } catch {} };
  const select = icon => icons.querySelectorAll('.desktop-icon').forEach(other => other.classList.toggle('selected', other === icon));
  const menu = document.createElement('div');
  menu.className = 'desktop-context-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  document.body.appendChild(menu);
  const hideMenu = () => { menu.hidden = true; };
  const currentDocument = win => documents.find(item => item.id === win?.dataset.desktopDocumentId);
  const updateTitle = (win, item) => {
    const title = `${item.name} - 记事本`;
    win.querySelector('h2').textContent = title;
    const task = document.querySelector(`.task-item[data-window-id="${win.id}"] .task-title`);
    if (task) task.textContent = title;
  };
  function openDocument(item) {
    openExplorerTextFile(item);
    document.querySelector('.notepad-window').dataset.desktopDocumentId = item.id;
  }
  function rename(icon) {
    hideMenu(); select(icon);
    const label = icon.querySelector('.icon-label');
    if (!label || label.isContentEditable) return;
    const previous = label.textContent;
    label.contentEditable = 'true'; label.setAttribute('role', 'textbox'); label.setAttribute('aria-label', '文件名');
    label.spellcheck = false; label.focus();
    const range = document.createRange(); range.selectNodeContents(label);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    let finished = false;
    const finish = cancel => {
      if (finished) return;
      const name = label.textContent.trim();
      const duplicate = [...icons.querySelectorAll('.icon-label')].some(other => other !== label && other.textContent.toLowerCase() === name.toLowerCase());
      if (!cancel && (!name || /[\\/:*?"<>|\x00-\x1f]/.test(name) || /[. ]$/.test(name) || duplicate)) {
        label.title = duplicate ? '已存在同名项目' : '请输入有效名称，不可包含 \\ / : * ? " < > |';
        label.textContent = previous;
        cancel = true;
      }
      finished = true; label.contentEditable = 'false'; label.removeAttribute('role'); label.removeAttribute('aria-label');
      label.textContent = cancel ? previous : name;
      label.removeEventListener('blur', onBlur); label.removeEventListener('keydown', onKey);
      if (cancel) return;
      const item = documents.find(entry => entry.id === icon.dataset.documentId);
      if (item) {
        item.name = name; icon.dataset.fileName = name; persist();
        document.querySelectorAll('.notepad-window').forEach(win => {
          if (currentDocument(win) !== item) return;
          win.querySelector('textarea').dataset.fileName = name; updateTitle(win, item);
        });
      }
    };
    const onBlur = () => finish(false);
    const onKey = event => {
      event.stopPropagation();
      if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finish(event.key === 'Escape'); icon.focus(); }
    };
    label.addEventListener('blur', onBlur); label.addEventListener('keydown', onKey);
  }
  function addIcon(item) {
    const icon = document.createElement('button'); icon.type = 'button'; icon.className = 'desktop-icon desktop-text-document';
    icon.dataset.documentId = item.id; icon.dataset.fileName = item.name;
    icon.innerHTML = '<span class="pixel-icon note-icon" aria-hidden="true"><i></i></span><span class="icon-label"></span>';
    icon.querySelector('.icon-label').textContent = item.name;
    icon.addEventListener('click', event => { event.stopPropagation(); select(icon); });
    icon.addEventListener('dblclick', event => { if (!event.target.isContentEditable) openDocument(item); });
    icons.appendChild(icon); placeDesktopIcon(icon); enableDesktopIconDrag(icon);
    return icon;
  }
  function createDocument(editName = true) {
    let name = '新建文本文档.txt', count = 2;
    const used = value => documents.some(item => item.name === value) || [...icons.querySelectorAll('.icon-label')].some(label => label.textContent === value);
    while (used(name)) name = `新建文本文档 (${count++}).txt`;
    const item = { id: crypto.randomUUID(), name, content: '', onDesktop: true };
    documents.push(item); const icon = addIcon(item); persist(); select(icon);
    if (editName) rename(icon); else openDocument(item);
  }
  function showMenu(event, icon) {
    event.preventDefault(); hideMenu(); menu.replaceChildren();
    const action = (name, handler, parent = menu) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = name; button.setAttribute('role', 'menuitem');
      button.addEventListener('click', () => { hideMenu(); handler(); }); parent.appendChild(button); return button;
    };
    if (icon) { select(icon); action('重命名(M)', () => rename(icon)); }
    else {
      const group = document.createElement('div'); group.className = 'desktop-new-group'; menu.appendChild(group);
      const trigger = document.createElement('button'); trigger.textContent = '新建(N)　▶'; trigger.setAttribute('aria-haspopup', 'menu'); group.appendChild(trigger);
      const submenu = document.createElement('div'); submenu.className = 'desktop-new-submenu'; submenu.setAttribute('role', 'menu'); group.appendChild(submenu);
      trigger.addEventListener('click', () => group.classList.toggle('open'));
      action('文本文档', () => createDocument(), submenu);
    }
    menu.hidden = false;
    menu.style.left = Math.max(0, Math.min(event.clientX, innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.max(0, Math.min(event.clientY, innerHeight - menu.offsetHeight - 8)) + 'px';
    menu.classList.toggle('submenu-left', event.clientX > innerWidth - 360);
    menu.tabIndex = -1;
    menu.focus({ preventScroll: true });
  }
  desktop.addEventListener('contextmenu', event => {
    if (event.target.closest('.retro-window,.taskbar')) return;
    showMenu(event, event.target.closest('.desktop-icon'));
  });
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('.icon-label[contenteditable="true"]')) event.stopPropagation();
    if (!menu.contains(event.target)) hideMenu();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideMenu();
    if (event.key === 'F2' && event.target.closest('.desktop-icon')) { event.preventDefault(); rename(event.target.closest('.desktop-icon')); }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-note-action]');
    if (!button) return;
    const win = button.closest('.notepad-window'), action = button.dataset.noteAction;
    if (action === 'new') {
      event.stopImmediatePropagation(); win.querySelectorAll('.notepad-menu.open').forEach(node => node.classList.remove('open'));
      createDocument(false);
    } else if (action === 'save') {
      const item = currentDocument(win), textarea = win.querySelector('textarea');
      if (!item || textarea.dataset.fileName !== item.name) return;
      event.stopImmediatePropagation(); item.content = textarea.value; persist(); textarea.dataset.savedValue = textarea.value;
      win.querySelector('.notepad-save-state').textContent = `已保存到桌面：${item.name}`; updateTitle(win, item);
      win.querySelectorAll('.notepad-menu.open').forEach(node => node.classList.remove('open'));
    } else if (action === 'open') delete win.dataset.desktopDocumentId;
  }, true);
  documents.filter(item => item.onDesktop !== false).forEach(addIcon);
  new MutationObserver(() => {
    documents.forEach(item => { item.onDesktop = [...icons.children].some(icon => icon.dataset.documentId === item.id); }); persist();
  }).observe(icons, { childList: true });
})();
