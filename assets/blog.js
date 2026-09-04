(() => {
  const filters = [...document.querySelectorAll("[data-filter]")];
  const posts = [...document.querySelectorAll("[data-post]")];
  const search = document.querySelector("[data-search]");
  const count = document.querySelector("[data-result-count]");
  const empty = document.querySelector("[data-empty]");
  let activeFilter = "all";

  const updatePosts = () => {
    const query = search?.value.trim().toLowerCase() || "";
    let visible = 0;

    posts.forEach((post) => {
      const topics = (post.dataset.topic || "").split(" ");
      const matchesFilter = activeFilter === "all" || topics.includes(activeFilter);
      const matchesSearch = !query || (post.dataset.search || post.textContent).toLowerCase().includes(query);
      const show = matchesFilter && matchesSearch;
      post.classList.toggle("is-hidden", !show);
      post.setAttribute("aria-hidden", String(!show));
      if (show) visible += 1;
    });

    if (count) count.textContent = `${visible} ${visible === 1 ? "entry" : "entries"}`;
    empty?.classList.toggle("is-visible", visible === 0);
  };

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      activeFilter = filter.dataset.filter;
      filters.forEach((item) => item.setAttribute("aria-pressed", String(item === filter)));
      updatePosts();
    });
  });

  search?.addEventListener("input", updatePosts);

  const progress = document.querySelector(".reading-progress span");
  if (progress) {
    const updateProgress = () => {
      const length = document.documentElement.scrollHeight - window.innerHeight;
      const value = length > 0 ? Math.min(1, window.scrollY / length) : 0;
      progress.style.width = `${value * 100}%`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  document.querySelectorAll("pre").forEach((pre) => {
    const button = document.createElement("button");
    button.className = "copy-btn";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    pre.prepend(button);
    button.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.innerText || pre.innerText.replace(/^Copy\s*/, "");
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select code";
      }
      window.setTimeout(() => { button.textContent = "Copy"; }, 1600);
    });
  });

  document.querySelectorAll("img[data-remote-media]").forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("a");
      fallback.className = "media-fallback";
      fallback.href = image.currentSrc || image.src;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.textContent = "Media could not load here. Open the original source ↗";
      image.replaceWith(fallback);
    }, { once: true });
  });

  const reveals = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach((item) => observer.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add("is-visible"));
  }

  updatePosts();
})();
