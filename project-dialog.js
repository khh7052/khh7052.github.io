const dialog = document.querySelector('.project-dialog');
const content = dialog.querySelector('.project-dialog-content');
const headingSlot = dialog.querySelector('.project-dialog-heading');
const closeButton = dialog.querySelector('button');
const cards = [...document.querySelectorAll('.project-card')];

if (typeof dialog.showModal === 'function') {
  let request;
  let activeCard;
  let closing = false;
  let pressedBackdrop = false;

  function isBackdrop(event) {
    if (event.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right
      || event.clientY < top || event.clientY >= bottom;
  }

  async function showProject(card) {
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    activeCard = card;
    dialog.classList.remove('is-closing');

    const title = document.createElement('h1');
    title.id = 'project-dialog-title';
    title.textContent = card.querySelector('strong').textContent;
    const status = document.createElement('p');
    status.role = 'status';
    status.textContent = '상세 정보를 불러오는 중입니다.';
    headingSlot.replaceChildren(title);
    content.replaceChildren(status);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;

    try {
      const response = await fetch(card.href, { signal });
      if (!response.ok) throw new Error('Project page unavailable');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (signal.aborted) return;
      const article = page.querySelector('.project-detail article');
      const projectTitle = article?.querySelector('.project-title');
      const heading = projectTitle?.querySelector('h1');
      if (!heading) throw new Error('Project detail unavailable');
      heading.id = title.id;
      headingSlot.replaceChildren(projectTitle);
      content.replaceChildren(article);
    } catch {
      if (signal.aborted) return;
      status.textContent = '상세 정보를 불러오지 못했습니다.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '다시 시도';
      retry.addEventListener('click', () => {
        closeButton.focus();
        void showProject(card);
      });
      content.append(retry);
    }
  }

  async function hideProject() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    const closingRequest = request;
    closingRequest.abort();
    dialog.classList.add('is-closing');
    await Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished));
    if (request !== closingRequest) return;
    dialog.close();
    dialog.classList.remove('is-closing');
    content.replaceChildren();
    activeCard?.focus({ preventScroll: true });
    activeCard = undefined;
    closing = false;
  }

  function syncDialog() {
    const card = cards.find((item) => item.href === history.state?.projectDetail);
    if (card) {
      closing = false;
      if (card !== activeCard || !dialog.open || dialog.classList.contains('is-closing')) void showProject(card);
      return;
    }
    closing = true;
    void hideProject();
  }

  function closeProject() {
    if (closing) return;
    closing = true;
    history.back();
  }

  for (const card of cards) {
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      history.pushState({ ...history.state, projectDetail: card.href }, '');
      event.preventDefault();
      syncDialog();
    });
  }
  closeButton.addEventListener('click', closeProject);
  dialog.addEventListener('pointerdown', (event) => {
    pressedBackdrop = event.button === 0 && isBackdrop(event);
  });
  dialog.addEventListener('click', (event) => {
    if (pressedBackdrop && isBackdrop(event)) closeProject();
    pressedBackdrop = false;
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeProject();
  });
  window.addEventListener('popstate', syncDialog);
  syncDialog();
}
