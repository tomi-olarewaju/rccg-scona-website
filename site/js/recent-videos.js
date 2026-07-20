// Fills the "Recent Services" grid with the parish's latest YouTube uploads.
//
// The grid ships with hardcoded tiles so the page is never empty (no JS, or
// the API being down, still shows recent services). When this succeeds it
// replaces them with whatever is currently on the channel.
(function () {
  var grid = document.getElementById('recent-grid');
  if (!grid || !window.fetch) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tile(v) {
    var label = esc(v.title) + (v.date ? ' &mdash; ' + esc(v.date) : '');
    return (
      '<div>' +
      '<div class="video-frame"><iframe loading="lazy" src="https://www.youtube.com/embed/' +
      encodeURIComponent(v.id) +
      '" title="' + label + '"' +
      ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"' +
      ' allowfullscreen></iframe></div>' +
      '<p class="video-note">' + label + '</p>' +
      '</div>'
    );
  }

  fetch('/.netlify/functions/recent-videos')
    .then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.videos || !data.videos.length) return; // keep fallback
      grid.innerHTML = data.videos.map(tile).join('');
    })
    .catch(function () {
      /* Leave the built-in tiles in place. */
    });
})();
