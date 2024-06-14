const {
  YEAH_IMAGE,
  NAH_IMAGE,
  YEAH_BIG,
  NAH_BIG
} = window;

let waitForPopup = false;
let waitForImage = false;
let currentImageUrl = null;

const fetchImageBlob = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.blob();
};

const setInputWithImage = async (input, url) => {
  try {
    const blob = await fetchImageBlob(url);
    const file = new File([blob], "image.jpg", {
      type: blob.type
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.dispatchEvent(new ClipboardEvent("paste", {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    }));
  } catch (error) {
    console.error("Error setting input: ", error);
  }
};

const findClosestInputElement = (el) =>
  el?.querySelector("div[data-testid^='tweetTextarea_'][contenteditable='true']") ?? findClosestInputElement(el?.parentElement);

const handleTweetInput = async (target) => {
  const input = findClosestInputElement(target.closest("[data-testid='toolBar']"));
  if (input && currentImageUrl) await setInputWithImage(input, currentImageUrl);
  waitForImage = true;
  setTimeout(() => (waitForImage = false), 2000);
};

const clickSendTweetButton = () =>
  document.querySelector("[data-testid='tweetButton'], [data-testid='tweetButtonInline']")?.click();

const createReactionButton = (small, src, alt, onClick) => {
  const btn = document.createElement("button");
  btn.className = `btn ${small ? "small" : ""}`;
  btn.innerHTML = `<img src="${src}" alt="${alt}">`;
  btn.addEventListener("click", onClick);
  return btn;
};

const addReactionButtons = (el) => {
  if (el.childElementCount <= 3) return;
  const small = el.offsetHeight <= 24;
  el.append(
    createReactionButton(small, YEAH_IMAGE, "Yeah!", () => handleClick(el, small, YEAH_BIG)),
    createReactionButton(small, NAH_IMAGE, "Nah.", () => handleClick(el, small, NAH_BIG))
  );
};

const handleClick = (el, small, url) => {
  currentImageUrl = url;
  if (small) {
    el.querySelector("button").click();
    waitForPopup = true;
    setTimeout(() => (waitForPopup = false), 2000);
  } else {
    handleTweetInput(el);
  }
};

const handleDOMMutations = (mutations) => {
  mutations.forEach(({
    type,
    addedNodes
  }) => {
    if (type !== "childList") return;

    addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      const groups = node.querySelectorAll("[role='group']:not(:has(.btn))");
      groups.forEach(addReactionButtons);

      const toolBar = node.querySelector("[data-testid='toolBar']:not(:has(.btn))");
      if (toolBar) {
        if (waitForPopup) {
          waitForPopup = false;
          handleTweetInput(toolBar);
        }
        toolBar.querySelectorAll("[role='tablist']:not(:has(.btn))").forEach(addReactionButtons);
      }

      if (waitForImage && node.tagName === "IMG" && node.src.includes("blob:")) clickSendTweetButton();
    });
  });
};

new MutationObserver(handleDOMMutations).observe(document, {
  childList: true,
  subtree: true,
  attributeOldValue: true
});
