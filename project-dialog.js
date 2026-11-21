const dialog = document.querySelector('.project-dialog');
const content = dialog.querySelector('.project-dialog-content');
const detailLink = dialog.querySelector('.project-dialog-page');
const closeButton = dialog.querySelector('button');
const cards = [...document.querySelectorAll('.project-card')];

if (typeof dialog.showModal === 'function') {
  let request;
  let activeCard;
  let closing = false;

  async function showProject(card) {
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    activeCard = card;
    detailLink.href = card.href;

    const title = document.createElement('h2');
    title.id = 'project-dialog-title';
    title.textContent = card.querySelector('strong').textContent;
    const status = document.createElement('p');
    status.role = 'status';
    status.textContent = '상세 정보를 불러오는 중입니다.';
    content.replaceChildren(title, status);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;

    try {
      const response = await fetch(card.href, { signal });
      if (!response.ok) throw new Error('Project page unavailable');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (signal.aborted) return;
      const article = page.querySelector('.project-detail article');
      const heading = article?.querySelector('h1');
      if (!heading) throw new Error('Project detail unavailable');
      heading.id = title.id;
      content.replaceChildren(article);
    } catch {
      if (!signal.aborted) status.textContent = '상세 정보를 불러오지 못했습니다. 상단 링크에서 작품 페이지를 열 수 있습니다.';
    }
  }

  function syncDialog() {
    closing = false;
    const card = cards.find((item) => item.href === history.state?.projectDetail);
    if (card) {
      if (card !== activeCard || !dialog.open) void showProject(card);
      return;
    }
    if (!dialog.open) return;
    request.abort();
    dialog.close();
    content.replaceChildren();
    activeCard?.focus({ preventScroll: true });
    activeCard = undefined;
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
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeProject();
  });
  window.addEventListener('popstate', syncDialog);
  syncDialog();
}
